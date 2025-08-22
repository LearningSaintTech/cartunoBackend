const express = require('express');
const router = express.Router();
const { adminLogin, adminFirebaseLogin } = require('../controllers/adminController');

// Admin login routes
router.post('/login', adminLogin);
router.post('/firebase-login', adminFirebaseLogin);

module.exports = router;