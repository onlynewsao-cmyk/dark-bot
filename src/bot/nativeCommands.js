const Command = require('../database/models/Command');
const User = require('../database/models/User');
const mediaHandler = require('./mediaHandler');
const downloader = require('./downloader');
const stickerMaker = require('./stickerMaker');
const config = require('../config');
const os = require('os');

const startTime = Date.now();

// Helpers
const reply = (sock, msg, ctx, text) => sock.sendMessage(ctx.remoteJid, { text }, { quoted: msg });
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
const isAdmin = async (sock, ctx) => {
  if (!ctx.isGroup) return false;
  try {
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const participant = meta.participants.find(p => p.id === ctx.senderJid);
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
  } catch (e) { return false; }
};
const botIsAdmin = async (sock, ctx) => {
  if (!ctx.isGroup) return false;
  try {
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const p = meta.participants.find(x => x.id === me);
    return p?.admin === 'admin' || p?.admin === 'superadmin';
  } catch (e) { return false; }
};

module.exports = {
  // ============ INFO ============
  async menu({ sock, msg, ctx, config }) {
    const uptime = formatUptime(Date.now() - startTime);
    const dbCount = await Command.countDocuments({ enabled: true }).catch(() => 0);
    const userCount = await User.countDocuments().catch(() => 0);

    let menu = `╭━━━━━━━━━━━━━━━━━━━━╮
┃   ⚡ *${config.bot.name}* ⚡   
┃   🌙 _The Dark Side_   
╰━━━━━━━━━━━━━━━━━━━━╯

╭─〔 👤 *USUÁRIO* 〕
│ 👋 Olá, ${ctx.pushName}
│ 📱 ${ctx.senderNumber}
│ 💬 ${ctx.isGroup ? 'Grupo: ' + ctx.groupName : 'Privado'}
╰────────────────────

╭─〔 🤖 *INFO BOT* 〕
│ 👑 Dono: ${config.owner.name}
│ 📞 +${config.owner.number}
│ ⏱️ Online há: ${uptime}
│ 👥 Usuários: ${userCount}
│ ⚡ Comandos DB: ${dbCount}
╰────────────────────

╭─〔 📥 *DOWNLOADS* 〕
│ ◈ ${config.bot.prefix}play <música>
│ ◈ ${config.bot.prefix}video <link/nome>
│ ◈ ${config.bot.prefix}tiktok <link>
│ ◈ ${config.bot.prefix}instagram <link>
│ ◈ ${config.bot.prefix}fb <link facebook>
╰────────────────────

╭─〔 🎨 *FIGURINHAS* 〕
│ ◈ ${config.bot.prefix}sticker (em foto/vídeo)
│ ◈ ${config.bot.prefix}toimg (em sticker)
│ ◈ ${config.bot.prefix}attp <texto>
╰────────────────────

╭─〔 👥 *GRUPOS* 〕
│ ◈ ${config.bot.prefix}ban @user (admin)
│ ◈ ${config.bot.prefix}promote @user (admin)
│ ◈ ${config.bot.prefix}demote @user (admin)
│ ◈ ${config.bot.prefix}kick @user (admin)
│ ◈ ${config.bot.prefix}grupo info
│ ◈ ${config.bot.prefix}link (link do grupo)
│ ◈ ${config.bot.prefix}revoke (resetar link)
│ ◈ ${config.bot.prefix}open / ${config.bot.prefix}close
│ ◈ ${config.bot.prefix}todos (marcar todos)
╰────────────────────

╭─〔 🎮 *DIVERSÃO* 〕
│ ◈ ${config.bot.prefix}dado
│ ◈ ${config.bot.prefix}moeda
│ ◈ ${config.bot.prefix}piada
│ ◈ ${config.bot.prefix}frase
│ ◈ ${config.bot.prefix}ppt <pedra/papel/tesoura>
│ ◈ ${config.bot.prefix}gay @user
│ ◈ ${config.bot.prefix}casal
│ ◈ ${config.bot.prefix}ship @user1 @user2
╰────────────────────

╭─〔 🛠️ *UTILITÁRIOS* 〕
│ ◈ ${config.bot.prefix}ping
│ ◈ ${config.bot.prefix}dono
│ ◈ ${config.bot.prefix}info
│ ◈ ${config.bot.prefix}id
│ ◈ ${config.bot.prefix}perfil
│ ◈ ${config.bot.prefix}qrcode <texto>
│ ◈ ${config.bot.prefix}calc <expressão>
│ ◈ ${config.bot.prefix}translate <texto>
╰────────────────────

╭─〔 ⭐ *PREMIUM/VIP* 〕
│ ◈ ${config.bot.prefix}vip
│ ◈ ${config.bot.prefix}premium
╰────────────────────

╭─〔 👑 *DONO* 〕
│ ◈ ${config.bot.prefix}broadcast <msg>
│ ◈ ${config.bot.prefix}block @user
│ ◈ ${config.bot.prefix}unblock @user
│ ◈ ${config.bot.prefix}setpremium <num>
│ ◈ ${config.bot.prefix}stats
╰────────────────────

🌙 _${config.bot.name} • By ${config.owner.name}_`;

    return sock.sendMessage(ctx.remoteJid, { text: menu }, { quoted: msg });
  },

  async ping({ sock, msg, ctx, config }) {
    const start = Date.now();
    const sent = await reply(sock, msg, ctx, '🏓 Calculando...');
    const ping = Date.now() - start;
    await sock.sendMessage(ctx.remoteJid, {
      text: `🏓 *Pong!*\n\n⚡ Latência: *${ping}ms*\n🤖 ${config.bot.name} ativo!`,
      edit: sent.key,
    }).catch(() => reply(sock, msg, ctx, `🏓 Pong! ${ping}ms`));
  },

  async dono({ sock, msg, ctx, config }) {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.owner.name}\nORG:${config.bot.name};\nTEL;type=CELL;type=VOICE;waid=${config.owner.number}:+${config.owner.number}\nEND:VCARD`;
    await sock.sendMessage(ctx.remoteJid, {
      contacts: { displayName: config.owner.name, contacts: [{ vcard }] },
    }, { quoted: msg });
    await reply(sock, msg, ctx, `👑 *DONO:* ${config.owner.name}\n📞 wa.me/${config.owner.number}\n🌙 _The Dark Side_`);
  },

  async info({ sock, msg, ctx, config }) {
    const uptime = formatUptime(Date.now() - startTime);
    const ram = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB`;
    const text = `╭━━〔 *${config.bot.name}* 〕━━╮
│ 🤖 Bot: ${config.bot.name}
│ 👑 Dono: ${config.owner.name}
│ 📞 +${config.owner.number}
│ 🌐 Node: ${process.version}
│ 💾 RAM: ${ram}
│ ⏱️ Uptime: ${uptime}
│ 🖥️ Plataforma: ${os.platform()}
╰━━━━━━━━━━━━━━━━╯`;
    return reply(sock, msg, ctx, text);
  },

  async id({ sock, msg, ctx }) {
    const text = `🆔 *INFORMAÇÕES*\n\n👤 Você: ${ctx.senderNumber}\n💬 Chat: ${ctx.remoteJid}\n${ctx.isGroup ? '👥 Grupo: ' + ctx.groupName : '📱 Privado'}`;
    return reply(sock, msg, ctx, text);
  },

  async perfil({ sock, msg, ctx }) {
    const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
    const role = user?.role === 'owner' ? '👑 Dono' : user?.role === 'premium' ? '⭐ Premium' : '🆓 Free';
    const text = `╭━〔 👤 *SEU PERFIL* 〕━╮
│ 📛 Nome: ${ctx.pushName}
│ 📱 Número: +${ctx.senderNumber}
│ 🏷️ Tipo: ${role}
│ ⚡ Comandos usados: ${user?.commandsUsed || 0}
${user?.premiumUntil ? `│ ⏳ Premium até: ${new Date(user.premiumUntil).toLocaleDateString('pt-BR')}` : ''}
╰━━━━━━━━━━━━━━━╯`;
    return reply(sock, msg, ctx, text);
  },

  // ============ DOWNLOADS ============
  async play({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎵 Use: !play <nome ou link da música>');
    await react(sock, msg, '⏳');
    try {
      const query = args.join(' ');
      const result = await downloader.youtubeAudio(query);
      if (!result) throw new Error('Não encontrado');
      await sock.sendMessage(ctx.remoteJid, {
        audio: { url: result.url },
        mimetype: 'audio/mpeg',
        fileName: `${result.title}.mp3`,
      }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Erro: ${err.message}`);
    }
  },

  async video({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎬 Use: !video <nome ou link>');
    await react(sock, msg, '⏳');
    try {
      const result = await downloader.youtubeVideo(args.join(' '));
      if (!result) throw new Error('Não encontrado');
      await sock.sendMessage(ctx.remoteJid, {
        video: { url: result.url },
        caption: `🎬 *${result.title}*`,
      }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Erro: ${err.message}`);
    }
  },

  async tiktok({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎵 Use: !tiktok <link>');
    await react(sock, msg, '⏳');
    try {
      const result = await downloader.tiktok(args[0]);
      await sock.sendMessage(ctx.remoteJid, {
        video: { url: result.url },
        caption: `🎵 TikTok\n${result.title || ''}`,
      }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Erro: ${err.message}`);
    }
  },

  async instagram({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📸 Use: !instagram <link>');
    await react(sock, msg, '⏳');
    try {
      const result = await downloader.instagram(args[0]);
      if (result.type === 'video') {
        await sock.sendMessage(ctx.remoteJid, { video: { url: result.url }, caption: '📸 Instagram' }, { quoted: msg });
      } else {
        await sock.sendMessage(ctx.remoteJid, { image: { url: result.url }, caption: '📸 Instagram' }, { quoted: msg });
      }
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Erro: ${err.message}`);
    }
  },

  async fb({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📘 Use: !fb <link facebook>');
    await react(sock, msg, '⏳');
    try {
      const result = await downloader.facebook(args[0]);
      await sock.sendMessage(ctx.remoteJid, { video: { url: result.url }, caption: '📘 Facebook' }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ Erro: ${err.message}`);
    }
  },

  // ============ FIGURINHAS ============
  async sticker({ sock, msg, ctx, config }) {
    const isMedia = msg.message?.imageMessage || msg.message?.videoMessage;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedHasMedia = quoted?.imageMessage || quoted?.videoMessage;

    if (!isMedia && !quotedHasMedia) {
      return reply(sock, msg, ctx, '🎨 Envie/responda uma foto ou vídeo com a legenda *!sticker*');
    }
    await react(sock, msg, '⏳');
    try {
      const targetMsg = quotedHasMedia ? {
        key: msg.message.extendedTextMessage.contextInfo.stanzaId,
        message: quoted,
      } : msg;
      const buffer = await mediaHandler.downloadFromMessage(quotedHasMedia ? { message: quoted } : msg);
      const stickerBuf = await stickerMaker.create(buffer, {
        botName: config.bot.name,
        ownerName: config.owner.name,
        userName: ctx.pushName,
        groupName: ctx.groupName || 'Privado',
        isVideo: !!(msg.message?.videoMessage || quoted?.videoMessage),
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stickerBuf }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${err.message}`);
    }
  },

  async toimg({ sock, msg, ctx }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.stickerMessage) {
      return reply(sock, msg, ctx, '🖼️ Responda um sticker com *!toimg*');
    }
    try {
      const buffer = await mediaHandler.downloadFromMessage({ message: quoted });
      await sock.sendMessage(ctx.remoteJid, { image: buffer, caption: '🖼️ Sticker → Imagem' }, { quoted: msg });
    } catch (err) {
      return reply(sock, msg, ctx, `❌ ${err.message}`);
    }
  },

  async attp({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '✍️ Use: !attp <texto>');
    const text = encodeURIComponent(args.join(' '));
    try {
      const buffer = await mediaHandler.fetchBuffer(`https://api.popcat.xyz/attp?text=${text}`);
      await sock.sendMessage(ctx.remoteJid, { sticker: buffer }, { quoted: msg });
    } catch (err) {
      return reply(sock, msg, ctx, `❌ ${err.message}`);
    }
  },

  // ============ GRUPOS ============
  async ban({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Eu preciso ser admin.');
    const targets = getMentions(msg);
    if (!targets.length) return reply(sock, msg, ctx, '🎯 Marque o usuário. Ex: !ban @fulano');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, targets, 'remove');
      await reply(sock, msg, ctx, `✅ Banido(s): ${targets.length} usuário(s)`);
    } catch (e) { await reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async kick(args) { return module.exports.ban(args); },

  async promote({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Eu preciso ser admin.');
    const targets = getMentions(msg);
    if (!targets.length) return reply(sock, msg, ctx, '🎯 Marque o usuário.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, targets, 'promote');
      await reply(sock, msg, ctx, `👑 Promovido(s) a admin!`);
    } catch (e) { await reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async demote({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Eu preciso ser admin.');
    const targets = getMentions(msg);
    if (!targets.length) return reply(sock, msg, ctx, '🎯 Marque o usuário.');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, targets, 'demote');
      await reply(sock, msg, ctx, `⬇️ Rebaixado(s).`);
    } catch (e) { await reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async grupo({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const text = `╭━〔 *INFO GRUPO* 〕━╮
│ 📛 Nome: ${meta.subject}
│ 🆔 ID: ${meta.id}
│ 👥 Membros: ${meta.participants.length}
│ 👑 Admins: ${meta.participants.filter(p=>p.admin).length}
│ 📅 Criado: ${meta.creation ? new Date(meta.creation*1000).toLocaleDateString('pt-BR') : '?'}
│ 📝 Descrição: ${meta.desc || 'sem descrição'}
╰━━━━━━━━━━━━━━━━━╯`;
    return reply(sock, msg, ctx, text);
  },

  async link({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Eu preciso ser admin.');
    try {
      const code = await sock.groupInviteCode(ctx.remoteJid);
      return reply(sock, msg, ctx, `🔗 *Link do grupo:*\nhttps://chat.whatsapp.com/${code}`);
    } catch (e) { return reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async revoke({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins.');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Eu preciso ser admin.');
    try {
      await sock.groupRevokeInvite(ctx.remoteJid);
      return reply(sock, msg, ctx, '🔄 Link resetado!');
    } catch (e) { return reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async open({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins.');
    try {
      await sock.groupSettingUpdate(ctx.remoteJid, 'not_announcement');
      return reply(sock, msg, ctx, '🔓 Grupo aberto para todos.');
    } catch (e) { return reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async close({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins.');
    try {
      await sock.groupSettingUpdate(ctx.remoteJid, 'announcement');
      return reply(sock, msg, ctx, '🔒 Grupo fechado (só admins).');
    } catch (e) { return reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async todos({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Apenas admins.');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const mentions = meta.participants.map(p => p.id);
    let text = `📢 *${args.join(' ') || 'Atenção a todos!'}*\n\n`;
    meta.participants.forEach((p, i) => { text += `${i+1}. @${p.id.split('@')[0]}\n`; });
    await sock.sendMessage(ctx.remoteJid, { text, mentions });
  },

  // ============ DIVERSÃO ============
  async dado({ sock, msg, ctx }) {
    const n = Math.floor(Math.random() * 6) + 1;
    return reply(sock, msg, ctx, `🎲 Você tirou: *${n}*`);
  },

  async moeda({ sock, msg, ctx }) {
    const r = Math.random() > 0.5 ? '👑 Cara' : '🪙 Coroa';
    return reply(sock, msg, ctx, `🪙 *${r}*`);
  },

  async piada({ sock, msg, ctx }) {
    const piadas = [
      'O que o pato disse para a pata?\n— Vem quá!',
      'Por que o livro de matemática estava triste?\n— Porque tinha muitos problemas.',
      'O que o tomate foi fazer no banco?\n— Tirar extrato.',
      'Qual o doce preferido do físico?\n— Pi.',
      'O que a impressora disse para a outra?\n— Essa folha é sua ou é impressão minha?',
    ];
    return reply(sock, msg, ctx, `😂 ${piadas[Math.floor(Math.random()*piadas.length)]}`);
  },

  async frase({ sock, msg, ctx }) {
    const frases = [
      '💡 "O sucesso é a soma de pequenos esforços repetidos dia após dia." — R. Collier',
      '🌙 "Nas sombras encontramos a verdadeira luz." — Dark Net',
      '⚡ "Aja como se fosse impossível falhar." — Churchill',
      '🚀 "Comece onde você está. Use o que você tem. Faça o que você pode." — A. Ashe',
      '👑 "Seja você mesmo. Os outros já existem." — Oscar Wilde',
    ];
    return reply(sock, msg, ctx, frases[Math.floor(Math.random()*frases.length)]);
  },

  async ppt({ sock, msg, ctx, args }) {
    const opts = ['pedra', 'papel', 'tesoura'];
    const choice = args[0]?.toLowerCase();
    if (!opts.includes(choice)) return reply(sock, msg, ctx, '🎮 Use: !ppt pedra/papel/tesoura');
    const bot = opts[Math.floor(Math.random()*3)];
    let result = '🤝 Empate!';
    if ((choice==='pedra'&&bot==='tesoura')||(choice==='papel'&&bot==='pedra')||(choice==='tesoura'&&bot==='papel')) result = '🏆 Você venceu!';
    else if (choice !== bot) result = '💀 Você perdeu!';
    return reply(sock, msg, ctx, `🎮 Você: *${choice}*\n🤖 Bot: *${bot}*\n\n${result}`);
  },

  async gay({ sock, msg, ctx }) {
    const targets = getMentions(msg);
    const target = targets[0] || ctx.senderJid;
    const pct = Math.floor(Math.random()*101);
    await sock.sendMessage(ctx.remoteJid, {
      text: `🏳️‍🌈 @${target.split('@')[0]} é *${pct}%* gay!`,
      mentions: [target],
    }, { quoted: msg });
  },

  async casal({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Apenas em grupos.');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const parts = meta.participants;
    const a = parts[Math.floor(Math.random()*parts.length)].id;
    let b = parts[Math.floor(Math.random()*parts.length)].id;
    while (b === a && parts.length > 1) b = parts[Math.floor(Math.random()*parts.length)].id;
    await sock.sendMessage(ctx.remoteJid, {
      text: `💕 *Casal do dia* 💕\n\n@${a.split('@')[0]} 💖 @${b.split('@')[0]}\n\nCompatibilidade: *${Math.floor(Math.random()*101)}%*`,
      mentions: [a, b],
    }, { quoted: msg });
  },

  async ship({ sock, msg, ctx }) {
    const targets = getMentions(msg);
    if (targets.length < 2) return reply(sock, msg, ctx, '💕 Marque 2 usuários: !ship @a @b');
    const pct = Math.floor(Math.random()*101);
    await sock.sendMessage(ctx.remoteJid, {
      text: `💕 @${targets[0].split('@')[0]} + @${targets[1].split('@')[0]}\n\n❤️ Compatibilidade: *${pct}%*`,
      mentions: targets,
    }, { quoted: msg });
  },

  // ============ UTILITÁRIOS ============
  async qrcode({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📱 Use: !qrcode <texto>');
    const QR = require('qrcode');
    const buffer = await QR.toBuffer(args.join(' '), { width: 400 });
    await sock.sendMessage(ctx.remoteJid, { image: buffer, caption: '📱 Seu QR Code' }, { quoted: msg });
  },

  async calc({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🧮 Use: !calc 2+2*3');
    try {
      const expr = args.join('').replace(/[^0-9+\-*/().]/g, '');
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict";return (' + expr + ')')();
      return reply(sock, msg, ctx, `🧮 ${expr} = *${result}*`);
    } catch (e) { return reply(sock, msg, ctx, '❌ Expressão inválida'); }
  },

  async translate({ sock, msg, ctx, args }) {
    if (args.length < 2) return reply(sock, msg, ctx, '🌐 Use: !translate <idioma> <texto>\nEx: !translate en olá mundo');
    try {
      const lang = args.shift();
      const text = args.join(' ');
      const res = await mediaHandler.fetchJson(`https://api.popcat.xyz/translate?to=${lang}&text=${encodeURIComponent(text)}`);
      return reply(sock, msg, ctx, `🌐 *Tradução (${lang})*\n\n${res.translated || res.text || 'erro'}`);
    } catch (e) { return reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  // ============ VIP/PREMIUM ============
  async vip({ sock, msg, ctx, config }) {
    const text = `╭━〔 ⭐ *PREMIUM/VIP* 〕━╮
│
│ 🎯 Vantagens Premium:
│   ✅ Comandos exclusivos
│   ✅ Sem limite diário
│   ✅ Prioridade no atendimento
│   ✅ Stickers ilimitados
│   ✅ Downloads HD
│
│ 💰 Como contratar:
│ 📞 wa.me/${config.owner.number}
│
╰━━━━━━━━━━━━━━━━━━━╯`;
    return reply(sock, msg, ctx, text);
  },

  async premium(args) { return module.exports.vip(args); },

  // ============ DONO ============
  async broadcast({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Apenas o Dono.');
    if (!args.length) return reply(sock, msg, ctx, '📢 Use: !broadcast <mensagem>');
    const message = args.join(' ');
    try {
      const chats = await sock.groupFetchAllParticipating();
      const ids = Object.keys(chats);
      let count = 0;
      for (const id of ids) {
        try {
          await sock.sendMessage(id, { text: `📢 *BROADCAST - ${config.bot.name}*\n\n${message}\n\n_— ${config.owner.name}_` });
          count++;
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {}
      }
      return reply(sock, msg, ctx, `✅ Broadcast enviado para *${count}* grupos.`);
    } catch (e) { return reply(sock, msg, ctx, `❌ ${e.message}`); }
  },

  async setpremium({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Apenas o Dono.');
    const number = args[0]?.replace(/\D/g, '');
    const days = parseInt(args[1]) || 30;
    if (!number) return reply(sock, msg, ctx, '⭐ Use: !setpremium <número> [dias]');
    const until = new Date(Date.now() + days*24*60*60*1000);
    let user = await User.findOne({ whatsappNumber: number });
    if (!user) {
      user = await User.create({
        username: 'wa_' + number, password: Math.random().toString(36),
        name: 'WhatsApp ' + number, whatsappNumber: number,
        role: 'premium', premiumUntil: until,
      });
    } else {
      user.role = 'premium';
      user.premiumUntil = until;
      await user.save();
    }
    return reply(sock, msg, ctx, `⭐ ${number} é Premium até ${until.toLocaleDateString('pt-BR')}`);
  },

  async stats({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Apenas o Dono.');
    const users = await User.countDocuments();
    const premium = await User.countDocuments({ role: 'premium' });
    const cmds = await Command.countDocuments();
    const text = `╭━〔 📊 *STATS* 〕━╮
│ 👥 Usuários: ${users}
│ ⭐ Premium: ${premium}
│ ⚡ Comandos: ${cmds}
│ ⏱️ Uptime: ${formatUptime(Date.now()-startTime)}
│ 💾 RAM: ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB
╰━━━━━━━━━━━━━━━━╯`;
    return reply(sock, msg, ctx, text);
  },
};

function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function formatUptime(ms) {
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400);
  const h = Math.floor((s%86400)/3600);
  const m = Math.floor((s%3600)/60);
  const sec = s%60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}
