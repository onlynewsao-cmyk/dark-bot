/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   🔓 DARK BOT — VPN DECRYPTER ENGINE v2.0                ║
 * ║   Suporta: HTTP Injector, NPV Tunnel, HA Tunnel Plus,    ║
 * ║   DarkTunnel, AnyTunnel, TLS Tunnel, NetMod Channeler,   ║
 * ║   Shadowsocks, V2Ray, Trojan, OpenVPN, WireGuard,        ║
 * ║   BD Net, APNA Lite, WYR VPN, SocksHTTP, etc.            ║
 * ╚══════════════════════════════════════════════════════════╝
 */
const path = require('path');
const { extractJson, extractFieldsFromText, utilExtractStrings } = require('./formats/_util');

// Carrega todos os parsers
const parsers = {
  ehi: require('./formats/ehi'),
  ehic: require('./formats/ehi'),
  hat: require('./formats/hat'),
  npv: require('./formats/npv'),
  npv4: require('./formats/npv'),
  npv7: require('./formats/npv'),
  npv8: require('./formats/npv'),
  npvt: require('./formats/npv'),
  dark: require('./formats/darktunnel'),
  darkt: require('./formats/darktunnel'),
  any: require('./formats/anytunnel'),
  tls: require('./formats/tlstunnel'),
  conf: require('./formats/wireguard'),
  nm: require('./formats/netmod'),
  nmess: require('./formats/netmod'),
  ovpn: require('./formats/openvpn'),
  ssh: require('./formats/ssh'),
  ssl: require('./formats/ssh'),
  json: require('./formats/json'),
  txt: require('./formats/text'),
  bdnet: require('./formats/bdnet'),
  apnalite: require('./formats/apnalite'),
  wyrvpn: require('./formats/wyrvpn'),
};

/**
 * Detecta formato pelo nome do arquivo + assinatura + conteúdo
 */
function detectFormat(fileName, buffer) {
  const ext = path.extname(fileName).toLowerCase().slice(1);
  if (parsers[ext]) return ext;

  const head = buffer.slice(0, 64).toString('utf-8').toLowerCase();
  const text = buffer.toString('utf-8').trim().toLowerCase();

  // Magic bytes / assinaturas binárias
  if (buffer.slice(0, 4).toString() === 'HTTP' || buffer.slice(0, 3).toString() === 'EHI') return 'ehi';
  if (buffer.slice(0, 3).toString() === 'HAT' || buffer.slice(0, 4).toString() === 'HATP') return 'hat';
  if (['NPV4','NPV7','NPV8','NPVT'].includes(buffer.slice(0, 4).toString())) return 'npv';
  if (buffer.slice(0, 3).toString() === 'NPV') return 'npv';
  if (buffer.slice(0, 4).toString() === 'DARK' || buffer.slice(0, 4).toString() === 'DTNL') return 'dark';
  if (buffer.slice(0, 3).toString() === 'ANY') return 'any';
  if (buffer.slice(0, 3).toString() === 'TLS') return 'tls';
  if (buffer.slice(0, 3).toString() === 'NMM') return 'nm';

  // Detecção por conteúdo
  if (head.includes('ehi') || head.startsWith('payload')) return 'ehi';
  if (head.includes('[interface]') && head.includes('privatekey')) return 'conf';
  if (head.includes('client') && head.includes('remote')) return 'ovpn';
  if (text.startsWith('bdnet://')) return 'bdnet';
  if (text.startsWith('apnalite://') || text.startsWith('apna://')) return 'apnalite';
  if (text.startsWith('wyrvpn://')) return 'wyrvpn';

  // Detecta hex puro longo (BD Net / APNA sem prefixo URI)
  if (/^[0-9a-fA-F]{80,}$/.test(text) && text.startsWith('4f07')) return 'bdnet';

  // URI schemes
  if (text.startsWith('vmess://') || text.startsWith('vless://') ||
      text.startsWith('trojan://') || text.startsWith('ss://') ||
      text.startsWith('ssh://') || text.startsWith('ssr://') ||
      text.startsWith('hysteria://') || text.startsWith('hysteria2://') ||
      text.startsWith('tuic://') || text.startsWith('warp://')) {
    return 'txt';
  }

  // JSON genérico
  try {
    const j = extractJson(buffer.toString('utf-8'));
    if (j) {
      const data = JSON.parse(j);
      // V2Ray / Xray
      if (data.outbounds || data.vnext || data.v || data.inbounds) return 'json';
      // SSH/VPN JSON genérico
      if (data.host || data.server || data.proxy_host || data.sshHost) return 'json';
    }
  } catch (e) {}

  // Detecta BD Net / APNA hex puro (sem URI prefix)
  // BD Net hex começa com 4f07... e é tudo hex
  const hexCheck = buffer.toString('hex');
  if (hexCheck.startsWith('4f07') && buffer.length > 100) return 'bdnet';

  // Texto com chave:valor
  const lines = buffer.toString('utf-8').split('\n');
  const kvCount = lines.filter(l => /^[^:=]+[:=].+/.test(l.trim())).length;
  if (kvCount >= 3) return 'txt';

  // Último recurso: tenta múltiplos parsers
  return null;
}

