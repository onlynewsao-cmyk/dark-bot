/**
 * StickerMaker — WebP 512×512 sem distorção.
 * O padrão é contain: preserva todos os píxeis da imagem original.
 * Cover/crop só pode ser pedido explicitamente; o fallback é FULL.
 * Quando a assinatura visível está ligada, a arte encaixa numa área própria
 * sem ser cortada, e não inclui nomes de remetente ou grupo.
 */

const { execSync, execFileSync } = require('child_process');
// v7.52 TURBO: ffmpeg assíncrono (o Sync parava todos os chats)
const execFileAsync = require('util').promisify(require('child_process').execFile);
let _Sticker, _StickerTypes;
function waSticker() {
  if (!_Sticker) {
    const m = require('wa-sticker-formatter');
    _Sticker = m.Sticker;
    _StickerTypes = m.StickerTypes;
  }
  return { Sticker: _Sticker, StickerTypes: _StickerTypes };
}
const crypto = require('crypto');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

/** ID estável: o mesmo seed dá SEMPRE o mesmo pack (WhatsApp agrupa). */
function makePackId(seed = '') {
  const base = String(seed || 'dark-net-default').replace(/\s+/g, ' ').trim().slice(0, 120);
  const h = crypto.createHash('md5')
    .update('darkbot-pack|' + base)
    .digest('hex')
    .slice(0, 16);
  return `com.darkbot.pack.${h}`;
}

/**
 * EXIF completo do WhatsApp.
 * android/ios-app-store-link = o que o "Ver pacote" abre
 * se a pessoa ainda não tiver o pack guardado.
 */
function safeHttpsUrl(value = '') {
  try {
    const u = new URL(String(value || '').trim());
    return u.protocol === 'https:' ? u.toString() : '';
  } catch { return ''; }
}

function storeUrlFor(value = '', platform = '') {
  const url = safeHttpsUrl(value);
  if (!url) return '';
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (platform === 'android' && [
      'play.google.com', 'amazon.com', 'www.amazon.com', 'apps.samsung.com', 'galaxystore.samsung.com',
      'appgallery.huawei.com', 'consumer.huawei.com', 'f-droid.org', 'www.f-droid.org',
      'apkpure.com', 'www.apkpure.com', 'uptodown.com', 'www.uptodown.com', 'apps.microsoft.com',
    ].includes(host)) return url;
    if (platform === 'ios' && ['apps.apple.com', 'itunes.apple.com', 'testflight.apple.com'].includes(host)) return url;
  } catch {}
  return '';
}

/**
 * Links de canal/website são metadados de publisher, não links de loja.
 * Só os links de lojas reconhecidas vão para android/ios-app-store-link.
 */
function buildStickerExifJson({ packId, pack, author, url, channelUrl, publisherWebsite, androidStoreUrl, iosStoreUrl, storeUrl, emojis } = {}) {
  const website = safeHttpsUrl(publisherWebsite || channelUrl || url);
  const androidStore = storeUrlFor(androidStoreUrl || storeUrl, 'android');
  const iosStore = storeUrlFor(iosStoreUrl || storeUrl, 'ios');
  const brand = String(author || 'Dark Net Ao').split('\n')[0].slice(0, 128);
  const packName = String(pack || 'Dark Net Ao').slice(0, 128);
  return {
    'sticker-pack-id': packId || makePackId(packName || website || 'dark-net-ao'),
    'sticker-pack-name': packName,
    'sticker-pack-publisher': brand,
    'android-app-store-link': androidStore,
    'ios-app-store-link': iosStore,
    'android-play-store-link': androidStore,
    'sticker-pack-publisher-website': website,
    'publisher-website': website,
    emojis: Array.isArray(emojis) && emojis.length ? emojis : ['✨'],
  };
}

async function writeStickerExif(webpBuf, meta = {}) {
  if (!webpBuf || !webpBuf.length) return webpBuf;
  const json = JSON.stringify(buildStickerExifJson(meta));
  const exif = Buffer.concat([
    Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]),
    Buffer.from(json, 'utf-8'),
  ]);
  exif.writeUIntLE(Buffer.byteLength(json), 14, 4);
  try {
    const { Image } = require('node-webpmux');
    const img = new Image();
    await img.load(webpBuf);
    img.exif = exif;
    const out = await img.save(null);
    return out && out.length > 50 ? out : webpBuf;
  } catch {
    return webpBuf;
  }
}

/* ─── ffmpeg disponível? ──────────────────────────────────────── */
function getFfmpegBin() {
  try { return require('ffmpeg-static') || 'ffmpeg'; } catch { return 'ffmpeg'; }
}
function hasFfmpeg() {
  try { execSync(`"${getFfmpegBin()}" -version`, { stdio: 'ignore', shell: true }); return true; } catch { return false; }
}
const FFMPEG_BIN = getFfmpegBin();
const FFMPEG_OK = hasFfmpeg();

/* ─── Detecta tipo pelo magic bytes ──────────────────────────── */
function detectMime(buffer) {
  if (!buffer || buffer.length < 12) return 'image/jpeg';
  const h = buffer.slice(0, 12);
  if (h[0] === 0x89 && h[1] === 0x50)                                            return 'image/png';
  if (h[0] === 0xFF && h[1] === 0xD8)                                            return 'image/jpeg';
  if (h.slice(0,4).toString()==='RIFF' && h.slice(8,12).toString()==='WEBP')     return 'image/webp';
  if (h.slice(0,6).toString()==='GIF89a' || h.slice(0,6).toString()==='GIF87a') return 'image/gif';
  if (h.slice(4,8).toString() === 'ftyp')                                         return 'video/mp4';
  if (h[0] === 0x1A && h[1] === 0x45)                                            return 'video/webm';
  if (h.slice(0,4).toString() === 'RIFF')                                        return 'video/avi';
  return 'image/jpeg';
}


function escapeXml(s = '') {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
}

function watermarkSvg(options = {}) {
  const opts = typeof options === 'string' ? { brand: options } : (options || {});
  const brand = escapeXml(String(opts.brand || 'Dark Net Ao').trim().slice(0, 48));
  const channel = escapeXml(String(opts.channelName || '').trim().slice(0, 56));
  const slogan = escapeXml(String(opts.slogan || '').trim().slice(0, 64));
  const includeLink = opts.includeLink === true;
  const link = includeLink ? escapeXml(String(opts.channelUrl || '').replace(/^https?:\/\//i, '').slice(0, 48)) : '';
  const clean = String(opts.theme || 'darktoxic').toLowerCase() === 'clean';
  const accent = clean ? '#ffffff' : '#a3e635';
  const second = clean ? '#b8c0cc' : '#a855f7';
  const subtitle = channel || (includeLink ? link : '') || 'STICKER PACK';
  const small = slogan || (includeLink && channel ? link : '');
  return Buffer.from(`<svg width="512" height="96" viewBox="0 0 512 96" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#090b10"/><stop offset="1" stop-color="#15101f"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="512" height="96" rx="16" fill="url(#bg)"/>
    <path d="M16 2H496" stroke="${accent}" stroke-width="3" opacity=".92" filter="url(#glow)"/>
    <circle cx="42" cy="48" r="18" fill="none" stroke="${second}" stroke-width="2"/>
    <path d="M33 48h18M42 39v18" stroke="${accent}" stroke-width="2"/>
    <text x="72" y="39" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="900" fill="#fff">${brand}</text>
    <text x="72" y="61" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="${accent}">${subtitle}</text>
    <text x="72" y="81" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="600" fill="${second}">${small}</text>
    <text x="482" y="59" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="${second}">DARKTOXIC</text>
  </svg>`);
}

/* ─── WebP animado? (sticker.ly serve os animados em .webp) ─────── */
/* VP8X: byte 20 = flags, bit 0x02 = animação. Fallback: chunks ANIM/ANMF. */
function isAnimatedWebp(buffer) {
  try {
    if (!buffer || buffer.length < 24) return false;
    if (buffer.slice(0, 4).toString() !== 'RIFF') return false;
    if (buffer.slice(8, 12).toString() !== 'WEBP') return false;
    if (buffer.slice(12, 16).toString() === 'VP8X' && (buffer[20] & 0x02)) return true;
    const head = buffer.slice(0, Math.min(buffer.length, 128 * 1024)).toString('latin1');
    return head.includes('ANMF') || head.includes('ANIM');
  } catch { return false; }
}

/* ─── GIF animado → WebP 512×512; contain por padrão (via sharp) ─ */
// v7.77: escada de qualidade — o WhatsApp rejeita animado >500KB e os
// .webp do sticker.ly chegam pesados (saíam com 700KB+). Baixa até caber.
// effort:1 = metade do tempo de encode (1468→~700ms) com tamanho igual.
async function gifToWebpSquare(buffer, fit = 'contain', signatureOptions = null) {
  const sharp = require('sharp');
  // v7.94: ANIMAÇÃO COMPLETA — o corte de 24 frames engolava o resto dos
  // segundos. Agora mantemos os frames TODOS (tecto generoso 200 ≈ 20s) e
  // a escada de qualidade adapta-se ao nº de frames: quanto maior a anim,
  // menos passos = encode tão rápido como antes. Nunca mexe na duração.
  let pages = undefined, qs = [70, 45, 25];
  try {
    const meta = await sharp(buffer, { animated: true }).metadata();
    const np = meta.pages || 1;
    if (np > 200) pages = 200;           // tecto generoso (~20s)
    if (np > 90) qs = [22];              // anim longa: 1 passo só (encode rápido, tamanho por baixo)
    else if (np > 45) qs = [50, 28, 12];
  } catch {}
  let last = null;
  for (const q of qs) {
    // sharp com animated:true processa todos os frames. O padrão é contain:
    // toda a imagem fica visível; os espaços restantes são transparentes.
    const signed = !!signatureOptions;
    const imageHeight = signed ? 416 : 512;
    let pipeline = sharp(buffer, { animated: true, ...(pages ? { pages } : {}) })
      .resize(512, imageHeight, {
        fit: fit === 'cover' ? 'cover' : 'contain',
        position: 'centre',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: false,
      });
    if (signed) {
      pipeline = pipeline.extend({ top: 0, bottom: 96, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([{ input: watermarkSvg(signatureOptions), left: 0, top: 416 }]);
    }
    last = await pipeline.webp({
        quality: q,
        effort: 1,
        lossless: false,
        loop: 0,        // loop infinito
        delay: [],      // mantém delays originais dos frames
      })
      .toBuffer();
    if (last.length <= 470 * 1024) return last; // margem p/ o exif
  }
  return last;
}

/* ─── Vídeo MP4/WebM → WebP 512×512 contain (via ffmpeg) ────── */
async function videoToWebpSquare(inputBuf, maxSec = Number(process.env.STICKER_VIDEO_MAX_SEC || 30), fit = 'contain') { // preserve full frame by default
  const tmp     = path.join(os.tmpdir(), `stk_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const inFile  = `${tmp}.in`;
  const outFile = `${tmp}.webp`;

  try {
    fs.writeFileSync(inFile, inputBuf);

    /*
     * FILTRO CORRECTO para sticker quadrado SEM artefactos:
     * maxSec aumentado para 13 segundos conforme solicitado.
     */
    await execFileAsync(FFMPEG_BIN, [
      '-y',
      '-t', String(maxSec),
      '-i', inFile,
      '-vf', [
        fit === 'cover'
          ? 'scale=w=512:h=512:force_original_aspect_ratio=increase,crop=512:512'
          : 'scale=w=512:h=512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        'fps=10',
        'format=rgba',
      ].join(','),
      '-vcodec',            'libwebp_anim',
      '-lossless',          '0',
      '-quality',           '58',
      '-compression_level', '3',
      '-loop',              '0',
      '-vsync',             'vfr',
      '-an',
      outFile,
    ], { timeout: 90000, stdio: 'ignore' });

    const result = fs.readFileSync(outFile);
    if (!result || result.length < 200) throw new Error('WebP vazio');
    return result;

  } finally {
    try { fs.unlinkSync(inFile);  } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

/* ─── Imagem estática → WebP 512×512 contain (via sharp) ─────── */
async function imageToWebpSquare(buffer, fit = 'contain', signatureOptions = null) {
  const sharp = require('sharp');
  const signed = !!signatureOptions;
  const imageHeight = signed ? 416 : 512;
  let img = sharp(buffer)
    .resize(512, imageHeight, {
      fit: fit === 'cover' ? 'cover' : 'contain',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    });
  if (signed) {
    const art = await img.png().toBuffer();
    return sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: art, left: 0, top: 0 }, { input: watermarkSvg(signatureOptions), left: 0, top: 416 }])
      .webp({ quality: 88, lossless: false }).toBuffer();
  }
  return img.webp({ quality: 88, lossless: false }).toBuffer();
}

/* ─── Injeta metadados via Sticker (pack/author) ─────────────── */
function packStickerOpts(pack, author, packId, type, quality = 100) {
  const { StickerTypes } = waSticker();
  type = type || StickerTypes.FULL;
  return {
    pack,
    author,
    type,
    quality,
    id: packId || `darkbot-${Date.now()}`,
    categories: ['✨'],
  };
}

async function injectMeta(webpBuf, pack, author, packId, packUrl = '', extra = {}) {
  const id = packId || makePackId(pack || packUrl || 'Dark Net Ao');
  const meta = {
    packId: id, pack, author,
    url: packUrl,
    channelUrl: extra.channelUrl || packUrl,
    publisherWebsite: extra.publisherWebsite || extra.channelUrl || packUrl,
    androidStoreUrl: extra.androidStoreUrl || '',
    iosStoreUrl: extra.iosStoreUrl || '',
  };
  const written = await writeStickerExif(webpBuf, meta);
  if (written && written !== webpBuf && written.length > 50) return written;
  const { Sticker, StickerTypes } = waSticker();
  const stk = new Sticker(webpBuf, packStickerOpts(pack, author, id, StickerTypes.FULL, 100));
  const fallback = await stk.toBuffer();
  return writeStickerExif(fallback, meta);
}

async function finalizeSticker(webpBuf, pack, author, packId, packUrl, exifOptions, enabled = true) {
  if (!enabled) return webpBuf;
  return injectMeta(webpBuf, pack, author, packId, packUrl, exifOptions);
}

/**
 * Renomeia o pack/author de um sticker JÁ PRONTO (webp) sem re-encodar.
 * Escreve só os metadados EXIF → preserva animação, qualidade e frames.
 * Funciona com qualquer sticker: estático ou animado, de quem quer que seja.
 * @param {Buffer} webpBuf  sticker original (webp)
 * @param {{packName?:string, authorName?:string, packUrl?:string}} opts
 */
async function renameMeta(webpBuf, { packName = '', authorName = '', packUrl = '', channelUrl = '', androidStoreUrl = '', iosStoreUrl = '' } = {}) {
  if (!webpBuf || webpBuf.length < 100) throw new Error('sticker inválido');
  const pack = String(packName || 'Dark Net Ao').trim().slice(0, 128);
  const author = String(authorName || 'Dark Net Ao').trim().slice(0, 128);
  const url = String(packUrl || channelUrl || '').trim();
  const id = makePackId((url || '') + '|' + pack);
  const out = await injectMeta(webpBuf, pack, author, id, url, { channelUrl, androidStoreUrl, iosStoreUrl });
  if (out && out.length > 50) return out;
  throw new Error('não consegui renomear o sticker');
}

/* ─── API PÚBLICA ─────────────────────────────────────────────── */
/**
 * Cria sticker WhatsApp 512x512 quadrado.
 *
 * @param {Buffer} buffer     - imagem, vídeo ou GIF
 * @param {object} opts
 * @param {string} opts.botName
 * @param {string} opts.ownerName
 * @param {string} opts.userName
 * @param {string} opts.groupName
 * @param {boolean} opts.isVideo  - true se for vídeo/GIF
 */
async function create(buffer, rawOpts = {}) {
  // A imagem inteira é o padrão. Cortar é sempre uma escolha explícita.
  const fit = String(rawOpts?.fit || '').toLowerCase();
  if (fit === 'cover' || rawOpts?.crop === true) return createCover(buffer, rawOpts);
  return createFull(buffer, rawOpts);
}

async function createCover(buffer, rawOpts = {}) {
  let opts = rawOpts;
  try { opts = await require('./stickerWm').apply(rawOpts); } catch {}
  const { isVideo, packName = '', authorName = '', brand = 'Dark Net Ao', channelName = '', slogan = '', watermarkText = '', visibleWatermark = false, metadataEnabled = true, packId = null, packUrl = '', channelUrl = '', publisherWebsite = '', androidStoreUrl = '', iosStoreUrl = '', theme = 'darktoxic', includeLinkInSticker = false } = opts;
  const pack = packName || channelName || brand || 'Dark Net Ao';
  const author = brand || authorName || 'Dark Net Ao';
  const idPack = packId || makePackId((channelUrl || packUrl || brand) + '|' + pack);
  const urlPack = packUrl || channelUrl || '';
  const exifOptions = { channelUrl, publisherWebsite, androidStoreUrl, iosStoreUrl };
  const signatureOptions = visibleWatermark ? { brand: watermarkText || brand, channelName, channelUrl, slogan, theme, includeLink: includeLinkInSticker } : null;
  const { Sticker, StickerTypes } = waSticker();

  const mime   = detectMime(buffer);
  const isGif  = mime === 'image/gif';
  // v7.77: webp animado (sticker.ly) ia ao ramo ESTÁTICO e saía foto.
  const isAnimWebp = mime === 'image/webp' && isAnimatedWebp(buffer);
  const isVid  = isVideo || mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/avi';
  // v7.50: isVideo MENTIROSO (imagem com isVideo:true) entrava no pipeline de
  // vídeo e rebentava NATIVO (free(): invalid size) — mata o processo todo sem
  // catch possível (!brat2). Só vídeo REAL vai ao ffmpeg.
  const videoReal = mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/avi';
  // v7.50: webp já animado — só injeta meta (re-encodar achataria a animação).
  if (opts.preAnimated) {
    if (!signatureOptions) return finalizeSticker(buffer, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
    const signed = await gifToWebpSquare(buffer, 'cover', signatureOptions);
    return finalizeSticker(signed, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
  }

  /* ── GIF / WebP animado (sharp animated — sem ffmpeg, sem artefactos) ── */
  if (isGif || isAnimWebp) {
    try {
      const webpAnim = await gifToWebpSquare(buffer, 'cover', signatureOptions);
      const out = await finalizeSticker(webpAnim, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
      if (out && out.length > 200) return out;
    } catch (e) {
      // sharp falhou com este GIF → fallback
    }

    // Fallback: wa-sticker-formatter CROPPED (cover, não contain)
    try {
      const raw = await new Sticker(buffer, packStickerOpts(metadataEnabled ? pack : '', metadataEnabled ? author : '', metadataEnabled ? idPack : '', StickerTypes.CROPPED, 80)).toBuffer();
      return finalizeSticker(raw, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
    } catch (e2) {
      throw new Error('Sticker GIF falhou: ' + e2.message);
    }
  }

  /* ── Vídeo MP4/WebM (precisa de ffmpeg para converter) ── */
  if (isVid && videoReal) {
    if (FFMPEG_OK) {
      try {
        const webpAnim = await videoToWebpSquare(buffer, undefined, 'cover');
        const out = await finalizeSticker(webpAnim, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
        if (out && out.length > 200) return out;
      } catch (e) {
        // ffmpeg falhou → fallback
      }
    }

    // Fallback: wa-sticker-formatter CROPPED
    // (o wa-sticker-formatter usa ffmpeg internamente para converter MP4→GIF→WebP)
    try {
      const raw = await new Sticker(buffer, packStickerOpts(metadataEnabled ? pack : '', metadataEnabled ? author : '', metadataEnabled ? idPack : '', StickerTypes.CROPPED, 80)).toBuffer();
      return finalizeSticker(raw, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
    } catch (e2) {
      throw new Error('Sticker vídeo falhou: ' + e2.message);
    }
  }

  /* ── Imagem estática (JPEG, PNG, WebP) ── */
  try {
    const webp = await imageToWebpSquare(buffer, 'cover', signatureOptions);
    const out  = await finalizeSticker(webp, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
    if (out && out.length > 200) return out;
    throw new Error('output vazio');
  } catch (e) {
    // Fallback CROPPED para imagens também
    try {
      const raw = await new Sticker(buffer, packStickerOpts(metadataEnabled ? pack : '', metadataEnabled ? author : '', metadataEnabled ? idPack : '', StickerTypes.CROPPED, 85)).toBuffer();
      return finalizeSticker(raw, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
    } catch (e2) {
      throw new Error('Sticker imagem falhou: ' + e2.message);
    }
  }
}


/* ─── SFull: mantém a imagem/vídeo inteiro no sticker (contain + fundo transparente) ─── */
async function imageToWebpFull(buffer, signatureOptions = null) {
  return imageToWebpSquare(buffer, 'contain', signatureOptions);
}

async function videoToWebpFull(inputBuf, maxSec = Number(process.env.STICKER_VIDEO_MAX_SEC || 30), signatureOptions = null) {
  const tmp = path.join(os.tmpdir(), `stkfull_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const inFile = `${tmp}.in`;
  const outFile = `${tmp}.webp`;
  const signatureFile = `${tmp}.svg`;
  try {
    fs.writeFileSync(inFile, inputBuf);
    const args = ['-y', '-t', String(maxSec), '-i', inFile];
    if (signatureOptions) {
      fs.writeFileSync(signatureFile, watermarkSvg(signatureOptions));
      args.push(
        '-loop', '1', '-i', signatureFile,
        '-filter_complex', [
          '[0:v]scale=512:416:force_original_aspect_ratio=decrease,' +
            'pad=512:512:(ow-iw)/2:(416-ih)/2:color=0x00000000[base]',
          '[1:v]format=rgba[signature]',
          '[base][signature]overlay=0:416:shortest=1,fps=10,format=rgba[out]',
        ].join(';'),
        '-map', '[out]', '-shortest',
      );
    } else {
      args.push('-vf', [
        'scale=w=512:h=512:force_original_aspect_ratio=decrease',
        'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        'fps=10',
        'format=rgba',
      ].join(','));
    }
    args.push(
      '-vcodec', 'libwebp_anim',
      '-lossless', '0', '-quality', '72', '-compression_level', '3',
      '-loop', '0', '-vsync', 'vfr', '-an', outFile,
    );
    await execFileAsync(FFMPEG_BIN, args, { timeout: 90000, stdio: 'ignore' });
    const result = fs.readFileSync(outFile);
    if (!result || result.length < 200) throw new Error('WebP vazio');
    return result;
  } finally {
    try { fs.unlinkSync(inFile); } catch {}
    try { fs.unlinkSync(outFile); } catch {}
    try { fs.unlinkSync(signatureFile); } catch {}
  }
}

async function createFull(buffer, rawOpts = {}) {
  let opts = rawOpts;
  try { opts = await require('./stickerWm').apply(rawOpts); } catch {}
  const {
    packName = '', authorName = '', brand = 'Dark Net Ao', channelName = '', slogan = '',
    watermarkText = '', visibleWatermark = false, metadataEnabled = true, packId, packUrl = '', channelUrl = '',
    publisherWebsite = '', androidStoreUrl = '', iosStoreUrl = '', theme = 'darktoxic',
    includeLinkInSticker = false, preAnimated = false,
  } = opts;
  const pack = packName || channelName || brand || 'Dark Net Ao';
  // A autoria da marca é estável; não revela o remetente nem o nome do grupo.
  const author = brand || authorName || 'Dark Net Ao';
  const urlPack = packUrl || channelUrl || '';
  const idPack = packId || makePackId(`${channelUrl || urlPack || brand}|${pack}`);
  const exifOptions = { channelUrl, publisherWebsite, androidStoreUrl, iosStoreUrl };
  const signatureOptions = visibleWatermark
    ? { brand: watermarkText || brand, channelName, channelUrl, slogan, theme, includeLink: includeLinkInSticker }
    : null;
  const { Sticker, StickerTypes } = waSticker();
  const mime = detectMime(buffer);
  const isGif = mime === 'image/gif';
  const isAnimWebp = mime === 'image/webp' && isAnimatedWebp(buffer);
  const videoReal = mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/avi';
  const isVid = videoReal;

  // Brat2 e outros já entregam WebP animado 512×512: só reescreve o EXIF
  // para não perder qualidade/duração. Imagens fora da medida passam ao fit.
  if (preAnimated && mime === 'image/webp' && !signatureOptions) {
    try {
      const meta = await require('sharp')(buffer, { animated: isAnimWebp }).metadata();
      if (meta.width === 512 && meta.height === 512) {
        return finalizeSticker(buffer, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
      }
    } catch {}
  }

  // GIF/WebP animado: reamostrar todos os frames, sem cortar a arte.
  if (isGif || isAnimWebp) {
    try {
      const webp = await gifToWebpSquare(buffer, 'contain', signatureOptions);
      if (webp && webp.length > 200) return finalizeSticker(webp, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
    } catch (e) {
      console.warn('[stickerMaker] animated contain:', String(e.message || e).slice(0, 100));
    }
  }

  // Vídeo real: scale-to-fit + padding transparente (sem crop e sem áudio).
  if (isVid && FFMPEG_OK) {
    try {
      const webp = await videoToWebpFull(buffer, undefined, signatureOptions);
      if (webp && webp.length > 200) return finalizeSticker(webp, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
    } catch (e) {
      console.warn('[stickerMaker] video contain:', String(e.message || e).slice(0, 100));
    }
  }

  // Imagem estática (ou fallback full para um vídeo não convertido).
  try {
    const webp = await imageToWebpFull(buffer, signatureOptions);
    if (webp && webp.length > 200) return finalizeSticker(webp, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
  } catch (e) {
    console.warn('[stickerMaker] image contain:', String(e.message || e).slice(0, 100));
  }

  // Fallback FULL: nunca volta para CROPPED. Mantém a imagem completa.
  const raw = await new Sticker(buffer, packStickerOpts(metadataEnabled ? pack : '', metadataEnabled ? author : '', metadataEnabled ? idPack : '', StickerTypes.FULL, 90)).toBuffer();
  return finalizeSticker(raw, pack, author, idPack, urlPack, exifOptions, metadataEnabled);
}

/** Regrava pack/author/id no WebP já pronto (ex: pack + definestickwm). */
async function stampPack(stickers, { pack, author = 'Dark Net Ao', packId, packUrl = '', channelUrl = '', publisherWebsite = '', androidStoreUrl = '', iosStoreUrl = '', metadataEnabled = true } = {}) {
  const validStickers = (stickers || []).filter(buf => buf && buf.length);
  if (!metadataEnabled) return validStickers;
  const extra = { channelUrl, publisherWebsite, androidStoreUrl, iosStoreUrl };
  const out = [];
  for (const buf of stickers || []) {
    if (!buf || !buf.length) continue;
    try {
      const next = await injectMeta(buf, pack, author, packId, packUrl || channelUrl, extra);
      out.push(next && next.length > 50 ? next : buf);
    } catch {
      out.push(buf);
    }
  }
  return out;
}

module.exports = {
  create,
  createFull,
  detectMime,
  isAnimatedWebp, // v7.77
  FFMPEG_OK,
  makePackId,
  injectMeta,
  renameMeta,
  stampPack,
  packStickerOpts,
  buildStickerExifJson,
  writeStickerExif,
  watermarkSvg,
};

