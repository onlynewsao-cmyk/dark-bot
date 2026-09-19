/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  DARK BOT v9.8 — CLIENTE ONLINE ☣️ DIVULGAÇÃO (DARKTOXIC)     ║
 * ║                                                               ║
 * ║   !cliente            — o painel-tudo (lista de seleção ☣️)   ║
 * ║   GRUPOS              — !divulgar add/addall/list/del/delall  ║
 * ║   VELOCIDADE          — !delay (painel) / !delay 1..5000 /    ║
 * ║                         !delayultrarapido (5s)                ║
 * ║   DISPARO (4 passos)  — !divulgar / !divulgarrapido / media   ║
 * ║                         !divulgarteste / !divulgarstop /      ║
 * ║                         !divulgarhistorico                    ║
 * ║   SEU BOT / PLANO     — !conectarbot !meubot !desconectarbot  ║
 * ║                         !aluguel                              ║
 * ║                                                               ║
 * ║   VISIBILIDADE: visível = @marcações à vista; invisível =     ║
 * ║   menção SILENCIOSA (notifica todos sem tags visíveis — o     ║
 * ║   ADM não vê a lista de mencionados, só os normais zumbem).   ║
 * ║   APENAS DONO. Estado isolado POR DONO (botConfigCache).      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../../config');

// ── estado isolado por dono ──────────────────────────────────
const _STOP = new Set();           // owner → true quando pede dstop
const _SESS = new Map();           // owner → {fase, texto, media}
const _ULTIMOS = new Map();        // owner → { vis, montar }  — p/ divulgarrepetir
const _AGENDADOS = new Map();      // owner → timer (divulgaragenda)

function _num(n) { return String(n || '').replace(/\D/g, ''); }
async function _get(bcc, k) { return bcc.get(`divulg_${k}`, null); }
async function _set(bcc, k, v) { return bcc.set(`divulg_${k}`, v); }

// ── DARKTOXIC (mesmo ADN do cartão de prefixo) ───────────────
function _dtox(titulo, linhas, rodape = '') {
  const corpo = (linhas || []).map(l => `▸ ${l}`).join('\n');
  return [
    '☣️◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢☣️',
    `   ☠️ *DARKTOXIC* ☠️`,
    `🕸️〘 ${titulo} 〙🕸️`,
    '',
    corpo,
    rodape ? '\n' + rodape : '',
    '☣️◤◢◤◢◤◢◤◢◤◢◤◢◤◢◢☣️',
  ].join('\n').replace(/\n\n\n+/g, '\n\n');
}

// ── relay com o selo biz/native_flow (fantasma = nunca mais) ─
async function _relayBiz(sock, jid, m, extra = {}) {
  return sock.relayMessage(jid, m.message, {
    messageId: m.key.id,
    additionalNodes: [{ tag: 'biz', attrs: {}, content: [{
      tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
      content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
    }] }],
    ...extra,
  });
}

/** Lista de seleção (single_select) darktoxic. */
async function _lista(sock, msg, ctx, { titulo, corpo, seccoes, rodape }) {
  const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
  const m = generateWAMessageFromContent(ctx.remoteJid, {
    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
      body: { text: corpo },
      footer: { text: rodape || `☣️ ${config.bot.name} · DARKTOXIC` },
      header: { title: '', hasMediaAttachment: false },
      nativeFlowMessage: {
        buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: titulo, sections: seccoes }) }],
      },
    }),
  }, { userJid: sock.user?.id, quoted: msg });
  return _relayBiz(sock, ctx.remoteJid, m);
}

const sleep = (ms) => new Promise(r => setTimeout(r, Math.max(1, ms)));

/** Metadados do grupo (para menções). Silencioso em erro. */
async function _meta(sock, jid) {
  try { return await sock.groupMetadata(jid); } catch { return null; }
}

async function _historico(sock, bcc, own, entrada) {
  const hist = (await _get(bcc, `hist_${own}`) || []).concat(entrada).slice(-20);
  await _set(bcc, `hist_${own}`, hist).catch(() => {});
}

// ════════════════════════════════════════════════════════════
// MOTOR DO DISPARO
// ════════════════════════════════════════════════════════════
/**
 * Envia para todos os grupos registados.
 * vis: 'visivel' (tags à vista) · 'invisivel' (menção silenciosa) · 'sem'
 * montar: (grupo) => {content, precisaMencoes}
 */
async function _disparar(sock, msg, ctx, { vis, montar }) {
  const bcc = require('../botConfigCache');
  const own = _num(ctx.senderNumber);
  const grupos = (await _get(bcc, `grupos_${own}`)) || [];
  const delay = Number(await _get(bcc, `delay_${own}`)) || 1200;
  if (!grupos.length) return { ok: false, motivo: 'sem-grupos' };

  _STOP.delete(own);
  let feitos = 0, erros = 0;
  const falhas = [];
  for (let i = 0; i < grupos.length; i++) {
    if (_STOP.has(own)) break;
    const g = grupos[i];
    try {
      let mencoes = [], textoTag = '';
      if (vis !== 'sem') {
        const meta = await _meta(sock, g.jid);
        const parts = (meta?.participants || []).map(p => p.id);
        mencoes = parts;
        if (vis === 'visivel' && parts.length) {
          textoTag = '\n\n' + parts.slice(0, 200).map(pid => `@${pid.split('@')[0]}`).join(' ');
        }
        // invisível: mesmas menções, ZERO @ no texto — silêncio total.
      }
      const { content } = await montar(g, textoTag, mencoes);
      await sock.sendMessage(g.jid, content);
      feitos++;
    } catch (e) { erros++; falhas.push(`${g.nome || g.jid}: ${String(e.message).slice(0, 40)}`); }
    if (i + 1 < grupos.length) await sleep(delay);
  }
  const parado = _STOP.has(own);
  _STOP.delete(own);
  await _historico(sock, bcc, own, {
    quando: new Date().toISOString(), vis, delay,
    total: grupos.length, feitos, erros, parado,
  });
  return { ok: true, total: grupos.length, feitos, erros, parado, falhas, delay };
}

