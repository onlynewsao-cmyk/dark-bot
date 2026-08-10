/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — RPG ENGINE COMPLETO                          ║
 * ║   Motor RPG: personagens, combate, skills, pets, crafting,    ║
 * ║   quests narrativas, guildas, PvP, achievements, world events ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

// ══════════════════════════════════════════════════════════════
// RAÇAS (8 raças com bónus únicos)
// ══════════════════════════════════════════════════════════════
const RACES = {
  humano:    { emoji: '🧑', bonus: { str:1, dex:1, int:1, vit:1, luk:1 }, desc: 'Versátil. Bónus equilibrado.', skill: 'Adaptar' },
  elfo:      { emoji: '🧝', bonus: { str:0, dex:3, int:2, vit:0, luk:1 }, desc: 'Ágil e sábio. Mestre do arco.', skill: 'Tiro Certeiro' },
  anao:      { emoji: '⛏️', bonus: { str:3, dex:0, int:0, vit:3, luk:0 }, desc: 'Resistente. Melhor forja.', skill: 'Forja Anã' },
  orc:       { emoji: '👹', bonus: { str:4, dex:0, int:-1, vit:2, luk:0 }, desc: 'Brutal. Força devastadora.', skill: 'Fúria Verde' },
  dragao:    { emoji: '🐲', bonus: { str:2, dex:1, int:3, vit:1, luk:0 }, desc: 'Sangue de dragão. Fogo.', skill: 'Sopro Dracônico' },
  sombra:    { emoji: '🌑', bonus: { str:1, dex:3, int:1, vit:-1, luk:2 }, desc: 'Invisível e letal.', skill: 'Passo Sombrio' },
  celestial: { emoji: '✨', bonus: { str:0, dex:1, int:4, vit:1, luk:1 }, desc: 'Magia divina poderosa.', skill: 'Benção Celestial' },
  maldito:   { emoji: '💀', bonus: { str:3, dex:2, int:0, vit:-2, luk:3 }, desc: 'Poder imenso, frágil.', skill: 'Maldição' },
};

// ══════════════════════════════════════════════════════════════
// CLASSES (10 classes com skills únicas)
// ══════════════════════════════════════════════════════════════
const CLASSES = {
  guerreiro:  { emoji: '⚔️', primary: 'str', hp_bonus: 30, mp_bonus: 0,
    skills: ['Golpe Pesado', 'Escudo de Ferro', 'Grito de Guerra', 'Fúria do Berserker'],
    desc: 'Tanque. Dano corpo a corpo.' },
  mago:       { emoji: '🔮', primary: 'int', hp_bonus: 0, mp_bonus: 50,
    skills: ['Bola de Fogo', 'Escudo Arcano', 'Teletransporte', 'Meteoro'],
    desc: 'Magia devastadora. Frágil.' },
  arqueiro:   { emoji: '🏹', primary: 'dex', hp_bonus: 10, mp_bonus: 20,
    skills: ['Tiro Duplo', 'Chuva de Flechas', 'Flecha Explosiva', 'Olho de Águia'],
    desc: 'Ataque à distância. Preciso.' },
  ladino:     { emoji: '🗡️', primary: 'dex', hp_bonus: 10, mp_bonus: 10,
    skills: ['Ataque Furtivo', 'Roubar', 'Veneno', 'Assassinato'],
    desc: 'Críticos altos. Furtivo.' },
  clerigo:    { emoji: '✝️', primary: 'int', hp_bonus: 20, mp_bonus: 40,
    skills: ['Curar', 'Purificar', 'Ressurreição', 'Julgamento Divino'],
    desc: 'Healer. Mantém a party viva.' },
  paladino:   { emoji: '🛡️', primary: 'vit', hp_bonus: 40, mp_bonus: 20,
    skills: ['Escudo Sagrado', 'Proteção', 'Aura de Cura', 'Golpe Justo'],
    desc: 'Tanque + healer híbrido.' },
  berserker:  { emoji: '🪓', primary: 'str', hp_bonus: 20, mp_bonus: 0,
    skills: ['Fúria', 'Giro Mortal', 'Sangue nos Olhos', 'Destruição Total'],
    desc: 'Dano massivo. Sem defesa.' },
  necromante: { emoji: '☠️', primary: 'int', hp_bonus: 10, mp_bonus: 40,
    skills: ['Drenar Vida', 'Invocar Esqueleto', 'Maldição', 'Exército dos Mortos'],
    desc: 'Invoca mortos. Vampiro.' },
  bardo:      { emoji: '🎵', primary: 'luk', hp_bonus: 10, mp_bonus: 30,
    skills: ['Canção de Cura', 'Nota Discordante', 'Encanto', 'Sinfonia Final'],
    desc: 'Suporte versátil. Buff/debuff.' },
  alquimista: { emoji: '⚗️', primary: 'int', hp_bonus: 15, mp_bonus: 35,
    skills: ['Bomba', 'Poção Curativa', 'Veneno', 'Pedra Filosofal'],
    desc: 'Crafting + explosivos.' },
};

