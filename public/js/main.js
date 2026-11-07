// Restaurant Table Reservation Management System – Shiva
// Main Shared Client Script

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('show');
      const icon = navToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
  }

  // Check and update navigation state based on customer session
  updateCustomerNav();
});

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

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
  }, 4000);
}

// Update navbar based on login status
async function updateCustomerNav() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  try {
    const res = await fetch('/api/customers/session');
    const data = await res.json();

    if (data.authenticated && data.customer) {
      navActions.innerHTML = `
        <a href="customer-dashboard.html" class="btn btn-outline btn-sm">
          <i class="fas fa-user-circle"></i> ${data.customer.name.split(' ')[0]}
        </a>
        <button onclick="handleCustomerLogout()" class="btn btn-dark btn-sm">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      `;
    }
  } catch (err) {
    // console.log('Session check skipped');
  }
}

// Global Customer Logout
async function handleCustomerLogout() {
  try {
    const res = await fetch('/api/customers/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 700);
    }
  } catch (err) {
    showToast('Failed to log out', 'error');
  }
}

// Format Date Utility (YYYY-MM-DD to readable format)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
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

