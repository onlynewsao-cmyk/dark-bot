'use strict';
/**
 * DARK BOT v7.77 — LISTAS COM ESCOLHA POR NÚMERO 📋
 *
 * Qualquer comando mostra uma lista numerada; o utilizador responde
 * "1".."10" (sem prefixo) e o handler registado corre com o item
 * escolhido. Mesmo padrão do cartão !som (pendente por chat+user).
 *
 * Uso:
 *   const lista = require('../listaEscolha');
 *   await lista.mostrar(sock, msg, ctx, {
 *     titulo: '🎵 *5 resultados*',
 *     linhas: itens.map(i => `*${i.title}*`),
 *     itens, tipo: 'play',
 *     aoEscolher: async ({ item, idx }) => { ... },
 *   });
 */

const TTL = 2 * 60 * 1000;   // a escolha expira em 2 min
const MAX = 10;
const _pendentes = new Map(); // `${remoteJid}::${senderNumber}` → { itens, ts, tipo, aoEscolher }

function _key(ctx = {}) {
  return `${ctx.remoteJid || ctx.chat || ''}::${ctx.senderNumber || ctx.sender || ''}`;
}

function _limpar() {
  const agora = Date.now();
  for (const [k, v] of _pendentes) if (agora - v.ts > TTL) _pendentes.delete(k);
}

function limpaSafe(x) { return String(x || '').replace(/[*_`]/g, '').trim(); }

/**
 * Mostra a lista numerada e guarda a escolha pendente.
 * `linhas` já vêm formatadas (sem número — o motor numera).
 */
async function mostrar(sock, msg, ctx, { titulo, intro = '', linhas = [], itens = [], tipo = 'lista', aoEscolher, dica = '' }) {
  _limpar();
  const n = Math.min(linhas.length, itens.length, MAX);
  if (!n || typeof aoEscolher !== 'function') throw new Error('lista vazia');
  const numeradas = [];
  for (let i = 0; i < n; i++) numeradas.push(`*${i + 1}.* ${linhas[i]}`);
  const texto = `${titulo}\n${intro ? intro + '\n' : ''}\n${numeradas.join('\n')}\n\n> Toca em *ESCOLHER* ▾ ou responde com o *número* (1–${n})${dica ? '\n' + dica : ''}`;
  // v7.92 — corpo curto: os RESULTADOS ficam DENTRO da lista (aparecem
  // quando se toca ESCOLHER ▾). O texto numerado SÓ é enviado no fallback.
  const corpoCurto = `${titulo}\n${intro ? intro + '\n' : ''}\n> Toca em *${limpaSafe(titulo).slice(0, 30) || 'ESCOLHER'}* ▾ — tens ${n} opções 【ou responde com o número 1–${n}】`;
  _pendentes.set(_key(ctx), { itens: itens.slice(0, n), ts: Date.now(), tipo, aoEscolher });

  // v7.91: LISTA CLICÁVEL estilo submenu (single_select) — tocar numa
  // linha volta como LISTANUM_<n> e o commandHandler resolve como o número.
  try {
    const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
    const limpa = (x) => String(x || '').replace(/[*_`]/g, '').trim();
    const rows = [];
    for (let i = 0; i < n; i++) {
      const partes = String(linhas[i]).split('\n');
      rows.push({
        title: limpa(partes[0]).slice(0, 24) || `Opção ${i + 1}`,
        rowId: `LISTANUM_${i + 1}`,
        description: limpa(partes.slice(1).join(' ')).slice(0, 72),
      });
    }
    const m = generateWAMessageFromContent(ctx.remoteJid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: { text: corpoCurto },
        footer: { text: `📋 ${tipo} · ${n} opções` },
        header: { title: '', hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: limpa(titulo).slice(0, 30) || 'ESCOLHER',
              sections: [{ title: limpa(titulo).slice(0, 24) || 'Opções', rows }],
            }),
          }],
        },
      }),
    }, { userJid: sock.user?.id, quoted: msg });
    await sock.relayMessage(ctx.remoteJid, m.message, {
      messageId: m.key.id,
      additionalNodes: [{ tag: 'biz', attrs: {}, content: [{
        tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
      }] }],
    });
    return n;
  } catch (_) {}

  await sock.sendMessage(ctx.remoteJid, { text: texto }, { quoted: msg });
  return n;
}

/**
 * Tenta tratar "1".."10" como escolha. Devolve true se tratou.
 * Se o cartão !som for MAIS NOVO que a lista, cede a vez a ele.
 */
async function tentarNumero(sock, msg, ctx, text) {
  _limpar();
  const m = String(text || '').trim().match(/^0?(10|[1-9])(?:\s.*)?$/);
  if (!m) return false;
  const key = _key(ctx);
  const p = _pendentes.get(key);
  if (!p) return false;
  try {
    const somTs = require('./musicaCard')._pendentes?.get(key)?.ts || 0;
    if (somTs > p.ts) return false;
  } catch {}
  const idx = parseInt(m[1], 10) - 1;
  if (idx < 0 || idx >= p.itens.length) {
    await sock.sendMessage(ctx.remoteJid, { text: `❌ Escolhe um número de *1* a *${p.itens.length}*.` }, { quoted: msg }).catch(() => {});
    return true; // é nosso (mantém o pendente)
  }
  _pendentes.delete(key);
  try {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});
    await p.aoEscolher({ sock, msg, ctx, item: p.itens[idx], idx });
  } catch (e) {
    await sock.sendMessage(ctx.remoteJid, { text: `❌ ${String(e?.message || e).slice(0, 120)}` }, { quoted: msg }).catch(() => {});
  }
  return true;
}

/* v7.91 — clique LISTANUM_<n> */
async function tentarToken(sock, msg, ctx, text) {
  const m = String(text || '').trim().match(/^LISTANUM_(10|[1-9])$/i);
  if (!m) return false;
  return tentarNumero(sock, msg, ctx, m[1]);
}

module.exports = { mostrar, tentarNumero, tentarToken, _pendentes, _key };
