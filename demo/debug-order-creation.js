const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Item = require('../models/item');
const Address = require('../models/address');
const User = require('../models/user');

// Connect to MongoDB (adjust connection string as needed)
mongoose.connect('mongodb://localhost:27017/cartuno', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugOrderCreation() {
  try {
    console.log('=== Starting Order Creation Debug ===');
    
    // Test user ID from your logs
    const userId = '68a71f8a214361f49d79e7cb';
    console.log('Testing with User ID:', userId);
    
    // 1. Check if user exists
    console.log('\n1. Checking if user exists...');
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log('✅ User found:', user.firstname, user.lastname);
    
    // 2. Check if user has addresses
    console.log('\n2. Checking user addresses...');
    const addresses = await Address.find({ user: userId });
    console.log('✅ Addresses found:', addresses.length);
    addresses.forEach(addr => {
      console.log(`   - ${addr.addressType}: ${addr.addressLine1}, ${addr.city}`);
    });
    
    // 3. Check if user has cart
    console.log('\n3. Checking user cart...');
    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) {
      console.log('❌ No active cart found');
      return;
    }
    console.log('✅ Cart found with items:', cart.items.length);
    
    // 4. Check cart items and stock
    console.log('\n4. Checking cart items and stock...');
    for (const cartItem of cart.items) {
      console.log(`\n   Item ID: ${cartItem.item}`);
      
      const item = await Item.findById(cartItem.item);
      if (!item) {
        console.log('   ❌ Item not found in database');
        continue;
      }
      
      console.log(`   ✅ Item: ${item.name}`);
      console.log(`   ✅ Price: ${item.price}, Discount: ${item.discountPrice || 0}`);
      console.log(`   ✅ Variant: ${cartItem.selectedVariant.size} - ${cartItem.selectedVariant.color.name}`);
      
      // Check stock
      const variant = item.variants.find(v => v.size === cartItem.selectedVariant.size);
      if (!variant) {
        console.log('   ❌ Size variant not found');
        continue;
      }
      
      const color = variant.colors.find(c => c.name === cartItem.selectedVariant.color.name);
      if (!color) {
        console.log('   ❌ Color variant not found');
        continue;
      }
      
      console.log(`   ✅ Stock available: ${color.stock}`);
      console.log(`   ✅ Quantity requested: ${cartItem.quantity}`);
      
      if (color.stock < cartItem.quantity) {
        console.log('   ❌ Insufficient stock!');
      } else {
        console.log('   ✅ Stock sufficient');
      }
    }
    
    // 5. Test cart totals calculation
    console.log('\n5. Testing cart totals...');
    try {
      const cartStats = await cart.getCartStats();
      console.log('✅ Cart stats:', cartStats);
    } catch (error) {
      console.log('❌ Error getting cart stats:', error.message);
    }
    
    // 6. Test address validation
    console.log('\n6. Testing address validation...');
    const addressId = '68a71fc4214361f49d79e7ce';
    const address = await Address.findById(addressId);
    if (address) {
      console.log('✅ Address found:', address.addressLine1, address.city);
      if (address.user.toString() === userId) {
        console.log('✅ Address belongs to user');
      } else {
        console.log('❌ Address does not belong to user');
      }
    } else {
      console.log('❌ Address not found');
    }
    
    console.log('\n=== Debug Complete ===');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the debug function
debugOrderCreation();
