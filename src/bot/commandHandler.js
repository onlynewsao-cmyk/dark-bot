const config = require('../config');
const Command = require('../database/models/Command');
const User = require('../database/models/User');
const botConfigCache = require('./botConfigCache');
const Log = require('../database/models/Log');
const DecryptLog = require('../database/models/DecryptLog');
const mediaHandler = require('./mediaHandler');
const stickerMaker = require('./stickerMaker');
const nativeCommands = require('./nativeCommands');
const interactions = require('./packages/interactions');
const family = require('./packages/family');
const economy = require('./packages/economy');
const games = require('./packages/games');
const cheats = require('./packages/cheats');

// Unifica todos os pacotes num só objeto (pre-loaded)
const packageCommands = { ...interactions, ...family, ...economy, ...games, ...cheats };
const ai = require('./ai');
const decrypter = require('../decrypter');
const { formatForWhatsApp } = require('../decrypter/formatter');

function extractText(msg) {
  const m = msg.message;
  return m?.conversation || m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption || m?.videoMessage?.caption ||
    m?.documentMessage?.caption || m?.documentWithCaptionMessage?.message?.documentMessage?.caption || '';
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
    .replace(/{user}/gi, ctx.pushName).replace(/{number}/gi, ctx.senderNumber)
    .replace(/{bot}/gi, config.bot.name).replace(/{owner}/gi, config.owner.name)
    .replace(/{group}/gi, ctx.groupName || 'privado').replace(/{prefix}/gi, config.bot.prefix)
    .replace(/{date}/gi, new Date().toLocaleDateString('pt-BR'))
    .replace(/{time}/gi, new Date().toLocaleTimeString('pt-BR'));
}

// Cache simples para group metadata (evita chamadas repetidas)
const groupMetaCache = new Map();
const GROUP_META_TTL = 30000; // 30 segundos (reduzido para dados mais frescos)

