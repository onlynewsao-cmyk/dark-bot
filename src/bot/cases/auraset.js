'use strict';
/**
 * DARK BOT v7.74 — CENTRAL DA AURA (!auraset)
 *
 * Gestão da Aura pelo dono: estado (IA, proativa, humor, presença,
 * memória), voz por chat, nível proativo, humor global, memória,
 * acordar/dormir aqui.
 *
 * Chama-se !auraset (não !aura) porque !aura já é a interacção de GIF.
 */

const HUMORES = ['normal', 'feliz', 'triste', 'com_raiva', 'animada', 'sonolenta', 'provocante', 'cansada', 'revoltada'];
const NIVEIS = ['calma', 'normal', 'viva'];

async function painel(ctx, prefix) {
  const config = require('../../config');
  const linhas = ['⚡ *CENTRAL DA AURA*', ''];
  // IA
  const hasGroq = !!config.ai?.groq, hasGemini = !!config.ai?.gemini;
  linhas.push(`🧠 IA: ${hasGroq ? '✅ Groq' : '❌ Groq'} · ${hasGemini ? '✅ Gemini' : '❌ Gemini'}`);
  // Proativa
  try {
    const bcc = require('../botConfigCache');
    const on = await bcc.get('aura_proactive_enabled', true);
    const niv = await bcc.get('aura_proactive_nivel', 'viva');
    linhas.push(`💭 Proativa: ${on ? `ligada · nível *${niv}*` : 'desligada'}`);
  } catch { linhas.push('💭 Proativa: ?'); }
  // Humor global
  try {
    const humor = require('../../aura/auraHuman').getMood().mood || 'normal';
    linhas.push(`😌 Humor: *${humor}*`);
  } catch { linhas.push('😌 Humor: ?'); }
  // Presença + modos aqui
  try {
    const awake = await require('../../aura/auraModes').isAuraAwake(ctx.remoteJid, { isGroup: ctx.isGroup }).catch(() => true);
    const M = require('../../aura/auraBrain').modos(ctx.remoteJid);
    const on = Object.keys(M).filter(k => k !== 'ignorados' && M[k] === true);
    linhas.push(`📍 Aqui: ${awake ? 'acordada 🌹' : 'a dormir 🌙'} · modos: ${on.length ? on.join(', ') : 'nenhum'}`);
  } catch { linhas.push('📍 Aqui: ?'); }
  // Memória do dono
  try {
    const c = await require('../../aura/auraMemory').contar(config.owner.number);
    linhas.push(`💾 Memória do Dark: *${c.importante}* factos · *${c.recente}* recentes`);
  } catch { linhas.push('💾 Memória: ?'); }
  linhas.push(
    '',
    `*Comandos:*\n` +
    `• \`${prefix}auraset voz <on|off>\` — ela fala por áudio aqui\n` +
    `• \`${prefix}auraset proativa <on|off|calma|normal|viva>\`\n` +
    `• \`${prefix}auraset humor <nome>\` — ${HUMORES.join(', ')}\n` +
    `• \`${prefix}auraset memoria [número] Prefixo\` — ver memória\n` +
    `• \`${prefix}auraset esquecer <número|eu> SIM\` — apagar memória\n` +
    `• \`${prefix}auraset acorda\` / \`${prefix}auraset dorme\` — presença aqui`
  );
  return linhas.join('\n');
}

