import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();
import {
    getConversations,
    getMessages,
    sendMessage,
    respondToRequest,
    toggleBlock,
    respondToOffer
} from '../controllers/messageController.js';

router.use(protect);

router.get('/conversations', getConversations);
router.get('/:id', getMessages);
router.post('/', sendMessage);
router.patch('/respond/:id', respondToRequest);
router.patch('/block/:id', toggleBlock);
router.patch('/offer/:id', respondToOffer);

export default router;
