const express = require('express');
const router = express.Router();
const multer = require('multer');
const homePageController = require('../controllers/homePageController');
const { verifyAuth } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Public routes (no authentication required)
router.get('/', homePageController.getHomePage);
router.get('/banners/:key', homePageController.getBannersByKey);
router.get('/banner-keys', homePageController.getAllBannerKeys);
router.get('/best-sellers', homePageController.getHomePageBestSellers);
router.get('/new-arrivals', homePageController.getHomePageNewArrivals);

// Admin routes (require admin authentication)
router.post('/banners/:key', verifyAuth(['admin']), upload.array('images', 10), homePageController.createBanner);
router.post('/banners/:key/upload', verifyAuth(['admin']), upload.array('images', 10), homePageController.uploadBannerImages);
router.delete('/banners/:key', verifyAuth(['admin']), homePageController.removeBanner);
router.delete('/banners/:key/images', verifyAuth(['admin']), homePageController.deleteBannerImage);
router.post('/reset', verifyAuth(['admin']), homePageController.resetHomePage);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        error: error.message
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: 'Only image files are allowed',
      error: error.message
    });
  }
  
  next(error);
});

module.exports = router;
