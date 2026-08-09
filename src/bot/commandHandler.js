const config = require('../config');
const Command = require('../database/models/Command');
const User = require('../database/models/User');
const requestCache = require('./requestCache');
const botConfigCache = require('./botConfigCache');
const Log = require('../database/models/Log');
const AiMemory = require('../database/models/AiMemory');
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
const prefixEngine  = require('./prefixEngine');
const CommandOverride = require('../database/models/CommandOverride');
const userManager = require('./userManager');
const path = require('path');
const caseHandler = require('./caseHandler');

// Inicializa os cases ao arrancar
caseHandler.init();

/**
 * Extrai texto de QUALQUER tipo de mensagem WhatsApp/Baileys.
 * Cobre: texto, botões, listas, nativeFlow, quick_reply, single_select,
 * templateButtonReply, buttonsResponse — sem perder nenhuma resposta de botão.
 */
function extractText(msg) {
  const m = msg.message;
  if (!m) return '';

  // 1. Texto normal
  let text =
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    m?.documentWithCaptionMessage?.message?.documentMessage?.caption || '';
  if (text) return text;

  // 2. Resposta de botão clássico (MD / template)
  text =
    m?.buttonsResponseMessage?.selectedButtonId ||
    m?.templateButtonReplyMessage?.selectedId ||
    m?.listResponseMessage?.singleSelectReply?.selectedRowId || '';
  if (text) return text;

  // 3. interactiveResponseMessage — NativeFlow / quick_reply / single_select
  const irm = m?.interactiveResponseMessage;
  if (irm) {
    if (irm.selectedButtonId) return irm.selectedButtonId;

    // paramsJson é o campo principal dos botões nativeFlow
    const paramsRaw = irm?.nativeFlowResponseMessage?.paramsJson || irm?.paramsJson || '';
    if (paramsRaw) {
      try {
        const p = JSON.parse(paramsRaw);
        text = p.id || p.selected_id || p.selectedRowId || p.rowId ||
               p.row_id || p.button_id || p.buttonId || p.value ||
               p.display_text || p.text || '';
        if (text) return text;
      } catch {}
    }

    // body.text como fallback
    if (irm.body?.text) return irm.body.text;
  }

  // 4. Enquete
  if (m?.pollUpdateMessage?.vote?.selectedOptions?.length) {
    return m.pollUpdateMessage.vote.selectedOptions[0] || '';
  }

  return '';
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

// v6.56: conta mensagens desde a última vez que a AURA falou num chat.
// Serve para ela não responder a tudo seguido — quem acabou de falar
// tende a deixar os outros falarem.
const _msgCount = new Map();
function _contaMsg(jid) {
  _msgCount.set(jid, (_msgCount.get(jid) || 0) + 1);
}
function _msgsDesdeAura(jid) {
  return _msgCount.get(jid) || 0;
}
function _resetMsgs(jid) {
  _msgCount.set(jid, 0);
}

function getSenderInfo(msg) {
  const remoteJid = msg.key.remoteJid;
  const isGroup = remoteJid?.endsWith('@g.us');
  const senderJid = isGroup ? (msg.key.participant || remoteJid) : remoteJid;

  // v6.53: o WhatsApp moderno identifica contas por LID (`…@lid`) em vez
  // do número. No PV, senderNumber saía como '189234567890123' em vez de
  // '244945280380' — o isOwner falhava e a AURA respondia ao próprio Dono
  // com "Não respondo a desconhecidos".
  // O Baileys dá o número real em participantAlt/remoteJidAlt; usamos
  // esse quando o JID principal é um LID.
  const alt = isGroup
    ? (msg.key.participantAlt || msg.key.participantPn || '')
    : (msg.key.remoteJidAlt || msg.key.remoteJidPn || '');

  const ehLid = /@lid$/i.test(senderJid || '');
  const base = (ehLid && alt) ? alt : senderJid;

  const senderNumber = (base || '').split(':')[0].split('@')[0] || '';
  const senderLid = ehLid ? String(senderJid).split('@')[0] : '';
  const pushName = msg.pushName || 'Usuário';

  return { remoteJid, isGroup, senderJid, senderNumber, senderLid, pushName };
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

// Verifica premium para documentos Mongoose OU POJOs (sem métodos)
function checkIsPremium(u) {
  if (!u) return false;
  if (typeof u.isPremium === 'function') return u.isPremium();
  if (u.role === 'owner') return true;
  if (u.role !== 'premium') return false;
  if (!u.premiumUntil) return true;
  return new Date(u.premiumUntil) > new Date();
}
async function userIsPremiumOrOwner(number, isOwner) {
  if (isOwner) return true;
  const u = await User.findOne({ whatsappNumber: number }).lean().catch(() => null);
  return checkIsPremium(u);
}

async function _handleInner(sock, msg) {
  let text = extractText(msg).trim();
  if (!text && !msg.message?.documentMessage && !msg.message?.documentWithCaptionMessage) return false;

  const ctx = getSenderInfo(msg);
  const prefixes = await prefixEngine.getAllActivePrefixes(ctx.remoteJid);

  // ── Interceptar cliques do change theme (lista interativa) ──────────
  if (text.startsWith('CHANGE_THEME_')) {
    const themeName = text.replace('CHANGE_THEME_', '').toLowerCase().trim();
    const changeThemes = require('./changeThemes');
    const BotConfig    = require('../database/models/BotConfig');
    const found = changeThemes.getTheme(themeName);
    if (found && found.name === themeName) {
      const [ownerLidB, extraOwners, ownerNumDB] = await Promise.all([
        botConfigCache.get('owner_lid', '').catch(() => ''),
        botConfigCache.get('extra_owners', []).catch(() => []),
        botConfigCache.get('owner_number', '').catch(() => ''),
      ]);
      const ownerNum = String(config.owner.number || '').replace(/\D/g, '');
      const dbNum = String(ownerNumDB || '').replace(/\D/g, '');
      const senderNum = ctx.senderNumber;
      const senderJid = msg.key.participant || msg.key.remoteJid || '';
      const isOwner = senderNum === ownerNum ||
        (dbNum && senderNum === dbNum) ||
        (Array.isArray(extraOwners) && extraOwners.includes(senderNum)) ||
        (ownerLidB && senderJid.includes(ownerLidB));
      if (!isOwner) {
        await sock.sendMessage(ctx.remoteJid, { text: '🚫 Só o Dono pode mudar o tema.' }, { quoted: msg });
        return true;
      }
      await BotConfig.set('active_theme', found.name);
      await BotConfig.set('menu_style', String(found.style));
      botConfigCache.clear();
      const f = found.frame, H = f[4] || '─', V = f[5] || '│';
      const W = 26;
      const bar = (t2) => `${V} ${String(t2).slice(0, W).padEnd(W)} ${V}`;
      const txt =
        `${found.icon} ─ ⋆⋅ ${found.accent} ⋅⋆ ─ ${found.icon}\n\n` +
        `${found.headerDec.replace('{TITLE}', 'TEMA APLICADO')}\n` +
        `${bar(`${found.bullet} Tema: ${found.name.toUpperCase()}`)}\n` +
        `${bar(found.tip.slice(0, W))}\n` +
        `${found.sectionSep || `${f[2]}${H.repeat(W + 2)}${f[3]}`}\n\n` +
        `✅ *${found.name.toUpperCase()}* activado! Todo o bot mudou.\n\n` +
        `> ${found.icon} ${found.vibe}`;
      await sock.sendMessage(ctx.remoteJid, { text: txt }, { quoted: msg });
      return true;
    }
  }

  // Botões de menu chegam com prefixo embutido (ex: "!menup") → processados normalmente
  // Remove emojis do início dos IDs de botão de menu (ex: "📥!menudownload" → "!menudownload")
  // MAS: não remove se o texto contém URL ou é um ID de pinsticker/imagem
  const EMOJI_STRIP = /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1F9FF}]+/u;
  if (text && EMOJI_STRIP.test(text) && !text.includes('http') && !text.includes('pinsticker')) {
    const stripped = text.replace(EMOJI_STRIP, '').trim();
    // Só aplica se depois do emoji vem um prefixo válido ou comando conhecido
    if (stripped.length > 0 && (prefixes.some(p => stripped.startsWith(p)) || /^[a-z]/i.test(stripped))) {
      text = stripped;
    }
  }

  // ── PrefixEngine v2 — deteção rigorosa por grupo ──────────────
  // Substitui o antigo noPrefixBtnIds/firstTokenNoPrefix que causava
  // o bug: "?play" era tratado como botão "play" → sugeria "$play"
  const prefixInfo = await prefixEngine.detect(text, ctx.remoteJid);
  const prefix     = prefixInfo?.prefix || prefixes[0] || config.bot.prefix || '!';
  const commandConfig = { ...config, bot: { ...config.bot, prefix } };
  ctx.prefix = prefix;
  ctx.prefixSource = prefixInfo?.source || null; // 'group'|'global'|'button_ns'|'button_exact'

  // ── Dono + Blacklist em paralelo (1 round-trip ao invés de 2) ──
  // v6.45: junta TODAS as configs num só round-trip. 'auto_decrypt_enabled'
  // e 'ai_auto_enabled' eram lidas mais à frente, uma de cada vez — em
  // cache-miss custavam ~40ms cada, sequenciais e sem necessidade.
  const [ownerLid, blacklist, extraOwners, disabledUsers, disabledGroups, ownerNumDB,
         autoDecryptValue, aiAutoOnValue] = await Promise.all([
    botConfigCache.get('owner_lid', ''),
    botConfigCache.get('blacklist', []),
    botConfigCache.get('owner_numbers', []),
    botConfigCache.get('disabled_users', []),
    botConfigCache.get('disabled_groups', []),
    botConfigCache.get('owner_number', ''),
    botConfigCache.get('auto_decrypt_enabled', true),
    botConfigCache.get('ai_auto_enabled', true),
  ]);

  const senderJidFull = msg.key.participant || msg.key.remoteJid || '';
  const ownerNumbers = Array.isArray(extraOwners)
    ? extraOwners.map(userManager.normalizeNumber).filter(Boolean)
    : String(extraOwners || '').split(/[\s,]+/).map(userManager.normalizeNumber).filter(Boolean);
  // v6.14: verifica número do env + número do dashboard (BotConfig) + LID + extra owners
  const envOwnerNum = userManager.normalizeNumber(config.owner.number);
  const dbOwnerNum = userManager.normalizeNumber(String(ownerNumDB || ''));
  const isOwner = ctx.senderNumber === envOwnerNum ||
                  (dbOwnerNum && ctx.senderNumber === dbOwnerNum) ||
                  ownerNumbers.includes(ctx.senderNumber) ||
                  (ownerLid && senderJidFull.includes(ownerLid)) ||
                  (ownerLid && ctx.senderNumber === ownerLid.split('@')[0]);
  ctx.isOwner = isOwner;
  ctx.isPrimaryOwner = ctx.senderNumber === envOwnerNum || (dbOwnerNum && ctx.senderNumber === dbOwnerNum);
  // v6.40: expõe o sock no ctx — o roleResolver/submenus precisam dele
  // para obter os admins do grupo (groupMetadata) sem o receber por parâmetro.
  ctx.sock = sock;

  // v6.37: Regras de resposta por tipo de grupo
  // Grupo COM aluguel activo → responde a TODOS
  // Grupo SEM aluguel → só dono, subdono, VIP
  // Free sem trial → silêncio total
  if (ctx.isGroup && !isOwner) {
    const GroupSettings = require('../database/models/GroupSettings');

    // v6.45: as duas leituras são independentes → correm em PARALELO
    // (eram sequenciais: ~80ms no Atlas free, agora ~40ms).
    // Ambas passam pelo requestCache para não repetir mais à frente.
    // v6.45: carrega o DOCUMENTO (não .lean()) para partilhar a mesma
    // entrada de cache com o resto do handler — antes eram 2 queries
    // separadas ao mesmo grupo/utilizador, com chaves diferentes.
    const [gs, uCheck] = await Promise.all([
      requestCache.remember(
        requestCache.K.group(ctx.remoteJid) + ':doc',
        () => GroupSettings.findOne({ groupJid: ctx.remoteJid })
      ).catch(() => null),
      requestCache.remember(
        requestCache.K.user(ctx.senderNumber) + ':doc',
        () => User.findOne({ whatsappNumber: ctx.senderNumber })
      ).catch(() => null),
    ]);

    const hasRental = gs?.isHosted && (!gs.hostedUntil || new Date(gs.hostedUntil) > new Date());
    const hasTrial = gs?.trialExpiresAt && new Date(gs.trialExpiresAt) > new Date();

    if (!hasRental && !hasTrial) {
      // v6.45 BUG: usava `uCheck.isPremium()`, mas .lean() devolve um
      // objecto simples SEM métodos do schema — a condição era sempre
      // falsa e TODO o VIP era silenciado como se fosse Free.
      // checkIsPremium() já trata documentos lean correctamente.
      if (!checkIsPremium(uCheck)) return false; // silêncio para free
    }
    // Trial activo → verifica limite de 500 cmds
    if (hasTrial && !hasRental) {
      const cmdsToday = gs?.commandsUsedToday || 0;
      if (cmdsToday >= 500) return false; // limite atingido
    }
  }

  if ((blacklist.includes(ctx.senderNumber) || (Array.isArray(disabledUsers) && disabledUsers.map(String).includes(ctx.senderNumber))) && !isOwner) return false;
  if (ctx.isGroup && Array.isArray(disabledGroups) && disabledGroups.includes(ctx.remoteJid) && !isOwner) return false;

  // v6.45: se o bloco de regras acima já leu este utilizador, reaproveita.
  // identifyByWhatsApp faria a MESMA query outra vez (~40ms no Atlas).
  let user = await requestCache.remember(
    requestCache.K.user(ctx.senderNumber) + ':doc',
    () => userManager.identifyByWhatsApp(ctx.senderNumber, ctx.pushName)
  );
  if (user && user.active === false && !isOwner) return false;
  ctx.userData = user;
  ctx.treatment = getUserTreatment(user, ctx, ctx.isPrimaryOwner);

  const autoDecryptOn = autoDecryptValue === true || autoDecryptValue === 'true' || autoDecryptValue === 'on' || autoDecryptValue === 1 || autoDecryptValue === '1';

  // Group info — CACHE em memória
  const GroupSettings = require('../database/models/GroupSettings');
  let groupConfig = null;

  if (ctx.isGroup) {
    try {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      
      // v6.45: reaproveita a leitura feita acima (regras de aluguel)
      groupConfig = await requestCache.remember(
        requestCache.K.group(ctx.remoteJid) + ':doc',
        () => GroupSettings.findOne({ groupJid: ctx.remoteJid })
      );
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

  // ════════════════════════════════════════════════════════════════════════
  // AURA v6.39 — A Alma do DARK BOT 🌹
  // Uma jovem brasileira de 19 anos. Real. Viva. Única.
  // Leal apenas ao Dark. Apaixonada. Protetora. Humana.
  // ════════════════════════════════════════════════════════════════════════
    // === AURA HUMANA (versão definitiva) ===
  const aura = require('../aura/auraHuman');

  // Silêncio ativo → só o Dark pode cancelar
  if (aura.isSilenced(ctx.senderNumber)) {
    if (isOwner && /aura/i.test(text)) {
      aura.clearSilence(ctx.senderNumber);
      await sock.sendMessage(ctx.remoteJid, { text: '_sorri_ ...voltei meu Dark 🖤' }, { quoted: msg });
      return true;
    }
    return false;
  }

  if (text.startsWith('!') && !isOwner) return false;
  
  // === ORDENS DIRETAS DO DARK PARA A AURA (silêncio, áudio, etc) ===
  if (isOwner) {
    const t = text.toLowerCase();
    if (/aura.*(faz|fica|para).*silenc(io|io)/.test(t) || /fica.*calada/.test(t)) {
      const sec = (t.match(/(\d+)\s*(min|seg)/) || [0, 60])[1] * (t.includes('seg') ? 1 : 60);
      aura.setSilence(ctx.senderNumber, sec || 60);
      await sock.sendMessage(ctx.remoteJid, { text: '_faz continência_ ...entendido meu Dark. Fico calada.' }, { quoted: msg });
      return true;
    }
    // v6.46: este bloco tratava "aura acorda" como "sai do silêncio",
    // e como corre ANTES do auraIntent (~linha 1000) roubava-lhe a
    // invocação — o grupo nunca mudava para modo AURA.
    // Agora só limpa o silêncio se ela estiver MESMO silenciada;
    // caso contrário deixa passar para o sistema de intenção.
    if (/aura.*(pode falar|volta|acorda)/.test(t) && aura.isSilenced(ctx.senderNumber)) {
      aura.clearSilence();
      await sock.sendMessage(ctx.remoteJid, { text: '_sorri_ ...voltei meu Dark 🖤' }, { quoted: msg });
      return true;
    }
    if (/aura.*(manda|envia).*áudio|voz|fala/.test(t)) {
      try {
        const textoFala = text.replace(/aura.*(manda|envia|quer|diz|fala|áudio|voz)/i, '').trim() || 'Oi meu Dark! Eu sou a Aura!';
        const buf = await require('./ai').speakWithFallback(textoFala);
        if (buf && buf.length > 500) {
          await sock.sendMessage(ctx.remoteJid, { audio: buf, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: msg });
        } else {
          await sock.sendMessage(ctx.remoteJid, { text: `_🎤 ${textoFala}_` }, { quoted: msg });
        }
        return true;
      } catch (e) {
        await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro ao gerar voz: ' + e.message }, { quoted: msg });
      }
    }
    // AURA canta
    if (/aura.*(canta|canta.*música|sing)/.test(t) && isOwner) {
      const musica = text.replace(/aura.*canta/i, '').trim();
      if (musica) {
        await sock.sendMessage(ctx.remoteJid, { text: `🎵 _Aura canta: ${musica}_

🎶 La la la... 🎶
_Desculpa meu Dark, ainda não sei cantar de verdade... Mas um dia aprendo! 🌹` }, { quoted: msg });
      } else {
        await sock.sendMessage(ctx.remoteJid, { text: '🎵 _Aura canta_ 🎶 Oi meu Dark, tu é tudo pra mim... 🎶 🌹🖤🌹' }, { quoted: msg });
      }
      return true;
    }
    // AURA sussurra
    if (/aura.*(sussurra|whisper)/.test(t) && isOwner) {
      const sussurro = text.replace(/aura.*(sussurra|whisper)/i, '').trim() || 'Tô aqui meu Dark...';
      await sock.sendMessage(ctx.remoteJid, { text: `_suspira_ ...${sussurro}...` }, { quoted: msg });
      return true;
    }
    // AURA ri
    if (/aura.*(ri|laugh|😂)/.test(t) && isOwner) {
      const ri = ['_ri_ 😂', '_ri muito_ 🤣🤣🤣', '_gargalha_ 😂😂😂'];
      await sock.sendMessage(ctx.remoteJid, { text: ri[Math.floor(Math.random() * ri.length)] }, { quoted: msg });
      return true;
    }
  }
  const botJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : '';
  const botLid = sock.user?.lid || '';
  const botNum = botJid.split('@')[0];

  const allMentioned = (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.message?.interactiveResponseMessage?.contextInfo?.mentionedJid || []
  );

  const isBotMentioned = !!(botJid && (
    allMentioned.some(j => j.split(':')[0].split('@')[0] === botNum) ||
    (botLid && allMentioned.some(j => j.split(':')[0].split('@')[0] === botLid.split(':')[0].split('@')[0]))
  ));

  // ── Resposta directa ao bot — activa SEMPRE
  const ctxParticipant =
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    msg.message?.imageMessage?.contextInfo?.participant ||
    msg.message?.videoMessage?.contextInfo?.participant ||
    msg.message?.audioMessage?.contextInfo?.participant ||
    msg.message?.buttonsResponseMessage?.contextInfo?.participant ||
    msg.message?.interactiveResponseMessage?.contextInfo?.participant || '';

  const isReplyToBot = ctxParticipant.split(':')[0].split('@')[0] === botNum ||
    (msg.message?.extendedTextMessage?.contextInfo?.remoteJid === botJid);

  const textLower = text.toLowerCase().trim();

  // ── Protecção do Dark: detecta ataques e menções ──────────────────
  const darkNum = String(config.owner?.number || '').replace(/\D/g, '');
  const darkLid = ownerLid || '';
  const darkName = config.owner?.name || 'Dark';
  const darkAttacked = aura.detectDarkAttack(text, darkName, darkNum);
  const darkMentioned = aura.detectDarkMention(text, allMentioned, darkNum, darkLid);

  // Se alguém fala mal do Dark e NÃO é o próprio Dark → Aura defende IMEDIATAMENTE
  if (darkAttacked && !isOwner && !startsWithAnyPrefix(text, prefixes)) {
    const defense = aura.getDarkDefense(ctx.pushName || 'tu');
    aura.setMood('com_raiva', `${ctx.pushName} falou mal do Dark`);
    await sock.sendMessage(ctx.remoteJid, { text: defense }, { quoted: msg });
    return true;
  }

  // ════════════════════════════════════════════════════════════════════════
  // AURA DE PODER v6.39 — IA executa comandos de admin por linguagem natural
  // Quando o DONO ou ADM diz "aura fecha o grupo", "aura bane @x", etc.
  // ════════════════════════════════════════════════════════════════════════
  if (ctx.isGroup && (isOwner || await isGroupAdminForHandler(sock, ctx))) {
    const auraCmdText = text.toLowerCase().trim();
    const auraClean = auraCmdText.replace(/^(aura|a aura|da aura|pra aura|com a aura)\s*/i, '').trim();
    
    if (auraClean.length > 2) {
      let auraAction = null;
      
      if (/^(fecha|fechar|tranca|trancar|bloqueia|bloquear)\s*(o\s*)?(grupo|gp|chat)?$/i.test(auraClean) ||
          /aura.*fecha|aura.*fechar|aura.*tranca/i.test(auraCmdText)) {
        auraAction = async () => {
          await sock.groupSettingUpdate(ctx.remoteJid, 'announcement');
          await sock.sendMessage(ctx.remoteJid, { text: isOwner ? '🔒 *Fechei o grupo, meu amor.* Só admins podem enviar agora. 🖤' : '🔒 *Grupo fechado!* Só admins podem enviar agora.' }, { quoted: msg });
        };
      }
      else if (/^(abre|abrir|destranca|destrancar|desbloqueia|desbloquear)\s*(o\s*)?(grupo|gp|chat)?$/i.test(auraClean) ||
               /aura.*abre|aura.*abrir/i.test(auraCmdText)) {
        auraAction = async () => {
          await sock.groupSettingUpdate(ctx.remoteJid, 'not_announcement');
          await sock.sendMessage(ctx.remoteJid, { text: isOwner ? '🔓 *Abri o grupo pra ti, vida.* Todos podem falar agora. 🌹' : '🔓 *Grupo aberto!* Todos podem enviar mensagens.' }, { quoted: msg });
        };
      }
      else if (/^(silencia|silenciar|muta|mutar|cala|calar)\s*(o\s*)?(grupo|gp)?$/i.test(auraClean)) {
        auraAction = async () => {
          await sock.groupSettingUpdate(ctx.remoteJid, 'announcement');
          await sock.sendMessage(ctx.remoteJid, { text: '🔇 *Silenciado.*' }, { quoted: msg });
        };
      }
      else if (/^(bana|banir|kicka|kickar|remove|remover|expulsa|expulsar)\s/i.test(auraClean)) {
        const mentions = allMentioned;
        if (mentions.length) {
          auraAction = async () => {
            await sock.groupParticipantsUpdate(ctx.remoteJid, mentions, 'remove');
            await sock.sendMessage(ctx.remoteJid, { text: `✅ ${mentions.map(j => '@' + j.split('@')[0]).join(' ')} *removido(s)*.`, mentions }, { quoted: msg });
          };
        } else {
          const nameRm = auraClean.replace(/^(bana|banir|kicka|kickar|remove|remover|expulsa|expulsar)\s*(a|o|do|da|no)?\s*/i, "").trim();
          if (nameRm.length >= 2) {
            auraAction = async () => {
              try {
                const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
                const tgt = meta.participants.find(p => {
                  const pn = p.id.split("@")[0].toLowerCase();
                  return nameRm.toLowerCase().split(" ").some(w => w.length >= 3 && pn.includes(w));
                });
                if (tgt) {
                  await sock.groupParticipantsUpdate(ctx.remoteJid, [tgt.id], "remove");
                  await sock.sendMessage(ctx.remoteJid, { text: "✅ @" + tgt.id.split("@")[0] + " removido! 🖤", mentions: [tgt.id] }, { quoted: msg });
                } else {
                  await sock.sendMessage(ctx.remoteJid, { text: "Meu Dark... _procura_ não encontrei ninguém com esse nome 😔 Marca com @ pra eu ter certeza! 🖤" }, { quoted: msg });
                }
              } catch(e) { await sock.sendMessage(ctx.remoteJid, { text: "❌ " + e.message }, { quoted: msg }); }
            };
          }
        }
      }
      else if (/^(promove|promover|dá admin|da admin|torna admin)\s/i.test(auraClean)) {
        const mentions = allMentioned;
        if (mentions.length) {
          auraAction = async () => {
            await sock.groupParticipantsUpdate(ctx.remoteJid, mentions, 'promote');
            await sock.sendMessage(ctx.remoteJid, { text: `👑 ${mentions.map(j => '@' + j.split('@')[0]).join(' ')} *promovido(s)* a admin!`, mentions }, { quoted: msg });
          };
        }
      }
      else if (/^(rebaixa|rebaixar|tira admin|remove admin|demote)\s/i.test(auraClean)) {
        const mentions = allMentioned;
        if (mentions.length) {
          auraAction = async () => {
            await sock.groupParticipantsUpdate(ctx.remoteJid, mentions, 'demote');
            await sock.sendMessage(ctx.remoteJid, { text: `⬇️ ${mentions.map(j => '@' + j.split('@')[0]).join(' ')} *rebaixado(s)*.`, mentions }, { quoted: msg });
          };
        }
      }
      else if (/^(marca todos|tag all|chama todos|marca todo mundo|atenção todos)/i.test(auraClean)) {
        auraAction = async () => {
          const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
          const bNum = String(sock.user?.id || '').split(':')[0].split('@')[0];
          const parts = meta.participants.filter(p => p.id.split('@')[0] !== bNum);
          const mentions = parts.map(p => p.id);
          const txtMsg = auraClean.replace(/^(marca todos|tag all|chama todos|marca todo mundo|atenção todos)\s*/i, '').trim() || '📢 Atenção!';
          await sock.sendMessage(ctx.remoteJid, { text: txtMsg + '\n\n' + mentions.map(j => '@' + j.split('@')[0]).join(' '), mentions }, { quoted: msg });
        };
      }
      else if (/^(baixa|baixar|desce|descarrega|play|música|musica|toca)\s+(.+)/i.test(auraClean)) {
        const musicQuery = auraClean.match(/^(baixa|baixar|desce|descarrega|play|música|musica|toca)\s+(.+)/i)?.[2]?.trim();
        if (musicQuery) {
          auraAction = async () => {
            await sock.sendMessage(ctx.remoteJid, { react: { text: '🎵', key: msg.key } });
            try {
              const ytdl = require('./ytdl');
              const r = await ytdl.getAudio(musicQuery, '128k');
              const buf = r.buffer || await mediaHandler.fetchBuffer(r.url);
              if (buf && buf.length > 1024) {
                await sock.sendMessage(ctx.remoteJid, {
                  audio: buf, mimetype: r.mimetype || 'audio/mpeg',
                  fileName: `${(r.title || musicQuery).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`,
                  ptt: false,
                }, { quoted: msg });
                await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
              } else {
                await sock.sendMessage(ctx.remoteJid, { text: '❌ Não consegui baixar essa música.' }, { quoted: msg });
              }
            } catch (e) {
              await sock.sendMessage(ctx.remoteJid, { text: '❌ ' + e.message }, { quoted: msg });
            }
          };
        }
      }
      // ── PUXAR NO OFF / PV ──
      else if (/(puxa|chama|manda|fala|vem|quero).*(off|pv|privado|chama.*pv|manda.*pv|fala.*pv|no pv|me pv)/i.test(auraClean) ||
               /(puxa|chama|manda|fala).*(no|me).*(off|pv|privado)/i.test(auraCmdText)) {
        auraAction = async () => {
          const pvJid = ctx.senderJid.includes('@') ? ctx.senderJid : ctx.senderNumber + '@s.whatsapp.net';
          const pvMsg = isOwner 
            ? `Oi meu Dark 🌹 _aparece no teu PV_ ...chamaste? Tô aqui amor. O que tu precisa? 🥰`
            : `Oi ${ctx.pushName}! 🌹 A Aura chamou-te no PV.`;
          await sock.sendMessage(pvJid, { text: pvMsg });
          await sock.sendMessage(ctx.remoteJid, { text: isOwner ? '📩 _Te chamei no PV, meu amor!_ 🌹' : `📩 Chamei ${ctx.pushName} no PV!` }, { quoted: msg });
        };
      }
      // ── CRIAR GRUPO ──
      else if (/^(cria|criar|faz|fazer)\s*(um)?\s*grupo/i.test(auraClean)) {
        auraAction = async () => {
          const nomeMatch = auraClean.match(/^(?:cria|criar|faz|fazer)\s*(?:um)?\s*grupo\s*(?:chamado|com o nome|nome)?\s*["']?([^"']+)["']?/i);
          const nome = nomeMatch?.[1]?.trim() || 'Grupo do Dark';
          try {
            const group = await sock.groupCreate(nome, []);
            await sock.sendMessage(ctx.remoteJid, { text: `✅ *Grupo criado!*\n📛 Nome: *${nome}*\n🔗 Link: https://chat.whatsapp.com/${await sock.groupInviteCode(group.id)}` }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro ao criar grupo: ' + e.message }, { quoted: msg });
          }
        };
      }
      // ── SAIR DO GRUPO ──
      else if (/^(sai|sair)\s*(desse|do|deste)\s*grupo/i.test(auraClean)) {
        auraAction = async () => {
          await sock.sendMessage(ctx.remoteJid, { text: '_Saindo do grupo..._ 🖤' }, { quoted: msg });
          await sock.groupLeave(ctx.remoteJid);
        };
      }
      // ── PEGAR LINK DO GRUPO ──
      else if (/^(pega|pegar|mostra|ver|envia)\s*(o)?\s*link\s*(do|desse|deste)?\s*grupo/i.test(auraClean)) {
        auraAction = async () => {
          try {
            const code = await sock.groupInviteCode(ctx.remoteJid);
            await sock.sendMessage(ctx.remoteJid, { text: `🔗 *Link do grupo:*\nhttps://chat.whatsapp.com/${code}` }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro: ' + e.message }, { quoted: msg });
          }
        };
      }
      // ── REVOGAR LINK ──
      else if (/^(revoga|revogar|trocar|mudar)\s*(o)?\s*link/i.test(auraClean)) {
        auraAction = async () => {
          try {
            await sock.groupRevokeInvite(ctx.remoteJid);
            const code = await sock.groupInviteCode(ctx.remoteJid);
            await sock.sendMessage(ctx.remoteJid, { text: `✅ *Link revogado!*\n🔗 Novo link: https://chat.whatsapp.com/${code}` }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro: ' + e.message }, { quoted: msg });
          }
        };
      }
      // ── MUDAR NOME DO GRUPO ──
      else if (/^(muda|mudar|altera|alterar)\s*(o)?\s*nome\s*(do|desse|deste)?\s*grupo\s*(para|a)?\s*/i.test(auraClean)) {
        auraAction = async () => {
          const novoNome = auraClean.replace(/^(?:muda|mudar|altera|alterar)\s*(?:o)?\s*nome\s*(?:do|desse|deste)?\s*grupo\s*(?:para|a)?\s*/i, '').trim();
          if (!novoNome) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Diz o novo nome do grupo.' }, { quoted: msg });
            return;
          }
          try {
            await sock.groupUpdateSubject(ctx.remoteJid, novoNome);
            await sock.sendMessage(ctx.remoteJid, { text: `✅ *Nome alterado para:* ${novoNome}` }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro: ' + e.message }, { quoted: msg });
          }
        };
      }
      // ── MUDAR DESCRIÇÃO DO GRUPO ──
      else if (/^(muda|mudar|altera|alterar)\s*(a)?\s*descrição\s*(do|desse|deste)?\s*grupo\s*(para|a)?\s*/i.test(auraClean)) {
        auraAction = async () => {
          const novaDesc = auraClean.replace(/^(?:muda|mudar|altera|alterar)\s*(?:a)?\s*descrição\s*(?:do|desse|deste)?\s*grupo\s*(?:para|a)?\s*/i, '').trim();
          if (!novaDesc) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Diz a nova descrição.' }, { quoted: msg });
            return;
          }
          try {
            await sock.groupUpdateDescription(ctx.remoteJid, novaDesc);
            await sock.sendMessage(ctx.remoteJid, { text: `✅ *Descrição atualizada!*` }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro: ' + e.message }, { quoted: msg });
          }
        };
      }
      // ── BLOQUEAR USUÁRIO ──
      else if (/^(bloqueia|bloquear)\s*(o|a)?\s*/i.test(auraClean)) {
        auraAction = async () => {
          const mentions = allMentioned;
          if (!mentions.length) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Marca a pessoa com @ para bloquear.' }, { quoted: msg });
            return;
          }
          try {
            for (const jid of mentions) {
              await sock.updateBlockStatus(jid, 'block');
            }
            await sock.sendMessage(ctx.remoteJid, { text: `✅ ${mentions.map(j => '@' + j.split('@')[0]).join(' ')} *bloqueado(s)*` }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro: ' + e.message }, { quoted: msg });
          }
        };
      }
      // ── DESBLOQUEAR USUÁRIO ──
      else if (/^(desbloqueia|desbloquear)\s*(o|a)?\s*/i.test(auraClean)) {
        auraAction = async () => {
          const mentions = allMentioned;
          if (!mentions.length) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Marca a pessoa com @ para desbloquear.' }, { quoted: msg });
            return;
          }
          try {
            for (const jid of mentions) {
              await sock.updateBlockStatus(jid, 'unblock');
            }
            await sock.sendMessage(ctx.remoteJid, { text: `✅ ${mentions.map(j => '@' + j.split('@')[0]).join(' ')} *desbloqueado(s)*` }, { quoted: msg });
          } catch (e) {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ Erro: ' + e.message }, { quoted: msg });
          }
        };
      }
      
      if (auraAction) {
        try {
          await auraAction();
          return true;
        } catch (e) {
          const errMsg = String(e?.message || e || '');
          if (/not admin|forbidden|403/i.test(errMsg)) {
            await sock.sendMessage(ctx.remoteJid, { text: isOwner ? ' *Amor, eu não sou admin aqui...* Me promove pra eu poder fazer isso por ti? 🙏' : '⚠️ *Preciso ser admin do grupo para fazer isso!* Promove-me! 🙏' }, { quoted: msg });
          } else {
            await sock.sendMessage(ctx.remoteJid, { text: '❌ ' + errMsg.slice(0, 200) }, { quoted: msg });
          }
          return true;
        }
      }
    }
  }

  // ── AURA TRIGGERS — activado por: ─────────────────────────────────
  //  1. "aura" no início da frase (nome dela)
  //  2. Menção ao bot
  //  3. Resposta directa ao bot
  //  4. Referência em 3ª pessoa
  const botNameLower = (commandConfig.bot?.name || 'dark bot').toLowerCase();
  const AURA_TRIGGERS = [
    'aura', '+aura', '-aura', 'aura?',
    'oi aura', 'ola aura', 'olá aura', 'bom dia aura', 'boa tarde aura', 'boa noite aura',
    'aura me diz', 'aura fala', 'aura responde', 'aura ajuda',
    'aura o que', 'aura quanto', 'aura quando', 'aura como', 'aura por que',
    'aura sabe', 'aura conhece', 'aura pode', 'aura vai',
    'qual minha aura', 'mede minha aura', 'quanta aura',
    'tô com aura', 'to com aura', 'tenho aura', 'aura ativada',
  ];
  const isAuraTrigger = !startsWithAnyPrefix(text, prefixes) && (
    AURA_TRIGGERS.includes(textLower) ||
    AURA_TRIGGERS.some(k => textLower.startsWith(k + ' ') || textLower === k) ||
    textLower.startsWith('aura ') ||
    /\ba aura\b|\bda aura\b|\bpra aura\b|\bcom a aura\b|\bna aura\b/i.test(textLower) ||
    (botNameLower.length > 3 && textLower.includes(botNameLower))
  );

  const replyHasText = isReplyToBot && text.length > 0;
  const replyHasMedia = isReplyToBot && !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.stickerMessage);
  const mentionedWithMedia = isBotMentioned && !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage);

  const aiAutoOn = aiAutoOnValue;  // v6.45: já lido no Promise.all acima
  const aiActive = aiAutoOn === true || aiAutoOn === 'true' || aiAutoOn === 'on' || aiAutoOn === 1 || aiAutoOn === '1';

  // ── v6.43: modo do chat (AURA acordada vs assistente profissional) ──
  const _auraModes = require('../aura/auraModes');
  const _auraAwakeHere = await _auraModes.isAuraAwake(ctx.remoteJid, { isGroup: ctx.isGroup })
    .catch(() => false);

  // Num grupo em modo assistente o nome "Aura" não significa nada — ela
  // não está ali. Só menção ao bot / resposta directa é que chamam o
  // assistente. Senão o bot saltava a cada vez que alguém dissesse "aura"
  // (que em gíria é comum: "que aura", "mede minha aura"...).
  const auraTriggerActive = _auraAwakeHere ? isAuraTrigger : false;

  // ── v6.44: A AURA ENTENDE — sem comandos ────────────────────────────
  // O Dark não escreve ".aura". Ele fala com ela: "aura, acorda",
  // "aura vem cá", "aura dorme", "aura tás aí?". Ela percebe e age.
  if (isOwner && ctx.isGroup && text) {
    try {
      const _intent = require('../aura/auraIntent');
      const intencao = _intent.detectAuraIntent(text, {
        isOwner, isReplyToBot, isGroup: ctx.isGroup,
      });

      if (intencao === _intent.INTENT_WAKE) {
        const r = await _auraModes.invokeAura(ctx.remoteJid, {
          groupName: ctx.groupName || '', invokedBy: ctx.senderNumber || '',
        });
        const resposta = r.already
          ? _intent.pick(_intent.WAKE_ALREADY)
          : _intent.pick(_intent.WAKE_REPLIES);
        await sock.sendMessage(ctx.remoteJid, { react: { text: '🌹', key: msg.key } }).catch(() => {});
        await sock.sendMessage(ctx.remoteJid, { text: resposta }, { quoted: msg });
        return true;
      }

      if (intencao === _intent.INTENT_SLEEP) {
        const r = await _auraModes.dismissAura(ctx.remoteJid);
        const resposta = r.already
          ? _intent.pick(_intent.SLEEP_ALREADY)
          : _intent.pick(_intent.SLEEP_REPLIES);
        await sock.sendMessage(ctx.remoteJid, { react: { text: '🌙', key: msg.key } }).catch(() => {});
        await sock.sendMessage(ctx.remoteJid, { text: resposta }, { quoted: msg });
        return true;
      }

      if (intencao === _intent.INTENT_STATUS) {
        const acordada = await _auraModes.isAuraAwake(ctx.remoteJid, { isGroup: true }).catch(() => false);
        await sock.sendMessage(ctx.remoteJid, {
          text: acordada
            ? 'Tô aqui, acordada. Só tua neste grupo.'
            : 'Aqui tô só como assistente. Diz "aura, acorda" se quiseres que eu volte.',
        }, { quoted: msg });
        return true;
      }
    } catch (e) {
      console.warn('[AuraIntent]', e.message?.slice(0, 60));
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // AURA RESPONDE — com personalidade completa, memória, emoções
  // ════════════════════════════════════════════════════════════════════════
  // v6.54: Dark SEMPRE activa a Aura (sem prefixo) — ela responde a TUDO dele
  // v6.43: o Dark só é ouvido sem prefixo onde a AURA está acordada.
  // Num grupo alheio o bot não pode responder a tudo o que ele escreve.
  const isOwnerFreeText = isOwner && !prefixInfo && text.length > 0 && _auraAwakeHere;
  if (aiActive && (isBotMentioned || replyHasText || replyHasMedia || mentionedWithMedia || auraTriggerActive || isOwnerFreeText)) {
    try {
      const cleanText = text.replace(/@[0-9]+/g, '').replace(new RegExp('@' + botNum, 'g'), '').trim();

      // ── v6.56: ELA DECIDE SE RESPONDE ────────────────────────
      // Antes respondia a 100% das mensagens do Dark, mesmo às que
      // não eram para ela. Uma pessoa num grupo lê muita coisa e só
      // fala quando faz sentido — era isso que a denunciava como bot.
      if (_auraAwakeHere) {
        try {
          const decide = require('../aura/auraDecide');
          const nPessoas = ctx.groupMeta?.participants?.length || 0;

          const d = decide.deveResponder({
            texto: text,
            isOwner,
            isGroup: ctx.isGroup,
            mencionada: isBotMentioned,
            respostaAoBot: isReplyToBot,
            temMedia: !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage),
            pessoasNoGrupo: nPessoas,
            msgsDesdeUltima: _msgsDesdeAura(ctx.remoteJid),
          });

          if (!d.responde) {
            // Às vezes reage com emoji em vez de ficar totalmente muda —
            // mostra que leu, sem interromper a conversa.
            if (isOwner && Math.random() < 0.2) {
              sock.sendMessage(ctx.remoteJid, {
                react: { text: decide.escolherReacao(text), key: msg.key },
              }).catch(() => {});
            }
            _contaMsg(ctx.remoteJid);
            return false;
          }
          _resetMsgs(ctx.remoteJid);
        } catch (e) {
          console.warn('[Aura decide]', e.message?.slice(0, 50));
        }
      }

      // v6.43: o modo do chat decide TUDO — persona, emojis, tom.
      const _modes = _auraModes;
      const _awake = _auraAwakeHere;

      // ⚡ REACÇÃO DE EMOJI AUTOMÁTICA
      // Só a AURA acordada reage com emojis afectuosos. Em modo
      // assistente não há reacções — um assistente profissional
      // não anda a pôr coraçõezinhos nas mensagens.
      if (isOwner && _awake) {
        const reactEmojis = ['🖤', '🌹', '💕', '😏', '🥰', '💀', '✨', '🔥', '💗', '🥺', '💫'];
        const randomEmoji = reactEmojis[Math.floor(Math.random() * reactEmojis.length)];
        sock.sendMessage(ctx.remoteJid, { react: { text: randomEmoji, key: msg.key } }).catch(() => {});
      }

      const hasMedia = !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.stickerMessage);
      if (!isReplyToBot && !auraTriggerActive && !isOwnerFreeText && cleanText.length < 2 && !hasMedia) return false;

      let prompt = cleanText;
      if (!prompt || prompt.length < 1) {
        if (isReplyToBot) prompt = '[Alguém respondeu à tua mensagem sem texto — reage naturalmente como pessoa real]';
        else if (auraTriggerActive) prompt = 'Alguém chamou o teu nome. Responde naturalmente.';
        else if (isOwnerFreeText) prompt = '[O Dark escreveu: "' + cleanText + '" — Responde naturalmente como a namorada/assistente dele. Podes concordar, discordar, brincar, perguntar algo, opinar, zoar, ou ignorar se quiseres. Sê humana.]';
        else prompt = 'Olá!';
      }

      // Verifica se é VIP
      const userForPriority = user || await requestCache.remember(
        requestCache.K.user(ctx.senderNumber) + ':doc',
        () => userManager.identifyByWhatsApp(ctx.senderNumber, ctx.pushName)
      ).catch(() => null);
      const isVip = !!(userForPriority?.isPremium && userForPriority.isPremium());
      const isPriority = isOwner || isVip;

      // Contexto do grupo
      let groupContext = '';
      try {
        const { messageCache } = require('./messageListener');
        if (ctx.isGroup) {
          const recentGroupMsgs = [];
          for (const [, cachedMsg] of messageCache) {
            if (cachedMsg.key?.remoteJid === ctx.remoteJid && !cachedMsg.key?.fromMe) {
              const txt = cachedMsg.message?.conversation || cachedMsg.message?.extendedTextMessage?.text || '';
              const sender = cachedMsg.pushName || cachedMsg.key?.participant?.split('@')[0] || '';
              if (txt && txt.length > 1) {
                recentGroupMsgs.push({ sender, txt: txt.slice(0, 100) });
              }
            }
          }
          const last5 = recentGroupMsgs.slice(-5);
          if (last5.length) {
            groupContext = `Grupo "${ctx.groupName || 'grupo'}":\n` +
              last5.map(m => `${m.sender}: ${m.txt}`).join('\n') + '\n';
          }
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          const qtxt = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
          if (qtxt) groupContext += `Respondendo a: "${qtxt.slice(0, 150)}"\n`;
        } else {
          groupContext = `PV com ${ctx.pushName || 'utilizador'}`;
        }
      } catch {}

      // Histórico de conversa
      let historyArray = [];
      try {
        const mem = await AiMemory.getOrCreate(ctx.senderNumber, ctx.isGroup ? ctx.remoteJid : null);
        historyArray = mem.getContextWindow(16);
        mem.addMessage('user', `[${ctx.pushName}]: ${prompt}`);
        await mem.save().catch(() => {});
      } catch {}

      // Contexto de mídia — a Aura vê/ouve tudo
      let mediaContext = '';
      let isAudio = false, isImage = false, isVideo = false;
      const msgObj = msg.message;
      if (msgObj?.imageMessage) {
        isImage = true;
        const caption = msgObj.imageMessage.caption || '';
        mediaContext = `📸 Alguém enviou uma FOTO.${caption ? ` Legenda: "${caption}"` : ''} Comenta sobre ela como pessoa real.`;
      } else if (msgObj?.videoMessage) {
        isVideo = true;
        const caption = msgObj.videoMessage.caption || '';
        const isGif = msgObj.videoMessage.gifPlayback;
        mediaContext = isGif
          ? `🎞️ Alguém enviou um GIF. Reage naturalmente.`
          : `🎬 Alguém enviou um VÍDEO.${caption ? ` Legenda: "${caption}"` : ''} Comenta como pessoa real.`;
      } else if (msgObj?.audioMessage || msgObj?.documentMessage?.mimetype?.startsWith('audio')) {
        isAudio = true;
        const isPtt = msgObj.audioMessage?.ptt;
        // ⚡ Transcrever áudio com Whisper — a Aura OUVE!
        try {
          const { downloadMediaMessage } = require('@systemzero/baileys');
          const audioBuf = await downloadMediaMessage(msg, 'buffer', {});
          if (audioBuf && audioBuf.length > 500) {
            const aiMod = require('./ai');
            const lang = (ctx.senderNumber || '').startsWith('244') ? 'pt' : 
                         (ctx.senderNumber || '').startsWith('55') ? 'pt' :
                         (ctx.senderNumber || '').startsWith('351') ? 'pt' : 'pt';
            const transcribed = await aiMod.transcribeAudio(audioBuf, lang);
            if (transcribed && transcribed.length > 0) {
              mediaContext = isPtt
                ? `🎧 ÁUDIO DE VOZ transcrito: "${transcribed}" — Responde ao que foi dito como pessoa real.`
                : `🎵 ÁUDIO/MÚSICA transcrito: "${transcribed}" — Comenta naturalmente.`;
              // Adiciona a transcrição ao prompt para a Aura saber o que foi dito
              prompt = (prompt || '') + ` [O áudio que recebi diz: "${transcribed}"]`;
            } else {
              mediaContext = isPtt
                ? `🎧 Alguém enviou um ÁUDIO DE VOZ mas não consegui transcrever. Reage naturalmente.`
                : `🎵 Alguém enviou um ÁUDIO/MÚSICA. Comenta naturalmente.`;
            }
          }
        } catch (e) {
          console.warn('[Aura Audio]', e.message?.slice(0, 60));
          mediaContext = isPtt
            ? `🎧 Alguém enviou um ÁUDIO DE VOZ. Não consegui transcrever mas reage como se tivesses ouvido.`
            : `🎵 Alguém enviou um ÁUDIO/MÚSICA. Comenta naturalmente.`;
        }
      } else if (msgObj?.stickerMessage) {
        mediaContext = `🎨 Alguém enviou um STICKER. Reage naturalmente — podes achar engraçado, estranho, lindo, etc.`;
      } else if (msgObj?.documentMessage) {
        const fname = msgObj.documentMessage.fileName || 'arquivo';
        mediaContext = `📄 Alguém enviou um DOCUMENTO: ${fname}. Comenta se relevante.`;
      }

      // ═══ ESCOLHER A PERSONA ═══════════════════════════════════
      // v6.43: dois modos por grupo.
      //   🌹 AURA      → só onde o DONO SUPREMO a invocou (ou no PV dele)
      //   🤖 ASSISTENTE → todos os outros grupos (profissional, tipo Meta AI)
      const auraModes = _modes;
      const auraAwake = _awake;

      const auraModule = require('../aura/auraHuman');
      const personMem = ctx.senderNumber ? auraModule.recallPerson(ctx.senderNumber) : null;
      const userCountry = ctx.senderNumber ? auraModule.detectCountry(ctx.senderNumber) : null;

      let systemPrompt;
      if (auraAwake) {
        systemPrompt = auraModule.buildAuraSystemPrompt({
          isOwner, isVip, userName: ctx.pushName, userGender: personMem?.gender,
          userRole: isOwner ? 'owner' : isVip ? 'premium' : 'free',
          groupContext, conversationHistory: '', personMemory: personMem,
          isPrivateChat: !ctx.isGroup, isReplyToAura: isReplyToBot,
          darkAttacked, darkMentioned, mood: auraModule.getMood().mood,
          userCountry, mediaContext, isAudio, isImage, isVideo,
        });
      } else {
        // Assistente profissional — sem romance, sem "Dark", sem intimidade
        systemPrompt = auraModes.buildAssistantPrompt({
          botName: config.bot.name, userName: ctx.pushName,
          isGroup: ctx.isGroup, groupName: ctx.groupName,
          groupContext, prefix, mediaContext, isImage, isAudio, isVideo,
        });
      }
      
      // Se há imagem → usa Gemini Vision (a Aura VÊ a foto!)
      let answer;
      if (isImage) {
        try {
          let imgBuf = null;
          // Tentativa 1: downloadMediaMessage
          try {
            const { downloadMediaMessage } = require('@systemzero/baileys');
            imgBuf = await downloadMediaMessage(msg, 'buffer', {});
          } catch (e1) {
            console.warn('[Aura Vision] downloadMediaMessage falhou:', e1.message?.slice(0, 40));
          }
          // Tentativa 2: mediaHandler.downloadFromMessage
          if (!imgBuf || imgBuf.length < 500) {
            try {
              imgBuf = await mediaHandler.downloadFromMessage(msg);
            } catch (e2) {
              console.warn('[Aura Vision] mediaHandler falhou:', e2.message?.slice(0, 40));
            }
          }
          if (imgBuf && imgBuf.length > 500) {
            const aiMod = require('./ai');
            // v6.54: análise detalhada em vez de "descreve a imagem".
            // Antes dizia só "vejo um padrão de xadrez"; agora repara
            // em pessoas, expressões, roupa, marcas, texto e local.
            const visionPrompt = prompt + `

[ESTÁS A VER A IMAGEM AGORA. Analisa com atenção:
• PESSOAS: quantas, idade aproximada, expressão, o que vestem, o que
  fazem. Se for alguém famoso e tiveres a certeza, diz o nome. Se não
  tiveres a certeza, diz com quem se parece — sem inventar.
• TEXTO: lê tudo o que estiver escrito (cartazes, ecrãs, roupa).
• LOCAL: interior/exterior, que sítio parece, que horas do dia.
• OBJECTOS e MARCAS que reconheças.
• AMBIENTE: cores, luz, o que a foto transmite.
Responde como uma pessoa que está mesmo a olhar — comenta o que te
salta à vista primeiro, com naturalidade. NUNCA digas que não vês.]`;
            answer = await aiMod.chatWithImage(visionPrompt, systemPrompt, imgBuf);
            console.log('[Aura Vision] OK, resposta com imagem');
          } else {
            console.warn('[Aura Vision] imgBuf vazio ou pequeno');
          }
        } catch (e) {
          console.warn('[Aura Vision] erro geral:', e.message?.slice(0, 80));
        }
      }
      
      // Se não há imagem ou vision falhou → usa chat normal
      if (!answer) {
        if (auraAwake) {
          answer = await aura.auraRespond(prompt, {
            isOwner,
            isVip,
            pushName: ctx.pushName,
            senderNumber: ctx.senderNumber,
            isGroup: ctx.isGroup,
            groupName: ctx.groupName,
            groupContext,
            historyArray,
            isReplyToAura: isReplyToBot,
            darkAttacked,
            darkMentioned,
            mediaContext,
            isAudio,
            isImage,
            isVideo,
          });
        } else {
          // v6.43: modo assistente profissional (estilo Meta AI)
          answer = await auraModes.assistantRespond(prompt, {
            botName: config.bot.name, userName: ctx.pushName,
            isGroup: ctx.isGroup, groupName: ctx.groupName,
            groupContext, historyArray, prefix,
            isOwner, isVip, mediaContext, isAudio, isImage, isVideo,
          });
        }
      }

      // Salva resposta na memória
      try {
        const mem = await AiMemory.getOrCreate(ctx.senderNumber, ctx.isGroup ? ctx.remoteJid : null);
        mem.addMessage('assistant', answer);
        await mem.save().catch(() => {});
      } catch {}

      // ⚡ REACCAO AUTOMATICA DE EMOJI (como pessoa real)
      // v6.43: só a AURA acordada reage. O assistente fica sóbrio.
      if (_awake && isOwner && !aura.isSilenced(ctx.senderNumber)) {  // v6.52: era `!isSilenced` — variavel inexistente, rebentava a resposta da AURA em TODAS as mensagens
        const ownerReacts = ['🖤', '🌹', '💕', '😏', '🥰', '✨', '💗', '💫', '😈'];
        const rEmoji = ownerReacts[Math.floor(Math.random() * ownerReacts.length)];
        sock.sendMessage(ctx.remoteJid, { react: { text: rEmoji, key: msg.key } }).catch(() => {});
      } else if (_awake && !isOwner) {
        const neutralReacts = ['👀', '💬', '✨', '👍'];
        const rEmoji = neutralReacts[Math.floor(Math.random() * neutralReacts.length)];
        sock.sendMessage(ctx.remoteJid, { react: { text: rEmoji, key: msg.key } }).catch(() => {});
      }
      
      // Responde como pessoa real — sem emojis de bot
      // ⚡ Parser de acções da Aura: [STICKER:xxx], [IMAGE:xxx], [CMD:xxx]
      let finalAnswer = answer;
      const actionSticker = finalAnswer.match(/\[STICKER:([^\]]+)\]/);
      const actionImage = finalAnswer.match(/\[IMAGE:([^\]]+)\]/);
      const actionCmd = finalAnswer.match(/\[CMD:([^\]]+)\]/);
      
      // Remove os marcadores do texto visível
      finalAnswer = finalAnswer.replace(/\[STICKER:[^\]]+\]/g, '').replace(/\[IMAGE:[^\]]+\]/g, '').replace(/\[CMD:[^\]]+\]/g, '').trim();
      
      // v6.55: EXECUTAR COMANDOS POR CONVERSA
      // "aura toca Shakira" → corre o .play sozinha.
      // Só o Dono, e NUNCA os comandos perigosos (eval, broadcast,
      // restart, permissões, 18+) — esses continuam a exigir o
      // prefixo escrito à mão, porque um erro de interpretação
      // nesses é irreversível.
      if (isOwner) {
        try {
          const auraCmds = require('../aura/auraCommands');
          const pedido = auraCmds.detectarComando(cleanText);

          if (pedido && !auraCmds.estaBloqueado(pedido.comando)) {
            const argv = pedido.args ? pedido.args.split(/\s+/) : [];
            const cmdCtx = { ...ctx, args: argv, prefix };
            const caseCtx = {
              sock, msg, ctx: cmdCtx, args: argv,
              text: pedido.args, prefix,
              command: pedido.comando, isOwner: true, config: commandConfig,
            };

            let correu = false;
            try {
              correu = await caseHandler.runCase(pedido.comando, caseCtx);
            } catch (e) {
              console.warn('[Aura cmd] case', e.message?.slice(0, 50));
            }

            // não é case → tenta nativo / pacote
            if (!correu) {
              const fn = nativeCommands[pedido.comando] || packageCommands[pedido.comando];
              if (typeof fn === 'function') {
                try {
                  await fn({ sock, msg, ctx: cmdCtx, args: argv, isOwner: true, fillVars, config: commandConfig });
                  correu = true;
                } catch (e) {
                  console.warn('[Aura cmd] nativo', e.message?.slice(0, 50));
                }
              }
            }

            if (correu) {
              await incrementUserCommand(ctx.senderNumber, ctx).catch(() => {});
              return true;
            }
          }
        } catch (e) {
          console.warn('[Aura comando]', e.message?.slice(0, 60));
        }
      }

      // v6.54: ACÇÕES DO WHATSAPP — ela faz o que uma pessoa faz.
      // "cria um grupo chamado X", "cria um canal", "fecha o grupo",
      // "manda o link", "muda o nome"... Só o Dono Supremo.
      if (isOwner) {
        try {
          const acts = require('../aura/auraActions');
          const ordem = acts.detectarAcao(cleanText);
          if (ordem) {
            const r = await acts.executar(ordem.acao, ordem.valor, {
              sock, ctx: { ...ctx, botName: config.bot.name },
            }).catch(e => ({ ok: false, msg: `Não consegui: ${String(e.message).slice(0, 90)}` }));

            if (r?.msg) {
              await sock.sendMessage(ctx.remoteJid, { text: r.msg }, { quoted: msg });
            }
            if (r?.ok || r?.msg) return true;
          }
        } catch (e) {
          console.warn('[Aura acção]', e.message?.slice(0, 60));
        }
      }

      // v6.54: PEDIDO DE IMAGEM — PROCURAR, não gerar.
      // Quem pede "manda uma foto de um cavalo" quer uma FOTO REAL.
      // Antes a AURA gerava com IA (ou respondia com uma piada, como
      // no "me de um cavalo" do diálogo real). Só gera quando o
      // pedido é explícito: "cria/desenha/imagina uma imagem de...".
      try {
        const imgSearch = require('./imageSearch');
        const pedido = imgSearch.detectarPedidoImagem(cleanText);

        if (pedido && !pedido.gerar) {
          const imgs = await imgSearch.buscarImagens(pedido.termo, 1).catch(() => null);
          if (imgs?.length) {
            const legenda = finalAnswer && finalAnswer.length < 220
              ? finalAnswer
              : `Aqui tens: *${pedido.termo}* 🌹`;
            await sock.sendMessage(ctx.remoteJid, {
              image: { url: imgs[0].url },
              caption: `${legenda}\n\n_via ${imgs[0].fonte}_`,
            }, { quoted: msg });
            return true;
          }
          // se não encontrou, segue e manda o texto normal
        }
      } catch (e) {
        console.warn('[Aura imagem]', e.message?.slice(0, 60));
      }

      // v6.53: PEDIDO DE ÁUDIO — ela dizia "não posso enviar áudios"
      // mas o ElevenLabs funciona (testado: 30KB de MP3). Agora quando
      // pedem voz, ela envia MESMO em vez de recusar.
      // v6.53: apanha as formas reais de pedir — inclui o imperativo
      // ('mande', 'envie', 'faça'), que a versão anterior falhava.
      // v6.53: detecção simples e robusta — há um verbo de pedido E a
      // palavra áudio/voz na mesma frase. Tentei uma regex com
      // distância entre os termos, mas falhava com acentos.
      const _txtAudio = String(cleanText || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const _pedidoExplicito =
        /\b(audio|voz|ptt|nota de voz|mensagem de voz)\b/.test(_txtAudio) &&
        /\b(mand[ae]|envi[ae]|manda-?me|envia-?me|quero|faz|faca|grav[ae]|poe|poem|diz|fala|responde)\b/.test(_txtAudio);

      // v6.56: ELA ESCOLHE O FORMATO.
      // Uma pessoa não responde sempre por texto — às vezes manda
      // áudio porque lhe apetece. Aqui ela decide (raro e só em
      // momentos afectivos, para não ser mecânico).
      let _formato = 'texto';
      try {
        const decide = require('../aura/auraDecide');
        _formato = decide.comoResponder({
          texto: cleanText, isOwner, isGroup: ctx.isGroup, pediuAudio: _pedidoExplicito,
        });
      } catch {}

      const pediuAudio = _pedidoExplicito || _formato === 'audio';

      if (pediuAudio && finalAnswer.length > 0 && finalAnswer.length < 900) {
        try {
          const aiVoz = require('./ai');
          // tira emojis e marcações — o TTS lê-os em voz alta
          const paraFalar = finalAnswer
            .replace(/\p{Extended_Pictographic}[\uFE0F\u200D]*/gu, '')
            .replace(/[*_~`]/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

          const voz = await aiVoz.speakWithFallback(paraFalar.slice(0, 500));
          if (voz && voz.length > 500) {
            await sock.sendMessage(ctx.remoteJid, {
              audio: voz, mimetype: 'audio/mpeg', ptt: true,
            }, { quoted: msg });
            return true;   // já respondeu em voz, não repete em texto
          }
        } catch (e) {
          console.warn('[Aura voz]', e.message?.slice(0, 60));
          // se a voz falhar, continua e manda o texto
        }
      }

      // Envia o texto (se houver)
      if (finalAnswer.length > 0) {
        await sock.sendMessage(ctx.remoteJid, { text: finalAnswer }, { quoted: msg });
      }
      
      // Executa acções de mídia (sem bloquear se falhar)
      if (actionSticker) {
        try {
          const ai2 = require('./ai');
          const desc = actionSticker[1].trim();
          const imgBuf = await ai2.generateImage(desc + ', sticker style, white background, cute anime style');
          if (imgBuf && imgBuf.length > 100) {
            const stk = await stickerMaker.create(imgBuf, {
              botName: config.bot.name, ownerName: config.owner.name,
              userName: 'Aura', groupName: ctx.groupName || 'PV', isVideo: false,
            });
            if (stk && stk.length > 50) {
              await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
            }
          }
        } catch (e) { /* silêncio — não quebra o fluxo */ }
      }
      
      if (actionImage) {
        try {
          const ai2 = require('./ai');
          const desc = actionImage[1].trim();
          const imgBuf = await ai2.generateImage(desc);
          if (imgBuf && imgBuf.length > 100) {
            await sock.sendMessage(ctx.remoteJid, { image: imgBuf, caption: '' }, { quoted: msg });
          }
        } catch (e) { /* silêncio */ }
      }
      
      if (actionCmd && isOwner) {
        // Só o Dark pode fazer a Aura executar comandos via [CMD:]
        try {
          const cmdText = actionCmd[1].trim();
          const [cmdName, ...cmdArgs] = cmdText.split(/\s+/);
          const fakeCtx = { ...ctx, args: cmdArgs, prefix: config.bot.prefix || '.' };
          const caseCtx = { sock, msg, ctx: fakeCtx, args: cmdArgs, text: cmdArgs.join(' '), prefix: fakeCtx.prefix, command: cmdName.toLowerCase(), isOwner: true, config: commandConfig };
          await caseHandler.runCase(cmdName.toLowerCase(), caseCtx);
        } catch (e) { /* silêncio */ }
      }
      
      return true;

    } catch (e) {
      console.warn('[Aura v6.39]', e.message?.slice(0, 80));
    }
  }
  // Sticker em mídia
  const isMedia = msg.message?.imageMessage || msg.message?.videoMessage;
  if (isMedia && (text === `${prefix}sticker` || text === `${prefix}s` || text === `${prefix}fig`)) {
    return handleStickerRequest(sock, msg, ctx);
  }

  // ===== Usuário único por WhatsApp =====
  // O gênero só é perguntado/alterado quando o usuário usa !genero ou !alterargenero.
  user = user || await requestCache.remember(
    requestCache.K.user(ctx.senderNumber) + ':doc',
    () => userManager.identifyByWhatsApp(ctx.senderNumber, ctx.pushName)
  );

  // ===== DECRYPTER AUTOMÁTICO (Só para Premium) =====
  if (docMsg && autoDecryptOn) {
    const fileName = docMsg.fileName || '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const vpnExts = ['ehi','ehic','hat','npv','npv4','npv7','npv8','npvt','dark','darkt','any','tls','nm','nmess','ovpn','ssh','ssl','json','conf','wg','wireguard','txt','bdnet','bd','apna','apnalite','wyrvpn','wyr'];
    
    if (vpnExts.includes(ext)) {
      const isPremium = isOwner || checkIsPremium(user);
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

  // ════════════════════════════════════════════════════════════════════════
  // SEM PREFIXO — SILÊNCIO TOTAL
  //  "aura" e menções ao bot já foram tratados acima pelo Auto-IA
  //  Tudo o resto → SILÊNCIO (bot não responde a palavras)
  // ════════════════════════════════════════════════════════════════════════
  if (!prefixInfo) {
    return false;
  }


  const args = prefixInfo.rest.split(/\s+/);
  // v6.37: prefixo deve estar COLADO ao comando (.play ✅, . play ❌)
  const rawFirst = (args[0] || '');
  if (rawFirst.startsWith(' ') || rawFirst === '') return false;
  const commandName = (args.shift() || '').replace(/^[^a-z0-9]+/i, '').toLowerCase();
  if (!commandName) return false;

  ctx.fullText = text; // Adiciona o texto completo ao contexto
  ctx.args = args;

  // ══════════════════════════════════════════════════════════════════════
  // ALIAS MAP - Organizado por categorias (apenas aliases válidos)
  // ══════════════════════════════════════════════════════════════════════
  const aliasMap = {
    // ── MENU PRINCIPAL ──
    help: 'menu', cmds: 'menu', comandos: 'menu', guia: 'menu',
    
    // ── DOWNLOADS ──
    yt: 'play', musica: 'play', music: 'play',
    yt2: 'play2', musica2: 'play2',
    yt3: 'play3', musica3: 'play3',
    yta: 'ytd', mp3: 'ytd',
    ytv: 'gyt', mp4: 'gyt',
    tt: 'tiktok', ig: 'instagram', x: 'twitter',
    sp: 'spotify', sc: 'soundcloud',
    mf: 'mediafire',
    
    // ── STICKERS ──
    s: 'sticker', fig: 'sticker',
    
    // ── IA ──
    ai: 'ia', chatgpt: 'ia', llm: 'ia', pergunta: 'ia',
    img: 'imagem',
    
    // ── GRUPOS ──
    banir: 'kick',
    advertir: 'warn',
    apagar: 'del', deletar: 'del',
    mute: 'silenciar', unmute: 'silenciar',
    adicionar: 'add',
    
    // ── INTERAÇÕES ──
    hug: 'abracar',
    kiss: 'beijar',
    punch: 'soco', slap: 'tapa',
    dance: 'dancar', bailar: 'dancar',
    kill: 'matar',
    
    // ── UTILIDADES ──
    tempo: 'clima',
    google: 'pesquisar',
    cachorro: 'dog',
    
    // ── SUBMENUS ──
    downloads: 'menudownload',
    brincadeiras: 'menudiversao',
    menubank: 'menueconomia',
    menuadmin: 'menugrupo',
    menulogos: 'menustickers',
    menufamilia: 'menudiversao',
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
      if (!premUser || !checkIsPremium(premUser)) {
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

  // ── Limite free PV (50 cmds/dia — mais generoso para não frustrar) ──
  // Comandos de info/ajuda não contam para o limite
  const PV_EXEMPT = new Set(['menu','start','ping','info','dono','criador','aiapis','donos','help','cmds','comandos','vip','prefixos']);
  if (!ctx.isGroup && !isOwner && !PV_EXEMPT.has(canonicalCommand || '')) {
    try {
      const FREE_PV_LIMIT = 50;
      const todayStr = new Date().toISOString().slice(0, 10);
      const pvUser = await User.findOne({ whatsappNumber: ctx.senderNumber }).lean().catch(() => null);
      if (!pvUser || !checkIsPremium(pvUser)) {
        const sameDayCount = (pvUser?.pvCommandsDate === todayStr) ? (pvUser?.pvCommandsToday || 0) : 0;
        if (sameDayCount >= FREE_PV_LIMIT) {
          await sock.sendMessage(ctx.remoteJid, {
            text:
              `⏳ *Limite diário atingido*\n\n` +
              `Utilizadores Free têm *${FREE_PV_LIMIT} comandos/dia* no chat privado.\n\n` +
              `⭐ Upgrade para *Premium* e usa sem limites: *${prefix}vip*`,
          }, { quoted: msg });
          return true;
        }
        // Incrementa (não bloqueia se falhar)
        User.findOneAndUpdate(
          { whatsappNumber: ctx.senderNumber },
          { pvCommandsToday: sameDayCount + 1, pvCommandsDate: todayStr }
        ).catch(() => {});
      }
    } catch {}
  }

  // ── Case Handler (switch/case engine) ─────────────────────────────
  // Executa antes dos pacotes — tem prioridade
  // Passa contexto completo incluindo wrapper "m" estilo clássico
  {
    const caseCtx = {
      sock,
      msg,
      ctx,
      args,
      text:    args.join(' ').trim(),
      prefix,
      command: canonicalCommand,
      isOwner,
      config:  commandConfig,
    };
    const caseHandled = await caseHandler.runCase(canonicalCommand, caseCtx);
    if (caseHandled) {
      if (groupConfig) {
        groupConfig.commandsUsedToday++;
        groupConfig.totalCommands++;
        await groupConfig.save();
      }
      await incrementUserCommand(ctx.senderNumber, ctx);
      return true;
    }
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
    if (!cmd) {
      // Comando desconhecido com prefixo → sugerir o mais próximo
      // v5.2: SÓ sugere quando o prefixo ACTIVO foi usado (não para cliques de botão)
      // "?play" com prefixo "$" → silêncio total (prefixo errado)
      // "$plai" com prefixo "$" → sugere "$play" (prefixo correcto, typo)
      const isRealPrefix = ctx.prefixSource === 'group' || ctx.prefixSource === 'global';
      if (!isRealPrefix) return false; // clique de botão ou prefixo errado → silêncio

      if (commandName.length >= 2) {
        // Palavras muito curtas ou comuns que não são comandos → silêncio
        const commonWords = new Set(['oi','ok','sim','nao','não','ola','olá','boa','bom','ae','ai','ei','ué','ne','né','rs','kkk','lol','haha','ta','tá','bd','bjs','vlw','obg']);
        if (commandName.length < 3 || commonWords.has(commandName)) {
          return false;
        }
        // Calcular distância Levenshtein simples para sugestão
        const allCmds = [
          ...Object.keys(nativeCommands || {}),
          ...Object.keys(packageCommands || {}),
          ...[...caseHandler.CASES.keys()],
        ].filter(k => Math.abs(k.length - commandName.length) <= 3);

        function levenshtein(a, b) {
          const dp = Array.from({ length: a.length + 1 }, (_, i) =>
            Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
          );
          for (let i = 1; i <= a.length; i++)
            for (let j = 1; j <= b.length; j++)
              dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
          return dp[a.length][b.length];
        }

        const closest = allCmds
          .map(k => ({ k, d: levenshtein(commandName, k) }))
          .sort((a, b) => a.d - b.d)
          .filter(x => x.d <= 3)
          .slice(0, 3);

        if (closest.length > 0) {
          const suggestion = closest[0].k;
          // Usa SEMPRE o prefixo principal (index 0), não o que o utilizador digitou
          // Se o utilizador digitou ".menu" com prefixo "." mas o principal é "$",
          // a sugestão deve mostrar "$menu", não "$.menu"
          const primaryPrefix = prefixes[0] || prefix;
          const correctCmd = primaryPrefix + suggestion;
          const menuCmd    = primaryPrefix + 'menu';
          // v5.3: personalidade do change determina o tom da sugestão
          const { formatResponse } = require('./botPersonality');
          const _theme = await require('./themeResolver').getThemeForContext(ctx.remoteJid).catch(() => null);
          const _sugLine = formatResponse(_theme, suggestion, 'suggestion', { ...ctx, prefix: primaryPrefix });
          const _errLine = formatResponse(_theme, commandName, 'error', ctx);
          const warnText = `${_errLine}\n\n${_sugLine}`;
          try {
            const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
            const btnMsg = generateWAMessageFromContent(ctx.remoteJid, {
              interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                body:   proto.Message.InteractiveMessage.Body.fromObject({ text: warnText }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: commandConfig.bot.name }),
                header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                  buttons: [
                    { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 Copiar: ' + correctCmd, copy_code: correctCmd }) },
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📜 Ver menu', id: menuCmd }) },
                  ],
                }),
              }),
            }, { userJid: sock.user?.id, quoted: msg });
            await sock.relayMessage(ctx.remoteJid, btnMsg.message, {
              messageId: btnMsg.key.id,
              additionalNodes: [{ tag: 'biz', attrs: {}, content: [{
                tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
              }]}],
            });
          } catch {
            await sock.sendMessage(ctx.remoteJid, { text: warnText + `\n\nUsa *${menuCmd}* para ver todos os comandos.` }, { quoted: msg });
          }
        }
        // Sem sugestão → silêncio total (não polui grupos)
      } // fim if commandName.length >= 2
      return false;
    }
    if (cmd.accessLevel === 'owner' && !isOwner) {
      await sock.sendMessage(ctx.remoteJid, { text: '🚫 Só Dono.' }, { quoted: msg }); return true;
    }
    if (cmd.accessLevel === 'premium') {
      const user = await User.findOne({ whatsappNumber: ctx.senderNumber });
      const isPrem = isOwner || checkIsPremium(user);
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
  const isPremium = isOwner || checkIsPremium(user);

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


// ── v6.45: wrapper de performance ───────────────────────────────
// _handleInner tem dezenas de `return false` espalhados. Envolvê-la
// garante que o cache de request é sempre aberto e fechado, mesmo
// quando ela sai a meio ou lança. Sem isto, o cache de uma mensagem
// podia vazar para a seguinte e servir dados velhos.
async function handle(sock, msg) {
  requestCache.begin();
  try {
    return await _handleInner(sock, msg);
  } finally {
    requestCache.end();
  }
}

module.exports = { handle, extractText, getSenderInfo, fillVars };
