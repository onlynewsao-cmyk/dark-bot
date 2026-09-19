#!/usr/bin/env node
/**
 * v8.2 🛠️ — CONVERTE-TUDO (tomp3/mp4to3 · tovoice/mp4tovoice·mp3tovoice ·
 * togif · videoaimg · todoc e família). ffmpeg REAL no sandbox:
 * mídias sintéticas lavfi → conversões genuínas → validação por magic bytes.
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// ── mídias sintéticas reais (ffmpeg do próprio pacote) ────────
let WAV = null, MP4 = null;
try {
  const ffmpeg = require('ffmpeg-static');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'test-conv-'));
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=1.5',
    '-ar', '44100', '-ac', '2', path.join(tmp, 'a.wav')], { stdio: 'pipe' });
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=160x120:rate=10:duration=2',
    '-f', 'lavfi', '-i', 'sine=frequency=400:duration=2', '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path.join(tmp, 'a.mp4')], { stdio: 'pipe' });
  WAV = fs.readFileSync(path.join(tmp, 'a.wav'));
  MP4 = fs.readFileSync(path.join(tmp, 'a.mp4'));
  fs.rmSync(tmp, { recursive: true, force: true });
} catch (e) { console.warn('sem ffmpeg local — parte sintética salta'); }

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _fakeBuf = null;
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => null, forgetGroup: () => {} };
  if (s.endsWith('mediaHandler')) {
    return {
      downloadFromMessage: async (msg) => _fakeBuf || msg?._fake || Buffer.alloc(0),
      fetchBuffer: async () => Buffer.alloc(0),
      isAudioBytes: (b) => !!b?.length,
      cleanThumb: (x) => x,
    };
  }
  return _orig.apply(this, arguments);
};

const CE = require('../src/bot/convertEngine');

const sent = [];
const sockF = { sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k' } }; } };
const ctxF = { remoteJid: 'GRP@g.us', senderNumber: '2449', isGroup: true, prefix: '!' };

const mkQuoted = (node, tag) => ({
  msg: { message: { [tag + 'Message']: node }, key: { id: 'q' } },
  message: { [tag + 'Message']: node },
});
const videoNode = { mimetype: 'video/mp4' };
const audioNode = { mimetype: 'audio/mpeg' };
const stickerNode = { mimetype: 'image/webp', isAnimated: false };
const imageNode  = { mimetype: 'image/jpeg' };
const docVideo = { mimetype: 'video/mp4', fileName: 'clip.mp4' };

(async () => {
  console.log('=== v8.2 — CONVERTE-TUDO ===');

  // ── 1. mediaDe — detecção/classificação ─────────────────────
  let i = CE.mediaDe({ message: {} }, mkQuoted(videoNode, 'video'));
  assert.deepStrictEqual([i.kind, i.ext], ['video', 'mp4']);
  i = CE.mediaDe({ message: {} }, mkQuoted(docVideo, 'document'));
  assert.deepStrictEqual([i.kind, i.ext], ['video', 'mp4'], 'documento de vídeo conta como vídeo');
  i = CE.mediaDe({ message: { audioMessage: audioNode } }, null);
  assert.deepStrictEqual(i.kind, 'audio');
  i = CE.mediaDe({ message: {} }, mkQuoted({ ...stickerNode, isAnimated: true }, 'sticker'));
  assert.strictEqual(i.isAnimated, true);
  assert.strictEqual(CE.mediaDe({ message: { conversation: 'x' } }, null), null);
  console.log('✔ mediaDe: kinds e extensões em qualquer forma de mensagem');

  const reg = {};
  require('../src/bot/cases/convert')((nomes, fn) => { for (const n of [].concat(nomes)) reg[n] = fn; });
  assert.ok(reg.mp4to3 && reg['4to3'] && reg.tovoice && reg.mp4tovoice && reg.mp3tovoice && reg.togif && reg.todoc && reg.videoaimg, 'comandos registados');

  // ── 2. Sem mídia → a mensagem explica ───────────────────────
  sent.length = 0;
  await reg.tovoice({ sock: sockF, msg: { key: { id: 'a1' }, message: { conversation: '!tovoice' } }, ctx: ctxF, prefix: '!' });
  assert.ok(sent.some(c => /Responde a um/.test(c.text || '') || /tovoice/.test(c.text || '')), 'uso explicado');
  console.log('✔ sem mídia citada: explicação rica');

  // ── 3. voz: WAV real → OPUS (ptt) ───────────────────────────
  if (WAV) {
    sent.length = 0; _fakeBuf = WAV;
    await reg.mp3tovoice({ sock: sockF, msg: { key: { id: 'b3' }, message: { extendedTextMessage: { text: 'x' } } }, quoted: mkQuoted(audioNode, 'audio'), m: {}, ctx: ctxF, prefix: '!' });
    const v = sent.find(c => c.audio);
    assert.ok(v, 'áudio de voz enviado');
    assert.strictEqual(v.ptt, true, 'é nota de voz');
    assert.ok(/audio\/ogg; codecs=opus/.test(v.mimetype), 'mimetype opus');
    assert.ok(v.waveform?.length === 64, 'waveform decorativa');
    assert.ok(v.audio.slice(0, 4).toString() === 'OggS', 'conteúdo OPUS genuíno');
    console.log('✔ tovoice/mp3tovoice: OPUS real com ptt + waveform');
  }

  // ── 4. mp4→mp3: MP4 real → MP3 ──────────────────────────────
  if (MP4) {
    sent.length = 0; _fakeBuf = MP4;
    await reg.mp4to3({ sock: sockF, msg: { key: { id: 'c1' }, message: { extendedTextMessage: { text: 'x' } } }, quoted: mkQuoted(videoNode, 'video'), m: {}, ctx: ctxF, prefix: '!' });
    const a = sent.find(c => c.audio);
    assert.ok(a, 'mp3 enviado');
    assert.strictEqual(a.mimetype, 'audio/mpeg');
    assert.strictEqual(a.ptt, false, 'mp3 vai como faixa, não como voz');
    assert.ok(/\.mp3$/.test(a.fileName || ''), 'fileName .mp3');
    const hdr = a.audio.slice(0, 3);
    assert.ok(hdr[0] === 0xFF || hdr.toString() === 'ID3', 'conteúdo MP3 genuíno');
    console.log('✔ mp4to3/4to3: MP3 192k real');
  }

  // ── 5. togif: MP4 real → gifPlayback ────────────────────────
  if (MP4) {
    sent.length = 0; _fakeBuf = MP4;
    await reg.togif({ sock: sockF, msg: { key: { id: 'd1' }, message: { extendedTextMessage: { text: 'x' } } }, quoted: mkQuoted(videoNode, 'video'), m: {}, ctx: ctxF, prefix: '!' });
    const g = sent.find(c => c.video);
    assert.ok(g, 'gif enviado');
    assert.strictEqual(g.gifPlayback, true, 'gifPlayback ligado');
    assert.ok(g.video.length > 2048, 'mp4 do gif tem substância');
    console.log('✔ togif: mp4 gifPlayback real');
  }

  // ── 6. videoaimg: 1ª frame PNG ──────────────────────────────
  if (MP4) {
    sent.length = 0; _fakeBuf = MP4;
    await reg.videoaimg({ sock: sockF, msg: { key: { id: 'e1' }, message: { extendedTextMessage: { text: 'x' } } }, quoted: mkQuoted(videoNode, 'video'), m: {}, ctx: ctxF, prefix: '!' });
    const im = sent.find(c => c.image);
    assert.ok(im, 'frame enviada');
    assert.ok(im.image[0] === 0x89 && im.image.toString('ascii', 1, 4) === 'PNG', 'PNG genuíno');
    console.log('✔ videoaimg: primeira frame PNG real');
  }

  // ── 7. todoc: buffer original, extensão certa ───────────────
  if (MP4) {
    sent.length = 0; _fakeBuf = MP4;
    await reg.todoc({ sock: sockF, msg: { key: { id: 'f1' }, message: { extendedTextMessage: { text: 'x' } } }, quoted: mkQuoted(videoNode, 'video'), m: {}, ctx: ctxF, prefix: '!' });
    const d = sent.find(c => c.document);
    assert.ok(d, 'documento enviado');
    assert.ok(Buffer.compare(d.document, MP4) === 0, 'buffer intacto');
    assert.ok(/\.mp4$/.test(d.fileName), 'extensão .mp4');
    console.log('✔ todoc: documento com a extensão certa');
  }

  // ── 8. tipo errado para a conversão → aviso claro ───────────
  sent.length = 0; _fakeBuf = Buffer.alloc(4000, 1);
  await reg.mp4to3({ sock: sockF, msg: { key: { id: 'g1' }, message: { extendedTextMessage: { text: 'x' } } }, quoted: mkQuoted(stickerNode, 'sticker'), m: {}, ctx: ctxF, prefix: '!' });
  assert.ok(sent.some(c => /não dá para esta conversão/.test(c.text || '')), 'refusal explica');
  console.log('✔ mídia incompatível: aviso claro');

  // ── 9. demasiados MB → corta amigável ───────────────────────
  sent.length = 0; _fakeBuf = Buffer.alloc(51 * 1024 * 1024, 3);
  await reg.tovoice({ sock: sockF, msg: { key: { id: 'h1' }, message: { extendedTextMessage: { text: 'x' } } }, quoted: mkQuoted(audioNode, 'audio'), m: {}, ctx: ctxF, prefix: '!' });
  assert.ok(sent.some(c => /50 MB/.test(c.text || '')), 'limite comunicado');
  _fakeBuf = null;
  console.log('✔ limite de 50 MB com pedido simpático');

  // ── 10. Estático ────────────────────────────────────────────
  const srcC = fs.readFileSync(path.join(__dirname, '..', 'src', 'bot', 'cases', 'convert.js'), 'utf8');
  assert.ok(/gifPlayback: true/.test(srcC), 'gifPlayback');
  assert.ok(/ptt: true/.test(srcC), 'ptt');
  assert.ok(/audio\/ogg; codecs=opus/.test(srcC), 'opus');
  const srcE = fs.readFileSync(path.join(__dirname, '..', 'src', 'bot', 'convertEngine.js'), 'utf8');
  assert.ok(/libopus/.test(srcE) && /192k/.test(srcE), 'motor com opus+mp3');
  console.log('✔ ganchos do motor e dos casos');

  console.log('\nOK / test-aconvert — conversões reais validadas (v8.2)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
