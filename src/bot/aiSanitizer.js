/**
 * DARK BOT v7.3 — AI Response Sanitizer
 * Limpa respostas da IA antes de enviar no WhatsApp
 *
 * Problemas resolvidos:
 *  - Código fonte em blocos ``` (WhatsApp não renderiza)
 *  - HTML entities (&gt; &lt; &amp;)
 *  - Markdown excessivo (**bold**, _italic_, ~~strike~~)
 *  - Disclaimers longos no final
 *  - Respostas demasiado longas
 */
'use strict';

/**
 * Limpa uma resposta da IA para WhatsApp
 * @param {string} text - resposta raw da IA
 * @param {object} opts - opções
 * @returns {string} texto limpo
 */
function sanitizeAI(text, opts = {}) {
  if (!text) return '';
  const { maxLength = 3000, keepCode = false } = opts;
  let t = String(text);

  // 1. Decodifica HTML entities
  t = t
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 2. Remove blocos de código
  if (!keepCode) {
    // Remove ```...``` blocos (e o conteúdo)
    t = t.replace(/```[\w]*\n[\s\S]*?```/g, (match) => {
      // Extrai só o conteúdo, sem as tags
      const inner = match.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
      // Se é código curto (< 5 linhas), mantém como texto
      const lines = inner.split('\n');
      if (lines.length <= 3) return inner;
      // Se é código longo, remove (provavelmente é exemplo de código)
      return '';
    });

    // Remove código inline `...` 
    t = t.replace(/`([^`]{1,100})`/g, '$1');
  }

  // 3. Limpa markdown excessivo
  // **bold** → texto
  t = t.replace(/\*\*([^*]{1,200})\*\*/g, '$1');
  // _italic_ → texto (mas preserva _sorri_ style)
  t = t.replace(/(?<!\w)_([^_]{2,100})_(?!\w)/g, '$1');
  // ~~strike~~ → texto
  t = t.replace(/~~([^~]{1,100})~~/g, '$1');

  // Preserve factual caveats, consent/safety information and provider boundaries.

  // 5. Remove linhas vazias excessivas
  t = t.replace(/\n{3,}/g, '\n\n');

  // 6. Remove espaços no início/fim de cada linha
  t = t.split('\n').map(l => l.trimEnd()).join('\n').trim();

  // 7. Trunca se muito longo
  if (t.length > maxLength) {
    t = t.slice(0, maxLength).replace(/\n\S*$/, '') + '\n\n_[resposta truncada]_';
  }

  // 8. Se ficou vazio após limpeza, retorna mensagem padrão
  if (!t) return ''; // Never invent a reply after formatting.

  return t;
}

module.exports = { sanitizeAI };
