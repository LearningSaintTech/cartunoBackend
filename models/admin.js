const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format']
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin'],
    immutable: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Method to update last login
adminSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find admin by number
adminSchema.statics.findByNumber = function(number) {
  return this.findOne({ number, isActive: true });
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;