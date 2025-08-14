const Item = require('../models/item');
const { uploadImageToS3, deleteFromS3, uploadMultipleImagesToS3 } = require('../utils/s3Upload');
const { apiResponse } = require('../utils/apiResponse');

// Create new item
// Create new item
const createItem = async (req, res) => {
  console.log('=== createItem called ===');
  console.log('Request body:', req.body);
  console.log('Files:', req.files);
  
  try {
    const { 
      name, 
      description, 
      price, 
      discountPrice, 
      discountPercentage,
      keyHighlights,
      variants 
    } = req.body;
    
    const thumbnailImage = req.files?.thumbnailImage?.[0];
    const variantImages = req.files?.variantImages || [];
    
    console.log('Extracted data - name:', name, 'price:', price, 'discountPrice:', discountPrice, 'discountPercentage:', discountPercentage);
    console.log('Thumbnail image:', thumbnailImage ? 'Present' : 'Not present');
    console.log('Variant images count:', variantImages.length);

    // Validate required fields
    if (!name || !price || !thumbnailImage) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json(
        apiResponse(400, false, 'Name, price, and thumbnail image are required')
      );
    }

    // Validate numeric fields
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      console.log('Validation failed: Invalid or negative price');
      return res.status(400).json(
        apiResponse(400, false, 'Price must be a valid non-negative number')
      );
    }

    let parsedDiscountPrice = 0;
    if (discountPrice) {
      parsedDiscountPrice = parseFloat(discountPrice);
      if (isNaN(parsedDiscountPrice) || parsedDiscountPrice < 0) {
        console.log('Validation failed: Invalid discount price');
        return res.status(400).json(
          apiResponse(400, false, 'Discount price must be a valid non-negative number')
        );
      }
      if (parsedDiscountPrice >= parsedPrice) {
        console.log('Validation failed: Invalid discount price');
        return res.status(400).json(
          apiResponse(400, false, 'Discount price must be less than original price')
        );
      }
    }

    let parsedDiscountPercentage = 0;
    if (discountPercentage) {
      parsedDiscountPercentage = parseFloat(discountPercentage);
      if (isNaN(parsedDiscountPercentage) || parsedDiscountPercentage < 0 || parsedDiscountPercentage > 100) {
        console.log('Validation failed: Invalid discount percentage');
        return res.status(400).json(
          apiResponse(400, false, 'Discount percentage must be between 0 and 100')
        );
      }
    }

    console.log('Input validation passed');

    // Upload thumbnail image to S3
    console.log('Uploading thumbnail image to S3...');
    const thumbnailImageUrl = await uploadImageToS3(thumbnailImage, 'items/thumbnails');
    console.log('Thumbnail image uploaded to S3:', thumbnailImageUrl);

    // Process variants if provided
    let processedVariants = [];
    if (variants) {
      console.log('Processing variants...');
      
      let variantsData = variants;
      if (typeof variants === 'string') {
        try {
          variantsData = JSON.parse(variants);
        } catch (e) {
          console.log('Failed to parse variants JSON:', e);
          return res.status(400).json(
            apiResponse(400, false, 'Invalid variants JSON format')
          );
        }
      }

      if (!Array.isArray(variantsData)) {
        console.log('Validation failed: Variants must be an array');
        return res.status(400).json(
          apiResponse(400, false, 'Variants must be an array')
        );
      }

      for (const variant of variantsData) {
        if (!variant.size || !variant.colors || !Array.isArray(variant.colors)) {
          console.log('Validation failed: Invalid variant structure');
          return res.status(400).json(
            apiResponse(400, false, 'Each variant must have size and colors array')
          );
        }

        const processedColors = [];
        for (const color of variant.colors) {
          if (!color.name || !color.sku) {
            console.log('Validation failed: Missing color name or SKU');
            return res.status(400).json(
              apiResponse(400, false, 'Each color must have name and SKU')
            );
          }

          // Validate hex code if provided
          if (color.hexCode && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.hexCode)) {
            console.log('Validation failed: Invalid hex code');
            return res.status(400).json(
              apiResponse(400, false, 'Invalid color hex code format')
            );
          }

          // Check if SKU already exists
          const existingItem = await Item.findOne({
            'variants.colors.sku': color.sku
          });
          if (existingItem) {
            console.log('Validation failed: SKU already exists:', color.sku);
            return res.status(400).json(
              apiResponse(400, false, `SKU ${color.sku} already exists`)
            );
          }

          // Process images for this specific color
          let colorImages = [];
          if (color.imageKeys && Array.isArray(color.imageKeys) && variantImages.length > 0) {
            console.log(`Processing images for color: ${color.name}`);
            // Filter variantImages that match the provided imageKeys
            const matchedImages = variantImages.filter(file =>
              color.imageKeys.includes(file.originalname)
            );
            if (matchedImages.length === 0) {
              console.log(`Warning: No matching images found for color ${color.name}`);
            } 
            if (matchedImages.length > 0) {
              colorImages = await uploadMultipleImagesToS3(matchedImages, 'items/variants');
            }
          }

          const processedColor = {
            name: color.name.trim(),
            hexCode: color.hexCode || null,
            images: colorImages,
            sku: color.sku.toUpperCase().trim(),
            stock: color.stock ? parseInt(color.stock) : 0
          };

          // Validate stock
          if (processedColor.stock < 0) {
            console.log('Validation failed: Negative stock');
            return res.status(400).json(
              apiResponse(400, false, 'Stock cannot be negative')
            );
          }

          processedColors.push(processedColor);
        }

        processedVariants.push({
          size: variant.size.trim(),
          colors: processedColors
        });
      }
    }

    // Process key highlights if provided
    let processedKeyHighlights = [];
    if (keyHighlights) {
      console.log('Processing key highlights...');
      
      let highlightsData = keyHighlights;
      if (typeof keyHighlights === 'string') {
        try {
          highlightsData = JSON.parse(keyHighlights);
        } catch (e) {
          console.log('Failed to parse keyHighlights JSON:', e);
          return res.status(400).json(
            apiResponse(400, false, 'Invalid keyHighlights JSON format')
          );
        }
      }

      if (!Array.isArray(highlightsData)) {
        console.log('Validation failed: Key highlights must be an array');
        return res.status(400).json(
          apiResponse(400, false, 'Key highlights must be an array')
        );
      }

      for (const highlight of highlightsData) {
        if (!highlight.key || !highlight.value) {
          console.log('Validation failed: Invalid key highlight structure');
          return res.status(400).json(
            apiResponse(400, false, 'Each key highlight must have key and value')
          );
        }
        if (highlight.key.length > 100 || highlight.value.length > 200) {
          console.log('Validation failed: Key highlight length exceeded');
          return res.status(400).json(
            apiResponse(400, false, 'Key highlight key or value exceeds maximum length')
          );
        }
        processedKeyHighlights.push({
          key: highlight.key.trim(),
          value: highlight.value.trim()
        });
      }
    }

    // Create new item with complete structure
    const item = new Item({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: parsedPrice,
      discountPrice: parsedDiscountPrice,
      discountPercentage: parsedDiscountPercentage,
      thumbnailImage: thumbnailImageUrl,
      keyHighlights: processedKeyHighlights,
      variants: processedVariants,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('New item instance created with complete structure:', item);

    await item.save();
    console.log('Item saved successfully:', item._id);

    res.status(201).json(
      apiResponse(201, true, 'Item created successfully', item)
    );

  } catch (error) {
    console.error('Create item error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json(
        apiResponse(400, false, 'Validation failed', { errors: validationErrors })
      );
    }
    
    res.status(500).json(
      apiResponse(500, false, 'Failed to create item', { error: error.message })
    );
  }
};

