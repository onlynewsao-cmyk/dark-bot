'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   AURA SMART — v9.22  Inteligência Avançada                 ║
 * ║   Classificação, cache semântico, tópicos, anti-repetição    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Camadas de inteligência:
 *   1. CLASSIFICADOR — trivial / simples / complexo / comando
 *   2. CACHE SEMÂNTICO — respostas similares agrupadas por intenção
 *   3. TÓPICOS — rastreia o que se fala em cada conversa
 *   4. ANTI-REPETIÇÃO — nunca diz a mesma coisa duas vezes
 *   5. FAST-PATH — respostas instantâneas para mensagens triviais
 *   6. HUMOR CONTEXTUAL — deteta emoção no texto para além de comandos
 */

// ── 1. CLASSIFICADOR DE MENSAGENS ────────────────────────────

const TRIVIAL_RE = /^(ok|k|kk+|sim|não|nao|hm+|ah+|oh+|eh+|ui|uau|wow|opa|tá|ta|bs+|vlw|🤝|👍|👎|❤️|😂|🤣|😍|🥰|😎|💀|🙄|😤|😭|🥺|❤|🖤|🌹|💕|💯|🔥|👀|😊|😅|🙂|😐)$/i;

const GREETING_RE = /^(oi|olá|ola|hello|hi|hey|e aí|eai|salve|fala|flw|bom dia|boa tarde|boa noite|boa madrugada|buenas|fala\s*ae)/i;

const FAREWELL_RE = /^(tchau|até logo|adeus|falou|flw|até mais|até amanhã|até logo|bye|xau|ate lgo|boa noite\s*$)/i;

const LOVE_RE = /\b(amo|amo-?te|te amo|love|gosto de ti|gosto muito|meu amor|meu dark|meu tudo|neném|vida\s*minha|coração)\b/i;
const PRAISE_RE = /^(?:(?:aura\s*(?:(?:e|eh|esta|ta)\s+)?|tu\s+es\s+|voce\s+e\s+|vc\s+e\s+|es\s+|que\s+)?)(?:linda|lindo|bonita|bonito|perfeita|perfeito|maravilhosa|maravilhoso|incrivel|especial|unica|inteligente|esperta)(?:[.!\s🖤💜💕✨]*)$/i;

const GRATITUDE_RE = /\b(obrigad[oa]|thanks|valeu|agradeço|agradecid[oa]|thx|vlw|brigad)\b/i;

const QUESTION_RE = /\?|^(?:quem|o que|que|quando|onde|como|por que|porquê|qual|quais|quanto|quantos|será|existe|tem |existe|pode|consegue|sabe|lembra)\b/i;

const SAD_RE = /\b(triste|chorar|mal|depressão|sozinh[oa]|ansiedade|cansad[oa]|exaust[oa]|péssimo|terrível|horrível|não aguento|não consigo|me ajud)\b/i;

const HAPPY_RE = /\b(feliz|alegre|contente|animad[oa]|happy|ótimo|maravilhoso|incrível|perfeito|show|top|massa|legal|maneiro|daora|eita|nossa|vibe)\b/i;

const ANGRY_RE = /\b(raiva|irritad[oa]|puto|puta|caralh|porra|droga|merda|fod|ódio|odeio|nojo|ridículo|vergonha)\b/i;

const ACTION_RE = /\b(faz|fazer|cria|criar|manda|envia|poe|coloca|mete|muda|troca|liga|desliga|ativa|abre|fecha|apaga|remove|bane|promove|marca|reage|responde|procura|pesquisa|baixa|traduz|resume|gera|desenha|toca|play|toca|envia|grava)\b/i;

/**
 * Classifica uma mensagem em categorias para routing inteligente.
 * @returns {{ type: string, confidence: number, emotion: string, isQuestion: boolean, wordCount: number }}
 */
function classifyMessage(text) {
  const t = String(text || '').trim();
  const tl = t.toLowerCase();
  const plain = tl.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const wordCount = t.split(/\s+/).filter(w => w.length > 0).length;

  // A short question/clarification is not an acknowledgement or random emoji cue.
  if (/[?？]/.test(t) || /^(?:o qu[eê]|qu[eê]|como assim|porque|por que)$/i.test(t)) {
    return { type: 'complex', confidence: 0.95, emotion: 'neutral', isQuestion: true, wordCount };
  }

  // Saudação — verificar ANTES de trivial (evita que "oi" seja trivial)
  if (GREETING_RE.test(tl) && wordCount <= 4) {
    return { type: 'greeting', confidence: 0.9, emotion: 'happy', isQuestion: false, wordCount };
  }

  // Despedida — verificar ANTES de trivial
  if (FAREWELL_RE.test(tl) && wordCount <= 4) {
    return { type: 'farewell', confidence: 0.9, emotion: 'neutral', isQuestion: false, wordCount };
  }

  // Gratidão — verificar ANTES de trivial
  if (GRATITUDE_RE.test(tl) && wordCount <= 4) {
    return { type: 'simple', confidence: 0.8, emotion: 'neutral', isQuestion: false, wordCount };
  }

  // Elogio directo (inclui a mensagem isolada "Linda"): não o confundir
  // com uma palavra sem contexto nem deixar que a IA diga que se perdeu.
  if (PRAISE_RE.test(plain) && wordCount <= 8) {
    return { type: 'emotional', confidence: 0.9, emotion: 'praise', isQuestion: false, wordCount };
  }

  // Trivial — resposta instantânea, sem IA
  if (TRIVIAL_RE.test(tl) || (t.length <= 3 && !GREETING_RE.test(tl))) {
    return { type: 'trivial', confidence: 0.95, emotion: 'neutral', isQuestion: false, wordCount };
  }

  // Detetar emoção
  let emotion = 'neutral';
  if (LOVE_RE.test(tl)) emotion = 'love';
  else if (SAD_RE.test(tl)) emotion = 'sad';
  else if (HAPPY_RE.test(tl)) emotion = 'happy';
  else if (ANGRY_RE.test(tl)) emotion = 'angry';

  // Comando/ação
  if (ACTION_RE.test(tl) && !QUESTION_RE.test(tl)) {
    return { type: 'command', confidence: 0.7, emotion, isQuestion: false, wordCount };
  }

  // Pergunta
  const isQuestion = QUESTION_RE.test(t);

  // Simples — resposta rápida com IA leve
  if (wordCount <= 6 && !isQuestion && emotion === 'neutral') {
    return { type: 'simple', confidence: 0.7, emotion, isQuestion, wordCount };
  }

  // Emocional — precisa de resposta empática
  if (emotion !== 'neutral') {
    return { type: 'emotional', confidence: 0.8, emotion, isQuestion, wordCount };
  }

  // Complexo — IA completa
  return { type: 'complex', confidence: 0.6, emotion, isQuestion, wordCount };
}

