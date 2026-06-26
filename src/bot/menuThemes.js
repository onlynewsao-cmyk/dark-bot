const commandCatalog = require('./commandCatalog');

const FRAMES = [
  ['╭','╮','╰','╯','─','│','├','┤'], ['┏','┓','┗','┛','━','┃','┣','┫'], ['╔','╗','╚','╝','═','║','╠','╣'],
  ['┌','┐','└','┘','─','│','├','┤'], ['╒','╕','╘','╛','═','│','╞','╡'], ['╓','╖','╙','╜','─','║','╟','╢'],
  ['▛','▜','▙','▟','▀','▌','▌','▐'], ['◢','◣','◥','◤','━','┃','┣','┫'], ['✦','✦','✧','✧','━','┃','┣','┫'],
  ['⎔','⎔','⎔','⎔','═','║','╠','╣'], ['╱','╲','╲','╱','╌','┃','┣','┫'], ['▰','▰','▱','▱','▰','▌','▌','▐'],
];

const PALETTES = [
  { name: 'DARK SIDE', icon: '⚡', bullet: '▹', sep: '⌁', vibe: 'ᴛʜᴇ ᴅᴀʀᴋ sɪᴅᴇ 🌑' },
  { name: 'CYBER MATRIX', icon: '🧬', bullet: '⌬', sep: '⟐', vibe: '░▒▓ NEURAL WEB ▓▒░' },
  { name: 'ROYAL AURA', icon: '👑', bullet: '◈', sep: '✦', vibe: '+9999999 AURA ♾️' },
  { name: 'SHADOW CLEAN', icon: '🌑', bullet: '•', sep: '·', vibe: 'minimal dark protocol' },
  { name: 'NEON BLADE', icon: '🗡️', bullet: '⫸', sep: '╱', vibe: 'blade runner menu' },
  { name: 'VOID TERMINAL', icon: '💻', bullet: '>', sep: '::', vibe: 'root@darkbot:~#' },
  { name: 'MOONLIGHT', icon: '🌙', bullet: '☾', sep: '⋆', vibe: 'moon system online' },
  { name: 'DIAMOND VIP', icon: '💎', bullet: '◆', sep: '✧', vibe: 'premium access layer' },
  { name: 'FIRE EGO', icon: '🔥', bullet: '▸', sep: '—', vibe: 'ego mode activated' },
  { name: 'SPIDER WEB', icon: '🕸️', bullet: '⛓', sep: '⌁', vibe: 'web automation core' },
];

const CATEGORY_META = {
  info: ['ℹ️ STATUS / CORE', 'Comandos principais, perfil e menus'],
  ia: ['🧠 IA / WEB', 'Inteligência, notícias, pesquisa e resumo'],
  downloads: ['📥 DOWNLOADS', 'Música, vídeos e mídias sociais'],
  stickers: ['🎨 STICKERS', 'Figurinhas, watermark e ferramentas visuais'],
  grupos: ['👥 ADM / GRUPOS', 'Moderação, regras, avisos e controle'],
  diversao: ['😂 DIVERSÃO', 'Zoeira, porcentagens e brincadeiras'],
  interacoes: ['💕 INTERAÇÕES', 'Ações com GIF, aura e social'],
  familia: ['👨‍👩‍👧 FAMÍLIA', 'Casamento, adoção e família Dark'],
  economia: ['💰 ECONOMIA / AURA', 'Coins, banco, loja, aura e ranking'],
  jogos: ['🎮 JOGOS', 'Quiz, forca, blackjack, bingo e mais'],
  utils: ['🛠️ UTILITÁRIOS', 'Ferramentas grátis, clima, câmbio e QR'],
  premium: ['⭐ PREMIUM', 'Planos e comandos VIP'],
  vpn: ['🔓 VPN DECRYPTER', 'Ferramentas premium de decrypt'],
  dono: ['👑 DONO / ROOT', 'Comandos do Dono Supremo'],
  trapacas: ['🎭 OCULTOS / CHEATS', 'Ferramentas avançadas owner-only'],
};

const SUBMENU_ALIASES = {
  menudownload: 'downloads', menustickers: 'stickers', menujogos: 'jogos', menueconomia: 'economia',
  menufamilia: 'familia', menudiversao: 'diversao', menuia: 'ia', menugrupo: 'grupos', menustatus: 'utils',
  menudono: 'dono', maiscmds: 'dono',
};

