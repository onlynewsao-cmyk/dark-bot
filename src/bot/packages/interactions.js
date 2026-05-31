/**
 * Pacote de INTERAÇÕES v3.0 — GIFs animados via API + visual premium
 * APIs: nekos.life (anime GIFs) + Tenor fallback
 */
const Economy = require('../../database/models/Economy');
const { execSync } = require('child_process');

function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// GIF API — nekos.life (funciona sem key)
const NEKOS_API = 'https://nekos.life/api/v2/img';
const NEKOS_MAP = {
  abracar: 'hug', beijar: 'kiss', tapa: 'slap', cafune: 'pat',
  acariciar: 'cuddle', cócegas: 'tickle', alimentar: 'feed', convencido: 'smug',
};

// Fallback GIFs (Tenor URLs diretas) para ações sem API
const TENOR_GIFS = {
  soco: ['https://media.tenor.com/x2dBQftJ2nYAAAAC/anime-punch.gif', 'https://media.tenor.com/tGEL1VPA7tYAAAAC/punch-anime.gif'],
  morder: ['https://media.tenor.com/r2TaI3tVG-oAAAAC/anime-bite.gif', 'https://media.tenor.com/4JhLF98YwPkAAAAC/anime-bite.gif'],
  chorar: ['https://media.tenor.com/9hPBgvnUqEAAAAAC/anime-cry.gif', 'https://media.tenor.com/PmLQNPuGjGMAAAAC/anime-cry.gif'],
  dancar: ['https://media.tenor.com/S_NReBxEpOsAAAAC/anime-dance.gif', 'https://media.tenor.com/rM9Oa-EVpjwAAAAC/dance-anime.gif'],
  matar: ['https://media.tenor.com/WBdHYDwAKEkAAAAC/anime-kill.gif', 'https://media.tenor.com/0qj5OEsBfp0AAAAC/die-anime.gif'],
  chute: ['https://media.tenor.com/cNJ-ZsYVpjAAAAAC/anime-kick.gif'],
  tiro: ['https://media.tenor.com/7c8G_f1GmXgAAAAC/anime-gun.gif'],
  facada: ['https://media.tenor.com/P0DXnWYMaVUAAAAC/knife-anime.gif'],
  empurrar: ['https://media.tenor.com/ZTLBz6xIslsAAAAC/anime-push.gif'],
  espancar: ['https://media.tenor.com/xFlh0-GKMLAAAAAC/anime-fight.gif'],
  cuspir: ['https://media.tenor.com/3cKqx_g2C1wAAAAC/anime-spit.gif'],
  envenenar: ['https://media.tenor.com/WBdHYDwAKEkAAAAC/anime-kill.gif'],
  fofocar: ['https://media.tenor.com/WwXgKGKqeAYAAAAC/whisper-anime.gif'],
  acordar: ['https://media.tenor.com/4jF1N4P6QVAAAAAC/anime-wake-up.gif'],
  mimimi: ['https://media.tenor.com/PmLQNPuGjGMAAAAC/anime-cry.gif'],
  declarar: ['https://media.tenor.com/uncTnDmtnsgAAAAC/couple-kiss.gif'],
  flertar: ['https://media.tenor.com/oUulxJhMn0oAAAAC/anime-wink.gif'],
  paparico: ['https://media.tenor.com/3PXxC6VGl-cAAAAC/pat-head.gif'],
  bencao: ['https://media.tenor.com/0h3oZr2X7loAAAAC/anime-pray.gif'],
  amaldicoar: ['https://media.tenor.com/WBdHYDwAKEkAAAAC/anime-kill.gif'],
  cuidar: ['https://media.tenor.com/3PXxC6VGl-cAAAAC/pat-head.gif'],
  bullying: ['https://media.tenor.com/3cKqx_g2C1wAAAAC/anime-spit.gif'],
};

/**
 * Busca GIF da API nekos.life ou fallback Tenor
 */
async function fetchGif(actionName) {
  // Tenta nekos.life primeiro
  const nekosEndpoint = NEKOS_MAP[actionName];
  if (nekosEndpoint) {
    try {
      const json = execSync(`curl -sL "${NEKOS_API}/${nekosEndpoint}" --max-time 5`, { timeout: 8000 }).toString();
      const data = JSON.parse(json);
      if (data.url) return data.url;
    } catch (e) {}
  }
  // Fallback: Tenor hardcoded
  const tenorGifs = TENOR_GIFS[actionName];
  if (tenorGifs?.length) return pick(tenorGifs);
  return null;
}

/**
 * Envia mensagem com GIF (fallback texto puro)
 */
async function sendWithGif(sock, msg, ctx, text, mentions, actionName) {
  try {
    const gifUrl = await fetchGif(actionName);
    if (gifUrl) {
      const mediaHandler = require('../mediaHandler');
      const buf = await mediaHandler.fetchBuffer(gifUrl);
      return sock.sendMessage(ctx.remoteJid, {
        video: buf, gifPlayback: true, caption: text, mentions,
      }, { quoted: msg });
    }
  } catch (e) {}
  // Fallback: texto puro
  return sock.sendMessage(ctx.remoteJid, { text, mentions }, { quoted: msg });
}

