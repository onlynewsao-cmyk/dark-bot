/**
 * DARK BOT — Aura Percepção (v7.95) 🧠
 * A Aura lembra o que cada pessoa pediu ENTRE mensagens:
 *
 *  • MODO TEXTO   — «manda em texto», «só texto», «tem muito barulho»,
 *                   «não consigo ouvir» → ela deixa de responder em voz
 *                   (renovável; «manda voz/áudio» cancela na hora).
 *  • STICKER PENDENTE — «representa-me num sticker», «faz de mim um
 *                   sticker» → a PRÓXIMA foto/vídeo dessa pessoa (2 min)
 *                   é convertida automaticamente, sem pedir o comando.
 *
 * Estado por chat + remetente, em memória (suficiente — a intenção é
 * conversation­al e caduca rápido).
 */
'use strict';

const _store = new Map(); // key -> { modoTextoTs, figPendTs }
const TTL_PREF = 90 * 60 * 1000;  // modo texto: 90 min (renova a cada pedido)
const TTL_FIG  = 2  * 60 * 1000;  // sticker pendente: 2 min

function chave(jid, sender) {
  return `${String(jid || '')}::${String(sender || '')}`;
}

function _e(k) {
  let e = _store.get(k);
  if (!e) { e = { modoTextoTs: 0, figPendTs: 0 }; _store.set(k, e); }
  return e;
}

function _viva(ts, ttl) {
  return !!ts && (Date.now() - ts) < ttl;
}

// ── Frases sociais ────────────────────────────────────────────
// «manda em texto» / «escreve é em texto» / «só texto» / «sem áudio» /
// «não consigo ouvir» / «aí tem muito barulho» / «tem muito barulho»
const RE_PEDE_TEXTO =
  /\b(?:manda|mande|envia|envie|responde|fala|escreve|responda)[\wÀ-ÿ]*\b[^.!?\n]{0,26}\b(?:em texto|por texto|por escrito)\b/i;
const RE_MOTIVO_TEXTO =
  /\b(?:s[óo]\s+(?:em\s+)?texto|sem\s+[aá]udio|n[ãa]o\s+(?:consigo|posso|d[ae])\s+(?:pra\s+)?ouvir|a[ií]\s+tem\s+muito\s+barulho|tem\s+muito\s+barulho|muito\s+barulho)\b/i;
// «manda voz/áudio/voicer» — pedido explícito de voz (cancela o modo texto)
const RE_PEDE_VOZ =
  /\b(?:manda|mande|envia|envie|grava|grave|fala|responde)[\wÀ-ÿ]*\b[^.!?\n]{0,22}\b(?:voz|[aá]udio|voicer|ptt|nota de voz)\b/i;
// «representa-me num sticker», «faz de mim um sticker», «transforma-me em figurinha»
const RE_STICKER_DE_MIM =
  /\b(?:me\s+)?(?:representa|transforma|faz|faze|cria|crie|torna|converte)[\wÀ-ÿ]*\b[^.!?\n]{0,28}\b(?:stickers?|figurinhas?)\b/i;
// pedido de sticker por tema: «manda um sticker de gato»
const RE_STICKER_TEMA =
  /\b(?:manda|mande|envia|envie|faz|faze|cria|crie|quero|busca)[\wÀ-ÿ]*\b[^.!?\n]{0,18}\b(?:um\s+)?(?:sticker|figurinha)\b/i;
// «qual é o meu @?» / «diz o meu @» / «meu número»
const RE_MEU_ARROBA =
  /\b(?:qual\s+[ée]\s+(?:o\s+)?meu\s+@|diz[\wÀ-ÿ]*\s+(?:o\s+)?meu\s+@|meu\s+@|meu\s+n[úu]mero)(?!\w)/i;

function pedeTexto(t)  { return RE_PEDE_TEXTO.test(t) || RE_MOTIVO_TEXTO.test(t); }
function pedeVoz(t)    { return RE_PEDE_VOZ.test(t) && !RE_PEDE_TEXTO.test(t) && !/sem\s+[aá]udio/i.test(t); }
function pedidoStickerProprio(t) { return RE_STICKER_DE_MIM.test(t); }
function pedidoStickerTema(t)    { return RE_STICKER_TEMA.test(t); }
function perguntaMeuArroba(t)    { return RE_MEU_ARROBA.test(t); }

// ── Modo texto (preferência persistente da conversa) ──────────
function definirModoTexto(key, on) {
  _e(key).modoTextoTs = on ? Date.now() : 0;
}
function modoTexto(key) {
  return _viva(_e(key).modoTextoTs, TTL_PREF);
}

// ── Sticker pendente (próxima mídia daquela pessoa converte) ──
function marcarStickerPendente(key) { _e(key).figPendTs = Date.now(); }
function temStickerPendente(key)    { return _viva(_e(key).figPendTs, TTL_FIG); }
function consumirSticker(key) {
  if (temStickerPendente(key)) { _e(key).figPendTs = 0; return true; }
  return false;
}
function cancelarSticker(key) { _e(key).figPendTs = 0; }

/** Só para testes. */
function _reset() { _store.clear(); }

module.exports = {
  chave,
  pedeTexto, pedeVoz,
  pedidoStickerProprio, pedidoStickerTema, perguntaMeuArroba,
  definirModoTexto, modoTexto,
  marcarStickerPendente, temStickerPendente, consumirSticker, cancelarSticker,
  TTL_PREF, TTL_FIG, _reset,
};
