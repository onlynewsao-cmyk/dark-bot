/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG WEAPONS DATA                              ║
 * ║   20+ Armas com stats e efeitos                                  ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const WEAPONS = {
  'shuriken': {
    name: 'Shuriken', emoji: '⭐', base_atk: 10,
    anime: 'Naruto', effect: 'Ataque rápido', price: 50
  },
  'kunai': {
    name: 'Kunai', emoji: '🗡️', base_atk: 15,
    anime: 'Naruto', effect: 'Corte venenoso', price: 100
  },
  'katana': {
    name: 'Katana', emoji: '⚔️', base_atk: 25,
    anime: 'Demon Slayer', effect: 'Corte limpo', price: 300
  },
  'enma': {
    name: 'Espada Enma', emoji: '⚔️', base_atk: 55,
    anime: 'One Piece', effect: '+40% com Haki', price: 2000
  },
  'samehada': {
    name: 'Samehada', emoji: '🦈', base_atk: 40,
    anime: 'Naruto', effect: 'Rouba 15 CK', price: 1500
  },
  'zangetsu': {
    name: 'Zangetsu', emoji: '⚔️', base_atk: 60,
    anime: 'Bleach', effect: 'Corte espiritual', price: 3000
  },
  'kasaka': {
    name: 'Espada de Kasaka', emoji: '🐍', base_atk: 35,
    anime: 'Solo Leveling', effect: 'Sangramento +15%', price: 800
  },
  'lanca_ceu': {
    name: 'Lança do Céu', emoji: '🔱', base_atk: 50,
    anime: 'Jujutsu Kaisen', effect: 'Anula defesas', price: 2500
  },
  'nichirin': {
    name: 'Espada Nichirin', emoji: '🗡️', base_atk: 45,
    anime: 'Demon Slayer', effect: '+50% vs demônios', price: 1800
  },
  'esfera_dragao': {
    name: 'Esfera do Dragão', emoji: '🔮', base_atk: 100,
    anime: 'Dragon Ball', effect: '+50% stats', price: 50000
  },
  'hilt_benimaru': {
    name: 'Hilt de Benimaru', emoji: '🔥', base_atk: 38,
    anime: 'Fire Force', effect: 'Chama +20%', price: 900
  },
  'espada_madaras': {
    name: 'Espada do Madara', emoji: '👁️', base_atk: 75,
    anime: 'Naruto', effect: 'Sharingan: crítico +30%', price: 5000
  },
  'wado_ichimonji': {
    name: 'Wado Ichimonji', emoji: '⚔️', base_atk: 42,
    anime: 'One Piece', effect: 'Corte perfeito', price: 1200
  },
  'zangetsu_bankai': {
    name: 'Zangetsu Bankai', emoji: '⚔️', base_atk: 80,
    anime: 'Bleach', effect: 'Bankai: +100% ATK', price: 8000
  },
  'lampiao': {
    name: 'Lampião de Sombra', emoji: '🌑', base_atk: 30,
    anime: 'Solo Leveling', effect: 'Sombra: +25% ATK noturno', price: 600
  },
  'cajado_gojo': {
    name: 'Cajado de Gojo', emoji: '🪄', base_atk: 55,
    anime: 'Jujutsu Kaisen', effect: 'Infinito: -30% dano', price: 3000
  },
  'machado_thor': {
    name: 'Machado do Thor', emoji: '🪓', base_atk: 90,
    anime: 'Marvel', effect: 'Trovão: +50% vs bosses', price: 12000
  },
  'espada_kratos': {
    name: 'Espada do Kratos', emoji: '⚔️', base_atk: 95,
    anime: 'God of War', effect: 'Fúria: +80% quando HP <30%', price: 15000
  },
  'vara_pescar': {
    name: 'Vara de Pescar', emoji: '🎣', base_atk: 5,
    anime: 'One Piece', effect: 'Pesca: +50% loot', price: 200
  },
  'punhos_saitama': {
    name: 'Punhos do Saitama', emoji: '👊', base_atk: 999,
    anime: 'One Punch Man', effect: 'One Punch: kill instantâneo', price: 999999
  },
};

module.exports = { WEAPONS };
