/**
 * realCall.js — Origina uma chamada WhatsApp REAL (o telemóvel toca).
 *
 * A lib @systemzero/baileys@1.1.1 NÃO expõe offerCall/initiateCall, mas expõe
 * todos os internos necessários no próprio socket:
 *   sock.getUSyncDevices, sock.assertSessions, sock.createParticipantNodes,
 *   sock.query, sock.generateMessageTag
 * mais encodeSignedDeviceIdentity / jidEncode no pacote.
 *
 * Assim montamos o stanza <call><offer> exactamente como o cliente oficial,
 * sem trocar de biblioteca (zero impacto na velocidade/estabilidade actual).
 *
 * NOTA: isto faz o destino TOCAR. Não transporta áudio (RTP/SRTP fica fora
 * do âmbito da lib). A chamada toca e, se atendida, fica muda até terminar.
 */

const { randomBytes } = require('crypto');

let _ultimo = null;
function ultimoDiag() { return _ultimo; }

let _baileys = null;
function _lib() {
  if (!_baileys) _baileys = require('@systemzero/baileys');
  return _baileys;
}

function normalizarJid(numero) {
  if (!numero) return null;
  const s = String(numero).trim();
  if (s.includes('@')) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `${digits}@s.whatsapp.net`;
}

function _capabilities() {
  return new Uint8Array([1, 4, 255, 131, 207, 4]);
}

/**
 * Verifica se o socket tem tudo o que é preciso para originar chamada.
 */
function suportado(sock) {
  return !!(
    sock &&
    typeof sock.query === 'function' &&
    typeof sock.getUSyncDevices === 'function' &&
    typeof sock.assertSessions === 'function' &&
    typeof sock.createParticipantNodes === 'function'
  );
}

/**
 * Origina a chamada. Devolve { ok, callId, to } ou { ok:false, motivo }.
 *
 * @param {object} sock  socket Baileys ligado
 * @param {string} numero  número ou JID do destino
 * @param {object} opts  { isVideo }
 */
async function ligar(sock, numero, opts = {}) {
  const jid = normalizarJid(numero);
  if (!jid) return { ok: false, motivo: 'numero_invalido' };
  if (!suportado(sock)) return { ok: false, motivo: 'socket_sem_suporte' };

  const meId = sock?.authState?.creds?.me?.id || sock?.user?.id;
  if (!meId) return { ok: false, motivo: 'nao_autenticado' };

  const { encodeSignedDeviceIdentity, jidEncode } = _lib();
  const isVideo = !!opts.isVideo;
  const callId = randomBytes(16).toString('hex').toUpperCase().substring(0, 64);

  try {
    const offerContent = [];

    if (isVideo) {
      offerContent.push({
        tag: 'video',
        attrs: {
          enc: 'vp8',
          dec: 'vp8',
          orientation: '0',
          screen_width: '1920',
          screen_height: '1080',
          device_orientation: '0'
        },
        content: undefined
      });
    }

    offerContent.push({ tag: 'audio', attrs: { enc: 'opus', rate: '16000' }, content: undefined });
    offerContent.push({ tag: 'audio', attrs: { enc: 'opus', rate: '8000' }, content: undefined });
    offerContent.push({ tag: 'net', attrs: { medium: '3' }, content: undefined });
    offerContent.push({ tag: 'capability', attrs: { ver: '1' }, content: _capabilities() });
    offerContent.push({ tag: 'encopt', attrs: { keygen: '2' }, content: undefined });

    // chave simétrica da chamada, entregue cifrada a cada dispositivo do destino
    const encKey = randomBytes(32);

    const devs = await sock.getUSyncDevices([jid], true, false);
    if (!devs || !devs.length) return { ok: false, motivo: 'destino_sem_whatsapp' };

    const devices = devs.map(({ user, device }) => jidEncode(user, 's.whatsapp.net', device));
    await sock.assertSessions(devices, true);

    const { nodes: destinations, shouldIncludeDeviceIdentity } =
      await sock.createParticipantNodes(
        devices,
        { call: { callKey: new Uint8Array(encKey) } },
        { count: '0' }
      );

    offerContent.push({ tag: 'destination', attrs: {}, content: destinations });

    if (shouldIncludeDeviceIdentity) {
      offerContent.push({
        tag: 'device-identity',
        attrs: {},
        content: encodeSignedDeviceIdentity(sock.authState.creds.account, true)
      });
    }

    const tag = typeof sock.generateMessageTag === 'function'
      ? sock.generateMessageTag()
      : randomBytes(8).toString('hex').toUpperCase();

    const ack = await sock.query({
      tag: 'call',
      attrs: { id: tag, to: jid },
      content: [
        {
          tag: 'offer',
          attrs: { 'call-id': callId, 'call-creator': meId },
          content: offerContent
        }
      ]
    });

    // Diagnóstico: guarda o que o servidor respondeu ao <offer>.
    // ACK limpo != telemóvel tocou; isto permite ver o que voltou.
    _ultimo = {
      quando: new Date().toISOString(),
      callId,
      dispositivos: devices.length,
      ackTag: ack?.tag || null,
      ackAttrs: ack?.attrs ? { ...ack.attrs, from: undefined } : null,
      ackFilhos: Array.isArray(ack?.content) ? ack.content.map(c => c?.tag).filter(Boolean) : null
    };
    try { console.log('[realCall] offer ack:', JSON.stringify(_ultimo)); } catch {}

    return { ok: true, callId, to: jid, isVideo, ack: _ultimo };
  } catch (e) {
    return { ok: false, motivo: 'falha_offer', detalhe: e?.message || String(e) };
  }
}

/**
 * Termina/cancela uma chamada originada por nós.
 */
async function terminar(sock, callId, callTo, reason = 'timeout', duration) {
  if (!sock || typeof sock.query !== 'function') return { ok: false, motivo: 'socket_sem_suporte' };
  const meId = sock?.authState?.creds?.me?.id || sock?.user?.id;
  if (!meId) return { ok: false, motivo: 'nao_autenticado' };

  const attrs = { 'call-id': callId, 'call-creator': meId };
  if (reason) attrs.reason = reason;
  if (typeof duration === 'number') {
    attrs.duration = String(duration);
    attrs.audio_duration = String(duration);
  }

  try {
    await sock.query({
      tag: 'call',
      attrs: { to: normalizarJid(callTo), id: randomBytes(16).toString('hex').toUpperCase() },
      content: [{ tag: 'terminate', attrs, content: undefined }]
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'falha_terminate', detalhe: e?.message || String(e) };
  }
}

module.exports = { ligar, terminar, suportado, normalizarJid, ultimoDiag };
