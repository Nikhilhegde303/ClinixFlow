import express from 'express';
import { searchHospitals } from '../controllers/hospitalController.js';

const router = express.Router();

router.get('/search', searchHospitals);

export default router;