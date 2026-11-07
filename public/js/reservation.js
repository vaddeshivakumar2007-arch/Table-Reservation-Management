// Restaurant Table Reservation Management System – Shiva
// Reservation & Table Booking Script

document.addEventListener('DOMContentLoaded', () => {
  initAvailableTablesPage();
  initReservationBookingPage();
  initMyReservationsPage();
});

// Map table images for visual richness
const tableImageMap = [
  'images/table-couple.jpg',   // T-01 Window View
  'images/table-booth.jpg',    // T-02 Candlelight Alcove
  'images/tables.jpg',         // T-03 Central Main Hall
  'images/table-garden.jpg',   // T-04 Garden Terrace
  'images/table-family.jpg',   // T-05 Family Lounge
  'images/table-outdoor.jpg',  // T-06 Outdoor Poolside
  'images/table-vip.jpg',      // T-07 VIP Royal Dining
  'images/table-rooftop.jpg'   // T-08 Banquet Table
];

function getTableImage(index) {
  return tableImageMap[index % tableImageMap.length];
}

// Available Tables Page Logic
async function initAvailableTablesPage() {
  const container = document.getElementById('availableTablesContainer');
  if (!container) return;

  const filterForm = document.getElementById('tableFilterForm');
  const dateInput = document.getElementById('filterDate');
  const timeInput = document.getElementById('filterTime');
  const guestsInput = document.getElementById('filterGuests');

  // Set minimum date to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  // Initial Load
  loadTables();

  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadTables();
    });
  }

  async function loadTables() {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
        <p style="margin-top: 1rem; color: var(--text-muted);">Finding available tables...</p>
      </div>
    `;

    const date = dateInput ? dateInput.value : '';
    const time = timeInput ? timeInput.value : '';
    const guests = guestsInput ? guestsInput.value : '';

    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (time) params.append('time', time);
    if (guests) params.append('guests', guests);

    try {
      const res = await fetch(`/api/reservations/available-tables?${params.toString()}`);
      const data = await res.json();

      if (!data.success || data.tables.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: #fff; border-radius: 12px;">
            <i class="fas fa-chair" style="font-size: 3rem; color: #bbb; margin-bottom: 1rem;"></i>
            <h3>No Tables Available</h3>
            <p style="color: var(--text-muted);">We couldn't find any available tables matching your exact criteria. Please try another time slot or guest count.</p>
          </div>
        `;
        return;
      }

      let html = '';
      data.tables.forEach((table, index) => {
        const img = getTableImage(index);
        html += `
          <div class="table-card">
            <div class="table-card-img">
              <img src="${img}" alt="Table ${table.table_number}">
              <span class="table-badge badge-available">Available</span>
            </div>
            <div class="table-card-body">
              <div class="table-header">
                <h3 class="table-title">Table ${table.table_number}</h3>
                <span class="table-capacity"><i class="fas fa-users"></i> Seats ${table.seating_capacity}</span>
              </div>
              <p class="table-location"><i class="fas fa-map-marker-alt text-gold"></i> ${table.location || 'Main Dining Hall'}</p>
              <div class="table-footer">
                <a href="reservation.html?tableId=${table.table_id}&date=${date}&time=${time}&guests=${guests}" class="btn btn-primary" style="width: 100%;">
                  <i class="fas fa-utensils"></i> Reserve This Table
                </a>
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: red;">
          Failed to load restaurant tables. Please try again.
        </div>
      `;
    }
  }
}

