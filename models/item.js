const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  price: {
    type: Number,
    min: 0,
    required: true
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  thumbnailImage: {
    type: String,
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  },
  // New filters field for item-specific filtering
  filters: [{
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      lowercase: true
    },
    values: [{
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      lowercase: true
    }],
    displayValues: [{
      type: String,
      trim: true,
      maxlength: 100
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  }],
  keyHighlights: [{
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    }
  }],
  variants: [{
    size: {
      type: String,
      required: true,
      trim: true
    },
    colors: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      hexCode: {
        type: String,
        trim: true,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color hex code']
      },
      images: [{
        type: String,
       }],
      sku: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
      },
      stock: {
        type: Number,
        min: 0,
        default: 0
      }
    }]
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
itemSchema.index({ name: 1 });
itemSchema.index({ price: 1 });
itemSchema.index({ 'variants.colors.sku': 1 });
itemSchema.index({ categoryId: 1 });
itemSchema.index({ subcategoryId: 1 });
// New indexes for filtering
itemSchema.index({ 'filters.key': 1, 'filters.values': 1 });
itemSchema.index({ 'filters.key': 1 });

// Virtual for final price
itemSchema.virtual('finalPrice').get(function() {
  if (this.discountPrice && this.discountPrice > 0) {
    return this.discountPrice;
  }
  if (this.discountPercentage > 0) {
    return this.price * (1 - this.discountPercentage / 100);
  }
  return this.price;
});

// Virtual for total stock across all variants and colors
itemSchema.virtual('totalStock').get(function() {
  let total = 0;
  this.variants.forEach(variant => {
    variant.colors.forEach(color => {
      total += color.stock;
    });
  });
  return total;
});

// Method to update stock for specific variant and color
itemSchema.methods.updateStock = function(size, colorName, newStock) {
  const variant = this.variants.find(v => v.size === size);
  if (variant) {
    const color = variant.colors.find(c => c.name === colorName);
    if (color) {
      color.stock = newStock;
      return this.save();
    }
  }
  throw new Error('Variant or color not found');
};

// Method to add variant
itemSchema.methods.addVariant = function(size, colors) {
  const existingVariant = this.variants.find(v => v.size === size);
  if (existingVariant) {
    existingVariant.colors.push(...colors);
  } else {
    this.variants.push({ size, colors });
  }
  return this.save();
};

// Method to add color to existing variant
itemSchema.methods.addColorToVariant = function(size, colorData) {
  const variant = this.variants.find(v => v.size === size);
  if (variant) {
    variant.colors.push(colorData);
    return this.save();
  }
  throw new Error('Variant not found');
};

// Method to add key highlight
itemSchema.methods.addKeyHighlight = function(key, value) {
  this.keyHighlights.push({ key, value });
  return this.save();
};

// Method to update key highlight
itemSchema.methods.updateKeyHighlight = function(key, newValue) {
  const highlight = this.keyHighlights.find(h => h.key === key);
  if (highlight) {
    highlight.value = newValue;
    return this.save();
  }
  throw new Error('Key highlight not found');
};

// Method to remove key highlight
itemSchema.methods.removeKeyHighlight = function(key) {
  this.keyHighlights = this.keyHighlights.filter(h => h.key !== key);
  return this.save();
};

// New methods for filter management
itemSchema.methods.addFilter = function(key, values, displayValues = null) {
  // Remove existing filter with same key
  this.filters = this.filters.filter(f => f.key !== key);
  
  // Add new filter
  this.filters.push({
    key: key.toLowerCase(),
    values: Array.isArray(values) ? values.map(v => v.toLowerCase()) : [values.toLowerCase()],
    displayValues: displayValues || (Array.isArray(values) ? values : [values]),
    isActive: true,
    sortOrder: this.filters.length
  });
  
  return this.save();
};

itemSchema.methods.updateFilter = function(key, values, displayValues = null) {
  return this.addFilter(key, values, displayValues);
};

itemSchema.methods.removeFilter = function(key) {
  this.filters = this.filters.filter(f => f.key !== key);
  return this.save();
};

itemSchema.methods.getFilterValue = function(key) {
  const filter = this.filters.find(f => f.key === key);
  return filter ? filter.values : [];
};

itemSchema.methods.toggleFilterStatus = function(key) {
  const filter = this.filters.find(f => f.key === key);
  if (filter) {
    filter.isActive = !filter.isActive;
    return this.save();
  }
  throw new Error('Filter not found');
};

