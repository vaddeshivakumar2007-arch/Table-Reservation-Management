-- Restaurant Table Reservation Management System – Shiva
-- Database initialization script

CREATE DATABASE IF NOT EXISTS restaurant_reservation_system;
USE restaurant_reservation_system;

-- Table 1: customers
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: tables
CREATE TABLE IF NOT EXISTS tables (
    table_id INT PRIMARY KEY AUTO_INCREMENT,
    table_number VARCHAR(20) NOT NULL UNIQUE,
    seating_capacity INT NOT NULL,
    location VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Available'
);

-- Table 3: reservations
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

-- Insert Sample Tables
INSERT IGNORE INTO tables (table_id, table_number, seating_capacity, location, status) VALUES
(1, 'T-01', 2, 'Window View - Sunset Corner', 'Available'),
(2, 'T-02', 2, 'Romantic Candlelight Alcove', 'Available'),
(3, 'T-03', 4, 'Central Main Hall', 'Available'),
(4, 'T-04', 4, 'Garden Terrace', 'Available'),
(5, 'T-05', 6, 'Family Lounge Area', 'Available'),
(6, 'T-06', 6, 'Outdoor Poolside Deck', 'Available'),
(7, 'T-07', 8, 'VIP Royal Dining Room', 'Available'),
(8, 'T-08', 10, 'Executive Banquet Table', 'Available');

-- Insert Sample Customers (Password for all sample accounts is 'password123')
-- Bcrypt hash for 'password123': $2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG
INSERT IGNORE INTO customers (customer_id, name, email, phone, password) VALUES
(1, 'Shiva Developer', 'shiva@example.com', '9876543210', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG'),
(2, 'Aarav Sharma', 'aarav@example.com', '9812345678', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG'),
(3, 'Sneha Reddy', 'sneha@example.com', '9823456789', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG');

-- Insert Sample Reservations
INSERT IGNORE INTO reservations (reservation_id, customer_id, table_id, reservation_date, reservation_time, guests, status) VALUES
(1, 1, 3, CURDATE() + INTERVAL 1 DAY, '19:00:00', 4, 'Confirmed'),
(2, 2, 1, CURDATE() + INTERVAL 2 DAY, '20:30:00', 2, 'Pending'),
(3, 3, 5, CURDATE() + INTERVAL 3 DAY, '13:00:00', 5, 'Confirmed');

