

module.exports.webhook = function (parent) {
    const plugin = {};
    plugin.parent = parent;
    plugin.meshServer = parent.meshServer;
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    const WEBHOOK_URL = 'http://192.168.1.147:1880/meshcentral';

    return plugin;
};

