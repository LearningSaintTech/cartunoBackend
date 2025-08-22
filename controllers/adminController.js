const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../utils/apiResponse');
const firebaseAdmin = require('../config/firebase');

// Admin login (password-based)
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

// Firebase admin login/verify using ID token
// Accepts: { idToken: string }
// Verifies Firebase ID token, checks for existing admin by firebaseUid or phone_number,
// and issues a JWT. Does not auto-create admins unless explicitly allowed.
async function adminFirebaseLogin(req, res) {
  console.log('=== adminFirebaseLogin called ===');
  console.log('Request body:', req.body);

  try {
    const { idToken } = req.body;
    if (!idToken) {
      console.log('Validation failed: Missing idToken');
      return res.status(400).json(
        apiResponse(400, false, 'idToken is required')
      );
    }

    console.log('Input validation passed');

    // Verify Firebase ID token
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const phone = decoded.phone_number || null;
    console.log('Firebase ID token verified:', { firebaseUid, phone });

    // Find admin by firebaseUid or phone number
    let admin = await Admin.findOne({ firebaseUid, isActive: true });
    if (!admin && phone) {
      admin = await Admin.findOne({ number: phone, isActive: true });
      if (admin && !admin.firebaseUid) {
        console.log('Linking firebaseUid to existing admin:', admin._id);
        admin.firebaseUid = firebaseUid;
        await admin.save();
      }
    }

    if (!admin) {
      console.log('No active admin found for firebaseUid:', firebaseUid, 'or phone:', phone);
      return res.status(401).json(
        apiResponse(401, false, 'Unauthorized admin')
      );
    }

    console.log('Admin found:', admin._id);

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
    console.log('Admin Firebase login successful:', admin._id);
    return res.status(200).json(
      apiResponse(200, true, 'Firebase login successful', {
        adminId: admin._id,
        number: admin.number,
        role: admin.role,
        token
      })
    );
  } catch (error) {
    console.error('Admin Firebase login error:', error);
    return res.status(401).json(
      apiResponse(401, false, 'Invalid Firebase ID token')
    );
  }
}

module.exports = {
  adminLogin,
  adminFirebaseLogin
};