// Reservation Booking Page Logic
async function initReservationBookingPage() {
  const form = document.getElementById('reservationForm');
  if (!form) return;

  const tableSelect = document.getElementById('tableSelect');
  const dateInput = document.getElementById('resDate');
  const timeInput = document.getElementById('resTime');
  const guestsInput = document.getElementById('resGuests');

  // Set min date
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.min = today;
  }

  // Parse URL search parameters if arriving from Available Tables page
  const urlParams = new URLSearchParams(window.location.search);
  const paramTableId = urlParams.get('tableId');
  const paramDate = urlParams.get('date');
  const paramTime = urlParams.get('time');
  const paramGuests = urlParams.get('guests');

  if (paramDate && dateInput) dateInput.value = paramDate;
  if (paramTime && timeInput) timeInput.value = paramTime;
  if (paramGuests && guestsInput) guestsInput.value = paramGuests;

  // Load Tables for dropdown
  try {
    const res = await fetch('/api/reservations/available-tables');
    const data = await res.json();

    if (data.success && tableSelect) {
      tableSelect.innerHTML = '<option value="">-- Choose a Table --</option>';
      data.tables.forEach((t) => {
        const selected = (paramTableId && parseInt(paramTableId) === t.table_id) ? 'selected' : '';
        tableSelect.innerHTML += `
          <option value="${t.table_id}" data-capacity="${t.seating_capacity}" ${selected}>
            Table ${t.table_number} (${t.location || 'Main Hall'}) — Max ${t.seating_capacity} Guests
          </option>
        `;
      });
    }
  } catch (err) {
    console.error('Failed to load table dropdown:', err);
  }

  // Handle Booking Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const table_id = tableSelect.value;
    const reservation_date = dateInput.value;
    const reservation_time = timeInput.value;
    const guests = guestsInput.value;

    if (!table_id || !reservation_date || !reservation_time || !guests) {
      showToast('Please fill in all reservation fields.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming Reservation...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/reservations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id,
          reservation_date,
          reservation_time,
          guests
        })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        setTimeout(() => {
          window.location.href = 'my-reservations.html';
        }, 1200);
      } else {
        showToast(data.message || 'Could not complete reservation.', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (err) {
      showToast('Network error while booking table.', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Customer's My Reservations Page Logic
async function initMyReservationsPage() {
  const container = document.getElementById('myReservationsContainer');
  if (!container) return;

  loadMyReservations();
}

async function loadMyReservations() {
  const container = document.getElementById('myReservationsContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/reservations/my-reservations');
    const data = await res.json();

    if (!data.success || data.reservations.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; background: #fff; border-radius: 12px; box-shadow: var(--shadow-sm);">
          <i class="fas fa-calendar-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
          <h3>No Reservations Found</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">You do not have any past or active dining reservations.</p>
          <a href="reservation.html" class="btn btn-primary">
            <i class="fas fa-plus-circle"></i> Reserve a Table Now
          </a>
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Table Details</th>
              <th>Reservation Date</th>
              <th>Time</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.reservations.forEach((r) => {
      const statusClass = `status-${r.status.toLowerCase()}`;
      const canCancel = r.status === 'Pending' || r.status === 'Confirmed';

      html += `
        <tr>
          <td><strong>#${r.reservation_id}</strong></td>
          <td>
            <strong>Table ${r.table_number}</strong><br>
            <small style="color: #777;"><i class="fas fa-map-marker-alt"></i> ${r.location || 'Main Hall'}</small>
          </td>
          <td>${formatDate(r.reservation_date)}</td>
          <td>${formatTime(r.reservation_time)}</td>
          <td><i class="fas fa-users text-gold"></i> ${r.guests} People</td>
          <td><span class="status-pill ${statusClass}">${r.status}</span></td>
          <td>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button onclick="viewReservationVoucher(${JSON.stringify(r).replace(/"/g, '&quot;')})" class="btn btn-outline btn-sm" title="View Booking Pass">
                <i class="fas fa-ticket-alt"></i> Pass
              </button>
              ${canCancel ? `
                <button onclick="cancelMyReservation(${r.reservation_id})" class="btn btn-danger btn-sm" title="Cancel Booking">
                  <i class="fas fa-times-circle"></i> Cancel
                </button>
              ` : `
                <span style="color: #999; font-size: 0.85rem;"><i class="fas fa-lock"></i></span>
              `}
            </div>
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
    container.innerHTML = `<p style="color: red; text-align: center;">Error loading reservation history.</p>`;
  }
}

// View Reservation Voucher / Dining Pass Modal
function viewReservationVoucher(resObj) {
  let modalBackdrop = document.getElementById('voucherModalBackdrop');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'voucherModalBackdrop';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-box" style="max-width: 500px;">
      <div class="modal-header">
        <h3><i class="fas fa-receipt text-gold"></i> Dining Reservation Voucher</h3>
        <button type="button" class="modal-close" onclick="closeVoucherModal()">&times;</button>
      </div>
      <div class="modal-body" id="voucherPrintSection">
        <div class="reservation-voucher">
          <div class="voucher-header">
            <div style="font-size: 1.8rem; color: var(--primary); margin-bottom: 0.3rem;"><i class="fas fa-utensils"></i></div>
            <h3>Shiva Fine Dining Restaurant</h3>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">Reservation Confirmation & Dining Pass</p>
            <span class="status-pill status-${resObj.status.toLowerCase()}" style="margin-top: 0.6rem;">Status: ${resObj.status}</span>
          </div>

          <div class="voucher-grid">
            <div class="voucher-item">
              <label>Booking ID</label>
              <p>#${resObj.reservation_id}</p>
            </div>
            <div class="voucher-item">
              <label>Reserved Table</label>
              <p>Table ${resObj.table_number}</p>
            </div>
            <div class="voucher-item">
              <label>Dining Date</label>
              <p>${formatDate(resObj.reservation_date)}</p>
            </div>
            <div class="voucher-item">
              <label>Slot Timing</label>
              <p>${formatTime(resObj.reservation_time)}</p>
            </div>
            <div class="voucher-item">
              <label>Number of Guests</label>
              <p>${resObj.guests} Persons</p>
            </div>
            <div class="voucher-item">
              <label>Zone / Location</label>
              <p>${resObj.location || 'Main Dining Hall'}</p>
            </div>
          </div>

          <div class="voucher-footer">
            <div style="font-family: monospace; letter-spacing: 2px; color: #555; font-size: 0.85rem; margin-bottom: 0.5rem;">
              ||| | ||||| |||| | |||||||| |||
            </div>
            <small style="color: var(--text-muted);">Please present this dining voucher or booking ID at the front desk upon arrival.</small>
          </div>
        </div>
      </div>
      <div class="modal-footer voucher-actions">
        <button type="button" class="btn btn-outline btn-sm" onclick="closeVoucherModal()">Close</button>
        <button type="button" class="btn btn-primary btn-sm" onclick="window.print()">
          <i class="fas fa-print"></i> Print Voucher
        </button>
      </div>
    </div>
  `;

  modalBackdrop.classList.add('show');
}

function closeVoucherModal() {
  const modalBackdrop = document.getElementById('voucherModalBackdrop');
  if (modalBackdrop) modalBackdrop.classList.remove('show');
}


