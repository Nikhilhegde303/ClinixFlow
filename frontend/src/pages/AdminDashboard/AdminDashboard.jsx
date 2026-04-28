import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { fetchStaffRequest, registerStaffRequest } from '../../services/adminService'; // Update path as needed
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'DOCTOR', specialization: ''
    });

    const loadStaff = async () => {
        try {
            const response = await fetchStaffRequest();
            setStaffList(response.data.data);
        } catch (error) {
            console.error("Failed to load staff", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStaff(); }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await registerStaffRequest(formData);
            setShowModal(false);
            setFormData({ name: '', email: '', password: '', role: 'DOCTOR', specialization: '' });
            await loadStaff(); // Refresh directory
            alert("Staff member added successfully!");
        } catch (error) {
            alert(error.response?.data?.message || "Registration failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const doctorsCount = staffList.filter(s => s.role === 'DOCTOR').length;
    const receptionistCount = staffList.filter(s => s.role === 'RECEPTIONIST').length;

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <div>
                    <h1>Hospital Administration</h1>
                    <p className={styles.subtitle}>Welcome back, {user?.name || 'Admin'}. Manage your clinical staff here.</p>
                </div>
                <button onClick={() => setShowModal(true)} className={styles.addBtn}>
                    + Provision New Staff
                </button>
            </header>

            {/* Quick Stats (High ROI feature!) */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total Doctors</h3>
                    <div className={styles.statNumber}>{doctorsCount}</div>
                </div>
                <div className={styles.statCard}>
                    <h3>Total Receptionists</h3>
                    <div className={styles.statNumber}>{receptionistCount}</div>
                </div>
                <div className={styles.statCard}>
                    <h3>Active System Status</h3>
                    <div className={styles.statNumber} style={{color: '#10b981'}}>Online</div>
                </div>
            </div>

            {/* Staff Directory */}
            <main className={styles.directorySection}>
                <h2 className={styles.sectionTitle}>Staff Directory</h2>
                {loading ? <p>Loading directory...</p> : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.staffTable}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Specialization</th>
                                    <th>Joined Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.map(staff => (
                                    <tr key={staff.id}>
                                        <td className={styles.fwBold}>{staff.name}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${staff.role === 'DOCTOR' ? styles.roleDoc : styles.roleRec}`}>
                                                {staff.role}
                                            </span>
                                        </td>
                                        <td>{staff.email}</td>
                                        <td>{staff.doctor?.specialty || '-'}</td>
                                        <td>{new Date(staff.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {staffList.length === 0 && (
                                    <tr><td colSpan="5" style={{textAlign: 'center'}}>No staff provisioned yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Registration Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>Add New Staff Member</h2>
                        <form onSubmit={handleRegister}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Full Name</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email Address</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Temporary Password</label>
                                    <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>System Role</label>
                                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                                        <option value="DOCTOR">Doctor</option>
                                        <option value="RECEPTIONIST">Receptionist</option>
                                    </select>
                                </div>
                            </div>
                            
                            {formData.role === 'DOCTOR' && (
                                <div className={styles.formGroup}>
                                    <label>Specialization (e.g., Cardiologist, General)</label>
                                    <input type="text" value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} required />
                                </div>
                            )}

                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowModal(false)} className={styles.cancelBtn}>Cancel</button>
                                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                                    {isSubmitting ? 'Provisioning...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;