'use strict';
const assert = require('assert');
const {K,G,storage,releaseAll} = require('./debug-harness');
const D = K.DATA;
function reset(seed) {
  storage.clear(); K.Save.load(); G.startRun(seed); releaseAll();
  K.E.enemies.length=0; G.pendingSpawns.length=0;
  G.player.hp=G.player.stats.maxHp=1e9;
  G.player.invuln=1e9;
}
function finite(label, object, fields) {
  fields.forEach(key=>assert.ok(Number.isFinite(object[key]),label+' '+key+' is not finite: '+object[key]));
}
let enemies=0,bosses=0,boons=0,relics=0;
for (const id of Object.keys(D.ENEMIES)) {
  reset(1200+enemies);
  const e=G.addEnemy(id,0,-150,{});
  for(let frame=0;frame<720;frame++) {
    if (frame%120===0) { G.player.x=Math.sin(frame)*180; G.player.y=Math.cos(frame)*150; }
    G.update(1/60);
    finite(id,e,['x','y','vx','vy','hp','maxHp']);
  }
  if(!e.dead) G.killEnemy(e,false);
  const record=G.run.killChronicle.find(x=>x.enemyId===id);
  if (e.ally) assert.ok(!record,id+' incorrectly counted an ally as an enemy kill');
  else {
    assert.ok(record && typeof record.backstory==='string' && record.backstory.length>80,id+' lost its kill backstory');
    assert.ok(!record.backstory.includes('undefined'),id+' has missing backstory fields');
  }
  enemies++;
}
for (const id of Object.keys(D.BOSSES)) {
  reset(2400+bosses); G.spawnBoss(G.region(),id); const b=G.boss;
  for(let frame=0;frame<1440;frame++) {
    if(frame===420) b.hp=b.maxHp*.48;
    if(frame===960) b.hp=b.maxHp*.19;
    G.update(1/60); finite(id,b,['x','y','vx','vy','hp','maxHp']);
  }
  if(!b.dead) G.killEnemy(b,false);
  assert.ok(G.run.killChronicle.some(x=>x.enemyId===id&&x.boss),id+' lost its boss record');
  bosses++;
}
for(const boon of D.BOONS.concat(D.SPECIAL_BOONS)) {
  reset(3600+boons); G.run.addBoon(boon.id,boon.rarity||'heroic'); G.recalcStats();
  const s=G.player.stats;
  Object.keys(s).filter(key=>typeof s[key]==='number').forEach(key=>assert.ok(Number.isFinite(s[key]),boon.id+' corrupts '+key));
  assert.ok(s.maxHp>0&&G.player.speed()>0,boon.id+' invalid health/speed'); boons++;
}
for(const relic of D.RELICS) {
  reset(5600+relics); G.run.addRelic(relic.id); G.recalcStats();
  const s=G.player.stats;
  Object.keys(s).filter(key=>typeof s[key]==='number').forEach(key=>assert.ok(Number.isFinite(s[key]),relic.id+' corrupts '+key));
  assert.ok(s.maxHp>0&&G.player.speed()>0,relic.id+' invalid health/speed'); relics++;
}
console.log('CONTENT AUDIT PASSED: '+enemies+' enemy AI/death/backstory scenarios, '+bosses+' boss AI/death scenarios, '+boons+' isolated boon stat blocks, '+relics+' isolated relic stat blocks');
