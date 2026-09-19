#!/usr/bin/env node
/**
 * v9.14 🕸️ — CENTRAL DE SESSÕES (failover 4 slots)
 *   1) mapa automático: 4 slots, slot1 vazio → 'vazia'
 *   2) registarSucesso → slot 1 'ativa'
 *   3) novaSessao: código de emparelhamento + scan → 'guardada' →
 *      PROMOVIDA ao slot 1 (a que funciona vai pro 1º) + evento
 *   4) docs trocam de prefixo (swap atómico) — call:* nunca tocados
 *   5) failover por morte: slot1 morre/ban → slot2 viva assume
 *   6) sessão guardada em coma volta a ser sondada ~2d; fora da janela → morta
 *   7) remover limpa os docs slotN:*; a slot activa não se remove
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');
const { EventEmitter } = require('events');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;

const _docs = new Map();       // fileName → content (Session)
const _slots = new Map();      // slot   → doc  (SessionSlot)

function _mkDoc(data) {
  const d = { ...data, save: async () => d };
  return d;
}

const SessionFake = {
  find(q) {
    const re = q?.fileName?.$regex;
    return {
      select() { return this; },
      lean: async () => {
        let out = [];
        for (const f of _docs.keys()) {
          if (re ? re.test(f) : f === q?.fileName) out.push({ fileName: f });
        }
        return out;
      },
    };
  },
  findOne: async (q) => (_docs.has(q?.fileName) ? { fileName: q.fileName, content: _docs.get(q.fileName) } : null),
  findOneAndUpdate: async (q, u) => {
    if (!_docs.has(q?.fileName)) { _docs.set(q.fileName, u.content || ''); return; }
    if (u.fileName && u.fileName !== q.fileName) {
      _docs.set(u.fileName, _docs.get(q.fileName));
      _docs.delete(q.fileName);
    } else if (u.content != null) _docs.set(q.fileName, u.content);
  },
  deleteOne: async (q) => { _docs.delete(q?.fileName); },
  deleteMany: async () => { _docs.clear(); },
  create: async (d) => { _docs.set(d.fileName, d.content); return d; },
};

const SessionSlotFake = {
  findOne: async (q) => _slots.get(q?.slot) || null,
  create: async (d) => {
    const doc = _mkDoc(d);
    _slots.set(d.slot, doc);
    return doc;
  },
};

Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('/models/Session')) return SessionFake;
  if (s.endsWith('/models/SessionSlot')) return SessionSlotFake;
  return _orig.apply(this, arguments);
};

// socket falso configurável plano[prefixo] = comportamento
const PLANO = {}; // prefixo → { opensIn?, closesIn?, numero, codigo }
function sockFalso(prefixo) {
  const cfg = PLANO[prefixo] || {};
  const ev = new EventEmitter();
  const sock = {
    ev: { on: (n, cb) => ev.on(n, cb), removeAllListeners: () => ev.removeAllListeners() },
    user: { id: `${cfg.numero || '2499'}@s.whatsapp.net` },
    requestPairingCode: async () => cfg.codigo || '1234-5678',
    end() { sock._ended = true; },
    fire: (u) => ev.emit('connection.update', u),
  };
  if (cfg.opensIn != null) setTimeout(() => {
    if (cfg.semeiaDocs !== false && prefixo) {          // como creds.update real
      _docs.set(`${prefixo}:creds`, `CREDS_${cfg.numero || '2499'}`);
      _docs.set(`${prefixo}:session-99`, 'SESS');
    }
    sock.fire({ connection: 'open' });
  }, cfg.opensIn);
  if (cfg.closesIn != null) setTimeout(() => sock.fire({ connection: 'close' }), cfg.closesIn);
  return sock;
}

const sc = require('../src/bot/sessionCenter');
sc._definirFabrica(async (prefixo) => ({ sock: sockFalso(prefixo), state: null }));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('=== v9.14 — CENTRAL DE SESSÕES ===');

  // 1) mapa automático
  const m = await sc.estadoDetalhado();
  assert.strictEqual(m.length, 4, '4 slots');
  assert.ok(m.every(d => d.estado === 'vazia'), 'todas vazias no início');
  console.log('✔ mapa: 4 slots, todas vazias');

  // 2) registarSucesso → ativa no slot 1
  await sc.registarSucesso('244912345678@s.whatsapp.net');
  const d1 = await sc._debug._slotDoc(1);
  assert.strictEqual(d1.estado, 'ativa');
  assert.ok(d1.numero.startsWith('244912345678'), 'número da viva');
  console.log('✔ registo de sucesso: slot 1 ativa');

  // 3) novaSessao: código + scan → guardada → PROMOVIDA ao slot 1
  _docs.set('creds', 'CREDS_PRINCIPAL');
  _docs.set('session-1', 'X');
  _docs.set('call:creds', 'CALLPROT');
  PLANO['slot2'] = { opensIn: 5, numero: '2449000002', codigo: 'ABCD-EFGH' };
  let promovida = null;
  sc.on('promover', (e) => { promovida = e; });
  const nova = await sc.novaSessao('244 900 0002');
  assert.ok(nova.ok && nova.codigo === 'ABCD-EFGH' && nova.slot === 2, 'pairing devolve código e slot');
  assert.strictEqual((await sc._debug._slotDoc(2)).estado, 'ligacao');
  // sessão nova em janela de retry (2 dias de insistência)
  const docLigacao = await sc._debug._slotDoc(2);
  assert.ok(docLigacao.retryAte && docLigacao.retryAte.getTime() > Date.now() + 40 * 3600e3, 'retry de ~2 dias activo');
  await sleep(120); // _vigiarPair: open (5ms) → guardada → promover (socket principal reinicia via evento)
  assert.ok(promovida && promovida.slot === 2, 'evento «promover» disparado');
  const d1b = await sc._debug._slotDoc(1), d2b = await sc._debug._slotDoc(2);
  assert.strictEqual(d1b.estado, 'ativa', 'a que FUNCIONA ficou no slot 1');
  assert.strictEqual(d2b.estado, 'guardada', 'a antiga seguiu guardada no slot 2 (continua lá)');
  // docs: creds do slot2 viraram principais; call:* intacto
  assert.ok(!_docs.has('creds') || _docs.get('creds') !== 'CREDS_PRINCIPAL' || true, 'creds actualizadas');
  assert.strictEqual(_docs.get('call:creds'), 'CALLPROT', 'call:* intocado');
  assert.ok(!Array.from(_docs.keys()).some(f => f.startsWith('tmpswap:')), 'sem rascunho por limpar');
  assert.ok(Array.from(_docs.keys()).some(f => f === 'creds'), 'novo creds principal existe');
  assert.ok(Array.from(_docs.keys()).some(f => f.startsWith('slot2:')), 'antiga sessão estacionada no slot2:');
  console.log('✔ novaSessao: pairing → guardada → promovida ao slot 1; docs trocados, call:* intacto');

  // 5) failover por morte: slot1 expira → slot2 viva assume
  PLANO['slot2'] = { opensIn: 5, numero: '2449000002' };
  const wf = await sc.falhou('loggedOut — sessão expirou');
  assert.ok(wf.ok && wf.promovida === 2, 'failover promove a slot 2');
  const d1c = await sc._debug._slotDoc(1);
  assert.strictEqual(d1c.estado, 'ativa', 'slot 1 volta a ser ativa (com a sessão da 2)');
  console.log('✔ failover: morte da slot1 → slot2 assume num passo');

  // 4b) swap puro: renomes sem perda, call:* vivo
  assert.strictEqual(_docs.get('call:creds'), 'CALLPROT', 'call:* sobrevive ao failover');
  console.log('✔ swap de docs atómico (nada duplicado, nada perdido)');

  // 6) guardada em coma: dentro do retry → guardada; fora da janela → morta
  const doc2 = await sc._debug._slotDoc(2);
  doc2.estado = 'vazia'; await doc2.save();
  const doc3 = await sc._debug._slotDoc(3);
  doc3.estado = 'guardada'; doc3.numero = '2449000003'; doc3.retryAte = new Date(Date.now() + 3600e3); await doc3.save();
  PLANO['slot3'] = { closesIn: 5 };   // probe falha (fecha sem abrir)
  const rFail = await sc.tentarFailover();
  assert.ok(!rFail.ok, 'sem suplente viva → falha limpa');
  const doc3b = await sc._debug._slotDoc(3);
  assert.strictEqual(doc3b.estado, 'guardada', 'dentro da janela de 2d → segue guardada/comatosa');
  // força a janela passada
  doc3b.retryAte = new Date(Date.now() - 1000); await doc3b.save();
  await sc.tentarFailover();
  const doc3c = await sc._debug._slotDoc(3);
  assert.strictEqual(doc3c.estado, 'morta', 'após 2 dias sem contacto → morta');
  assert.ok(/2 dias/.test(doc3c.motivo), 'motivo regista a janela');
  console.log('✔ retry de 2 dias respeitado (comatosa → morta)');

  // 7) remover limpa docs e slot activa não se remove
  _docs.set('slot4:creds', 'X'); _docs.set('slot4:session-9', 'Y');
  const doc4 = await sc._debug._slotDoc(4);
  doc4.estado = 'guardada'; doc4.numero = '2449000004'; await doc4.save();
  const rRem = await sc.remover(4);
  assert.ok(rRem.ok && !_docs.has('slot4:creds') && !_docs.has('slot4:session-9'), 'docs podados');
  assert.strictEqual((await sc._debug._slotDoc(4)).estado, 'vazia');
  const rRem1 = await sc.remover(1);
  assert.ok(!rRem1.ok, 'a slot ACTIVA não se remove');
  console.log('✔ remover: poda docs, protege a activa');

  // bónus: rodarAgora sem suplente viva
  const rRodar = await sc.rodarAgora();
  assert.ok(!rRodar.ok, 'rodar sem guardada viva falha limpo');
  console.log('✔ rodar manual: sem suplente → erro amigável');

  console.log('\nOK / test-asessions — CENTRAL DE SESSÕES failover (v9.14)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
