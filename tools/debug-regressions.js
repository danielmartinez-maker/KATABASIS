'use strict';
const assert = require('assert');
const {K,G,documentShim,windowShim,storage,releaseAll} = require('./debug-harness');
const tests = [];
const test = (name, fn) => tests.push({name, fn});
function reset() { storage.clear(); K.Save.load(); G.startRun(98236); releaseAll(); }
function fixedRandom(value, fn) { const old = Math.random; Math.random = () => value; try { return fn(); } finally { Math.random = old; } }

test('A miniboss route with an empty generated squad still spawns its seven adds', () => {
  reset();
  G.enterChamber(1, {type:'miniboss', squad:[]});
  assert.ok(G.boss === null, 'miniboss route unexpectedly spawned the region boss');
  assert.strictEqual(K.E.enemies.length, 8, 'expected one miniboss and seven valid adds');
  assert.ok(K.E.enemies.every(enemy => enemy && enemy.type), 'miniboss route spawned an invalid enemy');
});

test('Practice Yard starts a practice room without recording a campaign run', () => {
  reset();
  const runsBefore=K.Save.data.runs;
  G.startPractice({seed:98239,heroId:'perseus',weapon:'xiphos'});
  assert.strictEqual(G.practiceMode,true,'practice mode flag was not set');
  assert.strictEqual(G.run.practice,true,'run was not marked as practice');
  assert.strictEqual(G.roomDef.type,'practice','Practice Yard entered a campaign chamber');
  assert.strictEqual(K.Save.data.runs,runsBefore,'practice run incremented campaign run count');
  assert.strictEqual(G.exitPractice(),true);
  assert.strictEqual(G.practiceMode,false);
});

