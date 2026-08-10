/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — ANIME RPG ENGINE (adaptado do NazumaMarce)   ║
 * ║   Multiverso: Naruto, One Piece, Solo Leveling,              ║
 * ║   Jujutsu Kaisen, Demon Slayer, Dragon Ball                  ║
 * ║                                                               ║
 * ║   Sistemas: Combate, PvP, Gacha, Forja, Guildas, Raids,     ║
 * ║             Ranking, Mercado, Loja, Sombras                  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

// ══════════════════════════════════════════════════════════════
// ORIGENS (Linhagens do Multiverso)
// ══════════════════════════════════════════════════════════════
const ORIGINS = {
  shinobi:     { emoji: '🍥', name: 'Shinobi', desc: 'Ninja de Konoha. Chakra e Jutsus.', bonus: { str:2, dex:3, int:2, vit:1, luk:2 } },
  pirata:      { emoji: '🏴‍☠️', name: 'Pirata do Mar', desc: 'Navega a Grand Line. Haki e Akuma no Mi.', bonus: { str:3, dex:1, int:1, vit:3, luk:2 } },
  cacador:     { emoji: '⚔️', name: 'Caçador das Sombras', desc: 'Rank S. Monarca das Sombras.', bonus: { str:3, dex:3, int:1, vit:1, luk:2 } },
  feiticeiro:  { emoji: '👁️', name: 'Feiticeiro Jujutsu', desc: 'Domínios e Maldições.', bonus: { str:1, dex:2, int:4, vit:1, luk:2 } },
  hashira:     { emoji: '🗡️', name: 'Hashira', desc: 'Mestre da Respiração. Corta demônios.', bonus: { str:2, dex:4, int:1, vit:2, luk:1 } },
  saiyajin:    { emoji: '🐉', name: 'Saiyajin', desc: 'Guerreiro do espaço. Ki e Transformações.', bonus: { str:4, dex:2, int:1, vit:2, luk:1 } },
};

// ══════════════════════════════════════════════════════════════
// RANKS (estilo Solo Leveling)
// ══════════════════════════════════════════════════════════════
const RANKS = [
  { name:'E', emoji:'⚪', min_level:1,  mult:1.0 },
  { name:'D', emoji:'🟢', min_level:5,  mult:1.2 },
  { name:'C', emoji:'🔵', min_level:10, mult:1.5 },
  { name:'B', emoji:'🟣', min_level:20, mult:2.0 },
  { name:'A', emoji:'🟡', min_level:30, mult:2.5 },
  { name:'S', emoji:'🔴', min_level:50, mult:3.5 },
  { name:'SS',emoji:'⭐', min_level:70, mult:5.0 },
  { name:'SSS',emoji:'💎',min_level:100, mult:8.0 },
];

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.min_level) rank = r; }
  return rank;
}

// ══════════════════════════════════════════════════════════════
// ARMAS (catálogo — inspirado anime)
// ══════════════════════════════════════════════════════════════
const WEAPONS = {
  'shuriken':      { name:'Shuriken', emoji:'⭐', base_atk:10, anime:'Naruto', effect:'Ataque rápido', price:50 },
  'kunai':         { name:'Kunai', emoji:'🗡️', base_atk:15, anime:'Naruto', effect:'Corte venenoso', price:100 },
  'katana':        { name:'Katana', emoji:'⚔️', base_atk:25, anime:'Demon Slayer', effect:'Corte limpo', price:300 },
  'enma':          { name:'Espada Enma', emoji:'⚔️', base_atk:55, anime:'One Piece', effect:'Consome Haki: +40%', price:2000 },
  'samehada':      { name:'Samehada', emoji:'🦈', base_atk:40, anime:'Naruto', effect:'Rouba 15 CK', price:1500 },
  'zangetsu':      { name:'Zangetsu', emoji:'⚔️', base_atk:60, anime:'Bleach', effect:'Corte espiritual', price:3000 },
  'kasaka':        { name:'Espada de Kasaka', emoji:'🐍', base_atk:35, anime:'Solo Leveling', effect:'Sangramento +15%', price:800 },
  'lanca_ceu':     { name:'Lança do Céu', emoji:'🔱', base_atk:50, anime:'Jujutsu Kaisen', effect:'Anula defesas', price:2500 },
  'nichirin':      { name:'Espada Nichirin', emoji:'🗡️', base_atk:45, anime:'Demon Slayer', effect:'+50% vs demônios', price:1800 },
  'esfera_dragao': { name:'Esfera do Dragão', emoji:'🔮', base_atk:100, anime:'Dragon Ball', effect:'Desejo: +50% stats', price:50000 },
};

// ══════════════════════════════════════════════════════════════
// BOSS DUNGEONS (Multiverso)
// ══════════════════════════════════════════════════════════════
const BOSSES = {
  'S': { name:'Ryomen Sukuna (Rei das Maldições)', emoji:'👹', anime:'Jujutsu Kaisen', hp:1200, atk:85, def:30, xp:1500, berries:50000, shadowRank:'S' },
  'A': { name:'Kaido das Feras', emoji:'🐉', anime:'One Piece', hp:900, atk:70, def:45, xp:900, berries:30000, shadowRank:'A' },
  'B': { name:'Pain / Nagato (Akatsuki)', emoji:'🍥', anime:'Naruto', hp:600, atk:55, def:20, xp:500, berries:15000, shadowRank:'B' },
  'C': { name:'Muzan Kibutsuji', emoji:'🧛', anime:'Demon Slayer', hp:400, atk:40, def:15, xp:300, berries:8000, shadowRank:'C' },
  'D': { name:'Goblin King', emoji:'👺', anime:'Solo Leveling', hp:200, atk:25, def:10, xp:100, berries:3000, shadowRank:'D' },
};

