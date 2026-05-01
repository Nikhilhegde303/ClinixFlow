import React from 'react';
import styles from './LeadTabs.module.css';

const LeadTabs = ({ currentTab, onTabChange }) => {
  const tabs = ['ALL', 'PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED'];

  return (
    <div className={styles.tabsContainer}>
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`${styles.tabButton} ${currentTab === tab || (currentTab === '' && tab === 'ALL') ? styles.active : ''}`}
          onClick={() => onTabChange(tab === 'ALL' ? '' : tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default LeadTabs;