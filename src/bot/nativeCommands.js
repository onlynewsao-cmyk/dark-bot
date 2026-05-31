const Command = require('../database/models/Command');
const User = require('../database/models/User');
const Log = require('../database/models/Log');
const botConfigCache = require('./botConfigCache');
const mediaHandler = require('./mediaHandler');
const downloader = require('./downloader');
const stickerMaker = require('./stickerMaker');
const ai = require('./ai');
const config = require('../config');
const os = require('os');

const startTime = Date.now();

/** Adiciona rodapé do canal WhatsApp se configurado */
async function appendChannel(text) {
  try {
    const enabled = await botConfigCache.get('channel_enabled', false);
    if (!enabled) return text;
    const name = await botConfigCache.get('channel_name', '');
    const url = await botConfigCache.get('channel_url', '');
    if (!url) return text;
    return text + `\n\n╭───── ⌁ ─────╮\n│ 📢 *${name || 'Nosso Canal'}*\n│ ${url}\n╰───── ⌁ ─────╯`;
  } catch (e) { return text; }
}

const reply = async (sock, msg, ctx, text) => {
  const finalText = await appendChannel(text);
  return sock.sendMessage(ctx.remoteJid, { text: finalText }, { quoted: msg });
};
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });

/**
 * Envia áudio MP3 com card de descrição visível no WhatsApp.
 *
 * O WhatsApp exibe o card (capa + título + artista) apenas quando:
 *  1. contextInfo.externalAdReply está presente
 *  2. thumbnail é um Buffer JPEG válido (não vazio)
 *  3. mediaType = 1 (link) ou 4 (áudio)
 *
 * Se não conseguir baixar o thumbnail, envia o áudio simples com fileName.
 */
async function sendAudioWithCard(sock, msg, ctx, r) {
  const title    = r.title    || 'Áudio';
  const duration = r.duration || '';
  const author   = r.author   || '';
  const fileName = `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`;

  // Monta body (linha de info abaixo do título)
  const bodyParts = [];
  if (author)   bodyParts.push(`👤 ${author}`);
  if (duration) bodyParts.push(`⏱️ ${duration}`);
  const body = bodyParts.join('  •  ') || '🎵 DARK BOT';

  // Tenta baixar thumbnail
  let thumbBuf = null;
  if (r.thumb) {
    try {
      thumbBuf = await mediaHandler.fetchBuffer(r.thumb);
      // Valida que é uma imagem (JPEG/PNG começa com bytes específicos)
      if (!thumbBuf || thumbBuf.length < 100) thumbBuf = null;
    } catch { thumbBuf = null; }
  }

  const audioMsg = {
    audio:    { url: r.url },
    mimetype: 'audio/mpeg',
    fileName,
    ptt:      false,  // false = áudio comum (não nota de voz)
  };

  if (thumbBuf) {
    // Com thumbnail: exibe card com capa, título e artista
    audioMsg.contextInfo = {
      externalAdReply: {
        title,
        body,
        mediaType:  2,        // 2 = image/audio card
        thumbnail:  thumbBuf,
        mediaUrl:   '',
        sourceUrl:  '',
        renderLargerThumbnail: false,
      },
    };
  }

  await sock.sendMessage(ctx.remoteJid, audioMsg, { quoted: msg });
}

/** Envia menu com mídia (foto/vídeo/gif) se configurada */
async function sendMenuWithMedia(sock, msg, ctx, menuText, target = 'menu') {
  const mediaUrl = await botConfigCache.get(`menu_media_${target}_url`, '');
  const mediaType = await botConfigCache.get(`menu_media_${target}_type`, 'none');
  const finalText = await appendChannel(menuText);

  if (mediaUrl && mediaType !== 'none') {
    try {
      const buf = await mediaHandler.fetchBuffer(mediaUrl);
      if (mediaType === 'gif') {
        // GIF → MP4 com gifPlayback (animado no WhatsApp)
        return sock.sendMessage(ctx.remoteJid, {
          video: buf, gifPlayback: true, caption: finalText, mimetype: 'video/mp4',
        }, { quoted: msg });
      } else if (mediaType === 'video') {
        // Vídeo normal MP4
        return sock.sendMessage(ctx.remoteJid, {
          video: buf, caption: finalText, mimetype: 'video/mp4',
        }, { quoted: msg });
      } else {
        return sock.sendMessage(ctx.remoteJid, { image: buf, caption: finalText }, { quoted: msg });
      }
    } catch (e) {
      // Fallback para texto
    }
  }
  return sock.sendMessage(ctx.remoteJid, { text: finalText }, { quoted: msg });
}

/**
 * Envia vídeo por URL direta (sem baixar buffer) — mais rápido.
 * Usado para vídeos grandes (YouTube HD, TikTok, etc.)
 * Baileys aceita { video: { url } } e baixa internamente.
 */
async function sendVideoFromUrl(sock, jid, url, caption, quotedMsg) {
  return sock.sendMessage(jid, {
    video: { url },
    caption,
    mimetype: 'video/mp4',
  }, { quoted: quotedMsg });
}

/**
 * Formata informações do vídeo para legenda
 */
function videoCaption(title, quality, duration, extra = '') {
  let cap = `🎬 *${title}*`;
  if (quality) cap += `\n📺 Qualidade: *${quality}*`;
  if (duration) cap += `\n⏱️ Duração: ${duration}`;
  if (extra)    cap += `\n${extra}`;
  return cap;
}

async function isAdmin(sock, ctx) {
  if (!ctx.isGroup) return false;
  try {
    // Busca metadata fresca para garantir dados actualizados
    const meta = await sock.groupMetadata(ctx.remoteJid);
    // Compara por número base (sem device suffix) para compatibilidade multi-device
    const senderNum = ctx.senderJid?.split(':')[0].split('@')[0];
    const p = meta.participants.find(x =>
      x.id === ctx.senderJid ||
      x.id.split(':')[0].split('@')[0] === senderNum
    );
    return p?.admin === 'admin' || p?.admin === 'superadmin';
  } catch { return false; }
}
async function botIsAdmin(sock, ctx) {
  if (!ctx.isGroup) return false;
  try {
    // Sempre busca metadata fresca — nunca usa cache
    // O cache pode estar desactualizado se o bot foi promovido recentemente
    const meta = await sock.groupMetadata(ctx.remoteJid);

    // Normaliza o número do bot — Baileys usa "num:device@s.whatsapp.net"
    const botNum = (sock.user?.id || '').split(':')[0].split('@')[0];

    // Procura o bot nos participantes — compara apenas o número base
    const p = meta.participants.find(x =>
      x.id.split(':')[0].split('@')[0] === botNum
    );

    return p?.admin === 'admin' || p?.admin === 'superadmin';
  } catch { return false; }
}
function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}
function formatUptime(ms) {
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60);
  return `${d}d ${h}h ${m}m ${s%60}s`;
}
async function logCmd(name, ctx, success = true) {
  try {
    await Log.create({
      type: 'command', command: name, user: ctx.pushName,
      number: ctx.senderNumber, group: ctx.groupName || '', groupJid: ctx.isGroup ? ctx.remoteJid : '',
      success,
    });
  } catch (e) {}
}