// ══════════════════════════════════════════════════════════════
// BIOMAS (12 zonas com perigo e recursos únicos)
// ══════════════════════════════════════════════════════════════
const BIOMES = {
  floresta:       { emoji: '🌲', danger: 1, desc: 'Árvores antigas. Lobos e cogumelos.', loot: ['erva medicinal', 'madeira', 'cogumelo'] },
  montanha:       { emoji: '⛰️', danger: 2, desc: 'Picos gelados. Minérios raros.', loot: ['minério de ferro', 'pedra preciosa', 'gelo'] },
  deserto:        { emoji: '🏜️', danger: 2, desc: 'Areias mortais. Escorpiões.', loot: ['cacto', 'ouro arenoso', 'fóssil'] },
  pantano:        { emoji: '🌿', danger: 3, desc: 'Névoa tóxica. Sapos gigantes.', loot: ['lamacenta', 'erva venenosa', 'sapo'] },
  vulcao:         { emoji: '🌋', danger: 4, desc: 'Lava e demónios. Mithril.', loot: ['mithril', 'obsidiana', 'magma'] },
  abismo:         { emoji: '🕳️', danger: 5, desc: 'O vazio. Morte certa para fracos.', loot: ['cristal negro', 'essência do vazio', 'fragmento estelar'] },
  cidade:         { emoji: '🏰', danger: 0, desc: 'Comércio, tavernas, guildas.', loot: ['moeda antiga', 'mapa da cidade'] },
  cemiterio:      { emoji: '🪦', danger: 3, desc: 'Os mortos não descansam.', loot: ['osso antigo', 'alma penada', 'ervilha'] },
  templo:         { emoji: '🛕', danger: 2, desc: 'Ruínas sagradas. Tesouros.', loot: ['relicário', 'pergaminho', 'amuleto'] },
  floresta_negra: { emoji: '🌑', danger: 4, desc: 'Escuridão eterna. Sombras.', loot: ['sombra líquida', 'flor negra', 'olho de corvo'] },
  praia:          { emoji: '🏖️', danger: 1, desc: 'Mar calmo. Tesouros naufragados.', loot: ['concha', 'coral', 'pérola', 'tesouro perdido'] },
  caverna:        { emoji: '🕳️', danger: 3, desc: 'Morcegos e cristais brilhantes.', loot: ['cristal', 'morcego', 'estalactite'] },
};

