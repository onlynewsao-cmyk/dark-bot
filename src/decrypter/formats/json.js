/**
 * JSON genérico - tenta detectar campos comuns
 */
const { findInJson } = require('./_util');

async function parse(buffer, fileName) {
  const data = JSON.parse(buffer.toString('utf-8'));
  const find = findInJson(data);

  // V2Ray/Xray usa settings.vnext; V2Box e sing-box usam outbounds com
  // type/server/server_port. Não tratar todo JSON com outbounds como VMess,
  // pois isso deixava configs VLESS/Trojan modernos sem host no dashboard.
  const outbounds = Array.isArray(data.outbounds) ? data.outbounds : [];
  const v2rayOutbound = outbounds.find(o => o?.settings?.vnext?.length || o?.settings?.servers?.length) ||
    (data.v || data.vnext ? data : null);
  if (v2rayOutbound) return parseV2Ray(data, fileName, v2rayOutbound);

  const singBoxOutbound = outbounds.find(o => o && typeof o === 'object' &&
    (o.server || o.server_port || o.type === 'vless' || o.type === 'trojan' || o.type === 'vmess'));
  if (singBoxOutbound) return parseSingBox(data, fileName, singBoxOutbound);

  return {
    configName: find('name', 'configName', 'profile_name') || fileName,
    configType: 'JSON',
    appName: find('app', 'appName') || 'Genérico',
    mode: find('mode', 'type', 'protocol'),
    note: find('note', 'description'),

    host: find('host', 'server', 'proxy_host', 'proxy_ip', 'address', 'remote_proxy'),
    port: find('port', 'serverPort', 'proxyPort', 'proxy_port'),

    ssh: {
      host: find('sshHost', 'ssh_host'),
      port: find('sshPort', 'ssh_port'),
      user: find('sshUser', 'ssh_user', 'username'),
      pass: find('sshPass', 'ssh_pass', 'password'),
    },

    proxy: {
      host: find('proxyHost', 'proxy_host'),
      port: find('proxyPort', 'proxy_port'),
      type: find('proxyType', 'proxy_type') || 'HTTP',
      user: find('proxyUser', 'proxy_user'),
      pass: find('proxyPass', 'proxy_pass'),
    },

    payload: find('payload', 'custom_payload', 'request_payload'),
    sni: find('sni', 'sni_host', 'tls_sni'),
    dns: [find('dns', 'dnsServer')].filter(Boolean),

    raw: data, allFields: data,
  };
}

function parseV2Ray(data, fileName, selectedOutbound = null) {
  const out = selectedOutbound || data.outbounds?.find(o => o?.settings?.vnext?.length || o?.settings?.servers?.length) || data;
  const vnext = out.settings?.vnext?.[0] || out.settings?.servers?.[0] || data.vnext?.[0];
  const user = vnext?.users?.[0] || vnext?.clients?.[0] || {};
  return {
    configName: fileName,
    configType: 'V2Ray Config',
    appName: 'V2Ray',
    mode: out.protocol || 'vmess',
    host: vnext?.address || '',
    port: vnext?.port || '',
    vmess: {
      uuid: user.id || '',
      alterId: user.alterId,
      security: user.security || 'auto',
      network: out.streamSettings?.network || 'tcp',
      tls: out.streamSettings?.security || 'none',
      sni: out.streamSettings?.tlsSettings?.serverName || '',
      path: out.streamSettings?.wsSettings?.path || '',
      host: out.streamSettings?.wsSettings?.headers?.Host || '',
    },
    sni: out.streamSettings?.tlsSettings?.serverName || '',
    raw: data, allFields: data,
  };
}

/** V2Box/sing-box: configurações JSON modernas com `type` e `server`. */
function parseSingBox(data, fileName, out) {
  const tls = out.tls || {};
  const transport = out.transport || {};
  const headers = transport.headers || out.ws_opts?.headers || {};
  const hostHeader = headers.Host || headers.host || '';
  const uuid = out.uuid || out.password || out.users?.[0]?.uuid || out.users?.[0]?.password || '';
  return {
    configName: data.name || data.tag || fileName,
    configType: 'Sing-box / V2Box Config',
    appName: data.appName || data.app_name || 'V2Box / sing-box',
    mode: out.type || out.protocol || 'proxy',
    host: out.server || out.address || '',
    port: out.server_port || out.port || '',
    sni: tls.server_name || tls.serverName || out.server_name || '',
    proxy: {
      host: out.server || out.address || '',
      port: out.server_port || out.port || '',
      type: out.type || 'proxy',
    },
    vless: ['vless', 'trojan', 'vmess', 'shadowsocks'].includes(String(out.type || '').toLowerCase()) ? {
      uuid,
      flow: out.flow || '',
      security: out.security || out.method || '',
      network: transport.type || out.network || 'tcp',
      tls: tls.enabled ? 'tls' : 'none',
      sni: tls.server_name || tls.serverName || '',
      path: transport.path || out.path || '',
      host: hostHeader,
    } : undefined,
    raw: data,
    allFields: data,
  };
}

module.exports = { parse };
