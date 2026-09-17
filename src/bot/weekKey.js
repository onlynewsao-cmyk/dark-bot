'use strict';
// v7.80 — chave de semana ISO (AAAA-WNN) + fragmentos atómicos p/ contadores semanais.
// $inc na semana atual + $unset rolante de semanas velhas: sem scheduler, sem races, sem schema novo depois disto.
function key(d = new Date()) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (dt.getUTCDay() + 6) % 7; // seg=0 … dom=6
  dt.setUTCDate(dt.getUTCDate() - day + 3); // quinta da semana (regra ISO)
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  const week = 1 + Math.round((dt - firstThu) / (7 * 86400000));
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function shiftKey(d, weeksBack) { return key(new Date(d.getTime() - weeksBack * 7 * 86400000)); }
function buildWeekOps(field /* 'm' | 'c' */, d = new Date()) {
  const k = key(d);
  const unset = {};
  for (const back of [8, 9, 10]) unset[`weeks.${shiftKey(d, back)}`] = '';
  return { k, inc: { [`weeks.${k}.${field}`]: 1 }, unset };
}
module.exports = { key, shiftKey, buildWeekOps };
