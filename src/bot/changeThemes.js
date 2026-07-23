/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v5 — changeThemes.js                             ║
 * ║   Sistema de temas visuais globais via !change               ║
 * ║   Cada tema afecta: bordas, ícones, símbolos, textos        ║
 * ║   decorativos, cabeçalhos, rodapés e emojis do bot.         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  !change            → lista todos os temas com preview
 *  !change <nome>     → aplica tema imediatamente
 *  !change reset      → volta ao padrão (dark)
 *  !change preview <nome> → mostra preview sem aplicar
 */

'use strict';

// ── Definição completa dos temas ───────────────────────────────────────────────
// Cada tema tem:
//   name       → identificador (usado no comando)
//   label      → nome bonito exibido
//   emoji      → emoji principal do tema
//   style      → índice do FRAMES no menuThemes.js (0-9)
//   frame      → [TL, TR, BL, BR, H, V]  bordas
//   bullet     → marcador de itens
//   sep        → separador entre itens
//   accent     → acento / destaque
//   icon       → ícone principal
//   vibe       → linha de rodapé / assinatura
//   headerDec  → decoração de cabeçalho (linha acima/abaixo do título)
//   react      → emoji de reação padrão para comandos processando
//   tip        → dica/assinatura do tema
//   menuTitle  → título do menu principal
//   menuFooter → rodapé do menu principal
//   thumbText  → texto sobreposto em thumbnails/captions
//   sectionSep → separador entre secções do menu

