const express = require('express');
const songController = require('./../controllers/songController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/:id')
  .get(songController.getSong)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    songController.updateSong
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    songController.deleteSong
  );

router
  .route('/')
  .get(songController.getAllSongs)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    songController.createSong
  );

module.exports = router;
