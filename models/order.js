const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  selectedVariant: {
    size: {
      type: String,
      required: true
    },
    color: {
      name: {
        type: String,
        required: true
      },
      hexCode: String
    }
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  finalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
  billingAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'returned',
      'refunded'
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online', 'wallet', 'upi'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paymentDate: Date,
    failureReason: String
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  courier: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
orderSchema.index({ user: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ user: 1, createdAt: -1 });

// Virtual for order summary
orderSchema.virtual('orderSummary').get(function() {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    totalItems: this.items.reduce((total, item) => total + item.quantity, 0),
    totalAmount: this.totalAmount,
    estimatedDelivery: this.estimatedDelivery
  };
});

// Virtual for order status timeline
orderSchema.virtual('statusTimeline').get(function() {
  const timeline = [];
  
  if (this.createdAt) {
    timeline.push({
      status: 'Order Placed',
      date: this.createdAt,
      description: 'Order has been placed successfully'
    });
  }
  
  if (this.status === 'confirmed' || this.status === 'processing' || this.status === 'shipped' || this.status === 'out_for_delivery' || this.status === 'delivered') {
    timeline.push({
      status: 'Order Confirmed',
      date: this.updatedAt,
      description: 'Order has been confirmed and is being processed'
    });
  }
  
  if (this.status === 'shipped' || this.status === 'out_for_delivery' || this.status === 'delivered') {
    timeline.push({
      status: 'Order Shipped',
      date: this.updatedAt,
      description: 'Order has been shipped'
    });
  }
  
  if (this.status === 'out_for_delivery' || this.status === 'delivered') {
    timeline.push({
      status: 'Out for Delivery',
      date: this.updatedAt,
      description: 'Order is out for delivery'
    });
  }
  
  if (this.status === 'delivered') {
    timeline.push({
      status: 'Delivered',
      date: this.actualDelivery || this.updatedAt,
      description: 'Order has been delivered successfully'
    });
  }
  
  return timeline;
});

// Method to generate order number
orderSchema.statics.generateOrderNumber = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${timestamp.slice(-8)}${random}`;
};

// Method to update order status
orderSchema.methods.updateStatus = async function(newStatus, notes = '') {
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['out_for_delivery', 'delivered'],
    'out_for_delivery': ['delivered'],
    'delivered': ['returned'],
    'cancelled': [],
    'returned': ['refunded'],
    'refunded': []
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }

  this.status = newStatus;
  if (notes) {
    this.notes = notes;
  }

  // Set estimated delivery for confirmed orders
  if (newStatus === 'confirmed' && !this.estimatedDelivery) {
    this.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  }

  // Set actual delivery for delivered orders
  if (newStatus === 'delivered') {
    this.actualDelivery = new Date();
  }

  return await this.save();
};

// Method to update payment status
orderSchema.methods.updatePaymentStatus = async function(newPaymentStatus, paymentDetails = {}) {
  this.paymentStatus = newPaymentStatus;
  
  if (paymentDetails.transactionId) {
    this.paymentDetails.transactionId = paymentDetails.transactionId;
  }
  
  if (paymentDetails.paymentGateway) {
    this.paymentDetails.paymentGateway = paymentDetails.paymentGateway;
  }
  
  if (paymentDetails.paymentDate) {
    this.paymentDetails.paymentDate = paymentDetails.paymentDate;
  }
  
  if (paymentDetails.failureReason) {
    this.paymentDetails.failureReason = paymentDetails.failureReason;
  }

  return await this.save();
};

// Method to add tracking information
orderSchema.methods.addTrackingInfo = async function(trackingNumber, courier) {
  this.trackingNumber = trackingNumber;
  this.courier = courier;
  return await this.save();
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((total, item) => {
    const itemPrice = item.discountPrice > 0 ? item.discountPrice : item.price;
    return total + (itemPrice * item.quantity);
  }, 0);

  this.totalAmount = this.subtotal + this.tax + this.shippingCharges - this.discount;
  
  return {
    subtotal: this.subtotal,
    tax: this.tax,
    shippingCharges: this.shippingCharges,
    discount: this.discount,
    totalAmount: this.totalAmount
  };
};

// Method to apply discount
orderSchema.methods.applyDiscount = function(discountAmount) {
  if (discountAmount > this.subtotal) {
    throw new Error('Discount cannot exceed subtotal');
  }
  
  this.discount = discountAmount;
  this.totalAmount = this.subtotal + this.tax + this.shippingCharges - this.discount;
  
  return this.totalAmount;
};

// Static method to get orders by status
orderSchema.statics.getByStatus = function(status, options = {}) {
  const query = { status, isActive: true };
  
  if (options.userId) {
    query.user = options.userId;
  }
  
  return this.find(query)
    .populate('user', 'firstname lastname email')
    .populate('shippingAddress')
    .populate('billingAddress')
    .populate('items.item', 'name thumbnailImage')
    .sort({ createdAt: -1 });
};

// Static method to get user orders
orderSchema.statics.getUserOrders = function(userId, options = {}) {
  const query = { user: userId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.paymentStatus) {
    query.paymentStatus = options.paymentStatus;
  }
  
  return this.find(query)
    .populate('shippingAddress')
    .populate('billingAddress')
    .populate('items.item', 'name thumbnailImage price discountPrice')
    .sort({ createdAt: -1 });
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(userId = null) {
  const matchStage = { isActive: true };
  
  if (userId) {
    matchStage.user = mongoose.Types.ObjectId(userId);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to get revenue statistics
orderSchema.statics.getRevenueStats = function(startDate, endDate, userId = null) {
  const matchStage = {
    isActive: true,
    paymentStatus: 'paid',
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  if (userId) {
    matchStage.user = mongoose.Types.ObjectId(userId);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.constructor.generateOrderNumber();
  }
  
  // Calculate totals before saving
  if (this.isModified('items') || this.isModified('tax') || this.isModified('shippingCharges') || this.isModified('discount')) {
    this.calculateTotals();
  }
  
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
