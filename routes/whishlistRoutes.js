const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/auth');

// Apply authentication middleware to all wishlist routes
router.use(auth);

// GET /api/wishlist - Get user's wishlist
router.get('/', wishlistController.getUserWishlist);

// POST /api/wishlist - Add item to wishlist
router.post('/', wishlistController.addToWishlist);

// DELETE /api/wishlist/:itemId - Remove item from wishlist
router.delete('/:itemId', wishlistController.removeFromWishlist);

// PUT /api/wishlist/:itemId/notes - Update item notes in wishlist
router.put('/:itemId/notes', wishlistController.updateWishlistItemNotes);

// DELETE /api/wishlist/clear - Clear entire wishlist
router.delete('/clear', wishlistController.clearWishlist);

// GET /api/wishlist/:itemId/check - Check if item is in wishlist
router.get('/:itemId/check', wishlistController.checkItemInWishlist);

// GET /api/wishlist/stats - Get wishlist statistics
router.get('/stats', wishlistController.getWishlistStats);

// PATCH /api/wishlist/toggle-status - Toggle wishlist status
router.patch('/toggle-status', wishlistController.toggleWishlistStatus);

// POST /api/wishlist/:itemId/move-to-cart - Move item from wishlist to cart
router.post('/:itemId/move-to-cart', wishlistController.moveToCart);

module.exports = router;
