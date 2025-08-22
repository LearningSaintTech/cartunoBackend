const Order = require('../models/order');
const Cart = require('../models/cart');
const Item = require('../models/item');
const Address = require('../models/address');
const User = require('../models/user');
const { apiResponse } = require('../utils/apiResponse');

const createOrder = async (req, res) => {
  console.log('=== [createOrder] Starting order creation ===');
  try {
    const { 
      shippingAddressId, 
      billingAddressId, 
      paymentMethod, 
      notes,
      tax = 0,
      shippingCharges = 0,
      discount = 0
    } = req.body;
    const userId = req.user.id;

    console.log('[createOrder] Request data:', {
      userId,
      shippingAddressId,
      billingAddressId,
      paymentMethod,
      notes,
      tax,
      shippingCharges,
      discount,
      user: req.user
    });

    // Validate addresses
    console.log('[createOrder] Validating addresses...');
    const shippingAddress = await Address.findById(shippingAddressId);
    const billingAddress = await Address.findById(billingAddressId);
    console.log('[createOrder] Shipping address:', shippingAddress ? 'Found' : 'Not found');
    console.log('[createOrder] Billing address:', billingAddress ? 'Found' : 'Not found');

    if (!shippingAddress || !billingAddress) {
      console.log('[createOrder] ❌ Invalid shipping or billing address');
      return res.status(400).json(apiResponse(400, false, 'Invalid shipping or billing address'));
    }

    if (shippingAddress.user.toString() !== userId || billingAddress.user.toString() !== userId) {
      console.log('[createOrder] ❌ Address does not belong to user');
      return res.status(403).json(apiResponse(403, false, 'Address does not belong to user'));
    }
    console.log('[createOrder] ✅ Addresses validated successfully');

    // Get user's active cart
    console.log('[createOrder] Fetching user cart...');
    const cart = await Cart.getOrCreateCart(userId);
    console.log('[createOrder] Cart:', cart ? `Found with ${cart.items.length} items` : 'Not found');

    if (!cart.items || cart.items.length === 0) {
      console.log('[createOrder] ❌ Cart is empty');
      return res.status(400).json(apiResponse(400, false, 'Cart is empty'));
    }
    console.log('[createOrder] ✅ Cart has items:', cart.items);

    // Validate items and stock
    console.log('[createOrder] Validating items and stock...');
    const orderItems = [];
    for (const cartItem of cart.items) {
      console.log('[createOrder] Processing cart item:', cartItem.item);
      const item = await Item.findById(cartItem.item);
      console.log('[createOrder] Item:', item ? item.name : 'Not found');

      if (!item) {
        console.log('[createOrder] ❌ Item not found:', cartItem.item);
        return res.status(404).json(apiResponse(404, false, `Item ${cartItem.item} not found`));
      }

      console.log('[createOrder] Checking variant:', cartItem.selectedVariant.size);
      const variant = item.variants.find(v => v.size === cartItem.selectedVariant.size);
      if (!variant) {
        console.log('[createOrder] ❌ Size not available:', cartItem.selectedVariant.size);
        return res.status(400).json(apiResponse(400, false, `Size ${cartItem.selectedVariant.size} not available for item ${item.name}`));
      }

      console.log('[createOrder] Checking color:', cartItem.selectedVariant.color.name);
      const color = variant.colors.find(c => c.name === cartItem.selectedVariant.color.name);
      if (!color) {
        console.log('[createOrder] ❌ Color not available:', cartItem.selectedVariant.color.name);
        return res.status(400).json(apiResponse(400, false, `Color ${cartItem.selectedVariant.color.name} not available for item ${item.name}`));
      }

      console.log('[createOrder] Checking stock:', { currentStock: color.stock, requested: cartItem.quantity });
      if (color.stock < cartItem.quantity) {
        console.log('[createOrder] ❌ Insufficient stock:', { item: item.name, size: cartItem.selectedVariant.size, color: cartItem.selectedVariant.color.name });
        return res.status(400).json(apiResponse(400, false, `Insufficient stock for ${item.name} - ${cartItem.selectedVariant.size} ${cartItem.selectedVariant.color.name}`));
      }

      orderItems.push({
        item: cartItem.item,
        quantity: cartItem.quantity,
        selectedVariant: cartItem.selectedVariant,
        price: cartItem.price,
        discountPrice: cartItem.discountPrice || 0,
        finalPrice: cartItem.discountPrice > 0 ? cartItem.discountPrice : cartItem.price
      });
      console.log('[createOrder] Added item to order:', { itemId: cartItem.item, quantity: cartItem.quantity });
    }
    console.log('[createOrder] ✅ Items and stock validated successfully');

    // Calculate totals
    console.log('[createOrder] Calculating totals...');
    const subtotal = orderItems.reduce((total, item) => {
      const itemPrice = item.discountPrice > 0 ? item.discountPrice : item.price;
      return total + (itemPrice * item.quantity);
    }, 0);
    const totalAmount = subtotal + tax + shippingCharges - discount;
    console.log('[createOrder] Totals:', { subtotal, tax, shippingCharges, discount, totalAmount });

    // Create order
    console.log('[createOrder] Creating order...');
    const order = new Order({
      orderNumber: Order.generateOrderNumber(),
      user: userId,
      items: orderItems,
      shippingAddress: shippingAddressId,
      billingAddress: billingAddressId,
      paymentMethod,
      notes,
      tax,
      shippingCharges,
      discount,
      subtotal,
      totalAmount
    });
    console.log('[createOrder] Order object:', order.toObject());

    // Save order
    console.log('[createOrder] Saving order...');
    await order.save();
    console.log('[createOrder] ✅ Order saved:', order._id);

    // Update stock for all items
    console.log('[createOrder] Updating stock...');
    for (const orderItem of orderItems) {
      console.log('[createOrder] Updating stock for item:', orderItem.item);
      const item = await Item.findById(orderItem.item);
      const variant = item.variants.find(v => v.size === orderItem.selectedVariant.size);
      const color = variant.colors.find(c => c.name === orderItem.selectedVariant.color.name);
      
      console.log('[createOrder] Reducing stock:', { item: item.name, currentStock: color.stock, reduceBy: orderItem.quantity });
      color.stock -= orderItem.quantity;
      await item.save();
      console.log('[createOrder] Stock updated for:', item.name);
    }
    console.log('[createOrder] ✅ Stock updated successfully');

    // Clear user's cart
    console.log('[createOrder] Clearing cart...');
    await cart.clearCart();
    console.log('[createOrder] ✅ Cart cleared');

    // Populate order details
    console.log('[createOrder] Populating order details...');
    await order.populate([
      { path: 'user', select: 'firstname lastname email' },
      { path: 'shippingAddress' },
      { path: 'billingAddress' },
      { path: 'items.item', select: 'name thumbnailImage price discountPrice' }
    ]);
    console.log('[createOrder] ✅ Order details populated');

    // Prepare response data
    console.log('[createOrder] Preparing response data...');
    const responseData = {
      order: order.toObject(),
      orderSummary: order.orderSummary,
      itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
      subtotal: order.subtotal,
      totalDiscount: order.discount,
      totalAmount: order.totalAmount
    };
    console.log('[createOrder] Response data:', JSON.stringify(responseData, null, 2));

    console.log('[createOrder] Checking response headers...');
    console.log('[createOrder] Headers sent:', res.headersSent);
    console.log('[createOrder] Response status:', res.statusCode);

    // Send response
    console.log('[createOrder] Sending response...');
    return res.status(201).json(apiResponse(201, true, 'Order created successfully', responseData));

  } catch (error) {
    console.error('[createOrder] Error:', error);
    if (!res.headersSent) {
      return res.status(500).json(apiResponse(500, false, 'Failed to create order', error.message));
    } else {
      console.log('[createOrder] ❌ Headers already sent, cannot send error response');
    }
  }
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  console.log('=== [getAllOrders] Starting ===');
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentStatus, 
      startDate, 
      endDate,
      search 
    } = req.query;
    console.log('[getAllOrders] Query params:', { page, limit, status, paymentStatus, startDate, endDate, search });

    const query = { isActive: true };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'user.firstname': { $regex: search, $options: 'i' } },
        { 'user.lastname': { $regex: search, $options: 'i' } }
      ];
    }
    console.log('[getAllOrders] Query:', query);

    const skip = (page - 1) * limit;
    
    console.log('[getAllOrders] Fetching orders...');
    const orders = await Order.find(query)
      .populate('user', 'firstname lastname email')
      .populate('shippingAddress')
      .populate('billingAddress')
      .populate('items.item', 'name thumbnailImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('[getAllOrders] Orders found:', orders.length);

    const total = await Order.countDocuments(query);
    console.log('[getAllOrders] Total orders:', total);

    return res.status(200).json(apiResponse(200, true, 'Orders retrieved successfully', {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }));

  } catch (error) {
    console.error('[getAllOrders] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve orders', error.message));
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  console.log('=== [getOrderById] Starting ===');
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    console.log('[getOrderById] Params:', { orderId, userId, isAdmin });

    console.log('[getOrderById] Fetching order...');
    const order = await Order.findById(orderId)
      .populate('user', 'firstname lastname email')
      .populate('shippingAddress')
      .populate('billingAddress')
      .populate('items.item', 'name thumbnailImage price discountPrice description');
    console.log('[getOrderById] Order:', order ? 'Found' : 'Not found');

    if (!order) {
      console.log('[getOrderById] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }

    if (!isAdmin && order.user._id.toString() !== userId) {
      console.log('[getOrderById] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    return res.status(200).json(apiResponse(200, true, 'Order retrieved successfully', {
      order,
      orderSummary: order.orderSummary,
      statusTimeline: order.statusTimeline
    }));

  } catch (error) {
    console.error('[getOrderById] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve order', error.message));
  }
};

