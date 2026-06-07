const ehi = require('./formats/ehi');
const hat = require('./formats/hat');
const npv = require('./formats/npv');
const darktunnel = require('./formats/darktunnel');
const tlstunnel = require('./formats/tlstunnel');
const openvpn = require('./formats/openvpn');
const ssh = require('./formats/ssh');
const jsonFormat = require('./formats/json');
const netmod = require('./formats/netmod');
const anytunnel = require('./formats/anytunnel');
const bdnet = require('./formats/bdnet');
const wyrvpn = require('./formats/wyrvpn');
const wireguard = require('./formats/wireguard');
const textFormat = require('./formats/text');
const apnalite = require('./formats/apnalite');

/**
 * MASTER DECRYPTER CORE v3.0
 * Suporta TODOS os formatos VPN conhecidos.
 * Reconhecimento automático por extensão E por conteúdo (blind decrypt).
 */

// Mapa completo de extensão → parser
const EXT_MAP = {
  // HTTP Injector
  ehi: ehi, ehic: ehi,
  // HA Tunnel Plus
  hat: hat,
  // NPV Tunnel
  npv: npv, npv4: npv, npv7: npv, npv8: npv, npvt: npv,
  // DarkTunnel
  dark: darktunnel, darkt: darktunnel,
  // TLS Tunnel
  tls: tlstunnel,
  // OpenVPN / WireGuard
  ovpn: openvpn, conf: wireguard,
  // SSH / SSL
  ssh: ssh, ssl: ssh,
  // JSON genérico
  json: jsonFormat,
  // NetMod
  nm: netmod, nmess: netmod,
  // AnyTunnel
  any: anytunnel,
  // Texto/URI
  txt: textFormat, log: textFormat, cfg: textFormat, ini: textFormat,
};

// Mapa de URI scheme → parser (para detecção em texto/clipboard)
const URI_MAP = {
  'bdnet://': bdnet,
  'bd://': bdnet,
  'apnalite://': apnalite,
  'apna://': apnalite,
  'wyrvpn://': wyrvpn,
  'wyr://': wyrvpn,
  'vmess://': textFormat,
  'vless://': textFormat,
  'trojan://': textFormat,
  'ss://': textFormat,
  'ssr://': textFormat,
  'ssh://': ssh,
  'hysteria://': textFormat,
  'hysteria2://': textFormat,
  'tuic://': textFormat,
  'warp://': textFormat,
};

/**
 * Detecta formato por conteúdo (magic bytes, estrutura, etc)
 */
function detectByContent(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  const str = buffer.toString('utf8').trim();

  // Hex puro do BDNet (começa com 4f07...)
  if (/^[0-9a-fA-F]{50,}$/.test(str) && str.startsWith('4f07')) return bdnet;

  // JSON válido
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      JSON.parse(str);
      return jsonFormat;
    } catch {}
  }

  // WireGuard INI
  if (str.includes('[Interface]') && str.includes('PrivateKey')) return wireguard;

  // OpenVPN
  if (str.includes('client') && (str.includes('remote ') || str.includes('dev tun'))) return openvpn;

  // SSH config
  if (str.includes('Host=') || str.includes('Port=') || str.includes('ssh_host')) return ssh;

  // URI schemes no texto
  for (const [prefix, parser] of Object.entries(URI_MAP)) {
    if (str.toLowerCase().startsWith(prefix)) return parser;
  }

  // Base64 encoded JSON (comum em vários tunnels)
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8');
    if (decoded.startsWith('{') || decoded.includes('"host"')) return jsonFormat;
  } catch {}

  return null;
}

/**
 * Função principal de decryptação.
 * @param {string} fileName - Nome do ficheiro (com extensão)
 * @param {Buffer} buffer - Conteúdo binário
 */
async function decrypt(fileName, buffer) {
  const ext = fileName.split('.').pop().toLowerCase();
  let result = null;
  let usedFormat = ext.toUpperCase();

  try {
    // 1. Tentar por extensão (match exacto)
    const parser = EXT_MAP[ext];
    if (parser) {
      try {
        result = await parser.parse(buffer);
        if (result) usedFormat = result.format || ext.toUpperCase();
      } catch (e) {
        // Parser da extensão falhou — tentar detecção por conteúdo
      }
    }

    // 2. Se falhou, tentar detecção automática por conteúdo
    if (!result) {
      const detected = detectByContent(buffer);
      if (detected) {
        try {
          result = await detected.parse(buffer);
          if (result) usedFormat = result.format || 'AUTO-DETECT';
        } catch (e) {}
      }
    }

    // 3. Se ainda falhou, blind decrypt (tenta todos)
    if (!result) {
      result = await blindDecrypt(buffer);
      if (result) usedFormat = result.format || 'BRUTE-FORCE';
    }

    if (!result) {
      throw new Error(`Formato .${ext} não suportado ou criptografia desconhecida. Formatos suportados: ${Object.keys(EXT_MAP).join(', ')}`);
    }

    return {
      success: true,
      fileName,
      format: usedFormat,
      extractedAt: new Date().toISOString(),
      ...result,
    };
  } catch (err) {
    throw new Error(`Falha na Extração: ${err.message}`);
  }
}

/**
 * Detecta se um texto contém URI de VPN válida
 * @param {string} text - Texto a analisar
 * @returns {{ scheme: string, parser: object } | null}
 */
function detectURI(text) {
  const t = (text || '').trim().toLowerCase();
  for (const [prefix, parser] of Object.entries(URI_MAP)) {
    if (t.startsWith(prefix)) {
      return { scheme: prefix.replace('://', ''), parser };
    }
  }
  return null;
}

/**
 * Tenta todos os decrypters por ordem de probabilidade
 */
async function blindDecrypt(buffer) {
  const allParsers = [
    ehi, hat, npv, darktunnel, tlstunnel,
    jsonFormat, netmod, anytunnel, apnalite,
    bdnet, wyrvpn, ssh, openvpn, wireguard, textFormat,
  ];
  for (const f of allParsers) {
    try {
      const res = await f.parse(buffer);
      if (res) return res;
    } catch (e) {}
  }
  return null;
}

/**
 * Lista de todas as extensões suportadas (para UI)
 */
const SUPPORTED_EXTENSIONS = [...new Set(Object.keys(EXT_MAP))].sort();
const SUPPORTED_URIS = Object.keys(URI_MAP);

module.exports = { decrypt, detectURI, blindDecrypt, SUPPORTED_EXTENSIONS, SUPPORTED_URIS };
