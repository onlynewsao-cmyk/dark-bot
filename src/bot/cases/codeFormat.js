/**
 * DARK BOT v13.15 — Formatação de Código
 * 
 * Comandos para enviar código formatado (WhatsApp renderiza nativamente)
 * AURA agora usa blocos de código automaticamente
 */
'use strict';

module.exports = function registerCodeFormatCases(registerCase) {

  // ═══════════════════════════════════════════════════════════════
  // !code — Formatar texto como bloco de código
  // ═══════════════════════════════════════════════════════════════
  registerCase(['code', 'codigo', 'código', 'formatar'], 
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const partes = text.split(/\s+/);
      const lang = partes[0]?.toLowerCase() || 'javascript';
      const codigo = text.slice(lang.length).trim();
      
      if (!codigo) {
        return reply(
          `💻 *FORMATAR CÓDIGO*\n\n` +
          `*Uso:*\n` +
          `\`${prefix}code <linguagem> <código>\`\n` +
          `\`${prefix}code js const x = 1;\`\n` +
          `\`${prefix}code python print("oi")\`\n\n` +
          `*Linguagens suportadas:*\n` +
          `javascript, python, java, c, cpp, html, css, php, sql, bash, json, xml, markdown`
        );
      }
      
      // Enviar com bloco de código (WhatsApp renderiza nativamente)
      const textoFormatado = `\`\`\`${lang}\n${codigo}\n\`\`\``;
      await sock.sendMessage(ctx.remoteJid, { text: textoFormatado }, { quoted: msg });
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !codefile — Enviar código como ficheiro .js/.py/etc
  // ═══════════════════════════════════════════════════════════════
  registerCase(['codefile', 'ficheirocode', 'arquivocode'], 
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const extensao = args[0]?.toLowerCase() || 'js';
      const codigo = text.slice(extensao.length).trim();
      
      if (!codigo) {
        return reply(`❓ Uso: \`${prefix}codefile <extensao> <código>\``);
      }
      
      const mapaExt = {
        'js': 'javascript', 'javascript': 'javascript',
        'py': 'python', 'python': 'python',
        'java': 'java', 'c': 'c', 'cpp': 'cpp',
        'html': 'html', 'css': 'css', 'php': 'php',
        'sql': 'sql', 'sh': 'bash', 'bash': 'bash',
        'json': 'json', 'xml': 'xml', 'md': 'markdown',
      };
      
      const mimeMapa = {
        'javascript': 'application/javascript',
        'python': 'text/x-python',
        'java': 'text/x-java',
        'html': 'text/html',
        'css': 'text/css',
        'php': 'text/x-php',
        'sql': 'text/x-sql',
        'bash': 'text/x-sh',
        'json': 'application/json',
        'xml': 'application/xml',
        'markdown': 'text/markdown',
      };
      
      const lang = mapaExt[extensao] || extensao;
      const mime = mimeMapa[lang] || 'text/plain';
      const nomeFicheiro = `codigo.${extensao}`;
      
      await sock.sendMessage(ctx.remoteJid, {
        document: Buffer.from(codigo, 'utf8'),
        fileName: nomeFicheiro,
        mimetype: mime,
        caption: `💻 Código (${lang})`
      }, { quoted: msg });
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // !snippets — Enviar snippet de código com formatação
  // ═══════════════════════════════════════════════════════════════
  registerCase(['snippets', 'snippet', 'exemplo'], 
    async ({ sock, msg, ctx, args, text, prefix, reply }) => {
      const tipo = args[0]?.toLowerCase() || 'exemplo';
      
      const snippets = {
        'bemvindo': {
          lang: 'javascript',
          code: `case 'bemvindo': {
  let txt = \`💜 *BEM VINDO(A) @\${m.pushName}*\n\nSeja bem vindo ao 💜 RAVENA BOT 💜\nLeia as regras na descrição 📜\nDigite \${prefix}menu para ver os comandos\`;
  await conn.sendMessage(m.chat, { text: txt, mentions: [m.sender] });
  break
}`
        },
        'parceria': {
          lang: 'javascript', 
          code: `case 'parceria': {
  if(!isAdmin) return reply('❌ Só admins');
  if(args[0]==='on') {
    fs.writeFileSync('./database/parceria.json', 'true');
    reply('✅ Parceria ativada');
  } else {
    fs.writeFileSync('./database/parceria.json', 'false');
    reply('❌ Parceria desativada');
  }
  break
}`
        },
        'exemplo': {
          lang: 'javascript',
          code: `// Exemplo de comando
registerCase(['meucomando'], async ({ sock, msg, ctx, args, reply }) => {
  const texto = args.join(' ');
  if (!texto) return reply('❓ Uso: !meucomando <texto>');
  
  await sock.sendMessage(ctx.remoteJid, {
    text: \`✅ Recebi: \${texto}\`
  }, { quoted: msg });
});`
        }
      };
      
      const snippet = snippets[tipo] || snippets.exemplo;
      const textoFormatado = `\`\`\`${snippet.lang}\n${snippet.code}\n\`\`\``;
      
      await sock.sendMessage(ctx.remoteJid, { 
        text: `💻 *Snippet: ${tipo}*\n\n${textoFormatado}` 
      }, { quoted: msg });
    }
  );
};
