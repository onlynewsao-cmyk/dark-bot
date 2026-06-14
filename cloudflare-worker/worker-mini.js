/**
 * DARK BOT - Cloudflare Worker MINI
 * Versão simples para colar direto no painel da Cloudflare.
 * Endpoints: /health, /info, /search, /audio, /video
 */

const DEFAULT_KEY = 'darknet-engine-2026';
const YOUTUBEI = 'https://www.youtube.com/youtubei/v1';

const ANDROID_CLIENT = {
  clientName: 'ANDROID',
  clientVersion: '19.02.39',
  userAgent: 'com.google.android.youtube/19.02.39 (Linux; U; Android 14)',
  osName: 'Android',
  osVersion: '14',
  androidSdkVersion: 34,
  hl: 'pt',
  gl: 'AO'
};

const WEB_CLIENT = {
  clientName: 'WEB',
  clientVersion: '2.20240601.00.00',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
  hl: 'pt',
  gl: 'AO'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type, x-api-key',
      'cache-control': 'public, max-age=60'
    }
  });
}

function error(message, status = 400) {
  return json({ success: false, error: String(message || 'Erro') }, status);
}

function textOf(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.simpleText) return obj.simpleText;
  if (Array.isArray(obj.runs)) return obj.runs.map(function (r) { return r.text || ''; }).join('');
  return '';
}

async function yt(endpoint, payload, client) {
  const body = {
    context: {
      client: client
    }
  };
  for (const k in payload) body[k] = payload[k];

  const res = await fetch(YOUTUBEI + '/' + endpoint + '?prettyPrint=false', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': client.userAgent,
      'origin': 'https://www.youtube.com',
      'referer': 'https://www.youtube.com/'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error('YouTube API HTTP ' + res.status);
  return await res.json();
}

function pickFormats(data, mode, quality) {
  const streaming = data.streamingData || {};
  const list = [];
  const f1 = streaming.formats || [];
  const f2 = streaming.adaptiveFormats || [];
  for (const f of f1) list.push(f);
  for (const f of f2) list.push(f);

  let out = [];

  for (const f of list) {
    if (!f.url) continue;
    const mime = f.mimeType || '';
    const isAudio = mime.indexOf('audio/') === 0 || !!f.audioQuality;
    const isVideo = !!f.qualityLabel || mime.indexOf('video/') === 0;

    if (mode === 'audio') {
      if (!isAudio || f.qualityLabel) continue;
    } else {
      if (!isVideo) continue;
      const target = parseInt(quality || '720', 10) || 720;
      const got = parseInt(String(f.qualityLabel || '0'), 10) || 0;
      if (got > target) continue;
    }

    out.push({
      url: f.url,
      mimeType: mime,
      bitrate: f.bitrate || 0,
      qualityLabel: f.qualityLabel || '',
      contentLength: f.contentLength || '',
      audioQuality: f.audioQuality || '',
      hasAudio: isAudio,
      hasVideo: isVideo
    });
  }

  out.sort(function (a, b) {
    if (mode === 'audio') return (b.bitrate || 0) - (a.bitrate || 0);
    const ar = parseInt(a.qualityLabel || '0', 10) || 0;
    const br = parseInt(b.qualityLabel || '0', 10) || 0;
    if (br !== ar) return br - ar;
    return (b.bitrate || 0) - (a.bitrate || 0);
  });

  return out.slice(0, 3);
}

async function getStreams(videoId, mode, quality) {
  const data = await yt('player', {
    videoId: videoId,
    contentCheckOk: true,
    racyCheckOk: true,
    playbackContext: {
      contentPlaybackContext: {
        vis: 0,
        splay: false,
        lactMilliseconds: '-1'
      }
    }
  }, ANDROID_CLIENT);

  const status = data.playabilityStatus || {};
  if (status.status && status.status !== 'OK') {
    throw new Error(status.reason || status.status);
  }

  const details = data.videoDetails || {};
  const thumbs = details.thumbnail && details.thumbnail.thumbnails ? details.thumbnail.thumbnails : [];
  const thumb = thumbs.length ? thumbs[thumbs.length - 1].url : '';
  const formats = pickFormats(data, mode, quality);

  if (!formats.length) throw new Error('Nenhum formato direto encontrado');

  return {
    success: true,
    videoId: videoId,
    title: details.title || 'YouTube',
    author: details.author || '',
    lengthSeconds: parseInt(details.lengthSeconds || '0', 10) || 0,
    thumbnail: thumb,
    client: 'ANDROID',
    formats: formats
  };
}

async function search(query) {
  const data = await yt('search', { query: query }, WEB_CLIENT);
  const results = [];
  const sections = (((data.contents || {}).twoColumnSearchResultsRenderer || {}).primaryContents || {}).sectionListRenderer || {};
  const contents = sections.contents || [];

  for (const section of contents) {
    const items = (section.itemSectionRenderer || {}).contents || [];
    for (const item of items) {
      const v = item.videoRenderer;
      if (!v || !v.videoId) continue;
      const thumbs = v.thumbnail && v.thumbnail.thumbnails ? v.thumbnail.thumbnails : [];
      results.push({
        videoId: v.videoId,
        title: textOf(v.title),
        author: textOf(v.ownerText),
        lengthText: textOf(v.lengthText),
        thumbnail: thumbs.length ? thumbs[0].url : '',
        url: 'https://www.youtube.com/watch?v=' + v.videoId
      });
      if (results.length >= 10) return results;
    }
  }
  return results;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return json({ ok: true });

    const url = new URL(request.url);
    const path = url.pathname;

    const sentKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
    const configuredKey = env && env.API_KEY ? env.API_KEY : DEFAULT_KEY;
    if (sentKey && sentKey !== configuredKey) return error('Invalid API key', 403);

    try {
      if (path === '/' || path === '/health') {
        return json({ success: true, status: 'ok', service: 'dark-bot-yt-proxy-mini' });
      }

      if (path === '/audio') {
        const id = url.searchParams.get('id') || url.searchParams.get('v');
        if (!id) return error('Missing video ID');
        const quality = url.searchParams.get('quality') || '128';
        return json(await getStreams(id, 'audio', quality));
      }

      if (path === '/video') {
        const id = url.searchParams.get('id') || url.searchParams.get('v');
        if (!id) return error('Missing video ID');
        const quality = url.searchParams.get('quality') || '720';
        return json(await getStreams(id, 'video', quality));
      }

      if (path === '/info') {
        const id = url.searchParams.get('id') || url.searchParams.get('v');
        if (!id) return error('Missing video ID');
        const r = await getStreams(id, 'audio', '128');
        delete r.formats;
        return json(r);
      }

      if (path === '/search') {
        const q = url.searchParams.get('q') || url.searchParams.get('query');
        if (!q) return error('Missing query');
        return json({ success: true, query: q, results: await search(q) });
      }

      return error('Endpoint não encontrado. Use /health, /audio, /video, /info ou /search', 404);
    } catch (e) {
      return error(e && e.message ? e.message : e, 500);
    }
  }
};
