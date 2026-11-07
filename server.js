/**
 * ============================================================================
 * RESTAURANT TABLE RESERVATION MANAGEMENT SYSTEM
 * Backend Server Application
 * Tech Stack: Node.js, Express.js, MySQL (mysql2), bcryptjs, dotenv
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurable reservation duration (in minutes and seconds)
const RESERVATION_DURATION_MINUTES = 120; // 2 hours
const RESERVATION_DURATION_SECONDS = RESERVATION_DURATION_MINUTES * 60; // 7200 seconds

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection Pool Configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Shiva@2007',
  database: process.env.DB_NAME || 'restaurant_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Return DATE and TIME fields as formatted strings
});

// Test and verify database connectivity on startup
async function verifyDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL Database: restaurant_management (User: root)');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('👉 Please ensure MySQL is running on localhost and password is Shiva@2007');
  }
}
verifyDatabaseConnection();

// ============================================================================
// 1. DASHBOARD STATISTICS API
// ============================================================================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [[customersRow]] = await pool.query('SELECT COUNT(*) AS total FROM customers');
    const [[tablesRow]] = await pool.query('SELECT COUNT(*) AS total, SUM(CASE WHEN status = "Available" THEN 1 ELSE 0 END) AS available FROM tables');
    const [[reservationsRow]] = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
      FROM reservations
    `);

    res.status(200).json({
      success: true,
      stats: {
        totalCustomers: customersRow.total || 0,
        totalTables: tablesRow.total || 0,
        availableTables: tablesRow.available || 0,
        totalReservations: reservationsRow.total || 0,
        confirmedReservations: reservationsRow.confirmed || 0,
        cancelledReservations: reservationsRow.cancelled || 0
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics' });
  }
});

// ============================================================================
// 2. CUSTOMER APIs
// ============================================================================

// POST /api/customers - Register a new customer
app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Input Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check for duplicate email
    const [existing] = await pool.query('SELECT customer_id FROM customers WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A customer account with this email already exists.'
      });
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert customer record
    const [result] = await pool.query(
      'INSERT INTO customers (name, email, phone, password) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully!',
      customer: {
        customer_id: result.insertId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : ''
      }
    });
  } catch (error) {
    console.error('Customer Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server error during customer registration' });
  }
});

// GET /api/customers - Retrieve registered customers for staff management
app.get('/api/customers', async (req, res) => {
  try {
    const [customers] = await pool.query(`
      SELECT 
        c.customer_id, 
        c.name, 
        c.email, 
        c.phone,
        COUNT(r.reservation_id) AS total_reservations
      FROM customers c
      LEFT JOIN reservations r ON c.customer_id = r.customer_id
      GROUP BY c.customer_id
      ORDER BY c.customer_id ASC
    `);

    res.status(200).json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Get Customers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve customers list' });
  }
});

// ============================================================================
// 3. TABLE APIs
// ============================================================================

// GET /api/tables - Fetch all restaurant tables
app.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await pool.query(`
      SELECT table_id, table_number, seating_capacity, location, status 
      FROM tables 
      ORDER BY table_number ASC
    `);

    res.status(200).json({
      success: true,
      count: tables.length,
      tables
    });
  } catch (error) {
    console.error('Get Tables Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve tables' });
  }
});

// GET /api/tables/available - Fetch tables available for selected date, time, and guests
app.get('/api/tables/available', async (req, res) => {
  try {
    const { reservation_date, reservation_time, guests } = req.query;

    let query = `
      SELECT t.table_id, t.table_number, t.seating_capacity, t.location, t.status 
      FROM tables t
      WHERE t.status = 'Available'
    `;
    const params = [];

    // Filter by capacity if guests provided
    if (guests && parseInt(guests) > 0) {
      query += ` AND t.seating_capacity >= ?`;
      params.push(parseInt(guests));
    }

    // Overlap conflict check: table must not have confirmed booking within 2 hours
    if (reservation_date && reservation_time) {
      query += `
        AND t.table_id NOT IN (
          SELECT r.table_id 
          FROM reservations r
          WHERE r.reservation_date = ?
            AND r.status = 'Confirmed'
            AND ABS(TIME_TO_SEC(TIMEDIFF(r.reservation_time, ?))) < ?
        )
      `;
      params.push(reservation_date, reservation_time, RESERVATION_DURATION_SECONDS);
    }

    query += ` ORDER BY t.seating_capacity ASC, t.table_number ASC`;

    const [availableTables] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: availableTables.length,
      tables: availableTables
    });
  } catch (error) {
    console.error('Get Available Tables Error:', error);
    res.status(500).json({ success: false, message: 'Failed to check table availability' });
  }
});

// POST /api/tables - Add a new restaurant table
app.post('/api/tables', async (req, res) => {
  try {
    const { table_number, seating_capacity, location, status } = req.body;

    if (!table_number || !seating_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Table number and seating capacity are required.'
      });
    }

    const [existing] = await pool.query('SELECT table_id FROM tables WHERE table_number = ?', [table_number.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Table number '${table_number}' already exists.`
      });
    }

    const [result] = await pool.query(
      'INSERT INTO tables (table_number, seating_capacity, location, status) VALUES (?, ?, ?, ?)',
      [table_number.trim(), parseInt(seating_capacity), location ? location.trim() : 'Indoor', status || 'Available']
    );

    res.status(201).json({
      success: true,
      message: 'Restaurant table added successfully!',
      table_id: result.insertId
    });
  } catch (error) {
    console.error('Add Table Error:', error);
    res.status(500).json({ success: false, message: 'Server error while adding table' });
  }
});

// PUT /api/tables/:id - Update table information
app.put('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, seating_capacity, location, status } = req.body;

    if (!table_number || !seating_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Table number and seating capacity are required.'
      });
    }

    // Check duplicate table number on other tables
    const [existing] = await pool.query(
      'SELECT table_id FROM tables WHERE table_number = ? AND table_id != ?',
      [table_number.trim(), id]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Another table with number '${table_number}' already exists.`
      });
    }

    const [updateResult] = await pool.query(
      'UPDATE tables SET table_number = ?, seating_capacity = ?, location = ?, status = ? WHERE table_id = ?',
      [table_number.trim(), parseInt(seating_capacity), location ? location.trim() : '', status || 'Available', id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Table information updated successfully!'
    });
  } catch (error) {
    console.error('Update Table Error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating table' });
  }
});

// DELETE /api/tables/:id - Delete a table only when it has no associated reservation records
app.delete('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check for associated reservation records
    const [[resCount]] = await pool.query('SELECT COUNT(*) AS count FROM reservations WHERE table_id = ?', [id]);
    if (resCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this table because it has ${resCount.count} associated reservation record(s).`
      });
    }

    const [deleteResult] = await pool.query('DELETE FROM tables WHERE table_id = ?', [id]);
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Table deleted successfully!'
    });
  } catch (error) {
    console.error('Delete Table Error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting table' });
  }
});

// ============================================================================
// 4. RESERVATION APIs (WITH DATABASE TRANSACTIONS & 2-HOUR CONFLICT CHECK)
// ============================================================================

// POST /api/reservations - Create a new reservation using database transaction
app.post('/api/reservations', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { customer_id, table_id, reservation_date, reservation_time, guests } = req.body;

    // 1. Validation
    if (!customer_id || !table_id || !reservation_date || !reservation_time || !guests) {
      return res.status(400).json({
        success: false,
        message: 'customer_id, table_id, reservation_date, reservation_time, and guests are required.'
      });
    }

    const numGuests = parseInt(guests);
    if (isNaN(numGuests) || numGuests < 1) {
      return res.status(400).json({ success: false, message: 'Guests count must be at least 1.' });
    }

    // 2. Validate customer exists
    const [customerRows] = await connection.query('SELECT customer_id, name FROM customers WHERE customer_id = ?', [customer_id]);
    if (customerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found. Please register first.' });
    }

    // 3. Validate table exists & capacity
    const [tableRows] = await connection.query('SELECT table_id, table_number, seating_capacity, status FROM tables WHERE table_id = ?', [table_id]);
    if (tableRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }

    const selectedTable = tableRows[0];
    if (numGuests > selectedTable.seating_capacity) {
      return res.status(400).json({
        success: false,
        message: `Table ${selectedTable.table_number} can only seat up to ${selectedTable.seating_capacity} guests (requested ${numGuests}).`
      });
    }

    // 4. Check date is not in the past
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (reservation_date < todayStr) {
      return res.status(400).json({ success: false, message: 'Reservation date cannot be in the past.' });
    }

    // 5. Check overlapping confirmed reservations within 2 hours (7200 seconds)
    const [conflictRows] = await connection.query(`
      SELECT reservation_id, reservation_time 
      FROM reservations
      WHERE table_id = ?
        AND reservation_date = ?
        AND status = 'Confirmed'
        AND ABS(TIME_TO_SEC(TIMEDIFF(reservation_time, ?))) < ?
    `, [table_id, reservation_date, reservation_time, RESERVATION_DURATION_SECONDS]);

    if (conflictRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Conflict: Table ${selectedTable.table_number} already has a confirmed reservation at ${conflictRows[0].reservation_time.slice(0, 5)} (within the 2-hour dining window).`
      });
    }

    // 6. Execute insertion inside a Database Transaction
    await connection.beginTransaction();

    const [insertResult] = await connection.query(`
      INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guests, status)
      VALUES (?, ?, ?, ?, ?, 'Confirmed')
    `, [customer_id, table_id, reservation_date, reservation_time, numGuests]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Reservation confirmed for Table ${selectedTable.table_number}!`,
      reservation_id: insertResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create Reservation Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Server error while processing reservation transaction' });
  } finally {
    connection.release();
  }
});

// GET /api/reservations - Retrieve all reservations with SQL JOIN queries
app.get('/api/reservations', async (req, res) => {
  try {
    const { status, date } = req.query;

    let query = `
      SELECT 
        r.reservation_id,
        r.reservation_date,
        r.reservation_time,
        r.guests,
        r.status,
        c.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
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

    const [reservations] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: reservations.length,
      reservations
    });
  } catch (error) {
    console.error('Get Reservations Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve reservations' });
  }
});

// GET /api/reservations/:id - Retrieve individual reservation details
app.get('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT 
        r.reservation_id,
        r.reservation_date,
        r.reservation_time,
        r.guests,
        r.status,
        c.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        t.table_id,
        t.table_number,
        t.seating_capacity,
        t.location
      FROM reservations r
      JOIN customers c ON r.customer_id = c.customer_id
      JOIN tables t ON r.table_id = t.table_id
      WHERE r.reservation_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    res.status(200).json({
      success: true,
      reservation: rows[0]
    });
  } catch (error) {
    console.error('Get Single Reservation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reservation details' });
  }
});

// PUT /api/reservations/:id - Update reservation details with availability recheck
app.put('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { table_id, reservation_date, reservation_time, guests, status } = req.body;

    const [existingRows] = await pool.query('SELECT * FROM reservations WHERE reservation_id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const targetTableId = table_id || existingRows[0].table_id;
    const targetDate = reservation_date || existingRows[0].reservation_date;
    const targetTime = reservation_time || existingRows[0].reservation_time;
    const targetGuests = guests ? parseInt(guests) : existingRows[0].guests;
    const targetStatus = status || existingRows[0].status;

    // Check table capacity
    const [[tableRow]] = await pool.query('SELECT seating_capacity, table_number FROM tables WHERE table_id = ?', [targetTableId]);
    if (targetGuests > tableRow.seating_capacity) {
      return res.status(400).json({
        success: false,
        message: `Table ${tableRow.table_number} capacity (${tableRow.seating_capacity}) exceeded.`
      });
    }

    // Check availability conflict if updated to Confirmed
    if (targetStatus === 'Confirmed') {
      const [conflicts] = await pool.query(`
        SELECT reservation_id FROM reservations
        WHERE table_id = ?
          AND reservation_date = ?
          AND status = 'Confirmed'
          AND reservation_id != ?
          AND ABS(TIME_TO_SEC(TIMEDIFF(reservation_time, ?))) < ?
      `, [targetTableId, targetDate, id, targetTime, RESERVATION_DURATION_SECONDS]);

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Selected table and time slot conflicts with another confirmed reservation.'
        });
      }
    }

    await pool.query(`
      UPDATE reservations 
      SET table_id = ?, reservation_date = ?, reservation_time = ?, guests = ?, status = ?
      WHERE reservation_id = ?
    `, [targetTableId, targetDate, targetTime, targetGuests, targetStatus, id]);

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully!'
    });
  } catch (error) {
    console.error('Update Reservation Error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating reservation' });
  }
});

// PUT /api/reservations/:id/cancel - Cancel a reservation
app.put('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM reservations WHERE reservation_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }

    if (rows[0].status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Reservation is already cancelled.' });
    }

    await pool.query('UPDATE reservations SET status = "Cancelled" WHERE reservation_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: `Reservation #${id} has been cancelled successfully. Table is now available for other bookings.`
    });
  } catch (error) {
    console.error('Cancel Reservation Error:', error);
    res.status(500).json({ success: false, message: 'Server error while cancelling reservation' });
  }
});

// Fallback to index.html for root navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
  console.log('================================================================');
  console.log('🍽️  Restaurant Table Reservation Management System');
  console.log(`🚀  Server running at: http://localhost:${PORT}`);
  console.log(`📊  Database: restaurant_management on localhost:3306 (User: root)`);
  console.log('================================================================');
});
