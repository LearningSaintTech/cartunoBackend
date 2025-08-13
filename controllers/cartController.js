const Cart = require('../models/cart');
const Item = require('../models/item');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get user's cart
const getUserCart = async (req, res) => {
  console.log('=== getUserCart called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;
    
    const cart = await Cart.getCartWithItems(userId);
    
    if (!cart) {
      console.log('No cart found for user, creating new one');
      const newCart = await Cart.getOrCreateCart(userId);
      console.log('New cart created:', newCart._id);
      
      return res.json(successResponse('Cart retrieved successfully', {
        cart: newCart,
        itemCount: 0,
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        totalAmount: 0
      }));
    }

    console.log('Cart found with items count:', cart.items.length);
    
    // Filter out inactive items
    const activeItems = cart.items.filter(cartItem => cartItem.item);
    
    res.json(successResponse('Cart retrieved successfully', {
      cart: cart,
      itemCount: cart.totalItems,
      items: activeItems,
      subtotal: cart.subtotal,
      totalDiscount: cart.totalDiscount,
      totalAmount: cart.totalAmount
    }));

  } catch (error) {
    console.error('Error fetching user cart:', error);
    res.status(500).json(errorResponse('Failed to fetch cart', error.message));
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  console.log('=== addToCart called ===');
  console.log('User ID:', req.user.userId);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.userId;
    const { itemId, quantity, variant, notes } = req.body;

    if (!itemId || !quantity || !variant) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json(errorResponse('Item ID, quantity, and variant are required'));
    }

    if (!variant.size || !variant.color || !variant.color.name) {
      console.log('Validation failed: Invalid variant structure');
      return res.status(400).json(errorResponse('Variant must include size and color name'));
    }

    if (quantity < 1 || quantity > 99) {
      console.log('Validation failed: Invalid quantity');
      return res.status(400).json(errorResponse('Quantity must be between 1 and 99'));
    }

    console.log('Input validation passed');

    // Check if item exists and is active
    const item = await Item.findById(itemId);
    if (!item) {
      console.log('Item not found:', itemId);
      return res.status(404).json(errorResponse('Item not found'));
    }

    if (!item.isActive) {
      console.log('Item is not active:', itemId);
      return res.status(400).json(errorResponse('Item is not available'));
    }

    console.log('Item found and active:', item._id);

    // Validate variant exists for the item
    const itemVariant = item.variants.find(v => v.size === variant.size);
    if (!itemVariant) {
      console.log('Variant size not found for item:', variant.size);
      return res.status(400).json(errorResponse('Invalid size for this item'));
    }

    const itemColor = itemVariant.colors.find(c => c.name === variant.color.name);
    if (!itemColor) {
      console.log('Variant color not found for item:', variant.color.name);
      return res.status(400).json(errorResponse('Invalid color for this item'));
    }

    // Check stock availability
    if (itemColor.stock < quantity) {
      console.log('Insufficient stock:', itemColor.stock, 'requested:', quantity);
      return res.status(400).json(errorResponse('Insufficient stock available'));
    }

    console.log('Variant validation passed, stock available');

    // Get or create cart
    const cart = await Cart.getOrCreateCart(userId);
    console.log('Cart retrieved/created:', cart._id);

    // Add item to cart
    await cart.addItem(itemId, quantity, variant, notes || '');
    console.log('Item added to cart successfully');

    // Get updated cart with populated items
    const updatedCart = await Cart.getCartWithItems(userId);
    console.log('Updated cart retrieved');

    res.status(201).json(successResponse('Item added to cart successfully', {
      cart: updatedCart,
      itemCount: updatedCart.totalItems,
      subtotal: updatedCart.subtotal,
      totalDiscount: updatedCart.totalDiscount,
      totalAmount: updatedCart.totalAmount
    }));

  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json(errorResponse('Failed to add item to cart', error.message));
  }
};

