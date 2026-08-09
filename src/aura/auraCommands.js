/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — AURA COMMANDS v7                                ║
 * ║   Ela controla TODOS os comandos por conversa                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *   "aura toca Shakira"        → .play shakira
 *   "faz sticker disto"        → .sticker
 *   "kicka esse gajo"          → .kick @user
 *   "qual é o meu saldo?"      → .saldo
 *   "me dá um cavalo"          → .dog (aleatório)
 *
 * CONTROLO TOTAL:
 *   ✅ TODOS os 1600+ comandos — ela usa qualquer um
 *   ✅ Detecta por: verbos naturais, nomes directos, aliases
 *   ❌ BLOQUEADOS: eval, broadcast, restart, etc (só prefixo manual)
 *   🛡️ ADM: só Admin/Dono pode usar comandos de moderação
 *
 * SEGURANÇA:
 *   1. BLOQUEADOS — nunca, nem para o Dono (destrutivos)
 *   2. ownerOnly automático — rede de segurança
 *   3. Permissão por cargo: Free < VIP < Admin < Dono
 */

'use strict';

// ── 1. BLOQUEADOS — NUNCA por conversa ──────────────────────
const BLOQUEADOS = new Set([
  // execução de código
  'eval', 'exec', 'shell', 'term', 'terminal', 'bash', 'sh',
  // afectam TODOS
  'broadcast', 'bc', 'send', 'sendgroup', 'transmitir',
  // ciclo de vida
  'restart', 'reiniciar', 'shutdown', 'desligar', 'stop', 'kill',
  // permissões globais
  'adddono', 'removedono', 'setpremium', 'blacklist', 'unblacklist',
  'desativarusuario', 'ativarusuario', 'desativargrupo', 'ativargrupo',
  // código do bot
  'addcase', 'delcase', 'removicase', 'reloadcases', 'runcase', 'execcase',
  // config global
  'setprefix', 'prefixos', 'themeglobal', 'panel', 'backup',
  // adulto — exige intenção explícita
  'adultmode', 'adultapi', 'menu18', 'hentai', 'ximg', 'xvideo',
  'adultsearch', 'hotchat', 'fig18', 'pack18', 'gif18', 'shorts18',
  'yande', 'kona', 'e621', 'nekos', 'erome', 'eromevid', 'buscar18',
  // sabotagem
  'bomb', 'trava1', 'trava2', 'trava3', 'fakeban', 'espiao',
]);

function estaBloqueado(cmd) {
  const c = String(cmd || '').toLowerCase().trim();
  if (!c) return true;
  if (BLOQUEADOS.has(c)) return true;
  try {
    const cat = require('../bot/commandCatalog');
    const item = (cat.CATALOG || []).find(x => x.name === c);
    if (item?.ownerOnly) {
      const permitidos = new Set(['stats', 'donos', 'grupos', 'menudono', 'maiscmds']);
      if (!permitidos.has(c)) return true;
    }
  } catch {}
  return false;
}

