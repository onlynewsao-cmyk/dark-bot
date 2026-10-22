'use strict';
const assert = require('assert/strict');
const AiMemory = require('../src/database/models/AiMemory');
const { acompanhar } = require('../src/aura/auraDelivery');
const original = AiMemory.findOneAndUpdate;
const docs = new Map(); let creates = 0, appends = 0;
AiMemory.findOneAndUpdate = async (query, update) => {
  await new Promise(resolve => setImmediate(resolve));
  let doc = docs.get(query.contextId);
  if (update.$setOnInsert && !doc) { creates++; doc = structuredClone(update.$setOnInsert); docs.set(query.contextId, doc); }
  if (update.$push) {
    appends++; doc.history.push(...update.$push.history.$each);
    doc.history = doc.history.slice(update.$push.history.$slice);
    doc.totalMessages += update.$inc.totalMessages;
    Object.assign(doc, update.$set);
  }
  return doc;
};
(async () => {
  const context = '244900000001';
  const initial = await Promise.all(Array.from({ length: 25 }, () => AiMemory.getOrCreate(context)));
  assert.ok(initial.every(x => x === initial[0])); assert.equal(creates, 1);
  await Promise.all(Array.from({ length: 100 }, (_, n) => AiMemory.appendMessage(context, null, n % 2 ? 'assistant' : 'user', `fixture-${n}`)));
  const doc = await AiMemory.getOrCreate(context);
  assert.equal(creates, 1); assert.equal(appends, 100); assert.equal(doc.totalMessages, 100); assert.equal(doc.history.length, 40);
  assert.equal(new Set(doc.history.map(m => m.content)).size, 40);
  assert.equal(doc.history.at(-1).content, 'fixture-99');
  await AiMemory.appendMessage('244900000002', null, 'user', 'other person');
  await AiMemory.appendMessage(context, '120000000000001@g.us', 'user', 'public group');
  assert.equal(docs.size, 3);
  assert.equal(AiMemory.contextIdFor(context), 'PV:244900000001');
  assert.equal(AiMemory.contextIdFor(context, '120000000000001@g.us'), 'GROUP:120000000000001@g.us');
  await assert.rejects(AiMemory.appendMessage(context, null, 'system', 'not a user message'), /inválido/);
  const seen = [];
  const observed = acompanhar({ sendMessage: async () => ({ suppressed: true }) }, { onResponse: async value => seen.push(value) });
  await observed.sock.sendMessage('fixture', { text: 'not delivered' });
  assert.equal(observed.respondeu(), false); assert.equal(seen.length, 0);
  const delivered = acompanhar({ sendMessage: async () => ({ key: { id: 'fixture' } }) }, { onResponse: async value => seen.push(value) });
  await delivered.sock.sendMessage('fixture', { react: { text: '👍' } });
  assert.equal(delivered.respondeu(), false); assert.equal(seen.length, 0);
  await delivered.sock.sendMessage('fixture', { text: 'actual final answer' });
  assert.equal(delivered.respondeu(), true); assert.equal(seen[0].text, 'actual final answer');
  console.log('CONVERSATION MEMORY: concurrent creation, 100 atomic appends, context separation and delivery observer OK; mocked storage only');
})().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => { AiMemory.findOneAndUpdate = original; });
