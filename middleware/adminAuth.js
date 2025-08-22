const { verifyAuth } = require('./auth');

// Admin authentication middleware
const adminAuth = verifyAuth(['admin']);

module.exports = adminAuth;
