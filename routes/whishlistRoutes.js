const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const wishlistController = require('../controllers/wishlistController');

// GET /api/wishlist - Get user's wishlist
router.get('/', verifyAuth(['user']), wishlistController.getUserWishlist);

// POST /api/wishlist - Add item to wishlist
router.post('/', verifyAuth(['user']), wishlistController.addToWishlist);

// IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// Otherwise Express will match /:itemId instead of /clear

// DELETE /api/wishlist/clear - Clear entire wishlist (MUST be before /:itemId)
router.delete('/clear', verifyAuth(['user']), wishlistController.clearWishlist);

// GET /api/wishlist/stats - Get wishlist statistics (MUST be before /:itemId)
router.get('/stats', verifyAuth(['user']), wishlistController.getWishlistStats);

// DELETE /api/wishlist/:itemId - Remove item from wishlist
router.delete('/:itemId', verifyAuth(['user']), wishlistController.removeFromWishlist);

// PUT /api/wishlist/:itemId/notes - Update item notes in wishlist
router.put('/:itemId/notes', verifyAuth(['user']), wishlistController.updateWishlistItemNotes);

// GET /api/wishlist/:itemId/check - Check if item is in wishlist
router.get('/:itemId/check', verifyAuth(['user']), wishlistController.checkItemInWishlist);

// PATCH /api/wishlist/toggle-status - Toggle wishlist status
router.patch('/toggle-status', verifyAuth(['user']), wishlistController.toggleWishlistStatus);

// POST /api/wishlist/:itemId/move-to-cart - Move item from wishlist to cart
router.post('/:itemId/move-to-cart', verifyAuth(['user']), wishlistController.moveToCart);

// GET /api/wishlist/test-population - Test Item model population (for debugging)
router.get('/test-population', verifyAuth(['user']), wishlistController.testItemPopulation);

module.exports = router;
