// Test the route locally
const express = require('express');
const mongoose = require('mongoose');
const Item = require('./models/item');

// Production MongoDB URI
const MONGODB_URI = 'mongodb://3.109.157.169:27017/cartuno';

// Create a simple test server
const app = express();
app.use(express.json());

// Import the controller function
const { getRandomizedItems } = require('./controllers/itemController');

// Add the route
app.get('/test-randomized', getRandomizedItems);

async function testRouteLocally() {
  console.log('🧪 Testing Route Locally');
  console.log('='.repeat(50));

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Start the test server
    const server = app.listen(3001, () => {
      console.log('✅ Test server running on port 3001');
    });

    // Test the route
    const axios = require('axios');
    const response = await axios.get('http://localhost:3001/test-randomized?limit=3');
    
    console.log('✅ Route test successful');
    console.log('✅ Status:', response.status);
    console.log('✅ Success:', response.data.success);
    console.log('✅ Items count:', response.data.data?.items?.length || 0);
    
    if (response.data.data?.items?.length > 0) {
      console.log('✅ First item:', response.data.data.items[0].name);
    }

    // Close the server
    server.close();
    console.log('✅ Test server closed');

  } catch (error) {
    console.error('❌ Route test failed:', error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testRouteLocally();
