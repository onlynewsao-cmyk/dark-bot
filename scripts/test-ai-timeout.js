'use strict';
const assert = require('assert/strict');
const { withTimeout } = require('../src/bot/aiTimeout');

(async () => {
  const controller = new AbortController();
  const start = Date.now();
  await assert.rejects(
    withTimeout(new Promise(() => {}), 25, controller),
    /timeout/i
  );
  assert.equal(controller.signal.aborted, true, 'timeout must abort the provider request');
  assert.ok(Date.now() - start < 1000, 'timeout should settle promptly');

  const successController = new AbortController();
  const value = await withTimeout(Promise.resolve('ok'), 100, successController);
  assert.equal(value, 'ok');
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(successController.signal.aborted, false, 'successful request must clear its timeout');

  await assert.rejects(
    withTimeout(Promise.reject(new Error('provider error')), 100),
    /provider error/
  );

  console.log('AI TIMEOUT: 3 OK / 0 falhas');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
