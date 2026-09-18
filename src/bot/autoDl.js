'use strict';
/**
 * v7.84 — ESCUDO VIVO (autoDL)
 * O escudo de links não devia SÓ permitir: quando alguém partilha um
 * link de plataforma permitida (yt/tiktok/kwai/ig/fb/x/spotify...),
 * o bot ATIVA-SE e baixa o conteúdo sozinho. Grupos que não querem
 * download desligam com `!antilink autodl off` (default: ON).
 *
 * Regras de bom senso:
 *  - só grupos, só mensagens de outros (nunca fromMe);
 *  - comandos (!play …) não disparam (o dono do pedido é o comando);
 *  - cooldown de 20 s por grupo (não vira fábrica de media);
 *  - 1 link por mensagem (o primeiro suportado);
 *  - falha = 1 linha humana, nunca stack trace.
 */
const linkPolicy = require('./linkPolicy');

const PLATS = [
  ['youtube', /(youtube\.com|youtu\.be|music\.youtube\.com)$/],
  ['tiktok', /(tiktok\.com|vm\.tiktok\.com)$/],
  ['kwai', /(kwai\.com|kw\.ai|kuaishou\.com)$/],
  ['instagram', /(instagram\.com|instagr\.am)$/],
  ['facebook', /(facebook\.com|fb\.com|fb\.watch|fb\.me)$/],
  ['twitter', /(twitter\.com|x\.com|t\.co)$/],
  ['spotify', /(spotify\.com|spotify\.link)$/],
  ['soundcloud', /(soundcloud\.com|snd\.sc)$/],
];

/** @returns {'youtube'|'tiktok'|...|null} */
function plataformaDe(url) {
  const h = linkPolicy.host(url);
  if (!h) return null;
  for (const [nome, re] of PLATS) {
    if (re.test(h) || h.endsWith('.' + nome + '.com')) return nome;
  }
  return null;
}

/** Primeiro link suportado num texto. Puro (testável). */
function primeiroSuportado(texto) {
  for (const u of linkPolicy.links(texto)) {
    const p = plataformaDe(u);
    if (p) return { url: u, plataforma: p };
  }
  return null;
}

const _ultimo = new Map(); // jid → ts
const COOLDOWN_MS = 20000;

function textoDe(msg) {
  const m = msg?.message || {};
  return m.conversation || m.extendedTextMessage?.text ||
         m.imageMessage?.caption || m.videoMessage?.caption || '';
}

/** Corre a par do antiLink no messageRouter. Nunca lança. */
async function check(sock, msg) {
  try {
    const jid = msg.key?.remoteJid;
    if (!jid?.endsWith('@g.us') || msg.key.fromMe) return false;
    const texto = textoDe(msg);
    if (!texto || texto.length < 10) return false;

    const gs = (await require('./hotCache').getGroupSettings(msg, jid)) || {};
    if (gs.autoDl === false) return false; // default ON; o grupo desliga se quiser

    // comando do bot (qualquer prefixo) não dispara o autoDL
    try {
      const pe = require('./prefixEngine');
      if (await pe.detect(texto, jid)) return false;
    } catch {}

    const achado = primeiroSuportado(texto);
    if (!achado) return false;

    const last = _ultimo.get(jid) || 0;
    if (Date.now() - last < COOLDOWN_MS) return false;
    _ultimo.set(jid, Date.now());

    // não bloqueia o router — o download corre em paralelo
    _processar(sock, jid, msg, achado).catch(async (e) => {
      console.warn('[autoDL]', String(e?.message || e).slice(0, 80));
      try {
        await sock.sendMessage(jid, { text: '🥲 Vi o link mas não consegui baixar agora — tenta mais logo.' }, { quoted: msg });
      } catch {}
    });
    return true;
  } catch { return false; }
}

async function _processar(sock, jid, msg, { url, plataforma }) {
  const dl = require('./downloader');
  const mediaHandler = require('./mediaHandler');
  const AUD = new Set(['youtube', 'spotify', 'soundcloud']);

  const r = await (AUD.has(plataforma)
    ? dl[plataforma === 'youtube' ? 'youtubeAudio' : plataforma](url)
    : dl[plataforma](url));
  if (!r) throw new Error('sem resultado');

  if (AUD.has(plataforma)) {
    const buf = r.buffer || await mediaHandler.fetchBuffer(r.url);
    if (!buf || buf.length < 2048) throw new Error('áudio vazio');
    await sock.sendMessage(jid, {
      audio: buf, mimetype: 'audio/mpeg',
      fileName: r.fileName || 'dark-dl.mp3',
      caption: `🎧 *${(r.title || 'DARK DL').slice(0, 80)}*\n🕸️ _via DARK DL_`,
    }, { quoted: msg });
    return;
  }

  const buf = r.buffer || await mediaHandler.fetchBuffer(r.url || r.download || r.download_url);
  if (!buf || buf.length < 4096) throw new Error('vídeo vazio');
  const isMP4 = buf.slice(4, 8).toString() === 'ftyp';
  const cap = `🎬 *${(r.title || 'DARK DL').slice(0, 80)}*\n🕸️ _via DARK DL_`;
  if (isMP4) {
    await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: cap }, { quoted: msg });
  } else {
    await sock.sendMessage(jid, { document: buf, fileName: `${(r.title || 'video').slice(0, 50)}.mp4`, mimetype: 'video/mp4', caption: cap }, { quoted: msg });
  }
}

module.exports = { check, plataformaDe, primeiroSuportado, COOLDOWN_MS };
