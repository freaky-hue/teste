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


console.log("Carregadooo");


// 💥 Solução para o TypeError: A função deve ser exportada sob o nome curto ('webhook').
module.exports.sample = function (parent) {
  const plugin = {};
  plugin.parent = parent;
  plugin.meshServer = parent.meshServer;

  parent.debug('plugins', 'Webhook plugin loaded successfully.');
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

      // 1. Manipulador de Erro de Conexão
      req.on('error', (err) => {
        // Registra erros de rede (DNS falhou, conexão recusada)
        parent.debug('plugins', `[WEBHOOK ERROR - ${payload.event}] Connection error: ${err.message}`);
      });

      // 2. Manipulador de Tempo Limite (Timeout)
      req.on('timeout', () => {
        req.destroy(); // Aborta a requisição
        parent.debug('plugins', `[WEBHOOK ERROR - ${payload.event}] Timeout: No response within ${REQUEST_TIMEOUT}ms.`);
      });

      // 3. Manipulador de Resposta (Recebe o retorno do servidor)
      req.on('response', (res) => {
        // Verifica códigos HTTP fora da faixa 2xx
        if (res.statusCode < 200 || res.statusCode >= 300) {
          parent.debug('plugins', `[WEBHOOK FAILURE - ${payload.event}] Status: ${res.statusCode} ${res.statusMessage}`);
        } else {
          parent.debug('plugins', `[WEBHOOK SUCCESS - ${payload.event}] Status: ${res.statusCode}`);
        }
        res.resume(); // Consome a resposta para evitar vazamento de memória
      });

      req.write(data);
      req.end();

    } catch (e) {
      // Registra exceções no código (como URL inválido)
      parent.debug('plugins', `[WEBHOOK EXCEPTION - ${payload.event}] Code exception: ${e.message}`);
    }
  }

  // --- Registros de Eventos do Servidor MeshCentral ---

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
    // ADICIONE ESTA LINHA TEMPORARIAMENTE
    parent.debug('plugins', '>>> AGENT DISCONNECT EVENT FIRED! Node ID: ' + agent.dbNodeKey);

    sendWebhook({
      event: 'agentdisconnect',
      // ... restante do payload
    });
  });
  /*
  
    plugin.meshServer.on('agentdisconnect', function (agent) {
      // Este é o evento que é acionado quando o AGENTE (dispositivo) desliga ou perde a conexão.
      sendWebhook({
        event: 'agentdisconnect',
        nodeid: agent.dbNodeKey,
        name: agent.name,
        domain: agent.domain,
        time: Date.now()
      });
    });
  
    */

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