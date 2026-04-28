import React, { useState, useEffect } from 'react';
import { fetchPatientHistory } from '../../../services/queueService';
import styles from './PatientHistory.module.css';

const PatientHistory = ({ patientId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            if (!patientId) return;
            setLoading(true);
            try {
                const response = await fetchPatientHistory(patientId);
                setHistory(response.data.data);
            } catch (error) {
                console.error("Failed to load history", error);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [patientId]);

    if (loading) return <div className={styles.historyLoading}>Loading medical history...</div>;

    return (
        <div className={styles.historyContainer}>
            <h4 className={styles.subTitle}>Previous Medical History</h4>
            {history.length === 0 ? (
                <p className={styles.emptyText}>No previous records found for this patient.</p>
            ) : (
                <div className={styles.timeline}>
                    {history.map((record) => (
                        <div key={record.id} className={styles.historyCard}>
                            <div className={styles.historyHeader}>
                                <strong>{new Date(record.created_at).toLocaleDateString()}</strong>
                                <small>Dr. {record.doctor?.name || "Unknown"}</small>
                            </div>
                            <p><strong>Diagnosis:</strong> {record.diagnosis || "N/A"}</p>
                            {record.prescription && record.prescription.length > 0 && (
                                <div className={styles.historyMeds}>
                                    <strong>Rx:</strong> {record.prescription.map(p => p.medicine).join(', ')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientHistory;