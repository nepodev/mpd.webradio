"use strict";

import ReconnectingWebSocket from 'reconnecting-websocket'

var socket = null
var listener = []
var messageQueue = []

if (socket === null) {
}

const connect = () => {
    if (socket !== null) {
        socket.close(1000, 'Someone called connect again', {keepClosed: false})
        return
    }
    var lo = window.location,
        url = (lo.protocol === 'https:' ? 'wss://' : 'ws://');
    url += lo.hostname + (lo.port ? ':' + lo.port : '');
    url += (lo.pathname.substr(-5) === '.html') ? lo.pathname.match(/.*\//)[0] : lo.pathname;
    
    socket =  new ReconnectingWebSocket(url);
    socket.onopen = () => {
        while (messageQueue.length > 0) {
            socket.send(messageQueue.shift())
        }
    }
    socket.onmessage = (event) => {
        var data = {}
        try {
            data = JSON.parse(event.data);
        }
        catch(err) {
            data.error = err;
            console.log(err)
        }
        dispatchMessage(data)
    }
}

function onMessage(callback) {
    listener.push({callback});
}

function dispatchMessage(data) {
    listener.forEach(item => item.callback(data))
}

function sendMessage(data) {
    var message = JSON.stringify(data);
    if (socket.readyState === socket.OPEN) {
        socket.send(message);
    }
    else {
        messageQueue.push(message);
    }
}


module.exports = {
    connect,
    onMessage,
    sendMessage
}

