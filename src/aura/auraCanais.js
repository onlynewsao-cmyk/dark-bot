'use strict';
/**
 * AURA — CANAIS, CONVITES E PARTILHA (v6.82)
 *
 * O que aqui está e porquê:
 *
 *  1. entrarPorLink()  — aceita links de GRUPO (chat.whatsapp.com/XXXX) e de
 *     CANAL (whatsapp.com/channel/XXXX). São dois mecanismos diferentes no
 *     protocolo: grupo usa `groupAcceptInvite(code)`, canal usa
 *     `newsletterMetadata('invite', code)` + `newsletterFollow(jid)`.
 *
 *  2. reagirTudoCanal() — na v6.81 disse que era impossível. Estava errado:
 *     o fork exporta `newsletterFetchMessages(jid, count, since, after)` e
 *     `newsletterReactMessage(jid, serverId, emoji)`. Dá para varrer as
 *     últimas N publicações e reagir a cada uma.
 *     ATENÇÃO: as reacções de canal usam `server_id` (um número por post),
 *     não a `key.id` das mensagens normais.
 *
 *  3. reencaminhar() — partilhar uma mensagem para vários grupos.
 *     NÃO se usa o `forwardMessage` do megaActions: aquele reaproveita o
 *     `messageId` original em todos os destinos, e o WhatsApp trata IDs
 *     repetidos como duplicados (a segunda cópia desaparece). Aqui gera-se
 *     um ID novo por destino e marca-se `forwardingScore` para o WhatsApp
 *     mostrar "reencaminhada", como faz a app.
 *
 * Velocidade: nada disto corre no caminho das mensagens normais. Só é
 * chamado quando o cérebro reconhece uma ordem explícita.
 */

const RE_GRUPO = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,26})/i;
const RE_CANAL = /whatsapp\.com\/channel\/([0-9A-Za-z_-]{15,40})/i;

/** Tira o código de convite de um texto. */
function extrairConvite(texto = '') {
  const g = String(texto).match(RE_GRUPO);
  if (g) return { tipo: 'grupo', code: g[1] };
  const c = String(texto).match(RE_CANAL);
  if (c) return { tipo: 'canal', code: c[1] };
  return null;
}

/**
 * Entra num grupo ou canal a partir de um link.
 * @returns {{ok:boolean, tipo?:string, jid?:string, nome?:string, msg:string}}
 */
async function entrarPorLink(sock, texto) {
  const conv = extrairConvite(texto);
  if (!conv) {
    return { ok: false, msg: 'Não vi nenhum link de grupo nem de canal na mensagem. Manda o link que eu entro.' };
  }

  // ── GRUPO OU COMUNIDADE ─────────────────────────────────
  if (conv.tipo === 'grupo') {
    // v7.9: um link chat.whatsapp.com tanto pode ser de grupo como de
    // comunidade. A comunidade é o caso específico — testa-se primeiro.
    try {
      if (typeof sock.communityGetInviteInfo === 'function') {
        const c = await sock.communityGetInviteInfo(conv.code);
        if (c?.isCommunity && typeof sock.communityAcceptInvite === 'function') {
          const jid = await sock.communityAcceptInvite(conv.code);
          const nome = c.subject || c.name || '';
          return {
            ok: true, tipo: 'comunidade', jid, nome,
            msg: nome ? `Entrei na comunidade *${nome}*. 🖤` : 'Entrei na comunidade. 🖤',
          };
        }
      }
    } catch { /* não era comunidade — segue para grupo */ }

    try {
      // Espreita antes de entrar — assim consigo dizer o nome.
      let nome = '';
      try {
        const info = await sock.groupGetInviteInfo(conv.code);
        nome = info?.subject || '';
      } catch { /* alguns convites não deixam espreitar; entra na mesma */ }

      const jid = await sock.groupAcceptInvite(conv.code);
      return {
        ok: true, tipo: 'grupo', jid, nome,
        msg: nome ? `Entrei no *${nome}*. 🖤` : 'Entrei no grupo. 🖤',
      };
    } catch (e) {
      const m = String(e?.message || e);
      if (/not-authorized|403/i.test(m)) return { ok: false, msg: 'Esse convite já não serve — foi revogado ou o link expirou.' };
      if (/gone|410/i.test(m)) return { ok: false, msg: 'Esse grupo já não existe.' };
      if (/conflict|409/i.test(m)) return { ok: false, msg: 'Já estou nesse grupo.' };
      return { ok: false, msg: `Não consegui entrar: ${m.slice(0, 80)}` };
    }
  }

  // ── CANAL (newsletter) ───────────────────────────────────
  try {
    if (typeof sock.newsletterMetadata !== 'function' || typeof sock.newsletterFollow !== 'function') {
      return { ok: false, msg: 'Esta versão do WhatsApp que uso não mexe em canais.' };
    }
    const meta = await sock.newsletterMetadata('invite', conv.code);
    if (!meta?.id) return { ok: false, msg: 'Não encontrei esse canal — o link deve estar partido.' };

    await sock.newsletterFollow(meta.id);
    return {
      ok: true, tipo: 'canal', jid: meta.id, nome: meta.name || '',
      msg: meta.name ? `Segui o canal *${meta.name}*. 🖤` : 'Segui o canal. 🖤',
    };
  } catch (e) {
    return { ok: false, msg: `Não consegui seguir o canal: ${String(e?.message || e).slice(0, 80)}` };
  }
}

