# 🔐 Complete Authentication Flow Documentation

## Overview
Your application uses **Firebase Phone Authentication** on the client-side combined with **JWT-based authorization** on the backend. There are separate flows for **Users** and **Admins**.

---

## 📱 USER Authentication Flow

### Step 1: Client-Side Firebase Phone Auth
**Location:** Client application (React Native/Web)

1. User enters phone number
2. Firebase sends OTP to phone
3. User enters OTP
4. Firebase verifies OTP and returns **idToken**

### Step 2: Backend Login & JWT Generation
**Endpoint:** `POST /api/users/firebase-login`

**Request:**
```json
{
  "idToken": "firebase-generated-id-token"
}
```

**Process Flow:**
```
userRoutes.js (Line 34)
  ↓
router.post('/firebase-login', loginWithFirebase)
  ↓
userController.js::loginWithFirebase() (Lines 272-325)
  ↓
  1. Verifies idToken with Firebase Admin SDK
  2. Extracts firebaseUid and phone_number
  3. Searches for existing user by:
     - firebaseUid (primary)
     - phone number (fallback)
  4. If user doesn't exist → Creates new user
  5. If user exists but no firebaseUid → Links firebaseUid
  6. Generates JWT token with payload:
     {
       userId: user._id,
       number: user.number,
       role: 'user',
       isProfile: user.isProfile
     }
  7. Returns JWT token to client
```

