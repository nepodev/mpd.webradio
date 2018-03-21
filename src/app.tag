<app>
    <sidepanel></sidepanel>

    <stationinfo station="{station}" radio="{radio}"></stationinfo>

    <home data-page="true">
        <header class="header-bar">
            <button class="btn icon mdi mdi-menu pull-left show-for-phone-only" data-side-panel-id="side-panel-menu"></button>
            <form id="search-stations" action="" onsubmit="{onSubmitSearch}">
                <input type="search" ref="query" name="query" class="pull-left search-input" placeholder="Search">
                <button type="submit" class="btn pull-right icon mdi mdi-magnify"></button>
            </form>
        </header>
    
        <footer class="footer-bar">
            <div class="radio">
                <img src="{getStationImageUrl(radioStation)}" onerror="{action.onImageError}" class="radio-image" onclick="{onShowRadioStation}">
                <div class="row">
                    <div class="phone-6 tablet-7 column" onclick="{onShowRadioStation}">
                        <div style="overflow:hidden;">
                            <div class="radio-status-title">{getRadioInfo('title')}</div>
                            <div class="radio-status-name">{getRadioInfo('name')}</div>
                        </div>
                    </div>
                    <div class="phone-6 tablet-4 column radio-control">
                        <div class="pull-right">
                            <button onclick="{action.onPlayPause}" class="btn icon mdi {radio.state == 'play' ? 'mdi-pause' : 'mdi-play'}"></button>
                            <button onclick="{action.onSetVolume}" data-volume-set="down" class="btn icon icon mdi mdi-volume-medium"></button>
                            <button onclick="{action.onSetVolume}" data-volume-set="up" class="btn icon mdi mdi-volume-high"></button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
        <div class="content" onscroll="{onScrollStationList}">
            <stationlist show="{(visibleList == 'stationlist')}" station-list="{stationList}"></stationlist>
            <categorylist show="{(visibleList == 'categorylist')}" category-list="{categoryList}"></categorylist>
        </div>
    </home>
    <script>
require('./tag/sidepanel.tag')
require('./tag/stationinfo.tag')
require('./tag/stationlist.tag')
require('./tag/categorylist.tag')

this.action = require('./lib/action')

this.radio = {}
this.radioStation = {}
this.station = {}
this.stationList = {
    data: [],
    options: {},
    nextOffset: 1
}
this.categoryList = {
    data: [],
    opitions: {category:''}
}

this.visibleList = 'stationlist'

const onMessage = function(message) {
    let {key, options, data, error} = message;
    if (error) {
        // @todo display failure
        return
    }
    switch (key)
    {
        case 'CATEGORY_LIST':
            this.visibleList = 'categorylist'
            this.categoryList = {data, options}
            document.querySelector('stationlist').parentNode.scrollTop = 0
            break;

        case 'RADIO_STATUS':
            this.radio = data || {}
            if (this.radio.file == this.station.streamURL) {
                // change the current track when stationinfo panel is open
                this.station._currentTitle = this.radio.Title
            }
            if (this.radio.file == this.radioStation.streamURL) {
                this.radioStation._currentTitle = this.radio.Title
            }
            else {
                // station has changed
                opts.socket.sendMessage({key: 'STATION_DETAILS', options:{reason: "radioStation", url: this.radio.file}})
            }
            break

        case 'STATION_DETAILS':
            if (! data) {
                phonon.notif('Stationinfo not available.', 3000, true, 'CANCEL');
                return
            }
            if (options.reason == "radioStation" && this.radio.file == data.streamURL) {
                this.radioStation = data
                this.radioStation._currentTitle = this.radio.Title
            }
            else {
                this.station = data
                if (this.station.streamURL == this.radio.file) {
                    this.station._currentTitle = this.radio.Title
                }
                phonon.panel('#station-info-panel').open();
            }
            break
            
        case 'STATION_LIST':
            this.visibleList = 'stationlist'
            let nextOffset = null
            if (options.limit && data.length == options.limit) {
                nextOffset = options.offset + options.limit
            }

            if (options.offset && options.offset > 0) {
                // get the next page
                data = this.stationList.data.concat(data)
            }
            else {
                document.querySelector('stationlist').parentNode.scrollTop = 0
            }
            this.stationList = {data, options, nextOffset}

            if (options.type != 'search') {
                this.refs.query.value=''
            }
            break

        case 'FAV_REMOVE':
        case 'FAV_ADD':
            if (this.stationList.options.type == 'favorite') {
                // the displayed list had changed
                this.stationList.data = data;
            }
            if (this.station.id) {
                this.station._favorite = (data.filter(item => item.id == this.station.id).shift() ? true : false)
            }
            if (this.radioStation.id) {
                this.radioStation._favorite = (data.filter(item => item.id == this.radioStation.id).shift() ? true : false)
            }
            break

        default:
            return
    }
    this.update()
}.bind(this)

opts.socket.onMessage(onMessage)
opts.socket.sendMessage({key: 'RADIO_STATUS'})
opts.socket.sendMessage({key: 'STATION_LIST', options: {type:'local'}})

this.getRadioInfo = (info) => {
    if (! this.radio.state) {
        // not connected to mpd
        return 'Not connected'
    }
    else if (this.radio.error) {
        // mpd error message
        return this.radio.error
    }
    else if (info == 'title') {
        return this.radio.Title
    }
    else if (info == 'name') {
        return this.radio.Name
    }
    else {
        // playig title and name of current station
        return this.radio.Title + ' (' + this.radio.Name + ')'
    }
}

this.onShowRadioStation = event => {
    this.station = this.radioStation
    phonon.panel('#station-info-panel').open();
    this.update()
}

this.onScrollStationList = event => {
    if (this.stationList.nextOffset && this.visibleList == 'stationlist') {
        let elem = event.currentTarget
        if ((elem.scrollHeight - elem.scrollTop - elem.clientHeight) === 0) {
            let options = Object.assign(this.stationList.options, {offset: this.stationList.nextOffset})
            opts.socket.sendMessage({key: "STATION_LIST", options})
        }
    }
}

this.onSubmitSearch = event => {
    event.preventDefault()
    if (! this.refs.query.value) {
        return
    }
    this.refs.query.blur()
    let options = {
        type: "search",
        query: this.refs.query.value,
        offset: 0,
        limit: 50
    }
    this.action.openIndicator()
    opts.socket.sendMessage({key: "STATION_LIST", options})
}


this.getStationImageUrl = station => {
    let thumb = ''
    if (station.picture4TransName) {
        thumb = station.picture4TransName
    }
    else if (station.picture4Name) {
        thumb = station.picture4Name
    }
    else if (station.picture1TransName) {
        thumb = station.picture1TransName.replace('_1_', '_4_')
    }
    else if (station.picture1Name) {
        thumb = station.picture1Name.replace('_1_', '_4_')
    }
    return station.pictureBaseURL + thumb
}

this.on('mount', event => {
    // start phonon
    phonon.options({
        navigator: {
            defaultPage: 'home',
            animatePages: true,
            enableBrowserBackButton: true
        },
        i18n: null // for this example, we do not use internationalization
    })
    phonon.navigator().start();
})


    </script>
</app>
