// Restaurant Table Reservation Management System – Shiva
// Admin Operations Script

document.addEventListener('DOMContentLoaded', () => {
  initAdminLogin();
  checkAdminSession();
  initAdminDashboard();
  initManageTables();
  initManageReservations();
  initManageCustomers();
});

// Admin Login Handler
function initAdminLogin() {
  const loginForm = document.getElementById('adminLoginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        setTimeout(() => {
          window.location.href = 'admin-dashboard.html';
        }, 800);
      } else {
        showToast(data.message || 'Authentication failed.', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (err) {
      showToast('Network error during admin login.', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Admin Session Check on Admin Pages
async function checkAdminSession() {
  // Only check on admin management pages, not on login page
  if (window.location.pathname.includes('admin-login.html')) return;
  if (!window.location.pathname.includes('admin') && !window.location.pathname.includes('manage')) return;

  try {
    const res = await fetch('/api/admin/session');
    const data = await res.json();

    if (!data.authenticated) {
      window.location.href = 'admin-login.html';
    }
  } catch (err) {
    window.location.href = 'admin-login.html';
  }
}

// Global Admin Logout
async function handleAdminLogout() {
  try {
    const res = await fetch('/api/admin/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Logged out of Admin Portal.', 'success');
      setTimeout(() => {
        window.location.href = 'admin-login.html';
      }, 700);
    }
  } catch (err) {
    showToast('Failed to log out.', 'error');
  }
}

// --- ADMIN DASHBOARD ---
async function initAdminDashboard() {
  const container = document.getElementById('adminDashboardContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();

    if (data.success) {
      const s = data.stats;
      document.getElementById('statTotalCustomers').textContent = s.totalCustomers;
      document.getElementById('statTotalTables').textContent = s.totalTables;
      document.getElementById('statAvailableTables').textContent = s.availableTables;
      document.getElementById('statTotalReservations').textContent = s.totalReservations;
      document.getElementById('statPendingReservations').textContent = s.pendingReservations;

      // Render recent bookings table
      const tbody = document.getElementById('recentBookingsTbody');
      if (tbody) {
        if (data.recentReservations.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2rem;">No reservations found.</td></tr>`;
          return;
        }

        tbody.innerHTML = data.recentReservations.map(r => `
          <tr>
            <td><strong>#${r.reservation_id}</strong></td>
            <td><strong>${r.customer_name}</strong><br><small style="color: #666;">${r.customer_phone || r.customer_email}</small></td>
            <td>Table ${r.table_number}</td>
            <td>${formatDate(r.reservation_date)} at ${formatTime(r.reservation_time)}</td>
            <td>${r.guests}</td>
            <td><span class="status-pill status-${r.status.toLowerCase()}">${r.status}</span></td>
            <td>
              ${r.status === 'Pending' ? `
                <button onclick="quickApproveReservation(${r.reservation_id})" class="btn btn-success btn-sm" title="Confirm Booking">
                  <i class="fas fa-check"></i>
                </button>
                <button onclick="quickRejectReservation(${r.reservation_id})" class="btn btn-danger btn-sm" title="Reject Booking">
                  <i class="fas fa-times"></i>
                </button>
              ` : `<small style="color: #888;">Processed</small>`}
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load administrative statistics.', 'error');
  }
}

// Quick Approve / Reject
async function quickApproveReservation(id) {
  try {
    const res = await fetch(`/api/admin/reservations/${id}/approve`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      if (document.getElementById('adminDashboardContainer')) initAdminDashboard();
      if (document.getElementById('manageReservationsContainer')) loadAdminReservations();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to approve reservation.', 'error');
  }
}

async function quickRejectReservation(id) {
  if (!confirm(`Are you sure you want to reject reservation #${id}?`)) return;

  try {
    const res = await fetch(`/api/admin/reservations/${id}/reject`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      if (document.getElementById('adminDashboardContainer')) initAdminDashboard();
      if (document.getElementById('manageReservationsContainer')) loadAdminReservations();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to reject reservation.', 'error');
  }
}

// --- MANAGE TABLES ---
let editingTableId = null;

function initManageTables() {
  const container = document.getElementById('manageTablesContainer');
  if (!container) return;

  loadAdminTables();

  const tableForm = document.getElementById('tableModalForm');
  if (tableForm) {
    tableForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const table_number = document.getElementById('modalTableNumber').value.trim();
      const seating_capacity = document.getElementById('modalTableCapacity').value;
      const location = document.getElementById('modalTableLocation').value.trim();
      const status = document.getElementById('modalTableStatus').value;

      const url = editingTableId ? `/api/admin/tables/${editingTableId}` : '/api/admin/tables';
      const method = editingTableId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table_number, seating_capacity, location, status })
        });
        const data = await res.json();

        if (data.success) {
          showToast(data.message, 'success');
          closeTableModal();
          loadAdminTables();
        } else {
          showToast(data.message || 'Operation failed.', 'error');
        }
      } catch (err) {
        showToast('Network error while saving table.', 'error');
      }
    });
  }
}

async function loadAdminTables() {
  const tbody = document.getElementById('tablesAdminTbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/tables');
    const data = await res.json();

    if (data.success) {
      if (data.tables.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem;">No restaurant tables found.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.tables.map(t => `
        <tr>
          <td><strong>#${t.table_id}</strong></td>
          <td><strong>Table ${t.table_number}</strong></td>
          <td><i class="fas fa-users text-gold"></i> ${t.seating_capacity} Persons</td>
          <td><i class="fas fa-map-marker-alt"></i> ${t.location || 'Main Hall'}</td>
          <td>
            <span class="status-pill ${t.status === 'Available' ? 'status-confirmed' : 'status-rejected'}">
              ${t.status}
            </span>
          </td>
          <td>
            <button onclick="openEditTableModal(${JSON.stringify(t).replace(/"/g, '&quot;')})" class="btn btn-outline btn-sm" title="Edit Table">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="deleteTable(${t.table_id}, '${t.table_number}')" class="btn btn-danger btn-sm" title="Delete Table">
              <i class="fas fa-trash"></i> Delete
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load tables list.', 'error');
  }
}

