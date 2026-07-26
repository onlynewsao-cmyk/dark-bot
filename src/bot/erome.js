/**
 * DARK BOT v6.34 — EROME.COM API
 * Busca e download de fotos/vídeos por nome com quantidade
 */
'use strict';

const axios = require('axios');
const mediaHandler = require('../mediaHandler');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.erome.com/',
};

/**
 * Busca modelos/álbuns no erome.com
 * @param {string} query - nome para buscar
 * @returns {Array} resultados [{name, url, profileUrl}]
 */
async function search(query) {
  try {
    const r = await axios.get(`https://www.erome.com/search?q=${encodeURIComponent(query)}`, {
      headers: HEADERS, timeout: 15000,
    });
    const html = r.data;
    const results = [];

    // Parsear resultados da busca
    const regex = /<a[^>]*href="(https:\/\/www\.erome\.com\/a\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"/gi;
    let match;
    while ((match = regex.exec(html)) !== null && results.length < 20) {
      results.push({
        url: match[1],
        name: match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      });
    }

    // Fallback: parsear perfis
    if (!results.length) {
      const profileRegex = /<a[^>]*href="(https:\/\/www\.erome\.com\/[^/"]+)"[^>]*class="[^"]*avatar[^"]*"[^>]*>[\s\S]*?alt="([^"]*)"/gi;
      while ((match = profileRegex.exec(html)) !== null && results.length < 20) {
        results.push({
          url: match[1],
          name: match[2].replace(/&amp;/g, '&'),
          isProfile: true,
        });
      }
    }

    return results;
  } catch (e) {
    throw new Error('Erome search failed: ' + e.message);
  }
}

/**
 * Obtém mídias de um álbum/perfil erome
 * @param {string} url - URL do álbum ou perfil
 * @param {number} limit - quantidade máxima (default 10)
 * @returns {Object} { photos: [], videos: [], name: '' }
 */
async function getAlbum(url, limit = 10) {
  try {
    const r = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const html = r.data;
    const photos = [];
    const videos = [];

    // Fotos: <img src="..." class="img-fluid" data-src="...">
    const imgRegex = /(?:data-src|src)="(https:\/\/s\d+\.erome\.com\/[^"]+)"/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null && photos.length < limit) {
      const imgUrl = match[1];
      if (!imgUrl.includes('avatar') && !photos.includes(imgUrl)) {
        photos.push(imgUrl);
      }
    }

    // Vídeos: <source src="..." type="video/mp4">
    const vidRegex = /<source\s+src="(https:\/\/v\d+\.erome\.com\/[^"]+)"/gi;
    while ((match = vidRegex.exec(html)) !== null && videos.length < limit) {
      if (!videos.includes(match[1])) {
        videos.push(match[1]);
      }
    }

    // Nome do álbum
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const name = titleMatch ? titleMatch[1].replace(/ - Erome.*$/i, '').trim() : 'Erome';

    return { photos: photos.slice(0, limit), videos: videos.slice(0, limit), name };
  } catch (e) {
    throw new Error('Erome album failed: ' + e.message);
  }
}

/**
 * Busca e retorna mídias prontas para download
 * @param {string} query - nome para buscar
 * @param {number} limit - quantidade máxima de mídias
 * @returns {Object} { photos: [{url, buf}], videos: [{url, buf}], name }
 */
async function searchAndDownload(query, limit = 5) {
  const results = await search(query);
  if (!results.length) throw new Error('Nenhum resultado encontrado para: ' + query);

  // Pega o primeiro resultado e extrai mídias
  const album = await getAlbum(results[0].url, limit);
  const allMedia = [];

  // Download fotos
  for (const url of album.photos.slice(0, limit)) {
    try {
      const buf = await mediaHandler.fetchBuffer(url);
      if (buf && buf.length > 1000) {
        allMedia.push({ url, buf, type: 'photo' });
      }
    } catch {}
  }

  // Download vídeos
  for (const url of album.videos.slice(0, Math.max(0, limit - allMedia.length))) {
    try {
      const buf = await mediaHandler.fetchBuffer(url);
      if (buf && buf.length > 5000) {
        allMedia.push({ url, buf, type: 'video' });
      }
    } catch {}
  }

  return { media: allMedia, name: album.name, source: results[0].name };
}

module.exports = { search, getAlbum, searchAndDownload };
