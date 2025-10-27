// Test the getRandomizedItems function directly
const mongoose = require('mongoose');
const Item = require('./models/item');

// Production MongoDB URI
const MONGODB_URI = 'mongodb://3.109.157.169:27017/cartuno';

async function testGetRandomizedItemsFunction() {
  console.log('🧪 Testing getRandomizedItems Function Directly');
  console.log('='.repeat(50));

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test the aggregation pipeline directly
    console.log('\n🎲 Testing aggregation pipeline...');
    
    const limit = 5;
    const query = {};
    
    // Get total count
    const totalCount = await Item.countDocuments(query);
    console.log('📊 Total items:', totalCount);
    
    if (totalCount === 0) {
      console.log('⚠️ No items found');
      return;
    }
    
    // Test the aggregation pipeline
    const randomizedItems = await Item.aggregate([
      { $match: query },
      { $sample: { size: Math.min(totalCount, limit * 2) } },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'subcategories',
          localField: 'subcategoryId',
          foreignField: '_id',
          as: 'subcategory'
        }
      },
      {
        $addFields: {
          categoryName: { $arrayElemAt: ['$category.name', 0] },
          subcategoryName: { $arrayElemAt: ['$subcategory.name', 0] },
          finalPrice: {
            $cond: {
              if: { $gt: ['$discountPrice', 0] },
              then: '$discountPrice',
              else: {
                $cond: {
                  if: { $gt: ['$discountPercentage', 0] },
                  then: { $multiply: ['$price', { $subtract: [1, { $divide: ['$discountPercentage', 100] }] }] },
                  else: '$price'
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          shortDescription: 1,
          price: 1,
          discountPrice: 1,
          discountPercentage: 1,
          finalPrice: 1,
          thumbnailImage: 1,
          categoryId: 1,
          subcategoryId: 1,
          categoryName: 1,
          subcategoryName: 1,
          variants: 1,
          filters: 1,
          keyHighlights: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $limit: parseInt(limit) }
    ]);
    
    console.log('✅ Aggregation pipeline successful');
    console.log('✅ Items retrieved:', randomizedItems.length);
    
    if (randomizedItems.length > 0) {
      console.log('✅ First item:', randomizedItems[0].name);
      console.log('✅ Category:', randomizedItems[0].categoryName);
      console.log('✅ Subcategory:', randomizedItems[0].subcategoryName);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
testGetRandomizedItemsFunction();
