# 🔐 Authentication Flow Visual Diagrams

## 📱 USER Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER AUTHENTICATION FLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: FIREBASE PHONE AUTH (CLIENT-SIDE)
┌──────────────┐
│   Client     │
│ (React/RN)   │
└──────┬───────┘
       │
       │ 1. User enters phone number
       │ 2. Firebase.auth().signInWithPhoneNumber()
       ▼
┌──────────────┐
│   Firebase   │
│    Server    │
└──────┬───────┘
       │
       │ 3. Sends OTP to phone
       │ 4. User enters OTP
       │ 5. Firebase verifies OTP
       │ 6. Returns idToken
       ▼
┌──────────────┐
│   Client     │
│   (Stores    │
│   idToken)   │
└──────┬───────┘

═══════════════════════════════════════════════════════════════════════════

STEP 2: BACKEND JWT GENERATION
       │
       │ POST /api/users/firebase-login
       │ Body: { idToken: "..." }
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  userRoutes.js (Line 34)                                                 │
│  router.post('/firebase-login', loginWithFirebase)                       │
└──────────────────────┬───────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  userController.js::loginWithFirebase() (Lines 272-325)                  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ 1. firebaseAdmin.auth().verifyIdToken(idToken)                 │     │
│  │    ↓                                                            │     │
│  │ 2. Extract: firebaseUid, phone_number                          │     │
│  │    ↓                                                            │     │
│  │ 3. Search database:                                            │     │
│  │    - User.findOne({ firebaseUid })                             │     │
│  │    - OR User.findOne({ number: phone })                        │     │
│  │    ↓                                                            │     │
│  │ 4. If NOT found → Create new user:                             │     │
│  │    new User({                                                   │     │
│  │      firebaseUid,                                              │     │
│  │      number: phone || `uid:${firebaseUid}`,                    │     │
│  │      isProfile: false                                          │     │
│  │    })                                                           │     │
│  │    ↓                                                            │     │
│  │ 5. If found but no firebaseUid → Link it:                      │     │
│  │    user.firebaseUid = firebaseUid                              │     │
│  │    ↓                                                            │     │
│  │ 6. user.save()                                                  │     │
│  │    ↓                                                            │     │
│  │ 7. Generate JWT:                                               │     │
│  │    jwt.sign({                                                   │     │
│  │      userId: user._id,                                         │     │
│  │      number: user.number,                                      │     │
│  │      role: 'user',                                             │     │
│  │      isProfile: user.isProfile                                 │     │
│  │    }, JWT_SECRET, { expiresIn: '7d' })                         │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                           │
└──────────────────────┬───────────────────────────────────────────────────┘
                       │
                       ▼
                 ┌─────────────┐
                 │  Response   │
                 ├─────────────┤
                 │ userId      │
                 │ number      │
                 │ isProfile   │
                 │ token ◄──── JWT (7 days)
                 └─────┬───────┘
                       │
                       ▼
                 ┌─────────────┐
                 │   Client    │
                 │  Stores JWT │
                 └─────────────┘

═══════════════════════════════════════════════════════════════════════════

STEP 3: ACCESSING PROTECTED ROUTES

┌─────────────┐
│   Client    │
└─────┬───────┘
      │
      │ PUT /api/users/profile
      │ Headers: Authorization: Bearer <jwt-token>
      │ Body: { firstname: "John", lastname: "Doe" }
      ▼
