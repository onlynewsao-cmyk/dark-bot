/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — Portal 18+ v3 ULTRA                            ║
 * ║   Sistema completo de conteúdo adulto owner-only            ║
 * ║   Todas as APIs são gratuitas, sem key, sem cadastro        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ⚠️  RESTRITO: apenas dono principal (isPrimaryOwner)
 * ⚠️  Todo o conteúdo é enviado EXCLUSIVAMENTE no PV do dono
 * ⚠️  Protecção legal: bloqueia termos de menores, violência, etc.
 *
 * APIs GRATUITAS USADAS:
 *  📸 Imagens:  yande.re | konachan.com | e621.net | nekos.life
 *  🎬 Vídeos:   via query personalizada na API do dono (configurável)
 *  📚 Livros:   OpenLibrary | Gutendex (Project Gutenberg)
 *  🔍 Busca:    yande.re tags | konachan tags | e621 tags
 *  💬 ChatHot:  Groq / Gemini / fallback local
 *
 * COMANDOS (todos owner-only, só no PV do dono):
 *  !cmdsocultos        — menu do portal
 *  !adultmode on/off   — liga/desliga o portal
 *  !hentai [tags]      — imagem hentai aleatória
 *  !ximg [tags]        — imagem adulta por tags
 *  !xvideo [termo]     — vídeo via API configurável
 *  !adultsearch [tags] — busca múltiplas imagens
 *  !adultapi <url>     — configura API de vídeo externa
 *  !hotchat [tema]     — chat adulto com IA
 *  !buscalivro [nome]  — busca livros adultos/romance
 *  !livro <id>         — link de download do livro
 *  !livros18           — livros 18+ populares
 */

const mediaHandler = require('./mediaHandler');
const config       = require('../config');
const BotConfig    = require('../database/models/BotConfig');
const botConfigCache = require('./botConfigCache');
const ai           = require('./ai');

// ─────────────────────────────────────────────
// SEGURANÇA — listas de termos bloqueados
// ─────────────────────────────────────────────
const BLOCKED_TERMS = /\b(menor|menores|criança|crianca|infantil|kid|kids|child|children|underage|loli|lolita|shota|teen|colegial|schoolgirl|schoolboy|incesto|incest|rape|forced|forçado|forcada|abuso|abuse|abus|zoo|zoofilia|animal|bestiality|snuff|gore|blood|morto|dead|murder)\b/i;

function isBlocked(q = '') {
  return BLOCKED_TERMS.test(String(q || ''));
}

