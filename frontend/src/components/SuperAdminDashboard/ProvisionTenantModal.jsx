import React, { useState } from 'react';
import styles from './ProvisionTenantModal.module.css';

const ProvisionTenantModal = ({ lead, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    hospitalName: lead.clinic_name || '',
    slug: lead.clinic_name ? lead.clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
    // --- NEW FIELDS ---
    address: '', 
    contactNo: lead.phone_number || '', // Pre-filling from the Lead data!
    // ------------------
    adminName: lead.contact_person || '',
    adminEmail: '', 
    adminPassword: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, leadId: lead.id }); 
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>Provision New Tenant</h2>
        <p className={styles.subtitle}>Converting Lead: {lead.clinic_name}</p>

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label>Hospital/Clinic Name (Verified)</label>
            <input name="hospitalName" value={formData.hospitalName} onChange={handleChange} required />
          </div>

          <div className={styles.inputGroup}>
            <label>URL Slug (e.g., karthik-netralaya)</label>
            <input name="slug" value={formData.slug} onChange={handleChange} required />
          </div>

          {/* --- NEW INPUTS --- */}
          <div className={styles.inputGroup}>
            <label>Hospital Address</label>
            <textarea 
              name="address" 
              value={formData.address} 
              onChange={handleChange} 
              rows="2" 
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Hospital Contact Number</label>
            <input name="contactNo" value={formData.contactNo} onChange={handleChange} required />
          </div>
          {/* ------------------ */}

          <div className={styles.inputGroup}>
            <label>Admin Full Name</label>
            <input name="adminName" value={formData.adminName} onChange={handleChange} required />
          </div>

          <div className={styles.inputGroup}>
            <label>Admin Email (Login ID)</label>
            <input type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} required />
          </div>

          <div className={styles.inputGroup}>
            <label>Temporary Admin Password</label>
            <input type="password" name="adminPassword" value={formData.adminPassword} onChange={handleChange} required />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn}>Create Tenant & Admin</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProvisionTenantModal;