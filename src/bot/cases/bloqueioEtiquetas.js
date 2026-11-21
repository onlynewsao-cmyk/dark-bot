/**
 * DARK BOT v13.5 — Bloqueio de Status/Conversa + Etiquetas com Emojis
 *
 * COMANDOS:
 * !bloquearextras  — Bloqueia Status e Conversa de Voz no grupo
 * !etiquetas       — Adiciona etiquetas com emojis/comandos às mensagens
 *
 * Ambos apenas para DONO DO GRUPO (owner)
 */

'use strict';

const GroupSettings = require('../../database/models/GroupSettings');

// ═══════════════════════════════════════════════════════════════
// ETIQUETAS DISPONÍVEIS (emojis + caracteres especiais)
// ═══════════════════════════════════════════════════════════════
const ETIQUETAS = {
  // Categorias principais
  alerta:    { emoji: '🚨', chars: '⚠️🔴', label: 'ALERTA' },
  info:      { emoji: 'ℹ️', chars: '📋📌', label: 'INFO' },
  comando:   { emoji: '⚙️', chars: '🔧🛠️', label: 'COMANDO' },
  avisar:    { emoji: '⚠️', chars: '🟡📢', label: 'AVISO' },
  banido:    { emoji: '🚫', chars: '❌🔒', label: 'BANIDO' },
  vip:       { emoji: '👑', chars: '💎⭐', label: 'VIP' },
  admin:     { emoji: '🛡️', chars: '⚜️🔰', label: 'ADMIN' },
  membro:    { emoji: '👤', chars: '🟢📍', label: 'MEMBRO' },
  mensagem:  { emoji: '💬', chars: '📨✉️', label: 'MSG' },
  media:     { emoji: '📸', chars: '🎥🎵', label: 'MÍDIA' },
  link:      { emoji: '🔗', chars: '🌐📡', label: 'LINK' },
  jogo:      { emoji: '🎮', chars: '🎲🎯', label: 'JOGO' },
  musica:    { emoji: '🎵', chars: '🎶🎧', label: 'MÚSICA' },
  video:     { emoji: '🎬', chars: '📹🎥', label: 'VÍDEO' },
  foto:      { emoji: '📷', chars: '🖼️📸', label: 'FOTO' },
  sticker:   { emoji: '🎭', chars: '🖼️✨', label: 'STICKER' },
  rpg:       { emoji: '⚔️', chars: '🗡️🛡️', label: 'RPG' },
  economia:  { emoji: '💰', chars: '🪙💎', label: 'ECONOMIA' },
  evento:    { emoji: '🎉', chars: '🎊🎈', label: 'EVENTO' },
  news:      { emoji: '📰', chars: '🗞️📡', label: 'NOTÍCIA' },
};

// ═══════════════════════════════════════════════════════════════
// BORDAS DECORATIVAS PARA ETIQUETAS
// ═══════════════════════════════════════════════════════════════
const BORDAS = {
  simples:   (t) => `「 ${t} 」`,
  dupla:     (t) => `〖 ${t} 〗`,
  angulos:   (t) => `◢◤ ${t} ◢◤`,
  estrelas:  (t) => `★ ${t} ★`,
  diamante:  (t) => `◆ ${t} ◆`,
  coracao:   (t) => `♥ ${t} ♥`,
  toxic:     (t) => `☣️ ${t} ☣️`,
  aranha:    (t) => `🕷️ ${t} 🕸️`,
  caveira:   (t) => `💀 ${t} 💀`,
  fogo:      (t) => `🔥 ${t} 🔥`,
  raio:      (t) => `⚡ ${t} ⚡`,
  cristal:   (t) => `💎 ${t} 💎`,
};

