const mongoose = require('mongoose');

const globalFilterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    unique: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  values: [{
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    count: {
      type: Number,
      min: 0,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for faster queries
globalFilterSchema.index({ key: 1 });
globalFilterSchema.index({ category: 1 });
globalFilterSchema.index({ isActive: 1 });
globalFilterSchema.index({ sortOrder: 1 });
globalFilterSchema.index({ 'values.value': 1 });

// Virtual for total values count
globalFilterSchema.virtual('totalValues').get(function() {
  return this.values.length;
});

// Virtual for active values count
globalFilterSchema.virtual('activeValuesCount').get(function() {
  return this.values.filter(v => v.isActive).length;
});

// Method to add value to filter
globalFilterSchema.methods.addValue = function(value, displayName, sortOrder = 0) {
  const existingValue = this.values.find(v => v.value === value);
  if (existingValue) {
    throw new Error('Value already exists in this filter');
  }
  
  this.values.push({
    value,
    displayName,
    sortOrder,
    count: 0,
    isActive: true
  });
  
  // Sort values by sortOrder
  this.values.sort((a, b) => a.sortOrder - b.sortOrder);
  
  return this.save();
};

// Method to update value
globalFilterSchema.methods.updateValue = function(oldValue, newValue, newDisplayName) {
  const valueObj = this.values.find(v => v.value === oldValue);
  if (!valueObj) {
    throw new Error('Value not found');
  }
  
  valueObj.value = newValue;
  valueObj.displayName = newDisplayName;
  
  return this.save();
};

// Method to remove value
globalFilterSchema.methods.removeValue = function(value) {
  this.values = this.values.filter(v => v.value !== value);
  return this.save();
};

// Method to toggle value active status
globalFilterSchema.methods.toggleValueStatus = function(value) {
  const valueObj = this.values.find(v => v.value === value);
  if (!valueObj) {
    throw new Error('Value not found');
  }
  
  valueObj.isActive = !valueObj.isActive;
  return this.save();
};

// Method to update value count
globalFilterSchema.methods.updateValueCount = function(value, newCount) {
  const valueObj = this.values.find(v => v.value === value);
  if (!valueObj) {
    throw new Error('Value not found');
  }
  
  valueObj.count = newCount;
  return this.save();
};

// Method to increment value count
globalFilterSchema.methods.incrementValueCount = function(value) {
  const valueObj = this.values.find(v => v.value === value);
  if (!valueObj) {
    throw new Error('Value not found');
  }
  
  valueObj.count += 1;
  return this.save();
};

// Method to decrement value count
globalFilterSchema.methods.decrementValueCount = function(value) {
  const valueObj = this.values.find(v => v.value === value);
  if (!valueObj) {
    throw new Error('Value not found');
  }
  
  if (valueObj.count > 0) {
    valueObj.count -= 1;
  }
  return this.save();
};

// Method to reorder values
globalFilterSchema.methods.reorderValues = function(valueOrder) {
  // valueOrder should be an array of values in the desired order
  const newValues = [];
  
  valueOrder.forEach((value, index) => {
    const valueObj = this.values.find(v => v.value === value);
    if (valueObj) {
      valueObj.sortOrder = index;
      newValues.push(valueObj);
    }
  });
  
  // Add any remaining values that weren't in the order array
  this.values.forEach(valueObj => {
    if (!valueOrder.includes(valueObj.value)) {
      newValues.push(valueObj);
    }
  });
  
  this.values = newValues;
  return this.save();
};

// Static method to get filters by category
globalFilterSchema.statics.getByCategory = function(categoryId) {
  return this.find({ 
    category: categoryId, 
    isActive: true 
  }).sort({ sortOrder: 1, key: 1 });
};

// Static method to get all active filters
globalFilterSchema.statics.getActiveFilters = function() {
  return this.find({ 
    isActive: true 
  }).sort({ sortOrder: 1, key: 1 });
};

// Static method to get filter by key
globalFilterSchema.statics.getByKey = function(key) {
  return this.findOne({ 
    key: key.toLowerCase(), 
    isActive: true 
  });
};

// Static method to get popular values
globalFilterSchema.statics.getPopularValues = function(key, limit = 10) {
  return this.findOne({ 
    key: key.toLowerCase(), 
    isActive: true 
  }).then(filter => {
    if (!filter) return null;
    
    return filter.values
      .filter(v => v.isActive)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  });
};

// Static method to get filters with populated category details
globalFilterSchema.statics.getFiltersWithCategory = function() {
  return this.find({ isActive: true })
    .populate('category', 'name description image')
    .sort({ sortOrder: 1, key: 1 });
};

// Static method to get filters by category with populated category details
globalFilterSchema.statics.getByCategoryWithDetails = function(categoryId) {
  return this.find({ 
    category: categoryId, 
    isActive: true 
  })
    .populate('category', 'name description image')
    .sort({ sortOrder: 1, key: 1 });
};

// Pre-save middleware
globalFilterSchema.pre('save', function(next) {
  // Ensure key is lowercase
  this.key = this.key.toLowerCase();
  
  // Validate unique values within the filter
  const values = this.values.map(v => v.value);
  const uniqueValues = new Set(values);
  if (values.length !== uniqueValues.size) {
    throw new Error('Duplicate values found in filter');
  }
  
  // Sort values by sortOrder
  this.values.sort((a, b) => a.sortOrder - b.sortOrder);
  
  next();
});

const GlobalFilter = mongoose.model('GlobalFilter', globalFilterSchema);

module.exports = GlobalFilter;
