'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const K = {};
const context = vm.createContext({window:{K}, console, Math, JSON, Object, Array, Number, String, Set, Map, Date});
function load(file) { vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'), context,{filename:file}); }
['js/data.js','js/content-expansion.js','js/run-systems.js','js/boon-expansion.js'].forEach(load);
const oldGods = Object.keys(K.DATA.GODS), oldChapters = JSON.stringify(K.DATA.CAMPAIGN_STORY);
for (const file of ['js/mythology.js','js/portraits.js']) if(fs.existsSync(path.join(ROOT,file))) load(file);
const tests = [], test = (name,fn) => tests.push({name,fn});
const clone = x => JSON.parse(JSON.stringify(x));
const fresh = () => { const save={campaignArchive:[],seenGods:{}}; K.Mythology.normalizeSave(save); return save; };

test('mythology and portrait modules are available to world interactions',()=>{
  assert.ok(K.Mythology,'missing mythology runtime'); assert.ok(K.Portraits,'missing portrait runtime');
});
test('story migration preserves legacy ledgers, progress and current content',()=>{
  const archive=[{title:'THE FERRYMAN’S TESTIMONY',choice:'Pay the fare',voices:[{name:'Charon',text:'A crossing remembered.'}]}];
  const save={obols:391,meta:{old_rank:9},campaignArchive:clone(archive),bestRegion:17,unknownLegacyField:'keep'};
  K.Mythology.normalizeSave(save); K.Mythology.normalizeSave(save);
  assert.deepStrictEqual(save.campaignArchive,archive); assert.equal(save.obols,391); assert.equal(save.meta.old_rank,9);
  assert.equal(save.bestRegion,17); assert.equal(save.unknownLegacyField,'keep'); assert.equal(save.storyState.version,1);
  assert.deepStrictEqual(Object.keys(K.DATA.GODS),oldGods); assert.equal(JSON.stringify(K.DATA.CAMPAIGN_STORY),oldChapters);
});
test('corrupt story state cannot introduce unknown flags or unbounded relationships',()=>{
  const save={storyState:{version:0,facts:{charon_promised:true,unregistered:true},relationships:{charon:999,orpheus:-999,unknown:55},quests:{charon_crossing:999},completed:{'charon-crossing':true,invalid:true},seen:{'charon-crossing':Infinity}}};
  K.Mythology.normalizeSave(save);
  assert.equal(save.storyState.facts.charon_promised,true); assert.ok(!save.storyState.facts.unregistered);
  assert.equal(save.storyState.relationships.charon,3); assert.equal(save.storyState.relationships.orpheus,-3);
  assert.ok(!save.storyState.relationships.unknown); assert.equal(save.storyState.quests.charon_crossing,3);
  assert.ok(!save.storyState.completed.invalid); assert.equal(save.storyState.seen['charon-crossing'],0);
});
test('future mythology packs keep distinct identities without adding playable gods',()=>{
  const M=K.Mythology;
  for(const id of ['egyptian','roman','norse']) assert.equal(M.packs[id].active,false);
  M.registerPack({id:'egyptian-test',tradition:'egyptian',active:false,figures:[{id:'egyptian-test:moon',name:'Moon Witness'}],regions:[{id:'egyptian-test:river'}],scenes:[],relicProvenance:{moon:'egyptian-test'}});
  M.registerPack({id:'roman-test',tradition:'roman',active:false,figures:[{id:'roman-test:moon',name:'Moon Witness'}],regions:[],scenes:[]});
  assert.notEqual(M.figures['egyptian-test:moon'],M.figures['roman-test:moon']);
  assert.deepStrictEqual(Object.keys(K.DATA.GODS),oldGods); assert.equal(M.scenesFor({context:'world',regionId:'egyptian-test:river'},fresh()).length,0);
});
test('pack registration rejects duplicate identities atomically',()=>{
  const before=Object.keys(K.Mythology.figures).length;
  assert.throws(()=>K.Mythology.registerPack({id:'bad-pack',tradition:'greek',figures:[{id:'charon',name:'Replacement'}],regions:[],scenes:[]}),/duplicate/i);
  assert.equal(Object.keys(K.Mythology.figures).length,before); assert.ok(!K.Mythology.packs['bad-pack']);
});
test('Charon promise opens a contextual callback and cannot pay twice',()=>{
  const M=K.Mythology,save=fresh();
  const crossing=M.sceneFor({context:'world',regionId:'styx',chapter:1,characterIds:['charon']},save);
  assert.equal(crossing.id,'charon-crossing');
  const result=M.resolveScene(save,crossing.id,'charon-promise',{context:'world',regionId:'styx',chapter:1});
  assert.equal(result.ok,true); assert.equal(save.storyState.facts.charon_promised,true); assert.equal(save.storyState.quests.charon_crossing,1);
  const callback=M.sceneFor({context:'market',regionId:'styx',chapter:2,characterIds:['charon']},save);
  assert.equal(callback.id,'charon-market-promise');
  assert.equal(M.resolveScene(save,crossing.id,'charon-promise',{context:'world',regionId:'styx',chapter:1}).ok,false);
  assert.equal(save.storyState.relationships.charon,1);
});
test('optional story prerequisites and malformed choices have no side effects',()=>{
  const M=K.Mythology,save=fresh(),before=JSON.stringify(save);
  assert.equal(M.resolveScene(save,'circe-atlantis','circe-restoration',{context:'world',regionId:'atlantis',chapter:25}).ok,false);
  assert.equal(JSON.stringify(save),before);
  assert.equal(M.resolveScene(save,'charon-crossing','invented',{context:'world',regionId:'styx',chapter:1}).ok,false);
  assert.equal(JSON.stringify(save),before);
  assert.equal(M.sceneFor({context:'world',regionId:'tartarus',chapter:0,characterIds:['achilles']},save),null);
});
test('major characters have authored regional exchanges, quests and later callbacks',()=>{
  for(const id of ['charon','achilles','orpheus','circe','athena']) {
    const scenes=Object.values(K.Mythology.scenes).filter(scene=>scene.characters.includes(id));
    assert.ok(scenes.length>=3,id+' lacks recurring scenes');
    assert.ok(scenes.some(scene=>scene.requires && Object.keys(scene.requires).length),id+' lacks prerequisites');
    assert.ok(scenes.some(scene=>scene.voices.length>=2),id+' lacks a direct exchange');
    assert.ok(scenes.some(scene=>scene.contexts.includes('house')),id+' lacks a House callback');
  }
});
test('ordinary runs cannot replay completed optional scenes as first meetings',()=>{
  const save=fresh(),M=K.Mythology,context={context:'world',regionId:'styx',chapter:1,characterIds:['charon']};
  M.resolveScene(save,'charon-crossing','charon-promise',context);
  assert.ok(!M.scenesFor(context,save).some(scene=>scene.id==='charon-crossing'));
  const restored=clone(save);M.normalizeSave(restored);
  assert.equal(M.sceneFor({context:'market',regionId:'styx',chapter:2,characterIds:['charon']},restored).id,'charon-market-promise');
});
test('portrait registry keeps all 48 boon gods and adds five art-only entries',()=>{
  const P=K.Portraits;
  assert.equal(P.roster.length,53); assert.equal(new Set(P.roster.map(entry=>entry.id)).size,53);
  for(const id of oldGods) assert.equal(P.byId[id].hasBoonContent,true);
  for(const id of ['mnemosyne','leto','oceanus','tethys','ananke']) {assert.equal(P.byId[id].hasBoonContent,false);assert.ok(!K.DATA.GODS[id]);}
  for(const record of P.roster) {
    for(const key of ['displayName','epithet','tradition','domain','symbols','paletteAccent','silhouettePose','cropSafeNotes','animationCues']) assert.ok(record[key],record.id+' missing '+key);
    assert.equal(record.approvalStatus,'roster-approved'); assert.equal(record.approvedStillReference,null);
  }
});
test('all boons reuse the correct deity and duos use only data-declared gods',()=>{
  const P=K.Portraits,D=K.DATA;
  assert.deepStrictEqual(Array.from(P.forBoon(D.boonById.duo_seastorm).map(p=>p.id)),['zeus','poseidon']);
  for(const boon of D.BOONS.concat(D.SPECIAL_BOONS)) {
    const portraits=P.forBoon(boon); assert.ok(portraits.length); assert.equal(portraits[0].id,boon.god);
    assert.ok(portraits.every(p=>P.byId[p.id]));
  }
  const sameGod=D.BOONS.filter(b=>b.god==='zeus').slice(0,3);
  assert.ok(sameGod.every(boon=>P.forBoon(boon)[0]===P.byId.zeus));
});
test('portrait policy pauses hidden surfaces and preserves static HUD and reduced motion',()=>{
  const P=K.Portraits;
  assert.equal(P.shouldAnimate({visible:true,surface:'reward',reducedMotion:false,documentHidden:false}),true);
  for(const state of [{visible:false,surface:'reward'},{visible:true,surface:'hud'},{visible:true,surface:'reward',reducedMotion:true},{visible:true,surface:'codex',documentHidden:true}]) assert.equal(P.shouldAnimate(state),false);
});
test('all 53 approved identities ship reviewed standalone masters and offline posters',()=>{
  const roster=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/deity-portraits/roster.json'),'utf8'));
  const production=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/deity-portraits/production.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/manifest.json'),'utf8'));
  assert.equal(roster.entries.length,53); assert.equal(new Set(roster.entries.map(record=>record.id)).size,53);
  assert.equal(production.completed,53); assert.equal(production.entries.length,53);
  assert.equal(production.fullResolutionMasters,53); assert.equal(production.atlasCompatibilityCrops,0);
  assert.deepStrictEqual(production.entries.map(record=>record.id).sort(),roster.entries.map(record=>record.id).sort());
  for(const record of roster.entries) {
    const id=record.id,master='assets/deities/masters/'+id+'.png',poster='assets/deities/posters/'+id+'.webp';
    assert.equal(record.assetSource,'generated-master',id+' is not backed by its own master');
    assert.equal(record.artStatus,'packaged-poster',id+' has not been packaged');
    assert.equal(record.approvedStillReference,poster,id+' points at the wrong still');
    assert.ok(fs.statSync(path.join(ROOT,master)).size>1000000,id+' master is unexpectedly small');
    assert.ok(fs.statSync(path.join(ROOT,poster)).size>10000,id+' poster is unexpectedly small');
    const entry=manifest['portrait.greek.'+id+'.poster'];
    assert.ok(entry,id+' has no poster manifest entry');
    assert.equal(entry.src,poster); assert.equal(entry.kind,'deity-portrait');
    assert.equal(entry.deityId,id); assert.equal(entry.reviewed,true); assert.equal(entry.motionTreatment,'runtime');
    const provenance=production.entries.find(item=>item.id===id);
    assert.equal(provenance.inspection.passed,true,id+' lacks an inspection record');
  }
});
test('missing portrait posters use only a clearly labelled interim atlas fallback',()=>{
  const P=K.Portraits;
  K.Assets={entry:id=>id==='ui.deities'?{cols:8,rows:6}:null,url:()=> 'assets/ui/deities.png'};
  assert.equal(P.assetStatus('zeus').state,'interim'); assert.equal(P.assetStatus('mnemosyne').state,'missing');
  assert.ok(P.html('zeus',{surface:'hud'}).includes('data-portrait-status="interim"'));
  assert.ok(P.html('mnemosyne').includes('Portrait awaiting production'));
  assert.ok(P.html('unknown').includes('Portrait unavailable'));
});
test('review metadata matches the runtime registry without approving assets',()=>{
  const file=path.join(ROOT,'docs/deity-portraits/roster.json');assert.ok(fs.existsSync(file),'missing reviewable roster');
  const roster=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(roster.approvalStatus,'roster-approved');
  assert.deepStrictEqual(roster.entries.map(p=>p.id),Array.from(K.Portraits.roster.map(p=>p.id)));
});
test('produced manifest posters resolve automatically and never borrow another deity',()=>{
  const P=K.Portraits;
  K.Assets={entry:id=>id==='portrait.greek.zeus.poster'?{cols:1,rows:1,reviewed:true,motionTreatment:'runtime'}:null,url:id=>'assets/'+id+'.png'};
  assert.equal(P.assetStatus('zeus').state,'approved');assert.equal(P.assetStatus('zeus').treatment,'runtime');
  assert.ok(P.html('zeus',{surface:'reward'}).includes('portrait-poster'));
  assert.equal(P.assetStatus('poseidon').state,'missing');
});
test('remembered campaign choices contextualize repeated chapters without rewriting source',()=>{
  const M=K.Mythology,save=fresh(),chapter=K.DATA.CAMPAIGN_STORY[1],before=JSON.stringify(chapter);
  assert.equal(M.rememberCampaignChoice(save,chapter.id,'river_coin'),true);
  const remembered=M.contextualChapter(chapter,save);assert.notEqual(remembered,chapter);
  assert.ok(remembered.voices.length>chapter.voices.length);assert.equal(JSON.stringify(chapter),before);
  assert.equal(M.contextualChapter(K.DATA.CAMPAIGN_STORY[0],save),K.DATA.CAMPAIGN_STORY[0]);
});

let failures=0;
for(const {name,fn} of tests) {try {fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
if(failures)process.exitCode=1;else console.log('MYTHOLOGY OVERHAUL: '+tests.length+' checks passed');
