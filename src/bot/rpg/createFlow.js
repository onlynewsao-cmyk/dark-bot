/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — RPG CREATE FLOW (v6.89)                         ║
 * ║   Gerador de personagens por SELECÇÃO (listas clicáveis)     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * `!rpgstart`            → lista clicável de RAÇAS → CLASSES → ficha
 * `!rpgstart Nome`       → idem, com o nome já fixado
 * `!rpgstart N r c`      → caminho escrito directo (continua a funcionar)
 *
 * Os cliques chegam como selectedRowId (RPGPICK_R_<raça> /
 * RPGPICK_C_<classe>) e são interceptados no commandHandler — mesmo
 * mecanismo do CHANGE_THEME_ (provado em produção).
 */
'use strict';

const config = require('../../config');
const rpg = require('./engine');

/** Criações a meio: senderNumber → { name, race } */
const _pendentes = new Map();

function _norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Encontra a chave real (shinobi, pirata…) a partir de texto livre. */
function _acharRaca(txt) {
  const n = _norm(txt);
  if (!n) return '';
  if (rpg.RACES[n]) return n;
  for (const k of Object.keys(rpg.RACES)) if (_norm(k) === n) return k;
  return '';
}
function _acharClasse(txt) {
  const n = _norm(txt);
  if (!n) return '';
  if (rpg.CLASSES[n]) return n;
  for (const k of Object.keys(rpg.CLASSES)) if (_norm(k) === n) return k;
  return '';
}

// ── Envio da lista clicável ─────────────────────────────────
// Mesmo padrão do dynamicSubmenus: interactiveMessage + single_select,
// relay com biz/native_flow. Fallback para texto se o relay falhar.
async function _enviarLista(sock, msg, ctx, titulo, subtitulo, corpo, rows, rodape, cards) {
  // v9.0: primeiro o CARROSSEL com fotos (o corpo já traz o plano-B
  // numerado); não renderizou → lista single_select; falhou → texto.
  if (Array.isArray(cards) && cards.length && sock.waUploadToServer) {
    try {
      const ok = await require('./carousel').enviarCarrossel(sock, msg, ctx, { corpo, rodape, cards });
      if (ok) return 'carousel';
    } catch {}
  }
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid).catch(() => null);
  const textBody = corpo;

  try {
    const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
    const m = generateWAMessageFromContent(ctx.remoteJid, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: textBody }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: rodape }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: titulo,
              sections: [{ title: subtitulo, rows }],
            }),
          }],
        }),
      }),
    }, { userJid: sock.user?.id, quoted: msg });
    await sock.relayMessage(ctx.remoteJid, m.message, {
      messageId: m.key.id,
      additionalNodes: [{ tag: 'biz', attrs: {}, content: [{
        tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
      }]}],
    });
    return true;
  } catch (_) {}

  // fallback: texto (a lista em texto continua navegável por escrito)
  await sock.sendMessage(ctx.remoteJid, { text: textBody }, { quoted: msg }).catch(() => {});
  return false;
}

