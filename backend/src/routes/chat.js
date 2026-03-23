import { Router } from 'express';
import { getMessages, createMessage } from '../controllers/chat.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/:id/messages', authenticate, requireRole('IT', 'MANAGER'), getMessages);
router.post('/:id/messages', createMessage);

export default router;
