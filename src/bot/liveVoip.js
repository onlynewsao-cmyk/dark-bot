/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — AURA VOZ REAL (RTP)                              ║
 * ║                                                               ║
 * ║   Chamada de VOZ 1:1 com áudio REAL de SAÍDA, via            ║
 * ║   baileys-caller (pilha WASM VoIP oficial do WhatsApp Web).   ║
 * ║                                                               ║
 * ║   ✅ A AURA FALA de verdade (TTS → Opus → RTP)                ║
 * ║   ✅ A AURA OUVE de verdade (RTP → PCM 16 kHz → transcrição)  ║
 * ║   ❌ Atender ENTRADA não existe em nenhuma lib Baileys        ║
 * ║      (o próprio baileys-caller declara "Inbound calls ❌")    ║
 * ║   ❌ Vídeo  ❌ Grupo                                          ║
 * ║                                                               ║
 * ║   OPCIONAL e isolado: se o pacote não estiver instalado,     ║
 * ║   devolve { ok:false, motivo:'nao_instalado' } e o resto do   ║
 * ║   bot segue igual. Instala com: npm run setup:voip            ║
 * ║                                                               ║
 * ║   Sessão PRÓPRIA em data/auth-voip — nunca toca nas creds    ║
 * ║   do bot principal (senão o WhatsApp dá 440 e os dois caem).  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '..', '..', 'data', 'auth-voip');
const TMP_DIR = path.join(__dirname, '..', '..', 'data', 'voip-tmp');

let _client = null;
let _VoipClient = null;
let _estado = 'off';
let _ultimoErro = '';
let _chamada = null;
let _conexao = null; // Promise da ligação em curso (evita 2 connects em paralelo)
let _qr = null;      // último QR capturado (para o dashboard)

/* ══════════════════════════ Estado ══════════════════════════ */

function temSessao() {
  try {
    return fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  } catch { return false; }
}

function getStatus() {
  return {
    motor: 'baileys-caller',
    disponivel: _voipDisponivel,
    estado: _estado,
    sessao: temSessao(),
    chamadaActiva: !!_chamada,
    qr: _qr,
    ultimoErro: _ultimoErro,
    limites: { inbound: false, video: false, grupo: false, outboundVoz: true },
  };
}

let _voipDisponivel = null;
async function disponivel() {
  if (_voipDisponivel !== null) return _voipDisponivel;
  try {
    await _carregarCliente();
    _voipDisponivel = true;
  } catch (e) {
    _voipDisponivel = false;
    _ultimoErro = 'baileys-caller não instalado (npm run setup:voip)';
  }
  return _voipDisponivel;
}

/* ══════════════════════════ Cliente ══════════════════════════ */

async function _carregarCliente() {
  if (_VoipClient) return _VoipClient;
  const mod = await import('baileys-caller');
  const VoipClient = mod.VoipClient || mod.default?.VoipClient;
  if (!VoipClient) throw new Error('VoipClient em falta no baileys-caller');
  _VoipClient = VoipClient;
  return VoipClient;
}

/**
 * O baileys-caller imprime o QR via qrcode-terminal (import dinâmico).
 * O Node partilha o cache entre require() e import() para módulos CJS,
 * por isso patchar o .generate aqui captura o QR e deixa-o chegar ao
 * dashboard — e continua a imprimir no log como fallback.
 */
function _capturarQr(onQr) {
  try {
    const qrt = require('qrcode-terminal');
    if (qrt && !qrt.__darkbot_patched) {
      const orig = qrt.generate;
      qrt.generate = function (qrData, opts, cb) {
        try {
          _qr = String(qrData || '');
          if (typeof onQr === 'function') onQr(_qr);
        } catch {}
        return orig.call(this, qrData, opts, cb);
      };
      qrt.__darkbot_patched = true;
    }
  } catch {}
}

