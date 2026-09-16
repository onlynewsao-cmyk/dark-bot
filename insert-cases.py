#!/usr/bin/env python3
"""v7.55: insere os cases fantasma antes do `};` final de cada ficheiro."""
import io, sys

INFO_ADD = r'''
  // ── case 'info' (v7.55: estava no menu mas sem implementação) ──
  registerCase(['info', 'botinfo', 'sobre'], async ({ prefix, reply }) => {
    const pkg = require('../../package.json');
    const up = Math.floor(process.uptime());
    const hh = String(Math.floor(up / 3600)).padStart(2, '0');
    const mm = String(Math.floor((up % 3600) / 60)).padStart(2, '0');
    const ss = String(up % 60).padStart(2, '0');
    const ram = (process.memoryUsage().heapUsed / 1048576).toFixed(0);
    return reply(
      `🌑 *${config.bot.name}* — v${pkg.version}\n` +
      `⏱️ Uptime: ${hh}:${mm}:${ss}   🧠 RAM: ${ram} MB\n` +
      `⌨️ Prefixo: \`${prefix}\`   👑 Dono: ${config.owner?.name || 'Dark'}\n\n` +
      `Digita \`${prefix}menu\` para ver tudo.`
    );
  });

  // ── case 'restart' (v7.55: só dono; o host sobe o processo sozinho) ──
  registerCase(['restart', 'reiniciar', 'shutdown'], async ({ isOwner, reply }) => {
    if (!isOwner) return reply('🚫 Só o *dono* pode reiniciar o bot.');
    await reply('♻️ A reiniciar… volto já já. 🌑');
    if (process.env.NODE_ENV === 'test' || process.env.DARK_NO_EXIT === '1') return;
    setTimeout(() => process.exit(1), 1200);
  });
'''

PREMIUM_ADD = r'''
  // ── blacklist (v7.55: estava no menu do dono mas sem implementação) ──
  registerCase(['blacklist', 'banuser'], async ({ m, args, isOwner }) => {
    if (!isOwner) return m.reply('🚫 Só o *dono*.');
    const num = String(args[0] || '').replace(/\D/g, '');
    const list = (await botConfigCache.get('blacklist', [])) || [];
    if (!num) {
      if (!list.length) return m.reply('🚫 Blacklist vazia.\nUso: `!blacklist <número>`');
      return m.reply(`🚫 *Blacklist (${list.length}):*\n${list.map(n => '• ' + n).join('\n')}`);
    }
    if (!list.map(String).includes(num)) {
      list.push(num);
      await botConfigCache.set('blacklist', list);
    }
    return m.reply(`🚫 *${num}* bloqueado do bot.`);
  });

  registerCase(['unblacklist', 'desbanir'], async ({ m, args, isOwner }) => {
    if (!isOwner) return m.reply('🚫 Só o *dono*.');
    const num = String(args[0] || '').replace(/\D/g, '');
    if (!num) return m.reply('❌ Uso: `!unblacklist <número>`');
    const list = ((await botConfigCache.get('blacklist', [])) || []).filter(n => String(n) !== num);
    await botConfigCache.set('blacklist', list);
    return m.reply(`✅ *${num}* removido da blacklist.`);
  });

  // ── setpremium (v7.55: estava no menu do dono mas sem implementação) ──
  registerCase(['setpremium', 'darpremium'], async ({ m, args, isOwner }) => {
    if (!isOwner) return m.reply('🚫 Só o *dono*.');
    const num = String(args[0] || '').replace(/\D/g, '');
    const dias = Math.max(1, parseInt(args[1], 10) || 30);
    if (!num || num.length < 9) return m.reply('❌ Uso: `!setpremium <número> [dias]`\nEx: `!setpremium 244923456789 30`');
    const User = require('../../database/models/User');
    const u = await User.findOne({ whatsappNumber: num });
    if (!u) return m.reply('❌ Utilizador não encontrado. Ele precisa falar com o bot primeiro.');
    u.role = 'premium';
    u.premiumUntil = new Date(Date.now() + dias * 86400000);
    await u.save();
    try { require('../hotCache').forgetUser(num); } catch {}
    return m.reply(`⭐ *${num}* agora é Premium por *${dias} dias*.`);
  });
'''

