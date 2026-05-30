/**
 * Pacote de INTERAÇÕES v2.0 — com GIFs animados e arte visual
 * Cada comando aceita @marcação e gera mensagem com visual premium
 */
const Economy = require('../../database/models/Economy');
const mediaHandler = require('../mediaHandler');

function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}
const reply = (sock, msg, ctx, text, mentions = []) =>
  sock.sendMessage(ctx.remoteJid, { text, mentions }, { quoted: msg });

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// GIF APIs gratuitas para reações
const GIF_URLS = {
  abracar: [
    'https://media.tenor.com/OXJQJ0Pq9YYAAAAC/hug-anime.gif',
    'https://media.tenor.com/JlT2fkCG_aAAAAAC/anime-hug.gif',
    'https://media.tenor.com/9e1aE_xBLCsAAAAC/hug.gif',
  ],
  beijar: [
    'https://media.tenor.com/7HhGi5CAQFAAAAAC/kiss-anime.gif',
    'https://media.tenor.com/uncTnDmtnsgAAAAC/couple-kiss.gif',
  ],
  tapa: [
    'https://media.tenor.com/Ws6Dm1ZR4YIAAAAC/slap-anime.gif',
    'https://media.tenor.com/mNLSrhFfajsAAAAC/anime-slap.gif',
  ],
  soco: [
    'https://media.tenor.com/x2dBQftJ2nYAAAAC/anime-punch.gif',
    'https://media.tenor.com/tGEL1VPA7tYAAAAC/punch-anime.gif',
  ],
  matar: [
    'https://media.tenor.com/WBdHYDwAKEkAAAAC/anime-kill.gif',
  ],
  cafune: [
    'https://media.tenor.com/3PXxC6VGl-cAAAAC/pat-head.gif',
    'https://media.tenor.com/N41zMEfHeGQAAAAC/anime-pat.gif',
  ],
  morder: [
    'https://media.tenor.com/r2TaI3tVG-oAAAAC/anime-bite.gif',
  ],
  chorar: [
    'https://media.tenor.com/9hPBgvnUqEAAAAAC/anime-cry.gif',
  ],
  danca: [
    'https://media.tenor.com/S_NReBxEpOsAAAAC/anime-dance.gif',
  ],
};

/**
 * Tenta enviar GIF com a reação (fallback para texto puro)
 */
async function sendWithGif(sock, msg, ctx, text, mentions, gifCategory) {
  const urls = GIF_URLS[gifCategory];
  if (urls && urls.length) {
    try {
      const url = pick(urls);
      const buf = await mediaHandler.fetchBuffer(url);
      await sock.sendMessage(ctx.remoteJid, {
        video: buf, gifPlayback: true, caption: text, mentions,
      }, { quoted: msg });
      return;
    } catch (e) {
      // Fallback para texto puro
    }
  }
  await reply(sock, msg, ctx, text, mentions);
}

// Arte decorativa para interações
const BORDERS = {
  love: { top: '┏━━━ ˚₊‧ 💕 ‧₊˚ ━━━┓', bot: '┗━━━ ˚₊‧ 💕 ‧₊˚ ━━━┛' },
  fight: { top: '┏━━━ ⚔️ ━━━━━━━━━━┓', bot: '┗━━━ ⚔️ ━━━━━━━━━━┛' },
  fun: { top: '┏━━━ ✨ ━━━━━━━━━━┓', bot: '┗━━━ ✨ ━━━━━━━━━━┛' },
  dark: { top: '┏━━━ 🌑 ━━━━━━━━━━┓', bot: '┗━━━ 🌑 ━━━━━━━━━━┛' },
};

/**
 * Cria um comando de ação social com visual premium
 */
