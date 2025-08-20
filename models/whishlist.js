const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
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
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
wishlistSchema.index({ user: 1, 'items.item': 1 }, { unique: true });

// Virtual for item count
wishlistSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

// Method to add item to wishlist
wishlistSchema.methods.addItem = async function(itemId, notes = '') {
  // Check if item already exists
  const existingItem = this.items.find(item => item.item.toString() === itemId.toString());
  if (existingItem) {
    throw new Error('Item already exists in wishlist');
  }

  this.items.push({
    item: itemId,
    notes: notes
  });

  return await this.save();
};

// Method to remove item from wishlist
wishlistSchema.methods.removeItem = async function(itemId) {
  this.items = this.items.filter(item => item.item.toString() !== itemId.toString());
  return await this.save();
};

// Method to update item notes
wishlistSchema.methods.updateItemNotes = async function(itemId, notes) {
  const item = this.items.find(item => item.item.toString() === itemId.toString());
  if (!item) {
    throw new Error('Item not found in wishlist');
  }

  item.notes = notes;
  return await this.save();
};

// Method to clear wishlist
wishlistSchema.methods.clearWishlist = async function() {
  this.items = [];
  return await this.save();
};

// Method to toggle wishlist status
wishlistSchema.methods.toggleStatus = async function() {
  this.isActive = !this.isActive;
  return await this.save();
};

// Static method to get or create wishlist for user
wishlistSchema.statics.getOrCreateWishlist = async function(userId) {
  let wishlist = await this.findOne({ user: userId, isActive: true });
  
  if (!wishlist) {
    wishlist = new this({ user: userId });
    await wishlist.save();
  }
  
  return wishlist;
};

// Static method to test Item model population
wishlistSchema.statics.testItemPopulation = async function() {
  try {
    console.log('=== Testing Wishlist Item Model Population ===');
    
    // Check if Item model exists
    const ItemModel = mongoose.model('Item');
    console.log('Item model found:', !!ItemModel);
    
    // Try to find a sample item
    const sampleItem = await ItemModel.findOne();
    console.log('Sample item found:', !!sampleItem);
    if (sampleItem) {
      console.log('Sample item ID:', sampleItem._id);
      console.log('Sample item name:', sampleItem.name);
      console.log('Sample item fields:', Object.keys(sampleItem.toObject()));
    }
    
    return { success: true, itemModel: !!ItemModel, sampleItem: !!sampleItem };
  } catch (error) {
    console.error('Error testing wishlist Item model population:', error);
    return { success: false, error: error.message };
  }
};

// Static method to get wishlist with populated items
wishlistSchema.statics.getWishlistWithItems = async function(userId) {
  try {
    const wishlist = await this.findOne({ user: userId, isActive: true });
    
    if (!wishlist) {
      return null;
    }

    // Populate items with better error handling
    await wishlist.populate({
      path: 'items.item',
      select: 'name price discountPrice thumbnailImage variants categoryId subcategoryId filters keyHighlights'
    });

    // Populate user
    await wishlist.populate('user', 'firstname lastname');

    // Debug: Log populated items
    console.log('Wishlist items after population:', wishlist.items.map(item => ({
      itemId: item.item?._id || item.item,
      itemData: item.item,
      notes: item.notes
    })));

    return wishlist;
  } catch (error) {
    console.error('Error in getWishlistWithItems:', error);
    throw error;
  }
};

// Static method to check if item is in user's wishlist
wishlistSchema.statics.isItemInWishlist = async function(userId, itemId) {
  const wishlist = await this.findOne({
    user: userId,
    'items.item': itemId,
    isActive: true
  });
  
  return !!wishlist;
};

// Static method to get wishlist statistics
wishlistSchema.statics.getWishlistStats = async function(userId) {
  const wishlist = await this.findOne({ user: userId, isActive: true });
  
  if (!wishlist) {
    return {
      totalItems: 0,
      activeItems: 0,
      totalValue: 0
    };
  }

  // Get items with prices (removed isActive check on items)
  const itemsWithPrices = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), isActive: true } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'items',
        localField: 'items.item',
        foreignField: '_id',
        as: 'itemDetails'
      }
    },
    { $unwind: '$itemDetails' },
    // Removed isActive check on items since they don't have this field
    // { $match: { 'itemDetails.isActive': true } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalValue: {
          $sum: {
            $cond: [
              { $gt: ['$itemDetails.discountPrice', 0] },
              '$itemDetails.discountPrice',
              '$itemDetails.price'
            ]
          }
        }
      }
    }
  ]);

  const stats = itemsWithPrices[0] || { totalItems: 0, totalValue: 0 };
  
  return {
    totalItems: wishlist.items.length,
    activeItems: stats.totalItems,
    totalValue: Math.round(stats.totalValue * 100) / 100
  };
};

// Pre-save middleware to ensure unique items per user
wishlistSchema.pre('save', function(next) {
  // Remove duplicate items
  const uniqueItems = [];
  const seenItems = new Set();
  
  for (const item of this.items) {
    if (!seenItems.has(item.item.toString())) {
      seenItems.add(item.item.toString());
      uniqueItems.push(item);
    }
  }
  
  this.items = uniqueItems;
  next();
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
