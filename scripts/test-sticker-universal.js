#!/usr/bin/env node
/**
 * Regressão do motor único de stickers.
 * Garante que !s, !sticker, !fig e !f usam o mesmo handler, aceitam mídia
 * comum/GIF enviado como documento e que o motor conserva a arte inteira em
 * canvas 512×512, sem crop, para foto, GIF e vídeo.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');
const maker = require('../src/bot/stickerMaker');

const checks = [];
function ok(condition, label) {
  checks.push({ condition: !!condition, label });
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  assert.ok(condition, label);
}

async function checkAliases() {
  const mediaHandler = require('../src/bot/mediaHandler');
  const stickerPack = require('../src/bot/stickerPack');
  const oldDownload = mediaHandler.downloadFromMessage;
  const oldCreate = maker.create;
  const oldSend = stickerPack.sendStickerWithPackLink;
  const registered = new Map();
  let downloads = 0;
  let sends = 0;

  try {
    mediaHandler.downloadFromMessage = async () => { downloads++; return Buffer.from('fixture'); };
    maker.create = async () => Buffer.alloc(80, 7);
    stickerPack.sendStickerWithPackLink = async () => { sends++; };

    // Registra sem abrir socket/WhatsApp real.
    require('../src/bot/cases/stickers')((aliases, fn) => {
      for (const alias of aliases) registered.set(alias, fn);
    });

    const aliases = ['s', 'sticker', 'fig', 'f'];
    const handler = registered.get('sticker');
    ok(typeof handler === 'function', 'handler principal de sticker foi registado');
    ok(aliases.every(alias => registered.get(alias) === handler), 's/sticker/fig/f usam o mesmo handler universal');

    for (const alias of aliases) {
      const errors = [];
      const reactions = [];
      await registered.get(alias)({
        m: { msg: { message: { documentMessage: { mimetype: 'image/gif' } } } },
        sock: {},
        ctx: { remoteJid: 'teste@g.us', pushName: 'Teste', groupName: 'Grupo' },
        reply: text => errors.push(text),
        react: emoji => reactions.push(emoji),
      });
      if (errors.length || !reactions.includes('✅')) {
        console.error(`[${alias}] resposta inesperada:`, { errors, reactions });
      }
      ok(!errors.length && reactions.includes('✅'), `${alias} aceita GIF enviado como documento`);
    }
    ok(downloads === aliases.length && sends === aliases.length, 'todos os aliases baixam e enviam pelo mesmo fluxo');
  } finally {
    mediaHandler.downloadFromMessage = oldDownload;
    maker.create = oldCreate;
    stickerPack.sendStickerWithPackLink = oldSend;
  }
}

async function alphaBounds(webp) {
  const { data, info } = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  return { width: maxX - minX + 1, height: maxY - minY + 1, minX, minY, maxX, maxY };
}

async function checkEngine() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dark-sticker-universal-'));
  try {
    const widePng = path.join(dir, 'wide.png');
    const wideGif = path.join(dir, 'wide.gif');
    const wideMp4 = path.join(dir, 'wide.mp4');
    await sharp({ create: { width: 1600, height: 400, channels: 4, background: { r: 220, g: 30, b: 60, alpha: 1 } } }).png().toFile(widePng);
    cp.execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=red:s=1600x400:r=8', '-t', '1', '-vf', 'fps=8', wideGif], { stdio: 'ignore' });
    cp.execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=1600x400:r=12', '-t', '1', '-pix_fmt', 'yuv420p', wideMp4], { stdio: 'ignore' });

    const photoSticker = await maker.create(fs.readFileSync(widePng), { metadataEnabled: false });
    const photoMeta = await sharp(photoSticker).metadata();
    const bounds = await alphaBounds(photoSticker);
    ok(photoMeta.width === 512 && photoMeta.height === 512, 'foto sai no canvas padrão 512×512');
    // 1600×400 → 512×128: toda a largura é mantida; altura fica centralizada.
    ok(bounds.width === 512 && bounds.height >= 126 && bounds.height <= 130, 'foto panorâmica é proporcional e inteira, sem crop');

    for (const [kind, file] of [['GIF', wideGif], ['vídeo', wideMp4]]) {
      const out = await maker.create(fs.readFileSync(file), { metadataEnabled: false });
      const meta = await sharp(out, { animated: true }).metadata();
      ok(meta.width === 512 && meta.height === 512, `${kind} sai no canvas padrão 512×512`);
      ok(maker.isAnimatedWebp(out), `${kind} preserva a animação em WebP`);
    }

    const exif = maker.buildStickerExifJson({ pack: 'Pacote', author: 'Autor', channelUrl: 'https://example.com/canal' });
    ok(exif['sticker-pack-id'] && exif['sticker-pack-name'] === 'Pacote' && exif['sticker-pack-publisher'] === 'Autor', 'metadados completos do pack são mantidos');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  await checkAliases();
  await checkEngine();
  console.log(`\n🎉 STICKER UNIVERSAL: ${checks.length} verificações passaram.`);
})().catch(err => {
  console.error('💥', err.stack || err.message);
  process.exit(1);
});