async function handle(sock, msg) {
  const text = extractText(msg).trim();
  const ctx = getSenderInfo(msg);
  const prefix = config.bot.prefix;

  // ── Dono + Blacklist em paralelo (1 round-trip ao invés de 2) ──
  const [ownerLid, blacklist] = await Promise.all([
    botConfigCache.get('owner_lid', ''),
    botConfigCache.get('blacklist', []),
  ]);

  const senderJidFull = msg.key.participant || msg.key.remoteJid || '';
  const isOwner = ctx.senderNumber === config.owner.number ||
                  (ownerLid && senderJidFull.includes(ownerLid)) ||
                  (ownerLid && ctx.senderNumber === ownerLid.split('@')[0]);

  if (blacklist.includes(ctx.senderNumber) && !isOwner) return false;

  // Group info — CACHE em memória
  if (ctx.isGroup) {
    try {
      const now = Date.now();
      const cached = groupMetaCache.get(ctx.remoteJid);
      if (cached && (now - cached.ts) < GROUP_META_TTL) {
        ctx.groupName = cached.meta.subject;
        ctx.groupMeta = cached.meta;
      } else {
        const meta = await sock.groupMetadata(ctx.remoteJid);
        ctx.groupName = meta.subject;
        ctx.groupMeta = meta;
        groupMetaCache.set(ctx.remoteJid, { meta, ts: now });
      }
    } catch (e) {}
  }

  // ===== DECRYPT VPN: detecta documento OU texto com URI VPN =====
  const docMsg = msg.message?.documentMessage || msg.message?.documentWithCaptionMessage?.message?.documentMessage;

  // ===== DECRYPT VPN: texto com URI ou hex puro =====
  // Aceita: bdnet://hex | !vpn bdnet://hex | hex puro 4f07...
  {
    // Remove espaços/newlines que o WhatsApp insere em mensagens longas
    const _raw = text.trim().replace(/\s+/g, ' ');
    const _cmd = _raw.match(/^[!](?:vpn|decrypt|dec|vpndec)\s+(.+)/is);
    // Remove também qualquer whitespace dentro do URI (WhatsApp quebra linhas longas)
    const _uri = (_cmd ? _cmd[1].trim() : _raw).replace(/\s/g, '');
    const VPN_RE = /^(bdnet|apnalite|apna|vmess|vless|trojan|ss|ssr|ssh|hysteria|hysteria2|tuic|warp):\/\/\S{10,}/i;
    const _um = _uri.match(VPN_RE);
    const _hm = !_um && /^[0-9a-fA-F]{100,}$/.test(_uri) && _uri.startsWith('4f07');

    if (_um || _hm) {
      const _vu = await require('../database/models/User').findOne({ whatsappNumber: ctx.senderNumber });
      const _vp = isOwner || (_vu && _vu.isPremium());
      if (_vp) {
        await sock.sendMessage(ctx.remoteJid, { react: { text: '🔓', key: msg.key } });
        try {
          let _vr;
          if (_um) {
            const _sc = _um[1].toLowerCase();
            const _fn = `config.${_sc === 'apna' ? 'apnalite' : _sc}`;
            _vr = await decrypter.decrypt(_fn, Buffer.from(_uri.trim()));
          } else {
            _vr = await decrypter.decrypt('config.bdnet', Buffer.from(_uri.trim(), 'hex'));
          }
          const _vf = formatForWhatsApp(_vr, config);
          if (_vf.length > 4000) {
            for (const _vc of chunkString(_vf, 3800)) await sock.sendMessage(ctx.remoteJid, { text: _vc }, { quoted: msg });
          } else {
            await sock.sendMessage(ctx.remoteJid, { text: _vf }, { quoted: msg });
          }
          await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
          return true;
        } catch (_ve) {
          await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
          await sock.sendMessage(ctx.remoteJid, { text: `❌ Erro ao decryptar\n\n${_ve.message}` }, { quoted: msg });
          return true;
        }
      } else {
        await sock.sendMessage(ctx.remoteJid, {
          text: `🔓 *VPN DECRYPTER — Premium*\n\nUse *!vip* para ver planos\n📞 wa.me/${config.owner.number}`,
        }, { quoted: msg });
        return true;
      }
    }
  }

  if (docMsg) {
    const caption = (text || '').toLowerCase();
    const isDecryptRequest = caption.includes(`${prefix}decrypt`) || caption.includes(`${prefix}vpn`) ||
                              caption.includes(`${prefix}dec`) || caption.includes(`${prefix}vpndec`);
    const fileName = docMsg.fileName || 'unknown';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const supportedExts = ['ehi','ehic','hat','npv','npv4','npv7','npv8','npvt','dark','darkt','any','tls','conf','nm','nmess','ovpn','ssh','ssl','json','txt','bdnet','apnalite','wg','wireguard'];

    if (isDecryptRequest || (supportedExts.includes(ext) && !caption.startsWith(prefix))) {
      return handleDecryptRequest(sock, msg, ctx, docMsg, isOwner);
    }
  }

  // ===== CLIPBOARD VPN: detecta conteúdo colado (sem ser ficheiro) =====
  // Suporta: WireGuard INI, OpenVPN, vmess://, vless://, trojan://, ss://,
  //          JSON VPN, SSH key=value, payload HTTP
  // Só processa se o texto for longo e parecer uma config VPN
  if (!text.startsWith(prefix) && rawText.length > 40) {
    let _clipDetected = false;
    let _clipFname = 'config.txt';

    // WireGuard clipboard: começa com [Interface]
    if (/^\s*\[Interface\]/i.test(rawText) && rawText.includes('PrivateKey')) {
      _clipDetected = true; _clipFname = 'config.conf';
    }
    // OpenVPN clipboard: tem directivas client/dev/proto/remote
    else if (/^(client|dev tun|dev tap|proto tcp|proto udp|remote )/im.test(rawText) && rawText.includes('remote')) {
      _clipDetected = true; _clipFname = 'config.ovpn';
    }
    // JSON VPN clipboard
    else if (/^\s*\{/.test(rawText) && rawText.length > 60 && (
      rawText.includes('"sshHost"') || rawText.includes('"proxy_ip"') || rawText.includes('"proxyHost"') ||
      rawText.includes('"outbounds"') || rawText.includes('"vnext"') || rawText.includes('"v":') ||
      rawText.includes('"host"') && rawText.includes('"port"') ||
      rawText.includes('"ssh_host"') || rawText.includes('"payload"')
    )) {
      _clipDetected = true;
      // Detecta subtipo
      if (rawText.includes('"outbounds"') || rawText.includes('"vnext"') || rawText.includes('"v":')) {
        _clipFname = 'config.json'; // V2Ray
      } else { _clipFname = 'config.json'; }
    }
    // SSH key=value clipboard
    else if (rawText.includes('Host=') || rawText.includes('Port=') || rawText.includes('Username=') ||
             (rawText.includes('sshHost') && rawText.includes('sshPort'))) {
      _clipDetected = true; _clipFname = 'config.ssh';
    }

    if (_clipDetected) {
      const _cu = await require('../database/models/User').findOne({ whatsappNumber: ctx.senderNumber });
      const _cp = isOwner || (_cu && _cu.isPremium());
      if (_cp) {
        await sock.sendMessage(ctx.remoteJid, { react: { text: '🔓', key: msg.key } });
        try {
          const _cr = await decrypter.decrypt(_clipFname, Buffer.from(rawText));
          const _cf = formatForWhatsApp(_cr, config);
          if (_cf.length > 4000) {
            for (const _cc of chunkString(_cf, 3800)) await sock.sendMessage(ctx.remoteJid, { text: _cc }, { quoted: msg });
          } else {
            await sock.sendMessage(ctx.remoteJid, { text: _cf }, { quoted: msg });
          }
          await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
          return true;
        } catch (_ce) {
          // Falha silenciosa — não é config VPN válida
        }
      }
    }
  }

  // ===== Auto-IA quando mencionado =====
  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const isMentioned = mentioned.includes(botJid);
  const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === botJid;
  const aiAutoEnabled = await botConfigCache.get('ai_auto_enabled', false);
  if (aiAutoEnabled && !text.startsWith(prefix) && (isMentioned || isReplyToBot || !ctx.isGroup)) {
    try {
      const cleanText = text.replace(/@\d+/g, '').trim();
      if (cleanText.length > 2) {
        await sock.sendMessage(ctx.remoteJid, { react: { text: '🤔', key: msg.key } });
        const answer = await ai.chat(cleanText);
        await sock.sendMessage(ctx.remoteJid, { text: `🧠 ${answer}` }, { quoted: msg });
        await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
        return true;
      }
    } catch (e) {}
  }

  // Sticker em mídia
  const isMedia = msg.message?.imageMessage || msg.message?.videoMessage;
  if (isMedia && (text === `${prefix}sticker` || text === `${prefix}s` || text === `${prefix}fig`)) {
    return handleStickerRequest(sock, msg, ctx);
  }

  if (!text.startsWith(prefix)) return false;

  const args = text.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  if (!commandName) return false;

  // Comandos dos pacotes (interactions, family, economy, games, cheats)
  if (packageCommands[commandName]) {
    try {
      await packageCommands[commandName]({ sock, msg, ctx, args, isOwner, fillVars, config });
      await incrementUserCommand(ctx.senderNumber);
      return true;
    } catch (err) {
      console.error('pkg err:', commandName, err);
      await sock.sendMessage(ctx.remoteJid, { text: '❌ ' + err.message }, { quoted: msg });
      return true;
    }
  }

  if (nativeCommands[commandName]) {
    try {
      await nativeCommands[commandName]({ sock, msg, ctx, args, isOwner, fillVars, config });
      await incrementUserCommand(ctx.senderNumber);
      return true;
    } catch (err) {
      console.error('cmd err:', commandName, err);
      await sock.sendMessage(ctx.remoteJid, { text: '❌ ' + err.message }, { quoted: msg });
      return true;
    }
  }

  const aliasMap = {
    help: 'menu', cmds: 'menu', comandos: 'menu',
    s: 'sticker', fig: 'sticker', owner: 'dono', bot: 'info',
    yt: 'play', musica: 'play', music: 'play',
    yt2: 'play2', musica2: 'play2', savefrom: 'play2',
    yt3: 'play3', musica3: 'play3', auto: 'play3',
    tt: 'tiktok', ig: 'instagram', x: 'twitter',
    sp: 'spotify', sc: 'soundcloud', pin: 'pinterest',
    mf: 'mediafire', modapk: 'apk', mod: 'apk', app: 'apk',
    ai: 'ia', chatgpt: 'ia', llm: 'ia', img: 'imagem',
    weather: 'clima', tempo: 'clima', short: 'encurtar', curto: 'encurtar',
    premium: 'vip', dec: 'decrypt', vpn: 'decrypt', vpndec: 'decrypt',
    updates: 'atualizacoes', news: 'atualizacoes', novidades: 'atualizacoes',
    configs: 'configs', cfg: 'config', arquivo: 'config',
    // jid — copiar JID em PV
    getjid: 'jid', copyjid: 'jid', myjid: 'jid',
  };
  if (aliasMap[commandName] && nativeCommands[aliasMap[commandName]]) {
    try {
      await nativeCommands[aliasMap[commandName]]({ sock, msg, ctx, args, isOwner, fillVars, config });
      await incrementUserCommand(ctx.senderNumber);
      return true;
    } catch (err) {
      await sock.sendMessage(ctx.remoteJid, { text: '❌ ' + err.message }, { quoted: msg });
      return true;
    }
  }

  try {
    const cmd = await Command.findOne({ $or: [{ name: commandName }, { aliases: commandName }], enabled: true });
    if (!cmd) return false;
    if (cmd.accessLevel === 'owner' && !isOwner) {
      await sock.sendMessage(ctx.remoteJid, { text: '🚫 Só Dono.' }, { quoted: msg }); return true;
    }
    if (cmd.accessLevel === 'premium') {
      const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
      const isPrem = isOwner || (user && user.isPremium());
      if (!isPrem) {
        await sock.sendMessage(ctx.remoteJid, { text: `⭐ *Comando Premium*\n\nUse !vip\n📞 wa.me/${config.owner.number}` }, { quoted: msg });
        return true;
      }
    }
    cmd.usageCount = (cmd.usageCount || 0) + 1;
    await cmd.save();
    const responseText = fillVars(cmd.response || '', ctx);
    if (cmd.mediaUrl && cmd.mediaType) {
      const buffer = await mediaHandler.fetchBuffer(cmd.mediaUrl);
      const payload = cmd.mediaType === 'image' || cmd.mediaType === 'gif'
        ? { image: buffer, caption: responseText }
        : cmd.mediaType === 'video' ? { video: buffer, caption: responseText }
        : cmd.mediaType === 'audio' ? { audio: buffer, mimetype: 'audio/mp4' }
        : { text: responseText };
      await sock.sendMessage(ctx.remoteJid, payload, { quoted: msg });
    } else if (responseText) {
      await sock.sendMessage(ctx.remoteJid, { text: responseText }, { quoted: msg });
    }
    await incrementUserCommand(ctx.senderNumber);
    return true;
  } catch (err) {
    console.error('DB cmd:', err);
    return false;
  }
}

async function handleDecryptRequest(sock, msg, ctx, docMsg, isOwner) {
  // Verifica permissão: Dono ou Premium
  const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
  const isPremium = isOwner || (user && user.isPremium());

  if (!isPremium) {
    await sock.sendMessage(ctx.remoteJid, {
      text: `🔓 *VPN DECRYPTER — Recurso Premium*\n\n` +
            `Para usar o decrypter, você precisa ser Premium.\n\n` +
            `💎 Veja os planos: ${config.bot.prefix}vip\n` +
            `📞 wa.me/${config.owner.number}`,
    }, { quoted: msg });
    return true;
  }

  await sock.sendMessage(ctx.remoteJid, { react: { text: '🔓', key: msg.key } });

  try {
    const buffer = await mediaHandler.downloadFromMessage(msg);
    const fileName = docMsg.fileName || 'arquivo.bin';
    const result = await decrypter.decrypt(fileName, buffer);
    const formatted = formatForWhatsApp(result, config);

    // Se muito grande, divide
    if (formatted.length > 4000) {
      const chunks = chunkString(formatted, 3800);
      for (const c of chunks) await sock.sendMessage(ctx.remoteJid, { text: c }, { quoted: msg });
    } else {
      await sock.sendMessage(ctx.remoteJid, { text: formatted }, { quoted: msg });
    }

    // Envia JSON completo como arquivo também
    const jsonBuf = Buffer.from(JSON.stringify(result, null, 2), 'utf-8');
    await sock.sendMessage(ctx.remoteJid, {
      document: jsonBuf, fileName: `${fileName}.decrypted.json`, mimetype: 'application/json',
      caption: '📄 JSON completo da decryptação',
    }, { quoted: msg });

    await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });

    // Log
    try {
      await DecryptLog.create({
        user: user?._id, username: user?.username || ctx.pushName,
        whatsappNumber: ctx.senderNumber, fileName, format: result.format,
        source: 'whatsapp', success: true,
        extracted: { configName: result.configName, host: result.server?.host, port: result.server?.port },
      });
    } catch (e) {}
  } catch (err) {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
    await sock.sendMessage(ctx.remoteJid, {
      text: `❌ *Erro ao decryptar*\n\n${err.message}\n\nFormatos suportados: .ehi, .ehic, .hat, .npv4, .dark, .any, .tls, .conf, .nm, .ovpn, .ssh, .json`,
    }, { quoted: msg });
    try {
      await DecryptLog.create({
        user: user?._id, username: user?.username || ctx.pushName,
        whatsappNumber: ctx.senderNumber, fileName: docMsg.fileName,
        source: 'whatsapp', success: false, error: err.message,
      });
    } catch (e) {}
  }
  return true;
}

