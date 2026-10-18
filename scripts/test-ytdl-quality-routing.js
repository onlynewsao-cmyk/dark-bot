'use strict';
/** Regression for requested versus actual video resolution across profiles and WhatsApp preparation. */
const assert = require('assert');
const Module = require('module');
const originalLoad = Module._load;

// yt-search is not installed in the offline test environment; this test only
// exercises the pure quality helpers and never invokes search/download APIs.
Module._load = function (request, parent, isMain) {
  if (request === 'yt-search') return async () => ({ videos: [] });
  return originalLoad.call(this, request, parent, isMain);
};
const ytdl = require('../src/bot/ytdl');
Module._load = originalLoad;

const quality = require('../mediaQuality');
const video = require('../src/bot/videoCompat');
let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log(`✅ ${label}`);
}

function syntheticMp4(width, height, version = 0) {
  const ftyp = Buffer.alloc(16);
  ftyp.writeUInt32BE(16, 0);
  ftyp.write('ftyp', 4, 'ascii');
  ftyp.write('isom', 8, 'ascii');
  ftyp.writeUInt32BE(0x200, 12);

  const tkhdSize = version === 1 ? 104 : 92;
  const tkhd = Buffer.alloc(tkhdSize);
  tkhd.writeUInt32BE(tkhdSize, 0);
  tkhd.write('tkhd', 4, 'ascii');
  tkhd[8] = version;
  const widthAt = 4 + (version === 1 ? 92 : 80);
  tkhd.writeUInt32BE(width * 65536, widthAt);
  tkhd.writeUInt32BE(height * 65536, widthAt + 4);
  const mdat = Buffer.alloc(4104);
  mdat.writeUInt32BE(mdat.length, 0);
  mdat.write('mdat', 4, 'ascii');
  return Buffer.concat([ftyp, tkhd, mdat]);
}

check('!play 480 profile remains 480p for the API', () => {
  assert.strictEqual(quality.profile('128k', '480').video, '480');
  assert.strictEqual(quality.profile('128k', '480').apiVideo, '480p');
});
check('720p and 1080p profiles remain distinct', () => {
  assert.strictEqual(quality.profile('192k', '720').apiVideo, '720p');
  assert.strictEqual(quality.profile('320k', '1080').apiVideo, '1080p');
});
check('Loader.to routing preserves 480, 720 and 1080 requests', () => {
  assert.strictEqual(ytdl.normalizeVideoHeight('480'), '480');
  assert.strictEqual(ytdl.normalizeVideoHeight('720p'), '720');
  assert.strictEqual(ytdl.normalizeVideoHeight('1080'), '1080');
});
check('unknown resolution input safely defaults to 720p', () => {
  assert.strictEqual(ytdl.normalizeVideoHeight('best'), '720');
});
check('MP4 dimensions are read from version-0 and version-1 tkhd boxes', () => {
  assert.deepStrictEqual(video.dimensionsFromMp4(syntheticMp4(854, 480, 0)), { width: 854, height: 480 });
  assert.deepStrictEqual(video.dimensionsFromMp4(syntheticMp4(1920, 1080, 1)), { width: 1920, height: 1080 });
});
check('non-MP4 input does not claim a resolution', () => {
  assert.strictEqual(video.dimensionsFromMp4(Buffer.from('not an mp4')), null);
});
check('WhatsApp preparation permits 1080p while retaining its safety cap', () => {
  assert.strictEqual(video.maxOutputHeight(480), 480);
  assert.strictEqual(video.maxOutputHeight(720), 720);
  assert.strictEqual(video.maxOutputHeight(1080), 1080);
  assert.strictEqual(video.maxOutputHeight(2160), 1080);
});
check('measured quality uses file dimensions, not the requested label', () => {
  assert.strictEqual(ytdl.actualVideoQuality(syntheticMp4(1920, 1080)), '1080p');
  assert.strictEqual(ytdl.actualVideoQuality(Buffer.from('not an mp4')), 'resolução não verificada');
});

async function testSentCaptionUsesMeasuredResolution() {
  const originalLoad = Module._load;
  const fakeBuffer = syntheticMp4(1920, 1080);
  Module._load = function (request, parent, isMain) {
    if (request === '../../config') return { footer: 'DARK BOT', bot: { name: 'DARK BOT' } };
    if (request === '../ytdl') return {
      getVideo: async () => ({
        buffer: fakeBuffer, title: 'Sample', author: 'Test', duration: '1:00',
        quality: '720p', source: 'test-provider',
      }),
    };
    if (request === '../systemZeroPlay') return {};
    if (request === '../mediaHandler') return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const registerDownloads = require('../src/bot/cases/downloads');
    const handlers = new Map();
    registerDownloads((names, handler) => [].concat(names).forEach(name => handlers.set(name, handler)));
    let sent;
    const sock = { sendMessage: async (_jid, payload) => { sent = payload; return {}; } };
    const msg = { key: { id: 'quality-test', remoteJid: 'test@s.whatsapp.net' }, message: {} };
    await handlers.get('gyt')({
      sock, msg, m: { chat: msg.key.remoteJid, key: msg.key },
      ctx: { remoteJid: msg.key.remoteJid },
      text: 'https://youtu.be/wDchsz8nmbo | mp4 | 1080 | 1:00',
      args: [], prefix: '!', command: 'gyt',
      reply: async () => {}, react: () => {},
    });
    assert.strictEqual(sent.caption.includes('📺 1080p'), true);
    assert.strictEqual(sent.caption.includes('📺 720p'), false);
    assert.deepStrictEqual(video.dimensionsFromMp4(sent.video), { width: 1920, height: 1080 });
  } finally {
    Module._load = originalLoad;
  }
}

(async () => {
  await testSentCaptionUsesMeasuredResolution();
  checks++;
  console.log('✅ WhatsApp caption reports measured MP4 resolution, not provider label');
  console.log(`YTDL QUALITY ROUTING: ${checks} checks passed.`);
})().catch(error => {
  console.error('YTDL QUALITY ROUTING FAILED:', error.stack || error.message);
  process.exitCode = 1;
});
