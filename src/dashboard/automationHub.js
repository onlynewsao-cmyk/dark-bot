'use strict';

/**
 * Hub de Automações do Dashboard
 *
 * Inventário explícito e auditável das automações por grupo que o Dono pode
 * desligar em massa. Não inclui dados de aluguel, membros, permissões humanas
 * nem o interruptor principal `botEnabled`: o hub interrompe automações, mas
 * não deixa o bot impossível de administrar nos grupos.
 */

const GROUP_FEATURES = [
  {
    id: 'welcome-goodbye', category: 'Avisos', icon: '👋',
    name: 'Boas-vindas e despedidas',
    description: 'Mensagens de entrada e saída em texto.',
    fields: ['welcome', 'goodbye', 'welcomeEnabled', 'goodbyeEnabled'],
    globalKeys: ['welcome_enabled'],
  },
  {
    id: 'welcome-media', category: 'Avisos', icon: '🖼️',
    name: 'Mídias de boas-vindas',
    description: 'Foto, arte IA e GIF enviados a novos membros.',
    fields: ['welcomeWithPhoto', 'welcome2', 'welcm3'],
  },
  {
    id: 'participant-x9', category: 'Avisos', icon: '📡',
    name: 'X9 e chegada do bot',
    description: 'Avisos de entrada, saída, cargos e chegada/trial do bot.',
    fields: ['x9', 'botArrivalNotify'],
  },
  {
    id: 'presentation-activity', category: 'Automações', icon: '⏱️',
    name: 'Apresentação e atividade',
    description: 'Auto-apresentação, lembretes de inatividade e reposição periódica.',
    fields: ['autoapresentar', 'inactiveEnabled', 'idleNudgeEnabled', 'autorepo'],
    defaultOnFields: ['autoapresentar'],
  },
  {
    id: 'link-spam', category: 'Proteções', icon: '🔗',
    name: 'Anti-link e anti-spam',
    description: 'Análise, avisos e punições automáticas por links ou spam.',
    fields: ['antilink', 'antispam'],
    globalKeys: ['antilink_enabled', 'antispam_enabled'],
  },
  {
    id: 'learned-stickers', category: 'Proteções', icon: '🧩',
    name: 'Anti-Sticker aprendido',
    description: 'Apaga figurinhas previamente marcadas pelos administradores.',
    fields: ['antisticker'],
    offFields: ['antisticker', 'antistickerNotify'],
    defaultOnFields: ['antisticker'],
  },
  {
    id: 'anti-fobados', category: 'Proteções', icon: '🛡️',
    name: 'Anti-Fobados',
    description: 'Protege contra divulgação oculta e DDIs bloqueados.',
    fields: ['antifoba'],
    defaultOnFields: ['antifoba'],
  },
  {
    id: 'content-protection', category: 'Proteções', icon: '🚫',
    name: 'Proteções de conteúdo',
    description: 'Antis de status, menções, pagamentos, flood, palavras, toxicidade e conteúdo adulto.',
    fields: [
      'antistatus', 'antimencao', 'antipagamento', 'antiinvisivel', 'antiflood',
      'antidoc', 'antiloc', 'antifigurinha', 'antifig', 'antibtn', 'antipalavra',
      'antitoxic', 'antiporn',
    ],
    offFields: [
      'antistatus', 'antimencao', 'antipagamento', 'antiinvisivel', 'antiflood',
      'antidoc', 'antiloc', 'antifigurinha', 'antifig', 'antibtn', 'antipalavra',
      'antitoxic', 'antiporn', 'antitiposNotify',
    ],
  },
  {
    id: 'media-protection', category: 'Proteções', icon: '📵',
    name: 'Proteções de mídia',
    description: 'Antis de foto, vídeo, áudio, texto e contacto.',
    fields: ['antifoto', 'antivideo', 'antiaudio', 'antitexto', 'anticontacto'],
  },
  {
    id: 'membership-protection', category: 'Proteções', icon: '👥',
    name: 'Proteção de membros',
    description: 'Captcha de entrada e anti-rebaixamento.',
    fields: ['captcha', 'antidemote'],
  },
  {
    id: 'automatic-media', category: 'Automações', icon: '⚡',
    name: 'Mídia automática',
    description: 'Ver-uma-vez, download automático e stickers automáticos.',
    fields: ['autoVisu1', 'autoDl', 'autosticker'],
    defaultOnFields: ['autoVisu1'],
  },
  {
    id: 'automation-modes', category: 'Automações', icon: '🤖',
    name: 'Modos e ações automáticas',
    description: 'Assistente, mensagens automáticas, auto-admin e modos especiais.',
    fields: ['assistente', 'automsg', 'autoAdmMedia', 'adultMode', 'modorpg', 'modobn', 'modolite', 'modoparceria', 'modoraid'],
  },
  {
    id: 'command-categories', category: 'Automações', icon: '🎛️',
    name: 'Categorias de comandos',
    description: 'Downloads, IA, jogos, mídia, pesquisa e demais categorias por grupo.',
    fields: ['modeDownloads', 'modeStickers', 'modeIa', 'modeJogos', 'modeEconomia', 'modeInteracoes', 'modeTexto', 'modeSearch', 'modeAudio', 'modeLogos', 'modeZoeira'],
    defaultOnFields: ['modeDownloads', 'modeStickers', 'modeIa', 'modeJogos', 'modeEconomia', 'modeInteracoes', 'modeTexto', 'modeSearch', 'modeAudio', 'modeLogos', 'modeZoeira'],
  },
];