const THEMES = {

  // ─── 0. DARK (padrão) ───────────────────────────────────────
  dark: {
    name:       'dark',
    label:      '🕸️ DARK — Dark Side Engine',
    emoji:      '🕸️',
    style:      0,
    frame:      ['╭','╮','╰','╯','─','│'],
    bullet:     '▹',
    sep:        '⌁',
    accent:     '⚡',
    icon:       '🕸️',
    vibe:       'ᴅᴀʀᴋ sɪᴅᴇ ᴇɴɢɪɴᴇ 🌑',
    headerDec:  '━━━〔 {TITLE} 〕━━━',
    react:      '⏳',
    tip:        '🌑 A sombra trabalha mesmo quando ninguém vê.',
    menuTitle:  '🕸️ DARK BOT — Menu Principal',
    menuFooter: '> 🕸️ Dark Side Engine | Dark Net',
    thumbText:  '🕸️ {BOT}',
    sectionSep: '┣━━━━━━━━━━━━━━━━━━━━━━━━┫',
  },

  // ─── 1. CYBER ───────────────────────────────────────────────
  cyber: {
    name:       'cyber',
    label:      '🧬 CYBER — Neural Web System',
    emoji:      '🧬',
    style:      1,
    frame:      ['┏','┓','┗','┛','━','┃'],
    bullet:     '⌬',
    sep:        '⟐',
    accent:     '◈',
    icon:       '🧬',
    vibe:       '░▒▓ NEURAL WEB ▓▒░',
    headerDec:  '⟐⟐⟐〔 {TITLE} 〕⟐⟐⟐',
    react:      '🔄',
    tip:        '🧬 Sistema vivo: comandos, mídia e IA em evolução.',
    menuTitle:  '🧬 CYBER MODE — Neural Web',
    menuFooter: '> ░▒▓ NEURAL WEB ▓▒░ | Dark Net',
    thumbText:  '🧬 {BOT}',
    sectionSep: '┣━⟐━━━━━━━━━━━━━━━━━━━⟐━┫',
  },

  // ─── 2. ROYAL ───────────────────────────────────────────────
  royal: {
    name:       'royal',
    label:      '👑 ROYAL — Aura Suprema',
    emoji:      '👑',
    style:      2,
    frame:      ['╔','╗','╚','╝','═','║'],
    bullet:     '◈',
    sep:        '✦',
    accent:     '♾️',
    icon:       '👑',
    vibe:       '+9999999 ᴀᴜʀᴀ ♾️',
    headerDec:  '✦✦✦〔 {TITLE} 〕✦✦✦',
    react:      '👑',
    tip:        '♾️ Aura sobe quando você usa o bot com estilo.',
    menuTitle:  '👑 ROYAL MODE — Aura Suprema',
    menuFooter: '> +9999999 AURA ♾️ | Dark Net',
    thumbText:  '👑 {BOT}',
    sectionSep: '╠══════════════════════════╣',
  },

  // ─── 3. SHADOW ──────────────────────────────────────────────
  shadow: {
    name:       'shadow',
    label:      '🌑 SHADOW — Minimal Dark Protocol',
    emoji:      '🌑',
    style:      3,
    frame:      ['┌','┐','└','┘','─','│'],
    bullet:     '•',
    sep:        '·',
    accent:     '○',
    icon:       '🌑',
    vibe:       'minimal dark protocol',
    headerDec:  '·····〔 {TITLE} 〕·····',
    react:      '🌑',
    tip:        '🌑 Silêncio é poder.',
    menuTitle:  '🌑 SHADOW — Minimal Dark',
    menuFooter: '> minimal dark protocol | Dark Net',
    thumbText:  '🌑 {BOT}',
    sectionSep: '├──────────────────────────┤',
  },

  // ─── 4. BLADE ───────────────────────────────────────────────
  blade: {
    name:       'blade',
    label:      '🗡️ BLADE — Blade Runner Menu',
    emoji:      '🗡️',
    style:      4,
    frame:      ['╒','╕','╘','╛','═','│'],
    bullet:     '⫸',
    sep:        '╱',
    accent:     '⚔️',
    icon:       '🗡️',
    vibe:       'blade runner menu',
    headerDec:  '⚔️═══〔 {TITLE} 〕═══⚔️',
    react:      '⚔️',
    tip:        '🗡️ Corta o código, não o usuário.',
    menuTitle:  '🗡️ BLADE MODE — Blade Runner',
    menuFooter: '> ⚔️ BLADE RUNNER | Dark Net',
    thumbText:  '🗡️ {BOT}',
    sectionSep: '╞══════════════════════════╡',
  },

  // ─── 5. HACKER ──────────────────────────────────────────────
  hacker: {
    name:       'hacker',
    label:      '💻 HACKER — Root Access Terminal',
    emoji:      '💻',
    style:      5,
    frame:      ['╓','╖','╙','╜','─','║'],
    bullet:     '>',
    sep:        '::',
    accent:     '$',
    icon:       '💻',
    vibe:       'root@darkbot:~#',
    headerDec:  '[[ {TITLE} ]]',
    react:      '💻',
    tip:        '💻 root@darkbot:~# echo "acesso liberado"',
    menuTitle:  '💻 HACKER MODE — Terminal Root',
    menuFooter: '> root@darkbot:~# | Dark Net',
    thumbText:  '> {BOT}',
    sectionSep: '╟──────────────────────────╢',
  },

  // ─── 6. MOONLIGHT ───────────────────────────────────────────
  moonlight: {
    name:       'moonlight',
    label:      '🌙 MOONLIGHT — Moon System Online',
    emoji:      '🌙',
    style:      6,
    frame:      ['▛','▜','▙','▟','▀','▌'],
    bullet:     '☾',
    sep:        '⋆',
    accent:     '★',
    icon:       '🌙',
    vibe:       'moon system online 🌙',
    headerDec:  '★⋆⋆〔 {TITLE} 〕⋆⋆★',
    react:      '🌙',
    tip:        '🌙 Funciona melhor à meia-noite.',
    menuTitle:  '🌙 MOONLIGHT — Moon System',
    menuFooter: '> ★ moon system online 🌙 | Dark Net',
    thumbText:  '🌙 {BOT}',
    sectionSep: '▙▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▟',
  },

  // ─── 7. DIAMOND ─────────────────────────────────────────────
  diamond: {
    name:       'diamond',
    label:      '💎 DIAMOND — Premium Access Layer',
    emoji:      '💎',
    style:      7,
    frame:      ['◢','◣','◥','◤','━','┃'],
    bullet:     '◆',
    sep:        '✧',
    accent:     '◇',
    icon:       '💎',
    vibe:       'premium access layer 💎',
    headerDec:  '◆◇◆〔 {TITLE} 〕◆◇◆',
    react:      '💎',
    tip:        '💎 Acesso premium: sem limites, sem fronteiras.',
    menuTitle:  '💎 DIAMOND — Premium Layer',
    menuFooter: '> ◆ PREMIUM ACCESS ◆ | Dark Net',
    thumbText:  '💎 {BOT}',
    sectionSep: '◢━━━━━━━━━━━━━━━━━━━━━━━━◣',
  },

  // ─── 8. FIRE ────────────────────────────────────────────────
  fire: {
    name:       'fire',
    label:      '🔥 FIRE — Ego Mode Activated',
    emoji:      '🔥',
    style:      8,
    frame:      ['✦','✦','✧','✧','━','┃'],
    bullet:     '▸',
    sep:        '—',
    accent:     '🌶️',
    icon:       '🔥',
    vibe:       'ego mode activated 🔥',
    headerDec:  '🔥━━〔 {TITLE} 〕━━🔥',
    react:      '🔥',
    tip:        '🔥 Ego mode: ON. Limites: DESLIGADOS.',
    menuTitle:  '🔥 FIRE MODE — Ego Activated',
    menuFooter: '> 🔥 EGO MODE ACTIVATED | Dark Net',
    thumbText:  '🔥 {BOT}',
    sectionSep: '┃🔥━━━━━━━━━━━━━━━━━━━━━🔥┃',
  },

  // ─── 9. SPIDER ──────────────────────────────────────────────
  spider: {
    name:       'spider',
    label:      '🕷️ SPIDER — Web Automation Core',
    emoji:      '🕷️',
    style:      9,
    frame:      ['⎔','⎔','⎔','⎔','═','║'],
    bullet:     '⛓',
    sep:        '⌁',
    accent:     '🕷️',
    icon:       '🕷️',
    vibe:       'web automation core 🕸️',
    headerDec:  '🕷️⌁⌁〔 {TITLE} 〕⌁⌁🕷️',
    react:      '🕷️',
    tip:        '🕸️ A teia captura tudo — dados, média, inteligência.',
    menuTitle:  '🕷️ SPIDER — Web Core',
    menuFooter: '> 🕸️ WEB AUTOMATION CORE | Dark Net',
    thumbText:  '🕷️ {BOT}',
    sectionSep: '║⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁║',
  },

  // ─── 10. DRAGON ─────────────────────────────────────────────
  dragon: {
    name:       'dragon',
    label:      '🐉 DRAGON — System Zero Inspired',
    emoji:      '🐉',
    style:      2,
    frame:      ['╔','╗','╚','╝','═','║'],
    bullet:     '⊛',
    sep:        '»',
    accent:     '🔴',
    icon:       '🐉',
    vibe:       '© Dragon System 🔴',
    headerDec:  '╔━᳀〔 {TITLE} 〕═᳀',
    react:      '🐉',
    tip:        '🐉 O dragão não pede licença — age.',
    menuTitle:  '🐉 DRAGON SYSTEM — Versão Suprema',
    menuFooter: '> © Dragon System 🔴 | Dark Net',
    thumbText:  '🐉 {BOT}',
    sectionSep: '╠══════════════════════════╣',
  },

  // ─── 11. ITADORI ─────────────────────────────────────────────
  itadori: {
    name:       'itadori',
    label:      '⛩️ ITADORI — Jujutsu Core',
    emoji:      '⛩️',
    style:      1,
    frame:      ['┏','┓','┗','┛','━','┃'],
    bullet:     '┃★',
    sep:        '⊛',
    accent:     '🩸',
    icon:       '⛩️',
    vibe:       '⛩️ Jujutsu Core System',
    headerDec:  '┏☆━━〔 {TITLE} 〕━━☆┓',
    react:      '⛩️',
    tip:        '⛩️ Força e maldição — domina as duas.',
    menuTitle:  '⛩️ ITADORI BOT — Jujutsu Core',
    menuFooter: '> ⛩️ JUJUTSU CORE SYSTEM | Dark Net',
    thumbText:  '⛩️ {BOT}',
    sectionSep: '┣━☆━━━━━━━━━━━━━━━━━━━━━━━☆━┫',
  },

  // ─── 12. SASUKE ─────────────────────────────────────────────
  sasuke: {
    name:       'sasuke',
    label:      '⛩️🩸 SASUKE — Sharingan Mode',
    emoji:      '🩸',
    style:      4,
    frame:      ['╒','╕','╘','╛','═','│'],
    bullet:     '⛩',
    sep:        '🩸',
    accent:     '🔴',
    icon:       '⛩️',
    vibe:       '⛩🩸 Sharingan ativado',
    headerDec:  '⛩🩸━〔 {TITLE} 〕━🩸⛩',
    react:      '🩸',
    tip:        '🩸 O Sharingan nunca mente — captura tudo.',
    menuTitle:  '⛩🩸 SASUKE BOT — Sharingan Mode',
    menuFooter: '> ⛩🩸 SHARINGAN ATIVADO | Dark Net',
    thumbText:  '⛩🩸 {BOT}',
    sectionSep: '╞🩸══════════════════════🩸╡',
  },

  // ─── 13. NEON ────────────────────────────────────────────────
  neon: {
    name:       'neon',
    label:      '💜 NEON — Sistema MD Neon',
    emoji:      '💜',
    style:      4,
    frame:      ['╒','╕','╘','╛','═','│'],
    bullet:     '◉',
    sep:        '∙',
    accent:     '✵',
    icon:       '💜',
    vibe:       '◉ NEON SYSTEM ◉',
    headerDec:  '◉∙∙〔 {TITLE} 〕∙∙◉',
    react:      '💜',
    tip:        '💜 Brilha mais forte no escuro.',
    menuTitle:  '💜 NEON SYSTEM — Interface MD',
    menuFooter: '> ◉ NEON SYSTEM ◉ | Dark Net',
    thumbText:  '💜 {BOT}',
    sectionSep: '╞◉∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙◉╡',
  },

  // ─── 14. GOTHIC ──────────────────────────────────────────────
  gothic: {
    name:       'gothic',
    label:      '🖤 GOTHIC — Dark Arts System',
    emoji:      '🖤',
    style:      5,
    frame:      ['╓','╖','╙','╜','─','║'],
    bullet:     '✝',
    sep:        '†',
    accent:     '☠️',
    icon:       '🖤',
    vibe:       '† Dark Arts System †',
    headerDec:  '✝††〔 {TITLE} 〕††✝',
    react:      '🖤',
    tip:        '☠️ A morte é só o começo da automação.',
    menuTitle:  '🖤 GOTHIC SYSTEM — Dark Arts',
    menuFooter: '> † DARK ARTS SYSTEM † | Dark Net',
    thumbText:  '✝ {BOT}',
    sectionSep: '╟†━━━━━━━━━━━━━━━━━━━━━━━†╢',
  },

  // ─── 15. ALIEN ───────────────────────────────────────────────
  alien: {
    name:       'alien',
    label:      '👾 ALIEN — Extraterrestrial Protocol',
    emoji:      '👾',
    style:      6,
    frame:      ['▛','▜','▙','▟','▀','▌'],
    bullet:     '⬡',
    sep:        '∎',
    accent:     '🛸',
    icon:       '👾',
    vibe:       '👾 EXTRA PROTOCOL ONLINE 🛸',
    headerDec:  '⬡∎∎〔 {TITLE} 〕∎∎⬡',
    react:      '👾',
    tip:        '🛸 Protocolo alienígena: não há limites físicos.',
    menuTitle:  '👾 ALIEN BOT — Extra Protocol',
    menuFooter: '> 🛸 EXTRATERRESTRIAL PROTOCOL | Dark Net',
    thumbText:  '👾 {BOT}',
    sectionSep: '▙⬡▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀⬡▟',
  },

};

