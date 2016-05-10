'use strict';

const express        = require('express');
const app            = express();
const cors           = require('cors');
const bodyParser     = require('body-parser');
const methodOverride = require('method-override');
const mime           = require('mime');
const http           = require('http');
const request        = require('request');
const logger         = require('logplease').create("Orbit.HttpApi");

/* HTTP API */
const HttpApi = (ipfsInstance, events) => {
  const ipfs = ipfsInstance;

  function errorHandler(err, req, res, next) {
    logger.error(JSON.stringify(err, null, 2));
    res.status(404).json(err);
    throw err;
  }

  logger.debug("Starting HTTP server at port 3001");

  app.use(cors());
  app.use(bodyParser.json())
  app.use(methodOverride());
  app.use(errorHandler);
  app.use('/', express.static('client/dist'));

  mime.define({
    'text/plain': ['rb', 'srt', 'log', 'sh'],
    'application/octet-stream': ['zip'],
    'video/webm': ['mkv', 'mp4', 'mov', 'avi']
  });

  app.get("/api/cat/:hash", (req, res, next) => {
    logger.debug("ipfs.cat: " + req.params.hash + " - " + JSON.stringify(req.query));

    const hash     = req.params.hash;
    const filename = req.query.name || "";
    const type     = mime.lookup(filename);
    if(req.query.action && req.query.action == "download")
      res.setHeader('Content-disposition', 'attachment; filename=' + filename.replace(",", ""));

    res.setHeader('Content-Type', type);

    try {
      request.get('http://localhost:8080/ipfs/' + hash).pipe(res);
    } catch(e) {
      logger.error(e.stack);
    }
  });

  /* HTTP SERVER */
  var startServer = () => {
    return new Promise((resolve, reject) => {
      var s = app.listen(3001, () => resolve(s));
    });
  };

  return startServer()
    .then((server) => {
      logger.debug('HTTP server started at http://%s:%s', server.address().address, server.address().port);
      return { server: server, socketServer: http.Server(app) };
    });
};

module.exports = HttpApi;
