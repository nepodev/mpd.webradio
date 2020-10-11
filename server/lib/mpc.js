"use strict";

const EventEmitter = require('events');
const mpd = require('mpd');


/** 
 * 
 */
class StatusEmitter extends EventEmitter {
    set status (data) {
        this._status = data;
        this.emit('change');
    }
    get status () {
        return this._status;   
    }
}

const DEFAULT_SETTINGS = {
    host: "localhost",
    port: "6600"
};

const MPC_DISCONNECTED = 1;
const MPC_CONNECTING = 2;
const MPC_RECONNECTING = 3;
const MPC_READY = 4;

const PLAYLIST_SUFFIX = [
    '.asx',
    '.cue',
    '.m3u',
    '.pls',
    '.rss',
    '.xml'
]


var mpc = null;
var mpcStatus = MPC_DISCONNECTED;

var mpdSettings = {};

const mpdState = new StatusEmitter();

var commandQueue=[];


/** 
 * 
 */
function connect() {
    if(mpc && mpc.socket) {
        mpc.socket.end();
        mpc = null;
    }
    mpcStatus = MPC_CONNECTING;
    
    mpc = mpd.connect(mpdSettings);

    mpc.on('ready', () => {
        mpcStatus = MPC_READY;
        if (commandQueue.length) {
            while (commandQueue.length > 0) {
                let {command, options} = commandQueue.shift();
                doCommand(command, options);
            }
        }
        else {
            updateStatus();
        }
    });

    mpc.on('end', () => {
        console.log('MPD connection end');
        reconnect();
    });

    mpc.on('error', function(err) {
        console.error('MPD error: ' + err);
        reconnect();
    });

    mpc.on('system-player', updateStatus);
    mpc.on('system-mixer',  updateStatus);
}

/** 
 * try reconnect mpd service 
 */
function reconnect() {
    if(mpcStatus === MPC_RECONNECTING) {
        return
    }
    mpc = null;
    mpcStatus = MPC_RECONNECTING;
    setTimeout(() => {
        connect();
    }, 3000);
}

const isPlaylist = file => {
    const ext = file.substr(-4).toLowerCase()
    return PLAYLIST_SUFFIX.includes(ext)
}

/**
 * 
 * @param {string} command 
 * @param {array} params
 * @returns {void}
 */
function doCommand(command, params=[]) {
    if (command === 'play' && typeof params[0] === 'string') {
        let add = isPlaylist(params[0]) ? 'load' : 'add'
        mpc.sendCommands([
            mpd.cmd('clear', []),
            mpd.cmd(add, params),
            mpd.cmd('play', []),
            mpd.cmd('repeat',[1])
        ]);
        return;
    }
    else if (command == 'playstop') {
        let {state} = mpdState.status;
        switch(state)
        {
            case 'pause':
                command = 'pause'
                params = [0];
                break;
            case 'play':
                command = 'stop';
                params = [];
                break;
            default:
                command = 'play';
                params = [];
        }
    }
    else if (command == 'playpause') {
        let {state} = mpdState.status;
        if (state === 'pause') {
            command = 'pause';
            params = [0];
        }
        else if (state === 'play') {
            command = 'pause';
            params = [1];
        }
        else {
            command = 'play';
            params = [];
        }
    }
    else if (command == 'volume') {
        let v = parseInt(mpdState.status.volume, 10);
        let volume = parseInt(v, 10) + (params[0] == 'up' ? 2 : -2);
        if (volume < 0) {
            volume = 0;
        }
        else if (volume > 100) {
            volume = 100;
        }
        command = 'setvol';
        params = [volume];
    }

    if (command == 'setvol' && mpdState.status.volume === params[0]) {
        return;
    }
    mpc.sendCommand(mpd.cmd(command, params));
}

/**
 * @returns {void}
 */
function updateStatus() {
    mpc.sendCommands(
        [
            mpd.cmd('currentsong', []),
            mpd.cmd('status', [])
        ],
        (error, response) => {
            if (error) {
                console.error('error', 'MPD error: ' + error);
            }
            else {
                mpdState.status = mpd.parseKeyValueMessage(response);
            }
        }
    );
}

const MpdClient = module.exports = {

    init(options) {
        mpdSettings = Object.assign(DEFAULT_SETTINGS, options);
        connect();
    },

    command(command, options) {
        if (mpcStatus === MPC_READY) {
            doCommand(command, options);
        }
        else {
            commandQueue.push({command, options});
            connect();
        }
    },

    playstop() {
        this.command('playstop');
    },

    playpause() {
        this.command('playpause');
    },

    play(params) {
        this.command('play', params);
    },
    
    setVolume (direction) {
        this.command('volume', [direction]);
    },

    mpdState
}
