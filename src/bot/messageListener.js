/**
 * Listener de mensagens para:
 * - Anti-delete (salvar mensagens antes que sejam apagadas)
 * - Modo espião (emite tudo pro dashboard)
 */
const DeletedMessage = require('../database/models/DeletedMessage');
const AntiStatus = require('../database/models/AntiStatus');
const botConfigCache = require('./botConfigCache');

// Cache de mensagens recentes (para recuperar quando apagadas)
const messageCache = new Map();
const MAX_CACHE = 2000;

// Cache para AntiStatus (evita query excessiva)
const antiStatusCache = new Set();
async function refreshAntiStatusCache() {
  try {
    const list = await AntiStatus.find({ enabled: true });
    antiStatusCache.clear();
    list.forEach(item => antiStatusCache.add(item.groupJid));
  } catch (e) {}
}
// Refresh inicial e a cada 2 min
refreshAntiStatusCache();
setInterval(refreshAntiStatusCache, 120000);

function extractText(msg) {
  const m = msg.message;
  return m?.conversation || m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption || m?.videoMessage?.caption ||
    m?.documentMessage?.caption || '';
}

function detectMediaType(msg) {
  const m = msg.message;
  if (m?.imageMessage) return 'image';
  if (m?.videoMessage) return 'video';
  if (m?.audioMessage) return 'audio';
  if (m?.documentMessage) return 'document';
  if (m?.stickerMessage) return 'sticker';
  return '';
}

async function onUpsert(sock, m, io) {
  try {
    const msg = m.messages?.[0];
    if (!msg || !msg.message) return;

    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid?.endsWith('@g.us');
    const msgType = Object.keys(msg.message)[0];

    // --- LÓGICA ANTI-STATUS ---
    if (isGroup && antiStatusCache.has(remoteJid)) {
      const isStatus = msgType === 'groupStatusMessageV2' || 
                       msgType === 'groupStatusMessage' || 
                       msg.message?.groupStatusMessageV2 ||
                       JSON.stringify(msg.message).includes('"isGroupStatus":true');

      if (isStatus && !msg.key.fromMe) {
        await sock.sendMessage(remoteJid, { delete: msg.key }).catch(() => {});
        return; 
      }
    }

    // Cache em memória
    if (messageCache.size > MAX_CACHE) {
      const firstKey = messageCache.keys().next().value;
      messageCache.delete(firstKey);
    }
    messageCache.set(msg.key.id, msg);

    if (msg.key.fromMe) return;
    const fromJid = isGroup ? msg.key.participant : remoteJid;
    const fromNumber = fromJid?.split('@')[0] || '';

    // Anti-delete: salva no MongoDB (TTL 7d) - usa cache
    const antideleteOn = await botConfigCache.get('antidelete_enabled', false);
    if (antideleteOn) {
      try {
        await DeletedMessage.findOneAndUpdate(
          { messageId: msg.key.id },
          {
            messageId: msg.key.id,
            groupJid: isGroup ? remoteJid : '',
            fromJid, fromNumber, fromName: msg.pushName || '',
            text: extractText(msg), mediaType: detectMediaType(msg),
            raw: msg,
          },
          { upsert: true }
        );
      } catch (e) {}
    }

    // Espião - usa cache
    const spyOn = await botConfigCache.get('spy_enabled', false);
    if (spyOn && io) {
      io.emit('bot:spy', {
        time: new Date().toISOString(),
        from: msg.pushName || fromNumber,
        group: isGroup ? remoteJid : 'PV',
        text: extractText(msg).slice(0, 200),
        media: detectMediaType(msg),
      });
    }
  } catch (e) { console.error('messageListener:', e); }
}

async function onDelete(sock, update, io) {
  try {
    const antideleteOn = await botConfigCache.get('antidelete_enabled', false);
    if (!antideleteOn) return;

    const ownerNum = require('../config').owner.number;
    const ownerJid = ownerNum + '@s.whatsapp.net';

    for (const item of update) {
      if (!item.key?.id) continue;
      const saved = await DeletedMessage.findOne({ messageId: item.key.id });
      if (!saved) continue;
      saved.deletedAt = new Date();
      await saved.save();

      // Envia pro dono em PV
      const groupName = item.key.remoteJid?.endsWith('@g.us') ? `(grupo ${item.key.remoteJid})` : '(PV)';
      const text = `👻 *MSG APAGADA RECUPERADA*\n\n` +
                   `👤 De: ${saved.fromName || saved.fromNumber}\n` +
                   `📍 Onde: ${groupName}\n` +
                   `🕐 Quando: ${new Date().toLocaleString('pt-BR')}\n\n` +
                   `💬 *Conteúdo:*\n${saved.text || '[' + saved.mediaType + ']'}`;
      try { await sock.sendMessage(ownerJid, { text }); } catch (e) {}
      if (io) io.emit('bot:deleted', { from: saved.fromName, text: saved.text, time: new Date() });
    }
  } catch (e) { console.error('onDelete:', e); }
}

module.exports = { onUpsert, onDelete, messageCache };
