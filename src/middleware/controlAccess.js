'use strict';
const { randomBytes } = require('crypto');

function sessionSecret(value, production = false) {
  const secret = String(value || '').trim();
  const weak = secret.length < 32 || /change[-_ ]?me|change[-_ ]?this|example|your[-_ ]?secret/i.test(secret);
  if (!weak) return secret;
  if (production) throw new Error('SESSION_SECRET deve ser único, aleatório e ter pelo menos 32 caracteres em produção.');
  // Development sessions expire on restart if no strong secret was provided.
  return randomBytes(32).toString('hex');
}
function statusForUser(status = {}, user) {
  if (user?.role === 'owner') return status;
  // An allow-list prevents future QR/session/token/log fields from leaking.
  const out = {};
  for (const key of ['status', 'uptime', 'messageCount', 'commandCount']) {
    if (Object.prototype.hasOwnProperty.call(status, key)) out[key] = status[key];
  }
  return out;
}
function socketOriginAllowed(origin, appUrl) {
  if (!origin) return true; // Non-browser clients must still authenticate.
  try { return new URL(origin).origin === new URL(appUrl).origin; } catch (_) { return false; }
}
function authorizeSocket(socket, next, appUrl) {
  if (!socketOriginAllowed(socket.request?.headers?.origin, appUrl)) return next(new Error('Origem não autorizada'));
  if (socket.request?.session?.user?.role !== 'owner') return next(new Error('Não autorizado'));
  return next();
}
function protectSocket(io, sessionMiddleware, appUrl) {
  io.engine.use(sessionMiddleware);
  io.use((socket, next) => authorizeSocket(socket, next, appUrl));
}
function debugEnabled(config) {
  return (_req, res, next) => config.debugEndpoints ? next() : res.status(404).json({ error: 'Não encontrado' });
}
module.exports = { sessionSecret, statusForUser, socketOriginAllowed, authorizeSocket, protectSocket, debugEnabled };
