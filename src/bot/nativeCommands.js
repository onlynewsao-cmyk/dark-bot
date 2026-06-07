const Command = require('../database/models/Command');
const User = require('../database/models/User');
const Log = require('../database/models/Log');
const AntiStatus = require('../database/models/AntiStatus');
const botConfigCache = require('./botConfigCache');
const mediaHandler = require('./mediaHandler');
const downloader = require('./downloader');
const stickerMaker = require('./stickerMaker');
const ai = require('./ai');
const buttonHandler = require('./buttonHandler');
const config = require('../config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

const startTime = Date.now();

/** Adiciona rodapé do canal WhatsApp se configurado */
async function appendChannel(text) {
  try {
    const enabled = await botConfigCache.get('channel_enabled', false);
    if (!enabled) return text;
    const name = await botConfigCache.get('channel_name', '');
    const url = await botConfigCache.get('channel_url', '');
    if (!url) return text;
    return text + `\n\n╭───── ⌁ ─────╮\n│ 📢 *${name || 'Nosso Canal'}*\n│ ${url}\n╰───── ⌁ ─────╯`;
  } catch (e) { return text; }
}

const reply = async (sock, msg, ctx, text) => {
  const finalText = await appendChannel(text);
  return sock.sendMessage(ctx.remoteJid, { text: finalText }, { quoted: msg });
};
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });

/**
 * Envia áudio MP3 com card de descrição visível no WhatsApp.
 *
 * O WhatsApp exibe o card (capa + título + artista) apenas quando:
 *  1. contextInfo.externalAdReply está presente
 *  2. thumbnail é um Buffer JPEG válido (não vazio)
 *  3. mediaType = 1 (link) ou 4 (áudio)
 *
 * Se não conseguir baixar o thumbnail, envia o áudio simples com fileName.
 */
async function sendAudioWithCard(sock, msg, ctx, r) {
  const title    = r.title    || 'Áudio';
  const duration = r.duration || '';
  const author   = r.author   || '';
  const fileName = `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`;

  // Monta body (linha de info abaixo do título)
  const bodyParts = [];
  if (author)   bodyParts.push(`👤 ${author}`);
  if (duration) bodyParts.push(`⏱️ ${duration}`);
  const body = bodyParts.join('  •  ') || '🎵 DARK BOT';

  // Tenta baixar thumbnail
  let thumbBuf = null;
  if (r.thumb) {
    try {
      thumbBuf = await mediaHandler.fetchBuffer(r.thumb);
      // Valida que é uma imagem (JPEG/PNG começa com bytes específicos)
      if (!thumbBuf || thumbBuf.length < 100) thumbBuf = null;
    } catch { thumbBuf = null; }
  }

  const audioMsg = {
    audio:    { url: r.url },
    mimetype: 'audio/mpeg',
    fileName,
    ptt:      false,  // false = áudio comum (não nota de voz)
  };

  if (thumbBuf) {
    // Com thumbnail: exibe card com capa, título e artista
    audioMsg.contextInfo = {
      externalAdReply: {
        title,
        body,
        mediaType:  2,        // 2 = image/audio card
        thumbnail:  thumbBuf,
        mediaUrl:   '',
        sourceUrl:  '',
        renderLargerThumbnail: false,
      },
    };
  }

  await sock.sendMessage(ctx.remoteJid, audioMsg, { quoted: msg });
}

/** Envia menu com mídia (foto/vídeo/gif) se configurada */
async function sendMenuWithMedia(sock, msg, ctx, menuText, target = 'menu') {
  const mediaUrl = await botConfigCache.get(`menu_media_${target}_url`, '');
  const mediaType = await botConfigCache.get(`menu_media_${target}_type`, 'none');
  const finalText = await appendChannel(menuText);

  if (mediaUrl && mediaType !== 'none') {
    try {
      const buf = await mediaHandler.fetchBuffer(mediaUrl);
      if (mediaType === 'gif') {
        // GIF → MP4 com gifPlayback (animado no WhatsApp)
        return sock.sendMessage(ctx.remoteJid, {
          video: buf, gifPlayback: true, caption: finalText, mimetype: 'video/mp4',
        }, { quoted: msg });
      } else if (mediaType === 'video') {
        // Vídeo normal MP4
        return sock.sendMessage(ctx.remoteJid, {
          video: buf, caption: finalText, mimetype: 'video/mp4',
        }, { quoted: msg });
      } else {
        return sock.sendMessage(ctx.remoteJid, { image: buf, caption: finalText }, { quoted: msg });
      }
    } catch (e) {
      // Fallback para texto
    }
  }
  return sock.sendMessage(ctx.remoteJid, { text: finalText }, { quoted: msg });
}

/**
 * Envia vídeo tentando evitar ficheiros incompatíveis no WhatsApp Android.
 *
 * Estratégia:
 * 1. baixa o buffer para o próprio bot enviar ao WhatsApp
 * 2. verifica se o container parece MP4
 * 3. se não parecer MP4, envia como documento para evitar vídeo "quebrado"
 */
function sanitizeFileName(name, fallback = 'video') {
  return String(name || fallback).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 70) || fallback;
}

function detectVideoContainer(buffer) {
  if (!buffer || buffer.length < 16) return 'unknown';
  const head = buffer.slice(0, 16);
  // MP4: ftyp em offset 4
  if (buffer.slice(4, 8).toString() === 'ftyp') return 'mp4';
  // WebM: EBML header
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'webm';
  // AVI
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'AVI ') return 'avi';
  // Ogg
  if (buffer.slice(0, 4).toString() === 'OggS') return 'ogg';
  // MPEG-TS (alguns serviços retornam .ts disfarçado)
  if (head[0] === 0x47) return 'ts';
  return 'unknown';
}

async function sendVideoFromUrl(sock, jid, url, caption, quotedMsg, opts = {}) {
  const title = sanitizeFileName(opts.title || 'video');
  try {
    const buf = await mediaHandler.fetchBuffer(url);
    const kind = detectVideoContainer(buf);

    if (kind === 'mp4') {
      // Buffer é MP4 real → envia direto (mais rápido)
      return sock.sendMessage(jid, {
        video: buf,
        caption,
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
      }, { quoted: quotedMsg });
    }

    // NÃO é MP4 puro: envia como video com URL direto.
    // O WhatsApp baixa do URL e transcodifica melhor do que receber um buffer WebM/AVI/etc.
    return sock.sendMessage(jid, {
      video: { url },
      caption: caption + `\n\n📥 Qualidade: ${opts.quality || 'HD'}`,
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
    }, { quoted: quotedMsg });
  } catch (e) {
    // Se não conseguiu baixar buffer, envia como URL direto
    return sock.sendMessage(jid, {
      video: { url },
      caption: caption + `\n\n📥 Qualidade: ${opts.quality || 'HD'}`,
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
    }, { quoted: quotedMsg });
  }
}

/**
 * Formata informações do vídeo para legenda
 */
function videoCaption(title, quality, duration, extra = '') {
  let cap = `🎬 *${title}*`;
  if (quality) cap += `\n📺 Qualidade: *${quality}*`;
  if (duration) cap += `\n⏱️ Duração: ${duration}`;
  if (extra)    cap += `\n${extra}`;
  return cap;
}

async function botIsAdmin(sock, ctx) {
  if (!ctx.isGroup) return false;
  try {
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const botJid = (sock.user.id || sock.user.lid || '').split(':')[0] + '@s.whatsapp.net';
    return meta.participants.some(p => (p.id.split(':')[0] + '@s.whatsapp.net') === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
  } catch (e) { return false; }
}

async function isAdmin(sock, ctx) {
  if (!ctx.isGroup) return false;
  try {
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const senderJid = (ctx.senderJid || '').split(':')[0] + '@s.whatsapp.net';
    return meta.participants.some(p => (p.id.split(':')[0] + '@s.whatsapp.net') === senderJid && (p.admin === 'admin' || p.admin === 'superadmin'));
  } catch (e) { return false; }
}
function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}
function formatUptime(ms) {
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60);
  return `${d}d ${h}h ${m}m ${s%60}s`;
}
async function logCmd(name, ctx, success = true) {
  try {
    await Log.create({
      type: 'command', command: name, user: ctx.pushName,
      number: ctx.senderNumber, group: ctx.groupName || '', groupJid: ctx.isGroup ? ctx.remoteJid : '',
      success,
    });
  } catch (e) {}
}

