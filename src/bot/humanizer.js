'use strict';

/**
 * v7.45 — Humanizador de envio. v7.52 — modos off/fast/full.
 *
 * Faz o bot comportar-se como uma pessoa ao responder, sem tocar nos ~770
 * `sock.sendMessage` espalhados pelo código: embrulha o `sendMessage` do
 * socket uma única vez, na criação.
 *
 * MODOS (env HUMANIZE):
 *   fast (OMISSÃO) — lido + "a escrever…" sem bloquear, espera mínima
 *                    (80–260ms). Rápido e continua a parecer humano.
 *   full ("on")    — comportamento teatral original: atraso de leitura +
 *                    espera proporcional ao tamanho (até ~6s). Lento.
 *   off            — sem nada (útil em testes).
 *
 * Em fast, presença e lido são fire-and-forget: o RTT do WhatsApp nunca
 * atrasa o envio. A presença mostra-se ANTES da espera mínima, por isso
 * quem recebe continua a ver "a escrever…" antes da resposta.
 */

const _raw = String(process.env.HUMANIZE || '').toLowerCase().trim();
const MODE = _raw === 'off' || _raw === '0' || _raw === 'false' ? 'off'
  : (_raw === 'full' || _raw === 'on' || _raw === 'true' || _raw === '1') ? 'full'
  : 'fast';
const ON = MODE !== 'off';
const FAST = MODE === 'fast';

// Velocidade "humana" de escrita ~ 40 caracteres/seg, com tecto para não
// arrastar respostas longas (a IA gera textos grandes). Só usado em full.
const CPS               = Number(process.env.HUMANIZE_CPS || 40);
const MIN_TEXTO_MS      = 700;
const MAX_TEXTO_MS      = 4500;
const MIN_AUDIO_MS      = 1500;
const MAX_AUDIO_MS      = 6000;
const MIN_MEDIA_MS      = 900;
const MAX_MEDIA_MS      = 3000;
const SEGUIDO_MS        = [350, 1100];     // 2.º, 3.º envio para o mesmo chat
const JANELA_SEGUIDO_MS = 12000;
const LER_ATRASO_MS     = [400, 1800];     // tempo até "abrir" a conversa
const JITTER_SISTEMA_MS = [150, 700];

// v7.52 fast: fracções dos valores full — presença visível, espera mínima.
const FAST_RESPOSTA_MS = [80, 260];
const FAST_SEGUIDO_MS  = [60, 180];
const FAST_SISTEMA_MS  = [40, 140];

const ultimoEnvio  = new Map();  // jid → ts do último envio
const pendenteLer  = new Map();  // jid → key da última msg recebida por ler

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd   = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function tamanhoTexto(content = {}) {
  const t = content.text || content.caption || content.conversation ||
            content.contextInfo?.externalAdReply?.title || '';
  return String(t).length;
}

function tipo(content = {}) {
  if (content.audio) return content.ptt ? 'ptt' : 'audio';
  if (content.image || content.video || content.sticker || content.document) return 'media';
  if (content.text || content.caption || content.poll || content.buttons || content.templateButtons || content.sections) return 'texto';
  if (content.react || content.delete || content.edit || content.protocolMessage) return 'sinal';
  return 'outro';
}

function calcularEspera(tp, content) {
  if (tp === 'ptt' || tp === 'audio') {
    const seg = Number(content.seconds || 0);
    return clamp(seg ? seg * 350 : 3000, MIN_AUDIO_MS, MAX_AUDIO_MS);
  }
  if (tp === 'media') return rnd([MIN_MEDIA_MS, MAX_MEDIA_MS]);
  if (tp === 'texto') return clamp((tamanhoTexto(content) / CPS) * 1000, MIN_TEXTO_MS, MAX_TEXTO_MS);
  return 0;
}

/** Chamado pelo messageRouter em cada mensagem recebida (não fromMe). */
function notaRecebida(msg) {
  const jid = msg?.key?.remoteJid;
  if (!jid || msg.key.fromMe) return;
  pendenteLer.set(jid, msg.key);
}

/** Marca como lida a última mensagem recebida nesse chat (se houver). */
async function lerPendente(sock, jid) {
  const key = pendenteLer.get(jid);
  if (!key) return;
  pendenteLer.delete(jid);
  try { await sock.readMessages([key]); } catch {}
}

