#!/usr/bin/env node
/**
 * DARK BOT — .pack (trocar nome/autor/slogan/link do pack)
 *
 * Cobre:
 *   • helpers puros: parseSub, isOnOff, limpar, packStatusText
 *   • roteamento do case com ambiente simulado (BD/cache/wm falsos):
 *     status, nome (grupo e global), autor, slogan, on/off, visivel,
 *     permissões (admin vs dono), link inválido, subcomando desconhecido.
 *
 * Uso: node scripts/test-pack.js
 */
'use strict';

process.env.OWNER_NUMBER = '244945280380';
process.env.BOT_PREFIX = '.';

const path = require('path');
const Module = require('module');
const orig = Module.prototype.require;
// O case lê ../../config ao montar o estado; isola o teste sem depender do .env.
const configPath = path.join(__dirname, '..', 'src', 'config.js');
require.cache[configPath] = { id: configPath, filename: configPath, loaded: true, exports: { bot: { name: 'DARK BOT' }, owner: { name: 'Dark Net' } } };

// ── Fakes ──────────────────────────────────────────────────────────
const STORE = {}; // BotConfig + cache partilhados

const fakeBcc = {
  get: async (k, d) => (k in STORE ? STORE[k] : d),
  set: async (k, v) => { STORE[k] = v; },
  clear: () => {},
};

const fakeBotConfig = {
  set: async (k, v) => { STORE[k] = v; },
  get: async (k, d) => (k in STORE ? STORE[k] : d),
};

const fakeStickerPack = {
  async sendLastPack() { return { ok: true, pack: { name: 'Pack de Teste' } }; },
  async sendPackOffer() { return false; },
};

const fakeWm = {
  _groups: new Map(),
  _global: {
    packName: 'Dark Net Ao', channelName: '', authorName: 'Dark Net Ao', brand: 'Dark Net Ao',
    channelUrl: '', androidStoreUrl: '', iosStoreUrl: '', slogan: '', theme: 'darktoxic',
    visibleWatermark: false, watermarkText: 'Dark Net Ao',
  },
  async getGlobalDefault() { return { ...this._global }; },
  async resolvePack(jid) { return this._groups.get(jid) || { ...this._global, enabled: false }; },
  validateStoreUrl(url, platform) {
    try {
      const u = new URL(url);
      const ok = platform === 'android' ? ['play.google.com', 'www.amazon.com'].includes(u.hostname) : ['apps.apple.com', 'itunes.apple.com'].includes(u.hostname);
      return u.protocol === 'https:' && ok ? u.toString() : '';
    } catch { return ''; }
  },
  async verifyStoreUrl(url, platform) { return this.validateStoreUrl(url, platform) ? { url, platform, status: 200 } : null; },
  async getForJid(jid) { return this._groups.get(jid) || null; },
  async saveForJid(jid, data) {
    const prev = this._groups.get(jid) || {};
    const next = {
      enabled: data.enabled !== false,
      brand: data.brand !== undefined ? data.brand : (prev.brand || 'Dark Net Ao'),
      slogan: data.slogan !== undefined ? data.slogan : (prev.slogan || ''),
      channelUrl: data.channelUrl !== undefined ? data.channelUrl : (prev.channelUrl || ''),
      channelName: data.channelName !== undefined ? data.channelName : (prev.channelName || ''),
      androidStoreUrl: data.androidStoreUrl !== undefined ? data.androidStoreUrl : (prev.androidStoreUrl || ''),
      iosStoreUrl: data.iosStoreUrl !== undefined ? data.iosStoreUrl : (prev.iosStoreUrl || ''),
      theme: data.theme !== undefined ? data.theme : (prev.theme || 'darktoxic'),
      visibleWatermark: data.visibleWatermark !== undefined ? data.visibleWatermark : (prev.visibleWatermark || false),
      linkType: data.linkType !== undefined ? data.linkType : (prev.linkType || ''),
    };
    next.packName = next.channelName || next.brand;
    next.authorName = next.brand;
    this._groups.set(jid, next);
    return next;
  },
  async clearForJid(jid) { this._groups.set(jid, { enabled: false, channelUrl: '' }); return null; },
  async saveGlobalDefault(data = {}) {
    const prev = this._global;
    const brand = data.brand ?? prev.brand ?? 'Dark Net Ao';
    const channelName = data.channelName ?? data.packName ?? prev.channelName ?? '';
    const authorName = data.authorName ?? brand;
    this._global = {
      ...prev,
      brand,
      channelName,
      packName: channelName || brand,
      authorName,
      channelUrl: data.link ?? data.channelUrl ?? data.packUrl ?? prev.channelUrl ?? '',
      slogan: data.slogan ?? prev.slogan ?? '',
      androidStoreUrl: data.androidStoreUrl ?? prev.androidStoreUrl ?? '',
      iosStoreUrl: data.iosStoreUrl ?? prev.iosStoreUrl ?? '',
      theme: data.theme ?? prev.theme ?? 'darktoxic',
      visibleWatermark: data.visibleWatermark ?? prev.visibleWatermark ?? false,
      watermarkText: data.watermarkText ?? (prev.watermarkText === prev.brand ? brand : prev.watermarkText),
    };
    Object.assign(STORE, {
      sticker_pack_name: this._global.packName,
      sticker_pack_channel_name: channelName,
      sticker_author_name: authorName,
      sticker_pack_brand: brand,
      sticker_pack_url: this._global.channelUrl,
      sticker_wm_slogan: this._global.slogan,
      sticker_visible_watermark: this._global.visibleWatermark,
      sticker_watermark_text: this._global.watermarkText,
      sticker_pack_theme: this._global.theme,
      sticker_pack_android_store_url: this._global.androidStoreUrl,
      sticker_pack_ios_store_url: this._global.iosStoreUrl,
    });
    return { ...this._global };
  },
  async resolveAnyLink(text) {
    const t = String(text || '');
    if (t.includes('channel/')) return { type: 'channel', url: t, name: '' };
    if (t.includes('chat.whatsapp.com')) return { type: 'group', url: t, name: '' };
    return null;
  },
  statusText(saved, p) {
    return saved?.enabled ? 'PACK ACTIVO' : 'PACK OFF';
  },
};

