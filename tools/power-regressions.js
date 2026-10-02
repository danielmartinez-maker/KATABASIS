'use strict';
const assert = require('assert');
const {K,G,storage,releaseAll} = require('./debug-harness');
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
function reset(fx={}) {
  storage.clear();K.Save.clear();K.Save.load();releaseAll();
  G.startRun(87123,{heroId:'perseus',weapon:'xiphos'});
  G.pendingReward=null;K.E.enemies.length=0;K.E.projectiles.length=0;K.E.effects.length=0;K.E.pickups.length=0;G.hazards.length=0;
  G.player.x=0;G.player.y=0;G.player.aim=0;G.player.vx=0;G.player.vy=0;
  G.run.shopStats.push(fx);G.recalcStats();G.player.stats.crit=0;G.player.stats.damage=14;
  K.Input.mouse.wx=300;K.Input.mouse.wy=0;
  return G.player;
}
function foe(x=40,y=0,opts={}) {
  const e=new K.E.Enemy('shade',x,y,G,opts);e.spawnT=0;e.hp=e.maxHp=10000;K.E.enemies.push(e);return e;
}
const near=(got,want,msg='damage')=>assert.ok(Math.abs(got-want)<1e-6,`${msg}: expected ${want}, got ${got}`);
function hit(e,amount=10,extra={}) { return G.damageEnemy(e,amount,Object.assign({source:'melee',player:G.player,silent:true},extra)); }
function advance(seconds) {
  releaseAll();let left=seconds;
  while(left>1e-9){const dt=Math.min(left,1/60);G.player.update(dt,G);left-=dt;}
  // Restore the controlled combat fixture after real movement and knockback updates.
  G.player.x=G.player.y=G.player.vx=G.player.vy=G.player.knockVX=G.player.knockVY=0;G.player.aim=0;
  releaseAll();
}
function dash() { K.Input.pressed.Space=true;G.player.update(0.01,G);releaseAll(); }
function parry() { const p=G.player;p.guardRecover=0;p.invuln=0;p.startGuard(G);return p.absorb(10,{x:40,y:0},'contact',G); }

