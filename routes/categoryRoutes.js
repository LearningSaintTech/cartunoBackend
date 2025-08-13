const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getActiveCategories,
  searchCategories
} = require('../controllers/categoryController');
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
router.get('/active', getActiveCategories);
router.get('/search', searchCategories);

// Protected routes (admin authentication required)
router.post('/', verifyAuth(['admin']), upload.single('image'), createCategory);
router.get('/', verifyAuth(['admin']), getAllCategories);
router.get('/:id', verifyAuth(['admin']), getCategoryById);
router.put('/:id', verifyAuth(['admin']), upload.single('image'), updateCategory);
router.delete('/:id', verifyAuth(['admin']), deleteCategory);
router.patch('/:id/toggle-status', verifyAuth(['admin']), toggleCategoryStatus);

module.exports = router;
