import express from 'express';
import { registerStaff, getHospitalStaff } from '../controllers/adminController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles('ADMIN')); // Strictly Admin only

router.post('/staff', registerStaff);
router.get('/staff', getHospitalStaff);

export default router;