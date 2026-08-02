/**
 * AURA PERSONALITY - Compatibilidade
 * Este arquivo existe apenas para manter o commandHandler funcionando.
 * A lógica real está em src/aura/auraHuman.js
 */

const auraHuman = require('../aura/auraHuman');

module.exports = {
  // Funções mínimas necessárias para o commandHandler não quebrar
  recallPerson: (number) => null,
  detectCountry: (number) => ({ name: 'Desconhecido', code: '??', lang: 'pt' }),
  buildAuraSystemPrompt: () => 'Você é a Aura.',
  getMood: () => ({ mood: 'normal', intensity: 5 }),
  detectDarkAttack: () => false,
  detectDarkMention: () => false,
  getDarkDefense: (name) => `Cuidado com o que fala sobre o Dark, ${name}.`,
  setMood: () => {},
  isSilenced: auraHuman.isSilenced,
  setSilence: auraHuman.setSilence,
  clearSilence: auraHuman.clearSilence,
  auraRespond: auraHuman.respondAsHuman
};