// ══════════════════════════════════════════════════════════════
// INIMIGOS (3 tiers × 10+ tipos = 30+ inimigos)
// ══════════════════════════════════════════════════════════════
const ENEMIES = {
  normal: [
    { name: 'Goblin', emoji: '👺', hp_mult: 1, str_mult: 1, loot: ['moeda de bronze', 'adaga enferrujada'] },
    { name: 'Esqueleto', emoji: '💀', hp_mult: 1.1, str_mult: 0.9, loot: ['osso', 'espada quebrada'] },
    { name: 'Lobo Sombrio', emoji: '🐺', hp_mult: 0.9, str_mult: 1.2, loot: ['pele de lobo', 'presa'] },
    { name: 'Aranha Gigante', emoji: '🕷️', hp_mult: 0.8, str_mult: 1.3, loot: ['teia', 'veneno'] },
    { name: 'Bandido', emoji: '🦹', hp_mult: 1, str_mult: 1.1, loot: ['moeda de prata', 'capuz'] },
    { name: 'Slime', emoji: '🟢', hp_mult: 1.5, str_mult: 0.5, loot: ['gelatina', 'núcleo mágico'] },
    { name: 'Morcego Vampiro', emoji: '🦇', hp_mult: 0.7, str_mult: 1.4, loot: ['asa de morcego', 'sangue'] },
    { name: 'Rato Gigante', emoji: '🐀', hp_mult: 0.6, str_mult: 0.8, loot: ['queijo', 'rabo de rato'] },
  ],
  elite: [
    { name: 'Cavaleiro Negro', emoji: '🖤', hp_mult: 3, str_mult: 2.5, loot: ['espada negra', 'armadura negra', 'elmo'] },
    { name: 'Mago Sombrio', emoji: '🧙', hp_mult: 2, str_mult: 3, loot: ['cajado sombrio', 'grimório', 'poção de mana'] },
    { name: 'Orc Berserker', emoji: '👹', hp_mult: 3.5, str_mult: 2, loot: ['machado de guerra', 'chifre de orc'] },
    { name: 'Necromante', emoji: '☠️', hp_mult: 2.5, str_mult: 2.8, loot: ['amuleto negro', 'essência sombria'] },
    { name: 'Golem de Pedra', emoji: '🗿', hp_mult: 4, str_mult: 1.5, loot: ['núcleo de pedra', 'fragmento de rocha'] },
  ],
  boss: [
    { name: 'Dragão Ancião', emoji: '🐲', hp_mult: 8, str_mult: 5, loot: ['escama de dragão', 'coração de fogo', 'gem lendária'] },
    { name: 'Rei Demónio', emoji: '👿', hp_mult: 7, str_mult: 6, loot: ['coroa demoníaca', 'espada do caos'] },
    { name: 'Lich Imortal', emoji: '💀', hp_mult: 6, str_mult: 7, loot: ['cetro do lich', 'grimório eterno'] },
    { name: 'Titã Sombrio', emoji: '🌑', hp_mult: 10, str_mult: 4, loot: ['essência titânica', 'armadura titânica'] },
    { name: 'Deus Caído', emoji: '⚡', hp_mult: 12, str_mult: 8, loot: ['fragmento divino', 'espada celestial'] },
  ],
};

// ══════════════════════════════════════════════════════════════
// ITENS & LOOT TABLE
// ══════════════════════════════════════════════════════════════
const RARITY = {
  comum:    { emoji: '⚪', color: 'branco', mult: 1 },
  incomum:  { emoji: '🟢', color: 'verde', mult: 2 },
  raro:     { emoji: '🔵', color: 'azul', mult: 5 },
  epico:    { emoji: '🟣', color: 'roxo', mult: 10 },
  lendario: { emoji: '🟡', color: 'dourado', mult: 25 },
  mitico:   { emoji: '🔴', color: 'vermelho', mult: 50 },
};

