'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DARK BOT v9.16 — ENQUETES · VOTOS · VOTAÇÕES · REACÇÕES    ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  !enquete "pergunta" | a | b | c [max]  → enquete REAL       ║
 * ║  !voto <N|nome>      → o bot vota na enquete real (1 voto)   ║
 * ║  !votacao abrir "P" |a|b|c  → votação da casa (bot conta)     ║
 * ║  !votar <N>          → o TEU voto na votação (1 pessoa 1)    ║
 * ║  !votacao status / fechar / limpar                            ║
 * ║  !reagir ❤️ / remover → emoji na mensagem respondida          ║
 * ║  !canalreagir 🤡 [n] [link] → reacção em posts do canal      ║
 * ║                                                               ║
 * ║  HONESTIDADE POR DESIGN: o bot não inventa votos nem reações ║
 *   de terceiros — assinatura WhatsApp é criptográfica e voto   ║
 * ║  em série por contas é fraude (e banho de ban). O jeito de   ║
 * ║  «zoar» aqui é a votação da casa: auditável, botão a botão.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
const vt = require('../../aura/auraVotacao');

const code = (t) => `\`${String(t).replace(/`/g, 'ʼ')}\``;

module.exports = function registerVotacaoCases(registerCase) {
  const negado = (reply) => reply('🔒 Isto é para ADMIN ou Dono do grupo.');

  // ── ENQUETE REAL ───────────────────────────────────────────────────
  registerCase(['enquete', 'votacaoreal'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const alvo = ctx.remoteJid;
    const ex = vt.extrairPergunta((args || []).join(' '));
    if (!ex) {
      return reply([
        '📊 *ENQUETE* — formato:',
        code(`${p}enquete "Filme da sexta?" | Terror | Comédia | Anime`),
        'Multiplicar escolhas: junta [2] no fim → até 2 opções por pessoa.',
        'Quem responde à enquete e diz `👍 Voto` não precisa de botões — é o WhatsApp a contar.',
        (ctx.isGroup ? '' : '_Dica: enquetes valem ouro em grupos._').trim() || null,
      ].filter(Boolean).join('\n'));
    }
    try {
      const e = await vt.criarEnquete(sock, alvo, { pergunta: ex.pergunta, opcoes: ex.opcoes, max: ex.max, quoted: msg });
      return reply(`✅ Enquete lançada: *${e.pergunta.slice(0, 60)}* com ${e.opcoes.length} opções.\n🗳️ Para o *meu* voto (o bot também joga): \`${p}voto 1\`.`);
    } catch (er) {
      return reply(`⚠️ Não consegui lançar a enquete: ${String(er.message || er).slice(0, 90)}`);
    }
  });

  registerCase(['voto', 'votar'], async ({ sock, msg, ctx, args, prefix, isOwner, reply }) => {
    const p = prefix || '!';
    const alvo = ctx.remoteJid;
    const escolha = (args || []).join(' ').trim();
    if (!escolha) return reply(`Escolhe a opção: \`${p}votar 2\` ou \`${p}votar terror\`.`);
    // 1) votação da casa a decorrer (ou recém-fechada) → o membro conta-se
    const v = vt.__test.VOTACOES.get(alvo);
    if (v) {
      const autor = ctx.senderJid || `${ctx.senderNumber || 'anon'}@s.whatsapp.net`;
      const r = vt.votar(alvo, autor, escolha);
      return reply(r.msg + (r.ok && !v.secreta ? `\n\n${vt.statusVotacao(alvo).msg}` : ''));
    }
    // 2) senão, o bot vota na enquete REAL — com a conta dele, à vista de todos
    if (!(ctx.isAdmin || isOwner) && ctx.isGroup) return negado(reply);
    const e = vt.__test.ENQUETES.get(alvo);
    if (!e) return reply(`🗳️ Nem votação aberta nem enquete na minha memória aqui. Cria uma: \`${p}enquete "pergunta" | a | b\`.`);
    const r = await vt.votarEnquete(sock, alvo, { enquete: e, escolha, quoted: msg });
    return reply(r.msg);
  });

  registerCase(['enquetevotos', 'resultados'], async ({ sock, ctx, reply }) => {
    const e = vt.__test.ENQUETES.get(ctx.remoteJid);
    if (!e) return vt.__test.VOTACOES.get(ctx.remoteJid) ? reply(vt.statusVotacao(ctx.remoteJid).msg) : reply(' Nem enquete nem votação aberta aqui.');
    await vt.puxarResultados(sock, e);
    return reply(vt.resultadosEnquete(ctx.remoteJid).msg);
  });

  // ── VOTAÇÃO DA CASA (o bot arbitra; funciona em qualquer cliente) ──
  registerCase(['votacao', 'votação', 'enquetabotoes'], async ({ sock, msg, ctx, args, prefix, isOwner, reply }) => {
    const p = prefix || '!';
    const alvo = ctx.remoteJid;
    const sub = String(args[0] || '').toLowerCase();
    const dono = ctx.isAdmin || isOwner;

    if (sub === 'fechar') {
      if (!dono) return negado(reply);
      const r = vt.fecharVotacao(alvo);
      if (!r.ok) return reply(r.msg);
      return reply(r.msg);
    }
    if (sub === 'status') {
      const r = vt.statusVotacao(alvo);
      return reply(r.ok ? r.msg : `${r.msg} Abre uma: \`${p}votacao "pergunta" | a | b\`.`);
    }
    if (sub === 'limpar') {
      if (!dono) return negado(reply);
      vt.limpar(alvo);
      return reply('🧹 Mesa limpa — contagens esquecidas.');
    }

    const resto = (sub === 'abrir' || sub === 'abre') ? args.slice(1) : args;
    if (!resto.length) {
      return reply([
        '🗳️ *VOTAÇÃO DA CASA* — o bot conta, 1 pessoa = 1 voto:',
        code(`${p}votacao "Pizza ou sushi?" | Pizza | Sushi`),
        code(`${p}votacao secreta "Quem é o melhor admin?" | Tu | O Bot`),
        `Depois: \`${p}votacao status\` · \`${p}votacao fechar\` · os membros tocam no botão ou \`${p}votar 2\`.`,
      ].join('\n'));
    }
    if (!ctx.isGroup) return reply('🗳️ Votação faz sentido em *grupo* — no PV não há para quem dar botões.');
    if (!dono) return negado(reply);
    let secreta = false;
    let corpo = resto.join(' ');
    if (/^secreta\b|^secret\b|^escondida\b/i.test(corpo)) { secreta = true; corpo = corpo.replace(/^\S+\s+/, ''); }
    const ex = vt.extrairPergunta(corpo);
    if (!ex) return reply(`☣️ Manda no formato: \`${p}votacao "pergunta" | opção 1 | opção 2 [| mais]\`.`);
    const admin = ctx.pushName || (isOwner ? 'o Dono' : 'admin');
    const r = await vt.abrirVotacao(sock, alvo, { pergunta: ex.pergunta, opcoes: ex.opcoes, quoted: msg, secreta, admin });
    if (!r.ok) return reply(r.msg);
    return reply(`✅ Votação aberta em cima do cartão-botões. ${secreta ? 'Contagem SECRETA 🤫' : 'Contagem visível 👀'}.`);
  });

  // ── !reagir — emoji na mensagem respondida (toda a gente pode) ─────
  registerCase(['reagir', 'react'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const p = prefix || '!';
    const q = msg?.message?.extendedTextMessage?.contextInfo;
    const qKey = q?.stanzaId ? { id: q.stanzaId, fromMe: !!q.fromMe, remoteJid: ctx.remoteJid } : null;
    if (!qKey) return reply(`↩️ Responde à mensagem que queres marcar e escreve \`${p}reagir 😂\` (ou \`${p}reagir remover\`).`);
    const t = String(args[0] || '🕸️');
    const emoji = /^(remove|tirar|apagar|-|none)$/.test(t.toLowerCase()) ? '' : [...t].slice(0, 3).join('');
    try {
      await sock.sendMessage(ctx.remoteJid, { react: { text: emoji, key: qKey } });
      return reply(emoji ? `✅ Colado: ${emoji}` : '🧼 Reacção removida.');
    } catch (e) { return reply(`⚠️ ${String(e.message || e).slice(0, 80)}`); }
  });

  // ── !canalreagir — reacções nos posts de um canal (dono) ──────────
  registerCase(['canalreagir', 'reagirnocanal', 'canalzoo'], async ({ sock, ctx, args, prefix, isOwner, reply }) => {
    if (!isOwner) return negado(reply);
    const p = prefix || '!';
    const canais = require('../../aura/auraCanais');
    const a = (args || []).slice();
    const emoji = [...(a[0] || '🤡')].slice(0, 2).join('') || '🤡';
    let quantas = 10;
    const q = String(a[1] || '').match(/^(\d{1,2})$/);
    if (q) { quantas = Math.min(15, Math.max(1, +q[1])); a.splice(1, 1); }
    const link = a.slice(1).join(' ') || a.join(' ') || '';
    const alvo = /whatsapp\.com\/channel\//i.test(link) ? link : (/@newsletter$/.test(ctx.remoteJid) ? ctx.remoteJid : link);
    if (!alvo) return reply(`☣️ Diz o canal: \`${p}canalreagir 🤡 10 https://whatsapp.com/channel/…\` — ou responde a um post teu no canal.`);
    await reply(`🤡 A varrer o canal e a colar ${emoji} nos últimos ${quantas} posts…`);
    const r = await canais.reagirTudoCanal(sock, alvo, emoji, quantas);
    return reply(r.msg || (r.ok ? '✅ Feito.' : '⚠️ Não deu.'));
  });
};

module.exports.__test = { vt };
