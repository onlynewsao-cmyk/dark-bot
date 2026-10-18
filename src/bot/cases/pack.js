/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — .pack (trocar nome do pack etc.)                 ║
 * ║                                                               ║
 * ║   Um comando só para configurar o PACK das figurinhas:        ║
 * ║   nome, autor/marca, slogan, link e marca d'água.             ║
 * ║                                                               ║
 * ║   • No GRUPO (dono/admin) → muda o pack DESTE grupo           ║
 * ║   • No PV (dono) ou com "global" → muda o default global      ║
 * ║                                                               ║
 * ║   Uso:                                                        ║
 * ║     .pack                        → estado actual               ║
 * ║     .pack nome <Nome do Pack>    → muda o nome/título          ║
 * ║     .pack autor <Autor>          → muda o autor/marca          ║
 * ║     .pack slogan <Frase>         → muda o slogan               ║
 * ║     .pack link <link canal/grupo>→ muda o link «Ver pacote»    ║
 * ║     .pack on | off               → liga/desliga a marca        ║
 * ║     .pack visivel on | off       → texto visível no sticker    ║
 * ║     .pack global <sub> <valor>   → força o default global      ║
 * ║     .packbot nome|autor|descricao → atalho global (só dono)   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

/* ══════════════════════════ Helpers puros (testáveis) ══════════════════════════ */

const GLOBAL_KEYS = new Set(['global', 'default', 'padrao', 'padrão']);
const STATUS_KEYS = new Set(['status', 'ver', 'info', 'mostrar']);
const NOME_KEYS = new Set(['nome', 'name', 'titulo', 'título', 'canal']);
const AUTOR_KEYS = new Set(['autor', 'author', 'marca', 'brand']);
const TEXTO_KEYS = new Set(['texto', 'text', 'wm', 'marcavisivel']);
const SLOGAN_KEYS = new Set(['slogan', 'frase', 'descricao', 'descrição', 'description']);
const LINK_KEYS = new Set(['link', 'url']);
const STORE_KEYS = new Set(['loja', 'store', 'playstore']);
const THEME_KEYS = new Set(['tema', 'theme']);
const RESET_KEYS = new Set(['reset', 'repor', 'reiniciar']);

/**
 * Separa os argumentos em { global, sub, value }.
 *   ['.pack', 'global', 'nome', 'X'] → { global:true, sub:'nome', value:'X' }
 *   ['.pack', 'nome', 'X']           → { global:false, sub:'nome', value:'X' }
 */
function parseSub(args) {
  const a = (Array.isArray(args) ? args : []).map(x => String(x));
  const first = (a[0] || '').toLowerCase();
  if (GLOBAL_KEYS.has(first)) {
    return { global: true, sub: (a[1] || '').toLowerCase(), value: a.slice(2).join(' ').trim() };
  }
  return { global: false, sub: first, value: a.slice(1).join(' ').trim() };
}

/** 'on'/'off'/nulo a partir de sinónimos PT/EN. */
function isOnOff(v) {
  const s = String(v || '').toLowerCase().trim();
  if (['on', 'sim', 'true', '1', 'ativo', 'ativar', 'ligar'].includes(s)) return 'on';
  if (['off', 'nao', 'não', 'false', '0', 'inativo', 'desativo', 'desativar', 'desligar'].includes(s)) return 'off';
  return null;
}