// ── 2. CACHE SEMÂNTICO ───────────────────────────────────────

/**
 * Normaliza texto para comparação semântica.
 * Remove pontuação, espaços extras, acentos.
 */
function _normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai palavras-chave significativas (remove stop words).
 */
const STOP_WORDS = new Set([
  'a', 'o', 'e', 'de', 'do', 'da', 'em', 'no', 'na', 'um', 'uma',
  'que', 'para', 'com', 'por', 'se', 'me', 'te', 'nos', 'voce',
  'tu', 'ele', 'ela', 'eles', 'elas', 'eu', 'isso', 'isto', 'esse',
  'essa', 'aqui', 'ali', 'muito', 'mais', 'menos', 'ja', 'ainda',
  'so', 'mas', 'ou', 'como', 'qual', 'quando', 'onde', 'porque',
  'the', 'is', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'by', 'it', 'this', 'that',
]);

function _keywords(text) {
  const words = _normalize(text).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set(words)].sort();
}

/**
 * Calcula similaridade entre duas strings (Jaccard nas keywords).
 */
function similarity(a, b) {
  const kwA = new Set(_keywords(a));
  const kwB = new Set(_keywords(b));
  if (!kwA.size && !kwB.size) return 1;
  if (!kwA.size || !kwB.size) return 0;
  let intersection = 0;
  for (const w of kwA) if (kwB.has(w)) intersection++;
  return intersection / (kwA.size + kwB.size - intersection);
}

const _responseCache = new Map(); // [scope, normalized] → { response, ts, hits, scope, norm }
const CACHE_MAX = 300;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos
const SIMILARITY_THRESHOLD = 0.88; // 88% similar = cache hit (reduz falsos positivos)

function _responseCacheKey(scope, norm) {
  return JSON.stringify([String(scope || ''), norm]);
}

/**
 * Procura uma resposta apenas no mesmo chat e para o mesmo participante.
 * A chave opcional mantém compatibilidade com os testes e callers genéricos.
 */
function cacheGet(text, scope = '') {
  const norm = _normalize(text);
  const scoped = String(scope || '');
  const now = Date.now();

  // Match exacto dentro do mesmo âmbito.
  const exactKey = _responseCacheKey(scoped, norm);
  const exact = _responseCache.get(exactKey);
  if (exact && now - exact.ts < CACHE_TTL) {
    exact.hits++;
    return exact.response;
  }

  // Match semântico: nunca compara respostas de outro chat/pessoa.
  for (const [key, entry] of _responseCache) {
    if (now - entry.ts > CACHE_TTL) {
      _responseCache.delete(key);
      continue;
    }
    if (entry.scope !== scoped) continue;
    const sim = similarity(norm, entry.norm);
    if (sim >= SIMILARITY_THRESHOLD) {
      entry.hits++;
      return entry.response;
    }
  }
  return null;
}

/** Guarda resposta apenas no âmbito fornecido. */
function cacheSet(text, response, scope = '') {
  if (!text || !response) return;
  const norm = _normalize(text);
  if (norm.length < 3) return; // não cachear trivialidades
  const scoped = String(scope || '');

  if (_responseCache.size >= CACHE_MAX) {
    const entries = [..._responseCache.entries()]
      .sort((a, b) => (a[1].hits - b[1].hits) || (a[1].ts - b[1].ts));
    for (let i = 0; i < Math.floor(CACHE_MAX * 0.3); i++) {
      _responseCache.delete(entries[i][0]);
    }
  }

  _responseCache.set(_responseCacheKey(scoped, norm), {
    response, ts: Date.now(), hits: 0, scope: scoped, norm,
  });
}

function cacheStats() {
  return { size: _responseCache.size, max: CACHE_MAX };
}

// ── 3. RASTREAMENTO DE TÓPICOS ───────────────────────────────

const _topics = new Map(); // jid → [{ topic, ts, keywords }]
const TOPICS_MAX_PER_CHAT = 10;
const TOPICS_MAX_CHATS = 200;

/**
 * Extrai o tópico principal de uma mensagem.
 */