// Bordas visuais por categoria
const B = {
  love: { t: '╔══ ˚₊‧ 💕 ‧₊˚ ══╗', b: '╚══════════════════╝' },
  fight: { t: '╔══ ˚₊‧ ⚔️ ‧₊˚ ══╗', b: '╚══════════════════╝' },
  fun: { t: '╔══ ˚₊‧ ✨ ‧₊˚ ══╗', b: '╚══════════════════╝' },
  dark: { t: '╔══ ˚₊‧ 💀 ‧₊˚ ══╗', b: '╚══════════════════╝' },
};

/**
 * Cria comando de ação social com GIF + visual
 */
function action({ name, emoji, verbs, soloVerbs = ['está sozinho 🥲'], damage = 0, cat = 'fun', gif = null }) {
  return async ({ sock, msg, ctx }) => {
    const targets = getMentions(msg);
    const sender = ctx.senderJid;
    const border = B[cat] || B.fun;
    const gifName = gif || name.replace(/\s/g, '').toLowerCase();

    if (!targets.length) {
      const text = `${border.t}\n║ ${emoji} ⌁ *${name.toUpperCase()}*\n║\n║ @${sender.split('@')[0]} ${pick(soloVerbs)}\n${border.b}`;
      return sendWithGif(sock, msg, ctx, text, [sender], gifName);
    }

    const target = targets[0];
    if (target === sender) {
      return sock.sendMessage(ctx.remoteJid, {
        text: `${border.t}\n║ 🤡 @${sender.split('@')[0]} tentou\n║ ${name} a si mesmo... 💀\n${border.b}`, mentions: [sender],
      }, { quoted: msg });
    }

    const verb = pick(verbs);
    let hpLine = '';
    if (damage > 0 && Math.random() > 0.4) {
      try {
        const eco = await Economy.getOrCreate(target.split('@')[0]);
        eco.hp = Math.max(0, eco.hp - damage);
        await eco.save();
        const bar = '█'.repeat(Math.floor(eco.hp / eco.maxHp * 10)) + '░'.repeat(10 - Math.floor(eco.hp / eco.maxHp * 10));
        hpLine = `\n║\n║ ❤️ HP: [${bar}] ${eco.hp}/${eco.maxHp}`;
        if (eco.hp === 0) hpLine += `\n║ ☠️ *DESMAIOU!* Use !heal`;
      } catch (e) {}
    }

    const text = `${border.t}\n║ ${emoji} ⌁ *${name.toUpperCase()}*\n║\n║ @${sender.split('@')[0]}\n║ ${verb}\n║ @${target.split('@')[0]}${hpLine}\n${border.b}`;

    await sendWithGif(sock, msg, ctx, text, [sender, target], gifName);
  };
}

/**
 * Comando percentual com visual
 */
function percentage({ name, emoji, adj }) {
  return async ({ sock, msg, ctx }) => {
    const targets = getMentions(msg);
    const target = targets[0] || ctx.senderJid;
    const pct = randInt(0, 100);
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    let react = pct >= 80 ? '🔥 *NÍVEL MÁXIMO!*' : pct >= 50 ? '😏 *Considerável...*' : pct >= 20 ? '😐 *Hmm...*' : '🤷 *Quase nada*';

    const text = `╔══ ˚₊‧ ${emoji} ‧₊˚ ══╗\n║ 📊 *MEDIDOR DE ${name.toUpperCase()}*\n║\n║ 👤 @${target.split('@')[0]}\n║ ${emoji} ${adj}: *${pct}%*\n║ ┃${bar}┃\n║\n║ ${react}\n╚══════════════════╝`;
    await sock.sendMessage(ctx.remoteJid, { text, mentions: [target] }, { quoted: msg });
  };
}

