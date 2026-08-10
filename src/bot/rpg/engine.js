/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — ANIME RPG ENGINE                             ║
 * ║   Inspirado: Naruto, One Piece, Solo Leveling,               ║
 * ║   Jujutsu Kaisen, Demon Slayer, Dragon Ball                  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

// ══════════════════════════════════════════════════════════════
// UNIVERSO ANIME (6 universos)
// ══════════════════════════════════════════════════════════════
const UNIVERSES = {
  naruto:      { emoji: '🍥', name: 'Naruto', desc: 'Ninjas, Jutsus, Chakra', primaryStat: 'str' },
  onepiece:    { emoji: '🏴‍☠️', name: 'One Piece', desc: 'Piratas, Akuma no Mi, Haki', primaryStat: 'vit' },
  sololeveling:{ emoji: '⚔️', name: 'Solo Leveling', desc: 'Caçadores, Gates, Monarcas', primaryStat: 'dex' },
  jujutsu:     { emoji: '👁️', name: 'Jujutsu Kaisen', desc: 'Feiticeiros, Maldições, Domínios', primaryStat: 'int' },
  demonslayer: { emoji: '🗡️', name: 'Demon Slayer', hashiras: true, desc: 'Hashiras, Respirações, Demônios', primaryStat: 'dex' },
  dragonball:  { emoji: '🐉', name: 'Dragon Ball', desc: 'Saiyans, Ki, Transformações', primaryStat: 'str' },
};

// ══════════════════════════════════════════════════════════════
// PERSONAGENS (dois por universo = 12 personagens jogáveis)
// ══════════════════════════════════════════════════════════════
const CHARACTERS = {
  // ── NARUTO ──
  naruto: {
    emoji: '🍥', universe: 'naruto',
    desc: 'Hokage. Rasengan, Kurama, Modo Sábio.',
    skills: ['Rasengan', 'Rasenshuriken', 'Modo Sábio', 'Bijuudama'],
    stats: { str: 8, dex: 7, int: 6, vit: 9, luk: 8 },
    transform: { name: 'Modo Kurama', mult: 2.5, req_level: 20 },
  },
  sasuke: {
    emoji: '⚡', universe: 'naruto',
    desc: 'Uchiha. Sharingan, Chidori, Rinnegan.',
    skills: ['Chidori', 'Amaterasu', 'Susanoo', 'Indra\'s Arrow'],
    stats: { str: 7, dex: 9, int: 8, vit: 6, luk: 7 },
    transform: { name: 'Susanoo Perfeito', mult: 2.3, req_level: 20 },
  },
  // ── ONE PIECE ──
  luffy: {
    emoji: '🏴‍☠️', universe: 'onepiece',
    desc: 'Gear 5. Borracha, Haki do Rei.',
    skills: ['Gomu Gomu no Pistol', 'Gear 2', 'Gear 4', 'Gear 5'],
    stats: { str: 9, dex: 6, int: 4, vit: 10, luk: 8 },
    transform: { name: 'Gear 5', mult: 3.0, req_level: 25 },
  },
  zoro: {
    emoji: '⚔️', universe: 'onepiece',
    desc: 'Espadachim. 3 espadas, Haki.',
    skills: ['Santoryu', 'Onigiri', '1080 Pound Cannon', 'King of Hell'],
    stats: { str: 10, dex: 7, int: 3, vit: 8, luk: 5 },
    transform: { name: 'King of Hell', mult: 2.2, req_level: 18 },
  },
  // ── SOLO LEVELING ──
  sunjinwoo: {
    emoji: '⚔️', universe: 'sololeveling',
    desc: 'Monarca das Sombras. Exército de sombras.',
    skills: ['Adaga Dupla', 'Dominação', 'Exército das Sombras', 'Arise'],
    stats: { str: 9, dex: 10, int: 7, vit: 7, luk: 9 },
    transform: { name: 'Monarca das Sombras', mult: 3.0, req_level: 30 },
  },
  igris: {
    emoji: '🗡️', universe: 'sololeveling',
    desc: 'Cavaleiro Vermelho. Espadachim leal.',
    skills: ['Corte Vermelho', 'Investida', 'Proteção', 'Fúria'],
    stats: { str: 8, dex: 8, int: 5, vit: 9, luk: 6 },
    transform: { name: 'Cavaleiro Negro', mult: 2.0, req_level: 15 },
  },
  // ── JUJUTSU KAISEN ──
  gojo: {
    emoji: '👁️', universe: 'jujutsu',
    desc: 'Infinito. Olho de 6 caminhos.',
    skills: ['Infinito', 'Vazio', 'Púrpura', 'Domínio: Vazio Infinito'],
    stats: { str: 7, dex: 8, int: 10, vit: 6, luk: 8 },
    transform: { name: 'Vazio Infinito', mult: 3.5, req_level: 30 },
  },
  itadori: {
    emoji: '👊', universe: 'jujutsu',
    desc: 'Vessel de Sukuna. Punhos Negros.',
    skills: ['Punho Negro', 'Divergência', 'Black Flash', 'Sukuna'],
    stats: { str: 9, dex: 7, int: 5, vit: 8, luk: 7 },
    transform: { name: 'Sukuna Forma Completa', mult: 3.0, req_level: 25 },
  },
  // ── DEMON SLAYER ──
  tanjiro: {
    emoji: '🗡️', universe: 'demonslayer',
    desc: 'Espada Negra. Respiração da Água.',
    skills: ['Respiração da Água', 'Hinokami Kagura', 'Espada Negra', 'Verdadeira Respiração'],
    stats: { str: 7, dex: 8, int: 7, vit: 7, luk: 8 },
    transform: { name: 'Marca Hashira', mult: 2.2, req_level: 18 },
  },
  rengoku: {
    emoji: '🔥', universe: 'demonslayer',
    desc: 'Hashira da Chama. Juramento.',
    skills: ['Respiração da Chama', 'Incandescent', 'Rengoku', 'Juramento'],
    stats: { str: 9, dex: 7, int: 6, vit: 9, luk: 6 },
    transform: { name: 'Forma Secreta', mult: 2.5, req_level: 22 },
  },
  // ── DRAGON BALL ──
  goku: {
    emoji: '🐉', universe: 'dragonball',
    desc: 'Saiyan. Kamehameha, Ultra Instinto.',
    skills: ['Kamehameha', 'Super Saiyan', 'Genkidama', 'Ultra Instinto'],
    stats: { str: 10, dex: 8, int: 5, vit: 10, luk: 7 },
    transform: { name: 'Ultra Instinto', mult: 4.0, req_level: 35 },
  },
  vegeta: {
    emoji: '👑', universe: 'dragonball',
    desc: 'Príncipe Saiyan. Final Flash.',
    skills: ['Final Flash', 'Big Bang Attack', 'Super Saiyan Blue', 'Ultra Ego'],
    stats: { str: 10, dex: 7, int: 6, vit: 9, luk: 5 },
    transform: { name: 'Ultra Ego', mult: 3.5, req_level: 30 },
  },
};

