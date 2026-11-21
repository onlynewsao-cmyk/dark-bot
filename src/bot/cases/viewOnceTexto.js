/**
 * DARK BOT v13.16 — Visualização Única para Texto
 * 
 * !votexto / !textoviewonce — Envia texto em visualização única
 * WhatsApp nativamente só suporta foto/vídeo/áudio em view-once
 * Este comando simula view-once para texto usando interactive message
 */
'use strict';

module.exports = function registerViewOnceTexto(registerCase) {

  // ═══════════════════════════════════════════════════════════════
  // !votexto — Enviar texto em visualização única
  // ═══════════════════════════════════════════════════════════════
  registerCase(['votexto', 'textoviewonce', 'viewoncetexto', 'sohvisualizar texto'],
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const conteudo = text.replace(/^(votexto|textoviewonce|viewoncetexto)\s*/i, '').trim();
      
      if (!conteudo) {
        return reply(
          `👁️ *TEXTO EM VISUALIZAÇÃO ÚNICA*\n\n` +
          `*Uso:*\n` +
          `\`${prefix}votexto <texto>\` — envia texto view-once\n\n` +
          `*Exemplo:*\n` +
          `\`${prefix}votexto Esta mensagem só pode ser vista uma vez!\`\n\n` +
          `*Nota:* O destinatário só pode abrir o texto uma vez.`
        );
      }

      // WhatsApp não suporta view-once nativo para texto puro
      // Solução: usar interactive message com viewOnce wrapper
      try {
        const buttonHandler = require('../buttonHandler');
        
        // Criar mensagem interactive com viewOnce
        const interactiveMsg = {
          viewOnceMessage: {
            message: {
              interactiveMessage: {
                body: {
                  text: conteudo
                },
                header: {
                  title: '👁️ Mensagem de Visualização Única',
                  hasMediaAttachment: false
                },
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: 'cta_copy',
                      buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copiar Texto',
                        copy_code: conteudo
                      })
                    }
                  ],
                  messageParamsJson: '{}'
                }
              }
            }
          }
        };

        await sock.relayMessage(ctx.remoteJid, interactiveMsg, {
          messageId: require('crypto').randomBytes(16).toString('hex').toUpperCase()
        });

        reply(`✅ Texto enviado em visualização única!\n\nO destinatário só poderá ver uma vez.`);
      } catch (e) {
        // Fallback: enviar como mensagem normal com aviso
        const textoComAviso = `👁️ *MENSAGEM DE VISUALIZAÇÃO ÚNICA*\n\n${conteudo}\n\n_(Esta mensagem deveria ser view-once, mas o teu WhatsApp não suporta. Considera atualizar.)_`;
        await sock.sendMessage(ctx.remoteJid, { text: textoComAviso }, { quoted: msg });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !vofoto — Enviar imagem em visualização única (reforço)
  // ═══════════════════════════════════════════════════════════════
  registerCase(['vofoto', 'fotinhaview', 'imgviewonce'],
    async ({ sock, msg, ctx, prefix, reply }) => {
      // Verificar se há imagem citada ou anexada
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imagem = quoted?.imageMessage || msg.message?.imageMessage;
      
      if (!imagem) {
        return reply(
          `📸 *FOTO EM VISUALIZAÇÃO ÚNICA*\n\n` +
          `*Uso:*\n` +
          `1. Envie/Responda a uma imagem\n` +
          `2. Use \`${prefix}vofoto\`\n\n` +
          `A imagem será enviada como visualização única (abre 1×).`
        );
      }

      try {
        const { downloadMediaMessage } = require('baileys-v6');
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: imagem } },
          'buffer',
          {},
          { logger: { level: 'silent' } }
        );

        if (!buffer) {
          return reply('❌ Falha ao baixar a imagem.');
        }

        await sock.sendMessage(ctx.remoteJid, {
          image: buffer,
          caption: imagem.caption || '',
          viewOnce: true
        }, { quoted: msg });

        reply(`✅ Foto enviada em visualização única!`);
      } catch (e) {
        reply(`❌ Erro: ${e.message}`);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !vovideo — Enviar vídeo em visualização única
  // ═══════════════════════════════════════════════════════════════
  registerCase(['vovideo', 'videoview', 'vidviewonce'],
    async ({ sock, msg, ctx, prefix, reply }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const video = quoted?.videoMessage || msg.message?.videoMessage;
      
      if (!video) {
        return reply(
          `🎬 *VÍDEO EM VISUALIZAÇÃO ÚNICA*\n\n` +
          `*Uso:*\n` +
          `1. Envie/Responda a um vídeo\n` +
          `2. Use \`${prefix}vovideo\`\n\n` +
          `O vídeo será enviado como visualização única.`
        );
      }

      try {
        const { downloadMediaMessage } = require('baileys-v6');
        const buffer = await downloadMediaMessage(
          { message: { videoMessage: video } },
          'buffer',
          {},
          { logger: { level: 'silent' } }
        );

        if (!buffer) {
          return reply('❌ Falha ao baixar o vídeo.');
        }

        await sock.sendMessage(ctx.remoteJid, {
          video: buffer,
          caption: video.caption || '',
          viewOnce: true
        }, { quoted: msg });

        reply(`✅ Vídeo enviado em visualização única!`);
      } catch (e) {
        reply(`❌ Erro: ${e.message}`);
      }
    }
  );
};
