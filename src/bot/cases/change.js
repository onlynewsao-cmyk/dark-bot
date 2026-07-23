/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v5 — cases/change.js                             ║
 * ║   Sistema de Temas Globais — !change                        ║
 * ║                                                             ║
 * ║   !change              → lista todos os temas               ║
 * ║   !change <nome>       → aplica tema imediatamente          ║
 * ║   !change preview <n>  → mostra preview sem aplicar         ║
 * ║   !change reset        → volta ao tema dark (padrão)        ║
 * ║   !change info         → info do tema activo                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config          = require('../../config');
const BotConfig       = require('../../database/models/BotConfig');
const botConfigCache  = require('../botConfigCache');
const changeThemes    = require('../changeThemes');

module.exports = function registerChangeCases(registerCase) {

  // ═══════════════════════════════════════════════════════════
  // !change  /  !tema  /  !settheme  /  !changetheme
  // ═══════════════════════════════════════════════════════════
  registerCase(
    ['change', 'tema', 'settheme', 'changetheme', 'themechange', 'mudarstema'],
    async ({ sock, msg, ctx, args, prefix, isOwner, reply, react }) => {

      const botName = config.bot?.name || 'DARK BOT';

      // ── Obter tema activo ───────────────────────────────────
      const currentThemeName = await botConfigCache
        .get('active_theme', 'dark')
        .catch(() => 'dark');
      const currentTheme = changeThemes.getTheme(currentThemeName);

      // ── Sem args → listar todos os temas ───────────────────
      if (!args.length) {
        const f   = currentTheme.frame;
        const H   = f[4], V   = f[5];
        const tl  = f[0], tr  = f[1], bl  = f[2], br  = f[3];
        const b   = currentTheme.bullet;
        const s   = currentTheme.sep;
        const ico = currentTheme.icon;

        const all = changeThemes.listThemes();

        let txt = `${tl}${H.repeat(30)}${tr}\n`;
        txt    += `${V}  ${ico} *TEMAS DO BOT — ${botName}*  ${V}\n`;
        txt    += `${V}  Tema actual: *${currentThemeName.toUpperCase()}*${' '.repeat(Math.max(0, 18 - currentThemeName.length))}${V}\n`;
        txt    += `${bl}${H.repeat(30)}${br}\n\n`;

        txt += `${b} *Como usar:*\n`;
        txt += `${s} Aplicar: *${prefix}change <nome>*\n`;
        txt += `${s} Preview: *${prefix}change preview <nome>*\n`;
        txt += `${s} Resetar: *${prefix}change reset*\n`;
        txt += `${s} Info:    *${prefix}change info*\n\n`;

        txt += `${tl}${H.repeat(30)}${tr}\n`;
        txt += `${V}  🎭 *TODOS OS TEMAS*${' '.repeat(13)}${V}\n`;
        txt += `${bl}${H.repeat(30)}${br}\n\n`;

        for (const t of all) {
          const active = t.name === currentThemeName ? ' ◄ *ACTIVO*' : '';
          txt += `${t.emoji} *${t.name.toUpperCase()}*${active}\n`;
          txt += `  _${t.label.replace(/^[^\s]+ /, '')}_\n`;
          txt += `  Borda: ${t.frame[0]}${t.frame[4].repeat(3)}${t.frame[1]}  ${t.bullet} ${t.sep}  ${t.icon}\n\n`;
        }

        txt += `> ${ico} ${botName} × ${currentTheme.vibe}`;

        return reply(txt);
      }

      // ── preview <nome> ──────────────────────────────────────
      if (args[0].toLowerCase() === 'preview') {
        const themeName = args[1]?.toLowerCase()?.trim();
        if (!themeName) {
          return reply(`❓ Qual tema quer pré-visualizar?\n\nEx: *${prefix}change preview dragon*`);
        }
        const t = changeThemes.getTheme(themeName);
        if (t.name !== themeName && themeName !== 'dark') {
          return reply(
            `❌ Tema *${themeName}* não encontrado.\n\n` +
            `Temas disponíveis:\n` +
            changeThemes.listThemes().map(x => `${x.emoji} ${x.name}`).join('\n') +
            `\n\nUse: *${prefix}change <nome>*`
          );
        }
        return reply(changeThemes.previewTheme(t, botName, prefix));
      }

      // ── reset → volta ao dark ───────────────────────────────
      if (args[0].toLowerCase() === 'reset') {
        if (!isOwner) return reply('🚫 Só o Dono pode mudar o tema.');
        await BotConfig.set('active_theme', 'dark');
        await BotConfig.set('menu_style', 'classic');
        botConfigCache.clear();
        const t = changeThemes.getTheme('dark');
        return reply(
          `${t.frame[0]}${t.frame[4].repeat(28)}${t.frame[1]}\n` +
          `${t.frame[5]}  ${t.icon} *TEMA RESETADO*  ${t.frame[5]}\n` +
          `${t.frame[2]}${t.frame[4].repeat(28)}${t.frame[3]}\n\n` +
          `✅ Voltou ao tema *DARK* (padrão)\n\n` +
          `> ${t.vibe}`
        );
      }

      // ── info → info do tema activo ─────────────────────────
      if (args[0].toLowerCase() === 'info') {
        const t = currentTheme;
        return reply(changeThemes.previewTheme(t, botName, prefix));
      }

      // ── Aplicar tema ────────────────────────────────────────
      if (!isOwner) return reply('🚫 Só o Dono pode mudar o tema do bot.');

      const themeName = args[0].toLowerCase().trim();
      const allThemes = changeThemes.listThemes();
      const found = allThemes.find(t => t.name === themeName);

      if (!found) {
        return reply(
          `❌ Tema *${themeName}* não encontrado.\n\n` +
          `*Temas disponíveis:*\n` +
          allThemes.map(t => `${t.emoji} *${t.name}* — ${t.vibe}`).join('\n') +
          `\n\n💡 Use: *${prefix}change <nome>*\n💡 Preview: *${prefix}change preview <nome>*`
        );
      }

      // Salvar no DB
      await BotConfig.set('active_theme', found.name);
      // Sincronizar com menu_style (índice numérico)
      await BotConfig.set('menu_style', String(found.style));
      botConfigCache.clear();

      // Montar mensagem de confirmação no estilo do NOVO tema
      const f  = found.frame;
      const H  = f[4], V  = f[5];
      const tl = f[0], tr = f[1], bl = f[2], br = f[3];
      const W  = 28;
      const bar = (txt) => `${V} ${String(txt).slice(0, W).padEnd(W)} ${V}`;

      const confirm =
        `${tl}${H.repeat(W + 2)}${tr}\n` +
        `${bar(`${found.icon}  ${found.label}`)}\n` +
        `${bar(`${found.sep.repeat(4)} TEMA APLICADO ${found.sep.repeat(4)}`)}\n` +
        `${bar('')}\n` +
        `${bar(`${found.bullet} Bot: ${botName}`)}\n` +
        `${bar(`${found.bullet} Novo tema: ${found.name.toUpperCase()}`)}\n` +
        `${bar(`${found.bullet} Ícone: ${found.icon}`)}\n` +
        `${bar(`${found.bullet} Reação: ${found.react}`)}\n` +
        `${bar(`${found.bullet} Borda: ${tl}${H.repeat(4)}${tr}`)}\n` +
        `${bar(`${found.bullet} Marcador: ${found.bullet}`)}\n` +
        `${bar(`${found.bullet} Separador: ${found.sep}`)}\n` +
        `${bar('')}\n` +
        `${bar(found.tip.slice(0, W))}\n` +
        `${bl}${H.repeat(W + 2)}${br}\n\n` +
        `✅ *Tema aplicado com sucesso!*\n` +
        `Todo o bot adoptou o estilo *${found.name.toUpperCase()}*\n\n` +
        `> ${found.icon} ${found.menuFooter.replace('{BOT}', botName)}`;

      return reply(confirm);
    }
  );

  // ═══════════════════════════════════════════════════════════
  // !temas  — alias rápido (só lista)
  // ═══════════════════════════════════════════════════════════
  registerCase(['temas', 'themes', 'listthemes', 'listtemas'], async ({ prefix, reply }) => {
    const currentThemeName = await botConfigCache
      .get('active_theme', 'dark')
      .catch(() => 'dark');
    const all = changeThemes.listThemes();
    let txt = `🎭 *TEMAS DO BOT*\n\nTema actual: *${currentThemeName.toUpperCase()}*\n\n`;
    for (const t of all) {
      const active = t.name === currentThemeName ? ' ◄ ACTIVO' : '';
      txt += `${t.emoji} *${t.name.toUpperCase()}*${active} — _${t.vibe}_\n`;
    }
    txt += `\n💡 Aplicar: *${prefix}change <nome>*`;
    return reply(txt);
  });

};
