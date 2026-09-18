'use strict';
// v7.50 — AUDITORIA PÚBLICA: o que cada comando dos menus ENTREGA a um FREE.
// ✅ entrega | 🔒 recusa limpa | ⌨️ precisa args | 🔑 precisa key | ❌ erro/crash (falha)
// GIFs stubados (sem rede) p/ velocidade — o fetch real tem timeout próprio (GIF_TIMEOUT_MS).
process.env.OWNER_NUMBER = '244900000001';
const fs = require('fs');
const Module = require('module'); const orig = Module.prototype.require;
const store = new Map();
const w = (v) => { const p = Promise.resolve(v); p.lean = () => p; p.select = () => p; p.sort = () => p; p.limit = () => p; p.catch = () => p; return p; };
const fakeDoc = () => { const d = store.get('gs') || { groupJid: 'g', save: async function () { store.set('gs', this); }, antilinkWhitelist: [] }; store.set('gs', d); return d; };
Module.prototype.require = function (id) {
  if (/gifHelper/.test(id)) return { sendWithGif: async (sock, msg, ctx, text, mentions) => sock.sendMessage(ctx.remoteJid, { text, mentions: mentions || [] }, { quoted: msg }) };
  if (/RPGPlayer/.test(id)) { const P = () => ({ name: 'Zeca', level: 5, xp: 0, xpNext: 750, hp: 150, maxHp: 150, mp: 80, maxMp: 80, coins: 2500, bank: 0, lives: 3, race: 'saiyajin', class: 'guerreiro', stats: { str: 8, dex: 6, int: 6, vit: 8, luk: 6 }, inventory: [], reputation: 0, deaths: 0, kills: 0, bank: 0, title: '', save: async () => {} }); return { find: () => w([]), findOne: () => w(P()), findOneAndUpdate: async () => P(), create: async () => P() }; }
  if (/models[\\/\\\\]GroupSettings/.test(id)) return { findOne: () => w(fakeDoc()), findOneAndUpdate: async () => fakeDoc(), updateOne: async () => ({}), create: async () => fakeDoc() };
  if (/models[\\/\\\\]/.test(id)) return { find: () => w([]), findOne: () => w(null), findOneAndUpdate: async () => null, countDocuments: async () => 0, create: async () => ({}), updateOne: async () => ({}), deleteMany: async () => ({}), deleteOne: async () => ({}), getOrCreate: async () => ({ coins: 100, bank: 0, aura: 0, xp: 0, level: 1, hp: 100, maxHp: 100, wins: 0, losses: 0, totalEarned: 0, businessTier: 'iniciante', inventory: [], lastDaily: 0, save: async () => {}, addXp() {}, name: 'Zeca' }), get: async (k, d) => d, set: async () => {} };
  if (String(id).endsWith('botConfigCache')) return { get: async (k, d) => d, set: async () => {}, clear: () => {}, refresh: async () => {} };
  return orig.apply(this, arguments);
};
const R = (p) => require('../src/bot/' + p);
const sd = R('submenuData'); const ch = R('caseHandler'); ch.loadCases();
const config = require('../src/config');
const nc = R('nativeCommands');
const pkg = { ...R('packages/interactions'), ...R('packages/family'), ...R('packages/economy'), ...R('packages/games'), ...R('packages/cheats') };
const all = [...new Set([...ch.CASES.keys(), ...Object.keys(nc), ...Object.keys(pkg)])];
const subs = sd.getAllSubmenus(all);

const HEADLINERS = ['menu', 'ajuda', 'help', 'ping', 'perfil', 'dono', 'regras', 'info', 'bot', 'aura',
  'rpgstart', 'rg', 'lutar', 'loja', 'missoes', 'rankrpg', 'trabalhar', 'diaria',
  'sticker', 'tourl', 'play', 'tiktok', 'ig', 'fb', 'mediaup', 'medialist',
  'ban', 'kick', 'mute', 'antilink', 'bemvindo', 'grupo',
  'jogodavelha', 'forca', 'quiz', 'dado', 'ppt',
  ' Rank ', 'level', 'daily', 'carteira', 'loja'];

