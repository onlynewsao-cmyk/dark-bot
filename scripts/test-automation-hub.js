#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const hub = require('../src/dashboard/automationHub');

const groups = [
  {
    groupJid: 'one@g.us', groupName: 'Dark Net',
    welcome: true, goodbyeEnabled: true, x9: true, antisticker: true,
    antifoba: true, autoVisu1: true, modeDownloads: true,
  },
  {
    groupJid: 'two@g.us', groupName: 'Chat Yuka',
    antispam: true, autoapresentar: true, antifoto: true, modeIa: true,
  },
];
const configs = [
  { key: 'welcome_enabled', value: true },
  { key: 'antiraid:two@g.us', value: true },
  { key: 'autorespostas:orphan@g.us', value: false },
];

const state = hub.summarize(groups, configs);
assert.strictEqual(state.totalGroups, 2, 'conta os grupos');
assert.ok(state.activeFeatures > 0, 'detecta funções ligadas');
const welcome = state.features.find(f => f.id === 'welcome-goodbye');
assert.strictEqual(welcome.activeGroups.length, 1, 'mapeia grupo com welcome');
assert.deepStrictEqual(welcome.activeGlobals, ['welcome_enabled'], 'mapeia padrão global ativo');
const raid = state.features.find(f => f.id === 'anti-raid');
assert.strictEqual(raid.activeGroups.length, 1, 'mapeia configuração externa por grupo');
assert.strictEqual(raid.activeGroups[0].name, 'Chat Yuka', 'resolve nome pelo JID');
assert.strictEqual(hub.featureById('anti-fobados').name, 'Anti-Fobados');
assert.strictEqual(hub.featureById('inventado'), null, 'não aceita ids arbitrários');
assert.deepStrictEqual(hub.updateForFeature(hub.featureById('learned-stickers')), {
  antisticker: false, antistickerNotify: false,
}, 'patch é fechado e desliga só campos da função');
assert.ok(hub.GROUP_OFF_FIELDS.includes('antisticker'), 'Tudo OFF inclui Anti-Sticker');
assert.ok(hub.GROUP_OFF_FIELDS.includes('antifoba'), 'Tudo OFF inclui Anti-Fobados');
assert.ok(hub.GROUP_OFF_FIELDS.includes('autoapresentar'), 'Tudo OFF inclui Auto-apresentação');
assert.ok(hub.GROUP_OFF_FIELDS.includes('modeDownloads'), 'Tudo OFF inclui categorias opcionais');
for (const forbidden of ['botEnabled', 'isHosted', 'hostedUntil', 'rentedBy', 'groupName', 'groupJid']) {
  assert.ok(!hub.GROUP_OFF_FIELDS.includes(forbidden), `Tudo OFF nunca altera ${forbidden}`);
}
assert.deepStrictEqual([...hub.GLOBAL_OFF_KEYS].sort(), ['antilink_enabled', 'antispam_enabled', 'welcome_enabled'].sort());
assert.strictEqual(hub.isOn('true'), true);
assert.strictEqual(hub.isOn('false'), false);
const legacy = hub.summarize([{ groupJid: 'legacy@g.us', groupName: 'Legado' }], []);
for (const id of ['learned-stickers', 'anti-fobados', 'presentation-activity', 'automatic-media', 'command-categories']) {
  assert.strictEqual(legacy.features.find(f => f.id === id).isActive, true, `${id} respeita defaults antigos ON`);
}
assert.deepStrictEqual(hub.updateForFeature(hub.featureById('content-protection')).antitiposNotify, false, 'Tudo OFF também silencia notificações anti-tipo');
assert.match(JSON.stringify(hub.groupMatchForFeature(hub.featureById('learned-stickers'))), /\$ne/, 'desliga Anti-Sticker mesmo em documento legado sem o campo');

const api = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'api.js'), 'utf8');
assert.match(api, /router\.post\('\/automation-hub\/feature\/:id\/off', requireApiOwner/, 'rota individual protegida por dono');
assert.match(api, /router\.post\('\/automation-hub\/all-off', requireApiOwner/, 'Tudo OFF protegido por dono');
assert.match(api, /TUDO OFF/, 'Tudo OFF exige frase de confirmação');
assert.match(api, /dashboard:automation-all-off/, 'Tudo OFF é auditado');

const page = fs.readFileSync(path.join(__dirname, '..', 'src', 'views', 'dashboard', 'automation-hub.ejs'), 'utf8');
assert.match(page, /Ver onde está ativa/, 'UI mostra os grupos afetados');
assert.match(page, /TUDO OFF/, 'UI contém botão destrutivo explícito');
assert.match(page, /hubConfirmation/, 'UI pede confirmação digitada');
console.log('✅ automation hub: inventário, confirmação, auditoria e escopo seguro OK');