itemSchema.methods.updateFilterSortOrder = function(key, newSortOrder) {
  const filter = this.filters.find(f => f.key === key);
  if (filter) {
    filter.sortOrder = newSortOrder;
    // Sort filters by sortOrder
    this.filters.sort((a, b) => a.sortOrder - b.sortOrder);
    return this.save();
  }
  throw new Error('Filter not found');
};

itemSchema.methods.addFilterValue = function(key, value, displayValue = null) {
  const filter = this.filters.find(f => f.key === key);
  if (filter) {
    if (!filter.values.includes(value.toLowerCase())) {
      filter.values.push(value.toLowerCase());
      filter.displayValues.push(displayValue || value);
    }
    return this.save();
  }
  throw new Error('Filter not found');
};

itemSchema.methods.removeFilterValue = function(key, value) {
  const filter = this.filters.find(f => f.key === key);
  if (filter) {
    const index = filter.values.indexOf(value.toLowerCase());
    if (index > -1) {
      filter.values.splice(index, 1);
      filter.displayValues.splice(index, 1);
      return this.save();
    }
  }
  throw new Error('Filter or value not found');
};

itemSchema.methods.bulkUpdateFilters = function(filterUpdates) {
  // filterUpdates should be an array of { key, values, displayValues, isActive, sortOrder }
  filterUpdates.forEach(update => {
    const existingFilter = this.filters.find(f => f.key === update.key);
    if (existingFilter) {
      // Update existing filter
      if (update.values) {
        existingFilter.values = update.values.map(v => v.toLowerCase());
        existingFilter.displayValues = update.displayValues || update.values;
      }
      if (update.isActive !== undefined) existingFilter.isActive = update.isActive;
      if (update.sortOrder !== undefined) existingFilter.sortOrder = update.sortOrder;
    } else {
      // Add new filter
      this.filters.push({
        key: update.key.toLowerCase(),
        values: update.values.map(v => v.toLowerCase()),
        displayValues: update.displayValues || update.values,
        isActive: update.isActive !== undefined ? update.isActive : true,
        sortOrder: update.sortOrder !== undefined ? update.sortOrder : this.filters.length
      });
    }
  });
  
  // Sort filters by sortOrder
  this.filters.sort((a, b) => a.sortOrder - b.sortOrder);
  
  return this.save();
};

// Static method to get items by price range
itemSchema.statics.getByPriceRange = function(minPrice, maxPrice) {
  return this.find({
    price: { $gte: minPrice, $lte: maxPrice }
  }).sort({ price: 1 });
};

// Static method to get discounted items
itemSchema.statics.getDiscountedItems = function() {
  return this.find({
    $or: [
      { discountPrice: { $gt: 0 } },
      { discountPercentage: { $gt: 0 } }
    ]
  }).sort({ discountPercentage: -1 });
};

// New static method for advanced filtering
itemSchema.statics.getByFilters = function(filterCriteria, options = {}) {
  const query = {};
  
  // Apply filter criteria
  if (filterCriteria && Object.keys(filterCriteria).length > 0) {
    const filterQueries = [];
    
    Object.entries(filterCriteria).forEach(([key, values]) => {
      if (values && values.length > 0) {
        // Support both single value and array of values
        const valueArray = Array.isArray(values) ? values : [values];
        
        // Create query for this filter key
        const filterQuery = {
          'filters.key': key,
          'filters.values': { $in: valueArray }
        };
        
        filterQueries.push(filterQuery);
      }
    });
    
    // If we have filter queries, add them to main query
    if (filterQueries.length > 0) {
      query.$and = filterQueries;
    }
  }
  
  // Apply other query options
  if (options.categoryId) {
    query.categoryId = options.categoryId;
  }
  
  if (options.subcategoryId) {
    query.subcategoryId = options.subcategoryId;
  }
  
  if (options.minPrice || options.maxPrice) {
    query.price = {};
    if (options.minPrice) query.price.$gte = options.minPrice;
    if (options.maxPrice) query.price.$lte = options.maxPrice;
  }
  
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { description: { $regex: options.search, $options: 'i' } }
    ];
  }
  
  // Build sort object
  const sort = {};
  if (options.sortBy) {
    sort[options.sortBy] = options.sortOrder || 1;
  } else {
    sort.createdAt = -1; // Default sort by creation date
  }
  
  // Apply pagination
  const limit = options.limit || 10;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to get available filter options
