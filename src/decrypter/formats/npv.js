/**
 * NPV Tunnel (.npv4, .npv7, .npv8, .npvt) - Suporte Completo v4.1
 * Suporte forte a V2Ray (VMess + WebSocket)
 */
const { utilExtractStrings, findInJson, tryXor } = require('./_util');
const zlib = require('zlib');

const NPV_KEYS = [
  Buffer.from('npvtunnel2023'),
  Buffer.from('NPV_SECRET_KEY'),
  Buffer.from('npvsecret2024'),
];

function tryBase64(s) {
  try { return Buffer.from(s, 'base64').toString('utf-8'); } catch { return null; }
}

async function parse(buffer, fileName) {
  let data = null;
  let method = 'desconhecido';

  const text = buffer.toString('utf-8').trim();

  // 1. JSON direto
  try {
    if (text.includes('{')) {
      data = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
      method = 'json';
    }
  } catch {}

  // 2. Base64
  if (!data) {
    const b64 = tryBase64(text);
    if (b64 && b64.includes('{')) {
      try { data = JSON.parse(b64.match(/\{[\s\S]*\}/)[0]); method = 'base64'; } catch {}
    }
  }

  // 3. XOR
  if (!data) {
    for (const key of NPV_KEYS) {
      const result = tryXor(buffer, key);
      if (result && result.includes('{')) {
        try { data = JSON.parse(result.match(/\{[\s\S]*\}/)[0]); method = 'xor'; break; } catch {}
      }
    }
  }

  // 4. Zlib
  if (!data) {
    try {
      const unz = zlib.gunzipSync(buffer).toString('utf-8');
      if (unz.includes('{')) { data = JSON.parse(unz.match(/\{[\s\S]*\}/)[0]); method = 'zlib'; }
    } catch {}
  }

  if (!data) {
    return {
      configName: fileName?.replace(/\.(npv4|npv7|npv8|npvt)$/i, '') || 'NPV Config',
      configType: 'NPV Tunnel',
      appName: 'NPV Tunnel',
      note: '⚠️ Decrypt parcial',
      allFields: { extractedStrings: utilExtractStrings(buffer) },
    };
  }

  const find = findInJson(data);

  // Detecta se é V2Ray
  const isV2ray = find('protocol') === 'vmess' || 
                  find('Address') || 
                  find('Server') || 
                  find('Password')?.length > 30;

  if (isV2ray) {
    return {
      configName: find('remarks', 'Name', 'name') || fileName?.replace(/\.(npv4|npv7|npv8|npvt)$/i, '') || 'V2Ray Config',
      configType: 'V2Ray',
      appName: 'NPV Tunnel',
      mode: 'V2Ray',
      host: find('Address', 'Server') || find('server'),
      port: find('Server Port', 'port') || '80',
      vmess: {
        uuid: find('Password', 'password', 'id'),
        address: find('Address', 'Server'),
        port: find('Server Port', 'port'),
        network: find('Network', 'network') || 'ws',
        host: find('Host', 'host') || find('sni'),
        path: find('Path', 'path') || '/',
        tls: find('Insecure') === true ? 'none' : 'tls',
        sni: find('Host', 'host'),
      },
      sni: find('Host', 'host'),
      note: `✅ Decrypt V2Ray completo via ${method}`,
      allFields: data,
    };
  }

  // Fallback SSH
  const ssh = {
    host: find('host', 'server', 'sshHost') || '',
    port: find('port', 'sshPort') || '22',
    user: find('user', 'username', 'sshUser') || '',
    pass: find('pass', 'password', 'sshPass') || '',
  };

  return {
    configName: find('name', 'remark') || fileName?.replace(/\.(npv4|npv7|npv8|npvt)$/i, '') || 'NPV SSH',
    configType: 'NPV Tunnel',
    appName: 'NPV Tunnel',
    mode: 'SSH',
    host: ssh.host,
    port: ssh.port,
    ssh: ssh,
    sni: find('sni'),
    note: `✅ Decrypt completo via ${method}`,
    allFields: data,
  };
}

module.exports = { parse };