import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/authRoutes.js';
import queueRoutes from './src/routes/queueRoutes.js';
import hospitalRoutes from './src/routes/hospitalRoutes.js';
import clinicalRoutes from './src/routes/clinicalRoutes.js';
import leadRoutes from './src/routes/leadRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';
import recordRoutes from './src/routes/recordRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import superAdminRoutes from './src/routes/superAdminRoutes.js';

const app = express();

// 1. Global Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Parses incoming JSON payloads
app.use(express.json()); 

// 2. Health Check Route (Crucial for Supabase Keep-Alive)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        message: 'ClinixFlow Engine is active.',
        timestamp: new Date().toISOString() 
    });
});

// 3. API Routes 
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', queueRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/v1/clinical', clinicalRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1', recordRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/superadmin',superAdminRoutes);

// 4. Global Error Handler (Prevents stack trace leaks in production)
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    
    res.status(err.status || 500).json({
        success: false,
        error: {
            message: err.message || 'Internal Server Error',
            // Only show the detailed stack trace if we are in development mode. In production mode, show only the error message. Not the stack trace.
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

export default app;