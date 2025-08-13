const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  toggleSubCategoryStatus,
  getActiveByCategory,
  getAllWithCategory,
  searchSubCategories
} = require('../controllers/subCategoryController');
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
router.get('/active-by-category/:categoryId', getActiveByCategory);
router.get('/with-category', getAllWithCategory);
router.get('/search', searchSubCategories);

// Protected routes (admin authentication required)
router.post('/', verifyAuth(['admin']), upload.single('image'), createSubCategory);
router.get('/', verifyAuth(['admin']), getAllSubCategories);
router.get('/:id', verifyAuth(['admin']), getSubCategoryById);
router.put('/:id', verifyAuth(['admin']), upload.single('image'), updateSubCategory);
router.delete('/:id', verifyAuth(['admin']), deleteSubCategory);
router.patch('/:id/toggle-status', verifyAuth(['admin']), toggleSubCategoryStatus);

module.exports = router;
