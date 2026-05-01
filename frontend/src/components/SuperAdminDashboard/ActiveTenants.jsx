import React, { useState, useEffect } from 'react';
import { superAdminService } from '../../services/superAdminService';
import styles from './ActiveTenants.module.css';

const ActiveTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await superAdminService.getActiveTenants();
        if (response.success) setTenants(response.data);
      } catch (error) {
        console.error("Failed to fetch tenants", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenants();
  }, []);

  if (isLoading) return <div className={styles.message}>Loading tenants...</div>;
  if (tenants.length === 0) return <div className={styles.message}>No active tenants yet.</div>;

  return (
    <div className={styles.tenantGrid}>
      {tenants.map(tenant => {
        const admin = tenant.users[0]; // Extract the joined admin data
        return (
          <div key={tenant.id} className={styles.tenantCard}>
            <h3>{tenant.name}</h3>
            <p className={styles.slug}>clinixflow.com/h/{tenant.slug}</p>
            
            <div className={styles.details}>
              <p><strong>Admin:</strong> {admin?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {admin?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {tenant.contact_no || 'N/A'}</p>
            </div>
            
            <div className={styles.statusFooter}>
              <span className={styles.activeBadge}>● Active Server</span>
              <small>Joined: {new Date(tenant.created_at).toLocaleDateString()}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActiveTenants;