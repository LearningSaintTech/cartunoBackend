# 🔥 Get Web App Firebase Configuration

## 🚨 **The Issue:**

You provided the **Android app configuration** (`google-services.json`), but your frontend is a **Web app** that needs **Web app credentials**.

The API Key in your current config (`AIzaSyBXzETYYC5EbDy_F2KhREgnjuJFbcXIwSM`) is causing the `auth/invalid-app-credential` error because it might not have the correct restrictions or Phone Authentication enabled.

---

## ✅ **Get the Correct Web App Configuration:**

### **Step 1: Go to Firebase Console**
1. Open: https://console.firebase.google.com/
2. Select project: **learningsaint-971bd**

### **Step 2: Go to Project Settings**
1. Click the **⚙️ Gear icon** (top left)
2. Click **Project settings**

### **Step 3: Find Web App**
1. Scroll down to **"Your apps"** section
2. Look for the **Web app** (🌐 icon)
3. If you see a web app, click on it

### **Step 4: Get the Config**
Look for a section that shows:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "learningsaint-971bd.firebaseapp.com",
  projectId: "learningsaint-971bd",
  storageBucket: "learningsaint-971bd.firebasestorage.app",
  messagingSenderId: "830620644032",
  appId: "1:830620644032:web:...",
  measurementId: "G-..."
};
```

### **Step 5: Copy the Config**
Copy the entire `firebaseConfig` object and send it to me.

---

## 🆕 **If No Web App Exists:**

If you don't see a Web app in "Your apps" section:

### **Create a New Web App:**
1. Click **"Add app"** button
2. Select **Web** (🌐 icon)
3. Enter app nickname: **"Cartuno Web"**
4. ✅ Check **"Also set up Firebase Hosting"** (optional)
5. Click **"Register app"**
6. Copy the `firebaseConfig` shown
7. Click **"Continue to console"**

---

## 📸 **What to Look For:**

In the Firebase Console, you should see something like this:

```
Your apps
├── 📱 Android app: com.learningsaint
└── 🌐 Web app: Cartuno Web (or similar)
```

If you only see the Android app, you need to **add a Web app**.

---

## 🎯 **What I Need:**

Please send me the **Web app configuration** that looks like this:

```javascript
{
  "apiKey": "AIzaSy...",
  "authDomain": "learningsaint-971bd.firebaseapp.com",
  "projectId": "learningsaint-971bd",
  "storageBucket": "learningsaint-971bd.firebasestorage.app",
  "messagingSenderId": "830620644032",
  "appId": "1:830620644032:web:...",
  "measurementId": "G-..."
}
```

---

## 🔍 **Why This Matters:**

- **Android API Key**: `AIzaSyBJn8hIkaO-MCKB_HJFyz1mNi3IwMUdiAg` (from the JSON you sent)
- **Current Web API Key**: `AIzaSyBXzETYYC5EbDy_F2KhREgnjuJFbcXIwSM` (in your .env)

These are **different API keys** for different platforms. We need the **correct Web API key** that has Phone Authentication enabled.

---

## ⚡ **Quick Test:**

The current config shows:
- **App ID**: `1:830620644032:web:4a9397751a136ee826f325`

This suggests a Web app already exists. Just need to verify the API key in Firebase Console.

**Please go to Firebase Console → Project Settings → Your apps → Web app → Config and send me the configuration!** 🚀