// Update item quantity in cart
const updateCartItemQuantity = async (req, res) => {
  console.log('=== updateCartItemQuantity called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity, variant } = req.body;

    if (!quantity || !variant) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json(errorResponse('Quantity and variant are required'));
    }

    if (!variant.size || !variant.color || !variant.color.name) {
      console.log('Validation failed: Invalid variant structure');
      return res.status(400).json(errorResponse('Variant must include size and color name'));
    }

    if (quantity < 0 || quantity > 99) {
      console.log('Validation failed: Invalid quantity');
      return res.status(400).json(errorResponse('Quantity must be between 0 and 99'));
    }

    console.log('Input validation passed');

    const cart = await Cart.findOne({ user: userId, isActive: true });
    
    if (!cart) {
      console.log('Cart not found for user:', userId);
      return res.status(404).json(errorResponse('Cart not found'));
    }

    console.log('Cart found:', cart._id);

    // Update item quantity
    await cart.updateItemQuantity(itemId, variant, quantity);
    console.log('Item quantity updated successfully');

    // Get updated cart
    const updatedCart = await Cart.getCartWithItems(userId);
    console.log('Updated cart retrieved');

    res.json(successResponse('Item quantity updated successfully', {
      cart: updatedCart,
      itemCount: updatedCart.totalItems,
      subtotal: updatedCart.subtotal,
      totalDiscount: updatedCart.totalDiscount,
      totalAmount: updatedCart.totalAmount
    }));

  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    
    if (error.message === 'Item not found in cart') {
      return res.status(404).json(errorResponse('Item not found in cart'));
    }
    
    res.status(500).json(errorResponse('Failed to update item quantity', error.message));
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  console.log('=== removeFromCart called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { variant } = req.body;

    if (!variant) {
      console.log('Validation failed: Variant is required');
      return res.status(400).json(errorResponse('Variant is required'));
    }

    if (!variant.size || !variant.color || !variant.color.name) {
      console.log('Validation failed: Invalid variant structure');
      return res.status(400).json(errorResponse('Variant must include size and color name'));
    }

    console.log('Input validation passed');

    const cart = await Cart.findOne({ user: userId, isActive: true });
    
    if (!cart) {
      console.log('Cart not found for user:', userId);
      return res.status(404).json(errorResponse('Cart not found'));
    }

    console.log('Cart found:', cart._id);

    // Remove item from cart
    await cart.removeItem(itemId, variant);
    console.log('Item removed from cart successfully');

    // Get updated cart
    const updatedCart = await Cart.getCartWithItems(userId);
    console.log('Updated cart retrieved');

    res.json(successResponse('Item removed from cart successfully', {
      cart: updatedCart,
      itemCount: updatedCart.totalItems,
      subtotal: updatedCart.subtotal,
      totalDiscount: updatedCart.totalDiscount,
      totalAmount: updatedCart.totalAmount
    }));

  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json(errorResponse('Failed to remove item from cart', error.message));
  }
};

// Clear cart
const clearCart = async (req, res) => {
  console.log('=== clearCart called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ user: userId, isActive: true });
    
    if (!cart) {
      console.log('Cart not found for user:', userId);
      return res.status(404).json(errorResponse('Cart not found'));
    }

    console.log('Cart found:', cart._id);

    // Clear cart
    await cart.clearCart();
    console.log('Cart cleared successfully');

    res.json(successResponse('Cart cleared successfully', {
      cart: cart,
      itemCount: 0,
      subtotal: 0,
      totalDiscount: 0,
      totalAmount: 0
    }));

  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json(errorResponse('Failed to clear cart', error.message));
  }
};

// Update item notes in cart
const updateCartItemNotes = async (req, res) => {
  console.log('=== updateCartItemNotes called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { notes, variant } = req.body;

    if (!variant) {
      console.log('Validation failed: Variant is required');
      return res.status(400).json(errorResponse('Variant is required'));
    }

    if (!variant.size || !variant.color || !variant.color.name) {
      console.log('Validation failed: Invalid variant structure');
      return res.status(400).json(errorResponse('Variant must include size and color name'));
    }

    if (notes === undefined) {
      console.log('Validation failed: Notes are required');
      return res.status(400).json(errorResponse('Notes are required'));
    }

    console.log('Input validation passed');

    const cart = await Cart.findOne({ user: userId, isActive: true });
    
    if (!cart) {
      console.log('Cart not found for user:', userId);
      return res.status(404).json(errorResponse('Cart not found'));
    }

    console.log('Cart found:', cart._id);

    // Update item notes
    await cart.updateItemNotes(itemId, variant, notes);
    console.log('Item notes updated successfully');

    // Get updated cart
    const updatedCart = await Cart.getCartWithItems(userId);
    console.log('Updated cart retrieved');

    res.json(successResponse('Item notes updated successfully', {
      cart: updatedCart
    }));

  } catch (error) {
    console.error('Error updating cart item notes:', error);
    
    if (error.message === 'Item not found in cart') {
      return res.status(404).json(errorResponse('Item not found in cart'));
    }
    
    res.status(500).json(errorResponse('Failed to update item notes', error.message));
  }
};

