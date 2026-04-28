import React, { useState } from 'react';
import { triggerEmergencyRequest } from '../../services/queueService';
import styles from './EmergencyTriage.module.css';

const EmergencyTriage = ({ activePatient, selectedDoctor, onComplete, setGlobalMessage }) => {
    const [loading, setLoading] = useState(false);

    const handleEmergency = async () => {
        if (!selectedDoctor || !activePatient) return;
        
        const confirmEmergency = window.confirm(`Declare EMERGENCY for ${activePatient.name}? This will preempt the queue.`);
        if (!confirmEmergency) return;

        setLoading(true);
        try {
            await triggerEmergencyRequest(selectedDoctor, activePatient.mr_number);
            setGlobalMessage({ text: "🚨 Emergency Triage applied. Queue updated.", type: 'success' });
            onComplete();
        } catch (error) {
            setGlobalMessage({ text: error.response?.data?.message || "Triage failed", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    let buttonWarning = "";
    if (!activePatient) buttonWarning = "Please search or register a patient first.";
    else if (!selectedDoctor) buttonWarning = "Please select a Doctor from the top menu.";

    return (
        <div className={styles.triageSection}>
            <hr className={styles.subDivider}/>
            <p className={styles.triageWarning}>Is this patient experiencing a critical emergency?</p>
            
            <div className={styles.tooltipWrapper} title={buttonWarning}>
                <button 
                    onClick={handleEmergency} 
                    className={styles.criticalBtn}
                    disabled={loading || !selectedDoctor || !activePatient}
                >
                    {loading ? 'Processing...' : 'Preempt Queue (Triage)'}
                </button>
            </div>
        </div>
    );
};

export default EmergencyTriage;