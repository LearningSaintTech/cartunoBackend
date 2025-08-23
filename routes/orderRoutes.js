const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyAuth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyAuth([]));

// ==================== USER ROUTES ====================

// Create a new order from cart
// POST /api/orders
router.post('/', orderController.createOrder);

// Get user's orders with pagination and filtering
// GET /api/orders/my-orders
router.get('/my-orders', orderController.getUserOrders);

// Get specific order by ID (user can only access their own orders)
// GET /api/orders/:orderId
router.get('/:orderId', orderController.getOrderById);

// Cancel order (user can only cancel their own orders)
// PUT /api/orders/:orderId/cancel
router.put('/:orderId/cancel', orderController.cancelOrder);

// Return order (user can only return their own orders)
// PUT /api/orders/:orderId/return
router.put('/:orderId/return', orderController.returnOrder);

// Reorder functionality - add items from previous order to cart
// POST /api/orders/:orderId/reorder
router.post('/:orderId/reorder', orderController.reorder);

// Get user's order statistics
// GET /api/orders/stats/my-stats
router.get('/stats/my-stats', orderController.getOrderStats);

// ==================== ADMIN ROUTES ====================

// Get all orders with pagination, filtering, and search (admin only)
// GET /api/orders/admin/all
router.get('/admin/all', verifyAuth(['admin']), orderController.getAllOrders);

// Get orders by specific status (admin only)
// GET /api/orders/admin/status/:status
router.get('/admin/status/:status', verifyAuth(['admin']), orderController.getOrdersByStatus);

// Update order status (admin only)
// PUT /api/orders/:orderId/status
router.put('/:orderId/status', verifyAuth(['admin']), orderController.updateOrderStatus);

// Update payment status (admin only)
// PUT /api/orders/:orderId/payment-status
router.put('/:orderId/payment-status', verifyAuth(['admin']), orderController.updatePaymentStatus);

// Add tracking information (admin only)
// PUT /api/orders/:orderId/tracking
router.put('/:orderId/tracking', verifyAuth(['admin']), orderController.addTrackingInfo);

// Get order statistics for admin dashboard (admin only)
// GET /api/orders/admin/stats
router.get('/admin/stats', verifyAuth(['admin']), orderController.getOrderStats);

// Delete order (admin only - soft delete)
// DELETE /api/orders/:orderId
router.delete('/:orderId', verifyAuth(['admin']), orderController.deleteOrder);

// ==================== WEBHOOK ROUTES (for payment gateways) ====================

// Payment webhook - update payment status
// POST /api/orders/webhook/payment
router.post('/webhook/payment', orderController.updatePaymentStatus);

// ==================== EXPORT ROUTES ====================

module.exports = router;
