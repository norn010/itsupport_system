import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  getITStaff,
  getStats,
} from '../controllers/tickets.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
});

const router = Router();

// Public routes
router.post('/', upload.array('images', 5), createTicket);
router.get('/search/:id', getTicketById);

// Protected routes
router.get('/', authenticate, requireRole('IT', 'MANAGER'), getTickets);
router.get('/stats/dashboard', authenticate, requireRole('MANAGER'), getStats);
router.get('/staff/it', authenticate, requireRole('IT', 'MANAGER'), getITStaff);
router.get('/:id', authenticate, requireRole('IT', 'MANAGER'), getTicketById);
router.patch('/:id', authenticate, requireRole('IT', 'MANAGER'), updateTicket);

export default router;
