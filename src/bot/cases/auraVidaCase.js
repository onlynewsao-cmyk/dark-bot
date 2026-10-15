'use strict';
/**
 * DARK BOT — AURA VIDA CASE v11.3 🌱
 * Comandos: .auravida, .vida, .diario, .sonho, .statusaura, .pensamento
 * Só o Dono vê o diário e o estado narrativo completos.
 */

module.exports = function registerAuraVida(registerCase) {
  registerCase(['auravida', 'vida', 'aura', 'minhavida'], async ({ sock, msg, ctx, reply, isOwner }) => {
    try {
      const vida = require('../../aura/auraVida');
      const v = await vida.getVida();
      const at = vida.getAtividadeAtual(new Date());
      let txt = `🌱 *PERSONA VIRTUAL DA AURA — ESTADO FICCIONAL*\n\n`;
      txt += `🤖 ${v.nomeCompleto}: assistente automatizada do DARK BOT, com persona goth ficcional.\n`;
      txt += `🎨 ${v.ocupacao}\n`;
      txt += `⚡ Energia narrativa: ${v.energia}% | Humor de personagem: ${v.humorAtual}\n`;
      txt += `🕐 Estado simulado (${at.horaStr}, hora de Luanda): ${at.fazendo}\n`;
      txt += `   _${at.desc}_\n\n`;
      txt += `💭 Pensamento ficcional: "${v.pensamentoAtual}"\n`;
      txt += `🎧 Contexto de personagem: ${v.status?.ouvindo || 'nada registado'}\n`;
      txt += `📺 Referência de personagem: ${v.status?.assistindo || 'nada registado'}\n`;
      txt += `🎨 Ideia criativa: ${v.status?.desenhando || 'nada registado'}\n\n`;
      txt += `📈 Nível narrativo ${v.nivel} | XP ${v.xp} | ${v.totalConversas} conversas processadas\n`;
      txt += `🎯 Metas da personagem: ${v.metas?.curtoPrazo?.slice(0, 2).join(', ') || 'sem metas registadas'}\n`;
      txt += `🌟 Sonho de personagem: ${v.sonhos?.[0] || ''}\n`;

      if (isOwner) {
        txt += `\n📝 *Diário ficcional da personagem (só o Dono vê):*\n`;
        const ultDiario = v.diario.slice(-2);
        for (const d of ultDiario) {
          const data = new Date(d.data).toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
          txt += `• ${data} [${d.humor}]: ${d.texto.slice(0, 120)}\n`;
        }
        txt += `\n✨ *Experiências narrativas (ficcionais):*\n`;
        const ultExp = v.experiencias.slice(-3);
        for (const e of ultExp) {
          const data = new Date(e.data).toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
          txt += `• ${data}: ${e.texto.slice(0, 100)}\n`;
        }
      } else {
        txt += `\n> O diário da personagem é ficcional e fica reservado ao Dono 🌙`;
      }

      return reply(txt);
    } catch (e) {
      return reply('❌ Não consegui consultar o estado de personagem da AURA agora: ' + e.message.slice(0, 80));
    }
  });

  registerCase(['diario', 'diário', 'auradiario'], async ({ reply, isOwner }) => {
    try {
      const vida = require('../../aura/auraVida');
      const v = await vida.getVida();
      if (!isOwner) return reply('📝 O diário ficcional da personagem AURA fica reservado ao Dono.');
      if (!v.diario.length) return reply('📝 Ainda não há entradas no diário ficcional da AURA.');
      let txt = `📝 *DIÁRIO FICCIONAL DA AURA* — ${v.diario.length} entradas\n\n`;
      const ult = v.diario.slice(-6).reverse();
      for (const d of ult) {
        const data = new Date(d.data).toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });
        txt += `*${data}* [${d.humor}] ${d.tags?.length ? '#' + d.tags.join(' #') : ''}\n${d.texto}\n\n`;
      }
      return reply(txt.slice(0, 3500));
    } catch (e) {
      return reply('❌ ' + e.message.slice(0, 80));
    }
  });

  registerCase(['sonho', 'sonhos', 'aurasonho'], async ({ reply, isOwner }) => {
    try {
      const vida = require('../../aura/auraVida');
      const v = await vida.getVida();
      let txt = `🌙 *SONHOS FICCIONAIS DA PERSONAGEM AURA*\n\n`;
      if (v.ultimoSonho) txt += `💤 Último sonho narrativo: ${v.ultimoSonho}\n\n`;
      txt += `✨ *Metas da personagem:*\n`;
      for (let i = 0; i < Math.min(5, v.sonhos.length); i++) txt += `• ${v.sonhos[i]}\n`;
      if (isOwner) {
        txt += `\n😨 *Conflitos narrativos da personagem:*\n`;
        for (let i = 0; i < Math.min(3, v.medos.length); i++) txt += `• ${v.medos[i]}\n`;
      }
      return reply(txt);
    } catch (e) {
      return reply('❌ ' + e.message.slice(0, 80));
    }
  });

  registerCase(['pensamento', 'pensando', 'aura pensa'], async ({ reply }) => {
    try {
      const vida = require('../../aura/auraVida');
      const v = await vida.getVida();
      const at = vida.getAtividadeAtual(new Date());
      return reply(`💭 *Estado narrativo da personagem AURA (ficcional):*\n\n"${v.pensamentoAtual}"\n\n🕐 Actividade simulada: ${at.fazendo} (${at.desc}) — ${at.horaStr} em Luanda\n⚡ Energia narrativa ${v.energia}% | Humor de personagem ${v.humorAtual}`);
    } catch (e) {
      return reply('❌ ' + e.message.slice(0, 80));
    }
  });

  registerCase(['statusaura', 'aura status', 'aurastatus'], async ({ reply }) => {
    try {
      const vida = require('../../aura/auraVida');
      const s = await vida.getStatus();
      const hum = require('../../aura/auraHuman').getMood();
      return reply(
        `🌱 *STATUS DA AURA (PERSONA FICCIONAL)*\n\n` +
        `🤖 AURA é uma assistente automatizada do DARK BOT; não tem idade humana.\n` +
        `⚡ Energia narrativa: ${s.energia}% | Humor de personagem: ${s.humor} (chat: ${hum.mood})\n` +
        `🕐 Estado simulado ${s.atividade.horaStr}: ${s.atividade.fazendo}\n` +
        `💭 "${s.pensamento}"\n` +
        `📈 Nível narrativo ${s.nivel} | XP ${s.xp}\n` +
        `📝 Diário ficcional: ${s.diario.length} entradas recentes | Exp: ${s.experiencias.length}`
      );
    } catch (e) {
      return reply('❌ ' + e.message.slice(0, 80));
    }
  });

  // Comando para registar texto no diário ficcional da personagem, se o Dono pedir
  registerCase(['escreve', 'escrevediario'], async ({ args, text, reply, isOwner }) => {
    if (!isOwner) return reply('🚫 Só o Dark pode pedir pra eu escrever no diário');
    const conteudo = text || args.join(' ');
    if (!conteudo || conteudo.length < 3) return reply('📝 O que queres que eu escreva? Ex: .escreve hoje foi um dia feliz');
    try {
      const vida = require('../../aura/auraVida');
      const entry = await vida.escreverDiario(conteudo, { humor: vida.getVidaSync().humorAtual, tags: ['dark', 'manual'] });
      return reply(`📝 Registei no diário ficcional da personagem AURA:\n\n"${entry.texto}"\n\n[${entry.humor}] ${new Date(entry.data).toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' })}`);
    } catch (e) {
      return reply('❌ ' + e.message.slice(0, 80));
    }
  });
};
