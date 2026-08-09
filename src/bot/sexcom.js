/**
 * DARK BOT v7 — Sex.com Source
 * Busca fotos e vídeos do sex.com
 */
'use strict';

const axios = require('axios');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Filtro — exclui gay/trans
const BLOCKED = /gay|trans|travesti|travest|shemale|ladyboy|femboy|sissy|crossdress|homosexual/i;

function isFiltered(text) {
  return BLOCKED.test(String(text || ''));
}

/**
 * Busca imagens no sex.com
 * @param {string} query - termo de busca
 * @param {number} count - quantidade
 * @returns {Array} [{url, type, source}]
 */
async function searchImages(query, count = 5) {
  const r = await axios.get('https://api.sex.com/v1/search?q=' + encodeURIComponent(query), {
    headers: HEADERS, timeout: 15000,
  });
  const html = r.data;
  const results = [];
  const seen = new Set();

  // Imagens de thumbnails
  const imgRe = /src=\"(https:\/\/images\.sxccdn\.com\/[^\"]+\.(?:jpg|jpeg|png|webp)[^\"]*)\"/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null && results.length < count * 2) {
    const url = m[1];
    if (!url.includes('poster') && !url.includes('avatar') && !url.includes('logo') &&
        !url.includes('banner') && !url.includes('ads') && !seen.has(url)) {
      seen.add(url);
      results.push({ url, type: 'photo', source: 'sex.com' });
    }
  }

  // srcset (imagens maiores)
  const srcRe = /srcset=\"([^\"]+)\"/gi;
  while ((m = srcRe.exec(html)) !== null && results.length < count * 2) {
    const parts = m[1].split(',').map(s => s.trim());
    const largest = parts[parts.length - 1]?.split(' ')[0];
    if (largest && largest.includes('images.sxccdn.com') && !largest.includes('poster') && !seen.has(largest)) {
      seen.add(largest);
      results.push({ url: largest, type: 'photo', source: 'sex.com' });
    }
  }

  // Vídeos
  const vidRe = /(?:video_url|src|data-src)=\"(https?:\/\/[^\"]+\.mp4[^\"]*)\"/gi;
  while ((m = vidRe.exec(html)) !== null && results.length < count * 3) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      results.push({ url: m[1], type: 'video', source: 'sex.com' });
    }
  }

  return shuffle(results).slice(0, count);
}

/**
 * Busca vídeos no sex.com
 */
async function searchVideos(query, count = 3) {
  const r = await axios.get('https://api.sex.com/v1/search?q=' + encodeURIComponent(query + ' video'), {
    headers: HEADERS, timeout: 15000,
  });
  const html = r.data;
  const results = [];
  const seen = new Set();

  // Links de vídeo
  const linkRe = /href=\"(\/en\/videos\/\d+)\"/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null && results.length < count * 3) {
    const link = 'https://www.sex.com' + m[1];
    if (!seen.has(link)) {
      seen.add(link);
      results.push({ url: link, type: 'video-page', source: 'sex.com' });
    }
  }

  // Direct MP4 URLs
  const vidRe = /src=\"(https?:\/\/[^\"]+\.mp4[^\"]*)\"/gi;
  while ((m = vidRe.exec(html)) !== null && results.length < count * 2) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      results.push({ url: m[1], type: 'video', source: 'sex.com' });
    }
  }

  return shuffle(results).slice(0, count);
}

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { searchImages, searchVideos, isFiltered, shuffle };
