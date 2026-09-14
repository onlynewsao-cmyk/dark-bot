'use strict';
/**
 * DARK BOT v7.61 — MODOS por categoria de utilidade.
 *
 * Cada grupo escolhe o que o bot faz: grupo de estudos desliga
 * brincadeiras, grupo de música liga downloads, etc.
 *   !modo                 → painel
 *   !modo downloads off   → desliga downloads neste grupo
 *
 * Fail-open: campo ausente/undefined = ATIVO (nada parte em grupos
 * antigos). Categorias admin/owner/info/outros NUNCA são barradas
 * (gestão, menus e nucleares funcionam sempre).
 */

const MODES = [
  { name: 'downloads',    field: 'modeDownloads',  label: '📥 Downloads',    desc: 'play, tiktok, música, vídeos',       aliases: ['dl', 'download', 'musica', 'música'] },
  { name: 'stickers',     field: 'modeStickers',   label: '🎨 Stickers',     desc: 'figurinhas, attp, toimg',            aliases: ['sticker', 'fig', 'figurinhas'] },
  { name: 'ia',           field: 'modeIa',         label: '🧠 IA & Web',     desc: 'gpt, imagem, pesquisar, resumir',    aliases: ['ai'] },
  { name: 'jogos',        field: 'modeJogos',      label: '🎮 Jogos',        desc: 'ppt, quiz, forca, minado',           aliases: ['jogo', 'game', 'games'] },
  { name: 'economia',     field: 'modeEconomia',   label: '💰 Economia',     desc: 'daily, loja, carteira, aura',        aliases: ['eco', 'coins', 'dinheiro'] },
  { name: 'interacoes',   field: 'modeInteracoes', label: '💕 Interações',   desc: 'abraçar, beijar, família, casal',    aliases: ['interacao', 'amor', 'familia', 'família'] },
  { name: 'texto',        field: 'modeTexto',      label: '📝 Texto & Utils', desc: 'piadas, frases, qrcode, clima',     aliases: ['utilidades', 'utils'] },
  { name: 'search',       field: 'modeSearch',     label: '🔎 Pesquisa',     desc: 'letras, wiki, notícias',            aliases: ['busca', 'pesquisa'] },
  { name: 'audio',        field: 'modeAudio',      label: '🎵 Áudio FX',     desc: 'bass, efeitos em áudio',            aliases: ['efeitos', 'fx'] },
  { name: 'logos',        field: 'modeLogos',      label: '🖼️ Logos',        desc: 'logos e imagens geradas',           aliases: ['logo'] },
  { name: 'brincadeiras', field: 'modeZoeira',     label: '😂 Brincadeiras', desc: 'zoeira, memes, ship, radar',        aliases: ['brincadeira', 'zoeira', 'fun', 'memes'] },
];

// categoria do submenu → modo (admin/owner/info/outros = sempre livres)
const CAT2MODE = {
  downloads: 'downloads', stickers: 'stickers', ia: 'ia', jogos: 'jogos',
  economia: 'economia', interacoes: 'interacoes', texto: 'texto',
  search: 'search', audio: 'audio', logos: 'logos', zoeira: 'brincadeiras',
};

function findMode(name) {
  const n = String(name || '').toLowerCase().trim();
  return MODES.find(m => m.name === n || m.aliases.includes(n)) || null;
}

function check(cmd, gs) {
  const sd = require('./submenuData');
  const cat = sd.categorize(String(cmd || '').toLowerCase());
  const modeName = CAT2MODE[cat];
  if (!modeName) return { allowed: true };
  const mode = MODES.find(m => m.name === modeName);
  if (gs && gs[mode.field] === false) return { allowed: false, mode };
  return { allowed: true };
}

function lockedMessage(mode, prefix) {
  return (
    `🔒 Modo *${mode.label}* desativado neste grupo.\n\n` +
    `Este grupo não usa ${mode.desc}.\n` +
    `Um admin pode ativar com:\n\`${prefix}modo ${mode.name} on\``
  );
}

module.exports = { MODES, CAT2MODE, findMode, check, lockedMessage };
