const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

// Apply authentication middleware to all cart routes
router.use(auth);

// GET /api/cart - Get user's cart
router.get('/', cartController.getUserCart);

// POST /api/cart - Add item to cart
router.post('/', cartController.addToCart);

// PUT /api/cart/:itemId/quantity - Update item quantity in cart
router.put('/:itemId/quantity', cartController.updateCartItemQuantity);

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/:itemId', cartController.removeFromCart);

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', cartController.clearCart);

// PUT /api/cart/:itemId/notes - Update item notes in cart
router.put('/:itemId/notes', cartController.updateCartItemNotes);

// GET /api/cart/:itemId/check - Check if item is in cart
router.get('/:itemId/check', cartController.checkItemInCart);

// GET /api/cart/stats - Get cart statistics
router.get('/stats', cartController.getCartStats);

// PATCH /api/cart/toggle-status - Toggle cart status
router.patch('/toggle-status', cartController.toggleCartStatus);

// POST /api/cart/apply-discount - Apply discount to cart
router.post('/apply-discount', cartController.applyCartDiscount);

module.exports = router;
