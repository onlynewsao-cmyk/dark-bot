'use strict';
/**
 * DARK BOT v8.4 — Arte de entrada (welcome2/welcm3) + cartão de herói 🎨
 *
 *  welcome2  → FOTO IA da pessoa que entrou no grupo, com a foto de
 *              perfil do utilizador incorporada no próprio cartão.
 *  welcm3    → GIF de super animação (pan da arte, anel pulsante,
 *              partículas, faísca) — gifPlayback no WhatsApp.
 *  RG card   → o mesmo motor serve o cartão de herói do RPG.
 *
 * Pipeline: pollinations.ai gera a ARTE DE FUNDO; o sharp compõe o
 * circulo da foto de perfil + anel de neon + tipografia; o welcm3 gera
 * N frames e junta tudo em mp4 via ffmpeg (convertEngine).
 */
const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const execFileAsync = require('util').promisify(execFile);

const W = 900, H = 420;
const POLLI = 'https://image.pollinations.ai/prompt';

const PROMPTS = {
  welcome: 'epic dark fantasy welcome portal, purple silk webs, obsidian arches, violet mist, cinematic light, glowing spiderweb filigree, no text, no letters, no watermark',
  hero: 'epic dark fantasy hero hall, obsidian throne, violet embers, silver webs on black marble, cinematic dramatic lighting, no text, no letters, no watermark',
};

function _defaults(opts, seedOffset = 0) {
  return {
    name: opts.name || 'NOVO HERÓI',
    sub1: opts.sub1 || '',
    sub2: opts.sub2 || '',
    footer: opts.footer || '🕸️ DARK BOT',
    accent: opts.accent || '#8b00ff',
    sub: opts.sub || '#cfc3ff',
    seed: (opts.seed || Date.now() % 100000) + seedOffset,
    kind: opts.kind || 'welcome',
  };
}

async function _fetch(url, opts = {}) {
  if (opts.fetchFn) return opts.fetchFn(url);
  try {
    const axios = require('axios');
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000, maxRedirects: 4 });
    const ct = String(r.headers?.['content-type'] || '').toLowerCase();
    const b = Buffer.from(r.data || []);
    // só aceita imagens reais — um redirect de erro/HTML nunca entra no sharp
    if (!ct.startsWith('image/') || b.length < 512) return null;
    return b;
  } catch { return null; }
}

/** Fundo IA (com fallback gradiente elegante se a IA estiver em manutenção). */
async function fundo(o, opts) {
  const url = `${POLLI}/${encodeURIComponent(PROMPTS[o.kind] || PROMPTS.welcome)}?width=${W}&height=${H}&seed=${o.seed}&nologo=true`;
  const b = await _fetch(url, opts).catch(() => null);
  if (b && b.length > 3000) {
    try { return await sharp(b).resize(W, H, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer(); } catch {}
  }
  // fallback: gradiente tema (sempre bonito)
  const svg = `<svg width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0a0a0f"/><stop offset="0.55" stop-color="#141024"/>
        <stop offset="1" stop-color="${o.accent}" stop-opacity="0.55"/>
      </linearGradient>
      <radialGradient id="v" cx="0.22" cy="0.5" r="0.65">
        <stop offset="0" stop-color="${o.accent}" stop-opacity="0.35"/><stop offset="1" stop-opacity="0"/>
      </radialGradient>
    </defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#v)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Foto de perfil em círculo (com borda dupla neon); sem foto → selo do bot. */
function _circleSvg(size, accent, innerR) {
  return Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${innerR}" fill="#fff"/>
    </svg>`);
}

