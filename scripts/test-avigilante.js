#!/usr/bin/env node
/**
 * Teste: Aura Vigilante + Escolha + Avisos (v7.96) 👁️
 * 4 peças de comportamento que o Dark pediu: permissões provadas,
 * entender-pela-conversa (interesse/balanços), convite→cartão de
 * selecção, e contadores actuais.
 */
'use strict';

const assert = require('assert');
const fs3 = require('fs');
const path3 = require('path');

process.env.AURA_VIGILANTE_FILE = '/tmp/aura_vigilante_test.json';
try { fs3.unlinkSync(process.env.AURA_VIGILANTE_FILE); } catch {}

const vig = require('../src/aura/auraVigilante');
const esc = require('../src/aura/auraEscolha');
const av = require('../src/aura/auraAvisos');


(async () => {
console.log('=== Aura Vigilante (v7.96) ===');

// ── 1. Permissões do Dono ─────────────────────────────────────
vig._reset();
const p0 = vig.permissoes();
assert.strictEqual(p0.entrada, true, 'entrada default ON');
assert.strictEqual(p0.partilharnumero, false, 'partilharnumero default OFF');
assert.strictEqual(Object.keys(p0).length, 5, '5 toggles');
vig.definirPerm('partilharnumero', true);
assert.strictEqual(vig.perm('partilharnumero'), true, 'toggle ON');
assert.strictEqual(fs3.existsSync(process.env.AURA_VIGILANTE_FILE), true, 'gravou o ficheiro');
vig.carregar();
assert.strictEqual(vig.perm('partilharnumero'), true, 'persistiu após reler');
vig.definirPerm('coisainventada', true) === null && console.log('  ✔ toggle rejeita nome desconhecido');
const txt = vig.listaPermissoesTexto().join('\n');
assert.ok(/partilharnumero/.test(txt) && /✅/.test(txt), 'lista textual mostra estados');
console.log('✔ permissões provadas (default + toggle + persistência)');

// ── 2. Interesse & dedupe ─────────────────────────────────────
vig._reset();
assert.strictEqual(vig.detectarInteresse('quanto custa para adicionar o bot no meu grupo?'), 'aluguel');
assert.strictEqual(vig.detectarInteresse('como posso ser vip aqui?'), 'vip');
assert.strictEqual(vig.detectarInteresse('preciso do número do dono do bot'), 'dono');
assert.strictEqual(vig.detectarInteresse('kkkk adorei esse sticker'), '', 'conversa normal não dispara');
assert.strictEqual(vig.deveNotificarInteresse('aluguel|244900'), true);
assert.strictEqual(vig.deveNotificarInteresse('aluguel|244900'), false, 'dedupe 6h');
assert.strictEqual(vig.deveNotificarInteresse('aluguel|244901'), true, 'outro contacto notifica');
console.log('✔ detector de interesse + dedupe 6h');

// ── 3. Convite → dedupe 24h ───────────────────────────────────
vig._reset();
assert.strictEqual(vig.extrairConvite('oi https://chat.whatsapp.com/AbCdEfGhIjKmN012'), 'AbCdEfGhIjKmN012');
assert.strictEqual(vig.extrairConvite('https://chat.whatsapp.com/invite/WXyz9988abcd'), 'WXyz9988abcd');
assert.strictEqual(vig.extrairConvite('sem link aqui'), '', 'sem link');
assert.strictEqual(vig.deveEmitirConvite('CODE1', '111'), true);
assert.strictEqual(vig.deveEmitirConvite('CODE1', '111'), false, 'dedupe 24h mesmo contacto');
assert.strictEqual(vig.deveEmitirConvite('CODE1', '222'), true, 'outro contacto emite');
console.log('✔ convite: extracção + dedupe 24h');

// ── 4. Contadores & relatórios ────────────────────────────────
vig._reset();
const G1 = 'AAA@g.us', G2 = 'BBB@g.us';
for (let i = 0; i < 9; i++) vig.contaMensagem(G1);
vig.contaMensagem('120400@s.whatsapp.net'); // PV não conta
vig.registaComando('play', G1); vig.registaComando('play', G1); vig.registaComando('sticker', G2);
const tops = vig.topComandos(5);
assert.strictEqual(tops[0].cmd, 'play', 'top=play');
assert.strictEqual(tops[0].tot, 2, 'top play=2');
const partes = [{ jid: G1, subject: 'Pombos' }, { jid: G2, subject: 'Galerinha' }];
const mQR = vig.resumoGeral({ participantes: partes, comAluguel: [G1], comTrial: [] });
assert.ok(/Grupos onde estou: \*2\*/.test(mQR) && /Com aluguel activo: \*1\*/.test(mQR) && /livres\): \*1\*/.test(mQR), 'resumo geral decompõe');
const mAt = vig.mesgGruposAtivos(partes);
assert.ok(mAt.includes('Pombos — 9 msg/7d') && mAt.includes('Inactivos (0 msg): *1*') && mAt.includes('Galerinha'), 'activos/inactivos certos');
const mCmds = vig.mesgComandosMaisUsados();
assert.ok(mCmds.includes('play — 2x'), 'comandos listados');
console.log('✔ contadores de msgs/comandos + relatórios');

// ── 5. escolha: envio + resolução do toque ────────────────────
const sent = [];
const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k1' } }; },
  relayMessage: async () => ({ ok: true }),
};
const ctxO = { remoteJid: '2449@s.whatsapp.net', senderNumber: '2449', isGroup: false, prefix: '!' };
// força fallback textual (generateWAMessageFromContent bem tentará e poderá cair)
const tok = await esc.enviar(sockF, ctxO, {
  titulo: '💌 COISA', linhas: ['linha detalhe'],
  opcoes: [{ label: '✅ Sim' }, { label: '❌ Não' }],
  dados: { do: 'x' },
});
assert.ok(!!tok, 'criou token');
let despachou = null;
const r = await esc.resolver(sockF, { key: { id: 'm1' } }, ctxO, `AURASEL_${tok}_0`, async (dados, idx) => { despachou = { dados, idx }; });
assert.strictEqual(r, true, 'resolveu');
assert.strictEqual(despachou.idx, 0, 'índice certo');
assert.strictEqual(despachou.dados.do, 'x', 'dados preservados');
assert.strictEqual(await esc.resolver(sockF, { key: { id: 'm2' } }, ctxO, `AURASEL_${tok}_0`), true, 'caducado responde e true');
assert.ok(sent.some(c => /caducou/.test(c.text || '')), 'aviso de caducado enviado');
console.log('✔ AURASEL: envio → toque → despacho → caduca');

