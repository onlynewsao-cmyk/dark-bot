'use strict';
/**
 * v7.88 — GRANDE RESET 🌱
 * O mundo RPG começa do zero UMA vez por deploy/DB: todas as
 * personagens antigas são apagadas e toda a gente (sem excepção)
 * tem de se registrar de novo com !rpgstart.
 */
const FLAG = 'rpg_reset_v788_done';
async function run() {
  try {
    const cache = require('../botConfigCache');
    if (await cache.get(FLAG, false)) return false;
    const RPGPlayer = require('../../database/models/RPGPlayer');
    const r = await RPGPlayer.deleteMany({});
    await cache.set(FLAG, true);
    console.log('[RPG-RESET v7.88] mundo zerado:', r?.deletedCount ?? '?', 'personagens antigas apagadas');
    return true;
  } catch (e) { console.warn('[RPG-RESET]', String(e?.message || e).slice(0, 80)); return false; }
}
module.exports = { run };
