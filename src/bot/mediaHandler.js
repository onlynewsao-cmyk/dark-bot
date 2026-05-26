const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const https = require('https');
const http = require('http');

async function downloadFromMessage(msg) {
  return downloadMediaMessage(msg, 'buffer', {});
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

module.exports = { downloadFromMessage, fetchBuffer };
