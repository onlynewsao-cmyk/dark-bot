const fs = require('fs');

// === 1. Fix brat2: adaptativo (palavra=letra por letra, frase=palavra por palavra) ===
let s2 = fs.readFileSync('src/bot/cases/stickers2.js', 'utf8');
const oldBrat2Start = s2.indexOf("// ═══ BRAT2 (typewriter");
const oldBrat2End = s2.indexOf("}, true);", oldBrat2Start) + "}, true);".length;

const newBrat2 = `// ═══ BRAT2 (adaptativo: palavra=letra/letra, frase=palavra/palavra) ═══
  registerCase(['brat2'], async ({ sock, msg, ctx, args }) => {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    const input = args.join(' ').trim() || 'brat';
    try {
      const sharp = require('sharp');
      const words = input.split(/\\s+/);
      const isSingleWord = words.length === 1;
      const fontSize = input.length > 12 ? 40 : input.length > 8 ? 52 : input.length > 5 ? 64 : 80;
      const text = input.toUpperCase().slice(0, 20);

      // Gerar frames: palavra única = letra por letra, frase = palavra por palavra
      const frames = [];
      if (isSingleWord) {
        // Letra por letra
        for (let i = 1; i <= text.length; i++) {
          const partial = text.slice(0, i);
          const cursor = i < text.length ? '|' : '';
          frames.push({ text: partial + cursor, delay: 120 });
        }
      } else {
        // Palavra por palavra
        for (let i = 1; i <= words.length; i++) {
          const partial = words.slice(0, i).join(' ').toUpperCase();
          const cursor = i < words.length ? '|' : '';
          frames.push({ text: partial + cursor, delay: 200 });
        }
      }
      // Pausa final
      frames.push({ text: text, delay: 600 });
      frames.push({ text: text, delay: 600 });

      // Renderizar SVGs
      const pngFrames = [];
      const delays = [];
      for (const frame of frames) {
        const svgStr = '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">' +
          '<rect width="512" height="512" fill="#84CC16"/>' +
          '<text x="256" y="256" text-anchor="middle" dominant-baseline="middle" ' +
          'font-family="Arial Black, Arial" font-size="' + fontSize + '" ' +
          'font-weight="900" fill="black" opacity="0.85">' +
          frame.text.slice(0, 20) + '</text></svg>';
        const png = await sharp(Buffer.from(svgStr)).png().toBuffer();
        pngFrames.push(png);
        delays.push(frame.delay);
      }

      let finalBuf;
      try {
        finalBuf = await sharp(pngFrames[0], { animated: true })
          .webp({ quality: 70, loop: 0, delay: delays })
          .toBuffer();
      } catch { finalBuf = pngFrames[pngFrames.length - 1]; }

      const stk = await stickerMaker.create(finalBuf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: true,
        packName: ' brat2', authorName: ctx.pushName,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return sock.sendMessage(ctx.remoteJid, { text: '❌ ' + e.message }, { quoted: msg });
    }
  }, true);`;

if (oldBrat2Start !== -1 && oldBrat2End !== -1) {
  s2 = s2.slice(0, oldBrat2Start) + newBrat2 + s2.slice(oldBrat2End);
  fs.writeFileSync('src/bot/cases/stickers2.js', s2);
  console.log('OK brat2 adaptativo');
} else console.log('ERR brat2 not found');

// === 2. Adicionar erome ao menu18 ===
let nc = fs.readFileSync('src/bot/nativeCommands.js', 'utf8');

// Adicionar erome commands ao menu18
if (!nc.includes('erome')) {
  nc = nc.replace(
    "p + 'yande [tags] — yande.re alta qualidade',",
    "p + 'yande [tags] — yande.re alta qualidade',\\n      p + 'erome <nome> — busca erome.com',\\n      p + 'erome <nome> <qtd> — com quantidade',\\n      p + 'eromevid <nome> — vídeos erome',"
  );
  fs.writeFileSync('src/bot/nativeCommands.js', nc);
  console.log('OK erome no menu18');
}

// === 3. Criar handlers erome ===
const eromeHandler = `
  // ═══ EROME.COM — busca e download ═══
  async erome({ sock, msg, ctx, args, config: cfg }) {
    const query = args.filter(a => !/^\\d+$/.test(a)).join(' ').trim();
    const limit = parseInt(args.find(a => /^\\d+$/.test(a))) || 5;
    if (!query) return reply(sock, msg, ctx, '🔍 Uso: !erome <nome> [quantidade]\\nEx: !erome model 10');
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🔍', key: msg.key } });
    try {
      const erome = require('../erome');
      const result = await erome.searchAndDownload(query, Math.min(limit, 20));
      if (!result.media.length) throw new Error('Sem mídias encontradas');
      for (const m of result.media) {
        if (m.type === 'photo') {
          await sock.sendMessage(ctx.remoteJid, { image: m.buf, caption: '📸 ' + result.name }, { quoted: msg });
        } else {
          await sock.sendMessage(ctx.remoteJid, { video: m.buf, caption: '🎬 ' + result.name, mimetype: 'video/mp4' }, { quoted: msg });
        }
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply(sock, msg, ctx, '❌ Erome: ' + e.message);
    }
  },

  async eromevid({ sock, msg, ctx, args, config: cfg }) {
    const query = args.join(' ').trim();
    const limit = parseInt(args.find(a => /^\\d+$/.test(a))) || 3;
    if (!query) return reply(sock, msg, ctx, '🎬 Uso: !eromevid <nome> [qtd]');
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🎬', key: msg.key } });
    try {
      const erome = require('../erome');
      const results = await erome.search(query);
      if (!results.length) throw new Error('Sem resultados');
      const album = await erome.getAlbum(results[0].url, limit);
      if (!album.videos.length) throw new Error('Sem vídeos encontrados');
      for (const url of album.videos.slice(0, limit)) {
        const buf = await require('../mediaHandler').fetchBuffer(url);
        await sock.sendMessage(ctx.remoteJid, { video: buf, caption: '🎬 ' + album.name, mimetype: 'video/mp4' }, { quoted: msg });
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply(sock, msg, ctx, '❌ Erome: ' + e.message);
    }
  },
`;

// Inserir antes de mediaup
const insertPoint = nc.indexOf('  async mediaup(');
if (insertPoint !== -1 && !nc.includes('async erome(')) {
  nc = nc.slice(0, insertPoint) + eromeHandler + nc.slice(insertPoint);
  fs.writeFileSync('src/bot/nativeCommands.js', nc);
  console.log('OK erome handlers');
}
