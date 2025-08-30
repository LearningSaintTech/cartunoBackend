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
  uploadVariantImages,
  bulkUploadItems,
  updateVariantImages,
  getAvailableFilters,
  addItemFilter,
  updateItemFilter,
  removeItemFilter,
  getItemsByFilter,
  getBestSellers,
  getNewArrivals
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

// Configure multer for bulk upload (JSON file + multiple images)
const uploadBulk = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 26 // Maximum 26 files (1 JSON + 25 images)
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'jsonFile') {
      if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('JSON file must be a valid JSON file'), false);
      }
    } else if (file.fieldname === 'images') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    } else {
      cb(new Error('Invalid field name'), false);
    }
  },
});

// Public routes (no authentication required)
router.get('/search', searchItems);
router.get('/price-range', getItemsByPriceRange);
router.get('/discounted', getDiscountedItems);
router.get('/best-sellers', getBestSellers); // Get best selling items
router.get('/new-arrivals', getNewArrivals); // Get new arrival items
router.get('/filters/available', getAvailableFilters); // Get available filter options
router.get('/filter/:filterKey/:filterValue', getItemsByFilter); // Get items by specific filter
router.get('/:id', getItemById);

// Protected routes (admin authentication required)
router.post('/', verifyAuth(['admin']), uploadMultiple.fields([
  { name: 'thumbnailImage', maxCount: 1 },
  { name: 'variantImages', maxCount: 25 }
]), createItem);

// Filter items with complex criteria (POST method for JSON body)
router.post('/filter', getAllItems);

// Simple get all items (GET method for basic queries)
router.get('/', (req, res) => {
  // Redirect to POST /filter for complex filtering
  res.status(405).json({
    success: false,
    message: 'Use POST /filter for advanced filtering. For simple queries, use specific endpoints like /search, /price-range, etc.'
  });
});

router.put('/:id', verifyAuth(['admin']), uploadMultiple.fields([
  { name: 'thumbnailImage', maxCount: 1 },
  { name: 'variantImages', maxCount: 25 }
]), updateItem);
router.delete('/:id', verifyAuth(['admin']), deleteItem);

// Variant management routes (admin only)
router.post('/:id/variants', verifyAuth(['admin']), addVariant);
router.put('/:id/stock', verifyAuth(['admin']), updateStock);
router.post('/:id/variant-images', verifyAuth(['admin']), uploadMultiple.array('images', 5), uploadVariantImages);
router.put('/:id/variant-images', verifyAuth(['admin']), uploadMultiple.fields([
  { name: 'images', maxCount: 25 }
]), updateVariantImages);

// Key highlights management routes (admin only)
router.post('/:id/key-highlights', verifyAuth(['admin']), addKeyHighlight);
router.put('/:id/key-highlights', verifyAuth(['admin']), updateKeyHighlight);
router.delete('/:id/key-highlights', verifyAuth(['admin']), removeKeyHighlight);

// Filter management routes (admin only)
router.post('/:id/filters', verifyAuth(['admin']), addItemFilter); // Add filter to item
router.put('/:id/filters', verifyAuth(['admin']), updateItemFilter); // Update item filter
router.delete('/:id/filters/:filterKey', verifyAuth(['admin']), removeItemFilter); // Remove item filter

// Bulk upload route (admin only)
router.post('/bulk-upload', verifyAuth(['admin']), uploadBulk.fields([
  { name: 'jsonFile', maxCount: 1 },
  { name: 'images', maxCount: 25 }
]), bulkUploadItems);

module.exports = router;