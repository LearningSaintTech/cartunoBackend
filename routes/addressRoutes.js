const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const {
  createAddress,
  getUserAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  toggleAddressStatus,
  getDefaultAddress,
  getAddressesByType,
  getAddressCountByType,
  hasDefaultAddress
} = require('../controllers/addressController');

// All routes require authentication
// router.use(verifyAuth);

// Create a new address
router.post('/',verifyAuth(['user']), createAddress);

// Get all addresses for the authenticated user
router.get('/', verifyAuth(['user']), getUserAddresses);

// Get default address
router.get('/default',verifyAuth(['user']), getDefaultAddress);

// Check if user has default address
router.get('/has-default',verifyAuth(['user']), hasDefaultAddress);

// Get address count by type
router.get('/count-by-type',verifyAuth(['user']), getAddressCountByType);

// Get addresses by type (home, office, other)
router.get('/type/:type',verifyAuth(['user']), getAddressesByType);

// Get specific address by ID
router.get('/:id',verifyAuth(['user']), getAddressById);

// Update address
router.put('/:id',verifyAuth(['user']), updateAddress);

// Set address as default
router.patch('/:id/set-default',verifyAuth(['user']), setDefaultAddress);

// Toggle address status
router.patch('/:id/toggle-status',verifyAuth(['user']), toggleAddressStatus);

// Delete address
router.delete('/:id',verifyAuth(['user']), deleteAddress);

module.exports = router;
