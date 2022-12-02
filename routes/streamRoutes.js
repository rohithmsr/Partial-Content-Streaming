const express = require('express');
const streamController = require('./../controllers/streamController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.param('id', streamController.checkID);

router.route('/:id').get(streamController.downloadStream);

module.exports = router;
