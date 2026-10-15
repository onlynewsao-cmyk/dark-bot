/**
 * DARK BOT v7.41 — A VOZ DA AURA EM TUDO
 *
 * Auditoria: havia sítios onde ela falava como sistema:
 *   • "Não consegui: <erro técnico>"           (auraBrain/auraActions)
 *   • "Diz outra vez o que queres, sem rodeios."(auraInterpret)
 *   • "Entendi." / "Ok." / "👋"                  (fallback offline genérico)
 *   • "_confusa_ Ai... Não entendi muito bem"    (fallback offline do dono)
 *   • comandos executados por conversa a devolver "❌ Uso: !cmd <arg>"
 *
 * Este módulo dá-lhe SEMPRE uma resposta com o jeito dela, consoante
 * o que aconteceu (não percebeu / não conseguiu / faltou algo / o
 * comando falou como bot), quem fala (Dark vs outros) e o humor.
 * Nunca a mesma frase duas vezes seguidas no mesmo chat.
 */
'use strict';

const _ultima = new Map(); // jid → última frase usada

function _pick(jid, lista) {
  const prev = _ultima.get(jid);
  const opts = lista.length > 1 ? lista.filter(x => x !== prev) : lista;
  const r = opts[Math.floor(Math.random() * opts.length)];
  _ultima.set(jid, r);
  return r;
}

const F = {
  // não percebeu o que a pessoa quer
  naoPercebi: {
    dark: [
      'Não percebi bem, Dark. Podes explicar de outra forma?',
      'Ficou-me a faltar contexto. O que queres exactamente?',
      'Não apanhei a ideia — podes reformular?',
    ],
    outros: [
      'Não percebi. Podes explicar de outra forma?',
      'O que queres dizer exactamente?',
      'Podes reformular?',
    ],
  },
  // percebeu mas a acção falhou
  naoConsegui: {
    dark: [
      'Tentei, mas a acção falhou, Dark. Podes tentar outra vez mais tarde?',
      'Não consegui executar agora. Queres que tente de outra forma?',
      'A acção não foi concluída. Posso tentar novamente.',
    ],
    outros: [
      'Não consegui executar isso agora. Tenta novamente mais tarde.',
      'A acção falhou e não foi concluída.',
      'Não deu desta vez. Podes tentar outra vez mais tarde.',
    ],
  },
  // falta informação para executar (arg em falta)
  faltaAlgo: {
    dark: [
      'Para avançar, só me falta {oque}, Dark.',
      'Preciso de {oque} para continuar.',
      'Falta-me {oque}.',
    ],
    outros: [
      'Preciso de {oque} para continuar.',
      'Diz-me {oque} e avanço.',
    ],
  },
  // não pode (permissão)
  naoPodes: {
    outros: [
      'Essa acção exige {precisa}.',
      'Só podes fazer isso se tiveres permissão para {precisa}.',
      'Para isso precisas de {precisa}.',
    ],
  },
  // IA indisponível / sem resposta gerada
  semCabeca: {
    dark: [
      'Não consegui gerar uma resposta agora, Dark. Podes repetir?',
      'A resposta não foi gerada desta vez. Tenta novamente daqui a pouco.',
    ],
    outros: [
      'Não consegui gerar uma resposta agora. Tenta novamente daqui a pouco.',
      'A resposta não foi gerada desta vez.',
    ],
  },
};

function _fill(s, vars = {}) {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

/**
 * Frase com o jeito dela.
 * @param {'naoPercebi'|'naoConsegui'|'faltaAlgo'|'naoPodes'|'semCabeca'} tipo
 * @param {{jid?:string,isOwner?:boolean,oque?:string,precisa?:string}} o
 */
function dizer(tipo, o = {}) {
  const grupo = F[tipo] || F.naoPercebi;
  const lista = (o.isOwner && grupo.dark) ? grupo.dark : (grupo.outros || grupo.dark);
  return _fill(_pick(o.jid || '_', lista), o);
}

/** Uma mensagem tem cara de sistema/bot? (erro técnico, "Uso:", stack…) */
const RE_BOT = /^(❌|⚠️|⛔|🚫|erro|error|uso:|usage|exception|typeerror|referenceerror|cannot read|undefined|null|failed|não consegui:|nao consegui:|s[oó] (o )?(dono|admin|adm|vip)s? pode|apenas (o )?(dono|admin|adm|vip)|comando (exclusivo|restrito|apenas))/i;
const RE_TEC = /\b(TypeError|ReferenceError|SyntaxError|RangeError|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|status code \d{3}|at \w+ \(|node_modules|\.js:\d+|request failed|axios|timeout of \d+ms)\b/i;
function pareceBot(texto) {
  const t = String(texto || '').trim();
  if (!t) return false;
  return RE_BOT.test(t) || RE_TEC.test(t);
}

/**
 * Reformula respostas técnicas com linguagem clara e concisa. Mantém a
 * informação útil ("Uso: !ban @pessoa" → "só me falta a pessoa") e não
 * afirma que a acção foi concluída quando houve falha.
 */
function humanizar(texto, o = {}) {
  const t = String(texto || '').trim();
  if (!t) return dizer('naoConsegui', o);
  if (!pareceBot(t)) return t;
  // pedido de argumento ("Uso: !cmd <x>" / "Marca a pessoa" / "Diz o nome")
  const uso = t.match(/uso:\s*\S+\s+(.+)/i);
  if (uso) {
    let oque = uso[1].replace(/[<>\[\]]/g, '').trim();
    oque = oque.replace(/@\w+/g, 'a pessoa (marca com @)').replace(/\|/g, ' ou ');
    return dizer('faltaAlgo', { ...o, oque });
  }
  if (/marca|menciona|@/i.test(t) && /pessoa|alguém|alguem|quem/i.test(t)) return dizer('faltaAlgo', { ...o, oque: 'saber quem é (marca com @ ou responde à mensagem)' });
  if (/link|url/i.test(t) && /manda|envia|coloca|diz/i.test(t)) return dizer('faltaAlgo', { ...o, oque: 'o link' });
  if (/permiss|só (o )?(dono|admin)|apenas (o )?(dono|admin)|not allowed|não tens/i.test(t)) return dizer('naoPodes', { ...o, precisa: /dono/i.test(t) ? 'ser o Dono' : 'ser admin' });
  // erro técnico → esconde, mas guarda uma pista curta se for legível
  const pista = t.replace(/^[❌⚠️⛔🚫]\s*/, '').replace(/[`*_]/g, '').split('\n')[0].slice(0, 70);
  const legivel = pista && !RE_TEC.test(pista) && !/^(erro|error)\b/i.test(pista) && pista.length > 6;
  return dizer('naoConsegui', o) + (legivel ? `\n> ${pista}` : '');
}

/**
 * Envolve o sock para que tudo o que um comando executado POR CONVERSA
 * envia com cara de bot saia na voz dela. Reacções e média passam intactas.
 */
function sockNaVozDela(sock, o = {}) {
  if (!sock || typeof sock.sendMessage !== 'function') return sock;
  const orig = sock.sendMessage.bind(sock);
  return new Proxy(sock, {
    get(t, k) {
      if (k !== 'sendMessage') return t[k];
      return async (jid, content, opts) => {
        try {
          if (content && typeof content.text === 'string' && pareceBot(content.text)) {
            content = { ...content, text: humanizar(content.text, { ...o, jid }) };
          }
        } catch {}
        return orig(jid, content, opts);
      };
    },
  });
}

module.exports = { dizer, humanizar, pareceBot, sockNaVozDela };
