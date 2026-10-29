'use strict';
// Only an ephemeral loopback server. No production bootstrap, MongoDB or external traffic.
const assert = require('assert/strict');
const http = require('http');
const path = require('path');
const fs = require('fs');
const Module = require('module');
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const access = require('../src/middleware/controlAccess');
const { requireApiAuth, requireApiOwner } = require('../src/middleware/auth');
const loadIsolated = require('./helpers/load-isolated');
let groups = 0, server, io;
async function test(name, fn) { await fn(); groups++; console.log('✓', name); }
function request(base, route, cookie = '') {
  return new Promise((resolve, reject) => {
    const req = http.get(base + route, { agent: false, headers: cookie ? { Cookie: cookie } : {} }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const raw = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, headers: res.headers, json: raw ? JSON.parse(raw) : null }); });
    }); req.on('error', reject); req.setTimeout(1500, () => req.destroy(new Error('fixture HTTP timeout')));
  });
}
function handshake(base, cookie = '', origin = base) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket', { headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) } });
    let settled = false;
    const timer = setTimeout(() => finish(new Error('fixture socket timeout')), 2000);
    const finish = (error, result) => {
      if (settled) return; settled = true; clearTimeout(timer); ws.close();
      error ? reject(error) : resolve(result);
    };
    ws.on('error', error => finish(error));
    ws.on('message', raw => {
      const text = raw.toString();
      if (text.startsWith('0')) ws.send('40');
      if (text === '2') ws.send('3');
      if (text.startsWith('44')) finish(null, { accepted: false, error: JSON.parse(text.slice(2)).message });
      if (text.startsWith('42')) { const [event, payload] = JSON.parse(text.slice(2)); if (event === 'bot:status') finish(null, { accepted: true, payload }); }
    });
  });
}
(async () => {
  await test('Production refuses a missing/placeholder session secret; development gets a fresh one', () => {
    for (const secret of ['', 'short', 'dark-secret-change-me-2025', 'example-'.repeat(8)]) assert.throws(() => access.sessionSecret(secret, true), /SESSION_SECRET/);
    const valid = require('crypto').randomBytes(32).toString('hex');
    assert.equal(access.sessionSecret(valid, true), valid);
    assert.notEqual(access.sessionSecret('', false), access.sessionSecret('', false));
  });
  const privateStatus = { status: 'connected', uptime: 5, messageCount: 2, commandCount: 1, qr: 'fixture-qr', pairingCode: 'fixture-pair', user: { id: 'fixture-private-id' }, logs: ['fixture-private-log'], futureSecret: 'fixture-secret' };
  const app = express();
  const middleware = session({ name: 'darkbot.sid', secret: access.sessionSecret('', false), resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax' } });
  app.use(middleware);
  app.get('/fixture-login/:role', (req, res) => { req.session.user = { id: 'fixture', role: req.params.role }; res.json({ ok: true }); });
  app.get('/bot/status', requireApiAuth, (req, res) => res.json(access.statusForUser(privateStatus, req.session.user)));
  app.get('/diag', requireApiOwner, (_req, res) => res.json({ ok: true }));
  app.get('/test-pv', access.debugEnabled({ debugEndpoints: false }), requireApiOwner, (_req, res) => res.json({ ok: true }));
  app.get('/debug-enabled', access.debugEnabled({ debugEndpoints: true }), requireApiOwner, (_req, res) => res.json({ ok: true }));
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  io = new Server(server, { cors: { origin: base, credentials: true } });
  access.protectSocket(io, middleware, base);
  io.on('connection', socket => socket.emit('bot:status', privateStatus));
  const free = (await request(base, '/fixture-login/free')).headers['set-cookie'][0].split(';')[0];
  const owner = (await request(base, '/fixture-login/owner')).headers['set-cookie'][0].split(';')[0];
  await test('Unauthenticated HTTP is denied; free accounts receive only an allow-listed status', async () => {
    assert.equal((await request(base, '/bot/status')).status, 401);
    assert.deepEqual((await request(base, '/bot/status', free)).json, { status: 'connected', uptime: 5, messageCount: 2, commandCount: 1 });
    assert.deepEqual((await request(base, '/bot/status', owner)).json, privateStatus);
  });
  await test('Diagnostics require owner; PV simulation is disabled by default even for owner', async () => {
    assert.equal((await request(base, '/diag')).status, 401);
    assert.equal((await request(base, '/diag', free)).status, 403);
    assert.equal((await request(base, '/diag', owner)).status, 200);
    assert.equal((await request(base, '/test-pv', owner)).status, 404);
    assert.equal((await request(base, '/debug-enabled')).status, 401);
    assert.equal((await request(base, '/debug-enabled', free)).status, 403);
    assert.equal((await request(base, '/debug-enabled', owner)).status, 200);
  });
  await test('Real Socket.IO rejects anonymous/free sessions and accepts an owner session', async () => {
    assert.equal((await handshake(base)).accepted, false);
    assert.equal((await handshake(base, free)).accepted, false);
    const accepted = await handshake(base, owner);
    assert.equal(accepted.accepted, true); assert.deepEqual(accepted.payload, privateStatus);
  });
  await test('An authenticated owner session does not authorize a cross-origin socket', async () => {
    assert.equal((await handshake(base, owner, 'https://untrusted.invalid')).accepted, false);
    assert.equal(access.socketOriginAllowed('not a URL', base), false);
  });
  await test('RPG legacy reset is a no-op without explicit confirmation; repeated confirmed calls stay idempotent', async () => {
    let deletes = 0, flag = false;
    const reset = loadIsolated(path.join(__dirname, '../src/bot/rpg/reset788.js'), (id, req) => {
      if (id === '../botConfigCache') return { get: async () => flag, set: async (_key, value) => { flag = value; } };
      if (id === '../../database/models/RPGPlayer') return { deleteMany: async () => { deletes++; return { deletedCount: 5 }; } };
      return req(id);
    });
    assert.equal(await reset.run(), false); assert.equal(await reset.run({ confirmed: 'true' }), false); assert.equal(deletes, 0);
    assert.equal(await reset.run({ confirmed: true }), true); assert.equal(deletes, 1);
    assert.equal(await reset.run({ confirmed: true }), false); assert.equal(deletes, 1);
    const bootstrap = fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8');
    assert.match(bootstrap, /if \(config\.allowLegacyRpgReset\).*run\(\{ confirmed: true \}\)/);
    assert.equal((bootstrap.match(/app\.get\('\/status'/g) || []).length, 1);
    assert.match(bootstrap, /online: st\.status === 'connected'/);
  });
  await test('Lazy imports resolve to the actual source/package location', () => {
    for (const [source, imported, expected] of [
      ['src/aura/actions/megaActions.js', '../../bot/ai', 'src/bot/ai.js'],
      ['src/bot/cases/pack.js', '../../database/models/BotConfig', 'src/database/models/BotConfig.js'],
      ['src/routes/api.js', '../../package.json', 'package.json'],
    ]) {
      const filename = path.join(__dirname, '..', source);
      assert.equal(Module.createRequire(filename).resolve(imported), path.resolve(__dirname, '..', expected));
      assert.ok(fs.readFileSync(filename, 'utf8').includes(`require('${imported}')`));
    }
  });
  console.log(`CONTROL SECURITY: ${groups} groups OK / 0 falhas; loopback only, mock RPG storage`);
})().catch(err => { console.error(err); process.exitCode = 1; }).finally(async () => {
  if (io) await new Promise(resolve => io.close(resolve));
  else if (server?.listening) await new Promise(resolve => server.close(resolve));
});
