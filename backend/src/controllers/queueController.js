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
 * @desc    Add a patient to the queue with atomic Row-Level Locking and Idempotency
 * @route   POST /api/v1/doctors/:doctorId/queue/join
 * @access  Private (RECEPTIONIST or PATIENT)
 */
export const joinQueue = async (req, res, next) => {
    try {
        const { doctorId } = req.params; 
        const { patientId, appointmentType, symptoms_raw } = req.body;
        const hospitalId = req.user.hospital_id;
        
        const idempotencyKey = req.header('Idempotency-Key');

        if (!doctorId || !patientId) {
            return res.status(400).json({ success: false, message: 'Doctor ID and Patient ID are required.' });
        }

        // --- THE IDEMPOTENCY GUARD ---
        if (idempotencyKey) {
            const existingAppointment = await prisma.appointment.findUnique({
                where: { idempotency_key: idempotencyKey }
            });

            if (existingAppointment) {
                return res.status(200).json({
                    success: true,
                    message: 'Recovered existing queue entry.',
                    data: existingAppointment
                });
            }
        }

        // --- SMART PATIENT LOOKUP / AUTO-CREATION ---
        let targetPatientId = patientId;

        // 1. Try to find the patient by MR Number
        let patientRecord = await prisma.patient.findUnique({
            where: { mr_number: patientId }
        });

        // 2. If not found by MR, check if they accidentally passed a UUID
        if (!patientRecord) {
            patientRecord = await prisma.patient.findUnique({
                where: { id: patientId }
            });
        }

        // 3. If STILL not found, auto-register a "Walk-In Guest"
        if (!patientRecord) {
            patientRecord = await prisma.patient.create({
                data: {
                    hospital_id: hospitalId,
                    mr_number: patientId, // Save whatever the receptionist typed (e.g., "MR-1001")
                    name: "Walk-In Guest",
                    phone: "Pending"
                }
            });
            console.log(`🆕 Auto-registered new Walk-In Guest: ${patientId}`);
        }

        targetPatientId = patientRecord.id;

        // --- ATOMIC TRANSACTION: The ACID Guard ---
        const result = await prisma.$transaction(async (tx) => {
            
            const lockedQueue = await tx.$queryRaw`
                SELECT * FROM "QueueState" 
                WHERE doctor_id = ${doctorId} 
                FOR UPDATE
            `;

            if (!lockedQueue || lockedQueue.length === 0) {
                throw new Error("Doctor has not initialized their queue for today.");
            }

            // 2. THE DUPLICATE GUARD 
            // Check if this patient is already waiting or in consultation with this doctor
            const activeAppointment = await tx.appointment.findFirst({
                where: {
                    doctor_id: doctorId,
                    patient_id: targetPatientId,
                    status: {
                        in: ['WAITING', 'IN_CONSULTATION']
                    }
                }
            });

            if (activeAppointment) {
                throw new Error(`Patient is already in the queue (Token #${activeAppointment.token_number}).`);
            }



            const currentLastToken = lockedQueue[0].last_token_issued;
            const newTokenNumber = currentLastToken + 1;

            // Create the Appointment
            const appointment = await tx.appointment.create({
                data: {
                    hospital_id: hospitalId,
                    doctor_id: doctorId,
                    patient_id: targetPatientId,
                    token_number: newTokenNumber,
                    type: appointmentType || 'WALK_IN',
                    status: 'WAITING',
                    priority_level: 0,
                    symptoms_raw: symptoms_raw || null,
                    ai_processing_status: symptoms_raw ? 'PENDING' : null,
                    idempotency_key: idempotencyKey || null 
                }
            });

            // Update the Queue State
            await tx.queueState.update({
                where: { doctor_id: doctorId },
                data: { last_token_issued: newTokenNumber }
            });

            return appointment;
        });

        // --- BACKGROUND AI PROCESSING ---
        if (symptoms_raw) {
            // (Assuming your summarizeSymptoms logic is imported and working)
            // ... keep your existing AI logic here ...
        }

        // --- NEW: WEBSOCKET BROADCAST (The Dual-Room Fix) ---
        // 1. Look up the doctor profile to get the user_id
        const docProfile = await prisma.doctor.findUnique({
            where: { id: doctorId }
        });
        
        const doctorUserId = docProfile ? docProfile.user_id : doctorId;

        // 2. Broadcast to BOTH possible room names to ensure the React frontend hears it
        const io = req.app.get('io');
        if (io) {
            io.to(`room_dr_${doctorId}`).to(`room_dr_${doctorUserId}`).emit('queue_update', {
                message: "New patient joined the queue",
                token: result.token_number
            });
        }

        res.status(201).json({
            success: true,
            message: 'Successfully joined the queue.',
            data: result
        });

    } catch (error) {
        if (error.message.includes("initialized") || error.message.includes("already in the queue")) {
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
 * @route   POST /api/v1/doctors/:doctorId/queue/emergency
 * @access  Private (RECEPTIONIST or DOCTOR)
 */
export const insertEmergency = async (req, res, next) => {
    try {
        const { doctorId } = req.params; 
        const { patientId } = req.body;  
        const hospitalId = req.user.hospital_id;

        if (!doctorId || !patientId) {
            return res.status(400).json({ success: false, message: 'Doctor and Patient IDs required.' });
        }

        // --- NEW: SMART PATIENT LOOKUP / AUTO-CREATION ---
        let targetPatientId = patientId;

        // 1. Try to find the patient by MR Number
        let patientRecord = await prisma.patient.findUnique({
            where: { mr_number: patientId }
        });

        // 2. If not found by MR, check if they accidentally passed a UUID
        if (!patientRecord) {
            patientRecord = await prisma.patient.findUnique({
                where: { id: patientId }
            });
        }

        // 3. If STILL not found, auto-register an "Emergency Walk-In"
        if (!patientRecord) {
            patientRecord = await prisma.patient.create({
                data: {
                    hospital_id: hospitalId,
                    mr_number: patientId, // Save whatever the receptionist typed (e.g., "MR-911")
                    name: "Emergency Walk-In",
                    phone: "Pending"
                }
            });
            console.log(`🚨 Auto-registered new Emergency Patient: ${patientId}`);
        }

        // Extract the true UUID required by PostgreSQL
        targetPatientId = patientRecord.id;


        // ATOMIC TRANSACTION: Insert or Update patient and apply global penalty
        const result = await prisma.$transaction(async (tx) => {
            // 1. Lock Queue State
            const lockedQueue = await tx.$queryRaw`
                SELECT * FROM "QueueState" WHERE doctor_id = ${doctorId} FOR UPDATE
            `;

            if (!lockedQueue || lockedQueue.length === 0) {
                throw new Error("Queue not initialized.");
            }

            // 2. SMART TRIAGE: Look for an existing waiting appointment
            let emergencyAppt = await tx.appointment.findFirst({
                where: {
                    doctor_id: doctorId,
                    patient_id: targetPatientId,
                    status: 'WAITING'
                }
            });

            if (emergencyAppt) {
                // PATH A: Patient is already waiting. Elevate them!
                emergencyAppt = await tx.appointment.update({
                    where: { id: emergencyAppt.id },
                    data: { priority_level: 1 }
                });
                console.log(`⬆️ Elevated Token #${emergencyAppt.token_number} to Emergency Priority.`);
            } else {
                // PATH B: Brand new emergency arrival. Issue new token!
                const currentLastToken = lockedQueue[0].last_token_issued;
                const newTokenNumber = currentLastToken + 1;

                emergencyAppt = await tx.appointment.create({
                    data: {
                        hospital_id: hospitalId,
                        doctor_id: doctorId,
                        patient_id: targetPatientId,
                        token_number: newTokenNumber,
                        type: 'WALK_IN',
                        status: 'WAITING',
                        priority_level: 1
                    }
                });
            }

            // 3. Apply the Triage Penalty to the Queue State (e.g., 20 minutes)
            // This instantly offsets the mathematical ETA for everyone else in the waiting room
            const updatedQueue = await tx.queueState.update({
                where: { doctor_id: doctorId },
                data: { 
                    last_token_issued: emergencyAppt.token_number > lockedQueue[0].last_token_issued 
                        ? emergencyAppt.token_number 
                        : lockedQueue[0].last_token_issued,
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



/**
 * @desc    Get the live queue for a specific doctor
 * @route   GET /api/v1/doctors/:doctorId/queue
 * @access  Private (DOCTOR or RECEPTIONIST)
 */
export const getDoctorQueue = async (req, res, next) => {
    try {
        const { doctorId } = req.params;

        // THE FIX: The ID Resolver
        // If a Receptionist calls this, 'doctorId' is the Doctor Profile ID.
        // If the Doctor calls this from their dashboard, 'doctorId' is their User ID.
        const doctorProfile = await prisma.doctor.findFirst({
            where: {
                OR: [
                    { id: doctorId },       // Matches Receptionist request
                    { user_id: doctorId }   // Matches Doctor request
                ]
            }
        });

        if (!doctorProfile) {
            return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
        }

        const targetDoctorId = doctorProfile.id;

        // Fetch all patients currently waiting or in consultation, ordered by priority
        const activeQueue = await prisma.appointment.findMany({
            where: {
                doctor_id: targetDoctorId,
                status: {
                    in: ['WAITING', 'IN_CONSULTATION']
                }
            },
            orderBy: [
                { priority_level: 'desc' }, // Emergencies at the top
                { joined_at: 'asc' }        // Then by wait time
            ]
        });

        // Also fetch the current Queue State (EMA, calling token, etc.)
        const queueState = await prisma.queueState.findUnique({
            where: { doctor_id: targetDoctorId }
        });

        res.status(200).json({
            success: true,
            data: {
                appointments: activeQueue,
                state: queueState
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get specific appointment details AND current queue state for the Live Ticket view
 * @route   GET /api/v1/appointments/:appointmentId
 * @access  Public (Used by frictionless walk-in patients)
 */
export const getAppointmentDetails = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { id: true, token_number: true, status: true, doctor_id: true, hospital_id: true }
        });

        if (!appointment) return res.status(404).json({ success: false, message: 'Ticket not found.' });

        // FETCH THE QUEUE STATE FOR THE MATH
        const queueState = await prisma.queueState.findUnique({
            where: { doctor_id: appointment.doctor_id }
        });

        // SEND BOTH BACK TO REACT
        res.status(200).json({
            success: true,
            data: { ticket: appointment, state: queueState }
        });

    } catch (error) {
        next(error);
    }
};