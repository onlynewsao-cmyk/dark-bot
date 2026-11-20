/**
 * DARK BOT v9.20 — Conversão de Visualização Única (View-Once)
 * ═══════════════════════════════════════════════════════════════
 *
 * Dois comandos:
 *
 * 1) !revelar / !salvarviewonce / !verviewonce / !unviewonce
 *    Converte uma mensagem de visualização única (citada) em mídia normal/visível.
 *    O utilizador responde à view-once com este comando e recebe a mesma mídia
 *    como mensagem regular (sem flag viewOnce), podendo guardar/encaminhar.
 *
 * 2) !toviewonce / !fotinha / !viewonce / !sohvisualizar
 *    Converte uma imagem/vídeo citada (ou enviada com o comando) em visualização
 *    única — a mensagem só pode ser aberta uma vez pelo destinatário.
 *
 * Fluxo:
 *  ┌────────────────────────┐         ┌─────────────────────┐
 *  │ Mensagem view-once     │ ──!revelar──▶  │ Mídia normal       │
 *  │ (citada pelo utilizador)│         │ (visível/guardável)  │
 *  └────────────────────────┘         └─────────────────────┘
 *
 *  ┌────────────────────────┐         ┌─────────────────────┐
 *  │ Imagem/Vídeo           │ ──!toviewonce──▶  │ Visualização única │
 *  │ (citada ou anexada)    │         │ (abre 1×)           │
 *  └────────────────────────┘         └─────────────────────┘
 */
'use strict';

const { downloadMediaMessage } = require('baileys-v6');

/**
 * Desembrulha view-once / ephemeral / edited para chegar ao media real.
 * Devolve o nó interno que contém imageMessage/videoMessage/audioMessage.
 */
