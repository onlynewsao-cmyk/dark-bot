'use strict';
/**
 * AURA GRUPO — promote/demote a sério.
 *
 * O Dark dizia "me adiciona com ADM" e a Aura respondia "já te
 * adicionei" sem chamar o WhatsApp, ou inventava que "só o dono
 * do grupo pode". Mentira. Um admin do WhatsApp PODE promover.
 * Aqui executa-se `groupParticipantsUpdate` e só se diz que
 * fez se o WhatsApp aceitou.
 */

function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function baseId(jid) {
  return String(jid || '').split(':')[0].split('@')[0];
}

function soDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

function idsIguais(a, b) {
  if (!a || !b) return false;
  const ra = baseId(a);
  const rb = baseId(b);
  if (ra && rb && ra === rb) return true;
  const da = soDigitos(ra);
  const db = soDigitos(rb);
  return !!(da && db && da.length >= 8 && da === db);
}

function botIds(sock) {
  const id = sock?.user?.id || '';
  const lid = sock?.user?.lid || '';
  return {
    num: baseId(id),
    lid: baseId(lid),
    jid: id,
  };
}

function acharNoGrupo(meta, hints) {
  const parts = meta?.participants || [];
  const lista = (Array.isArray(hints) ? hints : [hints]).filter(Boolean);
  for (const p of parts) {
    const candidatos = [p.id, p.jid, p.phoneNumber, p.lid];
    for (const c of candidatos) {
      for (const h of lista) {
        if (idsIguais(c, h)) return p;
      }
    }
  }
  return null;
}

function botEhAdmin(sock, meta) {
  const b = botIds(sock);
  const p = acharNoGrupo(meta, [b.num, b.lid, b.jid]);
  return !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
}

function participanteEhAdmin(p) {
  return !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
}

function jidDoSender(ctx) {
  return ctx.senderJid
    || (ctx.senderNumber ? ctx.senderNumber + '@s.whatsapp.net' : '')
    || '';
}

function hintsDoSender(ctx) {
  return [
    ctx.senderJid,
    ctx.senderNumber,
    ctx.senderLid,
    ctx.senderLid ? ctx.senderLid + '@lid' : '',
    ctx.senderNumber ? ctx.senderNumber + '@s.whatsapp.net' : '',
  ].filter(Boolean);
}

function mencoes(msg) {
  const m = msg?.message || {};
  return m.extendedTextMessage?.contextInfo?.mentionedJid
    || m.imageMessage?.contextInfo?.mentionedJid
    || m.videoMessage?.contextInfo?.mentionedJid
    || m.interactiveResponseMessage?.contextInfo?.mentionedJid
    || [];
}

// Ações de grupo só podem ser avaliadas quando o remetente chamou a AURA.
// O cargo de admin, sozinho, não transforma conversa em comando.
function isDirectedToAura({ isGroup = false, isBotMentioned = false, isReplyToAura = false, dest = null } = {}) {
  return !isGroup || !!(isBotMentioned || isReplyToAura || dest?.directToAura === true || dest?.vocativo === true);
}