// ── 6. Vigilante: cartões enviados (avisos) ───────────────────
vig._reset();
sent.length = 0;
const cfgF = { owner: { number: '244945280380' } };
await av.avisarEntrada(sockF, cfgF, { gname: 'Pombos', autorNumero: '244911', size: 42 });
assert.ok(sent.some(c => /ENTREI NUM GRUPO/.test(c.text || '') && /@244911/.test(c.text || '')), 'avisou entrada');
sent.length = 0;
const group = [];
const sockG = { sendMessage: async (j, c) => { group.push([j, c]); sent.push(c); }, relayMessage: async () => ({}) };
await av.avisarAluguel(sockG, cfgF, { jid: 'GG@g.us', gname: 'Minha Galera', tag: 'expirado', dias: 0 });
assert.ok(group.some(([, c]) => /ALUGUEL — Minha Galera/.test(c.text || '')), 'avisou aluguel expirado');
sent.length = 0;
await av.avisarInteresse(sockG, cfgF, { tipo: 'aluguel', numero: '993', nome: 'Neia', chat: 'PV', cita: 'quero alugar' });
assert.ok(sent.some(c => /interessado no ALUGUEL/.test(c.text || '')), 'avisou interesse');
// permissões desligadas → silêncio
vig.definirPerm('interesse', false);
sent.length = 0;
await av.avisarInteresse(sockG, cfgF, { tipo: 'vip', numero: '993', nome: 'Neia' });
assert.strictEqual(sent.length, 0, 'perm OFF silencia');
vig.definirPerm('interesse', true);
console.log('✔ avisos: entrada/aluguel/interesse + perm gating');

