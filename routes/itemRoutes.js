const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
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
} = require('../controllers/itemController');
const { verifyAuth } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Configure multer for multiple file uploads (variant images)
const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 25 // Maximum 25 files (5 variants × 5 colors × 5 images max)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Public routes (no authentication required)
router.get('/search', searchItems);
router.get('/price-range', getItemsByPriceRange);
router.get('/discounted', getDiscountedItems);
router.get('/:id', getItemById);

// Protected routes (admin authentication required)
router.post('/', verifyAuth(['admin']), uploadMultiple.fields([
  { name: 'thumbnailImage', maxCount: 1 },
  { name: 'variantImages', maxCount: 25 }
]), createItem);
router.get('/', getAllItems);
router.put('/:id', verifyAuth(['admin']), upload.single('thumbnailImage'), updateItem);
router.delete('/:id', verifyAuth(['admin']), deleteItem);

// Variant management routes (admin only)
router.post('/:id/variants', verifyAuth(['admin']), addVariant);
router.put('/:id/stock', verifyAuth(['admin']), updateStock);
router.post('/:id/variant-images', verifyAuth(['admin']), uploadMultiple.array('images', 5), uploadVariantImages);

// Key highlights management routes (admin only)
router.post('/:id/key-highlights', verifyAuth(['admin']), addKeyHighlight);
router.put('/:id/key-highlights', verifyAuth(['admin']), updateKeyHighlight);
router.delete('/:id/key-highlights', verifyAuth(['admin']), removeKeyHighlight);

module.exports = router;