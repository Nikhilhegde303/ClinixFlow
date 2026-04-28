import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import ReceptionistDashboard from './pages/ReceptionistDashboard/ReceptionistDashboard.jsx';
import DoctorDashboard from './pages/DoctorDashboard/DoctorDashboard.jsx';
import Login from './pages/Login/Login.jsx';
import LandingPage from './pages/Landing/LandingPage.jsx';

import AdminDashboard from './pages/AdminDashboard/AdminDashboard.jsx';

import LiveTicket from './pages/LiveTicket/LiveTicket';
import PatientDashboard from './pages/PatientDashboard/PatientDashboard';
import HospitalPublicPage from './pages/HospitalPublicPage/HospitalPublicPage';



// The Gatekeeper Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading Auth State...</div>;
    
    if (!user) return <Navigate to="/login" replace />;
    
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

const App = () => {
    return (
        <Router>
            <Routes>
                {/* 3. Map the base URL to your new Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* The new Digital Front Door Route */}
<Route path="/h/:slug" element={<HospitalPublicPage />} />

                {/* Scenario A: Frictionless Walk-In (Completely Public) */}
<Route 
  path="/live-ticket/:hospitalId/:doctorId/:appointmentId" 
  element={<LiveTicket />} 
/>
                
                {/* 4. Map the login route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Receptionist Route */}
                <Route 
                    path="/receptionist" 
                    element={
                        <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN']}>
                            <ReceptionistDashboard />
                        </ProtectedRoute>
                    } 
                />

                <Route 
    path="/doctor" 
    element={
        <ProtectedRoute allowedRoles={['DOCTOR']}>
            <DoctorDashboard />
        </ProtectedRoute>
    } 
/>

<Route 
    path="/admin/dashboard" 
    element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
        </ProtectedRoute>
    } 
/>

{/* Scenario B: Authenticated Remote Patient (Strictly Protected) */}
<Route 
  path="/dashboard/patient" 
  element={<PatientDashboard />} 
/>

<Route 
    path="/unauthorized" 
    element={<div style={{ padding: '50px', textAlign: 'center' }}><h2>403 - Unauthorized</h2><p>You do not have the correct role to view this page.</p></div>} 
/>
                
                {/* Fallback route - catches any typos and sends them to the landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default App;