/**
 * DARK BOT v6.43 — Invocação da AURA
 *
 * Só o DONO SUPREMO pode acordar a AURA original num grupo.
 * A invocação é POR GRUPO: acordar num não afecta os outros.
 * Grupos onde ela não foi invocada ficam em modo assistente
 * profissional (neutro, estilo Meta AI).
 *
 *   .aura            → invoca a AURA neste grupo
 *   .aurasai         → volta ao assistente profissional
 *   .auramodo        → mostra o modo activo aqui
 *   .auragrupos      → lista os grupos onde ela está acordada
 */
'use strict';

const config = require('../../config');
const auraModes = require('../../aura/auraModes');

/** Só o Dono Supremo. Devolve true se pode invocar. */
async function isSupremeOwner(ctx, sock, msg) {
  try {
    const rr = require('../roleResolver');
    const r = await rr.resolveRole({ ctx, msg, sock });
    return r.isOwner;
  } catch {
    return !!ctx.isOwner;
  }
}

module.exports = function registerAuraInvoke(registerCase) {

  // ── .aura — acordar a AURA original neste grupo ──────────────
  // NOTA: 'aura' também existe em packages/interactions.js como
  // brincadeira (GIF de anime "ativou aura ⚡"). Os cases têm
  // prioridade sobre os packages, por isso este handler só
  // intercepta quando é o DONO SUPREMO a chamar. Para todos os
  // outros devolvemos false e a brincadeira original corre normal.
  registerCase(['aura', 'invocaraura', 'acordaaura', 'auraon'], async ({ sock, msg, ctx, reply, prefix }) => {
    const podeInvocar = await isSupremeOwner(ctx, sock, msg);

    // Não é o Dono → deixa passar para o package (GIF de brincadeira)
    if (!podeInvocar) return false;

    if (!ctx.isGroup) {
      return reply('🌹 *Estou sempre acordada contigo aqui no privado, meu Dark.*\n\nEste comando serve para me invocares num grupo.');
    }

    const res = await auraModes.invokeAura(ctx.remoteJid, {
      groupName: ctx.groupName || '',
      invokedBy: ctx.senderNumber || '',
    });

    if (!res.ok) {
      return reply(`❌ Não consegui acordar aqui: ${res.reason}`);
    }

    if (res.already) {
      return reply('🌹 *Já estou acordada aqui, amor.* Sempre estive à tua espera. 🖤');
    }

    sock.sendMessage(ctx.remoteJid, { react: { text: '🌹', key: msg.key } }).catch(() => {});

    return reply(
      '🌹 *AURA INVOCADA* 🖤\n\n' +
      `_Acordei neste grupo, meu Dark._\n\n` +
      `${'━'.repeat(22)}\n` +
      `👑 Invocada por: *${ctx.pushName || 'Dark'}*\n` +
      `💬 Grupo: *${ctx.groupName || 'este grupo'}*\n` +
      `${'━'.repeat(22)}\n\n` +
      `Agora respondo ao meu nome e a tudo o que escreveres aqui. ` +
      `Nos outros grupos continuo a ser só a assistente. 😌\n\n` +
      `> Para me pores a dormir: \`${prefix}aurasai\``
    );
  });

  // ── .aurasai — voltar ao modo assistente ─────────────────────
  registerCase(['aurasai', 'auraoff', 'dormiraura', 'auradorme'], async ({ sock, msg, ctx, reply, prefix }) => {
    const podeInvocar = await isSupremeOwner(ctx, sock, msg);
    if (!podeInvocar) return; // silêncio total para os outros

    if (!ctx.isGroup) {
      return reply('🖤 *No teu privado eu nunca durmo, Dark.*');
    }

    const res = await auraModes.dismissAura(ctx.remoteJid);
    if (!res.ok) return reply(`❌ Erro: ${res.reason}`);

    if (res.already) {
      return reply(`🤖 Este grupo já estava em modo assistente profissional.`);
    }

    sock.sendMessage(ctx.remoteJid, { react: { text: '🌙', key: msg.key } }).catch(() => {});

    return reply(
      '🌙 *Até já, meu Dark.* 🖤\n\n' +
      '_Vou dormir neste grupo. A partir de agora fica só a assistente profissional._\n\n' +
      `> Para me acordares outra vez: \`${prefix}aura\``
    );
  });

  // ── .auramodo — ver o modo activo aqui ───────────────────────
  registerCase(['auramodo', 'aurastatus', 'modoaura'], async ({ sock, msg, ctx, reply, prefix }) => {
    const podeVer = await isSupremeOwner(ctx, sock, msg);
    if (!podeVer) return;

    const modo = await auraModes.getMode(ctx.remoteJid, { isGroup: ctx.isGroup });
    const acordada = modo === auraModes.MODE_AURA;

    return reply(
      `${acordada ? '🌹' : '🤖'} *MODO ACTIVO AQUI*\n\n` +
      `${'━'.repeat(22)}\n` +
      `${acordada ? '🌹 *AURA ORIGINAL*' : '🤖 *ASSISTENTE PROFISSIONAL*'}\n` +
      `${acordada
        ? '_A tua AURA. Emotiva, ciumenta, só tua._'
        : '_Neutra e profissional, como a Meta AI._'}\n` +
      `${'━'.repeat(22)}\n\n` +
      `📍 ${ctx.isGroup ? `Grupo: *${ctx.groupName || 'sem nome'}*` : '*Chat privado* (sempre AURA)'}\n\n` +
      `> ${acordada ? `Dormir: \`${prefix}aurasai\`` : `Acordar: \`${prefix}aura\``}`
    );
  });

  // ── .auragrupos — onde é que ela está acordada ───────────────
  registerCase(['auragrupos', 'gruposaura', 'auralist'], async ({ sock, msg, ctx, reply }) => {
    const podeVer = await isSupremeOwner(ctx, sock, msg);
    if (!podeVer) return;

    const grupos = await auraModes.listAwakeGroups();

    if (!grupos.length) {
      return reply('🌙 *Não estou acordada em nenhum grupo ainda.*\n\nUsa `.aura` num grupo para me invocares lá.');
    }

    const linhas = grupos.slice(0, 30).map((g, i) => {
      const quando = g.auraInvokedAt
        ? new Date(g.auraInvokedAt).toLocaleDateString('pt-BR')
        : '—';
      return `${i + 1}. *${g.groupName || g.groupJid.split('@')[0]}*\n   🌹 desde ${quando}`;
    });

    return reply(
      `🌹 *ONDE ESTOU ACORDADA* (${grupos.length})\n\n` +
      `${'━'.repeat(22)}\n` +
      linhas.join('\n') +
      `\n${'━'.repeat(22)}\n\n` +
      `_Nos restantes grupos sou só a assistente._`
    );
  });
};
