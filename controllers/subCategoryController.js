const SubCategory = require('../models/subCategory');
const Category = require('../models/category');
const { uploadImageToS3, deleteFromS3 } = require('../utils/s3Upload');
const { apiResponse } = require('../utils/apiResponse');

// Create new subcategory
const createSubCategory = async (req, res) => {
  console.log('=== createSubCategory called ===');
  console.log('Request body:', req.body);
  console.log('Image file:', req.file ? 'Present' : 'Not present');
  
  try {
    const { name, description, category, sortOrder } = req.body;
    const image = req.file;
    console.log('Extracted data - name:', name, 'description:', description, 'category:', category, 'sortOrder:', sortOrder);

    if (!name || !category) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json(
        apiResponse(400, false, 'Name and category are required')
      );
    }

    if (!image) {
      console.log('Validation failed: Missing image');
      return res.status(400).json(
        apiResponse(400, false, 'Subcategory image is required')
      );
    }

    console.log('Input validation passed');

    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      console.log('Category not found:', category);
      return res.status(400).json(
        apiResponse(400, false, 'Category does not exist')
      );
    }

    console.log('Category found:', categoryExists._id);

    // Check if subcategory name already exists within the same category
    const existingSubCategory = await SubCategory.findOne({ 
      category, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existingSubCategory) {
      console.log('Subcategory name already exists in category:', existingSubCategory._id);
      return res.status(400).json(
        apiResponse(400, false, 'Subcategory with this name already exists in the selected category')
      );
    }

    console.log('Subcategory name is unique in category, proceeding with creation');

    // Upload image to S3
    console.log('Uploading image to S3...');
    const imageUrl = await uploadImageToS3(image, 'subcategories');
    console.log('Image uploaded to S3:', imageUrl);

    // Create new subcategory
    const subCategory = new SubCategory({
      name,
      description,
      image: imageUrl,
      category,
      sortOrder: sortOrder || 0
    });
    console.log('New subcategory instance created:', subCategory);

    await subCategory.save();
    console.log('Subcategory saved successfully:', subCategory._id);

    // Populate category details
    await subCategory.populate('category', 'name description image');
    console.log('Category details populated');

    res.status(201).json(
      apiResponse(201, true, 'Subcategory created successfully', subCategory)
    );

  } catch (error) {
    console.error('Create subcategory error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to create subcategory')
    );
  }
};

// Get all subcategories
const getAllSubCategories = async (req, res) => {
  console.log('=== getAllSubCategories called ===');
  console.log('Query parameters:', req.query);
  
  try {
    const { page = 1, limit = 10, sortBy = 'sortOrder', sortOrder = 1, isActive, category } = req.query;
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'isActive:', isActive, 'category:', category);

    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('Added isActive filter:', query.isActive);
    }
    if (category) {
      query.category = category;
      console.log('Added category filter:', category);
    }

    console.log('Final query:', query);

    // Build sort object
    const sort = {};
    sort[sortBy] = parseInt(sortOrder);
    console.log('Sort object:', sort);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    const subCategories = await SubCategory.find(query)
      .populate('category', 'name description image')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Retrieved subcategories count:', subCategories.length);

    const total = await SubCategory.countDocuments(query);
    console.log('Total subcategories count:', total);

    res.status(200).json(
      apiResponse(200, true, 'Subcategories retrieved successfully', {
        subCategories,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve subcategories')
    );
  }
};

// Get subcategory by ID
const getSubCategoryById = async (req, res) => {
  console.log('=== getSubCategoryById called ===');
  console.log('Subcategory ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findById(id).populate('category', 'name description image');
    if (!subCategory) {
      console.log('Subcategory not found:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Subcategory not found')
      );
    }

    console.log('Subcategory found:', subCategory._id);
    res.status(200).json(
      apiResponse(200, true, 'Subcategory retrieved successfully', subCategory)
    );

  } catch (error) {
    console.error('Get subcategory error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve subcategory')
    );
  }
};

