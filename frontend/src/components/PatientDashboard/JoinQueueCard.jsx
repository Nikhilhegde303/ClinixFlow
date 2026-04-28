import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './JoinQueueCard.module.css';

const JoinQueueCard = ({ doctorId, hospitalId, patientId }) => {
    const navigate = useNavigate();
    
    // Wizard State: INSIGHTS -> SYMPTOMS -> CONFIRM -> PROCESSING
    const [step, setStep] = useState('INSIGHTS'); 
    const [error, setError] = useState(null);
    
    // Form Data
    const [symptoms, setSymptoms] = useState('');
    
    // Pre-Join Stats
    const [loadingStats, setLoadingStats] = useState(true);
    const [queueStats, setQueueStats] = useState({ length: 0, eta: 0 });

    useEffect(() => {
        const fetchPreJoinStats = async () => {
            if (!doctorId) return;
            try {
                const response = await api.get(`/doctors/${doctorId}/queue`);
                if (response.data && response.data.data) {
                    const { appointments, state } = response.data.data;
                    const queueLength = appointments.length;
                    
                    const estimatedWait = queueLength > 0 
                        ? (queueLength * (state.active_ema_time + 2)) + (state.triage_penalty || 0)
                        : 0;

                    setQueueStats({ length: queueLength, eta: Math.round(estimatedWait) });
                }
            } catch (err) {
                console.error("Could not fetch queue stats pre-join.", err);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchPreJoinStats();
    }, [doctorId]);

    const handleJoinQueue = async () => {
        setStep('PROCESSING');
        setError(null);

        try {
            const payload = {
                hospital_id: hospitalId,
                patientId: patientId,
                appointmentType: 'REMOTE',
                // ONLY send symptoms if they actually typed something
                symptoms_raw: symptoms.trim() !== '' ? symptoms.trim() : undefined
            };

            const response = await api.post(`/doctors/${doctorId}/queue/join`, payload);

            if (response.data && response.data.data) {
                const appointmentId = response.data.data.id;
                navigate(`/live-ticket/${hospitalId}/${doctorId}/${appointmentId}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to join queue. Please try again.");
            setStep('CONFIRM'); 
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.badgeRemote}>
                    <span className={styles.dot}></span> Virtual Walk-In
                </div>
            </div>

            <div className={styles.cardBody}>
                {/* STEP 1: Queue Insights */}
                {step === 'INSIGHTS' && (
                    <div className={styles.wizardStep}>
                        <h3>Join the Live Queue</h3>
                        <p className={styles.description}>
                            Track the doctor's pace from home and get a live ETA so you arrive right on time.
                        </p>
                        
                        <div className={styles.statsContainer}>
                            <div className={styles.statBox}>
                                <span>Patients Waiting</span>
                                <strong>{loadingStats ? '--' : queueStats.length}</strong>
                            </div>
                            <div className={styles.statBox}>
                                <span>Est. Wait Time</span>
                                <strong>{loadingStats ? '--' : queueStats.eta} mins</strong>
                            </div>
                        </div>

                        <button 
                            className={styles.primaryBtn} 
                            onClick={() => setStep('SYMPTOMS')}
                            disabled={loadingStats}
                        >
                            Proceed to Join
                        </button>
                    </div>
                )}

                {/* STEP 2: Symptom Intake */}
                {step === 'SYMPTOMS' && (
                    <div className={styles.wizardStep}>
                        <h3>How are you feeling?</h3>
                        <p className={styles.description}>
                            Briefly describe your symptoms. Our AI will securely summarize this for the doctor before you enter.
                        </p>
                        
                        <textarea 
                            className={styles.symptomInput}
                            placeholder="E.g., I've had a mild fever and headache since yesterday morning..."
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            rows={4}
                        />

                        <div className={styles.buttonGroup}>
                            <button className={styles.cancelBtn} onClick={() => { setStep('CONFIRM'); setSymptoms(''); }}>
                                Skip
                            </button>
                            <button 
                                className={styles.primaryBtn} 
                                onClick={() => setStep('CONFIRM')}
                                disabled={symptoms.trim() === ''}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Final Confirmation */}
                {step === 'CONFIRM' && (
                    <div className={styles.wizardStep}>
                        <div className={styles.warningIcon}>⚕️</div>
                        <h3>Confirm Virtual Token</h3>
                        <p className={styles.description}>
                            Are you ready to join the queue? Once joined, your wait time will begin calculating immediately.
                        </p>
                        
                        {/* Little indicator showing if AI processing is armed */}
                        {symptoms.trim() !== '' && (
                            <div className={styles.aiBadge}>
                                ✨ Symptoms recorded for AI summary
                            </div>
                        )}
                        
                        {error && <div className={styles.errorBanner}>{error}</div>}

                        <div className={styles.buttonGroup}>
                            <button className={styles.cancelBtn} onClick={() => setStep('INSIGHTS')}>
                                Cancel
                            </button>
                            <button className={styles.confirmBtn} onClick={handleJoinQueue}>
                                Yes, Issue My Token
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Processing */}
                {step === 'PROCESSING' && (
                    <div className={styles.processingView}>
                        <div className={styles.spinner}></div>
                        <p>Securing your place in line...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JoinQueueCard;