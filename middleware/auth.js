// Authentication & Authorization Middleware

const isCustomerAuthenticated = (req, res, next) => {
  if (req.session && req.session.customer) {
    return next();
  }
  
  // If requesting via API / AJAX
  if (req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please log in as a customer.'
    });
  }

  // Redirect to login page for browser navigation
  return res.redirect('/login.html');
};

const isAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }

  // If requesting via API / AJAX
  if (req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }

  // Redirect to admin login page for browser navigation
  return res.redirect('/admin-login.html');
};

module.exports = {
  isCustomerAuthenticated,
  isAdminAuthenticated
};

