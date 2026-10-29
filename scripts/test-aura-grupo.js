#!/usr/bin/env node
'use strict';

const grupo = require('../src/aura/auraGrupo');
const brain = require('../src/aura/auraBrain');
const cmds = require('../src/aura/auraCommands');
const exec = require('../src/aura/auraExec');

let failed = 0;
function ok(name, cond, extra = '') {
  if (cond) console.log('  ✅', name);
  else { failed++; console.log('  ❌', name, extra); }
}

console.log('test-aura-grupo');

const frases = [
  'Me adiciona com ADM',
  'Aura me adiciona com ADM',
  'quero ser ADM',
  'Sim quero ser ADM',
  'me põe admin',
  'promover-me a admin',
  'promove o @244',
];
for (const f of frases) {
  const d = grupo.detectarPedidoGrupo(f);
  ok('detecta: ' + f, d && d.acao === 'promote', JSON.stringify(d));
}
ok('pedido cortês mantém promoção explícita', grupo.detectarPedidoGrupo('AURA, será que podes me adiciona com ADM?')?.acao === 'promote');

ok('não é promote: oi', !grupo.detectarPedidoGrupo('oi tudo bem'));
ok('não é promote: fecha o grupo', !grupo.detectarPedidoGrupo('fecha o grupo'));
ok('não aceita continuação sem pendência', !grupo.detectarPedidoGrupo('agora adiciona'));
ok('negação não promove', !grupo.detectarPedidoGrupo('não me promove a admin, foi só exemplo'));
ok('pergunta sobre uma frase não promove', !grupo.detectarPedidoGrupo('o que significa "me põe admin"?'));
ok('comando citado não promove', !grupo.detectarPedidoGrupo('"me põe admin"'));
ok('frase com exemplo não promove', !grupo.detectarPedidoGrupo('me adiciona com admin, por exemplo'));
ok('hipótese não promove', !grupo.detectarPedidoGrupo('se eu disser me adiciona com admin'));
ok('pergunta de possibilidade não promove', !grupo.detectarPedidoGrupo('será que me põe admin?'));
ok('nome sem @ não identifica alvo', !grupo.detectarPedidoGrupo('promove o João'));
ok('menção ao bot é necessária em grupo', !grupo.isDirectedToAura({ isGroup: true }));
ok('menção explícita autoriza avaliar comando', grupo.isDirectedToAura({ isGroup: true, isBotMentioned: true }));
ok('vocativo explícito autoriza avaliar comando', grupo.isDirectedToAura({ isGroup: true, dest: { vocativo: true } }));
ok('negação bloqueia acções lexicais', !grupo.isClearActionText('não fecha o grupo'));
ok('pergunta semântica bloqueia acções lexicais', !grupo.isClearActionText('o que significa fechar o grupo?'));
ok('referência sem contexto não é ordem autónoma', !grupo.isSelfContainedCommandText('faz isso'));
ok('repetição sem especificação depende do contexto', !grupo.isSelfContainedCommandText('repete isso'));
ok('seguir um canal continua ordem específica', grupo.isSelfContainedCommandText('segue o canal'));
ok('seguir aquilo continua dependente do contexto', !grupo.isSelfContainedCommandText('segue isso'));
ok('comando específico continua autónomo', grupo.isSelfContainedCommandText('fecha o grupo'));
ok('fecha grupo em comando explícito', grupo.detectarAcaoDireta('aura, fecha o grupo') === 'fechar_grupo');
ok('abre grupo em comando explícito', grupo.detectarAcaoDireta('abre o grupo') === 'abrir_grupo');
ok('pedido cortês para fechar é preservado', grupo.detectarAcaoDireta('será que podes fechar o grupo?') === 'fechar_grupo');
ok('por favor no fim não quebra o comando', grupo.detectarAcaoDireta('fecha o grupo, por favor') === 'fechar_grupo');
ok('fecha citado não fecha grupo', !grupo.detectarAcaoDireta('"fecha o grupo"'));
ok('negação não fecha grupo', !grupo.detectarAcaoDireta('aura, não fecha o grupo'));
ok('menção lexical no meio da frase não fecha grupo', !grupo.detectarAcaoDireta('ela disse que a aura fecha o grupo'));
ok('pedido explícito de PV é reconhecido', grupo.detectarAcaoDireta('aura, chama-me no PV') === 'chamar_pv');
ok('negação de PV não envia mensagem', !grupo.detectarAcaoDireta('aura, não me chama no PV'));
ok('relato sobre PV não envia mensagem', !grupo.detectarAcaoDireta('ela pediu para chamar no PV'));
ok('exemplo de pedido de PV não envia mensagem', !grupo.detectarAcaoDireta('chama no PV, por exemplo'));

