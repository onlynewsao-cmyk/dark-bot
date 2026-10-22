'use strict';
/** Preload for selected regression scripts. Blocks external I/O; never boots the app.
 * Set DARK_TEST_ALLOW_LOCAL=1 only for an ephemeral loopback integration test.
 * Test mocks may replace these methods; this is a regression guard, not a security sandbox.
 */
const counts = {};
function block(type) { counts[type] = (counts[type] || 0) + 1; throw new Error('OFFLINE_GUARD: ' + type); }
function local(host) { return ['127.0.0.1', '::1', '[::1]'].includes(String(host || '')); }
function allowed(host) { return process.env.DARK_TEST_ALLOW_LOCAL === '1' && local(host); }
function hostFrom(value) {
  if (typeof value === 'string' || value instanceof URL) { try { return new URL(String(value)).hostname; } catch (_) { return ''; } }
  return value?.hostname || value?.host || '';
}
for (const name of ['http', 'https']) {
  const lib = require(name);
  for (const method of ['request', 'get']) {
    const original = lib[method];
    lib[method] = function (...args) {
      if (!allowed(hostFrom(args[0]))) return block('network:' + name);
      return original.apply(this, args);
    };
  }
}
if (global.fetch) {
  const original = global.fetch;
  global.fetch = async function (url, ...args) { if (!allowed(hostFrom(url))) return block('network:fetch'); return original(url, ...args); };
}
const net = require('net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const host = first && typeof first === 'object' ? first.host : args[1];
  if (!allowed(host)) return block('network:socket');
  return connect.apply(this, args);
};
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  const host = args[0] && typeof args[0] === 'object' ? args[0].host : args[1];
  if (!allowed(host)) return block('network:listen');
  return listen.apply(this, args);
};
const tls = require('tls');
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  const host = args[0] && typeof args[0] === 'object' ? args[0].host : args[1];
  if (!allowed(host)) return block('network:tls');
  return tlsConnect.apply(this, args);
};
const dns = require('dns');
for (const method of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveSrv']) {
  const original = dns[method];
  dns[method] = (...args) => method === 'lookup' && allowed(args[0]) ? original(...args) : block('network:dns');
  if (dns.promises?.[method]) {
    const originalPromise = dns.promises[method];
    dns.promises[method] = async (...args) => method === 'lookup' && allowed(args[0]) ? originalPromise(...args) : block('network:dns');
  }
}
const child = require('child_process');
for (const method of ['exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork']) child[method] = (..._args) => block('child-process');
const Module = require('module');
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === 'dotenv') return { config: () => ({ parsed: {} }), configDotenv: () => ({ parsed: {} }) };
  return load.call(this, id, ...args);
};
const mongoose = require('mongoose');
mongoose.connect = async () => block('database');
mongoose.createConnection = () => block('database');
mongoose.Query.prototype.exec = async () => block('database');
mongoose.Model.prototype.save = async () => block('database');
for (const method of ['insertMany', 'bulkWrite', 'createCollection', 'syncIndexes']) mongoose.Model[method] = async () => block('database');
process.on('exit', () => process.stderr.write('[OFFLINE_GUARD] ' + JSON.stringify(counts) + '\n'));
