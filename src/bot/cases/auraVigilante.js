/**
 * DARK BOT — !permissoes / !permitir (Dono)
 * O que a Aura pode fazer por iniciativa própria: avisar onde entrou,
 * alertar aluguel/interesse/convites, DAR o número do Dark… As DUAS
 * perspectivas estão aqui e persistem entre reinícios.
 */
'use strict';

module.exports = function registerAuraVigilanteCases(registerCase) {

  registerCase(['permissoes', 'minhaspermissoes', 'aurapode', 'aurapermissoes'], async ({ sock, msg, ctx, isOwner, reply }) => {
    if (!isOwner) return reply('🚫 Só o Dono.');
    const vig = require('../../aura/auraVigilante');
    await sock.sendMessage(ctx.remoteJid, {
      text: [
        '🛡️ *O QUE A AURA PODE FAZER POR INICIATIVA*',
        '',
        ...vig.listaPermissoesTexto(),
        '',
        `Muda com *${ctx.prefix || '!'}permitir <nome> on/off* — ex.: \`${ctx.prefix || '!'}permitir partilharnumero on\``,
      ].join('\n'),
    }, { quoted: msg });
  });

  registerCase(['permitir', 'permit'], async ({ sock, msg, ctx, isOwner, args, reply }) => {
    if (!isOwner) return reply('🚫 Só o Dono.');
    const vig = require('../../aura/auraVigilante');
    const nome = String(args?.[0] || '').toLowerCase();
    const onoff = String(args?.[1] || '').toLowerCase();
    if (!nome || !['on', 'off', '1', '0', 'sim', 'nao', 'não'].includes(onoff)) {
      return reply(`Uso: *${ctx.prefix || '!'}permitir <${Object.keys(vig.PERMS_DEFAULT).join('|')}> on/off`);
    }
    const k = vig.definirPerm(nome, ['on', '1', 'sim'].includes(onoff));
    if (!k) return reply(`❓ não conheço a permissão "${nome}". Vê *${ctx.prefix || '!'}permissoes*.`);
    await sock.sendMessage(ctx.remoteJid, {
      text: `🛡️ *${k}* agora está *${vig.perm(k) ? '✅ ligado' : '⛔ desligado'}*.`,
    }, { quoted: msg });
  });
};
