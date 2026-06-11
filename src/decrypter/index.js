const ehi = require('./formats/ehi');
const hat = require('./formats/hat');
const npv = require('./formats/npv');
const tlstunnel = require('./formats/tlstunnel');
const forensic = require('./engine');

async function decrypt(fileName, buffer) {
  const ext = fileName.split('.').pop().toLowerCase();
  let result = null;

  // 1. Executa Motor Forense Universal (Independente de formato)
  const audit = await forensic.analyze(buffer, fileName);

  try {
    // 2. Tenta extração via Parser específico
    if (ext === 'ehi' || ext === 'ehic') result = await ehi.parse(buffer, fileName);
    else if (ext === 'hat') result = await hat.parse(buffer, fileName);
    else if (ext.startsWith('npv')) result = await npv.parse(buffer, fileName);
    else if (ext === 'tls') result = await tlstunnel.parse(buffer, fileName);
    
    // 3. Mescla dados (O Forensic Engine completa o que o Parser específico não viu)
    return {
      fileName,
      format: ext.toUpperCase(),
      appName: result?.appName || ext.toUpperCase() + ' Client',
      host: result?.host || audit.host,
      port: result?.port || audit.port,
      user: (result?.ssh?.user || result?.user) || audit.user,
      pass: (result?.ssh?.pass || result?.pass) || audit.pass,
      sni: result?.sni || audit.sni,
      payload: result?.payload || audit.payload,
      note: result?.note || audit.note,
      protocol: result?.protocol || audit.protocol,
      entropy: audit.entropy
    };
  } catch (e) {
    // 4. Fallback Forense Total (Se o arquivo estiver muito bloqueado, a perícia bruta assume)
    return audit;
  }
}

module.exports = { decrypt };
