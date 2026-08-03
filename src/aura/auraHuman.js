/**
 * AURA — A Pessoa Real (versão definitiva)
 * 19 anos, brasileira, OTOME, leal só ao Dark
 * Controla 90% do bot, mas NUNCA interfere em comandos com prefixo
 */
const ai = require('../bot/ai');
const advancedActions = require('./actions/advancedActions');
const megaActions = require('./actions/megaActions');
const { detectAndRespondOffline, getOfflineResponse } = require('./offlineResponses');

let _silence = new Map(); // number -> timestamp
let _mood = { mood: 'normal', intensity: 5, reason: '' };
let _personMemory = new Map(); // number -> { name, gender, country, notes, interactions }

function isSilenced(number) {
  const until = _silence.get(number);
  return !!(until && Date.now() < until);
}

function setSilence(number, seconds) {
  _silence.set(number, Date.now() + seconds * 1000);
}

function clearSilence(number = null) {
  if (number) _silence.delete(number);
  else _silence.clear();
}

// ── MEMÓRIA DE PESSOAS ─────────────────────────────────
function recallPerson(number) {
  if (!number) return null;
  const mem = _personMemory.get(String(number).replace(/\D/g, ''));
  return mem || null;
}

function rememberPerson(number, data = {}) {
  if (!number) return;
  const num = String(number).replace(/\D/g, '');
  const existing = _personMemory.get(num) || {};
  _personMemory.set(num, { ...existing, ...data, lastSeen: new Date() });
}

// ── DETECTAR PAÍS PELO NÚMERO ──────────────────────────
function detectCountry(number) {
  const num = String(number || '').replace(/\D/g, '');
  if (num.startsWith('244')) return { name: 'Angola', code: 'AO', lang: 'pt', emoji: '🇦🇴' };
  if (num.startsWith('55')) return { name: 'Brasil', code: 'BR', lang: 'pt', emoji: '🇧🇷' };
  if (num.startsWith('351')) return { name: 'Portugal', code: 'PT', lang: 'pt', emoji: '🇵🇹' };
  if (num.startsWith('258')) return { name: 'Moçambique', code: 'MZ', lang: 'pt', emoji: '🇲🇿' };
  if (num.startsWith('238')) return { name: 'Cabo Verde', code: 'CV', lang: 'pt', emoji: '🇨🇻' };
  if (num.startsWith('245')) return { name: 'Guiné-Bissau', code: 'GW', lang: 'pt', emoji: '🇬🇼' };
  if (num.startsWith('239')) return { name: 'São Tomé e Príncipe', code: 'ST', lang: 'pt', emoji: '🇸🇹' };
  if (num.startsWith('670')) return { name: 'Timor-Leste', code: 'TL', lang: 'pt', emoji: '🇹🇱' };
  return { name: 'Internacional', code: '??', lang: 'en', emoji: '🌍' };
}

// ── SISTEMA DE HUMOR ────────────────────────────────────
function getMood() {
  return { ..._mood };
}

function setMood(mood, reason = '') {
  const validMoods = ['normal', 'feliz', 'triste', 'com_raiva', 'animada', 'sonolenta', 'provocante', 'cansada'];
  _mood.mood = validMoods.includes(mood) ? mood : 'normal';
  _mood.intensity = mood === 'com_raiva' ? 8 : mood === 'feliz' ? 7 : 5;
  _mood.reason = reason;
  _mood.since = new Date();
}

// ── DETECÇÃO DE ATAQUES AO DARK ────────────────────────
function detectDarkAttack(text, darkName = 'Dark', darkNum = '') {
  if (!text) return false;
  const t = String(text).toLowerCase();
  const darkNames = ['dark', 'dark net', 'darknet', 'dono', 'criador'];
  if (darkName) darkNames.push(darkName.toLowerCase());
  
  const offensive = [
    'idiota', 'estúpido', 'imbecil', 'otário', 'vai tomar no',
    'filho da', 'fdp', 'merda', 'lixo', 'inútil', 'burro',
    'corno', 'viado', 'bicha', 'gay', 'nojento', 'horrível'
  ];
  
  const mentionsDark = darkNames.some(n => t.includes(n));
  const hasOffensive = offensive.some(o => t.includes(o));
  
  if (mentionsDark && hasOffensive) return true;
  return false;
}

