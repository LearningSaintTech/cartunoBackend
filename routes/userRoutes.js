const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  requestOTP, 
  verifyOTP, 
  getUserProfile, 
  updateProfile, 
  deleteProfileImage,
  checkProfileStatus,
  loginWithFirebase,
} = require('../controllers/userController');
const { verifyAuth } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Public routes (no authentication required)
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/firebase-login', loginWithFirebase);

// Protected routes (authentication required)
router.get('/profile', verifyAuth(['user']), getUserProfile);
router.put('/profile', verifyAuth(['user']), upload.single('profileImage'), updateProfile);
router.delete('/profile-image', verifyAuth(['user']), deleteProfileImage);
router.get('/profile-status', verifyAuth(['user']), checkProfileStatus);

module.exports = router;
