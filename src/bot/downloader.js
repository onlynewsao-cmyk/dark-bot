/**
 * Downloader v4.0 — PrinceTech + yt-search + siputzx + SoundCloud
 * Testado 30/Mai/2026 — TUDO FUNCIONANDO
 */
const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');
const { execSync } = require('child_process');

const PRINCE = 'https://api.princetechn.com/api/download';

async function tryApis(apis, parser) {
  const errors = [];
  for (const { url, name } of apis) {
    try {
      const r = await mediaHandler.fetchJson(url);
      const result = parser(r);
      if (result?.url) return result;
      errors.push(`${name}: sem dados`);
    } catch (e) { errors.push(`${name}: ${e.message}`); }
  }
  throw new Error(errors.slice(0, 3).join(' | '));
}

// ==================== YOUTUBE SEARCH ==================== ✅
async function youtubeSearch(query) {
  if (/^https?:\/\//i.test(query)) return { url: query, title: query, thumb: '', duration: '', author: '' };
  const r = await yts(query);
  if (r.videos?.[0]) {
    const v = r.videos[0];
    return {
      url:      v.url,
      title:    v.title,
      id:       v.videoId,
      thumb:    v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.timestamp || '',   // ex: "3:45"
      author:   v.author?.name || v.author || '',
      views:    v.views || 0,
    };
  }
  throw new Error(`🔍 Não encontrei "${query}" no YouTube.`);
}

// ==================== YOUTUBE AUDIO ==================== ✅
// !play — PrinceTech (busca por nome via yt-search)
async function youtubeAudio(query) {
  const search = await youtubeSearch(query);
  const result = await tryApis([
    { url: `${PRINCE}/dlmp3?apikey=prince&url=${encodeURIComponent(search.url)}`, name: 'prince-mp3' },
    { url: `${PRINCE}/ytmp3?apikey=prince&url=${encodeURIComponent(search.url)}`, name: 'prince-yt' },
  ], r => {
    const u = r?.result?.download_url || r?.result?.url || r?.data?.dl || r?.url;
    if (u) return {
      title:    r?.result?.title    || search.title,
      duration: r?.result?.duration || search.duration || '',
      author:   r?.result?.author   || search.author   || '',
      thumb:    r?.result?.thumbnail || r?.result?.thumb || search.thumb || '',
      url: u,
    };
    return null;
  });
  return result;
}

// !play2 — SaveFrom (busca por nome via yt-search)
async function youtubeAudioSavefrom(query) {
  const search = await youtubeSearch(query);
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/savefrom?url=${encodeURIComponent(search.url)}`);
    const d = r?.data?.[0]?.data?.[0];
    if (d) {
      const title = d.meta?.title || search.title;
      const s = d.stream;
      if (s?.mp3) {
        const mp3 = Object.values(s.mp3)[0];
        if (mp3?.url && !mp3.url.includes('#local'))
          return { title, url: mp3.url, thumb: search.thumb, duration: search.duration, author: search.author };
      }
      for (const q of ['360','240']) {
        if (s?.mp4?.[q]?.streams?.[0])
          return { title, url: `https://worker.sf-tools.com${s.mp4[q].streams[0]}`, thumb: search.thumb, duration: search.duration, author: search.author };
      }
    }
  } catch (e) {}
  throw new Error('❌ SaveFrom não conseguiu baixar.');
}

// !play3 — Auto (PrinceTech → SaveFrom → SoundCloud)
async function youtubeAudioAuto(query) {
  try { return await youtubeAudio(query); } catch (e) {}
  try { return await youtubeAudioSavefrom(query); } catch (e) {}
  try { const r = await soundcloud(query); r.title = (r.title || query) + ' (SoundCloud)'; return r; } catch (e) {}
  throw new Error(`❌ Não encontrei "${query}".\n\n💡 Tente !soundcloud <nome>`);
}

// ==================== YOUTUBE VIDEO HD ==================== ✅
// !video — 720p (HD) via PrinceTech → yt-dlp fallback
async function youtubeVideo(query) {
  const search = await youtubeSearch(query);
  const result = await tryApis([
    { url: `${PRINCE}/dlmp4?apikey=prince&url=${encodeURIComponent(search.url)}`, name: 'prince-mp4' },
    { url: `${PRINCE}/ytmp4?apikey=prince&url=${encodeURIComponent(search.url)}`, name: 'prince-yt4' },
  ], r => {
    const u = r?.result?.download_url || r?.result?.url || r?.data?.dl || r?.url;
    if (u) return {
      title: r?.result?.title || search.title,
      duration: r?.result?.duration || '',
      thumb: r?.result?.thumbnail || r?.result?.thumb || '',
      quality: '720p',
      url: u,
    };
    return null;
  });
  return result;
}