// ── 2. VERBOS → COMANDOS (mapeamento natural) ───────────────
// Cada entrada: [regex que detecta o PEDIDO, comando a executar, como tirar args]
// A ordem importa — primeiro match ganha.
const VERBOS = [
  // ═══ MÚSICA E VÍDEO ═══
  [/\b(toca|tocar|toque|põe|poe|coloca|bota|quero ouvir|ouvir)\b[^.?!]{0,20}\b(música|musica|som|canção|cancao|mp3)\b/i, 'play', 'depois'],
  [/\b(toca|tocar|toque)\b\s+(?!grupo|silencio|calada)/i, 'play', 'depois'],
  [/\b(manda|mandar|envia|enviar|quero)\b[^.]{0,30}\b(audio|áudio|voz|ptt|música|musica|som)\b/i, 'play', 'depois'],
  [/\b(baixa|baixar|descarrega|download)\b[^.]{0,30}\b(música|musica|audio|mp3)\b/i, 'play', 'depois'],
  [/\b(baixa|baixar|descarrega|download|manda)\b[^.]{0,30}\b(vídeo|video|mp4|filme)\b/i, 'video', 'depois'],
  [/\b(procura|pesquisa|acha)\b[^.]{0,30}\b(no youtube|youtube|yt)\b/i, 'play', 'depois'],

  // ═══ STICKERS ═══
  [/\b(faz|fazer|cria|criar|transforma|converte)\b[^.]{0,30}\b(sticker|figurinha|fig)\b/i, 'sticker', 'nenhum'],
  [/\b(sticker|figurinha)\b[^.]{0,30}\b(disto|disso|dessa|desta)\b/i, 'sticker', 'nenhum'],
  [/\b(transforma|converte)\b[^.]{0,30}\b(em imagem|em foto|pra imagem)\b/i, 'toimg', 'nenhum'],

  // ═══ ECONOMIA ═══
  [/\b(qual|quanto)\b[^.]{0,30}\b(meu saldo|minha carteira|meus coins|tenho)\b/i, 'saldo', 'nenhum'],
  [/\b(meu saldo|minha carteira|meus coins)\b/i, 'saldo', 'nenhum'],
  [/\b(recompensa|bônus|bonus|daily|diário|diaria)\b/i, 'daily', 'nenhum'],
  [/\b(trabalhar|trabalha|quero trabalhar|work)\b/i, 'trabalhar', 'nenhum'],
  [/\b(minerar|minera|mina|mine)\b/i, 'minerar', 'nenhum'],
  [/\b(pescar|pesca|fish)\b/i, 'pescar', 'nenhum'],
  [/\b(roubar|rouba|assaltar)\b/i, 'roubar', 'nenhum'],

  // ═══ GRUPO ═══
  [/\b(quem|quais)\b[^.]{0,30}\b(admin|admins|administradores)\b/i, 'admins', 'nenhum'],
  [/\b(quantos|quantas)\b[^.]{0,30}\b(membros|pessoas|participantes)\b/i, 'participantes', 'nenhum'],
  [/\b(regras|regulamento|normas)\b/i, 'regras', 'nenhum'],
  [/\b(link|convite)\b[^.]{0,30}\b(grupo|aqui)\b/i, 'link', 'nenhum'],

  // ═══ MODERAÇÃO (só admin) ═══
  [/\b(bana|banir|kicka|kickar|expulsa|expulsar|remove|tira)\b/i, 'kick', 'mention'],
  [/\b(promove|promover|dá admin|da admin|torna admin)\b/i, 'promote', 'mention'],
  [/\b(rebaixa|rebaixar|tira admin|demote)\b/i, 'demote', 'mention'],
  [/\b(silencia|silenciar|muta|mutar|cala|calar)\b/i, 'mute', 'nenhum'],
  [/\b(desmuta|desmutar|desliga mute|unsilencia)\b/i, 'unmute', 'nenhum'],
  [/\b(advertir|avisa|warn)\b/i, 'warn', 'mention'],
  [/\b(abre|abrir)\b[^.]{0,20}\b(grupo|gp)\b/i, 'abrir', 'nenhum'],
  [/\b(fecha|fechar|tranca|trancar)\b[^.]{0,20}\b(grupo|gp)\b/i, 'fechar', 'nenhum'],
  [/\b(marcar|marca|tag)\b[^.]{0,20}\b(todos|all|everyone)\b/i, 'todos', 'nenhum'],
  [/\b(apaga|apagar|deleta|deletar|delete)\b/i, 'del', 'nenhum'],

  // ═══ INFORMAÇÃO ═══
  [/\b(meu perfil|minha ficha|meus dados)\b/i, 'perfil', 'nenhum'],
  [/\b(menu|comandos|lista|guia|help)\b/i, 'menu', 'nenhum'],
  [/\b(ping|latência|latencia|velocidade|speed)\b/i, 'ping', 'nenhum'],
  [/\b(id|jid|meu id|meu número)\b/i, 'id', 'nenhum'],

  // ═══ UTILIDADES ═══
  [/\b(traduz|traduzir|tradução)\b/i, 'traduzir', 'depois'],
  [/\b(clima|tempo|previsão|previsao)\b/i, 'clima', 'depois'],
  [/\b(letra|lírica|lyrics)\b/i, 'letra', 'depois'],
  [/\b(pesquisar|procurar|buscar|google|pesquisa|procura)\b/i, 'pesquisar', 'depois'],
  [/\b(notícias|noticias|jornal|news)\b/i, 'noticias', 'nenhum'],
  [/\b(resumir|resume|resumo)\b/i, 'resumir', 'depois'],

  // ═══ IA ═══
  [/\b(gpt|chatgpt|pergunta|perguntar)\b/i, 'ia', 'depois'],
  [/\b(imagem|gera imagem|cria imagem|imagina)\b/i, 'imagem', 'depois'],

  // ═══ INTERAÇÕES ═══
  [/\b(abraça|abraçar|abraço|hug)\b/i, 'abracar', 'mention'],
  [/\b(beija|beijar|beijo|kiss)\b/i, 'beijar', 'mention'],
  [/\b(soca|socar|soco|punch)\b/i, 'soco', 'mention'],
  [/\b(tapa|tapar|slap)\b/i, 'tapa', 'mention'],
  [/\b(mata|matar|kill)\b/i, 'matar', 'mention'],
  [/\b(dança|dancar|dance)\b/i, 'dancar', 'nenhum'],

  // ═══ JOGOS ═══
  [/\b(quiz|pergunta e resposta)\b/i, 'quiz', 'nenhum'],
  [/\b(forca|jogo da forca)\b/i, 'forca', 'nenhum'],
  [/\b(dados|dado|dice)\b/i, 'dados', 'nenhum'],
  [/\b(moeda|cara ou coroa|coinflip)\b/i, 'coinflip', 'nenhum'],

  // ═══ MANGA ═══
  [/\b(manga|mangá|ler manga|capítulo)\b/i, 'manga', 'depois'],

  // ═══ DOG/CAT ═══
  [/\b(cachorro|dog|cão|cao|cavalo)\b/i, 'dog', 'nenhum'],
  // Direct command detection (play X, etc.)
  [/^play\b\s+(.+)/i, 'play', 'depois'],
  [/^video\b\s+(.+)/i, 'video', 'depois'],
  [/\b(gato|cat|gatinho)\b/i, 'cat', 'nenhum'],
];

