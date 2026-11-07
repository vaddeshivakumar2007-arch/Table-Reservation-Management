# Restaurant Table Reservation Management System

A complete, fully functional, production-ready Full-Stack Web Application developed for a B.Tech Computer Science & Engineering Mini-Project.

Built from scratch using **Node.js**, **Express.js**, **MySQL** (`mysql2`), **HTML5**, **CSS3**, and **Vanilla JavaScript** (Fetch API).

---

## 1. Technical Stack

* **Backend:** Node.js & Express.js
* **Database Driver:** `mysql2` (with connection pooling & promises)
* **Database Engine:** MySQL 8.0+
* **Security:** `bcryptjs` (salt rounds: 10) for customer password encryption
* **Environment:** `dotenv` for configuration
* **Frontend:** HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES6+), Font Awesome 6 Icons
* **Strict Architecture:** Complete separation of concerns:
  * Backend in `server.js`
  * Database schema and seed data in `schema.sql`
  * Frontend in `public/index.html`, `public/style.css`, and `public/app.js`

---

## 2. Database Design & Architecture

* **Database Name:** `restaurant_management`
* **Host:** `localhost` | **Port:** `3306`
* **User:** `root` | **Password:** `Shiva@2007`

### Table 1: `customers`
Stores registered dining customers with encrypted passwords.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `customer_id` | INT | AUTO_INCREMENT, PRIMARY KEY | Unique customer ID |
| `name` | VARCHAR(100) | NOT NULL | Customer's full name |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | Unique email address |
| `phone` | VARCHAR(15) | NULL | 10-digit mobile number |
| `password` | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) |

### Table 2: `tables`
Stores physical restaurant table layouts and seating capacities.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `table_id` | INT | AUTO_INCREMENT, PRIMARY KEY | Unique table ID |
| `table_number` | VARCHAR(20) | NOT NULL, UNIQUE | Table code (e.g. T01, T02) |
| `seating_capacity` | INT | NOT NULL | Max guests table can accommodate |
| `location` | VARCHAR(50) | NULL | Indoor, Outdoor, Window Side, VIP |
| `status` | VARCHAR(20) | DEFAULT 'Available' | Current physical status |

### Table 3: `reservations`
Stores table bookings linked to customers and tables with referential integrity.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `reservation_id` | INT | AUTO_INCREMENT, PRIMARY KEY | Unique reservation ID |
| `customer_id` | INT | NOT NULL, FOREIGN KEY | References `customers(customer_id)` |
| `table_id` | INT | NOT NULL, FOREIGN KEY | References `tables(table_id)` |
| `reservation_date` | DATE | NOT NULL | Booking calendar date |
| `reservation_time` | TIME | NOT NULL | Starting time slot |
| `guests` | INT | NOT NULL | Number of guests |
| `status` | VARCHAR(30) | DEFAULT 'Confirmed' | Confirmed or Cancelled |

#### Referential Integrity:
* `reservations.customer_id` $\rightarrow$ `customers.customer_id` (`ON DELETE CASCADE ON UPDATE CASCADE`)
* `reservations.table_id` $\rightarrow$ `tables.table_id` (`ON DELETE CASCADE ON UPDATE CASCADE`)

---

## 3. Booking Conflict & 2-Hour Window Logic

1. **Configurable Duration:** The system uses a default reservation slot of **2 hours (120 minutes / 7200 seconds)**.
2. **Conflict Checking Formula:**
   $$\text{ABS}(\text{TIME\_TO\_SEC}(\text{TIMEDIFF}(\text{reservation\_time}, \text{target\_time}))) < 7200\text{ seconds}$$
3. **Double Booking Prevention:** If Table `T01` is confirmed for 7:00 PM, another booking for `T01` at 8:00 PM on that date is rejected with `409 Conflict`. A booking at 9:00 PM or later is permitted.
4. **Cancelled Reservations:** When a reservation is cancelled, its status is updated to `Cancelled` and the table immediately becomes available for other customers on that date and time.
5. **Database Transactions:** New reservations are executed inside ACID database transactions (`connection.beginTransaction()`, `connection.commit()`, `connection.rollback()`).