/** Normaliza o texto (limpa espaços, corta no tamanho). */
function limpar(val, max = 80) {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Monta o texto de estado. Puro — não toca em BD nem socket. */
function packStatusText(prefix, glob, chat, isGroup) {
  const p = prefix || '.';
  const onOff = (b) => (b ? '✅ ON' : '🛑 OFF');
  const links = [
    glob.channelUrl ? `Canal/grupo: ${glob.channelUrl}` : '',
    glob.androidStoreUrl ? `Loja Android: ${glob.androidStoreUrl}` : '',
    glob.iosStoreUrl ? `Loja iOS: ${glob.iosStoreUrl}` : '',
  ].filter(Boolean);
  let out = `📦 *PACOTE DARK NET AO*\n\n` +
    `🌐 *Global* (base dos stickers):\n` +
    `   Marca: *${glob.author || 'Dark Net Ao'}*\n` +
    `   Canal/pack: *${glob.channelName || glob.packName || 'Dark Net Ao'}*${glob.channelName ? ' (opcional)' : ' (sem nome de canal configurado)'}\n` +
    `   Marca d'água/metadados: ${onOff(glob.enabled)}\n` +
    `   Assinatura visível: ${onOff(glob.visible)} · Tema: *${glob.theme || 'darktoxic'}*\n` +
    (glob.slogan ? `   Slogan: *${glob.slogan}*\n` : '') +
    `   ${links.length ? links.join('\n   ') : 'Sem links verificados configurados.'}\n`;

  if (isGroup) {
    if (chat && chat.enabled) {
      const groupLinks = [
        chat.channelUrl ? `Canal/grupo: ${chat.channelUrl}` : '',
        chat.androidStoreUrl ? `Loja Android: ${chat.androidStoreUrl}` : '',
        chat.iosStoreUrl ? `Loja iOS: ${chat.iosStoreUrl}` : '',
      ].filter(Boolean);
      out += `\n🏠 *Este grupo* (personalização própria):\n` +
        `   Título: *${chat.channelName || chat.packName || chat.brand || 'Dark Net Ao'}*\n` +
        `   Marca: *${chat.brand || 'Dark Net Ao'}* · Tema: *${chat.theme || 'darktoxic'}*\n` +
        `   Assinatura visível: ${onOff(chat.visibleWatermark)}\n` +
        (chat.slogan ? `   Slogan: *${chat.slogan}*\n` : '') +
        `   ${groupLinks.length ? groupLinks.join('\n   ') : 'Sem links locais; usa-se apenas a marca do grupo.'}\n`;
    } else {
      out += `\n🏠 *Este grupo*: usa a configuração global; ainda não tem personalização própria.\n`;
    }
  }

  out += `\n*Personalização por WhatsApp:*\n` +
    `   ${p}pack nome <nome do canal/pack>\n` +
    `   ${p}pack autor <marca>\n` +
    `   ${p}pack slogan <frase>\n` +
    `   ${p}pack link <convite WhatsApp verificado>\n` +
    `   ${p}pack loja android|ios <URL publicada>\n` +
    `   ${p}pack tema darktoxic|clean\n` +
    `   ${p}pack visivel on|off\n` +
    `   ${p}pack on|off · ${p}pack reset\n` +
    `   ${p}pack global <subcomando> <valor> (só Dono)\n` +
    `\n📦 Para ver os links do pacote: *${p}pack*`;
  return out;
}

/* ══════════════════════════ Snapshot / setters ══════════════════════════ */

async function globalSnapshot() {
  const bcc = require('../botConfigCache');
  const wm = require('../stickerWm');
  const [enabled, pack] = await Promise.all([
    bcc.get('sticker_watermark_enabled', true).catch(() => true),
    wm.getGlobalDefault().catch(() => null),
  ]);
  return {
    enabled,
    visible: !!pack?.visibleWatermark,
    packName: pack?.packName || 'Dark Net Ao',
    channelName: pack?.channelName || '',
    channelUrl: pack?.channelUrl || '',
    androidStoreUrl: pack?.androidStoreUrl || '',
    iosStoreUrl: pack?.iosStoreUrl || '',
    author: pack?.brand || 'Dark Net Ao',
    text: pack?.watermarkText || pack?.brand || 'Dark Net Ao',
    slogan: pack?.slogan || '',
    theme: pack?.theme || 'darktoxic',
  };
}

async function setGlobal(key, val) {
  const BotConfig = require('../database/models/BotConfig');
  await BotConfig.set(key, val);
  try { require('../botConfigCache').clear(); } catch {}
}

async function chatSnapshot(jid) {
  const wm = require('../stickerWm');
  return wm.getForJid(jid).catch(() => null);
}

async function setChat(jid, patch) {
  const wm = require('../stickerWm');
  const cur = await wm.getForJid(jid).catch(() => null);
  return wm.saveForJid(jid, {
    brand: patch.brand !== undefined ? patch.brand : cur?.brand,
    slogan: patch.slogan !== undefined ? patch.slogan : cur?.slogan,
    channelUrl: patch.channelUrl !== undefined ? patch.channelUrl : (cur?.channelUrl || ''),
    cta: patch.cta !== undefined ? patch.cta : cur?.cta,
    channelName: patch.channelName !== undefined ? patch.channelName : (cur?.channelName || ''),
    androidStoreUrl: patch.androidStoreUrl !== undefined ? patch.androidStoreUrl : (cur?.androidStoreUrl || ''),
    iosStoreUrl: patch.iosStoreUrl !== undefined ? patch.iosStoreUrl : (cur?.iosStoreUrl || ''),
    theme: patch.theme !== undefined ? patch.theme : (cur?.theme || 'darktoxic'),
    visibleWatermark: patch.visibleWatermark !== undefined ? patch.visibleWatermark : (cur?.visibleWatermark || false),
    enabled: true,
    linkType: patch.linkType !== undefined ? patch.linkType : (cur?.linkType || ''),
  });
}

async function setGlobalLink(url, name) {
  const wm = require('../stickerWm');
  // Se o WhatsApp não expôs o nome do canal, não apaga um título global que
  // o dono já tenha configurado manualmente.
  return wm.saveGlobalDefault({ link: url, ...(name ? { channelName: name } : {}) });
}

async function saveGlobalPack(data) {
  // Único caminho para nome, autor e descrição globais: mantém as chaves
  // novas e legadas alinhadas e limpa o cache dentro de stickerWm.
  return require('../stickerWm').saveGlobalDefault(data);
}

/* ══════════════════════════ Case ══════════════════════════ */

module.exports = function registerPack(registerCase) {
  const handlePack = async ({ sock, ctx, args, prefix, reply, react, isOwner, isAdminFn }) => {
    const p = prefix || '.';
    const jid = ctx.remoteJid || '';
    const isGroup = !!ctx.isGroup;
    const parsed = parseSub(args);

    // ── STATUS ────────────────────────────────────────────────
    if (!parsed.sub || STATUS_KEYS.has(parsed.sub)) {
      const glob = await globalSnapshot();
      const chat = isGroup ? await chatSnapshot(jid) : null;
      return reply(packStatusText(p, glob, chat, isGroup));
    }

    // ── Permissões ────────────────────────────────────────────
    let isAdmin = false;
    if (isGroup && !isOwner) {
      try { isAdmin = typeof isAdminFn === 'function' ? await isAdminFn() : false; } catch {}
    }
    const podeChat = isOwner || isAdmin;
    if (!podeChat) {
      return reply(isGroup
        ? '🚫 Só o *Dono* ou *Admins* do grupo podem mudar o pack aqui.'
        : '🚫 Só o *Dono* muda o pack.');
    }

    // Acções GLOBAL (forçadas com "global") exigem dono
    if (parsed.global && !isOwner) {
      return reply('🚫 Só o *Dono* define o pack *global*.');
    }

    const sub = parsed.sub;
    const value = limpar(parsed.value, 500);

    // ── ON / OFF ──────────────────────────────────────────────
    if (sub === 'on' || sub === 'off') {
      const on = sub === 'on';
      // em grupo (sem "global") → pack do grupo; senão → marca global
      if (isGroup && !parsed.global) {
        const cur = await chatSnapshot(jid);
        if (on) {
          if (!cur) return reply(`ℹ️ Este grupo ainda não tem pack. Define primeiro:\n*${p}pack nome* <Nome>  ou  *${p}pack link* <link>`);
          await setChat(jid, {});
          return reply(`✅ Pack *deste grupo*: *ACTIVO*.\n${require('../stickerWm').statusText(await chatSnapshot(jid), p)}`);
        }
        await require('../stickerWm').clearForJid(jid);
        return reply('✅ Pack deste grupo *DESACTIVADO*. Volta ao default global.');
      }
      await setGlobal('sticker_watermark_enabled', on);
      return reply(`✅ Marca d'água *global*: ${on ? '✅ ON' : '🛑 OFF'}.`);
    }

    // ── ASSINATURA VISÍVEL (por grupo; global só Dono) ─────────
    if (sub === 'visivel' || sub === 'visível') {
      const st = isOnOff(parsed.value);
      if (!st) return reply(`Usa: *${p}pack visivel* on | off`);
      if (isGroup && !parsed.global) {
        await setChat(jid, { visibleWatermark: st === 'on' });
        return reply(`✅ Assinatura visível neste grupo: ${st === 'on' ? '✅ ON' : '🛑 OFF'}.`);
      }
      if (!isOwner) return reply('🚫 Só o *Dono* muda a assinatura visível global.');
      await saveGlobalPack({ visibleWatermark: st === 'on' });
      return reply(`✅ Assinatura visível global: ${st === 'on' ? '✅ ON' : '🛑 OFF'}.`);
    }

    // ── TEMA VISUAL ────────────────────────────────────────────
    if (THEME_KEYS.has(sub)) {
      const theme = value.toLowerCase();
      if (!['darktoxic', 'clean'].includes(theme)) return reply(`Usa: *${p}pack tema* darktoxic | clean`);
      if (isGroup && !parsed.global) {
        await setChat(jid, { theme });
        return reply(`✅ Tema do pack deste grupo: *${theme}*.`);
      }
      if (!isOwner) return reply('🚫 Só o *Dono* muda o tema global.');
      await saveGlobalPack({ theme });
      return reply(`✅ Tema global: *${theme}*.`);
    }

    // ── LOJAS DE APPS VERIFICADAS ─────────────────────────────
    if (STORE_KEYS.has(sub)) {
      const match = value.match(/^(android|ios)[ ]+(.+)$/i);
      if (!match) return reply(`Usa: *${p}pack loja android* <URL publicada> ou *ios* <URL publicada>.\nPara limpar: *${p}pack loja android off*`);
      const platform = match[1].toLowerCase();
      const rawUrl = match[2].trim();
      const field = platform === 'android' ? 'androidStoreUrl' : 'iosStoreUrl';
      if (isOnOff(rawUrl) === 'off' || /^(limpar|clear|remover)$/i.test(rawUrl)) {
        if (isGroup && !parsed.global) await setChat(jid, { [field]: '' });
        else {
          if (!isOwner) return reply('🚫 Só o *Dono* altera a loja global.');
          await saveGlobalPack({ [field]: '' });
        }
        return reply(`✅ Link da loja ${platform} removido.`);
      }
      const wm = require('../stickerWm');
      if (!wm.validateStoreUrl(rawUrl, platform)) {
        return reply(`❌ Esse endereço não é uma loja ${platform} reconhecida. O link não foi guardado.`);
      }
      react('⏳');
      const verified = await wm.verifyStoreUrl(rawUrl, platform).catch(() => null);
      if (!verified?.url) {
        react('❌');
        return reply('❌ Não consegui confirmar que esse link da loja está acessível. Não o guardei.');
      }
      if (isGroup && !parsed.global) await setChat(jid, { [field]: verified.url });
      else {
        if (!isOwner) return reply('🚫 Só o *Dono* altera a loja global.');
        await saveGlobalPack({ [field]: verified.url });
      }
      react('✅');
      return reply(`✅ Link ${platform === 'android' ? 'Android' : 'iOS'} verificado e guardado:\n${verified.url}`);
    }

    // ── REPOR ─────────────────────────────────────────────────
    if (RESET_KEYS.has(sub)) {
      if (isGroup && !parsed.global) {
        await require('../stickerWm').clearForJid(jid);
        return reply('✅ Personalização deste grupo removida. Passa a usar o pack global Dark Net Ao.');
      }
      if (!isOwner) return reply('🚫 Só o *Dono* pode repor o pack global.');
      const saved = await saveGlobalPack({
        brand: 'Dark Net Ao', authorName: 'Dark Net Ao', watermarkText: 'Dark Net Ao',
        channelName: '', channelUrl: '', packUrl: '', slogan: '', androidStoreUrl: '', iosStoreUrl: '',
        theme: 'darktoxic', visibleWatermark: false,
      });
      return reply(`✅ Pack global reposto: *${saved.brand}*. Os links foram removidos; nenhum destino foi inventado.`);
    }

    // ── NOME ──────────────────────────────────────────────────
    if (NOME_KEYS.has(sub)) {
      if (!value) return reply(`Usa: *${p}pack ${parsed.global ? 'global ' : ''}nome* <Nome do Pack>`);
      if (isGroup && !parsed.global) {
        await setChat(jid, { channelName: value });
        return reply(`✅ Título do pack *deste grupo*: *${value}*\n\n${require('../stickerWm').statusText(await chatSnapshot(jid), p)}`);
      }
      const saved = await saveGlobalPack({ channelName: value.slice(0, 80) });
      return reply(`✅ Nome do pack *global*: *${saved.packName}*`);
    }

    // ── AUTOR / MARCA ─────────────────────────────────────────
    if (AUTOR_KEYS.has(sub)) {
      if (!value) return reply(`Usa: *${p}pack ${parsed.global ? 'global ' : ''}autor* <Autor>`);
      if (isGroup && !parsed.global) {
        await setChat(jid, { brand: value });
        return reply(`✅ Marca do pack *deste grupo*: *${value}*\n\n${require('../stickerWm').statusText(await chatSnapshot(jid), p)}`);
      }
      const saved = await saveGlobalPack({ brand: value.slice(0, 80), authorName: value.slice(0, 80) });
      return reply(`✅ Autor do pack *global*: *${saved.authorName}*`);
    }

    // ── TEXTO VISÍVEL (marca no sticker) — global, dono ──────
    if (TEXTO_KEYS.has(sub)) {
      if (!isOwner) return reply('🚫 Só o *Dono* muda o texto visível da marca.');
      if (!value) return reply(`Usa: *${p}pack texto* <Texto>`);
      await setGlobal('sticker_watermark_text', value.slice(0, 32));
      return reply(`✅ Texto da marca visível: *${value.slice(0, 32)}*`);
    }

    // ── SLOGAN ────────────────────────────────────────────────
    if (SLOGAN_KEYS.has(sub)) {
      if (!value) return reply(`Usa: *${p}pack ${parsed.global ? 'global ' : ''}slogan* <Frase>`);
      if (isGroup && !parsed.global) {
        await setChat(jid, { slogan: value });
        return reply(`✅ Slogan do pack *deste grupo*: *${value}*\n\n${require('../stickerWm').statusText(await chatSnapshot(jid), p)}`);
      }
      const saved = await saveGlobalPack({ slogan: value.slice(0, 80) });
      return reply(`✅ Descrição *global*: *${saved.slogan}*`);
    }

    // ── LINK ──────────────────────────────────────────────────
    if (LINK_KEYS.has(sub)) {
      if (!value) return reply(`Cola o link: *${p}pack ${parsed.global ? 'global ' : ''}link* https://whatsapp.com/channel/...`);
      react('⏳');
      const wm = require('../stickerWm');
      const detected = await wm.resolveAnyLink(value, sock).catch(() => null);
      if (!detected?.url) {
        return reply(`❌ Não consegui confirmar que o destino está acessível. Só guardo convites de canal/grupo WhatsApp verificados.\nUsa: *${p}pack link* https://whatsapp.com/channel/...`);
      }
      if (isGroup && !parsed.global) {
        const cur = await chatSnapshot(jid);
        await setChat(jid, {
          channelUrl: detected.url,
          channelName: detected.name || cur?.channelName || '',
          linkType: detected.type || '',
        });
        react('✅');
        return reply(`✅ Link de *${detected.type === 'group' ? 'grupo' : 'canal'}* guardado para este grupo.\n` +
          (detected.name ? '' : `Não apanhei o nome. Usa *${p}pack nome* Nome do Canal\n\n`) +
          require('../stickerWm').statusText(await chatSnapshot(jid), p));
      }
      const saved = await setGlobalLink(detected.url, detected.name || '');
      react('✅');
      return reply(`✅ Link *global* do «Ver pacote»:\n` +
        `Nome: *${saved.packName}*\nLink: ${saved.channelUrl}\n` +
        (detected.name ? '' : `Se o nome não veio, usa *${p}pack global nome* Nome do Canal`));
    }

    return reply(`❓ Subcomando desconhecido: *${sub}*\nUsa *${p}pack* para ver tudo o que podes mudar.`);
  };

  registerCase(['pack', 'pacote'], handlePack);
  registerCase(['packview', 'verpack', 'verpacote', 'stickerspack'], async ({ sock, ctx, reply, msg, prefix }) => {
    const packs = require('../stickerPack');
    const result = await packs.sendLastPack(sock, ctx.remoteJid, { quoted: msg?.msg || msg }).catch(() => ({ ok: false }));
    if (result?.ok) return reply(`✅ Reenviei o pacote completo *${result.pack.name || result.pack.packName || 'Dark Net Ao'}* para esta conversa.`);
    const meta = await require('../stickerWm').resolvePack(ctx.remoteJid).catch(() => null);
    const sentLink = meta ? await packs.sendPackOffer(sock, ctx.remoteJid, meta, msg?.msg || msg).catch(() => false) : false;
    if (sentLink) return true;
    return reply(`📦 Ainda não há um pack completo recente nesta conversa nem um link verificado.\nCria um com *${prefix || '.'}pinpacks* <tema> e configura acessos com *${prefix || '.'}pack link* ou *${prefix || '.'}pack loja android|ios*.`);
  });
  // Atalho simples, sempre global e sempre protegido por isOwner.
  registerCase(['packbot', 'packglobal', 'setpackglobal'], (command) => {
    if (!command.isOwner) return command.reply('🚫 Só o *Dono* pode alterar o pack global.');
    return handlePack({ ...command, args: ['global', ...(command.args || [])] });
  });
};

module.exports.parseSub = parseSub;
module.exports.isOnOff = isOnOff;
module.exports.limpar = limpar;
module.exports.packStatusText = packStatusText;
