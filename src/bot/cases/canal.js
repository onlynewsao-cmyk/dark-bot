'use strict';
/**
 * DARK BOT v7.60 — Gestão de CANAIS (motor AURA ⚡)
 *
 * Expõe para comandos aquilo que a Aura já sabia fazer por IA
 * (src/aura/auraCanais.js + auraAgenda.js): postar, info, stats,
 * criar, adotar, renomear, foto, agendar, perguntar, seguir/deixar.
 *
 * Leitura (info/stats/meu/agenda/respostas): todos.
 * Escrita (postar/criar/nome/foto/...): só dono.
 */

function canais() { return require('../../aura/auraCanais'); }

async function alvoMeu() {
  try {
    const meu = await canais().meuCanal();
    return meu?.jid || null;
  } catch { return null; }
}

function fmtResult(r) {
  if (!r) return '❌ Sem resposta do motor.';
  if (r.ok === false) return '❌ ' + (r.msg || 'Falhou.');
  if (r.msg) return '✅ ' + r.msg;
  if (typeof r === 'string') return r;
  return '✅ Feito.';
}

module.exports = function registerCanalCases(registerCase) {
  registerCase(['canal', 'canais', 'channel'], async ({ sock, m, msg, ctx, args, text, prefix, isOwner, reply }) => {
    const sub = String(args[0] || '').toLowerCase();
    const resto = (text || '').slice((args[0] || '').length).trim();
    const C = canais();

    const HELP =
      `📢 *AURA CANAIS* ⚡\n\n` +
      `*Leitura (todos):*\n` +
      `• \`${prefix}canal meu\` — qual o canal adotado\n` +
      `• \`${prefix}canal info\` — dados do canal\n` +
      `• \`${prefix}canal stats\` — estatísticas\n` +
      `• \`${prefix}canal agenda\` — posts agendados\n` +
      `• \`${prefix}canal respostas\` — respostas dos seguidores\n\n` +
      `*Escrita (só dono):*\n` +
      `• \`${prefix}canal postar <texto>\` — publica agora\n` +
      `• \`${prefix}canal criar <nome> | <descrição>\` — cria canal\n` +
      `• \`${prefix}canal adotar <link>\` — adota um canal teu\n` +
      `• \`${prefix}canal nome <novo nome>\`\n` +
      `• \`${prefix}canal desc <nova descrição>\`\n` +
      `• \`${prefix}canal foto\` — (responde a uma imagem)\n` +
      `• \`${prefix}canal agendar <pedido>\` — ex: notícias 2x ao dia\n` +
      `• \`${prefix}canal parar\` — pára agendamentos\n` +
      `• \`${prefix}canal perguntar <pergunta> | <op1> | <op2>\`\n` +
      `• \`${prefix}canal seguir <link>\` — segue um canal\n` +
      `• \`${prefix}canal deixar\` — deixa o canal adotado\n` +
      `• \`${prefix}canal apagar SIM\` — ⚠️ apaga o canal`;

    if (!sub) {
      const meu = await C.meuCanal().catch(() => null);
      const linha = meu?.jid ? `\n\n📌 Adotado: *${meu.name || 'sem nome'}*` : `\n\n📌 Nenhum canal adotado. Usa \`${prefix}canal criar\` ou \`${prefix}canal adotar <link>\`.`;
      return reply(HELP + linha);
    }

    // ── leitura ──
    if (sub === 'meu') {
      const meu = await C.meuCanal().catch(() => null);
      if (!meu?.jid) return reply(`📌 Nenhum canal adotado.\nCria: \`${prefix}canal criar Nome | Descrição\`\nOu adota: \`${prefix}canal adotar <link>\``);
      return reply(`📌 *${meu.name || 'Canal'}*\n🆔 \`${meu.jid}\`\n📝 ${meu.description || '—'}\n🔗 ${meu.invite || '—'}`);
    }
    if (sub === 'info') {
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado. \`${prefix}canal adotar <link>\``);
      return reply(fmtResult(await C.infoCanal(sock, alvo)));
    }
    if (sub === 'stats' || sub === 'estatisticas') {
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado. \`${prefix}canal adotar <link>\``);
      return reply(fmtResult(await C.estatisticasCanal(sock, alvo)));
    }
    if (sub === 'agenda') {
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado. \`${prefix}canal adotar <link>\``);
      try {
        const ag = require('../../aura/auraAgenda');
        const lista = await ag.listar(alvo);
        if (!lista?.length) return reply(`🗓️ Sem agendamentos neste canal.\nCria: \`${prefix}canal agendar notícias de hora em hora\``);
        const linhas = lista.map((a, i) => `${i + 1}. *${a.tema || '?'}* — a cada ${a.intervaloMin || '?'}min\n   ⏭️ próximo: ${a.proxima ? new Date(a.proxima).toLocaleString('pt-AO') : '?'}`);
        return reply(`🗓️ *AGENDADOS* (${lista.length}):\n\n${linhas.join('\n')}`);
      } catch (e) { return reply('❌ Agendamento indisponível: ' + String(e?.message || e).slice(0, 80)); }
    }
    if (sub === 'respostas') {
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado. \`${prefix}canal adotar <link>\``);
      return reply(fmtResult(await C.lerRespostasCanal(sock, alvo)));
    }

    // ── escrita: só dono ──
    if (!isOwner) return reply('🚫 Só o *dono* pode gerir canais.');

    if (sub === 'postar' || sub === 'publicar' || sub === 'post') {
      if (!resto) return reply(`❓ Usa: \`${prefix}canal postar <texto>\``);
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado. \`${prefix}canal adotar <link>\``);
      return reply(fmtResult(await C.postarCanal(sock, alvo, resto)));
    }
    if (sub === 'criar') {
      const [nome, desc] = resto.split('|').map(s => s.trim());
      if (!nome) return reply(`❓ Usa: \`${prefix}canal criar <nome> | <descrição>\``);
      const r = await C.criarCanalSeguro(sock, nome, desc || '');
      if (!r || r.ok === false) return reply('❌ ' + (r?.msg || 'Não consegui criar o canal.'));
      try { await C.guardarCanal({ jid: r.jid || r.id, name: nome, description: desc || '', invite: r.invite || '', criadoEm: Date.now() }); } catch {}
      return reply(`✅ Canal *${nome}* criado e adotado! 📢`);
    }
    if (sub === 'adotar' || sub === 'assumir') {
      if (!resto) return reply(`❓ Usa: \`${prefix}canal adotar <link do canal>\``);
      return reply(fmtResult(await C.adotarCanal(sock, resto)));
    }
    if (sub === 'nome' || sub === 'renomear') {
      if (!resto) return reply(`❓ Usa: \`${prefix}canal nome <novo nome>\``);
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      return reply(fmtResult(await C.renomearCanal(sock, alvo, resto)));
    }
    if (sub === 'desc' || sub === 'descricao' || sub === 'descrever') {
      if (!resto) return reply(`❓ Usa: \`${prefix}canal desc <nova descrição>\``);
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      return reply(fmtResult(await C.descreverCanal(sock, alvo, resto)));
    }
    if (sub === 'foto') {
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      const raw = m.msg?.message || msg?.message || {};
      const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;
      const srcMsg = raw.imageMessage ? (m.msg || msg) : (quoted?.imageMessage ? { message: quoted } : null);
      if (!srcMsg) return reply(`❓ Responde a uma *imagem* com \`${prefix}canal foto\``);
      try {
        const mh = require('../mediaHandler');
        const buf = await mh.downloadFromMessage(srcMsg);
        return reply(fmtResult(await C.fotoCanal(sock, alvo, buf)));
      } catch (e) { return reply('❌ Não consegui ler a imagem: ' + String(e?.message || e).slice(0, 80)); }
    }
    if (sub === 'agendar') {
      if (!resto) return reply(`❓ Usa: \`${prefix}canal agendar <pedido>\`\nEx: \`${prefix}canal agendar notícias de hora em hora\``);
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      try {
        const ag = require('../../aura/auraAgenda');
        return reply(fmtResult(await ag.criar(resto, { jid: alvo })));
      } catch (e) { return reply('❌ Agendamento indisponível: ' + String(e?.message || e).slice(0, 80)); }
    }
    if (sub === 'parar') {
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      try {
        const ag = require('../../aura/auraAgenda');
        return reply(fmtResult(await ag.parar(alvo)));
      } catch (e) { return reply('❌ ' + String(e?.message || e).slice(0, 80)); }
    }
    if (sub === 'perguntar' || sub === 'enquete' || sub === 'poll') {
      if (!resto) return reply(`❓ Usa: \`${prefix}canal perguntar <pergunta> | <op1> | <op2>\``);
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      return reply(fmtResult(await C.perguntarSeguidores(sock, alvo, resto)));
    }
    if (sub === 'seguir' || sub === 'entrar') {
      if (!resto) return reply(`❓ Usa: \`${prefix}canal seguir <link do canal>\``);
      return reply(fmtResult(await C.aceitarConviteCanal(sock, resto, ctx)));
    }
    if (sub === 'deixar' || sub === 'sair') {
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      return reply(fmtResult(await C.deixarCanal(sock, alvo)));
    }
    if (sub === 'apagar' || sub === 'deletar') {
      if (resto.toUpperCase() !== 'SIM') return reply(`⚠️ Isto *APAGA o canal* para sempre!\nConfirma: \`${prefix}canal apagar SIM\``);
      const alvo = await alvoMeu();
      if (!alvo) return reply(`❌ Sem canal adotado.`);
      const r = await C.apagarCanal(sock, alvo);
      if (r?.ok !== false) { try { await C.guardarCanal(null); } catch {} }
      return reply(fmtResult(r));
    }
    return reply(`❓ Subcomando desconhecido: \`${sub}\`\nVê: \`${prefix}canal\``);
  });
};
