'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — Anti-Fobados v1 (incoming-cases)                ║
 * ║   Port nativo de "Anti-fobados.txt" (antcarente)             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Duas frentes:
 *  1. onMessage — apaga + bane quem envia divulgação oculta: links em
 *     botões/cards/bio/footer (qualquer campo de texto da mensagem),
 *     "clique na imagem" ou pagamento disfarçado com link.
 *     Quem apenas CITOU (quotedMessage) uma infração não é punido.
 *  2. onJoin — bane à entrada números com DDI na blacklist do grupo
 *     (fobaBlacklist, ex: ['63']).
 *
 * Imunes: dono do bot, número do bot, admins do grupo.
 * Exige: bot admin do grupo + `antifoba` ligado (GroupSettings).
 */

const PROCESSADOS = new Map();
const TEMPO_DEDUP_MS = 60_000;

const CAMPOS_DE_TEXTO = new Set([
  'conversation', 'text', 'caption', 'contentText', 'description', 'title',
  'footerText', 'fileName', 'name', 'displayText', 'matchedText',
  'canonicalUrl', 'sourceUrl', 'body', 'selectedDisplayText',
  'hydratedContentText', 'paramsJson',
]);

const REGEX_LINK = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|whatsapp\.com\/(?:channel|invite)\/|wa\.me\/|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|gg|io|me|app|site|link|xyz|br)(?:\/|\b))/i;

