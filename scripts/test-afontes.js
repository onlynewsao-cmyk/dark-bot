#!/usr/bin/env node
'use strict';
/**
 * v9.15 — TESTES: TABULEIRO VIVO + SUPER MODO + CARTÃO CURTO + CHANGE/não
 * Sem rede, sem Mongo: módulos puros + socks falsos.
 */
const assert = require('assert');
const fs = require('fs');

(async () => {
  console.log('=== v9.15 — TABULEIRO / SUPER / CARTÃO / CHANGE-não ===');

  // ── 1. styleTables — a tabela inteira em motor ─────────────
  const st = require('../src/bot/styleTables');
  assert.ok(st.FONTES.length >= 21, `FONTES: ${st.FONTES.length}`);
  assert.strictEqual(st.letras('Dark', 'negrito'), '𝐃𝐚𝐫𝐤');
  assert.strictEqual(st.letras('AB', 'bandeira'), '🇦🇧');
  assert.strictEqual(st.letras('ABC', 'mono'), '𝙰𝙱𝙲');
  assert.strictEqual(st.letras('abc', 'pequenas'), 'ᴀʙᴄ');
  assert.strictEqual(st.numeros('2026', 'duplo'), '𝟚𝟘𝟚𝟞');
  assert.strictEqual(st.numeros('10', 'preto'), '➊⓿');
  assert.strictEqual(st.numeros('7', 'cima'), '⁷');
  assert.strictEqual(st.caixa('BEM-VINDO', 'dupla'), '╔═══════════╗\n║ BEM-VINDO ║\n╚═══════════╝');
  assert.strictEqual(Object.keys(st.ALT).length, 26, 'ALT cobre A-Z');
  assert.ok(st.ALT.A.length > 40, `A tem ${st.ALT.A.length} variantes`);
  assert.ok(st.MISTURAS.length > 100, `MISTURAS: ${st.MISTURAS.length}`);
  assert.ok(st.INICIOS_NICK.length >= 30 && st.SEPARADORES.length >= 25 && st.PARES.length >= 18);
  assert.ok(st.EGIPCIOS.length > 80 && st.ESTRANHOS.length > 40 && st.SETAS.length > 60 && st.BRAILLE.length >= 24);
  const c1 = st.caos('DARK BOT', 5), c2 = st.caos('DARK BOT', 5);
  assert.strictEqual(c1, c2, 'caos com seed é estável');
  const ns = st.nicks('Dark Bot', 10, 99);
  assert.strictEqual(new Set(ns).size, 10, '10 nicks ÚNICOS');
  assert.ok(ns.every((x) => [...x].length > 3), 'nenhum nick nasce vazio');
  assert.ok(st.nicks('x', 5, 1).every(Boolean), 'nicks curtos sobrevivem');
  const ds = st.deco('DARK', 8, 4);
  assert.strictEqual(new Set(ds).size, 8, 'decos únicos');
  assert.ok(ds.some((x) => x.includes('DARK')), 'deco não parte o texto');
  const pk = st.pack('egipcios');
  assert.ok(Array.isArray(pk) && pk.length > 80 && [...pk[0]].length === 1, 'baú egípcio verbatim (por code point)');
  assert.ok(st.pack('naoexiste') === null, 'baú fantasma → null');
  console.log('✔ tabuleiro: fontes, números, caixa, caos, nicks e baús todos vivos');

  // ── 2. CARTÃO DE PREFIXO — curtop + transporte compatível ─
  const pc = require('../src/bot/prefixCard');
  const nomes = Object.keys(pc.TEMAS);
  assert.ok(nomes.length >= 8, `temas do cartão: ${nomes.length}`);
  for (const k of nomes) {
    const c = pc.buildPrefixCard({ prefix: '!', custom: false, tema: k });
    const linhas = c.text.split('\n');
    assert.ok(linhas.length <= 4, `${k}: cartão com ${linhas.length} linhas (máx. 4)`);
    assert.ok(c.text.endsWith('DARK BOT 🕸️'), `${k}: termina com a assinatura da casa`);
    assert.ok(c.text.includes('*!*'), `${k}: mostra o prefixo`);
  }
  const enviados = [];
  const sock = { sendMessage: async (jid, o, x) => { enviados.push({ jid, o }); return { key: {} }; } };
  await pc.sendPrefixCard(sock, 'x@g.us', { prefix: '$', custom: true, tema: 'oculto' });
  assert.ok(enviados[0] && typeof enviados[0].o.text === 'string', 'envio = TEXTO PURO');
  assert.ok(Object.keys(enviados[0].o).length === 1, 'sem interactive/native_flow — compatível com tudo');
  const srcPc = fs.readFileSync(require.resolve('../src/bot/prefixCard.js'), 'utf8');
  assert.ok(!/sendCopyButton|viewOnce|native_flow/.test(srcPc.replace(/\/\*[\s\S]*?\*\//g, '')), 'zero truque de botões no cartão');
  console.log(`✔ cartão: ${nomes.length} temas ≤ 4 linhas, texto puro abre em qualquer cliente`);

  // ── 3. SUPER MODO — humano fora, motor a fundo ────────────
  const srcHum = fs.readFileSync(require.resolve('../src/bot/humanizer.js'), 'utf8');
  assert.ok(/:\s*'off';/.test(srcHum), 'HUMANIZE omissão = off');
  const srcDiv = fs.readFileSync(require.resolve('../src/bot/cases/divulgacao.js'), 'utf8');
  assert.ok(!/_MIN_G|_PAUSA_MIN|_PASS_MIN|_sleepJitter/.test(srcDiv), 'motor sem engrenagens humanas');
  assert.ok(/delay_\$\{own\}\`\)\) \|\| 0/.test(srcDiv), 'omissão do delay = 0 (SUPER)');
  console.log('✔ super: humanizer off por omissão + motor sem pausas de fábrica');

  // ── 4. CHANGE/não — a janela de decisão ───────────────────
  const cc = require('../src/bot/changeConfirm');
  const ct = require('../src/bot/changeThemes');
  const allT = ct.listThemes();
  assert.ok(allT.length >= 39, `temas globais: ${allT.length}`);
  const vistos = new Set(); let dups = 0;
  for (const t of allT) for (const k of ['vibe', 'tip', 'menuTitle', 'menuFooter']) {
    const v = t[k]; if (vistos.has(v)) dups++; vistos.add(v);
  }
  assert.strictEqual(dups, 0, 'textos dos temas: zero repetição');
  for (const novo of ['egipcio', 'sumerio', 'oculto', 'floral', 'kawai', 'setas', 'braille', 'moeda']) {
    const t = ct.getTheme(novo);
    assert.strictEqual(t.name, novo, `tema novo ${novo} existe`);
    assert.ok(t.frame.length === 6 && t.vibe && t.tip && t.headerDec, `${novo} completo`);
  }
  const sockB = { user: { id: 'dono@s' }, sent: [], sendMessage: async (j, o) => { sockB.sent.push(o); return {}; }, relayMessage: async () => ({ key: {} }) };
  const tema = ct.getTheme('braille');
  await cc.pedirConfirmacao(sockB, 'g@g.us', null, { prev: 'dark', prevStyle: '0', grupo: false, tema, who: '111' });
  assert.ok(cc.temPendente('g@g.us'), 'janela aberta');
  let r = await cc.resolver('g@g.us', { who: '222', isOwner: false, aceitar: false });
  assert.strictEqual(r, 'negado', 'estrangeiro não reverte');
  r = await cc.resolver('g@g.us', { who: '111', isOwner: false, aceitar: true });
  assert.strictEqual(r, 'mantido', 'quem pediu aceita (CHANGE)');
  await cc.pedirConfirmacao(sockB, 'g2@g.us', null, { prev: 'dark', prevStyle: '0', grupo: false, tema, who: '111' });
  r = await cc.resolver('g2@g.us', { who: '999', isOwner: true, aceitar: false });
  assert.ok(r && r.reversao && r.reversao.prev === 'dark', 'DONO reverte (NÃO) → reversao com o prev');
  await cc.pedirConfirmacao(sockB, 'g3@g.us', null, { prev: 'x', grupo: true, tema, who: '1' });
  cc.PENDENTES.get('g3@g.us').until = Date.now() - 1;
  r = await cc.resolver('g3@g.us', { who: '1', isOwner: false, aceitar: true });
  assert.strictEqual(r, 'sem-janela', 'janela caduca (3 min) fecha sozinha');
  console.log('✔ CHANGE/não: manter, reverter, dono-manda e expiração — tudo certo');

  // ── 5. fontes.js — os comandos respondem (harness leve) ───
  const casos = new Map();
  require('../src/bot/cases/fontes')((names, fn) => { (Array.isArray(names) ? names : [names]).forEach((n) => casos.set(n, fn)); });
  const run = async (cmd, args, num = '2449') => {
    let out = '';
    await casos.get(cmd)({ ctx: { senderNumber: num }, args, prefix: '!', reply: async (t) => { out = t; return 1; } });
    return out;
  };
  const festa = await run('letras', ['dark', 'bot']);
  assert.ok(/𝐝𝐚𝐫𝐤 𝐛𝐨𝐭/i.test(festa) || /🅓🅐🅡🅚/.test(festa) || /𝐃/.test(festa), 'letras converte de verdade');
  assert.ok((festa.match(/`/g) || []).length >= 20, 'cada fonte vem em bloco copiável');
  const uma = await run('fonte', ['mono', 'AB']);
  assert.ok(uma.includes('𝙰𝙱'), '!fonte mono AB');
  const semArgs = await run('letras', []);
  assert.ok(/Escreve o texto/.test(semArgs), 'sem args → tutorial');
  const n1 = await run('nick', ['meu nome']);
  const n2 = await run('nickmais', ['meu nome']);
  assert.ok(/01|ÚNICO|N I C K/i.test(n1), 'nick gera a lista');
  assert.notStrictEqual(n1, n2, 'nickmais ≠ nick (roda de sementes)');
  const cx = await run('caixa', ['oi']);
  assert.ok(cx.includes('╔') || cx.includes('┌'), 'caixa emoldura');
  const num = await run('num', ['2026']);
  assert.ok(/𝟚|➋|⁰/.test(num), 'num estiliza algarismos');
  const baus = await run('simbolos', []);
  assert.ok(/egipcios/.test(baus) && /braille/.test(baus), 'índice de baús');
  const bau = await run('simbolos', ['egipcios']);
  assert.ok(/B A Ú/.test(bau) && (bau.includes('𓂀') || bau.includes('𓁹') || bau.includes('𓀀')), 'baú egípcio sai com hieróglifos');
  const bau2 = await run('simbolos', ['egipcios', '2']);
  assert.ok(/pg 2|continua|Ú L T I M A/.test(bau2 + ''), 'paginação 2 responde');
  console.log('✔ comandos: letras, fonte, nick(+mais), caixa, num e simbolos — todos respondem');

  // ── 6. staticamente: !change e botões integrados + hub cliente ─
  const srcCh = fs.readFileSync(require.resolve('../src/bot/cases/change.js'), 'utf8');
  assert.ok(/changeConfirm/.test(srcCh) && /'nao', 'não', 'reverter'/.test(srcCh), '!change trata sim/não');
  const srcCmd = fs.readFileSync(require.resolve('../src/bot/commandHandler.js'), 'utf8');
  assert.ok(/changeConfirm/.test(srcCmd), 'clique CHANGE_THEME_ passa pela janela');
  assert.ok(/ESTILO & LETRAS/.test(srcDiv) && /B A Ú S/.test(srcDiv) === false, 'hub cliente tem secção de estilo');
  assert.ok(/dtox_estilo/.test(srcDiv), 'carrossel do !cliente tem o cartão do tabuleiro');
  const sd = fs.readFileSync(require.resolve('../src/bot/submenuData.js'), 'utf8');
  assert.ok(/letras:'texto'/.test(sd) && /nickmais:'texto'/.test(sd), 'comandos registados nos menus');
  console.log('✔ costura: !change, hub !cliente, menus e carrossel ligados');

  console.log('\nOK / test-afontes — TABULEIRO+SUPER (v9.15)');
  // ── 6. TAMANHOS + NÚMEROS NAS FONTES + STYLE-VIA-CHANGE (v9.15) ──
  assert.ok(st.TAMANHOS.length === 6 && st.TAMA && Object.keys(st.TAMA).length === 6, 'tamanhos: 6 + mapa TAMA');
  assert.ok(st.letras('Dark 2026', 'negrito').includes('𝟐𝟎𝟐𝟔'), 'fonte negrito converte NÚMEROS também');
  assert.ok(st.letras('A1', 'duplo').includes('𝟙'), 'duplo: dígito 𝟙');
  assert.ok(st.letras('9', 'largo').includes('９'), 'largo: ９ fullwidth');
  assert.strictEqual(st.TAMANHOS.find((t) => t.id === 'gigante').conv('Oi 9'), 'Ｏｉ ９');
  assert.ok(st.TAMANHOS.find((t) => t.id === 'micro').conv('Teste 9').includes('₉'), 'micro: subscriptos');
  assert.ok(st.TAMANHOS.find((t) => t.id === 'suspenso').conv('Teste 9').includes('⁹'), 'suspenso: sobrescritos');
  assert.ok(st.TAMANHOS.find((t) => t.id === 'grande').conv('9').codePointAt(0) >= 0x1D800, 'grande: sans-bold digits');
  const tam = await run('tamanho', ['oi 42']);
  assert.ok(/ｏｉ ４２/.test(tam) && /𝗼𝗶/.test(tam) && /₄₂/.test(tam) && /⁴²/.test(tam), '!tamanho despeja os 6 (com números!)');
  const tam1 = await run('tamanho', ['micro', 'Teste 9']);
  assert.ok(tam1.includes('ᵗᵉˢᵗᵉ ₉'), '!tamanho micro exacto');
  const tamIdx = await run('tamanho', []);
  assert.ok(/gigante/.test(tamIdx) && /suspenso/.test(tamIdx), 'índice de tamanhos');
  // O ESTILO MUDA COM O !change — tema activo veste o tabuleiro
  const bccM = require('../src/bot/botConfigCache');
  const gOldM = bccM.get;
  bccM.get = async (k, d) => (k === 'active_theme' ? 'egipcio' : gOldM(k, d));
  try {
    const eg = await run('letras', ['oi']);
    assert.ok(/𓉼|𓉽|𓂀/.test(eg), 'tema EGIPCIO veste o cartão do tabuleiro');
    const nickE = await run('nick', ['dark']);
    assert.ok(/𝔡𝔞𝔯𝔨/.test(nickE), 'fonte fraktur do tema vem 1.º no !nick');
    const festaE = await run('letras', ['oi']);
    assert.ok(/EGIPCIO/.test(festaE), 'nota «tema → fonte aplicada» no !letras');
  } finally { bccM.get = gOldM; }
  // dark (casa) = clássico darktoxic, sem moldura de tema
  const casa = await run('letras', ['oi']);
  assert.ok(/DARKTOXIC/.test(casa) && !/𓉽/.test(casa), 'sem tema = cartão da casa');
  console.log('✔ tamanhos + números nas fontes + Change muda o estilo do tabuleiro');

  process.exit(0);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
