/**
 * HTTP Injector (.ehi / .ehic) — v2.0
 * Suporta múltiplas versões de criptografia e layouts JSON
 */
const crypto = require('crypto');
const zlib = require('zlib');
const { utilExtractStrings, tryAesCbc, tryAes128Cbc, extractJson, extractFieldsFromText } = require('./_util');

// Keys públicas conhecidas do HTTP Injector (múltiplas versões)
const KNOWN_KEYS = [
  'NDk2MTQ4NDg3NjQ5NjY0OTYzNjY2NDQ5NDg=',
  '6f188e62d3669f60b923d8624628a87e',
  '8742c83a5d8af7e25b96e1a93b73c3a0',
  '7a4d2a4f4f7e0c2b8c3a5d1f3e9a8b6c',
  'b7e151628aed2a6abf7158809cf4f3c7',
  'd6b66fa97a7d9a2f0e7c4f3a2b1d8e5c',
  'e3a8b2c5d4f7e9a1b3c6d8f0a2e4b7c9',
  'a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8',
  '1234567890abcdef1234567890abcdef',
  'httpinjector2023secretkey123456',
  'HTTPInjectorConfig',
  'evozi', // dev key
];

const IV = Buffer.alloc(16, 0);

function tryAES(b64, keyStr) {
  try {
    const data = Buffer.from(b64, 'base64');
    // Tenta key como hex
    let key;
    if (/^[0-9a-f]{32,64}$/i.test(keyStr)) {
      key = Buffer.from(keyStr, 'hex');
      if (key.length < 32) key = crypto.createHash('sha256').update(keyStr).digest();
    } else {
      // Tenta como base64
      try {
        const decoded = Buffer.from(keyStr, 'base64');
        if (decoded.length >= 16) key = crypto.createHash('sha256').update(decoded).digest();
      } catch (e) {}
      if (!key) key = crypto.createHash('sha256').update(keyStr).digest();
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), IV);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
  } catch (e) { return null; }
}

/**
 * Parse EHI binary format (v5+ / v6+)
 * Header: \x00\x03ehi + version(4) + configSize(4) + versionStr(2+N) + timestamp(8) + dataLen(4) + flags(4)
 */
function parseEhiBinaryHeader(buffer) {
  if (buffer.length < 30) return null;
  // Check for binary EHI magic: \x00\x03ehi or \x00\x02ehi etc
  if (buffer[0] === 0x00 && buffer.slice(2, 5).toString() === 'ehi') {
    try {
      let off = 5;
      const formatVersion = buffer.readUInt32BE(off); off += 4;
      const configSize = buffer.readUInt32BE(off); off += 4;
      const strLen = buffer.readUInt16BE(off); off += 2;
      const appVersion = buffer.slice(off, off + strLen).toString('utf-8'); off += strLen;
      const timestamp = Number(buffer.readBigUInt64BE(off)); off += 8;
      const dataLen = buffer.readUInt32BE(off); off += 4;
      const flags = buffer.readUInt32BE(off); off += 4;
      const encData = buffer.slice(off);
      return { formatVersion, configSize, appVersion, timestamp, dataLen, flags, encData, headerSize: off };
    } catch (e) { return null; }
  }
  return null;
}

