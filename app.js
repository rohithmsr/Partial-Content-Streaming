const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');

const streamRouter = require('./routes/streamRoutes');
const songRouter = require('./routes/songRoutes');
const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// Security HTTP Headers
app.use(helmet());

// Rate Limit Header
// Requests per ip at amount of time!
// 5000 requests from same ip in 1 hour
const limiter = rateLimit({
  max: 5000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});
app.use('/api', limiter);

// Body parser, reading data from body to req.body
app.use(express.json());

// Data sanitization against NoSQL query injection
// removes operators and dollar signs
app.use(mongoSanitize());

// Data sanitization against XSS
// Prevent HTML code + JS code injection! Convert them into characters!
app.use(xss());

// Serving static files
app.use(express.static(path.join(__dirname, 'assets')));

app.use(compression());

// Time adding middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Routers
app.use('/api/v1/streams', streamRouter);
app.use('/api/v1/songs', songRouter);
app.use('/api/v1/users', userRouter);

app.get('/api/v1/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the music streamer!',
  });
});

// Error handlers
app.all('*', (req, res, next) => {
  // const err = new Error();
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find the ${req.originalUrl} on this server.`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
