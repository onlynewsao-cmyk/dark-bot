/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — RPG ENGINE (MongoDB)                         ║
 * ║   Motor RPG completo: personagens, combate, guildas, quests   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

// ══════════════════════════════════════════════════════════════
// RAÇAS & CLASSES
// ══════════════════════════════════════════════════════════════
const RACES = {
  humano:    { emoji: '🧑', bonus: { str: 1, dex: 1, int: 1, vit: 1, luk: 1 }, desc: 'Versátil e adaptável. Bônus equilibrado em tudo.' },
  elfo:      { emoji: '🧝', bonus: { str: 0, dex: 3, int: 2, vit: 0, luk: 1 }, desc: 'Ágil e sábio. Mestre do arco e da magia antiga.' },
  anao:      { emoji: '⛏️', bonus: { str: 3, dex: 0, int: 0, vit: 3, luk: 0 }, desc: 'Resistente e forte. Forja os melhores equipamentos.' },
  orc:       { emoji: '👹', bonus: { str: 4, dex: 0, int: -1, vit: 2, luk: 0 }, desc: 'Brutal e implacável. Força bruta devastadora.' },
  dragao:    { emoji: '🐲', bonus: { str: 2, dex: 1, int: 3, vit: 1, luk: 0 }, desc: 'Sangue de dragão. Magia de fogo e asas poderosas.' },
  sombra:    { emoji: '🌑', bonus: { str: 1, dex: 3, int: 1, vit: -1, luk: 2 }, desc: 'Nasceste nas trevas. Invisível e letal.' },
  celestial: { emoji: '✨', bonus: { str: 0, dex: 1, int: 4, vit: 1, luk: 1 }, desc: 'Tocado pelos deuses. Magia divina poderosa.' },
  maldito:   { emoji: '💀', bonus: { str: 3, dex: 2, int: 0, vit: -2, luk: 3 }, desc: 'Amaldiçoado. Poder imenso mas frágil.' },
};

const CLASSES = {
  guerreiro:  { emoji: '⚔️', primary: 'str', desc: 'Mestre do combate corpo a corpo. Tanque da party.' },
  mago:       { emoji: '🔮', primary: 'int', desc: 'Canaliza energia arcana. Dano em área devastador.' },
  arqueiro:   { emoji: '🏹', primary: 'dex', desc: 'Precisão mortal. Ataca de longe sem piedade.' },
  ladino:     { emoji: '🗡️', primary: 'dex', desc: 'Furtivo e letal. Críticos devastadores.' },
  clerigo:    { emoji: '✝️', primary: 'int', desc: 'Curandeiro divino. Mantém a party viva.' },
  paladino:   { emoji: '🛡️', primary: 'vit', desc: 'Guerreiro sagrado. Tanque e healer híbrido.' },
  berserker:  { emoji: '🪓', primary: 'str', desc: 'Fúria incontrolável. Dano massivo, defesa zero.' },
  necromante: { emoji: '☠️', primary: 'int', desc: 'Controla os mortos. Invoca exércitos de esqueletos.' },
  bardo:      { emoji: '🎵', primary: 'luk', desc: 'Música que cura e destrói. Suporte versátil.' },
  alquimista: { emoji: '⚗️', primary: 'int', desc: 'Poções e explosivos. Mestre da preparação.' },
};

// ══════════════════════════════════════════════════════════════
// BIOMAS & MUNDO
// ══════════════════════════════════════════════════════════════
const BIOMES = {
  floresta:       { emoji: '🌲', danger: 1, desc: 'Árvores antigas escondem segredos e criaturas.' },
  montanha:       { emoji: '⛰️', danger: 2, desc: 'Picos gelados com dragões e tempestades.' },
  deserto:        { emoji: '🏜️', danger: 2, desc: 'Areias mortais com escorpiões gigantes.' },
  pantano:        { emoji: '🌿', danger: 3, desc: 'Névoa tóxica e criaturas das profundezas.' },
  vulcao:         { emoji: '🌋', danger: 4, desc: 'Lava e demónios. Só os fortes sobrevivem.' },
  abismo:         { emoji: '🕳️', danger: 5, desc: 'O vazio entre mundos. Morte certa para os fracos.' },
  cidade:         { emoji: '🏰', danger: 0, desc: 'Civilização. Comércio, guildas e tavernas.' },
  cemiterio:      { emoji: '🪦', danger: 3, desc: 'Os mortos não descansam aqui.' },
  templo:         { emoji: '🛕', danger: 2, desc: 'Ruínas sagradas com tesouros e armadilhas.' },
  floresta_negra: { emoji: '🌑', danger: 4, desc: 'Escuridão eterna. Criaturas das sombras.' },
};

