'use strict';
const assert = require('assert');
const {K,G,storage,releaseAll} = require('./debug-harness');
const regions = K.DATA.REGIONS;
let scenes=0, routes=0, rooms=0, threads=0;
for (const endingId of ['ending_open','ending_cut']) {
  storage.clear(); K.Save.clear(); K.Save.load(); G.startRun(38319); releaseAll();
  for(let regionIndex=0;regionIndex<regions.length;regionIndex++) {
    assert.strictEqual(G.regionIndex,regionIndex);
    G.enterChamber(7); assert.ok(G.boss,regions[regionIndex].id+' has no boss');
    G.killEnemy(G.boss,false); G.checkRoomClear(); assert.ok(G.exitGate);
    assert.strictEqual(G.useExitGate(),true); const reward=G.pendingReward;
    assert.strictEqual(reward.kind,'boss'); assert.strictEqual(reward.choices.length,4);
    assert.ok(reward.choices.every(x=>K.DATA.RARITY[x.rarity].tier>=K.DATA.RARITY.rare.tier));
    G.closeOffer();
    if(regionIndex===7 || regionIndex===15) {
      const threadReward=G.pendingReward;
      assert.strictEqual(threadReward.kind,'fatedThread');
      assert.strictEqual(threadReward.choices.length,3);
      assert.strictEqual(new Set(threadReward.choices.map(x=>x.id)).size,3);
      assert.ok(threadReward.choices.every(x=>!G.run.fatedThreadIds.includes(x.id)));
      assert.strictEqual(threadReward.rerolls,0);
      const threadId=threadReward.choices[0].id;
      assert.strictEqual(G.takeFatedThread(threadId),true);
      assert.strictEqual(G.takeFatedThread(threadId),false);
      threads++;
    }
    assert.strictEqual(G.phase,'story');
    assert.strictEqual(G.pendingStory.chapterIndex,regionIndex);
    const chapter=G.pendingStory.chapter;
    const selected=regionIndex===regions.length-1 ? endingId : chapter.choices[regionIndex%chapter.choices.length].id;
    assert.strictEqual(G.chooseStory(selected),true); assert.strictEqual(G.chooseStory(selected),false);
    scenes++;
  }
  assert.strictEqual(G.phase,'victory'); assert.strictEqual(K.Save.data.wins,1);
  assert.strictEqual(K.Save.data.campaignArchive.length,regions.length);
  assert.strictEqual(G.run.campaignEnding,endingId==='ending_open'?'open_gate':'free_thread');
  assert.strictEqual(G.run.fatedThreadIds.length,2);
  assert.deepStrictEqual(Object.values(K.Save.data.campaignMilestones),[true,true,true,true]);
  assert.strictEqual(K.Save.data.fatedTrialsUnlocked,true);
  K.Save.load(); assert.strictEqual(K.Save.data.campaignArchive.length,regions.length);
}
storage.clear(); K.Save.clear(); K.Save.load(); G.startRun(5318); releaseAll();
for(let regionIndex=0;regionIndex<regions.length;regionIndex++) {
  G.regionIndex=regionIndex; const region=regions[regionIndex];
  for (const type of ['combat','challenge','elite','treasure','shop','event','optionalboss']) {
    const node={type,bossId:region.boss,eventId:K.DATA.ROOM_EVENTS[0].id};
    G.enterChamber(1,node); assert.strictEqual(G.roomDef.type,type);
    assert.ok(K.E.enemies.every(x=>Number.isFinite(x.hp)&&x.hp>0));
    if(type==='shop') assert.strictEqual(G.shopStock.length,5);
    if(type==='event') {
      const choice=G.activeEvent.choices[0]; assert.strictEqual(G.chooseEvent(choice.id),true);
      assert.strictEqual(G.chooseEvent(choice.id),false);
    }
    if(type==='optionalboss') assert.ok(G.boss);
    rooms++;
  }
  for(let seed=1;seed<=20;seed++) {
    G.chamberIndex=2; G.run.rng=new K.RNG(seed*7291+regionIndex);
    const first=G.buildRouteChoices(); G.run.rng=new K.RNG(seed*7291+regionIndex);
    const second=G.buildRouteChoices(); assert.strictEqual(JSON.stringify(first),JSON.stringify(second));
    assert.ok(first.length>0); assert.strictEqual(new Set(first.map(x=>x.id)).size,first.length);
    first.forEach(node=>{
      assert.strictEqual(node.regionId,region.id);
      if(node.type==='optionalboss') assert.ok(K.DATA.BOSSES[node.bossId]);
      else (node.squad||[]).forEach(id=>assert.ok(K.DATA.ENEMIES[id]));
      if(node.type==='shop'||node.type==='event') {
        assert.strictEqual(node.conditionId,'quiet-tithe');
        assert.strictEqual(node.conditionData.id,node.conditionId);
        assert.ok(Number.isFinite(node.conditionData.obols)&&node.conditionData.obols>=0);
        assert.strictEqual(node.squad.length,0);assert.strictEqual(node.families.length,0);
      } else assert.ok(K.DATA.CHAMBER_CONDITIONS.some(x=>x.id===node.conditionId));
    });
    routes++;
  }
}
console.log('CAMPAIGN AUDIT PASSED: '+scenes+' capstone/story flows, '+threads+' Thread drafts, both endings, '+rooms+' region/room combinations, '+routes+' deterministic route sequences and reload persistence');
