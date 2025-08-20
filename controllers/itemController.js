const Item = require('../models/item');
const { uploadImageToS3, deleteFromS3, uploadMultipleImagesToS3 } = require('../utils/s3Upload');
const { apiResponse } = require('../utils/apiResponse');
const mongoose = require('mongoose');

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
      variants,
      categoryId,
      subcategoryId
    } = req.body;
    
    const thumbnailImage = req.files?.thumbnailImage?.[0];
    const variantImages = req.files?.variantImages || [];
    
    console.log('Extracted data - name:', name, 'price:', price, 'discountPrice:', discountPrice, 'discountPercentage:', discountPercentage, 'categoryId:', categoryId, 'subcategoryId:', subcategoryId);
    console.log('Thumbnail image:', thumbnailImage ? 'Present' : 'Not present');
    console.log('Variant images count:', variantImages.length);

    // Validate required fields
    if (!name || !price || !thumbnailImage || !categoryId || !subcategoryId) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json(
        apiResponse(400, false, 'Name, price, thumbnail image, category ID, and subcategory ID are required')
      );
    }

    // Validate ObjectId format for category and subcategory
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.log('Validation failed: Invalid category ID format');
      return res.status(400).json(
        apiResponse(400, false, 'Invalid category ID format')
      );
    }

    if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
      console.log('Validation failed: Invalid subcategory ID format');
      return res.status(400).json(
        apiResponse(400, false, 'Invalid subcategory ID format')
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
            // Filter images that match the provided imageKeys
            const matchedImages = variantImages.filter(file =>
              color.imageKeys.includes(file.originalname)
            );
            if (matchedImages.length === 0) {
              console.log(`Warning: No matching images found for color ${color.name}`);
            } 
            if (matchedImages.length > 0) {
              colorImages = await uploadMultipleImagesToS3(matchedImages, 'items/bulk-upload');
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

    // Process filters if provided
    let processedFilters = [];
    if (req.body.filters) {
      console.log('Processing filters...');
      
      let filtersData = req.body.filters;
      if (typeof req.body.filters === 'string') {
        try {
          filtersData = JSON.parse(req.body.filters);
        } catch (e) {
          console.log('Failed to parse filters JSON:', e);
          return res.status(400).json(
            apiResponse(400, false, 'Invalid filters JSON format')
          );
        }
      }

      if (!Array.isArray(filtersData)) {
        console.log('Validation failed: Filters must be an array');
        return res.status(400).json(
          apiResponse(400, false, 'Filters must be an array')
        );
      }

      for (const filter of filtersData) {
        if (!filter.key || !filter.values || !Array.isArray(filter.values) || filter.values.length === 0) {
          console.log('Validation failed: Invalid filter structure');
          return res.status(400).json(
            apiResponse(400, false, 'Each filter must have key and values array')
          );
        }
        if (filter.key.length > 100) {
          console.log('Validation failed: Filter key length exceeded');
          return res.status(400).json(
            apiResponse(400, false, 'Filter key exceeds maximum length')
          );
        }
        
        // Validate filter values
        const validValues = filter.values.filter(value => 
          value && typeof value === 'string' && value.trim().length > 0 && value.length <= 100
        );
        
        if (validValues.length === 0) {
          console.log('Validation failed: No valid filter values');
          return res.status(400).json(
            apiResponse(400, false, 'Each filter must have at least one valid value')
          );
        }

        // Process display values if provided
        let displayValues = validValues;
        if (filter.displayValues && Array.isArray(filter.displayValues)) {
          displayValues = filter.displayValues.filter((value, index) => 
            value && typeof value === 'string' && value.trim().length > 0 && value.length <= 100 && index < validValues.length
          );
          // Ensure displayValues has same length as values
          while (displayValues.length < validValues.length) {
            displayValues.push(validValues[displayValues.length]);
          }
        }

        processedFilters.push({
          key: filter.key.trim(),
          values: validValues.map(v => v.trim()),
          displayValues: displayValues.map(v => v.trim())
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
      categoryId: categoryId,
      subcategoryId: subcategoryId,
      keyHighlights: processedKeyHighlights,
      variants: processedVariants,
      filters: processedFilters,
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

// Get all items with advanced filtering (POST method for complex filters)
const getAllItems = async (req, res) => {
  console.log('=== getAllItems called ===');
  console.log('Request body:', req.body);
  console.log('Query parameters:', req.query);
  
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = -1, 
      minPrice, 
      maxPrice,
      hasDiscount,
      search,
      categoryId,
      subcategoryId,
      filters = {} // Extract filters from request body
    } = req.body;
    
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'minPrice:', minPrice, 'maxPrice:', maxPrice, 'hasDiscount:', hasDiscount, 'search:', search, 'categoryId:', categoryId, 'subcategoryId:', subcategoryId);
    console.log('Filters from body:', filters);

    // Validate filters structure
    if (filters && typeof filters === 'object') {
      for (const [key, values] of Object.entries(filters)) {
        if (!Array.isArray(values) || values.length === 0) {
          console.log('Validation failed: Filter values must be an array');
          return res.status(400).json(
            apiResponse(400, false, `Filter values for '${key}' must be a non-empty array`)
          );
        }
        
        // Validate each filter value
        for (const value of values) {
          if (typeof value !== 'string' || value.trim().length === 0) {
            console.log('Validation failed: Invalid filter value');
            return res.status(400).json(
              apiResponse(400, false, `Invalid filter value for '${key}': ${value}`)
            );
          }
        }
      }
    }

    console.log('Filter validation passed');

    // Build query options
    const queryOptions = {
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search: search || undefined,
      sortBy: sortBy,
      sortOrder: parseInt(sortOrder),
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    console.log('Query options:', queryOptions);

    // Use the new getByFilters method
    const items = await Item.getByFilters(filters, queryOptions);
    console.log('Retrieved items count:', items.length);

    // Get total count for pagination
    const totalQuery = {};
    
    // Apply filter criteria to count query
    if (Object.keys(filters).length > 0) {
      const filterQueries = [];
      Object.entries(filters).forEach(([key, values]) => {
        if (values && values.length > 0) {
          const valueArray = Array.isArray(values) ? values : [values];
          const filterQuery = {
            'filters.key': key,
            'filters.values': { $in: valueArray }
          };
          filterQueries.push(filterQuery);
        }
      });
      if (filterQueries.length > 0) {
        totalQuery.$and = filterQueries;
      }
    }

    // Apply other filters to count query
    if (categoryId) totalQuery.categoryId = categoryId;
    if (subcategoryId) totalQuery.subcategoryId = subcategoryId;
    if (minPrice || maxPrice) {
      totalQuery.price = {};
      if (minPrice) totalQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) totalQuery.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      totalQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (hasDiscount === true) {
      totalQuery.$or = [
        { discountPrice: { $gt: 0 } },
        { discountPercentage: { $gt: 0 } }
      ];
    }

    const total = await Item.countDocuments(totalQuery);
    console.log('Total items count:', total);

    res.status(200).json(
      apiResponse(200, true, 'Items retrieved successfully', {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: filters
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
  console.log('Files:', req.files);
  
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price, 
      discountPrice, 
      discountPercentage,
      keyHighlights,
      variants,
      categoryId,
      subcategoryId
    } = req.body;
    const thumbnailImage = req.file;
    console.log('Extracted update data - name:', name, 'price:', price, 'discountPrice:', discountPrice, 'discountPercentage:', discountPercentage, 'categoryId:', categoryId, 'subcategoryId:', subcategoryId);

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

    // Validate ObjectId format for category and subcategory if provided
    if (categoryId !== undefined && !mongoose.Types.ObjectId.isValid(categoryId)) {
      console.log('Validation failed: Invalid category ID format');
      return res.status(400).json(
        apiResponse(400, false, 'Invalid category ID format')
      );
    }

    if (subcategoryId !== undefined && !mongoose.Types.ObjectId.isValid(subcategoryId)) {
      console.log('Validation failed: Invalid subcategory ID format');
      return res.status(400).json(
        apiResponse(400, false, 'Invalid subcategory ID format')
      );
    }

    console.log('Price and ID validation passed');

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
    if (categoryId !== undefined) {
      item.categoryId = categoryId;
      console.log('Category ID updated');
    }
    if (subcategoryId !== undefined) {
      item.subcategoryId = subcategoryId;
      console.log('Subcategory ID updated');
    }

    // Handle key highlights update if provided
    if (keyHighlights !== undefined) {
      try {
        let highlightsData = keyHighlights;
        if (typeof keyHighlights === 'string') {
          highlightsData = JSON.parse(keyHighlights);
        }
        
        if (Array.isArray(highlightsData)) {
          // Validate key highlights
          for (const highlight of highlightsData) {
            if (!highlight.key || !highlight.value) {
              throw new Error('Each key highlight must have key and value');
            }
            if (highlight.key.length > 100 || highlight.value.length > 200) {
              throw new Error('Key highlight key or value exceeds maximum length');
            }
          }
          item.keyHighlights = highlightsData;
      console.log('Key highlights updated');
    }
      } catch (parseError) {
        console.log('Failed to parse keyHighlights:', parseError);
        return res.status(400).json(
          apiResponse(400, false, 'Invalid keyHighlights format')
        );
      }
    }

    // Handle variants update if provided
    if (variants !== undefined) {
      try {
        let variantsData = variants;
        if (typeof variants === 'string') {
          variantsData = JSON.parse(variants);
        }
        
        if (Array.isArray(variantsData)) {
          // Validate variants structure
          for (const variant of variantsData) {
            if (!variant.size || !variant.colors || !Array.isArray(variant.colors)) {
              throw new Error('Each variant must have size and colors array');
            }
            
            for (const color of variant.colors) {
              if (!color.name || !color.sku) {
                throw new Error('Each color must have name and SKU');
              }
              
              // Validate hex code if provided
              if (color.hexCode && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.hexCode)) {
                throw new Error('Invalid color hex code format');
              }
              
              // Check if SKU already exists in other items
              if (color.sku !== color.originalSku) { // Only check if SKU changed
                const existingItem = await Item.findOne({
                  _id: { $ne: id }, // Exclude current item
                  'variants.colors.sku': color.sku.toUpperCase()
                });
                if (existingItem) {
                  throw new Error(`SKU ${color.sku} already exists in another item`);
                }
              }
            }
          }
          
          // Update variants
          item.variants = variantsData;
      console.log('Variants updated');
        }
      } catch (parseError) {
        console.log('Failed to parse variants:', parseError);
        return res.status(400).json(
          apiResponse(400, false, `Invalid variants format: ${parseError.message}`)
        );
      }
    }

    // Handle filters update if provided
    if (req.body.filters !== undefined) {
      try {
        let filtersData = req.body.filters;
        if (typeof req.body.filters === 'string') {
          filtersData = JSON.parse(req.body.filters);
        }
        
        if (Array.isArray(filtersData)) {
          // Validate filters structure
          for (const filter of filtersData) {
            if (!filter.key || !filter.values || !Array.isArray(filter.values) || filter.values.length === 0) {
              throw new Error('Each filter must have key and values array');
            }
            if (filter.key.length > 100) {
              throw new Error('Filter key exceeds maximum length');
            }
            
            // Validate filter values
            const validValues = filter.values.filter(value => 
              value && typeof value === 'string' && value.trim().length > 0 && value.length <= 100
            );
            
            if (validValues.length === 0) {
              throw new Error('Each filter must have at least one valid value');
            }

            // Process display values if provided
            let displayValues = validValues;
            if (filter.displayValues && Array.isArray(filter.displayValues)) {
              displayValues = filter.displayValues.filter((value, index) => 
                value && typeof value === 'string' && value.trim().length > 0 && value.length <= 100 && index < validValues.length
              );
              // Ensure displayValues has same length as values
              while (displayValues.length < validValues.length) {
                displayValues.push(validValues[displayValues.length]);
              }
            }

            // Update filter values
            filter.values = validValues.map(v => v.trim());
            filter.displayValues = displayValues.map(v => v.trim());
          }
          
          // Update filters
          item.filters = filtersData;
          console.log('Filters updated');
        }
      } catch (parseError) {
        console.log('Failed to parse filters:', parseError);
        return res.status(400).json(
          apiResponse(400, false, `Invalid filters format: ${parseError.message}`)
        );
      }
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

    // Handle variant images update if provided
    const variantImages = req.files?.variantImages;
    if (variantImages && variantImages.length > 0) {
      console.log('Processing variant images update...');
      try {
        // Group images by variant and color
        const variantImageMap = {};
        
        for (const file of variantImages) {
          // Extract variant info from filename or use metadata
          const filename = file.originalname;
          // Expected format: variant-size_color-name_image.jpg
          const parts = filename.split('_');
          if (parts.length >= 2) {
            const size = parts[0];
            const colorName = parts[1];
            const key = `${size}_${colorName}`;
            
            if (!variantImageMap[key]) {
              variantImageMap[key] = [];
            }
            variantImageMap[key].push(file);
          }
        }

        // Process each variant's images
        for (const [key, files] of Object.entries(variantImageMap)) {
          const [size, colorName] = key.split('_');
          
          const variant = item.variants.find(v => v.size === size);
          if (!variant) {
            console.log(`Variant not found: ${size}, skipping images`);
            continue;
          }

          const color = variant.colors.find(c => c.name === colorName);
          if (!color) {
            console.log(`Color not found: ${colorName} in variant ${size}, skipping images`);
            continue;
          }

          // Upload new images to S3
          const newImageUrls = await uploadMultipleImagesToS3(files, 'items/variants');
          console.log(`Uploaded ${newImageUrls.length} images for ${size} - ${colorName}`);

          // Replace existing images (respect 5 image limit)
          color.images = newImageUrls.slice(0, 5);
        }

        console.log('Variant images updated successfully');
      } catch (imageError) {
        console.error('Variant images upload error:', imageError);
        return res.status(500).json(
          apiResponse(500, false, 'Failed to upload variant images')
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
      apiResponse(500, false, 'Failed to update item', { error: error.message })
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

// Get items by price range (updated to use new filter system)
const getItemsByPriceRange = async (req, res) => {
  console.log('=== getItemsByPriceRange called ===');
  console.log('Price range:', req.query.minPrice, '-', req.query.maxPrice);
  
  try {
    const { minPrice, maxPrice, page = 1, limit = 10, sortBy = 'price', sortOrder = 1 } = req.query;

    if (!minPrice || !maxPrice) {
      console.log('Validation failed: Missing price range');
      return res.status(400).json(
        apiResponse(400, false, 'Minimum and maximum price are required')
      );
    }

    // Create filter criteria for price range
    const filters = {};
    if (minPrice && maxPrice) {
      filters.priceRange = [`${minPrice}-${maxPrice}`];
    }

    // Build query options
    const queryOptions = {
      minPrice: parseFloat(minPrice),
      maxPrice: parseFloat(maxPrice),
      sortBy: sortBy,
      sortOrder: parseInt(sortOrder),
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    console.log('Getting items by price range using new filter system - min:', minPrice, 'max:', maxPrice);
    const items = await Item.getByFilters(filters, queryOptions);
    console.log('Retrieved items by price range count:', items.length);

    // Get total count for pagination
    const totalQuery = {
      price: {
        $gte: parseFloat(minPrice),
        $lte: parseFloat(maxPrice)
      }
    };
    const total = await Item.countDocuments(totalQuery);

    res.status(200).json(
      apiResponse(200, true, 'Items by price range retrieved successfully', {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: filters
      })
    );

  } catch (error) {
    console.error('Get items by price range error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve items by price range')
    );
  }
};

// Get discounted items (updated to use new filter system)
const getDiscountedItems = async (req, res) => {
  console.log('=== getDiscountedItems called ===');
  
  try {
    const { page = 1, limit = 10, sortBy = 'discountPercentage', sortOrder = -1 } = req.query;

    // Create filter criteria for discounted items
    const filters = {
      hasDiscount: ['true']
    };

    // Build query options
    const queryOptions = {
      sortBy: sortBy,
      sortOrder: parseInt(sortOrder),
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    console.log('Getting discounted items using new filter system');
    const items = await Item.getByFilters(filters, queryOptions);
    console.log('Retrieved discounted items count:', items.length);

    // Get total count for pagination
    const totalQuery = {
      $or: [
        { discountPrice: { $gt: 0 } },
        { discountPercentage: { $gt: 0 } }
      ]
    };
    const total = await Item.countDocuments(totalQuery);

    res.status(200).json(
      apiResponse(200, true, 'Discounted items retrieved successfully', {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: filters
      })
    );

  } catch (error) {
    console.error('Get discounted items error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve discounted items')
    );
  }
};

// Search items (updated to use new filter system)
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

    // Create filter criteria for search
    const filters = {};
    
    // Add search filter
    if (q) {
      filters.search = [q];
    }

    // Add price range filter if provided
    if (minPrice || maxPrice) {
      if (minPrice && maxPrice) {
        filters.priceRange = [`${minPrice}-${maxPrice}`];
      } else if (minPrice) {
        filters.minPrice = [minPrice];
      } else if (maxPrice) {
        filters.maxPrice = [maxPrice];
      }
    }

    // Build query options
    const queryOptions = {
      search: q,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy: 'createdAt',
      sortOrder: -1,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    console.log('Searching items using new filter system - query:', q);
    const items = await Item.getByFilters(filters, queryOptions);
    console.log('Search results count:', items.length);

    // Get total count for pagination
    const searchQuery = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };

    // Add price range to search query if provided
    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) searchQuery.price.$lte = parseFloat(maxPrice);
    }

    const total = await Item.countDocuments(searchQuery);
    console.log('Total search results:', total);

    res.status(200).json(
      apiResponse(200, true, 'Items search completed', {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: filters
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

// Update variant images
const updateVariantImages = async (req, res) => {
  console.log('=== updateVariantImages called ===');
  console.log('Item ID:', req.params.id);
  console.log('Files:', req.files);
  console.log('Body:', req.body);
  
  try {
    const { id } = req.params;
    const { variantData } = req.body; // JSON string containing variant update data
    const images = req.files?.images || [];

    if (!variantData) {
      console.log('Validation failed: Missing variant data');
      return res.status(400).json(
        apiResponse(400, false, 'Variant data is required')
      );
    }

    let parsedVariantData;
    try {
      parsedVariantData = JSON.parse(variantData);
    } catch (parseError) {
      console.log('Failed to parse variant data:', parseError);
      return res.status(400).json(
        apiResponse(400, false, 'Invalid variant data format')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for updating variant images:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    // Process each variant update
    for (const variantUpdate of parsedVariantData) {
      const { size, colorName, newImages, removeImages } = variantUpdate;
      
      const variant = item.variants.find(v => v.size === size);
      if (!variant) {
        console.log(`Variant not found: ${size}`);
        continue;
      }

      const color = variant.colors.find(c => c.name === colorName);
      if (!color) {
        console.log(`Color not found: ${colorName} in variant ${size}`);
        continue;
      }

      // Remove specified images
      if (removeImages && Array.isArray(removeImages)) {
        for (const imageUrl of removeImages) {
          try {
            await deleteFromS3(imageUrl);
            console.log(`Deleted image: ${imageUrl}`);
          } catch (deleteError) {
            console.error(`Failed to delete image: ${imageUrl}`, deleteError);
          }
        }
        
        // Remove from color.images array
        color.images = color.images.filter(img => !removeImages.includes(img));
      }

      // Add new images if provided
      if (newImages && Array.isArray(newImages) && newImages.length > 0) {
        // Find matching uploaded files
        const matchingImages = images.filter(file => 
          newImages.includes(file.originalname)
        );

        if (matchingImages.length > 0) {
          // Upload new images to S3
          const newImageUrls = await uploadMultipleImagesToS3(matchingImages, 'items/variants');
          console.log(`Uploaded ${newImageUrls.length} new images for ${colorName}`);
          
          // Add to existing images (respect 5 image limit)
          const availableSlots = 5 - color.images.length;
          const imagesToAdd = newImageUrls.slice(0, availableSlots);
          color.images.push(...imagesToAdd);
        }
      }
    }

    await item.save();
    console.log('Item saved with updated variant images');

    res.status(200).json(
      apiResponse(200, true, 'Variant images updated successfully', item)
    );

  } catch (error) {
    console.error('Update variant images error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update variant images')
    );
  }
};

// Bulk upload items
const bulkUploadItems = async (req, res) => {
  console.log('=== bulkUploadItems called ===');
  console.log('Files received:', req.files);
  console.log('Body:', req.body);
  

  

  try {
    const jsonFile = req.files?.jsonFile?.[0];
    const images = req.files?.images || [];
    const { categoryId, subcategoryId } = req.body;
    
    if (!jsonFile) {
      console.log('Validation failed: JSON file is required');
      return res.status(400).json(
        apiResponse(400, false, 'JSON file is required for bulk upload')
      );
    }

    if (!categoryId || !subcategoryId) {
      console.log('Validation failed: Category ID and Subcategory ID are required');
      return res.status(400).json(
        apiResponse(400, false, 'Category ID and Subcategory ID are required for bulk upload')
      );
    }

    // Validate ObjectId format for category and subcategory
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.log('Validation failed: Invalid category ID format');
      return res.status(400).json(
        apiResponse(400, false, 'Invalid category ID format')
      );
    }

    if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
      console.log('Validation failed: Invalid subcategory ID format');
      return res.status(400).json(
        apiResponse(400, false, 'Invalid subcategory ID format')
      );
    }

    if (images.length > 25) {
      console.log('Validation failed: Too many images');
      return res.status(400).json(
        apiResponse(400, false, 'Maximum 25 images allowed for bulk upload')
      );
    }

    // Parse JSON file
    let itemsData;
    try {
      const jsonContent = jsonFile.buffer.toString('utf8');
      itemsData = JSON.parse(jsonContent);
      console.log('JSON parsed successfully, items count:', itemsData.length);
    } catch (parseError) {
      console.log('JSON parsing failed:', parseError);
      return res.status(400).json(
        apiResponse(400, false, 'Invalid JSON file format')
      );
    }

    if (!Array.isArray(itemsData)) {
      console.log('Validation failed: JSON must contain an array of items');
      return res.status(400).json(
        apiResponse(400, false, 'JSON must contain an array of items')
      );
    }

    if (itemsData.length === 0) {
      console.log('Validation failed: Empty items array');
      return res.status(400).json(
        apiResponse(400, false, 'JSON file must contain at least one item')
      );
    }

    if (itemsData.length > 100) {
      console.log('Validation failed: Too many items');
      return res.status(400).json(
        apiResponse(400, false, 'Maximum 100 items allowed per bulk upload')
      );
    }

    console.log('Processing bulk upload for', itemsData.length, 'items');
    console.log('Category ID:', categoryId, 'Subcategory ID:', subcategoryId);

    // Images will be processed individually for each item
    console.log('Images will be processed individually for each item');
    console.log('Available images:', images.map(f => f.originalname));

    // Process each item
    const results = {
      successful: [],
      failed: [],
      totalProcessed: itemsData.length
    };

    for (let i = 0; i < itemsData.length; i++) {
      const itemData = itemsData[i];
      console.log(`Processing item ${i + 1}/${itemsData.length}:`, itemData.name || 'Unnamed item');

      try {
        // Validate required fields
        if (!itemData.name || !itemData.price) {
          throw new Error('Name and price are required');
        }

        // Validate price
        const price = parseFloat(itemData.price);
        if (isNaN(price) || price < 0) {
          throw new Error('Price must be a valid non-negative number');
        }

        // Validate discount price if provided
        let discountPrice = 0;
        if (itemData.discountPrice !== undefined) {
          discountPrice = parseFloat(itemData.discountPrice);
          if (isNaN(discountPrice) || discountPrice < 0) {
            throw new Error('Discount price must be a valid non-negative number');
          }
          if (discountPrice >= price) {
            throw new Error('Discount price must be less than original price');
          }
        }

        // Validate discount percentage if provided
        let discountPercentage = 0;
        if (itemData.discountPercentage !== undefined) {
          discountPercentage = parseFloat(itemData.discountPercentage);
          if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
            throw new Error('Discount percentage must be between 0 and 100');
          }
        }

        // Process thumbnail image
        let thumbnailImageUrl = '';
        if (itemData.thumbnailImageKey) {
          // Find image by filename
          const thumbnailImage = images.find(file => file.originalname === itemData.thumbnailImageKey);
          if (thumbnailImage) {
            console.log(`Found thumbnail image: ${itemData.thumbnailImageKey}`);
            thumbnailImageUrl = await uploadImageToS3(thumbnailImage, 'items/bulk-upload');
            console.log(`Thumbnail uploaded to S3: ${thumbnailImageUrl}`);
          } else {
            throw new Error(`Thumbnail image not found: ${itemData.thumbnailImageKey}`);
          }
        } else if (itemData.thumbnailImage) {
          // If thumbnail image URL is provided directly
          thumbnailImageUrl = itemData.thumbnailImage;
        } else {
          throw new Error('Thumbnail image is required');
        }

        // Process variants if provided
        let processedVariants = [];
        if (itemData.variants && Array.isArray(itemData.variants)) {
          for (const variant of itemData.variants) {
            if (!variant.size || !variant.colors || !Array.isArray(variant.colors)) {
              throw new Error('Each variant must have size and colors array');
            }

            const processedColors = [];
            for (const color of variant.colors) {
              if (!color.name || !color.sku) {
                throw new Error('Each color must have name and SKU');
              }

              // Validate hex code if provided
              if (color.hexCode && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.hexCode)) {
                throw new Error('Invalid color hex code format');
              }

              // Check if SKU already exists
              const existingItem = await Item.findOne({
                'variants.colors.sku': color.sku.toUpperCase()
              });
              if (existingItem) {
                throw new Error(`SKU ${color.sku} already exists in another item`);
              }

              // Process images for this color
              let colorImages = [];
              if (color.imageKeys && Array.isArray(color.imageKeys)) {
                console.log(`Processing images for color: ${color.name}`);
                // Find images by filename
                const matchedImages = images.filter(file =>
                  color.imageKeys.includes(file.originalname)
                );
                if (matchedImages.length === 0) {
                  console.log(`Warning: No matching images found for color ${color.name}`);
                } else {
                  console.log(`Found ${matchedImages.length} images for color ${color.name}:`, matchedImages.map(f => f.originalname));
                  // Upload images to S3
                  const imageUrls = await uploadMultipleImagesToS3(matchedImages, 'items/variants');
                  colorImages = imageUrls;
                }
              } else if (color.images && Array.isArray(color.images)) {
                // If image URLs are provided directly
                colorImages = color.images;
              }

              // Limit to 5 images per color
              if (colorImages.length > 5) {
                colorImages = colorImages.slice(0, 5);
              }

              processedColors.push({
                name: color.name.trim(),
                hexCode: color.hexCode || null,
                images: colorImages,
                sku: color.sku.toUpperCase().trim(),
                stock: color.stock ? parseInt(color.stock) : 0
              });
            }

            processedVariants.push({
              size: variant.size.trim(),
              colors: processedColors
            });
          }
        }

        // Process key highlights if provided
        let processedKeyHighlights = [];
        if (itemData.keyHighlights && Array.isArray(itemData.keyHighlights)) {
          for (const highlight of itemData.keyHighlights) {
            if (!highlight.key || !highlight.value) {
              throw new Error('Each key highlight must have key and value');
            }
            if (highlight.key.length > 100 || highlight.value.length > 200) {
              throw new Error('Key highlight key or value exceeds maximum length');
            }
            processedKeyHighlights.push({
              key: highlight.key.trim(),
              value: highlight.value.trim()
            });
          }
        }

        // Process filters if provided
        let processedFilters = [];
        if (itemData.filters && Array.isArray(itemData.filters)) {
          for (const filter of itemData.filters) {
            if (!filter.key || !filter.values || !Array.isArray(filter.values) || filter.values.length === 0) {
              throw new Error('Each filter must have key and values array');
            }
            if (filter.key.length > 100) {
              throw new Error('Filter key exceeds maximum length');
            }
            
            // Validate filter values
            const validValues = filter.values.filter(value => 
              value && typeof value === 'string' && value.trim().length > 0 && value.length <= 100
            );
            
            if (validValues.length === 0) {
              throw new Error('Each filter must have at least one valid value');
            }

            // Process display values if provided
            let displayValues = validValues;
            if (filter.displayValues && Array.isArray(filter.displayValues)) {
              displayValues = filter.displayValues.filter((value, index) => 
                value && typeof value === 'string' && value.trim().length > 0 && value.length <= 100 && index < validValues.length
              );
              // Ensure displayValues has same length as values
              while (displayValues.length < validValues.length) {
                displayValues.push(validValues[displayValues.length]);
              }
            }

            processedFilters.push({
              key: filter.key.trim(),
              values: validValues.map(v => v.trim()),
              displayValues: displayValues.map(v => v.trim())
            });
          }
        }

        // Create new item with category and subcategory IDs
        const item = new Item({
          name: itemData.name.trim(),
          description: itemData.description ? itemData.description.trim() : '',
          price: price,
          discountPrice: discountPrice,
          discountPercentage: discountPercentage,
          thumbnailImage: thumbnailImageUrl,
          categoryId: categoryId,
          subcategoryId: subcategoryId,
          keyHighlights: processedKeyHighlights,
          variants: processedVariants,
          filters: processedFilters
        });

        await item.save();
        console.log(`Item ${i + 1} created successfully:`, item._id);
        
        results.successful.push({
          index: i,
          name: itemData.name,
          id: item._id,
          message: 'Item created successfully'
        });

      } catch (itemError) {
        console.error(`Item ${i + 1} failed:`, itemError.message);
        results.failed.push({
          index: i,
          name: itemData.name || 'Unnamed item',
          error: itemError.message
        });
      }
    }

    console.log('Bulk upload completed. Successful:', results.successful.length, 'Failed:', results.failed.length);

    res.status(200).json(
      apiResponse(200, true, 'Bulk upload completed', {
        totalProcessed: results.totalProcessed,
        successful: results.successful,
        failed: results.failed,
        summary: {
          successCount: results.successful.length,
          failureCount: results.failed.length,
          successRate: ((results.successful.length / results.totalProcessed) * 100).toFixed(2) + '%'
        }
      })
    );

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to process bulk upload', { error: error.message })
    );
  }
};

// Get available filter options
const getAvailableFilters = async (req, res) => {
  console.log('=== getAvailableFilters called ===');
  console.log('Query parameters:', req.query);
  
  try {
    const { categoryId, subcategoryId } = req.query;
    console.log('Getting available filters for categoryId:', categoryId, 'subcategoryId:', subcategoryId);

    const filters = await Item.getAvailableFilters(categoryId, subcategoryId);
    console.log('Retrieved available filters count:', filters.length);

    res.status(200).json(
      apiResponse(200, true, 'Available filters retrieved successfully', filters)
    );

  } catch (error) {
    console.error('Get available filters error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve available filters')
    );
  }
};

// Add filter to item
const addItemFilter = async (req, res) => {
  console.log('=== addItemFilter called ===');
  console.log('Item ID:', req.params.id);
  console.log('Filter data:', req.body);
  
  try {
    const { id } = req.params;
    const { key, values, displayValues } = req.body;

    if (!key || !values || !Array.isArray(values) || values.length === 0) {
      console.log('Validation failed: Missing required filter fields');
      return res.status(400).json(
        apiResponse(400, false, 'Filter key and values array are required')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for adding filter:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, adding filter - key:', key, 'values:', values);
    await item.addFilter(key, values, displayValues);
    console.log('Filter added successfully');

    res.status(200).json(
      apiResponse(200, true, 'Filter added successfully', item)
    );

  } catch (error) {
    console.error('Add item filter error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to add filter')
    );
  }
};

// Update item filter
const updateItemFilter = async (req, res) => {
  console.log('=== updateItemFilter called ===');
  console.log('Item ID:', req.params.id);
  console.log('Filter update data:', req.body);
  
  try {
    const { id } = req.params;
    const { key, values, displayValues } = req.body;

    if (!key || !values || !Array.isArray(values) || values.length === 0) {
      console.log('Validation failed: Missing required filter fields');
      return res.status(400).json(
        apiResponse(400, false, 'Filter key and values array are required')
      );
    }

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for updating filter:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, updating filter - key:', key, 'values:', values);
    await item.updateFilter(key, values, displayValues);
    console.log('Filter updated successfully');

    res.status(200).json(
      apiResponse(200, true, 'Filter updated successfully', item)
    );

  } catch (error) {
    console.error('Update item filter error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update filter')
    );
  }
};

// Remove item filter
const removeItemFilter = async (req, res) => {
  console.log('=== removeItemFilter called ===');
  console.log('Item ID:', req.params.id);
  console.log('Filter key to remove:', req.params.filterKey);
  
  try {
    const { id, filterKey } = req.params;

    const item = await Item.findById(id);
    if (!item) {
      console.log('Item not found for removing filter:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found, removing filter - key:', filterKey);
    await item.removeFilter(filterKey);
    console.log('Filter removed successfully');

    res.status(200).json(
      apiResponse(200, true, 'Filter removed successfully', item)
    );

  } catch (error) {
    console.error('Remove item filter error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to remove filter')
    );
  }
};

// Get items by specific filter (updated to use new filter system)
const getItemsByFilter = async (req, res) => {
  console.log('=== getItemsByFilter called ===');
  console.log('Filter key:', req.params.filterKey);
  console.log('Filter value:', req.params.filterValue);
  console.log('Query parameters:', req.query);
  
  try {
    const { filterKey, filterValue } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = req.query;

    if (!filterKey || !filterValue) {
      console.log('Validation failed: Missing filter key or value');
      return res.status(400).json(
        apiResponse(400, false, 'Filter key and value are required')
      );
    }

    console.log('Getting items by filter using new filter system - key:', filterKey, 'value:', filterValue);

    // Create filter criteria using the new system
    const filters = {
      [filterKey]: [filterValue]
    };

    // Build query options
    const queryOptions = {
      sortBy: sortBy,
      sortOrder: parseInt(sortOrder),
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const items = await Item.getByFilters(filters, queryOptions);
    console.log('Retrieved items by filter count:', items.length);

    // Get total count using the new filter system
    const totalQuery = {
      'filters.key': filterKey,
      'filters.values': filterValue
    };
    const total = await Item.countDocuments(totalQuery);

    res.status(200).json(
      apiResponse(200, true, 'Items by filter retrieved successfully', {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filter: { key: filterKey, value: filterValue },
        filters: filters
      })
    );

  } catch (error) {
    console.error('Get items by filter error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve items by filter')
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
  uploadVariantImages,
  updateVariantImages,
  bulkUploadItems,
  getAvailableFilters,
  addItemFilter,
  updateItemFilter,
  removeItemFilter,
  getItemsByFilter
};
