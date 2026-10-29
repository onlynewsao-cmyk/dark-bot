'use strict';

/**
 * Repertório contextual de reacções da AURA.
 *
 * Não escolhe um emoji Unicode ao acaso: usa um catálogo amplo, organizado
 * por assunto/intenção, e adapta o tom ao humor ficcional da persona. O
 * humor é apenas estilo de escrita — não afirma sentimentos humanos reais.
 *
 * O catálogo é deliberadamente curado (e não a lista inteira de Unicode):
 * reacções têm de ser legíveis, adequadas ao contexto e válidas como um só
 * emoji no WhatsApp.
 */

const POOLS = Object.freeze({
  laughter: [
    '😂', '🤣', '😆', '😹', '😄', '😁', '😅', '🤭', '😜', '🤪', '🙃', '💀', '😭',
    '😛', '😝', '🥲', '🫠', '😎', '👻', '🫣', '😏', '😺', '😸', '😻', '😹',
  ],
  affection: [
    '🖤', '💜', '❤️', '🩷', '💗', '💖', '💕', '💞', '💘', '💝', '💟', '🫶',
    '🌹', '🫂', '🫰', '💌', '🤍', '💐', '😊', '🕊️', '🪷', '✨', '🌻', '🤝',
  ],
  celebration: [
    '🎉', '🎊', '🥳', '🎈', '🎁', '🏆', '🥇', '🥈', '🪩', '✨', '🎆', '🎇',
    '🍾', '🥂', '👏', '🙌', '💃', '🕺', '🌟', '🎀', '🎖️', '🏅', '🎂', '🪅',
    '🥁', '🎤', '💫', '🌈', '🚀', '💥',
  ],
  approval: [
    '👍', '👌', '🤝', '✅', '💯', '🙌', '👏', '🫡', '💪', '🔥', '⭐', '🌟',
    '💡', '🆗', '🤌', '🫰', '🧠', '🚀', '⚡', '🎯', '🥇', '🆙', '📈', '🔝',
    '✨', '😎', '✔️', '☑️', '🏆', '🙆', '🤜', '🤛', '🫶', '💜',
  ],
  empathy: [
    '🫂', '🤍', '🩹', '❤️‍🩹', '🫶', '🥺', '😔', '🤗', '💜', '🕊️', '🌧️', '🌿',
    '✨', '🧸', '🪷', '🫧', '🙏', '😢', '🥲', '💐', '☀️', '🫀', '🩷', '🪽',
  ],
  sadness: [
    '🥺', '😔', '😢', '😭', '☹️', '🙁', '😞', '😟', '😣', '😫', '😩', '💔',
    '🖤', '🥲', '🫠', '🌧️', '🕯️', '🥀', '🫂', '🩹', '🤍', '🌫️', '😿', '🫥',
  ],
  frustration: [
    '😒', '🙄', '😤', '😑', '🤨', '🫤', '🫠', '👀', '😮‍💨', '😬', '🤦', '👎',
    '💢', '😠', '🗯️', '🛑', '⚠️', '🙃', '🫣', '🤷', '😓', '😵‍💫', '🫡', '🖤',
  ],
  anger: [
    '😒', '🙄', '😤', '😑', '🤨', '🫤', '😮‍💨', '👀', '👎', '🛑', '⚠️', '🚫',
    '💢', '🗯️', '🤦', '🤷', '🫠', '🖤', '🫡', '⛔', '🔕', '🧯', '😬', '🚧',
  ],
  surprise: [
    '😮', '😯', '😲', '😳', '🤯', '😱', '🫢', '😧', '😦', '🫨', '🤩', '👀',
    '‼️', '⁉️', '🫣', '🙀', '😵', '💥', '⚡', '✨', '😵‍💫', '🤭', '🫡', '🌀',
  ],
  thinking: [
    '🤔', '🧐', '🤨', '💭', '🧠', '❓', '❔', '⁉️', '🫤', '🤷', '🫢', '👀',
    '🔍', '🕵️', '📚', '🗝️', '🧩', '💡', '🧮', '🫡', '🗯️', '📝', '🎓', '🧐',
  ],
  greeting: [
    '👋', '🙋', '😊', '🙂', '😄', '🤗', '🫡', '✌️', '🖤', '✨', '🌞', '🌤️',
    '🤝', '👀', '🙌', '💜', '💬', '🫶', '🫰', '🌻', '🪷', '🌈', '⭐', '🪽',
  ],
  sleepy: [
    '😴', '🥱', '😪', '💤', '🌙', '🌚', '🌛', '🌜', '🌝', '😮‍💨', '🛌', '🕯️',
    '☕', '🫠', '😵‍💫', '💭', '🌌', '⭐', '🦉', '🧸', '🌃', '🛏️', '🫧', '😌',
  ],
  playful: [
    '😏', '😉', '😜', '😝', '🤪', '🙃', '😈', '👻', '💀', '🤭', '🫣', '🥸',
    '🕶️', '🫡', '✨', '🪄', '🎭', '🃏', '👀', '🫰', '😼', '🦇', '🕸️', '🖤',
  ],
  music: [
    '🎵', '🎶', '🎧', '🎤', '🎙️', '🎸', '🎹', '🥁', '🪘', '🎺', '🎻', '🪕',
    '🪇', '💿', '📀', '🎼', '🎚️', '🎛️', '🪩', '🔊', '🎷', '🪗', '🎶', '🎵',
  ],
  food: [
    '🍕', '🍔', '🍟', '🍗', '🥩', '🍣', '🍜', '🍝', '🍚', '🍲', '🥘', '🍳',
    '🥚', '🥑', '🍅', '🍓', '🍉', '🍍', '🍫', '🍩', '🍰', '🧁', '🍪', '☕',
    '🧋', '🥤', '🫖', '🍹', '🍷', '🧀', '🥐', '🥞', '🍿', '🌮', '🌯', '🥗',
    '🍇', '🍒', '🍌', '🥭', '🍦', '🍬', '🍯', '🥨', '🧃', '🫕',
  ],
  animals: [
    '🐈', '🐈‍⬛', '🐕', '🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐰',
    '🐻', '🐻‍❄️', '🦄', '🐴', '🐬', '🦈', '🐢', '🦋', '🦉', '🐥', '🐧', '🐝',
    '🦇', '🦖', '🐉', '🦜', '🦩', '🦦', '🦔', '🦥', '🦋', '🐙', '🦕', '🦚',
    '🦌', '🐺', '🦭', '🐳', '🦆', '🐣', '🦎', '🦂', '🐞', '🐌', '🦀', '🐠',
  ],
  nature: [
    '🌹', '🌷', '🌻', '🌺', '🪷', '🌿', '🌱', '🍀', '🍄', '🌳', '🌴', '🌵',
    '🌾', '🌈', '🌧️', '⛈️', '☀️', '🌤️', '🌙', '⭐', '🌌', '🌊', '🔥', '❄️',
    '🌬️', '🪴', '🌼', '💐', '🦋', '🐝', '🍁', '🍂', '🍃', '🌲', '🌸', '🪻',
    '🪺', '🌎', '🌍', '🌏', '🌕', '🌑', '🌠', '🪨', '🌱', '🌳', '🌰', '🪵',
  ],
  weather: [
    '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️',
    '🌪️', '🌫️', '🌈', '🌬️', '💨', '☔', '⚡', '🌡️', '🔥', '🧊', '🌊', '🌙',
  ],
  travel: [
    '🚗', '🚕', '🚌', '🚎', '🏎️', '🚲', '🏍️', '🚂', '✈️', '🛫', '🛬', '🚀',
    '🛸', '🗺️', '🧭', '⛵', '🚤', '🛳️', '🏝️', '🏖️', '⛰️', '🏕️', '🌍', '🌏',
    '🌆', '🌃', '🚁', '🚄', '🚅', '🚆', '🚇', '🚉', '🚢', '🛶', '🗽', '🗼',
    '🏰', '🏟️', '🏜️', '🌋', '🛣️', '🛤️', '⛽', '🧳', '🎒', '🏠', '🏙️', '🌉',
  ],
  sports: [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🏐', '🏉', '🎾', '🏸', '🏓', '🥊', '🥋',
    '⛹️', '🏋️', '🏆', '🥇', '🏃', '🚴', '🧗', '🤸', '🎯', '💪', '🏄', '🏊',
    '🎿', '🏒', '🏑', '🥌', '🏹', '🤺', '🥅', '🏅', '🏋️‍♀️', '🏋️‍♂️', '🛹', '🛼',
    '🤾', '🧘', '🏇', '🏌️', '🚣', '🥏', '🏓', '🎳', '🏸', '⛷️',
  ],
  work: [
    '💻', '🖥️', '⌨️', '🖱️', '📱', '📞', '📚', '📖', '📝', '📌', '📎', '🗂️',
    '📊', '📈', '🧮', '🔧', '🛠️', '⚙️', '💡', '🧠', '🤖', '🕹️', '🔋', '🔌',
    '🔑', '🎓', '🗃️', '📅', '🗓️', '📇', '📋', '🖊️', '✏️', '📏', '📐', '🗒️',
    '💼', '🪪', '🏢', '🏫', '🏭', '🧑‍💻', '🧑‍🎓', '🧑‍🏫', '🎨', '🧪',
  ],
  money: [
    '💸', '💵', '💴', '💶', '💷', '💰', '🪙', '💳', '🏦', '📈', '📉', '🧾',
    '🤑', '🔒', '💎', '🎁', '🏆', '💲', '💹', '🧮', '🪙', '🏧', '🛒', '🛍️',
    '💱', '🧺', '📊', '🪪', '⚖️', '🧾', '💳', '🏷️',
  ],
  tech: [
    '🤖', '💻', '📱', '🖥️', '⌨️', '🖱️', '📡', '📶', '🔋', '🔌', '⚙️', '🛠️',
    '🕹️', '🎮', '💾', '💿', '🌐', '🔗', '🔒', '🧠', '🛰️', '🧬', '🧪', '📲',
    '🧑‍💻', '🖨️', '🗜️', '📷', '🎥', '🔍', '🧯', '🧰', '🔧', '🔩', '🪛', '🪫',
  ],
  gaming: [
    '🎮', '🕹️', '👾', '🎲', '🧩', '🏆', '🥇', '🧙', '🧝', '🧛', '🧟', '🦸',
    '🦹', '🗡️', '🛡️', '⚔️', '🏹', '💎', '🪙', '💥', '🚀', '👑', '🧠', '🔥',
    '🎯', '🪄', '🧪', '🗺️', '🧌', '🐉', '🧚', '🪓', '🧟‍♂️', '🧟‍♀️', '🧰', '🃏',
  ],
  beauty: [
    '💄', '💅', '🪞', '🧴', '🧖', '🧖‍♀️', '🧖‍♂️', '💇', '💇‍♀️', '💇‍♂️', '🧘',
    '👗', '👠', '👑', '💍', '💎', '👜', '👛', '🪮', '🧼', '🧽', '🌸', '✨',
    '💐', '🪷', '🧵', '🧶', '🪡', '🪢', '🧣', '🧥', '👟', '🧢', '🕶️', '🎀',
  ],
  neutral: [
    '👀', '🙂', '😌', '✨', '🫡', '💬', '🤔', '🌟', '💜', '🖤', '👋', '📍',
    '📌', '⭐', '🧩', '🪄', '🌀', '🫧', '🦋', '🕊️', '🫰', '🌙', '🤝', '💭',
    '🪷', '🫶', '🔮', '🪞', '🪽', '💫',
  ],
});