function _resumo(r, p) {
  if (r.motivo === 'sem-grupos') {
    return _dtox('D I V U L G A R', [
      '⚠️ *Sem grupos registados para o disparo.*',
      'PASSO 1: adiciona primeiro:',
      `   \`${p}divulgar add\` (dentro do grupo) ou \`${p}divulgar addall\``,
      `Lista: \`${p}divulgar list\``,
    ]);
  }
  return _dtox('R E L A T Ó R I O  D A  O N D A', [
    `📦 Alvos: *${r.total}*`,
    `✅ Enviado: *${r.feitos}*`,
    `❌ Falhou: *${r.erros}*${r.falhas?.length ? ` (${r.falhas[0]})` : ''}`,
    `⏱️ Delay: *${r.delay}ms*${r.parado ? ' · 🛑 PARADO por ti' : ''}`,
    r.parado ? `Retomar: volta a lançar !divulgar` : `Histórico: \`${p}divulgarhistorico\``,
  ]);
}

// ════════════════════════════════════════════════════════════
// PAINEL PRINCIPAL (!cliente) — secção a secção, darktoxic
// ════════════════════════════════════════════════════════════
async function _painelCliente(sock, msg, ctx) {
  const bcc = require('../botConfigCache');
  const p = ctx.prefix || config.bot.prefix || '!';
  const own = _num(ctx.senderNumber);
  const grupos = (await _get(bcc, `grupos_${own}`)) || [];
  const delay = Number(await _get(bcc, `delay_${own}`)) || 1200;
  const delayNome = { 1: '🚀 ULTRA', 70: '⚡ RÁPIDO', 300: '🐢 MÉDIO', 1200: '🛡️ ANTIBAN', 2000: '🐌 DEVAGAR', 5000: '🚀 ULTRA-RÁPIDO' }[delay] || `🔧 ${delay}ms`;

  const corpo = _dtox('C L I E N T E  -  O N L I N E', [
    '📦 *DIVULGAÇÃO — 4 PASSOS*',
    `📌 Grupos guardados: *${grupos.length}* (só teus, isolado)`,
    `⏱️ Velocidade: *${delayNome}* (${delay}ms)`,
    '',
    '1️⃣ Adiciona grupos → 📦',
    '2️⃣ Escolhe a velocidade → ⏱️',
    '3️⃣ Escolhe 👁️ visível / 🕶️ invisível',
    '4️⃣ Toca em 🚀 DIVULGAR ou responde à tua mídia',
    '',
    `✨ CLIENTE ATIVO — ${own}`,
    `\`${p}delay\` · \`${p}divulgar list\` · \`${p}divulgarhistorico\``,
  ]);

  const R = (label, desc, id) => ({ title: label.slice(0, 24), description: desc.slice(0, 70), id });
  const seccoes = [
    { title: '📦 GRUPOS', rows: [
      R('add grupo atual', 'regista ESTE grupo na tua onda', `${p}divulgar add`),
      R('addall automático', 'regista TODOS os grupos onde estou', `${p}divulgar addall`),
      R('listar grupos', 'vê a tua onda, numerada', `${p}divulgar list`),
      R('apagar todos', 'limpa a lista (del N tira 1)', `${p}divulgar delall`),
    ] },
    { title: '⏱️ VELOCIDADE / DELAY', rows: [
      R('painel do delay', 'presets com 🟢 no activo', `${p}delay`),
      R('ultra 1ms', 'sem parar — (!) risco máximo', `${p}delay ultra`),
      R('rapido 70ms', '⚡ recomendado', `${p}delay rapido`),
      R('antiban 1200ms', '🛡️ o mais seguro', `${p}delay antiban`),
    ] },
    { title: '🚀 ENVIAR — 4 PASSOS', rows: [
      R('divulgar texto', 'passo a passo interactivo', `${p}divulgar`),
      R('visivel rápido', '⚡ texto+tags à vista em 1 toque', `${p}divulgarrapido visivel`),
      R('invisível rápido', '🕶️ menção escondida — ADM não vê', `${p}divulgarrapido invisivel`),
      R('teste', 'manda 1x de volta P/ TI validar', `${p}divulgarteste`),
      R('repetir onda', '🔁 a última onda sai outra vez', `${p}divulgarrepetir`),
      R('agendar onda', '⏰ dispara daqui a N minutos', `${p}divulgaragenda`),
      R('stats', '📈 prova dos números — alcance e entregue', `${p}divulgarstats`),
      R('histórico', '📊 últimas 20 ondas', `${p}divulgarhistorico`),
      R('parar envio', '🛑 cancela a onda em curso (+agenda)', `${p}divulgarstop`),
    ] },
    { title: '🤖 SEU BOT · 💰 PLANO', rows: [
      R('conectar número', 'regista o teu bot cliente', `${p}conectarbot`),
      R('meu bot', '📊 estado & stats da tua onda', `${p}meubot`),
      R('desconectar', '🔌 desliga o teu bot', `${p}desconectarbot`),
      R('planos', '💵 tabela de aluguer', `${p}aluguel`),
    ] },
  ];

  // v9.9: HUB EM CARROSSEL — 4 cartões com capa darktoxic (IA, cache)
  // e botões vivos; se o carrossel não sair, cai para a lista (abaixo).
  let carro = false;
  if (sock.waUploadToServer) {
    try {
      carro = await require('../rpg/carousel').enviarCarrossel(sock, msg, ctx, {
        corpo,
        rodape: `☣️ ${config.bot.name} · cliente ${own.slice(-4)} · toca nas cartas`,
        cards: [
          { corpo: `📦 *GRUPOS DA ONDA*\n${grupos.length} registados e isolados — só teus, só isto.`, rodape: '☣️ PASSO 1',
            promptImg: 'dark toxic green and violet neon cluster of chat bubbles, glowing toxic hive, poster style, no text',
            cacheKey: 'dtox_grupos',
            botoes: [
              { texto: '📦 AddAll automático', id: `${p}divulgar addall` },
              { texto: '📋 Ver a minha onda', id: `${p}divulgar list` },
            ] },
          { corpo: `⏱️ *VELOCIDADE / DELAY*\nAtiva agora: *${delayNome}* (${delay}ms) — antiban é o porto seguro.`, rodape: '☣️ PASSO 2',
            promptImg: 'dark toxic violet neon speedometer with toxic green glow, cyberpunk timer, poster style, no text',
            cacheKey: 'dtox_delay',
            botoes: [
              { texto: '⏱️ Painel do delay', id: `${p}delay` },
              { texto: '⚡ Rápido 70ms', id: `${p}delay rapido` },
            ] },
          { corpo: '🚀 *ENVIAR — 4 PASSOS*\nGrupos → velocidade → visibilidade (👁️/🕶️) → disparo com relatório.', rodape: '☣️ PASSO 3–4',
            promptImg: 'toxic green mist signal broadcasting across dark city skyline, neon violet beams, poster style, no text',
            cacheKey: 'dtox_enviar',
            botoes: [
              { texto: '🚀 Divulgar agora', id: `${p}divulgar` },
              { texto: '👁️ Teste visível', id: `${p}divulgarteste visivel` },
            ] },
          { corpo: '🤖 *SEU BOT + PLANO*\nEstado do teu número, stats da onda e a tabela do aluguel.', rodape: '☣️ Oficina',
            promptImg: 'dark robotic hand holding glowing toxic green phone, violet neon circuits, poster style, no text',
            cacheKey: 'dtox_bot',
            botoes: [
              { texto: '📊 Meu bot', id: `${p}meubot` },
              { texto: '💵 Planos', id: `${p}aluguel` },
            ] },
        ],
      });
    } catch { carro = false; }
  }
  if (!carro) {
    await _lista(sock, msg, ctx, {
      titulo: '☣️ CLIENTE ONLINE',
      corpo,
      seccoes,
      rodape: `☣️ ${config.bot.name} · cliente ${own.slice(-4)} · DARKTOXIC`,
    });
  }
}

