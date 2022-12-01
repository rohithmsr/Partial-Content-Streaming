const express = require('express');

const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/:token', authController.protect, authController.checkValidToken);

module.exports = router;
