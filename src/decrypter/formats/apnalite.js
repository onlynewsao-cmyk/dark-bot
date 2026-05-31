/**
 * APNA Tunnel Lite — Usa MESMA chave do BD Net VPN (mesmo SDK Android)
 * Chave universal: "4%PdXch>fkP]" (12 bytes)
 */
const bdnet = require('./bdnet');

async function parse(input, fileName) {
  let normalizedInput = input;
  if (Buffer.isBuffer(input)) {
    const s = input.toString('utf-8').trim();
    if (s.startsWith('apnalite://') || s.startsWith('apna://')) {
      normalizedInput = Buffer.from(s.replace(/^apnalite:\/\//i, '').replace(/^apna:\/\//i, ''), 'utf-8');
    }
  }

  const result = await bdnet.parse(normalizedInput, fileName);
  result.configType = 'APNA Tunnel Lite';
  result.appName = 'APNA Tunnel Lite';

  if (!result.configName || result.configName === 'BD Net Config') {
    result.configName = fileName?.replace(/\.(apnalite|apna|txt)$/i, '') || 'APNA Lite Config';
  }

  return result;
}

module.exports = { parse };
