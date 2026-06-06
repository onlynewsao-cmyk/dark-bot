/**
 * DARK ENGINE BRUTE FORCE MODULE
 * Utilitário para quebra de senhas comuns em arquivos VPN.
 */
const crypto = require('crypto');

const COMMON_PASSWORDS = [
  '1234', '123456', '0000', 'admin', 'password', 'p4ssw0rd', 
  'darkbot', 'free', 'vpn', 'ssh', 'injector', 'hatunnel',
  '2024', '2023', '2022', '2025', '666', '6969'
];

function tryDecryptWithPasswords(encryptedData, decryptFn) {
  for (const pwd of COMMON_PASSWORDS) {
    try {
      const result = decryptFn(encryptedData, pwd);
      if (result) return { result, password: pwd };
    } catch (e) {}
  }
  return null;
}

module.exports = { tryDecryptWithPasswords, COMMON_PASSWORDS };
