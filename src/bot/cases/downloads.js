/**
 * DARK BOT — Cases de Downloads 🎵
 *
 * play   → um card compacto com botões directos de áudio/vídeo — resultado #1
 * play2  → mesmo estilo — resultado alternativo #2
 * play3  → mesmo estilo — resultado #3 (qualidade alta)
 * ytd    → áudio MP3 enviado após um toque no botão do card
 * gyt    → vídeo MP4 enviado após um toque no botão do card
 *
 * O primeiro resultado usa áudio 128k e vídeo 480p para reduzir espera;
 * sem ButtonV2, o card degrada para texto com os mesmos comandos directos.
 */

'use strict';

// v6.46: lazy-load. Estes módulos puxam ytdl-core/ffmpeg e custavam
// ~370ms no arranque — só neste ficheiro. No Render free (que dorme
// por inactividade) isso é tempo somado a CADA cold start, mesmo que
// ninguém use um download. Agora só carregam quando são precisos.
let _szp, _ytdl, _mh;
const systemZeroPlay = new Proxy({}, { get: (_, k) => (_szp ||= require('../systemZeroPlay'))[k] });
const ytdl           = new Proxy({}, { get: (_, k) => (_ytdl ||= require('../ytdl'))[k] });
const mediaHandler   = new Proxy({}, { get: (_, k) => (_mh   ||= require('../mediaHandler'))[k] });
const config         = require('../../config');

// ── Helper: envia áudio com card de metadados ─────────────────
async function sendAudioCard(sock, jid, quoted, r) {
  // v7.59: SEM capa — o externalAdReply+thumbnail quebrava a entrega/
  // renderização no fluxo do botão (mídia "invisível" p/ membros).
  // Áudio simples (só buffer + nome) entrega sempre.
  const title    = r.title    || 'Áudio';
  const mime     = r.mimetype || 'audio/mpeg';
  const ext      = mime.includes('mp4') ? 'm4a' : 'mp3';
  const fileName = `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.${ext}`;

  let audioBuffer = r.buffer && Buffer.isBuffer(r.buffer) ? r.buffer : null;
  try {
    if (!audioBuffer) audioBuffer = await mediaHandler.fetchBuffer(r.url);
    if (!mediaHandler.isAudioBytes(audioBuffer)) throw new Error('áudio vazio ou inválido');
    console.log('[MUSIC-SEND]', jid, Math.round(audioBuffer.length / 1024) + 'KB', mime, (r.source || r.quality || '') + ' nocover');
    return await sock.sendMessage(jid, { audio: audioBuffer, mimetype: mime, fileName, ptt: false }, { quoted });
  } catch (bufferError) {
    // Algumas URLs de provider são válidas para o fetch do WhatsApp, mas
    // expiram/bloqueiam o fetch do Node. Tenta a entrega por URL antes de
    // trocar de provider; isso evita perder músicas que já foram geradas.
    if (r.url) {
      console.log('[MUSIC-SEND]', jid, 'URL', mime, (r.source || r.quality || '') + ' nocover');
      return sock.sendMessage(jid, { audio: { url: r.url }, mimetype: mime, fileName, ptt: false }, { quoted });
    }
    throw bufferError;
  }
}

// ── Helper: envia vídeo MP4 reproduzível no WhatsApp ─────────
async function sendVideoFile(sock, jid, quoted, buf, caption, title, opts = {}) {
  if (!buf || buf.length < 4096) throw new Error('vídeo vazio');
  const compatible = await require('../videoCompat').prepareForWhatsApp(buf, {
    maxHeight: opts.maxHeight || 480,
  });
  const duration = compatible.duration || opts.duration || '';
  const finalCaption = duration && !/⏱️\s*(?:\?|—)?\s*(?:\||$)/.test(caption)
    ? caption
    : (duration ? String(caption).replace(/⏱️\s*(?:\?|—)?/, `⏱️ ${duration}`) : caption);
  return sock.sendMessage(jid, {
    video: compatible.buffer,
    caption: finalCaption,
    mimetype: 'video/mp4',
  }, { quoted });
}

