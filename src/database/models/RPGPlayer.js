const mongoose = require('mongoose');

const RPGPlayerSchema = new mongoose.Schema({
  whatsappNumber: { type: String, required: true, unique: true, index: true },

  // Identidade
  name:       { type: String, default: 'Aventureiro' },
  race:       { type: String, default: 'humano' },
  class:      { type: String, default: 'guerreiro' },
  title:      { type: String, default: '' },
  faction:    { type: String, default: null },
  guild:      { type: String, default: null },
  guildTitle: { type: String, default: '' },

  // Nível e XP
  level:  { type: Number, default: 1 },
  xp:     { type: Number, default: 0 },
  xpNext: { type: Number, default: 100 },

  // Vida e Mana
  hp:    { type: Number, default: 150 },
  maxHp: { type: Number, default: 150 },
  mp:    { type: Number, default: 80 },
  maxMp: { type: Number, default: 80 },
  lives: { type: Number, default: 3 },

  // Stats RPG
  stats: {
    str: { type: Number, default: 6 },
    dex: { type: Number, default: 6 },
    int: { type: Number, default: 6 },
    vit: { type: Number, default: 6 },
    luk: { type: Number, default: 6 },
  },

  // Economia
  coins: { type: Number, default: 50 },
  bank:  { type: Number, default: 0 },

  // Inventário
  inventory: [{ type: String }],

  // Equipamento
  equipment: {
    weapon:    { type: String, default: null },
    armor:     { type: String, default: null },
    accessory: { type: String, default: null },
  },

  // Quest
  quest: {
    current:   { type: String, default: 'prologo' },
    step:      { type: Number, default: 0 },
    completed: [{ type: String }],
  },

  // Pets (máx 3)
  pets: [{
    id: { type: String },
    name: { type: String },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    hp: { type: Number, default: 100 },
    maxHp: { type: Number, default: 100 },
    active: { type: Boolean, default: false },
  }],

  // Skills desbloqueadas
  skills: [{ type: String }],

  // Títulos desbloqueados
  titles: [{ type: String }],

  // Achievements
  achievements: [{
    id: { type: String },
    name: { type: String },
    unlockedAt: { type: Date, default: Date.now },
  }],

  // Estatísticas
  kills:      { type: Number, default: 0 },
  deaths:     { type: Number, default: 0 },
  bossKills:  { type: Number, default: 0 },
  streak:     { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  karma:      { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },

  // Crafting
  craftingLevel: { type: Number, default: 1 },
  recipesKnown:  [{ type: String }],

  // Cooldowns
  lastDaily:   { type: Date, default: null },
  lastWork:    { type: Date, default: null },
  lastBattle:  { type: Date, default: null },
  lastExplore: { type: Date, default: null },
  lastQuest:   { type: Date, default: null },
  lastCraft:   { type: Date, default: null },
  lastPet:     { type: Date, default: null },

}, { timestamps: true });

// ─── Helpers ────────────────────────────────────────
const RACES = {
  humano:    { bonus: { str:1, dex:1, int:1, vit:1, luk:1 } },
  elfo:      { bonus: { str:0, dex:3, int:2, vit:0, luk:1 } },
  anao:      { bonus: { str:3, dex:0, int:0, vit:3, luk:0 } },
  orc:       { bonus: { str:4, dex:0, int:-1, vit:2, luk:0 } },
  dragao:    { bonus: { str:2, dex:1, int:3, vit:1, luk:0 } },
  sombra:    { bonus: { str:1, dex:3, int:1, vit:-1, luk:2 } },
  celestial: { bonus: { str:0, dex:1, int:4, vit:1, luk:1 } },
  maldito:   { bonus: { str:3, dex:2, int:0, vit:-2, luk:3 } },
};

RPGPlayerSchema.statics.getOrCreate = async function(number, name = 'Aventureiro', race = 'humano', cls = 'guerreiro') {
  let p = await this.findOne({ whatsappNumber: number });
  if (p) return p;

  const r = RACES[race] || RACES.humano;
  const base = { str:5, dex:5, int:5, vit:5, luk:5 };
  for (const [k, v] of Object.entries(r.bonus)) base[k] += v;

  p = await this.create({
    whatsappNumber: number,
    name, race, class: cls,
    hp: 100 + base.vit * 5,
    maxHp: 100 + base.vit * 5,
    mp: 50 + base.int * 3,
    maxMp: 50 + base.int * 3,
    stats: base,
    inventory: ['poção de vida', 'poção de vida'],
  });
  return p;
};

module.exports = mongoose.model('RPGPlayer', RPGPlayerSchema);
