/**
 * DARK BOT — Aura Avisos (v7.96) 📢
 * Caminho DE ENTREGA da Vigilante: envia as notificações ao Dark em PV,
 * em cartões escuros curtos, e resolve as decisões AURASEL_ no toque:
 *
 *   dados.do = 'convite'  { code, de, nomeDe, chat }
 *              → [0] ✅ Entrar (groupAcceptInvite)   [1] ❌ Recusar
 *   dados.do = 'aluguel'  { jid, gname }
 *              → [0] 🔁 Renovar +30d                [1] ⏰ Só avisar
 *              → [2] 🚪 Sair do grupo (groupLeave)
 */
'use strict';

const escolha = require('./auraEscolha');
const vig = require('./auraVigilante');

function ownerNum(config) {
  return String(config?.owner?.number || '').replace(/\D/g, '');
}
function ownerJid(config) {
  const n = ownerNum(config);
  return n ? `${n}@s.whatsapp.net` : '';
}

/** Cartão escuro curto (mesma assinatura visual dos avisos de aluguel). */
function cartao(titulo, linhas = []) {
  return [titulo, '', ...linhas].join('\n');
}

/** Envia texto ao Dono (PV). Silencioso quando não há config/sock. */
async function avisarDono(sock, config, titulo, linhas) {
  const jid = ownerJid(config);
  if (!sock || !jid) return false;
  await sock.sendMessage(jid, { text: cartao(titulo, linhas) }).catch(() => null);
  return true;
}

// ── Entradas da Aura num grupo ────────────────────────────────
async function avisarEntrada(sock, config, { gname, autorNumero, autorNome, size, link }) {
  if (!vig.perm('entrada')) return false;
  const linhas = [
    `🏠 Grupo: *${gname || 'sem nome'}*`,
    size ? `👥 ${size} membros` : null,
    autorNumero ? `🪝 Adicionou-me: @${autorNumero}${autorNome ? ` (${autorNome})` : ''}` : null,
    link ? `🔗 ${link}` : null,
  ].filter(Boolean);
  return avisarDono(sock, config, '💜 *ENTREI NUM GRUPO*', linhas);
}

// ── Aluguel: aviso rico + cartão renovar ──────────────────────
async function avisarAluguel(sock, config, { jid, gname, tag, dias }) {
  if (!vig.perm('aluguel')) return false;
  const emoji = tag === 'expirado' ? '🔴' : '⏰';
  const quando = tag === 'expirado' ? '*acabou agora*' : `${dias <= 1 ? 'menos de 1 dia' : '*' + dias + ' dias*'} restantes`;
  const ok = await avisarDono(sock, config, `${emoji} *ALUGUEL — ${gname || jid.split('@')[0]}*`, [
    quando,
    '👇 Decide queres já ou depois:',
  ]);
  if (!ok) return false;
  // cartão de decisão (24h) — junto do aviso, no PV do Dono
  try {
    const ctx = { remoteJid: ownerJid(config), senderNumber: ownerNum(config), isGroup: false, prefix: '!', isOwner: true };
    await escolha.enviar(sock, ctx, {
      titulo: `${emoji} ${gname || jid.split('@')[0]} — aluguel`,
      linhas: [quando],
      botao: 'Decidir agora',
      footer: 'Aura · tens 1 dia para decidir',
      expira: 24 * 3600 * 1000,
      dados: { do: 'aluguel', jid, gname: gname || '' },
      opcoes: [
        { label: '🔁 Renovar +30 dias', desc: 'soma 30 dias ao prazo actual' },
        { label: '⏰ Só avisar', desc: 'fica guardado, lembra mais tarde' },
        { label: '🚪 Sair do grupo', desc: 'a Aura despede-se e sai' },
      ],
    });
  } catch {}
  return true;
}

// ── Interesse d'alguém (quer alugar/VIP/procurou-te) ──────────
async function avisarInteresse(sock, config, { tipo, numero, nome, chat, cita }) {
  if (!vig.perm('interesse')) return false;
  const titulo = `💛 ${vig.INTERESSE_TITULO[tipo] || 'interesse'}`;
  return avisarDono(sock, config, titulo, [
    `📱 @${numero}${nome ? ` (${nome})` : ''}`,
    chat ? `💬 De: ${chat}` : null,
    cita ? `📝 “${String(cita).slice(0, 160)}”` : null,
  ].filter(Boolean));
}

