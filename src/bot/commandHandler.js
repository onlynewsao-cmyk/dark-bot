const config = require('../config');
const Command = require('../database/models/Command');
const User = require('../database/models/User');
const mediaHandler = require('./mediaHandler');
const stickerMaker = require('./stickerMaker');

function extractText(msg) {
  const m = msg.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    ''
  );
}

function getSenderInfo(msg) {
  const remoteJid = msg.key.remoteJid;
  const isGroup = remoteJid?.endsWith('@g.us');
  const senderJid = isGroup ? msg.key.participant : remoteJid;
  const senderNumber = senderJid?.split('@')[0] || '';
  const pushName = msg.pushName || 'Usuário';
  return { remoteJid, isGroup, senderJid, senderNumber, pushName };
}

function fillVars(text, ctx) {
  return text
    .replace(/{user}/gi, ctx.pushName)
    .replace(/{number}/gi, ctx.senderNumber)
    .replace(/{bot}/gi, config.bot.name)
    .replace(/{owner}/gi, config.owner.name)
    .replace(/{group}/gi, ctx.groupName || 'privado')
    .replace(/{prefix}/gi, config.bot.prefix);
}

async function handle(sock, msg) {
  const text = extractText(msg).trim();
  const ctx = getSenderInfo(msg);

  // Detecta solicitação de sticker (imagem/vídeo com caption !sticker ou !s)
  const isMedia = msg.message?.imageMessage || msg.message?.videoMessage;
  const prefix = config.bot.prefix;

  // ===== STICKER (com marca d'água) =====
  if (isMedia && (text === `${prefix}sticker` || text === `${prefix}s` || text === `${prefix}fig`)) {
    return handleStickerRequest(sock, msg, ctx);
  }

  // ===== DOWNLOAD DE MÍDIA (áudio/vídeo enviado pelo bot e descartado) =====
  // Ex: !audio <link youtube>
  // (Implementação placeholder — pode usar yt-dlp/ytdl-core depois)

  if (!text.startsWith(prefix)) return;

  const args = text.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  if (!commandName) return;

  // ===== COMANDOS NATIVOS =====
  if (commandName === 'menu' || commandName === 'help') {
    return sendMenu(sock, msg, ctx);
  }
  if (commandName === 'ping') {
    return sock.sendMessage(ctx.remoteJid, { text: `🏓 Pong! ${config.bot.name} ativo.` }, { quoted: msg });
  }
  if (commandName === 'dono' || commandName === 'owner') {
    return sock.sendMessage(
      ctx.remoteJid,
      { text: `👑 *Dono:* ${config.owner.name}\n📞 wa.me/${config.owner.number}` },
      { quoted: msg }
    );
  }

  // ===== COMANDOS DO BANCO =====
  try {
    const cmd = await Command.findOne({
      $or: [{ name: commandName }, { aliases: commandName }],
      enabled: true,
    });
    if (!cmd) return;

    // Verifica permissão
    if (cmd.accessLevel === 'owner' && ctx.senderNumber !== config.owner.number) {
      return sock.sendMessage(ctx.remoteJid, { text: '🚫 Comando exclusivo do dono.' }, { quoted: msg });
    }
    if (cmd.accessLevel === 'premium') {
      const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
      const isPrem = ctx.senderNumber === config.owner.number || (user && user.isPremium());
      if (!isPrem) {
        return sock.sendMessage(
          ctx.remoteJid,
          { text: '⭐ Este comando é exclusivo *Premium*.\nFale com o dono: wa.me/' + config.owner.number },
          { quoted: msg }
        );
      }
    }

    cmd.usageCount = (cmd.usageCount || 0) + 1;
    await cmd.save();

    const responseText = fillVars(cmd.response || '', ctx);

    // Com mídia?
    if (cmd.mediaUrl && cmd.mediaType) {
      const buffer = await mediaHandler.fetchBuffer(cmd.mediaUrl);
      if (cmd.mediaType === 'image' || cmd.mediaType === 'gif') {
        await sock.sendMessage(ctx.remoteJid, { image: buffer, caption: responseText }, { quoted: msg });
      } else if (cmd.mediaType === 'video') {
        await sock.sendMessage(ctx.remoteJid, { video: buffer, caption: responseText, gifPlayback: false }, { quoted: msg });
      } else if (cmd.mediaType === 'audio') {
        await sock.sendMessage(ctx.remoteJid, { audio: buffer, mimetype: 'audio/mp4', ptt: false }, { quoted: msg });
      } else {
        await sock.sendMessage(ctx.remoteJid, { text: responseText }, { quoted: msg });
      }
    } else if (responseText) {
      await sock.sendMessage(ctx.remoteJid, { text: responseText }, { quoted: msg });
    }
  } catch (err) {
    console.error('Erro no comando', commandName, err);
  }
}

async function sendMenu(sock, msg, ctx) {
  let menu = `╭━━━〔 *${config.bot.name}* 〕━━━╮\n`;
  menu += `┃ 👑 Dono: ${config.owner.name}\n`;
  menu += `┃ 👤 Olá, ${ctx.pushName}\n`;
  menu += `┃ 📞 ${config.owner.number}\n`;
  menu += `╰━━━━━━━━━━━━━━━━╯\n\n`;

  try {
    const cmds = await Command.find({ enabled: true, isSubmenu: false }).sort({ category: 1, name: 1 });
    const byCat = {};
    for (const c of cmds) {
      const cat = c.category || 'geral';
      byCat[cat] = byCat[cat] || [];
      byCat[cat].push(c);
    }
    for (const cat of Object.keys(byCat)) {
      menu += `┏━━〔 *${cat.toUpperCase()}* 〕━━\n`;
      for (const c of byCat[cat]) {
        const lock = c.accessLevel === 'premium' ? ' ⭐' : c.accessLevel === 'owner' ? ' 👑' : '';
        menu += `┃ ◈ ${config.bot.prefix}${c.name}${lock}\n`;
      }
      menu += `┗━━━━━━━━━━━━\n\n`;
    }
  } catch (e) {
    menu += '_(banco offline)_\n';
  }

  menu += `\n🛠️ Comandos nativos: ${config.bot.prefix}ping, ${config.bot.prefix}dono, ${config.bot.prefix}sticker`;

  return sock.sendMessage(ctx.remoteJid, { text: menu }, { quoted: msg });
}

async function handleStickerRequest(sock, msg, ctx) {
  try {
    await sock.sendMessage(ctx.remoteJid, { text: '🎨 Gerando sticker...' }, { quoted: msg });

    let groupName = '';
    if (ctx.isGroup) {
      try {
        const meta = await sock.groupMetadata(ctx.remoteJid);
        groupName = meta.subject;
      } catch (e) {}
    }

    const buffer = await mediaHandler.downloadFromMessage(msg);
    const stickerBuffer = await stickerMaker.create(buffer, {
      botName: config.bot.name,
      ownerName: config.owner.name,
      userName: ctx.pushName,
      groupName: groupName || 'Privado',
      isVideo: !!msg.message?.videoMessage,
    });

    await sock.sendMessage(ctx.remoteJid, { sticker: stickerBuffer }, { quoted: msg });
  } catch (err) {
    console.error('Erro sticker:', err);
    await sock.sendMessage(ctx.remoteJid, { text: '❌ Falha ao criar sticker: ' + err.message }, { quoted: msg });
  }
}

module.exports = { handle };
