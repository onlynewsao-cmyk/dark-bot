export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;

    if (request.method === 'OPTIONS') {
      return response({ ok: true });
    }

    try {
      if (path === '/' || path === '/health') {
        return response({ success: true, status: 'ok', service: 'dark-bot-worker-ultra' });
      }

      if (path === '/info') {
        var infoId = url.searchParams.get('id') || url.searchParams.get('v');
        if (!infoId) return response({ success: false, error: 'Missing id' }, 400);
        var info = await getYoutube(infoId);
        return response({
          success: true,
          videoId: infoId,
          title: info.title,
          author: info.author,
          lengthSeconds: info.lengthSeconds,
          thumbnail: info.thumbnail,
          playability: info.playability
        });
      }

      if (path === '/audio') {
        var audioId = url.searchParams.get('id') || url.searchParams.get('v');
        if (!audioId) return response({ success: false, error: 'Missing id' }, 400);
        var audioInfo = await getYoutube(audioId);
        var audioFormats = filterFormats(audioInfo.rawFormats, 'audio', 0);
        return response({
          success: true,
          videoId: audioId,
          title: audioInfo.title,
          author: audioInfo.author,
          lengthSeconds: audioInfo.lengthSeconds,
          thumbnail: audioInfo.thumbnail,
          formats: audioFormats
        });
      }

      if (path === '/video') {
        var videoId = url.searchParams.get('id') || url.searchParams.get('v');
        if (!videoId) return response({ success: false, error: 'Missing id' }, 400);
        var q = parseInt(url.searchParams.get('quality') || '720', 10);
        var videoInfo = await getYoutube(videoId);
        var videoFormats = filterFormats(videoInfo.rawFormats, 'video', q || 720);
        return response({
          success: true,
          videoId: videoId,
          title: videoInfo.title,
          author: videoInfo.author,
          lengthSeconds: videoInfo.lengthSeconds,
          thumbnail: videoInfo.thumbnail,
          formats: videoFormats
        });
      }

      return response({ success: false, error: 'Use /health, /info, /audio or /video' }, 404);
    } catch (e) {
      return response({ success: false, error: String(e && e.message ? e.message : e) }, 500);
    }
  }
};

function response(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type, x-api-key'
    }
  });
}

async function getYoutube(videoId) {
  var body = {
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '19.02.39',
        androidSdkVersion: 34,
        userAgent: 'com.google.android.youtube/19.02.39 (Linux; U; Android 14)',
        osName: 'Android',
        osVersion: '14',
        hl: 'pt',
        gl: 'AO'
      }
    },
    videoId: videoId,
    contentCheckOk: true,
    racyCheckOk: true
  };

  var r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'com.google.android.youtube/19.02.39 (Linux; U; Android 14)'
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) throw new Error('YouTube HTTP ' + r.status);
  var data = await r.json();
  var st = data.playabilityStatus || {};
  if (st.status && st.status !== 'OK') throw new Error(st.reason || st.status);

  var vd = data.videoDetails || {};
  var thumbs = [];
  if (vd.thumbnail && vd.thumbnail.thumbnails) thumbs = vd.thumbnail.thumbnails;
  var thumb = thumbs.length ? thumbs[thumbs.length - 1].url : '';
  var sd = data.streamingData || {};
  var raw = [];
  var a = sd.formats || [];
  var b = sd.adaptiveFormats || [];
  var i;
  for (i = 0; i < a.length; i++) raw.push(a[i]);
  for (i = 0; i < b.length; i++) raw.push(b[i]);

  return {
    title: vd.title || 'YouTube',
    author: vd.author || '',
    lengthSeconds: parseInt(vd.lengthSeconds || '0', 10) || 0,
    thumbnail: thumb,
    playability: st.status || 'OK',
    rawFormats: raw
  };
}

function filterFormats(raw, mode, maxHeight) {
  var list = [];
  var i;
  for (i = 0; i < raw.length; i++) {
    var f = raw[i];
    if (!f || !f.url) continue;
    var mime = f.mimeType || '';
    var hasAudio = mime.indexOf('audio/') === 0 || !!f.audioQuality;
    var hasVideo = mime.indexOf('video/') === 0 || !!f.qualityLabel;

    if (mode === 'audio') {
      if (!hasAudio || f.qualityLabel) continue;
    } else {
      if (!hasVideo) continue;
      var h = parseInt(String(f.qualityLabel || '0'), 10) || 0;
      if (maxHeight && h > maxHeight) continue;
    }

    list.push({
      url: f.url,
      mimeType: mime,
      bitrate: f.bitrate || 0,
      qualityLabel: f.qualityLabel || '',
      contentLength: f.contentLength || '',
      audioQuality: f.audioQuality || '',
      hasAudio: hasAudio,
      hasVideo: hasVideo
    });
  }

  list.sort(function (x, y) {
    if (mode === 'audio') return (y.bitrate || 0) - (x.bitrate || 0);
    var ax = parseInt(x.qualityLabel || '0', 10) || 0;
    var ay = parseInt(y.qualityLabel || '0', 10) || 0;
    if (ay !== ax) return ay - ax;
    return (y.bitrate || 0) - (x.bitrate || 0);
  });

  return list.slice(0, 3);
}
