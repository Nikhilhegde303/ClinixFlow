import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
});

// Attach JWT token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('clinixflow_token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

//ENDPOINTS FOR LANDING PAGE 

// Using the ILIKE logic for fast, case-insensitive searching
export const searchHospitalsAPI = (keyword) => 
  API.get(`/hospitals/search?q=${keyword}`);

// B2B Lead capture (You will need to create a simple controller for this later)
export const submitDemoRequestAPI = (leadData) => 
  API.post('/leads/request', leadData);

export default API;