function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size));
  return chunks;
}

async function incrementUserCommand(number) {
  try {
    const u = await User.findOne({ whatsappNumber: number });
    if (u) { u.commandsUsed = (u.commandsUsed || 0) + 1; await u.save(); }
  } catch (e) {}
}

async function handleStickerRequest(sock, msg, ctx) {
  try {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    const buffer = await mediaHandler.downloadFromMessage(msg);
    const { detectMime } = require('./stickerMaker');
    const mime = detectMime(buffer);
    const isVid = !!msg.message?.videoMessage;
    const isGif = msg.message?.videoMessage?.gifPlayback;
    const isAnimated = isVid || isGif || mime === 'image/gif' || mime === 'video/mp4' || mime === 'video/webm';
    const stk = await stickerMaker.create(buffer, {
      botName: config.bot.name, ownerName: config.owner.name,
      userName: ctx.pushName, groupName: ctx.groupName || 'Privado',
      isVideo: isAnimated,
    });
    if (!stk || stk.length < 50) throw new Error('Sticker inválido');
    await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
    await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
  } catch (err) {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
    await sock.sendMessage(ctx.remoteJid, { text: '❌ ' + err.message }, { quoted: msg });
  }
}

module.exports = { handle, extractText, getSenderInfo, fillVars };
