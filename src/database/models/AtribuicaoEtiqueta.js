/**
 * DARK BOT v13.6 — Atribuições de Etiquetas
 *
 * Liga etiquetas a membros, grupos ou conversas
 */

'use strict';

const mongoose = require('mongoose');

const atribuicaoSchema = new mongoose.Schema({
  // Identificação única da atribuição
  atribuicaoId:  { type: String, required: true, unique: true },
  
  // Etiqueta atribuída
  labelId:       { type: String, required: true, ref: 'Etiqueta' },
  
  // Alvo da atribuição
  tipoAlvo:      { type: String, enum: ['membro', 'grupo', 'conversa'], required: true },
  alvoJid:       { type: String, required: true },
  alvoNumero:    { type: String }, // número do membro (sem @s.whatsapp.net)
  alvoGrupo:     { type: String }, // jid do grupo (se aplicável)
  
  // Metadados
  atribuidoPor:  { type: String, required: true },
  atribuidoEm:   { type: Date, default: Date.now },
  nota:          { type: String, default: '' }, // nota adicional
  
  // Status
  activa:        { type: Boolean, default: true },
}, {
  timestamps: true
});

// Índices
atribuicaoSchema.index({ labelId: 1, activa: 1 });
atribuicaoSchema.index({ alvoJid: 1, tipoAlvo: 1 });
atribuicaoSchema.index({ tipoAlvo: 1, alvoJid: 1 });

module.exports = mongoose.model('AtribuicaoEtiqueta', atribuicaoSchema);
