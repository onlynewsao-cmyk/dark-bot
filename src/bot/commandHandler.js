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
const reactions = require('./reactions');

// Unifica todos os pacotes num só objeto (pre-loaded)
const packageCommands = { ...interactions, ...family, ...economy, ...games, ...cheats };
const ai = require('./ai');
const decrypter = require('../decrypter');
const { formatForWhatsApp } = require('../decrypter/formatter');
const prefixManager = require('./prefixManager');
const CommandOverride = require('../database/models/CommandOverride');
const userManager = require('./userManager');
const path = require('path');

function extractText(msg) {
  const m = msg.message;
  
  // Texto normal
  let text = m?.conversation || m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption || m?.videoMessage?.caption ||
    m?.documentMessage?.caption || m?.documentWithCaptionMessage?.message?.documentMessage?.caption || '';

  // Botões e Listas (MD) - TRATAMENTO AGRESSIVO
  if (!text) {
    const btnId = m?.buttonsResponseMessage?.selectedButtonId || 
                  m?.templateButtonReplyMessage?.selectedId ||
                  m?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                  m?.interactiveResponseMessage?.selectedButtonId;
    if (btnId) text = btnId;
  }

  // Interactive Message (Native Flow / Quick Reply)
  if (!text && m?.interactiveResponseMessage?.nativeFlowResponseMessage) {
    const paramsJson = m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson;
    if (paramsJson) {
      try {
        const params = JSON.parse(paramsJson);
        text = params.id || params.selected_id || params.selectedRowId || params.rowId || params.row_id || params.button_id || params.buttonId || params.value || params.text || '';
      } catch (e) {}
    }
  }

  return text;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startsWithAnyPrefix(text, prefixes) {
  return prefixes.some(p => text.startsWith(p));
}

async function isGroupAdminForHandler(sock, ctx) {
  if (!ctx.isGroup) return false;
  try {
    const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
    const senderBase = (ctx.senderJid || '').split(':')[0].split('@')[0];
    return meta.participants?.some(p => {
      const pBase = (p.id || '').split(':')[0].split('@')[0];
      return pBase === senderBase && (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch { return false; }
}

function getSenderInfo(msg) {
  const remoteJid = msg.key.remoteJid;
  const isGroup = remoteJid?.endsWith('@g.us');
  const senderJid = isGroup ? (msg.key.participant || remoteJid) : remoteJid;
  const senderNumber = (senderJid || '').split('@')[0] || '';
  const pushName = msg.pushName || 'Usuário';
  return { remoteJid, isGroup, senderJid, senderNumber, pushName };
}


function getQuotedMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg.message?.buttonsResponseMessage?.contextInfo?.quotedMessage ||
    msg.message?.interactiveResponseMessage?.contextInfo?.quotedMessage || null;
}

function getDocumentFromMessageObject(messageObj) {
  return messageObj?.documentMessage || messageObj?.documentWithCaptionMessage?.message?.documentMessage || null;
}

function buildQuotedDownloadMessage(msg) {
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.buttonsResponseMessage?.contextInfo ||
    msg.message?.interactiveResponseMessage?.contextInfo || {};
  const quotedMessage = ctxInfo.quotedMessage;
  if (!quotedMessage) return null;
  return {
    key: {
      remoteJid: msg.key.remoteJid,
      id: ctxInfo.stanzaId || msg.key.id,
      participant: ctxInfo.participant || msg.key.participant,
      fromMe: false,
    },
    message: quotedMessage,
  };
}

function fillVars(text, ctx) {
  return text
    .replace(/{user}/gi, ctx.pushName).replace(/{number}/gi, ctx.senderNumber)
    .replace(/{bot}/gi, ctx.botName || config.bot.name).replace(/{owner}/gi, config.owner.name)
    .replace(/{group}/gi, ctx.groupName || 'privado').replace(/{prefix}/gi, ctx.prefix || config.bot.prefix)
    .replace(/{treatment}/gi, ctx.treatment || 'meu nobre 🕸️')
    .replace(/{date}/gi, new Date().toLocaleDateString('pt-BR'))
    .replace(/{time}/gi, new Date().toLocaleTimeString('pt-BR'));
}

// Cache simples para group metadata (evita chamadas repetidas)
const groupMetaCache = new Map();
const GROUP_META_TTL = 30000; // 30 segundos (reduzido para dados mais frescos)
const botChatCooldown = new Map();


function getUserTreatment(user, ctx, isPrimaryOwner) {
  if (isPrimaryOwner) return `meu Criador Supremo ${config.owner.name} 👑🕸️`;
  if (!user || !user.gender || user.gender === 'unknown') return 'meu nobre 🕸️';
  if (user.gender === 'male') return 'meu Rei 👑';
  if (user.gender === 'female') return 'minha Rainha ✨';
  return 'meu nobre 🕸️';
}

function isGreetingText(text) {
  return /^(oi|ol[aá]|hello|hi|hey|salve|bom dia|boa tarde|boa noite)\b[\w\s@.!?_-]{0,40}$/i.test(String(text || '').trim());
}

function isLikelyBotSender(ctx, text) {
  const name = String(ctx.pushName || '').toLowerCase();
  const t = String(text || '').toLowerCase();
  return /\b(bot|robot|robô|robo|ia|ai|gpt|assistant|assistente)\b/i.test(name) ||
         /\b(sou|eu sou).{0,20}\b(bot|robô|robo|ia|assistente)\b/i.test(t);
}

function canBotChat(ctx) {
  const key = `${ctx.remoteJid}:${ctx.senderNumber}`;
  const last = botChatCooldown.get(key) || 0;
  if (Date.now() - last < 10 * 60 * 1000) return false;
  botChatCooldown.set(key, Date.now());
  return true;
}

async function isVipCommand(commandName) {
  const defaults = ['decrypt','vpn','vpndec','play3','video2','statusvideo','ptv','figubug2','pinmp4','gimage','audiomeme','vinil','sfull','noticias','pesquisar','resumir'];
  try {
    const custom = await botConfigCache.get('vip_commands', defaults);
    const list = Array.isArray(custom) ? custom : String(custom || '').split(/[\s,]+/).filter(Boolean);
    return list.map(x => String(x).toLowerCase()).includes(String(commandName).toLowerCase());
  } catch { return defaults.includes(String(commandName).toLowerCase()); }
}

async function userIsPremiumOrOwner(number, isOwner) {
  if (isOwner) return true;
  const u = await User.findOne({ whatsappNumber: number }).catch(() => null);
  return !!(u && u.isPremium && u.isPremium());
}

async function handle(sock, msg) {
  let text = extractText(msg).trim();
  if (!text && !msg.message?.documentMessage && !msg.message?.documentWithCaptionMessage) return false;

  const ctx = getSenderInfo(msg);
  const prefixes = await prefixManager.getPrefixes();
  const firstTokenNoPrefix = String(text || '').trim().split(/\s+/)[0].toLowerCase();
  const noPrefixMenuIds = new Set([
    'menuprincipal','mainmenu','menumain','menucompleto','help','comandos','cmds',
    'menudownloads','menudownload','downloads','menudl',
    'menubrincadeiras','menuzoeira','menudiversao','menufun','menumemes',
    'menucoins','menueconomia','menueco','menubank','menudarkbank',
    'menualteradores','menuefeitos','menuaudio','audioeffects','menulogos','menulogo',
    'menu+18','menu18','cmdsocultos','portal18',
    'menuadm','menuadmin','menugrupo','admin','admins',
    'menudono','menuowner','donomenu','maiscmds',
    'menusticker','menustickers','menufigurinhas','menuia','menustatus','menuinfo',
    'aceitarinvocacao','recusarinvocacao'
  ]);
  if (text && !startsWithAnyPrefix(text, prefixes) && noPrefixMenuIds.has(firstTokenNoPrefix)) {
    text = (prefixes[0] || config.bot.prefix || '!') + text;
  }
  const prefixInfo = await prefixManager.detectPrefix(text);
  const prefix = prefixInfo?.prefix || prefixes[0] || config.bot.prefix || '!';
  const commandConfig = { ...config, bot: { ...config.bot, prefix } };
  ctx.prefix = prefix;

  // ── Dono + Blacklist em paralelo (1 round-trip ao invés de 2) ──
  const [ownerLid, blacklist, extraOwners, disabledUsers, disabledGroups] = await Promise.all([
    botConfigCache.get('owner_lid', ''),
    botConfigCache.get('blacklist', []),
    botConfigCache.get('owner_numbers', []),
    botConfigCache.get('disabled_users', []),
    botConfigCache.get('disabled_groups', []),
  ]);

  const senderJidFull = msg.key.participant || msg.key.remoteJid || '';
  const ownerNumbers = Array.isArray(extraOwners)
    ? extraOwners.map(userManager.normalizeNumber).filter(Boolean)
    : String(extraOwners || '').split(/[\s,]+/).map(userManager.normalizeNumber).filter(Boolean);
  const isOwner = ctx.senderNumber === userManager.normalizeNumber(config.owner.number) ||
                  ownerNumbers.includes(ctx.senderNumber) ||
                  (ownerLid && senderJidFull.includes(ownerLid)) ||
                  (ownerLid && ctx.senderNumber === ownerLid.split('@')[0]);
  ctx.isOwner = isOwner;
  ctx.isPrimaryOwner = ctx.senderNumber === userManager.normalizeNumber(config.owner.number);

  if ((blacklist.includes(ctx.senderNumber) || (Array.isArray(disabledUsers) && disabledUsers.map(String).includes(ctx.senderNumber))) && !isOwner) return false;
  if (ctx.isGroup && Array.isArray(disabledGroups) && disabledGroups.includes(ctx.remoteJid) && !isOwner) return false;

  let user = await userManager.identifyByWhatsApp(ctx.senderNumber, ctx.pushName);
  if (user && user.active === false && !isOwner) return false;
  ctx.userData = user;
  ctx.treatment = getUserTreatment(user, ctx, ctx.isPrimaryOwner);

  const autoDecryptValue = await botConfigCache.get('auto_decrypt_enabled', true);
  const autoDecryptOn = autoDecryptValue === true || autoDecryptValue === 'true' || autoDecryptValue === 'on' || autoDecryptValue === 1 || autoDecryptValue === '1';

  // Group info — CACHE em memória
  const GroupSettings = require('../database/models/GroupSettings');
  let groupConfig = null;

  if (ctx.isGroup) {
    try {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      
      groupConfig = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
      if (!groupConfig) {
        groupConfig = await GroupSettings.create({ 
          groupJid: ctx.remoteJid, 
          groupName: ctx.groupName || 'Novo Grupo' 
        });
      }

      // Reset diário de comandos
      if (groupConfig.lastResetDate !== today) {
        groupConfig.commandsUsedToday = 0;
        groupConfig.lastResetDate = today;
      }

      // Verifica Hospedagem / Trial
      const isTrialActive = groupConfig.trialExpiresAt > new Date();
      const isHosted = groupConfig.isHosted && (!groupConfig.hostedUntil || groupConfig.hostedUntil > new Date());
      
      if (!isTrialActive && !isHosted && !isOwner) {
        if (groupConfig.commandsUsedToday >= 500) {
          // Só avisa a cada 50 comandos excedidos para não floodar
          if (groupConfig.commandsUsedToday % 50 === 0) {
            await sock.sendMessage(ctx.remoteJid, { 
              text: `⚠️ *LIMITE DE COMANDOS EXCEDIDO*\n\nEste grupo não possui hospedagem ativa e atingiu o limite de 500 comandos diários.\n\n💎 Para comandos ilimitados e suporte 24/7, assine um plano de hospedagem no dashboard.` 
            });
          }
          return false;
        }
      }

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

      ctx.blockedCommands = groupConfig.blockedCommands || [];
      ctx.blockedSubmenus = groupConfig.blockedSubmenus || [];
      if (groupConfig.customBotName) {
        ctx.botName = groupConfig.customBotName;
        commandConfig.bot.name = groupConfig.customBotName;
      }
      if (groupConfig.botEnabled === false && !isOwner) return false;
    } catch (e) {}
  }

  // ===== DECRYPT VPN: detecta documento OU texto com URI VPN =====
  const docMsg = getDocumentFromMessageObject(msg.message);
  const quotedDownloadMsg = buildQuotedDownloadMessage(msg);
  const quotedDocMsg = quotedDownloadMsg ? getDocumentFromMessageObject(quotedDownloadMsg.message) : null;

  // TODAS as extensoes VPN conhecidas - auto-detect
  const ALL_VPN_EXTS = [
    'ehi','ehic','hat','npv','npv4','npv7','npv8','npvt',
    'dark','darkt','any','tls','nm','nmess',
    'ovpn','ssh','ssl','json','conf','wg','wireguard','txt','log',
    'bdnet','bd','apnalite','apna','wyrvpn','wyr',
  ];

  // ===== DECRYPT VPN: texto com URI ou hex puro =====
  {
    const _raw = text.trim();
    const _cmd = _raw.match(new RegExp(`^${escapeRegex(prefix)}(?:vpn|decrypt|dec|vpndec)\\s+(.+)`, 'is'));
    const _uri = (_cmd ? _cmd[1].trim() : '').replace(/\s/g, '');
    const VPN_RE = /^(bdnet|bd|apnalite|apna|vmess|vless|trojan|ss|ssr|ssh|hysteria|hysteria2|tuic|warp|wyrvpn|wyr):\/\/\S{10,}/i;
    const _um = _uri.match(VPN_RE);
    const _hm = !_um && /^[0-9a-fA-F]{100,}$/.test(_uri) && _uri.startsWith('4f07');

    if (_cmd && (_um || _hm)) {
      const _vu = await require('../database/models/User').findOne({ whatsappNumber: ctx.senderNumber });
      const _vp = isOwner || (_vu && _vu.isPremium());
      if (_vp) {
        await sock.sendMessage(ctx.remoteJid, { react: { text: '\ud83d\udd13', key: msg.key } });
        try {
          let _vr;
          if (_um) {
            const _sc = _um[1].toLowerCase();
            const _fn = `config.${_sc === 'apna' ? 'apnalite' : _sc === 'bd' ? 'bdnet' : _sc === 'wyr' ? 'wyrvpn' : _sc}`;
            _vr = await decrypter.decrypt(_fn, Buffer.from(_uri.trim()));
          } else {
            _vr = await decrypter.decrypt('config.bdnet', Buffer.from(_uri.trim(), 'hex'));
          }
          const _vf = formatForWhatsApp(_vr, config);
          if (_vf.length > 4000) {
            for (const _vc of chunkString(_vf, 3800)) await sock.sendMessage(ctx.remoteJid, { text: _vc }, { quoted: replyMsg });
          } else {
            await sock.sendMessage(ctx.remoteJid, { text: _vf }, { quoted: msg });
          }
          await sock.sendMessage(ctx.remoteJid, { react: { text: '\u2705', key: msg.key } });
          return true;
        } catch (_ve) {
          await sock.sendMessage(ctx.remoteJid, { react: { text: '\u274c', key: msg.key } });
          await sock.sendMessage(ctx.remoteJid, { text: `\u274c Erro ao decryptar\n\n${_ve.message}` }, { quoted: msg });
          return true;
        }
      } else {
        await sock.sendMessage(ctx.remoteJid, {
          text: `\ud83d\udd13 *VPN DECRYPTER \u2014 Premium*\n\nUse *!vip* para ver planos\n\ud83d\udcde wa.me/${config.owner.number}`,
        }, { quoted: msg });
        return true;
      }
    }
  }

  // ===== AUTO DECRYPT EM GRUPOS (Se ativado pelo dono) =====
  if (docMsg && ctx.isGroup && autoDecryptOn) {
    const autoDecOn = await botConfigCache.get(`autodecrypt_${ctx.remoteJid}`, false);
    const ext = docMsg.fileName?.split('.').pop()?.toLowerCase();
    const isVpnFile = ALL_VPN_EXTS.includes(ext);
    if (autoDecOn && isVpnFile && !startsWithAnyPrefix(text, prefixes)) {
      return handleDecryptRequest(sock, msg, ctx, docMsg, isOwner);
    }
  }

  // ===== DECRYPT POR DOCUMENTO (comando na legenda) =====
  if (docMsg) {
    const caption = (text || '').toLowerCase();
    const isDecryptRequest = caption.includes(`${prefix}decrypt`) || caption.includes(`${prefix}vpn`) ||
                             caption.includes(`${prefix}dec`) || caption.includes(`${prefix}vpndec`);
    if (isDecryptRequest) {
      return handleDecryptRequest(sock, msg, ctx, docMsg, isOwner);
    }
  }

  // ===== DECRYPT RESPONDENDO/REPLY A UM DOCUMENTO =====
  if (!docMsg && quotedDocMsg && prefixInfo) {
    const cmdName = (prefixInfo.rest.split(/\s+/)[0] || '').toLowerCase();
    if (['decrypt', 'vpn', 'dec', 'vpndec'].includes(cmdName)) {
      return handleDecryptRequest(sock, quotedDownloadMsg, ctx, quotedDocMsg, isOwner, msg);
    }
  }

  // ===== CLIPBOARD VPN: comando explicito =====
  // Suporta: URIs, WireGuard, OpenVPN, JSON, SSH, Hex BDNet
  {
    const clipMatch = text.match(new RegExp(`^${escapeRegex(prefix)}(?:vpn|decrypt|dec|vpndec)\\s+([\\s\\S]+)$`, 'i'));
    const rawText = clipMatch ? clipMatch[1].trim() : '';

    if (rawText.length > 20) {
      const linkMatch = rawText.match(/https?:\/\/[^\s]+/i);
      if (linkMatch && isDecryptFileUrl(linkMatch[0])) {
        const _lu = await require('../database/models/User').findOne({ whatsappNumber: ctx.senderNumber });
        const _lp = isOwner || (_lu && _lu.isPremium());
        if (!_lp) {
          await sock.sendMessage(ctx.remoteJid, {
            text: `🔓 *VPN DECRYPTER — Premium*\n\nEnvie arquivos/links VPN apenas com conta Premium.\n\nUse *${prefix}vip* para ver planos.`,
          }, { quoted: msg });
          return true;
        }
        await sock.sendMessage(ctx.remoteJid, { react: { text: '🔓', key: msg.key } });
        try {
          await sock.sendMessage(ctx.remoteJid, { text: '📥 Baixando arquivo VPN do link e analisando...', }, { quoted: msg });
          const file = await fetchDecryptFileFromUrl(linkMatch[0]);
          const _lr = await decrypter.decrypt(file.fileName, file.buffer);
          const _lf = formatForWhatsApp(_lr, config);
          for (const _lc of chunkString(_lf, 3800)) await sock.sendMessage(ctx.remoteJid, { text: _lc }, { quoted: msg });
          const jsonBuf = Buffer.from(JSON.stringify(_lr, null, 2), 'utf-8');
          await sock.sendMessage(ctx.remoteJid, {
            document: jsonBuf,
            fileName: `${file.fileName}.decrypted.json`,
            mimetype: 'application/json',
            caption: '📄 JSON completo da decryptação por link',
          }, { quoted: msg });
          await sock.sendMessage(ctx.remoteJid, { react: { text: _lr.success ? '✅' : '⚠️', key: msg.key } });
          try {
            await DecryptLog.create({
              user: _lu?._id, username: _lu?.username || ctx.pushName,
              whatsappNumber: ctx.senderNumber, fileName: file.fileName, format: _lr.format,
              source: 'whatsapp-link', success: !!_lr.success,
              extracted: { configName: _lr.configName, host: _lr.host || _lr.server?.host, port: _lr.port || _lr.server?.port },
            });
          } catch {}
          return true;
        } catch (_le) {
          await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
          await sock.sendMessage(ctx.remoteJid, { text: `❌ Erro ao baixar/decryptar link\n\n${_le.message}` }, { quoted: msg });
          return true;
        }
      }

      let _clipDetected = false;
      let _clipFname = 'config.txt';

      const uriDetected = decrypter.detectURI(rawText);
      if (uriDetected) {
        _clipDetected = true;
        _clipFname = `config.${uriDetected.scheme}`;
      }
      else if (/^\s*\[Interface\]/i.test(rawText) && rawText.includes('PrivateKey')) {
        _clipDetected = true; _clipFname = 'config.conf';
      }
      else if (/^(client|dev tun|dev tap|proto tcp|proto udp|remote )/im.test(rawText) && rawText.includes('remote')) {
        _clipDetected = true; _clipFname = 'config.ovpn';
      }
      else if (/^\s*\{/.test(rawText) && rawText.length > 60 && (
        rawText.includes('"sshHost"') || rawText.includes('"proxy_ip"') || rawText.includes('"proxyHost"') ||
        rawText.includes('"outbounds"') || rawText.includes('"vnext"') || rawText.includes('"v":') ||
        (rawText.includes('"host"') && rawText.includes('"port"')) ||
        rawText.includes('"ssh_host"') || rawText.includes('"payload"')
      )) {
        _clipDetected = true; _clipFname = 'config.json';
      }
      else if (rawText.includes('Host=') || rawText.includes('Port=') || rawText.includes('Username=') ||
               (rawText.includes('sshHost') && rawText.includes('sshPort'))) {
        _clipDetected = true; _clipFname = 'config.ssh';
      }
      else if (/^[0-9a-fA-F]{50,}$/.test(rawText.replace(/\s/g, ''))) {
        _clipDetected = true; _clipFname = 'config.bdnet';
      }

      if (_clipDetected) {
        const _cu = await require('../database/models/User').findOne({ whatsappNumber: ctx.senderNumber });
        const _cp = isOwner || (_cu && _cu.isPremium());
        if (_cp) {
          await sock.sendMessage(ctx.remoteJid, { react: { text: '\ud83d\udd13', key: msg.key } });
          try {
            const buf = _clipFname === 'config.bdnet'
              ? Buffer.from(rawText.replace(/\s/g, ''), 'hex')
              : Buffer.from(rawText);
            const _cr = await decrypter.decrypt(_clipFname, buf);
            const _cf = formatForWhatsApp(_cr, config);
            if (_cf.length > 4000) {
              for (const _cc of chunkString(_cf, 3800)) await sock.sendMessage(ctx.remoteJid, { text: _cc }, { quoted: msg });
            } else {
              await sock.sendMessage(ctx.remoteJid, { text: _cf }, { quoted: msg });
            }
            await sock.sendMessage(ctx.remoteJid, { react: { text: '\u2705', key: msg.key } });
            return true;
          } catch (_ce) {
            await sock.sendMessage(ctx.remoteJid, { react: { text: '\u274c', key: msg.key } });
            await sock.sendMessage(ctx.remoteJid, { text: `\u274c Erro ao decryptar clipboard\n\n${_ce.message}` }, { quoted: msg });
            return true;
          }
        }
      }
    }
  }

  // ===== Auto-IA quando mencionado =====
  // ===== Auto-IA quando mencionado =====
  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const isMentioned = mentioned.includes(botJid);
  const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === botJid;
  const aiAutoEnabled = await botConfigCache.get('ai_auto_enabled', false);
  if (aiAutoEnabled && !startsWithAnyPrefix(text, prefixes) && (isMentioned || isReplyToBot || !ctx.isGroup)) {
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

  // ===== Usuário único por WhatsApp =====
  // O gênero só é perguntado/alterado quando o usuário usa !genero ou !alterargenero.
  user = user || await userManager.identifyByWhatsApp(ctx.senderNumber, ctx.pushName);

  // ===== DECRYPTER AUTOMÁTICO (Só para Premium) =====
  if (docMsg && autoDecryptOn) {
    const fileName = docMsg.fileName || '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const vpnExts = ['ehi','ehic','hat','npv','npv4','npv7','npv8','npvt','dark','darkt','any','tls','nm','nmess','ovpn','ssh','ssl','json','conf','wg','wireguard','txt','bdnet','bd','apna','apnalite','wyrvpn','wyr'];
    
    if (vpnExts.includes(ext)) {
      const isPremium = isOwner || (user && user.isPremium());
      if (isPremium) {
        return handleDecryptRequest(sock, msg, ctx, docMsg, isOwner);
      } else {
        await sock.sendMessage(ctx.remoteJid, { 
          text: `🔓 *DECRYPTER FORENSE*\n\nEste arquivo (*.${ext}*) é uma configuração VPN protegida. A descriptografia é um recurso exclusivo para membros *PREMIUM*.\n\n💎 Use *!vip* para ver os planos.` 
        }, { quoted: msg });
        return true;
      }
    }
  }

  if (!prefixInfo) {
    const botChatOn = await botConfigCache.get('bot_interaction_enabled', false);
    const enabledBotChat = botChatOn === true || botChatOn === 'true' || botChatOn === 'on' || botChatOn === 1 || botChatOn === '1';
    if (enabledBotChat && isGreetingText(text)) {
      const botJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : '';
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const mentionedBot = botJid && mentioned.includes(botJid);
      const calledByName = text.toLowerCase().includes(String(commandConfig.bot.name || '').toLowerCase());
      if ((!ctx.isGroup || mentionedBot || calledByName || isLikelyBotSender(ctx, text)) && canBotChat(ctx)) {
        const otherBot = isLikelyBotSender(ctx, text);
        const greeting = ctx.isPrimaryOwner
          ? `Saudações, ${ctx.treatment}! Dark Net Engine 🕸️ está em modo máximo para o criador.`
          : otherBot
            ? `Oi, bot aliado 🤖🕸️ Eu sou *${commandConfig.bot.name}*, motor do Dark Net Engine. Vamos manter este grupo organizado e poderoso.`
            : `Oi, ${ctx.treatment}! Eu sou *${commandConfig.bot.name}*. Use *${prefix}menu* ou *${prefix}menubtn* para ver minhas funções.`;
        await sock.sendMessage(ctx.remoteJid, { text: greeting }, { quoted: msg });
        return true;
      }
    }
    return false;
  }

  const args = prefixInfo.rest.split(/\s+/);
  const commandName = args.shift().toLowerCase();
  if (!commandName) return false;

  ctx.fullText = text; // Adiciona o texto completo ao contexto
  ctx.args = args;

  const aliasMap = {
    help: 'menu', cmds: 'menu', comandos: 'menu',
    s: 'sticker', fig: 'sticker', owner: 'dono', bot: 'info', portal18: 'cmdsocultos', ocultos: 'cmdsocultos', hidden: 'cmdsocultos', adultvid: 'adultvideo', adultmp4: 'adultvideo',
    yt: 'play', musica: 'play', music: 'play', ytmp3: 'play', ytmp4: 'video', ptv: 'statusvideo', videostatus: 'statusvideo', circular: 'statusvideo', statusvideo: 'statusvideo',
    yt2: 'play2', musica2: 'play2', savefrom: 'play2',
    yt3: 'play3', musica3: 'play3', auto: 'play3',
    tt: 'tiktok', ig: 'instagram', x: 'twitter',
    sp: 'spotify', sc: 'soundcloud', pin: 'pinterest', pinvideo: 'pinmp4', pinterestvideo: 'pinmp4',
    mf: 'mediafire', modapk: 'apk', mod: 'apk', app: 'apk',
    ai: 'ia', chatgpt: 'ia', llm: 'ia', pergunta: 'ia', botia: 'ia',
    img: 'imagem', iaimg: 'imagem', iaimagem: 'imagem',
    weather: 'clima', tempo: 'clima', short: 'encurtar', curto: 'encurtar',
    apis: 'apigratis', freeapi: 'apigratis', advice: 'conselho', fact: 'fato', curiosidade: 'fato', country: 'pais', paises: 'pais', câmbio: 'cambio', moeda: 'cambio', crypto: 'cripto', cachorro: 'dog', gato: 'cat',
    ameme: 'audiomeme', audiomemes: 'audiomeme', placaneymar: 'neymar', imagens: 'gimage', gimg: 'gimage',
    premium: 'vip', vipcmd: 'vipcmds', vipcmds: 'vipcmds', dec: 'decrypt', vpn: 'decrypt', vpndec: 'decrypt',
    updates: 'atualizacoes', novidades: 'atualizacoes', news: 'noticias', notícia: 'noticias', noticias: 'noticias', 'notícias': 'noticias', jornal: 'noticias',
    pesquisar: 'pesquisar', search: 'pesquisar', google: 'pesquisar', procurar: 'pesquisar', resumo: 'resumir', resumir: 'resumir', summarize: 'resumir',
    configs: 'configs', cfg: 'config', arquivo: 'config',
    menuprincipal: 'menu', mainmenu: 'menu', menumain: 'menu', menucompleto: 'menu',
    menudl: 'menudownload', menudownloads: 'menudownload', downloads: 'menudownload', menugames: 'menujogos', menubotoes: 'menubtn', menubotao: 'menubtn',
    menubrincadeiras: 'menudiversao', menuzoeira: 'menudiversao', menufun: 'menudiversao', menumemes: 'menudiversao',
    menucoins: 'menueconomia', menubank: 'menueconomia', menudarkbank: 'menueconomia',
    menualteradores: 'menustatus', menuefeitos: 'menustatus', menuaudio: 'menustatus',
    menulogos: 'menustickers', menulogo: 'menustickers', menusticker: 'menustickers', menufigurinhas: 'menustickers',
    menuadm: 'menugrupo', menuadmin: 'menugrupo', administrador: 'menugrupo', helpadm: 'menugrupo',
    'menu+18': 'cmdsocultos', menu18: 'cmdsocultos',
    menustickers: 'menustickers', menuia: 'menuia', menugrupo: 'menugrupo', menueconomia: 'menueconomia', menufamilia: 'menufamilia', menudiversao: 'menudiversao', menustatus: 'menustatus',
    menueco: 'menueconomia', menufun: 'menudiversao', menumemes: 'menudiversao', menuinfo: 'menustatus',
    estilo: 'menustyle', menustilo: 'menustyle', aparencia: 'menustyle', aparência: 'menustyle', botoes: 'buttonmode', botões: 'buttonmode', tematudo: 'themeglobal', globaltheme: 'themeglobal',
    sfull: 'sfull', fullsticker: 'sfull', stickerfull: 'sfull', sf: 'sfull',
    watermark: 'stickerwm', marcasticker: 'stickerwm', marcadagua: 'stickerwm', 'marca-dagua': 'stickerwm',
    regras: 'regras', rules: 'regras', setrules: 'setregras', setregras: 'setregras',
    inativos: 'inativos', inactive: 'inatividade', inatividade: 'inatividade', atividade: 'atividade',
    avisarinativos: 'inatividade', baninativos: 'inatividade',
    advertir: 'warn', advertencia: 'warn', advertências: 'warnings', advertencias: 'warnings', unwarn: 'unwarn',
    admins: 'admins', tagadmins: 'tagadmins', adm: 'admins', invocadono: 'invokedono', chamardono: 'invokedono', donoajuda: 'invokedono',
    apagar: 'del', deletar: 'del', delete: 'del', d: 'del', mute: 'silenciar', unmute: 'silenciar', calar: 'silenciar',
    adicionar: 'add', addmembro: 'add', tempkick: 'tempban', participantes: 'participantes', membros: 'participantes', members: 'participantes', clean: 'limpar', limpartudo: 'limpar',
    setdesc: 'setdesc', setdescricao: 'setdesc', setnomegrupo: 'setnomegrupo', setsubject: 'setnomegrupo',
    getjid: 'jid', copyjid: 'jid', myjid: 'jid',
    'gênero': 'genero', gender: 'genero', 'alterargênero': 'alterargenero', mudargenero: 'alterargenero',
    guia: 'menu', guia2: 'menubtn', ayuda: 'ia', tienda: 'vip',
    abrazar: 'abracar', abraçar: 'abracar', hug: 'abracar', cuddle: 'abracar', acurrucarse: 'abracar',
    besar: 'beijar', kiss: 'beijar', golpear: 'soco', punch: 'soco', slap: 'tapa', bofetada: 'tapa',
    bailar: 'dancar', dance: 'dancar', coffee: 'cafe', cafezinho: 'cafe', tomarCafe: 'cafe', tomar_cafe: 'cafe',
    meditar: 'meditar', treino: 'treinar', training: 'treinar', estudar: 'estudar', study: 'estudar', cantar: 'cantar', sing: 'cantar',
    coding: 'programar', coder: 'programar', game: 'gamer', jogar: 'gamer', laugh2: 'rir', cry2: 'chorar', bite: 'morder', lick: 'beijar', pat: 'cafune', palmada: 'cafune', poke: 'empurrar',
    cry: 'mimimi', llorar: 'mimimi', happy: 'dancar', feliz: 'dancar', kill: 'matar', laugh: 'fofocar', reirse: 'fofocar',
    wink: 'flertar', seducir: 'flertar', shy: 'flertar', smile: 'dancar', highfive: 'paparico', wave: 'dancar', hola: 'dono', ola: 'dono',
    regrasword: 'regrasword', reglasword: 'regrasword', menufreefire: 'menufreefire', horoscopo: 'horoscopo',
  };
  const canonicalCommand = aliasMap[commandName] || commandName;
  reactions.reactStart(sock, msg, canonicalCommand).catch(() => {});

  // Overrides globais do dashboard para comandos nativos/pacotes
  let commandOverride = null;
  if (packageCommands[canonicalCommand] || nativeCommands[canonicalCommand]) {
    commandOverride = await CommandOverride.findOne({ commandName: canonicalCommand }).catch(() => null);
    if (commandOverride && commandOverride.enabled === false && !isOwner) return false;
    const overrideAccess = commandOverride?.accessLevel;
    if (overrideAccess === 'owner' && !isOwner) {
      await sock.sendMessage(ctx.remoteJid, { text: '🚫 Só Dono.' }, { quoted: msg });
      return true;
    }
    if (overrideAccess === 'premium' && !isOwner) {
      const premUser = await User.findOne({ whatsappNumber: ctx.senderNumber }).catch(() => null);
      if (!premUser || !premUser.isPremium()) {
        await sock.sendMessage(ctx.remoteJid, { text: `⭐ *Comando Premium*\n\nUse ${prefix}vip para ver planos.` }, { quoted: msg });
        return true;
      }
    }
    if (commandOverride?.useCustomResponse && commandOverride.customResponse) {
      await sock.sendMessage(ctx.remoteJid, { text: fillVars(commandOverride.customResponse, ctx) }, { quoted: msg });
      return true;
    }
  }

  if (await isVipCommand(canonicalCommand)) {
    const okVip = await userIsPremiumOrOwner(ctx.senderNumber, isOwner);
    if (!okVip) {
      await sock.sendMessage(ctx.remoteJid, {
        text: `╭━━━〔 ⭐ VIP DARKSIDE 〕━━━╮\n┃ Comando: *${canonicalCommand}*\n┃ Status: Premium/Owner\n┃ Aura necessária: +9999\n╰━━━━━━━━━━━━━━━━━━━━╯\n\nUse *${prefix}vip* para ver planos e liberar ferramentas top.`,
      }, { quoted: msg });
      return true;
    }
  }

  if (ctx.isGroup && groupConfig) {
    const blocked = (groupConfig.blockedCommands || []).map(x => String(x).toLowerCase());
    const blockedSubs = (groupConfig.blockedSubmenus || []).map(x => String(x).toLowerCase());
    const adminControlCmds = ['bloquearcmd','desbloquearcmd','cmdsgrupo','blockcmd','unblockcmd','setnomebot','inatividade','inativos','warn','unwarn','warnings','resetwarn','regras','setregras','motivacao','tagadmins','admins','setdesc','setnomegrupo','del','add','tempban','silenciar','limpar'];
    if (!isOwner && !adminControlCmds.includes(canonicalCommand) &&
        (blocked.includes(commandName) || blocked.includes(canonicalCommand) || blockedSubs.includes(commandName) || blockedSubs.includes(canonicalCommand))) {
      return false;
    }
    if (groupConfig.onlyAdmins && !isOwner && !(await isGroupAdminForHandler(sock, ctx))) return false;
  }

  // Comandos dos pacotes (interactions, family, economy, games, cheats)
  if (packageCommands[canonicalCommand]) {
    try {
      await packageCommands[canonicalCommand]({ sock, msg, ctx, args, isOwner, fillVars, config: commandConfig });
      if (groupConfig) {
        groupConfig.commandsUsedToday++;
        groupConfig.totalCommands++;
        await groupConfig.save();
      }
      await incrementUserCommand(ctx.senderNumber, ctx);
      reactions.reactSuccess(sock, msg, canonicalCommand).catch(() => {});
      return true;
    } catch (err) {
      reactions.reactError(sock, msg, canonicalCommand).catch(() => {});
      console.error('pkg err:', canonicalCommand, err);
      await sock.sendMessage(ctx.remoteJid, { text: '❌ ' + err.message }, { quoted: msg });
      return true;
    }
  }

  if (nativeCommands[canonicalCommand]) {
    try {
      await nativeCommands[canonicalCommand]({ sock, msg, ctx, args, isOwner, fillVars, config: commandConfig });
      if (groupConfig) {
        groupConfig.commandsUsedToday++;
        groupConfig.totalCommands++;
        await groupConfig.save();
      }
      await incrementUserCommand(ctx.senderNumber, ctx);
      reactions.reactSuccess(sock, msg, canonicalCommand).catch(() => {});
      return true;
    } catch (err) {
      reactions.reactError(sock, msg, canonicalCommand).catch(() => {});
      console.error('cmd err:', canonicalCommand, err);
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
    await incrementUserCommand(ctx.senderNumber, ctx);
    reactions.reactSuccess(sock, msg, canonicalCommand).catch(() => {});
    return true;
  } catch (err) {
    reactions.reactError(sock, msg, canonicalCommand).catch(() => {});
    console.error('DB cmd:', err);
    return false;
  }
}

async function handleDecryptRequest(sock, downloadMsg, ctx, docMsg, isOwner, replyMsg = downloadMsg) {
  // Verifica permissão: Dono ou Premium
  const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
  const isPremium = isOwner || (user && user.isPremium());

  if (!isPremium) {
    await sock.sendMessage(ctx.remoteJid, {
      text: `🔓 *VPN DECRYPTER — Recurso Premium*\n\n` +
            `Para usar o decrypter, você precisa ser Premium.\n\n` +
            `💎 Veja os planos: ${config.bot.prefix}vip\n` +
            `📞 wa.me/${config.owner.number}`,
    }, { quoted: replyMsg });
    return true;
  }

  await sock.sendMessage(ctx.remoteJid, { react: { text: '🔓', key: replyMsg.key } });

  try {
    const buffer = await mediaHandler.downloadFromMessage(downloadMsg);
    const fileName = docMsg.fileName || 'arquivo.bin';
    const result = await decrypter.decrypt(fileName, buffer);
    const formatted = formatForWhatsApp(result, config);

    // Se muito grande, divide
    if (formatted.length > 4000) {
      const chunks = chunkString(formatted, 3800);
      for (const c of chunks) await sock.sendMessage(ctx.remoteJid, { text: c }, { quoted: replyMsg });
    } else {
      await sock.sendMessage(ctx.remoteJid, { text: formatted }, { quoted: replyMsg });
    }

    // Envia JSON completo como arquivo também
    const jsonBuf = Buffer.from(JSON.stringify(result, null, 2), 'utf-8');
    await sock.sendMessage(ctx.remoteJid, {
      document: jsonBuf, fileName: `${fileName}.decrypted.json`, mimetype: 'application/json',
      caption: '📄 JSON completo da decryptação',
    }, { quoted: replyMsg });

    await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: replyMsg.key } });

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
    await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: replyMsg.key } });
    await sock.sendMessage(ctx.remoteJid, {
      text: `❌ *Erro ao decryptar*\n\n${err.message}\n\nFormatos suportados: .ehi, .ehic, .hat, .npv4, .dark, .any, .tls, .conf, .nm, .ovpn, .ssh, .json`,
    }, { quoted: replyMsg });
    try {
      await DecryptLog.create({
        user: user?._id, username: user?.username || ctx.pushName,
        whatsappNumber: ctx.senderNumber, fileName: docMsg?.fileName,
        source: 'whatsapp', success: false, error: err.message,
      });
    } catch (e) {}
  }
  return true;
}


const DECRYPT_URL_EXT_RE = /\.(ehi|ehic|hat|npv|npv4|npv7|npv8|npvt|dark|darkt|any|tls|nm|nmess|ovpn|ssh|ssl|json|conf|wg|wireguard|txt|bdnet|bd|apna|apnalite|wyrvpn|wyr)(?:[/?#]|$)/i;

function isDecryptFileUrl(url) {
  return /mediafire\.com/i.test(url) || DECRYPT_URL_EXT_RE.test(url);
}

function fileNameFromUrl(url, fallback = 'config.ehi') {
  try {
    const u = new URL(url);
    let name = pathDecode(u.pathname.split('/').filter(Boolean).pop() || fallback);
    if (!DECRYPT_URL_EXT_RE.test(name)) {
      const pathParts = u.pathname.split('/').filter(Boolean).map(pathDecode);
      name = pathParts.find(x => DECRYPT_URL_EXT_RE.test(x)) || fallback;
    }
    return name.replace(/[\\/:*?"<>|]+/g, '_');
  } catch {
    return fallback;
  }
}

function pathDecode(s) {
  try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); }
  catch { return String(s).replace(/\+/g, ' '); }
}

async function resolveMediaFireDirectUrl(url) {
  const page = (await mediaHandler.fetchBuffer(url)).toString('utf-8');
  const patterns = [
    /href=["'](https:\/\/download[^"'<>]+)["']/i,
    /id=["']downloadButton["'][^>]+href=["']([^"']+)["']/i,
    /"download_link"\s*:\s*"([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = page.match(re);
    if (m) return m[1].replace(/\\\//g, '/').replace(/&amp;/g, '&');
  }
  throw new Error('Não encontrei o link direto do MediaFire.');
}

async function fetchDecryptFileFromUrl(url) {
  let finalUrl = url;
  if (/mediafire\.com/i.test(url) && !/download\d+\.mediafire\.com/i.test(url)) {
    finalUrl = await resolveMediaFireDirectUrl(url);
  }
  const buffer = await mediaHandler.fetchBuffer(finalUrl);
  if (!buffer || buffer.length < 16) throw new Error('Arquivo vazio ou inválido.');
  if (buffer.length > 30 * 1024 * 1024) throw new Error('Arquivo muito grande para decrypt via WhatsApp (máx. 30MB).');
  return { buffer, fileName: fileNameFromUrl(finalUrl, 'config.ehi'), finalUrl };
}

function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size));
  return chunks;
}

async function incrementUserCommand(number, ctx = null) {
  try {
    const u = await User.findOne({ whatsappNumber: number });
    if (u) { u.commandsUsed = (u.commandsUsed || 0) + 1; u.lastSeenAt = new Date(); await u.save(); }
  } catch (e) {}
  if (ctx?.isGroup && ctx.senderJid) {
    try {
      const GroupMemberActivity = require('../database/models/GroupMemberActivity');
      await GroupMemberActivity.findOneAndUpdate(
        { groupJid: ctx.remoteJid, memberJid: ctx.senderJid },
        {
          $set: { memberNumber: ctx.senderNumber, pushName: ctx.pushName || '', lastCommandAt: new Date(), lastMessageAt: new Date() },
          $inc: { commands: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (e) {}
  }
}

async function getStickerWatermarkConfigForHandler(ctx) {
  const enabled = await botConfigCache.get('sticker_watermark_enabled', true).catch(() => true);
  const packName = await botConfigCache.get('sticker_pack_name', '').catch(() => '');
  const authorName = await botConfigCache.get('sticker_author_name', '').catch(() => '');
  const watermarkText = await botConfigCache.get('sticker_watermark_text', config.bot.name || 'DARK BOT').catch(() => config.bot.name || 'DARK BOT');
  const visible = await botConfigCache.get('sticker_visible_watermark', false).catch(() => false);
  return {
    packName: enabled ? (packName || `${config.bot.name} • ${config.owner.name}`) : ' ',
    authorName: enabled ? (authorName || `${ctx.pushName} | ${ctx.groupName || 'PV'}`) : ' ',
    watermarkText: enabled ? watermarkText : '',
    visibleWatermark: enabled && (visible === true || visible === 'true' || visible === 'on' || visible === 1 || visible === '1'),
  };
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
      ...(await getStickerWatermarkConfigForHandler(ctx)),
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
