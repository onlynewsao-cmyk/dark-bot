#!/usr/bin/env node
/** Regressão offline do card nativo "Ver pacote". */
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs/promises');
const sharp = require('sharp');
const native = require('../src/bot/nativeStickerPack');
const packs = require('../src/bot/stickerPack');

function decrypt(encrypted, mediaKey, label) {
  const expanded = Buffer.from(crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(0), Buffer.from(`WhatsApp ${label} Keys`), 112));
  const iv = expanded.subarray(0, 16);
  const cipherKey = expanded.subarray(16, 48);
  const macKey = expanded.subarray(48, 80);
  const data = encrypted.subarray(0, -10);
  const mac = encrypted.subarray(-10);
  const expected = crypto.createHmac('sha256', macKey).update(iv).update(data).digest().subarray(0, 10);
  assert.deepStrictEqual(mac, expected, 'MAC de mídia deve validar');
  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

function zipNames(zip) {
  const out = [];
  let i = 0;
  while (i + 30 <= zip.length && zip.readUInt32LE(i) === 0x04034B50) {
    const nameLen = zip.readUInt16LE(i + 26);
    const extraLen = zip.readUInt16LE(i + 28);
    const size = zip.readUInt32LE(i + 18);
    out.push(zip.subarray(i + 30, i + 30 + nameLen).toString('utf8'));
    i += 30 + nameLen + extraLen + size;
  }
  return out;
}

(async () => {
  const colours = ['#9f1239', '#0f766e', '#1d4ed8'];
  const stickers = await Promise.all(colours.map((background) => sharp({
    create: { width: 512, height: 512, channels: 4, background },
  }).webp({ quality: 80 }).toBuffer()));

  const built = await native.buildNativeStickerPack(stickers, {
    packId: 'com.darkbot.test.pack', name: 'Pack de teste', publisher: 'DARK BOT', description: 'Teste nativo',
  });
  assert.strictEqual(built.stickerEntries.length, 3, 'mantém as três figurinhas');
  assert.ok(built.zip.subarray(0, 4).equals(Buffer.from('PK\x03\x04')), 'gera ZIP válido');
  const names = zipNames(built.zip);
  assert.strictEqual(names.length, 4, 'ZIP contém figurinhas e ícone');
  assert.ok(names.slice(0, 3).every((name) => /^\d\d_.+\.webp$/.test(name)), 'nomes anunciados de WebP são estáveis');
  assert.ok(names.includes(built.trayFileName), 'ícone anunciado está no ZIP');
  assert.deepStrictEqual(decrypt(built.packMedia.encrypted, built.packMedia.mediaKey, 'Sticker Pack'), built.zip, 'ZIP cifra/decifra com Sticker Pack Keys');
  assert.deepStrictEqual(decrypt(built.thumbnailMedia.encrypted, built.thumbnailMedia.mediaKey, 'Sticker Pack Thumbnail'), built.trayIcon, 'thumbnail usa a chave de miniatura correcta');

  const uploads = [];
  let relayed = null;
  const sock = {
    user: { id: '244900000000@s.whatsapp.net' },
    waUploadToServer: async (file, opts) => {
      const bytes = await fs.readFile(file);
      uploads.push({ bytes, opts });
      return { directPath: `/v/test/${opts.mediaType}` };
    },
    relayMessage: async (jid, message, options) => { relayed = { jid, message, options }; },
  };
  const result = await native.sendNativeStickerPack(sock, '120363000000000000@g.us', stickers, {
    packId: 'com.darkbot.test.pack', name: 'Pack de teste', publisher: 'DARK BOT', description: 'Teste nativo',
  });
  assert.ok(result.ok, 'relay do card nativo conclui');
  assert.deepStrictEqual(uploads.map((u) => u.opts.mediaType), ['sticker-pack', 'thumbnail-sticker-pack'], 'faz upload do ZIP e da miniatura nos endpoints próprios');
  assert.ok(relayed?.message?.stickerPackMessage, 'envia Message.stickerPackMessage por relay');
  assert.strictEqual(relayed.message.stickerPackMessage.stickers.length, 3, 'card descreve todas as figurinhas');
  assert.strictEqual(relayed.message.stickerPackMessage.directPath, '/v/test/sticker-pack', 'card aponta para ZIP hospedado');
  assert.strictEqual(relayed.message.stickerPackMessage.thumbnailDirectPath, '/v/test/thumbnail-sticker-pack', 'card aponta para miniatura hospedada');

  const offer = packs.buildPackOffer({
    sourcePackName: 'Original Sticker.ly',
    sourcePackUrl: 'https://sticker.ly/s/original-pack',
    channelUrl: 'https://whatsapp.com/channel/ABCDE',
  });
  assert.ok(offer.includes('📦 Ver pacote: https://sticker.ly/s/original-pack'), 'oferta preserva botão/link do pack de origem');
  assert.ok(offer.includes('📣 Canal/grupo: https://whatsapp.com/channel/ABCDE'), 'oferta mantém o canal configurado');

  await assert.rejects(
    native.buildNativeStickerPack(stickers.slice(0, 2), { name: 'curto' }),
    /3 a 30 figurinhas/,
    'não tenta criar card inválido com menos de três figurinhas'
  );

  console.log('✅ native sticker pack: ZIP, cifra, upload, relay e Ver pacote validados');
})().catch((error) => {
  console.error('❌ native sticker pack:', error.stack || error.message);
  process.exit(1);
});
