<categorylist>
    <ul class="list">
        <li each="{name, i in opts.categoryList.data}">
            <a href="#" onclick="{onSearchStation}" data-category="{opts.categoryList.options.category}" data-query="{name}" class="padded-list">
                {name}
            </a>
        </li>
    </ul>
    <script>
this.onSearchStation = event => {
    event.preventDefault()
    let elem = event.currentTarget,
        options = {
            type: "category",
            category: elem.dataset.category,
            query: elem.dataset.query,
            offset: 0,
            limit: 50
        }
    this.parent.action.openIndicator()
    this.parent.opts.socket.sendMessage({key: "STATION_LIST", options})
}
    </script>
</categorylist>