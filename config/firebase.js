const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let initialized = false;

function initializeFirebase() {
  if (initialized) return admin;

  try {
    // Prefer explicit service account JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      return admin;
    }

    // Or discrete env vars (common in CI/secrets managers)
    const {
      FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY,
    } = process.env;

    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      // Support escaped newlines in private key
      // Normalize Windows double-quoted env with literal \n or real newlines
      let privateKey = FIREBASE_PRIVATE_KEY;
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      initialized = true;
      return admin;
    }

    // Try loading from local service account file as a fallback
    const saPath = path.resolve(__dirname, '../serviceAccountKey.json');
    if (fs.existsSync(saPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      return admin;
    }

    // No explicit credentials found
    throw new Error(
      'Firebase Admin credentials not configured. Provide cartunoBackend/.env (FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY) or place serviceAccountKey.json in cartunoBackend/'
    );
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

module.exports = initializeFirebase();


