const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../utils/apiResponse');

// Admin login
const adminLogin = async (req, res) => {
  console.log('=== adminLogin called ===');
  console.log('Request body:', req.body);
  
  try {
    const { number, password } = req.body;
    console.log('Login attempt for number:', number);

    // Validate input
    if (!number || !password) {
      console.log('Validation failed: Missing number or password');
      return res.status(400).json(
        apiResponse(400, false, 'Number and password are required')
      );
    }

    console.log('Input validation passed');

    // Find admin by number
    const admin = await Admin.findByNumber(number);
    if (!admin) {
      console.log('Admin not found for number:', number);
      return res.status(401).json(
        apiResponse(401, false, 'Invalid credentials')
      );
    }

    console.log('Admin found:', admin._id);

    // Check if admin is active
    if (!admin.isActive) {
      console.log('Admin account is deactivated:', admin._id);
      return res.status(401).json(
        apiResponse(401, false, 'Account is deactivated')
      );
    }

    console.log('Admin account is active');

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for admin:', admin._id);
      return res.status(401).json(
        apiResponse(401, false, 'Invalid credentials')
      );
    }

    console.log('Password verification successful');

    // Update last login
    await admin.updateLastLogin();
    console.log('Last login updated for admin:', admin._id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        number: admin.number, 
        role: admin.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    console.log('JWT token generated for admin:', admin._id);

    // Return success response
    console.log('Admin login successful:', admin._id);
    res.status(200).json(
      apiResponse(200, true, 'Login successful', {
        adminId: admin._id,
        number: admin.number,
        role: admin.role,
        token
      })
    );

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Internal server error')
    );
  }
};

module.exports = {
  adminLogin
};