┌────────────────────────────────────────────────────────────────────────┐
│  userRoutes.js (Line 38)                                               │
│  router.put('/profile', verifyAuth(['user']), upload.single(...),     │
│             updateProfile)                                             │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE 1: verifyAuth(['user']) - middleware/auth.js               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ 1. Extract token from Authorization header                   │     │
│  │    token = req.header('Authorization')?.replace('Bearer ','')│     │
│  │    ↓                                                          │     │
│  │ 2. Verify JWT signature:                                     │     │
│  │    decoded = jwt.verify(token, JWT_SECRET)                   │     │
│  │    ↓                                                          │     │
│  │ 3. Normalize req.user:                                       │     │
│  │    req.user = {                                              │     │
│  │      id: decoded.userId,                                     │     │
│  │      userId: decoded.userId,                                 │     │
│  │      role: decoded.role,  // 'user'                          │     │
│  │      number: decoded.number,                                 │     │
│  │      isProfile: decoded.isProfile                            │     │
│  │    }                                                          │     │
│  │    ↓                                                          │     │
│  │ 4. Check role:                                               │     │
│  │    if (req.user.role !== 'user') return 403                  │     │
│  │    ↓                                                          │     │
│  │ 5. next() ✓                                                  │     │
│  └──────────────────────────────────────────────────────────────┘     │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE 2: multer - upload.single('profileImage')                  │
│  - Handles multipart/form-data                                         │
│  - Stores image in memory buffer                                       │
│  - Sets req.file if image present                                      │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  CONTROLLER: userController.js::updateProfile() (Lines 66-161)         │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ 1. Get userId from req.user.userId                           │     │
│  │    ↓                                                          │     │
│  │ 2. const user = await User.findById(userId)                  │     │
│  │    ↓                                                          │     │
│  │ 3. Update profile fields:                                    │     │
│  │    if (firstname) user.firstname = firstname                 │     │
│  │    if (lastname) user.lastname = lastname                    │     │
│  │    if (email) user.email = email                             │     │
│  │    if (dob) user.dob = dob                                   │     │
│  │    if (gender) user.gender = gender                          │     │
│  │    ↓                                                          │     │
│  │ 4. If req.file (image):                                      │     │
│  │    - uploadImageToS3(req.file, 'profile-images')             │     │
│  │    - deleteFromS3(user.profileImage) // old image            │     │
│  │    - user.profileImage = newS3URL                            │     │
│  │    ↓                                                          │     │
│  │ 5. await user.save()                                         │     │
│  │    ↓                                                          │     │
│  │ 6. Return updated user (without OTP)                         │     │
│  └──────────────────────────────────────────────────────────────┘     │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────┐
│  Response   │
├─────────────┤
│ statusCode  │
│ success     │
│ message     │
│ data: {     │
│   user {...}│
│ }           │
└─────────────┘
```

---

## 👨‍💼 ADMIN Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN AUTHENTICATION FLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

FIREBASE ADMIN LOGIN (RECOMMENDED)

STEP 1: FIREBASE PHONE AUTH (Same as User)
┌──────────────┐
│   Client     │
│ (Admin App)  │
└──────┬───────┘
       │
       │ 1. Firebase phone auth
       │ 2. Get idToken
       ▼
┌──────────────┐
│   Client     │
│   (Stores    │
│   idToken)   │
└──────┬───────┘

═══════════════════════════════════════════════════════════════════════════

STEP 2: BACKEND JWT GENERATION
       │
       │ POST /api/admin/firebase-login
       │ Body: { idToken: "..." }
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  adminRoutes.js (Line 7)                                                 │
│  router.post('/firebase-login', adminFirebaseLogin)                      │
└──────────────────────┬───────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  adminController.js::adminFirebaseLogin() (Lines 96-169)                 │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ 1. firebaseAdmin.auth().verifyIdToken(idToken)                 │     │
│  │    ↓                                                            │     │
│  │ 2. Extract: firebaseUid, phone_number                          │     │
│  │    ↓                                                            │     │
│  │ 3. Search database:                                            │     │
│  │    - Admin.findOne({ firebaseUid, isActive: true })            │     │
│  │    - OR Admin.findOne({ number: phone, isActive: true })       │     │
│  │    ↓                                                            │     │
│  │ 4. If NOT found → Return 401 Unauthorized ⚠️                   │     │
│  │    (DOES NOT auto-create admins - security measure)            │     │
│  │    ↓                                                            │     │
│  │ 5. If found but no firebaseUid → Link it:                      │     │
│  │    admin.firebaseUid = firebaseUid                             │     │
│  │    ↓                                                            │     │
│  │ 6. admin.updateLastLogin()                                      │     │
│  │    ↓                                                            │     │
│  │ 7. Generate JWT:                                               │     │
│  │    jwt.sign({                                                   │     │
│  │      adminId: admin._id,                                       │     │
│  │      number: admin.number,                                     │     │
│  │      role: 'admin'                                             │     │
│  │    }, JWT_SECRET, { expiresIn: '24h' })                        │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                           │
└──────────────────────┬───────────────────────────────────────────────────┘
                       │
                       ▼
                 ┌─────────────┐
                 │  Response   │
                 ├─────────────┤
                 │ adminId     │
                 │ number      │
                 │ role        │
                 │ token ◄──── JWT (24 hours)
                 └─────┬───────┘
                       │
                       ▼
                 ┌─────────────┐
                 │   Client    │
                 │  Stores JWT │
                 └─────────────┘

═══════════════════════════════════════════════════════════════════════════

IMPORTANT: ADMIN MUST BE PRE-CREATED

┌────────────────────────────────────────────────────────────────────────┐
│  To create admin in database:                                          │
│                                                                         │
│  const admin = new Admin({                                             │
│    number: '9000000000',                                               │
│    role: 'admin',                                                      │
│    isActive: true                                                      │
│  });                                                                   │
│  await admin.save();                                                   │
│                                                                         │
│  ✅ Demo admin created: 9000000000                                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Middleware Chain Example

```
┌────────────────────────────────────────────────────────────────────────┐
│                    REQUEST LIFECYCLE WITH MIDDLEWARE                    │
└────────────────────────────────────────────────────────────────────────┘