// “Humor” é um modificador de estilo da persona, não uma afirmação de
// emoção real. Em contextos sensíveis, usa apenas variantes de apoio.
const MOOD_POOLS = Object.freeze({
  normal: POOLS.neutral,
  feliz: ['😄', '😊', '🤩', '🌟', '✨', '🙌', '💜', '🫶', '😌', '🌞', '💫', '🎉', '🤍', '💖'],
  animada: ['🤩', '🔥', '⚡', '🙌', '👏', '🚀', '🎉', '🎊', '💃', '🪩', '💫', '🌟', '💪', '🥳'],
  triste: ['🥺', '😔', '😢', '🫂', '🤍', '💔', '🩹', '🥲', '🖤', '🌧️', '🕊️', '🫥'],
  com_raiva: ['😒', '🙄', '😤', '😑', '🤨', '🫤', '🫠', '😮‍💨', '💢', '🗯️', '🖤'],
  revoltada: ['😏', '😒', '🙄', '😤', '🤨', '🫠', '💢', '🖤', '👀', '🗯️'],
  cansada: ['😮‍💨', '🥱', '😪', '🫠', '☕', '🌙', '💤', '😑', '🧸', '🫧'],
  sonolenta: ['😴', '🥱', '💤', '🌙', '🌚', '🛌', '😪', '🌌', '🧸', '☕'],
  provocante: ['😏', '😉', '🫣', '😈', '😜', '🔥', '🫰', '🤭', '💜', '✨', '🦇', '🖤'],
});

