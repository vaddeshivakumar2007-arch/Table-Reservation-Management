const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Shiva@2007',
  database: process.env.DB_NAME || 'restaurant_reservation_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Return date as YYYY-MM-DD string instead of JS Date object
});

// Initialize database schema and default records if not present
async function initializeDatabase() {
  try {
    // 1. Initial connection without database to ensure database exists
    const adminConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Shiva@2007'
    });

    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'restaurant_reservation_system'}\`;`);
    await adminConn.end();

    // 2. Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(15),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tables (
        table_id INT PRIMARY KEY AUTO_INCREMENT,
        table_number VARCHAR(20) NOT NULL UNIQUE,
        seating_capacity INT NOT NULL,
        location VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Available'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        reservation_id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        table_id INT NOT NULL,
        reservation_date DATE NOT NULL,
        reservation_time TIME NOT NULL,
        guests INT NOT NULL,
        status VARCHAR(30) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
        FOREIGN KEY (table_id) REFERENCES tables(table_id) ON DELETE CASCADE
      );
    `);

    // 3. Seed default tables if empty
    const [tableCount] = await pool.query('SELECT COUNT(*) as cnt FROM tables');
    if (tableCount[0].cnt === 0) {
      await pool.query(`
        INSERT INTO tables (table_number, seating_capacity, location, status) VALUES
        ('T-01', 2, 'Window View - Sunset Corner', 'Available'),
        ('T-02', 2, 'Romantic Candlelight Alcove', 'Available'),
        ('T-03', 4, 'Central Main Hall', 'Available'),
        ('T-04', 4, 'Garden Terrace', 'Available'),
        ('T-05', 6, 'Family Lounge Area', 'Available'),
        ('T-06', 6, 'Outdoor Poolside Deck', 'Available'),
        ('T-07', 8, 'VIP Royal Dining Room', 'Available'),
        ('T-08', 10, 'Executive Banquet Table', 'Available');
      `);
      console.log('✅ Initial restaurant tables seeded successfully.');
    }

    // 4. Seed default customer if empty
    const [customerCount] = await pool.query('SELECT COUNT(*) as cnt FROM customers');
    if (customerCount[0].cnt === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await pool.query(`
        INSERT INTO customers (name, email, phone, password) VALUES
        ('Shiva Developer', 'shiva@example.com', '9876543210', ?),
        ('Aarav Sharma', 'aarav@example.com', '9812345678', ?),
        ('Sneha Reddy', 'sneha@example.com', '9823456789', ?);
      `, [hashedPassword, hashedPassword, hashedPassword]);
      console.log('✅ Initial customers seeded successfully.');

      // Seed reservations
      await pool.query(`
        INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guests, status) VALUES
        (1, 3, CURDATE() + INTERVAL 1 DAY, '19:00:00', 4, 'Confirmed'),
        (2, 1, CURDATE() + INTERVAL 2 DAY, '20:30:00', 2, 'Pending'),
        (3, 5, CURDATE() + INTERVAL 3 DAY, '13:00:00', 5, 'Confirmed');
      `);
      console.log('✅ Initial reservations seeded successfully.');
    }

    console.log('✅ MySQL Database connected & schema verified.');
  } catch (error) {
    console.error('❌ Database Initialization Error:', error.message);
  }
}

// Automatically initialize schema
initializeDatabase();

module.exports = pool;

