const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

// GET /api/cart - Get user's cart
router.get('/', verifyAuth(['user']), cartController.getUserCart);

// POST /api/cart - Add item to cart
router.post('/', verifyAuth(['user']), cartController.addToCart);

// PUT /api/cart/:itemId/quantity - Update item quantity in cart
router.put('/:itemId/quantity', verifyAuth(['user']), cartController.updateCartItemQuantity);

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/:itemId', verifyAuth(['user']), cartController.removeFromCart);

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', verifyAuth(['user']), cartController.clearCart);

// PUT /api/cart/:itemId/notes - Update item notes in cart
router.put('/:itemId/notes', verifyAuth(['user']), cartController.updateCartItemNotes);

// GET /api/cart/:itemId/check - Check if item is in cart
router.get('/:itemId/check', verifyAuth(['user']), cartController.checkItemInCart);

// GET /api/cart/stats - Get cart statistics
router.get('/stats', verifyAuth(['user']), cartController.getCartStats);

// PATCH /api/cart/toggle-status - Toggle cart status
router.patch('/toggle-status', verifyAuth(['user']), cartController.toggleCartStatus);

// POST /api/cart/apply-discount - Apply discount to cart
router.post('/apply-discount', verifyAuth(['user']), cartController.applyCartDiscount);

module.exports = router;