RANDOM_ADD = r'''
  // ── qrcode (v7.55: estava no menu mas sem implementação) ──
  registerCase(['qrcode', 'qr', 'gerarqr'], async ({ sock, msg, ctx, text, reply }) => {
    const t = String(text || '').trim();
    if (!t) return reply('🔳 Uso: `!qrcode <texto ou link>`');
    if (t.length > 500) return reply('❌ Texto demasiado longo (máx 500 caracteres).');
    try {
      const QR = require('qrcode');
      const buf = await QR.toBuffer(t, { width: 512, margin: 2 });
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: `🔳 QR Code` }, { quoted: msg });
    } catch (e) { return reply('❌ Falha ao gerar QR: ' + (e.message || e)); }
  });

  // ── horóscopo offline (v7.55: estava no menu mas sem implementação) ──
  const SIGNOS = {
    aries: ['21/03–19/04', 'Fogo'], touro: ['20/04–20/05', 'Terra'],
    gemeos: ['21/05–20/06', 'Ar'], cancer: ['21/06–22/07', 'Água'],
    leao: ['23/07–22/08', 'Fogo'], virgem: ['23/08–22/09', 'Terra'],
    libra: ['23/09–22/10', 'Ar'], escorpiao: ['23/10–21/11', 'Água'],
    sagitario: ['22/11–21/12', 'Fogo'], capricornio: ['22/12–19/01', 'Terra'],
    aquario: ['20/01–18/02', 'Ar'], peixes: ['19/02–20/03', 'Água'],
  };
  registerCase(['horoscopo', 'signo', 'zodiaco'], async ({ text, reply }) => {
    const s = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const key = Object.keys(SIGNOS).find(k => s.includes(k));
    if (!key) return reply('🔮 Uso: `!horoscopo <signo>`\nEx: `!horoscopo leão`');
    const day = new Date().toISOString().slice(0, 10);
    let h = 0;
    for (const c of (day + key)) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
    const cores = ['vermelho', 'dourado', 'azul', 'verde', 'roxo', 'preto', 'branco', 'laranja'];
    const humores = ['em alta ⚡', 'equilibrado ⚖️', 'criativo 🎨', 'focado 🎯', 'leve 🍃', 'intenso 🔥'];
    const nome = key[0].toUpperCase() + key.slice(1);
    return reply(`🔮 *${nome}* (${SIGNOS[key][0]})\nElemento: ${SIGNOS[key][1]}\n\n🍀 Sorte: *${h % 100}*\n🎨 Cor: *${cores[h % cores.length]}*\n😌 Humor: *${humores[(h >> 3) % humores.length]}*`);
  });

  // ── decrypt info (v7.55: `decrypt <uri>` já é interceptado no commandHandler;
  // este case responde ao `.decrypt` seco que o menu anuncia) ──
  registerCase(['decrypt', 'vpndec', 'vpninfo'], async ({ args, isOwner, reply }) => {
    const botConfigCache = require('../botConfigCache');
    const sub = String(args[0] || '').toLowerCase();
    if (sub === 'on' || sub === 'off') {
      if (!isOwner) return reply('🚫 Só o *dono*.');
      await botConfigCache.set('auto_decrypt_enabled', sub === 'on');
      return reply(sub === 'on' ? '🔓 Descriptografia automática *ligada*.' : '🔒 Descriptografia automática *desligada*.');
    }
    const auto = await botConfigCache.get('auto_decrypt_enabled', true);
    return reply(
      `🔓 *VPN DECRYPT* — auto: ${auto ? 'ON ✅' : 'OFF ❌'}\n\n` +
      `📁 Envia ficheiro: .ehi .hat .npv4 .ovpn .json .txt…\n` +
      `🔗 Ou cola URI: bdnet:// vmess:// vless:// trojan:// ss:// wyrvpn://…\n` +
      `💡 Ou directo: \`!vpn <uri>\`\n\n` +
      `Descriptografo sozinho quando reconhecer o formato.`
    );
  });
'''

DOWNLOADS2_ADD = r'''
  // ── statusvideo (v7.55: vídeo pronto pro status, ≤30s; VIP por defeito) ──
  registerCase(['statusvideo', 'statusvid', 'stv'], async ({ sock, msg, quoted, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    const qm = quoted?.message || {};
    const quotedMedia = quoted && qm.videoMessage;
    const ownMedia = !quoted && msg.message?.videoMessage;
    try {
      let buf = null;
      if (quotedMedia || ownMedia) {
        const mediaHandler = require('../mediaHandler');
        buf = await mediaHandler.downloadFromMessage(quotedMedia ? quoted.msg : msg);
      } else if (url) {
        const r = await require('../ytdl').getVideo(url, '480');
        buf = r.buffer;
      } else {
        return reply(`📱 Uso: responde a um vídeo com \`${prefix}statusvideo\` ou envia \`${prefix}statusvideo <url>\``);
      }
      if (!buf?.length) throw new Error('vídeo vazio');
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const execFileAsync = require('util').promisify(require('child_process').execFile);
      let ff = 'ffmpeg';
      try { ff = require('ffmpeg-static') || 'ffmpeg'; } catch {}
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-stv-'));
      try {
        const inp = path.join(dir, 'in.mp4');
        const out = path.join(dir, 'status.mp4');
        fs.writeFileSync(inp, buf);
        await execFileAsync(ff, ['-y', '-i', inp, '-t', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out], { timeout: 180000 });
        const outBuf = fs.readFileSync(out);
        if (!outBuf?.length) throw new Error('corte vazio');
        await sock.sendMessage(ctx.remoteJid, { video: outBuf, caption: '📱 Pronto pro status (≤30s)' }, { quoted: msg });
      } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
    } catch (e) { return reply('❌ StatusVideo: ' + (e.message || e)); }
  });
'''

JOBS = [
    ('src/bot/cases/info.js', INFO_ADD),
    ('src/bot/cases/premium.js', PREMIUM_ADD),
    ('src/bot/cases/random.js', RANDOM_ADD),
    ('src/bot/cases/downloads2.js', DOWNLOADS2_ADD),
]

for fp, add in JOBS:
    with io.open(fp, encoding='utf-8') as f:
        src = f.read()
    stripped = src.rstrip()
    assert stripped.endswith('};'), fp
    # não duplicar se já correu
    if 'v7.55' in src:
        print('SKIP (já tem v7.55):', fp)
        continue
    new = stripped[:-2].rstrip() + '\n' + add + '};\n'
    with io.open(fp, 'w', encoding='utf-8') as f:
        f.write(new)
    print('OK:', fp)