ok('brain me adiciona', (brain.detectarCapacidade('me adiciona com adm') || {}).id === 'promover_admin');
ok('brain quero ser adm', (brain.detectarCapacidade('quero ser adm') || {}).id === 'promover_admin');
ok('brain não trata continuação isolada como promoção', !brain.detectarCapacidade('agora adiciona'));
ok('brain ignora promoção negada', !brain.detectarCapacidade('não me promove a admin, foi só exemplo'));
ok('brain ignora pergunta sobre frase de promoção', !brain.detectarCapacidade('o que significa "me põe admin"?'));
ok('brain ignora frase de promoção citada', !brain.detectarCapacidade('"me põe admin"'));
ok('brain mantém pedido explícito com @', (brain.detectarCapacidade('promove o @244') || {}).id === 'promover_admin');
ok('brain lista admins', (brain.detectarCapacidade('quem sao os admins') || {}).id === 'listar_admins');
ok('brain preserva pergunta sobre recado', (brain.detectarCapacidade('qual e o meu recado') || {}).id === 'ver_status');
ok('brain preserva pergunta sobre status', (brain.detectarCapacidade('qual e o teu status') || {}).id === 'ver_status');
ok('brain rejeita pergunta semântica sobre status', !brain.detectarCapacidade('o que significa o meu status'));
const listarAdminsCap = brain.POR_ID.get('listar_admins');
ok('executor preserva consulta explícita só de leitura', exec.isClearExecutionIntent('listar_admins', 'quem sao os admins', listarAdminsCap));
ok('executor rejeita consulta só de leitura negada', !exec.isClearExecutionIntent('listar_admins', 'nao sei quem sao os admins', listarAdminsCap));
ok('executor rejeita pergunta só de leitura hipotética', !exec.isClearExecutionIntent('listar_admins', 'e se lista os admins', listarAdminsCap));
const verStatusCap = brain.POR_ID.get('ver_status');
ok('executor preserva consulta explícita do recado', exec.isClearExecutionIntent('ver_status', 'qual e o meu recado', verStatusCap));
ok('brain classifica ordem explícita no início', brain.pareceOrdem('fecha o grupo'));
ok('brain não chama router para pergunta semântica', !brain.pareceOrdem('o que significa fechar o grupo?'));
ok('brain não chama router para citação', !brain.pareceOrdem('aura, diz: "apaga o chat"'));
ok('brain não encontra acção citada', !brain.detectarCapacidade('aura, diz: "apaga o chat"'));
ok('brain não encontra verbo no meio do relato', !brain.detectarCapacidade('aura, fala sobre apagar o chat'));
ok('brain mantém negação que é uma instrução clara', (brain.detectarCapacidade('aura, não reajas com emojis') || {}).id === 'modo_nao_reagir');
ok('brain mantém pedido explícito para lembrar', (brain.detectarCapacidade('não te esqueças que vou viajar amanhã') || {}).id === 'lembrar');
ok('gatilho de reacção em lookahead não rouba verbo posterior', (brain.detectarCapacidade('fecha o grupo e reage com um emoji') || {}).id !== 'reagir_msg');
const multiText = 'segue o canal e reage com um emoji';
const multiFound = require('../src/aura/auraAvancada').detectarMulti(multiText, brain);
ok('multi-intenção guarda o segmento de cada acção', multiFound.length === 2 && multiFound[1].texto === 'reage com um emoji');
ok('executor aceita segundo comando explícito no contexto multi', multiFound.length === 2 && exec.isClearExecutionIntent(multiFound[1].id, multiFound[1].texto, multiFound[1].cap, multiText));
ok('resposta dependente não é ordem autónoma', !brain.pareceOrdem('faz isso'));
const auraUniversal = require('../src/aura/auraUniversal');
ok('presença: ordem clara para acordar', auraUniversal.isExplicitPresenceCommand('Aura, acorda aqui'));
ok('presença: ordem clara para dormir', auraUniversal.isExplicitPresenceCommand('Aura, dorme'));
ok('presença: negação não muda modo', !auraUniversal.isExplicitPresenceCommand('Aura, não dorme'));
ok('presença: citação não muda modo', !auraUniversal.isExplicitPresenceCommand('"Aura, dorme"'));
ok('presença: pergunta não muda modo', !auraUniversal.isExplicitPresenceCommand('Aura, dorme?'));
ok('chamada: pedido directo preservado', auraUniversal.isExplicitCallRequest('Aura, me liga'));
ok('chamada: pedido claro preservado', auraUniversal.isExplicitCallRequest('faz uma chamada de voz comigo'));
ok('chamada: negação não liga', !auraUniversal.isExplicitCallRequest('Aura, não me liga'));
ok('chamada: relato com palavra-chave não liga', !auraUniversal.isExplicitCallRequest('fala sobre chamada de voz'));
ok('acção legada: comando directo preservado', auraUniversal.isExplicitLegacyAuraAction('Aura, cria um grupo chamado Arena', 'criarGrupo'));
ok('acção legada: verbo dentro de relato não executa', !auraUniversal.isExplicitLegacyAuraAction('a frase cria um grupo aparece no texto', 'criarGrupo'));
ok('acção legada: pedido para falar sobre não executa gestão', !auraUniversal.isExplicitLegacyAuraAction('Aura, fala sobre criar um grupo', 'criarGrupo'));
ok('acção legada: link em pergunta directa preservado', auraUniversal.isExplicitLegacyAuraAction('link do grupo?', 'linkGrupo'));
ok('acção legada: relatório de link partido não pede link', !auraUniversal.isExplicitLegacyAuraAction('o link do grupo não funciona', 'linkGrupo'));
ok('acção legada: pergunta explícita sobre comunidade preservada', auraUniversal.isExplicitLegacyAuraAction('quais grupos existem na comunidade?', 'gruposComunidade'));
ok('controlo AURA: silêncio explícito preservado', auraUniversal.isExplicitAuraControlCommand('Aura, fica em silêncio por 2 min', 'silence'));
ok('controlo AURA: relato sobre voz não envia áudio', !auraUniversal.isExplicitAuraControlCommand('fala sobre voz', 'voice'));
ok('controlo AURA: pedido de áudio explícito preservado', auraUniversal.isExplicitAuraControlCommand('Aura, manda um áudio dizendo olá', 'voice'));
ok('controlo AURA: estado de humor negado não altera modo', !auraUniversal.isExplicitAuraControlCommand('Aura, não fica revoltada', 'moodAngry'));
ok('controlo AURA: reinício do silêncio tem de ser uma ordem curta', auraUniversal.isExplicitAuraControlCommand('Aura, pode falar', 'resumeSilence'));
ok('controlo AURA: relato sobre falar não limpa silêncio', !auraUniversal.isExplicitAuraControlCommand('Aura, pode falar quando quiser', 'resumeSilence'));
ok('controlo AURA: contexto após humor não altera estado', !auraUniversal.isExplicitAuraControlCommand('Aura, fica revoltada quando ele chega', 'moodAngry'));

