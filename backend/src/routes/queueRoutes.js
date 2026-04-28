import express from 'express';
import { 
    startQueue, 
    joinQueue, 
    callNextPatient, 
    checkoutPatient, 
    insertEmergency,
    getDoctorQueue
} from '../controllers/queueController.js';

import { getAppointmentDetails } from '../controllers/queueController.js';

import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { queueJoinLimiter } from '../middleware/rateLimiter.js'; // Imported rate limiter

const router = express.Router();

// PUBLIC ROUTE: No auth middleware here!
router.get('/appointments/:appointmentId', getAppointmentDetails);

/**
 * @route   POST /api/v1/doctors/:doctorId/queue/start
 * @desc    Initialize/reset the queue for the day
 */
router.post(
    '/doctors/:doctorId/queue/start',
    verifyToken,
    authorizeRoles('DOCTOR'),
    startQueue
);

/**
 * @route   POST /api/v1/doctors/:doctorId/queue/join
 * @desc    Patient or Receptionist adds a patient to the queue
 * @security Rate-limited to prevent bot spam or double-clicking
 */
router.post(
    '/doctors/:doctorId/queue/join',
    verifyToken,
    authorizeRoles('RECEPTIONIST', 'PATIENT'),
    queueJoinLimiter, // The defense layer is applied here
    joinQueue
);

/**
 * @route   PATCH /api/v1/doctors/:doctorId/queue/call-next
 * @desc    Doctor triggers the next patient in line
 */
router.patch(
    '/doctors/:doctorId/queue/call-next',
    verifyToken,
    authorizeRoles('DOCTOR'),
    callNextPatient
);

/**
 * @route   PATCH /api/v1/appointments/:appointmentId/checkout
 * @desc    Completes the session and triggers the EMA math broadcast
 * @note    REST best practice: This acts on a specific 'appointment' resource
 */
router.patch(
    '/appointments/:appointmentId/checkout',
    verifyToken,
    authorizeRoles('DOCTOR'),
    checkoutPatient
);

/**
 * @route   POST /api/v1/doctors/:doctorId/queue/emergency
 * @desc    Preemption logic for Triage insertions
 */
router.post(
    '/doctors/:doctorId/queue/emergency',
    verifyToken,
    authorizeRoles('RECEPTIONIST', 'DOCTOR'),
    insertEmergency
);


/**
 * @route   GET /api/v1/doctors/:doctorId/queue
 * @desc    Fetch the active waiting room
 */
router.get(
    '/doctors/:doctorId/queue',
    verifyToken,
    authorizeRoles('DOCTOR', 'RECEPTIONIST', 'PATIENT'), 
    getDoctorQueue
);


export default router;