module.exports = function registerBloqueioEtiquetasCases(registerCase) {

  // ═══════════════════════════════════════════════════════════════
  // !bloquearextras — Bloqueia Status e Conversa de Voz
  // ═══════════════════════════════════════════════════════════════
  registerCase(['bloquearextras', 'bloquearextra', 'bloquearstatus', 'bloquearvoz'],
    async ({ sock, msg, ctx, args, isOwner, reply, prefix }) => {
      // Verificar se é dono do grupo
      if (!ctx.isOwner && !isOwner) {
        return reply('❌ Apenas o *dono do grupo* pode usar este comando.');
      }

      const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
      if (!gs) {
        return reply('❌ Grupo não registado. Use !registrar primeiro.');
      }

      const sub = String(args[0] || '').toLowerCase();
      const estado = args[1]?.toLowerCase();

      // ═══════════════════════════════════════════════════════════════
      // LISTAR STATUS ATUAL
      // ═══════════════════════════════════════════════════════════════
      if (!sub || sub === 'status' || sub === 'ver') {
        const bloqueioStatus = gs.bloquearStatus || false;
        const bloqueioVoz = gs.bloquearVoz || false;
        const bloqueioConv = gs.bloquearConversa || false;

        const resposta = 
          `🔒 *BLOQUEIO DE EXTRAS*\n\n` +
          `*Estado atual:*\n` +
          `${bloqueioStatus ? '🚫' : '✅'} Status/Stories: ${bloqueioStatus ? 'BLOQUEADO' : 'Livre'}\n` +
          `${bloqueioVoz ? '🚫' : '✅'} Conversa de Voz: ${bloqueioVoz ? 'BLOQUEADA' : 'Livre'}\n` +
          `${bloqueioConv ? '🚫' : '✅'} Conversas Privadas: ${bloqueioConv ? 'BLOQUEADAS' : 'Livres'}\n\n` +
          `*Comandos:*\n` +
          `\`${prefix}bloquearextras status on\` — bloqueia status\n` +
          `\`${prefix}bloquearextras status off\` — libera status\n` +
          `\`${prefix}bloquearextras voz on\` — bloqueia voz\n` +
          `\`${prefix}bloquearextras voz off\` — libera voz\n` +
          `\`${prefix}bloquearextras conversa on\` — bloqueia conv.\n` +
          `\`${prefix}bloquearextras conversa off\` — libera conv.\n` +
          `\`${prefix}bloquearextras tudo on\` — bloqueia tudo\n` +
          `\`${prefix}bloquearextras tudo off\` — libera tudo`;

        return reply(resposta);
      }

      // ═══════════════════════════════════════════════════════════════
      // ATIVAR/DESATIVAR BLOQUEIOS
      // ═══════════════════════════════════════════════════════════════
      const ativar = estado === 'on' || estado === 'ativar' || estado === 'sim';
      const desativar = estado === 'off' || estado === 'desativar' || estado === 'não' || estado === 'nao';

      if (!ativar && !desativar) {
        return reply(`❓ Usa \`on\` ou \`off\`:\n\`${prefix}bloquearextras ${sub} on/off\``);
      }

      switch (sub) {
        case 'status':
        case 'stories':
          gs.bloquearStatus = ativar;
          await gs.save();
          return reply(
            `🔒 *Status ${ativar ? 'BLOQUEADO' : 'LIBERADO'}*\n\n` +
            `${ativar ? '🚫' : '✅'} Members não poderão mais compartilhar status/stories no grupo.` +
            (ativar ? '\n\n_Ao tentar compartilhar, a mensagem será apagada automaticamente._' : '')
          );

        case 'voz':
        case 'voice':
        case 'voip':
          gs.bloquearVoz = ativar;
          await gs.save();
          return reply(
            `🔒 *Conversa de Voz ${ativar ? 'BLOQUEADA' : 'LIBERADA'}*\n\n` +
            `${ativar ? '🚫' : '✅'} O botão de Conversa de Voz não funcionará no grupo.` +
            (ativar ? '\n\n_Ao tentar iniciar, será bloqueado automaticamente._' : '')
          );

        case 'conversa':
        case 'privado':
        case 'pv':
          gs.bloquearConversa = ativar;
          await gs.save();
          return reply(
            `🔒 *Conversas Privadas ${ativar ? 'BLOQUEADAS' : 'LIBERADAS'}*\n\n` +
            `${ativar ? '🚫' : '✅'} Members não poderão iniciar conversas privadas pelo grupo.` +
            (ativar ? '\n\n_Ao tentar, receberão um aviso do bot._' : '')
          );

        case 'tudo':
        case 'all':
          gs.bloquearStatus = ativar;
          gs.bloquearVoz = ativar;
          gs.bloquearConversa = ativar;
          await gs.save();
          return reply(
            `🔒 *Tudo ${ativar ? 'BLOQUEADO' : 'LIBERADO'}*\n\n` +
            `${ativar ? '🚫' : '✅'} Status: ${ativar ? 'Bloqueado' : 'Livre'}\n` +
            `${ativar ? '🚫' : '✅'} Voz: ${ativar ? 'Bloqueada' : 'Livre'}\n` +
            `${ativar ? '🚫' : '✅'} Conversas: ${ativar ? 'Bloqueadas' : 'Livres'}`
          );

        default:
          return reply(
            `❓ Opções:\n` +
            `\`${prefix}bloquearextras status on/off\`\n` +
            `\`${prefix}bloquearextras voz on/off\`\n` +
            `\`${prefix}bloquearextras conversa on/off\`\n` +
            `\`${prefix}bloquearextras tudo on/off\``
          );
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !etiquetas — Adiciona etiquetas com emojis/comandos
  // ═══════════════════════════════════════════════════════════════
  registerCase(['etiquetas', 'etiqueta', 'labels', 'label', 'tags', 'tag'],
    async ({ sock, msg, ctx, args, isOwner, reply, prefix }) => {
      // Verificar se é dono do grupo
      if (!ctx.isOwner && !isOwner) {
        return reply('❌ Apenas o *dono do grupo* pode usar este comando.');
      }

      const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
      if (!gs) {
        return reply('❌ Grupo não registado. Use !registrar primeiro.');
      }

      const sub = String(args[0] || '').toLowerCase();
      const resto = args.slice(1).join(' ');

      // ═══════════════════════════════════════════════════════════════
      // LISTAR ETIQUETAS DISPONÍVEIS
      // ═══════════════════════════════════════════════════════════════
      if (!sub || sub === 'lista' || sub === 'list') {
        let resposta = `🏷️ *ETIQUETAS DISPONÍVEIS*\n\n`;
        resposta += `*Use:*\n\`${prefix}etiquetas add <tipo> <texto>\`\n\n`;
        resposta += `*Categorias:*\n`;

        const categorias = Object.entries(ETIQUETAS);
        for (let i = 0; i < categorias.length; i++) {
          const [nome, dados] = categorias[i];
          resposta += `${dados.emoji} \`${nome}\` — ${dados.label}\n`;
        }

        resposta += `\n*Bordas:*\n`;
        const bordasLista = Object.keys(BORDAS);
        resposta += bordasLista.map(b => `\`${b}\``).join(', ');

        resposta += `\n\n*Exemplos:*\n`;
        resposta += `\`${prefix}etiquetas add alerta Mensagem importante\`\n`;
        resposta += `\`${prefix}etiquetas add vip @user\`\n`;
        resposta += `\`${prefix}etiquetas borda toxic\`\n`;

        return reply(resposta);
      }

      // ═══════════════════════════════════════════════════════════════
      // CONFIGURAR BORDA PADRÃO
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'borda' || sub === 'border') {
        const bordaNome = resto.toLowerCase();
        if (!bordaNome || !BORDAS[bordaNome]) {
          return reply(
            `❓ Bordas disponíveis:\n` +
            Object.keys(BORDAS).map(b => `\`${b}\``).join(', ') +
            `\n\n*Uso:*\n\`${prefix}etiquetas borda <nome>\``
          );
        }

        gs.etiquetaBorda = bordaNome;
        await gs.save();

        return reply(
          `✅ *Borda definida:*\n\n` +
          `Borda: \`${bordaNome}\`\n` +
          `Exemplo: ${BORDAS[bordaNome]('Teste')}`
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ATIVAR/DESATIVAR ETIQUETAS AUTOMÁTICAS
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'on' || sub === 'off' || sub === 'ativar' || sub === 'desativar') {
        const ativar = sub === 'on' || sub === 'ativar';
        gs.etiquetasAtivas = ativar;
        await gs.save();

        return reply(
          `🏷️ *Etiquetas ${ativar ? 'ATIVADAS' : 'DESATIVADAS'}*\n\n` +
          `${ativar ? '✅' : '⚪'} O bot agora ${ativar ? 'adiciona etiquetas automaticamente' : 'não adiciona etiquetas'} às mensagens.`
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ADICIONAR ETIQUETA A UMA MENSAGEM (responde a msg)
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'add' || sub === 'adicionar') {
        if (!msg.quoted) {
          return reply(`❓ Responde a uma mensagem com:\n\`${prefix}etiquetas add <tipo> <texto>\``);
        }

        const tipo = resto.split(' ')[0]?.toLowerCase();
        const texto = resto.slice(tipo?.length || 0).trim();

        if (!tipo || !ETIQUETAS[tipo]) {
          return reply(
            `❓ Tipo inválido. Disponíveis:\n` +
            Object.keys(ETIQUETAS).map(t => `\`${t}\``).join(', ')
          );
        }

        if (!texto) {
          return reply(`❓ Adiciona um texto:\n\`${prefix}etiquetas add ${tipo} <texto>\``);
        }

        const etiqueta = ETIQUETAS[tipo];
        const bordaNome = gs.etiquetaBorda || 'simples';
        const borda = BORDAS[bordaNome];

        // Criar mensagem com etiqueta
        const mensagemEtiqueta = 
          `${borda(etiqueta.emoji + ' ' + etiqueta.label)}\n\n` +
          `${texto}\n\n` +
          `${etiqueta.chars}`;

        // Reagir com emoji
        await sock.sendMessage(ctx.remoteJid, {
          react: {
            text: etiqueta.emoji,
            key: msg.quoted.key
          }
        });

        // Enviar mensagem etiquetada
        await sock.sendMessage(ctx.remoteJid, {
          text: mensagemEtiqueta
        }, { quoted: msg.quoted });

        return reply(`✅ *Etiqueta adicionada!*\n\n${etiqueta.emoji} ${etiqueta.label}: ${texto.slice(0, 50)}...`);
      }

      // ═══════════════════════════════════════════════════════════════
      // ADICIONAR ETIQUETA PERSONALIZADA
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'custom' || sub === 'personalizada') {
        if (!msg.quoted) {
          return reply(`❓ Responde a uma mensagem com:\n\`${prefix}etiquetas custom <emoji> <texto>\``);
        }

        const emoji = resto[0];
        const texto = resto.slice(2).trim();

        if (!emoji || !texto) {
          return reply(`❓ Formato:\n\`${prefix}etiquetas custom <emoji> <texto>\``);
        }

        const bordaNome = gs.etiquetaBorda || 'simples';
        const borda = BORDAS[bordaNome];

        const mensagemEtiqueta = 
          `${borda(emoji + ' Etiqueta')}\n\n` +
          `${texto}\n\n` +
          `${emoji}${emoji}${emoji}`;

        await sock.sendMessage(ctx.remoteJid, {
          react: {
            text: emoji,
            key: msg.quoted.key
          }
        });

        await sock.sendMessage(ctx.remoteJid, {
          text: mensagemEtiqueta
        }, { quoted: msg.quoted });

        return reply(`✅ *Etiqueta personalizada adicionada!*`);
      }

      // ═══════════════════════════════════════════════════════════════
      // REMOVER ETIQUETA DE MENSAGEM
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'remover' || sub === 'remove' || sub === 'del') {
        if (!msg.quoted) {
          return reply(`❓ Responde a uma mensagem etiquetada para remover.`);
        }

        // Remover reação
        await sock.sendMessage(ctx.remoteJid, {
          react: {
            text: '',
            key: msg.quoted.key
          }
        });

        return reply(`✅ *Etiqueta removida!*`);
      }

      // ═══════════════════════════════════════════════════════════════
      // HELP
      // ═══════════════════════════════════════════════════════════════
      return reply(
        `🏷️ *SISTEMA DE ETIQUETAS*\n\n` +
        `*Comandos:*\n` +
        `\`${prefix}etiquetas\` — lista disponíveis\n` +
        `\`${prefix}etiquetas add <tipo> <texto>\` — adiciona etiqueta\n` +
        `\`${prefix}etiquetas custom <emoji> <texto>\` — personalizada\n` +
        `\`${prefix}etiquetas borda <nome>\` — muda borda\n` +
        `\`${prefix}etiquetas on/off\` — ativa/desativa auto\n` +
        `\`${prefix}etiquetas remover\` — remove etiqueta\n\n` +
        `*Tipos:*\n` +
        Object.keys(ETIQUETAS).slice(0, 10).map(t => `\`${t}\``).join(', ') +
        `... e mais\n\n` +
        `*Apenas dono do grupo pode usar.*`
      );
    }
  );
};
