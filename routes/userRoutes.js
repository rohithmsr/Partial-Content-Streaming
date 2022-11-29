const express = require('express');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.get(
  '/',
  authController.protect,
  authController.restrictTo('admin'),
  userController.getAllUsers
);

router.patch(
  '/updateMe',
  authController.protect,
  userController.uploadUserPhoto,
  userController.updateMe
);

router.post('/verifyOTP', authController.validateOTP);
router.post('/resendOTP', authController.resendOTP);

module.exports = router;
