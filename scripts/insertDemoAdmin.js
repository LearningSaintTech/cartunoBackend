const mongoose = require('mongoose');
const Admin = require('../models/admin');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Database connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kartuno';

// Production admin data
const productionAdmin = {
  number: '9170412775', // Replace with the desired production admin phone number
  firebaseUid: `uid_${uuidv4()}`, // Unique Firebase UID for authentication
  role: 'admin',
  isActive: true
};

// Phone number validation regex (matches Admin model)
const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;

// Function to validate phone number
const validatePhoneNumber = (number) => {
  return phoneRegex.test(number) && number.replace(/[\s\-\(\)]/g, '').length >= 10;
};

// Function to connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Function to check if admin already exists
const checkExistingAdmin = async (phoneNumber) => {
  try {
    const existingAdmin = await Admin.findOne({ number: phoneNumber });
    return existingAdmin;
  } catch (error) {
    console.error('❌ Error checking existing admin:', error.message);
    return null;
  }
};

// Function to seed production admin
const seedProductionAdmin = async () => {
  try {
    console.log('🔍 Checking for existing production admin...');

    // Validate phone number
    if (!validatePhoneNumber(productionAdmin.number)) {
      console.error(`❌ Invalid phone number format: ${productionAdmin.number}`);
      console.log('💡 Phone number must include country code (e.g., +91) and be at least 10 digits.');
      return;
    }

    // Check if admin already exists
    const existingAdmin = await checkExistingAdmin(productionAdmin.number);

    if (existingAdmin) {
      console.log(`⚠️  Admin with phone number ${productionAdmin.number} already exists:`);
      console.log(`   Phone: ${existingAdmin.number}`);
      console.log(`   Firebase UID: ${existingAdmin.firebaseUid || 'Not set'}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Status: ${existingAdmin.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      console.log('\n💡 This admin can be used for Firebase OTP authentication.');
      return;
    }

    console.log(`📝 Creating production admin for ${productionAdmin.number}...`);

    // Create new admin
    const newAdmin = new Admin({
      number: productionAdmin.number,
      firebaseUid: productionAdmin.firebaseUid,
      role: productionAdmin.role,
      isActive: productionAdmin.isActive
    });

    await newAdmin.save();

    console.log(`✅ Production admin created successfully for ${productionAdmin.number}!`);
    console.log('📋 Admin Details:');
    console.log(`   Phone: ${newAdmin.number}`);
    console.log(`   Firebase UID: ${newAdmin.firebaseUid}`);
    console.log(`   Role: ${newAdmin.role}`);
    console.log(`   Status: ${newAdmin.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   Created: ${newAdmin.createdAt}`);
    console.log('\n🔑 Use Firebase phone authentication to log in with this number.');
    console.log('⚠️  Ensure this number is registered with Firebase for OTP authentication.');

  } catch (error) {
    console.error('❌ Error creating production admin:', error.message);
    if (error.code === 11000) {
      console.log('💡 Phone number or Firebase UID is already registered.');
    }
  }
};

// Main function
const main = async () => {
  try {
    // Connect to database
    await connectDB();

    // Seed production admin
    await seedProductionAdmin();

  } catch (error) {
    console.error('❌ Script execution error:', error.message);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Handle script execution
if (require.main === module) {
  main();
}

module.exports = {
  seedProductionAdmin
};