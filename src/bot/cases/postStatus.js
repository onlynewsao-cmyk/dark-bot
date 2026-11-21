/**
 * DARK BOT v13.4 — Postar Status/Stories
 *
 * Comando: !poststatus
 * - Posta texto como Status/Story do WhatsApp
 * - Posta em grupos (como mensagem)
 * - Posta em canais (newsletter)
 * - Posta em comunidades (announcement)
 *
 * Não precisa ser admin — apenas o dono do bot pode postar
 */

'use strict';

module.exports = function registerPostStatusCases(registerCase) {

  // ═══════════════════════════════════════════════════════════════
  // !poststatus — Postar Status/Story
  // ═══════════════════════════════════════════════════════════════
  registerCase(['poststatus', 'statuspost', 'postarstatus', 'publicarstatus'],
    async ({ sock, msg, ctx, args, text, isOwner, reply }) => {
      if (!isOwner) {
        return reply('❌ Apenas o dono pode postar status.');
      }

      const tipo = String(args[0] || '').toLowerCase();
      const conteudo = text.slice(tipo.length).trim() || args.join(' ');

      if (!conteudo) {
        return reply(
          `📸 *POSTAR STATUS/STORY*\n\n` +
          `*Uso:*\n` +
          `\`!poststatus status <texto>\` — posta como story\n` +
          `\`!poststatus grupo <jid> <texto>\` — posta no grupo\n` +
          `\`!poststatus canal <texto>\` — posta no canal\n` +
          `\`!poststatus comunidade <texto>\` — posta na comunidade\n\n` +
          `*Exemplos:*\n` +
          `\`!poststatus status Bom dia a todos!\`\n` +
          `\`!poststatus grupo 120363...@g.us Anúncio!\`\n` +
          `\`!poststatus canal Novidade importante!\``
        );
      }

      switch (tipo) {
        // ═══════════════════════════════════════════════════════════════
        // POSTAR COMO STATUS/STORY (stories do WhatsApp)
        // ═══════════════════════════════════════════════════════════════
        case 'status':
        case 'story':
        case 'stories': {
          try {
            // Status no WhatsApp é enviado para status@broadcast
            await sock.sendMessage('status@broadcast', {
              text: conteudo
            });

            await reply(
              `✅ *Status Postado!*\n\n` +
              `📸 O teu status foi publicado com sucesso.\n\n` +
              `*Conteúdo:*\n${conteudo.slice(0, 100)}${conteudo.length > 100 ? '...' : ''}\n\n` +
              `*Dica:* Os teus contactos verão este status nas próximas 24h.`
            );
          } catch (e) {
            await reply(`❌ *Erro ao postar status:* ${e.message}`);
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // POSTAR EM GRUPO (mensagem normal no grupo)
        // ═══════════════════════════════════════════════════════════════
        case 'grupo':
        case 'gp': {
          const jid = args[1];
          const texto = args.slice(2).join(' ') || conteudo;

          if (!jid) {
            return reply('❌ Especifica o JID do grupo:\n`!poststatus grupo <jid> <texto>`');
          }

          try {
            await sock.sendMessage(jid, {
              text: texto
            });

            await reply(
              `✅ *Mensagem Postada no Grupo!*\n\n` +
              `*Grupo:* ${jid}\n` +
              `*Conteúdo:*\n${texto.slice(0, 100)}${texto.length > 100 ? '...' : ''}`
            );
          } catch (e) {
            await reply(`❌ *Erro ao postar no grupo:* ${e.message}`);
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // POSTAR EM CANAL (newsletter)
        // ═══════════════════════════════════════════════════════════════
        case 'canal':
        case 'channel':
        case 'newsletter': {
          try {
            const auraCanais = require('../aura/auraCanais');
            const canal = await auraCanais.meuCanal();

            if (!canal) {
              return reply(
                `❌ *Nenhum canal conectado.*\n\n` +
                `*Para conectar:*\n` +
                `\`!canal adotar <link-do-canal>\`\n\n` +
                `*Ou criar um novo:*\n` +
                `\`!canal criar <nome> | <descrição>\``
              );
            }

            await sock.sendMessage(canal.jid, {
              text: conteudo
            });

            await reply(
              `✅ *Post Publicado no Canal!*\n\n` +
              `*Canal:* ${canal.name || 'Principal'}\n` +
              `*Conteúdo:*\n${conteudo.slice(0, 100)}${conteudo.length > 100 ? '...' : ''}`
            );
          } catch (e) {
            await reply(`❌ *Erro ao postar no canal:* ${e.message}`);
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // POSTAR EM COMUNIDADE (announcement da comunidade)
        // ═══════════════════════════════════════════════════════════════
        case 'comunidade':
        case 'community': {
          try {
            const grupos = await sock.groupFetchAllParticipating();
            const comunidades = Object.values(grupos).filter(g => g.isCommunity);

            if (comunidades.length === 0) {
              return reply(
                `❌ *Nenhuma comunidade encontrada.*\n\n` +
                `*Para criar uma comunidade RPG:*\n` +
                `\`!comunidade criar <nome>\`\n\n` +
                `*Ou o bot detecta automaticamente quando entra numa comunidade.*`
              );
            }

            // Pegar a primeira comunidade
            const comunidade = comunidades[0];
            const announcementJid = comunidade.id.replace('@g.us', '@announce.g.us');

            try {
              await sock.sendMessage(announcementJid, {
                text: conteudo
              });

              await reply(
                `✅ *Post Publicado na Comunidade!*\n\n` +
                `*Comunidade:* ${comunidade.subject}\n` +
                `*Conteúdo:*\n${conteudo.slice(0, 100)}${conteudo.length > 100 ? '...' : ''}\n\n` +
                `*Dica:* Este anúncio aparece para todos os membros da comunidade.`
              );
            } catch (e) {
              await reply(
                `❌ *Erro ao postar na comunidade:*\n${e.message}\n\n` +
                `*Possíveis causas:*\n` +
                `• Bot não é admin da comunidade\n` +
                `• Permissões insuficientes\n` +
                `• Comunidade não permite posts`
              );
            }
          } catch (e) {
            await reply(`❌ *Erro ao aceder às comunidades:* ${e.message}`);
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // LISTAR GRUPOS/CANAIS/COMUNIDADES DISPONÍVEIS
        // ═══════════════════════════════════════════════════════════════
        case 'listar':
        case 'lista': {
          let resultado = `📋 *ONDE PODES POSTAR:*\n\n`;

          // Grupos
          try {
            const grupos = await sock.groupFetchAllParticipating();
            const lista = Object.values(grupos);
            resultado += `📱 *GRUPOS (${lista.length}):*\n`;
            lista.slice(0, 10).forEach(g => {
              resultado += `• ${g.subject}\n  \`${g.id}\`\n`;
            });
            if (lista.length > 10) resultado += `... e mais ${lista.length - 10}\n`;
            resultado += `\n`;
          } catch (e) {
            resultado += `❌ Erro ao listar grupos\n\n`;
          }

          // Canais
          try {
            const auraCanais = require('../aura/auraCanais');
            const canal = await auraCanais.meuCanal();
            if (canal) {
              resultado += `📢 *CANAL:*\n`;
              resultado += `• ${canal.name || 'Principal'}\n  \`${canal.jid}\`\n\n`;
            } else {
              resultado += `📢 *CANAL:* Nenhum conectado\n\n`;
            }
          } catch (e) {
            resultado += `📢 *CANAL:* Erro ao verificar\n\n`;
          }

          // Comunidades
          try {
            const grupos = await sock.groupFetchAllParticipating();
            const comunidades = Object.values(grupos).filter(g => g.isCommunity);
            if (comunidades.length > 0) {
              resultado += `👥 *COMUNIDADES (${comunidades.length}):*\n`;
              comunidades.forEach(c => {
                resultado += `• ${c.subject}\n  \`${c.id}\`\n`;
              });
            } else {
              resultado += `👥 *COMUNIDADES:* Nenhuma encontrada\n`;
            }
          } catch (e) {
            resultado += `👥 *COMUNIDADES:* Erro ao verificar\n`;
          }

          await reply(resultado);
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // AJUDA
        // ═══════════════════════════════════════════════════════════════
        default: {
          await reply(
            `📸 *POSTAR STATUS/STORY*\n\n` +
            `*Uso:*\n` +
            `\`!poststatus status <texto>\` — posta como story\n` +
            `\`!poststatus grupo <jid> <texto>\` — posta no grupo\n` +
            `\`!poststatus canal <texto>\` — posta no canal\n` +
            `\`!poststatus comunidade <texto>\` — posta na comunidade\n` +
            `\`!poststatus listar\` — mostra onde podes postar\n\n` +
            `*Exemplos:*\n` +
            `\`!poststatus status Bom dia!\`\n` +
            `\`!poststatus grupo 120363...@g.us Anúncio!\`\n` +
            `\`!poststatus canal Novidade!\`\n` +
            `\`!poststatus comunidade Reunião às 20h!\`\n\n` +
            `*Notas:*\n` +
            `• Status: aparece nos stories dos teus contactos (24h)\n` +
            `• Grupo: envia mensagem no grupo (precisa JID)\n` +
            `• Canal: precisa conectar com \`!canal adotar\`\n` +
            `• Comunidade: bot precisa ser admin`
          );
        }
      }
    }
  );
};