/**
 * Reage às últimas publicações de um canal.
 * @param {string} alvoJid  jid do canal (@newsletter) — ou link
 * @param {string} emoji
 * @param {number} quantas  tecto de segurança (por omissão 30)
 */
async function reagirTudoCanal(sock, alvoJid, emoji = '🕸️', quantas = 30) {
  let jid = alvoJid;

  // aceita link em vez de jid
  if (!/@newsletter$/.test(String(jid || ''))) {
    const conv = extrairConvite(String(alvoJid || ''));
    if (conv?.tipo === 'canal') {
      try {
        const meta = await sock.newsletterMetadata('invite', conv.code);
        jid = meta?.id;
      } catch { /* fica indefinido, tratado abaixo */ }
    }
  }
  if (!/@newsletter$/.test(String(jid || ''))) {
    return { ok: false, msg: 'Preciso do link do canal ou de estar dentro dele.' };
  }
  if (typeof sock.newsletterFetchMessages !== 'function') {
    return { ok: false, msg: 'Esta versão não me deixa ler as publicações do canal.' };
  }

  let posts = [];
  try {
    posts = await sock.newsletterFetchMessages(jid, Math.min(quantas, 50), 0, 0);
  } catch (e) {
    return { ok: false, msg: `Não consegui ler o canal: ${String(e?.message || e).slice(0, 70)}` };
  }
  if (!Array.isArray(posts) || !posts.length) {
    return { ok: false, msg: 'Esse canal não tem publicações que eu consiga ler.' };
  }

  let feitas = 0, falhas = 0;
  for (const p of posts) {
    // o server_id aparece com nomes diferentes conforme a versão
    const sid = p?.server_id ?? p?.serverId ?? p?.newsletterServerId ?? p?.id;
    if (sid === undefined || sid === null) { falhas++; continue; }
    try {
      await sock.newsletterReactMessage(jid, String(sid), emoji);
      feitas++;
      // trava anti-banimento: o WhatsApp corta quem dispara em rajada
      await new Promise(r => setTimeout(r, 350));
    } catch { falhas++; }
  }

  if (!feitas) return { ok: false, msg: 'Não consegui reagir a nenhuma publicação.' };
  return {
    ok: true, feitas, falhas,
    msg: `Reagi com ${emoji} a ${feitas} publicaç${feitas === 1 ? 'ão' : 'ões'}${falhas ? ` (${falhas} não deram)` : ''}. 🖤`,
  };
}

/** Publica texto num canal. */
async function postarCanal(sock, jid, texto) {
  try {
    await sock.sendMessage(jid, { text: texto });
    return { ok: true };
  } catch (e) { return { ok: false, msg: String(e?.message || e).slice(0, 80) }; }
}

/**
 * Reencaminha uma mensagem para vários destinos.
 *
 * Gera ID novo por destino (ver nota no topo) e marca como reencaminhada.
 * @param {object} msg  a mensagem original (a que foi respondida)
 * @param {string[]} destinos  lista de jids
 */
