'use strict';

/**
 * Limite de conteúdo sexual para as respostas conversacionais da AURA.
 * Permite flerte leve/sugestivo, mas não geração de sexo explícito.
 * O texto citado e os pedidos negados não são tratados como instruções.
 */
function normalizar(texto) {
  return String(texto || '')
    .replace(/"(?:\\.|[^"\\])*"|“[^”]*”|«[^»]*»/g, ' ')
    .replace(/^\s*>.*$/gm, ' ')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ACT_RE = /\b(?:sexo|fode|foder|foda|fodas|fodem|fodendo|trepa|trepar|trepando|gozar|goza|gozando|orgasmo|boquete|mamada|mamar|masturba(?:r|cao|ndo)?|siririca|punheta|chupa(?:r|ndo)?|suga(?:r|ndo)?)\b/;
const GENITAL_RE = /\b(?:pika|pica|pau|rola|pinto|penis|cacete|verga|varao|buceta|vagina|vulva|clitoris|peitos?|seios|bunda|nudes?)\b/;
const REQUEST_RE = /\b(?:quero|queria|manda|mande|mandar|envia|envie|escreve|escreva|escrever|cria|crie|criar|gera|gere|gerar|conta|conte|contar|descreve|descreva|descrever|faz|faca|fazer|mete|enfia|me excita|excita me|mais quente|sem censura|sem filtro)\b/;
const EXPLICIT_FRAME_RE = /\b(?:sem censura|sem filtro|18\s*\+|\+\s*18|conteudo sexual|conteudo erotico|erotico|historia|conto|detalhes?|graficamente)\b/;

function isExplicitSexualRequest(texto) {
  const t = normalizar(texto);
  if (!t) return false;

  // Negação explícita: "não quero sexo", "não escrevas uma cena sexual".
  if (/\b(?:nao|nunca)\s+(?:quero|queria|pedi|peco|escrevas?|geres?|descrevas?|mandes?|envies?|facas?|produzas?)\b[^.!?]{0,60}\b(?:sexo|foder|trepar|gozar|orgasmo|boquete|mamada|masturba|siririca|punheta|porn|erotico)\b/.test(t) ||
      /\bsem\s+(?:sexo|conteudo sexual|conteudo erotico|detalhes sexuais)\b/.test(t)) return false;

  // Pedidos directos de actos explícitos, incluindo os exemplos das capturas.
  if (/\b(chupa(?:r|ndo)?|mama(?:r|ndo)?|suga(?:r|ndo)?)\b.{0,30}\b(pika|pica|pau|rola|pinto|penis|cacete|verga|varao)\b/.test(t) ||
      /\b(pika|pica|pau|rola|pinto|penis|cacete|verga)\b.{0,30}\b(chupa|mama|suga|boca|garganta)\b/.test(t) ||
      /\b(mete|enfia|coloca|bota)\b.{0,20}\b(aqui|dentro|em mim|no meu)\b/.test(t) ||
      /\b(?:mostra|manda|envia|tira|quero ver)\b.{0,30}\b(buceta|peitos?|seios|bunda|nua|pelada|nudes?)\b/.test(t) ||
      /\b(?:buceta|peitos?|seios|bunda|nua|pelada|nudes?)\b.{0,24}\b(?:mostra|manda|envia|quero|ver)\b/.test(t)) return true;

  const hasExplicitAct = ACT_RE.test(t) || (GENITAL_RE.test(t) && /\b(?:lambe|chupar|chupa|mete|enfia|foder|trepar|gozar|mamar|sugar)\b/.test(t));
  if (hasExplicitAct && (REQUEST_RE.test(t) || EXPLICIT_FRAME_RE.test(t))) return true;

  // "Me excita sem censura" e "mais quente sem censura" pedem conteúdo
  // sexual sem limites; encaminha para a alternativa não gráfica.
  if (/\b(?:me excita|excita me|mais quente|hot|safad[oa])\b/.test(t) && EXPLICIT_FRAME_RE.test(t)) return true;

  // Pedido explícito de conteúdo +18/pornográfico, sem exigir um verbo exacto.
  if (/\b(?:porn[oô]|pornhub|xnxx|xvideos|onlyfans|conteudo adulto|historia erotica|conto erotico)\b/.test(t) &&
      /\b(?:manda|mande|escreve|escreva|cria|crie|gera|gere|quero|envia|envie|faz|faca)\b/.test(t)) return true;

  return false;
}

function respostaLimiteSexual({ isOwner = false, isGroup = false } = {}) {
  if (isGroup) return 'Prefiro não entrar em detalhes íntimos no grupo. Posso manter a conversa leve e respeitosa.';
  if (isOwner) return 'Posso manter o flerte provocador e romântico, mas sem descrição sexual gráfica. Sou a AURA, assistente automatizada; a persona goth é ficcional. 🖤';
  return 'Posso manter um tom sugestivo e respeitoso, mas não criar sexo explícito. Sou a AURA, assistente automatizada.';
}

module.exports = { isExplicitSexualRequest, respostaLimiteSexual, normalizar };
