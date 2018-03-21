<sidepanel>
    <div class="side-panel side-panel-left" data-expose-aside="left" data-nodrag="home" data-page="home" id="side-panel-menu">
        <header class="header-bar">
            <button class="btn pull-right icon mdi mdi-close show-for-phone-only" data-side-panel-close="true"></button>
            <div class="pull-left">
                <h1 class="title">MPD.Webradio</h1>
            </div>
        </header>
        <div class="content">
            <ul class="list">
                <li><a onclick="{onGetStationList}" data-list-type="favorite" data-side-panel-close="true" class="padded-list">Favorites</a></li>
                <li><a onclick="{onGetStationList}" data-list-type="recent" data-side-panel-close="true" class="padded-list">Recent Stations</a></li>
                <li><a onclick="{onGetStationList}" data-list-type="top" data-indicator="true" data-side-panel-close="true" class="padded-list">Top Stations</a></li>
                <li><a onclick="{onGetStationList}" data-list-type="local" data-indicator="true" data-side-panel-close="true" class="padded-list">Local Stations</a></li>
                <li><div class="padded-bottom"></div></li>
                <li><a onclick="{onGetCategoryList}" data-list-category="genre" data-indicator="true" data-side-panel-close="true" class="padded-list">Genres</a></li>
                <li><a onclick="{onGetCategoryList}" data-list-category="topic" data-indicator="true" data-side-panel-close="true" class="padded-list">Topics</a></li>
                <li><a onclick="{onGetCategoryList}" data-list-category="country" data-indicator="true" data-side-panel-close="true" class="padded-list">Countries</a></li>
                <li><a onclick="{onGetCategoryList}" data-list-category="language" data-indicator="true" data-side-panel-close="true" class="padded-list">Languages</a></li>
            </ul>
        </div>
    </div>
    <script>
this.onGetStationList = this.parent.action.onGetStationList
this.onGetCategoryList = this.parent.action.onGetCategoryList
    </script>
</sidepanel>