const HUMORES_VALIDOS = new Set(Object.keys(MOOD_POOLS));
const SENSITIVE_THEMES = new Set(['empathy', 'sadness', 'frustration', 'anger']);
const MOOD_ACCENTS = Object.freeze({
  normal: [],
  feliz: ['😊', '😄', '🌟', '✨'],
  animada: ['🙌', '🔥', '✨', '🤩'],
  triste: ['🥺', '🥲', '😔', '🫠'],
  com_raiva: ['😒', '🙄', '🤨', '😤'],
  revoltada: ['😏', '🙄', '🫠', '🖤'],
  cansada: ['😮‍💨', '🫠', '☕', '🥱'],
  sonolenta: ['😴', '🥱', '💤', '🌙'],
  provocante: ['😏', '😉', '🤭', '🫣'],
});
const SENSITIVE_ACCENTS = Object.freeze({
  normal: ['🤍', '🫂', '✨'],
  feliz: ['🤍', '🫂', '🫶', '✨'],
  animada: ['🫂', '🫶', '🤍'],
  triste: ['🥺', '😔', '🫂', '🤍'],
  com_raiva: ['🤍', '🫂', '🩹'],
  revoltada: ['🫂', '🤍', '🩹'],
  cansada: ['🫂', '🤍', '🩹'],
  sonolenta: ['🤍', '🫂', '🩹'],
  provocante: ['🫶', '🖤', '🤍'],
});

