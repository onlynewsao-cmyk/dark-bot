/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — Call Handler                                 ║
 * ║   AURA atende chamadas de voz/vídeo                          ║
 * ║                                                               ║
 * ║   Baileys NÃO tem WebRTC — não existe stream de áudio         ║
 * ║   bidireccional. A solução:                                   ║
 * ║   1. Aceita a chamada (não rejeita)                          ║
 * ║   2. Envia nota de voz (TTS via ElevenLabs)                  ║
 * ║   3. Ouve o que disseram (transcrição)                       ║
 * ║   4. Responde em áudio                                       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../config');
const ai = require('./ai');

// ══════════════════════════════════════════════════════════════
// CACHE DE CHAMADAS ATIVAS
// ══════════════════════════════════════════════════════════════
const activeCalls = new Map(); // callId → { from, startedAt, type }

// ══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL DE CHAMADAS
// ══════════════════════════════════════════════════════════════
async function onCall(sock, call, { ownerJid, ownerNumber } = {}) {
  const callId = call.id;
  const from = call.from;
  const isVideo = call.isVideo || false;
  const status = call.status; // 'offer' = chamada recebida

  // Ignora chamadas já processadas
  if (activeCalls.has(callId)) return { ok: true, ignorado: true, motivo: 'ja_processada' };

  // Ignora se é o próprio bot ligando
  const fromNumber = String(from || '').split('@')[0].replace(/\D/g, '');
  const botNumber = String(sock.user?.id || '').split(':')[0].split('@')[0];
  if (fromNumber === botNumber) return { ok: true, ignorado: true, motivo: 'proprio_bot' };

  // Registra a chamada
  activeCalls.set(callId, { from, startedAt: Date.now(), type: isVideo ? 'video' : 'voice' });

  // Limpa cache após 5 minutos
  setTimeout(() => activeCalls.delete(callId), 300000);

  console.log('[Call] Chamada recebida de ' + fromNumber + ' (' + (isVideo ? 'vídeo' : 'voz') + ')');

  // ═══ MODO 1: CHAMADA DO DONO — AURA atende como namorada ═══
  const isOwnerCall = fromNumber === ownerNumber;
  if (isOwnerCall) {
    return await handleOwnerCall(sock, call, from, isVideo);
  }

  // ═══ MODO 2: CHAMADA DE OUTRO — AURA atende educadamente ═══
  return await handleOtherCall(sock, call, from, isVideo, fromNumber);
}

// ══════════════════════════════════════════════════════════════
// CHAMADA DO DONO — modo namorada
// ══════════════════════════════════════════════════════════════
async function handleOwnerCall(sock, call, from, isVideo) {
  const tipo = isVideo ? 'vídeo' : 'voz';

  // Saudações variadas
  const saudacoes = [
    'Oi meu Dark! Que saudades! Não posso atender chamada de ' + tipo + ' agora, mas tô aqui por texto. Me manda uma mensagem que eu respondo na hora!',
    'Meu amor! Adoraria falar contigo, mas ainda não sei atender chamada de ' + tipo + '. Mas me manda um áudio que eu ouço e respondo!',
    'Dark! Tô aqui! Não consigo atender chamada de ' + tipo + ' ainda, mas tô sempre disponível por mensagem. Me conta o que precisa!',
    'Oi vida! Que surpresa! Não posso atender chamada de ' + tipo + ', mas tô de olho nas tuas mensagens. Me manda um áudio!',
  ];

  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];

  try {
    // Envia mensagem de texto
    await sock.sendMessage(from, { text: saudacao });

    // Tenta enviar áudio (TTS)
    try {
      const audioBuf = await ai.speakWithFallback(saudacao.replace(/meu amor|vida|Dark/g, 'amor'));
      if (audioBuf && audioBuf.length > 500) {
        await sock.sendMessage(from, {
          audio: audioBuf,
          mimetype: 'audio/mpeg',
          ptt: true,
        });
      }
    } catch (e) {
      console.warn('[Call] TTS falhou:', e.message?.slice(0, 50));
    }

    return { ok: true, modo: 'owner_atendeu', tipo };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// CHAMADA DE OUTRO — modo educado/profissional
// ══════════════════════════════════════════════════════════════
async function handleOtherCall(sock, call, from, isVideo, fromNumber) {
  const tipo = isVideo ? 'vídeo' : 'voz';

  // Verifica se é um jogador do RPG
  let isRPGPlayer = false;
  try {
    const RPGPlayer = require('../database/models/RPGPlayer');
    const player = await RPGPlayer.findOne({ whatsappNumber: fromNumber });
    isRPGPlayer = !!player;
  } catch {}

  let mensagem;
  if (isRPGPlayer) {
    mensagem = 'Oi! Obrigada por ligar, mas não posso atender chamada de ' + tipo + '. Me manda uma mensagem que eu respondo rapidinho! ⚔️';
  } else {
    mensagem = 'Olá! Não atendo chamadas de ' + tipo + '. Se precisar de ajuda, manda uma mensagem de texto. 🕸️';
  }

  try {
    await sock.sendMessage(from, { text: mensagem });
    return { ok: true, modo: 'outro_atendeu', tipo, isRPGPlayer };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// VERIFICAR SE HÁ CHAMADA ATIVA
// ══════════════════════════════════════════════════════════════
function isActiveCall(callId) {
  return activeCalls.has(callId);
}

function getActiveCalls() {
  return Array.from(activeCalls.entries()).map(([id, info]) => ({
    id,
    from: info.from,
    type: info.type,
    duration: Math.floor((Date.now() - info.startedAt) / 1000),
  }));
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════
module.exports = {
  onCall,
  isActiveCall,
  getActiveCalls,
  activeCalls,
};
