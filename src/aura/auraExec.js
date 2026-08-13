'use strict';
/**
 * AURA EXEC — v6.81
 * ═══════════════════════════════════════════════════════════
 * Executa as capacidades do auraBrain. Cada `case` liga a uma
 * função REAL que já existia em megaActions/advancedActions —
 * ~130 funções que estavam escritas e que ninguém chamava.
 *
 * Contrato de retorno: { ok, msg, silencioso? }
 *   - msg: o que dizer ao Dark (curto, humano, sem jargão)
 *   - silencioso: true = não responde nada (ex.: ficou muda)
 */

const brain = require('./auraBrain');
const mega = require('./actions/megaActions');

// ── Ajudas ──────────────────────────────────────────────────

/** O número de quem foi mencionado, ou de quem se respondeu. */
function alvoDaMensagem(msg, ctx) {
  const ctxInfo = msg?.message?.extendedTextMessage?.contextInfo;
  const mencionado = ctxInfo?.mentionedJid?.[0];
  if (mencionado) return mencionado;
  const citado = ctxInfo?.participant;
  if (citado) return citado;
  return null;
}

/** Descarrega a imagem da mensagem (ou da que foi citada). */
async function imagemDaMensagem(msg, sock) {
  try {
    const direta = msg?.message?.imageMessage;
    const citada = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    if (!direta && !citada) return null;

    const alvo = direta
      ? msg
      : { key: msg.key, message: { imageMessage: citada } };

    const { downloadMediaMessage } = require('@systemzero/baileys');
    const buf = await downloadMediaMessage(alvo, 'buffer', {}, {
      reuploadRequest: sock?.updateMediaMessage,
    });
    return buf && buf.length > 500 ? buf : null;
  } catch {
    return null;
  }
}

/** Emoji pedido na frase, senão 🖤. */
function emojiDaFrase(texto) {
  const m = String(texto || '').match(/\p{Extended_Pictographic}[\uFE0F\u200D]*/gu);
  return m && m.length ? m[m.length - 1] : '🖤';
}

// ── Executor ────────────────────────────────────────────────

