const HomePage = require('../models/homePage');
const { uploadImageToS3, deleteFromS3, uploadMultipleImagesToS3 } = require('../utils/s3Upload');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get home page data
exports.getHomePage = async (req, res) => {
  try {
    console.log('=== getHomePage START ===');
    console.log('Request received for getHomePage');
    
    const homePage = await HomePage.getOrCreate();
    console.log('HomePage retrieved/created:', {
      _id: homePage._id,
      bannersCount: homePage.banners ? homePage.banners.size : 0,
      createdAt: homePage.createdAt,
      updatedAt: homePage.updatedAt
    });
    
    // Convert Map to regular object for JSON response
    const banners = {};
    if (homePage.banners) {
      homePage.banners.forEach((value, key) => {
        banners[key] = value;
        console.log(`Banner key: ${key}, images count: ${value ? value.length : 0}`);
      });
    }
    console.log('Converted banners object:', banners);

    const homePageData = {
      _id: homePage._id,
      banners,
      createdAt: homePage.createdAt,
      updatedAt: homePage.updatedAt
    };
    console.log('Final homePageData:', homePageData);

    res.json(successResponse('Home page data retrieved successfully', homePageData));
    console.log('=== getHomePage SUCCESS ===');
  } catch (error) {
    console.error('=== getHomePage ERROR ===');
    console.error('Error getting home page:', error);
    res.status(500).json(errorResponse('Failed to retrieve home page data', error.message));
  }
};

// Get banners by key
exports.getBannersByKey = async (req, res) => {
  try {
    console.log('=== getBannersByKey START ===');
    const { key } = req.params;
    console.log('Requested banner key:', key);
    
    const homePage = await HomePage.getOrCreate();
    console.log('HomePage retrieved for key:', key);
    
    const bannerImages = homePage.getBannerImages(key);
    console.log('Banner images retrieved:', {
      key,
      imagesCount: bannerImages ? bannerImages.length : 0,
      images: bannerImages
    });

    res.json(successResponse(`Banners for ${key} retrieved successfully`, {
      key,
      images: bannerImages
    }));
    console.log('=== getBannersByKey SUCCESS ===');
  } catch (error) {
    console.error('=== getBannersByKey ERROR ===');
    console.error('Error getting banners by key:', error);
    res.status(500).json(errorResponse('Failed to retrieve banners', error.message));
  }
};

// Get all banner keys
exports.getAllBannerKeys = async (req, res) => {
  try {
    console.log('=== getAllBannerKeys START ===');
    const homePage = await HomePage.getOrCreate();
    console.log('HomePage retrieved for getting all keys');
    
    const bannerKeys = homePage.getBannerKeys();
    console.log('Banner keys retrieved:', {
      keysCount: bannerKeys ? bannerKeys.length : 0,
      keys: bannerKeys
    });

    res.json(successResponse('Banner keys retrieved successfully', {
      keys: bannerKeys
    }));
    console.log('=== getAllBannerKeys SUCCESS ===');
  } catch (error) {
    console.error('=== getAllBannerKeys ERROR ===');
    console.error('Error getting banner keys:', error);
    res.status(500).json(errorResponse('Failed to retrieve banner keys', error.message));
  }
};

// Create new banner with uploaded images
exports.createBanner = async (req, res) => {
  try {
    console.log('=== createBanner START ===');
    const { key } = req.params;
    const files = req.files;
    console.log('Create banner request:', {
      key,
      filesCount: files ? files.length : 0,
      files: files ? files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })) : []
    });

    if (!files || files.length === 0) {
      console.log('No files uploaded, returning error');
      return res.status(400).json(errorResponse('No files uploaded'));
    }

    // Upload images to S3
    console.log('Uploading images to S3...');
    const imageUrls = await uploadMultipleImagesToS3(files, `banners/${key}`);
    console.log('Images uploaded to S3:', imageUrls);

    // Create/Update banner in database
    console.log('Updating banner in database...');
    const homePage = await HomePage.getOrCreate();
    await homePage.updateBanner(key, imageUrls);
    console.log('Banner updated in database successfully');

    res.json(successResponse(`Banner ${key} created successfully`, {
      key,
      images: imageUrls
    }));
    console.log('=== createBanner SUCCESS ===');
  } catch (error) {
    console.error('=== createBanner ERROR ===');
    console.error('Error creating banner:', error);
    res.status(500).json(errorResponse('Failed to create banner', error.message));
  }
};

