const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminAuthenticated } = require('../middleware/auth');

// Admin Auth
router.post('/login', adminController.login);
router.post('/logout', adminController.logout);
router.get('/session', adminController.getSession);

// Protected Admin Stats
router.get('/stats', isAdminAuthenticated, adminController.getDashboardStats);

// Protected Table Management
router.get('/tables', isAdminAuthenticated, adminController.getAllTables);
router.post('/tables', isAdminAuthenticated, adminController.addTable);
router.put('/tables/:id', isAdminAuthenticated, adminController.updateTable);
router.delete('/tables/:id', isAdminAuthenticated, adminController.deleteTable);

// Protected Reservation Management
router.get('/reservations', isAdminAuthenticated, adminController.getAllReservations);
router.put('/reservations/:id/status', isAdminAuthenticated, adminController.updateReservationStatus);
router.put('/reservations/:id/approve', isAdminAuthenticated, adminController.approveReservation);
router.put('/reservations/:id/reject', isAdminAuthenticated, adminController.rejectReservation);

// Protected Customer Management
router.get('/customers', isAdminAuthenticated, adminController.getAllCustomers);
router.delete('/customers/:id', isAdminAuthenticated, adminController.deleteCustomer);

module.exports = router;

