#!/usr/bin/env node
'use strict';
/**
 * Regressão de tela verde: um MP4 H.264 yuv444p representa um resultado que
 * muitos clientes WhatsApp Android não reproduzem. O fluxo Facebook deve
 * transcodificá-lo para H.264 baseline + yuv420p antes do envio.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const video = require('../src/bot/videoCompat');

function run(args, timeout = 60000) {
  const r = spawnSync(ffmpeg, args, { encoding: 'utf8', timeout });
  if (r.status !== 0) throw new Error((r.error?.message || r.stderr || 'ffmpeg falhou').slice(-500));
  return String(r.stderr || '');
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dark-fb-green-'));
  try {
    const input = path.join(dir, 'incompatível.mp4');
    // 4:4:4 é MP4 válido, mas não é um perfil seguro para WhatsApp Android.
    run(['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=24', '-t', '1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv444p', '-an', '-movflags', '+faststart', input]);
    const original = fs.readFileSync(input);
    assert(video.isMp4(original), 'amostra de origem deve ser MP4');

    const out = await video.prepareForWhatsApp(original, { maxHeight: 720, timeoutMs: 60000 });
    assert(out.normalized, 'Facebook precisa ser normalizado quando ffmpeg está disponível');
    assert(video.isMp4(out.buffer), 'saída deve manter contentor MP4');
    const normal = path.join(dir, 'whatsapp.mp4');
    fs.writeFileSync(normal, out.buffer);
    const info = run(['-hide_banner', '-i', normal, '-f', 'null', '-']);
    assert(/Video:\s*h264/i.test(info), 'saída deve usar H.264');
    assert(/yuv420p/i.test(info), 'saída deve usar yuv420p seguro');
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'bot', 'cases', 'downloads2.js'), 'utf8');
    assert(source.includes('normalizeForWhatsApp: true, maxHeight: 720'), 'rota Facebook deve pedir a normalização');
    console.log('FACEBOOK VIDEO: MP4 yuv444p convertido para H.264/yuv420p seguro para WhatsApp.');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
})().catch((error) => {
  console.error('FACEBOOK VIDEO: FAIL:', error.stack || error);
  process.exitCode = 1;
});
