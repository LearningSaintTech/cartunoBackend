// Test the randomized items API endpoint directly
const axios = require('axios');

async function testRandomizedItemsEndpoint() {
  console.log('🧪 Testing Randomized Items API Endpoint');
  console.log('='.repeat(50));

  const baseURL = 'https://api.cartuno.us/api/api';
  
  try {
    // Test 1: Basic request
    console.log('🎲 Test 1: Basic randomized request');
    const response1 = await axios.get(`${baseURL}/items/randomized?limit=5`);
    
    console.log('✅ Status:', response1.status);
    console.log('✅ Success:', response1.data.success);
    console.log('✅ Items count:', response1.data.data?.items?.length || 0);
    
    if (response1.data.data?.items?.length > 0) {
      console.log('✅ First item:', response1.data.data.items[0].name);
    }

    // Test 2: With limit
    console.log('\n🎲 Test 2: With custom limit');
    const response2 = await axios.get(`${baseURL}/items/randomized?limit=3`);
    
    console.log('✅ Status:', response2.status);
    console.log('✅ Items count:', response2.data.data?.items?.length || 0);

    // Test 3: Check if items have required fields
    console.log('\n🎲 Test 3: Check item structure');
    if (response1.data.data?.items?.length > 0) {
      const item = response1.data.data.items[0];
      console.log('✅ Item fields:');
      console.log('   - _id:', !!item._id);
      console.log('   - name:', !!item.name);
      console.log('   - price:', !!item.price);
      console.log('   - thumbnailImage:', !!item.thumbnailImage);
      console.log('   - categoryName:', !!item.categoryName);
      console.log('   - subcategoryName:', !!item.subcategoryName);
    }

  } catch (error) {
    console.error('❌ API Error:', error.response?.status);
    console.error('❌ Error Message:', error.response?.data?.message || error.message);
    console.error('❌ Full Error:', error.response?.data);
    
    if (error.response?.status === 500) {
      console.log('\n🔍 500 Error Analysis:');
      console.log('   - Server internal error');
      console.log('   - Check backend logs');
      console.log('   - Possible database connection issue');
      console.log('   - Possible aggregation pipeline error');
    }
  }
}

// Run the test
testRandomizedItemsEndpoint();
