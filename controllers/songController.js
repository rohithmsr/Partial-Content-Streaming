const multer = require('multer');

const Song = require('../models/songModel');
const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'assets/img/users');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError(`Not an image! Please upload only images`, 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadSongImage = upload.single('songImageURL');

const songMulterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'assets/music');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `song-${req.params.id}-${Date.now()}.${ext}`);
  },
});

const songMulterFilter = (req, file, cb) => {
  console.log(file.mimetype);
  if (file.mimetype.startsWith('audio')) {
    cb(null, true);
  } else {
    cb(new AppError(`Not an audio file! Please upload only audio`, 400), false);
  }
};

const songUpload = multer({
  storage: songMulterStorage,
  fileFilter: songMulterFilter,
});

exports.uploadSongImage = upload.single('songImageURL');

exports.uploadSongURL = songUpload.single('songURL');

exports.createSong = async (req, res, next) => {
  try {
    if (req.file) req.body.songImageURL = req.file.filename;

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

exports.addSongFile = async (req, res, next) => {
  try {
    if (req.file) req.body.songURL = req.file.filename;

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
    if (req.file) req.body.songImageURL = req.file.filename;

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
        updatedSong,
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
