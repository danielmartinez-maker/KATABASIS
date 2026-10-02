'use strict';
const assert = require('assert');
const { K, G, storage, releaseAll, windowShim } = require('./debug-harness');
windowShim.atob = value => Buffer.from(String(value), 'base64').toString('binary');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, label + ': expected ' + expected + ', got ' + actual);

function reset(seed = 9001) {
  if (G.practiceMode) G.exitPractice();
  storage.clear(); K.Save.load(); G.startRun(seed); releaseAll();
  G.run.boons = []; G.run.gods = {}; G.run.relics = [];
  G.run.augmentIds = []; G.run.fatedThreadIds = [];
  G.run.heroUpgrades = []; G.run.weaponUpgrades = []; G.run.shopStats = [];
}

test('Expanded path catalogs offer exactly three times the original distinct choices', () => {
  for (const [catalog, count] of [['FATED_THREADS', 36], ['AUGMENTS', 24], ['SYNERGIES', 18]]) {
    const items = K.RunSystems[catalog];
    assert.strictEqual(items.length, count, catalog + ' choice count');
    assert.strictEqual(new Set(items.map(item => item.id)).size, count, catalog + ' has duplicate IDs');
    assert.ok(items.every(item => item.name && item.desc && item.fx), catalog + ' contains an incomplete choice');
  }
  for (const id of ['returning-echo','cyclone-step','guardian-refrain','marked-quarry','barbed-verse','green-wound','storm-remnant','harvest-turn','breaker-stride','charged-third','piercing-line','winter-answer']) {
    assert.ok(K.RunSystems.FATED_THREADS.some(item => item.id === id), 'old Thread lost: ' + id);
  }
  for (const id of ['venom_edge','ricochet_cast','charged_combo','barbed_spear','storm_string','iron_rhythm','guardian_oath','ash_bloom']) {
    assert.ok(K.RunSystems.AUGMENTS.some(item => item.id === id), 'old augment lost: ' + id);
  }
  for (const id of ['storm-tide','mirror-hunt','war-forge','hunter-venom','underworld-song','gorgon-oath']) {
    assert.ok(K.RunSystems.SYNERGIES.some(item => item.id === id), 'old synergy lost: ' + id);
  }
});

test('Real seeded Thread drafts reach all new paths, exclude owned Threads and always include a build fit', () => {
  const seen = new Set();
  for (const profile of [
    { hero:'perseus', weapon:'xiphos', boons:['a_bulwark','h_strike'] },
    { hero:'atalanta', weapon:'dory', boons:['t_cast','d_strike','m_rush'] },
    { hero:'orpheus', weapon:'makhaira', boons:['z_ascend','s_dash','e_strike'] }
  ]) {
    reset(); G.run.heroId = profile.hero; G.run.weapon = profile.weapon;
    profile.boons.forEach(id => G.run.addBoon(id, 'common'));
    for (let seed = 1; seed <= 160; seed++) {
      G.run.fatedThreadIds = ['returning-echo']; G.pendingReward = null; G.run.rng = new K.RNG(seed);
      assert.strictEqual(G.offerFatedThreads({}), true);
      const ids = G.pendingReward.choices.map(choice => choice.id);
      assert.strictEqual(new Set(ids).size, 3);
      assert.ok(!ids.includes('returning-echo'));
      assert.ok(ids.some(id => K.RunSystems.threadRelevance(G.run, K.RunSystems.FATED_THREADS.find(thread => thread.id === id))));
      ids.forEach(id => seen.add(id));
      G.pendingReward = null; G.run.rng = new K.RNG(seed); G.offerFatedThreads({});
      assert.strictEqual(JSON.stringify(G.pendingReward.choices.map(choice => choice.id)), JSON.stringify(ids), 'seeded draft changed');
    }
  }
  assert.strictEqual(seen.size, 35, 'seeded drafts did not reach every unowned path');
});

