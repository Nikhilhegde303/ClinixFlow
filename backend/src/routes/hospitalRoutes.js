import express from 'express';
import { searchHospitals, getDoctorsByHospital, getHospitalBySlug } from '../controllers/hospitalController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/search', searchHospitals);

//fetch doctors of a hospital
router.get('/:hospitalId/doctors', verifyToken, getDoctorsByHospital);

router.get('/slug/:slug', getHospitalBySlug);

export default router;