module.exports = {
  // ═══ AMOR / CARINHO (com GIF nekos.life) ═══
  abracar: action({ name: 'abraçar', emoji: '🤗', cat: 'love', gif: 'abracar',
    verbs: ['deu um abraço apertado em', 'envolveu carinhosamente', 'esmagou de carinho'],
    soloVerbs: ['precisa de um abraço 🥺'], }),
  beijar: action({ name: 'beijar', emoji: '💋', cat: 'love', gif: 'beijar',
    verbs: ['deu um beijão em', 'roubou um beijo de', 'beijou apaixonadamente'],
    soloVerbs: ['tá precisando de carinho 💋'], }),
  cafune: action({ name: 'fazer cafuné', emoji: '🥰', cat: 'love', gif: 'cafune',
    verbs: ['fez cafuné em', 'acariciou a cabecinha de', 'mimou com carinho'], }),
  declarar: action({ name: 'declarar amor', emoji: '💌', cat: 'love', gif: 'declarar',
    verbs: ['se declarou para', 'mandou carta de amor para', 'jurou amor eterno a'], }),
  flertar: action({ name: 'flertar', emoji: '😏', cat: 'love', gif: 'flertar',
    verbs: ['deu uma piscadinha para', 'flertou descaradamente com', 'mandou olhar 43 para'], }),
  paparico: action({ name: 'paparicar', emoji: '✨', cat: 'love', gif: 'paparico',
    verbs: ['paparicou', 'mimou demais', 'tratou como realeza'], }),

  // ═══ VIOLÊNCIA (com GIF + HP) ═══
  tapa: action({ name: 'dar tapa', emoji: '👋', cat: 'fight', gif: 'tapa',
    verbs: ['deu um TAPA na cara de', 'mandou um chinelão em', 'estalou a mão em'], damage: 5, }),
  soco: action({ name: 'dar soco', emoji: '👊', cat: 'fight', gif: 'soco',
    verbs: ['deu um SOCO em', 'mandou um direto em', 'acertou um cruzado em'], damage: 10, }),
  chute: action({ name: 'dar chute', emoji: '🦵', cat: 'fight', gif: 'chute',
    verbs: ['deu uma VOADORA em', 'chutou com tudo', 'mandou um roundhouse kick em'], damage: 8, }),
  tiro: action({ name: 'atirar', emoji: '🔫', cat: 'dark', gif: 'tiro',
    verbs: ['deu um TIRO em', 'metralhou', 'atirou pra matar em'], damage: 25, }),
  facada: action({ name: 'esfaquear', emoji: '🔪', cat: 'dark', gif: 'facada',
    verbs: ['deu uma FACADA em', 'esfaqueou pelas costas', 'cortou'], damage: 20, }),
  matar: action({ name: 'matar', emoji: '💀', cat: 'dark', gif: 'matar',
    verbs: ['MATOU', 'eliminou', 'despachou', 'mandou pro além'], damage: 50, }),
  bater: action({ name: 'bater', emoji: '🤜', cat: 'fight', gif: 'soco',
    verbs: ['bateu em', 'deu porrada em', 'surrou'], damage: 7, }),
  morder: action({ name: 'morder', emoji: '🧛', cat: 'fight', gif: 'morder',
    verbs: ['mordeu', 'cravou os dentes em', 'deu uma mordida vampírica em'], damage: 6, }),
  cuspir: action({ name: 'cuspir', emoji: '💦', cat: 'fight', gif: 'cuspir',
    verbs: ['cuspiu em', 'mandou um cuspe em', 'acertou um molhado em'], damage: 2, }),
  empurrar: action({ name: 'empurrar', emoji: '🫸', cat: 'fight', gif: 'empurrar',
    verbs: ['empurrou', 'jogou no chão', 'derrubou'], damage: 4, }),
  envenenar: action({ name: 'envenenar', emoji: '☠️', cat: 'dark', gif: 'envenenar',
    verbs: ['envenenou', 'colocou veneno na comida de', 'drogou'], damage: 30, }),
  espancar: action({ name: 'espancar', emoji: '💥', cat: 'dark', gif: 'espancar',
    verbs: ['espancou', 'deu uma surra em', 'acabou com'], damage: 15, }),
  bullying: action({ name: 'fazer bullying', emoji: '🫵', cat: 'fight', gif: 'bullying',
    verbs: ['fez bullying com', 'zoou', 'humilhou publicamente'], damage: 3, }),

  // ═══ GERAL / FUN ═══
  mimimi: action({ name: 'mimimi', emoji: '😭', cat: 'fun', gif: 'mimimi',
    verbs: ['fez mimimi pra', 'chorou no colo de', 'reclamou pra'],
    soloVerbs: ['tá fazendo mimimi sozinho 😭'], }),
  fofocar: action({ name: 'fofocar', emoji: '🗣️', cat: 'fun', gif: 'fofocar',
    verbs: ['fofocou sobre', 'espalhou rumores de', 'contou o segredo de'], }),
  acordar: action({ name: 'acordar', emoji: '⏰', cat: 'fun', gif: 'acordar',
    verbs: ['acordou', 'jogou água gelada em', 'gritou no ouvido de'], }),
  cuidar: action({ name: 'cuidar', emoji: '🩹', cat: 'love', gif: 'cuidar',
    verbs: ['cuidou de', 'fez curativo em', 'tratou com carinho'], }),
  bencao: action({ name: 'abençoar', emoji: '🙏', cat: 'love', gif: 'bencao',
    verbs: ['abençoou', 'mandou bênçãos para', 'orou por'], }),
  amaldicoar: action({ name: 'amaldiçoar', emoji: '🧿', cat: 'dark', gif: 'amaldicoar',
    verbs: ['amaldiçoou', 'rogou praga em', 'lançou maldição em'], damage: 15, }),
  dancar: action({ name: 'dançar', emoji: '💃', cat: 'fun', gif: 'dancar',
    verbs: ['dançou com', 'chamou pra dançar', 'fez um passinho com'],
    soloVerbs: ['tá dançando sozinho 💃🕺'], }),

  // ═══ PERCENTUAIS ═══
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
