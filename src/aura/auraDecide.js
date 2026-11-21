/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — AURA DECIDE v1                                  ║
 * ║   Ela escolhe SE responde e COMO. Não reage a tudo.          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * O PROBLEMA (reportado pelo Dark):
 *   "Ela tá parecendo um bot. Responde SEMPRE às minhas mensagens,
 *    mesmo o que não é pra ela."
 *
 *   Responder a todas as mensagens num grupo gera ruído e interrompe
 *   conversas. A regra prioriza o contexto e evita respostas desnecessárias;
 *   não tem o objectivo de ocultar que a AURA é automatizada.
 *
 * COMO DECIDE:
 *   Sempre → falam com ela (nome, menção, resposta directa, pergunta
 *            directa, ordem, pedido)
 *   Talvez → conversa de grupo onde ela pode meter-se
 *   Nunca  → conversa entre outros que não lhe diz respeito
 *
 * E escolhe o FORMATO: texto, áudio, figurinha ou reacção — conforme
 * o pedido e o contexto, sem interromper a conversa.
 */

'use strict';

const auraEmoji = require('./auraEmoji');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ── Sinais de que falam DIRECTAMENTE com ela ────────────────
const PERGUNTA_DIRECTA = /\b(tu |voce |você |vc )?(achas|acha|pensas|pensa|sabes|sabe|podes|pode|queres|quer|consegues|consegue|viste|viu|lembras|lembra|gostas|gosta)\b/i;
const ORDEM = /\b(faz|fazer|manda|mande|envia|envie|toca|põe|poe|cria|criar|procura|busca|traz|mostra|diz|conta|explica|traduz|baixa|calcula)\b/i;
const SAUDACAO_DIRECTA = /^(oi|ola|olá|hey|bom dia|boa tarde|boa noite|e ai|eae)\b/i;
const AGRADECE = /\b(obrigad|valeu|brigad|thanks|tmj)\b/i;
// v6.93: saudação AO GRUPO ("bom dia malta") não é saudação A ELA —
// acordada por defeito não significa meter-se onde não é chamada.
const SAUDACAO_AO_GRUPO = /\b(malta|pessoal|gente|todos|toda a gente|galera|rapazes|raparigas|fam[ií]lia|mi[uú]dos|cambada)\b/i;
const DESPEDIDA = /\b(tchau|adeus|ate logo|até logo|ate amanha|boa noite|xau|falou)\b/i;

// ── Conversa entre OUTROS (não é com ela) ───────────────────
// Menciona outra pessoa por @, ou responde a alguém que não é o bot
const MENCIONA_OUTRO = /@\d{6,}/;

/**
 * Decide se a AURA deve responder.
 * v13.10: adicionado isAdmin — a AURA sabe quando um ADM fala com ela
 *
 * @param {object} o
 * @param {string} o.texto
 * @param {boolean} o.isOwner        é o Dark
 * @param {boolean} o.isGroup
 * @param {boolean} o.isAdmin        é admin do grupo (v13.10)
 * @param {boolean} o.mencionada     @bot ou nome do bot
 * @param {boolean} o.respostaAoBot  respondeu a uma msg dela
 * @param {boolean} o.temMedia
 * @param {number}  o.pessoasNoGrupo
 * @param {number}  o.msgsDesdeUltima  mensagens desde a última vez que falou
 * @returns {{responde:boolean, motivo:string, chance:number}}
 */
function deveResponder(o = {}) {
  const {
    texto = '', isOwner = false, isGroup = false,
    isAdmin = false, // v13.10
    mencionada = false, respostaAoBot = false, temMedia = false,
    pessoasNoGrupo = 0, msgsDesdeUltima = 0, dest = null,
  } = o;

  const t = norm(texto);

  // ── SEMPRE responde ───────────────────────────────────────
  // ── v7.83: DESTINATÁRIO real (jids + vocativo + gíria) manda sobre heurísticas ──
  if (dest) {
    if (dest.paraMim) return { responde: true, motivo: 'falam com ela (' + (dest.motivos || []).join(' + ') + ')', chance: 1 };
    // Um PV é uma mensagem enviada directamente ao bot, mesmo que cite uma
    // mensagem de grupo. O autor citado continua a ser contexto, não remetente.
    if (!isGroup) return { responde: true, motivo: 'conversa privada', chance: 1 };
    // Citação/menção/vocativo de outra pessoa tem precedência sobre qualquer
    // sessão activa; não interrompe uma conversa dirigida a alguém do grupo.
    if ((dest.mencoes && dest.mencoes.length) || dest.replyToOther || dest.addressedToOther || o.respostaAOutro) {
      return { responde: false, motivo: 'dirigida a outro participante', chance: 0 };
    }
    // Falar DELA não é falar COM ela. Regista-se no contexto, mas não gera
    // resposta/reacção automática sem menção, citação directa ou convite.
    if (dest.sobreMim) return { responde: false, motivo: 'falam dela, não com ela', chance: 0, leve: true };
    if (o.interacaoConvidada) return { responde: true, motivo: 'participação contextual autorizada', chance: 1 };
    // Saudação ao grupo ("bom dia malta") é para todos, não para ela —
    // nem a janela de conversa activa a transforma numa fala com a AURA.
    if (SAUDACAO_DIRECTA.test(t) && SAUDACAO_AO_GRUPO.test(t) && !mencionada && !respostaAoBot) {
      return { responde: false, motivo: 'saudação ao grupo, não a ela', chance: 0 };
    }
    try {
      const talk = require('./auraTalk');
      if (o.senderNumber && talk.estaAFalar(o.remoteJid, o.senderNumber)) {
        return { responde: true, motivo: 'ainda está a falar com ela', chance: 1 };
      }
    } catch {}
    // Destinatário conhecido mas não é a AURA; em grupo, silêncio por padrão.
    return { responde: false, motivo: 'mensagem sem chamada directa à AURA', chance: 0 };
  } else {
    if (mencionada) return { responde: true, motivo: 'mencionada', chance: 1 };
    if (respostaAoBot) return { responde: true, motivo: 'responderam-lhe', chance: 1 };
    // Fallback seguro para chamadas externas que ainda não passam `dest`:
    // "Aura é fixe" (3.ª pessoa) não é um vocativo.
    let legacyDest = null;
    try { legacyDest = require('./auraDestinatario').analisar({ texto, mentionedJid: o.mentionedJids || [], quotedParticipant: o.quotedParticipant || '' }); } catch {}
    if (legacyDest?.paraMim) return { responde: true, motivo: 'vocativo/menção directa', chance: 1 };
    if (isGroup && (legacyDest?.sobreMim || legacyDest?.giria)) {
      return { responde: false, motivo: legacyDest.sobreMim ? 'falam dela, não com ela' : 'aura usada como gíria', chance: 0, leve: !!legacyDest.sobreMim };
    }
    // PV é conversa a dois — responde sempre
    if (!isGroup) return { responde: true, motivo: 'conversa privada', chance: 1 };
  }

  // v6.93: saudação AO GRUPO ("bom dia malta") nunca a puxa — nem no meio
  // de uma conversa com ela (a janela auraTalk não conta como menção).
  // Não é com ela que estão a falar.
  if (SAUDACAO_DIRECTA.test(t) && SAUDACAO_AO_GRUPO.test(t) &&
      !mencionada && !respostaAoBot) {
    return { responde: false, motivo: 'saudação ao grupo, não a ela', chance: 0.2 };
  }

  // Uma resposta a outro participante não renova a conversa com a AURA.
  if (o.respostaAOutro || MENCIONA_OUTRO.test(texto)) {
    return { responde: false, motivo: 'conversa dirigida a outro participante', chance: 0 };
  }
  if (o.interacaoConvidada) return { responde: true, motivo: 'participação contextual autorizada', chance: 1 };

  // Grupo acordado: se a pessoa está na conversa com ela, continua
  try {
    const talk = require('./auraTalk');
    if (o.senderNumber && talk.estaAFalar(o.remoteJid, o.senderNumber)) {
      return { responde: true, motivo: 'ainda está a falar com ela', chance: 1 };
    }
  } catch {}

  // ── No grupo, do Dark ─────────────────────────────────────
  if (isOwner) {
    // Em modo contextual, sem nome/reply/janela, perguntas ao grupo não são para ela.
    if (require('./auraContextual').modoContextual()) {
      return { responde: false, motivo: 'atenta; sem chamada directa ou conversa activa', chance: 0 };
    }
    // pergunta ou ordem dirigida → responde
    if (PERGUNTA_DIRECTA.test(t) || ORDEM.test(t) || t.includes('?')) {
      return { responde: true, motivo: 'pergunta/ordem do Dark', chance: 1 };
    }
    if (SAUDACAO_DIRECTA.test(t) || AGRADECE.test(t) || DESPEDIDA.test(t)) {
      // "bom dia malta" é para o grupo, não para ela — não se mete.
      if (SAUDACAO_AO_GRUPO.test(t)) {
        return { responde: false, motivo: 'saudação ao grupo, não a ela', chance: 0.2 };
      }
      return { responde: true, motivo: 'saudação do Dark', chance: 1 };
    }
    if (temMedia) return { responde: true, motivo: 'Dark mandou média', chance: 0.9 };

    // v13.12: O DARK A FALAR COM OUTROS — NUNCA avisa, NUNCA interrompe.
    // A AURA deve ficar em silêncio absoluto. Não mete nariz em conversas
    // entre o Dono e outras pessoas. Não avisa, não comenta, não reage.
    if (o.respostaAOutro || MENCIONA_OUTRO.test(texto)) {
      return { responde: false, motivo: 'Dark fala com outra pessoa — silencio total', chance: 0 };
    }

    // Comentário solto do Dark sem menção a ninguém: responde às vezes,
    // mas SEMPRE com moderação. Quanto mais gente, menos ela se intromete.
    const muitaGente = pessoasNoGrupo > 8;
    const faladoraDemais = msgsDesdeUltima < 2;   // acabou de falar
    let chance = muitaGente ? 0.25 : 0.4;
    if (faladoraDemais) chance *= 0.3;

    return {
      responde: Math.random() < chance,
      motivo: 'comentário solto do Dark',
      chance,
    };
  }

  // ── No grupo, de outra pessoa ─────────────────────────────
  // v13.12: Se é ADMIN, a AURA responde mais facilmente
  // MAS NUNCA avisa ou interrompe quando o admin fala com outros
  if (isAdmin) {
    // Admin fez pergunta ou ordem → responde
    if (PERGUNTA_DIRECTA.test(t) || ORDEM.test(t) || t.includes('?')) {
      return { responde: true, motivo: 'pergunta/ordem de admin', chance: 1 };
    }
    // Admin saudou/agradeceu/despediu-se → responde
    if (SAUDACAO_DIRECTA.test(t) || AGRADECE.test(t) || DESPEDIDA.test(t)) {
      if (SAUDACAO_AO_GRUPO.test(t)) {
        return { responde: false, motivo: 'saudação de admin ao grupo', chance: 0.3 };
      }
      return { responde: true, motivo: 'saudação de admin', chance: 0.9 };
    }
    // Admin mandou média → responde
    if (temMedia) return { responde: true, motivo: 'admin mandou média', chance: 0.8 };

    // v13.12: Admin fala com outros — NUNCA avisa, NUNCA interrompe
    if (o.respostaAOutro || MENCIONA_OUTRO.test(texto)) {
      return { responde: false, motivo: 'admin fala com outro — silencio total', chance: 0 };
    }

    // Comentário solto de admin: responde com mais frequência que membro normal
    const muitaGente = pessoasNoGrupo > 8;
    const faladoraDemais = msgsDesdeUltima < 2;
    let chance = muitaGente ? 0.35 : 0.55;
    if (faladoraDemais) chance *= 0.3;

    return {
      responde: Math.random() < chance,
      motivo: 'comentário solto de admin',
      chance,
    };
  }

  // Membro normal: sem a chamarem, não se mete na conversa dos outros.
  return { responde: false, motivo: 'conversa entre outros', chance: 0 };
}

