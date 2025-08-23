const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables (explicitly from backend directory)
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });
console.log(`[env] Loaded .env from: ${envPath}`);
console.log(`[env] FIREBASE_SERVICE_ACCOUNT present: ${!!process.env.FIREBASE_SERVICE_ACCOUNT}`);
console.log(`[env] FIREBASE_PROJECT_ID present: ${!!process.env.FIREBASE_PROJECT_ID}`);
console.log(`[env] FIREBASE_CLIENT_EMAIL present: ${!!process.env.FIREBASE_CLIENT_EMAIL}`);
console.log(`[env] FIREBASE_PRIVATE_KEY present: ${!!process.env.FIREBASE_PRIVATE_KEY}`);

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const itemRoutes = require('./routes/itemRoutes');
const reviewRatingRoutes = require('./routes/reviewRatingRoutes');
const addressRoutes = require('./routes/addressRoutes');
const globalFilterRoutes = require('./routes/globalFilterRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/whishlistRoutes');
const orderRoutes = require('./routes/orderRoutes');
const homePageRoutes = require('./routes/homePageRoutes');

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Kartuno API' });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/reviews', reviewRatingRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/global-filters', globalFilterRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/homepage', homePageRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
