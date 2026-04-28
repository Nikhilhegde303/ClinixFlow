import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import styles from './PatientAuthModal.module.css';

const PatientAuthModal = ({ hospitalId, onClose, onSuccess }) => {
    const { login } = useContext(AuthContext);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        phone: '',
        mr_number: '', // For Login
        name: '',      // For Register
        dob: '',
        gender: '',
        blood_group: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let response;
            if (isLoginMode) {
                // Scenario A: Walk-In Sync / Returning Patient
                response = await api.post('/auth/patient/login', {
                    phone: formData.phone,
                    mr_number: formData.mr_number
                });
            } else {
                // Scenario B: Brand New Remote Patient
                response = await api.post('/auth/patient/register', {
                    ...formData,
                    hospitalId: hospitalId
                });
            }

            // Utilize your existing AuthContext login function
            if (response.data && response.data.token) {
                login(response.data.token); 
                onSuccess(); // Tells the parent component to route them to the dashboard
            }
        } catch (err) {
            setError(err.response?.data?.message || "Authentication failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                
                <div className={styles.modalHeader}>
                    <h2>{isLoginMode ? 'Track Your Token' : 'Register as New Patient'}</h2>
                    <p>
                        {isLoginMode 
                            ? 'Enter your phone and MR Number from your physical ticket.' 
                            : 'Create a profile to generate your digital MR Number.'}
                    </p>
                </div>

                {error && <div className={styles.errorBanner}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Always ask for Phone */}
                    <div className={styles.inputGroup}>
                        <label>Phone Number *</label>
                        <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="e.g. 9876543210" />
                    </div>

                    {isLoginMode ? (
                        /* Login Specific Field */
                        <div className={styles.inputGroup}>
                            <label>MR Number *</label>
                            <input type="text" name="mr_number" required value={formData.mr_number} onChange={handleChange} placeholder="MR-XXXXXX" />
                        </div>
                    ) : (
                        /* Registration Specific Fields */
                        <>
                            <div className={styles.inputGroup}>
                                <label>Full Name *</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />
                            </div>
                            <div className={styles.inputRow}>
                                <div className={styles.inputGroup}>
                                    <label>Date of Birth</label>
                                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange}>
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Processing...' : (isLoginMode ? 'Verify & Access' : 'Register & Continue')}
                    </button>
                </form>

                <div className={styles.toggleText}>
                    {isLoginMode ? "Don't have an MR Number?" : "Already have an MR Number?"}
                    <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }}>
                        {isLoginMode ? "Register Here" : "Login Here"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatientAuthModal;