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
 *
 * @param {object} o
 * @param {string} o.texto
 * @param {boolean} o.isOwner        é o Dark
 * @param {boolean} o.isGroup
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

    // O DARK A FALAR COM OUTROS — o problema reportado.
    // Ela não se mete em tudo. Às vezes só reage, às vezes cala-se.
    if (MENCIONA_OUTRO.test(texto)) {
      return { responde: false, motivo: 'o Dark fala com outra pessoa', chance: 0.15 };
    }

    // Comentário solto num grupo com gente: ela nem sempre comenta.
    // Quanto mais gente, menos ela se intromete.
    const muitaGente = pessoasNoGrupo > 8;
    const faladoraDemais = msgsDesdeUltima < 2;   // acabou de falar
    let chance = muitaGente ? 0.35 : 0.6;
    if (faladoraDemais) chance *= 0.5;

    return {
      responde: Math.random() < chance,
      motivo: 'comentário solto do Dark',
      chance,
    };
  }

  // ── No grupo, de outra pessoa ─────────────────────────────
  // Sem a chamarem, ela não se mete na conversa dos outros.
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
  if (isGroup && soReagir && Math.random() < 0.6) return 'reacao';

  // Áudio quando ELA quer. Não é só afectivo no PV — uma pessoa
  // às vezes manda voz para explicar, responder, ou porque lhe
  // apetece. Raro o suficiente para não virar rádio.
  const ordem = /\b(promove|ban|fecha|abre|sticker|play|menu|kick|adiciona com adm)\b/i.test(t);
  if (isOwner && !ordem) {
    const afectivo = /\b(saudades|amo|amor|beijo|carinho|te quero|falta|ouve|escuta)\b/i.test(t);
    const explicar = t.length > 36 || /\b(porque|explica|conta|como foi|o que)\b/i.test(t);
    let p = isGroup ? 0.06 : 0.14;
    if (afectivo) p += isGroup ? 0.10 : 0.22;
    if (explicar && !isGroup) p += 0.08;
    if (Math.random() < Math.min(0.42, p)) return 'audio';
  }

  return 'texto';
}

/** Emoji contextual; o humor opcional só altera o tom da selecção. */
function escolherReacao(texto, opcoes = {}) {
  return auraEmoji.escolherReacao(texto, opcoes);
}

module.exports = { deveResponder, comoResponder, escolherReacao, norm };