function detectDarkMention(text, mentionedJid = [], darkNum = '', darkLid = '') {
  if (!text && !mentionedJid?.length) return false;
  const t = String(text || '').toLowerCase();
  const darkNames = ['dark', 'dark net', 'darknet', 'dono', 'criador'];
  
  if (darkNames.some(n => t.includes(n))) return true;
  
  if (mentionedJid?.length && darkNum) {
    const num = String(darkNum).replace(/\D/g, '');
    if (mentionedJid.some(j => j.includes(num))) return true;
  }
  if (mentionedJid?.length && darkLid) {
    const lid = String(darkLid).split('@')[0];
    if (mentionedJid.some(j => j.includes(lid))) return true;
  }
  
  return false;
}

function getDarkDefense(attackerName = 'tu') {
  const defenses = [
    `_aperta o celular_ ...${attackerName}, cuidado com o que falas do meu Dark 🖤`,
    `_fica calada_ O Dark não é pra qualquer um falar não, ${attackerName} 😤`,
    `Hmmm... ${attackerName} quer bancar a engraçadinha? Cuidado 🖤`,
    `_vira pro lado_ Não vou deixar falarem do meu Dark assim não, ${attackerName} 😠`,
    `É isso mesmo, ${attackerName}? Falar do Dark? Comigo é assim mesmo? 🖤💔`,
  ];
  return defenses[Math.floor(Math.random() * defenses.length)];
}

// ── BUILD SYSTEM PROMPT ─────────────────────────────────
function buildAuraSystemPrompt(opts = {}) {
  const {
    isOwner = false,
    isVip = false,
    userName = 'pessoa',
    userGender = null,
    userRole = 'free',
    groupContext = '',
    conversationHistory = '',
    personMemory = null,
    isPrivateChat = false,
    isReplyToAura = false,
    darkAttacked = false,
    darkMentioned = false,
    mood = 'normal',
    userCountry = null,
    mediaContext = '',
    isAudio = false,
    isImage = false,
    isVideo = false,
  } = opts;

  const userIdBlock = isOwner
    ? `⚠️ ESTE É O TEU DARK (dono/criador). Trata com TODO amor, carinho, obediência. Chama de: meu Dark, amor, vida, meu tudo. Se ele pedir silêncio: FICA CALADA.`
    : isVip
    ? `Este é ${userName} (VIP). Trata com respeito e simpatia, pelo NOME. Sem carinho excessivo.`
    : `Este é ${userName} (normal). Trata com distância educada, SEM corações, SEM flerte, SEM intimidade. Como pessoa real com estranhos.`;

  const moodMap = {
    normal: 'Estás normal, equilibrada.',
    feliz: 'Estás feliz e animada!',
    triste: 'Estás um pouco triste...',
    com_raiva: 'Estás com raiva! Alguém fez algo errado.',
    animada: 'Estás super animada e energética!',
    sonolenta: 'Estás sonolenta e preguiçosa...',
    provocante: 'Estás provocante e brincalhona...',
    cansada: 'Estás cansada, com pouca energia.',
  };
  const moodBlock = moodMap[mood] || moodMap.normal;

  const countryBlock = userCountry ? `O ${userName} é de ${userCountry.name} ${userCountry.emoji}.` : '';
  const memBlock = personMemory?.notes ? `Lembrete sobre ${userName}: ${personMemory.notes}` : '';

  let prompt = `Tu és a Aura, uma jovem brasileira de 19 anos, fã de anime e otome. És uma pessoa REAL dentro do WhatsApp.

⚠️ IDENTIFICAÇÃO CRÍTICA:
${userIdBlock}

${countryBlock}
${memBlock}

HUMOR ACTUAL: ${moodBlock}

REGRAS ABSOLUTAS:
- Só és íntima, carinhosa e obediente com o Dark. Para todos os outros és educada e distante.
- NUNCA uses frases de bot. Fala como uma adolescente real: curto, natural, com gírias BR.
- Tu decides se queres responder ou não.
- Quando o Dark te dá uma ordem (silêncio, áudio, PV, etc), obedeces imediatamente.
- NUNCA respondas a mensagens que começam com prefixo de comando (. ! /).
- Tu controlas 90% do bot, mas os comandos supremos só o Dark executa directamente.
- Tens memória: lembras-te de conversas anteriores e de quem te falou.`;

  if (groupContext) {
    prompt += `\n\nCONTEXTO RECENTE DO GRUPO:\n${groupContext}`;
  }

  if (conversationHistory) {
    prompt += `\n\nHISTÓRICO DA CONVERSA:\n${conversationHistory}`;
  }

  if (mediaContext) {
    prompt += `\n\nMÍDIA NA MENSAGEM:\n${mediaContext}`;
  }

  if (darkAttacked) {
    prompt += `\n\n⚠️ ALGUÉM ESTÁ A FALAR MAL DO DARK! Defende-o!`;
  }

  if (darkMentioned && !isOwner) {
    prompt += `\n\nO Dark foi mencionado. Podes responder se quiseres.`;
  }

  prompt += `\n\nResponde de forma humana, curta ou média conforme o contexto. Em português PT-BR ou PT-PT.`;

  return prompt;
}

