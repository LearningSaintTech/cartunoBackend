const mongoose = require("mongoose");

const homePageSchema = new mongoose.Schema(
  {
    banners: {
      type: Map,
      of: [{
        type: String, // Array of S3 image URLs
        required: true
      }],
      default: new Map()
    },
    // You can add more home page sections here as needed
    // For example:
    // featuredCategories: [{
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Category'
    // }],
    // heroSection: {
    //   title: String,
    //   subtitle: String,
    //   backgroundImage: String
    // }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Example banner keys could be:
// - "hero" -> array of hero banner images
// - "mobile" -> array of mobile banner images  
// - "desktop" -> array of desktop banner images
// - "category" -> array of category banner images

// Method to add/update banner images
homePageSchema.methods.updateBanner = function(key, imageUrls) {
  if (!Array.isArray(imageUrls)) {
    throw new Error('Image URLs must be an array');
  }
  this.banners.set(key, imageUrls);
  return this.save();
};

// Method to remove a banner
homePageSchema.methods.removeBanner = function(key) {
  this.banners.delete(key);
  return this.save();
};

// Method to get all banner keys
homePageSchema.methods.getBannerKeys = function() {
  return Array.from(this.banners.keys());
};

// Method to get banner images by key
homePageSchema.methods.getBannerImages = function(key) {
  return this.banners.get(key) || [];
};

// Static method to get or create home page
homePageSchema.statics.getOrCreate = async function() {
  let homePage = await this.findOne();
  if (!homePage) {
    homePage = new this();
    await homePage.save();
  }
  return homePage;
};

const HomePage = mongoose.model("HomePage", homePageSchema);

module.exports = HomePage;
