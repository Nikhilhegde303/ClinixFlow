import prisma from '../utils/db.js';

/**
 * @desc    Submit a new demo request from the Landing Page
 * @route   POST /api/v1/leads/request
 * @access  Public
 */
export const createDemoRequest = async (req, res, next) => {
  try {
    const { clinic_name, contact_person, phone_number } = req.body;

    // Basic Validation
    if (!clinic_name || !contact_person || !phone_number) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Create the lead
    const newLead = await prisma.hospitalLead.create({
      data: {
        clinic_name,
        contact_person,
        phone_number,
        // status defaults to 'PENDING' automatically via Prisma
      }
    });

    res.status(201).json({
      success: true,
      message: 'Demo request submitted successfully. Our team will contact you soon.',
      data: newLead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch all leads for the Super Admin dashboard
 * @route   GET /api/v1/leads
 * @access  Private (SUPER_ADMIN)
 */
export const getLeads = async (req, res, next) => {
  try {
    // Fetch leads, ordered by newest first
    const leads = await prisma.hospitalLead.findMany({
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update the status of a lead (e.g., PENDING -> CONTACTED)
 * @route   PATCH /api/v1/leads/:id/status
 * @access  Private (SUPER_ADMIN)
 */
export const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate Enum
    const validStatuses = ['PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid lead status.' });
    }

    const updatedLead = await prisma.hospitalLead.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({
      success: true,
      message: `Lead status updated to ${status}.`,
      data: updatedLead
    });
  } catch (error) {
    // Handle case where ID doesn't exist
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }
    next(error);
  }
};