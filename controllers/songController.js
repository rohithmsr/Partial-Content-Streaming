const Song = require('../models/songModel');
const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');

exports.createSong = async (req, res, next) => {
  try {
    const newSong = await Song.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        song: newSong,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllSongs = async (req, res, next) => {
  try {
    // EXECUTE query
    const features = new APIFeatures(Song.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const songs = await features.query;

    res.status(200).json({
      status: 'success',
      results: songs.length,
      data: {
        songs,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new AppError('No song found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        song: song,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!song) {
      return next(new AppError('No song found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        song,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);

    if (!song) {
      return next(new AppError('No song found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
