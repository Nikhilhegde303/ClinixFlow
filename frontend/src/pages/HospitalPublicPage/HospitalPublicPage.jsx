import React, { useState, useEffect, useContext } from 'react'; // ADD useContext
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext'; // IMPORT Context
import PatientAuthModal from '../../components/PatientAuthModal/PatientAuthModal'; // IMPORT Modal
import styles from './HospitalPublicPage.module.css';


const HospitalPublicPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [hospital, setHospital] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [selectedDoctorForQueue, setSelectedDoctorForQueue] = useState(null);

    useEffect(() => {
        // You will need a public backend endpoint that fetches a hospital and its doctors by slug
        const fetchHospitalDetails = async () => {
            try {
                // Example: GET /api/v1/hospitals/slug/karthik-netralaya
                const response = await api.get(`/hospitals/slug/${slug}`);
                if (response.data && response.data.data) {
                    setHospital(response.data.data.hospital);
                    setDoctors(response.data.data.doctors);
                }
            } catch (error) {
                console.error("Failed to fetch hospital details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHospitalDetails();
    }, [slug]);

    const handleSelectDoctor = (doctorId) => {
        // Pass the IDs via URL parameters to the protected patient dashboard
        // If they aren't logged in, your ProtectedRoute will catch them, send them to /login, 
        // and you can pass these params along after login!
        navigate(`/dashboard/patient?hospitalId=${hospital.id}&doctorId=${doctorId}`);
    };

    const handleJoinClick = (doctorId) => {
        // If they are already logged in as a PATIENT, send them straight to the dashboard
        if (user && user.role === 'PATIENT') {
            navigate(`/dashboard/patient?hospitalId=${hospital.id}&doctorId=${doctorId}`);
        } else {
            // Otherwise, pop the authentication modal
            setSelectedDoctorForQueue(doctorId);
            setShowAuthModal(true);
        }
    };

    const handleAuthSuccess = () => {
        // Called by the modal after successful login/register
        setShowAuthModal(false);
        navigate(`/dashboard/patient?hospitalId=${hospital.id}&doctorId=${selectedDoctorForQueue}`);
    };


    if (loading) return <div>Loading Clinic Details...</div>;
    if (!hospital) return <div>Hospital not found.</div>;

    

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>{hospital.name}</h1>
                <p>{hospital.address}</p>
            </header>

            <main className={styles.mainContent}>
                <h2>Available Doctors</h2>
                <div className={styles.doctorGrid}>
                    {doctors.map(doc => (
                        <div key={doc.id} className={styles.doctorCard}>
                            <h3>Dr. {doc.name || "Doctor"}</h3>
                            <p className={styles.specialty}>{doc.specialty}</p>
                            <p>Room: {doc.room_number}</p>
                            
                            {/* UPDATE THIS BUTTON */}
                            <button 
                                onClick={() => handleJoinClick(doc.id)}
                                className={styles.joinBtn}
                            >
                                Join Virtual Queue
                            </button>
                        </div>
                    ))}
                </div>
            </main>

            {/* RENDER THE MODAL IF TRIGGERED */}
            {showAuthModal && (
                <PatientAuthModal 
                    hospitalId={hospital.id}
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={handleAuthSuccess}
                />
            )}
        </div>
    );
};

export default HospitalPublicPage;