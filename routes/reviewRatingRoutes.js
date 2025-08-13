const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
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
} = require('../controllers/reviewRatingController');
const { verifyAuth } = require('../middleware/auth');

// Configure multer for multiple file uploads (review images)
const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Maximum 5 files
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
router.get('/search', searchReviewRatings);
router.get('/item/:itemId', getReviewRatingsByItem);
router.get('/item/:itemId/stats', getItemReviewStats);
router.get('/:id', getReviewRatingById);

// Protected routes (user authentication required)
router.post('/', verifyAuth(['user']), uploadMultiple.array('images', 5), createReviewRating);
router.get('/', getAllReviewRatings);
router.put('/:id', verifyAuth(['user', 'admin']), uploadMultiple.array('images', 5), updateReviewRating);
router.delete('/:id', verifyAuth(['user', 'admin']), deleteReviewRating);

// Admin only routes
router.patch('/:id/toggle-status', verifyAuth(['admin']), toggleReviewRatingStatus);
router.get('/user/:userId', verifyAuth(['admin']), getReviewRatingsByUser);

module.exports = router;
