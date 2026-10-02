'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { K, G, storage, releaseAll, windowShim, documentShim } = require('./debug-harness');
// Keep the suite usable while the shared entry-point lists are being integrated.
if (!K.Endgame && fs.existsSync(path.join(__dirname, '../js/endgame.js'))) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/endgame.js'), 'utf8'), { window:windowShim, document:documentShim, Math, Number, Object, Array, Set, JSON, WeakMap });
}
const tests = [], test = (name, fn) => tests.push({name, fn});
const clone = value => JSON.parse(JSON.stringify(value));
function reset(seed=281) {
  if (G.practiceMode) G.exitPractice();
  storage.clear(); K.Save.load(); releaseAll(); G.startRun(seed);
  G.pendingReward=null; K.E.enemies.length=0; K.E.projectiles.length=0; K.E.effects.length=0; G.hazards.length=0;
  G.player.x=G.player.y=0; G.phase='idle';
  return K.Save.data;
}
function item(slot='helm', level=30, rarity='legendary', seed=18) {
  const raw=K.Gear.generate(slot, level, new K.RNG(seed), rarity); raw.id='fixture-'+seed+'-'+slot;
  const result=K.Gear.add(raw); return result.item || K.Save.data.gearInventory.find(x=>x.id===raw.id);
}
function foe(x=40, hp=1000) {
  const e=G.addEnemy('shade',x,0); e.spawnT=0; e.hp=e.maxHp=hp; return e;
}
const near=(got,want)=>assert.ok(Math.abs(got-want)<1e-6, 'expected '+want+', got '+got);

test('Reinforcement requires the first act and spends the exact preview without changing the roll',()=>{
  const save=reset(), gear=item('helm',29,'rare'); save.obols=1000000;save.salvageShards=20;
  const before=clone(gear), resources=[save.obols,save.salvageShards];
  assert.strictEqual(K.Gear.upgrade(gear.id),false,'pre-act gear upgrade should remain locked');
  assert.deepStrictEqual([save.obols,save.salvageShards],resources);
  save.campaignMilestones.actI=true;
  const preview=K.Gear.reinforcementPreview(gear.id);assert.ok(preview.ok);assert.strictEqual(preview.level,30);
  assert.ok(preview.after.armor>preview.before.armor || preview.after.maxHp>preview.before.maxHp);
  const result=K.Gear.upgrade(gear.id);assert.strictEqual(result.level,30);
  assert.strictEqual(save.obols,resources[0]-preview.cost.obols);assert.strictEqual(save.salvageShards,19);
  for(const key of ['id','templateId','rarity','setId','affixes'])assert.strictEqual(JSON.stringify(gear[key]),JSON.stringify(before[key]));
  assert.strictEqual(K.Gear.upgrade(gear.id),false);
  assert.strictEqual(gear.level,30);
});

test('Masterwork focus has three deterministic ranks, safe rejection, and an explicit redirect cost',()=>{
  const save=reset(), gear=item();save.obols=1000000;save.salvageShards=100;
  assert.ok(K.Gear.masterworkPreview,'Masterwork preview is missing');
  assert.strictEqual(K.Gear.masterwork(gear.id,'signature'),false);
  save.campaignMilestones.campaignVictory=true;
  for(let rank=1;rank<=3;rank++){
    const preview=K.Gear.masterworkPreview(gear.id,'signature'), obols=save.obols,shards=save.salvageShards;
    assert.ok(preview.ok);assert.strictEqual(preview.ranks.length,3);
    assert.strictEqual(K.Gear.masterwork(gear.id,'signature').rank,rank);
    assert.strictEqual(gear.masterworkRanks,rank);assert.strictEqual(save.obols,obols-preview.cost.obols);assert.strictEqual(save.salvageShards,shards-preview.cost.shards);
  }
  const snapshot=JSON.stringify([gear,save.obols,save.salvageShards]);
  assert.strictEqual(K.Gear.masterwork(gear.id,'signature'),false);
  assert.strictEqual(K.Gear.masterwork(gear.id,'affix:'+gear.affixes[0].id),false);
  assert.strictEqual(JSON.stringify([gear,save.obols,save.salvageShards]),snapshot);
  const resetPreview=K.Gear.resetMasterworkPreview(gear.id), obols=save.obols,shards=save.salvageShards;
  assert.ok(K.Gear.resetMasterwork(gear.id));assert.strictEqual(gear.masterworkRanks,0);assert.strictEqual(gear.masterworkFocus,null);
  assert.strictEqual(save.obols,obols-resetPreview.cost.obols);assert.strictEqual(save.salvageShards,shards-resetPreview.cost.shards);
  assert.ok(K.Gear.masterwork(gear.id,'affix:'+gear.affixes[0].id));
});

