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

export const getDoctorsByHospital = async (req, res, next) => {
    try {
        const { hospitalId } = req.params;
        const userHospitalId = req.user.hospital_id; // Injected by your verifyToken middleware
        const userRole = req.user.role;

        // 1. TENANT ISOLATION GUARD
        // Prevent users from querying other hospitals (unless they are a SUPER_ADMIN platform owner)
        if (userRole !== 'SUPER_ADMIN' && userHospitalId !== hospitalId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized: You can only view staff within your own hospital network.' 
            });
        }

        // 2. FETCH DATA
        const doctors = await prisma.doctor.findMany({
            where: { hospital_id: hospitalId },
            include: {
                user: {
                    select: { 
                        email: true,
                        name: true // Required for the frontend dashboard UI!
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            data: doctors
        });

    } catch (error) {
        next(error);
    }
};



/**
 * @desc    Get hospital and its doctors by URL slug (Digital Front Door)
 * @route   GET /api/v1/hospitals/slug/:slug
 * @access  Public
 */
export const getHospitalBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const hospital = await prisma.hospital.findUnique({
            where: { slug: slug },
            select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                contact_no: true,
                // Fetch the doctors associated with this hospital
                doctors: {
                    select: {
                        id: true,
                        specialty: true,
                        room_number: true,
                        // Fetch the actual human name from the linked User table
                        user: {
                            select: {
                                name: true 
                            }
                        }
                    }
                }
            }
        });

        if (!hospital) {
            return res.status(404).json({ 
                success: false, 
                message: "Hospital not found." 
            });
        }

        // Format the response slightly to make the frontend's life easier
        const formattedDoctors = hospital.doctors.map(doc => ({
            id: doc.id,
            specialty: doc.specialty,
            room_number: doc.room_number,
            name: doc.user?.name || "Doctor"
        }));

        res.status(200).json({
            success: true,
            data: {
                hospital: {
                    id: hospital.id,
                    name: hospital.name,
                    slug: hospital.slug,
                    address: hospital.address,
                    contact_no: hospital.contact_no
                },
                doctors: formattedDoctors
            }
        });

    } catch (error) {
        next(error);
    }
};