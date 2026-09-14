'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — incomingTools (v7.47)                           ║
 * ║   Conversão nativa dos snippets de incoming-cases/:          ║
 * ║   tourl · fakechat · fdc · grok · tiktokphoto · pdf ·        ║
 * ║   upscale/hd/remini · edits/edit/editl · infoff/like ·       ║
 * ║   spotifysearch                                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Regras da conversão (INTEGRATION-PLAN.md):
 *  - contexto nativo (sock, msg, m, quoted, text, args, prefix)
 *  - sem credenciais embutidas (tudo via env com fallback gracioso)
 *  - sem dependências novas (fetch/FormData/Blob nativos do Node 20;
 *    pdfkit é opcional com fallback para .txt)
 *  - timeouts em todas as chamadas externas
 */

const crypto = require('crypto');

// ── helpers de mídia ─────────────────────────────────────────────

function innerMidia(qm) {
  if (!qm) return null;
  return qm.imageMessage || qm.videoMessage || qm.audioMessage ||
         qm.stickerMessage || qm.documentMessage || null;
}

async function baixarMidia(m) {
  const mediaHandler = require('../mediaHandler');
  if (m.quoted?.message && innerMidia(m.quoted.message)) {
    const buf = await mediaHandler.downloadFromMessage(m.quoted.msg);
    return { buf, inner: innerMidia(m.quoted.message), quoted: true };
  }
  const raw = m.msg?.message || {};
  if (innerMidia(raw)) {
    const buf = await mediaHandler.downloadFromMessage(m.msg);
    return { buf, inner: innerMidia(raw), quoted: false };
  }
  return { buf: null, inner: null, quoted: false };
}

function extDe(mime, inner) {
  if (inner?.fileName && /\.[a-z0-9]{2,5}$/i.test(inner.fileName)) {
    return { ext: inner.fileName.split('.').pop().toLowerCase(), name: inner.fileName };
  }
  const mapa = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/3gpp': '3gp',
    'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/opus': 'ogg',
    'application/pdf': 'pdf',
  };
  const ext = mapa[String(mime || '').toLowerCase()] || 'bin';
  return { ext, name: `darkbot-upload.${ext}` };
}

function systemzone() {
  return {
    url: (process.env.SYSTEMZONE_API_URL || 'https://systemzone.store').replace(/\/$/, ''),
    key: process.env.SYSTEMZONE_API_KEY || 'freekey',
  };
}

function zoneKey() {
  return process.env.ZONE_API_KEY || 'freekey';
}

// Nano-banana: seleção de imagens por utilizador (expira em 5 min)
const editSessions = new Map();
function editSession(userId, criar = false) {
  let s = editSessions.get(userId);
  if (!s && criar) { s = { images: [], timer: null }; editSessions.set(userId, s); }
  return s;
}
function editTouch(userId) {
  const s = editSessions.get(userId);
  if (!s) return;
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => editSessions.delete(userId), 5 * 60 * 1000);
  s.timer.unref?.();
}

// ── registo ──────────────────────────────────────────────────────

