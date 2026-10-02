'use strict';
const assert=require('assert');
const {K,G,documentShim,storage,releaseAll}=require('./debug-harness');
const tests=[], counts={pactSelections:0,threadDrafts:0,campaignRooms:0,regionalCapstones:0,trialBosses:0,saveCases:0,gearCases:0};
const test=(name,fn)=>tests.push({name,fn});
const clone=x=>JSON.parse(JSON.stringify(x));
const spent=save=>save.paragonNodes.reduce((n,id)=>n+(K.Paragon.NODES[id].cost||0),0);
function reset(seed=101) {if(G.practiceMode) G.exitPractice();storage.clear();K.Save.load();G.startRun(seed);releaseAll();}
function choice() {
  const reward=G.pendingReward, item=reward.choices[0];
  if(reward.kind==='fatedThread') return G.takeFatedThread(item.id);
  if(reward.kind==='augment') return G.takeAugment(item.id);
  if(reward.kind==='relic') return item.kind==='gear'?G.takeGear(item.item):G.takeRelic(item.id);
  return G.takeBoon(item.id,item.rarity);
}
function clearCombat() {
  let guard=0;
  while(++guard<200) {
    K.E.enemies.filter(e=>!e.dead&&!e.ally).forEach(e=>G.killEnemy(e,false));
    G.releaseSpawnQueue();
    if(!G.pendingSpawns.length&&!K.E.enemies.some(e=>!e.dead&&!e.ally)) break;
  }
  assert.ok(guard<200,'room clear queue did not terminate');
  G.checkRoomClear();assert.ok(G.exitGate,'cleared chamber did not open a gate');
}

