import prisma from '../utils/db.js';
import bcrypt from 'bcrypt';

/**
 * @desc    Register a new staff member (Doctor or Receptionist)
 * @route   POST /api/v1/admin/staff
 * @access  Private (ADMIN)
 */
export const registerStaff = async (req, res, next) => {
    try {
        const { name, email, password, role, specialization } = req.body;
        const hospitalId = req.user.hospital_id; // Admin can only add to their own hospital

        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All basic fields are required.' });
        }

        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already in use.' });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. ACID Transaction: Create User AND their Role Profile
        const newStaff = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    hospital_id: hospitalId,
                    name,
                    email,
                    password: hashedPassword,
                    role
                }
            });

            if (role === 'DOCTOR') {
                // 1. Save the new doctor to a variable so we can grab its ID
                const newDoctor = await tx.doctor.create({
                    data: {
                        user_id: user.id,
                        hospital_id: hospitalId,
                        specialty: specialization || 'General Practice',
                    }
                });
                
                // 2. Initialize the Queue State using the actual DOCTOR ID
                await tx.queueState.create({
                    data: { doctor_id: newDoctor.id } 
                });
            } 
            
            // else if (role === 'RECEPTIONIST') {
            //     await tx.receptionist.create({
            //         data: { user_id: user.id }
            //     });
            // }

            return { id: user.id, name: user.name, email: user.email, role: user.role };
        });

        res.status(201).json({ success: true, message: `${role} registered successfully.`, data: newStaff });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all staff members for this hospital
 * @route   GET /api/v1/admin/staff
 * @access  Private (ADMIN)
 */
export const getHospitalStaff = async (req, res, next) => {
    try {
        const hospitalId = req.user.hospital_id;

        const staff = await prisma.user.findMany({
            where: { 
                hospital_id: hospitalId,
                role: { in: ['DOCTOR', 'RECEPTIONIST'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true,
                doctor: { select: { specialty: true } } 
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ success: true, data: staff });
    } catch (error) {
        next(error);
    }
};