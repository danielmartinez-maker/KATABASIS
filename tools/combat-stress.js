'use strict';
const assert = require('assert');
const {K,G,storage,releaseAll} = require('./debug-harness');
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
function reset(seed=84001) {
  storage.clear(); K.Save.clear(); K.Save.load(); releaseAll();
  G.startRun(seed,{}); G.pendingReward=null; K.E.enemies.length=0;
  K.E.projectiles.length=0; G.player.x=500; G.player.y=300;
}
function foe(boss=false,tempo=1) {
  const e=boss?new K.E.Boss('medusa',-300,-200,G,{attackTempoMul:tempo}):new K.E.Enemy('shade',-300,-200,G,{attackTempoMul:tempo});
  e.hp=e.maxHp=100000; e.spawnT=0; e.atkCd=99; e.entered=true;
  K.E.enemies.push(e); return e;
}
function advance(e,seconds,dt=1/60) {
  let remaining=seconds;
  while(remaining>1e-9) { const step=Math.min(dt,remaining);e.update(step,G);remaining-=step; }
}
function near(actual,want,message) { assert.ok(Math.abs(actual-want)<1e-6,message+': expected '+want+', got '+actual); }

// Catches expiry-before-tick loss, tempo-scaled status clocks and lost sub-tick damage.
for(const boss of [false,true]) for(const tempo of [1,1.6]) for(const dt of [1/60,0.01,0.035,0.08]) {
  test(`${boss?'boss':'enemy'} DoT duration and total damage at tempo ${tempo}, frame ${dt}`,()=>{
    for(const [key,data,want] of [['bleed',{dmg:16,dur:3},48],['poison',{dps:11,dur:4},44],['burn',{dps:9,dur:3},27]]) {
      reset();const e=foe(boss,tempo);G.applyStatus(e,key,data);
      advance(e,1,dt);near(e.statuses[key].t,data.dur-1,key+' remaining duration');
      advance(e,data.dur-1+0.1,dt);near(100000-e.hp,want,key+' full damage');
      assert.ok(!e.statuses[key],key+' did not expire');
    }
  });
}
test('short and refreshed DoTs retain fractional damage without an artificial minimum hit',()=>{
  reset();const e=foe();G.applyStatus(e,'burn',{dps:2,dur:0.15});advance(e,0.2);near(100000-e.hp,0.3,'short burn');
  G.applyStatus(e,'poison',{dps:10,dur:1});advance(e,0.3);G.applyStatus(e,'poison',{dps:10,dur:1});advance(e,1.1);
  near(100000-e.hp,13.3,'refreshed poison damage');
});
test('Trial tempo accelerates attack clocks but preserves stun and movement clocks',()=>{
  reset();const normal=foe(false,1),fast=foe(false,1.6);G.applyStatus(normal,'stun',{dur:2});G.applyStatus(fast,'stun',{dur:2});
  advance(normal,0.5);advance(fast,0.5);near(normal.statuses.stun.t,1.5,'normal stun');near(fast.statuses.stun.t,1.5,'Trial stun');
  delete normal.statuses.stun;delete fast.statuses.stun;
  normal.x=fast.x=-300;normal.y=fast.y=-200;normal.vx=fast.vx=normal.speed;normal.vy=fast.vy=0;
  normal.ai=fast.ai='lunge';G.player.x=500;G.player.y=-200;
  K.E.enemies.splice(K.E.enemies.indexOf(fast),1);advance(normal,0.1,0.01);
  K.E.enemies.length=0;K.E.enemies.push(fast);advance(fast,0.1,0.01);
  near(fast.x,normal.x,'constant-speed travel');
  assert.ok(fast.atkCd<normal.atkCd,'attack cadence was not accelerated');
});
test('projectile poison receives the same 50% poison bonus as melee',()=>{
  reset();G.run.addBoon('d_strike','common');G.run.addBoon('d_fog','common');G.recalcStats();
  const e=foe();G.player.applyOnHit(e,G,false);near(e.statuses.poison.dps,16.5,'melee poison');
  const riders=G.player.projectileRiders();near(riders.poison.dps,16.5,'projectile poison');
});
test('a player projectile critical hit deals its 1.9x multiplier',()=>{
  reset();const e=foe();const pr=new K.E.Projectile({x:e.x,y:e.y,dmg:100,friendly:true,owner:G.player,crit:true,persp:'arrow',life:2,hitWall:false,trail:false});
  pr.update(0.01,G);near(100000-e.hp,190,'critical projectile');
});
test('weaken reduces enemy outgoing damage without reducing player damage',()=>{
  reset();const e=foe();G.applyStatus(e,'weaken',{amount:0.3,dur:4});
  near(G.damageEnemy(e,100,{player:G.player,silent:true}),100,'damage against weakened target');
  G.player.stats.armor=0;G.player.stats.dmgReduce=0;G.player.stats.dodge=0;G.player.hp=1000;G.player.invuln=0;
  G.damagePlayer(100,e,'contact');near(1000-G.player.hp,70,'weakened enemy damage');
});
test('double attack grants a second real hit when its chance procs',()=>{
  reset();const e=foe();G.player.x=e.x-40;G.player.y=e.y;G.player.aim=0;G.player.comboStep=0;
  G.player.stats.doubleAttack=1;G.player.stats.crit=0;
  const base=G.player.attackDamage();G.player.doAttack(G);near(100000-e.hp,base*2,'double attack damage');
});
test('stacked control effects cannot reverse movement or outgoing damage',()=>{
  reset();const e=foe();G.applyStatus(e,'slow',{amount:2,dur:4});
  assert.ok(e.statusSpeed()>=0,'slow reversed enemy movement');
  G.applyStatus(e,'weaken',{amount:2,dur:4});assert.ok(e.statuses.weaken.amount<=1,'weaken exceeds 100%');
});
test('enemy poison projectiles apply their rider and deliver all stated damage over time',()=>{
  reset();const p=G.player;p.invuln=0;p.shield=0;p.hp=1000;p.stats.armor=0;p.stats.dmgReduce=0;p.stats.dodge=0;p.stats.deflectProj=0;
  const pr=new K.E.Projectile({x:p.x,y:p.y,dmg:10,friendly:false,persp:'poison',life:2,hitWall:false,trail:false,effects:{poison:{dps:11,dur:4}}});
  pr.update(0.01,G);assert.ok(p.statuses.poison,'enemy projectile dropped its poison rider');
  const before=p.hp;for(let frame=0;frame<250;frame++)p.update(1/60,G);
  near(before-p.hp,44,'enemy poison duration damage');assert.ok(!p.statuses.poison,'poison did not expire');
});
test('Artemis initial Call arrows reach the enemies they rain onto',()=>{
  reset();const e=foe();G.player.stats.gods={artemis:1};G.startCall(G.player);
  const arrows=K.E.projectiles.filter(pr=>pr.persp==='arrow');assert.strictEqual(arrows.length,3);
  for(let frame=0;frame<60;frame++)for(const pr of arrows)if(!pr.dead)pr.update(1/60,G);
  assert.ok(e.hp<100000,'the initial arrows remained motionless and never damaged their target');
});

