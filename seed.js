const mongoose = require('mongoose');
const User = require('./models/user');
const Address = require('./models/Address');
const Admin = require('./models/Admin');
const Category = require('./models/Category');
const SubCategory = require('./models/SubCategory');
const GlobalFilter = require('./models/GlobalFilter');
const Item = require('./models/Item');
const Cart = require('./models/Cart');
const Wishlist = require('./models/whishlist');
const Order = require('./models/Order');
const ReviewRating = require('./models/ReviewRating');
const HomePage = require('./models/homePage');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/cartuno', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  seedDatabase();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Sample S3 URL for images
const baseImageUrl = 'https://yoraaecommerce.s3.amazonaws.com/banners/hero/1756103008225_blue-back.PNG';

// Seed function
async function seedDatabase() {
  try {
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Address.deleteMany({}),
      Admin.deleteMany({}),
      Category.deleteMany({}),
      SubCategory.deleteMany({}),
      GlobalFilter.deleteMany({}),
      Item.deleteMany({}),
      Cart.deleteMany({}),
      Wishlist.deleteMany({}),
      Order.deleteMany({}),
      ReviewRating.deleteMany({}),
      HomePage.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create Users
    const users = await User.insertMany([
      {
        firebaseUid: 'user1_firebase_uid',
        number: '+919829699382',
        firstname: 'Rahul',
        lastname: 'Sharma',
        email: 'rahul.sharma@example.com',
        dob: new Date('1990-05-15'),
        gender: 'male',
        profileImage: baseImageUrl,
      },
      {
        firebaseUid: 'user2_firebase_uid',
        number: '+919876543211',
        firstname: 'Priya',
        lastname: 'Verma',
        email: 'priya.verma@example.com',
        dob: new Date('1995-08-20'),
        gender: 'female',
        profileImage: baseImageUrl,
      },
    ]);
    console.log('Created users');

    // Create Addresses
    const addresses = await Address.insertMany([
      {
        user: users[0]._id,
        addressType: 'home',
        isDefault: true,
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: '+919829699382',
        email: 'rahul.sharma@example.com',
        addressLine1: '123, MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        landmark: 'Near City Mall',
      },
      {
        user: users[1]._id,
        addressType: 'office',
        isDefault: true,
        firstName: 'Priya',
        lastName: 'Verma',
        phone: '+919876543211',
        email: 'priya.verma@example.com',
        addressLine1: '456, Sector 17',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
      },
    ]);
    console.log('Created addresses');

    // Create Admin
    const admin = await Admin.create({
      firebaseUid: 'admin1_firebase_uid',
      number: '+919000000000',
      role: 'admin',
    });
    console.log('Created admin');

    // Create Categories
    const categories = await Category.insertMany([
      {
        name: 'Electronics',
        description: 'Electronic gadgets and accessories',
        image: baseImageUrl,
        sortOrder: 1,
      },
      {
        name: 'Clothing',
        description: 'Men and women clothing',
        image: baseImageUrl,
        sortOrder: 2,
      },
    ]);
    console.log('Created categories');

    // Create SubCategories
    const subCategories = await SubCategory.insertMany([
      {
        name: 'Smartphones',
        description: 'Latest smartphones',
        image: baseImageUrl,
        category: categories[0]._id,
        sortOrder: 1,
      },
      {
        name: 'Laptops',
        description: 'High-performance laptops',
        image: baseImageUrl,
        category: categories[0]._id,
        sortOrder: 2,
      },
      {
        name: 'Men’s Clothing',
        description: 'Men’s fashion apparel',
        image: baseImageUrl,
        category: categories[1]._id,
        sortOrder: 1,
      },
    ]);
    console.log('Created subcategories');

    // Create Global Filters
    const globalFilters = await GlobalFilter.insertMany([
      {
        key: 'brand',
        displayName: 'Brand',
        values: [
          { value: 'apple', displayName: 'Apple', count: 10, sortOrder: 1 },
          { value: 'samsung', displayName: 'Samsung', count: 8, sortOrder: 2 },
        ],
        category: categories[0]._id,
        sortOrder: 1,
      },
      {
        key: 'size',
        displayName: 'Size',
        values: [
          { value: 's', displayName: 'Small', count: 5, sortOrder: 1 },
          { value: 'm', displayName: 'Medium', count: 5, sortOrder: 2 },
        ],
        category: categories[1]._id,
        sortOrder: 1,
      },
    ]);
    console.log('Created global filters');

    // Create Items
    const items = await Item.insertMany([
      {
        name: 'iPhone 14',
        description: 'Latest iPhone with A15 Bionic chip',
        price: 79999,
        discountPrice: 74999,
        discountPercentage: 6.25,
        thumbnailImage: baseImageUrl,
        categoryId: categories[0]._id,
        subcategoryId: subCategories[0]._id,
        filters: [
          {
            key: 'brand',
            values: ['apple'],
            displayValues: ['Apple'],
            sortOrder: 1,
          },
          {
            key: 'storage',
            values: ['128gb', '256gb'],
            displayValues: ['128GB', '256GB'],
            sortOrder: 2,
          },
        ],
        keyHighlights: [
          { key: 'Camera', value: '48MP Main Camera' },
          { key: 'Display', value: '6.1-inch Super Retina XDR' },
        ],
        variants: [
          {
            size: 'Standard',
            colors: [
              {
                name: 'Midnight',
                hexCode: '#000000',
                images: [baseImageUrl],
                sku: 'IPH14-MID-128',
                stock: 50,
              },
              {
                name: 'Starlight',
                hexCode: '#FFFFFF',
                images: [baseImageUrl],
                sku: 'IPH14-STAR-128',
                stock: 30,
              },
            ],
          },
        ],
      },
      {
        name: 'Men’s Casual Shirt',
        description: 'Comfortable cotton shirt for men',
        price: 1999,
        discountPrice: 1599,
        discountPercentage: 20,
        thumbnailImage: baseImageUrl,
        categoryId: categories[1]._id,
        subcategoryId: subCategories[2]._id,
        filters: [
          {
            key: 'size',
            values: ['s', 'm'],
            displayValues: ['Small', 'Medium'],
            sortOrder: 1,
          },
          {
            key: 'material',
            values: ['cotton'],
            displayValues: ['Cotton'],
            sortOrder: 2,
          },
        ],
        keyHighlights: [
          { key: 'Material', value: '100% Cotton' },
          { key: 'Fit', value: 'Regular Fit' },
        ],
        variants: [
          {
            size: 'Medium',
            colors: [
              {
                name: 'Blue',
                hexCode: '#0000FF',
                images: [baseImageUrl],
                sku: 'SHIRT-BLUE-M',
                stock: 100,
              },
            ],
          },
        ],
      },
    ]);
    console.log('Created items');

    // Create Carts
    const carts = await Cart.insertMany([
      {
        user: users[0]._id,
        items: [
          {
            item: items[0]._id,
            quantity: 1,
            selectedVariant: {
              size: 'Standard',
              color: { name: 'Midnight', hexCode: '#000000' },
            },
            price: items[0].price,
            discountPrice: items[0].discountPrice,
            notes: 'Urgent delivery',
          },
        ],
      },
      {
        user: users[1]._id,
        items: [
          {
            item: items[1]._id,
            quantity: 2,
            selectedVariant: {
              size: 'Medium',
              color: { name: 'Blue', hexCode: '#0000FF' },
            },
            price: items[1].price,
            discountPrice: items[1].discountPrice,
          },
        ],
      },
    ]);
    console.log('Created carts');

    // Create Wishlists
    const wishlists = await Wishlist.insertMany([
      {
        user: users[0]._id,
        items: [
          {
            item: items[1]._id,
            notes: 'Interested in blue color',
          },
        ],
      },
      {
        user: users[1]._id,
        items: [
          {
            item: items[0]._id,
            notes: 'For upcoming purchase',
          },
        ],
      },
    ]);
    console.log('Created wishlists');

    // Create Orders
    const orders = await Order.insertMany([
      {
        orderNumber: Order.generateOrderNumber(),
        user: users[0]._id,
        items: [
          {
            item: items[0]._id,
            quantity: 1,
            selectedVariant: {
              size: 'Standard',
              color: { name: 'Midnight', hexCode: '#000000' },
            },
            price: items[0].price,
            discountPrice: items[0].discountPrice,
            finalPrice: items[0].discountPrice,
          },
        ],
        shippingAddress: addresses[0]._id,
        billingAddress: addresses[0]._id,
        paymentMethod: 'cod',
        subtotal: items[0].discountPrice,
        totalAmount: items[0].discountPrice,
        status: 'confirmed',
        paymentStatus: 'pending',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        orderNumber: Order.generateOrderNumber(),
        user: users[1]._id,
        items: [
          {
            item: items[1]._id,
            quantity: 2,
            selectedVariant: {
              size: 'Medium',
              color: { name: 'Blue', hexCode: '#0000FF' },
            },
            price: items[1].price,
            discountPrice: items[1].discountPrice,
            finalPrice: items[1].discountPrice,
          },
        ],
        shippingAddress: addresses[1]._id,
        billingAddress: addresses[1]._id,
        paymentMethod: 'online',
        paymentDetails: {
          transactionId: 'TXN123456',
          paymentGateway: 'Razorpay',
          paymentDate: new Date(),
        },
        subtotal: items[1].discountPrice * 2,
        totalAmount: items[1].discountPrice * 2,
        status: 'delivered',
        paymentStatus: 'paid',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        actualDelivery: new Date(),
      },
    ]);
    console.log('Created orders');

    // Create ReviewRatings
    const reviewRatings = await ReviewRating.insertMany([
      {
        user: users[0]._id,
        item: items[0]._id,
        rating: 4,
        title: 'Great Phone',
        text: 'Really happy with the performance of the iPhone 14!',
        images: [{ url: baseImageUrl }],
      },
      {
        user: users[1]._id,
        item: items[1]._id,
        rating: 5,
        title: 'Comfortable Shirt',
        text: 'The shirt fits perfectly and is very comfortable.',
        images: [{ url: baseImageUrl }],
      },
    ]);
    console.log('Created review ratings');

    // Create HomePage with sample banners
    const homePage = await HomePage.create({
      banners: new Map([
        ['hero', [
          baseImageUrl,
          baseImageUrl,
          baseImageUrl
        ]],
        ['mobile', [
          baseImageUrl,
          baseImageUrl
        ]],
        ['desktop', [
          baseImageUrl,
          baseImageUrl,
          baseImageUrl
        ]],
        ['category', [
          baseImageUrl,
          baseImageUrl
        ]]
      ])
    });
    console.log('Created home page with banners');

    console.log('Database seeding completed successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
}