function openAddTableModal() {
  editingTableId = null;
  document.getElementById('tableModalTitle').textContent = 'Add New Restaurant Table';
  document.getElementById('modalTableNumber').value = '';
  document.getElementById('modalTableCapacity').value = '4';
  document.getElementById('modalTableLocation').value = 'Main Hall';
  document.getElementById('modalTableStatus').value = 'Available';
  document.getElementById('tableModalBackdrop').classList.add('show');
}

function openEditTableModal(table) {
  editingTableId = table.table_id;
  document.getElementById('tableModalTitle').textContent = `Edit Table ${table.table_number}`;
  document.getElementById('modalTableNumber').value = table.table_number;
  document.getElementById('modalTableCapacity').value = table.seating_capacity;
  document.getElementById('modalTableLocation').value = table.location || '';
  document.getElementById('modalTableStatus').value = table.status || 'Available';
  document.getElementById('tableModalBackdrop').classList.add('show');
}

function closeTableModal() {
  document.getElementById('tableModalBackdrop').classList.remove('show');
  editingTableId = null;
}

async function deleteTable(id, tableNumber) {
  if (!confirm(`Are you sure you want to delete Table ${tableNumber}? This action cannot be undone.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/tables/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminTables();
    } else {
      showToast(data.message || 'Failed to delete table.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting table.', 'error');
  }
}

// --- MANAGE RESERVATIONS ---
function initManageReservations() {
  const container = document.getElementById('manageReservationsContainer');
  if (!container) return;

  const filterStatus = document.getElementById('adminFilterStatus');
  const filterDate = document.getElementById('adminFilterDate');

  if (filterStatus) {
    filterStatus.addEventListener('change', loadAdminReservations);
  }
  if (filterDate) {
    filterDate.addEventListener('change', loadAdminReservations);
  }

  loadAdminReservations();
}

async function loadAdminReservations() {
  const tbody = document.getElementById('reservationsAdminTbody');
  if (!tbody) return;

  const status = document.getElementById('adminFilterStatus') ? document.getElementById('adminFilterStatus').value : 'All';
  const date = document.getElementById('adminFilterDate') ? document.getElementById('adminFilterDate').value : '';

  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (date) params.append('date', date);

  try {
    const res = await fetch(`/api/admin/reservations?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      if (data.reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2.5rem;">No reservations matching this filter.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.reservations.map(r => `
        <tr>
          <td><strong>#${r.reservation_id}</strong></td>
          <td>
            <strong>${r.customer_name}</strong><br>
            <small style="color: #666;"><i class="fas fa-envelope"></i> ${r.customer_email}</small><br>
            <small style="color: #666;"><i class="fas fa-phone"></i> ${r.customer_phone || 'N/A'}</small>
          </td>
          <td>
            <strong>Table ${r.table_number}</strong><br>
            <small style="color: #777;">${r.location || 'Main Hall'}</small>
          </td>
          <td>${formatDate(r.reservation_date)}</td>
          <td>${formatTime(r.reservation_time)}</td>
          <td><i class="fas fa-users text-gold"></i> ${r.guests}</td>
          <td>
            <select onchange="updateAdminReservationStatus(${r.reservation_id}, this.value)" class="form-control" style="font-size: 0.85rem; padding: 0.35rem 0.6rem; border-radius: 6px;">
              <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Confirmed" ${r.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Rejected" ${r.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
              <option value="Cancelled" ${r.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              <option value="Completed" ${r.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
          </td>
          <td>
            ${r.status === 'Pending' ? `
              <button onclick="quickApproveReservation(${r.reservation_id})" class="btn btn-success btn-sm" title="Confirm Reservation">
                <i class="fas fa-check"></i>
              </button>
              <button onclick="quickRejectReservation(${r.reservation_id})" class="btn btn-danger btn-sm" title="Reject Reservation">
                <i class="fas fa-times"></i>
              </button>
            ` : `<small style="color: #888;">Processed</small>`}
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load reservations.', 'error');
  }
}

async function updateAdminReservationStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/reservations/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminReservations();
    } else {
      showToast(data.message || 'Failed to update status.', 'error');
    }
  } catch (err) {
    showToast('Network error while updating status.', 'error');
  }
}

// --- MANAGE CUSTOMERS ---
function initManageCustomers() {
  const container = document.getElementById('manageCustomersContainer');
  if (!container) return;

  loadAdminCustomers();
}

async function loadAdminCustomers() {
  const tbody = document.getElementById('customersAdminTbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/customers');
    const data = await res.json();

    if (data.success) {
      if (data.customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2.5rem;">No registered customers yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.customers.map(c => `
        <tr>
          <td><strong>#${c.customer_id}</strong></td>
          <td><strong>${c.name}</strong></td>
          <td>${c.email}</td>
          <td>${c.phone || '<span style="color: #999;">Not Provided</span>'}</td>
          <td>${formatDate(c.created_at)}</td>
          <td>
            <span class="status-pill status-pending" style="font-weight: 600;">
              ${c.total_reservations} Bookings (${c.confirmed_reservations || 0} Confirmed)
            </span>
          </td>
          <td>
            <button onclick="deleteCustomer(${c.customer_id}, '${c.name.replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load customer list.', 'error');
  }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Are you sure you want to delete customer account for "${name}"? All associated reservations will also be deleted.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminCustomers();
    } else {
      showToast(data.message || 'Failed to delete customer.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting customer.', 'error');
  }
}

