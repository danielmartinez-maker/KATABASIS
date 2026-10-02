'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const K = {};
const context = vm.createContext({window:{K}, console, Math, JSON, Object, Array, Number, String, Set});
const load = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, {filename:file});
['js/data.js', 'js/content-expansion.js', 'js/run-systems.js'].forEach(load);
const D = K.DATA;
const before = D.BOONS.concat(D.SPECIAL_BOONS);
const oldDefinitions = new Map(before.map(boon => [boon.id, JSON.stringify(boon)]));
const expansionPath = path.join(ROOT, 'js/boon-expansion.js');
if (fs.existsSync(expansionPath)) load('js/boon-expansion.js');

// Missing families, duplicate variants, or overwritten old IDs break available builds.
assert.strictEqual(D.BOONS.length + D.SPECIAL_BOONS.length, 8460, 'offer catalogue must contain exactly three times the original 2820 boons');
assert.strictEqual(D.BOONS.length, 7620);
assert.strictEqual(D.SPECIAL_BOONS.length, 840);
assert.strictEqual(D.CONTENT_COUNTS.boons, 8460);
assert.strictEqual(D.CONTENT_COUNTS.ordinaryBoons, 7620);
assert.strictEqual(D.CONTENT_COUNTS.specialBoons, 840);
const all = D.BOONS.concat(D.SPECIAL_BOONS);
assert.strictEqual(new Set(all.map(boon => boon.id)).size, all.length, 'duplicate IDs hide powers and corrupt saved builds');
for (const [id, definition] of oldDefinitions) {
  assert.strictEqual(JSON.stringify(D.boonById[id]), definition, 'existing saved boon changed: ' + id);
}
const added = all.filter(boon => !oldDefinitions.has(boon.id));
assert.strictEqual(added.length, 5640);
const ordinary = added.filter(boon => boon.rarity === 'common');
const specials = added.filter(boon => boon.rarity === 'duo' || boon.rarity === 'legendary');
assert.strictEqual(ordinary.length, 5080);
assert.strictEqual(specials.filter(boon => boon.rarity === 'duo').length, 280);
assert.strictEqual(specials.filter(boon => boon.rarity === 'legendary').length, 280);
const families = new Map();
for (const boon of added) {
  assert.ok(D.GODS[boon.god], 'unknown deity: ' + boon.id);
  assert.strictEqual(D.boonById[boon.id], boon, 'unindexed offer: ' + boon.id);
  assert.ok(boon.familyId && boon.sourceId && boon.visualKey === 'god:' + boon.god, 'missing portrait/family metadata: ' + boon.id);
  assert.ok(K.BoonExpansion.archetypes.some(item => item.id === boon.buildArchetype), 'missing build guide archetype: ' + boon.id);
  assert.ok(boon.tags.includes(boon.buildArchetype), 'archetype absent from search tags: ' + boon.id);
  if (!families.has(boon.familyId)) families.set(boon.familyId, []);
  families.get(boon.familyId).push(boon);
  for (const token of boon.desc.match(/%[A-Z]%/g) || []) {
    const binding = boon.descFx[token[1]];
    assert.ok(binding && binding.unit, 'unbound offer token: ' + boon.id + ' ' + token);
    const value = binding.path.split('.').reduce((object, key) => object && object[key], boon.fx);
    assert.ok(Number.isFinite(value), 'description does not resolve to a real effect: ' + boon.id + ' ' + binding.path);
  }
  assert.strictEqual(D.BOON_DESCRIPTION_BINDINGS[boon.id], boon.descFx);
  // Prerequisites must be obtainable through the actual requirement format.
  if (boon.req) {
    assert.ok(boon.req.gods && Object.keys(boon.req.gods).length > 0);
    assert.ok(!Object.keys(boon.req).some(key => !['gods','minBoons'].includes(key)), 'draft cannot evaluate requirement: ' + boon.id);
    for (const [god, count] of Object.entries(boon.req.gods)) {
      assert.ok(D.GODS[god] && Number.isInteger(count) && count > 0);
      assert.ok(D.BOONS.filter(candidate => candidate.god === god).length >= count, 'unreachable deity requirement');
    }
    if (boon.rarity === 'duo') assert.strictEqual(Object.keys(boon.req.gods).length, 2, 'duo must require both gods');
    if (boon.rarity === 'legendary') assert.ok(boon.req.minBoons >= 5, 'legendary must require foundations');
  } else assert.strictEqual(boon.rarity, 'common', 'special offer lacks foundations');
  // Conditional mechanics carry their own enabling powers.
  if (boon.fx.critBurst) assert.ok(boon.fx.crit > 0, 'critical nova cannot proc reliably');
  if (boon.fx.shieldDamage) assert.ok(boon.fx.shieldOnRoom || boon.fx.dashShield || boon.fx.killShield, 'shield build has no shield');
  const dots = ['bleed','poison','burnOnHit'].filter(key => boon.fx[key]);
  if (boon.fx.statusDetonate) assert.ok(dots.length >= 2, 'detonation needs two damaging statuses');
  if (boon.fx.statusSpread) assert.ok(dots.length >= 1, 'infection has no damaging status');
}
assert.strictEqual(families.size, 282);
assert.strictEqual(new Set(ordinary.map(boon => boon.familyId)).size, 254);
assert.strictEqual(new Set(specials.map(boon => boon.familyId)).size, 28);
for (const [id, members] of families) {
  assert.strictEqual(members.length, 20, 'incomplete family: ' + id);
  assert.strictEqual(members.filter(boon => !boon.generatedVariant).length, 1, 'family needs one base offer');
  assert.strictEqual(new Set(members.map(boon => JSON.stringify(boon.fx))).size, 20, 'renamed variants have identical mechanics: ' + id);
  assert.ok(members.every(boon => boon.sourceId === id));
}
for (const god of Object.keys(D.GODS)) {
  assert.ok(new Set(ordinary.filter(boon => boon.god === god).map(boon => boon.familyId)).size >= 5, 'expanded deity has fewer than five build routes: ' + god);
}
assert.strictEqual(K.BoonExpansion.archetypes.length, 18);
for (const archetype of K.BoonExpansion.archetypes) {
  assert.ok(ordinary.some(boon => boon.buildArchetype === archetype.id && boon.fx[archetype.effect] > 0), 'unrepresented combat archetype');
  assert.ok(archetype.name && archetype.desc && archetype.gods.length, 'build guide lacks player-facing information');
}

