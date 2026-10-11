'use strict';

/**
 * Normaliza os campos de comunidade devolvidos por versões diferentes do
 * Baileys/WhatsApp. Não depende do nome do grupo: "Comunidade X" pode ser
 * apenas um grupo normal.
 */
function jidValue(value) {
  const text = String(value || '').trim();
  return /@g\.us$/i.test(text) ? text : '';
}

function firstGroupJid(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
      const jid = jidValue(candidate?.id || candidate?.jid || candidate);
      if (jid) return jid;
    }
  }
  return '';
}

function communityInfo(group = {}) {
  group = group || {};
  const parentJid = firstGroupJid(group, [
    'linkedParentJid', 'linkedParent', 'parentJid', 'parentGroupJid',
    'parentGroupId', 'communityParentJid', 'communityParent',
  ]);
  const type = [group.type, group.groupType, group.kind, group.groupTypeName]
    .filter(Boolean).join(' ').toLowerCase();
  const isAnnouncement = !!(group.isCommunityAnnounce || group.isAnnouncementGroup || /announce|announcement/.test(type));
  // linkedParentJid é a evidência mais forte de subgrupo. Algumas versões
  // também marcam o filho com isCommunity; ele não pode então virar um pai.
  const isParent = !!(
    group.isParentGroup || group.isCommunityParent || group.isCommunityGroup ||
    isAnnouncement || (!parentJid && (group.isCommunity || /community|parent/.test(type)))
  );
  return {
    parentJid,
    isCommunity: isParent,
    isChild: !!parentJid,
    isAnnouncement,
  };
}

module.exports = { communityInfo };
