/**
 * DARK BOT v5 — Cases de Grupos/ADM
 * Todos os comandos de moderação completos
 */
'use strict';

const GroupSettings = require('../../database/models/GroupSettings');
const botConfigCache = require('../botConfigCache');

module.exports = function registerGroupCases(registerCase) {

  // ── Helper isAdmin ──────────────────────────────────────────────────
  async function isAdm(sock, ctx) {
    if (ctx.isOwner) return true;
    try {
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const snum = ctx.senderNumber;
      return meta.participants?.some(p =>
        p.id.split('@')[0].replace(/\D/g,'') === snum &&
        (p.admin === 'admin' || p.admin === 'superadmin')
      );
    } catch { return false; }
  }

  // ── Helper botIsAdmin ───────────────────────────────────────────────
  async function botIsAdm(sock, ctx) {
    try {
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      // Extrai número do bot de forma robusta (id pode ser "1234567890:0@s.whatsapp.net")
      const botRaw = String(sock.user?.id || sock.user?.jid || '');
      const botNum = botRaw.replace(/:.*/, '').replace('@s.whatsapp.net','').replace('@lid','').trim();
      return meta.participants?.some(p => {
        const pNum = String(p.id || '').replace(/:.*/, '').replace('@s.whatsapp.net','').replace('@lid','').trim();
        return pNum === botNum && (p.admin === 'admin' || p.admin === 'superadmin');
      }) || false;
    } catch { return false; }
  }

  // ── Helper: obtém mencionados ───────────────────────────────────────
  function getMentions(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
           msg.message?.interactiveResponseMessage?.contextInfo?.mentionedJid || [];
  }

  // ── Helper: garante que é grupo com bot admin ───────────────────────
  async function requireGroupAdmin(sock, ctx, reply) {
    if (!ctx.isGroup) { await reply('👥 Só em grupos.'); return false; }
    if (!await isAdm(sock, ctx)) { await reply('🚫 Só admins.'); return false; }
    if (!await botIsAdm(sock, ctx)) { await reply('⚠️ Preciso ser admin para isso.'); return false; }
    return true;
  }

  // ══════════════════════════════════════════════════════════════════
  // !del — Apaga mensagem citada e apaga o comando
  // ══════════════════════════════════════════════════════════════════
  registerCase(['del', 'delete', 'apagar', 'deletar', 'd'], async ({ m, sock, ctx, isOwner, reply }) => {
    if (!ctx.isGroup && !isOwner) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    if (!m.quoted) return reply('❌ Responde à mensagem que queres apagar.');
    try {
      await sock.sendMessage(ctx.remoteJid, {
        delete: { remoteJid: ctx.remoteJid, id: m.quoted.id, fromMe: false, participant: m.quoted.sender },
      });
      // Apaga também o comando
      await sock.sendMessage(ctx.remoteJid, { delete: m.key }).catch(() => {});
    } catch (e) {
      reply('❌ Não consegui apagar. Preciso ser admin.');
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // !hidetag — Menciona todos sem aparecer
  // ══════════════════════════════════════════════════════════════════
  registerCase(['hidetag', 'invisible', 'silent-tag'], async ({ m, sock, ctx, args, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    try {
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const mentions = meta.participants.map(p => p.id);
      const txt = args.join(' ') || '📢';
      await sock.sendMessage(ctx.remoteJid, { text: txt, mentions }, { quoted: m });
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !ban / !kick — Remove membro
  // ══════════════════════════════════════════════════════════════════
  registerCase(['ban', 'kick', 'remove'], async ({ m, sock, ctx, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    const mentioned = getMentions(m.msg || { message: {} });
    if (!mentioned.length) return reply('❌ Marca o utilizador com @.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'remove');
      reply(`✅ *${mentioned.length}* utilizador(es) removido(s).`);
      await sock.sendMessage(ctx.remoteJid, { delete: m.key }).catch(() => {});
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !tempban — Remove temporariamente
  // ══════════════════════════════════════════════════════════════════
  registerCase(['tempban', 'tempkick', 'kicktemp'], async ({ m, sock, ctx, args, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    const mentioned = getMentions(m.msg || {});
    const minutos = parseInt(args.find(a => /^\d+$/.test(a)) || '5');
    if (!mentioned.length) return reply(`❌ Usa: !tempban @user <minutos>\nEx: !tempban @user 10`);
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'remove');
      reply(`⏳ @${mentioned[0].split('@')[0]} removido por *${minutos} min*. Voltará automaticamente.`);
      setTimeout(async () => {
        try { await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'add'); } catch {}
      }, minutos * 60 * 1000);
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !add — Adiciona membro
  // ══════════════════════════════════════════════════════════════════
  registerCase(['add', 'adicionar', 'addmembro'], async ({ m, sock, ctx, args, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    const num = args[0]?.replace(/\D/g, '');
    if (!num || num.length < 8) return reply('❌ Usa: !add 244XXXXXXXXX');
    try {
      const jid = num + '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(ctx.remoteJid, [jid], 'add');
      reply(`✅ +${num} adicionado!`);
    } catch (e) {
      reply('❌ Não consegui adicionar. Possível: privacidade ou não existe.');
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // !promote — Promove a admin
  // ══════════════════════════════════════════════════════════════════
  registerCase(['promote', 'admin', 'promover'], async ({ m, sock, ctx, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    const mentioned = getMentions(m.msg || {});
    if (!mentioned.length) return reply('❌ Marca o utilizador.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'promote');
      reply('✅ Promovido a admin!');
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !demote — Remove admin
  // ══════════════════════════════════════════════════════════════════
  registerCase(['demote', 'unadmin', 'rebaixar'], async ({ m, sock, ctx, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    const mentioned = getMentions(m.msg || {});
    if (!mentioned.length) return reply('❌ Marca o utilizador.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'demote');
      reply('✅ Admin removido.');
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !open / !close — Abre ou fecha o grupo
  // ══════════════════════════════════════════════════════════════════
  registerCase(['open', 'abrir', 'abrir-grupo'], async ({ sock, ctx, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    try {
      await sock.groupSettingUpdate(ctx.remoteJid, 'not_announcement');
      reply('🔓 Grupo *aberto*! Todos podem enviar mensagens.');
    } catch (e) { reply('❌ ' + e.message); }
  });

  registerCase(['close', 'fechar', 'fechar-grupo'], async ({ sock, ctx, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    try {
      await sock.groupSettingUpdate(ctx.remoteJid, 'announcement');
      reply('🔒 Grupo *fechado*! Só admins podem enviar.');
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !silenciar — Liga/desliga modo só admins
  // ══════════════════════════════════════════════════════════════════
  registerCase(['silenciar', 'mute', 'unmute', 'calar'], async ({ sock, ctx, args, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    const on = ['on','sim','ligar','ativar','1'].includes((args[0]||'').toLowerCase());
    try {
      await sock.groupSettingUpdate(ctx.remoteJid, on ? 'announcement' : 'not_announcement');
      reply(on ? '🔇 Grupo silenciado! Só admins falam.' : '🔊 Silêncio removido! Todos podem falar.');
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !revoke — Reseta o link do grupo
  // ══════════════════════════════════════════════════════════════════
  registerCase(['revoke', 'resetlink', 'novo-link'], async ({ sock, ctx, isOwner, reply }) => {
    if (!await requireGroupAdmin(sock, ctx, reply)) return;
    try {
      await sock.groupRevokeInvite(ctx.remoteJid);
      const newCode = await sock.groupInviteCode(ctx.remoteJid);
      reply(`🔄 Link renovado!\nhttps://chat.whatsapp.com/${newCode}`);
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !link — Link de convite
  // ══════════════════════════════════════════════════════════════════
  registerCase(['link', 'convite', 'invite'], async ({ sock, ctx, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    try {
      const code = await sock.groupInviteCode(ctx.remoteJid);
      reply(`🔗 *Link do grupo:*\nhttps://chat.whatsapp.com/${code}`);
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !todos / !all — Marca todos
  // ══════════════════════════════════════════════════════════════════
  registerCase(['todos', 'all', 'everyone', 'marcarall'], async ({ m, sock, ctx, args, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    try {
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const mentions = meta.participants.map(p => p.id);
      const txt = (args.join(' ') || '📢 Atenção!') + '\n\n' + mentions.map(j=>`@${j.split('@')[0]}`).join(' ');
      await sock.sendMessage(ctx.remoteJid, { text: txt, mentions }, { quoted: m });
    } catch (e) { reply('❌ ' + e.message); }
  });

  // ══════════════════════════════════════════════════════════════════
  // !warn — Advertir membro
  // ══════════════════════════════════════════════════════════════════
  registerCase(['warn', 'advertir', 'aviso'], async ({ m, sock, ctx, args, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    const mentioned = getMentions(m.msg || {});
    const motivo = args.filter(a=>!a.startsWith('@')).join(' ') || 'Sem motivo especificado';
    if (!mentioned.length) return reply('❌ Usa: !warn @user <motivo>');

    const gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid } },
      { upsert: true, new: true }
    );
    const warnLimit = gs?.warnLimit || 3;
    // Guardar avisos em BotConfig (simples)
    const BotConfig = require('../../database/models/BotConfig');
    const warnKey = `warn_${ctx.remoteJid}_${mentioned[0].split('@')[0]}`;
    const currentWarns = (await BotConfig.get(warnKey, 0).catch(() => 0)) + 1;
    await BotConfig.set(warnKey, currentWarns);

    const txt = `⚠️ *AVISO ${currentWarns}/${warnLimit}*\n\n@${mentioned[0].split('@')[0]} foi advertido.\n📋 Motivo: _${motivo}_`;
    await sock.sendMessage(ctx.remoteJid, { text: txt, mentions: mentioned }, { quoted: m });

    if (currentWarns >= warnLimit) {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'remove').catch(() => {});
      await sock.sendMessage(ctx.remoteJid, { text: `🚫 @${mentioned[0].split('@')[0]} removido após ${warnLimit} avisos.`, mentions: mentioned });
      await BotConfig.set(warnKey, 0);
    }
  });

  // !unwarn — Remove avisos
  registerCase(['unwarn', 'removeaviso', 'clearwarn'], async ({ m, sock, ctx, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    const mentioned = getMentions(m.msg || {});
    if (!mentioned.length) return reply('❌ Marca o utilizador.');
    const BotConfig = require('../../database/models/BotConfig');
    const warnKey = `warn_${ctx.remoteJid}_${mentioned[0].split('@')[0]}`;
    await BotConfig.set(warnKey, 0);
    reply(`✅ Avisos de @${mentioned[0].split('@')[0]} removidos.`);
  });

  // !warnings — Ver avisos
  registerCase(['warnings', 'avisos', 'verwarns'], async ({ m, sock, ctx, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    const mentioned = getMentions(m.msg || {});
    const target = mentioned[0] || ctx.senderJid;
    const BotConfig = require('../../database/models/BotConfig');
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
    const warnLimit = gs?.warnLimit || 3;
    const warnKey = `warn_${ctx.remoteJid}_${target.split('@')[0]}`;
    const warns = await BotConfig.get(warnKey, 0).catch(() => 0);
    reply(`📋 @${target.split('@')[0]}: *${warns}/${warnLimit}* avisos.`);
  });

  // ══════════════════════════════════════════════════════════════════
  // !regras — Mostrar regras do grupo
  // ══════════════════════════════════════════════════════════════════
  registerCase(['regras', 'rules', 'normas'], async ({ sock, ctx, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
    if (!gs?.rulesText) return reply('📜 Sem regras definidas.\nAdmin usa: *!setregras <texto>*');
    reply(`╔━᳀『 📜 REGRAS 』═᳀\n\n${gs.rulesText}\n\n╚═━═━═━═━═━═━═━═᳀`);
  });

  // !setregras — Definir regras
  registerCase(['setregras', 'setrules', 'definirregras'], async ({ sock, ctx, args, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    const txt = args.join(' ').trim();
    if (!txt) return reply('❌ Usa: !setregras <regras do grupo>');
    await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { rulesText: txt.slice(0, 1000) },
      { upsert: true, new: true }
    );
    reply('✅ Regras definidas!\nUsa *!regras* para ver.');
  });

  // ══════════════════════════════════════════════════════════════════
  // !antilink — Anti-link
  // ══════════════════════════════════════════════════════════════════
  registerCase(['antilink'], async ({ sock, ctx, args, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    const gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid } },
      { upsert: true, new: true }
    );
    const sub = (args[0] || 'status').toLowerCase();
    let saved = false;
    if (['on','ativar','ligar'].includes(sub)) { gs.antilink = true; saved = true; }
    else if (['off','desativar','desligar'].includes(sub)) { gs.antilink = false; saved = true; }
    else if (['modo','mode'].includes(sub)) {
      const m2 = {'smart':'smart','wa':'whatsapp_only','all':'all_links','todos':'all_links'}[args[1]?.toLowerCase()];
      if (!m2) return reply('❌ Modos: *smart* | *wa* | *all*');
      gs.antilinkMode = m2; saved = true;
    } else if (['acao','action'].includes(sub)) {
      if (!['warn','kick','delete'].includes(args[1]?.toLowerCase())) return reply('❌ Acções: *warn* | *kick* | *delete*');
      gs.antilinkAction = args[1].toLowerCase(); saved = true;
    }
    if (saved) await gs.save();
    reply(
      `🛡️ *Anti-Link* ${gs.antilink ? '🟢 ON' : '🔴 OFF'}\n` +
      `Modo: *${gs.antilinkMode||'smart'}* | Acção: *${gs.antilinkAction||'warn'}*\n\n` +
      `*${prefix}antilink on/off* | *modo smart/wa/all* | *acao warn/kick*`
    );
  });

  // !antispam
  registerCase(['antispam'], async ({ sock, ctx, args, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    const gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid } },
      { upsert: true, new: true }
    );
    const sub = (args[0]||'status').toLowerCase();
    if (['on','ativar'].includes(sub)) { gs.antispam = true; await gs.save(); }
    else if (['off','desativar'].includes(sub)) { gs.antispam = false; await gs.save(); }
    reply(`🛡️ *Anti-Spam* ${gs.antispam ? '🟢 ON' : '🔴 OFF'}`);
  });

  // !welcome
  registerCase(['welcome', 'boasvindas', 'bv'], async ({ sock, ctx, args, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdm(sock, ctx)) return reply('🚫 Só admins.');
    const gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid } },
      { upsert: true, new: true }
    );
    const sub = (args[0]||'status').toLowerCase();
    let saved = false;
    if (['on','ativar'].includes(sub)) { gs.welcomeEnabled = true; saved = true; }
    else if (['off','desativar'].includes(sub)) { gs.welcomeEnabled = false; saved = true; }
    else if (['texto','set'].includes(sub)) {
      const t = args.slice(1).join(' ').trim();
      if (!t) return reply(`Variáveis: {user} {grupo} {bot}\nEx: *${prefix}welcome texto* Olá {user}!`);
      gs.customWelcomeMsg = t.slice(0,500); saved = true;
    }
    if (saved) await gs.save();
    reply(`👋 Welcome: ${gs.welcomeEnabled !== false ? '🟢 ON' : '🔴 OFF'}\nTexto: _${(gs.customWelcomeMsg||'padrão').slice(0,50)}_`);
  });
};
