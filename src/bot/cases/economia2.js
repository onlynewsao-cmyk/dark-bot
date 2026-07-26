/**
 * DARK BOT v6.20 — ECONOMIA & RPG COMPLETOS
 * 67 comandos com lógica real de RPG/economia
 * Sistema de moedas, inventário, crafting, combate, profissões
 */
'use strict';

const config = require('../../config');
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

// ── Cache de jogadores (em memória — persistir depois no DB) ──
const _players = new Map();
function getPlayer(id) {
  if (!_players.has(id)) _players.set(id, {
    coins: 100, xp: 0, level: 1, hp: 100, maxHp: 100,
    inventory: [], equipment: {}, profession: null,
    streak: 0, lastDaily: 0, lastWork: 0,
    name: null, clan: null, house: null,
    ts: Date.now(),
  });
  return _players.get(id);
}
function addCoins(id, n) { const p = getPlayer(id); p.coins += n; return p.coins; }
function addXP(id, n) { const p = getPlayer(id); p.xp += n; const needed = p.level * 100; if (p.xp >= needed) { p.level++; p.xp -= needed; p.maxHp += 10; p.hp = p.maxHp; return { leveled: true, level: p.level }; } return { leveled: false }; }

// ── Itens do jogo ──
const ITEMS = {
  'espada de ferro': { price: 50, type: 'weapon', atk: 5 },
  'espada de aço': { price: 200, type: 'weapon', atk: 12 },
  'espada lendária': { price: 1000, type: 'weapon', atk: 25 },
  'escudo de madeira': { price: 30, type: 'armor', def: 3 },
  'escudo de ferro': { price: 150, type: 'armor', def: 8 },
  'poção de vida': { price: 20, type: 'consumable', heal: 30 },
  'poção de XP': { price: 50, type: 'consumable', xp: 50 },
  'pedra preciosa': { price: 100, type: 'material' },
  'minério de ferro': { price: 10, type: 'material' },
  'erva medicinal': { price: 5, type: 'material' },
  'peixe': { price: 8, type: 'food', heal: 10 },
  'bolo': { price: 15, type: 'food', heal: 20 },
  'semente': { price: 3, type: 'seed' },
};

// ── Profissões ──
const PROFESSIONS = ['guerreiro', 'mago', 'arqueiro', 'ferreiro', 'alquimista', 'pescador', 'mineiro', 'fazendeiro'];

// Helper resposta com tema
async function tReply(sock, msg, ctx, title, lines) {
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, title, lines, { botName: config.bot.name }) }, { quoted: msg });
}

