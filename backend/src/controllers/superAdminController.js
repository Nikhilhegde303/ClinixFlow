import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const getLeads = async (req, res) => {
  try {
    // 1. Extract the status from the request query parameters
    // Example: /api/v1/superadmin/leads?status=PENDING
    const { status } = req.query;

    // 2. Build the Prisma query options dynamically
    const queryOptions = {
      orderBy: {
        created_at: 'desc' // Always show newest leads at the top of the Kanban board
      }
    };

    // If the Super Admin clicked a specific tab (e.g., 'PENDING'), apply the filter.
    // If no status is provided, it returns all leads.
    if (status) {
      queryOptions.where = { 
        status: status 
      };
    }

    // 3. Execute the Prisma query
    const leads = await prisma.hospitalLead.findMany(queryOptions);

    // 4. Send the successful response
    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });

  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch leads" 
    });
  }
};




export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Security Check: Prevent injecting random strings into your Enum
    const validStatuses = ['PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status provided." 
      });
    }

    // 2. Update the Lead
    const updatedLead = await prisma.hospitalLead.update({
      where: { id: id },
      data: { status: status }
    });

    res.status(200).json({
      success: true,
      message: `Lead status updated to ${status}`,
      data: updatedLead
    });

  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update lead status." 
    });
  }
};



// backend/src/controllers/superAdminController.js

export const provisionTenant = async (req, res) => {
  try {
    // 1. Destructure the new fields from req.body
    const { 
      hospitalName, 
      slug, 
      address,       // NEW
      contactNo,     // NEW
      adminName, 
      adminEmail, 
      adminPassword, 
      leadId 
    } = req.body;

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      
      // TASK A: Create the Hospital (Now with address and contact_no)
      const newHospital = await tx.hospital.create({
        data: {
          name: hospitalName,
          slug: slug,
          address: address,       // NEW
          contact_no: contactNo   // NEW (matches your schema column name)
        }
      });

      // TASK B: Create the User (Admin)
      const newAdmin = await tx.user.create({
        data: {
          hospital_id: newHospital.id,
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          is_verified: true 
        }
      });

      // TASK C: Update the Lead status to 'CONVERTED'
      const updatedLead = await tx.hospitalLead.update({
        where: { id: leadId },
        data: { status: 'CONVERTED' }
      });

      return { newHospital, newAdmin, updatedLead }; 
    });

    res.status(201).json({
      success: true,
      message: "Tenant successfully provisioned!",
      data: result
    });

  } catch (error) {
    console.error("Transaction failed:", error);
    res.status(500).json({ success: false, message: "Tenant provisioning failed." });
  }
};



export const getActiveTenants = async (req, res) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        // This joins the user table so we can see who the admin is!
        users: { 
          where: { role: 'ADMIN' },
          select: { name: true, email: true } 
        }
      }
    });

    res.status(200).json({
      success: true,
      data: hospitals
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ success: false, message: "Failed to fetch active tenants." });
  }
};