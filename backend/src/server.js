import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import chatRoutes from './routes/chat.js';
import { ChatMessage } from './models/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_ticket', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
    console.log(`Socket ${socket.id} joined ticket_${ticketId}`);
  });

  socket.on('leave_ticket', (ticketId) => {
    socket.leave(`ticket_${ticketId}`);
    console.log(`Socket ${socket.id} left ticket_${ticketId}`);
  });

  socket.on('send_message', async (data) => {
    const { ticket_id, sender_type, sender_name, message, user_id } = data;

    try {
      const chatMessage = await ChatMessage.create({
        ticket_id,
        sender_type,
        sender_name,
        user_id,
        message,
      });

      // Broadcast to all clients in the ticket room
      io.to(`ticket_${ticket_id}`).emit('new_message', chatMessage);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export { io };
