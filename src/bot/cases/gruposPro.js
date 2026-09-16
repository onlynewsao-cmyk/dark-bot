'use strict';
/**
 * DARK BOT v7.75 — GRUPOS PRO
 * !backupgp / !restoregp — fotografia da config, aplica noutro grupo
 * !slowmode — modo lento (N segundos entre msgs por membro)
 * !setwarnlimit — ao fim de N avisos, remove
 *
 * Tudo só-admin (dono passa sempre).
 */

const gb = require('../groupBackup');

async function eAdmin(ctx, isOwner, isAdminFn) {
  if (isOwner) return true;
  try { return await isAdminFn(); } catch { return false; }
}

module.exports = function registerGruposProCases(registerCase) {
  // ── !backupgp — guarda a config no slot do admin ────────────
  registerCase(['backupgp', 'backupgrupo'], async ({ msg, ctx, isOwner, isAdminFn, reply }) => {
    if (!ctx.isGroup) return reply('👥 Isto é só em *grupos*.');
    if (!await eAdmin(ctx, isOwner, isAdminFn)) return reply('🚫 Precisas ser *administrador*.');
    const gs = await require('../hotCache').getGroupDoc(msg, ctx.remoteJid).catch(() => null);
    if (!gs) return reply('❌ Não consegui ler a config deste grupo.');
    const cfg = gb.extrair(gs);
    const bcc = require('../botConfigCache');
    await bcc.set(gb.slotDe(ctx.senderNumber), { de: ctx.groupName || ctx.remoteJid, em: Date.now(), cfg });
    return reply(`💾 Backup guardado: *${Object.keys(cfg).length}* definições de *${ctx.groupName || 'grupo'}*.\n\nNoutro grupo (onde és admin): \`!restoregp SIM\``);
  });

  // ── !restoregp — aplica o backup aqui ───────────────────────
  registerCase(['restoregp', 'restoregrupo'], async ({ ctx, args, isOwner, isAdminFn, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Isto é só em *grupos*.');
    if (!await eAdmin(ctx, isOwner, isAdminFn)) return reply('🚫 Precisas ser *administrador*.');
    if (String(args[0] || '').toUpperCase() !== 'SIM') {
      return reply(`⚠️ Isto *substitui a config* deste grupo pelo teu backup!\nConfirma: \`${prefix}restoregp SIM\``);
    }
    const bcc = require('../botConfigCache');
    const b = await bcc.get(gb.slotDe(ctx.senderNumber), null);
    if (!b?.cfg) return reply('❌ Não tens backup. Tira um primeiro com `!backupgp` no grupo modelo.');
    const GroupSettings = require('../../database/models/GroupSettings');
    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { $set: b.cfg }, { upsert: true });
    try { require('../hotCache').forgetGroup(ctx.remoteJid); } catch {}
    const quando = b.em ? new Date(b.em).toLocaleString('pt-AO') : '?';
    return reply(`✅ Config aplicada: *${Object.keys(b.cfg).length}* definições (backup de *${b.de || '?'}*, ${quando}).`);
  });

  // ── !slowmode — modo lento ──────────────────────────────────
  registerCase(['slowmode', 'modolento'], async ({ ctx, args, isOwner, isAdminFn, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Isto é só em *grupos*.');
    if (!await eAdmin(ctx, isOwner, isAdminFn)) return reply('🚫 Precisas ser *administrador*.');
    const a = String(args[0] || '').toLowerCase();
    const GroupSettings = require('../../database/models/GroupSettings');
    const hc = require('../hotCache');
    if (a === 'off' || a === '0' || a === 'desligar') {
      await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { $set: { slowmode: 0 } }, { upsert: true });
      try { hc.forgetGroup(ctx.remoteJid); } catch {}
      return reply('⏳ Slowmode *desligado*.');
    }
    const n = parseInt(a, 10);
    if (!Number.isFinite(n) || n < 5 || n > 600) return reply(`❓ Usa: \`${prefix}slowmode <5-600 segundos|off>\``);
    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { $set: { slowmode: n } }, { upsert: true });
    try { hc.forgetGroup(ctx.remoteJid); } catch {}
    return reply(`⏳ Slowmode: *${n}s* entre mensagens por membro. (Só apaga — não expulsa.)`);
  });

  // ── !setwarnlimit — avisos até remover ──────────────────────
  registerCase(['setwarnlimit', 'warnlimit'], async ({ ctx, args, isOwner, isAdminFn, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Isto é só em *grupos*.');
    if (!await eAdmin(ctx, isOwner, isAdminFn)) return reply('🚫 Precisas ser *administrador*.');
    const n = parseInt(args[0], 10);
    if (!Number.isFinite(n) || n < 1 || n > 10) return reply(`❓ Usa: \`${prefix}setwarnlimit <1-10>\``);
    const GroupSettings = require('../../database/models/GroupSettings');
    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { $set: { warnLimit: n } }, { upsert: true });
    try { require('../hotCache').forgetGroup(ctx.remoteJid); } catch {}
    return reply(`⚠️ Aviso *${n}/${n}* remove. (Limite de warns: *${n}*.)`);
  });
};
