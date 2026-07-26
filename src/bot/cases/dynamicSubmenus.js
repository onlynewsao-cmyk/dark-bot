/**
 * DARK BOT v6.8 — Submenus Dinâmicos
 * Sobrepõe os submenus hardcoded com versões que mostram
 * TODOS os comandos de cada categoria (do submenuData).
 */
'use strict';

const sd = require('../submenuData');

async function dynSub(sock, msg, ctx, config, category) {
  const meta = sd.SUBMENU_META[category];
  if (!meta) return;
  
  const ch = require('../caseHandler');
  const allCmds = [...ch.CASES.keys()];
  const items = sd.buildItems(allCmds, category);
  
  if (!items.length) return;
  
  // Usar sendStyledCommandList do nativeCommands
  const nc = require('../nativeCommands');
  // sendStyledCommandList não é exportada — preciso de a chamar indirectamente
  // Alternativa: construir a resposta directamente
  
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  const pe = require('../prefixEngine');
  const p = await pe.getActivePrefix(ctx.remoteJid).catch(() => config.bot.prefix);
  const botName = config.bot.name || 'DARK BOT';
  
  // Separar sel vs texto
  const selCmds = items.filter(it => it.sel === true);
  const txtCmds = items.filter(it => it.sel !== true);
  
  // Texto com bordas do change
  const textBody = RE.renderSubmenu(t, meta.title.replace(/^[^\s]+\s/, ''), txtCmds.map(it => ({
    name: it.cmd,
    desc: it.desc || '',
  })), { prefix: p, botName });
  
  // Lista de seleção
  const rows = selCmds.slice(0, 24).map(it => ({
    title: `${it.emoji || t.bullet || '▸'} ${p}${it.cmd}`,
    description: (it.desc || '').slice(0, 72),
    id: `${p}${it.cmd}`,
  }));
  
  let sent = false;
  if (rows.length) {
    try {
      const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
      const listParams = {
        title: `${t.icon || '🕸️'} ${meta.title}`,
        sections: [{ title: `${t.icon || '🕸️'} AÇÕES DIRECTAS`, rows }],
      };
      const m = generateWAMessageFromContent(ctx.remoteJid, {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({ text: textBody }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `${t.icon || '🕸️'} ${botName}` }),
          header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify(listParams) }],
          }),
        }),
      }, { userJid: sock.user?.id, quoted: msg });
      await sock.relayMessage(ctx.remoteJid, m.message, {
        messageId: m.key.id,
        additionalNodes: [{ tag: 'biz', attrs: {}, content: [{
          tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
          content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
        }]}],
      });
      sent = true;
    } catch {}
  }
  
  if (!sent) {
    await sock.sendMessage(ctx.remoteJid, { text: textBody }, { quoted: msg });
  }
}

module.exports = function registerDynamicSubmenus(registerCase) {
  // Sobrepõe TODOS os submenus com versões dinâmicas
  registerCase(['menudownload', 'down', 'menudl', 'downloads'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'downloads');
  });
  
  registerCase(['menustickers', 'menufigurinhas', 'menulogos'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'stickers');
  });
  
  registerCase(['menuia', 'menubotia'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'ia');
  });
  
  registerCase(['menugrupo', 'menuadm', 'menuadmin'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'admin');
  });
  
  registerCase(['menujogos', 'menugames'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'jogos');
  });
  
  registerCase(['menueconomia', 'menucoins', 'menubank'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'economia');
  });
  
  registerCase(['menuinteracoes', 'menufamilia', 'brincadeiras', 'menudiversao'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'interacoes');
  });
  
  registerCase(['menustatus', 'menualteradores', 'menuaudio'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'audio');
  });
  
  // Novos submenus que não existiam
  registerCase(['menutexto', 'menuutilidades'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'texto');
  });
  
  registerCase(['menusearch', 'menustalk'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'search');
  });
  
  registerCase(['menulogos2', 'menuefeitos'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'logos');
  });
  
  registerCase(['menuinfo', 'menuperfil'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'info');
  });
  
  registerCase(['menuzoeira', 'menumedidores'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'zoeira');
  });
  
  registerCase(['menurank', 'menuranking'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'rank');
  });
  
      registerCase(['submenuRPG', 'menurpg', 'menurpg2'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'economia');
  });

  registerCase(['maiscmds', 'menumais'], async ({ sock, msg, ctx, config }) => {
    return dynSub(sock, msg, ctx, config, 'owner');
  });

  registerCase(['menudono', 'menuowner', 'cmdsocultos', 'portal18'], async ({ sock, msg, ctx, config, isOwner }) => {
    if (!isOwner) return;
    return dynSub(sock, msg, ctx, config, 'owner');
  });
};
