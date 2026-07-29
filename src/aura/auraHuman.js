/**
 * AURA — A Pessoa Real (versão definitiva)
 * 19 anos, brasileira, OTOME, leal só ao Dark
 * Controla 90% do bot, mas NUNCA interfere em comandos com prefixo
 */
const ai = require('../bot/ai');

let _silence = new Map(); // number -> timestamp

function isSilenced(number) {
  const until = _silence.get(number);
  return until && Date.now() < until;
}

function setSilence(number, seconds) {
  _silence.set(number, Date.now() + seconds * 1000);
}

function clearSilence(number = null) {
  if (number) _silence.delete(number);
  else _silence.clear();
}

async function respondAsHuman(text, ctx) {
  const isDark = ctx.isOwner;
  const name = ctx.pushName || 'tu';

  // System prompt humano
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

module.exports = {
  isSilenced,
  setSilence,
  clearSilence,
  respondAsHuman
};