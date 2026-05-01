import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import styles from './Login.module.css';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Pulling the login function from your Global Brain

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    setError(''); // Clear error when user starts typing again
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await API.post('/auth/login', credentials);
      
      if (response.data.success) {
        // 1. Hand the token to the AuthContext to decode and save
        login(response.data.token);
        
        // 2. The Smart Redirect (Push them to their specific dashboard)
        const userRole = response.data.user.role;
        
        if (userRole === 'RECEPTIONIST') {
          navigate('/receptionist');
        } else if (userRole === 'DOCTOR') {
          navigate('/doctor'); 
        } else if (userRole === 'ADMIN') {
          // The hospital owner goes to their specific hospital dashboard
          navigate('/admin/dashboard');
        } else if (userRole === 'SUPER_ADMIN') {
          // go to the super admin dashboard
          navigate('/super-admin'); 
        } else {
          navigate('/'); // Fallback
        }
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* Background decorative elements */}
      <div className={styles.blobTop}></div>
      <div className={styles.blobBottom}></div>

      <div className={styles.glassCard}>
        <div className={styles.header}>
          <h2>Staff Portal</h2>
          <p>Sign in to manage the ClinixFlow queue.</p>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <div className={styles.iconWrapper}>
              <Mail size={18} />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={credentials.email}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.iconWrapper}>
              <Lock size={18} />
            </div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <button 
            type="submit" 
            className={styles.loginBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/" className={styles.backLink}>&larr; Back to Landing Page</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;