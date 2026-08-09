/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — AURA COMMANDS v1                                ║
 * ║   Ela executa comandos por conversa, sem prefixo             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *   "aura toca Shakira"        → .play shakira
 *   "faz sticker disto"        → .sticker
 *   "baixa esse vídeo"         → .video
 *   "qual é o meu saldo?"      → .saldo
 *   "quem é o admin aqui?"     → .admins
 *
 * REGRA DE SEGURANÇA (o pedido do Dark):
 *   Ela controla ~90% do bot, MENOS os comandos perigosos de dono.
 *   Um erro de interpretação num `eval` ou `broadcast` é
 *   irreversível — esses continuam a exigir o prefixo escrito à mão.
 *
 * A lista de bloqueio é dupla:
 *   1. BLOQUEADOS — nomes explícitos (destrutivos/irreversíveis)
 *   2. ownerOnly do commandCatalog — rede de segurança automática
 *      para comandos de dono que eu não tenha previsto
 */

'use strict';

// ── 1. NUNCA por conversa, nem para o Dono ──────────────────
// Critério: destrutivo, irreversível, ou afecta terceiros em massa.
const BLOQUEADOS = new Set([
  // execução de código — um erro de interpretação é catastrófico
  'eval', 'exec', 'shell', 'term', 'terminal', 'bash', 'sh',
  // afectam TODOS os grupos/utilizadores de uma vez
  'broadcast', 'bc', 'send', 'sendgroup', 'transmitir',
  // ciclo de vida do processo
  'restart', 'reiniciar', 'shutdown', 'desligar', 'stop', 'kill',
  // alteram permissões e acessos
  'adddono', 'removedono', 'setpremium', 'blacklist', 'unblacklist',
  'desativarusuario', 'ativarusuario', 'desativargrupo', 'ativargrupo',
  'block', 'unblock', 'bloquear', 'desbloquear',
  // mexem no próprio código
  'addcase', 'delcase', 'removicase', 'reloadcases', 'runcase', 'execcase',
  // configuração global
  'setprefix', 'prefixos', 'themeglobal', 'panel', 'backup',
  // conteúdo adulto — exige intenção explícita
  'adultmode', 'adultapi', 'menu18', 'hentai', 'ximg', 'xvideo',
  'adultsearch', 'hotchat', 'fig18', 'pack18', 'gif18', 'shorts18',
  'yande', 'kona', 'e621', 'nekos', 'erome', 'eromevid', 'buscar18',
  // sabotagem/troça pesada
  'bomb', 'trava1', 'trava2', 'trava3', 'fakeban', 'forjar', 'simular',
  'espiao', 'antidelete', 'apagadas', 'ver',
]);

/** True se este comando NUNCA pode ser executado por conversa. */
function estaBloqueado(cmd) {
  const c = String(cmd || '').toLowerCase().trim();
  if (!c) return true;
  if (BLOQUEADOS.has(c)) return true;

  // rede de segurança: ownerOnly do catálogo que eu não tenha listado
  try {
    const cat = require('../bot/commandCatalog');
    const item = (cat.CATALOG || []).find(x => x.name === c);
    if (item?.ownerOnly) {
      // alguns ownerOnly são inofensivos e úteis por voz
      const permitidos = new Set(['stats', 'donos', 'grupos', 'menudono', 'maiscmds']);
      if (!permitidos.has(c)) return true;
    }
  } catch {}

  return false;
}

