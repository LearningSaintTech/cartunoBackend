# 🚀 Authentication Quick Reference

## 📋 API Endpoints Summary

### 🔵 User Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/users/firebase-login` | ❌ No | Login/Register with Firebase idToken |
| `GET` | `/api/users/profile` | ✅ User | Get user profile |
| `PUT` | `/api/users/profile` | ✅ User | Update profile (+ image upload) |
| `DELETE` | `/api/users/profile-image` | ✅ User | Delete profile image |
| `GET` | `/api/users/profile-status` | ✅ User | Check profile completion |

### 🔴 Admin Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/admin/firebase-login` | ❌ No | Login with Firebase idToken (admin must exist) |
| `POST` | `/api/admin/login` | ❌ No | Login with password (⚠️ not functional) |

---

## 🔑 Request/Response Examples

### User Firebase Login

**Request:**
```bash
POST /api/users/firebase-login
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
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

---

### Admin Firebase Login

**Request:**
```bash
POST /api/admin/firebase-login
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
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

**Response (Unauthorized - Admin not found):**
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized admin"
}
```

---

### Get User Profile

**Request:**
```bash
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "68e798d82e0d913d4191d783",
    "firebaseUid": "abc123...",
    "number": "+919000000000",
    "firstname": "John",
    "lastname": "Doe",
    "email": "[email protected]",
    "dob": "1990-01-01T00:00:00.000Z",
    "gender": "male",
    "profileImage": "https://cartunoprod.s3.ap-south-1.amazonaws.com/profile-images/...",
    "isProfile": true,
    "createdAt": "2025-10-09T10:00:00.000Z",
    "updatedAt": "2025-10-09T11:13:28.762Z"
  }
}
```

---

### Update User Profile (with image)

**Request:**
```bash
PUT /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

firstname=John
lastname=Doe
email=john@example.com
dob=1990-01-01
gender=male
profileImage=<file>
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "68e798d82e0d913d4191d783",
    "number": "+919000000000",
    "firstname": "John",
    "lastname": "Doe",
    "email": "[email protected]",
    "dob": "1990-01-01T00:00:00.000Z",
    "gender": "male",
    "profileImage": "https://cartunoprod.s3.ap-south-1.amazonaws.com/profile-images/...",
    "isProfile": true,
    "updatedAt": "2025-10-09T11:30:00.000Z"
  }
}
```

---

## 🔒 Common Error Responses

### 401 Unauthorized - No Token
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 401 Unauthorized - Invalid Token
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Invalid token."
}
```

### 403 Forbidden - Wrong Role
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Access denied. Required roles: user"
}
```

### 404 Not Found - User Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "User not found"
}
```

### 401 Unauthorized - Invalid Firebase Token
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Invalid Firebase ID token"
}
```

---

## 💻 Client-Side Implementation Examples

### JavaScript/React
```javascript
// 1. Firebase Phone Auth
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

const auth = getAuth();
const appVerifier = new RecaptchaVerifier('recaptcha-container', {}, auth);

// Send OTP
const confirmationResult = await signInWithPhoneNumber(auth, '+919000000000', appVerifier);

// Verify OTP
const userCredential = await confirmationResult.confirm('123456');

// Get ID Token
const idToken = await userCredential.user.getIdToken();

// 2. Login to Backend
const response = await fetch('http://yourserver.com/api/users/firebase-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});

const data = await response.json();
const jwtToken = data.data.token;

// 3. Store JWT
localStorage.setItem('token', jwtToken);

// 4. Use JWT for protected requests
const profileResponse = await fetch('http://yourserver.com/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});
```

### React Native
```javascript
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Firebase Phone Auth
const confirmation = await auth().signInWithPhoneNumber('+919000000000');
await confirmation.confirm('123456');

// Get ID Token
const idToken = await auth().currentUser.getIdToken();

// 2. Login to Backend
const response = await fetch('http://yourserver.com/api/users/firebase-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});

const data = await response.json();
const jwtToken = data.data.token;

// 3. Store JWT
await AsyncStorage.setItem('token', jwtToken);

// 4. Use JWT for protected requests
const token = await AsyncStorage.getItem('token');
const profileResponse = await fetch('http://yourserver.com/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🛠️ Backend Implementation Checklist

### Setting Up New User
```bash
# Users are auto-created on first Firebase login
# No manual setup needed
```

### Setting Up New Admin
```javascript
// Run in Node.js or create a script
const mongoose = require('mongoose');
const Admin = require('./models/admin');

await mongoose.connect('mongodb://3.109.157.169:27017/cartuno');

const admin = new Admin({
  number: '9000000000',
  role: 'admin',
  isActive: true
});

await admin.save();
console.log('✅ Admin created:', admin._id);
```

Or use the command:
```bash
cd cartunoBackend/scripts
node -e "
const mongoose = require('mongoose');
const Admin = require('../models/admin');
mongoose.connect('mongodb://3.109.157.169:27017/cartuno').then(async () => {
  const admin = new Admin({ number: '9000000000', role: 'admin', isActive: true });
  await admin.save();
  console.log('✅ Admin created');
  process.exit(0);
});
"
```

---

## 🔍 Debugging Tips

### Check if Token is Valid
```bash
# Decode JWT (client-side - for debugging only)
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('Decoded token:', decoded);

# Check expiration
const isExpired = decoded.exp * 1000 < Date.now();
console.log('Is expired:', isExpired);
```

### Test Authentication Flow
```bash
# 1. Get Firebase idToken from client
# 2. Test backend login
curl -X POST http://localhost:5000/api/users/firebase-login \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_FIREBASE_ID_TOKEN"}'

# 3. Extract JWT from response
# 4. Test protected endpoint
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Common Issues

**Issue:** "Invalid Firebase ID token"
- **Cause:** Firebase Admin SDK not configured
- **Fix:** Check `cartunoBackend/config/firebase.js` and environment variables

**Issue:** "Unauthorized admin"
- **Cause:** Admin not created in database
- **Fix:** Create admin using script above

**Issue:** "Access denied. No token provided."
- **Cause:** Missing Authorization header
- **Fix:** Include `Authorization: Bearer <token>` in request

**Issue:** Token expires too quickly
- **User tokens:** Expire after 7 days
- **Admin tokens:** Expire after 24 hours
- **Fix:** Implement token refresh mechanism or re-login

---

## 📝 Environment Variables

```env
# Required
JWT_SECRET=your-secret-key-here
MONGO_URI=mongodb://3.109.157.169:27017/cartuno

# Firebase - Choose ONE method:

# Method 1: Full JSON (recommended for production)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# Method 2: Separate fields (recommended for development)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Method 3: Service account file (fallback)
# Place serviceAccountKey.json in cartunoBackend/
```

---

## 🎯 Key Takeaways

1. **User Flow:** Firebase auth → Get idToken → POST to `/api/users/firebase-login` → Get JWT → Use JWT for all requests
2. **Admin Flow:** Same as user, but admin must be pre-created in database
3. **JWT Lifetime:** Users (7 days), Admins (24 hours)
4. **Protected Routes:** Include `Authorization: Bearer <jwt>` header
5. **Role Checking:** Middleware automatically validates role
6. **Auto-Creation:** Users are auto-created, admins are NOT
7. **Current Demo Admin:** 9000000000

---

## 📱 Testing Credentials

### Demo Admin
- **Phone:** 9000000000
- **Firebase Auth:** Required (no password)
- **Database:** ✅ Created
- **Status:** Active

### Demo User
- **Any phone number** can register via Firebase
- **Auto-created** on first login
- No pre-registration needed

