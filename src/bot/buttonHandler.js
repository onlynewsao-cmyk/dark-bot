/**
 * DARK BOT v5 — Button Handler
 * @systemzero/baileys: ButtonV2 + Carousel + NativeFlow
 * Cascata: ButtonV2 → NativeFlow → Lista → Texto
 */
'use strict';

const {
  generateWAMessageFromContent,
  proto,
  prepareWAMessageMedia,
} = require('@systemzero/baileys');

// ── Fallback texto sempre visível ────────────────────────────
function buttonsText(title, footer, buttons = []) {
  const rows = buttons.map((b, i) => {
    const id = String(b.id || '').trim();
    return `┃ ${String(i + 1).padStart(2, '0')} • *${b.text}*\n┃     ↳ \`${id}\``;
  }).join('\n');
  return (
    `╭━━━〔 🕸️ DARK SIDE MENU 〕━━━╮\n` +
    `${title}\n` +
    `┣━━━━━━━━━━━━━━━━━━━━\n` +
    `${rows}\n` +
    `╰━━━〔 ⚡ ${footer || 'Dark Net Engine'} 〕━━━╯\n\n` +
    `💡 *Digite o comando acima para usar.*`
  );
}

function normalizeButtons(buttons = [], max = 8) {
  return (buttons || [])
    .filter(b => b?.id && b?.text)
    .slice(0, max)
    .map(b => ({ id: String(b.id).trim(), text: String(b.text).slice(0, 20) }));
}

// ── Header com imagem ────────────────────────────────────────
async function buildHeader(sock, image) {
  const empty = proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false });
  if (!image) return empty;
  try {
    const src = Buffer.isBuffer(image) ? { image } : { image: { url: image } };
    const media = await prepareWAMessageMedia(src, { upload: sock.waUploadToServer });
    return proto.Message.InteractiveMessage.Header.fromObject({
      title: '', subtitle: '', hasMediaAttachment: true,
      imageMessage: media.imageMessage,
    });
  } catch {
    return empty;
  }
}

// ── Método 1: NativeFlow directo ─────────────────────────────
async function sendNativeDirect(sock, jid, title, footer, buttons, quoted, opts = {}) {
  const btns = buttons.map(b => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
  }));
  const header = await buildHeader(sock, opts.image);
  const content = {
    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
      body:   proto.Message.InteractiveMessage.Body.fromObject({ text: title }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || 'Dark Net Engine 🕸️' }),
      header,
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: btns }),
    }),
  };
  const msg = generateWAMessageFromContent(jid, content, { userJid: sock.user?.id, quoted });
  return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

// ── Método 2: ViewOnce wrapper ───────────────────────────────
async function sendNativeViewOnce(sock, jid, title, footer, buttons, quoted, opts = {}) {
  const btns = buttons.map(b => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
  }));
  const header = await buildHeader(sock, opts.image);
  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body:   proto.Message.InteractiveMessage.Body.fromObject({ text: title }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || 'Dark Net Engine 🕸️' }),
          header,
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: btns }),
        }),
      },
    },
  }, { userJid: sock.user?.id, quoted });
  return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

// ── Carousel com @systemzero/baileys ────────────────────────
async function sendCarousel(sock, jid, cards, quoted = null) {
  try {
    const { Carousel } = require('@systemzero/baileys/lib/MB.cjs');
    const carousel = new Carousel(sock);
    for (const card of cards) carousel.addCard(card);
    if (quoted) carousel.setContextInfo({ quotedMessage: quoted.message, stanzaId: quoted.key.id, participant: quoted.key.participant || jid });
    return await carousel.send(jid);
  } catch (e) {
    console.warn('[Carousel]', e.message?.slice(0, 60));
    return null;
  }
}

// ── ButtonV2 com @systemzero/baileys ────────────────────────
async function sendButtonV2(sock, jid, title, body, footer, buttons, thumbnail = null, quoted = null) {
  try {
    const { ButtonV2 } = require('@systemzero/baileys/lib/MB.cjs');
    const msg = new ButtonV2(sock);
    if (title)     msg.setTitle(title.slice(0, 60));
    if (body)      msg.setBody(body);
    if (footer)    msg.setFooter(footer);
    if (thumbnail) {
      try { msg.setThumbnail(thumbnail); } catch {}
    }
    for (const btn of buttons) {
      msg.addButton(btn.text?.slice(0, 20) || '⚡', btn.id || btn.text);
    }
    return await msg.send(jid, { quoted });
  } catch (e) {
    console.warn('[ButtonV2]', e.message?.slice(0, 60));
    return null;
  }
}

// ── API PRINCIPAL: sendButtons ───────────────────────────────
async function sendButtons(sock, jid, title, footer, buttons, quoted = null, opts = {}) {
  const clean = normalizeButtons(buttons);
  if (!clean.length) return sock.sendMessage(jid, { text: title }, { quoted });

  // Tenta 3 métodos em cascata
  try { return await sendNativeDirect(sock, jid, title, footer, clean, quoted, opts); } catch {}
  try { return await sendNativeViewOnce(sock, jid, title, footer, clean, quoted, opts); } catch {}

  // Fallback texto
  return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
}

// ── Lista interactiva ────────────────────────────────────────
async function sendListDirect(sock, jid, title, text, buttonText, sections, quoted = null) {
  return sock.relayMessage(jid, {
    interactiveMessage: {
      body:   { text },
      footer: { text: title || 'Dark Side Engine ⚡' },
      header: { title: '', subtitle: '', hasMediaAttachment: false },
      nativeFlowMessage: {
        buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: buttonText, sections }) }],
        messageParamsJson: '',
      },
    },
  }, {});
}

async function sendList(sock, jid, title, text, buttonText, sections, quoted = null, opts = {}) {
  try { return await sendListDirect(sock, jid, title, text, buttonText, sections, quoted); } catch {}
  // Fallback texto
  const rows = (sections || []).flatMap(s => (s.rows || []).map(r => `• *${r.title}*\n  ↳ \`${r.id}\``)).join('\n');
  return sock.sendMessage(jid, { text: `*${title}*\n\n${text}\n\n${rows}` }, { quoted });
}

// ── Botões URL / CTA ─────────────────────────────────────────
async function sendUrlButton(sock, jid, text, displayText, url, quoted = null) {
  try {
    const msg = generateWAMessageFromContent(jid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body:   proto.Message.InteractiveMessage.Body.fromObject({ text }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: 'Dark Net Engine 🕸️' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: displayText, url, merchant_url: url }) }],
        }),
      }),
    }, { userJid: sock.user?.id, quoted });
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch {
    return sock.sendMessage(jid, { text: `${text}\n\n🔗 ${displayText}: ${url}` }, { quoted });
  }
}

async function sendButtonsWithImage(sock, jid, title, footer, image, buttons, quoted = null) {
  return sendButtons(sock, jid, title, footer, buttons, quoted, { image });
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
  sendCarousel,
  sendButtonV2,
  buttonsText,
  normalizeButtons,
};
