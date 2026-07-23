/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   DARK BOT — Group Events v3 ULTRA                      ║
 * ║   Welcome/Goodbye por grupo + Sistema de Aluguel        ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * WELCOME por grupo:
 *  - Cada grupo tem mensagem personalizada (GroupSettings)
 *  - Suporta {user} {grupo} {bot} {dono} no texto
 *  - Envia foto de perfil do utilizador se disponível
 *  - Pode ter imagem de boas-vindas configurável
 *
 * SISTEMA DE ALUGUEL:
 *  - Quando o bot é adicionado a um grupo → começa em ZERO
 *  - Estado: sem trial, sem hospedagem → apenas 500 cmds/dia
 *  - Dono/Subdonos activam com: !alugar <dias>
 *  - VIPs podem activar com limite do seu plano
 *  - Aviso automático ao dono com instrução de aluguel
 */

const config       = require('../config');
const botConfigCache = require('./botConfigCache');
const GroupSettings = require('../database/models/GroupSettings');
const userManager  = require('./userManager');
const { antiSpam } = require('./antiSpam');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function fillVarsWelcome(text, { userName, groupName, botName, ownerName, number } = {}) {
  return String(text || '')
    .replace(/\{user\}/gi,  `@${number}`)
    .replace(/\{nome\}/gi,  userName || '')
    .replace(/\{grupo\}/gi, groupName || '')
    .replace(/\{bot\}/gi,   botName  || 'DARK BOT')
    .replace(/\{dono\}/gi,  ownerName|| 'Dark Net')
    .trim();
}

async function ownerPvNotify(sock, text) {
  const num = String(config.owner.number || '').replace(/\D/g, '');
  if (!num) return;
  return sock.sendMessage(`${num}@s.whatsapp.net`, { text }).catch(() => {});
}

// ─────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────
async function handle(sock, event) {
  try {
    const { id: groupJid, participants, action } = event;
    if (!groupJid?.endsWith('@g.us')) return;

    const meta      = await sock.groupMetadata(groupJid).catch(() => null);
    const groupName = meta?.subject || 'grupo';

    // Detecta o JID do bot para verificar se o bot foi adicionado
    const botNum  = String(sock.user?.id || '').split(':')[0].split('@')[0];
    const botJids = [sock.user?.id, sock.user?.lid, `${botNum}@s.whatsapp.net`].filter(Boolean);
    const botWasAdded = action === 'add' && participants.some(p =>
      botJids.some(j => p.split(':')[0].split('@')[0] === j.split(':')[0].split('@')[0])
    );

    // ── BOT ADICIONADO AO GRUPO ────────────────────────────
    if (botWasAdded) {
      await handleBotAdded(sock, groupJid, groupName, meta);
      return;
    }

    // ── PARTICIPANTES ENTRAM / SAEM ────────────────────────
    let gs = await GroupSettings.findOne({ groupJid }).lean().catch(() => null);

    for (const participant of participants) {
      const number = participant.split('@')[0].replace(/\D/g, '');
      const isBot  = botJids.some(j => j.split(':')[0].split('@')[0] === number);
      if (isBot) continue; // bot já tratado acima

      if (action === 'add') {
        await handleMemberJoin(sock, groupJid, participant, number, groupName, gs, meta);
      } else if (action === 'remove') {
        await handleMemberLeave(sock, groupJid, participant, number, groupName, gs);
      }
    }

  } catch (err) {
    console.error('[GroupEvents]', err?.message || err);
  }
}