// ── 7. Despacho das decisões ──────────────────────────────────
const calls = [];
const sockA = {
  sendMessage: async (j, c) => { calls.push(c); return { key: { id: 'k' } }; },
  groupAcceptInvite: async (code) => { calls.push({ __invite: code }); return 'NEWG@g.us'; },
  relayMessage: async () => ({}),
};
const ctxA = { remoteJid: 'o@s.whatsapp.net', senderNumber: '2449' };
const CODE22 = 'LUiiz6cVVIS1wLP8zYDZol';
await av.despachar({ do: 'convite', code: CODE22, de: '244988', nomeDe: 'Mimi' }, 0, { sock: sockA, msg: { key: { id: 'a' } }, ctx: ctxA, config: cfgF });
assert.ok(calls.some(c => c.__invite === CODE22), 'aceitar convite faz groupAcceptInvite (motor v9.16 à frente)');
assert.ok(calls.some(c => /Aceitei|Entrei/.test(c.text || '')), 'confirmação ao dono');
calls.length = 0;
await av.despachar({ do: 'convite', code: CODE22, de: '244988' }, 1, { sock: sockA, msg: { key: { id: 'a' } }, ctx: ctxA, config: cfgF });
assert.ok(calls.some(c => /Recusado/.test(c.text || '')), 'recusar confirma');
const srcEsc = fs3.readFileSync(path3.join(__dirname, '..', 'src', 'aura', 'auraEscolha.js'), 'utf8');
assert.ok(!/rowId/.test(srcEsc), 'lista SÓ usa id (regra do menu v7.93)');
assert.ok(/id: `AURASEL_/.test(srcEsc), 'rows com id AURASEL_');
const srcAv = fs3.readFileSync(path3.join(__dirname, '..', 'src', 'aura', 'auraAvisos.js'), 'utf8');
assert.ok(/groupLeave/.test(srcAv) && /GroupSettings/.test(srcAv), 'rotas renovar/sair existem');
console.log('✔ despacho: aceitar/recusar + rows estilo menu');

// ── 8. Ganchos no código-fonte ────────────────────────────────
const ch = fs3.readFileSync(path3.join(__dirname, '..', 'src', 'bot', 'commandHandler.js'), 'utf8');
assert.ok(/v7\.96: VIGILANTE/.test(ch), 'bloco vigilante');
assert.ok(/AURASEL_\[a-z0-9\]\+/.test(ch), 'intercept AURASEL_');
assert.ok(/registaComando/.test(ch), 'stats dos comandos');
assert.ok(/detectarPerguntaBalanço/.test(ch), 'balanços em conversa');
assert.ok(/avisarConvite/.test(ch), 'convite PV → cartão');
assert.ok(/partilharnumero/.test(ch), 'vcard do dono só com permissão');

const wa = fs3.readFileSync(path3.join(__dirname, '..', 'src', 'bot', 'whatsapp.js'), 'utf8');
assert.ok(/avisarEntrada\(this\.sock, config/.test(wa), 'entrada de grupo avisa dono');
assert.ok(/event\.action === 'add'/.test(wa), 'só quando É adicionada');

const r2 = fs3.readFileSync(path3.join(__dirname, '..', 'src', 'bot', 'cases', 'rental2.js'), 'utf8');
assert.ok(/avisarPedidoNovo/.test(r2), 'novo pedido → dono avisado');
assert.ok((r2.match(/avisarAluguel/g) || []).length >= 3, '3d/1d/expirado → dono');

const cer3 = fs3.readFileSync(path3.join(__dirname, '..', 'src', 'aura', 'auraCerebro.js'), 'utf8');
assert.ok(/PERGUNTA a falha/.test(cer3), 'regra pergunta-antes');

const casRef = fs3.readFileSync(path3.join(__dirname, '..', 'src', 'bot', 'cases', 'auraVigilante.js'), 'utf8');
assert.ok(/registerCase\(\['permissoes/.test(casRef) && /registerCase\(\['permitir/.test(casRef), 'cases registrados');
console.log('✔ ganchos todos presentes no código-fonte');

console.log('\nOK / test-avigilante — tudo passou (v7.96)');

})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
