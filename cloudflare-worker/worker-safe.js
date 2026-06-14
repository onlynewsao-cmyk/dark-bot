/**
 * Dark Bot YouTube Proxy Worker
 * 
 * Deploy this on Cloudflare Workers (free tier: 100k requests/day).
 * This Worker fetches YouTube stream URLs from Cloudflare's clean IPs
 * and returns them to the bot server. Dashboard-safe build: no eval/new Function.
 * 
 * Endpoints:
 *   GET /audio?id=VIDEO_ID&quality=128     → Returns audio stream URL + metadata
 *   GET /video?id=VIDEO_ID&quality=720     → Returns video stream URL + metadata
 *   GET /info?id=VIDEO_ID                  → Returns video metadata only
 *   GET /search?q=QUERY                    → Search YouTube
 */

// ==================== YOUTUBE INNERTUBE API ====================

const YT_BASE = 'https://www.youtube.com';

const CLIENTS = {
  WEB: {
    clientName: 'WEB',
    clientVersion: '2.20260612.01.00',
    userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    platform: 'DESKTOP',
    osName: 'CrOS',
    osVersion: '14541.0.0',
    deviceMake: 'Google',
    deviceModel: 'ChromeBook',
    browserName: 'Chrome',
    browserVersion: '131.0.0.0',
  },
  ANDROID: {
    clientName: 'ANDROID',
    clientVersion: '19.02.39',
    userAgent: 'com.google.android.youtube/19.02.39 (Linux; U; Android 14)',
    platform: 'MOBILE',
    osName: 'Android',
    osVersion: '14',
    androidSdkVersion: 34,
    deviceMake: 'Google',
    deviceModel: 'Pixel 8',
  },
  IOS: {
    clientName: 'iOS',
    clientVersion: '19.02.39',
    userAgent: 'com.google.ios.youtube/19.02.39 (iPhone; iOS 17.4; GPU:Apple A15 GPU)',
    platform: 'MOBILE',
    osName: 'iPhone',
    osVersion: '17.4.0',
    deviceMake: 'Apple',
    deviceModel: 'iPhone15,2',
  },
};

let visitorData = null;
let playerCache = {};
let sessionCache = {};

// ==================== INNER TUBE API CALLS ====================

async function fetchVisitorData() {
  if (visitorData) return visitorData;
  try {
    const resp = await fetch(YT_BASE, {
      headers: { 'User-Agent': CLIENTS.WEB.userAgent },
    });
    const html = await resp.text();
    const ytcfgMatch = html.match(/ytcfg\.set\(\s*(\{.+?\})\s*\)\s*;/s);
    if (ytcfgMatch) {
      try {
        const ytcfg = JSON.parse(ytcfgMatch[1]);
        visitorData = ytcfg.VISITOR_DATA || ytcfg.INNERTUBE_CONTEXT?.client?.visitorData;
      } catch (e) {}
    }
    // Also try to extract from script tags
    if (!visitorData) {
      const vdMatch = html.match(/"visitorData"\s*:\s*"([^"]+)"/);
      if (vdMatch) visitorData = vdMatch[1];
    }
  } catch (e) {}
  return visitorData;
}

async function innerTubeCall(endpoint, payload, clientType = 'WEB') {
  const client = CLIENTS[clientType];
  const url = `${YT_BASE}/youtubei/v1/${endpoint}?prettyPrint=false&alt=json`;
  
  const body = {
    context: {
      client: {
        hl: 'en',
        gl: 'US',
        clientName: client.clientName,
        clientVersion: client.clientVersion,
        userAgent: client.userAgent,
        platform: client.platform,
        osName: client.osName,
        osVersion: client.osVersion,
        deviceMake: client.deviceMake || '',
        deviceModel: client.deviceModel || '',
        ...(client.androidSdkVersion ? { androidSdkVersion: client.androidSdkVersion } : {}),
        ...(client.browserName ? { browserName: client.browserName, browserVersion: client.browserVersion } : {}),
        utcOffsetMinutes: 0,
        timeZone: 'UTC',
      },
    },
    ...payload,
  };

  // Add visitorData for WEB client
  if (clientType === 'WEB') {
    const vd = await fetchVisitorData();
    if (vd) body.context.client.visitorData = vd;
  }

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': client.userAgent,
    'Accept': '*/*',
    'Origin': YT_BASE,
    'Referer': YT_BASE + '/',
  };

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  
  if (!resp.ok) {
    throw new Error(`InnerTube ${endpoint} returned ${resp.status}`);
  }
  
  return resp.json();
}

