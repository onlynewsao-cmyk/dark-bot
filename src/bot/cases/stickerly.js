/**
 * DARK BOT — STICKER.LY + PIN
 * Pesquisa ampla (vários packs) + figurinhas estáticas e ANIMADAS.
 */
'use strict';

const config = require('../../config');
let _lz_stickerMaker;
const stickerMaker = new Proxy({}, { get: (_, k) => (_lz_stickerMaker ||= require('../stickerMaker'))[k] });

module.exports = function registerStickerlyCases(registerCase) {

  // v7.77: converte + envia UM pack (o escolhido da lista, ou direto por id/URL)
  async function enviarPack(sock, msg, ctx, packId, nomeBusca) {
    const sly = require('../stickerly');
    const detail = await sly.getPack(packId);
    if (!detail.stickers?.length) throw new Error('Pack sem stickers');
    const stickerPack = require('../stickerPack');
    const packIdOut = stickerMaker.makePackId
      ? stickerMaker.makePackId(nomeBusca || detail.title)
      : 'sly-' + Date.now().toString(36);
    const searchName = String(detail.title || nomeBusca || 'Pack').replace(/\s+/g, ' ').trim().slice(0, 40);
    // v7.77: fetch+conversão em paralelo (6) — 30 sequenciais demoravam ~1min
    const alvos = detail.stickers.slice(0, 30);
    async function converterUm(s) {
      try {
        const buf = await require('../mediaHandler').fetchBuffer(s.url);
        if (!buf || buf.length < 500) return null;
        const stk = await stickerMaker.create(buf, {
          botName: config.bot.name, ownerName: config.owner.name,
          userName: ctx.pushName, groupName: ctx.groupName || 'PV',
          isVideo: !!s.isAnimated,
          packName: searchName,
          searchQuery: searchName,
          remoteJid: ctx.remoteJid,
          packId: packIdOut,
          skipGroupWm: true,
        });
        return stk && stk.length > 50 ? { stk, anim: !!s.isAnimated } : null;
      } catch { return null; }
    }
    const stickers = [];
    let animCount = 0;
    for (let i = 0; i < alvos.length; i += 6) {
      const lote = await Promise.all(alvos.slice(i, i + 6).map(converterUm));
      for (const r of lote) {
        if (!r) continue;
        stickers.push(r.stk);
        if (r.anim) animCount++;
      }
    }
    if (!stickers.length) throw new Error('Nenhuma figurinha convertida');
    const finished = await stickerPack.sendFinishedPack(sock, ctx.remoteJid, stickers, {
      query: searchName, packId: packIdOut, quoted: msg,
    });
    await sock.sendMessage(ctx.remoteJid, {
      text:
        '✅ Pack *' + searchName + '*\n' +
        '📦 ' + finished.stickers.length + ' figurinhas (' + animCount + ' animadas)\n\n' +
        finished.description,
    }, { quoted: msg });
  }

  registerCase(['stickerly', 'sly', 'slypack'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) {
      return reply(
        '🔍 *STICKER.LY*\n\n' +
        `*${prefix}sly* <nome> — mostra a lista de packs\n` +
        `*${prefix}sly* Neymar gif — packs *animados*\n` +
        `*${prefix}sly* <link ou id do pack> — baixa direto\n\n` +
        'Escolhe o pack respondendo com o número.'
      );
    }
    sock.sendMessage(ctx.remoteJid, { react: { text: '🔍', key: msg.key } });
    try {
      const sly = require('../stickerly');
      // ── direto: link sticker.ly/s/ID ou id cru (1 token, sem espaços) ──
      const linkId = (query.match(/sticker\.ly\/s\/([\w-]+)/i) || [])[1] || null;
      const idCru = !/\s/.test(query) && /^[\w-]{8,}$/.test(query) ? query : null;
      if (linkId || idCru) {
        try {
          await enviarPack(sock, msg, ctx, linkId || idCru, query);
          sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
          return;
        } catch (e) {
          if (linkId) throw e; // link explícito: erro é erro
          // id cru falhou → cai para a pesquisa normal
        }
      }
      // ── v7.77: pesquisa mostra a LISTA de packs ──
      const packs = await sly.searchPacks(query, { size: 20 });
      if (!packs.length) throw new Error('Nenhum pack encontrado para: ' + query);
      const lista = require('../listaEscolha');
      const itens = packs.slice(0, 10);
      await lista.mostrar(sock, msg, ctx, {
        titulo: `🔍 *${packs.length} packs* — ${query.slice(0, 40)}`,
        linhas: itens.map((p) => `${p.isAnimated ? '🎞️' : '🖼️'} *${String(p.title || 'Pack').slice(0, 45)}*\n   📦 ${p.stickerCount || '?'} figs • 👤 ${String(p.author || '?').slice(0, 25)}`),
        itens, tipo: 'sly',
        aoEscolher: async ({ item }) => {
          await enviarPack(sock, msg, ctx, item.id, query);
          sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
        },
      });
      sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    } catch (e) {
      sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ sticker.ly: ' + e.message);
    }
  }, true);

  async function runPin({ sock, msg, ctx, args, prefix, reply, forceVideo = false }) {
    const text = args.join(' ').trim();
    if (!text) return reply(
      '╔━᳀『 ᴘɪɴᴛʀᴇsᴛ 』═᳀\n' +
      '⌬ Use: *' + prefix + 'pin <termo>*\n' +
      '⌬ Ex: *' + prefix + 'pin gatos*\n' +
      '⌬ Ex: *' + prefix + 'pin Messi|vídeo*\n' +
      '⌬ Ex: *' + prefix + 'pin gatos |6|vídeo*\n' +
      '⌬ Ex: *' + prefix + 'pin gatos |imagem*\n' +
      '⌬ *' + prefix + 'pinmp4 Messi* — só vídeo\n' +
      '⌬ Manda até 10 mídias\n' +
      '╚═━═━═━═━═━═━═━═᳀'
    );
    sock.sendMessage(ctx.remoteJid, { react: { text: '🔎', key: msg.key } });
    try {
      const pin = require('../pinterestSearch');
      const parsed = pin.parsePinArgs(text);
      if (forceVideo) parsed.type = 'video';
      if (!parsed.query) return reply('Uso: ' + prefix + 'pin <termo> |qtd|tipo');

      const results = await pin.searchPinterest(parsed.query, {
        type: parsed.type,
        limit: parsed.limit,
      });
      if (!results.length) {
        throw new Error(parsed.type === 'video'
          ? 'Nenhum vídeo encontrado. Tenta outro termo ou um link do pin.'
          : 'Nenhum resultado. A API do Pinterest está instável — tenta de novo.');
      }

      let sent = 0;
      for (const item of results) {
        const url = item.media_url || item.image_url || item.url;
        if (!url) continue;
        const isVid = item.type === 'video' || parsed.type === 'video' || /\.mp4/i.test(url);
        try {
          if (isVid) {
            const buf = await require('../mediaHandler').fetchBuffer(url);
            if (!buf || buf.length < 2000) continue;
            await sock.sendMessage(ctx.remoteJid, {
              video: buf, mimetype: 'video/mp4',
              caption: '📌 Pinterest — ' + parsed.query,
            }, { quoted: msg });
          } else {
            await sock.sendMessage(ctx.remoteJid, {
              image: { url },
              caption: '📌 Pinterest — ' + parsed.query,
            }, { quoted: msg });
          }
          sent++;
        } catch { /* item morto */ }
      }
      if (!sent) throw new Error('Encontrei pins mas nenhum ficheiro abriu. Tenta outro termo.');
      sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ Pinterest: ' + e.message);
    }
  }

  registerCase(['pin', 'polo'], async (c) => runPin(c), true);
  registerCase(['pinmp4', 'pinvd', 'pinvideo'], async (c) => runPin({ ...c, forceVideo: true }), true);
};
