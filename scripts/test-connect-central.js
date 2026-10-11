'use strict';
/* Central Connect + proteção de PV Free: regressões sem rede/WhatsApp real. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const handler = require(path.join(root, 'src/bot/commandHandler'));
const botConfigCache = require(path.join(root, 'src/bot/botConfigCache'));
const hotCache = require(path.join(root, 'src/bot/hotCache'));
const nativeCommands = require(path.join(root, 'src/bot/nativeCommands'));

async function run() {
  const originalGet = botConfigCache.get;
  const originalSet = botConfigCache.set;
  const originalGetUser = hotCache.getUser;
  const settingsWrites = [];
  let enabled = true;
  let user = { role: 'free' };
  botConfigCache.get = async (key, fallback) => ({
    free_pv_silent: enabled,
    owner_numbers: [],
    owner_number: '244900000000',
    owner_lid: '',
  }[key] ?? fallback);
  hotCache.getUser = async () => user;
  botConfigCache.set = async (key, value) => { settingsWrites.push([key, value]); return value; };

  try {
    const freeCtx = { isGroup: false, senderNumber: '244911111111', senderLid: '', remoteJid: '244911111111@s.whatsapp.net' };
    const freeMsg = { key: { remoteJid: freeCtx.remoteJid, fromMe: false } };
    assert.equal(await handler.deveSilenciarFreeNoPv(freeCtx, freeMsg, {}), true, 'Free no PV deve ficar silencioso quando ativo');

    user = { role: 'premium', premiumUntil: null };
    assert.equal(await handler.deveSilenciarFreeNoPv(freeCtx, freeMsg, {}), false, 'Premium continua respondido');

    user = { role: 'free' };
    enabled = false;
    assert.equal(await handler.deveSilenciarFreeNoPv(freeCtx, freeMsg, {}), false, 'Modo desligado não bloqueia Free');

    enabled = true;
    const ownerCtx = { ...freeCtx, senderNumber: '244900000000', remoteJid: '244900000000@s.whatsapp.net' };
    assert.equal(await handler.deveSilenciarFreeNoPv(ownerCtx, { key: { remoteJid: ownerCtx.remoteJid } }, {}), false, 'Dono nunca é silenciado');
    assert.equal(await handler.deveSilenciarFreeNoPv({ ...freeCtx, isGroup: true }, freeMsg, {}), false, 'Grupos não são afetados');

    const replies = [];
    await nativeCommands.pvfree({
      sock: { sendMessage: async (_jid, payload) => replies.push(payload.text) },
      msg: { key: {} }, ctx: { remoteJid: 'owner@s.whatsapp.net', prefix: '!' }, args: ['on'], isOwner: true,
    });
    assert.deepEqual(settingsWrites.at(-1), ['free_pv_silent', true], '!pvfree on deve persistir o modo');
    assert(replies[0].includes('ATIVO'), '!pvfree on deve confirmar ao Dono');
  } finally {
    botConfigCache.get = originalGet;
    botConfigCache.set = originalSet;
    hotCache.getUser = originalGetUser;
  }

  assert.equal(typeof nativeCommands.pvfree, 'function', 'Comando !pvfree deve existir');

  const sidebar = fs.readFileSync(path.join(root, 'src/views/partials/sidebar.ejs'), 'utf8');
  const hrefs = [...sidebar.matchAll(/<a\s+href="([^"]+)"/g)].map(m => m[1]);
  const duplicates = hrefs.filter((href, index) => hrefs.indexOf(href) !== index);
  assert.deepEqual(duplicates, [], 'A barra lateral não pode ter abas duplicadas');
  assert(!hrefs.includes('/dashboard/sessoes'), 'Failover deve estar unificado em Connect, sem aba separada');
  assert(hrefs.includes('/dashboard/connect'), 'A central Connect deve continuar acessível');

  const connectView = fs.readFileSync(path.join(root, 'src/views/dashboard/connect.ejs'), 'utf8');
  assert(connectView.includes('Sessões de reserva / Failover'));
  assert(connectView.includes('/dashboard/connect/failover/adicionar'));
  assert(connectView.includes('/dashboard/connect/status.json'));
  assert(!connectView.includes('refreshCallStatus(true)'));
  assert(!connectView.includes('refreshVoipStatus(true)'));

  const dashboardRoutes = fs.readFileSync(path.join(root, 'src/routes/dashboard.js'), 'utf8');
  assert(dashboardRoutes.includes("res.redirect('/dashboard/connect#failover')"));
  assert(dashboardRoutes.includes("'/connect/failover/adicionar'"));
  assert(dashboardRoutes.includes("'/connect/failover/rodar'"));

  console.log('✅ PV Free silencioso e Central Connect/Failover validados.');
}

run().then(() => process.exit(0)).catch(error => {
  console.error('❌ Teste Connect/PV Free falhou:', error);
  process.exit(1);
});
