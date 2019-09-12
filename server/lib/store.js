/**
 * store.js
 * 
 */
"use strict";

const path = require('path');
const fs = require('graceful-fs');

const LISTNAMES = [
    'favorites',
    'recent',
    'cache'
];

const STATION_KEYS = [
    "id",
    "streamURL",
    "bitrate",
    "broadcastType",
    "country",
    "genres",
    "name",
    "picture1Name",
    "picture1TransName",
    "picture7Url",
    "pictureBaseURL",
    "playable",
    "rank",
    "rating",
    "streamContentFormat",
    "subdomain",
    "topics"
];

const DEFAULT_CONFIG = {
    file: null,
    max_recent: 50,
    max_cache: 100
};

var storeContent = null;
var storeFile = null;
var storeConfig = null;

function getStore() {
    if (! storeContent) {
        try {
            storeContent = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
        }
        catch (error) {
            // file doesn't exist
            if (error.code === 'ENOENT') {
                storeContent = {
                    "favorites":[],
                    "recent":[],
                    "cache":[]
                };
            }
            else {
                throw error;
            }
        }
    
    }
    return storeContent;
}

function setStore(value) {
    storeContent = value;
    try {
        fs.writeFileSync(storeFile, JSON.stringify(storeContent));
    }
    catch (error) {
        throw error;
    }
}

/**
 * 
 * @param {string} listname 
 * @param {array} list 
 */
function setList(listname, list) {
    let content = getStore();
    content[listname] = list;
    setStore(content);
}

/**
 * 
 * @param {string} listname 
 */
function getList(listname) {
    return getStore()[listname];
}

/**
 * add station to list
 * 
 * @param {string} listname 
 * @param {object} station 
 * @returns {void}
 */
function addStation(listname, station) {
    let item = reduceStationKeys(station);
    let max = (storeConfig['max_' + listname]) ? storeConfig['max_' + listname] : 0;
    setList(listname, addToList(getList(listname), item, max));
}

/**
 * remove station from list
 * 
 * @param {string} listname 
 * @param {int} id 
 * @returns {void}
 */
function removeStation(listname, id) {
    let list = getList(listname).filter(item => item.id != id)
    setList(listname, list);
}

/**
 * search station in store
 * 
 * @param {string} key 
 * @param {mixed} value 
 * @returns {object}
 */
function searchStation(key, value) {
    let all = getStore(),
        list = [];
    Object.keys(all).forEach(name => list = list.concat(all[name]));
    return (list.filter(item => item[key] == value)).shift();
}

/**
 * 
 * @param {array} list 
 * @param {object} data 
 * @param {int} max (optional)
 * 
 * @return {array}
 */
function addToList(list, data, max=0) {
    let _list = list.filter(item => item.id != data.id);
    _list.unshift(data);
    return (! max) ? _list : _list.slice(0, max);
}

function reduceStationKeys(station) {
    if (station._mpdradio) {
        return station;
    }
    let item = {}
    STATION_KEYS.forEach(key => item[key] = station[key]);
    
    item.genresAndTopics = [].concat(
            (item.genres ? item.genres : []),
            (item.topics ? item.topics : [])
        ).join(', ')
    
    item._mpdradio = 1;
    return item;
}

module.exports = {
    init(options) {
        storeContent = null;
        storeConfig = Object.assign(DEFAULT_CONFIG, options);
        storeFile = storeConfig.file;
    },
    
    /**
     * add station object to favorites
     * @param {object} station
     * @returns {void}
     */
    addFavorite: (station) => addStation('favorites', station),

    /**
     * delete station with id from favorites
     * 
     * @param {int} id
     * @returns {void}
     */
    removeFavorite: (id) => removeStation('favorites', id),

    /**
     * get list of favorites
     * 
     * @returns {array}
     */
    getFavorites: () => getList('favorites'),


    /**
     * add station object to recentlist
     * 
     * @param {object} station
     * @returns {void}
     */
    addRecent: (station) => addStation('recent', station),

    /**
     * get recentlist
     * 
     * @returns {array}
     */
    getRecent: () => getList('recent'),

    /**
     * add station object to cache
     * @param {object} station
     * @returns {void}
     */
    addCache: (station) => addStation('cache', station),

    /**
     * search station in store
     * @param {string} key
     * @param {mixed} value
     * @returns {object}
     */
    searchStation
}