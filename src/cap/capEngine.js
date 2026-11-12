/**
 * DARK BOT v7.30 — C∆P (Capture) ENGINE
 * ─────────────────────────────────────────────────────────────
 * Monitoriza perfis de redes sociais (fase 1: Instagram) e captura
 * automaticamente posts, reels, carrosséis, textos e stories.
 *
 *  • Alvos configuráveis (plataforma + username)
 *  • Verificação periódica (padrão 30 min) — só baixa o que é NOVO
 *  • Detecta se baixou ou não (tamanho, mimetype, erro) e regista log
 *  • Destinos: grupos/PV/canal do WhatsApp + galeria em disco
 *  • "Capture all": baixa tudo o que está disponível do perfil
 *  • Conteúdo público via SnapInsta, páginas/GraphQL públicas, yt-dlp e embed
 *  • Não recebe, guarda nem usa conta, senha, cookie ou sessão do Instagram
 *
 * Estado persistido em data/cap/cap.json (+ espelho em BotConfig quando
 * a BD está ligada). Só contém alvos, resultados e métricas públicas.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/cap');
const STATE_FILE = path.join(DATA_DIR, 'cap.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DEFAULT_INTERVAL_MIN = 30;
const MAX_LOG = 200;
const MAX_SEEN_PER_TARGET = 2000;

// ─────────────────────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────────────────────
const state = {
  targets: {},      // key "ig:veigh" → { platform, username, destinos:[jid], guardar, auto, intervaloMin, lastCheck, addedBy, addedAt, userId, stats }
  seen: {},         // key → { [itemId]: ts }
  log: [],          // { ts, target, item, tipo, status:'baixado'|'falhou'|'enviado'|'erro', detalhe }
};
let _loaded = false;

function ensureDir(p) { try { fs.mkdirSync(p, { recursive: true }); } catch {} }

function load() {
  if (_loaded) return state;
  _loaded = true;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Migração única: descarta qualquer estado de credenciais legado antes
      // de o estado voltar a ser usado ou salvo pelo modo público.
      const source = raw && typeof raw === 'object' ? raw : {};
      const hadLegacySession = Object.hasOwn(source, 'session');
      const { session: _legacySession, ...publicState } = source;
      Object.assign(state, { targets: {}, seen: {}, log: [] }, publicState);
      delete state.session;
      if (hadLegacySession) save();
    }
  } catch (e) { console.warn('[CAP] estado corrompido, a recomeçar:', e.message); }
  return state;
}

let _saveTimer = null;
function save() {
  ensureDir(DATA_DIR);
  state.UpdatedAt = Date.now();
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1)); } catch (e) { console.warn('[CAP] save:', e.message); }
  // espelho em BotConfig (best-effort, sem bloquear)
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      const BotConfig = require('../database/models/BotConfig');
      BotConfig.set('cap_state', { targets: state.targets, UpdatedAt: state.UpdatedAt }).catch(() => {});
    } catch {}
  }, 500);
}

async function arrancar() {
  load();
  await sincronizar(true);
  // Persiste a limpeza de campos de credenciais de instalações antigas.
  delete state.session;
  save();
  return state;
}

// ── v12.9.9: SYNC disco ↔ Mongo (o mais novo ganha) ─────────────────
// O dashboard e o bot podem correr em processos/containers diferentes;
// quem grava por último espelha em BotConfig e o outro lado adota.
let _syncAt = 0;
async function sincronizar(forcar = false) {
  if (!forcar && Date.now() - _syncAt < 60e3) return state;
  _syncAt = Date.now();
  try {
    const BotConfig = require('../database/models/BotConfig');
    const mirror = await BotConfig.get('cap_state', null);
    if (!mirror) return state;
    const tsM = Number(mirror.UpdatedAt || 0);
    const tsD = Number(state.UpdatedAt || 0);
    if (tsM > tsD && mirror.targets) {
      state.targets = mirror.targets || state.targets;
      // O espelho público só sincroniza os alvos, nunca credenciais legadas.
      delete state.session;
      state.UpdatedAt = tsM;
      try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1)); } catch {}
      console.log('[CAP] sync: adoptado estado mais novo da BD (', new Date(tsM).toISOString(), ')');
    }
  } catch {}
  return state;
}

function _reset() {
  state.targets = {}; state.seen = {}; state.log = [];
  delete state.session;
  _loaded = true;
}

// ─────────────────────────────────────────────────────────────
// HTTP
// ─────────────────────────────────────────────────────────────
// Proxy opcional: CAP_PROXY=http://user:pass@host:port (ou HTTPS_PROXY). Usado só para o Instagram.
let _proxyAgent = null; let _proxyTried = false;
function proxyAgent() {
  if (_proxyTried) return _proxyAgent; _proxyTried = true;
  const p = process.env.CAP_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy || '';
  if (!p) return null;
  try { const { HttpsProxyAgent } = require('https-proxy-agent'); _proxyAgent = new HttpsProxyAgent(p); console.log('[CAP] proxy activo'); }
  catch { console.warn('[CAP] CAP_PROXY definido mas pacote https-proxy-agent não instalado (npm i https-proxy-agent)'); }
  return _proxyAgent;
}
function httpReq(method, url, { headers = {}, timeout = 25000, redirects = 5, proxy = true, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const ag = proxy && /instagram\.com/.test(url) ? proxyAgent() : null;
    let u; try { u = new URL(url); } catch { return reject(new Error('URL inválida')); }
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { 'User-Agent': UA, ...headers, ...(body ? { 'Content-Type': headers['Content-Type'] || 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } : {}) },
      timeout, ...(ag ? { agent: ag } : {}),
    }, (res) => {
      if (method === 'GET' && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        res.resume();
        return httpReq('GET', next, { headers, timeout, redirects: redirects - 1 }).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}
function httpGet(url, opts = {}) { return httpReq('GET', url, opts); }

// Pedidos web públicos: não levam credenciais nem identificação de app.
const PUBLIC_IG_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Referer': 'https://www.instagram.com/',
};
function _rand(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

// ─────────────────────────────────────────────────────────────
// INSTAGRAM PROVIDER
// ─────────────────────────────────────────────────────────────
function normUser(u) { return String(u || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[\/?#].*$/, '').toLowerCase(); }

function nodeToItem(n, username) {
  const caption = n.edge_media_to_caption?.edges?.[0]?.node?.text || n.caption?.text || '';
  const ts = (n.taken_at_timestamp || n.taken_at || 0) * 1000;
  const medias = [];
  const children = n.edge_sidecar_to_children?.edges;
  if (children && children.length) {
    for (const { node: c } of children) medias.push({ url: c.is_video ? (c.video_url || c.display_url) : c.display_url, isVideo: !!c.is_video && !!c.video_url });
  } else if (n.carousel_media) {
    for (const c of n.carousel_media) {
      const v = c.video_versions?.[0]?.url; const i = c.image_versions2?.candidates?.[0]?.url;
      medias.push({ url: v || i, isVideo: !!v });
    }
  } else {
    const v = n.video_url || n.video_versions?.[0]?.url;
    const i = n.display_url || n.image_versions2?.candidates?.[0]?.url;
    medias.push({ url: v || i, isVideo: !!v });
  }
  const shortcode = n.shortcode || n.code || String(n.id || n.pk);
  const type = n.product_type === 'clips' || (medias.length === 1 && medias[0].isVideo) ? 'reel' : medias.length > 1 ? 'carrossel' : medias[0]?.isVideo ? 'video' : 'post';
  return {
    id: `p_${shortcode}`, shortcode, tipo: type, ts, caption,
    link: `https://www.instagram.com/p/${shortcode}/`,
    medias: medias.filter(m => m.url), username,
  };
}

// Pedido de recurso exposto na web pública, com retry curto apenas para
// indisponibilidade/rate-limit. Não alterna para endpoints de app ou sessão.
async function igGet(pathAndQuery, { tentativas = 2 } = {}) {
  let last = null;
  for (let i = 0; i < tentativas; i++) {
    const r = await httpGet(`https://www.instagram.com${pathAndQuery}`, {
      headers: { ...PUBLIC_IG_HEADERS, 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest' },
    });
    last = r;
    if (r.status === 200) return r;
    if (r.status === 429 && i + 1 < tentativas) {
      await new Promise(resolve => setTimeout(resolve, _rand(900, 1800)));
      continue;
    }
    return r;
  }
  return last;
}

// yt-dlp também é executado sem arquivo de cookies: só conteúdo público.
// ── v12.9.9: fallback EMBED (público, sem login) para .cap link ──
// https://www.instagram.com/p/<code>/embed/captioned/ traz a foto/vídeo
// mesmo quando a API e o yt-dlp estão bloqueados.
// ── v12.9.10: QUALQUER link do IG → mídia (a sessão vê dentro, o bot baixa) ──
// Aceita: /p/ /reel/ /reels/ /tv/ · /stories/<user>/<pk>/ · /stories/highlights/<rid>/
// e links de partilha: /share/…, /share_reel/…, ig.me/m/… (segue o redirect).
const IG_LINK_RE = /instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
const IG_STORY_RE = /instagram\.com\/stories\/([^/#?]+)\/([A-Za-z0-9_-]+)/i;
const IG_STORY_USER_RE = /instagram\.com\/stories\/([^/#?]+)\/?(?:[?#].*)?$/i;
const IG_HL_RE = /instagram\.com\/stories\/highlights\/([A-Za-z0-9_-]+)/i;

// SnapInsta é um fallback público para posts/reels e stories activos. Não
// recebe cookies nem credenciais do bot: apenas a URL pública consultada.
const SNAPINSTA_API = 'https://snapinsta.com.br/api/download.php';
function isInstagramPostUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && (host === 'instagram.com' || host.endsWith('.instagram.com'));
  } catch { return false; }
}
function isInstagramCdnUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && (host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net'));
  } catch { return false; }
}

async function storiesPublicas(usernameOrLink) {
  const raw = String(usernameOrLink || '').trim();
  const fromUrl = raw.match(/instagram\.com\/stories\/([^/?#]+)/i);
  const username = normUser(fromUrl?.[1] || raw);
  if (!/^[a-z0-9._]{1,30}$/i.test(username) || username.toLowerCase() === 'highlights') throw new Error('Utilizador Instagram inválido');
  const link = fromUrl ? raw : `https://www.instagram.com/stories/${username}/`;
  try {
    const medias = await snapInstaPublicMedias(link);
    if (medias.length) return { username, link, medias, source: 'snapinsta' };
  } catch (e) {
    throw new Error('SnapInsta: ' + e.message.slice(0, 100));
  }
  throw new Error('SnapInsta não devolveu stories públicos activos');
}

// O link CDN pode renovar a assinatura em cada consulta. O pathname identifica o
// story sem guardar um URL assinado nas chaves de monitoramento.
function publicStoryMediaId(username, media) {
  const crypto = require('crypto');
  let stableUrl = String(media?.url || '');
  try { stableUrl = new URL(stableUrl).pathname; } catch {}
  return crypto.createHash('sha1').update(`${String(username).toLowerCase()}|${stableUrl}`).digest('hex').slice(0, 24);
}

// A versão granular é usada pelo monitoramento: cada story tem uma chave
// estável e só os novos são enviados no próximo ciclo. O comando manual pode
// continuar a tratar todos como uma única captura através de storyPublicItem.
async function storiesPublicItems(usernameOrLink) {
  const pub = await storiesPublicas(usernameOrLink);
  const now = Date.now();
  return pub.medias.map((media, index) => ({
    id: `public_story_${pub.username}_${publicStoryMediaId(pub.username, media)}`,
    shortcode: `public_story_${pub.username}_${index + 1}`,
    tipo: 'story', ts: now, caption: '', link: pub.link,
    medias: [media], username: pub.username, source: pub.source,
  }));
}

async function storyPublicItem(usernameOrLink) {
  const pub = await storiesPublicas(usernameOrLink);
  const signature = pub.medias.map(media => publicStoryMediaId(pub.username, media)).join('|');
  const crypto = require('crypto');
  return {
    id: `public_story_${pub.username}_${crypto.createHash('sha1').update(signature).digest('hex').slice(0, 24)}`,
    shortcode: `public_story_${pub.username}`,
    tipo: 'story', ts: Date.now(), caption: '', link: pub.link,
    medias: pub.medias, username: pub.username, source: pub.source,
  };
}

async function resolverLink(link) {
  let url = String(link || '').trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
  // links de partilha (redirect 30x) → destino final
  if (/instagram\.com\/share|ig\.me\/m\//i.test(url)) {
    let atual = url;
    for (let i = 0; i < 4; i++) {
      const r = await httpGet(atual, { redirects: 0, timeout: 15000 }).catch(() => null);
      if (r?.headers?.location) { atual = r.headers.location.startsWith('http') ? r.headers.location : new URL(r.headers.location, atual).href; continue; }
      // alguns share links respondem 200 com meta-refresh/HTML — extrair o link canónico do corpo
      if (r?.status === 200) {
        const corpo = r.body?.toString('utf8') || '';
        const canon = corpo.match(/(?:og:url|canonical)[^>]*(?:content|href)="(https:[^"]+instagram\.com[^"]+)"/i)
          || corpo.match(/content="0;\s*url=(https:[^"]+instagram\.com[^"]+)"/i)
          || corpo.match(/"(https:\/\/www\.instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/)"/i);
        if (canon) { atual = canon[1].replace(/&amp;/g, '&'); continue; }
      }
      break;
    }
    url = atual;
  }
  let m = url.match(IG_HL_RE);
  if (m) return { tipo: 'highlight', id: m[1], url };
  m = url.match(IG_STORY_RE);
  if (m && m[1].toLowerCase() !== 'highlights') return { tipo: 'story', username: m[1], pk: m[2], url };
  m = url.match(IG_STORY_USER_RE);
  if (m && m[1].toLowerCase() !== 'highlights') return { tipo: 'story', username: m[1], pk: '', url };
  m = url.match(IG_LINK_RE);
  if (m) return { tipo: m[1].toLowerCase() === 'tv' ? 'post' : (m[1].toLowerCase() === 'p' ? 'post' : 'reel'), shortcode: m[2], url };
  return null;
}

// Resolve qualquer URL público suportado pelo SnapInsta. Não recebe cookies,
// sessão ou credenciais; as URLs retornadas precisam ser CDN HTTPS oficial.
async function snapInstaPublicMedias(link) {
  const value = String(link || '').trim();
  if (!isInstagramPostUrl(value)) throw new Error('SnapInsta aceita somente URL pública do Instagram');
  const body = JSON.stringify({ url: value });
  const response = await httpReq('POST', SNAPINSTA_API, {
    proxy: false,
    timeout: 45000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://snapinsta.com.br',
      'Referer': 'https://snapinsta.com.br/',
    },
    body,
  });
  if (response.status !== 200) throw new Error(`SnapInsta HTTP ${response.status}`);
  let data;
  try { data = JSON.parse(response.body.toString('utf8')); }
  catch { throw new Error('SnapInsta respondeu JSON inválido'); }
  if (data?.status !== true || !Array.isArray(data.media) || !data.media.length) {
    throw new Error('SnapInsta: ' + String(data?.message || 'mídia pública indisponível').slice(0, 120));
  }
  const medias = data.media.map((media) => {
    const url = String(media?.url || '');
    if (!isInstagramCdnUrl(url)) return null;
    const type = String(media?.fileType || '').toLowerCase();
    return { url, isVideo: type.startsWith('video/') || /\.mp4(?:\?|$)/i.test(url) };
  }).filter(Boolean);
  if (!medias.length) throw new Error('SnapInsta não devolveu mídia CDN válida');
  return medias;
}

// Item público sem sessão para post, reel ou highlight. Stories activos usam
// storiesPublicItems para manter uma chave individual por mídia.
async function snapInstaItem(link, resolved = null) {
  const info = resolved || await resolverLink(link);
  if (!info || !['post', 'reel', 'highlight'].includes(info.tipo) || !isInstagramPostUrl(info.url)) {
    throw new Error('SnapInsta aceita somente mídia pública do Instagram');
  }
  const medias = await snapInstaPublicMedias(info.url);
  const key = info.shortcode || info.id;

  return {
    id: `snap_${key}`,
    shortcode: info.shortcode || `highlight_${info.id}`,
    tipo: info.tipo,
    ts: 0,
    caption: '',
    link: info.url,
    medias,
    username: '',
    source: 'snapinsta',
  };
}

// O endpoint público também aceita o URL de uma conta. Ele entrega as
// mídias do perfil sem metadados de post; transformamo-las em itens estáveis
// para que .cap all, ultimo, reels e o monitoramento funcionem sem login.
function snapInstaMediaKey(media) {
  const crypto = require('crypto');
  let stable = String(media?.url || '');
  try { stable = new URL(stable).pathname; } catch {}
  return crypto.createHash('sha1').update(stable).digest('hex').slice(0, 24);
}
function snapInstaIsProfilePicture(media) {
  try { return /\/t51\.75761-19\//.test(new URL(String(media?.url || '')).pathname); }
  catch { return false; }
}
async function snapInstaProfile(username) {
  const u = normUser(username);
  if (!/^[a-z0-9._]{1,30}$/i.test(u)) throw new Error('Utilizador Instagram inválido');
  const link = `https://www.instagram.com/${u}/`;
  const seen = new Set();
  const medias = (await snapInstaPublicMedias(link)).filter(media => {
    if (snapInstaIsProfilePicture(media)) return false;
    const key = snapInstaMediaKey(media);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!medias.length) throw new Error('SnapInsta não devolveu posts públicos da conta');
  const now = Date.now();
  // O provider lista o mais recente primeiro. O motor C∆P usa a ordem antiga
  // → recente, então .ultimo e o limite de .all continuam coerentes.
  const items = medias.slice(0, 120).map((media, index) => {
    const key = snapInstaMediaKey(media);
    return {
      id: `snap_profile_${u}_${key}`, shortcode: `public_${key}`,
      tipo: media.isVideo ? 'reel' : 'post', ts: now - index * 1000,
      caption: '', link, medias: [media], username: u, source: 'snapinsta',
    };
  }).sort((a, b) => a.ts - b.ts);
  let stats = {};
  // Só a página pública de estatísticas: não volta a chamar endpoints IG que
  // costumam responder 429 no servidor sem sessão.
  try { stats = await perfilPublicoIqSaved(u); } catch {}
  return {
    // ID sintético: mantém os fluxos do C∆P que exigem uma chave de perfil,
    // sem fingir que é o PK privado do Instagram.
    id: `public_${u}`, username: u, nome: stats.nome || '@' + u, bio: stats.bio || '',
    privado: false, verificado: !!stats.verificado,
    seguidores: stats.seguidores || 0, seguindo: stats.seguindo || 0,
    posts: stats.posts || items.length, highlights: 0,
    temReels: items.some(item => item.tipo === 'reel'), foto: '',
    // O provider devolve o conjunto público disponível, não uma paginação
    // verificável do feed inteiro; não apresentar isso como histórico completo.
    items, hasMore: true, endCursor: '', via: 'snapinsta-profile',
  };
}

// link → item(s) pronto(s) para processarItem. Conteúdo público prioriza
// SnapInsta sem sessão; sessão, yt-dlp e embed são recuperação para privado/falha.
async function itemDeLink(link) {
  const info = await resolverLink(link);
  if (!info) throw new Error('Link do Instagram não reconhecido');
  if (info.tipo === 'story') {
    // Público e sem sessão primeiro. Para stories privados/expirados, mantém
    // o acesso autenticado e o yt-dlp como recuperação.
    try {
      const item = await storyPublicItem(info.url);
      if (item.medias.length) return [item];
    } catch {}
    try {
      const us = await igProfile(info.username).catch(() => null);
      if (us?.id) {
        const st = await igStories(us.id, info.username);
        const hit = info.pk && st.items?.find(x => String(x.shortcode) === String(info.pk));
        if (hit) return [hit];
        if (info.pk && st.items?.length && !st.needsLogin) throw new Error(`Esse story de @${info.username} já expirou (não está nos activos)`);
      }
    } catch (e) { if (/expirou/.test(e.message)) throw e; }
    // Último recurso para um link de story específico.
    try {
      const it = await ytdlpUrl(info.url);
      if (it?.medias?.[0]?.url) return [{ ...it, username: info.username }];
    } catch {}
    throw new Error(`Story de @${info.username} indisponível (expirou, é privado ou os providers públicos falharam)`);
  }
  if (info.tipo === 'highlight') {
    // Highlights públicos também tentam SnapInsta antes de exigir a sessão.
    try {
      const it = await snapInstaItem(info.url, info);
      if (it?.medias?.[0]?.url) return [it];
    } catch {}
    // yt-dlp no URL do highlight
    try {
      const it = await ytdlpUrl(info.url);
      if (it?.medias?.[0]?.url) return [it];
    } catch {}
    throw new Error('Highlight indisponível publicamente ou o provider externo falhou.');
  }
  // post / reel / tv: padrão público e sem cookies primeiro.
  const erros = [];
  try {
    const it = await snapInstaItem(info.url, info);
    if (it?.medias?.[0]?.url) return [it];
  } catch (e) { erros.push('SnapInsta: ' + e.message.slice(0, 60)); }
  // Privado ou SnapInsta temporariamente indisponível: rotas legadas.
  try {
    const it = await ytdlpUrl(info.url);
    if (it?.medias?.[0]?.url) return [it];
  } catch (e) { erros.push('yt-dlp: ' + e.message.slice(0, 60)); }
  try {
    const it = await embedItem(info.shortcode);
    if (it?.medias?.[0]?.url) return [it];
  } catch (e) { erros.push('embed: ' + e.message.slice(0, 60)); }
  throw new Error(`Não consegui baixar o link (${erros.join(' · ')})`);
}

async function embedItem(shortcode) {
  const url = `https://www.instagram.com/p/${encodeURIComponent(shortcode)}/embed/captioned/`;
  const r = await httpGet(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.instagram.com/' }, timeout: 20000 });
  if (r.status !== 200) throw new Error(`embed HTTP ${r.status}`);
  const html = r.body.toString('utf8');
  // contextJSON (reels: tem video_url) ou a imagem clássica do embed
  let mediaUrl = '', isVideo = false, caption = '';
  const ctxM = html.match(/contextJSON\s*=\s*(\{.+?\});/s);
  if (ctxM) {
    try {
      const j = JSON.parse(ctxM[1].replace(/\\\\(\\")/g, '$1').replace(/\\\\u0026/g, '&').replace(/\\\\\\/g, '/'));
      mediaUrl = j.video_url || j.display_url || '';
      isVideo = !!j.video_url;
      caption = j.edge_media_to_caption?.edges?.[0]?.node?.text || '';
    } catch {}
  }
  if (!mediaUrl) {
    const imgM = html.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i)
      || html.match(/"display_url":"([^"]+)"/i) || html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i);
    if (imgM) { mediaUrl = imgM[1].replace(/&amp;/g, "&").replace("\\u0026", "&"); isVideo = false; }
  }
  if (!mediaUrl) {
    const vidM = html.match(/"video_url":"([^"]+)"/i);
    if (vidM) { mediaUrl = vidM[1].replace("\\u0026", "&"); isVideo = true; }
  }
  if (!mediaUrl) throw new Error('embed sem mídia (post apagado/privado?)');
  const capM = html.match(/class="Caption"[^>]*>([\s\S]{0,400}?)<\/div>/);
  if (!caption && capM) caption = capM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { id: `e_${shortcode}`, shortcode, tipo: isVideo ? 'reel' : 'post', ts: 0, caption: caption.slice(0, 300), link: `https://www.instagram.com/p/${shortcode}/`, medias: [{ url: mediaUrl, isVideo }], username: '' };
}

// 1 link (post/reel/story) → item, via yt-dlp
async function ytdlpUrl(link) {
  const it = await ytdlpItem(link);
  if (!it?.url) throw new Error('yt-dlp sem URL');
  const m = String(link).match(/\/(?:p|reel|reels|tv|stories(?:\/[^/]+)?)\/([A-Za-z0-9_-]+)/);
  return { id: `y_${m ? m[1] : Date.now()}`, shortcode: m ? m[1] : '', tipo: it.isVideo ? 'reel' : 'post', ts: it.ts || 0, caption: it.caption || '', link, medias: [{ url: it.url, isVideo: it.isVideo }], username: '' };
}

async function ytdlpProfile(username, maxPosts = 12) {
  const u = normUser(username);
  const { execFile } = require('child_process');
  const run = (bin, args) => new Promise((res, rej) => execFile(bin, args, { timeout: 45000, maxBuffer: 30 * 1024 * 1024 }, (e, out, err) => e ? rej(new Error((err || e.message).split('\n')[0].slice(0, 140))) : res(out)));
  const args = ['-j', '--flat-playlist', '--no-warnings', '--playlist-items', `1-${Math.max(2, maxPosts)}`];
  let out;
  try { out = await run('yt-dlp', [...args, `https://www.instagram.com/${u}/`]); }
  catch (e1) { try { out = await run('python3', ['-m', 'yt_dlp', ...args, `https://www.instagram.com/${u}/`]); } catch { return null; } }
  const entries = [];
  for (const line of String(out || '').trim().split('\n')) {
    if (!line.trim()) continue;
    try { const j = JSON.parse(line); if (j._type === 'playlist' && Array.isArray(j.entries)) entries.push(...j.entries); else if (j.id || j.url) entries.push(j); } catch {}
  }
  if (!entries.length) return null;
  const items = [];
  for (const en of entries.slice(0, maxPosts)) {
    const link = en.url || en.webpage_url || (en.id ? `https://www.instagram.com/p/${en.id}/` : '');
    if (!link) continue;
    try {
      const it = await ytdlpItem(link);
      if (!it?.url) continue;
      items.push({ id: `y_${en.id || items.length}`, shortcode: String(en.id || '').replace(/\/$/, ''), tipo: it.isVideo ? 'reel' : 'post', ts: it.ts || 0, caption: it.caption || '', link, medias: [{ url: it.url, isVideo: it.isVideo }], username: u });
    } catch {}
  }
  if (!items.length) return null;
  items.sort((a, b) => a.ts - b.ts);
  return { id: '', username: u, nome: '@' + u, bio: '', privado: false, seguidores: 0, seguindo: 0, posts: items.length, highlights: 0, temReels: items.some(i => i.tipo === 'reel'), foto: '', items, hasMore: false, endCursor: '', via: 'ytdlp' };
}

// cache de perfil (3 min) — o bot tinha-se auto-429 com spam de .cap ver
const _profCache = new Map();
// ── Feed por GraphQL web público ────────────────────────────────
// Usa apenas a página/GraphQL que o navegador visitante consegue abrir.
// Se a fonte limitar a consulta, a cadeia cai em yt-dlp e SnapInsta públicos.
async function feedViaGraphql(username, first = 12, after = '') {
  const u = normUser(username);
  const vars = { username: u, first };
  if (after) vars.after = after;
  const _parse = (body) => {
    const j = JSON.parse(body.toString('utf8'));
    const conn = j?.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
    if (!conn && j?.errors) throw new Error('graphql execution error');
    const items = [];
    for (const e of (conn?.edges || [])) {
      const node = e?.node;
      if (!node || node.__typename === 'XDTGraphUser') continue;
      const it = nodeToItem(node, u);
      if (it?.medias?.length && it.medias[0].url) items.push(it);
    }
    return { items: items.sort((a, b) => a.ts - b.ts), hasMore: !!conn?.page_info?.has_next_page, endCursor: conn?.page_info?.end_cursor || '' };
  };
  const base = {
    ...PUBLIC_IG_HEADERS, 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Accept: '*/*',
    Referer: `https://www.instagram.com/${u}/`,
  };
  // 1) GET — canal documentado (scrapfly Set/2026)
  try {
    const q = `https://www.instagram.com/graphql/query/?doc_id=9310670392322965&variables=${encodeURIComponent(JSON.stringify(vars))}`;
    const r = await httpGet(q, { headers: base, timeout: 20000 });
    if (r.status === 200 && r.body && String(r.body.slice(0, 1)) !== '<') return _parse(r.body);
  } catch {}
  // 2) POST com o token LSD que a página pública expõe, sem jar de cookies.
  try {
    await new Promise(r2 => setTimeout(r2, _rand(700, 1600)));
    const hp = await htmlPayload(u);
    const lsd = hp.lsd;
    if (!lsd) throw new Error('sem LSD público');
    const body = new URLSearchParams({
      lsd, fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'PolarisProfilePostsTabContentQuery_connection',
      variables: JSON.stringify(vars), doc_id: '9310670392322965', server_timestamps: 'true',
    }).toString();
    const r2 = await httpReq('POST', 'https://www.instagram.com/api/graphql', {
      headers: { ...base, 'X-FB-LSD': lsd, 'X-FB-Friendly-Name': 'PolarisProfilePostsTabContentQuery_connection' },
      timeout: 20000, body,
    });
    if (r2.status === 200 && r2.body && String(r2.body.slice(0, 1)) !== '<') return _parse(r2.body);
  } catch {}
  throw new Error('graphql GET+POST falharam');
}