module.exports = {
  // ============ INFO ============
  async start({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const title = `👋 Olá *${ctx.pushName}*!\n\nEu sou o *${config.bot.name}*, seu assistente multifuncional.\n\nEscolha uma opção abaixo para começar:`;
    const footer = `⌁ ${config.owner.name} • ⚡ Dark Side`;
    
    // Fallback de texto formatado (enviado junto para garantir que o bot SEMPRE responda)
    const textFallback = `${title}\n\n` +
      `1️⃣ *${p}menu* — Menu Completo\n` +
      `2️⃣ *${p}ia* — Conversar com IA\n` +
      `3️⃣ *${p}vip* — Ser Premium\n\n` +
      `${footer}`;

    try {
        const buttons = [
          { id: `${p}menu`, text: '📜 Menu Completo' },
          { id: `${p}ia`, text: '🧠 Conversar com IA' },
          { id: `${p}vip`, text: '⭐ Ser Premium' }
        ];
        // Envia botões
        await buttonHandler.sendButtons(sock, ctx.remoteJid, title, footer, buttons, msg);
    } catch (e) {
        // Se falhar o envio de botões, envia o texto
        return reply(sock, msg, ctx, textFallback);
    }
    logCmd('start', ctx);
  },

  async menu({ sock, msg, ctx, config, isOwner }) {
    const uptime = formatUptime(Date.now() - startTime);
    const p = config.bot.prefix;

    // Redireciona para menu interativo se solicitado
    if (ctx.fullText?.toLowerCase().includes('btn')) {
        return module.exports.menubtn({ sock, msg, ctx, config });
    }

    let menu = `┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ⌁ *${config.bot.name}* ⌁
┃  ᴛʜᴇ ᴅᴀʀᴋ sɪᴅᴇ 🌑
┗━━━━━━━━━━━━━━━━━━━━━┛

╔══ ˚₊‧ 👤 ‧₊˚ ══╗
║ 👋 ${ctx.pushName}
║ 📱 ${ctx.senderNumber}
║ 🏷️ ${ctx.isGroup ? ctx.groupName : 'Privado'}
║ ⚡ Prefixo: [ *${p}* ]
╚══════════════════╝

╔══ ˚₊‧ ⚡ ᴍᴏ́ᴅᴜʟᴏ 01 ‧₊˚ ══╗
║ *ᴄᴏʀᴇ & ɪɴᴛᴇʟɪɢᴇ̂ɴᴄɪᴀ*
║ ▹ ia ⌁ deepsearch
║ ▹ imagem ⌁ figura ⌁ figubug ✨
║ ▹ genero <homem|mulher>
╚══════════════════════╝

╔══ ˚₊‧ 📥 ᴍᴏ́ᴅᴜʟᴏ 02 ‧₊˚ ══╗
║ *ᴅᴏᴡɴʟᴏᴀᴅs & ᴍɪ́ᴅɪᴀ*
║ ▹ play ⌁ play2 ⌁ play3 ⭐
║ ▹ video ⌁ video2 ⌁ vinil 💿
║ ▹ tiktok ⌁ instagram ⌁ fb
║ ▹ pinterest ⌁ apk ⌁ spotify
╚══════════════════════╝

╔══ ˚₊‧ 👥 ᴍᴏ́ᴅᴜʟᴏ 03 ‧₊˚ ══╗
║ *ɢᴇsᴛᴀ̃ᴏ ᴅᴇ ɢʀᴜᴘᴏs*
║ ▹ ban ⌁ promote ⌁ demote
║ ▹ open ⌁ close ⌁ todos
║ ▹ antistatus ⌁ antilink
╚══════════════════════╝

╔══ ˚₊‧ 🎮 ᴍᴏ́ᴅᴜʟᴏ 04 ‧₊˚ ══╗
║ *ᴇɴᴛʀᴇᴛᴇɴɪᴍᴇɴᴛᴏ & sᴏᴄɪᴀʟ*
║ ▹ quiz ⌁ familia ⌁ nomear
║ ▹ blackjack ⌁ truco ⌁ russa
║ ▹ casal ⌁ gay ⌁ ship
╚══════════════════════╝

╔══ ˚₊‧ 🛠️ ᴍᴏ́ᴅᴜʟᴏ 05 ‧₊˚ ══╗
║ *ᴜᴛɪʟɪᴛᴀ́ʀɪᴏs & ꜰᴏʀᴇɴsᴇ*
║ ▹ decrypt ⌁ vpn 🔓
║ ▹ ping ⌁ id ⌁ perfil
║ ▹ qrcode ⌁ calc ⌁ clima
║ ▹ vip ⌁ assinar ⌁ dono
╚══════════════════════╝`;

    if (isOwner) {
      menu += `\n\n╔══ ˚₊‧ 👑 ‧₊˚ ══╗\n║ *ᴍᴇɴᴜ ᴅᴏ ᴅᴏɴᴏ*\n║ ▹ menudono\n╚═══════════════╝`;
    }

    menu += `\n\n> ⌁ *${config.bot.name}* · ${config.owner.name}\n> 👑 ${config.owner.number} · ⏱️ ${uptime}\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴀʀᴋ ᴇɴɢɪɴᴇ ⚡`;

    await sendMenuWithMedia(sock, msg, ctx, menu, 'menu');
    logCmd('menu', ctx);
  },

  async menudono({ sock, msg, ctx, config, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o Dono.');
    const text = `╔══ ˚₊‧ 👑 ᴅᴀʀᴋ ᴏᴡɴᴇʀ ‧₊˚ ══╗
║
║ *TRAPAÇAS (CHEATS)* 😈
║ ▹ godmode ⌁ winforca
║ ▹ winquiz ⌁ winadivinha
║ ▹ forjar @user <msg>
║ ▹ simular @user <cmd>
║
║ *COMANDOS DE TRAVAS* ☣️
║ ▹ trava1 ⌁ trava2
║ ▹ trava3 ⌁ bomb
║
║ *CONTROLE DO SISTEMA* 🖥️
║ ▹ panel ⌁ stats ⌁ restart
║ ▹ broadcast ⌁ send
║ ▹ blacklist ⌁ unblacklist
║ ▹ espiao ⌁ antidelete
║ ▹ eval ⌁ shell
║
╚══════════════════════╝`;
    return reply(sock, msg, ctx, text);
  },

  async figubug({ sock, msg, ctx, config }) {
    // Stickers de alta qualidade com metadados pesados
    const m = msg.message;
    const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;
    const srcMsg = (m?.imageMessage || m?.videoMessage) ? msg : (quoted?.imageMessage || quoted?.videoMessage) ? { message: quoted } : null;

    if (!srcMsg) return reply(sock, msg, ctx, '👾 Envie mídia com *!figubug* para gerar um sticker lendário.');

    await react(sock, msg, '👾');
    try {
      const buffer = await mediaHandler.downloadFromMessage(srcMsg);
      const isAnimated = !!(srcMsg.message?.videoMessage || quoted?.videoMessage);
      
      const stk = await stickerMaker.create(buffer, {
        botName: "LENDÁRIO BUG",
        ownerName: "DARK NET",
        userName: ctx.pushName,
        groupName: "DARK BUG",
        isVideo: isAnimated,
      });

      // Envia como sticker mas com flag de visualização única as vezes ou alta prioridade
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✨');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}`);
    }
  },

  async menubtn({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const title = `📂 *INTERFACE INTERATIVA*\n\nSelecione um módulo:`;
    const footer = `⌁ ${config.bot.name} 🌑`;

    const buttons = [
      { id: `${p}menudownload`, text: '📥 Downloads' },
      { id: `${p}menujogos`, text: '🎮 Jogos' },
      { id: `${p}menuia`, text: '🧠 IA' },
      { id: `${p}menugrupo`, text: '👥 Grupos' },
    ];

    try {
      await buttonHandler.sendButtons(sock, ctx.remoteJid, title, footer, buttons, msg);
    } catch (e) {
      return reply(sock, msg, ctx, `${title}\n\n1. ${p}menudownload\n2. ${p}menujogos\n3. ${p}menuia\n4. ${p}menugrupo\n\n${footer}`);
    }
    logCmd('menubtn', ctx);
  },

  // Sub-menus de botões
  async menudownload({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const text = `📥 *MENU DOWNLOADS*\n\n` +
      `▹ ${p}play <musica>\n▹ ${p}video <video>\n▹ ${p}tiktok <url>\n` +
      `▹ ${p}instagram <url>\n▹ ${p}fb <url>\n▹ ${p}pinterest <busca>`;
    return reply(sock, msg, ctx, text);
  },

  async menujogos({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const text = `🎮 *MENU JOGOS*\n\n` +
      `▹ ${p}blackjack\n▹ ${p}truco\n▹ ${p}roleta\n▹ ${p}dado\n▹ ${p}ppt\n` +
      `▹ ${p}quiz ⌁ ${p}resp\n▹ ${p}familia ⌁ ${p}nomear\n▹ ${p}casal\n▹ ${p}gay\n▹ ${p}ship`;
    return reply(sock, msg, ctx, text);
  },

  async menuia({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const text = `🧠 *MENU IA*\n\n` +
      `▹ ${p}ia <pergunta>\n▹ ${p}deepsearch\n▹ ${p}imagem <descrição>\n▹ ${p}figura <descrição>\n▹ ${p}genero <homem|mulher>`;
    return reply(sock, msg, ctx, text);
  },

  async menustickers({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const text = `🎨 *MENU STICKERS*\n\n` +
      `▹ ${p}sticker\n▹ ${p}toimg\n▹ ${p}attp\n▹ ${p}ttp`;
    return reply(sock, msg, ctx, text);
  },

  async menugrupo({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const text = `👥 *MENU GRUPOS*\n\n` +
      `▹ ${p}ban\n▹ ${p}promote\n▹ ${p}demote\n▹ ${p}link\n▹ ${p}revoke\n▹ ${p}open\n▹ ${p}close\n▹ ${p}todos\n▹ ${p}antistatus on/off`;
    return reply(sock, msg, ctx, text);
  },

  async ping({ sock, msg, ctx, config }) {
    const t = Date.now();
    const sent = await reply(sock, msg, ctx, '🏓 Calculando...');
    await sock.sendMessage(ctx.remoteJid, {
      text: `🏓 *Pong!*\n\n⚡ Latência: *${Date.now()-t}ms*\n🤖 ${config.bot.name} ativo!`,
      edit: sent.key,
    }).catch(() => reply(sock, msg, ctx, `🏓 ${Date.now()-t}ms`));
    logCmd('ping', ctx);
  },

  async dono({ sock, msg, ctx, config }) {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.owner.name}\nORG:${config.bot.name};\nTEL;type=CELL;type=VOICE;waid=${config.owner.number}:+${config.owner.number}\nEND:VCARD`;
    
    // Vídeo Circular (PTV) configurável no dashboard
    const ownerVideoUrl = await botConfigCache.get('owner_video_note_url', '');
    if (ownerVideoUrl) {
      try {
        const buf = await mediaHandler.fetchBuffer(ownerVideoUrl);
        await sock.sendMessage(ctx.remoteJid, { video: buf, ptv: true }, { quoted: msg });
      } catch (e) { console.error('PTV Err:', e.message); }
    }

    await sock.sendMessage(ctx.remoteJid, { contacts: { displayName: config.owner.name, contacts: [{ vcard }] } }, { quoted: msg });
    await reply(sock, msg, ctx, `👑 *DONO:* ${config.owner.name}\n📞 wa.me/${config.owner.number}\n🌙 _The Dark Side_`);
    logCmd('dono', ctx);
  },

  async info({ sock, msg, ctx, config }) {
    const ram = `${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`;
    const text = `╭━━〔 *${config.bot.name}* 〕━━╮
│ 🤖 Bot: ${config.bot.name}
│ 👑 Dono: ${config.owner.name}
│ 📞 +${config.owner.number}
│ 🌐 Node: ${process.version}
│ 💾 RAM: ${ram}
│ ⏱️ Uptime: ${formatUptime(Date.now()-startTime)}
│ 🖥️ ${os.platform()} ${os.arch()}
╰━━━━━━━━━━━━━━━━╯`;
    return reply(sock, msg, ctx, text);
  },

  async id({ sock, msg, ctx }) {
    return reply(sock, msg, ctx, `🆔 *INFORMAÇÕES*\n\n👤 Você: ${ctx.senderNumber}\n💬 Chat: ${ctx.remoteJid}\n${ctx.isGroup ? '👥 Grupo: ' + ctx.groupName : '📱 Privado'}`);
  },

  /**
   * !jid — Envia o JID do utilizador/grupo em PV (apenas para o remetente ver).
   * Ninguém no grupo sabe que recebeu. O utilizador copia da conversa privada com o bot.
   *
   * Uso:
   *   !jid          → envia SEU JID e o JID do chat em PV
   *   !jid @alguem  → envia o JID do marcado em PV (só para quem enviou o comando)
   */
  async jid({ sock, msg, ctx }) {
    const pvJid = ctx.senderJid; // JID da conversa privada com o remetente

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target   = mentions[0] || null;

    // Constrói o texto com JIDs para copiar
    let text = `╔══ ˚₊‧ 🆔 ‧₊˚ ══╗\n║ *SEUS JIDs*\n║\n`;
    text += `║ 👤 *Seu JID:*\n║ \`${pvJid}\`\n║\n`;
    text += `║ 📱 *Seu número:*\n║ \`${ctx.senderNumber}\`\n║\n`;

    if (ctx.isGroup) {
      text += `║ 👥 *JID do grupo:*\n║ \`${ctx.remoteJid}\`\n║\n`;
    }

    if (target) {
      text += `║ 🎯 *JID marcado:*\n║ \`${target}\`\n║\n`;
      text += `║ 📱 *Número marcado:*\n║ \`${target.split('@')[0]}\`\n║\n`;
    }

    text += `╚══════════════════╝\n`;
    text += `> 💡 _Toque e segure o número/JID para copiar_\n`;
    text += `> 🔒 _Apenas você recebeu esta mensagem_`;

    // Envia APENAS em PV — invisível para o grupo
    try {
      await sock.sendMessage(pvJid, { text });
    } catch (e) {
      // Fallback: envia no chat atual se não conseguir abrir PV
      return reply(sock, msg, ctx, text);
    }

    // No grupo: reage com ✅ silenciosamente para confirmar sem revelar conteúdo
    if (ctx.isGroup) {
      await sock.sendMessage(ctx.remoteJid, {
        react: { text: '✅', key: msg.key },
      }).catch(() => {});
    }
  },

  async perfil({ sock, msg, ctx }) {
    const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
    const role = user?.role === 'owner' ? '👑 Dono' : user?.role === 'premium' ? '⭐ Premium' : '🆓 Free';
    return reply(sock, msg, ctx, `╭━〔 👤 *SEU PERFIL* 〕━╮
│ 📛 ${ctx.pushName}
│ 📱 +${ctx.senderNumber}
│ 🏷️ ${role}
│ ⚡ ${user?.commandsUsed || 0} cmds usados
${user?.premiumUntil ? `│ ⏳ Premium até ${new Date(user.premiumUntil).toLocaleDateString('pt-BR')}` : ''}
╰━━━━━━━━━━━━━━━╯`);
  },

  // ============ IA ============
  async ia({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🧠 Use: !ia <sua pergunta>');
    await react(sock, msg, '🤔');
    try {
      const answer = await ai.chat(args.join(' '));
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `🧠 *IA responde:*\n\n${answer}`);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ ' + e.message);
    }
  },

  async gpt(args) { return module.exports.ia(args); },

  async imagem({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎨 Use: !imagem <descrição>');
    await react(sock, msg, '🎨');
    try {
      const buf = await ai.generateImage(args.join(' '));
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: `🎨 ${args.join(' ')}` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ ' + e.message);
    }
  },

  async figura({ sock, msg, ctx, args, config }) {
    if (!args.length) return reply(sock, msg, ctx, '✨ Use: !figura <descrição>');
    await react(sock, msg, '🎨');
    try {
      const buf = await ai.generateImage(args.join(' '));
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'Privado', isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ ' + e.message);
    }
  },

  // ============ DOWNLOADS ============

  /** Envia áudio com card de descrição visível no WhatsApp */
  // Nota interna: o WhatsApp só exibe metadados em áudio via contextInfo.externalAdReply
  // com thumbnail real (buffer JPEG). Sem thumbnail, o card não aparece.

  async play({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎵 *!play* — Áudio Baixa Qualidade (160kbps)\n\nUse: !play <nome>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.play160(args.join(' '));
      await sendAudioWithCard(sock, msg, ctx, r);
      
      const buttons = [
        { id: `${config.bot.prefix}video ${args.join(' ')}`, text: '🎬 Baixar Vídeo' },
        { id: `${config.bot.prefix}menudownload`, text: '📥 Downloads' }
      ];
      await buttonHandler.sendButtons(sock, ctx.remoteJid, `🎵 ${r.title}`, 'Escolha uma opção:', buttons, msg);
      
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async play2({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎵 *!play2* — Áudio Qualidade Média\n\nUse: !play2 <nome>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.playMedium(args.join(' '));
      await sendAudioWithCard(sock, msg, ctx, r);

      const buttons = [
        { id: `${config.bot.prefix}video ${args.join(' ')}`, text: '🎬 Baixar Vídeo' },
        { id: `${config.bot.prefix}menudownload`, text: '📥 Downloads' }
      ];
      await buttonHandler.sendButtons(sock, ctx.remoteJid, `🎵 ${r.title}`, 'Escolha uma opção:', buttons, msg);

      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async play3({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎵 *!play3* — Áudio Alta Qualidade (320kbps)\n\nUse: !play3 <nome>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.play320(args.join(' '));
      await sendAudioWithCard(sock, msg, ctx, r);

      const buttons = [
        { id: `${config.bot.prefix}video2 ${args.join(' ')}`, text: '🎬 Baixar Vídeo FHD' },
        { id: `${config.bot.prefix}menudownload`, text: '📥 Downloads' }
      ];
      await buttonHandler.sendButtons(sock, ctx.remoteJid, `🎵 ${r.title}`, 'Escolha uma opção:', buttons, msg);

      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async video({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎬 *!video* — Vídeo HD (720p)\n\nUse: !video <nome>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.videoHD(args.join(' '));
      const cap = videoCaption(r.title, '720p (HD)', r.duration);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, cap, msg, { title: r.title });

      const buttons = [
        { id: `${config.bot.prefix}play2 ${args.join(' ')}`, text: '🎵 Baixar Áudio' },
        { id: `${config.bot.prefix}menudownload`, text: '📥 Downloads' }
      ];
      await buttonHandler.sendButtons(sock, ctx.remoteJid, `🎬 ${r.title}`, 'Escolha uma opção:', buttons, msg);

      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async video2({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎬 *!video2* — Vídeo Full HD (1080p)\n\nUse: !video2 <nome>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.videoFHD(args.join(' '));
      const cap = videoCaption(r.title, '1080p (FHD)', r.duration);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, cap, msg, { title: r.title });

      const buttons = [
        { id: `${config.bot.prefix}play3 ${args.join(' ')}`, text: '🎵 Baixar Áudio Alta' },
        { id: `${config.bot.prefix}menudownload`, text: '📥 Downloads' }
      ];
      await buttonHandler.sendButtons(sock, ctx.remoteJid, `🎬 ${r.title}`, 'Escolha uma opção:', buttons, msg);

      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async deepsearch({ sock, msg, ctx, args }) {
    const q = args.join(' ');
    if (!q) return reply(sock, msg, ctx, '🧠 Use: !deepsearch <pergunta>');
    await react(sock, msg, '⏳');
    try {
      const res = await ai.chat(q + " (responda detalhadamente)");
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `🧠 *DeepSearch:*\n\n${res}`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Erro na pesquisa.'); }
  },

  async antistatus({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx)) && ctx.senderNumber !== config.owner.number) return reply(sock, msg, ctx, '🚫 Só admins');
    let doc = await AntiStatus.findOne({ groupJid: ctx.remoteJid });
    if (!doc) doc = await AntiStatus.create({ groupJid: ctx.remoteJid, enabled: false });
    doc.enabled = !doc.enabled;
    await doc.save();
    return reply(sock, msg, ctx, `🛡️ *Anti-Status* ${doc.enabled ? 'ATIVADO' : 'DESATIVADO'} neste grupo.`);
  },

  async docfake({ sock, msg, ctx, args }) {
    const q = args.join(' ');
    const sprd = "|";
    if (!q) return reply(sock, msg, ctx, `📄 Uso: !docfake nome${sprd}peso(MB)${sprd}extensao`);
    try {
      const parts = q.split(sprd);
      const name = parts[0] || 'Documento';
      const size = (parseFloat(parts[1]) || 1) * 1024 * 1024;
      let ext = (parts[2] || 'pdf').toLowerCase().trim();
      const mimes = { pdf: 'application/pdf', apk: 'application/vnd.android.package-archive', zip: 'application/zip', jpg: 'image/jpeg', mp3: 'audio/mpeg', mp4: 'video/mp4', txt: 'text/plain', png: 'image/png' };
      await sock.sendMessage(ctx.remoteJid, { document: Buffer.from('DARK-BOT-FAKE'), mimetype: mimes[ext] || 'application/octet-stream', fileName: `${name}.${ext}`, fileLength: size, contextInfo: { forwardingScore: 999, isForwarded: true } }, { quoted: msg });
    } catch (e) { return reply(sock, msg, ctx, '❌ Erro no DocFake'); }
  },

  async vinil({ sock, msg, ctx, args }) {
    const q = args.join(' ');
    if (!q) return reply(sock, msg, ctx, '🎵 Digite o nome da música!');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.youtubeAudio(q);
      const tmpDir = path.join(os.tmpdir(), 'dark-vinil-' + Date.now());
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
      const imgPath = path.join(tmpDir, 'thumb.jpg'), audioPath = path.join(tmpDir, 'audio.mp3'), gifPath = path.join(tmpDir, 'vinil.gif'), videoPath = path.join(tmpDir, 'result.mp4');
      fs.writeFileSync(imgPath, await mediaHandler.fetchBuffer(r.thumb || 'https://i.imgur.com/8N6RkYy.jpg'));
      fs.writeFileSync(audioPath, await mediaHandler.fetchBuffer(r.url));
      fs.writeFileSync(gifPath, await mediaHandler.fetchBuffer('https://files.catbox.moe/ogevq2.gif'));
      const ffmpegCmd = `ffmpeg -y -stream_loop -1 -i "${gifPath}" -i "${imgPath}" -i "${audioPath}" -filter_complex "[0:v]crop=iw-180:ih-180:90:90,scale=480:480[bg];[1:v]scale=260:260,format=rgba,geq=lum='p(X,Y)':a='if(lte((X-130)^2+(Y-130)^2,130^2),255,0)'[circle];[bg][circle]overlay=(W-w)/2:(H-h)/2[v]" -map "[v]" -map 2:a -t 60 -shortest -preset ultrafast -r 12 -c:v libx264 -pix_fmt yuv420p -c:a aac "${videoPath}"`;
      execSync(ffmpegCmd, { stdio: 'ignore' });
      
      const videoBuf = fs.readFileSync(videoPath);
      await sock.sendMessage(ctx.remoteJid, { video: videoBuf, caption: `🎵 *${r.title}*\n⏱️ 1:00 min de Vinil`, mimetype: 'video/mp4' }, { quoted: msg });

      // Botões estilo profissional
      const buttons = [
        { id: `${config.bot.prefix}play3 ${q}`, text: '🎧 Ouvir em Alta' },
        { id: `${config.bot.prefix}menudownload`, text: '📥 Mais Downloads' }
      ];
      await buttonHandler.sendButtons(sock, ctx.remoteJid, `🎵 ${r.title}`, `Duração: ${r.duration || '1:00'}`, buttons, msg);

      fs.rmSync(tmpDir, { recursive: true, force: true });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Erro ao gerar Disco de Vinil.'); }
  },

  async tiktok({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎵 *!tiktok* — Download TikTok sem marca d\'água\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!tiktok https://vm.tiktok.com/...`\n' +
      '  • `!tiktok https://www.tiktok.com/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.tiktok(args[0]);
      const cap = `🎵 *${r.title || 'TikTok'}*\n📺 Sem marca d'água`;
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, cap, msg, { title: r.title || 'tiktok-video' });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async instagram({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '📸 *!instagram* — Download Instagram\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!instagram https://www.instagram.com/p/...`\n' +
      '  • `!instagram https://www.instagram.com/reel/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.instagram(args[0]);
      if (r.type === 'video') {
        await sendVideoFromUrl(sock, ctx.remoteJid, r.url, '📸 *Instagram*', msg, { title: 'instagram-video' });
      } else {
        await sock.sendMessage(ctx.remoteJid, { image: { url: r.url }, caption: '📸 *Instagram*' }, { quoted: msg });
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async fb({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '📘 *!fb* — Download Facebook\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!fb https://www.facebook.com/...`\n' +
      '  • `!fb https://fb.watch/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.facebook(args[0]);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, '📘 *Facebook*', msg, { title: 'facebook-video' });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async twitter({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🐦 *!twitter* — Download X / Twitter\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!twitter https://x.com/...`\n' +
      '  • `!twitter https://twitter.com/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.twitter(args[0]);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, '🐦 *X / Twitter*', msg, { title: 'twitter-video' });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async spotify({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎧 *!spotify* — Download Spotify\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!spotify https://open.spotify.com/track/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.spotify(args[0]);
      r.author = r.author || 'Spotify';
      await sendAudioWithCard(sock, msg, ctx, r);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async soundcloud({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '☁️ *!soundcloud* — Download SoundCloud\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!soundcloud nome da música`\n' +
      '  • `!soundcloud https://soundcloud.com/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.soundcloud(args.join(' '));
      r.title  = r.title  || 'SoundCloud';
      r.author = r.author || 'SoundCloud';
      await sendAudioWithCard(sock, msg, ctx, r);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async pinterest({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📌 Use: !pinterest <busca>');
    await react(sock, msg, '⏳');
    try {
      const results = await downloader.pinterestSearch(args.join(' '));
      if (!results?.length) throw new Error('Nenhuma imagem encontrada');
      
      await reply(sock, msg, ctx, `📌 *Pinterest:* ${args.join(' ')}\n🚀 Enviando 10 imagens (0.5s delay)...`);
      
      for (const img of results) {
        try {
          await sock.sendMessage(ctx.remoteJid, { image: { url: img.url } });
          await new Promise(r => setTimeout(r, 500)); 
        } catch (e) {}
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async soundcloud({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '☁️ Use: !soundcloud <nome/link>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.soundcloud(args.join(' '));
      await sock.sendMessage(ctx.remoteJid, { audio: { url: r.url }, mimetype: 'audio/mp4' }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async mediafire({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📁 Use: !mediafire <link>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.mediafire(args[0]);
      await sock.sendMessage(ctx.remoteJid, { 
        document: { url: r.url }, 
        fileName: r.title, 
        mimetype: 'application/octet-stream' 
      }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ============ MOD APK (LiteAPKs) ============
  async apk({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📱 *!apk* — Download MOD APK\n\n📝 Use: !apk <nome do app>\n\n💡 Método avançado com envio direto!');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.apkDownload(args.join(' '));
      if (r.isPage) {
        // Se só achou página, manda link
        return reply(sock, msg, ctx, `📱 *${r.title}*\n\n🔗 ${r.url}\n\n⚠️ Baixe manualmente na página`);
      }
      // Tenta enviar arquivo direto (até 100MB no WhatsApp)
      const caption = `📱 *${r.title}*\n${r.version ? '🔢 Versão: ' + r.version + '\n' : ''}${r.size ? '📦 Tamanho: ' + r.size + '\n' : ''}🌐 Fonte: ${r.source}\n\n✅ *DARK BOT MOD APK*`;
      try {
        await sock.sendMessage(ctx.remoteJid, {
          document: { url: r.url },
          mimetype: 'application/vnd.android.package-archive',
          fileName: `${r.title.replace(/[^a-z0-9]/gi, '_')}.apk`,
          caption
        }, { quoted: msg });
      } catch (e) {
        // Fallback: envia link se arquivo muito grande
        await reply(sock, msg, ctx, `${caption}\n\n🔗 Download: ${r.url}`);
      }
      await react(sock, msg, '✅');
      logCmd('apk', ctx);
    } catch (e) { 
      await react(sock, msg, '❌'); 
      // Fallback para busca antiga
      try {
        const results = await downloader.liteapks(args.join(' '));
        let text = `📱 *MOD APK - ${args.join(' ')}*\n\n`;
        results.slice(0,5).forEach((r,i)=>{ text += `${i+1}. ${r.name}\n🔗 ${r.url}\n\n`; });
        return reply(sock, msg, ctx, text);
      } catch(e2) { return reply(sock, msg, ctx, '❌ ' + e.message); }
    }
  },
  async modapk(a) { return module.exports.apk(a); },

  // ============ STICKER ============
  async sticker({ sock, msg, ctx, config }) {
    // Detecta mídia directa ou em citação
    const m = msg.message;
    const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;

    const srcMsg = (m?.imageMessage || m?.videoMessage || m?.stickerMessage)
      ? msg
      : (quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage)
        ? { message: quoted }
        : null;

    if (!srcMsg) return reply(sock, msg, ctx, '🎨 Envie ou responda uma *foto*, *vídeo* ou *GIF* com *!sticker*');

    // Detecta se é vídeo ou GIF (gifPlayback = GIF enviado como vídeo no WhatsApp)
    const srcVidMsg = srcMsg.message?.videoMessage || quoted?.videoMessage;
    const isGifPlayback = !!(srcVidMsg?.gifPlayback);
    const isRealVideo   = !!(srcVidMsg && !srcVidMsg.gifPlayback);

    await react(sock, msg, '⏳');
    try {
      const buffer = await mediaHandler.downloadFromMessage(srcMsg);

      // detectMime determina o tipo real do buffer
      // isVideo=true activa o pipeline de vídeo/animado no stickerMaker
      const isAnimated = isGifPlayback || isRealVideo ||
        ['image/gif', 'video/mp4', 'video/webm', 'video/avi'].includes(
          require('./stickerMaker').detectMime(buffer)
        );

      const stk = await stickerMaker.create(buffer, {
        botName: config.bot.name,
        ownerName: config.owner.name,
        userName: ctx.pushName,
        groupName: ctx.groupName || 'Privado',
        isVideo: isAnimated,
      });

      if (!stk || stk.length < 50) throw new Error('Sticker vazio — tente com outra mídia');
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}`);
    }
  },

  async toimg({ sock, msg, ctx }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.stickerMessage) return reply(sock, msg, ctx, '🖼️ Responda um *sticker* com *!toimg*');
    await react(sock, msg, '⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage({ message: quoted });
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: '🖼️ Sticker convertido!' }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async attp({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '✍️ Use: !attp <texto>');
    try {
      const buf = await mediaHandler.fetchBuffer(`https://api.popcat.xyz/attp?text=${encodeURIComponent(args.join(' '))}`);
      await sock.sendMessage(ctx.remoteJid, { sticker: buf }, { quoted: msg });
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async ttp({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '✍️ Use: !ttp <texto>');
    try {
      const buf = await mediaHandler.fetchBuffer(`https://api.popcat.xyz/texttoimage?text=${encodeURIComponent(args.join(' '))}`);
      await sock.sendMessage(ctx.remoteJid, { sticker: buf }, { quoted: msg });
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ============ GRUPOS ============
  async ban({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    const t = getMentions(msg);
    if (!t.length) return reply(sock, msg, ctx, '🎯 Marque alguém');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, t, 'remove');
      await reply(sock, msg, ctx, `✅ Banido(s): ${t.length}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },
  async kick(a) { return module.exports.ban(a); },

  async promote({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    const t = getMentions(msg);
    if (!t.length) return reply(sock, msg, ctx, '🎯 Marque alguém');
    try { await sock.groupParticipantsUpdate(ctx.remoteJid, t, 'promote'); return reply(sock, msg, ctx, '👑 Promovido!'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async demote({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    const t = getMentions(msg);
    if (!t.length) return reply(sock, msg, ctx, '🎯 Marque alguém');
    try { await sock.groupParticipantsUpdate(ctx.remoteJid, t, 'demote'); return reply(sock, msg, ctx, '⬇️ Rebaixado'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async grupo({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    return reply(sock, msg, ctx, `╭━〔 *INFO GRUPO* 〕━╮
│ 📛 ${meta.subject}
│ 🆔 ${meta.id}
│ 👥 ${meta.participants.length} membros
│ 👑 ${meta.participants.filter(p=>p.admin).length} admins
│ 📅 ${meta.creation ? new Date(meta.creation*1000).toLocaleDateString('pt-BR') : '?'}
│ 📝 ${meta.desc || 'sem desc'}
╰━━━━━━━━━━━━━━━━━╯`);
  },

  async link({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    try { const c = await sock.groupInviteCode(ctx.remoteJid); return reply(sock, msg, ctx, `🔗 https://chat.whatsapp.com/${c}`); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async revoke({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    try { await sock.groupRevokeInvite(ctx.remoteJid); return reply(sock, msg, ctx, '🔄 Link resetado'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async open({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    try { await sock.groupSettingUpdate(ctx.remoteJid, 'not_announcement'); return reply(sock, msg, ctx, '🔓 Aberto'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async close({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    try { await sock.groupSettingUpdate(ctx.remoteJid, 'announcement'); return reply(sock, msg, ctx, '🔒 Fechado'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async todos({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const mentions = meta.participants.map(p => p.id);
    let text = `📢 *${args.join(' ') || 'Atenção!'}*\n\n`;
    meta.participants.forEach((p,i) => { text += `${i+1}. @${p.id.split('@')[0]}\n`; });
    await sock.sendMessage(ctx.remoteJid, { text, mentions });
  },

  async hidetag({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    await sock.sendMessage(ctx.remoteJid, {
      text: args.join(' ') || '📢 Atenção!',
      mentions: meta.participants.map(p => p.id),
    });
  },

  async antilink({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const on = args[0]?.toLowerCase() === 'on';
    await botConfigCache.set('antilink_enabled', on);
    return reply(sock, msg, ctx, on ? '✅ Anti-link ATIVADO' : '❌ Anti-link DESATIVADO');
  },

  async antispam({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const on = args[0]?.toLowerCase() === 'on';
    await botConfigCache.set('antispam_enabled', on);
    return reply(sock, msg, ctx, on ? '✅ Anti-spam ATIVADO' : '❌ Anti-spam DESATIVADO');
  },

  async autodecrypt({ sock, msg, ctx, args, isOwner }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o Dono pode ativar a descriptografia automática.');
    
    const on = args[0]?.toLowerCase() === 'on';
    await botConfigCache.set(`autodecrypt_${ctx.remoteJid}`, on);
    
    return reply(sock, msg, ctx, on 
      ? '🔓 *AUTO-DECRYPT ATIVADO!* Agora todos os arquivos VPN enviados neste grupo serão analisados automaticamente.' 
      : '🔒 *AUTO-DECRYPT DESATIVADO.*');
  },

  async join({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner && ctx.senderNumber !== config.owner.number) return reply(sock, msg, ctx, '🚫 Comando restrito.');
    const link = args[0];
    if (!link || !link.includes('chat.whatsapp.com/')) return reply(sock, msg, ctx, '❌ Envie um link válido de grupo.');
    
    try {
      const code = link.split('chat.whatsapp.com/')[1];
      const jid = await sock.groupAcceptInvite(code);
      await sock.sendMessage(jid, { 
        text: `👋 Olá! Eu sou o *${config.bot.name}*.\n\nFui convidado para este grupo!\n\n💎 *Hospedagem:* Este grupo tem 7 dias de teste grátis.\nApós o teste, o limite será de 500 comandos/dia.\n\n_Dono: ${config.owner.name}_` 
      });
      return reply(sock, msg, ctx, '✅ Entrei no grupo com sucesso!');
    } catch (e) {
      return reply(sock, msg, ctx, '❌ Erro ao entrar no grupo: ' + e.message);
    }
  },

  async welcome({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const on = args[0]?.toLowerCase() === 'on';
    await botConfigCache.set('welcome_enabled', on);
    return reply(sock, msg, ctx, on ? '✅ Boas-vindas ATIVADAS' : '❌ Boas-vindas DESATIVADAS');
  },

  // ============ DIVERSÃO ============
  async dado({ sock, msg, ctx }) { return reply(sock, msg, ctx, `🎲 ${Math.floor(Math.random()*6)+1}`); },
  async moeda({ sock, msg, ctx }) { return reply(sock, msg, ctx, Math.random()>0.5 ? '🪙 *Cara*' : '🪙 *Coroa*'); },

  async piada({ sock, msg, ctx }) {
    const p = [
      'Por que o livro de mat estava triste?\n— Muitos problemas.',
      'O que o pato disse à pata?\n— Vem quá!',
      'O que a impressora disse à outra?\n— Essa folha é sua ou é impressão minha?',
      'Qual o doce preferido do físico?\n— Pi.',
      'O tomate foi ao banco fazer o quê?\n— Tirar extrato.',
    ];
    return reply(sock, msg, ctx, `😂 ${p[Math.floor(Math.random()*p.length)]}`);
  },

  async frase({ sock, msg, ctx }) {
    const f = [
      '💡 "O sucesso é a soma de pequenos esforços." — R. Collier',
      '🌙 "Nas sombras encontramos a verdadeira luz." — Dark Net',
      '⚡ "Aja como se fosse impossível falhar." — Churchill',
      '🚀 "Comece onde está. Use o que tem. Faça o que pode." — A. Ashe',
    ];
    return reply(sock, msg, ctx, f[Math.floor(Math.random()*f.length)]);
  },

  async ppt({ sock, msg, ctx, args }) {
    const opts = ['pedra','papel','tesoura'];
    const c = args[0]?.toLowerCase();
    if (!opts.includes(c)) return reply(sock, msg, ctx, '🎮 Use: !ppt pedra/papel/tesoura');
    const b = opts[Math.floor(Math.random()*3)];
    let r = '🤝 Empate';
    if ((c==='pedra'&&b==='tesoura')||(c==='papel'&&b==='pedra')||(c==='tesoura'&&b==='papel')) r = '🏆 Venceu!';
    else if (c !== b) r = '💀 Perdeu';
    return reply(sock, msg, ctx, `Você: *${c}*\nBot: *${b}*\n\n${r}`);
  },

  async gay({ sock, msg, ctx }) {
    const t = getMentions(msg)[0] || ctx.senderJid;
    await sock.sendMessage(ctx.remoteJid, { text: `🏳️‍🌈 @${t.split('@')[0]} é *${Math.floor(Math.random()*101)}%* gay!`, mentions: [t] }, { quoted: msg });
  },

  async casal({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const p = meta.participants;
    const a = p[Math.floor(Math.random()*p.length)].id;
    let b = p[Math.floor(Math.random()*p.length)].id;
    while (b===a && p.length>1) b = p[Math.floor(Math.random()*p.length)].id;
    await sock.sendMessage(ctx.remoteJid, {
      text: `💕 *Casal do dia*\n\n@${a.split('@')[0]} 💖 @${b.split('@')[0]}\nCompatibilidade: *${Math.floor(Math.random()*101)}%*`,
      mentions: [a,b],
    }, { quoted: msg });
  },

  async ship({ sock, msg, ctx }) {
    const t = getMentions(msg);
    if (t.length < 2) return reply(sock, msg, ctx, '💕 Marque 2: !ship @a @b');
    await sock.sendMessage(ctx.remoteJid, {
      text: `💕 @${t[0].split('@')[0]} + @${t[1].split('@')[0]}\n❤️ ${Math.floor(Math.random()*101)}%`,
      mentions: t,
    }, { quoted: msg });
  },

  async roleta({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const p = meta.participants;
    const chosen = p[Math.floor(Math.random()*p.length)].id;
    await sock.sendMessage(ctx.remoteJid, { text: `🎰 *ROLETA*\n\nO escolhido foi: @${chosen.split('@')[0]} 🎉`, mentions: [chosen] }, { quoted: msg });
  },

  async fofoca({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const p = meta.participants;
    const a = p[Math.floor(Math.random()*p.length)].id;
    let b = p[Math.floor(Math.random()*p.length)].id;
    while (b===a && p.length>1) b = p[Math.floor(Math.random()*p.length)].id;
    const fofs = [
      'está apaixonado(a) por', 'foi visto(a) com', 'mandou indireta para',
      'está stalkeando', 'ficou de vez com', 'tem um caso secreto com',
    ];
    await sock.sendMessage(ctx.remoteJid, {
      text: `🤫 *FOFOCA*\n\nDizem que @${a.split('@')[0]} ${fofs[Math.floor(Math.random()*fofs.length)]} @${b.split('@')[0]}!`,
      mentions: [a,b],
    }, { quoted: msg });
  },

  // ============ UTILS ============
  async qrcode({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📱 Use: !qrcode <texto>');
    const QR = require('qrcode');
    const buf = await QR.toBuffer(args.join(' '), { width: 400 });
    await sock.sendMessage(ctx.remoteJid, { image: buf, caption: '📱 QR Code' }, { quoted: msg });
  },

  async calc({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🧮 Use: !calc 2+2');
    try {
      const e = args.join('').replace(/[^0-9+\-*/().]/g,'');
      const r = Function('"use strict";return ('+e+')')();
      return reply(sock, msg, ctx, `🧮 ${e} = *${r}*`);
    } catch { return reply(sock, msg, ctx, '❌ Expr inválida'); }
  },

  async translate({ sock, msg, ctx, args }) {
    if (args.length < 2) return reply(sock, msg, ctx, '🌐 !translate <lang> <texto>');
    try {
      const lang = args.shift();
      const r = await mediaHandler.fetchJson(`https://api.popcat.xyz/translate?to=${lang}&text=${encodeURIComponent(args.join(' '))}`);
      return reply(sock, msg, ctx, `🌐 *${lang}*\n\n${r.translated || r.text || 'erro'}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async clima({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '☀️ Use: !clima <cidade>');
    try {
      const r = await mediaHandler.fetchJson(`https://wttr.in/${encodeURIComponent(args.join(' '))}?format=j1&lang=pt`);
      const c = r.current_condition[0];
      return reply(sock, msg, ctx, `☀️ *Clima em ${args.join(' ')}*\n\n🌡️ Temp: ${c.temp_C}°C (sente ${c.FeelsLikeC}°C)\n💧 Umidade: ${c.humidity}%\n💨 Vento: ${c.windspeedKmph} km/h\n☁️ ${c.lang_pt?.[0]?.value || c.weatherDesc[0].value}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async encurtar({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🔗 Use: !encurtar <url>');
    try {
      const r = await mediaHandler.fetchBuffer(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args[0])}`);
      return reply(sock, msg, ctx, `🔗 Encurtado:\n${r.toString('utf-8')}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ============ VIP/PREMIUM ============
  async vip({ sock, msg, ctx, config }) {
    const title = `╭━〔 ⭐ *VIP/PREMIUM* 〕━╮\n\n🎯 Vantagens:\n✅ Comandos exclusivos\n✅ Sem limites\n✅ Prioridade\n✅ IA Premium\n\n💎 Assine agora para liberar todo o poder!`;
    const footer = `⌁ ${config.bot.name}`;
    
    const buttons = [
      { id: `${config.bot.prefix}assinar`, text: '💎 Como Assinar' },
      { id: `${config.bot.prefix}meuplano`, text: '📊 Meu Plano' }
    ];

    try {
      await buttonHandler.sendButtons(sock, ctx.remoteJid, title, footer, buttons, msg);
    } catch (e) {
      return reply(sock, msg, ctx, title + `\n\nUse ${config.bot.prefix}assinar para ver como adquirir.`);
    }
  },

  async assinar({ sock, msg, ctx, config }) {
    return reply(sock, msg, ctx, `💎 *COMO ASSINAR PREMIUM*

1️⃣ Escolha um plano em ${config.bot.prefix}vip
2️⃣ Faça pagamento (Multicaixa Express, Pix, Unitel Money):

📱 *Multicaixa Express:*
   Número: +${config.owner.number}
   Nome: ${config.owner.name}

3️⃣ Acesse o dashboard:
   ${process.env.APP_URL || 'https://dark-bot.onrender.com'}
   
4️⃣ Crie/faça login na sua conta
5️⃣ Vá em "Assinatura Premium" e envie o comprovante

⏱️ Aprovação em até 24h
📞 wa.me/${config.owner.number}`);
  },

  async meuplano({ sock, msg, ctx }) {
    const u = await User.findOne({ whatsappNumber: ctx.senderNumber });
    if (!u) return reply(sock, msg, ctx, '🆓 Você ainda não tem conta. Acesse o dashboard!');
    if (u.role === 'owner') return reply(sock, msg, ctx, '👑 Você é o DONO!');
    if (u.role === 'premium' && u.isPremium()) {
      return reply(sock, msg, ctx, `⭐ *PREMIUM ATIVO*\n\n⏳ Válido até: ${new Date(u.premiumUntil).toLocaleDateString('pt-BR')}\n📊 Comandos: ${u.commandsUsed}`);
    }
    return reply(sock, msg, ctx, '🆓 Você é Free. Use !vip para conhecer os planos.');
  },

  // ============ DONO ============
  async broadcast({ sock, msg, ctx, args, isOwner, config }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    if (!args.length) return reply(sock, msg, ctx, '📢 Use: !broadcast <msg>');
    const message = args.join(' ');
    try {
      const chats = await sock.groupFetchAllParticipating();
      const ids = Object.keys(chats);
      let count = 0;
      for (const id of ids) {
        try {
          await sock.sendMessage(id, { text: `📢 *BROADCAST*\n\n${message}\n\n_— ${config.owner.name}_` });
          count++;
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {}
      }
      return reply(sock, msg, ctx, `✅ Enviado para *${count}* grupos`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async setpremium({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    const num = args[0]?.replace(/\D/g,'');
    const days = parseInt(args[1]) || 30;
    if (!num) return reply(sock, msg, ctx, '⭐ Use: !setpremium <num> [dias]');
    const until = new Date(Date.now() + days*86400000);
    let u = await User.findOne({ whatsappNumber: num });
    if (!u) {
      u = await User.create({
        username: 'wa_'+num, password: Math.random().toString(36),
        name: 'WhatsApp '+num, whatsappNumber: num,
        role: 'premium', premiumUntil: until,
      });
    } else { u.role='premium'; u.premiumUntil=until; await u.save(); }
    return reply(sock, msg, ctx, `⭐ ${num} é Premium até ${until.toLocaleDateString('pt-BR')}`);
  },

  async blacklist({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    const num = args[0]?.replace(/\D/g,'');
    if (!num) return reply(sock, msg, ctx, '🚫 Use: !blacklist <num>');
    const bl = await botConfigCache.get('blacklist', []);
    if (!bl.includes(num)) bl.push(num);
    await botConfigCache.set('blacklist', bl);
    return reply(sock, msg, ctx, `🚫 ${num} bloqueado`);
  },

  async unblacklist({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    const num = args[0]?.replace(/\D/g,'');
    let bl = await botConfigCache.get('blacklist', []);
    bl = bl.filter(x => x !== num);
    await botConfigCache.set('blacklist', bl);
    return reply(sock, msg, ctx, `✅ ${num} desbloqueado`);
  },

  async stats({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    try {
      const usersCount = await User.countDocuments() || 0;
      const premiumCount = await User.countDocuments({ role: 'premium' }) || 0;
      const uptime = formatUptime(Date.now() - startTime);
      const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      
      const text = `╭━〔 📊 *STATUS DARK ENGINE* 〕━╮\n│ 👥 Usuários: ${usersCount}\n│ ⭐ Premium: ${premiumCount}\n│ ⏱️ Uptime: ${uptime}\n│ 💾 RAM: ${ram} MB\n│ 🖥️ Plataforma: ${os.platform()}\n╰━━━━━━━━━━━━━━━━━━╯`;
      return reply(sock, msg, ctx, text);
    } catch (e) { return reply(sock, msg, ctx, '❌ Erro ao buscar stats: ' + e.message); }
  },

  async agendar({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    return reply(sock, msg, ctx, `📅 *Agendamento*\n\nUse o dashboard para agendar mensagens:\n${process.env.APP_URL || 'https://dark-bot.onrender.com'}/dashboard/schedule`);
  },

  async backup({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    return reply(sock, msg, ctx, `💾 Use o dashboard para backup:\n${process.env.APP_URL || ''}/dashboard/backup`);
  },

  async panel({ sock, msg, ctx, isOwner, config }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o dono pode acessar o painel.');
    
    const title = `🛠️ *PAINEL DE CONTROLE*\n\nStatus: Online 🟢\nUptime: ${formatUptime(Date.now() - startTime)}`;
    const footer = `Dono: ${config.owner.name}`;
    
    const buttons = [
      { id: `${config.bot.prefix}stats`, text: '📊 Estatísticas' },
      { id: `${config.bot.prefix}restart`, text: '🔄 Reiniciar Bot' },
      { id: `${config.bot.prefix}broadcast`, text: '📢 Transmissão' }
    ];

    await buttonHandler.sendInteractive(sock, ctx.remoteJid, title, footer, buttons, msg);
  },

  async trava1({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return;
    return reply(sock, msg, ctx, "☣️ *TRAVA ENVIADA* (Simulada para feira)");
  },
  async trava2({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return;
    return reply(sock, msg, ctx, "☣️ *TRAVA DE CATÁLOGO* (Simulada)");
  },
  async bomb({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return;
    return reply(sock, msg, ctx, "💣 *BOMBA DE MENSAGENS ATIVADA*");
  },

  async restart({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    await reply(sock, msg, ctx, '🔄 Reiniciando em 3s...');
    setTimeout(() => process.exit(0), 3000); // Render reinicia automaticamente
  },

  async decrypt({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    return reply(sock, msg, ctx,
`╭━━〔 🔓 *VPN DECRYPTER* 〕━━╮
│
│ 🎯 *Como usar — 3 formas:*
│
│ 1️⃣ *Comando + URI:*
│   \`${p}vpn bdnet://4f07...\`
│   \`${p}vpn apna://4f07...\`
│   \`${p}vpn apnalite://4f07...\`
│   \`${p}decrypt vmess://...\`
│
│ 2️⃣ *Comando + clipboard/texto:*
│   \`${p}decrypt [cole aqui a config]\`
│   \`${p}vpn [cole o JSON / OpenVPN / WG]\`
│
│ 3️⃣ *Enviar ficheiro como doc:*
│   Anexa o ficheiro e escreve
│   \`${p}decrypt\` na legenda
│
│ 📁 *Ficheiros suportados:*
│ • .ehi / .ehic — HTTP Injector
│ • .hat          — HA Tunnel Plus
│ • .npv4/.npv7/.npv8 — NPV Tunnel
│ • .dark         — DarkTunnel
│ • .any          — AnyTunnel
│ • .tls          — TLS Tunnel
│ • .nm / .nmess  — NetMod
│ • .conf         — WireGuard
│ • .ovpn         — OpenVPN
│ • .ssh / .ssl   — SSH Direct
│ • .json         — V2Ray/Xray
│ • .txt          — vmess/vless/trojan/ss
│
│ 📲 *URIs suportadas (texto):*
│ • \`bdnet://\`  — BD Net VPN
│ • \`apna://\`   — APNA Tunnel Lite
│ • \`apnalite://\` — APNA Lite
│ • \`vmess://\`  — V2Ray/VMess
│ • \`vless://\`  — VLess
│ • \`trojan://\` — Trojan
│ • \`ss://\`     — Shadowsocks
│ • \`ssh://\`    — SSH
│ • \`hysteria://\` — Hysteria2
│
│ 🔓 *Extrai automaticamente:*
│ • Host, Porta, Protocolo
│ • SSH User / Pass
│ • SNI, TLS Version
│ • Payload HTTP decryptado
│ • UUID, PSK, DNS
│ • Proxy, UDPGW
│ • Validade, Mensagem, Senha
│
│ ⭐ Recurso *Premium*
│ 📞 wa.me/${config.owner.number}
│
╰━━━━━━━━━━━━━━━━━━━━━━╯`);
  },

  async vpn(a) { return module.exports.decrypt(a); },
  async vpndec(a) { return module.exports.decrypt(a); },

  // ============ ATUALIZAÇÕES DE INTERNET ============
  async atualizacoes({ sock, msg, ctx, config }) {
    const updates = await botConfigCache.get('internet_updates', []);
    if (!updates.length) {
      return reply(sock, msg, ctx, `┏━━ ˚₊‧ 📡 ‧₊˚ ━━┓\n┃ *ᴀᴛᴜᴀʟɪᴢᴀᴄ̧ᴏ̃ᴇs*\n┃\n┃ Nenhuma atualização\n┃ disponível no momento.\n┃\n┃ Volte mais tarde!\n┗━━━━━━━━━━━━━━━━━┛`);
    }

    let text = `┏━━ ˚₊‧ 📡 ‧₊˚ ━━┓\n┃ *ᴀᴛᴜᴀʟɪᴢᴀᴄ̧ᴏ̃ᴇs ᴅᴇ ɪɴᴛᴇʀɴᴇᴛ*\n┃ ${config.bot.name}\n┗━━━━━━━━━━━━━━━━━┛\n`;

    for (const u of updates.slice(-10)) {
      text += `\n┏━━━━━━━━━━━━━━━━━┓`;
      if (u.title) text += `\n┃ 📌 *${u.title}*`;
      if (u.operator) text += `\n┃ 📱 Operadora: ${u.operator}`;
      if (u.vpnApp) text += `\n┃ 🔧 VPN: ${u.vpnApp}`;
      if (u.status) text += `\n┃ ${u.status === 'working' ? '✅ Funcionando' : u.status === 'slow' ? '🟡 Lento' : '❌ Parado'}`;
      if (u.date) text += `\n┃ 📅 ${u.date}`;
      if (u.note) text += `\n┃ 💬 ${u.note}`;
      text += `\n┗━━━━━━━━━━━━━━━━━┛`;
    }

    text += `\n\n> ⌁ Use *${config.bot.prefix}config* para receber ficheiros`;
    await sendMenuWithMedia(sock, msg, ctx, text, 'updates');
  },
  async updates(a) { return module.exports.atualizacoes(a); },
  async news(a) { return module.exports.atualizacoes(a); },

  // ============ CONFIGS CLIPBOARD ============
  async configs({ sock, msg, ctx, config }) {
    const configs = await botConfigCache.get('clipboard_configs', []);
    if (!configs.length) {
      return reply(sock, msg, ctx, `┏━━ ˚₊‧ 📋 ‧₊˚ ━━┓\n┃ *ᴄᴏɴꜰɪɢs ᴅɪsᴘᴏɴɪ́ᴠᴇɪs*\n┃\n┃ Nenhuma config disponível.\n┃ Volte mais tarde!\n┗━━━━━━━━━━━━━━━━━┛`);
    }

    let text = `┏━━ ˚₊‧ 📋 ‧₊˚ ━━┓\n┃ *ᴄᴏɴꜰɪɢs ᴅɪsᴘᴏɴɪ́ᴠᴇɪs*\n┃ Copie e cole no app VPN\n┗━━━━━━━━━━━━━━━━━┛\n`;

    for (let i = 0; i < configs.length; i++) {
      const c = configs[i];
      text += `\n*${i + 1}. ${c.title || 'Config ' + (i + 1)}*`;
      if (c.operator) text += ` · ${c.operator}`;
      if (c.vpnApp) text += ` · ${c.vpnApp}`;
    }

    text += `\n\nUse *${config.bot.prefix}config <número>* para receber`;
    return reply(sock, msg, ctx, text);
  },

  async config({ sock, msg, ctx, args, config }) {
    const configs = await botConfigCache.get('clipboard_configs', []);
    if (!configs.length) return reply(sock, msg, ctx, '📋 Nenhuma config disponível.');

    // Se não especificou número, lista todas
    const num = parseInt(args[0]);
    if (!num || num < 1 || num > configs.length) {
      return module.exports.configs({ sock, msg, ctx, config });
    }

    const c = configs[num - 1];

    // Se tem link, envia o link
    if (c.link) {
      return reply(sock, msg, ctx, `┏━━ ˚₊‧ 📋 ‧₊˚ ━━┓\n┃ *${c.title || 'Config'}*\n${c.operator ? `┃ 📱 ${c.operator}\n` : ''}${c.vpnApp ? `┃ 🔧 ${c.vpnApp}\n` : ''}┗━━━━━━━━━━━━━━━━━┛\n\n🔗 ${c.link}`);
    }

    // Se tem clipboard text, envia como texto puro (sem formatação)
    if (c.clipboard) {
      // Primeiro envia a info
      await reply(sock, msg, ctx, `📋 *${c.title || 'Config'}*${c.operator ? ' · ' + c.operator : ''}${c.vpnApp ? ' · ' + c.vpnApp : ''}\n\n⬇️ Copie o texto abaixo e cole no app:`);
      // Depois envia o clipboard PURO (sem canal, sem formatação)
      return sock.sendMessage(ctx.remoteJid, { text: c.clipboard });
    }

    return reply(sock, msg, ctx, '❌ Config sem dados.');
  },

  async genero({ sock, msg, ctx, args }) {
    const choice = args[0]?.toLowerCase();
    if (choice !== 'homem' && choice !== 'mulher') return reply(sock, msg, ctx, '❓ Use: !genero homem ou !genero mulher');
    
    const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
    if (user) {
      user.gender = choice === 'homem' ? 'male' : 'female';
      await user.save();
      return reply(sock, msg, ctx, `✅ Entendido! Agora sei que você é ${choice === 'homem' ? 'um cavalheiro' : 'uma dama'}. ✨`);
    }
  },

};
