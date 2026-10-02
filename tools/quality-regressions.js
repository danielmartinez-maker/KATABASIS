'use strict';
const assert=require('assert');
const {K,G,storage,windowShim,documentShim,releaseAll}=require('./debug-harness');
const tests=[]; const test=(name,fn)=>tests.push({name,fn});
function reset(){ storage.clear(); K.Save.load(); G.startRun(36549); releaseAll(); }
function addGear(slot,fx){ const item=K.Gear.generate(slot,1,new K.RNG(7283),'common'); item.baseEffects=fx; const result=K.Gear.add(item); assert.ok(result.added); return result.item; }
function withConfirm(answer,fn){ const prior=windowShim.confirm; windowShim.confirm=()=>answer; try{ return fn(); }finally{ windowShim.confirm=prior; } }
test('Equipping and removing extra-life gear cannot refill a spent revival',()=>{
  reset(); const starter=K.Save.data.equippedGear.weapon, item=addGear('weapon',{deathDefy:1});
  K.Gear.equip(item.id,'weapon'); G.player.hp=0; G.die(); assert.strictEqual(G.run.deathDefy,0);
  K.Gear.equip(starter,'weapon'); K.Gear.equip(item.id,'weapon'); assert.strictEqual(G.run.deathDefy,0);
});
test('Removing and restoring vitality gear cannot heal through repeated swaps',()=>{
  reset(); const starter=K.Save.data.equippedGear.weapon, item=addGear('weapon',{maxHp:80});
  K.Gear.equip(item.id,'weapon'); G.player.hp=G.player.stats.maxHp*.3;
  const fraction=G.player.hp/G.player.stats.maxHp;
  for(let i=0;i<5;i++){ K.Gear.equip(starter,'weapon'); K.Gear.equip(item.id,'weapon'); }
  assert.ok(Math.abs(G.player.hp/G.player.stats.maxHp-fraction)<1e-9);
});
test('Reach affixes and Paragon reach nodes change the actual strike reach stat',()=>{
  reset(); const before=G.player.stats.reachMul;
  const item=addGear('bracers',{reachMul:.1}); K.Gear.equip(item.id,'bracers');
  assert.ok(G.player.stats.reachMul>before);
  K.Paragon.unlock(); K.Save.data.paragonPoints=10;
  ['artemis_1','artemis_2','artemis_3'].forEach(id=>assert.ok(K.Paragon.buy(id)));
  assert.ok(G.player.stats.reachMul>before*1.1);
});
test('The Stygian Grasp node increases maximum shield capacity',()=>{
  reset(); const before=G.player.stats.maxShield; K.Paragon.unlock(); K.Save.data.paragonPoints=10;
  ['hades_1','hades_2','hades_3'].forEach(id=>assert.ok(K.Paragon.buy(id)));
  assert.strictEqual(G.player.stats.maxShield,before+18);
});
test('Weapon base damage contributes to the compiled attack damage',()=>{
  reset(); const starter=K.Save.data.equippedGear.weapon, item=addGear('weapon',{});
  item.templateId='labrys_plain'; item.weaponId='labrys'; item.baseEffects={}; K.Gear.equip(item.id,'weapon');
  const heavy=G.player.attackDamage(); K.Gear.equip(starter,'weapon');
  assert.ok(heavy>G.player.attackDamage(),'Labrys base damage was ignored');
});
test('Losing window focus clears pending attacks and ability key edges',()=>{
  reset(); windowShim.dispatch('keydown',{code:'Space',preventDefault(){}});
  K.Input.mouse.downEdge=true; K.Input.mouse.rdownEdge=true;
  windowShim.dispatch('blur',{});
  assert.strictEqual(K.Input.hit('Space'),false); assert.strictEqual(K.Input.mouse.downEdge,false);
  assert.strictEqual(K.Input.mouse.rdownEdge,false);
});
test('Tab navigation is not cancelled by the global game input handler',()=>{
  reset(); let cancelled=false;
  windowShim.dispatch('keydown',{code:'Tab',target:{tagName:'BUTTON'},preventDefault(){cancelled=true;}});
  assert.strictEqual(cancelled,false);
});
test('Typing in the Codex search field does not trigger movement or mute shortcuts',()=>{
  reset(); windowShim.dispatch('keydown',{code:'KeyM',target:{tagName:'INPUT'},preventDefault(){}});
  assert.strictEqual(K.Input.hit('KeyM'),false); assert.strictEqual(K.Input.held('KeyM'),false);
});
test('Cancelled touches release attack state',()=>{
  reset(); K.Input.mouse.down=true; K.Input.touch={x:10,y:10};
  documentShim.getElementById('game').dispatch('touchcancel',{});
  assert.strictEqual(K.Input.mouse.down,false); assert.strictEqual(K.Input.touch,null);
});
test('Respeccing without purchased nodes does not charge Obols',()=>{
  reset(); K.Paragon.unlock(); K.Save.addObols(1000);
  assert.strictEqual(K.Paragon.respec(),false); assert.strictEqual(K.Save.data.obols,1000);
});
test('Corrupted Paragon identifiers cannot crash save migration',()=>{
  reset(); const source=K.Save.defaults(); source.paragonUnlocked=true; source.paragonNodes=['toString','__proto__','unknown'];
  windowShim.localStorage.setItem('katabasis.save.v1',JSON.stringify(source));
  assert.doesNotThrow(()=>K.Save.load()); assert.strictEqual(K.Save.data.paragonNodes.length,1);
});

