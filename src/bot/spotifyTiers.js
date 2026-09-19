/**
 * DARK BOT — Spotify em 3 níveis (v7.98) 💚
 *
 *  spotify / spotify1 / sp   → BAIXA  ⚡  48k  (pequeno, chega rápido)
 *  spotify2                  → MÉDIA  🎧  128k (equilíbrio)
 *  spotify3                  → MÁXIMA 💎  320k (estúdio)
 *
 * Os três aceitam: NOME (busca com lista até 8 resultados) e
 * LINKS de faixa, playlist, álbum, EP, CD (discografia) — episódios/
 * podcasts são ainda mais completos no próprio app.
 *
 * A qualidade é garantida DEPOIS do download: qualquer buffer oriundo
 * das fontes (SystemZone, spotifydown, yt-dlp…) passa pelo FFmpeg para
 * o bitrate do nível — nunca fica no "veio o que veio".
 */
'use strict';

const NIVEIS = {
  1: { nome: 'BAIXA ⚡', bit: '48k',  dica: 'mais leve — poupa megas e chega rápido' },
  2: { nome: 'MÉDIA 🎧', bit: '128k', dica: 'equilíbrio de estúdio' },
  3: { nome: 'MÁXIMA 💎', bit: '320k', dica: 'qualidade máxima' },
};

/** Do nome do comando → nível. ('spotify', 'spotify1'/'sp' → 1, …) */
function nivelDoComando(cmd) {
  const c = String(cmd || '').toLowerCase();
  if (c === 'spotify3') return 3;
  if (c === 'spotify2') return 2;
  return 1;  // spotify, spotify1, sp
}

// ── Parsing dos links ─────────────────────────────────────────
const RE_SPOTIFY = /(?:open\.)?spotify\.com\/(?:intl-[a-z-]{2,16}\/)?(track|album|playlist|episode|show|artist|episode)\/([A-Za-z0-9]+)/i;
/**
 * @returns {{tipo:'track'|'album'|'playlist'|'episode'|'show'|'artist'|void, id:string}}
 */
function parseSpotifyLink(url) {
  const m = String(url || '').match(RE_SPOTIFY);
  if (!m) return { tipo: '', id: '' };
  return { tipo: m[1].toLowerCase(), id: m[2] };
}
const TIPOS_COLECAO = new Set(['album', 'playlist']);   // EP/CD = 'album'
const TIPOS_BLOQUEIO = { episode: 'episódio', show: 'podcast', artist: 'artista' };

// ── faixa normal ──────────────────────────────────────────────
function _faixa(nome, artista, ref = '') {
  nome = String(nome || '').trim();
  artista = String(artista || '').trim();
  if (!nome) return null;
  return { nome, artista, ref, busca: `${artista ? artista + ' ' : ''}${nome} audio`.trim() };
}

function normalizarFaixas(arr) {
  const vistos = new Set();
  const out = [];
  for (const f of arr || []) {
    if (!f?.nome) continue;
    const k = (f.nome + '|' + f.artista).toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(f);
    if (out.length >= 200) break;
  }
  return out;
}

// ── caminheiro de JSON (vive dentro do __NEXT_DATA__ e é tolerante) ──
function _artistas(obj) {
  const arrs = obj?.artists;
  const arr2 = Array.isArray(arrs) ? arrs : (arrs && Array.isArray(arrs.items) ? arrs.items : []);
  const nomes = (arr2 || []).map(a => a?.profile?.name || a?.name).filter(Boolean);
  return nomes.join(', ');
}

