'use strict';
/** Observa só envios concluídos, sem confundir reacções com respostas.
 * Não persiste textos/JIDs nem faz envios por iniciativa própria.
 */
const TEXTO_FALHA = 'Recebi a tua mensagem, mas não consegui preparar a resposta agora. Podes tentar novamente?';
function temResposta(content) {
  if (!content || typeof content !== 'object') return false;
  if (typeof content.text === 'string' && content.text.trim()) return true;
  return ['audio', 'image', 'video', 'sticker', 'document', 'contacts', 'location', 'interactiveMessage', 'listMessage', 'poll'].some(k => !!content[k]);
}
function acompanhar(sock) {
  let enviada = false;
  const proxy = new Proxy(sock, {
    get(target, prop) {
      if (prop === 'sendMessage') return async (...args) => {
        const result = await target.sendMessage(...args);
        if (temResposta(args[1])) enviada = true;
        return result;
      };
      if (prop === 'relayMessage' && typeof target.relayMessage === 'function') return async (...args) => {
        const result = await target.relayMessage(...args);
        // Relay é usado para cartões/listas nativos, não para presenças.
        if (args[1] && Object.keys(args[1]).some(k => !['reactionMessage', 'protocolMessage'].includes(k))) enviada = true;
        return result;
      };
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { sock: proxy, respondeu: () => enviada };
}
module.exports = { acompanhar, temResposta, TEXTO_FALHA };
