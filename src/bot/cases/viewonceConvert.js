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
 * Usa múltiplos fallbacks: 1) Aura saved, 2) Baileys download, 3) Direct URL
 */
async function extractViewOnceMedia(msg) {
  const message = msg?.message || msg;
  const unwrapped = unwrapViewOnce(message);
  if (!unwrapped) return null;

  const isImage = !!unwrapped.imageMessage;
  const isVideo = !!unwrapped.videoMessage;
  const isAudio = !!unwrapped.audioMessage;
  if (!isImage && !isVideo && !isAudio) return null;

  const mediaNode = unwrapped.imageMessage || unwrapped.videoMessage || unwrapped.audioMessage;
  const caption = mediaNode.caption || '';
  const mimetype = mediaNode.mimetype || (isImage ? 'image/jpeg' : isVideo ? 'video/mp4' : 'audio/ogg');

  // === FALLBACK 1: Verificar se o AuraViewOnce já salvou esta mídia ===
  try {
    const auraViewOnce = require('../../aura/auraViewOnce');
    const chatJid = msg?.key?.remoteJid || '';
    const senderJid = msg?.key?.participant || msg?.key?.remoteJid || '';
    const senderNumber = senderJid.split('@')[0].split(':')[0] || '';
    
    const recent = auraViewOnce.getRecentViewOnce(chatJid, 10);
    // Procura pelo match (pelo sender number ou pelo mais recente do tipo)
    const match = recent.find(r => 
      r.senderNumber === senderNumber && 
      ((isImage && r.type === 'image') || (isVideo && r.type === 'video') || (isAudio && r.type === 'audio'))
    ) || (recent.length > 0 ? recent[recent.length - 1] : null);
    
    if (match?.filePath) {
      const fs = require('fs');
      if (fs.existsSync(match.filePath)) {
        const buf = fs.readFileSync(match.filePath);
        if (buf && buf.length > 100) {
          console.log('[ViewOnceConvert] ✅ Usando mídia salva pelo AuraViewOnce');
          return { buf, isImage, isVideo, isAudio, caption, mimetype };
        }
      }
    }
  } catch (e) {
    console.log('[ViewOnceConvert] AuraViewOnce check failed:', e.message?.slice(0, 80));
  }

  // === FALLBACK 2: Download via Baileys ===
  let buf = null;
  try {
    buf = await downloadMediaMessage(msg, 'buffer', {});
  } catch (e1) {
    console.log('[ViewOnceConvert] Baileys download falhou:', e1.message?.slice(0, 100));
    try {
      // Fallback: tenta com a inner message re-wrapped
      const innerMsg = { message: unwrapped, key: msg.key || {} };
      buf = await downloadMediaMessage(innerMsg, 'buffer', {});
    } catch (e2) {
      console.log('[ViewOnceConvert] Fallback download falhou:', e2.message?.slice(0, 100));
    }
  }
  
  if (buf && buf.length >= 100) {
    console.log('[ViewOnceConvert] ✅ Download via Baileys OK');
    return { buf, isImage, isVideo, isAudio, caption, mimetype };
  }

  // === FALLBACK 3: Download directo via URL do mediaMessage ===
  try {
    if (mediaNode.url) {
      const https = require('https');
      const http = require('http');
      const client = mediaNode.url.startsWith('https') ? https : http;
      
      buf = await new Promise((resolve, reject) => {
        const req = client.get(mediaNode.url, { 
          headers: { 'Origin': 'https://web.whatsapp.com' } 
        }, (res) => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        });
        req.on('error', reject);
        setTimeout(() => { req.destroy(); reject(new Error('timeout')); }, 10000);
      });
      
      if (buf && buf.length >= 100) {
        console.log('[ViewOnceConvert] ✅ Download directo via URL OK');
        return { buf, isImage, isVideo, isAudio, caption, mimetype };
      }
    }
  } catch (e) {
    console.log('[ViewOnceConvert] URL download falhou:', e.message?.slice(0, 80));
  }

  console.log('[ViewOnceConvert] ❌ Todos os métodos falharam');
  return null;
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
  // Ou: Usar sem citar para revelar a última view-once do chat
  // ════════════════════════════════════════════════════════════════════
  registerCase(['revelar', 'salvarviewonce', 'verviewonce', 'unviewonce', 'reveal'], async ({ m, sock, ctx, reply, react }) => {
    
    // ═══ MODO RÁPIDO: Sem citar, revelar a última view-once do chat ═══
    if (!m.quoted?.message) {
      try {
        const auraViewOnce = require('../../aura/auraViewOnce');
        const recent = auraViewOnce.getRecentViewOnce(ctx.remoteJid, 1);
        
        if (recent.length === 0) {
          return reply(
            '👁️ *REVELAR*\n\n' +
            'Nenhuma view-once encontrada.\n\n' +
            '*Usos:*\n' +
            '• Responde a uma view-once 👁️ com `!revelar`\n' +
            '• Ou usa `!revelar` logo após receber a view-once\n\n' +
            '*💡 Dica:*\n' +
            '• `!revelar` → converte view-once 👁️ em normal\n' +
            '• `!toviewonce` → converte normal em view-once 👁️'
          );
        }

        const lastViewOnce = recent[recent.length - 1];
        
        if (!lastViewOnce.filePath) {
          return reply('❌ A última view-once não foi guardada no disco.');
        }

        react('⏳');
        
        const fs = require('fs');
        if (!fs.existsSync(lastViewOnce.filePath)) {
          react('❌');
          return reply('❌ Ficheiro da view-once não encontrado. Pode ter sido limpo.');
        }

        const buf = fs.readFileSync(lastViewOnce.filePath);
        const isImage = lastViewOnce.type === 'image';
        const isVideo = lastViewOnce.type === 'video';
        const isAudio = lastViewOnce.type === 'audio';
        const mimetype = isImage ? 'image/jpeg' : isVideo ? 'video/mp4' : 'audio/ogg';
        
        react('✅');

        if (isImage) {
          await sock.sendMessage(ctx.remoteJid, {
            image: buf,
            caption: `🔓 *Revelada* — visualização única → normal${lastViewOnce.caption ? `\n\n_${lastViewOnce.caption}_` : ''}`,
            mimetype,
          }, { quoted: m.msg });
        } else if (isVideo) {
          await sock.sendMessage(ctx.remoteJid, {
            video: buf,
            caption: `🔓 *Revelada* — visualização única → normal${lastViewOnce.caption ? `\n\n_${lastViewOnce.caption}_` : ''}`,
            mimetype,
          }, { quoted: m.msg });
        } else if (isAudio) {
          await sock.sendMessage(ctx.remoteJid, {
            audio: buf,
            mimetype,
            ptt: false,
            caption: `🔓 *Revelada* — áudio de visualização única → normal`,
          }, { quoted: m.msg });
        }

        return;
      } catch (e) {
        console.log('[ViewOnceConvert] Modo rápido falhou:', e.message?.slice(0, 80));
        return reply('❌ Erro ao revelar a última view-once: ' + (e.message?.slice(0, 80) || 'desconhecido'));
      }
    }

    // ═══ MODO NORMAL: Revelar a view-once citada ═══
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
        // Debug: mostrar estrutura da mensagem para diagnóstico
        const msgStructure = m.quoted?.message ? Object.keys(m.quoted.message).join(', ') : 'sem message';
        console.log('[ViewOnceConvert] Mensagem não extraiu. Estrutura:', msgStructure);
        console.log('[ViewOnceConvert] Keys da quoted.msg:', m.quoted?.msg ? Object.keys(m.quoted.msg).join(', ') : 'sem msg');
        
        return reply(
          '❌ *Não consegui extrair a mídia desta visualização única.*\n\n' +
          '*Possíveis causas:*\n' +
          '• A mensagem já foi aberta (expirou)\n' +
          '• A mídia foi apagada pelo remetente\n' +
          '• O WhatsApp bloqueou o download\n\n' +
          '*💡 Dica:*\n' +
          '• Usa !revelar *imediatamente* após receber a view-once\n' +
          '• Não abras a visualização única antes de usar o comando\n' +
          '• Pede ao remetente para enviar novamente'
        );
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
