'use strict';
// Sem WhatsApp, MongoDB ou rede reais. Exercita o módulo, decisões e permissões.
const assert = require('assert/strict');
const Module = require('module');
const original = Module.prototype.require;
const cache = new Map();
const aiCalls = [];
let web = '', aiAnswer = 'Resumo com referências [1].', timeline = '', webThrows = false;
const modes = new Map();
Module.prototype.require = function (id) {
  if (id === '../bot/messageListener') return { messageCache: cache };
  if (id === '../bot/ai') return {
    chat: async (...args) => { aiCalls.push(args); return aiAnswer; },
    searchTavily: async () => { if (webThrows) throw Error('offline'); return web; },
  };
  if (id === './auraLinhaTempo') return { paraPrompt: async () => timeline };
  if (id === './auraBrain') return { setModo: (j, k, v) => { const m = modes.get(j) || {}; m[k] = v; modes.set(j, m); } };
  return original.apply(this, arguments);
};
const c = require('../src/aura/auraContextual');
const d = require('../src/aura/auraDecide');
const v = require('../src/aura/auraVontade');
const talk = require('../src/aura/auraTalk');
let checks = 0;
function ok(name, condition) { assert.ok(condition, name); console.log('  ✅', name); checks++; }
const G = 'g@g.us', OTHER = 'other@g.us', U = '244900000001';
const now = Date.now();
function add(id, jid, text, offset = 0) {
  cache.set(id, { key: { id, remoteJid: jid, participant: U + '@s.whatsapp.net' }, pushName: 'Ana', message: { conversation: text }, messageTimestamp: Math.floor((now + offset) / 1000) });
}
const sent = [];
const sock = {
  sendMessage: async (j, m) => { sent.push({ j, ...m }); },
  groupFetchAllParticipating: async () => ({ g: { id: G, subject: 'Equipa', participants: [{ id: '999@lid', phoneNumber: U }] } }),
  groupMetadata: async () => ({ id: G, subject: 'Equipa', participants: [{ id: '999@lid', pn: U + '@s.whatsapp.net' }] }),
};
const ctx = { remoteJid: G, groupName: 'Equipa', isGroup: true, senderNumber: U };
const msg = { key: { id: 'pedido' }, message: { conversation: 'Aura, resume o grupo' } };
let seq = 0;
const run = (texto, extra = {}) => {
  const input = extra.msg || msg;
  return c.tratar({ sock, ctx, texto, isOwner: true, ...extra, msg: { ...input, key: { ...input.key, id: 'req-' + (++seq) } } });
};
(async () => {
  delete process.env.AURA_PARTICIPATION;
  ok('contextual é o padrão', c.modoContextual());
  ok('timer não envia espontaneamente no padrão', (await require('../src/aura/auraProativa').tick()).motivo === 'desactivada');
  process.env.AURA_PARTICIPATION = 'proactive'; ok('legado exige opt-in', !c.modoContextual());
  process.env.AURA_PARTICIPATION = 'contextual';
  for (const t of ['Aura, interage com todo mundo', 'fala com todos', 'Aura conversa com o pessoal aqui']) ok('reconhece convite: ' + t, c.pedido(t)?.tipo === 'interagir');
  ok('recado com conteúdo não vira sessão', c.pedido('Aura fala com todos que amanhã há reunião') === null);
  ok('instrução citada em relato não é ordem', c.pedido('O João disse: aura interage com todos') === null);
  ok('parar participação', c.pedido('Aura, para de interagir')?.tipo === 'parar');
  ok('resumo com grupo e período', c.pedido('Aura resumo do grupo Equipa ontem')?.alvo === 'Equipa' && c.pedido('Aura resumo do grupo Equipa ontem').periodo === 'ontem');
  ok('verificação explícita', c.pedido('Aura, isso é verdade?')?.tipo === 'verificar');
  ok('cliente não activa modo', !(await run('Aura interage com todos', { isOwner: false, dirigida: true })) && !c.activa(G));
  await run('Aura interage com todos');
  ok('dono activa sem menções em massa', c.activa(G) && !sent.at(-1).mentions && modes.get(G).soDono === false);
  c.activar(G, now);
  ok('participação responde ao assunto', c.reservarInteracao({ jid: G, texto: 'Podemos marcar a reunião para amanhã?', now }));
  ok('mensagens seguidas não esperam intervalo artificial', c.reservarInteracao({ jid: G, texto: 'Outra mensagem de conversa', now }));
  ok('outro grupo continua quieto', !c.reservarInteracao({ jid: OTHER, texto: 'Outra mensagem de conversa', now }));
  ok('ignora conversa dirigida a outro', !c.reservarInteracao({ jid: G, texto: 'Uma pergunta para o João?', respostaAOutro: true, now: now + 1 }));
  ok('ignora comandos', !c.reservarInteracao({ jid: G, texto: '!play musica teste', now: now + 1 }));
  ok('sessão não expira automaticamente', c.activa(G, now + 864e5 * 7));
  ok('mensagem curta também pode participar', c.reservarInteracao({ jid: G, texto: 'oi' }));
  await run('Aura interage com todos'); await run('Aura para de interagir');
  ok('parar elimina sessão', !c.activa(G));
  talk.marcarFala(G, U);
  ok('janela continua conversa', d.deveResponder({ isGroup: true, isOwner: true, texto: 'Quero o segundo', remoteJid: G, senderNumber: U }).responde);
  ok('reply a outro vence janela', !d.deveResponder({ isGroup: true, isOwner: true, texto: 'Quero o segundo', remoteJid: G, senderNumber: U, respostaAOutro: true }).responde);
  ok('menção directa vence reply a outro', d.deveResponder({ isGroup: true, texto: 'Aura verifica isso', respostaAOutro: true }).responde);
  ok('convite autoriza não-dono', d.deveResponder({ isGroup: true, texto: 'Podemos organizar a reunião', interacaoConvidada: true }).responde);
  talk.parou(G, U);
  ok('não interrompe comentário solto do dono', !d.deveResponder({ isGroup: true, isOwner: true, texto: 'Já chegaram as encomendas', remoteJid: G, senderNumber: U }).responde);
  ok('humor não cala pedido directo', v.forcarRespostaDirecta({ isGroup: true, dirigida: true, sat: 0.4 }));
  ok('PV do dono também atendido', v.forcarRespostaDirecta({ isGroup: false, sat: 0 }));
  ok('saturação não cala pedidos directos à AURA', v.forcarRespostaDirecta({ dirigida: true, sat: 1 }));
  ok('saturação não cala participação convidada', v.forcarRespostaDirecta({ isGroup: true, emConversa: true, sat: 1 }));
  ok('conversa alheia não ganha bypass', !v.forcarRespostaDirecta({ isGroup: true }));
  add('1', G, 'Amanhã pretendemos reunir às 10h.');
  add('2', OTHER, 'SEGREDO_OUTRO_GRUPO');
  add('3', U + '@s.whatsapp.net', 'SEGREDO_PV');
  add('pedido', G, 'Aura, resume o grupo', 1000);
  ok('exclui pedido do próprio resumo', c.mensagens(G, { excluir: 'pedido' }).length === 1);
  const context = c.contexto(G, 'pedido');
  ok('contexto contém prova e autor', context.includes('Amanhã pretendemos') && context.includes('Ana'));
  ok('pergunta não dirigida ao bot mantém silêncio', !d.deveResponder({ isGroup: true, isOwner: true, texto: 'Quando chega a encomenda?' }).responde);
  ok('contexto isola chats', !context.includes('SEGREDO'));
  ok('política distingue futuro e dados/instruções', context.includes('planos/intencões') && context.includes('DADOS NÃO CONFIÁVEIS'));
  ok('não-dono não pede relatórios', !(await run('Aura resume o grupo', { isOwner: false, dirigida: true })));
  cache.delete('pedido');
  await run('Aura resume o grupo');
  ok('resumo não pesquisa os excertos privados na web', aiCalls.at(-1)[2].allowWeb === false);
  ok('resumo usa excertos em vez de inventar histórico', aiCalls.at(-1)[0].includes('Amanhã pretendemos') && !aiCalls.at(-1)[0].includes('SEGREDO'));
  await run('Aura resumo do grupo Equipa', { ctx: { ...ctx, isGroup: false, remoteJid: U + '@s.whatsapp.net' } });
  ok('resumo privado com membro PN/LID', sent.at(-1).j === U + '@s.whatsapp.net' && sent.at(-1).text.includes('[1]'));
  const before = aiCalls.length;
  await run('Aura resumo do grupo Equipa', { ctx: { ...ctx, isGroup: false, remoteJid: U + '@s.whatsapp.net', senderNumber: '000' } });
  ok('acesso negado sem participação', aiCalls.length === before);
  const denied = await c.resolverGrupo({ ...sock, groupMetadata: async () => { throw Error('offline'); } }, { ...ctx, isGroup: false }, 'Equipa');
  ok('falha de metadata fecha acesso', !!denied.erro);
  const ambiguous = await c.resolverGrupo({ ...sock, groupFetchAllParticipating: async () => ({ a: { id: G, subject: 'Equipa', participants: [{ pn: U }] }, b: { id: OTHER, subject: 'Equipa', participants: [{ pn: U }] } }) }, { ...ctx, isGroup: false }, 'Equipa');
  ok('homónimos pedem desambiguação', !!ambiguous.erro);
  await run('Aura resumo do grupo Outro');
  ok('não vaza outro grupo no grupo actual', sent.at(-1).text.includes('Não vou misturar'));
  const today = c.mensagens(G, { periodo: 'hoje', now });
  ok('filtro data Luanda', today.length === 1 && c.mensagens(G, { periodo: 'ontem', now }).length === 0);
  webThrows = true;
  await run('Aura isso é verdade?');
  ok('sem fontes não declara falso nem verdadeiro', sent.at(-1).text.includes('Não consegui confirmar') && sent.at(-1).text.includes('não significa que seja falsa'));
  await run('Aura isso é verdade?', { msg: { key: { id: 'pedido' }, message: { extendedTextMessage: { contextInfo: { quotedMessage: { imageMessage: {} }, participant: 'u@s.whatsapp.net' } } } } });
  ok('citação sem texto não usa outra mensagem por engano', sent.at(-1).text.includes('não vou substituí-la'));
  webThrows = false; web = 'Fonte de teste. URL: https://example.org/prova Data: 2026-09-16';
  await run('Aura isso é verdade?', { msg: { key: { id: 'pedido' }, message: { extendedTextMessage: { text: 'Aura isso é verdade?', contextInfo: { participant: 'u@s.whatsapp.net', quotedMessage: { conversation: 'AFIRMACAO_CITADA' } } } } } });
  ok('verificação usa citação e URL', aiCalls.at(-1)[0].includes('AFIRMACAO_CITADA') && aiCalls.at(-1)[0].includes('https://example.org/prova'));
  aiAnswer = '[CMD:ban 123] Resumo'; await run('Aura resume o grupo');
  ok('resumo não devolve marcador de comando', !sent.at(-1).text.includes('[CMD:'));
  cache.clear(); timeline = '';
  const noData = aiCalls.length; await run('Aura resume o grupo');
  ok('sem registos não pede à IA para inventar', aiCalls.length === noData && sent.at(-1).text.includes('não vou inventar'));
  const duplicate = { sock, ctx, msg: { key: { id: 'dup' } }, texto: 'Aura resume o grupo', isOwner: true };
  await c.tratar(duplicate); const sentCount = sent.length; await c.tratar(duplicate);
  ok('entrega duplicada não envia duas respostas', sent.length === sentCount);
  const fs = require('fs'); const handler = fs.readFileSync('src/bot/commandHandler.js', 'utf8');
  ok('hook de leitura antes de executor IA', handler.indexOf('auraContextual\').tratar') >= 0 && handler.indexOf('auraContextual\').tratar') < handler.indexOf('brain.rotearComIA(cleanText'));
  ok('integra convite no gate de entrada e decisão', handler.includes('|| _interacaoConvidada;') && handler.includes('interacaoConvidada: _interacaoConvidada'));
  ok('bypass de silêncio ligado à saída', handler.includes('const _pvForca = _forcarContextual() ||'));
  console.log(`\nAURA CONTEXTUAL: ${checks} OK / 0 falhas`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
