const HomePage = require('../models/homePage');
const { uploadImageToS3, deleteFromS3, uploadMultipleImagesToS3 } = require('../utils/s3Upload');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get home page data
exports.getHomePage = async (req, res) => {
  try {
    const homePage = await HomePage.getOrCreate();
    
    // Convert Map to regular object for JSON response
    const banners = {};
    homePage.banners.forEach((value, key) => {
      banners[key] = value;
    });

    const homePageData = {
      _id: homePage._id,
      banners,
      createdAt: homePage.createdAt,
      updatedAt: homePage.updatedAt
    };

    res.json(successResponse('Home page data retrieved successfully', homePageData));
  } catch (error) {
    console.error('Error getting home page:', error);
    res.status(500).json(errorResponse('Failed to retrieve home page data', error.message));
  }
};

// Get banners by key
exports.getBannersByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const homePage = await HomePage.getOrCreate();
    const bannerImages = homePage.getBannerImages(key);

    res.json(successResponse(`Banners for ${key} retrieved successfully`, {
      key,
      images: bannerImages
    }));
  } catch (error) {
    console.error('Error getting banners by key:', error);
    res.status(500).json(errorResponse('Failed to retrieve banners', error.message));
  }
};

// Get all banner keys
exports.getAllBannerKeys = async (req, res) => {
  try {
    const homePage = await HomePage.getOrCreate();
    const bannerKeys = homePage.getBannerKeys();

    res.json(successResponse('Banner keys retrieved successfully', {
      keys: bannerKeys
    }));
  } catch (error) {
    console.error('Error getting banner keys:', error);
    res.status(500).json(errorResponse('Failed to retrieve banner keys', error.message));
  }
};

// Create new banner with uploaded images
exports.createBanner = async (req, res) => {
  try {
    const { key } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json(errorResponse('No files uploaded'));
    }

    // Upload images to S3
    const imageUrls = await uploadMultipleImagesToS3(files, `banners/${key}`);

    // Create/Update banner in database
    const homePage = await HomePage.getOrCreate();
    await homePage.updateBanner(key, imageUrls);

    res.json(successResponse(`Banner ${key} created successfully`, {
      key,
      images: imageUrls
    }));
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json(errorResponse('Failed to create banner', error.message));
  }
};

// Upload and update banner images
exports.uploadBannerImages = async (req, res) => {
  try {
    const { key } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json(errorResponse('No files uploaded'));
    }

    // Upload images to S3
    const imageUrls = await uploadMultipleImagesToS3(files, `banners/${key}`);

    // Update banner in database
    const homePage = await HomePage.getOrCreate();
    await homePage.updateBanner(key, imageUrls);

    res.json(successResponse(`Banner ${key} images uploaded successfully`, {
      key,
      images: imageUrls
    }));
  } catch (error) {
    console.error('Error uploading banner images:', error);
    res.status(500).json(errorResponse('Failed to upload banner images', error.message));
  }
};

// Remove banner
exports.removeBanner = async (req, res) => {
  try {
    const { key } = req.params;
    const homePage = await HomePage.getOrCreate();
    
    // Get current images before deletion
    const currentImages = homePage.getBannerImages(key);
    
    // Remove banner from database
    await homePage.removeBanner(key);

    // Delete images from S3 if they exist
    if (currentImages && currentImages.length > 0) {
      try {
        await Promise.all(currentImages.map(imageUrl => deleteFromS3(imageUrl)));
      } catch (s3Error) {
        console.warn('Some S3 deletions failed:', s3Error);
        // Continue even if S3 deletion fails
      }
    }

    res.json(successResponse(`Banner ${key} removed successfully`));
  } catch (error) {
    console.error('Error removing banner:', error);
    res.status(500).json(errorResponse('Failed to remove banner', error.message));
  }
};

// Delete specific image from banner
exports.deleteBannerImage = async (req, res) => {
  try {
    const { key } = req.params;
    const { imageUrl } = req.query;
    
    if (!imageUrl) {
      return res.status(400).json(errorResponse('Image URL is required as query parameter'));
    }
    
    const homePage = await HomePage.getOrCreate();
    
    // Get current images
    const currentImages = homePage.getBannerImages(key);
    
    // Remove specific image
    const updatedImages = currentImages.filter(img => img !== imageUrl);
    
    if (updatedImages.length === currentImages.length) {
      return res.status(404).json(errorResponse('Image not found in banner'));
    }

    // Update banner with remaining images
    await homePage.updateBanner(key, updatedImages);

    // Delete image from S3
    try {
      await deleteFromS3(imageUrl);
    } catch (s3Error) {
      console.warn('S3 deletion failed:', s3Error);
      // Continue even if S3 deletion fails
    }

    res.json(successResponse(`Image removed from banner ${key} successfully`, {
      key,
      remainingImages: updatedImages
    }));
  } catch (error) {
    console.error('Error deleting banner image:', error);
    res.status(500).json(errorResponse('Failed to delete banner image', error.message));
  }
};

// Reset home page to default state
exports.resetHomePage = async (req, res) => {
  try {
    await HomePage.deleteMany({});
    const homePage = await HomePage.getOrCreate();

    res.json(successResponse('Home page reset successfully', {
      _id: homePage._id,
      banners: {},
      createdAt: homePage.createdAt,
      updatedAt: homePage.updatedAt
    }));
  } catch (error) {
    console.error('Error resetting home page:', error);
    res.status(500).json(errorResponse('Failed to reset home page', error.message));
  }
};
