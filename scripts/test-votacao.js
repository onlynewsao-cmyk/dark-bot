#!/usr/bin/env node
'use strict';
/**
 * DARK BOT v9.16 — REGRESSÃO: ENQUETES · VOTAÇÕES · REACÇÕES · CONVITE
 * Sem rede, sem Mongo. Cobre:
 *   1. parser «pergunta | a | b» (+ [max], aspas, fallback PT)
 *   2. enquete real: payload poll + voto pollUpdate com sha256(opção)
 *   3. votação da casa: abrir→botões, 1 pessoa 1 voto, trocar, fechar
 *      com percentagens, empate, honestidade anti-falsificação
 *   4. comandos (!enquete !voto !votacao !votar !reagir) via casos
 *   5. FIX DO CONVITE: groupAcceptInvite→undefined É sucesso; aprovação
 *      de admin pendente ≠ «link inválido»; revogado continua honesto
 *   6. AURASEL do cartão «Entrar no grupo» passa pelo motor (era o bug)
 * Uso: node scripts/test-votacao.js
 */
const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');

(async () => {
  console.log('=== v9.16 — VOTAÇÕES / ENQUETES / CONVITE-FIX ===');
  const vt = require('../src/aura/auraVotacao');

  // ── 1. parser ──────────────────────────────────────────────────────
  {
    const a = vt.extrairPergunta('"Filme da sexta?" | Terror | Comédia | Anime');
    assert.strictEqual(a.pergunta, 'Filme da sexta?');
    assert.deepStrictEqual(a.opcoes, ['Terror', 'Comédia', 'Anime']);
    assert.strictEqual(a.max, 1);
    const b = vt.extrairPergunta('Pizza ou sushi? | pizza | sushi [2]');
    assert.ok(b && b.max === 2 && b.opcoes.length === 2, '[max] apanhado');
    const c = vt.extrairPergunta('Qual é o melhor jogo: fifa, free fire ou minecraft');
    assert.ok(c && c.opcoes.length === 3, 'fallback vírgulas/ou');
    assert.strictEqual(vt.extrairPergunta('só texto solto'), null, 'sem opções → null');
    console.log('✔ parser: pipes, aspas, [max] e «a, b ou c»');
  }

  // ── 2. enquete real — payload e voto criptograficamente certos ────
  {
    const sent = [];
    const sock = { sendMessage: async (jid, content, opt) => { sent.push({ jid, content }); return { key: { id: 'E1', remoteJid: jid, fromMe: true } }; } };
    const e = await vt.criarEnquete(sock, 'g1@g.us', { pergunta: 'Terror?', opcoes: ['Terror', 'Comédia'], max: 1 });
    const poll = sent[0].content.poll;
    assert.strictEqual(poll.name, 'Terror?');
    assert.deepStrictEqual(poll.values.map((v) => v.optionName), ['Terror', 'Comédia']);
    assert.strictEqual(poll.selectableCount, 1);
    assert.ok(Array.isArray(poll.values) && poll.values.length === 2, 'values no formato do proto (messageSecret é gerado pelo prepareMessage do fork)');
    const r = await vt.votarEnquete(sock, 'g1@g.us', { enquete: e, escolha: 1 });
    assert.ok(r.ok && /Terror/.test(r.msg), 'voto 1 registado');
    const pu = sent[1].content.pollUpdate;
    assert.strictEqual(pu.key.id, 'E1');
    assert.strictEqual(pu.vote.sha256Progression.length, 32, 'hash de 32 bytes');
    const esperado = crypto.createHash('sha256').update(Buffer.from('Terror', 'utf-8')).digest();
    assert.ok(pu.vote.sha256Progression.equals(esperado), 'sha256(opção) = fórmula do getAggregateVotesInPollMessage do fork');
    const r2 = await vt.votarEnquete(sock, 'g1@g.us', { enquete: e, escolha: 'comédia' });
    assert.ok(r2.ok && r2.mudou && /mudei/.test(r2.msg), 'troca de voto detetada');
    assert.strictEqual((await vt.votarEnquete(sock, 'g1@g.us', { enquete: e, escolha: 99 })).ok, false, 'índice fora → educado');
    const st = vt.resultadosEnquete('g1@g.us');
    assert.ok(st.ok && /Votos/.test(st.msg), 'resultados apontam para o contador do WhatsApp');
    vt.limpar('g1@g.us');
    console.log('✔ enquete real: payload, voto sha256, troca e honestidade de contagem');
  }

  // ── 3+4. votação da casa + comandos ───────────────────────────────
  {
    const casos = {};
    require('../src/bot/cases/votacao')((nomes, fn) => { for (const x of [].concat(nomes)) casos[x] = fn; });
    for (const c of ['enquete', 'voto', 'votar', 'votacao', 'votação', 'reagir', 'canalreagir', 'resultados']) {
      assert.ok(casos[c], `comando !${c} registado`);
    }
    const sent = [];
    const sock = {
      sendMessage: async (jid, content, opt) => { sent.push({ jid, content }); return { key: { id: 'V' + sent.length, remoteJid: jid, fromMe: true } }; },
      relayMessage: async (jid, message) => { sent.push({ jid, content: message, relay: true }); return {}; },
      user: { id: 'bot@s.whatsapp.net' },
    };
    const replies = [];
    const reply = async (t) => { replies.push(t); };
    const mkCtx = (num) => ({ remoteJid: 'g2@g.us', isGroup: true, senderNumber: num, senderJid: `${num}@s.whatsapp.net`, pushName: `p${num}`, prefix: '!', isAdmin: false });

    // abrir como admin
    const DONO = { ...mkCtx('100'), isOwner: true };
    await casos.votacao({ sock, msg: { key: {} }, ctx: DONO, args: ['"Pizza ou sushi?" | Pizza | Sushi'], prefix: '!', isOwner: true, reply });
    assert.ok(replies.at(-1).includes('Votação aberta'), 'abrir ok');
    assert.ok(sent.some((x) => /VOTAÇÃO ABERTA/.test(JSON.stringify(x.content))), 'cartão da votação enviado');

    // !votar 1 (membro A) e !votar pizza (membro B) — troca conta, não duplica
    replies.length = 0;
    await casos.votar({ sock, msg: {}, ctx: mkCtx('201'), args: ['1'], prefix: '!', isOwner: false, reply });
    assert.ok(/Pizza/.test(replies.at(-1)) && /201/.test(replies.at(-1)), 'voto do 201 registado com eco');
    await casos.votar({ sock, msg: {}, ctx: mkCtx('202'), args: ['pizza'], prefix: '!', isOwner: false, reply });
    await casos.votar({ sock, msg: {}, ctx: mkCtx('202'), args: ['2'], prefix: '!', isOwner: false, reply });
    assert.ok(/mudou/.test(replies.at(-1)), 'mesma pessoa a mudar = 1 voto, não 2');
    // anti-falsificação: 3 pessoas → 2 votos na mesa
    const mesa = vt.__test.VOTACOES.get('g2@g.us');
    assert.strictEqual(mesa.votos.size, 2, '1 pessoa = 1 voto (auditable)');

    // status + fechar (admin gate no fechar)
    replies.length = 0;
    await casos.votacao({ sock, msg: {}, ctx: mkCtx('203'), args: ['fechar'], prefix: '!', isOwner: false, reply });
    assert.ok(/ADMIN ou Dono/.test(replies.at(-1)), 'fechar é de admin');
    await casos.votacao({ sock, msg: {}, ctx: mkCtx('201'), args: ['status'], prefix: '!', isOwner: false, reply });
    assert.ok(/Sushi.*1v|Pizza.*1v/.test(replies.at(-1)), 'status mostra contagem visível');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['fechar'], prefix: '!', isOwner: true, reply });
    const fech = replies.at(-1);
    assert.ok(/VEREDICTO/.test(fech) && /EMPATE/.test(fech) && /50%/.test(fech), 'empate a 50% anunciado');
    await casos.votar({ sock, msg: {}, ctx: mkCtx('204'), args: ['1'], prefix: '!', isOwner: false, reply });
    assert.ok(/fechou/.test(replies.at(-1)), 'votar depois de fechada → recusado');

    // secreta: status esconde contagem
    replies.length = 0;
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['abrir', 'secreta', 'Go ou não? | go | não'], prefix: '!', isOwner: true, reply });
    await casos.votar({ sock, msg: {}, ctx: mkCtx('205'), args: ['1'], prefix: '!', isOwner: false, reply });
    assert.ok(/envelope|secredo/i.test(replies.at(-1)) || /🤫/.test(replies.at(-1)), 'secreta não queima números');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    vt.limpar('g2@g.us');
    console.log('✔ votação da casa: botões, 1 pessoa 1 voto, empate, secreta, gates de admin');
  }

  // ── 5. FIX DO CONVITE — undefined ≠ falha, pendente ≠ inválido ────
  {
    const canais = require('../src/aura/auraCanais');
    const CODE = 'LUiiz6cVVIS1wLP8zYDZol';
    const mk = (opts) => ({
      groupGetInviteInfo: async () => (opts.peekFail ? (() => { throw new Error('peek off'); })() : { subject: 'Família Unida' }),
      communityGetInviteInfo: async () => { throw new Error('nao comunidade'); },
      groupAcceptInvite: async () => {
        if (opts.throwMsg) { const e = new Error(opts.throwMsg); if (opts.status) e.output = { statusCode: opts.status }; throw e; }
        return undefined; // ← o fork devolve NADA quando ENTRA — era isto que partia tudo
      },
    });
    // 5a. sucesso puro (o caso do print — agora diz «entrei»)
    let r = await canais.entrarPorLink(mk({}), `https://chat.whatsapp.com/${CODE}`);
    assert.ok(r.ok && !r.pendente && /Família Unida/.test(r.msg), 'aceite sem retorno = SUCESSO reconhecido');
    // 5b. grupo com aprovação de admin → PENDENTE, não «link inválido»
    r = await canais.entrarPorLink(mk({ throwMsg: 'not-allowed', status: 403 }), `https://chat.whatsapp.com/${CODE}`);
    assert.ok(r.ok && r.pendente && /aprova|pendente/i.test(r.msg), '403 + invite válido → pedido pendente ⏳');
    r = await canais.entrarPorLink(mk({ throwMsg: 'invite code not valid' }), `https://chat.whatsapp.com/${CODE}`);
    assert.ok(r.ok && r.pendente, '«not valid» com espreita OK → pendência, não asneira');
    // 5c. revogado a sério (sem peek) continua honesto
    r = await canais.entrarPorLink(mk({ throwMsg: 'not-authorized', peekFail: true }), `https://chat.whatsapp.com/${CODE}`);
    assert.ok(!r.ok && /revogado|expirou/.test(r.msg), 'revogado = diz revogado');
    r = await canais.entrarPorLink(mk({ throwMsg: 'gone', status: 410, peekFail: true }), `https://chat.whatsapp.com/${CODE}`);
    assert.ok(!r.ok && /não existe/.test(r.msg), '410 = grupo morto');
    r = await canais.entrarPorLink(mk({ throwMsg: 'conflict', status: 409 }), `https://chat.whatsapp.com/${CODE}`);
    assert.ok(r.ok && /Já estou/.test(r.msg), '409 = já lá estou (ok, não erro)');
    console.log('✔ convite: sucesso/pendente/revogado/409 — cada um com a sua cara');

    // 5d. o cartão AURASEL «Entrar no grupo» usa o motor (era o bug do print)
    const avisos = require('../src/aura/auraAvisos');
    const src = fs.readFileSync(require.resolve('../src/aura/auraAvisos.js'), 'utf8');
    assert.ok(/entrarPorLink\(sock, link\)/.test(src) && !/if \(!jidEntrada \|\| jidEntrada\.__erro\)/.test(src), 'despachar do convite não volta a checar o retorno vazio');
    const msgs = [];
    const sockA = {
      sendMessage: async (j, o) => { msgs.push({ j, o }); return {}; },
      groupGetInviteInfo: async () => ({ subject: 'Família Unida' }),
      communityGetInviteInfo: async () => { throw new Error('x'); },
      groupAcceptInvite: async () => undefined,
    };
    await avisos.despachar({ do: 'convite', code: CODE, de: '2449222333' }, 0, { sock: sockA, msg: { key: {} }, ctx: { remoteJid: 'dono@s.whatsapp.net' }, config: { bot: { name: 'DARK' } } });
    assert.ok(msgs.some((m) => /Aceitei|Entrei/i.test(JSON.stringify(m.o)) || /Família Unida/.test(JSON.stringify(m.o))), 'clique «Entrar no grupo» agora ENTRA de verdade');
    assert.ok(msgs.some((m) => /Obrigado pelo convite/.test(JSON.stringify(m.o))), 'quem convidou recebe o obrigado');
    console.log('✔ AURASEL: decisão do cartão ligada ao motor certo (fim do «link inválido» falso)');

    // 5e. o caminho rápido do dono no commandHandler também migrou
    const srcCH = fs.readFileSync(require.resolve('../src/bot/commandHandler.js'), 'utf8');
    const bloco = srcCH.slice(srcCH.indexOf('v9.16: passa pelo motor'), srcCH.indexOf('v9.16: passa pelo motor') + 800);
    assert.ok(/entrarPorLink/.test(bloco) && !/__erro/.test(bloco), 'PV do dono usa o motor (sem !r.__erro vs undefined)');
    console.log('✔ link do dono no PV: idem');
  }

  // ── 6. estáticos: nothing-fake garantido ──────────────────────────
  {
    const srcV = fs.readFileSync(require.resolve('../src/aura/auraVotacao.js'), 'utf8');
    assert.ok(!/for \(let i = 0; i < \d+; i\+\+\) vot/.test(srcV), 'zero multi-voto automático por design');
    const srcC = fs.readFileSync(require.resolve('../src/bot/cases/votacao.js'), 'utf8');
    assert.ok(/1 pessoa = 1 voto/.test(srcC) || /1 pessoa = 1 voto/.test(srcV), 'contrato de honestidade escrito no código');
    assert.ok(/HONESTIDADE POR DESIGN/.test(srcC), 'recusa de falsificação documentada no módulo');
    console.log('✔ anti-falsificação: sem contagem duplicada nem reações inventadas');
  }

  console.log('\nOK / test-votacao — enquetes, votos, reação de canal e convite a mentir menos (v9.16)');
  process.exit(0);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