const CONTEXT_RULES = [
  ['laughter', /\b(?:kk{2,}|rs{2,}|ha{2,}|he{2,}|lol|lmao|rofl)\b|\b(?:piada|engracad\w*|risad\w*|rir|rindo|comedia|meme|brincadeira)\b|😂|🤣|😹|😆|💀/u],
  ['affection', /\b(?:amo(?:-te)?|amor|saudad\w*|beij\w*|carinh\w*|adoro|love|fof[oa]|lind[oa]|querid[oa])\b|❤️|🩷|💜|🖤|😍|🥰|😘|💕|🫶|💋/u],
  ['empathy', /\b(?:sinto muito|lamento|meus sentimentos|forca|estou contigo|estou aqui|conta comigo|melhoras|condolencias|cuida de ti|vai ficar tudo bem)\b|🫂|🤍|🩹|❤️‍🩹|🙏/u],
  ['sadness', /\b(?:triste\w*|chatead\w*|deprimid\w*|sozinh\w*|solitari\w*|falhei|perdi|desisti|chor\w*|desgost\w*|acabou|partiu|faleceu|morreu|dor)\b|💔|😢|😭|🥺|😔|🥀/u],
  ['anger', /\b(?:raiva|zangad\w*|furios\w*|irritad\w*|odeio|odiei|revoltad\w*|que saco|maldit\w*|fdp)\b|😡|🤬|😠|💢|👿/u],
  ['frustration', /\b(?:frustrad\w*|cansad\w* disto|farto\w* disto|que seca|que chato|irritante|nao aguento|nao funciona|bugou|falhou)\b|🙄|😤|😒|😑|🫤/u],
  ['surprise', /\b(?:surpres\w*|serio|a serio|uau|wow|inacreditavel|nao acredito|como assim|caramba|meu deus|mds|choque|assustad\w*|impossivel)\b|😮|😲|😳|🤯|😱|🫢|⁉️|‼️/u],
  ['celebration', /\b(?:parabens|aniversari\w*|passei|consegui|venci|festa|casamento|sucesso|formatura|conquista|promocao|brinde|aprovad\w*|terminei|ganhei)\b|🎉|🎊|🥳|🎂|🏆|🥇|🍾/u],
  ['greeting', /^(?:\s*)(?:oi\b|ola\b|hey\b|eai\b|eae\b|salve\b|bom dia\b|boa tarde\b|boa noite\b|tudo bem\b|como vai\b)|\b(?:bem-vind[oa]|boas vindas)\b|👋|🙋/u],
  ['sleepy', /\b(?:sono|dormir|dormi|acordar|cansad\w*|descan\w*|madrugada|cochil\w*|noite)\b|😴|🥱|💤|🌙/u],
  ['playful', /\b(?:brincar|zoeira|zoar|maroto|marota|provocar|atrevid\w*|travessur\w*)\b|😏|😈|🤭|😜|🃏/u],
  ['approval', /\b(?:concordo|exato|exacto|verdade|top|boa|otim\w*|perfeit\w*|excelente|amei|gostei|bem feito|isso mesmo|correto|a[íi] sim|valeu|obrigad\w*|thanks|sim)\b|👍|👌|💯|✅|👏|🤝/u],
  ['thinking', /\b(?:porque|por que|como|achas|pensas|duvida|sera|ideia|explica|decidir|solucao|nao sei|o que|qual|quem)\b|\?+|🤔|🧐|❓|💭/u],
  ['food', /\b(?:comida|comer|fome|almoco|jantar|pequeno-almoco|pizza|hamburguer|lanche|bolo|doce|cafe|café|cha|chá|chocolate|fruta|arroz|funge|moamba|calulu|muamba|sushi|massa)\b|🍕|🍔|🍟|🍜|🍰|☕|🍫/u],
  ['music', /\b(?:musica|som|cantor\w*|cantora\w*|playlist|banda|show|concerto|album|beat|melodia|cantar|toc\w*|ouvir)\b|🎵|🎶|🎧|🎤|🎸|🎹/u],
  ['gaming', /\b(?:video game|videogame|playstation|ps[345]|xbox|nintendo|roblox|minecraft|free fire|fortnite|gamer|gameplay|level|boss final)\b|🎮|🕹️|👾|🎲/u],
  ['sports', /\b(?:futebol|bola|golo|gol|basquete|basket|nba|tenis|corrida|atletismo|boxe|volei|nadar|treino|maratona|campeonato|equipa|time)\b|⚽|🏀|🏈|🎾|🏆/u],
  ['animals', /\b(?:animal|gato|gata|gatinho|gatinha|cao|cachorro|cachorra|cachorrinho|cachorrinha|cavalo|passaro|p[aá]ssaro|peixe|coelho|cachorro|panda|macaco|leao|le[aã]o|tigre|borboleta|abelha|dinossauro)\b|🐱|🐶|🐈|🐕|🦊|🐼|🐸|🦋|🐬/u],
  ['travel', /\b(?:viajar|viagem|ferias|férias|passeio|praia|aviao|avião|carro|estrada|hotel|cidade|pais|pa[ií]s|mapa|mala|turismo|voo|cheguei|embarque)\b|✈️|🚗|🧳|🏝️|🏖️|🗺️/u],
  ['weather', /\b(?:calor|frio|chuva|chuver|tempo|clima|sol|nublado|tempestade|vento|neve|trovoada|relampago|relâmpago)\b|☀️|🌧️|⛈️|❄️|🌈/u],
  ['nature', /\b(?:flor|flores|planta|jardim|arvore|árvore|natureza|mar|rio|montanha|floresta|campo|lua|estrela|ceu|céu|por do sol|pôr do sol|universo|galaxia|galáxia)\b|🌹|🌷|🌳|🌊|🌿|🌌/u],
  ['work', /\b(?:trabalho|emprego|chefe|reuniao|reuni[aã]o|projeto|escola|aula|prova|exame|estudar|estudo|faculdade|curso|universidade|professor|professora|colega|escritorio|escritório|licao|lição)\b|💻|📚|📝|🎓|💼/u],
  ['money', /\b(?:dinheiro|salario|sal[aá]rio|pagar|pagamento|preco|preço|comprar|vender|venda|conta|economia|pix|saldo|desconto|caro|barato|lucro|custo|kwanza|kwanzas|dolar|dólar|euro)\b|💸|💵|💰|🪙|💳/u],
  ['tech', /\b(?:tecnologia|programar|programacao|programação|codigo|código|bug|aplicativo|app|telefone|computador|internet|wifi|wi-fi|bot|inteligencia artificial|ia|algoritmo|servidor|site|website|online|digital)\b|🤖|💻|📱|🌐|🧠|⚙️/u],
  ['beauty', /\b(?:maquiagem|maquilhar|cabelo|roupa|vestido|estilo|moda|unha|batom|beleza|elegante|look|perfume|sapato|tenis novo)\b|💄|💅|👗|👑|💍|✨/u],];

