import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import departmentRoutes from './routes/departments.js';
import postRoutes from './routes/posts.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chat.js';
import { seedSuperAdmin, seedDepartments } from './seed.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS origin — set this on Render env vars
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://academia-connect-three.vercel.app';

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
    },
});

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

io.on('connection', (socket) => {
    // User comes online
    socket.on('user_online', (userId) => {
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        socket.userId = userId;
        // Broadcast online status
        io.emit('online_users', Array.from(onlineUsers.keys()));
    });

    // Send message — relay to receiver in real time
    socket.on('send_message', (message) => {
        const receiverSockets = onlineUsers.get(message.receiver);
        if (receiverSockets) {
            receiverSockets.forEach((socketId) => {
                io.to(socketId).emit('new_message', message);
            });
        }
    });

    // Typing indicator
    socket.on('typing', ({ senderId, receiverId }) => {
        const receiverSockets = onlineUsers.get(receiverId);
        if (receiverSockets) {
            receiverSockets.forEach((socketId) => {
                io.to(socketId).emit('user_typing', { senderId });
            });
        }
    });

    socket.on('stop_typing', ({ senderId, receiverId }) => {
        const receiverSockets = onlineUsers.get(receiverId);
        if (receiverSockets) {
            receiverSockets.forEach((socketId) => {
                io.to(socketId).emit('user_stop_typing', { senderId });
            });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (socket.userId && onlineUsers.has(socket.userId)) {
            onlineUsers.get(socket.userId).delete(socket.id);
            if (onlineUsers.get(socket.userId).size === 0) {
                onlineUsers.delete(socket.userId);
            }
            io.emit('online_users', Array.from(onlineUsers.keys()));
        }
    });
});

// Middleware
app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
}));
app.use(express.json());

// Health check — Render pings this to keep the service alive
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// Database connection
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/project-mayaa';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        // Ensure Super-Admin and Departments exist
        await seedSuperAdmin();
        await seedDepartments();

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
