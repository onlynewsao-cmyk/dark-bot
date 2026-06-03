/**
 * Pacote de INTERAÇÕES v4.0 — GIFs MP4 via Tenor API v2
 * GIFs compatíveis com WhatsApp (gifPlayback: true)
 */
const Economy = require('../../database/models/Economy');
const { sendWithGif } = require('../gifHelper');

function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Mapa de ação → query de busca no Tenor
const GIF_QUERIES = {
  abracar:    'anime hug',
  beijar:     'anime kiss',
  cafune:     'anime pat head',
  declarar:   'anime love confession',
  flertar:    'anime wink flirt',
  paparico:   'anime spoil cute',
  dancar:     'anime dance happy',
  tapa:       'anime slap',
  soco:       'anime punch',
  chute:      'anime kick',
  tiro:       'anime gun shoot',
  facada:     'anime knife stab',
  matar:      'anime kill',
  bater:      'anime punch fight',
  morder:     'anime bite',
  cuspir:     'anime disgust spit',
  empurrar:   'anime push',
  envenenar:  'anime poison',
  espancar:   'anime beat up fight',
  bullying:   'anime bully',
  mimimi:     'anime cry sad',
  fofocar:    'anime whisper gossip',
  acordar:    'anime wake up',
  cuidar:     'anime nurse heal',
  bencao:     'anime pray bless',
  amaldicoar: 'anime curse dark',
};

// Bordas visuais
const B = {
  love:  { t: '╔══ ˚₊‧ 💕 ‧₊˚ ══╗', b: '╚══════════════════╝' },
  fight: { t: '╔══ ˚₊‧ ⚔️  ‧₊˚ ══╗', b: '╚══════════════════╝' },
  fun:   { t: '╔══ ˚₊‧ ✨ ‧₊˚ ══╗', b: '╚══════════════════╝' },
  dark:  { t: '╔══ ˚₊‧ 💀 ‧₊˚ ══╗', b: '╚══════════════════╝' },
};

/**
 * Factory de comandos de ação social (com GIF + dano de HP)
 */
function action({ name, emoji, verbs, soloVerbs = ['está sozinho 🥲'], damage = 0, cat = 'fun', gif = null }) {
  return async ({ sock, msg, ctx }) => {
    const targets = getMentions(msg);
    const sender = ctx.senderJid;
    const border = B[cat] || B.fun;
    const gifKey = gif || name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, '').toLowerCase();
    const tenorQuery = GIF_QUERIES[gifKey] || null;

    // Sem alvo — mensagem solo
    if (!targets.length) {
      const text = `${border.t}\n║ ${emoji} ⌁ *${name.toUpperCase()}*\n║\n║ @${sender.split('@')[0]} ${pick(soloVerbs)}\n${border.b}`;
      return sendWithGif(sock, msg, ctx, text, [sender], tenorQuery);
    }

    const target = targets[0];
    if (target === sender) {
      return sock.sendMessage(ctx.remoteJid, {
        text: `${border.t}\n║ 🤡 @${sender.split('@')[0]} tentou\n║ ${name} a si mesmo... 💀\n${border.b}`,
        mentions: [sender],
      }, { quoted: msg });
    }

    const verb = pick(verbs);
    let hpLine = '';
    if (damage > 0 && Math.random() > 0.4) {
      try {
        const eco = await Economy.getOrCreate(target.split('@')[0]);
        eco.hp = Math.max(0, eco.hp - damage);
        await eco.save();
        const filled = Math.floor(eco.hp / eco.maxHp * 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        hpLine = `\n║\n║ ❤️ HP: [${bar}] ${eco.hp}/${eco.maxHp}`;
        if (eco.hp === 0) hpLine += `\n║ ☠️ *DESMAIOU!* Use !heal`;
      } catch (e) {}
    }

    const text = `${border.t}\n║ ${emoji} ⌁ *${name.toUpperCase()}*\n║\n║ @${sender.split('@')[0]}\n║ ${verb}\n║ @${target.split('@')[0]}${hpLine}\n${border.b}`;
    return sendWithGif(sock, msg, ctx, text, [sender, target], tenorQuery);
  };
}

/**
 * Factory de comandos percentuais — agora com GIF também!
 */