// Get all items
const getAllItems = async (req, res) => {
  console.log('=== getAllItems called ===');
  console.log('Query parameters:', req.query);
  
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = -1, 
      minPrice, 
      maxPrice,
      hasDiscount 
    } = req.query;
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'minPrice:', minPrice, 'maxPrice:', maxPrice, 'hasDiscount:', hasDiscount);

    // Build query
    const query = {};
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = parseFloat(minPrice);
        console.log('Added min price filter:', minPrice);
      }
      if (maxPrice) {
        query.price.$lte = parseFloat(maxPrice);
        console.log('Added max price filter:', maxPrice);
      }
    }

    if (hasDiscount === 'true') {
      query.$or = [
        { discountPrice: { $gt: 0 } },
        { discountPercentage: { $gt: 0 } }
      ];
      console.log('Added discount filter');
    }

    console.log('Final query:', query);

    // Build sort object
    const sort = {};
    sort[sortBy] = parseInt(sortOrder);
    console.log('Sort object:', sort);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    const items = await Item.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Retrieved items count:', items.length);

    const total = await Item.countDocuments(query);
    console.log('Total items count:', total);

    res.status(200).json(
      apiResponse(200, true, 'Items retrieved successfully', {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve items')
    );
  }
};

// Get item by ID
const getItemById = async (req, res) => {
  console.log('=== getItemById called ===');
  console.log('Item ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found:', item._id);
    res.status(200).json(
      apiResponse(200, true, 'Item retrieved successfully', item)
    );

  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve item')
    );
  }
};

