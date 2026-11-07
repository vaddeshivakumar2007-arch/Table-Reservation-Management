/**
 * ============================================================================
 * RESTAURANT TABLE RESERVATION MANAGEMENT SYSTEM
 * Frontend Application Script (Vanilla JavaScript & Fetch API)
 * Strictly separated from HTML and CSS
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initDatePickers();
  loadDashboardStats();
  loadCustomersDropdown();
  loadAllTables();
  loadReservations();

  // Attach Form & Filter Event Listeners
  setupCustomerRegistration();
  setupAvailabilityFilter();
  setupReservationBooking();
  setupReservationsSearchAndFilter();
});

// ============================================================================
// 1. GLOBAL STATE & UTILITIES
// ============================================================================

let cachedReservations = [];
let cachedTables = [];

// Display customizable toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-triangle';

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Mobile navigation toggle
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('show');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('show');
      });
    });
  }
}

// Initialize minimum dates on date inputs (cannot be in the past)
function initDatePickers() {
  const today = new Date().toISOString().split('T')[0];
  const filterDate = document.getElementById('filterDate');
  const resDate = document.getElementById('resDate');

  if (filterDate) {
    filterDate.min = today;
    filterDate.value = today;
  }
  if (resDate) {
    resDate.min = today;
    resDate.value = today;
  }
}

// Format Date Utility (YYYY-MM-DD to readable format)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format Time Utility (HH:MM:SS to 12-hour format)
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${minutes} ${ampm}`;
}

// Location styling helper
function getLocationBadge(location) {
  const loc = (location || 'Indoor').toLowerCase();
  if (loc.includes('outdoor')) return `<span class="location-badge badge-outdoor"><i class="fas fa-umbrella-beach"></i> ${location}</span>`;
  if (loc.includes('window')) return `<span class="location-badge badge-window"><i class="fas fa-sun"></i> ${location}</span>`;
  if (loc.includes('vip')) return `<span class="location-badge badge-vip"><i class="fas fa-crown"></i> ${location}</span>`;
  if (loc.includes('family')) return `<span class="location-badge badge-family"><i class="fas fa-users"></i> ${location}</span>`;
  return `<span class="location-badge badge-indoor"><i class="fas fa-home"></i> ${location || 'Indoor'}</span>`;
}

// Table thumbnail image helper based on location
function getTableImage(location) {
  const loc = (location || '').toLowerCase();
  if (loc.includes('outdoor')) return 'images/table-outdoor.jpg';
  if (loc.includes('window')) return 'images/table-garden.jpg';
  if (loc.includes('vip')) return 'images/table-vip.jpg';
  if (loc.includes('family')) return 'images/table-family.jpg';
  return 'images/table-booth.jpg';
}

// ============================================================================
// 2. DASHBOARD METRICS API
// ============================================================================

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const data = await res.json();

    if (data.success) {
      const s = data.stats;
      document.getElementById('statTotalCustomers').textContent = s.totalCustomers;
      document.getElementById('statTotalTables').textContent = s.totalTables;
      document.getElementById('statAvailableTables').textContent = s.availableTables;
      document.getElementById('statTotalReservations').textContent = s.totalReservations;
      document.getElementById('statConfirmedReservations').textContent = s.confirmedReservations;
      document.getElementById('statCancelledReservations').textContent = s.cancelledReservations;
    }
  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

// ============================================================================
// 3. CUSTOMER MANAGEMENT (REGISTRATION & DROPDOWN)
// ============================================================================

function setupCustomerRegistration() {
  const form = document.getElementById('customerRegisterForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const password = document.getElementById('custPassword').value;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        form.reset();
        await loadCustomersDropdown();
        await loadDashboardStats();

        // Automatically select the new customer in booking form
        const customerSelect = document.getElementById('resCustomerSelect');
        if (customerSelect && data.customer) {
          customerSelect.value = data.customer.customer_id;
        }

        // Scroll smoothly to booking section
        const bookingSection = document.getElementById('booking-section');
        if (bookingSection) bookingSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast(data.message || 'Registration failed.', 'error');
      }
    } catch (err) {
      showToast('Network error during customer registration.', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Load registered customers into booking dropdown
async function loadCustomersDropdown() {
  const select = document.getElementById('resCustomerSelect');
  if (!select) return;

  try {
    const res = await fetch('/api/customers');
    const data = await res.json();

    if (data.success) {
      select.innerHTML = '<option value="">-- Choose Registered Customer --</option>';
      data.customers.forEach(c => {
        select.innerHTML += `
          <option value="${c.customer_id}">
            ${c.name} (${c.email}) - ${c.phone || 'No phone'}
          </option>
        `;
      });
    }
  } catch (err) {
    console.error('Failed to load customers dropdown:', err);
  }
}

// ============================================================================
// 4. TABLE AVAILABILITY & CARD DISPLAY
// ============================================================================

// Fetch all tables initially
async function loadAllTables() {
  const container = document.getElementById('tablesContainer');
  const resTableSelect = document.getElementById('resTableSelect');
  if (!container) return;

  try {
    const res = await fetch('/api/tables');
    const data = await res.json();

    if (data.success) {
      cachedTables = data.tables;
      renderTableCards(data.tables);

      if (resTableSelect) {
        resTableSelect.innerHTML = '<option value="">-- Choose Table --</option>';
        data.tables.forEach(t => {
          resTableSelect.innerHTML += `
            <option value="${t.table_id}">
              Table ${t.table_number} (${t.location || 'Indoor'}) — Max ${t.seating_capacity} Guests
            </option>
          `;
        });
      }
    }
  } catch (err) {
    container.innerHTML = `<div class="loading-spinner"><p style="color:red;">Error loading tables.</p></div>`;
  }
}

// Setup Availability Filter Form
function setupAvailabilityFilter() {
  const form = document.getElementById('availabilityForm');
  const resetBtn = document.getElementById('resetFilterBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const reservation_date = document.getElementById('filterDate').value;
      const reservation_time = document.getElementById('filterTime').value;
      const guests = document.getElementById('filterGuests').value;

      const container = document.getElementById('tablesContainer');
      container.innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin text-gold"></i>
          <p>Checking availability for ${formatDate(reservation_date)} at ${formatTime(reservation_time)}...</p>
        </div>
      `;

      const params = new URLSearchParams();
      if (reservation_date) params.append('reservation_date', reservation_date);
      if (reservation_time) params.append('reservation_time', reservation_time);
      if (guests) params.append('guests', guests);

      try {
        const res = await fetch(`/api/tables/available?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          renderTableCards(data.tables, { reservation_date, reservation_time, guests });
        } else {
          showToast(data.message || 'Error checking availability.', 'error');
        }
      } catch (err) {
        showToast('Network error while checking table availability.', 'error');
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      initDatePickers();
      document.getElementById('filterGuests').value = '';
      loadAllTables();
    });
  }
}

// Render Table Cards dynamically
function renderTableCards(tables, filterContext = null) {
  const container = document.getElementById('tablesContainer');
  if (!container) return;

  if (tables.length === 0) {
    container.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-chair" style="color: #bbb; font-size: 2.5rem; margin-bottom: 0.8rem;"></i>
        <h4>No Tables Available</h4>
        <p>No available tables match your selected date, time slot, and guest count. Please try another time.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tables.map(t => `
    <div class="table-card">
      <div class="table-card-img-wrapper">
        <img src="${getTableImage(t.location)}" alt="Table ${t.table_number}" class="table-card-img" loading="lazy">
        <span class="table-img-badge"><i class="fas fa-chair"></i> Table ${t.table_number}</span>
      </div>
      <div class="table-card-header">
        <span class="table-card-number">Table ${t.table_number}</span>
        <span class="status-pill status-available">${t.status}</span>
      </div>
      <div class="table-card-body">
        <div class="table-detail-item">
          <i class="fas fa-users text-gold"></i>
          <span>Seating Capacity: <strong>${t.seating_capacity} Persons</strong></span>
        </div>
        <div class="table-detail-item">
          <i class="fas fa-map-marker-alt text-gold"></i>
          <span>Location: ${getLocationBadge(t.location)}</span>
        </div>
        <div class="table-detail-item">
          <i class="fas fa-clock text-gold"></i>
          <span>Slot Duration: 2 Hours (120 Mins)</span>
        </div>
      </div>
      <div class="table-card-footer">
        <button type="button" class="btn btn-primary btn-block btn-sm" onclick="selectAndBookTable(${t.table_id}, ${JSON.stringify(filterContext).replace(/"/g, '&quot;')})">
          <i class="fas fa-calendar-check"></i> Reserve Table
        </button>
      </div>
    </div>
  `).join('');
}

// Quick action: Click "Reserve Table" on card to prepopulate booking form
window.selectAndBookTable = function(tableId, filterContext) {
  const tableSelect = document.getElementById('resTableSelect');
  const dateInput = document.getElementById('resDate');
  const timeInput = document.getElementById('resTime');
  const guestsInput = document.getElementById('resGuests');

  if (tableSelect) tableSelect.value = tableId;

  if (filterContext) {
    if (filterContext.reservation_date && dateInput) dateInput.value = filterContext.reservation_date;
    if (filterContext.reservation_time && timeInput) timeInput.value = filterContext.reservation_time;
    if (filterContext.guests && guestsInput) guestsInput.value = filterContext.guests;
  }

  const bookingSection = document.getElementById('booking-section');
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: 'smooth' });
    showToast(`Table selected! Please choose customer and confirm your booking.`, 'info');
  }
};

// ============================================================================
// 5. RESERVATION CREATION (WITH DATABASE TRANSACTION ON BACKEND)
// ============================================================================

function setupReservationBooking() {
  const form = document.getElementById('reservationForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customer_id = document.getElementById('resCustomerSelect').value;
    const table_id = document.getElementById('resTableSelect').value;
    const reservation_date = document.getElementById('resDate').value;
    const reservation_time = document.getElementById('resTime').value;
    const guests = document.getElementById('resGuests').value;

    if (!customer_id || !table_id || !reservation_date || !reservation_time || !guests) {
      showToast('Please fill in all reservation fields.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Transaction...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id,
          table_id,
          reservation_date,
          reservation_time,
          guests
        })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        form.reset();
        initDatePickers();

        // Refresh all synchronized views
        await loadReservations();
        await loadDashboardStats();
        await loadAllTables();

        // Scroll to reservation table
        const resSection = document.getElementById('reservations-section');
        if (resSection) resSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast(data.message || 'Could not create reservation.', 'error');
      }
    } catch (err) {
      showToast('Network error while processing reservation.', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ============================================================================
// 6. RESERVATION MANAGEMENT TABLE, SEARCH, FILTER & CANCELLATION
// ============================================================================

// Fetch and render all reservations using SQL JOIN query from backend
async function loadReservations() {
  const tbody = document.getElementById('reservationsTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/reservations');
    const data = await res.json();

    if (data.success) {
      cachedReservations = data.reservations;
      applyReservationFilter();
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4" style="color:red;">Error loading reservations.</td></tr>`;
  }
}

// Filter and search logic on reservation records
function applyReservationFilter() {
  const tbody = document.getElementById('reservationsTableBody');
  if (!tbody) return;

  const searchQuery = (document.getElementById('searchReservationsInput')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilterSelect')?.value || 'All';

  let filtered = cachedReservations.filter(r => {
    // Status Filter
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;

    // Search Query (matches customer name, email, phone, or table number)
    if (searchQuery) {
      const name = (r.customer_name || '').toLowerCase();
      const email = (r.customer_email || '').toLowerCase();
      const phone = (r.customer_phone || '').toLowerCase();
      const table = (r.table_number || '').toLowerCase();
      return name.includes(searchQuery) || email.includes(searchQuery) || phone.includes(searchQuery) || table.includes(searchQuery);
    }

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4" style="color: #888;">
          <i class="fas fa-search" style="font-size: 1.5rem; color: #ccc; margin-bottom: 0.5rem; display:block;"></i>
          No reservation records found matching your search criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const statusClass = r.status === 'Confirmed' ? 'status-confirmed' : 'status-cancelled';
    const canCancel = r.status === 'Confirmed';

    return `
      <tr>
        <td><strong>#${r.reservation_id}</strong></td>
        <td>
          <strong>${r.customer_name}</strong><br>
          <small style="color: #666;"><i class="fas fa-envelope"></i> ${r.customer_email}</small><br>
          <small style="color: #666;"><i class="fas fa-phone"></i> ${r.customer_phone || 'N/A'}</small>
        </td>
        <td><strong>Table ${r.table_number}</strong></td>
        <td><i class="fas fa-users text-gold"></i> Max ${r.seating_capacity}</td>
        <td>${getLocationBadge(r.location)}</td>
        <td>${formatDate(r.reservation_date)}</td>
        <td>${formatTime(r.reservation_time)}</td>
        <td><strong>${r.guests} Guests</strong></td>
        <td><span class="status-pill ${statusClass}">${r.status}</span></td>
        <td>
          ${canCancel ? `
            <button type="button" class="btn btn-danger btn-sm" onclick="cancelReservation(${r.reservation_id}, '${r.table_number}', '${r.reservation_date}')" title="Cancel this reservation">
              <i class="fas fa-times-circle"></i> Cancel
            </button>
          ` : `
            <span style="color: #999; font-size: 0.85rem;"><i class="fas fa-lock"></i> Cancelled</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// Real-time search & filter input bindings
function setupReservationsSearchAndFilter() {
  const searchInput = document.getElementById('searchReservationsInput');
  const statusSelect = document.getElementById('statusFilterSelect');
  const refreshBtn = document.getElementById('refreshReservationsBtn');

  if (searchInput) searchInput.addEventListener('input', applyReservationFilter);
  if (statusSelect) statusSelect.addEventListener('change', applyReservationFilter);
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadReservations();
      await loadDashboardStats();
      showToast('Reservation list refreshed.', 'info');
    });
  }
}

// Cancel reservation operation
window.cancelReservation = async function(id, tableNumber, date) {
  if (!confirm(`Are you sure you want to cancel reservation #${id} for Table ${tableNumber} on ${date}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/reservations/${id}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      await loadReservations();
      await loadDashboardStats();
      await loadAllTables();
    } else {
      showToast(data.message || 'Failed to cancel reservation.', 'error');
    }
  } catch (err) {
    showToast('Network error while cancelling reservation.', 'error');
  }
};

