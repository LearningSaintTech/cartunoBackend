const jwt = require('jsonwebtoken');
const { apiResponse } = require('../utils/apiResponse');

// Single middleware function that verifies token and checks roles
const verifyAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Get token from Authorization header
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json(
          apiResponse(401, false, 'Access denied. No token provided.')
        );
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;

      // If no specific roles are required, just verify token
      if (!allowedRoles || allowedRoles.length === 0) {
        return next();
      }

      // Check if user's role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json(
          apiResponse(403, false, `Access denied. Required roles: ${allowedRoles.join(', ')}`)
        );
      }

      next();
    } catch (error) {
      return res.status(401).json(
        apiResponse(401, false, 'Invalid token.')
      );
    }
  };
};

module.exports = {
  verifyAuth
};
