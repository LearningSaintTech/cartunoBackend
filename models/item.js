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
        maxlength: 5
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

// Pre-save middleware
itemSchema.pre('save', function(next) {
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

  next();
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
