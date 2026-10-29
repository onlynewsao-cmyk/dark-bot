'use strict';
/** Match trusted transport identifiers exactly. Display names/message bodies are never credentials. */
function number(value) {
  return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}
function lid(value) {
  const match = String(value || '').match(/^(\d+)(?::\d+)?(?:@lid)?$/);
  return match ? match[1] : '';
}
function matchesOwnerLid(ctx = {}, msg = {}, ownerLid = '') {
  const expected = lid(ownerLid);
  if (!expected) return false;
  const candidates = [ctx.senderLid];
  for (const jid of [ctx.senderJid, msg.key?.participant, ctx.isGroup ? '' : msg.key?.remoteJid]) {
    if (String(jid || '').endsWith('@lid')) candidates.push(jid);
  }
  return candidates.some(x => lid(x) === expected);
}
function resolveOwnerFlags({ ctx = {}, msg = {}, sock = {}, config = {}, dbOwnerNum = '', ownerLid = '', ownerNumbers = [] } = {}) {
  const fromMe = msg.key?.fromMe === true;
  const sender = number(fromMe ? sock.user?.id || config.bot?.number : ctx.senderNumber);
  const primary = [number(config.owner?.number), number(dbOwnerNum)].filter(Boolean);
  const botIds = [number(sock.user?.id), number(config.bot?.number)].filter(Boolean);
  const botLid = lid(sock.user?.lid);
  const isBotSelf = msg.key?.fromMe === true || (!!sender && botIds.includes(sender)) ||
    (!!botLid && matchesOwnerLid(ctx, msg, botLid));
  const isPrimaryOwner = (!!sender && primary.includes(sender)) || (fromMe
    ? !!botLid && botLid === lid(ownerLid)
    : matchesOwnerLid(ctx, msg, ownerLid));
  const additional = Array.isArray(ownerNumbers) ? ownerNumbers.map(number).filter(Boolean) : [];
  const isOwner = isPrimaryOwner || isBotSelf || (!!sender && additional.includes(sender));
  return { isPrimaryOwner, isBotSelf, isOwner, isSubOwner: isOwner && !isPrimaryOwner };
}
module.exports = { number, matchesOwnerLid, resolveOwnerFlags };