function mkCtx(free) {
  const n = free ? '244911111111' : '244900000001';
  return {
    remoteJid: '120363@g.us', isGroup: true, senderJid: n + '@s.whatsapp.net', senderNumber: n,
    pushName: free ? 'Zeca' : 'Dono', isOwner: !free, isPrimaryOwner: !free, isAdmin: !free,
    groupName: 'Grupo Teste',
    prefix: '!', groupMeta: { subject: 'Grupo Teste', participants: [{ id: n + '@s.whatsapp.net', admin: free ? null : 'superadmin' }] },
  };
}
async function run(cmd, free) {
  const sent = [];
  const ctx = mkCtx(free); ctx.sock = null;
  const sock = {
    user: { id: '244900000002:1@s.whatsapp.net' },
    sendMessage: async (j, content) => { sent.push(content); return { key: { id: 'x' } }; },
    groupMetadata: async () => ({ subject: 'Grupo Teste', participants: [] }), relayMessage: async () => { sent.push({ _relay: true }); },
  };
  ctx.sock = sock;
  const msg = { key: { remoteJid: ctx.remoteJid, participant: ctx.senderJid, id: 'M' }, pushName: ctx.pushName, message: { conversation: '!' + cmd } };
  const reply = (t) => sock.sendMessage(ctx.remoteJid, { text: t });
  try {
    const ran = await Promise.race([
      ch.runCase(cmd, { sock, msg, ctx, args: [], text: '', q: '', prefix: '!', isOwner: !free, reply, command: cmd, from: ctx.remoteJid, sender: ctx.senderJid, config }),
      // v7.94: categorias de figurinhas = rede (Sticker.ly) + encode animado — 15s
      new Promise(r => setTimeout(() => r('timeout'), /^fig(anime|coreana|desenho|emoji|engracada|meme|raiva|roblox)/.test(cmd) ? 15000 : 5000)),
    ]);
    if (ran === 'timeout') return { status: 'TIMEOUT', sent };
    if (!ran && (nc[cmd] || pkg[cmd])) {
      await Promise.race([
        (nc[cmd] || pkg[cmd])({ sock, msg, ctx, args: [], isOwner: !free, fillVars: (t) => t, config }),
        new Promise(r => setTimeout(r, 5000)),
      ]);
    }
    return { status: 'RAN', sent };
  } catch (e) { return { status: 'CRASH', err: e.message, sent }; }
}
const SILENCIO_OK = new Set(['menuowner', 'menudono', 'menusystem', 'gifreact', 'buscalivro']);
function classify(cmd, res) {
  if (res.status === 'CRASH') return ['❌', 'CRASH: ' + (res.err || '').slice(0, 80)];
  if (res.status === 'TIMEOUT') return ['❌', 'TIMEOUT 5s'];
  const texts = res.sent.map(s => s.text || s.caption || '').join('\n');
  const hasMedia = res.sent.some(s => s.image || s.video || s.audio || s.document || s.sticker || s.cover || s.ptv || s.gif);
  const hasInteractive = res.sent.some(s => s._relay || s.buttons || s.list || s.templateMessage || s.interactiveMessage || s.viewOnceMessage || s.pollCreationMessage || s.contact || s.contactsArray || s.location || s.liveLocation);
  if (hasInteractive && !texts.trim()) return ['✅', 'interativo'];
  if (!texts.trim() && !hasMedia) {
    if (SILENCIO_OK.has(cmd)) return ['🔇', 'silencio intencional (dono-only)'];
    if (res.sent.length) return ['❌', 'so-react: ' + JSON.stringify(res.sent.map(x => Object.keys(x))).slice(0, 80)];
    return ['❌', 'sem resposta'];
  }
  if (/TypeError|ReferenceError|Cannot read|at Object\.|at async|\.js:\d+:\d+/i.test(texts)) return ['❌', 'stack/vazamento: ' + texts.slice(0, 80)];
  if (/(^|[^a-z])undefined([^a-z]|$)/i.test(texts)) return ['❌', 'undefined no texto'];
  if (/só (o )?dono|apenas (o )?dono|owner only|🚫/i.test(texts)) return ['🔒', 'só dono'];
  if (/só admin|apenas admin|admin only|precisas ser admin/i.test(texts)) return ['🔒', 'só admin'];
  if (/só vip|apenas vip|aderir|premium/i.test(texts)) return ['🔒', 'vip/premium'];
  if (/API.?key|configura.*key|sem key|key inválida|quota|limite (de )?uso|tenta mais tarde/i.test(texts)) return ['🔑', 'precisa key/cota'];
  if (/uso:|use:|exemplo:|sintaxe:|diz-me|responde (a|com)|marca (a|um)|envia (a|um)/i.test(texts)) return ['⌨️', 'precisa input'];
  if (hasMedia && texts.trim().length < 20) return ['✅', 'mídia'];
  return ['✅', (texts.split('\n')[0] || 'mídia').slice(0, 70)];
}
(async () => {
  const rows = [];
  const seen = new Set();
  const queue = [];
  for (const [c, data] of Object.entries(subs)) {
    if (c === 'owner') continue;
    for (const it of data.items) {
      const cmd = String(it.cmd || '').trim().toLowerCase();
      if (!cmd || seen.has(cmd)) continue;
      seen.add(cmd);
      queue.push([c, cmd]);
    }
  }
  for (const h of HEADLINERS.map(s => s.trim().toLowerCase())) {
    if (!seen.has(h) && all.includes(h)) { seen.add(h); queue.push(['head', h]); }
  }
  // Warmup sharp (cold-start nativo ~4s uma vez por processo; em prod quente é ms).
  try { const sharp = require('sharp'); await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).png().toBuffer(); } catch {}
  console.log(`Auditando ${queue.length} comandos como FREE...`);
  let fails = 0;
  for (const [c, cmd] of queue) {
    fs.appendFileSync('/tmp/auditpub.progress', c + ':' + cmd + '\n');
    const res = await run(cmd, true);
    const [flag, note] = classify(cmd, res);
    if (flag === '❌') fails++;
    rows.push({ c, cmd, flag, note });
  }
  const cats = {};
  for (const r of rows) { (cats[r.c] = cats[r.c] || []).push(r); }
  for (const [c, items] of Object.entries(cats)) {
    const bad = items.filter(i => i.flag === '❌');
    console.log(`\n══ ${c} (${items.length}) ✅${items.filter(i => i.flag === '✅').length} 🔒${items.filter(i => i.flag === '🔒').length} ⌨️${items.filter(i => i.flag === '⌨️').length} 🔑${items.filter(i => i.flag === '🔑').length} 🔇${items.filter(i => i.flag === '🔇').length} ❌${bad.length}`);
    for (const b of bad) console.log(`  ❌ ${b.cmd} — ${b.note}`);
  }
  const okAll = rows.filter(r => r.flag !== '❌').length;
  console.log(`\n${fails ? '💥' : '🎉'} AUDIT-PUBLICO: ${okAll} OK / ${fails} FALHOU (total ${rows.length})\n`);
  process.exit(fails ? 1 : 0);
})();
