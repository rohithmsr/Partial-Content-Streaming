const express = require('express');

const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/:token', authController.checkValidToken);

module.exports = router;