const _recentByChat = new Map();
const MAX_CHAT_HISTORY = 300;
const RECENT_WINDOW = 6;

function _normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function _humorValido(mood) {
  const m = String(mood || 'normal').toLowerCase().trim();
  return HUMORES_VALIDOS.has(m) ? m : 'normal';
}

function detectarTemas(texto) {
  const t = _normalizarTexto(texto);
  if (!t) return ['neutral'];
  const temas = [];
  for (const [tema, regra] of CONTEXT_RULES) {
    if (regra.test(t)) temas.push(tema);
  }
  return temas.length ? temas.slice(0, 2) : ['neutral'];
}

function poolPara(texto, mood = 'normal') {
  const temas = detectarTemas(texto);
  const m = _humorValido(mood);
  const temContexto = temas[0] !== 'neutral';
  const base = [...new Set(temas.flatMap(tema => POOLS[tema] || []))];
  const estilo = temContexto
    ? (SENSITIVE_THEMES.has(temas[0]) ? SENSITIVE_ACCENTS[m] : MOOD_ACCENTS[m])
    : MOOD_POOLS[m];
  return {
    temas,
    humor: m,
    contexto: base.length ? base : POOLS.neutral,
    estilo: [...new Set(estilo || [])],
  };
}

function _aleatorio(random) {
  try {
    const n = Number(random());
    if (Number.isFinite(n)) return Math.min(0.999999999, Math.max(0, n));
  } catch {}
  return Math.random();
}

