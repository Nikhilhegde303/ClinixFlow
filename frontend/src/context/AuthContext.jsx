import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // On app load, check if a valid token exists
        const token = localStorage.getItem('clinixflow_token');
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                // Check if token is expired
                if (decodedUser.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser(decodedUser); // Sets { id, role, hospital_id }
                }
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    }, []);

    console.log("AuthContext User:", user);
console.log("Auth Loading:", loading);

    const login = (token) => {
        localStorage.setItem('clinixflow_token', token);
        const decodedUser = jwtDecode(token);
        setUser(decodedUser);
    };

    const logout = () => {
        localStorage.removeItem('clinixflow_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};