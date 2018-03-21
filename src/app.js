"use strict"

const riot = require('riot')
const socket = require('./lib/socket')

const app = require('./app.tag')

require('phonon/dist/css/phonon.min.css')
require('mdi/css/materialdesignicons.min.css')
require('./styles/app.css')

// phonon framework
require('phonon/dist/js/phonon-core')
require('phonon/dist/js/components/dialogs')
require('phonon/dist/js/components/notifications')
require('phonon/dist/js/components/panels')
require('phonon/dist/js/components/preloaders')
// workaround: phonon throws error "Snap is not defined". maybe a webpack issue? 
window.Snap = require('phonon/dist/js/components/side-panels')

// disable autoUpdate
// changes comes via websocket
riot.settings.autoUpdate = false

// connect websocket
socket.connect();

riot.mount('app', {socket})

