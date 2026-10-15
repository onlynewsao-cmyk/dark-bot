'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   AURA VISUAL v1.1 — IMAGENS DA PERSONAGEM 💜📸              ║
 * ║   Recursos visuais da persona virtual AURA.                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Como funciona:
 *  - Biblioteca de ilustrações da personagem virtual AURA, em estilo goth
 *  - Só usa ficheiros com o prefixo `aura_virtual_`; recursos fotorealistas
 *    antigos são ignorados para não serem apresentados como imagens da AURA
 *  - Pode actualizar a foto de perfil do bot se o Dono pedir explicitamente
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Tipos de imagem da personagem virtual AURA ─────────────
const PHOTO_TYPES = {
  selfie: {
    desc: 'avatar goth da AURA, delineado escuro e luz roxa',
    prompts: [
      'stylized digital portrait of a fictional virtual assistant character named AURA, goth aesthetic, black hair with bangs, dark eyeliner, black lipstick, purple LED background, friendly expression, clearly illustrated, not photorealistic',
      'illustrated goth avatar of AURA, black clothes, choker, purple room lighting, confident playful expression, digital character art, not a real person',
    ],
  },
  cosplay: {
    desc: 'avatar da AURA em look de cosplay goth',
    prompts: [
      'digital illustration of fictional virtual character AURA in a black and purple anime-inspired cosplay, goth makeup, confident pose, purple lights, clearly stylized character art',
      'stylized illustration of AURA in a futuristic cyberpunk cosplay, colorful hair, goth jacket, playful expression, not photorealistic',
      'digital character art of AURA in a dark anime-inspired outfit, red accents, goth aesthetic, clearly fictional avatar',
    ],
  },
  goth: {
    desc: 'visual goth da personagem AURA',
    prompts: [
      'full-body digital illustration of fictional goth avatar AURA, black dress, boots, dark castle background, purple accents, clearly stylized, not a real person',
      'soft-goth digital character art of AURA, black and purple outfit, fairy lights, friendly expression, clearly illustrated',
    ],
  },
  cute: {
    desc: 'versão soft-goth da personagem AURA',
    prompts: [
      'cute digital illustration of fictional goth avatar AURA, soft smile, dark makeup, holding a heart, purple lights, clearly stylized character art',
      'illustrated goth character AURA, black hair, gentle expression, heart gesture, soft purple lighting, not photorealistic',
    ],
  },
  stream: {
    desc: 'avatar gamer da AURA num cenário ilustrativo',
    prompts: [
      'digital illustration of fictional goth virtual assistant AURA at a gaming setup with purple LEDs and headphones, not a real livestream or person',
      'stylized character art of AURA in a purple-lit gaming room, goth aesthetic, fictional interface, clearly illustrated',
    ],
  },
};

// ── Cache de fotos geradas ──────────────────────────────────
const SELFIE_DIR = path.join(__dirname, '../../assets/aura_selfies');
let _photoCache = new Map(); // type -> [paths]

function ensureDir() {
  try {
    if (!fs.existsSync(SELFIE_DIR)) fs.mkdirSync(SELFIE_DIR, { recursive: true });
  } catch {}
}

function getRandomPrompt(type = 'selfie') {
  const t = PHOTO_TYPES[type] || PHOTO_TYPES.selfie;
  return t.prompts[Math.floor(Math.random() * t.prompts.length)];
}

// ── Gera uma ilustração nova da personagem, se o gerador estiver disponível ──
async function generateSelfie(type = 'selfie') {
  ensureDir();
  const prompt = getRandomPrompt(type);
  const fileName = `aura_virtual_${type}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.jpg`;
  const filePath = path.join(SELFIE_DIR, fileName);

  // Tenta gerar via módulo de imagem do bot (se tiver)
  try {
    // Procura gerador de imagem disponível
    const imgGen = require('../bot/imageGen');
    if (imgGen && imgGen.generate) {
      const buf = await imgGen.generate(prompt);
      if (buf && buf.length > 1000) {
        fs.writeFileSync(filePath, buf);
        return filePath;
      }
    }
  } catch {}

  // Fallback: retorna null mas indica que tentou — o handler vai usar texto + descrição
  // Em produção, aqui usaria generate_image tool, mas em runtime não temos
  return null;
}

// ── Obtém ilustração virtual existente ou tenta gerar uma ───
async function getSelfie(type = 'selfie') {
  ensureDir();
  // Procura fotos existentes desse tipo
  try {
    const files = fs.readdirSync(SELFIE_DIR).filter(f => f.startsWith(`aura_virtual_${type}_`) && f.endsWith('.jpg'));
    if (files.length > 0) {
      const pick = files[Math.floor(Math.random() * files.length)];
      return path.join(SELFIE_DIR, pick);
    }
  } catch {}

  // Se não tem, tenta gerar
  const generated = await generateSelfie(type);
  if (generated) return generated;

  // Se não conseguiu gerar, retorna null — quem chama decide o que fazer
  return null;
}

