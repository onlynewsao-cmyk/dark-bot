/**
 * Envio nativo de packs de figurinhas pelo protocolo WhatsApp.
 *
 * O Baileys oficial expõe StickerPackMessage no WAProto, mas ainda não
 * implementa o uploader desse tipo de mídia. Este módulo completa apenas
 * essa lacuna de protocolo usando os mesmos primitives públicos do socket:
 *
 *   - ZIP com os WebP e o ícone da bandeja;
 *   - cifragem "WhatsApp Sticker Pack Keys";
 *   - upload /mms/sticker-pack e thumbnail correspondente;
 *   - relay de Message.stickerPackMessage.
 *
 * Não depende de forks nem altera node_modules. Se qualquer etapa falhar,
 * o chamador deve enviar as figurinhas individualmente como fallback.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const MAX_STICKERS = 30;
const MIN_STICKERS = 3;
const MAX_PACK_BYTES = 16 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 45_000;

let _crcTable;
function crc32(buf) {
  if (!_crcTable) {
    _crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let bit = 0; bit < 8; bit++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      _crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = _crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function u16(value) {
  const out = Buffer.allocUnsafe(2);
  out.writeUInt16LE(value >>> 0, 0);
  return out;
}

function u32(value) {
  const out = Buffer.allocUnsafe(4);
  out.writeUInt32LE(value >>> 0, 0);
  return out;
}

/**
 * ZIP sem compressão e sem paths externos. É suficiente para WebP (que já é
 * comprimido), evita adicionar um arquivador só para um pequeno payload e
 * preserva os bytes exactos dos stickers.
 */
function makeStoredZip(entries = []) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const item of entries) {
    const name = String(item?.name || '');
    const data = Buffer.isBuffer(item?.data) ? item.data : Buffer.from(item?.data || '');
    if (!/^[A-Za-z0-9._%=-]{1,180}$/.test(name) || name.includes('..')) {
      throw new Error('nome de ficheiro inválido no pack');
    }
    if (!data.length) throw new Error('ficheiro vazio no pack');
    if (data.length > MAX_PACK_BYTES) throw new Error('ficheiro excede o limite do pack');
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(data);

    const localHeader = Buffer.concat([
      u32(0x04034B50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes,
    ]);
    localParts.push(localHeader, data);

    const centralHeader = Buffer.concat([
      u32(0x02014B50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const eocd = Buffer.concat([
    u32(0x06054B50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return Buffer.concat([...localParts, central, eocd]);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

function encodedHashName(index, data) {
  // O WhatsApp usa nomes estáveis associados ao hash do conteúdo. encodeURIComponent
  // preserva a convenção vista em packs recebidos (%2F, %2B e %3D).
  const hash = encodeURIComponent(sha256(data).toString('base64'));
  return `${String(index).padStart(2, '0')}_${hash}.webp`;
}

function isAnimatedWebp(buffer) {
  // WEBP animado contém o chunk ANIM; não decodificamos o ficheiro inteiro.
  return Buffer.isBuffer(buffer) && buffer.length > 16 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.includes(Buffer.from('ANIM'));
}

function cleanText(value, fallback, max = 120) {
  const text = String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, max);
}

function cleanPackId(value) {
  const id = String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (id) return id.slice(0, 180);
  return `com.darkbot.pack.${crypto.randomUUID()}`;
}

async function createTrayIcon(firstSticker) {
  let sharp;
  try { sharp = require('sharp'); } catch { throw new Error('sharp é necessário para o ícone do pack'); }
  try {
    // PNG de 252px é a miniatura esperada pelo StickerPackMessage. palette reduz
    // bastante o upload sem introduzir JPEG/artefactos em transparências.
    const png = await sharp(firstSticker, { animated: false, failOn: 'none' })
      .resize(252, 252, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true, quality: 85 })
      .toBuffer();
    if (!png.length) throw new Error('ícone vazio');
    return png;
  } catch (error) {
    throw new Error(`não consegui criar a miniatura do pack: ${String(error.message || error).slice(0, 120)}`);
  }
}

/** Regista os dois media types em memória, sem modificar a instalação do Baileys. */
function installPackMediaTypes(baileys) {
  const types = {
    'sticker-pack': ['Sticker Pack', '/mms/sticker-pack'],
    'thumbnail-sticker-pack': ['Sticker Pack Thumbnail', '/mms/thumbnail-sticker-pack'],
  };
  for (const [type, [hkdfName, endpoint]] of Object.entries(types)) {
    if (!baileys.MEDIA_HKDF_KEY_MAPPING?.[type]) baileys.MEDIA_HKDF_KEY_MAPPING[type] = hkdfName;
    if (!baileys.MEDIA_PATH_MAP?.[type]) baileys.MEDIA_PATH_MAP[type] = endpoint;
  }
}

/** Cifra um buffer com o mesmo esquema CBC+HMAC usado nas mídias WhatsApp. */
function encryptWithMediaKey(data, mediaKey, hkdfLabel) {
  const expanded = crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(0), Buffer.from(`WhatsApp ${hkdfLabel} Keys`), 112);
  const expandedBuffer = Buffer.from(expanded);
  const iv = expandedBuffer.subarray(0, 16);
  const cipherKey = expandedBuffer.subarray(16, 48);
  const macKey = expandedBuffer.subarray(48, 80);
  const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const mac = crypto.createHmac('sha256', macKey).update(iv).update(ciphertext).digest().subarray(0, 10);
  const encrypted = Buffer.concat([ciphertext, mac]);
  return {
    mediaKey,
    encrypted,
    fileSha256: sha256(data),
    fileEncSha256: sha256(encrypted),
    fileLength: data.length,
  };
}

async function uploadEncrypted(sock, encrypted, mediaType) {
  if (!sock?.waUploadToServer) throw new Error('socket não tem uploader de mídia');
  const temp = path.join(os.tmpdir(), `dark-sticker-pack-${crypto.randomUUID()}.enc`);
  try {
    await fs.writeFile(temp, encrypted.encrypted, { mode: 0o600 });
    const result = await sock.waUploadToServer(temp, {
      mediaType,
      fileEncSha256B64: encrypted.fileEncSha256.toString('base64'),
      timeoutMs: UPLOAD_TIMEOUT_MS,
    });
    if (!result?.directPath) throw new Error(`upload ${mediaType} não devolveu directPath`);
    return result;
  } finally {
    await fs.unlink(temp).catch(() => {});
  }
}

/**
 * Constrói o ZIP e todos os campos que serão enviados no StickerPackMessage.
 * Exportado para regressão offline; não faz upload nem envia mensagens.
 */
async function buildNativeStickerPack(stickers, options = {}) {
  const list = (stickers || []).filter((item) => Buffer.isBuffer(item) && item.length > 50).slice(0, MAX_STICKERS);
  if (list.length < MIN_STICKERS) throw new Error(`um pack nativo precisa de ${MIN_STICKERS} a ${MAX_STICKERS} figurinhas`);

  const packId = cleanPackId(options.packId);
  const trayIcon = await createTrayIcon(list[0]);
  const trayFileName = `${encodeURIComponent(packId).replace(/%/g, '_')}.png`.slice(0, 180);
  const stickerEntries = list.map((sticker, index) => ({
    name: encodedHashName(index, sticker),
    data: sticker,
    isAnimated: isAnimatedWebp(sticker),
  }));
  const zip = makeStoredZip([
    ...stickerEntries.map(({ name, data }) => ({ name, data })),
    { name: trayFileName, data: trayIcon },
  ]);
  if (zip.length > MAX_PACK_BYTES) throw new Error('pack nativo demasiado grande (máximo 16 MB)');

  const mediaKey = crypto.randomBytes(32);
  const packMedia = encryptWithMediaKey(zip, mediaKey, 'Sticker Pack');
  const thumbnailMedia = encryptWithMediaKey(trayIcon, mediaKey, 'Sticker Pack Thumbnail');
  const name = cleanText(options.name, 'Dark Net Ao', 80);
  const publisher = cleanText(options.publisher, 'Dark Net Ao', 80);
  const description = cleanText(options.description, '', 500);

  return {
    zip,
    trayIcon,
    packId,
    name,
    publisher,
    description,
    trayFileName,
    stickerEntries,
    packMedia,
    thumbnailMedia,
  };
}

async function sendNativeStickerPack(sock, jid, stickers, options = {}) {
  if (!sock || !jid) throw new Error('destino inválido para pack nativo');
  const baileys = require('baileys-v6');
  installPackMediaTypes(baileys);
  const built = await buildNativeStickerPack(stickers, options);

  const packUpload = await uploadEncrypted(sock, built.packMedia, 'sticker-pack');
  const thumbnailUpload = await uploadEncrypted(sock, built.thumbnailMedia, 'thumbnail-sticker-pack');
  const stickerPackMessage = baileys.proto.Message.StickerPackMessage.fromObject({
    stickerPackId: built.packId,
    name: built.name,
    publisher: built.publisher,
    stickers: built.stickerEntries.map((entry) => ({
      fileName: entry.name,
      isAnimated: entry.isAnimated,
      emojis: ['✨'],
      accessibilityLabel: '',
      isLottie: false,
      mimetype: 'image/webp',
    })),
    fileLength: built.packMedia.fileLength,
    fileSha256: built.packMedia.fileSha256,
    fileEncSha256: built.packMedia.fileEncSha256,
    mediaKey: built.packMedia.mediaKey,
    directPath: packUpload.directPath,
    packDescription: built.description,
    mediaKeyTimestamp: Math.floor(Date.now() / 1000),
    trayIconFileName: built.trayFileName,
    thumbnailDirectPath: thumbnailUpload.directPath,
    thumbnailSha256: built.thumbnailMedia.fileSha256,
    thumbnailEncSha256: built.thumbnailMedia.fileEncSha256,
    thumbnailHeight: 252,
    thumbnailWidth: 252,
    stickerPackSize: built.zip.length,
    stickerPackOrigin: baileys.proto.Message.StickerPackMessage.StickerPackOrigin.USER_CREATED,
  });

  const message = baileys.generateWAMessageFromContent(jid, { stickerPackMessage }, {
    userJid: sock.user?.id,
    quoted: options.quoted,
  });
  await sock.relayMessage(jid, message.message, { messageId: message.key.id });
  return { ok: true, messageId: message.key.id, pack: built, stickerPackMessage };
}

module.exports = {
  MAX_STICKERS,
  MIN_STICKERS,
  MAX_PACK_BYTES,
  crc32,
  makeStoredZip,
  isAnimatedWebp,
  installPackMediaTypes,
  encryptWithMediaKey,
  buildNativeStickerPack,
  sendNativeStickerPack,
};
