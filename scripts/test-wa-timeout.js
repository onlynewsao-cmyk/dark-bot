'use strict';
const assert = require('assert/strict');
const { withTimeoutCleanup } = require('../src/bot/waTimeout');

(async () => {
  assert.equal(await withTimeoutCleanup(Promise.resolve('connected'), 100, 'late'), 'connected');
  await assert.rejects(
    withTimeoutCleanup(new Promise(() => {}), 20, 'connection timeout'),
    /connection timeout/
  );
  console.log('WA TIMEOUT: OK / 0 falhas');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
