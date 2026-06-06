/**
 * Button Handler — Utilitário para enviar botões e listas no WhatsApp
 * Compatível com Multi-Device (MD) usando viewOnceMessage.
 */

const { proto, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

/**
 * Envia uma mensagem com botões de interacção.
 * 
 * @param {object} sock - Instância do socket Baileys
 * @param {string} jid - ID do chat
 * @param {string} title - Título/Texto principal
 * @param {string} footer - Rodapé
 * @param {Array} buttons - Lista de botões [{id, text}]
 * @param {object} quoted - Mensagem para citar (opcional)
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
 * Envia uma mensagem com botões de URL/Call e Quick Reply.
 * 
 * @param {object} sock - Instância do socket Baileys
 * @param {string} jid - ID do chat
 * @param {string} title - Título/Texto principal
 * @param {string} footer - Rodapé
 * @param {Array} buttons - Lista de botões [{text, url, phone, id}]
 */
async function sendInteractive(sock, jid, title, footer, buttons, quoted = null) {
    const buttonsMapped = buttons.map(btn => {
        if (btn.url) {
            return {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    url: btn.url,
                    merchant_url: btn.url
                })
            };
        }
        if (btn.phone) {
            return {
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    phone_number: btn.phone
                })
            };
        }
        return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                id: btn.id
            })
        };
    });

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
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: buttonsMapped
                    })
                })
            }
        }
    }, { quoted });

    return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

module.exports = { sendButtons, sendInteractive };
