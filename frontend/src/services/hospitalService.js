import api from './api';

export const getHospitalDoctors = async (hospitalId) => {
    // Assuming you have an endpoint like this. If not, we can adjust.
    const response = await api.get(`/hospitals/${hospitalId}/doctors`);
    return response.data;
};