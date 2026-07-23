/**
 * DARK BOT v5 — Group Events
 * Welcome/Goodbye por grupo + Trial 3 dias ao entrar
 */
'use strict';

const config        = require('../config');
const botConfigCache = require('./botConfigCache');
const GroupSettings  = require('../database/models/GroupSettings');

function fillVars(text, { userName, groupName, botName, ownerName, number } = {}) {
  return String(text || '')
    .replace(/\{user\}/gi,  `@${number}`)
    .replace(/\{nome\}/gi,  userName  || '')
    .replace(/\{grupo\}/gi, groupName || '')
    .replace(/\{bot\}/gi,   botName   || 'DARK BOT')
    .replace(/\{dono\}/gi,  ownerName || 'Dark Net')
    .trim();
}

async function ownerPv(sock, text) {
  const num = String(config.owner.number || '').replace(/\D/g, '');
  if (!num) return;
  return sock.sendMessage(`${num}@s.whatsapp.net`, { text }).catch(() => {});
}

async function handle(sock, event) {
  try {
    const { id: groupJid, participants, action } = event;
    if (!groupJid?.endsWith('@g.us')) return;

    const meta      = await sock.groupMetadata(groupJid).catch(() => null);
    const groupName = meta?.subject || 'grupo';
    const botNum    = String(sock.user?.id || '').split(':')[0].split('@')[0];
    const botJids   = [sock.user?.id, sock.user?.lid, `${botNum}@s.whatsapp.net`].filter(Boolean);
    const botAdded  = action === 'add' && participants.some(p =>
      botJids.some(j => p.split(':')[0].split('@')[0] === j.split(':')[0].split('@')[0])
    );

    if (botAdded) {
      await onBotAdded(sock, groupJid, groupName, meta);
      return;
    }

    const gs = await GroupSettings.findOne({ groupJid }).lean().catch(() => null);
    for (const participant of participants) {
      const number = participant.split('@')[0].replace(/\D/g, '');
      const isBot  = botJids.some(j => j.split(':')[0].split('@')[0] === number);
      if (isBot) continue;
      if (action === 'add')    await onJoin(sock, groupJid, participant, number, groupName, gs, meta);
      if (action === 'remove') await onLeave(sock, groupJid, participant, number, groupName, gs);
    }
  } catch (e) {
    console.error('[GroupEvents]', e?.message);
  }
}

async function onBotAdded(sock, groupJid, groupName, meta) {
  // Criar GroupSettings com 3 dias de trial
  const trialEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  let gs = await GroupSettings.findOne({ groupJid }).catch(() => null);
  if (!gs) {
    gs = await GroupSettings.create({
      groupJid,
      groupName,
      isHosted:        false,
      trialExpiresAt:  trialEnd,
      hostedUntil:     null,
      commandsUsedToday: 0,
      welcomeEnabled:  true,
      goodbyeEnabled:  true,
    }).catch(() => null);
  } else {
    // Reset trial se for nova entrada
    gs.trialExpiresAt = trialEnd;
    gs.groupName = groupName;
    await gs.save().catch(() => {});
  }

  const p = config.bot.prefix;
  const trialDays = 3;

  const arrival =
    `🕸️ *${config.bot.name}* chegou!\n\n` +
    `╭━━━〔 🎁 *TRIAL GRATUITO* 〕━━━╮\n` +
    `┃ ⏰ *${trialDays} dias* de acesso completo!\n` +
    `┃ 📅 Expira: *${trialEnd.toLocaleDateString('pt-PT')}*\n` +
    `┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
    `┃ 📋 *Comandos iniciais:*\n` +
    `┃  • *${p}menubtn* — menu interactivo\n` +
    `┃  • *${p}play* <música> — baixar música\n` +
    `┃  • *${p}ia* <pergunta> — IA com memória\n` +
    `┃  • *${p}alugar* — ver planos de hospedagem\n` +
    `┃  • *${p}ping* — testar o bot\n` +
    `┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
    `┃ 💡 Após o trial: *${p}alugar <dias>*\n` +
    `┃ 👑 Suporte: wa.me/${config.owner.number}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

  await sock.sendMessage(groupJid, { text: arrival }).catch(() => {});

  // Notificar o dono
  const admins = (meta?.participants || [])
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    .map(p => p.id.split('@')[0]).join(', ');

  await ownerPv(sock,
    `🆕 *Bot adicionado!*\n\n` +
    `📋 Grupo: *${groupName}*\n` +
    `🔑 JID: \`${groupJid}\`\n` +
    `👑 Admins: ${admins || '?'}\n` +
    `🎁 Trial: *${trialDays} dias* activos\n\n` +
    `Para hospedar permanentemente:\n` +
    `*${p}alugar ${groupJid} 30*`
  );
}

async function onJoin(sock, groupJid, participantJid, number, groupName, gs, meta) {
  if (gs?.welcomeEnabled === false) return;
  const globalOn = await botConfigCache.get('welcome_enabled', true).catch(() => true);
  if (!globalOn) return;

  const defaultMsg =
    `╭━〔 🌙 *BEM-VINDO(A)* 〕━╮\n` +
    `┃ 👋 Olá {user}!\n` +
    `┃ 🎉 Entraste em *{grupo}*\n` +
    `┃ 🤖 *{bot}*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`;

  const template = gs?.customWelcomeMsg || defaultMsg;
  const text = fillVars(template, {
    userName: number, groupName, botName: config.bot.name,
    ownerName: config.owner.name, number,
  });

  try {
    const welcomeImg = gs?.welcomeWithMedia;
    if (welcomeImg) {
      await sock.sendMessage(groupJid, { image: { url: welcomeImg }, caption: text, mentions: [participantJid] });
      return;
    }
    if (gs?.welcomeWithPhoto !== false) {
      const pp = await sock.profilePictureUrl(participantJid, 'image').catch(() => null);
      if (pp) {
        await sock.sendMessage(groupJid, { image: { url: pp }, caption: text, mentions: [participantJid] });
        return;
      }
    }
  } catch {}
  await sock.sendMessage(groupJid, { text, mentions: [participantJid] }).catch(() => {});
}

async function onLeave(sock, groupJid, participantJid, number, groupName, gs) {
  if (gs?.goodbyeEnabled === false) return;
  const globalOn = await botConfigCache.get('welcome_enabled', true).catch(() => true);
  if (!globalOn) return;

  const defaultMsg = `👋 @${number} saiu de *${groupName}*. Até à próxima!`;
  const template = gs?.customGoodbyeMsg || defaultMsg;
  const text = fillVars(template, {
    userName: number, groupName, botName: config.bot.name,
    ownerName: config.owner.name, number,
  });
  await sock.sendMessage(groupJid, { text, mentions: [participantJid] }).catch(() => {});
}

module.exports = { handle };
