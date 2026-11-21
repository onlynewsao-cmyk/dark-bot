/**
 * DARK BOT v13.6 — Comandos de Etiquetas para WhatsApp
 *
 * !etiquetaws — Sistema completo de gestão de etiquetas
 * - Criar, editar, remover etiquetas
 * - Atribuir a membros, grupos e conversas
 * - Listar e buscar etiquetas
 * - Interface visual com emojis e cores
 */

'use strict';

const etiquetasManager = require('../etiquetasManager');

module.exports = function registerEtiquetasCases(registerCase) {

  // ═══════════════════════════════════════════════════════════════
  // !etiquetaws — Comando principal
  // ═══════════════════════════════════════════════════════════════
  registerCase(['etiquetaws', 'etiquetawpp', 'labelsws', 'labelswhatsapp'],
    async ({ sock, msg, ctx, args, text, isOwner, reply, prefix }) => {
      // Apenas dono do bot pode usar
      if (!isOwner) {
        return reply('❌ Apenas o dono do bot pode usar este comando.');
      }

      const sub = String(args[0] || '').toLowerCase();
      const resto = args.slice(1).join(' ');

      // ═══════════════════════════════════════════════════════════════
      // AJUDA / MENU PRINCIPAL
      // ═══════════════════════════════════════════════════════════════
      if (!sub || sub === 'ajuda' || sub === 'help') {
        const ajuda = 
          `🏷️ *SISTEMA DE ETIQUETAS*\n\n` +
          `*Comandos:*\n` +
          `\`${prefix}etiquetaws criar <nome>\` — cria etiqueta\n` +
          `\`${prefix}etiquetaws lista\` — lista etiquetas\n` +
          `\`${prefix}etiquetaws add <id> <tipo>\` — atribui etiqueta\n` +
          `\`${prefix}etiquetaws remover <id>\` — remove etiqueta\n` +
          `\`${prefix}etiquetaws buscar <texto>\` — busca etiquetas\n` +
          `\`${prefix}etiquetaws cores\` — lista cores\n` +
          `\`${prefix}etiquetaws emojis\` — lista emojis\n` +
          `\`${prefix}etiquetaws stats\` — estatísticas\n\n` +
          `*Tipos de alvo:*\n` +
          `• \`membro\` — etiquetar membro\n` +
          `• \`grupo\` — etiquetar grupo\n` +
          `• \`conversa\` — etiquetar conversa\n\n` +
          `*Exemplo:*\n` +
          `\`${prefix}etiquetaws criar VIP\`\n` +
          `\`${prefix}etiquetaws add lbl_123 membro @user\``;

        return reply(ajuda);
      }

      // ═══════════════════════════════════════════════════════════════
      // CRIAR ETIQUETA
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'criar' || sub === 'create' || sub === 'new') {
        if (!resto) {
          return reply(`❓ Formato:\n\`${prefix}etiquetaws criar <nome>\`\n\n*Exemplo:*\n\`${prefix}etiquetaws criar VIP\``);
        }

        // Parse de opções: nome emoji=👑 cor=#FF0000 tipo=membro
        const partes = resto.split(' ');
        const nome = partes[0];
        let emoji = '🏷️';
        let cor = '#000000';
        let tipo = 'geral';
        let descricao = '';

        for (let i = 1; i < partes.length; i++) {
          const p = partes[i].toLowerCase();
          if (p.startsWith('emoji=')) emoji = partes[i].split('=')[1];
          else if (p.startsWith('cor=')) cor = partes[i].split('=')[1];
          else if (p.startsWith('tipo=')) tipo = partes[i].split('=')[1];
          else if (p.startsWith('desc=')) descricao = partes[i].split('=').slice(1).join(' ');
        }

        try {
          const etiqueta = await etiquetasManager.criarEtiqueta({
            nome,
            emoji,
            cor,
            descricao,
            tipo,
            criadorJid: ctx.senderJid,
          });

          const resposta = 
            `✅ *Etiqueta Criada!*\n\n` +
            `${emoji} *${nome}*\n\n` +
            `*ID:* \`${etiqueta.labelId}\`\n` +
            `*Cor:* ${cor}\n` +
            `*Tipo:* ${tipo}\n` +
            (descricao ? `*Desc:* ${descricao}\n` : '') +
            `\n*Use para atribuir:*\n` +
            `\`${prefix}etiquetaws add ${etiqueta.labelId} membro @user\``;

          return reply(resposta);
        } catch (e) {
          return reply(`❌ Erro ao criar: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // LISTAR ETIQUETAS
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'lista' || sub === 'list' || sub === 'all') {
        try {
          const etiquetas = await etiquetasManager.listarEtiquetas({
            criadorJid: ctx.senderJid,
            activa: true,
          });

          if (etiquetas.length === 0) {
            return reply(`📋 *Nenhuma etiqueta encontrada.*\n\nCrie uma:\n\`${prefix}etiquetaws criar <nome>\``);
          }

          let resposta = `🏷️ *SUAS ETIQUETAS* (${etiquetas.length})\n\n`;
          
          for (const et of etiquetas) {
            const stats = [];
            if (et.totalMembros > 0) stats.push(`👤 ${et.totalMembros}`);
            if (et.totalGrupos > 0) stats.push(`👥 ${et.totalGrupos}`);
            if (et.totalConversas > 0) stats.push(`💬 ${et.totalConversas}`);
            
            resposta += `${et.emoji} *${et.nome}*\n`;
            resposta += `  ID: \`${et.labelId}\`\n`;
            resposta += `  Tipo: ${et.tipo}`;
            if (stats.length) resposta += ` | Usos: ${stats.join(', ')}`;
            resposta += '\n\n';
          }

          return reply(resposta);
        } catch (e) {
          return reply(`❌ Erro ao listar: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // ATRIBUIR ETIQUETA
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'add' || sub === 'atribuir' || sub === 'assign') {
        const labelId = args[1];
        const tipoAlvo = args[2]?.toLowerCase();
        const alvoTexto = args.slice(3).join(' ');

        if (!labelId || !tipoAlvo) {
          return reply(
            `❓ Formato:\n` +
            `\`${prefix}etiquetaws add <id> <tipo> <alvo>\`\n\n` +
            `*Exemplos:*\n` +
            `\`${prefix}etiquetaws add lbl_123 membro @user\`\n` +
            `\`${prefix}etiquetaws add lbl_123 grupo @grupo\`\n` +
            `\`${prefix}etiquetaws add lbl_123 conversa @user\``
          );
        }

        // Verificar se etiqueta existe
        const etiqueta = await etiquetasManager.getEtiqueta(labelId);
        if (!etiqueta) {
          return reply(`❌ Etiqueta \`${labelId}\` não encontrada.`);
        }

        // Determinar alvo JID
        let alvoJid = '';
        let alvoNumero = '';
        let alvoGrupo = '';

        if (tipoAlvo === 'membro') {
          // @user ou número
          if (msg.quoted) {
            alvoJid = msg.quoted.key.participant || msg.quoted.key.remoteJid;
          } else if (alvoTexto.startsWith('@')) {
            // Menção
            const mencoes = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            alvoJid = mencoes[0] || '';
          } else {
            // Número direto
            const numero = alvoTexto.replace(/\D/g, '');
            alvoJid = `${numero}@s.whatsapp.net`;
          }
          alvoNumero = alvoJid.split('@')[0];
        } else if (tipoAlvo === 'grupo') {
          alvoJid = ctx.remoteJid; // Grupo atual
          alvoGrupo = ctx.remoteJid;
        } else if (tipoAlvo === 'conversa') {
          if (msg.quoted) {
            alvoJid = msg.quoted.key.participant || msg.quoted.key.remoteJid;
          } else {
            alvoJid = ctx.remoteJid;
          }
        } else {
          return reply(`❓ Tipo inválido. Use: membro, grupo ou conversa`);
        }

        if (!alvoJid) {
          return reply(`❌ Não consegui identificar o alvo. Responde a uma mensagem ou usa @user`);
        }

        try {
          await etiquetasManager.atribuirEtiqueta({
            labelId,
            tipoAlvo,
            alvoJid,
            alvoNumero,
            alvoGrupo,
            atribuidoPor: ctx.senderJid,
          });

          const resposta = 
            `✅ *Etiqueta Atribuída!*\n\n` +
            `${etiqueta.emoji} *${etiqueta.nome}*\n` +
            `→ ${tipoAlvo}: ${alvoJid}\n\n` +
            `*Total:*\n` +
            `👤 Membros: ${etiqueta.totalMembros + 1}\n` +
            `👥 Grupos: ${etiqueta.totalGrupos}\n` +
            `💬 Conversas: ${etiqueta.totalConversas}`;

          return reply(resposta);
        } catch (e) {
          return reply(`❌ Erro ao atribuir: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // REMOVER ETIQUETA
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'remover' || sub === 'remove' || sub === 'del') {
        const labelId = args[1];
        if (!labelId) {
          return reply(`❓ Usa:\n\`${prefix}etiquetaws remover <id>\``);
        }

        try {
          const etiqueta = await etiquetasManager.removerEtiqueta(labelId);
          if (!etiqueta) {
            return reply(`❌ Etiqueta não encontrada.`);
          }

          return reply(`✅ *Etiqueta removida:*\n${etiqueta.emoji} ${etiqueta.nome}`);
        } catch (e) {
          return reply(`❌ Erro ao remover: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // BUSCAR ETIQUETAS
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'buscar' || sub === 'search' || sub === 'find') {
        const query = resto;
        if (!query) {
          return reply(`❓ Usa:\n\`${prefix}etiquetaws buscar <texto>\``);
        }

        try {
          const etiquetas = await etiquetasManager.buscarEtiquetas(query, {
            criadorJid: ctx.senderJid,
          });

          if (etiquetas.length === 0) {
            return reply(`🔍 *Nenhum resultado para:* "${query}"`);
          }

          let resposta = `🔍 *Resultados para:* "${query}"\n\n`;
          for (const et of etiquetas) {
            resposta += `${et.emoji} *${et.nome}* — ${et.tipo}\n`;
          }

          return reply(resposta);
        } catch (e) {
          return reply(`❌ Erro na busca: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // LISTAR CORES
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'cores' || sub === 'colors') {
        let resposta = `🎨 *CORES DISPONÍVEIS*\n\n`;
        resposta += `*Use ao criar:*\n\`cor=#FF0000\`\n\n`;
        
        for (const c of etiquetasManager.CORES) {
          resposta += `${c.emoji} ${c.nome}: \`${c.hex}\`\n`;
        }

        return reply(resposta);
      }

      // ═══════════════════════════════════════════════════════════════
      // LISTAR EMOJIS
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'emojis' || sub === 'emoji') {
        let resposta = `😀 *EMOJIS PARA ETIQUETAS*\n\n`;
        resposta += `*Use ao criar:*\n\`emoji=👑\`\n\n`;
        
        resposta += etiquetasManager.EMOJIS_ETIQUETA.join(' ');

        return reply(resposta);
      }

      // ═══════════════════════════════════════════════════════════════
      // ESTATÍSTICAS
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'stats' || sub === 'estatisticas') {
        try {
          const etiquetas = await etiquetasManager.listarEtiquetas({
            criadorJid: ctx.senderJid,
          });

          const totalMembros = etiquetas.reduce((sum, e) => sum + e.totalMembros, 0);
          const totalGrupos = etiquetas.reduce((sum, e) => sum + e.totalGrupos, 0);
          const totalConversas = etiquetas.reduce((sum, e) => sum + e.totalConversas, 0);

          const resposta = 
            `📊 *ESTATÍSTICAS DE ETIQUETAS*\n\n` +
            `*Total de etiquetas:* ${etiquetas.length}\n` +
            `*Membros etiquetados:* ${totalMembros}\n` +
            `*Grupos etiquetados:* ${totalGrupos}\n` +
            `*Conversas etiquetadas:* ${totalConversas}\n\n` +
            `*Mais usadas:*\n`;

          const topEtiquetas = etiquetas
            .sort((a, b) => (b.totalMembros + b.totalGrupos + b.totalConversas) - (a.totalMembros + a.totalGrupos + a.totalConversas))
            .slice(0, 5);

          for (const et of topEtiquetas) {
            const total = et.totalMembros + et.totalGrupos + et.totalConversas;
            resposta += `${et.emoji} ${et.nome}: ${total} usos\n`;
          }

          return reply(resposta);
        } catch (e) {
          return reply(`❌ Erro ao obter stats: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // VER ETIQUETA ESPECÍFICA
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'ver' || sub === 'info') {
        const labelId = args[1];
        if (!labelId) {
          return reply(`❓ Usa:\n\`${prefix}etiquetaws ver <id>\``);
        }

        try {
          const etiqueta = await etiquetasManager.getEtiqueta(labelId);
          if (!etiqueta) {
            return reply(`❌ Etiqueta não encontrada.`);
          }

          const atribuicoes = await etiquetasManager.listarAtribuicoesEtiqueta(labelId);

          const resposta = 
            `${etiqueta.emoji} *${etiqueta.nome}*\n\n` +
            `*ID:* \`${etiqueta.labelId}\`\n` +
            `*Tipo:* ${etiqueta.tipo}\n` +
            `*Cor:* ${etiqueta.cor}\n` +
            (etiqueta.descricao ? `*Desc:* ${etiqueta.descricao}\n` : '') +
            `\n*Estatísticas:*\n` +
            `👤 Membros: ${etiqueta.totalMembros}\n` +
            `👥 Grupos: ${etiqueta.totalGrupos}\n` +
            `💬 Conversas: ${etiqueta.totalConversas}\n\n` +
            `*Atribuições (${atribuicoes.length}):*\n` +
            atribuicoes.slice(0, 10).map(a => `• ${a.alvoJid}`).join('\n') +
            (atribuicoes.length > 10 ? `\n... e mais ${atribuicoes.length - 10}` : '');

          return reply(resposta);
        } catch (e) {
          return reply(`❌ Erro: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // EDITAR ETIQUETA
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'editar' || sub === 'edit' || sub === 'update') {
        const labelId = args[1];
        if (!labelId) {
          return reply(`❓ Usa:\n\`${prefix}etiquetaws editar <id> <campo>=<valor>\``);
        }

        const updates = {};
        const partes = args.slice(2);
        
        for (const p of partes) {
          const [campo, valor] = p.split('=');
          if (campo === 'nome') updates.nome = valor;
          else if (campo === 'emoji') updates.emoji = valor;
          else if (campo === 'cor') updates.cor = valor;
          else if (campo === 'desc') updates.descricao = valor;
          else if (campo === 'tipo') updates.tipo = valor;
        }

        if (Object.keys(updates).length === 0) {
          return reply(
            `❓ Campos editáveis:\n` +
            `• \`nome=<novo nome>\`\n` +
            `• \`emoji=<emoji>\`\n` +
            `• \`cor=<#hex>\`\n` +
            `• \`desc=<descrição>\`\n` +
            `• \`tipo=<membro|grupo|conversa|geral>\`\n\n` +
            `*Exemplo:*\n` +
            `\`${prefix}etiquetaws editar lbl_123 nome=VIP emoji=👑\``
          );
        }

        try {
          const etiqueta = await etiquetasManager.atualizarEtiqueta(labelId, updates);
          if (!etiqueta) {
            return reply(`❌ Etiqueta não encontrada.`);
          }

          return reply(`✅ *Etiqueta atualizada!*\n\n${etiqueta.emoji} ${etiqueta.nome}`);
        } catch (e) {
          return reply(`❌ Erro ao editar: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // REMOVER ATRIBUIÇÃO
      // ═══════════════════════════════════════════════════════════════
      if (sub === 'desatribuir' || sub === 'unassign') {
        const labelId = args[1];
        const tipoAlvo = args[2]?.toLowerCase();
        
        if (!labelId || !tipoAlvo) {
          return reply(
            `❓ Usa:\n` +
            `\`${prefix}etiquetaws desatribuir <id> <tipo>\`\n\n` +
            `*Exemplo:*\n` +
            `\`${prefix}etiquetaws desatribuir lbl_123 membro\``
          );
        }

        // Encontrar atribuição
        const atribuicoes = await etiquetasManager.listarAtribuicoesAlvo({
          alvoJid: ctx.remoteJid,
          tipoAlvo,
        });

        const atribuicao = atribuicoes.find(a => a.labelId === labelId);
        if (!atribuicao) {
          return reply(`❌ Atribuição não encontrada.`);
        }

        try {
          await etiquetasManager.removerAtribuicao(atribuicao.atribuicaoId);
          return reply(`✅ *Etiqueta removida do ${tipoAlvo}!*`);
        } catch (e) {
          return reply(`❌ Erro: ${e.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // AJUDA PADRÃO
      // ═══════════════════════════════════════════════════════════════
      return reply(
        `❓ *Comandos disponíveis:*\n\n` +
        `\`${prefix}etiquetaws criar <nome>\`\n` +
        `\`${prefix}etiquetaws lista\`\n` +
        `\`${prefix}etiquetaws add <id> <tipo>\`\n` +
        `\`${prefix}etiquetaws remover <id>\`\n` +
        `\`${prefix}etiquetaws buscar <texto>\`\n` +
        `\`${prefix}etiquetaws ver <id>\`\n` +
        `\`${prefix}etiquetaws editar <id>\`\n` +
        `\`${prefix}etiquetaws cores\`\n` +
        `\`${prefix}etiquetaws emojis\`\n` +
        `\`${prefix}etiquetaws stats\``
      );
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !minhasetiquetas — Ver etiquetas do usuário
  // ═══════════════════════════════════════════════════════════════
  registerCase(['minhasetiquetas', 'mylabels', 'mytags'],
    async ({ sock, msg, ctx, isOwner, reply, prefix }) => {
      if (!isOwner) {
        return reply('❌ Apenas o dono do bot pode usar.');
      }

      try {
        const etiquetas = await etiquetasManager.listarEtiquetas({
          criadorJid: ctx.senderJid,
          activa: true,
        });

        if (etiquetas.length === 0) {
          return reply(`📋 *Nenhuma etiqueta criada.*\n\nUse:\n\`${prefix}etiquetaws criar <nome>\``);
        }

        let resposta = `🏷️ *MINHAS ETIQUETAS* (${etiquetas.length})\n\n`;
        
        for (const et of etiquetas) {
          resposta += `${et.emoji} *${et.nome}*\n`;
          resposta += `  \`(${et.labelId})\`\n`;
          const usos = et.totalMembros + et.totalGrupos + et.totalConversas;
          resposta += `  ${usos} uso(s)\n\n`;
        }

        resposta += `*Para gerir:*\n\`${prefix}etiquetaws\``;

        return reply(resposta);
      } catch (e) {
        return reply(`❌ Erro: ${e.message}`);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !etiquetados — Ver quem está etiquetado
  // ═══════════════════════════════════════════════════════════════
  registerCase(['etiquetados', 'labeled', 'tagged'],
    async ({ sock, msg, ctx, isOwner, reply }) => {
      if (!isOwner) {
        return reply('❌ Apenas o dono do bot pode usar.');
      }

      try {
        const atribuicoes = await etiquetasManager.listarAtribuicoesAlvo({
          alvoJid: ctx.remoteJid,
          activa: true,
        });

        if (atribuicoes.length === 0) {
          return reply(`📋 *Nenhum membro etiquetado neste grupo.*`);
        }

        // Agrupar por etiqueta
        const porEtiqueta = {};
        for (const attr of atribuicoes) {
          if (!porEtiqueta[attr.labelId]) porEtiqueta[attr.labelId] = [];
          porEtiqueta[attr.labelId].push(attr.alvoNumero || attr.alvoJid);
        }

        let resposta = `🏷️ *MEMBROS ETIQUETADOS*\n\n`;
        
        for (const [labelId, membros] of Object.entries(porEtiqueta)) {
          const etiqueta = await etiquetasManager.getEtiqueta(labelId);
          if (etiqueta) {
            resposta += `${etiqueta.emoji} *${etiqueta.nome}* (${membros.length})\n`;
            resposta += membros.map(m => `  • ${m}`).join('\n');
            resposta += '\n\n';
          }
        }

        return reply(resposta);
      } catch (e) {
        return reply(`❌ Erro: ${e.message}`);
      }
    }
  );
};
