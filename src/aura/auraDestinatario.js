'use strict';
/**
 * v7.83 — AURA DESTINATÁRIO: quem fala com quem.
 *
 * Ela tem de saber, em cada mensagem de grupo:
 *   • É PARA MIM? (menção @ela, resposta a msg dela, vocativo "aura, ..." / "ó aura")
 *   • FALAM DE MIM? ("a aura é fixe" — 3ª pessoa, indirecto → reacção leve)
 *   • "aura" é GÍRIA? ("minha aura", "+100 aura", "que aura" — não é ela!)
 *   • Respondeu A QUEM? (jid + nome + excerto citado)
 *   • Marcou QUEM? (@... — jids reais, não regex no texto)
 *
 * Puro (sem I/O): recebe texto + jids + resolver de nomes. Testável.
 */

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function userDe(jid) { return String(jid || '').split(':')[0].split('@')[0]; }
function soDigitos(s) { return String(s || '').replace(/\D/g, ''); }

// "aura" como gíria/meme — NÃO é ela. (texto já normalizado: sem acentos)
const GIRIA_RES = [
  /(minha|tua|sua|nossa|essa|esta|que|tanta|quanta|muita|pouca)\s+aura\b/,
  /\baura\s+(dela|dele|deles|delas|minha|tua|sua|do|da|dos|das|desse|dessa|deste|desta|boa|ma|positiva|negativa|forte|fraca|pesada|leve|limpa|suja|misteriosa|estranha)\b/,
  /pontos?\s+(de\s+)?aura\b/,
  /[-+]\s?\d+\s*aura\b/,
  /(perdi|ganhei|perder|ganhar)\s+aura\b/,
];
// Falam DELA (3ª pessoa): "a aura" + verbo 3ª pessoa por perto.
const SOBRE_RE = /\ba aura\b.{0,20}\b(e|esta|estava|era|foi|disse|diz|faz|fez|vai|sabe|sabia|tem|tinha|gosta|adora|acha|pensou|mora|chegou)\b/;
const SOBRE_RE2 = /\b(esta|estava|era|foi|anda|cade|sumiu|apareceu)\b.{0,12}\ba aura\b/;

function ehVocativo(t, nomes) {
  for (const n of nomes) {
    if (!n || n.length < 3) continue;
    const e = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // "aura, ..." / "aura: ..." — vírgula/dois-pontos = sempre vocativo.
    if (new RegExp('^' + e + '\\s*[,:]').test(t)) return true;
    // "aura ..." no início — EXCEPTO continuação de gíria ("aura dela/boa/do...").
    if (new RegExp('^' + e + '(?=\\s*$|\\s+(?!dela|dele|deles|delas|do\\b|da\\b|dos|das|desse|dessa|deste|desta|boa|ma\\b|positiva|negativa|forte|fraca|pesada|leve|limpa|suja|misteriosa)\\S|[?!]+\\s*$)').test(t)) return true;
    // "oi aura" / "bom dia, aura" — saudação + nome.
    if (new RegExp('^(oi|ola|hey|bom dia|boa tarde|boa noite|e ai|fala)\\s*,?\\s*' + e + '\\b').test(t)) return true;
    // "..., aura" no fim.
    if (new RegExp('[,.!?]\\s*' + e + '\\s*[,.!?]?$').test(t)) return true;
    // "ó aura" / "ei aura".
    if (new RegExp('\\b(o|oh|eh|ei)\\s+' + e + '\\b').test(t)) return true;
  }
  return false;
}

/**
 * @param {object} o
 * @param {string} o.texto
 * @param {string[]} o.mentionedJid  jids marcados na msg (contextInfo)
 * @param {string} o.quotedParticipant  autor da msg citada ('' se não é resposta)
 * @param {string} o.quotedTexto  excerto da msg citada
 * @param {string} o.botNum  número do bot (PN)
 * @param {string} o.botLid  user do LID do bot
 * @param {string[]} o.tambemEu  outros nomes dela (nome do bot, ex. "dark")
 * @param {function} o.resolverNome  (jid) → nome ou null
 */
function analisar(o = {}) {
  const {
    texto = '', mentionedJid = [], quotedParticipant = '', quotedTexto = '',
    botNum = '', botLid = '', tambemEu = [], resolverNome = null,
  } = o;
  const t = norm(texto);
  const nomes = ['aura', ...tambemEu.map(n => norm(n))].filter((v, i, a) => v && v.length >= 3 && a.indexOf(v) === i);
  const nomeDe = (j) => {
    try { const n = resolverNome ? resolverNome(j) : null; if (n) return String(n).slice(0, 24); } catch {}
    const d = soDigitos(userDe(j));
    return d ? '+' + d : userDe(j);
  };
  const ehBot = (j) => {
    const u = userDe(j);
    return !!u && (u === String(botNum) || (!!botLid && u === userDe(botLid)));
  };

  const mencoes = [];
  let mencaoBot = false;
  for (const j of mentionedJid || []) {
    if (!j) continue;
    if (ehBot(j)) { mencaoBot = true; continue; }
    mencoes.push({ jid: j, nome: nomeDe(j) });
  }

  const respostaA = quotedParticipant
    ? { jid: quotedParticipant, nome: nomeDe(quotedParticipant), eBot: ehBot(quotedParticipant) }
    : null;

  const giria = GIRIA_RES.some(re => re.test(t));
  const vocativo = ehVocativo(t, nomes);
  const sobreMim = !mencaoBot && !(respostaA?.eBot) && !vocativo && !giria && (SOBRE_RE.test(t) || SOBRE_RE2.test(t));
  const motivos = [];
  if (mencaoBot) motivos.push('mencionaram-te (@)');
  if (respostaA?.eBot) motivos.push('responderam a uma tua mensagem');
  if (vocativo && !mencaoBot && !respostaA?.eBot) motivos.push('chamaram-te pelo nome');
  const paraMim = motivos.length > 0;

  return {
    paraMim, motivos, sobreMim, giria,
    mencoes,           // outros marcados (sem o bot)
    respostaA,         // a quem responde (null = msg nova)
    textoCitado: String(quotedTexto || '').slice(0, 140),
  };
}

/** Bloco para o system prompt: quem fala com quem, sem ambiguidade. */
function blocoParaPrompt(dest) {
  if (!dest) return '';
  const L = ['DESTINATÁRIO (quem fala com quem — lê com atenção):'];
  if (dest.paraMim) {
    L.push(`- Esta mensagem É PARA TI: sim — ${dest.motivos.join(' + ')}.`);
  } else {
    L.push('- Esta mensagem É PARA TI: não — falam entre si. Só responde se for mesmo chamado.');
  }
  if (dest.respostaA) {
    const q = dest.textoCitado ? ` — "${dest.textoCitado}"` : '';
    L.push(dest.respostaA.eBot
      ? `- Responde a: TI (uma tua mensagem)${q}`
      : `- Responde a: ${dest.respostaA.nome}${q}`);
  } else {
    L.push('- Responde a: ninguém (mensagem nova, não é resposta).');
  }
  if (dest.mencoes?.length) {
    L.push(`- Marcou (@): ${dest.mencoes.map(m => m.nome).join(', ')} (não és tu).`);
  } else {
    L.push('- Marcou (@): ninguém.');
  }
  if (dest.sobreMim) L.push('- Falam DE ti (3ª pessoa): sim — reage leve, não puxes conversa.');
  if (dest.giria) L.push('- "aura" na frase é GÍRIA (energia/meme), não és tu — ignora essa palavra.');
  return L.join('\n');
}

module.exports = { analisar, blocoParaPrompt, norm };
