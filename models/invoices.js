const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
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
    },
    sku: {
      type: String,
      required: true
    }
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  taxAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Customer details (snapshot at time of invoice generation)
  customerDetails: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },
  // Billing address (snapshot)
  billingAddress: {
    firstName: String,
    lastName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String,
    email: String
  },
  // Shipping address (snapshot)
  shippingAddress: {
    firstName: String,
    lastName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String,
    email: String
  },
  items: [invoiceItemSchema],
  // Financial details
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxBreakdown: [{
    taxName: {
      type: String,
      required: true,
      trim: true
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalTax: {
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
  discountDetails: {
    code: String,
    description: String,
    amount: Number
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    trim: true,
    uppercase: true
  },
  // Invoice dates
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  // Payment information
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'refunded', 'cancelled'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online', 'wallet', 'upi', 'card', 'netbanking'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paymentDate: Date,
    paidAmount: Number
  },
  // Additional information
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  termsAndConditions: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  // Status and metadata
  status: {
    type: String,
    enum: ['draft', 'issued', 'sent', 'viewed', 'paid', 'cancelled', 'refunded'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // PDF generation
  pdfUrl: {
    type: String,
    trim: true
  },
  pdfGeneratedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ user: 1 });
invoiceSchema.index({ order: 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ isActive: 1 });
invoiceSchema.index({ createdAt: -1 });

// Virtual for formatted invoice number
invoiceSchema.virtual('formattedInvoiceNumber').get(function() {
  return `INV-${this.invoiceNumber}`;
});

// Virtual for total paid
invoiceSchema.virtual('totalPaid').get(function() {
  return this.paymentDetails?.paidAmount || 0;
});

// Virtual for balance due
invoiceSchema.virtual('balanceDue').get(function() {
  const paid = this.paymentDetails?.paidAmount || 0;
  return Math.max(0, this.totalAmount - paid);
});

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timestamp}-${random}`;
};

// Static method to get invoices by user
invoiceSchema.statics.getByUser = function(userId, options = {}) {
  const { limit = 10, skip = 0, status } = options;
  
  const query = { 
    user: userId, 
    isActive: true 
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ invoiceDate: -1 })
    .limit(limit)
    .skip(skip)
    .populate('order', 'orderNumber status')
    .populate('user', 'firstname lastname email');
};

// Static method to get invoices by order
invoiceSchema.statics.getByOrder = function(orderId) {
  return this.find({ 
    order: orderId, 
    isActive: true 
  }).sort({ invoiceDate: -1 });
};

// Static method to get unpaid invoices
invoiceSchema.statics.getUnpaid = function(options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ 
    paymentStatus: { $in: ['unpaid', 'partially_paid'] },
    status: { $nin: ['cancelled', 'draft'] },
    isActive: true 
  })
    .sort({ dueDate: 1, invoiceDate: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'firstname lastname email phone')
    .populate('order', 'orderNumber');
};

// Method to mark as paid
invoiceSchema.methods.markAsPaid = function(paymentDetails) {
  this.paymentStatus = 'paid';
  this.status = 'paid';
  this.paymentDetails = {
    ...this.paymentDetails,
    ...paymentDetails,
    paidAmount: this.totalAmount,
    paymentDate: paymentDetails.paymentDate || new Date()
  };
  return this.save();
};

// Method to mark as cancelled
invoiceSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  if (reason) {
    this.notes = (this.notes || '') + `\nCancelled: ${reason}`;
  }
  return this.save();
};

// Method to update payment
invoiceSchema.methods.recordPayment = function(amount, paymentDetails) {
  const currentPaid = this.paymentDetails?.paidAmount || 0;
  const newPaid = currentPaid + amount;
  
  this.paymentDetails = {
    ...this.paymentDetails,
    ...paymentDetails,
    paidAmount: newPaid,
    paymentDate: paymentDetails.paymentDate || new Date()
  };
  
  if (newPaid >= this.totalAmount) {
    this.paymentStatus = 'paid';
    this.status = 'paid';
  } else if (newPaid > 0) {
    this.paymentStatus = 'partially_paid';
  }
  
  return this.save();
};

// Pre-save middleware
invoiceSchema.pre('save', function(next) {
  // Calculate totals if not set
  if (this.isModified('items') || this.isModified('taxBreakdown')) {
    // Calculate subtotal from items
    if (this.items && this.items.length > 0) {
      this.subtotal = this.items.reduce((sum, item) => {
        return sum + (item.discountPrice || item.unitPrice) * item.quantity;
      }, 0);
    }
    
    // Calculate total tax
    if (this.taxBreakdown && this.taxBreakdown.length > 0) {
      this.totalTax = this.taxBreakdown.reduce((sum, tax) => sum + tax.taxAmount, 0);
    }
    
    // Calculate total amount
    this.totalAmount = this.subtotal + this.totalTax + (this.shippingCharges || 0) - (this.discount || 0);
  }
  
  // Ensure invoice number is uppercase
  if (this.invoiceNumber) {
    this.invoiceNumber = this.invoiceNumber.toUpperCase();
  }
  
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;




