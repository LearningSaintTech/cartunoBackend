const mongoose = require('mongoose');
const Admin = require('../models/admin');
require('dotenv').config();

// Database connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kartuno';

// Demo admin data
const demoAdmin = {
  number: '+919876543210', // Demo phone number
  password: 'admin123',    // Demo password
  role: 'admin',
  isActive: true
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

// Function to insert demo admin
const insertDemoAdmin = async () => {
  try {
    console.log('🔍 Checking for existing admin...');
    
    // Check if admin already exists
    const existingAdmin = await checkExistingAdmin(demoAdmin.number);
    
    if (existingAdmin) {
      console.log('⚠️  Admin with this phone number already exists:');
      console.log(`   Phone: ${existingAdmin.number}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Status: ${existingAdmin.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      
      // Ask if user wants to update the existing admin
      console.log('\n💡 To update the existing admin, run this script with --update flag');
      console.log('   Example: node scripts/insertDemoAdmin.js --update');
      
      return;
    }

    console.log('📝 Creating demo admin...');
    
    // Create new admin
    const newAdmin = new Admin(demoAdmin);
    await newAdmin.save();
    
    console.log('✅ Demo admin created successfully!');
    console.log('📋 Admin Details:');
    console.log(`   Phone: ${newAdmin.number}`);
    console.log(`   Role: ${newAdmin.role}`);
    console.log(`   Status: ${newAdmin.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   Created: ${newAdmin.createdAt}`);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Phone: ${demoAdmin.number}`);
    console.log(`   Password: ${demoAdmin.password}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating demo admin:', error.message);
    
    if (error.code === 11000) {
      console.log('💡 This phone number is already registered. Use --update flag to modify existing admin.');
    }
  }
};

// Function to update existing admin
const updateExistingAdmin = async () => {
  try {
    console.log('🔍 Finding existing admin...');
    
    const existingAdmin = await Admin.findOne({ number: demoAdmin.number });
    
    if (!existingAdmin) {
      console.log('❌ No admin found with this phone number. Run without --update flag to create new admin.');
      return;
    }
    
    console.log('📝 Updating existing admin...');
    
    // Update admin fields
    existingAdmin.password = demoAdmin.password;
    existingAdmin.isActive = demoAdmin.isActive;
    existingAdmin.role = demoAdmin.role;
    
    await existingAdmin.save();
    
    console.log('✅ Demo admin updated successfully!');
    console.log('📋 Updated Admin Details:');
    console.log(`   Phone: ${existingAdmin.number}`);
    console.log(`   Role: ${existingAdmin.role}`);
    console.log(`   Status: ${existingAdmin.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   Updated: ${existingAdmin.updatedAt}`);
    console.log('\n🔑 Updated Login Credentials:');
    console.log(`   Phone: ${demoAdmin.number}`);
    console.log(`   Password: ${demoAdmin.password}`);
    console.log('\n⚠️  IMPORTANT: Change the password after login!');
    
  } catch (error) {
    console.error('❌ Error updating demo admin:', error.message);
  }
};

// Function to list all admins
const listAllAdmins = async () => {
  try {
    console.log('📋 Listing all admins...');
    
    const admins = await Admin.find({}).select('number role isActive createdAt lastLogin');
    
    if (admins.length === 0) {
      console.log('❌ No admins found in database');
      return;
    }
    
    console.log(`✅ Found ${admins.length} admin(s):\n`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Admin Details:`);
      console.log(`   Phone: ${admin.number}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log(`   Last Login: ${admin.lastLogin ? admin.lastLogin : 'Never'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing admins:', error.message);
  }
};

// Function to delete demo admin
const deleteDemoAdmin = async () => {
  try {
    console.log('🗑️  Deleting demo admin...');
    
    const deletedAdmin = await Admin.findOneAndDelete({ number: demoAdmin.number });
    
    if (!deletedAdmin) {
      console.log('❌ No admin found with this phone number to delete');
      return;
    }
    
    console.log('✅ Demo admin deleted successfully!');
    console.log('📋 Deleted Admin Details:');
    console.log(`   Phone: ${deletedAdmin.number}`);
    console.log(`   Role: ${deletedAdmin.role}`);
    console.log(`   Status: ${deletedAdmin.isActive ? 'Active' : 'Inactive'}`);
    
  } catch (error) {
    console.error('❌ Error deleting demo admin:', error.message);
  }
};

// Main function
const main = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case '--update':
        await updateExistingAdmin();
        break;
      case '--list':
        await listAllAdmins();
        break;
      case '--delete':
        await deleteDemoAdmin();
        break;
      case '--help':
        console.log('📖 Demo Admin Script Usage:');
        console.log('   node scripts/insertDemoAdmin.js          - Create new demo admin');
        console.log('   node scripts/insertDemoAdmin.js --update - Update existing demo admin');
        console.log('   node scripts/insertDemoAdmin.js --list   - List all admins');
        console.log('   node scripts/insertDemoAdmin.js --delete - Delete demo admin');
        console.log('   node scripts/insertDemoAdmin.js --help   - Show this help');
        break;
      default:
        await insertDemoAdmin();
        break;
    }
    
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
  insertDemoAdmin,
  updateExistingAdmin,
  listAllAdmins,
  deleteDemoAdmin
};
