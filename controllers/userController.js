const User = require('./../models/userModel');
const AppError = require('./../utils/appError');

const filterFields = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    // 1) create error if password or photoURL is present
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          `This route is not for password update! Ask admin to update your password!`,
          400
        )
      );
    }

    if (req.body.photoURL) {
      return next(
        new AppError(
          `This route is not for photo URL update! Use /updateProfilePicture route`,
          400
        )
      );
    }

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredRequestBody = filterFields(req.body, 'name', 'email');

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredRequestBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};
