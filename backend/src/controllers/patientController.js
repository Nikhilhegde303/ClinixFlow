import prisma from '../utils/db.js';

/**
 * @desc    Search for a patient by MR Number or Phone
 * @route   GET /api/v1/patients/search?q=...
 * @access  Private (RECEPTIONIST or DOCTOR)
 */
export const searchPatient = async (req, res, next) => {
    try {
        const { q } = req.query;
        const hospitalId = req.user.hospital_id;

        if (!q) {
            return res.status(400).json({ success: false, message: 'Search query is required.' });
        }

        // Find patient by exact MR number or Phone number in this specific hospital
        const patient = await prisma.patient.findFirst({
            where: {
                hospital_id: hospitalId,
                OR: [
                    { mr_number: q },
                    { phone: q }
                ]
            }
        });

        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found.' });
        }

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Register a new patient
 * @route   POST /api/v1/patients
 * @access  Private (RECEPTIONIST)
 */
export const registerPatient = async (req, res, next) => {
    try {
        // 1. Extract the new fields from the request body
        const { name, phone, dob, gender, blood_group } = req.body;
        const hospitalId = req.user.hospital_id;

        //Safe Date Parsing
        let parsedDob = null;
        if (dob) {
            const dateObj = new Date(dob);
            // Check if the date is actually valid before saving
            if (!isNaN(dateObj.getTime())) { 
                parsedDob = dateObj;
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid Date format. Please use YYYY-MM-DD.' 
                });
            }
        }

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and Phone are required.' });
        }

        // 2. Check if phone number already exists
        const existingPatient = await prisma.patient.findFirst({
            where: { hospital_id: hospitalId, phone: phone }
        });

        if (existingPatient) {
            return res.status(400).json({ 
                success: false, 
                message: `Patient with phone ${phone} already exists (MR: ${existingPatient.mr_number}).` 
            });
        }

        // 3. Generate a Unique MR Number
        const generateMR = () => `MR-${Math.floor(100000 + Math.random() * 900000)}`;
        let newMrNumber = generateMR();
        let isUnique = false;

        while (!isUnique) {
            const checkMR = await prisma.patient.findUnique({ where: { mr_number: newMrNumber } });
            if (!checkMR) isUnique = true;
            else newMrNumber = generateMR();
        }

        // 4. Save to Database with the new fields
        const newPatient = await prisma.patient.create({
            data: {
                hospital_id: hospitalId,
                mr_number: newMrNumber,
                name,
                phone,
                dob: parsedDob, // <-- Use the safely parsed date here
                gender: gender || null,
                blood_group: blood_group || null
            }
        });

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully.',
            data: newPatient
        });
    } catch (error) {
        next(error);
    }
};

