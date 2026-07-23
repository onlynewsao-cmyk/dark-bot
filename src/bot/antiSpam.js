/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║     DARK BOT — AntiLink + AntiSpam v3 ULTRA             ║
 * ║  Sistema completo de moderação automática de grupos     ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * ANTI-LINK:
 *  - Detecta qualquer link (http/https), convites WA, Telegram, Discord,
 *    encurtadores (bit.ly, t.ly, tinyurl, cutt.ly, rb.gy, ow.ly, etc.)
 *  - Modos: smart (só WA+Telegram) | whatsapp_only | all_links
 *  - Acções: warn (avisar) | kick (remover) | delete (apagar sem avisar)
 *  - Whitelist por domínio configurável por grupo
 *  - Apaga a mensagem automaticamente se bot for admin
 *  - Sistema de avisos progressivos com contador
 *
 * ANTI-SPAM:
 *  - Janela deslizante configurável (padrão: 5 msgs em 5s)
 *  - Avisos progressivos antes de remover
 *  - Cooldown de avisos (não floodar o grupo)
 *
 * COMANDOS PARA ACTIVAR (no WhatsApp):
 *  !antilink on/off       — Liga/desliga o anti-link
 *  !antilink modo all     — Bloqueia todos os links
 *  !antilink modo smart   — Só WA + Telegram (padrão)
 *  !antilink modo wa      — Só convites WhatsApp
 *  !antilink acao warn    — Avisar (padrão)
 *  !antilink acao kick    — Remover directamente
 *  !antilink whitelist add youtube.com  — Permite esse domínio
 *  !antilink whitelist del youtube.com  — Remove da lista
 *  !antilink status       — Ver configuração actual
 *  !antispam on/off       — Liga/desliga o anti-spam
 */

const botConfigCache = require('./botConfigCache');
const config = require('../config');
const GroupSettings = require('../database/models/GroupSettings');

// ─────────────────────────────────────────────
// PADRÕES DE DETECÇÃO DE LINKS
// ─────────────────────────────────────────────

// Qualquer link HTTP/HTTPS
const LINK_HTTP = /https?:\/\//i;

// Convites WhatsApp
const LINK_WA = /chat\.whatsapp\.com\/[a-zA-Z0-9]{10,}|wa\.me\/[0-9]+/i;

// Telegram
const LINK_TG = /t\.me\/[a-zA-Z0-9_]+|telegram\.me\/[a-zA-Z0-9_]+/i;

// Discord
const LINK_DISCORD = /discord\.gg\/[a-zA-Z0-9]+|discord\.com\/invite\/[a-zA-Z0-9]+/i;

// Encurtadores conhecidos
const LINK_SHORTENERS = /\b(bit\.ly|t\.ly|tinyurl\.com|cutt\.ly|rb\.gy|ow\.ly|goo\.gl|is\.gd|buff\.ly|adf\.ly|lnkd\.in|tiny\.cc|v\.gd|qr\.ae|youtu\.be)\/\S+/i;

// "Smart" = WA + Telegram + Discord (os mais perigosos)
const LINK_SMART = new RegExp(
  LINK_WA.source + '|' + LINK_TG.source + '|' + LINK_DISCORD.source,
  'i'
);

function detectLink(text, mode = 'smart') {
  const t = String(text || '');
  if (mode === 'all_links') {
    return LINK_HTTP.test(t) || LINK_SHORTENERS.test(t) || LINK_SMART.test(t);
  }
  if (mode === 'whatsapp_only') {
    return LINK_WA.test(t);
  }
  // smart (padrão): WA + Telegram + Discord + encurtadores
  return LINK_SMART.test(t) || LINK_SHORTENERS.test(t);
}

function isWhitelisted(text, whitelist = []) {
  if (!whitelist.length) return false;
  return whitelist.some(domain => {
    const d = String(domain || '').toLowerCase().trim();
    return d && String(text).toLowerCase().includes(d);
  });
}

// ─────────────────────────────────────────────
// CACHE EM MEMÓRIA
// ─────────────────────────────────────────────

