/**
 * DARK BOT v13.3 — Teste de Postagem em Grupos, Canais e Comunidades
 *
 * Comando: !testpost
 * - Testa enviar mensagem em grupos
 * - Testa enviar mensagem em canais (newsletters)
 * - Testa enviar mensagem em comunidades
 * - Mostra resultados e erros
 */

'use strict';

const GroupSettings = require('../../database/models/GroupSettings');

module.exports = function registerTestPostCases(registerCase) {

  registerCase(['testpost', 'testepost', 'postarteste', 'testpublicar'],
    async ({ sock, msg, ctx, args, isOwner, reply, prefix }) => {
      if (!isOwner) {
        return reply('❌ Apenas o dono pode usar este comando.');
      }

      const tipo = String(args[0] || '').toLowerCase();
      const texto = args.slice(1).join(' ') || `🧪 *Teste de Postagem*\n\nEste é um teste automático do Dark Bot v13.3\nTimestamp: ${new Date().toLocaleString('pt-PT')}`;

      let resultado = '';

      switch (tipo) {
        // ═══════════════════════════════════════════════════════════════
        // TESTE EM GRUPOS
        // ═══════════════════════════════════════════════════════════════
        case 'grupo':
        case 'grupos': {
          resultado = `🧪 *TESTE EM GRUPOS*\n\n`;
          
          // Testar no grupo atual
          try {
            await sock.sendMessage(ctx.remoteJid, {
              text: `${texto}\n\n✅ *Sucesso!* Mensagem enviada neste grupo.`
            });
            resultado += `✅ Grupo atual: *Sucesso*\n`;
          } catch (e) {
            resultado += `❌ Grupo atual: *Falhou* - ${e.message}\n`;
          }

          // Listar outros grupos
          try {
            const grupos = await sock.groupFetchAllParticipating();
            const lista = Object.values(grupos).slice(0, 5); // Só 5 para teste
            
            resultado += `\n📋 *Outros grupos (${Object.keys(grupos).length} total):*\n`;
            
            for (const g of lista) {
              if (g.id === ctx.remoteJid) continue; // Já testado
              try {
                await sock.sendMessage(g.id, {
                  text: `${texto}\n\n🧪 *Teste em ${g.subject}*`
                });
                resultado += `✅ ${g.subject}: *Sucesso*\n`;
              } catch (e) {
                resultado += `❌ ${g.subject}: *Falhou*\n`;
              }
            }
          } catch (e) {
            resultado += `\n❌ Erro ao listar grupos: ${e.message}\n`;
          }

          await reply(resultado);
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // TESTE EM CANAIS (NEWSLETTERS)
        // ═══════════════════════════════════════════════════════════════
        case 'canal':
        case 'canais':
        case 'newsletter': {
          resultado = `🧪 *TESTE EM CANAIS*\n\n`;
          
          try {
            // Verificar se há newsletter conectada
            const meuCanal = require('../aura/auraCanais');
            const canal = await meuCanal.meuCanal();
            
            if (!canal) {
              resultado += `⚠️ *Nenhum canal conectado.*\n\n`;
              resultado += `*Para conectar um canal:*\n`;
              resultado += `\`${prefix}canal adotar <link-do-canal>\`\n\n`;
              resultado += `*Ou criar um novo:*\n`;
              resultado += `\`${prefix}canal criar <nome> | <descrição>\``;
            } else {
              resultado += `📢 *Canal encontrado:*\n`;
              resultado += `Nome: ${canal.name || 'Sem nome'}\n`;
              resultado += `JID: ${canal.jid}\n\n`;
              
              try {
                await sock.sendMessage(canal.jid, {
                  text: `${texto}\n\n📢 *Teste no canal ${canal.name || 'principal'}*`
                });
                resultado += `✅ *Sucesso!* Mensagem enviada no canal.`;
              } catch (e) {
                resultado += `❌ *Falha ao enviar:* ${e.message}\n\n`;
                resultado += `*Possíveis causas:*\n`;
                resultado += `• Bot não é admin do canal\n`;
                resultado += `• Canal não permite posts do bot\n`;
                resultado += `• Permissões insuficientes`;
              }
            }
          } catch (e) {
            resultado += `❌ *Erro:* ${e.message}`;
          }

          await reply(resultado);
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // TESTE EM COMUNIDADES
        // ═══════════════════════════════════════════════════════════════
        case 'comunidade':
        case 'comunidades':
        case 'community': {
          resultado = `🧪 *TESTE EM COMUNIDADES*\n\n`;
          
          try {
            // Verificar se há comunidade conectada
            const comunidades = await sock.groupFetchAllParticipating();
            const comunidadesLista = Object.values(comunidades).filter(g => g.isCommunity);
            
            if (comunidadesLista.length === 0) {
              resultado += `⚠️ *Nenhuma comunidade encontrada.*\n\n`;
              resultado += `*Para criar uma comunidade RPG:*\n`;
              resultado += `\`${prefix}comunidade criar <nome>\`\n\n`;
              resultado += `*Ou o bot detecta automaticamente quando entra numa comunidade.*`;
            } else {
              resultado += `👥 *Comunidades encontradas (${comunidadesLista.length}):*\n\n`;
              
              for (const comunidade of comunidadesLista) {
                resultado += `📌 *${comunidade.subject}*\n`;
                resultado += `JID: ${comunidade.id}\n`;
                resultado += `Membros: ${comunidade.size || '?'}\n\n`;
                
                // Tentar enviar no anúncio da comunidade
                const announcementJid = comunidade.id.replace('@g.us', '@announce.g.us');
                try {
                  await sock.sendMessage(announcementJid, {
                    text: `${texto}\n\n📢 *Teste na comunidade ${comunidade.subject}*`
                  });
                  resultado += `✅ *Anúncio: Sucesso*\n\n`;
                } catch (e) {
                  resultado += `❌ *Anúncio: Falhou* - ${e.message}\n\n`;
                }
              }
            }
          } catch (e) {
            resultado += `❌ *Erro:* ${e.message}\n\n`;
            resultado += `*Nota: Comunidades requerem que o bot seja admin.*`;
          }

          await reply(resultado);
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // TESTE GERAL (todos os tipos)
        // ═══════════════════════════════════════════════════════════════
        case 'todos':
        case 'all':
        case 'geral': {
          resultado = `🧪 *TESTE GERAL DE POSTAGEM*\n\n`;
          
          // 1. Grupo
          resultado += `📱 *GRUPOS*\n`;
          try {
            await sock.sendMessage(ctx.remoteJid, {
              text: `${texto}\n\n✅ *Teste em grupo: Sucesso*`
            });
            resultado += `✅ Grupo atual: *Sucesso*\n\n`;
          } catch (e) {
            resultado += `❌ Grupo atual: *Falhou*\n\n`;
          }
          
          // 2. Canal
          resultado += `📢 *CANAIS*\n`;
          try {
            const meuCanal = require('../aura/auraCanais');
            const canal = await meuCanal.meuCanal();
            
            if (canal) {
              try {
                await sock.sendMessage(canal.jid, {
                  text: `${texto}\n\n📢 *Teste em canal: Sucesso*`
                });
                resultado += `✅ Canal ${canal.name}: *Sucesso*\n\n`;
              } catch (e) {
                resultado += `❌ Canal: *Falhou*\n\n`;
              }
            } else {
              resultado += `⚠️ *Nenhum canal conectado*\n\n`;
            }
          } catch (e) {
            resultado += `❌ Erro: ${e.message}\n\n`;
          }
          
          // 3. Comunidade
          resultado += `👥 *COMUNIDADES*\n`;
          try {
            const grupos = await sock.groupFetchAllParticipating();
            const comunidades = Object.values(grupos).filter(g => g.isCommunity);
            
            if (comunidades.length > 0) {
              const comunidade = comunidades[0];
              const announcementJid = comunidade.id.replace('@g.us', '@announce.g.us');
              
              try {
                await sock.sendMessage(announcementJid, {
                  text: `${texto}\n\n📢 *Teste em comunidade: Sucesso*`
                });
                resultado += `✅ Comunidade ${comunidade.subject}: *Sucesso*\n\n`;
              } catch (e) {
                resultado += `❌ Comunidade: *Falhou*\n\n`;
              }
            } else {
              resultado += `⚠️ *Nenhuma comunidade encontrada*\n\n`;
            }
          } catch (e) {
            resultado += `❌ Erro: ${e.message}\n\n`;
          }
          
          resultado += `━━━━━━━━━━━━━━━━━━\n`;
          resultado += `🧪 *Teste concluído!*\n`;
          resultado += `Dark Bot v13.3`;
          
          await reply(resultado);
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // HELP
        // ═══════════════════════════════════════════════════════════════
        default: {
          const ajuda = 
            `🧪 *TESTE DE POSTAGEM*\n\n` +
            `*Uso:* \`${prefix}testpost <tipo> [texto]\`\n\n` +
            `*Tipos disponíveis:*\n` +
            `• \`grupo\` — testa em grupos\n` +
            `• \`canal\` — testa em canais/newsletters\n` +
            `• \`comunidade\` — testa em comunidades\n` +
            `• \`todos\` — testa em todos\n\n` +
            `*Exemplos:*\n` +
            `\`${prefix}testpost grupo Olá grupos!\`\n` +
            `\`${prefix}testpost canal Novidade!\`\n` +
            `\`${prefix}testpost todos Teste geral\`\n\n` +
            `*Notas:*\n` +
            `• Grupos: bot precisa ser admin\n` +
            `• Canais: precisa conectar com \`${prefix}canal adotar\`\n` +
            `• Comunidades: bot precisa ser admin da comunidade`;
          
          await reply(ajuda);
        }
      }
    }
  );
};
