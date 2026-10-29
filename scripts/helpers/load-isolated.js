'use strict';
// Test-only loader: inject only the immediate module's dependencies, never boot the app.
const fs = require('fs');
const Module = require('module');
const path = require('path');
module.exports = function loadIsolated(filename, resolve) {
  filename = path.resolve(filename);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = Module.createRequire(filename);
  mod.require = id => resolve(id, nativeRequire);
  mod._compile(fs.readFileSync(filename, 'utf8'), filename);
  return mod.exports;
};
