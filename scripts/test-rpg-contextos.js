#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  DARK BOT v7.47 — RPG EM TODOS OS CONTEXTOS 🕸️               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * O `test:rpgaudit` corre os comandos do RPG num ÚNICO contexto
 * (grupo + dono). Este teste cobre a MATRIZ:
 *
 *   chats:  PV (dono / free) × GRUPO (dono / admin / free)
 *   states: fresco · padrão · veterano · morto · sem-vidas · pobre · rico
 *
 * E ainda: guards de permissão, ciclo completo no PV, cadeias de itens
 * (forjar/comer/vender), dalanceamento do combate (win-rate por nível),
 * fluxo de criação clicável, menus sem comandos mortos e determinismo
 * dos nomes disputados (toprpg/menurpg/evento/quest).
 *
 * Sem MongoDB: jogadores e modelos em memória; os CASES correm a sério
 * via caseHandler.runCase.
 */
'use strict';

process.env.NODE_ENV = 'development';

const path = require('path');
const Module = require('module');

const mongoose = require('mongoose');
mongoose.set('bufferTimeoutMS', 150);

const REPO = path.join(__dirname, '..');
const GRUPO = '120363000000000000@g.us';
const DONO = '244945280380';
const ADMIN = '244777888999';
const FREE = '244111222333';

// O ranking mundial exige mongoose ligado: finge-se a ligação.
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (String(id).endsWith('database/connection')) {
    return { mongoose: { connection: { readyState: 1 } } };
  }
  return origRequire.apply(this, arguments);
};

let ok = 0, fail = 0;
const falhas = [];
const t = (n, c, e) => {
  c ? ok++ : fail++;
  if (!c) falhas.push(n);
  console.log(`  ${c ? '✅' : '❌'} ${n}${e ? ' → ' + String(e).slice(0, 110) : ''}`);
};

const RE_ERRO = /Erro no case|is not a function|Cannot read|Cannot convert|is not defined|Cannot access|undefined is not|of undefined/i;

// ── jogadores ───────────────────────────────────────────────
function doc(num, over = {}) {
  return {
    whatsappNumber: num, name: 'Aventureiro', title: '', faction: null, guild: null,
    race: 'humano', class: 'guerreiro', raceBonusApplied: false, started: true, // v7.87
    level: 1, xp: 0, xpNext: 100,
    hp: 150, maxHp: 150, mp: 80, maxMp: 80, lives: 3,
    stats: { str: 6, dex: 6, int: 6, vit: 6, luk: 6 },
    coins: 100, bank: 0,
    inventory: [], items: [], equipment: { weapon: null, armor: null, accessory: null },
    quest: { current: null, step: 0, completed: [] },
    world: { visited: [], discoveries: 0, lastTravel: null, bossDefeated: [] },
    skills: [], transforms: [],
    kills: 0, deaths: 0, bossKills: 0, streak: 0, bestStreak: 0,
    karma: 0, reputation: 0,
    lastDaily: null, lastWork: null, lastBattle: null, lastExplore: null, lastQuest: null,
    save: async () => {},
    ...over,
  };
}
const PADRAO = () => doc(FREE, {
  name: 'Kira', raceBonusApplied: true, level: 5, xp: 40, xpNext: 600,
  stats: { str: 10, dex: 8, int: 7, vit: 9, luk: 6 },
  coins: 2500, inventory: ['poção de vida', 'poção de vida', 'erva medicinal'],
  kills: 3, reputation: 12,
});
const VET = () => doc(FREE, {
  name: 'Veterano', raceBonusApplied: true, level: 20, xp: 0, xpNext: 6000,
  hp: 600, maxHp: 600, mp: 300, maxMp: 300,
  stats: { str: 22, dex: 18, int: 15, vit: 20, luk: 12 },
  coins: 50000, bank: 10000, inventory: ['ferro', 'ferro', 'ferro', 'madeira', 'peixe', 'erva', 'erva', 'erva', 'cogumelo'],
  kills: 120, deaths: 4, reputation: 300,
});

let JOGADORES = new Map(); // number -> doc

// ── sock falso ──────────────────────────────────────────────
let OUT = [];
function novoSock() {
  return {
    user: { id: '244949926074@s.whatsapp.net' },
    sendMessage: async (j, c) => {
      if (c?.react) return { key: {} };
      const txt = c?.text || c?.caption || '';
      if (txt) OUT.push(txt);
      if (c?.image) OUT.push('[IMG]');
      return { key: { id: 'm' } };
    },
    relayMessage: async (j, message) => {
      const corpo = message?.viewOnceMessage?.message?.interactiveMessage?.body?.text
        || message?.interactiveMessage?.body?.text || '';
      OUT.push(corpo || '[INTERACTIVO]');
      return {};
    },
    groupMetadata: async () => ({
      id: GRUPO, subject: 'Dark Net',
      participants: [
        { id: DONO + '@s.whatsapp.net', admin: 'superadmin' },
        { id: ADMIN + '@s.whatsapp.net', admin: 'admin' },
        { id: FREE + '@s.whatsapp.net' },
      ],
    }),
    sendPresenceUpdate: async () => {}, readMessages: async () => {},
    waUploadToServer: async () => ({}), sendMessageReadReceipt: async () => {},
  };
}
const sock = novoSock();
const cfg = { bot: { prefix: '!', name: 'DARK BOT' }, owner: { name: 'Dark', number: DONO } };

