/**
 * DARK BOT v5 — Button Handler ULTRA
 * Motor completo de interactividade via @systemzero/baileys
 *
 * Métodos disponíveis (em ordem de robustez):
 *  sendButtonV2()   — ButtonV2 nativo do @systemzero (botões clicáveis reais)
 *  sendCarousel()   — Carousel com cards + imagem + botões
 *  sendButtons()    — NativeFlow quick_reply (cascata: Direct → ViewOnce → Texto)
 *  sendList()       — single_select interactivo
 *  sendUrlButton()  — botão de link (cta_url)
 *  sendCopyButton() — botão de copiar (cta_copy)
 *
 * Cada método tem fallback para texto formatado se o WhatsApp não renderizar.
 */

'use strict';

const {
  generateWAMessageFromContent,
  proto,
  prepareWAMessageMedia,
} = require('@systemzero/baileys');

// ── Lazy load MB.cjs ────────────────────────────────────────
let _MB = null;
function getMB() {
  if (_MB) return _MB;
  try { _MB = require('@systemzero/baileys/lib/MB.cjs'); } catch {}
  return _MB;
}

// ─────────────────────────────────────────────
// FALLBACK TEXTO — sempre funciona
// ─────────────────────────────────────────────
function buttonsText(title, footer, buttons = []) {
  const rows = buttons.map((b, i) =>
    `┃ ${String(i + 1).padStart(2, '0')} • *${b.text}*\n┃     ↳ \`${b.id}\``
  ).join('\n');
  return (
    `╭━━━〔 🕸️ DARK SIDE 〕━━━╮\n` +
    `${title}\n` +
    `┣━━━━━━━━━━━━━━━━━━━━\n${rows}\n` +
    `╰━━━〔 ⚡ ${footer || 'Dark Net Engine'} 〕━━━╯\n\n` +
    `💡 *Digite o comando acima com o prefixo.*`
  );
}

function normalizeButtons(btns = [], max = 8) {
  return (btns || [])
    .filter(b => b?.id && b?.text)
    .slice(0, max)
    .map(b => ({ id: String(b.id).trim(), text: String(b.text).slice(0, 20) }));
}

// ─────────────────────────────────────────────
// HEADER COM IMAGEM
// ─────────────────────────────────────────────
async function buildHeader(sock, image) {
  const empty = proto.Message.InteractiveMessage.Header.fromObject({
    title: '', subtitle: '', hasMediaAttachment: false,
  });
  if (!image) return empty;
  try {
    const src   = Buffer.isBuffer(image) ? { image } : { image: { url: image } };
    const media = await prepareWAMessageMedia(src, { upload: sock.waUploadToServer });
    return proto.Message.InteractiveMessage.Header.fromObject({
      title: '', subtitle: '', hasMediaAttachment: true,
      imageMessage: media.imageMessage,
    });
  } catch {
    return empty;
  }
}

// ─────────────────────────────────────────────
// BUTTONV2 — botões reais @systemzero
// ─────────────────────────────────────────────
/**
 * Envia mensagem com botões ButtonV2 reais.
 * @param {string}   title     — título do card (setTitle)
 * @param {string}   body      — corpo do card (setBody)
 * @param {string}   footer    — rodapé (setFooter)
 * @param {Array}    buttons   — [{text, id}]
 * @param {string}   thumbnail — URL ou Buffer da imagem (opcional)
 * @param {object}   quoted    — mensagem original para citar
 */
async function sendButtonV2(sock, jid, title, body, footer, buttons, thumbnail = null, quoted = null) {
  const MB = getMB();
  if (!MB?.ButtonV2) throw new Error('ButtonV2 indisponível');

  const msg = new MB.ButtonV2(sock);
  if (title)  msg.setTitle(String(title).slice(0, 60));
  if (body)   msg.setBody(String(body));
  if (footer) msg.setFooter(String(footer));

  if (thumbnail) {
    try { msg.setThumbnail(thumbnail); } catch {}
  }

  const clean = normalizeButtons(buttons);
  for (const btn of clean) {
    msg.addButton(btn.text, btn.id);
  }

  return msg.send(jid, { quoted });
}

// ─────────────────────────────────────────────
// CAROUSEL — cards com imagem + botões
// ─────────────────────────────────────────────
/**
 * Envia um Carousel com múltiplos cards.
 * @param {Array} cards — cada card:
 *   {
 *     title:     string,
 *     body:      string,
 *     footer:    string,
 *     thumbnail: string | Buffer,  (URL ou buffer)
 *     buttons:   [{text, id}],
 *   }
 */
async function sendCarousel(sock, jid, cards, quoted = null) {
  const MB = getMB();
  if (!MB?.Carousel) throw new Error('Carousel indisponível');

  const { prepareWAMessageMedia: prepMedia } = require('@systemzero/baileys');

  const carousel = new MB.Carousel(sock);

  for (const card of cards) {
    const btns = normalizeButtons(card.buttons || []);
    const nativeBtns = btns.map(b => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
    }));

    // Prepara header com imagem se disponível
    let header = { hasMediaAttachment: false };
    if (card.thumbnail) {
      try {
        const src   = Buffer.isBuffer(card.thumbnail) ? { image: card.thumbnail } : { image: { url: card.thumbnail } };
        const media = await prepMedia(src, { upload: sock.waUploadToServer });
        if (media?.imageMessage) {
          header = {
            hasMediaAttachment: true,
            imageMessage: media.imageMessage,
          };
        }
      } catch {}
    }

    carousel.addCard({
      header,
      body:   { text: card.body   || card.title || '' },
      footer: { text: card.footer || 'Dark Net Engine 🕸️' },
      nativeFlowMessage: { buttons: nativeBtns },
    });
  }

  return carousel.send(jid, { quoted });
}