function styleIndex(style = 'classic') {
  if (style === 'classic') return 0;
  const n = Number(String(style).replace(/\D/g, ''));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
function getStyle(style = 'classic') {
  const n = styleIndex(style);
  const frame = FRAMES[n % FRAMES.length];
  const palette = PALETTES[n % PALETTES.length];
  const dense = n % 4 === 1;
  const clean = n % 4 === 2;
  const art = n % 4 === 3;
  return { n, frame, palette, dense, clean, art };
}
function commandName(cmd, prefix, showPrefix) {
  return `${showPrefix ? prefix : ''}${cmd.name}`;
}
function visibleCommands({ isOwner = false, includeOwner = false } = {}) {
  return commandCatalog.getAll().filter(c => {
    if ((c.ownerOnly || c.category === 'dono' || c.category === 'trapacas') && !isOwner && !includeOwner) return false;
    return true;
  });
}
function groupCommands(cmds) {
  const out = {};
  for (const c of cmds) (out[c.category] ||= []).push(c);
  for (const k of Object.keys(out)) out[k].sort((a,b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  return out;
}
function lineWrap(commands, prefix, showPrefix, st, maxPerLine = 3) {
  const chunks = [];
  for (let i = 0; i < commands.length; i += maxPerLine) {
    chunks.push(commands.slice(i, i + maxPerLine).map(c => `${c.emoji || '⚡'} ${commandName(c, prefix, showPrefix)}`).join(` ${st.palette.sep} `));
  }
  return chunks;
}
function box(title, lines, st) {
  const [tl,tr,bl,br,h,v,ml,mr] = st.frame;
  const width = st.clean ? 24 : 30;
  const top = `${tl}${h.repeat(Math.max(2, Math.floor((width - title.length) / 2)))} ${title} ${h.repeat(4)}${tr}`;
  const bottom = `${bl}${h.repeat(width + 8)}${br}`;
  return [top, ...lines.map(x => `${v} ${x}`), bottom].join('\n');
}
function renderCategory(category, commands, opts, st) {
  const meta = CATEGORY_META[category] || [`${st.palette.icon} ${category.toUpperCase()}`, ''];
  const max = st.dense ? 4 : st.clean ? 2 : 3;
  const rows = [];
  if (!st.clean && meta[1]) rows.push(`_${meta[1]}_`);
  rows.push(...lineWrap(commands, opts.prefix, opts.showPrefix, st, max).map(x => `${st.palette.bullet} ${x}`));
  return box(meta[0], rows, st);
}
function renderMainMenu({ ctx = {}, config = {}, stats = {}, style = 'classic', showPrefix = false } = {}) {
  const st = getStyle(style);
  const prefix = config.bot?.prefix || '!';
  const cmds = visibleCommands({ isOwner: !!ctx.isOwner });
  const grouped = groupCommands(cmds);
  const order = ['ia','downloads','stickers','grupos','interacoes','diversao','familia','economia','jogos','utils','premium','vpn'];
  if (ctx.isOwner) order.push('dono','trapacas');
  const headLines = [
    `${st.palette.icon} *${config.bot?.name || 'DARK BOT'}* ${st.palette.icon}`,
    `${st.palette.vibe}`,
    `👤 ${ctx.pushName || 'User'} ${st.palette.sep} 📱 ${ctx.senderNumber || '—'}`,
    `💬 ${ctx.isGroup ? (ctx.groupName || 'Grupo') : 'Privado'} ${st.palette.sep} 🔑 ${prefix}`,
    `⏱️ ${stats.uptime || '0d 0h 0m'} ${st.palette.sep} 👑 ${config.owner?.name || 'Owner'}`,
  ];
  const parts = [box('MENU PRINCIPAL', headLines, st)];
  for (const cat of order) if (grouped[cat]?.length) parts.push(renderCategory(cat, grouped[cat], { prefix, showPrefix }, st));
  parts.push(`> ${st.palette.icon} ${config.bot?.name || 'DARK BOT'} · DarkSide Engine\n> ${st.palette.bullet} Use *menubtn* para módulos interativos`);
  return parts.join('\n\n');
}
function renderSubmenu({ submenu = '', ctx = {}, config = {}, style = 'classic', showPrefix = false, customItems = null } = {}) {
  const st = getStyle(style);
  const prefix = config.bot?.prefix || '!';
  const cat = SUBMENU_ALIASES[submenu] || submenu;
  let commands = customItems ? customItems.map(x => ({ name: x.cmd, emoji: x.emoji, description: x.desc || '' })) : visibleCommands({ isOwner: !!ctx.isOwner, includeOwner: cat === 'dono' }).filter(c => c.category === cat);
  if (!commands.length) commands = customItems ? customItems.map(x => ({ name: x.cmd, emoji: x.emoji, description: x.desc || '' })) : [];
  const meta = CATEGORY_META[cat] || [`${st.palette.icon} ${String(submenu).toUpperCase()}`, ''];
  const max = st.dense ? 4 : st.clean ? 2 : 3;
  const rows = [];
  if (meta[1]) rows.push(`_${meta[1]}_`);
  const chunks = lineWrap(commands, prefix, showPrefix, st, max);
  rows.push(...chunks.map(x => `${st.palette.bullet} ${x}`));
  if (!rows.length) rows.push('Sem comandos disponíveis.');
  return box(meta[0], rows, st) + `\n\n> ${st.palette.icon} ${config.bot?.name || 'DARK BOT'} · ${st.palette.vibe}`;
}
function submenuButtons(prefix = '!') {
  return [
    ['menudownload','📥 Downloads'], ['menustickers','🎨 Stickers'], ['menujogos','🎮 Jogos'], ['menueconomia','💰 Economia'],
    ['menufamilia','👨‍👩‍👧 Família'], ['menudiversao','😂 Diversão'], ['menuia','🧠 IA'], ['menugrupo','👥 ADM'], ['menustatus','🛠️ Utils'],
  ].map(([id, text]) => ({ id: `${prefix}${id}`, text }));
}
module.exports = { getStyle, renderMainMenu, renderSubmenu, submenuButtons, visibleCommands, CATEGORY_META };