// Upload and update banner images
exports.uploadBannerImages = async (req, res) => {
  try {
    console.log('=== uploadBannerImages START ===');
    const { key } = req.params;
    const files = req.files;
    console.log('Upload banner images request:', {
      key,
      filesCount: files ? files.length : 0,
      files: files ? files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })) : []
    });

    if (!files || files.length === 0) {
      console.log('No files uploaded, returning error');
      return res.status(400).json(errorResponse('No files uploaded'));
    }

    // Upload images to S3
    console.log('Uploading images to S3...');
    const imageUrls = await uploadMultipleImagesToS3(files, `banners/${key}`);
    console.log('Images uploaded to S3:', imageUrls);

    // Update banner in database
    console.log('Updating banner in database...');
    const homePage = await HomePage.getOrCreate();
    await homePage.updateBanner(key, imageUrls);
    console.log('Banner updated in database successfully');

    res.json(successResponse(`Banner ${key} images uploaded successfully`, {
      key,
      images: imageUrls
    }));
    console.log('=== uploadBannerImages SUCCESS ===');
  } catch (error) {
    console.error('=== uploadBannerImages ERROR ===');
    console.error('Error uploading banner images:', error);
    res.status(500).json(errorResponse('Failed to upload banner images', error.message));
  }
};

// Remove banner
exports.removeBanner = async (req, res) => {
  try {
    console.log('=== removeBanner START ===');
    const { key } = req.params;
    console.log('Remove banner request for key:', key);
    
    const homePage = await HomePage.getOrCreate();
    console.log('HomePage retrieved for removal');
    
    // Get current images before deletion
    const currentImages = homePage.getBannerImages(key);
    console.log('Current images to be deleted:', {
      key,
      imagesCount: currentImages ? currentImages.length : 0,
      images: currentImages
    });
    
    // Remove banner from database
    console.log('Removing banner from database...');
    await homePage.removeBanner(key);
    console.log('Banner removed from database successfully');

    // Delete images from S3 if they exist
    if (currentImages && currentImages.length > 0) {
      console.log('Deleting images from S3...');
      try {
        await Promise.all(currentImages.map(imageUrl => deleteFromS3(imageUrl)));
        console.log('All images deleted from S3 successfully');
      } catch (s3Error) {
        console.warn('Some S3 deletions failed:', s3Error);
        // Continue even if S3 deletion fails
      }
    } else {
      console.log('No images to delete from S3');
    }

    res.json(successResponse(`Banner ${key} removed successfully`));
    console.log('=== removeBanner SUCCESS ===');
  } catch (error) {
    console.error('=== removeBanner ERROR ===');
    console.error('Error removing banner:', error);
    res.status(500).json(errorResponse('Failed to remove banner', error.message));
  }
};