// ─────────────────────────────────────────────
// NATIVEFLOW DIRECTO — método 1
// ─────────────────────────────────────────────
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
  const m = generateWAMessageFromContent(jid, content, { userJid: sock.user?.id, quoted });
  return sock.relayMessage(jid, m.message, { messageId: m.key.id });
}

// ─────────────────────────────────────────────
// NATIVEFLOW VIEWONCE — método 2
// ─────────────────────────────────────────────
async function sendNativeViewOnce(sock, jid, title, footer, buttons, quoted, opts = {}) {
  const btns = buttons.map(b => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
  }));
  const header = await buildHeader(sock, opts.image);
  const m = generateWAMessageFromContent(jid, {
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
  return sock.relayMessage(jid, m.message, { messageId: m.key.id });
}

// ─────────────────────────────────────────────
// SEND BUTTONS — cascata automática
// ─────────────────────────────────────────────
async function sendButtons(sock, jid, title, footer, buttons, quoted = null, opts = {}) {
  const clean = normalizeButtons(buttons);
  if (!clean.length) return sock.sendMessage(jid, { text: title }, { quoted });

  // Modo forçado
  if (opts.mode === 'text') {
    return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
  }

  // Cascata: NativeDirect → NativeViewOnce → Texto
  try { return await sendNativeDirect(sock, jid, title, footer, clean, quoted, opts); }   catch {}
  try { return await sendNativeViewOnce(sock, jid, title, footer, clean, quoted, opts); } catch {}
  return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
}

async function sendButtonsWithImage(sock, jid, title, footer, image, buttons, quoted = null) {
  return sendButtons(sock, jid, title, footer, buttons, quoted, { image });
}

// ─────────────────────────────────────────────
// LISTA INTERACTIVA (single_select)
// ─────────────────────────────────────────────
async function sendListDirect(sock, jid, title, text, buttonText, sections, quoted = null) {
  return sock.relayMessage(jid, {
    interactiveMessage: {
      body:   { text },
      footer: { text: title || 'Dark Side ⚡' },
      header: { title: '', subtitle: '', hasMediaAttachment: false },
      nativeFlowMessage: {
        buttons: [{
          name: 'single_select',
          buttonParamsJson: JSON.stringify({ title: buttonText, sections }),
        }],
        messageParamsJson: '',
      },
    },
  }, {});
}

async function sendList(sock, jid, title, text, buttonText, sections, quoted = null, opts = {}) {
  if (opts.mode === 'text') {
    const rows = (sections || []).flatMap(s => (s.rows || []).map(r => `• *${r.title}*\n  ↳ \`${r.id}\``)).join('\n');
    return sock.sendMessage(jid, { text: `*${title}*\n\n${text}\n\n${rows}` }, { quoted });
  }
  try { return await sendListDirect(sock, jid, title, text, buttonText, sections, quoted); } catch {}
  const rows = (sections || []).flatMap(s => (s.rows || []).map(r => `• *${r.title}*\n  ↳ \`${r.id}\``)).join('\n');
  return sock.sendMessage(jid, { text: `*${title}*\n\n${text}\n\n${rows}` }, { quoted });
}

async function sendListWithImage(sock, jid, title, text, buttonText, image, sections, quoted = null) {
  return sendList(sock, jid, title, text, buttonText, sections, quoted, { image });
}

// ─────────────────────────────────────────────
// BOTÕES ESPECIAIS
// ─────────────────────────────────────────────
async function _sendCTA(sock, jid, text, footer, btnName, btnParams, quoted = null) {
  try {
    const m = generateWAMessageFromContent(jid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body:   proto.Message.InteractiveMessage.Body.fromObject({ text }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || 'Dark Net Engine 🕸️' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{ name: btnName, buttonParamsJson: JSON.stringify(btnParams) }],
        }),
      }),
    }, { userJid: sock.user?.id, quoted });
    return sock.relayMessage(jid, m.message, { messageId: m.key.id });
  } catch (e) {
    return null; // caller trata o fallback
  }
}

/** Botão de URL (abre link) */
async function sendUrlButton(sock, jid, text, displayText, url, quoted = null) {
  const result = await _sendCTA(sock, jid, text, 'Dark Net Engine 🕸️', 'cta_url', {
    display_text: displayText, url, merchant_url: url,
  }, quoted);
  if (!result) {
    return sock.sendMessage(jid, { text: `${text}\n\n🔗 ${displayText}: ${url}` }, { quoted });
  }
  return result;
}

/** Botão de copiar código/texto */
async function sendCopyButton(sock, jid, text, displayText, copyCode, quoted = null) {
  const result = await _sendCTA(sock, jid, text, 'Dark Net Engine 🕸️', 'cta_copy', {
    display_text: displayText, copy_code: copyCode,
  }, quoted);
  if (!result) {
    return sock.sendMessage(jid, { text: `${text}\n\n📋 ${displayText}:\n\`${copyCode}\`` }, { quoted });
  }
  return result;
}

/** Botão de chamada telefónica */
async function sendCallButton(sock, jid, text, displayText, phoneNumber, quoted = null) {
  const result = await _sendCTA(sock, jid, text, 'Dark Net Engine 🕸️', 'cta_call', {
    display_text: displayText, phone_number: phoneNumber,
  }, quoted);
  if (!result) {
    return sock.sendMessage(jid, { text: `${text}\n\n📞 ${displayText}: +${phoneNumber}` }, { quoted });
  }
  return result;
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  // Principais
  sendButtonV2,
  sendCarousel,
  sendButtons,
  sendButtonsWithImage,
  sendList,
  sendListWithImage,
  sendUrlButton,
  sendCopyButton,
  sendCallButton,
  // Helpers
  buttonsText,
  normalizeButtons,
};
