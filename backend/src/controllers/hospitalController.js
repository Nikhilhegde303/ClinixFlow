import prisma from '../utils/db.js';

/**
 * @desc    Search hospitals by name (Global Search Bar)
 * @route   GET /api/v1/hospitals/search?q=keyword
 * @access  Public
 */
export const searchHospitals = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ success: false, message: 'Provide a search term of at least 2 characters.' });
        }

        // Prisma 'contains' with 'mode: insensitive' executes a highly efficient ILIKE query
        const hospitals = await prisma.hospital.findMany({
            where: {
                name: {
                    contains: q,
                    mode: 'insensitive' // Matches "Karthik", "karthik", "KARTHIK"
                }
            },
            select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                contact_no: true
            },
            take: 10 // Limit results to prevent massive payloads
        });

        res.status(200).json({
            success: true,
            count: hospitals.length,
            data: hospitals
        });

    } catch (error) {
        next(error);
    }
};