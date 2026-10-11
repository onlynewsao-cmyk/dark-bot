/**
 * Histórico de grupos da Central. Fica separado dos contactos para que a
 * proveniência sobreviva à saída do bot, à reinicialização e a bases grandes.
 */
'use strict';
const mongoose = require('mongoose');

const CentralGrupoSchema = new mongoose.Schema(
  {
    jid: { type: String, required: true, unique: true, index: true },
    nome: { type: String, default: 'grupo' },
    membros: { type: Number, default: 0 },
    nomeFonte: { type: String, default: '' },
    firstSeenAt: { type: Number, default: 0 },
    lastSeenAt: { type: Number, default: 0 },
    lastCapturedAt: { type: Number, default: 0 },
    leftAt: { type: Number, default: 0 },
    status: { type: String, default: 'historico' }, // ativo | saiu | historico
    comunidade: { type: Boolean, default: false },
    parentJid: { type: String, default: '' },
    isAnnouncement: { type: Boolean, default: false },
    slots: { type: Object, default: {} },
  },
  { timestamps: true, collection: 'central_grupos', minimize: false }
);

module.exports = mongoose.models.CentralGrupo || mongoose.model('CentralGrupo', CentralGrupoSchema);
