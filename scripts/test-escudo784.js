'use strict';
/** v7.84 — ESCUDO VIVO: autoDL + aviso curto + PV sem inventar */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const AD = require('../src/bot/autoDl');
const LP = require('../src/bot/linkPolicy');
const B = require('../src/aura/auraBrain');

// ── 1. plataformas reconhecidas ──
const casos = [
  ['https://youtube.com/watch?v=1', 'youtube'], ['https://youtu.be/abc', 'youtube'],
  ['https://www.tiktok.com/@x/video/1', 'tiktok'], ['https://vm.tiktok.com/ab', 'tiktok'],
  ['https://kwai.com/video/9', 'kwai'], ['https://s.kw.ai/x', 'kwai'],
  ['https://instagram.com/p/ab', 'instagram'], ['https://facebook.com/watch', 'facebook'],
  ['https://fb.watch/xx', 'facebook'], ['https://x.com/u/status/1', 'twitter'],
  ['https://t.co/ab', 'twitter'], ['https://open.spotify.com/track/1', 'spotify'],
  ['https://soundcloud.com/a/b', 'soundcloud'],
  ['https://evil.org/x', null], ['https://chat.whatsapp.com/Abc', null],
];
for (const [u, p] of casos) check('plataforma ' + u.replace('https://', '').slice(0, 22), AD.plataformaDe(u) === p, AD.plataformaDe(u));

// ── 2. primeiro link suportado ──
check('picks yt among mixed', AD.primeiroSuportado('olha https://evil.org e https://youtu.be/abc').plataforma === 'youtube');
check('sem link → null', AD.primeiroSuportado('bom dia malta') === null);
check('só whatsapp → null', AD.primeiroSuportado('https://chat.whatsapp.com/Abcdefghij1234567890') === null);

// ── 3. aviso curto e humano ──
const n1 = LP.notice({ sender: '999', deleted: true, warns: 1, maxWarns: 2 });
check('aviso ≤4 linhas', n1.split('\n').length <= 4, n1);
check('aviso tem 🛡️ + fora da lista + aceites', n1.includes('🛡️') && n1.includes('fora da lista') && n1.includes('aceites:'));
check('aviso sem bloco gigante antigo', !n1.includes('DARK BOT · ESCUDO DE LINKS') && !n1.includes('Partilha conteúdo permitido'));
const n2 = LP.notice({ sender: '999', kickAttempted: true, removed: true });
check('kick confirmado curto', n2.includes('removido — a regra do grupo manda'));
const n3 = LP.notice({ sender: '999', deleted: false, deleteEnabled: false });
check('remoção desligada dito', n3.includes('remoção desligada'));

// ── 4. router de catálogo cobre as frases do print ──
check('print: resumo dos grupos', B.detectarCapacidade('Me diga o que aconteceu nos grupos')?.id === 'resumo_grupos');
check('print: partilhar contacto', B.detectarCapacidade('Diga lá pra me adicionar lá partilha o meu contacto')?.id === 'partilhar_contacto');

// ── 5. cooldown exportado ──
check('cooldown 20s', AD.COOLDOWN_MS === 20000);

console.log(`\n${fail ? '💥' : '🎉'} ESCUDO-784: ${ok} OK / ${fail} FALHOU\n`);
process.exit(fail ? 1 : 0);
