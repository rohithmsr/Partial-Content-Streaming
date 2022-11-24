const express = require('express');
const path = require('path');

const streamRouter = require('./routes/streamRoutes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'assets')));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/api/v1/streams', streamRouter);

app.get('/api/v1/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the music streamer!',
  });
});

module.exports = app;
