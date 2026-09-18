'use strict';
/**
 * v7.93 — IDENTIDADE (Dono): trocar link do canal + selo verificado.
 *  !setcanal <url>        → muda o link em menu/premium/botões...
 *  !setcanal off          → volta ao link padrão
 *  !canalinfo             → mostra o link actual
 *  !setselo <nome>|<num>  → muda o contacto "verificado ✓"
 *  !selo / !verificado    → envia o contacto verificado actual
 */
module.exports = function registerIdentidade(registerCase) {

  registerCase(['setcanal', 'mudarcanal', 'setlinkcanal'], async ({ sock, msg, ctx, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(ctx.remoteJid, { text: '🚫 Só o *Dono* muda o canal.' }, { quoted: msg });
    const id = require('../identidadeCanal');
    const raw = args.join(' ').trim();
    try {
      if (!raw || raw === 'off' || raw === 'padrao' || raw === 'padrão') {
        await id.setCanal('');
        return sock.sendMessage(ctx.remoteJid, { text: `📡 Canal de volta ao *padrão*:\n${id.CANAL_DEF}` }, { quoted: msg });
      }
      if (!/^https?:\/\//i.test(raw)) return sock.sendMessage(ctx.remoteJid, { text: '❌ Uso: `!setcanal https://whatsapp.com/channel/XXXX...` (ou `off`)' }, { quoted: msg });
      await id.setCanal(raw);
      return sock.sendMessage(ctx.remoteJid, { text: `✅ *CANAL ACTUALIZADO*\n\n${raw}\n\n> Já usa em: menu 📡, !premium, botões de canal, etc.` }, { quoted: msg });
    } catch (e) {
      return sock.sendMessage(ctx.remoteJid, { text: '❌ Falha: ' + e.message }, { quoted: msg });
    }
  });

  registerCase(['canalinfo', 'linkcanal'], async ({ sock, msg, ctx }) => {
    const id = require('../identidadeCanal');
    const link = await id.canalLink();
    return sock.sendMessage(ctx.remoteJid, { text: `📡 *CANAL ACTUAL*\n\n${link}` }, { quoted: msg });
  });

  registerCase(['setselo', 'setverificado', 'setcontacto'], async ({ sock, msg, ctx, args, isOwner }) => {
    if (!isOwner) return sock.sendMessage(ctx.remoteJid, { text: '🚫 Só o *Dono* muda o selo.' }, { quoted: msg });
    const id = require('../identidadeCanal');
    const raw = args.join(' ').trim();
    try {
      if (!raw || raw === 'off' || raw === 'padrao' || raw === 'padrão') {
        await id.setSelo(id.SELO_DEF.nome, id.SELO_DEF.numero);
        return sock.sendMessage(ctx.remoteJid, { text: `✓ Selo de volta ao padrão: *${id.SELO_DEF.nome}* (${id.SELO_DEF.numero})` }, { quoted: msg });
      }
      // formato: NOME | NÚMERO   (o número pode vir com + e espaços)
      const [nomeP, numP] = raw.split('|').map(x => (x || '').trim());
      if (numP && !/^\d{6,}$/.test(numP.replace(/\D/g, ''))) {
        return sock.sendMessage(ctx.remoteJid, { text: '❌ Número inválido. Uso: `!setselo DARK BOT ✓ | 2449xxxxxxxx`' }, { quoted: msg });
      }
      const atual = await id.selo();
      const nome = nomeP || atual.nome;
      const numero = (numP || '').replace(/\D/g, '') || atual.numero;
      await id.setSelo(nome, numero);
      await sock.sendMessage(ctx.remoteJid, { text: `✅ *SELO ACTUALIZADO* — ${nome} (${numero})` }, { quoted: msg });
      return sock.sendMessage(ctx.remoteJid, id.seloMsg(nome, numero).message, { quoted: msg });
    } catch (e) {
      return sock.sendMessage(ctx.remoteJid, { text: '❌ Falha: ' + e.message }, { quoted: msg });
    }
  });

  registerCase(['selo', 'verificado', 'contacto'], async ({ sock, msg, ctx }) => {
    const id = require('../identidadeCanal');
    const s = await id.selo();
    const q = id.seloMsg(s.nome, s.numero);
    await sock.sendMessage(ctx.remoteJid, { text: `🪪 *Contacto verificado actual:* ${s.nome}` }, { quoted: q });
    return sock.sendMessage(ctx.remoteJid, { text: '> Muda com `!setselo <nome>|<número>` (Dono)' }, { quoted: msg });
  });
};
