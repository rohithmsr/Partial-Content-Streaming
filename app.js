const express = require('express');
const path = require('path');

const streamRouter = require('./routes/streamRoutes');
const songRouter = require('./routes/songRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'assets')));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/api/v1/streams', streamRouter);
app.use('/api/v1/songs', songRouter);

app.get('/api/v1/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the music streamer!',
  });
});

app.all('*', (req, res, next) => {
  // const err = new Error();
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find the ${req.originalUrl} on this server.`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
