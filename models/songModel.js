const mongoose = require('mongoose');
const validator = require('validator');

const songSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'A song must have a name'] },
    artist: {
      type: [String],
      required: [true, 'A song must have atleast one artist'],
    },
    album: {
      type: String,
      required: [true, 'A song must have its album'],
    },
    songURL: {
      type: String,
      default: 'https://google.com/',
      validate: [validator.isURL, 'A song must have a valid url'],
    },
    songImageURL: {
      type: String,
      validate: [validator.isURL, 'An image must have a valid url'],
    },
    songWebImageURL: {
      type: String,
      validate: [validator.isURL, 'An image must have a valid url'],
    },
    duration: {
      type: Number,
      max: [43200, 'Duration must be less than or equal to 43200 (12 hours)'],
      min: [1, 'Duration must be greater than or equal to 1 (1 second)'],
      required: [true, 'A song must have a duration'],
    },
    createdAt: { type: Date, default: Date.now(), select: false },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

songSchema.virtual('hours').get(function () {
  return parseInt(this.duration / 3600);
});

songSchema.virtual('minutes').get(function () {
  return parseInt((this.duration % 3600) / 60);
});

songSchema.virtual('seconds').get(function () {
  return parseInt((this.duration % 3600) % 60);
});

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
