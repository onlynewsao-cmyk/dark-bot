/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — AURA ACTIONS v1                                 ║
 * ║   Ela faz o que uma pessoa faz no WhatsApp                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * O Dark fala normalmente e ela executa. Sem comandos.
 *
 *   "aura cria um grupo chamado Família"   → cria o grupo
 *   "cria um canal chamado Dark News"      → cria o canal
 *   "muda o nome do grupo para X"          → renomeia
 *   "muda a descrição para X"              → altera descrição
 *   "fecha o grupo" / "abre o grupo"       → só admins / todos
 *   "sai deste grupo"                      → sai
 *   "manda o link do grupo"                → link de convite
 *   "muda o meu nome para X"               → nome do perfil
 *   "põe o recado X"                       → status/recado
 *
 * Verificado contra a API do Baileys: groupCreate, newsletterCreate,
 * groupUpdateSubject, groupUpdateDescription, groupSettingUpdate,
 * groupLeave, groupInviteCode, updateProfileName, updateProfileStatus.
 *
 * SEGURANÇA: só o Dono Supremo. Nada disto corre para mais ninguém.
 */

'use strict';

// v6.61: guarda a última comunidade criada por cada dono, para
// "cria um grupo na comunidade" saber onde meter o grupo.
const _ultimaComunidade = new Map();

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrai o nome depois de "chamado/chamada/com o nome/de nome". */
function extrairNome(texto) {
  const m = String(texto).match(/(?:chamad[oa]|com o nome|de nome|nome|:)\s+["'“”]?([^"'“”\n]{2,60})["'“”]?\s*$/i);
  if (m) return m[1].trim();
  // "cria um grupo Família" — nome no fim, sem palavra-chave
  const m2 = String(texto).match(/(?:grupo|canal|newsletter|comunidade)\s+(?:novo\s+|nova\s+)?["'“”]?([^"'“”\n]{2,60})["'“”]?\s*$/i);
  if (m2) {
    const n = m2[1].trim();
    if (!/^(aqui|agora|novo|nova|por favor|pf)$/i.test(n)) return n;
  }
  return null;
}

/** Extrai o valor depois de "para". */
function extrairPara(texto) {
  const m = String(texto).match(/\bpara\s+["'“”]?([^"'“”\n]{1,120})["'“”]?\s*$/i);
  return m ? m[1].trim() : null;
}

/**
 * Detecta a intenção de acção. Devolve null se não for uma ordem.
 * @returns {{acao:string, valor?:string}|null}
 */
function detectarAcao(texto) {
  const t = norm(texto);
  if (!t || t.length > 220) return null;

  // ── Fechar / abrir grupo (antes de "criar": mais específico) ──
  if (/\b(fecha|fechar|tranca|trancar|restringe|silencia)\b/.test(t) && /\bgrupo\b/.test(t)) {
    return { acao: 'fecharGrupo' };
  }
  if (/\b(abre|abrir|destranca|libera|liberta|desbloqueia)\b/.test(t) && /\bgrupo\b/.test(t)) {
    return { acao: 'abrirGrupo' };
  }

  // ── Criar canal (newsletter) ──────────────────────────────
  // v6.54: 'abre' saiu daqui — "abre o grupo" é libertar o grupo,
  // não criar um novo. Só 'cria/faz/monta' criam.
  // 'abre um canal CHAMADO x' é criar; 'abre o grupo' já foi tratado acima
  if (/\b(cria|criar|faz|fazer|monta|montar|abre|abrir)\b/.test(t) && /\b(canal|newsletter)\b/.test(t)) {
    return { acao: 'criarCanal', valor: extrairNome(texto) };
  }

  // ── v6.61: a ordem importa (mais específico primeiro) ─────
  // "cria um grupo NA COMUNIDADE" tem de ser testado antes de
  // "cria uma comunidade" — senão a segunda regra apanha-o e
  // acaba a criar uma comunidade chamada "Avisos".

  // 1. Grupo DENTRO da comunidade
  if (/\b(cria|criar|faz|fazer|adiciona|add|abre|abrir)\b/.test(t) &&
      /\bgrupo\b/.test(t) &&
      /\b(na|dentro da|nesta|da|pra|para a)\s+comunidade\b/.test(t)) {
    return { acao: 'grupoNaComunidade', valor: extrairNome(texto) };
  }

  // 2. Ligar este grupo a uma comunidade
  if (/\b(liga|ligar|junta|juntar|vincula|vincular|associa|mete|poe)\b/.test(t) &&
      /\bcomunidade\b/.test(t)) {
    return { acao: 'ligarComunidade' };
  }

  // 3. Criar a comunidade
  if (/\b(cria|criar|faz|fazer|monta|montar|abre|abrir)\b/.test(t) && /\bcomunidade\b/.test(t)) {
    return { acao: 'criarComunidade', valor: extrairNome(texto) };
  }

  // ── Criar grupo ───────────────────────────────────────────
  if (/\b(cria|criar|faz|fazer|monta|montar)\b/.test(t) && /\bgrupo\b/.test(t)) {
    return { acao: 'criarGrupo', valor: extrairNome(texto) };
  }

  // ── Renomear grupo ────────────────────────────────────────
  if (/\b(muda|mudar|altera|alterar|troca|trocar|renomeia|poe|por)\b/.test(t) &&
      /\bnome\b/.test(t) && /\bgrupo\b/.test(t)) {
    return { acao: 'nomeGrupo', valor: extrairPara(texto) };
  }

  // ── Descrição do grupo ────────────────────────────────────
  if (/\b(muda|mudar|altera|alterar|poe|por|define)\b/.test(t) && /\b(descricao|descrição|assunto|topico|tópico)\b/.test(t)) {
    return { acao: 'descricaoGrupo', valor: extrairPara(texto) };
  }

  // ── Sair do grupo ─────────────────────────────────────────
  if (/\b(sai|sair|abandona|abandonar|deixa)\b.*\b(deste grupo|do grupo|daqui)\b/.test(t)) {
    return { acao: 'sairGrupo' };
  }

  // ── Link de convite ───────────────────────────────────────
  if (/\b(link|convite|invite)\b/.test(t) && /\b(grupo|daqui|deste)\b/.test(t) &&
      /\b(manda|envia|mostra|quero|da|passa|gera)\b/.test(t)) {
    return { acao: 'linkGrupo' };
  }

  // ── Nome do perfil do bot ─────────────────────────────────
  if (/\b(muda|mudar|altera|troca|poe|por)\b/.test(t) && /\b(teu nome|nome do bot|meu nome|nosso nome)\b/.test(t)) {
    return { acao: 'nomePerfil', valor: extrairPara(texto) };
  }

  // ── Recado / status ───────────────────────────────────────
  if (/\b(muda|mudar|altera|poe|por|define|actualiza|atualiza)\b/.test(t) && /\b(recado|status|estado|bio)\b/.test(t)) {
    return { acao: 'recado', valor: extrairPara(texto) };
  }

  return null;
}

