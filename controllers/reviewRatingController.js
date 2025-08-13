const ReviewRating = require('../models/reviewRating');
const User = require('../models/user');
const Item = require('../models/item');
const { uploadImageToS3, deleteFromS3, uploadMultipleImagesToS3 } = require('../utils/s3Upload');
const { apiResponse } = require('../utils/apiResponse');

// Create new review and rating
const createReviewRating = async (req, res) => {
  console.log('=== createReviewRating called ===');
  console.log('Request body:', req.body);
  console.log('Images count:', req.files ? req.files.length : 0);
  console.log('User ID:', req.user.userId);
  
  try {
    const { itemId, rating, title, text } = req.body;
    const images = req.files;
    const userId = req.user.userId;
    console.log('Extracted data - itemId:', itemId, 'rating:', rating, 'title:', title, 'text:', text);

    if (!itemId || !rating || !title || !text) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json(
        apiResponse(400, false, 'Item ID, rating, title, and text are required')
      );
    }

    if (rating < 1 || rating > 5) {
      console.log('Validation failed: Invalid rating value');
      return res.status(400).json(
        apiResponse(400, false, 'Rating must be between 1 and 5')
      );
    }

    console.log('Input validation passed');

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) {
      console.log('Item not found:', itemId);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found:', item._id);

    // Check if user has already reviewed this item
    const existingReview = await ReviewRating.findOne({ user: userId, item: itemId });
    if (existingReview) {
      console.log('User already reviewed this item:', existingReview._id);
      return res.status(400).json(
        apiResponse(400, false, 'You have already reviewed this item')
      );
    }

    console.log('No existing review found, proceeding with creation');

    let imageUrls = [];
    if (images && images.length > 0) {
      console.log('Uploading review images to S3...');
      // Upload images to S3
      imageUrls = await uploadMultipleImagesToS3(images, 'reviews');
      console.log('Review images uploaded to S3, count:', imageUrls.length);
    }

    // Create new review and rating
    const reviewRating = new ReviewRating({
      user: userId,
      item: itemId,
      rating,
      title,
      text,
      images: imageUrls.map(url => ({ url }))
    });
    console.log('New review rating instance created:', reviewRating);

    await reviewRating.save();
    console.log('Review rating saved successfully:', reviewRating._id);

    // Populate user and item details
    await reviewRating.populate('user', 'firstname lastname profileImage');
    await reviewRating.populate('item', 'name thumbnailImage');
    console.log('User and item details populated');

    res.status(201).json(
      apiResponse(201, true, 'Review and rating created successfully', reviewRating)
    );

  } catch (error) {
    console.error('Create review rating error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to create review and rating')
    );
  }
};

// Get all reviews and ratings
const getAllReviewRatings = async (req, res) => {
  console.log('=== getAllReviewRatings called ===');
  console.log('Query parameters:', req.query);
  
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = -1, 
      itemId, 
      userId,
      rating,
      isActive 
    } = req.query;
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'itemId:', itemId, 'userId:', userId, 'rating:', rating, 'isActive:', isActive);

    // Build query
    const query = {};
    
    if (itemId) {
      query.item = itemId;
      console.log('Added item filter:', itemId);
    }
    if (userId) {
      query.user = userId;
      console.log('Added user filter:', userId);
    }
    if (rating) {
      query.rating = parseInt(rating);
      console.log('Added rating filter:', rating);
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('Added isActive filter:', query.isActive);
    }

    console.log('Final query:', query);

    // Build sort object
    const sort = {};
    sort[sortBy] = parseInt(sortOrder);
    console.log('Sort object:', sort);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    const reviewRatings = await ReviewRating.find(query)
      .populate('user', 'firstname lastname profileImage')
      .populate('item', 'name thumbnailImage')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Retrieved review ratings count:', reviewRatings.length);

    const total = await ReviewRating.countDocuments(query);
    console.log('Total review ratings count:', total);

    res.status(200).json(
      apiResponse(200, true, 'Reviews and ratings retrieved successfully', {
        reviewRatings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Get review ratings error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve reviews and ratings')
    );
  }
};