// ── Convite recebido em PV → cartão ao Dono ───────────────────
async function avisarConvite(sock, config, { code, numero, nome }) {
  if (!vig.perm('convite')) return false;
  const ctx = { remoteJid: ownerJid(config), senderNumber: ownerNum(config), isGroup: false, prefix: '!', isOwner: true };
  await escolha.enviar(sock, ctx, {
    titulo: '💌 *CONVITE DE GRUPO RECEBIDO*',
    linhas: [
      `📱 Enviou: @${numero}${nome ? ` (${nome})` : ''}`,
      `🔗 https://chat.whatsapp.com/${code}`,
      '👇 Queres que eu entre?',
    ],
    botao: 'Decidir',
    footer: 'Aura · tens 1 dia para decidir',
    expira: 24 * 3600 * 1000,
    dados: { do: 'convite', code, de: numero, nomeDe: nome || '' },
    opcoes: [
      { label: '✅ Entrar no grupo', desc: 'aceita o convite e entra' },
      { label: '❌ Recusar', desc: 'responde com jeitinho a agradecer' },
    ],
  });
  return true;
}

// ── Um pedido de aluguel apareceu (via !alugar em PV) ─────────
async function avisarPedidoNovo(sock, config, { numero, nome, ref, total }) {
  if (!vig.perm('interesse')) return false;
  return avisarDono(sock, config, '💛 *PEDIDO DE ALUGUEL NOVO*', [
    `📱 @${numero}${nome ? ` (${nome})` : ''}`,
    ref ? `🧾 ref: ${ref}` : null,
    total ? `💰 ${total}` : null,
  ].filter(Boolean));
}

// ── Despacho das decisões AURASEL_ (toque no cartão) ─────────
async function despachar(dados, idx, { sock, msg, ctx, config }) {
  const d = dados || {};
  const reply = (t) => sock.sendMessage(ctx.remoteJid, { text: t }, { quoted: msg }).catch(() => {});
  try {
    if (d.do === 'convite') {
      if (idx === 0) {
        const jidEntrada = await sock.groupAcceptInvite(d.code).catch(e => ({ __erro: e.message }));
        if (!jidEntrada || jidEntrada.__erro) return reply(`❌ Não consegui entrar (${String(jidEntrada?.__erro || 'link inválido').slice(0, 80)}).`);
        // quem convidou recebe agradecimento
        if (d.de) sock.sendMessage(`${String(d.de).replace(/\D/g, '')}@s.whatsapp.net`, { text: 'Entrei ✅ Obrigado pelo convite 🖤' }).catch(() => {});
        return reply('✅ Aceitei — já estou lá dentro.');
      }
      return reply('❌ Recusado — ficou em paz.');
    }
    if (d.do === 'aluguel') {
      if (idx === 0) {
        // renovar +30: base = max(fim actual, agora) + 30d
        const GroupSettings = require('../database/models/GroupSettings');
        const gs = await GroupSettings.findOne({ groupJid: d.jid }).lean().catch(() => null);
        const atual = gs?.hostedUntil ? new Date(gs.hostedUntil).getTime() : 0;
        const base = Math.max(atual, Date.now());
        const novo = new Date(base + 30 * 86400000);
        await GroupSettings.findOneAndUpdate(
          { groupJid: d.jid },
          { $set: { isHosted: true, hostedUntil: novo } },
          { upsert: true }
        ).catch(() => null);
        try { if (gs) sock.sendMessage(d.jid, { text: `🟢 *ALUGUEL RENOVADO* até *${novo.toLocaleDateString('pt-PT')}* ✅` }).catch(() => {}); } catch {}
        return reply(`🔁 Renovei *${d.gname || d.jid.split('@')[0]}* até *${novo.toLocaleDateString('pt-PT')}* ✅`);
      }
      if (idx === 1) return reply(`⏰ Guardado — quando perguntares pelo aluguel, volto a lembrar.`);
      if (idx === 2) {
        await sock.sendMessage(d.jid, { text: '💜 Foi giro! O meu Dark manda-me embora — até à próxima ✌️' }).catch(() => {});
        await sock.groupLeave(d.jid).catch(() => {});
        return reply(`🚪 Saí de *${d.gname || d.jid.split('@')[0]}*.`);
      }
      return false;
    }
  } catch (e) { return reply('⚠️ Alguma coisa correu mal — ' + String(e.message || e).slice(0, 80)); }
  return false;
}

module.exports = {
  ownerJid, ownerNum, cartao, avisarDono,
  avisarEntrada, avisarAluguel, avisarInteresse, avisarConvite, avisarPedidoNovo,
  despachar,
};
