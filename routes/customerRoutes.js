const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Public customer routes
router.post('/register', customerController.register);
router.post('/login', customerController.login);
router.post('/logout', customerController.logout);
router.get('/session', customerController.getSession);

module.exports = router;