// ══════════════════════════════════════════════════════════════
// RANKS (sistema estilo Solo Leveling)
// ══════════════════════════════════════════════════════════════
const RANKS = [
  { name: 'E', emoji: '⚪', min_level: 1,  mult: 1.0, desc: 'Iniciante' },
  { name: 'D', emoji: '🟢', min_level: 5,  mult: 1.2, desc: 'Aprendiz' },
  { name: 'C', emoji: '🔵', min_level: 10, mult: 1.5, desc: 'Veterano' },
  { name: 'B', emoji: '🟣', min_level: 20, mult: 2.0, desc: 'Elite' },
  { name: 'A', emoji: '🟡', min_level: 30, mult: 2.5, desc: 'Mestre' },
  { name: 'S', emoji: '🔴', min_level: 50, mult: 3.5, desc: 'Lendário' },
  { name: 'SS', emoji: '⭐', min_level: 70, mult: 5.0, desc: 'Mítico' },
  { name: 'SSS', emoji: '💎', min_level: 100, mult: 8.0, desc: 'Deus' },
];

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.min_level) rank = r;
  }
  return rank;
}

// ══════════════════════════════════════════════════════════════
// INIMIGOS POR UNIVERSO
// ══════════════════════════════════════════════════════════════
const ENEMIES = {
  naruto: [
    { name: 'Zetsu', emoji: '🌿', tier: 'normal', hp_mult: 1, loot: ['scroll', 'shuriken'] },
    { name: 'Orochimaru', emoji: '🐍', tier: 'elite', hp_mult: 3, loot: ['pergaminho proibido', 'kunai venenosa'] },
    { name: 'Madara', emoji: '👁️', tier: 'boss', hp_mult: 8, loot: ['Sharingan Eterno', 'Hashirama Cells'] },
  ],
  onepiece: [
    { name: 'Marinheiro', emoji: '⚓', tier: 'normal', hp_mult: 1, loot: ['berrie', 'mapa'] },
    { name: 'Kaido', emoji: '🐉', tier: 'boss', hp_mult: 10, loot: ['Akuma no Mi', 'Poneglyph'] },
    { name: 'Big Mom', emoji: '👵', tier: 'boss', hp_mult: 8, loot: ['Soul Fragment', 'Zeus'] },
  ],
  sololeveling: [
    { name: 'Soldado das Sombras', emoji: '👤', tier: 'normal', hp_mult: 1, loot: ['cristal mana', 'essência'] },
    { name: 'Monarca dos Demônios', emoji: '👹', tier: 'boss', mult: 12, loot: ['Coroa do Monarca', 'Exército'] },
  ],
  jujutsu: [
    { name: 'Maldição Grau 4', emoji: '👁️', tier: 'normal', hp_mult: 0.8, loot: ['dedo Sukuna', 'energia amaldiçoada'] },
    { name: 'Mahito', emoji: '😈', tier: 'elite', hp_mult: 4, loot: ['Transfiguração', 'Black Flash'] },
    { name: 'Sukuna', emoji: '👹', tier: 'boss', hp_mult: 15, loot: ['Décimo Dedo', 'Corte Espacial'] },
  ],
  demonslayer: [
    { name: 'Demônio Comum', emoji: '👹', tier: 'normal', hp_mult: 1, loot: ['cristal demoníaco', 'sangue'] },
    { name: 'Muzan', emoji: '🧛', tier: 'boss', hp_mult: 12, loot: ['Sangue de Muzan', 'Blue Spider Lily'] },
  ],
  dragonball: [
    { name: 'Saibaman', emoji: '🌱', tier: 'normal', hp_mult: 0.5, loot: ['capsule', 'senzu'] },
    { name: 'Frieza', emoji: '👽', tier: 'boss', hp_mult: 10, loot: ['Esfera do Dragão', 'Death Beam'] },
    { name: 'Jiren', emoji: '💪', tier: 'boss', hp_mult: 14, loot: ['Ultra Instinto Fragment', 'Ki Cristal'] },
  ],
};

