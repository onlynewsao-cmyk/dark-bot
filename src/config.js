require('dotenv').config();

/**
 * CONFIGURAÇÃO SEGURA PARA GITHUB
 * Todas as chaves sensíveis são lidas das variáveis de ambiente do Render.
 * NADA de senhas ou URIs ficam expostas no código.
 */
module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'production',
  sessionSecret: process.env.SESSION_SECRET,
  appUrl: process.env.APP_URL,

  owner: {
    name: process.env.OWNER_NAME || 'Dark Net',
    number: process.env.OWNER_NUMBER,
    username: process.env.OWNER_USERNAME,
    password: process.env.OWNER_PASSWORD,
  },

  bot: {
    name: process.env.BOT_NAME || 'DARK BOT',
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