test('critical burst damages a nearby hostile once per elapsed second',()=>{
  reset({critBurst:30});const target=foe(),nearby=foe(150),outside=foe(201),ally=foe(100,0,{ally:true});
  hit(target,10,{crit:true});near(10000-nearby.hp,30);near(10000-outside.hp,0);near(10000-ally.hp,0);
  hit(target,10,{crit:true});near(10000-nearby.hp,30);advance(1.01);hit(target,10,{crit:true});near(10000-nearby.hp,60);
});
test('Cast forks add two real spread impacts at 65 percent without extra rifts',()=>{
  const p=reset({castFork:2});p.doCast(G);const shots=K.E.projectiles.slice();assert.strictEqual(shots.length,3);
  const original=shots.find(s=>s.onDeath),forks=shots.filter(s=>!s.onDeath);assert.strictEqual(forks.length,2);
  near(forks[0].dmg,original.dmg*0.65,'fork damage');assert.ok(forks[0].vy*forks[1].vy<0,'forks did not spread');
  const enemy=foe(forks[0].x,forks[0].y);forks[0].vx=forks[0].vy=0;forks[0].update(0.01,G);
  near(10000-enemy.hp,original.dmg*0.65,'fork collision damage');forks[1].die(G);assert.strictEqual(G.hazards.length,0);
  original.die(G);assert.strictEqual(G.hazards.length,1);
});
test('Cast nova deals flat damage only when each original spear lands',()=>{
  const p=reset({castNova:23,castFork:1});const enemy=foe(0),outside=foe(150);p.doCast(G);near(10000-enemy.hp,0);
  const original=K.E.projectiles.find(s=>s.onDeath),fork=K.E.projectiles.find(s=>!s.onDeath);assert.ok(fork,'Cast did not create the requested fork');
  fork.x=fork.y=0;fork.die(G);near(10000-enemy.hp,0);original.x=original.y=0;original.die(G);
  near(10000-enemy.hp,23);near(10000-outside.hp,0);
});
test('Dash nova fires on accepted Dash activation and does not repeat while moving',()=>{
  reset({dashNova:29});const enemy=foe(-70),outside=foe(-130),ally=foe(-40,0,{ally:true});dash();
  near(10000-enemy.hp,29);near(10000-outside.hp,0);near(10000-ally.hp,0);advance(0.02);near(10000-enemy.hp,29);
  G.player.dashCharges=0;G.player.dashing=0;dash();near(10000-enemy.hp,29);
});
test('Dash empowers the next Strike once, survives previews, and expires after three seconds',()=>{
  const p=reset({dashStrike:0.5});const enemy=foe();dash();near(p.attackDamage(),14,'preview cannot consume or apply Strike bonus');
  p.doAttack(G);near(10000-enemy.hp,21);p.comboStep=0;p.doAttack(G);near(10000-enemy.hp,35);
  p.dashing=0;p.dashCd=0;dash();advance(3.01);p.comboStep=0;p.doAttack(G);near(10000-enemy.hp,49);
});
test('fresh parry nova reaches behind the guard and stale blocks cannot trigger it',()=>{
  const p=reset({parryNova:27});const back=foe(-70),outside=foe(-170);parry();near(10000-back.hp,27);near(10000-outside.hp,0);
  p.guardT=p.guardWindow-0.2;p.absorb(10,{x:40,y:0},'contact',G);near(10000-back.hp,27);
});
test('parry healing cannot repeat inside one second and respects maximum health',()=>{
  const p=reset({parryHeal:12});p.hp=40;parry();near(p.hp,52,'first heal');parry();near(p.hp,52,'heal cooldown');
  advance(1.01);parry();near(p.hp,64,'heal after cooldown');p.hp=p.stats.maxHp-1;advance(1.01);parry();near(p.hp,p.stats.maxHp,'heal cap');
});
test('two damaging statuses detonate only on direct hits, with one cooldown per target',()=>{
  reset({statusDetonate:31});const first=foe(),second=foe(100),single=foe(200);
  for(const e of [first,second]){G.applyStatus(e,'bleed',{dmg:2,dur:3});G.applyStatus(e,'burn',{dps:2,dur:3});}
  G.applyStatus(single,'poison',{dps:2,dur:3});G.applyStatus(single,'slow',{amount:0.2,dur:3});
  hit(first);hit(first);hit(second);hit(single);near(10000-first.hp,51);near(10000-second.hp,41);near(10000-single.hp,10);
  hit(second,10,{source:'wave'});near(10000-second.hp,51);advance(1.01);hit(first);near(10000-first.hp,92);
});
test('status spread preserves remaining duration and DPS on at most two nearby hostiles',()=>{
  reset({statusSpread:1});const victim=foe(),a=foe(80),b=foe(120),third=foe(160),far=foe(300),ally=foe(60,0,{ally:true});
  G.applyStatus(victim,'bleed',{dmg:7,dur:5});victim.statuses.bleed.t=1.75;G.applyStatus(victim,'poison',{dps:9,dur:4});victim.statuses.poison.t=2.25;
  G.applyStatus(victim,'burn',{dps:5,dur:4});victim.statuses.burn.t=0;G.applyStatus(victim,'slow',{amount:0.5,dur:4});victim.hp=1;hit(victim);
  for(const e of [a,b]){assert.ok(e.statuses.bleed&&e.statuses.poison,'kill did not spread both damaging statuses');near(e.statuses.bleed.dmg,7,'spread bleed DPS');near(e.statuses.bleed.t,1.75,'remaining bleed');near(e.statuses.poison.dps,9,'spread poison DPS');near(e.statuses.poison.t,2.25,'remaining poison');assert.ok(!e.statuses.slow&&!e.statuses.burn);}
  for(const e of [third,far,ally])assert.ok(!e.statuses.bleed,'status reached an excluded or excess target');
});
test('boss hunter increases direct damage to bosses and minibosses only',()=>{
  reset({bossHunter:0.3});const boss=new K.E.Boss('medusa',60,0,G,{});boss.hp=boss.maxHp=10000;K.E.enemies.push(boss);
  const mini=foe(100),normal=foe(160);mini.isMiniBoss=true;near(hit(boss,100),130);near(hit(mini,100),130);near(hit(normal,100),100);
  near(hit(boss,100,{source:'wave'}),100,'indirect bonus exclusion');
});
test('distance damage uses a strict 180 pixel threshold on direct impacts',()=>{
  reset({distanceDamage:0.25});const nearTarget=foe(180),far=foe(181);near(hit(nearTarget,100),100);near(hit(far,100),125);near(hit(far,100,{source:'hazard'}),100);
});
test('close damage uses a strict 100 pixel threshold on direct impacts',()=>{
  reset({closeDamage:0.2});const close=foe(99),edge=foe(100);near(hit(close,100),120);near(hit(edge,100),100);
});
test('kill nova cannot chain across enemies killed by its own nova',()=>{
  reset({killNova:24});const victim=foe(0),chain=foe(100),survivor=foe(180);victim.hp=chain.hp=1;hit(victim);
  assert.ok(victim.dead&&chain.dead,'kill nova did not kill nearby hostile');near(10000-survivor.hp,0,'recursive nova was not suppressed');
});
test('kill haste shortens real Strike cooldown for four seconds and refreshes without stacking',()=>{
  const p=reset({killHaste:0.3});const victim=foe(400);victim.hp=1;hit(victim);p.doAttack(G);near(p.attackCd,0.34/1.3,'hasted cooldown');
  advance(3);const second=foe(400);second.hp=1;hit(second);p.doAttack(G);near(p.attackCd,0.34/1.3,'refreshed nonstacking haste');
  advance(3);p.doAttack(G);near(p.attackCd,0.34/1.3,'refreshed duration');advance(1.01);p.doAttack(G);near(p.attackCd,0.34,'expired haste');
});
test('shield damage is active only while positive shield remains',()=>{
  const p=reset({shieldDamage:0.35});const enemy=foe();p.shield=1;near(hit(enemy,100),135);p.shield=0;near(hit(enemy,100),100);
});
test('fresh parry reduces current Cast cooldown without going below zero',()=>{
  const p=reset({guardCast:0.7});p.castCd=1.5;parry();near(p.castCd,0.8,'Cast recovery');p.castCd=0.2;parry();near(p.castCd,0,'Cast lower bound');
  p.castCd=1;p.guardT=p.guardWindow-0.2;p.absorb(10,{x:40,y:0},'contact',G);near(p.castCd,1,'stale block');
});
test('Rush nova deals its flat damage on activation within 140 pixels',()=>{
  const p=reset({rushNova:32});const nearby=foe(-90),outside=foe(-150);p.doRush(G);near(10000-nearby.hp,32);near(10000-outside.hp,0);
});
test('Ascend nova adds flat damage only inside 180 pixels',()=>{
  const p=reset({ascendNova:36});const nearby=foe(-120),outside=foe(-190);p.doAscend(G);
  near(10000-nearby.hp-(10000-outside.hp),36,'additional Ascend nova');
});
test('power stats add across sources, cap at safe limits, and Cast fork rarity stays integral',()=>{
  const p=reset({critBurst:120,castFork:2,bossHunter:0.4,parryHeal:17,killHaste:0.4});
  G.run.shopStats.push({critBurst:120,castFork:2,bossHunter:0.4,parryHeal:17,killHaste:0.4});G.recalcStats();
  near(p.stats.critBurst,200,'flat cap');near(p.stats.castFork,4,'fork cap');near(p.stats.bossHunter,0.75,'percent cap');near(p.stats.parryHeal,25,'heal cap');near(p.stats.killHaste,0.6,'haste cap');
  const resolved=K.resolveBoonFx({fx:{castFork:1}},'rare');assert.ok(Number.isInteger(resolved.castFork),'rarity produced fractional forks');
});
test('invalid and negative power values cannot corrupt compiled stats or combat',()=>{
  const p=reset({dashNova:Infinity,critBurst:NaN,parryHeal:-7,distanceDamage:'0.4',castFork:50});
  near(p.stats.castFork,4,'finite fork cap');for(const key of ['dashNova','critBurst','parryHeal','distanceDamage'])near(p.stats[key]||0,0,key+' invalid input');
  const enemy=foe();hit(enemy,100,{crit:true});near(10000-enemy.hp,100,'invalid powers changed damage');
});
test('proc projectiles and allied kills cannot trigger burst, detonation, kill nova or haste',()=>{
  const p=reset({critBurst:30,statusDetonate:30,killNova:30,killHaste:0.3,castFork:1});const victim=foe(18),nearby=foe(70),ally=foe(80,0,{ally:true});
  G.applyStatus(victim,'bleed',{dmg:1,dur:2});G.applyStatus(victim,'poison',{dps:1,dur:2});p.doCast(G);
  const fork=K.E.projectiles.find(s=>!s.onDeath);assert.ok(fork,'Cast did not create the requested fork');victim.hp=1;fork.x=victim.x;fork.y=victim.y;fork.vx=fork.vy=0;fork.crit=true;fork.update(0.01,G);
  assert.ok(victim.dead);near(10000-nearby.hp,0,'proc triggered secondary damage');p.aim=Math.PI/2;p.doAttack(G);near(p.attackCd,0.34,'proc granted haste');
  ally.hp=1;G.killEnemy(ally,false);near(10000-nearby.hp,0,'allied kill triggered nova');
});
test('an empty power build preserves base Strike, Cast, and parry behavior',()=>{
  const p=reset();const enemy=foe();p.doAttack(G);near(10000-enemy.hp,14);near(p.attackCd,0.34);p.doCast(G);assert.strictEqual(K.E.projectiles.length,1);
  K.E.projectiles[0].die(G);assert.strictEqual(G.hazards.length,1);p.hp=40;parry();near(p.hp,40,'base parry did not heal');
});