// Get user's orders
const getUserOrders = async (req, res) => {
  console.log('=== [getUserOrders] Starting ===');
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, paymentStatus } = req.query;
    console.log('[getUserOrders] Query params:', { userId, page, limit, status, paymentStatus });

    const options = { user: userId };
    if (status) options.status = status;
    if (paymentStatus) options.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;
    
    console.log('[getUserOrders] Fetching orders...');
    const orders = await Order.find(options)
      .populate('user', 'firstname lastname email')
      .populate('shippingAddress')
      .populate('billingAddress')
      .populate('items.item', 'name thumbnailImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('[getUserOrders] Orders found:', orders.length);

    const total = await Order.countDocuments({ user: userId, isActive: true });
    console.log('[getUserOrders] Total orders:', total);

    return res.status(200).json(apiResponse(200, true, 'User orders retrieved successfully', {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }));

  } catch (error) {
    console.error('[getUserOrders] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve user orders', error.message));
  }
};

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  console.log('=== [updateOrderStatus] Starting ===');
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const isAdmin = req.user.role === 'admin';
    console.log('[updateOrderStatus] Params:', { orderId, status, notes, isAdmin });

    if (!isAdmin) {
      console.log('[updateOrderStatus] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    console.log('[updateOrderStatus] Fetching order...');
    const order = await Order.findById(orderId);
    console.log('[updateOrderStatus] Order:', order ? 'Found' : 'Not found');

    if (!order) {
      console.log('[updateOrderStatus] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }

    console.log('[updateOrderStatus] Updating status...');
    await order.updateStatus(status, notes);
    console.log('[updateOrderStatus] Status updated');

    console.log('[updateOrderStatus] Populating order details...');
    await order.populate([
      { path: 'user', select: 'firstname lastname email' },
      { path: 'shippingAddress' },
      { path: 'billingAddress' },
      { path: 'items.item', select: 'name thumbnailImage' }
    ]);
    console.log('[updateOrderStatus] ✅ Order details populated');

    return res.status(200).json(apiResponse(200, true, 'Order status updated successfully', {
      order,
      statusTimeline: order.statusTimeline
    }));

  } catch (error) {
    console.error('[updateOrderStatus] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to update order status', error.message));
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  console.log('=== [updatePaymentStatus] Starting ===');
  try {
    const { orderId } = req.params;
    const { paymentStatus, paymentDetails } = req.body;
    const isAdmin = req.user.role === 'admin';
    console.log('[updatePaymentStatus] Params:', { orderId, paymentStatus, paymentDetails, isAdmin });

    if (!isAdmin) {
      console.log('[updatePaymentStatus] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    console.log('[updatePaymentStatus] Fetching order...');
    const order = await Order.findById(orderId);
    console.log('[updatePaymentStatus] Order:', order ? 'Found' : 'Not found');

    if (!order) {
      console.log('[updatePaymentStatus] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }

    console.log('[updatePaymentStatus] Updating payment status...');
    await order.updatePaymentStatus(paymentStatus, paymentDetails);
    console.log('[updatePaymentStatus] ✅ Payment status updated');

    return res.status(200).json(apiResponse(200, true, 'Payment status updated successfully', { order }));

  } catch (error) {
    console.error('[updatePaymentStatus] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to update payment status', error.message));
  }
};

// Add tracking information (admin only)
const addTrackingInfo = async (req, res) => {
  console.log('=== [addTrackingInfo] Starting ===');
  try {
    const { orderId } = req.params;
    const { trackingNumber, courier } = req.body;
    const isAdmin = req.user.role === 'admin';
    console.log('[addTrackingInfo] Params:', { orderId, trackingNumber, courier, isAdmin });

    if (!isAdmin) {
      console.log('[addTrackingInfo] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    console.log('[addTrackingInfo] Fetching order...');
    const order = await Order.findById(orderId);
    console.log('[addTrackingInfo] Order:', order ? 'Found' : 'Not found');

    if (!order) {
      console.log('[addTrackingInfo] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }

    console.log('[addTrackingInfo] Adding tracking info...');
    await order.addTrackingInfo(trackingNumber, courier);
    console.log('[addTrackingInfo] ✅ Tracking info added');

    return res.status(200).json(apiResponse(200, true, 'Tracking information added successfully', { order }));

  } catch (error) {
    console.error('[addTrackingInfo] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to add tracking information', error.message));
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  console.log('=== [cancelOrder] Starting ===');
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    console.log('[cancelOrder] Params:', { orderId, reason, userId });

    console.log('[cancelOrder] Fetching order...');
    const order = await Order.findById(orderId);
    console.log('[cancelOrder] Order:', order ? 'Found' : 'Not found');

    if (!order) {
      console.log('[cancelOrder] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }

    if (order.user.toString() !== userId) {
      console.log('[cancelOrder] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      console.log('[cancelOrder] ❌ Order cannot be cancelled at this stage:', order.status);
      return res.status(400).json(apiResponse(400, false, 'Order cannot be cancelled at this stage'));
    }

    console.log('[cancelOrder] Updating order status to cancelled...');
    await order.updateStatus('cancelled', reason || 'Order cancelled by user');
    console.log('[cancelOrder] Order status updated');

    console.log('[cancelOrder] Restoring stock...');
    for (const orderItem of order.items) {
      console.log('[cancelOrder] Processing item:', orderItem.item);
      const item = await Item.findById(orderItem.item);
      const variant = item.variants.find(v => v.size === orderItem.selectedVariant.size);
      const color = variant.colors.find(c => c.name === orderItem.selectedVariant.color.name);
      
      console.log('[cancelOrder] Restoring stock:', { item: item.name, currentStock: color.stock, adding: orderItem.quantity });
      color.stock += orderItem.quantity;
      await item.save();
      console.log('[cancelOrder] Stock restored for:', item.name);
    }
    console.log('[cancelOrder] ✅ Stock restored');

    return res.status(200).json(apiResponse(200, true, 'Order cancelled successfully', { order }));

  } catch (error) {
    console.error('[cancelOrder] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to cancel order', error.message));
  }
};

// Return order
const returnOrder = async (req, res) => {
  console.log('=== [returnOrder] Starting ===');
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    console.log('[returnOrder] Params:', { orderId, reason, userId });

    console.log('[returnOrder] Fetching order...');
    const order = await Order.findById(orderId);
    console.log('[returnOrder] Order:', order ? 'Found' : 'Not found');

    if (!order) {
      console.log('[returnOrder] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }

    if (order.user.toString() !== userId) {
      console.log('[returnOrder] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    if (order.status !== 'delivered') {
      console.log('[returnOrder] ❌ Order cannot be returned:', order.status);
      return res.status(400).json(apiResponse(400, false, 'Order cannot be returned at this stage'));
    }

    const deliveryDate = order.actualDelivery || order.updatedAt;
    const returnWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    console.log('[returnOrder] Checking return window:', { deliveryDate, currentTime: Date.now() });
    
    if (Date.now() - deliveryDate.getTime() > returnWindow) {
      console.log('[returnOrder] ❌ Return window expired');
      return res.status(400).json(apiResponse(400, false, 'Return window has expired'));
    }

    console.log('[returnOrder] Updating status to returned...');
    await order.updateStatus('returned', reason || 'Order returned by user');
    console.log('[returnOrder] ✅ Status updated');

    return res.status(200).json(apiResponse(200, true, 'Order return initiated successfully', { order }));

  } catch (error) {
    console.error('[returnOrder] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to initiate order return', error.message));
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  console.log('=== [getOrderStats] Starting ===');
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.role === 'admin' ? null : req.user.id;
    console.log('[getOrderStats] Params:', { startDate, endDate, userId });

    let stats;
    let revenueStats;

    console.log('[getOrderStats] Fetching stats...');
    if (startDate && endDate) {
      stats = await Order.getOrderStats(userId);
      revenueStats = await Order.getRevenueStats(new Date(startDate), new Date(endDate), userId);
      console.log('[getOrderStats] Stats with date range:', { stats, revenueStats });
    } else {
      stats = await Order.getOrderStats(userId);
      console.log('[getOrderStats] Stats without date range:', stats);
    }

    return res.status(200).json(apiResponse(200, true, 'Order statistics retrieved successfully', {
      orderStats: stats,
      revenueStats: revenueStats || []
    }));

  } catch (error) {
    console.error('[getOrderStats] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve order statistics', error.message));
  }
};

// Get orders by status
const getOrdersByStatus = async (req, res) => {
  console.log('=== [getOrdersByStatus] Starting ===');
  try {
    const { status } = req.params;
    const { page = 1, limit = 10, userId } = req.query;
    const isAdmin = req.user.role === 'admin';
    console.log('[getOrdersByStatus] Params:', { status, page, limit, userId, isAdmin });

    if (!isAdmin) {
      console.log('[getOrdersByStatus] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    const options = { status, isActive: true };
    if (userId) options.user = userId;

    const skip = (page - 1) * limit;
    
    console.log('[getOrdersByStatus] Fetching orders...');
    const orders = await Order.find(options)
      .populate('user', 'firstname lastname email')
      .populate('shippingAddress')
      .populate('billingAddress')
      .populate('items.item', 'name thumbnailImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    console.log('[getOrdersByStatus] Orders found:', orders.length);

    const total = await Order.countDocuments({ status, isActive: true });
    console.log('[getOrdersByStatus] Total orders:', total);

    return res.status(200).json(apiResponse(200, true, `Orders with status ${status} retrieved successfully`, {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }));

  } catch (error) {
    console.error('[getOrdersByStatus] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve orders by status', error.message));
  }
};

// Delete order (admin only - soft delete)
const deleteOrder = async (req, res) => {
  console.log('=== [deleteOrder] Starting ===');
  try {
    const { orderId } = req.params;
    const isAdmin = req.user.role === 'admin';
    console.log('[deleteOrder] Params:', { orderId, isAdmin });

    if (!isAdmin) {
      console.log('[deleteOrder] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    console.log('[deleteOrder] Fetching order...');
    const order = await Order.findById(orderId);
    console.log('[deleteOrder] Order:', order ? 'Found' : 'Not found');

    if (!order) {
      console.log('[deleteOrder] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }

    console.log('[deleteOrder] Soft deleting order...');
    order.isActive = false;
    await order.save();
    console.log('[deleteOrder] ✅ Order soft deleted');

    return res.status(200).json(apiResponse(200, true, 'Order deleted successfully'));

  } catch (error) {
    console.error('[deleteOrder] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to delete order', error.message));
  }
};

// Reorder functionality
const reorder = async (req, res) => {
  console.log('=== [reorder] Starting ===');
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    console.log('[reorder] Params:', { orderId, userId });

    console.log('[reorder] Fetching original order...');
    const originalOrder = await Order.findById(orderId)
      .populate('items.item');
    console.log('[reorder] Order:', originalOrder ? 'Found' : 'Not found');

    if (!originalOrder) {
      console.log('[reorder] ❌ Order not found');
      return res.status(404).json(apiResponse(404, false, 'Original order not found'));
    }

    if (originalOrder.user.toString() !== userId) {
      console.log('[reorder] ❌ Access denied');
      return res.status(403).json(apiResponse(403, false, 'Access denied'));
    }

    console.log('[reorder] Checking item availability...');
    const availableItems = [];
    const unavailableItems = [];

    for (const orderItem of originalOrder.items) {
      console.log('[reorder] Processing item:', orderItem.item);
      const item = await Item.findById(orderItem.item);
      console.log('[reorder] Item:', item ? item.name : 'Not found');

      if (!item) {
        unavailableItems.push({
          itemName: orderItem.item.name || 'Unknown Item',
          reason: 'Item no longer available'
        });
        console.log('[reorder] Item unavailable:', orderItem.item.name);
        continue;
      }

      const variant = item.variants.find(v => v.size === orderItem.selectedVariant.size);
      if (!variant) {
        unavailableItems.push({
          itemName: item.name,
          reason: `Size ${orderItem.selectedVariant.size} no longer available`
        });
        console.log('[reorder] Size unavailable:', orderItem.selectedVariant.size);
        continue;
      }

      const color = variant.colors.find(c => c.name === orderItem.selectedVariant.color.name);
      if (!color) {
        unavailableItems.push({
          itemName: item.name,
          reason: `Color ${orderItem.selectedVariant.color.name} no longer available`
        });
        console.log('[reorder] Color unavailable:', orderItem.selectedVariant.color.name);
        continue;
      }

      if (color.stock < orderItem.quantity) {
        unavailableItems.push({
          itemName: item.name,
          reason: `Insufficient stock (Available: ${color.stock}, Requested: ${orderItem.quantity})`
        });
        console.log('[reorder] Insufficient stock:', { item: item.name, available: color.stock, requested: orderItem.quantity });
        continue;
      }

      availableItems.push(orderItem);
      console.log('[reorder] Item available:', item.name);
    }

    if (availableItems.length === 0) {
      console.log('[reorder] ❌ No items available for reorder');
      return res.status(400).json(apiResponse(400, false, 'No items available for reorder', { unavailableItems }));
    }

    console.log('[reorder] Adding items to cart...');
    const cart = await Cart.getOrCreateCart(userId);
    
    for (const item of availableItems) {
      console.log('[reorder] Adding item to cart:', item.item._id);
      await cart.addItem(
        item.item._id,
        item.quantity,
        item.selectedVariant
      );
      console.log('[reorder] Item added to cart:', item.item._id);
    }
    console.log('[reorder] ✅ Items added to cart');

    console.log('[reorder] Getting cart stats...');
    const cartSummary = await cart.getCartStats();
    console.log('[reorder] Cart stats:', cartSummary);

    return res.status(200).json(apiResponse(200, true, 'Items added to cart for reorder', {
      addedToCart: availableItems.length,
      unavailableItems,
      cartSummary
    }));

  } catch (error) {
    console.error('[reorder] Error:', error);
    return res.status(500).json(apiResponse(500, false, 'Failed to process reorder', error.message));
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  updatePaymentStatus,
  addTrackingInfo,
  cancelOrder,
  returnOrder,
  getOrderStats,
  getOrdersByStatus,
  deleteOrder,
  reorder
};