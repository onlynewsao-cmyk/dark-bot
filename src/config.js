require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'production',
  sessionSecret: process.env.SESSION_SECRET || 'DarkBot_S3cr3t_K3y_DarkNet_2026_xyz789',
  appUrl: process.env.APP_URL || 'https://dark-bot-accg.onrender.com',

  owner: {
    name: process.env.OWNER_NAME || 'Dark Net',
    number: process.env.OWNER_NUMBER || '244945280380',
    username: process.env.OWNER_USERNAME || 'darknet',
    password: process.env.OWNER_PASSWORD || 'DarkNet@2026',
  },

  bot: {
    name: process.env.BOT_NAME || 'DARK BOT',
    number: process.env.BOT_NUMBER || '244949926074',
    prefix: process.env.BOT_PREFIX || '!',
  },

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb+srv://darkbot:Ik9499mVyRvpgRWt@cluster0.yzpwymq.mongodb.net/darkbot?retryWrites=true&w=majority&appName=Cluster0",
  },

  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvnmvvego',
    api_key: process.env.CLOUDINARY_API_KEY || '121927124459388',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'DrxzDxQph4XE_ZjlZPRYIfl3ha8',
  },

  ai: {
    geminiKey: process.env.GEMINI_API_KEY || 'AIzaSyAAiplpRn067lUucOmG9AVZ1AP1g9kOqXE',
    groqKey: process.env.GROQ_API_KEY || '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',
  }
};
