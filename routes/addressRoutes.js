const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
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
router.use(auth);

// Create a new address
router.post('/', createAddress);

// Get all addresses for the authenticated user
router.get('/', getUserAddresses);

// Get default address
router.get('/default', getDefaultAddress);

// Check if user has default address
router.get('/has-default', hasDefaultAddress);

// Get address count by type
router.get('/count-by-type', getAddressCountByType);

// Get addresses by type (home, office, other)
router.get('/type/:type', getAddressesByType);

// Get specific address by ID
router.get('/:id', getAddressById);

// Update address
router.put('/:id', updateAddress);

// Set address as default
router.patch('/:id/set-default', setDefaultAddress);

// Toggle address status
router.patch('/:id/toggle-status', toggleAddressStatus);

// Delete address
router.delete('/:id', deleteAddress);

module.exports = router;
