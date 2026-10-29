/**
 * DARK BOT — AiMemory
 * Armazena memória de conversação por utilizador.
 * A IA recorda conversas anteriores, preferências e contexto.
 * Reset automático a cada 7 dias (configurável).
 */
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 2000 },
  ts:      { type: Date, default: Date.now },
}, { _id: false });

const AiMemorySchema = new mongoose.Schema({
  // Identificador único: para grupos = groupJid, para PV = número do utilizador
  // Formato: "GROUP:120363XXX@g.us" ou "PV:244XXXXXXXXX"
  contextId: { type: String, required: true, index: true },

  // Número do utilizador (para PV e para memória individual em grupo)
  userNumber: { type: String, default: '', index: true },

  // Histórico de mensagens (últimas 40 por defeito)
  history: { type: [MessageSchema], default: [] },

  // Perfil aprendido sobre o utilizador
  profile: {
    name:      { type: String, default: '' },
    interests: [{ type: String }],    // ex: ['música', 'tecnologia', 'Angola']
    gender:    { type: String, default: '' },
    tone:      { type: String, default: '' },  // tom preferido detectado
    notes:     { type: String, default: '' },  // notas importantes memoradas
  },

  // Metadados
  lastInteraction: { type: Date, default: Date.now },
  resetAt:         { type: Date, default: null },
  totalMessages:   { type: Number, default: 0 },

}, { timestamps: true });

// Índice TTL — limpa automaticamente entradas com mais de 7 dias sem interacção
AiMemorySchema.index({ lastInteraction: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Métodos de instância
AiMemorySchema.methods.addMessage = function (role, content) {
  const MAX = 40;
  this.history.push({ role, content: String(content || '').slice(0, 2000), ts: new Date() });
  if (this.history.length > MAX) this.history = this.history.slice(-MAX);
  this.lastInteraction = new Date();
  this.totalMessages = (this.totalMessages || 0) + 1;
};

AiMemorySchema.methods.getContextWindow = function (maxMessages = 12) {
  return this.history.slice(-maxMessages);
};

AiMemorySchema.methods.resetHistory = function () {
  this.history = [];
  this.resetAt = new Date();
};

// Use atomic appends: document.save() of a copied array can overwrite another
// message when concurrent handlers read the same conversation.
const creating = new Map();
function contextIdFor(userNumber, groupJid = null) {
  return groupJid ? `GROUP:${groupJid}` : `PV:${userNumber}`;
}
AiMemorySchema.statics.contextIdFor = contextIdFor;
AiMemorySchema.statics.getOrCreate = async function (userNumber, groupJid = null) {
  const contextId = contextIdFor(userNumber, groupJid);
  if (!creating.has(contextId)) {
    const promise = this.findOneAndUpdate({ contextId }, {
      $setOnInsert: { contextId, userNumber, history: [], totalMessages: 0, lastInteraction: new Date() },
    }, { upsert: true, new: true, setDefaultsOnInsert: false });
    creating.set(contextId, Promise.resolve(promise).finally(() => creating.delete(contextId)));
  }
  return creating.get(contextId);
};
AiMemorySchema.statics.appendMessage = async function (userNumber, groupJid, role, content) {
  if (!['user', 'assistant'].includes(role)) throw new Error('Papel de histórico inválido');
  const text = String(content || '').slice(0, 2000);
  if (!text.trim()) return null;
  // Ensure a context exists using the process-local creation deduplication.
  await this.getOrCreate(userNumber, groupJid);
  return this.findOneAndUpdate({ contextId: contextIdFor(userNumber, groupJid) }, {
    $push: { history: { $each: [{ role, content: text, ts: new Date() }], $slice: -40 } },
    $set: { lastInteraction: new Date() },
    $inc: { totalMessages: 1 },
  }, { new: true, runValidators: true });
};

module.exports = mongoose.model('AiMemory', AiMemorySchema);
