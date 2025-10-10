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
  console.group('🔥 BACKEND FIREBASE LOGIN DEBUG');
  
  try {
    const { idToken } = req.body;
    console.log('📥 Request received');
    console.log('🎫 ID Token present:', !!idToken);
    console.log('🎫 ID Token length:', idToken?.length);
    console.log('🎫 ID Token preview:', idToken ? idToken.substring(0, 50) + '...' : 'MISSING');
    
    if (!idToken) {
      console.error('❌ No ID token provided');
      console.groupEnd();
      return res.status(400).json(apiResponse(400, false, 'idToken is required'));
    }

    console.log('🔐 Verifying Firebase ID token...');
    console.log('🔐 Using Firebase Admin SDK for project:', firebaseAdmin.app().options.projectId);
    
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    console.log('✅ Firebase ID token verified successfully!');
    console.log('✅ Decoded token data:', {
      uid: decoded.uid,
      phone_number: decoded.phone_number,
      aud: decoded.aud,
      iss: decoded.iss,
      exp: new Date(decoded.exp * 1000).toISOString(),
      iat: new Date(decoded.iat * 1000).toISOString()
    });
    
    const firebaseUid = decoded.uid;
    const phone = decoded.phone_number || null;
    console.log('📱 Firebase UID:', firebaseUid);
    console.log('📱 Phone number:', phone);

    console.log('🔍 Searching for existing user...');
    let user = await User.findOne({ firebaseUid });
    console.log('🔍 User found by firebaseUid:', !!user);
    
    if (!user && phone) {
      console.log('🔍 Searching by phone number...');
      user = await User.findOne({ number: phone });
      console.log('🔍 User found by phone:', !!user);
    }

    if (!user) {
      console.log('👤 Creating new user...');
      user = new User({
        firebaseUid,
        number: phone || `uid:${firebaseUid}`,
        isProfile: false,
      });
      console.log('👤 New user created:', {
        firebaseUid: user.firebaseUid,
        number: user.number,
        isProfile: user.isProfile
      });
    } else if (!user.firebaseUid) {
      console.log('🔗 Linking firebaseUid to existing user...');
      user.firebaseUid = firebaseUid;
      console.log('🔗 User updated with firebaseUid');
    } else {
      console.log('👤 Existing user found:', {
        id: user._id,
        firebaseUid: user.firebaseUid,
        number: user.number,
        isProfile: user.isProfile
      });
    }

    console.log('💾 Saving user to database...');
    await user.save();
    console.log('✅ User saved successfully');

    console.log('🎫 Generating JWT token...');
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
    console.log('✅ JWT token generated');
    console.log('🎫 Token length:', token.length);

    const responseData = {
      userId: user._id,
      number: user.number,
      isProfile: user.isProfile,
      token,
    };
    
    console.log('📤 Sending success response:', responseData);
    console.groupEnd();
    
    return res.status(200).json(
      apiResponse(200, true, 'Firebase login successful', responseData)
    );
  } catch (error) {
    console.error('❌ User Firebase login error details:');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error object:', error);
    
    // Detailed error analysis
    console.group('🔍 Backend Error Analysis');
    if (error.code === 'auth/argument-error') {
      console.log('💡 Likely cause: Firebase ID token has wrong audience (aud) claim');
      console.log('💡 Expected project:', firebaseAdmin.app().options.projectId);
      console.log('💡 Token audience:', error.message.includes('Expected') ? 'Check error message' : 'Unknown');
      console.log('💡 Solution: Ensure frontend and backend use same Firebase project');
    } else if (error.code === 'auth/id-token-expired') {
      console.log('💡 Likely cause: Firebase ID token has expired');
      console.log('💡 Solution: Request a new token from frontend');
    } else if (error.code === 'auth/invalid-id-token') {
      console.log('💡 Likely cause: Firebase ID token is malformed');
      console.log('💡 Solution: Check token generation in frontend');
    } else {
      console.log('💡 Unknown error code:', error.code);
      console.log('💡 Check Firebase Admin SDK documentation');
    }
    console.groupEnd();
    
    console.groupEnd();
    return res.status(401).json(apiResponse(401, false, 'Invalid Firebase ID token'));
  }
}

module.exports.loginWithFirebase = loginWithFirebase;
