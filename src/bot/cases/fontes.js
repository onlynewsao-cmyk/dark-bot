'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v9.15 — cases/fontes.js                          ║
 * ║   TABULEIRO VIVO: a tabela de letras/símbolos do dono a     ║
 * ║   renderizar em comandos. Tudo TEXTO PURO — abre e copia em ║
 * ║   qualquer cliente (zero imagem, zero native_flow).          ║
 * ║                                                             ║
 * ║   !letras <texto>        → as fontes duma vez (letras+núm.) ║
 * ║   !letras <fonte> <txt>  → só uma fonte                      ║
 * ║   !tamanho <texto>       → os 6 TAMANHOS (grande↔micro)     ║
 * ║   !tamanho <tamanho> <t> → um tamanho só                     ║
 * ║   !nick <texto>          → 10 nicks ÚNICOS (caos+fonte)     ║
 * ║   !nickmais              → mais 10, sem repetir nenhum       ║
 * ║   !deco <texto>          → voltas decoradas, nome intacto   ║
 * ║   !caixa <texto>         → o nome emoldurado                ║
 * ║   !simbolos [pack] [pg]  → os baús do tabuleiro             ║
 * ║   !num <texto>           → números em 11 estilos            ║
 * ║                                                             ║
 * ║   ⚡ O ESTILO MUDA COM O !change: os cartões deste módulo    ║
 * ║   vestem a moldura/marcador/vibe do tema activo do bot (ou  ║
 * ║   do grupo), e os temas com `fonte:` empurram a sua fonte    ║
 * ║   para o topo do !nick e do !letras. Tema dark = clássico.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
const st = require('../styleTables');

function cab(titulo, linhas, t = null) {
  if (!t) {
    return [
      '☣️◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢☣️',
      '   ☠️ *DARKTOXIC* ☠️',
      `🕸️〘 ${titulo} 〙🕸️`,
      '',
      ...linhas,
      '☣️◤◢◤◢◤◢◤◢◤◢◤◢◤◢◢☣️',
      'DARK BOT 🕸️',
    ].filter((l) => l !== null).join('\n');
  }
  const f = t.frame || ['╭', '╮', '╰', '╯', '─', '│'];
  const H = f[4] || '─';
  const topo = `${f[0]}${H.repeat(7)} ${t.icon} ${H.repeat(7)}${f[1]}`;
  const fundo = `${f[2]}${H.repeat(7)} ${t.icon} ${H.repeat(7)}${f[3]}`;
  return [
    topo,
    `${t.bullet} 〘 ${titulo} 〙 ${t.bullet}`,
    '',
    ...linhas,
    '',
    `_${t.vibe}_`,
    fundo,
    'DARK BOT 🕸️',
  ].filter((l) => l !== null && l !== undefined).join('\n');
}

/** Tema que manda neste chat: override do grupo → global → dark casa. */
async function temaActivo(ctx) {
  try {
    let nome = null;
    if (ctx && ctx.isGroup && ctx.remoteJid && String(ctx.remoteJid).endsWith('@g.us')) {
      try {
        const gs = await require('../hotCache').getGroupDoc(ctx.msg || {}, ctx.remoteJid).catch(() => null);
        nome = gs && gs.groupTheme;
      } catch {}
    }
    if (!nome) nome = await require('../botConfigCache').get('active_theme', 'dark');
    const t = require('../changeThemes').getTheme(String(nome || 'dark'));
    return (t && t.name !== 'dark') ? t : null;
  } catch { return null; }
}

const code = (t) => `\`${String(t).replace(/`/g, 'ʼ')}\``;
const junta = (args) => (args || []).join(' ').trim();

