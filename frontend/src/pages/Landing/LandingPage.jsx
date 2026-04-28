import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Calendar, Activity, MonitorPlay, TrendingUp, ShieldCheck, Clock } from 'lucide-react';
import styles from './Landing.module.css';

import PatientSearch from '../../components/landing/PatientSearch';
import LeadCaptureForm from '../../components/landing/LeadCaptureForm';

const LandingPage = () => {

  // Smooth scroll logic for the navbar
  const scrollToHowItWorks = (e) => {
    e.preventDefault();
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.landingContainer}>
      
      {/* --- 1. NAVBAR --- */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>ClinixFlow</Link>
        <div className={styles.navLinks}>
          <Link to="/about" className={styles.navLink}>About</Link>
          <a href="#how-it-works" onClick={scrollToHowItWorks} className={styles.navLink}>How it works</a>
          <Link to="/login" className={styles.btnSecondary}>Staff Login</Link>
        </div>
      </nav>

     {/* --- 2. PATIENT DISCOVERY HERO --- */}
      <section className={styles.heroSection}>
        <div className={styles.statusBadge}>
          <div className={styles.statusDot}></div>
          Live Queue Engine Active
        </div>
        
        <h1 className={styles.heroTitle}>
          Don't wait in the dark.<br/>Know exactly when you're up.
        </h1>
        <p className={styles.heroSubtitle} style={{ maxWidth: '600px', margin: '0 auto 3rem auto', fontSize: '1.2rem', color: '#475569' }}>
          Find your doctor and join the live queue digitally. Get real-time, AI-predicted ETAs directly on your phone.
        </p>
        {/* The smart search bar you built previously */}
        <PatientSearch />
      </section>

      {/* --- 3. B2B SAAS ONBOARDING (Split Section) --- */}
      <section className={styles.b2bSection}>
        <div className={styles.b2bContainer}>
          <div className={styles.b2bLeft}>
            {/* The Lead form you built previously */}
            <LeadCaptureForm />
          </div>
          <div className={styles.b2bRight}>
            <h2>Transform Your Clinic's Workflow</h2>
            <p>
              Stop managing frustrated patients in crowded waiting rooms. ClinixFlow provides 
              enterprise-grade queue management designed specifically to reduce receptionist 
              burnout and improve patient satisfaction.
            </p>
            <ul className={styles.b2bList}>
              <li><CheckCircle2 color="#10b981" /> No more verbal queue updates.</li>
              <li><CheckCircle2 color="#10b981" /> Exponential Moving Average (EMA) wait predictions.</li>
              <li><CheckCircle2 color="#10b981" /> One-click Emergency Triage handling.</li>
              <li><CheckCircle2 color="#10b981" /> Multi-tenant data isolation and security.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* --- 4. FEATURE GRID (DocTrue Style) --- */}
      <section className={styles.featureSection}>
        <h2 style={{ fontSize: '2.5rem', color: '#0f172a' }}>What You Get with ClinixFlow</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}><Calendar size={28} /></div>
            <h3>Digital Check-ins</h3>
            <p>Patients join the queue via a dedicated hospital link or QR code—no app download required.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}><Activity size={28} /></div>
            <h3>Predictive Analytics</h3>
            <p>Our algorithm learns the doctor's real-time pace and updates the ETA for everyone instantly.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}><ShieldCheck size={28} /></div>
            <h3>Emergency Triage</h3>
            <p>Insert priority cases seamlessly. The system automatically recalculates wait times and notifies the room.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}><MonitorPlay size={28} /></div>
            <h3>Smart Dashboard</h3>
            <p>Doctors control the flow with a single click: 'Call Next', 'Checkout', or view AI-summarized patient histories.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}><Clock size={28} /></div>
            <h3>Outlier Suppression</h3>
            <p>One complex 60-minute surgery won't break the algorithm. Hard-caps keep predictions mathematically stable.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconWrapper}><TrendingUp size={28} /></div>
            <h3>Real-Time WebSockets</h3>
            <p>Sub-100ms updates broadcast strictly to the relevant doctor's room, preventing server meltdowns.</p>
          </div>
        </div>
      </section>

      {/* --- 5. HOW IT WORKS (Zig-Zag) --- */}
      <section id="how-it-works" className={styles.howItWorksSection}>
        <h2 style={{ textAlign: 'center', fontSize: '2.5rem', color: '#0f172a', marginBottom: '4rem' }}>
          How it works
        </h2>

        {/* Step 1 */}
        <div className={styles.zigZagRow}>
          <div className={styles.zigZagText}>
            <span className={styles.stepBadge}>Step-01</span>
            <h3>Patients search and join in seconds</h3>
            <p>
              Using the global discovery bar, patients find your clinic and join the live queue. 
              They immediately receive a dynamic digital ticket tracking their exact position.
            </p>
          </div>
          <div className={styles.zigZagVisual}>
            📱
          </div>
        </div>

        {/* Step 2 (Reversed) */}
        <div className={`${styles.zigZagRow} ${styles.reverse}`}>
          <div className={styles.zigZagText}>
            <span className={styles.stepBadge}>Step-02</span>
            <h3>Manage flow with zero friction</h3>
            <p>
              Receptionists schedule walk-ins and manage the lobby, while the backend 
              calculates Exponential Moving Averages (EMA) to predict live wait times.
            </p>
          </div>
          <div className={styles.zigZagVisual}>
            🧑‍⚕️
          </div>
        </div>

        {/* Step 3 */}
        <div className={styles.zigZagRow}>
          <div className={styles.zigZagText}>
            <span className={styles.stepBadge}>Step-03</span>
            <h3>Keep everyone in the loop</h3>
            <p>
              As the doctor clicks "Call Next," WebSockets instantly broadcast the new state 
              to patient phones and lobby Smart TVs. Total transparency, zero confusion.
            </p>
          </div>
          <div className={styles.zigZagVisual}>
            📺
          </div>
        </div>
      </section>

      {/* --- 6. FOOTER --- */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '4rem 5%', textAlign: 'center' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>ClinixFlow</h2>
        <p style={{ maxWidth: '500px', margin: '0 auto 2rem auto' }}>
          Built for High-Concurrency Healthcare. Solving data fragmentation and waiting room anxiety.
        </p>
        <div style={{ borderTop: '1px solid #334155', paddingTop: '2rem', fontSize: '0.9rem' }}>
          © {new Date().getFullYear()} ClinixFlow Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;