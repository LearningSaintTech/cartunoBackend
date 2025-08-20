const Wishlist = require('../models/whishlist');
const Item = require('../models/item');
const { apiResponse } = require('../utils/apiResponse');

// Get user's wishlist
const getUserWishlist = async (req, res) => {
  console.log('=== getUserWishlist called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;
    
    const wishlist = await Wishlist.getWishlistWithItems(userId);
    
    if (!wishlist) {
      console.log('No wishlist found for user, creating new one');
      const newWishlist = await Wishlist.getOrCreateWishlist(userId);
      console.log('New wishlist created:', newWishlist._id);
      
      return res.json(apiResponse(200, true, 'Wishlist retrieved successfully', {
        wishlist: newWishlist,
        itemCount: 0,
        items: []
      }));
    }

    console.log('Wishlist found with items count:', wishlist.items.length);
    
    // Filter out inactive items
    const activeItems = wishlist.items.filter(wishlistItem => wishlistItem.item);
    
    res.json(apiResponse(200, true, 'Wishlist retrieved successfully', {
      wishlist: wishlist,
      itemCount: activeItems.length,
      items: activeItems
    }));

  } catch (error) {
    console.error('Error fetching user wishlist:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to fetch wishlist', error.message));
  }
};

// Add item to wishlist
const addToWishlist = async (req, res) => {
  console.log('=== addToWishlist called ===');
  console.log('User ID:', req.user.userId);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.userId;
    const { itemId, notes } = req.body;

    if (!itemId) {
      console.log('Validation failed: Item ID is required');
      return res.status(400).json(apiResponse(400, false, 'Item ID is required'));
    }

    console.log('Input validation passed');

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) {
      console.log('Item not found:', itemId);
      return res.status(404).json(apiResponse(404, false, 'Item not found'));
    }

    // Remove isActive check since items don't have this field
    // if (!item.isActive) {
    //   console.log('Item is not active:', itemId);
    //   return res.status(400).json(apiResponse(400, false, 'Item is not available'));
    // }

    console.log('Item found:', item._id);
    console.log('Item name:', item.name);
    console.log('Item price:', item.price);

    // Get or create wishlist
    const wishlist = await Wishlist.getOrCreateWishlist(userId);
    console.log('Wishlist retrieved/created:', wishlist._id);

    // Add item to wishlist
    await wishlist.addItem(itemId, notes || '');
    console.log('Item added to wishlist successfully');

    // Get updated wishlist with populated items
    const updatedWishlist = await Wishlist.getWishlistWithItems(userId);
    console.log('Updated wishlist retrieved');

    res.status(201).json(apiResponse(201, true, 'Item added to wishlist successfully', {
      wishlist: updatedWishlist,
      itemCount: updatedWishlist.items.length
    }));

  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    
    if (error.message === 'Item already exists in wishlist') {
      return res.status(400).json(apiResponse(400, false, 'Item already exists in wishlist'));
    }
    
    res.status(500).json(apiResponse(500, false, 'Failed to add item to wishlist', error.message));
  }
};

// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
  console.log('=== removeFromWishlist called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      console.log('Validation failed: Item ID is required');
      return res.status(400).json(apiResponse(400, false, 'Item ID is required'));
    }

    console.log('Input validation passed');

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true });
    
    if (!wishlist) {
      console.log('Wishlist not found for user:', userId);
      return res.status(404).json(apiResponse(404, false, 'Wishlist not found'));
    }

    console.log('Wishlist found:', wishlist._id);

    // Remove item from wishlist
    await wishlist.removeItem(itemId);
    console.log('Item removed from wishlist successfully');

    // Get updated wishlist
    const updatedWishlist = await Wishlist.getWishlistWithItems(userId);
    console.log('Updated wishlist retrieved');

    res.json(apiResponse(200, true, 'Item removed from wishlist successfully', {
      wishlist: updatedWishlist,
      itemCount: updatedWishlist.items.length
    }));

  } catch (error) {
    console.error('Error removing item from wishlist:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to remove item from wishlist', error.message));
  }
};

