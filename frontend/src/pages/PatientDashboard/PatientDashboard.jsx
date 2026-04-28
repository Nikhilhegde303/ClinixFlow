import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import JoinQueueCard from '../../components/PatientDashboard/JoinQueueCard';
import PatientHistory from '../../components/Shared/PatientHistory/PatientHistory';
import styles from './PatientDashboard.module.css';

const PatientDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    
    const searchParams = new URLSearchParams(location.search);
    const selectedHospitalId = searchParams.get('hospitalId');
    const selectedDoctorId = searchParams.get('doctorId');

    const [activeTicket, setActiveTicket] = useState(null);
    const [loadingTicket, setLoadingTicket] = useState(true);

    useEffect(() => {
        const checkActiveTicket = async () => {
            try {
                const response = await api.get('/patients/me/active-ticket');
                if (response.data && response.data.hasActiveTicket) {
                    setActiveTicket(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch active ticket status:", error);
            } finally {
                setLoadingTicket(false);
            }
        };

        if (user?.id) checkActiveTicket();
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className={styles.pageWrapper}>
            {/* Minimalist Top Nav */}
            <nav className={styles.navbar}>
                <div className={styles.brand}>
                    <span className={styles.brandAccent}>Clinix</span>Flow
                </div>
                <div className={styles.navControls}>
                    <div className={styles.userChip}>
                        ID: {user?.mr_number || user?.id?.substring(0,8)}
                    </div>
                    <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
                </div>
            </nav>

            <main className={styles.dashboardGrid}>
                {/* Left Column: Action Center */}
                <section className={styles.actionColumn}>
                    {loadingTicket ? (
                        <div className={styles.skeletonCard}></div>
                    ) : activeTicket ? (
                        <div className={styles.activeSessionCard}>
                            <div className={styles.pulseIndicator}></div>
                            <h2>Active Session Found</h2>
                            <p>You are in the queue for <strong>Dr. {activeTicket.doctor?.user?.name || "Unknown"}</strong>.</p>
                            <div className={styles.tokenPill}>Token #{activeTicket.token_number}</div>
                            <button 
                                className={styles.resumeBtn}
                                onClick={() => navigate(`/live-ticket/${activeTicket.hospital_id}/${activeTicket.doctor_id}/${activeTicket.id}`)}
                            >
                                Open Live Tracker
                            </button>
                        </div>
                    ) : (
                        <JoinQueueCard 
                            doctorId={selectedDoctorId} 
                            hospitalId={selectedHospitalId} 
                            patientId={user?.id} 
                        />
                    )}
                </section>

                {/* Right Column: Medical Data */}
                <section className={styles.dataColumn}>
                    <div className={styles.dataCard}>
                        <PatientHistory patientId={user?.id} />
                    </div>
                </section>
            </main>
        </div>
    );
};

export default PatientDashboard;