test('Refinement replaces one ordinary affix, preserves unique roll fields, and has a finite per-item limit',()=>{
  const save=reset(), gear=item();save.campaignMilestones.campaignVictory=true;save.obols=1000000;save.salvageShards=100;
  assert.ok(K.Gear.refinementPreview,'Refinement preview is missing');
  const stable=clone(gear);
  for(let i=0;i<3;i++){
    const old=gear.affixes[0].id, replacement=K.Gear.AFFIXES.find(a=>!gear.affixes.some(x=>x.id===a.id)).id;
    const preview=K.Gear.refinementPreview(gear.id,old,replacement), before=[save.obols,save.salvageShards];
    assert.ok(preview.ok);assert.ok(K.Gear.refine(gear.id,old,replacement));
    assert.strictEqual(save.obols,before[0]-preview.cost.obols);assert.strictEqual(save.salvageShards,before[1]-preview.cost.shards);
    assert.strictEqual(gear.affixes[0].id,replacement);assert.strictEqual(JSON.stringify(gear.affixes.slice(1)),JSON.stringify(stable.affixes.slice(1)));
  }
  const old=gear.affixes[0].id, replacement=K.Gear.AFFIXES.find(a=>!gear.affixes.some(x=>x.id===a.id)).id;
  assert.strictEqual(K.Gear.refine(gear.id,old,replacement),false);assert.strictEqual(gear.refinements,3);
  assert.strictEqual(gear.id,stable.id);assert.strictEqual(gear.rarity,stable.rarity);
});

test('Mythic and Godforged keep the Legendary stat multiplier and expose real capped transformations',()=>{
  const save=reset();assert.ok(K.Gear.RARITIES.mythic,'Mythic rarity is missing');
  assert.strictEqual(K.Gear.RARITIES.mythic.factor,2);assert.strictEqual(K.Gear.RARITIES.godforged.factor,2);
  const gear=item('helm',30,'godforged');assert.strictEqual(gear.affixes.length,4);assert.ok(gear.mythicTrait);assert.ok(gear.imprintOptions.length>=2);
  save.campaignMilestones.campaignVictory=true;save.equippedGear.helm=gear.id;
  const first=gear.imprintOptions[0], second=gear.imprintOptions[1];
  assert.ok(K.Gear.selectImprint(gear.id,first));const firstEffects=K.Gear.effects(save);
  assert.ok(K.Gear.selectImprint(gear.id,second));const secondEffects=K.Gear.effects(save);
  assert.notStrictEqual(JSON.stringify(firstEffects),JSON.stringify(secondEffects));
  assert.ok(K.Gear.selectImprint(gear.id,first));G.recalcStats();
  const ruleKeys=Object.keys(K.BuildPowers.rules);assert.ok(ruleKeys.some(key=>G.player.stats[key]>0));
  for(const [key,rule]of Object.entries(K.BuildPowers.rules))if(G.player.stats[key]!==undefined)assert.ok(G.player.stats[key]<=rule.cap);
});

