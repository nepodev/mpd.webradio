'use strict'

const Rd = require('./server/lib/radionet')

Rd.init({language: 'german'})

const start = async () => {
    let res
    // let res = await Rd.getGenres()
    // console.log(res)

    res = await Rd.getStationsByGenre('Ska')
    //res = await Rd.getStation(14277)
    //res = await Rd.searchStationsByString('ska')
    console.log(res, '----')
    // let station = res.categories[0].matches[5]
    // let thumbnail
    //     ['logo300x300', 'logo175x175', 'logo100x100', 'logo44x44'].some(key => {
    //         if (station[key]) {
    //             thumbnail = station[key]
    //             return true
    //         }
    //     })
    //     console.log(thumbnail)
    //     let t = [ { matchHighlights: [], value: 'Reggae' },
    //  'str' ]

    //  console.log(typeof t[1] === 'object')
}

start()
