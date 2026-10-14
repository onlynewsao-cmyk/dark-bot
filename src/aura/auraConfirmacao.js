'use strict';

let _brain = null;
function brain() {
  if (!_brain) _brain = require('./auraBrain');
  return _brain;
}

const TTL_MS = 60 * 1000;
const MAX_PENDENTES = 500;
const pendentes = new Map();
const RESPOSTAS = new Set(['confirmar', 'cancelar']);

function normalizar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[.!?,;:]+$/g, '').trim();
}

function chave(ctx = {}) {
  const chat = String(ctx.remoteJid || '').trim();
  const actor = String(ctx.senderNumber || ctx.senderJid || ctx.senderLid || '').trim();
  return chat && actor ? `${chat}|${actor}` : '';
}

function descricao(id, pedido = {}) {
  if (id === 'sair_grupo') {
    const grupo = String(pedido.ctx?.groupName || '').trim();
    return `sair do grupo${grupo ? ` *${grupo.slice(0, 60)}*` : ' actual'}`;
  }
  if (id === 'limpar_chat') return 'limpar o histórico desta conversa do lado da AURA';
  if (id === 'canal_apagar') {
    const alvo = String(pedido.arg || pedido.texto || '').replace(/[\r\n*`]/g, ' ').trim().slice(0, 100);
    return `apagar ${alvo ? `o canal indicado (*${alvo}*)` : 'o canal indicado'}`;
  }
  return 'executar esta acção destrutiva';
}

function limparExpirados(agora = Date.now()) {
  for (const [key, item] of pendentes) {
    if (item.expira <= agora) pendentes.delete(key);
  }
  while (pendentes.size >= MAX_PENDENTES) {
    pendentes.delete(pendentes.keys().next().value);
  }
}

/** Cria uma confirmação pendente; nunca executa a acção. */
function pedir({ id, arg = '', texto = '', ctx, isOwner = false } = {}) {
  const cap = brain().POR_ID.get(id);
  if (!cap || cap.risco !== 'destrutivo') return { necessaria: false };
  if (!isOwner) return { necessaria: true, mensagem: 'Só o Dono pode pedir esta acção.' };
  if (id === 'sair_grupo' && !ctx?.isGroup) {
    return { necessaria: true, mensagem: 'Isto não é um grupo; não executei a acção.' };
  }

  const key = chave(ctx);
  if (!key) {
    return { necessaria: true, mensagem: 'Não consegui associar a confirmação ao remetente; por segurança, não executei a acção.' };
  }

  const agora = Date.now();
  limparExpirados(agora);
  const existente = pendentes.get(key);
  if (existente) {
    return {
      necessaria: true,
      mensagem: `Já há uma confirmação pendente para ${descricao(existente.id, existente)}. Responde *CONFIRMAR* ou *CANCELAR* antes de pedir outra acção.`,
    };
  }

  const pedido = {
    id,
    arg: String(arg || '').slice(0, 500),
    texto: String(texto || '').slice(0, 1000),
    ctx: { groupName: String(ctx?.groupName || '') },
    criado: agora,
    expira: agora + TTL_MS,
  };
  pendentes.set(key, pedido);

  return {
    necessaria: true,
    mensagem:
      `⚠️ *Confirmação necessária — acção destrutiva*\n` +
      `Vou ${descricao(id, pedido)}.\n\n` +
      `Para executar, responde exactamente *CONFIRMAR* neste chat nos próximos 60 segundos. ` +
      `Escreve *CANCELAR* para abortar. Sem confirmação, não faço nada.`,
  };
}

/** Processa apenas respostas exactas do mesmo remetente e no mesmo chat. */
async function processar({ sock, msg, ctx, texto, isOwner = false, isAdmin = false } = {}) {
  const resposta = normalizar(texto);
  if (!RESPOSTAS.has(resposta)) return false;

  const key = chave(ctx);
  const pedido = key && pendentes.get(key);
  if (!pedido) return false;
  pendentes.delete(key);

  const enviar = async (mensagem, destino = ctx.remoteJid) => {
    if (!mensagem || !destino) return;
    const opcoes = destino === ctx.remoteJid && msg ? { quoted: msg } : {};
    await sock.sendMessage(destino, { text: mensagem }, opcoes).catch(() => {});
  };

  if (pedido.expira <= Date.now()) {
    await enviar('⏱️ A confirmação expirou. A acção não foi executada; pede-a novamente se ainda quiseres.');
    return true;
  }
  if (resposta === 'cancelar') {
    await enviar('✅ Acção cancelada. Não alterei nada.');
    return true;
  }
  if (!isOwner) {
    await enviar('🚫 Já não posso confirmar esta acção: a permissão do Dono não foi validada.');
    return true;
  }

  const cap = brain().POR_ID.get(pedido.id);
  const permissao = cap && brain().podeFazer(cap, { isOwner, isAdmin });
  if (!cap || cap.risco !== 'destrutivo' || !permissao?.pode) {
    await enviar('🚫 A acção foi bloqueada porque a permissão deixou de ser válida.');
    return true;
  }

  let resultado;
  try {
    const exec = require('./auraExec');
    resultado = await exec.executar(pedido.id, pedido.arg, {
      sock, msg, ctx, texto: pedido.texto, isOwner, isAdmin, confirmado: true,
    });
  } catch (e) {
    resultado = { ok: false, msg: `Não consegui executar: ${String(e?.message || e).slice(0, 100)}` };
  }

  const mensagem = String(resultado?.msg || (resultado?.ok ? 'Feito.' : 'Não consegui executar a acção.'));
  // Se a acção foi sair do grupo, a confirmação final segue por privado,
  // porque o bot já pode ter perdido acesso ao chat onde recebeu o pedido.
  const destino = pedido.id === 'sair_grupo' && resultado?.ok
    ? (ctx.senderJid || ctx.remoteJid)
    : ctx.remoteJid;
  await enviar(mensagem, destino);
  return true;
}

module.exports = { pedir, processar, precisa: id => brain().POR_ID.get(id)?.risco === 'destrutivo' };
