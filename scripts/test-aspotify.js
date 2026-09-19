#!/usr/bin/env node
/**
 * Teste: Spotify 3 níveis (v7.98) 💚
 * spotify/spotify1/sp → BAIXA 48k · spotify2 → MÉDIA 128k · spotify3 → MÁXIMA 320k
 * Nome com lista · links de faixa/playlist/álbum/EP/CD · re-encode de nivel.
 */
'use strict';

process.env.MONGODB_URI = '';
process.env.FFMPEG_PATH = '/bin/true';  // qualquer toque FFmpeg real fica fora do teste

const assert = require('assert');
const fs5 = require('fs');
const path5 = require('path');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;

const rec = { getAudio: [], reenc: [], dlSpotify: [], search: [] };
const _listaSel = { chamadas: [] };
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('dl/others') || s.endsWith('/others')) {
    return {
      spotify: async (url) => { rec.dlSpotify.push(url); return { title: 'Musica Zona', author: 'Art Z', url: 'https://cdn.example/z.mp3' }; },
      soundcloud: async () => { throw new Error('fora do escopo'); },
    };
  }
  if (s.endsWith('/dl/helpers') || s.endsWith('dl/helpers')) {
    return {
      systemZoneSpotifySearch: async (q, n) => { rec.search.push([q, n]); return [
        { title: 'Musica A', artist: 'Art A', url: 'https://open.spotify.com/track/AAAAAAA1' },
        { title: 'Musica B', artist: 'Art B', url: 'https://open.spotify.com/track/BBBBBBB2' },
      ]; },
    };
  }
  if (s.endsWith('/mediaHandler') || s.endsWith('mediaHandler')) {
    return {
      fetchBuffer: async () => Buffer.alloc(3000, 7),
      fetchJson: async () => ({}),
      isAudioBytes: () => true,
      cleanThumb: (x) => x,
    };
  }
  if (s.endsWith('/ytdl') || s === '../ytdl' || s.endsWith('bot/ytdl')) {
    return {
      getAudio: async (q, quality) => { rec.getAudio.push([q, quality]); return { title: 'YT: Tema', author: 'Canal', buffer: Buffer.alloc(4000, 9) }; },
      extractAudioFromBuffer: async (buf, bit) => { rec.reenc.push([buf.length, bit]); return Buffer.alloc(5000, 1); },
      searchVideoList: async () => [],
    };
  }
  if (s.endsWith('listaEscolha')) {
    return { mostrar: async (sock, msg, ctx, o) => { _listaSel.chamadas.push(o); return { uso: o }; }, tentarNumero: async () => false, _pendentes: new Map(), _key: () => 'k' };
  }
  return _orig.apply(this, arguments);
};

const tiers = require('../src/bot/spotifyTiers');

const sent = [];
const _logs = [];
const _cl = console.log;
console.log = (...a) => { _logs.push(a.join(' ')); _cl(...a); };
const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k1' } }; },
};
const ctxF = { remoteJid: 'PV@s.whatsapp.net', senderNumber: '2449', isGroup: false, prefix: '!' };
const msgF = { key: { id: 'm1', remoteJid: 'PV@s.whatsapp.net' } };

