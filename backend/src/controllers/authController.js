import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db.js';

/**
 * @desc    Register a new Hospital and its primary Admin user simultaneously
 * @route   POST /api/v1/auth/register-hospital
 * @access  Public (In a real app, this might be restricted to SUPER_ADMIN)
 */
export const registerHospitalAdmin = async (req, res, next) => {
    try {
        const { hospitalName, slug, email, password } = req.body;

        // 1. Basic validation
        if (!hospitalName || !slug || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // 2. Check for existing slug or email
        const existingHospital = await prisma.hospital.findUnique({ where: { slug } });
        if (existingHospital) return res.status(400).json({ success: false, message: 'Hospital slug is already in use.' });

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email is already registered.' });

        // 3. Hash the password (Cost factor 10 is standard balance of speed/security)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. ATOMIC TRANSACTION: Create Hospital AND User together
        // If either fails, the whole operation rolls back.
        const result = await prisma.$transaction(async (tx) => {
            const hospital = await tx.hospital.create({
                data: {
                    name: hospitalName,
                    slug: slug,
                }
            });

            const adminUser = await tx.user.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    hospital_id: hospital.id,
                    is_verified: true // Admins are auto-verified upon creation
                }
            });

            return { hospital, adminUser };
        });

        // 5. Remove password from the response object for security
        const { password: _, ...userWithoutPassword } = result.adminUser;

        res.status(201).json({
            success: true,
            message: 'Hospital and Admin registered successfully.',
            data: {
                hospital: result.hospital,
                admin: userWithoutPassword
            }
        });

    } catch (error) {
        next(error); // Passes the error to our Global Error Handler in app.js
    }
};

/**
 * @desc    Login a user (Any Role) and generate JWT
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Validate inputs
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password.' });
        }

        // 2. Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 3. Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 4. Generate JWT payload
        // We include hospital_id so the frontend knows which tenant data to request
        const payload = {
            id: user.id,
            role: user.role,
            hospital_id: user.hospital_id
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });

        // 5. Respond (excluding password)
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new staff member (Doctor or Receptionist)
 * @route   POST /api/v1/auth/create-staff
 * @access  Private (ADMIN Only)
 */
export const createStaff = async (req, res, next) => {
    try {
        const { email, password, role, specialty, room_number } = req.body;
        
        // Securely extract the hospital ID from the Admin's JWT token
        const hospitalId = req.user.hospital_id;

        // 1. Validation
        if (!email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
        }

        if (!['DOCTOR', 'RECEPTIONIST'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role assignment.' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists.' });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Database Transaction (Handle conditional Doctor profile creation)
        const result = await prisma.$transaction(async (tx) => {
            // Create the base user
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role,
                    hospital_id: hospitalId,
                    is_verified: true 
                }
            });

            let doctorProfile = null;
            
            // If it's a doctor, we MUST create the associated Doctor profile
            if (role === 'DOCTOR') {
                doctorProfile = await tx.doctor.create({
                    data: {
                        user_id: newUser.id,
                        hospital_id: hospitalId,
                        specialty: specialty || 'General Physician',
                        room_number: room_number || 'TBD'
                    }
                });
            }

            return { newUser, doctorProfile };
        });

        // 4. Clean response
        const { password: _, ...userWithoutPassword } = result.newUser;

        res.status(201).json({
            success: true,
            message: `${role} account created successfully.`,
            data: {
                user: userWithoutPassword,
                profile: result.doctorProfile
            }
        });

    } catch (error) {
        next(error);
    }
};