// ── Exportações ────────────────────────────────────────────────────────────────

/**
 * Retorna o tema pelo nome (ou o tema 'dark' se não encontrado)
 * @param {string} name
 * @returns {object}
 */
function getTheme(name = 'dark') {
  const n = String(name).toLowerCase().trim();
  return THEMES[n] || THEMES.dark;
}

/**
 * Retorna todos os temas como array
 */
function listThemes() {
  return Object.values(THEMES);
}

/**
 * Gera preview de um tema (texto formatado para enviar no WhatsApp)
 * @param {object} theme
 * @param {string} botName
 * @param {string} prefix
 */
function previewTheme(theme, botName = 'DARK BOT', prefix = '!') {
  const f = theme.frame;
  const H = f[4];
  const V = f[5];
  const tl = f[0], tr = f[1], bl = f[2], br = f[3];

  const W = 26;
  const bar = (txt) => `${V} ${txt.padEnd(W)} ${V}`;
  const topLine = `${tl}${H.repeat(W + 2)}${tr}`;
  const botLine = `${bl}${H.repeat(W + 2)}${br}`;
  const sepLine = bar(theme.sep.repeat(Math.min(4, W)));

  const headerTitle = theme.headerDec.replace('{TITLE}', 'PRÉVIA');

  return [
    `*${theme.emoji} ${theme.label}*`,
    '',
    topLine,
    bar(`${theme.icon}  *${botName}*`),
    bar(theme.vibe.slice(0, W)),
    sepLine,
    bar(`${theme.bullet} Prefixo: *${prefix}*`),
    bar(`${theme.bullet} Reação: ${theme.react}`),
    bar(`${theme.bullet} Borda: ${tl}${H.repeat(4)}${tr}`),
    bar(`${theme.bullet} Separador: ${theme.sep}`),
    bar(`${theme.bullet} Marcador: ${theme.bullet}`),
    bar(`${theme.bullet} Ícone: ${theme.icon}`),
    sepLine,
    bar(theme.tip.slice(0, W)),
    botLine,
    '',
    `> ${headerTitle}`,
    `> ${theme.menuFooter.replace('{BOT}', botName)}`,
    '',
    `📌 Para aplicar: *${prefix}change ${theme.name}*`,
  ].join('\n');
}

