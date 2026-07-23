/**
 * DARK BOT v5 — Cases de Grupos/ADM
 * antilink, antispam, welcome, ban, promote, demote, todos, hidetag
 */
'use strict';

const GroupSettings = require('../../database/models/GroupSettings');

module.exports = function registerGroupCases(registerCase) {

  // Helper isAdmin local
  async function isAdminCheck(sock, ctx) {
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

  // case 'antilink'
  registerCase(['antilink'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdminCheck(sock, ctx)) return reply('🚫 Só admins.');
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
      const m = (args[1]||'').toLowerCase();
      const map = { smart:'smart', wa:'whatsapp_only', all:'all_links', todos:'all_links' };
      if (!map[m]) return reply(`❌ Modos: *smart* | *wa* | *all*`);
      gs.antilinkMode = map[m]; saved = true;
    } else if (['acao','action'].includes(sub)) {
      const a = (args[1]||'').toLowerCase();
      if (!['warn','kick','delete'].includes(a)) return reply(`❌ Acções: *warn* | *kick* | *delete*`);
      gs.antilinkAction = a; saved = true;
    } else if (['whitelist','wl'].includes(sub)) {
      const d = (args[2]||args[1]||'').toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*/,'');
      const op = (args[1]||'').toLowerCase();
      if (['add','adicionar'].includes(op) && d && d !== op) {
        if (!gs.antilinkWhitelist) gs.antilinkWhitelist = [];
        if (!gs.antilinkWhitelist.includes(d)) gs.antilinkWhitelist.push(d);
        saved = true;
      } else if (['del','remover'].includes(op) && d) {
        gs.antilinkWhitelist = (gs.antilinkWhitelist||[]).filter(x=>x!==d);
        saved = true;
      }
    }

    if (saved) await gs.save();

    const modeLabel = { smart:'🧠 Smart', whatsapp_only:'📱 Só WA', all_links:'🌐 Todos' };
    return reply(
      `╭━━━〔 🛡️ ANTI-LINK 〕━━━╮\n` +
      `┃ Estado:  ${gs.antilink ? '🟢 ON' : '🔴 OFF'}\n` +
      `┃ Modo:    ${modeLabel[gs.antilinkMode] || gs.antilinkMode}\n` +
      `┃ Acção:   ${gs.antilinkAction || 'warn'}\n` +
      `┃ WL: ${(gs.antilinkWhitelist||[]).join(', ') || 'vazia'}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
      `*${prefix}antilink on/off* | *modo smart/wa/all* | *acao warn/kick*`
    );
  });

  // case 'antispam'
  registerCase(['antispam'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdminCheck(sock, ctx)) return reply('🚫 Só admins.');
    const gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid } },
      { upsert: true, new: true }
    );
    const sub = (args[0]||'status').toLowerCase();
    let saved = false;
    if (['on','ativar'].includes(sub)) { gs.antispam = true; saved = true; }
    else if (['off','desativar'].includes(sub)) { gs.antispam = false; saved = true; }
    if (saved) await gs.save();
    return reply(`🛡️ *Anti-spam* ${gs.antispam ? '🟢 ON' : '🔴 OFF'}`);
  });

  // case 'welcome'
  registerCase(['welcome', 'boasvindas', 'bv'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!await isAdminCheck(sock, ctx)) return reply('🚫 Só admins.');
    const gs = await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { $setOnInsert: { groupJid: ctx.remoteJid } },
      { upsert: true, new: true }
    );
    const sub = (args[0]||'status').toLowerCase();
    let saved = false;
    if (['on','ativar'].includes(sub)) { gs.welcomeEnabled = true; saved = true; }
    else if (['off','desativar'].includes(sub)) { gs.welcomeEnabled = false; saved = true; }
    else if (['texto','set','msg'].includes(sub)) {
      const t = args.slice(1).join(' ').trim();
      if (!t) return reply(`📝 Variáveis: {user} {grupo} {bot}\nEx: *${prefix}welcome texto* Olá {user}!`);
      gs.customWelcomeMsg = t.slice(0,500); saved = true;
    } else if (['bye','saida'].includes(sub)) {
      const t = args.slice(1).join(' ').trim();
      if (!t) return reply(`Ex: *${prefix}welcome bye* Adeus {user}!`);
      gs.customGoodbyeMsg = t.slice(0,500); saved = true;
    }
    if (saved) await gs.save();
    return reply(
      `╭━━━〔 👋 WELCOME 〕━━━╮\n` +
      `┃ Entrada: ${gs.welcomeEnabled !== false ? '🟢 ON' : '🔴 OFF'}\n` +
      `┃ Saída:   ${gs.goodbyeEnabled !== false ? '🟢 ON' : '🔴 OFF'}\n` +
      `┃ Texto:   ${(gs.customWelcomeMsg||'padrão').slice(0,50)}\n` +
      `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
      `*${prefix}welcome on/off* | *texto ...* | *bye ...*`
    );
  });

  // case 'todos' — marca todos
  registerCase(['todos', 'all', 'everyone'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!isOwner && !await isAdminCheck(sock, ctx)) return reply('🚫 Só admins.');
    try {
      const meta     = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const mentions = meta.participants.map(p => p.id);
      const text     = args.join(' ') || '📢 Atenção grupo!';
      await sock.sendMessage(ctx.remoteJid, { text: `@📢 ${text}`, mentions }, { quoted: msg });
    } catch (e) {
      return reply('❌ ' + e.message);
    }
  });

  // case 'ban' / 'kick'
  registerCase(['ban', 'kick', 'remove'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!isOwner && !await isAdminCheck(sock, ctx)) return reply('🚫 Só admins.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply('❌ Marque o utilizador com @.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'remove');
      await reply(`✅ *${mentioned.length}* utilizador(es) removido(s).`);
    } catch (e) {
      return reply('❌ ' + e.message);
    }
  });

  // case 'promote'
  registerCase(['promote', 'admin', 'promover'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!isOwner && !await isAdminCheck(sock, ctx)) return reply('🚫 Só admins.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply('❌ Marque o utilizador.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'promote');
      return reply('✅ Promovido(s) a admin!');
    } catch (e) { return reply('❌ ' + e.message); }
  });

  // case 'demote'
  registerCase(['demote', 'unadmin', 'rebaixar'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!isOwner && !await isAdminCheck(sock, ctx)) return reply('🚫 Só admins.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply('❌ Marque o utilizador.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, mentioned, 'demote');
      return reply('✅ Admin removido.');
    } catch (e) { return reply('❌ ' + e.message); }
  });

  // case 'link'
  registerCase(['link', 'convite', 'invite'], async ({ sock, ctx, isOwner, reply }) => {
    if (!ctx.isGroup) return reply('👥 Só em grupos.');
    if (!isOwner && !await isAdminCheck(sock, { ...ctx })) return reply('🚫 Só admins.');
    try {
      const code = await sock.groupInviteCode(ctx.remoteJid);
      return reply(`🔗 *Link do grupo:*\nhttps://chat.whatsapp.com/${code}`);
    } catch (e) { return reply('❌ ' + e.message); }
  });
};
