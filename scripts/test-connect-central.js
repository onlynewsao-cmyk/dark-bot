'use strict';
/* Central Connect + proteção de PV Free: regressões sem rede/WhatsApp real. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const handler = require(path.join(root, 'src/bot/commandHandler'));
const botConfigCache = require(path.join(root, 'src/bot/botConfigCache'));
const hotCache = require(path.join(root, 'src/bot/hotCache'));
const prefixEngine = require(path.join(root, 'src/bot/prefixEngine'));
const nativeCommands = require(path.join(root, 'src/bot/nativeCommands'));

async function run() {
  const originalGet = botConfigCache.get;
  const originalSet = botConfigCache.set;
  const originalGetUser = hotCache.getUser;
  const originalDetect = prefixEngine.detect;
  let user = { role: 'free' };
  botConfigCache.get = async (key, fallback) => ({
    owner_numbers: [],
    owner_number: '244900000000',
    owner_lid: '',
  }[key] ?? fallback);
  hotCache.getUser = async () => user;
  prefixEngine.detect = async (text) => {
    const raw = String(text || '').trim();
    return raw.startsWith('!') ? { prefix: '!', rest: raw.slice(1) } : null;
  };
  botConfigCache.set = async (key, value) => value;

  try {
    const freeCtx = { isGroup: false, senderNumber: '244911111111', senderLid: '', remoteJid: '244911111111@s.whatsapp.net' };
    const freeMsg = { key: { remoteJid: freeCtx.remoteJid, fromMe: false } };
    const pvSent = [];
    const pvSock = { user: { id: '244900000099@s.whatsapp.net' }, sendMessage: async (_jid, payload) => { pvSent.push(payload); return {}; } };
    assert.equal(await handler.bloquearPvFreeForaSticker(pvSock, freeMsg, freeCtx, '!play música'), true, 'Free no PV bloqueia comando que não é sticker');
    assert.match(pvSent.at(-1).text, /ACESSO FREE NO PRIVADO/);
    assert.match(pvSent.at(-1).text, /trial de 7 dias/);
    assert.equal(await handler.bloquearPvFreeForaSticker(pvSock, freeMsg, freeCtx, '!fig'), false, 'aliases de criar sticker ficam liberados');
    assert.equal(await handler.bloquearPvFreeForaSticker(pvSock, freeMsg, freeCtx, 'olá Aura'), true, 'texto livre não libera Aura no PV Free');
    assert.match(pvSent.at(-1).text, /ACESSO FREE NO PRIVADO/, 'texto livre também recebe a orientação comercial');
    user = { role: 'premium', premiumUntil: null };
    assert.equal(await handler.bloquearPvFreeForaSticker(pvSock, freeMsg, freeCtx, '!play música'), false, 'VIP mantém acesso completo no PV');
    user = { role: 'free' };

    const replies = [];
    await nativeCommands.pvfree({
      sock: { sendMessage: async (_jid, payload) => replies.push(payload.text) },
      msg: { key: {} }, ctx: { remoteJid: 'owner@s.whatsapp.net', prefix: '!' }, args: ['on'], isOwner: true,
    });
    assert(/POLÍTICA DE PV FREE/.test(replies[0]) && /política é fixa/i.test(replies[0]), '!pvfree explica a política fixa sem alterar o gate');
  } finally {
    botConfigCache.get = originalGet;
    botConfigCache.set = originalSet;
    hotCache.getUser = originalGetUser;
    prefixEngine.detect = originalDetect;
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

  console.log('✅ Gate comercial de PV Free e Central Connect/Failover validados.');
}

run().then(() => process.exit(0)).catch(error => {
  console.error('❌ Teste Connect/PV Free falhou:', error);
  process.exit(1);
});