// Configurações por grupo que ficam no BotConfig e não no GroupSettings.
const CONFIG_FEATURES = [
  {
    id: 'anti-raid', category: 'Proteções', icon: '🧱',
    name: 'Anti-raid', description: 'Defesa contra raids configurada por grupo.',
    configPrefix: 'antiraid:',
  },
  {
    id: 'auto-responses', category: 'Automações', icon: '💬',
    name: 'Respostas automáticas', description: 'Respostas automáticas configuradas por grupo.',
    configPrefix: 'autorespostas:',
  },
  {
    id: 'link-capture', category: 'Automações', icon: '📥',
    name: 'Captura automática de links', description: 'Captura de links configurada por grupo.',
    configPrefix: 'capturalink:',
  },
];

const FEATURES = Object.freeze([...GROUP_FEATURES, ...CONFIG_FEATURES]);
const GROUP_OFF_FIELDS = Object.freeze([...new Set(GROUP_FEATURES.flatMap(feature => feature.offFields || feature.fields))]);
const DEFAULT_ON_FIELDS = Object.freeze([...new Set(GROUP_FEATURES.flatMap(feature => feature.defaultOnFields || []))]);
const GLOBAL_OFF_KEYS = Object.freeze([...new Set(GROUP_FEATURES.flatMap(feature => feature.globalKeys || []))]);
const CONFIG_OFF_PREFIXES = Object.freeze(CONFIG_FEATURES.map(feature => feature.configPrefix));

function isOn(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function isFieldOn(feature, field, group) {
  if (isOn(group?.[field])) return true;
  // Mongoose aplica estes defaults ao ler os documentos operacionais. O hub
  // usa .lean() para ser leve, por isso reproduz explicitamente o default.
  return (feature.defaultOnFields || []).includes(field)
    && (group?.[field] === undefined || group?.[field] === null);
}

function activeFieldsForFeature(feature) {
  return feature.offFields || feature.fields || [];
}

function groupMatchForFeature(feature) {
  const conditions = (feature.fields || []).map((field) => {
    if ((feature.defaultOnFields || []).includes(field)) return { [field]: { $ne: false } };
    return { [field]: true };
  });
  return conditions.length ? { $or: conditions } : null;
}

function allOffGroupMatch() {
  const conditions = GROUP_OFF_FIELDS.map((field) => {
    if (DEFAULT_ON_FIELDS.includes(field)) return { [field]: { $ne: false } };
    return { [field]: true };
  });
  return { $or: conditions };
}

function safeGroup(group) {
  return {
    jid: String(group.groupJid || group.jid || ''),
    name: String(group.groupName || group.subject || group.groupJid || 'Grupo sem nome'),
  };
}

function configGroupsForFeature(feature, configs, groupsByJid) {
  if (!feature.configPrefix) return [];
  return configs
    .filter(config => String(config.key || '').startsWith(feature.configPrefix) && isOn(config.value))
    .map((config) => {
      const jid = String(config.key).slice(feature.configPrefix.length);
      return groupsByJid.get(jid) || { jid, name: jid || 'Grupo não identificado' };
    });
}

function summarize(groups = [], configs = []) {
  const normalizedGroups = (groups || []).map(safeGroup);
  const groupsByJid = new Map(normalizedGroups.map(group => [group.jid, group]));
  const fullGroups = groups || [];
  const activeGlobalKeys = new Set((configs || []).filter(config => isOn(config.value)).map(config => String(config.key || '')));

  const features = FEATURES.map((feature) => {
    let activeGroups = [];
    let activeGlobals = [];
    if (feature.configPrefix) {
      activeGroups = configGroupsForFeature(feature, configs || [], groupsByJid);
    } else {
      activeGroups = fullGroups
        .filter(group => (feature.fields || []).some(field => isFieldOn(feature, field, group)))
        .map(safeGroup);
      activeGlobals = (feature.globalKeys || []).filter(key => activeGlobalKeys.has(key));
    }
    return {
      ...feature,
      activeGroups,
      activeGlobals,
      activeCount: activeGroups.length + activeGlobals.length,
      isActive: activeGroups.length + activeGlobals.length > 0,
    };
  });

  const categories = [...new Set(features.map(feature => feature.category))].map(category => ({
    name: category,
    features: features.filter(feature => feature.category === category),
  }));

  return {
    totalGroups: normalizedGroups.length,
    activeFeatures: features.filter(feature => feature.isActive).length,
    activeGroupAssignments: features.reduce((sum, feature) => sum + feature.activeCount, 0),
    features,
    categories,
  };
}

function featureById(id) {
  return FEATURES.find(feature => feature.id === String(id || '')) || null;
}

function updateForFeature(feature) {
  if (!feature || feature.configPrefix) return {};
  return Object.fromEntries(activeFieldsForFeature(feature).map(field => [field, false]));
}

module.exports = {
  FEATURES,
  GROUP_FEATURES,
  CONFIG_FEATURES,
  GROUP_OFF_FIELDS,
  DEFAULT_ON_FIELDS,
  GLOBAL_OFF_KEYS,
  CONFIG_OFF_PREFIXES,
  isOn,
  isFieldOn,
  groupMatchForFeature,
  allOffGroupMatch,
  summarize,
  featureById,
  updateForFeature,
};