Module.prototype.require = function (id) {
  if (typeof id === 'string' && id.endsWith('botConfigCache')) return fakeBcc;
  if (typeof id === 'string' && /models[/\\]BotConfig$/.test(id)) return fakeBotConfig;
  if (typeof id === 'string' && id.endsWith('stickerWm')) return fakeWm;
  if (typeof id === 'string' && id.endsWith('stickerPack')) return fakeStickerPack;
  return orig.apply(this, arguments);
};

const packModule = require(path.join(__dirname, '..', 'src', 'bot', 'cases', 'pack'));

let handler = null;
let packBotHandler = null;
let packViewHandler = null;
packModule((cmds, fn) => {
  const names = [].concat(cmds);
  if (names.some(c => c === 'pack' || c === 'pacote')) handler = fn;
  if (names.includes('packbot')) packBotHandler = fn;
  if (names.includes('packview')) packViewHandler = fn;
});

let ok = 0, fail = 0;
const t = (n, c, e) => { e = e || ''; c ? ok++ : fail++; console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (e ? ' → ' + String(e).slice(0, 90) : '')); };

// ── Invocador do handler ──────────────────────────────────────────
function ctxFactory({ isOwner = true, isGroup = false, admin = false } = {}) {
  const out = [];
  const ctx = {
    remoteJid: isGroup ? '120363000000@g.us' : '244945280380@s.whatsapp.net',
    isGroup,
    isOwner,
    senderNumber: isOwner ? '244945280380' : '244900000000',
    pushName: isOwner ? 'Dark' : 'User',
    groupName: isGroup ? 'Grupo Teste' : 'PV',
    groupMeta: null,
  };
  const sock = { sendMessage: async () => ({}) };
  return {
    ctx, sock,
    reply: async (text) => { out.push(text); return text; },
    react: async () => {},
    isAdminFn: async () => admin,
    args: (arr) => ({ sock, ctx, args: arr, prefix: '.', reply: async (text) => { out.push(text); return text; }, react: async () => {}, isOwner, isAdminFn: async () => admin }),
    out,
  };
}

