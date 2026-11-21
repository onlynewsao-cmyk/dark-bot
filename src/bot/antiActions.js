/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DARK BOT — ANTI-ACTIONS v13.0 🛡️                           ║
 * ║  Mapeia cada flag anti → acção configurável                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Acções possíveis:
 *   apagar  — só apaga a mensagem
 *   avisar  — apaga + envia aviso ao utilizador
 *   kick    — apaga + remove do grupo (ignora warns)
 *   ban     — apaga + kick + adiciona à blacklist
 *   mute    — apaga + silencia o utilizador (tudo apagado)
 */

'use strict';

// Acções válidas
const VALID_ACTIONS = new Set(['apagar', 'avisar', 'kick', 'ban', 'mute']);

// Lista de todos os antis suportados
const ALL_ANTIS = [
  'antistatus', 'antimencao', 'antipagamento', 'antiinvisivel',
  'antiflood', 'antidoc', 'antiloc', 'antifigurinha', 'antifig',
  'antibtn', 'antipalavra', 'antitoxic', 'antiporn',
  'antifoto', 'antivideo', 'antiaudio', 'antitexto', 'anticontacto',
];

// Descrições legíveis
const ANTI_LABELS = {
  antistatus:    'Anti-Status',
  antimencao:    'Anti-Menção',
  antipagamento: 'Anti-Pagamento',
  antiinvisivel: 'Anti-Invisível',
  antiflood:     'Anti-Flood',
  antidoc:       'Anti-Doc',
  antiloc:       'Anti-Loc',
  antifigurinha: 'Anti-Figurinha',
  antifig:       'Anti-Fig',
  antibtn:       'Anti-Botões',
  antipalavra:   'Anti-Palavra',
  antitoxic:     'Anti-Tóxico',
  antiporn:      'Anti-Porn',
  antifoto:      'Anti-Foto',
  antivideo:     'Anti-Vídeo',
  antiaudio:     'Anti-Áudio',
  antitexto:     'Anti-Texto',
  anticontacto:  'Anti-Contacto',
};

// Acção por omissão para cada anti
const DEFAULT_ACTION = 'avisar'; // por defeito: apaga + avisa

// Excepções: antis que NUNCA devem kickar/banar (só avisar ou apagar)
const SOFT_ANTIS = new Set(['slowmode', 'antitexto']);

/**
 * Obtém a acção configurada para um anti específico
 * @param {Object} gs - GroupSettings document
 * @param {string} flag - nome da flag (ex: 'antipalavra')
 * @returns {string} acção ('apagar'|'avisar'|'kick'|'ban'|'mute')
 */
function getAction(gs, flag) {
  const accoes = gs?.antitiposAccoes || {};
  const action = accoes[flag];
  if (!action || !VALID_ACTIONS.has(action)) return DEFAULT_ACTION;
  // soft-antis nunca kickam/banam
  if (SOFT_ANTIS.has(flag) && (action === 'kick' || action === 'ban')) return 'avisar';
  return action;
}

/**
 * Guarda a acção para um anti
 * @param {Object} gs - GroupSettings document
 * @param {string} flag - nome da flag
 * @param {string} action - acção a guardar
 * @returns {Object} { ok, action, label }
 */
function setAction(gs, flag, action) {
  if (!VALID_ACTIONS.has(action)) {
    return { ok: false, error: `Acção inválida. Válidas: ${[...VALID_ACTIONS].join(', ')}` };
  }
  if (!ALL_ANTIS.includes(flag)) {
    return { ok: false, error: `Anti desconhecido: ${flag}` };
  }
  gs.antitiposAccoes = gs.antitiposAccoes || {};
  gs.antitiposAccoes[flag] = action;
  return { ok: true, action, label: ANTI_LABELS[flag] || flag };
}

/**
 * Lista todas as acções configuradas
 */
function listActions(gs) {
  const accoes = gs?.antitiposAccoes || {};
  return ALL_ANTIS.map(flag => {
    const custom = accoes[flag];
    const effective = getAction(gs, flag);
    return {
      flag,
      label: ANTI_LABELS[flag] || flag,
      active: !!gs[flag],
      custom: custom || null,
      effective,
    };
  });
}

module.exports = {
  VALID_ACTIONS,
  ALL_ANTIS,
  ANTI_LABELS,
  DEFAULT_ACTION,
  SOFT_ANTIS,
  getAction,
  setAction,
  listActions,
};
