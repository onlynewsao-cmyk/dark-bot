const fs = require('fs');
let nc = fs.readFileSync('src/bot/nativeCommands.js', 'utf8');

const startMarker = '  async pinpacks({ sock, msg, ctx, args, config: cfg }) {';
const endMarker = '  // !pinvd <nome>';
const startIdx = nc.indexOf(startMarker);
const endIdx = nc.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) { console.error('MARKERS NOT FOUND'); process.exit(1); }

// Cache temporário de packs (packId → { stickers, info, ts })
const packCacheLine = "// ── Cache de packs temporário (10 min TTL) ──\nconst _packCache = new Map();\nsetInterval(() => { const now = Date.now(); for (const [k,v] of _packCache) if (now - v.ts > 600000) _packCache.delete(k); }, 60000);\n\n";

// Inserir cache antes da função pinpacks se ainda não existir
if (!nc.includes('_packCache')) {
  nc = nc.slice(0, startIdx) + packCacheLine + nc.slice(startIdx);
}

// Recalcular índices após inserção
const newStartIdx = nc.indexOf(startMarker);
const newEndIdx = nc.indexOf(endMarker);

const newPinpacks = `  async pinpacks({ sock, msg, ctx, args, config: cfg }) {
    const localConfig = cfg || config;
    const query = args.join(' ').trim();
    const RE = require('./renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    const pe = require('./prefixEngine');
    const pfx = await pe.getActivePrefix(ctx.remoteJid).catch(() => localConfig.bot.prefix);

    if (!query) return reply(sock, msg, ctx,
      RE.renderBlock(t, 'PINPACKS', [
        'Busca no Pinterest e cria',
        'um *Pack de Stickers* completo!',
        '',
        \`*\${pfx}pinpacks* <nome>\`,
        \`Ex: *\${pfx}pinpacks* anime dark\`,
      ], { botName: localConfig.bot.name })
    );

    await react(sock, msg, t.react || '⏳');

    const packName = \`📌 \${query.slice(0, 20)}\`;
    const packAuthor = \`\${localConfig.bot.name} • \${ctx.pushName}\`;

    // ── Progresso ──
    const progMsg = await sock.sendMessage(ctx.remoteJid, {
      text: RE.renderBlock(t, 'PINPACKS', [
        \`Pack: *\${query}*\`,
        '⏳ A buscar imagens...',
      ], { botName: localConfig.bot.name }),
    }, { quoted: msg });

    try {
      // ── Buscar imagens ──
      let items = [];
      const apis = [
        { url: 'https://api.siputzx.my.id/api/s/pinterest?query=', ext: r => r?.data },
        { url: 'https://api.lolhuman.xyz/api/pinterest?query=', key: '&apikey=darkbot', ext: r => r?.result },
      ];
      for (const api of apis) {
        try {
          const r = await mediaHandler.fetchJson(api.url + encodeURIComponent(query + ' aesthetic') + (api.key || ''), 15000);
          items = (api.ext(r) || []).filter(x => x?.image_url && /^https?/i.test(x.image_url) && x.type !== 'video');
          if (items.length >= 4) break;
        } catch {}
      }
      items = items.slice(0, 29);
      if (!items.length) throw new Error('Sem imagens encontradas.');

      await sock.sendMessage(ctx.remoteJid, {
        text: RE.renderBlock(t, 'PINPACKS', [
          \`Pack: *\${query}*\`,
          \`📥 \${items.length} imagens encontradas\`,
          '⚙️ A converter em stickers...',
        ], { botName: localConfig.bot.name }),
        edit: progMsg.key,
      });

      // ── Criar TODOS os stickers em memória ──
      const stickers = [];
      const thumbBufs = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const imgBuf = await mediaHandler.fetchBuffer(items[i].image_url);
          if (!imgBuf || imgBuf.length < 1000) continue;
          const stk = await stickerMaker.create(imgBuf, {
            packName, authorName: packAuthor,
            botName: localConfig.bot.name, ownerName: localConfig.owner.name,
            userName: ctx.pushName, groupName: ctx.groupName || 'Pack', isVideo: false,
          });
          if (stk && stk.length > 50) {
            stickers.push(stk);
            if (thumbBufs.length < 4) thumbBufs.push(imgBuf);
          }
        } catch {}
      }
      if (!stickers.length) throw new Error('Nenhuma imagem convertida.');

      // ── Criar collage 2x2 com sharp ──
      let collageBuf = null;
      try {
        const sharp = require('sharp');
        const size = 256;
        const thumbs = await Promise.all(
          thumbBufs.slice(0, 4).map(buf =>
            sharp(buf).resize(size, size, { fit: 'cover' }).toBuffer()
          )
        );
        // Preencher com placeholder se menos de 4
        while (thumbs.length < 4) {
          thumbs.push(await sharp({ create: { width: size, height: size, channels: 4, background: { r: 40, g: 40, b: 40, alpha: 1 } } }).png().toBuffer());
        }
        collageBuf = await sharp({
          create: { width: size * 2, height: size * 2, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } }
        })
          .composite([
            { input: thumbs[0], left: 0, top: 0 },
            { input: thumbs[1], left: size, top: 0 },
            { input: thumbs[2], left: 0, top: size },
            { input: thumbs[3], left: size, top: size },
          ])
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch {}

      // ── Guardar no cache ──
      const packId = 'pk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      _packCache.set(packId, { stickers, info: { name: packName, author: packAuthor, query, count: stickers.length }, ts: Date.now() });

      // ── Enviar UMA mensagem com preview do pack ──
      const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@systemzero/baileys');
      
      let headerMedia = null;
      if (collageBuf) {
        try {
          const media = await prepareWAMessageMedia({ image: collageBuf }, { upload: sock.waUploadToServer });
          headerMedia = media?.imageMessage;
        } catch {}
      }

      const cardBody = [
        \`📦 *Pack:* \${packName}\`,
        \`🤖 *Bot:* \${localConfig.bot.name}\`,
        \`👥 *Grupo:* \${ctx.groupName || 'PV'}\`,
        \`🎨 *Stickers:* \${stickers.length}\`,
        \`👤 *Autor:* \${ctx.pushName}\`,
      ].join('\\n');

      const cardFooter = \`\${t.icon || '🕸️'} \${localConfig.bot.name}\`;

      const msgContent = {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          header: headerMedia
            ? proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: true, imageMessage: headerMedia })
            : proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: false, title: '📦 ' + packName }),
          body: proto.Message.InteractiveMessage.Body.fromObject({ text: cardBody }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: cardFooter }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [{
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '📦 Ver pacote de figurinhas', id: pfx + 'takepack ' + packId }),
            }],
          }),
        }),
      };

      const finalMsg = generateWAMessageFromContent(ctx.remoteJid, msgContent, { userJid: sock.user?.id, quoted: msg });
      await sock.relayMessage(ctx.remoteJid, finalMsg.message, {
        messageId: finalMsg.key.id,
        additionalNodes: [{ tag: 'biz', attrs: {}, content: [{
          tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
          content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
        }]}],
      });

      await react(sock, msg, t.react || '✅');

    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, {
        text: RE.renderBlock(t, 'ERRO', ['❌ ' + e.message], { botName: localConfig.bot.name }),
        edit: progMsg.key,
      });
      await react(sock, msg, '❌');
    }
  },

  // ── takepack: envia os stickers do cache ──
  async takepack({ sock, msg, ctx, args, config: cfg }) {
    const localConfig = cfg || config;
    const packId = args[0]?.trim();
    if (!packId || !_packCache.has(packId)) {
      return reply(sock, msg, ctx, '❌ Pack expirado ou não encontrado. Usa !pinpacks <nome> para criar um novo.');
    }
    const { stickers, info } = _packCache.get(packId);
    await react(sock, msg, '📦');

    // Enviar todos os stickers rapidamente
    for (let i = 0; i < stickers.length; i++) {
      await sock.sendMessage(ctx.remoteJid, { sticker: stickers[i] });
      if (i < stickers.length - 1) await new Promise(r => setTimeout(r, 200));
    }

    const RE = require('./renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    await reply(sock, msg, ctx, RE.renderBlock(t, 'PACK ENVIADO', [
      \`📦 *\${info.name}*\`,
      \`🎨 \${info.count} stickers\`,
      \`👤 \${info.author}\`,
      '',
      '💡 Guarda qualquer sticker para ver o pack completo!',
    ], { botName: localConfig.bot.name }));

    // Limpar cache
    _packCache.delete(packId);
  },

`;

nc = nc.slice(0, newStartIdx) + newPinpacks + nc.slice(newEndIdx);
fs.writeFileSync('src/bot/nativeCommands.js', nc);
console.log('✅ pinpacks: UMA mensagem com preview + takepack');
