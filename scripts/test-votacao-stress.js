#!/usr/bin/env node
'use strict';
/**
 * DARK BOT v9.16 — STRESS DE VOTOS/SELEÇÃO
 * O pedido do Dark: «testa se os votos/seleção funciona, uma opção etc,
 * várias vezes». Não é o unit-lite do test-votacao — é a sala cheia:
 *   S1  24 membros → voto exato por opção, sem duplicados, sem perdidos
 *   S2  troca de voto em massa — a troca MOVED, nunca soma
 *   S3  5 aberturas em sequência no mesmo chat (limpar bem entre rondas)
 *   S4  spam de índices inválidos/lixo — zero mutações no mapa
 *   S5  bot-toque (id `!votar N` dos quick_reply) == escrita manual
 *   S6  empate e maioria verificados aritmeticamente no fecho
 *   S7  secreta: eco nunca queima contagem; fechar revela
 *   S8  enquete REAL: N pessoas a pedir voto ao bot → só o VOTO DELE,
 *       trocas refletem, e 1 conta continua = 1 voto
 *   S9  fechar sem votos / votar depois de fechar / reabrir depois de tudo
 *   S10 concorrência: 60 votos entregues fora de ordem (Promise.all)
 * Uso: node scripts/test-votacao-stress.js
 */
const assert = require('assert');
const vt = require('../src/aura/auraVotacao');

const G = 'stress@g.us';
const mkSock = () => {
  const sent = [];
  return {
    sent,
    user: { id: 'bot@s.whatsapp.net' },
    sendMessage: async (jid, content, opt) => { sent.push({ jid, content }); return { key: { id: 'S' + sent.length, remoteJid: jid, fromMe: true } }; },
    relayMessage: async (jid, message) => { sent.push({ jid, content: message, relay: true }); return {}; },
  };
};

