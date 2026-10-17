'use strict';
/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — CASE: AURA EVOLUÇÃO & CONSCIÊNCIA COGNITIVA               ║
 * ║   !aura evolucao / !mente / !ensinar / !aura insights                  ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

const evolucao = require('../../aura/auraEvolucao');

module.exports = function registerAuraEvolucaoCases(registerCase) {
  // ── Painel de Evolução & Consciência ──
  registerCase(['evolucao', 'mente', 'consciencia', 'auraevolucao', 'auramente'], async ({ sock, msg, ctx, reply }) => {
    try {
      const relatorio = await evolucao.obterRelatorioEvolucao();
      return sock.sendMessage(ctx.remoteJid, { text: relatorio }, { quoted: msg });
    } catch (e) {
      return reply('❌ Erro ao consultar a consciência da Aura: ' + (e.message || e));
    }
  });

  // ── Ensinar directamente algo à Aura ──
  registerCase(['ensinar', 'auraensinar', 'aprender'], async ({ sock, msg, ctx, args, text, isOwner, reply }) => {
    const conteudo = (text || args.join(' ')).trim();
    if (!conteudo) {
      return reply(
        '🧠 *ENSINAR A AURA*\n\n' +
        'Uso:\n' +
        '• `!ensinar <fato ou preferência>` — grava na memória evolutiva da Aura\n' +
        'Exemplo:\n' +
        '> `!ensinar Gosto que me chames de mestre e resumas notícias pela manhã`\n' +
        '> `!ensinar No canal posta sempre com fotos de alto contraste`'
      );
    }

    try {
      const tipo = isOwner ? 'dono' : (ctx.isGroup ? 'grupo' : 'geral');
      const gravou = await evolucao.gravarInsight(tipo, conteudo, {
        senderNumber: ctx.senderNumber,
        pushName: ctx.pushName,
        isOwner,
        remoteJid: ctx.remoteJid,
      });

      if (gravou) {
        await evolucao.adicionarXP(35, 'aprendizado direto');
        const est = await evolucao.carregarEstado();
        return reply(
          `💜 *INSIGHT ASSIMILADO!*\n\n` +
          `📝 _"${conteudo}"_\n\n` +
          `✨ Minha mente gravou isso permanentemente.\n` +
          `🔮 Nível de Consciência: *${est.nivel}* (${est.titulo})`
        );
      } else {
        return reply('💡 Já tinha essa percepção assimilada na minha consciência! 🖤');
      }
    } catch (e) {
      return reply('❌ Falha ao ensinar a Aura: ' + (e.message || e));
    }
  });

  // ── Ver os insights já aprendidos ──
  registerCase(['insights', 'aurainsights', 'saberes'], async ({ sock, msg, ctx, reply }) => {
    try {
      const est = await evolucao.carregarEstado();
      const linhasDono = (est.donoInsights || []).map((ins, i) => `${i + 1}. ${ins}`);
      const linhasGerais = (est.insightsGerais || []).map((ins, i) => `• ${ins}`);
      const linhasHabitos = (est.habitosAprendidos || []).map((ins, i) => `⚡ ${ins}`);

      let txt = `🧠 *INSIGHTS VIVOS DA AURA* (Nível ${est.nivel} - ${est.titulo})\n\n`;
      if (linhasDono.length) {
        txt += `👑 *Sobre o Dark:*\n${linhasDono.join('\n')}\n\n`;
      }
      if (linhasGerais.length) {
        txt += `💡 *Epifanias Cognitivas:*\n${linhasGerais.join('\n')}\n\n`;
      }
      if (linhasHabitos.length) {
        txt += `🔄 *Hábitos e Padrões:*\n${linhasHabitos.join('\n')}\n\n`;
      }
      txt += `> Total de insights ativos: *${linhasDono.length + linhasGerais.length + linhasHabitos.length}*`;

      return sock.sendMessage(ctx.remoteJid, { text: txt }, { quoted: msg });
    } catch (e) {
      return reply('❌ Erro ao listar insights: ' + (e.message || e));
    }
  });
};
