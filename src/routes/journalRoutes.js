const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/prompts', optionalAuth, (req, res, next) => journalController.getPrompts(req, res, next));
router.get('/', requireAuth, (req, res, next) => journalController.getAll(req, res, next));
router.post('/', requireAuth, (req, res, next) => journalController.create(req, res, next));
router.get('/:id', requireAuth, (req, res, next) => journalController.getById(req, res, next));
router.put('/:id', requireAuth, (req, res, next) => journalController.update(req, res, next));
router.delete('/:id', requireAuth, (req, res, next) => journalController.delete(req, res, next));

module.exports = router;