for(const status of ['bleed','poison','burn'])test(status+' final tick grants kill powers and spreads only still-active statuses',()=>{
  const p=reset({killNova:24,killHaste:0.3,statusSpread:1});const victim=foe(0),nearby=foe(100);
  G.applyStatus(victim,status,{dmg:10,dps:10,dur:0.1});G.applyStatus(victim,'poison'===status?'bleed':'poison',{dmg:7,dps:7,dur:3});victim.hp=0.5;
  victim.update(0.05,G);victim.update(0.05,G);assert.ok(victim.dead,'final partial DoT tick did not kill');
  near(10000-nearby.hp,24,'DoT kill nova');const remaining='poison'===status?'bleed':'poison';
  assert.ok(nearby.statuses[remaining],'DoT kill did not spread remaining status');near(nearby.statuses[remaining].dps,7,'spread remaining DPS');
  assert.ok(!nearby.statuses[status],'expired status spread from its final tick');p.aim=Math.PI/2;p.doAttack(G);near(p.attackCd,0.34/1.3,'DoT kill haste');
});
test('legacy Cast echoes cannot trigger critical burst or status detonation',()=>{
  const p=reset({castEcho:1,critBurst:30,statusDetonate:30});const enemy=foe(18),nearby=foe(100);
  G.applyStatus(enemy,'bleed',{dmg:1,dur:3});G.applyStatus(enemy,'poison',{dps:1,dur:3});p.doCast(G);
  const echo=K.E.projectiles.find(projectile=>!projectile.onDeath);assert.ok(echo);echo.vx=echo.vy=0;echo.x=enemy.x;echo.y=enemy.y;echo.crit=true;
  const impact=echo.dmg*1.9;echo.update(0.01,G);near(10000-enemy.hp,impact,'echo must not detonate');near(10000-nearby.hp,0,'echo must not burst');
});
test('automatic deflection cannot trigger direct-hit power riders',()=>{
  const p=reset({critBurst:30});p.stats.deflectProj=1;const enemy=foe(60),nearby=foe(120);
  const reflected=new K.E.Projectile({x:0,y:0,dmg:10,friendly:false,persp:'arrow',life:2,hitWall:false,trail:false});
  reflected.update(0.01,G);assert.ok(reflected.friendly,'automatic deflection did not return projectile');
  reflected.x=enemy.x;reflected.y=enemy.y;reflected.vx=reflected.vy=0;reflected.crit=true;reflected.update(0.01,G);
  near(10000-nearby.hp,0,'deflection triggered critical burst');
});
test('Dash activation is detected when a charge refills on the same frame',()=>{
  const p=reset({dashNova:19});const enemy=foe(-70);p.dashCharges=1;p.dashRegenT=p.stats.dashRegen-0.005;dash();
  near(p.dashCharges,1,'refill and spend should leave the same number of charges');near(10000-enemy.hp,19,'accepted Dash nova');
});
test('breaking petrification with a charge cannot activate Dash powers',()=>{
  const p=reset({dashNova:19,dashStrike:0.5});const enemy=foe();p.statuses.petrified={dur:1,t:1};dash();
  near(10000-enemy.hp,0,'stone break nova');p.doAttack(G);near(10000-enemy.hp,14,'stone break Strike bonus');
});
test('split Cast retains three original landing novas and only four capped forks',()=>{
  const p=reset({castNova:20,castFork:100});G.run.addRelic('r_hydra_heart');G.recalcStats();p.stats.crit=0;p.doCast(G);
  const originals=K.E.projectiles.filter(projectile=>projectile.onDeath),forks=K.E.projectiles.filter(projectile=>!projectile.onDeath);
  assert.strictEqual(originals.length,3);assert.strictEqual(forks.length,4);const enemy=foe(0);
  for(const projectile of originals){projectile.x=projectile.y=0;projectile.die(G);}near(10000-enemy.hp,60,'one nova per original');
  for(const fork of forks)fork.die(G);assert.strictEqual(G.hazards.length,3,'fork added a rift');
});
test('Dash empowers real ranged Strike projectiles once',()=>{
  const p=reset({dashStrike:0.5});G.run.heroId='atalanta';dash();p.doAttack(G);const shot=K.E.projectiles.find(projectile=>projectile.owner===p);
  assert.ok(shot,'ranged Strike produced no projectile');const enemy=foe(shot.x,shot.y);shot.vx=shot.vy=0;shot.update(0.01,G);
  near(10000-enemy.hp,24.15,'empowered ranged hit');p.comboStep=0;p.doAttack(G);near(K.E.projectiles[K.E.projectiles.length-1].dmg,16.1,'second ranged Strike');
});
test('timed power HUD reads are finite, capped, and cannot consume active windows',()=>{
  const p=reset({dashStrike:0.5,killHaste:0.3});assert.strictEqual(typeof K.BuildPowers.activeEffects,'function','timed effect accessor missing');
  assert.strictEqual(K.BuildPowers.activeEffects(p),null);dash();const victim=foe(400);victim.hp=1;hit(victim);
  const first=K.BuildPowers.activeEffects(p),second=K.BuildPowers.activeEffects(p);
  near(first.dashStrike.bonus,0.5);near(first.dashStrike.remaining,3);near(first.killHaste.bonus,0.3);near(first.killHaste.remaining,4);
  assert.deepStrictEqual(first,second,'HUD read mutated a timer');near(p.stats.attackSpeed,1,'HUD changed base attack speed');
  advance(3.01);const active=K.BuildPowers.activeEffects(p);assert.ok(!active.dashStrike);near(active.killHaste.remaining,0.99,'remaining haste');
  advance(1.01);assert.strictEqual(K.BuildPowers.activeEffects(p),null,'expired windows remained visible');
});

let failures=0;
for(const item of tests){try{item.fn();console.log('PASS '+item.name);}catch(error){failures++;console.error('FAIL '+item.name+'\n  '+error.message);}}
console.log(`${tests.length-failures}/${tests.length} power regressions passed`);
if(failures)process.exitCode=1;
