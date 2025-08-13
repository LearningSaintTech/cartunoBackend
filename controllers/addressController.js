const Address = require('../models/address');
const { apiResponse } = require('../utils/apiResponse');

// Create a new address
const createAddress = async (req, res) => {
  console.log('=== createAddress called ===');
  console.log('Request body:', req.body);
  console.log('User ID:', req.user.userId);
  
  try {
    const addressData = {
      ...req.body,
      user: req.user.userId
    };
    console.log('Address data to save:', addressData);

    // If this is the first address, set it as default
    const existingAddresses = await Address.countDocuments({ user: req.user.userId });
    console.log('Existing addresses count:', existingAddresses);
    
    if (existingAddresses === 0) {
      addressData.isDefault = true;
      console.log('Setting as default address (first address)');
    }

    const address = new Address(addressData);
    console.log('New address instance created:', address);
    
    await address.save();
    console.log('Address saved successfully:', address._id);

    res.status(201).json(apiResponse(201, true, 'Address created successfully', address));
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to create address', error.message));
  }
};

// Get all addresses for a user
const getUserAddresses = async (req, res) => {
  console.log('=== getUserAddresses called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const addresses = await Address.getUserAddresses(req.user.userId);
    console.log('Retrieved addresses count:', addresses.length);
    res.json(apiResponse(200, true, 'Addresses retrieved successfully', addresses));
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch addresses', error.message));
  }
};

// Get address by ID
const getAddressById = async (req, res) => {
  console.log('=== getAddressById called ===');
  console.log('Address ID:', req.params.id);
  console.log('User ID:', req.user.userId);
  
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      console.log('Address not found');
      return res.status(404).json(apiResponse(404, false, 'Address not found'));
    }

    console.log('Address found:', address._id);
    res.json(apiResponse(200, true, 'Address retrieved successfully', address));
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch address', error.message));
  }
};

// Update address
const updateAddress = async (req, res) => {
  console.log('=== updateAddress called ===');
  console.log('Address ID:', req.params.id);
  console.log('User ID:', req.user.userId);
  console.log('Update data:', req.body);
  
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      console.log('Address not found for update');
      return res.status(404).json(apiResponse(404, false, 'Address not found'));
    }

    console.log('Address found for update:', address._id);
    
    // Update address using the model method
    await address.updateAddress(req.body);
    console.log('Address updated via model method');
    
    // Refresh the address data
    const updatedAddress = await Address.findById(req.params.id);
    console.log('Refreshed address data');
    
    res.json(apiResponse(200, true, 'Address updated successfully', updatedAddress));
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to update address', error.message));
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  console.log('=== deleteAddress called ===');
  console.log('Address ID:', req.params.id);
  console.log('User ID:', req.user.userId);
  
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      console.log('Address not found for deletion');
      return res.status(404).json(apiResponse(404, false, 'Address not found'));
    }

    console.log('Address found for deletion:', address._id);
    await address.remove();
    console.log('Address deleted successfully');
    
    res.json(apiResponse(200, true, 'Address deleted successfully'));
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to delete address', error.message));
  }
};

// Set address as default
const setDefaultAddress = async (req, res) => {
  console.log('=== setDefaultAddress called ===');
  console.log('Address ID:', req.params.id);
  console.log('User ID:', req.user.userId);
  
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      console.log('Address not found for setting as default');
      return res.status(404).json(apiResponse(404, false, 'Address not found'));
    }

    console.log('Address found, setting as default:', address._id);
    await address.setAsDefault();
    console.log('Address set as default successfully');
    
    res.json(apiResponse(200, true, 'Address set as default successfully', address));
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to set default address', error.message));
  }
};

// Toggle address status
const toggleAddressStatus = async (req, res) => {
  console.log('=== toggleAddressStatus called ===');
  console.log('Address ID:', req.params.id);
  console.log('User ID:', req.user.userId);
  
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      console.log('Address not found for status toggle');
      return res.status(404).json(apiResponse(404, false, 'Address not found'));
    }

    console.log('Address found, toggling status:', address._id);
    console.log('Current status:', address.isActive);
    
    await address.toggleStatus();
    console.log('Address status toggled successfully');
    
    res.json(apiResponse(200, true, 'Address status toggled successfully', address));
  } catch (error) {
    console.error('Error toggling address status:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to toggle address status', error.message));
  }
};

// Get default address
const getDefaultAddress = async (req, res) => {
  console.log('=== getDefaultAddress called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const address = await Address.getDefaultAddress(req.user.userId);
    
    if (!address) {
      console.log('No default address found for user');
      return res.status(404).json(apiResponse(404, false, 'No default address found'));
    }

    console.log('Default address found:', address._id);
    res.json(apiResponse(200, true, 'Default address retrieved successfully', address));
  } catch (error) {
    console.error('Error fetching default address:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch default address', error.message));
  }
};

// Get addresses by type
const getAddressesByType = async (req, res) => {
  console.log('=== getAddressesByType called ===');
  console.log('Address type:', req.params.type);
  console.log('User ID:', req.user.userId);
  
  try {
    const { type } = req.params;
    const addresses = await Address.getByType(req.user.userId, type);
    console.log('Retrieved addresses by type count:', addresses.length);
    
    res.json(apiResponse(200, true, 'Addresses retrieved successfully', addresses));
  } catch (error) {
    console.error('Error fetching addresses by type:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch addresses by type', error.message));
  }
};

// Get address count by type
const getAddressCountByType = async (req, res) => {
  console.log('=== getAddressCountByType called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const counts = await Address.getAddressCountByType(req.user.userId);
    console.log('Address counts by type:', counts);
    
    res.json(apiResponse(200, true, 'Address counts retrieved successfully', counts));
  } catch (error) {
    console.error('Error fetching address counts:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch address counts', error.message));
  }
};

// Check if user has default address
const hasDefaultAddress = async (req, res) => {
  console.log('=== hasDefaultAddress called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const hasDefault = await Address.hasDefaultAddress(req.user.userId);
    console.log('User has default address:', hasDefault);
    
    res.json(apiResponse(200, true, 'Default address status checked successfully', { hasDefault }));
  } catch (error) {
    console.error('Error checking default address status:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to check default address status', error.message));
  }
};

module.exports = {
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
};
