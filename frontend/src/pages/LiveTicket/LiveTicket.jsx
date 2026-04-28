import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import styles from './LiveTicket.module.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL, { autoConnect: false });

const LiveTicket = () => {
    const { hospitalId, doctorId, appointmentId } = useParams();

    const [myTicketNumber, setMyTicketNumber] = useState(null);
    const [currentServing, setCurrentServing] = useState(null);
    const [liveEta, setLiveEta] = useState(null);
    const [positionsAhead, setPositionsAhead] = useState(null);
    const [initialPositions, setInitialPositions] = useState(null);
    
    const [triageAlert, setTriageAlert] = useState(null); 
    const [queueMessage, setQueueMessage] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');

    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const response = await axios.get(`${SOCKET_URL}/api/v1/appointments/${appointmentId}`);
                
                // Now that the backend sends both, we can destructure them safely
                const { ticket, state } = response.data.data;

                if (ticket && ticket.token_number) {
                    setMyTicketNumber(ticket.token_number);
                    
                    if (state) {
                        setCurrentServing(state.current_token_calling);
                        const peopleAhead = ticket.token_number - state.current_token_calling;
                        setPositionsAhead(peopleAhead);
                        
                        setInitialPositions(peopleAhead > 0 ? peopleAhead : 0);

                        if (peopleAhead > 0) {
                            const waitTime = (peopleAhead * (state.active_ema_time + 2)) + (state.triage_penalty || 0);
                            setLiveEta(Math.round(waitTime));
                        } else {
                            setLiveEta(0);
                        }
                    }
                    socket.connect();
                }
            } catch (error) {
                console.error("Failed to load ticket:", error);
            }
        };

        fetchInitialState();

        socket.on('connect', () => {
            setConnectionStatus('Live');
            socket.emit('join_clinic_room', `room_dr_${doctorId}`);
        });

        socket.on('disconnect', () => {
            setConnectionStatus('Reconnecting...');
        });

        socket.on('queue_update', (data) => {
            setCurrentServing(data.currentTicket);

            setMyTicketNumber((currentMyTicket) => {
                if (currentMyTicket) {
                    const peopleAhead = currentMyTicket - data.currentTicket;
                    setPositionsAhead(peopleAhead);

                    if (peopleAhead > 0) {
                        const waitTime = (peopleAhead * (data.activeEMA + 2)) + (data.triagePenalty || 0);
                        setLiveEta(Math.round(waitTime));
                    } else {
                        setLiveEta(0);
                    }
                }
                return currentMyTicket;
            });
        });

        socket.on('emergency_alert', (data) => {
            setTriageAlert(`An emergency case was admitted. Your ETA has been adjusted by +${data.penalty} mins to allow the doctor to provide urgent care.`);
            setTimeout(() => setTriageAlert(null), 15000); 
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('queue_update');
            socket.off('emergency_alert');
            socket.disconnect();
        };
    }, [doctorId, appointmentId]); 

    useEffect(() => {
        if (positionsAhead === null) return;
        if (positionsAhead > 3) setQueueMessage(null);
        else if (positionsAhead === 3) setQueueMessage("Almost there! 3 patients ahead. Please head to the waiting area.");
        else if (positionsAhead === 2) setQueueMessage("You're up very soon. Please be seated near the consultation room.");
        else if (positionsAhead === 1) setQueueMessage("Next in line! Please stand by the doctor's door.");
        else if (positionsAhead === 0) setQueueMessage("It is your turn! Please proceed inside.");
    }, [positionsAhead]);

    const isMyTurn = positionsAhead === 0;

    const progressPercent = initialPositions > 0 
        ? Math.max(0, Math.min(100, ((initialPositions - positionsAhead) / initialPositions) * 100)) 
        : 100;

    return (
        <div className={styles.pageWrapper}>
            <nav className={styles.navbar}>
                <div className={styles.navBrand}>ClinixFlow</div>
                <div className={connectionStatus === 'Live' ? styles.badgeLive : styles.badgeReconnecting}>
                    <div className={styles.pulseDot}></div>
                    {connectionStatus}
                </div>
            </nav>

            <main className={styles.mainContent}>
                
                {triageAlert && (
                    <div className={styles.triageBanner}>
                        <span className={styles.triageIcon}>⚠️</span>
                        <p>{triageAlert}</p>
                    </div>
                )}

                {queueMessage && !triageAlert && (
                    <div className={isMyTurn ? styles.turnBanner : styles.countdownBanner}>
                        {queueMessage}
                    </div>
                )}

                <div className={`${styles.ticketCard} ${isMyTurn ? styles.ticketActive : ''}`}>
                    <div className={styles.cardTop}>
                        <span className={styles.overline}>Your Token</span>
                        <h1 className={styles.tokenNumber}>#{myTicketNumber || '--'}</h1>
                        
                        {!isMyTurn && positionsAhead !== null && (
                            <div className={styles.progressContainer}>
                                <div className={styles.progressHeader}>
                                    <span>Queue Progress</span>
                                    <span>{positionsAhead} ahead of you</span>
                                </div>
                                <div className={styles.track}>
                                    <div 
                                        className={styles.fill} 
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>Currently Serving</span>
                            {/* THE BUG FIX: Safely render 0 instead of converting it to a dash */}
                            <span className={styles.statValue}>#{currentServing !== null ? currentServing : '--'}</span>
                        </div>
                        <div className={styles.divider}></div>
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>Est. Wait Time</span>
                            <span className={`${styles.statValue} ${styles.etaValue}`}>
                                {isMyTurn ? '0' : (liveEta !== null ? liveEta : '--')} <small>mins</small>
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LiveTicket;