/**
 * Button Handler — Utilitário para enviar botões e listas no WhatsApp
 * Atualizado para maior compatibilidade.
 */

const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

/**
 * Envia uma mensagem com botões de interacção (Versão compatível MD).
 */
async function sendButtons(sock, jid, title, footer, buttons, quoted = null) {
  const buttonsMapped = buttons.map(btn => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: btn.text,
      id: btn.id
    })
  }));

  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: title
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({
            text: footer
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            title: '',
            hasMediaAttachment: false
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: buttonsMapped
          })
        })
      }
    }
  }, { quoted });

  return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

/**
 * Envia menu de lista (Select List) - Muitas vezes mais estável que botões
 */
async function sendList(sock, jid, title, text, buttonText, sections, quoted = null) {
  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: text
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({
            text: title
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [
              {
                name: 'single_select_reply',
                buttonParamsJson: JSON.stringify({
                  title: buttonText,
                  sections: sections
                })
              }
            ]
          })
        })
      }
    }
  }, { quoted });

  return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

module.exports = { sendButtons, sendList };
