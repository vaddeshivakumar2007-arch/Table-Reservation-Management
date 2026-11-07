-- ============================================================================
-- Restaurant Table Reservation Management System
-- Database: restaurant_management
-- Database Architect & Full-Stack Implementation
-- ============================================================================

-- 1. Create and Use Database
CREATE DATABASE IF NOT EXISTS restaurant_management;
USE restaurant_management;

-- 2. Drop tables in reverse order of foreign key dependency if re-creating
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS tables;
DROP TABLE IF EXISTS customers;

-- 3. Table 1: customers
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table 2: tables
CREATE TABLE tables (
    table_id INT AUTO_INCREMENT PRIMARY KEY,
    table_number VARCHAR(20) NOT NULL UNIQUE,
    seating_capacity INT NOT NULL,
    location VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table 3: reservations
CREATE TABLE reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    table_id INT NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    guests INT NOT NULL,
    status VARCHAR(30) DEFAULT 'Confirmed',
    CONSTRAINT fk_reservation_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_reservation_table FOREIGN KEY (table_id) 
        REFERENCES tables(table_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SAMPLE DATA (SEED RECORDS)
-- ============================================================================

-- A. Sample Indian Customers (Hashed password is 'password123')
-- Bcrypt Hash: $2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG
INSERT INTO customers (customer_id, name, email, phone, password) VALUES
(1, 'Rohith Sharma', 'rohith.sharma@example.com', '9876543210', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG'),
(2, 'Priya Patel', 'priya.patel@example.com', '9823456781', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG'),
(3, 'Suresh Reddy', 'suresh.reddy@example.com', '9834567892', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG'),
(4, 'Ananya Verma', 'ananya.verma@example.com', '9845678903', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG'),
(5, 'Rahul Kumar', 'rahul.kumar@example.com', '9856789014', '$2b$10$wO9wKkV4z60Z5aJ8jFmDvepU7t7c9F03g/qCevYhE4gT/iKevh1aG');

-- B. Sample Restaurant Tables (8 tables across indoor, outdoor, window, VIP zones)
INSERT INTO tables (table_id, table_number, seating_capacity, location, status) VALUES
(1, 'T01', 2, 'Indoor', 'Available'),
(2, 'T02', 2, 'Outdoor', 'Available'),
(3, 'T03', 4, 'Indoor', 'Available'),
(4, 'T04', 4, 'Window Side', 'Available'),
(5, 'T05', 6, 'Family Section', 'Available'),
(6, 'T06', 8, 'VIP Section', 'Available'),
(7, 'T07', 4, 'Outdoor', 'Available'),
(8, 'T08', 6, 'Indoor', 'Available');

-- C. Sample Reservations (Valid dates and times, capacity respected, Confirmed & Cancelled)
INSERT INTO reservations (reservation_id, customer_id, table_id, reservation_date, reservation_time, guests, status) VALUES
(1, 1, 1, CURDATE() + INTERVAL 1 DAY, '19:00:00', 2, 'Confirmed'),
(2, 2, 3, CURDATE() + INTERVAL 2 DAY, '20:00:00', 4, 'Confirmed'),
(3, 3, 2, CURDATE() + INTERVAL 3 DAY, '13:00:00', 2, 'Cancelled');