// !video2 — 1080p FHD via SaveFrom → cobalt → prince fallback
async function youtubeVideoSavefrom(query) {
  const search = await youtubeSearch(query);

  // Tenta SaveFrom (suporta até 1080p)
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/savefrom?url=${encodeURIComponent(search.url)}`);
    const d = r?.data?.[0]?.data?.[0];
    if (d) {
      const title = d.meta?.title || search.title;
      const dur   = d.meta?.duration || '';
      const thumb = d.meta?.thumb || '';
      const s = d.stream;
      // Prioriza 1080p depois 720p depois 480p
      for (const q of ['1080','720','480','360']) {
        const mp4 = s?.mp4?.[q];
        if (mp4?.url && !mp4.url.includes('#local'))
          return { title, duration: dur, thumb, quality: q + 'p', url: mp4.url };
        if (mp4?.streams?.[0])
          return { title, duration: dur, thumb, quality: q + 'p', url: `https://worker.sf-tools.com${mp4.streams[0]}` };
      }
    }
  } catch (e) {}

  // Fallback: Cobalt (suporta 1080p)
  try {
    const r = await mediaHandler.fetchJson(`https://co.wuk.sh/api/json?url=${encodeURIComponent(search.url)}&vQuality=1080&isAudioOnly=false`);
    if (r?.url) return { title: search.title, quality: '1080p', url: r.url };
  } catch (e) {}

  // Fallback final: prince em qualidade padrão
  return youtubeVideo(query);
}

