/**
 * gifHelper.js — GIF/MP4 robusto para WhatsApp
 *
 * Estratégia:
 * 1) Tenor API v2 se TENOR_API_KEY estiver configurada.
 * 2) APIs públicas sem chave (waifu.pics / nekos.best) por categoria.
 * 3) Converte GIF/WebP animado para MP4 com ffmpeg-static.
 * 4) Envia como video + gifPlayback:true no WhatsApp.
 * 5) Se tudo falhar, envia texto normal sem quebrar o comando.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const mediaHandler = require('./mediaHandler');
const config = require('../config');

const TENOR_KEY = config.tenorApiKey;
const MAX_BYTES = 6 * 1024 * 1024; // limite seguro para gifPlayback
const TIMEOUT_MS = 6500;
const CACHE_TTL = 10 * 60 * 1000;
const urlCache = new Map(); // query -> { url, ts }

const CATEGORY_ALIASES = [
  { keys: ['abracar', 'abraçar', 'hug', 'cuddle', 'carinho'], waifu: 'hug', nekos: 'hug', otaku: 'hug' },
  { keys: ['beijar', 'kiss', 'beijo'], waifu: 'kiss', nekos: 'kiss', otaku: 'kiss' },
  { keys: ['tapa', 'slap'], waifu: 'slap', nekos: 'slap', otaku: 'slap' },
  { keys: ['soco', 'punch', 'bater', 'espancar'], waifu: 'bonk', nekos: 'punch', otaku: 'punch' },
  { keys: ['chute', 'kick'], waifu: 'kick', nekos: 'kick', otaku: 'kick' },
  { keys: ['morder', 'bite'], waifu: 'bite', nekos: 'bite', otaku: 'bite' },
  { keys: ['dancar', 'dançar', 'dance'], waifu: 'dance', nekos: 'dance', otaku: 'dance' },
  { keys: ['cafune', 'pat', 'acariciar'], waifu: 'pat', nekos: 'pat', otaku: 'pat' },
  { keys: ['flertar', 'wink', 'paquerar'], waifu: 'wink', nekos: 'wink', otaku: 'wink' },
  { keys: ['matar', 'kill'], waifu: 'kill', nekos: 'shoot', otaku: 'kill' },
  { keys: ['tiro', 'shoot', 'atirar'], waifu: 'kill', nekos: 'shoot', otaku: 'shoot' },
  { keys: ['bullying', 'bully'], waifu: 'bully', nekos: 'punch', otaku: 'bully' },
  { keys: ['cuidar', 'happy', 'alegre', 'daily', 'ranking', 'comprar'], waifu: 'happy', nekos: 'happy', otaku: 'happy' },
  { keys: ['recusa', 'cry', 'triste', 'fail', 'perdeu'], waifu: 'cry', nekos: 'cry', otaku: 'cry' },
  { keys: ['highfive', 'celebrar', 'win', 'venceu'], waifu: 'highfive', nekos: 'highfive', otaku: 'highfive' },
  { keys: ['poke', 'cutucar'], waifu: 'poke', nekos: 'poke', otaku: 'poke' },
  { keys: ['wave', 'acenar'], waifu: 'wave', nekos: 'wave', otaku: 'wave' },
  { keys: ['smile', 'sorrir'], waifu: 'smile', nekos: 'smile', otaku: 'smile' },
  { keys: ['cringe', 'mimimi'], waifu: 'cringe', nekos: 'baka', otaku: 'cringe' },
  { keys: ['money', 'rich', 'rico', 'crime', 'roubo', 'aposta', 'trabalho', 'gift'], waifu: 'happy', nekos: 'happy', otaku: 'happy' },
  { keys: ['casamento', 'familia', 'família', 'adocao', 'adoção', 'divorcio'], waifu: 'cuddle', nekos: 'hug', otaku: 'hug' },
];

function delayReject(ms, label = 'timeout') {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms));
}

function cacheGet(key) {
  const hit = urlCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL) { urlCache.delete(key); return null; }
  return hit.url;
}

function cacheSet(key, url) {
  if (url) urlCache.set(key, { url, ts: Date.now() });
}

function getFfmpegBin() {
  try { return require('ffmpeg-static') || 'ffmpeg'; }
  catch { return 'ffmpeg'; }
}

function detectKind(buffer, url = '') {
  if (!buffer || buffer.length < 12) return 'unknown';
  if (buffer.slice(4, 8).toString() === 'ftyp') return 'mp4';
  if (buffer.slice(0, 6).toString() === 'GIF87a' || buffer.slice(0, 6).toString() === 'GIF89a') return 'gif';
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (/\.mp4(?:\?|$)/i.test(url)) return 'mp4';
  if (/\.gif(?:\?|$)/i.test(url)) return 'gif';
  if (/\.webp(?:\?|$)/i.test(url)) return 'webp';
  return 'unknown';
}

function extForKind(kind) {
  return kind === 'gif' ? 'gif' : kind === 'webp' ? 'webp' : kind === 'mp4' ? 'mp4' : 'bin';
}

function convertAnimatedToMp4(inputBuffer, kind = 'gif') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-gif-'));
  const inputPath = path.join(tmpDir, `input.${extForKind(kind)}`);
  const outputPath = path.join(tmpDir, 'output.mp4');
  try {
    fs.writeFileSync(inputPath, inputBuffer);
    execFileSync(getFfmpegBin(), [
      '-y',
      '-t', '8',
      '-i', inputPath,
      '-vf', 'fps=15,scale=360:-2:flags=lanczos,format=yuv420p',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-movflags', '+faststart',
      outputPath,
    ], { stdio: 'ignore', timeout: 45000 });
    const out = fs.readFileSync(outputPath);
    if (!out || out.length < 500 || detectKind(out) !== 'mp4') throw new Error('MP4 inválido');
    return out;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function resolveCategory(query = '') {
  const q = String(query).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const item of CATEGORY_ALIASES) {
    if (item.keys.some(k => q.includes(String(k).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))) {
      return item;
    }
  }
  return { waifu: 'happy', nekos: 'happy', otaku: 'happy' };
}

async function fetchTenorMp4Url(query, limit = 10) {
  if (!TENOR_KEY) return null;
  const key = `tenor:${query}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}&media_filter=tinymp4,mp4&contentfilter=medium`;
    const data = await Promise.race([mediaHandler.fetchJson(url), delayReject(TIMEOUT_MS)]);
    const results = data?.results || [];
    if (!results.length) return null;
    const pool = results
      .map(x => x.media_formats?.tinymp4?.url || x.media_formats?.mp4?.url)
      .filter(Boolean);
    if (!pool.length) return null;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    cacheSet(key, chosen);
    return chosen;
  } catch {
    return null;
  }
}

async function fetchOtakuGifUrl(query) {
  const cat = resolveCategory(query).otaku;
  const key = `otaku:${cat}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const data = await Promise.race([
      mediaHandler.fetchJson(`https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(cat)}`),
      delayReject(TIMEOUT_MS),
    ]);
    if (data?.url) { cacheSet(key, data.url); return data.url; }
  } catch {}
  return null;
}

async function fetchWaifuGifUrl(query) {
  const cat = resolveCategory(query).waifu;
  const key = `waifu:${cat}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const data = await Promise.race([
      mediaHandler.fetchJson(`https://api.waifu.pics/sfw/${encodeURIComponent(cat)}`),
      delayReject(TIMEOUT_MS),
    ]);
    if (data?.url) { cacheSet(key, data.url); return data.url; }
  } catch {}
  return null;
}

async function fetchNekosGifUrl(query) {
  const cat = resolveCategory(query).nekos;
  const key = `nekos:${cat}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const data = await Promise.race([
      mediaHandler.fetchJson(`https://nekos.best/api/v2/${encodeURIComponent(cat)}?amount=1`),
      delayReject(TIMEOUT_MS),
    ]);
    const url = data?.results?.[0]?.url;
    if (url) { cacheSet(key, url); return url; }
  } catch {}
  return null;
}

async function fetchCandidateUrls(query) {
  const urls = [];
  const tenor = await fetchTenorMp4Url(query);
  if (tenor) urls.push(tenor);
  // OtakuGifs é sem chave e costuma responder bem no Render.
  const otaku = await fetchOtakuGifUrl(query);
  if (otaku) urls.push(otaku);
  const waifu = await fetchWaifuGifUrl(query);
  if (waifu) urls.push(waifu);
  const nekos = await fetchNekosGifUrl(query);
  if (nekos) urls.push(nekos);
  return [...new Set(urls)];
}

async function bufferToWhatsappMp4(url) {
  const buf = await Promise.race([mediaHandler.fetchBuffer(url), delayReject(9000)]);
  if (!buf || buf.length < 500) return null;
  const kind = detectKind(buf, url);
  const mp4 = kind === 'mp4' ? buf : convertAnimatedToMp4(buf, kind);
  if (!mp4 || mp4.length < 500 || mp4.length > MAX_BYTES) return null;
  return mp4;
}

/**
 * Baixa/gera buffer MP4 para gifPlayback.
 */
async function fetchGifBuffer(query) {
  if (!query) return null;
  const urls = await fetchCandidateUrls(query);
  for (const url of urls) {
    try {
      const mp4 = await bufferToWhatsappMp4(url);
      if (mp4) return mp4;
    } catch {}
  }
  return null;
}

/**
 * Envia mensagem com GIF animado (gifPlayback: true).
 * Se o GIF não carregar em tempo, envia só texto.
 */
async function sendWithGif(sock, msg, ctx, text, mentions, query) {
  mentions = mentions || [];

  if (query) {
    try {
      const buf = await fetchGifBuffer(query);
      if (buf) {
        return sock.sendMessage(ctx.remoteJid, {
          video: buf,
          gifPlayback: true,
          caption: text,
          mentions,
          mimetype: 'video/mp4',
        }, { quoted: msg });
      }
    } catch {}
  }

  return sock.sendMessage(ctx.remoteJid, { text, mentions }, { quoted: msg });
}

module.exports = {
  fetchGifBuffer,
  fetchTenorMp4Url,
  fetchOtakuGifUrl,
  fetchWaifuGifUrl,
  fetchNekosGifUrl,
  sendWithGif,
  resolveCategory,
};
