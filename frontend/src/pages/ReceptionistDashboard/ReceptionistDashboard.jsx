import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';
import { searchPatientRequest, registerPatientRequest } from '../../services/queueService';
import WalkInRegistration from '../../components/ReceptionistDashboard/WalkInRegistration';
import EmergencyTriage from '../../components/ReceptionistDashboard/EmergencyTriage';
import styles from './ReceptionistDashboard.module.css';

const ReceptionistDashboard = () => {
    // --- STATE MANAGEMENT ---
    const { user } = useContext(AuthContext);

    const [searchQuery, setSearchQuery] = useState('');
    const [activePatient, setActivePatient] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    
    const [showRegModal, setShowRegModal] = useState(false);
    const [regData, setRegData] = useState({ name: '', phone: '', dob: '', gender: '', blood_group: '' });
    
    const [selectedDoctor, setSelectedDoctor] = useState(''); 
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [message, setMessage] = useState({ text: '', type: '' });

    // --- IDENTITY HANDLERS ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsSearching(true);
        setMessage({ text: '', type: '' });
        
        try {
            const response = await searchPatientRequest(searchQuery);
            setActivePatient(response.data.data);
            setMessage({ text: `Patient Found: ${response.data.data.name}`, type: 'success' });
        } catch (error) {
            setMessage({ text: "Patient not found. Please register them.", type: 'error' });
            setActivePatient(null);
        } finally {
            setIsSearching(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await registerPatientRequest(regData);
            setActivePatient(response.data.data);
            setShowRegModal(false);
            setMessage({ text: `Successfully registered ${response.data.data.name}`, type: 'success' });
            setRegData({ name: '', phone: '', dob: '', gender: '', blood_group: '' }); 
        } catch (error) {
            alert(error.response?.data?.message || "Registration failed");
        }
    };

    const clearActivePatient = () => {
        setActivePatient(null);
        setSearchQuery('');
        // We do NOT clear the message here so success messages persist on screen
    };

    //to fetch the doctors list:
    // This useEffect runs once when the dashboard loads
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                // We use the receptionist's hospital_id from their JWT to ask for the right doctors
                const response = await API.get(`/hospitals/${user.hospital_id}/doctors`);
                
                if (response.data.success) {
                    setDoctors(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch hospital doctors:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if we have a valid user and hospital ID
        if (user?.hospital_id) {
            fetchDoctors();
        }
    }, [user]);


    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.dashboardHeader}>
                <div>
                    <h1>Front Desk Hub</h1>
                    <p className={styles.subtitle}>Manage patient flow and identity verification.</p>
                </div>
                
                <div className={styles.doctorSelector}>
                    <label>Routing To:</label>
                    <select 
                        value={selectedDoctor} 
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="">
                            {isLoading ? "Loading doctors..." : "Select Doctor..."}
                        </option>
                        
                        {/* Dynamically map over the fetched doctors array! */}
                        {doctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                                {/* Using Optional Chaining to safely grab the name or fallback to email */}
                                Dr. {doc.user?.name || doc.user?.email?.split('@')[0]} ({doc.specialty || 'General'})
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            {message.text && (
                <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.gridContainer}>
                
                {/* COLUMN 1: PATIENT IDENTITY */}
                <div className={styles.identityColumn}>
                    <div className={styles.card}>
                        <h2 className={styles.title}>1. Patient Identity</h2>
                        
                        {!activePatient ? (
                            <div className={styles.searchSection}>
                                <form onSubmit={handleSearch} className={styles.searchForm}>
                                    <div className={styles.formGroup}>
                                        <label>Search MR Number or Phone</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g., MR-123456 or 9876543210"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className={styles.submitBtn} disabled={isSearching}>
                                        {isSearching ? 'Searching...' : 'Lookup Patient'}
                                    </button>
                                </form>
                                <div className={styles.divider}><span>OR</span></div>
                                <button className={styles.secondaryBtn} onClick={() => setShowRegModal(true)}>
                                    + Register New Patient
                                </button>
                            </div>
                        ) : (
                            <div className={styles.activePatientCard}>
                                <div className={styles.patientInfo}>
                                    <span className={styles.statusBadge}>✓ Identity Verified</span>
                                    <h3>{activePatient.name}</h3>
                                    <p><strong>MR Number:</strong> {activePatient.mr_number}</p>
                                    <p><strong>Phone:</strong> {activePatient.phone}</p>
                                    <div className={styles.demographicsRow}>
                                        {activePatient.blood_group && <span>🩸 {activePatient.blood_group}</span>}
                                        {activePatient.gender && <span>👤 {activePatient.gender}</span>}
                                    </div>
                                </div>
                                <button onClick={clearActivePatient} className={styles.clearBtn}>
                                    Clear / Change Patient
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: QUEUE ACTIONS */}
                <div className={styles.actionColumn}>
                    {/* The wrapper handles the beautiful dimming effect */}
                    <div className={`${styles.card} ${!activePatient ? styles.dimmedCard : ''}`}>
                        <h2 className={styles.title}>2. Issue Token</h2>
                        
                        {/* We inject our components here, passing down the exact state they need */}
                        <WalkInRegistration 
                            activePatient={activePatient}
                            selectedDoctor={selectedDoctor}
                            onComplete={clearActivePatient}
                            setGlobalMessage={setMessage}
                        />

                        <EmergencyTriage 
                            activePatient={activePatient}
                            selectedDoctor={selectedDoctor}
                            onComplete={clearActivePatient}
                            setGlobalMessage={setMessage}
                        />
                    </div>
                </div>

            </div>

            {/* --- REGISTRATION MODAL --- */}
            {showRegModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>Register New Patient</h2>
                        <form onSubmit={handleRegister}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Full Name *</label>
                                    <input type="text" value={regData.name} onChange={(e) => setRegData({...regData, name: e.target.value})} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Phone Number *</label>
                                    <input type="tel" value={regData.phone} onChange={(e) => setRegData({...regData, phone: e.target.value})} required />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Date of Birth</label>
                                    <input type="date" value={regData.dob} onChange={(e) => setRegData({...regData, dob: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Gender</label>
                                    <select value={regData.gender} onChange={(e) => setRegData({...regData, gender: e.target.value})}>
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Blood Group</label>
                                    <select value={regData.blood_group} onChange={(e) => setRegData({...regData, blood_group: e.target.value})}>
                                        <option value="">Select...</option>
                                        <option value="A+">A+</option><option value="A-">A-</option>
                                        <option value="B+">B+</option><option value="B-">B-</option>
                                        <option value="O+">O+</option><option value="O-">O-</option>
                                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowRegModal(false)}>Cancel</button>
                                <button type="submit" className={styles.submitBtn}>Register & Lock</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceptionistDashboard;