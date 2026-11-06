'use strict';

/**
 * Padrões únicos para os avisos operacionais de grupo.
 *
 * Os templates usam apenas variáveis resolvidas com segurança pelo motor de
 * eventos: {user}, {nome}, {grupo}, {membros}, {bot} e {dono}. Nunca contêm
 * um JID/LID cru.
 */

const NOTICE_DEFAULTS_VERSION = '2026-11-06-group-notices-v1';
const NOTICE_DEFAULTS_MARKER = `migration:${NOTICE_DEFAULTS_VERSION}`;

const DEFAULT_WELCOME_TEMPLATE = [
  '╭━━━〔 ✨ *BEM-VINDO(A)* 〕━━━╮',
  '┃ 👋 Olá, {user}!',
  '┃ 🌟 *{nome}*, agora fazes parte de',
  '┃    *{grupo}*',
  '┃ 👥 Comunidade: *{membros} membros*',
  '╰━━━━━━━━━━━━━━━━━━━━╯',
  '🤖 {bot}',
].join('\n');

const DEFAULT_GOODBYE_TEMPLATE = [
  '╭━━━〔 👋 *ATÉ BREVE* 〕━━━╮',
  '┃ {user} saiu de *{grupo}*.',
  '┃ Obrigado por fazeres parte',
  '┃ desta comunidade, *{nome}*.',
  '╰━━━━━━━━━━━━━━━━━━╯',
  '🤖 {bot}',
].join('\n');

/**
 * Configuração explicitamente aprovada para a reposição global:
 * - welcome, despedida e X9 ficam públicos;
 * - auto-apresentação e anti-fobados ficam activos;
 * - mídias/templates antigos são removidos para que o padrão consistente
 *   apareça em todos os grupos.
 *
 * `fobaBlacklist: []` significa que anti-fobados continua a tratar divulgação
 * oculta, mas não bloqueia nenhum país por DDI até o Dono configurar uma lista.
 */
function groupNoticeDefaultsPatch() {
  return {
    welcome: true,
    goodbye: true,
    welcomeEnabled: true,
    goodbyeEnabled: true,
    customWelcome: DEFAULT_WELCOME_TEMPLATE,
    customWelcomeMsg: DEFAULT_WELCOME_TEMPLATE,
    customGoodbye: DEFAULT_GOODBYE_TEMPLATE,
    customGoodbyeMsg: DEFAULT_GOODBYE_TEMPLATE,
    welcomeWithPhoto: false,
    welcomeWithMedia: '',
    goodbyeWithMedia: '',
    welcome2: false,
    welcm3: false,
    x9: true,
    autoapresentar: true,
    antifoba: true,
    fobaBlacklist: [],
  };
}

/**
 * Reposição destrutiva e idempotente dos avisos de TODOS os grupos existentes.
 * É chamada uma única vez no boot seguinte ao deploy e marcada em BotConfig;
 * um restart não apaga novamente as escolhas feitas pelos admins depois dela.
 */
async function applyApprovedGroupNoticeDefaults() {
  const GroupSettings = require('./models/GroupSettings');
  const BotConfig = require('./models/BotConfig');
  const alreadyApplied = await BotConfig.get(NOTICE_DEFAULTS_MARKER, null).catch(() => null);
  if (alreadyApplied?.version === NOTICE_DEFAULTS_VERSION) {
    return { applied: false, reason: 'already-applied', matched: 0, modified: 0 };
  }

  const result = await GroupSettings.updateMany({}, { $set: groupNoticeDefaultsPatch() });
  const summary = {
    version: NOTICE_DEFAULTS_VERSION,
    appliedAt: new Date().toISOString(),
    matched: Number(result?.matchedCount || result?.n || 0),
    modified: Number(result?.modifiedCount || result?.nModified || 0),
  };
  await BotConfig.set(NOTICE_DEFAULTS_MARKER, summary);
  return { applied: true, ...summary };
}

module.exports = {
  NOTICE_DEFAULTS_VERSION,
  NOTICE_DEFAULTS_MARKER,
  DEFAULT_WELCOME_TEMPLATE,
  DEFAULT_GOODBYE_TEMPLATE,
  groupNoticeDefaultsPatch,
  applyApprovedGroupNoticeDefaults,
};