function somenteDigitos(valor) {
  return String(valor || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function botName() {
  try { return require('./darkUtils').botName || require('../config').bot.name || 'DARK BOT'; }
  catch { return 'DARK BOT'; }
}

function ownerNumbers() {
  const nums = new Set();
  try {
    const config = require('../config');
    if (config.owner?.number) nums.add(String(config.owner.number).replace(/\D/g, ''));
    if (config.bot?.number) nums.add(String(config.bot.number).replace(/\D/g, ''));
  } catch {}
  return nums;
}

function limparProcessados() {
  const agora = Date.now();
  for (const [chave, criadoEm] of PROCESSADOS) {
    if (agora - criadoEm > TEMPO_DEDUP_MS) PROCESSADOS.delete(chave);
  }
}

function reservar(chave) {
  limparProcessados();
  if (PROCESSADOS.has(chave)) return false;
  PROCESSADOS.set(chave, Date.now());
  return true;
}

// ── Análise de conteúdo ──────────────────────────────────────────

function coletarConteudo(valor, estado, caminho = [], profundidade = 0) {
  if (!valor || profundidade > 14 || estado.textos.length >= 250) return;
  if (Buffer.isBuffer(valor) || valor instanceof Uint8Array) return;
  if (Array.isArray(valor)) {
    for (const item of valor) coletarConteudo(item, estado, caminho, profundidade + 1);
    return;
  }
  if (typeof valor !== 'object') return;
  for (const [chave, conteudo] of Object.entries(valor)) {
    if (chave === 'quotedMessage') continue; // citar infração não é infração
    if (chave === 'requestPaymentMessage') estado.temPagamentoDisfarcado = true;
    if (typeof conteudo === 'string') {
      const ehCampoVisivel = CAMPOS_DE_TEXTO.has(chave);
      const ehUrlDeBotao = chave === 'url' && caminho.some(p => /button|externalAdReply|cta/i.test(p));
      if ((ehCampoVisivel || ehUrlDeBotao) && conteudo.length <= 50000) estado.textos.push(conteudo);
      continue;
    }
    coletarConteudo(conteudo, estado, [...caminho, chave], profundidade + 1);
  }
}

function analisarMensagem(message) {
  const estado = { textos: [], temPagamentoDisfarcado: false };
  coletarConteudo(message, estado);
  const texto = estado.textos.join('\n');
  const normalizado = texto.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .toLowerCase();
  const temLink = REGEX_LINK.test(texto);
  const temCliqueNaImagem = normalizado.includes('clique na imagem');
  if (estado.temPagamentoDisfarcado && (temLink || temCliqueNaImagem)) {
    return { codigo: 'pagamento_com_link', mensagem: 'Pagamento disfarçado com link de divulgação!' };
  }
  if (temLink || temCliqueNaImagem) {
    return { codigo: 'divulgacao', mensagem: 'Tentou divulgar sem permissão!' };
  }
  return null;
}

// ── Participantes / permissões ───────────────────────────────────

function jidsDoParticipante(participante) {
  if (!participante) return [];
  if (typeof participante === 'string') return [participante];
  return [participante.id, participante.jid, participante.lid, participante.phoneNumber, participante.pn]
    .filter(v => typeof v === 'string' && v);
}

function encontrarParticipante(participantes, jid) {
  if (!jid) return null;
  return (participantes || []).find(p => {
    const rel = jidsDoParticipante(p);
    if (rel.includes(jid)) return true;
    if (String(jid).endsWith('@lid')) return false;
    const numero = somenteDigitos(jid);
    return numero && rel.filter(i => !i.endsWith('@lid')).some(i => somenteDigitos(i) === numero);
  }) || null;
}

function ehAdmin(p) {
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

function ehConfiavel(sender, participante, botId, botNum) {
  const num = somenteDigitos(sender);
  if (num && (num === somenteDigitos(botId) || num === String(botNum || ''))) return true;
  if (num && ownerNumbers().has(num)) return true;
  return ehAdmin(participante);
}

function botEhAdmin(meta, botId, botNum) {
  const bn = somenteDigitos(botId) || String(botNum || '');
  const bot = (meta?.participants || []).find(p =>
    jidsDoParticipante(p).some(j => somenteDigitos(j) === bn));
  return ehAdmin(bot);
}

// ── Mensagens ────────────────────────────────────────────────────

function painelAviso(alvo, motivo, acao) {
  const numero = somenteDigitos(alvo) || 'desconhecido';
  return [
    `╔━◈『 *${botName()} • Anti-Fobados* 』◈`,
    `┃`,
    `┃ 𝄞 *Ação   »* ${acao}`,
    `┃ 𝄞 *Usuário »* @${numero}`,
    `┃`,
    `┃ 𝄞 *Motivo  »* ${motivo}`,
    `┗━◈`,
  ].join('\n');
}

async function getSettings(groupJid) {
  try {
    const GroupSettings = require('../database/models/GroupSettings');
    return await GroupSettings.findOne({ groupJid }).lean().catch(() => null);
  } catch { return null; }
}

// ── Entradas públicas ────────────────────────────────────────────

/**
 * Chamado pelo messageRouter para CADA mensagem (barato: sai cedo se
 * não for grupo ou se o recurso estiver desligado).
 */
async function check(sock, msg) {
  try {
    const grupoId = msg?.key?.remoteJid;
    if (!grupoId?.endsWith('@g.us')) return false;
    if (msg.key?.fromMe) return false;
    const sender = msg.key?.participant;
    if (!sender) return false;

    const gs = await getSettings(grupoId);
    if (!gs?.antifoba) return false;

    const violacao = analisarMensagem(msg.message);
    if (!violacao) return false;

    const chave = `foba:msg:${grupoId}:${sender}:${msg.key.id || ''}`;
    if (!reservar(chave)) return true;

    const meta = await sock.groupMetadata(grupoId).catch(() => null);
    if (!meta) { PROCESSADOS.delete(chave); return false; }
    const botId = sock.user?.id || '';
    let botNum = '';
    try { botNum = require('../config').bot.number || ''; } catch {}
    if (!botEhAdmin(meta, botId, botNum)) return false; // sem poder, sem ação

    const participante = encontrarParticipante(meta.participants, sender);
    if (ehConfiavel(sender, participante, botId, botNum)) return false;

    await sock.sendMessage(grupoId, { delete: msg.key }).catch(() => {});
    try {
      await sock.groupParticipantsUpdate(grupoId, [sender], 'remove');
    } catch (e) {
      console.error(`[antifoba] Não foi possível banir ${sender}:`, e.message?.slice(0, 80));
      return true;
    }
    await sock.sendMessage(grupoId, {
      text: painelAviso(sender, violacao.mensagem, 'Mensagem apagada e usuário banido'),
      mentions: [sender],
    }).catch(() => {});
    return true;
  } catch (e) {
    console.error('[antifoba]', e?.message?.slice(0, 100));
    return false;
  }
}

/**
 * Chamado pelo groupEvents quando há `add` (lista de DDIs na blacklist).
 */
async function onJoin(sock, groupJid, participants, meta) {
  const removidos = [];
  try {
    if (!groupJid?.endsWith('@g.us')) return removidos;
    const gs = await getSettings(groupJid);
    if (!gs?.antifoba) return removidos;
    const blacklist = (gs.fobaBlacklist?.length ? gs.fobaBlacklist : ['63'])
      .map(d => String(d).replace(/\D/g, '')).filter(Boolean);
    if (!blacklist.length) return removidos;

    const metadata = meta || await sock.groupMetadata(groupJid).catch(() => null);
    if (!metadata) return removidos;
    const botId = sock.user?.id || '';
    let botNum = '';
    try { botNum = require('../config').bot.number || ''; } catch {}
    if (!botEhAdmin(metadata, botId, botNum)) return removidos;

    for (const entrada of participants || []) {
      const jidEntrada = typeof entrada === 'string' ? entrada : (jidsDoParticipante(entrada)[0] || '');
      if (!jidEntrada) continue;
      const participante = encontrarParticipante(metadata.participants, jidEntrada);
      const telefone = somenteDigitos(
        participante?.phoneNumber || participante?.pn ||
        (jidEntrada.endsWith('@s.whatsapp.net') ? jidEntrada : ''));
      if (!telefone || !blacklist.some(ddi => telefone.startsWith(ddi))) continue;
      if (ehConfiavel(jidEntrada, participante, botId, botNum)) continue;

      const chave = `foba:entrada:${groupJid}:${jidEntrada}`;
      if (!reservar(chave)) continue;
      try {
        await sock.groupParticipantsUpdate(groupJid, [jidEntrada], 'remove');
        removidos.push(jidEntrada);
      } catch (e) {
        console.error(`[antifoba] Não foi possível banir +${telefone}:`, e.message?.slice(0, 80));
        continue;
      }
      await sock.sendMessage(groupJid, {
        text: painelAviso(jidEntrada, `Número com DDI +${telefone.slice(0, 2)} na blacklist!`, 'Entrada bloqueada e usuário banido'),
        mentions: [jidEntrada],
      }).catch(() => {});
    }
  } catch (e) {
    console.error('[antifoba:onJoin]', e?.message?.slice(0, 100));
  }
  return removidos;
}

module.exports = { check, onJoin, analisarMensagem, _internals: { PROCESSADOS } };
