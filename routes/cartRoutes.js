const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

// GET /api/cart - Get user's cart
router.get('/', verifyAuth(['user']), cartController.getUserCart);

// POST /api/cart - Add item to cart
router.post('/', verifyAuth(['user']), cartController.addToCart);

// DELETE /api/cart/clear - Clear entire cart (MUST come before /:itemId)
router.delete('/clear', verifyAuth(['user']), cartController.clearCart);

// GET /api/cart/stats - Get cart statistics (MUST come before /:itemId)
router.get('/stats', verifyAuth(['user']), cartController.getCartStats);

// GET /api/cart/test-population - Test Item model population (for debugging)
router.get('/test-population', verifyAuth(['user']), cartController.testItemPopulation);

// PUT /api/cart/:itemId/quantity - Update item quantity in cart
router.put('/:itemId/quantity', verifyAuth(['user']), cartController.updateCartItemQuantity);

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/:itemId', verifyAuth(['user']), cartController.removeFromCart);

// PUT /api/cart/:itemId/notes - Update item notes in cart
router.put('/:itemId/notes', verifyAuth(['user']), cartController.updateCartItemNotes);

// GET /api/cart/:itemId/check - Check if item is in cart
router.get('/:itemId/check', verifyAuth(['user']), cartController.checkItemInCart);

// PATCH /api/cart/toggle-status - Toggle cart status
router.patch('/toggle-status', verifyAuth(['user']), cartController.toggleCartStatus);

// POST /api/cart/apply-discount - Apply discount to cart
router.post('/apply-discount', verifyAuth(['user']), cartController.applyCartDiscount);

// POST /api/cart/refresh-prices - Refresh cart prices
router.post('/refresh-prices', verifyAuth(['user']), cartController.refreshCartPrices);

module.exports = router;