module.exports = {
  // ============ INFO ============
  async menu({ sock, msg, ctx, config }) {
    const uptime = formatUptime(Date.now() - startTime);
    const userCount = await User.estimatedDocumentCount().catch(() => 0);
    const p = config.bot.prefix;

    const menu = `┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ⌁ *${config.bot.name}* ⌁
┃  ᴛʜᴇ ᴅᴀʀᴋ sɪᴅᴇ 🌑
┗━━━━━━━━━━━━━━━━━━━━━┛

╔══ ˚₊‧ 👤 ‧₊˚ ══╗
║ 👋 ${ctx.pushName}
║ 📱 ${ctx.senderNumber}
║ 💬 ${ctx.isGroup ? ctx.groupName : 'Privado'}
╚══════════════════╝

╔══ ˚₊‧ 🧠 ‧₊˚ ══╗
║ *ɪɴᴛᴇʟɪɢᴇ̂ɴᴄɪᴀ ᴀʀᴛɪꜰɪᴄɪᴀʟ*
║ ▹ ${p}ia ⌁ ${p}imagem ⌁ ${p}figura
╚══════════════════╝

╔══ ˚₊‧ 📥 ‧₊˚ ══╗
║ *ᴅᴏᴡɴʟᴏᴀᴅs*
║ ▹ ${p}play ⌁ ${p}play2 ⌁ ${p}play3 ⭐
║ ▹ ${p}video ⌁ ${p}video2
║ ▹ ${p}tiktok ⌁ ${p}instagram
║ ▹ ${p}fb ⌁ ${p}twitter
║ ▹ ${p}spotify ⌁ ${p}soundcloud
║ ▹ ${p}pinterest ⌁ ${p}mediafire
║ ▹ ${p}apk <app> ⌁ MOD APKs
╚══════════════════╝

╔══ ˚₊‧ 🎨 ‧₊˚ ══╗
║ *sᴛɪᴄᴋᴇʀs*
║ ▹ ${p}sticker ⌁ ${p}toimg
║ ▹ ${p}attp ⌁ ${p}ttp
╚══════════════════╝

╔══ ˚₊‧ 👥 ‧₊˚ ══╗
║ *ɢʀᴜᴘᴏs*
║ ▹ ${p}ban ⌁ ${p}promote ⌁ ${p}demote
║ ▹ ${p}link ⌁ ${p}revoke
║ ▹ ${p}open ⌁ ${p}close
║ ▹ ${p}todos ⌁ ${p}hidetag
║ ▹ ${p}antilink ⌁ ${p}antispam
║ ▹ ${p}welcome on/off
╚══════════════════╝

╔══ ˚₊‧ 💕 ‧₊˚ ══╗
║ *ɪɴᴛᴇʀᴀᴄ̧ᴏ̃ᴇs*
║ 🤗 ${p}abracar ⌁ ${p}beijar
║ 🥰 ${p}cafune ⌁ ${p}declarar
║ 😏 ${p}flertar ⌁ ${p}paparico
║ 💃 ${p}dancar
║ ┈┈┈┈┈┈┈┈┈┈┈┈┈
║ 👊 ${p}tapa ⌁ ${p}soco ⌁ ${p}chute
║ 🔫 ${p}tiro ⌁ ${p}facada ⌁ ${p}matar
║ 🤜 ${p}bater ⌁ ${p}morder
║ 🫸 ${p}empurrar ⌁ ${p}envenenar
║ 💥 ${p}espancar ⌁ ${p}bullying
║ ┈┈┈┈┈┈┈┈┈┈┈┈┈
║ 😭 ${p}mimimi ⌁ ${p}fofocar
║ ⏰ ${p}acordar ⌁ ${p}cuidar
║ 🙏 ${p}bencao ⌁ ${p}amaldicoar
╚══════════════════╝

╔══ ˚₊‧ 📊 ‧₊˚ ══╗
║ *ᴘᴇʀᴄᴇɴᴛᴜᴀɪs*
║ ▹ ${p}gay ⌁ ${p}lindo ⌁ ${p}feio
║ ▹ ${p}burro ⌁ ${p}corno ⌁ ${p}rico
║ ▹ ${p}safado ⌁ ${p}doido
║ ▹ ${p}gostoso ⌁ ${p}malucao
╚══════════════════╝

╔══ ˚₊‧ 👨‍👩‍👧 ‧₊˚ ══╗
║ *ꜰᴀᴍɪ́ʟɪᴀ*
║ ▹ ${p}casar ⌁ ${p}aceitar ⌁ ${p}recusar
║ ▹ ${p}divorciar ⌁ ${p}esposa
║ ▹ ${p}adotar ⌁ ${p}expulsar
║ ▹ ${p}familia
╚══════════════════╝

╔══ ˚₊‧ 💰 ‧₊˚ ══╗
║ *ᴇᴄᴏɴᴏᴍɪᴀ*
║ ▹ ${p}saldo ⌁ ${p}daily ⌁ ${p}trabalhar
║ ▹ ${p}crime ⌁ ${p}pedir ⌁ ${p}roubar
║ ▹ ${p}depositar ⌁ ${p}sacar
║ ▹ ${p}transferir ⌁ ${p}apostar
║ ▹ ${p}loja ⌁ ${p}comprar
║ ▹ ${p}inventario ⌁ ${p}usar
║ ▹ ${p}heal ⌁ ${p}ranking
╚══════════════════╝

╔══ ˚₊‧ 🎮 ‧₊˚ ══╗
║ *ᴊᴏɢᴏs*
║ ▹ ${p}forca ⌁ ${p}quiz ⌁ ${p}adivinha
║ ▹ ${p}blackjack ⌁ ${p}russa
║ ▹ ${p}verdade ⌁ ${p}desafio
║ ▹ ${p}bingo ⌁ ${p}cacapalavras
╚══════════════════╝

╔══ ˚₊‧ 📡 ‧₊˚ ══╗
║ *ɪɴᴛᴇʀɴᴇᴛ ɢʀᴀ́ᴛɪs*
║ ▹ ${p}atualizacoes ⌁ Novidades
║ ▹ ${p}configs ⌁ ${p}config <nº>
╚══════════════════╝

╔══ ˚₊‧ 🔓 ‧₊˚ ══╗
║ *ᴠᴘɴ ᴅᴇᴄʀʏᴘᴛᴇʀ* ⭐
║ ▹ ${p}decrypt (envie arquivo)
╚══════════════════╝

╔══ ˚₊‧ 🛠️ ‧₊˚ ══╗
║ *ᴜᴛɪʟɪᴛᴀ́ʀɪᴏs*
║ ▹ ${p}ping ⌁ ${p}info ⌁ ${p}id
║ ▹ ${p}jid ⌁ copia JID em PV 🔒
║ ▹ ${p}dono ⌁ ${p}perfil
║ ▹ ${p}qrcode ⌁ ${p}calc
║ ▹ ${p}translate ⌁ ${p}clima
║ ▹ ${p}encurtar
╚══════════════════╝

╔══ ˚₊‧ ⭐ ‧₊˚ ══╗
║ *ᴘʀᴇᴍɪᴜᴍ*
║ ▹ ${p}vip ⌁ ${p}assinar ⌁ ${p}meuplano
╚══════════════════╝

> ⌁ *${config.bot.name}* · ${config.owner.name}
> 👑 ${config.owner.number} · ⏱️ ${uptime}
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴀʀᴋ ᴇɴɢɪɴᴇ ⚡`;

    await sendMenuWithMedia(sock, msg, ctx, menu, 'menu');
    logCmd('menu', ctx);
  },

  async ping({ sock, msg, ctx, config }) {
    const t = Date.now();
    const sent = await reply(sock, msg, ctx, '🏓 Calculando...');
    await sock.sendMessage(ctx.remoteJid, {
      text: `🏓 *Pong!*\n\n⚡ Latência: *${Date.now()-t}ms*\n🤖 ${config.bot.name} ativo!`,
      edit: sent.key,
    }).catch(() => reply(sock, msg, ctx, `🏓 ${Date.now()-t}ms`));
    logCmd('ping', ctx);
  },

  async dono({ sock, msg, ctx, config }) {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.owner.name}\nORG:${config.bot.name};\nTEL;type=CELL;type=VOICE;waid=${config.owner.number}:+${config.owner.number}\nEND:VCARD`;
    await sock.sendMessage(ctx.remoteJid, { contacts: { displayName: config.owner.name, contacts: [{ vcard }] } }, { quoted: msg });
    await reply(sock, msg, ctx, `👑 *DONO:* ${config.owner.name}\n📞 wa.me/${config.owner.number}\n🌙 _The Dark Side_`);
    logCmd('dono', ctx);
  },

  async info({ sock, msg, ctx, config }) {
    const ram = `${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`;
    const text = `╭━━〔 *${config.bot.name}* 〕━━╮
│ 🤖 Bot: ${config.bot.name}
│ 👑 Dono: ${config.owner.name}
│ 📞 +${config.owner.number}
│ 🌐 Node: ${process.version}
│ 💾 RAM: ${ram}
│ ⏱️ Uptime: ${formatUptime(Date.now()-startTime)}
│ 🖥️ ${os.platform()} ${os.arch()}
╰━━━━━━━━━━━━━━━━╯`;
    return reply(sock, msg, ctx, text);
  },

  async id({ sock, msg, ctx }) {
    return reply(sock, msg, ctx, `🆔 *INFORMAÇÕES*\n\n👤 Você: ${ctx.senderNumber}\n💬 Chat: ${ctx.remoteJid}\n${ctx.isGroup ? '👥 Grupo: ' + ctx.groupName : '📱 Privado'}`);
  },

  /**
   * !jid — Envia o JID do utilizador/grupo em PV (apenas para o remetente ver).
   * Ninguém no grupo sabe que recebeu. O utilizador copia da conversa privada com o bot.
   *
   * Uso:
   *   !jid          → envia SEU JID e o JID do chat em PV
   *   !jid @alguem  → envia o JID do marcado em PV (só para quem enviou o comando)
   */
  async jid({ sock, msg, ctx }) {
    const pvJid = ctx.senderJid; // JID da conversa privada com o remetente

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target   = mentions[0] || null;

    // Constrói o texto com JIDs para copiar
    let text = `╔══ ˚₊‧ 🆔 ‧₊˚ ══╗\n║ *SEUS JIDs*\n║\n`;
    text += `║ 👤 *Seu JID:*\n║ \`${pvJid}\`\n║\n`;
    text += `║ 📱 *Seu número:*\n║ \`${ctx.senderNumber}\`\n║\n`;

    if (ctx.isGroup) {
      text += `║ 👥 *JID do grupo:*\n║ \`${ctx.remoteJid}\`\n║\n`;
    }

    if (target) {
      text += `║ 🎯 *JID marcado:*\n║ \`${target}\`\n║\n`;
      text += `║ 📱 *Número marcado:*\n║ \`${target.split('@')[0]}\`\n║\n`;
    }

    text += `╚══════════════════╝\n`;
    text += `> 💡 _Toque e segure o número/JID para copiar_\n`;
    text += `> 🔒 _Apenas você recebeu esta mensagem_`;

    // Envia APENAS em PV — invisível para o grupo
    try {
      await sock.sendMessage(pvJid, { text });
    } catch (e) {
      // Fallback: envia no chat atual se não conseguir abrir PV
      return reply(sock, msg, ctx, text);
    }

    // No grupo: reage com ✅ silenciosamente para confirmar sem revelar conteúdo
    if (ctx.isGroup) {
      await sock.sendMessage(ctx.remoteJid, {
        react: { text: '✅', key: msg.key },
      }).catch(() => {});
    }
  },

  async perfil({ sock, msg, ctx }) {
    const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
    const role = user?.role === 'owner' ? '👑 Dono' : user?.role === 'premium' ? '⭐ Premium' : '🆓 Free';
    return reply(sock, msg, ctx, `╭━〔 👤 *SEU PERFIL* 〕━╮
│ 📛 ${ctx.pushName}
│ 📱 +${ctx.senderNumber}
│ 🏷️ ${role}
│ ⚡ ${user?.commandsUsed || 0} cmds usados
${user?.premiumUntil ? `│ ⏳ Premium até ${new Date(user.premiumUntil).toLocaleDateString('pt-BR')}` : ''}
╰━━━━━━━━━━━━━━━╯`);
  },

  // ============ IA ============
  async ia({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🧠 Use: !ia <sua pergunta>');
    await react(sock, msg, '🤔');
    try {
      const answer = await ai.chat(args.join(' '));
      await react(sock, msg, '✅');
      return reply(sock, msg, ctx, `🧠 *IA responde:*\n\n${answer}`);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ ' + e.message);
    }
  },

  async gpt(args) { return module.exports.ia(args); },

  async imagem({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🎨 Use: !imagem <descrição>');
    await react(sock, msg, '🎨');
    try {
      const buf = await ai.generateImage(args.join(' '));
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: `🎨 ${args.join(' ')}` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ ' + e.message);
    }
  },

  async figura({ sock, msg, ctx, args, config }) {
    if (!args.length) return reply(sock, msg, ctx, '✨ Use: !figura <descrição>');
    await react(sock, msg, '🎨');
    try {
      const buf = await ai.generateImage(args.join(' '));
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'Privado', isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, '❌ ' + e.message);
    }
  },

  // ============ DOWNLOADS ============

  /** Envia áudio com card de descrição visível no WhatsApp */
  // Nota interna: o WhatsApp só exibe metadados em áudio via contextInfo.externalAdReply
  // com thumbnail real (buffer JPEG). Sem thumbnail, o card não aparece.

  async play({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎵 *!play* — Download áudio do YouTube (MP3)\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!play nome da música`\n' +
      '  • `!play https://youtube.com/...`\n\n' +
      '💡 Alternativas: *!play2* (SaveFrom) · *!play3* (auto) · *!soundcloud*');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.youtubeAudio(args.join(' '));
      await sendAudioWithCard(sock, msg, ctx, r);
      await react(sock, msg, '✅');
      logCmd('play', ctx);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ *Download falhou*\n\n${e.message}\n\n💡 Tente: *!play2 ${args.join(' ')}* ou *!play3 ${args.join(' ')}*`);
    }
  },

  async play2({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎵 *!play2* — Download áudio YouTube via SaveFrom\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!play2 nome da música`\n' +
      '  • `!play2 https://youtube.com/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.youtubeAudioSavefrom(args.join(' '));
      await sendAudioWithCard(sock, msg, ctx, r);
      await react(sock, msg, '✅');
      logCmd('play2', ctx);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}\n\n💡 Tente: *!play3 ${args.join(' ')}*`);
    }
  },

  async play3({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎵 *!play3* — Download automático YouTube + SoundCloud\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!play3 nome da música`\n\n' +
      '💡 Tenta múltiplas fontes automaticamente');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.youtubeAudioAuto(args.join(' '));
      await sendAudioWithCard(sock, msg, ctx, r);
      await react(sock, msg, '✅');
      logCmd('play3', ctx);
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}`);
    }
  },

  async video({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎬 *!video* — Download YouTube em HD (720p)\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!video nome da música`\n' +
      '  • `!video https://youtube.com/...`\n\n' +
      '💡 Para Full HD (1080p) use *!video2*');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.youtubeVideo(args.join(' '));
      const cap = videoCaption(r.title, r.quality || '720p', r.duration);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, cap, msg);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, `❌ ${e.message}\n\n💡 Tente: *!video2* ou *!play* (só áudio)`); }
  },

  async video2({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎬 *!video2* — Download YouTube Full HD (1080p)\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!video2 nome do vídeo`\n' +
      '  • `!video2 https://youtube.com/...`\n\n' +
      '⚠️ Pode demorar mais por ser Full HD');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.youtubeVideoSavefrom(args.join(' '));
      const cap = videoCaption(r.title, r.quality || '1080p', r.duration);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, cap, msg);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, `❌ ${e.message}\n\n💡 Tente: *!video* (720p)`); }
  },

  async tiktok({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎵 *!tiktok* — Download TikTok sem marca d\'água\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!tiktok https://vm.tiktok.com/...`\n' +
      '  • `!tiktok https://www.tiktok.com/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.tiktok(args[0]);
      const cap = `🎵 *${r.title || 'TikTok'}*\n📺 Sem marca d'água`;
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, cap, msg);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async instagram({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '📸 *!instagram* — Download Instagram\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!instagram https://www.instagram.com/p/...`\n' +
      '  • `!instagram https://www.instagram.com/reel/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.instagram(args[0]);
      if (r.type === 'video') {
        await sendVideoFromUrl(sock, ctx.remoteJid, r.url, '📸 *Instagram*', msg);
      } else {
        await sock.sendMessage(ctx.remoteJid, { image: { url: r.url }, caption: '📸 *Instagram*' }, { quoted: msg });
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async fb({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '📘 *!fb* — Download Facebook\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!fb https://www.facebook.com/...`\n' +
      '  • `!fb https://fb.watch/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.facebook(args[0]);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, '📘 *Facebook*', msg);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async twitter({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🐦 *!twitter* — Download X / Twitter\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!twitter https://x.com/...`\n' +
      '  • `!twitter https://twitter.com/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.twitter(args[0]);
      await sendVideoFromUrl(sock, ctx.remoteJid, r.url, '🐦 *X / Twitter*', msg);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async spotify({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '🎧 *!spotify* — Download Spotify\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!spotify https://open.spotify.com/track/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.spotify(args[0]);
      r.author = r.author || 'Spotify';
      await sendAudioWithCard(sock, msg, ctx, r);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async soundcloud({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx,
      '☁️ *!soundcloud* — Download SoundCloud\n\n' +
      '📝 *Como usar:*\n' +
      '  • `!soundcloud nome da música`\n' +
      '  • `!soundcloud https://soundcloud.com/...`');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.soundcloud(args.join(' '));
      r.title  = r.title  || 'SoundCloud';
      r.author = r.author || 'SoundCloud';
      await sendAudioWithCard(sock, msg, ctx, r);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async pinterest({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📌 Use: !pinterest <link ou busca>');
    await react(sock, msg, '⏳');
    try {
      const isUrl = /^https?:\/\//.test(args[0]);
      const r = isUrl ? await downloader.pinterest(args[0]) : await downloader.pinterestSearch(args.join(' '));
      await sock.sendMessage(ctx.remoteJid, { image: { url: r.url }, caption: '📌 Pinterest' }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ============ MEDIAFIRE ============
  async mediafire({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📁 Use: !mediafire <link do MediaFire>');
    await react(sock, msg, '⏳');
    try {
      const r = await downloader.mediafire(args[0]);
      // Tenta enviar como documento
      try {
        const buf = await mediaHandler.fetchBuffer(r.url);
        await sock.sendMessage(ctx.remoteJid, {
          document: buf, fileName: r.title, mimetype: 'application/octet-stream',
          caption: `📁 *${r.title}*${r.size ? '\n📦 ' + r.size : ''}`,
        }, { quoted: msg });
      } catch (e) {
        // Se ficheiro muito grande, envia link direto
        await reply(sock, msg, ctx, `📁 *${r.title}*${r.size ? '\n📦 ' + r.size : ''}\n\n🔗 ${r.url}`);
      }
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ============ MOD APK (LiteAPKs) ============
  async apk({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📱 Use: !apk <nome do app>\n\n_Busca MOD APKs no LiteAPKs_');
    await react(sock, msg, '🔍');
    try {
      const results = await downloader.liteapks(args.join(' '));
      let text = `╔══ ˚₊‧ 📱 ‧₊˚ ══╗\n║ *ᴍᴏᴅ ᴀᴘᴋ*\n║ 🔍 "${args.join(' ')}"\n╚══════════════════╝\n`;
      results.forEach((r, i) => {
        text += `\n*${i + 1}.* ${r.name}\n  ┊ 🌐 _${r.source || 'MOD'}_\n  ┊ 🔗 ${r.url}\n`;
      });
      text += `\n> 💡 _Clique no link para baixar o APK_`;
      await reply(sock, msg, ctx, text);
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },
  async modapk(a) { return module.exports.apk(a); },

  // ============ STICKER ============
  async sticker({ sock, msg, ctx, config }) {
    // Detecta mídia direta ou em citação
    const m = msg.message;
    const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;

    const srcMsg = (m?.imageMessage || m?.videoMessage || m?.stickerMessage)
      ? msg
      : (quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage)
        ? { message: quoted }
        : null;

    if (!srcMsg) return reply(sock, msg, ctx, '🎨 Envie ou responda uma *foto*, *vídeo* ou *GIF* com *!sticker*');

    const isVid = !!(srcMsg.message?.videoMessage || quoted?.videoMessage);
    const isGif = srcMsg.message?.videoMessage?.gifPlayback || quoted?.videoMessage?.gifPlayback;

    await react(sock, msg, '⏳');
    try {
      const buffer = await mediaHandler.downloadFromMessage(srcMsg);
      const { detectMime } = require('./stickerMaker');
      const mime = detectMime(buffer);
      const isAnimated = isVid || isGif || mime === 'image/gif' || mime === 'video/mp4' || mime === 'video/webm';

      const stk = await stickerMaker.create(buffer, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'Privado',
        isVideo: isAnimated,
      });

      if (!stk || stk.length < 50) throw new Error('Sticker vazio — tente com outra mídia');
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) {
      await react(sock, msg, '❌');
      return reply(sock, msg, ctx, `❌ ${e.message}`);
    }
  },

  async toimg({ sock, msg, ctx }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.stickerMessage) return reply(sock, msg, ctx, '🖼️ Responda um *sticker* com *!toimg*');
    await react(sock, msg, '⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage({ message: quoted });
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: '🖼️ Sticker convertido!' }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (e) { await react(sock, msg, '❌'); return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async attp({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '✍️ Use: !attp <texto>');
    try {
      const buf = await mediaHandler.fetchBuffer(`https://api.popcat.xyz/attp?text=${encodeURIComponent(args.join(' '))}`);
      await sock.sendMessage(ctx.remoteJid, { sticker: buf }, { quoted: msg });
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async ttp({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '✍️ Use: !ttp <texto>');
    try {
      const buf = await mediaHandler.fetchBuffer(`https://api.popcat.xyz/texttoimage?text=${encodeURIComponent(args.join(' '))}`);
      await sock.sendMessage(ctx.remoteJid, { sticker: buf }, { quoted: msg });
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ============ GRUPOS ============
  async ban({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    const t = getMentions(msg);
    if (!t.length) return reply(sock, msg, ctx, '🎯 Marque alguém');
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, t, 'remove');
      await reply(sock, msg, ctx, `✅ Banido(s): ${t.length}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },
  async kick(a) { return module.exports.ban(a); },

  async promote({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    const t = getMentions(msg);
    if (!t.length) return reply(sock, msg, ctx, '🎯 Marque alguém');
    try { await sock.groupParticipantsUpdate(ctx.remoteJid, t, 'promote'); return reply(sock, msg, ctx, '👑 Promovido!'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async demote({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    const t = getMentions(msg);
    if (!t.length) return reply(sock, msg, ctx, '🎯 Marque alguém');
    try { await sock.groupParticipantsUpdate(ctx.remoteJid, t, 'demote'); return reply(sock, msg, ctx, '⬇️ Rebaixado'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async grupo({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    return reply(sock, msg, ctx, `╭━〔 *INFO GRUPO* 〕━╮
│ 📛 ${meta.subject}
│ 🆔 ${meta.id}
│ 👥 ${meta.participants.length} membros
│ 👑 ${meta.participants.filter(p=>p.admin).length} admins
│ 📅 ${meta.creation ? new Date(meta.creation*1000).toLocaleDateString('pt-BR') : '?'}
│ 📝 ${meta.desc || 'sem desc'}
╰━━━━━━━━━━━━━━━━━╯`);
  },

  async link({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    try { const c = await sock.groupInviteCode(ctx.remoteJid); return reply(sock, msg, ctx, `🔗 https://chat.whatsapp.com/${c}`); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async revoke({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    if (!(await botIsAdmin(sock, ctx))) return reply(sock, msg, ctx, '⚠️ Preciso ser admin');
    try { await sock.groupRevokeInvite(ctx.remoteJid); return reply(sock, msg, ctx, '🔄 Link resetado'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async open({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    try { await sock.groupSettingUpdate(ctx.remoteJid, 'not_announcement'); return reply(sock, msg, ctx, '🔓 Aberto'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async close({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    try { await sock.groupSettingUpdate(ctx.remoteJid, 'announcement'); return reply(sock, msg, ctx, '🔒 Fechado'); }
    catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async todos({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const mentions = meta.participants.map(p => p.id);
    let text = `📢 *${args.join(' ') || 'Atenção!'}*\n\n`;
    meta.participants.forEach((p,i) => { text += `${i+1}. @${p.id.split('@')[0]}\n`; });
    await sock.sendMessage(ctx.remoteJid, { text, mentions });
  },

  async hidetag({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    await sock.sendMessage(ctx.remoteJid, {
      text: args.join(' ') || '📢 Atenção!',
      mentions: meta.participants.map(p => p.id),
    });
  },

  async antilink({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const on = args[0]?.toLowerCase() === 'on';
    await botConfigCache.set('antilink_enabled', on);
    return reply(sock, msg, ctx, on ? '✅ Anti-link ATIVADO' : '❌ Anti-link DESATIVADO');
  },

  async antispam({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const on = args[0]?.toLowerCase() === 'on';
    await botConfigCache.set('antispam_enabled', on);
    return reply(sock, msg, ctx, on ? '✅ Anti-spam ATIVADO' : '❌ Anti-spam DESATIVADO');
  },

  async welcome({ sock, msg, ctx, args }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    if (!(await isAdmin(sock, ctx))) return reply(sock, msg, ctx, '🚫 Só admins');
    const on = args[0]?.toLowerCase() === 'on';
    await botConfigCache.set('welcome_enabled', on);
    return reply(sock, msg, ctx, on ? '✅ Boas-vindas ATIVADAS' : '❌ Boas-vindas DESATIVADAS');
  },

  // ============ DIVERSÃO ============
  async dado({ sock, msg, ctx }) { return reply(sock, msg, ctx, `🎲 ${Math.floor(Math.random()*6)+1}`); },
  async moeda({ sock, msg, ctx }) { return reply(sock, msg, ctx, Math.random()>0.5 ? '🪙 *Cara*' : '🪙 *Coroa*'); },

  async piada({ sock, msg, ctx }) {
    const p = [
      'Por que o livro de mat estava triste?\n— Muitos problemas.',
      'O que o pato disse à pata?\n— Vem quá!',
      'O que a impressora disse à outra?\n— Essa folha é sua ou é impressão minha?',
      'Qual o doce preferido do físico?\n— Pi.',
      'O tomate foi ao banco fazer o quê?\n— Tirar extrato.',
    ];
    return reply(sock, msg, ctx, `😂 ${p[Math.floor(Math.random()*p.length)]}`);
  },

  async frase({ sock, msg, ctx }) {
    const f = [
      '💡 "O sucesso é a soma de pequenos esforços." — R. Collier',
      '🌙 "Nas sombras encontramos a verdadeira luz." — Dark Net',
      '⚡ "Aja como se fosse impossível falhar." — Churchill',
      '🚀 "Comece onde está. Use o que tem. Faça o que pode." — A. Ashe',
    ];
    return reply(sock, msg, ctx, f[Math.floor(Math.random()*f.length)]);
  },

  async ppt({ sock, msg, ctx, args }) {
    const opts = ['pedra','papel','tesoura'];
    const c = args[0]?.toLowerCase();
    if (!opts.includes(c)) return reply(sock, msg, ctx, '🎮 Use: !ppt pedra/papel/tesoura');
    const b = opts[Math.floor(Math.random()*3)];
    let r = '🤝 Empate';
    if ((c==='pedra'&&b==='tesoura')||(c==='papel'&&b==='pedra')||(c==='tesoura'&&b==='papel')) r = '🏆 Venceu!';
    else if (c !== b) r = '💀 Perdeu';
    return reply(sock, msg, ctx, `Você: *${c}*\nBot: *${b}*\n\n${r}`);
  },

  async gay({ sock, msg, ctx }) {
    const t = getMentions(msg)[0] || ctx.senderJid;
    await sock.sendMessage(ctx.remoteJid, { text: `🏳️‍🌈 @${t.split('@')[0]} é *${Math.floor(Math.random()*101)}%* gay!`, mentions: [t] }, { quoted: msg });
  },

  async casal({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const p = meta.participants;
    const a = p[Math.floor(Math.random()*p.length)].id;
    let b = p[Math.floor(Math.random()*p.length)].id;
    while (b===a && p.length>1) b = p[Math.floor(Math.random()*p.length)].id;
    await sock.sendMessage(ctx.remoteJid, {
      text: `💕 *Casal do dia*\n\n@${a.split('@')[0]} 💖 @${b.split('@')[0]}\nCompatibilidade: *${Math.floor(Math.random()*101)}%*`,
      mentions: [a,b],
    }, { quoted: msg });
  },

  async ship({ sock, msg, ctx }) {
    const t = getMentions(msg);
    if (t.length < 2) return reply(sock, msg, ctx, '💕 Marque 2: !ship @a @b');
    await sock.sendMessage(ctx.remoteJid, {
      text: `💕 @${t[0].split('@')[0]} + @${t[1].split('@')[0]}\n❤️ ${Math.floor(Math.random()*101)}%`,
      mentions: t,
    }, { quoted: msg });
  },

  async roleta({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const p = meta.participants;
    const chosen = p[Math.floor(Math.random()*p.length)].id;
    await sock.sendMessage(ctx.remoteJid, { text: `🎰 *ROLETA*\n\nO escolhido foi: @${chosen.split('@')[0]} 🎉`, mentions: [chosen] }, { quoted: msg });
  },

  async fofoca({ sock, msg, ctx }) {
    if (!ctx.isGroup) return reply(sock, msg, ctx, '👥 Só em grupos');
    const meta = ctx.groupMeta || (await sock.groupMetadata(ctx.remoteJid));
    const p = meta.participants;
    const a = p[Math.floor(Math.random()*p.length)].id;
    let b = p[Math.floor(Math.random()*p.length)].id;
    while (b===a && p.length>1) b = p[Math.floor(Math.random()*p.length)].id;
    const fofs = [
      'está apaixonado(a) por', 'foi visto(a) com', 'mandou indireta para',
      'está stalkeando', 'ficou de vez com', 'tem um caso secreto com',
    ];
    await sock.sendMessage(ctx.remoteJid, {
      text: `🤫 *FOFOCA*\n\nDizem que @${a.split('@')[0]} ${fofs[Math.floor(Math.random()*fofs.length)]} @${b.split('@')[0]}!`,
      mentions: [a,b],
    }, { quoted: msg });
  },

  // ============ UTILS ============
  async qrcode({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '📱 Use: !qrcode <texto>');
    const QR = require('qrcode');
    const buf = await QR.toBuffer(args.join(' '), { width: 400 });
    await sock.sendMessage(ctx.remoteJid, { image: buf, caption: '📱 QR Code' }, { quoted: msg });
  },

  async calc({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🧮 Use: !calc 2+2');
    try {
      const e = args.join('').replace(/[^0-9+\-*/().]/g,'');
      const r = Function('"use strict";return ('+e+')')();
      return reply(sock, msg, ctx, `🧮 ${e} = *${r}*`);
    } catch { return reply(sock, msg, ctx, '❌ Expr inválida'); }
  },

  async translate({ sock, msg, ctx, args }) {
    if (args.length < 2) return reply(sock, msg, ctx, '🌐 !translate <lang> <texto>');
    try {
      const lang = args.shift();
      const r = await mediaHandler.fetchJson(`https://api.popcat.xyz/translate?to=${lang}&text=${encodeURIComponent(args.join(' '))}`);
      return reply(sock, msg, ctx, `🌐 *${lang}*\n\n${r.translated || r.text || 'erro'}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async clima({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '☀️ Use: !clima <cidade>');
    try {
      const r = await mediaHandler.fetchJson(`https://wttr.in/${encodeURIComponent(args.join(' '))}?format=j1&lang=pt`);
      const c = r.current_condition[0];
      return reply(sock, msg, ctx, `☀️ *Clima em ${args.join(' ')}*\n\n🌡️ Temp: ${c.temp_C}°C (sente ${c.FeelsLikeC}°C)\n💧 Umidade: ${c.humidity}%\n💨 Vento: ${c.windspeedKmph} km/h\n☁️ ${c.lang_pt?.[0]?.value || c.weatherDesc[0].value}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async encurtar({ sock, msg, ctx, args }) {
    if (!args.length) return reply(sock, msg, ctx, '🔗 Use: !encurtar <url>');
    try {
      const r = await mediaHandler.fetchBuffer(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args[0])}`);
      return reply(sock, msg, ctx, `🔗 Encurtado:\n${r.toString('utf-8')}`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  // ============ VIP/PREMIUM ============
  async vip({ sock, msg, ctx, config }) {
    return reply(sock, msg, ctx, `╭━〔 ⭐ *VIP/PREMIUM* 〕━╮
│
│ 🎯 Vantagens:
│   ✅ Comandos exclusivos
│   ✅ Sem limite
│   ✅ Prioridade
│   ✅ Stickers ilimitados
│   ✅ Downloads HD
│   ✅ IA premium
│
│ 💎 Planos:
│   • 1 mês — *1.500 Kz*
│   • 3 meses — *4.000 Kz*
│   • 6 meses — *7.500 Kz*
│   • 1 ano — *14.000 Kz*
│   • Vitalício — *30.000 Kz*
│
│ 💳 Para assinar:
│   ${config.bot.prefix}assinar
│
│ 📞 wa.me/${config.owner.number}
│
╰━━━━━━━━━━━━━━━━━━━╯`);
  },

  async assinar({ sock, msg, ctx, config }) {
    return reply(sock, msg, ctx, `💎 *COMO ASSINAR PREMIUM*

1️⃣ Escolha um plano em ${config.bot.prefix}vip
2️⃣ Faça pagamento (Multicaixa Express, Pix, Unitel Money):

📱 *Multicaixa Express:*
   Número: +${config.owner.number}
   Nome: ${config.owner.name}

3️⃣ Acesse o dashboard:
   ${process.env.APP_URL || 'https://dark-bot.onrender.com'}
   
4️⃣ Crie/faça login na sua conta
5️⃣ Vá em "Assinatura Premium" e envie o comprovante

⏱️ Aprovação em até 24h
📞 wa.me/${config.owner.number}`);
  },

  async meuplano({ sock, msg, ctx }) {
    const u = await User.findOne({ whatsappNumber: ctx.senderNumber });
    if (!u) return reply(sock, msg, ctx, '🆓 Você ainda não tem conta. Acesse o dashboard!');
    if (u.role === 'owner') return reply(sock, msg, ctx, '👑 Você é o DONO!');
    if (u.role === 'premium' && u.isPremium()) {
      return reply(sock, msg, ctx, `⭐ *PREMIUM ATIVO*\n\n⏳ Válido até: ${new Date(u.premiumUntil).toLocaleDateString('pt-BR')}\n📊 Comandos: ${u.commandsUsed}`);
    }
    return reply(sock, msg, ctx, '🆓 Você é Free. Use !vip para conhecer os planos.');
  },

  // ============ DONO ============
  async broadcast({ sock, msg, ctx, args, isOwner, config }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    if (!args.length) return reply(sock, msg, ctx, '📢 Use: !broadcast <msg>');
    const message = args.join(' ');
    try {
      const chats = await sock.groupFetchAllParticipating();
      const ids = Object.keys(chats);
      let count = 0;
      for (const id of ids) {
        try {
          await sock.sendMessage(id, { text: `📢 *BROADCAST*\n\n${message}\n\n_— ${config.owner.name}_` });
          count++;
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {}
      }
      return reply(sock, msg, ctx, `✅ Enviado para *${count}* grupos`);
    } catch (e) { return reply(sock, msg, ctx, '❌ ' + e.message); }
  },

  async setpremium({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    const num = args[0]?.replace(/\D/g,'');
    const days = parseInt(args[1]) || 30;
    if (!num) return reply(sock, msg, ctx, '⭐ Use: !setpremium <num> [dias]');
    const until = new Date(Date.now() + days*86400000);
    let u = await User.findOne({ whatsappNumber: num });
    if (!u) {
      u = await User.create({
        username: 'wa_'+num, password: Math.random().toString(36),
        name: 'WhatsApp '+num, whatsappNumber: num,
        role: 'premium', premiumUntil: until,
      });
    } else { u.role='premium'; u.premiumUntil=until; await u.save(); }
    return reply(sock, msg, ctx, `⭐ ${num} é Premium até ${until.toLocaleDateString('pt-BR')}`);
  },

  async blacklist({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    const num = args[0]?.replace(/\D/g,'');
    if (!num) return reply(sock, msg, ctx, '🚫 Use: !blacklist <num>');
    const bl = await botConfigCache.get('blacklist', []);
    if (!bl.includes(num)) bl.push(num);
    await botConfigCache.set('blacklist', bl);
    return reply(sock, msg, ctx, `🚫 ${num} bloqueado`);
  },

  async unblacklist({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    const num = args[0]?.replace(/\D/g,'');
    let bl = await botConfigCache.get('blacklist', []);
    bl = bl.filter(x => x !== num);
    await botConfigCache.set('blacklist', bl);
    return reply(sock, msg, ctx, `✅ ${num} desbloqueado`);
  },

  async stats({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    const users = await User.countDocuments();
    const premium = await User.countDocuments({ role: 'premium' });
    const cmds = await Command.countDocuments();
    const logs = await Log.countDocuments({ createdAt: { $gte: new Date(Date.now()-86400000) } });
    return reply(sock, msg, ctx, `╭━〔 📊 *STATS* 〕━╮
│ 👥 Usuários: ${users}
│ ⭐ Premium: ${premium}
│ ⚡ Comandos DB: ${cmds}
│ 📊 Cmds 24h: ${logs}
│ ⏱️ Up: ${formatUptime(Date.now()-startTime)}
│ 💾 RAM: ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB
╰━━━━━━━━━━━━━━━━╯`);
  },

  async agendar({ sock, msg, ctx, args, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    return reply(sock, msg, ctx, `📅 *Agendamento*\n\nUse o dashboard para agendar mensagens:\n${process.env.APP_URL || 'https://dark-bot.onrender.com'}/dashboard/schedule`);
  },

  async backup({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    return reply(sock, msg, ctx, `💾 Use o dashboard para backup:\n${process.env.APP_URL || ''}/dashboard/backup`);
  },

  async restart({ sock, msg, ctx, isOwner }) {
    if (!isOwner) return reply(sock, msg, ctx, '🚫 Só Dono');
    await reply(sock, msg, ctx, '🔄 Reiniciando em 3s...');
    setTimeout(() => process.exit(0), 3000); // Render reinicia automaticamente
  },

  async decrypt({ sock, msg, ctx, config }) {
    const p = config.bot.prefix;
    return reply(sock, msg, ctx,
`╭━━〔 🔓 *VPN DECRYPTER* 〕━━╮
│
│ 🎯 *Como usar — 3 formas:*
│
│ 1️⃣ *Enviar URI directo no chat:*
│   \`bdnet://4f07...\`
│   \`apna://4f07...\`
│   \`apnalite://4f07...\`
│   \`vmess://eyJ...\`
│
│ 2️⃣ *Com comando + URI:*
│   \`${p}vpn bdnet://4f07...\`
│   \`${p}vpn apna://4f07...\`
│   \`${p}decrypt vmess://...\`
│
│ 3️⃣ *Enviar ficheiro como doc:*
│   Anexa o ficheiro e escreve
│   \`${p}decrypt\` na legenda
│
│ 📁 *Ficheiros suportados:*
│ • .ehi / .ehic — HTTP Injector
│ • .hat          — HA Tunnel Plus
│ • .npv4/.npv7/.npv8 — NPV Tunnel
│ • .dark         — DarkTunnel
│ • .any          — AnyTunnel
│ • .tls          — TLS Tunnel
│ • .nm / .nmess  — NetMod
│ • .conf         — WireGuard
│ • .ovpn         — OpenVPN
│ • .ssh / .ssl   — SSH Direct
│ • .json         — V2Ray/Xray
│ • .txt          — vmess/vless/trojan/ss
│
│ 📲 *URIs suportadas (texto):*
│ • \`bdnet://\`  — BD Net VPN
│ • \`apna://\`   — APNA Tunnel Lite
│ • \`apnalite://\` — APNA Lite
│ • \`vmess://\`  — V2Ray/VMess
│ • \`vless://\`  — VLess
│ • \`trojan://\` — Trojan
│ • \`ss://\`     — Shadowsocks
│ • \`ssh://\`    — SSH
│ • \`hysteria://\` — Hysteria2
│
│ 🔓 *Extrai automaticamente:*
│ • Host, Porta, Protocolo
│ • SSH User / Pass
│ • SNI, TLS Version
│ • Payload HTTP decryptado
│ • UUID, PSK, DNS
│ • Proxy, UDPGW
│ • Validade, Mensagem, Senha
│
│ ⭐ Recurso *Premium*
│ 📞 wa.me/${config.owner.number}
│
╰━━━━━━━━━━━━━━━━━━━━━━╯`);
  },

  async vpn(a) { return module.exports.decrypt(a); },
  async vpndec(a) { return module.exports.decrypt(a); },

  // ============ ATUALIZAÇÕES DE INTERNET ============
  async atualizacoes({ sock, msg, ctx, config }) {
    const updates = await botConfigCache.get('internet_updates', []);
    if (!updates.length) {
      return reply(sock, msg, ctx, `┏━━ ˚₊‧ 📡 ‧₊˚ ━━┓\n┃ *ᴀᴛᴜᴀʟɪᴢᴀᴄ̧ᴏ̃ᴇs*\n┃\n┃ Nenhuma atualização\n┃ disponível no momento.\n┃\n┃ Volte mais tarde!\n┗━━━━━━━━━━━━━━━━━┛`);
    }

    let text = `┏━━ ˚₊‧ 📡 ‧₊˚ ━━┓\n┃ *ᴀᴛᴜᴀʟɪᴢᴀᴄ̧ᴏ̃ᴇs ᴅᴇ ɪɴᴛᴇʀɴᴇᴛ*\n┃ ${config.bot.name}\n┗━━━━━━━━━━━━━━━━━┛\n`;

    for (const u of updates.slice(-10)) {
      text += `\n┏━━━━━━━━━━━━━━━━━┓`;
      if (u.title) text += `\n┃ 📌 *${u.title}*`;
      if (u.operator) text += `\n┃ 📱 Operadora: ${u.operator}`;
      if (u.vpnApp) text += `\n┃ 🔧 VPN: ${u.vpnApp}`;
      if (u.status) text += `\n┃ ${u.status === 'working' ? '✅ Funcionando' : u.status === 'slow' ? '🟡 Lento' : '❌ Parado'}`;
      if (u.date) text += `\n┃ 📅 ${u.date}`;
      if (u.note) text += `\n┃ 💬 ${u.note}`;
      text += `\n┗━━━━━━━━━━━━━━━━━┛`;
    }

    text += `\n\n> ⌁ Use *${config.bot.prefix}config* para receber ficheiros`;
    await sendMenuWithMedia(sock, msg, ctx, text, 'updates');
  },
  async updates(a) { return module.exports.atualizacoes(a); },
  async news(a) { return module.exports.atualizacoes(a); },

  // ============ CONFIGS CLIPBOARD ============
  async configs({ sock, msg, ctx, config }) {
    const configs = await botConfigCache.get('clipboard_configs', []);
    if (!configs.length) {
      return reply(sock, msg, ctx, `┏━━ ˚₊‧ 📋 ‧₊˚ ━━┓\n┃ *ᴄᴏɴꜰɪɢs ᴅɪsᴘᴏɴɪ́ᴠᴇɪs*\n┃\n┃ Nenhuma config disponível.\n┃ Volte mais tarde!\n┗━━━━━━━━━━━━━━━━━┛`);
    }

    let text = `┏━━ ˚₊‧ 📋 ‧₊˚ ━━┓\n┃ *ᴄᴏɴꜰɪɢs ᴅɪsᴘᴏɴɪ́ᴠᴇɪs*\n┃ Copie e cole no app VPN\n┗━━━━━━━━━━━━━━━━━┛\n`;

    for (let i = 0; i < configs.length; i++) {
      const c = configs[i];
      text += `\n*${i + 1}. ${c.title || 'Config ' + (i + 1)}*`;
      if (c.operator) text += ` · ${c.operator}`;
      if (c.vpnApp) text += ` · ${c.vpnApp}`;
    }

    text += `\n\nUse *${config.bot.prefix}config <número>* para receber`;
    return reply(sock, msg, ctx, text);
  },

  async config({ sock, msg, ctx, args, config }) {
    const configs = await botConfigCache.get('clipboard_configs', []);
    if (!configs.length) return reply(sock, msg, ctx, '📋 Nenhuma config disponível.');

    // Se não especificou número, lista todas
    const num = parseInt(args[0]);
    if (!num || num < 1 || num > configs.length) {
      return module.exports.configs({ sock, msg, ctx, config });
    }

    const c = configs[num - 1];

    // Se tem link, envia o link
    if (c.link) {
      return reply(sock, msg, ctx, `┏━━ ˚₊‧ 📋 ‧₊˚ ━━┓\n┃ *${c.title || 'Config'}*\n${c.operator ? `┃ 📱 ${c.operator}\n` : ''}${c.vpnApp ? `┃ 🔧 ${c.vpnApp}\n` : ''}┗━━━━━━━━━━━━━━━━━┛\n\n🔗 ${c.link}`);
    }

    // Se tem clipboard text, envia como texto puro (sem formatação)
    if (c.clipboard) {
      // Primeiro envia a info
      await reply(sock, msg, ctx, `📋 *${c.title || 'Config'}*${c.operator ? ' · ' + c.operator : ''}${c.vpnApp ? ' · ' + c.vpnApp : ''}\n\n⬇️ Copie o texto abaixo e cole no app:`);
      // Depois envia o clipboard PURO (sem canal, sem formatação)
      return sock.sendMessage(ctx.remoteJid, { text: c.clipboard });
    }

    return reply(sock, msg, ctx, '❌ Config sem dados.');
  },

};
