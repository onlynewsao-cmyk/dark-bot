/**
 * DARK BOT v5.5 — Stubs de comandos do ficheiro de referência
 * Gerado automaticamente — 882 comandos organizados por categoria
 * Cada stub responde com o tom da personalidade activa (change)
 */
'use strict';

const themeResolver = require('../themeResolver');

const CAT_META = {
  "rpg_perfil": {
    "icon": "🩸",
    "label": "PERFIL & RANKING RPG"
  },
  "rpg_economia": {
    "icon": "💰",
    "label": "ECONOMIA RPG"
  },
  "rpg_trabalho": {
    "icon": "⚒️",
    "label": "TRABALHOS"
  },
  "rpg_evolucao": {
    "icon": "🧘",
    "label": "EVOLUÇÃO"
  },
  "rpg_cassino": {
    "icon": "🎰",
    "label": "CASSINO & APOSTAS"
  },
  "rpg_pet": {
    "icon": "🐾",
    "label": "PETS & COMPANHEIROS"
  },
  "rpg_combate": {
    "icon": "⚔️",
    "label": "COMBATE & BATALHAS"
  },
  "rpg_craft": {
    "icon": "🔨",
    "label": "CRAFTING"
  },
  "rpg_social": {
    "icon": "💝",
    "label": "SOCIAL RPG"
  },
  "rpg_familia": {
    "icon": "👨‍‍👧",
    "label": "FAMÍLIA"
  },
  "rpg_cla": {
    "icon": "🏰",
    "label": "CLÃ & COMUNIDADE"
  },
  "rpg_premium": {
    "icon": "💎",
    "label": "LOJA PREMIUM"
  },
  "rpg_admin": {
    "icon": "🔧",
    "label": "ADMIN RPG"
  },
  "search": {
    "icon": "🔎",
    "label": "SEARCH & STALK"
  },
  "ia": {
    "icon": "🤖",
    "label": "IAs & CHATBOTS"
  },
  "figurinhas": {
    "icon": "🖼️",
    "label": "FIGURINHAS"
  },
  "random": {
    "icon": "🎲",
    "label": "RANDOM & UTILS"
  },
  "interacao": {
    "icon": "💬",
    "label": "INTERAÇÕES"
  },
  "efeitos": {
    "icon": "🎨",
    "label": "EFEITOS DE TEXTO"
  },
  "audio": {
    "icon": "🎧",
    "label": "EFEITOS DE ÁUDIO"
  },
  "downloads_extra": {
    "icon": "📥",
    "label": "DOWNLOADS EXTRA"
  },
  "logos": {
    "icon": "🖋️",
    "label": "LOGOTIPOS"
  },
  "jogos": {
    "icon": "🎮",
    "label": "JOGOS & DIVERSÃO"
  },
  "admin": {
    "icon": "🛡️",
    "label": "ADMIN & GRUPO"
  },
  "perfil_extra": {
    "icon": "👤",
    "label": "PERFIL & STATUS"
  },
  "flood": {
    "icon": "💥",
    "label": "FLOOD"
  },
  "antiraid": {
    "icon": "🛡️",
    "label": "ANTI RAID"
  },
  "relacionamentos": {
    "icon": "💞",
    "label": "RELACIONAMENTOS"
  },
  "outros": {
    "icon": "📌",
    "label": "OUTROS"
  }
};

