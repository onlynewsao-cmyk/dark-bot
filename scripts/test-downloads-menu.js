'use strict';
/** Regression: menu Downloads exposes converter families without alias clutter. */
const assert = require('assert');
const Module = require('module');
const originalRequire = Module.prototype.require;
const groups = [
  ['mp4to3', '4to3', 'mp4paraaudio', 'videoparamp3'],
  ['tovoice', 'topt', 'tovn', 'mp4tovoice', 'mp3tovoice', 'audioparavoice'],
  ['togif', 'mp4togif', 'videoparagif'],
  ['videoaimg', 'mp4toimg', 'primeiraframe', 'videoframe'],
  ['todoc', 'todocx', 'mediatodoc', 'enviarcomodocumento'],
];
const commands = groups.flat();
const fakeCaseHandler = {
  CASES: new Set(commands),
  COMMAND_REGISTRY: new Map(groups.flatMap(aliases => aliases.map(cmd => [cmd, { aliases }]))),
};

Module.prototype.require = function (id) {
  if (id === './caseHandler') return fakeCaseHandler;
  if (id === './nativeCommands') return {};
  if (id.startsWith('./packages/')) return {};
  return originalRequire.apply(this, arguments);
};

try {
  const menu = require('../src/bot/submenuData');
  const { describe } = require('../src/bot/commandDescriptions');
  const built = menu.buildItems(commands, 'downloads');
  const visible = groups.map(([canonical]) => canonical).sort();
  assert.deepStrictEqual(built.map(item => item.cmd), visible, 'one canonical command per conversion family is listed');
  for (const cmd of commands) {
    assert.strictEqual(menu.categorize(cmd), 'downloads', `${cmd} category`);
    assert.ok(describe(cmd, 'downloads') && !/undefined/i.test(describe(cmd, 'downloads')), `${cmd} alias has a useful description`);
  }
  for (const item of built) {
    assert.strictEqual(item.subcat, '🛠️ Conversões', `${item.cmd} subcategory`);
    assert.ok(item.desc && !/undefined/i.test(item.desc), `${item.cmd} has a useful description`);
  }
  assert.match(menu.SUBMENU_META.downloads.sub, /Conversões/);
  console.log(`DOWNLOADS MENU: ${built.length} comandos canónicos visíveis; ${commands.length} nomes (${commands.length - visible.length} aliases) classificados e descritos.`);
} finally {
  Module.prototype.require = originalRequire;
}