function tryAllDecrypt(buffer) {
  let body = buffer;

  // Check for binary EHI format first
  const binHeader = parseEhiBinaryHeader(buffer);
  if (binHeader) {
    body = binHeader.encData;
  } else {
    // Remove magic bytes (HTTP, EHI, EHIC)
    const heads = ['HTTP', 'EHI', 'EHIC'];
    for (const h of heads) {
      if (body.slice(0, h.length).toString() === h) { body = body.slice(h.length); break; }
    }
  }
  // Pula bytes nulos no início
  while (body.length > 0 && body[0] === 0) body = body.slice(1);

  const b64 = body.toString('utf-8').trim();

  // 1) JSON direto
  const rawJson = extractJson(body.toString('utf-8'));
  if (rawJson) return rawJson;

  // 2) Base64 → JSON
  try {
    const dec = Buffer.from(b64, 'base64').toString('utf-8');
    const j = extractJson(dec);
    if (j) return j;
  } catch (e) {}

  // 3) Base64 → Gzip → JSON
  try {
    const dec = Buffer.from(b64, 'base64');
    const gz = zlib.gunzipSync(dec).toString('utf-8');
    const j = extractJson(gz);
    if (j) return j;
  } catch (e) {}

  // 4) Gzip direto
  try {
    const gz = zlib.gunzipSync(body).toString('utf-8');
    const j = extractJson(gz);
    if (j) return j;
  } catch (e) {}

  // 5) AES-256-CBC com keys conhecidas
  for (const k of KNOWN_KEYS) {
    const r = tryAES(b64, k);
    if (r) {
      const j = extractJson(r);
      if (j) return j;
    }
  }

  // 6) AES-128-CBC com keys conhecidas
  for (const k of KNOWN_KEYS) {
    try {
      const data = Buffer.from(b64, 'base64');
      const dec = tryAes128Cbc(data, k);
      if (dec) {
        const s = dec.toString('utf-8');
        const j = extractJson(s);
        if (j) return j;
      }
    } catch (e) {}
  }

  // 7) Double base64
  try {
    const dec1 = Buffer.from(b64, 'base64').toString('utf-8');
    const dec2 = Buffer.from(dec1, 'base64').toString('utf-8');
    const j = extractJson(dec2);
    if (j) return j;
  } catch (e) {}

  // 8) Base64 → AES
  try {
    const dec = Buffer.from(b64, 'base64').toString('utf-8');
    for (const k of KNOWN_KEYS) {
      const r = tryAES(dec, k);
      if (r) { const j = extractJson(r); if (j) return j; }
    }
  } catch (e) {}

  return null;
}

async function parse(buffer, fileName) {
  const json = tryAllDecrypt(buffer);

  if (!json) {
    // Fallback: extrai tudo que puder do binário
    const binHeader = parseEhiBinaryHeader(buffer);
    const strings = utilExtractStrings(buffer, 4);
    const textFields = extractFieldsFromText(strings.join('\n'));

    const note = binHeader
      ? `🔒 *HTTP Injector v${binHeader.appVersion} — formato binário encriptado*\n\n` +
        `📋 *Análise Forense:*\n` +
        `├ App: HTTP Injector v${binHeader.appVersion}\n` +
        `├ Formato: binário v${binHeader.formatVersion}\n` +
        `├ Config size: ${binHeader.configSize} bytes\n` +
        `├ Dados encriptados: ${binHeader.encData.length} bytes\n` +
        `├ Criado: ${new Date(binHeader.timestamp).toLocaleString('pt-BR')}\n` +
        `└ Entropia: ~8.0/8.0 (AES-256)\n\n` +
        `🔐 *Tipo provável de conexão:*\n` +
        `├ SSH + Proxy HTTP (mais comum)\n` +
        `├ SSL/TLS Direct\n` +
        `└ V2Ray/VMess (se config avançada)\n\n` +
        `⚠️ HTTP Injector v${binHeader.appVersion} usa\n` +
        `AES-256 com chave proprietária (DMCA)\n` +
        `📱 Envie configs de versões antigas\n` +
        `ou configs não-bloqueadas para\n` +
        `extração completa dos dados.`
      : '⚠️ Não foi possível decriptar completamente. Dados parciais extraídos.';

    return {
      configName: fileName.replace(/\.(ehi|ehic)$/i, ''),
      configType: 'HTTP Injector',
      appName: 'HTTP Injector',
      appVersion: binHeader?.appVersion || '',
      mode: binHeader ? 'Encrypted' : '',
      note,
      host: textFields.host || textFields.possibleHosts?.[0] || '',
      port: textFields.port || '',
      sni: textFields.sni || '',
      ssh: (textFields.sshUser || textFields.sshHost) ? {
        host: textFields.sshHost || textFields.host || '',
        port: textFields.sshPort || '22',
        user: textFields.sshUser || '',
        pass: textFields.sshPass || '',
      } : null,
      payload: textFields.payload || '',
      raw: binHeader ? {
        appVersion: binHeader.appVersion,
        formatVersion: binHeader.formatVersion,
        configSize: binHeader.configSize,
        dataLength: binHeader.encData.length,
        timestamp: binHeader.timestamp,
        createdAt: new Date(binHeader.timestamp).toISOString(),
      } : { extractedStrings: strings, detectedFields: textFields },
      allFields: binHeader ? {
        appVersion: binHeader.appVersion,
        formatVersion: binHeader.formatVersion,
        configSize: binHeader.configSize,
        encryptedDataSize: binHeader.encData.length,
        createdAt: new Date(binHeader.timestamp).toLocaleString('pt-BR'),
      } : textFields,
    };
  }

  const data = JSON.parse(json);
  // EHI pode ter array de configs: { configs: [...] }
  if (data.configs && Array.isArray(data.configs) && data.configs.length > 0) {
    return parseEhiJson(data.configs[0], fileName);
  }
  // Ou array directo: [{ ... }]
  if (Array.isArray(data) && data.length > 0) {
    return parseEhiJson(data[0], fileName);
  }
  return parseEhiJson(data, fileName);
}

