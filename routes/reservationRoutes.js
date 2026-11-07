const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { isCustomerAuthenticated } = require('../middleware/auth');

// Available tables query (can be checked publicly or logged in)
router.get('/available-tables', reservationController.getAvailableTables);

// Customer reservation operations (requires customer authentication)
router.post('/book', isCustomerAuthenticated, reservationController.createReservation);
router.get('/my-reservations', isCustomerAuthenticated, reservationController.getCustomerReservations);
router.put('/cancel/:id', isCustomerAuthenticated, reservationController.cancelReservation);

module.exports = router;

