'use strict';
const fs = require('fs'), path = require('path'), Module = require('module');
const filename = path.join(__dirname, 'smoke.js');
const source = fs.readFileSync(filename, 'utf8');
const boundary = source.indexOf('const K = windowShim.K;');
if (boundary < 0) throw new Error('Cannot locate smoke harness setup');
const harness = new Module(filename, module);
harness.filename = filename;
harness.paths = Module._nodeModulePaths(__dirname);
harness._compile(source.slice(0, boundary).replace("console.log('--- KATABASIS headless smoke test ---');", '') + `
const K = windowShim.K;
const G = K && K.G;
if (errors.length) throw new Error('Debug harness module load failed: ' + errors.join('\\n'));
if (!K || !G) throw new Error('Debug harness did not boot the game');
function releaseAll() {
  ['KeyW','KeyS','KeyA','KeyD','Space','KeyE','KeyQ','KeyF','KeyR','KeyT','KeyK','KeyI'].forEach(code => {
    K.Input.keys[code] = false;
    K.Input.pressed[code] = false;
  });
  K.Input.mouse.down = false;
  K.Input.mouse.rdown = false;
  K.Input.mouse.downEdge = false;
  K.Input.mouse.rdownEdge = false;
}
module.exports = {K,G,documentShim,windowShim,storage,releaseAll};`, filename);
module.exports = harness.exports;
