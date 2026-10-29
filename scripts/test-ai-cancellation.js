'use strict';
const assert = require('assert/strict');
const { getEventListeners } = require('events');
const { runAbortable } = require('../src/bot/aiCancellation');
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('✓', name); }
(async () => {
  await test('Pre-cancelled work never starts', async () => {
    const parent = new AbortController(); parent.abort(); let started = false;
    await assert.rejects(runAbortable(() => { started = true; }, { signal: parent.signal }), { name: 'AbortError' });
    assert.equal(started, false);
  });
  await test('A request receives a linked abort and the wait settles even if the request ignores it', async () => {
    const parent = new AbortController(); let child;
    const promise = runAbortable(signal => { child = signal; return new Promise(() => {}); }, { signal: parent.signal, timeoutMs: 10000 });
    parent.abort(); await assert.rejects(promise, { name: 'AbortError' });
    assert.equal(child.aborted, true); assert.equal(getEventListeners(parent.signal, 'abort').length, 0);
  });
  await test('Successful work clears listeners/timers and does not abort a completed request', async () => {
    const parent = new AbortController(); let child;
    assert.equal(await runAbortable(signal => { child = signal; return 'done'; }, { signal: parent.signal, timeoutMs: 20 }), 'done');
    parent.abort(); assert.equal(child.aborted, false); assert.equal(getEventListeners(parent.signal, 'abort').length, 0);
  });
  await test('Timeout aborts the request and is distinguished from user cancellation', async () => {
    let child;
    await assert.rejects(runAbortable(signal => { child = signal; return new Promise(() => {}); }, { timeoutMs: 25 }), /timeout/);
    assert.equal(child.aborted, true);
  });
  await test('Provider errors propagate and late rejected results after cancellation are consumed', async () => {
    await assert.rejects(runAbortable(() => { throw new Error('fixture provider failure'); }), /fixture provider failure/);
    const parent = new AbortController(); let rejectLate;
    const promise = runAbortable(() => new Promise((_r, reject) => { rejectLate = reject; }), { signal: parent.signal });
    parent.abort(); await assert.rejects(promise, { name: 'AbortError' }); rejectLate(new Error('late result'));
    await new Promise(resolve => setImmediate(resolve));
  });
  console.log(`AI CANCELLATION: ${count} groups OK / 0 falhas`);
})().catch(error => { console.error(error); process.exitCode = 1; });
