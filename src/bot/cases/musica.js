/**
 * DARK BOT — case 'som' (cartão de música descartável, v7.21)
 * =============================================================
 *   !som Parabéns kizomba
 *
 * Mostra a CAPA da música + título/duração/views/publicação/canal e
 * espera o utilizador responder com o número:
 *   01 → áudio 🎧    02 → documento 📁    03 → voz 🎤
 */
'use strict';

const musicaCard = require('../musicaCard');

module.exports = function registerMusica(registerCase) {
  registerCase(['som', 'song', 'faixa', 'track', 'musik', 'disco'], async ({
    sock, m, msg, ctx, text, prefix, react,
  }) => {
    const q = String(text || '').trim();
    if (!q) {
      return m.reply([
        '🎵 *Buscar música*',
        '',
        'Exemplo: `' + prefix + 'som Parabéns kizomba`',
        '',
        'Depois responde *01*, *02* ou *03* para o formato.',
      ].join('\n'));
    }

    react('⏳').catch(() => {});
    try {
      const v = await musicaCard.buscar(q);
      await musicaCard.mostrar(sock, msg, ctx, v);
      react('✅').catch(() => {});
    } catch (e) {
      react('❌').catch(() => {});
      return m.reply('❌ ' + String(e?.message || e).slice(0, 120));
    }
  });
};