const ITEMS = {
  // Poções
  'poção de vida':    { type: 'consumivel', emoji: '🧪', effect: { hp: 50 }, rarity: 'comum', price: 20 },
  'poção de mana':    { type: 'consumivel', emoji: '💧', effect: { mp: 30 }, rarity: 'comum', price: 25 },
  'poção de XP':      { type: 'consumivel', emoji: '⭐', effect: { xp: 100 }, rarity: 'incomum', price: 50 },
  'poção de força':   { type: 'consumivel', emoji: '💪', effect: { str_buff: 5, duration: 300 }, rarity: 'raro', price: 100 },
  'elixir da vida':   { type: 'consumivel', emoji: '❤️‍🔥', effect: { hp_full: true }, rarity: 'epico', price: 500 },
  
  // Armas
  'adaga enferrujada': { type: 'arma', emoji: '🗡️', effect: { str: 1 }, rarity: 'comum', price: 10 },
  'espada de ferro':   { type: 'arma', emoji: '⚔️', effect: { str: 3 }, rarity: 'comum', price: 100 },
  'espada de aço':     { type: 'arma', emoji: '⚔️', effect: { str: 5 }, rarity: 'incomum', price: 300 },
  'espada negra':      { type: 'arma', emoji: '🗡️', effect: { str: 8, luk: 2 }, rarity: 'raro', price: 800 },
  'machado de guerra': { type: 'arma', emoji: '🪓', effect: { str: 10 }, rarity: 'raro', price: 1000 },
  'cajado sombrio':    { type: 'arma', emoji: '🪄', effect: { int: 8, mp: 20 }, rarity: 'raro', price: 900 },
  'espada do caos':    { type: 'arma', emoji: '⚔️', effect: { str: 15, luk: 5 }, rarity: 'lendario', price: 5000 },
  'espada celestial':  { type: 'arma', emoji: '⚔️', effect: { str: 20, int: 10 }, rarity: 'mitico', price: 50000 },
  
  // Armaduras
  'armadura de couro':  { type: 'armadura', emoji: '🥋', effect: { vit: 3 }, rarity: 'comum', price: 200 },
  'escudo de ferro':    { type: 'armadura', emoji: '🛡️', effect: { vit: 5 }, rarity: 'incomum', price: 150 },
  'armadura negra':     { type: 'armadura', emoji: '🖤', effect: { vit: 10, dex: -1 }, rarity: 'raro', price: 1200 },
  'armadura titânica':  { type: 'armadura', emoji: '🛡️', effect: { vit: 20 }, rarity: 'lendario', price: 8000 },
  
  // Acessórios
  'anel de sorte':      { type: 'acessorio', emoji: '💍', effect: { luk: 5 }, rarity: 'incomum', price: 500 },
  'amuleto dos mortos': { type: 'acessorio', emoji: '📿', effect: { int: 5, vit: 3 }, rarity: 'raro', price: 1500 },
  'coroa demoníaca':    { type: 'acessorio', emoji: '👑', effect: { str: 8, int: 8 }, rarity: 'lendario', price: 10000 },
  
  // Materiais
  'minério de ferro':   { type: 'material', emoji: '🪨', rarity: 'comum', price: 10 },
  'mithril':            { type: 'material', emoji: '💎', rarity: 'raro', price: 500 },
  'obsidiana':          { type: 'material', emoji: '⬛', rarity: 'incomum', price: 100 },
  'cristal negro':      { type: 'material', emoji: '🔮', rarity: 'epico', price: 2000 },
  'essência do vazio':  { type: 'material', emoji: '🌀', rarity: 'lendario', price: 5000 },
  'fragmento estelar':  { type: 'material', emoji: '⭐', rarity: 'mitico', price: 25000 },
  'gem lendária':       { type: 'material', emoji: '💎', rarity: 'lendario', price: 10000 },
};

// ══════════════════════════════════════════════════════════════
// CRAFTING (receitas)
// ══════════════════════════════════════════════════════════════
const RECIPES = {
  'espada de aço':     { ingredients: { 'minério de ferro': 3, 'madeira': 1 }, result: 'espada de aço' },
  'armadura de couro': { ingredients: { 'pele de lobo': 2, 'madeira': 1 }, result: 'armadura de couro' },
  'poção de vida':     { ingredients: { 'erva medicinal': 2, 'cogumelo': 1 }, result: 'poção de vida' },
  'poção de mana':     { ingredients: { 'lamacenta': 2, 'erva medicinal': 1 }, result: 'poção de mana' },
  'bomba':             { ingredients: { 'magma': 1, 'obsidiana': 2 }, result: 'bomba' },
  'elixir da vida':    { ingredients: { 'poção de vida': 5, 'essência do vazio': 1 }, result: 'elixir da vida' },
  'espada negra':      { ingredients: { 'espada de aço': 1, 'cristal negro': 2 }, result: 'espada negra' },
};

