const fs = require('fs');
const { decrypt } = require('./index');
const { formatForWhatsApp } = require('./formatter');

async function test() {
  try {
    const buffer = fs.readFileSync('./sample.ehi');
    const result = await decrypt('TÁ LÁ DJUM⏳️.ehi', buffer);
    const formatted = formatForWhatsApp(result, { bot: { prefix: '!' } });
    console.log(formatted);
  } catch (err) {
    console.error('Error during decryption:', err.message);
  }
}

test();
