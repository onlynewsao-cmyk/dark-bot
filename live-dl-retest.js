#!/usr/bin/env node
/** Re-teste live pós-fix v7.54 (SystemZone→yt-dlp fallback). */
'use strict';
process.env.PATH = '/home/user/bin:' + process.env.PATH;
const others = require('./src/bot/dl/others');
const dl = require('./src/bot/downloader');
function magic(buf) {
  if (!buf || buf.length < 12) return 'EMPTY';
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'MP4';
  if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)) return 'MP3';
  return 'UNK(' + buf.slice(0, 6).toString('hex') + ')';
}
async function T(name, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    if (r?.buffer?.length > 2048) console.log(`✅ ${name} — ${(r.buffer.length / 1024).toFixed(0)}KB ${magic(r.buffer)} ${((Date.now() - t0) / 1000).toFixed(0)}s [${r.quality || ''}]`);
    else console.log(`❌ ${name} — sem buffer: ${JSON.stringify(r)?.slice(0, 100)}`);
  } catch (e) { console.log(`❌ ${name} — ERRO: ${e.message?.slice(0, 110)}`); }
}
(async () => {
  await T('.spotify URL (Bowie)', () => others.spotify('https://open.spotify.com/track/7Jh1bpe76CNTCgdgAdBw4Z'));
  await T('.spotify NOME', () => others.spotify('David Bowie Heroes'));
  await T('.soundcloud query', () => others.soundcloud('David Bowie Heroes'));
  await T('downloader.youtubeAudio termo', () => dl.youtubeAudio('me at the zoo'));
  console.log('RETEST-DONE');
})();
