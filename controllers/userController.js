const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

const User = require('./../models/userModel');
const AppError = require('./../utils/appError');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'assets/img/dummy');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

// const multerStorage = new mongodb.GridFSBucket(
//   new mongodb.MongoClient(DB).db('music-crypto-app'),
//   {
//     bucketName: 'music-bucket',
//   }
// );

// const multerStorage = storage({
//   url: DB,
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = new GridFsStorage({
  url: DB,
  file: (req, file) => {
    const ext = file.mimetype.split('/')[1];
    return {
      filename: `user-${req.user.id}-${Date.now()}.${ext}`,
    };
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
  limits: {
    fileSize: 2900000,
  },
});

exports.uploadUserPhoto = upload.single('photoURL');

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

    // if (req.body.photoURL) {
    //   return next(
    //     new AppError(
    //       `This route is not for photo URL update! Use /updateProfilePicture route`,
    //       400
    //     )
    //   );
    // }

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredRequestBody = filterFields(req.body, 'name', 'email');
    // console.log(req.file);
    if (req.file) filteredRequestBody.photoURL = req.file.filename;

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
