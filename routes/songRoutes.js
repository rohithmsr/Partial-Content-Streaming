const express = require('express');
const songController = require('./../controllers/songController');

const router = express.Router();

router
  .route('/:id')
  .get(songController.getSong)
  .patch(songController.updateSong)
  .delete(songController.deleteSong);

router
  .route('/')
  .get(songController.getAllSongs)
  .post(songController.createSong);

module.exports = router;