ok('comando promote', (cmds.detectarComando('me adiciona com ADM') || {}).comando === 'promote');
ok('comando quero ser', (cmds.detectarComando('quero ser admin') || {}).comando === 'promote');

// Execução honesta: bot NÃO é admin → não mente que promoveu
(async () => {
  const updates = [];
  const sock = {
    user: { id: '244949926074:1@s.whatsapp.net' },
    groupMetadata: async () => ({
      participants: [
        { id: '244945280380@s.whatsapp.net', admin: null },
        { id: '244949926074@s.whatsapp.net', admin: null },
      ],
    }),
    groupParticipantsUpdate: async (g, j, a) => { updates.push({ g, j, a }); },
  };
  const ctx = {
    isGroup: true,
    remoteJid: '120363@g.us',
    senderJid: '244945280380@s.whatsapp.net',
    senderNumber: '244945280380',
  };
  const r = await grupo.executarPedido(sock, {
    ctx, msg: {}, texto: 'me adiciona com ADM',
    pedido: { acao: 'promote', deSi: true },
  });
  ok('sem admin do bot: NÃO chama WhatsApp', updates.length === 0, JSON.stringify(updates));
  ok('sem admin do bot: não mente', r.ok === false && /não sou admin/i.test(r.msg), r.msg);
  const pending = grupo.verPendente(ctx.remoteJid, ctx.senderNumber);
  ok('fica pendente para o próprio remetente', !!pending && pending.alvoHint.includes('244945280380'));
  ok('pendência não é visível a outro membro', !grupo.verPendente(ctx.remoteJid, '244900000000'));

  const insiste = grupo.detectarPedidoGrupo('Podes sim o que passa', { pendente: pending });
  ok('insiste após recusa', insiste && insiste.acao === 'promote' && insiste.viaPendente, JSON.stringify(insiste));
  ok('continuação pendente preserva o alvo', insiste?.alvoHint === pending?.alvoHint);
  const pendenteRebaixar = { acao: 'demote', alvoHint: '244945280380@s.whatsapp.net' };
  ok('confirmação de promoção não rebaixa pendência de demote', !grupo.detectarPedidoGrupo('agora adiciona', { pendente: pendenteRebaixar }));
  ok('confirmação específica mantém a acção pendente', grupo.detectarPedidoGrupo('agora rebaixa', { pendente: pendenteRebaixar })?.acao === 'demote');

  // Agora o bot É admin → promove de verdade
  sock.groupMetadata = async () => ({
    participants: [
      { id: '244945280380@s.whatsapp.net', admin: null },
      { id: '244949926074@s.whatsapp.net', admin: 'admin' },
    ],
  });
  const pedidoContinua = grupo.detectarPedidoGrupo('agora adiciona', {
    pendente: grupo.verPendente(ctx.remoteJid, ctx.senderNumber),
  });
  const r2 = await grupo.executarPedido(sock, {
    ctx, msg: {}, texto: 'agora adiciona', pedido: pedidoContinua,
  });
  ok('com admin: chama promote', updates.length === 1 && updates[0].a === 'promote', JSON.stringify(updates));
  ok('com admin: diz que fez', r2.ok === true && /admin/i.test(r2.msg), r2.msg);
  ok('menciona o alvo pendente', (r2.mencionar || []).some(j => j.includes('244945280380')));
  ok('limpa a pendência só após sucesso', !grupo.verPendente(ctx.remoteJid, ctx.senderNumber));

  // Já era admin
  updates.length = 0;
  sock.groupMetadata = async () => ({
    participants: [
      { id: '244945280380@s.whatsapp.net', admin: 'admin' },
      { id: '244949926074@s.whatsapp.net', admin: 'admin' },
    ],
  });
  const r3 = await grupo.executarPedido(sock, {
    ctx, msg: {}, texto: 'quero ser ADM',
    pedido: { acao: 'promote', deSi: true },
  });
  ok('já era admin: não chama de novo', updates.length === 0);
  ok('já era admin: diz a verdade', r3.ok && /já/i.test(r3.msg), r3.msg);

  // A rota do executor também falha fechada: nem classificação lexical,
  // citação, negação ou falta de destinatário podem chegar ao WhatsApp.
  const execUpdates = [];
  const execSock = {
    user: { id: '244949926074:1@s.whatsapp.net' },
    groupMetadata: async () => ({ participants: [
      { id: '244945280380@s.whatsapp.net', admin: null },
      { id: '244949926074@s.whatsapp.net', admin: 'admin' },
    ] }),
    groupParticipantsUpdate: async (g, j, a) => { execUpdates.push({ g, j, a }); },
  };
  const directCtx = { ...ctx, dest: { directToAura: true } };
  const unaddressedCtx = { ...ctx, dest: { directToAura: false } };
  await exec.executar('promover_admin', '', {
    sock: execSock, msg: {}, ctx: unaddressedCtx,
    texto: 'me adiciona com ADM', isOwner: true, isAdmin: true,
  });
  ok('executor bloqueia comando de grupo sem destinatário AURA', execUpdates.length === 0);
  const genericBlocked = await exec.executar('falar_com_todos', '', {
    sock: execSock, msg: {}, ctx: unaddressedCtx,
    texto: 'marca todos', isOwner: true, isAdmin: true,
  });
  ok('gate de destinatário aplica-se a outras capacidades', genericBlocked.msg === null);
  const negGeneric = await exec.executar('falar_com_todos', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'aura, não marca todos', isOwner: true, isAdmin: true,
  });
  ok('executor não executa acção negada', negGeneric.msg === null);
  const hypoGeneric = await exec.executar('falar_com_todos', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'aura, se eu disser marca todos', isOwner: true, isAdmin: true,
  });
  ok('executor não executa hipótese', hypoGeneric.msg === null);
  const quotedAction = await exec.executar('limpar_chat', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'aura, diz: "apaga o chat"', isOwner: true, isAdmin: true,
  });
  ok('citação de acção não chega sequer à confirmação destrutiva', quotedAction.msg === null && !quotedAction.confirmacaoNecessaria);
  const negativeMode = await exec.executar('modo_nao_reagir', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'aura, não reajas com emojis', isOwner: true, isAdmin: true,
  });
  ok('negação imperativa clara continua válida', negativeMode.ok && /Parei/.test(negativeMode.msg));
  await exec.executar('promover_admin', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'não me promove a admin, foi só exemplo', isOwner: true, isAdmin: true,
  });
  await exec.executar('promover_admin', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'o que significa "me põe admin"?', isOwner: true, isAdmin: true,
  });
  ok('executor não promove em negação nem pergunta citada', execUpdates.length === 0);
  await exec.executar('rebaixar_admin', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'rebaixa admin', isOwner: true, isAdmin: true,
  });
  ok('executor não inventa alvo para rebaixar', execUpdates.length === 0);
  const execValid = await exec.executar('promover_admin', '', {
    sock: execSock, msg: {}, ctx: directCtx,
    texto: 'me adiciona com ADM', isOwner: true, isAdmin: true,
  });
  ok('executor mantém comando explícito válido', execUpdates.length === 1 && execUpdates[0].a === 'promote' && execValid.ok);

  if (failed) { console.log('\nFALHOU:', failed); process.exit(1); }
  console.log('\nOK  —  0 falhas');
})().catch(e => { console.error(e); process.exit(1); });
