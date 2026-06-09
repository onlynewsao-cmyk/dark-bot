const mongoose = require('mongoose');

// Para persistir credenciais Baileys no MongoDB (nÃ£o perder ao reiniciar Render).
// ATENÃ‡ÃƒO: usa coleÃ§Ã£o prÃ³pria para nÃ£o conflitar com sessÃµes web do connect-mongo.
const SessionSchema = new mongoose.Schema({
  fileName: { type: String, required: true, unique: true },
  content: { type: String, required: true }, // JSON serializado
}, { timestamps: true, collection: 'whatsapp_sessions' });

module.exports = mongoose.model('WhatsAppSession', SessionSchema);
