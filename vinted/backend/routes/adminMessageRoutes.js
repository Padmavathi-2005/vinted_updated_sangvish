import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
const router = express.Router();
import {
    getConversations,
    getAdminMessagesCount,
    getMessages,
    sendMessage,
    respondToRequest,
} from '../controllers/messageController.js';

// All admin message routes are protected
router.use(adminProtect);

router.get('/count', getAdminMessagesCount);
router.get('/conversations', getConversations);
router.get('/:id', getMessages);
router.post('/', sendMessage);
router.patch('/respond/:id', respondToRequest);

export default router;