function unwrapViewOnce(message) {
  if (!message || typeof message !== 'object') return null;
  // Níveis de wrapping possíveis
  const WRAPPERS = [
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'ephemeralMessage',
    'editedMessage',
    'documentWithCaptionMessage',
  ];
  let cur = message;
  for (let i = 0; i < 8 && cur; i++) {
    // Verifica se tem media directa
    if (cur.imageMessage || cur.videoMessage || cur.audioMessage) return cur;
    // Tenta desembrulhar
    let found = false;
    for (const w of WRAPPERS) {
      if (cur[w]?.message) {
        cur = cur[w].message;
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return null;
}

/**
 * Detecta se a mensagem (ou a mensagem citada) contém mídia de visualização única.
 */
function isViewOnceMedia(message) {
  const unwrapped = unwrapViewOnce(message);
  if (!unwrapped) return false;
  const img = unwrapped.imageMessage;
  const vid = unwrapped.videoMessage;
  // Tem viewOnce flag directa OU veio de wrapper viewOnce
  if (img?.viewOnce || vid?.viewOnce) return true;
  if (message?.viewOnceMessage || message?.viewOnceMessageV2) return true;
  return false;
}

/**
 * Obtém o media buffer e metadados de uma mensagem view-once.
 */
async function extractViewOnceMedia(msg) {
  const message = msg?.message || msg;
  const unwrapped = unwrapViewOnce(message);
  if (!unwrapped) return null;

  const isImage = !!unwrapped.imageMessage;
  const isVideo = !!unwrapped.videoMessage;
  const isAudio = !!unwrapped.audioMessage;
  if (!isImage && !isVideo && !isAudio) return null;

  // Download via Baileys — usa o msg original com a estrutura completa
  let buf = null;
  try {
    buf = await downloadMediaMessage(msg, 'buffer', {});
  } catch (e1) {
    try {
      // Fallback: tenta com a inner message re-wrapped
      const innerMsg = { message: unwrapped, key: msg.key || {} };
      buf = await downloadMediaMessage(innerMsg, 'buffer', {});
    } catch (e2) {
      return null;
    }
  }
  if (!buf || buf.length < 100) return null;

  const mediaNode = unwrapped.imageMessage || unwrapped.videoMessage || unwrapped.audioMessage;
  const caption = mediaNode.caption || '';
  const mimetype = mediaNode.mimetype || (isImage ? 'image/jpeg' : isVideo ? 'video/mp4' : 'audio/ogg');

  return { buf, isImage, isVideo, isAudio, caption, mimetype };
}

/**
 * Obtém a mídia de uma mensagem normal (para converter para view-once).
 */
async function extractRegularMedia(msg) {
  const message = msg?.message || msg;
  const unwrapped = unwrapViewOnce(message);
  if (!unwrapped) return null;

  const isImage = !!unwrapped.imageMessage;
  const isVideo = !!unwrapped.videoMessage;
  if (!isImage && !isVideo) return null;

  let buf = null;
  try {
    buf = await downloadMediaMessage(msg, 'buffer', {});
  } catch {
    try {
      const innerMsg = { message: unwrapped, key: msg.key || {} };
      buf = await downloadMediaMessage(innerMsg, 'buffer', {});
    } catch {
      return null;
    }
  }
  if (!buf || buf.length < 100) return null;

  const mediaNode = unwrapped.imageMessage || unwrapped.videoMessage;
  const caption = mediaNode.caption || '';
  const mimetype = mediaNode.mimetype || (isImage ? 'image/jpeg' : 'video/mp4');

  return { buf, isImage, isVideo, caption, mimetype };
}

module.exports = function registerViewOnceConvertCases(registerCase) {

  // ════════════════════════════════════════════════════════════════════
  // !revelar / !salvarviewonce / !verviewonce / !unviewonce
  // Converte view-once → mídia normal (visível e guardável)
  // Uso: Responder a uma mensagem de visualização única com o comando
  // ════════════════════════════════════════════════════════════════════
  registerCase(['revelar', 'salvarviewonce', 'verviewonce', 'unviewonce', 'reveal'], async ({ m, sock, ctx, reply, react }) => {
    // Precisa de uma mensagem citada (quoted)
    if (!m.quoted?.message) {
      return reply('👁️ *REVELAR* — Responde a uma mensagem de *visualização única* com este comando para a converter em mídia normal.\n\n_Exemplo: responde à foto de visão única com_ `!revelar`');
    }

    const quotedMessage = m.quoted.message;

    // Verifica se é view-once
    if (!isViewOnceMedia(quotedMessage)) {
      return reply('❌ Essa mensagem não é de *visualização única*!\n\n*💡 Dica:*\n• `!revelar` → converte view-once 👁️ em normal\n• `!toviewonce` → converte normal em view-once 👁️\n\n_Responde a uma mensagem com o ícone 👁️ para a revelar._');
    }

    react('⏳');

    try {
      // Extrai o buffer da mídia
      const media = await extractViewOnceMedia(m.quoted.msg || m.quoted);
      if (!media) {
        react('❌');
        return reply('❌ Não consegui extrair a mídia. Pode ter expirado ou estar corrompida.');
      }

      react('✅');

      // Re-envia como mensagem NORMAL (sem viewOnce flag)
      if (media.isImage) {
        await sock.sendMessage(ctx.remoteJid, {
          image: media.buf,
          caption: `🔓 *Revelada* — visualização única → normal${media.caption ? `\n\n_${media.caption}_` : ''}`,
          mimetype: media.mimetype,
        }, { quoted: m.msg });
      } else if (media.isVideo) {
        await sock.sendMessage(ctx.remoteJid, {
          video: media.buf,
          caption: `🔓 *Revelada* — visualização única → normal${media.caption ? `\n\n_${media.caption}_` : ''}`,
          mimetype: media.mimetype,
        }, { quoted: m.msg });
      } else if (media.isAudio) {
        await sock.sendMessage(ctx.remoteJid, {
          audio: media.buf,
          mimetype: media.mimetype,
          ptt: false, // Envia como áudio normal, não nota de voz
          caption: `🔓 *Revelada* — áudio de visualização única → normal`,
        }, { quoted: m.msg });
      } else {
        return reply('❌ Tipo de mídia não suportado.');
      }

    } catch (e) {
      react('❌');
      console.error('[ViewOnceConvert] revelar error:', e.message?.slice(0, 200));
      return reply('❌ Erro ao revelar: ' + (e.message?.slice(0, 100) || 'desconhecido'));
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // !toviewonce / !fotinha / !viewonce / !sohvisualizar
  // Converte mídia normal → visualização única
  // Uso: Responder a uma imagem/vídeo com o comando, ou enviar com a mídia
  // ════════════════════════════════════════════════════════════════════
  registerCase(['toviewonce', 'fotinha', 'viewonce', 'sohvisualizar', 'tofo'], async ({ m, sock, ctx, reply, react }) => {
    const raw = m.msg?.message || {};
    const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;

    // Determina a fonte de mídia: quoted ou mensagem directa
    let srcMsg = null;
    let srcMessage = null;

    if (quoted && (quoted.imageMessage || quoted.videoMessage)) {
      // Respondeu a uma mensagem com mídia
      srcMsg = m.quoted?.msg || { message: quoted, key: { remoteJid: ctx.remoteJid, fromMe: false } };
      srcMessage = quoted;
    } else if (raw.imageMessage || raw.videoMessage) {
      // Envióu mídia directamente com o comando
      srcMsg = m.msg;
      srcMessage = raw;
    }

    if (!srcMsg || !srcMessage) {
      return reply('📸 *TO VIEW ONCE* — Converte imagem ou vídeo em *visualização única* (abre 1×).\n\n*Usos:*\n• Responde a uma foto/vídeo com `!toviewonce`\n• Envia foto/vídeo com legenda `!toviewonce`');
    }

    react('⏳');

    try {
      const media = await extractRegularMedia(srcMsg);
      if (!media) {
        react('❌');
        return reply('❌ Não consegui extrair a mídia. Verifica se é uma imagem ou vídeo válido.');
      }

      react('✅');

      // Re-envia com flag viewOnce: true
      if (media.isImage) {
        await sock.sendMessage(ctx.remoteJid, {
          image: media.buf,
          caption: media.caption || '',
          viewOnce: true,
          mimetype: media.mimetype,
        }, { quoted: m.msg });
      } else if (media.isVideo) {
        await sock.sendMessage(ctx.remoteJid, {
          video: media.buf,
          caption: media.caption || '',
          viewOnce: true,
          mimetype: media.mimetype,
        }, { quoted: m.msg });
      } else {
        return reply('❌ Apenas imagens e vídeos podem ser convertidos para visualização única.');
      }

    } catch (e) {
      react('❌');
      console.error('[ViewOnceConvert] toviewonce error:', e.message?.slice(0, 200));
      return reply('❌ Erro ao converter: ' + (e.message?.slice(0, 100) || 'desconhecido'));
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // !listviewonce — Lista view-once recentes guardadas pela AURA
  // ════════════════════════════════════════════════════════════════════
  registerCase(['listviewonce', 'verviewonces', 'historicoviewonce'], async ({ m, ctx, reply }) => {
    try {
      const viewOnceMod = require('../../aura/auraViewOnce');
      const recent = viewOnceMod.getRecentViewOnce(ctx.remoteJid, 10);
      if (!recent.length) {
        return reply('👁️ Nenhuma mensagem de visualização única guardada neste chat recentemente.');
      }
      const lines = recent.map((r, i) => {
        const ts = new Date(r.timestamp).toLocaleTimeString('pt-PT', { timeZone: 'Africa/Luanda', hour: '2-digit', minute: '2-digit' });
        return `${i + 1}. *${r.type}* de ${r.pushName} às ${ts}${r.caption ? ` — "${r.caption}"` : ''}`;
      });
      return reply(`👁️ *View-once recentes neste chat:*\n\n${lines.join('\n')}\n\n💡 Usa !revelar (respondendo à view-once) para converter.`);
    } catch (e) {
      return reply('❌ Erro ao consultar histórico: ' + (e.message?.slice(0, 80) || 'desconhecido'));
    }
  });
};
