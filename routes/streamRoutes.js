const express = require('express');
const streamController = require('./../controllers/streamController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.param('id', streamController.checkID);

router
  .route('/:id')
  .get(authController.protect, streamController.downloadStream);

router
  .route('/')
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    streamController.uploadSongStream
  );

module.exports = router;