module.exports = function registerFonteCases(registerCase) {
  // contador pessoal do !nickmais (por número) — sementes que nunca repetem
  const RODAS = new Map();
  const roda = (num) => { const v = (RODAS.get(num) || 0) + 1; RODAS.set(num, v); return v; };

  // ── !letras / !fonte — a festa das fontes (agora TAMBÉM nos números) ──
  registerCase(['letras', 'fonte', 'fuentes', 'estilo', 'estilos'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    const C = (tit, lins) => cab(tit, lins, TH);
    const primeiro = String(args[0] || '').toLowerCase();
    const f = st.FONTA[primeiro];
    if (f && args.length > 1) {
      const alvo = junta(args.slice(1));
      return reply(C('F O N T E · ' + f.nome.replace(/[*_~`]/g, ''), [
        code(f.conv(alvo)),
        '',
        `📋 segura a linha → copiar. Todas as fontes: \`${p}letras ${alvo.split(' ')[0]}\``,
      ]));
    }
    const alvo = junta(args);
    if (!alvo) {
      return reply(C('T A B U L E I R O  D E  L E T R A S', [
        `➡️ Escreve o texto: \`${p}letras DARK 2026\``,
        `🎯 Só uma fonte: \`${p}letras script DARK\` — fontes: ${st.FONTES.map((x) => x.id).join(' · ')}`,
        `📏 Tamanhos: \`${p}tamanho ${alvo || 'texto'}\``,
      ]));
    }
    const linhas = [];
    for (const x of st.FONTES) {
      const out = x.conv(alvo);
      if (out === alvo) continue; // fonte sem efeito neste texto → fora
      linhas.push(`${x.nome}`, code(out));
    }
    // assinatura do tema activo quando o tema traz fonte própria
    const nota = TH && TH.fonte && st.FONTA[TH.fonte]
      ? ['', `🎨 tema *${TH.name.toUpperCase()}* → \`${st.FONTA[TH.fonte].conv(alvo)}\``] : [];
    return reply(C(`L E T R A S  →  ${alvo.toUpperCase().slice(0, 18)}`, linhas.concat(nota)));
  });

  // ── !tamanho — letras E números em 6 tamanhos ──────────────────────
  registerCase(['tamanho', 'tamanhos'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    const C = (tit, lins) => cab(tit, lins, TH);
    const t1 = String(args[0] || '').toLowerCase();
    const one = st.TAMA[t1];
    const resto = one ? args.slice(1) : args;
    const alvo = junta(resto);
    if (!alvo) {
      return reply(C('T A M A N H O S', st.TAMANHOS.map((x) => `▸ \`${x.id}\` — ${x.nome}`).concat(
        ['', `📏 \`${p}tamanho grande oi 2026\` · ou tudo: \`${p}tamanho oi\``])));
    }
    if (one) return reply(C('T A M A N H O · ' + one.nome, [code(one.conv(alvo)), '', `🔁 os 6: \`${p}tamanho ${alvo}\``]));
    const linhas = [];
    for (const x of st.TAMANHOS) linhas.push(x.nome, code(x.conv(alvo)));
    return reply(C(`T A M A N H O S  →  ${alvo.slice(0, 16)}`, linhas));
  });

  // ── !nick — o gerador: cada resposta, 10 nicks que não se repetem ──
  registerCase(['nick', 'nickzin', 'apelido'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    const C = (tit, lins) => cab(tit, lins, TH);
    const alvo = junta(args);
    if (!alvo) return reply(C('N I C K  G E R A D O R', ['(nome vazio — usa `' + p + 'nick <texto>`]', `🎲 Depois: \`${p}nickmais\` para mais 10 SEM REPETIR.`]));
    const base = roda(ctx.senderNumber);
    let ns = st.nicks(alvo, 10, base * 7919);
    if (TH && TH.fonte && st.FONTA[TH.fonte]) ns = [`${st.FONTA[TH.fonte].conv(alvo)} ${(st.FINS[base % st.FINS.length] || '')}`.trim(), ...ns];
    return reply(C('N I C K S  Ú N I C O S', ns.map((x, i) => `${String(i + 1).padStart(2, '0')} ${code(x)}`).concat(['', `🎲 \`${p}nickmais\` → outros 10 \`${p}nick ${alvo.split(' ')[0]}\` só 1`, TH ? `🎨 1.º vem do tema ${TH.name.toUpperCase()}` : ''].filter(Boolean))));
  });
  registerCase(['nickmais', 'nickmore'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    const alvo = junta(args) || 'DARK BOT';
    const base = roda(ctx.senderNumber);
    const ns = st.nicks(alvo, 10, base * 104729 + 13);
    return reply(cab('M A I S  1 0', ns.map((x, i) => `${String(i + 1).padStart(2, '0')} ${code(x)}`), TH));
  });

  // ── !deco — nome intacto, volta decorada ───────────────────────────
  registerCase(['deco', 'decorar', 'moldura'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    const alvo = junta(args);
    if (!alvo) return reply(cab('D E C O R A Ç Õ E S', ['`' + p + 'deco meu nome`', '🕸️ O nome fica LIMPO — só ganha a volta do tabuleiro.'], TH));
    const ds = st.deco(alvo, 8, 3 + junta(args).length);
    return reply(cab('F O R M A S  D E  V E S T I R', ds.map((x) => code(x)), TH));
  });

  // ── !caixa — molduras com a tabela de caracteres de caixa ──────────
  registerCase(['caixa', 'box', 'quadro'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    let estilo = 'simples';
    let resto = args || [];
    if (st.CAIXAS[String(args[0] || '').toLowerCase()]) { estilo = String(args[0]).toLowerCase(); resto = args.slice(1); }
    const alvo = junta(resto);
    if (!alvo) {
      return reply(cab('C A I X A S', Object.keys(st.CAIXAS).map((k) => `▸ \`${p}caixa ${k} texto\` — ${k}`), TH));
    }
    const quatro = ['simples', 'dupla', 'arco', 'sombra'].map((k) => `_${k}_\n` + st.caixa(alvo, k));
    const extra = estilo !== 'simples' ? [`⭐ ${estilo}:\n` + st.caixa(alvo, estilo)] : [];
    return reply(cab('E M M O L D U R A D O', [...quatro, ...extra, '', `🧱 outras: ${Object.keys(st.CAIXAS).join(' · ')}`], TH));
  });

  // ── !num — a secção NÚMEROS da tabela ──────────────────────────────
  registerCase(['num', 'numeros', 'números'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    const alvo = junta(args);
    if (!/\d/.test(alvo)) return reply(cab('N Ú M E R O S', [`Manda números: \`${p}num 2026\``, 'Estilos: ' + Object.keys(st.NUMEROS).join(' · ')], TH));
    const linhas = [];
    for (const k of Object.keys(st.NUMEROS)) linhas.push(`${k}`, code(st.numeros(alvo, k)));
    return reply(cab('N Ú M E R O S  E S T I L I Z A D O S', linhas, TH));
  });

  // ── !simbolos — os baús todos, prontos a copiar ────────────────────
  registerCase(['simbolos', 'baus', 'packs', 'tabuleiro'], async ({ ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const TH = await temaActivo(ctx);
    const pedido = String(args[0] || '').toLowerCase();
    const nomes = Object.keys(st.PACKS);
    if (!pedido) {
      const linhas = nomes.map((k) => {
        const arr = [].concat(typeof st.PACKS[k] === 'function' ? st.PACKS[k]() : []);
        return `▸ ${k} — ${Array.isArray(arr) ? arr.length + ' peças' : 'vitrine'}`;
      });
      return reply(cab('B A Ú S  D O  T A B U L E I R O', linhas.concat(['', `📦 \`${p}simbolos egipcios\` despeja o baú inteiro.`]), TH));
    }
    const arr = st.pack(pedido);
    if (!arr) return reply(cab('B A Ú  N Ã O  E N C O N T R A D O', ['(esse não há —)', nomes.join(' · ')], TH));
    const corpo = (typeof arr === 'string' ? arr : arr.join(' '));
    const partes = [];
    for (let i = 0; i < corpo.length; i += 1700) partes.push(corpo.slice(i, i + 1700));
    const pagina = Math.max(1, Number(args[1]) || 1);
    if (pagina > partes.length) return reply(cab('Ú L T I M A  P Á G I N A', [`O baú morre na página ${partes.length}.`], TH));
    const msg = code((partes[pagina - 1] || '').trim());
    return reply(cab(`B A Ú ·  ${pedido.toUpperCase()}${pagina > 1 ? ` · pg ${pagina}` : ''}`, [
      `${arr.length} peças · 📋 segura → copiar`,
      msg,
      pagina < partes.length ? `➡️ \`${p}simbolos ${pedido} ${pagina + 1}\`` : '_fim do baú — tudo aproveitado._',
    ], TH));
  });
};

module.exports.__test = { cab, code, temaActivo };
