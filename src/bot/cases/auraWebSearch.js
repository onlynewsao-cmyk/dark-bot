/**
 * DARK BOT v13.14 — Comandos Web Search para AURA
 * 
 * !pesquisa — pesquisa geral (wiki + web + youtube + news)
 * !noticias — só notícias
 * !wiki — só Wikipedia
 * !youtube — só YouTube
 * !download — baixar de URLs (usa sistema existente)
 */
'use strict';

module.exports = function registerWebSearchCases(registerCase) {

  // ═══════════════════════════════════════════════════════════════
  // !pesquisa — pesquisa completa
  // ═══════════════════════════════════════════════════════════════
  registerCase(['pesquisa', 'pesquisar', 'search', 'buscar', 'procura'],
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const query = text.replace(/^(pesquisa|pesquisar|search|buscar|procura)\s*/i, '').trim();
      
      if (!query) {
        return reply(
          `🔍 *PESQUISA WEB*\n\n` +
          `*Uso:*\n` +
          `\`${prefix}pesquisa <texto>\` — pesquisa completa\n` +
          `\`${prefix}pesquisa wiki <texto>\` — só Wikipedia\n` +
          `\`${prefix}pesquisa news <texto>\` — só notícias\n` +
          `\`${prefix}pesquisa yt <texto>\` — só YouTube\n` +
          `\`${prefix}pesquisa web <texto>\` — só web\n\n` +
          `*Exemplos:*\n` +
          `\`${prefix}pesquisa Lua\`\n` +
          `\`${prefix}pesquisa wiki Albert Einstein\`\n` +
          `\`${prefix}pesquisa news Angola\``
        );
      }

      const replyMsg = await reply(`🔍 A pesquisar *"${query}"*...`);
      
      try {
        const webSearch = require('../../aura/auraWebSearch');
        
        // Detectar sub-tipo
        let tipo = 'auto';
        let buscaQuery = query;
        
        if (/^(wiki|wikipedia)\s+/i.test(query)) {
          tipo = 'wiki';
          buscaQuery = query.replace(/^(wiki|wikipedia)\s+/i, '');
        } else if (/^(news|not[ií]cia)\s+/i.test(query)) {
          tipo = 'news';
          buscaQuery = query.replace(/^(news|not[ií]cia)\s+/i, '');
        } else if (/^(yt|youtube|v[ií]deo)\s+/i.test(query)) {
          tipo = 'youtube';
          buscaQuery = query.replace(/^(yt|youtube|v[ií]deo)\s+/i, '');
        } else if (/^(web|site)\s+/i.test(query)) {
          tipo = 'web';
          buscaQuery = query.replace(/^(web|site)\s+/i, '');
        }

        const resultados = await webSearch.searchMaster(buscaQuery, { tipo });
        const textoFinal = webSearch.formatarParaWA(resultados);
        
        await sock.sendMessage(ctx.remoteJid, { 
          text: textoFinal,
          edit: replyMsg?.key 
        }).catch(() => {
          sock.sendMessage(ctx.remoteJid, { text: textoFinal }, { quoted: msg });
        });
      } catch (e) {
        reply(`❌ Erro na pesquisa: ${e.message}`);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !noticias — só notícias
  // ═══════════════════════════════════════════════════════════════
  registerCase(['noticias', 'notícia', 'noticias', 'news', 'manchete'],
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const query = text.replace(/^(noticias|notícia|news|manchete)\s*/i, '').trim();
      
      if (!query) {
        return reply(
          `📰 *NOTÍCIAS*\n\n` +
          `*Uso:*\n` +
          `\`${prefix}noticias <texto>\` — busca notícias\n\n` +
          `*Exemplos:*\n` +
          `\`${prefix}noticias Angola\`\n` +
          `\`${prefix}noticias futebol\`\n` +
          `\`${prefix}noticias tecnologia\``
        );
      }

      const replyMsg = await reply(`📰 A buscar notícias sobre *"${query}"*...`);
      
      try {
        const webSearch = require('../../aura/auraWebSearch');
        const resultados = await webSearch.searchMaster(query, { tipo: 'news' });
        const textoFinal = webSearch.formatarParaWA(resultados);
        
        await sock.sendMessage(ctx.remoteJid, { 
          text: textoFinal,
          edit: replyMsg?.key
        }).catch(() => {
          sock.sendMessage(ctx.remoteJid, { text: textoFinal }, { quoted: msg });
        });
      } catch (e) {
        reply(`❌ Erro na busca: ${e.message}`);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !wiki — só Wikipedia
  // ═══════════════════════════════════════════════════════════════
  registerCase(['wiki', 'wikipedia', 'wikipédia'],
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const query = text.replace(/^(wiki|wikipedia|wikipédia)\s*/i, '').trim();
      
      if (!query) {
        return reply(
          `📚 *WIKIPEDIA*\n\n` +
          `*Uso:*\n` +
          `\`${prefix}wiki <texto>\` — busca na Wikipedia\n\n` +
          `*Exemplos:*\n` +
          `\`${prefix}wiki Albert Einstein\`\n` +
          `\`${prefix}wiki Luanda\``
        );
      }

      const replyMsg = await reply(`📚 A pesquisar na Wikipedia *"${query}"*...`);
      
      try {
        const webSearch = require('../../aura/auraWebSearch');
        const resultados = await webSearch.searchMaster(query, { tipo: 'wiki' });
        const textoFinal = webSearch.formatarParaWA(resultados);
        
        await sock.sendMessage(ctx.remoteJid, { 
          text: textoFinal,
          edit: replyMsg?.key
        }).catch(() => {
          sock.sendMessage(ctx.remoteJid, { text: textoFinal }, { quoted: msg });
        });
      } catch (e) {
        reply(`❌ Erro na pesquisa: ${e.message}`);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !youtube — só YouTube
  // ═══════════════════════════════════════════════════════════════
  registerCase(['youtube', 'yt', 'ytsearch', 'ytube'],
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const query = text.replace(/^(youtube|yt|ytsearch|ytube)\s*/i, '').trim();
      
      if (!query) {
        return reply(
          `🎬 *YOUTUBE*\n\n` +
          `*Uso:*\n` +
          `\`${prefix}youtube <texto>\` — busca no YouTube\n\n` +
          `*Exemplos:*\n` +
          `\`${prefix}youtube música angolana\`\n` +
          `\`${prefix}yt tutorial JavaScript\``
        );
      }

      const replyMsg = await reply(`🎬 A pesquisar no YouTube *"${query}"*...`);
      
      try {
        const webSearch = require('../../aura/auraWebSearch');
        const resultados = await webSearch.searchMaster(query, { tipo: 'youtube' });
        const textoFinal = webSearch.formatarParaWA(resultados);
        
        await sock.sendMessage(ctx.remoteJid, { 
          text: textoFinal,
          edit: replyMsg?.key
        }).catch(() => {
          sock.sendMessage(ctx.remoteJid, { text: textoFinal }, { quoted: msg });
        });
      } catch (e) {
        reply(`❌ Erro na pesquisa: ${e.message}`);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !download — baixar de URLs (integração com downloads existente)
  // ═══════════════════════════════════════════════════════════════
  registerCase(['dl', 'baixar', 'download'],
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const url = text.replace(/^(dl|baixar|download)\s*/i, '').trim();
      
      if (!url) {
        return reply(
          `📥 *DOWNLOAD*\n\n` +
          `*Uso:*\n` +
          `\`${prefix}dl <URL>\` — baixa de sites suportados\n\n` +
          `*Sites suportados:*\n` +
          `• YouTube\n` +
          `• TikTok\n` +
          `• Instagram\n` +
          `• Facebook\n` +
          `• Twitter/X\n` +
          `• E mais...`
        );
      }

      if (!/^https?:\/\//i.test(url)) {
        return reply(`❌ URL inválido. Usa formato: https://...`);
      }

      // Delegar para o sistema de downloads existente
      try {
        const downloads = require('./downloads');
        // downloads.js usa o formato registerCase — precisamos invocar manualmente
        // ou usar o caseHandler.runCase
        const ch = require('../caseHandler');
        const ok = await ch.runCase('play', {
          sock, msg, ctx,
          args: [url],
          text: url,
          prefix,
          isOwner: ctx.isOwner,
          config: require('../../config'),
        });
        
        if (!ok) {
          reply(`❓ Não consegui baixar desse link. Tenta com:\n\`${prefix}play ${url}\``);
        }
      } catch (e) {
        reply(`❌ Erro: ${e.message}\n\nTenta: \`${prefix}play ${url}\``);
      }
    }
  );
};
