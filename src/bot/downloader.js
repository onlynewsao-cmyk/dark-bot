/**
 * Downloader v8.0 — Baixa ARQUIVOS REAIS (buffers) não só URLs
 * Estratégia: baixar o arquivo no servidor e enviar como buffer/documento
 * yt-dlp baixa o arquivo real → buffer → envio garantido
 */
const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TMP_DIR = os.tmpdir();

// Procura yt-dlp
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
  try {
    execSync('pip install yt-dlp 2>/dev/null || pip3 install yt-dlp 2>/dev/null || python3 -m pip install yt-dlp 2>/dev/null', { timeout: 60000 });
    return 'yt-dlp';
  } catch (e) {}
  return null;
}

const YTDLP = findYtDlp() || 'yt-dlp';

// Helper: baixa arquivo real via yt-dlp (retorna buffer + info)
function ytDlpDownload(url, isAudio = false, maxSizeMB = 50) {
  const id = `ytdl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const outDir = path.join(TMP_DIR, id);
  fs.mkdirSync(outDir, { recursive: true });

  try {
    const format = isAudio
      ? `-f bestaudio[ext=m4a]/bestaudio/best -x --audio-format mp3 --audio-quality 0`
      : `-f 'best[filesize<${maxSizeMB}M]/best[filesize<100M]/best' --merge-output-format mp4`;
    const outTemplate = path.join(outDir, '%(title).80B.%(ext)s');

    const cmd = `${YTDLP} ${format} --no-playlist --max-downloads 1 --no-warnings -o '${outTemplate}' --add-header 'User-Agent: Mozilla/5.0' ${JSON.stringify(url)}`;
    execSync(cmd, { timeout: 90000, maxBuffer: 100 * 1024 * 1024 });

    // Encontra arquivo baixado
    const files = fs.readdirSync(outDir).filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl'));
    if (!files.length) throw new Error('yt-dlp não baixou arquivo');

    const filePath = path.join(outDir, files[0]);
    const buffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    // Cleanup
    try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (e) {}

    return {
      buffer,
      fileName: path.basename(filePath),
      ext: path.extname(filePath).slice(1),
      size: stats.size,
    };
  } catch (e) {
    try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (e2) {}
    throw e;
  }
}

// Helper: yt-dlp extrai URL direta (fallback rápido, não baixa arquivo)
function ytDlpExtractUrl(url, isAudio = false) {
  try {
    const formatArg = isAudio ? 'bestaudio[ext=m4a]/bestaudio/best' : 'best[ext=mp4]/best';
    const cmd = `${YTDLP} --no-download --dump-json --no-warnings -f '${formatArg}' --add-header 'User-Agent: Mozilla/5.0' ${JSON.stringify(url)}`;
    const out = execSync(cmd, { timeout: 30000, maxBuffer: 50 * 1024 * 1024 }).toString();
    const lines = out.trim().split('\n').filter(l => l.startsWith('{'));
    if (!lines.length) return null;
    const info = JSON.parse(lines[lines.length - 1]);
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
    console.log('[yt-dlp extract] err:', e.message?.slice(0, 100));
    return null;
  }
}

// Helper: baixa buffer de URL
async function downloadBuffer(url, maxSize = 50 * 1024 * 1024) {
  const buf = await mediaHandler.fetchBuffer(url);
  if (buf.length > maxSize) throw new Error('Arquivo muito grande (>50MB)');
  return buf;
}

async function tryApis(apis, parser) {
  const errors = [];
  for (const { url, name } of apis) {
    try {
      const r = await mediaHandler.fetchJson(url);
      const result = parser(r);
      if (result?.url || result?.buffer) return result;
      errors.push(`${name}: sem dados`);
    } catch (e) { errors.push(`${name}: ${e.message}`); }
  }
  throw new Error(errors.slice(0, 3).join(' | '));
}

// ==================== YOUTUBE SEARCH ====================
async function youtubeSearch(query) {
  if (/^https?:\/\//i.test(query)) return { url: query, title: query, thumb: '', duration: '', author: '' };
  const r = await yts(query);
  if (r.videos?.[0]) {
    const v = r.videos[0];
    return {
      url: v.url,
      title: v.title,
      id: v.videoId,
      thumb: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.timestamp || '',
      author: v.author?.name || v.author || '',
      views: v.views || 0,
    };
  }
  throw new Error(`🔍 Não encontrei "${query}" no YouTube.`);
}

// ==================== YOUTUBE AUDIO (!play) ====================
async function youtubeAudio(query) {
  const search = await youtubeSearch(query);

  // 1. yt-dlp — BAIXA ARQUIVO REAL (mais garantido)
  try {
    const d = ytDlpDownload(search.url, true, 50);
    if (d && d.buffer.length > 1000) {
      return {
        title: search.title,
        buffer: d.buffer,
        fileName: `${search.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`,
        thumb: search.thumb,
        duration: search.duration,
        author: search.author,
      };
    }
  } catch (e) { console.log('[play] yt-dlp download fail:', e.message); }

  // 2. API online — URL direta (fallback rápido)
  try {
    const r = await mediaHandler.fetchJson(
      `https://api.nexoracle.com/download/ytmp3?apikey=free_key&url=${encodeURIComponent(search.url)}`
    );
    const u = r?.result?.audio || r?.result?.url || r?.url;
    if (u && typeof u === 'string' && u.startsWith('http')) {
      const buf = await downloadBuffer(u);
      return {
        title: r?.result?.title || search.title,
        buffer: buf,
        fileName: `${(r?.result?.title || search.title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`,
        thumb: r?.result?.thumbnail || r?.thumbnail || r?.result?.thumb || search.thumb || '',
        duration: r?.result?.duration || r?.duration || search.duration || '',
        author: r?.result?.author || r?.author || search.author || '',
      };
    }
  } catch (e) {}

  // 3. Fallback savefrom
  try { return await youtubeAudioSavefrom(query); } catch (e) {}

  throw new Error('❌ Não consegui baixar o áudio. Tente !play2 ou !play3');
}

