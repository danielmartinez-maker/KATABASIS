'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {K,G,storage,releaseAll}=require('./debug-harness');
const additions=K.DATA.BOONS.concat(K.DATA.SPECIAL_BOONS).filter(b=>b.expansionId==='divine-builds');
const originals=K.DATA.BOONS.concat(K.DATA.SPECIAL_BOONS).filter(b=>b.expansionId!=='divine-builds');
const heroes=Object.keys(K.RunSystems.HEROES),weapons=Object.keys(K.DATA.WEAPONS);
const powers=Object.keys(K.BuildPowers.rules),coverage=new Set();
let peakProjectiles=0,peakEffects=0,kills=0,frames=0;
function finite(value,label) {
  for(const [key,v] of Object.entries(value)) {
    if(typeof v==='number')assert.ok(Number.isFinite(v),label+'.'+key+' is not finite');
    else if(v&&typeof v==='object')finite(v,label+'.'+key);
  }
}
for(let build=0;build<600;build++) {
  storage.clear();K.Save.clear();K.Save.load();releaseAll();G.startRun(100000+build,{});
  G.run.heroId=heroes[build%heroes.length];G.run.weapon=weapons[Math.floor(build/heroes.length)%weapons.length];
  G.pendingReward=null;G.pendingSpawns=[];G.hazards=[];
  K.E.enemies.length=K.E.projectiles.length=K.E.effects.length=K.E.pickups.length=0;
  G.player.x=G.player.y=G.player.vx=G.player.vy=0;G.player.aim=0;
  const focus=powers[build%powers.length],pool=additions.filter(b=>b.buildArchetype===focus);
  const selected=new Set([G.run.rng.pick(pool)]);
  while(selected.size<15)selected.add(G.run.rng.pick(additions));
  while(selected.size<20)selected.add(G.run.rng.pick(originals));
  for(const boon of selected)G.run.addBoon(boon.id,boon.rarity==='common'?['common','rare','heroic'][build%3]:boon.rarity);
  G.run.fatedThreadIds=G.run.rng.shuffle(K.RunSystems.FATED_THREADS.slice()).slice(0,2).map(t=>t.id);
  G.run.augmentIds=G.run.rng.shuffle(K.RunSystems.AUGMENTS.slice()).slice(0,3).map(a=>a.id);
  G.recalcStats();finite(G.player.stats,'build '+build);
  for(const key of powers) {
    const value=G.player.stats[key]||0,rule=K.BuildPowers.rules[key];
    assert.ok(value>=0&&value<=rule.cap,'build '+build+' broke '+key+' cap');
    if(rule.unit==='count')assert.equal(value,Math.floor(value),'fractional Cast fork');
    if(value>0)coverage.add(key);
  }
  for(let i=0;i<12;i++) {
    const angle=i*Math.PI/6,e=G.addEnemy(['shade','hoplite','soul'][i%3],Math.cos(angle)*[55,140,240][i%3],Math.sin(angle)*[55,140,240][i%3],{});
    e.spawnT=0;e.hp=e.maxHp=100000;e.atkCd=0.1;
    if(i%2===0){G.applyStatus(e,'bleed',{dmg:4,dur:3});G.applyStatus(e,'poison',{dps:3,dur:3});}
  }
  G.player.hp=G.player.stats.maxHp;G.player.shield=20;
  const victim=G.addEnemy('shade',40,0,{});victim.spawnT=0;victim.hp=1;
  G.damageEnemy(victim,10,{source:'melee',player:G.player});
  G.player.invuln=0;G.player.guardRecover=0;G.player.startGuard(G);G.player.absorb(10,{x:40,y:0},'contact',G);
  G.player.doAttack(G);G.player.doCast(G);G.player.doWrath(G);G.player.doRush(G);G.player.doAscend(G);
  for(let frame=0;frame<60;frame++) {
    G.player.invuln=10;
    if(frame%15===0)G.player.doAttack(G);
    if(frame===30){G.player.dashCd=0;G.player.dashCharges=2;K.Input.pressed.Space=true;}
    G.update(1/60);releaseAll();frames++;
    for(const unit of [G.player,...K.E.enemies,...K.E.projectiles])for(const key of ['x','y','vx','vy','hp','dmg','life']) {
      if(unit[key]!==undefined)assert.ok(Number.isFinite(unit[key]),'build '+build+' produced invalid '+key);
    }
    assert.ok(K.E.projectiles.length<512,'build '+build+' has runaway projectiles');
    assert.ok(K.E.effects.length<2048,'build '+build+' has runaway effects');
    peakProjectiles=Math.max(peakProjectiles,K.E.projectiles.length);peakEffects=Math.max(peakEffects,K.E.effects.length);
  }
  kills+=G.run.stats.kills;
}
assert.equal(coverage.size,18,'mixed builds did not exercise all new powers');
assert.ok(kills>=600,'direct kill powers were not exercised');
const result={ok:true,builds:600,acquiredBoons:12000,heroes:heroes.length,weapons:weapons.length,frames,newPowers:Array.from(coverage).sort(),peakProjectiles,peakEffects,kills,scope:'Seeded extreme stacking fixtures; individual trigger accuracy is covered by power-regressions.js.'};
if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