test('Wrath cooldown bonuses shorten the actual ability cooldown', () => {
  reset(); G.run.addRelic('r_anvil'); G.recalcStats(); G.player.doWrath(G);
  assert.ok(Math.abs(G.player.specialCd - 3.4 * 0.75) < 1e-8, 'Anvil promised 25% faster Wrath, actual cooldown=' + G.player.specialCd);
});
test('A Death Defiance acquired during a run revives once without recalc refills', () => {
  reset(); G.run.addRelic('r_wreath'); G.recalcStats();
  assert.strictEqual(G.run.deathDefy, 1, 'acquired extra life was never credited');
  G.player.hp = 0; G.die(); assert.strictEqual(G.player.dead, false);
  assert.ok(G.player.hp > 0); G.recalcStats(); assert.strictEqual(G.run.deathDefy, 0);
});
test('Fate-Favored rerolls are credited once when acquired', () => {
  reset(); const boon = K.DATA.BOONS.find(b => b.fx.rerollPlus === 1);
  assert.ok(boon); G.run.addBoon(boon.id, 'common'); G.recalcStats();
  assert.strictEqual(G.run.rerolls, 2, 'earned reroll was never credited');
  G.run.rerolls--; G.recalcStats(); assert.strictEqual(G.run.rerolls, 1);
});
['legendary','duo'].forEach(rarity => test('Pom of Power never downgrades a ' + rarity + ' boon', () => {
  reset(); const boon = K.DATA.SPECIAL_BOONS.find(b => b.rarity === rarity);
  G.run.addBoon(boon.id, rarity); G.applyShopItem({kind:'pom'});
  assert.strictEqual(G.run.boonRarity(boon.id), rarity);
}));
test('Existing common boons retain an offered Heroic rarity', () => {
  reset(); G.run.addBoon('z_strike', 'common'); G.run.addBoon('z_strike', 'heroic');
  assert.strictEqual(G.run.boonRarity('z_strike'), 'heroic');
});
test('The displayed boss tribute reroll button actually consumes a reroll', () => {
  reset(); G.offerBoons({kind:'boss',count:4,rarityFloor:'rare'});
  const offer = G.pendingReward, before = offer.rerolls;
  documentShim.getElementById('btn-reroll').click();
  assert.strictEqual(offer.rerolls, before - 1);
  assert.strictEqual(offer.choices.length, 4);
  assert.ok(offer.choices.every(c => K.DATA.RARITY[c.rarity].tier >= K.DATA.RARITY.rare.tier));
});
test('The Unseen Wealth allows a free purchase with zero carried Obols', () => {
  reset(); G.run.addBoon('leg_hades','legendary'); G.recalcStats();
  G.spawnShop(G.region()); G.run.obols = 0;
  const offer = G.interactables.find(x => x.kind === 'shop'); assert.ok(offer, 'Charon has no wares'); G.doInteract(offer);
  assert.strictEqual(offer.used, true); assert.strictEqual(G.run.obols, 0);
});
test('The Unseen Wealth refreshes its free purchase at every Charon visit', () => {
  reset(); G.run.addBoon('leg_hades','legendary'); G.recalcStats();
  G.spawnShop(G.region()); G.run.obols = 1000;
  G.doInteract(G.interactables.find(x => x.kind === 'shop'));
  assert.strictEqual(G.run.obols, 1000);
  G.spawnShop(G.region());
  G.doInteract(G.interactables.filter(x => x.kind === 'shop' && !x.used)[0]);
  assert.strictEqual(G.run.obols, 1000, 'free purchase remained spent across visits');
});
test('Delayed lightning cannot strike enemies in a later chamber', () => {
  reset(); G.strikeLightning(0,0,999,5,0.5);
  G.enterChamber(1); assert.strictEqual((G.pendingBolts || []).length, 0);
});
test('Restarting during a divine call resets the time scale and cinematic', () => {
  reset(); G.run.addBoon('m_call','common'); G.recalcStats(); G.startCall(G.player);
  assert.ok(G.cinematic); G.startRun(98237);
  assert.strictEqual(G.timeScale, 1); assert.strictEqual(G.cinematic, null);
  assert.ok(!G.hermesBoost && !G.run.hermesBoost);
});
test('Hermes Aid increases movement speed temporarily and expires cleanly', () => {
  reset(); G.run.addBoon('m_call','common'); G.recalcStats();
  const speed = G.player.speed(); G.startCall(G.player);
  assert.ok(G.player.speed() > speed * 1.25, 'Hermes changed moveMul but never resolved actual speed');
  K.E.enemies.length = 0; G.pendingSpawns.length = 0; G.roomDef.cleared = true;
  for (let i=0;i<361;i++) G.update(1/60);
  assert.ok(Math.abs(G.player.speed() - speed) < 1e-7);
});
test('Deflection boons reflect an incoming projectile before it damages life', () => {
  reset(); const boon = K.DATA.BOONS.find(b => b.fx.deflectProj > 0);
  G.run.addBoon(boon.id,'common'); G.recalcStats();
  const p = G.player, hp = p.hp;
  fixedRandom(0, () => {
    const projectile = new K.E.Projectile({x:p.x,y:p.y,vx:-200,vy:0,dmg:20,persp:'arrow'});
    projectile.update(0,G);
    assert.strictEqual(projectile.friendly, true); assert.strictEqual(projectile.dead, false);
    assert.strictEqual(p.hp, hp, 'deflected projectile still damaged life');
  });
});
test('Damaged save fields cannot poison currency, combat stats, or Nemesis startup', () => {
  storage.clear(); const mirror = K.DATA.META[0];
  windowShim.localStorage.setItem('katabasis.save.v1', JSON.stringify({obols:'20',runs:-5,meta:{[mirror.id]:-40},nemeses:[null],campaignArchive:[null],killChronicle:[null]}));
  K.Save.load(); K.Save.addObols(5);
  assert.strictEqual(K.Save.data.obols,25); assert.strictEqual(K.Save.data.runs,0);
  assert.strictEqual(K.Save.metaLevel(mirror.id),0); G.startRun(999);
  G.regionIndex=1; assert.doesNotThrow(() => G.enterChamber(0));
  assert.ok(K.Save.data.nemeses.every(x=>x && typeof x==='object'));
  assert.ok(K.Save.data.campaignArchive.every(x=>x && typeof x==='object'));
});
test('Blocked localStorage keeps the game usable in memory', () => {
  reset(); const set = windowShim.localStorage.setItem;
  windowShim.localStorage.setItem = () => { throw new Error('blocked'); };
  try { assert.doesNotThrow(()=>K.Save.addObols(10)); assert.strictEqual(K.Save.data.obols,10); }
  finally { windowShim.localStorage.setItem = set; }
});
test('Corrupted Mirror levels are bounded and malformed Saga voices are recovered', () => {
  reset(); const mirror = K.DATA.META[0];
  windowShim.localStorage.setItem('katabasis.save.v1', JSON.stringify({meta:{[mirror.id]:9999},campaignArchive:[{title:'Recovered memory',voices:'invalid'}],seenGods:[]}));
  K.Save.load(); assert.strictEqual(K.Save.metaLevel(mirror.id), mirror.max);
  assert.ok(Array.isArray(K.Save.data.campaignArchive[0].voices));
  assert.ok(!Array.isArray(K.Save.data.seenGods));
});
test('Invalid currency transactions cannot create Obols or corrupt the balance', () => {
  reset(); K.Save.addObols(100);
  assert.strictEqual(K.Save.spend(-50),false); assert.strictEqual(K.Save.data.obols,100);
  assert.strictEqual(K.Save.spend(NaN),false); assert.strictEqual(K.Save.data.obols,100);
  K.Save.addObols(Infinity); assert.strictEqual(K.Save.data.obols,100);
});

test('Pom rewards select an upgradeable boon instead of a capped or special boon', () => {
  reset(); G.run.addBoon('leg_hades','legendary'); G.run.addBoon('z_strike','common');
  const pick = G.run.rng.pick; G.run.rng.pick = pool => pool[0];
  try { G.applyShopItem({kind:'pom'}); }
  finally { G.run.rng.pick = pick; }
  assert.strictEqual(G.run.boonRarity('z_strike'),'rare');
  assert.strictEqual(G.run.boonRarity('leg_hades'),'legendary');
});
test('Pom rewards heal when every owned boon has reached its rarity cap', () => {
  reset(); G.run.addBoon('z_strike','heroic'); G.player.hp = 1;
  G.applyShopItem({kind:'pom'});
  assert.strictEqual(G.player.hp,31);
  assert.strictEqual(G.run.boonRarity('z_strike'),'heroic');
});

test('New characters have a finite zero dodge chance before acquiring dodge bonuses', () => {
  reset(); assert.strictEqual(G.player.stats.dodge,0);
});

let failed=0;
const selected = tests.filter(entry => !process.argv[2] || entry.name.includes(process.argv[2]));
for(const entry of selected) { try { entry.fn(); console.log('PASS ' + entry.name); } catch(error) { failed++; console.log('FAIL ' + entry.name + '\n  ' + error.message); } }
console.log('\nDebug regressions: ' + (selected.length-failed) + '/' + selected.length + ' passed');
process.exitCode = failed ? 1 : 0;
