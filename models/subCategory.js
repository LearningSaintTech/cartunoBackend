const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  image: {
    type: String,
    required: true
  },
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
  }
}, {
  timestamps: true
});

// Compound index for unique subcategory names within each category
subCategorySchema.index({ category: 1, name: 1 }, { unique: true });

// Index for faster queries
subCategorySchema.index({ category: 1 });
subCategorySchema.index({ isActive: 1 });
subCategorySchema.index({ sortOrder: 1 });

// Virtual for display name
subCategorySchema.virtual('displayName').get(function() {
  return this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
});

// Method to toggle active status
subCategorySchema.methods.toggleStatus = function() {
  this.isActive = !this.isActive;
  return this.save();
};

// Static method to get active subcategories by category
subCategorySchema.statics.getActiveByCategory = function(categoryId) {
  return this.find({ 
    category: categoryId, 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method to get all subcategories with category details
subCategorySchema.statics.getAllWithCategory = function() {
  return this.find({ isActive: true })
    .populate('category', 'name description image')
    .sort({ sortOrder: 1, name: 1 });
};

// Pre-save middleware to ensure category exists
subCategorySchema.pre('save', async function(next) {
  try {
    const Category = mongoose.model('Category');
    const categoryExists = await Category.findById(this.category);
    if (!categoryExists) {
      throw new Error('Category does not exist');
    }
    next();
  } catch (error) {
    next(error);
  }
});

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

module.exports = SubCategory;