// ══════════════════════════════════════════════════════════════
// PETS (15 pets com habilidades)
// ══════════════════════════════════════════════════════════════
const PETS = {
  gatinho:     { emoji: '🐱', rarity: 'comum', skill: 'Ronronar', effect: { luk: 2 }, evolve: 'gato_sombrio' },
  cachorro:    { emoji: '🐶', rarity: 'comum', skill: 'Latido', effect: { str: 2 }, evolve: 'lobo' },
  dragao_bebe: { emoji: '🐲', rarity: 'raro', skill: 'Sopro', effect: { str: 5, int: 3 }, evolve: 'dragao_adulto' },
  fada:        { emoji: '🧚', rarity: 'raro', skill: 'Cura', effect: { int: 5, vit: 3 }, evolve: 'fada_rainha' },
  lobo:        { emoji: '🐺', rarity: 'incomum', skill: 'Uivo', effect: { str: 4 }, evolve: 'lobo_alfa' },
  coruja:      { emoji: '🦉', rarity: 'incomum', skill: 'Sabedoria', effect: { int: 4 }, evolve: 'fenix' },
  fenix:       { emoji: '🔥', rarity: 'lendario', skill: 'Renascimento', effect: { str: 10, int: 10 }, evolve: null },
  serpente:    { emoji: '🐍', rarity: 'incomum', skill: 'Veneno', effect: { dex: 4 }, evolve: 'hidra' },
  urso:        { emoji: '🐻', rarity: 'incomum', skill: 'Grito', effect: { vit: 5 }, evolve: 'urso_polar' },
  aranha:      { emoji: '🕷️', rarity: 'comum', skill: 'Teia', effect: { dex: 3 }, evolve: 'aranha_gigante' },
  cavalo:      { emoji: '🐴', rarity: 'comum', skill: 'Velocidade', effect: { dex: 3 }, evolve: 'unicórnio' },
  unicórnio:   { emoji: '🦄', rarity: 'epico', skill: 'Cura Mágica', effect: { int: 8, luk: 5 }, evolve: null },
  gato_sombrio:{ emoji: '🐈‍⬛', rarity: 'incomum', skill: 'Furtividade', effect: { dex: 5, luk: 3 }, evolve: null },
  lobo_alfa:   { emoji: '🐺', rarity: 'raro', skill: 'Liderança', effect: { str: 7 }, evolve: null },
  dragao_adulto:{ emoji: '🐲', rarity: 'lendario', skill: 'Destruição', effect: { str: 15, int: 10 }, evolve: null },
  hidra:       { emoji: '🐉', rarity: 'epico', skill: 'Regeneração', effect: { vit: 10, str: 5 }, evolve: null },
};

// ══════════════════════════════════════════════════════════════
// NPCs
// ══════════════════════════════════════════════════════════════
const NPCS = {
  mercador:   { name: 'Grimwald', emoji: '🧔', dialogues: ['Bem-vindo! Tenho o que precisas.', 'Cuidado com o pântano.', 'O dragão acordou...'] },
  ferreiro:   { name: 'Thorgar', emoji: '⚒️', dialogues: ['Trás minério e forjo-te uma lâmina!', 'Esta espada? 500 coins.', 'Precisas de mithril.'] },
  curandeira: { name: 'Elara', emoji: '🧙‍♀️', dialogues: ['Curar-te-ei... por um preço.', 'Cuidado com o abismo.', 'Toma esta poção.'] },
  tavernerio: { name: 'Bjorn', emoji: '🍺', dialogues: ['Senta-te! Cerveja? 5 coins.', 'Há um torneio amanhã.', 'O encapuzado ali...'] },
  misterioso: { name: '???', emoji: '🌑', dialogues: ['Não devias estar aqui.', 'O destino é uma roda.', 'Procura a chave no templo.'] },
};