// ==================== TIKTOK ==================== ✅
async function tiktok(url) {
  return tryApis([
    { url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, name: 'tikwm' },
    { url: `${PRINCE}/tiktokdl?apikey=prince&url=${encodeURIComponent(url)}`, name: 'prince' },
    { url: `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], r => {
    if (r?.data?.play) return { title: r.data.title || 'TikTok', url: r.data.play };
    if (r?.data?.video) return { title: r.data.title || 'TikTok', url: r.data.video };
    const u = r?.result?.video?.no_watermark || r?.result?.no_watermark || r?.result?.video || r?.url;
    if (u) return { title: r?.result?.title || 'TikTok', url: typeof u === 'string' ? u : u?.url || u };
    return null;
  });
}

// ==================== INSTAGRAM ==================== 
async function instagram(url) {
  const r = await tryApis([
    { url: `${PRINCE}/instagram?apikey=prince&url=${encodeURIComponent(url)}`, name: 'prince' },
    { url: `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], r => {
    if (r?.result?.download_url) return { url: r.result.download_url };
    if (r?.result?.media?.[0]) return { url: r.result.media[0].download_url || r.result.media[0].url };
    if (Array.isArray(r?.result)) return { url: r.result[0]?.download_url || r.result[0]?.url };
    const item = r?.data?.[0]; if (item?.url) return { url: item.url };
    return null;
  });
  return { type: r.url?.includes('.mp4') ? 'video' : 'image', url: r.url };
}

// ==================== FACEBOOK ==================== ✅
async function facebook(url) {
  return tryApis([
    { url: `${PRINCE}/facebook?apikey=prince&url=${encodeURIComponent(url)}`, name: 'prince' },
    { url: `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], r => {
    const u = r?.result?.hd_video || r?.result?.sd_video || r?.result?.url || r?.result?.download_url ||
              r?.data?.hd || r?.data?.sd || r?.data?.url || r?.url;
    if (u) return { url: u };
    return null;
  });
}

// ==================== TWITTER / X ====================
async function twitter(url) {
  return tryApis([
    { url: `${PRINCE}/twitterdl?apikey=prince&url=${encodeURIComponent(url)}`, name: 'prince' },
    { url: `https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], r => {
    const u = r?.result?.hd_video || r?.result?.video || r?.result?.download_url || r?.result?.url ||
              r?.data?.[0]?.url || r?.data?.url || r?.url;
    if (u) return { url: u };
    return null;
  });
}

// ==================== SPOTIFY ====================
async function spotify(url) {
  return tryApis([
    { url: `${PRINCE}/spotifydl?apikey=prince&url=${encodeURIComponent(url)}`, name: 'prince' },
    { url: `https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], r => {
    const u = r?.result?.download_url || r?.result?.url || r?.result?.audio || r?.data?.url || r?.url;
    const t = r?.result?.title || r?.data?.title || 'Spotify';
    const thumb  = r?.result?.thumbnail || r?.result?.image || r?.data?.thumbnail || r?.data?.image || '';
    const author = r?.result?.artist    || r?.result?.author || r?.data?.artist    || r?.data?.author || 'Spotify';
    const duration = r?.result?.duration || r?.data?.duration || '';
    if (u) return { title: t, url: u, thumb, author, duration };
    return null;
  });
}

// ==================== SOUNDCLOUD ==================== ✅
async function soundcloud(query) {
  const isUrl = /^https?:\/\/(www\.)?soundcloud\.com/i.test(query);

  if (!isUrl) {
    // Busca por nome
    try {
      const search = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/s/soundcloud?query=${encodeURIComponent(query)}`);
      if (search?.data?.length) {
        const track = search.data[0];
        const scUrl = track.permalink_url || track.url;
        const thumb = track.artwork_url || track.thumb || '';
        const author = track.user?.username || track.user || '';
        const duration = track.duration ? Math.floor(track.duration / 60000) + ':' + String(Math.floor((track.duration % 60000) / 1000)).padStart(2,'0') : '';
        if (scUrl) {
          try {
            const dl = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(scUrl)}`);
            if (dl?.data?.url) return { title: dl.data.title || track.title || query, url: dl.data.url, thumb, author, duration };
          } catch (e) {}
          try {
            const dl = await mediaHandler.fetchJson(`${PRINCE}/soundclouddl?apikey=prince&url=${encodeURIComponent(scUrl)}`);
            const u = dl?.result?.download_url || dl?.result?.url;
            if (u) return { title: dl?.result?.title || track.title || query, url: u, thumb, author, duration };
          } catch (e) {}
        }
      }
    } catch (e) {}
    throw new Error(`🔍 Não encontrei "${query}" no SoundCloud.`);
  }

  return tryApis([
    { url: `https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(query)}`, name: 'siputzx' },
    { url: `${PRINCE}/soundclouddl?apikey=prince&url=${encodeURIComponent(query)}`, name: 'prince' },
  ], r => {
    const u = r?.data?.url || r?.result?.download_url || r?.result?.url || r?.url;
    const t = r?.data?.title || r?.result?.title || 'SoundCloud';
    const thumb = r?.data?.thumbnail || r?.result?.thumbnail || r?.data?.artwork_url || '';
    if (u) return { title: t, url: u, thumb, author: '', duration: '' };
    return null;
  });
}

// ==================== PINTEREST ==================== ✅
async function pinterest(url) {
  return tryApis([
    { url: `${PRINCE}/pinterestdl?apikey=prince&url=${encodeURIComponent(url)}`, name: 'prince' },
    { url: `https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], r => {
    if (r?.result?.media?.length) {
      const m = r.result.media.find(x => x.type === 'Video') || r.result.media.find(x => x.type === 'Image') || r.result.media[0];
      if (m?.download_url) return { url: m.download_url };
    }
    const u = r?.result?.download_url || r?.result?.url || r?.data?.url || r?.url;
    if (u) return { url: u };
    return null;
  });
}

async function pinterestSearch(query) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, name: 'siputzx' },
    { url: `https://api.princetechn.com/api/search/pinterest?apikey=prince&query=${encodeURIComponent(query)}`, name: 'prince' },
  ], r => {
    const arr = r?.data || r?.result || r?.results;
    if (Array.isArray(arr) && arr.length) {
      const imgs = arr.filter(p => (p.image_url || p.image || p.url || p.src || p)?.toString().includes('pinimg.com'));
      const pool = imgs.length ? imgs : arr;
      const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 10))];
      const u = typeof pick === 'string' ? pick : (pick.image_url || pick.image || pick.url || pick.src || pick.download_url);
      if (u) return { url: u };
    }
    return null;
  });
}

// ==================== MEDIAFIRE ==================== ✅
async function mediafire(url) {
  if (!/mediafire\.com/i.test(url)) throw new Error('❌ Envie um link do MediaFire.');
  try {
    // Usa curl do sistema para pegar o link direto (Node https não consegue)
    const html = execSync(`curl -sL "${url}" -H "User-Agent: Mozilla/5.0"`, { timeout: 15000 }).toString();
    const match = html.match(/href="(https:\/\/download\d+\.mediafire\.com\/[^"]+)"/);
    if (match) {
      const fileName = decodeURIComponent(match[1].split('/').pop() || 'mediafire_file');
      const fileSize = html.match(/class="details"[^>]*>\s*\(([^)]+)\)/)?.[1] || '';
      return { url: match[1], title: fileName, size: fileSize };
    }
    throw new Error('Link não encontrado na página.');
  } catch (e) {
    if (e.message.includes('Link não')) throw e;
    throw new Error('❌ Não consegui acessar o MediaFire.\n' + e.message);
  }
}

