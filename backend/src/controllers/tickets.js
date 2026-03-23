import { Ticket, TicketImage, ChatMessage, User } from '../models/index.js';
import { sendTicketNotification, sendMessageNotification } from '../services/email.js';
import { sendLineNotification } from '../services/lineNotify.js';

const generateTicketId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `TICK-${dateStr}-${random}`;
};

export const createTicket = async (req, res) => {
  try {
    const { name, department, issue_title, description, priority } = req.body;

    if (!name || !issue_title || !priority) {
      return res.status(400).json({ message: 'Name, issue title, and priority are required' });
    }

    const ticket_id = generateTicketId();
    const ticket = await Ticket.create({
      ticket_id,
      name,
      department,
      issue_title,
      description,
      priority,
    });

    // Save images if uploaded
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await TicketImage.create(ticket.id, `/uploads/${file.filename}`);
      }
    }

    // Send notifications
    await sendTicketNotification(ticket, 'created');
    await sendLineNotification(ticket, 'created');

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: {
        ...ticket,
        images: req.files ? req.files.map(f => `/uploads/${f.filename}`) : [],
      },
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTickets = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const tickets = await Ticket.findAll({
      status,
      priority,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByTicketId(id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const images = await TicketImage.findByTicketId(ticket.id);
    const messages = await ChatMessage.findByTicketId(ticket.id);

    res.json({
      ...ticket,
      images: images.map(img => img.file_path),
      messages,
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, priority } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;
    if (priority) updates.priority = priority;

    if (status === 'Resolved' || status === 'Closed') {
      updates.resolved_at = new Date();
    }

    const updatedTicket = await Ticket.update(id, updates);

    // Send notifications
    await sendTicketNotification(updatedTicket, 'updated');

    res.json({
      message: 'Ticket updated successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getITStaff = async (req, res) => {
  try {
    const staff = await User.findAllITStaff();
    res.json(staff);
  } catch (error) {
    console.error('Get IT staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await Ticket.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
