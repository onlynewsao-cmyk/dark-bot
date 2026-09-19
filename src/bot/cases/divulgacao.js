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
const _FLUXO = new Map();          // `${jid}|${num}` → assistente 4 passos
const TTL_FLUXO = 15 * 60 * 1000;

const _kFluxo = (ctx) => `${ctx.remoteJid}|${_num(ctx.senderNumber)}`;

// ── v9.14 CANAL SECRETO — o ADM não vê NADA ──────────────────
// Tudo o que é da divulgação (assistente, painéis, botões fixos,
// relatórios, hubs) saído DE UM GRUPO vai para o PV do dono. O botão
// de divulgar "parecia morto" porque os ADM o viam carregar — agora
// literalmente não aparece lá: só no privado do dono.
function _pv(ctx) { return `${_num(ctx.senderNumber || ctx.senderJid)}@s.whatsapp.net`; }
function _alvo(ctx) { return ctx.isGroup ? _pv(ctx) : ctx.remoteJid; }

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
  const m = generateWAMessageFromContent(_alvo(ctx), {
    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
      body: { text: corpo },
      footer: { text: rodape || `☣️ ${config.bot.name} · DARKTOXIC` },
      header: { title: '', hasMediaAttachment: false },
      nativeFlowMessage: {
        buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: titulo, sections: seccoes }) }],
      },
    }),
  }, { userJid: sock.user?.id, quoted: msg });
  return _relayBiz(sock, _alvo(ctx), m);
}

const sleep = (ms) => new Promise(r => setTimeout(r, Math.max(1, ms)));

/**
 * Corpo por modo:
 *  · visível  → banner ☣️ + texto + hidetag (ADM vê — é propósito);
 *  · invisível → texto CRU com ruído único (bypass, zero beacon);
 *  · sem      → texto directo.
 */
function _corpoDesp(texto, vis, tag) {
  const t = String(texto || '').slice(0, 4000);
  if (vis === 'visivel') return `☣️ *DIVULGAÇÃO* ☣️\n\n${_ruido(t)}${tag || ''}`;
  if (vis === 'invisivel') return _ruido(t);
  return t;
}

/** Metadados do grupo (para menções). Silencioso em erro. */
async function _meta(sock, jid) {
  try { return await sock.groupMetadata(jid); } catch { return null; }
}

/** Separa [admins, membros] de uma lista de participantes. */
function _separaAdm(participants) {
  const admins = [], membros = [];
  for (const p of participants || []) (p.admin ? admins : membros).push(p.id);
  return { admins, membros };
}

/**
 * BYPASS anti-detecção (modo invisível):
 * 1) cada mensagem sai TEXTUALMENTE ÚNICA — insere ruído invisível
 *    (zero-width) noutra posição por grupo → detective de cópia
 *    (hash de texto idêntico em N grupos) morre de fome;
 * 2) nada de banners — sai o CRU do utilizador (o "☣️ DIVULGAÇÃO"
 *    é ele próprio um beacon para anti-divulgação).
 */
function _ruido(texto) {
  const zero = ['\u200b', '\u200c', '\u2060', '\u180e'];
  const alvo = String(texto || '');
  if (alvo.length < 3) return alvo + zero[0];
  const n = 1 + Math.floor(Math.random() * 2);          // 1–2 pontos de ruído
  let out = alvo;
  for (let i = 0; i < n; i++) {
    const pos = 1 + Math.floor(Math.random() * (out.length - 1));
    out = out.slice(0, pos) + zero[Math.floor(Math.random() * zero.length)] + out.slice(pos);
  }
  return out;
}

/** jitter: o relógio metronómico é o 2º sinal de bot — desliza ±25% */
const _sleepJitter = (ms) => sleep(Math.max(1, Math.round(ms * (0.75 + Math.random() * 0.5))));

