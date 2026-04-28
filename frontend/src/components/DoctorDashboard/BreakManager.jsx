import React, { useState } from 'react';
import styles from './BreakManager.module.css';

const BreakManager = () => {
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [breakType, setBreakType] = useState('15'); // default 15 mins

    const handleToggleBreak = () => {
        if (isOnBreak) {
            // Call backend to resume queue
            setIsOnBreak(false);
        } else {
            // Call backend to pause queue & calculate ETA delay
            setIsOnBreak(true);
        }
    };

    return (
        <div className={styles.breakWidget}>
            {!isOnBreak ? (
                <>
                    <select value={breakType} onChange={(e) => setBreakType(e.target.value)} className={styles.breakSelect}>
                        <option value="15">Short Break (15m)</option>
                        <option value="30">Tea Break (30m)</option>
                        <option value="60">Lunch Break (1h)</option>
                    </select>
                    <button onClick={handleToggleBreak} className={styles.pauseBtn}>Pause Queue</button>
                </>
            ) : (
                <div className={styles.activeBreak}>
                    <span className={styles.pulsingDot}></span>
                    <span>Queue Paused</span>
                    <button onClick={handleToggleBreak} className={styles.resumeBtn}>Resume</button>
                </div>
            )}
        </div>
    );
};

export default BreakManager;