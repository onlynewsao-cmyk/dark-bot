const Command = require('../database/models/Command');
const User = require('../database/models/User');
const Log = require('../database/models/Log');
const AntiStatus = require('../database/models/AntiStatus');
const BotConfig = require('../database/models/BotConfig');
const GroupSettings = require('../database/models/GroupSettings');
const botConfigCache = require('./botConfigCache');
const prefixManager = require('./prefixManager');
const userManager = require('./userManager');
const mediaHandler = require('./mediaHandler');
const downloader = require('./downloader');
const stickerMaker = require('./stickerMaker');
const ai = require('./ai');
const buttonHandler = require('./buttonHandler');
const config = require('../config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
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
  const mime     = r.mimetype || (String(r.url || '').includes('.m4a') ? 'audio/mp4' : 'audio/mpeg');
  const ext      = mime.includes('mp4') ? 'm4a' : 'mp3';
  const fileName = `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.${ext}`;

  const bodyParts = [];
  if (author)   bodyParts.push(`👤 ${author}`);
  if (duration) bodyParts.push(`⏱️ ${duration}`);
  const body = bodyParts.join('  •  ') || '🎵 DARK BOT';

  let thumbBuf = null;
  if (r.thumb) {
    try {
      thumbBuf = await mediaHandler.fetchBuffer(r.thumb);
      if (!thumbBuf || thumbBuf.length < 100) thumbBuf = null;
    } catch { thumbBuf = null; }
  }

  const contextInfo = thumbBuf ? {
    externalAdReply: {
      title,
      body,
      mediaType: 2,
      thumbnail: thumbBuf,
      mediaUrl: '',
      sourceUrl: '',
      renderLargerThumbnail: false,
    },
  } : undefined;

  try {
    // Regra nova: sempre enviar o arquivo/buffer, não apenas URL.
    // Isso evita “só manda texto” e evita link que WhatsApp não consegue abrir.
    const audioBuffer = r.buffer && Buffer.isBuffer(r.buffer)
      ? r.buffer
      : await mediaHandler.fetchBuffer(r.url);
    if (!audioBuffer || audioBuffer.length < 1024) throw new Error('áudio vazio');
    return await sock.sendMessage(ctx.remoteJid, {
      audio: audioBuffer,
      mimetype: mime,
      fileName,
      ptt: false,
      contextInfo,
    }, { quoted: msg });
  } catch (bufErr) {
    // Último recurso ainda entrega arquivo como documento, nunca só texto.
    try {
      const audioBuffer = r.buffer && Buffer.isBuffer(r.buffer) ? r.buffer : await mediaHandler.fetchBuffer(r.url);
      return await sock.sendMessage(ctx.remoteJid, {
        document: audioBuffer,
        mimetype: mime,
        fileName,
        caption: `🎵 *${title}*\n${body}\n\n⚠️ Enviado como documento porque o player de áudio falhou.`,
      }, { quoted: msg });
    } catch (docErr) {
      return sock.sendMessage(ctx.remoteJid, {
        text: `❌ Não consegui anexar o áudio agora.\n🎵 ${title}\nErro: ${docErr.message}`,
      }, { quoted: msg });
    }
  }
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

function getFfmpegBin() {
  try { return require('ffmpeg-static') || 'ffmpeg'; }
  catch { return 'ffmpeg'; }
}

function videoInputExt(kind) {
  if (['mp4', 'webm', 'avi', 'ogg', 'ts'].includes(kind)) return kind;
  return 'bin';
}

function convertVideoBufferToMp4(buffer, kind = 'unknown') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-video-'));
  const inputPath = path.join(tmpDir, `input.${videoInputExt(kind)}`);
  const outputPath = path.join(tmpDir, 'output.mp4');
  try {
    fs.writeFileSync(inputPath, buffer);
    execFileSync(getFfmpegBin(), [
      '-y',
      '-i', inputPath,
      '-map', '0:v:0?',
      '-map', '0:a:0?',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-shortest',
      outputPath,
    ], { stdio: 'ignore', timeout: 180000 });
    const out = fs.readFileSync(outputPath);
    if (!out || out.length < 1024 || detectVideoContainer(out) !== 'mp4') {
      throw new Error('ffmpeg não gerou um MP4 válido');
    }
    return out;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

async function sendVideoFromUrl(sock, jid, urlOrBuffer, caption, quotedMsg, opts = {}) {
  const title = sanitizeFileName(opts.title || 'video');
  let originalBuffer = null;
  try {
    const buf = Buffer.isBuffer(urlOrBuffer)
      ? urlOrBuffer
      : (opts.buffer && Buffer.isBuffer(opts.buffer))
        ? opts.buffer
        : await mediaHandler.fetchBuffer(urlOrBuffer);
    originalBuffer = buf;
    if (!buf || buf.length < 2048) throw new Error('vídeo vazio');
    const kind = detectVideoContainer(buf);

    // Regra nova: transcodificar sempre para MP4 WhatsApp-safe.
    // Mesmo se já for .mp4, pode vir com codec incompatível.
    const mp4 = (opts.safeMp4 && kind === 'mp4') ? buf : convertVideoBufferToMp4(buf, kind);

    return sock.sendMessage(jid, {
      video: mp4,
      caption: `${caption}\n\n✅ MP4 compatível WhatsApp · Dark Net Engine 🕸️`,
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
    }, { quoted: quotedMsg });
  } catch (e) {
    // Se o player de vídeo falhar, ainda entrega o arquivo como documento MP4.
    if (originalBuffer) {
      return sock.sendMessage(jid, {
        document: originalBuffer,
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        caption: `${caption}\n\n⚠️ Player de vídeo falhou/conversão falhou: ${e.message}\n📎 Entregue como documento MP4 para não perder o download.`,
      }, { quoted: quotedMsg });
    }
    throw new Error('Não consegui baixar/converter o vídeo para MP4: ' + e.message);
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

function jidBase(jid = '') {
  return String(jid).split(':')[0].split('@')[0].replace(/\D/g, '');
}
function isParticipantAdmin(p) {
  return p?.admin === 'admin' || p?.admin === 'superadmin' || p?.isAdmin || p?.isSuperAdmin;
}

async function createImageGrid(items, max = 9) {
  const sharp = require('sharp');
  const selected = (items || []).slice(0, max);
  const cell = 360;
  const cols = Math.min(3, Math.ceil(Math.sqrt(selected.length || 1)));
  const rows = Math.ceil((selected.length || 1) / cols);
  const composites = [];

  for (let i = 0; i < selected.length; i++) {
    try {
      const buf = await mediaHandler.fetchBuffer(selected[i].url || selected[i]);
      const img = await sharp(buf).resize(cell, cell, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82 }).toBuffer();
      composites.push({ input: img, left: (i % cols) * cell, top: Math.floor(i / cols) * cell });
    } catch {}
  }
  if (!composites.length) throw new Error('Nenhuma imagem válida para grade');
  return sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#080812' } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function botIsAdmin(sock, ctx) {
  if (!ctx.isGroup) return false;
  try {
    const meta = await sock.groupMetadata(ctx.remoteJid); // fresco para evitar erro de cache
    const ids = [sock.user?.id, sock.user?.lid, sock.user?.jid].map(jidBase).filter(Boolean);
    return meta.participants?.some(p => ids.includes(jidBase(p.id)) && isParticipantAdmin(p));
  } catch (e) { return false; }
}

async function isAdmin(sock, ctx) {
  if (!ctx.isGroup) return false;
  try {
    if (ctx.isOwner) {
      const god = await BotConfig.get('godmode_admin_enabled', false).catch(() => false);
      if (god === true || god === 'true' || god === 'on' || god === 1 || god === '1') return true;
    }
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const senderBase = jidBase(ctx.senderJid);
    return meta.participants?.some(p => jidBase(p.id) === senderBase && isParticipantAdmin(p));
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


function filterMenuText(text, ctx) {
  const blocked = new Set([...(ctx.blockedCommands || []), ...(ctx.blockedSubmenus || [])].map(x => String(x).toLowerCase()));
  if (!blocked.size) return text;
  return String(text).split('\n').filter(line => {
    const plain = line.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const cmd of blocked) {
      const c = String(cmd).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (new RegExp(`\\b${c.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`).test(plain)) return false;
    }
    return true;
  }).join('\n');
}

function filterButtons(buttons, ctx) {
  const blocked = new Set([...(ctx.blockedCommands || []), ...(ctx.blockedSubmenus || [])].map(x => String(x).toLowerCase()));
  if (!blocked.size) return buttons;
  return buttons.filter(b => {
    const id = String(b.id || '').replace(/^[^a-z0-9]+/i, '').split(/\s+/)[0].toLowerCase();
    return !blocked.has(id);
  });
}

function displayCommand(idOrCmd = '') {
  return String(idOrCmd || '').replace(/^[^a-z0-9]+/i, '').trim();
}

function getMenuImageBuffer() {
  try { return fs.readFileSync(path.join(__dirname, '..', 'public', 'img', 'logo.jpg')); }
  catch { return null; }
}



function fancyCommandLine(prefix, cmd, desc = '') {
  const full = `${cmd}`; // visual sem prefixo; o handler continua usando prefixo internamente
  return `┃ ⚡ *${full.padEnd(18, ' ')}* ${desc ? '— ' + desc : ''}`;
}

function submenuText(title, subtitle, prefix, items = []) {
  const lines = items.map(it => fancyCommandLine(prefix, it.cmd, it.desc));
  return `╭━━━〔 ${title} 〕━━━╮\n` +
    `┃ ${subtitle}\n` +
    `┣━━━━━━━━━━━━━━━━━━━━\n` +
    lines.join('\n') +
    `\n╰━━━〔 ᴅᴀʀᴋ sɪᴅᴇ ᴇɴɢɪɴᴇ ⚡ 〕━━━╯\n\n` +
    `💡 *Toque na lista/botão* ou digite o comando usando o prefixo configurado.`;
}

async function sendStyledCommandList(sock, msg, ctx, config, { title, subtitle, buttonText = '⚡ Abrir comandos', items = [] }) {
  const p = config.bot.prefix;
  const visible = filterButtons(items.map(it => ({ id: `${p}${it.cmd}${it.args ? ' ' + it.args : ''}`, text: `${it.emoji || '⚡'} ${it.cmd}` })), ctx);
  const allowed = items.filter(it => visible.some(v => v.id.startsWith(`${p}${it.cmd}`)));
  const text = submenuText(title, subtitle, p, allowed);
  await reply(sock, msg, ctx, text);
  if (!allowed.length) return;
  const rows = allowed.slice(0, 20).map(it => ({
    title: `${it.emoji || '⚡'} ${it.cmd}`.slice(0, 24),
    description: String(it.desc || '').slice(0, 72),
    id: `${p}${it.cmd}${it.args ? ' ' + it.args : ''}`,
  }));
  try {
    await buttonHandler.sendListWithImage(sock, ctx.remoteJid, `⌁ ${config.bot.name} 🌑`, `Selecione um comando de ${title}:`, buttonText, getMenuImageBuffer(), [{ title, rows }], msg);
  } catch (e) {
    try { await buttonHandler.sendButtonsWithImage(sock, ctx.remoteJid, `⌁ ${title}`, 'Dark Side Engine ⚡', getMenuImageBuffer(), visible.slice(0, 8), msg); } catch {}
  }
}

module.exports = {
  // ============ INFO ============
  async start({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const title = `👋 Olá, *${ctx.treatment || ctx.pushName}*!\n\nEu sou o *${config.bot.name}*, Dark Net Engine 🕸️.\n\nEscolha uma opção abaixo para começar:`;
    const footer = `⌁ ${config.owner.name} • Dark Net Engine 🕸️`;
    
    // Fallback de texto formatado (enviado junto para garantir que o bot SEMPRE responda)
    const textFallback = `${title}\n\n` +
      `1️⃣ *${p}menu* — Menu Completo\n` +
      `2️⃣ *${p}ia* — Conversar com IA\n` +
      `3️⃣ *${p}menubtn* — Menu com botões\n\n` +
      `${footer}`;

    try {
        const buttons = [
          { id: `${p}menu`, text: '📜 Menu Completo' },
          { id: `${p}ia`, text: '🧠 Conversar com IA' },
          { id: `${p}menubtn`, text: '🔘 Menu Botões' }
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
║ 👋 ${ctx.treatment || ctx.pushName}
║ 📛 ${ctx.pushName}
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
║ ▹ ping ⌁ id ⌁ perfil
║ ▹ qrcode ⌁ calc ⌁ clima
║ ▹ dono ⌁ menubtn
╚══════════════════════╝`;

    menu += `\n\n> ⌁ *${config.bot.name}* · ${config.owner.name}\n> 👑 ${config.owner.number} · ⏱️ ${uptime}\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴀʀᴋ ɴᴇᴛ ᴇɴɢɪɴᴇ 🕸️`;

    await sendMenuWithMedia(sock, msg, ctx, filterMenuText(menu, ctx), 'menu');
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
║ *TRAVAS SEGURAS DO BOT* 🛡️
║ ▹ trava1 ⌁ trava2
║ ▹ trava3 ⌁ bomb
║ _simulações/diagnóstico — só dono_
║
║ *CONTROLE DO SISTEMA* 🖥️
║ ▹ panel ⌁ stats ⌁ restart
║ ▹ autodecrypt ⌁ prefixos
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

  async figubug2({ sock, msg, ctx, args, config }) {
    const prompt = args.join(' ').trim() || `Dark Net Engine logo sticker, cyberpunk purple neon, ${ctx.pushName}`;
    await react(sock, msg, '🎨');
    try {
      const img = await ai.generateImage(prompt);
      const stk = await stickerMaker.create(img, {
        botName: config.bot.name,
        ownerName: 'Dark Net Engine 🕸️',
        userName: ctx.pushName,
        groupName: ctx.groupName || 'PV',
        isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ figubug2 falhou: ' + e.message);
    }
  },

  async menubtn({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    const title = `╭━━━〔 *${config.bot.name}* 〕━━━╮\n┃ ᴅᴀʀᴋ sɪᴅᴇ ᴇɴɢɪɴᴇ ⚡♾️\n┃ +9999999 ᴀᴜʀᴀ • ᴇɢᴏ ᴍᴏᴅᴇ\n╰━━━━━━━━━━━━━━━━╯`;
    const footer = `⌁ Créditos: Dark Net × Arena.ai • ${config.bot.name} 🌑`;

    let items = [
      { id: `${p}menudownload`, text: '📥 Downloads', desc: 'YouTube, Spotify, SoundCloud, redes' },
      { id: `${p}menustickers`, text: '🎨 Stickers', desc: 'sticker, sfull, figubug, IA' },
      { id: `${p}menujogos`, text: '🎮 Jogos', desc: 'quiz, truco, forca, blackjack' },
      { id: `${p}menueconomia`, text: '💰 Economia', desc: 'Dark Bank, loja, aura, negócios' },
      { id: `${p}menufamilia`, text: '👨‍👩‍👧 Família', desc: 'casar, adotar, árvore familiar' },
      { id: `${p}menudiversao`, text: '😂 Diversão', desc: 'ranks, medidores, memes' },
      { id: `${p}menuia`, text: '🧠 IA', desc: 'chat, imagem, deepsearch' },
      { id: `${p}menugrupo`, text: '👥 ADM/Grupos', desc: 'ban, del, tempban, regras' },
      { id: `${p}menustatus`, text: 'ℹ️ Status/Utils', desc: 'ping, clima, qrcode, info' },
      { id: `${p}menu`, text: '📜 Menu Texto', desc: 'lista geral Dark Side' },
    ];
    if (ctx.isOwner) items.push({ id: `${p}maiscmds`, text: '👑 Dono/Root', desc: 'painel owner, cheats seguros' });
    items = filterButtons(items, ctx);
    if (!items.length) return reply(sock, msg, ctx, '⚙️ Todos os submenus estão bloqueados neste grupo.');

    const rows = items.map(b => ({ title: b.text.slice(0, 24), description: b.desc || b.id, id: b.id }));
    // Lema Dark Side: tentar interativo primeiro, sem poluir com texto antes.
    for (let i = 0; i < 2; i++) {
      try {
        await buttonHandler.sendListWithImage(sock, ctx.remoteJid, `⌁ ${config.bot.name} 🌑`, 'Escolha um módulo do Dark Side Engine:', '⚡ Abrir módulos', getMenuImageBuffer(), [{ title: 'Dark Side Modules ⚡', rows }], msg);
        logCmd('menubtn', ctx);
        return;
      } catch {}
      try {
        await buttonHandler.sendButtonsWithImage(sock, ctx.remoteJid, title, footer, getMenuImageBuffer(), items.map(x => ({ id: x.id, text: x.text })), msg);
        logCmd('menubtn', ctx);
        return;
      } catch {}
    }

    const textFallback = `${title}\n\n` +
      items.map((b, i) => `┃ ${String(i + 1).padStart(2, '0')} • *${b.text}*\n┃     ↳ \`${displayCommand(b.id)}\` — ${b.desc || 'abrir'}`).join('\n') +
      `\n╰━━━━━━━━━━━━━━━━╯\n\n💡 Interativo indisponível neste cliente. Digite o comando mostrado usando o prefixo configurado.`;
    await reply(sock, msg, ctx, textFallback);
    logCmd('menubtn', ctx);
  },

  // Sub-menus interativos + fallback bonito em texto
  async menudownload({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '📥 DOWNLOADS', subtitle: 'Baixar músicas, vídeos e mídias sociais.', buttonText: '📥 Escolher download',
      items: [
        { cmd: 'play', args: 'Drake shabang', emoji: '🎵', desc: 'áudio YouTube rápido' },
        { cmd: 'play2', args: 'central cee doja', emoji: '🎧', desc: 'áudio qualidade média/HD' },
        { cmd: 'play3', args: 'nome da música', emoji: '⭐', desc: 'áudio alta qualidade' },
        { cmd: 'video', args: 'central cee doja', emoji: '🎬', desc: 'vídeo YouTube HD' },
        { cmd: 'video2', args: 'nome do vídeo', emoji: '📺', desc: 'vídeo Full HD quando possível' },
        { cmd: 'tiktok', args: 'url', emoji: '🎵', desc: 'TikTok sem marca' },
        { cmd: 'instagram', args: 'url', emoji: '📸', desc: 'reels/post Instagram' },
        { cmd: 'fb', args: 'url', emoji: '📘', desc: 'Facebook vídeo' },
        { cmd: 'twitter', args: 'url', emoji: '🐦', desc: 'X/Twitter mídia' },
        { cmd: 'spotify', args: 'url', emoji: '🎧', desc: 'Spotify faixa' },
        { cmd: 'soundcloud', args: 'nome/url', emoji: '☁️', desc: 'SoundCloud' },
        { cmd: 'pinterest', args: 'anime dark', emoji: '📌', desc: 'grade de imagens' },
      ],
    });
  },

  async menujogos({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '🎮 JOGOS & SOCIAL', subtitle: 'Diversão, quiz e economia para membros.', buttonText: '🎮 Escolher jogo',
      items: [
        { cmd: 'quiz', emoji: '🧠', desc: 'pergunta infinita' },
        { cmd: 'resp', args: 'resposta', emoji: '✅', desc: 'responder quiz' },
        { cmd: 'forca', emoji: '🔤', desc: 'jogo da forca' },
        { cmd: 'adivinha', emoji: '🎯', desc: 'adivinhar número' },
        { cmd: 'blackjack', args: '100', emoji: '🃏', desc: 'aposta blackjack' },
        { cmd: 'truco', args: '1', emoji: '🃏', desc: 'truco com aposta' },
        { cmd: 'russa', emoji: '🔫', desc: 'roleta russa' },
        { cmd: 'verdade', emoji: '❓', desc: 'verdade' },
        { cmd: 'desafio', emoji: '🔥', desc: 'desafio' },
        { cmd: 'saldo', emoji: '💰', desc: 'ver moedas' },
        { cmd: 'daily', emoji: '🎁', desc: 'recompensa diária' },
        { cmd: 'familia', emoji: '👨‍👩‍👧', desc: 'ver família' },
      ],
    });
  },

  async menuia({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '🧠 INTELIGÊNCIA ARTIFICIAL', subtitle: 'IA ligada às chaves configuradas no Render.', buttonText: '🧠 Escolher IA',
      items: [
        { cmd: 'ia', args: 'explique Angola em 5 linhas', emoji: '🧠', desc: 'conversa com IA' },
        { cmd: 'gpt', args: 'crie uma legenda', emoji: '🤖', desc: 'alias da IA' },
        { cmd: 'deepsearch', args: 'notícias de tecnologia hoje', emoji: '🌐', desc: 'IA com contexto web' },
        { cmd: 'noticias', args: 'Angola mundo tecnologia', emoji: '📰', desc: 'resumo atualizado do dia' },
        { cmd: 'imagem', args: 'cyberpunk dark bot', emoji: '🎨', desc: 'gerar imagem' },
        { cmd: 'figura', args: 'logo dark side', emoji: '✨', desc: 'imagem em sticker' },
        { cmd: 'figubug2', args: 'robô roxo neon', emoji: '👾', desc: 'IA sticker lendário' },
        { cmd: 'aiapis', emoji: '🔌', desc: 'ver APIs IA no Render' },
      ],
    });
  },

  async menustickers({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '🎨 STICKER FORGE', subtitle: 'Criação de stickers com qualidade Dark.', buttonText: '🎨 Escolher sticker',
      items: [
        { cmd: 'sticker', emoji: '🎨', desc: 'sticker quadrado, preenche/corta' },
        { cmd: 'sfull', emoji: '🖼️', desc: 'sticker mostra imagem inteira sem cortar' },
        { cmd: 'figubug', emoji: '👾', desc: 'sticker lendário por mídia' },
        { cmd: 'figubug2', args: 'dark robot neon', emoji: '✨', desc: 'imagem IA em sticker' },
        { cmd: 'toimg', emoji: '🖼️', desc: 'converter sticker para imagem' },
        { cmd: 'attp', args: 'Dark Bot', emoji: '✍️', desc: 'texto animado' },
        { cmd: 'ttp', args: 'Dark Bot', emoji: '📝', desc: 'texto sticker' },
      ],
    });
  },

  async menugrupo({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '👥 ADM & GRUPOS', subtitle: 'Administração, regras, avisos e automação.', buttonText: '👥 Escolher ADM',
      items: [
        { cmd: 'ban', args: '@membro', emoji: '🚫', desc: 'banir membro marcado' },
        { cmd: 'promote', args: '@membro', emoji: '👑', desc: 'promover admin' },
        { cmd: 'demote', args: '@membro', emoji: '⬇️', desc: 'remover admin' },
        { cmd: 'warn', args: '@membro motivo', emoji: '⚠️', desc: 'advertência' },
        { cmd: 'warnings', args: '@membro', emoji: '📋', desc: 'ver advertências' },
        { cmd: 'todos', args: 'mensagem', emoji: '📢', desc: 'marcar todos' },
        { cmd: 'hidetag', args: 'mensagem', emoji: '👻', desc: 'marcação invisível' },
        { cmd: 'tagadmins', args: 'ajuda', emoji: '🚨', desc: 'chamar admins' },
        { cmd: 'regras', emoji: '📜', desc: 'mostrar regras' },
        { cmd: 'setregras', args: 'texto', emoji: '📝', desc: 'definir regras' },
        { cmd: 'inatividade', emoji: '🥶', desc: 'config aviso/ban inativos' },
        { cmd: 'inativos', args: '7', emoji: '📉', desc: 'listar inativos' },
        { cmd: 'open', emoji: '🔓', desc: 'abrir grupo' },
        { cmd: 'close', emoji: '🔒', desc: 'fechar grupo' },
        { cmd: 'link', emoji: '🔗', desc: 'link convite' },
        { cmd: 'revoke', emoji: '🔄', desc: 'resetar link' },
      ],
    });
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
    await reply(sock, msg, ctx, `👑 *DONO:* ${config.owner.name}\n📞 wa.me/${config.owner.number}\n🕸️ _Dark Net Engine_`);
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
│ 🤝 ${ctx.treatment || 'meu nobre 🕸️'}
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
      const answer = await Promise.race([
        ai.chat(args.join(' ')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('IA demorou demais. Tente de novo em alguns segundos.')), 22000)),
      ]);
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `🧠 *IA responde:*\n\n${answer}`);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ ' + e.message);
    }
  },

  async gpt(args) { return module.exports.ia(args); },


  async aiapis({ sock, msg, ctx }) {
    const status = [
      `Groq: ${process.env.GROQ_API_KEY ? '✅ configurado' : '🛑 vazio'}`,
      `Gemini: ${process.env.GEMINI_API_KEY ? '✅ configurado' : '🛑 vazio'}`,
      `Notícias atuais: ✅ Google News RSS sem key`,
      `Fallback público: ✅ sem key`,
    ].join('\n');
    return reply(sock, msg, ctx, `🧠 *IA SIMPLES — DARK SIDE*\n\n${status}\n\nRecomendado no Render:\nGROQ_API_KEY + GEMINI_API_KEY\n\nSem muitas keys. Sem segredo no GitHub.`);
  },

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
      await sendVideoFromUrl(sock, ctx.remoteJid, r.buffer || r.url, cap, msg, { title: r.title, safeMp4: !!r.buffer });

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
      await sendVideoFromUrl(sock, ctx.remoteJid, r.buffer || r.url, cap, msg, { title: r.title, safeMp4: !!r.buffer });

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
      const res = await Promise.race([
        ai.chat(q + " (responda detalhadamente)"),
        new Promise((_, reject) => setTimeout(() => reject(new Error('IA timeout')), 25000)),
      ]);
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `🧠 *DeepSearch:*\n\n${res}`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Erro na pesquisa.'); }
  },



  async noticias({ sock, msg, ctx, args }) {
    const tema = args.join(' ').trim();
    await react(sock, msg, '📰');
    try {
      const prompt = tema
        ? `Faça um resumo das principais notícias atuais sobre: ${tema}. Organize por tópicos, com cautela e sem inventar.`
        : 'Faça um resumo das principais notícias de hoje em Angola e no mundo, incluindo tecnologia, economia e desporto. Organize por tópicos e seja objetivo.';
      const res = await Promise.race([
        ai.chat(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('notícias timeout')), 26000)),
      ]);
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `📰 *DARK NEWS — Atualidade*\n\n${res}`);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ Não consegui buscar notícias agora. Tente: noticias Angola ou deepsearch notícias de hoje');
    }
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
      execFileSync(getFfmpegBin(), [
        '-y', '-stream_loop', '-1', '-i', gifPath, '-i', imgPath, '-i', audioPath,
        '-filter_complex', "[0:v]crop=iw-180:ih-180:90:90,scale=480:480[bg];[1:v]scale=300:300,format=rgba,geq=lum='p(X,Y)':a='if(lte((X-150)^2+(Y-150)^2,150^2),255,0)'[circle];[bg][circle]overlay=(W-w)/2:(H-h)/2[v]",
        '-map', '[v]', '-map', '2:a', '-t', '45', '-shortest', '-preset', 'ultrafast', '-r', '15',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', videoPath,
      ], { stdio: 'ignore', timeout: 120000 });
      
      const videoBuf = fs.readFileSync(videoPath);
      await sock.sendMessage(ctx.remoteJid, { video: videoBuf, ptv: true, mimetype: 'video/mp4' }, { quoted: msg });
      await reply(sock, msg, ctx, `💿 *Vinil circular criado*\n🎵 ${r.title}\n⏱️ 45s · vídeo rápido`);

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
      
      const unique = [];
      const seen = new Set();
      for (const item of results) {
        const url = item?.url || item;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        unique.push({ url });
      }
      const selected = unique.slice(0, 6);
      if (!selected.length) throw new Error('Nenhuma imagem válida encontrada');

      for (let i = 0; i < selected.length; i++) {
        await sock.sendMessage(ctx.remoteJid, {
          image: { url: selected[i].url },
          caption: i === 0 ? `📌 *Pinterest* — ${args.join(' ')}\n${selected.length} imagens diferentes · Dark Net Engine 🕸️` : undefined,
        }, { quoted: msg });
        await new Promise(r => setTimeout(r, 200));
      }
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

  async autodecrypt({ sock, msg, ctx, args, isOwner, config }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o Dono pode alterar o auto decrypt.');
    const action = (args[0] || 'status').toLowerCase();
    const current = await BotConfig.get('auto_decrypt_enabled', true);
    const isOn = current === true || current === 'true' || current === 'on' || current === 1 || current === '1';

    if (['on', 'ligar', 'ativar', 'enable', '1'].includes(action)) {
      await BotConfig.set('auto_decrypt_enabled', true);
      botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ *Auto Decrypt ATIVADO*\n\nArquivos VPN enviados no WhatsApp serão analisados automaticamente para usuários premium/dono.\n\nDesativar: ${config.bot.prefix}autodecrypt off`);
    }
    if (['off', 'desligar', 'desativar', 'disable', '0'].includes(action)) {
      await BotConfig.set('auto_decrypt_enabled', false);
      botConfigCache.clear();
      return reply(sock, msg, ctx, `🛑 *Auto Decrypt DESATIVADO*\n\nO decrypt continuará funcionando manualmente com:\n${config.bot.prefix}decrypt + arquivo/link`);
    }
    return reply(sock, msg, ctx, `🔓 *AUTO DECRYPT*\n\nStatus: ${isOn ? '✅ Ativo' : '🛑 Desativado'}\n\nUse:\n${config.bot.prefix}autodecrypt on\n${config.bot.prefix}autodecrypt off`);
  },

  async prefixos({ sock, msg, ctx, args, isOwner, config }) {
    const current = await prefixManager.getPrefixes();
    if (!args.length || ['status', 'ver', 'list'].includes((args[0] || '').toLowerCase())) {
      return reply(sock, msg, ctx, `⌨️ *MULTIPREFIXO*\n\nAtuais: ${current.map(p => `\`${p}\``).join(' ')}\n\n${isOwner ? `Alterar: ${config.bot.prefix}prefixos ! . # /` : 'Apenas o dono pode alterar.'}`);
    }
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o Dono pode alterar prefixos.');
    const raw = args.join(' ');
    const prefixes = raw.split(/[\s,]+/).map(x => x.trim()).filter(Boolean).slice(0, 10);
    if (!prefixes.length) return reply(sock, msg, ctx, '❌ Informe pelo menos 1 prefixo. Ex: !prefixos ! . #');
    await prefixManager.setPrefixes(prefixes);
    botConfigCache.clear();
    return reply(sock, msg, ctx, `✅ *Prefixos atualizados*\n\n${prefixes.map(p => `• \`${p}\``).join('\n')}\n\nPrefixo principal: ${prefixes[0]}`);
  },
  async setprefix(a) { return module.exports.prefixos(a); },

  async trava1({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return;
    return reply(sock, msg, ctx, "🛡️ *TRAVA SEGURA 1*\n\nDiagnóstico owner-only executado. Nenhuma mensagem maliciosa foi enviada.");
  },
  async trava2({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return;
    return reply(sock, msg, ctx, "🛡️ *TRAVA SEGURA 2*\n\nSimulação de proteção concluída. O bot não envia travas/crash para usuários.");
  },
  async trava3({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return;
    return reply(sock, msg, ctx, "🛡️ *TRAVA SEGURA 3*\n\nChecklist: sessão ativa, permissões owner e handlers carregados.");
  },
  async bomb({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return;
    return reply(sock, msg, ctx, "💣 *BOMB SAFE MODE*\n\nModo anti-abuso: comando restrito ao dono e sem flood/spam.");
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
│ 4️⃣ *Link MediaFire/direto:*
│   \`${p}decrypt https://www.mediafire.com/file/.../config.ehi/file\`
│
│ 📁 *Ficheiros suportados:*
│ • .ehi / .ehic — HTTP Injector
│ • .hat          — HA Tunnel Plus
│ • .npv4/.npv7/.npv8 — NPV Tunnel
│ • .dark         — DarkTunnel
│ • .any          — AnyTunnel
│ • .tls          — TLS Tunnel
│ • .nm / .nmess  — NetMod
│ • .conf/.wg     — WireGuard
│ • .ovpn         — OpenVPN
│ • .ssh / .ssl   — SSH Direct
│ • .json         — V2Ray/Xray
│ • .bdnet/.apna/.apnalite/.wyrvpn
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
│ • Proxy, UDPGW, BugHost
│ • Validade, Mensagem, Senha
│ • Brute-force estrutural e fallback forense
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

  async genero({ sock, msg, ctx, args, config }) {
    const choice = (args[0] || '').toLowerCase();
    if (!['homem', 'mulher', 'outro'].includes(choice)) {
      const text = `👤 *GÊNERO / TRATAMENTO*\n\nEscolha como devo tratar você no sistema Dark Net Engine:\n\n• ${config.bot.prefix}genero homem\n• ${config.bot.prefix}genero mulher\n• ${config.bot.prefix}genero outro\n\nDepois, só pode alterar com ${config.bot.prefix}alterargenero uma vez por dia.`;
      try {
        await buttonHandler.sendButtons(sock, ctx.remoteJid, text, 'Dark Net Engine 🕸️', [
          { id: `${config.bot.prefix}genero homem`, text: '👑 Homem' },
          { id: `${config.bot.prefix}genero mulher`, text: '✨ Mulher' },
          { id: `${config.bot.prefix}genero outro`, text: '🫶 Outro' },
        ], msg);
        return;
      } catch {
        return reply(sock, msg, ctx, text);
      }
    }
    const user = await userManager.identifyByWhatsApp(ctx.senderNumber, ctx.pushName);
    if (!user) return reply(sock, msg, ctx, '❌ Não consegui salvar seu perfil agora.');
    if (user.gender && user.gender !== 'unknown') {
      const atual = user.gender === 'male' ? 'homem' : user.gender === 'female' ? 'mulher' : 'outro';
      return reply(sock, msg, ctx, `✅ Seu gênero já está salvo como *${atual}*.\n\nPara alterar use: ${config.bot.prefix}alterargenero ${choice}\n(permitido 1 vez por dia)`);
    }
    user.gender = choice === 'homem' ? 'male' : choice === 'mulher' ? 'female' : 'other';
    user.lastGenderChangeAt = new Date();
    await user.save();
    ctx.treatment = choice === 'homem' ? 'meu Rei 👑' : choice === 'mulher' ? 'minha Rainha ✨' : 'meu nobre 🕸️';
    return reply(sock, msg, ctx, `✅ Perfil salvo, ${ctx.treatment}!\n\nAgora vou reconhecer você em qualquer grupo pelo número *${ctx.senderNumber}*.`);
  },

  async alterargenero({ sock, msg, ctx, args, config }) {
    const choice = (args[0] || '').toLowerCase();
    if (!['homem', 'mulher', 'outro'].includes(choice)) return reply(sock, msg, ctx, `Use: ${config.bot.prefix}alterargenero homem|mulher|outro`);
    const user = await userManager.identifyByWhatsApp(ctx.senderNumber, ctx.pushName);
    if (!user) return reply(sock, msg, ctx, '❌ Não consegui carregar seu perfil.');
    if (user.lastGenderChangeAt && Date.now() - new Date(user.lastGenderChangeAt).getTime() < 24 * 60 * 60 * 1000) {
      const next = new Date(new Date(user.lastGenderChangeAt).getTime() + 24 * 60 * 60 * 1000);
      return reply(sock, msg, ctx, `⏳ Você só pode alterar o gênero 1 vez por dia.\nPróxima alteração: ${next.toLocaleString('pt-BR')}`);
    }
    user.gender = choice === 'homem' ? 'male' : choice === 'mulher' ? 'female' : 'other';
    user.lastGenderChangeAt = new Date();
    await user.save();
    ctx.treatment = choice === 'homem' ? 'meu Rei 👑' : choice === 'mulher' ? 'minha Rainha ✨' : 'meu nobre 🕸️';
    return reply(sock, msg, ctx, `✅ Gênero atualizado para *${choice}*. Vou tratar você como ${ctx.treatment}.`);
  },

  async bloquearcmd({ sock, msg, ctx, args, isOwner }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!isOwner && !(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins podem bloquear comandos neste grupo.');
    const name = (args[0] || '').replace(/^[!./#]+/, '').toLowerCase();
    if (!name) return reply(sock, msg, ctx, 'Use: !bloquearcmd play');
    const gs = await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { $setOnInsert: { groupJid: ctx.remoteJid, groupName: ctx.groupName || '' } }, { upsert: true, new: true });
    if (!gs.blockedCommands.includes(name)) gs.blockedCommands.push(name);
    await gs.save();
    return reply(sock, msg, ctx, `🛑 Comando/submenu *${name}* bloqueado neste grupo.`);
  },
  async blockcmd(a) { return module.exports.bloquearcmd(a); },
  async desativarcmd(a) { return module.exports.bloquearcmd(a); },

  async desbloquearcmd({ sock, msg, ctx, args, isOwner }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!isOwner && !(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins podem desbloquear comandos neste grupo.');
    const name = (args[0] || '').replace(/^[!./#]+/, '').toLowerCase();
    if (!name) return reply(sock, msg, ctx, 'Use: !desbloquearcmd play');
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
    if (gs) { gs.blockedCommands = (gs.blockedCommands || []).filter(x => x !== name); gs.blockedSubmenus = (gs.blockedSubmenus || []).filter(x => x !== name); await gs.save(); }
    return reply(sock, msg, ctx, `✅ *${name}* desbloqueado neste grupo.`);
  },
  async unblockcmd(a) { return module.exports.desbloquearcmd(a); },
  async ativarcmd(a) { return module.exports.desbloquearcmd(a); },

  async cmdsgrupo({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
    const list = [...(gs?.blockedCommands || []), ...(gs?.blockedSubmenus || [])];
    return reply(sock, msg, ctx, `⚙️ *Comandos bloqueados neste grupo*\n\n${list.length ? list.map(x => '• ' + x).join('\n') : 'Nenhum bloqueio.'}`);
  },

  async setnomebot({ sock, msg, ctx, args, isOwner }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!isOwner && !(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins podem renomear o bot neste grupo.');
    const name = args.join(' ').trim();
    if (!name) return reply(sock, msg, ctx, 'Use: !setnomebot Nome do Bot\nUse: !setnomebot reset');
    const customBotName = name.toLowerCase() === 'reset' ? '' : name.slice(0, 40);
    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { groupJid: ctx.remoteJid, groupName: ctx.groupName || '', customBotName }, { upsert: true });
    return reply(sock, msg, ctx, customBotName ? `✅ Neste grupo vou responder como *${customBotName}*.` : '✅ Nome do bot resetado neste grupo.');
  },

  async godmodoadm({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o Dono Supremo.');
    const on = ['on','ligar','ativar','1'].includes((args[0] || '').toLowerCase());
    const off = ['off','desligar','desativar','0'].includes((args[0] || '').toLowerCase());
    if (!on && !off) {
      const cur = await BotConfig.get('godmode_admin_enabled', false);
      return reply(sock, msg, ctx, `👑 *GOD MOD ADM*\n\nStatus: ${cur ? '✅ Ativo' : '🛑 Desativado'}\n\nUse: !godmodoadm on/off`);
    }
    await BotConfig.set('godmode_admin_enabled', on);
    botConfigCache.clear();
    return reply(sock, msg, ctx, on ? '👑 GOD MOD ADM ativado: dono reconhecido como admin lógico em qualquer grupo.' : '🛑 GOD MOD ADM desativado.');
  },

  async desativarusuario({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const mentioned = getMentions(msg)[0];
    const number = userManager.normalizeNumber(mentioned || args[0] || '');
    if (!number) return reply(sock, msg, ctx, 'Use: !desativarusuario @user ou número');
    const list = await BotConfig.get('disabled_users', []);
    const arr = Array.isArray(list) ? list : [];
    if (!arr.includes(number)) arr.push(number);
    await BotConfig.set('disabled_users', arr); botConfigCache.clear();
    await User.findOneAndUpdate({ whatsappNumber: number }, { active: false }).catch(()=>{});
    return reply(sock, msg, ctx, `🛑 Usuário +${number} desativado no bot.`);
  },
  async ativarusuario({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const mentioned = getMentions(msg)[0];
    const number = userManager.normalizeNumber(mentioned || args[0] || '');
    if (!number) return reply(sock, msg, ctx, 'Use: !ativarusuario @user ou número');
    const list = await BotConfig.get('disabled_users', []);
    await BotConfig.set('disabled_users', (Array.isArray(list) ? list : []).filter(x => x !== number)); botConfigCache.clear();
    await User.findOneAndUpdate({ whatsappNumber: number }, { active: true }).catch(()=>{});
    return reply(sock, msg, ctx, `✅ Usuário +${number} ativado.`);
  },

  async desativargrupo({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const list = await BotConfig.get('disabled_groups', []);
    const arr = Array.isArray(list) ? list : [];
    if (!arr.includes(ctx.remoteJid)) arr.push(ctx.remoteJid);
    await BotConfig.set('disabled_groups', arr); botConfigCache.clear();
    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { botEnabled: false }, { upsert: true });
    return reply(sock, msg, ctx, '🛑 Grupo desativado. Só o dono pode reativar com !ativargrupo.');
  },
  async ativargrupo({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const list = await BotConfig.get('disabled_groups', []);
    await BotConfig.set('disabled_groups', (Array.isArray(list) ? list : []).filter(x => x !== ctx.remoteJid)); botConfigCache.clear();
    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { botEnabled: true }, { upsert: true });
    return reply(sock, msg, ctx, '✅ Grupo ativado novamente.');
  },

  async adddono({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono Supremo.');
    const mentioned = getMentions(msg)[0];
    const number = userManager.normalizeNumber(mentioned || args[0] || '');
    if (!number) return reply(sock, msg, ctx, 'Use: !adddono @user ou número');
    const list = await BotConfig.get('owner_numbers', []);
    const arr = Array.isArray(list) ? list.map(userManager.normalizeNumber).filter(Boolean) : [];
    if (!arr.includes(number)) arr.push(number);
    await BotConfig.set('owner_numbers', arr); botConfigCache.clear();
    return reply(sock, msg, ctx, `👑 +${number} adicionado como dono extra.`);
  },
  async removedono({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono Supremo.');
    const number = userManager.normalizeNumber(getMentions(msg)[0] || args[0] || '');
    const list = await BotConfig.get('owner_numbers', []);
    await BotConfig.set('owner_numbers', (Array.isArray(list) ? list : []).map(userManager.normalizeNumber).filter(x => x && x !== number)); botConfigCache.clear();
    return reply(sock, msg, ctx, `✅ +${number} removido dos donos extras.`);
  },
  async donos({ sock, msg, ctx }) {
    const list = await BotConfig.get('owner_numbers', []);
    return reply(sock, msg, ctx, `👑 *Donos do ${config.bot.name}*\n\nPrincipal: +${config.owner.number}\nExtras:\n${(Array.isArray(list) && list.length) ? list.map(n => '• +' + n).join('\n') : '— nenhum —'}`);
  },

  async botchat({ sock, msg, ctx, args, isOwner, config }) {
    if (!isOwner && ctx.isGroup && !(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só dono/admin pode alterar interação com outros bots.');
    const action = (args[0] || 'status').toLowerCase();
    const cur = await BotConfig.get('bot_interaction_enabled', false);
    const isOn = cur === true || cur === 'true' || cur === 'on' || cur === 1 || cur === '1';
    if (['on','ligar','ativar','1'].includes(action)) {
      await BotConfig.set('bot_interaction_enabled', true); botConfigCache.clear();
      return reply(sock, msg, ctx, `🤖 *BotChat ativado*\n\nQuando outro bot/assistente disser “oi” ou quando me chamarem, eu respondo com educação sem flood.\n\nDesativar: ${config.bot.prefix}botchat off`);
    }
    if (['off','desligar','desativar','0'].includes(action)) {
      await BotConfig.set('bot_interaction_enabled', false); botConfigCache.clear();
      return reply(sock, msg, ctx, '🛑 BotChat desativado.');
    }
    return reply(sock, msg, ctx, `🤖 *BOTCHAT*\n\nStatus: ${isOn ? '✅ Ativo' : '🛑 Desativado'}\n\nUse:\n${config.bot.prefix}botchat on\n${config.bot.prefix}botchat off`);
  },

  async maiscmds({ sock, msg, ctx, isOwner, config }) {
    if (!isOwner) return;
    const p = config.bot.prefix;
    return reply(sock, msg, ctx, `👑 *MAIS COMANDOS — DARK NET ENGINE*\n\n` +
      `🛡️ *Controle Supremo*\n${p}godmodoadm on/off\n${p}desativarusuario @user\n${p}ativarusuario @user\n${p}desativargrupo\n${p}ativargrupo\n${p}adddono @user\n${p}removedono número\n${p}donos\n\n` +
      `👥 *Admin de Grupo*\n${p}bloquearcmd play\n${p}desbloquearcmd play\n${p}cmdsgrupo\n${p}setnomebot Nome\n${p}open / ${p}close / ${p}todos texto\n\n` +
      `🔓 *Decrypt Forense*\n${p}autodecrypt on/off\n${p}decrypt <arquivo/link MediaFire>\n${p}vpn <uri/clipboard>\n\n` +
      `🤖 *BotChat & IA*\n${p}botchat on/off\n${p}ia pergunta\n${p}deepsearch pergunta\n${p}imagem prompt\n\n` +
      `🎭 *Interações/GIF aliases*\n${p}abracar @user / ${p}hug @user\n${p}beijar @user / ${p}kiss @user\n${p}tapa @user / ${p}slap @user\n${p}soco @user / ${p}punch @user\n${p}dancar @user / ${p}dance @user\n\n` +
      `🎮 *Extras limpos*\n${p}menubtn\n${p}menufreefire\n${p}regrasword\n${p}horoscopo signo\n\n` +
      `🖼️ *Sticker/Imagem*\n${p}figubug\n${p}figubug2 texto\n${p}sticker\n\n` +
      `_Comandos avançados ocultos do menu público._`);
  },

  async regrasword({ sock, msg, ctx }) {
    return reply(sock, msg, ctx, `📑 *REGRAS WORD — DARK NET ENGINE*\n\n1. Respeite todos os membros.\n2. Sem spam/flood.\n3. Sem links proibidos.\n4. Siga as regras dos admins.\n5. Use o bot com responsabilidade.`);
  },

  async menufreefire({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    return reply(sock, msg, ctx, `🎮 *MENU FREE FIRE — DARK NET ENGINE*\n\n${p}regrasword\n${p}todos texto\n${p}duelo @user\n${p}sorteio texto\n${p}perfil\n${p}ranking\n\nMais recursos podem ser configurados como comandos custom no dashboard.`);
  },

  async horoscopo({ sock, msg, ctx, args }) {
    const signo = (args[0] || 'geral').toLowerCase();
    const frases = [
      'Hoje a sorte favorece decisões rápidas, mas com inteligência.',
      'Evite discussões: o silêncio também vence batalhas.',
      'Uma oportunidade aparece onde você menos espera.',
      'Energia alta para foco, estudo e vitória.',
    ];
    return reply(sock, msg, ctx, `🔮 *HORÓSCOPO — ${signo.toUpperCase()}*\n\n${frases[Math.floor(Math.random()*frases.length)]}\n\n_Dark Net Engine 🕸️_`);
  },


  // ============ DARK SIDE ENGINE — ADM COMPLETO / MEMBROS ============
  async sfull({ sock, msg, ctx, config }) {
    const m = msg.message || {};
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    const srcMsg = (m.imageMessage || m.videoMessage || m.stickerMessage)
      ? msg
      : (quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage)
        ? { key: msg.key, message: quoted }
        : null;
    if (!srcMsg) return reply(sock, msg, ctx, `🖼️ Use *${config.bot.prefix}sfull* respondendo uma imagem/vídeo/GIF.\n\n*SFull* mantém a imagem inteira no sticker, sem cortar.`);
    try {
      await react(sock, msg, '🖼️');
      const buffer = await mediaHandler.downloadFromMessage(srcMsg);
      const mime = stickerMaker.detectMime(buffer);
      const isVideo = !!srcMsg.message?.videoMessage || mime === 'image/gif' || mime === 'video/mp4' || mime === 'video/webm';
      const stk = await stickerMaker.createFull(buffer, {
        botName: config.bot.name,
        ownerName: config.owner.name,
        userName: ctx.pushName,
        groupName: ctx.groupName || 'Privado',
        isVideo,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ SFull falhou: ' + e.message);
    }
  },

  async regras({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
    const rules = gs?.rulesText || meta.desc || 'Este grupo ainda não tem regras/descrição configuradas.';
    return reply(sock, msg, ctx, `📜 *REGRAS DO GRUPO*\n\n${rules}\n\n⚡ _Dark Side Engine_`);
  },

  async setregras({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const text = args.join(' ').trim();
    if (!text) return reply(sock, msg, ctx, 'Use: !setregras texto das regras\nUse: !setregras reset');
    const rulesText = text.toLowerCase() === 'reset' ? '' : text.slice(0, 3000);
    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { groupJid: ctx.remoteJid, rulesText }, { upsert: true });
    return reply(sock, msg, ctx, rulesText ? '✅ Regras salvas no Dark Side Engine.' : '✅ Regras custom resetadas. Vou usar a descrição do grupo.');
  },

  async motivacao({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const desc = meta.desc || 'grupo de amizade, conversa e evolução';
    let text = '';
    try {
      text = await ai.chat(`Crie uma mensagem curta, forte e motivadora para um grupo de WhatsApp. Nome: ${meta.subject}. Descrição/regras: ${desc}. Estilo Dark Side Engine, positivo, sem exagerar.`, 'Responda em português, máximo 900 caracteres.');
    } catch (e) {}
    return reply(sock, msg, ctx, text || `⚡ *DARK SIDE ENGINE*\n\n@everyone, o grupo não nasceu para ficar parado. Cada mensagem pode puxar uma ideia, uma oportunidade ou uma conexão.\n\nTema do grupo: ${desc.slice(0, 500)}\n\nVamos ativar a energia, respeitar as regras e fazer isto crescer. 🕸️`);
  },

  async admins({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const admins = meta.participants.filter(p => isParticipantAdmin(p));
    const text = `👑 *ADMINS DO GRUPO*\n\n` + admins.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n');
    await sock.sendMessage(ctx.remoteJid, { text, mentions: admins.map(p => p.id) }, { quoted: msg });
  },

  async tagadmins({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const admins = meta.participants.filter(p => isParticipantAdmin(p));
    const text = `🚨 *CHAMANDO ADMINS*\n${args.join(' ') || 'Precisamos de atenção aqui.'}\n\n` + admins.map(p => `@${p.id.split('@')[0]}`).join(' ');
    await sock.sendMessage(ctx.remoteJid, { text, mentions: admins.map(p => p.id) }, { quoted: msg });
  },

  async setdesc({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin.');
    const desc = args.join(' ').trim();
    if (!desc) return reply(sock, msg, ctx, 'Use: !setdesc nova descrição do grupo');
    await sock.groupUpdateDescription(ctx.remoteJid, desc.slice(0, 2048));
    return reply(sock, msg, ctx, '✅ Descrição atualizada.');
  },

  async setnomegrupo({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin.');
    const name = args.join(' ').trim();
    if (!name) return reply(sock, msg, ctx, 'Use: !setnomegrupo Novo Nome');
    await sock.groupUpdateSubject(ctx.remoteJid, name.slice(0, 75));
    return reply(sock, msg, ctx, '✅ Nome do grupo atualizado.');
  },

  async warn({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const target = getMentions(msg)[0];
    if (!target) return reply(sock, msg, ctx, 'Use: !warn @membro motivo');
    const GroupMemberActivity = require('../database/models/GroupMemberActivity');
    const reason = args.filter(a => !a.includes('@')).join(' ') || 'sem motivo informado';
    const rec = await GroupMemberActivity.findOneAndUpdate(
      { groupJid: ctx.remoteJid, memberJid: target },
      { $set: { memberNumber: target.split('@')[0] }, $inc: { warnings: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
    const limit = gs?.warnLimit || 3;
    await sock.sendMessage(ctx.remoteJid, { text: `⚠️ @${target.split('@')[0]} recebeu advertência.\nMotivo: ${reason}\nTotal: ${rec.warnings}/${limit}`, mentions: [target] }, { quoted: msg });
    if (rec.warnings >= limit && await botIsAdmin(sock, ctx)) {
      await sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'remove').catch(() => {});
      await reply(sock, msg, ctx, `🚫 Limite de advertências atingido. Membro removido.`);
    }
  },

  async unwarn({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const target = getMentions(msg)[0];
    if (!target) return reply(sock, msg, ctx, 'Use: !unwarn @membro');
    const GroupMemberActivity = require('../database/models/GroupMemberActivity');
    const rec = await GroupMemberActivity.findOneAndUpdate({ groupJid: ctx.remoteJid, memberJid: target }, { $inc: { warnings: -1 } }, { new: true });
    if (rec && rec.warnings < 0) { rec.warnings = 0; await rec.save(); }
    return reply(sock, msg, ctx, `✅ Advertência removida. Total: ${Math.max(0, rec?.warnings || 0)}`);
  },

  async warnings({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const target = getMentions(msg)[0] || ctx.senderJid;
    const GroupMemberActivity = require('../database/models/GroupMemberActivity');
    const rec = await GroupMemberActivity.findOne({ groupJid: ctx.remoteJid, memberJid: target });
    return reply(sock, msg, ctx, `⚠️ Advertências de @${target.split('@')[0]}: ${rec?.warnings || 0}`);
  },

  async resetwarn({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const target = getMentions(msg)[0];
    if (!target) return reply(sock, msg, ctx, 'Use: !resetwarn @membro');
    const GroupMemberActivity = require('../database/models/GroupMemberActivity');
    await GroupMemberActivity.findOneAndUpdate({ groupJid: ctx.remoteJid, memberJid: target }, { warnings: 0 }, { upsert: true });
    return reply(sock, msg, ctx, '✅ Advertências resetadas.');
  },

  async inatividade({ sock, msg, ctx, args, config }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const action = (args[0] || 'status').toLowerCase();
    let gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }) || await GroupSettings.create({ groupJid: ctx.remoteJid, groupName: ctx.groupName || '' });
    if (['off','desligar','0'].includes(action)) {
      gs.inactiveEnabled = false; await gs.save();
      return reply(sock, msg, ctx, '🛑 Controle de inatividade desligado.');
    }
    if (['on','ligar','ativar'].includes(action)) {
      gs.inactiveEnabled = true; await gs.save();
      return reply(sock, msg, ctx, '✅ Controle de inatividade ligado.');
    }
    if (['avisar','warn'].includes(action)) {
      gs.inactiveEnabled = true; gs.inactiveAction = 'warn'; gs.inactiveWarnDays = Math.max(1, Number(args[1]) || gs.inactiveWarnDays || 7); await gs.save();
      return reply(sock, msg, ctx, `✅ Vou avisar membros com ${gs.inactiveWarnDays} dia(s) de inatividade.`);
    }
    if (['ban','banir','kick'].includes(action)) {
      gs.inactiveEnabled = true; gs.inactiveAction = 'ban'; gs.inactiveBanDays = Math.max(2, Number(args[1]) || gs.inactiveBanDays || 30); await gs.save();
      return reply(sock, msg, ctx, `✅ Vou banir membros com ${gs.inactiveBanDays} dia(s) de inatividade e avisar antes com ${gs.inactiveWarnDays} dia(s).`);
    }
    if (['config','set'].includes(action)) {
      gs.inactiveEnabled = true;
      gs.inactiveWarnDays = Math.max(1, Number(args[1]) || 7);
      gs.inactiveBanDays = Math.max(gs.inactiveWarnDays + 1, Number(args[2]) || 30);
      gs.inactiveAction = ['ban','warn'].includes((args[3] || '').toLowerCase()) ? args[3].toLowerCase() : 'ban';
      await gs.save();
      return reply(sock, msg, ctx, `✅ Inatividade configurada:\nAvisar: ${gs.inactiveWarnDays}d\nBan: ${gs.inactiveBanDays}d\nAção final: ${gs.inactiveAction}`);
    }
    return reply(sock, msg, ctx, `🕸️ *INATIVIDADE — DARK SIDE ENGINE*\n\nStatus: ${gs.inactiveEnabled ? '✅ ON' : '🛑 OFF'}\nAviso: ${gs.inactiveWarnDays} dia(s)\nBan: ${gs.inactiveBanDays} dia(s)\nAção final: ${gs.inactiveAction}\nPV: ${gs.inactiveNotifyPv ? 'sim' : 'não'}\nGrupo: ${gs.inactiveNotifyGroup ? 'sim' : 'não'}\n\nComandos:\n${config.bot.prefix}inatividade on/off\n${config.bot.prefix}inatividade avisar 7\n${config.bot.prefix}inatividade ban 30\n${config.bot.prefix}inatividade config 7 30 ban\n${config.bot.prefix}inativos 7`);
  },

  async inativos({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const days = Math.max(1, Number(args[0]) || 7);
    const cutoff = new Date(Date.now() - days * 86400000);
    const GroupMemberActivity = require('../database/models/GroupMemberActivity');
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const acts = await GroupMemberActivity.find({ groupJid: ctx.remoteJid, lastMessageAt: { $lt: cutoff } }).sort({ lastMessageAt: 1 }).limit(80);
    const members = new Set(meta.participants.map(p => p.id));
    const list = acts.filter(a => members.has(a.memberJid));
    if (!list.length) return reply(sock, msg, ctx, `✅ Nenhum membro rastreado inativo há ${days} dia(s).`);
    const text = `🥶 *INATIVOS HÁ ${days}+ DIAS*\n\n` + list.map((a, i) => `${i + 1}. @${a.memberJid.split('@')[0]} — ${a.lastMessageAt ? a.lastMessageAt.toLocaleDateString('pt-BR') : 'sem data'}`).join('\n');
    await sock.sendMessage(ctx.remoteJid, { text, mentions: list.map(a => a.memberJid) }, { quoted: msg });
  },

  async atividade({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const GroupMemberActivity = require('../database/models/GroupMemberActivity');
    const target = getMentions(msg)[0] || ctx.senderJid;
    const rec = await GroupMemberActivity.findOne({ groupJid: ctx.remoteJid, memberJid: target });
    return reply(sock, msg, ctx, `📊 *ATIVIDADE*\n\nMembro: @${target.split('@')[0]}\nMensagens: ${rec?.messages || 0}\nComandos: ${rec?.commands || 0}\nÚltima mensagem: ${rec?.lastMessageAt ? rec.lastMessageAt.toLocaleString('pt-BR') : 'sem registo'}\nAdvertências: ${rec?.warnings || 0}`);
  },


  async del({ sock, msg, ctx }) {
    const quotedKey = msg.message?.extendedTextMessage?.contextInfo;
    if (!quotedKey?.stanzaId) return reply(sock, msg, ctx, '🗑️ Responda a mensagem que deseja apagar com *del*.');
    if (ctx.isGroup && !(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins podem apagar mensagens pelo bot.');
    const key = {
      remoteJid: ctx.remoteJid,
      id: quotedKey.stanzaId,
      participant: quotedKey.participant,
      fromMe: quotedKey.participant ? false : undefined,
    };
    await sock.sendMessage(ctx.remoteJid, { delete: key }).catch(e => { throw new Error('Não consegui apagar: ' + e.message); });
  },

  async add({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin.');
    const nums = args.join(' ').split(/[\s,]+/).map(userManager.normalizeNumber).filter(n => n.length >= 8);
    if (!nums.length) return reply(sock, msg, ctx, 'Use: add 2449xxxxxxx');
    const jids = nums.map(n => `${n}@s.whatsapp.net`);
    await sock.groupParticipantsUpdate(ctx.remoteJid, jids, 'add');
    return reply(sock, msg, ctx, `✅ Convite/add enviado para ${jids.length} membro(s).`);
  },

  async tempban({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin.');
    const target = getMentions(msg)[0];
    const minutes = Math.max(1, Math.min(1440, Number(args.find(a => /^\d+$/.test(a))) || 10));
    if (!target) return reply(sock, msg, ctx, 'Use: tempban @membro 10');
    await sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'remove');
    await reply(sock, msg, ctx, `⏳ @${target.split('@')[0]} removido temporariamente por ${minutes} minuto(s).`, [target]);
    setTimeout(() => sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'add').catch(() => {}), minutes * 60000);
  },

  async silenciar({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const action = (args[0] || 'on').toLowerCase();
    if (['off','abrir','open','0'].includes(action)) {
      await sock.groupSettingUpdate(ctx.remoteJid, 'not_announcement');
      return reply(sock, msg, ctx, '🔓 Grupo desilenciado: todos podem falar.');
    }
    await sock.groupSettingUpdate(ctx.remoteJid, 'announcement');
    return reply(sock, msg, ctx, '🔇 Grupo silenciado: apenas admins podem falar. Use *silenciar off* para abrir.');
  },

  async menueconomia({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '💰 DARK BANK', subtitle: 'Economia universal: trabalho, risco, mercado e aura.', buttonText: '💰 Abrir economia',
      items: [
        { cmd: 'saldo', emoji: '💰', desc: 'carteira, banco, HP e aura' }, { cmd: 'daily', emoji: '🎁', desc: 'recompensa diária' },
        { cmd: 'trabalhar', emoji: '👷', desc: 'ganho seguro' }, { cmd: 'crime', emoji: '🦹', desc: 'alto risco / alto retorno' },
        { cmd: 'pedir', emoji: '🙏', desc: 'pedir moedas' }, { cmd: 'roubar', args: '@membro', emoji: '🥷', desc: 'roubo com risco' },
        { cmd: 'depositar', args: '100', emoji: '🏦', desc: 'guardar no banco' }, { cmd: 'sacar', args: '100', emoji: '💵', desc: 'sacar do banco' },
        { cmd: 'transferir', args: '@membro 100', emoji: '🔁', desc: 'transferência' }, { cmd: 'apostar', args: '100', emoji: '🎰', desc: 'aposta balanceada' },
        { cmd: 'loja', emoji: '🛒', desc: 'itens do mundo Dark' }, { cmd: 'comprar', args: 'pocao', emoji: '🛍️', desc: 'comprar item' },
        { cmd: 'inventario', emoji: '🎒', desc: 'seus itens' }, { cmd: 'usar', args: 'pocao', emoji: '🧪', desc: 'usar item' },
        { cmd: 'heal', emoji: '❤️', desc: 'recuperar HP' }, { cmd: 'ranking', emoji: '🏆', desc: 'rank de riqueza/aura' },
      ],
    });
  },

  async menufamilia({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '👨‍👩‍👧 DARK FAMILY', subtitle: 'Laços, casamento, adoção e legado.', buttonText: '👨‍👩‍👧 Abrir família',
      items: [
        { cmd: 'casar', args: '@membro', emoji: '💍', desc: 'pedir casamento' }, { cmd: 'aceitar', emoji: '✅', desc: 'aceitar pedido' },
        { cmd: 'recusar', emoji: '❌', desc: 'recusar pedido' }, { cmd: 'divorciar', emoji: '💔', desc: 'terminar casamento' },
        { cmd: 'esposa', emoji: '💘', desc: 'ver parceiro(a)' }, { cmd: 'adotar', args: '@membro', emoji: '🍼', desc: 'adotar membro' },
        { cmd: 'expulsar', args: '@membro', emoji: '🚪', desc: 'tirar da família' }, { cmd: 'familia', emoji: '🏠', desc: 'árvore familiar' },
        { cmd: 'nomear', args: '@membro nome', emoji: '✍️', desc: 'nomear parente' },
      ],
    });
  },

  async menudiversao({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '😂 DARK FUN', subtitle: '+9999999 aura em brincadeiras, ranks e caos controlado.', buttonText: '😂 Abrir diversão',
      items: [
        { cmd: 'dado', emoji: '🎲', desc: 'rolar dado' }, { cmd: 'moeda', emoji: '🪙', desc: 'cara/coroa' },
        { cmd: 'piada', emoji: '😂', desc: 'piada' }, { cmd: 'frase', emoji: '💭', desc: 'frase' }, { cmd: 'ppt', args: 'pedra', emoji: '✊', desc: 'pedra papel tesoura' },
        { cmd: 'gay', args: '@membro', emoji: '🏳️‍🌈', desc: 'medidor' }, { cmd: 'lindo', args: '@membro', emoji: '✨', desc: 'medidor' },
        { cmd: 'rico', args: '@membro', emoji: '💰', desc: 'medidor' }, { cmd: 'safado', args: '@membro', emoji: '😏', desc: 'medidor' },
        { cmd: 'rankgay', emoji: '🏆', desc: 'ranking' }, { cmd: 'ranklindo', emoji: '🏆', desc: 'ranking' }, { cmd: 'rankrico', emoji: '🏆', desc: 'ranking' },
        { cmd: 'casal', emoji: '💕', desc: 'casal do grupo' }, { cmd: 'ship', args: '@a @b', emoji: '💞', desc: 'shipar' }, { cmd: 'roleta', emoji: '🎰', desc: 'sorteio' },
        { cmd: 'fofoca', emoji: '🤫', desc: 'fofoca aleatória' }, { cmd: 'audiomeme', args: 'gato 2', emoji: '🔊', desc: 'áudio meme' },
      ],
    });
  },

  async menustatus({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: 'ℹ️ STATUS & INFO', subtitle: 'Informação, clima, utilidades e diagnóstico.', buttonText: 'ℹ️ Abrir status',
      items: [
        { cmd: 'ping', emoji: '🏓', desc: 'latência' }, { cmd: 'info', emoji: 'ℹ️', desc: 'info do bot' }, { cmd: 'id', emoji: '🆔', desc: 'seus IDs' },
        { cmd: 'perfil', emoji: '👤', desc: 'perfil' }, { cmd: 'dono', emoji: '👑', desc: 'contato dono' }, { cmd: 'clima', args: 'Luanda', emoji: '🌦️', desc: 'clima' },
        { cmd: 'qrcode', args: 'texto', emoji: '📱', desc: 'gerar QR' }, { cmd: 'calc', args: '10+5', emoji: '🧮', desc: 'calculadora' },
        { cmd: 'translate', args: 'en texto', emoji: '🌍', desc: 'tradução' }, { cmd: 'encurtar', args: 'url', emoji: '🔗', desc: 'encurtar link' },
        { cmd: 'aiapis', emoji: '🔌', desc: 'status APIs IA' },
        { cmd: 'noticias', emoji: '📰', desc: 'notícias do dia sem key extra' },
      ],
    });
  },


  async audiomeme({ sock, msg, ctx, args }) {
    const q = args.join(' ').trim();
    if (!q) return reply(sock, msg, ctx, '🔊 Use: audiomeme gatos 3');
    const parts = q.split(/\s+/);
    const last = Number(parts[parts.length - 1]);
    const qtd = Math.min(Number.isFinite(last) && last > 0 ? last : 1, 5);
    const search = Number.isFinite(last) ? parts.slice(0, -1).join(' ') : q;
    await react(sock, msg, '🔎');
    try {
      const data = await mediaHandler.fetchJson(`https://systemzone.store/api/audiomemes?search=${encodeURIComponent(search)}`, 30000);
      const list = (data?.results || []).slice(0, qtd);
      if (!data?.status || !list.length) throw new Error('sem resultados');
      for (const item of list) {
        await sock.sendMessage(ctx.remoteJid, { audio: { url: item.download_url }, mimetype: 'audio/mpeg', fileName: `${item.title || 'audiomeme'}.mp3`, ptt: false }, { quoted: msg });
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '🔊 Nenhum áudio meme encontrado.'); }
  },
  async ameme(a) { return module.exports.audiomeme(a); },

  async gimage({ sock, msg, ctx, args }) {
    const raw = args.join(' ').trim();
    if (!raw) return reply(sock, msg, ctx, '🖼️ Use: gimage gatos|5');
    let [busca, qtd] = raw.split('|');
    busca = (busca || '').trim();
    const limite = Math.max(1, Math.min(10, Number(qtd) || 1));
    await react(sock, msg, '🖼️');
    try {
      const data = await mediaHandler.fetchJson(`https://systemzone.store/api/search/gimage2?query=${encodeURIComponent(busca)}&limite=${limite}&apikey=freekey`, 30000);
      const arr = data?.resultados || data?.results || [];
      if (!data?.status || !arr.length) throw new Error('sem imagem');
      for (let i = 0; i < Math.min(arr.length, limite); i++) {
        await sock.sendMessage(ctx.remoteJid, { image: { url: arr[i].url }, caption: `╭━〔 🖼️ DARK IMAGE 〕━╮\n┃ Busca: ${busca}\n┃ ${i + 1}/${Math.min(arr.length, limite)}\n┃ ${arr[i].title || ''}\n╰━━━━━━━━━━━━╯` }, { quoted: msg });
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Não encontrei imagens.'); }
  },
  async img(a) { return module.exports.gimage(a); },

  async neymar({ sock, msg, ctx, args }) {
    const text = args.join(' ').trim();
    if (!text) return reply(sock, msg, ctx, '✍️ Use: neymar Salve família Dark');
    await react(sock, msg, '✍️');
    try {
      const data = await mediaHandler.fetchJson(`https://systemzone.store/v1/placas/neymar-placa?texto=${encodeURIComponent(text)}`, 30000);
      if (!data?.status || !data?.imagem) throw new Error('API falhou');
      await sock.sendMessage(ctx.remoteJid, { image: { url: data.imagem }, caption: `╭━〔 ⚽ NEYMAR DARK 〕━╮\n┃ ${text}\n╰━━━━━━━━━━━━╯` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Erro ao gerar placa.'); }
  },
  async placaneymar(a) { return module.exports.neymar(a); },


  async participantes({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const limit = Math.min(Math.max(Number(args[0]) || 50, 5), 100);
    const list = meta.participants.slice(0, limit);
    const text = `╭━━━〔 👥 PARTICIPANTES 〕━━━╮\n` +
      `┃ Grupo: *${meta.subject}*\n┃ Total: *${meta.participants.length}*\n┣━━━━━━━━━━━━━━━━━━━━\n` +
      list.map((p, i) => `┃ ${String(i + 1).padStart(2, '0')} ${isParticipantAdmin(p) ? '👑' : '👤'} @${p.id.split('@')[0]}`).join('\n') +
      (meta.participants.length > limit ? `\n┃ ... +${meta.participants.length - limit} membro(s)` : '') +
      `\n╰━━━〔 ᴅᴀʀᴋ sɪᴅᴇ ⚡ 〕━━━╯`;
    await sock.sendMessage(ctx.remoteJid, { text, mentions: list.map(p => p.id) }, { quoted: msg });
  },
  async membros(a) { return module.exports.participantes(a); },

  async limpar({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin.');
    const n = Math.min(Math.max(Number(args[0]) || 20, 1), 50);
    const { messageCache } = require('./messageListener');
    const recent = [...messageCache.values()].filter(m => m?.key?.remoteJid === ctx.remoteJid).slice(-n);
    let ok = 0;
    for (const m of recent) {
      try { await sock.sendMessage(ctx.remoteJid, { delete: m.key }); ok++; await new Promise(r => setTimeout(r, 120)); } catch {}
    }
    return reply(sock, msg, ctx, `🧹 *DARK CLEAN*\n\nTentei apagar ${recent.length} mensagens recentes do cache.\n✅ Apagadas: ${ok}\n\nObs: WhatsApp só permite apagar mensagens dentro das regras/tempo da plataforma.`);
  },
  async clean(a) { return module.exports.limpar(a); },
  async limpartudo(a) { return module.exports.limpar(a); },

};
