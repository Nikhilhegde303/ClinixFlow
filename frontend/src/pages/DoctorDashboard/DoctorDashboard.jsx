import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { fetchDoctorQueue, startQueueRequest, callNextPatientRequest, checkoutPatientRequest } from '../../services/queueService';

import PatientHistory from '../../components/shared/PatientHistory/PatientHistory.jsx';
import ClinicalNotesForm from '../../components/DoctorDashboard/ClinicalNotesForm';
import BreakManager from '../../components/DoctorDashboard/BreakManager';

import styles from './DoctorDashboard.module.css';

import { io } from 'socket.io-client';

const DoctorDashboard = () => {
    const { user } = useContext(AuthContext);
    const doctorId = user?.id; 

    const [queueState, setQueueState] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false); // For button states

    const loadQueueData = async () => {
        try {
            const response = await fetchDoctorQueue(doctorId);
            setQueueState(response.data.state);
            setAppointments(response.data.appointments);
        } catch (error) {
            console.error("Failed to load queue:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (doctorId) {
            loadQueueData();
        }
    }, [doctorId]);

    // --- WEBSOCKET LISTENER ---
    useEffect(() => {
        if (!doctorId) return;

        // Connect to your backend URL (Ensure this matches your backend port!)
        const socket = io('http://localhost:5000'); 

        socket.on('connect', () => {
            console.log(`✅ Socket connected with ID: ${socket.id}`);
        });

        // Tell the backend to put us in this specific doctor's room
        const roomName = `room_dr_${doctorId}`;
        console.log(`🏥 Attempting to join room: ${roomName}`);
        socket.emit('join_clinic_room', roomName);

        // Listen for a standard queue update (e.g., Receptionist added a Walk-In)
        socket.on('queue_update', () => {
            console.log("⚡ Live Update Received: Refreshing Queue");
            loadQueueData(); // Silently refresh the data in the background!
        });

        // Listen for the Triage Emergency Alert
        socket.on('emergency_alert', (data) => {
            // In a production app, you'd use a nice Toast notification here.
            // For now, the browser alert proves it works immediately.
            alert(`🚨 EMERGENCY TRIAGE 🚨\n\nPenalty Applied: ${data.penalty} mins\n${data.reason}`);
            loadQueueData();
        });

        // Cleanup on unmount so we don't get memory leaks or duplicate listeners
        return () => {
            socket.disconnect();
        };
    }, [doctorId]);

    const handleStartShift = async () => {
        try {
            setLoading(true);
            await startQueueRequest(doctorId);
            await loadQueueData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to start shift");
            setLoading(false);
        }
    };

    // --- NEW: Clinical Action Handlers ---
    const handleCallNext = async () => {
        try {
            setActionLoading(true);
            await callNextPatientRequest(doctorId);
            await loadQueueData(); // Refresh the board
        } catch (error) {
            alert(error.response?.data?.message || "Failed to call next patient.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckout = async (appointmentId) => {
        try {
            setActionLoading(true);
            await checkoutPatientRequest(appointmentId);
            await loadQueueData(); // Refresh the board and trigger the EMA math update
        } catch (error) {
            alert(error.response?.data?.message || "Failed to checkout patient.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className={styles.loadingState}>Loading Clinical View...</div>;

    // --- THE COLD START VIEW ---
    if (!queueState) {
        return (
            <div className={styles.dashboardContainer}>
                <div className={styles.coldStartWrapper}>
                    <div className={styles.coldStartCard}>
                        <h2>Welcome, Dr. {user?.name || user?.email?.split('@')[0] || 'Colleague'}</h2>
                        <p>Your queue is currently inactive. Patients cannot be checked in until you initialize your session.</p>
                        <button onClick={handleStartShift} className={styles.startBtn} disabled={loading}>
                            {loading ? 'Starting...' : 'Start Shift & Open Queue'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- DATA PREPARATION ---
    const activePatient = appointments.find(appt => appt.status === 'IN_CONSULTATION');
    const waitingPatients = appointments.filter(appt => appt.status === 'WAITING');

    // --- THE ACTIVE CLINICAL VIEW ---
    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.activeHeader}>
                <div className={styles.headerLeft}>
                    <h1>Clinical Dashboard</h1>
                    <p className={styles.activeToken}>
                        Active Token: <span>#{queueState.current_token_calling || 'None'}</span>
                    </p>
                </div>
                <div className={styles.headerRight}>
                    {/* NEW: Break Manager Widget */}
                    <BreakManager />
                    
                    <div className={styles.emaWidget}>
                        <span className={styles.emaLabel}>Current Pace (EMA)</span>
                        <span className={styles.emaValue}>{queueState.active_ema_time.toFixed(1)} <small>mins/pt</small></span>
                    </div>
                </div>
            </header>

            <main className={styles.dashboardMain}>
                <div className={styles.gridLayout}>
                    
                    {/* LEFT COLUMN: The Current Active Patient */}
                    <section className={styles.mainColumn}>
                        <h2 className={styles.sectionTitle}>In Consultation</h2>
                        
                        {activePatient ? (
                            <>
                                <div className={`${styles.patientCard} ${styles.activeCard}`}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.tokenBadge}>Token #{activePatient.token_number}</span>
                                        <span className={styles.timeBadge}>Started: {new Date(activePatient.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    
                                    <div className={styles.clinicalData}>
                                        <h4>Symptoms & AI Insights</h4>
                                        {activePatient.ai_risk_flag && (
                                            <div className={styles.riskFlag}>⚠️ AI flagged high-risk symptoms</div>
                                        )}
                                        <p className={styles.symptomsText}>
                                            {activePatient.symptoms_summary || activePatient.symptoms_raw || "No symptoms recorded."}
                                        </p>
                                    </div>

                                    {/* NEW: Patient History Module inside the active card */}
                                    <PatientHistory patientId={activePatient.patient_id} />
                                </div>

                                {/* NEW: The Clinical Workspace that handles checkout */}
                                <ClinicalNotesForm 
                                    appointmentId={activePatient.id} 
                                    onSaveComplete={() => handleCheckout(activePatient.id)} 
                                />
                            </>
                        ) : (
                            <div className={styles.emptyStateCard}>
                                <p>No patient currently in the room.</p>
                                <button 
                                    onClick={handleCallNext} 
                                    className={styles.callNextBtn}
                                    disabled={waitingPatients.length === 0 || actionLoading}
                                >
                                    {actionLoading ? 'Calling...' : 'Call Next Patient'}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* RIGHT COLUMN: The Waiting Room */}
                    <section className={styles.sideColumn}>
                        <h3 className={styles.sectionTitle}>Waiting Room ({waitingPatients.length})</h3>
                        
                        <div className={styles.waitingList}>
                            {waitingPatients.length === 0 ? (
                                <p className={styles.emptyText}>Queue is empty.</p>
                            ) : (
                                waitingPatients.map((patient, index) => (
                                    <div key={patient.id} className={`${styles.waitingItem} ${patient.priority_level > 0 ? styles.priorityItem : ''}`}>
                                        <div className={styles.waitItemHeader}>
                                            <strong>#{patient.token_number}</strong>
                                            {patient.priority_level > 0 && <span className={styles.emergencyTag}>TRIAGE</span>}
                                        </div>
                                        <div className={styles.waitItemBody}>
                                            <p className={styles.truncateText}>{patient.symptoms_raw || "Walk-in"}</p>
                                            <small>Joined: {new Date(patient.joined_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
};

export default DoctorDashboard;