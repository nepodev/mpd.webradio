"use strict"

const WebSocketServer = require('ws').Server;
const Radionet = require('./radionet');
const Mpc = require('./mpc');
const Store = require('./store');

var wss = null;
const {mpdState} = Mpc;

var Config = null;

var store = null

mpdState.on('change', () => {
    broadcastMessage({
        key: "RADIO_STATUS",
        data: mpdState.status
    });
});

function getPublicConfig() {
    return Config.public
}
/**
 * 
 * @param {object} data 
 */
function broadcastMessage(data) {
    let message = JSON.stringify(data);
    wss.clients.forEach(client => client.send(message, logError));
}

function sendMessage(ws, data) {
    let message = JSON.stringify(data);
    ws.send(message, logError);
}

function logError(error) {
    if (error) {
        console.error(error)
    }
}

const sendStationList = (ws, key, options) => {
    let {type, category, query, offset, limit} = options;
    switch (type)
    {
        case "top":
            Radionet.getTopStations()
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break;

        case "local":
            Radionet.getLocalStations()
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break;

        case "recent":
            sendMessage(ws, {key, options, data: store.recent});
            break;

        case "favorite":
            sendMessage(ws, {key, options, data: store.favorites});
            break;

        case "search":
            Radionet.searchStations({query, offset, limit})
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break;
        
        case "category":
            Radionet.getStationsByCategory(category, query, offset, limit)
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break

    default:
    }
}


/**
 * 
 * @param {string} message
 */
function onSocketMessage(message) {
    var ws = this;
    var {key, options} = JSON.parse(message||'{}');

    switch (key) 
    {
        case "STATION_LIST": 
            sendStationList(ws, key, options);
            break;

        case "CATEGORY_LIST": {
            let { category } = options || {};
            Radionet.getCategory(category)
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break;
        }
        
        case "STATION_DETAILS": {
            let {id, url} = options || {};
            if (url) {
                let station = store.search('streamURL', url);
                if (station) {
                    id = station.id
                }
            }
            
            if (id) {
                Radionet.getStation(id)
                    .then(data => {
                        if (data && data.id) {
                            data._favorite = (store.favorites.filter(item => item.id == data.id).shift() ? true : false)
                            sendMessage(ws, {key, options, data})
                        }
                    })
                    .catch(error => sendMessage(ws, {key, options, error}))
            }
            else {
                sendMessage(ws, {key, options})
            }
            break
        }

        case 'RADIO_PLAYSTOP':
            Mpc.playstop()
            break

        case "RADIO_PLAYPAUSE":
            Mpc.playpause()
            break

        case "RADIO_VOLUME":
            Mpc.setVolume(options.set)
            break
            
        case "RADIO_PLAY_STATION": {
            Radionet.getStation(options.id)
                .then(station => {
                    Mpc.play([station.streamURL])
                    store.add('recent',station)
                })
                .catch(error => sendMessage(ws, {key, options, error}));
            break;
        }
        

        case "RADIO_STATUS":
            sendMessage(ws, {key, options, data: mpdState.status});
            break;

        case "FAV_ADD": {
            Radionet.getStation(options.id)
                .then(station => {
                    store.add('favorites', station);
                    sendMessage(ws, {key, options, data: store.favorites})
                })
                .catch(error => sendMessage(ws, {key, options, error}));
            break;
        }

        case "FAV_REMOVE":
            store.remove('favorites', options.id);
            sendMessage(ws, {key, options, data: store.favorites})
            break;

        case "SYS_CONFIG":
            sendMessage(ws, {key, options, data: getPublicConfig()})
            break;

        default:
            let error =  {message: "Unknown key"};
            sendMessage(ws, {key, error});

    }
}

module.exports = {

    /**
     * 
     * @param {object} server 
     */
    init (server, config={}) {
        Config = config

        // setup radio.de api
        Radionet.init(Config.radionet);

        // setup connection to mpd
        Mpc.init(Config.mpd);

        // setup store
        //Store.init(Config.store)
        store = new Store(Config.store)
        

        wss = new WebSocketServer({ server });

        wss.on('error', console.error);
        wss.on('connection', (ws, request) => {
            ws.on('error', console.error);
            ws.on('message', onSocketMessage);
            //sendMessage(ws, {key: "RADIO_STATUS", data: mpdState.status});
        });

        
    },

    broadcast: broadcastMessage

}
