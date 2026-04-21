import prisma from '../utils/db.js';

/**
 * @desc    Fetch patient details and full medical history via MR Number
 * @route   GET /api/v1/clinical/patient/:mrNumber
 * @access  Private (DOCTOR)
 */
export const getPatientByMR = async (req, res, next) => {
    try {
        const { mrNumber } = req.params;
        const hospitalId = req.user.hospital_id; // Extracted from DOCTOR's JWT

        // 1. Find patient AND enforce Tenant Isolation (must belong to the same hospital)
        const patient = await prisma.patient.findFirst({
            where: { 
                mr_number: mrNumber,
                hospital_id: hospitalId 
            },
            include: {
                // Fetch their entire medical history, ordered most recent first
                medical_records: {
                    orderBy: { created_at: 'desc' },
                    include: {
                        doctor: {
                            include: { user: { select: { email: true } } }
                        }
                    }
                }
            }
        });

        if (!patient) {
            return res.status(404).json({ 
                success: false, 
                message: 'Patient not found or does not belong to this facility.' 
            });
        }

        res.status(200).json({
            success: true,
            data: patient
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Save the outcome of a consultation (Diagnosis & Prescription)
 * @route   POST /api/v1/clinical/record
 * @access  Private (DOCTOR)
 */
export const saveMedicalRecord = async (req, res, next) => {
    try {
        const { patientId, appointmentId, diagnosis, prescription, notes } = req.body;
        const userId = req.user.id;

        // 1. Get the actual Doctor profile ID
        const doctor = await prisma.doctor.findUnique({ where: { user_id: userId } });
        if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile required.' });

        // 2. Validate the appointment exists and belongs to this doctor/patient
        const appointment = await prisma.appointment.findFirst({
            where: { 
                id: appointmentId,
                doctor_id: doctor.id,
                patient_id: patientId
            }
        });

        if (!appointment) {
            return res.status(400).json({ success: false, message: 'Invalid appointment reference.' });
        }

        // 3. Create the Medical Record
        // Notice we store prescription as a JSONB object, which is highly flexible
        const record = await prisma.medicalRecord.create({
            data: {
                patient_id: patientId,
                doctor_id: doctor.id,
                appointment_id: appointmentId,
                diagnosis,
                prescription, // e.g., [{ name: "Paracetamol", dosage: "500mg", duration: "5 days" }]
                notes
            }
        });

        res.status(201).json({
            success: true,
            message: 'Medical record saved successfully.',
            data: record
        });

    } catch (error) {
        // Prevent duplicate records for the same appointment due to the @unique constraint
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'A record already exists for this appointment.' });
        }
        next(error);
    }
};