test('Endgame map and boss rewards drop both top tiers with deterministic family targeting',()=>{
  const save=reset();save.campaignMilestones.campaignVictory=true;
  assert.ok(K.Gear.rewardPreview,'Gear reward preview is missing');
  const context={endgame:true,modified:true,boss:true,rewardBonus:0.4,target:{setId:'athena_owlguard',traitFamily:'guard'}};
  assert.ok(K.Gear.rewardPreview(context).rarities.includes('godforged'));
  const found=new Set();let targeted=0;
  for(let seed=1;seed<=700;seed++){
    const a=K.Gear.generate('helm',30,new K.RNG(seed),null,context), b=K.Gear.generate('helm',30,new K.RNG(seed),null,context);
    assert.strictEqual(JSON.stringify(a),JSON.stringify(b));found.add(a.rarity);if(a.setId==='athena_owlguard')targeted++;
  }
  assert.ok(found.has('mythic')&&found.has('godforged'));assert.ok(targeted>150&&targeted<700,'target family should be favored without guaranteed item');
  for(let seed=1;seed<=300;seed++)assert.ok(!['mythic','godforged'].includes(K.Gear.generate('helm',30,new K.RNG(seed),null,{endgame:false}).rarity));
});

test('Neutral ordinary drops do not spend a random decision on nonexistent family targeting',()=>{
  reset();const rng=new K.RNG(47),calls=[];rng.chance=probability=>{calls.push(probability);return false;};
  K.Gear.generate('helm',10,rng,null,{endgame:false,target:null});
  assert.strictEqual(calls.length,0,'no set target should introduce a target coin flip into combat loot RNG');
});

test('Mirror branch purchases refund recorded costs only and retain legacy progress',()=>{
  const save=reset();assert.ok(K.Endgame,'Finite endgame progression module is missing');
  save.obols=20000;save.meta={m_tough:4};const gearState=JSON.stringify(save.gearInventory);
  assert.strictEqual(K.Endgame.buyBranch('wf_forks'),false,'branch prerequisites are mandatory');
  const preview=K.Endgame.branchPreview('wf_survey');assert.ok(preview.ok);assert.ok(K.Endgame.buyBranch('wf_survey'));
  assert.strictEqual(save.obols,20000-preview.cost);assert.strictEqual(K.Endgame.buyBranch('wf_survey'),false);
  assert.ok(K.Endgame.options(save).revealRadius>0);
  const refund=K.Endgame.refundPreview('wayfinding');assert.strictEqual(refund.obols,preview.cost);
  assert.ok(K.Endgame.refundBranches('wayfinding'));assert.strictEqual(save.obols,20000);assert.strictEqual(K.Endgame.refundBranches('wayfinding'),false);
  assert.deepStrictEqual(save.meta,{m_tough:4});assert.strictEqual(JSON.stringify(save.gearInventory),gearState);
});

test('Optional Artifice and Divine Accord nodes change actual salvage, refinement and ordinary boon choices',()=>{
  const save=reset();save.obols=1000000;save.salvageShards=100;save.campaignMilestones.campaignVictory=true;
  for(const id of ['art_salvage','art_target','art_refinement','accord_reroll','accord_patron','accord_draft'])assert.ok(K.Endgame.buyBranch(id));
  const gear=item('helm',30,'rare',321),shards=save.salvageShards;
  const duplicate=K.Gear.add(clone(gear));assert.strictEqual(duplicate.shards,3);assert.strictEqual(save.salvageShards,shards+3);
  assert.strictEqual(K.Gear.refinementPreview(gear.id,gear.affixes[0].id,'force').limit,5);
  K.Endgame.setPreferences({favoredGod:'hestia',setId:'athena_owlguard',traitFamily:'guard'});
  G.startRun(129);assert.strictEqual(G.run.rerolls,2);G.pendingReward=null;G.offerBoons({});assert.strictEqual(G.pendingReward.choiceCount,4);
  assert.ok(G.pendingReward.choices.some(choice=>K.DATA.boonById[choice.id].god==='hestia'));
  assert.strictEqual(K.Gear.rewardContext(G.run,'styx',true).target.setId,'athena_owlguard');
});

