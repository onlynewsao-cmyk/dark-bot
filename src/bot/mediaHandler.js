const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const https = require('https');
const http = require('http');

async function downloadFromMessage(msg) {
  return downloadMediaMessage(msg, 'buffer', {});
}

function fetchBuffer(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36' },
      timeout: 60000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirects <= 0) return reject(new Error('Too many redirects'));
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return fetchBuffer(next, redirects - 1).then(resolve, reject);
      }
      if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchJson(url) {
  const buf = await fetchBuffer(url);
  try { return JSON.parse(buf.toString('utf-8')); }
  catch (e) { throw new Error('JSON inválido'); }
}

// Envia vídeo MP4 de forma que fique salvo no celular
async function sendVideoMp4(sock, jid, videoSource, caption = '', quoted = null) {
  jid = normalizeJid(jid);
  
  try {
    let videoData;
    
    if (typeof videoSource === 'string') {
      // É uma URL - baixa primeiro para enviar como buffer (melhor para salvar no celular)
      try {
        const buffer = await fetchBuffer(videoSource);
        videoData = buffer;
      } catch {
        // Se não conseguir baixar, envia por URL mesmo assim
        videoData = { url: videoSource };
      }
    } else {
      // Já é um buffer
      videoData = videoSource;
    }

    await sock.sendMessage(jid, {
      video: videoData,
      mimetype: 'video/mp4',
      caption: caption || ''
    }, { quoted });
    
    return true;
  } catch (e) {
    // Fallback simples
    await sock.sendMessage(jid, {
      video: typeof videoSource === 'string' ? { url: videoSource } : videoSource,
      caption: caption || ''
    }, { quoted });
    return false;
  }
}

// Envia link via botão (anti-antilink)
async function sendSafeLink(sock, jid, text, url, quoted = null) {
  jid = normalizeJid(jid);
  try {
    await sock.sendMessage(jid, {
      text: text || 'Clique no botão abaixo:',
      templateButtons: [
        {
          index: 1,
          urlButton: {
            displayText: '🔗 Abrir Link',
            url: url
          }
        }
      ],
      footer: 'Dark Bot'
    }, { quoted });
    return true;
  } catch (e) {
    await sock.sendMessage(jid, { text: `${text}\n${url}` }, { quoted });
    return false;
  }
}

function normalizeJid(jid) {
  if (!jid) return jid;
  if (jid.includes('@lid')) return jid;
  if (jid.includes('@s.whatsapp.net')) return jid;
  if (jid.includes('@g.us')) return jid;
  return jid + '@s.whatsapp.net';
}

function formatJidForDisplay(jid) {
  if (!jid) return 'Desconhecido';
  const clean = jid.split('@')[0];
  if (jid.includes('@lid')) return `@${clean}`;
  if (jid.includes('@s.whatsapp.net')) return `@${clean}`;
  return clean;
}

async function fetchMediafire(url) {
  try {
    const page = await fetchBuffer(url);
    const html = page.toString('utf-8');
    const match = html.match(/https:\/\/download[^"'\s]+mediafire[^"'\s]+/i) || 
                  html.match(/href=["'](https?:\/\/[^"']+download[^"']+)["']/i);
    if (match) {
      const directUrl = match[1] || match[0];
      return await fetchBuffer(directUrl);
    }
    return await fetchBuffer(url);
  } catch (e) {
    throw new Error('Não foi possível baixar do MediaFire');
  }
}

module.exports = {
  downloadFromMessage,
  fetchBuffer,
  fetchJson,
  sendVideoMp4,
  sendSafeLink,
  normalizeJid,
  formatJidForDisplay,
  fetchMediafire
};