test('All 65,536 valid Pact rank combinations are finite and bounded',()=>{
  const pacts=K.RunSystems.PACTS;
  for(let encoded=0;encoded<4**pacts.length;encoded++) {
    let code=encoded,expected=0;const selection={};
    pacts.forEach(p=>{const rank=code%4;code=Math.floor(code/4);if(rank)selection[p.id]=rank;expected+=rank;});
    const normalized=K.RunSystems.normalizePactSelection(selection), modifiers=K.RunSystems.pactModifiers(selection);
    assert.strictEqual(normalized.score,expected);assert.strictEqual(modifiers.score,expected);
    Object.values(modifiers).forEach(value=>assert.ok(Number.isFinite(value)));
    assert.ok(modifiers.enemyHealth>=1&&modifiers.enemyHealth<=2);
    assert.ok(modifiers.enemyDamage>=1&&modifiers.enemyDamage<=2);
    assert.ok(modifiers.enemyTempo>=1&&modifiers.enemyTempo<=1.6);
    assert.ok(modifiers.healing>=0.4&&modifiers.healing<=1);
    assert.ok(modifiers.shopPrices>=1&&modifiers.shopPrices<=2.5);
    assert.ok(modifiers.boonOfferPenalty<=3&&modifiers.elitePressure<=3&&modifiers.deathDefiancePenalty<=3);
    counts.pactSelections++;
  }
});
test('Malformed Pact ranks are discarded and input is never mutated',()=>{
  const values=[null,undefined,-1,4,1.2,'3',true,Infinity,NaN,{},[]];
  values.forEach(value=>{const raw={'iron-sinew':value,bogus:3};assert.strictEqual(K.RunSystems.pactScore(raw),0);});
  const ranks={'red-hand':3}, before=JSON.stringify(ranks);
  assert.strictEqual(K.RunSystems.pactScore({ranks}),3);assert.strictEqual(JSON.stringify(ranks),before);
});
test('Threads are reproducible, relevant, distinct and stop at two',()=>{
  for(const heroId of Object.keys(K.RunSystems.HEROES)) for(const starter of K.RunSystems.STARTERS) for(let seed=1;seed<=12;seed++) {
    reset(seed);G.run.heroId=heroId;G.run.weapon=starter.id;
    G.run.rng=new K.RNG(seed);G.offerFatedThreads({});
    const first=clone(G.pendingReward.choices);G.pendingReward=null;G.run.rng=new K.RNG(seed);G.offerFatedThreads({});
    assert.strictEqual(JSON.stringify(G.pendingReward.choices),JSON.stringify(first));
    assert.strictEqual(new Set(first.map(c=>c.id)).size,3);
    const relevant=K.RunSystems.eligibleFatedThreads(G.run).filter(t=>K.RunSystems.threadRelevance(G.run,t));
    if(relevant.length)assert.ok(first.some(c=>relevant.some(t=>t.id===c.id)));
    const id=first[0].id;assert.strictEqual(G.takeFatedThread('invalid'),false);
    assert.strictEqual(G.takeFatedThread(id),true);assert.strictEqual(G.takeFatedThread(id),false);
    G.offerFatedThreads({});assert.ok(G.pendingReward.choices.every(c=>c.id!==id));
    assert.strictEqual(choice(),true);assert.strictEqual(G.run.fatedThreadIds.length,2);
    G.offerFatedThreads({});assert.strictEqual(G.pendingReward,null);counts.threadDrafts+=2;
  }
});
test('Skipped Threads pay once and preserve story continuation without rerolls',()=>{
  reset();G.offerFatedThreads({campaignChapter:7,advanceAfter:true});
  const before=K.Save.data.obols, maxHp=G.player.stats.maxHp, rerolls=G.run.rerolls;
  documentShim.getElementById('btn-reroll').click();assert.strictEqual(G.run.rerolls,rerolls);
  assert.strictEqual(G.skipFatedThreads(),true);assert.strictEqual(G.phase,'story');
  assert.strictEqual(G.player.stats.maxHp,maxHp+8);assert.strictEqual(K.Save.data.obols,before+30);
  assert.strictEqual(G.skipFatedThreads(),false);assert.strictEqual(K.Save.data.obols,before+30);
  assert.strictEqual(G.chooseStory(G.pendingStory.chapter.choices[0].id),true);
  G.startRun(102);assert.strictEqual(G.run.fatedThreadIds.length,0);
});
test('Boss rerolls exhaust once, preserve Rare+ floor and reject stale choices',()=>{
  reset();G.offerBoons({kind:'boss',count:4,rarityFloor:'rare',campaignChapter:7,threadAfter:true});
  for(let attempt=0;attempt<20;attempt++)documentShim.getElementById('btn-reroll').click();
  assert.strictEqual(G.pendingReward.rerolls,0);assert.strictEqual(G.run.rerolls,0);
  assert.strictEqual(G.pendingReward.choices.length,4);
  assert.ok(G.pendingReward.choices.every(c=>K.DATA.RARITY[c.rarity].tier>=K.DATA.RARITY.rare.tier));
  assert.strictEqual(G.takeBoon('not-offered','rare'),false);
  const pick=G.pendingReward.choices[0];assert.strictEqual(G.takeBoon(pick.id,pick.rarity),true);
  assert.strictEqual(G.takeBoon(pick.id,pick.rarity),false);assert.strictEqual(G.pendingReward.kind,'fatedThread');
});
test('Returning Echo and Returning Cast each add two smaller seeking Cast projectiles at half damage',()=>{
  for(const [collection,id] of [['fatedThreadIds','returning-echo'],['augmentIds','ricochet_cast']]) {
    reset();K.E.projectiles.length=0;G.player.doCast(G);assert.strictEqual(K.E.projectiles.length,1);
    G.run[collection].push(id);G.recalcStats();K.E.projectiles.length=0;K.E.enemies.length=0;G.player.doCast(G);
    const main=K.E.projectiles.find(p=>!p.homing), echoes=K.E.projectiles.filter(p=>p.homing>0);
    assert.strictEqual(K.E.projectiles.length,3);assert.strictEqual(echoes.length,2);
    for(const echo of echoes) {
      assert.strictEqual(echo.dmg,main.dmg*0.5);assert.ok(echo.radius<main.radius&&echo.size<main.size);
      assert.strictEqual(echo.friendly,true);assert.strictEqual(echo.owner,G.player);assert.strictEqual(echo.onDeath,null);
    }
    const target=G.addEnemy('shade',G.player.x+100,G.player.y-100,{}), echo=echoes[0];
    const before=Math.abs(K.U.angDiff(Math.atan2(echo.vy,echo.vx),K.U.ang(echo.x,echo.y,target.x,target.y)));
    echo.update(1/60,G);
    const after=Math.abs(K.U.angDiff(Math.atan2(echo.vy,echo.vx),K.U.ang(echo.x,echo.y,target.x,target.y)));
    assert.ok(after<before,'Cast echo did not turn toward its target');
    const hazards=G.hazards.length;echo.die(G);assert.strictEqual(G.hazards.length,hazards);
    main.die(G);assert.strictEqual(G.hazards.length,hazards+1);
  }
  reset();K.E.projectiles.length=0;G.player.stats.castEcho=Number.MAX_VALUE;G.player.doCast(G);
  assert.strictEqual(K.E.projectiles.filter(p=>p.homing>0).length,6);
  K.E.projectiles.length=0;G.player.stats.castEcho=NaN;G.player.doCast(G);assert.strictEqual(K.E.projectiles.length,1);
});
test('Restarting a run discards old route choices and cannot skip the opening chamber',()=>{
  reset();G.chamberIndex=2;G.advance();assert.strictEqual(G.phase,'route');
  const oldRoute=G.pendingRouteChoices[0].id;G.startRun(502);
  assert.strictEqual(G.pendingRouteChoices.length,0);assert.strictEqual(G.selectRoute(oldRoute),false);
  assert.strictEqual(G.chamberIndex,0);assert.strictEqual(G.run.stats.chambers,1);
});
test('A maximum-score Trial completes all 192 chambers and awards titles only once',()=>{
  reset(9257);K.Save.data.fatedTrialsUnlocked=true;
  const ranks={};K.RunSystems.PACTS.forEach(p=>ranks[p.id]=3);
  G.startRun(9257,{trialPacts:ranks});assert.strictEqual(G.run.trialScore,24);
  const lockedModifiers=JSON.stringify(G.run.trialModifiers);ranks['iron-sinew']=0;
  let guard=0;
  while(G.phase!=='victory'&&++guard<2000) {
    if(G.pendingReward) {assert.ok(choice());continue;}
    if(G.pendingStory) {assert.strictEqual(G.chooseStory(G.pendingStory.chapter.choices[0].id),true);continue;}
    if(G.pendingRouteChoices&&G.pendingRouteChoices.length) {
      const route=G.pendingRouteChoices.find(r=>r.type==='combat')||G.pendingRouteChoices[0];assert.strictEqual(G.selectRoute(route.id),true);continue;
    }
    if(G.activeEvent&&G.phase==='event') {assert.strictEqual(G.chooseEvent(G.activeEvent.choices[0].id),true);continue;}
    const capstone=G.roomDef.type==='boss'&&G.chamberIndex===7;
    clearCombat();if(capstone)counts.regionalCapstones++;
    assert.strictEqual(G.useExitGate(),true);assert.strictEqual(G.useExitGate(),false);
    counts.campaignRooms++;assert.strictEqual(JSON.stringify(G.run.trialModifiers),lockedModifiers);
  }
  assert.ok(guard<2000);assert.strictEqual(G.run.stats.chambers,192);assert.strictEqual(counts.campaignRooms,192);
  assert.strictEqual(counts.regionalCapstones,24);assert.ok(G.run.stats.bosses>=24);counts.trialBosses=G.run.stats.bosses;
  assert.strictEqual(K.Save.data.fatedTrialBestScore,24);
  assert.strictEqual(JSON.stringify(K.Save.data.fatedTrialRewards),'[5,10,15,20]');
  assert.strictEqual(G.run.trialResult.newlyClaimed.length,4);
  const wins=K.Save.data.wins,obols=K.Save.data.obols;G.victory();assert.strictEqual(K.Save.data.wins,wins);
  assert.strictEqual(K.RunSystems.recordTrialVictory(K.Save.data,G.run).newlyClaimed.length,0);
  assert.strictEqual(K.Save.data.obols,obols);K.Save.load();assert.strictEqual(K.Save.data.fatedTrialBestScore,24);
});
test('Normal, locked, zero-score, failed and practice runs cannot claim Trial records',()=>{
  reset();const ranks={'iron-sinew':3};G.startRun(15,{trialPacts:ranks});assert.strictEqual(G.run.isFatedTrial,false);
  K.Save.data.fatedTrialsUnlocked=true;G.startRun(16,{trialPacts:{}});assert.strictEqual(G.run.isFatedTrial,false);
  G.startRun(17,{trialPacts:ranks});G.recordDeath();assert.strictEqual(K.Save.data.fatedTrialBestScore,0);
  G.startPractice({seed:18,trialPacts:ranks});assert.strictEqual(G.run.isFatedTrial,false);G.exitPractice();
  const run={practice:true,isFatedTrial:true,trialScore:24};K.RunSystems.recordTrialVictory(K.Save.data,run);
  assert.strictEqual(K.Save.data.fatedTrialBestScore,0);
});
test('Trial title thresholds claim once, lower clears preserve the best and malformed claims are removed',()=>{
  reset();const save=K.Save.data;
  for(let score=1;score<=24;score++) {
    const before=save.obols,result=K.RunSystems.recordTrialVictory(save,{isFatedTrial:true,trialScore:score});
    assert.strictEqual(result.newlyClaimed.length,[5,10,15,20].includes(score)?1:0);assert.strictEqual(save.obols,before);
    assert.strictEqual(K.RunSystems.recordTrialVictory(save,{isFatedTrial:true,trialScore:score}).newlyClaimed.length,0);
  }
  K.RunSystems.recordTrialVictory(save,{isFatedTrial:true,trialScore:1});assert.strictEqual(save.fatedTrialBestScore,24);
  const partial=K.RunSystems.normalizeSave({wins:0,fatedTrialBestScore:10,fatedTrialRewards:[5,5,10,15,'bogus']});
  assert.strictEqual(JSON.stringify(partial.fatedTrialRewards),'[5,10]');
});
test('A successful replay restores reached titles missing from a partial Trial save',()=>{
  reset();const save=K.Save.data;save.fatedTrialBestScore=20;save.fatedTrialRewards=[];
  const obols=save.obols,result=K.RunSystems.recordTrialVictory(save,{isFatedTrial:true,trialScore:1});
  assert.strictEqual(result.bestScore,20);assert.strictEqual(result.newlyClaimed.length,4);
  assert.strictEqual(JSON.stringify(save.fatedTrialRewards),'[5,10,15,20]');assert.strictEqual(save.obols,obols);
  assert.strictEqual(K.RunSystems.recordTrialVictory(save,{isFatedTrial:true,trialScore:1}).newlyClaimed.length,0);
});
test('Legacy high-level gear retains recorded levels and bounded effects, sales and upgrades',()=>{
  reset();const save=K.Save.data;
  for(const slot of K.Gear.SLOTS)for(const rarity of Object.keys(K.Gear.RARITIES))for(const level of [1,29,30,31,10000,Number.MAX_SAFE_INTEGER]) {
    const raw=K.Gear.generate(slot,level,new K.RNG(level%10000+15),rarity);raw.id='legacy-'+counts.gearCases;raw.level=level;
    save.gearInventory=[raw];save.equippedGear={};save.equippedGear[slot]=raw.id;K.Gear.normalizeSave(save);
    assert.strictEqual(save.gearInventory[0].level,level);
    const effects=K.Gear.effects(save);save.gearInventory[0].level=Math.min(30,level);
    assert.strictEqual(JSON.stringify(K.Gear.effects(save)),JSON.stringify(effects));save.gearInventory[0].level=level;
    assert.strictEqual(K.Gear.sellValue(raw),Math.max(1,Math.floor(10*Math.min(30,level)*K.Gear.RARITIES[rarity].factor)));
    if(level>=30){const obols=save.obols, shards=save.salvageShards;assert.strictEqual(K.Gear.upgrade(raw.id),false);assert.strictEqual(save.obols,obols);assert.strictEqual(save.salvageShards,shards);}
    counts.gearCases++;
  }
  reset();const item=K.Gear.add(K.Gear.generate('helm',29,new K.RNG(918),'rare')).item;
  K.Save.data.obols=1000000;K.Save.data.salvageShards=20;
  assert.strictEqual(K.Gear.upgrade(item.id).level,30);assert.strictEqual(K.Gear.upgrade(item.id),false);
});
test('The six-branch Loom caps new earning at 42, preserves legacy bank and refunds exact costs',()=>{
  reset();const save=K.Save.data;K.Paragon.unlock();K.Paragon.awardXp(Number.MAX_SAFE_INTEGER);
  assert.strictEqual(save.paragonPoints,42);assert.strictEqual(K.Paragon.awardXp(10000).points,0);
  for(const branch of Object.values(K.Paragon.BRANCHES)) {
    branch.nodes.forEach(n=>assert.strictEqual(K.Paragon.buy(n.id),true));
    assert.strictEqual(K.Paragon.buy(branch.keystones[0].id),true);assert.strictEqual(K.Paragon.buy(branch.keystones[1].id),false);
  }
  assert.strictEqual(spent(save),42);assert.strictEqual(save.paragonPoints,0);assert.strictEqual(K.Paragon.awardXp(10000).points,0);
  save.obols=100000;assert.strictEqual(K.Paragon.respec().refunded,42);assert.strictEqual(save.paragonPoints,42);
  assert.strictEqual(K.Paragon.awardXp(10000).points,0);
  save.paragonPoints=900;K.Paragon.normalizeSave(save);assert.strictEqual(save.paragonPoints,900);
  assert.strictEqual(K.Paragon.awardXp(10000).points,0);
});
test('Malformed and partial legacy saves boot safely, normalize once and retain valid collections',()=>{
  const malformed=[null,[],5,'text',{}, {meta:null,gearInventory:[null,{}],paragonNodes:[null,'__proto__','ares_4'],campaignArchive:[null,{}]},
    {selectedHero:'toString',unlockedHeroes:['toString']}, {selectedHero:'__proto__',unlockedHeroes:['__proto__']}, {selectedHero:'constructor',unlockedHeroes:['constructor']}, {wins:1,bossKills:12,fatedTrialBestScore:99,fatedTrialRewards:[5,5,10,24]},
    {wins:0,campaignMilestones:[],fatedTrialsUnlocked:'yes',fatedTrialBestScore:'24',fatedTrialRewards:{}},
    {selectedHero:{toString:null}}, {gearInventory:[{id:'bad',slot:'weapon',templateId:{toString:null}}]},
    {paragonUnlocked:true,paragonNodes:[{toString:null}]}, {nemeses:[{sourceId:{toString:null}}]}];
  for(const raw of malformed) {
    assert.doesNotThrow(()=>K.Save.load(raw));const first=JSON.stringify(K.Save.data);K.Save.load(clone(K.Save.data));
    assert.strictEqual(JSON.stringify(K.Save.data),first);G.startRun(918);assert.ok(Number.isFinite(G.player.stats.maxHp));counts.saveCases++;
  }
  const legacy={wins:2,obols:834,muted:true,meta:{m_hp:2},unlockedHeroes:['perseus','orpheus'],unlockedStarters:['xiphos','makhaira'],
    killChronicle:[{id:'legacy-kill'}],campaignArchive:[{id:'legacy-story'}],paragonPoints:900,paragonXp:75};
  K.Save.load(legacy);assert.strictEqual(K.Save.data.fatedTrialsUnlocked,true);assert.strictEqual(K.Save.data.obols,834);
  assert.strictEqual(K.Save.data.paragonPoints,900);assert.strictEqual(K.Save.data.paragonXp,75);assert.strictEqual(K.Save.data.killChronicle[0].id,'legacy-kill');
  assert.strictEqual(K.Save.data.campaignArchive[0].id,'legacy-story');assert.ok(K.Save.data.unlockedHeroes.includes('orpheus'));
  storage.set('katabasis.save.v1','{invalid json');assert.doesNotThrow(()=>K.Save.load());counts.saveCases+=2;
});
test('Corrupt saved timestamps cannot poison migration freshness or future writes',()=>{
  for(const timestamp of ['bad','2024',Infinity,NaN,-1,Number.MAX_VALUE,{},[]]) {
    K.Save.load({storageUpdatedAt:timestamp});K.Save.write();
    assert.ok(Number.isSafeInteger(K.Save.data.storageUpdatedAt)&&K.Save.data.storageUpdatedAt>=Date.now()-10000,'invalid timestamp '+String(timestamp));
    counts.saveCases++;
  }
});

let failed=0;
const selected=process.argv[2]?tests.filter(t=>new RegExp(process.argv[2],'i').test(t.name)):tests;
for(const {name,fn} of selected)try{fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}
console.log('PROGRESSION STRESS: '+(selected.length-failed)+'/'+selected.length+' checks, '+JSON.stringify(counts));
process.exitCode=failed?1:0;