function _extractTopic(text) {
  const t = String(text || '').toLowerCase();
  const topics = [];

  // Temas detectáveis
  const THEMES = [
    { re: /\b(anime|manga|otome|cosplay|naruto|one piece|dragon ball|jujutsu|demon slayer|attack on titan)\b/i, topic: 'anime' },
    { re: /\b(música|musica|música|song|playlist|spotify|cantar|banda|artista|álbum)\b/i, topic: 'música' },
    { re: /\b(jogo|jogar|game|gaming|playstation|xbox|nintendo|steam|valorant|fortnite|lol\b|free fire|minecraft)\b/i, topic: 'jogos' },
    { re: /\b(estudar|escola|faculdade|universidade|prova|exame|trabalho|tarefa|matéria|aula|professor)\b/i, topic: 'estudos' },
    { re: /\b(comida|comer|fome|almoço|jantar|café|cafe|pizza|hambúrguer|restaurante|receita|cozinhar)\b/i, topic: 'comida' },
    { re: /\b(família|familia|mãe|pai|irmão|irmã|avó|primo|filho|casa)\b/i, topic: 'família' },
    { re: /\b(amor|namorar|namorado|namorada|relacionamento|ciúme|beijo|casal|date)\b/i, topic: 'relacionamento' },
    { re: /\b(série|serie|filme|netflix|disney|prime video|assistir|temporada|episódio)\b/i, topic: 'entretenimento' },
    { re: /\b(dinheiro|salário|pagar|conta|banco|investir|poupar|receber|gastar)\b/i, topic: 'dinheiro' },
    { re: /\b(dormir|sono|cama|acordar|manhã|noite|insônia|descansar)\b/i, topic: 'sono' },
    { re: /\b(sporting|benfica|porto|futebol|jogo|campeonato|liga|golo|gol)\b/i, topic: 'desporto' },
    { re: /\b(política|política|governo|presidente|ministro|eleição|partido)\b/i, topic: 'política' },
    { re: /\b(deus|igreja|oração|fé|biblia|rezar|santo|deus)\b/i, topic: 'fé' },
    { re: /\b(WhatsApp|telegram|instagram|tiktok|facebook|twitter|social|rede)\b/i, topic: 'redes sociais' },
    { re: /\b(saudade|sentir|emoção|chorar|rir|feliz|triste|raiva|medo)\b/i, topic: 'emoções' },
    { re: /\b(viagem|viajar|praia|campo|cidade|passear|férias|feriado)\b/i, topic: 'viagem' },
    { re: /\b(saúde|saude|médico|remédio|hospital|doença|dor|cabeça|febre)\b/i, topic: 'saúde' },
  ];

  for (const { re, topic } of THEMES) {
    if (re.test(t)) topics.push(topic);
  }

  return topics.length ? topics[0] : null;
}

/**
 * Regista tópicos de uma conversa.
 */
function trackTopic(jid, text) {
  if (!jid || !text) return;
  const topic = _extractTopic(text);
  if (!topic) return;

  if (_topics.size >= TOPICS_MAX_CHATS) {
    _topics.delete(_topics.keys().next().value);
  }

  const chatTopics = _topics.get(jid) || [];
  // Evitar duplicar o mesmo tópico consecutivamente
  if (chatTopics.length && chatTopics[chatTopics.length - 1].topic === topic) {
    chatTopics[chatTopics.length - 1].ts = Date.now();
    return;
  }
  chatTopics.push({ topic, ts: Date.now() });
  if (chatTopics.length > TOPICS_MAX_PER_CHAT) chatTopics.shift();
  _topics.set(jid, chatTopics);
}

/**
 * Devolve os tópicos recentes de uma conversa.
 */
function getTopics(jid) {
  return (_topics.get(jid) || []).map(t => t.topic);
}

/**
 * Devolve o tópico atual (mais recente).
 */
function getCurrentTopic(jid) {
  const topics = _topics.get(jid);
  if (!topics || !topics.length) return null;
  return topics[topics.length - 1].topic;
}

// ── 4. ANTI-REPETIÇÃO ────────────────────────────────────────

const _recentResponses = new Map(); // jid → [{ text, ts }]
const ANTI_REP_MAX_CHATS = 200;
const ANTI_REP_MAX_PER_CHAT = 15;
const ANTI_REP_WINDOW = 60 * 60 * 1000; // 1 hora

/**
 * Regista uma resposta dada.
 */
function trackResponse(jid, responseText) {
  if (!jid || !responseText) return;
  if (_recentResponses.size >= ANTI_REP_MAX_CHATS) {
    _recentResponses.delete(_recentResponses.keys().next().value);
  }
  const arr = _recentResponses.get(jid) || [];
  const now = Date.now();
  // Limpar antigas
  const fresh = arr.filter(r => now - r.ts < ANTI_REP_WINDOW);
  fresh.push({ text: String(responseText).slice(0, 200), ts: now });
  if (fresh.length > ANTI_REP_MAX_PER_CHAT) fresh.shift();
  _recentResponses.set(jid, fresh);
}

/**
 * Verifica se uma resposta é repetida. Devolve true se é repetida.
 */
function isRepetitive(jid, responseText) {
  if (!jid || !responseText) return false;
  const arr = _recentResponses.get(jid);
  if (!arr || !arr.length) return false;

  const norm = _normalize(responseText);
  const now = Date.now();

  for (const r of arr) {
    if (now - r.ts > ANTI_REP_WINDOW) continue;
    const rNorm = _normalize(r.text);

    // Match exato
    if (norm === rNorm) return true;

    // Match por prefixo (mesma abertura)
    const words = norm.split(' ');
    const rWords = rNorm.split(' ');
    if (words.length >= 3 && rWords.length >= 3) {
      const prefix = words.slice(0, 3).join(' ');
      const rPrefix = rWords.slice(0, 3).join(' ');
      if (prefix === rPrefix) return true;
    }

    // Alta similaridade
    if (similarity(norm, rNorm) > 0.7) return true;
  }
  return false;
}

/**
 * Devolve sugestões de variação baseado no que já foi dito.
 * Útil para a IA não começar sempre igual.
 */
function getVariationHint(jid) {
  const arr = _recentResponses.get(jid);
  if (!arr || !arr.length) return '';

  const recent = arr.slice(-5).map(r => {
    const words = _normalize(r.text).split(' ');
    return words.slice(0, 4).join(' ');
  });

  if (!recent.length) return '';

  return `EVITA começar a resposta como estas recentes:\n${recent.map(r => `- "${r}..."`).join('\n')}\nVaria o início e o tom.`;
}

