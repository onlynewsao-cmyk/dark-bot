const mongoose = require('mongoose');

// v7.49 — NUVEM DO BOT: ficheiros guardados no próprio MongoDB (sem Cloudinary).
// O documento BSON tem limite de 16MB — os comandos limitam a 10MB por ficheiro.
const CloudMediaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
    mime: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    data: { type: Buffer, required: true },
    ownerNumber: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.CloudMedia || mongoose.model('CloudMedia', CloudMediaSchema);
