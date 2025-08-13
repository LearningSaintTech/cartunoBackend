const Category = require('../models/category');
const { uploadImageToS3, deleteFromS3, updateFromS3 } = require('../utils/s3Upload');
const { apiResponse } = require('../utils/apiResponse');

// Create new category
const createCategory = async (req, res) => {
  console.log('=== createCategory called ===');
  console.log('Request body:', req.body);
  console.log('Image file:', req.file ? 'Present' : 'Not present');
  
  try {
    const { name, description, sortOrder } = req.body;
    const image = req.file;
    console.log('Extracted data - name:', name, 'description:', description, 'sortOrder:', sortOrder);

    if (!name) {
      console.log('Validation failed: Category name is required');
      return res.status(400).json(
        apiResponse(400, false, 'Category name is required')
      );
    }

    if (!image) {
      console.log('Validation failed: Category image is required');
      return res.status(400).json(
        apiResponse(400, false, 'Category image is required')
      );
    }

    console.log('Input validation passed');

    // Check if category name already exists
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      console.log('Category name already exists:', existingCategory._id);
      return res.status(400).json(
        apiResponse(400, false, 'Category with this name already exists')
      );
    }

    console.log('Category name is unique, proceeding with creation');

    // Upload image to S3
    console.log('Uploading image to S3...');
    const imageUrl = await uploadImageToS3(image, 'categories');
    console.log('Image uploaded to S3:', imageUrl);

    // Create new category
    const category = new Category({
      name,
      description,
      image: imageUrl,
      sortOrder: sortOrder || 0
    });
    console.log('New category instance created:', category);

    await category.save();
    console.log('Category saved successfully:', category._id);

    res.status(201).json(
      apiResponse(201, true, 'Category created successfully', category)
    );

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to create category')
    );
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  console.log('=== getAllCategories called ===');
  console.log('Query parameters:', req.query);
  
  try {
    const { page = 1, limit = 10, sortBy = 'sortOrder', sortOrder = 1, isActive } = req.query;
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'isActive:', isActive);

    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('Added isActive filter:', query.isActive);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = parseInt(sortOrder);
    console.log('Sort object:', sort);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    const categories = await Category.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Retrieved categories count:', categories.length);

    const total = await Category.countDocuments(query);
    console.log('Total categories count:', total);

    res.status(200).json(
      apiResponse(200, true, 'Categories retrieved successfully', {
        categories,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve categories')
    );
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  console.log('=== getCategoryById called ===');
  console.log('Category ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      console.log('Category not found:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Category not found')
      );
    }

    console.log('Category found:', category._id);
    res.status(200).json(
      apiResponse(200, true, 'Category retrieved successfully', category)
    );

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve category')
    );
  }
};

// Update category
const updateCategory = async (req, res) => {
  console.log('=== updateCategory called ===');
  console.log('Category ID:', req.params.id);
  console.log('Update data:', req.body);
  console.log('Image file:', req.file ? 'Present' : 'Not present');
  
  try {
    const { id } = req.params;
    const { name, description, sortOrder, isActive } = req.body;
    const image = req.file;
    console.log('Extracted update data - name:', name, 'description:', description, 'sortOrder:', sortOrder, 'isActive:', isActive);

    const category = await Category.findById(id);
    if (!category) {
      console.log('Category not found for update:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Category not found')
      );
    }

    console.log('Category found for update:', category._id);

    // Check if name is being changed and if it conflicts with existing category
    if (name && name !== category.name) {
      console.log('Name is being changed from:', category.name, 'to:', name);
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingCategory) {
        console.log('Category name conflict found:', existingCategory._id);
        return res.status(400).json(
          apiResponse(400, false, 'Category with this name already exists')
        );
      }
      category.name = name;
      console.log('Name updated successfully');
    }

    // Update other fields
    if (description !== undefined) {
      category.description = description;
      console.log('Description updated');
    }
    if (sortOrder !== undefined) {
      category.sortOrder = sortOrder;
      console.log('Sort order updated');
    }
    if (isActive !== undefined) {
      category.isActive = isActive;
      console.log('Active status updated');
    }

    // Handle image update if provided
    if (image) {
      console.log('Processing image update...');
      try {
        // Upload new image to S3
        console.log('Uploading new image to S3...');
        const imageUrl = await uploadImageToS3(image, 'categories');
        console.log('New image uploaded to S3:', imageUrl);

        // Delete old image from S3
        if (category.image) {
          console.log('Deleting old image from S3:', category.image);
          try {
            await deleteFromS3(category.image);
            console.log('Old image deleted from S3 successfully');
          } catch (deleteError) {
            console.error('Failed to delete old category image:', deleteError);
          }
        }

        category.image = imageUrl;
        console.log('Image updated successfully');
      } catch (imageError) {
        console.error('Category image upload error:', imageError);
        return res.status(500).json(
          apiResponse(500, false, 'Failed to upload category image')
        );
      }
    }

    await category.save();
    console.log('Category updated and saved successfully');

    res.status(200).json(
      apiResponse(200, true, 'Category updated successfully', category)
    );

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update category')
    );
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  console.log('=== deleteCategory called ===');
  console.log('Category ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      console.log('Category not found for deletion:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Category not found')
      );
    }

    console.log('Category found for deletion:', category._id);

    // Delete image from S3
    if (category.image) {
      console.log('Deleting image from S3:', category.image);
      try {
        await deleteFromS3(category.image);
        console.log('Image deleted from S3 successfully');
      } catch (deleteError) {
        console.error('Failed to delete category image from S3:', deleteError);
      }
    }

    await Category.findByIdAndDelete(id);
    console.log('Category deleted from database successfully');

    res.status(200).json(
      apiResponse(200, true, 'Category deleted successfully')
    );

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to delete category')
    );
  }
};

// Toggle category status
const toggleCategoryStatus = async (req, res) => {
  console.log('=== toggleCategoryStatus called ===');
  console.log('Category ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      console.log('Category not found for status toggle:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Category not found')
      );
    }

    console.log('Category found, current status:', category.isActive);
    await category.toggleStatus();
    console.log('Category status toggled successfully');

    res.status(200).json(
      apiResponse(200, true, 'Category status toggled successfully', category)
    );

  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to toggle category status')
    );
  }
};

// Get active categories
const getActiveCategories = async (req, res) => {
  console.log('=== getActiveCategories called ===');
  
  try {
    const categories = await Category.getActiveCategories();
    console.log('Retrieved active categories count:', categories.length);

    res.status(200).json(
      apiResponse(200, true, 'Active categories retrieved successfully', categories)
    );

  } catch (error) {
    console.error('Get active categories error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve active categories')
    );
  }
};

// Search categories
const searchCategories = async (req, res) => {
  console.log('=== searchCategories called ===');
  console.log('Search query:', req.query.q);
  console.log('Pagination:', req.query.page, req.query.limit);
  
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      console.log('Validation failed: Search query is required');
      return res.status(400).json(
        apiResponse(400, false, 'Search query is required')
      );
    }

    const searchRegex = new RegExp(q, 'i');
    console.log('Search regex created:', searchRegex);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    const categories = await Category.find({
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    })
    .sort({ sortOrder: 1, name: 1 })
    .skip(skip)
    .limit(parseInt(limit));
    console.log('Search results count:', categories.length);

    const total = await Category.countDocuments({
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    });
    console.log('Total search results:', total);

    res.status(200).json(
      apiResponse(200, true, 'Categories search completed', {
        categories,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Search categories error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to search categories')
    );
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getActiveCategories,
  searchCategories
};
