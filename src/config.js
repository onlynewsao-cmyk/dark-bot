require('dotenv').config();

function cleanEnv(value, fallback = '') {
  if (typeof value === 'undefined' || value === null) return fallback;
  let cleaned = String(value)
    .trim()
    .replace(/^['"]|['"]$/g, '');
  // Render/GitHub às vezes recebem URIs copiadas de HTML com &amp; ou &amp;amp;.
  while (cleaned.includes('&amp;')) cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&#38;|&#x26;/gi, '&');
  return cleaned;
}

function cleanNumber(value, fallback = '') {
  return cleanEnv(value, fallback).replace(/\D/g, '');
}

const port = Number(cleanEnv(process.env.PORT, '3000')) || 3000;
const nodeEnv = cleanEnv(process.env.NODE_ENV, 'development');

module.exports = {
  port,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  sessionSecret: cleanEnv(process.env.SESSION_SECRET, 'change-this-session-secret'),
  appUrl: cleanEnv(process.env.APP_URL, `http://localhost:${port}`),

  owner: {
    name: cleanEnv(process.env.OWNER_NAME, 'Dark Net'),
    number: cleanNumber(process.env.OWNER_NUMBER, ''),
    username: cleanEnv(process.env.OWNER_USERNAME, 'darknet').toLowerCase(),
    // Nunca coloque a senha real no código. Defina OWNER_PASSWORD no Render.
    password: cleanEnv(process.env.OWNER_PASSWORD, ''),
  },

  bot: {
    name: cleanEnv(process.env.BOT_NAME, 'DARK BOT'),
    number: cleanNumber(process.env.BOT_NUMBER, ''),
    prefix: cleanEnv(process.env.BOT_PREFIX, '!'),
  },

  mongodb: {
    uri: cleanEnv(process.env.MONGODB_URI, ''),
  },

  cloudinary: {
    cloud_name: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME, ''),
    api_key: cleanEnv(process.env.CLOUDINARY_API_KEY, ''),
    api_secret: cleanEnv(process.env.CLOUDINARY_API_SECRET, ''),
  },

  ai: {
    groqApiKey: cleanEnv(process.env.GROQ_API_KEY, ''),
    geminiApiKey: cleanEnv(process.env.GEMINI_API_KEY, ''),
    openaiApiKey: cleanEnv(process.env.OPENAI_API_KEY, ''),
    openrouterApiKey: cleanEnv(process.env.OPENROUTER_API_KEY, ''),
    model: cleanEnv(process.env.AI_MODEL, ''),
    // aliases para compatibilidade com módulos v3
    groqKey: cleanEnv(process.env.GROQ_API_KEY, ''),
    geminiKey: cleanEnv(process.env.GEMINI_API_KEY, ''),
    openaiKey: cleanEnv(process.env.OPENAI_API_KEY, ''),
    openrouterKey: cleanEnv(process.env.OPENROUTER_API_KEY, ''),
  },

  tenorApiKey: cleanEnv(process.env.TENOR_API_KEY, ''),
};
    
