'use strict';
/** Controlo owner-only das etapas 1 e 2 do Modo AURA Agente. */

function resultadoExecucao(result, prefix) {
  if (result.confirmationRequired) {
    const expires = new Date(result.expiresAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return [
      '⚠️ *CONFIRMAÇÃO OBRIGATÓRIA*',
      `Passo ${result.step.index}: ${result.step.description}`,
      `Ferramenta: ${result.step.actionId}`,
      '',
      `Para executar exactamente este passo, envia: \`${prefix}auraagent confirmar ${result.code}\``,
      `O código expira às ${expires}. Nada foi executado ainda.`,
    ].join('\n');
  }
  const icon = result.ok ? '✅' : '❌';
  const status = result.ok ? 'concluído e verificado pelo executor' : (result.blocked ? 'bloqueado com segurança' : 'falhou; a tarefa ficou pausada');
  return `${icon} Passo ${result.step?.index || '?'} ${status}.\n${result.message || 'Sem detalhe devolvido pelo executor.'}`;
}

module.exports = function registerAuraAgentCases(registerCase) {
  registerCase(['auraagent', 'agenteaura', 'agentmode'], async ({ sock, msg, ctx, args, text, prefix, isOwner, isAdminFn, reply }) => {
    if (!isOwner) return reply('🚫 O Modo AURA Agente é exclusivo do Dono.');

    const agent = require('../../aura/auraAgent');
    const sub = String(args[0] || '').toLowerCase();
    const rest = String(text || '').slice(String(args[0] || '').length).trim();
    let isAdmin = false;
    try { isAdmin = isAdminFn ? await isAdminFn() : false; } catch {}
    const runtime = { sock, msg, ctx, isOwner, isAdmin };
    const help = [
      '🤖 *MODO AURA AGENTE — etapas 1 e 2*',
      `• \`${prefix}auraagent on\` — liga o agente neste chat`,
      `• \`${prefix}auraagent off\` — desliga e arquiva a tarefa activa`,
      `• \`${prefix}auraagent status\` — mostra estado, progresso e próximo passo`,
      `• \`${prefix}auraagent plano <tarefa>\` — cria um plano auditável`,
      `• \`${prefix}auraagent executar [passo]\` — executa o próximo passo em ordem`,
      `• \`${prefix}auraagent confirmar <código>\` — confirma uma ação destrutiva`,
      `• \`${prefix}auraagent cancelar\` — cancela e arquiva o plano pendente`,
      `• \`${prefix}auraagent historico\` — vê as últimas tarefas arquivadas`,
      `• \`${prefix}auraagent modelo\` — vê o estado seguro do cérebro Claude`,
      '',
      'Cada passo é guardado antes de executar. O agente não repete ações sozinho, não inventa ferramentas e exige confirmação para destrutivas.',
    ].join('\n');

    if (!sub || sub === 'ajuda' || sub === 'help') return reply(help);
    if (sub === 'on' || sub === 'ligar') {
      await agent.setEnabled(ctx.remoteJid, true);
      return reply('🤖 Modo AURA Agente *ligado* neste chat. Envia uma tarefa com `' + prefix + 'auraagent plano <tarefa>`.' );
    }
    if (sub === 'off' || sub === 'desligar') {
      await agent.setEnabled(ctx.remoteJid, false);
      return reply('🤖 Modo AURA Agente *desligado*. A tarefa activa foi arquivada; a AURA não executará nada por este modo.');
    }
    if (sub === 'status' || sub === 'estado') return reply(agent.formatStatus(await agent.load(ctx.remoteJid), prefix));
    if (sub === 'historico' || sub === 'histórico' || sub === 'auditoria') return reply(agent.formatHistory(await agent.load(ctx.remoteJid)));
    if (sub === 'modelo' || sub === 'claude') {
      const claude = require('../../aura/auraClaude').status();
      return reply(claude.configured
        ? `🧠 *Claude pronto*\nModelo: \`${claude.model}\`\nPlaneamento por API: activo. A execução continua protegida pelo agente.`
        : `🧠 *Claude ainda não configurado*\nModelo previsto: \`${claude.model}\`\nMotivo: ${claude.reason}\n\nQuando a chave for configurada no ambiente seguro, os novos planos serão revistos pelo Claude; nenhuma chave é mostrada aqui.`);
    }
    if (sub === 'plano' || sub === 'planear' || sub === 'planejar') {
      if (!rest) return reply(`❓ Descreve a tarefa. Ex.: \`${prefix}auraagent plano fecha o grupo e cria uma enquete\``);
      try {
        const task = await agent.createPlan(ctx.remoteJid, rest);
        return reply(agent.formatPlan(task, prefix));
      } catch (e) {
        return reply('❌ ' + String(e.message || e).slice(0, 180));
      }
    }
    if (sub === 'executar' || sub === 'executa' || sub === 'run') {
      const step = /^\d+$/.test(rest) ? Number(rest) : undefined;
      try {
        return reply(resultadoExecucao(await agent.executeStep(ctx.remoteJid, step, runtime), prefix));
      } catch (e) {
        return reply('❌ ' + String(e.message || e).slice(0, 220));
      }
    }
    if (sub === 'confirmar' || sub === 'confirm') {
      if (!rest) return reply(`❓ Usa o código gerado: \`${prefix}auraagent confirmar CONF-XXXX\`.`);
      try {
        return reply(resultadoExecucao(await agent.confirmStep(ctx.remoteJid, rest, runtime), prefix));
      } catch (e) {
        return reply('❌ ' + String(e.message || e).slice(0, 220));
      }
    }
    if (sub === 'cancelar' || sub === 'cancela') {
      try {
        const task = await agent.cancelTask(ctx.remoteJid, runtime);
        return reply(`🛑 Tarefa ${task.id} cancelada e arquivada. Nenhum passo pendente será executado.`);
      } catch (e) {
        return reply('❌ ' + String(e.message || e).slice(0, 220));
      }
    }
    return reply(help);
  });
};
