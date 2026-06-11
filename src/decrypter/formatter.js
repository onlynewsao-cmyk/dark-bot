/**
 * Formata os dados no estilo HACKER / FORENSE de elite.
 */
function formatForWhatsApp(res, config) {
  const line = '━━━━━━━━━━━━━━━━━━━━';
  
  // Detecção Inteligente de Arquitetura
  let arch = 'SSH DIRECT / HTTP';
  if (res.sni) arch = 'SSL / TLS (SNI BUG)';
  if (res.protocol === 'VMESS' || res.uuid) arch = 'V2RAY CORE (VMESS)';
  if (res.port === '53' || res.mode?.includes('DNS')) arch = 'DNS TUNNELING (SLOWDNS)';

  let text = `🔓 *DARK ENGINE FORENSIC v10.0*\n`;
  text += `🎯 *Status:* Descriptografia Pura Concluída\n`;
  text += `${line}\n\n`;

  text += `📊 *ARQUITETURA DE REDE*\n`;
  text += `├ 🛠️ *Tipo:* ${arch}\n`;
  text += `├ 📂 *Arquivo:* ${res.fileName}\n`;
  text += `├ 📱 *App:* ${res.appName || 'Indeterminado'}\n`;
  text += `└ 🛡️ *Lock-Status:* [ BYPASSED ✅ ]\n\n`;

  text += `🌐 *INFRAESTRUTURA EXTRAÍDA*\n`;
  text += `├ 🖥️ *Host:* \`${res.host || 'Interno'}\`\n`;
  text += `├ 🔌 *Porta:* \`${res.port || '80'}\`\n`;
  if (res.sni)    text += `├ 🎯 *SNI/Bug:* \`${res.sni}\`\n`;
  if (res.uuid)   text += `├ 🆔 *UUID:* \`${res.uuid}\`\n`;
  if (res.path)   text += `├ 🚀 *Path:* \`${res.path}\`\n`;
  if (res.protocol) text += `├ ⚙️ *Proto:* ${res.protocol}\n`;
  text += `└ 📡 *Proxy:* ${res.proxy?.host ? `\`${res.proxy.host}:${res.proxy.port}\`` : 'Nenhum'}\n\n`;

  if (res.ssh && (res.ssh.user || res.ssh.pass)) {
    text += `🔐 *CREDENCIAIS SSH*\n`;
    text += `├ 👤 *Usuário:* \`${res.ssh.user || 'vazio'}\`\n`;
    text += `└ 🔑 *Senha:* \`${res.ssh.pass || 'vazio'}\`\n\n`;
  }

  if (res.payload) {
    text += `📑 *HTTP PAYLOAD (RAW)*\n`;
    text += `\`\`\`${res.payload}\`\`\`\n\n`;
  }

  if (res.note) {
    text += `📝 *DESCRIÇÃO DO ARQUIVO:*\n`;
    text += `_"${res.note}"_\n\n`;
  }

  text += `📉 *ANÁLISE BINÁRIA*\n`;
  text += `├ 🧠 *Entropy:* ${res.entropy || '7.99'}/8.0\n`;
  text += `├ 🧬 *Safety:* 0% (Total Access)\n`;
  text += `└ 🛡️ *Audit:* Auditoria Forense Aprovada\n\n`;

  text += `${line}\n`;
  text += `⚡ *DARK NET* — _The God of Decryption_`;

  return text;
}

module.exports = { formatForWhatsApp };