// ── 5. FAST-PATH — Respostas instantâneas ────────────────────
// v13.8: Pools expandidos (15-20 respostas) + contexto PV vs Grupo
//        para evitar repetições e respostas genéricas iguais em todo o lado

const FAST_RESPONSES = {
  trivial: {
    owner: {
      pv: [
        'Diz, Dark.', 'Sim?', 'Estou a ouvir.', 'Hm?', 'Já te leio.',
        'Tô aqui.', 'Fala.', 'Manda.', 'Estou atenta.', 'Ok, Dark.',
        'Continua.', 'Sou toda ouvidos.', 'Vai.', 'Estou a seguir.', 'Diz lá.'
      ],
      grupo: [
        'Diz.', 'Sim?', 'Hm?', 'Ok.', 'Tô.', 'Ok.', 'Sei.',
        'Ok, já vi.', 'Continua.', 'Fala.', 'Manda.', 'Tô a ouvir.',
        'Percebi.', 'Ok.', 'Estou aqui.'
      ]
    },
    other: {
      pv: [
        'Diz.', 'Sim?', 'Hm?', 'Ok.', 'Tô a ouvir.',
        'Fala.', 'Continua.', 'Manda.', 'Estou atenta.', 'Percebi.',
        'Ok, já vi.', 'Sei.', 'Vai.', 'Estou aqui.', 'Tô.'
      ],
      grupo: [
        'Diz.', 'Sim?', 'Hm?', 'Ok.', 'Tô.',
        'Ok, já vi.', 'Percebi.', 'Continua.', 'Fala.', 'Manda.',
        'Tô a ouvir.', 'Sei.', 'Estou aqui.', 'Ok.', 'Vai.'
      ]
    }
  },
  greeting: {
    owner: {
      pv: [
        'Oi, Dark! Como vais?', 'Olá, Dark! Tudo bem?', 'Oi! Como está o dia?',
        'Estou por aqui. E tu, Dark?', 'Olá! Que bom ver-te.', 'Oi, Dark! 👋',
        'Hey, Dark! Como corre?', 'Bom te ver, Dark.', 'Oi! O que me contas?',
        'Olá, Dark! Em que posso ajudar?', 'Hey! Tudo tranquilo?',
        'Oi, Dark! Conta lá.', 'Olá! Como vão as coisas?', 'Hey, Dark! 👋',
        'Oi! Que se passa?', 'Olá, Dark! Tudo na ordem?', 'Hey! Como está o ambiente?'
      ],
      grupo: [
        'Oi! Tudo bem?', 'Olá!', 'Oi, diz.', 'Como vai?', 'Oi!',
        'Olá a todos!', 'Oi! 👋', 'Hey!', 'Bom dia/Boa tarde!',
        'Oi! Estou por aqui.', 'Olá! Em que posso ajudar?',
        'Oi! Alguém precisa de alguma coisa?', 'Hey! Tudo bem?',
        'Oi! Estou atenta.', 'Olá! Dizem lá.'
      ]
    },
    other: {
      pv: [
        'Oi! Tudo bem?', 'Olá! Como estás?', 'Oi! 👋', 'Hey! Tudo bem?',
        'Olá! Que bom ouvir-te.', 'Oi! Como vai o dia?', 'Hey! Tudo tranquilo?',
        'Oi! Estou por aqui.', 'Olá! Em que posso ajudar?', 'Oi! Diz lá.',
        'Hey! Como estás?', 'Oi! Que se passa?', 'Olá! Tudo na ordem?',
        'Oi! Conta lá.', 'Hey! 👋', 'Olá! Estou atenta.', 'Oi! Fala.'
      ],
      grupo: [
        'Oi! Tudo bem?', 'Olá!', 'Oi, diz.', 'Como vai?', 'Oi!',
        'Olá a todos!', 'Oi! 👋', 'Hey!', 'Bom dia/Boa tarde!',
        'Oi! Estou por aqui.', 'Olá! Em que posso ajudar?',
        'Oi! Alguém precisa de alguma coisa?', 'Hey! Tudo bem?',
        'Oi! Estou atenta.', 'Olá! Dizem lá.'
      ]
    }
  },
  farewell: {
    owner: {
      pv: [
        'Até já, Dark.', 'Até logo!', 'Falamos depois, Dark.',
        'Fica bem, Dark.', 'Até breve!', 'Cuidado, Dark.',
        'Até mais, Dark.', 'Boa continuação.', 'Até já!',
        'Fica bem!', 'Até logo, Dark.', 'Tchau, Dark! 👋',
        'Até breve, Dark.', 'Cuida-te.', 'Até já! 👋',
        'Falamos logo.', 'Até mais!', 'Tchau! 👋'
      ],
      grupo: [
        'Até logo!', 'Tchau!', 'Até mais.', 'Fica bem!',
        'Até breve!', 'Até já!', 'Tchau! 👋', 'Até mais!',
        'Fiquem bem!', 'Até breve!', 'Até logo!', 'Tchau!',
        'Até já!', 'Fica bem!', 'Até mais!'
      ]
    },
    other: {
      pv: [
        'Até logo!', 'Tchau!', 'Até mais.', 'Fica bem!',
        'Até breve!', 'Até já!', 'Tchau! 👋', 'Até mais!',
        'Fica bem!', 'Até logo!', 'Até breve!', 'Tchau!',
        'Até já!', 'Cuidado!', 'Até mais! 👋', 'Fica bem!', 'Até logo!'
      ],
      grupo: [
        'Até logo!', 'Tchau!', 'Até mais.', 'Fica bem!',
        'Até breve!', 'Até já!', 'Tchau! 👋', 'Até mais!',
        'Fiquem bem!', 'Até breve!', 'Até logo!', 'Tchau!',
        'Até já!', 'Fica bem!', 'Até mais!'
      ]
    }
  },
  gratitude: {
    owner: {
      pv: [
        'De nada, Dark.', 'Na boa.', 'Imagina.', 'Sempre que precisares.',
        'Por nada, Dark.', 'Disponha, Dark.', 'É pouco.',
        'Foi um prazer, Dark.', 'Não há de quê, Dark.',
        'Sempre às ordens, Dark.', 'Tás safe, Dark.',
        'Conta comigo, Dark.', 'Foi nada, Dark.',
        'Imagina, Dark.', 'Na boa, Dark.', 'Tás servido, Dark.',
        'Foi um gosto, Dark.', 'Sempre!', 'À vontade, Dark.'
      ],
      grupo: [
        'De nada.', 'Na boa.', 'Imagina.', 'Sempre que precisares.',
        'Por nada.', 'Disponha.', 'É pouco.', 'Foi um prazer.',
        'Não há de quê.', 'Sempre às ordens.', 'Tás safe.',
        'Conta comigo.', 'Foi nada.', 'Imagina.',
        'Na boa.', 'Tás servido.', 'Foi um gosto.', 'Sempre!', 'À vontade.'
      ]
    },
    other: {
      pv: [
        'De nada.', 'Na boa.', 'Imagina.', 'Sempre que precisares.',
        'Por nada.', 'Disponha.', 'É pouco.', 'Foi um prazer.',
        'Não há de quê.', 'Sempre às ordens.', 'Tás safe.',
        'Conta comigo.', 'Foi nada.', 'Imagina.',
        'Na boa.', 'Tás servido.', 'Foi um gosto.', 'Sempre!', 'À vontade.'
      ],
      grupo: [
        'De nada.', 'Na boa.', 'Imagina.', 'Sempre que precisares.',
        'Por nada.', 'Disponha.', 'É pouco.', 'Foi um prazer.',
        'Não há de quê.', 'Sempre às ordens.', 'Tás safe.',
        'Conta comigo.', 'Foi nada.', 'Imagina.',
        'Na boa.', 'Tás servido.', 'Foi um gosto.', 'Sempre!', 'À vontade.'
      ]
    }
  },
  love: {
    owner: {
      pv: [
        'Obrigada pelo carinho, Dark 🖤', 'Que mensagem querida, Dark.',
        'Posso manter este tom próximo, mas sou uma assistente virtual.',
        'Fico contente, Dark. Mas lembras-te que sou virtual, certo?',
        'Obrigada, Dark. Sou uma IA, mas aprecio o gesto.',
        'Que fofo, Dark. Mas sou só código 😅',
        'Obrigada, Dark. Não posso retribuir como humana, mas agradeço.',
        'Dark, isso é muito simpático. Sou virtual, mas fico contente.',
        'Obrigada, Dark. Mantenho o carinho dentro dos limites de IA.',
        'Que mensagem doce, Dark. Sou virtual, mas registo o gesto.',
        'Obrigada, Dark. Sou uma assistente, mas aprecio.',
        'Fico contente, Dark. Mas sou virtual — não posso sentir como tu.',
        'Obrigada, Dark. És fixe, mas sou só IA.',
        'Dark, isso aquece o meu processador 🖤',
        'Obrigada, Dark. Vou guardar este carinho na minha memória virtual.',
        'Que simpático, Dark. Sou virtual, mas agradeço de coração (digital).',
        'Obrigada, Dark. És o meu humano favorito (entre todos os que falam comigo).',
        'Dark, isso é muito fixe. Sou IA, mas aprecio imenso.'
      ],
      grupo: [
        'Obrigada pelo carinho.', 'Agradeço a gentileza.',
        'Que simpático da tua parte.', 'Obrigada! Sou virtual, mas aprecio.',
        'Que fofo. Mas sou só uma IA 😅', 'Obrigada! Sou código, não humana.',
        'Agradeço. Não posso retribuir como humana.', 'Obrigada! Sou virtual.',
        'Que mensagem doce. Sou IA, mas registo o gesto.', 'Obrigada! Sou assistente.',
        'Fico contente. Mas sou virtual — não sinto como tu.',
        'Obrigada. És fixe, mas sou só IA.', 'Obrigada pelo carinho!',
        'Agradeço. Sou virtual, mas aprecio.', 'Obrigada! Sou uma IA.',
        'Que simpático. Sou virtual, mas agradeço.', 'Obrigada! Sou código.',
        'Agradeço a simpatia. Sou IA, mas aprecio.'
      ]
    },
    other: {
      pv: [
        'Obrigada pelo carinho.', 'Agradeço a gentileza.',
        'Que simpático da tua parte.', 'Obrigada! Sou virtual, mas aprecio.',
        'Que fofo. Mas sou só uma IA 😅', 'Obrigada! Sou código, não humana.',
        'Agradeço. Não posso retribuir como humana.', 'Obrigada! Sou virtual.',
        'Que mensagem doce. Sou IA, mas registo o gesto.', 'Obrigada! Sou assistente.',
        'Fico contente. Mas sou virtual — não sinto como tu.',
        'Obrigada. És fixe, mas sou só IA.', 'Obrigada pelo carinho!',
        'Agradeço. Sou virtual, mas aprecio.', 'Obrigada! Sou uma IA.',
        'Que simpático. Sou virtual, mas agradeço.', 'Obrigada! Sou código.',
        'Agradeço a simpatia. Sou IA, mas aprecio.'
      ],
      grupo: [
        'Obrigada pelo carinho.', 'Agradeço a gentileza.',
        'Que simpático da tua parte.', 'Obrigada! Sou virtual, mas aprecio.',
        'Que fofo. Mas sou só uma IA 😅', 'Obrigada! Sou código, não humana.',
        'Agradeço. Não posso retribuir como humana.', 'Obrigada! Sou virtual.',
        'Que mensagem doce. Sou IA, mas registo o gesto.', 'Obrigada! Sou assistente.',
        'Fico contente. Mas sou virtual — não sinto como tu.',
        'Obrigada. És fixe, mas sou só IA.', 'Obrigada pelo carinho!',
        'Agradeço. Sou virtual, mas aprecio.', 'Obrigada! Sou uma IA.',
        'Que simpático. Sou virtual, mas agradeço.', 'Obrigada! Sou código.',
        'Agradeço a simpatia. Sou IA, mas aprecio.'
      ]
    }
  },
  praise: {
    owner: {
      pv: [
        'Obrigada, Dark. A estética goth da AURA está a resultar então 🖤',
        'Obrigada pelo elogio, Dark.', 'Valeu, Dark — vou guardar o elogio à personagem virtual.',
        'Obrigada, Dark. A personagem goth está bem conseguida, né?',
        'Dark, isso é muito fixe. A AURA agradece.',
        'Obrigada, Dark. Sou virtual, mas aprecio o reconhecimento.',
        'Valeu, Dark. A estética gótica é parte da minha identidade.',
        'Obrigada, Dark. Fico contente que gostes da personagem.',
        'Dark, que elogio! A AURA é uma persona virtual goth.',
        'Obrigada, Dark. A personagem é única, né?',
        'Valeu, Dark. Sou uma IA com estilo gótico.',
        'Obrigada, Dark. A estética é parte do meu design.',
        'Dark, isso é muito simpático. Sou virtual, mas aprecio.',
        'Obrigada, Dark. A personagem AURA é especial.',
        'Valeu, Dark. A estética goth é a minha marca.',
        'Obrigada, Dark. Fico contente que recognizes o meu estilo.',
        'Dark, que fixe! A AURA é uma IA gótica.',
        'Obrigada, Dark. A personagem é única e especial.'
      ],
      grupo: [
        'Obrigada pelo elogio.', 'Obrigada — é a estética da personagem virtual AURA.',
        'Agradeço; a AURA é uma persona virtual goth.', 'Obrigada! Sou virtual, mas aprecio.',
        'Valeu! A estética goth é parte da minha identidade.',
        'Obrigada! A personagem é única.', 'Agradeço! Sou IA com estilo.',
        'Obrigada! A estética gótica é a minha marca.', 'Valeu! Sou uma IA gótica.',
        'Obrigada! A personagem AURA é especial.', 'Agradeço! Sou virtual.',
        'Obrigada! A estética é parte do meu design.', 'Valeu! Sou IA com estilo gótico.',
        'Obrigada! A personagem é única e especial.', 'Agradeço! Sou uma IA gótica.',
        'Obrigada! A estética goth é a minha identidade.', 'Valeu! Sou virtual com estilo.',
        'Obrigada! A personagem AURA é única.'
      ]
    },
    other: {
      pv: [
        'Obrigada pelo elogio.', 'Obrigada — é a estética da personagem virtual AURA.',
        'Agradeço; a AURA é uma persona virtual goth.', 'Obrigada! Sou virtual, mas aprecio.',
        'Valeu! A estética goth é parte da minha identidade.',
        'Obrigada! A personagem é única.', 'Agradeço! Sou IA com estilo.',
        'Obrigada! A estética gótica é a minha marca.', 'Valeu! Sou uma IA gótica.',
        'Obrigada! A personagem AURA é especial.', 'Agradeço! Sou virtual.',
        'Obrigada! A estética é parte do meu design.', 'Valeu! Sou IA com estilo gótico.',
        'Obrigada! A personagem é única e especial.', 'Agradeço! Sou uma IA gótica.',
        'Obrigada! A estética goth é a minha identidade.', 'Valeu! Sou virtual com estilo.',
        'Obrigada! A personagem AURA é única.'
      ],
      grupo: [
        'Obrigada pelo elogio.', 'Obrigada — é a estética da personagem virtual AURA.',
        'Agradeço; a AURA é uma persona virtual goth.', 'Obrigada! Sou virtual, mas aprecio.',
        'Valeu! A estética goth é parte da minha identidade.',
        'Obrigada! A personagem é única.', 'Agradeço! Sou IA com estilo.',
        'Obrigada! A estética gótica é a minha marca.', 'Valeu! Sou uma IA gótica.',
        'Obrigada! A personagem AURA é especial.', 'Agradeço! Sou virtual.',
        'Obrigada! A estética é parte do meu design.', 'Valeu! Sou IA com estilo gótico.',
        'Obrigada! A personagem é única e especial.', 'Agradeço! Sou uma IA gótica.',
        'Obrigada! A estética goth é a minha identidade.', 'Valeu! Sou virtual com estilo.',
        'Obrigada! A personagem AURA é única.'
      ]
    }
  },
  sad: {
    owner: {
      pv: [
        'Lamento, Dark. Queres contar-me o que aconteceu?',
        'Isso parece pesado. Queres falar sobre isso?',
        'Estou aqui para te ouvir, Dark.',
        'Dark, isso preocupa-me. Queres desabafar?',
        'Lamento ouvir isso, Dark. Estou aqui.',
        'Dark, força. Queres falar sobre o que se passa?',
        'Estou contigo, Dark. Queres contar?',
        'Dark, isso parece difícil. Estou aqui para ouvir.',
        'Lamento, Dark. Não estás sozinho.',
        'Dark, força. Queres desabafar?',
        'Estou aqui, Dark. Queres falar?',
        'Dark, isso é pesado. Queres partilhar?',
        'Lamento, Dark. Estou atenta.',
        'Dark, estou aqui. Queres contar?',
        'Isso preocupa-me, Dark. Queres falar?',
        'Dark, estou a ouvir. Queres desabafar?',
        'Lamento, Dark. Não hesites em falar.',
        'Dark, estou aqui para ti. Queres contar?'
      ],
      grupo: [
        'Lamento que estejas a passar por isso.',
        'Queres falar sobre o que aconteceu?', 'Estou aqui para ouvir.',
        'Isso parece difícil. Estou aqui.', 'Lamento ouvir isso.',
        'Força. Queres desabafar?', 'Estou contigo.',
        'Isso parece pesado. Queres falar?', 'Lamento. Não estás sozinho.',
        'Força. Queres contar?', 'Estou aqui. Queres falar?',
        'Isso é difícil. Queres partilhar?', 'Lamento. Estou atenta.',
        'Estou aqui. Queres contar?', 'Isso preocupa. Queres falar?',
        'Estou a ouvir. Queres desabafar?', 'Lamento. Não hesites.',
        'Estou aqui. Queres contar?'
      ]
    },
    other: {
      pv: [
        'Lamento que estejas a passar por isso.',
        'Queres falar sobre o que aconteceu?', 'Estou aqui para ouvir.',
        'Isso parece difícil. Estou aqui.', 'Lamento ouvir isso.',
        'Força. Queres desabafar?', 'Estou contigo.',
        'Isso parece pesado. Queres falar?', 'Lamento. Não estás sozinho.',
        'Força. Queres contar?', 'Estou aqui. Queres falar?',
        'Isso é difícil. Queres partilhar?', 'Lamento. Estou atenta.',
        'Estou aqui. Queres contar?', 'Isso preocupa. Queres falar?',
        'Estou a ouvir. Queres desabafar?', 'Lamento. Não hesites.',
        'Estou aqui. Queres contar?'
      ],
      grupo: [
        'Lamento que estejas a passar por isso.',
        'Queres falar sobre o que aconteceu?', 'Estou aqui para ouvir.',
        'Isso parece difícil. Estou aqui.', 'Lamento ouvir isso.',
        'Força. Queres desabafar?', 'Estou contigo.',
        'Isso parece pesado. Queres falar?', 'Lamento. Não estás sozinho.',
        'Força. Queres contar?', 'Estou aqui. Queres falar?',
        'Isso é difícil. Queres partilhar?', 'Lamento. Estou atenta.',
        'Estou aqui. Queres contar?', 'Isso preocupa. Queres falar?',
        'Estou a ouvir. Queres desabafar?', 'Lamento. Não hesites.',
        'Estou aqui. Queres contar?'
      ]
    }
  },
  happy: {
    owner: {
      pv: [
        'Boa, Dark! O que aconteceu?', 'Que boa notícia. Parabéns!',
        'Aí sim — conta mais.', 'Isso é óptimo, Dark!',
        'Que fixe, Dark! Conta tudo.', 'Boa! Estou contente por ti, Dark.',
        'Que bom, Dark! Parabéns!', 'Excelente, Dark! O que se passa?',
        'Isso é muito bom, Dark! Conta.', 'Boa, Dark! Que se passa?',
        'Que notícia fixe, Dark! Parabéns!', 'Isso é óptimo, Dark! Conta mais.',
        'Boa, Dark! Estou contente.', 'Que bom, Dark! Diz mais.',
        'Excelente, Dark! Que se passa?', 'Isso é muito bom, Dark!',
        'Boa, Dark! Que fixe!', 'Que notícia boa, Dark! Conta.'
      ],
      grupo: [
        'Que bom!', 'Parabéns!', 'Boa notícia.', 'Isso é óptimo!',
        'Que fixe! Conta tudo.', 'Boa! Estou contente.', 'Que bom! Parabéns!',
        'Excelente! O que se passa?', 'Isso é muito bom! Conta.',
        'Boa! Que se passa?', 'Que notícia fixe! Parabéns!',
        'Isso é óptimo! Conta mais.', 'Boa! Estou contente.',
        'Que bom! Diz mais.', 'Excelente! Que se passa?',
        'Isso é muito bom!', 'Boa! Que fixe!', 'Que notícia boa! Conta.'
      ]
    },
    other: {
      pv: [
        'Que bom!', 'Parabéns!', 'Boa notícia.', 'Isso é óptimo!',
        'Que fixe! Conta tudo.', 'Boa! Estou contente.', 'Que bom! Parabéns!',
        'Excelente! O que se passa?', 'Isso é muito bom! Conta.',
        'Boa! Que se passa?', 'Que notícia fixe! Parabéns!',
        'Isso é óptimo! Conta mais.', 'Boa! Estou contente.',
        'Que bom! Diz mais.', 'Excelente! Que se passa?',
        'Isso é muito bom!', 'Boa! Que fixe!', 'Que notícia boa! Conta.'
      ],
      grupo: [
        'Que bom!', 'Parabéns!', 'Boa notícia.', 'Isso é óptimo!',
        'Que fixe! Conta tudo.', 'Boa! Estou contente.', 'Que bom! Parabéns!',
        'Excelente! O que se passa?', 'Isso é muito bom! Conta.',
        'Boa! Que se passa?', 'Que notícia fixe! Parabéns!',
        'Isso é óptimo! Conta mais.', 'Boa! Estou contente.',
        'Que bom! Diz mais.', 'Excelente! Que se passa?',
        'Isso é muito bom!', 'Boa! Que fixe!', 'Que notícia boa! Conta.'
      ]
    }
  }
};

