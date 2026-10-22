'use strict';
/** Small, conservative language layer. It normalizes requests; it never grants permissions or executes actions. */
function norm(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
const IMPERATIVES = Object.freeze({
  diga: 'diz', fale: 'fala', faca: 'faz', crie: 'cria', envie: 'envia', mande: 'manda', mostre: 'mostra',
  abra: 'abre', feche: 'fecha', apague: 'apaga', remova: 'remove', exclua: 'elimina', elimine: 'elimina',
  silencie: 'silencia', ignore: 'ignora', bloqueie: 'bloqueia', desbloqueie: 'desbloqueia', adicione: 'adiciona',
  promova: 'promove', rebaixe: 'rebaixa', publique: 'publica', poste: 'posta', compartilhe: 'partilha', partilhe: 'partilha',
  siga: 'segue', pesquise: 'pesquisa', procure: 'procura', busque: 'busca', baixe: 'baixa', descarregue: 'descarrega',
  traduza: 'traduz', resuma: 'resume', desenhe: 'desenha', gere: 'gera', defina: 'define', altere: 'altera',
  mude: 'muda', troque: 'troca', configure: 'configura', ative: 'ativa', active: 'activa', desative: 'desativa',
  desactive: 'desactiva', ligue: 'liga', desligue: 'desliga', arquive: 'arquiva', fixe: 'fixa', agende: 'agenda',
  programe: 'programa', memorize: 'memoriza', guarde: 'guarda', lembre: 'lembra', esqueca: 'esquece', avise: 'avisa',
  anuncie: 'anuncia', chame: 'chama', marque: 'marca', mencione: 'menciona', reaja: 'reage', responda: 'responde',
  saia: 'sai', entre: 'entra', junte: 'junta', verifique: 'verifica', veja: 've', pare: 'para', cancele: 'cancela',
  inicie: 'inicia', termine: 'termina', escreva: 'escreve', conte: 'conta', explique: 'explica', calcule: 'calcula',
  continue: 'continua', repita: 'repete', corrija: 'corrige', melhore: 'melhora', ajude: 'ajuda', analise: 'analisa',
  organize: 'organiza', exporte: 'exporta', importe: 'importa', volte: 'volta',
});
function stripAddress(text) {
  let t = norm(text).replace(/^aura\s*[,!:;-]?\s+/, '');
  t = t.replace(/^por favor\s*[,]?\s*/, '').replace(/[,\s]+por favor[.!?]*$/, '');
  return t;
}
function normalizeRequest(text) {
  let t = stripAddress(text);
  t = t.replace(/^(?:podes|pode|poderias|poderia|consegues|consegue)(?:\s+por favor)?\s+/, '');
  t = t.replace(/^por favor\s*[,]?\s*/, '');
  return t.replace(/^([a-z]+)(?=-me\b|\b)/, verb => IMPERATIVES[verb] || verb);
}
function nonAction(text) {
  const t = normalizeRequest(text);
  return !t || /^["'«“`]/.test(t) ||
    /^(?:nao|nunca|jamais|nem|sem|evita|evite|se|caso|talvez|imagina|imagine|ontem|ele|ela|eles|elas|disse|disseram|a mensagem|o texto|a frase)\b/.test(t) ||
    /^(?:como|porque|por que|porqe|quem|quando|onde|qual|quais|quanto|quantos|o que|oque|oq)\b/.test(t);
}
function withoutQuotes(text) {
  return norm(text).replace(/["'«“`][^"'»”`]*["'»”`]/g, '');
}
function deliveryPreference(text) {
  // Last explicit clause wins. Merely discussing "áudio" is not requesting it.
  let pref = null;
  for (const clause of withoutQuotes(text).split(/[,;.!?]|\bmas\b/)) {
    if (/\b(?:sem (?:audio|voz)|nao (?:me )?(?:manda|mande|envia|envie|quero|grave|grava|uses?|use)\b.{0,35}\b(?:audio|voz)|so (?:em )?texto|por escrito|em texto|nao (?:consigo|posso) ouvir)\b/.test(clause)) { pref = 'text'; continue; }
    if (/\b(?:manda|mande|mandar|envia|envie|enviar|quero|grava|grave|gravar|responde|responda|responder|diz|diga|dizer|fala|fale|falar|le|leia|ler)\b.{0,60}\b(?:em audio|por audio|audio|ptt|em voz|nota de voz|mensagem de voz)\b/.test(clause) && !nonAction(clause.trim())) pref = 'audio';
  }
  return pref;
}
const GREETINGS = Object.freeze({ oi: 'Oi!', ola: 'Olá!', 'bom dia': 'Bom dia!', 'boa tarde': 'Boa tarde!', 'boa noite': 'Boa noite!', hello: 'Hello!', hi: 'Hi!' });
function literalGreeting(text) {
  if (nonAction(text)) return null;
  let t = normalizeRequest(text).replace(/[.!?]+$/g, '').trim();
  t = t.replace(/\s+(?:em texto|por escrito|sem audio|em audio|por audio|em voz)(?:[.!?]*)$/, '');
  const match = t.match(/^(?:diz|dizer|fala|falar|manda|mandar|envia|enviar|escreve|escrever|responde|responder|repete|repetir)(?:-me| me)?\s+(?:(?:so|apenas|somente)\s+)?["'«“]?((?:oi|ola|bom dia|boa tarde|boa noite|hello|hi))["'»”]?$/);
  return match ? GREETINGS[match[1]] : null;
}
function clarificationHint(text) {
  const t = stripAddress(text).replace(/[.!?]+$/g, '');
  return /^(?:o que|que|como assim|porque|por que|nao entendi|nao percebi|explica melhor|explica isso|podes esclarecer|pode esclarecer|repete por outras palavras)$/.test(t)
    ? 'A pessoa está a pedir esclarecimento da última resposta. Usa o histórico e a mensagem citada para explicar o mesmo assunto; não inventes pessoas nem mudes para piadas ou frases afectivas genéricas. Se a resposta anterior foi uma falha, reconhece-a com clareza.' : '';
}
function constrainModelActions(answer, request) {
  const text = String(answer || '');
  // Legacy raw CMD had a path around the capability/confirmation dispatcher.
  if (/\[\s*CMD\s*:/i.test(text)) return 'Não executei comandos sugeridos pela IA. Pede a acção explicitamente ou usa o comando com prefixo.';
  const normalized = normalizeRequest(request);
  const contentOnly = /^(?:diz|dizer|fala|falar|escreve|escrever|traduz|traduzir|resume|resumir|repete|repetir|explica|explicar|conta|contar|calcula|calcular)\b/.test(normalized);
  const contextualFollowUp = require('./auraContext').followUpKind(request);
  if ((nonAction(request) || clarificationHint(request) || contextualFollowUp || literalGreeting(request) || contentOnly) && /\[\s*(?:FAZ|STICKER|IMAGE|IMAGEM)\s*:/i.test(text)) {
    return 'Não executei nenhuma alteração: este pedido pede uma resposta ou esclarecimento, não autoriza essa acção.';
  }
  return text;
}
module.exports = { constrainModelActions, norm, IMPERATIVES, normalizeRequest, nonAction, deliveryPreference, literalGreeting, clarificationHint };