function cleanQuery(q = '') {
  return String(q || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

// ─────────────────────────────────────────────
// OWNER PV — envia exclusivamente no PV do dono
// ─────────────────────────────────────────────
async function ownerPv(sock, payload) {
  const num = String(config.owner.number || '').replace(/\D/g, '');
  if (!num) return;
  const jid = `${num}@s.whatsapp.net`;
  return sock.sendMessage(jid, payload).catch(e => {
    console.warn('[Portal18] ownerPv falhou:', e.message);
  });
}

// ─────────────────────────────────────────────
// HELPER — paginação aleatória
// ─────────────────────────────────────────────
function randPage(max = 300) {
  return Math.ceil(Math.random() * max);
}

// ─────────────────────────────────────────────
// HELPER — extrai URLs de imagem de objectos JSON aninhados
// ─────────────────────────────────────────────
function extractImageUrls(obj, max = 6) {
  const out = [];
  function walk(x) {
    if (out.length >= max) return;
    if (!x) return;
    if (typeof x === 'string') {
      if (/^https?:\/\//i.test(x) && /\.(jpe?g|png|webp|gif|mp4|webm)(?:[?#]|$)/i.test(x)) {
        out.push(x);
      }
      return;
    }
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (typeof x === 'object') {
      const keys = ['file_url', 'jpeg_url', 'sample_url', 'large_file_url', 'url', 'image_url', 'src', 'link', 'download'];
      for (const k of keys) { if (x[k]) walk(x[k]); }
      for (const v of Object.values(x)) {
        if (typeof v === 'object') walk(v);
      }
    }
  }
  walk(obj);
  return [...new Set(out)].slice(0, max);
}

// ─────────────────────────────────────────────
// SAFE FETCH JSON
// ─────────────────────────────────────────────
async function fetchJ(url, timeoutMs = 15000) {
  return mediaHandler.fetchJson(url, timeoutMs);
}

// ─────────────────────────────────────────────
// FONTE 1 — yande.re (imagens Anime adulto)
// ─────────────────────────────────────────────
async function yandeImages(tags = 'nude', count = 3) {
  const safeTags = (tags || 'nude')
    .replace(/loli|shota|child|minor/gi, '')
    .trim() + ' -loli -shota -cub';
  const page = randPage(400);
  const url = `https://yande.re/post.json?limit=${count + 2}&tags=${encodeURIComponent(safeTags.trim())}&page=${page}`;
  const data = await fetchJ(url);
  if (!Array.isArray(data) || !data.length) throw new Error('Sem resultados no yande.re');
  return data.slice(0, count).map(p => ({
    url: p.file_url || p.jpeg_url || p.sample_url || '',
    tags: (p.tags || '').split(' ').slice(0, 6).join(', '),
    score: p.score || 0,
    source: 'yande.re',
  })).filter(p => p.url);
}

// ─────────────────────────────────────────────
// FONTE 2 — konachan.com (imagens Anime adulto)
// ─────────────────────────────────────────────
async function konachanImages(tags = 'nude', count = 3) {
  const safeTags = (tags || 'nude')
    .replace(/loli|shota|child|minor/gi, '')
    .trim() + ' -loli -shota';
  const page = randPage(500);
  const url = `https://konachan.com/post.json?limit=${count + 2}&tags=${encodeURIComponent(safeTags.trim())}&page=${page}`;
  const data = await fetchJ(url);
  if (!Array.isArray(data) || !data.length) throw new Error('Sem resultados no konachan.com');
  return data.slice(0, count).map(p => ({
    url: p.file_url || p.sample_url || p.preview_url || '',
    tags: (p.tags || '').split(' ').slice(0, 6).join(', '),
    score: p.score || 0,
    source: 'konachan.com',
  })).filter(p => p.url);
}

// ─────────────────────────────────────────────
// FONTE 3 — e621.net (furry/anthro adulto)
// ─────────────────────────────────────────────
async function e621Images(tags = 'rating:e', count = 3) {
  const safeTags = (tags || 'rating:e')
    .replace(/loli|cub|child|minor/gi, '')
    .trim() + ' -loli -cub -scat';
  const url = `https://e621.net/posts.json?tags=${encodeURIComponent(safeTags.trim())}+order:random&limit=${count + 2}`;
  const data = await fetchJ(url);
  const posts = data?.posts || [];
  if (!posts.length) throw new Error('Sem resultados no e621.net');
  return posts.slice(0, count).map(p => ({
    url: p.file?.url || '',
    tags: (p.tags?.general || []).slice(0, 6).join(', '),
    score: p.score?.total || 0,
    source: 'e621.net',
  })).filter(p => p.url);
}

// ─────────────────────────────────────────────
// FONTE 4 — nekos.life (SFW neko / lewd)
// ─────────────────────────────────────────────
const NEKOS_LIFE_TYPES = {
  sfw:  ['neko', 'kitsune', 'cuddle', 'kiss', 'hug', 'pat', 'feed', 'wink', 'dance', 'smug'],
  nsfw: ['lewd'],  // o que ainda funciona sem 500
};

async function nekosLifeImage(type = 'lewd') {
  const url = `https://nekos.life/api/v2/img/${type}`;
  const data = await fetchJ(url, 8000);
  if (!data?.url) throw new Error('nekos.life sem URL');
  return [{ url: data.url, tags: type, score: 0, source: 'nekos.life' }];
}

// ─────────────────────────────────────────────
// BUSCA MULTI-FONTE — tenta em cascata
// ─────────────────────────────────────────────
async function searchImages(tags = '', count = 3) {
  const safe = (tags || 'nude').replace(/loli|shota|child|minor/gi, '').trim();
  const sources = [
    () => yandeImages(safe, count),
    () => konachanImages(safe, count),
    () => e621Images(safe, count),
    () => nekosLifeImage('lewd'),
  ];
  for (const fn of sources) {
    try {
      const imgs = await fn();
      if (imgs?.length) return imgs;
    } catch {}
  }
  throw new Error('Todas as fontes de imagem falharam agora. Tente de novo.');
}

// ─────────────────────────────────────────────
// LIVROS — OpenLibrary + Gutendex
// ─────────────────────────────────────────────
async function searchBooks(query = '', count = 5) {
  const q = cleanQuery(query || 'romance erotic adult passion desire');

  // OpenLibrary
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${count + 3}&fields=title,author_name,key,cover_i,first_publish_year,subject`;
    const data = await fetchJ(url, 15000);
    if (data?.docs?.length) {
      return data.docs.slice(0, count).map(b => ({
        title:   b.title || 'Sem título',
        author:  b.author_name?.[0] || 'Desconhecido',
        year:    b.first_publish_year || '?',
        cover:   b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
        key:     b.key || '',
        link:    b.key ? `https://openlibrary.org${b.key}` : '',
        source:  'OpenLibrary',
      }));
    }
  } catch {}

  // Gutendex fallback
  try {
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(q)}&languages=en,pt`;
    const data = await fetchJ(url, 15000);
    if (data?.results?.length) {
      return data.results.slice(0, count).map(b => {
        const formats = b.formats || {};
        const link = formats['text/html'] || formats['application/epub+zip'] ||
                     formats['text/plain; charset=utf-8'] || formats['text/plain'] || '';
        return {
          title:  b.title || 'Sem título',
          author: b.authors?.[0]?.name || 'Desconhecido',
          year:   b.id || '?',
          cover:  null,
          key:    String(b.id || ''),
          link,
          source: 'Project Gutenberg',
        };
      });
    }
  } catch {}

  throw new Error('Não encontrei livros para: ' + q);
}

// Géneros de livros 18+
const BOOK_GENRES_18 = [
  'erotic romance desire passion', 'adult romance passionate love',
  'sensual adult fiction mature', 'romance forbidden love affair',
  'desire passion adult story', 'romance drama adult novels',
  'hot romance steamy fiction', 'mature adult love story',
];

async function popularBooks18(count = 6) {
  const genre = BOOK_GENRES_18[Math.floor(Math.random() * BOOK_GENRES_18.length)];
  return searchBooks(genre, count);
}

// ─────────────────────────────────────────────
// CHAT HOT — IA com prompt adulto
// ─────────────────────────────────────────────
const HOT_CHAT_SYSTEM = `Você é uma IA de entretenimento adulto 18+ para maiores de idade. Crie mensagens sensuais, picantes e provocantes em português. Seja elegante, sedutor e ousado. Nunca envolva menores, violência, conteúdo ilegal ou não-consensual. Responda sempre em português. Máx 200 palavras.`;

async function hotChatIA(tema = 'sedução', style = 'sensual') {
  const styles = {
    sensual: 'tom elegante e sedutor, provocante mas sofisticado',
    picante: 'tom ousado e directo, adulto e sem rodeios mas consensual',
    romantico: 'tom romântico e apaixonado, com tensão sexual',
    conto: 'em forma de conto curto/história adulta de 3 parágrafos',
    conversa: 'em forma de conversa/flerte adulto como se fosse uma pessoa real',
  };
  const styleDesc = styles[style] || styles.sensual;
  const prompt = `Escreva uma mensagem adulta 18+ com ${styleDesc}. Tema: "${tema}". Sem menores, sem violência, totalmente consensual.`;

  // Tenta IA configurada primeiro
  try {
    const out = await ai.chat(prompt, HOT_CHAT_SYSTEM);
    if (out && out.length > 20) return out;
  } catch {}

  // Fallback local — textos pré-feitos por categoria
  const fallbacks = {
    sensual: [
      `✨ Há momentos em que as palavras não conseguem descrever o que o olhar já confessou. Naquela noite, o ar entre nós era pesado de antecipação — cada gesto, cada susurro uma promessa silenciosa de algo inevitável...`,
      `🌙 A sedução não começa com o toque. Começa com aquele olhar que diz tudo sem pronunciar uma única sílaba. É o arrepio que percorre a espinha antes de qualquer contacto...`,
      `🥂 Entre o primeiro e o segundo copo de vinho, algo mudou. A conversa tornou-se mais lenta, os risos mais suaves, e a distância entre nós foi diminuindo de forma imperceptível mas absolutamente intencional...`,
    ],
    picante: [
      `🔥 Directo ao ponto: aquela noite foi intensa. Sem rodeios, sem fingimentos — apenas dois adultos que souberam exactamente o que queriam e não tiveram vergonha de o dizer...`,
      `💋 Às vezes o desejo é simples: é querer alguém completamente. É essa vontade crua e honesta que transforma uma noite comum em algo memorável...`,
    ],
    romantico: [
      `💕 A tensão acumulou-se ao longo de semanas. Cada mensagem, cada encontro casual onde os dedos se roçavam por acidente — nada era por acidente. E quando finalmente aconteceu, foi como respirar fundo depois de muito tempo sem ar...`,
    ],
  };
  const pool = fallbacks[style] || fallbacks.sensual;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─────────────────────────────────────────────
// VÍDEO — via API externa configurável pelo dono
// ─────────────────────────────────────────────
async function fetchAdultVideo(query = '', apiTpl = '') {
  if (!apiTpl || !apiTpl.includes('{query}')) {
    throw new Error('API de vídeo não configurada. Use: !adultapi <url com {query}>');
  }
  const url = apiTpl.replace(/\{query\}/g, encodeURIComponent(query));
  const data = await fetchJ(url, 20000);
  const urls = extractImageUrls(data, 4).filter(u => /\.(mp4|webm|mov)(?:[?#]|$)|video/i.test(u));
  if (!urls.length) throw new Error('API não retornou vídeos válidos.');
  return urls;
}

// ─────────────────────────────────────────────
// MENU DO PORTAL — card visual rico
// ─────────────────────────────────────────────
function portalMenuText(ownerName, enabled, apiConfigured, prefix) {
  const st = enabled ? '🟢 ACTIVO' : '🔴 DESATIVADO';
  const ap = apiConfigured ? '✅ configurada' : '⚠️ não configurada';
  return (
    `╔══〔 🕳️ PORTAL OCULTO 18+ 〕══╗\n` +
    `║  👑 Dono: *${ownerName}*\n` +
    `║  Status: *${st}*\n` +
    `║  API vídeo: *${ap}*\n` +
    `╠══════════════════════════╣\n` +
    `║  ⚠️ *18+ EXCLUSIVO — ADULTOS*\n` +
    `║  Só PV do Dono • Sem menores\n` +
    `║  Sem violência • Consensual\n` +
    `╠══════════════════════════╣\n` +
    `║  📸 *IMAGENS*\n` +
    `║  ${prefix}hentai [tags]    — anime adulto\n` +
    `║  ${prefix}ximg [tags]      — busca por tags\n` +
    `║  ${prefix}adultsearch [t]  — busca multi-fonte\n` +
    `╠══════════════════════════╣\n` +
    `║  🎬 *VÍDEOS*\n` +
    `║  ${prefix}xvideo [termo]   — busca vídeo\n` +
    `║  ${prefix}adultapi <url>   — configura API\n` +
    `╠══════════════════════════╣\n` +
    `║  💬 *CHAT HOT*\n` +
    `║  ${prefix}hotchat [tema]   — chat sensual\n` +
    `║  ${prefix}hotchat [t] picante  — mais ousado\n` +
    `║  ${prefix}hotchat [t] conto    — conto 18+\n` +
    `║  ${prefix}hotchat [t] conversa — flerte\n` +
    `╠══════════════════════════╣\n` +
    `║  📚 *LIVROS ADULTOS*\n` +
    `║  ${prefix}buscalivro [nome] — busca livros\n` +
    `║  ${prefix}livros18          — top 18+\n` +
    `╠══════════════════════════╣\n` +
    `║  ⚙️ *CONTROLO*\n` +
    `║  ${prefix}adultmode on/off  — liga/desliga\n` +
    `╚══════════════════════════╝`
  );
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  isBlocked,
  cleanQuery,
  ownerPv,
  yandeImages,
  konachanImages,
  e621Images,
  nekosLifeImage,
  searchImages,
  searchBooks,
  popularBooks18,
  hotChatIA,
  fetchAdultVideo,
  portalMenuText,
  NEKOS_LIFE_TYPES,
};