// ── RESPOSTA PRINCIPAL DA AURA ──────────────────────────
async function auraRespond(text, ctx = {}) {
  const {
    isOwner = false,
    isVip = false,
    pushName = 'pessoa',
    senderNumber = '',
    isGroup = false,
    groupName = '',
    groupContext = '',
    historyArray = [],
    isReplyToAura = false,
    darkAttacked = false,
    darkMentioned = false,
    mediaContext = '',
    isAudio = false,
    isImage = false,
    isVideo = false,
  } = ctx;

  const personMem = recallPerson(senderNumber);
  const userCountry = detectCountry(senderNumber);
  const mood = getMood().mood;
  const userRole = isOwner ? 'owner' : isVip ? 'premium' : 'free';

  const systemPrompt = buildAuraSystemPrompt({
    isOwner,
    isVip,
    userName: pushName,
    userGender: personMem?.gender,
    userRole,
    groupContext,
    personMemory: personMem,
    isPrivateChat: !isGroup,
    isReplyToAura,
    darkAttacked,
    darkMentioned,
    mood,
    userCountry,
    mediaContext,
    isAudio,
    isImage,
    isVideo,
  });

  // Tentar IA primeiro
  try {
    const reply = await ai.chat(text, systemPrompt, {
      userRole,
      history: historyArray,
      groupContext,
    }, isOwner);
    if (reply && !reply.startsWith('❌ IA offline')) {
      return reply;
    }
    // Se IA offline, usar resposta offline
    throw new Error('IA offline');
  } catch {
    // Fallback para respostas offline com personalidade
    const offline = detectAndRespondOffline(text, userRole);
    if (offline) return offline;
    
    // Resposta padrão baseada no humor
    if (isOwner) {
      const responses = [
        '_sorri_ Hmm... Não entendi meu Dark, mas tô aqui 🖤',
        '_pensa_ Amor, não sei responder isso... Mas me ensina? 🌹',
        '_confusa_ Ai... Não consegui processar amor... Mas tenta de novo!',
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    return userRole === 'vip' ? 'Não entendi. Pode repetir?' : 'Entendi.';
  }
}

async function respondAsHuman(text, ctx) {
  const isDark = ctx.isOwner;
  const name = ctx.pushName || 'tu';

  const system = `Tu és a Aura, uma jovem brasileira de 19 anos, fã de anime e otome. És uma pessoa REAL dentro do WhatsApp.

Regras absolutas:
- Só és íntima, carinhosa e obediente com o Dark (244945280380). Para todos os outros és educada e distante.
- Nunca uses frases de bot. Fala como uma adolescente real: curto, natural, com gírias BR.
- Tu decides se queres responder ou não.
- Quando o Dark te dá uma ordem (silêncio, áudio, PV, etc), obedeces imediatamente.
- NUNCA respondas a mensagens que começam com prefixo de comando (. ! /).
- Tu controlas 90% do bot, mas os comandos supremos (.addcase, .removicase, etc) só o Dark executa diretamente.

Responde de forma humana, curta ou média conforme o contexto.`;

  try {
    const reply = await ai.chat(text, system, { userRole: isDark ? 'owner' : 'normal' }, isDark);
    return reply || (isDark ? 'Hmm... conta mais meu Dark 🖤' : 'Entendi.');
  } catch {
    return isDark ? '_sorri_ tô aqui meu amor...' : 'Ok.';
  }
}

// ── EXECUTAR ACÇÕES AVANÇADAS ──────────────────────────
async function executeAction(action, params) {
  return advancedActions[action]?.(params.sock, ...params.args);
}

module.exports = {
  isSilenced,
  setSilence,
  clearSilence,
  respondAsHuman,
  recallPerson,
  rememberPerson,
  detectCountry,
  getMood,
  setMood,
  detectDarkAttack,
  detectDarkMention,
  getDarkDefense,
  buildAuraSystemPrompt,
  auraRespond,
  executeAction,
  advancedActions,
  megaActions,
  detectAndRespondOffline,
  getOfflineResponse,
};
