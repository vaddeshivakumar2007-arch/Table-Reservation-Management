const http = require('http');

// Start express server
const app = require('./server'); // server starts on port 3000
const PORT = 3000;

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = {};
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = { raw: data };
          }
          const setCookie = res.headers['set-cookie'];
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json,
            cookie: setCookie ? setCookie[0].split(';')[0] : cookie
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  // Give server 1 second to ensure DB connection is ready
  await new Promise(r => setTimeout(r, 1000));
  console.log('🧪 Starting End-to-End Test Suite...\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  try {
    // 1. Available Tables Check
    const tablesRes = await request('GET', '/api/reservations/available-tables');
    assert(tablesRes.statusCode === 200 && tablesRes.body.tables.length > 0, '1. Public: GET /api/reservations/available-tables returns table list');

    // 2. Customer Registration
    const testEmail = `test_diner_${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/customers/register', {
      name: 'Test Diner Shiva',
      email: testEmail,
      phone: '9998887776',
      password: 'password123'
    });
    assert(regRes.statusCode === 201 && regRes.body.success === true, '2. Customer: POST /api/customers/register creates account');
    let customerCookie = regRes.cookie;

    // 3. Customer Session
    const sessionRes = await request('GET', '/api/customers/session', null, customerCookie);
    assert(sessionRes.body.authenticated === true && sessionRes.body.customer.email === testEmail, '3. Customer: GET /api/customers/session returns active customer info');

    // 4. Create Reservation (pick a date in the future with a random offset)
    const randomDays = Math.floor(Math.random() * 20) + 10;
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + randomDays);
    const dateStr = testDate.toISOString().split('T')[0];

    const bookRes = await request('POST', '/api/reservations/book', {
      table_id: 1,
      reservation_date: dateStr,
      reservation_time: '20:00:00',
      guests: 2
    }, customerCookie);
    assert(bookRes.statusCode === 201 && bookRes.body.success === true, '4. Customer: POST /api/reservations/book creates a Pending booking');
    const createdReservationId = bookRes.body.reservationId;

    // 5. Overlap Detection (Attempting to book same Table 1 tomorrow at 20:30 -> within 2 hour slot)
    const overlapRes = await request('POST', '/api/reservations/book', {
      table_id: 1,
      reservation_date: dateStr,
      reservation_time: '20:30:00',
      guests: 2
    }, customerCookie);
    assert(overlapRes.statusCode === 409 && overlapRes.body.success === false, '5. Reservation Logic: Overlapping slot correctly rejected with 409 Conflict');

    // 6. Customer Reservation History
    const historyRes = await request('GET', '/api/reservations/my-reservations', null, customerCookie);
    assert(historyRes.statusCode === 200 && historyRes.body.reservations.length >= 1, '6. Customer: GET /api/reservations/my-reservations lists personal bookings');

    // 7. Customer Cancels Reservation
    const cancelRes = await request('PUT', `/api/reservations/cancel/${createdReservationId}`, {}, customerCookie);
    assert(cancelRes.statusCode === 200 && cancelRes.body.success === true, '7. Customer: PUT /api/reservations/cancel/:id cancels reservation');

    // 8. Admin Login
    const adminLoginRes = await request('POST', '/api/admin/login', {
      email: 'admin@restaurant.com',
      password: 'admin123'
    });
    assert(adminLoginRes.statusCode === 200 && adminLoginRes.body.success === true, '8. Admin: POST /api/admin/login authenticates administrator');
    const adminCookie = adminLoginRes.cookie;

    // 9. Admin Stats
    const statsRes = await request('GET', '/api/admin/stats', null, adminCookie);
    assert(statsRes.statusCode === 200 && statsRes.body.stats.totalTables > 0, '9. Admin: GET /api/admin/stats provides system metrics');

    // 10. Admin Add Table
    const testTableNum = `T-TEST-${Math.floor(Math.random() * 900 + 100)}`;
    const addTableRes = await request('POST', '/api/admin/tables', {
      table_number: testTableNum,
      seating_capacity: 4,
      location: 'Test Rooftop Deck',
      status: 'Available'
    }, adminCookie);
    assert(addTableRes.statusCode === 201 && addTableRes.body.success === true, '10. Admin: POST /api/admin/tables creates new table');
    const newTableId = addTableRes.body.tableId;

    // 11. Admin Update Table
    const updateTableRes = await request('PUT', `/api/admin/tables/${newTableId}`, {
      table_number: testTableNum,
      seating_capacity: 6,
      location: 'Updated Rooftop Deck',
      status: 'Available'
    }, adminCookie);
    assert(updateTableRes.statusCode === 200 && updateTableRes.body.success === true, '11. Admin: PUT /api/admin/tables/:id updates table details');

    // 12. Admin Delete Table
    const deleteTableRes = await request('DELETE', `/api/admin/tables/${newTableId}`, null, adminCookie);
    assert(deleteTableRes.statusCode === 200 && deleteTableRes.body.success === true, '12. Admin: DELETE /api/admin/tables/:id removes table');

    // 13. Admin Approve Reservation
    const approveRes = await request('PUT', `/api/admin/reservations/1/approve`, {}, adminCookie);
    assert(approveRes.statusCode === 200 && approveRes.body.success === true, '13. Admin: PUT /api/admin/reservations/:id/approve confirms booking');

    // 14. Admin Customer List
    const customerListRes = await request('GET', '/api/admin/customers', null, adminCookie);
    assert(customerListRes.statusCode === 200 && customerListRes.body.customers.length > 0, '14. Admin: GET /api/admin/customers returns diner directory');

    console.log(`\n========================================`);
    console.log(`🏁 Test Summary: ${passed} / ${total} Tests Passed`);
    console.log(`========================================\n`);

    if (passed === total) {
      console.log('🎉 ALL INTEGRATION AND UNIT TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
