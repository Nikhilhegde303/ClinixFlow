import api from './api';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sends a robust, idempotent request to join a doctor's queue.
 * @param {string} doctorId - The ID of the doctor to join.
 * @param {object} patientData - { patientId, appointmentType, symptoms_raw }
 * @returns {Promise<object>} The API response.
 */
export const joinQueueRequest = async (doctorId, patientData) => {
    // Generate a unique key for this specific transaction attempt
    const idempotencyKey = uuidv4();

    // The API endpoint matching our strict REST refactor
    const endpoint = `/doctors/${doctorId}/queue/join`;

    const response = await api.post(
        endpoint,
        patientData,
        {
            headers: {
                'Idempotency-Key': idempotencyKey
            }
        }
    );

    return response.data;
};


/**
 * Triggers the preemption engine for an emergency insertion.
 */
export const triggerEmergencyRequest = async (doctorId, patientId) => {
    // Note: We use the REST-compliant path we built
    const response = await api.post(`/doctors/${doctorId}/queue/emergency`, {
        patientId
    });
    return response.data;
};


export const startQueueRequest = async (doctorId) => {
    const response = await api.post(`/doctors/${doctorId}/queue/start`);
    return response.data;
};

export const fetchDoctorQueue = async (doctorId) => {
    const response = await api.get(`/doctors/${doctorId}/queue`);
    return response.data;
};

export const callNextPatientRequest = async (doctorId) => {
    const response = await api.patch(`/doctors/${doctorId}/queue/call-next`);
    return response.data;
};

export const checkoutPatientRequest = async (appointmentId) => {
    const response = await api.patch(`/appointments/${appointmentId}/checkout`);
    return response.data;
};

// --- PATIENT IDENTITY SERVICES ---

export const searchPatientRequest = async (query) => {
    return await api.get(`/patients/search?q=${query}`);
};

export const registerPatientRequest = async (patientData) => {
    return await api.post('/patients', patientData);
};

//..................................................

export const fetchPatientHistory = async (patientId) => {
    return await api.get(`/patients/${patientId}/records`);
};

export const saveClinicalRecord = async (appointmentId, recordData) => {
    return await api.post(`/appointments/${appointmentId}/record`, recordData);
};