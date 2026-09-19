'use strict';
/**
 * DARK BOT v9.15 — TABULEIRO DE ESTILOS (styleTables.js)
 * ════════════════════════════════════════════════════════════════
 * A tabela do dono, transformada em motor. Tudo o que veio colado no
 * WhatsApp (letras, inícios, fins, símbolos egípcios, cuneiforme,
 * chinês, setas, moedas, braille, decorações e as alternativas por
 * letra) vive aqui — aproveitado a 10000%:
 *   · FONTES   — 21 conversores de alfabeto (negrito matemático → bandeira)
 *   · ALT      — lista de alternativas por letra (das linhas «A=…», «B=…»)
 *   · INICIOS / FINS / DECORACOES / MISTURAS — material bruto dos nicks
 *   · nicks(texto, n, seed) — gerador determinístico (seed p/ testes)
 *   · caixa(texto, estilo) — molduras com a tabela de caracteres de caixa
 * Zero dependências externas: é puro texto Unicode — abre em QUALQUER
 * cliente, sem uma única imagem.
 * (Nota sanitária: o símbolo 卐 foi trocado pelo irmão budista 卍 —
 * mesmo traço, zero risco de report.)
 */

// ─────────────────────────────────────────────────────────────
// 1. FONTES — Mathematical Alphanumeric Symbols + amigos.
//    O que a tabela mostrava aos bocados, aqui sai do A ao Z
//    sem furos; onde o Unicode não tem letra, a letra fica crua
//    (nada de caixas vazias).
// ─────────────────────────────────────────────────────────────
const EXC = {
  scriptM:  { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ' },
  doubleM:  { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' },
};
const frakM = {}; const frakL = {};
{
  const F = '𝔄 ℬ 𝔅 𝔇 𝔈 𝔉 𝔊 ℌ ℐ 𝒥 𝒦 ℒ ℳ 𝔑 𝔒 𝔓 𝔔 ℛ 𝔖 𝔗 𝔘 𝔙 𝔚 𝔛 𝔜 ℨ'.split(' ');
  const G = '𝔞 𝔟 𝔠 𝔡 𝔢 𝔣 𝔤 𝔥 𝔦 𝔧 𝔨 𝔩 𝔪 𝔫 𝔬 𝔭 𝔮 𝔯 𝔰 𝔱 𝔲 𝔳 𝔴 𝔵 𝔶 𝔷'.split(' ');
  for (let i = 0; i < 26; i++) {
    frakM[String.fromCharCode(65 + i)] = F[i];
    frakL[String.fromCharCode(97 + i)] = G[i];
  }
}
const SUBS = {};
{
  const m = { a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ' };
  const M2 = { A: 'ᴬ', B: 'ᴮ', C: 'ᶜ', D: 'ᴰ', E: 'ᴱ', F: 'ᶠ', G: 'ᴳ', H: 'ᴴ', I: 'ᴵ', J: 'ᴶ', K: 'ᴷ', L: 'ᴸ', M: 'ᴹ', N: 'ᴺ', O: 'ᴼ', P: 'ᴾ', R: 'ᴿ', T: 'ᵀ', U: 'ᵁ', V: 'ⱽ', W: 'ᵂ' };
  Object.assign(SUBS, m, M2);
}
const REV = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'u', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  1: 'Ɩ', 2: 'ᄅ', 3: 'Ɛ', 4: 'ᔭ', 5: 'ϛ', 6: '9', 7: 'ㄥ', 8: '8', 9: '6', 0: '0', '?': '¿', '!': '¡', '(': ')', ')': '(' };
const SMALL = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' };

function mathConv(maiBase, minBase, maiExc = null, digBase = null) {
  return (texto) => String(texto).split('').map((c) => {
    if (/[A-Z]/.test(c)) {
      if (maiExc && maiExc[c]) return maiExc[c];
      return String.fromCodePoint(maiBase + c.charCodeAt(0) - 65);
    }
    if (/[a-z]/.test(c)) return String.fromCodePoint(minBase + c.charCodeAt(0) - 97);
    // v9.15 — TROCA TAMBÉM OS NÚMEROS onde o bloco matemático os tem
    if (digBase !== null && /[0-9]/.test(c)) return String.fromCodePoint(digBase + c.charCodeAt(0) - 48);
    return c;
  }).join('');
}
// algarismos fechados/abertos (⓪①… e ⓿➊…) — bases não contíguas
const CIRC_DIG = (neg) => (c) => c === '0' ? (neg ? '⓿' : '⓪') : String.fromCodePoint((neg ? 0x2776 : 0x2460) + (c.charCodeAt(0) - 49));
function rangeConv(maiBase, minBase, lim = 26) {
  return (texto) => String(texto).split('').map((c) => {
    if (/[A-Z]/.test(c)) { const i = c.charCodeAt(0) - 65; return i < lim ? String.fromCodePoint(maiBase + i) : c; }
    if (/[a-z]/.test(c)) { const i = c.charCodeAt(0) - 97; return i < lim ? String.fromCodePoint(minBase + i) : c; }
    return c;
  }).join('');
}
const mapConv = (tab, tabMai) => (texto) => String(texto).split('').map((c) => (tabMai && tabMai[c]) || tab[c] || c).join('');
const FLAGS = (texto) => String(texto).split('').map((c) => (/[A-Za-z]/.test(c) ? String.fromCodePoint(0x1F1E6 + c.toUpperCase().charCodeAt(0) - 65) : c)).join('');

const FONTES = [
  { id: 'negrito',        nome: '𝐍𝐄𝐆𝐑𝐈𝐓𝐎',            conv: mathConv(0x1D400, 0x1D41A, null, 0x1D7CE) },
  { id: 'italico',        nome: '𝐼𝑇Á𝐿𝐼𝐶𝑂',            conv: mathConv(0x1D434, 0x1D44E, null, 0x1D7E2) },
  { id: 'negritoita',     nome: '𝑵𝑬𝑮𝑹𝑰𝑻𝑨+𝑵𝑬𝑮',        conv: mathConv(0x1D468, 0x1D482, null, 0x1D7EC) },
  { id: 'sans',           nome: '𝘚𝘈𝘑𝘚',                   conv: mathConv(0x1D5A0, 0x1D5BA, null, 0x1D7F6) },
  { id: 'sansnegrito',    nome: '𝗦𝗔𝗡𝗦+𝗡𝗘𝗚𝗥𝗢',          conv: mathConv(0x1D5D4, 0x1D5EE, null, 0x1D800) },
  { id: 'sansita',        nome: '𝘚𝘈𝘕𝘚 𝘐𝘛Á𝘓',             conv: mathConv(0x1D608, 0x1D622) },
  { id: 'sansnegritoita', nome: '𝙎𝘼𝙉𝙎 𝙉𝙀𝙂',             conv: mathConv(0x1D63C, 0x1D656) },
  { id: 'script',         nome: '𝒮𝒸𝓇𝒾𝒫𝓉',               conv: mathConv(0x1D49C, 0x1D4B6, EXC.scriptM) },
  { id: 'scriptnegrito',  nome: '𝓢𝓬𝓡𝓘𝓟𝓣+𝓝𝓔𝓖',           conv: mathConv(0x1D4D0, 0x1D4EA) },
  { id: 'fraktur',        nome: '𝔉𝔯𝔞𝔨𝔱𝔲𝔯',              conv: (t) => String(t).split('').map((c) => frakM[c] || frakL[c.toLowerCase()] || c).join('') },
  { id: 'frakturpreto',   nome: '𝕱𝕽𝕬𝕶𝕿𝚄𝕽 𝕻𝕽𝕰𝕿𝕺',      conv: mathConv(0x1D56C, 0x1D586) },
  { id: 'duplo',          nome: '𝔻𝕠𝕦𝕓𝕝𝕖-𝕊𝕥𝕣𝕦𝕔𝕜',       conv: mathConv(0x1D538, 0x1D552, EXC.doubleM, 0x1D7D8) },
  { id: 'mono',           nome: '𝙼𝙾𝙽𝙾',                   conv: mathConv(0x1D670, 0x1D68A, null, 0x1D80A) },
  { id: 'circulo',        nome: 'ⒸⓘⓇⒸⓊⓁⓄⓈ',              conv: (t) => String(t).split('').map((c) => (/[0-9]/.test(c) ? CIRC_DIG(false)(c) : mathConv(0x24B6, 0x24D0)(c))).join('') },
  { id: 'circulonegro',   nome: '🅒🅘🅡🅒',                 conv: (t) => String(t).split('').map((c) => (/[0-9]/.test(c) ? CIRC_DIG(true)(c) : mathConv(0x1F150, 0x1F16C)(c))).join('') },
  { id: 'quadrado',       nome: '🄠🄡🄢 [A–O]',            conv: rangeConv(0x1F130, 0x1F14C, 15) },
  { id: 'quadradonegro',  nome: '🅰🅱🅲',                   conv: mathConv(0x1F170, 0x1F18C) },
  { id: 'largo',          nome: 'ＦＵＬＬＷＩＤＴＨ',        conv: (t) => mathConv(0xFF21, 0xFF41)(String(t).replace(/[0-9]/g, (d) => String.fromCodePoint(0xFF10 + d.charCodeAt(0) - 48))) },
  { id: 'pequenas',       nome: 'sᴍᴀʟʟ ᴄᴀᴘs',             conv: mapConv(SMALL) },
  { id: 'cabezaabaixo',   nome: 'uʍop ǝpᴉsdn',             conv: (t) => String(t).split('').map((c) => REV[c.toLowerCase()] || c).reverse().join('') },
  { id: 'bandeira',       nome: '🇧🇦🇳🇩🇪🇮🇷🇦',            conv: FLAGS },
  { id: 'subscrito',      nome: 'ˢᵘᵇs',                    conv: mapConv(SUBS) },
];
const FONTA = Object.fromEntries(FONTES.map((f) => [f.id, f]));
function letras(texto, estilo = 'negrito') {
  const f = FONTA[String(estilo || '').toLowerCase()];
  return f ? f.conv(String(texto || '')) : String(texto || '');
}
function todasFontes(texto) {
  return FONTES.map((f) => ({ id: f.id, nome: f.nome, texto: f.conv(String(texto || '')) }));
}

// ─────────────────────────────────────────────────────────────
// 1.5 TAMANHOS — v9.15: «trocas de letras e números» por TAMANHO.
// Cada tamanho converte letras E algarismos quando o bloco os tem.
// ─────────────────────────────────────────────────────────────
const SUB_DIG = '₀₁₂₃₄₅₆₇₈₉';
const SUP_DIG = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const TAMANHOS = [
  { id: 'gigante',  nome: 'ＧＩＧＡＮＴＥ (fullwidth)', conv: (t) => String(t).split('').map((c) => (/[0-9]/.test(c) ? String.fromCodePoint(0xFF10 + c.charCodeAt(0) - 48) : /[A-Za-z]/.test(c) ? String.fromCodePoint(0xFF21 + c.toUpperCase().charCodeAt(0) - 65 + (c === c.toLowerCase() ? 32 : 0)) : c)).join('') },
  { id: 'grande',   nome: 'GRANDE (sans-peso)',         conv: (t) => FONTES.find((f) => f.id === 'sansnegrito').conv(t) },
  { id: 'medio',    nome: 'MÉDIO (sans fina)',            conv: (t) => FONTES.find((f) => f.id === 'sans').conv(t) },
  { id: 'pequeno',  nome: 'PEQUENO (smallcaps)',        conv: (t) => mapConv(SMALL)(t) },
  { id: 'micro',    nome: 'MICRO (subscrito)',          conv: (t) => String(t).split('').map((c) => (/[0-9]/.test(c) ? SUB_DIG[+c] : SUBS[c.toLowerCase()] || c.toLowerCase())).join('') },
  { id: 'suspenso', nome: 'SUSPENSO (pequeno-capitais)', conv: (t) => String(t).split('').map((c) => (/[0-9]/.test(c) ? SUP_DIG[+c] : SMALL[c.toLowerCase()] || c)).join('') },
];
const TAMA = Object.fromEntries(TAMANHOS.map((x) => [x.id, x]));
function tamanho(texto, estilo = 'grande') {
  const t = TAMA[String(estilo || '').toLowerCase()];
  return t ? t.conv(String(texto || '')) : String(texto || '');
}

// números estilizados (secção NÚMEROS da tabela; bases verificadas
// no bloco Mathematical Alphanumeric: 1D7CE bold, 1D7D8 duplo-rasgo…)
const seqn = (base) => Array.from({ length: 10 }, (_, i) => String.fromCodePoint(base + i)).join('');
const NUMEROS = {
  preto:      '⓿➊➋➌➍➎➏➐➑➒',
  branco:     '⓪①②③④⑤⑥⑦⑧⑨',
  negrito:    seqn(0x1D7CE),
  duplo:      seqn(0x1D7D8),
  italo:      seqn(0x1D7E2),
  negritoita: seqn(0x1D7EC),
  sans:       seqn(0x1D7F6),
  sansnegro:  seqn(0x1D800),
  mono:       seqn(0x1D80A),
  largo:      '０１２３４５６７８９',
  cima:       '⁰¹²³⁴⁵⁶⁷⁸⁹',
};
function numeros(texto, estilo = 'duplo') {
  const map = NUMEROS[String(estilo || '').toLowerCase()] || NUMEROS.duplo;
  return String(texto).split('').map((c) => {
    const d = c.charCodeAt(0) - 48;
    return d >= 0 && d <= 9 ? [...map][d] : c;
  }).join('');
}


// ─────────────────────────────────────────────────────────────
// 2. AS LINHAS «X=…» DO DONO — alternativas por letra, VERBATIM.
//    Cada linha vira a bolsa de variantes da letra; é o coração
//    do modo CAOS do gerador de nicks.
// ─────────────────────────────────────────────────────────────
const LINHAS_ALT = {
  A: `A=Δ꙰ Λ λ Ⱥ ₳ ą å ส สั ล ค ศ Ⴉ 🇦 🇦ศ ₳ ﾑ Δ a ɑ Ă 厾 λ α Λ ɐ ส丹ⓐ Д ∆ ਸ λ Λ ą å ส ล ค α Ą ਜ Ẵ ศ ά āλ Д Å ä ล Ẳ Ħ ª ẩ ส Ä ձ Ą ๖ۣۜĄ αสั ά ặ म स 禸 丒丸凡 丹入 ﾑ ム Д 开 ໞ Ѧ 月么 ਜ A҉ 岚 ๖ۣۜA ꬍꬅ 刄 㞩`,
  B: `B=多🇧 乃 ঔৣ͜͡岌 в ฿ ß β ცⓑ ხ ɮ β ß ฿ Ъ طß в β ხ ฿ в ␢ ๒ Ъ ъ ь Ɓ ß ฿ Þ 乃 邦 ぶ ✇ 及 в Ⴊ 🇧 ๖ۣۜB 夃 ଷ ゐßѢƀЪЬβϐбБъьわゎらね ♭ ɓ B҉ ㄢ`,
  C: `C=¢ ₡ ₢ C ς ⊂ 匚 ㄷ ど に 二仁 🇨 ɕ ૮ C҉ ๖ۣۜC Շ 🇨 ¢ ₡ ᄃ c̈̈ ɔ ς ©C¢ ς © ζ Ƈ Ɔ ʗ ₡ ૮ ح¢ Ĉ č Č © ĉ Ć ૮`,
  D: `D=ↁ Đ ɗ đ δ ɖ わ 力 ⊅ ⊅໓ 🇩 ∌ D҉ 刀 Ɗ ๖ۣۜD ಖ 🇩đ Đ ɖ ⓓ ∂ ժÐ ∂ đ ۜÐ ₫Ð ∂ ð đ ๔ მ ძ ժ ɗ`,
  E: `E=Ɇ € ℮ ㉫ ∉ ∈ Ξ Σ ξ Є ๋Є ع ə ɇ є ჲ を ﾐ ﾓ 三 巨 玄乞 Ｅ它 ೯ ౯ ㄠ モ 🇪 E҉ 亥 ૯ ๖ۣۜE も ƎƏ Ɛ ؏៩ 🇪 乇 Є є Σ ε ξ ⓔ 玄 ៩ ₤ ჰ პ℮£ Є ξ Є๋ є ჱ ŧ Σ ε ع э έ נּ גּ ɛ ə ٤ ૯૯ є პ ε Ë ع ﻊ ē € ξ έ ℮ ë Э ۼ`,
  F: `F=Ғ ƒ Բ下 ﾁ Ϝ Fヂ Ք F 下 🇫 F҉. ๖ۣۜF ｷ ₣ ʃ ғ ⓕ f Ғƒ Բ ๖ۣۜF ₣ƒ ₣ ﬄ ךּ דּ Ғ ક`,
  G: `G=₲ ǥ Ⴚ Ǥ ❡ ሬ 🇬 Ԍ G҉ ๖ۣۜG ໔ ໕ ផ ௹ 🇬 Ĝ Ģ g G̈̈ ⓖ ₲ ௹ ğ G๋ ๔ Ġ ġ ģ ğ๋ ؤ ו פĢ ₢ ɠ ૬ ǥ`,
  H: `H=Ħ ん ɧ 卄௮ அ ஆ Һ һ н Ҕ ҕ Ң ң Ҥҥ Ӈ ӈ Ԋ ԋ 艹 Ⴌ 🇭 ╠╣ H み ђ ๖ۣۜH ਮ 🇭 ん ħ н ђ அ ჩ ħ ╠╣ ђ સ Њ ௮ Ћ нસ அ ħ ђ н Ћ Њ अ╠╣`,
  I: `I=፤ ɨ ៛ í ∣ ழェ エ ｪ ｴ 工讠 辶 เ ቾ 🇮 ҉ I҉ ๖ۣۜI ⶇⷀ 🇮 ί Ξ រ ł ιΐ ι ║ï Î เ Ī ﭑ Ỉ î Į ĩϊ ΐ ذ ﻐ ɩ ւ ɨ`,
  J: `J=ʝĲ ｊ Ｊ ʲქ ჟ 🇯 J ℑ ๖ۣۜJ 🇯ʝ ქ J Ĵ ɾ ე უل נ ਹ Ĵנ ل Ţ ړ ਹ ﻮ ʝ ჟ`,
  K: `K=Ҝ Ҟ Ӄ ₭ Ҝ 长 ҟ Ҡ ҡ ӄ ҝ 🇰 Ƙ K ઝ ๖ۣۜK🇰 ₭ Ҝ κ ķ К к ๖ۣۜK ઝ Қ ķ к Ҝ ₭ К қ ҝ`,
  L: `L=Ł Լ ℓ ∟ ﾚ し ̽ſ ʆ ไ ₰ 🇱よ๊レ 廴 L҉ ㄥ ๖ۣۜL โ Ն ₺ 🇱 Ł ₰ ℓ Լ よ ℓ Ĺ Ł Լ Ľ Ļ Ŀ ┘£ ไŁ ℓ Ļ ๋╝Լ`,
  M: `M=ℳ ๓ ற м რ ო ɱ ₥ Ӎ ポ ボ /V 水 ണ Ӎ 🇲 M҉ 爪 ๖ۣۜM 🇲 м ℳ რ ற ო ɱ ๓ ʍ დლм ற /V ๓ ๖ۣۜM Щ๓ ற м ₥ რ ო ɱ`,
  N: `N=₦ Ń ņ ரŋИ ภй מ Ň หฑ иη∩ ல ₪ ൯ Ŋ N҉ れ ๖ۣۜN ฌ ญ ൮ വശഷസ Л🇳и ₦ Π ₪ η ெ வ йи η ŋ ฑ ர И ภ й Ń ņ ή п ห Ŋ ภ Պ ฑ η и ர Ɲ ห ₪ ɳ מּ תּ ₦`,
  O: `O=Ѻ θ Θ ❍ ◯ 〇Ծ҉ ゆ ∅ Ø Ծ Օ ס ⊗ ₴ Θ ΦϕФ Ω θ๑ ๏ ο ๐ σ ø ѳ Ѻ Ѳ Ө ० の 🇴 ۝ O 口 ๖ۣۜO 汩 ଠ 🇴Ø๏σǿ⊕ƠФץםץ₴ΘԾøΩ❍ტიბθ❂ ø σ Ø ૭ Ǿ ö ♂ ợ Ů Ơ Ō Ծ Θ δ Ǿ Ф Ộ Ö ǿ Ŏ ό Ø ѳ ø ૭ σ ๏ ơ Θ Ф ठ ☻☺ θ Ө ɵҨ`,
  P: `P=℘ ₱ 了 ァ户 ㄕ尸 卩卫 ƿ ρ م թ ｱ ק ¶ や ゃ ア マ ャ ヤ ヹ ｱ 🇵 伊 ҉ P҉ ㄗ ๖ۣۜP 尹 🇵ρ ק թ þ φÞ ╠╝קּ թ φ þ քק Þ ρ P๋ ‽ ρ ƿ ք թ ॐ`,
  Q: `Q=φ Ҩ ҩ. 🇶 ϑ Q҉ ๖ۣۜQ🇶q ๖ۣۜQǪ ǫ գ`,
  R: `R=ℜ Ԅ रै₹Я 訳 尺 㞍尻尺 尼 尽 Ի ʀ ɾ я Я 民 🇷 R҉ 屁 ૨ ๖ۣۜR ฯ ণ 尺 尻 я ℜ Γ я ® л Я Ř ř ર ŗ ѓ ל гг ŗ я ® Я Ŗ`,
  S: `S=ฐ ร ຮ ธ ऽ ₷ ֆ ى ক উ ঊ Տ હ ៜ 🇸 ട 乌马 写 ㄅ ㄘㄎ 亐令 S҉ Ｓ ๖ۣۜS ঙ ຣ ଌ 🇸ঊ ₷ ន ѕ ร ₴ ஜى § ร ş ئ ટ ک Ŝ š હ Ş ઽ ՏȘ ร ﻜ § Ş ֆ હ $ Ș Ƨ ى ş Տ ડ ઽ ૐ`,
  T: `T=┳ 〒 Ԏ Ŧ ₮ ৳ ॠ ŧ ჭ ⊥ 匕十 क़ 丁 も デ テ ナ ㄤ ｲ 亻 ট ゼ Ⴀ 🇹 平 亇 T҉ す ๖ۣۜT ক ፐ ፓ 弋 字 🇹т † է Ե ｲ Ŧ ৳ჯ ₮ क も ł ┼ † т Ŧ Ţ Ť ŧ 〶〒ł Ŧ ♰ Ƭ τ †`,
  U: `U=น Ü บ ป ย ษ ข μ い ų น บ ป∪ リ ㄩ凵びひ სυʉ 🇺 Ҵ ચ થ ს U҉ む ષ ๖ۣۜU Ⴎ ษ 🇺 ひ υ ს ∪ચ µ Ü ü џ ů ย Û û ŭ ن น ષย џ ચ Ǔ Џ Ц Ū ப ʉ μ થ ય મ և υ ц`,
  V: `V=√ 讠 🇻 V҉ ∨ ๖ۣۜV ง 🇻ν∇√ ૪√ ٧ ს`,
  W: `W= ₩ ฬ ผ ฝ พ ฟ ௰ ឃ ω 🇼 W҉ ખ 山 ๖ۣۜW ຟ 🇼 Ѡ Ш ₩ ωŴ ω ŵ ખ ώ ฬ ฝ พ ฟ ﷲ ਘ`,
  X: `X =× 区×义冈区囟ҳ̸Ҳ̸ҳ✘✗ χ 🇽 乂 X҉. メ ๖ۣۜX 🇽χ Ҳ ҳ ✖χ Ж ჯ ×א ﭏ Ҳ ҳ χ ×`,
  Y: `Y = ƴ ¥ 丫吖 Ɏ Ύ Ⴘ 쏘 γ צ ყ Ⴘ Ⴗ ע γ у Y ﻻ ㄚ Ⴤ 🇾 ψ Ψ Y҉. ๖ۣۜY ⼬ Ƴ🇾у Ψ ყ γμ¥ ﻻ ŷ Ў ყ γ ÿ ý ५У ყ ﻻ צּ Ұ ¥ У ұ ץ`,
  Z: `Ζั = ʑ Ӡ ӡ ろ る 乙 之 z ƶ ȥ ʒ ʐ ʑ ƺ ʓ 🇿 Z҉ 🇿 z 乙 ζ Հ Ż ž ζ ż Ƶ Հ ƶ ƺ`,
};
const ALT = {};
for (const [letra, linha] of Object.entries(LINHAS_ALT)) {
  ALT[letra] = linha.split('=').slice(1).join('=').split(/\s+/).map((v) => v.trim()).filter(Boolean);
}
function caos(texto, seed = 0) {
  const r = rng(seed);
  return String(texto).split('').map((c) => {
    const bolsa = ALT[c.toUpperCase()];
    if (!bolsa || !bolsa.length || r() < 0.35) return c; // 35% fica cru — legível sempre
    return bolsa[Math.floor(r() * bolsa.length) % bolsa.length];
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// 3. INÍCIOS / FINS / DECORAÇÕES — material dos nicks (verbatim do
//    tabuleiro do dono; itens separados como ele os colou).
// ─────────────────────────────────────────────────────────────
const INICIOS = ['ৡৢ͜͡', 'ঔৣ͜͡', 'ᬊ͜͡', 'ೈ፝͜͡', '꯴᩠ꦽꦼ', '░⃟⃛', '➮', '⏤͟͟͞͞'];
const INICIOS_NICK = [
  'ᬊ͜͡', 'ঔৣ͜͡', '⏤͟͟͞͞🌻', '𖥨֗', 'ೈ፝͜͡', '🌾⃟ꦿ⸼', '✧͜͡҉', 'ঔৣ͜͡➳', '꧁͜͡', 'ৎ❥̤֟٭ۣۜ', 'ৡৢ͜͡',
  'ঔৣ͜͡҉❅ۣ̤ۜ', '⿻ꦿꦂ', '❥ꦿꯧָ', '᭥ꩌ゚໋ ꯴᩠ꦽꦼ', '᭺ᮀฺ۪۟𖡎’￫', '࿂ꦿ๋͚ꪳ↛', 'ꪶ⚘࿆ꦿི ݈݇', '᥀·࣭࣪̇˖', '᠂࣭.',
  '⃝༘⃕🍒', '✧༷ꦿ݈۟⸼͓۬࣪ꪶ', 'ནཹꦿ', '❀࿆⃧፝྅⃕ꦿ', 'ဳ⃟ꦿ', '🌹፝⃟༘┼', '᜴⃕', '░⃟⃛', '➮', '⿻͜͡',
  'ꪶཷ୭͓ꦿ݉ᐧᨗ', '✞⃟❐͜͡',
];
const FINS = ['݈݇─', '͜〉⛧', '᭄ ⸸ ᭄', '𖤐⁩᭄ꦿ', 'ᬏ᭄', '⛤⃗͜ᬏ᭄', '⸼ꦿ⸼', '⁩᭄ꦿ', 'ﻻ', '〮'];
const DECORACOES = [
  '❒᭄꥓〭🌹', '᠂࣭. ⃝༘⃕🍒', '⸵░⃟🌻𖥨ํ∘̥⃟⸽⃟🌹', '｡˚༷🌸｡˚༷￫', '🌙ꪾ〬ꩌ۪٬ླྀ',
  '❑ꦽꦷ🌻⏤͟͟͞͞🍹⁖ฺ۟̇࣪·֗٬̤⃟🌸', '🌺⃢❈❥', '▢', '𖣘⃟ᗒ', '🇹🇰⃟༒',
];
const PARES = ['〈〉', '《》', '「」', '『』', '【】', '〔〕', '〖〗', '〘〙', '〚〛', '⟬⟭', '⟦⟧', '⟨⟩', '⟪⟫', '⟮⟯', '❪❫', '꒰꒱', '꧁꧂', '┏┓', '⛧⛧', '〝〞'];
const SEPARADORES = [
  'ৢۜ͜͡', '๖ۣۜ͡ஓீ͜͜͡❥', 'ঔৣ͜͡ீ͜❥͜', 'ू ፝͜❥', 'ৎ❥̤֟٭ۣۜ', 'ঔৣֳ᷌᷈͜͡❀', 'ৎ✿̤֟٭', '✦҈͜͡➳', 'ঔৣ͜͡➳',
  '๖ۣۜ͡ஓீ͜͡', 'ஓீ͜͡', 'ஓீ፝͜͡', 'ۍమాై', 'ೈ፝͜͡๖ۣۜ', 'ீ͜ৡৢ͜͡', '๖ۣۜۜ͜͡ீ͜', 'ৢۜ͜͡⍣', '🔥፝⃟',
  'ꦿ⃟ۜ✯', 'ۣ❃', '༻⃟༆', '༆⃟᠁', 'ဳ⃟ꦿ', '💸⃟ꦿ⸼', '⋆⃟ۣۜ᭪➣', '⃘⃤꙰', '*-*', '✧͜͡҉',
];
const SIMBOLOS = `ᬽ ۝ ⛧ ᪤ ⸸ ᬛ ᭆ ᭩ ། ⚚ ♕ ♔ ⛥ ᭟ ֎ ◌ ⚝ ⅌ ۞ ༒ ༆ ༅ ༄ ༃ ༀ ༁ ༺ ༻ ࿐ ࿘ ࿕ ࿖ ࿗ ࿔ ࿓ ࿒ ࿑ ࿋ ࿉ ࿄ ░ ▒ ▓ ◍ ▸ ▹ ▿ ▾ ▵ ▴ ◊ ◔ ◕ ◖ ◗ ☙ ☥ ☤ ☻ ☼ ☽ ☾ ☿ ♁ ♃ ♘ ♡ ♞ ♱ ♰ ⚶ ✢ ✤ ✔ ✕ ✗ ✘ ✰ ❀ ❁ ❃ ✻ ✵ ✯ ✭ ✧ ✦ ❍ ❐ ❑ ❒ ❏ ⸙ ⸎ ꧁ ꧂ シ ツ ﭢ ღ ✞ ✟ ༈ ✄ ⊱ ⊰ 🝐 🝳 🝲 ᭁ ᭪ ᭦ ᭝ ᭕ ᭘ ᬊ ᬉ ᬏ ᬇ ᬠ ᬨ ᭄ ❦ ⦚ ⧛ ⧚ 〄 々 〆 ҈ ҉ ෴ ๛ ༗ ༖ ༕ 卍 ㌌`.split(/\s+/).filter(Boolean);
const OUTROS = `ϟ ↯ ⛧ ⸸ ♞ ♘ ࿗ ࿕ ⛥ ツ シ ♰ ♱ 卍 ✟ ✞ ♆ ♅ ♄ ⚛ ⚪ ⚫ ⚬ ⭕ 🔴 🔵 ๏ ༚ ᢀ ᨔ ⌻ ⌼ ⌽ ⌾ ⍉ ⍛ ⍜ ⎉ ⎊ ⎋ ⏀ ⏁ ⏂ ⏣ ◉ ○ ◌ ◍ ◎ ● ◐ ◑ ◒ ◓ ◔ ◕ ◦ ◯ ◴ ◵ ◶ ◷ ☌ ⚭ ⚮ ⚯ ⛢ ⬤ ⬮ ⬯ ⭖ ⭗ ⭘ ⭙ ʘ ஃ ᎒ ᎓ ᠁ ᠂ ᠃ ᠅ ᨞`.split(/\s+/).filter(Boolean);
const ESTRANHOS = Array.from(`𒁂𒀽𒁖𒁯𒁮𒂄𒂷𒇲𒈝𒈞𒈟𒈩𒉂𒉁𒈑𒈒𒉫𒉜𒉴𒉰𒊊𒊋𒊓𒊫𒊺𒊻𒊼𒊽𒋦𒋨𒌄𒌃𒌅𒌜𒌢𒌵𒍥𒍤𒍣𒍓𒍟𒐦𒐪𒑓𒊹𒇫𒇋𒆖𒆕𒄬`)

const EGIPCIOS = Array.from(`𓁹𓁺𓁻𓁼𓁽𓁾𓁿𓂔𓂓𓂛𓂜𓂞𓂠𓂢𓂣𓂤𓁵𓁴𓁤𓁜𓁳𓁣𓁪𓁢𓁱𓁡𓁑𓁊𓁍𓁎𓁌𓂑𓃚𓃙𓃛𓃜𓃝𓃟𓃨𓃪𓃬𓃭𓃸𓃶𓃾𓅉𓅂𓅄𓅆𓅙𓅓𓅌𓅖𓅗𓅢𓅱𓅪𓅭𓅮𓆈𓆂𓆅𓆔𓆖𓆠𓆛𓆜𓆞𓆣𓆤𓆦𓆟𓆺𓆳𓆵𓆶𓇈𓇓𓇒𓇥𓇣𓇭𓉡𓉢𓉦𓉸𓉻𓉔𓊢𓊞𓊭𓋐𓋖𓋸𓌆𓌱𓌺𓍙𓍢𓏱𓏲𓏵𓏠𓏤𓏑𓏎𓂸`)
const CHINESES = `㌀ ㌁ ㌂ ㌄ ㌇ ㌚ ㍃ ㍈ ㍖ ㌭ ㌡ ㌠ ㌙ ボ テ ス ツ ガ カ オ ぼ ⽔ ⽃ ⼪ ⼢ ⼒ ⻰ ㋒ ㋚ ㋔ ㋛ ㋘ ㋠ ㋡ 㐌 㐈 㐲 㐳 㑂 㑄 㐱 㒊 㑱 㓛 㓘 㓗 㓆 㕣 㕚 㕛 㘪 㘦 㘶 㠫 㡍 㡴 㡲 㡰 㡱 㣊 㣍 㣻 丈 丕`.split(/\s+/).filter(Boolean);
const SETAS = `͢ ↠ ↡ ↢ ↚ ↛ ↜ ↝ ↞ ↟ ↣ ↤ ↥ ↦ ↧ ↰ ↱ ↲ ↳ ↴ ↵ ↶ ↷ ↸ ↹ ↺ ↻ ↼ ↽ ↾ ↿ ⇀ ⇁ ⇂ ⇃ ⇄ ⇅ ⇆ ⇇ ⇈ ⇉ ⇊ ⇋ ⇌ ⇍ ⇎ ⇏ ⇐ ⇑ ⇒ ⇓ ⇔ ⇖ ⇕ ⇗ ⇘ ⇙ ⇚ ⇛ ⇜ ⇝ ⇞ ⇟ ⇠ ⇡ ⇢ ⇣ ⇤ ⇥ ⇦ ⇧ ⇨ ⇩ ⇪ ⇫ ⇬ ⇭ ⇮ ⇯ ⇰ ⇱ ⇲ ⇳ ⇴ ⇵ ⇶ ⇷ ⇸ ⇹ ⇺ ⇻ ⇼ ⇽ ⇾ ⇿ ⤡ ⤳ ➭ ➤ ➳ ⭛`.split(/\s+/).filter(Boolean);
const MOEDAS = Array.from(`₡₢₣₤₥₦₩₪₫₭₯₾₽₻₺₸₷₶₵₴₲₰₱₳ℳℴℵ℥ℤℨ℘ℜ⸿⸚⸛ⶬ⻞⸙ㆃ㑹`)
const BRAILLE = Array.from(`⠮⡄⡆⡔⢫⢥⢩⦫⦝⦽⦻⦹⥡⥳⩄⩙⩣⪀⪋⪆⫛⫎⫡⭃⬸⭄⡀⡐⣀⣠⣤⣦⣶⣾⠿⣿`)
// MISTURAS — o blob «COISAS PRA BOTAR NO MEIO»: token a token; os
// pedaços que começam por caractere combinatório eram órfãos e caem.
const MISTURAS = `ᱹ▻ ҂͓꣣۫۫🍉۫ꢁ ᯢ❁⃪ ◗ ░⃟⃛🍎༘݊➮
꒰১°᳝ꯥ‧ٓ➭ ꒰ෑ᪲꒱ ░ෆෑ ❒᭄꥓〭🍌 ᠂⸱ེ̀.𖧷
᩠░⃟⃜🍏ꪳ۫₎۬۟〬 ᭥ꩌ゚໋ ꯴᩠🍩⭛ ❀࿆⃧፝྅⃕ꦿ 〭〭〬〬⿻❥〬〬〬ꦿ
᩠꣣ʹ͚🍣 𖦹҉ २꫶ ╰៚݈݇ ⸵░⃟🐛̸꙰ ᱸᱹ𖠳𖣻
᭥ꩌ゚໋ ꯴᩠ꦽꦼ💌↦ ꔛ⃟⿻⃕⸵ࣻ꒰🍉꒱ ❨᯽ᨘ‛᩠⋆ꣻ 𖨮𖡎｡
㇀🐿 ۬.͜˖ ⸾〬۝ꦿ҂⃨ ཷ꒱⸼ 🌙ꪾ〬ꩌ۪٬ླྀ ▩݅͜𖨌•.̇
'꩖࿆͜͡𖡜•↣ ∎🚀 ࿂ꦿ๋͚ꪳ↛
᠌᠍᠍᠌᠎᠋᠎᠎ᤧᱸᱹ༊↯🍄 ᠌᠍᠍᠌᠎᠋᠎᠎ᤧᱸᱹ༊⇝ ꔷ㆒⸼݇҉ֻ᠂⃟🍉 ╰꫶ ࿉۟࣪࣪᭝
ꔛ⃟⿻ྀ⃕🍒 ⃝༘⃕🍒´݈ ᠂࣭. ⃝༘⃕🍒↳ 🎐·۪۫ˑ݈↷
᥀───🍰ٜᩦ୭ ꒰───🍰·ٜ۬･ 🎡⿻ꦿꪳ։
🍩ꪶཷ୭͓ꦿ݉ᐧᨗ ✧༷ꦿ݈۟⸼͓۬࣪ꪶ🌹 🍧.ᩦ୭✧ࣶᭂ 𖠵꩜⭟
╶🦔 ❪❥ꦿꯧָ❫ •.̇𖥨֗🍓⭟ ๋𖡜 ݈݈-݇ ─ ࿊⃨१
❥.ᨘ۫.ꪶ .ᨘ۫.ꪶ🍧 ۪→ ᭥⃕꙰҉ ◍̤￫ 🌹࣭࣭◗ ❪🍑ꦿེ≭•۟.❫ ❪🛸ꦿꯧ⸼❫ 𖣠ᮬ·̣̇꧈ ꪶ⚘࿆ꦿི ݈݇-
𖧹⸻𖠚ꪴ۟〬 ╶🦔 ❪❥ꦿꯧָ❫ ❪̣࣭̇࣪·ฺ۪۟𖡎｡ 𖣠ᮬ·̣̇͜᭺
⁖ฺ۟̇࣪·֗٬̤⃟🌻 ░░۟⃟🌻༘⸻ ·᳝∴̣࣭🌻·᳝∴̣࣭
⸻⿻ꦿꯧ๛ •.̇𖠵⃯🍧 ‡𖧱১ ᥀·࣭࣪̇˖💌◗
❪°·ꯥ̣ꩍ🍉↣ ๛ᤢ᪴🍑↯ ꪖ⚘⃯ 𖠵⃕⁖ ❑ꦽꦷ꧈
────🛸°·ꯥ̣ꩍ ─────̥˚᳝᳝𖥻🍧̇⸱
ꓻ┼ ꦽꦽꦼ➮ ꦽꦽꦶ꧈ ຊ✏ ❀ꦿ꩟
───𖡜̸｡᭭ ꫶─────୬۟◍⭟ ꨴ◍⸱￫
▩⃕͜ꦿ૰￫ ‡ᮀ১🌹； ᭥ꙮ•̇‡ꪳ͢⠂ᨗ 🍓ꦽ᪱ꩍ
᳝'꩖͜͡•꙰─» ───𖡜ꦽ̸ོ˚￫ ▩⃪ꦽꦶ̸꧇ ᭺ᮀฺ۪۟𖡎’￫
ꓸ᭄ꦿ⃔⃤ ⿻ꦿꦂ🍑 ░༵۟🍉ֻ͛➜ ⎝❑⃕ཷ🍟
‹‹❑ౄ🍒 ླ🍑❜︧༷︧➭ ꪶ🍄 ⃦⭛ ❍⃕⃟᎒⃟̀🍬ི૪
｡˚༷ᮀ｡˚༷￫ ｡˚༷｡˚༷🍒➮ ꓻ┼ꦽ᪱ꩍ🦔꧈ ⚘๋࿆.•۟
۝ ❪.🚀᪽̩¡❫ ๛·࣭̣࣪̇⸱🍩◗ ❒𖥻ꦼꦽ➮
ꕥꦿོ꧈ ───ཹ🌹 ݇-݈ ❪১°᳝ꯥ‧ٓ↵❫ ১°᳝ꯥ‧ٓ🛸
꒰🍒১°᳝ꯥ‧ٓ⭝ ꦽꦁ১︧.۪̇〬°⃟᮪݇⃟⃟🍧 ⃦ꦦꪳ՚𖦹 ⃦ꦦꪳ՚☕
◖🍑ནཹꦿ◗ ◖🍒ནཹꦿ↣ 𖣠’᪵১↣ ᳝'꩖͜͡𖧷𖦝
────𖦹५ॱ ᳝'꩖͜͡ꦿꦼ🍣 ◍ཻꢀ᮪⸱ᨗᨗᨗ🛸 ◍ཻꢀ🌹૰
惢🍑҂ 惢🍉’݆￫ 🌹ꦽꦼ̷১ ’٬࿊⃟☽ᝦ
ꛒ੭〭۬🍒ᨘ₎ ᨆᨘ᭲.˚🍓྆≭ ◦ᮀᨘ۬․ٰ৴🍚੭ 🍉⃟᮪〭۬̇〬⃟˖ꪶ
᳝'꩖͜͡⚘࿆ํ·ٜꪶ ⚘࿆꯴˖࣭̣᪽̇ ๋ ᫶ ⃙◌⃙◍ ❪̣࣭̇࣪·ฺ۪۟࿃❫̣࣭̇࣪·ฺ۪۟
🍒 ⃟᮪〭۬̇〬⃟˖⸱ೇ 🌺ꦽꦼ̷•ˑ˒ 🥥ꦽꦼ̷ꪶ 𖥕𖠗∙۟ᱹ۫↻
૰ཾ⋅ꩌꦿ🍧｡ ❪𖦄͟𖦉̤۪᭮.↣ ៍ོ⃨̇𖦖🍑⭟
✎․ೇ︨︧ཾ✾▹ 𖤃·۪۫ˑ݈↷ ⸻⌔☐❜｡۪۪۫۫↛
｟𖠲۪۫ᮀ〭⑇⃨᪽᪴｠ ╰ํ⃝̸〭∙۬·𖤃 ❪🍧ฺ࣭࣪͘ꕸ▸ 𖥨ํ∘̥⃟⸽⃟💌৴▸
𖥨ํ∘̥⃟⸽⃟🎐㇀ 🌵ฺ࣭࣪͘◞,〬⎼ ꗏฺ࣭̇͘.㇀🍣 ─◍᳝࣪.⋕𖥾ᤢ۪.۫
▧⃯⃟৴ํฺ͘.•🍣” ▧⃯⃟৴ํฺ͘.•🛸 ݈݇─ ▧⃟╳⃟ే̖`
  .split(/\s+/).map((x) => x.trim()).filter((x) => x && !/^\p{M}/u.test(x));
const CAIXA_TABELA = `┄┅┆┇┈┉┊┋ ⌗⌸⌹⍁⍂⍃⍄⍞⍯⎕⏍⏥ ▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▕▖▗▘▙▚▛▜▝▞▟ ■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱ ◘◙◧◨◩◪◫◰◱◲◳◻◼◽◾ ⚼⛝⛞ ❏❐❑❒❘❙❚⬚⬛⬜ 🔲🔳⌧❖⌺⍋⍍⍒⍔⍙⍚⎏⎐⎑⎒⏃⏄⏅ ▲△▴▵▶▷▸▹►▻▼▽▾▿◀◁◂◃◄◅◆◇◈◊◢◣◤◥◬◭◮◸◹◺◿ ⛋⛛⛡⟐🔶🔷🔸🔹🔺🔻🔼🔽`.split(/\s+/).filter(Boolean);

// ─────────────────────────────────────────────────────────────
// 4. GERADORES — rng(seed) determinístico p/ tudo ser testável.
// ─────────────────────────────────────────────────────────────
function rng(seed = 0) {
  let x = (Number(seed) >>> 0) || 0x9E3779B9;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

const CAIXAS = {
  simples:  { c: ['┌', '┐', '└', '┘'], h: '─', v: '│' },
  dupla:    { c: ['╔', '╗', '╚', '╝'], h: '═', v: '║' },
  arco:     { c: ['╭', '╮', '╰', '╯'], h: '─', v: '│' },
  sombra:   { c: ['▛', '▜', '▙', '▟'], h: '▀', v: '▌' },
  veneno:   { c: ['☣️◢', '◤☣️', '☣️◤', '◢☣️'], h: '◢◤', v: '☣️' },
  papiro:   { c: ['𓉼', '𓉽', '𓉹', '𓉬'], h: '𓐍', v: '𓐎' },
  cuneo:    { c: ['𒈙', '𒈙', '𒈙', '𒈙'], h: '𒁹', v: '𒀸' },
  florido:  { c: ['꧁❀', '❀꧂', '꧁❀', '❀꧂'], h: '﹏', v: '❀' },
};
function caixa(texto, estilo = 'simples') {
  const t = String(texto || '');
  const k = CAIXAS[estilo] || CAIXAS.simples;
  const larg = Math.max(...t.split('\n').map((l) => [...l].length), 8);
  const H = (n) => { let o = ''; while ([...o].length < n) o += k.h; return [...o].slice(0, n).join(''); };
  const linhas = t.split('\n').map((l) => `${k.v} ${l.padEnd(larg, ' ')} ${k.v}`.trimEnd());
  return [`${k.c[0]}${H(larg + 2)}${k.c[1]}`, ...linhas, `${k.c[2]}${H(larg + 2)}${k.c[3]}`].join('\n');
}

/**
 * NICKS — a arte maior: INÍCIO + nome (com CAOS por letra opcional)
 * + FIM, todos garantidamente diferentes entre si.
 * modo: 'suave' · 'caos' · 'fonte' · 'chumbo' (mix total — o default)
 */
function nicks(texto, n = 10, seed = 1, modo = 'chumbo') {
  const r = rng(seed);
  const base = String(texto || 'nick').trim() || 'nick';
  const out = new Set();
  let tent = 0;
  while (out.size < n && tent++ < n * 40) {
    let core = base;
    const m = out.size % 4 === 3 ? 'caos' : modo;
    if (m === 'caos')  core = caos(base, Math.floor(r() * 1e9));
    if (m === 'fonte') core = pick(FONTES, r).conv(base);
    if (m === 'chumbo') {
      const escolha = r();
      if (escolha < 0.4) core = caos(base, Math.floor(r() * 1e9));
      else if (escolha < 0.7) core = pick(FONTES, r).conv(base);
      if (r() < 0.5) core = numeros(core, pick(Object.keys(NUMEROS), r));
    }
    const miolo = r() < 0.35 ? ` ${pick(SEPARADORES, r)} ` : '';
    const ini   = r() < 0.8 ? pick(INICIOS_NICK, r) : (r() < 0.5 ? pick(INICIOS, r) : '');
    const fim   = r() < 0.85 ? (r() < 0.5 ? pick(FINS, r) : pick(MISTURAS, r)) : '';
    const par   = r() < 0.25 ? (() => { const pp = pick(PARES, r); return [pp[0], pp[1]]; })() : null;
    const nome  = `${ini}${core}${miolo}${fim}`;
    out.add(par ? `${par[0]}${nome}${par[1]}` : nome);
  }
  return [...out];
}

/** DECORAR — texto intacto, só a volta (para quem odeia caos no nome). */
function deco(texto, n = 8, seed = 4) {
  const r = rng(seed);
  const base = String(texto || '').trim() || 'texto';
  const out = new Set();
  let tent = 0;
  while (out.size < n && tent++ < n * 30) {
    const estilo = Math.floor(r() * 5);
    if (estilo === 0) { const pp = pick(PARES, r); out.add(`${pp[0]}${base}${pp[1]}`); }
    else if (estilo === 1) out.add(`${pick(INICIOS, r)}${base}${pick(FINS, r)}`);
    else if (estilo === 2) out.add(`${pick(DECORACOES, r)}${base}${pick(SEPARADORES, r)}`);
    else if (estilo === 3) out.add(`${base} ${pick(SIMBOLOS, r)}`);
    else out.add(`${pick(MISTURAS, r)}${base}`);
  }
  return [...out];
}

const PACKS = {
  letras:      () => Object.keys(LINHAS_ALT).map((k) => `${k}: ${LINHAS_ALT[k].split('=').slice(1).join('=').trim()}`),
  inicios:     () => INICIOS,
  iniciosNick: () => INICIOS_NICK,
  fins:        () => FINS,
  decoracoes:  () => DECORACOES,
  misturas:    () => MISTURAS,
  separadores: () => SEPARADORES,
  pares:       () => PARES,
  simbolos:    () => SIMBOLOS,
  outros:      () => OUTROS,
  estranhos:   () => ESTRANHOS,
  egipcios:    () => EGIPCIOS,
  chines:      () => CHINESES,
  setas:       () => SETAS,
  moedas:      () => MOEDAS,
  braille:     () => BRAILLE,
  caixa:       () => CAIXA_TABELA,
};
function pack(nome) {
  const f = PACKS[String(nome || '').toLowerCase()];
  return f ? [].concat(f()) : null;
}

module.exports = { FONTES, FONTA, NUMEROS, TAMANHOS, TAMA, tamanho, letras, todasFontes, numeros, caos, nicks, deco, caixa, pack, LINHAS_ALT, ALT, CAIXAS, PACKS, rng,
  INICIOS, INICIOS_NICK, FINS, DECORACOES, MISTURAS, SEPARADORES, PARES, SIMBOLOS, OUTROS, ESTRANHOS, EGIPCIOS, CHINESES, SETAS, MOEDAS, BRAILLE, CAIXA_TABELA };
