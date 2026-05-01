import api from './api';

export const superAdminService = {
  // Fetch leads, optionally filtering by status
  getLeads: async (status = '') => {
    // If status exists, it appends ?status=PENDING, otherwise just /leads
    const query = status ? `?status=${status}` : '';
    const response = await api.get(`/superadmin/leads${query}`);
    return response.data;
  },

  updateLeadStatus: async (leadId, status) => {
    const response = await api.patch(`/superadmin/leads/${leadId}/status`, { status });
    return response.data;
  },

  provisionTenant: async (tenantData) => {
    const response = await api.post('/superadmin/provision-tenant', tenantData);
    return response.data;
  },

  getActiveTenants: async () => {
    const response = await api.get('/superadmin/hospitals');
    return response.data;
  }
};