const userActivity = new Map();   // jid → [timestamps]
const warnCount = new Map();      // `spam:${jid}` ou `link:${jid}` → count
const warnCooldown = new Map();   // `${group}:${jid}` → lastTs
const groupMetaCache = new Map(); // groupJid → { meta, ts }

const GROUP_META_TTL = 60_000;

// Limpeza automática a cada 60s
setInterval(() => {
  const now = Date.now();
  for (const [k, times] of userActivity.entries()) {
    const fresh = times.filter(t => now - t < 60_000);
    if (!fresh.length) userActivity.delete(k);
    else userActivity.set(k, fresh);
  }
  for (const [k, ts] of warnCooldown.entries()) {
    if (now - ts > 15 * 60_000) warnCooldown.delete(k);
  }
  for (const [k, e] of groupMetaCache.entries()) {
    if (now - e.ts > GROUP_META_TTL * 5) groupMetaCache.delete(k);
  }
}, 60_000);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function jidNum(jid = '') {
  return String(jid || '').split(':')[0].split('@')[0].replace(/\D/g, '');
}

function isAdminPart(p) {
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

async function getGroupMeta(sock, groupJid) {
  const c = groupMetaCache.get(groupJid);
  if (c && Date.now() - c.ts < GROUP_META_TTL) return c.meta;
  try {
    const meta = await sock.groupMetadata(groupJid);
    groupMetaCache.set(groupJid, { meta, ts: Date.now() });
    return meta;
  } catch {
    return c?.meta || null;
  }
}

function participantIsAdmin(meta, jid) {
  const n = jidNum(jid);
  return meta?.participants?.some(p => jidNum(p.id) === n && isAdminPart(p));
}

function botIsAdmin(sock, meta) {
  const botNums = [sock.user?.id, sock.user?.lid, sock.user?.jid].map(jidNum).filter(Boolean);
  return meta?.participants?.some(p => botNums.includes(jidNum(p.id)) && isAdminPart(p));
}

function canWarn(senderJid, groupJid, minIntervalMs = 20_000) {
  const key = `${groupJid}:${senderJid}`;
  const last = warnCooldown.get(key) || 0;
  if (Date.now() - last < minIntervalMs) return false;
  warnCooldown.set(key, Date.now());
  return true;
}

function getWarn(key) { return warnCount.get(key) || 0; }
function addWarn(key) { const v = getWarn(key) + 1; warnCount.set(key, v); return v; }
function resetWarn(key) { warnCount.delete(key); }

// ─────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────

async function check(sock, msg) {
  try {
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid?.endsWith('@g.us')) return; // só grupos

    const senderJid = msg.key.participant;
    if (!senderJid) return;

    const senderNum = jidNum(senderJid);
    const ownerNum = String(config.owner.number || '').replace(/\D/g, '');
    if (senderNum === ownerNum) return; // dono é imune

    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      msg.message?.documentMessage?.caption || ''
    );

    // Lê config do grupo
    const gs = await GroupSettings.findOne({ groupJid: remoteJid }).lean().catch(() => null);

    const antilinkOn  = !!gs?.antilink;
    const antispamOn  = !!gs?.antispam;

    if (!antilinkOn && !antispamOn) return;

    // ── ANTI-LINK ──────────────────────────────────────────────────────
    if (antilinkOn && text) {
      const mode      = gs?.antilinkMode || 'smart';
      const action    = gs?.antilinkAction || 'warn';
      const whitelist = Array.isArray(gs?.antilinkWhitelist) ? gs.antilinkWhitelist : [];
      const maxWarns  = gs?.antilinkMaxWarns ?? 2;
      const doDelete  = gs?.antilinkDeleteMsg !== false;
      const doNotify  = gs?.antilinkNotify !== false;

      const hasLink = detectLink(text, mode);
      if (!hasLink) {
        // nada a fazer com link, vai para antispam
      } else if (isWhitelisted(text, whitelist)) {
        // domínio permitido — ignora
      } else {
        const meta = await getGroupMeta(sock, remoteJid);
        if (!meta) goto_spam: { break goto_spam; }

        // Admins e dono são imunes
        if (participantIsAdmin(meta, senderJid)) goto_spam: { break goto_spam; }

        // Bot precisa ser admin para agir
        if (!botIsAdmin(sock, meta)) goto_spam: { break goto_spam; }

        // Apaga a mensagem (independentemente da acção)
        if (doDelete) {
          try { await sock.sendMessage(remoteJid, { delete: msg.key }); } catch {}
        }

        const wkey = `link:${senderJid}:${remoteJid}`;
        const w = addWarn(wkey);

        if (action === 'kick' || w >= maxWarns) {
          // Remove o utilizador
          try {
            if (doNotify) {
              await sock.sendMessage(remoteJid, {
                text: `🚫 *DARK ANTI-LINK* 🕸️\n\n@${senderNum} foi removido por enviar link${w > 1 ? ` (${w}ª vez)` : ''}.\n\n_Modo: ${mode} | Avisos: ${w}/${maxWarns}_`,
                mentions: [senderJid],
              });
            }
            await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
            resetWarn(wkey);
          } catch (e) {
            console.warn('[AntiLink] Falha ao remover:', e.message);
          }
        } else {
          // Apenas avisa
          if (doNotify && canWarn(senderJid, remoteJid)) {
            const remaining = maxWarns - w;
            await sock.sendMessage(remoteJid, {
              text: (
                `⚠️ *DARK ANTI-LINK* 🕸️\n\n` +
                `@${senderNum}, links não são permitidos aqui!\n` +
                `Aviso *${w}/${maxWarns}* — mais ${remaining} e serás removido.`
              ),
              mentions: [senderJid],
            }).catch(() => {});
          }
        }
        return; // link tratado, não processa spam
      }
    }

    // ── ANTI-SPAM ──────────────────────────────────────────────────────
    if (antispamOn) {
      const windowMs  = gs?.antispamWindowMs || 5_000;
      const maxMsgs   = gs?.antispamMaxMsgs  || 5;
      const maxWarns  = gs?.antispamMaxWarns || 3;

      const now = Date.now();
      const acts = (userActivity.get(senderJid) || []).filter(t => now - t < windowMs);
      acts.push(now);
      userActivity.set(senderJid, acts);

      if (acts.length >= maxMsgs) {
        const meta = await getGroupMeta(sock, remoteJid);
        if (!meta) return;
        if (participantIsAdmin(meta, senderJid)) return;
        if (!botIsAdmin(sock, meta)) return;

        const wkey = `spam:${senderJid}:${remoteJid}`;
        const w = addWarn(wkey);
        userActivity.set(senderJid, []); // resetar actividade

        if (w >= maxWarns) {
          try {
            await sock.sendMessage(remoteJid, {
              text: `🚫 *DARK ANTI-SPAM* 🕸️\n\n@${senderNum} removido por spam excessivo após ${w} avisos.`,
              mentions: [senderJid],
            });
            await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
            resetWarn(wkey);
          } catch (e) {
            console.warn('[AntiSpam] Falha ao remover:', e.message);
          }
        } else {
          if (canWarn(senderJid, remoteJid, 8_000)) {
            await sock.sendMessage(remoteJid, {
              text: `⚠️ *DARK ANTI-SPAM* 🕸️\n\n@${senderNum}, para de fazer spam!\nAviso *${w}/${maxWarns}*.`,
              mentions: [senderJid],
            }).catch(() => {});
          }
        }
      }
    }

  } catch (err) {
    console.error('[AntiSpam/AntiLink]', err?.message || err);
  }
}

function clearWarnings(jid, groupJid) {
  if (groupJid) {
    warnCount.delete(`link:${jid}:${groupJid}`);
    warnCount.delete(`spam:${jid}:${groupJid}`);
  } else {
    for (const k of warnCount.keys()) {
      if (k.includes(jid)) warnCount.delete(k);
    }
  }
  userActivity.delete(jid);
}

module.exports = { check, clearWarnings, detectLink, isWhitelisted };