CLIENT REQUEST
     │
     │ PUT /api/users/profile
     │ Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     │ Content-Type: multipart/form-data
     │ Body: { firstname: "John", lastname: "Doe", profileImage: <file> }
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  EXPRESS SERVER                                                         │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  ROUTE MATCHING: userRoutes.js                                         │
│                                                                         │
│  router.put(                                                           │
│    '/profile',                       // ✓ Matches                      │
│    verifyAuth(['user']),             // Middleware 1                   │
│    upload.single('profileImage'),    // Middleware 2                   │
│    updateProfile                     // Controller                     │
│  );                                                                    │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE 1: verifyAuth(['user'])                                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Authorization: Bearer eyJ... ────► Extract token             │      │
│  │                                                               │      │
│  │ jwt.verify(token, JWT_SECRET) ──► Decode:                    │      │
│  │   {                                                           │      │
│  │     userId: "68e798d82e0d913d4191d783",                      │      │
│  │     number: "+919000000000",                                 │      │
│  │     role: "user",                                            │      │
│  │     isProfile: false,                                        │      │
│  │     iat: 1696856008,                                         │      │
│  │     exp: 1697460808                                          │      │
│  │   }                                                           │      │
│  │                                                               │      │
│  │ req.user = {                                                  │      │
│  │   id: "68e798d82e0d913d4191d783",                            │      │
│  │   userId: "68e798d82e0d913d4191d783",                        │      │
│  │   role: "user",                                              │      │
│  │   number: "+919000000000",                                   │      │
│  │   isProfile: false                                           │      │
│  │ }                                                             │      │
│  │                                                               │      │
│  │ Check: req.user.role in ['user'] ──► ✓ PASS                  │      │
│  │                                                               │      │
│  │ next() ──────────────────────────────────────────────────►   │      │
│  └─────────────────────────────────────────────────────────────┘      │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE 2: multer.single('profileImage')                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Parse multipart/form-data                                    │      │
│  │                                                               │      │
│  │ req.body = {                                                  │      │
│  │   firstname: "John",                                         │      │
│  │   lastname: "Doe"                                            │      │
│  │ }                                                             │      │
│  │                                                               │      │
│  │ req.file = {                                                  │      │
│  │   fieldname: 'profileImage',                                 │      │
│  │   originalname: 'photo.jpg',                                 │      │
│  │   mimetype: 'image/jpeg',                                    │      │
│  │   buffer: <Buffer ff d8 ff e0 ...>,                          │      │
│  │   size: 245832                                               │      │
│  │ }                                                             │      │
│  │                                                               │      │
│  │ next() ──────────────────────────────────────────────────►   │      │
│  └─────────────────────────────────────────────────────────────┘      │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  CONTROLLER: updateProfile()                                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ const userId = req.user.userId // "68e798d82e0d913d4191d783" │      │
│  │ const { firstname, lastname } = req.body                     │      │
│  │ const profileImage = req.file                                │      │
│  │                                                               │      │
│  │ const user = await User.findById(userId)                     │      │
│  │                                                               │      │
│  │ user.firstname = "John"                                      │      │
│  │ user.lastname = "Doe"                                        │      │
│  │                                                               │      │
│  │ if (profileImage) {                                          │      │
│  │   const s3Url = await uploadImageToS3(profileImage, ...)     │      │
│  │   await deleteFromS3(user.profileImage) // old               │      │
│  │   user.profileImage = s3Url                                  │      │
│  │ }                                                             │      │
│  │                                                               │      │
│  │ await user.save()                                            │      │
│  │                                                               │      │
│  │ res.status(200).json({                                       │      │
│  │   statusCode: 200,                                           │      │
│  │   success: true,                                             │      │
│  │   message: "Profile updated successfully",                   │      │
│  │   data: user                                                 │      │
│  │ })                                                            │      │
│  └─────────────────────────────────────────────────────────────┘      │
└────┬───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  RESPONSE TO CLIENT                                                     │
│                                                                         │
│  {                                                                      │
│    "statusCode": 200,                                                  │
│    "success": true,                                                    │
│    "message": "Profile updated successfully",                          │
│    "data": {                                                           │
│      "_id": "68e798d82e0d913d4191d783",                                │
│      "firebaseUid": "abc123...",                                       │
│      "number": "+919000000000",                                        │
│      "firstname": "John",                                              │
│      "lastname": "Doe",                                                │
│      "email": "[email protected]",                                          │
│      "isProfile": true,                                                │
│      "profileImage": "https://cartunoprod.s3...photo.jpg",             │
│      "createdAt": "2025-10-09T10:00:00.000Z",                          │
│      "updatedAt": "2025-10-09T11:13:28.762Z"                           │
│    }                                                                   │
│  }                                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 JWT Token Lifecycle

