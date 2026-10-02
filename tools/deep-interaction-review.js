'use strict';
const assert = require('assert');
const {K,G,storage,releaseAll} = require('./debug-harness');
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
function reset(fx={}) {
  storage.clear();K.Save.clear();K.Save.load();releaseAll();
  G.startRun(87123,{heroId:'perseus',weapon:'xiphos'});
  G.pendingReward=null;K.E.enemies.length=0;K.E.projectiles.length=0;K.E.effects.length=0;K.E.pickups.length=0;G.hazards.length=0;
  const p=G.player;p.x=p.y=p.aim=p.vx=p.vy=0;
  G.run.shopStats.push(fx);G.recalcStats();p.stats.crit=0;p.stats.damage=14;
  K.Input.mouse.wx=300;K.Input.mouse.wy=0;
  return p;
}
function foe(x=40,y=0,opts={}) {
  const e=new K.E.Enemy('shade',x,y,G,opts);e.spawnT=0;e.hp=e.maxHp=10000;K.E.enemies.push(e);return e;
}
const near=(got,want,msg='damage')=>assert.ok(Math.abs(got-want)<1e-6,`${msg}: expected ${want}, got ${got}`);
const hit=(e,amount=10,extra={})=>G.damageEnemy(e,amount,Object.assign({source:'melee',player:G.player,silent:true},extra));

