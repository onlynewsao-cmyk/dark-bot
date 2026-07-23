const Command = require('../database/models/Command');
const User = require('../database/models/User');
const Log = require('../database/models/Log');
const AntiStatus = require('../database/models/AntiStatus');
const BotConfig = require('../database/models/BotConfig');
const AiMemory = require('../database/models/AiMemory');
const GroupSettings = require('../database/models/GroupSettings');
const botConfigCache = require('./botConfigCache');
const prefixManager = require('./prefixManager');
const userManager = require('./userManager');
const mediaHandler = require('./mediaHandler');
const downloader = require('./downloader');
const stickerMaker = require('./stickerMaker');
const ai = require('./ai');
const buttonHandler = require('./buttonHandler');
const systemZeroPlay = require('./systemZeroPlay');
const ytdl = require('./ytdl');
const config = require('../config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const axios = require('axios');
const { sendWithGif } = require('./gifHelper');
const facebookPublisher = require('./facebookPublisher');
const menuThemes = require('./menuThemes');

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


function getQuotedMediaForPost(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message?.buttonsResponseMessage?.contextInfo?.quotedMessage || msg.message?.interactiveResponseMessage?.contextInfo?.quotedMessage;
  if (!q) return null;
  if (q.imageMessage) return { type: 'image', message: q };
  if (q.videoMessage) return { type: 'video', message: q };
  return null;
}

async function mediaBufferFromQuoted(msg) {
  const qm = getQuotedMediaForPost(msg);
  if (!qm) return null;
  const buffer = await mediaHandler.downloadFromMessage({ key: msg.key, message: qm.message });
  return { type: qm.type, buffer };
}

function displayCommand(idOrCmd = '') {
  return String(idOrCmd || '').replace(/^[^a-z0-9]+/i, '').trim();
}

async function getButtonMode() {
  try { return await botConfigCache.get('button_mode', 'auto'); } catch { return 'auto'; }
}

async function getMenuImage(target = 'menu') {
  try {
    const url = await botConfigCache.get(`menu_media_${target}_url`, '');
    const type = await botConfigCache.get(`menu_media_${target}_type`, 'none');
    if (url && type && type !== 'none') return url;
  } catch {}
  try { return fs.readFileSync(path.join(__dirname, '..', 'public', 'img', 'logo.jpg')); }
  catch { return null; }
}

async function getStickerWatermarkConfig(config, ctx) {
  const enabled = await botConfigCache.get('sticker_watermark_enabled', true).catch(() => true);
  const packName = await botConfigCache.get('sticker_pack_name', '').catch(() => '');
  const authorName = await botConfigCache.get('sticker_author_name', '').catch(() => '');
  const watermarkText = await botConfigCache.get('sticker_watermark_text', config.bot.name || 'DARK BOT').catch(() => config.bot.name || 'DARK BOT');
  const visible = await botConfigCache.get('sticker_visible_watermark', false).catch(() => false);
  return {
    packName: enabled ? (packName || `${config.bot.name} • ${config.owner.name}`) : ' ',
    authorName: enabled ? (authorName || `${ctx.pushName} | ${ctx.groupName || 'PV'}`) : ' ',
    watermarkText: enabled ? watermarkText : '',
    visibleWatermark: enabled && (visible === true || visible === 'true' || visible === 'on' || visible === 1 || visible === '1'),
  };
}



function fancyCommandLine(prefix, cmd, desc = '') {
  const full = `${cmd}`; // visual sem prefixo; o handler continua usando prefixo internamente
  return `┃ ⚡ *${full.padEnd(18, ' ')}* ${desc ? '— ' + desc : ''}`;
}

function submenuText(title, subtitle, prefix, items = [], ctx = {}, config = {}, style = 'classic', showPrefix = false, target = '') {
  return menuThemes.renderSubmenu({ submenu: target, ctx, config, style, showPrefix, customItems: items });
}

async function sendStyledCommandList(sock, msg, ctx, config, { title, subtitle, buttonText = '⚡ Abrir comandos', target = 'menu', items = [] }) {
  const p = config.bot.prefix;
  const visible = filterButtons(
    items.map(it => ({ id: `${p}${it.cmd}${it.args ? ' ' + it.args : ''}`, text: `${it.emoji || '⚡'} ${it.cmd}` })),
    ctx
  );
  const allowed = items.filter(it => visible.some(v => v.id.startsWith(`${p}${it.cmd}`)));

  // ── TEXTO sempre entregue primeiro — nunca fica mudo ──
  const style = await botConfigCache.get('menu_style', 'classic').catch(() => 'classic');
  const showPrefix = await botConfigCache.get('menu_show_prefix', false).catch(() => false);
  const text = submenuText(title, subtitle, p, allowed, ctx, config, style,
    showPrefix === true || showPrefix === 'true' || showPrefix === 'on', target);
  await reply(sock, msg, ctx, text);

  if (!allowed.length) return;

  // ── Botões/lista tentados em cascata (não bloqueia se falharem) ──
  const rows = allowed.slice(0, 20).map(it => ({
    title: `${it.emoji || '⚡'} ${it.cmd}`.slice(0, 24),
    description: String(it.desc || '').slice(0, 72),
    id: `${p}${it.cmd}${it.args ? ' ' + it.args : ''}`,
  }));

  const menuImg = await getMenuImage(target);
  const btnMode = await getButtonMode();

  // Lista interativa
  try {
    await buttonHandler.sendList(
      sock, ctx.remoteJid,
      `⌁ ${config.bot.name} 🌑`,
      `Selecione um comando de ${title}:`,
      buttonText,
      [{ title, rows }],
      msg,
      { image: menuImg, mode: btnMode }
    );
    return;
  } catch {}

  // Botões rápidos (max 8)
  try {
    await buttonHandler.sendButtons(
      sock, ctx.remoteJid,
      `⌁ ${title}`, 'Dark Side Engine ⚡',
      visible.slice(0, 8),
      msg,
      { image: menuImg, mode: btnMode }
    );
  } catch {}
  // Se falhar tudo, o texto já foi enviado acima — OK
}


function menuCmd(cmd, p, showPrefix) { return `${showPrefix ? p : ''}${cmd}`; }
function buildConfigurableMenu(ctx, config, { uptime = '0d 0h 0m', style = 'classic', showPrefix = false } = {}) {
  const p = config.bot.prefix;
  const n = Number(String(style).replace(/\D/g, '')) || 0;
  const frames = [
    ['╭','╮','╰','╯','─','│'], ['┏','┓','┗','┛','━','┃'], ['╔','╗','╚','╝','═','║'], ['▛','▜','▙','▟','▀','▌'],
    ['✦','✦','✧','✧','━','┃'], ['⎔','⎔','⎔','⎔','═','║'], ['◢','◣','◥','◤','━','┃'], ['╓','╖','╙','╜','─','║'],
    ['┌','┐','└','┘','─','│'], ['╒','╕','╘','╛','═','│']
  ];
  const icons = ['⚡','♾️','🌑','🕸️','👑','💎','🔥','🧬','🛡️','🗡️','☯️','🌀'];
  const names = ['DARK SIDE','NEON MATRIX','SHADOW REALM','AURA MODE','CYBER ROYAL','EGO ENGINE','VOID PANEL','NIGHT CORE','DARK WEB','BLADE UI','MOON SYSTEM','OMEGA'];
  const sep = ['⌁','◈','▹','➣','⟡','⌬','◆','⬢','✧','⫸'][n % 10];
  const f = frames[n % frames.length], ic = icons[n % icons.length], theme = names[n % names.length];
  const top = (title) => `${f[0]}${f[4].repeat(8)}〔 ${title} 〕${f[4].repeat(8)}${f[1]}`;
  const botLine = `${f[5]} ${ic} *${config.bot.name}* ${sep} ${theme} ${ic}`;
  const bottom = `${f[2]}${f[4].repeat(28)}${f[3]}`;
  const line = (txt) => `${f[5]} ${txt}`;
  const cmds = (...arr) => line(arr.map(c => `*${menuCmd(c,p,showPrefix)}*`).join(` ${sep} `));
  const sections = [
    ['🧠 IA / WEB', [cmds('ia','gpt','deepsearch'), cmds('noticias','pesquisar','resumir'), cmds('imagem','figura','figubug2')]],
    ['📥 DOWNLOADS', [cmds('play','play2','play3'), cmds('video','video2','statusvideo'), cmds('tiktok','instagram','fb','twitter'), cmds('spotify','soundcloud','pinterest','pinmp4')]],
    ['🎨 STICKERS', [cmds('sticker','sfull','figubug'), cmds('toimg','attp','ttp')]],
    ['👥 GRUPOS / ADM', [cmds('ban','del','add','tempban'), cmds('promote','demote','open','close'), cmds('todos','hidetag','tagadmins'), cmds('regras','inatividade','antilink')]],
    ['💕 INTERAÇÕES', [cmds('abracar','beijar','cafune','declarar'), cmds('flertar','paparico','dancar'), cmds('tapa','soco','chutar','matar'), cmds('mimimi','fofocar','cuidar')]],
    ['💰 ECONOMIA', [cmds('saldo','daily','trabalhar','crime'), cmds('roubar','depositar','sacar','transferir'), cmds('loja','comprar','inventario','ranking')]],
    ['🎮 JOGOS', [cmds('forca','quiz','adivinha'), cmds('blackjack','truco','russa'), cmds('verdade','desafio','bingo')]],
    ['🛠️ UTILS', [cmds('ping','info','id','perfil'), cmds('qrcode','calc','clima','encurtar'), cmds('vip','assinar','meuplano')]],
  ];
  let out = `${top(config.bot.name)}\n${botLine}\n${line('ᴛʜᴇ ᴅᴀʀᴋ sɪᴅᴇ • +9999999 AURA')}\n${bottom}\n\n`;
  out += `${top('USER PROFILE')}\n${line(`👋 ${ctx.treatment || ctx.pushName}`)}\n${line(`📛 ${ctx.pushName}`)}\n${line(`📱 ${ctx.senderNumber}`)}\n${line(`💬 ${ctx.isGroup ? ctx.groupName : 'Privado'}`)}\n${line(`🔑 Prefixo: ${p}`)}\n${bottom}\n\n`;
  for (const [title, rows] of sections) out += `${top(title)}\n${rows.join('\n')}\n${bottom}\n\n`;
  if (ctx.isOwner) out += `${top('👑 ROOT OWNER')}\n${cmds('menudono','maiscmds','broadcast')}\n${cmds('stats','restart','backup','eval')}\n${bottom}\n\n`;
  out += `> ${sep} *${config.bot.name}* · ${config.owner.name}\n> 👑 ${config.owner.number || 'privado'} · ⏱️ ${uptime}\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴀʀᴋ ᴇɴɢɪɴᴇ ${ic}`;
  return out;
}



// ─────────────────────────────────────────────
// PORTAL OCULTO OWNER-ONLY 18+ — NÃO CATALOGAR
// Segurança: apenas dono principal, PV, desativado por padrão e sem fontes hardcoded.
function isPrimaryOwnerOnly(ctx) {
  return !!ctx.isPrimaryOwner;
}
function adultBlockedQuery(q = '') {
  return /\b(menor|menores|criança|crianca|infantil|kid|kids|child|children|underage|loli|lolita|shota|teen|colegial|schoolgirl|schoolboy|incesto|rape|forced|forçado|forcada|abus|zoofilia|animal)\b/i.test(String(q || ''));
}
function adultCleanQuery(q = '') {
  return String(q || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}
function deepAdultMediaUrls(obj, out = []) {
  if (!obj || out.length >= 12) return out;
  if (typeof obj === 'string') {
    if (/^https?:\/\//i.test(obj) && /\.(jpe?g|png|webp|gif|mp4|webm|mov)(?:[?#]|$)|\/media\/|\/cdn\/|video|image/i.test(obj)) out.push(obj);
    return out;
  }
  if (Array.isArray(obj)) { for (const x of obj) deepAdultMediaUrls(x, out); return out; }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (/url|link|src|image|video|media|file|download/i.test(k)) deepAdultMediaUrls(v, out);
      else if (typeof v === 'object') deepAdultMediaUrls(v, out);
    }
  }
  return [...new Set(out)];
}

function deepMediaUrls(obj, out = []) {
  if (!obj || out.length >= 20) return out;
  if (typeof obj === 'string') {
    if (/^https?:\/\//i.test(obj) && /\.(mp4|m3u8|webm|mov|mkv|mp3|m4a)(?:[?#]|$)|\/download|\/stream|\/video|\/media|cdn/i.test(obj)) out.push(obj);
    return out;
  }
  if (Array.isArray(obj)) { for (const x of obj) deepMediaUrls(x, out); return [...new Set(out)]; }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (/url|link|src|download|stream|video|media|file|mp4|episode/i.test(k)) deepMediaUrls(v, out);
      else if (typeof v === 'object') deepMediaUrls(v, out);
    }
  }
  return [...new Set(out)];
}

function fillAnimeApiTemplate(tpl, { query = '', episode = '', lang = 'pt-BR' } = {}) {
  return String(tpl || '')
    .replace(/\{query\}/g, encodeURIComponent(query))
    .replace(/\{q\}/g, encodeURIComponent(query))
    .replace(/\{episode\}/g, encodeURIComponent(episode))
    .replace(/\{ep\}/g, encodeURIComponent(episode))
    .replace(/\{lang\}/g, encodeURIComponent(lang))
    .replace(/\{language\}/g, encodeURIComponent(lang));
}

async function ownerPv(sock, ctx, payload) {
  const jid = `${userManager.normalizeNumber(config.owner.number)}@s.whatsapp.net`;
  if (!jid.startsWith('@')) return sock.sendMessage(jid, payload).catch(() => null);
  return null;
}


const AUDIO_EFFECTS = {
  bass: 'bass=g=12', bass2: 'bass=g=18', bass3: 'bass=g=25',
  grave: 'bass=g=10,treble=g=-2', grave2: 'bass=g=16,treble=g=-4', grave3: 'bass=g=22,treble=g=-6',
  reverb: 'aecho=0.8:0.9:1000:0.3', reverb2: 'aecho=0.8:0.9:1200:0.45', reverb3: 'aecho=0.9:0.9:1500:0.55',
  '8d': 'apulsator=hz=0.09', '8d2': 'apulsator=hz=0.14', '8d3': 'apulsator=hz=0.22',
  slowed: 'atempo=0.85', slowed2: 'atempo=0.75', slowed3: 'atempo=0.65',
  slowedreverb: 'atempo=0.85,aecho=0.8:0.9:1000:0.35', slowedreverb2: 'atempo=0.75,aecho=0.8:0.9:1200:0.45', slowedreverb3: 'atempo=0.65,aecho=0.8:0.9:1500:0.55',
  chorus: 'chorus=0.7:0.9:55:0.4:0.25:2', chorus2: 'chorus=0.8:0.9:60:0.5:0.25:2', chorus3: 'chorus=0.9:0.9:70:0.55:0.3:2',
  fast: 'atempo=1.35', slow: 'atempo=0.75', nightcore: 'asetrate=44100*1.25,aresample=44100,atempo=1.05', vaporwave: 'asetrate=44100*0.82,aresample=44100,atempo=0.95', hardcore: 'atempo=1.55,volume=1.3',
  robot: 'afftfilt=real=hypot(re,im)*sin(0):imag=im', chipmunk: 'asetrate=44100*1.45,aresample=44100,atempo=0.9', squirrel: 'asetrate=44100*1.7,aresample=44100,atempo=0.85', monster: 'asetrate=44100*0.65,aresample=44100,atempo=1.1', whisper: 'highpass=f=1200,volume=0.8', pitch: 'asetrate=44100*1.2,aresample=44100', deep: 'asetrate=44100*0.75,aresample=44100,atempo=1.05',
  echo: 'aecho=0.8:0.88:600:0.4', stadium: 'aecho=0.9:0.9:900:0.55', cave: 'aecho=0.9:0.8:1200:0.65', underwater: 'lowpass=f=700,aecho=0.8:0.8:500:0.25', telephone: 'highpass=f=300,lowpass=f=3400', radio: 'highpass=f=500,lowpass=f=5000,volume=1.2', lofi: 'lowpass=f=3000,aresample=22050,aecho=0.6:0.7:300:0.2',
  flanger: 'flanger', phaser: 'aphaser', tremolo: 'tremolo=f=6:d=0.7', vibrato: 'vibrato=f=6.5:d=0.6', reverse: 'areverse', karaoke: 'pan=mono|c0=c0-c1', blown: 'acrusher=level_in=1:level_out=1:bits=6:mix=0.7', earrape: 'volume=8,acompressor', fat: 'bass=g=15,acompressor', smooth: 'lowpass=f=6000,acompressor=threshold=-18dB:ratio=2'
};

function getQuotedAudioMessage(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message?.buttonsResponseMessage?.contextInfo?.quotedMessage || msg.message?.interactiveResponseMessage?.contextInfo?.quotedMessage;
  if (quoted?.audioMessage) return { key: msg.key, message: quoted };
  if (msg.message?.audioMessage) return msg;
  return null;
}

function processAudioEffect(buffer, filter, name) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dark-audiofx-'));
  const input = path.join(tmpDir, 'input.bin');
  const output = path.join(tmpDir, `${name}.mp3`);
  try {
    fs.writeFileSync(input, buffer);
    execFileSync(getFfmpegBin(), ['-y', '-i', input, '-af', filter, '-vn', '-b:a', '160k', '-ar', '44100', '-f', 'mp3', output], { stdio: 'ignore', timeout: 120000 });
    const out = fs.readFileSync(output);
    if (!out || out.length < 1024) throw new Error('áudio vazio');
    if (out.length > 16 * 1024 * 1024) throw new Error('áudio muito grande após efeito');
    return out;
  } finally { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} }
}