async function executar(id, arg, { sock, msg, ctx, texto, isOwner, isAdmin }) {
  const jid = ctx.remoteJid;
  const M = brain.modos(jid);

  switch (id) {
    // ══ MODOS ═════════════════════════════════════════════
    case 'modo_so_audio':
      brain.setModo(jid, 'soAudio', true);
      return { ok: true, msg: 'Feito. Daqui para a frente só falo por áudio aqui. 🎙️' };

    case 'modo_so_texto':
      brain.setModo(jid, 'soAudio', false);
      return { ok: true, msg: 'Ok, volto ao texto.' };

    case 'modo_so_dono':
      brain.setModo(jid, 'soDono', true);
      return { ok: true, msg: 'Só falo contigo agora. Os outros que se desenrasquem. 🖤' };

    case 'modo_todos':
      brain.setModo(jid, 'soDono', false);
      brain.modos(jid).ignorados.clear();
      return { ok: true, msg: 'Voltei a responder a toda a gente.' };

    case 'modo_reagir_tudo':
      brain.setModo(jid, 'reagirTudo', true);
      brain.setModo(jid, 'semReagir', false);
      return { ok: true, msg: 'Vou reagir às mensagens aqui. 👀' };

    case 'modo_nao_reagir':
      brain.setModo(jid, 'semReagir', true);
      brain.setModo(jid, 'reagirTudo', false);
      return { ok: true, msg: 'Parei com os emojis.' };

    case 'modo_mudo':
      brain.setModo(jid, 'mudo', true);
      return { ok: true, msg: 'Calada. 🤐' };

    case 'modo_falar':
      brain.setModo(jid, 'mudo', false);
      return { ok: true, msg: 'Voltei. Sentiste a minha falta? 😏' };

    case 'ignorar_pessoa': {
      const alvo = alvoDaMensagem(msg, ctx);
      if (!alvo) return { ok: false, msg: 'Marca a pessoa ou responde à mensagem dela, para eu saber quem é.' };
      brain.ignorar(jid, alvo.split('@')[0]);
      return { ok: true, msg: 'Pronto, essa pessoa deixou de existir para mim.' };
    }

    case 'designorar_pessoa': {
      const alvo = alvoDaMensagem(msg, ctx);
      if (!alvo) return { ok: false, msg: 'Marca a pessoa, para eu saber de quem falas.' };
      brain.designorar(jid, alvo.split('@')[0]);
      return { ok: true, msg: 'Já volto a falar com ela.' };
    }

    // ══ ATITUDE ═══════════════════════════════════════════
    // Devolvem `gerar` — quem chama passa isto à IA como
    // instrução de tom, para sair no estilo dela e não num
    // texto enlatado.
    case 'xingar': {
      const alvo = alvoDaMensagem(msg, ctx);
      return {
        ok: true, gerar: true, mencionar: alvo ? [alvo] : [],
        instrucao: `O Dark mandou-te XINGAR ${alvo ? 'a pessoa marcada' : 'a pessoa de quem ele fala'}. Ataca a sério: 1-3 frases, cortante, criativo, sem dó. Sem palavrões de baixo nível repetidos — humilha com inteligência. Nada de avisos nem desculpas.`,
      };
    }

    case 'zoar': {
      const alvo = alvoDaMensagem(msg, ctx);
      return {
        ok: true, gerar: true, mencionar: alvo ? [alvo] : [],
        instrucao: `O Dark mandou-te ZOAR ${alvo ? 'a pessoa marcada' : 'essa pessoa'}. Goza com ela: 1-2 frases com piada, provocador mas divertido, não é para magoar a sério.`,
      };
    }

    case 'respeitar': {
      const alvo = alvoDaMensagem(msg, ctx);
      return {
        ok: true, gerar: true, mencionar: alvo ? [alvo] : [],
        instrucao: 'Pediu-te RESPEITO. Trata essa pessoa com respeito, 1-2 frases, sem sermão e sem falar de regras ou de zoar os outros.',
      };
    }

    case 'elogiar': {
      const alvo = alvoDaMensagem(msg, ctx);
      return {
        ok: true, gerar: true, mencionar: alvo ? [alvo] : [],
        instrucao: 'O Dark mandou-te ELOGIAR essa pessoa. Diz algo genuíno e caloroso, 1-2 frases.',
      };
    }

    // ══ REACÇÕES ══════════════════════════════════════════
    case 'reagir_msg': {
      const emoji = arg && /\p{Extended_Pictographic}/u.test(arg) ? arg : emojiDaFrase(texto);
      const ctxInfo = msg?.message?.extendedTextMessage?.contextInfo;
      const chave = ctxInfo?.stanzaId
        ? { remoteJid: jid, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false }
        : msg.key;
      await sock.sendMessage(jid, { react: { text: emoji, key: chave } });
      return { ok: true, silencioso: true };
    }

    // ══ STATUS ════════════════════════════════════════════
    case 'postar_status': {
      const img = await imagemDaMensagem(msg, sock);
      const legenda = (arg || '').trim();
      if (!img && !legenda) {
        return { ok: false, msg: 'Manda a foto (ou diz-me o texto) que eu ponho no status.' };
      }
      const r = img
        ? await mega.postStatus(sock, legenda, img, 'image')
        : await mega.postStatus(sock, legenda, null, 'text');
      return r?.success
        ? { ok: true, msg: 'Publicado no status. ✅' }
        : { ok: false, msg: `Não deu para publicar: ${r?.message || 'erro'}` };
    }

    // ══ CANAIS ════════════════════════════════════════════
    case 'canal_seguir': {
      const alvoCanal = (arg || '').trim();
      if (!alvoCanal) return { ok: false, msg: 'Manda o link do canal.' };
      const jidCanal = alvoCanal.includes('@newsletter')
        ? alvoCanal
        : (alvoCanal.match(/[0-9]{5,}@newsletter/) || [])[0];
      if (!jidCanal) return { ok: false, msg: 'Esse link não me parece de um canal. Manda o link certo.' };
      const r = await mega.followChannel(sock, jidCanal);
      return r?.success
        ? { ok: true, msg: 'Já sigo o canal. ✅' }
        : { ok: false, msg: `Não consegui seguir: ${r?.message || 'erro'}` };
    }

    case 'canal_postar': {
      const conteudo = (arg || '').trim();
      if (!conteudo) return { ok: false, msg: 'Diz-me o que queres que publique no canal.' };
      return {
        ok: true, gerar: true,
        instrucao: `O Dark quer que publiques num canal: "${conteudo}". Escreve o post pronto a publicar — bem escrito, com emojis a sério, formatado para WhatsApp. Só o texto do post.`,
        posConteudo: 'canal',
      };
    }

    case 'canal_reagir': {
      // v6.82: passou a dar. O fork tem newsletterFetchMessages +
      // newsletterReactMessage — varre as publicações e reage a cada uma.
      const canais = require('./auraCanais');
      const emoji = emojiDaFrase(texto) || '🕸️';

      // o canal pode vir por link na frase, ou ser o próprio chat
      const alvo = /whatsapp\.com\/channel\//i.test(texto || '')
        ? texto
        : (/@newsletter$/.test(jid) ? jid : (arg || texto));

      await sock.sendMessage(ctx.remoteJid, { text: `A reagir com ${emoji}... dá-me uns segundos.` })
        .catch(() => {});

      const r = await canais.reagirTudoCanal(sock, alvo, emoji, 30);
      return r.ok ? { ok: true, msg: r.msg } : { ok: false, msg: r.msg };
    }

    // ══ ENTRAR POR LINK / PARTILHAR (v6.82) ═══════════════
    case 'entrar_link': {
      const canais = require('./auraCanais');
      const r = await canais.entrarPorLink(sock, texto);
      if (!r.ok) return { ok: false, msg: r.msg };

      // se ele disse "entra e reage", faz as duas coisas
      if (r.tipo === 'canal' && /\brea(ge|gir|ja)\b/i.test(texto || '')) {
        const emoji = emojiDaFrase(texto) || '🕸️';
        const rr = await canais.reagirTudoCanal(sock, r.jid, emoji, 30);
        return { ok: true, msg: `${r.msg}\n${rr.msg}` };
      }
      return { ok: true, msg: r.msg };
    }

    case 'reencaminhar': {
      const canais = require('./auraCanais');

      // a mensagem a partilhar é a que ele respondeu
      const citada = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!citada) {
        return { ok: false, msg: 'Responde à mensagem que queres que eu partilhe e diz outra vez.' };
      }

      const grupos = await canais.meusGrupos(sock, false);
      if (!grupos.length) return { ok: false, msg: 'Não estou em nenhum grupo.' };

      // não devolve ao grupo de onde veio
      const destinos = grupos.map(g => g.id).filter(id => id !== ctx.remoteJid);
      if (!destinos.length) return { ok: false, msg: 'Só estou neste grupo — não há para onde mandar.' };

      await sock.sendMessage(ctx.remoteJid, {
        text: `A reencaminhar para ${destinos.length} grupo${destinos.length === 1 ? '' : 's'}...`,
      }).catch(() => {});

      const r = await canais.reencaminhar(sock, { message: citada }, destinos);
      return { ok: r.ok, msg: r.msg };
    }

    // ══ GRUPO ═════════════════════════════════════════════
    case 'promover_admin': {
      const grupo = require('./auraGrupo');
      return grupo.executarPedido(sock, {
        ctx, msg, texto,
        pedido: grupo.detectarPedidoGrupo(texto, { temPendente: !!grupo.verPendente(jid) })
          || { acao: 'promote', deSi: true },
      });
    }

    case 'rebaixar_admin': {
      const grupo = require('./auraGrupo');
      return grupo.executarPedido(sock, {
        ctx, msg, texto,
        pedido: { acao: 'demote', deSi: false },
      });
    }

    case 'sair_grupo': {
      if (!ctx.isGroup) return { ok: false, msg: 'Isto não é um grupo.' };
      const r = await mega.leaveGroup(sock, jid);
      return r?.success
        ? { ok: true, msg: 'Saí. Até qualquer dia. 🖤', jaSaiu: true }
        : { ok: false, msg: `Não consegui sair: ${r?.message || 'erro'}` };
    }

    case 'foto_grupo': {
      if (!ctx.isGroup) return { ok: false, msg: 'Isto não é um grupo.' };
      const img = await imagemDaMensagem(msg, sock);
      if (!img) return { ok: false, msg: 'Manda a foto (ou responde a ela) que eu ponho no grupo.' };
      const r = await mega.setGroupPhoto(sock, jid, img);
      return r?.success
        ? { ok: true, msg: 'Foto do grupo trocada. ✅' }
        : { ok: false, msg: `Não deu: ${r?.message || 'erro'}` };
    }

    case 'foto_perfil': {
      const img = await imagemDaMensagem(msg, sock);
      if (!img) return { ok: false, msg: 'Manda a foto que eu ponho no meu perfil.' };
      const r = await mega.setProfilePicture(sock, img);
      return r?.success
        ? { ok: true, msg: 'Mudei a minha foto. Que tal? 😏' }
        : { ok: false, msg: `Não deu: ${r?.message || 'erro'}` };
    }

    case 'listar_membros': {
      if (!ctx.isGroup) return { ok: false, msg: 'Isto não é um grupo.' };
      const r = await mega.listGroupMembers(sock, jid);
      const lista = r?.members || r?.participants || [];
      if (!lista.length) return { ok: false, msg: 'Não consegui buscar os membros.' };
      return { ok: true, msg: `São ${lista.length} pessoas neste grupo.` };
    }

    case 'listar_admins': {
      if (!ctx.isGroup) return { ok: false, msg: 'Isto não é um grupo.' };
      const r = await mega.listGroupAdmins(sock, jid);
      const lista = r?.admins || [];
      if (!lista.length) return { ok: false, msg: 'Não consegui buscar os admins.' };
      const nums = lista.map(a => '@' + String(a.id || a).split('@')[0]);
      return { ok: true, msg: `Admins: ${nums.join(', ')}`, mencionar: lista.map(a => a.id || a) };
    }

    case 'info_grupo': {
      if (!ctx.isGroup) return { ok: false, msg: 'Isto não é um grupo.' };
      const r = await mega.getGroupInfo(sock, jid);
      const i = r?.info || r;
      if (!i?.subject) return { ok: false, msg: 'Não consegui buscar a info.' };
      return {
        ok: true,
        msg: `*${i.subject}*\n${i.participants?.length || 0} membros\n${i.desc ? '\n' + String(i.desc).slice(0, 200) : ''}`,
      };
    }

    case 'limpar_chat': {
      const r = await mega.clearChat(sock, jid);
      return r?.success
        ? { ok: true, msg: 'Chat limpo.' }
        : { ok: false, msg: 'O WhatsApp não me deixou limpar este chat.' };
    }

    // ══ MEMÓRIA ═══════════════════════════════════════════
    case 'lembrar': {
      const facto = (arg || '').trim();
      if (!facto) return { ok: false, msg: 'Lembrar o quê? Diz-me.' };
      try {
        // usa o sistema de memória que já existia — `importante:true`
        // manda para o MongoDB em vez do cache de 1 hora.
        const mem = require('./auraMemory');
        await mem.guardar(ctx.senderNumber, facto, { importante: true });
        return { ok: true, msg: 'Guardado. Não me esqueço. 🖤' };
      } catch {
        return { ok: false, msg: 'Não consegui guardar isso agora.' };
      }
    }

    case 'esquecer': {
      try {
        const BotConfig = require('../database/models/BotConfig');
        const key = 'aura_facts_' + String(ctx.senderNumber || '').replace(/\D/g, '');
        const alvo = brain.norm(arg || '');
        const doc = await BotConfig.findOne({ key }).lean().catch(() => null);
        const arr = Array.isArray(doc?.value) ? doc.value : [];
        if (!arr.length) return { ok: true, msg: 'Não tenho nada guardado sobre ti.' };
        const ficam = alvo ? arr.filter(x => !brain.norm(x.t).includes(alvo)) : [];
        await BotConfig.updateOne({ key }, { $set: { key, value: ficam } }, { upsert: true });
        const n = arr.length - ficam.length;
        return { ok: true, msg: n > 0 ? 'Esquecido.' : 'Não tinha nada disso guardado.' };
      } catch {
        return { ok: false, msg: 'Não consegui apagar isso.' };
      }
    }

    case 'recordar': {
      try {
        const mem = require('./auraMemory');
        const r = await mem.lembrar(ctx.senderNumber);
        const todos = [...(r.importante || []), ...(r.recente || [])];
        if (!todos.length) return { ok: true, msg: 'Não tenho nada guardado sobre ti.' };
        const alvo = brain.norm(arg || '');
        const achados = alvo ? todos.filter(t => brain.norm(t).includes(alvo)) : todos.slice(-5);
        if (!achados.length) return { ok: true, msg: 'Disso não me lembro.' };
        return { ok: true, msg: achados.map(t => '• ' + t).join('\n') };
      } catch {
        return { ok: false, msg: 'Não consegui ir à memória agora.' };
      }
    }

    // ══ AGENDAMENTO ═══════════════════════════════════════
    case 'agendar_conteudo': {
      const pedido = (arg || texto || '').trim();
      try {
        const ag = require('./auraAgenda');
        return await ag.criar(pedido, { jid, sock });
      } catch (e) {
        return { ok: false, msg: 'O agendamento ainda não está ligado — é a próxima fase.' };
      }
    }

    case 'parar_agendamento': {
      try {
        const ag = require('./auraAgenda');
        return await ag.parar(jid);
      } catch {
        return { ok: false, msg: 'Não há nada agendado.' };
      }
    }

    default:
      return { ok: false, msg: null };
  }
}

module.exports = { executar, alvoDaMensagem, imagemDaMensagem, emojiDaFrase };