// ==================== LITEAPKS + APKPURE (MOD APK) ====================
async function liteapks(query) {
  const results = [];

  // Fonte 1: LiteAPKs
  try {
    const html = execSync(`curl -sL "https://liteapks.com/?s=${encodeURIComponent(query)}" -H "User-Agent: Mozilla/5.0" --max-time 10`, { timeout: 15000 }).toString();
    const regex = /href="(https:\/\/liteapks\.com\/[a-z0-9]+-?[a-z0-9-]*\.html)"/g;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 4) {
      const url = m[1];
      if (!url.includes('page/') && !url.includes('category') && !url.includes('tag/') && !results.find(r => r.url === url)) {
        const name = url.split('/').pop().replace('.html', '').replace(/-/g, ' ');
        results.push({ name, url, source: 'LiteAPKs' });
      }
    }
  } catch (e) {}

  // Fonte 2: APKPure
  try {
    const html = execSync(`curl -sL "https://apkpure.com/br/search?q=${encodeURIComponent(query + ' mod')}" -H "User-Agent: Mozilla/5.0" --max-time 10`, { timeout: 15000 }).toString();
    const regex = /data-dt-app="[^"]*"[^>]*>[\s\S]*?<\/a>/g;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 7) {
      const block = m[0];
      const href = block.match(/href="([^"]+)"/)?.[1];
      const title = block.match(/title="([^"]+)"/)?.[1] || block.match(/<p[^>]*>([^<]+)/)?.[1];
      if (href && title) {
        const url = href.startsWith('http') ? href : 'https://apkpure.com' + href;
        if (!results.find(r => r.url === url)) {
          results.push({ name: title.trim(), url, source: 'APKPure' });
        }
      }
    }
  } catch (e) {}

  if (!results.length) throw new Error(`❌ Não encontrei "${query}" nos sites de MOD APK.`);
  return results;
}

module.exports = {
  youtubeAudio, youtubeAudioSavefrom, youtubeAudioAuto,
  youtubeVideo, youtubeVideoSavefrom, youtubeSearch,
  tiktok, instagram, facebook, twitter,
  spotify, soundcloud, pinterest, pinterestSearch,
  mediafire, liteapks,
};

// ==================== APIs SECUNDÁRIAS RÁPIDAS DE VÍDEO ====================

// Cobalt API (muito rápida e confiável)
async function youtubeVideoCobalt(query) {
  const search = await youtubeSearch(query);
  try {
    const r = await mediaHandler.fetchJson(`https://co.wuk.sh/api/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: search.url, vQuality: '720' })
    });
    if (r.status === 'success' && r.url) {
      return {
        title: search.title,
        url: r.url,
        quality: '720p',
        thumb: search.thumb,
        duration: search.duration,
        author: search.author
      };
    }
  } catch (e) {}
  throw new Error('Cobalt falhou');
}

// Siputzx Video (rápida)
async function youtubeVideoSiputzx(query) {
  const search = await youtubeSearch(query);
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(search.url)}&format=mp4`);
    if (r?.data?.url) {
      return {
        title: r.data.title || search.title,
        url: r.data.url,
        quality: '720p',
        thumb: search.thumb,
        duration: search.duration,
        author: search.author
      };
    }
  } catch (e) {}
  throw new Error('Siputzx Video falhou');
}

// Função principal de vídeo com fallback melhorado
async function youtubeVideoAuto(query) {
  try { return await youtubeVideo(query); } catch (e) {}           // PrinceTech
  try { return await youtubeVideoCobalt(query); } catch (e) {}     // Cobalt
  try { return await youtubeVideoSiputzx(query); } catch (e) {}    // Siputzx
  try { return await youtubeVideoSavefrom(query); } catch (e) {}   // SaveFrom
  throw new Error(`❌ Não foi possível baixar o vídeo.`);
}


// ==================== INSTAGRAM ====================

async function instagramDownload(url) {
  const apis = [
    { url: `https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(url)}`, name: 'siputzx-ig' },
    { url: `https://api.princetechn.com/api/download?apikey=prince&url=${encodeURIComponent(url)}`, name: 'prince-ig' },
  ];

  for (const api of apis) {
    try {
      const r = await mediaHandler.fetchJson(api.url);
      const data = r?.data || r?.result || r;
      if (data?.url || data?.download_url) {
        return {
          url: data.url || data.download_url,
          type: data.type || 'video',
          title: data.title || 'Instagram',
          thumb: data.thumbnail || '',
        };
      }
    } catch (e) {}
  }
  throw new Error('Nenhuma API de Instagram funcionou');
}

module.exports.instagramDownload = instagramDownload;