function _selecionar(pool, chatId, random) {
  const lista = Array.isArray(pool) && pool.length ? pool : POOLS.neutral;
  let candidatos = lista;
  const chat = String(chatId || '');
  if (chat) {
    const anteriores = _recentByChat.get(chat) || [];
    const semRepetir = lista.filter(emoji => !anteriores.includes(emoji));
    if (semRepetir.length) candidatos = semRepetir;
  }
  const emoji = candidatos[Math.floor(_aleatorio(random) * candidatos.length)] || '👀';
  if (chat) {
    if (!_recentByChat.has(chat) && _recentByChat.size >= MAX_CHAT_HISTORY) {
      _recentByChat.delete(_recentByChat.keys().next().value);
    }
    const anteriores = _recentByChat.get(chat) || [];
    anteriores.push(emoji);
    _recentByChat.set(chat, anteriores.slice(-RECENT_WINDOW));
  }
  return emoji;
}

/**
 * Escolhe uma reacção: contexto primeiro, humor como variação de estilo.
 * Para mensagens sem tema evidente, o humor da persona pesa mais.
 *
 * @param {string} texto mensagem a que se reage
 * @param {{mood?:string, chatId?:string, random?:Function}} opcoes
 */
function escolherReacao(texto, opcoes = {}) {
  const opts = typeof opcoes === 'string' ? { mood: opcoes } : (opcoes || {});
  const random = typeof opts.random === 'function' ? opts.random : Math.random;
  const mood = _humorValido(opts.mood);
  const pools = poolPara(texto, mood);
  let pool;

  if (pools.temas[0] === 'neutral') {
    // Sem sinal semântico forte, deixa o humor actual da persona liderar.
    pool = _aleatorio(random) < 0.72 ? pools.estilo : pools.contexto;
  } else if (mood !== 'normal' && pools.estilo.length) {
    // Em mensagens com tema claro, a mensagem prevalece; o tom entra como
    // variação menos frequente. Temas sensíveis usam apenas acentos gentis.
    const pesoHumor = SENSITIVE_THEMES.has(pools.temas[0]) ? 0.18 : 0.26;
    pool = _aleatorio(random) < pesoHumor ? pools.estilo : pools.contexto;
  } else {
    pool = pools.contexto;
  }

  return _selecionar(pool, opts.chatId, random);
}

function catalogo() {
  return [...new Set([
    ...Object.values(POOLS).flat(),
    ...Object.values(MOOD_POOLS).flat(),
    ...Object.values(MOOD_ACCENTS).flat(),
    ...Object.values(SENSITIVE_ACCENTS).flat(),
  ])];
}

function limparHistorico(chatId) {
  if (chatId) _recentByChat.delete(String(chatId));
  else _recentByChat.clear();
}

module.exports = {
  escolherReacao,
  detectarTemas,
  poolPara,
  catalogo,
  limparHistorico,
  POOLS,
  MOOD_POOLS,
  _recentByChat,
};