test('a 6% projectile bonus increases real Cast impact by exactly 6%',()=>{
  let p=reset();p.doCast(G);const base=K.E.projectiles[0].dmg;
  p=reset({projDmg:0.06});p.doCast(G);const shot=K.E.projectiles[0],e=foe(shot.x,shot.y);
  shot.vx=shot.vy=0;shot.update(0.01,G);
  near(10000-e.hp,base*1.06,'6% Cast impact');
});
test('stacked projectile bonuses multiply without adding a second neutral damage term',()=>{
  const p=reset({projDmg:0.06});G.run.shopStats.push({projDmg:0.1});G.recalcStats();p.stats.crit=0;
  p.doCast(G);near(K.E.projectiles[0].dmg,p.stats.castDamage*1.06*1.1,'stacked Cast impact');
});
test('Atalanta innate projectile damage is 10% above her stated Strike damage',()=>{
  const p=reset();G.run.heroId='atalanta';G.recalcStats();p.stats.crit=0;p.doAttack(G);
  near(K.E.projectiles[0].dmg,p.attackDamage()*1.15*1.1,'Atalanta arrow damage');
});
for(const god of ['apollo','chaos']) test(god+' immediate Call kills cannot grant kill nova or haste',()=>{
  const p=reset({killNova:24,killHaste:0.3,statusSpread:1}),victim=foe(0),nearby=foe(110);
  victim.hp=1;G.applyStatus(victim,'poison',{dps:5,dur:3});p.stats.gods={[god]:1};G.startCall(p);
  assert.ok(victim.dead,'Call did not kill its target');
  near(G.run.stats.damageBySource['power:killNova']||0,0,'Call kill nova');
  assert.strictEqual(K.BuildPowers.activeEffects(p),null,'Call granted kill haste');
  assert.ok(!nearby.statuses.poison,'Call kill spread the victim status');
});
test('self-detonating enemies cannot grant player kill powers',()=>{
  const p=reset({killNova:24,killHaste:0.3,statusSpread:1}),victim=foe(0),nearby=foe(110);
  G.applyStatus(victim,'poison',{dps:5,dur:3});victim.detonate(G);
  assert.ok(victim.dead,'enemy did not complete self-destruction');near(10000-nearby.hp,0,'self-death kill nova');
  assert.strictEqual(K.BuildPowers.activeEffects(p),null,'self-death granted kill haste');
  assert.ok(!nearby.statuses.poison,'self-death spread a player status');
});
test('normal damaging-status deaths retain kill powers after attribution changes',()=>{
  const p=reset({killNova:24,killHaste:0.3,statusSpread:1}),victim=foe(0),nearby=foe(110);
  victim.hp=0.5;G.applyStatus(victim,'poison',{dps:10,dur:0.1});G.applyStatus(victim,'bleed',{dmg:3,dur:2});
  victim.update(0.05,G);victim.update(0.05,G);assert.ok(victim.dead);near(10000-nearby.hp,24,'normal DoT kill nova');
  assert.ok(K.BuildPowers.activeEffects(p).killHaste);assert.ok(nearby.statuses.bleed);
});
test('status spread respects immunity without weakening or shortening an existing status',()=>{
  reset({statusSpread:1});const victim=foe(0),immune=foe(80),strong=foe(120);
  immune.statusImmune={poison:1};G.applyStatus(strong,'poison',{dps:20,dur:5});
  G.applyStatus(victim,'poison',{dps:3,dur:2});victim.hp=1;hit(victim);
  assert.ok(!immune.statuses.poison,'spread bypassed poison immunity');near(strong.statuses.poison.dps,20,'existing poison damage');near(strong.statuses.poison.t,5,'existing poison duration');
});
test('real charm and summoned-ally attacks cannot grant kill powers',()=>{
  for(const kind of ['charm','ally']) {
    const p=reset({killNova:24,killHaste:0.3,statusSpread:1}),victim=foe(20),nearby=foe(110);
    victim.hp=1;G.applyStatus(victim,'poison',{dps:3,dur:2});
    const attacker=kind==='ally'?new K.E.Ally('spectral_hound',0,0,G,5):foe(0);
    if(kind==='charm')G.charmEnemy(attacker);else K.E.enemies.push(attacker);
    attacker.spawnT=0;attacker.contactCd=attacker.atkCd=0;attacker.update(0.01,G);
    assert.ok(victim.dead,kind+' did not actually attack');near(10000-nearby.hp,0,kind+' kill nova');
    assert.strictEqual(K.BuildPowers.activeEffects(p),null,kind+' granted haste');assert.ok(!nearby.statuses.poison);
  }
});
test('fresh runs cannot inherit a previous player timed power window',()=>{
  const p=reset({killHaste:0.3}),victim=foe(400);victim.hp=1;hit(victim);assert.ok(K.BuildPowers.activeEffects(p).killHaste);
  const next=reset({killHaste:0.3});assert.notStrictEqual(next,p);assert.strictEqual(K.BuildPowers.activeEffects(next),null);
});
function statusDeath(e) { for(let frame=0;frame<5&&!e.dead;frame++)e.update(0.08,G);assert.ok(e.dead,'damaging status did not actually kill'); }
test('Dionysus Call poison deaths preserve their proc origin after the Call returns',()=>{
  const p=reset({killNova:24,killHaste:0.3}),victim=foe(0);foe(110);victim.hp=1;p.stats.gods={dionysus:1};G.startCall(p);statusDeath(victim);
  near(G.run.stats.damageBySource['power:killNova']||0,0,'Call poison kill nova');assert.strictEqual(K.BuildPowers.activeEffects(p),null,'Call poison granted haste');
});
test('Cast fork poison deaths preserve their proc origin after impact',()=>{
  const p=reset({castFork:1,poison:{dps:10,dur:3},killNova:24,killHaste:0.3}),victim=foe(18);foe(110);p.doCast(G);
  const fork=K.E.projectiles.find(projectile=>projectile.buildProc);victim.hp=fork.dmg+1;fork.x=victim.x;fork.y=victim.y;fork.vx=fork.vy=0;fork.update(0.01,G);statusDeath(victim);
  near(G.run.stats.damageBySource['power:killNova']||0,0,'fork poison kill nova');assert.strictEqual(K.BuildPowers.activeEffects(p),null,'fork poison granted haste');
});
function applyPoison(e,dps,proc) {
  const p=G.player,projectile=new K.E.Projectile({x:e.x,y:e.y,dmg:1,friendly:true,owner:p,persp:'arrow',life:2,hitWall:false,trail:false,effects:{poison:{dps,dur:3}}});
  projectile.buildProc=proc;projectile.update(0.01,G);
}
for(const [name,first,second,wantsPowers] of [
  ['direct refresh of an equally strong proc status', [10,true],[10,false],true],
  ['proc refresh of an equally strong direct status', [10,false],[10,true],true],
  ['stronger proc replacing a direct status', [5,false],[10,true],false],
  ['weaker direct refresh of a stronger proc status', [10,true],[5,false],false],
  ['stronger direct replacing a proc status', [5,true],[10,false],true]
])test(name+' keeps the damage source attribution',()=>{
  const p=reset({killNova:24,killHaste:0.3}),victim=foe(40);foe(110);applyPoison(victim,...first);applyPoison(victim,...second);victim.hp=1;statusDeath(victim);
  near(G.run.stats.damageBySource['power:killNova']||0,wantsPowers?24:0,'refreshed poison kill nova');
  assert.strictEqual(!!(K.BuildPowers.activeEffects(p)||{}).killHaste,wantsPowers,'refreshed poison haste');
});
test('wave-applied poison cannot later grant player kill powers',()=>{
  const p=reset({drownDot:{dps:10,dur:3},killNova:24,killHaste:0.3}),victim=foe(40);foe(110);
  G.playerWave(0,0,130,1,0);victim.hp=1;statusDeath(victim);
  near(G.run.stats.damageBySource['power:killNova']||0,0,'wave poison kill nova');assert.strictEqual(K.BuildPowers.activeEffects(p),null,'wave poison granted haste');
});
test('Wrath echo status application keeps its proc origin outside damageEnemy',()=>{
  const p=reset({poison:{dps:10,dur:3},killNova:24,killHaste:0.3}),victim=foe(180);foe(280);
  G.run.addRelic('r_orpheus_lyre');G.recalcStats();p.doWrath(G);
  assert.ok(victim.statuses.poison,'actual Wrath echo did not apply poison');victim.hp=1;statusDeath(victim);
  near(G.run.stats.damageBySource['power:killNova']||0,0,'Wrath echo poison kill nova');assert.strictEqual(K.BuildPowers.activeEffects(p),null,'Wrath echo poison granted haste');
});

let failures=0;
for(const item of tests){try{item.fn();console.log('PASS '+item.name);}catch(error){failures++;console.error('FAIL '+item.name+'\n  '+error.message);}}
console.log(`${tests.length-failures}/${tests.length} deep interaction regressions passed`);
if(failures)process.exitCode=1;
