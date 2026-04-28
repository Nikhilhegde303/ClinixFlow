import express from 'express';
import { searchPatient, registerPatient } from '../controllers/patientController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js'; 
import { getActiveTicket } from '../controllers/patientAuthController.js';

const router = express.Router();

// Apply authentication to all patient routes
router.use(verifyToken); // this line verifies the token for all routes in this file (all roles)

router.get('/me/active-ticket', verifyToken, authorizeRoles('PATIENT'), getActiveTicket); // this is the patient route (in patient's dashboard while fetching patient's history). I is placed above the staff restriction line wrote below. So that the staff restriction check doesn't apply on this route.

// router.use(authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN')); //this is the staff only restriction. this will e applied to all the routes present below,

// router.get('/search', searchPatient);
// router.post('/', registerPatient);


// better option is to authorize the roles inside the router functions itseld (get,post etc) , global "router.use(authorizeRoles)" might cause problem later so(if i again forgot that and add the patient routes below that line)

// Attached the staff restrictions directly to these endpoints, NOT globally
router.get('/search', authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'), searchPatient);
router.post('/', authorizeRoles('RECEPTIONIST', 'DOCTOR', 'ADMIN'), registerPatient);

export default router;