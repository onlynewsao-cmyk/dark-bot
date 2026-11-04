'use strict';
/** Controlo owner-only da etapa 1 do Modo AURA Agente. */

module.exports = function registerAuraAgentCases(registerCase) {
  registerCase(['auraagent', 'agenteaura', 'agentmode'], async ({ ctx, args, text, prefix, isOwner, reply }) => {
    if (!isOwner) return reply('🚫 O Modo AURA Agente é exclusivo do Dono.');

    const agent = require('../../aura/auraAgent');
    const sub = String(args[0] || '').toLowerCase();
    const rest = String(text || '').slice(String(args[0] || '').length).trim();
    const help = [
      '🤖 *MODO AURA AGENTE — etapa 1*',
      `• \`${prefix}auraagent on\` — liga o agente neste chat`,
      `• \`${prefix}auraagent off\` — desliga e limpa a tarefa activa`,
      `• \`${prefix}auraagent status\` — mostra estado e tarefa`,
      `• \`${prefix}auraagent plano <tarefa>\` — cria um plano auditável`,
      '',
      'O agente só planeia tarefas explícitas do Dono nesta etapa; não executa nada sozinho.',
    ].join('\n');

    if (!sub || sub === 'ajuda' || sub === 'help') return reply(help);
    if (sub === 'on' || sub === 'ligar') {
      await agent.setEnabled(ctx.remoteJid, true);
      return reply('🤖 Modo AURA Agente *ligado* neste chat. Envia uma tarefa com `' + prefix + 'auraagent plano <tarefa>`.' );
    }
    if (sub === 'off' || sub === 'desligar') {
      await agent.setEnabled(ctx.remoteJid, false);
      return reply('🤖 Modo AURA Agente *desligado*. Tarefa activa removida; a AURA não executará nada por este modo.');
    }
    if (sub === 'status' || sub === 'estado') return reply(agent.formatStatus(await agent.load(ctx.remoteJid), prefix));
    if (sub === 'plano' || sub === 'planear' || sub === 'planejar') {
      if (!rest) return reply(`❓ Descreve a tarefa. Ex.: \`${prefix}auraagent plano fecha o grupo e cria uma enquete\``);
      try {
        const task = await agent.createPlan(ctx.remoteJid, rest);
        return reply(agent.formatPlan(task, prefix));
      } catch (e) {
        return reply('❌ ' + String(e.message || e).slice(0, 180));
      }
    }
    return reply(help);
  });
};
