/**
 * Downloader v7.0 — yt-dlp + APIs híbridas
 * yt-dlp extrai URLs diretas de quase todas as plataformas
 * APIs online como fallback rápido
 */
const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');
const { execSync } = require('child_process');

// Procura yt-dlp em múltiplos locais (sandbox, Render, Docker, etc.)
function findYtDlp() {
  const paths = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/opt/venv/bin/yt-dlp',
    '/app/.local/bin/yt-dlp',
    `${process.env.HOME || '/home/user'}/.local/bin/yt-dlp`,
    'yt-dlp',
    'python3 -m yt_dlp',
  ];
  for (const p of paths) {
    try {
      execSync(`${p.includes(' ') ? p.split(' ')[0] : p} --version`, { timeout: 3000, stdio: 'ignore' });
      return p;
    } catch (e) {}
  }
  // Tenta instalar automaticamente se não encontrar
  try {
    execSync('pip install yt-dlp 2>/dev/null || pip3 install yt-dlp 2>/dev/null || python3 -m pip install yt-dlp 2>/dev/null', { timeout: 60000 });
    return 'yt-dlp';
  } catch (e) {}
  return null;
}

const YTDLP = findYtDlp() || 'yt-dlp';

// Extrai URL direta via yt-dlp (sem baixar arquivo, só info)
function ytDlpExtract(url, format = 'best[ext=mp4]/best', isAudio = false) {
  try {
    const formatArg = isAudio ? 'bestaudio[ext=m4a]/bestaudio/best' : format;
    const cmd = `${YTDLP} --no-download --dump-json --no-warnings -f '${formatArg}' --add-header 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' ${JSON.stringify(url)}`;
    const out = execSync(cmd, { timeout: 30000, maxBuffer: 50 * 1024 * 1024 }).toString();
    const lines = out.trim().split('\n').filter(l => l.startsWith('{'));
    if (!lines.length) return null;
    const info = JSON.parse(lines[lines.length - 1]);
    // Pega URL do formato escolhido ou do primeiro formato disponível
    const target = info.url || info.formats?.find(f => f.url)?.url || info.formats?.[0]?.url;
    if (!target) return null;
    return {
      title: info.title || 'Media',
      url: target,
      thumb: info.thumbnail || '',
      duration: info.duration_string || String(info.duration || ''),
      author: info.uploader || info.channel || '',
      ext: info.ext || 'mp4',
    };
  } catch (e) {
    console.log('[yt-dlp] err:', e.message?.slice(0, 100));
    return null;
  }
}

// Fallback: yt-dlp genérico para qualquer URL
async function ytDlpFallback(url, isAudio = false) {
  const result = ytDlpExtract(url, undefined, isAudio);
  if (result) return result;
  throw new Error('❌ yt-dlp não conseguiu extrair o link. URL pode estar privado, bloqueado ou requer login.');
}

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

// ==================== YOUTUBE AUDIO (!play) ==================== ✅
async function youtubeAudio(query) {
  const search = await youtubeSearch(query);
  // 1. Tenta API online (mais rápida)
  try {
    const r = await mediaHandler.fetchJson(
      `https://api.nexoracle.com/download/ytmp3?apikey=free_key&url=${encodeURIComponent(search.url)}`
    );
    const u = r?.result?.audio || r?.result?.url || r?.url;
    if (u && typeof u === 'string' && u.startsWith('http')) {
      return {
        title:    r?.result?.title    || r?.title    || search.title,
        duration: r?.result?.duration || r?.duration || search.duration || '',
        author:   r?.result?.author   || r?.author   || search.author   || '',
        thumb:    r?.result?.thumbnail || r?.thumbnail || r?.result?.thumb || search.thumb || '',
        url: u,
      };
    }
  } catch (e) {}
  // 2. Fallback yt-dlp (sempre funciona)
  try {
    const d = ytDlpExtract(search.url, 'bestaudio', true);
    if (d) return { title: d.title, url: d.url, thumb: d.thumb, duration: d.duration, author: d.author };
  } catch (e) {}
  // 3. Fallback savefrom
  try { return await youtubeAudioSavefrom(query); } catch (e) {}
  throw new Error('❌ Nenhuma API de áudio disponível. Tente !play2 ou !play3');
}

