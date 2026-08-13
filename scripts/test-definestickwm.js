#!/usr/bin/env node
'use strict';

const wm = require('../src/bot/stickerWm');
let failed = 0;
function ok(name, cond, extra = '') {
  if (cond) console.log('  ✅', name);
  else { failed++; console.log('  ❌', name, extra); }
}

console.log('test-definestickwm');

const a = wm.parseChannelLink('https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D');
ok('parse https channel', a && a.code === '0029VbC8voN4Y9lszc9VuT2D');

const b = wm.parseChannelLink('https://www.whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D/123');
ok('parse www + msg id', b && b.code === '0029VbC8voN4Y9lszc9VuT2D');

const c = wm.parseChannelLink('whatsapp.com/channel/0029VaABCDEFGH');
ok('parse sem protocolo', c && c.code === '0029VaABCDEFGH');

ok('ignora grupo', !wm.parseChannelLink('https://chat.whatsapp.com/AbCdEfGhIjKl'));
ok('ignora texto', !wm.parseChannelLink('DARK NET stickers'));

const html = `
<title>WhatsApp</title>
<meta property="og:title" content="Stickers DARK NET | WhatsApp">
`;
ok('og:title limpa WhatsApp', wm.extractChannelNameFromHtml(html) === 'Stickers DARK NET');

const html2 = '<meta content="Canal Figurinhas Dark" property="og:title">';
ok('og:title invertido', wm.extractChannelNameFromHtml(html2) === 'Canal Figurinhas Dark');

const meta = wm.composeMeta({ channelName: 'Stickers DARK NET' });
ok('pack = nome do canal', meta.packName === 'Stickers DARK NET');
ok('author = DARK NET 🕸️', meta.authorName === 'DARK NET 🕸️');

const meta2 = wm.composeMeta({ packName: 'Meu Pack', authorName: 'DARK NET 🕸️' });
ok('pack custom', meta2.packName === 'Meu Pack' && meta2.authorName === 'DARK NET 🕸️');

const txt = wm.statusText(null, '.');
ok('ajuda sem marca', txt.includes('definestickwm') && txt.includes('ainda não há marca'));

const txt2 = wm.statusText({
  enabled: true, packName: 'Stickers DARK NET', authorName: 'DARK NET 🕸️',
  channelName: 'Stickers DARK NET', channelUrl: 'https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D',
}, '.');
ok('status com canal', txt2.includes('Stickers DARK NET') && txt2.includes('DARK NET 🕸️'));

(async () => {
  const applied = await wm.apply({
    skipGroupWm: true,
    packName: 'X',
    authorName: 'Y',
    remoteJid: '120@g.us',
  });
  ok('skipGroupWm respeitado', applied.packName === 'X' && applied.authorName === 'Y');

  const untouched = await wm.apply({ packName: 'A', authorName: 'B' });
  ok('sem jid não muda', untouched.packName === 'A' && untouched.authorName === 'B');

  if (failed) {
    console.log('\nFALHOU:', failed);
    process.exit(1);
  }
  console.log('\nOK  —  0 falhas');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
