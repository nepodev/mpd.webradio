/**
 * MPD.Webradio
 * 
 */
"use strict";

const http = require('http');
const path = require('path');
const fs = require('graceful-fs')
const express = require('express');
const radionet = require('./server/lib/radionet');
const wss = require('./server/lib/wss');
const mpc = require('./server/lib/mpc');
const store = require('./server/lib/store');

const var_dir = path.join(__dirname, 'var');

var config = require('./server/default.json')

if (fs.existsSync(path.join(var_dir, 'config.json'))) {
  // read custom config
  let custom = JSON.parse(fs.readFileSync(path.join(var_dir, 'config.json'), 'utf8'));
  config = Object.assign(config, custom)
}

// create webservice
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);

// add websocket service
wss.init(server);

// config webservice
server.listen(
  config.server.port,
  config.server.host, 
  () => console.log('Listening on %s:%d', server.address().address, server.address().port)
);

// setup radio.de api
radionet.init(config.radionet);

// setup connection to mpd
mpc.init(config.mpd);

// setup store
let file = path.join(var_dir, 'datastore.json');
store.init({file});

