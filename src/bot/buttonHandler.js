/**
 * Button Handler — Dark Net Engine 🕸️
 *
 * Usa o estilo compatível do projeto wabase-button primeiro:
 *   sock.sendMessage(... { interactiveButtons: [...] })
 * Se o WhatsApp/Baileys não renderizar, cai para nativeFlow.
 * Se ainda falhar, manda texto com os ids, então o menu nunca fica mudo.
 */
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

function buttonsText(title, footer, buttons = []) {
  return `${title}\n\n${buttons.map((b, i) => `${i + 1}. ${b.text}\n   ${b.id}`).join('\n')}\n\n${footer || 'Dark Net Engine 🕸️'}`;
}

function normalizeButtons(buttons = [], max = 8) {
  return (buttons || []).filter(b => b?.id && b?.text).slice(0, max);
}

async function sendWabaseStyle(sock, jid, title, footer, buttons, quoted = null) {
  const interactiveButtons = buttons.map(btn => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: btn.text,
      id: btn.id,
    }),
  }));
  return sock.sendMessage(jid, {
    text: title,
    footer: footer || 'Dark Net Engine 🕸️',
    interactiveButtons,
  }, { quoted });
}

async function sendNativeFlow(sock, jid, title, footer, buttons, quoted = null) {
  const buttonsMapped = buttons.map(btn => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id }),
  }));
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
  return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

async function sendButtons(sock, jid, title, footer, buttons, quoted = null) {
  const clean = normalizeButtons(buttons);
  if (!clean.length) return sock.sendMessage(jid, { text: title }, { quoted });

  // 1) Estilo wabase-button: mais simples e em muitos clientes renderiza melhor.
  try { return await sendWabaseStyle(sock, jid, title, footer, clean, quoted); } catch {}

  // 2) Estilo nativeFlow Baileys.
  try { return await sendNativeFlow(sock, jid, title, footer, clean, quoted); } catch {}

  // 3) Fallback 100% texto.
  return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
}

async function sendUrlButton(sock, jid, text, displayText, url, quoted = null) {
  try {
    return sock.sendMessage(jid, {
      text,
      footer: 'Dark Net Engine 🕸️',
      interactiveButtons: [{
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: displayText, url, merchant_url: url }),
      }],
    }, { quoted });
  } catch {
    return sock.sendMessage(jid, { text: `${text}\n\n${displayText}: ${url}` }, { quoted });
  }
}

async function sendCallButton(sock, jid, text, displayText, phoneNumber, quoted = null) {
  try {
    return sock.sendMessage(jid, {
      text,
      footer: 'Dark Net Engine 🕸️',
      interactiveButtons: [{
        name: 'cta_call',
        buttonParamsJson: JSON.stringify({ display_text: displayText, phone_number: phoneNumber }),
      }],
    }, { quoted });
  } catch {
    return sock.sendMessage(jid, { text: `${text}\n\n📞 ${displayText}: +${phoneNumber}` }, { quoted });
  }
}

async function sendCopyButton(sock, jid, text, displayText, copyCode, quoted = null) {
  try {
    return sock.sendMessage(jid, {
      text,
      footer: 'Dark Net Engine 🕸️',
      interactiveButtons: [{
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({ display_text: displayText, copy_code: copyCode }),
      }],
    }, { quoted });
  } catch {
    return sock.sendMessage(jid, { text: `${text}\n\n📋 ${displayText}:\n${copyCode}` }, { quoted });
  }
}

async function sendList(sock, jid, title, text, buttonText, sections, quoted = null) {
  try {
    return sock.sendMessage(jid, {
      text,
      footer: title,
      interactiveButtons: [{
        name: 'single_select',
        buttonParamsJson: JSON.stringify({ title: buttonText, sections }),
      }],
    }, { quoted });
  } catch {}

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
  } catch {}

  const rows = (sections || []).flatMap(s => (s.rows || []).map(r => `• ${r.title}\n  ${r.id}`)).join('\n');
  return sock.sendMessage(jid, { text: `${title}\n\n${text}\n\n${rows}` }, { quoted });
}

module.exports = {
  sendButtons,
  sendList,
  sendUrlButton,
  sendCallButton,
  sendCopyButton,
  buttonsText,
};