test('Repeated boon reward selections cannot grant a free extra upgrade',()=>{
  reset(); G.offerBoons({}); const choice=G.pendingReward.choices[0];
  G.takeBoon(choice.id,choice.rarity); const rarity=G.run.boonRarity(choice.id);
  assert.strictEqual(G.takeBoon(choice.id,choice.rarity),false); assert.strictEqual(G.run.boonRarity(choice.id),rarity);
});
test('Repeated gear reward selections cannot create salvage shards',()=>{
  reset(); G.offerRelic(3,true); const choice=G.pendingReward.choices.find(x=>x.kind==='gear');
  G.takeGear(choice.item); const shards=K.Save.data.salvageShards;
  assert.strictEqual(G.takeGear(choice.item),false); assert.strictEqual(K.Save.data.salvageShards,shards);
});
test('Victory and death are recorded only once per run',()=>{
  reset(); G.run.stats.time=120; G.victory(); G.victory();
  assert.strictEqual(K.Save.data.wins,1); assert.strictEqual(K.Save.data.totalTime,120);
  reset(); G.run.stats.time=50; G.die(); G.die();
  assert.strictEqual(K.Save.data.deaths,1); assert.strictEqual(K.Save.data.totalTime,50);
});
test('Abandoning a run records the ended descent without creating a Nemesis',()=>{
  reset(); G.run.stats.time=31;
  /* Abandoning is confirmed, so the dialog must be answered affirmatively here. */
  withConfirm(true,()=>documentShim.getElementById('btn-abandon').click());
  assert.strictEqual(K.Save.data.deaths,1); assert.strictEqual(K.Save.data.totalTime,31);
  assert.strictEqual(G.player.dead,true); assert.strictEqual(K.Save.data.nemeses.length,0);
});
test('Abandoning a run keeps it active when the confirmation is declined',()=>{
  reset(); G.run.stats.time=31;
  withConfirm(false,()=>documentShim.getElementById('btn-abandon').click());
  assert.strictEqual(K.Save.data.deaths,0); assert.strictEqual(G.phase,'playing');
  assert.strictEqual(G.player.dead,false);
});
test('Exiting practice clears its progress warning from the next descent',()=>{
  reset(); G.startPractice({seed:36550});
  assert.ok(G.toasts.some(t=>t.text.startsWith('PRACTICE —')));
  G.exitPractice();
  assert.ok(!G.toasts.some(t=>t.text.startsWith('PRACTICE —')));
});
test('A new descent does not replay notices from the previous run',()=>{
  reset(); G.toast('Stale run notice','#fff',true); G.startRun(36551);
  assert.ok(!G.toasts.some(t=>t.text==='Stale run notice'));
});

let failed=0;
const selected=tests.filter(t=>!process.argv[2]||t.name.includes(process.argv[2]));
for(const t of selected){try{t.fn();console.log('PASS '+t.name);}catch(e){failed++;console.log('FAIL '+t.name+'\n  '+e.message);}}
console.log('Quality regressions: '+(selected.length-failed)+'/'+selected.length+' passed');process.exitCode=failed?1:0;