async function conectar({ onEstado, onQr } = {}) {
  const notificar = (s, extra = {}) => {
    _estado = s;
    try { if (typeof onEstado === 'function') onEstado(s, extra); } catch {}
  };

  if (_client) {
    notificar(_estado === 'em_chamada' ? 'em_chamada' : 'ligado');
    return _client;
  }
  if (_conexao) return _conexao;

  _conexao = (async () => {
    const VoipClient = await _carregarCliente();
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    _qr = null;
    _capturarQr(onQr);

    // 1ª vez: o QR aparece no terminal/logs E no dashboard (data-qr).
    notificar('a_ligar');
    const client = new VoipClient({ authDir: AUTH_DIR });
    await client.connect();
    _client = client;
    _qr = null;
    notificar('ligado');
    return client;
  })().catch((e) => {
    _ultimoErro = String(e?.message || e).slice(0, 160);
    notificar('erro');
    _conexao = null;
    throw e;
  });

  return _conexao;
}

/* ══════════════════════════ Chamada ══════════════════════════ */

/**
 * Liga ao número com áudio REAL.
 * @param {string} numero   número só com dígitos (ex: 244945280380)
 * @param {object} opts
 *   audioPath  — mp3/wav já gravado para tocar (senão usa 'silence')
 *   saudacao   — texto para a AURA FALAR ao atender (TTS → audioPath)
 *   durationMs — desligar sozinha ao fim de N ms
 *   onEstado   — callback(estado, extra)
 *   onEscuta   — callback(wavBuffer, { duracaoMs }) com o que a AURA ouviu
 * @returns {{ok:boolean, metodo?:string, callId?:string, motivo?:string, detalhe?:string, call?:object}}
 */
async function ligarAoVivo(numero, opts = {}) {
  const digits = String(numero || '').replace(/\D/g, '');
  if (digits.length < 9) return { ok: false, motivo: 'numero_invalido' };

  if (!temSessao()) {
    return {
      ok: false,
      motivo: 'sem_sessao_voip',
      detalhe: 'Liga o QR do VoIP (3.º aparelho) — corre npm run setup:voip e vê o QR nos logs',
    };
  }

  const notificar = (s, extra = {}) => {
    _estado = s;
    try { if (typeof opts.onEstado === 'function') opts.onEstado(s, extra); } catch {}
  };

  let client;
  try {
    client = await conectar({ onEstado: opts.onEstado });
  } catch (e) {
    _ultimoErro = String(e?.message || e).slice(0, 160);
    return { ok: false, motivo: 'nao_conectou', detalhe: _ultimoErro };
  }
  if (!client) return { ok: false, motivo: 'nao_instalado', detalhe: _ultimoErro };

  try {
    let audioPath = opts.audioPath || null;
    if (!audioPath && opts.saudacao) {
      try {
        const ai = require('./ai');
        const buf = await ai.speakWithFallback(String(opts.saudacao));
        audioPath = await gravarTtsTemp(buf);
      } catch { audioPath = null; }
    }

    const callOpts = {};
    if (audioPath && fs.existsSync(audioPath)) callOpts.audioSource = audioPath;
    else callOpts.audioSource = 'silence';
    if (Number(opts.durationMs) > 0) callOpts.durationMs = Number(opts.durationMs);

    const call = await client.call(digits, callOpts);
    _chamada = call;

    call.on('ringing', () => notificar('a_tocar'));
    call.on('connected', () => notificar('em_chamada'));
    call.on('ended', () => {
      _chamada = null;
      notificar('ligado');
    });
    call.on('error', (err) => {
      _ultimoErro = String(err?.message || err).slice(0, 120);
      _chamada = null;
      notificar('ligado');
    });

    // AURA a OUVIR: RTP → PCM 16 kHz → WAV → transcrição
    if (typeof opts.onEscuta === 'function') {
      const escuta = _criarEscuta(opts.onEscuta);
      call.on('audio', (pcm) => {
        try { escuta.push(pcm); } catch {}
      });
      call.on('ended', () => { try { escuta.finalizar(); } catch {} });
    }

    notificar('em_chamada');
    return { ok: true, metodo: 'baileys-caller-rtp', callId: call.callId, call };
  } catch (e) {
    _ultimoErro = String(e?.message || e).slice(0, 160);
    notificar('ligado');
    return { ok: false, motivo: 'falhou', detalhe: _ultimoErro };
  }
}

