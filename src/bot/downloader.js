/**
 * Downloader v3.0 — APIs testadas (30/Mai/2026)
 */
const mediaHandler = require('./mediaHandler');

async function tryApis(apis, parser) {
  const errors = [];
  for (const { url, name } of apis) {
    try {
      const r = await mediaHandler.fetchJson(url);
      const result = parser(r);
      if (result) return result;
      errors.push(`${name}: sem dados`);
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }
  throw new Error('Nenhuma API disponível.\n' + errors.slice(0, 3).join('\n'));
}

// ==================== YOUTUBE ====================

// Search ✅ testado
async function youtubeSearch(query) {
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(query)}`);
    if (r?.data?.length) {
      const video = r.data.find(v => v.type === 'video') || r.data[0];
      return { id: video.videoId, url: video.url, title: video.title, thumbnail: video.thumbnail };
    }
  } catch (e) {}
  try {
    const r = await mediaHandler.fetchJson(`https://api.popcat.xyz/youtube?q=${encodeURIComponent(query)}`);
    if (r?.url) return { url: r.url, title: r.title || query };
  } catch (e) {}
  throw new Error(`🔍 Não encontrei "${query}" no YouTube.`);
}

/**
 * youtubeAudio — busca por nome via YouTube Search, depois baixa via SaveFrom
 * Usado no !play (funciona com nome ou link)
 */
async function youtubeAudio(query) {
  const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(query);
  let url = query;
  let title = query;

  if (!isUrl) {
    const search = await youtubeSearch(query);
    url = search.url || `https://www.youtube.com/watch?v=${search.id}`;
    title = search.title || query;
  }

  return youtubeDownloadSavefrom(url, title, 'audio');
}

async function youtubeVideo(query) {
  const isUrl = /^https?:\/\//.test(query);
  let url = query;
  let title = query;

  if (!isUrl) {
    const search = await youtubeSearch(query);
    url = search.url || `https://www.youtube.com/watch?v=${search.id}`;
    title = search.title || query;
  }

  return youtubeDownloadSavefrom(url, title, 'video');
}

/**
 * youtubeAudioSavefrom — SaveFrom com busca por nome OU link
 * Usado no !play2
 */
async function youtubeAudioSavefrom(query) {
  const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(query);
  let url = query;
  let title = query;

  if (!isUrl) {
    const search = await youtubeSearch(query);
    url = search.url || `https://www.youtube.com/watch?v=${search.id}`;
    title = search.title || query;
  }

  return youtubeDownloadSavefrom(url, title, 'audio');
}

async function youtubeVideoSavefrom(query) {
  const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(query);
  let url = query;
  let title = query;

  if (!isUrl) {
    const search = await youtubeSearch(query);
    url = search.url || `https://www.youtube.com/watch?v=${search.id}`;
    title = search.title || query;
  }

  return youtubeDownloadSavefrom(url, title, 'video');
}

/**
 * youtubeAudioAuto — Tenta YouTube, se falhar tenta SoundCloud
 * Usado no !play3
 */
async function youtubeAudioAuto(query) {
  // Tenta YouTube primeiro
  try {
    return await youtubeAudio(query);
  } catch (e) {}

  // Tenta SaveFrom
  try {
    return await youtubeAudioSavefrom(query);
  } catch (e) {}

  // Fallback: busca no SoundCloud
  try {
    const result = await soundcloud(query);
    result.title = result.title + ' (SoundCloud)';
    return result;
  } catch (e) {}

  throw new Error(`❌ Não encontrei "${query}" em nenhuma plataforma.\n\n💡 Tente:\n▸ !play2 <nome>\n▸ !soundcloud <nome>\n▸ !play <link direto>`);
}

/**
 * Core SaveFrom downloader ✅ testado
 */
async function youtubeDownloadSavefrom(url, fallbackTitle, type) {
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/savefrom?url=${encodeURIComponent(url)}`);
    const videoData = r?.data?.[0]?.data?.[0];
    if (videoData) {
      const title = videoData.meta?.title || fallbackTitle || 'YouTube';
      const streams = videoData.stream;

      if (type === 'audio') {
        // Tenta mp3
        if (streams?.mp3) {
          const mp3 = Object.values(streams.mp3)[0];
          if (mp3?.url && !mp3.url.includes('#local')) return { title, url: mp3.url };
        }
        // Tenta mp4 360p como fallback
        if (streams?.mp4?.['360']?.streams?.[0]) {
          return { title, url: `https://worker.sf-tools.com${streams.mp4['360'].streams[0]}` };
        }
        if (streams?.mp4?.['240']?.streams?.[0]) {
          return { title, url: `https://worker.sf-tools.com${streams.mp4['240'].streams[0]}` };
        }
      } else {
        // Vídeo — melhor qualidade disponível
        for (const q of ['720', '480', '360', '240']) {
          const mp4 = streams?.mp4?.[q];
          if (mp4?.url && !mp4.url.includes('#local')) return { title, url: mp4.url };
          if (mp4?.streams?.[0]) return { title, url: `https://worker.sf-tools.com${mp4.streams[0]}` };
        }
      }
    }
  } catch (e) {}

  throw new Error(`❌ Não consegui baixar.\nTente outro link ou use !soundcloud`);
}