// Get review and rating by ID
const getReviewRatingById = async (req, res) => {
  console.log('=== getReviewRatingById called ===');
  console.log('Review ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const reviewRating = await ReviewRating.findById(id)
      .populate('user', 'firstname lastname profileImage')
      .populate('item', 'name thumbnailImage');

    if (!reviewRating) {
      console.log('Review rating not found:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Review and rating not found')
      );
    }

    console.log('Review rating found:', reviewRating._id);
    res.status(200).json(
      apiResponse(200, true, 'Review and rating retrieved successfully', reviewRating)
    );

  } catch (error) {
    console.error('Get review rating error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve review and rating')
    );
  }
};

// Update review and rating
const updateReviewRating = async (req, res) => {
  console.log('=== updateReviewRating called ===');
  console.log('Review ID:', req.params.id);
  console.log('Update data:', req.body);
  console.log('Images count:', req.files ? req.files.length : 0);
  console.log('User ID:', req.user.userId);
  
  try {
    const { id } = req.params;
    const { rating, title, text } = req.body;
    const images = req.files;
    const userId = req.user.userId;
    console.log('Extracted update data - rating:', rating, 'title:', title, 'text:', text);

    const reviewRating = await ReviewRating.findById(id);
    if (!reviewRating) {
      console.log('Review rating not found for update:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Review and rating not found')
      );
    }

    console.log('Review rating found for update:', reviewRating._id);

    // Check if user owns this review or is admin
    if (reviewRating.user.toString() !== userId && req.user.role !== 'admin') {
      console.log('User not authorized to update this review');
      return res.status(403).json(
        apiResponse(403, false, 'You can only update your own reviews')
      );
    }

    console.log('User authorized to update review');

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      console.log('Validation failed: Invalid rating value');
      return res.status(400).json(
        apiResponse(400, false, 'Rating must be between 1 and 5')
      );
    }

    // Update fields
    if (rating !== undefined) {
      reviewRating.rating = rating;
      console.log('Rating updated');
    }
    if (title !== undefined) {
      reviewRating.title = title;
      console.log('Title updated');
    }
    if (text !== undefined) {
      reviewRating.text = text;
      console.log('Text updated');
    }

    // Handle image updates if provided
    if (images && images.length > 0) {
      console.log('Processing review image updates...');
      try {
        // Upload new images to S3
        console.log('Uploading new review images to S3...');
        const imageUrls = await uploadMultipleImagesToS3(images, 'reviews');
        console.log('New review images uploaded to S3, count:', imageUrls.length);

        // Delete old images from S3
        if (reviewRating.images && reviewRating.images.length > 0) {
          console.log('Deleting old review images from S3...');
          for (const image of reviewRating.images) {
            try {
              await deleteFromS3(image.url);
              console.log('Old review image deleted from S3:', image.url);
            } catch (deleteError) {
              console.error('Failed to delete old review image:', deleteError);
            }
          }
        }

        reviewRating.images = imageUrls.map(url => ({ url }));
        console.log('Review images updated successfully');
      } catch (imageError) {
        console.error('Review image upload error:', imageError);
        return res.status(500).json(
          apiResponse(500, false, 'Failed to upload review images')
        );
      }
    }

    await reviewRating.save();
    console.log('Review rating updated and saved successfully');

    // Populate user and item details
    await reviewRating.populate('user', 'firstname lastname profileImage');
    await reviewRating.populate('item', 'name thumbnailImage');
    console.log('User and item details populated');

    res.status(200).json(
      apiResponse(200, true, 'Review and rating updated successfully', reviewRating)
    );

  } catch (error) {
    console.error('Update review rating error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update review and rating')
    );
  }
};