// ─────────────────────────────────────────────
// runPlaySearch — fluxo play/play2/play3
// Estrutura EXACTA do código de referência (case 'play'),
// adaptada ao contexto do caseHandler + fallbacks robustos.
// ─────────────────────────────────────────────

// ── Card compacto e único: áudio directo num toque + opção vídeo ──
async function enviarCardPlay(sock, m, msg, video, prefix, Q, bodyExtra, footer) {
  const mediaUrl = String(video.youtube_url || video.url || '').trim();
  if (!mediaUrl) throw new Error('resultado sem URL de mídia');

  const author = String(video.author || 'Canal desconhecido').slice(0, 44);
  const duration = String(video.duration || '?').slice(0, 12);
  const views = Number(video.views || 0).toLocaleString('pt-BR');
  const lines = [
    bodyExtra ? `🔎 ${bodyExtra}` : '',
    `👤 ${author}`,
    `⏱️ ${duration}  ·  👁️ ${views}`,
    `🎵 ${Q.audio}  ·  🎬 ${Q.video}p`,
  ].filter(Boolean);
  const body = lines.join('\n');
  const audioCmd = `${prefix}ytd ${mediaUrl} | ${Q.audio}`;
  const videoCmd = `${prefix}gyt ${mediaUrl} | mp4 | ${Q.video} | ${video.duration || ''}`;

  let ButtonV2 = null;
  try { ButtonV2 = require('@systemzero/baileys/lib/MB.cjs').ButtonV2; } catch {}
  if (ButtonV2) {
    try {
      const card = new ButtonV2(sock);
      card.setTitle(String(video.title || 'Música').slice(0, 60));
      card.setBody(body);
      card.setFooter(String(footer || 'DARK BOT · escolhe áudio ou vídeo').slice(0, 64));
      if (video.thumbnail) { try { card.setThumbnail(video.thumbnail); } catch {} }
      card.addButton(`🎵 Áudio ${Q.audio}`, audioCmd);
      card.addButton(`🎬 Vídeo ${Q.video}p`, videoCmd);
      await card.send(m.chat, { quoted: msg });
      return;
    } catch (e) {
      console.warn('[PLAY] ButtonV2 falhou; a enviar opções em texto:', e.message?.slice(0, 80));
    }
  }

  // Fallback simples: os dois comandos continuam disponíveis sem a biblioteca de botões.
  await sock.sendMessage(m.chat, {
    text: `🎵 *${String(video.title || 'Música').slice(0, 60)}*\n${body}\n\nÁudio: ${audioCmd}\nVídeo: ${videoCmd}`,
  }, { quoted: msg });
}

