import express from 'express';
import { registerHospitalAdmin, login, createStaff } from '../controllers/authController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { patientLogin, patientRegister } from '../controllers/patientAuthController.js';

const router = express.Router();

// Public Routes
router.post('/register-hospital', registerHospitalAdmin);
router.post('/login', login);

// Protected Routes
// Notice how clean this is: Verify the token FIRST, then check if they are an ADMIN
router.post(
    '/create-staff', 
    verifyToken, 
    authorizeRoles('ADMIN'), 
    createStaff
);

router.post('/patient/login', patientLogin);

router.post('/patient/register', patientRegister);

export default router;