// ══════════════════════════════════════════════════════════════
// GACHA — Catálogo de Cartas
// ══════════════════════════════════════════════════════════════
const CARD_CATALOG = [
  { id:'goku-ssj', name:'Goku Super Saiyajin', anime:'Dragon Ball', rarity:'Lendário', atk:30, hp:20, trait:'Kamehameha +50% dano' },
  { id:'luffy-g5', name:'Luffy Gear 5', anime:'One Piece', rarity:'Mítico', atk:40, hp:30, trait:'Toon Force: esquiva 30%' },
  { id:'gojo-inf', name:'Gojo Satoru', anime:'Jujutsu Kaisen', rarity:'Mítico', atk:35, hp:25, trait:'Infinito: -50% dano recebido' },
  { id:'naruto-kurama', name:'Naruto Modo Kurama', anime:'Naruto', rarity:'Lendário', atk:28, hp:22, trait:'Rasenshuriken: crítico +20%' },
  { id:'jinwoo', name:'Sung Jin-Woo', anime:'Solo Leveling', rarity:'Mítico', atk:38, hp:28, trait:'Arise: +1 sombra por dungeon' },
  { id:'tanjiro', name:'Tanjiro Hinokami', anime:'Demon Slayer', rarity:'Épico', atk:20, hp:15, trait:'Respiração: +25% ATK por turno' },
  { id:'zoro-3sword', name:'Roronoa Zoro', anime:'One Piece', rarity:'Lendário', atk:32, hp:18, trait:'Santoryu: 3 cortes por turno' },
  { id:'sasuke-rinne', name:'Sasuke Rinnegan', anime:'Naruto', rarity:'Lendário', atk:30, hp:20, trait:'Amaterasu: queima contínua' },
  { id:'vegeta-ue', name:'Vegeta Ultra Ego', anime:'Dragon Ball', rarity:'Épico', atk:25, hp:20, trait:'Final Flash: +100% no último HP' },
  { id:'itadori-bf', name:'Itadori Black Flash', anime:'Jujutsu Kaisen', rarity:'Raro', atk:15, hp:12, trait:'Black Flash: crítico garantido' },
  { id:'rengoku', name:'Kyojuro Rengoku', anime:'Demon Slayer', rarity:'Épico', atk:22, hp:18, trait:'Chama: +30% vs bosses' },
  { id:'igris', name:'Igris Cavaleiro', anime:'Solo Leveling', rarity:'Raro', atk:14, hp:14, trait:'Proteção: -20% dano recebido' },
];

const RARITY_WEIGHTS = [
  { rarity:'Mítico', chance:3, emoji:'🔴' },
  { rarity:'Lendário', chance:12, emoji:'🟡' },
  { rarity:'Épico', chance:35, emoji:'🟣' },
  { rarity:'Raro', chance:100, emoji:'🔵' },
];

// ══════════════════════════════════════════════════════════════
// LOJA
// ══════════════════════════════════════════════════════════════
const SHOP = {
  'pocao':   { id:'pocao_hp', name:'Poção de Vida Sênzu', price:300, desc:'Restaura 100% HP', type:'HEAL_HP' },
  'chakra':  { id:'pocao_ck', name:'Elixir de Chakra', price:250, desc:'Restaura 100% Energia', type:'HEAL_ENERGY' },
  'pedra':   { id:'pedra_protecao', name:'Pedra de Proteção', price:1500, desc:'Protege arma na forja', type:'PROTECTION' },
  'xp':      { id:'pocao_xp', name:'Poção de XP', price:500, desc:'+500 XP instantâneo', type:'XP' },
};

// ══════════════════════════════════════════════════════════════
// REFINAMENTO (Forja)
// ══════════════════════════════════════════════════════════════
const REFINEMENT = [
  { target:1,  cost:300,  crystals:5,  chance:95 },
  { target:2,  cost:500,  crystals:10, chance:85 },
  { target:3,  cost:800,  crystals:15, chance:75 },
  { target:4,  cost:1200, crystals:20, chance:65 },
  { target:5,  cost:2000, crystals:30, chance:50 },
  { target:6,  cost:3500, crystals:45, chance:40 },
  { target:7,  cost:5000, crystals:60, chance:30 },
  { target:8,  cost:8000, crystals:80, chance:20 },
  { target:9,  cost:12000,crystals:100,chance:15 },
  { target:10, cost:20000,crystals:150,chance:10 },
];

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

function addXP(p, amount) {
  p.xp += amount;
  let leveled = false;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = p.level * 100 + p.level * p.level * 10;
    p.maxHp += 10 + (p.stats?.vit || 5) * 2;
    p.maxMp += 5 + (p.stats?.int || 5);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    const stats = ['str','dex','int','vit','luk'];
    p.stats[stats[Math.floor(Math.random() * stats.length)]]++;
    leveled = true;
  }
  return leveled;
}

// ─── Health Bar ────────────────────────────────────
function hpBar(current, max, len = 10) {
  const filled = Math.max(0, Math.min(len, Math.round((current / max) * len)));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

module.exports = {
  ORIGINS, RANKS, WEAPONS, BOSSES, CARD_CATALOG, RARITY_WEIGHTS, SHOP, REFINEMENT,
  getRank, addXP, hpBar,
  getPlayer, savePlayer,
  _cache,
};