// Update item
const updateItem = async (req, res) => {
  console.log('=== updateItem called ===');
  console.log('Item ID:', req.params.id);
  console.log('Update data:', req.body);
  console.log('Thumbnail image:', req.file ? 'Present' : 'Not present');
  
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price, 
      discountPrice, 
      discountPercentage,
      keyHighlights,
      variants 
    } = req.body;
    const thumbnailImage = req.file;
    console.log('Extracted update data - name:', name, 'price:', price, 'discountPrice:', discountPrice, 'discountPercentage:', discountPercentage);

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for update:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found for update:', item._id);

    // Validate price constraints
    if (price !== undefined && price < 0) {
      console.log('Validation failed: Negative price');
      return res.status(400).json(
        apiResponse(400, false, 'Price cannot be negative')
      );
    }

    if (discountPrice !== undefined && discountPrice >= (price || item.price)) {
      console.log('Validation failed: Invalid discount price');
      return res.status(400).json(
        apiResponse(400, false, 'Discount price must be less than original price')
      );
    }

    if (discountPercentage !== undefined && (discountPercentage < 0 || discountPercentage > 100)) {
      console.log('Validation failed: Invalid discount percentage');
      return res.status(400).json(
        apiResponse(400, false, 'Discount percentage must be between 0 and 100')
      );
    }

    console.log('Price validation passed');

    // Update fields
    if (name !== undefined) {
      item.name = name;
      console.log('Name updated');
    }
    if (description !== undefined) {
      item.description = description;
      console.log('Description updated');
    }
    if (price !== undefined) {
      item.price = price;
      console.log('Price updated');
    }
    if (discountPrice !== undefined) {
      item.discountPrice = discountPrice;
      console.log('Discount price updated');
    }
    if (discountPercentage !== undefined) {
      item.discountPercentage = discountPercentage;
      console.log('Discount percentage updated');
    }
    if (keyHighlights !== undefined) {
      item.keyHighlights = keyHighlights;
      console.log('Key highlights updated');
    }
    if (variants !== undefined) {
      item.variants = variants;
      console.log('Variants updated');
    }

    // Handle thumbnail image update if provided
    if (thumbnailImage) {
      console.log('Processing thumbnail image update...');
      try {
        // Upload new image to S3
        console.log('Uploading new thumbnail image to S3...');
        const imageUrl = await uploadImageToS3(thumbnailImage, 'items/thumbnails');
        console.log('New thumbnail image uploaded to S3:', imageUrl);

        // Delete old image from S3
        if (item.thumbnailImage) {
          console.log('Deleting old thumbnail image from S3:', item.thumbnailImage);
          try {
            await deleteFromS3(item.thumbnailImage);
            console.log('Old thumbnail image deleted from S3 successfully');
          } catch (deleteError) {
            console.error('Failed to delete old thumbnail image:', deleteError);
          }
        }

        item.thumbnailImage = imageUrl;
        console.log('Thumbnail image updated successfully');
      } catch (imageError) {
        console.error('Thumbnail image upload error:', imageError);
        return res.status(500).json(
          apiResponse(500, false, 'Failed to upload thumbnail image')
        );
      }
    }

    await item.save();
    console.log('Item updated and saved successfully');

    res.status(200).json(
      apiResponse(200, true, 'Item updated successfully', item)
    );

  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update item')
    );
  }
};

// Delete item
const deleteItem = async (req, res) => {
  console.log('=== deleteItem called ===');
  console.log('Item ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for deletion:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found for deletion:', item._id);

    // Delete thumbnail image from S3
    if (item.thumbnailImage) {
      console.log('Deleting thumbnail image from S3:', item.thumbnailImage);
      try {
        await deleteFromS3(item.thumbnailImage);
        console.log('Thumbnail image deleted from S3 successfully');
      } catch (deleteError) {
        console.error('Failed to delete thumbnail image from S3:', deleteError);
      }
    }

    // Delete all variant color images from S3
    console.log('Deleting variant images from S3...');
    for (const variant of item.variants) {
      for (const color of variant.colors) {
        for (const imageUrl of color.images) {
          try {
            await deleteFromS3(imageUrl);
            console.log('Variant image deleted from S3:', imageUrl);
          } catch (deleteError) {
            console.error('Failed to delete variant image from S3:', deleteError);
          }
        }
      }
    }

    await Item.findByIdAndDelete(id);
    console.log('Item deleted from database successfully');

    res.status(200).json(
      apiResponse(200, true, 'Item deleted successfully')
    );

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to delete item')
    );
  }
};