// ==================== TIKTOK ==================== ✅
async function tiktok(url) {
  return tryApis([
    { url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, name: 'tikwm' },
    { url: `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], (r) => {
    if (r?.data?.play) return { title: r.data.title || 'TikTok', url: r.data.play };
    if (r?.data?.video) return { title: r.data.title || 'TikTok', url: r.data.video };
    if (r?.data?.url) return { title: r.data.title || 'TikTok', url: r.data.url };
    const dl = r?.result?.video?.no_watermark || r?.video || r?.url;
    if (dl) return { title: r?.title || 'TikTok', url: dl };
    return null;
  });
}

// ==================== INSTAGRAM ====================
async function instagram(url) {
  const r = await tryApis([
    { url: `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], (r) => {
    const item = r?.data?.[0] || r?.result?.[0] || (r?.url ? { url: r.url } : null);
    if (item?.url) return { url: item.url };
    return null;
  });
  return { type: r.url.includes('.mp4') ? 'video' : 'image', url: r.url };
}

// ==================== FACEBOOK ==================== ✅
async function facebook(url) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], (r) => {
    if (r?.data?.sd) return { url: r.data.hd || r.data.sd };
    const dl = r?.data?.url || r?.data?.[0]?.url || r?.result?.url || r?.url;
    if (dl) return { url: dl };
    return null;
  });
}

// ==================== TWITTER / X ====================
async function twitter(url) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], (r) => {
    const dl = r?.data?.[0]?.url || r?.data?.url || r?.result?.url || r?.url;
    if (dl) return { url: dl };
    return null;
  });
}

// ==================== SPOTIFY ====================
async function spotify(url) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], (r) => {
    const dl = r?.data?.url || r?.result?.url || r?.url;
    const title = r?.data?.title || r?.result?.title || 'Spotify';
    if (dl) return { title, url: dl };
    return null;
  });
}

// ==================== SOUNDCLOUD ==================== ✅
async function soundcloud(query) {
  const isUrl = /^https?:\/\/(www\.)?soundcloud\.com/i.test(query);

  if (!isUrl) {
    // Busca por nome ✅
    try {
      const search = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/s/soundcloud?query=${encodeURIComponent(query)}`);
      if (search?.data?.length) {
        const track = search.data[0];
        const scUrl = track.permalink_url || track.url;
        if (scUrl) {
          const dl = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(scUrl)}`);
          if (dl?.data?.url) return { title: dl.data.title || track.permalink || query, url: dl.data.url };
        }
      }
    } catch (e) {}
    throw new Error(`🔍 Não encontrei "${query}" no SoundCloud.`);
  }

  return tryApis([
    { url: `https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(query)}`, name: 'siputzx' },
  ], (r) => {
    const dl = r?.data?.url || r?.result?.url || r?.url;
    const title = r?.data?.title || r?.result?.title || 'SoundCloud';
    if (dl) return { title, url: dl };
    return null;
  });
}

// ==================== PINTEREST ==================== ✅
async function pinterest(url) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(url)}`, name: 'siputzx' },
  ], (r) => {
    const dl = r?.data?.url || r?.result?.url || r?.url;
    if (dl) return { url: dl };
    return null;
  });
}

async function pinterestSearch(query) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, name: 'siputzx' },
  ], (r) => {
    const arr = r?.data || r?.result;
    if (Array.isArray(arr) && arr.length) {
      const images = arr.filter(p => p.image_url && p.image_url.includes('pinimg.com'));
      const pool = images.length ? images : arr;
      const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 10))];
      const imgUrl = pick.image_url || pick.image || pick.url || pick;
      if (imgUrl) return { url: imgUrl, title: pick.grid_title || pick.description || '' };
    }
    return null;
  });
}

module.exports = {
  youtubeAudio, youtubeVideo, youtubeSearch,
  youtubeAudioSavefrom, youtubeVideoSavefrom,
  youtubeAudioAuto,
  tiktok, instagram, facebook, twitter,
  spotify, soundcloud, pinterest, pinterestSearch,
};
