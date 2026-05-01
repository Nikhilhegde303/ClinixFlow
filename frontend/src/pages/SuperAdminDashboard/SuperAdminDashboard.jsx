import React, { useState, useEffect } from 'react';
import { superAdminService } from '../../services/superAdminService';
import LeadTabs from '../../components/SuperAdminDashboard/LeadTabs';
import LeadCard from '../../components/SuperAdminDashboard/LeadCard';
import ProvisionTenantModal from '../../components/SuperAdminDashboard/ProvisionTenantModal';
import ActiveTenants from '../../components/SuperAdminDashboard/ActiveTenants';
import styles from './SuperAdminDashboard.module.css';

const SuperAdminDashboard = () => {
  // Master View State
  const [mainView, setMainView] = useState('LEADS'); // 'LEADS' or 'TENANTS'

  // CRM State
  const [activeTab, setActiveTab] = useState(''); 
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [selectedLeadForProvisioning, setSelectedLeadForProvisioning] = useState(null);

  // Data Fetching for Leads (Only runs when we are on the Leads tab)
  const fetchLeads = async (status) => {
    try {
      setIsLoading(true);
      const response = await superAdminService.getLeads(status);
      if (response.success) {
        setLeads(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mainView === 'LEADS') {
      fetchLeads(activeTab);
    }
  }, [activeTab, mainView]);

  // Handlers
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await superAdminService.updateLeadStatus(leadId, newStatus);
      fetchLeads(activeTab); // Refresh view
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleProvisionSubmit = async (tenantData) => {
    try {
      const response = await superAdminService.provisionTenant(tenantData);
      if (response.success) {
        alert("Tenant successfully provisioned!");
        setSelectedLeadForProvisioning(null);
        fetchLeads(activeTab); 
      }
    } catch (error) {
      console.error("Provisioning failed", error);
      alert("Failed to create tenant.");
    }
  };

  return (
    <div className={styles.dashboardLayout}>
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <h1>Platform Command Center</h1>
          <p>Manage SaaS Tenants and CRM Pipeline</p>
        </div>

        {/* The Master Toggle Switch */}
        <div className={styles.viewToggle}>
          <button 
            className={mainView === 'LEADS' ? styles.activeToggle : styles.inactiveToggle}
            onClick={() => setMainView('LEADS')}
          >
            Hospital Leads
          </button>
          <button 
            className={mainView === 'TENANTS' ? styles.activeToggle : styles.inactiveToggle}
            onClick={() => setMainView('TENANTS')}
          >
            Active Hospitals
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        {/* Render Conditionally based on Toggle */}
        {mainView === 'LEADS' ? (
          <section className={styles.contentSection}>
            <h2>Hospital Leads Dashboard</h2>
            <LeadTabs currentTab={activeTab} onTabChange={setActiveTab} />
            
            <div className={styles.leadsGrid}>
              {isLoading ? (
                <div className={styles.messageBox}>Loading pipeline...</div>
              ) : leads.length === 0 ? (
                <div className={styles.messageBox}>No leads found for this status.</div>
              ) : (
                leads.map(lead => (
                  <LeadCard 
                    key={lead.id} 
                    lead={lead} 
                    onStatusChange={handleStatusChange}
                    onProvisionClick={(clickedLead) => setSelectedLeadForProvisioning(clickedLead)}
                  />
                ))
              )}
            </div>
          </section>
        ) : (
          <section className={styles.contentSection}>
            <h2>Active Hospitals on the Platform</h2>
            <ActiveTenants />
          </section>
        )}
      </main>

      {/* Provisioning Modal */}
      {selectedLeadForProvisioning && (
        <ProvisionTenantModal 
          lead={selectedLeadForProvisioning}
          onClose={() => setSelectedLeadForProvisioning(null)}
          onSubmit={handleProvisionSubmit}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;