'use strict';
/**
 * v7.93 — IDENTIDADE: link do canal + selo verificado dinâmicos,
 * comandos do Dono, e os sítios onde aparecem ficam fios a eles.
 */
const Module = require('module');
const orig = Module.prototype.require;

const STORE = {};
let OUT = [];
const sock = {
  sendMessage: async (j, c) => { OUT.push(c?.text || c?.vcard || c?.contactMessage?.displayName || JSON.stringify(c).slice(0, 120)); return { key: {} }; },
};
const msg = { key: { remoteJid: '1@s.whatsapp.net', fromMe: false, id: 'X' } };
const ctxD = { remoteJid: '244001@s.whatsapp.net', senderNumber: '244001', senderJid: '244001@s.whatsapp.net', isGroup: false };
const ctxF = { ...ctxD, senderNumber: '244999', senderJid: '244999@s.whatsapp.net' };

Module.prototype.require = function (id) {
  if (id === '../config' || id.endsWith('/config.js')) return { channelUrl: 'https://whatsapp.com/channel/ENV', owner: { number: '244001' }, bot: { name: 'DARK BOT' } };
  if (id === './botConfigCache' || id === '../botConfigCache' || id.endsWith('/botConfigCache')) {
    return { get: async (k, d) => (k in STORE ? STORE[k] : d), set: async (k, v) => { STORE[k] = v; } };
  }
  return orig.apply(this, arguments);
};

const id = require('../src/bot/identidadeCanal');
let ok = 0, fail = 0;
const t = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, String(x).slice(0, 90)); } };

// colhe os handlers registados pelo ficheiro de cases
const HANDLERS = {};
require('../src/bot/cases/identidadeCanal')((names, fn) => { for (const n of names) HANDLERS[n] = fn; });

(async () => {
  console.log('\n═══ 1. CANAL DINÂMICO ═══');
  t('skipDB → link do env', (await id.canalLink()) === 'https://whatsapp.com/channel/ENV', await id.canalLink());
  OUT = [];
  await HANDLERS.setcanal({ sock, msg, ctx: ctxD, args: ['https://whatsapp.com/channel/NOVO123'], isOwner: true });
  t('!setcanal guarda o novo', STORE.channel_url === 'https://whatsapp.com/channel/NOVO123' && OUT.join(' ').includes('NOVO123'), OUT.join(' ').slice(0, 80));
  t('canalLink reflecte o novo', (await id.canalLink()) === 'https://whatsapp.com/channel/NOVO123', await id.canalLink());
  OUT = [];
  await HANDLERS.canalinfo({ sock, msg, ctx: ctxF, args: [] });
  t('!canalinfo mostra o link', OUT.join(' ').includes('NOVO123'), OUT.join(' ').slice(0, 70));
  OUT = [];
  await HANDLERS.setcanal({ sock, msg, ctx: ctxF, args: ['https://x'], isOwner: false });
  t('não-Dono recusado', OUT.join(' ').includes('Dono'), OUT.join(' ').slice(0, 60));
  OUT = [];
  await HANDLERS.setcanal({ sock, msg, ctx: ctxD, args: ['off'], isOwner: true });
  t('!setcanal off volta ao env', (await id.canalLink()) === 'https://whatsapp.com/channel/ENV', await id.canalLink());

  console.log('\n═══ 2. SELO VERIFICADO ═══');
  t('selo padrão', (await id.selo()).nome === 'DARK BOT ✓', JSON.stringify(await id.selo()));
  OUT = [];
  await HANDLERS.setselo({ sock, msg, ctx: ctxD, args: ['aura maquina ✓ | 244912345678'], isOwner: true });
  const s2 = await id.selo();
  t('!setselo muda nome+número', s2.nome === 'aura maquina ✓' && s2.numero === '244912345678', JSON.stringify(s2));
  t('vcard do selo tem os dados', id.seloMsg(s2.nome, s2.numero).message.contactMessage.vcard.includes('244912345678'), '');
  OUT = []; await HANDLERS.selo({ sock, msg, ctx: ctxF, args: [] });
  t('!selo mostra o contacto actual', OUT.join(' ').includes('aura maquina'), OUT.join(' ').slice(0, 70));
  OUT = []; await HANDLERS.setselo({ sock, msg, ctx: ctxF, args: ['x|1'], isOwner: false });
  t('selo: não-Dono recusado', OUT.join(' ').includes('Dono'), OUT.join(' ').slice(0, 60));
  OUT = []; await HANDLERS.setselo({ sock, msg, ctx: ctxD, args: ['off'], isOwner: true });
  t('!setselo off = padrão', (await id.selo()).nome === 'DARK BOT ✓', JSON.stringify(await id.selo()));

  console.log('\n═══ 3. LIGADOS NOS SÍTIOS ═══');
  const fs = require('fs');
  for (const f of ['src/bot/cases/finalizar.js', 'src/bot/cases/premium.js', 'src/bot/cases/rental2.js']) {
    t('canal dinâmico em ' + f.split('/').pop(), fs.readFileSync('/home/user/darknet-tunnel/' + f, 'utf8').includes('identidadeCanal'), '');
  }
  t('lista usa id (clique do menu)', fs.readFileSync('/home/user/darknet-tunnel/src/bot/listaEscolha.js', 'utf8').includes('id: `LISTANUM_'), '');
  t('rpg/ui usa id', fs.readFileSync('/home/user/darknet-tunnel/src/bot/rpg/ui.js', 'utf8').includes('id: `RPGSEL_'), '');
  t('play SEM lista', !fs.readFileSync('/home/user/darknet-tunnel/src/bot/cases/downloads.js', 'utf8').match(/v7\.77: !play mostra a LISTA/), '');

  console.log(`\n${fail ? '💥' : '🎉'} IDENTIDADE: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('💥 EXCEPÇÃO:', e); process.exit(1); });