// ── RITMO ANTI-BAN (v9.13) ───────────────────────────────────────
// O que frita uma conta no WhatsApp é assinatura de broadcast:
//  · mensagens promo quase coladas umas às outras (1..300ms) em N grupos;
//  · exactamente o mesmo intervalo entre elas (metrónomo);
//  · texto promo idêntico em dezenas de grupos (hash duplicado).
// Regras duras aqui no motor (todos os caminhos — texto, mídia,
// repetir, agenda — passam por _disparar):
//  1. PISO de ~950ms por envio, configure o dono o que configurar;
//  2. PAUSA HUMANA de 28–45s a cada 7–11 envios (pessoa não envia
//     96 mensagens de rajada sem respirar);
//  3. ENTRE PASSES (vezes>1) espera 65–130s aleatória — nunca o
//     mesmo `delay` certinho;
//  4. ruído zero-width TAMBÉM no corpo visível (o banner continua —
//     é o cartão de visita — mas o texto nunca é byte-a-byte igual).
// Envs DIVULGAR_* permitem encolher tudo em TESTES (o piso é duro em
// produção porque é o que salva a conta).
const _envMs = (k, def) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v >= 1 ? Math.round(v) : def;
};
const _MIN_G = () => _envMs('DIVULGAR_MIN_MS', 950);                       // piso por envio
const _PAUSA_A_CADA = () => _envMs('DIVULGAR_PAUSA_A_CADA', 0) || (7 + Math.floor(Math.random() * 5)); // 7–11 envios
const _PAUSA_MIN = () => _envMs('DIVULGAR_PAUSA_MIN_MS', 28000);
const _PAUSA_MAX = () => _envMs('DIVULGAR_PAUSA_MAX_MS', 45000);
const _PASS_MIN  = () => _envMs('DIVULGAR_PASS_MIN_MS', 65000);
const _PASS_MAX  = () => _envMs('DIVULGAR_PASS_MAX_MS', 130000);
const _aleat = (a, b) => Math.max(1, Math.round(a + Math.random() * Math.max(0, b - a)));

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
async function _disparar(sock, msg, ctx, { vis, montar, vezes = 1 }) {
  const bcc = require('../botConfigCache');
  const own = _num(ctx.senderNumber);
  const grupos = (await _get(bcc, `grupos_${own}`)) || [];
  const delay = Number(await _get(bcc, `delay_${own}`)) || 1200;
  if (!grupos.length) return { ok: false, motivo: 'sem-grupos' };

  _STOP.delete(own);
  let feitos = 0, erros = 0;
  const falhas = [];
  // ritmo anti-ban: piso duro + pausas humanas (v9.13)
  const base = Math.max(delay, _MIN_G());
  let desdePausa = 0;
  let limiarPausa = _PAUSA_A_CADA();
  for (let vez = 0; vez < Math.max(1, vezes); vez++) {
    if (_STOP.has(own)) break;
    // entre passes: 65–130s aleatórios — repetir a mesma ronda a cada
    // `delay` certinho é a assinatura de multi-broadcast que a Meta pune
    if (vez > 0) await sleep(_aleat(_PASS_MIN(), _PASS_MAX()));
    for (let i = 0; i < grupos.length; i++) {
    if (_STOP.has(own)) break;
    const g = grupos[i];
    try {
      let mencoes = [], textoTag = '';
      if (vis !== 'sem') {
        const meta = await _meta(sock, g.jid);
        const { admins, membros } = _separaAdm(meta?.participants || []);
        if (vis === 'visivel') {
          // VISÍVEL: ADM vê tudo — hidetag com TODAS as tags à vista.
          mencoes = [...admins, ...membros];
          if (mencoes.length) {
            textoTag = '\n\n' + mencoes.slice(0, 200).map(pid => `@${pid.split('@')[0]}`).join(' ');
          }
        } else if (vis === 'invisivel') {
          // INVISÍVEL: menciona TODOS MENOS OS ADM — eles nem notificação
          // recebem, hidetag limpa (zero @ no texto), nada lhes salta à vista.
          mencoes = membros;
          // textoTag fica vazio de propósito.
        }
      }
      const { content } = await montar(g, textoTag, mencoes, vez);
      await sock.sendMessage(g.jid, content);
      feitos++;
    } catch (e) { erros++; falhas.push(`${g.nome || g.jid}: ${String(e.message).slice(0, 40)}`); }
    if (i + 1 < grupos.length) {
      // respiro entre envios: piso duro + PAUSA HUMANA a cada 7–11 envios
      desdePausa++;
      if (desdePausa >= limiarPausa) {
        desdePausa = 0;
        limiarPausa = _PAUSA_A_CADA();
        await sleep(_aleat(_PAUSA_MIN(), _PAUSA_MAX()));       // 28–45s
      } else {
        await _sleepJitter(base);
      }
    }
    }
  }
  const parado = _STOP.has(own);
  _STOP.delete(own);
  await _historico(sock, bcc, own, {
    quando: new Date().toISOString(), vis, delay, vezes,
    bypass: vis === 'invisivel',
    total: grupos.length * Math.max(1, vezes), grupos: grupos.length, feitos, erros, parado,
  });
  return { ok: true, total: grupos.length * Math.max(1, vezes), feitos, erros, parado, falhas, delay, vezes };
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
    `📦 Alvos: *${r.total}*${(r.vezes || 1) > 1 ? ` (🔁 vez${r.vezes}x)` : ''}`,
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
  // v9.13: presets <1s são íman de ban temporário — etiquetados como
  // perigo e o motor tem piso duro de ~950ms mesmo se eles estiverem on.
  const delayNome = { 1: '☠️ ULTRA (risco ban)', 70: '⚠️ RÁPIDO (risco ban)', 300: '⚠️ MÉDIO (risco)', 1200: '🛡️ ANTIBAN', 2000: '🐌 DEVAGAR', 5000: '🛡️ SEGURO' }[delay] || (delay < 950 ? `☠️ ${delay}ms (risco ban)` : `🔧 ${delay}ms`);

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
async function _onda(sock, msg, ctx, montar, vis, rotulo, vezes = 1) {
  const own = _num(ctx.senderNumber);
  const bcc = require('../botConfigCache');
  const grupos = (await _get(bcc, `grupos_${own}`)) || [];
  const delay = Number(await _get(bcc, `delay_${own}`)) || 1200;
  await sock.sendMessage(_alvo(ctx), {
    text: _dtox('A D I V U L G A R', [
      `🚀 Onda *${rotulo}* a correr…`,
      `📦 ${grupos.length} grupos · 🔁 ${vezes}x · ⏱️ ${delay}ms · 👁️ ${vis === 'visivel' ? 'VISÍVEL (ADM vê)' : vis === 'invisivel' ? 'INVISÍVEL (ADM não vê nada)' : 'SEM MENÇÕES'}`,
      '🛑 cancelar a qualquer momento: `!divulgarstop`',
    ]),
  }, { quoted: msg }).catch(() => {});
  const r = await _disparar(sock, msg, ctx, { vis, montar, vezes });
  const p = ctx.prefix || config.bot.prefix || '!';
  _ULTIMOS.set(own, { vis, montar });
  // v9.9: o RELATÓRIO traz botões FIXOS (quick_reply) — a onda morre
  // e já nasce a próxima acção à mão (repõe a sessão, vê stats, para).
  const textoR = _resumo(r, p);
  try {
    const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
    const m = generateWAMessageFromContent(_alvo(ctx), {
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
    await _relayBiz(sock, _alvo(ctx), m);
    return;
  } catch { /* sem interactivo → texto */ }
  await sock.sendMessage(_alvo(ctx), { text: textoR }).catch(() => {});
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

module.exports = function registerDivulgacao(_registerCase) {
  // v9.14: TODA a superfície da divulgação fala no PV do dono quando
  // o comando veio de grupo — ADM deixa de VER painéis e botões (e de
  // os achar «mortos» ao carregar).
  const registerCase = (names, fn, ...resto) => _registerCase(names, async (argz) => {
    if (argz && argz.sock && argz.ctx) {
      const { sock, ctx } = argz;
      const reply0 = argz.reply;
      argz.reply = (t) => {
        const alvo = _alvo(ctx);
        return sock.sendMessage(alvo, { text: t }).catch(() => reply0 ? reply0(t) : null);
      };
    }
    return fn(argz);
  }, ...resto);
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

    // ── 4 PASSOS ESCRITOS (o assistente âncora — o teu modelo) ──
    const texto = _textoDe(msg, args);
    if (!grupos.length && texto) {
      return reply(_dtox('D I V U L G A R', [
        '⚠️ *Sem grupos registados.*',
        'PASSO 1: adiciona primeiro:',
        `   \`${p}divulgar add\` (neste grupo) · \`${p}divulgar addall\` (todos automático)`,
      ]));
    }
    if (!texto) {
      // já tem fluxo? retoma o passo actual em vez de recomeçar
      const key = _kFluxo(ctx);
      _FLUXO.set(key, { passo: 'texto', expira: Date.now() + TTL_FLUXO, own, alvo: _alvo(ctx) });
      return reply(
        '✨━━━━━━━━━━━━━━━━━━━━✨\n' +
        '✨ *Passo 1/4 — O TEXTO DA DIVULGAÇÃO*\n' +
        '📝 Envia o texto que queres divulgar agora.\n' +
        '(para foto/vídeo/doc/áudio: responde à mídia com `!divulgarfoto…`)\n\n' +
        `❌ \`${p}cancelar\` ou escreve *cancelar* para sair\n` +
        '✨━━━━━━━━━━━━━━━━━━━━✨');
    }
    _FLUXO.set(_kFluxo(ctx), { passo: 'vezes', texto, expira: Date.now() + TTL_FLUXO, own, alvo: _alvo(ctx) });
    return reply(
      '✅ *TEXTO SALVO COM SUCESSO!*\n\n' +
      `📝 *Prévia:*\n> ${texto.slice(0, 140)}${texto.length > 140 ? '…' : ''}\n\n` +
      '✨ *Passo 2/4 — Quantas VEZES enviar?*\n' +
      '🔁 Escreve um número de *1 a 10*\n' +
      '`1` = envia 1x, `5` = envia 5x **em cada grupo**\n\n' +
      '❌ `.cancelar` para cancelar');

  // fim do case divulgar (o assistente continua por ESCRITO, via consumir)
  });

  // ── ATALHO RÁPIDO ──
  registerCase(['divulgarrapido'], async ({ sock, msg, ctx, args, isOwner, reply }) => {
    if (!isOwner) return deny(reply);
    const vis = /^(visivel|visível)$/i.test(args[0] || '') ? 'visivel' : /^invis/i.test(args[0] || '') ? 'invisivel' : 'sem';
    const texto = _textoDe(msg, args.slice(1));
    if (!texto) return reply(`☣️ \`${ctx.prefix || config.bot.prefix}divulgarrapido visivel|invisivel <texto>\` — a mensagem vai de imediato.`);
    await _onda(sock, msg, ctx, async (_g, tag, mencoes) => ({
      content: { text: _corpoDesp(texto, vis, tag), mentions: vis === 'sem' ? [] : mencoes },
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
        content: { text: _corpoDesp(ondaTexto, vis, tag), mentions: vis === 'sem' ? [] : mencoes },
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
        content: {
          ...midia,
          caption: vis === 'visivel'
            ? `${midia.caption ? midia.caption + '\n\n' : ''}☣️ ${tag ? tag : ''}`.trim()
            : _ruido(midia.caption || '☣'),
          mentions: vis === 'sem' ? [] : mencoes,
        },
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

// ════════════════════════════════════════════════════════════
// ASSISTENTE ESCRITO — consumir() é chamado pelo commandHandler
// em TODA mensagem; só actua quando há sessão viva (chat+dono).
// Passos: texto → vezes(1-10) → cartão de grupos → visivel/invisivel
// Em qualquer altura: `.cancelar` / `cancelar` aborta.
// ════════════════════════════════════════════════════════════
async function consumir(sock, msg, ctx, text) {
  let key = _kFluxo(ctx);
  let sess = _FLUXO.get(key);
  // v9.14: assistente arranca no grupo mas fala no PV — se o dono
  // respondeu no privado dele, a sessão migra (ADM continua cego).
  if (!sess && ctx.remoteJid === _pv(ctx)) {
    const alvoNum = `|${_num(ctx.senderNumber)}`;
    for (const [k, s2] of _FLUXO) {
      if (k.endsWith(alvoNum)) { _FLUXO.delete(k); sess = s2; _FLUXO.set(key, s2); break; }
    }
  }
  if (!sess) return false;
  if (Date.now() > sess.expira) { _FLUXO.delete(key); return false; }
  const alvo = sess.alvo || ctx.remoteJid;   // respostas sempre no PV/quando começou

  // é subcomando real com prefixo (ex.: !divulgarhistorico)? Não toca —
  // excepto o cancelar universal (esse trava tudo, com ou sem prefixo).
  const raw = String(text || '').trim();
  const t = raw.toLowerCase().replace(/^[.!·/#]+/, '');
  if (/^cancel(ar|e)$/.test(t)) {
    _FLUXO.delete(key);
    await sock.sendMessage(alvo, {
      text: _dtox('A S S I S T E N T E  A B O R T A D O', ['🛑 Saíste do assistente de divulgação. Nada foi enviado.']),
    }).catch(() => {});
    return true;
  }
  if (/^[.!·/#]/.test(raw)) return false;   // comandos reais passam sempre
  if (!raw && sess.passo !== 'texto') return false;
  sess.expira = Date.now() + TTL_FLUXO;

  // ── PASSO 1/4: o texto chega livre ──
  if (sess.passo === 'texto') {
    // mídia com legenda conta como texto (a onda não sai ainda)
    if (!raw) return true;
    sess.texto = raw.slice(0, 4000); sess.passo = 'vezes';
    await sock.sendMessage(alvo, {
      text:
        '✅ *TEXTO SALVO COM SUCESSO!*\n\n' +
        `📝 *Prévia:*\n> ${sess.texto.slice(0, 140)}${sess.texto.length > 140 ? '…' : ''}\n\n` +
        '✨ *Passo 2/4 — Quantas VEZES enviar?*\n' +
        '🔁 Escreve um número de *1 a 10*\n' +
        '`1` = envia 1x, `5` = envia 5x **em cada grupo**\n\n' +
        '❌ `.cancelar` para cancelar',
    }, { quoted: msg }).catch(() => {});
    return true;
  }

  // ── PASSO 2/4: vezes 1-10 ──
  if (sess.passo === 'vezes') {
    const n = /^0?(\d{1,2})$/.test(t) ? Math.min(10, Math.max(1, parseInt(t, 10))) : 0;
    if (!n) {
      await sock.sendMessage(alvo, {
        text: '🔁 Só aceito um número de *1 a 10* — escreve o número (ou `.cancelar`).',
      }).catch(() => {});
      return true;
    }
    sess.vezes = n; sess.passo = 'vis';
    const bcc = require('../botConfigCache');
    const grupos = (await _get(bcc, `grupos_${sess.own}`)) || [];
    const nomes = grupos.slice(0, 15).map(g => `• ${g.nome}`);
    if (grupos.length > 15) nomes.push(`• ... e mais ${grupos.length - 15} grupos`);
    await sock.sendMessage(alvo, {
      text:
        '✨━━━━━━━━━━━━━━━━━━━━✨\n' +
        `✅  *GRUPOS SELECIONADOS: ${grupos.length}*\n` +
        '✨━━━━━━━━━━━━━━━━━━━━✨\n\n' +
        `📝 Texto: ${sess.texto.slice(0, 60)}${sess.texto.length > 60 ? '…' : ''}\n` +
        `🔁 Vezes: *${n}x*\n` +
        `📦 Grupos: *${grupos.length}* (seus, isolado)\n\n` +
        nomes.join('\n') + '\n\n' +
        '✨  *Passo 4/4 — VISÍVEL OU INVISÍVEL?*\n\n' +
        '👁️  Escreve *visivel* = marca TODOS no grupo (hidetag à vista — o ADM vê)\n' +
        '👁️‍🗨️  Escreve *invisivel* = marca TODOS MENOS ADM — eles não recebem nada,\n' +
        '      hidetag limpa + texto único por grupo (bypass activo)\n\n' +
        '💡 *Diferença:*\n' +
        '• Visível: todos mencionados, ADM recebe notificação\n' +
        '• Invisível: só membros mencionados, ADM nem desconfia\n\n' +
        '❌ `.cancelar` para cancelar\n' +
        '✨━━━━━━━━━━━━━━━━━━━━✨',
    }, { quoted: msg }).catch(() => {});
    return true;
  }

  // ── PASSO 3/4 (o 4º da referência): visiblidade ──
  if (sess.passo === 'vis') {
    const vis = /^invis|^i$/.test(t) ? 'invisivel' : /^vis|^v$/.test(t) ? 'visivel' : '';
    if (!vis) {
      await sock.sendMessage(alvo, {
        text: '👁️ Escreve *visivel* ou *invisivel* — ou `.cancelar` para abortar.',
      }).catch(() => {});
      return true;
    }
    _FLUXO.delete(key);
    const texto = sess.texto, vezes = sess.vezes || 1;
    await _onda(sock, msg, ctx, async (_g, tag, mencoes) => ({
      content: { text: _corpoDesp(texto, vis, tag), mentions: mencoes },
    }), vis, 'assistente', vezes);
    return true;
  }

  return false;
}

module.exports.consumir = consumir;