module.exports = function registerAuraSetCases(registerCase) {
  registerCase(['auraset', 'aurapainel', 'setaura'], async ({ sock, msg, ctx, args, text, prefix, isOwner, reply }) => {
    if (!isOwner) return reply('🚫 A Central da Aura é só para o *dono*.');
    const sub = String(args[0] || '').toLowerCase();
    const resto = (text || '').slice((args[0] || '').length).trim();

    if (!sub || sub === 'estado' || sub === 'status') {
      return reply(await painel(ctx, prefix));
    }

    if (sub === 'voz') {
      const v = resto.toLowerCase();
      if (v !== 'on' && v !== 'off') return reply(`❓ Usa: \`${prefix}auraset voz <on|off>\``);
      require('../../aura/auraBrain').setModo(ctx.remoteJid, 'soAudio', v === 'on');
      return reply(v === 'on' ? '🔊 A Aura agora fala por *áudio* aqui.' : '🔇 A Aura volta a falar por *texto* aqui.');
    }

    if (sub === 'proativa' || sub === 'proactiva') {
      const v = resto.toLowerCase();
      const bcc = require('../botConfigCache');
      if (v === 'on') { await bcc.set('aura_proactive_enabled', true); return reply('💭 Proatividade *ligada*.'); }
      if (v === 'off') { await bcc.set('aura_proactive_enabled', false); return reply('💭 Proatividade *desligada*. (Ela continua a responder quando chamam.)'); }
      if (NIVEIS.includes(v)) {
        await bcc.set('aura_proactive_nivel', v);
        await bcc.set('aura_proactive_enabled', true);
        return reply(`💭 Nível de vida: *${v}*. Ela está solta. ⚡`);
      }
      return reply(`❓ Usa: \`${prefix}auraset proativa <on|off|calma|normal|viva>\``);
    }

    if (sub === 'humor' || sub === 'mood') {
      const hum = require('../../aura/auraHuman');
      if (!resto) {
        const atual = hum.getMood().mood || 'normal';
        return reply(`😌 Humor atual: *${atual}*\nOpções: ${HUMORES.join(', ')}`);
      }
      const v = resto.toLowerCase().replace(/[\s-]+/g, '_');
      if (!HUMORES.includes(v)) return reply(`❓ Humor inválido.\nOpções: ${HUMORES.join(', ')}`);
      hum.setMood(v, 'auraset');
      return reply(`😌 Humor da Aura: *${v}*.`);
    }

    if (sub === 'memoria' || sub === 'memória') {
      const config = require('../../config');
      const num = (resto.replace(/\D/g, '') || String(config.owner.number || '')).replace(/\D/g, '');
      const c = await require('../../aura/auraMemory').contar(num);
      return reply(`💾 Memória de *${num}*: *${c.importante}* factos · *${c.recente}* recentes.`);
    }

    if (sub === 'esquecer' || sub === 'esquece') {
      const partes = resto.split(/\s+/).filter(Boolean);
      const alvo = String(partes[0] || '').toLowerCase();
      const ok = String(partes[1] || '').toUpperCase() === 'SIM';
      if (!alvo || !ok) return reply(`⚠️ Apaga TODA a memória de alguém!\nConfirma: \`${prefix}auraset esquecer <número|eu> SIM\``);
      const num = alvo === 'eu' ? String(ctx.senderNumber || '').replace(/\D/g, '') : alvo.replace(/\D/g, '');
      if (!num) return reply('❓ Número inválido.');
      await require('../../aura/auraMemory').esquecer(num);
      return reply(`💾 Esqueci tudo sobre *${num}*. Começamos do zero.`);
    }

    if (sub === 'acorda' || sub === 'acordar') {
      const modes = require('../../aura/auraModes');
      const r = await modes.invokeAura(ctx.remoteJid, { groupName: ctx.groupName || '', invokedBy: ctx.senderNumber || '' });
      if (!r.ok) return reply('❌ ' + (r.reason || 'Falhou.'));
      return reply(r.already ? 'Já estou acordada aqui. 🌹' : 'Acordei aqui. 🌹');
    }

    if (sub === 'dorme' || sub === 'dormir') {
      const modes = require('../../aura/auraModes');
      const r = await modes.dismissAura(ctx.remoteJid);
      if (!r.ok) return reply('❌ ' + (r.reason || 'Falhou.'));
      return reply(r.already ? 'Já estava a dormir aqui. 🌙' : 'Vou dormir aqui. Até já. 🌙');
    }

    return reply(`❓ Subcomando desconhecido: \`${sub}\`\nVê: \`${prefix}auraset\``);
  });
};
