'use strict';
const assert = require('assert/strict');
const path = require('path');
const https = require('https');
const { EventEmitter } = require('events');
const loadIsolated = require('./helpers/load-isolated');
const { cacheKey, chatBudget } = require('../src/bot/aiContext');
const originalRequest = https.request;
const savedTotal = process.env.AI_TOTAL_TIMEOUT_MS, savedProvider = process.env.AI_PROVIDER_TIMEOUT_MS;
delete process.env.AI_TOTAL_TIMEOUT_MS; delete process.env.AI_PROVIDER_TIMEOUT_MS;
const calls = [];
let hanging = false, aborted = 0, groups = 0;
https.request = (options, callback) => {
  const req = new EventEmitter(); let data = '';
  req.write = chunk => { data += chunk; };
  req.destroy = () => {};
  const abort = () => { aborted++; req.emit('error', new Error('aborted fixture request')); };
  options.signal?.addEventListener('abort', abort, { once: true });
  req.end = () => {
    calls.push({ options, body: JSON.parse(data) });
    if (hanging) return;
    const index = calls.length;
    queueMicrotask(() => {
      options.signal?.removeEventListener('abort', abort);
      const res = new EventEmitter(); res.statusCode = 200; callback(res);
      res.emit('data', Buffer.from(JSON.stringify({ choices: [{ message: { content: `fixture response ${index}` } }] })));
      res.emit('end');
    });
  };
  return req;
};
const config = { ai: { groqApiKey: 'fixture-not-a-real-key' }, bot: { name: 'Fixture' }, owner: { name: 'Fixture' } };
const ai = loadIsolated(path.join(__dirname, '../src/bot/ai.js'), (id, req) => {
  if (id === '../config') return config;
  if (id === './mediaHandler') return {};
  if (id === './botConfigCache') return { get: async (_key, fallback) => fallback };
  return req(id);
});
async function test(name, fn) { await fn(); groups++; console.log('✓', name); }
(async () => {
  await test('Keys include complete prompt and complete system, not truncated prefixes', () => {
    const prompt = 'p'.repeat(500), system = 's'.repeat(200);
    assert.notEqual(cacheKey(prompt + 'A', system), cacheKey(prompt + 'B', system));
    assert.notEqual(cacheKey(prompt, system + 'A'), cacheKey(prompt, system + 'B'));
    assert.notEqual(cacheKey('a|b', 'c'), cacheKey('a', 'b|c'));
    ai.aiCacheSet(prompt + 'A', system, 'fixture private response');
    assert.equal(ai.aiCacheGet(prompt + 'B', system), null);
    assert.equal(ai.aiCacheGet(prompt + 'A', system + 'different'), null);
  });
  const opts = { cacheScope: 'fixture-chat-A:actor-1', userRole: 'free', allowWeb: false, history: [{ role: 'user', content: 'private A' }] };
  let first;
  await test('An identical scoped context may reuse its own provider result', async () => {
    first = await ai.chat('Explica esta frase', 'fixture system', opts);
    const before = calls.length;
    assert.equal(await ai.chat('Explica esta frase', 'fixture system', opts), first);
    assert.equal(calls.length, before);
  });
  await test('History, actor/chat scope and role isolate provider responses', async () => {
    for (const delta of [{ history: [{ role: 'assistant', content: 'private B' }] }, { cacheScope: 'fixture-chat-B:actor-1' }, { cacheScope: 'fixture-chat-A:actor-2' }, { userRole: 'owner' }]) {
      const before = calls.length;
      const answer = await ai.chat('Explica esta frase', 'fixture system', { ...opts, ...delta });
      assert.notEqual(answer, first); assert.equal(calls.length, before + 1);
    }
  });
  await test('Unscoped callers cannot reuse private conversation cache entries', async () => {
    const before = calls.length;
    const unscoped = { ...opts, cacheScope: '' };
    await ai.chat('Explica esta frase', 'fixture system', unscoped);
    await ai.chat('Explica esta frase', 'fixture system', unscoped);
    assert.equal(calls.length, before + 2);
  });
  await test('Short follow-up questions retain sixteen effective history entries', async () => {
    const history = Array.from({ length: 18 }, (_, n) => ({ role: n % 2 ? 'assistant' : 'user', content: `entry-${n}` }));
    await ai.chat('O quê?', 'fixture system', { ...opts, history, cacheScope: 'fixture-follow-up' });
    const messages = calls.at(-1).body.messages;
    assert.equal(messages[0].role, 'system');
    assert.equal(messages[1].content, 'entry-2');
    assert.equal(messages.length, 18); // system + 16 history + current question
    assert.equal(messages.at(-1).content, 'O quê?');
  });
  await test('Different quoted replies have different cache keys and are included in the provider input', async () => {
    const before = calls.length;
    const first = await ai.chat('O quê?', 'fixture system', { ...opts, quotedMessage: { text: 'Referência A', kind: 'text' } });
    const second = await ai.chat('O quê?', 'fixture system', { ...opts, quotedMessage: { text: 'Referência B', kind: 'text' } });
    assert.notEqual(first, second); assert.equal(calls.length, before + 2);
    assert.match(calls.at(-1).body.messages.at(-1).content, /Referência B/);
    assert.match(calls.at(-1).body.messages[0].content, /referência principal/);
  });
  await test('Missing follow-up context does not waste a provider call', async () => {
    const before = calls.length;
    assert.match(await ai.chat('O quê?', 'fixture system'), /A que resposta ou assunto/);
    assert.equal(calls.length, before);
  });
  await test('Budgets are bounded; caller-specific routing budget is honoured', () => {
    assert.deepEqual(chatBudget({}, true), { total: 12000, provider: 5000 });
    assert.deepEqual(chatBudget({}, false), { total: 15000, provider: 5000 });
    assert.equal(chatBudget({ timeoutMs: 2500 }, true).total, 2500);
    assert.equal(chatBudget({ timeoutMs: 999999 }).total, 15000);
    process.env.AI_TOTAL_TIMEOUT_MS = '999999'; process.env.AI_PROVIDER_TIMEOUT_MS = 'invalid';
    assert.deepEqual(chatBudget({}), { total: 30000, provider: 5000 });
    delete process.env.AI_TOTAL_TIMEOUT_MS; delete process.env.AI_PROVIDER_TIMEOUT_MS;
  });
  await test('A hanging provider aborts within the caller budget and returns an honest error', async () => {
    hanging = true; const start = Date.now(); const before = calls.length;
    const answer = await ai.chat('fixture timeout request', 'fixture system', { allowWeb: false, timeoutMs: 40 });
    assert.match(answer, /^❌ IA offline/);
    assert.equal(calls.length, before + 1);
    assert.ok(aborted >= 1); assert.ok(Date.now() - start < 1200);
    hanging = false;
  });
  await test('TTS shares a single abortable budget instead of queuing minute-long fallbacks', async () => {
    config.ai.elevenlabsKey = 'fixture-not-real'; hanging = true;
    const before = Date.now();
    assert.equal(await ai.speakWithFallback('fixture greeting', 'fixture-voice', { timeoutMs: 35 }), null);
    assert.ok(Date.now() - before < 1200);
    assert.ok(aborted >= 2);
    hanging = false;
  });
  await test('Cancelling a chat aborts the real request mock, skips fallback and does not mark a provider outage', async () => {
    ai.providerReset('groq'); config.ai.openaiApiKey = 'fixture-fallback'; hanging = true;
    const parent = new AbortController(), before = calls.length;
    const pending = ai.chat('fixture cancelled chat', 'fixture system', { ...opts, signal: parent.signal });
    parent.abort(); await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(calls.length, before + 1); assert.equal(ai.providerStatus().groq, undefined);
    hanging = false; delete config.ai.openaiApiKey;
  });
  await test('A cancelled caller cannot receive even an otherwise valid cached result', async () => {
    const parent = new AbortController(); parent.abort(); const before = calls.length;
    await assert.rejects(ai.chat('Explica esta frase', 'fixture system', { ...opts, signal: parent.signal }), { name: 'AbortError' });
    assert.equal(calls.length, before);
  });
  await test('Cancelling voice synthesis skips Google/system fallbacks', async () => {
    const parent = new AbortController(); hanging = true; const before = calls.length;
    const pending = ai.speakWithFallback('fixture voice cancellation', 'fixture-voice', { signal: parent.signal, timeoutMs: 1000 });
    parent.abort(); await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(calls.length, before + 1); hanging = false;
  });
  await test('Provider failures are not cached as successful answers', () => {
    ai.aiCacheSet('failure fixture', 'system', '❌ IA offline');
    assert.equal(ai.aiCacheGet('failure fixture', 'system'), null);
  });
  console.log(`AI CONTEXT CACHE: ${groups} groups OK / 0 falhas; ${calls.length} simulated requests, no network`);
})().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => {
  https.request = originalRequest;
  for (const [key, value] of [['AI_TOTAL_TIMEOUT_MS', savedTotal], ['AI_PROVIDER_TIMEOUT_MS', savedProvider]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