/** Em PV, uma pessoa lê mesmo que não responda. Chamar sem await. */
function lerSemResponder(sock, msg) {
  if (!ON) return;
  const jid = msg?.key?.remoteJid;
  if (!jid || jid.endsWith('@g.us') || msg.key.fromMe) return;
  const janela = FAST ? [800, 2500] : [2500, 9000];
  setTimeout(() => lerPendente(sock, jid), rnd(janela));
}

function wrap(sock) {
  if (!sock || sock.__humanized) return sock;
  const original = sock.sendMessage.bind(sock);

  sock.sendMessage = async function humanSend(jid, content, options) {
    if (!ON || !jid || !content || jid === 'status@broadcast') return original(jid, content, options);
    const tp = tipo(content);
    if (tp === 'sinal' || tp === 'outro') return original(jid, content, options);

    const agora   = Date.now();
    const seguido = agora - (ultimoEnvio.get(jid) || 0) < JANELA_SEGUIDO_MS;
    const respostaAAlguem = pendenteLer.has(jid);

    try {
      if (FAST) {
        // ── FAST: lido + presença disparam SEM esperar; só a espera
        // mínima bloqueia o envio (o RTT do WhatsApp não conta).
        if (respostaAAlguem && !seguido) lerPendente(sock, jid).catch(() => {});
        const espera = seguido ? rnd(FAST_SEGUIDO_MS)
          : respostaAAlguem ? rnd(FAST_RESPOSTA_MS)
          : rnd(FAST_SISTEMA_MS);
        if (espera > 0 && (tp === 'texto' || tp === 'ptt' || tp === 'audio' || tp === 'media')) {
          const presence = (tp === 'ptt' || tp === 'audio') ? 'recording' : 'composing';
          try { sock.sendPresenceUpdate(presence, jid).catch(() => {}); } catch {}
          await sleep(espera);
          try { sock.sendPresenceUpdate('paused', jid).catch(() => {}); } catch {}
        } else if (espera > 0) {
          await sleep(espera);
        }
      } else {
        // ── FULL: comportamento original (teatral, lento).
        if (respostaAAlguem && !seguido) {
          await sleep(rnd(LER_ATRASO_MS));
          await lerPendente(sock, jid);
        }
        let espera;
        if (seguido) espera = rnd(SEGUIDO_MS);
        else if (respostaAAlguem) espera = calcularEspera(tp, content);
        else espera = rnd(JITTER_SISTEMA_MS);

        if (espera > 500 && (tp === 'texto' || tp === 'ptt' || tp === 'audio' || tp === 'media')) {
          const presence = (tp === 'ptt' || tp === 'audio') ? 'recording' : 'composing';
          await sock.sendPresenceUpdate(presence, jid).catch(() => {});
          await sleep(espera);
          await sock.sendPresenceUpdate('paused', jid).catch(() => {});
        } else if (espera > 0) {
          await sleep(espera);
        }
      }
    } catch {}

    ultimoEnvio.set(jid, Date.now());
    return original(jid, content, options);
  };

  sock.__humanized = true;
  return sock;
}

/**
 * v7.53 — heartbeat "a pensar": enquanto a IA trabalha (1–4 s sem nada no
 * ecrã), mantém o "a escrever…" vivo com pulso a cada 4 s. Fire-and-forget:
 * nunca atrasa nada. Devolve a função de parar (chamar em finally).
 *
 *   const parar = pensando(sock, jid);
 *   try { answer = await ai.chat(...); } finally { parar(); }
 */
function pensando(sock, jid) {
  if (!ON || !sock || !jid || typeof sock.sendPresenceUpdate !== 'function') return () => {};
  let parado = false;
  const pulso = () => { if (!parado) { try { sock.sendPresenceUpdate('composing', jid).catch(() => {}); } catch {} } };
  pulso();
  const timer = setInterval(pulso, 4000);
  if (timer.unref) timer.unref(); // nunca prende o processo
  return () => { parado = true; try { clearInterval(timer); } catch {} };
}

module.exports = { wrap, notaRecebida, lerSemResponder, pensando, _cfg: { ON, CPS, MODE } };