// ── Executores ──────────────────────────────────────────────

async function executar(acao, valor, { sock, ctx }) {
  const jid = ctx?.remoteJid;
  const emGrupo = !!ctx?.isGroup;

  switch (acao) {
    case 'criarGrupo': {
      if (!valor) return { ok: false, msg: 'Diz-me o nome do grupo. Ex: *cria um grupo chamado Família*' };
      const donoJid = ctx.senderJid || `${ctx.senderNumber}@s.whatsapp.net`;
      const g = await sock.groupCreate(valor, [donoJid]);
      let link = '';
      try {
        const code = await sock.groupInviteCode(g.id);
        if (code) link = `\nhttps://chat.whatsapp.com/${code}`;
      } catch {}
      return { ok: true, msg: `Pronto, criei o grupo *${valor}* e já te meti lá dentro.${link}` };
    }

    case 'criarCanal': {
      if (!valor) return { ok: false, msg: 'Diz-me o nome do canal. Ex: *cria um canal chamado Dark News*' };
      if (typeof sock.newsletterCreate !== 'function') {
        return { ok: false, msg: 'A minha versão do WhatsApp não deixa criar canais.' };
      }
      const n = await sock.newsletterCreate(valor, `Canal do ${ctx?.botName || 'DARK BOT'}`);
      const id = n?.id || n?.jid || '';
      const invite = n?.invite || n?.inviteCode;
      return {
        ok: true,
        msg: `Criei o canal *${valor}*.` +
             (invite ? `\nhttps://whatsapp.com/channel/${invite}` : (id ? `\nID: ${id}` : '')),
      };
    }

    // ── v6.61: COMUNIDADES ────────────────────────────────
    // A API do Baileys tem communityCreate/communityCreateGroup/
    // communityLinkGroup, mas o bot nunca as usava — por isso
    // "criar comunidade" nunca funcionou.
    case 'criarComunidade': {
      if (!valor) return { ok: false, msg: 'Diz-me o nome. Ex: *cria uma comunidade chamada Dark Net*' };
      if (typeof sock.communityCreate !== 'function') {
        return { ok: false, msg: 'A minha versão do WhatsApp não deixa criar comunidades.' };
      }
      const c = await sock.communityCreate(valor, `Comunidade do ${ctx?.botName || 'DARK BOT'}`);
      const cid = c?.id || c?.jid || '';
      if (!cid) return { ok: false, msg: 'Pedi para criar mas o WhatsApp não devolveu a comunidade.' };

      // guarda a última comunidade — para "cria um grupo na comunidade"
      _ultimaComunidade.set(String(ctx?.senderNumber || ''), cid);

      let link = '';
      try {
        const code = await sock.communityInviteCode?.(cid);
        if (code) link = `\nhttps://chat.whatsapp.com/${code}`;
      } catch {}

      return {
        ok: true,
        msg: `Criei a comunidade *${valor}*.${link}\n\n` +
             `Agora podes dizer *"cria um grupo na comunidade chamado X"*.`,
      };
    }

    case 'grupoNaComunidade': {
      if (!valor) return { ok: false, msg: 'Diz o nome do grupo. Ex: *cria um grupo na comunidade chamado Avisos*' };
      if (typeof sock.communityCreateGroup !== 'function') {
        return { ok: false, msg: 'A minha versão do WhatsApp não deixa isso.' };
      }

      // a comunidade: a última criada, ou a mãe deste grupo
      let comunidade = _ultimaComunidade.get(String(ctx?.senderNumber || ''));
      if (!comunidade && emGrupo) {
        try {
          const meta = await sock.groupMetadata(jid);
          comunidade = meta?.linkedParent || meta?.parentGroup || '';
        } catch {}
      }
      if (!comunidade) {
        return { ok: false, msg: 'Não sei em que comunidade. Cria uma primeiro, ou usa isto dentro de um grupo que já pertença a ela.' };
      }

      const donoJid = ctx.senderJid || `${ctx.senderNumber}@s.whatsapp.net`;
      const g = await sock.communityCreateGroup(valor, [donoJid], comunidade);
      const gid = g?.id || g?.jid || '';

      let link = '';
      try {
        if (gid) {
          const code = await sock.groupInviteCode(gid);
          if (code) link = `\nhttps://chat.whatsapp.com/${code}`;
        }
      } catch {}

      return { ok: true, msg: `Criei o grupo *${valor}* dentro da comunidade.${link}` };
    }

    case 'ligarComunidade': {
      if (!emGrupo) return { ok: false, msg: 'Isto só dá dentro de um grupo.' };
      if (typeof sock.communityLinkGroup !== 'function') {
        return { ok: false, msg: 'A minha versão do WhatsApp não deixa isso.' };
      }
      const comunidade = _ultimaComunidade.get(String(ctx?.senderNumber || ''));
      if (!comunidade) {
        return { ok: false, msg: 'Não sei a que comunidade. Cria uma primeiro com *cria uma comunidade chamada X*.' };
      }
      await sock.communityLinkGroup(jid, comunidade);
      return { ok: true, msg: 'Liguei este grupo à comunidade.' };
    }

    case 'nomeGrupo': {
      if (!emGrupo) return { ok: false, msg: 'Isto só dá dentro de um grupo.' };
      if (!valor) return { ok: false, msg: 'Diz para que nome. Ex: *muda o nome do grupo para X*' };
      await sock.groupUpdateSubject(jid, valor);
      return { ok: true, msg: `Mudei o nome para *${valor}*.` };
    }

    case 'descricaoGrupo': {
      if (!emGrupo) return { ok: false, msg: 'Isto só dá dentro de um grupo.' };
      if (!valor) return { ok: false, msg: 'Diz qual é a descrição. Ex: *muda a descrição para X*' };
      await sock.groupUpdateDescription(jid, valor);
      return { ok: true, msg: 'Descrição actualizada.' };
    }

    case 'fecharGrupo': {
      if (!emGrupo) return { ok: false, msg: 'Isto só dá dentro de um grupo.' };
      await sock.groupSettingUpdate(jid, 'announcement');
      return { ok: true, msg: 'Fechei o grupo. Agora só os admins podem falar.' };
    }

    case 'abrirGrupo': {
      if (!emGrupo) return { ok: false, msg: 'Isto só dá dentro de um grupo.' };
      await sock.groupSettingUpdate(jid, 'not_announcement');
      return { ok: true, msg: 'Abri o grupo. Toda a gente pode falar.' };
    }

    case 'linkGrupo': {
      if (!emGrupo) return { ok: false, msg: 'Isto só dá dentro de um grupo.' };
      const code = await sock.groupInviteCode(jid);
      return { ok: true, msg: `Aqui está:\nhttps://chat.whatsapp.com/${code}` };
    }

    case 'sairGrupo': {
      if (!emGrupo) return { ok: false, msg: 'Isto só dá dentro de um grupo.' };
      await sock.sendMessage(jid, { text: 'Até depois. 🌹' });
      await sock.groupLeave(jid);
      return { ok: true, msg: null }; // já se despediu
    }

    case 'nomePerfil': {
      if (!valor) return { ok: false, msg: 'Diz para que nome.' };
      if (typeof sock.updateProfileName !== 'function') return { ok: false, msg: 'Não consigo mudar o nome agora.' };
      await sock.updateProfileName(valor);
      return { ok: true, msg: `Mudei o meu nome para *${valor}*.` };
    }

    case 'recado': {
      if (!valor) return { ok: false, msg: 'Diz qual é o recado.' };
      if (typeof sock.updateProfileStatus !== 'function') return { ok: false, msg: 'Não consigo mudar o recado agora.' };
      await sock.updateProfileStatus(valor);
      return { ok: true, msg: 'Recado actualizado.' };
    }

    default:
      return { ok: false, msg: null };
  }
}

module.exports = { detectarAcao, executar, extrairNome, extrairPara, norm, _ultimaComunidade };