// ─────────────────────────────────────────────
// BOT ADICIONADO — cria config + avisa dono
// ─────────────────────────────────────────────
async function handleBotAdded(sock, groupJid, groupName, meta) {
  // Cria ou reseta GroupSettings — começa NO ZERO (sem trial, sem hospedagem)
  let gs = await GroupSettings.findOne({ groupJid }).catch(() => null);
  if (!gs) {
    gs = await GroupSettings.create({
      groupJid,
      groupName,
      isHosted:    false,
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 dias de trial gratuito
      hostedUntil: null,
      commandsUsedToday: 0,
      welcomeEnabled: true,
      goodbyeEnabled: true,
    }).catch(() => null);
  }

  // Mensagem de chegada no grupo
  const arrival =
    `🕸️ *${config.bot.name}* chegou!\n\n` +
    `Olá, *${groupName}*! Sou o **${config.bot.name}** 🕸️\n\n` +
    `🎁 *7 dias de trial grátis activos!*\n` +
    `Todos os comandos funcionam sem limite durante o trial.\n\n` +
    `📌 *Após o trial, para continuar ilimitado:*\n` +
    `*${config.bot.prefix}alugar <dias>*  — ex: \`${config.bot.prefix}alugar 30\`\n\n` +
    `📋 *Comandos iniciais:*\n` +
    `• *${config.bot.prefix}menubtn* — menu interactivo\n` +
    `• *${config.bot.prefix}menu* — lista completa\n` +
    `• *${config.bot.prefix}ping* — testar o bot\n\n` +
    `_Suporte: wa.me/${config.owner.number}_`;

  await sock.sendMessage(groupJid, { text: arrival }).catch(() => {});

  // Avisa dono no PV
  const adminNames = (meta?.participants || [])
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    .map(p => p.id.split('@')[0])
    .join(', ');

  await ownerPvNotify(sock,
    `🆕 *Bot adicionado a um grupo!*\n\n` +
    `📋 Grupo: *${groupName}*\n` +
    `🔑 JID: \`${groupJid}\`\n` +
    `👑 Admins: ${adminNames || 'desconhecido'}\n\n` +
    `Para activar o aluguel:\n` +
    `*${config.bot.prefix}alugar ${groupJid} 30*  (30 dias)\n\n` +
    `O grupo está no *ZERO* — sem hospedagem activa.`
  );
}

// ─────────────────────────────────────────────
// MEMBRO ENTRA
// ─────────────────────────────────────────────
async function handleMemberJoin(sock, groupJid, participantJid, number, groupName, gs, meta) {
  // Verifica se welcome está activo para este grupo
  const welcomeOn = gs?.welcomeEnabled !== false;
  if (!welcomeOn) return;

  const globalEnabled = await botConfigCache.get('welcome_enabled', true).catch(() => true);
  if (!globalEnabled) return;

  // Monta o texto de boas-vindas
  const defaultMsg =
    `╭━〔 🌙 *BEM-VINDO(A)* 〕━╮\n` +
    `│ 👋 Olá {user}!\n` +
    `│ 🎉 Entraste em *{grupo}*\n` +
    `│ 🤖 Powered by {bot}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`;

  const template = gs?.customWelcomeMsg || defaultMsg;
  const text = fillVarsWelcome(template, {
    userName:  number,
    groupName,
    botName:   config.bot.name,
    ownerName: config.owner.name,
    number,
  });

  const mentions = [participantJid];

  // Tenta enviar com foto de perfil ou imagem de boas-vindas
  try {
    // Imagem de boas-vindas do grupo (se configurada)
    const welcomeImg = gs?.welcomeWithMedia;
    if (welcomeImg) {
      await sock.sendMessage(groupJid, { image: { url: welcomeImg }, caption: text, mentions });
      return;
    }

    // Foto de perfil do utilizador
    if (gs?.welcomeWithPhoto !== false) {
      const pp = await sock.profilePictureUrl(participantJid, 'image').catch(() => null);
      if (pp) {
        await sock.sendMessage(groupJid, { image: { url: pp }, caption: text, mentions });
        return;
      }
    }
  } catch {}

  // Fallback texto simples
  await sock.sendMessage(groupJid, { text, mentions }).catch(() => {});
}

// ─────────────────────────────────────────────
// MEMBRO SAI
// ─────────────────────────────────────────────
async function handleMemberLeave(sock, groupJid, participantJid, number, groupName, gs) {
  const goodbyeOn = gs?.goodbyeEnabled !== false;
  if (!goodbyeOn) return;

  const globalEnabled = await botConfigCache.get('welcome_enabled', true).catch(() => true);
  if (!globalEnabled) return;

  const defaultMsg = `👋 @${number} saiu de *${groupName}*. Até à próxima!`;
  const template = gs?.customGoodbyeMsg || defaultMsg;
  const text = fillVarsWelcome(template, {
    userName: number, groupName,
    botName: config.bot.name,
    ownerName: config.owner.name,
    number,
  });

  await sock.sendMessage(groupJid, { text, mentions: [participantJid] }).catch(() => {});
}

module.exports = { handle };
