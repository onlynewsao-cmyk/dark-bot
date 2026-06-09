/**
 * Formatador VPN para WhatsApp — v4.0
 * Suporta: BD Net, APNA Tunnel Lite, EHI, HAT, NPV, VMess, VLess,
 *          Trojan, Shadowsocks, WireGuard, OpenVPN, TLS Tunnel, SSH, etc.
 */

/* ── Helpers ──────────────────────────────────────────── */
const trunc = (s, n = 120) => !s ? '' : String(s).length > n ? String(s).slice(0, n) + '…' : String(s);

/** Linha com backtick (valor fixo/copiável) */
const L  = (icon, label, val) => val ? `│ ${icon} *${label}:* \`${val}\`` : null;
/** Linha sem backtick (texto normal) */
const LT = (icon, label, val) => val ? `│ ${icon} *${label}:* ${val}` : null;

/** Secção com título — só inclui se tiver linhas válidas */
function sec(title, lines) {
  const v = lines.filter(Boolean);
  if (!v.length) return [];
  return ['', `╭─〔 ${title} 〕`, ...v, `╰──────────────────────`];
}

/* ── Formatador principal ─────────────────────────────── */
function formatForWhatsApp(r, config) {
  const out  = [];
  const af   = r.allFields || {};
  const fmt  = (r.format || '').toUpperCase();

  /* ── Cabeçalho ── */
  out.push(`╭━━━━━━━━━━━━━━━━━━━━━━╮`);
  out.push(`┃  🔓 *VPN DECRYPTER* ⚡`);
  out.push(`┃  ${config.bot.name} · ${config.owner.name}`);
  out.push(`╰━━━━━━━━━━━━━━━━━━━━━━╯`);

  /* ── Ficheiro ── */
  out.push(...sec('📄 *FICHEIRO*', [
    LT('🏷️', 'Formato',   fmt || r.configType),
    LT('📛', 'Nome',      r.configName || r.fileName),
    LT('🤖', 'App',       r.appName),
    LT('📱', 'Versão',    r.appVersion),
    LT('📦', 'Tamanho',   r.fileSize ? `${(r.fileSize / 1024).toFixed(1)} KB` : null),
    LT('✅', 'Status',    r.partial ? '⚠️ Parcial / Protegido' : (r.success ? 'Decryptado com sucesso' : '⚠️ Parcial')),
  ]));

  /* ── Configuração ── */
  const isApna  = fmt === 'APNALITE' || r.configType?.includes('APNA');
  const isBdnet = fmt === 'BDNET'    || r.configType?.includes('BD Net');

  out.push(...sec(`⚙️ *CONFIGURAÇÃO${isApna ? ' — APNA Lite' : isBdnet ? ' — BD Net' : ''}*`, [
    LT('🔧', 'Tipo',        r.configType || r.configMode),
    LT('⚙️', 'Método',     r.configMode || af.method || af.mode),
    LT('🔒', 'SSL/WSS',    af.sslws === 'true' ? 'Sim ✅' : af.sslws === 'false' ? 'Não ❌' : af.sslws),
    LT('📂', 'Categoria',   af.category || af._category),
    LT('💬', 'Mensagem',    trunc(af.message || af._message, 80)),
    LT('⏳', 'Validade',    formatExpiry(af.tweak_expiry || af._expiresAt)),
    LT('🔑', 'Password',    af.tweak_password || af.password || '(sem senha)'),
    LT('🆔', 'HWID Lock',   af.hwid_lock || '(sem lock)'),
    LT('🌐', 'Query',       af.query),
    LT('📡', 'Modo Rede',   af.network_mode),
  ]));

  /* ── Servidor / Host ── */
  out.push(...sec('🌐 *SERVIDOR / HOST*', [
    L ('🖥️', 'Host',       r.server?.host || af.host || af.server || af.server_ip),
    L ('🔌', 'Porta',      r.server?.port || af.port),
    LT('📡', 'Tipo',       r.server?.type || af.method),
    LT('🔍', 'Resolve',    af.isHostResolve === 'true' ? 'Sim ✅' : af.isHostResolve === 'false' ? 'Não' : null),
    LT('🔒', 'SNI Host',   af.isHostSni === 'true' ? 'Sim ✅' : null),
    LT('🚫', 'Proxy Prot', af.isProxyProtected === 'true' ? 'Sim ✅' : null),
  ]));

  /* ── SSH ── */
  const sshH = r.ssh?.host || af.ssh_host || af.sshHost;
  const sshU = r.ssh?.user || af.ssh_user || af.sshUser || af.username;
  const sshP = r.ssh?.pass || af.ssh_pass || af.sshPass || af.password;
  const sshPt = r.ssh?.port || af.ssh_port || '22';
  if (sshH || sshU || sshP) {
    out.push(...sec('🔐 *SSH*', [
      L ('🖥️', 'Host',  sshH || r.ssh?.host),
      L ('🔌', 'Porta', sshPt),
      L ('👤', 'User',  sshU),
      L ('🔑', 'Pass',  sshP),
    ]));
  } else if (r.ssh) {
    out.push(...sec('🔐 *SSH*', [
      L ('🖥️', 'Host',  r.ssh.host),
      L ('🔌', 'Porta', r.ssh.port || '22'),
      L ('👤', 'User',  r.ssh.user),
      L ('🔑', 'Pass',  r.ssh.pass),
    ]));
  }

  /* ── Proxy ── */
  const pH  = r.proxy?.host || af.proxy_host;
  const pPt = r.proxy?.port || af.proxy_port;
  const pU  = r.proxy?.user || af.proxy_user;
  const pPa = r.proxy?.pass || af.proxy_pass;
  if (pH || pPt) {
    out.push(...sec('🛡️ *PROXY*', [
      L ('🖥️', 'Host',  pH  || r.proxy?.host),
      L ('🔌', 'Porta', pPt || r.proxy?.port),
      LT('📡', 'Tipo',  r.proxy?.type || af.proxy_type || 'HTTP'),
      L ('👤', 'User',  pU),
      L ('🔑', 'Pass',  pPa),
    ]));
  } else if (r.proxy) {
    out.push(...sec('🛡️ *PROXY*', [
      L ('🖥️', 'Host',  r.proxy.host),
      L ('🔌', 'Porta', r.proxy.port),
      LT('📡', 'Tipo',  r.proxy.type || 'HTTP'),
      L ('👤', 'User',  r.proxy.user),
      L ('🔑', 'Pass',  r.proxy.pass),
    ]));
  }

  /* ── SNI / TLS ── */
  const sni    = r.sni || af.sni || af.dothost || af.custom_sni || af.server_sni || af.serverName || af.sausage;
  const tlsVer = r.tlsVersion || af.tlsVersion || af._tlsVersion;
  out.push(...sec('🔒 *SNI / TLS*', [
    L ('🌐', 'SNI',        sni),
    LT('🔐', 'Versão TLS', tlsVer),
    LT('🔒', 'SSL/WSS',   af.sslws === 'true' ? 'Ativado ✅' : af.sslws === 'false' ? 'Desativado ❌' : af.sslws),
    LT('🚫', 'Insecure',  af.allowInsecure === 'true' ? 'Sim ⚠️' : af.allowInsecure === 'false' ? 'Não ✅' : null),
    LT('🔍', 'Obfs Tipo',  af.obfs_type),
    L ('🔧', 'Obfs Param', af.obfs_param),
  ]));

  /* ── Payload ── */
  const payloadRaw = af._payloadDecrypted || r.payload || af.payload;
  if (payloadRaw) {
    const clean = String(payloadRaw).replace(/\[crlf\]/gi, '\n').replace(/\\r\\n/g, '\n').trim();
    out.push('');
    out.push(`╭─〔 📡 *PAYLOAD* 〕`);
    if (r.payloadMethod) out.push(`│ 🔧 *Método:* ${r.payloadMethod}`);
    out.push(`╰──────────────────────`);
    out.push('```');
    out.push(trunc(clean, 800));
    out.push('```');
  }

  /* ── VMess / V2Ray ── */
  if (r.vmess) {
    out.push(...sec('🔮 *VMESS / V2RAY*', [
      L ('🆔', 'UUID',       r.vmess.uuid),
      LT('🔢', 'AlterId',   r.vmess.alterId),
      LT('🔐', 'Security',  r.vmess.security),
      LT('🌐', 'Network',   r.vmess.network),
      LT('🔒', 'TLS',       r.vmess.tls),
      LT('📂', 'Path',      r.vmess.path),
      L ('🌍', 'Host',      r.vmess.host),
      L ('🔒', 'SNI',       r.vmess.sni),
    ]));
  }

  /* ── VLess ── */
  if (r.vless) {
    out.push(...sec('🔮 *VLESS*', [
      L ('🆔', 'UUID',        r.vless.uuid),
      LT('🔐', 'Encryption',  r.vless.encryption),
      LT('🔒', 'Security',    r.vless.security),
      LT('🌐', 'Type',        r.vless.type),
      LT('💨', 'Flow',        r.vless.flow),
      LT('📂', 'Path',        r.vless.path),
      L ('🌍', 'Host',        r.vless.host),
      L ('🔒', 'SNI',         r.vless.sni),
    ]));
  }

  /* ── Trojan ── */
  if (r.trojan) {
    out.push(...sec('🐎 *TROJAN*', [
      L ('🖥️', 'Host',  r.trojan.host),
      L ('🔌', 'Porta', r.trojan.port),
      L ('🔑', 'Senha', r.trojan.password),
      L ('🌐', 'SNI',   r.trojan.sni),
      LT('📡', 'Tipo',  r.trojan.type),
      LT('📂', 'Path',  r.trojan.path),
    ]));
  }

  /* ── Shadowsocks ── */
  if (r.shadowsocks) {
    out.push(...sec('🕶️ *SHADOWSOCKS*', [
      L ('🖥️', 'Server', r.shadowsocks.server),
      L ('🔌', 'Porta',  r.shadowsocks.port),
      LT('🔐', 'Método', r.shadowsocks.method),
      L ('🔑', 'Senha',  r.shadowsocks.password),
    ]));
  }

  /* ── WireGuard ── */
  if (r.wireguard) {
    out.push(...sec('🛡️ *WIREGUARD*', [
      L ('🔑', 'PrivKey',    r.wireguard.privateKey  ? trunc(r.wireguard.privateKey, 44)  + '…' : null),
      L ('🔓', 'PubKey',    r.wireguard.publicKey   ? trunc(r.wireguard.publicKey, 44)   + '…' : null),
      L ('🗝️', 'PSK',      r.wireguard.presharedKey ? trunc(r.wireguard.presharedKey, 44) + '…' : null),
      L ('📍', 'Address',   r.wireguard.address),
      L ('🌐', 'Endpoint',  r.wireguard.endpoint),
      LT('✅', 'AllowedIPs',r.wireguard.allowedIPs),
      L ('🌍', 'DNS',       r.wireguard.dns),
      LT('📏', 'MTU',       r.wireguard.mtu),
    ]));
  }

  /* ── OpenVPN ── */
  if (r.openvpn) {
    out.push(...sec('🔓 *OPENVPN*', [
      LT('📡', 'Proto',     r.openvpn.proto),
      LT('🌐', 'Remote',    r.openvpn.remote),
      LT('🔐', 'Cipher',    r.openvpn.cipher),
      LT('🔑', 'Auth',      r.openvpn.auth),
      LT('🔒', 'TLS Auth',  r.openvpn.tlsAuth  ? '✅' : '❌'),
      LT('🔒', 'TLS Crypt', r.openvpn.tlsCrypt ? '✅' : '❌'),
      LT('👤', 'User/Pass', r.openvpn.authUserPass ? '✅ Requer' : '❌ Não'),
      LT('📜', 'Certs',     [r.openvpn.ca && 'CA', r.openvpn.cert && 'Cert', r.openvpn.key && 'Key'].filter(Boolean).join(' + ') || null),
    ]));
  }

  /* ── DNS ── */
  if (r.dns?.length) {
    out.push(...sec('🌍 *DNS*', r.dns.map(d => `│ 📡 \`${d}\``)));
  } else if (af.slow_dns || af.dns_server) {
    out.push(...sec('🌍 *DNS*', [
      L ('📡', 'Slow DNS',   af.slow_dns),
      L ('🌐', 'DNS Server', af.dns_server),
      LT('🔧', 'Modo DNS',   af.dns_mode),
    ]));
  }

  /* ── UDPGW ── */
  if (r.udpgw) {
    out.push(...sec('🔌 *UDPGW*', [`│ 📡 \`${r.udpgw}\``]));
  } else if (af.udp_port) {
    out.push(...sec('🔌 *UDP*', [
      LT('🔧', 'Modo UDP', af.udp_mode),
      L ('🔌', 'Porta',    af.udp_port),
    ]));
  }

  /* ── Opções Extras (BD Net / APNA específicas) ── */
  const extraLines = [
    LT('📱', 'Mobile Only',  boolLabel(af.mobile_data_only || af._mobileDataOnly)),
    LT('🔒', 'Block Rooted', boolLabel(af.block_rooted     || af._blockRooted)),
    LT('🤖', 'Auto Select',  boolLabel(af.isAutoSelect     || af._isAutoSelect)),
    LT('⏱️', 'Reconexão',   (af.reconnectSeconds || af._reconnectSeconds) ? (af.reconnectSeconds || af._reconnectSeconds) + 's' : null),
    LT('🔀', 'Split Tunnel', boolLabel(af.split_tunnel)),
    LT('📶', 'Modo Rede',    af.network_mode),
    LT('🌐', 'Allow BGP',    boolLabel(af.allow_bgp)),
    LT('📦', 'Allow UDP',    boolLabel(af.allow_udp)),
  ].filter(Boolean);
  if (extraLines.length) {
    out.push(...sec('⚙️ *OPÇÕES EXTRAS*', extraLines));
  }

  /* ── Resumo rápido (copiar) ── */
  const quick = [];
  const qHost = r.server?.host || af.host || af.server_ip;
  const qPort = r.server?.port || af.port;
  if (qHost) quick.push(`│ 🌐 \`${qHost}:${qPort || '?'}\``);
  if (sni)   quick.push(`│ 🔒 SNI: \`${sni}\``);
  if (sshU && sshP) quick.push(`│ 🔐 SSH: \`${sshU}:${sshP}\``);
  if (r.vmess?.uuid) quick.push(`│ 🆔 UUID: \`${r.vmess.uuid}\``);
  if (r.trojan?.password) quick.push(`│ 🔑 Trojan: \`${r.trojan.password}\``);
  if (payloadRaw) {
    const firstLine = String(payloadRaw).replace(/\[crlf\]/gi, '\n').split('\n')[0].trim();
    if (firstLine) quick.push(`│ 📡 \`${trunc(firstLine, 60)}\``);
  }
  if (quick.length) {
    out.push('');
    out.push(`╭─〔 📋 *RESUMO RÁPIDO* 〕`);
    out.push(...quick);
    out.push(`╰──────────────────────`);
  }

  /* ── Proteção / forensics ── */
  if (r.protected && r.protection) {
    out.push(...sec('🛡️ *PROTEÇÃO / FORENSICS*', [
      LT('🔐', 'Formato', r.protection.format),
      LT('🎯', 'Confiança', r.protection.confidence),
      LT('🧪', 'Entropia', r.protection.entropy ? `${r.protection.entropy}/8.0` : null),
      LT('🔢', 'Bytes protegidos', r.protection.encryptedBytes),
      LT('🔎', 'Strings visíveis', r.protection.printableStrings),
      LT('🌐', 'URLs visíveis', r.protection.urls?.length || 0),
    ]));
  }

  /* ── Nota técnica ── */
  if (r.note && !r.note.includes('Decrypt completo')) {
    out.push('');
    out.push(`┄ ℹ️ _${trunc(r.note, 120)}_`);
  }

  /* ── Rodapé ── */
  out.push('');
  out.push(`🔓 _Decrypted by *${config.bot.name}*_`);
  out.push(`👑 _${config.owner.name}_`);

  return out.join('\n');
}

/* ── Helpers internos ─────────────────────────────────── */
function boolLabel(v) {
  if (v === 'true'  || v === true)  return 'Sim ✅';
  if (v === 'false' || v === false) return 'Não ❌';
  return null;
}

function formatExpiry(s) {
  if (!s) return null;
  // "2026-6-25-23-55" → "25/06/2026 às 23:55"
  const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[3].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[1]} às ${m[4].padStart(2,'0')}:${m[5].padStart(2,'0')}`;
  return s;
}

module.exports = { formatForWhatsApp };
