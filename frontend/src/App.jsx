import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// We will build these actual page components in Week 2
const Home = () => <div>Landing Page (Patient Discovery)</div>;
const Login = () => <div>Login Page</div>;
const AdminDashboard = () => <div>Admin View (Manage Hospital & Staff)</div>;
const DoctorDashboard = () => <div>Doctor View (Clinical Queue & AI Records)</div>;
const ReceptionistDashboard = () => <div>Receptionist View (Logistics & Triage)</div>;
const PatientTicket = () => <div>Patient View (Live ETA & Ticket)</div>;

// The Gatekeeper Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useContext(AuthContext);

    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
    
    return children;
};

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                
                {/* Patient View */}
                <Route path="/ticket/:id" element={<PatientTicket />} />

                {/* Secure Admin SaaS View */}
                <Route 
                    path="/dashboard/admin" 
                    element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } 
                />

                {/* Secure Clinical View */}
                <Route 
                    path="/dashboard/doctor" 
                    element={
                        <ProtectedRoute allowedRoles={['DOCTOR']}>
                            <DoctorDashboard />
                        </ProtectedRoute>
                    } 
                />

                {/* Secure Logistics View */}
                <Route 
                    path="/dashboard/reception" 
                    element={
                        <ProtectedRoute allowedRoles={['RECEPTIONIST']}>
                            <ReceptionistDashboard />
                        </ProtectedRoute>
                    } 
                />
            </Routes>
        </Router>
    );
};

export default App;