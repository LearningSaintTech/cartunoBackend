const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
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

// Admin routes (require authentication)
router.use(auth);

// Create a new global filter
router.post('/', createGlobalFilter);

// Get all global filters (admin)
router.get('/', getAllGlobalFilters);

// Get global filter by ID
router.get('/:id', getGlobalFilterById);

// Update global filter
router.put('/:id', updateGlobalFilter);

// Delete global filter
router.delete('/:id', deleteGlobalFilter);

// Toggle global filter status
router.patch('/:id/toggle-status', toggleGlobalFilterStatus);

// Add value to global filter
router.post('/:id/values', addValueToFilter);

// Update value in global filter
router.put('/:id/values', updateFilterValue);

// Remove value from global filter
router.delete('/:id/values', removeFilterValue);

// Toggle value status in global filter
router.patch('/:id/values/toggle-status', toggleValueStatus);

// Update value count in global filter
router.patch('/:id/values/count', updateValueCount);

// Increment value count in global filter
router.patch('/:id/values/increment', incrementValueCount);

// Decrement value count in global filter
router.patch('/:id/values/decrement', decrementValueCount);

// Reorder values in global filter
router.patch('/:id/values/reorder', reorderFilterValues);

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
