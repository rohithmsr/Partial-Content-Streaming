const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      photoURL: req.body.photoURL,
    });

    const token = signToken(newUser._id);
    const cookieOptions = {
      maxAge: process.env.JWT_EXPIRES_IN,
      secure: false,
      httpOnly: true, // No XSS, browser cannot modify the cookie!
    };

    if (req.secure || req.headers['x-forwarded-proto'] === 'https')
      cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);
    newUser.password = undefined;

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

    // 3) Send token to the client!
    const token = signToken(user._id);
    res.status(200).json({
      status: 'success',
      token,
    });
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
