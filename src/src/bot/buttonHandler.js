/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║       DARK BOT — Button Handler v3 ULTRA                ║
 * ║  Botões interativos 100% compatíveis com Baileys 6.7+   ║
 * ║  Strategy: Direct NativeFlow → WaBase → Text fallback   ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * PROBLEMA ORIGINAL: botões não apareciam porque:
 *  1. sendMessage({ interactiveButtons }) não é suportado nativamente pelo Baileys
 *  2. relayMessage com interactiveMessage precisa do proto correto
 *  3. WhatsApp novo requer nativeFlowMessage com quick_reply
 *
 * SOLUÇÃO: usar sock.relayMessage com proto.Message.InteractiveMessage
 * diretamente, com fallback em cascata para texto formatado.
 */

const {
  generateWAMessageFromContent,
  proto,
  prepareWAMessageMedia,
} = require('@systemzero/baileys');

// ─────────────────────────────────────────────
// FALLBACK TEXTO (sempre funciona)
// ─────────────────────────────────────────────
function buttonsText(title, footer, buttons = []) {
  const lines = buttons.map((b, i) => {
    const id = String(b.id || '').trim();
    return `┃ ${String(i + 1).padStart(2, '0')} • *${b.text}*\n┃     ↳ \`${id}\``;
  }).join('\n');
  return (
    `╭━━━〔 🕸️ DARK SIDE MENU 〕━━━╮\n` +
    `${title}\n` +
    `┣━━━━━━━━━━━━━━━━━━━━\n` +
    `${lines}\n` +
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

// ─────────────────────────────────────────────
// HEADER COM IMAGEM
// ─────────────────────────────────────────────
async function buildHeader(sock, image) {
  const empty = proto.Message.InteractiveMessage.Header.fromObject({
    title: '', subtitle: '', hasMediaAttachment: false,
  });
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

// ─────────────────────────────────────────────
// MÉTODO 1: NativeFlow via relayMessage direto
// (mais compatível com Baileys 6.7+ e WA novo)
// ─────────────────────────────────────────────
async function sendNativeFlowDirect(sock, jid, title, footer, buttons, quoted = null, opts = {}) {
  const btns = buttons.map(b => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
  }));

  const header = await buildHeader(sock, opts.image);

  const content = {
    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
      body: proto.Message.InteractiveMessage.Body.fromObject({ text: title }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || 'Dark Net Engine 🕸️' }),
      header,
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
        buttons: btns,
        messageParamsJson: '',
      }),
    }),
  };

  const msg = generateWAMessageFromContent(jid, content, {
    userJid: sock.user?.id,
    quoted,
  });

  return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

// ─────────────────────────────────────────────
// MÉTODO 2: ViewOnce wrapper (compatibilidade extra)
// ─────────────────────────────────────────────
async function sendNativeFlowViewOnce(sock, jid, title, footer, buttons, quoted = null, opts = {}) {
  const btns = buttons.map(b => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
  }));

  const header = await buildHeader(sock, opts.image);

  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({ text: title }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || 'Dark Net Engine 🕸️' }),
          header,
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: btns,
            messageParamsJson: '',
          }),
        }),
      },
    },
  }, { userJid: sock.user?.id, quoted });

  return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

// ─────────────────────────────────────────────
// MÉTODO 3: relayMessage simples (raw object)
// ─────────────────────────────────────────────
async function sendRawInteractive(sock, jid, title, footer, buttons, quoted = null) {
  const btns = buttons.map(b => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
  }));

  return sock.relayMessage(jid, {
    interactiveMessage: {
      body: { text: title },
      footer: { text: footer || 'Dark Net Engine 🕸️' },
      header: { title: '', subtitle: '', hasMediaAttachment: false },
      nativeFlowMessage: {
        buttons: btns,
        messageParamsJson: '',
      },
    },
  }, {});
}

