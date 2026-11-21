/**
 * DARK BOT v13.6 — Sistema de Etiquetas (Labels) para WhatsApp
 *
 * Modelo de dados para etiquetas personalizáveis
 * Permite etiquetar membros, grupos e conversas
 */

'use strict';

const mongoose = require('mongoose');

const etiquetaSchema = new mongoose.Schema({
  // Identificação
  labelId:       { type: String, required: true, unique: true },
  nome:          { type: String, required: true },
  emoji:         { type: String, default: '🏷️' },
  cor:           { type: String, default: '#000000' }, // código hex
  descricao:     { type: String, default: '' },
  
  // Tipo de etiqueta
  tipo:          { type: String, enum: ['membro', 'grupo', 'conversa', 'geral'], default: 'geral' },
  
  // Metadados
  criadorJid:    { type: String, required: true },
  criadoEm:      { type: Date, default: Date.now },
  atualizadoEm:  { type: Date, default: Date.now },
  activa:        { type: Boolean, default: true },
  
  // Estatísticas
  totalMembros:  { type: Number, default: 0 },
  totalGrupos:   { type: Number, default: 0 },
  totalConversas:{ type: Number, default: 0 },
}, {
  timestamps: true
});

// Índice para buscas rápidas
etiquetaSchema.index({ tipo: 1, activa: 1 });
etiquetaSchema.index({ criadorJid: 1 });
etiquetaSchema.index({ nome: 'text' });

module.exports = mongoose.model('Etiqueta', etiquetaSchema);
