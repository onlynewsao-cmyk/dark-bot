#!/usr/bin/env node
/**
 * TESTE LIVE de downloads — entrega REAL de mídia (14/09/2026).
 * Chama as MESMAS funções que os comandos usam e prova bytes.
 * Uso: PATH=/home/user/bin:$PATH node live-dl-test.js
 */
'use strict';
process.env.PATH = '/home/user/bin:' + process.env.PATH;

const others = require('./src/bot/dl/others');
const helpers = require('./src/bot/dl/helpers');
const ytdl = require('./src/bot/ytdl');

const U = {
  tiktok: 'https://www.tiktok.com/@khaby.lame/video/7683944847840922911',
  igPhoto: 'https://www.instagram.com/p/BsOGulcndjX/',
  fb: 'https://www.facebook.com/watch/?v=762932621316078',
  x: 'https://x.com/SpaceX/status/1481651037291225113',
  ytShort: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo, 19s
  spotify: 'https://open.spotify.com/track/7Jh1bpe76CNTCgdgAdBw4Z', // Bowie Heroes
  scQuery: 'David Bowie Heroes',
};

function magic(buf) {
  if (!buf || buf.length < 12) return 'TINY/EMPTY';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'JPEG';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'WEBP';
  if (buf.toString('ascii', 0, 8).includes('PNG')) return 'PNG';
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'MP4';
  if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)) return 'MP3';
  if (buf.toString('ascii', 0, 4) === 'OggS') return 'OGG';
  if (buf.toString('ascii', 0, 5) === '<?xml' || buf[0] === 0x7B) return 'TEXT/JSON??';
  if (buf.toString('ascii', 0, 15).toLowerCase().includes('html')) return 'HTML??';
  return 'UNKNOWN(' + buf.slice(0, 8).toString('hex') + ')';
}

async function fetchBytes(url, maxMs = 120000) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), maxMs);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!r.ok) return { ok: false, err: 'HTTP ' + r.status };
    const ab = await r.arrayBuffer();
    return { ok: true, buf: Buffer.from(ab), ct: r.headers.get('content-type') };
  } catch (e) { return { ok: false, err: e.message?.slice(0, 100) }; }
  finally { clearTimeout(to); }
}

async function resolveResult(r) {
  // Devolve {bytes, kind, via} — buffer direto ou URL resolvida
  if (r?.buffer?.length) return { bytes: r.buffer.length, kind: magic(r.buffer), via: 'buffer' };
  const url = r?.url || r?.video || r?.download || r?.noWatermark;
  if (!url || typeof url !== 'string' || !url.startsWith('http'))
    return { bytes: 0, kind: 'SEM-URL(' + JSON.stringify(r)?.slice(0, 80) + ')', via: 'none' };
  const f = await fetchBytes(url);
  if (!f.ok) return { bytes: 0, kind: 'URL-MORTA: ' + f.err, via: 'url' };
  return { bytes: f.buf.length, kind: magic(f.buf) + '/' + (f.ct || '?'), via: 'url' };
}

const results = [];
async function T(name, fn, maxMs = 280000) {
  const t0 = Date.now();
  try {
    const r = await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + maxMs + 'ms')), maxMs)),
    ]);
    const res = await resolveResult(r);
    const ms = Date.now() - t0;
    const pass = res.bytes > 4096 && !/MORTA|SEM-URL|HTML|TEXT/.test(res.kind);
    results.push({ name, pass, ms, ...res });
    console.log(`${pass ? '✅' : '❌'} ${name} — ${(res.bytes / 1024).toFixed(0)}KB ${res.kind} via=${res.via} ${(ms / 1000).toFixed(1)}s`);
  } catch (e) {
    results.push({ name, pass: false, ms: Date.now() - t0, err: e.message?.slice(0, 120) });
    console.log(`❌ ${name} — ERRO: ${e.message?.slice(0, 120)}`);
  }
}

(async () => {
  console.log('── LAYER: TikWM direto ──');
  await T('tikwm(tiktok)', async () => helpers.tikwmDownload(U.tiktok));
  console.log('── COMANDOS (mesmas funções dos cases) ──');
  await T('.tiktok (others.tiktok)', async () => others.tiktok(U.tiktok));
  await T('.instagram foto (others.instagram)', async () => others.instagram(U.igPhoto));
  await T('.facebook (others.facebook)', async () => others.facebook(U.fb));
  await T('.twitter (others.twitter)', async () => others.twitter(U.x));
  await T('.baixarvideo 720p (ytdl.getVideo)', async () => ytdl.getVideo(U.ytShort, '720'));
  await T('.baixaraudio 128k (ytdl.getAudio)', async () => ytdl.getAudio(U.ytShort, '128k'));
  await T('.spotify (others.spotify)', async () => others.spotify(U.spotify));
  await T('.soundcloud query (others.soundcloud)', async () => others.soundcloud(U.scQuery));
  const ok = results.filter(r => r.pass).length;
  console.log(`\nLIVE-DL: ${ok}/${results.length} ENTREGAM MÍDIA`);
  process.exit(ok === results.length ? 0 : 1);
})();