function vasculharFaixas(obj, saco, profundidade = 0) {
  if (!obj || typeof obj !== 'object' || profundidade > 14 || saco.length > 300) return;
  if (Array.isArray(obj)) {
    for (const it of obj) vasculharFaixas(it, saco, profundidade + 1);
    return;
  }
  // estilo faixa spotify (NEXT): uid/url uri spotify:track: + name + artists
  const nome = obj.name && String(obj.name);
  const artista = _artistas(obj);
  if (nome && artista && (obj.duration || obj.durationMs || obj.trackDuration || obj.uri || obj.url)) {
    const f = _faixa(nome, artista, obj.uri || '');
    if (f) saco.push(f);
  }
  for (const v of Object.values(obj)) {
    if (saco.length > 300) break;
    if (v && typeof v === 'object') vasculharFaixas(v, saco, profundidade + 1);
  }
}

/** Extrai __NEXT_DATA__/estado embebido e devolve { nome, faixas }. */
function colecaoDoHtml(html) {
  const saco = [];
  let nome = '';
  try {
    const m = String(html || '').match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (m) {
      const j = JSON.parse(m[1]);
      // nome da colecção (playlist/álbum)
      try {
        const stk = [j?.props?.pageProps?.state?.data?.entity, j];
        for (const s of stk) {
          const cand = s?.name || s?.data?.name || '';
          if (cand && typeof cand === 'string') { nome = cand; break; }
        }
      } catch {}
      vasculharFaixas(j, saco);
    }
  } catch {}
  if (!saco.length) {
    // queda-último: pares "name":"X","artists":[{"name":"A"}] no HTML cru
    for (const mm of String(html || '').matchAll(/"name":"([^"\\]{2,80})"\s*,?\s*"artists":\s*\[\s*\{[^}]*?"name":"([^"\\]{2,60})"/g)) {
      const f = _faixa(mm[1], mm[2]);
      if (f) saco.push(f);
      if (saco.length > 200) break;
    }
    const t = String(html).match(/<title>([^<]{2,120})<\/title>/i);
    if (t && !nome) nome = t[1].replace(/\s*\|\s*Spotify.*$/i, '').trim();
  }
  return { nome, faixas: normalizarFaixas(saco) };
}

// ── Resolução da colecção (máx diversidade de fontes) ─────────
/**
 * Tenta (1) api.spotifydown.com/trackList/<tipo>/<id> e (2) scrape da
 * página. Injecções p/ testes: fetchJson, fetchHtml.
 */
async function colecaoSpotify(url, { tipo, id } = {}, opts = {}) {
  const fJson = opts.fetchJson || ((u) => require('./mediaHandler').fetchJson(u, 25000));
  const fHtml = opts.fetchHtml || (async (u) => {
    const b = await require('./mediaHandler').fetchBuffer(u, 5, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36' },
      timeout: 30000,
    });
    return b ? String(b) : '';
  });

  // 1) spotifydown (quando está vivo) — vem estruturado
  try {
    const j = await fJson(`https://api.spotifydown.com/trackList/${tipo}/${id}`, 25000, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const arr = j?.trackList || j?.data?.trackList || j?.tracks || j?.items || [];
    if (Array.isArray(arr) && arr.length) {
      const nome = j?.metadata?.name || j?.name || '';
      const faixas = normalizarFaixas(arr.map(t => _faixa(
        t?.title || t?.name,
        t?.artists || t?.artist || (Array.isArray(t?.artists) ? t.artists.map(a => a?.name).join(', ') : ''),
        t?.id || ''
      )));
      if (faixas.length) return { nome, faixas, fonte: 'spotifydown' };
    }
  } catch {}

  // 2) scrape da página open.spotify.com
  try {
    const html = await fHtml(`https://open.spotify.com/${tipo}/${id}`);
    const r = colecaoDoHtml(html);
    if (r.faixas.length) return { ...r, fonte: 'open.spotify.com' };
  } catch {}

  throw new Error('Não consegui ler essa colecção do Spotify (pode ser privada ou a fonte estar em manutenção).');
}

module.exports = {
  NIVEIS, nivelDoComando, parseSpotifyLink,
  TIPOS_COLECAO, TIPOS_BLOQUEIO,
  normalizarFaixas, colecaoDoHtml, colecaoSpotify,
  MAX_FAIXAS: 20,
};