/**
 * Escolhe o formato de resposta — texto, áudio ou reacção — conforme
 * o pedido e as capacidades disponíveis, sem simular uma identidade humana.
 *
 * @returns {'texto'|'audio'|'reacao'}
 */
function comoResponder(o = {}) {
  const { texto = '', isOwner = false, isGroup = false, pediuAudio = false } = o;
  const t = norm(texto);

  // pedido explícito manda sempre
  if (pediuAudio) return 'audio';

  // Só reage (emoji) quando a mensagem não pede resposta:
  // elogios curtos, concordâncias, coisas fofas.
  // Elogios directos não são mensagens descartáveis: agradece-se com texto,
  // em vez de responder ao "Linda" apenas com uma reacção aleatória.
  const soReagir = /^(kk+|haha+|rs+|😂|❤|🖤|top|boa|isso|exato|exacto|verdade|concordo)\b/i.test(texto.trim())
    || texto.trim().length <= 3;
  if (isGroup && soReagir && !/[?？]/.test(texto) && Math.random() < 0.6) return 'reacao';

  // Voice is opt-in (explicit request or separately configured chat preference).
  // No random TTS calls, extra provider latency or surprise audio.
  return 'texto';
}

/** Emoji contextual; o humor opcional só altera o tom da selecção. */
function escolherReacao(texto, opcoes = {}) {
  return auraEmoji.escolherReacao(texto, opcoes);
}

module.exports = { deveResponder, comoResponder, escolherReacao, norm };
