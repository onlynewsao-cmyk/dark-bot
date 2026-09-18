/**
 * DARK BOT — Aura Vigilante (v7.96) 👁️
 * Ela VÊ, LEMBRA e CONTA ao Dark — e só faz aquilo que ele permitir.
 *
 * 1) PERMISSÕES (persistidas, togglavéis com !permitir <nome> on/off):
 *      entrada          — avisar "ENTREI no grupo X" sempre que ela entra
 *      aluguel          — avisos 3d/1d/expirado com cartão de renovar
 *      interesse        — "o contacto X quer alugar/ser VIP/procurou-te"
 *      convite          — links recebidos viram cartão ✅entrar/❌recusar
 *      partilharnumero  — ela pode DAR o número do Dark a quem o procura
 *      (default: todas as AVISADORAS ligadas; partilharnumero DESLIGADO)
 *
 * 2) MEMÓRIA quantitativa: mensagens por grupo/dia e comandos por nome —
 *    o Dono pergunta em conversa ("quantos grupos tenho? comandos mais
 *    usados? grupos mais ativos? inativos? com aluguel/sem? em trial?")
 *    e ela responde com números verdadeiros.
 *
 * 3) INTERESSE: frases de quem quer alugar/ser VIP/falar com o dono —
 *    notificação deduplicada (6h por tema+contacto). Se partilharnumero
 *    estiver ligado e procurarem o dono, ela manda o vCard do Dark.
 *
 * 4) CONVITE chegado em PV → cartão de selecção ao Dono (formato da
 *    lista do menu): [✅ Entrar | ❌ Recusar], 24h para decidir.
 *
 * Persistência: data/aura_vigilante.json (graças ao ambiente
 * AURA_VIGILANTE_FILE para testes). Escrevas debounceadas (90s).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FILE = process.env.AURA_VIGILANTE_FILE ||
  path.join(__dirname, '..', '..', 'data', 'aura_vigilante.json');

const PERMS_DEFAULT = {
  entrada: true,
  aluguel: true,
  interesse: true,
  convite: true,
  partilharnumero: false,
};

const _st = {
  perms: { ...PERMS_DEFAULT },
  msgs: {},            // jid → { AAAAMMDD: n }
  cmds: {},            // comando → n
  vistoInteresse: {},  // chave → ts (dedupe)
  convitesEmitidos: {},// code+'|'+de → ts (dedupe 24h)
  _loaded: false,
  _dirty: false,
};

// ── Persistência ──────────────────────────────────────────────
function _cortarVelho(obj, keepDias = 14) {
  const cutoff = Date.now() - keepDias * 86400000;
  for (const [k, dias] of Object.entries(obj || {})) {
    for (const d of Object.keys(dias || {})) {
      const ts = new Date(d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) + 'T00:00:00Z').getTime();
      if (!Number.isFinite(ts) || ts < cutoff) delete dias[d];
    }
  }
}
function carregar() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (j && typeof j === 'object') {
      _st.perms = { ...PERMS_DEFAULT, ...(j.perms || {}) };
      _st.msgs = j.msgs || {};
      _st.cmds = j.cmds || {};
      _st.vistoInteresse = j.vistoInteresse || {};
      _st.convitesEmitidos = j.convitesEmitidos || {};
      _cortarVelho(_st.msgs);
    }
  } catch {}
  _st._loaded = true;
}
let _flushTimer = null;
function _marcarSujo() {
  _st._dirty = true;
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => { _flushTimer = null; flush(); }, 90 * 1000);
  _flushTimer.unref?.();
}
function flush() { return guardar(); }
function guardar() {
  if (!_st._loaded) carregar();
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({
      perms: _st.perms, msgs: _st.msgs, cmds: _st.cmds,
      vistoInteresse: _st.vistoInteresse, convitesEmitidos: _st.convitesEmitidos,
    }));
    _st._dirty = false;
  } catch {}
}

// ── Permissões ────────────────────────────────────────────────
function permissoes() { if (!_st._loaded) carregar(); return { ..._st.perms }; }
function perm(nome) { return !!permissoes()[String(nome).toLowerCase()]; }
function definirPerm(nome, on) {
  if (!_st._loaded) carregar();
  const k = String(nome || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!(k in PERMS_DEFAULT)) return null;
  _st.perms[k] = !!on;
  _marcarSujo(); guardar();
  return k;
}
const _PERM_DESCR = {
  entrada: 'avisar onde a Aura entrou (grupo, quem a meteu)',
  aluguel: 'avisos de aluguel (3d/1d/expirou) + cartão renovar',
  interesse: '"contacto X quer alugar/VIP/procurou-te"',
  convite: 'link recebido → cartão ✅entrar/❌recusar',
  partilharnumero: 'dar o teu número a quem te procura',
};
function listaPermissoesTexto() {
  const p = permissoes();
  return Object.keys(PERMS_DEFAULT)
    .map(k => `• *${k}* — ${p[k] ? '✅ ligado' : '⛔ desligado'}\n  ${(_PERM_DESCR[k])}`);
}

// ── Contadores (memória quantitativa) ─────────────────────────
function _dia(d = new Date()) { return d.toISOString().slice(0, 10).replace(/-/g, ''); }
function contaMensagem(groupJid) {
  if (!_st._loaded) carregar();
  if (!groupJid || !String(groupJid).endsWith('@g.us')) return;
  const d = _dia();
  (_st.msgs[groupJid] = _st.msgs[groupJid] || {})[d] = (_st.msgs[groupJid][d] || 0) + 1;
  _marcarSujo();
}
function registaComando(nome, groupJid) {
  if (!_st._loaded) carregar();
  const n = String(nome || '').toLowerCase().trim();
  if (!n || n.length > 24) return;
  _st.cmds[n] = (_st.cmds[n] || 0) + 1;
  _marcarSujo();
}
function topComandos(n = 10) {
  if (!_st._loaded) carregar();
  return Object.entries(_st.cmds).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([cmd, tot]) => ({ cmd, tot }));
}
function _somaDias(jid, dias = 7) {
  const dd = _st.msgs[jid] || {};
  let total = 0;
  for (let i = 0; i < dias; i++) {
    const d = new Date(Date.now() - i * 86400000);
    total += dd[_dia(d)] || 0;
  }
  return total;
}

// ── Detector de interesse ─────────────────────────────────────
// Tipos: 'aluguel' | 'vip' | 'dono'  ('' = conversa normal)
const RE_ALUGUEL = /\b(?:quanto (?:custa|é|fica)|pre[çc]o|valores?|pacotes?|planos?|como (?:posso )?alugo|quero alugar|alugar (?:o|a|esse|este)|ativar (?:o )?bot|bot (?:no|para o|para)\s+grupo|add (?:o )?bot|adicionar o bot)\b/i;
const RE_VIP     = /\b(?:ser vip|quero vip|como (?:ser|fico) vip|assinar|subscri[çc][aã]o|mensalidade)\b/i;
const RE_DONO    = /\b(?:falar com o dono|contacto d[oe] dono|n[úu]mero d[oe] dono|quem (?:é|fez|criou) (?:o|esse|este)? ?bot|quero falar com (?:o )?(?:dono|criador|admin)|dono do bot|criador do bot)\b/i;
function detectarInteresse(texto) {
  const t = String(texto || '');
  if (t.length < 6 || t.length > 600) return '';
  if (RE_ALUGUEL.test(t)) return 'aluguel';
  if (RE_VIP.test(t)) return 'vip';
  if (RE_DONO.test(t)) return 'dono';
  return '';
}
const INTERESSE_TITULO = {
  aluguel: '🏠 interessado no ALUGUEL',
  vip: '💎 interessado em ser VIP',
  dono: '👀 está a procurar o DONO',
};
const TTL_INTERESSE = 6 * 3600 * 1000;
function deveNotificarInteresse(chave, ttl = TTL_INTERESSE) {
  if (!_st._loaded) carregar();
  const ts = _st.vistoInteresse[chave] || 0;
  if (Date.now() - ts < ttl) return false;
  _st.vistoInteresse[chave] = Date.now();
  _marcarSujo();
  return true;
}

// ── Convites recebidos (link em PV) ───────────────────────────
const RE_LINK_GRUPO = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{8,32})/i;
function extrairConvite(texto) {
  const m = String(texto || '').match(RE_LINK_GRUPO);
  return m ? m[1] : '';
}
const TTL_CONVITE = 24 * 3600 * 1000;
function deveEmitirConvite(code, de, ttl = TTL_CONVITE) {
  if (!_st._loaded) carregar();
  const k = `${code}|${de}`;
  const ts = _st.convitesEmitidos[k] || 0;
  if (Date.now() - ts < ttl) return false;
  _st.convitesEmitidos[k] = Date.now();
  _marcarSujo();
  return true;
}

// ── Relatórios de balanço (o Dono pergunta, ela conta) ────────
function _nome(jid, participantes) {
  const p = (participantes || []).find(g => g && g.jid === jid);
  return p?.subject || jid.split('@')[0];
}

/** "quantos grupos tenho" — contas actuais + decomposição. */
function resumoGeral({ participantes = [], comAluguel = [], comTrial = [] } = {}) {
  const hosp = new Set(comAluguel);
  const tri = new Set(comTrial);
  const total = participantes.length;
  const livre = participantes.filter(g => !hosp.has(g.jid) && !tri.has(g.jid)).length;
  return [
    `📊 *BALANÇO DOS GRUPOS*`,
    ``,
    `🏘️ Grupos onde estou: *${total}*`,
    `🏠 Com aluguel activo: *${comAluguel.length}*`,
    `🎁 Em trial: *${comTrial.length}*`,
    `🧊 Sem aluguel (livres): *${livre}*`,
  ].join('\n');
}

