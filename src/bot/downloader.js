/**
 * Downloader v5.0 — Multi-API com fallbacks robustos
 * APIs: yt-search + ytmp3 + cobalt + savefrom + yts + ryzendesu
 */
const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');
const { execSync } = require('child_process');

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
      duration: v.timestamp || '',
      author:   v.author?.name || v.author || '',
      views:    v.views || 0,
    };
  }
  throw new Error(`🔍 Não encontrei "${query}" no YouTube.`);
}

// ==================== YOUTUBE AUDIO ==================== ✅
// !play — Multi-API com fallbacks
async function youtubeAudio(query) {
  const search = await youtubeSearch(query);
  const apis = [
    // API 1: Decidyril v2
    { url: `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(search.url)}`, name: 'davidcyril' },
    // API 2: Ryzendesu v2
    { url: `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(search.url)}`, name: 'ryzendesu' },
    // API 3: Siputzx stable
    { url: `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(search.url)}`, name: 'siputzx' },
    // API 4: Vreden Pro
    { url: `https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(search.url)}`, name: 'vreden' },
  ];

  for (const { url, name } of apis) {
    try {
      const r = await mediaHandler.fetchJson(url);
      const u = r?.result?.download_url || r?.result?.url || r?.data?.url || r?.download_url || r?.url || r?.audio?.url || r?.result?.audio;
      if (u && typeof u === 'string' && u.startsWith('http')) {
        // Validação básica se é link de arquivo (não uma página html)
        if (u.includes('.html') || u.includes('youtube.com/watch')) continue;
        
        return {
          title:    r?.result?.title    || r?.title    || search.title,
          duration: r?.result?.duration || r?.duration || search.duration || '',
          author:   r?.result?.author   || r?.author   || search.author   || '',
          thumb:    r?.result?.thumbnail || r?.thumbnail || r?.result?.thumb || search.thumb || '',
          url: u,
        };
      }
    } catch (e) {}
  }
  throw new Error('❌ Nenhuma API entregou o arquivo de áudio. Tente novamente mais tarde.');
}

// ==================== YOUTUBE VIDEO HD ==================== ✅
async function youtubeVideo(query) {
  const search = await youtubeSearch(query);
  const apis = [
    { url: `https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(search.url)}`, name: 'davidcyril' },
    { url: `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${encodeURIComponent(search.url)}`, name: 'ryzendesu' },
    { url: `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(search.url)}`, name: 'siputzx' },
  ];

  for (const { url, name } of apis) {
    try {
      const r = await mediaHandler.fetchJson(url);
      const u = r?.result?.download_url || r?.result?.url || r?.data?.url || r?.url || r?.video?.url || r?.result?.video;
      if (u && typeof u === 'string' && u.startsWith('http')) {
        if (u.includes('.html')) continue;
        return {
          title: r?.result?.title || search.title,
          duration: r?.result?.duration || search.duration || '',
          thumb: r?.result?.thumbnail || search.thumb || '',
          quality: r?.result?.quality || '720p',
          url: u,
        };
      }
    } catch (e) {}
  }
  throw new Error('❌ Nenhuma API entregou o arquivo de vídeo.');
}

// !video2 — 1080p / alta qualidade via SaveFrom → cobalt
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
      for (const q of ['1080','720','480','360']) {
        const mp4 = s?.mp4?.[q];
        if (mp4?.url && !mp4.url.includes('#local'))
          return { title, duration: dur, thumb, quality: q + 'p', url: mp4.url };
        if (mp4?.streams?.[0])
          return { title, duration: dur, thumb, quality: q + 'p', url: `https://worker.sf-tools.com${mp4.streams[0]}` };
      }
    }
  } catch (e) {}

  // Fallback: Cobalt (MP4 direto, geralmente H.264)
  try {
    const r = await mediaHandler.fetchJson(`https://co.wuk.sh/api/json?url=${encodeURIComponent(search.url)}&vQuality=1080&isAudioOnly=false`);
    if (r?.url) return { title: search.title, quality: '1080p', url: r.url };
  } catch (e) {}

  // Fallback final: video padrão
  return youtubeVideo(query);
}

// ==================== TIKTOK ==================== ✅
async function tiktok(url) {
  return tryApis([
    { url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, name: 'tikwm' },
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
        }
      }
    } catch (e) {}
    throw new Error(`🔍 Não encontrei "${query}" no SoundCloud.`);
  }

  return tryApis([
    { url: `https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(query)}`, name: 'siputzx' },
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

async function pinterestSearch(query, count = 1) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, name: 'siputzx' },
    { url: `https://api.ryzendesu.vip/api/search/pinterest?query=${encodeURIComponent(query)}`, name: 'ryzendesu' },
  ], r => {
    const arr = r?.data || r?.result || r?.results;
    if (Array.isArray(arr) && arr.length) {
      const imgs = arr.filter(p => (p.image_url || p.image || p.url || p.src || p)?.toString().includes('pinimg.com'));
      const pool = imgs.length ? imgs : arr;
      // Retorna até 'count' imagens
      const results = [];
      const shuffled = pool.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const pick = shuffled[i];
        const u = typeof pick === 'string' ? pick : (pick.image_url || pick.image || pick.url || pick.src || pick.download_url || pick.media_url);
        if (u && u.startsWith('http')) results.push({ url: u });
      }
      if (results.length) return count === 1 ? results[0] : results;
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


async function apkDownload(query) {
  const apis = [
    { url: `https://api.ryzendesu.vip/api/downloader/apk?query=${encodeURIComponent(query)}`, name: 'ryzendesu' },
    { url: `https://api.siputzx.my.id/api/d/apk?query=${encodeURIComponent(query)}`, name: 'siputzx' },
  ];
  
  for (const {url,name} of apis) {
    try {
      const r = await mediaHandler.fetchJson(url);
      const app = r?.result || r?.data;
      if (app && (app.download_url || app.url || app.link)) {
        const dUrl = app.download_url || app.url || app.link;
        if (dUrl.startsWith('http')) {
          return { 
            title: app.name || app.title || query, 
            url: dUrl, 
            size: app.size || '', 
            version: app.version || '', 
            source: name 
          };
        }
      }
    } catch(e) {}
  }
  
  throw new Error('APK não encontrado ou link direto indisponível.');
}

module.exports = {
  youtubeAudio, youtubeAudioSavefrom, youtubeAudioAuto,
  youtubeVideo, youtubeVideoSavefrom, youtubeSearch,
  tiktok, instagram, facebook, twitter,
  spotify, soundcloud, pinterest, pinterestSearch,
  mediafire, liteapks, apkDownload,
};