function action({ name, emoji, verbs, soloVerbs = ['está sozinho 🥲'], damage = 0, category = 'fun', gif = null }) {
  return async ({ sock, msg, ctx }) => {
    const targets = getMentions(msg);
    const sender = ctx.senderJid;
    const border = BORDERS[category] || BORDERS.fun;

    if (!targets.length) {
      const text = `${border.top}\n┃ ${emoji} ⌁ *${name.toUpperCase()}*\n┃\n┃ @${sender.split('@')[0]} ${pick(soloVerbs)}\n${border.bot}`;
      return reply(sock, msg, ctx, text, [sender]);
    }

    const target = targets[0];
    if (target === sender) {
      const text = `${border.top}\n┃ 🤡 ⌁ *AUTO-${name.toUpperCase()}*\n┃\n┃ @${sender.split('@')[0]} tentou\n┃ ${name} a si mesmo...\n┃ ᴵˢˢᵒ ᵉ́ ᵗʳⁱˢᵗᵉ ᵈᵉᵐᵃⁱˢ 💀\n${border.bot}`;
      return reply(sock, msg, ctx, text, [sender]);
    }

    const verb = pick(verbs);
    let hpLine = '';
    if (damage > 0 && Math.random() > 0.4) {
      try {
        const eco = await Economy.getOrCreate(target.split('@')[0]);
        eco.hp = Math.max(0, eco.hp - damage);
        await eco.save();
        const hpBar = '█'.repeat(Math.floor(eco.hp / eco.maxHp * 10)) + '░'.repeat(10 - Math.floor(eco.hp / eco.maxHp * 10));
        hpLine = `\n┃\n┃ ❤️ HP @${target.split('@')[0]}: [${hpBar}] ${eco.hp}/${eco.maxHp}`;
        if (eco.hp === 0) hpLine += `\n┃ ☠️ *DESMAIOU!* Use !heal`;
      } catch (e) {}
    }

    const text = `${border.top}\n┃ ${emoji} ⌁ *${name.toUpperCase()}*\n┃\n┃ @${sender.split('@')[0]}\n┃ ${verb}\n┃ @${target.split('@')[0]}${hpLine}\n${border.bot}`;

    // Tenta enviar com GIF
    await sendWithGif(sock, msg, ctx, text, [sender, target], gif || name.replace(/\s/g, ''));
  };
}

/**
 * Cria um comando percentual com visual
 */
function percentage({ name, emoji, adj }) {
  return async ({ sock, msg, ctx }) => {
    const targets = getMentions(msg);
    const target = targets[0] || ctx.senderJid;
    const pct = randInt(0, 100);
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));

    let reaction = '';
    if (pct >= 80) reaction = '🔥 *NÍVEL MÁXIMO!*';
    else if (pct >= 50) reaction = '😏 *Considerável...*';
    else if (pct >= 20) reaction = '😐 *Hmm...*';
    else reaction = '🤷 *Quase nada*';

    const text = `┏━━━ ${emoji} ━━━━━━━━━━┓\n┃ 📊 ⌁ *MEDIDOR DE ${name.toUpperCase()}*\n┃\n┃ 👤 @${target.split('@')[0]}\n┃ ${emoji} ${adj}: *${pct}%*\n┃ ┃${bar}┃\n┃\n┃ ${reaction}\n┗━━━━━━━━━━━━━━━━━┛`;

    await reply(sock, msg, ctx, text, [target]);
  };
}

