const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('./../models/userModel');
const OTP = require('./../models/OTPModel');
const AppError = require('./../utils/appError');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Nodemailer stuff
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  // port: 465,
  auth: {
    user: process.env.SEND_GRID_USERNAME,
    pass: process.env.SEND_GRID_API_KEY,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.log('NODEMAILER ERROR = ', err);
  } else {
    console.log('Ready for messages!');
  }
});

const sendOTPVerificationEmail = async ({ id, email }, res, next) => {
  try {
    const otp = `${Math.floor(10000 + Math.random() * 90000)}`;

    // mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: 'Crypto Music - Verify your email',
      html: `<p>Enter the OTP <b> ${otp} </b> in the app to verify your email address and complete the verification process! <br/> This code <b>expires in 1 hour</b> </p>`,
    };

    const newOTPVerification = await OTP.create({
      userId: id,
      otp: otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      status: 'pending',
      data: {
        userId: newOTPVerification.userId,
        email: email,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.validateOTP = async (req, res, next) => {
  try {
    // 3) Send token to the client!
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return next(new AppError(`Enter a valid userId and the otp`, 400));
    }

    const OTPrecords = await OTP.find({ userId: userId });

    if (OTPrecords.length <= 0) {
      return next(
        new AppError(
          `Account does not exist or has been verified already!`,
          400
        )
      );
    }

    const { expiresAt } = OTPrecords[0];
    const hashedOTP = OTPrecords[0].otp;

    if (expiresAt < Date.now()) {
      return next(new AppError('Code has expired. Please request again!'));
    }

    const validOTP = await bcrypt.compare(otp, hashedOTP);

    if (!validOTP) {
      return next(new AppError('Invalid code passed. Check your inbox!'));
    }

    const newUser = await User.findByIdAndUpdate(userId, { verified: true });
    newUser.password = undefined;
    newUser.verified = true;

    await OTP.deleteMany({ userId });

    const token = signToken(userId);
    const cookieOptions = {
      maxAge: process.env.JWT_EXPIRES_IN,
      secure: false,
      httpOnly: true, // No XSS, browser cannot modify the cookie!
    };

    if (req.secure || req.headers['x-forwarded-proto'] === 'https')
      cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.resendOTP = async (req, res, next) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return next(AppError('Empty user details are not allowed', 401));
    }

    await OTP.deleteMany({ userId: userId });
    await sendOTPVerificationEmail({ id: userId, email }, res, next);
  } catch (err) {
    next(err);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      photoURL: req.body.photoURL,
      verified: false,
    });

    await sendOTPVerificationEmail(newUser, res, next);

    // const token = signToken(newUser._id);
    // const cookieOptions = {
    //   maxAge: process.env.JWT_EXPIRES_IN,
    //   secure: false,
    //   httpOnly: true, // No XSS, browser cannot modify the cookie!
    // };

    // if (req.secure || req.headers['x-forwarded-proto'] === 'https')
    //   cookieOptions.secure = true;

    // res.cookie('jwt', token, cookieOptions);
    // newUser.password = undefined;

    // // console.log(req);

    // res.status(201).json({
    //   status: 'success',
    //   token,
    //   data: {
    //     user: newUser,
    //   },
    // });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(
        new AppError('Please provide a valid email and password', 400)
      );
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    const correct = user
      ? await user.isCorrectPassword(password, user.password)
      : false;

    if (!user || !correct) {
      return next(new AppError('Incorrect email/password', 401));
    }

    // 2.5) Send OTP request!
    await sendOTPVerificationEmail(user, res, next);

    // const token = signToken(user._id);
    // res.status(200).json({
    //   status: 'success',
    //   token,
    // });
  } catch (err) {
    next(err);
  }
};

exports.protect = async (req, res, next) => {
  try {
    // 1) Check is token exists
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError(`You are not logged in! Please login to get access`, 401)
      );
    }

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

    // GRANT ACCESS NOW!
    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

exports.restrictTo = (...roles) => {
  // roles ['admin', 'user']
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select('+role');
      const role = user.role;

      if (!roles.includes(role)) {
        return next(
          new AppError(`You do not have permission to perform this action`, 403) // forbidden
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

exports.checkValidToken = async (req, res, next) => {
  try {
    const token = req.params.token;

    if (!token) {
      return next(new AppError(`Please enter a valid token`, 400));
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists (user deleted, token still resides)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      res.status(200).json({
        status: 'success',
        valid: false,
        message: `The user belonging to the token does not exist`,
      });

      return;
    }

    // Check if user changes password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      res.status(200).json({
        status: 'success',
        valid: false,
        message: `User has recently changed his/her password. Please login again!`,
      });

      return;
    }

    res.status(200).json({
      status: 'success',
      valid: true,
    });
  } catch (err) {
    next(err);
  }
};
