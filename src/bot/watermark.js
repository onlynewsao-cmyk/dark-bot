/**
 * Compatibilidade para o antigo helper de watermark.
 * A assinatura agora é aplicada pelo stickerMaker sem incluir o nome do
 * remetente/grupo e sem reduzir/cortar a imagem original.
 */
'use strict';

const stickerMaker = require('./stickerMaker');
const DEFAULT_BRAND = 'Dark Net Ao';

function generateWatermarkSvg(options = {}) {
  const opts = options || {};
  return stickerMaker.watermarkSvg({
    brand: opts.brand || DEFAULT_BRAND,
    channelName: opts.channelName || '',
    channelUrl: opts.channelUrl || '',
    slogan: opts.slogan || '',
    theme: opts.theme || 'darktoxic',
    includeLink: opts.includeLink === true,
  });
}

async function createStickerWithWatermark(imageBuf, options = {}) {
  if (!imageBuf || !imageBuf.length) throw new Error('imagem inválida');
  const opts = options || {};
  return stickerMaker.create(imageBuf, {
    ...opts,
    fit: 'contain',
    crop: false,
    ...(opts.brand ? { brand: opts.brand } : {}),
    ...(opts.watermarkText ? { watermarkText: opts.watermarkText } : {}),
    visibleWatermark: true,
  });
}

module.exports = { generateWatermarkSvg, createStickerWithWatermark };
