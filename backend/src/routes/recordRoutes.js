import express from 'express';
import { getPatientHistory, saveMedicalRecord } from '../controllers/recordController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js'; // Adjust path if needed

const router = express.Router();

// Secure these routes so only logged-in hospital staff can access them
router.use(verifyToken);
// Change it to this:
router.get('/patients/:patientId/records', authorizeRoles('DOCTOR', 'PATIENT', 'RECEPTIONIST', 'ADMIN'), getPatientHistory);


// 1. Route to fetch history (Fires on page load)
//router.get('/patients/:patientId/records', getPatientHistory);

// 2. Route to save a new record (Fires when clicking Save & Checkout)
router.post('/appointments/:appointmentId/record', authorizeRoles('DOCTOR', 'RECEPTIONIST', 'ADMIN'), saveMedicalRecord);

export default router;