// ══════════════════════════════════════════════════════════════
// QUESTS (15 quests narrativas em 5 capítulos)
// ══════════════════════════════════════════════════════════════
const QUESTS = [
  { id:'prologo', title:'📜 O Despertar', chapter:1,
    story:'Acordas numa cela escura. Memórias fragmentadas. Uma voz: "Foge... antes que eles voltem."',
    choices:[
      { text:'🚪 Fugir pela porta', next:'fuga', reward:{ xp:50, coins:20 } },
      { text:'🔍 Investigar a cela', next:'investigar', reward:{ xp:30, item:'chave enferrujada' } },
      { text:'💀 Esperar em silêncio', next:'emboscada', reward:{ xp:10 } },
    ]},
  { id:'fuga', title:'📜 A Fuga', chapter:1,
    story:'Corres pelo corredor. Guardas! Vês uma janela e uma escada para catacumbas.',
    choices:[
      { text:'🪟 Saltar pela janela', next:'telhado', reward:{ xp:80, hp_cost:20 } },
      { text:'🕳️ Descer às catacumbas', next:'catacumbas', reward:{ xp:60, item:'mapa antigo' } },
    ]},
  { id:'investigar', title:'📜 Segredos da Cela', chapter:1,
    story:'Pedra solta na parede. Atrás: diário antigo e chave. O diário fala de conspiração...',
    choices:[
      { text:'📖 Ler o diário', next:'conspiracao', reward:{ xp:100 } },
      { text:'🔑 Usar a chave', next:'fuga', reward:{ xp:40 } },
    ]},
  { id:'emboscada', title:'📜 A Emboscada', chapter:1,
    story:'Dois guardas entram. "O prisioneiro acordou. Mata-o."',
    choices:[
      { text:'⚔️ Lutar', next:'luta_guardas', reward:{ xp:70, hp_cost:30 } },
      { text:'🗣️ Negociar', next:'negociar', reward:{ xp:40, coins:-50 } },
    ]},
  { id:'telhado', title:'📜 Nos Telhados', chapter:2,
    story:'A cidade abaixo. Uma taverna e um beco escuro.',
    choices:[
      { text:'🍺 Taverna', next:'taverna', reward:{ xp:50 } },
      { text:'🌑 Beco escuro', next:'beco', reward:{ xp:80 } },
    ]},
  { id:'catacumbas', title:'📜 As Catacumbas', chapter:2,
    story:'Escuridão. O mapa brilha. Ossos no chão. Passos atrás de ti.',
    choices:[
      { text:'🏃 Correr', next:'saida_catacumbas', reward:{ xp:60 } },
      { text:'⚔️ Enfrentar', next:'luta_morto', reward:{ xp:100, item:'amuleto dos mortos' } },
    ]},
  { id:'conspiracao', title:'📜 A Conspiração', chapter:2,
    story:'O rei foi envenenado pelo conselheiro. Tu és o único que sabe.',
    choices:[
      { text:'🏰 Ir ao castelo', next:'castelo', reward:{ xp:200, coins:500, title:'Portador da Verdade' } },
      { text:'🌑 Procurar aliados', next:'beco', reward:{ xp:120 } },
    ]},
  { id:'taverna', title:'📜 A Taverna do Lobo', chapter:2,
    story:'Bjorn serve cerveja. "Tens cara de problema." Um encapuzado observa.',
    choices:[
      { text:'🗣️ Falar com encapuzado', next:'beco', reward:{ xp:80 } },
      { text:'🍺 Pedir info ao Bjorn', next:'info_taverna', reward:{ xp:50, coins:30 } },
      { text:'💤 Descansar', next:'descanso', reward:{ hp_restore:100 } },
    ]},
  { id:'beco', title:'📜 O Encontro', chapter:3,
    story:'O encapuzado revela-se: sombra com olhos brilhantes. "Sei quem és. Posso ajudar... por um preço."',
    choices:[
      { text:'🤝 Aceitar', next:'alianca', reward:{ xp:150, item:'adaga das sombras', faction:'sombras' } },
      { text:'🚫 Recusar', next:'solo', reward:{ xp:100, title:'Lobo Solitário' } },
    ]},
  { id:'castelo', title:'📜 O Castelo', chapter:3,
    story:'Guardas bloqueiam a entrada. "Ninguém entra sem convite real."',
    choices:[
      { text:'🃏 Mostrar o diário', next:'audiencia', reward:{ xp:150 } },
      { text:'🧗 Escalar o muro', next:'infiltrar', reward:{ xp:200, hp_cost:40 } },
    ]},
  { id:'alianca', title:'📜 Aliança das Sombras', chapter:4,
    story:'"Vamos derrubar o conselheiro juntos. Mas primeiro, precisamos de provas."',
    choices:[
      { text:'🕵️ Infiltrar o castelo', next:'infiltrar', reward:{ xp:200, item:'manto das sombras' } },
      { text:'📜 Procurar documentos', next:'arquivo', reward:{ xp:150 } },
    ]},
  { id:'infiltrar', title:'📜 Infiltração', chapter:4,
    story:'Dentro do castelo. O conselheiro está no salão do trono. 3 guardas.',
    choices:[
      { text:'⚔️ Atacar', next:'batalha_final', reward:{ xp:300, hp_cost:50 } },
      { text:'🤫 Passar despercebido', next:'provas', reward:{ xp:250 } },
    ]},
  { id:'batalha_final', title:'📜 A Batalha Final', chapter:5,
    story:'O conselheiro revela-se: um necromante! "O rei era fraco. Eu trago poder!"',
    choices:[
      { text:'⚔️ Lutar até à morte', next:'vitoria', reward:{ xp:500, coins:2000, title:'Herói do Reino' } },
      { text:'🔮 Usar magia antiga', next:'vitoria_magica', reward:{ xp:600, item:'cetro do rei' } },
    ]},
  { id:'vitoria', title:'📜 Vitória!', chapter:5,
    story:'O necromante cai. O rei é libertado. "Tu salvaste o reino!"',
    choices:[
      { text:'👑 Aceitar título real', next:'reinado', reward:{ xp:1000, coins:5000, title:'Rei Herói' } },
      { text:'🚶 Partir em aventura', next:'prologo', reward:{ xp:500, title:'Aventureiro Lendário' } },
    ]},
];

