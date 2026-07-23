const botConfigCache = require('./botConfigCache');

const TIPS = [
  '⚡ DarkSide: foco, velocidade e presença.',
  '🌑 A sombra trabalha mesmo quando ninguém vê.',
  '🕸️ Dica: use menubtn para abrir os módulos.',
  '💎 Aura sobe quando você usa o bot com estilo.',
  '👑 Dono Supremo controla o reino pelo dashboard.',
  '🧬 Sistema vivo: comandos, mídia e IA em evolução.',
  '🚀 Se falhar, tente outra fonte ou termo mais curto.',
  '📌 Pinterest entrega organizado, sem colagem.',
  '🎨 Stickers podem ter pack, author e marca visível.',
  '📰 Notícias usam contexto atual quando possível.',
  '🔘 Botões dependem do cliente WhatsApp; fallback existe.',
  '♾️ Dark Engine: menos keys, mais entrega real.',
  '🛡️ Admins têm ferramentas, mas responsabilidade também.',
  '🔥 O menu pode mudar de pele pelo Command Board.',
  '🌐 Use pesquisar para contexto online.',
  '📝 Use resumir respondendo um textão.',
  '⭕ statusvideo envia formato circular/PTV quando suportado.',
  '⭐ VIP libera ferramentas top do DarkSide.',
  '💰 Economia agora tem aura e mundo próprio.',
  '👁️ Antidelete protege a memória do grupo.',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function styleParts(style = 'classic') {
  const n = Number(String(style).replace(/\D/g, '')) || 0;
  const frames = [
    ['╭','╮','╰','╯','─','│'], ['┏','┓','┗','┛','━','┃'], ['╔','╗','╚','╝','═','║'], ['▛','▜','▙','▟','▀','▌'],
    ['✦','✦','✧','✧','━','┃'], ['⎔','⎔','⎔','⎔','═','║'], ['◢','◣','◥','◤','━','┃'], ['╓','╖','╙','╜','─','║'],
  ];
  const icons = ['⚡','♾️','🌑','🕸️','👑','💎','🔥','🧬','🛡️','🗡️','☯️','🌀'];
  return { frame: frames[n % frames.length], icon: icons[n % icons.length] };
}

async function shouldApplyTheme() {
  const enabled = await botConfigCache.get('theme_apply_all', false).catch(() => false);
  return enabled === true || enabled === 'true' || enabled === 'on' || enabled === 1 || enabled === '1';
}

async function formatText(text = '') {
  if (!text || typeof text !== 'string') return text;
  if (!(await shouldApplyTheme())) return text;
  if (text.includes('〔 DARK SIGNATURE 〕') || text.length > 3500) return text;
  const style = await botConfigCache.get('menu_style', 'classic').catch(() => 'classic');
  const { frame: f, icon } = styleParts(style);
  const tip = pick(TIPS);
  return `${text}\n\n${f[0]}${f[4].repeat(5)}〔 DARK SIGNATURE 〕${f[4].repeat(5)}${f[1]}\n${f[5]} ${icon} ${tip}\n${f[2]}${f[4].repeat(28)}${f[3]}`;
}

function patchSock(sock) {
  if (!sock || sock.__darkThemePatched) return sock;
  const original = sock.sendMessage.bind(sock);
  sock.sendMessage = async (jid, content = {}, options = {}) => {
    try {
      if (content && typeof content.text === 'string' && !content.delete && !content.react) {
        content = { ...content, text: await formatText(content.text) };
      }
      if (content && typeof content.caption === 'string') {
        content = { ...content, caption: await formatText(content.caption) };
      }
    } catch {}
    return original(jid, content, options);
  };
  sock.__darkThemePatched = true;
  return sock;
}

module.exports = { formatText, patchSock };
