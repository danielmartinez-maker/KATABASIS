'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const {K,G,windowShim,releaseAll} = require('./debug-harness');
for (const name of ['world','world-runtime']) {
  const filename=path.join(__dirname,'../js/'+name+'.js');
  if(fs.existsSync(filename) && !(name==='world'?K.World:K.WorldRuntime)) vm.runInNewContext(fs.readFileSync(filename,'utf8'),windowShim,{filename});
}
const tests=[];
function test(name,fn){tests.push([name,fn]);}
function reset(seed=713){releaseAll();K.Save.clear();G.practiceMode=false;G.startRun(seed);}
function clear(){K.E.enemies.forEach(e=>{e.dead=true;e.hp=0;});G.pendingSpawns=[];G.checkRoomClear();}
test('World generation is available with 26 preserved Greek destinations',()=>{
  assert.ok(K.World,'K.World generator is missing');
  const expected=['tartarus','styx','acheron','asphodel','punishment','lethe_garden','elysium','mourning','forge','labyrinth','knossos','aegean','aeaea','colchis','gigantomachy','delphi','pelion','arcadia','thebes','marathon','mycenae','olympus_approach','olympus','typhon_core'];
  assert.deepStrictEqual(Array.from(K.DATA.REGIONS.slice(0,24),r=>r.id),expected);
  assert.strictEqual(K.DATA.REGIONS.length,26);
  assert.strictEqual(K.DATA.REGIONS.find(r=>r.id==='mourning').actMilestone,'actI');
  assert.strictEqual(K.DATA.REGIONS.find(r=>r.id==='delphi').actMilestone,'actII');
});
test('Every region seed has connected real terrain, spacious encounters, and optional paths',()=>{
  assert.ok(K.World,'K.World generator is missing');
  for(const region of K.DATA.REGIONS) for(let seed=1;seed<=6;seed++){
    const map=K.World.generate({seed,regionId:region.id});
    assert.ok(map.bounds.w>4000 && map.bounds.h>4000,region.id+' requires travel in both axes');
    assert.strictEqual(map.nodes.filter(n=>n.main).length,8);
    assert.ok(map.edges.some(e=>e.optional),'missing optional paths');
    const validation=K.World.validate(map);assert.ok(validation.valid,region.id+': '+validation.errors.join(', '));
    for(const node of map.nodes) assert.ok(K.World.isWalkable(map,node.x,node.y,32),node.id+' obstructed');
    assert.strictEqual(K.World.isWalkable(map,map.bounds.x-100,map.bounds.y-100,20),false);
    assert.doesNotThrow(()=>JSON.parse(JSON.stringify(map)));
  }
});
test('Generator streams are deterministic and separate from combat RNG',()=>{
  assert.ok(K.World,'K.World generator is missing');reset();
  const state=G.run.rng.seed;
  const a=K.World.generate({seed:34,regionId:'styx',modifiers:{flooding:1,sidePaths:2}});
  const b=K.World.generate({seed:34,regionId:'styx',modifiers:{sidePaths:2,flooding:1}});
  assert.strictEqual(JSON.stringify(a),JSON.stringify(b));assert.strictEqual(G.run.rng.seed,state);
  assert.notStrictEqual(JSON.stringify(a),JSON.stringify(K.World.generate({seed:35,regionId:'styx'})));
  assert.throws(()=>K.World.generate({seed:1,regionId:'missing'}),/region/i);
  assert.throws(()=>K.World.generate({seed:1,regionId:'styx',version:999}),/version/i);
});
test('Encounter rewards claim once and cleared regions permit backtracking without re-spawning',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  const map=G.world,first=G.activeEncounter;assert.ok(first);
  clear();assert.strictEqual(first.status,'cleared');assert.strictEqual(G.activeEncounter,null);
  const earned=G.run.obolsEarned;assert.strictEqual(G.useExitGate(),true);G.closeOffer();
  assert.strictEqual(G.world,map);assert.strictEqual(G.phase,'playing');assert.strictEqual(first.rewardClaimed,true);
  assert.strictEqual(G.activateWorldNode(first.id),false);assert.strictEqual(G.useExitGate(),false);
  assert.strictEqual(G.run.obolsEarned,earned);
  const second=map.nodes.find(n=>n.main&&n.idx===1);G.player.x=second.x;G.player.y=second.y;G.update(1/60);
  assert.strictEqual(G.activeEncounter.id,second.id);assert.ok(K.E.enemies.some(e=>!e.dead));
  assert.strictEqual(G.cam.bounds,map.bounds);
});
test('Collision stops traversal through void and long dashes cannot tunnel outside terrain',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  const p=G.player,first=G.activeEncounter;
  G.collideWithWalls(p);p.x=first.x+5000;p.y=first.y-5000;G.collideWithWalls(p);
  assert.ok(K.World.isWalkable(G.world,p.x,p.y,p.radius));
  assert.ok(p.x>=first.bounds.x&&p.x<=first.bounds.x+first.bounds.w);
  clear();G.useExitGate();G.closeOffer();
  const outside={x:G.world.bounds.x-400,y:G.world.bounds.y-400,radius:25,vx:1,vy:1};
  G.collideWithWalls(outside);assert.ok(K.World.isWalkable(G.world,outside.x,outside.y,25));
});
test('Activating distant encounters preserves map bounds and relocates spawns exactly once',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  const bounds=JSON.stringify(G.world.bounds);clear();G.useExitGate();G.closeOffer();
  G.enterChamber(5);const node=G.activeEncounter;
  assert.strictEqual(JSON.stringify(G.world.bounds),bounds,'local combat changed whole-map bounds');
  for(const enemy of K.E.enemies)assert.ok(Math.abs(enemy.x-node.x)<600&&Math.abs(enemy.y-node.y)<440,'enemy was relocated outside its encounter');
  for(const spawn of G.pendingSpawns)assert.ok(Math.abs(spawn.x-node.x)<600&&Math.abs(spawn.y-node.y)<440,'queued spawn was relocated outside its encounter');
});
test('Market is a safe connected service space and preserves exact stock, purchases, and return point',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();clear();G.useExitGate();G.closeOffer();
  for(const idx of [1,2]){G.enterChamber(idx);clear();G.useExitGate();G.closeOffer();}
  const world=G.world,position={x:G.player.x,y:G.player.y},node=world.nodes.find(n=>n.type==='shop');
  assert.ok(node);assert.strictEqual(G.enterMarket(node.id),true);
  assert.strictEqual(G.world.regionId,'charon_market');assert.strictEqual(K.E.enemies.length,0);assert.strictEqual(G.hazards.length,0);
  assert.ok(K.World.validate(G.world).valid);assert.ok(G.interactables.some(it=>it.kind==='worldNpc'&&it.characterIds.includes('charon')));
  G.run.obols=10000;const ware=G.interactables.find(it=>it.kind==='shop'),stock=G.shopStock;
  G.doInteract(ware);const after=G.run.obols;assert.ok(ware.used);
  assert.strictEqual(G.returnFromMarket(),true);assert.strictEqual(G.world,world);
  assert.strictEqual(G.player.x,position.x);assert.strictEqual(G.player.y,position.y);
  assert.strictEqual(G.enterMarket(node.id),true);assert.strictEqual(G.shopStock,stock);
  const bought=G.interactables.find(it=>it.item&&it.item.id===ware.item.id);assert.strictEqual(bought.used,true);G.doInteract(bought);assert.strictEqual(G.run.obols,after);
  assert.strictEqual(G.damagePlayer(10,null,'hazard'),false);assert.strictEqual(G.hazards.length,0);G.returnFromMarket();
});
test('Dropped Obols credit immediately once at any distance with the existing multiplier',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  G.player.stats.obolMul=1.5;G.run._statsCache=G.player.stats;
  const wallet=G.run.obols,earned=G.run.obolsEarned,save=K.Save.data.obols;
  G.dropObol(999999,-999999,20);
  assert.strictEqual(G.run.obols-wallet,30);assert.strictEqual(G.run.obolsEarned-earned,30);assert.strictEqual(K.Save.data.obols-save,30);
  assert.strictEqual(K.E.pickups.filter(p=>p.kind==='obol').length,0);
  G.update(1/60);assert.strictEqual(G.run.obols-wallet,30);
  const life=new K.E.Pickup({x:99999,y:99999,kind:'life',value:10});K.E.pickups.push(life);assert.strictEqual(life.dead,false);
});
test('Exploration reveals nearby terrain while unexplored destinations remain concealed',()=>{
  assert.ok(K.World,'K.World generator is missing');const map=K.World.generate({seed:113,regionId:'olympus'});
  const before=Object.keys(map.revealed).length;K.World.reveal(map,map.entry.x,map.entry.y);
  assert.ok(Object.keys(map.revealed).length>before);
  assert.ok(!map.revealed[K.World.cellKey(map.capstone.x,map.capstone.y,map.tileSize)]);
});
test('Ancient Greece and Atlantis are reached by explicit story-gated region exits',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();G.enterRegion('aegean');clear();G.useExitGate();G.closeOffer();
  assert.ok(!G.availableRegionExits().some(e=>e.regionId==='atlantis'));
  G.world.capstone.status='cleared';G.world.capstone.rewardClaimed=true;G.world.chapterResolved=true;
  assert.ok(!G.availableRegionExits().some(e=>e.regionId==='atlantis'),'Atlantis appeared before its campaign chapter');
  assert.strictEqual(G.useRegionExit('atlantis'),false,'direct transition bypassed the Atlantis story gate');
  assert.strictEqual(!!G.enterRegion('atlantis'),false,'direct region entry bypassed the Atlantis story gate');
  K.Save.data.storyState.campaignSeen['sea-of-names']=true;
  assert.ok(G.availableRegionExits().some(e=>e.regionId==='atlantis'));
  assert.strictEqual(G.useRegionExit('atlantis'),true);assert.strictEqual(G.region().id,'atlantis');
  reset();G.enterRegion('gigantomachy');G.activeEncounter=null;G.world.capstone.status='cleared';G.world.capstone.rewardClaimed=true;G.world.chapterResolved=true;
  assert.ok(!G.availableRegionExits().some(e=>e.regionId==='ancient_greece'),'Ancient Greece appeared before its campaign chapter');
  assert.strictEqual(G.useRegionExit('ancient_greece'),false,'direct transition bypassed the Ancient Greece story gate');
  assert.strictEqual(!!G.enterRegion('ancient_greece'),false,'direct region entry bypassed the Ancient Greece story gate');
  G.run.storyChapters.push(K.DATA.CAMPAIGN_STORY.findIndex(chapter=>chapter.id==='wine-and-foam'));
  assert.ok(G.availableRegionExits().some(e=>e.regionId==='ancient_greece'),'the current run story record did not open its gate');
  assert.strictEqual(G.useRegionExit('ancient_greece'),true);assert.strictEqual(G.region().id,'ancient_greece');
  assert.strictEqual(K.DATA.REGIONS.find(r=>r.id==='typhon_core').campaignFinal,true);
});
test('World modifiers alter optional encounters and hazards while keeping mandatory recovery accessible',()=>{
  assert.ok(K.World,'K.World generator is missing');
  const normal=K.World.generate({seed:43,regionId:'elysium',modifiers:{sidePaths:0,hazardDensity:1}});
  const hard=K.World.generate({seed:43,regionId:'elysium',modifiers:{sidePaths:3,flooding:2,hazardDensity:1.6}});
  const quiet=K.World.generate({seed:43,regionId:'elysium',modifiers:{sidePaths:-3,hazardDensity:1}});
  assert.ok(hard.nodes.length>normal.nodes.length);assert.ok(quiet.nodes.length<normal.nodes.length);
  assert.ok(hard.hazards.length>normal.hazards.length);assert.ok(hard.hazards.some(h=>h.kind==='current'));
  assert.ok(hard.nodes.filter(n=>n.id.includes('secret-')&&Number(n.id.split('-').pop())>=2).every(n=>['miniboss','treasure','risk','challenge'].includes(n.type)));
  assert.ok(K.World.validate(hard).valid);assert.ok(hard.nodes.some(n=>n.main&&n.type==='recovery'));
});
test('Accessible market purchasing accepts only the active market offers',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();for(const idx of [0,1,2]){if(idx)G.enterChamber(idx);clear();G.useExitGate();G.closeOffer();}
  G.enterMarket(G.world.nodes.find(n=>n.type==='shop').id);G.run.obols=10000;
  assert.strictEqual(typeof G.purchaseMarketItem,'function','accessible purchasing is unavailable');
  const offers=G.interactables.filter(it=>it.kind==='shop'),offer=offers[0];
  assert.strictEqual(G.purchaseMarketItem(Object.assign({},offer)),false);
  assert.strictEqual(G.purchaseMarketItem(offer),true);assert.strictEqual(G.purchaseMarketItem(offer),false);
  G.returnFromMarket();assert.strictEqual(G.purchaseMarketItem(offer),false);
});
test('Branch route influence adds real favored reward choices without gating the world',()=>{
  assert.ok(K.World,'K.World generator is missing');
  const base=K.World.generate({seed:31,regionId:'tartarus'});
  const shop=K.World.generate({seed:31,regionId:'tartarus',mirrorOptions:{routeBias:'shop'}});
  const treasure=K.World.generate({seed:31,regionId:'tartarus',mirrorOptions:{routeBias:'treasure'}});
  assert.ok(shop.nodes.filter(n=>n.type==='shop').length>base.nodes.filter(n=>n.type==='shop').length);
  assert.ok(treasure.nodes.filter(n=>n.type==='treasure').length>base.nodes.filter(n=>n.type==='treasure').length);
  assert.ok(K.World.validate(shop).valid&&K.World.validate(treasure).valid);
});
test('The physical campaign completes all 26 destinations including optional gates and stable act milestones',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset(314);
  const visited=[],sideVisits=new Set();let guard=0;
  while(G.phase!=='victory'&&guard++<30){
    const region=G.region().id;visited.push(region);
    for(let idx=0;idx<8;idx++){
      const node=G.world.nodes.find(n=>n.main&&n.idx===idx);
      if(!G.activeEncounter){G.player.x=node.x;G.player.y=node.y;G.update(1/60);}
      assert.ok(node.status==='active'||node.status==='cleared',region+' beat '+idx+' failed physical activation');
      if(G.activeEvent&&G.phase==='event')G.chooseEvent(G.activeEvent.choices[0].id);
      if(G.boss&&!G.boss.dead)G.killEnemy(G.boss,false);
      clear();assert.strictEqual(G.useExitGate(),true,region+' beat '+idx+' has no local reward gate');
      for(let rewardGuard=0;G.pendingReward&&rewardGuard<5;rewardGuard++){
        if(G.pendingReward.kind==='fatedThread')G.takeFatedThread(G.pendingReward.choices[0].id);else G.closeOffer();
      }
      if(G.pendingStory)G.chooseStory(G.pendingStory.chapter.choices[0].id);
      assert.ok(node.rewardClaimed);assert.strictEqual(node.clearCount||1,1);
      if(G.phase==='victory')break;
    }
    if(G.phase==='victory')break;
    const exits=G.availableRegionExits();let exit=exits.find(e=>e.optional&&!sideVisits.has(e.regionId));
    if(exit)sideVisits.add(exit.regionId);else exit=exits.find(e=>e.required);
    assert.ok(exit,region+' has no continuation');assert.strictEqual(G.useRegionExit(exit.regionId),true);
  }
  assert.ok(guard<30);assert.strictEqual(G.phase,'victory');assert.strictEqual(new Set(visited).size,26);
  assert.strictEqual(G.run.stats.chambers,208);assert.strictEqual(K.Save.data.campaignMilestones.actI,true);assert.strictEqual(K.Save.data.campaignMilestones.actII,true);
  assert.strictEqual(K.Save.data.campaignArchive.length,26);assert.strictEqual(G.run.storyChapters.length,26);
});
test('A physical fork cannot bypass the selected encounter reward or trigger both alternatives',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  for(const idx of [0,1]){if(idx)G.enterChamber(idx);clear();G.useExitGate();G.closeOffer();}
  const alternative=G.world.nodes.find(n=>n.alternativeFor),main=G.world.nodes.find(n=>n.id===alternative.alternativeFor),next=G.world.nodes.find(n=>n.main&&n.idx===3);
  assert.strictEqual(G.activateWorldNode(alternative.id),true);clear();
  assert.strictEqual(G.activateWorldNode(next.id),false,'selected fork reward can be bypassed');
  assert.strictEqual(G.activateWorldNode(main.id),false,'both fork alternatives spawned');
  G.useExitGate();G.closeOffer();assert.strictEqual(G.activateWorldNode(next.id),true);
});
test('Solid regional props collide, react to strikes, and clear their blocker when broken',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  const prop=G.world.props.find(p=>p.solid&&p.destructible);assert.ok(prop,'no reactive solid terrain props');
  assert.strictEqual(K.World.isWalkable(G.world,prop.x,prop.y,10),false);
  assert.strictEqual(typeof G.damageWorldProp,'function');
  G.damageWorldProp(prop.id,1);assert.ok(prop.impactT>0&&!prop.broken);
  G.damageWorldProp(prop.id,100);assert.strictEqual(prop.broken,true);assert.strictEqual(K.World.isWalkable(G.world,prop.x,prop.y,10),true);
});
test('Backtracking can claim an older cleared side-encounter reward after another fight',()=>{
  assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  G.enterChamber(2);clear();G.useExitGate();G.closeOffer();
  const first=G.world.nodes.find(n=>n.type==='miniboss');G.activateWorldNode(first.id,{force:true});clear();
  const olderGate=G.exitGate;
  G.enterChamber(5);clear();G.useExitGate();G.closeOffer();
  assert.strictEqual(first.rewardClaimed,false);assert.strictEqual(G.doInteract(olderGate),true);
  assert.strictEqual(first.rewardClaimed,true);assert.strictEqual(G.pendingReward.kind,'augment');
});
let failed=0;
for(const [name,fn] of tests)try{fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}
console.log((tests.length-failed)+'/'+tests.length+' world overhaul tests passed');
if(failed)process.exitCode=1;
