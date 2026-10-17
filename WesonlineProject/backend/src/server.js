import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { setupChatSocket } from './sockets/chatSocket.js';
import { connectDB } from './config/db.js';

import adminRoutes from './routes/adminRoute.js';
import groupRoutes from './routes/groupRoute.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Frontend URL used for CORS and Socket.IO.
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// API ROUTES
// ========================================

// Chat routes
app.use('/api/chat', chatRoutes);

// Authentication routes
// Includes forgot-password and reset-password.
app.use('/api/auth', authRoutes);

// Administrator routes
app.use('/api/admin', adminRoutes);

// Group Lead routes
app.use('/api/groups', groupRoutes);

// ========================================
// HOME ROUTE
// ========================================

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SLEEQORA Backend Active',
  });
});

// ========================================
// PASSWORD RESET ENDPOINT INFORMATION
// ========================================

// Optional diagnostic endpoint to verify the password-reset
// route configuration without sending an email or changing a password.
app.get('/api/auth/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SLEEQORA authentication API is active.',
    endpoints: {
      forgotPassword: 'POST /api/auth/forgot-password',
      resetPassword: 'POST /api/auth/reset-password/:token',
    },
  });
});

// ========================================
// SOCKET.IO CONFIGURATION
// ========================================

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Setup chat WebSockets
setupChatSocket(io);

// ========================================
// HANDLE UNKNOWN API ROUTES
// ========================================

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred.'
        : err.message || 'Internal server error',
    stack:
      process.env.NODE_ENV === 'production'   
        ? undefined
        : err.stack,
  });
});

// ======================================
// START SERVER
// ========================================

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log('===================================');
      console.log('SLEEQORA Backend Started');
      console.log('===================================');
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Frontend: ${FRONTEND_URL}`);
      console.log(`Admin API: http://localhost:${PORT}/api/admin`);
      console.log(`Group API: http://localhost:${PORT}/api/groups`);
      console.log(`Chat API: http://localhost:${PORT}/api/chat`);
      console.log(`Auth API: http://localhost:${PORT}/api/auth`);
      console.log(
        `Password Reset: http://localhost:${PORT}/api/auth/forgot-password`
      );
      console.log('===================================');
    });
  } catch (error) {
    console.error('Failed to start SLEEQORA server:', error);
    process.exit(1);
  }
};

startServer();