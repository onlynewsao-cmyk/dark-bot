#!/usr/bin/env node
'use strict';

/** Regressão: proveniência não pode desaparecer quando o bot sai do grupo. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dark-central-historico-'));
process.env.CENTRAL_DATA_DIR = dir;

const basePath = require.resolve('../src/bot/centralBase');
const detector = require('../src/bot/communityDetector');
let base = require('../src/bot/centralBase');

const pai = '120363000000001@g.us';
const filho = '120363000000002@g.us';
base.capturarGrupo(pai, {
  id: pai,
  subject: 'Rede principal',
  isCommunity: true,
  participants: [{ id: '244912345678@s.whatsapp.net', notify: 'Ana' }],
});
base.capturarGrupo(filho, {
  id: filho,
  subject: 'Subgrupo de avisos',
  linkedParentJid: pai,
  participants: [{ id: '244923456789@s.whatsapp.net', notify: 'Bia' }],
});

let grupos = base.listarGruposHistoricos();
let grupoPai = grupos.find(g => g.jid === pai);
let grupoFilho = grupos.find(g => g.jid === filho);
assert(grupoPai && grupoPai.status === 'ativo', 'grupo capturado deve começar activo');
assert(grupoPai.comunidade, 'isCommunity deve identificar comunidade sem usar o nome');
assert(grupoFilho && grupoFilho.parentJid === pai, 'linkedParentJid deve manter relação pai-filho');
assert.strictEqual(base.fonteParaAdd(pai).length, 1, 'origem capturada deve fornecer contactos');

base.marcarGrupoInativo(pai, { nome: 'Rede principal' });
grupos = base.listarGruposHistoricos();
grupoPai = grupos.find(g => g.jid === pai);
assert.strictEqual(grupoPai.status, 'saiu', 'a saída deve ficar explícita');
assert(grupoPai.leftAt > 0, 'a data de saída deve ficar guardada');
assert.strictEqual(base.fonteParaAdd(pai).length, 1, 'sair do grupo não pode remover a fonte');
base.guardar();

// Simula reinício no modo de ficheiro.
delete require.cache[basePath];
base = require('../src/bot/centralBase');
assert.strictEqual(base.fonteParaAdd(pai).length, 1, 'a origem deve sobreviver ao reinício');
grupoPai = base.listarGruposHistoricos().find(g => g.jid === pai);
assert.strictEqual(grupoPai.status, 'saiu', 'o estado histórico deve sobreviver ao reinício');

const info = detector.communityInfo({ linkedParent: pai });
assert.strictEqual(info.parentJid, pai, 'linkedParent alternativo deve ser reconhecido');
assert.strictEqual(info.isChild, true, 'subgrupo deve ser reconhecido estruturalmente');
assert.strictEqual(detector.communityInfo({ isCommunity: true, linkedParentJid: pai }).isCommunity, false, 'linkedParent deve prevalecer sobre flag ambígua de filho');
assert.strictEqual(detector.communityInfo({ subject: 'Comunidade apenas no nome' }).isCommunity, false, 'nome não deve criar falso positivo');

fs.rmSync(dir, { recursive: true, force: true });
console.log('✅ Central histórico: proveniência, saída e comunidades validadas.');