// ══════════════════════════════════════════════════════════════
// COMBATE
// ══════════════════════════════════════════════════════════════
function calcDamage(attacker, defender, skill = 'basic') {
  const atkStat = attacker.stats?.[CLASSES[attacker.class]?.primary || 'str'] || 5;
  const defStat = defender.stats?.vit || 5;
  const base = atkStat * 2 + R(1, atkStat);
  const defense = defStat;
  const crit = Math.random() < (attacker.stats?.luk || 1) * 0.02;
  let dmg = Math.max(1, base - defense);
  if (crit) dmg = Math.floor(dmg * 2.5);
  if (skill === 'heavy') dmg = Math.floor(dmg * 1.5);
  if (skill === 'magic') dmg = Math.floor(dmg * 1.3 + (attacker.stats?.int || 0));
  return { dmg, crit };
}

function generateEnemy(level, type = 'normal') {
  const pool = ENEMIES[type] || ENEMIES.normal;
  const template = P(pool);
  const mult = type === 'boss' ? 5 : type === 'elite' ? 2.5 : 1;
  return {
    name: template.name,
    emoji: template.emoji,
    level,
    hp: Math.floor((50 + level * 20) * template.hp_mult * mult),
    maxHp: Math.floor((50 + level * 20) * template.hp_mult * mult),
    stats: {
      str: Math.floor(level * 2 * template.str_mult * mult),
      dex: Math.floor(level * 1.5 * mult),
      int: Math.floor(level * 1.2 * mult),
      vit: Math.floor(level * 1.8 * mult),
      luk: Math.floor(level * 0.5),
    },
    loot: template.loot || [],
    type,
  };
}

function generateLoot(enemy, playerLevel) {
  const loot = [];
  const baseChance = enemy.type === 'boss' ? 0.9 : enemy.type === 'elite' ? 0.5 : 0.15;
  for (const item of (enemy.loot || [])) {
    if (Math.random() < baseChance) loot.push(item);
  }
  // Chance de item raro
  if (Math.random() < (enemy.type === 'boss' ? 0.3 : 0.05)) {
    const rareItems = Object.entries(ITEMS).filter(([, v]) => v.rarity === 'raro' || v.rarity === 'epico');
    if (rareItems.length) loot.push(P(rareItems)[0]);
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
  RACES, CLASSES, BIOMES, NPCS, QUESTS, ENEMIES, ITEMS, RARITY, RECIPES, PETS,
  calcDamage, generateEnemy, generateLoot,
  getPlayer, savePlayer, levelUp, addXP,
  _cache,
};
