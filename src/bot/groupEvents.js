const config  = require('../config');
const botConfigCache = require('./botConfigCache');

async function handle(sock, event) {
  try {
    const { id, participants, action } = event;
    if (!id.endsWith('@g.us')) return;

    const welcomeEnabled = await botConfigCache.get('welcome_enabled', true);
    if (!welcomeEnabled) return;

    const meta = await sock.groupMetadata(id).catch(() => null);
    const groupName = meta?.subject || 'grupo';

    for (const participant of participants) {
      const number = participant.split('@')[0];

      if (action === 'add') {
        const defaultWelcome =
          `╭━〔 🌙 *BEM-VINDO* 〕━╮\n│ 👋 Olá @${number}!\n│ 🎉 Você entrou em *${groupName}*\n│ 🤖 Powered by ${config.bot.name}\n╰━━━━━━━━━━━━━━━━━╯`;
        const welcomeMsg = await botConfigCache.get('welcome_message', defaultWelcome);
        const text = welcomeMsg.replace('@user', `@${number}`).replace('@grupo', groupName);
        try {
          const pp = await sock.profilePictureUrl(participant, 'image').catch(() => null);
          if (pp) {
            await sock.sendMessage(id, { image: { url: pp }, caption: text, mentions: [participant] });
          } else {
            await sock.sendMessage(id, { text, mentions: [participant] });
          }
        } catch (e) {
          await sock.sendMessage(id, { text, mentions: [participant] }).catch(() => {});
        }

      } else if (action === 'remove') {
        const defaultBye = `👋 @${number} saiu de *${groupName}*. Até mais!`;
        const byeMsg = await botConfigCache.get('goodbye_message', defaultBye);
        const text = byeMsg.replace('@user', `@${number}`).replace('@grupo', groupName);
        await sock.sendMessage(id, { text, mentions: [participant] }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Erro groupEvents:', err);
  }
}

module.exports = { handle };