test('Artemis rain reaches targets at the north arena edge',()=>{
  reset();G.arena={x:0,y:0,w:800,h:600};const e=foe();e.x=300;e.y=40;
  G.player.stats.gods={artemis:1};G.startCall(G.player);
  const arrows=K.E.projectiles.filter(pr=>pr.persp==='arrow');assert.strictEqual(arrows.length,3);
  for(let frame=0;frame<60;frame++)for(const pr of arrows)if(!pr.dead)pr.update(1/60,G);
  assert.ok(e.hp<100000,'rain was culled above the arena before reaching its target');
});

function exposedPlayer() {
  const p=G.player;p.hp=1000;p.invuln=0;p.shield=0;p.guardT=0;
  Object.assign(p.stats,{armor:0,dmgReduce:0,dodge:0,deflectProj:0});return p;
}
test('WEAKEN reduces actual scripted Medusa projectile damage',()=>{
  reset();const b=foe(true),p=exposedPlayer();G.applyStatus(b,'weaken',{amount:0.3,dur:4});
  b.state='snakes';b.stateT=0.6;b.update(0.01,G);
  assert.ok(K.E.projectiles.length>=10,'Medusa did not fire her scripted volley');
  const pr=K.E.projectiles[0];assert.strictEqual(pr.owner,b,'boss projectile lost its owner');
  pr.x=p.x;pr.y=p.y;pr.vx=pr.vy=0;const dmg=pr.dmg;pr.update(0.01,G);
  near(1000-p.hp,dmg*0.7,'weakened scripted projectile');
});
test('WEAKEN carries through hostile projectile explosions',()=>{
  reset();const b=foe(true),p=exposedPlayer();G.applyStatus(b,'weaken',{amount:0.3,dur:4});
  const pr=new K.E.Projectile({x:p.x,y:p.y,dmg:100,aoe:60,aoeDmg:80,owner:b,friendly:false,hitWall:false});
  pr.explode(G);near(1000-p.hp,56,'weakened projectile explosion');
});
test('WEAKEN reduces boss hazard and arena quake damage with retained attribution',()=>{
  reset();const b=foe(true),p=exposedPlayer();G.applyStatus(b,'weaken',{amount:0.3,dur:4});
  b.state='venomPool';b.stateT=0.7;b.def={...b.def,ai:'hydra'};b.update(0.01,G);
  assert.ok(G.hazards.length>=4,'Hydra did not create venom pools');
  const h=G.hazards[0];assert.strictEqual(h.owner,b,'boss hazard lost its owner');
  G.hazards=[h];h.x=p.x;h.y=p.y;h.tickT=h.tick;K.E.updateHazards(0.01,G);
  near(1000-p.hp,h.dmg*0.7,'weakened venom pool');
  p.invuln=0;p.x=p.y=0;const before=p.hp;G.arenaQuake(520,100,b);
  near(before-p.hp,70,'weakened arena quake');
});
test('friendly homing steers toward a hostile even when an ally is nearer',()=>{
  reset();const target=foe();target.x=0;target.y=200;
  const ally=new K.E.Enemy('shade',40,0,G,{ally:true});K.E.enemies.push(ally);
  const pr=new K.E.Projectile({x:0,y:0,vx:100,vy:0,friendly:true,owner:G.player,persp:'arrow',homing:10,life:2,hitWall:false,trail:false});
  pr.update(0.05,G);assert.ok(pr.vy>20,'homing chose the nearby ally instead of the hostile above');
});

