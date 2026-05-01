import express from 'express';
import { getLeads, updateLeadStatus, provisionTenant, getActiveTenants } from '../controllers/superAdminController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. ALL routes in this file must pass through the JWT verifier FIRST
router.use(verifyToken);

// 2. ALL routes must belong to a SUPER_ADMIN
router.use(authorizeRoles('SUPER_ADMIN'));

// 3. The Endpoints
router.get('/leads', getLeads);
router.patch('/leads/:id/status', updateLeadStatus);
router.post('/provision-tenant', provisionTenant);

router.get('/hospitals', getActiveTenants);

export default router;