// Delete specific image from banner
exports.deleteBannerImage = async (req, res) => {
  try {
    console.log('=== deleteBannerImage START ===');
    const { key } = req.params;
    const { imageUrl } = req.query;
    console.log('Delete banner image request:', {
      key,
      imageUrl
    });
    
    if (!imageUrl) {
      console.log('No imageUrl provided, returning error');
      return res.status(400).json(errorResponse('Image URL is required as query parameter'));
    }
    
    const homePage = await HomePage.getOrCreate();
    console.log('HomePage retrieved for image deletion');
    
    // Get current images
    const currentImages = homePage.getBannerImages(key);
    console.log('Current images in banner:', {
      key,
      imagesCount: currentImages ? currentImages.length : 0,
      images: currentImages
    });
    
    // Remove specific image
    const updatedImages = currentImages.filter(img => img !== imageUrl);
    console.log('Updated images after filtering:', {
      originalCount: currentImages ? currentImages.length : 0,
      updatedCount: updatedImages.length,
      removed: currentImages && currentImages.length !== updatedImages.length
    });
    
    if (updatedImages.length === currentImages.length) {
      console.log('Image not found in banner, returning 404');
      return res.status(404).json(errorResponse('Image not found in banner'));
    }

    // Update banner with remaining images
    console.log('Updating banner with remaining images...');
    await homePage.updateBanner(key, updatedImages);
    console.log('Banner updated with remaining images');

    // Delete image from S3
    console.log('Deleting image from S3...');
    try {
      await deleteFromS3(imageUrl);
      console.log('Image deleted from S3 successfully');
    } catch (s3Error) {
      console.warn('S3 deletion failed:', s3Error);
      // Continue even if S3 deletion fails
    }

    res.json(successResponse(`Image removed from banner ${key} successfully`, {
      key,
      remainingImages: updatedImages
    }));
    console.log('=== deleteBannerImage SUCCESS ===');
  } catch (error) {
    console.error('=== deleteBannerImage ERROR ===');
    console.error('Error deleting banner image:', error);
    res.status(500).json(errorResponse('Failed to delete banner image', error.message));
  }
};

// Reset home page to default state
exports.resetHomePage = async (req, res) => {
  try {
    console.log('=== resetHomePage START ===');
    console.log('Resetting home page to default state...');
    
    await HomePage.deleteMany({});
    console.log('All home page documents deleted');
    
    const homePage = await HomePage.getOrCreate();
    console.log('New home page created:', {
      _id: homePage._id,
      createdAt: homePage.createdAt,
      updatedAt: homePage.updatedAt
    });

    res.json(successResponse('Home page reset successfully', {
      _id: homePage._id,
      banners: {},
      createdAt: homePage.createdAt,
      updatedAt: homePage.updatedAt
    }));
    console.log('=== resetHomePage SUCCESS ===');
  } catch (error) {
    console.error('=== resetHomePage ERROR ===');
    console.error('Error resetting home page:', error);
    res.status(500).json(errorResponse('Failed to reset home page', error.message));
  }
};