// ── ONDA DE BROADCAST (o core partilhado) ────────────────────
async function _onda(sock, msg, ctx, montar, vis, rotulo) {
  const own = _num(ctx.senderNumber);
  const bcc = require('../botConfigCache');
  const grupos = (await _get(bcc, `grupos_${own}`)) || [];
  const delay = Number(await _get(bcc, `delay_${own}`)) || 1200;
  await sock.sendMessage(ctx.remoteJid, {
    text: _dtox('A D I V U L G A R', [
      `🚀 Onda *${rotulo}* a correr…`,
      `📦 ${grupos.length} grupos · ⏱️ ${delay}ms · 👁️ ${vis === 'visivel' ? 'TAG VISÍVEL' : vis === 'invisivel' ? 'MENÇÃO ESCONDIDA' : 'SEM MENÇÕES'}`,
      '🛑 cancelar a qualquer momento: `!divulgarstop`',
    ]),
  }, { quoted: msg }).catch(() => {});
  const r = await _disparar(sock, msg, ctx, { vis, montar });
  const p = ctx.prefix || config.bot.prefix || '!';
  _ULTIMOS.set(own, { vis, montar });
  // v9.9: o RELATÓRIO traz botões FIXOS (quick_reply) — a onda morre
  // e já nasce a próxima acção à mão (repõe a sessão, vê stats, para).
  const textoR = _resumo(r, p);
  try {
    const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
    const m = generateWAMessageFromContent(ctx.remoteJid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: { text: textoR },
        footer: { text: `☣️ DARKTOXIC · onda ${rotulo}` },
        header: { title: '', hasMediaAttachment: false },
        nativeFlowMessage: { buttons: [
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🔁 Repetir mesma onda', id: `${p}divulgarrepetir` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📊 Histórico', id: `${p}divulgarhistorico` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🛑 Parar', id: `${p}divulgarstop` }) },
        ] },
      }),
    }, { userJid: sock.user?.id, quoted: msg });
    await _relayBiz(sock, ctx.remoteJid, m);
    return;
  } catch { /* sem interactivo → texto */ }
  await sock.sendMessage(ctx.remoteJid, { text: textoR }, { quoted: msg }).catch(() => {});
}