// ==================== YOUTUBE AUDIO FALLBACK (!play2) ====================
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
        if (mp3?.url && !mp3.url.includes('#local')) {
          const buf = await downloadBuffer(mp3.url);
          return { title, buffer: buf, fileName: `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`, thumb: search.thumb, duration: search.duration, author: search.author };
        }
      }
      for (const q of ['360', '240']) {
        if (s?.mp4?.[q]?.streams?.[0]) {
          const url = `https://worker.sf-tools.com${s.mp4[q].streams[0]}`;
          const buf = await downloadBuffer(url);
          return { title, buffer: buf, fileName: `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`, thumb: search.thumb, duration: search.duration, author: search.author };
        }
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

// ==================== YOUTUBE VIDEO (!video) ====================
async function youtubeVideo(query) {
  const search = await youtubeSearch(query);

  // 1. yt-dlp — BAIXA ARQUIVO REAL MP4
  try {
    const d = ytDlpDownload(search.url, false, 50);
    if (d && d.buffer.length > 1000) {
      return {
        title: search.title,
        buffer: d.buffer,
        fileName: `${search.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp4`,
        thumb: search.thumb,
        duration: search.duration,
        quality: '720p',
        author: search.author,
      };
    }
  } catch (e) { console.log('[video] yt-dlp download fail:', e.message); }

  // 2. API online
  try {
    const r = await mediaHandler.fetchJson(
      `https://api.nexoracle.com/download/ytmp4?apikey=free_key&url=${encodeURIComponent(search.url)}`
    );
    const u = r?.result?.video || r?.result?.url || r?.url;
    if (u && typeof u === 'string' && u.startsWith('http')) {
      const buf = await downloadBuffer(u);
      return {
        title: r?.result?.title || search.title,
        buffer: buf,
        fileName: `${(r?.result?.title || search.title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp4`,
        duration: r?.result?.duration || search.duration || '',
        thumb: r?.result?.thumbnail || search.thumb || '',
        quality: r?.result?.quality || '720p',
      };
    }
  } catch (e) {}

  // 3. Fallback savefrom
  try { return await youtubeVideoSavefrom(query); } catch (e) {}

  throw new Error('❌ Não consegui baixar o vídeo. Tente !video2');
}

// !video2 — siputzx savefrom (até 1080p)
async function youtubeVideoSavefrom(query) {
  const search = await youtubeSearch(query);
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/savefrom?url=${encodeURIComponent(search.url)}`);
    const d = r?.data?.[0]?.data?.[0];
    if (d) {
      const title = d.meta?.title || search.title;
      const dur = d.meta?.duration || '';
      const thumb = d.meta?.thumb || '';
      const s = d.stream;
      for (const q of ['1080', '720', '480', '360']) {
        const mp4 = s?.mp4?.[q];
        if (mp4?.url && !mp4.url.includes('#local')) {
          const buf = await downloadBuffer(mp4.url);
          return { title, buffer: buf, fileName: `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp4`, duration: dur, thumb, quality: q + 'p' };
        }
        if (mp4?.streams?.[0]) {
          const url = `https://worker.sf-tools.com${mp4.streams[0]}`;
          const buf = await downloadBuffer(url);
          return { title, buffer: buf, fileName: `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp4`, duration: dur, thumb, quality: q + 'p' };
        }
      }
    }
  } catch (e) {}
  throw new Error('❌ Nenhuma API de vídeo disponível. Tente !video (720p) ou !play (áudio)');
}

