const mongodb = require('mongodb');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const Song = require('../models/songModel');
const User = require('../models/userModel');
const AppError = require('./../utils/appError');

const validateToken = async (token, next) => {
  try {
    // 2) Validate token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists (user deleted, token still resides)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(`The user belonging to the token does not exist`, 401)
      );
    }

    if (!currentUser.verified) {
      return next(new AppError(`The user is not verified`, 401));
    }

    // 4) Check if user changes password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          `User has recently changed his/her password. Please login again!`,
          401
        )
      );
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, message: err.message };
  }
};

const getRangeHeader = (range, totalLength) => {
  if (range == null || range.length == 0) {
    return null;
  }

  const array = range.split(/bytes=([0-9]*)-([0-9]*)/);

  const start = parseInt(array[1]);
  const end = parseInt(array[2]);

  const result = {
    start: isNaN(start) ? 0 : start,
    end: isNaN(end) ? totalLength - 1 : end,
  };

  if (!isNaN(start) && isNaN(end)) {
    result.start = start;
    result.end = totalLength - 1;
  }

  if (isNaN(start) && !isNaN(end)) {
    result.start = totalLength - end;
    result.end = totalLength - 1;
  }

  return result;
};

let DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
if (process.env.NODE_ENV !== 'production') {
  DB = process.env.DATABASE_LOCAL;
}

exports.checkID = async (req, res, next) => {
  try {
    const songId = req.params.id;

    const currentSong = await Song.findById(songId);
    if (!currentSong) {
      return next(new AppError(`The song with this id does not exist`, 404));
    }

    req.song = currentSong;
    next();
  } catch (err) {
    next(err);
  }
};

const sendStreamResponse = (res, statusCode, downloadStream) => {
  res.status(statusCode);
  downloadStream.on('data', (chunk) => {
    res.write(chunk);
  });
  downloadStream.on('error', () => {
    res.sendStatus(404);
  });
  downloadStream.on('end', () => {
    res.end();
  });
};

exports.downloadStream = async (req, res, next) => {
  try {
    const tokenValidity = await validateToken(req.params.token, next);
    if (!tokenValidity.valid) {
      return next(new AppError(tokenValidity.message, 403));
    }

    const client = new mongodb.MongoClient(DB);
    const db = client.db('music-crypto-app');

    const songURL = req.song.songURL;
    const songFile = await db
      .collection('fs.files')
      .findOne({ filename: songURL });

    const bucket = new mongodb.GridFSBucket(db);

    const statSize = songFile.length;
    const rangeRequest = getRangeHeader(req.headers?.range, statSize);

    if (!rangeRequest) {
      res.set(
        'Content-Range',
        'bytes ' + 0 + '-' + statSize - 1 + '/' + statSize
      );
      res.set('Content-Length', statSize);
      res.set('Content-Type', 'audio/mpeg');
      res.set('Accept-Ranges', 'bytes');

      // console.log('Full no range');
      sendStreamResponse(
        res,
        200,
        bucket.openDownloadStream(songFile._id, { chunkSizeBytes: 1048576 })
      );
      return;
    }

    const start = rangeRequest.start;
    const end = rangeRequest.end;

    if (start == 0 && end == statSize - 1) {
      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + statSize);
      res.set('Content-Length', statSize);
      res.set('Accept-Ranges', 'bytes');

      // console.log('Full with range');
      sendStreamResponse(
        res,
        200,
        bucket.openDownloadStream(songFile._id, { chunkSizeBytes: 1048576 })
      );
      return;
    }

    if (start >= statSize || end >= statSize) {
      res.set('Content-Range', 'bytes */' + statSize);
      res.sendStatus(416);
      return;
    }

    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + statSize);
    res.set('Content-Length', start == end ? 0 : end - start + 1);
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'no-cache');

    // console.log(`Partial ${start}-${end}`);
    sendStreamResponse(
      res,
      206,
      bucket.openDownloadStream(songFile._id, {
        start: start,
        end: end,
        chunkSizeBytes: 1048576,
      })
    );
  } catch (err) {
    next(err);
  }
};