function linhasGrupos(titulo, jids, participantes, max = 12) {
  const linhas = (jids || []).slice(0, max).map((j, i) => `*${i + 1}.* ${_nome(j, participantes)}`);
  return [`${titulo} (total: ${(jids || []).length})`, ...(linhas.length ? linhas : ['— nenhum —'])].join('\n');
}

function mesgGruposAtivos(participantes = [], n = 10) {
  const orden = [...participantes]
    .map(g => ({ jid: g.jid, nome: g.subject || g.jid.split('@')[0], total: _somaDias(g.jid, 7) }))
    .sort((a, b) => b.total - a.total);
  const quentes = orden.filter(g => g.total > 0).slice(0, n);
  const frios = orden.filter(g => g.total === 0);
  const linhas = quentes.map((g, i) => `*${i + 1}.* ${g.nome} — ${g.total} msg/7d`);
  return [
    `🔥 *GRUPOS MAIS ACTIVOS* (últimos 7 dias)`,
    ...(linhas.length ? linhas : ['— ainda sem movimento contado —']),
    ``,
    `🧊 Inactivos (0 msg): *${frios.length}*${frios.length ? ' — ' + frios.slice(0, 5).map(f => f.nome).join(', ') + (frios.length > 5 ? '…' : '') : ''}`,
  ].join('\n');
}

