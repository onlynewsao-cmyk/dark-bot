'use strict';
/**
 * Capacidades avançadas de canal usadas pela AURA e pelo Modo Agente.
 *
 * Este módulo é a ponte para os recursos já existentes de sorteio, quiz,
 * enquete múltipla e métricas. Valida o formato antes de publicar para que
 * uma capacidade anunciada no catálogo nunca caia no `default` do executor.
 */

const MAX_TEXT = 700;

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

function unquote(text) {
  return String(text || '').trim().replace(/^["'“”]|["'“”]$/g, '').trim();
}

function extractId(text) {
  const match = clean(text).match(/\b(?:sort|reac|nome|seg|quiz)_[a-f0-9]{4,32}\b/i);
  return match ? match[0] : '';
}

function extractWinners(text) {
  const match = clean(text).match(/\b(\d{1,2})\s+vencedor(?:es)?\b/i);
  return match ? Math.max(1, Math.min(10, Number(match[1]))) : 1;
}

function extractPrize(text) {
  const match = clean(text).match(/\bpr[eé]mio\s*[:=-]?\s*([^|,;]{2,120})/i);
  return match ? match[1].trim() : '';
}

/**
 * Formato explícito e auditável:
 *   quiz "Pergunta?" | opção A | opção B | resposta: opção B
 *   enquete múltipla "Pergunta?" | opção A | opção B
 */
function parsePollSpec(text, { quiz = false } = {}) {
  const raw = clean(text);
  const parts = raw.split('|').map(part => part.trim()).filter(Boolean);
  if (parts.length < 3) {
    return { ok: false, message: quiz
      ? 'Usa: quiz "Pergunta?" | opção A | opção B | resposta: opção B'
      : 'Usa: enquete múltipla "Pergunta?" | opção A | opção B [| opção C].' };
  }

  const first = parts.shift();
  let question = first
    .replace(/^.*?\b(?:cria|criar|faz|fazer|manda|publica|publicar)?\s*(?:um[ae]?\s*)?(?:quiz|enquete|poll)(?:\s+m[úu]ltipla)?\b\s*[:\-]?\s*/i, '')
    .replace(/^.*?\b(?:quiz|enquete\s+m[úu]ltipla|poll)\b\s*[:\-]?\s*/i, '')
    .trim();
  question = unquote(question);
  if (question.length < 4 || question.length > 220) return { ok: false, message: 'A pergunta precisa ter entre 4 e 220 caracteres.' };

  let answer = '';
  const options = [];
  for (const part of parts) {
    const response = part.match(/^resposta(?:\s+certa)?\s*[:=-]\s*(.+)$/i);
    if (response) { answer = unquote(response[1]); continue; }
    const option = unquote(part);
    if (option.length >= 1 && option.length <= 100) options.push(option);
  }
  if (options.length < 2 || options.length > 12) return { ok: false, message: 'Indica entre 2 e 12 opções separadas por `|`.' };
  if (quiz && !answer) return { ok: false, message: 'No quiz, indica a resposta certa: `| resposta: opção`.' };
  if (quiz && !options.some(option => option.toLocaleLowerCase('pt-PT') === answer.toLocaleLowerCase('pt-PT'))) {
    return { ok: false, message: 'A resposta certa precisa ser exactamente uma das opções.' };
  }
  return { ok: true, question, options, answer };
}

async function resolveChannel(sock, text, canais) {
  try {
    return await canais.resolverAlvo(sock, text);
  } catch {
    return null;
  }
}

function channelMissing() {
  return { ok: false, msg: 'Diz em que canal: envia o link ou usa “no meu canal” depois de o adotar.' };
}

async function executar(id, { sock, text, canais, sorteios } = {}) {
  const source = clean(text);
  const channelApi = canais || require('./auraCanais');
  const drawApi = sorteios || require('./auraSorteios');
  const jid = await resolveChannel(sock, source, channelApi);
  if (!jid) return channelMissing();

  if (id === 'canal_engajamento') return drawApi.dashboardEngajamento(sock, jid);

  if (id === 'canal_enquete_multipla') {
    const maxMatch = source.match(/\b(?:at[eé]|m[aá]ximo|max)\s*(\d{1,2})\b/i);
    // “máximo 2” é uma instrução do executor, não uma opção da enquete.
    const spec = parsePollSpec(source.replace(/\s+\b(?:at[eé]|m[aá]ximo|max)\s*\d{1,2}\s*$/i, ''));
    if (!spec.ok) return { ok: false, msg: spec.message };
    const maxSelecoes = maxMatch ? Math.max(2, Math.min(spec.options.length, Number(maxMatch[1]))) : spec.options.length;
    return drawApi.criarEnqueteMultipla(sock, jid, { pergunta: spec.question, opcoes: spec.options, maxSelecoes });
  }

  if (id === 'canal_quiz') {
    const quizId = extractId(source);
    if (/\b(?:revela|revelar|resultado|fecha|fechar|termina|terminar)\b/i.test(source)) {
      if (!quizId) return { ok: false, msg: 'Diz qual quiz revelar: `revela quiz quiz_ab12cd34`.' };
      return drawApi.revelarQuiz(sock, jid, quizId);
    }
    const spec = parsePollSpec(source, { quiz: true });
    if (!spec.ok) return { ok: false, msg: spec.message };
    return drawApi.criarQuiz(sock, jid, {
      pergunta: spec.question,
      opcoes: spec.options,
      resposta: spec.answer,
      premio: extractPrize(source),
      nVencedores: extractWinners(source),
    });
  }

  if (id === 'canal_sorteio') {
    const drawId = extractId(source);
    if (/\b(?:fecha|fechar|sorteia\s+agora|sortear\s+agora|revela|termina|terminar)\b/i.test(source)) {
      if (!drawId) return { ok: false, msg: 'Diz o ID: `fecha sorteio nome_ab12cd34`.' };
      return drawApi.executarSorteio(sock, drawId);
    }
    const options = {
      nome: 'Sorteio', premio: extractPrize(source), nVencedores: extractWinners(source),
    };
    if (/\bpor\s+seguir|seguidores?\b/i.test(source)) return drawApi.criarSorteioPorSeguir(sock, jid, options);
    const postMatch = source.match(/\b(?:post|enquete|poll)\s*(?:id)?\s*[:#=-]?\s*([A-Za-z0-9._:-]{4,160})\b/i);
    if (/\bpor\s+voto/i.test(source)) {
      if (!postMatch) return { ok: false, msg: 'Para sorteio por voto, informa o ID da enquete: `sorteio por voto, enquete ID: ABC`.' };
      return drawApi.criarSorteioPorVoto(sock, jid, postMatch[1], options);
    }
    if (/\bpor\s+rea[cç][aã]o/i.test(source)) {
      if (!postMatch) return { ok: false, msg: 'Para sorteio por reação, informa o ID do post: `sorteio por reação, post ID: ABC`.' };
      return drawApi.criarSorteioPorReacao(sock, jid, postMatch[1], options);
    }
    return drawApi.criarSorteioPorNome(sock, jid, options);
  }

  return { ok: false, msg: 'Capacidade avançada de canal desconhecida.' };
}

module.exports = {
  parsePollSpec, extractId, extractWinners, extractPrize, executar,
  __test: { clean, unquote, resolveChannel },
};
