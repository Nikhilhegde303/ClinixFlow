import jwt from 'jsonwebtoken';

// 1. Verify Token Identity
export const verifyToken = (req, res, next) => {
    try {
        // Look for the token in the Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        // Extract the token (Format: "Bearer <token>")
        const token = authHeader.split(' ')[1];
        
        // Verify the token using our secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the decoded payload (id, role, hospital_id) to the request
        req.user = decoded; 
        
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token.' 
        });
    }
};

// 2. Role-Based Access Control (RBAC) Guard
// Senior Concept: This is a closure/factory function returning a middleware
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Ensure the token was verified first
        if (!req.user || !req.user.role) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized access. Role undefined.' 
            });
        }

        // Check if the user's role is in the allowed list
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};