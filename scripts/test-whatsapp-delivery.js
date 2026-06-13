#!/usr/bin/env node
/**
 * Testa se comandos enviariam ARQUIVO real para o WhatsApp (buffer), não só texto/link.
 */
const native = require('../src/bot/nativeCommands');
const config = require('../src/config');

function makeSock(sent) {
  return {
    user: { id: '244000000000@s.whatsapp.net' },
    sendMessage: async (jid, payload, opts) => { sent.push(payload); return { key: { id: 'x' } }; },
    relayMessage: async () => ({ key: { id: 'r' } }),
  };
}
function makeCtx() {
  return { remoteJid: 'test@s.whatsapp.net', senderNumber: '244000000001', senderJid: '244000000001@s.whatsapp.net', pushName: 'Tester', prefix: '!', isGroup: false };
}
function makeMsg(cmd) { return { key: { remoteJid: 'test@s.whatsapp.net', id: 'm1' }, message: { conversation: cmd } }; }

async function run(name, fn, kind) {
  const sent = [];
  const sock = makeSock(sent);
  const ctx = makeCtx();
  const msg = makeMsg('!' + name);
  const t = Date.now();
  await fn({ sock, msg, ctx, args: ['lofi', 'hip', 'hop'], config });
  const payload = sent.find(p => p[kind]) || sent.find(p => p.document);
  const bytes = Buffer.isBuffer(payload?.[kind]) ? payload[kind].length : Buffer.isBuffer(payload?.document) ? payload.document.length : 0;
  const badText = sent.find(p => p.text && /link direto|não consegui|falhou/i.test(p.text));
  const ok = bytes > 1024 && !badText;
  console.log(`${ok ? '✅' : '❌'} ${name} ${Date.now() - t}ms ${kind}/document bytes=${bytes}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  await run('play', native.play, 'audio');
  await run('play2', native.play2, 'audio');
  await run('play3', native.play3, 'audio');
  await run('video', native.video, 'video');
  await run('video2', native.video2, 'video');
})();