async function runPlaySearch({ sock, m, msg, ctx, text, prefix, command }, resultIndex = 0, quality = {}) {
  if (!text) return m.reply(`Exemplo: ${prefix + command} Slash Inferno`);

  // Qualidade por comando
  const Q = {
    audio: quality.audio || '128k',
    video: quality.video || '720',
    label: quality.label || 'Standard',
  };

  sock.sendMessage(m.chat, { react: { text: '🫡', key: m.key } });

  try {
    const searchData = await systemZeroPlay.ytsearch(text);
    if (!searchData?.resultados?.length) {
      sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply('Nenhum resultado encontrado.');
    }

    const resultados = searchData.resultados || [];
    const footer = config.footer || (config.bot?.name ? `${config.bot.name} 🕸️ DARK BOT` : '© DARK BOT v6');
    const video = resultados[Math.min(resultIndex, resultados.length - 1)];
    const bodyExtra = resultIndex > 0 ? `Resultado #${resultIndex + 1}` : '';

    await enviarCardPlay(sock, m, msg, video, prefix, Q, bodyExtra, footer);
    sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
  } catch (e) {
    if (!e.message?.includes('rate-overlimit')) {
      console.error('[PLAY ERROR]', e.message);
      sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      m.reply('Erro ao buscar: ' + e.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// CASES DE DOWNLOADS
// ─────────────────────────────────────────────────────────────
module.exports = function registerDownloadCases(registerCase) {

  // ════════════════════════════════════════════════
  // case 'play' — card compacto, igual ao estilo play3 (resultado #1)
  // ════════════════════════════════════════════════
  registerCase(['play', 'music', 'musica', 'yt', 'ytmp3'], (caseCtx) =>
    runPlaySearch(caseCtx, 0, { audio: '128k', video: '480', label: 'Rápido' }));

  // ════════════════════════════════════════════════
  // case 'play2' — resultado alternativo (#2)
  // ════════════════════════════════════════════════
  registerCase(['play2', 'music2'], (caseCtx) =>
    runPlaySearch(caseCtx, 1, { audio: '192k', video: '720', label: 'Medium' }));

  // ════════════════════════════════════════════════
  // case 'play3' — resultado #3
  // ════════════════════════════════════════════════
  registerCase(['play3', 'music3'], (caseCtx) =>
    runPlaySearch(caseCtx, 2, { audio: '320k', video: '1080', label: 'High Quality' }));

  // ════════════════════════════════════════════════
  // case 'playhq' — alta qualidade directa (320kbps)
  // ════════════════════════════════════════════════
  registerCase(['playhq', 'hq', 'playmax'], async ({
    sock, msg, ctx, text, prefix, reply, react,
  }) => {
    if (!text) return reply(`🎵 *Alta qualidade (320kbps)*\n\nExemplo: \`${prefix}playhq nome da música\``);

    react('⏳');
    try {
      const r = await ytdl.getAudio(text, '320k');
      await sendAudioCard(sock, ctx.remoteJid, msg, r);
      react('✅');
    } catch (e) {
      react('❌');
      return reply('❌ Falha no download.');
    }
  });

  // ════════════════════════════════════════════════
  // case 'ytd' — download áudio por URL (do botão)
  // ════════════════════════════════════════════════
  registerCase(['ytd', 'baixaraudio', 'dlmp3'], async ({
    sock, msg, ctx, text, args, prefix, reply, react,
  }) => {
    // Parse: "!ytd url" ou "!ytd url | 320k"
    const parts = (text || args.join(' ')).split('|').map(s => s.trim());
    const url = parts[0];
    const quality = parts[1] || '128k';
    if (!url) return reply('🎵 Uso: ' + prefix + 'ytd <url>');

    react('⏳');
    try {
      let r;
      try {
        r = await systemZeroPlay.ytAudio(url, quality);
        // A URL externa pode expirar ou bloquear o servidor no momento do
        // envio. Nesse caso, não basta ter obtido a URL: tenta o fallback
        // local também quando a entrega do buffer falhar.
        await sendAudioCard(sock, ctx.remoteJid, msg, r);
      } catch (firstError) {
        r = await ytdl.getAudio(url, quality);
        if (!r || !r.buffer || r.buffer.length < 1024) throw new Error('audio vazio');
        await sendAudioCard(sock, ctx.remoteJid, msg, r);
      }
      react('✅');
    } catch (e) {
      react('❌');
      return reply('❌ Falha no download de audio: ' + (e.message || '').slice(0, 100));
    }
  });

  // ════════════════════════════════════════════════
  // case 'gyt' — download vídeo por URL (do botão)
  // ════════════════════════════════════════════════
  registerCase(['gyt', 'baixarvideo', 'dlmp4'], async ({
    sock, msg, ctx, text, args, prefix, reply, react,
  }) => {
    // Parse: "!gyt url | mp4 | 720" ou "!gyt url"
    const parts = (text || args.join(' ')).split('|').map(s => s.trim());
    const url = parts[0];
    const resolution = parts[2] || parts[1] || '720';
    // Os botões de !play incluem a duração como quarto campo; URLs manuais
    // continuam compatíveis e simplesmente deixam este valor vazio.
    const selectedDuration = parts[3] || '';
    if (!url) return reply('🎬 Uso: ' + prefix + 'gyt <url>');

    react('⏳');
    try {
      let r;
      // O motor local prioriza MP4 AVC/AAC. A API externa às vezes devolvia
      // um MP4 com codec que o WhatsApp Android recebia, mas não conseguia abrir.
      try {
        r = await ytdl.getVideo(url, resolution);
      } catch (localError) {
        r = await systemZeroPlay.ytVideo(url, resolution);
        if (!r.buffer && r.url) r.buffer = await mediaHandler.fetchBuffer(r.url);
      }
      if (!r || !r.buffer || r.buffer.length < 4096) throw new Error('video vazio');
      const duration = r.duration || selectedDuration || '?';
      const cap = '🎬 *' + (r.title || 'Video') + '*\n👤 ' + (r.author || '') + '\n⏱️ ' + duration + ' | 📺 ' + (r.quality || resolution + 'p');
      await sendVideoFile(sock, ctx.remoteJid, msg, r.buffer, cap, r.title, {
        duration,
        maxHeight: Number(String(resolution).replace(/\D/g, '')) || 480,
      });
      react('✅');
    } catch (e) {
      react('❌');
      return reply('❌ Falha no download de video: ' + (e.message || '').slice(0, 100));
    }
  });

  // ════════════════════════════════════════════════
  // case 'video' — vídeo HD 720p directo
  // ════════════════════════════════════════════════
  // v7.77: !video com LISTA — nome → escolhe o número; URL → direto
  async function runVideoLista({ sock, msg, ctx, text, prefix, reply, react }, maxH, etiqueta) {
    react('⏳');
    try {
      if (!/^https?:\/\//i.test(text || '')) {
        const achados = await ytdl.searchVideoList(text, 8);
        if (!achados?.length) throw new Error('Sem resultados');
        if (achados.length > 1) {
          const lista = require('../listaEscolha');
          await lista.mostrar(sock, msg, ctx, {
            titulo: `🎬 *${achados.length} resultados* — ${String(text).slice(0, 40)}`,
            linhas: achados.map((v) => `*${String(v.title || '?').slice(0, 55)}*\n   ⏱️ ${v.duration || '?'} • 👤 ${String(v.author || '?').slice(0, 30)}`),
            itens: achados, tipo: 'video',
            aoEscolher: async ({ item }) => {
              const r = await ytdl.getVideo(item.url, maxH);
              const cap = `🎬 *${r.title}*\n👤 ${r.author || ''} | ⏱️ ${r.duration || '?'} | 📺 ${etiqueta}`;
              await sendVideoFile(sock, ctx.remoteJid, msg, r.buffer, cap, r.title);
              react('✅');
            },
          });
          react('✅');
          return;
        }
      }
      const r   = await ytdl.getVideo(text, maxH);
      const cap = `🎬 *${r.title}*\n👤 ${r.author || ''} | ⏱️ ${r.duration || '?'} | 📺 ${etiqueta}`;
      await sendVideoFile(sock, ctx.remoteJid, msg, r.buffer, cap, r.title);
      react('✅');
    } catch (e) {
      react('❌');
      return reply('❌ Falha no download de vídeo.');
    }
  }

  registerCase(['video', 'vid', 'ytmp4', 'yt4'], async (a) => {
    if (!a.text) return a.reply(
      `🎬 *Exemplo:* \`${a.prefix}video Naruto AMV\`\n\n` +
      `• \`${a.prefix}video\`  — 720p HD\n` +
      `• \`${a.prefix}video2\` — 1080p FHD`
    );
    return runVideoLista(a, '720', '720p HD');
  });

  // ════════════════════════════════════════════════
  // case 'video2' — vídeo FHD 1080p
  // ════════════════════════════════════════════════
  registerCase(['video2', 'vid2', 'fhd', 'fullhd'], async (a) => {
    if (!a.text) return a.reply(`🎬 *Full HD (1080p)*\n\nExemplo: \`${a.prefix}video2 nome do vídeo\``);
    return runVideoLista(a, '1080', '1080p FHD');
  });
};