// ── Lista fotos disponíveis ─────────────────────────────────
function listSelfies() {
  ensureDir();
  try {
    const files = fs.readdirSync(SELFIE_DIR).filter(f => f.startsWith('aura_virtual_') && f.endsWith('.jpg'));
    const stats = {};
    for (const type of Object.keys(PHOTO_TYPES)) {
      stats[type] = files.filter(f => f.startsWith(`aura_virtual_${type}_`)).length;
    }
    stats.total = files.length;
    return stats;
  } catch {
    return { total: 0 };
  }
}

// ── Atualiza foto de perfil do bot ──────────────────────────
async function updateProfilePicture(sock, imagePathOrBuffer) {
  try {
    let buffer;
    if (Buffer.isBuffer(imagePathOrBuffer)) {
      buffer = imagePathOrBuffer;
    } else if (typeof imagePathOrBuffer === 'string') {
      if (fs.existsSync(imagePathOrBuffer)) {
        buffer = fs.readFileSync(imagePathOrBuffer);
      } else {
        return { success: false, message: 'Arquivo não encontrado' };
      }
    } else {
      return { success: false, message: 'Imagem inválida' };
    }

    if (!buffer || buffer.length < 100) {
      return { success: false, message: 'Buffer vazio' };
    }

    await sock.updateProfilePicture(sock.user.id, buffer);
    return { success: true, message: 'Foto de perfil atualizada! 🖤' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ── Handler inteligente de pedido de foto ───────────────────
/**
 * @param {string} text - texto do usuário
 * @param {object} ctx - contexto
 * @param {object} intent - resultado do analyzeIntent
 * @returns {object} { shouldSend, type, reason, confidence }
 */
function handlePhotoIntent(text, ctx = {}, intent = {}) {
  const t = String(text || '').toLowerCase();

  // Só manda foto se tiver certeza que é DELA
  if (intent.intent !== 'PHOTO_REQUEST' && intent.intent !== 'PROFILE_PIC_UPDATE') {
    return { shouldSend: false, reason: 'não é pedido de foto dela', confidence: 0 };
  }

  if (intent.overallConfidence < 50 && !ctx.isOwner) {
    return { shouldSend: false, reason: 'confiança baixa que é pra ela', confidence: intent.overallConfidence };
  }

  // Determina tipo
  let type = intent.intentDetails?.photoType || 'selfie';
  if (t.includes('cosplay')) type = 'cosplay';
  else if (t.includes('goth') || t.includes('dark') || t.includes('preta')) type = 'goth';
  else if (t.includes('fofa') || t.includes('cute') || t.includes('linda')) type = 'cute';
  else if (t.includes('live') || t.includes('stream') || t.includes('jogando')) type = 'stream';
  else if (t.includes('selfie') || t.includes('rosto') || t.includes('cara')) type = 'selfie';

  return {
    shouldSend: true,
    type,
    reason: `pedido de imagem da personagem AURA (${type}), confiança ${intent.overallConfidence || intent.intentConfidence}%`,
    confidence: intent.overallConfidence || intent.intentConfidence || 70,
  };
}

// Legendas identificam o recurso como imagem da personagem virtual, nunca como selfie real.
function getCaptionForType(type, isOwner = false) {
  const captions = {
    selfie: [
      'Imagem da personagem virtual AURA, em estilo goth.',
      'AURA em visual soft-goth — imagem de personagem.',
    ],
    cosplay: [
      'AURA em look de cosplay ilustrativo.',
      'Visual de cosplay da personagem AURA.',
    ],
    goth: [
      'AURA em estética goth.',
      'Imagem da personagem AURA com visual dark.',
    ],
    cute: [
      'AURA em versão soft-goth.',
      'Imagem estilizada da personagem virtual AURA.',
    ],
    stream: [
      'AURA em cenário ilustrativo de gaming.',
      'Visual gamer da personagem AURA — não representa uma live real.',
    ],
  };

  const pool = captions[type] || captions.selfie;
  const caption = pool[Math.floor(Math.random() * pool.length)];
  return isOwner ? `${caption} — para ti, Dark.` : caption;
}

module.exports = {
  PHOTO_TYPES,
  generateSelfie,
  getSelfie,
  listSelfies,
  updateProfilePicture,
  handlePhotoIntent,
  getCaptionForType,
  SELFIE_DIR,
};
