/*
 * Integração do VPN Decrypter.
 * Usa uma configuração de exemplo publicada pelo projeto OpenVPN (sem chaves
 * ou credenciais) e passa pelo mesmo POST /api/decrypt usado pelo dashboard.
 */
const assert = require('assert');
const express = require('express');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const decrypter = require(path.join(root, 'src/decrypter'));
const User = require(path.join(root, 'src/database/models/User'));
const DecryptLog = require(path.join(root, 'src/database/models/DecryptLog'));
const apiRoutes = require(path.join(root, 'src/routes/api'));

const upstreamOpenVpn = path.join(root, 'scripts/fixtures/decrypter/openvpn-upstream-client.conf');
const v2boxFixture = path.join(root, 'scripts/fixtures/decrypter/v2box-export.v2box');

async function postFile(baseUrl, filePath, fileName) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)], { type: 'application/octet-stream' }), fileName);
  const response = await fetch(`${baseUrl}/api/decrypt`, { method: 'POST', body: form });
  return { response, body: await response.json() };
}

async function run() {
  const direct = await decrypter.decrypt('openvpn-upstream-client.conf', fs.readFileSync(upstreamOpenVpn));
  assert.equal(direct.configType, 'OpenVPN');
  assert.equal(direct.host, 'my-server-1');
  assert.equal(String(direct.port), '1194');
  assert.equal(direct.success, true);

  const v2box = await decrypter.decrypt('v2box-export.v2box', fs.readFileSync(v2boxFixture));
  assert.equal(v2box.configType, 'Sing-box / V2Box Config');
  assert.equal(v2box.mode, 'vless');
  assert.equal(v2box.host, 'vpn.example.test');
  assert.equal(String(v2box.port), '443');
  assert.equal(v2box.sni, 'edge.example.test');

  // Sem MongoDB: substitutos locais somente para provar a rota do dashboard.
  const originalFindById = User.findById;
  const originalCreate = DecryptLog.create;
  let dashboardUser = { _id: '507f1f77bcf86cd799439011', username: 'premium-test', role: 'premium', isPremium: () => true };
  const logs = [];
  User.findById = async () => dashboardUser;
  DecryptLog.create = async data => { logs.push(data); return data; };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = { user: { id: dashboardUser._id, role: dashboardUser.role, username: dashboardUser.username } };
    next();
  });
  app.use('/api', apiRoutes({}));

  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const port = server.address().port;
    const { response, body } = await postFile(`http://127.0.0.1:${port}`, upstreamOpenVpn, 'openvpn-upstream-client.conf');
    assert.equal(response.status, 200);
    assert.equal(body.configType, 'OpenVPN');
    assert.equal(body.host, 'my-server-1');
    assert.equal(logs.length, 1);
    assert.equal(logs[0].source, 'dashboard');
    assert.deepEqual(Object.keys(logs[0].extracted).sort(), ['configName', 'host', 'mode', 'port']);

    dashboardUser = { _id: '507f1f77bcf86cd799439012', username: 'free-test', role: 'user', isPremium: () => false };
    const denied = await postFile(`http://127.0.0.1:${port}`, upstreamOpenVpn, 'openvpn-upstream-client.conf');
    assert.equal(denied.response.status, 403);
    assert.equal(denied.body.error, 'Recurso Premium');
  } finally {
    await new Promise(resolve => server.close(resolve));
    User.findById = originalFindById;
    DecryptLog.create = originalCreate;
  }

  const view = fs.readFileSync(path.join(root, 'src/views/dashboard/decrypter.ejs'), 'utf8');
  assert(view.includes("fetch('/api/decrypt'"));
  assert(view.includes('.v2box'));
  console.log('✅ Decrypter: OpenVPN upstream real, V2Box e rota do dashboard validados.');
  // Alguns módulos da aplicação inicializam handles auxiliares ao carregar;
  // a rota já foi fechada acima, portanto o teste pode terminar limpo.
  process.exit(0);
}

run().catch(error => {
  console.error('❌ Teste decrypter/dashboard falhou:', error);
  process.exit(1);
});
