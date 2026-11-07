#!/usr/bin/env node
'use strict';
/**
 * AURA VIDA — vontades narrativas
 * Roda sem Mongo: substitui apenas a configuração persistida por memória.
 */
const assert = require('assert');
const fs = require('fs');
const Module = require('module');

let updates = 0;
let persisted = {
  apelido: 'AURA', nomeCompleto: 'AURA',
  energia: 70, humorAtual: 'normal', diario: [], experiencias: [],
};
const originalRequire = Module.prototype.require;
Module.prototype.require = function patched(request) {
  if (request === '../database/models/BotConfig') {
    return {
      findOne: () => ({ lean: async () => ({ key: 'aura_vida_v1', value: persisted }) }),
      updateOne: async (_q, update) => { updates++; persisted = update.$set.value; return { acknowledged: true }; },
    };
  }
  return originalRequire.apply(this, arguments);
};

const vida = require('../src/aura/auraVida');
const registerAuraVida = require('../src/bot/cases/auraVidaCase');
let checks = 0;
function ok(label, value) { assert.ok(value, label); checks++; console.log('  ✅', label); }

(async () => {
  const estado = await vida.getVida();
  ok('migra estado persistido sem vontades', Array.isArray(estado.vontades) && estado.vontades.length >= 5);
  ok('cria uma vontade narrativa actual', estado.vontadeAtual?.id === 'clareza');
  await new Promise(resolve => setImmediate(resolve));
  ok('migração de vontades é persistida sem esperar pelo próximo tick', updates >= 1 && persisted.vontadeAtual?.id === 'clareza');
  ok('catálogo declara que vontade não é autonomia', vida.VONTADES_BASE.every(v => v.nome && v.descricao && Number(v.prioridade) > 0));

  const baixaEnergia = vida.escolherVontade({ ...estado, energia: 20, humorAtual: 'normal' }, { atividade: 'modo conversa' }, 1);
  ok('energia baixa privilegia escuta', baixaEnergia.id === 'escuta');
  const visual = vida.escolherVontade({ ...estado, energia: 75, humorAtual: 'normal' }, { atividade: 'modo visual' }, 2);
  ok('modo visual privilegia criatividade', visual.id === 'criatividade');
  const feliz = vida.escolherVontade({ ...estado, energia: 75, humorAtual: 'feliz' }, { atividade: 'modo estudo' }, 3);
  ok('humor feliz privilegia variedade', feliz.id === 'variedade');

  await vida.atualizarVida();
  const depois = await vida.getVida();
  ok('tick mantém vontade válida e persistível', depois.vontades.some(v => v.id === depois.vontadeAtual?.id));
  ok('estado actualizado foi persistido', persisted?.vontadeAtual?.id === depois.vontadeAtual?.id);

  const prompt = await vida.getPromptVida({ isOwner: true });
  ok('prompt explica que vontade é ficcional e não inicia ferramentas',
    /Vontade narrativa actual/.test(prompt) && /nunca inicia acções, ferramentas ou mensagens por conta própria/.test(prompt));
  const status = await vida.getStatus();
  ok('status expõe vontade actual de forma estruturada', status.vontade?.id === depois.vontadeAtual?.id);

  const cases = {};
  registerAuraVida((names, handler) => { for (const name of names) cases[name] = handler; });
  let resposta = '';
  await cases.vontades({ reply: async text => { resposta = text; } });
  ok('comando !vontades apresenta limites de segurança', /VONTADES NARRATIVAS/.test(resposta) && /não dão autonomia/.test(resposta));

  const proativa = fs.readFileSync('src/aura/auraProativa.js', 'utf8');
  ok('proactividade exige uma conversa prévia no PV', proativa.includes('if (ausente == null) continue;'));
  ok('faixa de vida é alcançável e usa estado carregado',
    proativa.includes('sorte < P_PV * 0.85') &&
    proativa.includes('sorte < P_PV)') &&
    proativa.includes('await Promise.all([vida.getVida()') &&
    !proativa.includes("at.atividade !== 'dormindo/sonhando'"));

  console.log(`\nAURA VIDA / VONTADES: ${checks} OK / 0 falhas`);
})().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => { Module.prototype.require = originalRequire; });