// ==================== TIKTOK ====================
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
    const d = ytDlpExtractUrl(url, false);
    if (d) return { title: d.title, url: d.url };
  } catch (e) {}
  throw new Error('❌ Não consegui baixar o TikTok. URL pode estar privado ou bloqueada.');
}

// ==================== INSTAGRAM ====================
async function instagram(url) {
  try {
    const d = ytDlpExtractUrl(url, false);
    if (d) return { type: d.ext === 'jpg' ? 'image' : 'video', url: d.url };
  } catch (e) {}
  throw new Error('❌ Instagram requer login/cookies. Tente salvar o vídeo manualmente e enviar para o bot.');
}

// ==================== FACEBOOK ====================
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
    const d = ytDlpExtractUrl(url, false);
    if (d) return { url: d.url };
  } catch (e) {}
  throw new Error('❌ Não consegui baixar do Facebook. Tente outro link.');
}

// ==================== TWITTER / X ====================
async function twitter(url) {
  try {
    const d = ytDlpExtractUrl(url, false);
    if (d) return { url: d.url };
  } catch (e) {}
  throw new Error('❌ Twitter/X pode estar bloqueado ou requer login. Tente outro link ou salve manualmente.');
}

// ==================== SPOTIFY ====================
async function spotify(url) {
  // Spotify usa DRM, impossível baixar direto. Busca no YouTube pelo nome.
  try {
    const isUrl = /^https?:\/\//.test(url);
    let searchQuery = url;
    if (isUrl) {
      const match = url.match(/track\/(\w+)/);
      if (!match) throw new Error('URL Spotify inválido');
      searchQuery = match[1];
    }
    const yt = await youtubeSearch(searchQuery + ' audio');
    // Baixa do YouTube
    const d = ytDlpDownload(yt.url, true, 50);
    if (d && d.buffer.length > 1000) {
      return {
        title: yt.title,
        buffer: d.buffer,
        fileName: `${yt.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`,
        thumb: yt.thumb,
        author: yt.author,
        duration: yt.duration,
      };
    }
    // Fallback: URL direta do yt-dlp
    const info = ytDlpExtractUrl(yt.url, true);
    if (info) {
      const buf = await downloadBuffer(info.url);
      return { title: yt.title, buffer: buf, fileName: `${yt.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`, thumb: yt.thumb, author: yt.author, duration: yt.duration };
    }
  } catch (e) {
    throw new Error('❌ Não consegui encontrar essa música no YouTube. Tente !play <nome>');
  }
}

