const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { uploadImageToS3, updateFromS3, deleteFromS3 } = require('../utils/s3Upload');
const { apiResponse } = require('../utils/apiResponse');
const firebaseAdmin = require('../config/firebase');

// Generate OTP
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('Generated OTP:', otp);
  return otp;
};

// Send OTP to user (simulate SMS service)
const sendOTP = async (number, otp) => {
  // In real implementation, integrate with SMS service like Twilio
  console.log(`OTP ${otp} sent to ${number}`);
  return true;
};

// Request OTP - Deprecated in favor of Firebase phone auth on the client
const requestOTP = async (req, res) => {
  return res.status(410).json(
    apiResponse(410, false, 'Deprecated. Use Firebase phone auth on the client and POST /api/users/firebase-login with idToken.')
  );
};

// Verify OTP - Deprecated in favor of client-side Firebase confirmation + /firebase-login
const verifyOTP = async (req, res) => {
  return res.status(410).json(
    apiResponse(410, false, 'Deprecated. Use Firebase phone auth on the client and POST /api/users/firebase-login with idToken.')
  );
};

// Get user profile
const getUserProfile = async (req, res) => {
  console.log('=== getUserProfile called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('-otp');

    if (!user) {
      console.log('User not found for profile retrieval:', userId);
      return res.status(404).json(
        apiResponse(404, false, 'User not found')
      );
    }

    console.log('User profile retrieved successfully:', user._id);
    res.status(200).json(
      apiResponse(200, true, 'Profile retrieved successfully', user)
    );

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to get profile')
    );
  }
};

// Single update profile controller - handles both profile data and image
const updateProfile = async (req, res) => {
  console.log('=== updateProfile called ===');
  console.log('User ID:', req.user.userId);
  console.log('Update data:', req.body);
  console.log('Profile image:', req.file ? 'Present' : 'Not present');
  
  try {
    const userId = req.user.userId;
    const { firstname, lastname, email, dob, gender } = req.body;
    const profileImage = req.file; // From multer
    console.log('Extracted update data - firstname:', firstname, 'lastname:', lastname, 'email:', email, 'dob:', dob, 'gender:', gender);

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found for profile update:', userId);
      return res.status(404).json(
        apiResponse(404, false, 'User not found')
      );
    }

    console.log('User found for profile update:', user._id);

    // Update profile fields if provided
    if (firstname !== undefined) {
      user.firstname = firstname;
      console.log('First name updated');
    }
    if (lastname !== undefined) {
      user.lastname = lastname;
      console.log('Last name updated');
    }
    if (email !== undefined) {
      user.email = email;
      console.log('Email updated');
    }
    if (dob !== undefined) {
      user.dob = dob;
      console.log('Date of birth updated');
    }
    if (gender !== undefined) {
      user.gender = gender;
      console.log('Gender updated');
    }

    // Handle profile image if uploaded
    if (profileImage) {
      console.log('Processing profile image update...');
      try {
        // Upload new image to S3
        console.log('Uploading new profile image to S3...');
        const imageUrl = await uploadImageToS3(profileImage, 'profile-images');
        console.log('New profile image uploaded to S3:', imageUrl);

        // If user had a previous profile image, delete it from S3
        if (user.profileImage) {
          console.log('Deleting old profile image from S3:', user.profileImage);
          try {
            await deleteFromS3(user.profileImage);
            console.log('Old profile image deleted from S3 successfully');
          } catch (deleteError) {
            console.error('Failed to delete old profile image:', deleteError);
            // Continue with update even if deletion fails
          }
        }

        // Update user's profile image
        user.profileImage = imageUrl;
        console.log('Profile image updated successfully');
      } catch (imageError) {
        console.error('Profile image upload error:', imageError);
        return res.status(500).json(
          apiResponse(500, false, 'Failed to upload profile image')
        );
      }
    }

    // Save all changes
    await user.save();
    console.log('Profile updated and saved successfully');

    // Remove OTP from response
    const userResponse = user.toObject();
    delete userResponse.otp;
    console.log('OTP removed from response');

    res.status(200).json(
      apiResponse(200, true, 'Profile updated successfully', userResponse)
    );

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to update profile')
    );
  }
};

// Delete profile image
const deleteProfileImage = async (req, res) => {
  console.log('=== deleteProfileImage called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found for profile image deletion:', userId);
      return res.status(404).json(
        apiResponse(404, false, 'User not found')
      );
    }

    console.log('User found for profile image deletion:', user._id);

    if (!user.profileImage) {
      console.log('No profile image to delete');
      return res.status(400).json(
        apiResponse(400, false, 'No profile image to delete')
      );
    }

    console.log('Profile image found, deleting from S3:', user.profileImage);

    // Delete image from S3
    await deleteFromS3(user.profileImage);
    console.log('Profile image deleted from S3 successfully');

    // Remove profile image from user
    user.profileImage = null;
    await user.save();
    console.log('Profile image removed from user record');

    // Remove OTP from response
    const userResponse = user.toObject();
    delete userResponse.otp;
    console.log('OTP removed from response');

    res.status(200).json(
      apiResponse(200, true, 'Profile image deleted successfully', userResponse)
    );

  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to delete profile image')
    );
  }
};

// Check profile completion status
const checkProfileStatus = async (req, res) => {
  console.log('=== checkProfileStatus called ===');
  console.log('User ID:', req.user.userId);
  
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('isProfile firstname lastname email dob gender profileImage');
    if (!user) {
      console.log('User not found for profile status check:', userId);
      return res.status(404).json(
        apiResponse(404, false, 'User not found')
      );
    }

    console.log('User found for profile status check:', user._id);

    const profileStatus = {
      isProfile: user.isProfile,
      profileFields: {
        firstname: !!user.firstname,
        lastname: !!user.lastname,
        email: !!user.email,
        dob: !!user.dob,
        gender: !!user.gender,
        profileImage: !!user.profileImage
      }
    };

    console.log('Profile status calculated:', profileStatus);

    res.status(200).json(
      apiResponse(200, true, 'Profile status retrieved successfully', profileStatus)
    );

  } catch (error) {
    console.error('Check profile status error:', error);
    res.status(500).json(
      apiResponse(500, false, 'Failed to check profile status')
    );
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
  getUserProfile,
  updateProfile,
  deleteProfileImage,
  checkProfileStatus
};

// Firebase user login/verify using ID token
// Accepts: { idToken: string }
// Creates user if not exists (by firebaseUid or phone_number), then issues our JWT
async function loginWithFirebase(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json(apiResponse(400, false, 'idToken is required'));
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const phone = decoded.phone_number || null;

    let user = await User.findOne({ firebaseUid });
    if (!user && phone) {
      user = await User.findOne({ number: phone });
    }

    if (!user) {
      user = new User({
        firebaseUid,
        number: phone || `uid:${firebaseUid}`,
        isProfile: false,
      });
    } else if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
    }

    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        number: user.number,
        role: 'user',
        isProfile: user.isProfile,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.status(200).json(
      apiResponse(200, true, 'Firebase login successful', {
        userId: user._id,
        number: user.number,
        isProfile: user.isProfile,
        token,
      })
    );
  } catch (error) {
    console.error('User Firebase login error:', error);
    return res.status(401).json(apiResponse(401, false, 'Invalid Firebase ID token'));
  }
}

module.exports.loginWithFirebase = loginWithFirebase;
