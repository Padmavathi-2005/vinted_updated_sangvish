import express from 'express';
const router = express.Router();
import { chatWithAI } from '../controllers/aiController.js';

router.post('/chat', chatWithAI);

export default router;
