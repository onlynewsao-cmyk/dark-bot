'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   AURA INTENT v1.0 — ROUTER DE MENSAGENS 🧠                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Este módulo distingue mensagens dirigidas à AURA de conversas
 * entre utilizadores. É lógica de encaminhamento, não uma simulação
 * de identidade ou compreensão humana.
 */

const NOME_AURA = ['aura'];

// ── Helpers ─────────────────────────────────────────────────
function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function containsName(text) {
  const t = norm(text);
  return NOME_AURA.some(n => t.includes(n));
}

function isQuestion(text) {
  const t = String(text || '').trim();
  return t.includes('?') || /^(quem|o que|que|quando|onde|como|por que|porque|qual|quanto|cade|onde esta|o que e)\b/i.test(t);
}

function isCommand(text) {
  const t = norm(text);
  return /^(manda|envia|mostra|faz|cria|troca|muda|coloca|bota|posta|gera|me da|me manda|quero|preciso|pode)\b/.test(t);
}

// ── Presença da Aura: compatibilidade para comandos em linguagem natural ──
// O commandHandler usa este contrato para "aura acorda/dorme/estás aí".
// Mantê-lo neste módulo evita que uma troca de personalidade deixe o owner
// sem qualquer controlo e a Aura aparentemente muda nos grupos.
const INTENT_WAKE = 'wake';
const INTENT_SLEEP = 'sleep';
const INTENT_STATUS = 'status';
const WAKE_REPLIES = [
  'Modo AURA activo neste grupo. O que precisas?',
  'AURA está activa aqui. Diz.',
];
const WAKE_ALREADY = [
  'O modo AURA já está activo neste grupo.',
  'AURA já está activa aqui.',
];
const SLEEP_REPLIES = [
  'Modo AURA desactivado neste grupo. Fico em silêncio até me chamarem.',
  'Entendido. Este grupo fica em modo Assistente.',
];
const SLEEP_ALREADY = [
  'O modo AURA já está desactivado neste grupo.',
  'Este grupo já está em modo Assistente.',
];

function pick(items, random = Math.random) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return '';
  const n = Number(random());
  return list[Math.max(0, Math.min(list.length - 1, Math.floor((Number.isFinite(n) ? n : 0) * list.length)))];
}

/**
 * Detecta ordens explícitas do dono para a presença da Aura.
 * Não reage a "que aura"/"mede minha aura", nem no privado (onde ela já
 * está disponível), nem a membros comuns. Retorna `null` quando não é ordem.
 */
function detectAuraIntent(text, { isOwner = false, isGroup = false } = {}) {
  if (!isOwner || !isGroup) return null;
  const t = norm(text).replace(/[.!?]+$/g, '').trim();
  if (!t) return null;

  // Evita que a palavra "aura" em conversa comum altere o modo do grupo.
  if (/\b(?:que|qual|minha|sua|tua) aura\b|\b(?:mede|medir|ler) (?:a )?(?:minha )?aura\b/.test(t)) return null;
  const chamou = /\baura\b/.test(t);

  // "vai dormir" é uma instrução inequívoca do dono no grupo e precisa
  // continuar a funcionar mesmo sem repetir o nome da Aura.
  const dormirSemNome = /^(?:vai )?(?:dormi|dorme|dormir|durma|descansa)(?: ai| aqui)?$/.test(t);
  if ((chamou || dormirSemNome) && /\b(?:dormi|dorme|dormir|durma|descansa|sai daqui|modo (?:assistente|profissional)|fica quieta|fica em silencio)\b/.test(t)) {
    return INTENT_SLEEP;
  }

  if (chamou && /\b(?:acorda|acordar|desperta|vem ca|volta|aparece|ativa|volta a ser tu|fica comigo)\b/.test(t)) {
    return INTENT_WAKE;
  }

  if (chamou && /\b(?:ta ai|tas ai|esta ai|estas ai|acordada|online|presente|sumiu|sumiste)\b/.test(t)) {
    return INTENT_STATUS;
  }
  return null;
}