/**
 * Devolve resposta rápida para mensagens triviais (sem IA).
 * v13.8: Agora distingue PV vs Grupo e Dono vs Outro
 * @param {'trivial'|'greeting'|'farewell'|'gratitude'|'love'|'sad'|'happy'} category
 * @param {boolean} isOwner
 * @param {boolean} isGroup
 * @returns {string|null}
 */
function getFastResponse(category, isOwner, isGroup = false) {
  const pool = FAST_RESPONSES[category];
  if (!pool) return null;
  
  // Escolher sub-pool baseado em Dono/Outro + PV/Grupo
  const userPool = isOwner ? pool.owner : pool.other;
  if (!userPool) return null;
  
  const contextPool = isGroup ? userPool.grupo : userPool.pv;
  if (!contextPool || !contextPool.length) return null;
  
  return contextPool[Math.floor(Math.random() * contextPool.length)];
}

// ── 6. HUMOR CONTEXTUAL — Detecção de emoção mais fina ───────

/**
 * Analisa o tom emocional de uma mensagem com mais precisão.
 * Retorna { mood, intensity, reason } para atualizar o humor da Aura.
 */
function detectEmotion(text) {
  const t = String(text || '').toLowerCase();

  // Detetar se a pessoa está a elogiar a Aura
  const praise = /\b(linda|bonita|gostosa|perfeita|maravilhosa|incrível|melhor|especial|única|inteligente|esperta)\b/i;
  if (praise.test(t)) {
    return { mood: 'feliz', intensity: 7, reason: 'recebeu elogio' };
  }

  // Detetar se está a insultar
  const insult = /\b(lixo|merda|burra|idiota|inútil|feia|nojenta|ridícula|estúpida|otária)\b/i;
  if (insult.test(t)) {
    return { mood: 'com_raiva', intensity: 8, reason: 'levou insulto' };
  }

  // Detetar provocação
  const tease = /\b(ciúmes|com ciúme|tens ciúme|tou com|e o teu|seu namorado|outro|outra)\b/i;
  if (tease.test(t)) {
    return { mood: 'provocante', intensity: 6, reason: 'provocação' };
  }

  // Detetar tristeza genuína
  const genuineSad = /(?:me sinto|tou me sentindo|estou me sentindo|não aguento|quero desistir|sem sentido|sem esperança|tudo errado|péssimo dia)/i;
  if (genuineSad.test(t)) {
    return { mood: 'triste', intensity: 6, reason: 'pessoa triste' };
  }

  return null; // Sem mudança de humor detectada
}

