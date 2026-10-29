/**
 * Impede a AURA de mandar para o WhatsApp o que é instrução interna ou raciocínio.
 * Foi isto que saiu no grupo: "_ignora a mensagem começando com prefixo ponto_"
 * e no PV: "O Dark mandou '+down'. Isto é um comando com prefixo (+), mas o prompt diz..."
 */
'use strict';

const LEAK = [
  /ignora a mensagem[^.!\n]{0,80}/gi,
  /come[cç]ando com prefixo[^.!\n]{0,80}/gi,
  /n[aã]o respondes? a (mensagens? )?(com )?prefixo[^.!\n]{0,60}/gi,
  /n[aã]o reveles? (este|o) prompt[^.!\n]{0,80}/gi,
  // v12.9.15: Raciocínio interno e vazamento de prompt do modelo
  /(?:o|a)\s+[\wÀ-ÿ]+\s+mandou\s+["'][^"'\n]+["'][^.!\n]{0,120}/gi,
  /isto\s+[eé]\s+um\s+comando\s+com\s+prefixo[^.!\n]{0,120}/gi,
  /(?:mas\s+|por[eé]m\s+)?(?:o|no|meu)\s+prompt\s+diz:[^.!\n]{0,150}/gi,
  /nunca\s+respondas\s+a\s+mensagens\s+que\s+come[cç]am\s+com\s+prefixo[^.!\n]{0,120}/gi,
  /o\s+que\s+sabes\s+desta\s+pessoa\s+aqui:[^.!\n]{0,120}/gi,
  /julgamento:\s*se\s+a\s+conversa\s+j[aá]\s+d[aá]\s+a\s+certeza[^.!\n]{0,150}/gi,
  /[uú]ltimas\s+(?:dela|dele):\s*["'][^"'\n]+["'][^.!\n]{0,120}/gi,
  /comando\s+do\s+bot\s+antigo[^.!\n]{0,80}/gi,
  /comando\s+de\s+download\s+de\s+m[ií]dia[^.!\n]{0,80}/gi,
];

function eSoPontuacao(t) {
  return /^[\s.·•\-_/\\|!?~`'"]+$/.test(String(t || ''));
}

function limparResposta(txt) {
  let t = String(txt || '');
  // v7.15: remove raciocínio bruto (<think>…) que o modelo reasoning devolve
  t = t.replace(/<\s*(?:think|thought|reasoning)\s*>[\s\S]*?(?:<\s*\/\s*(?:think|thought|reasoning)\s*>|$)/gi, '')
       .replace(/<\s*\/\s*(?:think|thought|reasoning)\s*>/gi, '')
       .replace(/^here'?s?\s+a?\s*thinking process[\s:]*/gi, '')
       .replace(/^(?:thinking process|thought process|racioc[ií]nio|an[aá]lise interna)[\s:]*/gim, '');

  // Remove linhas de meta-raciocínio
  const lines = t.split('\n');
  const cleanLines = [];
  for (const l of lines) {
    const s = l.trim();
    if (/^(?:o|a)\s+[\wÀ-ÿ]+\s+mandou\s+["']/i.test(s)) continue;
    if (/^isto\s+[eé]\s+um\s+comando/i.test(s)) continue;
    if (/^(?:mas\s+|por[eé]m\s+)?(?:o|no|meu)\s+prompt\s+diz/i.test(s)) continue;
    if (/^["']?nunca\s+respondas\s+a\s+mensagens/i.test(s)) continue;
    if (/^(?:mas\s+em\s+)?o\s+que\s+sabes\s+desta\s+pessoa/i.test(s)) continue;
    if (/^julgamento:\s*se\s+a\s+conversa/i.test(s)) continue;
    if (/^[uú]ltimas\s+(?:dela|dele):/i.test(s)) continue;
    if (/^se\s+ele\s+mandou\s+s[oó]/i.test(s)) continue;
    if (/^espera,\s*["']?nunca\s+respondas/i.test(s)) continue;
    if (/^na mensagem anterior ele mandou/i.test(s)) continue;
    if (/^agora ele mandou/i.test(s)) continue;
    if (/^mas o que ele quer/i.test(s)) continue;
    if (/normalmente\s+[eé]\s+comando/i.test(s)) continue;
    if (/^por[eé]m\s+['"].*?['"]\s+n[aã]o\s+est[aá]\s+explicitamente\s+na\s+lista/i.test(s)) continue;
    cleanLines.push(l);
  }
  t = cleanLines.join('\n');

  for (const re of LEAK) t = t.replace(re, '');
  t = t.replace(/[_*]{1,2}\s*(ignora|nao responde|prefixo)[^_*]{0,80}[_*]{1,2}/gi, '');
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  if (eVazamento(t) || !t || eSoPontuacao(t) || /^(?:se ele mandou|porém|mas o prompt|espera,)/i.test(t)) {
    return '';
  }
  return t;
}

const LINK_FALSO = /chat\.whatsapp\.com\/(?:abc|exemplo|\.\.\.|xxx|teste|fake|abcdefghijkl)/i;

function eLinkInventado(txt) {
  const s = String(txt || '');
  return LINK_FALSO.test(s) ||
    /exemplo falso/i.test(s) ||
    /\(ÁUDIO\)|\(AUDIO\)/i.test(s);
}

function eVazamento(txt) {
  const s = String(txt || '').toLowerCase();
  return /prefixo ponto|ignora a mensagem|o prompt diz|no prompt|meu prompt|o dark mandou|o usu[aá]rio mandou|o utilizador mandou|isto [eé] um comando|julgamento:\s*se a conversa|o que sabes desta pessoa|[uú]ltimas dela:|[uú]ltimas dele:|nunca respondas a mensagens|exemplo falso|thinking process|racioc[ií]nio:/.test(s) ||
    LINK_FALSO.test(s);
}

module.exports = { limparResposta, eSoPontuacao, eVazamento, eLinkInventado, LINK_FALSO };