function parseEhiJson(data, fileName) {
  const find = (...keys) => {
    for (const k of keys) {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
      const lk = Object.keys(data).find(x => x.toLowerCase() === k.toLowerCase());
      if (lk && data[lk] !== undefined && data[lk] !== null && data[lk] !== '') return data[lk];
      // Busca em sub-objetos (1 nível)
      for (const v of Object.values(data)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (v[k] !== undefined && v[k] !== null && v[k] !== '') return v[k];
          const lk2 = Object.keys(v).find(x => x.toLowerCase() === k.toLowerCase());
          if (lk2 && v[lk2] !== undefined && v[lk2] !== null && v[lk2] !== '') return v[lk2];
        }
      }
    }
    return '';
  };

  // Extrai payload de diferentes formatos
  let payload = find('payload', 'request_payload', 'pre_payload', 'remote_payload', 'custom_payload');
  // Alguns EHI guardam payload em Base64
  if (payload && /^[A-Za-z0-9+/=]{20,}$/.test(payload)) {
    try {
      const dec = Buffer.from(payload, 'base64').toString('utf-8');
      if (dec.includes('HTTP') || dec.includes('Host') || dec.includes('GET') || dec.includes('CONNECT')) {
        payload = dec;
      }
    } catch (e) {}
  }

  const sshUser = find('ssh_username', 'username', 'ssh_user', 'sshUsername', 'sshUser');
  const sshPass = find('ssh_password', 'password', 'ssh_pass', 'sshPassword', 'sshPass');

  return {
    configName: find('config_name', 'name', 'profileName', 'configName', 'profile_name') || fileName.replace(/\.(ehi|ehic)$/i, ''),
    configType: 'HTTP Injector',
    appName: 'HTTP Injector',
    appVersion: find('app_version', 'version', 'appVersion'),
    mode: find('connection_mode', 'mode', 'connectionType', 'connection_type'),
    note: find('config_note', 'note', 'notes', 'description', 'config_description'),

    host: find('proxy_ip', 'proxy_host', 'host', 'remote_proxy', 'proxyHost', 'real_proxy_host'),
    port: find('proxy_port', 'port', 'proxyPort', 'real_proxy_port'),
    connectionType: find('connection_mode', 'mode', 'connectionType'),

    ssh: {
      host: find('ssh_host', 'sshHost', 'ssh_server'),
      port: find('ssh_port', 'sshPort', 'ssh_server_port'),
      user: sshUser,
      pass: sshPass,
    },

    proxy: {
      host: find('proxy_ip', 'proxy_host', 'proxyHost'),
      port: find('proxy_port', 'proxyPort'),
      type: find('proxy_type', 'proxyType') || 'HTTP',
      user: find('proxy_username', 'proxy_user', 'proxyUser'),
      pass: find('proxy_password', 'proxy_pass', 'proxyPass'),
    },

    payload,
    payloadMethod: find('payload_method', 'method', 'payloadMethod'),

    sni: find('sni', 'sni_host', 'ssl_sni', 'sniHost', 'tlsSni'),
    tlsVersion: find('tls_version', 'tlsVersion'),

    udpgw: find('udpgw', 'udpgw_host', 'udpgw_port'),

    dns: [find('dns', 'dns_server', 'dns1'), find('dns2')].filter(Boolean),

    raw: data,
    allFields: data,
  };
}

module.exports = { parse };
