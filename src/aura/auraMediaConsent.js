/**
 * Política de consentimento para leitura de mídia da AURA.
 *
 * Receber uma imagem, sticker, vídeo, documento ou link não é um pedido para
 * observar, descrever, resumir ou guardar o conteúdo. A análise só começa
 * quando a pessoa a pede de forma inequívoca na mesma mensagem/citação.
 */
'use strict';

function normalizar(texto = '') {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MIDIA_PASSIVA = new Set(['imagem', 'video', 'sticker', 'documento', 'link']);

// Só verbos/perguntas de observação. Um simples "oi Aura", uma menção ou a
// presença do anexo nunca dão permissão para processar a mídia.
const PEDIDO_OBSERVACAO = /\b(?:analisa(?:r)?|analise|descreve(?:r)?|descr[eê]va|explica(?:r)?|explique|interpreta(?:r)?|interprete|traduz(?:ir)?|traduza|l[eê](?:r)?|leia|resume|resuma|resumir|verifica(?:r)?|verifique|confirma(?:r)?|identifica(?:r)?|identifique|reconhece(?:r)?|reconhe[aç]a|olha(?:r)?|olhe|veja|v[eê]|consegues?\s+ver|consegue\s+ver|o que (?:tem|esta|ta|diz|significa|mostra|aparece)|quem (?:e|[ée])|qual (?:e|[ée])|que achas|qual a tua opini[aã]o)\b/i;

/** A pessoa pediu para a AURA observar a mídia anexada/citada? */
function pediuAnaliseDeMidia({ texto = '', tipo = '' } = {}) {
  if (!MIDIA_PASSIVA.has(String(tipo || '').toLowerCase())) return false;
  const t = normalizar(texto);
  return !!t && PEDIDO_OBSERVACAO.test(t);
}

/** Mídia visual sem texto/pedido deve passar sem resposta, leitura ou memória. */
function deveIgnorarMidiaPassiva({ texto = '', tipo = '' } = {}) {
  if (!MIDIA_PASSIVA.has(String(tipo || '').toLowerCase())) return false;
  return !normalizar(texto) || !pediuAnaliseDeMidia({ texto, tipo });
}

module.exports = { normalizar, MIDIA_PASSIVA, pediuAnaliseDeMidia, deveIgnorarMidiaPassiva };