module.exports = {
  // ============ INFO ============
  async start({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;
    const style = await botConfigCache.get('menu_style', 'classic').catch(() => 'classic');
    const st    = menuThemes.getStyle(style);
    const { frame: f, palette: pl } = st;

    // Card de boas-vindas visual
    const card = [
      `${f[0]}${f[4].repeat(8)}〔 ${pl.icon} ${localConfig.bot.name} ${pl.icon} 〕${f[4].repeat(8)}${f[1]}`,
      `${f[5]} ${pl.vibe}`,
      `${f[5]} ${f[4].repeat(30)}`,
      `${f[5]} 👋 Olá, *${ctx.treatment || ctx.pushName}*!`,
      `${f[5]} Eu sou o *${localConfig.bot.name}* 🕸️`,
      `${f[5]} Criado por *${localConfig.owner.name}*`,
      `${f[5]} ${f[4].repeat(30)}`,
      `${f[5]} ${pl.bullet} *${p}menu*     — Menu completo`,
      `${f[5]} ${pl.bullet} *${p}menubtn*  — Menu interactivo`,
      `${f[5]} ${pl.bullet} *${p}ia* <pergunta> — Perguntar à IA`,
      `${f[5]} ${pl.bullet} *${p}play* <música>  — Baixar música`,
      `${f[5]} ${pl.bullet} *${p}ping*     — Testar latência`,
      `${f[5]} ${pl.bullet} *${p}aiapis*   — Estado da IA`,
      `${f[2]}${f[4].repeat(36)}${f[3]}`,
    ].join('\n');

    await reply(sock, msg, ctx, card);

    // Botões interactivos a seguir
    try {
      await buttonHandler.sendButtons(sock, ctx.remoteJid,
        `${pl.icon} ${localConfig.bot.name}`,
        `${pl.vibe}  ×  ${localConfig.owner.name}`,
        [
          { id: `${p}menu`,    text: '📜 Menu Completo' },
          { id: `${p}ia`,      text: '🧠 Conversar com IA' },
          { id: `${p}menubtn`, text: '🔘 Menu Botões' },
          { id: `${p}play`,    text: '🎵 Baixar Música' },
        ],
        msg
      );
    } catch {}

    logCmd('start', ctx);
  },

  // ──────────────────────────────────────────────────────────
  // !menu — Menu completo com todos os comandos do bot
  // Organizado por categoria, rico em símbolos e formatação
  // ──────────────────────────────────────────────────────────
  async menu({ sock, msg, ctx, config: cfg, isOwner }) {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;

    // Lê estilo e opção de prefixo visual do cache
    const style      = await botConfigCache.get('menu_style', 'classic').catch(() => 'classic');
    const showPrefix = await botConfigCache.get('menu_show_prefix', false).catch(() => false);
    const uptime     = formatUptime(Date.now() - startTime);

    // Gera o menu completo com menuThemes (rico em símbolos e categorias)
    const menuText = menuThemes.renderMainMenu({
      ctx: { ...ctx, isOwner },
      config: localConfig,
      stats: { uptime },
      style,
      showPrefix: showPrefix === true || showPrefix === 'true' || showPrefix === 'on',
    });

    // Envia o texto primeiro — sempre funciona
    await reply(sock, msg, ctx, menuText);

    // Tenta lista interactiva com todos os submenus
    try {
      const rows = menuThemes.submenuButtons(p);
      await buttonHandler.sendList(
        sock, ctx.remoteJid,
        `⌁ ${localConfig.bot.name} 🌑`,
        'Escolha um módulo para ver os comandos detalhados:',
        `${menuThemes.getStyle(style).palette.icon} Abrir módulo`,
        [{ title: 'Dark Side Modules', rows: rows.map(r => ({ ...r, description: 'Ver comandos' })) }],
        msg,
        { mode: await botConfigCache.get('button_mode', 'auto').catch(() => 'auto') }
      );
    } catch {}

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
║ ▹ fbpost ⌁ fbfoto ⌁ fbvideo
║ ▹ fbstory ⌁ fbstatus
║ ▹ blacklist ⌁ unblacklist
║ ▹ espiao ⌁ antidelete
║ ▹ eval ⌁ shell
║ ▹ cmdsocultos ⌁ portal18
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
        ...(await getStickerWatermarkConfig(config, ctx)),
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
        ...(await getStickerWatermarkConfig(config, ctx)),
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ figubug2 falhou: ' + e.message);
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  // !menubtn / !menu — Carousel interactivo com @systemzero/baileys
  // Formato idêntico ao código original do repositório:
  //   Carousel com card (vídeo/imagem) + single_select + cta_url canal
  // ══════════════════════════════════════════════════════════════════════
  async menubtn({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;

    // ── Info do utilizador ──────────────────────────────────
    const u      = await User.findOne({ whatsappNumber: ctx.senderNumber }).catch(() => null);
    const isVip  = u && u.isPremium && u.isPremium();
    const isAdm  = ctx.isOwner || (await isAdmin(sock, ctx));
    const isCargo = ctx.isOwner ? '👑 Dono' : isVip ? '⭐ Premium' : isAdm ? '🛡️ Admin' : '🆓 Free';

    // ── Texto do menu ───────────────────────────────────────
    const textok = [
      `🕸️ *${localConfig.bot.name}*`,
      `👤 ${ctx.pushName}  •  🏷️ ${isCargo}`,
      `🔑 Prefixo: *${p}*  •  👑 ${localConfig.owner.name}`,
      `✦ ᴅᴀʀᴋ sɪᴅᴇ ᴇɴɢɪɴᴇ ⚡`,
    ].join('\n');

    const channelUrl = localConfig.channelUrl || 'https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D';

    // ── Rows para a lista ───────────────────────────────────
    const menuRows = [
      { title: '🕸️ Menu Principal',   description: 'comandos principais', id: p + 'menup' },
      { title: '📥 Downloads',         description: 'YouTube, música, vídeo', id: p + 'down' },
      { title: '🎨 Figurinhas',        description: 'stickers e criação', id: p + 'menufigurinhas' },
      { title: '😂 Brincadeiras',      description: 'diversão e zoeira', id: p + 'brincadeiras' },
      { title: '💰 Coins',             description: 'economia e bank', id: p + 'menucoins' },
      { title: '🎛️ Alteradores',      description: 'efeitos de áudio', id: p + 'alteradores' },
      { title: '🖼️ Logos',            description: 'logos e imagens', id: p + 'menulogos' },
      { title: '🔞 Menu+18',           description: 'só VIPs', id: p + 'menu18' },
      { title: '👥 ADM',               description: 'gestão de grupos', id: p + 'menuadm' },
      { title: '👑 Dono',              description: 'painel do dono', id: p + 'menudono' },
      { title: '🕸️ Criador',          description: 'info do criador', id: p + 'criador' },
      { title: '🏓 Ping',              description: 'estado do bot', id: p + 'ping' },
      { title: '🏠 Alugar Bot',        description: 'planos de aluguel', id: p + 'alugar' },
    ];

    // Botões da lista (single_select + canal)
    const listaParams = {
      title: '🕸️ ᴍᴇɴᴜ',
      sections: [{
        title: '🕸️ DARK BOT MODULES',
        highlight_label: localConfig.owner.name + '|ᴅᴇᴠ',
        rows: menuRows,
      }],
    };

    const nativeBtns = [
      { name: 'single_select', buttonParamsJson: JSON.stringify(listaParams) },
      { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '🕸️ Canal', url: channelUrl, merchant_url: channelUrl }) },
    ];

    // ── Tentativa 1: Carousel real com imagem ────────────────
    const logoPath = require('path').join(__dirname, '..', 'public', 'img', 'logo.jpg');
    const { Carousel } = require('@systemzero/baileys/lib/MB.cjs');
    const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@systemzero/baileys');

    let carouselSent = false;
    try {
      let imageMessage = null;
      if (require('fs').existsSync(logoPath)) {
        try {
          const media = await prepareWAMessageMedia(
            { image: { url: logoPath } },
            { upload: sock.waUploadToServer }
          );
          imageMessage = media?.imageMessage || null;
        } catch {}
      }

      const card = {
        header: imageMessage
          ? { hasMediaAttachment: true, imageMessage }
          : { hasMediaAttachment: false },
        body:   { text: textok },
        footer: { text: `🕸️ ${localConfig.bot.name} · ${localConfig.owner.name}` },
        nativeFlowMessage: { buttons: nativeBtns },
      };

      const msgObj = generateWAMessageFromContent(ctx.remoteJid, {
        interactiveMessage: {
          contextInfo: { participant: ctx.senderJid },
          body:   { text: '🕸️ *ᴍᴇɴᴜ*' },
          footer: { text: localConfig.bot.name },
          carouselMessage: { cards: [card] },
        },
      }, { userJid: sock.user?.id, quoted: msg });

      await sock.relayMessage(ctx.remoteJid, msgObj.message, { messageId: msgObj.key.id });
      carouselSent = true;
    } catch (e) {
      console.warn('[menubtn] Carousel:', e.message?.slice(0, 60));
    }

    if (carouselSent) { logCmd('menubtn', ctx); return; }

    // ── Tentativa 2: Lista interactiva ───────────────────────
    try {
      await buttonHandler.sendList(
        sock, ctx.remoteJid,
        `🕸️ ${localConfig.bot.name}`,
        textok,
        '🕸️ Abrir módulo',
        [{ title: '🕸️ DARK BOT', rows: menuRows }],
        msg
      );
      logCmd('menubtn', ctx);
      return;
    } catch {}

    // ── Fallback: texto ──────────────────────────────────────
    const fallback = `╭━━━〔 🕸️ *${localConfig.bot.name}* 〕━━━╮\n` +
      `┃ 👤 ${ctx.pushName}  •  🏷️ ${isCargo}\n` +
      `┃ 🔑 Prefixo: *${p}*  •  👑 ${localConfig.owner.name}\n` +
      `┣━━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
      menuRows.map((r, i) => `┃ ${String(i+1).padStart(2,'0')} • *${r.title}*`).join('\n') +
      `\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    await reply(sock, msg, ctx, fallback);
    logCmd('menubtn', ctx);
  },



  // Sub-menus interativos + fallback bonito em texto
  async menudownload({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '📥 DOWNLOADS', target: 'menudownload', subtitle: 'Baixar músicas, vídeos e mídias sociais.', buttonText: '📥 Escolher download',
      items: [
        { cmd: 'play', args: 'Drake shabang', emoji: '🎵', desc: 'áudio leve/baixo 96kbps' },
        { cmd: 'play2', args: 'central cee doja', emoji: '🎧', desc: 'áudio médio 160kbps' },
        { cmd: 'play3', args: 'nome da música', emoji: '⭐', desc: 'alta qualidade 320kbps quando possível' },
        { cmd: 'video', args: 'central cee doja', emoji: '🎬', desc: 'vídeo HD 720p ou melhor disponível' },
        { cmd: 'video2', args: 'nome do vídeo', emoji: '📺', desc: 'tenta FHD 1080p real; fallback melhor disponível' },
        { cmd: 'statusvideo', args: 'nome/link', emoji: '⭕', desc: 'vídeo circular/status/PTV' },
        { cmd: 'menuaudio', emoji: '🎧', desc: 'efeitos em áudio marcado' },
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

  // ── !menup — Menu Principal ──────────────────────────────────────────
  async menup({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;
    return sendStyledCommandList(sock, msg, ctx, localConfig, {
      title: '🕸️ MENU PRINCIPAL', target: 'menup',
      subtitle: 'Comandos principais e básicos do bot.',
      buttonText: '🕸️ Abrir',
      items: [
        { cmd: 'menu',     emoji: '📜', desc: 'menu completo' },
        { cmd: 'menubtn',  emoji: '🕸️', desc: 'menu interactivo' },
        { cmd: 'ping',     emoji: '🏓', desc: 'latência do bot' },
        { cmd: 'info',     emoji: 'ℹ️', desc: 'informações do bot' },
        { cmd: 'dono',     emoji: '👑', desc: 'info do dono' },
        { cmd: 'criador',  emoji: '🕸️', desc: 'criador do bot' },
        { cmd: 'perfil',   emoji: '👤', desc: 'perfil do utilizador' },
        { cmd: 'genero',   emoji: '👤', desc: 'definir género' },
        { cmd: 'donos',    emoji: '👑', desc: 'lista de donos' },
        { cmd: 'id',       emoji: '🆔', desc: 'ver JID' },
        { cmd: 'alugar',   emoji: '🏠', desc: 'planos de aluguel' },
        { cmd: 'vip',      emoji: '⭐', desc: 'planos premium' },
        { cmd: 'aiapis',   emoji: '🧠', desc: 'estado das IAs' },
      ],
    });
  },

  // ── !down — Menu Downloads (alias de menudownload) ────────────────
  async down(a) { return module.exports.menudownload(a); },

  // ── !menufigurinhas — Menu Stickers ──────────────────────────────
  async menufigurinhas(a) { return module.exports.menustickers(a); },

  // ── !brincadeiras — Menu Diversão + Interações ───────────────────
  async brincadeiras({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    return sendStyledCommandList(sock, msg, ctx, localConfig, {
      title: '🕸️ BRINCADEIRAS & DIVERSÃO', target: 'brincadeiras',
      subtitle: 'Diversão, zoeira e interações para grupo.',
      buttonText: '🕸️ Abrir',
      items: [
        { cmd: 'dado',      emoji: '🎲', desc: 'jogar dado' },
        { cmd: 'moeda',     emoji: '🪙', desc: 'cara ou coroa' },
        { cmd: 'piada',     emoji: '😂', desc: 'piada aleatória' },
        { cmd: 'frase',     emoji: '💭', desc: 'frase motivacional' },
        { cmd: 'ppt',       emoji: '🎮', desc: 'pedra papel tesoura' },
        { cmd: 'gay',       emoji: '🏳️‍🌈', desc: 'medidor gay' },
        { cmd: 'lindo',     emoji: '✨', desc: 'medidor de beleza' },
        { cmd: 'feio',      emoji: '🥶', desc: 'medidor de feiúra' },
        { cmd: 'rico',      emoji: '💰', desc: 'medidor de riqueza' },
        { cmd: 'corno',     emoji: '🦌', desc: 'medidor cornudo' },
        { cmd: 'safado',    emoji: '😏', desc: 'medidor safadeza' },
        { cmd: 'ship',      emoji: '💕', desc: 'combinar duas pessoas' },
        { cmd: 'casal',     emoji: '👫', desc: 'casal do grupo' },
        { cmd: 'roleta',    emoji: '🎰', desc: 'roleta do grupo' },
        { cmd: 'verdade',   emoji: '❓', desc: 'verdade ou desafio' },
        { cmd: 'desafio',   emoji: '🔥', desc: 'desafio aleatório' },
        { cmd: 'horoscopo', emoji: '🔮', desc: 'horóscopo do signo' },
        { cmd: 'abracar',   emoji: '🤗', desc: 'abraçar @alguém' },
        { cmd: 'beijar',    emoji: '💋', desc: 'beijar @alguém' },
        { cmd: 'tapa',      emoji: '👋', desc: 'dar tapa @alguém' },
        { cmd: 'soco',      emoji: '👊', desc: 'dar soco @alguém' },
        { cmd: 'dancar',    emoji: '💃', desc: 'dançar @alguém' },
        { cmd: 'aura',      emoji: '⚡', desc: 'activar aura' },
      ],
    });
  },

  // ── !menucoins — Economia Dark Bank ──────────────────────────────
  async menucoins(a) { return module.exports.menueconomia(a); },

  // ── !alteradores — Efeitos de Áudio ──────────────────────────────
  async alteradores({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    return sendStyledCommandList(sock, msg, ctx, localConfig, {
      title: '🕸️ ALTERADORES DE ÁUDIO', target: 'alteradores',
      subtitle: 'Efeitos de áudio para transformar músicas.',
      buttonText: '🕸️ Escolher efeito',
      items: [
        { cmd: 'bass',        emoji: '🔊', desc: 'grave intenso' },
        { cmd: 'reverb',      emoji: '🌀', desc: 'eco e reverb' },
        { cmd: '8d',          emoji: '🎧', desc: 'áudio 8D' },
        { cmd: 'slowed',      emoji: '🐢', desc: 'slowed' },
        { cmd: 'slowedreverb',emoji: '🌊', desc: 'slowed + reverb' },
        { cmd: 'nightcore',   emoji: '⚡', desc: 'nightcore' },
        { cmd: 'vaporwave',   emoji: '🌸', desc: 'vaporwave' },
        { cmd: 'robot',       emoji: '🤖', desc: 'voz de robô' },
        { cmd: 'chipmunk',    emoji: '🐿️', desc: 'voz chipmunk' },
        { cmd: 'echo',        emoji: '📢', desc: 'eco' },
        { cmd: 'lofi',        emoji: '📻', desc: 'lo-fi' },
        { cmd: 'karaoke',     emoji: '🎤', desc: 'karaoke' },
        { cmd: 'reverse',     emoji: '🔄', desc: 'ao contrário' },
        { cmd: 'fast',        emoji: '⏩', desc: 'acelerado' },
        { cmd: 'slow',        emoji: '⏪', desc: 'lento' },
        { cmd: 'deep',        emoji: '🎵', desc: 'voz grave' },
        { cmd: 'menuaudio',   emoji: '🎛️', desc: 'todos os efeitos' },
      ],
    });
  },

  // ── !menulogos — Stickers e Imagens ──────────────────────────────
  async menulogos({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    return sendStyledCommandList(sock, msg, ctx, localConfig, {
      title: '🕸️ LOGOS & IMAGENS', target: 'menulogos',
      subtitle: 'Criação de stickers, logos e imagens.',
      buttonText: '🕸️ Criar',
      items: [
        { cmd: 'sticker',  emoji: '🎨', desc: 'foto → sticker' },
        { cmd: 'sfull',    emoji: '🖼️', desc: 'sticker sem cortar' },
        { cmd: 'figubug',  emoji: '👾', desc: 'sticker lendário' },
        { cmd: 'figubug2', emoji: '✨', desc: 'sticker com IA' },
        { cmd: 'toimg',    emoji: '🖼️', desc: 'sticker → imagem' },
        { cmd: 'attp',     emoji: '✍️', desc: 'texto animado' },
        { cmd: 'ttp',      emoji: '📝', desc: 'texto em sticker' },
        { cmd: 'imagem',   emoji: '🎨', desc: 'gerar imagem com IA' },
        { cmd: 'figura',   emoji: '✨', desc: 'imagem IA → sticker' },
        { cmd: 'gimage',   emoji: '🔍', desc: 'busca imagens Google' },
        { cmd: 'pinterest',emoji: '📌', desc: 'imagens Pinterest' },
        { cmd: 'pinpacks', emoji: '📌', desc: 'packs de stickers' },
        { cmd: 'stickerrename',emoji:'💧',desc:'renomear sticker' },
      ],
    });
  },

  // ── !menu18 — Portal 18+ (só VIP) ───────────────────────────────
  async menu18({ sock, msg, ctx, config: cfg }) {
    if (!isPrimaryOwnerOnly(ctx)) {
      // Para utilizadores não-dono: mostra card informativo sem revelar conteúdo
      const u = await User.findOne({ whatsappNumber: ctx.senderNumber }).catch(() => null);
      const isVip = u && u.isPremium && u.isPremium();
      if (!isVip) {
        return reply(sock, msg, ctx,
          `🔞 *MENU +18*\n\n` +
          `Este menu é exclusivo para utilizadores *VIP/Premium*.\n\n` +
          `⭐ Acede ao plano Premium com *${(cfg||config).bot.prefix}vip*\n` +
          `👑 Ou contacta o dono: wa.me/${(cfg||config).owner.number}`
        );
      }
    }
    return module.exports.cmdsocultos({ sock, msg, ctx, config: cfg });
  },

  // ── !menuadm — Menu ADM de grupo ─────────────────────────────────
  async menuadm(a) { return module.exports.menugrupo(a); },

  // ── !criador — Informações do criador ────────────────────────────
  async criador({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;
    const num = localConfig.owner.number;
    const waLink = `https://wa.me/${num}`;
    const channelUrl = localConfig.channelUrl || 'https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D';

    const style = await botConfigCache.get('menu_style', 'classic').catch(() => 'classic');
    const { menuThemes: mt } = (() => { try { return { menuThemes: require('./menuThemes') }; } catch { return { menuThemes: null }; } })();
    const st = mt ? mt.getStyle(style) : { frame: ['╭','╮','╰','╯','─','│'], palette: { icon:'🕸️', bullet:'▹', sep:'⌁' } };
    const { frame: f, palette: pl } = st;

    const txt = [
      `${f[0]}${f[4].repeat(6)}〔 🕸️ *CRIADOR* 〕${f[4].repeat(6)}${f[1]}`,
      `${f[5]} ${pl.bullet} Nome:    *${localConfig.owner.name}*`,
      `${f[5]} ${pl.bullet} Role:    *Dono & Dev 👑*`,
      `${f[5]} ${pl.bullet} Bot:     *${localConfig.bot.name}*`,
      `${f[5]} ${pl.sep.repeat(28)}`,
      `${f[5]} ${pl.bullet} WhatsApp: wa.me/${num}`,
      `${f[5]} ${pl.bullet} Canal:    ${channelUrl}`,
      `${f[5]} ${pl.sep.repeat(28)}`,
      `${f[5]} _Bot desenvolvido com 🕸️ Dark Net Engine_`,
      `${f[2]}${f[4].repeat(36)}${f[3]}`,
    ].join('\n');

    // Tenta enviar com botão de link para o canal
    try {
      await buttonHandler.sendUrlButton(sock, ctx.remoteJid, txt, '🕸️ Canal WhatsApp', channelUrl, msg);
    } catch {
      await reply(sock, msg, ctx, txt);
    }
    logCmd('criador', ctx);
  },

    async menujogos({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '🎮 JOGOS & SOCIAL', target: 'menujogos', subtitle: 'Diversão, quiz e economia para membros.', buttonText: '🎮 Escolher jogo',
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
      title: '🧠 INTELIGÊNCIA ARTIFICIAL', target: 'menuia', subtitle: 'IA ligada às chaves configuradas no Render.', buttonText: '🧠 Escolher IA',
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
      title: '🎨 STICKER FORGE', target: 'menustickers', subtitle: 'Criação de stickers com qualidade Dark.', buttonText: '🎨 Escolher sticker',
      items: [
        { cmd: 'sticker', emoji: '🎨', desc: 'sticker quadrado, preenche/corta' },
        { cmd: 'sfull', emoji: '🖼️', desc: 'sticker mostra imagem inteira sem cortar' },
        { cmd: 'figubug', emoji: '👾', desc: 'sticker lendário por mídia' },
        { cmd: 'figubug2', args: 'dark robot neon', emoji: '✨', desc: 'imagem IA em sticker' },
        { cmd: 'toimg', emoji: '🖼️', desc: 'converter sticker para imagem' },
        { cmd: 'attp', args: 'Dark Bot', emoji: '✍️', desc: 'texto animado' },
        { cmd: 'ttp', args: 'Dark Bot', emoji: '📝', desc: 'texto sticker' },
        { cmd: 'stickerwm', emoji: '💧', desc: 'marca d\'água dos stickers' },
      ],
    });
  },

  async menugrupo({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '👥 ADM & GRUPOS', target: 'menugrupo', subtitle: 'Administração, regras, avisos e automação.', buttonText: '👥 Escolher ADM',
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

  async ping({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    const t0   = Date.now();
    const sent = await reply(sock, msg, ctx, '🏓 Calculando latência...');
    const lat  = Date.now() - t0;
    const ram  = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const up   = formatUptime(Date.now() - startTime);
    const style = await botConfigCache.get('menu_style', 'classic').catch(() => 'classic');
    const st    = menuThemes.getStyle(style);
    const { frame: f, palette: pl } = st;

    const bar = lat < 200 ? '🟢 Excelente' : lat < 500 ? '🟡 Boa' : lat < 1000 ? '🟠 Razoável' : '🔴 Alta';

    const txt = [
      `${f[0]}${f[4].repeat(6)}〔 ${pl.icon} PONG! 〕${f[4].repeat(6)}${f[1]}`,
      `${f[5]} ${pl.bullet} Latência: *${lat}ms*  ${bar}`,
      `${f[5]} ${pl.bullet} RAM:      *${ram} MB*`,
      `${f[5]} ${pl.bullet} Uptime:   *${up}*`,
      `${f[5]} ${pl.bullet} Bot:      *${localConfig.bot.name}*`,
      `${f[5]} ${pl.bullet} Prefixo:  *${localConfig.bot.prefix}*`,
      `${f[2]}${f[4].repeat(26)}${f[3]}`,
    ].join('\n');

    await sock.sendMessage(ctx.remoteJid, { text: txt, edit: sent.key }).catch(() => reply(sock, msg, ctx, txt));
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

  async info({ sock, msg, ctx, config: cfg }) {
    const localConfig = cfg || config;
    const ram   = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const total = Math.round(os.totalmem() / 1024 / 1024);
    const up    = formatUptime(Date.now() - startTime);
    const style = await botConfigCache.get('menu_style', 'classic').catch(() => 'classic');
    const st    = menuThemes.getStyle(style);
    const { frame: f, palette: pl } = st;

    const cfg2 = require('../config');
    const hasGroq   = !!cfg2.ai.groqApiKey;
    const hasGemini = !!cfg2.ai.geminiApiKey;
    const iaStatus  = (hasGroq || hasGemini) ? '🟢 Activa' : '🔴 Sem chave';
    const prefix    = localConfig.bot.prefix;

    const txt = [
      `${f[0]}${f[4].repeat(5)}〔 ${pl.icon} ${localConfig.bot.name} 〕${f[4].repeat(5)}${f[1]}`,
      `${f[5]} ${pl.vibe}`,
      `${f[5]} ${f[4].repeat(28)}`,
      `${f[5]} 🤖 Bot:    *${localConfig.bot.name}*`,
      `${f[5]} 👑 Dono:   *${localConfig.owner.name}*`,
      `${f[5]} 📞 +${localConfig.owner.number}`,
      `${f[5]} 🔑 Prefixo: *${prefix}*`,
      `${f[5]} ${f[4].repeat(28)}`,
      `${f[5]} 🌐 Node.js: *${process.version}*`,
      `${f[5]} 💾 RAM:     *${ram} / ${total} MB*`,
      `${f[5]} ⏱️  Uptime:  *${up}*`,
      `${f[5]} 🖥️  Sistema: *${os.platform()} ${os.arch()}*`,
      `${f[5]} 🧠 IA:      *${iaStatus}*`,
      `${f[5]} ${f[4].repeat(28)}`,
      `${f[5]} ${pl.bullet} *${prefix}menu*    — Ver comandos`,
      `${f[5]} ${pl.bullet} *${prefix}aiapis*  — Estado da IA`,
      `${f[5]} ${pl.bullet} *${prefix}ping*    — Latência`,
      `${f[2]}${f[4].repeat(34)}${f[3]}`,
    ].join('\n');
    return reply(sock, msg, ctx, txt);
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

  async perfil({ sock, msg, ctx, args, isOwner }) {
    const mentioned = getMentions(msg)[0];
    const raw = args?.[0] || '';
    const targetNumber = userManager.normalizeNumber(mentioned || raw || ctx.senderNumber);
    const targetJid = mentioned || `${targetNumber}@s.whatsapp.net`;
    const isSelf = targetNumber === ctx.senderNumber;
    let user = await User.findOne({ whatsappNumber: targetNumber }).catch(() => null);
    if (!user && isSelf) user = await userManager.identifyByWhatsApp(targetNumber, ctx.pushName);

    const ownerNumbers = [userManager.normalizeNumber(config.owner.number)];
    try {
      const extra = await BotConfig.get('owner_numbers', []);
      if (Array.isArray(extra)) ownerNumbers.push(...extra.map(userManager.normalizeNumber));
    } catch {}
    const isTargetOwner = ownerNumbers.includes(targetNumber) || user?.role === 'owner';
    const isPrem = isTargetOwner || (user && user.isPremium && user.isPremium());
    const role = isTargetOwner ? '👑 Dono / Root' : isPrem ? '⭐ Premium' : user?.role === 'free' ? '🆓 Free' : '👤 Visitante';
    const active = user?.active === false ? '🛑 Desativado' : '✅ Ativo';
    const treatment = isTargetOwner ? `Criador Supremo / Root 👑` : user?.gender === 'male' ? 'meu Rei 👑' : user?.gender === 'female' ? 'minha Rainha ✨' : 'meu nobre 🕸️';
    const premiumLine = user?.premiumUntil ? `┃ ⏳ Premium até: *${new Date(user.premiumUntil).toLocaleDateString('pt-BR')}*\n` : '';
    const visibleName = user?.name || (isSelf ? ctx.pushName : targetNumber);

    const text = `╭━━━〔 👤 DARK PROFILE 〕━━━╮\n` +
      `┃ 📛 Nome: *${visibleName || 'Sem nome'}*\n` +
      `┃ 📱 Número: *+${targetNumber}*\n` +
      `┃ 🆔 JID: \`${targetJid}\`\n` +
      `┃ 🏷️ Plano: *${role}*\n` +
      `┃ 🔋 Estado: *${active}*\n` +
      `┃ 🤝 Tratamento: *${treatment}*\n` +
      `┃ ⚡ Comandos: *${user?.commandsUsed || 0}*\n` +
      premiumLine +
      `┃ 🕒 Visto: *${user?.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('pt-BR') : 'sem registo'}*\n` +
      `╰━━━〔 ᴅᴀʀᴋ sɪᴅᴇ ⚡♾️ 〕━━━╯`;
    return sock.sendMessage(ctx.remoteJid, { text, mentions: [targetJid].filter(Boolean) }, { quoted: msg });
  },

  // ============ IA ============
  // !ia — Chat com IA com MEMÓRIA persistente
  async ia({ sock, msg, ctx, args, config: cfg }) {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;

    if (!args.length) {
      return reply(sock, msg, ctx,
        `🧠 *DARK IA — Como usar:*\n\n` +
        `*${p}ia* <pergunta>\n` +
        `Ex: *${p}ia* explique a economia de Angola\n\n` +
        `*${p}aiapis*    — estado das APIs\n` +
        `*${p}aimemoria* — ver o que a IA lembra de ti\n` +
        `*${p}airesetar* — apagar memória\n` +
        `*${p}aiton* <tom> — definir tom (formal/casual/dark/engraçado)\n\n` +
        `💡 A IA lembra das tuas conversas até 7 dias!`
      );
    }

    const cfgR = require('../config');
    const anyAI = !!(cfgR.ai.groqApiKey || cfgR.ai.geminiApiKey || cfgR.ai.openrouterApiKey || cfgR.ai.openaiApiKey);
    if (!anyAI) {
      return reply(sock, msg, ctx, `❌ IA sem chave. Configura GROQ_API_KEY no Render.`);
    }

    await react(sock, msg, '🤔');
    try {
      // Carrega memória + perfil do utilizador
      const mem = await AiMemory.getOrCreate(ctx.senderNumber);
      const u   = await User.findOne({ whatsappNumber: ctx.senderNumber }).lean().catch(() => null);
      const memOpts = {
        history:     mem.getContextWindow(12),
        userTone:    u?.aiTone || '',
        userProfile: { name: ctx.pushName, ...mem.profile },
      };

      const pergunta = args.join(' ');
      mem.addMessage('user', pergunta);
      await mem.save().catch(() => {});

      const answer = await Promise.race([
        ai.chat(pergunta, '', memOpts),
        new Promise((_, rej) => setTimeout(() => rej(new Error('IA demorou demais.')), 28000)),
      ]);

      mem.addMessage('assistant', answer);
      await mem.save().catch(() => {});

      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `🧠 *${localConfig.bot.name} IA:*\n\n${answer}`);

    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Erro na IA. Tente novamente.`);
    }
  },

  // !aimemoria — ver o que a IA lembra
  async aimemoria({ sock, msg, ctx }) {
    try {
      const mem = await AiMemory.getOrCreate(ctx.senderNumber);
      const hist = mem.getContextWindow(6);
      if (!hist.length) return reply(sock, msg, ctx, '🧠 A IA ainda não tem memória de ti. Começa a conversar com *!ia*!');
      let text = `🧠 *MEMÓRIA DA IA — ${ctx.pushName}*\n\n`;
      text += `📊 Total de mensagens: *${mem.totalMessages || 0}*\n`;
      text += `⏰ Última interacção: *${mem.lastInteraction ? new Date(mem.lastInteraction).toLocaleString('pt-PT') : 'nunca'}*\n\n`;
      text += `📜 *Últimas ${hist.length} trocas:*\n`;
      for (const h of hist) {
        const role = h.role === 'user' ? '👤' : '🤖';
        text += `${role} ${String(h.content).slice(0, 80)}...\n`;
      }
      text += `\n💡 A memória apaga-se automaticamente após 7 dias de inactividade.\nUse *!airesetar* para apagar agora.`;
      return reply(sock, msg, ctx, text);
    } catch (e) { return reply(sock, msg, ctx, '❌ Erro ao ler memória: ' + e.message); }
  },

  // !airesetar — apagar memória da IA
  async airesetar({ sock, msg, ctx }) {
    try {
      const mem = await AiMemory.getOrCreate(ctx.senderNumber);
      mem.resetHistory();
      await mem.save();
      return reply(sock, msg, ctx, '🗑️ *Memória da IA apagada!*\n\nA IA começa do zero na próxima conversa.');
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // !aiton <tom> — definir tom da IA para este utilizador (só dono)
  async aiton({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o dono pode definir o tom da IA para utilizadores.');
    const valid = ['formal', 'casual', 'engraçado', 'sério', 'técnico', 'amigável', 'dark'];
    const tom = (args[0] || '').toLowerCase();
    const alvo = ctx.senderNumber;
    if (!tom) return reply(sock, msg, ctx,
      `🎭 *Tom da IA*\n\nTons disponíveis:\n${valid.map(t => `• ${t}`).join('\n')}\n\nUso: *!aiton formal*`
    );
    if (!valid.includes(tom)) return reply(sock, msg, ctx, `❌ Tom inválido. Usa: ${valid.join(', ')}`);
    await User.findOneAndUpdate(
      { whatsappNumber: alvo },
      { aiTone: tom },
      { upsert: false }
    ).catch(() => {});
    await BotConfig.set('ai_global_tone', tom);
    botConfigCache.clear();
    return reply(sock, msg, ctx, `✅ Tom da IA definido para: *${tom}*\nTodos os utilizadores receberão respostas com este tom.`);
  },

  async gpt(args) { return module.exports.ia(args); },


  async aiapis({ sock, msg, ctx }) {
    const cfg = require('../config');
    const aiMod = require('./ai');
    const hasGroq   = !!cfg.ai.groqApiKey;
    const hasGemini = !!cfg.ai.geminiApiKey;
    const hasRouter = !!cfg.ai.openrouterApiKey;
    const hasOpenAI = !!cfg.ai.openaiApiKey;
    const anyAI = hasGroq || hasGemini || hasRouter || hasOpenAI;
    const p = cfg.bot.prefix;
    const lines = [
      `🧠 *STATUS DAS IAs — ${cfg.bot.name}*`,
      ``,
      `${hasGroq   ? '✅' : '🛑'} *Groq*       — ${hasGroq   ? 'OK ✔️' : 'Falta GROQ_API_KEY'}`,
      `${hasGemini ? '✅' : '🛑'} *Gemini*     — ${hasGemini ? 'OK ✔️' : 'Falta GEMINI_API_KEY'}`,
      `${hasRouter ? '✅' : '⬜'} *OpenRouter* — ${hasRouter ? 'OK ✔️' : 'Opcional'}`,
      `${hasOpenAI ? '✅' : '⬜'} *OpenAI*     — ${hasOpenAI ? 'OK ✔️' : 'Opcional'}`,
      ``,
      `📋 *Modelos Groq (Jul 2026):*`,
      aiMod.GROQ_MODELS.slice(0,3).map(m => `  • ${m}`).join('\n'),
      ``,
      `📋 *Modelos Gemini (Jul 2026):*`,
      aiMod.GEMINI_MODELS.map(m => `  • ${m}`).join('\n'),
      ``,
      `✅ Notícias RSS — sem key`,
      `✅ Imagens Pollinations — sem key`,
      ``,
      anyAI
        ? `🟢 *IA ACTIVA* — ${p}ia <pergunta>`
        : `🔴 *IA INACTIVA* — Configura GROQ_API_KEY no Render`,
    ];
    return reply(sock, msg, ctx, lines.join('\n'));
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
      return reply(sock, msg, ctx, '❌ Falha a gerar imagem.');
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
        ...(await getStickerWatermarkConfig(config, ctx)),
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

  // ════════════════════════════════════════════════════════════════════
  // DOWNLOADS — yt-dlp + ffmpeg-static (sem APIs pagas, sem botões)
  // Entrega áudio/vídeo directamente, sem escolhas intermédias
  // ════════════════════════════════════════════════════════════════════

  async play({ sock, msg, ctx, args, config: cfg }) {
    const p = (cfg || config).bot.prefix;
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx,
      `🎵 *${p}play* — Baixar áudio (128kbps)\n\n` +
      `Uso: *${p}play* <nome ou link YouTube>\n` +
      `Ex:  *${p}play* Drake God's Plan\n\n` +
      `• *${p}play2* — alta qualidade (192kbps)\n` +
      `• *${p}play3* — máxima qualidade (320kbps)\n` +
      `• *${p}video* — vídeo HD 720p`
    );
    await react(sock, msg, '⏳');
    try {
      const r = await ytdl.getAudio(query, '128k');
      await sendAudioWithCard(sock, msg, ctx, {
        buffer: r.buffer, title: r.title, author: r.author,
        duration: r.duration, thumb: r.thumb, mimetype: 'audio/mpeg',
      });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Falha no download. Tente outro nome ou link.`);
    }
  },

  async play2({ sock, msg, ctx, args, config: cfg }) {
    const p = (cfg || config).bot.prefix;
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx, `🎵 *${p}play2* — Alta qualidade (192kbps)\n\nUso: *${p}play2* <nome ou link>`);
    await react(sock, msg, '⏳');
    try {
      const r = await ytdl.getAudio(query, '192k');
      await sendAudioWithCard(sock, msg, ctx, {
        buffer: r.buffer, title: r.title, author: r.author,
        duration: r.duration, thumb: r.thumb, mimetype: 'audio/mpeg',
      });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}`);
    }
  },

  async play3({ sock, msg, ctx, args, config: cfg }) {
    const p = (cfg || config).bot.prefix;
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx, `🎵 *${p}play3* — Máxima qualidade (320kbps)\n\nUso: *${p}play3* <nome ou link>`);
    await react(sock, msg, '⏳');
    try {
      const r = await ytdl.getAudio(query, '320k');
      await sendAudioWithCard(sock, msg, ctx, {
        buffer: r.buffer, title: r.title, author: r.author,
        duration: r.duration, thumb: r.thumb, mimetype: 'audio/mpeg',
      });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}`);
    }
  },

  // !ytd <url ou nome> — alias de play (compatibilidade com botões antigos)
  async ytd({ sock, msg, ctx, args, config: cfg }) {
    return module.exports.play({ sock, msg, ctx, args, config: cfg });
  },

  // !gyt <url ou nome> | mp4 | 720 — alias de video (compatibilidade)
  async gyt({ sock, msg, ctx, args, config: cfg }) {
    // Limpa o formato "url | mp4 | 720" que vinha dos botões antigos
    const cleanArgs = args.join(' ').split('|')[0].trim().split(' ');
    return module.exports.video({ sock, msg, ctx, args: cleanArgs, config: cfg });
  },

  async video({ sock, msg, ctx, args, config: cfg }) {
    const p = (cfg || config).bot.prefix;
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx,
      `🎬 *${p}video* — Vídeo HD 720p\n\nUso: *${p}video* <nome ou link YouTube>\n` +
      `Ex:  *${p}video* Naruto AMV\n\n• *${p}video2* — Full HD 1080p`
    );
    await react(sock, msg, '⏳');
    try {
      const r = await ytdl.getVideo(query, '720');
      const cap = `🎬 *${r.title}*\n👤 ${r.author || ''}  ⏱️ ${r.duration || '?'}\n📺 720p HD • Dark Bot 🕸️`;
      await sendVideoFromUrl(sock, ctx.remoteJid, r.buffer, cap, msg, { title: r.title, safeMp4: true });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Falha no download. Tente outro nome ou link.`);
    }
  },

  async video2({ sock, msg, ctx, args, config: cfg }) {
    const p = (cfg || config).bot.prefix;
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx, `🎬 *${p}video2* — Full HD 1080p\n\nUso: *${p}video2* <nome ou link>`);
    await react(sock, msg, '⏳');
    try {
      const r = await ytdl.getVideo(query, '1080');
      const cap = `🎬 *${r.title}*\n👤 ${r.author || ''}  ⏱️ ${r.duration || '?'}\n📺 1080p FHD • Dark Bot 🕸️`;
      await sendVideoFromUrl(sock, ctx.remoteJid, r.buffer, cap, msg, { title: r.title, safeMp4: true });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}`);
    }
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
      const digest = await ai.getPrettyNewsDigest(tema);
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, digest);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ Notícias indisponíveis agora.');
    }
  },

  async pesquisar({ sock, msg, ctx, args }) {
    const q = args.join(' ').trim();
    if (!q) return reply(sock, msg, ctx, '🔎 Use: pesquisar <assunto>');
    await react(sock, msg, '🔎');
    try {
      let res;
      if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
        res = await ai.chat(`Pesquise online e responda de forma organizada sobre: ${q}. Traga pontos principais, contexto atual e conclusão curta.`);
      } else {
        res = await ai.getWebDigest(q);
      }
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, res);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Pesquisa online falhou agora.'); }
  },
  async google(a) { return module.exports.pesquisar(a); },

  async resumir({ sock, msg, ctx, args }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || quoted?.videoMessage?.caption || '';
    const text = args.join(' ').trim() || quotedText;
    if (!text || text.length < 20) return reply(sock, msg, ctx, '📝 Use: resumir <texto grande> ou responda uma mensagem com resumir');
    await react(sock, msg, '📝');
    try {
      let out;
      if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
        out = await ai.chat(`Resuma o texto abaixo em português, com tópicos, pontos importantes e conclusão curta.\n\nTEXTO:\n${text.slice(0, 8000)}`);
      } else {
        const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 6);
        out = `📝 *Resumo rápido*\n\n${sentences.map((x,i)=>`${i+1}. ${x}`).join('\n')}`;
      }
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `📝 *DARK SUMMARY*\n\n${out}`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Não consegui resumir agora.'); }
  },

  async statusvideo({ sock, msg, ctx, args }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const src = (quoted?.videoMessage) ? { key: msg.key, message: quoted } : null;
    await react(sock, msg, '⭕');
    try {
      let buffer, title = 'status-video';
      if (src) {
        buffer = await mediaHandler.downloadFromMessage(src);
      } else {
        if (!args.length) return reply(sock, msg, ctx, '⭕ Use: statusvideo <nome/link> ou responda um vídeo com statusvideo');
        const r = await ytdl.getVideo(args.join(' '), '480');
        buffer = r.buffer;
        title = r.title || title;
      }
      if (!buffer || buffer.length < 4096) throw new Error('vídeo vazio');
      await sock.sendMessage(ctx.remoteJid, { video: buffer, ptv: true, mimetype: 'video/mp4' }, { quoted: msg });
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `⭕ *Status/Circular enviado*\n🎬 ${title}\n_Dark Side Engine ⚡_`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Não consegui gerar status/circular: ' + e.message); }
  },
  async ptv(a) { return module.exports.statusvideo(a); },
  async videostatus(a) { return module.exports.statusvideo(a); },

  async antistatus({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx)) && ctx.senderNumber !== config.owner.number) return reply(sock, msg, ctx, '🚫 Só admins');
    const action = (args[0] || 'toggle').toLowerCase();
    let doc = await AntiStatus.findOne({ groupJid: ctx.remoteJid });
    if (!doc) doc = await AntiStatus.create({ groupJid: ctx.remoteJid, enabled: false });
    if (['on','ativar','ligar','1'].includes(action)) doc.enabled = true;
    else if (['off','desativar','desligar','0'].includes(action)) doc.enabled = false;
    else doc.enabled = !doc.enabled;
    await doc.save();
    try { require('./messageListener').refreshAntiStatusCache?.(); } catch {}
    return reply(sock, msg, ctx, `🛡️ *Anti-Status* ${doc.enabled ? 'ATIVADO' : 'DESATIVADO'} neste grupo.\n\nUse: antistatus on/off`);
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
      fs.writeFileSync(audioPath, r.buffer && Buffer.isBuffer(r.buffer) ? r.buffer : await mediaHandler.fetchBuffer(r.url));
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

  async pinterest({ sock, msg, ctx, args, config }) {
    if (!args.length) return reply(sock, msg, ctx, '📌 Use: pinterest <busca>');
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
      const head = `╭━━━〔 📌 PINTEREST UNIQUE 〕━━━╮\n┃ Busca: *${args.join(' ')}*\n┃ Imagens únicas: *${selected.length}*\n┃ Envio: organizado, sem colagem\n╰━━━〔 ᴅᴀʀᴋ sɪᴅᴇ ⚡ 〕━━━╯`;
      await reply(sock, msg, ctx, head);
      for (let i = 0; i < selected.length; i++) {
        await sock.sendMessage(ctx.remoteJid, {
          image: { url: selected[i].url },
          caption: `📌 *Pinterest* ${i + 1}/${selected.length}\n🔎 ${args.join(' ')}\n⚡ Dark Side Engine`,
        }, { quoted: msg });
        await new Promise(r => setTimeout(r, 450));
      }
      await buttonHandler.sendButtons(sock, ctx.remoteJid, '📌 Pinterest entregue', 'Dark Side Engine ⚡', [
        { id: `${config.bot.prefix}pinterest ${args.join(' ')}`, text: '🔁 Mais imagens' },
        { id: `${config.bot.prefix}pinmp4 `, text: '🎬 Pin vídeo' },
        { id: `${config.bot.prefix}menudownload`, text: '📥 Downloads' },
      ], msg, { mode: await getButtonMode() }).catch(() => {});
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async pinmp4({ sock, msg, ctx, args }) {
    const url = args[0];
    if (!url || !/^https?:\/\//i.test(url)) return reply(sock, msg, ctx, '🎬 Use: pinmp4 <link do Pinterest>');
    await react(sock, msg, '🎬');
    try {
      const r = await downloader.pinterest(url);
      if (!r?.url) throw new Error('sem vídeo/mídia');
      if (r.type === 'image') return sock.sendMessage(ctx.remoteJid, { image: { url: r.url }, caption: '📌 Pinterest retornou imagem, não vídeo.' }, { quoted: msg });
      await sendVideoFromUrl(sock, ctx.remoteJid, r.buffer || r.url, `🎬 *Pinterest MP4*\n⚡ Dark Side Engine`, msg, { title: r.title || 'pinterest-video' });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Não consegui baixar vídeo do Pinterest: ' + e.message); }
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
        ...(await getStickerWatermarkConfig(config, ctx)),
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

  // ──────────────────────────────────────────────────────────
  // !antilink — Sistema completo de anti-link Dark Side
  // Uso: !antilink on | off | modo <smart|all|wa> | acao <warn|kick>
  //      !antilink whitelist add youtube.com | whitelist del youtube.com
  //      !antilink avisos 2 | notificar on | deletar on | status
  // ──────────────────────────────────────────────────────────
  async antilink({ sock, msg, ctx, args, config: cfg }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Este comando só funciona em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins podem usar este comando.');

    const p = cfg?.bot?.prefix || config.bot.prefix;
    let gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid, groupName: ctx.groupName || '' } },
      { upsert: true, new: true }
    );

    const a = (args[0] || 'status').toLowerCase();
    let saved = false;

    if (['on', 'ativar', 'ligar', '1', 'enable'].includes(a)) {
      gs.antilink = true;
      saved = true;
    } else if (['off', 'desativar', 'desligar', '0', 'disable'].includes(a)) {
      gs.antilink = false;
      saved = true;
    } else if (['modo', 'mode'].includes(a)) {
      const m = (args[1] || '').toLowerCase();
      const modeMap = { 'smart': 'smart', 'wa': 'whatsapp_only', 'whatsapp': 'whatsapp_only', 'all': 'all_links', 'todos': 'all_links' };
      const mapped = modeMap[m] || m;
      if (!['smart', 'whatsapp_only', 'all_links'].includes(mapped)) {
        return reply(sock, msg, ctx,
          `❌ Modos disponíveis:\n` +
          `• *smart* — WA + Telegram + Discord + encurtadores\n` +
          `• *wa* — Só convites WhatsApp\n` +
          `• *all* — Qualquer link http://...`
        );
      }
      gs.antilinkMode = mapped;
      saved = true;
    } else if (['acao', 'ação', 'action', 'acao'].includes(a)) {
      const act = (args[1] || '').toLowerCase();
      if (!['warn', 'kick', 'delete'].includes(act)) {
        return reply(sock, msg, ctx, '❌ Acções: *warn* (avisar) | *kick* (remover) | *delete* (apagar sem avisar)');
      }
      gs.antilinkAction = act;
      saved = true;
    } else if (['whitelist', 'wl', 'permitir', 'allow'].includes(a)) {
      const sub = (args[1] || '').toLowerCase();
      const dom = (args[2] || args[1] || '').toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      if (['add', 'adicionar', 'allow'].includes(sub) && dom && dom !== sub) {
        if (!gs.antilinkWhitelist) gs.antilinkWhitelist = [];
        if (!gs.antilinkWhitelist.includes(dom)) gs.antilinkWhitelist.push(dom);
        saved = true;
      } else if (['del', 'remover', 'remove'].includes(sub) && dom && dom !== sub) {
        gs.antilinkWhitelist = (gs.antilinkWhitelist || []).filter(x => x !== dom);
        saved = true;
      } else if (!dom || dom === sub) {
        return reply(sock, msg, ctx,
          `📋 *Whitelist actual:* ${(gs.antilinkWhitelist || []).join(', ') || 'vazia'}\n\n` +
          `Para adicionar: *${p}antilink whitelist add youtube.com*\n` +
          `Para remover:  *${p}antilink whitelist del youtube.com*`
        );
      }
    } else if (['avisos', 'warns', 'maxavisos'].includes(a)) {
      const n = Math.max(1, Math.min(10, parseInt(args[1]) || 2));
      gs.antilinkMaxWarns = n;
      saved = true;
    } else if (['notificar', 'notify'].includes(a)) {
      gs.antilinkNotify = !['off','0','false'].includes((args[1] || '').toLowerCase());
      saved = true;
    } else if (['deletar', 'delete', 'apagar'].includes(a)) {
      gs.antilinkDeleteMsg = !['off','0','false'].includes((args[1] || '').toLowerCase());
      saved = true;
    } else if (a !== 'status') {
      return reply(sock, msg, ctx,
        `🛡️ *DARK ANTI-LINK — Comandos*\n\n` +
        `*${p}antilink on/off*             — ligar/desligar\n` +
        `*${p}antilink modo smart*         — WA+TG+Discord (padrão)\n` +
        `*${p}antilink modo wa*            — só convites WhatsApp\n` +
        `*${p}antilink modo all*           — qualquer link\n` +
        `*${p}antilink acao warn*          — apenas avisar\n` +
        `*${p}antilink acao kick*          — remover do grupo\n` +
        `*${p}antilink avisos 2*           — max avisos antes de kick\n` +
        `*${p}antilink whitelist add yt*   — permitir domínio\n` +
        `*${p}antilink whitelist del yt*   — remover da whitelist\n` +
        `*${p}antilink status*             — ver configuração`
      );
    }

    if (saved) await gs.save();

    const modeLabel = { smart: '🧠 Smart (WA+TG+Discord+enc.)', whatsapp_only: '📱 Só WhatsApp', all_links: '🌐 Todos os links' };
    const actionLabel = { warn: '⚠️ Avisar', kick: '🚫 Remover', delete: '🗑️ Apagar silencioso' };
    const wl = (gs.antilinkWhitelist || []).length ? gs.antilinkWhitelist.join(', ') : 'nenhum';

    return reply(sock, msg, ctx,
      `╔══ ˚₊‧ 🛡️ DARK ANTI-LINK ‧₊˚ ══╗\n` +
      `║\n` +
      `║ Estado:    ${gs.antilink ? '🟢 ACTIVO' : '🔴 INACTIVO'}\n` +
      `║ Modo:      ${modeLabel[gs.antilinkMode] || gs.antilinkMode}\n` +
      `║ Acção:     ${actionLabel[gs.antilinkAction] || gs.antilinkAction}\n` +
      `║ Avisos:    ${gs.antilinkMaxWarns ?? 2}x antes de kick\n` +
      `║ Apagar:    ${gs.antilinkDeleteMsg !== false ? '✅' : '❌'}\n` +
      `║ Notificar: ${gs.antilinkNotify !== false ? '✅' : '❌'}\n` +
      `║ Whitelist: ${wl}\n` +
      `║\n` +
      `╚══════════════════════════╝\n\n` +
      `💡 *${p}antilink* sem argumento = ajuda completa`
    );
  },

  // ──────────────────────────────────────────────────────────
  // !antispam — Sistema anti-spam Dark Side
  // Uso: !antispam on | off | msgs 5 | janela 5 | avisos 3 | status
  // ──────────────────────────────────────────────────────────
  async antispam({ sock, msg, ctx, args, config: cfg }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');

    const p = cfg?.bot?.prefix || config.bot.prefix;
    let gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid, groupName: ctx.groupName || '' } },
      { upsert: true, new: true }
    );

    const a = (args[0] || 'status').toLowerCase();
    let saved = false;

    if (['on', 'ativar', 'ligar', '1'].includes(a)) { gs.antispam = true; saved = true; }
    else if (['off', 'desativar', 'desligar', '0'].includes(a)) { gs.antispam = false; saved = true; }
    else if (['msgs', 'mensagens'].includes(a)) {
      gs.antispamMaxMsgs = Math.max(2, Math.min(20, parseInt(args[1]) || 5));
      saved = true;
    } else if (['janela', 'window', 'segundos'].includes(a)) {
      gs.antispamWindowMs = Math.max(1000, Math.min(30000, parseInt(args[1]) * 1000 || 5000));
      saved = true;
    } else if (['avisos', 'warns'].includes(a)) {
      gs.antispamMaxWarns = Math.max(1, Math.min(10, parseInt(args[1]) || 3));
      saved = true;
    } else if (a !== 'status') {
      return reply(sock, msg, ctx,
        `🛡️ *DARK ANTI-SPAM — Comandos*\n\n` +
        `*${p}antispam on/off*     — ligar/desligar\n` +
        `*${p}antispam msgs 5*     — max msgs na janela\n` +
        `*${p}antispam janela 5*   — janela em segundos\n` +
        `*${p}antispam avisos 3*   — avisos antes de kick\n` +
        `*${p}antispam status*     — ver configuração`
      );
    }

    if (saved) await gs.save();

    return reply(sock, msg, ctx,
      `╔══ ˚₊‧ 🛡️ DARK ANTI-SPAM ‧₊˚ ══╗\n` +
      `║\n` +
      `║ Estado:  ${gs.antispam ? '🟢 ACTIVO' : '🔴 INACTIVO'}\n` +
      `║ Máx:     ${gs.antispamMaxMsgs || 5} msgs em ${(gs.antispamWindowMs || 5000)/1000}s\n` +
      `║ Avisos:  ${gs.antispamMaxWarns || 3}x antes de kick\n` +
      `║\n` +
      `╚═══════════════════════════╝\n\n` +
      `💡 *${p}antispam* sem argumento = ajuda`
    );
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

  // !welcome — welcome/goodbye por grupo com texto personalizado
  async welcome({ sock, msg, ctx, args, config: cfg }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins.');
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;

    let gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid, groupName: ctx.groupName || '' } },
      { upsert: true, new: true }
    );

    const sub = (args[0] || 'status').toLowerCase();
    let saved = false;

    if (['on','ativar','ligar'].includes(sub)) { gs.welcomeEnabled = true; saved = true; }
    else if (['off','desativar','desligar'].includes(sub)) { gs.welcomeEnabled = false; saved = true; }
    else if (['texto','msg','mensagem','set'].includes(sub)) {
      const txt = args.slice(1).join(' ').trim();
      if (!txt) return reply(sock, msg, ctx,
        `📝 *Variáveis disponíveis:*\n{user} {grupo} {bot} {dono}\n\n` +
        `Ex: ${p}welcome texto Olá {user}! Bem-vindo ao {grupo}!`
      );
      gs.customWelcomeMsg = txt.slice(0, 500);
      saved = true;
    } else if (['bye','saiu','goodbye','saida'].includes(sub)) {
      const txt = args.slice(1).join(' ').trim();
      if (!txt) return reply(sock, msg, ctx, `Ex: ${p}welcome bye Adeus {user}! Até logo!`);
      gs.customGoodbyeMsg = txt.slice(0, 500);
      saved = true;
    } else if (['foto','photo','imagem','img'].includes(sub)) {
      const url = args[1] || '';
      gs.welcomeWithMedia = url;
      saved = true;
    } else if (['foto_perfil','pp'].includes(sub)) {
      gs.welcomeWithPhoto = args[1] !== 'off';
      saved = true;
    } else if (sub !== 'status') {
      return reply(sock, msg, ctx,
        `╭━━━〔 👋 WELCOME SYSTEM 〕━━━╮\n` +
        `┃ *${p}welcome on/off*       — ligar/desligar\n` +
        `┃ *${p}welcome texto ...*    — texto personalizado\n` +
        `┃ *${p}welcome bye ...*      — mensagem de saída\n` +
        `┃ *${p}welcome foto <url>*   — imagem de boas-vindas\n` +
        `┃ *${p}welcome foto_perfil on/off*\n` +
        `┃ *${p}welcome status*       — ver configuração\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `Variáveis: {user} {grupo} {bot} {dono}`
      );
    }

    if (saved) await gs.save();

    return reply(sock, msg, ctx,
      `╭━━━〔 👋 WELCOME — ${ctx.groupName || 'Grupo'} 〕━━━╮\n` +
      `┃ Entrada:   ${gs.welcomeEnabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `┃ Saída:     ${gs.goodbyeEnabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `┃ Foto PP:   ${gs.welcomeWithPhoto !== false ? '✅' : '❌'}\n` +
      `┃ Imagem:    ${gs.welcomeWithMedia ? '✅ configurada' : '❌'}\n` +
      `┃ Texto:\n┃ ${(gs.customWelcomeMsg || 'padrão').slice(0, 60)}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━━╯`
    );
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

    await buttonHandler.sendButtons(sock, ctx.remoteJid, title, footer, buttons, msg);
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

  // !maiscmds — Painel do dono (enviado no PV, invisível para não-donos)
  async maiscmds({ sock, msg, ctx, isOwner, config: cfg }) {
    if (!isOwner) return;
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;

    const text =
      `╔══〔 👑 DARK OWNER PANEL 〕══╗\n` +
      `║  Root: *${localConfig.owner.name}*\n` +
      `╠══════════════════════════╣\n` +
      `║  🛡️ *Controlo Supremo*\n` +
      `║  ${p}godmodoadm on/off\n` +
      `║  ${p}desativarusuario @user\n` +
      `║  ${p}ativarusuario @user\n` +
      `║  ${p}desativargrupo / ${p}ativargrupo\n` +
      `║  ${p}adddono @user / ${p}removedono n\n` +
      `║  ${p}donos — ver donos extra\n` +
      `╠══════════════════════════╣\n` +
      `║  🤖 *Bot & IA*\n` +
      `║  ${p}botchat on/off\n` +
      `║  ${p}ia / ${p}deepsearch / ${p}imagem\n` +
      `║  ${p}autodecrypt on/off\n` +
      `║  ${p}broadcast texto\n` +
      `╠══════════════════════════╣\n` +
      `║  📘 *Facebook Page*\n` +
      `║  ${p}fbpost txt / ${p}fbfoto / ${p}fbvideo\n` +
      `║  ${p}fbstory / ${p}fbstatus\n` +
      `╠══════════════════════════╣\n` +
      `║  👥 *Grupos*\n` +
      `║  ${p}bloquearcmd / ${p}desbloquearcmd\n` +
      `║  ${p}setnomebot / ${p}open / ${p}close\n` +
      `╠══════════════════════════╣\n` +
      `║  🔓 *Decrypt & VPN*\n` +
      `║  ${p}decrypt arquivo / link\n` +
      `║  ${p}vpn <uri>\n` +
      `╠══════════════════════════╣\n` +
      `║  🕳️ *Portal Oculto 18+*\n` +
      `║  ${p}cmdsocultos — menu completo\n` +
      `║  ${p}adultmode on/off\n` +
      `╠══════════════════════════╣\n` +
      `║  🎭 *Sistema & Debug*\n` +
      `║  ${p}stats / ${p}restart / ${p}backup\n` +
      `║  ${p}eval <js> / ${p}shell <cmd>\n` +
      `║  ${p}agendar / ${p}espiao on/off\n` +
      `╚══════════════════════════╝`;

    // Envia no PV do dono se for grupo
    if (ctx.isGroup) {
      await portal18.ownerPv(sock, { text });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '👑', key: msg.key } }).catch(() => {});
    } else {
      await reply(sock, msg, ctx, text);
    }
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
        ...(await getStickerWatermarkConfig(config, ctx)),
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
      title: '💰 DARK BANK', target: 'menueconomia', subtitle: 'Economia universal: trabalho, risco, mercado e aura.', buttonText: '💰 Abrir economia',
      items: [
        { cmd: 'saldo', emoji: '💰', desc: 'carteira, banco, HP e aura' }, { cmd: 'daily', emoji: '🎁', desc: 'recompensa diária' },
        { cmd: 'trabalhar', emoji: '👷', desc: 'ganho seguro' }, { cmd: 'crime', emoji: '🦹', desc: 'alto risco / alto retorno' },
        { cmd: 'pedir', emoji: '🙏', desc: 'pedir moedas' }, { cmd: 'roubar', args: '@membro', emoji: '🥷', desc: 'roubo com risco' },
        { cmd: 'depositar', args: '100', emoji: '🏦', desc: 'guardar no banco' }, { cmd: 'sacar', args: '100', emoji: '💵', desc: 'sacar do banco' },
        { cmd: 'transferir', args: '@membro 100', emoji: '🔁', desc: 'transferência' }, { cmd: 'apostar', args: '100', emoji: '🎰', desc: 'aposta balanceada' },
        { cmd: 'loja', emoji: '🛒', desc: 'itens do mundo Dark' }, { cmd: 'comprar', args: 'pocao', emoji: '🛍️', desc: 'comprar item' },
        { cmd: 'inventario', emoji: '🎒', desc: 'seus itens' }, { cmd: 'usar', args: 'pocao', emoji: '🧪', desc: 'usar item' },
        { cmd: 'heal', emoji: '❤️', desc: 'recuperar HP' }, { cmd: 'ranking', emoji: '🏆', desc: 'rank de riqueza' },
        { cmd: 'ranking', args: 'aura', emoji: '⚡', desc: 'rank de aura' },
      ],
    });
  },

  async menufamilia({ sock, msg, ctx, config }) {
    return sendStyledCommandList(sock, msg, ctx, config, {
      title: '👨‍👩‍👧 DARK FAMILY', target: 'menufamilia', subtitle: 'Laços, casamento, adoção e legado.', buttonText: '👨‍👩‍👧 Abrir família',
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
      title: '😂 DARK FUN', target: 'menudiversao', subtitle: '+9999999 aura em brincadeiras, ranks e caos controlado.', buttonText: '😂 Abrir diversão',
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
      title: 'ℹ️ STATUS & INFO', target: 'menustatus', subtitle: 'Informação, clima, utilidades e diagnóstico.', buttonText: 'ℹ️ Abrir status',
      items: [
        { cmd: 'ping', emoji: '🏓', desc: 'latência' }, { cmd: 'info', emoji: 'ℹ️', desc: 'info do bot' }, { cmd: 'id', emoji: '🆔', desc: 'seus IDs' },
        { cmd: 'perfil', emoji: '👤', desc: 'perfil' }, { cmd: 'dono', emoji: '👑', desc: 'contato dono' }, { cmd: 'clima', args: 'Luanda', emoji: '🌦️', desc: 'clima' },
        { cmd: 'qrcode', args: 'texto', emoji: '📱', desc: 'gerar QR' }, { cmd: 'calc', args: '10+5', emoji: '🧮', desc: 'calculadora' },
        { cmd: 'translate', args: 'en texto', emoji: '🌍', desc: 'tradução' }, { cmd: 'encurtar', args: 'url', emoji: '🔗', desc: 'encurtar link' },
        { cmd: 'apigratis', emoji: '🌐', desc: 'ferramentas API grátis' },
        { cmd: 'conselho', emoji: '💡', desc: 'conselho aleatório' },
        { cmd: 'pais', args: 'Angola', emoji: '🌍', desc: 'informação de país' },
        { cmd: 'cambio', args: 'USD', emoji: '💱', desc: 'câmbio atual' },
        { cmd: 'cripto', args: 'btc', emoji: '🪙', desc: 'preço cripto' },
        { cmd: 'dog', emoji: '🐶', desc: 'foto dog' },
        { cmd: 'cat', emoji: '🐱', desc: 'foto cat' },
        { cmd: 'iawhatsapp', emoji: '🤖', desc: 'adicionar Meta AI/outras IAs' },
        { cmd: 'aiapis', emoji: '🔌', desc: 'status APIs IA' },
        { cmd: 'noticias', emoji: '📰', desc: 'notícias do dia sem key extra' },
        { cmd: 'menustyle', emoji: '🎭', desc: 'alterar visual dos menus' },
        { cmd: 'buttonmode', emoji: '🔘', desc: 'alterar modo de botões' },
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


  async invokedono({ sock, msg, ctx, args, config }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👑 Invocação do dono só funciona em grupos.');
    const reason = args.join(' ').trim() || 'O grupo pediu presença do Dono Supremo.';
    const ownerNumber = userManager.normalizeNumber(config.owner.number);
    if (!ownerNumber) return reply(sock, msg, ctx, '⚠️ OWNER_NUMBER não configurado no Render.');
    const ownerJid = `${ownerNumber}@s.whatsapp.net`;
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const admins = (meta.participants || []).filter(p => isParticipantAdmin(p)).map(p => p.id);
    const invocationId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let inviteLink = '';
    try { if (await botIsAdmin(sock, ctx)) inviteLink = `https://chat.whatsapp.com/${await sock.groupInviteCode(ctx.remoteJid)}`; } catch {}
    const payload = {
      id: invocationId,
      groupJid: ctx.remoteJid,
      groupName: meta.subject || ctx.groupName || '',
      invokerJid: ctx.senderJid,
      invokerNumber: ctx.senderNumber,
      invokerName: ctx.pushName,
      reason,
      inviteLink,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    await BotConfig.set(`owner_invocation_${invocationId}`, payload);
    const groupText = `╔═══〔 👑⚡ INVOCAR DONO ⚡👑 〕═══╗\n` +
      `║ @${ctx.senderNumber} abriu o ritual.\n` +
      `║ Dono Supremo: *${config.owner.name}*\n` +
      `║ Grupo: *${meta.subject || ctx.groupName}*\n` +
      `║ Motivo: ${reason}\n` +
      `╚═══〔 +9999999 AURA ACTIVADA 〕═══╝\n\n` +
      `🛡️ ADMs/Subdonos/VIP, preparem o território. O pedido foi enviado no PV do dono.`;
    await sendWithGif(sock, msg, ctx, groupText, [ctx.senderJid, ...admins], 'anime summon dark magic portal');

    const pvText = `╭━━━〔 👑 INVOCAÇÃO DARKSIDE 〕━━━╮\n` +
      `┃ Grupo: *${meta.subject || ctx.groupName}*\n` +
      `┃ Quem invocou: *${ctx.pushName}* (+${ctx.senderNumber})\n` +
      `┃ Motivo: ${reason}\n` +
      `┃ Convite: ${inviteLink || 'bot tentará adicionar automaticamente'}\n` +
      `┃ ID: ${invocationId}\n` +
      `╰━━━〔 ACEITAR OU RECUSAR 〕━━━╯`;
    await sock.sendMessage(ownerJid, { text: pvText }, { quoted: msg }).catch(() => {});
    await buttonHandler.sendButtons(sock, ownerJid, '👑 Aceitar invocação?', 'Dark Side Engine ⚡', [
      { id: `${config.bot.prefix}aceitarinvocacao ${invocationId}`, text: '✅ Aceitar' },
      { id: `${config.bot.prefix}recusarinvocacao ${invocationId}`, text: '❌ Recusar' },
    ], null).catch(() => {});
    return true;
  },

  async aceitarinvocacao({ sock, msg, ctx, args, isOwner, config }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o Dono pode aceitar invocação.');
    const id = args[0];
    if (!id) return reply(sock, msg, ctx, 'Use: aceitarinvocacao <id>');
    const key = `owner_invocation_${id}`;
    const inv = await BotConfig.get(key, null);
    if (!inv) return reply(sock, msg, ctx, '⚠️ Invocação não encontrada ou expirada.');
    const ownerJid = `${userManager.normalizeNumber(config.owner.number)}@s.whatsapp.net`;
    let added = false;
    try { await sock.groupParticipantsUpdate(inv.groupJid, [ownerJid], 'add'); added = true; } catch {}
    if (!added && inv.inviteLink) await sock.sendMessage(ownerJid, { text: `🔗 Link do grupo para entrar:\n${inv.inviteLink}` }).catch(() => {});
    const text = `╔═══〔 👑 DONO ACEITOU 〕═══╗\n` +
      `║ O Dono Supremo *${config.owner.name}* respondeu à invocação.\n` +
      `║ Invocador: @${inv.invokerNumber}\n` +
      `║ Status: ${added ? 'adicionado ao grupo' : 'link enviado no PV'}\n` +
      `╚═══〔 DARK SIDE REIGN ⚡♾️ 〕═══╝`;
    await sock.sendMessage(inv.groupJid, { text, mentions: [`${inv.invokerNumber}@s.whatsapp.net`, ownerJid] }).catch(() => {});
    inv.status = 'accepted'; inv.acceptedAt = new Date().toISOString();
    await BotConfig.set(key, inv);
    return reply(sock, msg, ctx, added ? '✅ Aceitei e fui adicionado ao grupo.' : '✅ Aceitei. Recebi o link do grupo no PV.');
  },

  async recusarinvocacao({ sock, msg, ctx, args, isOwner, config }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só o Dono pode recusar invocação.');
    const id = args[0];
    if (!id) return reply(sock, msg, ctx, 'Use: recusarinvocacao <id>');
    const key = `owner_invocation_${id}`;
    const inv = await BotConfig.get(key, null);
    if (!inv) return reply(sock, msg, ctx, '⚠️ Invocação não encontrada ou expirada.');
    inv.status = 'rejected'; inv.rejectedAt = new Date().toISOString();
    await BotConfig.set(key, inv);
    await sock.sendMessage(inv.groupJid, { text: `🌑 *Invocação recusada*\n\nO Dono Supremo recebeu o chamado, mas não entrará agora.\nInvocador: @${inv.invokerNumber}`, mentions: [`${inv.invokerNumber}@s.whatsapp.net`] }).catch(() => {});
    return reply(sock, msg, ctx, '🌑 Invocação recusada.');
  },

  async vipcmds({ sock, msg, ctx, args, isOwner }) {
    const defaults = ['decrypt','play3','video2','statusvideo','figubug2','pinmp4','gimage','audiomeme','vinil','sfull','noticias','pesquisar','resumir'];
    if (isOwner && args.length) {
      const list = args.join(' ').split(/[\s,]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
      await BotConfig.set('vip_commands', list);
      botConfigCache.clear();
      return reply(sock, msg, ctx, `⭐ Comandos VIP atualizados:\n${list.map(x => '• ' + x).join('\n')}`);
    }
    const list = await BotConfig.get('vip_commands', defaults).catch(() => defaults);
    return reply(sock, msg, ctx, `╭━━━〔 ⭐ VIP TOP COMMANDS 〕━━━╮\n${(Array.isArray(list) ? list : defaults).map(x => `┃ ⚡ ${x}`).join('\n')}\n╰━━━〔 +9999999 AURA 〕━━━╯\n\nDono pode alterar: vipcmds play3 video2 ...`);
  },


  async menustyle({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const action = (args[0] || 'status').toLowerCase();
    if (['status','ver'].includes(action)) {
      const style = await BotConfig.get('menu_style', 'classic');
      const show = await BotConfig.get('menu_show_prefix', false);
      const mode = await BotConfig.get('button_mode', 'auto');
      return reply(sock, msg, ctx, `🎭 *MENU STYLE*\n\nEstilo: *${style}*\nPrefixo visual: *${show ? 'ON' : 'OFF'}*\nBotões: *${mode}*\n\nComandos:\nmenustyle set dark-1\nmenustyle prefix on/off\nbuttonmode auto|direct|native|wabase|text`);
    }
    if (action === 'set') {
      const style = args[1] || 'classic';
      await BotConfig.set('menu_style', style); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Estilo do menu alterado para *${style}*.`);
    }
    if (action === 'prefix') {
      const on = ['on','sim','true','1'].includes((args[1] || '').toLowerCase());
      await BotConfig.set('menu_show_prefix', on); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Prefixo visual no menu: *${on ? 'ON' : 'OFF'}*.`);
    }
    return reply(sock, msg, ctx, 'Use: menustyle set dark-1 | menustyle prefix on/off');
  },

  async buttonmode({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const mode = (args[0] || '').toLowerCase();
    const allowed = ['auto','direct','native','wabase','text'];
    if (!allowed.includes(mode)) return reply(sock, msg, ctx, `🔘 Use: buttonmode ${allowed.join('|')}`);
    await BotConfig.set('button_mode', mode); botConfigCache.clear();
    return reply(sock, msg, ctx, `✅ Modo dos botões definido: *${mode}*.`);
  },

  async stickerwm({ sock, msg, ctx, args, isOwner, config }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const action = (args[0] || 'status').toLowerCase();
    if (['status','ver'].includes(action)) {
      const enabled = await BotConfig.get('sticker_watermark_enabled', true);
      const visible = await BotConfig.get('sticker_visible_watermark', false);
      const pack = await BotConfig.get('sticker_pack_name', `${config.bot.name} • ${config.owner.name}`);
      const author = await BotConfig.get('sticker_author_name', 'auto');
      const text = await BotConfig.get('sticker_watermark_text', config.bot.name);
      return reply(sock, msg, ctx, `🎨 *STICKER WATERMARK*\n\nStatus: ${enabled ? '✅ ON' : '🛑 OFF'}\nVisível: ${visible ? '✅ ON' : '🛑 OFF'}\nPack: *${pack}*\nAuthor: *${author}*\nTexto visível: *${text}*\n\nComandos:\nstickerwm on/off\nstickerwm visible on/off\nstickerwm pack Nome\nstickerwm author Nome\nstickerwm text Marca`);
    }
    if (['on','off'].includes(action)) {
      await BotConfig.set('sticker_watermark_enabled', action === 'on'); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Marca d'água metadata: *${action.toUpperCase()}*.`);
    }
    if (action === 'visible') {
      const on = ['on','sim','true','1'].includes((args[1] || '').toLowerCase());
      await BotConfig.set('sticker_visible_watermark', on); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Marca d'água visível: *${on ? 'ON' : 'OFF'}*.`);
    }
    if (action === 'pack') {
      const val = args.slice(1).join(' ').trim(); if (!val) return reply(sock, msg, ctx, 'Use: stickerwm pack DARK BOT');
      await BotConfig.set('sticker_pack_name', val.slice(0, 80)); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Pack dos stickers: *${val.slice(0,80)}*`);
    }
    if (action === 'author') {
      const val = args.slice(1).join(' ').trim(); if (!val) return reply(sock, msg, ctx, 'Use: stickerwm author Dark Net');
      await BotConfig.set('sticker_author_name', val.slice(0, 80)); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Author dos stickers: *${val.slice(0,80)}*`);
    }
    if (action === 'text') {
      const val = args.slice(1).join(' ').trim(); if (!val) return reply(sock, msg, ctx, 'Use: stickerwm text DARK BOT');
      await BotConfig.set('sticker_watermark_text', val.slice(0, 32)); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Texto da marca visível: *${val.slice(0,32)}*`);
    }
    return module.exports.stickerwm({ sock, msg, ctx, args: ['status'], isOwner, config });
  },


  // ══════════════════════════════════════════════════════
  // PORTAL 18+ — DARK SIDE PRIVATE ENGINE
  // Exclusivo para o Dono Principal (isPrimaryOwner)
  // TODO o conteúdo vai APENAS para o PV do dono
  // ══════════════════════════════════════════════════════

  async cmdsocultos({ sock, msg, ctx, config: cfg }) {
    if (!isPrimaryOwnerOnly(ctx)) {
      // Para todos os outros: invisível — não revela nem confirma existência
      if (ctx.isGroup) await sock.sendMessage(ctx.remoteJid, { react: { text: '🕳️', key: msg.key } }).catch(() => {});
      return true;
    }
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;
    const enabled   = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    const apiUrl    = await BotConfig.get('adult_search_api_url', '').catch(() => '');
    const menuText  = portal18.portalMenuText(localConfig.owner.name, enabled, !!apiUrl, p);
    await portal18.ownerPv(sock, { text: menuText });
    if (!ctx.isGroup) await sock.sendMessage(ctx.remoteJid, { text: menuText }, { quoted: msg });
    return true;
  },

  async adultmode({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const v = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(v)) {
      const cur = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
      await portal18.ownerPv(sock, { text: `🕳️ Portal 18+: *${cur ? 'ACTIVO 🟢' : 'INACTIVO 🔴'}*\n\nUse: adultmode on/off` });
      return true;
    }
    await BotConfig.set('adult_mode_enabled', v === 'on');
    botConfigCache.clear();
    await portal18.ownerPv(sock, { text: `✅ Portal 18+: *${v === 'on' ? 'ACTIVADO 🟢' : 'DESACTIVADO 🔴'}*` });
    if (!ctx.isGroup) await sock.sendMessage(ctx.remoteJid, { text: `✅ Portal 18+: ${v.toUpperCase()}` }, { quoted: msg });
    return true;
  },

  async adultapi({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const url = args.join(' ').trim();
    if (!/^https?:\/\//i.test(url) || !url.includes('{query}')) {
      await portal18.ownerPv(sock, { text:
        `⚙️ *Configurar API de Vídeo 18+*\n\n` +
        `Formato: adultapi https://suaapi.com/search?q={query}\n\n` +
        `A API deve retornar JSON com URLs de vídeo MP4.\n` +
        `Substitua {query} onde vai a pesquisa.`
      });
      return true;
    }
    await BotConfig.set('adult_search_api_url', url);
    botConfigCache.clear();
    await portal18.ownerPv(sock, { text: `✅ API de vídeo 18+ configurada.\nConteúdo vai apenas para o teu PV.` });
    return true;
  },

  // !hentai [tags] — imagem anime adulta aleatória
  async hentai({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await portal18.ownerPv(sock, { text: '🛑 Portal OFF. Use: adultmode on' }); return true; }
    const tags = portal18.cleanQuery(args.join(' ') || 'nude rating:e');
    if (portal18.isBlocked(tags)) { await portal18.ownerPv(sock, { text: '🚫 Termo bloqueado por segurança.' }); return true; }
    await portal18.ownerPv(sock, { text: `🔍 A buscar: *${tags}*...` });
    try {
      const imgs = await portal18.searchImages(tags, 3);
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        await portal18.ownerPv(sock, {
          image: { url: img.url },
          caption: `🕳️ *Hentai ${i+1}/${imgs.length}*\n🏷️ ${img.tags.slice(0,80)}\n⭐ Score: ${img.score}\n📡 ${img.source}`,
        });
        await new Promise(r => setTimeout(r, 700));
      }
    } catch (e) {
      await portal18.ownerPv(sock, { text: `❌ Erro: ${e.message}` });
    }
    return true;
  },

  // !ximg [tags] — busca imagem adulta por tags (qualquer fonte)
  async ximg({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await portal18.ownerPv(sock, { text: '🛑 Portal OFF. Use: adultmode on' }); return true; }
    const tags = portal18.cleanQuery(args.join(' ') || 'nude');
    if (portal18.isBlocked(tags)) { await portal18.ownerPv(sock, { text: '🚫 Termo bloqueado.' }); return true; }
    await portal18.ownerPv(sock, { text: `🔍 A buscar imagens: *${tags}*...` });
    try {
      const imgs = await portal18.searchImages(tags, 4);
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        await portal18.ownerPv(sock, {
          image: { url: img.url },
          caption: `📸 *xImg ${i+1}/${imgs.length}*\n🏷️ ${img.tags.slice(0,80)}\n📡 ${img.source}`,
        });
        await new Promise(r => setTimeout(r, 700));
      }
    } catch (e) {
      await portal18.ownerPv(sock, { text: `❌ ${e.message}` });
    }
    return true;
  },

  // !adultsearch [tags] — multi-fonte
  async adultsearch({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await portal18.ownerPv(sock, { text: '🛑 Portal OFF. Use: adultmode on' }); return true; }
    const query = portal18.cleanQuery(args.join(' ') || 'nude');
    if (portal18.isBlocked(query)) { await portal18.ownerPv(sock, { text: '🚫 Termo bloqueado.' }); return true; }
    await portal18.ownerPv(sock, { text: `🔍 Pesquisando em múltiplas fontes: *${query}*...` });
    // Busca em paralelo em 2 fontes
    const results = await Promise.allSettled([
      portal18.yandeImages(query, 2),
      portal18.konachanImages(query, 2),
    ]);
    const imgs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    if (!imgs.length) {
      await portal18.ownerPv(sock, { text: `❌ Sem resultados para: ${query}` });
      return true;
    }
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      await portal18.ownerPv(sock, {
        image: { url: img.url },
        caption: `🔍 *Busca ${i+1}/${imgs.length}*\n🏷️ ${img.tags.slice(0,80)}\n📡 ${img.source}`,
      });
      await new Promise(r => setTimeout(r, 700));
    }
    return true;
  },

  // !adultvideo [termo] — vídeo via API configurável
  async adultvideo({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await portal18.ownerPv(sock, { text: '🛑 Portal OFF. Use: adultmode on' }); return true; }
    const q = portal18.cleanQuery(args.join(' ') || 'adult video');
    if (portal18.isBlocked(q)) { await portal18.ownerPv(sock, { text: '🚫 Termo bloqueado.' }); return true; }
    const apiTpl = await BotConfig.get('adult_search_api_url', '').catch(() => '');
    if (!apiTpl) {
      await portal18.ownerPv(sock, { text: `⚠️ API de vídeo não configurada.\nUse: adultapi https://suaapi.com/search?q={query}` });
      return true;
    }
    await portal18.ownerPv(sock, { text: `🎬 Buscando vídeos: *${q}*...` });
    try {
      const urls = await portal18.fetchAdultVideo(q, apiTpl);
      for (let i = 0; i < urls.length; i++) {
        await portal18.ownerPv(sock, {
          video: { url: urls[i] },
          caption: `🎬 *Vídeo ${i+1}/${urls.length}*\n🔎 ${q}`,
        });
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      await portal18.ownerPv(sock, { text: `❌ ${e.message}` });
    }
    return true;
  },
  async xvideo(a) { return module.exports.adultvideo(a); },

  // !hotchat [tema] [estilo?] — chat adulto com IA
  async hotchat({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await portal18.ownerPv(sock, { text: '🛑 Portal OFF. Use: adultmode on' }); return true; }

    // Último argumento pode ser o estilo
    const styles = ['sensual', 'picante', 'romantico', 'conto', 'conversa'];
    const lastArg = (args[args.length - 1] || '').toLowerCase();
    let style = 'sensual';
    let themeArgs = args;
    if (styles.includes(lastArg)) {
      style = lastArg;
      themeArgs = args.slice(0, -1);
    }
    const tema = portal18.cleanQuery(themeArgs.join(' ') || 'sedução e desejo adulto');
    if (portal18.isBlocked(tema)) { await portal18.ownerPv(sock, { text: '🚫 Tema bloqueado.' }); return true; }

    await portal18.ownerPv(sock, { text: `🔥 Gerando chat 18+ [${style}]...` });
    try {
      const out = await portal18.hotChatIA(tema, style);
      await portal18.ownerPv(sock, { text: `🥵 *HOTCHAT 18+ — ${style.toUpperCase()}*\n🎭 Tema: _${tema}_\n\n${out}` });
    } catch (e) {
      await portal18.ownerPv(sock, { text: `❌ HotChat falhou: ${e.message}` });
    }
    return true;
  },

  // !buscalivro [nome] — busca livros adultos/romance
  async buscalivro({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await portal18.ownerPv(sock, { text: '🛑 Portal OFF. Use: adultmode on' }); return true; }
    const query = portal18.cleanQuery(args.join(' ') || 'romance adult passion desire');
    await portal18.ownerPv(sock, { text: `📚 Buscando livros: *${query}*...` });
    try {
      const books = await portal18.searchBooks(query, 5);
      let text = `📚 *LIVROS ENCONTRADOS*\n🔎 Busca: _${query}_\n\n`;
      for (let i = 0; i < books.length; i++) {
        const b = books[i];
        text += `${i+1}. *${b.title}*\n`;
        text += `   👤 ${b.author}  ${b.year !== '?' ? '📅 '+b.year : ''}\n`;
        if (b.link) text += `   🔗 ${b.link}\n`;
        text += `   📡 ${b.source}\n\n`;
      }
      await portal18.ownerPv(sock, { text: text.trim() });
    } catch (e) {
      await portal18.ownerPv(sock, { text: `❌ ${e.message}` });
    }
    return true;
  },

  // !livros18 — livros adultos populares
  async livros18({ sock, msg, ctx }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await portal18.ownerPv(sock, { text: '🛑 Portal OFF. Use: adultmode on' }); return true; }
    await portal18.ownerPv(sock, { text: '📚 Carregando livros 18+ populares...' });
    try {
      const books = await portal18.popularBooks18(6);
      let text = `📚 *TOP LIVROS ADULTOS 18+*\n\n`;
      for (let i = 0; i < books.length; i++) {
        const b = books[i];
        text += `${i+1}. *${b.title}*\n   👤 ${b.author}\n`;
        if (b.link) text += `   🔗 ${b.link}\n`;
        text += `\n`;
      }
      text += `📡 Fonte: ${books[0]?.source || 'OpenLibrary'}`;
      await portal18.ownerPv(sock, { text });
    } catch (e) {
      await portal18.ownerPv(sock, { text: `❌ ${e.message}` });
    }
    return true;
  },




  // ══════════════════════════════════════════════════════════════════════
  // !alugar — Sistema de aluguel de grupos
  // ══════════════════════════════════════════════════════════════════════
  async alugar({ sock, msg, ctx, args, isOwner, config: cfg }) {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;

    // Lê lista de donos extra
    const extraOwners = await botConfigCache.get('owner_numbers', []).catch(() => []);
    const ownerNums   = [localConfig.owner.number, ...(Array.isArray(extraOwners) ? extraOwners : [])].map(n => String(n).replace(/\D/g,''));
    const isSubDono   = isOwner || ownerNums.includes(ctx.senderNumber);

    // VIP também pode alugar com limite
    const u = await User.findOne({ whatsappNumber: ctx.senderNumber }).catch(() => null);
    const isVip = u && u.isPremium && u.isPremium();

    if (!isSubDono && !isVip) {
      return reply(sock, msg, ctx,
        `🏠 *Aluguel de Grupo*\n\n` +
        `Este comando só pode ser usado pelo Dono, SubDonos ou utilizadores VIP.\n` +
        `Contacta: wa.me/${localConfig.owner.number}`
      );
    }

    // Formato: !alugar <dias> ou !alugar <jid> <dias>
    let targetJid = ctx.isGroup ? ctx.remoteJid : null;
    let dias = 0;
    if (args.length >= 2 && args[0].includes('@g.us')) {
      targetJid = args[0]; dias = parseInt(args[1]) || 0;
    } else if (args.length >= 1) {
      dias = parseInt(args[0]) || 0;
    }

    if (!targetJid) return reply(sock, msg, ctx, `🏠 Use em grupo ou: ${p}alugar <jid_do_grupo> <dias>`);
    if (dias < 1 || dias > 3650) return reply(sock, msg, ctx, '❌ Dias deve ser entre 1 e 3650.');

    // Verifica limite VIP
    if (!isSubDono && isVip) {
      const vipLimit = u.vipGroupLimit || 3;
      const added    = u.vipGroupsAdded || 0;
      if (added >= vipLimit) {
        return reply(sock, msg, ctx,
          `❌ Limite VIP atingido: *${added}/${vipLimit}* grupos.\n` +
          `Contacta o dono para aumentar o limite.`
        );
      }
      // Incrementa contador do VIP
      await User.findOneAndUpdate(
        { whatsappNumber: ctx.senderNumber },
        { $inc: { vipGroupsAdded: 1 } }
      ).catch(() => {});
    }

    const until = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    await GroupSettings.findOneAndUpdate(
      { groupJid: targetJid },
      {
        isHosted:    true,
        hostedUntil: until,
        trialExpiresAt: new Date(0),
        rentedBy:    ctx.senderNumber,
        rentedAt:    new Date(),
        groupName:   ctx.groupName || '',
      },
      { upsert: true, new: true }
    );

    const msg2 =
      `✅ *Aluguel activado!*\n\n` +
      `📋 Grupo: *${ctx.groupName || targetJid}*\n` +
      `⏰ Validade: *${dias} dia(s)*\n` +
      `📅 Expira: *${until.toLocaleDateString('pt-PT')}*\n` +
      `👤 Activado por: *${ctx.pushName}*\n\n` +
      `🚀 Todos os comandos estão agora *ILIMITADOS*!`;

    await reply(sock, msg, ctx, msg2);

    // Avisa no grupo alvo se for diferente
    if (targetJid !== ctx.remoteJid) {
      await sock.sendMessage(targetJid, { text: msg2 }).catch(() => {});
    }
  },

  // Alias: !hospedar
  async hospedar(a) { return module.exports.alugar(a); },

  // !statusalugar — ver estado do aluguel do grupo
  async statusalugar({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
    if (!gs) return reply(sock, msg, ctx, '❌ Grupo sem configuração.');
    const hosted  = gs.isHosted && (!gs.hostedUntil || new Date(gs.hostedUntil) > new Date());
    const expires = gs.hostedUntil ? new Date(gs.hostedUntil).toLocaleDateString('pt-PT') : '—';
    const cmdsLeft = Math.max(0, 500 - (gs.commandsUsedToday || 0));
    return reply(sock, msg, ctx,
      `╭━━━〔 🏠 ALUGUEL 〕━━━╮\n` +
      `┃ Estado:    ${hosted ? '🟢 ACTIVO' : '🔴 INACTIVO'}\n` +
      `┃ Expira:    ${expires}\n` +
      `┃ Activado:  ${gs.rentedBy || '—'}\n` +
      `┃ Cmds hoje: ${gs.commandsUsedToday || 0}${!hosted ? ` / 500 (${cmdsLeft} restantes)` : ' (ilimitado)'}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  },

  // ══════════════════════════════════════════════════════════════════════
  // !mediaup / !mediadown / !medialist — Armazenamento de mídias
  // ══════════════════════════════════════════════════════════════════════
  async mediaup({ sock, msg, ctx, args, isOwner, config: cfg }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const localConfig = cfg || config;
    const cloudinary = require('cloudinary').v2;
    const m = msg.message || {};
    const mediaMsg = m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage
      || m.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
      || m.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
    if (!mediaMsg) return reply(sock, msg, ctx, '📁 Responde/envias uma mídia com este comando para fazer upload.');
    const name = args.join(' ').trim() || `media_${Date.now()}`;
    await react(sock, msg, '⏳');
    try {
      const buf  = await mediaHandler.downloadFromMessage({ message: { imageMessage: mediaMsg, videoMessage: mediaMsg, audioMessage: mediaMsg } });
      const type = m.imageMessage ? 'image' : m.videoMessage ? 'video' : 'auto';
      const result = await cloudinary.uploader.upload(
        'data:' + (mediaMsg.mimetype || 'image/jpeg') + ';base64,' + buf.toString('base64'),
        { folder: 'darkbot-media', public_id: name.replace(/\s/g,'_'), resource_type: type }
      );
      const Media = require('../database/models/Media');
      await Media.findOneAndUpdate(
        { name },
        { name, type, url: result.secure_url, publicId: result.public_id, size: result.bytes || 0 },
        { upsert: true, new: true }
      );
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `✅ *Mídia guardada!*\n\n📂 Nome: *${name}*\n🔗 URL: ${result.secure_url}\n\nUsa: *!mediadown ${name}*`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Upload falhou: ' + e.message); }
  },

  async mediadown({ sock, msg, ctx, args }) {
    const name = args.join(' ').trim();
    if (!name) return reply(sock, msg, ctx, '📁 Use: !mediadown <nome>\n\nVer lista: !medialist');
    try {
      const Media = require('../database/models/Media');
      const media = await Media.findOne({ name: { $regex: new RegExp('^' + name, 'i') } });
      if (!media) return reply(sock, msg, ctx, `❌ Mídia "*${name}*" não encontrada.\n\nUsa !medialist para ver a lista.`);
      await react(sock, msg, '⏳');
      const payload = media.type === 'image'
        ? { image: { url: media.url }, caption: `📁 *${media.name}*` }
        : media.type === 'video'
        ? { video: { url: media.url }, caption: `📁 *${media.name}*` }
        : media.type === 'audio'
        ? { audio: { url: media.url }, mimetype: 'audio/mpeg' }
        : { document: { url: media.url }, fileName: media.name };
      await sock.sendMessage(ctx.remoteJid, payload, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async medialist({ sock, msg, ctx, isOwner }) {
    try {
      const Media = require('../database/models/Media');
      const items = await Media.find().sort({ createdAt: -1 }).limit(30).lean();
      if (!items.length) return reply(sock, msg, ctx, '📭 Nenhuma mídia guardada ainda.\n\nUsa !mediaup para guardar mídias.');
      let text = `╭━━━〔 📁 MEDIA STORAGE 〕━━━╮\n┃ ${items.length} mídias guardadas\n╠━━━━━━━━━━━━━━━━━━━━━━━━━╣\n`;
      items.forEach((m, i) => { text += `┃ ${i+1}. *${m.name}* [${m.type}]\n`; });
      text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n📥 Usar: !mediadown <nome>`;
      if (isOwner) text += `\n📤 Enviar: !mediaup <nome>`;
      return reply(sock, msg, ctx, text);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async mediadel({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const name = args.join(' ').trim();
    if (!name) return reply(sock, msg, ctx, '📁 Use: !mediadel <nome>');
    try {
      const Media = require('../database/models/Media');
      const media = await Media.findOne({ name: { $regex: new RegExp('^' + name, 'i') } });
      if (!media) return reply(sock, msg, ctx, '❌ Não encontrado.');
      // Tenta apagar do Cloudinary
      if (media.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(media.publicId, { resource_type: media.type === 'video' ? 'video' : 'image' }).catch(() => {});
      }
      await media.deleteOne();
      return reply(sock, msg, ctx, `✅ Mídia *${name}* apagada.`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ══════════════════════════════════════════════════════════════════════
  // !stickerrename / !stickerpack — renomear sticker e pack
  // ══════════════════════════════════════════════════════════════════════
  async stickerrename({ sock, msg, ctx, args }) {
    const m = msg.message || {};
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    const stkMsg = m.stickerMessage || quoted?.stickerMessage;
    if (!stkMsg) return reply(sock, msg, ctx, '🎨 Responde a um sticker com: !stickerrename <nome do pack> | <autor>');
    const [pack = '', author = ''] = args.join(' ').split('|').map(x => x.trim());
    if (!pack) return reply(sock, msg, ctx, '🎨 Use: !stickerrename <nome do pack> | <autor>\nEx: !stickerrename Dark Pack | Dark Net');
    await react(sock, msg, '⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage({ message: { stickerMessage: stkMsg } });
      const stk = await stickerMaker.create(buf, {
        botName: pack.slice(0, 25),
        ownerName: author.slice(0, 25) || ctx.pushName,
        userName: ctx.pushName,
        groupName: ctx.groupName || 'PV',
        isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `✅ Sticker renomeado!\n📦 Pack: *${pack}*\n👤 Autor: *${author || ctx.pushName}*`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // !pinpacks <nome> — busca pack de stickers no Pinterest
  async pinpacks({ sock, msg, ctx, args }) {
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx, '📌 Use: !pinpacks <nome>\nEx: !pinpacks anime dark sticker pack');
    await react(sock, msg, '⏳');
    try {
      const results = await downloader.pinterestSearch(query + ' sticker pack');
      if (!results?.length) throw new Error('Sem resultados');
      const imgs = results.filter(r => r?.url).slice(0, 6);
      await reply(sock, msg, ctx, `📌 *Pack: ${query}*\n${imgs.length} imagens encontradas`);
      for (let i = 0; i < imgs.length; i++) {
        await sock.sendMessage(ctx.remoteJid, { image: { url: imgs[i].url }, caption: `📌 Pack ${i+1}/${imgs.length}` }, { quoted: msg });
        await new Promise(r => setTimeout(r, 400));
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // !pinvd <nome> — busca vídeo no Pinterest por nome
  async pinvd({ sock, msg, ctx, args }) {
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx, '🎬 Use: !pinvd <nome>\nEx: !pinvd anime fight scene');
    await react(sock, msg, '⏳');
    try {
      const results = await downloader.pinterestSearch(query);
      if (!results?.length) throw new Error('Sem resultados');
      // Filtra por resultados com URL de vídeo
      const vids = results.filter(r => r?.url && /\.mp4|\.m4v|video/i.test(r.url)).slice(0, 2);
      if (!vids.length) {
        // Tenta via URL directa — busca link do Pinterest e tenta !pinmp4
        const firstUrl = results[0]?.sourceUrl || results[0]?.url || '';
        if (/pinterest\.com/i.test(firstUrl)) {
          const r = await downloader.pinterest(firstUrl);
          if (r?.url) {
            await sendVideoFromUrl(sock, ctx.remoteJid, r.buffer || r.url, `🎬 *${query}*`, msg, { title: query });
            await react(sock, msg, '✅'); return;
          }
        }
        throw new Error('Nenhum vídeo MP4 encontrado. Tenta com url directa: !pinmp4 <url>');
      }
      for (const vid of vids) {
        await sendVideoFromUrl(sock, ctx.remoteJid, vid.url, `🎬 *${query}*`, msg, { title: query });
        await new Promise(r => setTimeout(r, 800));
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // !rank — ranking geral de aura/coins do grupo
  async rank({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Ranking só funciona em grupos.');
    try {
      const Economy = require('../database/models/Economy');
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const memberNums = (meta.participants || []).map(p => p.id.split('@')[0].replace(/\D/g,''));
      const ecos = await Economy.find({ whatsappNumber: { $in: memberNums } })
        .sort({ aura: -1 }).limit(15).lean();
      if (!ecos.length) return reply(sock, msg, ctx, '📊 Nenhum utilizador com dados de aura neste grupo ainda.');
      const mentions = ecos.map(e => `${e.whatsappNumber}@s.whatsapp.net`);
      let text = `╭━━━〔 ⚡ RANK AURA — ${ctx.groupName} 〕━━━╮\n`;
      ecos.forEach((e, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        text += `┃ ${medal} @${e.whatsappNumber} — ⚡ *${e.aura || 0}* aura | 💰 *${e.coins || 0}*\n`;
      });
      text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
      return sock.sendMessage(ctx.remoteJid, { text, mentions }, { quoted: msg });
    } catch (e) { return reply(sock, msg, ctx, '❌ Ranking falhou: ' + e.message); }
  },

  // !rankcoins — ranking de moedas
  async rankcoins({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos.');
    try {
      const Economy = require('../database/models/Economy');
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const nums = (meta.participants || []).map(p => p.id.split('@')[0].replace(/\D/g,''));
      const ecos = await Economy.find({ whatsappNumber: { $in: nums } }).sort({ coins: -1 }).limit(10).lean();
      const mentions = ecos.map(e => `${e.whatsappNumber}@s.whatsapp.net`);
      let text = `╭━━━〔 💰 RANK COINS — ${ctx.groupName} 〕━━━╮\n`;
      ecos.forEach((e, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        text += `┃ ${medal} @${e.whatsappNumber} — 💰 *${e.coins || 0}* coins\n`;
      });
      text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
      return sock.sendMessage(ctx.remoteJid, { text, mentions }, { quoted: msg });
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // Aliases
  async mup(a) { return module.exports.mediaup(a); },
  async mdown(a) { return module.exports.mediadown(a); },
  async mlist(a) { return module.exports.medialist(a); },
  async mdel(a) { return module.exports.mediadel(a); },

  // ══════════════════════════════════════════════════════════════════════

    async animeapi({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono pode configurar API de anime.');
    const url = args.join(' ').trim();
    if (!url || !/^https?:\/\//i.test(url) || !/(\{query\}|\{q\})/i.test(url)) {
      return reply(sock, msg, ctx,
        '📺 *Configurar API de anime dublado*\n\n' +
        'Use uma URL template que retorne JSON com link MP4/M3U8.\n\n' +
        'Exemplo:\n' +
        'animeapi https://api.exemplo.com/anime?search={query}&ep={episode}&lang={lang}\n\n' +
        'Variáveis: {query}, {episode}, {lang}.');
    }
    await BotConfig.set('anime_download_api_url', url);
    botConfigCache.clear();
    return reply(sock, msg, ctx, '✅ API de anime configurada. Teste com: animedl Naruto | 1');
  },

  async animedl({ sock, msg, ctx, args, isOwner }) {
    const raw = args.join(' ').trim();
    if (!raw) return reply(sock, msg, ctx, '📺 Use: animedl Naruto | 1\nOu: animedl One Piece | 1089 | pt-BR');
    const allowed = isOwner || (ctx.userData && ctx.userData.isPremium && ctx.userData.isPremium());
    if (!allowed) return reply(sock, msg, ctx, '⭐ Download de episódio é Premium/Owner. Use vip para liberar.');
    const tpl = await BotConfig.get('anime_download_api_url', '').catch(() => '');
    if (!tpl) return reply(sock, msg, ctx, '⚠️ API de anime não configurada. Dono use: animeapi <url com {query}>');
    const parts = raw.split('|').map(x => x.trim()).filter(Boolean);
    const query = parts[0] || '';
    const episode = parts[1] || '1';
    const lang = parts[2] || 'pt-BR';
    if (!query) return reply(sock, msg, ctx, '📺 Informe o nome do anime. Ex: animedl Naruto | 1');
    await react(sock, msg, '📺');
    try {
      const apiUrl = fillAnimeApiTemplate(tpl, { query, episode, lang });
      const data = await mediaHandler.fetchJson(apiUrl, 45000);
      const urls = deepMediaUrls(data);
      const mediaUrl = urls.find(u => /\.(mp4|m3u8|webm|mov|mkv)(?:[?#]|$)|video|stream|download/i.test(u));
      if (!mediaUrl) throw new Error('API não retornou link de vídeo válido');
      const title = data?.title || data?.anime?.title || data?.name || `${query} EP ${episode}`;
      const caption = `╭━━━〔 📺 ANIME DUBLADO 〕━━━╮\n` +
        `┃ Anime: *${query}*\n` +
        `┃ Episódio: *${episode}*\n` +
        `┃ Idioma: *${lang}*\n` +
        `┃ Fonte: API configurada pelo dono\n` +
        `╰━━━〔 DARK STREAM TEST ⚡ 〕━━━╯`;
      if (/\.m3u8(?:[?#]|$)/i.test(mediaUrl)) {
        await sock.sendMessage(ctx.remoteJid, { text: `${caption}\n\n🔗 Stream HLS:\n${mediaUrl}` }, { quoted: msg });
      } else {
        await sendVideoFromUrl(sock, ctx.remoteJid, mediaUrl, caption, msg, { title, safeMp4: false });
      }
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Anime download falhou: ${e.message}\nVerifique se a API retorna JSON com link MP4/M3U8.`);
    }
  },
  async animedub(a) { return module.exports.animedl(a); },
  async animebr(a) { return module.exports.animedl(a); },

  async apigratis({ sock, msg, ctx }) {
    return reply(sock, msg, ctx, `╭━━━〔 🌐 FREE API TOOLS 〕━━━╮\n` +
      `┃ conselho — conselho aleatório\n` +
      `┃ fato — curiosidade aleatória\n` +
      `┃ pais <nome> — info de país\n` +
      `┃ cambio <moeda> — câmbio atual\n` +
      `┃ cripto [btc|eth|sol] — preço cripto\n` +
      `┃ dog — foto de cachorro\n` +
      `┃ cat — foto de gato\n` +
      `┃ ipinfo <ip> — informação de IP\n` +
      `╰━━━〔 ᴅᴀʀᴋ ᴡᴇʙ ᴛᴏᴏʟs ⚡ 〕━━━╯`);
  },

  async conselho({ sock, msg, ctx }) {
    try {
      const r = await mediaHandler.fetchJson('https://api.adviceslip.com/advice', 12000);
      return reply(sock, msg, ctx, `💡 *CONSELHO DARK*\n\n${r?.slip?.advice || 'Siga com foco e disciplina.'}`);
    } catch { return reply(sock, msg, ctx, '❌ Conselho indisponível agora.'); }
  },

  async fato({ sock, msg, ctx }) {
    try {
      const r = await mediaHandler.fetchJson('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', 12000);
      return reply(sock, msg, ctx, `🧠 *FATO ALEATÓRIO*\n\n${r?.text || 'Sem fato agora.'}`);
    } catch { return reply(sock, msg, ctx, '❌ Fatos indisponíveis agora.'); }
  },

  async pais({ sock, msg, ctx, args }) {
    const q = args.join(' ').trim();
    if (!q) return reply(sock, msg, ctx, '🌍 Use: pais Angola');
    try {
      const arr = await mediaHandler.fetchJson(`https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fields=name,capital,region,subregion,population,currencies,languages,flags`, 15000);
      const c = Array.isArray(arr) ? arr[0] : null;
      if (!c) throw new Error('não encontrado');
      const currencies = c.currencies ? Object.entries(c.currencies).map(([k,v]) => `${k} (${v.name})`).join(', ') : '—';
      const langs = c.languages ? Object.values(c.languages).join(', ') : '—';
      const text = `╭━━━〔 🌍 PAÍS 〕━━━╮\n` +
        `┃ Nome: *${c.name?.common || q}*\n` +
        `┃ Capital: *${(c.capital || ['—'])[0]}*\n` +
        `┃ Região: *${c.region || '—'}* / ${c.subregion || '—'}\n` +
        `┃ População: *${Number(c.population || 0).toLocaleString('pt-BR')}*\n` +
        `┃ Moeda: *${currencies}*\n` +
        `┃ Línguas: *${langs}*\n` +
        `╰━━━〔 ᴅᴀʀᴋ ɢᴇᴏ ⚡ 〕━━━╯`;
      if (c.flags?.png) return sock.sendMessage(ctx.remoteJid, { image: { url: c.flags.png }, caption: text }, { quoted: msg });
      return reply(sock, msg, ctx, text);
    } catch { return reply(sock, msg, ctx, '❌ País não encontrado.'); }
  },

  async cambio({ sock, msg, ctx, args }) {
    const base = (args[0] || 'USD').toUpperCase();
    try {
      const r = await mediaHandler.fetchJson(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, 15000);
      if (r?.result !== 'success') throw new Error('falhou');
      const rates = r.rates || {};
      const keys = ['AOA','BRL','EUR','USD','GBP','ZAR','CNY'];
      const lines = keys.filter(k => rates[k]).map(k => `┃ ${base} → ${k}: *${Number(rates[k]).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}*`);
      return reply(sock, msg, ctx, `╭━━━〔 💱 CÂMBIO 〕━━━╮\n${lines.join('\n')}\n╰━━━〔 Atualização: ${r.time_last_update_utc || 'agora'} 〕━━━╯`);
    } catch { return reply(sock, msg, ctx, '❌ Câmbio indisponível agora.'); }
  },

  async cripto({ sock, msg, ctx, args }) {
    const map = { btc: 'bitcoin', bitcoin: 'bitcoin', eth: 'ethereum', ethereum: 'ethereum', sol: 'solana', solana: 'solana', bnb: 'binancecoin', doge: 'dogecoin' };
    const id = map[(args[0] || 'btc').toLowerCase()] || (args[0] || 'bitcoin').toLowerCase();
    try {
      const r = await mediaHandler.fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,eur,brl&include_24hr_change=true`, 15000);
      const d = r[id]; if (!d) throw new Error('não encontrado');
      return reply(sock, msg, ctx, `╭━━━〔 🪙 CRIPTO 〕━━━╮\n┃ Ativo: *${id}*\n┃ USD: *$${d.usd}*\n┃ EUR: *€${d.eur}*\n┃ BRL: *R$${d.brl}*\n┃ 24h: *${Number(d.usd_24h_change || 0).toFixed(2)}%*\n╰━━━〔 CoinGecko Free 〕━━━╯`);
    } catch { return reply(sock, msg, ctx, '❌ Cripto indisponível agora.'); }
  },

  async dog({ sock, msg, ctx }) {
    try { const r = await mediaHandler.fetchJson('https://dog.ceo/api/breeds/image/random', 12000); return sock.sendMessage(ctx.remoteJid, { image: { url: r.message }, caption: '🐶 *DOG API*' }, { quoted: msg }); }
    catch { return reply(sock, msg, ctx, '❌ Dog API falhou.'); }
  },

  async cat({ sock, msg, ctx }) {
    try { const r = await mediaHandler.fetchJson('https://api.thecatapi.com/v1/images/search', 12000); return sock.sendMessage(ctx.remoteJid, { image: { url: r?.[0]?.url }, caption: '🐱 *CAT API*' }, { quoted: msg }); }
    catch { return reply(sock, msg, ctx, '❌ Cat API falhou.'); }
  },

  async ipinfo({ sock, msg, ctx, args }) {
    const ip = args[0] || '';
    if (!ip) return reply(sock, msg, ctx, '🌐 Use: ipinfo 8.8.8.8');
    try {
      const r = await mediaHandler.fetchJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,query,country,regionName,city,isp,org,as,lat,lon,timezone`, 12000);
      if (r.status !== 'success') throw new Error(r.message || 'falhou');
      return reply(sock, msg, ctx, `╭━━━〔 🌐 IP INFO 〕━━━╮\n┃ IP: *${r.query}*\n┃ País: *${r.country}*\n┃ Cidade: *${r.city || '—'}*\n┃ Região: *${r.regionName || '—'}*\n┃ ISP: *${r.isp || '—'}*\n┃ Org: *${r.org || '—'}*\n┃ AS: *${r.as || '—'}*\n┃ TZ: *${r.timezone || '—'}*\n╰━━━━━━━━━━━━━━╯`);
    } catch { return reply(sock, msg, ctx, '❌ IP info indisponível.'); }
  },

  async adultvideo({ sock, msg, ctx, args }) {
    if (!isPrimaryOwnerOnly(ctx)) return true;
    const q = adultCleanQuery(args.join(' '));
    if (!q) { await ownerPv(sock, ctx, { text: 'Use: adultvideo <termo adulto legal>' }); return true; }
    if (adultBlockedQuery(q)) { await ownerPv(sock, ctx, { text: '🚫 Termo bloqueado por segurança/legalidade.' }); return true; }
    const enabled = await BotConfig.get('adult_mode_enabled', false).catch(() => false);
    if (!enabled) { await ownerPv(sock, ctx, { text: '🛑 Portal 18+ OFF. Use: adultmode on' }); return true; }
    const apiTpl = await BotConfig.get('adult_search_api_url', '').catch(() => '');
    if (!apiTpl) { await ownerPv(sock, ctx, { text: '⚠️ Configure uma API legal: adultapi https://...{query}' }); return true; }
    try {
      const data = await mediaHandler.fetchJson(apiTpl.replace(/\{query\}/g, encodeURIComponent(q)), 20000);
      const urls = deepAdultMediaUrls(data).filter(u => /\.(mp4|webm|mov)(?:[?#]|$)|video/i.test(u)).slice(0, 3);
      if (!urls.length) throw new Error('sem vídeos');
      for (let i = 0; i < urls.length; i++) await ownerPv(sock, ctx, { video: { url: urls[i] }, caption: `🔞 Adult video ${i+1}/${urls.length}\n🔎 ${q}` });
    } catch (e) { await ownerPv(sock, ctx, { text: `❌ adultvideo falhou: ${e.message}` }); }
    return true;
  },


  async themeglobal({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const v = (args[0] || 'status').toLowerCase();
    if (!['on','off'].includes(v)) {
      const cur = await BotConfig.get('theme_apply_all', false).catch(() => false);
      return reply(sock, msg, ctx, `🎭 *Tema global nas respostas*\n\nStatus: *${cur ? 'ON' : 'OFF'}*\n\nUse:\nthemeglobal on\nthemeglobal off`);
    }
    await BotConfig.set('theme_apply_all', v === 'on'); botConfigCache.clear();
    return reply(sock, msg, ctx, `✅ Tema global nas respostas: *${v.toUpperCase()}*`);
  },


  async menuaudio({ sock, msg, ctx }) {
    return reply(sock, msg, ctx, `╔━᳀『 *EFEITOS DE ÁUDIO* 』═᳀\n\n⌬ _Marque um áudio e use o comando_\n\n╔━᳀『 *🔊 Bass* 』\n⌬ bass / bass2 / bass3\n\n╔━᳀『 *🎸 Grave* 』\n⌬ grave / grave2 / grave3\n\n╔━᳀『 *🌀 Reverb* 』\n⌬ reverb / reverb2 / reverb3\n\n╔━᳀『 *🎧 8D* 』\n⌬ 8d / 8d2 / 8d3\n\n╔━᳀『 *🐢 Slowed* 』\n⌬ slowed / slowed2 / slowed3\n\n╔━᳀『 *🌊 Slowed + Reverb* 』\n⌬ slowedreverb / slowedreverb2 / slowedreverb3\n\n╔━᳀『 *🎤 Chorus* 』\n⌬ chorus / chorus2 / chorus3\n\n╔━᳀『 *⚡ Velocidade* 』\n⌬ fast / slow / nightcore / vaporwave / hardcore\n\n╔━᳀『 *🎭 Voz* 』\n⌬ robot / chipmunk / squirrel / monster / whisper / pitch / deep\n\n╔━᳀『 *🌊 Ambiente* 』\n⌬ echo / stadium / cave / underwater / telephone / radio / lofi\n\n╔━᳀『 *🎛️ Modulação* 』\n⌬ flanger / phaser / tremolo / vibrato / reverse / karaoke / blown / earrape / fat / smooth\n\n╚═━═━═━═━═━═━═━═━═━═᳀\n\n> Dark bot`);
  },

  async audiofx({ sock, msg, ctx, args }) {
    const effect = (args[0] || '').toLowerCase();
    if (!AUDIO_EFFECTS[effect]) return module.exports.menuaudio({ sock, msg, ctx });
    const src = getQuotedAudioMessage(msg);
    if (!src) return reply(sock, msg, ctx, `🎧 Responda/marque um áudio com *${effect}*.`);
    await react(sock, msg, '🎛️');
    try {
      const input = await mediaHandler.downloadFromMessage(src);
      const out = processAudioEffect(input, AUDIO_EFFECTS[effect], effect);
      await sock.sendMessage(ctx.remoteJid, { audio: out, mimetype: 'audio/mpeg', fileName: `dark-${effect}.mp3`, ptt: false }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, `❌ Efeito falhou: ${e.message}`); }
  },
  async bass(a) { a.args = ['bass', ...(a.args || [])]; return module.exports.audiofx(a); },
  async bass2(a) { a.args = ['bass2', ...(a.args || [])]; return module.exports.audiofx(a); },
  async bass3(a) { a.args = ['bass3', ...(a.args || [])]; return module.exports.audiofx(a); },
  async grave(a) { a.args = ['grave', ...(a.args || [])]; return module.exports.audiofx(a); },
  async grave2(a) { a.args = ['grave2', ...(a.args || [])]; return module.exports.audiofx(a); },
  async grave3(a) { a.args = ['grave3', ...(a.args || [])]; return module.exports.audiofx(a); },
  async reverb(a) { a.args = ['reverb', ...(a.args || [])]; return module.exports.audiofx(a); },
  async reverb2(a) { a.args = ['reverb2', ...(a.args || [])]; return module.exports.audiofx(a); },
  async reverb3(a) { a.args = ['reverb3', ...(a.args || [])]; return module.exports.audiofx(a); },
  '8d': async (a) => { a.args = ['8d', ...(a.args || [])]; return module.exports.audiofx(a); },
  '8d2': async (a) => { a.args = ['8d2', ...(a.args || [])]; return module.exports.audiofx(a); },
  '8d3': async (a) => { a.args = ['8d3', ...(a.args || [])]; return module.exports.audiofx(a); },
  async slowed(a) { a.args = ['slowed', ...(a.args || [])]; return module.exports.audiofx(a); },
  async slowed2(a) { a.args = ['slowed2', ...(a.args || [])]; return module.exports.audiofx(a); },
  async slowed3(a) { a.args = ['slowed3', ...(a.args || [])]; return module.exports.audiofx(a); },
  async slowedreverb(a) { a.args = ['slowedreverb', ...(a.args || [])]; return module.exports.audiofx(a); },
  async slowedreverb2(a) { a.args = ['slowedreverb2', ...(a.args || [])]; return module.exports.audiofx(a); },
  async slowedreverb3(a) { a.args = ['slowedreverb3', ...(a.args || [])]; return module.exports.audiofx(a); },
  async chorus(a) { a.args = ['chorus', ...(a.args || [])]; return module.exports.audiofx(a); },
  async chorus2(a) { a.args = ['chorus2', ...(a.args || [])]; return module.exports.audiofx(a); },
  async chorus3(a) { a.args = ['chorus3', ...(a.args || [])]; return module.exports.audiofx(a); },
  async fast(a) { a.args = ['fast', ...(a.args || [])]; return module.exports.audiofx(a); },
  async slow(a) { a.args = ['slow', ...(a.args || [])]; return module.exports.audiofx(a); },
  async nightcore(a) { a.args = ['nightcore', ...(a.args || [])]; return module.exports.audiofx(a); },
  async vaporwave(a) { a.args = ['vaporwave', ...(a.args || [])]; return module.exports.audiofx(a); },
  async hardcore(a) { a.args = ['hardcore', ...(a.args || [])]; return module.exports.audiofx(a); },
  async robot(a) { a.args = ['robot', ...(a.args || [])]; return module.exports.audiofx(a); },
  async chipmunk(a) { a.args = ['chipmunk', ...(a.args || [])]; return module.exports.audiofx(a); },
  async squirrel(a) { a.args = ['squirrel', ...(a.args || [])]; return module.exports.audiofx(a); },
  async monster(a) { a.args = ['monster', ...(a.args || [])]; return module.exports.audiofx(a); },
  async whisper(a) { a.args = ['whisper', ...(a.args || [])]; return module.exports.audiofx(a); },
  async pitch(a) { a.args = ['pitch', ...(a.args || [])]; return module.exports.audiofx(a); },
  async deep(a) { a.args = ['deep', ...(a.args || [])]; return module.exports.audiofx(a); },
  async echo(a) { a.args = ['echo', ...(a.args || [])]; return module.exports.audiofx(a); },
  async stadium(a) { a.args = ['stadium', ...(a.args || [])]; return module.exports.audiofx(a); },
  async cave(a) { a.args = ['cave', ...(a.args || [])]; return module.exports.audiofx(a); },
  async underwater(a) { a.args = ['underwater', ...(a.args || [])]; return module.exports.audiofx(a); },
  async telephone(a) { a.args = ['telephone', ...(a.args || [])]; return module.exports.audiofx(a); },
  async radio(a) { a.args = ['radio', ...(a.args || [])]; return module.exports.audiofx(a); },
  async lofi(a) { a.args = ['lofi', ...(a.args || [])]; return module.exports.audiofx(a); },
  async flanger(a) { a.args = ['flanger', ...(a.args || [])]; return module.exports.audiofx(a); },
  async phaser(a) { a.args = ['phaser', ...(a.args || [])]; return module.exports.audiofx(a); },
  async tremolo(a) { a.args = ['tremolo', ...(a.args || [])]; return module.exports.audiofx(a); },
  async vibrato(a) { a.args = ['vibrato', ...(a.args || [])]; return module.exports.audiofx(a); },
  async reverse(a) { a.args = ['reverse', ...(a.args || [])]; return module.exports.audiofx(a); },
  async karaoke(a) { a.args = ['karaoke', ...(a.args || [])]; return module.exports.audiofx(a); },
  async blown(a) { a.args = ['blown', ...(a.args || [])]; return module.exports.audiofx(a); },
  async earrape(a) { a.args = ['earrape', ...(a.args || [])]; return module.exports.audiofx(a); },
  async fat(a) { a.args = ['fat', ...(a.args || [])]; return module.exports.audiofx(a); },
  async smooth(a) { a.args = ['smooth', ...(a.args || [])]; return module.exports.audiofx(a); },


  async iawhatsapp({ sock, msg, ctx, args, isOwner }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '🤖 Use em grupos para adicionar IAs como membros.');
    if (!isOwner && !(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admin/dono.');
    const action = (args[0] || 'status').toLowerCase();
    let list = await BotConfig.get('ai_member_numbers', []).catch(() => []);
    if (!Array.isArray(list)) list = [];
    if (['add','adicionar','set'].includes(action)) {
      const nums = args.slice(1).join(' ').split(/[\s,]+/).map(userManager.normalizeNumber).filter(n => n.length >= 8);
      if (!nums.length) return reply(sock, msg, ctx, 'Use: iawhatsapp add 551199999999 2449xxxxxxx');
      for (const n of nums) if (!list.includes(n)) list.push(n);
      await BotConfig.set('ai_member_numbers', list); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ IAs WhatsApp salvas:\n${list.map(n => '• +' + n).join('\n')}`);
    }
    if (['remove','remover'].includes(action)) {
      const nums = args.slice(1).map(userManager.normalizeNumber).filter(Boolean);
      list = list.filter(n => !nums.includes(n));
      await BotConfig.set('ai_member_numbers', list); botConfigCache.clear();
      return reply(sock, msg, ctx, `✅ Lista atual:\n${list.length ? list.map(n => '• +' + n).join('\n') : 'vazia'}`);
    }
    if (['entrar','join','convocar'].includes(action)) {
      if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin para adicionar membros.');
      if (!list.length) return reply(sock, msg, ctx, 'Configure primeiro: iawhatsapp add <numero-da-ia>');
      const jids = list.map(n => `${n}@s.whatsapp.net`);
      await sock.groupParticipantsUpdate(ctx.remoteJid, jids, 'add').catch(() => {});
      return reply(sock, msg, ctx, `🤖 Tentativa de adicionar IAs ao grupo:\n${list.map(n => '• +' + n).join('\n')}\n\nObs: algumas IAs como Meta AI podem não aceitar adição por número em todos países.`);
    }
    return reply(sock, msg, ctx, `╭━━━〔 🤖 IA WHATSAPP MEMBERS 〕━━━╮\n┃ Configure números de IAs oficiais/assistentes\n┃ e tente adicionar ao grupo.\n╰━━━━━━━━━━━━━━━━━━━━╯\n\nLista atual:\n${list.length ? list.map(n => '• +' + n).join('\n') : 'vazia'}\n\nComandos:\niawhatsapp add <numero>\niawhatsapp remove <numero>\niawhatsapp entrar`);
  },
  async addia(a) { return module.exports.iawhatsapp(a); },
  async metai(a) { return module.exports.iawhatsapp(a); },


  async anime({ sock, msg, ctx, args }) {
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx, '❌ Digite o nome do anime.\nEx: anime Naruto');
    await react(sock, msg, '📺');
    try {
      const data = await mediaHandler.fetchJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`, 20000);
      const anime = data?.data?.[0];
      if (!anime) return reply(sock, msg, ctx, '❌ Anime não encontrado.');
      const clean = (txt = '') => String(txt || '')
        .replace(/\[Written by MAL Rewrite\]/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const sinopse = clean(anime.synopsis).slice(0, 700) || 'Sem descrição.';
      const genres = (anime.genres || []).map(g => g.name).slice(0, 5).join(', ') || 'N/A';
      const studios = (anime.studios || []).map(x => x.name).slice(0, 3).join(', ') || 'N/A';
      const trailer = anime.trailer?.url || '';
      const msgTxt =
`┌─*̥˚˚*ੈ‧₊˚୨୧⋆ ˚｡⋆『📺』⋆ ˚｡⋆୨୧˚*ੈ‧₊˚*̥˚─┐
┊ ❖『 📺 』❖ 𝐈𝐍𝐅𝐎 𝐀𝐍𝐈𝐌𝐄 ❖『 📺 』❖
└─*̥˚˚*ੈ‧₊˚୨୧⋆ ˚｡⋆『📺』⋆ ˚｡⋆୨୧˚*ੈ‧₊˚*̥˚─┘
╎ ⛧ 𝐓𝐢́𝐭𝐮𝐥𝐨: ${anime.title || 'N/A'}
╎ ⛧ 𝐉𝐚𝐩𝐨𝐧𝐞̂𝐬: ${anime.title_japanese || 'N/A'}
╎ ⛧ 𝐒𝐜𝐨𝐫𝐞: ${anime.score || 'N/A'}
╎ ⛧ 𝐑𝐚𝐧𝐤: ${anime.rank ? '#' + anime.rank : 'N/A'}
╎ ⛧ 𝐏𝐨𝐩𝐮𝐥𝐚𝐫𝐢𝐝𝐚𝐝𝐞: ${anime.popularity ? '#' + anime.popularity : 'N/A'}
╎ ⛧ 𝐓𝐢𝐩𝐨: ${anime.type || 'N/A'}
╎ ⛧ 𝐄𝐩𝐢𝐬𝐨́𝐝𝐢𝐨𝐬: ${anime.episodes || 'N/A'}
╎ ⛧ 𝐀𝐧𝐨: ${anime.year || anime.aired?.prop?.from?.year || 'N/A'}
╎ ⛧ 𝐒𝐭𝐚𝐭𝐮𝐬: ${anime.status || 'N/A'}
╎ ⛧ 𝐆𝐞̂𝐧𝐞𝐫𝐨𝐬: ${genres}
╎ ⛧ 𝐄𝐬𝐭𝐮́𝐝𝐢𝐨: ${studios}
┌─*̥˚˚*ੈ‧₊˚୨୧⋆ ˚｡⋆『📖』⋆ ˚｡⋆୨୧˚*ੈ‧₊˚*̥˚─┐
┊ ✦『 📖 』✦ 𝐒𝐈𝐍𝐎𝐏𝐒𝐄 ✦『 📖 』✦
└─*̥˚˚*ੈ‧₊˚୨୧⋆ ˚｡⋆『📖』⋆ ˚｡⋆୨୧˚*ੈ‧₊˚*̥˚─┘
╎ ${sinopse}${sinopse.length >= 700 ? '...' : ''}
${trailer ? `\n╎ 🎬 𝐓𝐫𝐚𝐢𝐥𝐞𝐫: ${trailer}` : ''}
┌─*̥˚˚*ੈ‧₊˚୨୧⋆ ˚｡⋆『☩』⋆ ˚｡⋆୨୧˚*ੈ‧₊˚*̥˚─┐
┊ ✦『 ☩ 』✦ ${anime.title || query} ✦『 ☩ 』✦
└─*̥˚˚*ੈ‧₊˚୨୧⋆ ˚｡⋆『☩』⋆ ˚｡⋆୨୧˚*ੈ‧₊˚*̥˚─┘
> Fonte: Jikan/MAL · DarkSide Engine ⚡`;
      const img = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || anime.images?.webp?.large_image_url;
      if (img) await sock.sendMessage(ctx.remoteJid, { image: { url: img }, caption: msgTxt }, { quoted: msg });
      else await reply(sock, msg, ctx, msgTxt);
      await react(sock, msg, '✅');
    } catch (e) {
      console.error('[ANIME]', e.message);
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ Erro ao buscar anime. Tente outro nome.');
    }
  },



  async animeeps({ sock, msg, ctx, args }) {
    const query = args.join(' ').trim();
    if (!query) return reply(sock, msg, ctx, '📺 Use: animeeps Naruto\nMostra episódios/lista legal via MyAnimeList/Jikan.');
    await react(sock, msg, '📺');
    try {
      const search = await mediaHandler.fetchJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`, 20000);
      const anime = search?.data?.[0];
      if (!anime?.mal_id) return reply(sock, msg, ctx, '❌ Anime não encontrado.');
      const eps = await mediaHandler.fetchJson(`https://api.jikan.moe/v4/anime/${anime.mal_id}/episodes`, 20000).catch(() => null);
      const list = (eps?.data || []).slice(0, 20);
      const rows = list.map(e => `┃ ${String(e.mal_id || '').padStart(2, '0')} • ${e.title || e.title_japanese || 'Episódio'}${e.aired ? `\n┃     ${new Date(e.aired).toLocaleDateString('pt-BR')}` : ''}`).join('\n');
      const text = `╭━━━〔 📺 ANIME EPISÓDIOS 〕━━━╮\n` +
        `┃ Anime: *${anime.title}*\n` +
        `┃ Score: *${anime.score || 'N/A'}*\n` +
        `┃ Total: *${anime.episodes || 'N/A'}*\n` +
        `┣━━━━━━━━━━━━━━━━━━━━\n` +
        `${rows || '┃ Sem lista de episódios disponível.'}\n` +
        `╰━━━〔 Fonte: Jikan/MAL 〕━━━╯\n\n` +
        `⚠️ Não baixo episódios protegidos por copyright. Use plataformas oficiais/licenciadas.\n` +
        `${anime.url ? `🔗 MAL: ${anime.url}` : ''}`;
      const img = anime.images?.jpg?.image_url || anime.images?.webp?.image_url;
      if (img) await sock.sendMessage(ctx.remoteJid, { image: { url: img }, caption: text }, { quoted: msg });
      else await reply(sock, msg, ctx, text);
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ Erro ao buscar episódios do anime.');
    }
  },
  async animeepisodios(a) { return module.exports.animeeps(a); },
  async episodiosanime(a) { return module.exports.animeeps(a); },


  async fbset({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const [pageId, token] = args;
    if (!pageId || !token) return reply(sock, msg, ctx, '📘 Use: fbset <PAGE_ID> <PAGE_ACCESS_TOKEN>\nOu configure FB_PAGE_ID e FB_PAGE_ACCESS_TOKEN no Render.');
    await BotConfig.set('fb_page_id', pageId.trim());
    await BotConfig.set('fb_page_access_token', token.trim());
    botConfigCache.clear();
    return reply(sock, msg, ctx, '✅ Facebook Page configurado. Teste: fbpost Olá DarkSide');
  },

  async fbpost({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const text = args.join(' ').trim();
    if (!text) return reply(sock, msg, ctx, '📘 Use: fbpost sua legenda/texto');
    await react(sock, msg, '📘');
    try {
      const r = await facebookPublisher.publishText(text);
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `✅ Post publicado no Facebook.\n${facebookPublisher.resultLink(r)}`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Facebook post falhou: ' + e.message); }
  },

  async fbfoto({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const caption = args.join(' ').trim();
    const urlArg = args.find(a => /^https?:\/\//i.test(a));
    await react(sock, msg, '📸');
    try {
      let payload = { caption };
      if (urlArg) payload.url = urlArg;
      else {
        const media = await mediaBufferFromQuoted(msg);
        if (!media || media.type !== 'image') return reply(sock, msg, ctx, '📸 Responda uma foto ou use: fbfoto <url> legenda');
        payload.buffer = media.buffer; payload.fileName = 'dark-facebook-photo.jpg';
      }
      const r = await facebookPublisher.publishPhoto(payload);
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `✅ Foto publicada no Facebook.\n${facebookPublisher.resultLink(r)}`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Facebook foto falhou: ' + e.message); }
  },
  async fbphoto(a) { return module.exports.fbfoto(a); },

  async fbvideo({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const description = args.join(' ').trim();
    const urlArg = args.find(a => /^https?:\/\//i.test(a));
    await react(sock, msg, '🎬');
    try {
      let payload = { description };
      if (urlArg) payload.url = urlArg;
      else {
        const media = await mediaBufferFromQuoted(msg);
        if (!media || media.type !== 'video') return reply(sock, msg, ctx, '🎬 Responda um vídeo ou use: fbvideo <url> legenda');
        payload.buffer = media.buffer; payload.fileName = 'dark-facebook-video.mp4';
      }
      const r = await facebookPublisher.publishVideo(payload);
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `✅ Vídeo publicado no Facebook.\n${facebookPublisher.resultLink(r)}`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Facebook vídeo falhou: ' + e.message); }
  },

  async fbstory({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const caption = args.join(' ').trim();
    const urlArg = args.find(a => /^https?:\/\//i.test(a));
    await react(sock, msg, '📲');
    try {
      let r;
      if (urlArg) {
        const isVid = /\.(mp4|webm|mov)(?:[?#]|$)/i.test(urlArg);
        r = isVid ? await facebookPublisher.publishVideoStory({ description: caption, url: urlArg }) : await facebookPublisher.publishPhotoStory({ caption, url: urlArg });
      } else {
        const media = await mediaBufferFromQuoted(msg);
        if (!media) return reply(sock, msg, ctx, '📲 Responda foto/vídeo ou use: fbstory <url> legenda');
        r = media.type === 'video'
          ? await facebookPublisher.publishVideoStory({ description: caption, buffer: media.buffer })
          : await facebookPublisher.publishPhotoStory({ caption, buffer: media.buffer });
      }
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `✅ Story enviado/tentado no Facebook.\n${facebookPublisher.resultLink(r)}${r.storyWarning ? '\n⚠️ Story endpoint avisou: ' + r.storyWarning : ''}`);
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ Facebook story falhou: ' + e.message); }
  },

  async fbstatus({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono.');
    const c = await facebookPublisher.getFbConfig();
    return reply(sock, msg, ctx, `📘 *FACEBOOK CONFIG*\n\nPage ID: ${c.pageId ? '✅ configurado' : '❌ vazio'}\nToken: ${c.token ? '✅ configurado' : '❌ vazio'}\n\nComandos:\nfbset <page_id> <token>\nfbpost texto\nfbfoto legenda (responda foto)\nfbvideo legenda (responda vídeo)\nfbstory legenda (responda mídia)`);
  },

};
