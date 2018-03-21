"use strict"

const WebSocketServer = require('ws').Server;
const Radionet = require('./radionet');
const Mpc = require('./mpc');
const Store = require('./store');

var wss = null;
const {mpdState} = Mpc;

mpdState.on('change', () => {
    broadcastMessage({
        key: "RADIO_STATUS",
        data: mpdState.status
    });
});

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
        console.error
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
            sendMessage(ws, {key, options, data: Store.getRecent()});
            break;

        case "favorite":
            sendMessage(ws, {key, options, data: Store.getFavorites()});
            break;

        case "search":
            Radionet.searchStationByString(query, offset, limit)
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break;
        
        case "category":
            Radionet.searchStationByCategory(category, query, offset, limit)
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break

    default:
    }
}

const extendStationInfo = station => {
    let mpdradio = {
        favorite: (Store.getFavorites().filter(item => item.id == station.id).shift() ? true : false),
        selected: (mpdState.status.file == station.streamURL)
    }
    return Object.assign(station, {mpdradio})
}

/**
 * 
 * @param {string} message
 */
function onSocketMessage(message) {
    var ws = this;
    try {
        var {key, options} = JSON.parse(message);
    }
    catch(error) {
        logError(error);
        sendMessage(ws, {error});
    }

    switch (key) 
    {
        case "STATION_LIST": 
            sendStationList(ws, key, options);
            break;

        case "CATEGORY_LIST": {
            let { category } = options || {};
            Radionet.getCategories(category)
                .then(data => sendMessage(ws, {key, options, data}))
                .catch(error => sendMessage(ws, {key, options, error}));
            break;
        }
        
        case "STATION_DETAILS": {
            let {id, url} = options || {};
            if (url) {
                let station = Store.searchStation('streamURL', url);
                if (station) {
                    id = station.id
                }
            }
            
            if (id) {
                Radionet.getStationById(id)
                    .then(data => {
                        if (data && data.id) {
                            data._favorite = (Store.getFavorites().filter(item => item.id == data.id).shift() ? true : false)
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

        case "RADIO_PLAYPAUSE":
            Mpc.playpause()
            break

        case "RADIO_VOLUME":
            Mpc.setVolume(options.set)
            break
            
        case "RADIO_PLAY_STATION": {
            // get station from local store
            // let station = Store.searchStation('id', options.id);
            // if (station) {
            //     Mpc.play([station.streamURL]);
            //     Store.addRecent(station);
            // }
            // else {
                // get station from radio.net
                Radionet.getStationById(options.id)
                    .then(station => {
                        Mpc.play([station.streamURL]);
                        Store.addRecent(station);
                    })
                    .catch(error => sendMessage(ws, {key, options, error}));
//            }
            break;
        }
        

        case "RADIO_STATUS":
            sendMessage(ws, {key, options, data: mpdState.status});
            break;

        case "FAV_ADD": {
            let station = Store.searchStation('id', options.id);
            if (station) {
                Store.addFavorite(station);
                sendMessage(ws, {key, options, data: Store.getFavorites()})
            }
            else {
                Radionet.getStationById(options.id)
                    .then(station => {
                        Store.addFavorite(station);
                        sendMessage(ws, {key, options, data: Store.getFavorites()})
                    })
                    .catch(error => sendMessage(ws, {key, options, error}));
            }
            break;
        }

        case "FAV_REMOVE":
            Store.removeFavorite(options.id);
            sendMessage(ws, {key, options, data: Store.getFavorites()})
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
    init (server) {
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