test('Malformed action IDs and incompatible run configurations cannot throw or spend resources',()=>{
  const save=reset();save.obols=5000;save.salvageShards=20;const before=[save.obols,save.salvageShards];
  for(const bad of ['toString','__proto__',null,{},5]){
    assert.doesNotThrow(()=>K.Endgame.branchPreview(bad));assert.strictEqual(K.Endgame.buyBranch(bad),false);
    assert.doesNotThrow(()=>K.Gear.masterworkPreview(bad,bad));assert.strictEqual(K.Gear.masterwork(bad,bad),false);
    assert.strictEqual(K.Gear.refine(bad,bad,bad),false);assert.strictEqual(K.Gear.selectImprint(bad,bad),false);
  }
  const oldRun=G.run;assert.strictEqual(G.startRun(117,{modifiers:{'braided-roads':1,'sparse-branches':1}}),null);assert.strictEqual(G.run,oldRun);
  assert.deepStrictEqual([save.obols,save.salvageShards],before);
});

test('A corrupted duplicate Mirror purchase cannot be refunded twice',()=>{
  const save=reset();save.obols=100;save.mirrorBranches=[{id:'wf_survey',paid:200},{id:'wf_survey',paid:200}];
  assert.strictEqual(K.Endgame.refundPreview('wayfinding').obols,200);K.Endgame.refundBranches('wayfinding');assert.strictEqual(save.obols,300);
});

test('The workbench becomes available after a real abandoned descent',()=>{
  const save=reset();save.obols=1000000;save.salvageShards=20;save.campaignMilestones.actI=true;const gear=item('helm',10,'rare',921);
  G.phase='playing';assert.strictEqual(K.Gear.upgrade(gear.id),false);assert.strictEqual(K.Endgame.buyBranch('wf_survey'),false);
  G.abandon();assert.strictEqual(G.phase,'dead');assert.ok(K.Gear.upgrade(gear.id));assert.ok(K.Endgame.buyBranch('wf_survey'));
});

test('Save normalization preserves legacy levels and rejects invalid focuses, traits and refund inflation',()=>{
  const save=reset(), gear=item();assert.ok(K.Endgame,'Endgame save normalization is missing');
  gear.level=80;gear.masterworkRanks=900;gear.masterworkFocus='invalid';gear.rarity='godforged';gear.mythicTrait='invalid';gear.imprintOptions=['invalid'];gear.imprint='invalid';
  save.mirrorBranches=[{id:'wf_survey',paid:90000000},{id:'wf_survey',paid:200},{id:'invalid',paid:700}];
  K.Gear.normalizeSave(save);K.Endgame.normalizeSave(save);
  assert.strictEqual(save.gearInventory[1].level,80);assert.strictEqual(save.gearInventory[1].masterworkRanks,0);assert.strictEqual(save.gearInventory[1].masterworkFocus,null);
  assert.ok(!save.gearInventory[1].imprint);assert.ok(K.Endgame.refundPreview('all').obols<=K.Endgame.NODES.wf_survey.cost);
  const once=JSON.stringify(save);K.Gear.normalizeSave(save);K.Endgame.normalizeSave(save);assert.strictEqual(JSON.stringify(save),once);
});

test('An invalid gear inventory receives a canonical starter on the first save normalization',()=>{
  reset();K.Save.load({gearInventory:[{id:'broken',slot:'helm',templateId:'missing'}]});
  const first=JSON.stringify(K.Save.data);K.Save.load(clone(K.Save.data));assert.strictEqual(JSON.stringify(K.Save.data),first);
});

test('Ordinary modifiers are free, fixed, affect combat, and never award Trial records',()=>{
  const save=reset();save.obols=834;save.salvageShards=12;
  G.startRun(981,{modifiers:{'iron-sinew':3,'red-hand':2,'thin-mercy':1,'quickened-doom':2}});
  assert.strictEqual(G.run.isFatedTrial,false);assert.strictEqual(G.run.modifierRanks['iron-sinew'],3);
  assert.strictEqual(save.obols,834);assert.strictEqual(save.salvageShards,12);
  const enemy=G.addEnemy('shade',0,0);assert.strictEqual(enemy.maxHp,25,'ordinary enemy health rule is not applied');assert.strictEqual(enemy.dmg,7,'ordinary enemy damage rule is not applied');near(enemy.attackTempoMul,1.12);
  const oldHp=G.player.hp=G.player.stats.maxHp/2;G.player.heal(10,G);near(G.player.hp-oldHp,8.8);
  assert.ok(G.run.modifiers.enemyHealth>1);assert.ok(G.run.modifiers.enemyDamage>1);
  assert.ok(Object.isFrozen(G.run.modifierRanks));assert.strictEqual(K.RunSystems.recordTrialVictory(save,G.run).newlyClaimed.length,0);
  const preview=K.Endgame.modifierPreview({'iron-sinew':3,'red-hand':2});assert.ok(preview.rewardBonus>0);assert.ok(preview.effects.length>=2);
  const easier=K.Endgame.modifierPreview({'gentle-current':3});assert.ok(easier.rewardBonus<0);assert.ok(easier.modifiers.enemyDamage<1);assert.ok(easier.difficulty<0);
});

