const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  otp: {
    type: String,
    required: false,
    minlength: 6,
    maxlength: 6,
    default: null,
  },
  isProfile: {
    type: Boolean,
    default: false
  },
  firstname: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastname: {
    type: String,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  dob: {
    type: Date,
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  profileImage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries (avoid duplicates; unique indexes are created from field definitions)
userSchema.index({ email: 1 });
userSchema.index({ isProfile: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstname && this.lastname) {
    return `${this.firstname} ${this.lastname}`;
  }
  return this.firstname || this.lastname || 'Unknown';
});

// Method to check if profile is complete
userSchema.methods.isProfileComplete = function() {
  return !!(this.firstname && this.lastname && this.email && this.dob && this.gender);
};

// Method to update OTP
userSchema.methods.updateOTP = function(newOTP) {
  this.otp = newOTP;
  return this.save();
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(inputOTP) {
  return this.otp === inputOTP;
};

// Pre-save middleware to update isProfile status
userSchema.pre('save', function(next) {
  this.isProfile = this.isProfileComplete();
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
