# 🔧 SMS Provider Troubleshooting Guide

## 🚨 Still Getting `auth/invalid-app-credential` Error

Even though Cloud Identity Platform is enabled, the error persists. Let's troubleshoot systematically.

---

## 🔍 **Step 1: Verify SMS Provider Configuration**

### Check Cloud Identity Platform Settings:

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/identity-platform/providers?project=learningsaint-971bd

2. **Click on the Phone provider** (pencil icon to edit)

3. **Look for these settings:**
   - **SMS delivery method**: Should be configured
   - **Test phone numbers**: Should be empty (for real numbers)
   - **Quota settings**: Should have limits set

### Expected Phone Provider Settings:
```
✅ Provider: Phone
✅ Enabled: Yes
✅ SMS delivery: Cloud Identity Platform
✅ Quota: 10 per number per day (default)
✅ Test numbers: None (for real SMS)
```

---

## 🔍 **Step 2: Check Firebase Console Settings**

### Verify Firebase Authentication:

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/learningsaint-971bd/authentication/providers

2. **Click on Phone provider**

3. **Check these settings:**
   - **Phone numbers for testing**: Should be separate from real numbers
   - **Authorized domains**: Should include `localhost`
   - **SMS configuration**: Should show Cloud Identity Platform

---

## 🔍 **Step 3: Check Billing and Quotas**

### Verify Billing Status:

1. **Google Cloud Console** → **Billing**
2. **Check if billing account is linked**
3. **Verify payment method is active**

### Check SMS Quotas:

1. **Identity Platform** → **Settings**
2. **Look for SMS quota settings**
3. **Default should be**: 10 SMS per number per day

---

## 🔍 **Step 4: Test with Different Approaches**

### Option 1: Wait and Retry
```
1. Wait 5-10 minutes for configuration to propagate
2. Hard refresh browser (Ctrl + Shift + R)
3. Clear browser cache
4. Try again
```

### Option 2: Test with Different Number
```
1. Try a different phone number
2. Try a different carrier (Jio, Airtel, Vi)
3. Try from a different device/network
```

### Option 3: Check Network Issues
```
1. Try from mobile data instead of WiFi
2. Try from different network
3. Check if SMS is being blocked by carrier
```

---

## 🔍 **Step 5: Advanced Configuration**

### Enable Additional SMS Settings:

1. **Google Cloud Console** → **Identity Platform** → **Settings**
2. **Look for "SMS delivery" section**
3. **Enable these if available:**
   - SMS delivery via Cloud Identity Platform
   - International SMS delivery
   - SMS delivery for India (+91)

### Check API Enablement:

1. **Google Cloud Console** → **APIs & Services** → **Enabled APIs**
2. **Verify these APIs are enabled:**
   - Identity Platform API
   - Cloud Identity Platform API
   - Firebase Authentication API

---

## 🔍 **Step 6: Debug with Network Tab**

### Check Network Requests:

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Try sending OTP**
4. **Look for the request to:**
   ```
   https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode
   ```

### Check Response Details:
```
Status: 400 (Bad Request)
Response body: Should show specific error details
```

---

## 🔍 **Step 7: Alternative Solutions**

### Solution 1: Recreate Phone Provider
```
1. Disable Phone provider in Firebase Console
2. Wait 2 minutes
3. Re-enable Phone provider
4. Configure SMS settings again
5. Test
```

### Solution 2: Use Test Numbers Temporarily
```
1. Add your real number as a test number in Firebase Console
2. Set OTP: 123456
3. Use this for testing while fixing SMS provider
```

### Solution 3: Check Regional Settings
```
1. Verify project region is set correctly
2. Check if India (+91) is supported
3. Enable international SMS if needed
```

---

## 🔍 **Step 8: Check Error Details**

### Get More Specific Error:

Add this to your frontend code to get detailed error:

```javascript
// In your AuthSlice.js catch block
catch (error) {
  console.error('Detailed error response:', error);
  
  // Check if it's a network error
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', error.response.data);
  }
  
  // Check if it's a Firebase error
  if (error.code) {
    console.error('Firebase error code:', error.code);
    console.error('Firebase error message:', error.message);
  }
}
```

---

## 🔍 **Step 9: Verify Project Configuration**

### Check Project Settings:

1. **Firebase Console** → **Project Settings** → **General**
2. **Verify:**
   - Project ID: `learningsaint-971bd`
   - Region: Should be appropriate for India
   - Billing: Blaze plan active

### Check Service Account:

1. **Google Cloud Console** → **IAM & Admin** → **Service Accounts**
2. **Look for:**
   - `firebase-adminsdk-fbsvc@learningsaint-971bd.iam.gserviceaccount.com`
   - Should have necessary permissions

---

## 🔍 **Step 10: Contact Support**

### If All Else Fails:

1. **Firebase Support:**
   - Go to Firebase Console → Help & Support
   - Report the issue with error details

2. **Google Cloud Support:**
   - Go to Google Cloud Console → Support
   - Create a support case

3. **Community Forums:**
   - Stack Overflow: `firebase phone authentication invalid-app-credential`
   - Firebase GitHub issues

---

## 🎯 **Most Likely Issues:**

### Issue 1: Configuration Propagation
```
Problem: Settings take time to propagate
Solution: Wait 10-15 minutes and retry
```

### Issue 2: Regional SMS Support
```
Problem: India SMS not enabled
Solution: Enable international SMS in settings
```

### Issue 3: API Permissions
```
Problem: Identity Platform API not fully enabled
Solution: Check API enablement in Google Cloud Console
```

### Issue 4: Billing Issues
```
Problem: Billing account not properly linked
Solution: Verify billing account and payment method
```

---

## 🧪 **Quick Test Checklist:**

- [ ] Wait 10 minutes after enabling Cloud Identity Platform
- [ ] Hard refresh browser (Ctrl + Shift + R)
- [ ] Try different phone number
- [ ] Check Network tab for detailed error response
- [ ] Verify billing account is active
- [ ] Check if India (+91) SMS is supported
- [ ] Try from different network/device

---

## 📞 **Next Steps:**

1. **Try the quick test checklist above**
2. **Check Network tab for detailed error response**
3. **Share the detailed error response** if still failing
4. **Consider using test numbers temporarily** while fixing SMS provider

**The issue is likely in the SMS provider configuration or regional settings!** 🔧
