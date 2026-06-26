const botConfigCache = require('./botConfigCache');
const config = require('../config');
const GroupSettings = require('../database/models/GroupSettings');

const userActivity = new Map(); // jid -> [timestamps]
const warnings = new Map(); // jid -> count

// Limpeza automática a cada 30s para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [jid, times] of userActivity.entries()) {
    const recent = times.filter(t => now - t < 5000);
    if (recent.length === 0) userActivity.delete(jid);
    else userActivity.set(jid, recent);
  }
  for (const [jid, count] of warnings.entries()) {
    if (count === 0) warnings.delete(jid);
  }
}, 30000);

async function check(sock, msg) {
  try {
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid?.endsWith('@g.us')) return; // só grupos

    const senderJid = msg.key.participant;
    const senderNumber = senderJid?.split('@')[0];
    if (!senderJid || senderNumber === config.owner.number) return;

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || msg.message?.documentMessage?.caption || '';

    const gs = await GroupSettings.findOne({ groupJid: remoteJid }).catch(() => null);
    const antilinkEnabled = !!(gs?.antilink) || await botConfigCache.get('antilink_enabled', false);
    const antispamEnabled = !!(gs?.antispam) || await botConfigCache.get('antispam_enabled', false);
    const antilinkMode = gs?.antilinkMode || 'smart';
    const antilinkAction = gs?.antilinkAction || 'warn';
    const whitelist = Array.isArray(gs?.antilinkWhitelist) ? gs.antilinkWhitelist : [];

    const hasLink = /https?:\/\/|chat\.whatsapp\.com|wa\.me\//i.test(text);
    const isWaLink = /chat\.whatsapp\.com|wa\.me\//i.test(text);
    const isAllowed = whitelist.some(d => d && String(text).toLowerCase().includes(String(d).toLowerCase()));
    const shouldBlockLink = antilinkEnabled && hasLink && !isAllowed && (
      antilinkMode === 'all_links' || (antilinkMode === 'whatsapp_only' && isWaLink) || (antilinkMode === 'smart' && isWaLink)
    );

    // ANTILINK
    if (shouldBlockLink) {
      const meta = await sock.groupMetadata(remoteJid).catch(() => null);
      if (!meta) return;
      const sender = meta.participants.find(p => p.id === senderJid);
      if (sender?.admin) return; // admins podem
      const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const botIsAdmin = meta.participants.find(p => p.id === me)?.admin;
      if (!botIsAdmin) return;

      try {
        await sock.sendMessage(remoteJid, { delete: msg.key });
        await sock.sendMessage(remoteJid, {
          text: `🚫 *ANTI-LINK*\n\n@${senderNumber} foi removido por enviar link.`,
          mentions: [senderJid],
        });
        await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
      } catch (e) {}
      return;
    }

    // ANTISPAM (5 msgs em 5s)
    if (antispamEnabled) {
      const now = Date.now();
      const acts = userActivity.get(senderJid) || [];
      const recent = acts.filter(t => now - t < 5000);
      recent.push(now);
      userActivity.set(senderJid, recent);

      if (recent.length >= 5) {
        const meta = await sock.groupMetadata(remoteJid).catch(() => null);
        const sender = meta?.participants.find(p => p.id === senderJid);
        if (sender?.admin) return;
        const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (!meta?.participants.find(p => p.id === me)?.admin) return;

        const w = (warnings.get(senderJid) || 0) + 1;
        warnings.set(senderJid, w);
        if (w >= 3) {
          try {
            await sock.sendMessage(remoteJid, {
              text: `🚫 @${senderNumber} foi removido por SPAM (3 avisos).`,
              mentions: [senderJid],
            });
            await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
            warnings.delete(senderJid);
          } catch (e) {}
        } else {
          await sock.sendMessage(remoteJid, {
            text: `⚠️ @${senderNumber} pare de fazer spam! Aviso ${w}/3`,
            mentions: [senderJid],
          }).catch(() => {});
        }
        userActivity.set(senderJid, []);
      }
    }
  } catch (err) { console.error('antiSpam:', err); }
}

module.exports = { check };
