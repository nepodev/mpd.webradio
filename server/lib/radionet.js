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
    english: 'api.rad.io',
    german: 'api.radio.de',
    french: 'api.radio.fr',
    austrian: 'api.radio.at'
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

const THUMB_KEYS = ['logo300x300', 'logo175x175', 'logo100x100', 'logo44x44']

const BASE_PATH = '/info/'

const SORT_TYPES = [
    'RANK',
    'STATION_NAME'
]

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
    console.log(options)
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

const mapStationListV2 = list => {
    let stations = []
    list.forEach(station => {
        let s = {
            _orig: station
        }
        THUMB_KEYS.some(key => {
            if (station[key]) {
                s.thumbnail = station[key]
                return true
            }
        })

        if (typeof station.genres[0] === 'object') {
            s.genres = station.genres.map(g => g.value)
        }
        else {
            s.genres = station.genres
        }
        
        try {
            s.description = station.descripton.value || ''
        }
        catch (e) {
            s.description = station.descripton
        }

        try {
            s.name = station.name.value || ''
        }
        catch(e) {
            s.name = station.name
        }

        stations.push(s)
    })

    return stations
}

const mapSystemName = list => list.map(o => o.systemEnglish)

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
            switch (params.category)
            {
                case 'genre':
                    return this.getStationsByGenre(params.query, params.offset, params.limit)
                case 'language':
                    return this.getStationsByLanguage(params.query, params.offset, params.limit) 
            }
            return this.getStationsByGenre(params.query, params.offset, params.limit)
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
        switch (category)
        {
            case 'genre':
                return this.getGenres()

            case 'country':
                return this.getCountries()
            
            case 'language':
                return this.getLanguages()
    
        }
        if (category === 'genre') {
            return this.getGenres()
        }
        
        return queryApi('v2/search/getgenres')
    },

    getGenres ()
    {
        return queryApi('v2/search/getgenres').then(mapSystemName)
    },

    getTopics()
    {
        return queryApi('v2/search/gettopics').then(mapSystemName)
    },

    getLanguages()
    {
        return queryApi('v2/search/getlanguages').then(mapSystemName)
    },

    getCountries()
    {
        return queryApi('v2/search/getcountries').then(mapSystemName)
    },

    getCities(country=null)
    {
        let route = 'v2/search/getcities'
        if (country) {
            let params = { country }
            return queryApi(route, params).then(mapSystemName)
        }
        else  {
            return queryApi(route).then(mapSystemName)
        }
    },

    /**
     * 
     * @param {string} genre 
     * @param {string} sorttype 
     * @param {integer} sizeperpage 
     * @param {integer} pageindex 
     */
    getStationsByGenre(genre, pageindex=0, sizeperpage=50, sorttype='STATION_NAME')
    {
        let route = 'v2/search/stationsbygenre'
        let params = { genre, sorttype, sizeperpage, pageindex }

        return queryApi(route, params)
            .then(data => mapStationListV2(data.categories[0].matches||[]))
    },

    getStationsByLanguage(language, pageindex=0, sizeperpage=50, sorttype='STATION_NAME')
    {

    },

    getRecommendationStations()
    {

    },

    /**
     * @var {array}
     */
    get category_types() {
        return CATEGORY_TYPES.slice(0)
    },

    /**
     * @var {array}
     */
    get sort_types() {
        return SORT_TYPES.slice(0)
    }
};
