/**
 * radionet.js
 * 
 * radio.de api
 * get stations from radio.net
 * 
 */
"use strict";

const Http = require("http");
const querystring = require('querystring');

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

const PLAYLIST_SUFFIX = [
    '.pls',
    '.xml',
    '.asx',
    '.m3u'
]

const BASE_PATH = '/info/'

var request_options = {
    host: MAIN_DOMAINS.english,
    path: "",
    method: "GET",
    headers: {
        "user-agent": "XBMC Addon Radio"
    }
}

/**
 * 
 * @param {string} route 
 * @param {object} params 
 * @returns {promise}
 */
const queryApi = (route, params) => {
    let options = Object.assign({}, request_options, {path: BASE_PATH + route}),
        queryString = querystring.stringify(params||{})
    
    if (queryString) {
        options.path += '?' + queryString
    }

    // return new pending promise
    return new Promise((resolve, reject) => {
        const request = Http.get(options, (response) => {
            const { statusCode } = response;
            const contentType = response.headers['content-type']
            let rawData = '',
                error

            if (statusCode < 200 || statusCode > 299) {
                error = new Error(`Failed to load page, status code: ${statusCode}`)
            }
            else if (!/^application\/json/.test(contentType)) {
                error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`)
            }

            if (error) {
                response.resume()
                reject(error)
            }

            response.setEncoding('utf8')
            response.on('data', (chunk) => { rawData += chunk; })
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    resolve(parsedData)
                }
                catch (e) {
                    reject(e)
                }
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
    init (options) 
    {
        //radionet_options = options;
        let {language} = options;
        if (language) {
            request_options.host = MAIN_DOMAINS[language]
        }
    },

    /**
     * get local stations
     * 
     * @param {integer} limit
     * @returns {promise}
     */
    getLocalStations (limit=50) 
    {
        return queryApi('account/getmostwantedbroadcastlists', {sizeoflists: limit})
            .then((data) => data.localBroadcasts);
    },

    /**
     * get station details
     * 
     * @param {integer} id 
     * @param {string} section 
     */
    getStation (id, section)
    {
        let params = {broadcast: id}
        if (section === 'playlist') {
            return queryApi('playlist/resolveplaylist', params);
        }
        else {
            return queryApi('broadcast/getbroadcastembedded', params)
                .then(data => getStationStreamURL(data))
        }
    },

    /**
     * search stations
     * 
     * @param {object} params {category: {string}, query: <string>, offset: <integer>, limit: <integer>}
     */
    searchStations (params) 
    {
        let param = {
            start: params.offset||0,
            rows: params.limit||100
        }
        let route

        if (params.category) {
            route = 'menu/broadcastsofcategory'
            param.category = '_' + params.category
            if (params.query) {
                param.value = params.query
            }
        }
        else if (params.query) {
            route = 'index/searchembeddedbroadcast'
            param.q = params.query
            param.streamcontentformats = 'aac,mp3'
        }

        return queryApi(route, param)
    },

    /**
     * get list of category
     * 
     * @param {string} category 
     */
    getCategory (category) {
        return queryApi('menu/valuesofcategory', {category: '_' + category})
    },

    /**
     * @var {array}
     */
    get category_types() {
        return CATEGORY_TYPES.slice(0)
    }

};
