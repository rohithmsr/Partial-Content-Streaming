const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const OTPSchema = new mongoose.Schema({
  userId: String,
  otp: String,
  createdAt: Date,
  expiresAt: Date,
});

OTPSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();

  // 10 => hashing cost, no of rounds!
  this.otp = await bcrypt.hash(this.otp, 10);
  next();
});

const OTP = mongoose.model('OTP', OTPSchema);

module.exports = OTP;
