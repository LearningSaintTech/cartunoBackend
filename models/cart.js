const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 99
  },
  selectedVariant: {
    size: {
      type: String,
      required: true
    },
    color: {
      name: {
        type: String,
        required: true
      },
      hexCode: String
    }
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
cartSchema.index({ user: 1, 'items.item': 1, 'items.selectedVariant.size': 1, 'items.selectedVariant.color.name': 1 }, { unique: true });

// Virtual for total items count
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for subtotal (before discounts)
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual for total discount
cartSchema.virtual('totalDiscount').get(function() {
  return this.items.reduce((total, item) => {
    const discount = item.price - item.discountPrice;
    return total + (discount * item.quantity);
  }, 0);
});

// Virtual for total amount (after discounts)
cartSchema.virtual('totalAmount').get(function() {
  return this.items.reduce((total, item) => {
    const finalPrice = item.discountPrice > 0 ? item.discountPrice : item.price;
    return total + (finalPrice * item.quantity);
  }, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = async function(itemId, quantity, variant, notes = '') {
  // Check if item with same variant already exists
  const existingItem = this.items.find(item => 
    item.item.toString() === itemId.toString() &&
    item.selectedVariant.size === variant.size &&
    item.selectedVariant.color.name === variant.color.name
  );

  if (existingItem) {
    // Update quantity if item exists
    existingItem.quantity = Math.min(existingItem.quantity + quantity, 99);
    existingItem.notes = notes || existingItem.notes;
    existingItem.addedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      item: itemId,
      quantity: quantity,
      selectedVariant: variant,
      notes: notes
    });
  }

  this.lastUpdated = new Date();
  return await this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = async function(itemId, variant, newQuantity) {
  const item = this.items.find(item => 
    item.item.toString() === itemId.toString() &&
    item.selectedVariant.size === variant.size &&
    item.selectedVariant.color.name === variant.color.name
  );

  if (!item) {
    throw new Error('Item not found in cart');
  }

  if (newQuantity <= 0) {
    // Remove item if quantity is 0 or negative
    this.items = this.items.filter(cartItem => cartItem !== item);
  } else {
    item.quantity = Math.min(newQuantity, 99);
  }

  this.lastUpdated = new Date();
  return await this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = async function(itemId, variant) {
  this.items = this.items.filter(item => 
    !(item.item.toString() === itemId.toString() &&
      item.selectedVariant.size === variant.size &&
      item.selectedVariant.color.name === variant.color.name)
  );

  this.lastUpdated = new Date();
  return await this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = async function() {
  this.items = [];
  this.lastUpdated = new Date();
  return await this.save();
};

// Method to update item notes
cartSchema.methods.updateItemNotes = async function(itemId, variant, notes) {
  const item = this.items.find(item => 
    item.item.toString() === itemId.toString() &&
    item.selectedVariant.size === variant.size &&
    item.selectedVariant.color.name === variant.color.name
  );

  if (!item) {
    throw new Error('Item not found in cart');
  }

  item.notes = notes;
  this.lastUpdated = new Date();
  return await this.save();
};

// Method to toggle cart status
cartSchema.methods.toggleStatus = async function() {
  this.isActive = !this.isActive;
  this.lastUpdated = new Date();
  return await this.save();
};

// Method to apply discount to cart
cartSchema.methods.applyDiscount = async function(discountPercentage) {
  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Invalid discount percentage');
  }

  this.items.forEach(item => {
    if (item.discountPrice === 0) {
      item.discountPrice = item.price * (1 - discountPercentage / 100);
    }
  });

  this.lastUpdated = new Date();
  return await this.save();
};

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId, isActive: true });
  
  if (!cart) {
    cart = new this({ user: userId });
    await cart.save();
  }
  
  return cart;
};

// Static method to get cart with populated items
cartSchema.statics.getCartWithItems = async function(userId) {
  return await this.findOne({ user: userId, isActive: true })
    .populate({
      path: 'items.item',
      select: 'name price discountPrice thumbnailImage isActive variants',
      match: { isActive: true }
    })
    .populate('user', 'firstname lastname');
};

// Static method to check if item is in user's cart
cartSchema.statics.isItemInCart = async function(userId, itemId, variant) {
  const cart = await this.findOne({
    user: userId,
    'items.item': itemId,
    'items.selectedVariant.size': variant.size,
    'items.selectedVariant.color.name': variant.color.name,
    isActive: true
  });
  
  return !!cart;
};

// Static method to get cart statistics
cartSchema.statics.getCartStats = async function(userId) {
  const cart = await this.findOne({ user: userId, isActive: true });
  
  if (!cart) {
    return {
      totalItems: 0,
      uniqueItems: 0,
      subtotal: 0,
      totalDiscount: 0,
      totalAmount: 0
    };
  }

  return {
    totalItems: cart.totalItems,
    uniqueItems: cart.items.length,
    subtotal: Math.round(cart.subtotal * 100) / 100,
    totalDiscount: Math.round(cart.totalDiscount * 100) / 100,
    totalAmount: Math.round(cart.totalAmount * 100) / 100
  };
};

// Pre-save middleware to update prices from item data
cartSchema.pre('save', async function(next) {
  if (this.isModified('items')) {
    // Update prices for new items
    for (const cartItem of this.items) {
      if (!cartItem.price || cartItem.price === 0) {
        try {
          const item = await mongoose.model('Item').findById(cartItem.item);
          if (item) {
            cartItem.price = item.price;
            cartItem.discountPrice = item.discountPrice || 0;
          }
        } catch (error) {
          console.error('Error updating cart item price:', error);
        }
      }
    }
  }
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
