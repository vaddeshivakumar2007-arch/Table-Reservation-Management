const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Customer Registration
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validation
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

    // Check if email already exists
    const [existing] = await db.query('SELECT customer_id FROM customers WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert customer
    const [result] = await db.query(
      'INSERT INTO customers (name, email, phone, password) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, hashedPassword]
    );

    // Set session automatically
    req.session.customer = {
      id: result.insertId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : ''
    };

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Shiva Restaurant.',
      customer: req.session.customer
    });
  } catch (error) {
    console.error('Customer Register Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing registration.'
    });
  }
};

// Customer Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const [rows] = await db.query('SELECT * FROM customers WHERE email = ?', [email.trim().toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const customer = rows[0];
    const isPasswordMatch = await bcrypt.compare(password, customer.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Create session
    req.session.customer = {
      id: customer.customer_id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || ''
    };

    return res.json({
      success: true,
      message: `Welcome back, ${customer.name}!`,
      customer: req.session.customer
    });
  } catch (error) {
    console.error('Customer Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while logging in.'
    });
  }
};

// Customer Logout
const logout = (req, res) => {
  req.session.customer = null;
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Successfully logged out.' });
  });
};

// Get current session status & profile details
const getSession = async (req, res) => {
  if (req.session && req.session.customer) {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as totalReservations,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingCount,
          SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) as confirmedCount,
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledCount
        FROM reservations 
        WHERE customer_id = ?
      `, [req.session.customer.id]);

      return res.json({
        authenticated: true,
        customer: req.session.customer,
        stats: stats[0] || { totalReservations: 0, pendingCount: 0, confirmedCount: 0, cancelledCount: 0 }
      });
    } catch (err) {
      return res.json({
        authenticated: true,
        customer: req.session.customer,
        stats: { totalReservations: 0, pendingCount: 0, confirmedCount: 0, cancelledCount: 0 }
      });
    }
  }
  return res.json({
    authenticated: false
  });
};

module.exports = {
  register,
  login,
  logout,
  getSession
};