// ══════════════════════════════════════════════════════════════
// ITENS
// ══════════════════════════════════════════════════════════════
const ITEMS = {
  // Cura
  'poção de vida':    { type: 'consumivel', emoji: '🧪', effect: { hp: 50 }, rarity: 'comum', price: 20 },
  'elixir da vida':   { type: 'consumivel', emoji: '❤️‍🔥', effect: { hp_full: true }, rarity: 'epico', price: 500 },
  'poção de mana':    { type: 'consumivel', emoji: '💧', effect: { mp: 30 }, rarity: 'comum', price: 25 },
  'poção de XP':      { type: 'consumivel', emoji: '⭐', effect: { xp: 100 }, rarity: 'incomum', price: 50 },
  'poção de força':   { type: 'consumivel', emoji: '💪', effect: { str_buff: 5 }, rarity: 'raro', price: 100 },

  // Armas
  'shuriken':         { type: 'arma', emoji: '⭐', effect: { str: 2 }, rarity: 'comum', price: 30 },
  'kunai':            { type: 'arma', emoji: '🗡️', effect: { str: 4 }, rarity: 'comum', price: 50 },
  'katana':           { type: 'arma', emoji: '⚔️', effect: { str: 8 }, rarity: 'incomum', price: 300 },
  'espada negra':     { type: 'arma', emoji: '🗡️', effect: { str: 12 }, rarity: 'raro', price: 800 },
  'zangetsu':         { type: 'arma', emoji: '⚔️', effect: { str: 18 }, rarity: 'lendario', price: 5000 },
  'espada celestial': { type: 'arma', emoji: '⚔️', effect: { str: 25, int: 10 }, rarity: 'mitico', price: 50000 },

  // Armaduras
  'bandana ninja':    { type: 'armadura', emoji: '🥷', effect: { vit: 3 }, rarity: 'comum', price: 100 },
  'colete anti-bala': { type: 'armadura', emoji: '🦺', effect: { vit: 8 }, rarity: 'incomum', price: 400 },
  'armadura hashira': { type: 'armadura', emoji: '🛡️', effect: { vit: 15 }, rarity: 'epico', price: 3000 },

  // Materiais
  'cristal mana':      { type: 'material', emoji: '💎', rarity: 'comum', price: 15 },
  'cristal demoníaco': { type: 'material', emoji: '🔮', rarity: 'raro', price: 200 },
  'essência':          { type: 'material', emoji: '✨', rarity: 'incomum', price: 80 },
  'scroll':            { type: 'material', emoji: '📜', rarity: 'comum', price: 25 },
  'pergaminho proibido':{ type: 'material', emoji: '📜', rarity: 'epico', price: 1500 },
  'Akuma no Mi':       { type: 'material', emoji: '🍎', rarity: 'lendario', price: 10000 },
  'Esfera do Dragão':  { type: 'material', emoji: '🔮', rarity: 'mitico', price: 50000 },
  'Sharingan Eterno':  { type: 'material', emoji: '👁️', rarity: 'mitico', price: 100000 },
};