// ─────────────────────────────────────────────────────────────
// v12.9.13 — API FUNDAMENTAL DE ESTATÍSTICAS 📊
// Garante NÚMEROS VERDADEIROS (seguidores/following/posts/bio/foto)
// combinando TODAS as fontes em cascata + merge + cache 5 min.
//   1. web_profile_info   (JSON completo)
//   2. HTML da página     (og:description: "8M Followers, 997 Following, 171 Posts")
//   3. usernameinfo app   (JSON por pk)
//   4. users/search       (pk + nome + follower_count)
// O que uma fonte não der, outra preenche. Nunca devolve 0 tendo dado para saber.
const _statsCache = new Map(); // 'p:username' → { at, v }
function _parseOgFollowers(html) {
  const m = (html.match(/og:description"\s+content="([^"]*)/) || html.match(/content="([^"]*)"[^>]*property="og:description"/) || [])[1] || '';
  const dec = m.replace(/&#[0-9]+;/g, (x) => String.fromCharCode(parseInt(x.slice(2, -1)))).replace(/&amp;/g, '&');
  const num = (s) => {
    if (!s) return 0;
    const mm = s.replace(/\s+/g, '').replace(/,(?=\d{3}\b)/g, '.').match(/^([\d.,]+)\s*([KMB])?/i);
    if (!mm) return 0;
    let n = parseFloat(String(mm[1]).replace(/\.(?=.*\.)/g, '').replace(',', '.'));
    if (isNaN(n)) return 0;
    const suf = (mm[2] || '').toUpperCase();
    if (suf === 'K') n *= 1e3; else if (suf === 'M') n *= 1e6; else if (suf === 'B') n *= 1e9;
    return Math.round(n);
  };
  const followers = num((dec.match(/([\d.,]+(?:\s\d{3})*\s*[KMB]?)\s*Followers/i) || [])[1]);
  const following = num((dec.match(/([\d.,]+(?:\s\d{3})*\s*[KMB]?)\s*Following/i) || [])[1]);
  const posts = num((dec.match(/([\d.,]+(?:\s\d{3})*\s*[KMB]?)\s*Posts/i) || [])[1]);
  const nome = (dec.match(/from\s+(.+?)\s*\(@/i) || [])[1] || '';
  const user = (dec.match(/\(@([^)]+)\)/i) || [])[1] || '';
  return { followers, following, posts, nome, user };
}

// ─────────────────────────────────────────────────────────────
// v12.9.14 — FONTE FUNDAMENTAL: a PRÓPRIA PÁGINA do perfil 📄
// O IG embute o utilizador completo no HTML (xig_user_by_username)
// e os contadores no og:description — é o que um navegador vê.
// Devolve { user, og, lsd, posts, status } — cache 5 min por username.
// payload real do IG anda a 15-25 níveis de nesting → profundidade 60 + orçamento de nós
function _digUser(obj, st) {
  if (!obj || typeof obj !== 'object') return null;
  st = st || { d: 0, n: 0 };
  if (++st.n > 400000 || ++st.d > 5000) { st.d--; return null; }
  if ((obj.username && (obj.follower_count != null || obj.edge_followed_by || obj.media_count != null)) || (obj.pk && obj.username && obj.full_name != null)) { st.d--; return obj; }
  for (const k of Object.keys(obj)) {
    try { const r = _digUser(obj[k], st); if (r) { st.d--; return r; } } catch {}
  }
  st.d--;
  return null;
}
function _digTimeline(obj, st) {
  if (!obj || typeof obj !== 'object') return null;
  st = st || { d: 0, n: 0 };
  if (++st.n > 400000 || ++st.d > 5000) { st.d--; return null; }
  if (obj.edges?.length) {
    const n0 = obj.edges[0]?.node || {};
    if (n0.shortcode || n0.code || (n0.id && n0.media_type)) { st.d--; return obj; }
  }
  for (const k of Object.keys(obj)) {
    try { const r = _digTimeline(obj[k], st); if (r) { st.d--; return r; } } catch {}
  }
  st.d--;
  return null;
}
const _htmlCache = new Map();
// foto na MÁXIMA qualidade: IG CDN traz /s150x150/, /s320x320/… → pedir 1080x1080
function fotoHD(u) { return String(u || '').replace(/\/s\d{2,4}x\d{2,4}\//g, '/s1080x1080/'); }
async function htmlPayload(username) {
  const u = normUser(username);
  const ck = 'h:' + u;
  const hit = _htmlCache.get(ck);
  if (hit && Date.now() - hit.at < 300e3) return hit.v;
  const _parse = (html) => {
    const o = { user: null, og: null, lsd: '', posts: [], status: 200 };
    const scripts = html.match(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/g) || [];
    for (const s of scripts.slice(0, 40)) {
      if (!/xig_user_by_username|followed_by|media_count/.test(s)) continue;
      try {
        const j = JSON.parse(s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
        if (!o.user) { const us = _digUser(j); if (us) o.user = us; }
      } catch {}
    }
    const og = _parseOgFollowers(html);
    if (og.followers || og.posts || og.nome) o.og = og;
    o.lsd = (html.match(/"LSD",\[\],\{"token":"([^"]+)"/) || [])[1] || '';
    for (const s of scripts.slice(0, 40)) {
      if (!/user_timeline_graphql_connection|shortcode/.test(s)) continue;
      try {
        const j = JSON.parse(s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
        const tl = _digTimeline(j);
        if (tl?.edges?.length) { o.posts = tl.edges.map(e => e?.node).filter(Boolean); break; }
      } catch {}
    }
    return o;
  };
  const out = { user: null, og: null, lsd: '', posts: [], status: 0 };
  try {
    const r = await httpGet(`https://www.instagram.com/${u}/`, {
      headers: { ...PUBLIC_IG_HEADERS, 'User-Agent': UA, 'Upgrade-Insecure-Requests': '1' },
      timeout: 20000,
    });
    out.status = r.status;
    if (r.status === 200 && r.body) {
      const parsed = _parse(r.body.toString('utf8'));
      out.user = parsed.user;
      out.og = parsed.og;
      out.lsd = parsed.lsd;
      out.posts = parsed.posts;
    }
  } catch {}
  _htmlCache.set(ck, { at: Date.now(), v: out });
  return out;
}

// Consulta complementar somente de perfis públicos por @usuario. A página é
// server-rendered, por isso continua útil quando os endpoints do Instagram
// devolvem 429. Não usamos o proxy de mídia desse site nem qualquer sessão.
function _metricIqSaved(value) {
  const m = String(value || '').trim().replace(/\s+/g, '').match(/^([\d.,]+)([KMB])?$/i);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(/\.(?=.*\.)/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  const suffix = (m[2] || '').toUpperCase();
  if (suffix === 'K') n *= 1e3; else if (suffix === 'M') n *= 1e6; else if (suffix === 'B') n *= 1e9;
  return Math.round(n);
}
function _iqText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}
async function perfilPublicoIqSaved(username) {
  const u = normUser(username);
  if (!/^[a-z0-9._]{1,30}$/i.test(u)) throw new Error('Utilizador Instagram inválido');
  const r = await httpGet(`https://iqsaved.com/pt/viewer/${encodeURIComponent(u)}/`, {
    proxy: false, timeout: 30000,
    headers: { 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
  });
  if (r.status !== 200) throw new Error(`IQSaved HTTP ${r.status}`);
  const html = r.body.toString('utf8');
  const foundUser = (html.match(/profile-info__username[^>]*>\s*@?([^\s<]+)/i) || [])[1] || '';
  if (foundUser.toLowerCase() !== u) throw new Error('Perfil público não encontrado');
  const field = (name) => _iqText((html.match(new RegExp(`${name}[^>]*>([\\s\\S]*?)<\\/`, 'i')) || [])[1]);
  return {
    username: u,
    nome: field('profile-info__fullname'),
    bio: field('profile-info__biography'),
    posts: _metricIqSaved(field('profile-info__stats-posts')),
    seguidores: _metricIqSaved(field('profile-info__stats-followers')),
    seguindo: _metricIqSaved(field('profile-info__stats-follows')),
    verificado: /profile-info__is-verified(?![^"']*is-hidden)/i.test(html),
    privado: false,
    fonte: 'iqsaved-public',
  };
}

async function perfilStats(username) {
  const u = normUser(username);
  const ck = 'p:' + u;
  const hit = _statsCache.get(ck);
  if (hit && Date.now() - hit.at < 300e3) return hit.v;
  const out = { username: u, nome: '', bio: '', seguidores: 0, seguindo: 0, posts: 0, privado: false, verificado: false, foto: '', id: '', fontes: [] };
  // FONTE 1: a página pública do próprio perfil (HTML/metadata).
  try {
    const hp = await htmlPayload(u);
    if (hp.user) {
      const ju = hp.user;
      out.id = String(ju.pk || ju.id || '');
      out.nome = ju.full_name || '';
      out.bio = ju.biography || '';
      out.seguidores = ju.follower_count || ju.edge_followed_by?.count || 0;
      out.seguindo = ju.following_count || ju.edge_follow?.count || 0;
      out.posts = ju.media_count || ju.edge_owner_to_timeline_media?.count || 0;
      out.privado = !!ju.is_private;
      out.verificado = !!ju.is_verified;
      out.foto = fotoHD(ju.profile_pic_url_hd || ju.profile_pic_url || '');
      out.fontes.push('html-publico');
    }
    if (hp.og) {
      const og = hp.og;
      if (og.followers) { out.seguidores = out.seguidores || og.followers; out.fontes.push('og-publico'); }
      if (og.following) out.seguindo = out.seguindo || og.following;
      if (og.posts) out.posts = out.posts || og.posts;
      if (!out.nome && og.nome) out.nome = og.nome;
    }
  } catch {}
  // FONTE 2: página pública complementar por @ quando a página do IG não
  // expõe as métricas naquele momento. Nunca consulta endpoints de conta/app.
  if (!out.seguidores && !out.posts) {
    try {
      const pub = await perfilPublicoIqSaved(u);
      out.nome = out.nome || pub.nome;
      out.bio = out.bio || pub.bio;
      out.seguidores = pub.seguidores || 0;
      out.seguindo = pub.seguindo || 0;
      out.posts = pub.posts || 0;
      out.verificado = out.verificado || pub.verificado;
      out.fontes.push(pub.fonte);
    } catch {}
  }
  // v12.9.20: SNAPSHOT de crescimento (série histórica p/ /api/ig/crescimento)
  if (out.seguidores > 0) {
    try {
      const sk = 'ig:' + u;
      if (!state.snapshots) state.snapshots = {};
      const serie = state.snapshots[sk] || [];
      const hoje = new Date().toISOString().slice(0, 10);
      const ultimo = serie[serie.length - 1];
      const ponto = { t: Date.now(), s: out.seguidores, p: out.posts || 0, f: out.seguindo || 0, d: hoje };
      if (ultimo && ultimo.d === hoje) serie[serie.length - 1] = ponto; // 1 ponto por dia (refresh)
      else { serie.push(ponto); if (serie.length > 180) state.snapshots[sk] = serie.slice(-180); }
      save();
    } catch {}
  }
  _statsCache.set(ck, { at: Date.now(), v: out });
  return out;
}

// série de crescimento de um perfil (dos snapshots diários)
function crescimento(username, dias = 30) {
  load();
  const serie = ((state.snapshots || {})['ig:' + normUser(username)] || []).slice(-Math.min(dias, 180));
  if (!serie.length) return { username: normUser(username), serie: [], delta: 0, mediaDia: 0 };
  const primeiro = serie[0], ultimo = serie[serie.length - 1];
  const delta = (ultimo.s || 0) - (primeiro.s || 0);
  const d1 = serie.length > 1 ? Math.max(1, Math.round((ultimo.t - primeiro.t) / 86400e3)) : 1;
  return { username: normUser(username), serie, delta, mediaDia: Math.round(delta / d1), desde: primeiro.d, ate: ultimo.d };
}

// Resgate público: se uma fonte limitar o pedido, monta o perfil por
// username com GraphQL web, página embutida de visitante e métricas públicas.
// Se nenhuma fonte expuser mídia, devolve a limitação real.
async function rescueProfile(u) {
  const un = normUser(u);
  let items = [];
  try { const g = await feedViaGraphql(un, 12); if (g.items?.length) { items.push(...g.items); items.sort((a, b) => a.ts - b.ts); } } catch {}
  if (!items.length) {
    try {
      const hp = await htmlPayload(un);
      const its = (hp.posts || []).map(n => { try { return nodeToItem(n, un); } catch { return null; } }).filter(x => x?.medias?.length && x.medias[0].url);
      if (its.length) { items.push(...its); items.sort((a, b) => a.ts - b.ts); }
    } catch {}
  }
  let st = {}; try { st = await perfilStats(un); } catch {}
  // igProfile precisa de itens reais; estatísticas isoladas continuam em
  // perfilStats/cap stats e não devem fingir que o feed foi lido.
  if (!items.length) return null;
  return {
    id: st.id || '', username: un, nome: st.nome || '@' + un, bio: st.bio || '',
    privado: !!st.privado, verificado: !!st.verificado,
    seguidores: st.seguidores || 0, seguindo: st.seguindo || 0, posts: st.posts || items.length,
    highlights: 0, temReels: items.some(i => i.tipo === 'reel'),
    foto: st.foto || '',
    items, hasMore: false, endCursor: '', via: items.length ? 'web-rescue' : 'stats-only',
  };
}

async function igProfile(username) {
  const u = normUser(username);
  const cacheKey = 'p:' + u;
  const cached = _profCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 180e3) return cached.v;

  // Cadeia sem credenciais: SnapInsta → página/GraphQL pública → yt-dlp.
  // Só perfis e mídias que o próprio Instagram deixa públicos são capturáveis.
  let profile = null;
  try { profile = await snapInstaProfile(u); } catch {}
  if (!profile) profile = await rescueProfile(u).catch(() => null);
  if (!profile) profile = await ytdlpProfile(u, 120).catch(() => null);
  if (!profile?.items?.length) {
    throw new Error(`Não consegui obter mídia pública de @${u} agora. Perfis privados, stories expirados e conteúdo removido não são acessíveis sem autorização.`);
  }
  _profCache.set(cacheKey, { at: Date.now(), v: profile });
  return profile;
}

// Paginação pública: usa somente a janela que GraphQL/yt-dlp/SnapInsta expõem.
async function igFeedAll(_userId, username, maxPages = 15) {
  const u = normUser(username);
  // GraphQL público pode paginar; se não responder, yt-dlp e SnapInsta ainda
  // entregam toda a janela de mídia que estiver publicamente disponível.
  try {
    let page = await feedViaGraphql(u, 33);
    const items = [...(page.items || [])];
    let pages = 0;
    while (page.hasMore && page.endCursor && pages++ < Math.min(14, maxPages - 1)) {
      await new Promise(resolve => setTimeout(resolve, _rand(800, 1800)));
      page = await feedViaGraphql(u, 33, page.endCursor);
      items.push(...(page.items || []));
    }
    if (items.length) return { items: items.sort((a, b) => a.ts - b.ts), needsLogin: false };
  } catch {}
  const ytdlp = await ytdlpProfile(u, Math.min(120, Math.max(33, maxPages * 8))).catch(() => null);
  if (ytdlp?.items?.length) return { items: ytdlp.items, needsLogin: false };
  const snap = await snapInstaProfile(u).catch(() => null);
  return { items: snap?.items || [], needsLogin: false };
}

async function igStories(_userId, username) {
  try {
    return { items: await storiesPublicItems(username), needsLogin: false };
  } catch (error) {
    // Stories apenas existem enquanto públicos e activos; não há fallback de
    // autenticação ou conta de terceiros.
    return { items: [], needsLogin: false, error: String(error?.message || 'stories públicos indisponíveis') };
  }
}

async function igHighlights(_userId, _username) {
  // A listagem de highlights não é exposta de modo público estável. Um link
  // directo de highlight continua a ser tratado por itemDeLink/SnapInsta.
  return { items: [], needsLogin: false, error: 'Use um link público directo do highlight.' };
}

const PROVIDERS = {
  ig: { nome: 'Instagram', profile: igProfile, feedAll: igFeedAll, stories: igStories, highlights: igHighlights, normUser },
};

// ─────────────────────────────────────────────────────────────
// DOWNLOAD + VERIFICAÇÃO
// ─────────────────────────────────────────────────────────────
function sniffMime(buf, fallbackVideo) {
  if (!buf || buf.length < 12) return '';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.slice(4, 8).toString() === 'ftyp') return 'video/mp4';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'image/gif';
  return fallbackVideo ? 'video/mp4' : '';
}

// Fallback: yt-dlp resolve um post/reel pelo link mesmo quando o IP está em 429 na API web
async function ytdlpItem(link) {
  const { execFile } = require('child_process');
  const run = (bin, args) => new Promise((res, rej) => execFile(bin, args, { timeout: 60000, maxBuffer: 20 * 1024 * 1024 }, (e, out, err) => e ? rej(new Error((err || e.message).split('\n')[0].slice(0, 120))) : res(out)));
  const args = ['-j', '--no-warnings', '--no-playlist', link];
  let out;
  try { out = await run('yt-dlp', args); } catch (e1) { try { out = await run('python3', ['-m', 'yt_dlp', ...args]); } catch (e2) { throw new Error('yt-dlp: ' + e2.message); } }
  const j = JSON.parse(out.trim().split('\n')[0]);
  const url = j.url || (j.formats || []).filter(f => f.url && (f.vcodec !== 'none' || f.ext === 'mp4')).sort((a, b) => (b.height || 0) - (a.height || 0))[0]?.url || j.thumbnail;
  if (!url) throw new Error('yt-dlp sem URL');
  return { url, isVideo: !/\.(jpe?g|png|webp)(\?|$)/i.test(url) && j.ext !== 'jpg', caption: j.description || '', ts: (j.timestamp || 0) * 1000, uploader: j.channel || j.uploader_id || '' };
}

async function baixarMedia(m) {
  const r = await httpGet(m.url, { timeout: 90000, headers: { Referer: 'https://www.instagram.com/' } });
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  const buf = r.body;
  if (!buf || buf.length < 1024) throw new Error(`ficheiro vazio (${buf?.length || 0} bytes)`);
  const mime = sniffMime(buf, m.isVideo) || (r.headers['content-type'] || '').split(';')[0];
  if (!/^(image|video)\//.test(mime)) throw new Error(`tipo inválido: ${mime || '?'}`);
  if (buf.length > 95 * 1024 * 1024) throw new Error('ficheiro > 95 MB');
  return { buffer: buf, mime, bytes: buf.length, isVideo: mime.startsWith('video/') };
}

function extFor(mime) { return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : mime.startsWith('video/') ? 'mp4' : 'jpg'; }

function guardarNoDisco(key, item, idx, file) {
  const dir = path.join(DATA_DIR, key.replace(/[^a-z0-9_.-]/gi, '_'));
  ensureDir(dir);
  const d = new Date(item.ts || Date.now());
  const stamp = isNaN(d) ? 'sem-data' : d.toISOString().slice(0, 10);
  const name = `${stamp}_${item.tipo}_${item.shortcode}${item.medias.length > 1 ? `_${idx + 1}` : ''}.${extFor(file.mime)}`;
  const full = path.join(dir, name);
  fs.writeFileSync(full, file.buffer);
  if (item.caption && idx === 0) { try { fs.writeFileSync(full.replace(/\.[a-z0-9]+$/, '.txt'), `${item.link}\n\n${item.caption}\n`); } catch {} }
  return full;
}

function listarGaleria(key) {
  const dir = path.join(DATA_DIR, key.replace(/[^a-z0-9_.-]/gi, '_'));
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => !f.endsWith('.txt')).sort().reverse().map(f => ({ nome: f, path: path.join(dir, f), bytes: fs.statSync(path.join(dir, f)).size }));
}

// ─────────────────────────────────────────────────────────────
// LOG
// ─────────────────────────────────────────────────────────────
function registar(entry) {
  state.log.unshift({ ts: Date.now(), ...entry });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
}

function marcarVisto(key, id) {
  state.seen[key] = state.seen[key] || {};
  state.seen[key][id] = Date.now();
  const ids = Object.keys(state.seen[key]);
  if (ids.length > MAX_SEEN_PER_TARGET) for (const old of ids.slice(0, ids.length - MAX_SEEN_PER_TARGET)) delete state.seen[key][old];
}
function jaVisto(key, id) { return !!state.seen[key]?.[id]; }

// ─────────────────────────────────────────────────────────────
// ALVOS
// ─────────────────────────────────────────────────────────────
function keyOf(platform, username) { return `${platform}:${PROVIDERS[platform] ? PROVIDERS[platform].normUser(username) : String(username).toLowerCase()}`; }

function parseTargetArg(arg) {
  // aceita "veigh", "@veigh", "ig:veigh", "instagram.com/veigh"
  let platform = 'ig'; let user = String(arg || '');
  const m = user.match(/^(ig|insta|instagram|tt|tiktok|x|twitter|fb|facebook):(.+)$/i);
  if (m) { platform = { insta: 'ig', instagram: 'ig', tiktok: 'tt', twitter: 'x', facebook: 'fb' }[m[1].toLowerCase()] || m[1].toLowerCase(); user = m[2]; }
  else if (/tiktok\.com/i.test(user)) platform = 'tt';
  else if (/(twitter|x)\.com/i.test(user)) platform = 'x';
  return { platform, username: PROVIDERS[platform] ? PROVIDERS[platform].normUser(user) : user.replace(/^@/, '').toLowerCase() };
}

function getTarget(arg) { const { platform, username } = parseTargetArg(arg); return state.targets[keyOf(platform, username)] || null; }

function addTarget(arg, { destino, addedBy } = {}) {
  load();
  const { platform, username } = parseTargetArg(arg);
  if (!PROVIDERS[platform]) throw new Error(`Plataforma "${platform}" ainda não suportada (fase 1: Instagram)`);
  if (!username || !/^[a-z0-9._]{1,30}$/.test(username)) throw new Error('Username inválido');
  const key = keyOf(platform, username);
  const existente = state.targets[key];
  const t = existente || {
    key, platform, username, destinos: [], guardar: true, auto: true, stories: true,
    intervaloMin: DEFAULT_INTERVAL_MIN, lastCheck: 0, addedBy: addedBy || '', addedAt: Date.now(), userId: '',
    stats: { baixados: 0, falhados: 0, enviados: 0 }, primed: false,
  };
  if (destino && !t.destinos.includes(destino)) t.destinos.push(destino);
  state.targets[key] = t;
  save();
  return { target: t, novo: !existente };
}

function delTarget(arg) { load(); const { platform, username } = parseTargetArg(arg); const key = keyOf(platform, username); const had = !!state.targets[key]; delete state.targets[key]; save(); return had; }
function listTargets() { load(); return Object.values(state.targets); }
function setTargetOpt(arg, patch) { const t = getTarget(arg); if (!t) throw new Error('Alvo não encontrado'); Object.assign(t, patch); save(); return t; }

// ─────────────────────────────────────────────────────────────
// ENVIO PARA WHATSAPP
// ─────────────────────────────────────────────────────────────
function legenda(t, item, idx, total) {
  const prov = PROVIDERS[t.platform]?.nome || t.platform;
  const tipo = { reel: '🎬 Reel', video: '🎬 Vídeo', carrossel: '🖼️ Carrossel', post: '📸 Post', story: '⏳ Story', highlight: '⭐ Highlight' }[item.tipo] || '📎';
  const data = item.ts ? new Date(item.ts).toLocaleString('pt-PT', { timeZone: 'Africa/Luanda' }) : '';
  const parte = total > 1 ? ` (${idx + 1}/${total})` : '';
  const cap = item.caption ? `\n\n${item.caption.slice(0, 900)}${item.caption.length > 900 ? '…' : ''}` : '';
  return `╭─ C∆P · ${prov}\n│ @${t.username} · ${tipo}${parte}\n│ 📅 ${data}\n╰─ 🔗 ${item.link}${cap}`;
}

async function enviarItem(sock, t, item, files, destinos) {
  let ok = 0, fail = 0;
  for (const jid of destinos) {
    try {
      if (!files.length) {
        await sock.sendMessage(jid, { text: legenda(t, item, 0, 1) });
      } else {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const caption = i === 0 ? legenda(t, item, i, files.length) : (files.length > 1 ? `@${t.username} · ${i + 1}/${files.length}` : '');
          const content = f.isVideo ? { video: f.buffer, mimetype: 'video/mp4', caption } : { image: f.buffer, caption };
          const res = await sock.sendMessage(jid, content);
          if (!res?.key) throw new Error('sem confirmação de envio');
        }
      }
      ok++;
      registar({ target: t.key, item: item.shortcode, tipo: item.tipo, status: 'enviado', detalhe: jid });
    } catch (e) {
      fail++;
      registar({ target: t.key, item: item.shortcode, tipo: item.tipo, status: 'erro', detalhe: `envio ${jid}: ${e.message?.slice(0, 80)}` });
    }
  }
  return { ok, fail };
}

// Processa 1 item: baixa todas as medias, verifica, guarda, envia, marca visto.
// ─────────────────────────────────────────────────────────────
// v12.9.19 — WEBHOOKS: o CAP avisa os TEUS sistemas em tempo real 🪝
// Regista URLs; sempre que um item é capturado, POST JSON best-effort.
function addWebhook(url) {
  load();
  const u = String(url || '').trim();
  if (!/^https?:\/\//.test(u)) throw new Error('URL do webhook inválida (http/https)');
  if (!state.webhooks) state.webhooks = [];
  if (!state.webhookSecret) state.webhookSecret = require('crypto').randomBytes(24).toString('hex');
  if (!state.webhooks.includes(u)) state.webhooks.push(u);
  save();
  return { urls: state.webhooks.slice(), segredo: state.webhookSecret };
}
function delWebhook(url) {
  load();
  if (!state.webhooks) state.webhooks = [];
  state.webhooks = state.webhooks.filter(x => x !== String(url || '').trim());
  save();
  return state.webhooks.slice();
}
function listWebhooks() { load(); return (state.webhooks || []).slice(); }
function _whLog(entrada) {
  if (!state.webhookLog) state.webhookLog = [];
  state.webhookLog.push(entrada);
  if (state.webhookLog.length > 50) state.webhookLog = state.webhookLog.slice(-50);
  save();
}
function fireWebhooks(evento, dados) {
  const urls = (state.webhooks || []);
  if (!urls.length) return;
  const crypto = require('crypto');
  const corpo = JSON.stringify({ evento, dados, ts: new Date().toISOString() });
  const assinatura = crypto.createHmac('sha256', state.webhookSecret || '').update(corpo).digest('hex');
  for (const u of urls) {
    const envio = (tentativa) => httpReq('POST', u, {
      headers: {
        'Content-Type': 'application/json',
        'X-Dark-Evento': String(evento || '').slice(0, 40),
        'X-Dark-Assinatura': 'sha256=' + assinatura, // HMAC — o teu sistema valida que veio do bot
      }, body: corpo, timeout: 5000, proxy: false,
    }).then(r => { _whLog({ url: u.slice(0, 60), evento, status: r.status, tentativa, ts: Date.now() }); return r.status >= 200 && r.status < 300; })
      .catch(() => { _whLog({ url: u.slice(0, 60), evento, status: 0, tentativa, ts: Date.now() }); return false; });
    envio(1).then(ok => { if (!ok) setTimeout(() => envio(2), 20000 + Math.floor(Math.random() * 8000)); }); // retry 1×
  }
}

// v12.9.19 — limpar TODAS as caches (perfil/stats/html)
function limparCache() {
  const n = _profCache.size + _statsCache.size + _htmlCache.size;
  _profCache.clear(); _statsCache.clear(); _htmlCache.clear();
  return n;
}

// O feed pode vir da sessão/GraphQL, mas a transferência de cada post público
// passa sempre pelo provider unificado. Se ele não responder, o URL do feed
// autenticado continua intacto como fallback — inclusive para perfis privados.
async function itemComMidiasPublicas(item) {
  if (item?.source === 'snapinsta' || !item?.link) return item;
  try {
    const info = await resolverLink(item.link);
    if (!info || !['post', 'reel', 'highlight'].includes(info.tipo)) return item;
    const publico = await snapInstaItem(info.url, info);
    if (!publico?.medias?.length) return item;
    return { ...item, medias: publico.medias, source: 'snapinsta' };
  } catch { return item; }
}

async function processarItem(sock, t, item, { destinos, guardar = t.guardar, forcar = false } = {}) {
  if (!forcar && jaVisto(t.key, item.id)) return { skipped: true };
  const mediaItem = await itemComMidiasPublicas(item);
  const files = []; const erros = [];
  for (let i = 0; i < mediaItem.medias.length; i++) {
    try {
      let f;
      try { f = await baixarMedia(mediaItem.medias[i]); }
      catch (e0) {
        // v12.9.11: fallback UNIVERSAL — resolve pelo LINK com a cadeia
        // completa (yt-dlp → embed → oEmbed+sessão → stories/highlights
        // pela sessão). Monitoramento e links falam a mesma língua.
        if (i === 0 && item.link && /instagram\.com\//.test(item.link)) {
          try {
            const alts = await itemDeLink(item.link).catch(() => []);
            const alt = (alts || []).find(x => x?.medias?.[0]?.url);
            if (alt) { f = await baixarMedia(alt.medias[0]); f.viaLink = true; }
          } catch {}
          if (!f) {
            // última rede de segurança: yt-dlp directo (post/reel/tv)
            if (/instagram\.com\/(p|reel|tv)\//.test(item.link)) {
              const alt = await ytdlpItem(item.link);
              f = await baixarMedia({ url: alt.url, isVideo: alt.isVideo });
              f.viaYtdlp = true;
            } else throw e0;
          }
        } else throw e0;
      }
      files.push(f);
      if (guardar) { try { f.path = guardarNoDisco(t.key, item, i, f); } catch (e) { erros.push(`disco: ${e.message}`); } }
    } catch (e) { erros.push(`media ${i + 1}: ${e.message}`); }
  }
  const baixou = files.length > 0 && files.length === mediaItem.medias.length;
  const parcial = files.length > 0 && !baixou;
  t.stats = t.stats || { baixados: 0, falhados: 0, enviados: 0 };
  if (baixou || parcial) { t.stats.baixados++; registar({ target: t.key, item: item.shortcode, tipo: item.tipo, status: parcial ? 'parcial' : 'baixado', detalhe: `${files.length}/${mediaItem.medias.length} · ${(files.reduce((a, f) => a + f.bytes, 0) / 1048576).toFixed(1)} MB${erros.length ? ' · ' + erros.join('; ') : ''}` }); }
  else { t.stats.falhados++; registar({ target: t.key, item: item.shortcode, tipo: item.tipo, status: 'falhou', detalhe: erros.join('; ') || 'sem media' }); }

  let envio = { ok: 0, fail: 0 };
  const dest = destinos || t.destinos || [];
  // envia só se há media baixada, ou se o item é texto puro (sem media); falha total → só log
  const textoPuro = mediaItem.medias.length === 0 && !!item.caption;
  if (sock && dest.length && (files.length || textoPuro)) {
    envio = await enviarItem(sock, t, item, files, dest);
    t.stats.enviados += envio.ok;
  }
  // marca visto mesmo se falhou o download (evita loop); falhas ficam no log
  marcarVisto(t.key, item.id);
  // v12.9.19: webhook — avisa os sistemas externos do item capturado
  if (files.length) fireWebhooks('item.capturado', {
    alvo: t.username, plataforma: t.platform, tipo: item.tipo, shortcode: item.shortcode,
    legenda: String(item.caption || '').slice(0, 300), link: item.link,
    midias: files.map(f => ({ caminho: f.path || f.file || '', bytes: f.bytes, video: !!f.isVideo })),
    enviadoWhatsApp: envio.ok > 0,
  });
  save();
  return { skipped: false, baixou, parcial, files: files.length, total: mediaItem.medias.length, erros, envio, bytes: files.reduce((a, f) => a + f.bytes, 0) };
}

// ─────────────────────────────────────────────────────────────
// VERIFICAÇÃO DE UM ALVO
// ─────────────────────────────────────────────────────────────
async function verificarAlvo(sock, t, { forcar = false, incluirStories = t.stories !== false } = {}) {
  const prov = PROVIDERS[t.platform];
  if (!prov) throw new Error('provider inexistente');
  const res = { alvo: t.key, novos: 0, baixados: 0, falhados: 0, enviados: 0, stories: 0, erro: null, perfil: null };
  try {
    const perfil = await prov.profile(t.username);
    t.userId = perfil.id; t.nome = perfil.nome; t.privado = perfil.privado; t.totalPosts = perfil.posts;
    res.perfil = perfil;
    if (perfil.privado) { res.erro = 'perfil privado — conteúdo público indisponível'; t.lastCheck = Date.now(); save(); return res; }

    let items = perfil.items;
    if (incluirStories) {
      // Monitoramento público também prioriza SnapInsta. As chaves de cada
      // story são estáveis, por isso o scheduler não reenvia o mesmo story.
      const publicStories = t.platform === 'ig' ? await storiesPublicItems(t.username).catch(() => []) : [];
      if (publicStories.length) items = items.concat(publicStories);
      else {
        const st = await prov.stories(perfil.id, t.username).catch(e => ({ items: [], error: e.message }));
        items = items.concat(st.items || []);
      }
    }

    // 1.ª verificação: por defeito NÃO despeja o histórico todo — só marca como visto
    // (o utilizador usa `cap all` para puxar tudo). Excepto se forcar.
    if (!t.primed && !forcar) {
      for (const it of items) marcarVisto(t.key, it.id);
      t.primed = true; t.lastCheck = Date.now(); save();
      res.primed = true; res.marcados = items.length;
      return res;
    }

    for (const it of items) {
      if (!forcar && jaVisto(t.key, it.id)) continue;
      res.novos++;
      const r = await processarItem(sock, t, it, { forcar });
      if (r.skipped) continue;
      if (r.baixou || r.parcial) res.baixados++; else res.falhados++;
      res.enviados += r.envio.ok;
      if (it.tipo === 'story') res.stories++;
      await new Promise(r => setTimeout(r, _rand(700, 1900)));
    }
    t.primed = true;
  } catch (e) {
    res.erro = e.message;
    registar({ target: t.key, item: '-', tipo: 'check', status: 'erro', detalhe: e.message?.slice(0, 120) });
  }
  t.lastCheck = Date.now(); t.lastResult = { ts: Date.now(), novos: res.novos, baixados: res.baixados, falhados: res.falhados, erro: res.erro };
  // backoff: rate-limit (429/401/403) → espera o dobro do intervalo antes de tentar de novo
  if (res.erro && /429|401|403|rate-limit|bloqueio/i.test(res.erro)) t.lastCheck = Date.now() + Math.max(5, t.intervaloMin || DEFAULT_INTERVAL_MIN) * 60000;
  save();
  return res;
}

// "Capture all": baixa toda a janela de mídia pública que os provedores externos disponibilizarem.
async function capturarTudo(sock, t, { destinos, limite = 200, onProgress } = {}) {
  const prov = PROVIDERS[t.platform];
  const perfil = await prov.profile(t.username);
  t.userId = perfil.id; t.nome = perfil.nome;
  let items = perfil.items;
  // A lista pública SnapInsta é útil sem login, mas não oferece paginação
  // verificável; só marcamos completo quando o provider confirma o fim.
  let completo = !perfil.hasMore && perfil.via !== 'snapinsta-profile';
  const full = await prov.feedAll(perfil.id, t.username).catch(() => ({ items: [] }));
  if (full.items?.length > items.length) { items = full.items; completo = true; }
  // Stories públicos entram pelo mesmo provider do comando/link; a sessão é
  // preservada apenas se o provider não enxergar conteúdo privado/expirado.
  const publicStories = t.platform === 'ig' ? await storiesPublicItems(t.username).catch(() => []) : [];
  if (publicStories.length) items = items.concat(publicStories);
  else {
    const st = await prov.stories(perfil.id, t.username).catch(() => ({ items: [] }));
    items = items.concat(st.items || []);
  }
  items = items.slice(-limite);
  const res = { total: items.length, baixados: 0, falhados: 0, enviados: 0, bytes: 0, completo, perfil };
  for (let i = 0; i < items.length; i++) {
    const r = await processarItem(sock, t, items[i], { destinos, forcar: true });
    if (r.baixou || r.parcial) res.baixados++; else res.falhados++;
    res.enviados += r.envio?.ok || 0; res.bytes += r.bytes || 0;
    if (onProgress && (i % 5 === 4 || i === items.length - 1)) { try { await onProgress(i + 1, items.length, res); } catch {} }
    await new Promise(r => setTimeout(r, _rand(800, 2000)));
  }
  t.primed = true; t.lastCheck = Date.now(); save();
  return res;
}

// ─────────────────────────────────────────────────────────────
// SCHEDULER
// ─────────────────────────────────────────────────────────────
let _timer = null; let _running = false; let _getSock = null;
function start(getSock, tickMs = 60000) {
  _getSock = getSock; load();
  if (_timer) return;
  _timer = setInterval(tick, tickMs);
  console.log('🎯 C∆P scheduler iniciado');
}
function stop() { clearInterval(_timer); _timer = null; }

async function tick() {
  if (_running) return; _running = true;
  try {
    const sock = typeof _getSock === 'function' ? _getSock() : null;
    if (!sock) return;
    const now = Date.now();
    // v12.9.12: ordem aleatória (nunca a mesma sequência) + jitter ±35%
    const alvos = Object.values(state.targets).sort(() => Math.random() - 0.5);
    for (const t of alvos) {
      if (!t.auto) continue;
      const base = Math.max(5, t.intervaloMin || DEFAULT_INTERVAL_MIN) * 60000;
      const iv = base * (t._jitter || 1);
      if (now - (t.lastCheck || 0) < iv) continue;
      t._jitter = 0.75 + Math.random() * 0.6; // próximo ciclo varia
      const r = await verificarAlvo(sock, t).catch(e => ({ erro: e.message }));
      if (r.novos || r.erro) console.log(`[CAP] ${t.key}: novos=${r.novos || 0} baixados=${r.baixados || 0} falhados=${r.falhados || 0}${r.erro ? ' erro=' + r.erro : ''}`);
    }
  } catch (e) { console.error('[CAP] tick:', e.message); }
  finally { _running = false; }
}

module.exports = {
  PROVIDERS, DATA_DIR, DEFAULT_INTERVAL_MIN,
  load, save, arrancar, _reset, state,
  parseTargetArg, keyOf, addTarget, delTarget, getTarget, listTargets, setTargetOpt,
  igGet, sincronizar, feedViaGraphql, perfilStats, perfilPublicoIqSaved, rescueProfile, addWebhook, delWebhook, listWebhooks, limparCache, crescimento, htmlPayload, fotoHD,
  igProfile, igFeedAll, igStories, igHighlights, nodeToItem, ytdlpItem, ytdlpProfile, ytdlpUrl, embedItem, resolverLink, snapInstaItem, snapInstaPublicMedias, snapInstaProfile, storiesPublicas, storiesPublicItems, storyPublicItem, itemDeLink, sniffMime, baixarMedia,
  processarItem, verificarAlvo, capturarTudo, listarGaleria, legenda,
  registar, jaVisto, marcarVisto,
  start, stop, tick,
};
