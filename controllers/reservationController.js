const db = require('../config/db');

// Duration of dining slot in seconds (2 hours = 7200 seconds)
const SLOT_DURATION_SECONDS = 7200;

// Get Available Tables (with optional filters: date, time, guests)
const getAvailableTables = async (req, res) => {
  try {
    const { date, time, guests } = req.query;

    let query = `
      SELECT t.table_id, t.table_number, t.seating_capacity, t.location, t.status
      FROM tables t
      WHERE t.status = 'Available'
    `;
    const params = [];

    // Filter by seating capacity if guests provided
    if (guests && parseInt(guests) > 0) {
      query += ` AND t.seating_capacity >= ?`;
      params.push(parseInt(guests));
    }

    // Filter by overlapping reservations if date and time are provided
    if (date && time) {
      query += `
        AND t.table_id NOT IN (
          SELECT r.table_id
          FROM reservations r
          WHERE r.reservation_date = ?
            AND r.status IN ('Pending', 'Confirmed')
            AND ABS(TIME_TO_SEC(TIMEDIFF(r.reservation_time, ?))) < ?
        )
      `;
      params.push(date, time, SLOT_DURATION_SECONDS);
    }

    query += ` ORDER BY t.seating_capacity ASC, t.table_number ASC`;

    const [tables] = await db.query(query, params);

    return res.json({
      success: true,
      count: tables.length,
      tables
    });
  } catch (error) {
    console.error('Get Available Tables Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve available tables.'
    });
  }
};

// Create a New Table Reservation
const createReservation = async (req, res) => {
  try {
    const customerId = req.session.customer.id;
    const { table_id, reservation_date, reservation_time, guests } = req.body;

    // 1. Validation of required inputs
    if (!table_id || !reservation_date || !reservation_time || !guests) {
      return res.status(400).json({
        success: false,
        message: 'All fields (table, date, time, and guests count) are required.'
      });
    }

    const numGuests = parseInt(guests);
    if (isNaN(numGuests) || numGuests < 1) {
      return res.status(400).json({
        success: false,
        message: 'Number of guests must be at least 1.'
      });
    }

    // 2. Validate future date and time
    const today = new Date();
    const reqDate = new Date(`${reservation_date}T${reservation_time}`);
    const now = new Date();

    // Check if the requested date is strictly today or in future
    const inputDateOnly = new Date(reservation_date + 'T00:00:00');
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (inputDateOnly < todayOnly) {
      return res.status(400).json({
        success: false,
        message: 'Reservation date cannot be in the past.'
      });
    }

    if (reqDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Reservation time has already passed for today. Please select a future time.'
      });
    }

    // 3. Verify Table existence & capacity
    const [tableRows] = await db.query('SELECT * FROM tables WHERE table_id = ?', [table_id]);
    if (tableRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Selected table does not exist.'
      });
    }

    const selectedTable = tableRows[0];
    if (selectedTable.status !== 'Available') {
      return res.status(400).json({
        success: false,
        message: `Table ${selectedTable.table_number} is currently marked as ${selectedTable.status}. Please select another table.`
      });
    }

    if (numGuests > selectedTable.seating_capacity) {
      return res.status(400).json({
        success: false,
        message: `Table ${selectedTable.table_number} seats a maximum of ${selectedTable.seating_capacity} guests. You requested for ${numGuests} guests.`
      });
    }

    // 4. Overlap Check for the same table
    const [overlapRows] = await db.query(`
      SELECT reservation_id, reservation_time, status
      FROM reservations
      WHERE table_id = ?
        AND reservation_date = ?
        AND status IN ('Pending', 'Confirmed')
        AND ABS(TIME_TO_SEC(TIMEDIFF(reservation_time, ?))) < ?
    `, [table_id, reservation_date, reservation_time, SLOT_DURATION_SECONDS]);

    if (overlapRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Table ${selectedTable.table_number} is already booked around this time (${overlapRows[0].reservation_time.slice(0, 5)}). Please select another time slot or table.`
      });
    }

    // 5. Insert Reservation
    const [insertResult] = await db.query(`
      INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guests, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `, [customerId, table_id, reservation_date, reservation_time, numGuests]);

    return res.status(201).json({
      success: true,
      message: `Reservation requested successfully! Your booking is currently 'Pending' confirmation by our team.`,
      reservationId: insertResult.insertId
    });
  } catch (error) {
    console.error('Create Reservation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing your reservation.'
    });
  }
};

// Get Customer's Personal Reservation History
const getCustomerReservations = async (req, res) => {
  try {
    const customerId = req.session.customer.id;

    const [rows] = await db.query(`
      SELECT 
        r.reservation_id,
        r.reservation_date,
        r.reservation_time,
        r.guests,
        r.status,
        r.created_at,
        t.table_id,
        t.table_number,
        t.seating_capacity,
        t.location
      FROM reservations r
      JOIN tables t ON r.table_id = t.table_id
      WHERE r.customer_id = ?
      ORDER BY r.reservation_date DESC, r.reservation_time DESC
    `, [customerId]);

    return res.json({
      success: true,
      reservations: rows
    });
  } catch (error) {
    console.error('Get Customer Reservations Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reservation history.'
    });
  }
};

// Customer Cancels Their Own Reservation
const cancelReservation = async (req, res) => {
  try {
    const customerId = req.session.customer.id;
    const { id } = req.params;

    const [rows] = await db.query(`
      SELECT * FROM reservations
      WHERE reservation_id = ? AND customer_id = ?
    `, [id, customerId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or unauthorized.'
      });
    }

    const reservation = rows[0];

    if (reservation.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Reservation is already cancelled.'
      });
    }

    if (reservation.status === 'Rejected') {
      return res.status(400).json({
        success: false,
        message: 'Reservation has already been rejected.'
      });
    }

    await db.query(`
      UPDATE reservations
      SET status = 'Cancelled'
      WHERE reservation_id = ?
    `, [id]);

    return res.json({
      success: true,
      message: 'Reservation has been successfully cancelled.'
    });
  } catch (error) {
    console.error('Cancel Reservation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel reservation.'
    });
  }
};

module.exports = {
  getAvailableTables,
  createReservation,
  getCustomerReservations,
  cancelReservation
};