// ==================== SOUNDCLOUD ====================
async function soundcloud(query) {
  const isUrl = /^https?:\/\/(www\.)?soundcloud\.com/i.test(query);

  if (!isUrl) {
    // BUSCA POR NOME
    try {
      const search = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/s/soundcloud?query=${encodeURIComponent(query)}`);
      if (search?.data?.length) {
        const track = search.data[0];
        const scUrl = track.permalink_url || track.url;
        const thumb = track.artwork_url || track.thumb || '';
        const author = track.user?.username || track.user || '';
        const duration = track.duration ? Math.floor(track.duration / 60000) + ':' + String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0') : '';
        if (scUrl) {
          // 1) Download via siputzx API
          try {
            const dl = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(scUrl)}`);
            if (dl?.data?.url) {
              const buf = await downloadBuffer(dl.data.url);
              return { title: dl.data.title || track.title || query, buffer: buf, fileName: `${(dl.data.title || track.title || query).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`, thumb, author, duration };
            }
          } catch (e) {}
          // 2) yt-dlp fallback
          try {
            const d = ytDlpDownload(scUrl, true, 50);
            if (d && d.buffer.length > 1000) {
              return { title: d.title || track.title || query, buffer: d.buffer, fileName: `${(d.title || track.title || query).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`, thumb, author, duration };
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    throw new Error(`🔍 Não encontrei "${query}" no SoundCloud.`);
  }

  // URL direta
  try {
    const d = ytDlpDownload(query, true, 50);
    if (d && d.buffer.length > 1000) {
      return { title: d.title || 'SoundCloud', buffer: d.buffer, fileName: `${(d.title || 'SoundCloud').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`, thumb: '', author: '', duration: '' };
    }
  } catch (e) {}
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(query)}`);
    if (r?.data?.url) {
      const buf = await downloadBuffer(r.data.url);
      return { title: r.data.title || 'SoundCloud', buffer: buf, fileName: `${(r.data.title || 'SoundCloud').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`, thumb: '', author: '', duration: '' };
    }
  } catch (e) {}
  return { title: 'SoundCloud', url: query, thumb: '', author: '', duration: '' };
}

// ==================== PINTEREST ====================
async function pinterest(url) {
  try {
    const d = ytDlpExtractUrl(url, false);
    if (d) return { type: d.ext === 'jpg' || d.ext === 'png' ? 'image' : 'video', url: d.url };
  } catch (e) {}
  throw new Error('❌ Pinterest requer login/cookies. Tente !pinterest <busca> para procurar imagens.');
}

async function pinterestSearch(query, limit = 10) {
  return tryApis([
    { url: `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, name: 'siputzx' },
  ], r => {
    const arr = r?.data || r?.result || r?.results;
    if (Array.isArray(arr) && arr.length) {
      const imgs = arr.filter(p => {
        const u = (p.image_url || p.image || p.url || p.src || p)?.toString();
        return u && (u.includes('pinimg.com') || u.startsWith('http'));
      });
      const pool = imgs.length ? imgs : arr;
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const picks = shuffled.slice(0, limit).map(p => {
        const u = typeof p === 'string' ? p : (p.image_url || p.image || p.url || p.src || p.download_url);
        return { url: u };
      }).filter(p => p.url && p.url.startsWith('http'));
      if (picks.length) return picks;
    }
    return null;
  });
}

// ==================== MEDIAFIRE ====================
async function mediafire(url) {
  if (!/mediafire\.com/i.test(url)) throw new Error('❌ Envie um link do MediaFire.');
  try {
    const html = execSync(`curl -sL "${url}" -H "User-Agent: Mozilla/5.0"`, { timeout: 15000 }).toString();
    const match = html.match(/href="(https:\/\/download\d+\.mediafire\.com\/[^"]+)"/);
    if (match) {
      const fileName = decodeURIComponent(match[1].split('/').pop() || 'mediafire_file');
      const fileSize = html.match(/class="details"[^>]*>\s*\(([^)]+)\)/)?.[1] || '';
      const buf = await downloadBuffer(match[1], 100 * 1024 * 1024);
      return { buffer: buf, title: fileName, size: fileSize };
    }
    throw new Error('Link não encontrado na página.');
  } catch (e) {
    if (e.message.includes('Link não')) throw e;
    throw new Error('❌ Não consegui acessar o MediaFire.\n' + e.message);
  }
}

