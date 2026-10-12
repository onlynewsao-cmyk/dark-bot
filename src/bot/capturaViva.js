/**
 * v12.9.35 — GRUPOS DO BOT AO VIVO 🎯
 * O dashboard lê TODOS os grupos em que o bot está e captura:
 *   · UM grupo específico (sync, devolve já);
 *   · UMA COMUNIDADE inteira (pai + todos os subgrupos);
 *   · TODOS os grupos — em SEGUNDO PLANO com progresso
 *     (com 1000+ grupos o HTTP síncrono morria a meio).
 * Usa o socket do NÚMERO PRINCIPAL (slot 1) — o mesmo que o dono
 * vê no WhatsApp. Sem duplicados (centralBase decide).
 */
'use strict';
const base = require('./centralBase');
const { communityInfo } = require('./communityDetector');

const _estado = { emCurso: false, modo: '', feitos: 0, total: 0, novos: 0, grupo: '', resultados: null, fim: null, iniciado: null };
const progresso = () => ({ ..._estado });

function _sock() {
  const { getBot } = require('./whatsapp');
  const bot = getBot();
  if (!bot || bot.getStatus().status !== 'connected' || !bot.sock) return null;
  return bot.sock;
}

/** Lista TODOS os grupos do bot (mesma detecção do .comunidade no WhatsApp). */
async function listarVivos({ incluirMetas = false } = {}) {
  const sock = _sock();
  if (!sock) return { ok: false, motivo: 'bot-nao-conectado' };
  const all = await sock.groupFetchAllParticipating().catch(() => ({}));
  const grupos = Object.values(all || {}).map((g) => {
    const comunidade = communityInfo(g);
    return {
      jid: g.id,
      nome: g.subject || 'grupo',
      size: g.participants?.length || g.size || 0,
      // As flags variam entre versões Baileys; communityDetector centraliza a regra.
      comunidade: comunidade.isCommunity,
      pai: comunidade.parentJid,
      isAnnouncement: comunidade.isAnnouncement,
    };
  }).filter((g) => g.jid).sort((a, b) => b.size - a.size);
  // Uma listagem viva confirma a presença sem apagar o histórico dos demais.
  base.registarGruposVivos(grupos);
  // `metas` só fica na chamada interna de captura; nunca vai na resposta da
  // rota HTTP, onde 1000 grupos poderiam gerar uma resposta gigante.
  return incluirMetas
    ? { ok: true, total: grupos.length, grupos, metas: all || {} }
    : { ok: true, total: grupos.length, grupos };
}

/** Captura UM grupo (sync — uma chamada groupMetadata, devolve na hora). */
async function capturarUm(jid) {
  const sock = _sock();
  if (!sock) return { ok: false, motivo: 'bot-nao-conectado' };
  const meta = await sock.groupMetadata(jid).catch((e) => null);
  if (!meta) return { ok: false, motivo: 'grupo-indisponivel' };
  const r = base.capturarGrupo(jid, meta, { fonte: 'dashboard' });
  const s = base.stats();
  return { ok: true, nome: r.nome, novos: r.novos, duplicados: r.duplicados, totalBase: s.total };
}

/**
 * Loop interno de captura (comunidade ou todos), sem limite artificial.
 * Aceita itens { jid, meta } da listagem viva para escalar a 200/1000 grupos
 * sem uma chamada groupMetadata extra por grupo. Só busca metadata quando a
 * lista do WhatsApp não trouxe participantes.
 */
async function _capturarLista(itens, modo) {
  _estado.emCurso = true; _estado.modo = modo; _estado.feitos = 0;
  _estado.total = itens.length; _estado.novos = 0; _estado.resultados = null;
  _estado.iniciado = Date.now(); _estado.fim = null;
  const sock = _sock();
  if (!sock) { _estado.emCurso = false; _estado.fim = Date.now(); _estado.resultados = { ok: false, motivo: 'bot-nao-conectado' }; return; }
  const resultados = [];
  let novos = 0, feitos = 0, falharam = 0;
  base.carregar();
  for (const item of itens) {
    const jid = typeof item === 'string' ? item : item?.jid;
    try {
      let meta = typeof item === 'object' ? item.meta : null;
      // groupFetchAllParticipating normalmente já inclui participantes. Para
      // versões que só trazem size, tenta metadata até 3 vezes antes de falhar.
      if (!Array.isArray(meta?.participants)) {
        let ultimoErro = null;
        for (let tentativa = 1; tentativa <= 3; tentativa++) {
          try { meta = await sock.groupMetadata(jid); if (meta) break; }
          catch (e) { ultimoErro = e; }
          if (tentativa < 3) await new Promise((x) => setTimeout(x, 800 * tentativa));
        }
        if (!meta) throw ultimoErro || new Error('metadata-indisponivel');
      }
      const r = base.capturarGrupo(jid, meta, { fonte: 'captura-geral', persistir: false });
      novos += r.novos;
      resultados.push({ jid, nome: r.nome, novos: r.novos, duplicados: r.duplicados });
    } catch (e) {
      falharam++;
      resultados.push({ jid, erro: String(e.message || e).slice(0, 60) });
    }
    feitos++;
    // Persistência em lote: os contactos E cada origem de grupo já foram
    // registados pela base, inclusive quando não houver contacto novo.
    if (feitos % 25 === 0) base.guardar();
    _estado.feitos = feitos; _estado.novos = novos; _estado.grupo = (resultados[resultados.length - 1] || {}).nome || '';
    await new Promise((x) => setTimeout(x, 350 + Math.floor(Math.random() * 250))); // ritmo humano
  }
  base.guardar();
  const s = base.stats();
  _estado.emCurso = false; _estado.fim = Date.now();
  _estado.resultados = { ok: feitos > falharam, grupos: feitos - falharam, falharam, novos, totalBase: s.total, detalhes: resultados };
}

/** Captura em FUNDO: { todos: true } ou { comunidade: jid } (pai + filhos). */
async function capturarFundo(opts = {}) {
  if (_estado.emCurso) return { ok: false, motivo: 'captura-ja-em-curso', progresso: progresso() };
  const sock = _sock();
  if (!sock) return { ok: false, motivo: 'bot-nao-conectado' };
  let itens = null, modo = '';
  const { grupos, metas } = await listarVivos({ incluirMetas: true });
  if (opts.comunidade) {
    const pai = grupos.find((g) => g.jid === opts.comunidade);
    if (!pai) return { ok: false, motivo: 'grupo-indisponivel' };
    const jids = [...new Set([opts.comunidade, ...grupos.filter((g) => g.pai === opts.comunidade).map((g) => g.jid)])];
    itens = jids.map((jid) => ({ jid, meta: metas?.[jid] || null }));
    modo = 'comunidade';
  } else {
    itens = grupos.map((g) => ({ jid: g.jid, meta: metas?.[g.jid] || null }));
    modo = 'todos';
  }
  if (!itens.length) return { ok: false, motivo: 'sem-grupos' };
  _capturarLista(itens, modo).catch((e) => {
    _estado.emCurso = false; _estado.fim = Date.now();
    _estado.resultados = { ok: false, motivo: String(e?.message || e || 'falha-interna').slice(0, 80) };
  });
  return { ok: true, fundo: true, total: itens.length, progresso: progresso() };
}

module.exports = { listarVivos, capturarUm, capturarFundo, progresso };