/**
 * Gera a lista visual de todos os temas
 * @param {string} prefix
 * @param {string} currentTheme
 */
function listThemesText(prefix = '!', currentTheme = 'dark') {
  const lines = [
    `╔══════════════════════════════╗`,
    `║  🎭 *TEMAS DISPONÍVEIS*       ║`,
    `╚══════════════════════════════╝`,
    '',
    `Use: *${prefix}change <nome>*`,
    `Preview: *${prefix}change preview <nome>*`,
    `Reset: *${prefix}change reset*`,
    '',
    `━━━ *TEMAS* ━━━`,
  ];

  for (const t of Object.values(THEMES)) {
    const active = t.name === currentTheme ? ' ◄ *ACTIVO*' : '';
    lines.push(`${t.emoji} *${t.name.toUpperCase()}* — ${t.label.replace(/^.*? — /, '')}${active}`);
  }

  lines.push('');
  lines.push(`> 🎨 ${Object.keys(THEMES).length} temas disponíveis`);

  return lines.join('\n');
}

/**
 * Formata um cabeçalho de secção usando o tema activo
 * @param {object} theme
 * @param {string} title
 */
function formatHeader(theme, title = '') {
  return theme.headerDec.replace('{TITLE}', title);
}

/**
 * Formata um bloco de texto com borda do tema
 * @param {object} theme
 * @param {string[]} lines
 */
function formatBlock(theme, lines = []) {
  const f = theme.frame;
  const H = f[4], V = f[5];
  const tl = f[0], tr = f[1], bl = f[2], br = f[3];
  const W = 26;
  const bar = (txt) => `${V} ${String(txt).slice(0, W).padEnd(W)} ${V}`;
  return [
    `${tl}${H.repeat(W + 2)}${tr}`,
    ...lines.map(l => bar(l)),
    `${bl}${H.repeat(W + 2)}${br}`,
  ].join('\n');
}

module.exports = {
  THEMES,
  getTheme,
  listThemes,
  previewTheme,
  listThemesText,
  formatHeader,
  formatBlock,
};
