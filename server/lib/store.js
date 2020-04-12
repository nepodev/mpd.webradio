/**
 * store.js
 * 
 */
"use strict";

const { Store } = require('data-store')

const LISTNAMES = [
    'favorites',
    'recent',
    'cache'
];

const DEFAULT_CONFIG = {
    file: null,
    max_recent: 50,
    max_cache: 100,
    max_favorites: 0
};


class myStore {
    constructor(options)
    {
        this._settings = Object.assign(DEFAULT_CONFIG, options)
        this._store = new Store({path: this.settings.file})
        LISTNAMES.forEach(ln => {
            let name = 'max_' + ln
            this[name] = this._settings[name]||0
        })
    }

    get favorites()
    {
        return this.getList('favorites')
    }
    get recent()
    {
        return this.getList('recent')
    }
    get cache()
    {
        return this.getList('cache')
    }

    addFavorite(station)
    {
        this.addStation('favorites', station, this._station)
    }

    removeFavorite(id)
    {
        this.removeStation('favorites', id)
    }

    addRecent(station)
    {
        this.addStation(station)
    }

    removeRecent(id)
    {
        this.removeStation('recent', id)
    }

    addCache(station)
    {
        this.addStation('cache',station)
    }

    addStation(listname, station)
    {
        let max = this['max_' + listname]
        let list = this.getList(listname).filter(item => item.id != station.id);
        list.unshift(station)
        if (max) {
            list = list.slice(0, max)
        }
        this._store.set(listname, list)
    }

    /**
     * remove station from list
     * 
     * @param {string} listname 
     * @param {int} id 
     * @returns {void}
     */
    removeStation(listname, id)
    {
        let list = this.getList(listname).filter(item => item.id != id)
        this._store.set(listname, list)
    }

    getList(listname)
    {
        this._store.hasOwn(listname) ? this._store.get(listname) : []
    }

    searchStation(key, value) {
        let all = this._store.get(),
            list = [];
        Object.keys(all).forEach(name => list = list.concat(all[name]));
        return (list.filter(item => item[key] == value)).shift();
    }
}

module.exports = myStore
