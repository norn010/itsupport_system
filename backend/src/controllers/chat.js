import { ChatMessage, Ticket } from '../models/index.js';
import { sendLineNotification } from '../services/lineNotify.js';
import { sendMessageNotification } from '../services/email.js';

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

    if (!message || !sender_type) {
      return res.status(400).json({ message: 'Message and sender type are required' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const chatMessage = await ChatMessage.create({
      ticket_id: id,
      sender_type,
      sender_name: sender_name || (sender_type === 'staff' ? req.user?.full_name : 'User'),
      user_id: sender_type === 'staff' ? req.user?.id : null,
      message,
    });

    // Send notifications for user messages
    if (sender_type === 'user') {
      await sendLineNotification(ticket, 'message');
      await sendMessageNotification(ticket, message, sender_type);
    }

    res.status(201).json(chatMessage);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
