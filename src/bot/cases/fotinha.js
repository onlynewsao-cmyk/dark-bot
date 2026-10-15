'use strict';
/**
 * FOTINHA — imagens da personagem virtual AURA.
 * .fotinha [tipo] — envia uma ilustração da AURA
 * .fotinha perfil — define uma imagem virtual como foto de perfil do bot
 * Tipos: selfie, cosplay, goth, cute, stream
 * Os ficheiros fotorealistas legados não são usados por este comando.
 */
const fs = require('fs');
const path = require('path');

function getSelfieMod() {
  try { return require('../../aura/auraSelfie'); } catch { return null; }
}

const IMAGE_PROMPTS = {
  selfie: '2D digital illustration of fictional virtual assistant character AURA, goth aesthetic, black hair with bangs, dark eyeliner, purple lighting, clearly illustrated, not a photograph, not photorealistic',
  cosplay: 'stylized 2D illustration of fictional virtual character AURA in an anime-inspired black and purple cosplay, confident pose, clearly fictional character art, not photorealistic',
  goth: 'illustrated goth avatar of fictional virtual assistant AURA, black clothes, dark makeup, purple lights, clearly digital character art, not a real person',
  cute: 'cute 2D illustration of fictional goth avatar AURA, soft smile, black hair, purple lights, clearly stylized character art, not photorealistic',
  stream: 'digital illustration of fictional virtual assistant AURA at a purple-lit gaming setup with headphones, clearly fictional, not a real person or livestream',
};

async function getVirtualImage(tipo, selfieMod) {
  try {
    const imagePath = await selfieMod.getSelfie(tipo);
    if (imagePath && fs.existsSync(imagePath)) return fs.readFileSync(imagePath);
  } catch {}

  try {
    const ai = require('../ai');
    const buffer = await ai.generateImage(IMAGE_PROMPTS[tipo] || IMAGE_PROMPTS.selfie);
    if (!buffer || buffer.length <= 500) return null;
    try {
      const dir = selfieMod.SELFIE_DIR;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `aura_virtual_${tipo}_${Date.now()}.jpg`), buffer);
    } catch {}
    return buffer;
  } catch (e) {
    console.warn('[fotinha gen]', e.message?.slice(0, 60));
    return null;
  }
}

module.exports = {
  name: 'fotinha',
  aliases: ['fotoaura', 'fotodela', 'selfie', 'fotinhadela', 'pinkchyu', 'fotinhaura'],
  desc: 'Ilustração da personagem virtual AURA — estética goth.',
  category: 'aura',
  async run({ sock, msg, ctx, args, text, isOwner }) {
    const selfieMod = getSelfieMod();
    if (!selfieMod) {
      await sock.sendMessage(ctx.remoteJid, { text: 'Não consegui carregar o módulo visual da AURA agora.' }, { quoted: msg });
      return;
    }

    const sub = (args[0] || '').toLowerCase().trim();
    const fullText = String(text || '').toLowerCase();
    const pedePinkchyu = /\bpinkchyu(?:wu)?\b/i.test(fullText) || sub === 'pinkchyu';
    const pedeApenasPerfil = ['perfil', 'bot', 'pp', 'profile'].includes(sub) || fullText.includes('perfil');

    // Mantém o alias antigo, mas não associa AURA a uma pessoa real.
    if (pedePinkchyu && !/\baura\b|personagem virtual|avatar da aura/i.test(fullText)) {
      await sock.sendMessage(ctx.remoteJid, {
        text: 'AURA é uma assistente automatizada e não é a pessoa Pinkchyu. Posso enviar uma ilustração da personagem virtual AURA, se quiseres.',
      }, { quoted: msg });
      return;
    }

    if (pedeApenasPerfil && !isOwner) {
      await sock.sendMessage(ctx.remoteJid, { text: 'Só o Dono pode alterar a foto de perfil do bot.' }, { quoted: msg });
      return;
    }

    const tipo = ['cosplay', 'goth', 'cute', 'stream', 'selfie'].find(t => fullText.includes(t) || sub === t) || 'selfie';
    const buffer = await getVirtualImage(tipo, selfieMod);
    if (!buffer) {
      const message = `Não há uma ilustração ${tipo} da personagem AURA disponível agora. Tenta novamente mais tarde.`;
      await sock.sendMessage(ctx.remoteJid, { text: message }, { quoted: msg });
      return;
    }

    if (pedeApenasPerfil) {
      const result = await selfieMod.updateProfilePicture(sock, buffer);
      const message = result?.success
        ? 'Actualizei a foto de perfil do bot com uma ilustração da personagem virtual AURA.'
        : `Não consegui actualizar a foto de perfil: ${result?.message || 'erro desconhecido'}`;
      await sock.sendMessage(ctx.remoteJid, { text: message }, { quoted: msg });
      return;
    }

    await sock.sendMessage(ctx.remoteJid, {
      image: buffer,
      caption: selfieMod.getCaptionForType(tipo, isOwner),
    }, { quoted: msg });
  },
};
