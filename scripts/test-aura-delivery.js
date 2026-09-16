'use strict';
const assert = require('assert/strict');
const { acompanhar, temResposta } = require('../src/aura/auraDelivery');
let checks = 0;
function ok(name, cond) { assert.ok(cond, name); console.log('  ✅', name); checks++; }
(async () => {
  ok('texto conta como resposta', temResposta({ text: 'Olá' }));
  ok('texto vazio não conta', !temResposta({ text: '   ' }));
  ok('reacção não substitui resposta', !temResposta({ react: { text: '🌹' } }));
  ok('apagar não é responder', !temResposta({ delete: { id: 'x' } }));
  ok('áudio entregue conta', temResposta({ audio: Buffer.from('voz') }));
  const calls = [];
  const base = {
    name: 'socket original',
    sendMessage: async function (...args) { calls.push(args); assert.equal(this.name, 'socket original'); return { key: { id: 'ok' } }; },
    relayMessage: async function () { assert.equal(this.name, 'socket original'); return 'ok'; },
    identity() { return this.name; },
  };
  const d = acompanhar(base);
  ok('começa sem resposta', !d.respondeu());
  await d.sock.sendMessage('g', { react: { text: '🌹' } });
  ok('continua sem resposta após apenas reacção', !d.respondeu());
  const result = await d.sock.sendMessage('g', { text: 'Estou aqui' }, { quoted: { key: { id: 'pergunta' } } });
  ok('confirma só envio concluído', d.respondeu());
  ok('preserva retorno e argumentos do socket', result.key.id === 'ok' && calls[1][2].quoted.key.id === 'pergunta');
  ok('preserva this de outros métodos', d.sock.identity() === 'socket original');
  const broken = acompanhar({ sendMessage: async () => { throw new Error('falha'); } });
  await assert.rejects(broken.sock.sendMessage('g', { text: 'Não enviado' }));
  ok('envio rejeitado não é sucesso', !broken.respondeu());
  const relay = acompanhar(base);
  await relay.sock.relayMessage('g', { interactiveMessage: { body: { text: 'Cartão' } } });
  ok('cartão nativo entregue conta', relay.respondeu());
  const reactionRelay = acompanhar(base);
  await reactionRelay.sock.relayMessage('g', { reactionMessage: {} });
  ok('reacção via relay não conta', !reactionRelay.respondeu());
  ok('socket original não foi alterado', base.name === 'socket original' && !Object.hasOwn(base, 'respondeu'));
  console.log(`\nAURA ENTREGA: ${checks} OK / 0 falhas`);
})().catch(e => { console.error(e); process.exitCode = 1; });
