// Restaurant Table Reservation Management System – Shiva
// Customer Operations Script

document.addEventListener('DOMContentLoaded', () => {
  initRegisterForm();
  initLoginForm();
  initCustomerDashboard();
});

// Registration Form Handler
function initRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please check again.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        setTimeout(() => {
          window.location.href = 'customer-dashboard.html';
        }, 1000);
      } else {
        showToast(data.message || 'Registration failed.', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (err) {
      showToast('Network error while creating account.', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Login Form Handler
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        setTimeout(() => {
          window.location.href = 'customer-dashboard.html';
        }, 800);
      } else {
        showToast(data.message || 'Login failed.', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (err) {
      showToast('Network error while signing in.', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Customer Dashboard Handler
async function initCustomerDashboard() {
  const customerDashboard = document.getElementById('customerDashboard');
  if (!customerDashboard) return;

  try {
    const res = await fetch('/api/customers/session');
    const data = await res.json();

    if (!data.authenticated) {
      window.location.href = 'login.html';
      return;
    }

    const customer = data.customer;
    const stats = data.stats;

    // Set Welcome Header
    const welcomeName = document.getElementById('customerWelcomeName');
    if (welcomeName) welcomeName.textContent = customer.name;

    const customerEmail = document.getElementById('customerEmail');
    if (customerEmail) customerEmail.textContent = customer.email;

    const customerPhone = document.getElementById('customerPhone');
    if (customerPhone) customerPhone.textContent = customer.phone || 'Not provided';

    // Set Stat Cards
    const statTotal = document.getElementById('statTotalReservations');
    if (statTotal) statTotal.textContent = stats.totalReservations || 0;

    const statPending = document.getElementById('statPendingReservations');
    if (statPending) statPending.textContent = stats.pendingCount || 0;

    const statConfirmed = document.getElementById('statConfirmedReservations');
    if (statConfirmed) statConfirmed.textContent = stats.confirmedCount || 0;

    const statCancelled = document.getElementById('statCancelledReservations');
    if (statCancelled) statCancelled.textContent = stats.cancelledCount || 0;

    // Fetch and show recent 3 reservations
    loadRecentReservationsPreview();
  } catch (err) {
    showToast('Failed to load dashboard profile.', 'error');
  }
}

// Load Recent Reservations for Dashboard Widget
async function loadRecentReservationsPreview() {
  const container = document.getElementById('recentReservationsPreview');
  if (!container) return;

  try {
    const res = await fetch('/api/reservations/my-reservations');
    const data = await res.json();

    if (!data.success || data.reservations.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: #888;">
          <i class="fas fa-calendar-times" style="font-size: 2.5rem; margin-bottom: 0.8rem; color: #ccc;"></i>
          <p>No reservations found yet. Ready to experience fine dining?</p>
          <a href="reservation.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">
            <i class="fas fa-plus-circle"></i> Reserve a Table Now
          </a>
        </div>
      `;
      return;
    }

    const recent = data.reservations.slice(0, 3);
    let html = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Table</th>
              <th>Date & Time</th>
              <th>Guests</th>
              <th>Location</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    recent.forEach((r) => {
      const statusClass = `status-${r.status.toLowerCase()}`;
      html += `
        <tr>
          <td><strong>Table ${r.table_number}</strong></td>
          <td>${formatDate(r.reservation_date)} at ${formatTime(r.reservation_time)}</td>
          <td><i class="fas fa-user-friends text-gold"></i> ${r.guests} Guests</td>
          <td>${r.location || 'Main Hall'}</td>
          <td><span class="status-pill ${statusClass}">${r.status}</span></td>
          <td>
            ${r.status === 'Pending' || r.status === 'Confirmed' ? `
              <button onclick="cancelMyReservation(${r.reservation_id})" class="btn btn-danger btn-sm">
                <i class="fas fa-ban"></i> Cancel
              </button>
            ` : `<span style="color: #999; font-size: 0.85rem;">Completed</span>`}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color: red;">Failed to load reservations.</p>`;
  }
}