// Check if item is in cart
const checkItemInCart = async (req, res) => {
  console.log('=== checkItemInCart called ===');
  console.log('User ID:', req.user.userId);
  console.log('Item ID:', req.params.itemId);
  console.log('Query params:', req.query);
  
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { size, colorName } = req.query;

    if (!size || !colorName) {
      console.log('Validation failed: Size and color name are required');
      return res.status(400).json(errorResponse('Size and color name are required'));
    }

    console.log('Input validation passed');

    const variant = {
      size: size,
      color: { name: colorName }
    };

    const isInCart = await Cart.isItemInCart(userId, itemId, variant);
    console.log('Item in cart check result:', isInCart);

    res.json(successResponse('Item cart status checked successfully', {
      itemId: itemId,
      variant: variant,
      isInCart: isInCart
    }));

  } catch (error) {
    console.error('Error checking item in cart:', error);
    res.status(500).json(errorResponse('Failed to check item in cart', error.message));
  }
};

// Get cart statistics
const getCartStats = async (req, res) => {
  console.log('=== getCartStats called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const stats = await Cart.getCartStats(userId);
    console.log('Cart statistics calculated:', stats);

    res.json(successResponse('Cart statistics retrieved successfully', stats));

  } catch (error) {
    console.error('Error getting cart statistics:', error);
    res.status(500).json(errorResponse('Failed to get cart statistics', error.message));
  }
};

// Toggle cart status
const toggleCartStatus = async (req, res) => {
  console.log('=== toggleCartStatus called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      console.log('Cart not found for user:', userId);
      return res.status(404).json(errorResponse('Cart not found'));
    }

    console.log('Cart found, current status:', cart.isActive);

    // Toggle status
    await cart.toggleStatus();
    console.log('Cart status toggled successfully');

    res.json(successResponse('Cart status toggled successfully', {
      cart: cart
    }));

  } catch (error) {
    console.error('Error toggling cart status:', error);
    res.status(500).json(errorResponse('Failed to toggle cart status', error.message));
  }
};

// Apply discount to cart
const applyCartDiscount = async (req, res) => {
  console.log('=== applyCartDiscount called ===');
  console.log('User ID:', req.user.userId);
  console.log('Request body:', req.body);
  
  try {
    const userId = req.user.userId;
    const { discountPercentage } = req.body;

    if (!discountPercentage) {
      console.log('Validation failed: Discount percentage is required');
      return res.status(400).json(errorResponse('Discount percentage is required'));
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      console.log('Validation failed: Invalid discount percentage');
      return res.status(400).json(errorResponse('Discount percentage must be between 0 and 100'));
    }

    console.log('Input validation passed');

    const cart = await Cart.findOne({ user: userId, isActive: true });
    
    if (!cart) {
      console.log('Cart not found for user:', userId);
      return res.status(404).json(errorResponse('Cart not found'));
    }

    console.log('Cart found:', cart._id);

    // Apply discount
    await cart.applyDiscount(discountPercentage);
    console.log('Discount applied successfully');

    // Get updated cart
    const updatedCart = await Cart.getCartWithItems(userId);
    console.log('Updated cart retrieved');

    res.json(successResponse('Discount applied successfully', {
      cart: updatedCart,
      discountPercentage: discountPercentage,
      subtotal: updatedCart.subtotal,
      totalDiscount: updatedCart.totalDiscount,
      totalAmount: updatedCart.totalAmount
    }));

  } catch (error) {
    console.error('Error applying cart discount:', error);
    res.status(500).json(errorResponse('Failed to apply discount', error.message));
  }
};

module.exports = {
  getUserCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  updateCartItemNotes,
  checkItemInCart,
  getCartStats,
  toggleCartStatus,
  applyCartDiscount
};
