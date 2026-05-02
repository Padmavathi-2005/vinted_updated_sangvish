import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
const router = express.Router();
import {
    getConversations,
    getMessages,
    sendMessage,
    getMessageCount
} from '../controllers/messageController.js';

router.use(adminProtect);

router.get('/conversations', getConversations);
router.get('/count', getMessageCount);
router.get('/:id', getMessages);
router.post('/', sendMessage);

export default router;