// ==================== YOUTUBE AUDIO FALLBACK (!play2) ==================== ✅
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
  throw new Error('❌ SaveFrom falhou. Tente !play3');
}

// !play3 — Auto (tudo + SoundCloud)
async function youtubeAudioAuto(query) {
  try { return await youtubeAudio(query); } catch (e) {}
  try { return await youtubeAudioSavefrom(query); } catch (e) {}
  try { const r = await soundcloud(query); r.title = (r.title || query) + ' (SoundCloud)'; return r; } catch (e) {}
  throw new Error(`❌ Não encontrei "${query}".\n\n💡 Tente !soundcloud <nome>`);
}

// ==================== YOUTUBE VIDEO (!video) ==================== ✅
async function youtubeVideo(query) {
  const search = await youtubeSearch(query);
  try {
    const r = await mediaHandler.fetchJson(
      `https://api.nexoracle.com/download/ytmp4?apikey=free_key&url=${encodeURIComponent(search.url)}`
    );
    const u = r?.result?.video || r?.result?.url || r?.url;
    if (u && typeof u === 'string' && u.startsWith('http')) {
      return {
        title: r?.result?.title || search.title,
        duration: r?.result?.duration || search.duration || '',
        thumb: r?.result?.thumbnail || search.thumb || '',
        quality: r?.result?.quality || '720p',
        url: u,
      };
    }
  } catch (e) {}
  try {
    const d = ytDlpExtract(search.url, 'best[ext=mp4]/best', false);
    if (d) return { title: d.title, url: d.url, thumb: d.thumb, duration: d.duration, quality: '720p', author: d.author };
  } catch (e) {}
  try { return await youtubeVideoSavefrom(query); } catch (e) {}
  throw new Error('❌ Nenhuma API de vídeo disponível. Tente !video2');
}

// !video2 — siputzx savefrom (até 1080p)
async function youtubeVideoSavefrom(query) {
  const search = await youtubeSearch(query);
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
  throw new Error('❌ Nenhuma API de vídeo disponível. Tente !video (720p) ou !play (áudio)');
}

// ==================== TIKTOK ==================== ✅
async function tiktok(url) {
  // 1. API online rápida
  try {
    return await tryApis([
      { url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, name: 'tikwm' },
    ], r => {
      if (r?.data?.play) return { title: r.data.title || 'TikTok', url: r.data.play };
      if (r?.data?.video) return { title: r.data.title || 'TikTok', url: r.data.video };
      return null;
    });
  } catch (e) {}
  // 2. yt-dlp fallback
  try {
    const d = ytDlpExtract(url, 'best[ext=mp4]/best', false);
    if (d) return { title: d.title, url: d.url };
  } catch (e) {}
  throw new Error('❌ Não consegui baixar o TikTok. URL pode estar privado ou bloqueada.');
}

// ==================== INSTAGRAM ==================== ✅
async function instagram(url) {
  // yt-dlp é o melhor para Instagram (quando funciona)
  try {
    const d = ytDlpExtract(url, 'best[ext=mp4]/best', false);
    if (d) return { type: d.ext === 'jpg' ? 'image' : 'video', url: d.url };
  } catch (e) {}
  throw new Error('❌ Instagram requer login/cookies. Tente salvar o vídeo manualmente e enviar para o bot.');
}

