<stationinfo>
    <div id="station-info-panel" class="panel" >
        <header class="header-bar">
            <a class="btn icon mdi mdi-close pull-right" href="#" data-panel-close="true"></a>
            <h1 class="title center">Station Info</h1>
        </header>

        <div class="content">
            <div id="station-details" class="station-details {opts.station.playable && opts.station.playable.toLowerCase()}">
                <h2 class="station-name center">{opts.station.name}</h2>
                <p class="station-logo center" if="{opts.station.id}">
                    <img class="station-logo" src="{getStationImageUrl(opts.station)}" onerror="{action.onImageError}">
                </p>
                <p class="station-action center">
                    <button class="btn icon with-circle mdi {isPlaying ? 'mdi-pause' : 'mdi-play'}" onclick="{onPlayStation}" data-station-id="{opts.station.id}"></button>
                    <button onclick="{onToggleFavorite}" class="btn icon  with-circle mdi {opts.station._favorite ? 'mdi-heart' : 'mdi-heart-outline'}"  data-station-id="{opts.station.id}"></button>
                </p>
                <p class="center">{opts.station._currentTitle}</p>
                <p if="{opts.station.genres}" class="station-genre center">{opts.station.genres.join(', ')}</p>
                <p if="{opts.station.description}" class="station-desc">{opts.station.description}</p>
            </div>
        </div>
    </div>
    <script>
this.action = require('../lib/action')

this.isPlaying = false

this.getStationImageUrl = this.parent.getStationImageUrl

this.onToggleFavorite = event => {
    if (opts.station._favorite) {
        this.action.removeFavorite(opts.station.id)
    }
    else {
        this.action.addFavorite(opts.station.id)
    }
}

this.onPlayStation = event => {
    if (this.isPlaying) {
        this.action.onPlayPause(event)
    }
    else {
        this.action.onPlayStation(event)
    }
}

this.on('update', event => {
    try {
        this.isPlaying = (opts.radio.state == 'play' && opts.station.streamURL === opts.radio.file)
    }
    catch (err) {   }
})
</stationinfo>
