import { ChatMessage, Ticket } from '../models/index.js';
import { sendLineNotification } from '../services/lineNotify.js';
import { sendDiscordNotification } from '../services/discordNotify.js';
import { sendMessageNotification } from '../services/email.js';
import { createSystemNotification, notifyAllITStaff } from './notifications.js';
import { io } from '../server.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup multer for chat attachments
const uploadDir = 'uploads/chat';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `chat-${Date.now()}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images are allowed'));
  }
});

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const messages = await ChatMessage.findByTicketId(id);
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, sender_type, sender_name } = req.body;
    const file = req.file;

    if (!message && !file) {
      return res.status(400).json({ message: 'Message or file is required' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const filePath = file ? `/uploads/chat/${file.filename}` : null;

    const chatMessage = await ChatMessage.create({
      ticket_id: id,
      sender_type,
      sender_name: sender_name || (sender_type === 'staff' ? req.user?.full_name : 'User'),
      user_id: sender_type === 'staff' ? req.user?.id : null,
      message,
      file_path: filePath,
    });

    // Send notifications for user messages
    if (sender_type === 'user') {
      await sendLineNotification(ticket, 'message');
      await sendDiscordNotification(ticket, 'message', message || 'Sent an image', filePath);
      await sendMessageNotification(ticket, message || 'Sent an image', sender_type);
      
      const notifMsg = `${ticket.name} sent a new message in ${ticket.ticket_id}`;
      // Notify assigned staff or all IT staff
      if (ticket.assigned_to) {
        await createSystemNotification(ticket.assigned_to, 'new_message', 'New Message', notifMsg, ticket.ticket_id);
      } else {
        await notifyAllITStaff('new_message', 'New Message (Unassigned)', notifMsg, ticket.ticket_id);
      }
    }

    // Emit socket event for real-time update
    io.to(`ticket_${id}`).emit('new_message', chatMessage);

    res.status(201).json(chatMessage);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
