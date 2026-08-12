/**
 * Chamada AO VIVO (RTP) — opcional, isolada.
 *
 * Ferramenta: baileys-caller (WASM VoIP oficial do WhatsApp Web).
 *   ✅ voz 1:1 de SAÍDA com microfone RTP
 *   ❌ atender entrada  ❌ vídeo  ❌ grupo
 *
 * NÃO está nas dependencies obrigatórias: @roamhq/wrtc rebenta o
 * build do Render Free. Se o pacote não existir, devolve
 * { ok:false, motivo:'nao_instalado' } e o resto do bot segue.
 *
 * Sessão PRÓPRIA em data/auth-voip — nunca toca em creds nem call:*.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '..', '..', 'data', 'auth-voip');
const TMP_DIR = path.join(__dirname, '..', '..', 'data', 'voip-tmp');

let _client = null;
let _estado = 'off';
let _ultimoErro = '';
let _chamada = null;

function temSessao() {
  try {
    return fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  } catch { return false; }
}

function getStatus() {
  return {
    motor: 'baileys-caller',
    estado: _estado,
    sessao: temSessao(),
    chamadaActiva: !!_chamada,
    ultimoErro: _ultimoErro,
    limites: { inbound: false, video: false, grupo: false, outboundVoz: true },
  };
}

async function _carregarCliente() {
  let mod;
  try {
    mod = await import('baileys-caller');
  } catch (e) {
    _ultimoErro = 'baileys-caller não instalado';
    return null;
  }
  const VoipClient = mod.VoipClient || mod.default?.VoipClient;
  if (!VoipClient) {
    _ultimoErro = 'VoipClient em falta';
    return null;
  }
  return VoipClient;
}

async function ligarAoVivo(numero, { audioPath } = {}) {
  const digits = String(numero || '').replace(/\D/g, '');
  if (digits.length < 9) return { ok: false, motivo: 'numero_invalido' };

  if (!temSessao()) {
    return { ok: false, motivo: 'sem_sessao_voip', detalhe: 'Liga o QR do VoIP (3.º aparelho) em /dashboard/connect' };
  }

  const VoipClient = await _carregarCliente();
  if (!VoipClient) return { ok: false, motivo: 'nao_instalado', detalhe: _ultimoErro };

  try {
    if (!_client) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      _client = new VoipClient({ authDir: AUTH_DIR });
      _estado = 'a_ligar';
      await _client.connect();
      _estado = 'ligado';
    }

    const opts = {};
    if (audioPath && fs.existsSync(audioPath)) opts.audioSource = audioPath;
    else opts.audioSource = 'silence';

    const call = await _client.call(digits, opts);
    _chamada = call;
    _estado = 'em_chamada';

    call.on('ended', () => {
      _chamada = null;
      _estado = 'ligado';
    });
    call.on('error', (err) => {
      _ultimoErro = String(err?.message || err).slice(0, 120);
      _chamada = null;
      _estado = 'ligado';
    });

    return { ok: true, metodo: 'baileys-caller-rtp', callId: call.callId };
  } catch (e) {
    _ultimoErro = String(e.message || e).slice(0, 160);
    _estado = temSessao() ? 'erro' : 'off';
    return { ok: false, motivo: 'falhou', detalhe: _ultimoErro };
  }
}

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
  _estado = 'off';
}

module.exports = {
  getStatus,
  temSessao,
  ligarAoVivo,
  gravarTtsTemp,
  desligar,
  AUTH_DIR,
};
