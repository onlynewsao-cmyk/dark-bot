require('dotenv').config();

/**
 * CONFIGURAÇÃO 100% SEGURA - ZERO EXPOSIÇÃO
 * Lendo exclusivamente do Environment do Render.
 */
module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'production',
  sessionSecret: process.env.SESSION_SECRET,
  appUrl: process.env.APP_URL,

  owner: {
    name: process.env.OWNER_NAME,
    number: process.env.OWNER_NUMBER,
    username: process.env.OWNER_USERNAME,
    password: process.env.OWNER_PASSWORD,
  },

  bot: {
    name: process.env.BOT_NAME,
    number: process.env.BOT_NUMBER,
    prefix: process.env.BOT_PREFIX || '!',
  },

  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },

  ai: {
    geminiKey: process.env.GEMINI_API_KEY,
    groqKey: process.env.GROQ_API_KEY,
  }
};