**Response (Success):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Firebase login successful",
  "data": {
    "userId": "68e798d82e0d913d4191d783",
    "number": "+919000000000",
    "isProfile": false,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Step 3: Accessing Protected Routes
**All protected user routes require:**
```
Authorization: Bearer <jwt-token>
```

**Protected User Routes:**

1. **GET /api/users/profile**
   - Middleware: `verifyAuth(['user'])`
   - Controller: `getUserProfile`
   - Returns: User profile data

2. **PUT /api/users/profile**
   - Middleware: `verifyAuth(['user'])`
   - Controller: `updateProfile`
   - Supports: Profile data + image upload (multipart/form-data)
   - Returns: Updated user profile

3. **DELETE /api/users/profile-image**
   - Middleware: `verifyAuth(['user'])`
   - Controller: `deleteProfileImage`
   - Returns: User profile without image

4. **GET /api/users/profile-status**
   - Middleware: `verifyAuth(['user'])`
   - Controller: `checkProfileStatus`
   - Returns: Profile completion status

### Step 4: Middleware Authentication
**Location:** `middleware/auth.js`

**Process:**
```javascript
verifyAuth(['user']) middleware
  ↓
1. Extracts token from Authorization header
2. Verifies JWT using JWT_SECRET
3. Decodes token payload
4. Normalizes user object:
   req.user = {
     id: decoded.userId,
     userId: decoded.userId,
     role: 'user',
     number: decoded.number,
     isProfile: decoded.isProfile
   }
5. Checks if user role matches allowed roles
6. If valid → next()
7. If invalid → 401/403 error
```

---

## 👨‍💼 ADMIN Authentication Flow

### Option 1: Firebase Phone Auth (Recommended)
**Endpoint:** `POST /api/admin/firebase-login`

**Request:**
```json
{
  "idToken": "firebase-generated-id-token"
}
```

**Process Flow:**
```
adminRoutes.js (Line 7)
  ↓
router.post('/firebase-login', adminFirebaseLogin)
  ↓
adminController.js::adminFirebaseLogin() (Lines 96-169)
  ↓
  1. Verifies idToken with Firebase Admin SDK
  2. Extracts firebaseUid and phone_number
  3. Searches for existing ACTIVE admin by:
     - firebaseUid (primary)
     - phone number (fallback)
  4. If admin exists but no firebaseUid → Links firebaseUid
  5. If no admin found → Returns 401 "Unauthorized admin"
     ⚠️ DOES NOT auto-create admins (security measure)
  6. Updates lastLogin timestamp
  7. Generates JWT token with payload:
     {
       adminId: admin._id,
       number: admin.number,
       role: 'admin'
     }
  8. Returns JWT token to client
```

**Response (Success):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Firebase login successful",
  "data": {
    "adminId": "68e798d82e0d913d4191d783",
    "number": "9000000000",
    "role": "admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Option 2: Password-Based Login (Legacy)
**Endpoint:** `POST /api/admin/login`

**Request:**
```json
{
  "number": "9000000000",
  "password": "admin-password"
}
```

**Process Flow:**
```
adminRoutes.js (Line 6)
  ↓
router.post('/login', adminLogin)
  ↓
adminController.js::adminLogin() (Lines 7-90)
  ↓
  1. Validates number and password
  2. Finds admin by number using Admin.findByNumber()
  3. Checks if admin.isActive === true
  4. Verifies password using admin.comparePassword()
  5. Updates lastLogin timestamp
  6. Generates JWT token with payload:
     {
       adminId: admin._id,
       number: admin.number,
       role: 'admin'
     }
  7. Returns JWT token to client
```

**Note:** The `admin.js` model shows no `password` field or `comparePassword` method, so this route might not be fully functional unless the model is updated.

---

## 🔒 JWT Token Structure

### User Token Payload:
```javascript
{
  userId: "68e798d82e0d913d4191d783",
  number: "+919000000000",
  role: "user",
  isProfile: false,
  iat: 1696856008,    // Issued at timestamp
  exp: 1697460808     // Expiration (7 days)
}
```

### Admin Token Payload:
```javascript
{
  adminId: "68e798d82e0d913d4191d783",
  number: "9000000000",
  role: "admin",
  iat: 1696856008,    // Issued at timestamp
  exp: 1696942408     // Expiration (24 hours)
}
```

---

## 🛡️ Middleware Security

### verifyAuth Middleware
**Location:** `middleware/auth.js`

**Usage Examples:**
```javascript
// Allow only users
verifyAuth(['user'])

// Allow only admins
verifyAuth(['admin'])

// Allow both users and admins
verifyAuth(['user', 'admin'])

// Just verify token, any role allowed
verifyAuth([])
```

**How it works:**
1. Extracts token from `Authorization: Bearer <token>`
2. Verifies JWT signature
3. Decodes payload
4. Normalizes `req.user` object
5. Checks role against `allowedRoles` array
6. Returns 401 if token invalid
7. Returns 403 if role not allowed
8. Calls `next()` if authorized

---

## 🔄 Complete Request Flow Example

### User Profile Update Request:

```
1. CLIENT
   ↓
   PUT /api/users/profile
   Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Body: { firstname: "John", lastname: "Doe" }

2. EXPRESS MIDDLEWARE CHAIN
   ↓
   userRoutes.js (Line 38)
   router.put('/profile', verifyAuth(['user']), upload.single('profileImage'), updateProfile)

3. AUTH MIDDLEWARE (middleware/auth.js)
   ↓
   - Extracts & verifies JWT token
   - Decodes: { userId: "123", role: "user", ... }
   - Sets req.user = { id: "123", userId: "123", role: "user", ... }
   - Checks role === 'user' ✓
   - Calls next()

4. MULTER MIDDLEWARE
   ↓
   - Handles multipart/form-data
   - Stores image in memory buffer
   - Sets req.file if image present
   - Calls next()

5. CONTROLLER (userController.js)
   ↓
   updateProfile() function (Lines 66-161)
   - Gets userId from req.user.userId
   - Finds user in database
   - Updates profile fields
   - Uploads image to S3 if present
   - Saves user
   - Returns updated profile

6. RESPONSE TO CLIENT
   ↓
   {
     "statusCode": 200,
     "success": true,
     "message": "Profile updated successfully",
     "data": { ...updated user profile... }
   }
```

---

## 📊 Database Models

### User Model (models/user.js)
```javascript
{
  firebaseUid: String (unique, sparse),
  number: String (required, unique),
  otp: String (deprecated),
  isProfile: Boolean (auto-calculated),
  firstname: String,
  lastname: String,
  email: String,
  dob: Date,
  gender: String (enum),
  profileImage: String (S3 URL),
  timestamps: true
}
```

### Admin Model (models/admin.js)
```javascript
{
  firebaseUid: String (unique, sparse),
  number: String (required, unique),
  role: String (default: 'admin', immutable),
  isActive: Boolean (default: true),
  lastLogin: Date,
  timestamps: true
}
```

---

## 🚨 Deprecated Routes

### User OTP Routes (DEPRECATED)
- `POST /api/users/request-otp` - Returns 410 Gone
- `POST /api/users/verify-otp` - Returns 410 Gone

**Reason:** Firebase handles OTP generation and verification on client-side. Backend only verifies the final Firebase idToken.

---

## 🔑 Environment Variables Required

```env
# JWT Secret for token signing
JWT_SECRET=your-secret-key

# MongoDB Connection
MONGO_URI=mongodb://3.109.157.169:27017/cartuno

# Firebase Admin SDK (Choose one method)

# Method 1: Full service account JSON
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Method 2: Discrete fields
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Method 3: Service account file
# Place serviceAccountKey.json in cartunoBackend/ directory
```

---

## ✅ Security Best Practices Implemented

1. ✅ **Firebase Phone Auth** - Secure OTP delivery and verification
2. ✅ **JWT Tokens** - Stateless authentication
3. ✅ **Role-based Access Control** - Separate user and admin roles
4. ✅ **Token Expiration** - 7 days for users, 24 hours for admins
5. ✅ **Admin Auto-creation Disabled** - Prevents unauthorized admin accounts
6. ✅ **Active Status Check** - Only active admins can log in
7. ✅ **Sparse Unique Indexes** - Allows null firebaseUid without conflicts
8. ✅ **Phone Validation** - Regex validation for phone numbers
9. ✅ **Bearer Token Pattern** - Standard Authorization header format
10. ✅ **Password Removal from Response** - OTP/sensitive data excluded

---

## 🐛 Current Issues

### ⚠️ Admin Password Login Not Functional
The `admin.js` model does not have:
- `password` field
- `comparePassword()` method

**Solution:** Either:
1. Remove password-based admin login (use Firebase only), OR
2. Add password hashing to admin model (bcrypt)

### 💡 Recommended Fix
Add password support to `models/admin.js`:

```javascript
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  // ... existing fields ...
  password: {
    type: String,
    required: false, // Optional if using Firebase
    minlength: 8
  }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};
```

---

## 🎯 Summary

### User Flow:
1. Client → Firebase Phone Auth → Get idToken
2. Client → `POST /api/users/firebase-login` with idToken
3. Server → Verify idToken → Create/Find user → Generate JWT
4. Client → Store JWT → Use in Authorization header
5. Client → Access protected routes with JWT

### Admin Flow:
1. Client → Firebase Phone Auth → Get idToken
2. Client → `POST /api/admin/firebase-login` with idToken
3. Server → Verify idToken → Find ACTIVE admin → Generate JWT
4. Client → Store JWT → Use in Authorization header
5. Admin must be pre-created in database (security measure)

### Token Lifetime:
- **User JWT:** 7 days
- **Admin JWT:** 24 hours

### Protected Route Access:
- All requests include: `Authorization: Bearer <jwt-token>`
- Middleware verifies token and checks role
- Controller receives authenticated `req.user` object

