import express from 'express';
import { getPatientByMR, saveMedicalRecord } from '../controllers/clinicalController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Both routes strictly require DOCTOR level access
router.get(
    '/patient/:mrNumber',
    verifyToken,
    authorizeRoles('DOCTOR'),
    getPatientByMR
);

router.post(
    '/record',
    verifyToken,
    authorizeRoles('DOCTOR'),
    saveMedicalRecord
);

export default router;