(async () => {
  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 1. Helpers puros ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const H = packModule;
    t('parseSub simples', JSON.stringify(H.parseSub(['nome', 'Dark Pack'])) === JSON.stringify({ global: false, sub: 'nome', value: 'Dark Pack' }), JSON.stringify(H.parseSub(['nome', 'Dark Pack'])));
    t('parseSub global', JSON.stringify(H.parseSub(['global', 'nome', 'X'])) === JSON.stringify({ global: true, sub: 'nome', value: 'X' }), JSON.stringify(H.parseSub(['global', 'nome', 'X'])));
    t('parseSub vazio', JSON.stringify(H.parseSub([])) === JSON.stringify({ global: false, sub: '', value: '' }), JSON.stringify(H.parseSub([])));
    t('isOnOff on', H.isOnOff('on') === 'on' && H.isOnOff('SIM') === 'on' && H.isOnOff('1') === 'on', '');
    t('isOnOff off', H.isOnOff('off') === 'off' && H.isOnOff('não') === 'off' && H.isOnOff('0') === 'off', '');
    t('isOnOff nulo', H.isOnOff('banana') === null, String(H.isOnOff('banana')));
    t('limpar corta espaços', H.limpar('  Dark   Pack  ') === 'Dark Pack', H.limpar('  Dark   Pack  '));
    const st = H.packStatusText('.', { enabled: true, visible: false, packName: 'DARK BOT', author: 'Dark Net', text: 'DARK BOT' }, null, false);
    t('status global monta texto', st.includes('DARK BOT') && st.includes('Dark Net') && st.includes('Global'), st.slice(0, 40));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 2. Roteamento: status ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const { args, out } = ctxFactory({ isOwner: true });
    await handler(args([]));
    t('Status sem argumentos responde', out.length === 1 && out[0].includes('PACOTE DARK NET AO'), (out[0] || '').slice(0, 30));

    const g = ctxFactory({ isOwner: true, isGroup: true });
    await handler(g.args(['status']));
    t('Status em grupo responde', g.out[0].includes('Este grupo'), (g.out[0] || '').slice(0, 60));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 3. Nome (global vs grupo) ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    // Dono no PV → global
    const pv = ctxFactory({ isOwner: true });
    await handler(pv.args(['nome', 'DARK PACK 2']));
    t('Dono no PV: nome → global', STORE.sticker_pack_name === 'DARK PACK 2', String(STORE.sticker_pack_name));

    // Dono no grupo → grupo
    const grp = ctxFactory({ isOwner: true, isGroup: true });
    await handler(grp.args(['nome', 'Pack do Grupo']));
    t('Dono no grupo: nome → grupo', fakeWm._groups.get(grp.ctx.remoteJid)?.channelName === 'Pack do Grupo', String(fakeWm._groups.get(grp.ctx.remoteJid)?.channelName));

    // global explícito
    await handler(pv.args(['global', 'nome', 'GLOBAL PACK']));
    t('global nome → global', STORE.sticker_pack_name === 'GLOBAL PACK', String(STORE.sticker_pack_name));

    // sem valor → pede valor
    const pv2 = ctxFactory({ isOwner: true });
    await handler(pv2.args(['nome']));
    t('nome sem valor pede uso', (pv2.out[0] || '').includes('Usa'), (pv2.out[0] || '').slice(0, 30));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 4. Autor / slogan / texto ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const pv = ctxFactory({ isOwner: true });
    await handler(pv.args(['autor', 'Dark Net Oficial']));
    t('autor global', STORE.sticker_author_name === 'Dark Net Oficial', String(STORE.sticker_author_name));

    await handler(pv.args(['slogan', 'O melhor do mundo']));
    t('slogan global', STORE.sticker_wm_slogan === 'O melhor do mundo', String(STORE.sticker_wm_slogan));

    await handler(pv.args(['texto', 'DARK BOT']));
    t('texto visível global', STORE.sticker_watermark_text === 'DARK BOT', String(STORE.sticker_watermark_text));

    const grp = ctxFactory({ isOwner: true, isGroup: true });
    await handler(grp.args(['marca', 'MARCA GRUPO']));
    t('marca no grupo → brand', fakeWm._groups.get(grp.ctx.remoteJid)?.brand === 'MARCA GRUPO', String(fakeWm._groups.get(grp.ctx.remoteJid)?.brand));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 5. Atalho global owner-only ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const owner = ctxFactory({ isOwner: true, isGroup: true });
    await packBotHandler(owner.args(['nome', 'PACK BOT']));
    t('packbot nome força o default global', STORE.sticker_pack_name === 'PACK BOT', String(STORE.sticker_pack_name));
    await packBotHandler(owner.args(['autor', 'Autor do Bot']));
    t('packbot autor actualiza autor global', STORE.sticker_author_name === 'Autor do Bot', String(STORE.sticker_author_name));
    await packBotHandler(owner.args(['descricao', 'Descrição do pack']));
    t('packbot descricao actualiza slogan global', STORE.sticker_wm_slogan === 'Descrição do pack', String(STORE.sticker_wm_slogan));

    const other = ctxFactory({ isOwner: false, isGroup: true, admin: true });
    await packBotHandler(other.args(['nome', 'NÃO PODE']));
    t('packbot é owner-only inclusive para admin', STORE.sticker_pack_name === 'PACK BOT' && (other.out[0] || '').includes('Dono'), (other.out[0] || '').slice(0, 50));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 6. on/off + visivel ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const pv = ctxFactory({ isOwner: true });
    await handler(pv.args(['off']));
    t('off global → desliga marca', STORE.sticker_watermark_enabled === false, String(STORE.sticker_watermark_enabled));
    await handler(pv.args(['on']));
    t('on global → liga marca', STORE.sticker_watermark_enabled === true, String(STORE.sticker_watermark_enabled));

    await handler(pv.args(['visivel', 'on']));
    t('visivel on', STORE.sticker_visible_watermark === true, String(STORE.sticker_visible_watermark));
    await handler(pv.args(['visivel', 'off']));
    t('visivel off', STORE.sticker_visible_watermark === false, String(STORE.sticker_visible_watermark));

    const pv2 = ctxFactory({ isOwner: true });
    await handler(pv2.args(['visivel']));
    t('visivel sem valor pede on/off', (pv2.out[0] || '').includes('on'), (pv2.out[0] || '').slice(0, 30));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 7. Permissões ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const adm = ctxFactory({ isOwner: false, isGroup: true, admin: true });
    await handler(adm.args(['nome', 'Pack Admin']));
    t('Admin de grupo muda o pack do grupo', fakeWm._groups.get(adm.ctx.remoteJid)?.channelName === 'Pack Admin', String(fakeWm._groups.get(adm.ctx.remoteJid)?.channelName));

    const adm2 = ctxFactory({ isOwner: false, isGroup: true, admin: true });
    await handler(adm2.args(['global', 'nome', 'X']));
    t('Admin NÃO muda o global', (adm2.out[0] || '').includes('Dono'), (adm2.out[0] || '').slice(0, 30));

    const naoAdm = ctxFactory({ isOwner: false, isGroup: true, admin: false });
    await handler(naoAdm.args(['nome', 'X']));
    t('Não-admin é barrado', (naoAdm.out[0] || '').includes('Dono') || (naoAdm.out[0] || '').includes('Admins'), (naoAdm.out[0] || '').slice(0, 40));

    const pvNaoDono = ctxFactory({ isOwner: false, isGroup: false });
    await handler(pvNaoDono.args(['nome', 'X']));
    t('Não-dono no PV é barrado', (pvNaoDono.out[0] || '').includes('Dono'), (pvNaoDono.out[0] || '').slice(0, 40));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 8. Pacote completo no fluxo principal ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const pv = ctxFactory({ isOwner: false });
    await packViewHandler({ ...pv.args([]), msg: { key: { id: 'm1' } } });
    t('packview reenvia o pack da conversa', (pv.out[0] || '').includes('Pack de Teste'), (pv.out[0] || '').slice(0, 60));
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n╔═══ 9. Link + subcomando desconhecido ═══╗');
  // ══════════════════════════════════════════════════════════
  {
    const grp = ctxFactory({ isOwner: true, isGroup: true });
    await handler(grp.args(['link', 'https://whatsapp.com/channel/0029VbDMnJs6buMDAqf2Fq1z']));
    t('link de canal guardado no grupo', (fakeWm._groups.get(grp.ctx.remoteJid)?.channelUrl || '').includes('channel/'), String(fakeWm._groups.get(grp.ctx.remoteJid)?.channelUrl));

    const inv = ctxFactory({ isOwner: true });
    await handler(inv.args(['link', 'isto nao e um link']));
    t('link inválido recusado', (inv.out[0] || '').includes('confirmar'), (inv.out[0] || '').slice(0, 50));

    const desc = ctxFactory({ isOwner: true });
    await handler(desc.args(['batata']));
    t('subcomando desconhecido', (desc.out[0] || '').includes('desconhecido'), (desc.out[0] || '').slice(0, 40));
  }

  console.log('\n───────────────────────────────');
  console.log((fail === 0 ? '✅' : '❌') + ` ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('💥 Erro no teste:', e);
  process.exit(1);
});
