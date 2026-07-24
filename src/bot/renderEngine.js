/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v6 — Render Engine 🕸️                              ║
 * ║   Liga o change ao output real do bot                         ║
 * ║   Cada mensagem passa por aqui → sai com o visual do change   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const changeThemes = require('./changeThemes');
const { applyFont, getFont, getPersonality, formatResponse } = require('./botPersonality');
const themeResolver = require('./themeResolver');

/**
 * Resolve o tema activo para um contexto (grupo ou global)
 */
async function getTheme(groupJid) {
  return themeResolver.getThemeForContext(groupJid);
}

/**
 * Renderiza um bloco de texto com as bordas decorativas do change.
 * Usa topBorder/bottomBorder/linePrefix/font do tema se disponíveis,
 * senão usa o frame clássico.
 */
function renderBlock(theme, title, lines = [], opts = {}) {
  const t = theme || changeThemes.getTheme('dark');
  const f = t.font || 'smallcaps';
  const icon = t.icon || '🕸️';
  const bullet = t.bullet || '▸';
  const V = t.frame?.[5] || '│';
  const H = t.frame?.[4] || '─';

  // Bordas decorativas (v5.6+) ou frame clássico
  const hasNewBorders = t.topBorder || t.bottomBorder;
  const top = hasNewBorders
    ? (t.topBorder || '').replace(/{TITLE}/g, applyFont(title || '', f)).replace(/{ICON}/g, icon).replace(/{BOT}/g, opts.botName || 'DARK BOT')
    : `${t.frame?.[0] || '╭'}${H.repeat(3)} ${icon} ${applyFont((title || 'MENU').toUpperCase(), f)} ${H.repeat(3)}${t.frame?.[1] || '╮'}`;

  const bot = hasNewBorders
    ? (t.bottomBorder || '').replace(/{ICON}/g, icon).replace(/{BOT}/g, opts.botName || 'DARK BOT')
    : `${t.frame?.[2] || '╰'}${H.repeat(30)}${t.frame?.[3] || '╯'}`;

  const linePfx = t.linePrefix || `${V}${bullet} `;
  const sep = t.sectionSep || t.sectionTop || '';

  const out = [top];
  if (sep && title) out.push(sep.replace(/{TITLE}/g, applyFont(title, f)).replace(/{ICON}/g, icon));

  for (const line of lines) {
    out.push(linePfx + line);
  }

  out.push(bot);
  if (t.vibe) out.push(`> ${t.vibe}`);
  return out.join('\n');
}

/**
 * Renderiza uma lista de comandos (submenu) com o visual do change.
 */
function renderSubmenu(theme, title, commands = [], opts = {}) {
  const t = theme || changeThemes.getTheme('dark');
  const f = t.font || 'smallcaps';
  const icon = t.icon || '🕸️';
  const prefix = opts.prefix || '!';

  const lines = commands.map(c => {
    const cmd = `${prefix}${c.name || c.cmd || ''}`;
    const desc = c.desc || c.description || '';
    return desc ? `*${cmd}* — _${desc}_` : `*${cmd}*`;
  });

  return renderBlock(t, title, lines, opts);
}

/**
 * Renderiza o cabeçalho de info (perfil, status, ping) com o visual do change.
 */
function renderInfo(theme, fields = [], opts = {}) {
  const t = theme || changeThemes.getTheme('dark');
  const f = t.font || 'smallcaps';
  const icon = t.icon || '🕸️';

  // Usa infoLine do tema se disponível (ex: SasukeRPG)
  const linePfx = t.infoLine || t.linePrefix || `┃${icon} `;

  const lines = fields.map(([label, value]) => {
    const fl = applyFont(label, f);
    return `${fl}: ${value}`;
  });

  return renderBlock(t, opts.title || 'INFO', lines, opts);
}

/**
 * Renderiza uma resposta com personalidade (erro, sucesso, sugestão, uso).
 */
function renderResponse(theme, type, data, ctx = {}) {
  return formatResponse(theme, data, type, ctx);
}

/**
 * Renderiza o texto do card do menu carousel com o visual do change.
 */
function renderMenuCard(theme, info = {}, opts = {}) {
  const t = theme || changeThemes.getTheme('dark');
  const f = t.font || 'smallcaps';
  const icon = t.icon || '🕸️';

  const botName = opts.botName || 'DARK BOT';
  const userName = info.pushName || 'Utilizador';
  const cargo = info.cargo || 'Membro';
  const vip = info.vip || 'INATIVO ❌';
  const prefix = info.prefix || '!';

  // Aplica a fonte do change a cada campo
  const lines = [
    `${applyFont('BOT', f)}: ${botName}`,
    `${applyFont('USUÁRIO', f)}: ${userName}`,
    `${applyFont('CARGO', f)}: ${cargo}`,
    `${applyFont('VIP', f)}: ${vip}`,
    `${applyFont('PREFIXO', f)}: 『${prefix}』`,
  ];

  return lines.join('\n');
}

/**
 * Footer do menu com o visual do change.
 */
function renderMenuFooter(theme, botName = 'DARK BOT') {
  const t = theme || changeThemes.getTheme('dark');
  return `${t.icon || '🕸️'} ${botName} · ${t.vibe || 'Dark Engine'}`;
}

module.exports = {
  getTheme,
  renderBlock,
  renderSubmenu,
  renderInfo,
  renderResponse,
  renderMenuCard,
  renderMenuFooter,
};
