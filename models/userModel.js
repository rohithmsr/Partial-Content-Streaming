const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: 'String',
      required: [true, 'Please tell us your name!'],
    },
    email: {
      type: 'String',
      required: [true, 'Please tell us your email address'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photoURL: {
      type: 'String',
      validate: [validator.isURL, 'Please provide a valid profile image URL'],
    },
    password: {
      type: 'String',
      required: [true, 'Please provide a password'],
      min: [8, 'Password size must be greater than or equal to 8 characters'],
    },
    passwordConfirm: {
      type: 'String',
      required: [true, 'Please confirm your password'],
      validate: {
        // This works only on .create() & .save()
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords do not match',
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // 12 => hashing cost, no of rounds!
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
