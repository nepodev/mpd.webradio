/**
 * radionet.js
 * 
 * radio.de api
 * get stations from radio.net
 * 
 */
"use strict";

const Http = require("http");
const QueryString = require('query-string');

const MAIN_DOMAINS = {
    english: 'rad.io',
    german: 'radio.de',
    french: 'radio.fr',
    austrian: 'radio.at'
}

const CATEGORY_TYPES = [
    'city',
    'country',
    'genre',
    'language',
    'top',
    'topic'
];

const REQUEST_OPTIONS = {
    host: "",
    path: "",
    method: "GET",
    headers: {
        "user-agent": "XBMC Addon Radio"
    }
}

const PLAYLIST_SUFFIX = [
    '.pls',
    '.xml',
    '.asx',
    '.m3u'
]

var api_host = MAIN_DOMAINS.english;


/**
 * 
 * @param {string} route 
 * @param {object} params 
 * @returns {promise}
 */
const queryApi = (route, params) => {
    let opt = {
        host: api_host,
        path: '/info/' + route
    }
    if (typeof params === 'object') {
        opt.path += '?' + QueryString.stringify(params);
    }
    var options = Object.assign(REQUEST_OPTIONS, opt);
    // return new pending promise
    return new Promise((resolve, reject) => {
        const request = Http.get(options, (response) => {
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page, status code: ' + response.statusCode));
            }
            const body = [];
            response.on('data', chunk => body.push(chunk));
            response.on('end', () => {
                resolve(JSON.parse(body.join('')))
            });
        });
        request.on('error', (err) => reject(err))
    });
};

/**
 * if streamURL is a playlist we extract a usabel url from streamUrls and replace streamURL
 * 
 * @param {object} station 
 * @returns {object}
 */
const getStationStreamURL = station => {
    let suffix = station.streamURL.substr(-4);
    if (PLAYLIST_SUFFIX.indexOf(suffix) !== -1 && station.streamUrls) {
        let arr = station.streamUrls.filter(item => PLAYLIST_SUFFIX.indexOf(item.streamUrl.substr(-4)) === -1).shift()
        if (arr) {
            station.streamURL = arr.streamUrl
        }
    }
    return station;
};

const Radionet = module.exports = {

    /**
     * 
     * @param {object} options
     */
    init (options) {
        //radionet_options = options;
        let {language} = options;
        if (language) {
            api_host = MAIN_DOMAINS[language];
        }
    },

    /**
     * get the top stations
     * shorthand for radionet.getStationByCategory('top', ...)
     * 
     * @returns {promise}
     */
    getTopStations () {
        return Radionet.searchStationByCategory('top');
    },

    /**
     * get local stations
     * 
     * @param {int} limit
     * @returns {promise}
     */
    getLocalStations (limit=50) {
        return queryApi('account/getmostwantedbroadcastlists', {sizeoflists: limit})
            .then((data) => data.localBroadcasts);
    },

    /**
     * get station details 
     * 
     * @param {int} id
     * @returns {promise}
     */
    getStationById (id) {
        return queryApi('broadcast/getbroadcastembedded', {broadcast: id})
            .then(data => getStationStreamURL(data))
    },

    /**
     * get stations playlist
     * 
     * @param {int} id
     * @returns {promise}
     */
    getStationPlaylist (id) {
        return queryApi('playlist/resolveplaylist', {broadcast: id});
    },

    /**
     * search stations
     * 
     * @param {string} query
     * @param {int} offset
     * @param {int} limit
     * @returns {promise}
     */
    searchStationByString (query, offset=0, limit=100) {
        let params = {
            q: query,
            start: offset,
            rows: limit,
            streamcontentformats: "aac,mp3"
        };
        return queryApi('index/searchembeddedbroadcast', params)
    },

    /**
     * get values of category.
     * 
     * @param {string} category
     * @returns {promise}
     */
    getCategories (category) {
        let params = {
            category: '_' + category
        };
        return queryApi('menu/valuesofcategory', params);
    },

    /**
     * 
     * @param {string} category
     * @param {string} query
     * @param {int} offset
     * @param {int} limit
     * 
     * @returns {promise}
     */
    searchStationByCategory (category, query, offset=0, limit=100) {
        let params = {
            category: '_' + category,
            value: query,
            start: offset,
            rows: limit
        };
        return queryApi('menu/broadcastsofcategory', params);
    },

    /**
     * @returns {array}
     */
    getCategoryTypes: () => CATEGORY_TYPES

};
