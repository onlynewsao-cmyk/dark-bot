const fs = require('fs');
let src = fs.readFileSync('src/bot/cases/interacoes2.js', 'utf8');

// Substituir o handler de acções físicas para incluir MENCÕES + GIF melhorado
const oldActionHandler = `  // ═══ ACÇÕES FÍSICAS (com GIF) ═══
  for (const [cmd, data] of Object.entries(ACTIONS)) {
    registerCase([cmd], async ({ sock, msg, ctx, args }) => {
      const target = args[0] ? args.join(' ') : 'o ar 😂';
      const verb = P(data.verbs);
      const gifUrl = await getGif(data.gif);
      
      if (gifUrl) {
        await sock.sendMessage(ctx.remoteJid, {
          video: { url: gifUrl }, gifPlayback: true,
          caption: \`\${data.emoji} *\${ctx.pushName}* \${verb} *\${target}*\`,
        }, { quoted: msg });
      } else {
        const RE = require('../renderEngine');
        const t = await RE.getTheme(ctx.remoteJid);
        await sock.sendMessage(ctx.remoteJid, {
          text: RE.renderBlock(t, data.emoji + ' INTERAÇÃO', [
            \`\${data.emoji} *\${ctx.pushName}* \${verb} *\${target}*\`,
          ], { botName: config.bot.name }),
        }, { quoted: msg });
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: data.emoji, key: msg.key } });
    }, true);
  }`;

const newActionHandler = `  // ═══ ACÇÕES FÍSICAS (com GIF + MENCÕES + REPLY) ═══
  for (const [cmd, data] of Object.entries(ACTIONS)) {
    registerCase([cmd], async ({ sock, msg, ctx, args }) => {
      // Detectar menção no target
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = args[0] ? args.join(' ') : 'o ar 😂';
      const verb = P(data.verbs);
      const gifUrl = await getGif(data.gif || cmd);
      
      // Construir menções
      const mentions = [...mentionedJids];
      // Se target parece ser um número, adicionar como menção
      const targetNum = target.replace(/\\D/g, '');
      if (targetNum.length >= 8 && !mentions.some(m => m.includes(targetNum))) {
        mentions.push(targetNum + '@s.whatsapp.net');
      }
      
      const caption = data.emoji + ' *' + ctx.pushName + '* ' + verb + ' *' + target + '*';
      
      if (gifUrl) {
        await sock.sendMessage(ctx.remoteJid, {
          video: { url: gifUrl }, gifPlayback: true,
          caption: caption,
          mentions: mentions,
        }, { quoted: msg });
      } else {
        const RE = require('../renderEngine');
        const t = await RE.getTheme(ctx.remoteJid);
        await sock.sendMessage(ctx.remoteJid, {
          text: RE.renderBlock(t, data.emoji + ' INTERAÇÃO', [caption], { botName: config.bot.name }),
          mentions: mentions,
        }, { quoted: msg });
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: data.emoji, key: msg.key } });
    }, true);
  }`;

if (src.includes(oldActionHandler)) {
  src = src.replace(oldActionHandler, newActionHandler);
  console.log('OK acções com GIF + menções + reply');
} else {
  console.log('ERR action handler not found');
}

// Substituir NSFW handler também
const oldNsfw = `  // ═══ ACÇÕES NSFW ═══
  for (const [cmd, data] of Object.entries(NSFW_ACTIONS)) {
    registerCase([cmd], async ({ sock, msg, ctx, args }) => {
      const target = args[0] ? args.join(' ') : 'alguém 😏';`;

const newNsfw = `  // ═══ ACÇÕES NSFW (com GIF + menções + reply) ═══
  for (const [cmd, data] of Object.entries(NSFW_ACTIONS)) {
    registerCase([cmd], async ({ sock, msg, ctx, args }) => {
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = args[0] ? args.join(' ') : 'alguém 😏';
      const verb = P(data.verbs);
      const gifUrl = await getGif(data.gif || cmd);
      const mentions = [...mentionedJids];
      const targetNum = target.replace(/\\D/g, '');
      if (targetNum.length >= 8 && !mentions.some(m => m.includes(targetNum))) {
        mentions.push(targetNum + '@s.whatsapp.net');
      }
      const caption = data.emoji + ' *' + ctx.pushName + '* ' + verb + ' *' + target + '*';
      if (gifUrl) {
        await sock.sendMessage(ctx.remoteJid, {
          video: { url: gifUrl }, gifPlayback: true,
          caption: caption, mentions: mentions,
        }, { quoted: msg });
      } else {
        const RE = require('../renderEngine');
        const t = await RE.getTheme(ctx.remoteJid);
        await sock.sendMessage(ctx.remoteJid, {
          text: RE.renderBlock(t, data.emoji + ' NSFW', [caption], { botName: config.bot.name }),
          mentions: mentions,
        }, { quoted: msg });
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: data.emoji, key: msg.key } });
    }, true);
  }
  // Fim NSFW — skip old handler
  if (false) {`;

if (src.includes(oldNsfw)) {
  src = src.replace(oldNsfw, newNsfw);
  console.log('OK NSFW com GIF + menções');
}

// Adicionar GIFs a relacionamentos
const oldNamorar = "registerCase(['namorar'], async ({ sock, msg, ctx, args }) => {";
const newNamorar = `registerCase(['namorar'], async ({ sock, msg, ctx, args }) => {
    const gifUrl = await getGif('love anime couple');`;
if (src.includes(oldNamorar) && !src.includes("getGif('love anime couple')")) {
  src = src.replace(oldNamorar, newNamorar);
  console.log('OK namorar com GIF');
}

fs.writeFileSync('src/bot/cases/interacoes2.js', src);
console.log('OK all interações updated');
