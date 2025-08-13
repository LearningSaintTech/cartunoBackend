const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const {
  createGlobalFilter,
  getAllGlobalFilters,
  getGlobalFilterById,
  updateGlobalFilter,
  deleteGlobalFilter,
  toggleGlobalFilterStatus,
  getActiveGlobalFilters,
  getGlobalFiltersByCategory,
  getGlobalFilterByKey,
  getPopularValues,
  addValueToFilter,
  updateFilterValue,
  removeFilterValue,
  toggleValueStatus,
  updateValueCount,
  incrementValueCount,
  decrementValueCount,
  reorderFilterValues,
  searchGlobalFilters
} = require('../controllers/globalFilterController');

// Admin routes (require admin authentication)
// Create a new global filter
router.post('/', verifyAuth(['admin']), createGlobalFilter);

// Get all global filters (admin)
router.get('/', verifyAuth(['admin']), getAllGlobalFilters);

// Get global filter by ID
router.get('/:id', verifyAuth(['admin']), getGlobalFilterById);

// Update global filter
router.put('/:id', verifyAuth(['admin']), updateGlobalFilter);

// Delete global filter
router.delete('/:id', verifyAuth(['admin']), deleteGlobalFilter);

// Toggle global filter status
router.patch('/:id/toggle-status', verifyAuth(['admin']), toggleGlobalFilterStatus);

// Add value to global filter
router.post('/:id/values', verifyAuth(['admin']), addValueToFilter);

// Update value in global filter
router.put('/:id/values', verifyAuth(['admin']), updateFilterValue);

// Remove value from global filter
router.delete('/:id/values', verifyAuth(['admin']), removeFilterValue);

// Toggle value status in global filter
router.patch('/:id/values/toggle-status', verifyAuth(['admin']), toggleValueStatus);

// Update value count in global filter
router.patch('/:id/values/count', verifyAuth(['admin']), updateValueCount);

// Increment value count in global filter
router.patch('/:id/values/increment', verifyAuth(['admin']), incrementValueCount);

// Decrement value count in global filter
router.patch('/:id/values/decrement', verifyAuth(['admin']), decrementValueCount);

// Reorder values in global filter
router.patch('/:id/values/reorder', verifyAuth(['admin']), reorderFilterValues);

// Public routes (no authentication required)
// Get active global filters
router.get('/public/active', getActiveGlobalFilters);

// Get global filters by category
router.get('/public/category/:categoryId', getGlobalFiltersByCategory);

// Get global filter by key
router.get('/public/key/:key', getGlobalFilterByKey);

// Get popular values for a filter
router.get('/public/key/:key/popular', getPopularValues);

// Search global filters
router.get('/public/search', searchGlobalFilters);

module.exports = router;