(async () => {
  console.log('=== Spotify 3 níveis (v7.98) ===');

  // ── 1. Níveis e links ───────────────────────────────────────
  assert.strictEqual(tiers.nivelDoComando('spotify'), 1);
  assert.strictEqual(tiers.nivelDoComando('spotify1'), 1);
  assert.strictEqual(tiers.nivelDoComando('sp'), 1);
  assert.strictEqual(tiers.nivelDoComando('spotify2'), 2);
  assert.strictEqual(tiers.nivelDoComando('spotify3'), 3);
  assert.strictEqual(tiers.NIVEIS[1].bit, '48k', 'nível 1 = 48k');
  assert.strictEqual(tiers.NIVEIS[2].bit, '128k', 'nível 2 = 128k');
  assert.strictEqual(tiers.NIVEIS[3].bit, '320k', 'nível 3 = 320k');

  let p = tiers.parseSpotifyLink('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x');
  assert.deepStrictEqual(p, { tipo: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' });
  p = tiers.parseSpotifyLink('https://open.spotify.com/intl-pt/album/4LH4d3cOWNNsVw41Gqt2kv');
  assert.deepStrictEqual(p, { tipo: 'album', id: '4LH4d3cOWNNsVw41Gqt2kv' });
  p = tiers.parseSpotifyLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
  assert.deepStrictEqual(p.tipo, 'playlist');
  p = tiers.parseSpotifyLink('https://open.spotify.com/episode/6kAsbP8pxwaU2kPibKTuHE');
  assert.deepStrictEqual(p.tipo, 'episode');
  assert.strictEqual(tiers.parseSpotifyLink('https://youtu.be/xyz').tipo, '');
  console.log('✔ níveis (48k/128k/320k) + parsing de links');

  // ── 2. Colecção — caminho spotifydown ───────────────────────
  const col1 = await tiers.colecaoSpotify('https://open.spotify.com/album/ALB1', { tipo: 'album', id: 'ALB1' }, {
    fetchJson: async () => ({ metadata: { name: 'Meu Disco' }, trackList: [
      { title: 'Faixa Um', artists: 'Zeca' }, { title: 'Faixa Dois', artists: 'Zeca' }, { title: 'Faixa Um', artists: 'Zeca' },
    ] }),
    fetchHtml: async () => '',
  });
  assert.strictEqual(col1.nome, 'Meu Disco');
  assert.strictEqual(col1.faixas.length, 2, 'dedupe');
  assert.strictEqual(col1.faixas[0].busca, 'Zeca Faixa Um audio');
  console.log('✔ colecção via spotifydown (com dedupe e busca pronta)');

  // ── 3. Colecção — scrape __NEXT_DATA__ ──────────────────────
  const htmlFake = '<html><head><title>Minha Playlist | Spotify</title></head><body>' +
    '<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({
      props: { pageProps: { state: { data: { entity: { name: 'AfroHits 2024', items: [
        { name: 'Tema Um', artists: [{ profile: { name: 'DJ Alpha' } }], duration: '3:10' },
        { name: 'Tema Dois', artists: [{ profile: { name: 'DJ Beta' } }], duration: '2:55' },
      ] } } } } },
    }) + '</script></body></html>';
  const col2 = await tiers.colecaoSpotify('https://open.spotify.com/playlist/PL99', { tipo: 'playlist', id: 'PL99' }, {
    fetchJson: async () => ({ nada: true }),
    fetchHtml: async () => htmlFake,
  });
  assert.strictEqual(col2.nome, 'AfroHits 2024');
  assert.strictEqual(col2.faixas.length, 2);
  assert.strictEqual(col2.faixas[1].artista, 'DJ Beta');
  assert.ok(['embed.spotify.com', 'open.spotify.com'].includes(col2.fonte), 'a via de página (embed/clássica) capturou');
  console.log('✔ colecção via scrape __NEXT_DATA__ (fallback persistente)');

  // ── 4. Cases: registo + desempacho de uma faixa por nível ───
  const reg = {};
  require('../src/bot/cases/downloads2')((names, fn) => { for (const n of names) reg[n] = fn; });
  assert.ok(reg.spotify && reg.spotify1 && reg.sp && reg.spotify2 && reg.spotify3, '3 níveis registados');

  sent.length = 0; rec.reenc.length = 0;
  await reg.spotify2({ sock: sockF, msg: msgF, ctx: ctxF, args: ['https://open.spotify.com/track/AAAAAAA1'], prefix: '!', reply: async (t) => t, command: 'spotify2' });
  const aud1 = sent.find(c => c.audio);
  assert.ok(aud1, 'spotify2 enviou áudio');
  assert.ok(_logs.some(l => /Spotify · MÉDIA 🎧 \(128k\)/.test(l)), 'rótulo médio no log de envio');
  assert.strictEqual(aud1.audio.length, 5000, 'buffer é o bitwise MÉDIA (re-encode aplicado)');
  assert.strictEqual(rec.reenc.some(([, b]) => b === '128k'), true, 're-encode em 128k correu');

  sent.length = 0; rec.reenc.length = 0; rec.getAudio.length = 0;
  await reg.spotify3({ sock: sockF, msg: msgF, ctx: ctxF, args: ['https://open.spotify.com/track/AAAAAAA1'], prefix: '!', reply: async (t) => t, command: 'spotify3' });
  const aud2 = sent.find(c => c.audio);
  assert.ok(_logs.some(l => /Spotify · MÁXIMA 💎 \(320k\)/.test(l)), 'rótulo máximo no log');
  assert.strictEqual(rec.reenc.some(([, b]) => b === '320k'), true, 're-encode 320k');
  sent.length = 0; rec.reenc.length = 0;
  await reg.spotify({ sock: sockF, msg: msgF, ctx: ctxF, args: ['https://open.spotify.com/track/AAAAAAA1'], prefix: '!', reply: async (t) => t, command: 'spotify' });
  const aud3 = sent.find(c => c.audio);
  assert.ok(_logs.some(l => /Spotify · BAIXA ⚡ \(48k\)/.test(l)), 'rótulo baixo no log');
  assert.strictEqual(rec.reenc.some(([, b]) => b === '48k'), true, 're-encode 48k');
  console.log('✔ faixa única: buffer sempre normalizado para o nível');

  // ── 5. Colecção fim-a-fim (mock do tiers.colecaoSpotify?) ───
  // Forçamos o pd chegar à colecção: monkeypatch via cache
  const tiersMod = require('../src/bot/spotifyTiers');
  const _oldCol = tiersMod.colecaoSpotify;
  tiersMod.colecaoSpotify = async () => ({ nome: 'Discoteca Vibe', faixas: [
    { nome: 'Faixa Um', artista: 'Zeca', busca: 'Zeca Faixa Um audio', ref: '' },
    { nome: 'Faixa Dois', artista: 'Zeca', busca: 'Zeca Faixa Dois audio', ref: '' },
    { nome: 'Faixa Três', artista: 'Zeca', busca: 'Zeca Faixa Três audio', ref: '' },
  ], fonte: 'teste' });
  sent.length = 0; rec.getAudio.length = 0; rec.dlSpotify.length = 0;
  await reg.spotify2({ sock: sockF, msg: msgF, ctx: ctxF, args: ['https://open.spotify.com/album/ALB2'], prefix: '!', reply: async (t) => t, command: 'spotify2' });
  tiersMod.colecaoSpotify = _oldCol;
  const auds = sent.filter(c => c.audio);
  assert.strictEqual(auds.length, 3, '3 faixas entregues');
  const cabeca = sent.find(c => /Discoteca Vibe/.test(c.text || ''));
  assert.ok(cabeca && /MÉDIA 🎧\*? \(128k\)/.test(cabeca.text), 'cartão de cabeçalho com o nível');
  const resumo = sent.find(c => /3\/3\*? enviadas/.test(c.text || ''));
  assert.ok(resumo, 'resumo no fim');
  assert.deepStrictEqual(rec.getAudio.map(a => a[1]), ['128k', '128k', '128k'], 'todas no nível MÉDIA');
  console.log('✔ álbum/playlist enviado com cabeçalho, nível de tier em todas as faixas e resumo');

  // ── 6. Nome → lista faz o pick no nível certo ───────────────
  _listaSel.chamadas.length = 0;
  sent.length = 0; rec.reenc.length = 0;
  await reg.spotify3({ sock: sockF, msg: msgF, ctx: ctxF, args: ['drake', 'hotline', 'bling'], prefix: '!', reply: async (t) => t, command: 'spotify3' });
  assert.strictEqual(_listaSel.chamadas.length, 1, 'lista mostrada');
  const chamada = _listaSel.chamadas[0];
  assert.ok(/MÁXIMA 💎 \(320k\)/.test(chamada.titulo), 'lista anuncia o nível');
  await chamada.aoEscolher({ item: chamada.itens[0] });
  const aud4 = sent.find(c => c.audio);
  assert.ok(aud4, 'audio após pick');
  assert.strictEqual(rec.reenc.some(([, b]) => b === '320k'), true, 'pick no nível MÁXIMA');
  console.log('✔ busca por nome: lista + pick no nível');

  // ── 7. Episódio/podcast bloqueado com jeitinho ──────────────
  const replies = [];
  await reg.spotify2({ sock: sockF, msg: msgF, ctx: ctxF, args: ['https://open.spotify.com/episode/EP1XYZ'], prefix: '!', reply: async (t) => { replies.push(t); return t; }, command: 'spotify2' });
  assert.ok(replies.some(t => /episódio/.test(t) && /playlist\/álbum\/EP\/CD/.test(t)), 'episódio explica');
  console.log('✔ episódio/podcast avisa com clareza');

  // ── 8. Uso sem query → tabela dos níveis ────────────────────
  const rep2 = [];
  await reg.spotify1({ sock: sockF, msg: msgF, ctx: ctxF, args: [], prefix: '!', reply: async (t) => { rep2.push(t); return t; }, command: 'spotify1' });
  assert.ok(/BAIXA ⚡\*? \(48k\)/.test(rep2[0]) && /spotify2/.test(rep2[0]) && /spotify3/.test(rep2[0]), 'uso mostra os 3 níveis');
  console.log('✔ ajuda mostra o mapa dos níveis');

  // ── 9. Estático ─────────────────────────────────────────────
  const d2 = fs5.readFileSync(path5.join(__dirname, '..', 'src', 'bot', 'cases', 'downloads2.js'), 'utf8');
  assert.ok(/extractAudioFromBuffer/.test(d2), 'normalização no case');
  assert.ok(/registerCase\(\['spotify2'\]/.test(d2) && /registerCase\(\['spotify3'\]/.test(d2), 'níveis separados');
  assert.ok(!/\['spotify', 'spotify2'/.test(d2), 'spotify2 já não é alias de spotify');
  const ytdlSrc = fs5.readFileSync(path5.join(__dirname, '..', 'src', 'bot', 'ytdl.js'), 'utf8');
  assert.ok(/extractAudioFromBuffer }/.test(ytdlSrc), 'ytdl exporta o normalizador');
  const sdSrc = fs5.readFileSync(path5.join(__dirname, '..', 'src', 'bot', 'submenuData.js'), 'utf8');
  assert.ok(/spotify1:'downloads'.*spotify3:'downloads'/s.test(sdSrc), 'spotify1/3 no submenu downloads');
  console.log('✔ ganchos e registo correctos');

  console.log('\nOK / test-aspotify — tudo passou (v7.98)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
