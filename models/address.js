const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addressType: {
    type: String,
    enum: ['home', 'office', 'other'],
    required: true,
    default: 'home'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100,
    default: ''
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format']
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Only validate if email is provided
        if (!v || v === '') return true;
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: 'India'
  },
  landmark: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
addressSchema.index({ user: 1 });
addressSchema.index({ user: 1, addressType: 1 });
addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, isActive: 1 });

// Virtual for full name
addressSchema.virtual('fullName').get(function() {
  return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

// Virtual for complete address
addressSchema.virtual('completeAddress').get(function() {
  let address = this.addressLine1;
  if (this.addressLine2) {
    address += `, ${this.addressLine2}`;
  }
  address += `, ${this.city}, ${this.state} ${this.postalCode}`;
  if (this.landmark) {
    address += ` (Near ${this.landmark})`;
  }
  return address;
});

// Method to set as default address
addressSchema.methods.setAsDefault = async function() {
  // First, unset all other default addresses for this user
  await this.constructor.updateMany(
    { user: this.user, isDefault: true },
    { isDefault: false }
  );
  
  // Set this address as default
  this.isDefault = true;
  return this.save();
};

// Method to toggle active status
addressSchema.methods.toggleStatus = function() {
  this.isActive = !this.isActive;
  return this.save();
};

// Method to update address
addressSchema.methods.updateAddress = function(addressData) {
  Object.keys(addressData).forEach(key => {
    if (this.schema.paths[key] && key !== 'user' && key !== '_id') {
      this[key] = addressData[key];
    }
  });
  return this.save();
};

// Static method to get user's default address
addressSchema.statics.getDefaultAddress = function(userId) {
  return this.findOne({ 
    user: userId, 
    isDefault: true, 
    isActive: true 
  });
};

// Static method to get user's addresses by type
addressSchema.statics.getByType = function(userId, addressType) {
  return this.find({ 
    user: userId, 
    addressType, 
    isActive: true 
  }).sort({ isDefault: -1, createdAt: -1 });
};

// Static method to get all user addresses
addressSchema.statics.getUserAddresses = function(userId) {
  return this.find({ 
    user: userId, 
    isActive: true 
  }).sort({ isDefault: -1, addressType: 1, createdAt: -1 });
};

// Static method to get user's active addresses
addressSchema.statics.getActiveAddresses = function(userId) {
  return this.find({ 
    user: userId, 
    isActive: true 
  }).sort({ isDefault: -1, addressType: 1, createdAt: -1 });
};

// Static method to check if user has default address
addressSchema.statics.hasDefaultAddress = function(userId) {
  return this.exists({ 
    user: userId, 
    isDefault: true, 
    isActive: true 
  });
};

// Static method to get address count by type
addressSchema.statics.getAddressCountByType = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), isActive: true } },
    { $group: { _id: '$addressType', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
};

// Pre-save middleware
addressSchema.pre('save', async function(next) {
  // If this address is being set as default, unset others
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  
  // Ensure only one default address per user
  if (this.isDefault) {
    const existingDefault = await this.constructor.findOne({
      user: this.user,
      isDefault: true,
      _id: { $ne: this._id }
    });
    
    if (existingDefault) {
      existingDefault.isDefault = false;
      await existingDefault.save();
    }
  }
  
  next();
});

// Pre-remove middleware
addressSchema.pre('remove', async function(next) {
  // If removing default address, set another as default
  if (this.isDefault) {
    const alternativeAddress = await this.constructor.findOne({
      user: this.user,
      _id: { $ne: this._id },
      isActive: true
    });
    
    if (alternativeAddress) {
      alternativeAddress.isDefault = true;
      await alternativeAddress.save();
    }
  }
  
  next();
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
