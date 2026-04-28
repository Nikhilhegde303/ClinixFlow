import express from 'express';
import { createDemoRequest, getLeads, updateLeadStatus } from '../controllers/leadController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// --------------------------------------------------------
// PUBLIC ROUTE: For the Landing Page
// --------------------------------------------------------
router.post('/request', createDemoRequest);

// --------------------------------------------------------
// SECURE ROUTES: For Your Super Admin Dashboard
// --------------------------------------------------------
// We apply verifyToken and authorizeRoles to lock these down
router.get(
  '/', 
  verifyToken, 
  authorizeRoles('SUPER_ADMIN'), 
  getLeads
);

router.patch(
  '/:id/status', 
  verifyToken, 
  authorizeRoles('SUPER_ADMIN'), 
  updateLeadStatus
);

export default router;