// Add variant to item
const addVariant = async (req, res) => {
  console.log('=== addVariant called ===');
  console.log('Item ID:', req.params.id);
  console.log('Variant data:', req.body);
  
  try {
    const { id } = req.params;
    const { size, colors } = req.body;

    if (!size || !colors || !Array.isArray(colors)) {
      console.log('Validation failed: Missing required variant fields');
      return res.status(400).json(
        apiResponse(400, false, 'Size and colors array are required')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for adding variant:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, adding variant - size:', size, 'colors count:', colors.length);
    await item.addVariant(size, colors);
    console.log('Variant added successfully');

    res.status(200).json(
      apiResponse(200, true, 'Variant added successfully', item)
    );

  } catch (error) {
    console.error('Add variant error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to add variant')
    );
  }
};

// Update stock for specific variant and color
const updateStock = async (req, res) => {
  console.log('=== updateStock called ===');
  console.log('Item ID:', req.params.id);
  console.log('Stock update data:', req.body);
  
  try {
    const { id } = req.params;
    const { size, colorName, newStock } = req.body;

    if (!size || !colorName || newStock === undefined) {
      console.log('Validation failed: Missing required stock fields');
      return res.status(400).json(
        apiResponse(400, false, 'Size, color name, and new stock are required')
      );
    }

    if (newStock < 0) {
      console.log('Validation failed: Negative stock');
      return res.status(400).json(
        apiResponse(400, false, 'Stock cannot be negative')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for stock update:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, updating stock - size:', size, 'color:', colorName, 'new stock:', newStock);
    await item.updateStock(size, colorName, newStock);
    console.log('Stock updated successfully');

    res.status(200).json(
      apiResponse(200, true, 'Stock updated successfully', item)
    );

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update stock')
    );
  }
};

// Add key highlight
const addKeyHighlight = async (req, res) => {
  console.log('=== addKeyHighlight called ===');
  console.log('Item ID:', req.params.id);
  console.log('Key highlight data:', req.body);
  
  try {
    const { id } = req.params;
    const { key, value } = req.body;

    if (!key || !value) {
      console.log('Validation failed: Missing key or value');
      return res.status(400).json(
        apiResponse(400, false, 'Key and value are required')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for adding key highlight:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, adding key highlight - key:', key, 'value:', value);
    await item.addKeyHighlight(key, value);
    console.log('Key highlight added successfully');

    res.status(200).json(
      apiResponse(200, true, 'Key highlight added successfully', item)
    );

  } catch (error) {
    console.error('Add key highlight error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to add key highlight')
    );
  }
};

// Update key highlight
const updateKeyHighlight = async (req, res) => {
  console.log('=== updateKeyHighlight called ===');
  console.log('Item ID:', req.params.id);
  console.log('Key highlight update data:', req.body);
  
  try {
    const { id } = req.params;
    const { key, newValue } = req.body;

    if (!key || !newValue) {
      console.log('Validation failed: Missing key or new value');
      return res.status(400).json(
        apiResponse(400, false, 'Key and new value are required')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for updating key highlight:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, updating key highlight - key:', key, 'new value:', newValue);
    await item.updateKeyHighlight(key, newValue);
    console.log('Key highlight updated successfully');

    res.status(200).json(
      apiResponse(200, true, 'Key highlight updated successfully', item)
    );

  } catch (error) {
    console.error('Update key highlight error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update key highlight')
    );
  }
};

// Remove key highlight
const removeKeyHighlight = async (req, res) => {
  console.log('=== removeKeyHighlight called ===');
  console.log('Item ID:', req.params.id);
  console.log('Key to remove:', req.body.key);
  
  try {
    const { id } = req.params;
    const { key } = req.body;

    if (!key) {
      console.log('Validation failed: Missing key');
      return res.status(400).json(
        apiResponse(400, false, 'Key is required')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for removing key highlight:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, removing key highlight - key:', key);
    await item.removeKeyHighlight(key);
    console.log('Key highlight removed successfully');

    res.status(200).json(
      apiResponse(200, true, 'Key highlight removed successfully', item)
    );

  } catch (error) {
    console.error('Remove key highlight error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to remove key highlight')
    );
  }
};

// Get items by price range
const getItemsByPriceRange = async (req, res) => {
  console.log('=== getItemsByPriceRange called ===');
  console.log('Price range:', req.query.minPrice, '-', req.query.maxPrice);
  
  try {
    const { minPrice, maxPrice } = req.query;

    if (!minPrice || !maxPrice) {
      console.log('Validation failed: Missing price range');
      return res.status(400).json(
        apiResponse(400, false, 'Minimum and maximum price are required')
      );
    }

    console.log('Getting items by price range - min:', minPrice, 'max:', maxPrice);
    const items = await Item.getByPriceRange(parseFloat(minPrice), parseFloat(maxPrice));
    console.log('Retrieved items by price range count:', items.length);

    res.status(200).json(
      apiResponse(200, true, 'Items by price range retrieved successfully', items)
    );

  } catch (error) {
    console.error('Get items by price range error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve items by price range')
    );
  }
};

// Get discounted items
const getDiscountedItems = async (req, res) => {
  console.log('=== getDiscountedItems called ===');
  
  try {
    const items = await Item.getDiscountedItems();
    console.log('Retrieved discounted items count:', items.length);

    res.status(200).json(
      apiResponse(200, true, 'Discounted items retrieved successfully', items)
    );

  } catch (error) {
    console.error('Get discounted items error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve discounted items')
    );
  }
};

// Search items
const searchItems = async (req, res) => {
  console.log('=== searchItems called ===');
  console.log('Search query:', req.query.q);
  console.log('Pagination:', req.query.page, req.query.limit);
  console.log('Price filters:', req.query.minPrice, '-', req.query.maxPrice);
  
  try {
    const { q, page = 1, limit = 10, minPrice, maxPrice } = req.query;

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

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = parseFloat(minPrice);
        console.log('Added min price filter:', minPrice);
      }
      if (maxPrice) {
        query.price.$lte = parseFloat(maxPrice);
        console.log('Added max price filter:', maxPrice);
      }
    }

    console.log('Final search query:', query);

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Search results count:', items.length);

    const total = await Item.countDocuments(query);
    console.log('Total search results:', total);

    res.status(200).json(
      apiResponse(200, true, 'Items search completed', {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Search items error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to search items')
    );
  }
};

// Upload variant images
const uploadVariantImages = async (req, res) => {
  console.log('=== uploadVariantImages called ===');
  console.log('Item ID:', req.params.id);
  console.log('Variant data:', req.body);
  console.log('Images count:', req.files ? req.files.length : 0);
  
  try {
    const { id } = req.params;
    const { size, colorName } = req.body;
    const images = req.files;

    if (!size || !colorName || !images || images.length === 0) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json(
        apiResponse(400, false, 'Size, color name, and images are required')
      );
    }

    if (images.length > 5) {
      console.log('Validation failed: Too many images');
      return res.status(400).json(
        apiResponse(400, false, 'Maximum 5 images allowed per color variant')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for uploading variant images:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    const variant = item.variants.find(v => v.size === size);
    if (!variant) {
      console.log('Variant not found:', size);
      return res.status(404).json(
        apiResponse(404, false, 'Variant not found')
      );
    }

    const color = variant.colors.find(c => c.name === colorName);
    if (!color) {
      console.log('Color variant not found:', colorName);
      return res.status(404).json(
        apiResponse(404, false, 'Color variant not found')
      );
    }

    console.log('Found variant and color, uploading images...');

    // Upload images to S3
    const imageUrls = await uploadMultipleImagesToS3(images, 'items/variants');
    console.log('Images uploaded to S3, count:', imageUrls.length);

    // Update color images
    color.images = imageUrls;
    console.log('Color images updated');

    await item.save();
    console.log('Item saved with new variant images');

    res.status(200).json(
      apiResponse(200, true, 'Variant images uploaded successfully', {
        size,
        colorName,
        images: imageUrls
      })
    );

  } catch (error) {
    console.error('Upload variant images error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to upload variant images')
    );
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  addVariant,
  updateStock,
  addKeyHighlight,
  updateKeyHighlight,
  removeKeyHighlight,
  getItemsByPriceRange,
  getDiscountedItems,
  searchItems,
  uploadVariantImages
};
