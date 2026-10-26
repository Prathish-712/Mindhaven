const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/messages', (req, res, next) => chatController.getMessages(req, res, next));
router.post('/send', (req, res, next) => chatController.sendMessage(req, res, next));
router.delete('/messages', (req, res, next) => chatController.clearMessages(req, res, next));

module.exports = router;
