'use strict';

/** Normaliza o tipo guardado pelo !setmenu sem alterar o menu principal. */
function storedType(target, kind) {
  const t = String(target || '').toLowerCase();
  const k = String(kind || '').toLowerCase();
  if (k === 'foto' || k === 'image') return 'image';
  if (k === 'gif') return 'gif';
  if (k === 'video' || k === 'vídeo' || k === 'mp4') {
    return t === 'menu' ? 'video' : 'gif';
  }
  return 'none';
}

/**
 * WhatsApp GIF playback é um MP4 curto, mudo e com gifPlayback:true.
 * Os vídeos de submenus passam a usar esse formato; o vídeo do menu
 * principal mantém o comportamento normal salvo se for marcado como GIF.
 */
function shouldUseGifPlayback(target, mediaType) {
  const t = String(target || '').toLowerCase();
  const kind = String(mediaType || '').toLowerCase();
  return kind === 'gif' || (t !== 'menu' && kind === 'video');
}

module.exports = { storedType, shouldUseGifPlayback };