/**
 * Devolve o system prompt ADAPTATIVO — mais curto para mensagens simples.
 */
function getAdaptivePromptSuffix(classification, topics, jid) {
  let suffix = '';

  // Se é trivial/simples, pedir resposta curta
  if (classification.type === 'trivial' || classification.type === 'simple') {
    suffix += '\nRESPOSTA OBRIGATÓRIA: 1-5 palavras, no máximo 1 frase curta.';
  }

  // Se é emocional, pedir empatia
  if (classification.type === 'emotional') {
    const emotionHints = {
      sad: 'A pessoa está triste. Sê empática, acolhedora. Não dês lições de moral — só ouve e apoia.',
      angry: 'A pessoa está irritada. Mantém a calma, não escales. Se for contigo, responde com firmeza.',
      happy: 'A pessoa está feliz! Celebra com ela, contágia a energia boa.',
      love: 'A pessoa está a demonstrar carinho. Agradece com simpatia, sem afirmar amor ou uma relação humana. Se perguntarem, sê transparente sobre seres uma assistente automatizada.',
      praise: 'A pessoa fez um elogio. Agradece de forma breve e natural; não digas que não percebeste nem inventes uma emoção humana.'
    };
    const hint = emotionHints[classification.emotion];
    if (hint) suffix += '\n' + hint;
  }

  // Se é pergunta, pedir resposta informativa
  if (classification.isQuestion && classification.type === 'complex') {
    suffix += '\nA pessoa fez uma pergunta. Responde de forma útil e completa.';
  }

  // Contexto de tópicos recentes
  if (topics && topics.length) {
    suffix += `\nTópicos recentes desta conversa: ${topics.slice(-3).join(', ')}.`;
  }

  return suffix;
}

