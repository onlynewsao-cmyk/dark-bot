/**
 * DARK BOT v13.14 — AURA WEB SEARCH
 * 
 * Pesquisa real na web para a AURA não inventar factos.
 * Usa APIs gratuitas (sem key):
 *   1. Wikipedia REST API — factos fiáveis, em PT
 *   2. DuckDuckGo HTML — resultados web gerais
 *   3. YouTube search — vídeos
 *   4. Google News RSS — notícias em tempo real
 * 
 * Para downloads: reutiliza o sistema de downloads existente
 */
'use strict';

const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT = 12000;

// ═══════════════════════════════════════════════════════════════
// WIKIPEDIA — factos fiáveis, em português
// ═══════════════════════════════════════════════════════════════
async function wikiSearch(query, lang = 'pt') {
  try {
    // 1. Buscar artigo
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`;
    const searchData = await axios.get(searchUrl, { timeout: TIMEOUT, headers: { 'User-Agent': UA } });
    const results = searchData.data?.query?.search || [];
    if (!results.length) return null;

    const title = results[0].title;
    
    // 2. Obter resumo do artigo
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryData = await axios.get(summaryUrl, { timeout: TIMEOUT, headers: { 'User-Agent': UA } });
    const s = summaryData.data;
    
    if (!s || !s.extract) return null;

    return {
      tipo: 'wikipedia',
      titulo: s.title || title,
      resumo: s.extract || '',
      url: s.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      thumbnail: s.thumbnail?.source || null,
      snippet: results[0].snippet?.replace(/<[^>]*>/g, '') || '',
    };
  } catch (e) {
    console.log('[wikiSearch] erro:', e.message?.slice(0, 80));
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// DUCKDUCKGO — pesquisa web geral (scraping HTML)
// ═══════════════════════════════════════════════════════════════
async function duckduckgoSearch(query, maxResults = 5) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const r = await axios.get(url, { 
      timeout: TIMEOUT, 
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }
    });
    
    const html = String(r.data || '');
    const results = [];
    
    // Extrair resultados do HTML do DuckDuckGo
    const regex = /<a\s+class="result__a"\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null && results.length < maxResults) {
      const url = match[1].replace(/uddg=/, '').replace(/&amp;/g, '&');
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      const snippet = match[3].replace(/<[^>]*>/g, '').trim();
      if (title && snippet && url.startsWith('http')) {
        results.push({ titulo: title, snippet, url });
      }
    }
    
    return results.length ? results : null;
  } catch (e) {
    console.log('[duckduckgoSearch] erro:', e.message?.slice(0, 80));
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// YOUTUBE SEARCH — vídeos
// ═══════════════════════════════════════════════════════════════
async function youtubeSearch(query, maxResults = 3) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const r = await axios.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }
    });
    
    const html = String(r.data || '');
    const videos = [];
    
    // Extrair vídeo IDs e títulos do JSON embutido
    const ytInitialRegex = /var ytInitialData = (\{[\s\S]*?\});<\/script>/;
    const match = ytInitialRegex.exec(html);
    
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer
          ?.primaryContents?.sectionListRenderer?.contents?.[0]
          ?.itemSectionRenderer?.contents || [];
        
        for (const item of contents) {
          if (videos.length >= maxResults) break;
          const vr = item?.videoRenderer;
          if (!vr) continue;
          const videoId = vr.videoId;
          const title = vr.title?.runs?.[0]?.text || '';
          const channel = vr.ownerText?.runs?.[0]?.text || '';
          const views = vr.viewCountText?.simpleText || '';
          const thumbnail = vr.thumbnail?.thumbnails?.[vr.thumbnail.thumbnails.length - 1]?.url || '';
          
          if (videoId && title) {
            videos.push({
              tipo: 'youtube',
              titulo: title,
              canal: channel,
              views,
              url: `https://youtube.com/watch?v=${videoId}`,
              videoId,
              thumbnail,
            });
          }
        }
      } catch {}
    }
    
    return videos.length ? videos : null;
  } catch (e) {
    console.log('[youtubeSearch] erro:', e.message?.slice(0, 80));
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE NEWS — notícias em tempo real (via RSS)
// ═══════════════════════════════════════════════════════════════
async function googleNewsSearch(query, lang = 'pt', maxResults = 5) {
  try {
    // Google News RSS — sem API key
    const regionMap = { pt: 'PT', br: 'BR', ao: 'AO' };
    const region = regionMap[lang] || 'PT';
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}&gl=${region}&ceid=${region}:${lang}`;
    
    const r = await axios.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': UA }
    });
    
    const xml = String(r.data || '');
    const noticias = [];
    
    // Parse XML simples
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    let itemMatch;
    
    while ((itemMatch = itemRegex.exec(xml)) !== null && noticias.length < maxResults) {
      const item = itemMatch[0];
      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(item);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(item);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(item);
      const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(item);
      
      if (titleMatch && linkMatch) {
        noticias.push({
          titulo: titleMatch[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
          url: linkMatch[1].trim(),
          data: pubDateMatch?.[1] || '',
          fonte: sourceMatch?.[1] || '',
        });
      }
    }
    
    return noticias.length ? noticias : null;
  } catch (e) {
    console.log('[googleNewsSearch] erro:', e.message?.slice(0, 80));
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH MASTER — decide qual usar baseado no tipo de query
// ═══════════════════════════════════════════════════════════════
async function searchMaster(query, opts = {}) {
  const {
    tipo = 'auto', // auto | wiki | web | youtube | news | tudo
    lang = 'pt',
    maxResults = 5,
  } = opts;

  const resultados = { query, timestamp: new Date().toISOString() };

  // Wikipedia sempre — mais fiável para factos
  if (tipo === 'auto' || tipo === 'wiki' || tipo === 'tudo') {
    const wiki = await wikiSearch(query, lang);
    if (wiki) resultados.wikipedia = wiki;
  }

  // Web geral
  if (tipo === 'auto' || tipo === 'web' || tipo === 'tudo') {
    const web = await duckduckgoSearch(query, maxResults);
    if (web) resultados.web = web;
  }

  // YouTube
  if (tipo === 'auto' || tipo === 'youtube' || tipo === 'tudo') {
    const yt = await youtubeSearch(query, Math.min(3, maxResults));
    if (yt) resultados.youtube = yt;
  }

  // Notícias
  if (tipo === 'auto' || tipo === 'news' || tipo === 'tudo') {
    const news = await googleNewsSearch(query, lang, maxResults);
    if (news) resultados.noticias = news;
  }

  return resultados;
}

// ═══════════════════════════════════════════════════════════════
// FORMATAÇÃO — prepara para resposta WhatsApp
// ═══════════════════════════════════════════════════════════════
function formatarParaWA(resultados, maxWeb = 3) {
  const linhas = [];
  
  if (resultados.wikipedia) {
    const w = resultados.wikipedia;
    linhas.push(`📚 *${w.titulo}*`);
    linhas.push(w.resumo.slice(0, 300) + (w.resumo.length > 300 ? '...' : ''));
    if (w.url) linhas.push(`🔗 ${w.url}`);
    linhas.push('');
  }

  if (resultados.noticias?.length) {
    linhas.push('📰 *Notícias recentes:*');
    for (const n of resultados.noticias.slice(0, maxWeb)) {
      linhas.push(`• *${n.titulo}*`);
      if (n.fonte) linhas.push(`  _${n.fonte}_`);
    }
    linhas.push('');
  }

  if (resultados.web?.length) {
    linhas.push('🔍 *Resultados web:*');
    for (const r of resultados.web.slice(0, maxWeb)) {
      linhas.push(`• *${r.titulo}*`);
      if (r.snippet) linhas.push(`  _${r.snippet.slice(0, 120)}_`);
    }
    linhas.push('');
  }

  if (resultados.youtube?.length) {
    linhas.push('🎬 *Vídeos:*');
    for (const v of resultados.youtube.slice(0, maxWeb)) {
      linhas.push(`• *${v.titulo}*`);
      if (v.canal) linhas.push(`  _${v.canal}_`);
    }
    linhas.push('');
  }

  if (!resultados.wikipedia && !resultados.noticias?.length && 
      !resultados.web?.length && !resultados.youtube?.length) {
    return `🔍 Não encontrei resultados para "${resultados.query}".`;
  }

  return linhas.join('\n');
}

module.exports = {
  wikiSearch,
  duckduckgoSearch,
  youtubeSearch,
  googleNewsSearch,
  searchMaster,
  formatarParaWA,
};
