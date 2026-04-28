import api from './api';

export const fetchStaffRequest = async () => {
    return await api.get('/admin/staff');
};

export const registerStaffRequest = async (staffData) => {
    return await api.post('/admin/staff', staffData);
};