/** Texto a divulgar — do quote, dos args ou da sessão. */
function _textoDe(msg, args) {
  const q = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const qTxt = q?.conversation || q?.extendedTextMessage?.text || '';
  return (args.join(' ').trim() || String(qTxt).trim()).slice(0, 4000);
}

/** Mídia do quote: foto/vídeo/doc/áudio. */
async function _mediaDe(msg, tipo, caption) {
  const q = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const chave = { foto: 'imageMessage', video: 'videoMessage', doc: 'documentMessage', audio: 'audioMessage' }[tipo];
  const alvo = q?.[chave] || msg?.message?.[chave];
  if (!alvo) return null;
  try {
    const { downloadMediaMessage } = require('@systemzero/baileys');
    // a chave da MENSAGEM CITADA (stanzaId) — a desencriptação usa o id dela
    const ctxInfo = msg?.message?.extendedTextMessage?.contextInfo || {};
    const fakeMsg = {
      key: q ? { remoteJid: ctxInfo.remoteJid || msg.key?.remoteJid, id: ctxInfo.stanzaId || msg.key?.id, fromMe: !!ctxInfo.participant === false && false } : msg.key,
      message: { [chave]: alvo },
    };
    const buf = await downloadMediaMessage(fakeMsg, 'buffer', {});
    if (tipo === 'foto') return { image: buf, caption };
    if (tipo === 'video') return { video: buf, caption, mimetype: alvo.mimetype || 'video/mp4' };
    if (tipo === 'doc') return { document: buf, caption, mimetype: alvo.mimetype || 'application/pdf', fileName: alvo.fileName || 'divulgacao' };
    if (tipo === 'audio') return { audio: buf, mimetype: alvo.mimetype || 'audio/mpeg', ptt: !!alvo.ptt };
  } catch { return null; }
  return null;
}

