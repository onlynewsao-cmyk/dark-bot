const fs = require('fs');
const { decrypt } = require('./index');
const { formatForWhatsApp } = require('./formatter');

async function runForensicAudit() {
  try {
    const buffer = fs.readFileSync('./forensic_sample.ehi');
    const result = await decrypt('TÁ LÁ DJUM⏳️.ehi', buffer);
    const report = formatForWhatsApp(result, { bot: { prefix: '!' } });
    console.log(report);
  } catch (err) {
    console.error('CRITICAL AUDIT ERROR:', err.message);
  }
}

runForensicAudit();