// ── Análise de contexto de conversa ─────────────────────────
/**
 * Analisa se a conversa é entre outros usuários
 * @param {string[]} recentMessages - últimas mensagens do grupo (texto puro)
 * @param {string} currentSender - quem mandou agora
 * @returns {boolean} true se parece conversa entre outros
 */
function isConversationBetweenOthers(recentMessages = [], currentSender = '') {
  if (!recentMessages || recentMessages.length < 2) return false;
  // Se últimas 3 mensagens são de pessoas diferentes e nenhuma menciona Aura
  // e não há pergunta direta, provavelmente é conversa entre eles
  const last3 = recentMessages.slice(-3);
  const mentionsAura = last3.some(m => containsName(m));
  if (mentionsAura) return false;
  // Se última mensagem menciona outro usuário @ ou nome, e não é pergunta pra Aura
  const t = norm(last3[last3.length - 1] || '');
  if (/\b(ele|ela|vc|voce|tu|mano|bro|amigo|amiga)\b.*\b(falou|disse|fez|foi|vai)\b/.test(t)) {
    return true;
  }
  return false;
}

// ── Detector principal ──────────────────────────────────────
/**
 * @param {string} text - texto da mensagem atual
 * @param {object} ctx
 * @param {boolean} ctx.isGroup - está em grupo?
 * @param {boolean} ctx.isReplyToAura - respondeu mensagem da Aura?
 * @param {boolean} ctx.isPrivateChat - PV?
 * @param {string} ctx.pushName - nome de quem mandou
 * @param {string[]} ctx.recentTexts - últimas mensagens do chat (pra contexto)
 * @param {boolean} ctx.mentionedAuraInGroup - mencionaram Aura no grupo recentemente?
 * @param {string} ctx.groupContext - contexto do grupo
 * @param {boolean} ctx.isOwner - é o Dark?
 * @returns {object} análise completa
 */
