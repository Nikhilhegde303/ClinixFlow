import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';

const PORT = process.env.PORT || 5000;

// 1. Create Raw HTTP Server
const server = http.createServer(app);

// 2. Initialize Socket.io Engine
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PATCH'],
        credentials: true
    }
});

// 3. Make 'io' accessible globally inside Express routes
app.set('io', io);

// 4. Basic Socket Connection Logic (The Network Layer)
io.on('connection', (socket) => {
    console.log(`🔌 [Socket] New client connected: ${socket.id}`);

    // We will add our Room joining logic here later

    socket.on('disconnect', () => {
        console.log(`🔌 [Socket] Client disconnected: ${socket.id}`);
    });
});

// 5. Start Server
server.listen(PORT, () => {
    console.log(`🚀 [Server] ClinixFlow Engine running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// 6. Graceful Shutdown (Interview ROI: Cloud resilience)
process.on('SIGTERM', () => {
    console.log('🛑 [Server] SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('✅ [Server] HTTP server closed securely');
        process.exit(0);
    });
});