module.exports = function registerIncomingTools(registerCase) {

  // ═══ tourl — mídia → URL (port de "Tool - TO URL", sem API key) ═══
  registerCase(['tourl'], async ({ m, msg }) => {
    let midia;
    try {
      midia = await baixarMidia(m);
    } catch (e) {
      return m.reply('❌ Não consegui baixar a mídia.');
    }
    if (!midia.buf?.length) {
      return m.reply('🔗 Responde a uma *imagem, vídeo, áudio ou documento* com este comando para gerar um link.');
    }
    if (midia.buf.length > 100 * 1024 * 1024) return m.reply('❌ Mídia demasiado grande (máx. 100 MB).');
    const mime = midia.inner?.mimetype || 'application/octet-stream';
    const { name } = extDe(mime, midia.inner);
    m.react('⏳');
    // 1) catbox.moe (sem key) 2) 0x0.st (sem key)
    const tentativas = [
      async () => {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', new Blob([midia.buf], { type: mime }), name);
        const r = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST', body: form, signal: AbortSignal.timeout(90000),
        });
        const t = (await r.text()).trim();
        if (!/^https?:\/\//i.test(t)) throw new Error('catbox: ' + t.slice(0, 60));
        return t;
      },
      async () => {
        const form = new FormData();
        form.append('file', new Blob([midia.buf], { type: mime }), name);
        const r = await fetch('https://0x0.st', {
          method: 'POST', body: form, signal: AbortSignal.timeout(90000),
        });
        const t = (await r.text()).trim();
        if (!/^https?:\/\//i.test(t)) throw new Error('0x0: ' + t.slice(0, 60));
        return t;
      },
    ];
    for (const up of tentativas) {
      try {
        const url = await up();
        m.react('✅');
        return m.reply(`🔗 *TO URL*\n\n${url}\n\n📦 ${(midia.buf.length / 1024).toFixed(0)} KB • ${mime}`);
      } catch {}
    }
    m.react('❌');
    return m.reply('❌ Falha ao enviar para os hosts gratuitos. Tenta novamente.');
  });

  // ═══ fakechat — resposta com quote falso (port de "fakemsg por quoted") ═══
  registerCase(['fakechat'], async ({ m, sock, msg, text, prefix, command }) => {
    if (!text || !text.includes('|')) {
      return m.reply(`*Formato incorreto!*\n\n📌 Exemplo:\n${prefix + command} mensagem fake|resposta\n\n💡 *Responde à mensagem de alguém para usar!*`);
    }
    const partes = text.split('|');
    const textoFake = partes[0]?.trim();
    const resposta = partes.slice(1).join('|').trim();
    if (!textoFake || !resposta) {
      return m.reply(`*Preenche tudo corretamente!*\n\n📌 Exemplo:\n${prefix + command} mensagem fake|resposta`);
    }
    if ([prefix, '-', '/', '#', '+', '.', '!'].some(p => p && resposta.startsWith(p))) {
      return m.reply('*Não é permitido fazer o bot enviar comandos no fake chat.*');
    }
    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctxInfo?.participant || ctxInfo?.stanzaId === msg.key?.id) {
      return m.reply('*Responde à mensagem de alguém para usar este comando!*');
    }
    try {
      m.react('🎭');
      const msgId = 'BAE5' + crypto.randomBytes(13).toString('hex').toUpperCase();
      await sock.sendMessage(m.chat, { text: resposta }, {
        quoted: {
          key: { fromMe: false, remoteJid: m.chat, participant: ctxInfo.participant, id: msgId },
          message: { conversation: textoFake },
        },
      });
      m.react('✅');
    } catch (e) {
      console.error('[fakechat]', e.message?.slice(0, 80));
      m.react('❌');
      return m.reply('*Erro ao criar fake chat.*');
    }
  });

  // ═══ fdc — fatos desconhecidos (zone.api.br + fallback offline) ═══
  const FATOS_OFFLINE = [
    ['O polvo tem três corações', 'Dois param de bater quando ele nada — por isso prefere rastejar.'],
    ['O mel nunca estraga', 'Arqueólogos provaram mel de 3000 anos encontrado em tumbas egípcias.'],
    ['Bananas são radioativas', 'Contêm potássio-40. Existe até a unidade "dose equivalente banana".'],
    ['Polvos têm sangue azul', 'Usam cobre (hemocianina) em vez de ferro para transportar oxigénio.'],
    ['A Lua afasta-se da Terra', 'Cerca de 3,8 cm por ano. Daqui a milhões de anos o dia terá mais horas.'],
    ['Tubarões existiam antes das árvores', 'Tubarões: ~450M anos. Árvores: ~350M anos.'],
    ['O teu corpo produz células novas', ' Produzes cerca de 25 milhões de células novas por segundo.'],
    ['Vénus gira ao contrário', 'É o único planeta que roda no sentido horário visto de cima.'],
  ];
  registerCase(['fdc', 'fatos', 'curiosidade'], async ({ m, sock, msg }) => {
    m.react('🤔');
    try {
      const axios = require('axios');
      const { data } = await axios.get('https://zone.api.br/api/fatosdesconhecidos', { timeout: 25000 });
      const res = data?.resultado;
      if (!data?.status || !res) throw new Error('API sem dados');
      const legenda = `╔━᳀『 *FATOS DESCONHECIDOS* 』═᳀\n\n⌬ *${res.titulo || 'Curiosidade'}*\n\n${res.conteudo || ''}\n\n╚━═━═━═━═━═━═━═━═━═᳀`;
      if (res.imagem) {
        await sock.sendMessage(m.chat, { image: { url: res.imagem }, caption: legenda }, { quoted: msg });
      } else {
        await m.reply(legenda);
      }
      m.react('☝️');
    } catch (e) {
      const [titulo, conteudo] = FATOS_OFFLINE[Math.floor(Math.random() * FATOS_OFFLINE.length)];
      await m.reply(`╔━᳀『 *FATOS DESCONHECIDOS* (offline) 』═᳀\n\n⌬ *${titulo}*\n\n${conteudo}\n\n╚━═━═━═━═━═━═━═━═━═᳀`);
      m.react('☝️');
    }
  });

  // ═══ grok — IA Grok via zone.api.br, fallback IA nativa ═══
  registerCase(['grok'], async ({ m, sock, msg, text, prefix, command }) => {
    if (!text) return m.reply(`Uso: ${prefix}${command} <pergunta>\nOu com imagem: ${prefix}${command} <pergunta> | <url da imagem>`);
    const partes = text.split('|').map(p => p.trim());
    const pergunta = partes[0];
    const imagemUrl = partes[1] || null;
    if (!pergunta) return m.reply(`Uso: ${prefix}${command} <pergunta>`);
    m.react('🤔');
    try {
      const axios = require('axios');
      const params = { apikey: zoneKey(), text: pergunta };
      if (imagemUrl) params.image = imagemUrl;
      const { data } = await axios.get('https://zone.api.br/api/ia/grok-4-5', { params, timeout: 60000 });
      if (data?.status && data?.text) {
        await sock.sendMessage(m.chat, { text: String(data.text).slice(0, 4000) }, { quoted: msg });
        m.react('✅');
        return;
      }
      throw new Error('API sem resposta');
    } catch (e) {
      console.error('[grok] API falhou, fallback nativo:', e.message?.slice(0, 60));
    }
    try {
      const ai = require('../ai');
      const r = await ai.chat(pergunta, 'Responde em português, direto e útil.', {}, true);
      const out = typeof r === 'string' ? r : (r?.text || r?.reply || '');
      if (!out) throw new Error('IA sem resposta');
      await sock.sendMessage(m.chat, { text: `🤖 *Grok (fallback DARK)*\n\n${String(out).slice(0, 4000)}` }, { quoted: msg });
      m.react('✅');
    } catch (e2) {
      m.react('❌');
      return m.reply('❌ Erro no Grok. Tenta novamente.');
    }
  });

  // ═══ tiktokphoto — efeito photooxy TikTok (systemzone, key via env) ═══
  registerCase(['tiktokphoto', 'photooxytiktok'], async ({ m, sock, msg, text, prefix, command }) => {
    if (!text) {
      return m.reply(`🎵 *PHOTO OXY TIKTOK*\n\nUso:\n${prefix + command} texto grande|texto pequeno\n\nExemplo:\n${prefix + command} Gzee|Scripts`);
    }
    const [large, small] = text.split('|').map(s => s?.trim());
    if (!large || !small) return m.reply('❌ Usa o formato:\nTexto grande|Texto pequeno');
    m.react('🎵');
    try {
      const axios = require('axios');
      const sz = systemzone();
      const { data } = await axios.get(
        `${sz.url}/api/photooxy/tiktok?apikey=${encodeURIComponent(sz.key)}&text1=${encodeURIComponent(large)}&text2=${encodeURIComponent(small)}`,
        { timeout: 60000 }
      );
      if (!data?.status || !data?.imagem) throw new Error('API sem imagem');
      await sock.sendMessage(m.chat, {
        image: { url: data.imagem },
        caption: `🎵 *PHOTO OXY TIKTOK*\n\n🔰 Texto principal: ${large}\n🔹 Texto secundário: ${small}`,
      }, { quoted: msg });
      m.react('✅');
    } catch (e) {
      console.error('[tiktokphoto]', e.message?.slice(0, 80));
      m.react('❌');
      return m.reply('❌ Erro ao criar TikTok.');
    }
  });

  // ═══ pdf — IA gera conteúdo → PDF (pdfkit opcional, fallback .txt) ═══
  registerCase(['pdf', 'criarpdf', 'gerarpdf'], async ({ m, sock, msg, text }) => {
    if (!text?.trim()) {
      return m.reply('❌ Diz o que queres transformar em PDF.\n\nExemplo:\n.pdf Cria um currículo para João, 20 anos, com experiência em programação');
    }
    m.react('⏳');
    let conteudo;
    try {
      const ai = require('../ai');
      const r = await ai.chat(
        `Gera um documento completo, bem estruturado, em português, sobre: ${text.trim().slice(0, 500)}`,
        'És um redator. Devolve só o conteúdo do documento, sem rodeios.',
        {}, true
      );
      conteudo = (typeof r === 'string' ? r : (r?.text || r?.reply || '')).toString().trim();
      if (!conteudo) throw new Error('IA sem conteúdo');
    } catch (e) {
      m.react('❌');
      return m.reply('❌ Não foi possível gerar o conteúdo.');
    }
    const limpo = conteudo
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/###\s*/g, '')
      .replace(/---+/g, '')
      .replace(/\|/g, ' ')
      .replace(/^\s*[-*]\s*/gm, '• ');
    let PDFDocument = null;
    try { PDFDocument = require('pdfkit'); } catch {}
    try {
      if (!PDFDocument) {
        await sock.sendMessage(m.chat, {
          document: Buffer.from(limpo, 'utf-8'),
          mimetype: 'text/plain',
          fileName: `documento_${Date.now()}.txt`,
          caption: '📄 PDF indisponível neste servidor — segue em TXT.',
        }, { quoted: msg });
        m.react('✅');
        return;
      }
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks = [];
      const pdfBuf = await new Promise((resolve, reject) => {
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.font('Helvetica').fontSize(11).text(limpo, { align: 'left', lineGap: 4 });
        doc.end();
      });
      if (!pdfBuf.length) throw new Error('PDF vazio');
      const nome = `documento_${Date.now()}.pdf`;
      await sock.sendMessage(m.chat, {
        document: pdfBuf, mimetype: 'application/pdf', fileName: nome,
        caption: '📄 PDF gerado com sucesso!',
      }, { quoted: msg });
      m.react('✅');
    } catch (e) {
      console.error('[pdf]', e.message?.slice(0, 80));
      m.react('❌');
      return m.reply('❌ Erro ao criar o PDF.');
    }
  });

  // ═══ upscale/hd/remini — melhorar imagem (vyro.ai, sem key, sem form-data) ═══
  async function upscaleRun(m, sock, msg, method) {
    let midia;
    try { midia = await baixarMidia(m); } catch { midia = { buf: null }; }
    const mime = midia.inner?.mimetype || '';
    if (!midia.buf?.length || !/image\/(jpe?g|png)/.test(mime)) {
      return m.reply(`Responde/envia uma imagem com este comando.\nFormatos: JPEG/PNG (máx. 5 MB)`);
    }
    if (midia.buf.length > 5 * 1024 * 1024) return m.reply('❌ Imagem demasiado grande! Máximo 5 MB.');
    await m.reply('⏳ A processar imagem...');
    m.react('⏳');
    async function enhance(buf, method) {
      const form = new FormData();
      form.append('model_version', '1');
      form.append('image', new Blob([buf], { type: 'image/jpeg' }), 'upscale.jpg');
      const r = await fetch(`https://inferenceengine.vyro.ai/${method}`, {
        method: 'POST',
        headers: { 'User-Agent': 'okhttp/4.9.3' },
        body: form,
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) throw new Error(`vyro ${method}: HTTP ${r.status}`);
      const out = Buffer.from(await r.arrayBuffer());
      if (!out.length) throw new Error('resultado vazio');
      return out;
    }
    try {
      let out;
      try { out = await enhance(midia.buf, method); }
      catch { out = await enhance(midia.buf, 'recolor'); } // fallback do snippet original
      await sock.sendMessage(m.chat, { image: out, caption: '✨ Qualidade melhorada!' }, { quoted: msg });
      m.react('✅');
    } catch (e) {
      console.error('[upscale]', e.message?.slice(0, 80));
      m.react('❌');
      return m.reply('❌ Falha ao processar a imagem. Tenta outra foto.');
    }
  }
  registerCase(['upscale', 'hd', 'remini'], async (c) => upscaleRun(c.m, c.sock, c.msg, 'enhance'));

  // ═══ edits/editl/edit — editor nano-banana (zone.api.br) ═══
  registerCase(['edits'], async ({ m, text, prefix }) => {
    let midia;
    try { midia = await baixarMidia(m); } catch { midia = { buf: null }; }
    if (!midia.buf?.length || !/image/.test(midia.inner?.mimetype || '')) {
      return m.reply(`Marca uma *imagem* para adicionar à seleção!\n\nUso: *${prefix}edits* (marcando uma imagem)\n\nDepois usa *${prefix}edit [prompt]* marcando outra imagem\nou *${prefix}editl* para limpar a seleção.`);
    }
    const userId = String(m.sender || '').split('@')[0].split(':')[0];
    const s = editSession(userId, true);
    if (s.images.length >= 2) {
      return m.reply(`Já tens *${s.images.length} imagens* na seleção (máximo 2).\nUsa *${prefix}editl* para limpar e começar de novo.`);
    }
    s.images.push(midia.buf);
    editTouch(userId);
    m.react('✅');
    return m.reply(
      `╔━᳀『 *Seleção de Imagens* 』═᳀\n` +
      `⌬ *Imagem ${s.images.length} adicionada!*\n` +
      `⌬ Total na seleção: *${s.images.length}/2*\n` +
      `⌬ Expira em *5 minutos* sem uso\n` +
      `╚━═━═━═━═━═━═━═━═━═᳀`
    );
  });

  registerCase(['editl', 'editlimpar'], async ({ m }) => {
    const userId = String(m.sender || '').split('@')[0].split(':')[0];
    const s = editSessions.get(userId);
    if (s?.timer) clearTimeout(s.timer);
    editSessions.delete(userId);
    m.react('🗑️');
    return m.reply('Seleção de imagens limpa!');
  });

  registerCase(['edit', 'editimg', 'aiedit'], async ({ m, sock, msg, text, prefix }) => {
    const userId = String(m.sender || '').split('@')[0].split(':')[0];
    const s = editSession(userId);
    let midia = { buf: null, inner: null };
    try { midia = await baixarMidia(m); } catch {}
    const temCache = s && s.images.length > 0;
    const temImagem = !!(midia.buf?.length && /image/.test(midia.inner?.mimetype || ''));
    if (!temCache && !temImagem) {
      return m.reply(
        `Marca uma *imagem* ou usa *${prefix}edits* para selecionar antes!\n\n` +
        `Uso: *${prefix}edit [prompt]*\nExemplos:\n*${prefix}edit faz ela sorrir*\n*${prefix}edit troca o fundo por praia*`
      );
    }
    const prompt = String(text || '').trim();
    if (!prompt) return m.reply(`Diz o que queres editar!\nExemplo: *${prefix}edit faz ela sorrir*`);
    m.react('🤔');
    let proc = null;
    try { proc = await sock.sendMessage(m.chat, { text: '*A iniciar edição...*' }, { quoted: msg }); } catch {}
    async function progresso(t) {
      if (!proc?.key) return;
      try { await sock.sendMessage(m.chat, { text: t, edit: proc.key }); }
      catch { try { proc = await sock.sendMessage(m.chat, { text: t }); } catch {} }
    }
    try {
      const axios = require('axios');
      const buffers = [];
      if (temCache) buffers.push(...s.images);
      if (temImagem) {
        await progresso('*A extrair imagem marcada...*');
        buffers.push(midia.buf);
      }
      const usadas = buffers.slice(0, 2);
      const ignoradas = buffers.length - usadas.length;
      await progresso(`*A enviar ${usadas.length} imagem(ns)...*${ignoradas > 0 ? `\n_(${ignoradas} extra ignorada(s), limite é 2)_` : ''}`);
      if (s?.timer) clearTimeout(s.timer);
      editSessions.delete(userId);

      const form = new FormData();
      form.append('image', new Blob([usadas[0]], { type: 'image/jpeg' }), 'image1.jpg');
      if (usadas[1]) form.append('image2', new Blob([usadas[1]], { type: 'image/jpeg' }), 'image2.jpg');
      form.append('prompt', prompt);
      const job = await fetch(`https://zone.api.br/api/v2/nano-banana?apikey=${encodeURIComponent(zoneKey())}`, {
        method: 'POST', body: form, signal: AbortSignal.timeout(60000),
      }).then(r => r.json());
      if (!job?.status || !job?.job_id) throw new Error('Falha ao criar o job de edição');
      await progresso(`*A editar com ${usadas.length} imagem(ns)...*`);

      let result = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 4000));
        const { data } = await axios.get('https://zone.api.br/api/v2/nano-banana/status', {
          params: { job_id: job.job_id }, timeout: 15000,
        }).catch(() => ({ data: null }));
        result = data;
        if (result?.estado === 'done' || result?.estado === 'error') break;
      }
      if (result?.estado !== 'done' || !result?.imagem) throw new Error('Sem resultado (tempo esgotado?)');
      await progresso('*Edição concluída! A enviar...*');
      await sock.sendMessage(m.chat, {
        image: { url: result.imagem },
        caption: `╔━᳀『 *DARK EDIT* 』═᳀\n⌬ *Imagens usadas:* ${usadas.length}\n⌬ *Prompt:* ${prompt.slice(0, 200)}\n╚━═━═━═━═━═━═━═━═━═᳀`,
      }, { quoted: msg });
      m.react('😮‍💨');
    } catch (e) {
      console.error('[edit]', e.message?.slice(0, 80));
      m.react('👎');
      return m.reply('Erro ao editar imagem: ' + (e?.message || 'tenta novamente'));
    }
  });

  // ═══ Free Fire — info + likes (nyxlikesff, token via NYX_FF_TOKEN) ═══
  function nyxToken() {
    return process.env.NYX_FF_TOKEN || '';
  }
  registerCase(['infoff', 'ffinfo', 'perfilff'], async ({ m, sock, msg, text, prefix, command }) => {
    const uid = String(text || '').trim();
    if (!uid) return m.reply(`🎮 *INFO FREE FIRE*\n\nUso: ${prefix + command} <UID>\nExemplo: ${prefix + command} 6514303752`);
    if (!/^\d+$/.test(uid)) return m.reply('🫣 Isso não parece um ID válido... usa só números!');
    const token = nyxToken();
    if (!token) return m.reply('⚠️ Serviço Free Fire não configurado.\nO dono precisa definir *NYX_FF_TOKEN* no servidor.');
    m.react('⏳');
    try {
      const axios = require('axios');
      const { data } = await axios.get('https://nyxlikesff.store/info', {
        params: { uid, token }, timeout: 25000,
      });
      if (data?.status === 'erro') {
        m.react('❌');
        return m.reply(`💔 *Não consegui consultar...*\n\n_${data.mensagem || data.message || 'Algo correu mal.'}_`);
      }
      const fmt = (n) => Number(n ?? 0).toLocaleString('pt-BR');
      await m.reply(
        `🦊 *PERFIL DO JOGADOR* 🦊\n━━━━━━━━━━━━━━━━\n\n` +
        `👤 *Jogador:* ${data.nickname || 'Desconhecido'}\n` +
        `🆔 *ID:* ${data.id || uid}\n` +
        `⭐ *Nível:* ${data.level ?? '?'}\n` +
        `💖 *Likes:* ${fmt(data.likes)}\n` +
        `🔥 *XP:* ${fmt(data.xp)}\n` +
        `🌎 *Região:* ${data.region || '?'}\n` +
        `📦 *Versão:* ${data.release_version || '?'}\n` +
        `🏆 *Rank BR:* ${data.br_max_rank ?? '?'} (${fmt(data.br_rank_point)} pts)\n` +
        `🎖️ *Rank CS:* ${data.cs_max_rank ?? '?'} (${fmt(data.cs_rank_point)} pts)` +
        (data.has_booyah_pass ? '\n🎟️ *Booyah Pass:* Ativo' : '') +
        (data.guild ? `\n🏛️ *Guilda:* ${data.guild}` : '') +
        (data.biography ? `\n📝 *Bio:* ${data.biography}` : '') +
        `\n\n━━━━━━━━━━━━━━━━\n🕸️ *DARK BOT*`
      );
      m.react('💖');
    } catch (e) {
      console.error('[infoff]', e.message?.slice(0, 80));
      m.react('❌');
      return m.reply('😵 Falha ao consultar. Tenta mais tarde!');
    }
  });

  registerCase(['like', 'enviarlike', 'darflw'], async ({ m, text, prefix, command }) => {
    const uid = String(text || '').trim();
    if (!uid) return m.reply(`💖 *ENVIAR LIKES FF*\n\nUso: ${prefix + command} <UID>\nExemplo: ${prefix + command} 6514303752`);
    if (!/^\d+$/.test(uid)) return m.reply('🫣 Isso não parece um ID válido... usa só números!');
    const token = nyxToken();
    if (!token) return m.reply('⚠️ Serviço Free Fire não configurado.\nO dono precisa definir *NYX_FF_TOKEN* no servidor.');
    await m.reply('🌸 Aguardinha só... a mandar carinho para esse ID! 💌');
    try {
      const axios = require('axios');
      const { data } = await axios.get('https://nyxlikesff.store/like', {
        params: { uid, token }, timeout: 25000,
      });
      const limiteMsg = (c) => `💔 *Já mandei like hoje...*\n\nEsse ID já recebeu carinho hoje! 🥺` +
        (c ? `\n\n⏳ *Próximo envio em:* ${c.hours}h ${c.minutes}m ${c.seconds}s` : `\n_Volta amanhã que mando mais, tá?_ 💕`);
      if (data?.status === 'erro') {
        if (data.cooldown) return m.reply(limiteMsg(data.cooldown));
        return m.reply(limiteMsg(null));
      }
      if (data?.status === 'success' || data?.status === 'sucesso') {
        const enviadas = Number(data.likes_added || data.likes_adicionados || 0);
        if (data.message === 'LIKES_LIMIT' || data.mensagem === 'LIKES_LIMIT' || enviadas === 0) {
          return m.reply(limiteMsg(data.cooldown || null));
        }
        const antes = Number(data.likes_before || data.likes_antes || 0);
        const depois = Number(data.likes_end || data.likes_final || 0);
        await m.reply(
          `💖 *LIKES ENVIADOS COM SUCESSO!* 💖\n━━━━━━━━━━━━━━━━\n\n` +
          `🦊 *Jogador:* ${data.nickname || 'Desconhecido'}\n🆔 *ID:* ${uid}\n\n📊 *Resultado:*\n` +
          `├ 💫 *Antes:* ${antes.toLocaleString('pt-BR')}\n` +
          `├ ⭐ *Enviados:* +${enviadas.toLocaleString('pt-BR')}\n` +
          `└ 🔥 *Depois:* ${depois.toLocaleString('pt-BR')}\n\n━━━━━━━━━━━━━━━━\n🕸️ *DARK BOT*`
        );
        m.react('💖');
        return;
      }
      return m.reply('💔 Ops... algo correu mal. Tenta de novo! 🥺');
    } catch (e) {
      const dados = e.response?.data;
      const msgErro = String(dados?.mensagem || dados?.message || e.message || '');
      if (/limite|LIKES_LIMIT/i.test(msgErro)) {
        const c = dados?.cooldown;
        return m.reply(`💔 *Já mandei like hoje...*` + (c ? `\n\n⏳ *Próximo envio em:* ${c.hours}h ${c.minutes}m ${c.seconds}s` : ''));
      }
      console.error('[like]', e.message?.slice(0, 80));
      return m.reply('😵 Ai, deu ruim... tenta mais tarde! 💕');
    }
  });

  // ═══ spotifysearch — alias do spotify nativo (Spotify.txt pedia os dois) ═══
  registerCase(['spotifysearch', 'spsearch'], async ({ m, sock, msg, ctx, args, text, prefix, isOwner, config }) => {
    const ch = require('../caseHandler');
    return ch.runCase('spotify', { sock, msg, ctx, args, text, prefix, isOwner, config });
  });
};

module.exports._editSessions = editSessions;
