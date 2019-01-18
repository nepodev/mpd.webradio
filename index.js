/**
 * MPD.Webradio
 * 
 */
"use strict";

const http = require('http');
const path = require('path');
const fs = require('graceful-fs')
const express = require('express');
const wss = require('./server/lib/wss');

const VAR_DIR = path.join(__dirname, 'var');

var config = require('./server/default.json')

config.store = {
  file: path.join(VAR_DIR, 'datastore.json')
}

if (fs.existsSync(path.join(VAR_DIR, 'config.json'))) {
  // read custom config
  let custom = JSON.parse(fs.readFileSync(path.join(VAR_DIR, 'config.json'), 'utf8'));
  config = Object.assign(config, custom)
}

// create webservice
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);

// add websocket service
wss.init(server, config);

// config webservice
server.listen(
  config.server.port,
  config.server.host, 
  () => console.log('Listening on %s:%d', server.address().address, server.address().port)
);

