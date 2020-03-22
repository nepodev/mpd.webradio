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
 * @deprecated
 * @param {object} station 
 * @returns {object}
 */
const getStationStreamURL = station => {
    if (Array.isArray(station.streamUrls)) {
        station.streamURL = station.streamUrls[0]
    }
    return station
}
const extractStreamUrl = station => {
    let streams = station.streamUrls||[]

    return streams[0] ? streams[0].streamUrl : ''
}
const mapStation = station => {
    let s = {
        _orig: station,
        id: station.id,
        streamURL: extractStreamUrl(station),
        description: station.description,
        shortDescription: station.shortDescription||''
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

    s.name = station.name.value ? station.name.value : station.name

    return s
}
const mapStationListV2 = list => {
    let stations = []

    list.forEach(station => {
        stations.push(mapStation(station))
    })

    return stations
}

const mapSystemName = list => list.map(o => o.systemEnglish)

const mapSearchResult = result => {
    let list = {}
    list.pageCount = result.numberPages || 0
    list.result = mapStationListV2(result.categories[0].matches||[])
    return list
}

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
    getLocalStations (pageindex=1, sizeperpage=50)
    {
        return queryApi('v2/search/localstations', {pageindex, sizeperpage})
            .then(mapSearchResult)
    },

    /**
     * get station details
     * 
     * @param {integer} station_id
     * @param {string} section deprecated 
     */
    getStation (station_id)
    {
        let route = 'v2/search/station'
        let params = {station: station_id}
        return queryApi(route, params).then(data => mapStationListV2([data]).shift())
    },

    /**
     * search stations
     * 
     * @param {object} params {category: {string}, query: <string>, offset: <integer>, limit: <integer>}
     */
    searchStations (params)
    {
        let pageindex = params.offset||0
        let sizeperpage = params.limit||50

        if (params.category) {
            switch (params.category)
            {
                case 'genre':
                    return this.getStationsByGenre(params.query, pageindex, sizeperpage)
                case 'topic':
                    return this.getStationsByTopic(params.query, pageindex, sizeperpage)
                case 'language':
                    return this.getStationsByLanguage(params.query, pageindex, sizeperpage)
                case 'country':
                    return this.getStationsByCountry(params.query, pageindex, sizeperpage)
                case 'city':
                    return this.getStationsByCity(params.query, pageindex, sizeperpage)
            }
        }
        else if (params.query) {
            return this.searchStationsByString(params.query, pageindex, sizeperpage)
        }
    },

    searchStationsByString(query, pageindex=1, sizeperpage=50, sorttype='STATION_NAME')
    {
        return queryApi('v2/search/stations', { query, pageindex, sizeperpage, sorttype })
            .then(mapSearchResult)
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

    getGenres()
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
        let params = {}
        if (country) {
            params = { country }
        }

        return queryApi(route, params).then(mapSystemName)
    },

    /**
     * 
     * @param {string} genre 
     * @param {string} sorttype 
     * @param {integer} sizeperpage 
     * @param {integer} pageindex 
     */
    getStationsByGenre(genre, pageindex=1, sizeperpage=50, sorttype='STATION_NAME')
    {

        return queryApi(
                'v2/search/stationsbygenre',
                { genre, sorttype, sizeperpage, pageindex }
            )
            .then(mapSearchResult)
    },

    getStationsByTopic(topic, pageindex=1, sizeperpage=50, sorttype='STATION_NAME')
    {
        let route = 'v2/search/stationsbytopic'
        let params = { topic, sorttype, sizeperpage, pageindex }

        return queryApi(route, params).then(mapSearchResult)
    },

    getStationsByLanguage(language, pageindex=1, sizeperpage=50, sorttype='STATION_NAME')
    {
        let route = 'v2/search/stationsbylanguage'
        let params = { language, sorttype, sizeperpage, pageindex }

        return queryApi(route, params).then(mapSearchResult)
    },

    getStationsByCountry(country, pageindex=1, sizeperpage=50, sorttype='STATION_NAME')
    {
        let route = 'v2/search/stationsbycountry'
        let params = { country, sorttype, sizeperpage, pageindex }

        return queryApi(route, params).then(mapSearchResult)
    },

    getStationsByCity(city, pageindex=1, sizeperpage=50, sorttype='STATION_NAME')
    {
        let route = 'v2/search/stationsbycity'
        let params = { city, sorttype, sizeperpage, pageindex }

        return queryApi(route, params).then(mapSearchResult)
    },

    getStationsNearby(pageindex=1, sizeperpage=50)
    {
        return queryApi('v2/search/localstations', {pageindex, sizeperpage}).then(mapSearchResult)
    },

    getTopStations(pageindex=1, sizeperpage=50)
    {
        return queryApi('v2/search/topstations', { pageindex, sizeperpage }).then(mapSearchResult)
    },

    getRecommendationStations()
    {
        return queryApi('v2/search/editorstips').then(data => mapStationListV2(data))
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