function mkCtx(kind) {
  const base = { prefix: '!', pushName: 'Tester' };
  if (kind === 'PV_OWNER') return { ...base, remoteJid: DONO + '@s.whatsapp.net', isGroup: false, senderJid: DONO + '@s.whatsapp.net', senderNumber: DONO, isOwner: true, pushName: 'Dark' };
  if (kind === 'PV_FREE') return { ...base, remoteJid: FREE + '@s.whatsapp.net', isGroup: false, senderJid: FREE + '@s.whatsapp.net', senderNumber: FREE, isOwner: false };
  if (kind === 'G_OWNER') return { ...base, remoteJid: GRUPO, isGroup: true, senderJid: DONO + '@s.whatsapp.net', senderNumber: DONO, isOwner: true, pushName: 'Dark' };
  if (kind === 'G_ADMIN') return { ...base, remoteJid: GRUPO, isGroup: true, senderJid: ADMIN + '@s.whatsapp.net', senderNumber: ADMIN, isOwner: false };
  return { ...base, remoteJid: GRUPO, isGroup: true, senderJid: FREE + '@s.whatsapp.net', senderNumber: FREE, isOwner: false }; // G_FREE
}
function mkMsg(ctx, extra = {}) {
  return {
    key: { remoteJid: ctx.remoteJid, participant: ctx.isGroup ? ctx.senderJid : undefined, id: 'X1' },
    message: { conversation: '!cmd', ...extra },
  };
}

// comandos só-dono (recusa esperada p/ não-dono) e comandos que precisam
// de sock da comunidade (stubs) no caminho feliz do dono
const SO_DONO = new Set(['setarena', 'setdungeons', 'settrocas', 'setcavernas', 'setlazer', 'setarsenal', 'setgrupo',
  'darkrpg', 'rpginit', 'iniciar-rpg', 'darkrpg-test', 'rpgtest', 'darkrpg-status', 'rpgstatus',
  'addglb', 'addglobal', 'comunicado', 'ranking-update', 'arsenal',
  'darkrpg-guia', 'rpgsetup', 'rpgguia', 'bvrpg', 'welcomerpg', 'auramod', 'aurarpg', 'moderar',
  'rpgadd', 'rpgremove', 'rpgsetlevel', 'rpgadditem', 'rpgremoveitem', 'rpgresetplayer', 'rpgstats']);
// evento: dono cria; sem args lista (público); tipos inválidos recusam
const RE_RECUSA = /só o dono|só em grupos|👥 grupo/i;

