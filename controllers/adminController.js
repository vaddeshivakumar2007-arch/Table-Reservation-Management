const db = require('../config/db');

// Admin Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurant.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email === adminEmail && password === adminPassword) {
      req.session.admin = {
        email: adminEmail,
        role: 'Administrator'
      };
      return res.json({
        success: true,
        message: 'Admin authentication successful! Welcome to the Management Portal.',
        admin: req.session.admin
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid administrative credentials.'
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during admin authentication.'
    });
  }
};

// Admin Logout
const logout = (req, res) => {
  req.session.admin = null;
  return res.json({
    success: true,
    message: 'Admin logged out successfully.'
  });
};

// Admin Session Check
const getSession = (req, res) => {
  if (req.session && req.session.admin) {
    return res.json({
      authenticated: true,
      admin: req.session.admin
    });
  }
  return res.json({
    authenticated: false
  });
};

// Get Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const [[customerStats]] = await db.query('SELECT COUNT(*) as totalCustomers FROM customers');
    const [[tableStats]] = await db.query('SELECT COUNT(*) as totalTables, SUM(CASE WHEN status = "Available" THEN 1 ELSE 0 END) as availableTables FROM tables');
    const [[reservationStats]] = await db.query(`
      SELECT 
        COUNT(*) as totalReservations,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingReservations,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) as confirmedReservations,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledReservations,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejectedReservations
      FROM reservations
    `);

    // Fetch 5 most recent reservations
    const [recentReservations] = await db.query(`
      SELECT 
        r.reservation_id,
        r.reservation_date,
        r.reservation_time,
        r.guests,
        r.status,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        t.table_number,
        t.location
      FROM reservations r
      JOIN customers c ON r.customer_id = c.customer_id
      JOIN tables t ON r.table_id = t.table_id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      stats: {
        totalCustomers: customerStats.totalCustomers || 0,
        totalTables: tableStats.totalTables || 0,
        availableTables: tableStats.availableTables || 0,
        totalReservations: reservationStats.totalReservations || 0,
        pendingReservations: reservationStats.pendingReservations || 0,
        confirmedReservations: reservationStats.confirmedReservations || 0,
        cancelledReservations: reservationStats.cancelledReservations || 0,
        rejectedReservations: reservationStats.rejectedReservations || 0
      },
      recentReservations
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve administrative statistics.'
    });
  }
};

// --- TABLE MANAGEMENT ---

// Get all tables
const getAllTables = async (req, res) => {
  try {
    const [tables] = await db.query(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM reservations r 
         WHERE r.table_id = t.table_id AND r.status IN ('Pending', 'Confirmed') AND r.reservation_date >= CURDATE()) as active_bookings
      FROM tables t
      ORDER BY t.table_number ASC
    `);
    return res.json({ success: true, tables });
  } catch (error) {
    console.error('Admin Get Tables Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tables.' });
  }
};

// Add new table
const addTable = async (req, res) => {
  try {
    const { table_number, seating_capacity, location, status } = req.body;

    if (!table_number || !seating_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Table number and seating capacity are required.'
      });
    }

    const [existing] = await db.query('SELECT table_id FROM tables WHERE table_number = ?', [table_number.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Table number '${table_number}' already exists.`
      });
    }

    const [result] = await db.query(
      'INSERT INTO tables (table_number, seating_capacity, location, status) VALUES (?, ?, ?, ?)',
      [table_number.trim(), parseInt(seating_capacity), location ? location.trim() : 'Main Dining Area', status || 'Available']
    );

    return res.status(201).json({
      success: true,
      message: 'New restaurant table added successfully.',
      tableId: result.insertId
    });
  } catch (error) {
    console.error('Admin Add Table Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add table.' });
  }
};

// Update table
const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, seating_capacity, location, status } = req.body;

    if (!table_number || !seating_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Table number and seating capacity are required.'
      });
    }

    // Check if another table has the same number
    const [existing] = await db.query('SELECT table_id FROM tables WHERE table_number = ? AND table_id != ?', [table_number.trim(), id]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Another table with number '${table_number}' already exists.`
      });
    }

    await db.query(
      'UPDATE tables SET table_number = ?, seating_capacity = ?, location = ?, status = ? WHERE table_id = ?',
      [table_number.trim(), parseInt(seating_capacity), location ? location.trim() : '', status || 'Available', id]
    );

    return res.json({
      success: true,
      message: 'Restaurant table details updated successfully.'
    });
  } catch (error) {
    console.error('Admin Update Table Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update table details.' });
  }
};

// Delete table
const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional check for pending/confirmed reservations
    const [activeBookings] = await db.query(
      `SELECT COUNT(*) as cnt FROM reservations WHERE table_id = ? AND status IN ('Pending', 'Confirmed') AND reservation_date >= CURDATE()`,
      [id]
    );

    if (activeBookings[0].cnt > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete this table because it has active upcoming reservations. Please reschedule or cancel those bookings first.'
      });
    }

    await db.query('DELETE FROM tables WHERE table_id = ?', [id]);

    return res.json({
      success: true,
      message: 'Restaurant table removed successfully.'
    });
  } catch (error) {
    console.error('Admin Delete Table Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete table.' });
  }
};

// --- RESERVATION MANAGEMENT ---

// Get all reservations with filters
const getAllReservations = async (req, res) => {
  try {
    const { status, date } = req.query;

    let query = `
      SELECT 
        r.reservation_id,
        r.reservation_date,
        r.reservation_time,
        r.guests,
        r.status,
        r.created_at,
        c.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        t.table_id,
        t.table_number,
        t.seating_capacity,
        t.location
      FROM reservations r
      JOIN customers c ON r.customer_id = c.customer_id
      JOIN tables t ON r.table_id = t.table_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND r.reservation_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY r.reservation_date DESC, r.reservation_time DESC`;

    const [reservations] = await db.query(query, params);
    return res.json({ success: true, count: reservations.length, reservations });
  } catch (error) {
    console.error('Admin Get Reservations Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reservations.' });
  }
};

// Update reservation status (Approved/Confirmed, Rejected, Cancelled, Completed)
const updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Rejected', 'Cancelled', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    await db.query('UPDATE reservations SET status = ? WHERE reservation_id = ?', [status, id]);

    return res.json({
      success: true,
      message: `Reservation status updated to '${status}'.`
    });
  } catch (error) {
    console.error('Admin Update Reservation Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update reservation status.' });
  }
};

// Approve reservation shortcut
const approveReservation = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE reservations SET status = 'Confirmed' WHERE reservation_id = ?", [id]);
    return res.json({ success: true, message: 'Reservation has been confirmed successfully.' });
  } catch (error) {
    console.error('Approve Reservation Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve reservation.' });
  }
};

// Reject reservation shortcut
const rejectReservation = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE reservations SET status = 'Rejected' WHERE reservation_id = ?", [id]);
    return res.json({ success: true, message: 'Reservation has been rejected.' });
  } catch (error) {
    console.error('Reject Reservation Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject reservation.' });
  }
};

// --- CUSTOMER MANAGEMENT ---

// Get all registered customers
const getAllCustomers = async (req, res) => {
  try {
    const [customers] = await db.query(`
      SELECT 
        c.customer_id,
        c.name,
        c.email,
        c.phone,
        c.created_at,
        COUNT(r.reservation_id) as total_reservations,
        SUM(CASE WHEN r.status = 'Confirmed' THEN 1 ELSE 0 END) as confirmed_reservations
      FROM customers c
      LEFT JOIN reservations r ON c.customer_id = r.customer_id
      GROUP BY c.customer_id
      ORDER BY c.customer_id DESC
    `);
    return res.json({ success: true, customers });
  } catch (error) {
    console.error('Admin Get Customers Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customers.' });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM customers WHERE customer_id = ?', [id]);
    return res.json({ success: true, message: 'Customer record and associated reservations deleted.' });
  } catch (error) {
    console.error('Admin Delete Customer Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete customer record.' });
  }
};

module.exports = {
  login,
  logout,
  getSession,
  getDashboardStats,
  getAllTables,
  addTable,
  updateTable,
  deleteTable,
  getAllReservations,
  updateReservationStatus,
  approveReservation,
  rejectReservation,
  getAllCustomers,
  deleteCustomer
};

