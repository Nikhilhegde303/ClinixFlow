import jwt from 'jsonwebtoken';
import prisma from '../utils/db.js';

/**
 * @desc    Login for Patients using Phone and MR Number
 * @route   POST /api/v1/auth/patient/login
 * @access  Public
 */
export const patientLogin = async (req, res, next) => {
    try {
        const { phone, mr_number } = req.body;

        if (!phone || !mr_number) {
            return res.status(400).json({ success: false, message: 'Phone number and MR Number are required.' });
        }

        // 1. Find the patient. Because MR Number is globally unique, we can find them instantly.
        const patient = await prisma.patient.findUnique({
            where: { mr_number: mr_number }
        });

        // 2. Security Check: Does the patient exist, and does the phone match?
        if (!patient || patient.phone !== phone) {
            return res.status(401).json({ success: false, message: 'Invalid Phone Number or MR Number.' });
        }

        // 3. Issue the JWT. We inject 'PATIENT' role so your React ProtectedRoutes work flawlessly.
        const payload = {
            id: patient.id,
            role: 'PATIENT',
            hospital_id: patient.hospital_id,
            name: patient.name,
            mr_number: patient.mr_number
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1d' // Patients only need short-lived tokens
        });

        res.status(200).json({
            success: true,
            token,
            data: patient
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    The "Walk-In Sync" Interceptor: Checks if patient has an active queue ticket
 * @route   GET /api/v1/patients/me/active-ticket
 * @access  Private (PATIENT only)
 */
export const getActiveTicket = async (req, res, next) => {
    try {
        // ID comes securely from the JWT payload
        const patientId = req.user.id; 

        // Look for any active appointment for this patient
        const activeAppointment = await prisma.appointment.findFirst({
            where: {
                patient_id: patientId,
                status: {
                    in: ['WAITING', 'IN_CONSULTATION']
                }
            },
            // Include doctor info so the frontend knows who they are waiting for
            include: {
                doctor: {
                    include: {
                        user: { select: { name: true } }
                    }
                }
            }
        });

        if (!activeAppointment) {
            return res.status(200).json({ success: true, hasActiveTicket: false });
        }

        res.status(200).json({
            success: true,
            hasActiveTicket: true,
            data: activeAppointment
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Public Registration for Remote Patients
 * @route   POST /api/v1/auth/patient/register
 * @access  Public
 */
export const patientRegister = async (req, res, next) => {
    try {
        const { name, phone, dob, gender, blood_group, hospitalId } = req.body;

        if (!name || !phone || !hospitalId) {
            return res.status(400).json({ success: false, message: 'Name, Phone, and Hospital ID are required.' });
        }

        // 1. Check if phone already exists for this hospital
        const existingPatient = await prisma.patient.findFirst({
            where: { hospital_id: hospitalId, phone: phone }
        });

        if (existingPatient) {
            return res.status(400).json({ 
                success: false, 
                message: `Phone number is already registered. Please login with your MR Number: ${existingPatient.mr_number}` 
            });
        }

        // 2. Generate Unique MR Number
        const generateMR = () => `MR-${Math.floor(100000 + Math.random() * 900000)}`;
        let newMrNumber = generateMR();
        let isUnique = false;

        while (!isUnique) {
            const checkMR = await prisma.patient.findUnique({ where: { mr_number: newMrNumber } });
            if (!checkMR) isUnique = true;
            else newMrNumber = generateMR();
        }

        // 3. Create Patient
        const newPatient = await prisma.patient.create({
            data: {
                hospital_id: hospitalId,
                mr_number: newMrNumber,
                name,
                phone,
                dob: dob ? new Date(dob) : null,
                gender: gender || null,
                blood_group: blood_group || null
            }
        });

        // 4. Instantly issue the JWT
        const payload = {
            id: newPatient.id,
            role: 'PATIENT',
            hospital_id: newPatient.hospital_id,
            name: newPatient.name,
            mr_number: newPatient.mr_number
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            success: true,
            message: 'Registered successfully. Your MR Number has been generated.',
            token,
            data: newPatient
        });

    } catch (error) {
        next(error);
    }
};