module.exports = {
  // ═══════════ AMOR / CARINHO ═══════════
  abracar: action({
    name: 'abraçar', emoji: '🤗', category: 'love', gif: 'abracar',
    verbs: ['deu um abraço apertado em', 'envolveu carinhosamente', 'mandou um abracinho para', 'esmagou de carinho'],
    soloVerbs: ['precisa de um abraço 🥺', 'tá carente, alguém abraça?'],
  }),
  beijar: action({
    name: 'beijar', emoji: '💋', category: 'love', gif: 'beijar',
    verbs: ['deu um beijão em', 'roubou um beijo de', 'beijou apaixonadamente', 'mandou beijo para'],
    soloVerbs: ['tá precisando de carinho 💋'],
  }),
  cafune: action({
    name: 'fazer cafuné', emoji: '🥰', category: 'love', gif: 'cafune',
    verbs: ['fez cafuné em', 'acariciou a cabecinha de', 'mimou com carinho'],
  }),
  declarar: action({
    name: 'declarar amor', emoji: '💌', category: 'love',
    verbs: ['se declarou para', 'mandou uma carta de amor para', 'jurou amor eterno a'],
  }),
  flertar: action({
    name: 'flertar', emoji: '😏', category: 'love',
    verbs: ['deu uma piscadinha para', 'flertou descaradamente com', 'mandou olhar 43 para'],
  }),
  paparico: action({
    name: 'paparicar', emoji: '✨', category: 'love',
    verbs: ['paparicou', 'mimou demais', 'tratou como realeza'],
  }),

  // ═══════════ VIOLÊNCIA (com HP + GIF) ═══════════
  tapa: action({
    name: 'dar tapa', emoji: '👋', category: 'fight', gif: 'tapa',
    verbs: ['deu um TAPA na cara de', 'mandou um chinelão em', 'estalou a mão em'],
    damage: 5,
  }),
  soco: action({
    name: 'dar soco', emoji: '👊', category: 'fight', gif: 'soco',
    verbs: ['deu um SOCO em', 'mandou um direto em', 'acertou um cruzado em'],
    damage: 10,
  }),
  chute: action({
    name: 'dar chute', emoji: '🦵', category: 'fight',
    verbs: ['deu uma VOADORA em', 'chutou com tudo', 'mandou um roundhouse kick em'],
    damage: 8,
  }),
  tiro: action({
    name: 'atirar', emoji: '🔫', category: 'dark',
    verbs: ['deu um TIRO em', 'metralhou', 'atirou pra matar em'],
    damage: 25,
  }),
  facada: action({
    name: 'esfaquear', emoji: '🔪', category: 'dark',
    verbs: ['deu uma FACADA em', 'esfaqueou pelas costas', 'cortou'],
    damage: 20,
  }),
  matar: action({
    name: 'matar', emoji: '💀', category: 'dark', gif: 'matar',
    verbs: ['MATOU', 'eliminou', 'despachou', 'mandou pro além'],
    damage: 50,
  }),
  bater: action({
    name: 'bater', emoji: '🤜', category: 'fight',
    verbs: ['bateu em', 'deu porrada em', 'surrou'],
    damage: 7,
  }),
  morder: action({
    name: 'morder', emoji: '🧛', category: 'fight', gif: 'morder',
    verbs: ['mordeu', 'cravou os dentes em', 'deu uma mordida vampírica em'],
    damage: 6,
  }),
  cuspir: action({
    name: 'cuspir', emoji: '💦', category: 'fight',
    verbs: ['cuspiu em', 'mandou um cuspe em', 'acertou um molhado em'],
    damage: 2,
  }),
  empurrar: action({
    name: 'empurrar', emoji: '🫸', category: 'fight',
    verbs: ['empurrou', 'jogou no chão', 'derrubou'],
    damage: 4,
  }),
  envenenar: action({
    name: 'envenenar', emoji: '☠️', category: 'dark',
    verbs: ['envenenou', 'colocou veneno na comida de', 'drogou'],
    damage: 30,
  }),
  espancar: action({
    name: 'espancar', emoji: '💥', category: 'dark',
    verbs: ['espancou', 'deu uma surra em', 'acabou com'],
    damage: 15,
  }),
  bullying: action({
    name: 'fazer bullying', emoji: '🫵', category: 'fight',
    verbs: ['fez bullying com', 'zoou', 'humilhou publicamente'],
    damage: 3,
  }),

  // ═══════════ GERAL / FUN ═══════════
  mimimi: action({
    name: 'mimimi', emoji: '😭', category: 'fun', gif: 'chorar',
    verbs: ['fez mimimi pra', 'chorou no colo de', 'reclamou pra'],
    soloVerbs: ['tá fazendo mimimi sozinho 😭'],
  }),
  fofocar: action({
    name: 'fofocar', emoji: '🗣️', category: 'fun',
    verbs: ['fofocou sobre', 'espalhou rumores de', 'contou o segredo de'],
  }),
  acordar: action({
    name: 'acordar', emoji: '⏰', category: 'fun',
    verbs: ['acordou', 'jogou água gelada em', 'gritou no ouvido de'],
  }),
  cuidar: action({
    name: 'cuidar', emoji: '🩹', category: 'love',
    verbs: ['cuidou de', 'fez curativo em', 'tratou com carinho'],
  }),
  bencao: action({
    name: 'abençoar', emoji: '🙏', category: 'love',
    verbs: ['abençoou', 'mandou bênçãos para', 'orou por'],
  }),
  amaldicoar: action({
    name: 'amaldiçoar', emoji: '🧿', category: 'dark',
    verbs: ['amaldiçoou', 'rogou praga em', 'lançou maldição em'],
    damage: 15,
  }),
  dancar: action({
    name: 'dançar', emoji: '💃', category: 'fun', gif: 'danca',
    verbs: ['dançou com', 'chamou pra dançar', 'fez um passinho com'],
    soloVerbs: ['tá dançando sozinho 💃🕺'],
  }),

  // ═══════════ PERCENTUAIS ═══════════
  gay: percentage({ name: 'GAY', emoji: '🏳️‍🌈', adj: 'Gay' }),
  lindo: percentage({ name: 'BELEZA', emoji: '✨', adj: 'Lindo(a)' }),
  feio: percentage({ name: 'FEIÚRA', emoji: '🤢', adj: 'Feio(a)' }),
  burro: percentage({ name: 'BURRICE', emoji: '🧠', adj: 'Burro(a)' }),
  corno: percentage({ name: 'CHIFRES', emoji: '🦌', adj: 'Corno(a)' }),
  rico: percentage({ name: 'RIQUEZA', emoji: '💰', adj: 'Rico(a)' }),
  safado: percentage({ name: 'SAFADEZA', emoji: '🔥', adj: 'Safado(a)' }),
  doido: percentage({ name: 'LOUCURA', emoji: '🤪', adj: 'Doido(a)' }),
  gostoso: percentage({ name: 'GOSTOSURA', emoji: '🥵', adj: 'Gostoso(a)' }),
  malucao: percentage({ name: 'MALUQUICE', emoji: '🃏', adj: 'Malucão' }),
};