// Delete review and rating
const deleteReviewRating = async (req, res) => {
  console.log('=== deleteReviewRating called ===');
  console.log('Review ID:', req.params.id);
  console.log('User ID:', req.user.userId);
  
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const reviewRating = await ReviewRating.findById(id);
    if (!reviewRating) {
      console.log('Review rating not found for deletion:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Review and rating not found')
      );
    }

    console.log('Review rating found for deletion:', reviewRating._id);

    // Check if user owns this review or is admin
    if (reviewRating.user.toString() !== userId && req.user.role !== 'admin') {
      console.log('User not authorized to delete this review');
      return res.status(403).json(
        apiResponse(403, false, 'You can only delete your own reviews')
      );
    }

    console.log('User authorized to delete review');

    // Delete images from S3
    if (reviewRating.images && reviewRating.images.length > 0) {
      console.log('Deleting review images from S3...');
      for (const image of reviewRating.images) {
        try {
          await deleteFromS3(image.url);
          console.log('Review image deleted from S3:', image.url);
        } catch (deleteError) {
          console.error('Failed to delete review image from S3:', deleteError);
        }
      }
    }

    await ReviewRating.findByIdAndDelete(id);
    console.log('Review rating deleted from database successfully');

    res.status(200).json(
      apiResponse(200, true, 'Review and rating deleted successfully')
    );

  } catch (error) {
    console.error('Delete review rating error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to delete review and rating')
    );
  }
};

// Toggle review and rating status (admin only)
const toggleReviewRatingStatus = async (req, res) => {
  console.log('=== toggleReviewRatingStatus called ===');
  console.log('Review ID:', req.params.id);
  
  try {
    const { id } = req.params;

    const reviewRating = await ReviewRating.findById(id);
    if (!reviewRating) {
      console.log('Review rating not found for status toggle:', id);
      return res.status(404).json(
        apiResponse(404, false, 'Review and rating not found')
      );
    }

    console.log('Review rating found, current status:', reviewRating.isActive);
    reviewRating.isActive = !reviewRating.isActive;
    await reviewRating.save();
    console.log('Review rating status toggled successfully');

    // Populate user and item details
    await reviewRating.populate('user', 'firstname lastname profileImage');
    await reviewRating.populate('item', 'name thumbnailImage');
    console.log('User and item details populated');

    res.status(200).json(
      apiResponse(200, true, 'Review and rating status toggled successfully', reviewRating)
    );

  } catch (error) {
    console.error('Toggle review rating status error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to toggle review and rating status')
    );
  }
};