function mesgComandosMaisUsados(n = 10) {
  const t = topComandos(n);
  if (!t.length) return '📊 Ainda não tenho comandos contados nesta sessão.';
  const linhas = t.map((c, i) => `*${i + 1}.* ${c.cmd} — ${c.tot}x`);
  return [`📊 *COMANDOS MAIS USADOS*`, ...linhas].join('\n');
}

// ── Detector de perguntas de balanço do Dono ──────────────────
// Devolve: 'geral' | 'ativos' | 'inativos' | 'comandos' | 'comaluguel' | 'semaluguel' | 'trial' | ''
function detectarPerguntaBalanço(texto) {
  const t = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (t.length > 300) return '';
  if (/\bcomandos? (que )?usam mais|comandos? mais usados|o que (mais )?usam|mais pedidos\b/.test(t)) return 'comandos';
  if (/\bgrupos? (mais )?ativ|movimento\b/.test(t)) return 'ativos';
  if (/\bgrupos? inativ|parados?\b/.test(t) && /grupo/i.test(t)) return 'inativos';
  if (/\btrials?\b/.test(t)) return 'trial';
  if (/\bsem aluguel\b/.test(t)) return 'semaluguel';
  if (/\bcom aluguel\b|alugados|aluga(nos)+ grupos/.test(t)) return 'comaluguel';
  if (/\bgrupos?\b/.test(t) && /\bquantos|lista|balan|está|estas|tenho|tens\b/.test(t)) return 'geral';
  return '';
}

module.exports = {
  carregar, guardar, flush, _st, FILE, PERMS_DEFAULT,
  permissoes, perm, definirPerm, listaPermissoesTexto,
  contaMensagem, registaComando, topComandos,
  detectarInteresse, deveNotificarInteresse, INTERESSE_TITULO, TTL_INTERESSE,
  extrairConvite, deveEmitirConvite, TTL_CONVITE,
  resumoGeral, linhasGrupos, mesgGruposAtivos, mesgComandosMaisUsados,
  detectarPerguntaBalanço,
  // só para testes
  _reset(file) {
    _st.perms = { ...PERMS_DEFAULT }; _st.msgs = {}; _st.cmds = {};
    _st.vistoInteresse = {}; _st.convitesEmitidos = {};
    _st._loaded = true; _st._dirty = false;
  },
};