/* ══════════════════════════ Escuta (PCM → WAV) ══════════════════════════ */

/**
 * Acumula os chunks PCM (Float32Array 16 kHz mono) vindos do evento 'audio'
 * e, ao detectar silêncio ou janela cheia, devolve um WAV pronto a transcrever.
 * Lógica pura → testável sem sessão real.
 */
function _criarEscuta(onWav, opts = {}) {
  const SAMPLE_RATE = 16000;
  const limiarRms = Number(opts.limiarRms) || 0.006;
  const silencioMs = Number(opts.silencioMs) || 650;
  const maxMs = Number(opts.maxMs) || 8000;
  const minMs = Number(opts.minMs) || 250;

  let chunks = [];
  let totalMs = 0;
  let falaMs = 0;     // só o tempo com VEZ (acima do limiar) — mede o mínimo
  let silencio = 0;
  let falando = false;

  function rms(f) {
    let s = 0;
    for (let i = 0; i < f.length; i++) s += f[i] * f[i];
    return Math.sqrt(s / f.length);
  }

  function limpar() {
    chunks = []; totalMs = 0; falaMs = 0; silencio = 0; falando = false;
  }

  function emitir() {
    if (!chunks.length || falaMs < minMs) {
      limpar();
      return;
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const all = new Float32Array(total);
    let o = 0;
    for (const c of chunks) { all.set(c, o); o += c.length; }
    limpar();
    try {
      onWav(pcmParaWav(all, SAMPLE_RATE), { duracaoMs: Math.round((all.length / SAMPLE_RATE) * 1000) });
    } catch {}
  }

  return {
    push(pcm) {
      if (!pcm || !pcm.length) return;
      const ms = (pcm.length / SAMPLE_RATE) * 1000;
      const nivel = rms(pcm);
      if (nivel >= limiarRms) {
        falando = true;
        silencio = 0;
        chunks.push(pcm);
        totalMs += ms;
        falaMs += ms;
      } else if (falando) {
        chunks.push(pcm);
        totalMs += ms;
        silencio += ms;
        if (silencio >= silencioMs) emitir();
      }
      if (totalMs >= maxMs) emitir();
    },
    finalizar() { emitir(); },
  };
}

/**
 * Float32Array 16 kHz mono → Buffer WAV (PCM 16-bit).
 * Exportado para testes.
 */
function pcmParaWav(samples, sampleRate = 16000) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);        // tamanho do chunk fmt
  buf.writeUInt16LE(1, 20);         // PCM
  buf.writeUInt16LE(1, 22);         // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);         // block align
  buf.writeUInt16LE(16, 34);        // bits por amostra
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

/* ══════════════════════════ Utilitários ══════════════════════════ */

async function gravarTtsTemp(buffer) {
  if (!buffer || buffer.length < 200) return null;
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const p = path.join(TMP_DIR, 'out-' + Date.now() + '.mp3');
  fs.writeFileSync(p, buffer);
  return p;
}

function desligar() {
  try { _chamada?.end(); } catch {}
  _chamada = null;
  try { _client?.disconnect(); } catch {}
  _client = null;
  _conexao = null;
  _qr = null;
  _estado = 'off';
}

/** Desliga E apaga a sessão local (equivale a "reset" do VoIP). */
function apagarSessao() {
  desligar();
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
}

module.exports = {
  getStatus,
  disponivel,
  temSessao,
  conectar,
  ligarAoVivo,
  gravarTtsTemp,
  desligar,
  apagarSessao,
  pcmParaWav,
  _criarEscuta,
  AUTH_DIR,
};
