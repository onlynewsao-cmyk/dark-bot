'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createConversationControls, controlIntent, identityReply, scopeKey } = require('../src/aura/auraConversation');
const interpret = require('../src/aura/auraInterpret');
const san = require('../src/aura/auraSanitizer');
const { sanitizeAI } = require('../src/bot/aiSanitizer');
const owners = require('../src/bot/ownerIdentity');
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('✓', name); }
const a = { remoteJid: '120000000000001@g.us', senderJid: '244900000001@s.whatsapp.net' };
const b = { ...a, senderJid: '244900000002@s.whatsapp.net' };
const otherChat = { ...a, remoteJid: '120000000000002@g.us' };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dark-aura-fixes-'));
(async () => {
  await test('Self-ignore wording from the screenshot is deterministic, not a third-party action', () => {
    for (const text of ['Ignore tudo que eu vou fazer a partir de agora', 'Aura, ignora-me', 'Ignora as minhas mensagens', 'Para de me responder']) assert.equal(controlIntent(text), 'pause', text);
    for (const text of ['ignora o João', 'ignora @244900000002', 'ignora tudo que ele disser', 'como ignorar alguém?', 'não me ignores', '.ignorar @alvo']) assert.notEqual(controlIntent(text), 'pause', text);
    assert.equal(controlIntent('Aura, volta a responder'), 'resume');
  });
  let controls;
  const file = path.join(dir, 'pauses.json');
  await test('Pause survives reloading; storage contains hashes only, no chat text/numbers', () => {
    controls = createConversationControls({ file });
    assert.match(controls.process('Ignore tudo que eu vou fazer a partir de agora', a).reply, /Não vou responder/);
    assert.equal(controls.process('o que é isto?', a).silent, true);
    assert.equal(createConversationControls({ file }).isPaused(a), true);
    const stored = fs.readFileSync(file, 'utf8');
    assert.deepEqual(JSON.parse(stored), { [scopeKey(a)]: true });
    assert.equal(stored.includes('244900000001'), false);
    assert.equal(stored.includes('Ignore'), false);
  });
  await test('Another participant or chat cannot resume a paused participant', () => {
    controls.process('volta a responder', b); controls.process('volta a responder', otherChat);
    assert.equal(controls.isPaused(a), true);
    assert.equal(controls.isPaused(b), false);
    assert.equal(controls.isPaused(otherChat), false);
    controls.process('volta a responder', a);
    assert.equal(controls.isPaused(a), false);
    assert.equal(createConversationControls({ file }).isPaused(a), false);
  });
  await test('Paused replies/reactions and older conversational turns are not delivered', async () => {
    const sent = [];
    const sock = { sendMessage: async (...args) => { sent.push(args); return { key: { id: 'fixture' } }; } };
    const old = controls.begin(a); old.conversational = true;
    const guarded = controls.guardSock(sock, a, old);
    await guarded.sendMessage(a.remoteJid, { text: 'current' });
    controls.begin(b); // Other actors do not supersede this participant.
    await guarded.sendMessage(a.remoteJid, { text: 'still current' });
    const next = controls.begin(a);
    await guarded.sendMessage(a.remoteJid, { text: 'stale' });
    controls.finish(next);
    await guarded.sendMessage(a.remoteJid, { text: 'stale even after next finishes' });
    const paused = controls.begin(a);
    controls.process('ignora-me', a);
    await controls.guardSock(sock, a, paused).sendMessage(a.remoteJid, { react: { text: '🖤' } });
    assert.deepEqual(sent.map(x => x[1].text), ['current', 'still current']);
    controls.process('volta a responder', a);
  });
  await test('Old queued conversational messages are expired, not answered minutes later', () => {
    const c = createConversationControls({ maxReplyAgeMs: 1000, storage: { load: () => ({}), save: () => {} } });
    const turn = c.begin(a, { timestamp: Math.floor(Date.now() / 1000) - 120 });
    assert.equal(c.canDeliver(a, turn), true, 'explicit command acknowledgements are not silently expired');
    turn.conversational = true;
    assert.equal(c.canDeliver(a, turn), false);
  });
  await test('Persistence failures are reported honestly and a failed resume stays paused', () => {
    const broken = createConversationControls({ storage: { load: () => ({}), save: () => { throw new Error('fixture disk error'); } } });
    assert.match(broken.process('ignora-me', a).reply, /não consegui guardar/);
    assert.equal(broken.isPaused(a), true);
    assert.match(broken.process('volta a responder', a).reply, /Mantive a pausa/);
    assert.equal(broken.isPaused(a), true);
  });
  await test('Pause capacity and corrupt storage fail without pretending success', () => {
    const limited = createConversationControls({ maxPaused: 1, storage: { load: () => ({}), save: () => {} } });
    limited.process('ignora-me', a);
    assert.match(limited.process('ignora-me', b).reply, /não foi alterada/);
    assert.equal(limited.isPaused(b), false);
    const invalid = createConversationControls({ storage: { load: () => { throw new Error('corrupt fixture'); }, save: () => {} } });
    assert.throws(() => invalid.process('olá', a), /corrupt fixture/);
  });
  await test('Primary Dark identity uses exact phone/LID, not names, extra owners or substrings', () => {
    const config = { owner: { number: '244900000001' }, bot: { number: '244900000009' } };
    const base = { config, sock: { user: { id: '244900000009:1@s.whatsapp.net' } }, ownerNumbers: ['244900000002'], ownerLid: '555551234567890@lid' };
    assert.equal(owners.resolveOwnerFlags({ ...base, ctx: { senderNumber: '244900000001' } }).isPrimaryOwner, true);
    const sub = owners.resolveOwnerFlags({ ...base, ctx: { senderNumber: '244900000002', pushName: 'Dark' } });
    assert.equal(sub.isOwner, true); assert.equal(sub.isPrimaryOwner, false); assert.equal(sub.isSubOwner, true);
    assert.equal(owners.resolveOwnerFlags({ ...base, ctx: { senderNumber: '244900000003', pushName: 'Dark' } }).isOwner, false);
    assert.equal(owners.resolveOwnerFlags({ ...base, ctx: { senderLid: '555551234567890' } }).isPrimaryOwner, true);
    assert.equal(owners.resolveOwnerFlags({ ...base, ctx: { senderJid: '95555512345678900@lid', senderLid: '95555512345678900' } }).isOwner, false);
    assert.equal(owners.resolveOwnerFlags().isPrimaryOwner, false);
    // A fromMe PV event names its recipient in remoteJid: that is not its actor.
    const ownMessage = owners.resolveOwnerFlags({ ...base, msg: { key: { fromMe: true, remoteJid: '244900000001@s.whatsapp.net' } }, ctx: { senderNumber: '244900000001' } });
    assert.equal(ownMessage.isPrimaryOwner, false); assert.equal(ownMessage.isBotSelf, true);
    assert.match(identityReply('Quem sou eu?', { isPrimaryOwner: true }), /És o Dark/);
    assert.match(identityReply('Quem sou eu?', sub), /subdono/);
    assert.match(identityReply('Quem sou eu?', { pushName: 'Dark' }), /Não identifiquei/);
  });
  await test('Refusals, truthful automation identity and short answers survive formatting', () => {
    for (const text of ['Não posso atender a esse pedido. Posso explicar saúde sexual.', 'Sou uma assistente virtual, não uma pessoa.', 'Não tenho acesso à URL real.', 'Sim.', 'Como posso ajudar hoje?']) {
      assert.equal(san.limparResposta(text), text, text);
      assert.equal(san.eVazamento(text), false, text);
      assert.equal(interpret.consertarSeRecusou(text, 'o quê?'), text);
    }
    assert.equal(san.limparResposta('<think>private fixture reasoning</think>Resposta final.'), 'Resposta final.');
    assert.equal(san.eVazamento('O prompt diz: instrução interna'), true);
    assert.equal(sanitizeAI('Sou uma assistente virtual. O consentimento é importante.'), 'Sou uma assistente virtual. O consentimento é importante.');
  });
  await test('Adult-context word ambiguity never becomes a roast or fabricated mention', () => {
    assert.equal(interpret.detectarPedido('Me fazer gozar agora'), null);
    assert.equal(interpret.detectarPedido('O quê?'), null);
    assert.equal(interpret.detectarPedido('goza com o João'), 'zoar');
    const fixed = interpret.consertarSeRecusou('Ah, @fulano apareceu.', 'O quê?');
    assert.equal(fixed.includes('@fulano'), false);
    assert.match(fixed, /não identificaste/);
    assert.equal(interpret.isExplicitRequest('Quais são os principais cuidados de saúde sexual?'), false);
  });
  await test('Interpretation preserves a provider boundary without retries/reframing', async () => {
    let calls = 0;
    const refusal = 'Não posso atender a esse pedido. Posso ajudar com outra abordagem.';
    const result = await interpret.entregar({ chat: async () => { calls++; return refusal; } }, { texto: 'zoa o João' });
    assert.equal(result, refusal); assert.equal(calls, 1);
    calls = 0;
    const limited = await interpret.entregar({ chat: async () => { calls++; return 'never reached'; } }, { texto: 'Quero uma história +18' });
    assert.equal(limited, interpret.EXPLICIT_REPLY); assert.equal(calls, 0);
    assert.equal((await interpret.entregar(null, { texto: 'o quê?' })).includes('@'), false);
  });
  console.log(`AURA BUGFIXES: ${count} groups OK / 0 falhas`);
})().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
