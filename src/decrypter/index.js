const ehi = require('./formats/ehi');
const hat = require('./formats/hat');
const npv = require('./formats/npv');
const darktunnel = require('./formats/darktunnel');
const tlstunnel = require('./formats/tlstunnel');
const openvpn = require('./formats/openvpn');
const ssh = require('./formats/ssh');
const jsonFormat = require('./formats/json');

/**
 * MASTER DECRYPTER CORE
 * Ignora travas de segurança e extrai dados brutos de configurações VPN.
 */
async function decrypt(fileName, buffer) {
  const ext = fileName.split('.').pop().toLowerCase();
  let result = null;

  try {
    switch (ext) {
      case 'ehi':
      case 'ehic':
        result = await ehi.decrypt(buffer);
        break;
      case 'hat':
        result = await hat.decrypt(buffer);
        break;
      case 'npv':
      case 'npv4':
      case 'npv7':
      case 'npv8':
        result = await npv.decrypt(buffer);
        break;
      case 'dark':
      case 'darkt':
        result = await darktunnel.decrypt(buffer);
        break;
      case 'tls':
        result = await tlstunnel.decrypt(buffer);
        break;
      case 'ovpn':
      case 'conf':
        result = await openvpn.decrypt(buffer);
        break;
      case 'ssh':
      case 'ssl':
        result = await ssh.decrypt(buffer);
        break;
      case 'json':
        result = await jsonFormat.decrypt(buffer);
        break;
      default:
        // Tentativa cega: tenta todos os decrypters se a extensão for desconhecida
        result = await blindDecrypt(buffer);
    }

    if (!result) throw new Error('Formato não suportado ou criptografia desconhecida.');

    return {
      success: true,
      fileName,
      format: result.format || ext.toUpperCase(),
      extractedAt: new Date().toISOString(),
      ...result
    };
  } catch (err) {
    throw new Error(`Falha Crítica na Extração: ${err.message}`);
  }
}

async function blindDecrypt(buffer) {
  const formats = [ehi, hat, npv, darktunnel, tlstunnel, jsonFormat];
  for (const f of formats) {
    try {
      const res = await f.decrypt(buffer);
      if (res) return res;
    } catch (e) {}
  }
  return null;
}

module.exports = { decrypt };
