const express = require('express');
const router = express.Router();
const moodController = require('../controllers/moodController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/logs', (req, res, next) => moodController.getLogs(req, res, next));
router.post('/logs', (req, res, next) => moodController.logMood(req, res, next));
router.get('/analytics', (req, res, next) => moodController.getAnalytics(req, res, next));
router.delete('/logs/:id', (req, res, next) => moodController.deleteLog(req, res, next));

module.exports = router;
