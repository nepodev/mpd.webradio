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
        this._store = new Store({path: this._settings.file})

        LISTNAMES.forEach(listname => 
            this._store.hasOwn(listname)||this._store.set(listname, [])
        )
    }

    get favorites()
    {
        return this._store.get('favorites')
    }

    get recent()
    {
        return this._store.get('recent')
    }
    
    get cache()
    {
        return this._store.get('cache')
    }

    add(listname, data)
    {
        let list = this[listname].filter(item => item.id != data.id)
        list.unshift(data)

        let max = this._settings['max_' + listname]
        if (max) {
            list = list.slice(0, max)
        }
        this._store.set(listname, list)
    }

    remove(listname, id)
    {
        let list = this[listname].filter(item => item.id != id)
        this._store.set(listname, list)
    }

    search(key, value)
    {
        let all = this._store.get()
        let list = []
        Object.keys(all).forEach(name => list = list.concat(all[name]));
        return (list.filter(item => item[key] == value)).shift();
    }
    
}

module.exports = myStore
