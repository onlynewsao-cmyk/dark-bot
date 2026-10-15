/**
 * AURA OFFLINE RESPONSES
 * Respostas pré-definidas que mantêm a personalidade da AURA
 * Usado quando a IA está offline ou sem quota
 */

const offlineResponses = {
  // ── SAUDAÇÕES ──────────────────────────────────────────
  greeting: {
    owner: [
      'Olá, Dark. Como posso ajudar? 🖤',
      'Oi, Dark. O que precisas?',
      'Olá! Diz-me no que posso ajudar.',
    ],
    vip: ['Olá! Como posso ajudar?', 'Oi! O que precisas?'],
    free: ['Olá! Como posso ajudar?', 'Oi!'],
  },

  // ── PERGUNTAS COMUNS ────────────────────────────────────
  howAreYou: {
    owner: [
      'Estou a responder em modo básico porque a IA está offline, Dark. E tu, tudo bem?',
      'A IA está offline neste momento, mas ainda consigo responder ao básico. Como estás?',
    ],
    vip: [
      'A IA está offline agora, mas ainda consigo responder a algumas coisas simples.',
      'Estou em modo básico enquanto a IA está indisponível. E contigo?',
    ],
    free: [
      'A IA está offline neste momento; consigo responder apenas a algumas coisas simples.',
      'Estou em modo básico agora. Como posso ajudar com algo simples?',
    ],
  },

  whatCanYouDo: {
    owner: [
      'A IA está offline, por isso as respostas estão limitadas. Usa .menu para veres os comandos disponíveis, Dark.',
    ],
    vip: [
      'A IA está offline, por isso as respostas estão limitadas. Usa .menu para veres os comandos disponíveis.',
    ],
    free: [
      'A IA está offline, por isso as respostas estão limitadas. Usa .menu para veres os comandos disponíveis.',
    ],
  },

  // ── EMOÇÕES ────────────────────────────────────────────
  happy: {
    owner: [
      'Boa, Dark 🖤 Espero que continue assim.',
      'Que bom saber. O que correu bem?',
      'Isso é óptimo 😊',
    ],
    vip: ['Que bom! 😊', 'Boa notícia.'],
    free: ['Que bom.', 'Boa notícia.'],
  },

  sad: {
    owner: [
      'Lamento que estejas a passar por isso, Dark. Queres contar-me o que aconteceu?',
      'Isso parece difícil. Se quiseres, conta-me um pouco mais.',
      'Não precisas de resolver tudo de uma vez. O que te está a pesar mais?',
    ],
    vip: ['Lamento que estejas a passar por isso. Queres falar sobre o que aconteceu?', 'Isso parece difícil.'],
    free: ['Lamento que estejas a passar por isso.', 'Percebo. Queres explicar melhor?'],
  },

  angry: {
    owner: [
      'Percebo a frustração, Dark. O que aconteceu?',
      'Respira um instante. Queres contar-me o que correu mal?',
      'Isso irrita mesmo. O que te deixou assim?',
    ],
    vip: ['Percebo a frustração. O que aconteceu?', 'Queres contar-me o que correu mal?'],
    free: ['Percebo a frustração.', 'O que aconteceu?'],
  },

  // ── CARINHO ────────────────────────────────────────────
  love: {
    owner: [
      'Obrigada pelo carinho, Dark 🖤 Sou uma assistente virtual e não sinto amor como uma pessoa, mas posso continuar a conversar contigo.',
    ],
    vip: [
      'Obrigada pelo carinho! Sou uma assistente virtual e não sinto amor como uma pessoa, mas posso conversar contigo.',
    ],
    free: [
      'Obrigada pelo carinho. Sou uma assistente virtual; não sinto amor como uma pessoa, mas posso conversar contigo.',
    ],
  },

  // ── RESPOSTA A CONFLITOS ────────────────────────────────
  darkDefense: [
    'Vamos manter a conversa respeitosa. Se houver um problema, expliquem-no sem ataques pessoais.',
    'Não é preciso partir para insultos. Digam qual é o problema e tentem resolvê-lo.',
  ],

  // ── ERROS ──────────────────────────────────────────────
  error: {
    owner: [
      'A acção falhou e não foi concluída, Dark. Podes tentar novamente mais tarde.',
      'Não consegui concluir isso agora. Tenta outra vez daqui a pouco.',
    ],
    vip: ['A acção falhou e não foi concluída. Tenta novamente mais tarde.', 'Não consegui concluir isso agora.'],
    free: ['A acção falhou e não foi concluída. Tenta novamente mais tarde.', 'Não foi possível concluir o pedido.'],
  },

  // ── DESPEDIDAS ─────────────────────────────────────────
  goodbye: {
    owner: ['Até logo, Dark 🖤', 'Até já, Dark.', 'Tchau!'],
    vip: ['Até logo! 👋', 'Tchau!'],
    free: ['Até logo.', 'Tchau.'],
  },

  // ── AGRADECIMENTO ───────────────────────────────────────
  thanks: {
    owner: ['De nada, Dark 🖤', 'Disponha, Dark.', 'Ora essa!'],
    vip: ['De nada! 😊', 'Disponha.'],
    free: ['De nada.', 'Disponha.'],
  },

  // ── COMANDO DESCONHECIDO ────────────────────────────────
  unknownCommand: {
    owner: [
      'Não reconheci esse pedido, Dark. Usa .menu para veres os comandos disponíveis.',
      'Não encontrei esse comando. O .menu mostra as opções disponíveis.',
    ],
    vip: ['Não reconheci esse comando. Usa .menu para veres as opções disponíveis.', 'Não encontrei esse comando.'],
    free: ['Comando não encontrado. Usa .menu para veres as opções disponíveis.'],
  },

  // ── SILÊNCIO ────────────────────────────────────────────
  silence: {
    owner: ['Entendido, Dark. Fico em silêncio até me chamares.', 'Está bem, Dark.'],
    vip: ['Entendido.', 'Está bem.'],
    free: ['Entendido.'],
  },

  // ── PIADAS ──────────────────────────────────────────────
  joke: {
    owner: [
      'Por que é que o programador usa óculos? Porque não consegue C#! 😂',
      'O que disse o zero ao oito? Belo cinto! 😂',
      'Porque é que o computador foi ao médico? Estava com um vírus. 😄',
    ],
    vip: ['Por que é que o programador usa óculos? Porque não consegue C#! 😂', 'O que disse o zero ao oito? Belo cinto! 😂'],
    free: ['Porque é que o computador foi ao médico? Estava com um vírus. 😄'],
  },

  // ── CLIMA ───────────────────────────────────────────────
  weather: {
    owner: [
      'Não tenho dados meteorológicos actualizados neste momento, Dark. Consulta uma fonte local para a previsão.',
    ],
    vip: ['Não tenho dados meteorológicos actualizados neste momento. Consulta uma fonte local para a previsão.'],
    free: ['Não tenho uma previsão meteorológica actualizada agora.'],
  },

  // ── HORA ────────────────────────────────────────────────
  time: {
    owner: ['Não consigo confirmar a hora local daqui, Dark. Vê o relógio do teu dispositivo.'],
    vip: ['Não consigo confirmar a hora local. Vê o relógio do teu dispositivo.'],
    free: ['Vê o relógio do teu dispositivo para confirmar a hora local.'],
  },
};