module.exports = function registerDivulgacao(registerCase) {
  const deny = (reply) => reply('☣️ Este painel é *só do dono* — darktoxic fechado fora.');

  // ── HUB MASTER ──
  registerCase(['cliente', 'clienteonline', 'divulgacao'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    return _painelCliente(sock, msg, ctx);
  });

  // ── GRUPOS ──
  registerCase(['divulgar'], async ({ sock, msg, ctx, args, prefix, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const bcc = require('../botConfigCache');
    const own = _num(ctx.senderNumber);
    const p = prefix || config.bot.prefix || '!';
    const sub = String(args[0] || '').toLowerCase();

    const grupos = (await _get(bcc, `grupos_${own}`)) || [];
    const guardar = (g) => _set(bcc, `grupos_${own}`, g);

    if (sub === 'add') {
      if (!ctx.isGroup) return reply(`☣️ Entra no grupo-alvo e repete \`${p}divulgar add\` — eu registo ESTE.`);
      if (grupos.some(g => g.jid === ctx.remoteJid)) return reply('☣️ Este grupo já está na tua onda. ✅');
      let nome = ctx.groupName || '';
      try { nome = nome || (await sock.groupMetadata(ctx.remoteJid))?.subject || ctx.remoteJid; } catch {}
      grupos.push({ jid: ctx.remoteJid, nome, adicionado: new Date().toISOString() });
      await guardar(grupos);
      return reply(_dtox('G R U P O  R E G I S T A D O', [`📦 ${nome}`, `Total da onda: *${grupos.length}*`, `\`${p}divulgar list\``]));
    }

    if (sub === 'addall') {
      const todos = await sock.groupFetchAllParticipating().catch(() => ({}));
      const conhecidos = new Set(grupos.map(g => g.jid));
      let add = 0;
      for (const [jid, m] of Object.entries(todos)) {
        if (!conhecidos.has(jid)) { grupos.push({ jid, nome: m.subject || jid, adicionado: new Date().toISOString() }); add++; conhecidos.add(jid); }
      }
      await guardar(grupos);
      return reply(_dtox('A D D A L L', ['📦 PEGA TODOS AUTOMÁTICO!', `Novos: *${add}*`, `Total da onda: *${grupos.length}*`]));
    }

    if (sub === 'list') {
      if (!grupos.length) return reply(_dtox('A TUA ONDA', ['(vazia)', `\`${p}divulgar add\` num grupo · \`${p}divulgar addall\` pega todos`]));
      const linhas = grupos.map((g, i) => `${i + 1}. 📦 ${g.nome}`);
      return _lista(sock, msg, ctx, {
        titulo: '📦 OS TEUS GRUPOS',
        corpo: _dtox('G R U P O S  D A  O N D A', [...linhas.slice(0, 24), grupos.length > 24 ? `…+${grupos.length - 24}` : '', `\`${p}divulgar del N\` remove o de número N`].filter(Boolean)),
        seccoes: [{ title: '📦 GRUPOS', rows: grupos.slice(0, 24).map((g, i) => ({ title: (g.nome || g.jid).slice(0, 24), description: `${i + 1} — ${g.adicionado.slice(0, 10)}`, id: `${p}divulgar detalhe ${i + 1}` })) }],
      });
    }

    if (sub === 'detalhe') {
      const n = Number(args[1]); const g = grupos[n - 1];
      if (!g) return reply('☣️ Número inválido.');
      return reply(_dtox('G R U P O', [`📦 *${g.nome}*`, `JID: \`${g.jid}\``, `Registado: ${g.adicionado.slice(0, 10)}`, `Remover: \`${p}divulgar del ${n}\``, ' ', `Toca "${p}divulgar del ${n}" como ação rápida ⤵️`]));
    }

    if (sub === 'del') {
      const n = Number(args[1]);
      if (!Number.isInteger(n) || n < 1 || n > grupos.length) return reply(`☣️ Usa \`${p}divulgar del N\` — o N da \`${p}divulgar list\` (ex.: \`${p}divulgar del 1\`).`);
      const tirado = grupos.splice(n - 1, 1)[0];
      await guardar(grupos);
      return reply(_dtox('R E M O V I D O', [`🗑️ ${tirado.nome}`, `Ficam: *${grupos.length}*`]));
    }

    if (sub === 'delall') {
      await guardar([]);
      return reply(_dtox('L I M P O', ['🗑️ Apagados TODOS os grupos da tua onda.']));
    }

    // ── 4 PASSOS: sem texto → painel/camino; com texto → escolha da visibilidade ──
    const texto = _textoDe(msg, args);
    if (!texto) {
      return reply(_dtox('D I V U L G A R   —   4   P A S S O S', [
        `1️⃣ GRUPOS — \`${p}divulgar add\` / \`${p}divulgar addall\``,
        `2️⃣ VELOCIDADE — \`${p}delay\` (presets + custom 1..5000ms)`,
        `3️⃣ VISIBILIDADE — no passo seguinte escolhes:`,
        '   👁️ *visível* = @marcações à vista',
        '   🕶️ *invisível* = menção silenciosa (ADM não vê tags)',
        '   🔕 *sem* = só a mensagem',
        `4️⃣ DISPARAR — \`${p}divulgar <texto>\` ou responde a uma mídia:`,
        `   \`${p}divulgarfoto / video / doc / audio / contato / loc\``,
        '',
        `⚡ Atalhos: \`${p}divulgarrapido visivel <texto>\``,
        `🔬 Teste: \`${p}divulgarteste visivel <texto>\``,
      ]));
    }

    if (!grupos.length) {
      return reply(_dtox('D I V U L G A R', [
        '⚠️ *Sem grupos registados.*',
        'PASSO 1: adiciona primeiro:',
        `   \`${p}divulgar add\` (neste grupo) · \`${p}divulgar addall\` (todos automático)`,
      ]));
    }
    const ui = require('../rpg/ui');
    _SESS.set(own, { texto, media: null });
    return ui.escolher(sock, msg, ctx, {
      titulo: '☣️ PASSO 3 — VISIBILIDADE',
      subtitulo: 'ONDAS',
      linhas: [
        `📝 ${_textoDe(msg, args).slice(0, 120)}${texto.length > 120 ? '…' : ''}`,
        `📦 Grupos da onda: *${grupos.length}*`,
      ],
      opcoes: [
        { label: '👁️ Visível', desc: '@tags à vista — todos vêem quem foi marcado' },
        { label: '🕶️ Invisível', desc: 'menção escondida — notifica tudo, ADM não vê tags' },
        { label: '🔕 Sem menções', desc: 'só a mensagem, de grupo para grupo' },
        { label: '🛑 Cancelar', desc: 'abortar a onda' },
      ],
      onEscolha: async (idx, s2) => {
        const c2 = s2.ctx || ctx, sock2 = s2.sock || sock, msg2 = s2.msg || msg;
        const sess = _SESS.get(_num(c2.senderNumber)) || { texto };
        _SESS.delete(_num(c2.senderNumber));
        if (idx === 3) return sock2.sendMessage(c2.remoteJid, { text: _dtox('C A N C E L A D O', ['🛑 Onda abortada antes do disparo.']) }, { quoted: msg2 }).catch(() => {});
        const vis = ['visivel', 'invisivel', 'sem'][idx] || 'sem';
        await _onda(sock2, msg2, c2, async (_g, tag, mencoes) => ({
          content: { text: `☣️ *DIVULGAÇÃO* ☣️\n\n${sess.texto}${tag}`, mentions: vis === 'sem' ? [] : mencoes },
        }), vis, 'texto');
      },
    });
  });

  // ── ATALHO RÁPIDO ──
  registerCase(['divulgarrapido'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const vis = /^(visivel|visível)$/i.test(args[0] || '') ? 'visivel' : /^invis/i.test(args[0] || '') ? 'invisivel' : 'sem';
    const texto = _textoDe(msg, args.slice(1));
    if (!texto) return reply(`☣️ \`${ctx.prefix || config.bot.prefix}divulgarrapido visivel|invisivel <texto>\` — a mensagem vai de imediato.`);
    await _onda(sock, msg, ctx, async (_g, tag, mencoes) => ({
      content: { text: `☣️ *DIVULGAÇÃO* ☣️\n\n${texto}${tag}`, mentions: vis === 'sem' ? [] : mencoes },
    }), vis, 'rápido');
  });

  // ── TESTE (só para o próprio dono, 1 envio) ──
  registerCase(['divulgarteste'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const vis = /^visivel|visível$/i.test(args[0] || '') ? 'visivel' : /^invis/i.test(args[0] || '') ? 'invisivel' : 'sem';
    const texto = _textoDe(msg, args.slice(1)) || '(teste darktoxic ☣️)';
    const mencoes = vis === 'sem' ? [] : [ctx.senderJid];
    const tag = vis === 'visivel' ? `\n\n@${_num(ctx.senderNumber)}` : '';
    await sock.sendMessage(ctx.remoteJid, {
      text: `☣️ *TESTE* ☣️\n\n${texto}${tag}`, mentions: mencoes,
    }, { quoted: msg }).catch(() => {});
    return reply(_dtox('T E S T E  O K', ['🔬 Enviado acima, em modo *' + (vis === 'sem' ? 'sem menções' : vis) + '*', `Real: \`${ctx.prefix || config.bot.prefix}divulgar\``]));
  });

  // ── STOP & HISTÓRICO ──
  registerCase(['divulgarstop'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const own = _num(ctx.senderNumber);
    _STOP.add(own);
    const ag = _AGENDADOS.get(own);
    if (ag) { clearTimeout(ag); _AGENDADOS.delete(own); }
    return reply(_dtox('A P A R A R', ['🛑 Sinal de paragem lançado — a onda morre no próximo grupo.', ag ? '⏰ Agenda pendente também cancelada.' : '']));
  });

  // v9.9: REPETIR a última onda — botão fixo do relatório
  registerCase(['divulgarrepetir'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const ult = _ULTIMOS.get(_num(ctx.senderNumber));
    if (!ult) return reply('☣️ Ainda não há onda anterior nesta sessão para repetir.');
    return _onda(sock, msg, ctx, ult.montar, ult.vis, 'rep');
  });

  // v9.9: DASHBOARD de totais (a prova dos números, darktoxic)
  registerCase(['divulgarstats', 'divulgarestatistica', 'divgstat'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const bcc = require('../botConfigCache');
    const own = _num(ctx.senderNumber);
    const hist = (await _get(bcc, `hist_${own}`)) || [];
    const grupos = (await _get(bcc, `grupos_${own}`)) || [];
    const ondas = hist.length;
    const alcance = hist.reduce((a, h) => a + (h.total || 0), 0);
    const entregue = hist.reduce((a, h) => a + (h.feitos || 0), 0);
    const sucesso = alcance ? Math.round((entregue / alcance) * 100) : 0;
    const last = hist[hist.length - 1];
    const linhas = [
      `📦 Ondas disparadas: *${ondas}*`,
      `🎯 Grupos alcançados (cumulativo): *${alcance}*`,
      `✅ Entregues com sucesso: *${entregue}* (${sucesso}%)`,
      `⚗️ Grupos guardados agora: *${grupos.length}*`,
      last ? `🕒 Última onda: ${String(last.quando).slice(5, 16).replace('T', ' ')} · ${last.vis} · delay ${last.delay}ms` : '🕒 Ainda sem ondas — corre a primeira.',
      '',
      `Vê as últimas 20: \`${ctx.prefix || config.bot.prefix}divulgarhistorico\``,
    ];
    return reply(_dtox('P R O V A   D O S   N Ú M E R O S', linhas));
  });

  // v9.9: AGENDA — dispara daqui a N minutos (timer desta sessão)
  registerCase(['divulgaragenda', 'divulgarprogramar'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const p = ctx.prefix || config.bot.prefix || '!';
    const min = parseInt(String(args[0] || ''), 10);
    const temVis = /^vis|^invis/i.test(args[1] || '');
    const vis = /^invis/i.test(args[1] || '') ? 'invisivel' : /^vis/i.test(args[1] || '') ? 'visivel' : 'sem';
    if (!Number.isInteger(min) || min < 1 || min > 1440) {
      return reply(`☣️ \`${p}divulgaragenda <minutos> [visivel|invisivel] <texto>\` — ex.: \`${p}divulgaragenda 5 visivel drop às 21h\` (máx 24h).`);
    }
    const ondaTexto = _textoDe(msg, args.slice(temVis ? 2 : 1));
    if (!ondaTexto) return reply(`☣️ Falta o texto da onda: \`${p}divulgaragenda ${min} ${vis === 'sem' ? '' : 'visivel '}<texto>\`.`);
    const own = _num(ctx.senderNumber);
    if (_AGENDADOS.has(own)) { clearTimeout(_AGENDADOS.get(own)); _AGENDADOS.delete(own); }
    _AGENDADOS.set(own, setTimeout(async () => {
      _AGENDADOS.delete(own);
      await _onda(sock, msg, ctx, async (_g, tag, mencoes) => ({
        content: { text: `☣️ *DIVULGAÇÃO AGENDADA* ☣️\n\n${ondaTexto}${tag}`, mentions: vis === 'sem' ? [] : mencoes },
      }), vis, 'agendada');
    }, min * 60000));
    return reply(_dtox('A G E N D A D A', [
      `⏰ Onda *${vis === 'sem' ? 'neutra' : vis}* dispara daqui a *${min}min*.`,
      `📝 "${ondaTexto.slice(0, 90)}${ondaTexto.length > 90 ? '…' : ''}"`,
      `Cancelar junto com qualquer onda: \`${p}divulgarstop\` (apaga a agenda).`,
      '(a agenda vive nesta sessão — se o bot reiniciar, agenda de novo)',
    ]));
  });

  registerCase(['divulgarhistorico'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const bcc = require('../botConfigCache');
    const hist = (await _get(bcc, `hist_${_num(ctx.senderNumber)}`)) || [];
    if (!hist.length) return reply(_dtox('H I S T Ó R I C O', ['(vazio — corre a tua primeira onda!)']));
    const linhas = hist.slice(-8).reverse().map(h =>
      `🕒 ${String(h.quando).slice(5, 16).replace('T', ' ')} · ${h.vis} · ✅${h.feitos}/📦${h.total}${h.erros ? ` ❌${h.erros}` : ''}${h.parado ? ' 🛑' : ''}`);
    return reply(_dtox('H I S T Ó R I C O  D A S  O N D A S', linhas.reverse()));
  });

  // ── VELOCIDADE ──
  const DELAYS = {
    ultra: { ms: 1, icon: '🚀', aviso: 'SEM PARAR — (!) risco de ban máximo' },
    rapido: { ms: 70, icon: '⚡', aviso: 'RECOMENDADO' },
    medio: { ms: 300, icon: '🐢', aviso: 'equilibrado' },
    antiban: { ms: 1200, icon: '🛡️', aviso: 'MAIS SEGURO' },
    devagar: { ms: 2000, icon: '🐌', aviso: '100% SEGURO' },
    ultrarapido: { ms: 5000, icon: '🚀', aviso: 'ULTRA-RÁPIDO 5s' },
  };
  const _delayCase = async ({ sock, msg, ctx, args, prefix, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const bcc = require('../botConfigCache');
    const own = _num(ctx.senderNumber);
    const p = prefix || config.bot.prefix || '!';
    const atual = Number(await _get(bcc, `delay_${own}`)) || 1200;

    const sub = String(args[0] || '').toLowerCase();
    if (!sub) {
      const nomes = { 1: 'ultra', 70: 'rapido', 300: 'medio', 1200: 'antiban', 2000: 'devagar', 5000: 'ultrarapido' };
      const presets = ['ultra', 'rapido', 'medio', 'antiban', 'devagar', 'ultrarapido'];
      const corpo = _dtox('V E L O C I D A D E   /   D E L A Y', [
        ...presets.map(k => `${DELAYS[k].icon} *${k}* — ${DELAYS[k].ms}ms ${DELAYS[k].ms === atual ? '🟢 ATIVO' : `(${DELAYS[k].aviso})`}`),
        `🔧 custom: \`${p}delay 100\` (1 a 5000ms)`,
        '',
        '👆 Toca num preset ou escreve o valor.',
      ]);
      return _lista(sock, msg, ctx, {
        titulo: '⏱️ ESCOLHE A VELOCIDADE',
        corpo,
        seccoes: [{ title: '⏱️ DELAY', rows: presets.map(k => ({
          title: `${DELAYS[k].icon} ${k}`, description: `${DELAYS[k].ms}ms · ${DELAYS[k].aviso}`.slice(0, 70), id: `${p}delay ${k}`,
        })) }],
      });
    }

    let ms = DELAYS[sub]?.ms;
    if (/^medio$/.test(sub)) ms = 300;
    if (!ms && /^\d+$/.test(sub)) ms = Math.max(1, Math.min(5000, Number(sub)));
    if (!ms) return reply(`☣️ Delay inválido — presets (\`${p}delay\`) ou custom 1..5000: \`${p}delay 100\`.`);

    await _set(bcc, `delay_${own}`, ms);
    const nome = Object.entries(DELAYS).find(([, v]) => v?.ms === ms)?.[0];
    return reply(_dtox('V E L O C I D A D E  F I X A D A', [`${(DELAYS[nome]?.icon) || '🔧'} *${nome || 'custom'}* — *${ms}ms*`, `${(DELAYS[nome]?.aviso) || 'customizado'}`, `A tua próxima onda usa isto. 🚀`]));
  };
  registerCase(['delay'], _delayCase);
  registerCase(['delayultrarapido'], async (p0) => _delayCase({ ...p0, args: ['ultrarapido'] }));

  // ── MÍDIA (foto/video/doc/audio via quote) ──────────────────
  const MEDIA = [
    { cmd: 'divulgarfoto', tipo: 'foto' }, { cmd: 'divulgarvideo', tipo: 'video' },
    { cmd: 'divulgardoc', tipo: 'doc' }, { cmd: 'divulgaraudio', tipo: 'audio' },
  ];
  for (const { cmd, tipo } of MEDIA) {
    registerCase([cmd], async ({ sock, msg, ctx, args, isOwner, reply }) => {
      if (!isOwner) return deny(reply);
      const p = ctx.prefix || config.bot.prefix || '!';
      const vis = /^invis/i.test(args[0] || '') ? 'invisivel' : /^vis/i.test(args[0] || '') ? 'visivel' : 'sem';
      const caption = _textoDe(msg, args.slice(0).filter(Boolean)) || '';
      const midia = await _mediaDe(msg, tipo, caption.replace(/^visível$|^visivel$|^invisível$|^invisivel$/i, '').trim());
      if (!midia) return reply(`☣️ Responde a ${tipo === 'foto' ? 'uma foto' : tipo === 'video' ? 'um vídeo' : tipo === 'doc' ? 'um documento' : 'um áudio'} com \`${p}${cmd} [visivel|invisivel] [legenda]\`.`);
      await _onda(sock, msg, ctx, async (_g, tag, mencoes) => ({
        content: { ...midia, caption: `${midia.caption ? midia.caption + '\n\n' : ''}☣️ ${tag ? tag : ''}`.trim(), mentions: vis === 'sem' ? [] : mencoes },
      }), vis, tipo);
    });
  }

  // contato (vcard pelo número) + localização (lat,lon)
  registerCase(['divulgarcontato'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const p = ctx.prefix || config.bot.prefix || '!';
    const numero = String(args[0] || '').replace(/\D/g, '');
    if (!numero || numero.length < 8) return reply(`☣️ \`${p}divulgarcontato <número> <nome...>\` — envia um cartão de contato pela onda.`);
    const nome = args.slice(1).join(' ').trim() || 'Contacto';
    const vcard =
      'BEGIN:VCARD\nVERSION:3.0\n' +
      `FN:${nome}\nTEL;type=CELL;type=VOICE;waid=${numero}:+${numero}\nEND:VCARD`;
    const mensagem = {
      contacts: { displayName: nome, contacts: [{ vcard }] },
    };
    await _onda(sock, msg, ctx, async () => ({ content: mensagem }), 'sem', 'contato');
  });

  registerCase(['divulgarloc'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const p = ctx.prefix || config.bot.prefix || '!';
    const m = String(args.join(' ')).match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
    if (!m) return reply(`☣️ \`${p}divulgarloc <lat,lon> [nome]\` — ex.: \`${p}divulgarloc -8.838333,13.234444 Luanda\`.`);
    const nomeL = args.join(' ').replace(m[0], '').trim() || 'Localização';
    await _onda(sock, msg, ctx, async () => ({
      content: { location: { degreesLatitude: Number(m[1]), degreesLongitude: Number(m[2]), name: nomeL } },
    }), 'sem', 'localização');
  });

  // ── SEU BOT + PLANO ──
  registerCase(['conectarbot'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const bcc = require('../botConfigCache');
    const num = String(args[0] || '').replace(/\D/g, '');
    const p = ctx.prefix || config.bot.prefix || '!';
    if (!num || num.length < 9) return reply(`☣️ \`${p}conectarbot 55DDDNUMERO\` — regista o número do teu bot cliente.`);
    await _set(bcc, `bot_${_num(ctx.senderNumber)}`, { numero: num, ligado: new Date().toISOString(), ativo: true });
    return reply(_dtox('B O T  D O  C L I E N T E', [
      `📱 Número registado: *+${num}*`,
      '🔌 Estado: *registado / ativo*',
      `Estado completo: \`${p}meubot\` · desligar: \`${p}desconectarbot\``,
    ]));
  });

  registerCase(['meubot'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const bcc = require('../botConfigCache');
    const own = _num(ctx.senderNumber);
    const bot = await _get(bcc, `bot_${own}`);
    const grupos = (await _get(bcc, `grupos_${own}`)) || [];
    const delay = Number(await _get(bcc, `delay_${own}`)) || 1200;
    const hist = (await _get(bcc, `hist_${own}`)) || [];
    const ondasOk = hist.reduce((a, h) => a + (h.feitos || 0), 0);
    return reply(_dtox('O  T E U   B O T', [
      `📱 Número: ${bot ? `+*${bot.numero}*` : '(não registado — `!conectarbot`)'}`,
      `🔌 Estado: ${bot?.ativo ? '*ATIVO*' : 'desligado'}`,
      '🤖 Bot mestre: online ⏱️ ' + Math.floor(process.uptime() / 60) + 'min',
      '',
      `📦 Grupos da onda: *${grupos.length}* · delay *${delay}ms*`,
      `📊 Ondas na história: *${hist.length}* · total entregue: *${ondasOk}*`,
    ]));
  });

  registerCase(['desconectarbot'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const bcc = require('../botConfigCache');
    const own = _num(ctx.senderNumber);
    const bot = await _get(bcc, `bot_${own}`);
    if (!bot) return reply('☣️ Não tens bot registado — nada a desconectar.');
    bot.ativo = false; bot.desligado = new Date().toISOString();
    await _set(bcc, `bot_${own}`, bot);
    return reply(_dtox('D E S C O N E C T A D O', ['🔌 Bot do cliente desligado.', `Religar: \`${ctx.prefix || config.bot.prefix}conectarbot ${bot.numero}\``]));
  });

  registerCase(['aluguel'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const p = ctx.prefix || config.bot.prefix || '!';
    return reply(_dtox('P L A N O S  D E  A L U G U E L', [
      '⭐ *7 dias* — entrada, testa a máquina',
      '💎 *30 dias* — cliente oficial, suporte VIP',
      '🏆 *90 dias* — melhor custo/benefício + extras',
      '',
      `Comprar: \`${p}alugar\` · estado: \`${p}statusalugar\``,
    ]));
  });
};
