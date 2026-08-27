'use strict';

/**
 * Entrada única de mensagens do WhatsApp.
 *
 * O listener antigo processava apenas m.messages[0]. Em eventos em lote,
 * mensagens privadas podiam chegar no socket e nunca passar pelo handler.
 * Este router processa cada mensagem individualmente, normaliza LID/PN,
 * ignora apenas ruído e regista falhas reais de resposta.
 */
const commandHandler = require('./commandHandler');
const messageListener = require('./messageListener');
const antiLink = require('./antiLink');
const antispam = require('./antiSpam');

function isNoise(msg) {
  const keys = Object.keys(msg?.message || {});
  return !keys.length || keys.every(k => [
    'protocolMessage', 'senderKeyDistributionMessage', 'reactionMessage',
    'encReactionMessage', 'keepInChatMessage', 'pinInChatMessage',
    'messageContextInfo',
  ].includes(k));
}

function maskJid(jid = '') {
  const s = String(jid);
  if (s.endsWith('@g.us')) return `grupo·${s.slice(-8)}`;
  return `pv·${s.replace(/\D/g, '').slice(-6)}`;
}

async function process(bot, batch) {
  const messages = Array.isArray(batch?.messages) ? batch.messages : [];
  for (const raw of messages) {
    if (!raw?.message) continue;
    let msg = raw;
    try {
      if (typeof commandHandler.normalizeIncomingMsg === 'function') {
        msg = commandHandler.normalizeIncomingMsg(raw);
      }
      bot.msgCount = (bot.msgCount || 0) + 1;
      const entry = {
        ts: new Date().toISOString().slice(11, 19),
        chat: msg.key?.remoteJid === 'status@broadcast' ? 'status' : maskJid(msg.key?.remoteJid),
        de: maskJid(msg.key?.participant || msg.key?.remoteJid),
        tipo: (Object.keys(msg.message || {}).find(k => !/contextInfo|messageContextInfo/.test(k)) || '?').slice(0, 22),
        tratada: null,
      };
      bot.recentInbox = Array.isArray(bot.recentInbox) ? bot.recentInbox : [];
      bot.recentInbox.push(entry);
      if (bot.recentInbox.length > 20) bot.recentInbox.shift();

      // Mensagens próprias nunca voltam ao pipeline: evita loop infinito.
      if (msg.key?.fromMe) { entry.tratada = false; continue; }
      if (isNoise(msg)) { entry.tratada = false; continue; }

      messageListener.onUpsert(bot.sock, { ...batch, messages: [msg] }, bot.io).catch((err) => {
        if (!/Closed/i.test(String(err?.message || err))) console.error('[MESSAGE_LISTENER]', err?.stack || err);
      });

      const results = await Promise.all([
        commandHandler.handle(bot.sock, msg).catch((err) => {
          console.error('[COMMAND] handler:', err?.stack || err?.message || err);
          return false;
        }),
        antiLink.check(bot.sock, msg).catch((err) => {
          if (!/Closed/i.test(String(err?.message || err))) console.error('[ANTILINK]', err?.message || err);
          return false;
        }),
        antispam.check(bot.sock, msg).catch((err) => {
          if (!/Closed/i.test(String(err?.message || err))) console.error('[ANTISPAM]', err?.message || err);
          return false;
        }),
      ]);
      entry.tratada = !!results[0];
      if (results[0]) bot.cmdCount = (bot.cmdCount || 0) + 1;
    } catch (err) {
      console.error('[MESSAGE_ROUTER]', err?.stack || err?.message || err);
    }
  }
}

module.exports = { process, isNoise, maskJid };
