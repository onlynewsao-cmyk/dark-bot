'use strict';

const assert = require('assert');
const policy = require('../src/bot/menuMediaPolicy');
const setmenu = require('../src/bot/cases/setmenu');

const checks = [
  ['submenu video is stored as GIF playback', policy.storedType('menu_downloads', 'video') === 'gif'],
  ['submenu GIF remains GIF playback', policy.storedType('menu_stickers', 'gif') === 'gif'],
  ['main-menu video remains a normal video', policy.storedType('menu', 'video') === 'video'],
  ['all existing submenu video types are treated as GIF', policy.shouldUseGifPlayback('menugrupo', 'video')],
  ['GIF type plays as GIF in the main menu too', policy.shouldUseGifPlayback('menu', 'gif')],
  ['normal main-menu video is not changed', !policy.shouldUseGifPlayback('menu', 'video')],
  ['setmenu keeps explicit video/GIF detection', setmenu.detectKind(false, true, false, 'video') === 'video' && setmenu.detectKind(false, true, true, '') === 'gif'],
];

for (const [name, ok] of checks) {
  assert.ok(ok, name);
  console.log(`✅ ${name}`);
}
console.log(`\n${checks.length} verificações passaram.`);