test('New focused Threads match effects already in the build', () => {
  reset(); G.run.heroId = 'orpheus'; G.run.weapon = 'dory';
  const relevant = id => K.RunSystems.threadRelevance(G.run, K.RunSystems.FATED_THREADS.find(thread => thread.id === id));
  assert.strictEqual(relevant('merciful-counter'), false);
  assert.strictEqual(relevant('aegis-edge'), false);
  assert.strictEqual(relevant('mingled-ruin'), false);
  assert.strictEqual(relevant('close-quarters'), false);
  assert.strictEqual(relevant('split-refrain'), true);
  assert.strictEqual(relevant('distant-vow'), true);
  assert.strictEqual(relevant('thunderous-rush'), true);
  assert.strictEqual(relevant('first-light'), true);
  G.run.addBoon('a_bulwark', 'common'); G.run.addBoon('a_dash', 'common'); G.run.addBoon('h_strike', 'common');
  assert.strictEqual(relevant('merciful-counter'), true);
  assert.strictEqual(relevant('aegis-edge'), true);
  assert.strictEqual(relevant('mingled-ruin'), true);
  G.run.heroId = 'atalanta';
  assert.strictEqual(relevant('thunder-quarry'), true);
});

test('Every added augment can be offered and selected through the existing reward flow', () => {
  const seen = new Set();
  reset();
  for (let seed = 1; seed <= 160; seed++) {
    G.run.augmentIds = ['venom_edge']; G.pendingReward = null; G.run.rng = new K.RNG(seed);
    G.offerAugments({});
    const choices = G.pendingReward.choices;
    assert.strictEqual(choices.length, 3);
    assert.strictEqual(new Set(choices.map(choice => choice.id)).size, 3);
    assert.ok(choices.every(choice => choice.id !== 'venom_edge'));
    choices.forEach(choice => seen.add(choice.id));
    assert.strictEqual(G.takeAugment(choices[0].id), true);
    assert.ok(G.run.augmentIds.includes(choices[0].id));
    assert.strictEqual(G.takeAugment(choices[0].id), false);
  }
  assert.strictEqual(seen.size, 23, 'existing augment reward never offered some added choices');
});

test('Added synergy requirements reject incomplete paths and survive activation for UI guides', () => {
  const fixtures = [
    ['stormglass-hunt', 'perseus', 'xiphos', ['zeus','artemis']],
    ['thunder-road', 'perseus', 'xiphos', ['zeus','hermes']],
    ['aegis-forge', 'perseus', 'xiphos', ['athena','hephaestus']],
    ['reapers-feast', 'perseus', 'xiphos', ['ares','dionysus']],
    ['ashen-vine', 'perseus', 'xiphos', ['dionysus','hephaestus']],
    ['frosted-quiver', 'perseus', 'xiphos', ['artemis','demeter']],
    ['harvest-song', 'orpheus', 'makhaira', ['demeter']],
    ['guarded-refrain', 'orpheus', 'makhaira', ['athena']],
    ['sea-sprinter', 'atalanta', 'dory', ['poseidon']],
    ['gorgons-mercy', 'perseus', 'xiphos', ['demeter']],
    ['grave-lantern', 'perseus', 'xiphos', ['hades','hephaestus']],
    ['titanic-dawn', 'perseus', 'xiphos', ['apollo','zeus']]
  ];
  for (const [id, hero, weapon, gods] of fixtures) {
    reset(); G.run.heroId = hero; G.run.weapon = weapon;
    for (const god of gods) G.run.gods[god] = 1;
    const active = K.RunSystems.activeSynergies(G.run).find(synergy => synergy.id === id);
    assert.ok(active, id + ' did not activate');
    assert.ok(typeof active.requires === 'string' && active.requires.length > 10, id + ' lost its requirement guide');
    delete G.run.gods[gods[0]];
    assert.ok(!K.RunSystems.activeSynergies(G.run).some(synergy => synergy.id === id), id + ' activated without its god');
    if (gods.length === 1) {
      G.run.gods[gods[0]] = 1; G.run.heroId = hero === 'perseus' ? 'orpheus' : 'perseus';
      assert.ok(!K.RunSystems.activeSynergies(G.run).some(synergy => synergy.id === id), id + ' activated for the wrong hero');
    }
  }
  assert.ok(K.RunSystems.SYNERGIES.every(synergy => typeof synergy.requires === 'string' && synergy.requires.length > 10));
});

