/**
 * VIEW ONCE CACHE - Captura de mídia em tempo real
 * Funciona como um cache de navegador: salva TUDO que passa pelo bot
 * Quando o utilizador usa !revelar, o bot procura no cache ANTES de tentar download
 */
'use strict';

const { downloadMediaMessage } = require('baileys-v6');

// Cache global: Map<chatJid, Map<stanzaId, { buf, tipo, mime, timestamp }>>
const viewOnceCache = new Map();
const CACHE_MAX_SIZE = 500; // Max 500 mensagens em cache
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos TTL

/**
 * Captura e guarda a mídia de QUALQUER mensagem no cache
 * Chamado IMEDIATAMENTE quando o bot recebe uma mensagem
 */
async function captureMedia(msg) {
  try {
    const chatJid = msg.key?.remoteJid;
    const stanzaId = msg.key?.id;
    if (!chatJid || !stanzaId) return;

    const message = msg.message;
    if (!message) return;

    // Desembrulhar view-once/ephemeral/edited
    let content = message;
    const wrappers = [
      'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension',
      'ephemeralMessage', 'editedMessage'
    ];
    
    for (const wrapper of wrappers) {
      if (content[wrapper]?.message) {
        content = content[wrapper].message;
      }
    }

    // Detectar tipo de mídia
    let tipo = null;
    let media = null;

    if (content.imageMessage) {
      tipo = 'image';
      media = content.imageMessage;
    } else if (content.videoMessage) {
      tipo = 'video';
      media = content.videoMessage;
    } else if (content.audioMessage || content.pttMessage) {
      tipo = 'audio';
      media = content.audioMessage || content.pttMessage;
    } else if (content.conversation || content.extendedTextMessage) {
      // View-once de texto (novidade WhatsApp 2025)
      tipo = 'text';
      media = content.conversation ? { text: content.conversation } : content.extendedTextMessage;
    }

    if (!tipo || !media) return;

    // Download da mídia
    let buf;
    try {
      buf = await downloadMediaMessage(msg, 'buffer', {});
    } catch (e) {
      console.log(`[ViewOnceCache] ⚠️ Download falhou para ${stanzaId}: ${e.message?.slice(0, 60)}`);
      return;
    }

    if (!buf || buf.length < 100) return;

    // Guardar no cache
    if (!viewOnceCache.has(chatJid)) {
      viewOnceCache.set(chatJid, new Map());
    }

    const chatCache = viewOnceCache.get(chatJid);
    chatCache.set(stanzaId, {
      buf,
      tipo,
      mime: media.mimetype || media.mimeType || (tipo === 'image' ? 'image/jpeg' : tipo === 'video' ? 'video/mp4' : 'audio/ogg'),
      timestamp: Date.now(),
    });

    // Limpar cache antigo
    if (chatCache.size > CACHE_MAX_SIZE) {
      const oldest = Array.from(chatCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      chatCache.delete(oldest[0]);
    }

    console.log(`[ViewOnceCache] ✅ Capturado: ${tipo} (${buf.length} bytes) de ${stanzaId}`);
  } catch (e) {
    console.log(`[ViewOnceCache] ⚠️ Erro: ${e.message?.slice(0, 80)}`);
  }
}

/**
 * Procura a mídia no cache pelo stanzaId
 * Retorna { buf, tipo, mime } ou null
 */
function getFromCache(chatJid, stanzaId) {
  const chatCache = viewOnceCache.get(chatJid);
  if (!chatCache) return null;

  const cached = chatCache.get(stanzaId);
  if (!cached) return null;

  // Verificar TTL
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    chatCache.delete(stanzaId);
    return null;
  }

  return cached;
}

/**
 * Limpa cache expirado (chamado periodicamente)
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [chatJid, chatCache] of viewOnceCache.entries()) {
    for (const [stanzaId, data] of chatCache.entries()) {
      if (now - data.timestamp > CACHE_TTL) {
        chatCache.delete(stanzaId);
      }
    }
    if (chatCache.size === 0) {
      viewOnceCache.delete(chatJid);
    }
  }
}

/**
 * Lista as últimas mídias capturadas num chat (para modo rápido)
 */
function getRecentCaptures(chatJid, limit = 10) {
  const chatCache = viewOnceCache.get(chatJid);
  if (!chatCache) return [];

  return Array.from(chatCache.entries())
    .map(([stanzaId, data]) => ({ stanzaId, ...data }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// Limpar cache a cada 5 minutos
setInterval(cleanExpiredCache, 5 * 60 * 1000);

module.exports = {
  captureMedia,
  getFromCache,
  getRecentCaptures,
  viewOnceCache,
};
