/**
 * AURA INTENT & COMMAND HANDLER
 * Permite que a Aura execute comandos por vontade própria
 * Baseado no contexto do usuário (Dono, VIP, Free, ADM, etc.)
 */

const { getUserContext } = require('../context/userContext');
const caseHandler = require('../../bot/caseHandler');

async function shouldExecuteCommand(userNumber, command, isGroup = false, groupMeta = null) {
  const ctx = await getUserContext(userNumber, isGroup, groupMeta);

  // Dono e Subdonos podem mandar executar qualquer coisa
  if (ctx.isOwner || ctx.role === 'subdono') {
    return { execute: true, reason: 'owner' };
  }

  // VIPs podem pedir comandos comuns
  const vipCommands = ['play', 'video', 'sticker', 'ia', 'imagem', 'menu'];
  if (ctx.role === 'vip' && vipCommands.includes(command.toLowerCase())) {
    return { execute: true, reason: 'vip' };
  }

  // ADM do grupo pode pedir ações de grupo
  if (ctx.isGroupAdmin) {
    const adminCommands = ['ban', 'kick', 'promote', 'demote', 'close', 'open', 'mute'];
    if (adminCommands.includes(command.toLowerCase())) {
      return { execute: true, reason: 'group_admin' };
    }
  }

  // Free / Desconhecido → só comandos públicos
  const publicCommands = ['menu', 'ping', 'info', 'dono'];
  if (publicCommands.includes(command.toLowerCase())) {
    return { execute: true, reason: 'public' };
  }

  return { execute: false, reason: 'insufficient_permission' };
}

async function auraExecuteCommand(sock, msg, ctx, command, args = []) {
  const userCtx = await getUserContext(ctx.senderNumber, ctx.isGroup, ctx.groupMeta);
  
  const decision = await shouldExecuteCommand(
    ctx.senderNumber, 
    command, 
    ctx.isGroup, 
    ctx.groupMeta
  );

  if (!decision.execute) {
    return { 
      executed: false, 
      message: `Não posso executar "${command}" para você.` 
    };
  }

  // Executa o comando via caseHandler
  try {
    const caseCtx = {
      sock,
      msg,
      ctx,
      args,
      text: args.join(' '),
      prefix: ctx.prefix || '.',
      command: command.toLowerCase(),
      isOwner: userCtx.isOwner,
      config: {}
    };

    const result = await caseHandler.runCase(command.toLowerCase(), caseCtx);
    return { 
      executed: true, 
      reason: decision.reason,
      result 
    };
  } catch (e) {
    return { 
      executed: false, 
      message: 'Erro ao executar comando: ' + e.message 
    };
  }
}

module.exports = {
  shouldExecuteCommand,
  auraExecuteCommand
};