'use strict';
/** v7.85 — ESCUDO À MEDIDA: redes por grupo, grupos/canais WA, aviso só com o permitido */
// sem config real (dotenv) — o antiLink só precisa do dono
const Module = require('module');
const origReq = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === '../config') return { owner: { number: '244900000001' } };
  return origReq.apply(this, arguments);
};
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const LP = require('../src/bot/linkPolicy');
const AL = require('../src/bot/antiLink');
const AD = require('../src/bot/autoDl');

// ── 1. parseRedes ──
check('parse yt tiktok', JSON.stringify(LP.parseRedes(['yt', 'tiktok']).redes) === '["youtube","tiktok"]');
check('parse off → []', JSON.stringify(LP.parseRedes(['off']).redes) === '[]');
check('parse all → null', LP.parseRedes(['all']).redes === null);
check('parse banana → erro', LP.parseRedes(['banana']).erro === 'banana');
check('parse ig/insta/x', JSON.stringify(LP.parseRedes(['ig', 'x']).redes) === '["instagram","twitter"]');

// ── 2. rotuloPara ──
check('rotulo default tem tudo', LP.rotuloPara(null) === 'yt · fb · kwai · threads · spotify · tiktok · x · ig');
check('rotulo só yt', LP.rotuloPara(['youtube']) === 'yt');
check('rotulo sem redes + grupos', LP.rotuloPara([], { grupos: true }) === 'grupos');
check('rotulo sem nada → vazio', LP.rotuloPara([]) === '');

// ── 3. detectLink com base dinâmica ──
check('grupo sem redes: yt viola', AL.detectLink('https://youtube.com/w?v=1', 'smart', true, [], { base: [] }).hit === true);
check('grupo sem redes: tiktok viola', AL.detectLink('https://tiktok.com/@a/video/1', 'smart', true, [], { base: [] }).hit === true);
check('grupo só yt: yt livre', AL.detectLink('https://youtube.com/w?v=1', 'smart', true, [], { base: LP.dominiosPara(['youtube']) }).hit === false);
check('grupo só yt: tiktok viola', AL.detectLink('https://tiktok.com/@a/video/1', 'smart', true, [], { base: LP.dominiosPara(['youtube']) }).hit === true);
check('default: yt livre', AL.detectLink('https://youtube.com/w?v=1', 'smart').hit === false);

// ── 4. grupos / canais do WhatsApp ──
const G = 'entra lá chat.whatsapp.com/Abcdefghij1234567890';
const C = 'segue whatsapp.com/channel/Abcdefghijklm1234';
check('convite de grupo barra por default', AL.detectLink(G, 'smart').hit === true);
check('convite de grupo aceite c/ grupos on', AL.detectLink(G, 'smart', true, [], { waGrupos: true }).hit === false);
check('canal continua barrado c/ só grupos on', AL.detectLink(C, 'smart', true, [], { waGrupos: true }).hit === true);
check('canal aceite c/ canais on', AL.detectLink(C, 'smart', true, [], { waCanais: true }).hit === false);
check('grupos on não liberta redes', AL.detectLink('https://tiktok.com/@a/1', 'smart', true, [], { waGrupos: true, base: [] }).hit === true);

// ── 5. aviso só mostra o permitido ──
const n0 = LP.notice({ sender: '9', deleted: true, aceites: '' });
check('aviso sem redes: 🚫 e sem lista', n0.includes('não aceita links') && !n0.includes('aceites:'));
const n1 = LP.notice({ sender: '9', deleted: true, aceites: 'yt · tiktok' });
check('aviso só com as do grupo', n1.includes('aceites: yt · tiktok') && !n1.includes('spotify'));
const n2 = LP.notice({ sender: '9', deleted: true, aceites: 'yt' , autoDl: true});
check('autoDL só com redes', n2.includes('DARK DL') && !LP.notice({ sender: '9', deleted: true, aceites: '', autoDl: true }).includes('DARK DL'));

// ── 6. autoDL respeita redes do grupo ──
check('autoDL c/ grupo sem redes não baixa yt', AD.primeiroSuportado('https://youtu.be/abc', []) === null);
check('autoDL c/ só tiktok ignora yt', AD.primeiroSuportado('https://youtu.be/abc', ['tiktok']) === null);
check('autoDL c/ só tiktok baixa tiktok', AD.primeiroSuportado('https://tiktok.com/@a/1', ['tiktok'])?.plataforma === 'tiktok');
check('autoDL default baixa yt', AD.primeiroSuportado('https://youtu.be/abc', null)?.plataforma === 'youtube');

console.log(`\n${fail ? '💥' : '🎉'} ESCUDO-785: ${ok} OK / ${fail} FALHOU\n`);
process.exit(fail ? 1 : 0);