---

## 4. Setup & Execution Instructions (Windows PowerShell)

### Step 1: Verify Node.js and MySQL
Open Windows PowerShell and check that Node.js and MySQL are installed:
```powershell
node -v
mysql --version
```

### Step 2: Navigate to Project Directory
```powershell
cd "c:\Users\Shiva Kumar\OneDrive\Desktop\Restaurant Table Reservation"
```

### Step 3: Install Dependencies
```powershell
npm install
```
*(Dependencies: `express`, `mysql2`, `bcryptjs`, `dotenv`)*

### Step 4: Import Database Schema and Dummy Data
Ensure MySQL service is running on `localhost:3306`, then run:
```powershell
mysql -u root -p Shiva@2007 < schema.sql
```
*(Or execute `schema.sql` directly inside MySQL Workbench)*

### Step 5: Start the Backend Server
```powershell
npm start
```
*Expected terminal output:*
```text
================================================================
🍽️  Restaurant Table Reservation Management System
🚀  Server running at: http://localhost:3000
📊  Database: restaurant_management on localhost:3306 (User: root)
================================================================
✅ Connected to MySQL Database: restaurant_management (User: root)
```

### Step 6: Open the Application in Browser
Navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 5. REST API Documentation & Testing Examples

### Customer APIs:
1. **Register Customer**
   * **Endpoint:** `POST /api/customers`
   * **Request:**
     ```bash
     curl -X POST http://localhost:3000/api/customers \
       -H "Content-Type: application/json" \
       -d '{"name":"Aarav Sharma","email":"aarav@example.com","phone":"9811223344","password":"password123"}'
     ```
   * **Response:** `201 Created`

2. **Get Registered Customers**
   * **Endpoint:** `GET /api/customers`

---

### Table APIs:
1. **Get All Tables**
   * **Endpoint:** `GET /api/tables`
2. **Check Available Tables**
   * **Endpoint:** `GET /api/tables/available?reservation_date=2026-11-10&reservation_time=19:00:00&guests=4`
3. **Add Table**
   * **Endpoint:** `POST /api/tables`
   * **Payload:** `{"table_number":"T09","seating_capacity":4,"location":"Indoor","status":"Available"}`
4. **Update Table**
   * **Endpoint:** `PUT /api/tables/:id`
5. **Delete Table**
   * **Endpoint:** `DELETE /api/tables/:id` *(Fails with 400 if table has associated bookings)*

---

### Reservation APIs:
1. **Create Reservation (Transaction-Safe)**
   * **Endpoint:** `POST /api/reservations`
   * **Payload:**
     ```json
     {
       "customer_id": 1,
       "table_id": 2,
       "reservation_date": "2026-11-15",
       "reservation_time": "20:00:00",
       "guests": 2
     }
     ```
   * **Response:** `201 Created`
2. **Get All Reservations (JOIN Query)**
   * **Endpoint:** `GET /api/reservations`
3. **Cancel Reservation**
   * **Endpoint:** `PUT /api/reservations/:id/cancel`
   * **Response:** `200 OK` (Updates status to `Cancelled` and releases the table)

---

## 6. Troubleshooting Common Errors

* **Error: `ECONNREFUSED 127.0.0.1:3306`:**
  * MySQL service is not running. Start MySQL from Windows Services (`services.msc`), XAMPP Control Panel, or run `net start MySQL80`.
* **Error: `Access denied for user 'root'@'localhost'`:**
  * Verify your MySQL password in `.env` (`DB_PASSWORD=Shiva@2007`).
* **Error: `ER_BAD_DB_ERROR: Unknown database 'restaurant_management'`:**
  * Re-run `mysql -u root -p < schema.sql` to initialize the database.