test('delayed hostile volleys wait before moving or hitting',()=>{
  reset();const p=exposedPlayer();const pr=new K.E.Projectile({x:p.x,y:p.y,dmg:100,delay:0.25,friendly:false,hitWall:false});
  K.E.projectiles.push(pr);K.E.updateEffects(0.1);near(p.hp,1000,'damage before delayed volley');
  near(pr.life,pr.maxLife,'projectile life consumed while waiting');
  K.E.updateEffects(0.16);K.E.updateEffects(0.01);near(p.hp,900,'damage after delayed volley');
});
test('knockback bonuses compile from a neutral 1x baseline',()=>{
  reset();near(G.player.stats.knock,1,'neutral knockback multiplier');
  G.run.shopStats.push({knock:0.65});G.recalcStats();near(G.player.stats.knock,1.65,'65% knockback bonus');
  reset();G.run.addBoon('p_strike','common');G.recalcStats();near(G.player.stats.knock,3,'Poseidon source +200% bonus');
  reset();G.run.fatedThreadIds=['breaker-stride'];G.recalcStats();near(G.player.stats.knock,1.35,'Breaker Stride +35% bonus');
});
test('Breaker Stride increases actual dash knockback by its stated 35%',()=>{
  reset();const e=foe();G.player.x=e.x-20;G.player.y=e.y;G.player._dashHit=null;
  G.playerDashDamage(G.player,10);const ordinary=e.knockVX;assert.ok(ordinary>0);
  e.knockVX=e.knockVY=0;G.player._dashHit=null;G.run.fatedThreadIds=['breaker-stride'];G.recalcStats();
  G.playerDashDamage(G.player,10);near(e.knockVX,ordinary*1.35,'dash knockback force');
});
test('every divine Call completes its full channel with finite combat state',()=>{
  let count=0;
  for(const god of Object.keys(K.DATA.GODS)) {
    reset(84003+count++);foe();G.player.stats.gods={[god]:1};G.player.hp=Math.max(1,G.player.hp-20);
    G.startCall(G.player);assert.strictEqual(G.player.callGod,god);
    for(let frame=0;frame<720;frame++) { G.player.invuln=10;G.update(1/60); }
    for(const e of [G.player,...K.E.enemies,...K.E.projectiles]) for(const key of ['x','y','hp','dmg','life']) {
      if(e[key]!==undefined)assert.ok(Number.isFinite(e[key]),god+' produced invalid '+key);
    }
    assert.ok(G.player.callActive<=0,god+' channel did not finish');
  }
  console.log('  Exercised '+count+' gods through full Call channels');
});
test('200 seeded Rare/Heroic stacking builds remain finite through attacks and abilities',()=>{
  const all=K.DATA.BOONS.concat(K.DATA.SPECIAL_BOONS);
  function finite(value,path) { for(const key of Object.keys(value)) {const v=value[key];if(typeof v==='number')assert.ok(Number.isFinite(v),path+'.'+key+' is not finite');else if(v&&typeof v==='object')finite(v,path+'.'+key);} }
  for(let build=0;build<200;build++) {
    reset(90000+build);const e=foe();G.player.x=e.x-40;G.player.y=e.y;G.player.aim=0;
    const picked=new Set();while(picked.size<20)picked.add(G.run.rng.int(0,all.length-1));
    for(const index of picked)G.run.addBoon(all[index].id,build%2?'heroic':'rare');
    G.recalcStats();finite(G.player.stats,'build '+build);
    assert.ok(G.player.stats.crit<=0.85&&G.player.stats.dodge<=0.6&&G.player.stats.dmgReduce<=0.75&&G.player.stats.dashMax<=6&&G.player.stats.callBoost<=0.4,'cap broken in build '+build);
    G.player.doAttack(G);G.player.doWrath(G);G.player.doCast(G);G.player.doRush(G);G.player.doAscend(G);
    for(let frame=0;frame<30;frame++){G.player.invuln=10;G.update(1/60);}
    for(const unit of [G.player,...K.E.enemies,...K.E.projectiles])for(const key of ['x','y','hp','dmg','life'])if(unit[key]!==undefined)assert.ok(Number.isFinite(unit[key]),'build '+build+' invalid '+key);
  }
  console.log('  Exercised 4,000 acquired boons across 200 builds and 6,000 simulated frames');
});

let failures=0;
for(const t of tests) {try{t.fn();console.log('PASS '+t.name);}catch(err){failures++;console.error('FAIL '+t.name+'\n  '+err.message);}}
console.log(`${tests.length-failures}/${tests.length} combat stress regressions passed`);
if(failures)process.exitCode=1;