// ══════════════════════════════════════════════════════════════
// QUESTS POR UNIVERSO
// ══════════════════════════════════════════════════════════════
const QUESTS = [
  // NARUTO
  { id:'academia_ninja', title:'🍥 Academia Ninja', universe:'naruto', chapter:1,
    story:'Acabas de entrar na Academia Ninja de Konoha. Iruka-sensei olha para ti. "Vamos ver do que és feito."',
    choices:[
      { text:'🎯 Provar o meu valor', next:'exame_chunin', reward:{ xp:80, coins:50 } },
      { text:'📚 Estudar jutsus primeiro', next:'treino_jutsu', reward:{ xp:40, item:'scroll' } },
    ]},
  { id:'exame_chunin', title:'🍥 Exame Chunin', universe:'naruto', chapter:2,
    story:'Estás no Exame Chunin. Oponente aparece. "Vamos lutar!"',
    choices:[
      { text:'⚔️ Usar taijutsu', next:'luta_chunin', reward:{ xp:120, hp_cost:30 } },
      { text:'🌀 Usar jutsu', next:'jutsu_chunin', reward:{ xp:100, mp_cost:20 } },
    ]},
  { id:'treino_jutsu', title:'🍥 Treino de Jutsu', universe:'naruto', chapter:2,
    story:'Kakashi aparece. "Vou te ensinar um jutsu poderoso. Mas é difícil."',
    choices:[
      { text:'🍥 Rasengan', next:'aprender_rasengan', reward:{ xp:200, item:'kunai', skill:'Rasengan' } },
      { text:'⚡ Chidori', next:'aprender_chidori', reward:{ xp:200, item:'shuriken', skill:'Chidori' } },
    ]},

  // ONE PIECE
  { id:'grand_line', title:'🏴‍☠️ Grand Line', universe:'onepiece', chapter:1,
    story:'O teu navio parte para a Grand Line. "AVANTE! O One Piece é nosso!"',
    choices:[
      { text:'⚓ Navegar pela Rota Principal', next:'ilha_unknown', reward:{ xp:100, coins:200 } },
      { text:'🏝️ Explorar ilha misteriosa', next:'ilha_misteriosa', reward:{ xp:80, item:'mapa' } },
    ]},

  // DEMON SLAYER
  { id:'corpo_caçadores', title:'🗡️ Corpo de Caçadores', universe:'demonslayer', chapter:1,
    story:'Recebeste a tua Espada Nichirin. "O primeiro demônio aparece."',
    choices:[
      { text:'🗡️ Respiração da Água', next:'treino_agua', reward:{ xp:100, item:'katana' } },
      { text:'🔥 Respiração do Fogo', next:'treino_fogo', reward:{ xp:100, item:'katana' } },
    ]},

  // JUJUTSU KAISEN
  { id:'escola_jujutsu', title:'👁️ Escola de Jujutsu', universe:'jujutsu', chapter:1,
    story:'Gojo-sensei aparece. "Vou te treinar. Mas primeiro, sobrevive."',
    choices:[
      { text:'👁️ Aprender o Infinito', next:'treino_infinito', reward:{ xp:200, mp_cost:50 } },
      { text:'👊 Punho Negro', next:'treino_punho', reward:{ xp:150, item:'kunai' } },
    ]},

  // DRAGON BALL
  { id:'treino_kami', title:'🐉 Treino com Kami', universe:'dragonball', chapter:1,
    story:'Kami-sama te convidou para treinar na Torre de Karin.',
    choices:[
      { text:'🐉 Aprender Kamehameha', next:'treino_kamehameha', reward:{ xp:200, skill:'Kamehameha' } },
      { text:'💪 Treinar o corpo', next:'treino_corpo', reward:{ xp:100, hp_cost:50 } },
    ]},
];