itemSchema.statics.getAvailableFilters = function(categoryId = null, subcategoryId = null) {
  const matchStage = {};
  
  if (categoryId) {
    matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
  }
  
  if (subcategoryId) {
    matchStage.subcategoryId = new mongoose.Types.ObjectId(subcategoryId);
  }
  
  return this.aggregate([
    { $match: matchStage },
    { $unwind: '$filters' },
    {
      $group: {
        _id: '$filters.key',
        values: { $addToSet: '$filters.values' },
        displayValues: { $addToSet: '$filters.displayValues' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        key: '$_id',
        values: { $reduce: { input: '$values', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } },
        displayValues: { $reduce: { input: '$displayValues', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } },
        count: 1
      }
    },
    {
      $project: {
        key: 1,
        values: { $setUnion: '$values' },
        displayValues: { $setUnion: '$displayValues' },
        count: 1
      }
    },
    { $sort: { key: 1 } }
  ]);
};

// New static method for getting items by specific filter combinations
itemSchema.statics.getByFilterCombination = function(filterCombinations, options = {}) {
  const query = {};
  
  if (filterCombinations && Object.keys(filterCombinations).length > 0) {
    const filterQueries = [];
    
    Object.entries(filterCombinations).forEach(([key, values]) => {
      if (values && values.length > 0) {
        const valueArray = Array.isArray(values) ? values : [values];
        
        // Create query for this filter key with case-insensitive matching
        const filterQuery = {
          'filters.key': key.toLowerCase(),
          'filters.values': { $in: valueArray.map(v => v.toLowerCase()) }
        };
        
        filterQueries.push(filterQuery);
      }
    });
    
    if (filterQueries.length > 0) {
      query.$and = filterQueries;
    }
  }
  
  // Apply other query options
  if (options.categoryId) {
    query.categoryId = options.categoryId;
  }
  
  if (options.subcategoryId) {
    query.subcategoryId = options.subcategoryId;
  }
  
  if (options.minPrice || options.maxPrice) {
    query.price = {};
    if (options.minPrice) query.price.$gte = options.minPrice;
    if (options.maxPrice) query.price.$lte = options.maxPrice;
  }
  
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { description: { $regex: options.search, $options: 'i' } }
    ];
  }
  
  // Only include items with active filters
  query['filters.isActive'] = true;
  
  // Build sort object
  const sort = {};
  if (options.sortBy) {
    sort[options.sortBy] = options.sortOrder || 1;
  } else {
    sort.createdAt = -1; // Default sort by creation date
  }
  
  // Apply pagination
  const limit = options.limit || 10;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware
itemSchema.pre('save', function(next) {
  // Validate that categoryId and subcategoryId are provided
  if (!this.categoryId) {
    throw new Error('Category ID is required');
  }
  if (!this.subcategoryId) {
    throw new Error('Subcategory ID is required');
  }

  // Validate that colors array doesn't exceed 5 images
  this.variants.forEach(variant => {
    variant.colors.forEach(color => {
      if (color.images.length > 5) {
        color.images = color.images.slice(0, 5);
      }
    });
  });

  // Validate unique SKUs
  const allSkus = [];
  this.variants.forEach(variant => {
    variant.colors.forEach(color => {
      allSkus.push(color.sku);
    });
  });
  
  const uniqueSkus = new Set(allSkus);
  if (allSkus.length !== uniqueSkus.size) {
    throw new Error('Duplicate SKUs found');
  }

  // Validate unique key highlights keys
  if (this.keyHighlights && this.keyHighlights.length > 0) {
    const keys = this.keyHighlights.map(h => h.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      throw new Error('Duplicate key highlight keys found');
    }
  }

  // Validate unique filter keys
  if (this.filters && this.filters.length > 0) {
    const keys = this.filters.map(f => f.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      throw new Error('Duplicate filter keys found');
    }
    
    // Validate filter structure
    this.filters.forEach(filter => {
      if (!filter.key || !filter.values || filter.values.length === 0) {
        throw new Error('Each filter must have a key and at least one value');
      }
      
      // Ensure values and displayValues have same length
      if (filter.displayValues && filter.displayValues.length !== filter.values.length) {
        throw new Error('Filter displayValues must have same length as values');
      }
      
      // Ensure values are lowercase
      filter.key = filter.key.toLowerCase();
      filter.values = filter.values.map(v => v.toLowerCase());
      
      // Set default values for new fields
      if (filter.isActive === undefined) filter.isActive = true;
      if (filter.sortOrder === undefined) filter.sortOrder = 0;
    });
    
    // Sort filters by sortOrder
    this.filters.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  next();
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
