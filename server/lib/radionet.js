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
        queryString = QueryString.stringify(params||{})
    
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
     * get the top stations
     * shorthand for radionet.getStationByCategory('top', ...)
     * 
     * @returns {promise}
     */
    getTopStations () 
    {
        return this.searchStations({category: 'top'});
    },

    /**
     * get local stations
     * 
     * @param {int} limit
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
     * @param {int} id
     * @returns {promise}
     */
    getStationById (id) 
    {
        return this.getStation(id)
    },

    /**
     * get stations playlist
     * 
     * @param {int} id
     * @returns {promise}
     */
    getStationPlaylist (id) 
    {
        return this.getStation(id, 'playlist')
    },

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
     * search stations by string od category
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
     * search stations
     * 
     * @param {string} query
     * @param {int} offset
     * @param {int} limit
     * @returns {promise}
     */
    searchStationByString (query, offset=0, limit=100) 
    {
        return  this.searchStations({query, offset, limit})
    },

    /**
     * get values of category.
     * 
     * @deprecated use getCategory(<category>)
     * @param {string} category
     * @returns {promise}
     */
    getCategories (category) 
    {
        return this.getCategory(category)
    },

    getCategory (category) {
        return queryApi('menu/valuesofcategory', {category: '_' + category})
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
    searchStationByCategory (category, query, offset=0, limit=100) 
    {
        return this.searchStations({category, query, offset, limit})
    },

    get category_types() {
        return CATEGORY_TYPES.slice(0)
    }

};
