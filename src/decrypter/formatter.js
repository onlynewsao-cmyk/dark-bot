/**
 * Formata os dados descriptografados com identificação de arquitetura.
 * Estilo FORENSE / DEVASTADOR.
 */
function formatForWhatsApp(res, config) {
  const line = '━━━━━━━━━━━━━━━━━━━━';
  
  // Determina a Arquitetura
  let arch = 'SSH Direct / HTTP';
  if (res.sni || res.tlsVersion) arch = 'SSL / TLS (SNI Encryption)';
  if (res.protocol === 'VMESS' || res.protocol === 'VLESS' || res.format === 'NPVT') arch = 'V2Ray Core / Xray (Proxy v2)';
  if (res.mode?.includes('SlowDNS') || res.port === '53') arch = 'DNS Tunneling (SlowDNS)';

  let text = `🔓 *VPN DECRYPTER — DARK ENGINE v6.0*\n`;
  text += `🎯 *Status:* Extração de Camada Concluída\n`;
  text += `${line}\n\n`;

  text += `📦 *ARQUIVO ANALISADO*\n`;
  text += `├ 📂 *Nome:* ${res.fileName}\n`;
  text += `├ 🛠️ *Formato:* ${res.format || 'Desconhecido'}\n`;
  text += `├ 📱 *App:* ${res.appName || 'Indeterminado'}\n`;
  text += `└ 🛡️ *Arquitetura:* ${arch}\n\n`;

  text += `🌐 *INFRAESTRUTURA / SERVIDOR*\n`;
  text += `├ 🖥️ *Host/IP:* \`${res.host || 'Não encontrado'}\`\n`;
  text += `├ 🔌 *Porta:* \`${res.port || '80'}\`\n`;
  if (res.sni) text += `├ 🎯 *SNI/Bug:* \`${res.sni}\`\n`;
  if (res.protocol) text += `├ ⚙️ *Protocolo:* ${res.protocol}\n`;
  if (res.uuid) text += `├ 🆔 *UUID:* \`${res.uuid}\`\n`;
  if (res.path) text += `├ 🚀 *WS Path:* \`${res.path}\`\n`;
  text += `└ 📡 *Proxy:* ${res.proxy?.host ? `\`${res.proxy.host}:${res.proxy.port}\`` : 'Direto'}\n\n`;

  if (res.ssh && (res.ssh.user || res.ssh.pass)) {
    text += `🔐 *CREDENCIAIS EXTRAÍDAS*\n`;
    text += `├ 👤 *Usuário:* \`${res.ssh.user || 'vazio'}\`\n`;
    text += `└ 🔑 *Senha:* \`${res.ssh.pass || 'vazio'}\`\n\n`;
  }

  if (res.payload) {
    text += `📑 *HTTP PAYLOAD (RAW)*\n`;
    text += `\`\`\`${res.payload}\`\`\`\n\n`;
  }

  if (res.note) {
    text += `📝 *NOTA DO CRIADOR:*\n`;
    text += `_"${res.note}"_\n\n`;
  }

  text += `📊 *REDE E SEGURANÇA*\n`;
  text += `├ 🧬 *Cloud Config:* ${res.isCloud ? '✅ Sim (Sincronizada)' : '❌ Não'}\n`;
  text += `└ 🛡️ *Bypass:* Lock-Ignore Ativo (100%)\n\n`;

  text += `${line}\n`;
  text += `⚡ *DARK ENGINE* — _The Dark Side of Automation_`;

  return text;
}

module.exports = { formatForWhatsApp };