// ══════════════════════════════════════════════════════════════
// NPCs & DIÁLOGOS
// ══════════════════════════════════════════════════════════════
const NPCS = {
  mercador: {
    name: 'Grimwald, o Mercador', emoji: '🧔',
    dialogues: [
      'Bem-vindo à minha humilde loja! Tenho o que precisas... se tiveres coins.',
      'Hmm, tens cara de quem precisa de uma espada nova...',
      'Cuidado com o pântano a leste. Perdi três caravanas lá.',
      'Ouvi dizer que o dragão do vulcão acordou. Bons negócios para mim, mau para ti.',
    ],
  },
  ferreiro: {
    name: 'Thorgar, o Ferreiro', emoji: '⚒️',
    dialogues: [
      'Trás-me minério e eu faço-te uma lâmina que corta o vento!',
      'Esta espada? Foi forjada no coração do vulcão. Custa 500 coins.',
      'O aço comum não chega para o que vem aí. Precisas de mithril.',
    ],
  },
  curandeira: {
    name: 'Elara, a Curandeira', emoji: '🧙‍♀️',
    dialogues: [
      'As tuas feridas são profundas... mas eu posso curar. Por um preço.',
      'Sinto uma escuridão em ti. Cuidado com o abismo.',
      'Toma esta poção. Vai precisar dela onde vais.',
    ],
  },
  tavernerio: {
    name: 'Bjorn, o Tavernário', emoji: '🍺',
    dialogues: [
      'Senta-te! A cerveja é por minha conta... mentira, são 5 coins.',
      'Ouvi uma história incrível hoje. Queres ouvir?',
      'O tipo encapuzado ali no canto? Não te metas com ele.',
      'Há um torneio de arena amanhã. Inscreve-te se tiveres coragem.',
    ],
  },
  misterioso: {
    name: '???', emoji: '🌑',
    dialogues: [
      '...tu não devias estar aqui.',
      'O destino é uma roda. E tu estás prestes a cair.',
      'Procura a chave no templo. Antes que seja tarde.',
      'Eu sei o que fizeste... e o que vais fazer.',
    ],
  },
};

