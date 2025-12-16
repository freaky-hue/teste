

module.exports.webhook = function (parent) {
    const plugin = {};
    plugin.parent = parent;
    plugin.meshServer = parent.meshServer;
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    parent.debug('plugins', 'Webhook plugin loaded');

    const WEBHOOK_URL = 'http://192.168.1.147:1880/meshcentral';

    function sendWebhook(payload) {
        try {
            const data = JSON.stringify(payload);
            const url = new URL(WEBHOOK_URL);

            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = (url.protocol === 'https:' ? https : http).request(options);
            req.on('error', (err) => {
                parent.debug('plugins', 'Webhook error: ' + err.message);
            });
            req.write(data);
            req.end();
        } catch (e) {
            parent.debug('plugins', 'Webhook exception: ' + e.message);
        }
    }

    plugin.meshServer.on('agentconnect', function (agent) {
        sendWebhook({
            event: 'agentconnect',
            nodeid: agent.dbNodeKey,
            name: agent.name,
            domain: agent.domain,
            time: Date.now()
        });
    });

    plugin.meshServer.on('agentdisconnect', function (agent) {
        sendWebhook({
            event: 'agentdisconnect',
            nodeid: agent.dbNodeKey,
            name: agent.name,
            domain: agent.domain,
            time: Date.now()
        });
    });

    plugin.meshServer.on('login', function (user) {
        sendWebhook({
            event: 'login',
            userid: user._id,
            name: user.name,
            domain: user.domain,
            time: Date.now()
        });
    });

    return plugin;
};

