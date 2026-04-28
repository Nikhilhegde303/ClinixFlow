import React, { useState } from 'react';
import { saveClinicalRecord } from '../../services/queueService';
import styles from './ClinicalNotesForm.module.css';

const ClinicalNotesForm = ({ appointmentId, onSaveComplete }) => {
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    // Dynamic array for JSONB storage
    const [prescription, setPrescription] = useState([{ medicine: '', dosage: '', duration: '' }]);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddMedicine = () => {
        setPrescription([...prescription, { medicine: '', dosage: '', duration: '' }]);
    };

    const handleMedChange = (index, field, value) => {
        const updated = [...prescription];
        updated[index][field] = value;
        setPrescription(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Filter out empty rows
            const cleanPrescription = prescription.filter(p => p.medicine.trim() !== '');
            
            await saveClinicalRecord(appointmentId, {
                diagnosis,
                notes,
                prescription: cleanPrescription
            });
            alert("Clinical record saved securely.");
            if (onSaveComplete) onSaveComplete(); // Triggers the actual checkout
        } catch (error) {
            alert("Failed to save record.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.clinicalNotesWrapper}>
            <h3 className={styles.sectionTitle}>Clinical Workspace</h3>
            
            <div className={styles.formGroup}>
                <label>Primary Diagnosis</label>
                <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g., Acute Bronchitis" />
            </div>

            <div className={styles.formGroup}>
                <label>Clinical Notes / Summary</label>
                <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations..." />
            </div>

            <div className={styles.prescriptionSection}>
                <label>e-Prescription</label>
                {prescription.map((med, index) => (
                    <div key={index} className={styles.medRow}>
                        <input type="text" placeholder="Medicine Name" value={med.medicine} onChange={(e) => handleMedChange(index, 'medicine', e.target.value)} />
                        <input type="text" placeholder="Dosage (e.g., 500mg)" value={med.dosage} onChange={(e) => handleMedChange(index, 'dosage', e.target.value)} />
                        <input type="text" placeholder="Duration (e.g., 5 Days)" value={med.duration} onChange={(e) => handleMedChange(index, 'duration', e.target.value)} />
                    </div>
                ))}
                <button className={styles.textBtn} onClick={handleAddMedicine}>+ Add Another Medicine</button>
            </div>

            <button className={styles.saveRecordBtn} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving to Database...' : 'Save Record & Checkout Patient'}
            </button>
        </div>
    );
};

export default ClinicalNotesForm;