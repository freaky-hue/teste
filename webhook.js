/** * @description MeshCentral Webhook Plugin
* @author Your Name
* @copyright 
* @license Apache-2.0
* @version v1.0.0
*/

"use strict";

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 💥 CORRIGIDO: Exporta como 'webhook' para corresponder ao erro de carregamento.
module.exports.webhook = function (parent) {
    const plugin = {};
    plugin.parent = parent;
    plugin.meshServer = parent.meshServer;

    // REMOVIDO: parent.debug na inicialização para evitar o TypeError.

    const WEBHOOK_URL = 'http://192.168.1.147:1880/meshcentral';
    const REQUEST_TIMEOUT = 5000; // 5 segundos

    function sendWebhook(payload) {
        try {
            const data = JSON.stringify(payload);
            const url = new URL(WEBHOOK_URL);

            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                timeout: REQUEST_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const reqProtocol = url.protocol === 'https:' ? https : http;
            const req = reqProtocol.request(options);

            // Manipuladores de Log (Eles serão executados de forma segura dentro de callbacks)
            req.on('error', (err) => {
                //parent.debug('plugins', `[WEBHOOK ERROR - ${payload.event}] Connection error: ${err.message}`);
            });

            req.on('timeout', () => {
                req.destroy(); 
                //parent.debug('plugins', `[WEBHOOK ERROR - ${payload.event}] Timeout: No response within ${REQUEST_TIMEOUT}ms.`);
            });

            req.on('response', (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    //parent.debug('plugins', `[WEBHOOK FAILURE - ${payload.event}] Status: ${res.statusCode} ${res.statusMessage}`);
                } else {
                    //parent.debug('plugins', `[WEBHOOK SUCCESS - ${payload.event}] Status: ${res.statusCode}`);
                }
                res.resume();
            });

            req.write(data);
            req.end();

        } catch (e) {
            // Este catch deve ser seguro para parent.debug
            //parent.debug('plugins', `[WEBHOOK EXCEPTION - ${payload.event}] Code exception: ${e.message}`);
        }
    }

    // --- Registros de Eventos do Servidor MeshCentral ---

    plugin.meshServer.on('agentconnect', function (agent) {
        sendWebhook({ event: 'agentconnect', nodeid: agent.dbNodeKey, name: agent.name, domain: agent.domain, time: Date.now() });
    });

    plugin.meshServer.on('agentdisconnect', function (agent) {
        sendWebhook({ event: 'agentdisconnect', nodeid: agent.dbNodeKey, name: agent.name, domain: agent.domain, time: Date.now() });
    });

    plugin.meshServer.on('login', function (user) {
        sendWebhook({ event: 'login', userid: user._id, name: user.name, domain: user.domain, time: Date.now() });
    });

    return plugin;
};
