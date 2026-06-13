/**
 * Button Handler — botões/listas com fallback visível.
 * WhatsApp MD às vezes não renderiza interactive; por isso o caller pode mandar
 * texto antes, e aqui também caímos para texto se relay falhar.
 */
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

function buttonsText(title, footer, buttons = []) {
  return `${title}\n\n${buttons.map((b, i) => `${i + 1}. ${b.text}\n   ${b.id}`).join('\n')}\n\n${footer || 'Dark Net Engine 🕸️'}`;
}

async function sendButtons(sock, jid, title, footer, buttons, quoted = null) {
  const clean = (buttons || []).filter(b => b?.id && b?.text).slice(0, 8);
  if (!clean.length) return sock.sendMessage(jid, { text: title }, { quoted });

  const buttonsMapped = clean.map(btn => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id }),
  }));

  try {
    const msg = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.fromObject({ text: title }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || 'Dark Net Engine 🕸️' }),
            header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: buttonsMapped }),
          }),
        },
      },
    }, { quoted });
    return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch (err) {
    return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
  }
}

async function sendList(sock, jid, title, text, buttonText, sections, quoted = null) {
  try {
    const msg = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: title }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
              buttons: [{ name: 'single_select_reply', buttonParamsJson: JSON.stringify({ title: buttonText, sections }) }],
            }),
          }),
        },
      },
    }, { quoted });
    return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch (err) {
    const rows = (sections || []).flatMap(s => (s.rows || []).map(r => `• ${r.title}\n  ${r.id}`)).join('\n');
    return sock.sendMessage(jid, { text: `${title}\n\n${text}\n\n${rows}` }, { quoted });
  }
}

module.exports = { sendButtons, sendList, buttonsText };
