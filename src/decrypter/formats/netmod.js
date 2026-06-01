/**
 * NetMod Channeler / NetMod Syna - Suporte Completo
 * Suporta: .nm, .nmess, nm-ssh://, nm-https://, base64, XOR, zlib
 */
const zlib = require('zlib');
const crypto = require('crypto');
const { utilExtractStrings, findInJson, tryXor } = require('./_util');

const XOR_KEYS = [
  Buffer.from('netmodsecret2022'),
  Buffer.from('NETMOD_KEY'),
  Buffer.from('nmsecret2023'),
  Buffer.from('NetMod@2024'),
];

function tryBase64Decode(str) {
  try {
    const buf = Buffer.from(str, 'base64');
    return buf.toString('utf-8');
  } catch { return null; }
}

function tryAESDecrypt(buffer, key) {
  try {
    const iv = buffer.slice(0, 16);
    const data = buffer.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
  } catch { return null; }
}

async function parse(buffer, fileName) {
  let body = buffer;

  // Remove prefixo nm-ssh:// ou nm-https://
  const text = buffer.toString('utf-8').trim();
  if (text.startsWith('nm-ssh://') || text.startsWith('nm-https://')) {
    body = Buffer.from(text.replace(/^nm-(ssh|https):\/\//i, ''), 'base64');
  }

  let json = null;
  let method = '';

  // 1. Tenta JSON direto
  try {
    const s = body.toString('utf-8');
    const idx = s.indexOf('{');
    if (idx >= 0) {
      const cand = s.slice(idx, s.lastIndexOf('}') + 1);
      JSON.parse(cand);
      json = cand;
      method = 'json-direto';
    }
  } catch {}

  // 2. Base64 simples
  if (!json) {
    const b64 = tryBase64Decode(body.toString('utf-8').trim());
    if (b64 && b64.includes('{')) {
      json = b64;
      method = 'base64';
    }
  }

  // 3. XOR
  if (!json) {
    for (const k of XOR_KEYS) {
      const r = tryXor(body, k);
      if (r && r.includes('{')) {
        json = r;
        method = 'xor';
        break;
      }
    }
  }

  // 4. Zlib
  if (!json) {
    try {
      json = zlib.gunzipSync(body).toString('utf-8');
      method = 'zlib';
    } catch {}
  }

  // 5. AES-256 com chaves comuns do NetMod
  if (!json) {
    const possibleKeys = [
      'netmodchanneler2023!',
      'NetModSyna2024Key!',
      'nm-ssh-secret-key',
    ];
    for (const k of possibleKeys) {
      const key = crypto.createHash('sha256').update(k).digest();
      const res = tryAESDecrypt(body, key);
      if (res && res.includes('{')) {
        json = res;
        method = 'aes-256';
        break;
      }
    }
  }

  if (!json) {
    return {
      configName: fileName?.replace(/\.(nm|nmess)$/i, '') || 'NetMod Config',
      configType: 'NetMod',
      appName: 'NetMod Channeler',
      note: '⚠️ Decrypt parcial - formato não reconhecido',
      allFields: { extractedStrings: utilExtractStrings(body) },
    };
  }

  let data;
  try {
    data = JSON.parse(json.match(/\{[\s\S]*\}/)?.[0] || json);
  } catch {
    data = {};
  }

  const find = findInJson(data);

  return {
    configName: find('name', 'configName', 'profileName') || fileName?.replace(/\.(nm|nmess)$/i, '') || 'NetMod SSH',
    configType: 'NetMod SSH',
    appName: 'NetMod Channeler',
    mode: find('mode', 'type', 'connectionType') || 'SSH',
    host: find('host', 'sshHost', 'remoteHost', 'server'),
    port: find('port', 'sshPort', 'remotePort') || '22',
    ssh: {
      host: find('sshHost', 'host', 'server'),
      port: find('sshPort', 'port') || '22',
      user: find('sshUser', 'username', 'user'),
      pass: find('sshPass', 'password', 'pass'),
    },
    sni: find('sni', 'sslSni', 'tlsSni', 'customSni'),
    payload: find('payload', 'customPayload'),
    dns: [find('dns', 'primaryDns')].filter(Boolean),
    note: `✅ Decrypt completo via ${method}`,
    raw: data,
    allFields: data,
  };
}

module.exports = { parse };