// Get homepage best sellers with banners
exports.getHomePageBestSellers = async (req, res) => {
  try {
    console.log('=== getHomePageBestSellers START ===');
    const { limit = 8 } = req.query;
    console.log('Best sellers request with limit:', limit);
    
    const Item = require('../models/item');
    const Order = require('../models/order');
    const mongoose = require('mongoose');

    // Get home page banners
    const homePage = await HomePage.getOrCreate();
    console.log('HomePage retrieved for best sellers');
    
    // Calculate date range for best sellers (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    console.log('Date range for best sellers:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysRange: 30
    });

    // Aggregate to find best selling items
    console.log('Running aggregation for best sellers...');
    const bestSellersData = await Order.aggregate([
      { 
        $match: {
          isActive: true,
          status: { $in: ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'] },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item',
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.finalPrice', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: parseInt(limit) }
    ]);
    console.log('Best sellers aggregation result:', {
      count: bestSellersData.length,
      data: bestSellersData
    });

    // Get item details
    const itemIds = bestSellersData.map(item => item._id);
    console.log('Item IDs to fetch:', itemIds);
    
    const items = await Item.find({ _id: { $in: itemIds } })
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name');
    console.log('Items fetched:', {
      count: items.length,
      items: items.map(item => ({ _id: item._id, name: item.name, price: item.price }))
    });

    // Merge sales data with item data
    const bestSellers = items.map(item => {
      const salesData = bestSellersData.find(data => data._id.toString() === item._id.toString());
      return {
        ...item.toObject(),
        salesStats: {
          totalQuantitySold: salesData?.totalQuantitySold || 0,
          totalRevenue: salesData?.totalRevenue || 0
        },
        finalPrice: item.discountPrice && item.discountPrice > 0 
          ? item.discountPrice 
          : item.discountPercentage > 0 
            ? item.price * (1 - item.discountPercentage / 100)
            : item.price
      };
    });
    console.log('Best sellers with sales data:', bestSellers.map(bs => ({
      name: bs.name,
      quantitySold: bs.salesStats.totalQuantitySold,
      revenue: bs.salesStats.totalRevenue,
      finalPrice: bs.finalPrice
    })));

    // Sort by quantity sold
    bestSellers.sort((a, b) => b.salesStats.totalQuantitySold - a.salesStats.totalQuantitySold);
    console.log('Best sellers sorted by quantity sold');

    // Convert banners Map to object
    const banners = {};
    if (homePage.banners) {
      homePage.banners.forEach((value, key) => {
        banners[key] = value;
      });
    }
    console.log('Banners converted to object:', banners);

    res.json(successResponse('Homepage best sellers retrieved successfully', {
      bestSellers: bestSellers.slice(0, parseInt(limit)),
      banners,
      count: bestSellers.length
    }));
    console.log('=== getHomePageBestSellers SUCCESS ===');

  } catch (error) {
    console.error('=== getHomePageBestSellers ERROR ===');
    console.error('Error getting homepage best sellers:', error);
    res.status(500).json(errorResponse('Failed to retrieve homepage best sellers', error.message));
  }
};

// Get homepage new arrivals with banners
exports.getHomePageNewArrivals = async (req, res) => {
  try {
    console.log('=== getHomePageNewArrivals START ===');
    const { limit = 8 } = req.query;
    console.log('New arrivals request with limit:', limit);
    
    const Item = require('../models/item');
    const mongoose = require('mongoose');

    // Get home page banners
    const homePage = await HomePage.getOrCreate();
    console.log('HomePage retrieved for new arrivals');
    
    // Calculate date range for new arrivals (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    console.log('Date range for new arrivals:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysRange: 7
    });

    // Fetch new arrival items
    console.log('Fetching new arrival items...');
    const newArrivals = await Item.find({
      createdAt: { $gte: startDate, $lte: endDate }
    })
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    console.log('New arrivals fetched:', {
      count: newArrivals.length,
      items: newArrivals.map(item => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        createdAt: item.createdAt
      }))
    });

    // Add final price calculation
    const newArrivalsWithPrice = newArrivals.map(item => ({
      ...item.toObject(),
      finalPrice: item.discountPrice && item.discountPrice > 0 
        ? item.discountPrice 
        : item.discountPercentage > 0 
          ? item.price * (1 - item.discountPercentage / 100)
          : item.price,
      isNew: true,
      daysOld: Math.floor((endDate - item.createdAt) / (1000 * 60 * 60 * 24))
    }));
    console.log('New arrivals with price calculation:', newArrivalsWithPrice.map(item => ({
      name: item.name,
      originalPrice: item.price,
      finalPrice: item.finalPrice,
      daysOld: item.daysOld
    })));

    // Convert banners Map to object
    const banners = {};
    if (homePage.banners) {
      homePage.banners.forEach((value, key) => {
        banners[key] = value;
      });
    }
    console.log('Banners converted to object:', banners);

    res.json(successResponse('Homepage new arrivals retrieved successfully', {
      newArrivals: newArrivalsWithPrice,
      banners,
      count: newArrivalsWithPrice.length
    }));
    console.log('=== getHomePageNewArrivals SUCCESS ===');

  } catch (error) {
    console.error('=== getHomePageNewArrivals ERROR ===');
    console.error('Error getting homepage new arrivals:', error);
    res.status(500).json(errorResponse('Failed to retrieve homepage new arrivals', error.message));
  }
};