import React, { useState } from 'react';
import { submitDemoRequestAPI } from '../../services/api';
import styles from '../../pages/Landing/Landing.module.css';

const LeadCaptureForm = () => {
  // 1. Updated state keys to match the backend controller
  const [formData, setFormData] = useState({ 
    clinic_name: '', 
    contact_person: '', 
    phone_number: '' 
  });
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      // 2. Now formData perfectly matches what createDemoRequest expects
      await submitDemoRequestAPI(formData);
      setStatus('success');
    } catch (error) {
      console.error("Failed to submit lead", error);
      setStatus('idle');
      // If it fails again, log the specific error message from the backend
      alert(error.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.glassCard}>
        <h3 className={styles.successMessage}>✓ Thank you!</h3>
        <p style={{ textAlign: 'center', color: '#475569' }}>
          Our team will contact you within 24 hours to set up your multi-tenant instance.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.glassCard}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#0f172a' }}>
        Start Seeing More Patients Today
      </h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Clinic / Hospital Name</label>
          <input 
            type="text" 
            required
            className={styles.formInput} 
            value={formData.clinic_name}
            onChange={(e) => setFormData({...formData, clinic_name: e.target.value})}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Contact Person</label>
          <input 
            type="text" 
            required
            className={styles.formInput}
            value={formData.contact_person}
            onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Phone Number</label>
          <input 
            type="tel" 
            required
            className={styles.formInput}
            value={formData.phone_number}
            onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
          />
        </div>
        <button 
          type="submit" 
          className={styles.btnPrimary} 
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Sending Request...' : 'Book a Free Demo'}
        </button>
      </form>
    </div>
  );
};

export default LeadCaptureForm;