// ── 2. Frases → comandos ────────────────────────────────────
// Cada entrada: [regex, comando, extractor de argumentos]
// A ordem importa — o primeiro que casar ganha.
const MAPA = [
  // música e vídeo
  // v6.55: 'manda' sozinho era genérico demais — "manda broadcast para
  // todos" virava `.play broadcast`. Agora exige a palavra música/som
  // ou um verbo inequívoco de tocar.
  [/\b(toca|tocar|toque)\b/i, 'play', 'depois'],
  [/\b(p[oõ]e|coloca|manda|quero ouvir|ouvir|bota)\b[^.?!]{0,20}\b(m[úu]sica|som|canção|cancao|mp3)\b/i, 'play', 'depois'],
  [/\b(baixa|baixar|descarrega|download)\b.*\b(m[úu]sica|audio|mp3)\b/i, 'play', 'depois'],
  [/\b(baixa|baixar|descarrega|download)\b.*\b(v[íi]deo|mp4|filme)\b/i, 'video', 'depois'],
  [/\b(procura|pesquisa|acha)\b.*\b(no youtube|youtube|yt)\b/i, 'play', 'depois'],

  // figurinhas
  [/\b(faz|fazer|cria|criar|transforma|converte)\b.*\b(sticker|figurinha|fig)\b/i, 'sticker', 'nenhum'],
  [/\b(sticker|figurinha)\b.*\b(disto|disso|dessa|desta|dessa imagem|dessa foto)\b/i, 'sticker', 'nenhum'],
  [/\b(transforma|converte)\b.*\b(em imagem|em foto|pra imagem)\b/i, 'toimg', 'nenhum'],

  // economia
  [/\b(qual|quanto)\b.*\b(meu saldo|minha carteira|meus coins|tenho de coins)\b/i, 'saldo', 'nenhum'],
  [/\b(meu saldo|minha carteira|meus coins)\b/i, 'saldo', 'nenhum'],
  [/\b(recompensa|b[óo]nus|daily|di[áa]ri[ao])\b/i, 'daily', 'nenhum'],
  [/\b(trabalhar|trabalha|quero trabalhar)\b/i, 'trabalhar', 'nenhum'],

  // grupo (informativo — moderação continua a exigir comando)
  [/\b(quem|quais)\b.*\b(s[ãa]o os admin|admins|administradores)\b/i, 'admins', 'nenhum'],
  [/\b(quantos|quantas)\b.*\b(membros|pessoas|participantes)\b.*\b(grupo|aqui)\b/i, 'participantes', 'nenhum'],
  [/\b(regras|regulamento)\b.*\b(grupo|aqui)\b/i, 'regras', 'nenhum'],

  // informação
  [/\b(meu perfil|minha ficha|meus dados)\b/i, 'perfil', 'nenhum'],
  [/\b(qual|mostra)\b.*\b(o menu|os comandos|lista de comandos)\b/i, 'menu', 'nenhum'],
  [/\b(ping|latência|latencia|velocidade)\b.*\b(bot|tua|teu)\b/i, 'ping', 'nenhum'],

  // utilidades
  [/\b(traduz|traduzir)\b/i, 'traduzir', 'depois'],
  [/\b(clima|tempo|previs[ãa]o)\b.*\b(em|de|no|na)\b/i, 'clima', 'depois'],
  [/\b(letra|l[íi]rica|lyrics)\b.*\b(de|da|do)\b/i, 'letra', 'depois'],
];

/** Tira o que vem depois do verbo — o argumento do comando. */
function extrairDepois(texto, regex) {
  const m = regex.exec(texto);
  if (!m) return '';
  let resto = texto.slice(m.index + m[0].length).trim();

  // limpa palavras de ligação no início
  // v6.55: limpa palavras de ligação E os substantivos genéricos que
  // sobram do próprio pedido ('a música despacito' → 'despacito',
  // 'esse vídeo do youtube' → sem argumento útil → não executa).
  resto = resto
    .replace(/^(a|o|um|uma|de|do|da|para|pra|me|essa|esse|isso|isto|aí|ai|por favor|pf|pfv)\s+/gi, '')
    .replace(/^(m[úu]sica|som|audio|áudio|v[íi]deo|filme|canção|cancao|track|faixa)\s+/gi, '')
    .replace(/\s*(no|do|da|no youtube|do youtube|da net|na net)\s*$/gi, '')
    .replace(/^(no |do |da )?youtube\s*$/gi, '')
    .replace(/\s*(por favor|pf|pfv)\s*$/gi, '')
    .replace(/[?!.]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return resto;
}

/**
 * Detecta se a frase é um pedido de comando.
 * @returns {{comando:string, args:string}|null}
 */
function detectarComando(texto) {
  const t = String(texto || '').trim();
  if (!t || t.length > 200) return null;

  // tira o nome dela do início — "aura toca X" → "toca X"
  const semNome = t.replace(/^\s*(aura|dark bot|bot)\s*[,:]?\s*/i, '').trim();
  if (!semNome) return null;

  // v6.55: se a frase menciona um comando bloqueado, não executa NADA.
  // Rede de segurança contra interpretações criativas — "manda
  // broadcast" nunca pode acabar como `.play broadcast`.
  const palavras = semNome.toLowerCase().split(/[^a-zà-ú0-9]+/);
  if (palavras.some(w => w && BLOQUEADOS.has(w))) return null;

  for (const [re, cmd, modo] of MAPA) {
    if (!re.test(semNome)) continue;
    if (estaBloqueado(cmd)) return null;

    const args = modo === 'depois' ? extrairDepois(semNome, re) : '';

    // comandos que precisam de argumento e não o têm → não força
    const precisaArg = ['play', 'video', 'traduzir', 'clima', 'letra'];
    if (precisaArg.includes(cmd) && (!args || args.length < 2)) continue;

    return { comando: cmd, args };
  }
  return null;
}

/** Lista legível do que ela NÃO faz por conversa (para explicar). */
function porqueNaoFaco(cmd) {
  const c = String(cmd || '').toLowerCase();
  if (/^(eval|exec|shell|term)/.test(c)) return 'executar código';
  if (/^(broadcast|bc|send)/.test(c)) return 'mandar mensagem a todos os grupos';
  if (/^(restart|shutdown)/.test(c)) return 'reiniciar o bot';
  if (/dono|premium|blacklist/.test(c)) return 'mexer em permissões';
  return 'isso';
}

module.exports = { detectarComando, estaBloqueado, porqueNaoFaco, BLOQUEADOS, MAPA };