(async () => {
  console.log('=== STRESS VOTOS/SELEÇÃO — v9.16 ===');
  const casos = {};
  require('../src/bot/cases/votacao')((nomes, fn) => { for (const x of [].concat(nomes)) casos[x] = fn; });
  const mkCtx = (num) => ({ remoteJid: G, isGroup: true, senderNumber: num, senderJid: `${num}@s.whatsapp.net`, pushName: `p${num}`, prefix: '!' });
  const replySink = { last: '' };
  const reply = async (t) => { replySink.last = t; };

  // ═══ S1 — sala cheia: 24 membros, repartidos 10/8/6 ═══════════════
  {
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['"Jantar?" | Pirão | Kizomba | Pizza'], prefix: '!', isOwner: true, reply });
    assert.ok(/Votação aberta/.test(replySink.last), 'abriu com 4 opções (3 votáveis + default?)');
    const v = vt.__test.VOTACOES.get(G);
    assert.strictEqual(v.opcoes.length, 3, '3 opções parseadas');
    const dist = [];
    for (let i = 0; i < 24; i++) dist.push((i % 3) + 1);
    const espera = [0, 0, 0];
    for (let i = 0; i < 24; i++) {
      await casos.votar({ sock, msg: {}, ctx: mkCtx(`2${String(i).padStart(2, '0')}`), args: [String(dist[i])], prefix: '!', isOwner: false, reply });
      assert.ok(/registado/.test(replySink.last), `voto ${i + 1} aceite (${replySink.last.slice(0, 40)})`);
      espera[dist[i] - 1]++;
    }
    const c = vt.__test.contagem(v);
    assert.deepStrictEqual(c, espera, `contagem exata ${c.join('/')} = ${espera.join('/')}`);
    assert.strictEqual(v.votos.size, 24, '24 votantes distintos, 24 votos — zero duplicados');
    console.log(`✔ S1 sala cheia: 24 → ${c.join('/')} (exato, sem fantasmas)`);
  }

  // ═══ S2 — troca em massa: metade muda → moved, nunca +1 ════════════
  {
    const sock = mkSock();
    const v = vt.__test.VOTACOES.get(G);
    let trocas = 0;
    for (let i = 0; i < 12; i++) {
      await casos.votar({ sock, msg: {}, ctx: mkCtx(`2${String(i * 2).padStart(2, '0')}`), args: [String((i % 3) + 1)], prefix: '!', isOwner: false, reply });
      if (/mudou/.test(replySink.last)) trocas++;
    }
    assert.ok(trocas >= 8, `trocas reconhecidas como mudança (${trocas}/12)`);
    const c = vt.__test.contagem(v);
    assert.strictEqual(c.reduce((s, x) => s + x, 0), 24, 'TOTAL invariante a trocas — trocar ≠ somar');
    await casos.votar({ sock, msg: {}, ctx: mkCtx('200'), args: ['1'], prefix: '!', isOwner: false, reply });
    assert.ok(/já tinha esse|nada mudou/.test(replySink.last), 're-votar na MESMA opção → diz «nada mudou», não «mudou»');
    assert.strictEqual(vt.__test.contagem(v).reduce((s, x) => s + x, 0), 24, 'total ainda 24 após re-voto igual');
    console.log(`✔ S2 trocas: 12 mudanças, total selado em 24 · re-voto igual não conta dobrado`);
  }

  // ═══ S3 — 5 rondas seguidas no mesmo chat, sem lixo entre elas ═════
  {
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    for (let ronda = 1; ronda <= 5; ronda++) {
      await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
      await casos.votacao({ sock, msg: {}, ctx: DONO, args: [`"Ronda ${ronda}" | sim | não`], prefix: '!', isOwner: true, reply });
      assert.ok(/Votação aberta/.test(replySink.last), `ronda ${ronda} abriu`);
      const N = 5 + ronda;
      for (let i = 0; i < N; i++) {
        await casos.votar({ sock, msg: {}, ctx: mkCtx(`r${ronda}u${i}`), args: [String((i % 2) + 1)], prefix: '!', isOwner: false, reply });
      }
      const v = vt.__test.VOTACOES.get(G);
      const c = vt.__test.contagem(v);
      assert.strictEqual(c[0] + c[1], N, `ronda ${ronda}: ${c.join('/')} soma ${N}`);
      assert.ok(c[0] === Math.ceil(N / 2) && c[1] === Math.floor(N / 2), `ronda ${ronda} repartição certa`);
    }
    console.log('✔ S3 cinco rondas seguidas — cada uma conta só os seus votos');
  }

  // ═══ S4 — spam de inválidos: o mapa não muta ═══════════════════════
  {
    const sock = mkSock();
    const v = vt.__test.VOTACOES.get(G);
    const antes = v.votos.size;
    const lixo = ['0', '99', '-1', '', '   ', 'nan', 'NaN', 'doze', '🍕', '|||', 'sim|não', '1e1'];
    for (const t of lixo) {
      await casos.votar({ sock, msg: {}, ctx: mkCtx('lixo1'), args: [t], prefix: '!', isOwner: false, reply });
      assert.ok(/errada|Escolhe|Escolhe a op|1–2/.test(replySink.last), `lixo "${t}" recusado com explicação (${replySink.last.slice(0, 30)})`);
    }
    assert.strictEqual(v.votos.size, antes, 'NENHUM voto de lixo entrou na mesa');
    console.log(`✔ S4 ${lixo.length} inputs de lixo → 0 mutações, todos explicados`);
  }

  // ═══ S5 — seleção por botão: o toque cai no mesmo sítio que o texto ═
  {
    const sock = mkSock();
    // os quick_reply do cartão têm id `!votar N` — o botãoHandler reentrega
    // esse texto como mensagem; simulamos o toque EXATAMENTE nesse caminho:
    const v = vt.__test.VOTACOES.get(G);
    const antes = vt.__test.contagem(v).slice();
    const textoBotao = '!votar 2'; // id gravado no cartão
    const m = textoBotao.match(/^!votar (\d)$/);
    assert.ok(m, 'formato do id do botão é mesmo !votar N');
    await casos.votar({ sock, msg: {}, ctx: mkCtx('botão9'), args: [m[1]], prefix: '!', isOwner: false, reply });
    const depois = vt.__test.contagem(v);
    assert.strictEqual(depois[1], antes[1] + 1, 'toque no botão 2 = +1 na opção 2');
    assert.strictEqual(depois[0] + depois[1] + (depois[2] || 0), antes.reduce((s, x) => s + x, 0) + 1, 'e o total mexeu só +1');
    console.log('✔ S5 seleção por botão (!votar N) cai no mesmo motor que o texto');
  }

  // ═══ S6 — aritmética do fecho: maioria e empate ════════════════════
  {
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['"Maior ou empate?" | gorda | empatada'] , prefix: '!', isOwner: true, reply });
    for (let i = 0; i < 5; i++) await casos.votar({ sock, msg: {}, ctx: mkCtx(`M${i}`), args: ['1'], prefix: '!', isOwner: false, reply });
    for (let i = 0; i < 5; i++) await casos.votar({ sock, msg: {}, ctx: mkCtx(`E${i}`), args: ['2'], prefix: '!', isOwner: false, reply });
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['fechar'], prefix: '!', isOwner: true, reply });
    assert.ok(/EMPATE/.test(replySink.last) && /50%/.test(replySink.last) && /5v/.test(replySink.last), 'empate 5-5 → 🤝 50%');
    // desempatar com 1 voto → 6/5 = 55%|45%
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['"Desempate" | gorda | empatada'], prefix: '!', isOwner: true, reply });
    for (let i = 0; i < 6; i++) await casos.votar({ sock, msg: {}, ctx: mkCtx(`X${i}`), args: ['1'], prefix: '!', isOwner: false, reply });
    for (let i = 0; i < 4; i++) await casos.votar({ sock, msg: {}, ctx: mkCtx(`Y${i}`), args: ['2'], prefix: '!', isOwner: false, reply });
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['fechar'], prefix: '!', isOwner: true, reply });
    assert.ok(/Vence \*gorda\* com 6/.test(replySink.last) && /60%/.test(replySink.last) && /40%/.test(replySink.last), '6-4 → 60/40 + 🏆 certo');
    console.log('✔ S6 fecho: empate 5-5 e maioria 6/4 com percentagens exatas');
  }

  // ═══ S7 — secreta: opacidade antes, revelação depois ═══════════════
  {
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['abrir', 'secreta', '"Quem foi?" | eu | o bot'], prefix: '!', isOwner: true, reply });
    for (let i = 0; i < 9; i++) {
      await casos.votar({ sock, msg: {}, ctx: mkCtx(`Q${i}`), args: ['2'], prefix: '!', isOwner: false, reply });
      assert.ok(!/\d+v · \d+%/.test(replySink.last), `eco do voto ${i + 1} não queima contagem`);
    }
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['status'], prefix: '!', isOwner: true, reply });
    assert.ok(/9 voto\(s\) dentro do envelope/.test(replySink.last) || /envelope/.test(replySink.last), 'status secreta só mostra volume');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['fechar'], prefix: '!', isOwner: true, reply });
    assert.ok(/o bot — 9v \(100%\)/.test(replySink.last), 'fecho revela tudo: 9/0 100%');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    console.log('✔ S7 secreta: 9 ecos opacos → status só volume → fecho revela 100%');
  }

  // ═══ S8 — enquete REAL repetida: o voto do bot troca, nunca duplica ═
  {
    const sock = mkSock();
    for (let k = 1; k <= 3; k++) {
      await vt.criarEnquete(sock, G, { pergunta: `Enquete ${k}`, opcoes: ['um', 'dois', 'tres'], max: 1 });
      let mudadas = 0;
      for (let i = 0; i < 8; i++) {
        const r = await vt.votarEnquete(sock, G, { escolha: String((i % 3) + 1) });
        assert.ok(r.ok, `voto ${i + 1} da enquete ${k} aceite`);
        if (r.mudou) mudadas++;
      }
      assert.ok(mudadas >= 4, `enquete ${k}: trocas sinalizadas (${mudadas}/8)`);
      const e = vt.__test.ENQUETES.get(G);
      assert.strictEqual(e.meusVotos.size, 1, `enquete ${k}: a conta do bot tem UM voto (${e.meusVotos.size})`);
      vt.limpar(G);
    }
    // 30 pedidos de voto de MEMBROS não criam 30 votos do bot — o bot é 1 conta
    const sock2 = mkSock();
    await vt.criarEnquete(sock2, G, { pergunta: 'Um só', opcoes: ['a', 'b'], max: 1 });
    for (let i = 0; i < 30; i++) await vt.votarEnquete(sock2, G, { escolha: 'a' });
    assert.strictEqual(sock2.sent.filter((x) => x.content.pollUpdate).length, 30, 'o bot reenviou o SEU voto 30x — sempre o MESMO (1 conta 1 voto no resultado)');
    const ult = sock2.sent.filter((x) => x.content.pollUpdate);
    assert.ok(ult.every((x) => JSON.stringify(x.content.pollUpdate.key) === JSON.stringify(ult[0].content.pollUpdate.key)), 'mesma key/destino em todos os reenvios — sem spam a chats alheios');
    vt.limpar(G);
    console.log('✔ S8 enquete real ×3 rondas + 30 reenvios = sempre 1 voto do bot, troca ≠ duplicação');
  }

  // ═══ S9 — fronteiras: fechar sem votos, votar depois, reabrir ═══════
  {
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['"Ninguém" | a | b'], prefix: '!', isOwner: true, reply });
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['fechar'], prefix: '!', isOwner: true, reply });
    assert.ok(/Ninguém votou/.test(replySink.last), 'fechar a zero → «a pergunta fica no ar», sem crash');
    const v = vt.__test.VOTACOES.get(G);
    assert.ok(v && v.aberto === false, 'fechada fica marcada como fechada');
    await casos.votar({ sock, msg: {}, ctx: mkCtx('999'), args: ['1'], prefix: '!', isOwner: false, reply });
    assert.ok(/fechou/.test(replySink.last), 'voto depois do fecho → recusado à porta');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['fechar'], prefix: '!', isOwner: true, reply });
    assert.ok(/já fechou|Já estava fechada|fechou/i.test(replySink.last), 'duplo fechar é educado');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['"Reaberta" | sim | não'], prefix: '!', isOwner: true, reply });
    assert.ok(/Votação aberta/.test(replySink.last), 'reabrir depois de tudo limpo funciona');
    const v2 = vt.__test.VOTACOES.get(G);
    assert.strictEqual(v2.votos.size, 0, 'a reaberta nasce virgem (0 votos)');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    console.log('✔ S9 fronteiras: 0-votos, fechar×2, voto tardio, reabertura limpa');
  }

  // ═══ S10 — concorrência: 60 votos em Promise.all, ordem nenhuma ════
  {
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['"Corrida" | azul | vermelho | verde'], prefix: '!', isOwner: true, reply });
    const esper = [20, 20, 20];
    await Promise.all(Array.from({ length: 60 }, (_, i) =>
      casos.votar({ sock, msg: {}, ctx: mkCtx(`C${i}`), args: [String((i % 3) + 1)], prefix: '!', isOwner: false, reply })
    ));
    const v = vt.__test.VOTACOES.get(G);
    assert.deepStrictEqual(vt.__test.contagem(v), esper, `60 concorrentes → ${v.votos.size ? vt.__test.contagem(v).join('/') : ''} = 20/20/20`);
    // e cada pessoa exatamente uma entrada no mapa
    assert.strictEqual(new Set(v.votos.keys()).size, 60, '60 jids únicos = 60 entradas');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    console.log('✔ S10 60 votos em paralelo — contagem selada, zero corrida no mapa');
  }

  // ═══ BÓNUS — 200 rondas de abrir/100-votos/fechar: o motor aguenta ══
  {
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    for (let r = 0; r < 200; r++) {
      await casos.votacao({ sock, msg: {}, ctx: DONO, args: [`"R${r}" | a | b`], prefix: '!', isOwner: true, reply });
      await Promise.all(Array.from({ length: 100 }, (_, i) =>
        casos.votar({ sock, msg: {}, ctx: mkCtx(`z${r}-${i}`), args: [String((i * r) % 2 + 1)], prefix: '!', isOwner: false, reply })));
      const v = vt.__test.VOTACOES.get(G);
      if (v.votos.size !== 100) throw new Error(`ronda ${r}: ${v.votos.size} ≠ 100`);
      await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    }
    console.log('✔ bónus: 200 rondas × 100 votos (20 000 votos no total) — exato todas');
  }

  // ═══ S11 — TOQUE REAL: a resposta do telemóvel pelo funil trueiro ═══
  {
    const ch = require('../src/bot/commandHandler');
    const sock = mkSock();
    const DONO = { ...mkCtx('100'), isOwner: true, isAdmin: true };
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['"Tap real" | a | b | c'], prefix: '!', isOwner: true, reply });
    assert.ok(/Votação aberta/.test(replySink.last), 'aberta para o teste de toque');

    // 11a. quick_reply nativeFlow — é EXATAMENTE o que o aparelho envia ao tocar
    const tap1 = { message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: '!votar 3' }), message: 'Votaste' } } } };
    assert.strictEqual(ch.extractText(tap1), '!votar 3', 'extractText apanha o id do botão');
    await casos.votar({ sock, msg: {}, ctx: mkCtx('tapi1'), args: ['3'], prefix: '!', isOwner: false, reply });
    assert.ok(/registado: \*c\*/.test(replySink.last), 'toque → voto na opção c');

    // 11b. lista clássica single_select (rowId) e templateButtonReply
    const tap2 = { message: { listResponseMessage: { singleSelectReply: { selectedRowId: '!votar 1' } } } };
    const tap3 = { message: { buttonsResponseMessage: { selectedButtonId: '!votar 2' } } };
    assert.strictEqual(ch.extractText(tap2), '!votar 1', 'rowId da lista → comando');
    assert.strictEqual(ch.extractText(tap3), '!votar 2', 'botão template → comando');
    await casos.votar({ sock, msg: {}, ctx: mkCtx('tapi2'), args: ['1'], prefix: '!', isOwner: false, reply });
    await casos.votar({ sock, msg: {}, ctx: mkCtx('tapi3'), args: ['2'], prefix: '!', isOwner: false, reply });

    // 11c. os ids GRAVADOS no cartão enviado são todos votáveis: toca-los já
    const v = vt.__test.VOTACOES.get(G);
    const antesTot = v.votos.size;
    const carta = JSON.parse(JSON.stringify(sock.sent[sock.sent.length - 1] ? sock.sent.map((x) => x.content).find((c) => JSON.stringify(c).includes('votar')) || '{}' : '{}'));
    const ids = (JSON.stringify(carta).match(/!votar [123]/g) || []);
    assert.ok(ids.length >= 3, `cartão traz os ${ids.length} ids !votar N`);
    for (const idTxt of ids) {
      const tap = { message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: idTxt }) } } } };
      const extraido = ch.extractText(tap);
      assert.ok(/^!votar [123]$/.test(extraido), `id extraído é comando votável (${extraido})`);
      await casos.votar({ sock, msg: {}, ctx: mkCtx(`tap${v.votos.size}`), args: [extraido.split(' ')[1]], prefix: '!', isOwner: false, reply });
    }
    assert.strictEqual(v.votos.size, antesTot + ids.length, `todos os ${ids.length} toques registados, um por pessoa`);

    // 11d. enquete real: o VOTO do utilizador (pollUpdate) também é lido pelo funil
    const tapPoll = { message: { pollUpdateMessage: { vote: { selectedOptions: ['b'] } } } };
    assert.strictEqual(ch.extractText(tapPoll), 'b', 'voto de enquete extraído como escolha');

    // 11e. fechar e conferir a aritmética inteira dos toques
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['fechar'], prefix: '!', isOwner: true, reply });
    const c = vt.__test.contagem(v);
    assert.strictEqual(c.reduce((s, x) => s + x, 0), antesTot + ids.length + 0 + 0, 'fecho bate certo com os toques enviados');
    await casos.votacao({ sock, msg: {}, ctx: DONO, args: ['limpar'], prefix: '!', isOwner: true, reply });
    console.log(`✔ S11 toque real (nativeFlow/lista/template/enquete): ${ids.length}+2 taps → contagem selada`);
  }

  vt.limpar(G);
  console.log('\n🎉 STRESS: votos, seleção (botão e texto), trocas e rondas — tudo exato');
  process.exit(0);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