test('Trial ladder retains eight Pact IDs and the 24-score bound while sharing world modifiers',()=>{
  const save=reset();save.fatedTrialsUnlocked=true;
  const pacts=Object.fromEntries(K.RunSystems.PACTS.map(p=>[p.id,3]));G.startRun(91,{trialPacts:pacts});
  assert.strictEqual(G.run.isFatedTrial,true);assert.strictEqual(G.run.trialScore,24);
  assert.strictEqual(K.RunSystems.normalizePactSelection(pacts).score,24);
  const result=K.RunSystems.recordTrialVictory(save,G.run);assert.strictEqual(result.bestScore,24);assert.deepStrictEqual(Array.from(save.fatedTrialRewards),[5,10,15,20]);
  G.startRun(92,{modifiers:pacts});assert.strictEqual(G.run.isFatedTrial,false);assert.strictEqual(G.run.trialScore,0);
});

test('Death Defiance modifier remains applied when boon or gear stats recalculate',()=>{
  reset();G.startRun(101,{modifiers:{'mortal-thread':1}});assert.strictEqual(G.run.deathDefyMax,0);
  G.run.addBoon('z_strike','common');G.recalcStats();assert.strictEqual(G.run.deathDefyMax,0);assert.strictEqual(G.run.deathDefy,0);
});

test('Shared finite stat caps contain combined gear, Mirror and run powers',()=>{
  reset();assert.ok(K.BuildPowers.STAT_CAPS,'Shared stat caps are missing');
  G.run.shopStats.push({maxHp:1e9,armor:1e9,dmgMul:1e9,moveMul:1e9,attSpd:1e9,reachMul:1e9,critBurst:1e9,castFork:1e9});G.recalcStats();
  for(const [key,cap]of Object.entries(K.BuildPowers.STAT_CAPS))if(typeof G.player.stats[key]==='number')assert.ok(Number.isFinite(G.player.stats[key])&&G.player.stats[key]<=cap,key+' bypassed cap');
});

test('Kill haste cannot temporarily exceed the compiled attack cadence cap',()=>{
  reset();G.run.shopStats.push({attSpd:100,killHaste:0.6});G.recalcStats();const p=G.player;
  G.damageEnemy(foe(40,1),10,{source:'melee',player:p,silent:true});p.doAttack(G);
  const minimumCooldown=K.DATA.WEAPONS[G.run.weapon].atkCd/4;
  assert.ok(p.attackCd>=minimumCooldown-1e-9,'temporary haste bypassed attack-speed cap');
});

