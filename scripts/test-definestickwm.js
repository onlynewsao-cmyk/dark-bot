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
ok('parse https channel', a && a.type === 'channel' && a.code === '0029VbC8voN4Y9lszc9VuT2D');

const b = wm.parseChannelLink('https://www.whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D/123');
ok('parse www + msg id', b && b.code === '0029VbC8voN4Y9lszc9VuT2D');

const c = wm.parseAnyLink('cola isto whatsapp.com/channel/0029VaABCDEFGH pfv');
ok('detecta canal no meio do texto', c && c.type === 'channel' && c.code === '0029VaABCDEFGH');

const g = wm.parseGroupLink('https://chat.whatsapp.com/AbCdEfGhIjKl');
ok('parse grupo', g && g.type === 'group' && g.code === 'AbCdEfGhIjKl');

ok('canal não é grupo', !wm.parseGroupLink('https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D'));
ok('texto sem link', !wm.parseAnyLink('DARK NET stickers'));

const html = `
<title>WhatsApp</title>
<meta property="og:title" content="Stickers DARK NET | WhatsApp">
`;
ok('og:title limpa WhatsApp', wm.extractChannelNameFromHtml(html) === 'Stickers DARK NET');

const meta = wm.composeMeta({
  link: 'https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D',
});
ok('pack = autor DARK NET', meta.packName === 'DARK NET 🕸️');
ok('não mete o nome do canal', !meta.authorName.includes('Stickers') && !meta.description.includes('Stickers DARK'));
ok('slogan', meta.authorName.includes('O melhor canal do mundo'));
ok('link na descrição', meta.authorName.includes('https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D'));
ok('cta', meta.authorName.includes('Siga o canal'));
ok('4 linhas', meta.description === [
  'DARK NET 🕸️',
  'O melhor canal do mundo',
  'https://whatsapp.com/channel/0029VbC8voN4Y9lszc9VuT2D',
  'Siga o canal',
].join('\n'));

const grupo = wm.composeMeta({ link: 'https://chat.whatsapp.com/AbCdEfGhIjKl' });
ok('aceita link de grupo', grupo.channelUrl.includes('chat.whatsapp.com/AbCdEfGhIjKl'));

const txt = wm.statusText(null, '.');
ok('ajuda sem marca', txt.includes('definestickwm') && txt.includes('ainda não está activa'));

const txt2 = wm.statusText({
  enabled: true,
  description: meta.description,
  packName: meta.packName,
  authorName: meta.authorName,
}, '.');
ok('status mostra bloco', txt2.includes('DARK NET 🕸️') && txt2.includes('Siga o canal'));

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