// ── 3. EXTRAÇÃO DE ARGUMENTOS ───────────────────────────────
function extrairDepois(texto, regex) {
  const m = regex.exec(texto);
  if (!m) return '';
  let resto = texto.slice(m.index + m[0].length).trim();
  resto = resto
    .replace(/^(a|o|um|uma|de|do|da|para|pra|me|essa|esse|isso|isto|aí|ai|por favor|pf|pfv)\s+/gi, '')
    .replace(/^(música|musica|som|audio|áudio|vídeo|video|filme|canção|cancao)\s+/gi, '')
    .replace(/\s*(no|do|da|no youtube|do youtube|da net|na net)\s*$/gi, '')
    .replace(/\s*(por favor|pf|pfv)\s*$/gi, '')
    .replace(/[?!.]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return resto;
}

// ── 4. DETECÇÃO INTELIGENTE ─────────────────────────────────
function detectarComando(texto) {
  const t = String(texto || '').trim();
  if (!t || t.length > 300) return null;

  // Tira o nome dela
  const semNome = t.replace(/^\s*(aura|dark bot|bot)\s*[,:]?!\s*/i, '').trim();
  if (!semNome) return null;

  // Se menciona comando bloqueado, não executa nada
  const palavras = semNome.toLowerCase().split(/[^a-zà-ú0-9]+/);
  if (palavras.some(w => w && BLOQUEADOS.has(w))) return null;

  // ═══ TENTATIVA 1: Verbos naturais (regex) ═══
  for (const [re, cmd, modo] of VERBOS) {
    if (!re.test(semNome)) continue;
    if (estaBloqueado(cmd)) return null;
    const args = modo === 'depois' ? extrairDepois(semNome, re) : '';
    const precisaArg = ['traduzir', 'clima', 'letra', 'pesquisar', 'resumir', 'ia', 'imagem', 'manga'];
    if (precisaArg.includes(cmd) && (!args || args.length < 2)) continue;
    return { comando: cmd, args };
  }

  // ═══ TENTATIVA 2: Nome directo do comando ═══
  // "usa o play", "comando saldo", "roda o quiz", ou simplesmente "play despacito"
  const cmdDirecto = semNome
    .replace(/^(usa|usar|roda|rodar|executa|executar|comando|cmd|faz|fazer|manda|mandar)\s+(o|a|um|uma)?\s*/i, '')
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/^[.!/]/, ''); // tira prefixo se por engano

  if (cmdDirecto && cmdDirecto.length >= 2) {
    // Verifica se é um comando conhecido
    const isKnown = isCommandKnown(cmdDirecto);
    if (isKnown && !estaBloqueado(cmdDirecto)) {
      const restante = semNome.replace(/^.*?\b\w+\b/, '').trim();
      return { comando: cmdDirecto, args: restante };
    }

    // Tenta aliases comuns
    const aliasMap = {
      yt: 'play', musica: 'play', music: 'play', mp3: 'ytd', mp4: 'gyt',
      tt: 'tiktok', ig: 'instagram', fb: 'facebook', tw: 'twitter',
      s: 'sticker', fig: 'sticker', ai: 'ia', banir: 'kick',
      advertir: 'warn', apagar: 'del', mute: 'silenciar',
    };
    const alias = aliasMap[cmdDirecto];
    if (alias && !estaBloqueado(alias)) {
      const restante = semNome.replace(/^.*?\b\w+\b/, '').trim();
      return { comando: alias, args: restante };
    }
  }

  return null;
}