module.exports = function registerStubs(registerCase) {
  registerCase(['abracarrpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_social'] || CAT_META.outros;
    return reply(ic + ' *' + 'ABRACARRPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['abraco'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'ABRACO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['abv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'ABV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['aceitarconvite'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cla'] || CAT_META.outros;
    return reply(ic + ' *' + 'ACEITARCONVITE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['aceitatodos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ACEITATODOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['addautoadm'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADDAUTOADM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['addautoadmidia'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADDAUTOADMIDIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['addblacklist'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADDBLACKLIST' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['addcmdvip'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADDCMDVIP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['addmod'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADDMOD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['addparceria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADDPARCERIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['addregra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADDREGRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['admins'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADMINS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['adotaruser'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_familia'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADOTARUSER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['adv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ADV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['afk'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'AFK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['america'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'AMERICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['americanflag'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'AMERICANFLAG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['amongus'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'AMONGUS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['analogica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANALOGICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['analogico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANALOGICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['anime2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANIME2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antibtn'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIBTN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antidemote'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['antiraid'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIDEMOTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antidoc'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIDOC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antifig'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIFIG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antifigurinha'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['antiraid'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIFIGURINHA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antiflood'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['antiraid'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIFLOOD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antilinkcanal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTILINKCANAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antilinkgp'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTILINKGP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antilinkhard'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTILINKHARD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antilinksoft'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTILINKSOFT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antiloc'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTILOC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antipalavra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIPALAVRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antiporn'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIPORN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antiraid'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['antiraid'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTIRAID' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antisocial'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTISOCIAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antistatus'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTISTATUS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['antitoxic'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ANTITOXIC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['apps'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'APPS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['aprovar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'APROVAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['aptoide'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'APTOIDE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['arena'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_combate'] || CAT_META.outros;
    return reply(ic + ' *' + 'ARENA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['arvore'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_familia'] || CAT_META.outros;
    return reply(ic + ' *' + 'ARVORE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['assaltar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_combate'] || CAT_META.outros;
    return reply(ic + ' *' + 'ASSALTAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['assistente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'ASSISTENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ateia'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ATEIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ateu'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ATEU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['atividade'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ATIVIDADE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['atleta'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ATLETA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['auction'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'AUCTION' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['autodl'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'AUTODL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['automsg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'AUTOMSG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['autorepo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'AUTOREPO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['autorespostas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'AUTORESPOSTAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['autosticker'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'AUTOSTICKER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['avaliar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'AVALIAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['avengers'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'AVENGERS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['aventura'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'AVENTURA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['aventureira'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'AVENTUREIRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['aventureiro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'AVENTUREIRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['azarada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'AZARADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['azarado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'AZARADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bagunceira'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BAGUNCEIRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bagunceiro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BAGUNCEIRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['baichuan'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'BAICHUAN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ballon'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BALLON' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bam'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'BAM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ban2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'BAN2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bandida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BANDIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bandido'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BANDIDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['banghost'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'BANGHOST' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['batalhanaval'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'BATALHANAVAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['baterrpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_social'] || CAT_META.outros;
    return reply(ic + ' *' + 'BATERRPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['battlefield'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'BATTLEFIELD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bau'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'BAU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bebada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEBADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bebado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEBADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bebado2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEBADO2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['beijarb'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEIJARB' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['beijarrpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_social'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEIJARRPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['beijo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEIJO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['beijob'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEIJOB' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bemvindo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BEMVINDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bilionaria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BILIONARIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['billionario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BILLIONARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['blackhzx'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BLACKHZX' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['blackpink'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'BLACKPINK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['blockcmd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'BLOCKCMD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['blockuser'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'BLOCKUSER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['blood'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BLOOD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['blue-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BLUE-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['boba'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BOBA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bobo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BOBO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bolsonarista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BOLSONARISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bombada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BOMBADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bombado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BOMBADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['boost'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_premium'] || CAT_META.outros;
    return reply(ic + ' *' + 'BOOST' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bossrpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'BOSSRPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['braba'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BRABA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['brabo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BRABO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['brat'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'BRAT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['brat2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'BRAT2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['brincadeira'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['relacionamentos'] || CAT_META.outros;
    return reply(ic + ' *' + 'BRINCADEIRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['brincalhao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BRINCALHAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['brincalhona'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BRINCALHONA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bucetuda'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BUCETUDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['bug'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'BUG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['burra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BURRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['burro2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'BURRO2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['butterfly'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'BUTTERFLY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ca'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cachorra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CACHORRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cachorro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CACHORRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['caixa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'CAIXA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['calma'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CALMA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['calmo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CALMO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cancelar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CANCELAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['candy-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CANDY-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['captain'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CAPTAIN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['captainamerica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'CAPTAINAMERICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['captcha'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'CAPTCHA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['capturalink'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['antiraid'] || CAT_META.outros;
    return reply(ic + ' *' + 'CAPTURALINK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['carinhosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CARINHOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['carinhoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CARINHOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['carteira'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'CARTEIRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['casa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CASA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['casais'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_social'] || CAT_META.outros;
    return reply(ic + ' *' + 'CASAIS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['casal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'CASAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['casamento'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['relacionamentos'] || CAT_META.outros;
    return reply(ic + ' *' + 'CASAMENTO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['caseira'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CASEIRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['caseiro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CASEIRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cassino'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cassino'] || CAT_META.outros;
    return reply(ic + ' *' + 'CASSINO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cemetery'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'CEMETERY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cemiterio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CEMITERIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cep'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'CEP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cetica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CETICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cetico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CETICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['chance'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHANCE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['charada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHARADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['charmosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHARMOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['charmoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHARMOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['chata'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHATA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['chato'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHATO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['checkativo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHECKATIVO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['chefe'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHEFE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['chorao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHORAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['chorona'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CHORONA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ciumao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CIUMAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ciumenta'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CIUMENTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ciumento'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CIUMENTO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cla'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CLA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['class'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CLASS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['clima'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CLIMA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['closegp'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'CLOSEGP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cloudsky'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CLOUDSKY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cmdlimit'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'CMDLIMIT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cmerc'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CMERC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cnpj'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'CNPJ' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['codegemma'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'CODEGEMMA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cog'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'COG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['coinflip'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cassino'] || CAT_META.outros;
    return reply(ic + ' *' + 'COINFLIP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['coins'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COINS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['coletar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'COLETAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['colher'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'COLHER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['colorful'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COLORFUL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['comedia'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COMEDIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['comic-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COMIC-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['comics'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COMICS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['comilao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COMILAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['comilona'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COMILONA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['comprarpremium'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_premium'] || CAT_META.outros;
    return reply(ic + ' *' + 'COMPRARPREMIUM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['comunista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COMUNISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['confiante'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONFIANTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['connect4'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONNECT4' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['conquistas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONQUISTAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['conselhobiblico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONSELHOBIBLICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['conselhos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONSELHOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['conservador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONSERVADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['conservadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONSERVADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['convidar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cla'] || CAT_META.outros;
    return reply(ic + ' *' + 'CONVIDAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cook'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'COOK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cool-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COOL-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['copiloto'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'COPILOTO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['corajosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CORAJOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['corajoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CORAJOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['corna'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CORNA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['corrida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cassino'] || CAT_META.outros;
    return reply(ic + ' *' + 'CORRIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['corrigir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CORRIGIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cosmopolita'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COSMOPOLITA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['covarde'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'COVARDE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cprop'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_premium'] || CAT_META.outros;
    return reply(ic + ' *' + 'CPROP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cprops'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_premium'] || CAT_META.outros;
    return reply(ic + ' *' + 'CPROPS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['crash'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cassino'] || CAT_META.outros;
    return reply(ic + ' *' + 'CRASH' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['crente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CRENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['criarcla'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cla'] || CAT_META.outros;
    return reply(ic + ' *' + 'CRIARCLA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['criativa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CRIATIVA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['criativo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'CRIATIVO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['cultivar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'CULTIVAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dados'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DADOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dam'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DAM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['darkgreen'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'DARKGREEN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['deadpool'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'DEADPOOL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['debater'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'DEBATER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['delautoadm'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DELAUTOADM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['delblacklist'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DELBLACKLIST' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['deleting'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'DELETING' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dellimitmessage'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DELLIMITMESSAGE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['delmod'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DELMOD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['delparceria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DELPARCERIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['delregra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DELREGRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['demitir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'DEMITIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['denunciar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DENUNCIAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['denuncias'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DENUNCIAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dep'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'DEP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dependente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DEPENDENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['desafiomensal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESAFIOMENSAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['desafiosemanal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESAFIOSEMANAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['desapegado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESAPEGADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['descgrupo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESCGRUPO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['deserdar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_familia'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESERDAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['desmute'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESMUTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['desmute2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESMUTE2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['desumilde'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DESUMILDE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['diario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DIARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dicionario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'DICIONARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['digital'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DIGITAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['digitar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'DIGITAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dismantle'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_craft'] || CAT_META.outros;
    return reply(ic + ' *' + 'DISMANTLE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['doar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'DOAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['doente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DOENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dono'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DONO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dorminhoca'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DORMINHOCA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dorminhoco'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DORMINHOCO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dorminhoco2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DORMINHOCO2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['doubleexposure'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DOUBLEEXPOSURE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dragonfire'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DRAGONFIRE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dueloquiz'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'DUELOQUIZ' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['duelrpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_combate'] || CAT_META.outros;
    return reply(ic + ' *' + 'DUELRPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['dungeon'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'DUNGEON' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['eat'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'EAT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['economica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ECONOMICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['economico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ECONOMICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['elegant-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ELEGANT-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['elogio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'ELOGIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['em'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'EM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['emprego'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'EMPREGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['enchant'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_craft'] || CAT_META.outros;
    return reply(ic + ' *' + 'ENCHANT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['engracada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ENGRACADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['engracado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ENGRACADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['equipamentos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'EQUIPAMENTOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['equippet'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'EQUIPPET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['eraser'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ERASER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['esperta'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ESPERTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['esperto'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ESPERTO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['estudiosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ESTUDIOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['estudioso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ESTUDIOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['eununca'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'EUNUNCA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['eventos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'EVENTOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['evoluir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'EVOLUIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['evolve'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'EVOLVE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['explicar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'EXPLICAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['explodir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'EXPLODIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['explorar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'EXPLORAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['explore'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'EXPLORE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['extrovertida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'EXTROVERTIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['extrovertido'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'EXTROVERTIDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['faber'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FABER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['facebook'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FACEBOOK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['falcon'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'FALCON' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fazernick'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'FAZERNICK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['feed'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'FEED' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['feia'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FEIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['feio2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FEIO2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ffavatar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FFAVATAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ffgren'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FFGREN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ffrose'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FFROSE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ficha'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'FICHA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fiel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figanime'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGANIME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figcoreana'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGCOREANA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figdesenho'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGDESENHO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figemoji'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGEMOJI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figengracada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGENGRACADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figmeme'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGMEME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figraiva'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGRAIVA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['figroblox'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIGROBLOX' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['filme'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FILME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fire-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIRE-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['firework'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FIREWORK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fish'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'FISH' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['flag'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'FLAG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['flaming'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'FLAMING' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['flood'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['flood'] || CAT_META.outros;
    return reply(ic + ' *' + 'FLOOD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fluffy-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FLUFFY-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fofoqueira'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FOFOQUEIRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fofoqueiro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FOFOQUEIRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['forge'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_craft'] || CAT_META.outros;
    return reply(ic + ' *' + 'FORGE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fortao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FORTAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['forte'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FORTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fortona'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FORTONA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fortune-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FORTUNE-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fotobv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'FOTOBV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fotogrupo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'FOTOGRUPO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fotomenugrupo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'FOTOMENUGRUPO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fotosaiu'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'FOTOSAIU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fraca'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FRACA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['fraco'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FRACO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['frozen'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'FROZEN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['galaxy'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GALAXY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['galaxy-light'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GALAXY-LIGHT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['game'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GAME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gastador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GASTADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gastadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GASTADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gay2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GAY2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gdrive'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'GDRIVE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gear'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'GEAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gemma'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'GEMMA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gemma2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'GEMMA2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['genio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GENIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gerarlink'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GERARLINK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['getbio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'GETBIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gethtml'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'GETHTML' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['getperfil'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'GETPERFIL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gif'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GIF' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gitbot'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'GITBOT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gitubstalk'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'GITUBSTALK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['glitter'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GLITTER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['global'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GLOBAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['glossy'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GLOSSY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['glossy-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GLOSSY-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gold-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GOLD-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['goldpink'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GOLDPINK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gostosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GOSTOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['goza'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'GOZA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gozar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'GOZAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gpt4'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'GPT4' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['gradient'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'GRADIENT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['graffiti'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'GRAFFITI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['graffitipaint'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GRAFFITIPAINT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['graffitistyle'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GRAFFITISTYLE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['graffitiwall'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GRAFFITIWALL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['grantmodcmd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'GRANTMODCMD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['grupo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'GRUPO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['guerra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_combate'] || CAT_META.outros;
    return reply(ic + ' *' + 'GUERRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['habilidades'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'HABILIDADES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['hallobat'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'HALLOBAT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['halloween'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'HALLOWEEN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['harrypotter'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'HARRYPOTTER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['historicotraicao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['relacionamentos'] || CAT_META.outros;
    return reply(ic + ' *' + 'HISTORICOTRAICAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['homofobica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'HOMOFOBICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['homofobico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'HOMOFOBICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['humilde'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'HUMILDE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ice-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ICE-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['idcanal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'IDCANAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ideias'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'IDEIAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ig'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'IG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['igstory'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'IGSTORY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['independente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INDEPENDENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['infantil'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INFANTIL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['infiel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INFIEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['info'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INFO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['infoff'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'INFOFF' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['infoperso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'INFOPERSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ingredientes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'INGREDIENTES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['insegura'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INSEGURA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['inseguro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INSEGURO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['insone'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INSONE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['instagram'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INSTAGRAM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['instamp3'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'INSTAMP3' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['instamp4'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'INSTAMP4' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['inteligente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INTELIGENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['introvertida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INTROVERTIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['introvertido'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INTROVERTIDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['inv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['inveja'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INVEJA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['invejosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INVEJOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['invejoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'INVEJOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['investir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'INVESTIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ip'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'IP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['irresponsavel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'IRRESPONSAVEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['jeff'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'JEFF' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['jogodavelha'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'JOGODAVELHA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['kimi'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'KIMI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['kimik2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'KIMIK2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['kwai'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'KWAI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ladra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LADRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ladrao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LADRAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lamber'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'LAMBER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lambida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'LAMBIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lava-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LAVA-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['legenda'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['figurinhas'] || CAT_META.outros;
    return reply(ic + ' *' + 'LEGENDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['legendabv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LEGENDABV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['legendasaiu'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LEGENDASAIU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['leilao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cassino'] || CAT_META.outros;
    return reply(ic + ' *' + 'LEILAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lermais'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'LERMAIS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lesbica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LESBICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['levantar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'LEVANTAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['liberal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LIBERAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lid'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'LID' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lider'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LIDER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ligatures'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LIGATURES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['likeff'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'LIKEFF' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['limitmessage'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LIMITMESSAGE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['limparrank'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LIMPARRANK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['linda'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LINDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lindo2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LINDO2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['linkgp'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LINKGP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['list'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LIST' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listaddd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTADDD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listaddi'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTADDI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listadv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTADV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listamute'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTAMUTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listautoadm'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTAUTOADM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listblacklist'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTBLACKLIST' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listblocksgp'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTBLOCKSGP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listmodcmds'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTMODCMDS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['listmods'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'LISTMODS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['llama'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'LLAMA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['llama3'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'LLAMA3' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['local'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LOCAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lojapet'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'LOJAPET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lojapremium'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_premium'] || CAT_META.outros;
    return reply(ic + ' *' + 'LOJAPREMIUM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lolavatar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LOLAVATAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['loteria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cassino'] || CAT_META.outros;
    return reply(ic + ' *' + 'LOTERIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['lulista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'LULISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['machista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MACHISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['macho'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MACHO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['madura'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MADURA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['maduro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MADURO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['magistral'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'MAGISTRAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['magrela'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MAGRELA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['magrelo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MAGRELO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['malandra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MALANDRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['malandro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MALANDRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mamada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'MAMADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mamar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'MAMAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mantercontador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MANTERCONTADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['marin'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'MARIN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mascote'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MASCOTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mascotemetal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MASCOTEMETAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mascoteneon'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MASCOTENEON' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['masmorra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'MASMORRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mata'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MATA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['materiais'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_craft'] || CAT_META.outros;
    return reply(ic + ' *' + 'MATERIAIS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mcplugin'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'MCPLUGIN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['me'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mediafire'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'MEDIAFIRE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['memoria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'MEMORIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mention'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'MENTION' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['menualt'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MENUALT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['menubn'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MENUBN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['menupets'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MENUPETS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mercado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MERCADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['metal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'METAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['metallic'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'METALLIC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['meusan'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MEUSAN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['meustats'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MEUSTATS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['meustatus'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'MEUSTATUS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mine'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'MINE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['minerar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'MINERAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['minmessage'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MINMESSAGE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['missoes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MISSOES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['misteriosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MISTERIOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['misterioso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MISTERIOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mistral'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'MISTRAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mito'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MITO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mm'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['moderna'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MODERNA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['moderno'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MODERNO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['modobn'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MODOBN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['modolite'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MODOLITE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['modoparceria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MODOPARCERIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['modoraid'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['antiraid'] || CAT_META.outros;
    return reply(ic + ' *' + 'MODORAID' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['modorpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MODORPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mordida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'MORDIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['motivacional'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'MOTIVACIONAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mp4'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MP4' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['multicolor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'MULTICOLOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['multiprefixo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MULTIPREFIXO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['mute2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'MUTE2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['myinstants'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['audio'] || CAT_META.outros;
    return reply(ic + ' *' + 'MYINSTANTS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['myvip'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'MYVIP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['namorar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_social'] || CAT_META.outros;
    return reply(ic + ' *' + 'NAMORAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['namoro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['relacionamentos'] || CAT_META.outros;
    return reply(ic + ' *' + 'NAMORO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nano'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'NANO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nano2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'NANO2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['naruto'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'NARUTO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nazista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NAZISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['neon'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NEON' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['neon-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NEON-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['neon2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'NEON2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['neonglow'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'NEONGLOW' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['neonmetalic'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'NEONMETALIC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['neonparty'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'NEONPARTY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nerd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NERD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nerd2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NERD2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nervosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NERVOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nervoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NERVOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['newyear'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NEWYEAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nome'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'NOME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['nomegp'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'NOMEGP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['norian'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'NORIAN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['off'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'OFF' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['offline'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'OFFLINE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['online'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ONLINE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['opengp'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'OPENGP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['organizada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ORGANIZADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['organizado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ORGANIZADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['otaku'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'OTAKU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['otaria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'OTARIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['otario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'OTARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['otimista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'OTIMISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['padrao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PADRAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['parcerias'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'PARCERIAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['patrao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PATRAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['patriotica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PATRIOTICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['patriotico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PATRIOTICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['patroa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PATROA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pecador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PECADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pegador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PEGADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pegadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PEGADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['perfilff'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PERFILFF' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['perfilpic'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'PERFILPIC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['perfilrpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'PERFILRPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pessimista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PESSIMISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pet'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['petbattle'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'PETBATTLE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['petbet'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'PETBET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['petista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PETISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['petnome'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'PETNOME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pets'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'PETS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['phi'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'PHI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['phi3'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'PHI3' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['phlogo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PHLOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['piada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'PIADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pilantra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PILANTRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pintemp3'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['audio'] || CAT_META.outros;
    return reply(ic + ' *' + 'PINTEMP3' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pintemp4'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['audio'] || CAT_META.outros;
    return reply(ic + ' *' + 'PINTEMP4' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pinterest2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'PINTEREST2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pirocudo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PIROCUDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pirokudo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PIROKUDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pix'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'PIX' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pixel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'PIXEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['plantacao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'PLANTACAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['plantar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'PLANTAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['playboy'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PLAYBOY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['playid'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'PLAYID' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['playvid'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PLAYVID' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['playvid2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'PLAYVID2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pobre'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'POBRE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['poderosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PODEROSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['poderoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PODEROSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['popular'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'POPULAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pornhub'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'PORNHUB' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['possessivo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'POSSESSIVO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pplx'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'PPLX' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pratica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PRATICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pratico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PRATICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['precos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_craft'] || CAT_META.outros;
    return reply(ic + ' *' + 'PRECOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['preguicosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PREGUICOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['preguicoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PREGUICOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['presente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PRESENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['presidenta'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PRESIDENTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['presidente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PRESIDENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['prestige'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'PRESTIGE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['programador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PROGRAMADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['programadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PROGRAMADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['proibir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'PROIBIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['propriedades'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_premium'] || CAT_META.outros;
    return reply(ic + ' *' + 'PROPRIEDADES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['proteger'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_social'] || CAT_META.outros;
    return reply(ic + ' *' + 'PROTEGER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['psicopata'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PSICOPATA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ptvmsg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PTVMSG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pubg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'PUBG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pubgavatar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PUBGAVATAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['pubgvideo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'PUBGVIDEO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['qg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'QG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['quando'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'QUANDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['qwen'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'QWEN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['qwen2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'QWEN2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['qwen3'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'QWEN3' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['qwencoder'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'QWENCODER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['racista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RACISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['raidstatus'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['antiraid'] || CAT_META.outros;
    return reply(ic + ' *' + 'RAIDSTATUS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rainbow'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'RAINBOW' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rainha'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RAINHA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rakutenai'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'RAKUTENAI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankativo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKATIVO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankativos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKATIVOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankbraba'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBRABA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankbrabas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBRABAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankbrabo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBRABO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankbrabos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBRABOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankburra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBURRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankburras'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBURRAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankburro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBURRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankburros'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKBURROS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcharmosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCHARMOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcharmosas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCHARMOSAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcharmoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCHARMOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcharmosos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCHARMOSOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcorna'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCORNA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcornas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCORNAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcorno'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCORNO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankcornos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKCORNOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankengracada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKENGRACADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankengracadas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKENGRACADAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankengracado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKENGRACADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankengracados'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKENGRACADOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankfiel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKFIEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankfiels'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKFIELS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankforte'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKFORTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankfortes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKFORTES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgados'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGADOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgads'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGADS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgays'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGAYS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankglobal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGLOBAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgostosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGOSTOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgostosas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGOSTOSAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgostoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGOSTOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankgostosos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKGOSTOSOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankinativo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKINATIVO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankinfieis'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKINFIEIS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankinfiel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKINFIEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankinteligente'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKINTELIGENTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankinteligentes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKINTELIGENTES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranklesbica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKLESBICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranklesbicas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKLESBICAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranklinda'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKLINDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranklindas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKLINDAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranklindos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKLINDOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranklvl'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKLVL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankmacho'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKMACHO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankmachos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKMACHOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankmalandra'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKMALANDRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankmalandras'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKMALANDRAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankmalandro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKMALANDRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankmalandros'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKMALANDROS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranknerd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKNERD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranknerds'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKNERDS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankotaku'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKOTAKU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankotakus'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKOTAKUS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpegador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPEGADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpegadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPEGADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpegadoras'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPEGADORAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpegadores'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPEGADORES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpobre'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPOBRE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpobres'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPOBRES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpoderosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPODEROSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpoderosas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPODEROSAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpoderoso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPODEROSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankpoderosos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKPODEROSOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankrg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKRG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankrica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKRICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankricas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKRICAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankricos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKRICOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranktrabalhador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKTRABALHADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranktrabalhadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKTRABALHADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranktrabalhadoras'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKTRABALHADORAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ranktrabalhadores'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKTRABALHADORES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvencedor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVENCEDOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvencedora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVENCEDORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvencedoras'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVENCEDORAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvencedores'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVENCEDORES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvisionaria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVISIONARIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvisionarias'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVISIONARIAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvisionario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVISIONARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rankvisionarios'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RANKVISIONARIOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rbxcodes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'RBXCODES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['realista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'REALISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['receitas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'RECEITAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['recomendar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'RECOMENDAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['recusarconvite'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cla'] || CAT_META.outros;
    return reply(ic + ' *' + 'RECUSARCONVITE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['recusarsolic'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RECUSARSOLIC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['reflexao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'REFLEXAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rei'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'REI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['reivindicar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'REIVINDICAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['relacionamento'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RELACIONAMENTO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['relevar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'RELEVAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['religiosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RELIGIOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['religioso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RELIGIOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['renamepet'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'RENAMEPET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['renomear'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'RENOMEAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rep'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'REP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['reparar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_craft'] || CAT_META.outros;
    return reply(ic + ' *' + 'REPARAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['resetrank'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RESETRANK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['responsavel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RESPONSAVEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['resumir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RESUMIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['resumirchat'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'RESUMIRCHAT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['resumirurl'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'RESUMIRURL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['retro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RETRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['retro-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RETRO-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['revelar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'REVELAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['revokemodcmd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'REVOKEMODCMD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'RG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rmadv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RMADV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rmconvite'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cla'] || CAT_META.outros;
    return reply(ic + ' *' + 'RMCONVITE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rmfotobv'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RMFOTOBV' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rmfotosaiu'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RMFOTOSAIU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['robloxcodes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROBLOXCODES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rocket'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROCKET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['role.alterar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROLE.ALTERAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['role.confirmados'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROLE.CONFIRMADOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['role.criar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROLE.CRIAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['role.excluir'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROLE.EXCLUIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['role.nvou'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROLE.NVOU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['role.vou'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROLE.VOU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['roles'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROLES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['romantica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROMANTICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['romantico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROMANTICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['royal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ROYAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgadd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGADD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgadditem'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGADDITEM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgremove'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGREMOVE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgremoveitem'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGREMOVEITEM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgresetglobal'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGRESETGLOBAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgresetplayer'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGRESETPLAYER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgsetlevel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGSETLEVEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rpgstats'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'RPGSTATS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rural'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RURAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['rvisu'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'RVISU' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['safada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SAFADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['saida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SAIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['saudavel'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SAUDAVEL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sc'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['scdl'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'SCDL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sedentaria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SEDENTARIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sedentario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SEDENTARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['seguidor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SEGUIDOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['seguidora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SEGUIDORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sell'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'SELL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sementes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'SEMENTES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['senhor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SENHOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['senhora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SENHORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['seria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SERIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['serio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SERIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['setbammsg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'SETBAMMSG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sexo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'SEXO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['shadowsky'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'SHADOWSKY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['shazam'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['audio'] || CAT_META.outros;
    return reply(ic + ' *' + 'SHAZAM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['shipo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'SHIPO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['silver-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SILVER-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['simpatica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SIMPATICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['simpatico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SIMPATICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['skate-name'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SKATE-NAME' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['slots'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_cassino'] || CAT_META.outros;
    return reply(ic + ' *' + 'SLOTS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['smoke'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'SMOKE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sn'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['snow'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SNOW' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['soadm'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'SOADM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['socar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'SOCAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['social'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SOCIAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['solicitacoes'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'SOLICITACOES' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['solitaria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SOLITARIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['solitario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SOLITARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sonhador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SONHADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sonhadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SONHADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sono'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SONO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sorte'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SORTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sorteio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'SORTEIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sortuda'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SORTUDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sortudo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SORTUDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sortudo2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SORTUDO2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['soundcloud'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SOUNDCLOUD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['speedup'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'SPEEDUP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['spotify'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SPOTIFY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['spotify2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'SPOTIFY2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['stalkff'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'STALKFF' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['stalkinsta'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'STALKINSTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['stars'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'STARS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['stats'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'STATS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['status'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'STATUS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['statusbot'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'STATUSBOT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['statusgp'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'STATUSGP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['stickers'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'STICKERS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['stone3d'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'STONE3D' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['stop'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'STOP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['streak'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_evolucao'] || CAT_META.outros;
    return reply(ic + ' *' + 'STREAK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['subdono'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'SUBDONO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['suic'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SUIC' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['suicidio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SUICIDIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['summerbeach'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SUMMERBEACH' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['supersticiosa'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SUPERSTICIOSA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['supersticioso'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SUPERSTICIOSO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['suporte'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'SUPORTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['surubao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'SURUBAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['swallow'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'SWALLOW' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['sys-img'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'SYS-IMG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['system'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'SYSTEM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tabela'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'TABELA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['talarica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TALARICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['talarico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TALARICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tapar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'TAPAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['techstyle'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TECHSTYLE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tecnologica'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TECNOLOGICA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tecnologico'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TECNOLOGICO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['terminar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_social'] || CAT_META.outros;
    return reply(ic + ' *' + 'TERMINAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['thor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'THOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tictactoe'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'TICTACTOE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tiger'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TIGER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tiktok'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TIKTOK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tiktok2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'TIKTOK2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tiktoktxt'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['efeitos'] || CAT_META.outros;
    return reply(ic + ' *' + 'TIKTOKTXT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['titanium'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TITANIUM' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tomate'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['interacao'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOMATE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tomp3'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['audio'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOMP3' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['topcmd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOPCMD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['toprep'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOPREP' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['topriqueza'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOPRIQUEZA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['toprpg'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_perfil'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOPRPG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['torneio'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_combate'] || CAT_META.outros;
    return reply(ic + ' *' + 'TORNEIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['totag'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOTAG' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['totalcmd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOTALCMD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['totext'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TOTEXT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['trabalhador'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRABALHADOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['trabalhadora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRABALHADORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tradicional'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRADICIONAL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['traidor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRAIDOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['traidora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRAIDORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['train'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRAIN' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['trair'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['relacionamentos'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRAIR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['treinarpet'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'TREINARPET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tributos'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'TRIBUTOS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tt'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ttk'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'TTK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ttk2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'TTK2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['ttstalk'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'TTSTALK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['tw'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TW' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['twitter'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'TWITTER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['twitterdl'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'TWITTERDL' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['typography'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'TYPOGRAPHY' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['unblockcmd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'UNBLOCKCMD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['unblockuser'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'UNBLOCKUSER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['unequippet'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_pet'] || CAT_META.outros;
    return reply(ic + ' *' + 'UNEQUIPPET' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['uno'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'UNO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['upload'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'UPLOAD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['urbana'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'URBANA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['urbano'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'URBANO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vab'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'VAB' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vagabunda'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VAGABUNDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vagabundo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VAGABUNDO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vagas'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'VAGAS' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vazar'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['random'] || CAT_META.outros;
    return reply(ic + ' *' + 'VAZAR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vencedor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VENCEDOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vencedora'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VENCEDORA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vender'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_economia'] || CAT_META.outros;
    return reply(ic + ' *' + 'VENDER' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vendercomida'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'VENDERCOMIDA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vesga'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VESGA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vesgo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VESGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['viajante'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VIAJANTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['viciada'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VICIADA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['viciadao'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VICIADAO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['viciado'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VICIADO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vintage3d'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VINTAGE3D' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['visionaria'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VISIONARIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['visionario'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VISIONARIO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['voltei'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'VOLTEI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['vote'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'VOTE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['water-logo'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'WATER-LOGO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['watercolor'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'WATERCOLOR' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['whitelist'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'WHITELIST' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['wikipedia'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['search'] || CAT_META.outros;
    return reply(ic + ' *' + 'WIKIPEDIA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['wl.lista'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'WL.LISTA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['wl.remove'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'WL.REMOVE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['wladd'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'WLADD' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['wordle'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['jogos'] || CAT_META.outros;
    return reply(ic + ' *' + 'WORDLE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['work'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['rpg_trabalho'] || CAT_META.outros;
    return reply(ic + ' *' + 'WORK' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['write'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['logos'] || CAT_META.outros;
    return reply(ic + ' *' + 'WRITE' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['x9'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['admin'] || CAT_META.outros;
    return reply(ic + ' *' + 'X9' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['yi'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['ia'] || CAT_META.outros;
    return reply(ic + ' *' + 'YI' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['yt3v2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'YT3V2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['yt4v2'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['downloads_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'YT4V2' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['zipbot'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['perfil_extra'] || CAT_META.outros;
    return reply(ic + ' *' + 'ZIPBOT' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['zueira'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ZUEIRA' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
  registerCase(['zueiro'], async ({ ctx, prefix, reply }) => {
    const t = await themeResolver.getThemeForContext(ctx.remoteJid).catch(() => null);
    const ic = t?.icon || '⚙️';
    const m = CAT_META['outros'] || CAT_META.outros;
    return reply(ic + ' *' + 'ZUEIRO' + '* — ' + m.icon + ' ' + m.label + '\n\n' + (t?.bullet || '▸') + ' Comando registado — lógica em desenvolvimento.\n' + (t?.bullet || '▸') + ' Uso: `' + prefix + safeCmd + '`\n\n> _' + (t?.vibe || 'Dark Engine') + '_');
  }, true); // true = só se não existir
};