function analyzeIntent(text, ctx = {}) {
  const {
    isGroup = false,
    isReplyToAura = false,
    isPrivateChat = false,
    pushName = '',
    recentTexts = [],
    mentionedAuraInGroup = false,
    mentionedJids = [],
    quotedParticipant = '',
    quotedText = '',
    botNum = '',
    botJid = '',
    botLid = '',
    botNames = [],
    destination = null,
    isOwner = false,
    groupContext = '',
  } = ctx;

  const t = norm(text);
  const original = String(text || '');
  const lowerOrig = original.toLowerCase();

  // ── 1. É direto pra Aura? ─────────────────────────────────
  let directScore = 0; // 0-100
  let directReasons = [];

  if (isPrivateChat) {
    directScore += 80;
    directReasons.push('PV = sempre direto');
  }
  if (isOwner) {
    directScore += 20;
    directReasons.push('é o Dark');
  }
  if (isReplyToAura) {
    directScore += 90;
    directReasons.push('respondeu Aura diretamente');
  }
  let destinationInfo = destination;
  if (!destinationInfo) {
    try {
      destinationInfo = require('./auraDestinatario').analisar({
        texto: original,
        mentionedJid: mentionedJids,
        quotedParticipant,
        quotedTexto: quotedText,
        botNum: botNum || String(botJid || '').split('@')[0],
        botLid,
        tambemEu: botNames,
      });
    } catch { destinationInfo = null; }
  }
  const explicitlyAddressedByNameOrMention = !!(
    destinationInfo?.directToAura || destinationInfo?.paraMim ||
    destinationInfo?.mencionouBot || destinationInfo?.vocativo
  );
  if (explicitlyAddressedByNameOrMention) {
    directScore += 85;
    directReasons.push('vocativo/menção/resposta dirigida à AURA');
  } else if (containsName(original)) {
    directReasons.push('o nome aparece sem vocativo; pode ser referência indirecta ou gíria');
  }
  // Contexto recente ajuda a resolver o assunto, não prova o destinatário:
  // sem vocativo, @ ou reply, não transforma a frase numa chamada directa.
  if (/\b(voce|vc|tu|ce|cê)\b/.test(t) && (mentionedAuraInGroup || recentTexts.slice(-2).some(m => containsName(m)))) {
    directReasons.push('há contexto recente da AURA, mas falta sinal directo de destinatário');
  }
  // Pergunta/comando sem alvo específico em PV ou após Aura falar
  if ((isQuestion(original) || isCommand(original)) && !isGroup) {
    directScore += 30;
    directReasons.push('pergunta/comando em PV');
  }
  if ((isQuestion(original) || isCommand(original)) && isGroup && mentionedAuraInGroup) {
    directReasons.push('pergunta/comando após menção anterior, mas sem vocativo/reply não é chamada segura');
  }

  // Penalidades — conversa entre outros
  if (isGroup && !isReplyToAura && !containsName(original)) {
    if (isConversationBetweenOthers(recentTexts)) {
      directScore -= 50;
      directReasons.push('parece conversa entre outros');
    }
    // Se menciona outra pessoa @ ou nome específico que não é Aura
    if (/@\w+/.test(original) && !containsName(original)) {
      directScore -= 30;
      directReasons.push('menciona outra pessoa, não Aura');
    }
    // Se texto é continuação de assunto entre outros sem envolver Aura
    if (recentTexts.length >= 2) {
      const last = norm(recentTexts[recentTexts.length - 1] || '');
      const secondLast = norm(recentTexts[recentTexts.length - 2] || '');
      // Se últimas mensagens são do mesmo assunto entre outros e atual não quebra padrão
      if (last && secondLast && !containsName(last) && !containsName(secondLast) && !containsName(t)) {
        directScore -= 15;
        directReasons.push('continuidade de conversa sem Aura');
      }
    }
  }

  directScore = Math.max(0, Math.min(100, directScore));
  const isDirectToAura = directScore >= 50;

  // ── 2. O que o usuário QUER? (intenção) ────────────────────
  let intent = 'GENERAL_CHAT';
  let intentConfidence = 0;
  let intentDetails = {};

  // Pedido de imagem: separa explicitamente a persona AURA de conteúdo
  // externo. PV/menção não transforma "foto do jogo" em selfie da AURA.
  let photoIntent = null;
  try {
    photoIntent = require('./auraCompreensao').interpretarPedidoImagem({
      texto: original,
      quotedText: ctx.quotedText || '',
      recentMessages: recentTexts,
      isDirectToAura,
    });
  } catch {}
  if (photoIntent?.requested && isDirectToAura) {
    if (photoIntent.target === 'persona') {
      intent = 'PHOTO_REQUEST';
      intentConfidence = 90;
      intentDetails = { photoType: /cosplay/.test(t) ? 'cosplay' : /goth|dark|preta/.test(t) ? 'goth' : /fofa|cute|linda/.test(t) ? 'cute' : 'selfie', photoTarget: 'persona' };
    } else if (photoIntent.target === 'content') {
      intent = 'IMAGE_SEARCH_REQUEST';
      intentConfidence = 90;
      intentDetails = { photoTarget: 'content', query: photoIntent.query || '', searchQuery: photoIntent.searchQuery || '', gameRef: !!photoIntent.gameRef };
    } else {
      intent = 'CLARIFY_IMAGE_REQUEST';
      intentConfidence = 75;
      intentDetails = { photoTarget: 'ambiguous' };
    }
  }

  // Trocar foto de perfil dela / do bot
  if (/\b(troca|muda|altera|coloca|bota|atualiza)\b.{0,20}\b(foto de perfil|perfil|foto tua|foto sua|foto do bot|foto do perfil|pfp|avatar)\b/.test(t) ||
      /\b(foto de perfil|perfil)\b.{0,20}\b(troca|muda|nova)\b/.test(t)) {
    intent = 'PROFILE_PIC_UPDATE';
    intentConfidence = 90;
    intentDetails = { wantsProfileUpdate: true };
  }

  // Foto de perfil pedida junto com foto
  if (intent === 'PHOTO_REQUEST' && /\b(perfil|bot|whatsapp)\b/.test(t)) {
    intent = 'PROFILE_PIC_UPDATE';
    intentConfidence = 80;
  }

  // Pergunta sobre ela (quem é, vida, etc)
  if (/\b(quem.*(voce|vc|tu|e|eh)|o que.*faz|onde.*mora|quantos anos|qual.*idade|de onde|nome verdadeiro|real name|aura.*quem|voce.*goth|cosplay.*faz|o que.*gosta)\b/.test(t)) {
    if (containsName(t) || isPrivateChat || isReplyToAura || isQuestion(original)) {
      // Só se for sobre ela, não sobre outra coisa
      if (!/^(quem.*(fez|escreveu|mandou|disse))/.test(t)) { // evita "quem escreveu isso"
        intent = 'QUESTION_ABOUT_HER';
        intentConfidence = 75;
      }
    }
  }

  // Pedido pra fazer algo (ação)
  if (isCommand(original) && isDirectToAura) {
    if (intent === 'GENERAL_CHAT') {
      intent = 'ACTION_REQUEST';
      intentConfidence = 60;
      intentDetails.rawCommand = original.slice(0, 200);
    }
  }

  // Conversa entre outros (não é pra ela)
  if (!isDirectToAura && isGroup) {
    intent = 'CONVERSATION_BETWEEN_OTHERS';
    intentConfidence = directScore < 30 ? 80 : 50;
  }

  // Flirt / carinho / provocação direta
  if (/\b(linda|gata|gostosa|te amo|amo voce|goth baddie|my goth|ur.*goth|favorita)\b/.test(t) && isDirectToAura) {
    intent = 'FLIRT_DIRECT';
    intentConfidence = 70;
  }

  // ── 3. Deve responder? ─────────────────────────────────────
  let shouldRespond = false;
  let shouldRespondReason = '';

  if (isPrivateChat) {
    shouldRespond = true;
    shouldRespondReason = 'PV sempre responde';
  } else if (isGroup) {
    if (isReplyToAura) {
      shouldRespond = true;
      shouldRespondReason = 'respondeu Aura direto no grupo';
    } else if (directScore >= 70) {
      shouldRespond = true;
      shouldRespondReason = `direto pra Aura (${directScore}%) - ${directReasons.join(', ')}`;
    } else if (directScore >= 50 && intentConfidence >= 60) {
      shouldRespond = true;
      shouldRespondReason = `provavelmente pra Aura (${directScore}%) + intenção clara (${intentConfidence}%)`;
    } else if (directScore < 30) {
      shouldRespond = false;
      shouldRespondReason = `conversa entre outros (${directScore}%) - fica quieta`;
    } else {
      // Zona cinzenta 30-50 — só responde se for muito claro ou se for owner
      if (isOwner && directScore >= 35) {
        shouldRespond = true;
        shouldRespondReason = 'zona cinzenta mas é o Dark';
      } else {
        shouldRespond = false;
        shouldRespondReason = `zona cinzenta (${directScore}%) - melhor não interromper`;
      }
    }
  }

  // ── 4. Confiança geral ─────────────────────────────────────
  const overallConfidence = Math.round((directScore * 0.6 + intentConfidence * 0.4));

  return {
    isDirectToAura,
    directScore,
    directReasons,
    intent,
    intentConfidence,
    intentDetails,
    shouldRespond,
    shouldRespondReason,
    overallConfidence,
    isQuestion: isQuestion(original),
    isCommand: isCommand(original),
    containsName: containsName(original),
    text: original.slice(0, 300),
    // Para logs
    summary: `${isDirectToAura ? 'DIRETO' : 'NÃO-DIRETO'} (${directScore}%) | ${intent} (${intentConfidence}%) | ${shouldRespond ? 'RESPONDE' : 'IGNORA'} | ${shouldRespondReason}`,
  };
}

// ── Versão rápida (sem contexto) pra usar no brain ──────────
function isDirectSimple(text, { isGroup = false, isReply = false } = {}) {
  if (!isGroup) return true;
  if (isReply) return true;
  return containsName(text);
}

module.exports = {
  analyzeIntent,
  detectAuraIntent,
  INTENT_WAKE, INTENT_SLEEP, INTENT_STATUS,
  WAKE_REPLIES, WAKE_ALREADY, SLEEP_REPLIES, SLEEP_ALREADY, pick,
  isDirectSimple,
  containsName,
  NOME_AURA,
  isConversationBetweenOthers,
};