// Update subcategory
const updateSubCategory = async (req, res) => {
  console.log('=== updateSubCategory called ===');
  console.log('Subcategory ID:', req.params.id);
  console.log('Update data:', req.body);
  console.log('Image file:', req.file ? 'Present' : 'Not present');
  
  try {
    const { id } = req.params;
    const { name, description, category, sortOrder, isActive } = req.body;
    const image = req.file;
    console.log('Extracted update data - name:', name, 'description:', description, 'category:', category, 'sortOrder:', sortOrder, 'isActive:', isActive);

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      console.log('Subcategory not found for update:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Subcategory not found')
      );
    }

    console.log('Subcategory found for update:', subCategory._id);

    // Check if category is being changed and if it exists
    if (category && category !== subCategory.category.toString()) {
      console.log('Category is being changed from:', subCategory.category, 'to:', category);
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        console.log('New category not found:', category);
        return res.status(400).json(
          apiResponse(400, false, 'Category does not exist')
        );
      }
      subCategory.category = category;
      console.log('Category updated successfully');
    }

    // Check if name is being changed and if it conflicts with existing subcategory
    if (name && name !== subCategory.name) {
      console.log('Name is being changed from:', subCategory.name, 'to:', name);
      const existingSubCategory = await SubCategory.findOne({ 
        category: subCategory.category,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingSubCategory) {
        console.log('Subcategory name conflict found:', existingSubCategory._id);
        return res.status(400).json(
          apiResponse(400, false, 'Subcategory with this name already exists in the selected category')
        );
      }
      subCategory.name = name;
      console.log('Name updated successfully');
    }

    // Update other fields
    if (description !== undefined) {
      subCategory.description = description;
      console.log('Description updated');
    }
    if (sortOrder !== undefined) {
      subCategory.sortOrder = sortOrder;
      console.log('Sort order updated');
    }
    if (isActive !== undefined) {
      subCategory.isActive = isActive;
      console.log('Active status updated');
    }

    // Handle image update if provided
    if (image) {
      console.log('Processing image update...');
      try {
        // Upload new image to S3
        console.log('Uploading new image to S3...');
        const imageUrl = await uploadImageToS3(image, 'subcategories');
        console.log('New image uploaded to S3:', imageUrl);

        // Delete old image from S3
        if (subCategory.image) {
          console.log('Deleting old image from S3:', subCategory.image);
          try {
            await deleteFromS3(subCategory.image);
            console.log('Old image deleted from S3 successfully');
          } catch (deleteError) {
            console.error('Failed to delete old subcategory image:', deleteError);
          }
        }

        subCategory.image = imageUrl;
        console.log('Image updated successfully');
      } catch (imageError) {
        console.error('Subcategory image upload error:', imageError);
        return res.status(500).json(
          apiResponse(500, false, 'Failed to upload subcategory image')
        );
      }
    }

    await subCategory.save();
    console.log('Subcategory updated and saved successfully');

    // Populate category details
    await subCategory.populate('category', 'name description image');
    console.log('Category details populated');

    res.status(200).json(
      apiResponse(200, true, 'Subcategory updated successfully', subCategory)
    );

  } catch (error) {
    console.error('Update subcategory error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update subcategory')
    );
  }
};

// Delete subcategory
const deleteSubCategory = async (req, res) => {
  console.log('=== deleteSubCategory called ===');
  console.log('Subcategory ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      console.log('Subcategory not found for deletion:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Subcategory not found')
      );
    }

    console.log('Subcategory found for deletion:', subCategory._id);

    // Delete image from S3
    if (subCategory.image) {
      console.log('Deleting image from S3:', subCategory.image);
      try {
        await deleteFromS3(subCategory.image);
        console.log('Image deleted from S3 successfully');
      } catch (deleteError) {
        console.error('Failed to delete subcategory image from S3:', deleteError);
      }
    }

    await SubCategory.findByIdAndDelete(id);
    console.log('Subcategory deleted from database successfully');

    res.status(200).json(
      apiResponse(200, true, 'Subcategory deleted successfully')
    );

  } catch (error) {
    console.error('Delete subcategory error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to delete subcategory')
    );
  }
};