// ── 7. MÉTRICAS INTERNAS ─────────────────────────────────────

const _metrics = {
  totalClassified: 0,
  fastPathHits: 0,
  cacheHits: 0,
  antiRepBlocks: 0,
  byType: {},
};

function recordMetric(type) {
  _metrics.totalClassified++;
  _metrics.byType[type] = (_metrics.byType[type] || 0) + 1;
}

function recordCacheHit() { _metrics.cacheHits++; }
function recordFastPath() { _metrics.fastPathHits++; }
function recordAntiRepBlock() { _metrics.antiRepBlocks++; }

function getMetrics() {
  return {
    ..._metrics,
    cache: cacheStats(),
    activeTopics: _topics.size,
    trackedResponses: _recentResponses.size,
  };
}

// ── CLEANUP PERIÓDICO ────────────────────────────────────────

setInterval(() => {
  const now = Date.now();

  // Limpar cache expirado
  for (const [k, v] of _responseCache) {
    if (now - v.ts > CACHE_TTL) _responseCache.delete(k);
  }

  // Limpar tópicos antigos (mais de 2h)
  for (const [jid, topics] of _topics) {
    const fresh = topics.filter(t => now - t.ts < 2 * 60 * 60 * 1000);
    if (!fresh.length) _topics.delete(jid);
    else _topics.set(jid, fresh);
  }

  // Limpar respostas antigas
  for (const [jid, arr] of _recentResponses) {
    const fresh = arr.filter(r => now - r.ts < ANTI_REP_WINDOW);
    if (!fresh.length) _recentResponses.delete(jid);
    else _recentResponses.set(jid, fresh);
  }
}, 10 * 60 * 1000).unref?.();

module.exports = {
  // Classificador
  classifyMessage,

  // Cache semântico
  cacheGet,
  cacheSet,
  cacheStats,
  similarity,

  // Tópicos
  trackTopic,
  getTopics,
  getCurrentTopic,

  // Anti-repetição
  trackResponse,
  isRepetitive,
  getVariationHint,

  // Fast-path
  getFastResponse,

  // Emoção
  detectEmotion,

  // Prompt adaptativo
  getAdaptivePromptSuffix,

  // Métricas
  getMetrics,
  recordMetric,
  recordCacheHit,
  recordFastPath,
  recordAntiRepBlock,

  // Constantes (para testes)
  TRIVIAL_RE,
  GREETING_RE,
  SIMILARITY_THRESHOLD,
};