// ══════════════════════════════════════════════════════════════
// COMBATE
// ══════════════════════════════════════════════════════════════
function calcDamage(attacker, defender, skill = 'basic') {
  const charDef = CHARACTERS[attacker.character];
  const primaryStat = charDef ? (UNIVERSES[charDef.universe]?.primaryStat || 'str') : 'str';
  const atkStat = attacker.stats?.[primaryStat] || 5;
  const defStat = defender.stats?.vit || 5;
  const rank = getRank(attacker.level || 1);
  const base = atkStat * 2 + R(1, atkStat) * rank.mult;
  const defense = defStat;
  const crit = Math.random() < (attacker.stats?.luk || 1) * 0.03;
  let dmg = Math.max(1, Math.floor(base - defense));
  if (crit) dmg = Math.floor(dmg * 2.5);
  if (skill === 'heavy') dmg = Math.floor(dmg * 1.5);
  if (skill === 'magic') dmg = Math.floor(dmg * 1.3 + (attacker.stats?.int || 0));
  return { dmg, crit };
}

function generateEnemy(level, universe = null, tier = 'normal') {
  const uni = universe || P(Object.keys(ENEMIES));
  const pool = ENEMIES[uni] || ENEMIES.naruto;
  const tierPool = pool.filter(e => e.tier === tier) || pool;
  const template = P(tierPool);
  const rank = getRank(level);
  const hp = Math.floor((50 + level * 20) * (template.hp_mult || 1) * rank.mult);
  return {
    name: template.name, emoji: template.emoji, level, hp, maxHp: hp,
    stats: {
      str: Math.floor(level * 2 * rank.mult),
      dex: Math.floor(level * 1.5 * rank.mult),
      int: Math.floor(level * 1.2 * rank.mult),
      vit: Math.floor(level * 1.8 * rank.mult),
      luk: Math.floor(level * 0.5),
    },
    loot: template.loot || [], tier, universe: uni,
  };
}

function generateLoot(enemy) {
  const loot = [];
  const chance = enemy.tier === 'boss' ? 0.9 : enemy.tier === 'elite' ? 0.5 : 0.2;
  for (const item of (enemy.loot || [])) {
    if (Math.random() < chance) loot.push(item);
  }
  if (Math.random() < (enemy.tier === 'boss' ? 0.3 : 0.05)) {
    const rare = Object.entries(ITEMS).filter(([, v]) => v.rarity === 'raro' || v.rarity === 'epico');
    if (rare.length) loot.push(P(rare)[0]);
  }
  return loot;
}

// ══════════════════════════════════════════════════════════════
// PLAYER (MongoDB)
// ══════════════════════════════════════════════════════════════
const _cache = new Map();

async function getPlayer(number) {
  const num = String(number).replace(/\D/g, '');
  if (_cache.has(num)) return _cache.get(num);
  const RPGPlayer = require('../../database/models/RPGPlayer');
  let p = await RPGPlayer.findOne({ whatsappNumber: num });
  if (!p) p = await RPGPlayer.getOrCreate(num);
  _cache.set(num, p);
  return p;
}

async function savePlayer(p) {
  try {
    await p.save();
    _cache.set(String(p.whatsappNumber).replace(/\D/g, ''), p);
  } catch (e) {
    console.warn('[RPG] save:', e.message?.slice(0, 50));
  }
}

function levelUp(p) {
  p.level++;
  p.xpNext = p.level * 100 + p.level * p.level * 10;
  p.maxHp += 10 + (p.stats?.vit || 5) * 2;
  p.maxMp += 5 + (p.stats?.int || 5);
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  const stats = ['str', 'dex', 'int', 'vit', 'luk'];
  p.stats[stats[Math.floor(Math.random() * stats.length)]]++;
}

function addXP(p, amount) {
  p.xp += amount;
  let leveled = false;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    levelUp(p);
    leveled = true;
  }
  return leveled;
}

module.exports = {
  UNIVERSES, CHARACTERS, RANKS, ENEMIES, ITEMS, QUESTS,
  getRank, calcDamage, generateEnemy, generateLoot,
  getPlayer, savePlayer, levelUp, addXP,
  _cache,
};
