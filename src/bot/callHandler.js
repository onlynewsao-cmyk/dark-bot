/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — CALL HANDLER v1 (v6.68)                        ║
 * ║   Atender, rejeitar, ouvir, falar, responder, entender      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ── O QUE O WHATSAPP/BAILEYS DEIXA MESMO FAZER ────────────────
 *
 * Auditei o @systemzero/baileys 1.1.1 linha a linha:
 *
 *   ✅ EXISTE  sock.rejectCall(callId, callFrom)
 *   ✅ EXISTE  evento 'call' com status offer/ringing/accept/
 *              reject/timeout/terminate, isVideo, isGroup
 *   ❌ NÃO EXISTE  acceptCall / answerCall
 *   ❌ NÃO EXISTE  qualquer pilha WebRTC, SRTP, ICE ou DTLS
 *
 * Atender uma chamada de voz obriga a: negociar SDP, abrir ICE,
 * cifrar SRTP e bombear pacotes RTP em tempo real. O Baileys é um
 * cliente de *sinalização por WebSocket* — não tem nada disso. O
 * issue "Calls support" (WhiskeySockets/Baileys#40) está aberto
 * desde 2023 exactamente por isto.
 *
 * Não posso inventar áudio bidireccional que a biblioteca não tem.
 * O que POSSO fazer — e faço aqui — é a coisa mais próxima que
 * funciona a sério:
 *
 * ── MODO "ATENDER POR VOZ" (o que este módulo entrega) ────────
 *
 *   1. ATENDER   → detecta a chamada e assume-a (não deixa tocar)
 *   2. FALAR     → manda IMEDIATAMENTE um áudio (PTT) gerado pela
 *                  AURA a atender a pessoa pelo nome
 *   3. OUVIR     → a resposta em voz da pessoa é transcrita
 *                  (Groq Whisper → AssemblyAI)
 *   4. ENTENDER  → o texto vai à AURA com o contexto da chamada
 *   5. RESPONDER → ela responde em ÁUDIO, e a conversa continua
 *                  por notas de voz enquanto a "chamada" durar
 *
 * É uma chamada assíncrona por notas de voz: ela atende, fala,
 * ouve, percebe e responde — só que o áudio viaja como PTT em vez
 * de stream RTP. É o máximo que a biblioteca permite, e ao
 * contrário de um stream falso, isto funciona mesmo.
 *
 * MODOS (config por chat, guardado no MongoDB):
 *   'atender'  → assume a chamada e conversa por voz  (padrão p/ Dono)
 *   'rejeitar' → rejeita + mensagem educada           (padrão)
 *   'ignorar'  → deixa tocar, não faz nada
 */
'use strict';

const config = require('../config');

// ══════════════════════════════════════════════════════════════
// ESTADO — chamadas activas (conversa por voz a decorrer)
// ══════════════════════════════════════════════════════════════
const _activas = new Map();      // jid -> { id, isVideo, inicio, turnos }
const _modos = new Map();        // jid -> 'atender' | 'rejeitar' | 'ignorar'
const DB_KEY = 'darkbot_call_modes_v1';
const JANELA_MS = 5 * 60 * 1000; // a "chamada" dura 5 min de conversa
let _carregado = false;

function _num(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function loadModes() {
  if (_carregado) return _modos;
  _carregado = true;
  try {
    const cache = require('./botConfigCache');
    const s = await cache.get(DB_KEY, null);
    if (s && typeof s === 'object') {
      for (const [k, v] of Object.entries(s)) _modos.set(k, v);
    }
  } catch {}
  return _modos;
}

async function setMode(jid, modo) {
  const m = String(modo || '').toLowerCase();
  if (!['atender', 'rejeitar', 'ignorar'].includes(m)) {
    return { ok: false, error: 'Modo inválido. Usa: atender, rejeitar ou ignorar.' };
  }
  await loadModes();
  _modos.set(jid, m);
  try {
    const cache = require('./botConfigCache');
    await cache.set(DB_KEY, Object.fromEntries(_modos));
  } catch {}
  return { ok: true, modo: m };
}

async function getMode(jid, isOwner) {
  await loadModes();
  if (_modos.has(jid)) return _modos.get(jid);
  // Padrão: com o Dono ela atende; com os outros rejeita educadamente.
  return isOwner ? 'atender' : 'rejeitar';
}

/** Há uma conversa de voz a decorrer com este número? */
function chamadaActiva(jid) {
  const c = _activas.get(jid);
  if (!c) return null;
  if (Date.now() - c.ultimo > JANELA_MS) { _activas.delete(jid); return null; }
  return c;
}

function terminar(jid) {
  const c = _activas.get(jid);
  _activas.delete(jid);
  return c;
}

// ══════════════════════════════════════════════════════════════
// FALAR — gera voz da AURA e envia como PTT
// ══════════════════════════════════════════════════════════════
async function falar(sock, jid, texto, quoted) {
  const ai = require('./ai');
  // Limpa emojis e markdown — o TTS lê-os em voz alta.
  const limpo = String(texto || '')
    .replace(/\p{Extended_Pictographic}[\uFE0F\u200D]*/gu, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!limpo) return { ok: false, error: 'nada para dizer' };

  try {
    const buf = await ai.speakWithFallback(limpo.slice(0, 500));
    if (buf && buf.length > 500) {
      await sock.sendMessage(jid, {
        audio: buf, mimetype: 'audio/ogg; codecs=opus', ptt: true,
      }, quoted ? { quoted } : undefined);
      return { ok: true, bytes: buf.length };
    }
    // TTS em baixo → não fica calada, manda texto.
    await sock.sendMessage(jid, { text: limpo }, quoted ? { quoted } : undefined);
    return { ok: true, fallbackTexto: true };
  } catch (e) {
    try { await sock.sendMessage(jid, { text: limpo }); } catch {}
    return { ok: false, error: e.message };
  }
}

/**
 * v6.69 — Criar uma chamada (outbound) via deep link do WhatsApp.
 * O Baileys não tem WebRTC, por isso não há stream de áudio real.
 * O que fazemos: gerar um link `https://call.whatsapp.com/...` que a
 * pessoa clica e a chamada abre no WhatsApp dela. É a via oficial.
 *
 * Devolve { ok, link, token } ou { ok:false, error }.
 */
async function criarChamada(sock, tipo = 'audio') {
  if (typeof sock.createCallLink !== 'function') {
    return { ok: false, error: 'Esta versão do Baileys não suporta criar chamadas.' };
  }
  try {
    const token = await sock.createCallLink(tipo === 'video' ? 'video' : 'audio', null, 30000);
    if (!token) return { ok: false, error: 'O WhatsApp não devolveu o token da chamada.' };

    const { CALL_AUDIO_PREFIX, CALL_VIDEO_PREFIX } = require('@systemzero/baileys');
    const prefix = tipo === 'video' ? CALL_VIDEO_PREFIX : CALL_AUDIO_PREFIX;
    return { ok: true, token, link: prefix + token, tipo };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * v6.69 — Liga a um número (via deep link) e avisa a pessoa.
 * A AURA gera o link e envia ao contacto. Quando ele clica, a chamada
 * abre no WhatsApp dele para o nosso número.
 */
async function ligar(sock, jid, opts = {}) {
  const numero = _num(jid);
  const tipo = opts.tipo === 'video' ? 'video' : 'audio';
  const nome = opts.pushName || numero;

  // Gera o link de chamada
  const chamada = await criarChamada(sock, tipo);
  if (!chamada.ok) {
    return { ok: false, error: chamada.error };
  }

  // Avisa a pessoa
  const txt = opts.mensagem ||
    (tipo === 'video'
      ? `Vídeo chamada do Dark. Clica para atender:`
      : `Chamada do Dark. Clica para atender:`);

  try {
    await sock.sendMessage(jid, {
      text: `${txt}\n${chamada.link}`,
    });
  } catch {}

  return { ok: true, link: chamada.link, token: chamada.token, tipo, jid };
}

// ══════════════════════════════════════════════════════════════
// AVATAR — a cara dela nas chamadas de vídeo (v6.69)
// Não há stream de vídeo (o Baileys não tem WebRTC), mas quem liga
// em vídeo quer ver alguém. Manda-se a foto de perfil do bot; se
// não houver, gera-se um avatar com IA e guarda-se em cache.
// ══════════════════════════════════════════════════════════════
const path = require('path');
const fs = require('fs');
const AVATAR_FILE = path.join(__dirname, '..', '..', 'data', 'aura-avatar.jpg');

async function obterAvatar(sock) {
  // 1. Já gerado antes?
  try {
    if (fs.existsSync(AVATAR_FILE)) {
      const b = fs.readFileSync(AVATAR_FILE);
      if (b && b.length > 1000) return b;
    }
  } catch {}

  // 2. Foto de perfil do próprio bot
  try {
    const meu = sock?.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
    if (meu) {
      const url = await sock.profilePictureUrl(meu, 'image');
      if (url) {
        const https = require('https');
        const buf = await new Promise((res, rej) => {
          https.get(url, r => {
            const c = [];
            r.on('data', d => c.push(d));
            r.on('end', () => res(Buffer.concat(c)));
          }).on('error', rej);
        });
        if (buf && buf.length > 1000) {
          try { fs.mkdirSync(path.dirname(AVATAR_FILE), { recursive: true }); fs.writeFileSync(AVATAR_FILE, buf); } catch {}
          return buf;
        }
      }
    }
  } catch {}

  // 3. Gera com IA (uma vez só — fica em cache)
  try {
    const ai = require('./ai');
    const buf = await ai.generateImage(
      'anime portrait of a 19 year old brazilian girl, long dark hair, ' +
      'soft smile, looking at camera, warm lighting, high quality, vertical'
    );
    if (buf && buf.length > 1000) {
      try { fs.mkdirSync(path.dirname(AVATAR_FILE), { recursive: true }); fs.writeFileSync(AVATAR_FILE, buf); } catch {}
      return buf;
    }
  } catch {}

  return null;
}

async function enviarAvatar(sock, jid, legenda) {
  const img = await obterAvatar(sock);
  if (!img) return { ok: false, error: 'sem avatar' };
  try {
    await sock.sendMessage(jid, {
      image: img,
      caption: legenda || '📹 Não consigo entrar no vídeo, mas sou eu. Fala comigo por voz.',
    });
    return { ok: true, bytes: img.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// OUVIR — transcreve o que a pessoa disse em voz
// ══════════════════════════════════════════════════════════════
async function ouvir(audioBuffer) {
  if (!audioBuffer || audioBuffer.length < 100) {
    return { ok: false, error: 'áudio vazio' };
  }
  const ai = require('./ai');

  // 1º Groq Whisper (rápido), 2º AssemblyAI (backup)
  try {
    const t = await ai.transcribeAudio(audioBuffer, 'pt');
    if (t && t.trim()) return { ok: true, texto: t.trim(), via: 'groq-whisper' };
  } catch (e) { /* tenta o próximo */ }

  try {
    const t = await ai.transcribeAssemblyAI(audioBuffer, 'pt');
    if (t && String(t).trim()) return { ok: true, texto: String(t).trim(), via: 'assemblyai' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: false, error: 'não percebi o áudio' };
}

// ══════════════════════════════════════════════════════════════
// ENTENDER — a AURA pensa no que ouviu, com contexto de chamada
// ══════════════════════════════════════════════════════════════
async function entender(texto, ctx = {}) {
  const { isOwner = false, pushName = 'pessoa', jid = '', turnos = 0, isVideo = false } = ctx;

  const contexto =
    `[CHAMADA DE ${isVideo ? 'VÍDEO' : 'VOZ'} A DECORRER — turno ${turnos + 1}]\n` +
    `Estás numa chamada com ${pushName}. Ela acabou de te dizer isto em voz: "${texto}"\n` +
    `Responde como quem está ao telefone: curto, natural, falado — não escrito. ` +
    `Nada de listas nem markdown, isto vai ser lido em voz alta. ` +
    `Se ela se despedir ("tchau", "até logo", "desliga"), despede-te também.`;

  try {
    const aura = require('../aura/auraHuman');
    const r = await aura.auraRespond(contexto, {
      isOwner, pushName, senderNumber: _num(jid),
      isGroup: false, historyArray: [],
    });
    if (r && !String(r).trim().startsWith('❌')) return { ok: true, resposta: String(r).trim() };
  } catch (e) { /* cai no fallback */ }

  return { ok: true, resposta: 'Estou aqui. Diz lá.', fallback: true };
}

/** A pessoa está a despedir-se? */
function ehDespedida(texto) {
  const t = String(texto || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /\b(tchau|adeus|ate logo|ate ja|ate depois|desliga|desligar|xau|bye|fui|falamos depois|beijo)\b/.test(t);
}

// ══════════════════════════════════════════════════════════════
// ATENDER — o fluxo completo quando entra uma chamada
// ══════════════════════════════════════════════════════════════
async function atenderChamada(sock, call, opts = {}) {
  const { isOwner = false, pushName = '', ownerJid = '' } = opts;
  const jid = call.from;
  const tipo = call.isVideo ? 'vídeo' : 'voz';
  const nome = pushName || _num(jid);

  // Assume a chamada: rejeita o toque (o WhatsApp não deixa manter
  // aberto sem WebRTC) e passa imediatamente para conversa por voz.
  try { await sock.rejectCall(call.id, jid); } catch {}

  _activas.set(jid, {
    id: call.id, isVideo: !!call.isVideo,
    inicio: Date.now(), ultimo: Date.now(), turnos: 0, isOwner,
  });

  const saudacao = isOwner
    ? `Oi Dark. Não consigo entrar na chamada de ${tipo}, mas estou aqui a ouvir. Fala comigo por voz que eu respondo na hora.`
    : `Olá! Aqui é a Aura, do Dark. Não consigo entrar em chamadas de ${tipo}, mas posso falar contigo por voz agora mesmo. Manda uma nota de voz e eu respondo já.`;

  // ── v6.69: CHAMADA DE VÍDEO → manda o avatar ────────────────
  // Não há stream de vídeo (sem WebRTC), mas quem liga em vídeo quer
  // ver alguém. Envia a cara dela antes de falar, para a chamada ter
  // rosto em vez de ser só voz no escuro.
  if (call.isVideo) {
    await enviarAvatar(sock, jid).catch(() => {});
  }

  const f = await falar(sock, jid, saudacao);

  // Avisa o Dono (se não foi ele a ligar)
  if (ownerJid && ownerJid !== jid) {
    try {
      await sock.sendMessage(ownerJid, {
        text: `📞 *Chamada atendida pela AURA*\n\n` +
              `De: ${nome} (${_num(jid)})\n` +
              `Tipo: ${call.isVideo ? '📹 vídeo' : '📞 voz'}\n` +
              `Hora: ${new Date().toLocaleString('pt-AO')}\n\n` +
              `Ela está a conversar por voz com a pessoa.`,
      });
    } catch {}
  }

  return { ok: true, modo: 'atender', falou: f.ok, jid };
}

/** Rejeita com uma mensagem educada. */
async function rejeitarChamada(sock, call, opts = {}) {
  const { ownerJid = '', pushName = '', comVoz = false } = opts;
  const jid = call.from;
  const tipo = call.isVideo ? 'vídeo' : 'voz';

  try { await sock.rejectCall(call.id, jid); } catch {}

  const texto = `Olá! O Dark não pode atender chamadas de ${tipo} agora. ` +
                `Deixa uma mensagem por aqui que ele lê quando puder.`;

  if (comVoz) await falar(sock, jid, texto);
  else { try { await sock.sendMessage(jid, { text: texto + ' 👋' }); } catch {} }

  if (ownerJid && ownerJid !== jid) {
    try {
      await sock.sendMessage(ownerJid, {
        text: `📞 Alguém te ligou!\n\n` +
              `De: ${pushName || _num(jid)} (${_num(jid)})\n` +
              `Tipo: ${call.isVideo ? '📹 vídeo' : '📞 voz'}\n` +
              `Hora: ${new Date().toLocaleString('pt-AO')}\n\n` +
              `Rejeitei e pedi que te deixassem mensagem.`,
      });
    } catch {}
  }

  return { ok: true, modo: 'rejeitar', jid };
}

/**
 * Ponto de entrada do evento 'call' do Baileys.
 */
async function onCall(sock, call, opts = {}) {
  if (!call || call.status !== 'offer') return { ok: false, ignorado: true };

  const jid = call.from;
  const isOwner = opts.isOwner ?? (_num(jid) === _num(opts.ownerNumber || ''));
  const modo = await getMode(jid, isOwner);

  if (modo === 'ignorar') return { ok: true, modo: 'ignorar', jid };
  if (modo === 'atender') return atenderChamada(sock, call, { ...opts, isOwner });
  return rejeitarChamada(sock, call, opts);
}

/**
 * Continua a conversa: chamado quando chega uma nota de voz de
 * alguém com chamada activa. Ouve → entende → responde em voz.
 */
async function continuarConversa(sock, jid, audioBuffer, opts = {}) {
  const c = chamadaActiva(jid);
  if (!c) return { ok: false, semChamada: true };

  const ouviu = await ouvir(audioBuffer);
  if (!ouviu.ok) {
    await falar(sock, jid, 'Não percebi o que disseste. Repete lá.');
    return { ok: false, error: ouviu.error };
  }

  const pensou = await entender(ouviu.texto, {
    isOwner: c.isOwner, pushName: opts.pushName || '',
    jid, turnos: c.turnos, isVideo: c.isVideo,
  });

  c.turnos++;
  c.ultimo = Date.now();

  await falar(sock, jid, pensou.resposta);

  // A pessoa despediu-se → fecha a chamada.
  if (ehDespedida(ouviu.texto)) {
    terminar(jid);
    return { ok: true, ouviu: ouviu.texto, respondeu: pensou.resposta, terminou: true };
  }

  return { ok: true, ouviu: ouviu.texto, respondeu: pensou.resposta, turnos: c.turnos, via: ouviu.via };
}

module.exports = {
  onCall, atenderChamada, rejeitarChamada, continuarConversa,
  falar, ouvir, entender, ehDespedida, obterAvatar, enviarAvatar,
  setMode, getMode, loadModes, chamadaActiva, terminar, criarChamada, ligar,
  _activas, _modos,
};
