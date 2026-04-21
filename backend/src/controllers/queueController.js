import prisma from '../utils/db.js';
import { calculateNewEMA } from '../services/emaService.js';
import { summarizeSymptoms } from '../services/aiService.js';

/**
 * @desc    Initialize/Reset the Queue State for a Doctor's shift (The Cold Start)
 * @route   POST /api/v1/queue/start
 * @access  Private (DOCTOR Only)
 */
export const startQueue = async (req, res, next) => {
    try {
        const doctorId = req.user.id; // From JWT

        // We need to find the specific doctor profile associated with this user ID
        const doctorProfile = await prisma.doctor.findUnique({
            where: { user_id: doctorId }
        });

        if (!doctorProfile) {
            return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
        }

        // Upsert ensures we create it if it doesn't exist, or reset it if it does
        const queueState = await prisma.queueState.upsert({
            where: { doctor_id: doctorProfile.id },
            update: {
                current_token_calling: 0,
                last_token_issued: 0,
                is_emergency_active: false,
                triage_penalty: 0,
                active_ema_time: doctorProfile.global_avg_consultation_time // Reset to baseline
            },
            create: {
                doctor_id: doctorProfile.id,
                active_ema_time: doctorProfile.global_avg_consultation_time
            }
        });

        res.status(200).json({
            success: true,
            message: 'Queue initialized and ready for patients.',
            data: queueState
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add a patient to the queue with atomic Row-Level Locking and AI Summarization
 * @route   POST /api/v1/queue/join
 * @access  Private (RECEPTIONIST or PATIENT)
 */
export const joinQueue = async (req, res, next) => {
    try {
        const { doctorId, patientId, appointmentType, symptoms_raw } = req.body;
        const hospitalId = req.user.hospital_id;

        if (!doctorId || !patientId) {
            return res.status(400).json({ success: false, message: 'Doctor ID and Patient ID are required.' });
        }

        // 1. ATOMIC TRANSACTION: The ACID Guard [cite: 210]
        const result = await prisma.$transaction(async (tx) => {
            
            // Row-Level Lock: 'SELECT ... FOR UPDATE' to prevent race conditions [cite: 301, 302]
            const lockedQueue = await tx.$queryRaw`
                SELECT * FROM "QueueState" 
                WHERE doctor_id = ${doctorId} 
                FOR UPDATE
            `;

            if (!lockedQueue || lockedQueue.length === 0) {
                throw new Error("Doctor has not initialized their queue for today.");
            }

            const currentLastToken = lockedQueue[0].last_token_issued;
            const newTokenNumber = currentLastToken + 1;

            // 2. Create the Appointment with initial AI status as 'PENDING' [cite: 401]
            const appointment = await tx.appointment.create({
                data: {
                    hospital_id: hospitalId,
                    doctor_id: doctorId,
                    patient_id: patientId,
                    token_number: newTokenNumber,
                    type: appointmentType || 'WALK_IN',
                    status: 'WAITING',
                    priority_level: 0,
                    symptoms_raw: symptoms_raw || null, // Store original patient input 
                    ai_processing_status: symptoms_raw ? 'PENDING' : null 
                }
            });

            // 3. Update the Queue State O(1) [cite: 318]
            await tx.queueState.update({
                where: { doctor_id: doctorId },
                data: { last_token_issued: newTokenNumber }
            });

            return appointment;
        });

        // 4. BACKGROUND AI PROCESSING (Non-blocking) [cite: 191]
        // We trigger this outside the transaction so we don't hold the DB lock 
        // while waiting for the Groq API.
// Remove the [cite: 401] tag. It should look like this:
if (symptoms_raw) {
    summarizeSymptoms(symptoms_raw)
        .then(async (aiResult) => {
            await prisma.appointment.update({
                where: { id: result.id },
                data: {
                    symptoms_summary: aiResult.summary,
                    ai_risk_flag: aiResult.ai_risk_flag,
                    ai_processing_status: 'COMPLETED' 
                }
            });
            console.log(`✅ [AI] Symptoms processed for Token #${result.token_number}`);
        })
        .catch(async (err) => {
            console.error(`❌ [AI] Processing failed: ${err.message}`);
            await prisma.appointment.update({
                where: { id: result.id },
                data: { ai_processing_status: 'FAILED' }
            });
        });
}

        // Return the ticket to the user immediately
        res.status(201).json({
            success: true,
            message: 'Successfully joined the queue.',
            data: result
        });

    } catch (error) {
        if (error.message.includes("initialized")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

/**
 * @desc    Doctor calls the next patient (moves from WAITING to IN_CONSULTATION)
 * @route   PATCH /api/v1/queue/call-next
 * @access  Private (DOCTOR)
 */
export const callNextPatient = async (req, res, next) => {
    try {
        const doctorId = req.user.id; // From JWT

        const doctor = await prisma.doctor.findUnique({ where: { user_id: doctorId } });
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

        // 1. Find the next patient in line (Ordered by Priority first, then Time joined)
        const nextAppointment = await prisma.appointment.findFirst({
            where: { doctor_id: doctor.id, status: 'WAITING' },
            orderBy: [
                { priority_level: 'desc' }, // Emergencies go first
                { joined_at: 'asc' }        // Then standard FIFO
            ]
        });

        if (!nextAppointment) {
            return res.status(404).json({ success: false, message: 'No patients in queue.' });
        }

        // 2. Atomic Transaction: Update Appointment and QueueState
        const result = await prisma.$transaction(async (tx) => {
            const updatedAppt = await tx.appointment.update({
                where: { id: nextAppointment.id },
                data: { 
                    status: 'IN_CONSULTATION',
                    check_in_time: new Date() // Mark the exact start time
                }
            });

            const updatedQueue = await tx.queueState.update({
                where: { doctor_id: doctor.id },
                data: { current_token_calling: updatedAppt.token_number }
            });

            return { updatedAppt, updatedQueue };
        });

        // 3. WebSockets Broadcast: Tell the Waiting Room who was just called!
        const io = req.app.get('io');
        io.to(`room_dr_${doctor.id}`).emit('queue_update', {
            currentTicket: result.updatedQueue.current_token_calling,
            activeEMA: result.updatedQueue.active_ema_time,
            triagePenalty: result.updatedQueue.triage_penalty
        });

        res.status(200).json({ success: true, data: result.updatedAppt });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Doctor finishes consultation. Triggers EMA Math & Broadcast.
 * @route   PATCH /api/v1/queue/checkout/:appointmentId
 * @access  Private (DOCTOR)
 */
export const checkoutPatient = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const doctorId = req.user.id;

        const doctor = await prisma.doctor.findUnique({ where: { user_id: doctorId } });

        // 1. Verify the appointment exists and is currently in consultation
        const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
        
        if (!appointment || appointment.status !== 'IN_CONSULTATION') {
            return res.status(400).json({ success: false, message: 'Invalid appointment state for checkout.' });
        }

        // 2. The Time Calculation
        const checkOutTime = new Date();
        const checkInTime = new Date(appointment.check_in_time);
        
        // Calculate duration in minutes (Math.max ensures we don't get 0 or negative mins)
        const durationMs = checkOutTime - checkInTime;
        const durationMins = Math.max(1, Math.round(durationMs / 60000));

        // 3. The Database Transaction (Update EMA and State)
        const result = await prisma.$transaction(async (tx) => {
            // Get current Queue State to read the old EMA
            const queueState = await tx.queueState.findUnique({ where: { doctor_id: doctor.id } });

            // Apply the formula
            const newEMA = calculateNewEMA(durationMins, queueState.active_ema_time);

            // Update Appointment
            const completedAppt = await tx.appointment.update({
                where: { id: appointmentId },
                data: {
                    status: 'COMPLETED',
                    check_out_time: checkOutTime,
                    session_duration: durationMins
                }
            });

            // Update the single O(1) Queue row
            const updatedQueue = await tx.queueState.update({
                where: { doctor_id: doctor.id },
                data: { active_ema_time: newEMA }
            });

            return { completedAppt, updatedQueue };
        });

        // 4. WebSockets Broadcast: Update the wait times for everyone else!
        const io = req.app.get('io');
        io.to(`room_dr_${doctor.id}`).emit('queue_update', {
            currentTicket: result.updatedQueue.current_token_calling,
            activeEMA: result.updatedQueue.active_ema_time,
            triagePenalty: result.updatedQueue.triage_penalty
        });

        res.status(200).json({ success: true, message: 'Checkout complete. Queue updated.', data: result });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Insert an Emergency patient at the front of the queue and apply Triage Penalty
 * @route   POST /api/v1/queue/emergency
 * @access  Private (RECEPTIONIST or DOCTOR)
 */
export const insertEmergency = async (req, res, next) => {
    try {
        const { doctorId, patientId } = req.body;
        const hospitalId = req.user.hospital_id;

        if (!doctorId || !patientId) {
            return res.status(400).json({ success: false, message: 'Doctor and Patient IDs required.' });
        }

        // ATOMIC TRANSACTION: Insert patient and apply global penalty
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current Queue State (Need to lock it to prevent race conditions during the emergency)
            const lockedQueue = await tx.$queryRaw`
                SELECT * FROM "QueueState" WHERE doctor_id = ${doctorId} FOR UPDATE
            `;

            if (!lockedQueue || lockedQueue.length === 0) {
                throw new Error("Queue not initialized.");
            }

            const currentLastToken = lockedQueue[0].last_token_issued;
            const newTokenNumber = currentLastToken + 1;

            // 2. Create the Appointment with priority_level = 1
            // Our callNextPatient query already orders by priority_level DESC, 
            // so this automatically puts them next in line!
            const emergencyAppt = await tx.appointment.create({
                data: {
                    hospital_id: hospitalId,
                    doctor_id: doctorId,
                    patient_id: patientId,
                    token_number: newTokenNumber,
                    type: 'WALK_IN',
                    status: 'WAITING',
                    priority_level: 1 // <--- THE PREEMPTION FLAG
                }
            });

            // 3. Apply the Triage Penalty to the Queue State (e.g., 20 minutes)
            // This instantly offsets the mathematical ETA for everyone else in the waiting room
            const updatedQueue = await tx.queueState.update({
                where: { doctor_id: doctorId },
                data: { 
                    last_token_issued: newTokenNumber,
                    is_emergency_active: true,
                    triage_penalty: 20 
                }
            });

            return { emergencyAppt, updatedQueue };
        });

        // 4. WebSockets Broadcast: The Transparency Alert
        // This pushes a dedicated notification to the React frontend
        const io = req.app.get('io');
        io.to(`room_dr_${doctorId}`).emit('emergency_alert', { 
            penalty: 20, 
            reason: "An urgent triage case has arrived. Expect a ~20 min delay. Thank you for your patience." 
        });

        // We also emit a standard queue update so the math adjusts
        io.to(`room_dr_${doctorId}`).emit('queue_update', {
            currentTicket: result.updatedQueue.current_token_calling,
            activeEMA: result.updatedQueue.active_ema_time,
            triagePenalty: result.updatedQueue.triage_penalty
        });

        res.status(201).json({
            success: true,
            message: 'Emergency priority applied. Waiting room notified.',
            data: result.emergencyAppt
        });

    } catch (error) {
        if (error.message === "Queue not initialized.") {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};