```
┌────────────────────────────────────────────────────────────────────────┐
│                           JWT TOKEN LIFECYCLE                           │
└────────────────────────────────────────────────────────────────────────┘

USER TOKEN
═══════════

CREATION (7 days validity)
┌─────────────────────────────────────────────────────────────────────┐
│  jwt.sign({                                                          │
│    userId: "68e798d82e0d913d4191d783",                              │
│    number: "+919000000000",                                         │
│    role: "user",                                                    │
│    isProfile: false                                                 │
│  }, "your-secret-key", { expiresIn: "7d" })                         │
│                                                                      │
│  ↓                                                                   │
│                                                                      │
│  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.                              │
│  eyJ1c2VySWQiOiI2OGU3OThkODJlMGQ5MTNkNDE5MWQ3ODMiLCJudW1iZ         │
│  XIiOiIrOTE5MDAwMDAwMDAwIiwicm9sZSI6InVzZXIiLCJpc1Byb2ZpbGU       │
│  iOmZhbHNlLCJpYXQiOjE2OTY4NTYwMDgsImV4cCI6MTY5NzQ2MDgwOH0.        │
│  SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c                        │
│                                                                      │
│  PARTS:                                                              │
│  [Header].[Payload].[Signature]                                     │
└─────────────────────────────────────────────────────────────────────┘

STORAGE (Client)
┌─────────────────────────────────────────────────────────────────────┐
│  localStorage.setItem('token', token)                                │
│  // or                                                               │
│  AsyncStorage.setItem('token', token) // React Native               │
└─────────────────────────────────────────────────────────────────────┘

USAGE (Every API Request)
┌─────────────────────────────────────────────────────────────────────┐
│  fetch('/api/users/profile', {                                       │
│    headers: {                                                        │
│      'Authorization': `Bearer ${token}`                              │
│    }                                                                 │
│  })                                                                  │
└─────────────────────────────────────────────────────────────────────┘

VERIFICATION (Server)
┌─────────────────────────────────────────────────────────────────────┐
│  const decoded = jwt.verify(token, "your-secret-key")                │
│                                                                      │
│  // If expired or invalid → throws error → 401 response             │
│  // If valid → returns decoded payload                              │
└─────────────────────────────────────────────────────────────────────┘

ADMIN TOKEN
═══════════

CREATION (24 hours validity)
┌─────────────────────────────────────────────────────────────────────┐
│  jwt.sign({                                                          │
│    adminId: "68e798d82e0d913d4191d783",                             │
│    number: "9000000000",                                            │
│    role: "admin"                                                    │
│  }, "your-secret-key", { expiresIn: "24h" })                        │
│                                                                      │
│  Same format but shorter expiration ⏱️                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Error Handling Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ERROR SCENARIOS                                │
└────────────────────────────────────────────────────────────────────────┘

1. NO TOKEN PROVIDED
   Request: GET /api/users/profile (no Authorization header)
   ↓
   verifyAuth middleware
   ↓
   Response: 401 { "success": false, "message": "Access denied. No token provided." }

2. INVALID TOKEN (malformed)
   Request: Authorization: Bearer invalid_token_string
   ↓
   jwt.verify() throws error
   ↓
   Response: 401 { "success": false, "message": "Invalid token." }

3. EXPIRED TOKEN
   Request: Authorization: Bearer <expired-token>
   ↓
   jwt.verify() throws TokenExpiredError
   ↓
   Response: 401 { "success": false, "message": "Invalid token." }

4. WRONG ROLE
   Request: User token accessing admin-only route
   ↓
   verifyAuth(['admin']) checks req.user.role
   ↓
   Response: 403 { "success": false, "message": "Access denied. Required roles: admin" }

5. FIREBASE TOKEN VERIFICATION FAILS
   Request: POST /api/users/firebase-login { idToken: "invalid" }
   ↓
   firebaseAdmin.auth().verifyIdToken() throws error
   ↓
   Response: 401 { "success": false, "message": "Invalid Firebase ID token" }

6. ADMIN NOT PRE-CREATED
   Request: POST /api/admin/firebase-login (valid Firebase token but no admin in DB)
   ↓
   Admin.findOne() returns null
   ↓
   Response: 401 { "success": false, "message": "Unauthorized admin" }

7. INACTIVE ADMIN
   Request: Admin login with isActive: false
   ↓
   Admin found but isActive check fails
   ↓
   Response: 401 { "success": false, "message": "Account is deactivated" }
```

