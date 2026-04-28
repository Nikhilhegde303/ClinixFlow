import React, { useState } from 'react';
import { joinQueueRequest } from '../../services/queueService';
import styles from './WalkInRegistration.module.css'; // Make sure this matches your filename!

const WalkInRegistration = ({ activePatient, selectedDoctor, onComplete, setGlobalMessage }) => {
    const [symptoms, setSymptoms] = useState('');
    const [appointmentType, setAppointmentType] = useState('WALK_IN'); // NEW STATE
    const [loading, setLoading] = useState(false);

    const handleIssueToken = async (e) => {
        e.preventDefault();
        if (!selectedDoctor || !activePatient) return;

        setLoading(true);
        try {
            const response = await joinQueueRequest(selectedDoctor, {
                patientId: activePatient.mr_number,
                appointmentType: appointmentType, // NOW DYNAMIC
                symptoms_raw: symptoms
            });
            setGlobalMessage({ text: `Token #${response.data.token_number} issued successfully!`, type: 'success' });
            setAppointmentType('WALK_IN'); // Reset to default
            onComplete(); 
        } catch (error) {
            setGlobalMessage({ text: error.response?.data?.message || "Failed to issue token", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    let buttonWarning = "";
    if (!activePatient) buttonWarning = "Please search or register a patient first.";
    else if (!selectedDoctor) buttonWarning = "Please select a Doctor from the top menu.";

    return (
        <form onSubmit={handleIssueToken} className={styles.registrationForm}>
            
            {/* NEW: Visit Type Dropdown */}
            <div className={styles.formGroup}>
                <label>Visit Type</label>
                <select 
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    disabled={!activePatient}
                    className={styles.selectInput}
                >
                    <option value="WALK_IN">Walk-In</option>
                    <option value="APPOINTMENT">Pre-Booked Appointment</option>
                    <option value="FOLLOW_UP">Follow-Up Routine</option>
                </select>
            </div>

            <div className={styles.formGroup}>
                <label>Chief Complaint / Symptoms</label>
                <textarea 
                    placeholder="Briefly describe symptoms..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows="3"
                    disabled={!activePatient}
                    className={styles.textarea}
                />
            </div>
            
            <div className={styles.tooltipWrapper} title={buttonWarning}>
                <button 
                    type="submit" 
                    className={styles.submitBtn} 
                    disabled={loading || !selectedDoctor || !activePatient}
                >
                    {loading ? 'Processing...' : 'Issue Standard Token'}
                </button>
            </div>
            
            {activePatient && !selectedDoctor && (
                <p className={styles.warningText}>* Select a doctor to issue token</p>
            )}
        </form>
    );
};

export default WalkInRegistration;