/**
 * Decrypta arquivo — retorna objeto padronizado
 */
async function decrypt(fileName, buffer) {
  let format = detectFormat(fileName, buffer);

  if (!format) {
    // Tenta brute-force com os parsers mais comuns
    const tryOrder = ['ehi', 'hat', 'npv', 'dark', 'any', 'tls', 'json', 'txt'];
    for (const fmt of tryOrder) {
      try {
        const result = await parsers[fmt].parse(buffer, fileName);
        if (result && (result.host || result.ssh?.host || result.vmess || result.wireguard || result.openvpn)) {
          format = fmt;
          const normalized = normalizeOutput(result);
          return {
            success: true,
            format: fmt.toUpperCase() + ' (auto-detectado)',
            fileName,
            fileSize: buffer.length,
            parsedAt: new Date().toISOString(),
            ...normalized,
          };
        }
      } catch (e) {}
    }

    // Fallback absoluto: extrai tudo que puder
    const strings = utilExtractStrings(buffer, 4);
    const fields = extractFieldsFromText(strings.join('\n'));
    return {
      success: false,
      format: 'DESCONHECIDO',
      fileName,
      fileSize: buffer.length,
      parsedAt: new Date().toISOString(),
      configName: fileName,
      configType: 'Desconhecido',
      note: `⚠️ Formato não reconhecido. ${strings.length} strings e ${Object.keys(fields).length} campos extraídos.`,
      server: {
        host: fields.host || fields.possibleHosts?.[0] || fields.possibleIPs?.[0] || '',
        port: fields.port || '',
        type: '',
      },
      ssh: (fields.sshUser || fields.sshHost) ? {
        host: fields.sshHost || fields.host || '', port: fields.sshPort || '',
        user: fields.sshUser || '', pass: fields.sshPass || '',
      } : null,
      sni: fields.sni || '',
      allFields: { ...fields, extractedStrings: strings.slice(0, 50) },
    };
  }

  const parser = parsers[format];
  const result = await parser.parse(buffer, fileName);

  return {
    success: true,
    format: format.toUpperCase(),
    fileName,
    fileSize: buffer.length,
    parsedAt: new Date().toISOString(),
    ...normalizeOutput(result),
  };
}

/**
 * Padroniza campos de saída
 */
function normalizeOutput(r) {
  // Normaliza server: usa o melhor host/port disponível
  const serverHost = r.host || r.server || r.proxyHost || r.remoteHost || r.ssh?.host || '';
  const serverPort = r.port || r.serverPort || r.proxyPort || r.remotePort || r.ssh?.port || '';

  return {
    configName: r.configName || r.name || '',
    configType: r.configType || r.type || '',
    configMode: r.mode || r.configMode || '',
    appName: r.appName || '',
    appVersion: r.appVersion || '',
    note: r.note || r.notes || '',

    server: {
      host: serverHost,
      port: serverPort,
      type: r.connectionType || r.protocol || r.mode || '',
    },

    ssh: normalizeSsh(r.ssh, r),
    proxy: normalizeProxy(r.proxy, r),

    sni: r.sni || r.tlsSni || '',
    tlsVersion: r.tlsVersion || '',

    payload: r.payload || '',
    payloadMethod: r.payloadMethod || '',

    vmess: r.vmess || null,
    vless: r.vless || null,
    trojan: r.trojan || null,
    shadowsocks: r.shadowsocks || null,

    wireguard: r.wireguard || null,
    openvpn: r.openvpn || null,

    dns: Array.isArray(r.dns) ? r.dns.filter(Boolean) : (r.dns ? [r.dns] : []),

    udpgw: r.udpgw || '',

    rawConfig: r.raw || null,
    allFields: r.allFields || r.extras || {},
  };
}

function normalizeSsh(ssh, r) {
  if (!ssh && !r.sshHost) return null;
  const obj = {
    host: ssh?.host || r.sshHost || '',
    port: ssh?.port || r.sshPort || '',
    user: ssh?.user || r.sshUser || '',
    pass: ssh?.pass || r.sshPass || '',
  };
  if (!obj.host && !obj.user && !obj.pass) return null;
  return obj;
}

function normalizeProxy(proxy, r) {
  if (!proxy && !r.proxyHost) return null;
  const obj = {
    host: proxy?.host || r.proxyHost || '',
    port: proxy?.port || r.proxyPort || '',
    type: proxy?.type || r.proxyType || 'HTTP',
    user: proxy?.user || r.proxyUser || '',
    pass: proxy?.pass || r.proxyPass || '',
  };
  if (!obj.host && !obj.port) return null;
  return obj;
}

module.exports = { decrypt, detectFormat, supportedFormats: Object.keys(parsers) };
