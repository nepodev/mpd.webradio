/**
 * helper.js
 */
"use strict"

const socket = require('./socket')
const noImage = require('../img/noimg175.png')

var  indicator = null

const openIndicator = () => {
    indicator = phonon.indicator('', false)
}

const onMessage = function(message) {
    if (indicator !== null) {
        indicator.close()
        indicator = null
    }
}
socket.onMessage(onMessage)

const self = module.exports = {

    openIndicator,

    addFavorite: id => {
        socket.sendMessage({key: 'FAV_ADD', options:{id}})
    },
    removeFavorite: id => {
        socket.sendMessage({key: 'FAV_REMOVE', options:{id}})
    },
    
    onGetStationDetails: event => {
        event.preventDefault()
        let options = {
                id: event.currentTarget.dataset.stationId,
                url: event.currentTarget.dataset.stationUrl
            }
        socket.sendMessage({key: 'STATION_DETAILS', options})
    },

    onGetStationList: event => {
        event.preventDefault()

        let elem = event.currentTarget,
            options = {
                type: elem.dataset.listType,
                category: elem.dataset.listCategory
            }
        
        if (elem.dataset.listOffset) {
            options.offset = parseInt(elem.dataset.listOffset)
        }
        if (elem.dataset.listLimit) {
            options.limit = parseInt(elem.dataset.listLimit)
        }

        if (elem.dataset.indicator) {
            openIndicator()
        }
        socket.sendMessage({key:'STATION_LIST', options})
    },

    onGetCategoryList: event => {
        event.preventDefault()

        let elem = event.currentTarget,
            options = {
            category: elem.dataset.listCategory
        }
        if (elem.dataset.indicator) {
            openIndicator()
        }
        socket.sendMessage({key:'CATEGORY_LIST', options})
    },

    onPlayStation: event => {
        event.preventDefault()

        let options = {
            id: event.currentTarget.dataset.stationId
        }
        socket.sendMessage({key: 'RADIO_PLAY_STATION', options})
    },

    onSetVolume: event => {
        event.preventDefault()

        let options = {
                set: event.currentTarget.dataset.volumeSet
            }
        socket.sendMessage({key: 'RADIO_VOLUME', options})
    },

    onPlayPause: event => {
        event.preventDefault()
        socket.sendMessage({key: 'RADIO_PLAYPAUSE'})
    },

    onImageError: event => {
        event.currentTarget.src = noImage
    }
  
}
