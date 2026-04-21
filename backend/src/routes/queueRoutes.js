import express from 'express';
import { startQueue, joinQueue, callNextPatient, checkoutPatient, insertEmergency } from '../controllers/queueController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only the Doctor can initialize/reset their own queue
router.post(
    '/start',
    verifyToken,
    authorizeRoles('DOCTOR'),
    startQueue
);

// Receptionists can manually add patients, or Patients can join digitally
router.post(
    '/join',
    verifyToken,
    authorizeRoles('RECEPTIONIST', 'PATIENT'),
    joinQueue
);

router.patch(
    '/call-next',
    verifyToken,
    authorizeRoles('DOCTOR'),
    callNextPatient
);

router.patch(
    '/checkout/:appointmentId',
    verifyToken,
    authorizeRoles('DOCTOR'),
    checkoutPatient
);

router.post(
    '/emergency',
    verifyToken,
    authorizeRoles('RECEPTIONIST', 'DOCTOR'),
    insertEmergency
);

export default router;