let routeCount=0;
test('Every eligible god has two ordinary-source routes that reach their real combat triggers',()=>{
  reset();assert.ok(K.Endgame && K.Endgame.BUILD_COVERAGE,'Build coverage matrix is missing');
  assert.strictEqual(K.Endgame.BUILD_COVERAGE.length,Object.keys(K.DATA.GODS).length);
  for(const row of K.Endgame.BUILD_COVERAGE){
    assert.strictEqual(row.routes.length,2);assert.notStrictEqual(row.routes[0].mechanic,row.routes[1].mechanic);
    for(const route of row.routes){
      reset(1000+routeCount);G.phase='playing';G.run.boons=[];G.run.gods={};G.run.boonLevels={};G.run.shopStats=[];
      const boon=K.DATA.boonById[route.boonId];assert.ok(boon && boon.god===row.godId && boon.rarity==='common'&&!boon.req);
      G.run.gods[row.godId]=1;G.run.rng={chance:()=>false,weighted:pool=>pool.includes(row.godId)?row.godId:pool[0],pick:pool=>pool.find(x=>x.id===boon.id)||pool[0],shuffle:pool=>pool.slice(),next:()=>0.5};
      assert.ok(G.generateBoonChoices(1).some(choice=>choice.id===boon.id),route.boonId+' is unreachable');
      G.run.addBoon(boon.id,'common');G.recalcStats();G.run.rng=new K.RNG(982);G.player.stats.crit=0;G.player.hp=G.player.stats.maxHp/2;
      const p=G.player,target=foe(),nearby=foe(65),before=target.hp;
      const hit=(e,n=10,opts={})=>G.damageEnemy(e,n,Object.assign({source:'melee',player:p,silent:true},opts));
      const parry=()=>{p.guardRecover=0;p.invuln=0;p.startGuard(G);p.absorb(10,{x:40,y:0},'contact',G);};
      switch(route.mechanic){
        case 'critBurst':hit(target,10,{crit:true});assert.ok(nearby.hp<1000);break;
        case 'castFork':p.doCast(G);assert.ok(K.E.projectiles.filter(x=>x.buildProc).length>=1);break;
        case 'castNova':p.doCast(G);{const spear=K.E.projectiles.find(x=>x.owner===p&&!x.buildProc&&x.onDeath);assert.ok(spear);spear.x=40;spear.y=0;spear.onDeath(spear,G);assert.ok(target.hp<before);}break;
        case 'dashNova':K.Input.pressed.Space=true;p.update(0.01,G);releaseAll();assert.ok(target.hp<before);break;
        case 'dashStrike':K.Input.pressed.Space=true;p.update(0.01,G);releaseAll();assert.ok(K.BuildPowers.activeEffects(p).dashStrike);break;
        case 'parryNova':parry();assert.ok(target.hp<before);break;
        case 'parryHeal':{const hp=p.hp;parry();assert.ok(p.hp>hp);}break;
        case 'guardCast':p.castCd=2;parry();assert.ok(p.castCd<2);break;
        case 'statusDetonate':G.applyStatus(target,'bleed',{dmg:4,dur:3});G.applyStatus(target,'poison',{dps:4,dur:3});hit(target);assert.ok(before-target.hp>10);break;
        case 'statusSpread':{G.applyStatus(target,'poison',{dps:4,dur:3});const random=Math.random;try{Math.random=()=>0;hit(target,2000);}finally{Math.random=random;}assert.ok(nearby.statuses.poison);}break;
        case 'bossHunter':target.isBoss=true;hit(target);assert.ok(before-target.hp>10);break;
        case 'distanceDamage':target.x=220;hit(target);assert.ok(before-target.hp>10);break;
        case 'closeDamage':hit(target);assert.ok(before-target.hp>10);break;
        case 'shieldDamage':p.shield=10;hit(target);assert.ok(before-target.hp>10);break;
        case 'killNova':hit(target,2000);assert.ok(nearby.hp<1000);break;
        case 'killHaste':hit(target,2000);assert.ok(K.BuildPowers.activeEffects(p).killHaste);break;
        case 'rushNova':p.doRush(G);assert.ok(target.hp<before);break;
        case 'ascendNova':p.doAscend(G);assert.ok(target.hp<before);break;
        default:throw new Error('Untested route '+route.mechanic);
      }
      // Endgame enemy scaling still permits ordinary builds to deal finite damage.
      const boss=foe(45,200);boss.isMiniBoss=true;const damage=p.attackDamage();assert.ok(damage>0&&Number.isFinite(damage));
      for(let i=0;i<50&&!boss.dead;i++)hit(boss,damage);assert.ok(boss.dead,'ordinary route cannot finish a bounded endgame enemy');routeCount++;
    }
  }
  assert.strictEqual(routeCount,96);
});

let passed=0;for(const {name,fn}of tests){try{fn();passed++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name+'\n'+error.stack);}}
console.log('ENDGAME: '+passed+'/'+tests.length+' passed; '+routeCount+' ordinary god routes exercised');
if(passed!==tests.length)process.exitCode=1;