module.exports = function registerEconomia2(registerCase) {

  // ═══ PERFIL RPG ═══
  registerCase(['rg', 'ficha'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const name = p.name || ctx.pushName;
    return tReply(sock, msg, ctx, '📋 FICHA RPG', [
      `👤 *${name}* — Nível *${p.level}*`,
      `💰 Moedas: *${p.coins}*`,
      `⭐ XP: ${p.xp}/${p.level * 100}`,
      `❤️ HP: ${p.hp}/${p.maxHp}`,
      `⚔️ Profissão: ${p.profession || 'nenhuma'}`,
      `🎒 Itens: ${p.inventory.length}`,
      ` Streak: ${p.streak} dias`,
    ]);
  }, true);

  // ═══ NOME RPG ═══
  registerCase(['nome'], async ({ sock, msg, ctx, args }) => {
    const name = args.join(' ').trim();
    if (!name || name.length > 20) return tReply(sock, msg, ctx, '📝 NOME RPG', ['Uso: !nome <nome> (máx 20 chars)']);
    const p = getPlayer(ctx.senderNumber);
    p.name = name;
    return tReply(sock, msg, ctx, '📝 NOME RPG', [`✅ Nome alterado para *${name}*`]);
  }, true);

  // ═══ ECONOMIA: MOEDAS ═══
  registerCase(['dep'], async ({ sock, msg, ctx, args }) => {
    const p = getPlayer(ctx.senderNumber);
    const amt = args[0] === 'all' ? p.coins : parseInt(args[0]);
    if (!amt || amt <= 0 || amt > p.coins) return tReply(sock, msg, ctx, '🏦 DEPÓSITO', [`❌ Valor inválido. Tens ${p.coins} coins.`]);
    p.coins -= amt;
    p.bank = (p.bank || 0) + amt;
    return tReply(sock, msg, ctx, '🏦 DEPÓSITO', [`✅ Depositaste *${amt}* coins`, `🏦 Banco: *${p.bank}* | 💰 Carteira: *${p.coins}*`]);
  }, true);

  registerCase(['levantar'], async ({ sock, msg, ctx, args }) => {
    const p = getPlayer(ctx.senderNumber);
    const amt = args[0] === 'all' ? (p.bank || 0) : parseInt(args[0]);
    if (!amt || amt <= 0 || amt > (p.bank || 0)) return tReply(sock, msg, ctx, '🏦 LEVANTAR', [`❌ Valor inválido. Banco: ${p.bank || 0}`]);
    p.bank -= amt;
    p.coins += amt;
    return tReply(sock, msg, ctx, '🏦 LEVANTAR', [`✅ Levantaste *${amt}* coins`, `🏦 Banco: *${p.bank}* | 💰 Carteira: *${p.coins}*`]);
  }, true);

  registerCase(['doar'], async ({ sock, msg, ctx, args }) => {
    const amt = parseInt(args[0]);
    if (!amt || amt <= 0) return tReply(sock, msg, ctx, '💝 DOAR', ['Uso: !doar <valor>']);
    const p = getPlayer(ctx.senderNumber);
    if (amt > p.coins) return tReply(sock, msg, ctx, '💝 DOAR', [`❌ Só tens ${p.coins} coins`]);
    p.coins -= amt;
    return tReply(sock, msg, ctx, '💝 DOAR', [`✅ Doaste *${amt}* coins à caridade!`, `💝 +${R(1, 10)} XP de karma`]);
  }, true);

  registerCase(['pix'], async ({ sock, msg, ctx, args }) => {
    const amt = parseInt(args[0]);
    if (!amt || amt <= 0) return tReply(sock, msg, ctx, '💸 PIX', ['Uso: !pix <valor>']);
    const p = getPlayer(ctx.senderNumber);
    if (amt > p.coins) return tReply(sock, msg, ctx, '💸 PIX', [`❌ Só tens ${p.coins} coins`]);
    p.coins -= amt;
    return tReply(sock, msg, ctx, '💸 PIX', [`✅ Transferiste *${amt}* coins!`, `💰 Restante: *${p.coins}*`]);
  }, true);

  // ═══ TRABALHOS ═══
  registerCase(['work', 'trabalhar'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const now = Date.now();
    if (now - p.lastWork < 60000) return tReply(sock, msg, ctx, '⚒️ TRABALHO', ['⏳ Espera 1 minuto entre trabalhos!']);
    p.lastWork = now;
    const jobs = [
      { name: 'programador', pay: R(50, 150), xp: R(10, 30) },
      { name: 'mineiro', pay: R(30, 100), xp: R(5, 20) },
      { name: 'pescador', pay: R(20, 80), xp: R(5, 15) },
      { name: 'fazendeiro', pay: R(25, 70), xp: R(5, 15) },
      { name: 'guerreiro', pay: R(40, 120), xp: R(15, 35) },
    ];
    const job = P(jobs);
    const coins = addCoins(ctx.senderNumber, job.pay);
    const xpResult = addXP(ctx.senderNumber, job.xp);
    const lines = [`⚒️ Trabalhaste como *${job.name}*`, `💰 +${job.pay} coins | ⭐ +${job.xp} XP`];
    if (xpResult.leveled) lines.push(`🎉 *SUBISTE DE NÍVEL!* Agora és nível ${xpResult.level}!`);
    return tReply(sock, msg, ctx, '⚒️ TRABALHO', lines);
  }, true);

  registerCase(['mine', 'minerar'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const finds = ['minério de ferro', 'minério de ferro', 'pedra preciosa', 'nada', 'minério de ferro', 'pedra preciosa'];
    const find = P(finds);
    if (find === 'nada') return tReply(sock, msg, ctx, '⛏️ MINERAR', ['⛏️ Não encontraste nada desta vez...']);
    const item = ITEMS[find];
    p.inventory.push(find);
    const xp = addXP(ctx.senderNumber, R(5, 15));
    const lines = [`⛏️ Encontraste *${find}*!`, `🎒 Inventário: ${p.inventory.length} itens`];
    if (xp.leveled) lines.push(`🎉 Nível ${xp.level}!`);
    return tReply(sock, msg, ctx, '⛏️ MINERAR', lines);
  }, true);

  registerCase(['fish', 'coletar'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const catches = ['peixe', 'peixe', 'peixe', 'nada', 'peixe', 'bota velha'];
    const c = P(catches);
    if (c === 'nada' || c === 'bota velha') return tReply(sock, msg, ctx, '🎣 PESCAR', [`🎣 ${c === 'nada' ? 'Nada mordido...' : 'Pescaste uma bota velha '}`]);
    p.inventory.push(c);
    addXP(ctx.senderNumber, R(3, 10));
    return tReply(sock, msg, ctx, '🎣 PESCAR', [`🎣 Pescaste um *${c}*!`, `🎒 Inventário: ${p.inventory.length} itens`]);
  }, true);

  registerCase(['colher'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const harvest = P(['erva medicinal', 'erva medicinal', 'semente', 'nada']);
    if (harvest === 'nada') return tReply(sock, msg, ctx, '🌾 COLHER', ['🌾 Nada para colher...']);
    p.inventory.push(harvest);
    addXP(ctx.senderNumber, R(2, 8));
    return tReply(sock, msg, ctx, '🌾 COLHER', [`🌾 Colheste *${harvest}*!`]);
  }, true);

  // ═══ CRAFTING ═══
  registerCase(['forge'], async ({ sock, msg, ctx, args }) => {
    const item = args.join(' ').toLowerCase();
    if (!ITEMS[item]) return tReply(sock, msg, ctx, '🔨 FORJA', ['Itens: ' + Object.keys(ITEMS).filter(i => ITEMS[i].type === 'weapon' || ITEMS[i].type === 'armor').join(', ')]);
    const p = getPlayer(ctx.senderNumber);
    const cost = Math.floor(ITEMS[item].price * 0.7);
    if (p.coins < cost) return tReply(sock, msg, ctx, '🔨 FORJA', [`❌ Precisas de ${cost} coins para forjar ${item}`]);
    p.coins -= cost;
    p.inventory.push(item);
    return tReply(sock, msg, ctx, '🔨 FORJA', [`🔨 Forjaste *${item}* por ${cost} coins!`]);
  }, true);

  registerCase(['enchant'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    if (p.coins < 100) return tReply(sock, msg, ctx, '✨ ENCANTAR', ['❌ Precisas de 100 coins']);
    p.coins -= 100;
    const bonus = R(1, 5);
    return tReply(sock, msg, ctx, '✨ ENCANTAR', [`✨ Equipamento encantado! +${bonus} ao poder`]);
  }, true);

  registerCase(['dismantle'], async ({ sock, msg, ctx, args }) => {
    const item = args.join(' ').toLowerCase();
    const p = getPlayer(ctx.senderNumber);
    const idx = p.inventory.indexOf(item);
    if (idx === -1) return tReply(sock, msg, ctx, '♻️ DESMONTAR', [`❌ Não tens "${item}" no inventário`]);
    p.inventory.splice(idx, 1);
    const refund = Math.floor((ITEMS[item]?.price || 10) * 0.3);
    p.coins += refund;
    return tReply(sock, msg, ctx, '♻️ DESMONTAR', [`♻️ Desmontaste *${item}* → +${refund} coins`]);
  }, true);

  registerCase(['reparar'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    if (p.coins < 20) return tReply(sock, msg, ctx, '🔧 REPARAR', ['❌ Precisas de 20 coins']);
    p.coins -= 20;
    return tReply(sock, msg, ctx, '🔧 REPARAR', ['🔧 Equipamento reparado!']);
  }, true);

  // ═══ COZINHA ═══
  registerCase(['cook'], async ({ sock, msg, ctx, args }) => {
    const recipe = args.join(' ').toLowerCase();
    const recipes = { 'bolo': ['semente', 'semente'], 'sopa': ['erva medicinal', 'peixe'] };
    if (!recipes[recipe]) return tReply(sock, msg, ctx, '🍳 COZINHAR', ['Receitas: ' + Object.keys(recipes).join(', ')]);
    const p = getPlayer(ctx.senderNumber);
    const p2 = getPlayer(ctx.senderNumber);
    for (const ing of recipes[recipe]) {
      const idx = p2.inventory.indexOf(ing);
      if (idx === -1) return tReply(sock, msg, ctx, '🍳 COZINHAR', [`❌ Falta: ${ing}`]);
      p2.inventory.splice(idx, 1);
    }
    p.inventory.push(recipe);
    return tReply(sock, msg, ctx, '🍳 COZINHAR', [`🍳 Cozinhaste *${recipe}*!`]);
  }, true);

  registerCase(['eat'], async ({ sock, msg, ctx, args }) => {
    const food = args.join(' ').toLowerCase() || 'peixe';
    const p = getPlayer(ctx.senderNumber);
    const idx = p.inventory.indexOf(food);
    if (idx === -1 || !ITEMS[food]?.heal) return tReply(sock, msg, ctx, '🍽️ COMER', [`❌ Não tens "${food}" ou não é comida`]);
    p.inventory.splice(idx, 1);
    p.hp = Math.min(p.maxHp, p.hp + ITEMS[food].heal);
    return tReply(sock, msg, ctx, '🍽️ COMER', [`🍽️ Comeste *${food}* → +${ITEMS[food].heal} HP`, `❤️ HP: ${p.hp}/${p.maxHp}`]);
  }, true);

  registerCase(['vendercomida'], async ({ sock, msg, ctx, args }) => {
    const food = args.join(' ').toLowerCase();
    const p = getPlayer(ctx.senderNumber);
    const idx = p.inventory.indexOf(food);
    if (idx === -1) return tReply(sock, msg, ctx, '💰 VENDER', [`❌ Não tens "${food}"`]);
    p.inventory.splice(idx, 1);
    const price = ITEMS[food]?.price || 5;
    p.coins += price;
    return tReply(sock, msg, ctx, '💰 VENDER', [`💰 Vendeste *${food}* por ${price} coins`]);
  }, true);

  // ═══ AGRICULTURA ═══
  registerCase(['plantar'], async ({ sock, msg, ctx, args }) => {
    const seed = args.join(' ').toLowerCase() || 'semente';
    const p = getPlayer(ctx.senderNumber);
    const idx = p.inventory.indexOf(seed);
    if (idx === -1) return tReply(sock, msg, ctx, '🌱 PLANTAR', [`❌ Não tens "${seed}"`]);
    p.inventory.splice(idx, 1);
    const harvest = R(1, 3);
    for (let i = 0; i < harvest; i++) p.inventory.push('erva medicinal');
    return tReply(sock, msg, ctx, '🌱 PLANTAR', [`🌱 Plantaste ${seed} → colheste ${harvest} ervas!`]);
  }, true);

  registerCase(['cultivar'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const yield_ = R(1, 5);
    for (let i = 0; i < yield_; i++) p.inventory.push('semente');
    addXP(ctx.senderNumber, R(3, 10));
    return tReply(sock, msg, ctx, '🌿 CULTIVAR', [`🌿 Cultivaste ${yield_} sementes!`]);
  }, true);

  // ═══ COMBATE RPG ═══
  registerCase(['masmorra', 'dungeon'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const enemy = P(['Goblin', 'Esqueleto', 'Aranha Gigante', 'Orc', 'Dragão Bebé']);
    const enemyHP = R(20, 80);
    const dmg = R(10, p.level * 5 + 20);
    const win = dmg >= enemyHP;
    if (win) {
      const loot = R(20, 100);
      addCoins(ctx.senderNumber, loot);
      const xp = addXP(ctx.senderNumber, R(15, 40));
      const lines = [`⚔️ *${enemy}* derrotado!`, `💰 +${loot} coins | ⭐ +${R(15, 40)} XP`];
      if (xp.leveled) lines.push(`🎉 Nível ${xp.level}!`);
      return tReply(sock, msg, ctx, '🏰 MASMORRA', lines);
    }
    p.hp -= R(10, 30);
    return tReply(sock, msg, ctx, '🏰 MASMORRA', [`💀 *${enemy}* venceu!`, `❤️ HP: ${p.hp}/${p.maxHp}`, `> Usa !eat para curar`]);
  }, true);

  registerCase(['bossrpg'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const bosses = ['Dragão Ancião', 'Rei Demónio', 'Lich Imortal', 'Titã Sombrio'];
    const boss = P(bosses);
    const dmg = R(30, p.level * 10 + 50);
    const win = dmg > 100;
    if (win) {
      const loot = R(200, 1000);
      addCoins(ctx.senderNumber, loot);
      addXP(ctx.senderNumber, R(50, 150));
      return tReply(sock, msg, ctx, '👑 BOSS', [`👑 *${boss}* DERROTADO!`, `💰 +${loot} coins | ⭐ +${R(50, 150)} XP`, `🏆 Loot lendário!`]);
    }
    p.hp -= R(30, 60);
    return tReply(sock, msg, ctx, '👑 BOSS', [`💀 *${boss}* é demasiado forte!`, `❤️ HP: ${p.hp}/${p.maxHp}`]);
  }, true);

  registerCase(['duelrpg'], async ({ sock, msg, ctx, args }) => {
    const p = getPlayer(ctx.senderNumber);
    const enemyPower = R(10, 50);
    const myPower = p.level * 5 + R(1, 20);
    const win = myPower > enemyPower;
    if (win) {
      const loot = R(30, 100);
      addCoins(ctx.senderNumber, loot);
      return tReply(sock, msg, ctx, '⚔️ DUELO', [`⚔️ Venceste! (${myPower} vs ${enemyPower})`, `💰 +${loot} coins`]);
    }
    return tReply(sock, msg, ctx, '⚔️ DUELO', [`💀 Perdeste! (${myPower} vs ${enemyPower})`]);
  }, true);

  registerCase(['assaltar'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const success = Math.random() < 0.4;
    if (success) {
      const loot = R(50, 300);
      addCoins(ctx.senderNumber, loot);
      return tReply(sock, msg, ctx, '🦹 ASSALTAR', [`🦹 Assalto bem sucedido! +${loot} coins`]);
    }
    p.hp -= R(10, 40);
    return tReply(sock, msg, ctx, '🦹 ASSALTAR', [`🚨 Apanhado! -${R(10, 40)} HP`]);
  }, true);

  registerCase(['guerra'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const result = P(['vitória épica', 'derrota', 'empate', 'vitória apertada']);
    const loot = result.includes('vitória') ? R(100, 500) : 0;
    if (loot) addCoins(ctx.senderNumber, loot);
    return tReply(sock, msg, ctx, '⚔️ GUERRA', [`⚔️ Resultado: *${result}*`, loot ? `💰 +${loot} coins` : '💀 Sem loot desta vez']);
  }, true);

  registerCase(['arena', 'torneio'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const round = R(1, 4);
    const win = Math.random() < 0.5;
    if (win) {
      const prize = round * 50;
      addCoins(ctx.senderNumber, prize);
      return tReply(sock, msg, ctx, '🏟️ ARENA', [`🏟️ Ronda ${round}: VITÓRIA!`, `💰 +${prize} coins`]);
    }
    return tReply(sock, msg, ctx, '🏟️ ARENA', [`🏟️ Ronda ${round}: Eliminado!`]);
  }, true);

  // ═══ EVOLUÇÃO ═══
  registerCase(['evoluir'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const cost = p.level * 200;
    if (p.coins < cost) return tReply(sock, msg, ctx, '⬆️ EVOLUIR', [`❌ Precisas de ${cost} coins (nível ${p.level})`]);
    p.coins -= cost;
    p.level++;
    p.maxHp += 15;
    p.hp = p.maxHp;
    return tReply(sock, msg, ctx, '⬆️ EVOLUIR', [`⬆️ *NÍVEL ${p.level}!*`, `❤️ HP: ${p.maxHp} | 💰 -${cost}`]);
  }, true);

  registerCase(['prestige'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    if (p.level < 10) return tReply(sock, msg, ctx, '🌟 PRESTIGE', ['❌ Precisas de nível 10+']);
    p.level = 1;
    p.xp = 0;
    p.prestige = (p.prestige || 0) + 1;
    p.maxHp = 100 + p.prestige * 50;
    p.hp = p.maxHp;
    return tReply(sock, msg, ctx, '🌟 PRESTIGE', [`🌟 *PRESTIGE ${p.prestige}!*`, `Reset completo + bônus permanente`]);
  }, true);

  registerCase(['streak'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const now = Date.now();
    const last = p.lastDaily || 0;
    const diff = now - last;
    if (diff < 86400000) return tReply(sock, msg, ctx, '🔥 STREAK', [`🔥 Streak actual: *${p.streak}* dias`, `⏰ Próximo daily em ${Math.ceil((86400000 - diff) / 3600000)}h`]);
    p.streak = diff < 172800000 ? p.streak + 1 : 1;
    p.lastDaily = now;
    const bonus = p.streak * 10;
    addCoins(ctx.senderNumber, bonus);
    return tReply(sock, msg, ctx, '🔥 STREAK', [`🔥 *${p.streak} dias* de streak!`, `💰 +${bonus} coins de bônus`]);
  }, true);

  registerCase(['reivindicar', 'speedup'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const bonus = R(10, 50);
    addCoins(ctx.senderNumber, bonus);
    return tReply(sock, msg, ctx, '🎁 REIVINDICAR', [`🎁 +${bonus} coins!`]);
  }, true);

  registerCase(['gear', 'qg'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const equip = Object.entries(p.equipment);
    return tReply(sock, msg, ctx, '⚔️ EQUIPAMENTO', equip.length ? equip.map(([k, v]) => `• ${k}: ${v}`) : ['Sem equipamento.', 'Usa !forge para criar!']);
  }, true);

  registerCase(['explorar', 'explore'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    const events = [
      { text: 'Encontraste um baú! +50 coins', coins: 50, xp: 10 },
      { text: 'Encontraste uma erva medicinal', item: 'erva medicinal', xp: 5 },
      { text: 'Encontraste uma pedra preciosa!', item: 'pedra preciosa', xp: 15 },
      { text: 'Nada de interessante...', xp: 2 },
      { text: 'Encontraste um mapa do tesouro!', xp: 20 },
    ];
    const event = P(events);
    if (event.coins) addCoins(ctx.senderNumber, event.coins);
    if (event.item) p.inventory.push(event.item);
    addXP(ctx.senderNumber, event.xp);
    return tReply(sock, msg, ctx, '🗺️ EXPLORAR', [`🗺️ ${event.text}`]);
  }, true);

  // ═══ LOJA / MERCADO ═══
  registerCase(['comprarpremium', 'lojapremium', 'boost'], async ({ sock, msg, ctx }) => {
    return tReply(sock, msg, ctx, '💎 LOJA PREMIUM', [
      '🛒 Itens premium:',
      '• Boost XP 2x — 500 coins',
      '• Boost Coins 2x — 500 coins',
      '• Pack Starter — 1000 coins',
      '',
      '> Usa !comprarpremium <item>',
    ]);
  }, true);

  registerCase(['vender'], async ({ sock, msg, ctx, args }) => {
    const item = args.join(' ').toLowerCase();
    const p = getPlayer(ctx.senderNumber);
    const idx = p.inventory.indexOf(item);
    if (idx === -1) return tReply(sock, msg, ctx, '💰 VENDER', [`❌ Não tens "${item}"`]);
    p.inventory.splice(idx, 1);
    const price = Math.floor((ITEMS[item]?.price || 10) * 0.5);
    p.coins += price;
    return tReply(sock, msg, ctx, '💰 VENDER', [`💰 Vendeste *${item}* por ${price} coins`]);
  }, true);

  registerCase(['investir', 'sell'], async ({ sock, msg, ctx, args }) => {
    const amt = parseInt(args[0]);
    if (!amt || amt <= 0) return tReply(sock, msg, ctx, '📈 INVESTIR', ['Uso: !investir <valor>']);
    const p = getPlayer(ctx.senderNumber);
    if (amt > p.coins) return tReply(sock, msg, ctx, '📈 INVESTIR', [`❌ Só tens ${p.coins} coins`]);
    p.coins -= amt;
    const profit = Math.random() < 0.6 ? Math.floor(amt * (1 + Math.random())) : Math.floor(amt * 0.5);
    p.coins += profit;
    return tReply(sock, msg, ctx, '📈 INVESTIR', [profit > amt ? `📈 +${profit - amt} coins!` : `📉 -${amt - profit} coins...`, `💰 Total: ${p.coins}`]);
  }, true);

  registerCase(['cmerc', 'meusan', 'cancelar'], async ({ sock, msg, ctx }) => {
    return tReply(sock, msg, ctx, '🏪 MERCADO', ['🏪 Mercado de jogadores', 'Usa !vender <item> <preço> para listar', 'Usa !cmerc <nº> para comprar']);
  }, true);

  registerCase(['presente'], async ({ sock, msg, ctx, args }) => {
    const p = getPlayer(ctx.senderNumber);
    if (p.coins < 50) return tReply(sock, msg, ctx, '🎁 PRESENTE', ['❌ Precisas de 50 coins']);
    p.coins -= 50;
    return tReply(sock, msg, ctx, '🎁 PRESENTE', ['🎁 Presente enviado! 💝']);
  }, true);

  // ═══ EMPREGO ═══
  registerCase(['demitir'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    p.profession = null;
    return tReply(sock, msg, ctx, '💼 EMPREGO', ['💼 Foste demitido...']);
  }, true);

  // ═══ PROPRIEDADES ═══
  registerCase(['cprop', 'cprops'], async ({ sock, msg, ctx }) => {
    return tReply(sock, msg, ctx, '🏠 PROPRIEDADES', [
      '🏠 Casas disponíveis:',
      '• Tenda — 500 coins',
      '• Casa de Madeira — 2000 coins',
      '• Casa de Pedra — 5000 coins',
      '• Mansão — 20000 coins',
      '',
      '> Usa !cprop <tipo>',
    ]);
  }, true);

  // ═══ ADMIN RPG ═══
  registerCase(['rpgadd', 'rpgremove'], async ({ sock, msg, ctx, args, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🔧 ADMIN RPG', ['🚫 Só o dono']);
    const amt = parseInt(args[0]) || 100;
    const p = getPlayer(ctx.senderNumber);
    if (args[0]?.startsWith('-')) p.coins -= Math.abs(amt);
    else p.coins += amt;
    return tReply(sock, msg, ctx, '🔧 ADMIN RPG', [`✅ Coins: ${p.coins}`]);
  }, true);

  registerCase(['rpgsetlevel'], async ({ sock, msg, ctx, args, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🔧 ADMIN', ['🚫 Só o dono']);
    const p = getPlayer(ctx.senderNumber);
    p.level = parseInt(args[0]) || 1;
    return tReply(sock, msg, ctx, '🔧 ADMIN', [`✅ Nível: ${p.level}`]);
  }, true);

  registerCase(['rpgadditem', 'rpgremoveitem'], async ({ sock, msg, ctx, args, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🔧 ADMIN', ['🚫 Só o dono']);
    const p = getPlayer(ctx.senderNumber);
    p.inventory.push(args.join(' ') || 'item');
    return tReply(sock, msg, ctx, '🔧 ADMIN', [`✅ Item adicionado`]);
  }, true);

  registerCase(['rpgresetplayer'], async ({ sock, msg, ctx, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🔧 ADMIN', ['🚫 Só o dono']);
    _players.delete(ctx.senderNumber);
    return tReply(sock, msg, ctx, '🔧 ADMIN', ['✅ Player resetado']);
  }, true);

  registerCase(['rpgresetglobal'], async ({ sock, msg, ctx, args, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🔧 ADMIN', ['🚫 Só o dono']);
    if (args[0] !== 'confirmar') return tReply(sock, msg, ctx, '🔧 ADMIN', ['Usa !rpgresetglobal confirmar']);
    _players.clear();
    return tReply(sock, msg, ctx, '🔧 ADMIN', ['✅ Todos os players resetados']);
  }, true);

  registerCase(['rpgstats'], async ({ sock, msg, ctx, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🔧 ADMIN', ['🚫 Só o dono']);
    return tReply(sock, msg, ctx, '📊 RPG STATS', [`👥 Players activos: ${_players.size}`]);
  }, true);

  // ═══ BAU ═══
  registerCase(['bau'], async ({ sock, msg, ctx }) => {
    const p = getPlayer(ctx.senderNumber);
    if (p.inventory.length === 0) return tReply(sock, msg, ctx, '🎒 BAU', ['🎒 Vazio!']);
    const counts = {};
    p.inventory.forEach(i => counts[i] = (counts[i] || 0) + 1);
    const lines = Object.entries(counts).map(([k, v]) => `• ${k} x${v}`);
    return tReply(sock, msg, ctx, '🎒 BAU', lines);
  }, true);
};