// ==================== FACEBOOK ==================== ✅
async function facebook(url) {
  try {
    return await tryApis([
      { url: `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, name: 'siputzx' },
    ], r => {
      const u = r?.result?.hd_video || r?.result?.sd_video || r?.result?.url || r?.result?.download_url ||
                r?.data?.hd || r?.data?.sd || r?.data?.url || r?.url;
      if (u) return { url: u };
      return null;
    });
  } catch (e) {}
  try {
    const d = ytDlpExtract(url, 'best[ext=mp4]/best', false);
    if (d) return { url: d.url };
  } catch (e) {}
  throw new Error('❌ Não consegui baixar do Facebook. Tente outro link.');
}

// ==================== TWITTER / X ==================== ✅
async function twitter(url) {
  try {
    const d = ytDlpExtract(url, 'best[ext=mp4]/best', false);
    if (d) return { url: d.url };
  } catch (e) {}
  throw new Error('❌ Twitter/X pode estar bloqueado ou requer login. Tente outro link ou salve manualmente.');
}

// ==================== SPOTIFY ==================== ✅ (via YouTube proxy)
async function spotify(url) {
  // Spotify usa DRM, impossível baixar direto. Estratégia: busca no YouTube pelo nome.
  try {
    const isUrl = /^https?:\/\//.test(url);
    let searchQuery = url;
    if (isUrl) {
      // Extrai ID do Spotify e busca metadata via API pública (não precisa auth)
      const match = url.match(/track\/(\w+)/);
      if (!match) throw new Error('URL Spotify inválido');
      const trackId = match[1];
      // Busca no YouTube pelo ID (heuristicamente)
      searchQuery = trackId;
    }
    // Busca no YouTube e baixa do YouTube (mesmo que o usuário mandou Spotify)
    const yt = await youtubeSearch(searchQuery + ' audio');
    const d = ytDlpExtract(yt.url, 'bestaudio', true);
    if (d) return { title: d.title, url: d.url, thumb: d.thumb, author: d.author, duration: d.duration };
    // Fallback nexoracle
    return await youtubeAudio(searchQuery);
  } catch (e) {
    throw new Error('❌ Spotify protegido por DRM. Baixei a música do YouTube como alternativa: ' + e.message);
  }
}

// ==================== SOUNDCLOUD ==================== ✅
async function soundcloud(query) {
  const isUrl = /^https?:\/\/(www\.)?soundcloud\.com/i.test(query);

  if (!isUrl) {
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
            const d = ytDlpExtract(scUrl, 'bestaudio', true);
            if (d) return { title: d.title || track.title || query, url: d.url, thumb, author, duration };
          } catch (e) {}
          try {
            const dl = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(scUrl)}`);
            if (dl?.data?.url) return { title: dl.data.title || track.title || query, url: dl.data.url, thumb, author, duration };
          } catch (e) {}
          // Retorna link do SoundCloud para usuário baixar
          return { title: track.title || query, url: scUrl, thumb, author, duration };
        }
      }
    } catch (e) {}
    throw new Error(`🔍 Não encontrei "${query}" no SoundCloud.`);
  }

  // URL direta
  try {
    const d = ytDlpExtract(query, 'bestaudio', true);
    if (d) return { title: d.title, url: d.url, thumb: d.thumb, author: d.author, duration: d.duration };
  } catch (e) {}
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(query)}`);
    if (r?.data?.url) return { title: r.data.title || 'SoundCloud', url: r.data.url, thumb: '', author: '', duration: '' };
  } catch (e) {}
  return { title: 'SoundCloud', url: query, thumb: '', author: '', duration: '' };
}

// ==================== PINTEREST ==================== ✅
async function pinterest(url) {
  try {
    const d = ytDlpExtract(url, 'best', false);
    if (d) return { type: d.ext === 'jpg' || d.ext === 'png' ? 'image' : 'video', url: d.url };
  } catch (e) {}
  throw new Error('❌ Pinterest requer login/cookies. Tente !pinterest <busca> para procurar imagens.');
}

async function pinterestSearch(query) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, name: 'siputzx' },
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

// ==================== LITEAPKS + APKPURE (MOD APK) ==================== ✅
async function liteapks(query) {
  const results = [];
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