// ══════════════════════════════════════════════════════════════
// QUESTS NARRATIVAS
// ══════════════════════════════════════════════════════════════
const QUESTS = [
  {
    id: 'prologo', title: '📜 O Despertar', chapter: 1,
    story: 'Acordas numa cela escura. As tuas memórias estão fragmentadas. Uma voz sussurra: "Foge... antes que eles voltem." A porta está entreaberta.',
    choices: [
      { text: '🚪 Fugir pela porta', next: 'fuga', reward: { xp: 50, coins: 20 } },
      { text: '🔍 Investigar a cela', next: 'investigar', reward: { xp: 30, item: 'chave enferrujada' } },
      { text: '💀 Esperar em silêncio', next: 'emboscada', reward: { xp: 10 } },
    ],
  },
  {
    id: 'fuga', title: '📜 A Fuga', chapter: 1,
    story: 'Corres pelo corredor. Guardas aproximam-se! Vês duas saídas: uma janela para o telhado e uma escada para as catacumbas.',
    choices: [
      { text: '🪟 Saltar pela janela', next: 'telhado', reward: { xp: 80, hp_cost: 20 } },
      { text: '🕳️ Descer às catacumbas', next: 'catacumbas', reward: { xp: 60, item: 'mapa antigo' } },
    ],
  },
  {
    id: 'investigar', title: '📜 Segredos da Cela', chapter: 1,
    story: 'Encontras uma pedra solta na parede. Atrás dela, um diário antigo e uma chave enferrujada. O diário fala de uma conspiração...',
    choices: [
      { text: '📖 Ler o diário completo', next: 'conspiracao', reward: { xp: 100, lore: true } },
      { text: '🔑 Usar a chave na porta', next: 'fuga', reward: { xp: 40 } },
    ],
  },
  {
    id: 'emboscada', title: '📜 A Emboscada', chapter: 1,
    story: 'A porta abre-se. Dois guardas entram. "O prisioneiro acordou. Mata-o." Tens segundos para reagir.',
    choices: [
      { text: '⚔️ Lutar com as mãos nuas', next: 'luta_guardas', reward: { xp: 70, hp_cost: 30 } },
      { text: '🗣️ Tentar negociar', next: 'negociar', reward: { xp: 40, coins: -50 } },
    ],
  },
  {
    id: 'telhado', title: '📜 Nos Telhados', chapter: 2,
    story: 'Saltas para o telhado. A cidade estende-se abaixo de ti. Guardas patrulham as ruas. Vês uma taverna com luz acesa e um beco escuro.',
    choices: [
      { text: '🍺 Entrar na taverna', next: 'taverna', reward: { xp: 50, npc: 'tavernerio' } },
      { text: '🌑 Seguir pelo beco', next: 'beco', reward: { xp: 80, npc: 'misterioso' } },
    ],
  },
  {
    id: 'catacumbas', title: '📜 As Catacumbas', chapter: 2,
    story: 'Escuridão total. O mapa antigo brilha fracamente. Vês ossos no chão e ouves passos atrás de ti.',
    choices: [
      { text: '🏃 Correr na direção da saída', next: 'saida_catacumbas', reward: { xp: 60 } },
      { text: '⚔️ Enfrentar o que te segue', next: 'luta_morto', reward: { xp: 100, item: 'amuleto dos mortos' } },
    ],
  },
  {
    id: 'conspiracao', title: '📜 A Conspiração', chapter: 2,
    story: 'O diário revela: o rei foi envenenado pelo seu conselheiro. Tu és o único que sabe a verdade. Mas quem vai acreditar num prisioneiro?',
    choices: [
      { text: '🏰 Ir ao castelo expor a verdade', next: 'castelo', reward: { xp: 200, coins: 500, title: 'Portador da Verdade' } },
      { text: '🌑 Procurar aliados primeiro', next: 'beco', reward: { xp: 120, npc: 'misterioso' } },
    ],
  },
  {
    id: 'taverna', title: '📜 A Taverna do Lobo', chapter: 2,
    story: 'Bjorn, o tavernário, serve-te uma cerveja. "Tens cara de problema", diz ele. Um tipo encapuzado observa-te do canto.',
    choices: [
      { text: '🗣️ Falar com o encapuzado', next: 'beco', reward: { xp: 80, npc: 'misterioso' } },
      { text: '🍺 Pedir informação ao Bjorn', next: 'info_taverna', reward: { xp: 50, coins: 30, npc: 'tavernerio' } },
      { text: '💤 Descansar num quarto', next: 'descanso', reward: { hp_restore: 100 } },
    ],
  },
  {
    id: 'beco', title: '📜 O Encontro', chapter: 3,
    story: 'O encapuzado revela-se: uma sombra com olhos brilhantes. "Eu sei quem és. E sei o que procuras. Posso ajudar... por um preço."',
    choices: [
      { text: '🤝 Aceitar a ajuda', next: 'alianca_sombra', reward: { xp: 150, item: 'adaga das sombras', faction: 'sombras' } },
      { text: '🚫 Recusar e ir sozinho', next: 'solo', reward: { xp: 100, title: 'Lobo Solitário' } },
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// SISTEMA DE COMBATE
// ══════════════════════════════════════════════════════════════
function calcDamage(attacker, defender, skill = 'basic') {
  const atkStat = attacker.stats[CLASSES[attacker.class]?.primary || 'str'] || 5;
  const defStat = defender.stats?.vit || 5;
  const base = atkStat * 2 + R(1, atkStat);
  const defense = defStat + (defender.equipment?.armor?.def || 0);
  const crit = Math.random() < (attacker.stats.luk || 1) * 0.02;
  let dmg = Math.max(1, base - defense);
  if (crit) dmg = Math.floor(dmg * 2.5);
  if (skill === 'heavy') dmg = Math.floor(dmg * 1.5);
  if (skill === 'magic') dmg = Math.floor(dmg * 1.3 + (attacker.stats.int || 0));
  return { dmg, crit };
}

function generateEnemy(level, type = 'normal') {
  const names = {
    normal: ['Goblin', 'Esqueleto', 'Lobo Sombrio', 'Aranha Gigante', 'Bandido'],
    elite: ['Cavaleiro Negro', 'Mago Sombrio', 'Orc Berserker', 'Necromante'],
    boss: ['Dragão Ancião', 'Rei Demónio', 'Lich Imortal', 'Titã Sombrio', 'Deus Caído'],
  };
  const name = P(names[type] || names.normal);
  const mult = type === 'boss' ? 5 : type === 'elite' ? 2.5 : 1;
  return {
    name, level,
    hp: Math.floor((50 + level * 20) * mult),
    maxHp: Math.floor((50 + level * 20) * mult),
    stats: {
      str: Math.floor(level * 2 * mult),
      dex: Math.floor(level * 1.5 * mult),
      int: Math.floor(level * 1.2 * mult),
      vit: Math.floor(level * 1.8 * mult),
      luk: Math.floor(level * 0.5),
    },
    equipment: {},
    class: P(['guerreiro', 'mago', 'arqueiro']),
    type,
  };
}

// ══════════════════════════════════════════════════════════════
// JOGADOR — agora com MongoDB
// ══════════════════════════════════════════════════════════════
const _cache = new Map(); // cache local para performance

async function getPlayer(number) {
  const num = String(number).replace(/\D/g, '');
  if (_cache.has(num)) return _cache.get(num);

  const RPGPlayer = require('../database/models/RPGPlayer');
  let p = await RPGPlayer.findOne({ whatsappNumber: num });
  if (!p) {
    p = await RPGPlayer.getOrCreate(num);
  }
  _cache.set(num, p);
  return p;
}

async function savePlayer(p) {
  try {
    await p.save();
    _cache.set(String(p.whatsappNumber).replace(/\D/g, ''), p);
  } catch (e) {
    console.warn('[RPG] save error:', e.message?.slice(0, 50));
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
  return p;
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
  RACES, CLASSES, BIOMES, NPCS, QUESTS,
  calcDamage, generateEnemy,
  getPlayer, savePlayer, levelUp, addXP,
  _cache,
};
