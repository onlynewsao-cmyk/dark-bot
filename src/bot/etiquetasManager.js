/**
 * DARK BOT v13.6 — Gestor de Etiquetas
 *
 * Funções utilitárias para CRUD de etiquetas e atribuições
 */

'use strict';

const Etiqueta = require('../database/models/Etiqueta');
const Atribuicao = require('../database/models/AtribuicaoEtiqueta');

// ═══════════════════════════════════════════════════════════════
// CORES DISPONÍVEIS
// ═══════════════════════════════════════════════════════════════
const CORES = [
  { nome: 'Vermelho',   hex: '#FF0000', emoji: '🔴' },
  { nome: 'Laranja',    hex: '#FF8C00', emoji: '🟠' },
  { nome: 'Amarelo',    hex: '#FFD700', emoji: '🟡' },
  { nome: 'Verde',      hex: '#00FF00', emoji: '🟢' },
  { nome: 'Azul',       hex: '#0000FF', emoji: '🔵' },
  { nome: 'Roxo',       hex: '#800080', emoji: '🟣' },
  { nome: 'Rosa',       hex: '#FF69B4', emoji: '🩷' },
  { nome: 'Preto',      hex: '#000000', emoji: '⚫' },
  { nome: 'Branco',     hex: '#FFFFFF', emoji: '⚪' },
  { nome: 'Dourado',    hex: '#FFD700', emoji: '✨' },
  { nome: 'Prata',      hex: '#C0C0C0', emoji: '💠' },
  { nome: 'Ciano',      hex: '#00FFFF', emoji: '💎' },
];

// ═══════════════════════════════════════════════════════════════
// EMOJIS PARA ETIQUETAS
// ═══════════════════════════════════════════════════════════════
const EMOJIS_ETIQUETA = [
  '🏷️', '📌', '📍', '⭐', '💫', '🌟', '✨', '💎', '👑', '🛡️',
  '⚔️', '🎯', '🎨', '🎭', '🎪', '🎬', '🎵', '🎮', '🎲', '🎸',
  '📱', '💻', '🌐', '📡', '🔗', '📧', '💬', '📢', '📣', '🔔',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💝',
  '🔥', '⚡', '☄️', '🌈', '☀️', '🌙', '⭐', '🌠', '🌍', '🌎',
  '👤', '👥', '👨', '👩', '🧑', '👶', '👴', '👵', '🧔', '👱',
  '💼', '🎓', '🏆', '🥇', '🏅', '🎖️', '📚', '✏️', '🔧', '⚙️',
];

// ═══════════════════════════════════════════════════════════════
// CRIAR ETIQUETA
// ═══════════════════════════════════════════════════════════════
async function criarEtiqueta({ nome, emoji, cor, descricao, tipo, criadorJid }) {
  const labelId = `lbl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const etiqueta = new Etiqueta({
    labelId,
    nome,
    emoji: emoji || '🏷️',
    cor: cor || '#000000',
    descricao: descricao || '',
    tipo: tipo || 'geral',
    criadorJid,
  });
  
  await etiqueta.save();
  return etiqueta;
}

// ═══════════════════════════════════════════════════════════════
// LISTAR ETIQUETAS
// ═══════════════════════════════════════════════════════════════
async function listarEtiquetas({ criadorJid, tipo, activa } = {}) {
  const filtro = {};
  if (criadorJid) filtro.criadorJid = criadorJid;
  if (tipo) filtro.tipo = tipo;
  if (activa !== undefined) filtro.activa = activa;
  
  return Etiqueta.find(filtro).sort({ criadoEm: -1 }).lean();
}

// ═══════════════════════════════════════════════════════════════
// OBTER ETIQUETA POR ID
// ═══════════════════════════════════════════════════════════════
async function getEtiqueta(labelId) {
  return Etiqueta.findOne({ labelId }).lean();
}

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR ETIQUETA
// ═══════════════════════════════════════════════════════════════
async function atualizarEtiqueta(labelId, updates) {
  updates.atualizadoEm = Date.now();
  return Etiqueta.findOneAndUpdate({ labelId }, { $set: updates }, { new: true }).lean();
}

// ═══════════════════════════════════════════════════════════════
// REMOVER ETIQUETA
// ═══════════════════════════════════════════════════════════════
async function removerEtiqueta(labelId) {
  // Remove etiqueta e todas as atribuições
  const [etiqueta] = await Promise.all([
    Etiqueta.findOneAndDelete({ labelId }),
    Atribuicao.deleteMany({ labelId }),
  ]);
  return etiqueta;
}

// ═══════════════════════════════════════════════════════════════
// ATRIBUIR ETIQUETA A MEMBRO/GRUPO/CONVERSA
// ═══════════════════════════════════════════════════════════════
async function atribuirEtiqueta({ labelId, tipoAlvo, alvoJid, alvoNumero, alvoGrupo, atribuidoPor, nota }) {
  const atribuicaoId = `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const atribuicao = new Atribuicao({
    atribuicaoId,
    labelId,
    tipoAlvo,
    alvoJid,
    alvoNumero: alvoNumero || '',
    alvoGrupo: alvoGrupo || '',
    atribuidoPor,
    nota: nota || '',
  });
  
  await atribuicao.save();
  
  // Atualiza contagem na etiqueta
  const incField = tipoAlvo === 'membro' ? 'totalMembros' : 
                   tipoAlvo === 'grupo' ? 'totalGrupos' : 'totalConversas';
  await Etiqueta.findOneAndUpdate({ labelId }, { $inc: { [incField]: 1 } });
  
  return atribuicao;
}

// ═══════════════════════════════════════════════════════════════
// REMOVER ATRIBUIÇÃO
// ═══════════════════════════════════════════════════════════════
async function removerAtribuicao(atribuicaoId) {
  const atribuicao = await Atribuicao.findOne({ atribuicaoId }).lean();
  if (!atribuicao) return null;
  
  await Atribuicao.deleteOne({ atribuicaoId });
  
  // Decrementa contagem
  const decField = atribuicao.tipoAlvo === 'membro' ? 'totalMembros' : 
                   atribuicao.tipoAlvo === 'grupo' ? 'totalGrupos' : 'totalConversas';
  await Etiqueta.findOneAndUpdate({ labelId: atribuicao.labelId }, { $inc: { [decField]: -1 } });
  
  return atribuicao;
}

// ═══════════════════════════════════════════════════════════════
// LISTAR ATRIBUIÇÕES DE UM ALVO
// ═══════════════════════════════════════════════════════════════
async function listarAtribuicoesAlvo({ alvoJid, tipoAlvo, activa } = {}) {
  const filtro = {};
  if (alvoJid) filtro.alvoJid = alvoJid;
  if (tipoAlvo) filtro.tipoAlvo = tipoAlvo;
  if (activa !== undefined) filtro.activa = activa;
  
  return Atribuicao.find(filtro).lean();
}

// ═══════════════════════════════════════════════════════════════
// LISTAR ATRIBUIÇÕES DE UMA ETIQUETA
// ═══════════════════════════════════════════════════════════════
async function listarAtribuicoesEtiqueta(labelId) {
  return Atribuicao.find({ labelId, activa: true }).lean();
}

// ═══════════════════════════════════════════════════════════════
// BUSCAR ETIQUETAS POR NOME (busca textual)
// ═══════════════════════════════════════════════════════════════
async function buscarEtiquetas(query, { criadorJid } = {}) {
  const filtro = { $text: { $search: query } };
  if (criadorJid) filtro.criadorJid = criadorJid;
  return Etiqueta.find(filtro).limit(20).lean();
}

module.exports = {
  CORES,
  EMOJIS_ETIQUETA,
  criarEtiqueta,
  listarEtiquetas,
  getEtiqueta,
  atualizarEtiqueta,
  removerEtiqueta,
  atribuirEtiqueta,
  removerAtribuicao,
  listarAtribuicoesAlvo,
  listarAtribuicoesEtiqueta,
  buscarEtiquetas,
};