// ── 5. VERIFICAR SE COMANDO EXISTE ──────────────────────────
function isCommandKnown(cmd) {
  try {
    const ch = require('../bot/caseHandler');
    if (ch.CASES.has(cmd)) return true;
  } catch {}
  try {
    const nc = require('../bot/nativeCommands');
    if (typeof nc[cmd] === 'function') return true;
  } catch {}
  try {
    const pkgs = [
      require('../bot/packages/interactions'),
      require('../bot/packages/family'),
      require('../bot/packages/economy'),
      require('../bot/packages/games'),
      require('../bot/packages/cheats'),
    ];
    for (const pkg of pkgs) {
      if (typeof pkg[cmd] === 'function') return true;
    }
  } catch {}
  return false;
}

// ── 6. PERMISSÃO POR CARGO ──────────────────────────────────
// Free: informação, stickers, economia básica
const LIVRES = new Set([
  'menu', 'ping', 'info', 'perfil', 'saldo', 'daily', 'trabalhar',
  'admins', 'participantes', 'regras', 'dono', 'sticker', 'toimg',
  'traduzir', 'clima', 'letra', 'calc', 'wikipedia', 'vip',
  'id', 'jid', 'dog', 'cat', 'coinflip', 'dados', 'quiz', 'forca',
  'abracar', 'beijar', 'soco', 'tapa', 'matar', 'dancar',
  'noticias', 'pesquisar', 'rank', 'top',
]);

// VIP: downloads e coisas que custam recursos
const SO_VIP = new Set([
  'play', 'video', 'play2', 'video2', 'play3', 'ytmp3', 'ytmp4', 'ytd', 'gyt',
  'imagem', 'ia', 'gpt', 'resumir', 'tiktok', 'instagram', 'facebook',
  'twitter', 'spotify', 'soundcloud', 'pinterest', 'manga', 'decrypt', 'vpn',
]);

// Admin: moderação de grupo
const SO_ADMIN = new Set([
  'ban', 'kick', 'promote', 'demote', 'mute', 'unmute', 'silenciar',
  'fechar', 'abrir', 'warn', 'unwarn', 'antilink', 'antispam', 'welcome',
  'todos', 'marcar', 'tagall', 'link', 'linkgrupo', 'del', 'add',
  'tempban', 'setregras', 'setnomegrupo', 'setdesc', 'sorteio',
]);

/**
 * O cargo permite executar este comando por conversa?
 */
function podeExecutar(cmd, quem = {}) {
  const c = String(cmd || '').toLowerCase().trim();
  if (estaBloqueado(c)) return { pode: false, precisa: 'comando de dono (prefixo manual)' };

  const { isOwner = false, isVip = false, isAdmin = false } = quem;

  // Dono Supremo: faz tudo (menos bloqueados)
  if (isOwner) return { pode: true };

  // Admin: moderação + VIP + Free
  if (isAdmin && SO_ADMIN.has(c)) return { pode: true };
  if (isAdmin && SO_VIP.has(c)) return { pode: true };
  if (isAdmin && LIVRES.has(c)) return { pode: true };

  // VIP: downloads + Free
  if (isVip && SO_VIP.has(c)) return { pode: true };
  if (isVip && LIVRES.has(c)) return { pode: true };

  // Free: só coisas inofensivas
  if (LIVRES.has(c)) return { pode: true };

  // Admin-only para não-admin
  if (SO_ADMIN.has(c)) return { pode: false, precisa: 'ser admin do grupo' };

  // VIP-only para free
  if (SO_VIP.has(c)) return { pode: false, precisa: 'ser VIP' };

  // Desconhecido → tenta executar (o handler decide)
  return { pode: true };
}

function porqueNaoFaco(cmd) {
  const c = String(cmd || '').toLowerCase();
  if (/^(eval|exec|shell)/.test(c)) return 'executar código';
  if (/^(broadcast|bc|send)/.test(c)) return 'mandar mensagem a todos';
  if (/^(restart|shutdown)/.test(c)) return 'reiniciar o bot';
  if (/dono|premium|blacklist/.test(c)) return 'mexer em permissões';
  if (SO_ADMIN.has(c)) return 'precisa ser admin do grupo';
  if (SO_VIP.has(c)) return 'precisa ser VIP';
  return 'isso';
}

module.exports = {
  detectarComando,
  estaBloqueado,
  podeExecutar,
  porqueNaoFaco,
  isCommandKnown,
  BLOQUEADOS,
  VERBOS,
  LIVRES,
  SO_VIP,
  SO_ADMIN,
};
