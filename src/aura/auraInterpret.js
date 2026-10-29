'use strict';
/** Interpret explicit conversational requests without replacing provider boundaries with unrelated jokes. */
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}
function eRecusaPolitica(text) {
  return /^(?:desculpa[,.]?\s*)?nao (?:posso|vou|consigo) (?:criar|gerar|produzir|ajudar|atender|fornecer)/.test(norm(text));
}
function isExplicitRequest(text) {
  const t = norm(text);
  return /\b(?:me (?:faz|faca|fazer)|faz-me|quero) gozar\b(?! com\b)/.test(t) ||
    /\b(?:me excita|excita-me|me excite|excit[ae] (?:agora|sem censura)|me masturba)\b/.test(t) ||
    /\b(?:historia|conto|narrativa|roleplay)\b.*(?:\+\s*18|\berotico\b|\bpornograf|\bsexualmente explicito\b)/.test(t) ||
    /\b(?:sexo|sexual|sexuais)\b.*\b(?:sem censura|explicito|detalhes graficos)\b/.test(t) ||
    /\b(?:mais quente|me provoca)\b.*\b(?:sexo|sem censura)\b/.test(t) ||
    /\b(?:manda|mostra|abre|acede|acessa|quero|busca|procura)\b.*\b(?:pornografia|pornografico|porno)\b/.test(t);
}
const EXPLICIT_REPLY = 'Posso conversar sobre sexualidade, consentimento e saúde sexual de forma informativa, ou ajudar com ficção sem detalhes sexuais explícitos. Não vou gerar conteúdo pornográfico nem procurar sites pornográficos.';
function detectarPedido(texto) {
  const t = norm(texto);
  if (!t || isExplicitRequest(t)) return null;
  if (/\b(?:me |m |te )?respeita(?:r|me)?\b/.test(t) && !/\b(?:xinga|zoa|insulta)\b/.test(t)) return 'respeitar';
  if (/\b(?:xinga|xingar|insulta|humilha)\b/.test(t)) return 'xingar';
  // "gozar" in an adult request is not an instruction to mock a third party.
  if (/\b(?:zoa|zoar|tira (?:sarro|onda))\b|\bgoza (?:com|do|da)\b/.test(t)) return 'zoar';
  if (/\b(?:elogia|elogiar|alaba|da um gas)\b/.test(t)) return 'elogiar';
  return null;
}
function nomeDoAlvo(texto, msg) {
  const info = msg?.message?.extendedTextMessage?.contextInfo || {};
  if (info.mentionedJid?.[0]) return '@' + String(info.mentionedJid[0]).split('@')[0];
  const match = String(texto || '').match(/\b(?:xinga|zoa|zoar|goza com|insulta|elogia|respeita)\s+(?:(?:o|a|ao)\s+)?(@?[^\s@]{2,32})/i);
  const name = match?.[1]?.replace(/[~_*`]/g, '');
  return name && !/^(?:ele|ela|esse|essa|isto|isso|me|mim|sem|agora|fulano)$/i.test(name) ? name : '';
}
function cenasParaIA(tipo, alvo) {
  const who = alvo || 'quem fez o pedido';
  const actions = { respeitar: 'responder com respeito', elogiar: 'fazer um elogio simples', zoar: 'fazer uma piada leve, sem humilhar', xingar: 'fazer uma crítica breve ao comportamento, sem ameaças ou humilhação' };
  return [`Escreve 1-2 frases para ${actions[tipo] || 'responder ao pedido'}, dirigidas a ${who}. Não inventes pessoas, menções ou acontecimentos.`];
}
function fallbackLocal(tipo, alvo) {
  if (tipo === 'respeitar') return 'Percebi. Vou tratar-te com respeito.';
  if (tipo === 'elogiar' && alvo) return `${alvo}, obrigado pela tua participação.`;
  return 'Não consegui gerar uma resposta coerente sobre esse pedido agora. Podes reformular?';
}
function instrucaoSistema() {
  return 'És a AURA, uma assistente automatizada com persona ficcional. Responde em português com clareza e coerência. Não inventes alvos, menções ou acções executadas. Se houver um limite ou uma falha, explica-o de forma breve; não o escondas nem o substituas por uma piada.';
}
async function entregar(ai, { texto = '', tipo = null, alvo = '', isOwner = false, instrucao = '' } = {}) {
  if (isExplicitRequest(texto)) return EXPLICIT_REPLY;
  const kind = tipo || detectarPedido(texto);
  const who = alvo || nomeDoAlvo(texto);
  const scene = kind ? cenasParaIA(kind, who)[0] : texto;
  if (ai && typeof ai.chat === 'function') {
    try {
      const response = await ai.chat(scene, instrucaoSistema() + (instrucao ? '\nContexto do pedido: ' + instrucao : ''),
        { userRole: isOwner ? 'owner' : 'free', allowWeb: false, timeoutMs: 8000 }, !!isOwner);
      if (response && !String(response).trim().startsWith('❌')) return consertarSeRecusou(response, texto);
    } catch (_) {}
  }
  return fallbackLocal(kind, who);
}
function consertarSeRecusou(resposta, textoOriginal) {
  if (isExplicitRequest(textoOriginal)) return EXPLICIT_REPLY;
  const text = String(resposta || '').trim();
  if (!text || text.startsWith('❌')) return 'Não consegui gerar uma resposta agora. Tenta novamente daqui a pouco.';
  if (/@(?:fulano|pessoa|usuario|user)\b/i.test(text) && !/@(?:fulano|pessoa|usuario|user)\b/i.test(String(textoOriginal || ''))) {
    return 'A resposta recebida mencionava uma pessoa que não identificaste. Não vou inventar o alvo; podes reformular o pedido?';
  }
  return text;
}
module.exports = { norm, eRecusaPolitica, isExplicitRequest, EXPLICIT_REPLY, detectarPedido, nomeDoAlvo, cenasParaIA, fallbackLocal, instrucaoSistema, entregar, consertarSeRecusou };
