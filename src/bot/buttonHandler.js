/**
 * Button Handler — Dark Net Engine 🕸️
 *
 * Usa o estilo compatível do projeto wabase-button primeiro:
 *   sock.sendMessage(... { interactiveButtons: [...] })
 * Se o WhatsApp/Baileys não renderizar, cai para nativeFlow.
 * Se ainda falhar, manda texto com os ids, então o menu nunca fica mudo.
 */
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

function buttonsText(title, footer, buttons = []) {
  const rows = buttons.map((b, i) => {
    const cleanId = String(b.id || '').replace(/^[^a-z0-9]+/i, '').trim();
    return `┃ ${String(i + 1).padStart(2, '0')} • *${b.text}*\n┃     ↳ \`${cleanId}\``;
  }).join('\n');
  return `╭━━━〔 MENU INTERATIVO 〕━━━╮\n${title}\n┣━━━━━━━━━━━━━━━━━━━━\n${rows}\n╰━━━〔 ᴅᴀʀᴋ sɪᴅᴇ ⚡ 〕━━━╯\n\n${footer || 'Dark Net Engine 🕸️'}\n\n💡 Se botões/lista não aparecerem, digite o comando mostrado usando o prefixo configurado.`;
}

function normalizeButtons(buttons = [], max = 8) {
  return (buttons || []).filter(b => b?.id && b?.text).slice(0, max);
}

async function buildImageHeader(sock, image) {
  if (!image) return { header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }) };
  try {
    const media = Buffer.isBuffer(image)
      ? await prepareWAMessageMedia({ image }, { upload: sock.waUploadToServer })
      : await prepareWAMessageMedia({ image: { url: image } }, { upload: sock.waUploadToServer });
    return {
      header: proto.Message.InteractiveMessage.Header.fromObject({
        title: '', subtitle: '', hasMediaAttachment: true,
        imageMessage: media.imageMessage,
      }),
    };
  } catch {
    return { header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }) };
  }
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


async function sendDirectNativeFlow(sock, jid, title, footer, buttons, quoted = null) {
  const buttonsMapped = buttons.map(btn => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id }),
  }));
  return sock.relayMessage(jid, {
    interactiveMessage: {
      body: { text: title },
      footer: { text: footer || 'Dark Net Engine ⚡' },
      header: { title: '', subtitle: '', hasMediaAttachment: false },
      nativeFlowMessage: { buttons: buttonsMapped, messageParamsJson: '' },
    },
  }, {});
}

async function sendDirectList(sock, jid, title, text, buttonText, sections, quoted = null) {
  return sock.relayMessage(jid, {
    interactiveMessage: {
      body: { text },
      footer: { text: title || 'Dark Side Engine ⚡' },
      header: { title: '', subtitle: '', hasMediaAttachment: false },
      nativeFlowMessage: {
        buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: buttonText, sections }) }],
        messageParamsJson: '',
      },
    },
  }, {});
}

async function sendNativeFlow(sock, jid, title, footer, buttons, quoted = null, opts = {}) {
  const buttonsMapped = buttons.map(btn => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id }),
  }));
  const { header } = await buildImageHeader(sock, opts.image);
  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({ text: title }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || 'Dark Net Engine 🕸️' }),
          header,
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: buttonsMapped }),
        }),
      },
    },
  }, { quoted });
  return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

async function sendButtons(sock, jid, title, footer, buttons, quoted = null, opts = {}) {
  const clean = normalizeButtons(buttons);
  if (!clean.length) return sock.sendMessage(jid, { text: title }, { quoted });

  const mode = opts.mode || 'auto';
  if (mode === 'text') return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
  if (mode === 'direct') { try { return await sendDirectNativeFlow(sock, jid, title, footer, clean, quoted); } catch {} }
  if (mode === 'native') { try { return await sendNativeFlow(sock, jid, title, footer, clean, quoted, opts); } catch {} }
  if (mode === 'wabase') { try { return await sendWabaseStyle(sock, jid, title, footer, clean, quoted); } catch {} }

  // Auto agressivo: tenta todos.
  try { return await sendDirectNativeFlow(sock, jid, title, footer, clean, quoted); } catch {}
  try { return await sendNativeFlow(sock, jid, title, footer, clean, quoted, opts); } catch {}
  try { return await sendWabaseStyle(sock, jid, title, footer, clean, quoted); } catch {}
  return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
}


async function sendButtonsWithImage(sock, jid, title, footer, image, buttons, quoted = null) {
  return sendButtons(sock, jid, title, footer, buttons, quoted, { image });
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

async function sendList(sock, jid, title, text, buttonText, sections, quoted = null, opts = {}) {
  const mode = opts.mode || 'auto';
  if (mode === 'text') {
    const rows = (sections || []).flatMap(s => (s.rows || []).map(r => `• ${r.title}\n  ${r.id}`)).join('\n');
    return sock.sendMessage(jid, { text: `${title}\n\n${text}\n\n${rows}` }, { quoted });
  }
  if (mode === 'direct') { try { return await sendDirectList(sock, jid, title, text, buttonText, sections, quoted); } catch {} }

  // Direct list estilo Blinders primeiro em auto.
  if (mode === 'auto') { try { return await sendDirectList(sock, jid, title, text, buttonText, sections, quoted); } catch {} }

  // NativeFlow com viewOnce/imagem.
  try {
    const { header } = await buildImageHeader(sock, opts.image);
    const msg = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: title }),
            header,
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
              buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: buttonText, sections }) }],
            }),
          }),
        },
      },
    }, { quoted });
    return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch {}

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

  const rows = (sections || []).flatMap(s => (s.rows || []).map(r => `• ${r.title}\n  ${r.id}`)).join('\n');
  return sock.sendMessage(jid, { text: `${title}\n\n${text}\n\n${rows}` }, { quoted });
}


async function sendListWithImage(sock, jid, title, text, buttonText, image, sections, quoted = null) {
  return sendList(sock, jid, title, text, buttonText, sections, quoted, { image });
}

module.exports = {
  sendButtons,
  sendButtonsWithImage,
  sendList,
  sendListWithImage,
  sendUrlButton,
  sendCallButton,
  sendCopyButton,
  buttonsText,
};