// A second module evaluation must not multiply the offer catalogue again.
load('js/boon-expansion.js');
assert.strictEqual(D.BOONS.length + D.SPECIAL_BOONS.length, 8460);

// Exercise the production draft with a controlled RNG choice. A renamed but
// unreachable offer, unsupported requirement, or uncompiled mechanic fails.
const {K:liveK,G} = require('./debug-harness');
const liveD = liveK.DATA;
assert.strictEqual(liveD.BOONS.length + liveD.SPECIAL_BOONS.length, 8460, 'boot order omitted the new catalogue');
const foundations = {};
for (const god of Object.keys(liveD.GODS)) foundations[god] = liveD.BOONS.filter(boon => boon.god === god && boon.slot === 'passive');
function assertFiniteStats(stats, label) {
  for (const [key,value] of Object.entries(stats)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), 'non-finite compiled stat: ' + label + ' ' + key);
    else if (value && typeof value === 'object' && !Array.isArray(value)) assertFiniteStats(value,label + '.' + key);
  }
}
G.startRun(81120,{});
for (const record of added) {
  const target = liveD.boonById[record.id];
  const run = new liveK.Run(81120);
  if (target.req) {
    for (const [god,count] of Object.entries(target.req.gods)) {
      foundations[god].slice(0,count).forEach(boon => run.addBoon(boon.id,'common'));
    }
    for (const boon of foundations[target.god]) {
      if (run.boons.length >= (target.req.minBoons || 0)) break;
      if (!run.boons.some(owned => owned.id === boon.id)) run.addBoon(boon.id,'common');
    }
  } else run.gods[target.god] = 1;
  run.rng = {
    chance:probability => target.rarity !== 'common' && probability === 0.34,
    weighted:pool => pool.includes(target.god) ? target.god : pool[0],
    pick:pool => pool.find(candidate => candidate.id === target.id) || pool[0],
    shuffle:pool => pool.slice(), next:() => 0.5
  };
  G.run = run;
  const draft = G.generateBoonChoices(1);
  assert.ok(draft.some(choice => choice.id === target.id), 'production draft cannot reach offer: ' + target.id);
  run.addBoon(target.id,target.rarity);
  const stats = liveK.compileStats(run,null);
  assertFiniteStats(stats,target.id);
  for (const effect of target.mechanicKeys) assert.ok(stats[effect] > 0, 'combat compiler dropped new mechanic: ' + target.id + ' ' + effect);
}
console.log('expansion catalogue passed: 8460 unique offers; 282 new families; 18 enabled combat archetypes; all 5640 additions draft and compile; old saves preserved');
