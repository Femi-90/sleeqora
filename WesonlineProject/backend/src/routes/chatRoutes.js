import express from 'express';

import {
  sendMessage,
  getMessages,
} from '../controllers/chatController.js';

const router = express.Router();

// Retrieve chat messages.
router.get('/', getMessages);

// Send a new chat message.
router.post('/', sendMessage);

export default router;