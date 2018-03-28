<stationlist>
    <ul class="list station-list">
        <li each={opts.stationList.data} class="station-row {playable.toLowerCase()}">
            <span class="pull-right">
                <button class="btn icon mdi mdi-play with-circle" onclick="{action.onPlayStation}" data-station-id="{id}"></button>
            </span>
            <span class="pull-left">
                <img class="station-logo" src="{getStationImageUrl(this)}" onerror="{action.onImageError}">
            </span>
            <div class="station-info" onclick="{action.onGetStationDetails}" data-station-id="{id}">
                <span class="title">{name}</span>
                <span class="subline">{genresAndTopics}</span>
            </div>
        </li>
    </ul>
    <div class="padded-full" if="{opts.stationList.nextOffset}" onclick="{nextPage}">
        <div class="circle-progress active" id="my-circle" style="visibility: visible;">
            <div class="spinner"></div>
        </div>
        <div class="padded-bottom"></div>
    </div>
    <script>
this.action = require('../lib/action')
this.getStationImageUrl = this.parent.getStationImageUrl
    </script>
</stationlist>