// ─────────────────────────────────────────────
// MÉTODO PÚBLICO: sendButtons com cascata
// ─────────────────────────────────────────────
async function sendButtons(sock, jid, title, footer, buttons, quoted = null, opts = {}) {
  const clean = normalizeButtons(buttons);
  if (!clean.length) {
    return sock.sendMessage(jid, { text: title }, { quoted });
  }

  const mode = opts.mode || 'auto';

  // Modo texto forçado
  if (mode === 'text') {
    return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
  }

  // Cascata automática: tenta os métodos em ordem
  const methods = [
    () => sendNativeFlowDirect(sock, jid, title, footer, clean, quoted, opts),
    () => sendNativeFlowViewOnce(sock, jid, title, footer, clean, quoted, opts),
    () => sendRawInteractive(sock, jid, title, footer, clean, quoted),
  ];

  // Modo específico
  if (mode === 'direct') methods.splice(1);
  if (mode === 'viewonce') methods.splice(0, 1);
  if (mode === 'raw') methods.splice(0, 2);

  for (const fn of methods) {
    try {
      return await fn();
    } catch (e) {
      // tenta próximo
    }
  }

  // Último recurso: texto rico formatado
  return sock.sendMessage(jid, { text: buttonsText(title, footer, clean) }, { quoted });
}

// ─────────────────────────────────────────────
// LISTA INTERATIVA (single_select)
// ─────────────────────────────────────────────
async function sendListDirect(sock, jid, title, text, buttonText, sections, quoted = null) {
  return sock.relayMessage(jid, {
    interactiveMessage: {
      body: { text },
      footer: { text: title || 'Dark Side Engine ⚡' },
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

async function sendListViewOnce(sock, jid, title, text, buttonText, sections, quoted = null, opts = {}) {
  const header = await buildHeader(sock, opts.image);
  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: title }),
          header,
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [{
              name: 'single_select',
              buttonParamsJson: JSON.stringify({ title: buttonText, sections }),
            }],
          }),
        }),
      },
    },
  }, { userJid: sock.user?.id, quoted });
  return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

function sectionsToText(title, text, sections) {
  const rows = (sections || [])
    .flatMap(s => (s.rows || []).map(r => `• *${r.title}*\n  ↳ \`${r.id}\``))
    .join('\n');
  return `*${title}*\n\n${text}\n\n${rows}`;
}

async function sendList(sock, jid, title, text, buttonText, sections, quoted = null, opts = {}) {
  const mode = opts.mode || 'auto';

  if (mode === 'text') {
    return sock.sendMessage(jid, { text: sectionsToText(title, text, sections) }, { quoted });
  }

  const methods = [
    () => sendListDirect(sock, jid, title, text, buttonText, sections, quoted),
    () => sendListViewOnce(sock, jid, title, text, buttonText, sections, quoted, opts),
  ];

  for (const fn of methods) {
    try {
      return await fn();
    } catch {}
  }

  return sock.sendMessage(jid, { text: sectionsToText(title, text, sections) }, { quoted });
}

// ─────────────────────────────────────────────
// BOTÕES ESPECIAIS
// ─────────────────────────────────────────────
async function sendUrlButton(sock, jid, text, displayText, url, quoted = null) {
  try {
    const msg = generateWAMessageFromContent(jid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: 'Dark Net Engine 🕸️' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({ display_text: displayText, url, merchant_url: url }),
          }],
        }),
      }),
    }, { userJid: sock.user?.id, quoted });
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch {
    return sock.sendMessage(jid, { text: `${text}\n\n🔗 ${displayText}: ${url}` }, { quoted });
  }
}

async function sendCopyButton(sock, jid, text, displayText, copyCode, quoted = null) {
  try {
    const msg = generateWAMessageFromContent(jid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: 'Dark Net Engine 🕸️' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({ display_text: displayText, copy_code: copyCode }),
          }],
        }),
      }),
    }, { userJid: sock.user?.id, quoted });
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch {
    return sock.sendMessage(jid, { text: `${text}\n\n📋 ${displayText}:\n\`${copyCode}\`` }, { quoted });
  }
}

async function sendCallButton(sock, jid, text, displayText, phoneNumber, quoted = null) {
  try {
    const msg = generateWAMessageFromContent(jid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: 'Dark Net Engine 🕸️' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{
            name: 'cta_call',
            buttonParamsJson: JSON.stringify({ display_text: displayText, phone_number: phoneNumber }),
          }],
        }),
      }),
    }, { userJid: sock.user?.id, quoted });
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch {
    return sock.sendMessage(jid, { text: `${text}\n\n📞 ${displayText}: +${phoneNumber}` }, { quoted });
  }
}

// ─────────────────────────────────────────────
// HELPERS COM IMAGEM
// ─────────────────────────────────────────────
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
  sendCopyButton,
  sendCallButton,
  buttonsText,
  normalizeButtons,
};
