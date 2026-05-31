/**
 * Formata o resultado do decrypter para WhatsApp e Dashboard — v2.0
 * Mais detalhado, organizado e com suporte a todos os formatos
 */
function formatForWhatsApp(r, config) {
  const lines = [];

  lines.push(`╭━━━━━━━━━━━━━━━━━━━━━━╮`);
  lines.push(`┃  🔓 *VPN DECRYPTER* 🔓`);
  lines.push(`┃  ⚡ ${config.bot.name}`);
  lines.push(`╰━━━━━━━━━━━━━━━━━━━━━━╯`);

  // ARQUIVO
  lines.push(``);
  lines.push(`╭─〔 📄 *ARQUIVO* 〕`);
  lines.push(`│ 📛 ${r.fileName}`);
  lines.push(`│ 🏷️ Formato: *${r.format}*`);
  lines.push(`│ 📦 Tamanho: ${(r.fileSize / 1024).toFixed(1)} KB`);
  if (r.appName) lines.push(`│ 🤖 App: ${r.appName}`);
  if (r.appVersion) lines.push(`│ 📱 Versão: ${r.appVersion}`);
  const hasData = r.server?.host || r.ssh?.host || r.vmess || r.wireguard || r.openvpn;
  const statusIcon = hasData ? '✅' : (r.success ? '🔒' : '⚠️');
  const statusText = hasData ? 'Decryptado' : (r.configMode === 'Encrypted' ? 'Encriptado (análise forense)' : 'Parcial');
  lines.push(`│ ${statusIcon} Status: ${statusText}`);
  lines.push(`╰─────────────────────`);

  // CONFIG
  if (r.configName || r.configType || r.configMode) {
    lines.push(``);
    lines.push(`╭─〔 🎯 *CONFIG* 〕`);
    if (r.configName) lines.push(`│ 📝 Nome: ${r.configName}`);
    if (r.configType) lines.push(`│ 🔧 Tipo: ${r.configType}`);
    if (r.configMode) lines.push(`│ ⚙️ Modo: ${r.configMode}`);
    if (r.note && r.note.length > 100) {
      lines.push(`╰─────────────────────`);
      lines.push(``);
      lines.push(`╭─〔 📌 *ANÁLISE* 〕`);
      r.note.split('\n').forEach(l => lines.push(`│ ${l}`));
      lines.push(`╰─────────────────────`);
    } else {
      if (r.note) lines.push(`│ 📌 Nota: ${r.note}`);
      lines.push(`╰─────────────────────`);
    }
  }

  // SERVIDOR PRINCIPAL
  if (r.server?.host || r.server?.port) {
    lines.push(``);
    lines.push(`╭─〔 🌐 *SERVIDOR* 〕`);
    if (r.server.host) lines.push(`│ 🖥️ Host: \`${r.server.host}\``);
    if (r.server.port) lines.push(`│ 🔌 Porta: \`${r.server.port}\``);
    if (r.server.type) lines.push(`│ 📡 Tipo: ${r.server.type}`);
    lines.push(`╰─────────────────────`);
  }

  // SSH
  if (r.ssh && (r.ssh.host || r.ssh.user || r.ssh.pass)) {
    lines.push(``);
    lines.push(`╭─〔 🔐 *SSH* 〕`);
    if (r.ssh.host) lines.push(`│ 🖥️ Host: \`${r.ssh.host}\``);
    lines.push(`│ 🔌 Porta: \`${r.ssh.port || '22'}\``);
    if (r.ssh.user) lines.push(`│ 👤 User: \`${r.ssh.user}\``);
    if (r.ssh.pass) lines.push(`│ 🔑 Pass: \`${r.ssh.pass}\``);
    lines.push(`╰─────────────────────`);
  }

  // PROXY
  if (r.proxy && (r.proxy.host || r.proxy.port)) {
    lines.push(``);
    lines.push(`╭─〔 🛡️ *PROXY* 〕`);
    if (r.proxy.host) lines.push(`│ 🖥️ Host: \`${r.proxy.host}\``);
    if (r.proxy.port) lines.push(`│ 🔌 Porta: \`${r.proxy.port}\``);
    lines.push(`│ 📡 Tipo: ${r.proxy.type || 'HTTP'}`);
    if (r.proxy.user) lines.push(`│ 👤 User: \`${r.proxy.user}\``);
    if (r.proxy.pass) lines.push(`│ 🔑 Pass: \`${r.proxy.pass}\``);
    lines.push(`╰─────────────────────`);
  }

  // SNI / TLS
  if (r.sni) {
    lines.push(``);
    lines.push(`╭─〔 🔒 *SNI / TLS* 〕`);
    lines.push(`│ 🌐 SNI: \`${r.sni}\``);
    if (r.tlsVersion) lines.push(`│ 🔐 Versão: ${r.tlsVersion}`);
    lines.push(`╰─────────────────────`);
  }

  // PAYLOAD
  if (r.payload) {
    const payloadStr = truncate(String(r.payload), 1000);
    lines.push(``);
    lines.push(`╭─〔 📡 *PAYLOAD* 〕`);
    if (r.payloadMethod) lines.push(`│ Método: ${r.payloadMethod}`);
    lines.push(`╰─────────────────────`);
    lines.push('```');
    lines.push(payloadStr);
    lines.push('```');
  }

  // VMess
  if (r.vmess) {
    lines.push(``);
    lines.push(`╭─〔 🔮 *VMESS* 〕`);
    if (r.vmess.uuid) lines.push(`│ 🆔 UUID: \`${r.vmess.uuid}\``);
    if (r.vmess.alterId !== undefined) lines.push(`│ 🔢 AlterId: ${r.vmess.alterId}`);
    if (r.vmess.security) lines.push(`│ 🔐 Security: ${r.vmess.security}`);
    if (r.vmess.network) lines.push(`│ 🌐 Network: ${r.vmess.network}`);
    if (r.vmess.tls) lines.push(`│ 🔒 TLS: ${r.vmess.tls}`);
    if (r.vmess.path) lines.push(`│ 📂 Path: ${r.vmess.path}`);
    if (r.vmess.host) lines.push(`│ 🌍 Host: ${r.vmess.host}`);
    if (r.vmess.sni) lines.push(`│ 🔒 SNI: ${r.vmess.sni}`);
    lines.push(`╰─────────────────────`);
  }

  // VLess
  if (r.vless) {
    lines.push(``);
    lines.push(`╭─〔 🔮 *VLESS* 〕`);
    if (r.vless.uuid) lines.push(`│ 🆔 UUID: \`${r.vless.uuid}\``);
    if (r.vless.encryption) lines.push(`│ 🔐 Encryption: ${r.vless.encryption}`);
    if (r.vless.security) lines.push(`│ 🔒 Security: ${r.vless.security}`);
    if (r.vless.type) lines.push(`│ 🌐 Type: ${r.vless.type}`);
    if (r.vless.flow) lines.push(`│ 💨 Flow: ${r.vless.flow}`);
    if (r.vless.path) lines.push(`│ 📂 Path: ${r.vless.path}`);
    if (r.vless.host) lines.push(`│ 🌍 Host: ${r.vless.host}`);
    if (r.vless.sni) lines.push(`│ 🔒 SNI: ${r.vless.sni}`);
    lines.push(`╰─────────────────────`);
  }

  // Trojan
  if (r.trojan) {
    lines.push(``);
    lines.push(`╭─〔 🐎 *TROJAN* 〕`);
    if (r.trojan.password) lines.push(`│ 🔑 Senha: \`${r.trojan.password}\``);
    if (r.trojan.sni) lines.push(`│ 🌐 SNI: ${r.trojan.sni}`);
    if (r.trojan.type) lines.push(`│ 📡 Tipo: ${r.trojan.type}`);
    if (r.trojan.path) lines.push(`│ 📂 Path: ${r.trojan.path}`);
    lines.push(`╰─────────────────────`);
  }

  // Shadowsocks
  if (r.shadowsocks) {
    lines.push(``);
    lines.push(`╭─〔 🕶️ *SHADOWSOCKS* 〕`);
    if (r.shadowsocks.method) lines.push(`│ 🔐 Método: ${r.shadowsocks.method}`);
    if (r.shadowsocks.password) lines.push(`│ 🔑 Senha: \`${r.shadowsocks.password}\``);
    if (r.shadowsocks.server) lines.push(`│ 🖥️ Server: ${r.shadowsocks.server}`);
    if (r.shadowsocks.port) lines.push(`│ 🔌 Porta: ${r.shadowsocks.port}`);
    lines.push(`╰─────────────────────`);
  }

  // WireGuard
  if (r.wireguard) {
    lines.push(``);
    lines.push(`╭─〔 🛡️ *WIREGUARD* 〕`);
    if (r.wireguard.privateKey) lines.push(`│ 🔑 PrivKey: \`${truncate(r.wireguard.privateKey, 35)}...\``);
    if (r.wireguard.publicKey) lines.push(`│ 🔓 PubKey: \`${truncate(r.wireguard.publicKey, 35)}...\``);
    if (r.wireguard.presharedKey) lines.push(`│ 🗝️ PSK: \`${truncate(r.wireguard.presharedKey, 35)}...\``);
    if (r.wireguard.address) lines.push(`│ 📍 Address: ${r.wireguard.address}`);
    if (r.wireguard.endpoint) lines.push(`│ 🌐 Endpoint: ${r.wireguard.endpoint}`);
    if (r.wireguard.allowedIPs) lines.push(`│ ✅ AllowedIPs: ${r.wireguard.allowedIPs}`);
    if (r.wireguard.dns) lines.push(`│ 🌍 DNS: ${r.wireguard.dns}`);
    if (r.wireguard.mtu) lines.push(`│ 📏 MTU: ${r.wireguard.mtu}`);
    lines.push(`╰─────────────────────`);
  }

  // OpenVPN
  if (r.openvpn) {
    lines.push(``);
    lines.push(`╭─〔 🔓 *OPENVPN* 〕`);
    if (r.openvpn.proto) lines.push(`│ 📡 Proto: ${r.openvpn.proto}`);
    if (r.openvpn.remote) lines.push(`│ 🌐 Remote: ${r.openvpn.remote}`);
    if (r.openvpn.cipher) lines.push(`│ 🔐 Cipher: ${r.openvpn.cipher}`);
    if (r.openvpn.auth) lines.push(`│ 🔑 Auth: ${r.openvpn.auth}`);
    lines.push(`│ 🔒 TLS Auth: ${r.openvpn.tlsAuth ? '✅' : '❌'}`);
    lines.push(`│ 🔒 TLS Crypt: ${r.openvpn.tlsCrypt ? '✅' : '❌'}`);
    lines.push(`│ 👤 Auth User/Pass: ${r.openvpn.authUserPass ? '✅' : '❌'}`);
    if (r.openvpn.ca) lines.push(`│ 📜 CA: ✅ Incluso`);
    if (r.openvpn.cert) lines.push(`│ 📜 Cert: ✅ Incluso`);
    if (r.openvpn.key) lines.push(`│ 🗝️ Key: ✅ Incluso`);
    lines.push(`╰─────────────────────`);
  }

  // DNS
  if (r.dns && r.dns.length) {
    lines.push(``);
    lines.push(`╭─〔 🌍 *DNS* 〕`);
    r.dns.forEach(d => lines.push(`│ 📡 ${d}`));
    lines.push(`╰─────────────────────`);
  }

  // UDPGW
  if (r.udpgw) {
    lines.push(``);
    lines.push(`╭─〔 🔌 *UDPGW* 〕`);
    lines.push(`│ 📡 ${r.udpgw}`);
    lines.push(`╰─────────────────────`);
  }

  // Resumo rápido (copiar/colar)
  const quickInfo = [];
  if (r.server?.host) quickInfo.push(`Host: ${r.server.host}:${r.server.port || '?'}`);
  if (r.ssh?.user) quickInfo.push(`SSH: ${r.ssh.user}:${r.ssh.pass || '?'}@${r.ssh.host || '?'}:${r.ssh.port || '22'}`);
  if (r.sni) quickInfo.push(`SNI: ${r.sni}`);
  if (r.proxy?.host) quickInfo.push(`Proxy: ${r.proxy.host}:${r.proxy.port || '?'}`);

  if (quickInfo.length) {
    lines.push(``);
    lines.push(`╭─〔 📋 *RESUMO RÁPIDO* 〕`);
    quickInfo.forEach(q => lines.push(`│ ${q}`));
    lines.push(`╰─────────────────────`);
  }

  // Extra fields (se houver campos importantes não mapeados)
  if (r.allFields && typeof r.allFields === 'object') {
    const importantKeys = Object.keys(r.allFields).filter(k => {
      const v = r.allFields[k];
      if (typeof v === 'object' || v === '' || v === null || v === undefined) return false;
      const lk = k.toLowerCase();
      return (lk.includes('host') || lk.includes('port') || lk.includes('user') ||
              lk.includes('pass') || lk.includes('sni') || lk.includes('key') ||
              lk.includes('token') || lk.includes('uuid') || lk.includes('server') ||
              lk.includes('domain') || lk.includes('ip') || lk.includes('proxy') ||
              lk.includes('udp') || lk.includes('dns')) &&
             !['extractedStrings', 'detectedFields', 'possibleHosts', 'possibleIPs'].includes(k);
    });

    if (importantKeys.length > 0 && importantKeys.length <= 15) {
      lines.push(``);
      lines.push(`╭─〔 🔍 *CAMPOS EXTRAS* 〕`);
      for (const k of importantKeys.slice(0, 15)) {
        lines.push(`│ ${k}: \`${truncate(String(r.allFields[k]), 80)}\``);
      }
      lines.push(`╰─────────────────────`);
    }
  }

  lines.push(``);
  lines.push(`🔓 _Decrypted by ${config.bot.name}_`);
  lines.push(`👑 _${config.owner.name}_`);

  return lines.join('\n');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

module.exports = { formatForWhatsApp };
