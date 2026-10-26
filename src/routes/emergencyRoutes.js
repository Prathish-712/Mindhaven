const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/resources', optionalAuth, (req, res, next) => emergencyController.getResources(req, res, next));
router.get('/contacts', requireAuth, (req, res, next) => emergencyController.getContacts(req, res, next));
router.post('/contacts', requireAuth, (req, res, next) => emergencyController.addContact(req, res, next));
router.delete('/contacts/:id', requireAuth, (req, res, next) => emergencyController.deleteContact(req, res, next));

module.exports = router;
