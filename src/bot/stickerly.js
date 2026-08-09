/**
 * DARK BOT v6.36 — STICKER.LY API
 * Busca e download de packs de stickers do sticker.ly
 */
'use strict';

const axios = require('axios');
const mediaHandler = require('../mediaHandler');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://sticker.ly/',
};

/**
 * Busca packs no sticker.ly
 * @param {string} query - termo de busca
 * @returns {Array} packs [{id, title, author, stickerCount, url}]
 */
async function searchPacks(query) {
  try {
    const r = await axios.get(`https://sticker.ly/api/search/packs?q=${encodeURIComponent(query)}&offset=0&limit=10`, {
      headers: HEADERS, timeout: 15000,
    });
    const packs = r.data?.data?.packs || r.data?.packs || [];
    return packs.map(p => ({
      id: p.id || p.packId,
      title: p.title || p.name || 'Sem nome',
      author: p.author?.name || p.authorName || 'Desconhecido',
      stickerCount: p.stickerCount || p.stickers?.length || 0,
      url: `https://sticker.ly/p/${p.id || p.packId}`,
      thumbnail: p.thumbnail || p.coverImage || null,
    }));
  } catch (e) {
    // Fallback: scrape HTML
    try {
      const r = await axios.get(`https://sticker.ly/s/${encodeURIComponent(query)}`, {
        headers: { ...HEADERS, Accept: 'text/html' }, timeout: 15000,
      });
      const html = r.data;
      const results = [];
      const regex = /\/p\/(\d+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]*?(\d+)\s*stickers/gi;
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 10) {
        results.push({
          id: match[1],
          title: match[2].trim(),
          author: 'Desconhecido',
          stickerCount: parseInt(match[3]) || 0,
          url: `https://sticker.ly/p/${match[1]}`,
        });
      }
      return results;
    } catch { return []; }
  }
}

/**
 * Obtém stickers de um pack
 * @param {string|number} packId - ID do pack
 * @returns {Object} { title, author, stickers: [{url, isAnimated}] }
 */
async function getPack(packId) {
  try {
    const r = await axios.get(`https://sticker.ly/api/packs/${packId}`, {
      headers: HEADERS, timeout: 15000,
    });
    const pack = r.data?.data || r.data;
    const stickers = (pack.stickers || []).map(s => ({
      url: s.image || s.url || s.animatedImage || s.staticImage,
      isAnimated: !!(s.animatedImage || s.isAnimated),
      emoji: s.emoji || '',
    }));
    return {
      title: pack.title || pack.name || 'Pack',
      author: pack.author?.name || pack.authorName || 'Desconhecido',
      stickers,
    };
  } catch (e) {
    throw new Error('sticker.ly pack failed: ' + e.message);
  }
}

/**
 * Busca pack e retorna stickers prontos para download
 * @param {string} query - termo de busca
 * @param {number} limit - máximo de stickers
 * @returns {Object} { pack, stickers: [{url, buf, isAnimated}] }
 */
async function searchAndDownload(query, limit = 30) {
  const packs = await searchPacks(query);
  if (!packs.length) throw new Error('Nenhum pack encontrado para: ' + query);

  const pack = await getPack(packs[0].id);
  const stickers = [];

  for (const s of pack.stickers.slice(0, limit)) {
    try {
      const buf = await mediaHandler.fetchBuffer(s.url);
      if (buf && buf.length > 500) {
        stickers.push({ url: s.url, buf, isAnimated: s.isAnimated });
      }
    } catch {}
  }

  return { pack: packs[0], stickers, title: pack.title, author: pack.author };
}

module.exports = { searchPacks, getPack, searchAndDownload };