async function _ppCircle(ppBuf, sizePx, opts = {}) {
  const inner = sizePx;
  let src = ppBuf;
  if (!src) {
    const r = Math.floor(inner / 2.6);
    src = Buffer.from(`<svg width="${inner}" height="${inner}">
      <rect width="${inner}" height="${inner}" fill="#12101d"/>
      <circle cx="${inner / 2}" cy="${inner / 2}" r="${r}" fill="none" stroke="${opts.accent || '#8b00ff'}" stroke-width="4"/>
      <circle cx="${inner / 2}" cy="${inner / 2 - r / 4}" r="${r / 4.5}" fill="#3a2a66"/>
      <path d="M ${inner / 2 - r} ${inner / 2 + r * 0.75} Q ${inner / 2} ${inner / 2 - r * 0.2} ${inner / 2 + r} ${inner / 2 + r * 0.75}" fill="none" stroke="#3a2a66" stroke-width="6" stroke-linecap="round"/>
    </svg>`);
  }
  const mask = _circleSvg(inner, '#fff', inner / 2);
  return sharp(src).resize(inner, inner, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png().toBuffer();
}

/** Overlay de texto/anel/partículas (SVG, do jeito que o sharp percebe). */
function overlaySvg(o, frame = null) {
  // frame: { ringR, sparkles:[{x,y,r,a}], panX }
  const ringR = frame?.ringR ?? 96;
  const ppCX = 160, ppCY = H / 2 - 10, ppR = 86;
  let spark = '';
  if (frame?.sparkles) {
    for (const s of frame.sparkles) {
      spark += `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${o.accent}" opacity="${s.a}"/>`;
    }
  }
  const esc = (t) => String(t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const title = o.name.toUpperCase().slice(0, 22);
  const texts = `
    <text x="300" y="120" font-family="Arial Black, Arial, sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="1">${esc(title)}</text>
    ${o.sub1 ? `<text x="302" y="178" font-family="Arial, sans-serif" font-size="24" fill="${o.accent}" font-weight="700">${esc(o.sub1.slice(0, 44))}</text>` : ''}
    ${o.sub2 ? `<text x="302" y="222" font-family="Arial, sans-serif" font-size="19" fill="${o.sub}">${esc(o.sub2.slice(0, 52))}</text>` : ''}
    <text x="302" y="${H - 38}" font-family="Arial, sans-serif" font-size="15" fill="#9a8fc7">${esc(o.footer.slice(0, 40))}</text>`;
  return Buffer.from(`<svg width="${W}" height="${H}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0.30" stop-color="#000" stop-opacity="0.72"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" x="0" y="0" fill="url(#shade)"/>
    ${spark}
    <circle cx="${ppCX}" cy="${ppCY}" r="${ringR}" fill="none" stroke="${o.accent}" stroke-width="5" opacity="0.95"/>
    <circle cx="${ppCX}" cy="${ppCY}" r="${ringR + 8}" fill="none" stroke="${o.accent}" stroke-width="2" opacity="0.55"/>
    <circle cx="${ppCX}" cy="${ppCY}" r="${ppR}" fill="#000" opacity="0.35"/>
    ${texts}
  </svg>`);
}

/** ▸ FOTO (welcome2): PNG composto (arte IA + foto perfil + tipografia). */
async function artCard(opts = {}) {
  const o = _defaults(opts);
  const Wp = 900, Hp = 420;
  const bg = await fundo(o, opts);
  const ppBuf = opts.profilePicUrl ? await _fetch(opts.profilePicUrl, opts).catch(() => null) : null;
  const pp = await _ppCircle(ppBuf, 172, o);
  const ring = overlaySvg(o, null);
  const out = await sharp(bg)
    .composite([
      { input: pp, left: 74, top: Math.round(Hp / 2 - 96) },
      { input: ring, left: 0, top: 0 },
    ])
    .png().toBuffer();
  return out;
}

/** ▸ GIF (welcm3): mp4 gifPlayback — pan, anel pulsante, chuva de faísca. */
async function artGif(opts = {}) {
  const o = _defaults(opts);
  const frames = Math.min(18, Math.max(8, opts.frames || 12));
  const bigW = Math.round(W * 1.14);             // 14% extra p/ pan
  const bgFull = await (async () => {
    const url = `${POLLI}/${encodeURIComponent(PROMPTS[o.kind] || PROMPTS.welcome)}?width=${bigW}&height=${H}&seed=${o.seed}&nologo=true`;
    const b = await _fetch(url, opts).catch(() => null);
    if (b && b.length > 3000) {
      try { return await sharp(b).resize(bigW, H, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer(); } catch {}
    }
    // fallback gradiente largo
    const svg = `<svg width="${bigW}" height="${H}"><defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0f"/><stop offset="0.55" stop-color="#141024"/>
      <stop offset="1" stop-color="${o.accent}" stop-opacity="0.55"/></linearGradient></defs>
      <rect width="${bigW}" height="${H}" fill="url(#g)"/></svg>`;
    return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
  })();
  const ppBuf = opts.profilePicUrl ? await _fetch(opts.profilePicUrl, opts).catch(() => null) : null;
  const pp = await _ppCircle(ppBuf, 172, o);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkart-'));
  try {
    const maxPan = bigW - W;
    for (let f = 0; f < frames; f++) {
      const t = f / frames;
      const pan = Math.round(maxPan * (0.5 - 0.5 * Math.cos(2 * Math.PI * t)));  // ida e volta suave
      const ringR = 96 + Math.round(8 * Math.sin(2 * Math.PI * t * 2));          // pulsa 2 vexes
      const sparkles = [];
      for (let k = 0; k < 7; k++) {
        const ph = (t + k / 7) % 1;
        sparkles.push({
          x: 40 + ((k * 131) % (W - 80)),
          y: Math.round(H - ph * H),
          r: 2.5 + (k % 3),
          a: (0.25 + 0.65 * Math.abs(Math.sin(k * 1.7 + ph * 6.28))).toFixed(2),
        });
      }
      const crop = await sharp(bgFull).extract({ left: pan, top: 0, width: W, height: H }).toBuffer();
      const frameBuf = await sharp(crop)
        .composite([
          { input: overlaySvg(o, { ringR, sparkles, panX: pan }), left: 0, top: 0 },
          { input: pp, left: 74, top: Math.round(H / 2 - 96) },
          { input: overlaySvg({ ...o, sub1: '', sub2: '' }, { ringR, sparkles: [], panX: 0 }), left: 0, top: 0 },
        ])
        .png().toBuffer();
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(2, '0')}.png`), frameBuf);
    }
    let ffmpeg = 'ffmpeg';
    try { ffmpeg = require('ffmpeg-static') || 'ffmpeg'; } catch {}
    if (process.env.FFMPEG_PATH) ffmpeg = process.env.FFMPEG_PATH;
    const out = path.join(dir, 'art.mp4');
    await execFileAsync(ffmpeg, [
      '-y', '-framerate', '6', '-i', path.join(dir, 'f%02d.png'),
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', out,
    ], { stdio: 'pipe', timeout: 240000 });
    return fs.readFileSync(out);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

// ══ RPG — persist o cartão do herói com o mesmo motor ════════════════
function cardOptsFromPlayer(p, jid, botName) {
  const bar = (a, m, n = 10) => '▰'.repeat(Math.round(Math.min(1, a / Math.max(1, m)) * n)) + '▱'.repeat(n - Math.round(Math.min(1, a / Math.max(1, m)) * n));
  const sub1 = `⭐ Nv.${p.level || 1} · ${String(p.race || 'humano').toUpperCase()} ${String(p.class || 'guerreiro').toUpperCase()}`;
  const sub2 = `❤️ ${p.hp ?? 0}/${p.maxHp ?? 100} · 🔮 ${p.mp ?? 0}/${p.maxMp ?? 80} · 💛 ${p.coins ?? 0} · 💓 ${p.lives ?? 3}`;
  return {
    name: p.name || 'Aventureiro', sub1, sub2,
    footer: `🕸️ ${botName} · DARK VILLE`, kind: 'hero', accent: '#8b00ff',
  };
}
async function heroCard(player, opts = {}) { return artCard({ ...cardOptsFromPlayer(player, opts.jid, opts.botName || 'DARK BOT'), ...opts }); }
async function heroGif(player, opts = {}) { return artGif({ ...cardOptsFromPlayer(player, opts.jid, opts.botName || 'DARK BOT'), ...opts }); }

module.exports = { artCard, artGif, heroCard, heroGif, PROMPTS };
