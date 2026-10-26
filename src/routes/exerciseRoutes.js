const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, (req, res, next) => exerciseController.getAll(req, res, next));
router.get('/stats', requireAuth, (req, res, next) => exerciseController.getStats(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => exerciseController.getById(req, res, next));
router.post('/:id/complete', requireAuth, (req, res, next) => exerciseController.complete(req, res, next));

module.exports = router;