// Get reviews and ratings by item
const getReviewRatingsByItem = async (req, res) => {
  console.log('=== getReviewRatingsByItem called ===');
  console.log('Item ID:', req.params.itemId);
  console.log('Query parameters:', req.query);
  
  try {
    const { itemId } = req.params;
    const { page = 1, limit = 10, rating, isActive = true } = req.query;
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'rating:', rating, 'isActive:', isActive);

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) {
      console.log('Item not found:', itemId);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found:', item._id);

    // Build query
    const query = { item: itemId };
    if (rating) {
      query.rating = parseInt(rating);
      console.log('Added rating filter:', rating);
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('Added isActive filter:', query.isActive);
    }

    console.log('Final query:', query);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    const reviewRatings = await ReviewRating.find(query)
      .populate('user', 'firstname lastname profileImage')
      .populate('item', 'name thumbnailImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Retrieved review ratings count:', reviewRatings.length);

    const total = await ReviewRating.countDocuments(query);
    console.log('Total review ratings count:', total);

    // Calculate average rating
    console.log('Calculating average rating...');
    const avgRating = await ReviewRating.aggregate([
      { $match: { item: item._id, isActive: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    const averageRating = avgRating.length > 0 ? Math.round(avgRating[0].avgRating * 10) / 10 : 0;
    console.log('Average rating calculated:', averageRating);

    res.status(200).json(
      apiResponse(200, true, 'Reviews and ratings by item retrieved successfully', {
        reviewRatings,
        averageRating,
        totalReviews: total,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Get review ratings by item error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve reviews and ratings by item')
    );
  }
};

// Get reviews and ratings by user
const getReviewRatingsByUser = async (req, res) => {
  console.log('=== getReviewRatingsByUser called ===');
  console.log('User ID:', req.params.userId);
  console.log('Query parameters:', req.query);
  
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, isActive = true } = req.query;
    console.log('Parsed parameters - page:', page, 'limit:', limit, 'isActive:', isActive);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json(
        apiResponse(404, false, 'User not found')
      );
    }

    console.log('User found:', user._id);

    // Build query
    const query = { user: userId };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('Added isActive filter:', query.isActive);
    }

    console.log('Final query:', query);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination - skip:', skip, 'limit:', limit);

    const reviewRatings = await ReviewRating.find(query)
      .populate('user', 'firstname lastname profileImage')
      .populate('item', 'name thumbnailImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Retrieved review ratings count:', reviewRatings.length);

    const total = await ReviewRating.countDocuments(query);
    console.log('Total review ratings count:', total);

    res.status(200).json(
      apiResponse(200, true, 'Reviews and ratings by user retrieved successfully', {
        reviewRatings,
        totalReviews: total,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Get review ratings by user error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve reviews and ratings by user')
    );
  }
};

// Search reviews and ratings
const searchReviewRatings = async (req, res) => {
  console.log('=== searchReviewRatings called ===');
  console.log('Search query:', req.query.q);
  console.log('Pagination:', req.query.page, req.query.limit);
  console.log('Filters:', req.query.rating, req.query.isActive);
  
  try {
    const { q, page = 1, limit = 10, rating, isActive = true } = req.query;

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
        { title: searchRegex },
        { text: searchRegex }
      ]
    };

    if (rating) {
      query.rating = parseInt(rating);
      console.log('Added rating filter:', rating);
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('Added isActive filter:', query.isActive);
    }

    console.log('Final search query:', query);

    const reviewRatings = await ReviewRating.find(query)
      .populate('user', 'firstname lastname profileImage')
      .populate('item', 'name thumbnailImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('Search results count:', reviewRatings.length);

    const total = await ReviewRating.countDocuments(query);
    console.log('Total search results:', total);

    res.status(200).json(
      apiResponse(200, true, 'Reviews and ratings search completed', {
        reviewRatings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      })
    );

  } catch (error) {
    console.error('Search review ratings error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to search reviews and ratings')
    );
  }
};

// Get review statistics for an item
const getItemReviewStats = async (req, res) => {
  console.log('=== getItemReviewStats called ===');
  console.log('Item ID:', req.params.itemId);
  
  try {
    const { itemId } = req.params;

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) {
      console.log('Item not found:', itemId);
      return res.status(404).json(
        apiResponse(404, false, 'Item not found')
      );
    }

    console.log('Item found:', item._id);

    // Get review statistics
    console.log('Calculating review statistics...');
    const stats = await ReviewRating.aggregate([
      { $match: { item: item._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      console.log('No reviews found for item');
      return res.status(200).json(
        apiResponse(200, true, 'No reviews found for this item', {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        })
      );
    }

    const stat = stats[0];
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    stat.ratingDistribution.forEach(rating => {
      ratingDistribution[rating]++;
    });

    const result = {
      totalReviews: stat.totalReviews,
      averageRating: Math.round(stat.averageRating * 10) / 10,
      ratingDistribution
    };

    console.log('Review statistics calculated:', result);
    res.status(200).json(
      apiResponse(200, true, 'Review statistics retrieved successfully', result)
    );

  } catch (error) {
    console.error('Get item review stats error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to retrieve review statistics')
    );
  }
};

module.exports = {
  createReviewRating,
  getAllReviewRatings,
  getReviewRatingById,
  updateReviewRating,
  deleteReviewRating,
  toggleReviewRatingStatus,
  getReviewRatingsByItem,
  getReviewRatingsByUser,
  searchReviewRatings,
  getItemReviewStats
};