function percentage({ name, emoji, adj, gifQuery }) {
  return async ({ sock, msg, ctx }) => {
    const targets = getMentions(msg);
    const target = targets[0] || ctx.senderJid;
    const pct = randInt(0, 100);
    const filled = Math.floor(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const reaction = pct >= 80 ? '🔥 *NÍVEL MÁXIMO!*' : pct >= 50 ? '😏 *Considerável...*' : pct >= 20 ? '😐 *Hmm...*' : '🤷 *Quase nada*';
    const text = `╔══ ˚₊‧ ${emoji} ‧₊˚ ══╗\n║ 📊 *MEDIDOR DE ${name.toUpperCase()}*\n║\n║ 👤 @${target.split('@')[0]}\n║ ${emoji} ${adj}: *${pct}%*\n║ ┃${bar}┃\n║\n║ ${reaction}\n╚══════════════════╝`;
    return sendWithGif(sock, msg, ctx, text, [target], gifQuery || null);
  };
}

module.exports = {
  // ═══ AMOR / CARINHO ═══
  abracar: action({ name: 'abraçar', emoji: '🤗', cat: 'love', gif: 'abracar',
    verbs: ['deu um abraço apertado em', 'envolveu carinhosamente', 'esmagou de carinho'],
    soloVerbs: ['precisa de um abraço 🥺'] }),
  beijar: action({ name: 'beijar', emoji: '💋', cat: 'love', gif: 'beijar',
    verbs: ['deu um beijão em', 'roubou um beijo de', 'beijou apaixonadamente'],
    soloVerbs: ['tá precisando de carinho 💋'] }),
  cafune: action({ name: 'fazer cafuné', emoji: '🥰', cat: 'love', gif: 'cafune',
    verbs: ['fez cafuné em', 'acariciou a cabecinha de', 'mimou com carinho'] }),
  declarar: action({ name: 'declarar amor', emoji: '💌', cat: 'love', gif: 'declarar',
    verbs: ['se declarou para', 'mandou carta de amor para', 'jurou amor eterno a'] }),
  flertar: action({ name: 'flertar', emoji: '😏', cat: 'love', gif: 'flertar',
    verbs: ['deu uma piscadinha para', 'flertou descaradamente com', 'mandou olhar 43 para'] }),
  paparico: action({ name: 'paparicar', emoji: '✨', cat: 'love', gif: 'paparico',
    verbs: ['paparicou', 'mimou demais', 'tratou como realeza'] }),

  // ═══ VIOLÊNCIA (com GIF + dano HP) ═══
  tapa: action({ name: 'dar tapa', emoji: '👋', cat: 'fight', gif: 'tapa',
    verbs: ['deu um TAPA na cara de', 'mandou um chinelão em', 'estalou a mão em'], damage: 5 }),
  soco: action({ name: 'dar soco', emoji: '👊', cat: 'fight', gif: 'soco',
    verbs: ['deu um SOCO em', 'mandou um direto em', 'acertou um cruzado em'], damage: 10 }),
  chute: action({ name: 'dar chute', emoji: '🦵', cat: 'fight', gif: 'chute',
    verbs: ['deu uma VOADORA em', 'chutou com tudo', 'mandou um roundhouse kick em'], damage: 8 }),
  tiro: action({ name: 'atirar', emoji: '🔫', cat: 'dark', gif: 'tiro',
    verbs: ['deu um TIRO em', 'metralhou', 'atirou pra matar em'], damage: 25 }),
  facada: action({ name: 'esfaquear', emoji: '🔪', cat: 'dark', gif: 'facada',
    verbs: ['deu uma FACADA em', 'esfaqueou pelas costas', 'cortou'], damage: 20 }),
  matar: action({ name: 'matar', emoji: '💀', cat: 'dark', gif: 'matar',
    verbs: ['MATOU', 'eliminou', 'despachou', 'mandou pro além'], damage: 50 }),
  bater: action({ name: 'bater', emoji: '🤜', cat: 'fight', gif: 'bater',
    verbs: ['bateu em', 'deu porrada em', 'surrou'], damage: 7 }),
  morder: action({ name: 'morder', emoji: '🧛', cat: 'fight', gif: 'morder',
    verbs: ['mordeu', 'cravou os dentes em', 'deu uma mordida vampírica em'], damage: 6 }),
  cuspir: action({ name: 'cuspir', emoji: '💦', cat: 'fight', gif: 'cuspir',
    verbs: ['cuspiu em', 'mandou um cuspe em', 'acertou um molhado em'], damage: 2 }),
  empurrar: action({ name: 'empurrar', emoji: '🫸', cat: 'fight', gif: 'empurrar',
    verbs: ['empurrou', 'jogou no chão', 'derrubou'], damage: 4 }),
  envenenar: action({ name: 'envenenar', emoji: '☠️', cat: 'dark', gif: 'envenenar',
    verbs: ['envenenou', 'colocou veneno na comida de', 'drogou'], damage: 30 }),
  espancar: action({ name: 'espancar', emoji: '💥', cat: 'dark', gif: 'espancar',
    verbs: ['espancou', 'deu uma surra em', 'acabou com'], damage: 15 }),
  bullying: action({ name: 'fazer bullying', emoji: '🫵', cat: 'fight', gif: 'bullying',
    verbs: ['fez bullying com', 'zoou', 'humilhou publicamente'], damage: 3 }),

  // ═══ GERAL / FUN ═══
  mimimi: action({ name: 'mimimi', emoji: '😭', cat: 'fun', gif: 'mimimi',
    verbs: ['fez mimimi pra', 'chorou no colo de', 'reclamou pra'],
    soloVerbs: ['tá fazendo mimimi sozinho 😭'] }),
  fofocar: action({ name: 'fofocar', emoji: '🗣️', cat: 'fun', gif: 'fofocar',
    verbs: ['fofocou sobre', 'espalhou rumores de', 'contou o segredo de'] }),
  acordar: action({ name: 'acordar', emoji: '⏰', cat: 'fun', gif: 'acordar',
    verbs: ['acordou', 'jogou água gelada em', 'gritou no ouvido de'] }),
  cuidar: action({ name: 'cuidar', emoji: '🩹', cat: 'love', gif: 'cuidar',
    verbs: ['cuidou de', 'fez curativo em', 'tratou com carinho'] }),
  bencao: action({ name: 'abençoar', emoji: '🙏', cat: 'love', gif: 'bencao',
    verbs: ['abençoou', 'mandou bênçãos para', 'orou por'] }),
  amaldicoar: action({ name: 'amaldiçoar', emoji: '🧿', cat: 'dark', gif: 'amaldicoar',
    verbs: ['amaldiçoou', 'rogou praga em', 'lançou maldição em'], damage: 15 }),
  dancar: action({ name: 'dançar', emoji: '💃', cat: 'fun', gif: 'dancar',
    verbs: ['dançou com', 'chamou pra dançar', 'fez um passinho com'],
    soloVerbs: ['tá dançando sozinho 💃🕺'] }),

  // ═══ PERCENTUAIS — com GIF! ═══
  gay:      percentage({ name: 'GAY',       emoji: '🏳️‍🌈', adj: 'Gay',       gifQuery: 'anime rainbow happy' }),
  lindo:    percentage({ name: 'BELEZA',    emoji: '✨',    adj: 'Lindo(a)',   gifQuery: 'anime sparkle beautiful' }),
  feio:     percentage({ name: 'FEIÚRA',    emoji: '🤢',    adj: 'Feio(a)',    gifQuery: 'anime disgust face' }),
  burro:    percentage({ name: 'BURRICE',   emoji: '🧠',    adj: 'Burro(a)',   gifQuery: 'anime confused dumb' }),
  corno:    percentage({ name: 'CHIFRES',   emoji: '🦌',    adj: 'Corno(a)',   gifQuery: 'anime sad betrayal' }),
  rico:     percentage({ name: 'RIQUEZA',   emoji: '💰',    adj: 'Rico(a)',    gifQuery: 'anime money rich' }),
  safado:   percentage({ name: 'SAFADEZA',  emoji: '🔥',    adj: 'Safado(a)', gifQuery: 'anime wink smirk' }),
  doido:    percentage({ name: 'LOUCURA',   emoji: '🤪',    adj: 'Doido(a)',  gifQuery: 'anime crazy wild' }),
  gostoso:  percentage({ name: 'GOSTOSURA', emoji: '🥵',    adj: 'Gostoso(a)',gifQuery: 'anime hot attractive' }),
  malucao:  percentage({ name: 'MALUQUICE', emoji: '🃏',    adj: 'Malucão',   gifQuery: 'anime joker laugh' }),
};