// Função para obter resposta offline
function getOfflineResponse(type, userRole = 'free', context = {}) {
  if (type === 'time') {
    const localTime = new Intl.DateTimeFormat('pt-AO', {
      timeZone: 'Africa/Luanda', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date());
    return `Em Luanda, são ${localTime}${userRole === 'owner' ? ', Dark.' : '.'}`;
  }
  const responses = offlineResponses[type];
  if (!responses) return null;

  let pool;
  if (typeof responses === 'object' && !Array.isArray(responses)) {
    pool = responses[userRole] || responses.free || responses.owner;
  } else if (Array.isArray(responses)) {
    pool = responses;
  } else {
    return null;
  }

  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Função para detectar intenção e responder offline
function detectAndRespondOffline(text, userRole = 'free') {
  const t = (text || '').toLowerCase().trim();

  // Saudações
  if (/^(oi|olá|ola|hello|hi|hey|bom dia|boa tarde|boa noite|salve)\b/i.test(t)) {
    return getOfflineResponse('greeting', userRole);
  }

  // Como estás
  if (/^(como (est[áa]s?|vai))|(tudo bem)|(como vai)|(beleza)|(blz)/i.test(t)) {
    return getOfflineResponse('howAreYou', userRole);
  }

  // O que podes fazer
  if (/o que (pode[ms]?|faz(e[r])?|sabe[ms]?)/i.test(t) || /quais? (comando|função)/i.test(t)) {
    return getOfflineResponse('whatCanYouDo', userRole);
  }

  // Amor
  if (/^(amo|amo-te|love|gosto de ti|gosto de você|te amo)\b/i.test(t)) {
    return getOfflineResponse('love', userRole);
  }

  // Obrigado
  if (/^(obrigado|obrigada|thanks|valeu|agradeço)\b/i.test(t)) {
    return getOfflineResponse('thanks', userRole);
  }

  // Despedida
  if (/^(tchau|até logo|adeus|falou|flw|até mais|bye)\b/i.test(t)) {
    return getOfflineResponse('goodbye', userRole);
  }

  // Piadas
  if (/^(piada|conta.*(piada|história|joke)|rir|engraçado)\b/i.test(t)) {
    return getOfflineResponse('joke', userRole);
  }

  // Triste
  if (/^(triste|chorar|mal|malz|depressão|sozinho)\b/i.test(t)) {
    return getOfflineResponse('sad', userRole);
  }

  // Zangado
  if (/^(zangado|furioso|raiva|irritado|ódio|angry)\b/i.test(t)) {
    return getOfflineResponse('angry', userRole);
  }

  // Feliz
  if (/^(feliz|alegre|contente|animado|happy|bom|ótimo)\b/i.test(t)) {
    return getOfflineResponse('happy', userRole);
  }

  // Clima
  if (/^(clima|tempo|chuva|sol|temperatura|weather)\b/i.test(t)) {
    return getOfflineResponse('weather', userRole);
  }

  // Hora
  if (/^(horas|hora|que horas|relógio|time)\b/i.test(t)) {
    return getOfflineResponse('time', userRole);
  }

  // Erro
  if (/^(erro|bug|falha|não funciona|quebrou)\b/i.test(t)) {
    return getOfflineResponse('error', userRole);
  }

  return null;
}

module.exports = {
  offlineResponses,
  getOfflineResponse,
  detectAndRespondOffline,
};
