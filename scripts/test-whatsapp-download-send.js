#!/usr/bin/env node
/**
 * Simula o envio de áudio/vídeo no WhatsApp sem conectar no WhatsApp.
 * Valida se o downloader retorna buffer real e monta payload Baileys-like.
 */
const downloader = require('../src/bot/downloader');

function assertBuffer(name, buf, min) {
  if (!Buffer.isBuffer(buf)) throw new Error(`${name}: buffer não é Buffer`);
  if (buf.length < min) throw new Error(`${name}: buffer muito pequeno (${buf.length})`);
}

async function mockSendMessage(jid, payload) {
  const type = payload.audio ? 'audio' : payload.video ? 'video' : payload.document ? 'document' : 'text';
  const media = payload.audio || payload.video || payload.document;
  if (media) assertBuffer(type, media, type === 'video' ? 4096 : 2048);
  return {
    jid,
    type,
    mimetype: payload.mimetype,
    fileName: payload.fileName,
    caption: payload.caption || '',
    size: media ? media.length : Buffer.byteLength(payload.text || ''),
  };
}

async function testAudio(query) {
  const r = await downloader.play160(query);
  assertBuffer('audio', r.buffer, 2048);
  const payload = {
    audio: r.buffer,
    mimetype: r.mimetype || 'audio/mpeg',
    fileName: r.fileName || `${r.title || 'audio'}.mp3`,
    ptt: false,
  };
  const sent = await mockSendMessage('244000000000@s.whatsapp.net', payload);
  console.log('✅ WHATSAPP AUDIO OK', JSON.stringify({ title: r.title, ...sent }, null, 2));
}

async function testVideo(query) {
  const r = await downloader.videoHD(query);
  assertBuffer('video', r.buffer, 4096);
  const payload = {
    video: r.buffer,
    mimetype: r.mimetype || 'video/mp4',
    fileName: r.fileName || `${r.title || 'video'}.mp4`,
    caption: `🎬 ${r.title || 'Vídeo'}`,
  };
  const sent = await mockSendMessage('244000000000@s.whatsapp.net', payload);
  console.log('✅ WHATSAPP VIDEO OK', JSON.stringify({ title: r.title, ...sent }, null, 2));
}

(async () => {
  const audioQuery = process.argv[2] || 'Drake shabang';
  const videoQuery = process.argv[3] || 'central cee doja';
  console.log('🧪 Testando como se enviasse no WhatsApp...');
  await testAudio(audioQuery);
  await testVideo(videoQuery);
})().catch(err => {
  console.error('❌ TESTE FALHOU:', err.message);
  process.exit(1);
});