// Update item notes in wishlist
const updateWishlistItemNotes = async (req, res) => {
  console.log('=== updateWishlistItemNotes called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { notes } = req.body;

    if (!itemId) {
      console.log('Validation failed: Item ID is required');
      return res.status(400).json(apiResponse(400, false, 'Item ID is required'));
    }

    if (notes === undefined) {
      console.log('Validation failed: Notes are required');
      return res.status(400).json(apiResponse(400, false, 'Notes are required'));
    }

    console.log('Input validation passed');

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true });
    
    if (!wishlist) {
      console.log('Wishlist not found for user:', userId);
      return res.status(404).json(apiResponse(404, false, 'Wishlist not found'));
    }

    console.log('Wishlist found:', wishlist._id);

    // Update item notes
    await wishlist.updateItemNotes(itemId, notes);
    console.log('Item notes updated successfully');

    // Get updated wishlist
    const updatedWishlist = await Wishlist.getWishlistWithItems(userId);
    console.log('Updated wishlist retrieved');

    res.json(apiResponse(200, true, 'Item notes updated successfully', {
      wishlist: updatedWishlist
    }));

  } catch (error) {
    console.error('Error updating wishlist item notes:', error);
    
    if (error.message === 'Item not found in wishlist') {
      return res.status(404).json(apiResponse(404, false, 'Item not found in wishlist'));
    }
    
    res.status(500).json(apiResponse(500, false, 'Failed to update item notes', error.message));
  }
};

// Clear wishlist
const clearWishlist = async (req, res) => {
  console.log('=== clearWishlist called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const wishlist = await Wishlist.findOne({ user: userId, isActive: true });
    
    if (!wishlist) {
      console.log('Wishlist not found for user:', userId);
      return res.status(404).json(apiResponse(404, false, 'Wishlist not found'));
    }

    console.log('Wishlist found:', wishlist._id);

    // Clear wishlist
    await wishlist.clearWishlist();
    console.log('Wishlist cleared successfully');

    res.json(apiResponse(200, true, 'Wishlist cleared successfully', {
      wishlist: wishlist,
      itemCount: 0
    }));

  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to clear wishlist', error.message));
  }
};

// Check if item is in wishlist
const checkItemInWishlist = async (req, res) => {
  console.log('=== checkItemInWishlist called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      console.log('Validation failed: Item ID is required');
      return res.status(400).json(apiResponse(400, false, 'Item ID is required'));
    }

    console.log('Input validation passed');

    const isInWishlist = await Wishlist.isItemInWishlist(userId, itemId);
    console.log('Item in wishlist check result:', isInWishlist);

    res.json(apiResponse(200, true, 'Item wishlist status checked successfully', {
      itemId: itemId,
      isInWishlist: isInWishlist
    }));

  } catch (error) {
    console.error('Error checking item in wishlist:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to check item in wishlist', error.message));
  }
};

// Get wishlist statistics
const getWishlistStats = async (req, res) => {
  console.log('=== getWishlistStats called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const stats = await Wishlist.getWishlistStats(userId);
    console.log('Wishlist statistics calculated:', stats);

    res.json(apiResponse(200, true, 'Wishlist statistics retrieved successfully', stats));

  } catch (error) {
    console.error('Error getting wishlist statistics:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to get wishlist statistics', error.message));
  }
};

// Toggle wishlist status
const toggleWishlistStatus = async (req, res) => {
  console.log('=== toggleWishlistStatus called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const wishlist = await Wishlist.findOne({ user: userId });
    
    if (!wishlist) {
      console.log('Wishlist not found for user:', userId);
      return res.status(404).json(apiResponse(404, false, 'Wishlist not found'));
    }

    console.log('Wishlist found, current status:', wishlist.isActive);

    // Toggle status
    await wishlist.toggleStatus();
    console.log('Wishlist status toggled successfully');

    res.json(apiResponse(200, true, 'Wishlist status toggled successfully', {
      wishlist: wishlist
    }));

  } catch (error) {
    console.error('Error toggling wishlist status:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to toggle wishlist status', error.message));
  }
};

// Move wishlist item to cart (placeholder for future cart integration)
const moveToCart = async (req, res) => {
  console.log('=== moveToCart called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      console.log('Validation failed: Item ID is required');
      return res.status(400).json(apiResponse(400, false, 'Item ID is required'));
    }

    console.log('Input validation passed');

    // TODO: Implement cart integration
    console.log('Cart integration not yet implemented');

    res.json(apiResponse(200, true, 'Move to cart functionality coming soon', {
      message: 'This feature will be implemented with cart system'
    }));

  } catch (error) {
    console.error('Error moving item to cart:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to move item to cart', error.message));
  }
};

// Test Item model population (for debugging)
const testItemPopulation = async (req, res) => {
  console.log('=== testWishlistItemPopulation called ===');
  
  try {
    const result = await Wishlist.testItemPopulation();
    console.log('Wishlist population test result:', result);
    
    res.json(apiResponse(200, true, 'Wishlist population test completed', result));
  } catch (error) {
    console.error('Error testing wishlist population:', error);
    res.status(500).json(apiResponse(500, false, 'Failed to test wishlist population', error.message));
  }
};

module.exports = {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  updateWishlistItemNotes,
  clearWishlist,
  checkItemInWishlist,
  getWishlistStats,
  toggleWishlistStatus,
  moveToCart,
  testItemPopulation
};
