const fs = require('fs');
const path = require('path');

const getRangeHeader = (range, totalLength) => {
  if (range == null || range.length == 0) {
    return null;
  }

  const array = range.split(/bytes=([0-9]*)-([0-9]*)/);

  const start = parseInt(array[1]);
  const end = parseInt(array[2]);

  const result = {
    start: isNaN(start) ? 0 : start,
    end: isNaN(end) ? totalLength - 1 : end,
  };

  if (!isNaN(start) && isNaN(end)) {
    result.start = start;
    result.end = totalLength - 1;
  }

  if (isNaN(start) && !isNaN(end)) {
    result.start = totalLength - end;
    result.end = totalLength - 1;
  }

  return result;
};

const sendStreamResponse = (res, statusCode, downloadStream) => {
  res.status(statusCode);

  downloadStream.on('data', (chunk) => {
    res.write(chunk);
  });

  downloadStream.on('error', () => {
    res.sendStatus(404);
  });

  downloadStream.on('end', () => {
    res.end();
  });
};

exports.checkID = (req, res, next) => {
  const fileId = req.params.id;

  const song = path.join(__dirname, '..', 'assets', 'songs', `${fileId}.mp3`);

  if (!fs.existsSync(song)) {
    return res.status(404).json({
      status: 'fail',
      message: 'The requested song with the id not found!',
    });
  }

  req.song = song;
  next();
};

exports.downloadStream = (req, res) => {
  const stat = fs.statSync(req.song);
  const rangeRequest = getRangeHeader(req.headers?.range, stat.size);

  if (!rangeRequest) {
    res.set('Content-Type', 'audio/mpeg');
    res.set(
      'Content-Range',
      'bytes ' + 0 + '-' + stat.size - 1 + '/' + stat.size
    );
    res.set('Content-Length', stat.size);
    res.set('Accept-Ranges', 'bytes');

    console.log('Full');
    sendStreamResponse(res, 200, fs.createReadStream(req.song));
    return;
  }

  const start = rangeRequest.start;
  const end = rangeRequest.end;

  if (start == 0 && end == stat.size - 1) {
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
    res.set('Content-Length', stat.size);
    res.set('Accept-Ranges', 'bytes');

    console.log('Full');
    sendStreamResponse(res, 200, fs.createReadStream(req.song));
    return;
  }

  if (start >= stat.size || end >= stat.size) {
    res.set('Content-Range', 'bytes */' + stat.size);
    res.sendStatus(416);
    return;
  }

  res.set('Content-Type', 'audio/mpeg');
  res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
  res.set('Content-Length', start == end ? 0 : end - start + 1);
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'no-cache');

  console.log(`Partial ${start}-${end}`);
  sendStreamResponse(
    res,
    206,
    fs.createReadStream(req.song, {
      start: start,
      end: end,
    })
  );
};