// Filtro conservador para os routers lexicais: negações, perguntas de
// significado e exemplos citados não são ordens de execução.
const RE_NEGATED_ACTION = /\b(?:nao|nunca|jamais)\b/i;
const RE_META_ACTION = /^(?:o que|que significa|significa|como|por que|porque|qual|quem|quando|onde|sera que|queria saber|quero saber|preciso saber|gostava de saber|explica|exemplo|imagina|fala sobre|falar sobre|fala de|falar de|pergunta sobre|perguntei se|perguntou se|diz que|disse que|falou que|conta como|conta que|ele disse|ela disse|alguem disse|eu disse|disse|perguntei|perguntaram|escrevi|a frase|o comando|a palavra|pensei que)\b/i;
const RE_QUOTED_ACTION = /^["'“”‘’`]/;
const RE_HYPOTHETICAL_ACTION = /\b(?:por exemplo|foi so exemplo|como exemplo|imagina(?:ndo)?|supondo|suponhamos|hipotetic(?:o|a|amente)?|se eu disser|e se|caso eu|caso|se|brincadeira|estou a brincar|era brincadeira|what if|suppose|hypothetically)\b/i;
function normalizarTextoComando(texto) {
  return norm(texto)
    .replace(/^(?:aura|a aura|da aura|pra aura|com a aura)[\s,:;]*\s*/i, '')
    .replace(/^(?:sim|ok|certo)[,\s]+(?=(?:fecha|fechar|abre|abrir|promove|promover|rebaixa|rebaixar|adiciona|adicionar|bana|banir|marca|marcar|manda|mandar|envia|enviar|faz|fazer|cria|criar|muda|mudar|troca|trocar|altera|alterar|segue|seguir|sai|sair|entra|entrar|mostra|mostrar|lista|listar|liga|ligar|chama|chamar|reage|reagir|me\s+(?:adiciona|poe|mete|faz|da|promove|rebaixa|chama|manda|fala))\b)/i, '')
    .replace(/^(?:por favor|please)[,\s]+/i, '')
    .replace(/^(?:sera que\s+)?(?:podes|pode|consegues|consegue)\s+(?!sim\b|fazer\b)/i, '')
    .trim();
}
function isClearActionText(texto) {
  const t = normalizarTextoComando(texto);
  return !!t && t.length <= 280 && !RE_NEGATED_ACTION.test(t) && !RE_META_ACTION.test(t) && !RE_QUOTED_ACTION.test(t) && !RE_HYPOTHETICAL_ACTION.test(t);
}
const RE_CONTEXTUAL_REPLY = /^(?:faz isso|faz assim|faz aquilo|faz o mesmo|repete(?: isso| aquilo)?|manda de novo|envia de novo|faz novamente|continua(?: assim)?|segue(?: isso| assim)?|vai la|vai entao|como antes|do mesmo jeito|igual|isso|aquilo|assim|agora|sim|ok|certo|podes sim(?:\s+o que passa)?|podes fazer)[.!?]*$/i;
const RE_CONTEXTUAL_PREFIX = /^(?:faz isso|faz assim|faz aquilo|faz o mesmo|repete(?: isso| aquilo)?|manda de novo|envia de novo|faz novamente|continua(?: assim)?|segue(?: isso| assim)|vai la|vai entao|como antes|do mesmo jeito|igual|isso|aquilo|assim|podes sim(?:\s+o que passa)?)(?:[,\s]|$)/i;
function isSelfContainedCommandText(texto) {
  const t = normalizarTextoComando(texto);
  return isClearActionText(t) && !RE_CONTEXTUAL_REPLY.test(t) && !RE_CONTEXTUAL_PREFIX.test(t);
}
function detectarAcaoDireta(texto) {
  const t = normalizarTextoComando(texto).replace(/[.!?]+\s*$/, '').trim();
  if (!isClearActionText(t)) return null;

  if (/^(?:fecha|fechar|tranca|trancar|bloqueia|bloquear)\s*(?:o\s*)?(?:grupo|gp|chat)?(?:[,\s]+(?:por favor|pfv|please))?$/i.test(t)) return 'fechar_grupo';
  if (/^(?:abre|abrir|destranca|destrancar|desbloqueia|desbloquear)\s*(?:o\s*)?(?:grupo|gp|chat)?(?:[,\s]+(?:por favor|pfv|please))?$/i.test(t)) return 'abrir_grupo';

  if (
    /^(?:puxa|chama(?:-me)?|manda|fala|vem)\b.{0,40}\b(?:off|pv|privado)\b/i.test(t) ||
    /^me\s+(?:chama|puxa|manda|fala)\b.{0,40}\b(?:off|pv|privado)\b/i.test(t) ||
    /^quero\s+(?:que\s+)?(?:me\s+)?(?:chame|chama|chamem|puxe|puxa|puxes|mande|manda|mandes|fale|fala|fales)\b.{0,32}\b(?:off|pv|privado)\b/i.test(t) ||
    /^(?:podes|pode)\s+(?:me\s+)?(?:chamar|puxar|mandar|falar)\b.{0,32}\b(?:off|pv|privado)\b/i.test(t)
  ) return 'chamar_pv';

  return null;
}
// Só frases explícitas de auto-promoção/destituição são aceites sem @.
// Para outra pessoa, a mensagem tem de conter uma menção real.
const RE_PROMOTE_SELF = /^(?:(?:sim|por favor)[,\s]+)?(?:me\s+(?:adiciona|poe|mete|faz|da|promove|promover)\b.{0,28}\b(?:adm|admin)\b|(?:adiciona|poe|mete|faz|promove|promover)[-\s]?me\b.{0,20}\b(?:adm|admin)\b|(?:quero|queria)\s+ser\s+(?:adm|admin)\b|(?:da-?me|me\s+da)\s+(?:o\s+)?(?:adm|admin)\b|torna[-\s]?me\s+(?:adm|admin)\b)(?:[,\s]+(?:por favor|pfv|please|agora))?[.!?]*$/i;
const RE_PROMOTE_TARGET_START = /^(?:promove|promover|adiciona|adicionar|poe|mete|da)\b/i;
const RE_DEMOTE_SELF = /^(?:(?:sim|por favor)[,\s]+)?(?:me\s+(?:rebaixa|rebaixar|despromove|despromover)\b|(?:rebaixa|rebaixar|despromove|despromover)[-\s]?me\b|(?:tira|remove)\s+(?:o\s+)?admin\s+(?:de\s+)?mim\b|(?:tira|remove)-?me\s+(?:do|de)\s+admin\b)(?:[,\s]+(?:por favor|pfv|please|agora))?[.!?]*$/i;
const RE_DEMOTE_TARGET_START = /^(?:despromove|despromover|rebaixa|rebaixar|tira|remove)\b/i;
const RE_PROMOTE = RE_PROMOTE_SELF;
const RE_DEMOTE = RE_DEMOTE_SELF;

// Só uma confirmação afirmativa pode retomar um pedido ainda pendente.
const RE_INSISTE_NEUTRA = /^(?:podes sim(?:\s+o que passa)?|podes fazer|faz isso|vai la|vai entao)[.!?]*$/i;
const RE_INSISTE_PROMOTE = /^(?:agora (?:me )?(?:adiciona|promove)|entao (?:adiciona|promove))[.!?]*$/i;
const RE_INSISTE_DEMOTE = /^(?:agora (?:me )?(?:rebaixa|rebaixar|despromove|despromover|tira admin)|entao (?:rebaixa|rebaixar|despromove|despromover|tira admin))[.!?]*$/i;
const RE_INSISTE = /^(?:podes sim(?:\s+o que passa)?|podes fazer|agora (?:me )?(?:adiciona|promove|rebaixa|rebaixar|despromove|despromover|tira admin)|entao (?:faz|adiciona|promove|rebaixa|rebaixar|despromove|despromover|tira admin)|faz isso|vai la|vai entao)[.!?]*$/i;

const _pendentes = new Map(); // chat + remetente -> { acao, alvoHint, ts }
const PENDENTE_TTL = 15 * 60 * 1000;

function _actorKey(actor) {
  if (actor && typeof actor === 'object') return String(actor.senderNumber || actor.senderJid || actor.senderLid || '').trim();
  return String(actor || '').trim();
}
function _pendingKey(jid, actor) {
  const chat = String(jid || '').trim();
  return chat ? `${chat}|${_actorKey(actor) || '__legacy__'}` : '';
}

function marcarPendente(jid, acao, alvoHint, actor = '') {
  const key = _pendingKey(jid, actor);
  if (!key) return;
  _pendentes.set(key, { jid: String(jid), actor: _actorKey(actor), acao, alvoHint, ts: Date.now() });
}

function verPendente(jid, actor = '') {
  const key = _pendingKey(jid, actor);
  const p = key && _pendentes.get(key);
  if (!p) return null;
  if (Date.now() - p.ts > PENDENTE_TTL) {
    _pendentes.delete(key);
    return null;
  }
  return p;
}

function limparPendente(jid, actor = '') {
  _pendentes.delete(_pendingKey(jid, actor));
}

function detectarPedidoGrupo(texto, { temPendente = false, pendente = null, hasMention = false } = {}) {
  const original = String(texto || '');
  const t = normalizarTextoComando(original);
  if (!isClearActionText(t) || /[\"'“”‘’`]/.test(t)) return null;
  const mentioned = !!hasMention || /@[^\s]+/.test(original);

  if (RE_DEMOTE_SELF.test(t)) return { acao: 'demote', deSi: true };
  if (mentioned && RE_DEMOTE_TARGET_START.test(t)) return { acao: 'demote', deSi: false };
  if (RE_PROMOTE_SELF.test(t)) return { acao: 'promote', deSi: true };
  if (mentioned && RE_PROMOTE_TARGET_START.test(t)) return { acao: 'promote', deSi: false };

  const pending = pendente && typeof pendente === 'object' ? pendente : null;
  const confirmaGenerica = RE_INSISTE_NEUTRA.test(t);
  const confirmaAcao = (pending?.acao === 'demote' ? RE_INSISTE_DEMOTE : RE_INSISTE_PROMOTE).test(t);
  if ((pending || temPendente) && (confirmaGenerica || confirmaAcao)) {
    return {
      acao: pending?.acao === 'demote' ? 'demote' : 'promote',
      deSi: false,
      viaPendente: true,
      alvoHint: pending?.alvoHint || '',
    };
  }
  return null;
}
function resolverAlvos(sock, meta, ctx, msg, pedido) {
  if (pedido?.viaPendente && pedido.alvoHint) {
    const p = acharNoGrupo(meta, [pedido.alvoHint]);
    return [p?.id || pedido.alvoHint];
  }
  if (pedido?.deSi === true) {
    const p = acharNoGrupo(meta, hintsDoSender(ctx));
    if (p?.id) return [p.id];
    const j = jidDoSender(ctx);
    return j ? [j] : [];
  }

  // Sem alvo explícito não se adivinha que o remetente seja o destinatário.
  const mentioned = mencoes(msg);
  if (!mentioned.length) return [];
  return mentioned.map(j => {
    const p = acharNoGrupo(meta, [j]);
    return p?.id || j;
  });
}
function msgErroWhatsApp(err) {
  const e = String(err?.message || err || '');
  if (/not.?admin|forbidden|403|401|unauthorized/i.test(e)) {
    return 'Ainda não sou admin aqui. Promove-me e eu faço de verdade.';
  }
  if (/not.?in.?group|no.?participant|404/i.test(e)) {
    return 'Não te encontrei na lista do grupo. Marca com @.';
  }
  return 'O WhatsApp recusou: ' + e.slice(0, 120);
}

/**
 * Executa promote/demote. Nunca mente.
 * @returns {{ok:boolean, msg:string, mencionar?:string[], pendente?:boolean}}
 */
async function executarPedido(sock, { ctx, msg, texto, pedido }) {
  if (!ctx?.isGroup) {
    return { ok: false, msg: 'Isto só dá para fazer num grupo.' };
  }

  const actor = ctx.senderNumber || ctx.senderJid || ctx.senderLid || '';
  const pedidoValidado = detectarPedidoGrupo(texto, {
    pendente: verPendente(ctx.remoteJid, actor),
    hasMention: mencoes(msg).length > 0,
  });
  if (!pedidoValidado || pedidoValidado.acao !== pedido?.acao) {
    return { ok: false, msg: null };
  }
  pedido = pedidoValidado;

  let meta = ctx.groupMeta;
  try { meta = await sock.groupMetadata(ctx.remoteJid); } catch {}
  if (!meta?.participants?.length) {
    return { ok: false, msg: 'Não consegui ler o grupo agora.' };
  }

  const acao = pedido.acao === 'demote' ? 'demote' : 'promote';
  const alvos = resolverAlvos(sock, meta, ctx, msg, pedido);
  if (!alvos.length) {
    return { ok: false, msg: 'Marca a pessoa com @, ou diz "me põe admin".' };
  }

  if (!botEhAdmin(sock, meta)) {
    marcarPendente(ctx.remoteJid, acao, alvos[0], actor);
    return {
      ok: false,
      pendente: true,
      msg: acao === 'promote'
        ? 'Ainda não sou admin deste grupo. Promove-me primeiro — quando tiver o poder, eu te ponho. Não vou fingir que já fiz.'
        : 'Ainda não sou admin. Promove-me e eu rebaixo.',
    };
  }

  const feitos = [];
  const jaEram = [];
  const falhas = [];

  for (const jid of alvos) {
    const p = acharNoGrupo(meta, [jid]);
    if (acao === 'promote' && participanteEhAdmin(p)) {
      jaEram.push(p.id || jid);
      continue;
    }
    if (acao === 'demote' && p && !participanteEhAdmin(p)) {
      jaEram.push(p.id || jid);
      continue;
    }
    try {
      await sock.groupParticipantsUpdate(ctx.remoteJid, [p?.id || jid], acao);
      feitos.push(p?.id || jid);
    } catch (e) {
      falhas.push(msgErroWhatsApp(e));
    }
  }

  if (feitos.length) {
    limparPendente(ctx.remoteJid, actor);
    const tags = feitos.map(j => '@' + baseId(j)).join(' ');
    return {
      ok: true,
      mencionar: feitos,
      msg: acao === 'promote'
        ? `Pronto. ${tags} agora é admin. Feito no WhatsApp, não é conversa.`
        : `Pronto. ${tags} já não é admin.`,
    };
  }

  if (jaEram.length && !falhas.length) {
    limparPendente(ctx.remoteJid, actor);
    return {
      ok: true,
      mencionar: jaEram,
      msg: acao === 'promote' ? 'Já és admin neste grupo.' : 'Essa pessoa já não é admin.',
    };
  }

  marcarPendente(ctx.remoteJid, acao, alvos[0], actor);
  return {
    ok: false,
    pendente: true,
    msg: falhas[0] || 'Não consegui alterar o cargo.',
  };
}

async function tentarPendente(sock, { ctx, msg, texto }) {
  const actor = ctx.senderNumber || ctx.senderJid || ctx.senderLid || '';
  const pend = verPendente(ctx.remoteJid, actor);
  if (!pend) return null;
  const pedido = detectarPedidoGrupo(texto, {
    pendente: pend,
    hasMention: mencoes(msg).length > 0,
  });
  if (!pedido?.viaPendente) return null;
  return executarPedido(sock, { ctx, msg, texto, pedido });
}

module.exports = {
  norm,
  idsIguais,
  botEhAdmin,
  acharNoGrupo,
  detectarPedidoGrupo,
  isDirectedToAura,
  isClearActionText,
  isSelfContainedCommandText,
  normalizarTextoComando,
  detectarAcaoDireta,
  executarPedido,
  tentarPendente,
  marcarPendente,
  verPendente,
  limparPendente,
  resolverAlvos,
  mencoes,
  RE_PROMOTE,
  RE_DEMOTE,
  RE_INSISTE,
};
