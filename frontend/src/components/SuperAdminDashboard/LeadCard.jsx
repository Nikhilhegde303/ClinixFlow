import React from 'react';
import styles from './LeadCard.module.css';

const LeadCard = ({ lead, onStatusChange, onProvisionClick }) => {
  // Helper to color-code the status badge
  const getBadgeClass = (status) => {
    switch (status) {
      case 'CONVERTED': return styles.badgeSuccess;
      case 'PENDING': return styles.badgeWarning;
      case 'REJECTED': return styles.badgeDanger;
      default: return styles.badgeInfo; // CONTACTED
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardInfo}>
        <h3>{lead.clinic_name}</h3>
        <p><strong>Contact:</strong> {lead.contact_person}</p>
        <p><strong>Phone:</strong> {lead.phone_number}</p>
        <span className={`${styles.badge} ${getBadgeClass(lead.status)}`}>
          {lead.status}
        </span>
      </div>

      <div className={styles.cardActions}>
        <select 
          value={lead.status} 
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          className={styles.statusSelect}
          disabled={lead.status === 'CONVERTED'}
        >
          <option value="PENDING">Pending</option>
          <option value="CONTACTED">Contacted</option>
          <option value="CONVERTED" disabled>Converted</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {(lead.status === 'PENDING' || lead.status === 'CONTACTED') && (
          <button 
            className={styles.provisionBtn}
            onClick={() => onProvisionClick(lead)}
          >
            Provision Tenant
          </button>
        )}
      </div>
    </div>
  );
};

export default LeadCard;