async function reencaminhar(sock, msg, destinos = []) {
  const conteudo = msg?.message;
  if (!conteudo) return { ok: false, enviados: 0, msg: 'Essa mensagem não tem conteúdo que eu consiga reencaminhar.' };

  // desembrulha mensagens efémeras / view-once, senão o reenvio sai vazio
  const real = conteudo.ephemeralMessage?.message
    || conteudo.viewOnceMessage?.message
    || conteudo.viewOnceMessageV2?.message
    || conteudo.documentWithCaptionMessage?.message
    || conteudo;

  // marca "reencaminhada", como a app faz
  const tipo = Object.keys(real)[0];
  if (tipo && real[tipo] && typeof real[tipo] === 'object') {
    real[tipo].contextInfo = {
      ...(real[tipo].contextInfo || {}),
      isForwarded: true,
      forwardingScore: Math.max(1, (real[tipo].contextInfo?.forwardingScore || 0) + 1),
    };
  }

  let enviados = 0;
  const falhou = [];
  for (const jid of destinos) {
    try {
      // ID novo por destino: com o mesmo ID o WhatsApp engole as cópias
      await sock.relayMessage(jid, real, { messageId: undefined });
      enviados++;
      await new Promise(r => setTimeout(r, 400)); // trava anti-banimento
    } catch (e) {
      falhou.push(jid);
    }
  }

  return {
    ok: enviados > 0,
    enviados,
    falhou: falhou.length,
    msg: enviados
      ? `Reencaminhei para ${enviados} grupo${enviados === 1 ? '' : 's'}${falhou.length ? ` (${falhou.length} falharam)` : ''}. 🖤`
      : 'Não consegui reencaminhar para nenhum grupo.',
  };
}

/**
 * Lista os grupos onde ela está.
 * @param {boolean} soAdmin  só onde ela é admin (evita levar com bloqueios)
 */
async function meusGrupos(sock, soAdmin = false) {
  try {
    const todos = await sock.groupFetchAllParticipating();
    const eu = (sock.user?.id || '').split(':')[0].split('@')[0];
    const lista = Object.values(todos || {});
    if (!soAdmin) return lista;
    return lista.filter(g => (g.participants || []).some(p =>
      String(p.id || '').includes(eu) && (p.admin === 'admin' || p.admin === 'superadmin')));
  } catch { return []; }
}

/** Resolve o jid de um canal a partir de um link ou jid directo. */
async function resolverCanal(sock, alvo) {
  const t = String(alvo || '').trim();
  if (/@newsletter$/i.test(t)) return t;
  const conv = extrairConvite(t);
  if (conv?.tipo === 'canal') {
    const meta = await sock.newsletterMetadata('invite', conv.code);
    return meta?.id || null;
  }
  return null;
}

/**
 * v7.9 — informação de um canal (nome, descrição, seguidores).
 */
async function infoCanal(sock, alvo) {
  if (typeof sock.newsletterMetadata !== 'function') {
    return { ok: false, msg: 'Esta versão do WhatsApp que uso não lê canais.' };
  }
  const jid = await resolverCanal(sock, alvo).catch(() => null);
  let meta = null;
  try {
    if (jid) {
      meta = await sock.newsletterMetadata('jid', jid);
    } else {
      const conv = extrairConvite(String(alvo || ''));
      if (conv?.tipo === 'canal') meta = await sock.newsletterMetadata('invite', conv.code);
    }
  } catch (e) {
    return { ok: false, msg: `Não consegui ler o canal: ${String(e?.message || e).slice(0, 80)}` };
  }
  if (!meta?.name && !meta?.description) {
    return { ok: false, msg: 'Não encontrei esse canal — manda o link (whatsapp.com/channel/...).' };
  }
  const linhas = [`Canal *${meta.name || ''}*`];
  if (meta.description) linhas.push(String(meta.description).slice(0, 220));
  if (typeof meta.subscribers === 'number') linhas.push(`👥 ${meta.subscribers} seguidores`);
  if (meta.invite) linhas.push(`https://whatsapp.com/channel/${meta.invite}`);
  return { ok: true, msg: linhas.join('\n\n') };
}

/**
 * v7.9 — deixar de seguir um canal (por link ou jid).
 */
async function deixarCanal(sock, alvo) {
  if (typeof sock.newsletterUnfollow !== 'function') {
    return { ok: false, msg: 'Esta versão do WhatsApp que uso não deixa de seguir canais.' };
  }
  const jid = await resolverCanal(sock, alvo).catch(() => null);
  if (!jid) return { ok: false, msg: 'Manda o link do canal que queres que eu deixe de seguir.' };
  try {
    await sock.newsletterUnfollow(jid);
    return { ok: true, msg: 'Deixei de seguir o canal. ✅' };
  } catch (e) {
    return { ok: false, msg: `Não consegui deixar de seguir: ${String(e?.message || e).slice(0, 80)}` };
  }
}

module.exports = {
  extrairConvite, entrarPorLink, reagirTudoCanal, postarCanal,
  reencaminhar, meusGrupos, resolverCanal, infoCanal, deixarCanal,
  RE_GRUPO, RE_CANAL,
};
