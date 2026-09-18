'use strict';
/**
 * v7.87 — RPG MUNDO FECHADO 🌍
 * O RPG é um mundo à parte e comporta-se como tal:
 *
 *  1. GRUPO SEM MODO → o mundo está fechado: `!modorpg on` (admin) abre.
 *     (PV é o mundo pessoal do jogador — sempre aberto.)
 *  2. SEM PERSONAGEM → só o portal de entrada e a vitrine funcionam:
 *     o resto responde "cria o teu personagem com !rpgstart".
 *
 * Falha ABERTA em excepções de I/O: se a DB cair, o jogo não pode
 * matar o bot inteiro — mas com DB viva o mundo fica fechado.
 */

// Gestão / setup / menus / guias — abrem em qualquer lugar (não são jogo).
const LIVRE_TUDO = new Set([
  'setarena', 'setdungeons', 'settrocas', 'setcavernas', 'setlazer', 'setarsenal', 'setgrupo',
  'darkrpg', 'rpginit', 'iniciar-rpg', 'darkrpg-test', 'rpgtest', 'darkrpg-status', 'rpgstatus',
  'addglb', 'addglobal', 'comunicado', 'ranking-update', 'arsenal',
  'bvrpg', 'welcomerpg', 'evento', 'event', 'auramod', 'aurarpg', 'moderar',
  'regrasrpg', 'regrasville', 'rpgregras', 'rpgsetup', 'rpgguia', 'darkrpg-guia',
  'menu-rpg', 'menurpg', 'rpgmenu', 'menu-rpg2', 'menurpgfull',
]);

// Vitrine: vê o mundo/criações/rankings sem personagem (mas o grupo precisa do modo).
const LIVRE_CHAR = new Set([
  'criarpersonagem', 'newchar', 'rpgstart',
  'racas', 'classes', 'rpginfo',
  'rankrpg', 'toprpg', 'rankglobal', 'ranking', 'leaderboard',
  'mundial', 'rankmundial', 'worldrank', 'rankingmundial',
  'world', 'mapa', 'biomas', 'mundomap',
]);

const RPG_CMDS = new Set([
  ...LIVRE_TUDO, ...LIVRE_CHAR,
  'rg', 'ficha', 'perfilrpg', 'quest', 'historia', 'lutar', 'fight', 'combate',
  'explorar', 'explore', 'descansar', 'rest', 'pocao', 'potion', 'reviver', 'revive',
  'guilda', 'guild', 'criarguilda', 'inventario', 'inv', 'bau', 'npc', 'falar', 'talk',
  'vidas', 'lives', 'nome', 'rename', 'viajar', 'travel', 'irpara',
  'criaclan', 'criaclã', 'newclan',
]);

// I/O com tecto: DB lenta/caída não pode pendurar o bot — falha ABERTA.
const TIMEOUT = Symbol('gate-timeout');
function rapido(pr, ms = 250) {
  return Promise.race([
    Promise.resolve().then(() => pr),
    new Promise((r) => { const t = setTimeout(() => r(TIMEOUT), ms); t.unref?.(); }),
  ]);
}

const MSG_MODO = '🎮 *O mundo RPG está fechado neste grupo.*\nUm admin abre com *!modorpg on* — e a aventura começa. 🌍';
const MSG_CHAR = '🧙 *Ainda não tens personagem neste mundo.*\nCria o teu com *!rpgstart* — escolhe raça, classe e nome.';

/** @returns {Promise<string|null>} mensagem de bloqueio, ou null = deixa jogar */
async function verificar(cmd, ctx = {}) {
  const c = String(cmd || '').toLowerCase();
  if (!RPG_CMDS.has(c) || LIVRE_TUDO.has(c)) return null;

  if (ctx.isGroup) {
    // v7.88: a comunidade DARK VILLE É o mundo internacional — sempre aberto.
    let aberto = false;
    try {
      const com = require('./community');
      const st = await rapido(com.loadState());
      if (st !== TIMEOUT) aberto = com.isCommunityGroup(ctx.remoteJid);
    } catch {}
    if (!aberto) {
      let gs = null;
      try { gs = await rapido(require('../hotCache').getGroupSettings(ctx._msg || null, ctx.remoteJid)); } catch { return null; }
      if (gs === TIMEOUT) return null;
      if (gs && !gs.modorpg) return MSG_MODO;
    }
  }

  if (LIVRE_CHAR.has(c)) return null;

  let p = null;
  try { p = await rapido(require('./engine').peekPlayer(ctx.senderNumber)); } catch { return null; }
  if (p === TIMEOUT) return null;
  const tem = !!(p && (p.started || p.raceBonusApplied || (p.name && p.name !== 'Aventureiro')));
  return tem ? null : MSG_CHAR;
}

module.exports = { verificar, RPG_CMDS, LIVRE_TUDO, LIVRE_CHAR, MSG_MODO, MSG_CHAR };