---

## ✅ Summary Checklist

```
USER AUTHENTICATION:
☑ Client performs Firebase phone auth
☑ Client receives Firebase idToken
☑ Client sends idToken to POST /api/users/firebase-login
☑ Backend verifies idToken with Firebase Admin SDK
☑ Backend creates user if not exists (auto-registration)
☑ Backend generates JWT with 7-day expiration
☑ Client stores JWT
☑ Client includes JWT in all protected requests
☑ Middleware verifies JWT and checks role
☑ Controller accesses user via req.user

ADMIN AUTHENTICATION:
☑ Client performs Firebase phone auth
☑ Client receives Firebase idToken
☑ Client sends idToken to POST /api/admin/firebase-login
☑ Backend verifies idToken with Firebase Admin SDK
☑ Backend finds existing admin (does NOT auto-create)
☑ Backend checks admin.isActive === true
☑ Backend generates JWT with 24-hour expiration
☑ Client stores JWT
☑ Admin must be pre-created in database

SECURITY:
☑ JWT tokens are signed with secret key
☑ Tokens include expiration time
☑ Middleware validates token on every request
☑ Role-based access control enforced
☑ Admin accounts cannot be auto-created
☑ Inactive admins cannot login
☑ Sensitive data (OTP, password) excluded from responses
☑ Firebase handles OTP delivery securely
```

