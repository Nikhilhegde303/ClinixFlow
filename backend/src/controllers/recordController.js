import prisma from '../utils/db.js';

/**
 * @desc    Get all past medical records for a specific patient
 * @route   GET /api/v1/patients/:patientId/records
 */
export const getPatientHistory = async (req, res, next) => {
    try {
        const { patientId } = req.params;

        // --- NEW SECURITY CHECK ---
        // If the user is a PATIENT, ensure they are only requesting their own data
        if (req.user.role === 'PATIENT' && req.user.id !== patientId) {
            return res.status(403).json({ success: false, message: 'You can only view your own medical records.' });  // --> this is added because of the change i made in the "authorizeRoles" inside rote file there by enabling PATIENT role to access these patient history. But the problem faced is, some attacker (try to log in as another patient and then by guessing the MR number of another patient to fetch their details --> data privacy).
        }

        const history = await prisma.medicalRecord.findMany({
            where: { patient_id: patientId },
            include: { doctor: true }, // To show which doctor they saw
            orderBy: { created_at: 'desc' } // Newest first
        });

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Save a clinical consultation record
 * @route   POST /api/v1/appointments/:appointmentId/record
 */
export const saveMedicalRecord = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { diagnosis, notes, prescription } = req.body;
        const doctorId = req.user.id; // Assuming auth middleware provides this

        // 1. Find the appointment to get the patient ID
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId }
        });

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        // 2. Create the Medical Record (Prescription is automatically stored as JSONB)
        const record = await prisma.medicalRecord.create({
            data: {
                patient_id: appointment.patient_id,
                doctor_id: appointment.doctor_id,
                appointment_id: appointment.id,
                diagnosis,
                notes,
                prescription 
            }
        });

        res.status(201).json({ success: true, message: "Record saved successfully", data: record });
    } catch (error) {
        next(error);
    }
};