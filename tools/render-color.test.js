'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const K = {
  Assets: {},
  DATA: { ENEMIES: {}, REGIONS: [] },
  E: {}
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/render.js'), 'utf8'), {
  window: { K }, Math, Object, Array, String, Number, Set
}, { filename: 'js/render.js' });

assert.strictEqual(K.R.rgba('#f0cf5e', 0.3), 'rgba(240,207,94,0.3)');
assert.strictEqual(K.R.rgba('#abc', 0.5), 'rgba(170,187,204,0.5)');
console.log('renderer rgba helper passed');