function _listaRacas(name) {
  const linhas = [
    `🎭 *ESCOLHE A RAÇA DE ${String(name).toUpperCase()}*`,
    '',
    ...Object.entries(rpg.RACES).map(([k, v], i) => `${i + 1}. ${v.emoji} *${k}* — ${v.desc}`),
    '',
    '> 🖱️ Toca numa raça acima para continuar 🎯',
    `> ⌨️ *Se a lista não abrir, escreve*: \`!rpgstart ${String(name).split(' ')[0]} <raça> <classe>\``,
    `> (ex.: \`!rpgstart ${String(name).split(' ')[0]} shinobi guerreiro\`)`,
  ];
  const rows = Object.entries(rpg.RACES).map(([k, v]) => ({
    title: `${v.emoji} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
    description: (v.desc || '').slice(0, 72),
    id: `RPGPICK_R_${k}`,
  }));
  return { linhas, rows };
}

function _listaClasses(name, race) {
  const linhas = [
    `⚔️ *ESCOLHE A CLASSE DE ${String(name).toUpperCase()}*`,
    `${rpg.RACES[race]?.emoji || '🧬'} Raça: *${race}*`,
    '',
    ...Object.entries(rpg.CLASSES).map(([k, v], i) => `${i + 1}. ${v.emoji} *${k}* — ${v.desc}`),
    '',
    '> 🖱️ Toca numa classe acima para nascer 🎯',
    `> ⌨️ *Se a lista não abrir, escreve*: \`!rpgstart ${String(name).split(' ')[0]} ${race} <classe>\``,
    `> (ex.: \`!rpgstart ${String(name).split(' ')[0]} ${race} guerreiro\`)`,
  ];
  const rows = Object.entries(rpg.CLASSES).map(([k, v]) => ({
    title: `${v.emoji} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
    description: (v.desc || '').slice(0, 72),
    id: `RPGPICK_C_${k}`,
  }));
  return { linhas, rows };
}

// ── Cartas de carrossel (com FOTO gerada por IA) ─────────────
// v9.0: as escolhas da criação passam a ser um carrossel — cada raça/
// classe com capa visual gerada no momento (cache por sessão). Se o
// carrossel ou a geração falharem, _enviarLista cai para a lista
// single_select e daí para o texto: nunca beco sem saída.
function _cardsRacas(name) {
  return Object.entries(rpg.RACES).map(([k, v]) => ({
    corpo: `${v.emoji} *${k.toUpperCase()}*\n${v.desc || ''}\n\n> raça de *${String(name).split(' ')[0]}*`,
    rodape: `🎭 ${config.bot.name} · RPG`,
    promptImg: `${k} fantasy RPG race portrait, dark epic anime style, dramatic cinematic light, detailed character art`,
    cacheKey: `race_${k}`,
    botoes: [{ texto: `${v.emoji} Ser ${k}`, id: `RPGPICK_R_${k}` }],
  }));
}
function _cardsClasses(name, race) {
  return Object.entries(rpg.CLASSES).map(([k, v]) => ({
    corpo: `${v.emoji} *${k.toUpperCase()}*\n${v.desc || ''}\n\n> classe p/ *${String(name).split(' ')[0]}* ${rpg.RACES[race]?.emoji || ''} ${race}`,
    rodape: `🎭 ${config.bot.name} · RPG`,
    promptImg: `${k} fantasy RPG hero class, dark epic anime style, dramatic cinematic light, detailed character art`,
    cacheKey: `classe_${k}`,
    botoes: [{ texto: `${v.emoji} Nascer ${k}`, id: `RPGPICK_C_${k}` }],
  }));
}

// ── Ficha final ─────────────────────────────────────────────
async function _ficha(sock, msg, ctx, p) {
  const race = rpg.RACES[p.race] || rpg.RACES.humano;
  const cls = rpg.CLASSES[p.class] || rpg.CLASSES.guerreiro;
  const rank = rpg.getRank(p.level);
  await rpg.savePlayer(p).catch(() => {});

  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid).catch(() => null);
  const linhas = [
    `${race.emoji} *${p.name}* — ${p.race} ${cls.emoji} ${p.class}`,
    `${rank.emoji} Rank ${rank.name} · Nível ${p.level}`,
    '',
    `❤️ ${p.hp}/${p.maxHp} HP · 💙 ${p.mp}/${p.maxMp} MP`,
    `⚔️ STR ${p.stats.str} · 🏃 DEX ${p.stats.dex} · 🔮 INT ${p.stats.int}`,
    `🛡️ VIT ${p.stats.vit} · 🍀 LUK ${p.stats.luk}`,
    `💰 ${p.coins || 0} coins · 🎒 ${(p.inventory || []).length} itens`,
    '',
    '> Personagem criado! Usa *.rg* para ver a ficha completa.',
  ];
  const corpo = t
    ? RE.renderBlock(t, '🎭 PERSONAGEM CRIADO', linhas, { botName: config.bot.name })
    : linhas.join('\n');
  await sock.sendMessage(ctx.remoteJid, { text: corpo }, { quoted: msg }).catch(() => {});
}

async function _finalizar(sock, msg, ctx, name, race, cls) {
  const p = await rpg.getPlayer(ctx.senderNumber);
  // O caminho escrito (!rpgstart Nome raça classe) SOBRESCREVE de propósito
  // (reroll — regressão v6.89 em test-aura-printbugs2.js). O que NÃO repete
  // é o bónus de raça (raceBonusApplied).
  p.name = name || p.name || 'Aventureiro';
  p.race = race;
  p.class = cls;
  p.started = true; // v7.87: personagem real, não implícita

  // bónus da origem escolhida (se houver) — entra nas stats base.
  // v6.90: UMA vez só. Antes somava a cada !rpgstart, pelo que bastava
  // repetir o comando para inflar stats e HP/MP sem limite.
  const origem = rpg.ORIGINS?.[race];
  if (origem?.bonus && !p.raceBonusApplied) {
    p.stats = p.stats || { str: 6, dex: 6, int: 6, vit: 6, luk: 6 };
    for (const [k, v] of Object.entries(origem.bonus)) {
      p.stats[k] = (p.stats[k] || 0) + v;
    }
    p.maxHp = (p.maxHp || 150) + (origem.bonus.vit || 0) * 5;
    p.hp = p.maxHp;
    p.maxMp = (p.maxMp || 80) + (origem.bonus.int || 0) * 5;
    p.mp = p.maxMp;
    p.raceBonusApplied = true;
  }
  await _ficha(sock, msg, ctx, p);
}

// ── API ─────────────────────────────────────────────────────

/** `!rpgstart [Nome] [raça] [classe]` — cria directo ou abre as listas. */
async function start({ sock, msg, ctx, args, _forcar = false }) {
  const tokens = (args || []).map(String).filter(Boolean);
  let race = '', cls = '';
  if (tokens.length >= 2) {
    cls = _acharClasse(tokens[tokens.length - 1]);
    if (cls) tokens.pop();
  }
  if (tokens.length >= 1) {
    race = _acharRaca(tokens[tokens.length - 1]);
    if (race) tokens.pop();
  }
  const name = tokens.join(' ').trim() || ctx.pushName || 'Aventureiro';

  // caminho escrito completo: !rpgstart Nome raça classe
  // v7.95: o caminho ESCRITO e completo cria/sobrescreve DIRECTO —
  // quem escreve nome+raça+classe está a fazer reroll de propósito
  // (contrato v6.89, asserção em test-aura-printbugs2.js). A protecção
  // «já tens personagem» fica só para o uso acidental (!rpgstart a seco
  // ou pela lista), onde um toque no bolso apagava a ficha inteira.
  if (race && cls) return _finalizar(sock, msg, ctx, name, race, cls);

  // v7.90: REFAZER pede confirmação por BOTÕES — antes, teclar !rpgstart
  // por engano apagava a personagem inteira sem aviso.
  if (!_forcar) {
    try {
      const atual = await rpg.peekPlayer(ctx.senderNumber);
      const tem = atual && (atual.started || atual.raceBonusApplied || (atual.name && atual.name !== 'Aventureiro'));
      if (tem) {
        return require('./ui').confirmar(sock, msg, ctx, {
          titulo: `🎭 *${String(atual.name).toUpperCase()} JÁ EXISTE*`,
          linhas: [
            `${atual.race || '?'} ${atual.class || ''} · Nv.${atual.level || 1}`,
            'Refazer apaga stats, itens e moedas — recomeças do zero.',
          ],
          txtSim: '🔁 Refazer',
          txtNao: '🛡️ Manter',
          onSim: async ({ sock, msg, ctx }) => start({ sock, msg, ctx, args, _forcar: true }),
          onNao: async ({ sock, msg, ctx }) => {
            await sock.sendMessage(ctx.remoteJid, {
              text: `🛡️ *${atual.name}* continua intacto — personagem mantida.`,
            }, { quoted: msg }).catch(() => {});
          },
        });
      }
    } catch {}
  }

  // só a raça veio → falta a classe (lista de classes)
  if (race) {
    _pendentes.set(ctx.senderNumber, { name, race });
    const { linhas, rows } = _listaClasses(name, race);
    return _enviarLista(sock, msg, ctx, '⚔️ ESCOLHER CLASSE', 'CLASSES', linhas.join('\n'), rows, `🎭 ${config.bot.name} · RPG`, _cardsClasses(name, race));
  }

  // nada escolhido → lista de raças
  _pendentes.set(ctx.senderNumber, { name });
  const { linhas, rows } = _listaRacas(name);
  return _enviarLista(sock, msg, ctx, '🧬 ESCOLHER RAÇA', 'RAÇAS', linhas.join('\n'), rows, `🎭 ${config.bot.name} · RPG`, _cardsRacas(name));
}

/** Clique RPGPICK_R_<raça> / RPGPICK_C_<classe>. true se consumiu. */
async function pick({ sock, msg, ctx, token }) {
  const m = /^RPGPICK_(R|C)_([a-z]+)$/i.exec(String(token || '').trim());
  if (!m) return false;
  const tipo = m[1].toUpperCase();
  const chave = _acharRaca(m[2]) || _acharClasse(m[2]);
  if (!chave) return false;

  const pend = _pendentes.get(ctx.senderNumber) || { name: ctx.pushName || 'Aventureiro' };

  if (tipo === 'R') {
    const race = _acharRaca(m[2]);
    if (!race) return false;
    _pendentes.set(ctx.senderNumber, { ...pend, race });
    const { linhas, rows } = _listaClasses(pend.name, race);
    await _enviarLista(sock, msg, ctx, '⚔️ ESCOLHER CLASSE', 'CLASSES', linhas.join('\n'), rows, `🎭 ${config.bot.name} · RPG`, _cardsClasses(pend.name, race));
    return true;
  }

  // tipo C — última escolha: a classe fecha a ficha
  const cls = _acharClasse(m[2]);
  if (!cls) return false;
  const race = pend.race || 'humano';
  _pendentes.delete(ctx.senderNumber);
  await _finalizar(sock, msg, ctx, pend.name, race, cls);
  return true;
}

/** Estado (testes). */
function pendentes() { return _pendentes; }

module.exports = { start, pick, pendentes };