// ==================== PLAYER / URL DECIPHERING ====================

async function getPlayerJs(playerId) {
  if (playerCache[playerId]) return playerCache[playerId];
  
  const url = `${YT_BASE}/s/player/${playerId}/player_ias.vflset/en_US/base.js`;
  const resp = await fetch(url, { headers: { 'User-Agent': CLIENTS.WEB.userAgent } });
  if (!resp.ok) throw new Error(`Failed to fetch player JS: ${resp.status}`);
  const js = await resp.text();
  playerCache[playerId] = js;
  return js;
}

function extractDecipherFunctions(js) {
  // Extract the signature decipher function name
  const sigFuncNameMatch = js.match(/(?:\b|[^a-zA-Z0-9$])([a-zA-Z0-9$]{2,})\s*=\s*function\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)/);
  const sigFuncName = sigFuncNameMatch ? sigFuncNameMatch[1] : null;
  
  // Extract the n parameter transformation function name
  const nFuncNameMatch = js.match(/(?:\b|[^a-zA-Z0-9$])([a-zA-Z0-9$]{2,})\s*=\s*function\(\s*a\s*\)\s*\{\s*var\s+b\s*=\s*a\.split\(\s*""\s*\)/);
  const nFuncName = nFuncNameMatch ? nFuncNameMatch[1] : null;
  
  // Alternative n function pattern
  const nFuncNameMatch2 = js.match(/;([a-zA-Z0-9$]+)\s*=\s*function\((\w)\)\s*\{\s*\2=\s*\2\.split\(""\)/);
  const nFuncNameAlt = nFuncNameMatch2 ? nFuncNameMatch2[1] : null;
  
  return { sigFuncName, nFuncName: nFuncName || nFuncNameAlt };
}

function decipherSignature(js, sig) {
  // Dashboard-safe version: Cloudflare Workers blocks eval/new Function.
  // ANDROID client usually returns direct stream URLs, so we avoid dynamic code here.
  return sig;
}

function transformNParam(js, n) {
  if (!n) return n;
  try {
    // Find the n transformation function
    const nFuncMatch = js.match(/;([a-zA-Z0-9$]+)\s*=\s*function\((\w)\)\s*\{\s*\2=\s*\2\.split\(""\)\s*;([\s\S]*?)\breturn\s+\2\.join\(""\)/);
    if (!nFuncMatch) {
      // Try alternative pattern
      const nFuncMatch2 = js.match(/([a-zA-Z0-9$]+)\s*=\s*function\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)\s*;([\s\S]*?)\s*return\s+a\.join\(\s*""\s*\)/g);
      if (!nFuncMatch2) return n;
    }
    
    // For Cloudflare Workers, we can use a simpler approach
    // since we have access to the full JavaScript runtime
    return n;
  } catch (e) {
    return n;
  }
}

// ==================== VIDEO INFO & STREAMING ====================

async function getVideoStreams(videoId, mode = 'audio', quality = 'best') {
  // Try ANDROID client first - it often returns direct URLs
  let data;
  let usedClient = 'ANDROID';
  
  try {
    data = await innerTubeCall('player', {
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      playbackContext: {
        contentPlaybackContext: {
          vis: 0,
          splay: false,
          lactMilliseconds: '-1',
        },
      },
    }, 'ANDROID');
    
    if (data.playabilityStatus?.status !== 'OK') {
      throw new Error(`ANDROID: ${data.playabilityStatus?.status}`);
    }
  } catch (e) {
    // Fallback to WEB client
    try {
      data = await innerTubeCall('player', {
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
        playbackContext: {
          contentPlaybackContext: {
            vis: 0,
            splay: false,
            lactMilliseconds: '-1',
          },
        },
      }, 'WEB');
      usedClient = 'WEB';
    } catch (e2) {
      throw new Error(`Both clients failed: ${e.message}, ${e2.message}`);
    }
  }
  
  const streamingData = data.streamingData;
  if (!streamingData) {
    throw new Error(`No streaming data. Status: ${data.playabilityStatus?.status} - ${data.playabilityStatus?.reason || ''}`);
  }
  
  const videoDetails = data.videoDetails || {};
  const title = videoDetails.title || 'YouTube';
  const author = videoDetails.author || '';
  const lengthSeconds = parseInt(videoDetails.lengthSeconds) || 0;
  const thumbnail = videoDetails.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
  
  let allFormats = [
    ...(streamingData.formats || []),
    ...(streamingData.adaptiveFormats || []),
  ];
  
  // Filter formats based on mode
  let filteredFormats;
  if (mode === 'audio') {
    filteredFormats = allFormats.filter(f => 
      f.mimeType?.startsWith('audio/') || 
      f.audioQuality
    );
    // Remove formats with video
    filteredFormats = filteredFormats.filter(f => !f.qualityLabel);
  } else {
    // Video mode - prefer formats with both audio and video
    filteredFormats = allFormats.filter(f => f.qualityLabel);
  }
  
  if (!filteredFormats.length) {
    // Fallback: try all formats
    filteredFormats = allFormats;
  }
  
  // Sort by quality
  filteredFormats.sort((a, b) => {
    if (mode === 'audio') {
      return (b.bitrate || 0) - (a.bitrate || 0);
    }
    // For video, sort by resolution then bitrate
    const aRes = parseInt(a.qualityLabel) || 0;
    const bRes = parseInt(b.qualityLabel) || 0;
    if (bRes !== aRes) return bRes - aRes;
    return (b.bitrate || 0) - (a.bitrate || 0);
  });
  
  // Filter by quality preference
  if (mode === 'audio' && quality !== 'best') {
    const qualityMap = { '128': 128000, '192': 192000, '256': 256000, '320': 320000 };
    const targetBitrate = qualityMap[quality] || 128000;
    // Find closest quality
    const closest = filteredFormats.reduce((prev, curr) => 
      Math.abs((curr.bitrate || 0) - targetBitrate) < Math.abs((prev.bitrate || 0) - targetBitrate) ? curr : prev
    );
    filteredFormats = closest.bitrate > 0 ? [closest] : filteredFormats;
  } else if (mode === 'video') {
    const targetRes = parseInt(quality) || 720;
    const matching = filteredFormats.filter(f => (parseInt(f.qualityLabel) || 0) <= targetRes);
    if (matching.length) filteredFormats = matching;
  }
  
  // Process formats to get URLs
  const results = [];
  for (const format of filteredFormats.slice(0, 3)) {
    let url = format.url;
    
    // If URL is in signatureCipher, extract and decipher it
    if (!url && format.signatureCipher) {
      const params = new URLSearchParams(format.signatureCipher);
      url = params.get('url');
      const sig = params.get('s');
      const sp = params.get('sp') || 'signature';
      
      if (url && sig) {
        // We need the player JS to decipher the signature
        try {
          const playerId = data.assets?.js?.match(/player\/([^/]+)/)?.[1];
          if (playerId) {
            const playerJs = await getPlayerJs(playerId);
            const decipheredSig = decipherSignature(playerJs, sig);
            url += `&${sp}=${encodeURIComponent(decipheredSig)}`;
          }
        } catch (e) {
          // Without deciphering, the URL won't work
          url = null;
        }
      }
    }
    
    if (url) {
      // The n parameter needs transformation to avoid throttling
      // For now, we'll include the URL as-is
      results.push({
        url,
        mimeType: format.mimeType,
        bitrate: format.bitrate,
        qualityLabel: format.qualityLabel || '',
        contentLength: format.contentLength,
        audioQuality: format.audioQuality || '',
        hasAudio: !!format.audioQuality || format.mimeType?.includes('audio'),
        hasVideo: !!format.qualityLabel,
      });
    }
  }
  
  if (!results.length) {
    throw new Error('No playable formats found with stream URLs');
  }
  
  return {
    title,
    author,
    lengthSeconds,
    thumbnail,
    videoId,
    client: usedClient,
    formats: results,
  };
}

// ==================== SEARCH ====================

async function searchYouTube(query) {
  const data = await innerTubeCall('search', {
    query,
  }, 'WEB');
  
  const results = [];
  try {
    const tabs = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const tab of tabs) {
      const items = tab.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const video = item.videoRenderer;
        if (video?.videoId) {
          results.push({
            videoId: video.videoId,
            title: video.title?.runs?.[0]?.text || '',
            author: video.ownerText?.runs?.[0]?.text || '',
            lengthSeconds: video.lengthSeconds ? parseInt(video.lengthSeconds) : 0,
            thumbnail: video.thumbnail?.thumbnails?.[0]?.url || '',
            viewCount: video.viewCountText?.simpleText || '',
          });
        }
      }
    }
  } catch (e) {}
  
  return results;
}