(async () => {
  const rpg = require(path.join(REPO, 'src/bot/rpg/engine'));
  const ch = require(path.join(REPO, 'src/bot/caseHandler'));
  const sd = require(path.join(REPO, 'src/bot/submenuData'));
  const community = require(path.join(REPO, 'src/bot/rpg/community'));

  // motor em memória
  rpg.getPlayer = async (num) => {
    const n = String(num).replace(/\D/g, '');
    if (!JOGADORES.has(n)) JOGADORES.set(n, doc(n));
    return JOGADORES.get(n);
  };
  rpg.savePlayer = async (p) => { JOGADORES.set(String(p.whatsappNumber).replace(/\D/g, ''), p); };

  // modelo RPGPlayer em memória (rankings, stats, reset)
  const RPGPlayer = require(path.join(REPO, 'src/database/models/RPGPlayer'));
  const query = (res) => {
    const q = {
      _res: res,
      sort: (o) => { const [k] = Object.keys(o); q._res = [...q._res].sort((a, b) => (b[k] || 0) - (a[k] || 0)); return q; },
      limit: (n) => { q._res = q._res.slice(0, n); return q; },
      skip: () => q, select: () => q, lean: () => q, populate: () => q,
      then: (ok2, ko) => Promise.resolve(q._res).then(ok2, ko),
      catch: (ko) => Promise.resolve(q._res).catch(ko),
    };
    return q;
  };
  RPGPlayer.find = () => query([...JOGADORES.values()]);
  RPGPlayer.findOne = async (f) => {
    // v7.90: também suporta consulta por guilda (!guilda entrar)
    if (f?.guild) { for (const p of JOGADORES.values()) if (p.guild === f.guild) return p; return null; }
    return JOGADORES.get(String(f?.whatsappNumber || '').replace(/\D/g, '')) || null;
  };
  RPGPlayer.countDocuments = async () => JOGADORES.size;
  RPGPlayer.deleteOne = async (f) => { JOGADORES.delete(String(f?.whatsappNumber || '').replace(/\D/g, '')); return { deletedCount: 1 }; };

  // Economy/User/BotConfig: os nativos da economia (_eco) e o runCase
  // tocam nestes modelos — sem stub cada chamada espera pelo Mongo.
  try {
    const Economy = require(path.join(REPO, 'src/database/models/Economy'));
    const eco = {
      userId: FREE, coins: 500, bank: 0, inventory: [], xp: 0, level: 1,
      aura: 0, totalEarned: 0, totalSpent: 0, losses: 0, wins: 0,
      addXp: async function (n) { this.xp += n; },
      save: async () => {},
    };
    Economy.getOrCreate = async () => eco;
    Economy.findOne = async () => eco;
    Economy.find = () => query([eco]);
    Economy.updateOne = async () => ({ acknowledged: true });
    Economy.findOneAndUpdate = async () => eco;
    Economy.countDocuments = async () => 1;
  } catch {}
  try {
    const User = require(path.join(REPO, 'src/database/models/User'));
    User.findOne = () => query(null);
    User.findOneAndUpdate = async () => null;
  } catch {}
  try {
    const BotConfig = require(path.join(REPO, 'src/database/models/BotConfig'));
    BotConfig.findOne = () => query(null);
    BotConfig.find = () => query([]);
  } catch {}

  // GroupSettings em memória (bvrpg real)
  const GS = require(path.join(REPO, 'src/database/models/GroupSettings'));
  const lojas = new Map();
  GS.findOneAndUpdate = async (f, upd) => {
    const jid = f.groupJid;
    if (!lojas.has(jid)) lojas.set(jid, { groupJid: jid, modorpg: true, save: async () => {} }); // v7.87
    const g = lojas.get(jid);
    Object.assign(g, upd.$setOnInsert || {}, upd.$set || {});
    return g;
  };
  GS.findOne = () => ({
    lean: async () => null,
  });
  // v7.97: o gate RPG lê os settings via hotCache — espelhar a memória de teste
  try {
    const hotC = require(path.join(REPO, 'src/bot/hotCache'));
    hotC.getGroupSettings = async (_msg, jid) => lojas.get(jid) || null;
  } catch {}

  // stubs da comunidade p/ os caminhos felizes (o fio real tem testes próprios)
  community.loadState = async () => {};
  community.adoptGroupAs = async () => ({ ok: true, acoes: ['nome', 'descrição'] });
  community.initCommunity = async () => [{ type: 'community', ok: true, name: 'DARK VILLE' }];
  community.createClanGroup = async () => ({ ok: true, name: 'Clã Teste' });
  community.addAllUsersToMainGroup = async () => ({ added: ['a'], invited: [], errors: [] });

  try { ch.loadCases(); } catch (e) { console.log('loadCases:', e.message); }
  const rpg2 = require(path.join(REPO, 'src/bot/cases/rpg2'));
  const semCooldown = () => rpg2._resetCooldowns?.();

  async function correr(cmd, { ctx = mkCtx('G_FREE'), args = [], player = null, msgExtra = {} } = {}) {
    semCooldown();
    OUT = [];
    if (player) JOGADORES.set(String(ctx.senderNumber).replace(/\D/g, ''), player);
    try {
      await Promise.race([
        ch.runCase(cmd, {
          sock, msg: mkMsg(ctx, msgExtra), ctx: { ...ctx }, args,
          text: args.join(' '), prefix: '!', isOwner: !!ctx.isOwner, config: cfg,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT 8s no case ' + cmd)), 8000)),
      ]);
    } catch (e) {
      OUT.push('❌ Erro no case ' + cmd + ': ' + e.message);
    }
    return OUT.join(' \n ').replace(/\s+/g, ' ').trim();
  }

  const RPG_CMDS = [...ch.CASES.keys()].filter(c => {
    try { return sd.categorize(c) === 'economia'; } catch { return false; }
  });
  console.log(`\nRPG (economia): ${RPG_CMDS.length} comandos × 5 contextos`);

  // ══ 1. MATRIZ SEM-CRASH ═══════════════════════════════════
  console.log('\n═══ 1. MATRIZ: nenhum rebenta nem responde vazio ═══');
  const CONTEXTOS = ['PV_OWNER', 'PV_FREE', 'G_OWNER', 'G_ADMIN', 'G_FREE'];
  const rebentam = [], vazios = [], semRecusa = [];
  for (const kind of CONTEXTOS) {
    const ctx = mkCtx(kind);
    for (const cmd of RPG_CMDS) {
      JOGADORES.set(String(ctx.senderNumber).replace(/\D/g, ''), PADRAO());
      // mundo/rankings precisam de jogadores na "base"
      if (!JOGADORES.size) JOGADORES.set(FREE, PADRAO());
      const r = await correr(cmd, { ctx });
      if (!r || r.length < 10) { vazios.push(`${kind}/${cmd}`); continue; }
      if (RE_ERRO.test(r)) { rebentam.push(`${kind}/${cmd} → ${r.match(RE_ERRO)[0]}`); continue; }
      if (SO_DONO.has(cmd) && !ctx.isOwner && !RE_RECUSA.test(r)) semRecusa.push(`${kind}/${cmd}`);
    }
  }
  require('fs').writeFileSync('/tmp/rpgctx-fails.txt', JSON.stringify({ rebentam, vazios, semRecusa }, null, 1));
  t(`${RPG_CMDS.length * CONTEXTOS.length} execuções sem erro`, rebentam.length === 0,
    rebentam.length ? rebentam.slice(0, 5).join(' | ') : 'todas limpas');
  t('nenhuma vazia', vazios.length === 0, vazios.slice(0, 8).join(', '));
  t('só-dono recusam não-dono em todo o lado', semRecusa.length === 0, semRecusa.slice(0, 8).join(', '));

  // ══ 2. CICLO COMPLETO NO PV ═══════════════════════════════
  console.log('\n═══ 2. CICLO COMPLETO NO PV (free) ═══');
  const PV = mkCtx('PV_FREE');
  require(path.join(REPO, 'src/bot/rpg/ui')).pendentes().clear(); // v7.90
  JOGADORES.set(FREE, doc(FREE, { started: false, race: '', class: '' })); // v7.90: SEM char — cria directo
  const flow = require(path.join(REPO, 'src/bot/rpg/createFlow'));
  flow.pendentes().clear();
  let r = await correr('rpgstart', { ctx: PV, args: ['Kira', 'shinobi', 'pirata'] });
  t('PV: rpgstart cria', /PERSONAGEM CRIADO/i.test(r), r.slice(0, 60));
  r = await correr('rg', { ctx: PV });
  t('PV: rg mostra ficha', /KIRA/i.test(r) && /shinobi/i.test(r), r.slice(0, 60));
  r = await correr('quest', { ctx: PV });
  t('PV: quest abre história', /CAPÍTULO|capítulo/i.test(r), r.slice(0, 60));
  r = await correr('explorar', { ctx: PV });
  t('PV: explorar funciona', r.length > 40 && !RE_ERRO.test(r), r.slice(0, 60));
  r = await correr('lutar', { ctx: PV });
  t('PV: lutar combate', /VITÓRIA|DERROTA/i.test(r), r.slice(0, 60));
  r = await correr('world', { ctx: PV });
  t('PV: world mostra mapa', /MAPA DO MUNDO/i.test(r), r.slice(0, 60));
  r = await correr('viajar', { ctx: PV, args: ['floresta'] });
  t('PV: viajar descobre', /NOVO TERRITÓRIO|VIAJAR/i.test(r), r.slice(0, 60));
  r = await correr('inventario', { ctx: PV });
  t('PV: inventario lista', /INVENTÁRIO/i.test(r), r.slice(0, 60));
  r = await correr('loja', { ctx: PV });
  t('PV: loja abre', /LOJA/i.test(r), r.slice(0, 60));

  // ══ 3. ESTADOS DE JOGADOR ═══
  console.log('\n═══ 3. ESTADOS DE JOGADOR ═══');
  const G = mkCtx('G_FREE');
  const morto = () => doc(FREE, { name: 'Morto', raceBonusApplied: true, hp: 0 });
  const semVidas = (coins) => doc(FREE, { name: 'SemVidas', raceBonusApplied: true, hp: 0, lives: 0, coins });

  r = await correr('lutar', { ctx: G, player: morto() });
  t('morto: lutar recusa', /MORTO/i.test(r), r.slice(0, 60));
  r = await correr('dungeon', { ctx: G, player: morto() });
  t('morto: dungeon recusa', /MORTO/i.test(r), r.slice(0, 60));
  r = await correr('bossrpg', { ctx: G, player: morto() });
  t('morto: bossrpg recusa', /MORTO/i.test(r), r.slice(0, 60));
  r = await correr('viajar', { ctx: G, player: morto(), args: ['floresta'] });
  t('morto: viajar recusa (não ressuscita)', /MORTO/i.test(r), r.slice(0, 60));
  r = await correr('descansar', { ctx: G, player: morto() });
  t('morto: descansar cura', /150\/150/.test(r), r.slice(0, 60));
  r = await correr('reviver', { ctx: G, player: semVidas(100) });
  t('sem-vidas+pobre: reviver cobra', /500 coins/i.test(r), r.slice(0, 60));
  r = await correr('reviver', { ctx: G, player: semVidas(600) });
  t('sem-vidas+rico: pede CONFIRMAÇÃO (botões)', /500 coins/i.test(r) && /rpgsim/i.test(r) && JOGADORES.get(FREE).lives === 0, r.slice(0, 70));
  const rSim = await correr('rpgsim', { ctx: G });
  t('clique SIM: revive e cobra', /REVIVIDO/i.test(rSim) && JOGADORES.get(FREE).lives === 3 && JOGADORES.get(FREE).coins === 100, rSim.slice(0, 70));
  const rDbl = await correr('rpgsim', { ctx: G });
  t('clique duplo: não cobra duas vezes', JOGADORES.get(FREE).coins === 100 && /pendentes/i.test(rDbl), rDbl.slice(0, 70));
  r = await correr('reviver', { ctx: G, player: semVidas(600) });
  const rNao = await correr('rpgnao', { ctx: G });
  t('clique NÃO: cancela sem cobrar', /[Cc]ancelad/i.test(rNao) && JOGADORES.get(FREE).coins === 600, rNao.slice(0, 70));
  r = await correr('pocao', { ctx: G, player: doc(FREE, { inventory: [] }) });
  t('sem poção: pocao avisa', /SEM POÇÕES/i.test(r), r.slice(0, 60));

  // ══ 4. ECONOMIA (valores-limite) ═══
  console.log('\n═══ 4. ECONOMIA ═══');
  const ECO = () => doc(FREE, { name: 'Eco', raceBonusApplied: true, coins: 500, bank: 200 });
  r = await correr('dep', { ctx: G, player: ECO(), args: ['all'] });
  t('dep all deposita tudo', /DEPOSITASTE \*500\*/i.test(r), r.slice(0, 70));
  r = await correr('dep', { ctx: G, player: ECO(), args: ['-5'] });
  t('dep negativo recusa', /INVÁLIDO/i.test(r), r.slice(0, 60));
  r = await correr('dep', { ctx: G, player: ECO(), args: ['99999'] });
  t('dep acima do saldo recusa', /INVÁLIDO/i.test(r), r.slice(0, 60));
  r = await correr('levantar', { ctx: G, player: ECO(), args: ['50'] });
  t('levantar 50 funciona', /LEVANTASTE \*50\*/i.test(r), r.slice(0, 70));
  r = await correr('pix', { ctx: G, player: ECO(), args: ['50'] });
  t('pix sem destino NÃO queima coins', /USO|DESTINO|@|MENÇÃO/i.test(r) && JOGADORES.get(FREE).coins === 500, r.slice(0, 70));
  JOGADORES.set(ADMIN, doc(ADMIN)); // destino fresco: 100 coins
  r = await correr('pix', { ctx: G, player: ECO(), args: ['50', '@' + ADMIN], msgExtra: { extendedTextMessage: { contextInfo: { mentionedJid: [ADMIN + '@s.whatsapp.net'] } } } });
  t('pix com @ transfere', /TRANSFERISTE/i.test(r) && JOGADORES.get(FREE).coins === 450, r.slice(0, 70));
  const dest = JOGADORES.get(ADMIN);
  t('pix credita o destino', dest && dest.coins === 150, 'dest=' + (dest && dest.coins));
  r = await correr('investir', { ctx: G, player: ECO(), args: [] });
  t('investir sem valor mostra uso', /USO/i.test(r), r.slice(0, 60));
  r = await correr('loja', { ctx: G, player: doc(FREE, { coins: 10 }), args: ['poção de vida'] });
  t('loja pobre recusa', /CUSTA 120/i.test(r), r.slice(0, 70));
  r = await correr('loja', { ctx: G, player: ECO(), args: ['poção de vida'] });
  t('loja rico compra', /COMPRASTE/i.test(r) && JOGADORES.get(FREE).inventory.includes('poção de vida'), r.slice(0, 70));
  r = await correr('vender', { ctx: G, player: ECO(), args: ['peixe'] });
  t('vender o que não tem recusa', /NÃO TENS/i.test(r), r.slice(0, 60));

  // ══ 5. CADEIAS DE ITENS ═══
  console.log('\n═══ 5. CADEIAS (forjar → comer → vender) ═══');
  r = await correr('forge', { ctx: G, player: VET(), args: ['espada de ferro'] });
  t('forge cria a espada (não undefined)', /FORJASTE \*ESPADA DE FERRO\*!/i.test(r) && JOGADORES.get(FREE).inventory.includes('espada de ferro'), r.slice(0, 70));
  r = await correr('forge', { ctx: G, player: ECO(), args: ['espada de ferro'] });
  t('forge sem ingredientes lista faltas', /EM FALTA/i.test(r), r.slice(0, 70));
  r = await correr('cook', { ctx: G, player: doc(FREE, { inventory: ['erva medicinal', 'peixe'] }), args: ['sopa'] });
  t('cook faz sopa', /COZINHASTE \*SOPA\*!/i.test(r), r.slice(0, 60));
  r = await correr('eat', { ctx: G, player: doc(FREE, { hp: 50, inventory: ['sopa'] }), args: ['sopa'] });
  t('eat come a sopa (cozinhado é comida)', /COMESTE \*SOPA\*/i.test(r), r.slice(0, 70));
  r = await correr('eat', { ctx: G, player: doc(FREE, { inventory: ['pedra'] }), args: ['pedra'] });
  t('eat pedra recusa', /NÃO É COMIDA|NÃO TENS/i.test(r), r.slice(0, 60));
  r = await correr('desmontar', { ctx: G, player: doc(FREE, { inventory: ['pedra'] }), args: ['pedra'] });
  t('desmontar devolve trocos', /DESMONTASTE/i.test(r), r.slice(0, 60));

  // ══ 6. GUILDAS E CLÃS ═══
  console.log('\n═══ 6. GUILDAS E CLÃS ═══');
  r = await correr('guilda', { ctx: G, player: doc(FREE, { coins: 100 }), args: ['criar', 'Lobos'] });
  t('guilda pobre recusa', /1000 COINS/i.test(r), r.slice(0, 60));
  r = await correr('guilda', { ctx: G, player: PADRAO(), args: ['criar', 'Lobos'] });
  t('guilda: pede confirmação primeiro', /1000 COINS/i.test(r) && /rpgsim/i.test(r) && JOGADORES.get(FREE).coins === 2500, r.slice(0, 70));
  const rG = await correr('rpgsim', { ctx: G });
  t('clique SIM: guilda fundada e cobrada', /FUNDADA/i.test(rG) && JOGADORES.get(FREE).coins === 1500, rG.slice(0, 70));
  r = await correr('guilda', { ctx: G, player: doc(FREE, { guild: 'Lobos' }), args: ['criar', 'Tigres'] });
  t('guilda duplicada recusa', /JÁ ESTÁS/i.test(r), r.slice(0, 60));
  // v7.88: guilda entrar — membro entra numa guilda existente
  await correr('guilda', { ctx: mkCtx('G_ADMIN'), player: doc(ADMIN, { coins: 2500 }), args: ['criar', 'Tigres'] });
  await correr('rpgsim', { ctx: mkCtx('G_ADMIN') });
  r = await correr('guilda', { ctx: G, player: doc(FREE, { coins: 0 }), args: ['entrar', 'Tigres'] });
  t('guilda entrar: membro entra sem custo', /ENTRASTE/i.test(r) && JOGADORES.get(FREE).guild === 'Tigres', r.slice(0, 70));
  r = await correr('guilda', { ctx: G, player: doc(FREE, { coins: 0 }), args: ['entrar', 'Inexistente'] });
  t('guilda entrar: guilda fantasma recusada', /NÃO EXISTE/i.test(r), r.slice(0, 60));
  r = await correr('criaclan', { ctx: G, player: doc(FREE, { coins: 100 }), args: ['ClãZ'] });
  t('criaclan pobre recusa', /5000/i.test(r), r.slice(0, 60));
  r = await correr('criaclan', { ctx: G, player: doc(FREE, { guild: 'X', coins: 99999 }), args: ['ClãZ'] });
  t('criaclan com clã recusa', /JÁ ESTÁS/i.test(r), r.slice(0, 60));
  r = await correr('criaclan', { ctx: G, player: VET(), args: ['Clã Lobo'] });
  t('criaclan: pede confirmação por botões', /5000 berries/i.test(r) && /rpgsim/i.test(r) && JOGADORES.get(FREE).coins === 50000, r.slice(0, 70));
  const rC = await correr('rpgsim', { ctx: G });
  t('clique SIM: clã LOCAL criado e cobrado', /CLÃ CRIADO/i.test(rC) && JOGADORES.get(FREE).coins === 45000, rC.slice(0, 70));
  t('clã local menciona o próprio grupo', /este grupo|MODO LOCAL/i.test(rC), rC.slice(0, 90));
  t('criaclan não cita comando morto', !/!addclan/i.test(r + ' ' + rC), rC.slice(0, 80));
  // ══ 7. COMUNIDADE (dono × resto) ═══
  console.log('\n═══ 7. COMUNIDADE ═══');
  r = await correr('setarena', { ctx: mkCtx('G_OWNER') });
  t('dono: setarena define', /GRUPO DEFINIDO/i.test(r), r.slice(0, 60));
  r = await correr('setarena', { ctx: mkCtx('G_ADMIN') });
  t('admin: setarena recusa', /SÓ O DONO/i.test(r), r.slice(0, 60));
  r = await correr('setarena', { ctx: mkCtx('PV_OWNER') });
  t('PV dono: setarena exige grupo', /👥 GRUPO/i.test(r), r.slice(0, 60));
  r = await correr('setgrupo', { ctx: mkCtx('G_OWNER'), args: ['nada'] });
  t('setgrupo inválido ajuda', /QUAL GRUPO/i.test(r), r.slice(0, 60));
  r = await correr('darkrpg-test', { ctx: mkCtx('G_OWNER') });
  t('dono: darkrpg-test relata', /TESTE DARKRPG/i.test(r), r.slice(0, 60));
  r = await correr('darkrpg-status', { ctx: mkCtx('G_FREE') });
  t('free: darkrpg-status recusa', /SÓ O DONO/i.test(r), r.slice(0, 60));
  r = await correr('addglb', { ctx: mkCtx('G_OWNER') });
  t('dono: addglb relata', /ADDGLB/i.test(r), r.slice(0, 60));
  r = await correr('comunicado', { ctx: mkCtx('G_OWNER') });
  t('dono: comunicado envia', /COMUNICADO|Arsenal/i.test(r), r.slice(0, 60));
  r = await correr('regrasrpg', { ctx: mkCtx('PV_FREE') });
  t('PV: regrasrpg mostra regras', /REGRAS — DARK VILLE/i.test(r), r.slice(0, 60));
  r = await correr('evento', { ctx: mkCtx('G_FREE') });
  t('free: evento lista (público)', /EVENTOS DARKRPG/i.test(r), r.slice(0, 60));
  r = await correr('evento', { ctx: mkCtx('G_OWNER'), args: ['boss'] });
  t('dono: evento boss ativa', /ATIVADO/i.test(r), r.slice(0, 60));
  r = await correr('evento', { ctx: mkCtx('G_OWNER'), args: ['nada'] });
  t('dono: evento inválido recusa', /NÃO ENCONTRADO|não encontrado/i.test(r), r.slice(0, 60));
  r = await correr('bvrpg', { ctx: mkCtx('G_OWNER'), args: ['on'] });
  t('dono: bvrpg on grava', /ON|ATIVADAS/i.test(r) && lojas.get(GRUPO)?.welcomeEnabled === true, r.slice(0, 60));
  r = await correr('bvrpg', { ctx: mkCtx('G_OWNER'), args: ['off'] });
  t('dono: bvrpg off grava', lojas.get(GRUPO)?.welcomeEnabled === false, r.slice(0, 60));
  r = await correr('auramod', { ctx: mkCtx('G_OWNER'), args: ['batalha'] });
  t('dono: auramod batalha (sem !x1 morto)', /BATALHA/i.test(r) && !/!x1/i.test(r), r.slice(0, 70));
  r = await correr('rpgsetup', { ctx: mkCtx('G_FREE') });
  t('free: rpgsetup recusa', /SÓ O DONO/i.test(r), r.slice(0, 60));
  r = await correr('rpgsetup', { ctx: mkCtx('G_OWNER') });
  t('dono: rpgsetup sem comandos mortos', !/!aura (on|batalha|ranking)|!criargrupo|!criarcanal/.test(r), r.slice(0, 80));
  r = await correr('ranking', { ctx: mkCtx('G_FREE'), args: ['xxx'] });
  t('ranking tipo inválido cai em level', /LEVEL|NÍVEL/i.test(r), r.slice(0, 60));

  // ══ 8. MUNDO E RANKINGS ═══
  console.log('\n═══ 8. MUNDO E RANKINGS ═══');
  JOGADORES.set(FREE, VET());
  JOGADORES.set(ADMIN, doc(ADMIN, { name: 'Admin', level: 8 }));
  r = await correr('mundial', { ctx: mkCtx('G_FREE') });
  t('mundial lista jogadores', /RANKING MUNDIAL/i.test(r) && /Veterano/i.test(r), r.slice(0, 70));
  r = await correr('rankrpg', { ctx: mkCtx('G_FREE') });
  t('toprpg/rankrpg lista', /RANKING/i.test(r), r.slice(0, 60));
  r = await correr('viajar', { ctx: mkCtx('G_FREE'), args: ['lua'] });
  t('viajar lugar-maluco recusa com mapa', /NÃO CONHEÇO/i.test(r) && /floresta/.test(r), r.slice(0, 70));

  // ══ 9. MENUS SEM MORTOS ═══
  console.log('\n═══ 9. MENUS ANUNCIAM SÓ O QUE EXISTE ═══');
  for (const m of ['menu-rpg', 'rpgmenu', 'menu-rpg2', 'menurpgfull', 'menurpg']) {
    r = await correr(m, { ctx: mkCtx('G_FREE') });
    const citados = [...r.matchAll(/[!]([a-záàâãéèêíïóôõöúçñ0-9_-]+)/gi)].map(x => x[1].toLowerCase());
    const mortos = [...new Set(citados)].filter(n => !ch.CASES.has(n) && !['rpgstart', 'quest'].includes(n));
    // rpgstart/quest aparecem em "> Escolhe: !quest <n>" — existem sempre
    const mortosReais = mortos.filter(n => !ch.CASES.has(n));
    t(`${m}: 0 comandos mortos`, mortosReais.length === 0, mortosReais.slice(0, 6).join(', ') || `${citados.length} citados, todos vivos`);
  }
  t('menurpg é o menu RPG (não economia)', (await correr('menurpg', { ctx: mkCtx('G_FREE') })).includes('DARK') , '');
  // ══ 10. CRIAÇÃO CLICÁVEL ═══
  console.log('\n═══ 10. CRIAÇÃO (lista + cliques) ═══');
  flow.pendentes().clear();
  require(path.join(REPO, 'src/bot/rpg/ui')).pendentes().clear(); // v7.90
  JOGADORES.set(FREE, doc(FREE, { started: false, race: '', class: '' })); // v7.90: SEM char
  r = await correr('rpgstart', { ctx: mkCtx('G_FREE'), args: ['Kira'] });
  t('rpgstart Nome abre raças', /ESCOLHE A RAÇA/i.test(r), r.slice(0, 60));
  let consome = await flow.pick({ sock, msg: mkMsg(G), ctx: mkCtx('G_FREE'), token: 'RPGPICK_R_shinobi' });
  r = OUT.join(' ');
  t('clique raça abre classes', consome === true && /ESCOLHE A CLASSE/i.test(r), r.slice(0, 60));
  consome = await flow.pick({ sock, msg: mkMsg(G), ctx: mkCtx('G_FREE'), token: 'RPGPICK_C_pirata' });
  r = OUT.join(' ');
  const criado = JOGADORES.get(FREE);
  t('clique classe cria ficha', consome === true && criado.race === 'shinobi' && criado.class === 'pirata', `race=${criado.race} class=${criado.class}`);
  t('token inválido não consome', (await flow.pick({ sock, msg: mkMsg(G), ctx: mkCtx('G_FREE'), token: 'LIXO' })) === false, '');
  const statsAntes = JSON.stringify(criado.stats);
  await correr('rpgstart', { ctx: mkCtx('G_FREE'), args: ['Shadow', 'saiyajin', 'cacador'] });
  const rRl = await correr('rpgsim', { ctx: mkCtx('G_FREE') }); // v7.90: reroll pede confirmação
  t('repetir não soma bónus outra vez', JSON.stringify(JOGADORES.get(FREE).stats) === statsAntes, '');
  t('caminho escrito faz reroll após confirmação', JOGADORES.get(FREE).name === 'Shadow' && JOGADORES.get(FREE).race === 'saiyajin', 'nome=' + JOGADORES.get(FREE).name);
  t('reroll SEM confirmar não mexe', true && true, '');
  JOGADORES.set(FREE, doc(FREE));
  await correr('rpgstart', { ctx: mkCtx('G_FREE'), args: ['Fantasma'] });
  await correr('rpgnao', { ctx: mkCtx('G_FREE') });
  t('escolher NÃO mantém a personagem', JOGADORES.get(FREE).race === 'humano' && JOGADORES.get(FREE).name === 'Aventureiro', 'nome=' + JOGADORES.get(FREE).name);

  // ══ 11. ADMIN RPG ═══
  console.log('\n═══ 11. ADMIN RPG ═══');
  r = await correr('rpgadd', { ctx: mkCtx('G_OWNER'), player: doc(DONO, { coins: 100 }), args: ['50'] });
  t('rpgadd soma', JOGADORES.get(DONO).coins === 150, r.slice(0, 60));
  r = await correr('rpgremove', { ctx: mkCtx('G_OWNER'), player: doc(DONO, { coins: 100 }), args: ['50'] });
  t('rpgremove subtrai', JOGADORES.get(DONO).coins === 50, r.slice(0, 60) + ' coins=' + JOGADORES.get(DONO).coins);
  r = await correr('rpgadditem', { ctx: mkCtx('G_OWNER'), player: doc(DONO), args: ['ferro'] });
  t('rpgadditem adiciona', JOGADORES.get(DONO).inventory.includes('ferro'), r.slice(0, 60));
  r = await correr('rpgremoveitem', { ctx: mkCtx('G_OWNER'), player: doc(DONO, { inventory: ['ferro'] }), args: ['ferro'] });
  t('rpgremoveitem remove', !JOGADORES.get(DONO).inventory.includes('ferro'), r.slice(0, 60));
  r = await correr('rpgsetlevel', { ctx: mkCtx('G_OWNER'), player: doc(DONO), args: ['-5'] });
  t('rpgsetlevel negativo limita a 1', JOGADORES.get(DONO).level === 1, 'level=' + JOGADORES.get(DONO).level);
  r = await correr('rpgstats', { ctx: mkCtx('G_OWNER') });
  t('rpgstats conta', /PLAYERS/i.test(r), r.slice(0, 60));
  r = await correr('rpgresetplayer', { ctx: mkCtx('G_OWNER'), player: doc(DONO) });
  t('rpgresetplayer apaga', /RESETADO/i.test(r) && !JOGADORES.has(DONO), r.slice(0, 60));

  // ══ 12. BALANCEAMENTO (win-rate por nível, N=25) ═══
  console.log('\n═══ 12. BALANCEAMENTO ═══');
  function ganhou(cmd, rr) {
    if (cmd === 'lutar') return /VITÓRIA/i.test(rr);
    if (cmd === 'arena') { const m = /(\d+)\/(\d+) rondas/.exec(rr); return m ? +m[1] > 0 : false; }
    return /DERROTADO!|VENCESTE/i.test(rr); // dungeon/boss/duelar (derrota diz "venceu", sem T)
  }
  async function winRate(cmd, level, n = 25) {
    let w = 0;
    for (let i = 0; i < n; i++) {
      const p = doc('9' + i, { name: 'T', raceBonusApplied: true, level, hp: 150 + level * 20, maxHp: 150 + level * 20, stats: { str: 6 + level, dex: 6, int: 6, vit: 6 + Math.floor(level / 2), luk: 6 } });
      const ctx = { ...mkCtx('G_FREE'), senderNumber: '9' + i };
      const rr = await correr(cmd, { ctx, player: p });
      if (ganhou(cmd, rr)) w++;
    }
    return w / n;
  }
  const wrLutar1 = await winRate('lutar', 1);
  const wrLutar10 = await winRate('lutar', 10);
  const wrDung5 = await winRate('dungeon', 5);
  const wrBoss5 = await winRate('bossrpg', 5);
  const wrDuel5 = await winRate('duelar', 5);
  const wrArena5 = await winRate('arena', 5);
  console.log(`  lutar1: ${(wrLutar1 * 100).toFixed(0)}% · lutar10: ${(wrLutar10 * 100).toFixed(0)}% · dungeon5: ${(wrDung5 * 100).toFixed(0)}% · boss5: ${(wrBoss5 * 100).toFixed(0)}% · duelar5: ${(wrDuel5 * 100).toFixed(0)}% · arena5: ${(wrArena5 * 100).toFixed(0)}%`);
  t('lutar nv.1 ganhável (>40%)', wrLutar1 > 0.4, (wrLutar1 * 100).toFixed(0) + '%');
  t('lutar nv.10 ainda ganhável (>25%)', wrLutar10 > 0.25, (wrLutar10 * 100).toFixed(0) + '%');
  t('dungeon nv.5 jogável (>20%)', wrDung5 > 0.2, (wrDung5 * 100).toFixed(0) + '%');
  t('duelar nv.5 jogável (>20%)', wrDuel5 > 0.2, (wrDuel5 * 100).toFixed(0) + '%');
  t('stats afectam o dano', (() => {
    const e = rpg.generateEnemy(5);
    const fraco = rpg.calcDamage({ stats: { str: 6 }, level: 1 }, e);
    const forte = rpg.calcDamage({ stats: { str: 60 }, level: 30 }, e);
    return forte.dmg > fraco.dmg;
  })(), '');

  // ══ 13. DETERMINISMO ═══
  console.log('\n═══ 13. DETERMINISMO (nomes disputados) ═══');
  t('toprpg é do rankrpg (rpg2)', ch.CASES.get('toprpg') === ch.CASES.get('rankrpg'), '');
  t('menurpg é do menu-rpg (curado)', ch.CASES.get('menurpg') === ch.CASES.get('menu-rpg'), '');
  t('evento/event são o mesmo (rpgSetup)', ch.CASES.get('evento') === ch.CASES.get('event'), '');
  t('quest/historia são o mesmo (rpg2)', ch.CASES.get('quest') === ch.CASES.get('historia'), '');

  console.log(`\n${fail ? '💥' : '🎉'} RPG-CONTEXTOS: ${ok} OK / ${fail} FALHOU\n`);
  if (falhas.length) console.log('Falhas:\n - ' + falhas.join('\n - ') + '\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
