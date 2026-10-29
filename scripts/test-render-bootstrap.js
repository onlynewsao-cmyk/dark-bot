'use strict';
// Execute the real bootstrap/Express/HTTP/Socket.IO with fake services, loopback only.
const assert = require('assert/strict');
const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const socketIO = require('socket.io');
const load = require('./helpers/load-isolated');
let groups = 0;
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

async function scenario({ delayedQuery = false } = {}, check) {
  const listening = deferred(), credentials = deferred(), starting = deferred();
  let server, io, requestedHost, starts = 0, metadataReads = 0, schedulerStarts = 0;
  const intervals = [], oldInterval = global.setInterval;
  const events = ['SIGTERM', 'SIGINT', 'unhandledRejection', 'uncaughtException'];
  const previous = new Map(events.map(event => [event, new Set(process.listeners(event))]));
  const bot = { status: 'disconnected', starting: false, setIO() {}, getSock: () => null,
    getStatus: () => ({ status: bot.status, messageCount: 0, commandCount: 0 }),
    start: async () => { starts++; bot.status = 'connecting'; await starting.promise; } };
  const config = { port: 0, appUrl: 'https://fixture.invalid', nodeEnv: 'production', isProduction: true,
    sessionSecret: 'fixture-only-cryptographically-unused-secret-1234567890',
    owner: { username: 'fixture', password: 'fixture-only', name: 'Fixture', number: '244900000000' },
    bot: { name: 'Fixture', number: '244900000009', prefix: '.' }, mongodb: { uri: 'mongodb://fixture.invalid/test' }, ai: {}, cloudinary: {} };
  const owner = { role: 'owner', active: true, name: config.owner.name, whatsappNumber: config.owner.number,
    comparePassword: async () => true };
  global.setInterval = (...args) => { const timer = oldInterval(...args); intervals.push(timer); return timer; };
  const fakeHttp = { ...http, createServer(...args) {
    server = http.createServer(...args);
    const actualListen = server.listen;
    server.listen = function (port, host, ...rest) {
      requestedHost = host;
      // The production code must request all interfaces. Tests bind only loopback.
      return actualListen.call(this, port, '127.0.0.1', ...rest);
    };
    server.once('listening', () => listening.resolve());
    return server;
  } };
  const optional = { carregarMongo: async () => {}, arrancar: async () => {}, arrancarRental() {}, setIO() {}, emit() {} };
  let deadline;
  try {
    load(path.join(__dirname, '../src/index.js'), (id, req) => {
      if (id === './config') return config;
      if (id === 'http') return fakeHttp;
      if (id === 'socket.io') return { Server: class extends socketIO.Server { constructor(...args) { super(...args); io = this; } } };
      if (id === 'connect-mongo') return { create: () => new session.MemoryStore() };
      if (id === 'cloudinary') return { v2: { config() {} } };
      if (id === './database/connection') return { connectDB: async () => ({ readyState: 1 }) };
      if (id === './database/models/User') return { findOne: async () => owner };
      if (id === './database/models/Command') return { countDocuments: async () => 1 };
      if (id === './database/models/Session') return { findOne: () => ({ maxTimeMS() { return this; }, lean: () => delayedQuery ? credentials.promise : Promise.resolve({ fileName: 'creds' }) }) };
      if (id === './bot/whatsapp') return { getBot: () => bot };
      if (id === './bot/scheduler') return { start: () => { schedulerStarts++; } };
      if (id === './bot/botConfigCache') return { refresh: async () => 0, get: async (_key, fallback) => { metadataReads++; return fallback; } };
      if (id === './bot/darkUtils') return { consoleOnline() {}, consoleInfo() {} };
      if (id === './bot/ai') return { providerStatus: () => ({}) };
      if (id === './bot/callVoip') return { todas: () => [] };
      if (id === './middleware/auth') return { requireApiOwner: (_req, _res, next) => next() };
      if (id === './routes/api') return () => express.Router();
      if (['./routes/auth', './routes/dashboard'].includes(id)) return express.Router();
      if (id === './cap/capEngine') return { arrancar: async () => {}, start() {} };
      if (id.startsWith('./bot/') || id.startsWith('./aura/')) return optional;
      return req(id);
    });
    await Promise.race([listening.promise, new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('HTTP remained blocked by WhatsApp startup')), 1500); })]);
    clearTimeout(deadline); await tick();
    assert.equal(requestedHost, '0.0.0.0');
    assert.equal(schedulerStarts, 1, 'background startup must not wait for WhatsApp');
    const get = route => new Promise((resolve, reject) => {
      const request = http.get(`http://127.0.0.1:${server.address().port}${route}`, response => {
        let body = ''; response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, body }));
      });
      request.setTimeout(900, () => request.destroy(new Error('liveness request timed out')));
      request.on('error', reject);
    });
    await check({ bot, credentials, starting, get, counts: () => ({ starts, metadataReads, schedulerStarts }) });
  } finally {
    clearTimeout(deadline);
    bot.status = 'connected'; credentials.resolve({ fileName: 'creds' }); starting.resolve();
    await tick();
    for (const timer of intervals) clearInterval(timer);
    global.setInterval = oldInterval;
    if (io) await new Promise(resolve => io.close(() => resolve()));
    else if (server?.listening) await new Promise(resolve => server.close(resolve));
    for (const event of events) for (const listener of process.listeners(event)) if (!previous.get(event).has(listener)) process.removeListener(event, listener);
  }
}
async function test(name, fn) { await fn(); groups++; console.log('✓', name); }
(async () => {
  await test('HTTP and liveness remain available while WhatsApp start never settles', async () => {
    await scenario({}, async f => {
      assert.equal(f.counts().starts, 1);
      const response = await f.get('/health');
      assert.equal(response.status, 200); const body = JSON.parse(response.body);
      assert.equal(body.status, 'ok'); assert.equal(body.db, 'connected'); assert.equal(body.bot, 'connecting');
      assert.equal(f.counts().metadataReads, 0, 'health must bypass configuration/database metadata middleware');
      assert.deepEqual(await f.get('/ping'), { status: 200, body: 'OK' });
      assert.equal(f.counts().metadataReads, 0);
    });
  });
  await test('A delayed credentials query cannot restart a bot connected through the dashboard', async () => {
    await scenario({ delayedQuery: true }, async f => {
      assert.equal(f.counts().starts, 0);
      assert.equal((await f.get('/health')).status, 200);
      f.bot.status = 'connected'; f.credentials.resolve({ fileName: 'creds' });
      await tick(); await tick(); assert.equal(f.counts().starts, 0);
    });
  });
  console.log(`RENDER BOOTSTRAP: ${groups} groups OK / 0 falhas; real HTTP on loopback, mocked DB/WhatsApp`);
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
