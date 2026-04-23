import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
});

// Automatically attach the JWT token to every request
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('clinixflow_token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

export default API;