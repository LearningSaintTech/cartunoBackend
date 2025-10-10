# 🔧 Firebase Error Fix Guide

## Error: `auth/invalid-app-credential`

This error occurs when Firebase phone authentication is not properly configured or the app credentials are invalid.

---

## 🔍 Common Causes

1. ❌ Phone authentication not enabled in Firebase Console
2. ❌ Invalid API key
3. ❌ Wrong project ID
4. ❌ App not registered in Firebase Console
5. ❌ reCAPTCHA not configured properly
6. ❌ Domain not authorized in Firebase Console

---

## ✅ Solution Steps

### Step 1: Enable Phone Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **learningsaint-971bd**
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Phone** in the list
5. Click **Enable**
6. Save changes

### Step 2: Verify Web App Registration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Check if a **Web app** exists
4. If not, click **Add app** → Web (</>) icon
5. Register app with a nickname (e.g., "Cartuno Web")
6. Copy the config values

### Step 3: Update Frontend Config (if needed)

After registering the web app, you should get a config like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBXzETYYC5EbDy_F2KhREgnjuJFbcXIwSM",
  authDomain: "learningsaint-971bd.firebaseapp.com",
  projectId: "learningsaint-971bd",
  storageBucket: "learningsaint-971bd.firebasestorage.app",
  messagingSenderId: "830620644032",
  appId: "1:830620644032:web:4a9397751a136ee826f325",
  measurementId: "G-NCQZD5XPMZ"
};
```

**Verify this matches your current config in:**
`cartunoFrontEnd/src/config/firebaseClient.js`

### Step 4: Add Authorized Domains

1. In Firebase Console → **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `cartuno.com`)

### Step 5: Configure reCAPTCHA

Phone authentication requires reCAPTCHA verification. Ensure:

1. **reCAPTCHA v2** (invisible) is enabled in Firebase
2. Your domain is whitelisted
3. For localhost testing, make sure `localhost` is in authorized domains

---

## 🧪 Testing Steps

### Test 1: Verify Firebase Initialization

Add this to your app to check Firebase is initialized correctly:

```javascript
// In your main App.jsx or index.jsx
import { auth } from './config/firebaseClient';

console.log('Firebase Auth initialized:', auth);
console.log('Firebase Project ID:', auth.app.options.projectId);
console.log('Firebase API Key:', auth.app.options.apiKey);
```

Expected output:
```
Firebase Auth initialized: Auth {app: FirebaseApp}
Firebase Project ID: learningsaint-971bd
Firebase API Key: AIzaSyBXzETYYC5EbDy_F2KhREgnjuJFbcXIwSM
```

### Test 2: Check reCAPTCHA Container

Ensure the reCAPTCHA container exists in your DOM:

```html
<!-- Should be present in your login component -->
<div id="recaptcha-container"></div>
```

### Test 3: Test Phone Auth with Console Logs

```javascript
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from './config/firebaseClient';

async function testPhoneAuth() {
  try {
    console.log('1. Creating reCAPTCHA verifier...');
    const appVerifier = new RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
      callback: (response) => {
        console.log('reCAPTCHA solved:', response);
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    }, auth);

    console.log('2. Rendering reCAPTCHA...');
    await appVerifier.render();
    console.log('reCAPTCHA rendered successfully');

    console.log('3. Sending OTP to phone...');
    const confirmationResult = await signInWithPhoneNumber(auth, '+919000000000', appVerifier);
    console.log('OTP sent successfully:', confirmationResult);

  } catch (error) {
    console.error('Phone auth test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}
```

---

## 🔧 Quick Fix Script

If the issue persists, try recreating the Firebase app registration:

### Option 1: Get New Credentials from Firebase Console

1. Delete the existing web app (if any) in Firebase Console
2. Create a new web app
3. Copy the **exact** config provided
4. Replace in `cartunoFrontEnd/src/config/firebaseClient.js`

### Option 2: Use Environment Variables

Create `cartunoFrontEnd/.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSyBXzETYYC5EbDy_F2KhREgnjuJFbcXIwSM
VITE_FIREBASE_AUTH_DOMAIN=learningsaint-971bd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=learningsaint-971bd
VITE_FIREBASE_STORAGE_BUCKET=learningsaint-971bd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=830620644032
VITE_FIREBASE_APP_ID=1:830620644032:web:4a9397751a136ee826f325
VITE_FIREBASE_MEASUREMENT_ID=G-NCQZD5XPMZ
```

Then restart your Vite dev server:
```bash
npm run dev
```

---

## 🚨 Common Mistakes

### 1. Wrong API Key
**Error:** `auth/invalid-api-key`
**Fix:** Get the correct API key from Firebase Console

### 2. Phone Auth Not Enabled
**Error:** `auth/operation-not-allowed`
**Fix:** Enable Phone authentication in Firebase Console

### 3. Invalid Phone Number Format
**Error:** `auth/invalid-phone-number`
**Fix:** Use international format: `+91XXXXXXXXXX`

### 4. Domain Not Authorized
**Error:** `auth/unauthorized-domain`
**Fix:** Add domain to authorized domains in Firebase Console

### 5. reCAPTCHA Container Missing
**Error:** Container not found
**Fix:** Ensure `<div id="recaptcha-container"></div>` exists in DOM

---

## 📋 Verification Checklist

Before testing phone auth, verify:

- [ ] Firebase project selected: **learningsaint-971bd**
- [ ] Phone authentication **enabled** in Firebase Console
- [ ] Web app **registered** in Firebase Console
- [ ] API key matches your code
- [ ] Project ID matches your code
- [ ] Domain added to **authorized domains**
- [ ] reCAPTCHA container exists in DOM
- [ ] No browser console errors related to Firebase

---

## 🔍 Debug Commands

### Check Current Firebase Config
```javascript
// In browser console
import { auth } from './config/firebaseClient';
console.log(auth.app.options);
```

### Check if Phone Auth is Available
```javascript
// In browser console
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('Auth providers:', auth.config);
```

### Force Reload Firebase
```javascript
// Clear cache and reload
localStorage.clear();
sessionStorage.clear();
window.location.reload(true);
```

---

## 🆘 Still Having Issues?

### Check Firebase Console Logs

1. Go to Firebase Console
2. Navigate to **Authentication** → **Users**
3. Check for any error messages
4. Look at **Usage** tab for quota limits

### Check Browser Console

Look for these specific errors:
- Network errors (CORS issues)
- Firebase initialization errors
- reCAPTCHA errors

### Verify Service Account (Backend)

Make sure backend can verify tokens:
```bash
cd cartunoBackend
node -e "
const admin = require('firebase-admin');
const sa = require('./serviceAccountKey.json');
console.log('Backend Firebase Project:', sa.project_id);
// Should output: learningsaint-971bd
"
```

---

## 📞 Contact Firebase Support

If none of these work:
1. Check [Firebase Status](https://status.firebase.google.com/)
2. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
3. Contact Firebase support through Console