// ==================== LITEAPKS + APKPURE (MOD APK) ====================
// Agora baixa o APK REAL e retorna buffer
async function liteapks(query) {
  const results = [];

  // 1. LiteAPKs — busca e baixa APK real
  try {
    const html = execSync(`curl -sL "https://liteapks.com/?s=${encodeURIComponent(query)}" -H "User-Agent: Mozilla/5.0" --max-time 10`, { timeout: 15000 }).toString();
    const regex = /href="(https:\/\/liteapks\.com\/[a-z0-9-]+\.html)"/g;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 3) {
      const url = m[1];
      if (!url.includes('page/') && !url.includes('category') && !url.includes('tag/') && !results.find(r => r.url === url)) {
        const name = url.split('/').pop().replace('.html', '').replace(/-/g, ' ');
        results.push({ name, url, source: 'LiteAPKs' });
      }
    }
  } catch (e) {}

  // 2. APKPure — busca e baixa APK real
  try {
    const html = execSync(`curl -sL "https://apkpure.com/br/search?q=${encodeURIComponent(query + ' mod')}" -H "User-Agent: Mozilla/5.0" --max-time 10`, { timeout: 15000 }).toString();
    const regex = /data-dt-app="[^"]*"[^>]*>[\s\S]*?<\/a>/g;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 5) {
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

  // 3. Tenta baixar o APK do primeiro resultado (LiteAPKs)
  for (const r of results) {
    if (r.source === 'LiteAPKs') {
      try {
        const apkBuf = await downloadApkFromLiteapks(r.url);
        if (apkBuf && apkBuf.length > 10000) {
          r.buffer = apkBuf;
          r.fileName = `${r.name.replace(/[^a-z0-9]/gi, '_')}.apk`;
          return [r]; // Retorna o APK real
        }
      } catch (e) { console.log('[liteapks] download fail:', e.message); }
    }
  }

  return results; // Retorna links se não conseguir baixar
}

async function downloadApkFromLiteapks(postUrl) {
  // Entra na página do post e encontra o link de download do APK
  const html = execSync(`curl -sL "${postUrl}" -H "User-Agent: Mozilla/5.0" --max-time 15`, { timeout: 20000 }).toString();

  // Padrões comuns de download em sites de MOD APK
  const patterns = [
    /href="(https:\/\/[^"]+\.apk[^"]*)"/i,
    /href="(https:\/\/[^"]+download[^"]+\.apk[^"]*)"/i,
    /href="(https:\/\/[^"]+liteapks[^"]+\.apk[^"]*)"/i,
    /href="(https:\/\/[^"]+upload[^"]+\.apk[^"]*)"/i,
    /href="(https:\/\/[^"]+mediafire[^"]+)"/i,
    /href="(https:\/\/[^"]+mega\.nz[^"]+)"/i,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const dlUrl = m[1].replace(/&amp;/g, '&');
      // Se for MediaFire, extrai link direto
      if (dlUrl.includes('mediafire.com')) {
        return (await mediafire(dlUrl)).buffer;
      }
      // Baixa APK direto
      const buf = await mediaHandler.fetchBuffer(dlUrl);
      if (buf.length > 10000) return buf;
    }
  }

  // Procura por data-download ou onclick
  const dataDl = html.match(/data-download="(https?:\/\/[^"]+)"/i);
  if (dataDl) {
    const buf = await mediaHandler.fetchBuffer(dataDl[1]);
    if (buf.length > 10000) return buf;
  }

  throw new Error('Não encontrou link de download APK na página');
}

module.exports = {
  youtubeAudio, youtubeAudioSavefrom, youtubeAudioAuto,
  youtubeVideo, youtubeVideoSavefrom, youtubeSearch,
  tiktok, instagram, facebook, twitter,
  spotify, soundcloud, pinterest, pinterestSearch,
  mediafire, liteapks,
};