// ==================== RESPONSE HELPERS ====================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message, success: false }, status);
}

// ==================== MAIN HANDLER ====================

const API_KEY = 'darknet-engine-2026'; // Simple API key for security

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        },
      });
    }
    
    // Simple API key check (optional)
    const apiKey = url.searchParams.get('key') || request.headers.get('X-API-Key') || '';
    const configuredKey = env?.API_KEY || API_KEY;
    if (apiKey && apiKey !== configuredKey) {
      return errorResponse('Invalid API key', 403);
    }
    
    try {
      // Health check
      if (path === '/' || path === '/health') {
        return jsonResponse({ status: 'ok', service: 'dark-bot-yt-proxy', version: '1.0.0' });
      }
      
      // Audio stream URL
      if (path === '/audio') {
        const videoId = url.searchParams.get('id') || url.searchParams.get('v');
        const quality = url.searchParams.get('quality') || 'best';
        
        if (!videoId) return errorResponse('Missing video ID. Use ?id=VIDEO_ID');
        
        const result = await getVideoStreams(videoId, 'audio', quality);
        return jsonResponse({ success: true, ...result });
      }
      
      // Video stream URL
      if (path === '/video') {
        const videoId = url.searchParams.get('id') || url.searchParams.get('v');
        const quality = url.searchParams.get('quality') || '720';
        
        if (!videoId) return errorResponse('Missing video ID. Use ?id=VIDEO_ID');
        
        const result = await getVideoStreams(videoId, 'video', quality);
        return jsonResponse({ success: true, ...result });
      }
      
      // Video info
      if (path === '/info') {
        const videoId = url.searchParams.get('id') || url.searchParams.get('v');
        if (!videoId) return errorResponse('Missing video ID');
        
        const data = await innerTubeCall('player', {
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }, 'ANDROID');
        
        const vd = data.videoDetails || {};
        return jsonResponse({
          success: true,
          videoId,
          title: vd.title,
          author: vd.author,
          lengthSeconds: parseInt(vd.lengthSeconds) || 0,
          thumbnail: vd.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
          playability: data.playabilityStatus?.status,
        });
      }
      
      // Search
      if (path === '/search') {
        const query = url.searchParams.get('q') || url.searchParams.get('query');
        if (!query) return errorResponse('Missing search query. Use ?q=QUERY');
        
        const results = await searchYouTube(query);
        return jsonResponse({ success: true, query, results });
      }
      
      // Social media downloads (TikTok, Instagram, etc.) via Cobalt-compatible endpoint
      if (path === '/social') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return errorResponse('Missing URL. Use ?url=TARGET_URL');
        
        // Try Cobalt API
        const cobaltUrl = env?.COBALT_URL || 'https://api.cobalt.tools';
        const cobaltApiKey = env?.COBALT_API_KEY || '';
        
        try {
          const cobaltResp = await fetch(cobaltUrl + '/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(cobaltApiKey ? { 'Authorization': `Bearer ${cobaltApiKey}` } : {}),
            },
            body: JSON.stringify({
              url: targetUrl,
              downloadMode: 'auto',
              filenameStyle: 'basic',
            }),
          });
          
          const cobaltData = await cobaltResp.json();
          if (cobaltData.url) {
            return jsonResponse({ success: true, url: cobaltData.url, source: 'cobalt' });
          }
          if (cobaltData.picker?.length) {
            return jsonResponse({ success: true, url: cobaltData.picker[0].url, source: 'cobalt' });
          }
        } catch (e) {}
        
        return errorResponse('Could not download from this URL');
      }
      
      return errorResponse('Unknown endpoint. Use /audio, /video, /info, /search, or /social', 404);
      
    } catch (e) {
      return errorResponse(e.message || 'Internal error', 500);
    }
  },
};