// Toggle subcategory status
const toggleSubCategoryStatus = async (req, res) => {
  console.log('=== toggleSubCategoryStatus called ===');
  console.log('Subcategory ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      console.log('Subcategory not found for status toggle:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Subcategory not found')
      );
    }

    console.log('Subcategory found, current status:', subCategory.isActive);
    await subCategory.toggleStatus();
    console.log('Subcategory status toggled successfully');

    // Populate category details
    await subCategory.populate('category', 'name description image');
    console.log('Category details populated');

    res.status(200).json(
      apiResponse(200, true, 'Subcategory status toggled successfully', subCategory)
    );

  } catch (error) {
    console.error('Toggle subcategory status error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to toggle subcategory status')
    );
  }
};

// Get active subcategories by category
const getActiveByCategory = async (req, res) => {
  console.log('=== getActiveByCategory called ===');
  console.log('Category ID:', req.params.categoryId);
  
  try {
    const { categoryId } = req.params;

    // Check if category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      console.log('Category not found:', categoryId);
      return res.status(404).json(
        apiResponse(404, false, 'Category not found')
      );
    }

    console.log('Category found:', categoryExists._id);

    const subCategories = await SubCategory.getActiveByCategory(categoryId);
    console.log('Retrieved active subcategories count:', subCategories.length);

    res.status(200).json(
      apiResponse(200, true, 'Active subcategories retrieved successfully', subCategories)
    );

  } catch (error) {
    console.error('Get active subcategories by category error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve active subcategories')
    );
  }
};

// Get all subcategories by category (for admin - includes inactive)
const getSubcategoriesByCategory = async (req, res) => {
  console.log('=== getSubcategoriesByCategory called ===');
  console.log('Category ID:', req.params.categoryId);
  
  try {
    const { categoryId } = req.params;

    // Check if category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      console.log('Category not found:', categoryId);
      return res.status(404).json(
        apiResponse(404, false, 'Category not found')
      );
    }

    console.log('Category found:', categoryExists._id);

    // Get ALL subcategories (active and inactive) for this category
    const subCategories = await SubCategory.find({ category: categoryId })
      .populate('category', 'name description image')
      .sort({ sortOrder: 1, name: 1 });
    
    console.log('Retrieved all subcategories count:', subCategories.length);

    res.status(200).json(
      apiResponse(200, true, 'Subcategories retrieved successfully', {
        subcategories: subCategories,
        total: subCategories.length
      })
    );

  } catch (error) {
    console.error('Get subcategories by category error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve subcategories')
    );
  }
};

// Get all subcategories with category details
const getAllWithCategory = async (req, res) => {
  console.log('=== getAllWithCategory called ===');
  
  try {
    const subCategories = await SubCategory.getAllWithCategory();
    console.log('Retrieved subcategories with category details count:', subCategories.length);

    res.status(200).json(
      apiResponse(200, true, 'Subcategories with category details retrieved successfully', subCategories)
    );

  } catch (error) {
    console.error('Get subcategories with category details error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve subcategories with category details')
    );
  }
};

// Search subcategories
const searchSubCategories = async (req, res) => {
  console.log('=== searchSubCategories called ===');
  console.log('Search query:', req.query.q);
  console.log('Category filter:', req.query.category);
  console.log('Pagination:', req.query.page, req.query.limit);
  
  try {
    const { q, category, page = 1, limit = 10 } = req.query;

    if (!q) {
      console.log('Validation failed: Missing search query');
      return res.status(400).json(
        apiResponse(400, false, 'Search query is required')
      );
    }

    const searchRegex = new RegExp(q, 'i');
    console.log('Search regex created:', searchRegex);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    // Build query
    const query = {
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    };

    if (category) {
      query.category = category;
      console.log('Added category filter:', category);
    }

    console.log('Final search query:', query);

    const subCategories = await SubCategory.find(query)
      .populate('category', 'name description image')
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Search results count:', subCategories.length);

    const total = await SubCategory.countDocuments(query);
    console.log('Total search results:', total);

    res.status(200).json(
      apiResponse(200, true, 'Subcategories search completed', {
        subCategories,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Search subcategories error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to search subcategories')
    );
  }
};

module.exports = {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  toggleSubCategoryStatus,
  getActiveByCategory,
  getSubcategoriesByCategory,
  getAllWithCategory,
  searchSubCategories
};