test('Thread, augment and synergy powers stack through the real stat compiler', () => {
  const fixtures = [
    ['critBurst', ['thunder-quarry'], ['longshot_lens'], 'perseus', ['zeus','artemis'], 30],
    ['castFork', ['split-refrain','resonance-pursuit'], ['forked_spear'], 'perseus', [], 3],
    ['castNova', ['landing-star'], ['impact_lens'], 'orpheus', ['athena'], 44],
    ['dashNova', ['ember-step'], ['scorching_spurs'], 'perseus', ['zeus','hermes'], 32],
    ['dashStrike', ['spring-loaded'], ['coiled_spring'], 'perseus', ['zeus','hermes'], 0.5],
    ['parryNova', ['mirror-shock'], ['bronze_counter'], 'perseus', ['athena','hephaestus'], 42],
    ['parryHeal', ['merciful-counter'], ['menders_guard'], 'perseus', ['demeter'], 13],
    ['statusDetonate', ['mingled-ruin'], ['crossed_curses'], 'perseus', ['ares','dionysus'], 38],
    ['statusSpread', ['contagious-fate'], ['plague_runner'], 'perseus', ['ares','dionysus'], 0.9],
    ['bossHunter', ['titan-slayer'], ['titan_point'], 'perseus', ['apollo','zeus'], 0.45],
    ['distanceDamage', ['distant-vow'], ['longshot_lens'], 'perseus', ['artemis','demeter'], 0.42],
    ['closeDamage', ['close-quarters'], ['brawlers_grip'], 'perseus', [], 0.32],
    ['killNova', ['last-ripple'], ['funeral_bell'], 'perseus', ['hades','hephaestus'], 34],
    ['killHaste', ['reaping-tempo'], ['reapers_metronome'], 'orpheus', ['demeter'], 0.36],
    ['shieldDamage', ['aegis-edge'], ['warded_edge'], 'perseus', ['athena','hephaestus'], 0.43],
    ['guardCast', ['borrowed-instant'], ['patient_focus'], 'orpheus', ['athena'], 1.3],
    ['rushNova', ['thunderous-rush'], ['victory_fanfare'], 'atalanta', ['poseidon'], 44],
    ['ascendNova', ['first-light'], ['victory_fanfare'], 'perseus', ['apollo','zeus'], 62]
  ];
  for (const [key, threads, augments, hero, gods, expected] of fixtures) {
    reset(); G.run.heroId = hero; G.run.fatedThreadIds = threads; G.run.augmentIds = augments;
    gods.forEach(god => { G.run.gods[god] = 1; });
    const stats = K.compileStats(G.run, null);
    near(stats[key], expected, key);
    assert.ok(Object.values(stats).filter(value => typeof value === 'number').every(Number.isFinite), key + ' corrupts stats');
  }
});

test('Old and expanded build codes retain stable IDs without disturbing legacy save migration', () => {
  reset(); G.run.fatedThreadIds = ['returning-echo','landing-star']; G.run.augmentIds = ['ricochet_cast','impact_lens'];
  const parsed = K.RunSystems.parseBuildCode(K.RunSystems.buildCode(G.run));
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(JSON.stringify(parsed.threads), '["returning-echo","landing-star"]');
  assert.strictEqual(JSON.stringify(parsed.augments), '["ricochet_cast","impact_lens"]');
  const legacy = { obols:413, bossKills:8, wins:1, weapon:'dory', selectedHero:'atalanta', unlockedHeroes:['perseus','atalanta'], muted:true, meta:{m_hp:3}, killChronicle:[{id:'old-record'}] };
  const migrated = K.RunSystems.normalizeSave(legacy);
  assert.strictEqual(migrated.obols, 413); assert.strictEqual(migrated.muted, true);
  assert.strictEqual(migrated.meta.m_hp, 3); assert.strictEqual(migrated.killChronicle[0].id, 'old-record');
  assert.strictEqual(migrated.weapon, 'dory'); assert.strictEqual(migrated.selectedHero, 'atalanta');
  assert.strictEqual(migrated.fatedTrialsUnlocked, true);
});

let failed = 0;
for (const { name, fn } of tests) {
  try { fn(); console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
}
console.log('BUILD PATHS: ' + (tests.length - failed) + '/' + tests.length + ' passed');
if (failed) process.exitCode = 1;
