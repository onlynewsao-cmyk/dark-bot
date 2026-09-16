'use strict';
/**
 * DARK BOT v7.76 — CANAL SUPER: um post para TODOS os canais adotados.
 *
 * !super <texto>            → publica o texto em todos os canais
 * !super (responde mídia)   → publica a foto/vídeo em todos (resto = legenda)
 * !super (responde msg)     → divulga a citada em todos
 * !super grupos <...>       → além dos canais, avisa os grupos onde o bot é admin
 *
 * Só dono. Relatório por canal (não pára no primeiro erro).
 */
module.exports = function registerCanalSuperCases(registerCase) {
  registerCase(['super', 'blast', 'superpost'], async ({ sock, m, msg, ctx, args, text, prefix, isOwner, reply }) => {
    if (!isOwner) return reply('🚫 Só o *dono* pode usar o super-canal.');
    const C = require('../../aura/auraCanais');

    let resto = (text || '').trim();
    let comGrupos = false;
    const first = String(args[0] || '').toLowerCase();
    if (first === 'grupos' || first === 'grupo' || first === '+grupos') {
      comGrupos = true;
      resto = (text || '').slice(String(args[0] || '').length).trim();
    }

    const raw = m.msg?.message || msg?.message || {};
    const q = raw.extendedTextMessage?.contextInfo?.quotedMessage;
    const midia = raw.imageMessage ? { k: 'image', m: (m.msg || msg) }
      : raw.videoMessage ? { k: 'video', m: (m.msg || msg) }
      : q?.imageMessage ? { k: 'image', m: { message: q } }
      : q?.videoMessage ? { k: 'video', m: { message: q } } : null;

    let payload;
    if (midia) {
      try {
        const mh = require('../mediaHandler');
        const buf = await mh.downloadFromMessage(midia.m);
        payload = { buf, kind: midia.k, caption: resto };
      } catch (e) { return reply('❌ Não consegui ler a mídia: ' + String(e?.message || e).slice(0, 80)); }
    } else if (q) {
      payload = { quoted: { message: q } };
    } else {
      if (!resto) return reply(`❓ Usa: \`${prefix}super <texto>\` — publica em *todos* os canais.\n💡 \`${prefix}super grupos <texto>\` — também avisa os grupos.`);
      payload = { texto: resto };
    }

    const r = await C.superPostar(sock, payload, { comGrupos }).catch((e) => ({ ok: false, msg: String(e?.message || e).slice(0, 80) }));
    if (!r || r.ok === false) return reply('❌ ' + (r?.msg || 'Falhou.'));
    const linhas = (r.resultados || []).map((d) => `${d.ok ? '✅' : '❌'} *${d.name}*${d.ok ? '' : ' — ' + String(d.msg || 'falhou').slice(0, 40)}`);
    let out = `🚀 *SUPER* — ${r.enviados}/${r.total} canais:\n\n${linhas.join('\n')}`;
    if (r.grupos) out += `\n\n👥 Grupos: ${r.grupos.enviados}/${r.grupos.total}${r.grupos.falhou ? ` (${r.grupos.falhou} falharam)` : ''}`;
    return reply(out);
  });
};
