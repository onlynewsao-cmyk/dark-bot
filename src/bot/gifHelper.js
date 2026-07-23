/**
 * gifHelper.js — GIF/MP4 robusto e variado para WhatsApp
 *
 * Problema resolvido: GIF repetido em comandos diferentes.
 * - Tenor guarda POOL de URLs, não 1 URL fixa.
 * - OtakuGifs/waifu/nekos são consultados sem cache fixo para virem aleatórios.
 * - Mantém histórico recente por query/categoria para evitar repetir o mesmo GIF.
 * - Cada comando cai numa categoria que combina melhor com a ação.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const mediaHandler = require('./mediaHandler');
const config = require('../config');

const TENOR_KEY = config.tenorApiKey;
const MAX_BYTES = 6 * 1024 * 1024;
const TIMEOUT_MS = 6500;
const POOL_TTL = 8 * 60 * 1000;
const tenorPoolCache = new Map(); // key -> { urls, ts }
const recentByKey = new Map(); // key -> [url]

const CATEGORY_ALIASES = [
  // carinho/amor
  { keys: ['abracar', 'abraçar', 'hug', 'cuddle', 'carinho', 'acurrucarse'], waifu: 'hug', nekos: 'hug', otaku: ['hug', 'cuddle'], tenor: ['anime hug wholesome', 'anime cuddle cute', 'anime warm hug'] },
  { keys: ['beijar', 'kiss', 'beijo', 'besar'], waifu: 'kiss', nekos: 'kiss', otaku: ['kiss'], tenor: ['anime kiss romantic', 'anime cute kiss'] },
  { keys: ['cafune', 'pat', 'acariciar', 'palmada', 'palmadita'], waifu: 'pat', nekos: 'pat', otaku: ['pat'], tenor: ['anime head pat', 'anime pat cute'] },
  { keys: ['flertar', 'wink', 'paquerar', 'seducir', 'shy', 'timido', 'timida'], waifu: 'wink', nekos: 'wink', otaku: ['wink', 'blush', 'shy'], tenor: ['anime wink blush', 'anime shy blush', 'anime flirt wink'] },
  { keys: ['declarar', 'love', 'amor', 'casamento', 'familia', 'família', 'adocao', 'adoção'], waifu: 'cuddle', nekos: 'hug', otaku: ['love', 'hug', 'cuddle'], tenor: ['anime love heart', 'anime couple love', 'anime family cute'] },
  { keys: ['chocolate', 'dar chocolate'], waifu: 'happy', nekos: 'happy', otaku: ['happy', 'eat'], tenor: ['anime chocolate gift', 'anime valentine chocolate'] },

  // ataque/luta
  { keys: ['tapa', 'slap', 'bofetada'], waifu: 'slap', nekos: 'slap', otaku: ['slap'], tenor: ['anime slap funny', 'anime slap face'] },
  { keys: ['soco', 'punch', 'golpear', 'bater'], waifu: 'bonk', nekos: 'punch', otaku: ['punch', 'bonk'], tenor: ['anime punch fight', 'anime bonk funny'] },
  { keys: ['chute', 'chutar', 'kick', 'pontape'], waifu: 'kick', nekos: 'kick', otaku: ['kick'], tenor: ['anime kick fight', 'anime flying kick'] },
  { keys: ['morder', 'bite'], waifu: 'bite', nekos: 'bite', otaku: ['bite'], tenor: ['anime bite', 'anime cute bite'] },
  { keys: ['matar', 'kill'], waifu: 'kill', nekos: 'shoot', otaku: ['kill'], tenor: ['anime dramatic fight', 'anime knockout'] },
  { keys: ['tiro', 'shoot', 'atirar'], waifu: 'kill', nekos: 'shoot', otaku: ['shoot'], tenor: ['anime gun action', 'anime shoot action'] },
  { keys: ['facada', 'knife', 'stab'], waifu: 'kill', nekos: 'punch', otaku: ['mad', 'punch'], tenor: ['anime knife fight', 'anime angry fight'] },
  { keys: ['bullying', 'bully'], waifu: 'bully', nekos: 'punch', otaku: ['bully', 'punch'], tenor: ['anime bully funny', 'anime teasing'] },
  { keys: ['envenenar', 'veneno', 'poison'], waifu: 'kill', nekos: 'punch', otaku: ['evillaugh', 'mad'], tenor: ['anime evil laugh', 'anime poison'] },

  // emoções/estado
  { keys: ['mimimi', 'cry', 'llorar', 'triste', 'sad', 'fail', 'perdeu'], waifu: 'cry', nekos: 'cry', otaku: ['cry', 'sad'], tenor: ['anime cry sad', 'anime sad tears'] },
  { keys: ['happy', 'alegre', 'feliz', 'daily', 'comprar'], waifu: 'happy', nekos: 'happy', otaku: ['happy', 'smile'], tenor: ['anime happy excited', 'anime smile happy'] },
  { keys: ['cringe', 'vergonha', 'facepalm'], waifu: 'cringe', nekos: 'baka', otaku: ['cringe', 'facepalm'], tenor: ['anime cringe', 'anime facepalm'] },
  { keys: ['pensar', 'think'], waifu: 'happy', nekos: 'think', otaku: ['think', 'stare'], tenor: ['anime thinking', 'anime think'] },
  { keys: ['dormir', 'sleep'], waifu: 'happy', nekos: 'sleep', otaku: ['sleep', 'tired'], tenor: ['anime sleep', 'anime sleepy'] },
  { keys: ['correr', 'run'], waifu: 'happy', nekos: 'run', otaku: ['run'], tenor: ['anime running', 'anime run away'] },
  { keys: ['scared', 'assustado', 'assustada'], waifu: 'cry', nekos: 'scared', otaku: ['scared'], tenor: ['anime scared', 'anime shock scared'] },

  // diversão/ações
  { keys: ['dancar', 'dançar', 'dance', 'bailar'], waifu: 'dance', nekos: 'dance', otaku: ['dance'], tenor: ['anime dance happy', 'anime dancing cute'] },
  { keys: ['highfive', 'celebrar', 'win', 'venceu'], waifu: 'highfive', nekos: 'highfive', otaku: ['highfive', 'celebrate'], tenor: ['anime high five', 'anime celebration'] },
  { keys: ['wave', 'acenar', 'hola', 'ola'], waifu: 'wave', nekos: 'wave', otaku: ['wave'], tenor: ['anime wave hello', 'anime hello'] },
  { keys: ['poke', 'cutucar'], waifu: 'poke', nekos: 'poke', otaku: ['poke'], tenor: ['anime poke', 'anime poking'] },
  { keys: ['comer', 'eat', 'food'], waifu: 'happy', nekos: 'happy', otaku: ['eat', 'nom'], tenor: ['anime eating food', 'anime eat'] },
  { keys: ['cafe', 'coffee', 'tomarcafe'], waifu: 'happy', nekos: 'happy', otaku: ['sip', 'happy'], tenor: ['anime coffee', 'anime drinking coffee'] },
  { keys: ['fofocar', 'gossip', 'whisper'], waifu: 'happy', nekos: 'happy', otaku: ['whisper', 'smug'], tenor: ['anime whisper gossip', 'anime smug talk'] },
  { keys: ['cuidar', 'heal', 'nurse'], waifu: 'happy', nekos: 'happy', otaku: ['pat', 'hug'], tenor: ['anime nurse heal', 'anime caring'] },
  { keys: ['bencao', 'benção', 'pray', 'bless'], waifu: 'happy', nekos: 'happy', otaku: ['happy'], tenor: ['anime pray', 'anime blessing'] },

  // economia/ranking
  { keys: ['money', 'rich', 'rico', 'ranking', 'rank', 'trophy'], waifu: 'happy', nekos: 'happy', otaku: ['happy', 'celebrate'], tenor: ['anime money', 'anime trophy winner', 'anime rich'] },
  { keys: ['crime', 'roubo', 'rob', 'steal'], waifu: 'bully', nekos: 'punch', otaku: ['evillaugh', 'run'], tenor: ['anime thief run', 'anime evil laugh'] },
  { keys: ['aposta', 'bet', 'casino'], waifu: 'happy', nekos: 'happy', otaku: ['happy', 'nervous'], tenor: ['anime gambling', 'anime nervous'] },
  { keys: ['trabalho', 'work'], waifu: 'happy', nekos: 'happy', otaku: ['tired', 'think'], tenor: ['anime working tired', 'anime office work'] },
  { keys: ['gift', 'presente'], waifu: 'happy', nekos: 'happy', otaku: ['happy'], tenor: ['anime gift present', 'anime happy gift'] },
];

function delayReject(ms, label = 'timeout') {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms));
}

function normalize(s = '') {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function rememberRecent(key, url) {
  const list = recentByKey.get(key) || [];
  list.unshift(url);
  recentByKey.set(key, [...new Set(list)].slice(0, 8));
}

function pickFresh(key, urls) {
  const pool = [...new Set((urls || []).filter(Boolean))];
  if (!pool.length) return null;
  const recent = new Set(recentByKey.get(key) || []);
  const fresh = pool.filter(u => !recent.has(u));
  const chosenPool = fresh.length ? fresh : pool;
  const chosen = chosenPool[Math.floor(Math.random() * chosenPool.length)];
  rememberRecent(key, chosen);
  return chosen;
}

function getPool(key) {
  const hit = tenorPoolCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > POOL_TTL) { tenorPoolCache.delete(key); return null; }
  return hit.urls;
}

function setPool(key, urls) {
  const clean = [...new Set((urls || []).filter(Boolean))];
  if (clean.length) tenorPoolCache.set(key, { urls: clean, ts: Date.now() });
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
      '-y', '-t', '8', '-i', inputPath,
      '-vf', 'fps=15,scale=360:-2:flags=lanczos,format=yuv420p',
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-movflags', '+faststart',
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
  const q = normalize(query);
  for (const item of CATEGORY_ALIASES) {
    if (item.keys.some(k => q.includes(normalize(k)))) return item;
  }
  return { waifu: 'happy', nekos: 'happy', otaku: ['happy', 'smile', 'wave'], tenor: ['anime happy', 'anime reaction'] };
}

function tenorQueries(query) {
  const cat = resolveCategory(query);
  const base = Array.isArray(cat.tenor) ? cat.tenor : [String(query || 'anime reaction')];
  // mistura query original + queries específicas da categoria para manter 80% coerente e variar
  return [...new Set([String(query || '').trim(), ...base].filter(Boolean))].slice(0, 4);
}

async function fetchTenorMp4Url(query, limit = 18) {
  if (!TENOR_KEY) return null;
  const queries = tenorQueries(query);
  const all = [];
  for (const q of queries) {
    const key = `tenor:${q}`;
    let pool = getPool(key);
    if (!pool) {
      try {
        const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=${limit}&media_filter=tinymp4,mp4&contentfilter=medium&random=true`;
        const data = await Promise.race([mediaHandler.fetchJson(url), delayReject(TIMEOUT_MS)]);
        pool = (data?.results || []).map(x => x.media_formats?.tinymp4?.url || x.media_formats?.mp4?.url).filter(Boolean);
        setPool(key, pool);
      } catch { pool = []; }
    }
    all.push(...(pool || []));
  }
  return pickFresh(`tenor:${normalize(query)}`, all);
}

async function fetchOtakuGifUrl(query) {
  const cat = resolveCategory(query);
  const reactions = Array.isArray(cat.otaku) ? cat.otaku : [cat.otaku || 'happy'];
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  try {
    const data = await Promise.race([
      mediaHandler.fetchJson(`https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(reaction)}`),
      delayReject(TIMEOUT_MS),
    ]);
    if (data?.url) {
      const key = `otaku:${normalize(query)}:${reaction}`;
      if ((recentByKey.get(key) || []).includes(data.url)) return null;
      rememberRecent(key, data.url);
      return data.url;
    }
  } catch {}
  return null;
}

async function fetchWaifuGifUrl(query) {
  const cat = resolveCategory(query).waifu || 'happy';
  try {
    const data = await Promise.race([
      mediaHandler.fetchJson(`https://api.waifu.pics/sfw/${encodeURIComponent(cat)}`),
      delayReject(TIMEOUT_MS),
    ]);
    return data?.url || null;
  } catch { return null; }
}

async function fetchNekosGifUrl(query) {
  const cat = resolveCategory(query).nekos || 'happy';
  try {
    const data = await Promise.race([
      mediaHandler.fetchJson(`https://nekos.best/api/v2/${encodeURIComponent(cat)}?amount=1`),
      delayReject(TIMEOUT_MS),
    ]);
    return data?.results?.[0]?.url || null;
  } catch { return null; }
}

async function fetchNekosLifeUrl(query) {
  const cat = resolveCategory(query);
  const types = ['hug', 'pat', 'kiss', 'wink', 'slap', 'happy', 'cry', 'dance', 'neko'];
  const type = cat.nekos || types[Math.floor(Math.random() * types.length)];
  try {
    const data = await Promise.race([
      mediaHandler.fetchJson(`https://nekos.life/api/v2/img/${encodeURIComponent(type)}`),
      delayReject(TIMEOUT_MS),
    ]);
    return data?.url || null;
  } catch { return null; }
}

async function fetchGifFromTenorFallback(query) {
  // Tenor sem key — usa endpoint GIF público (sem key, limitado)
  try {
    const url = `https://g.tenor.com/v1/random?q=${encodeURIComponent(query)}&limit=5&contentfilter=medium&media_filter=gif`;
    const data = await Promise.race([mediaHandler.fetchJson(url), delayReject(TIMEOUT_MS)]);
    const gifs = data?.results || [];
    if (!gifs.length) return null;
    const pick = gifs[Math.floor(Math.random() * gifs.length)];
    return pick?.media?.[0]?.gif?.url || pick?.media?.[0]?.tinygif?.url || null;
  } catch { return null; }
}

async function fetchCandidateUrls(query) {
  const urls = [];
  // 1. Tenor com key (melhor qualidade)
  const tenor = await fetchTenorMp4Url(query);
  if (tenor) urls.push(tenor);
  // 2. OtakuGifs
  const otaku = await fetchOtakuGifUrl(query);
  if (otaku) urls.push(otaku);
  // 3. Waifu.pics (sem key, sempre disponível)
  const waifu = await fetchWaifuGifUrl(query);
  if (waifu) urls.push(waifu);
  // 4. Nekos.best (sem key)
  const nekos = await fetchNekosGifUrl(query);
  if (nekos) urls.push(nekos);
  // 5. Nekos.life (sem key, fallback)
  if (urls.length === 0) {
    const nl = await fetchNekosLifeUrl(query);
    if (nl) urls.push(nl);
  }
  // 6. Tenor público sem key (último recurso)
  if (urls.length === 0) {
    const tf = await fetchGifFromTenorFallback(query);
    if (tf) urls.push(tf);
  }
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
