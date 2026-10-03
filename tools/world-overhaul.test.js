'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const {K,G,windowShim,releaseAll} = require('./debug-harness');
for (const name of ['world','world-runtime']) {
  const filename=path.join(__dirname,'../js/'+name+'.js');
  if(fs.existsSync(filename) && !(name==='world'?K.World:K.WorldRuntime)) vm.runInNewContext(fs.readFileSync(filename,'utf8'),windowShim,{filename});
}
const ambienceFile=path.join(__dirname,'../js/world-ambience.js');
if(fs.existsSync(ambienceFile)&&!K.WorldAmbience)vm.runInNewContext(fs.readFileSync(ambienceFile,'utf8'),windowShim,{filename:ambienceFile});
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
test('Every region owns a distinct terrain and ambience program with seeded traversal features',()=>{
  assert.ok(K.World,'K.World generator is missing');reset();
  const ids=K.DATA.REGIONS.map(region=>region.id).concat(['charon_market','practice']),layouts=new Set(),shapes=new Set();
  const combatSeed=G.run.rng.seed,repeatSeeds=new Set(['tartarus','aegean','arcadia']);
  assert.strictEqual(K.World.VERSION,3,'terrain semantics require a new world generation version');
  for(const id of ids){
    const profile=K.World.PROFILES[id];
    assert.ok(profile&&profile.terrain&&profile.ambience,id+' is missing its terrain/ambience profile');
    assert.strictEqual(profile.terrain.programId,id,id+' terrain program is not region-specific');
    assert.ok(profile.terrain.shape&&profile.terrain.surface,id+' has an incomplete terrain program');
    assert.ok(profile.ambience.bed&&profile.ambience.weather&&profile.ambience.particleKind,id+' has an incomplete ambience program');
    assert.ok(profile.subzones.every(zone=>zone.landmark),id+' has an unnamed terrain subzone');
    shapes.add(profile.terrain.shape);
  }
  assert.strictEqual(shapes.size,ids.length,'region terrain profiles collapsed to duplicate shapes');
  for(const id of ids){
    const a=K.World.generate({seed:872,regionId:id});
    assert.ok(Array.isArray(a.terrainFeatures)&&a.terrainFeatures.length>0,id+' generated no terrain features');
    assert.ok(a.terrainFeatures.every(feature=>Number.isFinite(feature.coverHeight)&&Number.isFinite(feature.flowX)&&Number.isFinite(feature.flowY)),id+' terrain is missing simulation fields');
    assert.ok(a.terrainFeatures.every(feature=>K.World.cellAt(a,feature.x,feature.y)),id+' has terrain detached from the floor map');
    if(K.DATA.REGIONS.some(region=>region.id===id)){assert.ok(a.terrainFeatures.some(feature=>feature.blocksMovement),id+' has no solid landform terrain');for(const feature of a.terrainFeatures.filter(item=>item.blocksMovement))assert.ok(a.blockers.some(blocker=>blocker.terrain&&blocker.id.startsWith(feature.id+':terrain-')),id+' landform has no matching collision: '+feature.id);}
    if(repeatSeeds.has(id)){const b=K.World.generate({seed:872,regionId:id});assert.deepStrictEqual(JSON.parse(JSON.stringify(a.terrainFeatures)),JSON.parse(JSON.stringify(b.terrainFeatures)),id+' terrain features are not deterministic');}
    layouts.add(JSON.stringify(a.terrainFeatures.map(feature=>[feature.kind,feature.shape,feature.x,feature.y,feature.w,feature.h,feature.elevation,feature.material])));
    if(K.DATA.REGIONS.some(region=>region.id===id))assert.ok(a.terrainFeatures.some(feature=>feature.kind==='ramp'||feature.kind==='stair'||feature.kind==='bridge'||feature.kind==='causeway'),id+' has no gameplay traversal feature');
    assert.ok(K.World.validate(a).valid,id+' terrain disconnected a required node: '+K.World.validate(a).errors.join(', '));
  }
  assert.strictEqual(layouts.size,ids.length,'region terrain programs collapsed to duplicate layouts');
  assert.strictEqual(G.run.rng.seed,combatSeed,'world terrain consumed combat RNG');
});
test('Regional atmosphere emits deterministic bounded particles and honors reduced motion',()=>{
  const A=K.WorldAmbience;assert.ok(A,'regional ambience controller is missing');
  const ids=K.DATA.REGIONS.map(region=>region.id).concat(['charon_market','practice']);
  const kinds=new Set(ids.map(id=>K.World.PROFILES[id].ambience.particleKind));
  assert.ok(kinds.size>=7,'regional atmosphere has too few distinct particle families');
  const makeGame=()=>({world:K.World.generate({seed:818,regionId:'tartarus'}),particles:new K.Particles(2400),
    cam:{x:0,y:0,zoom:1,ox:0,oy:0},player:{x:0,y:0},phase:'playing',realTime:0});
  function run(step){const game=makeGame();for(let t=0;t<24;t+=step){A.update(game,step);game.realTime+=step;}return game.particles.list.filter(p=>p.worldAmbience).map(p=>[p.x,p.y,p.vx,p.vy,p.life,p.kind]);}
  assert.deepStrictEqual(JSON.stringify(run(1/30)),JSON.stringify(run(1/60)),'regional weather changed with frame cadence');
  const crowded=makeGame();for(let i=0;i<2400;i++)A.update(crowded,1/30);const cap=A.visibleParticleCap(crowded);
  assert.ok(crowded.particles.list.filter(p=>p.worldAmbience).length<=cap,'atmosphere exceeded its visible-area particle cap');
  A.setReducedMotion(true);const still=makeGame();for(let i=0;i<180;i++)A.update(still,1/30);
  assert.strictEqual(still.particles.list.filter(p=>p.worldAmbience).length,0,'reduced motion still emitted ambience');
  A.setReducedMotion(false);
});
test('Legacy saves retain global mute and receive separate ambience preferences',()=>{
  const legacy=K.Save.load({muted:true,obols:37});
  assert.strictEqual(legacy.muted,true,'legacy global mute was reset');
  assert.strictEqual(legacy.obols,37,'legacy progression was reset');
  assert.strictEqual(legacy.ambienceVolume,0.45,'legacy save missed the ambience volume default');
  assert.strictEqual(legacy.ambienceMuted,false,'legacy save missed the independent ambience mute default');
  assert.strictEqual(legacy.reducedMotion,false,'legacy save missed the reduced-motion default');
  assert.strictEqual(typeof K.Audio.setAmbienceVolume,'function','independent ambience volume API is missing');
  assert.strictEqual(typeof K.Audio.setAmbienceMuted,'function','independent ambience mute API is missing');
  assert.strictEqual(typeof K.Audio.setAmbienceProfile,'function','regional ambience profile API is missing');
  const clamped=K.Save.load({ambienceVolume:4,ambienceMuted:1,reducedMotion:1});
  assert.strictEqual(clamped.ambienceVolume,1,'ambience volume was not clamped');
  assert.strictEqual(clamped.ambienceMuted,true);assert.strictEqual(clamped.reducedMotion,true);
  const audio=K.Audio,old={ctx:audio.ctx,master:audio.master,sfxGain:audio.sfxGain,musicGain:audio.musicGain,ambienceGain:audio.ambienceGain,
    enabled:audio.enabled,started:audio.started,muted:audio.muted,ambienceMuted:audio.ambienceMuted,ambienceVolume:audio._ambienceVolume,
    profile:audio._ambienceProfile,profileKey:audio._ambienceKey,synth:audio._ambienceSynth,AudioContext:windowShim.AudioContext};
  class Param{constructor(value){this.value=value||0;this.ramps=[];}setTargetAtTime(value){this.value=value;}setValueAtTime(value){this.value=value;}linearRampToValueAtTime(value,time){this.value=value;this.ramps.push(time);}cancelScheduledValues(){}}
  class Node{constructor(){this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1);this.connections=[];this.type='sine';}connect(node){this.connections.push(node);}disconnect(){this.connections=[];}start(){}}
  class FakeAudioContext{constructor(){this.destination=new Node();this.currentTime=1;this.sampleRate=8000;this.state='suspended';this.oscillators=[];this.sources=[];}createGain(){return new Node();}createOscillator(){const node=new Node();this.oscillators.push(node);return node;}createBiquadFilter(){return new Node();}createBuffer(channels,length,rate){return{getChannelData:()=>new Float32Array(length)};}createBufferSource(){const node=new Node();this.sources.push(node);return node;}resume(){this.state='running';return Promise.resolve();}}
  try{
    audio.ctx=null;audio.master=audio.sfxGain=audio.musicGain=audio.ambienceGain=null;audio.started=false;audio.enabled=true;audio._ambienceSynth=null;audio._ambienceProfile=null;audio._ambienceKey=null;
    windowShim.AudioContext=FakeAudioContext;audio.boot();audio.setAmbienceVolume(0.6);audio.setAmbienceMuted(false);
    audio.setAmbienceProfile({bed:'river',accentHz:96});assert.strictEqual(audio.ctx.oscillators.length,0,'ambience nodes started before the audio gesture');
    audio.resume();assert.strictEqual(audio.ctx.oscillators.length,2,'regional ambience synth was not created after audio unlock');
    const oscillatorCount=audio.ctx.oscillators.length,sourceCount=audio.ctx.sources.length;
    for(const bed of ['cavern','river','grove','fields','lava','ruins','storm','terraces'])audio.setAmbienceProfile({bed,accentHz:111});
    assert.strictEqual(audio.ctx.oscillators.length,oscillatorCount,'rapid region changes stacked oscillators');
    assert.strictEqual(audio.ctx.sources.length,sourceCount,'rapid region changes stacked noise sources');
    assert.ok(Math.abs(audio._ambienceSynth.bodyGain.gain.ramps.slice(-1)[0]-(audio.ctx.currentTime+0.8))<1e-9,'regional ambience did not crossfade over 0.8 seconds');
    const musicGain=audio.musicGain.gain.value;audio.setAmbienceMuted(true);assert.strictEqual(audio.ambienceGain.gain.value,0);assert.strictEqual(audio.musicGain.gain.value,musicGain,'ambience-only mute changed music gain');
    assert.strictEqual(audio.muted,false,'ambience-only mute changed the global mute flag');
    audio.setAmbienceVolume(9);assert.strictEqual(audio._ambienceVolume,1);audio.setAmbienceVolume(-2);assert.strictEqual(audio._ambienceVolume,0);
    audio.setMuted(true);assert.strictEqual(audio.master.gain.value,0,'global mute did not silence every bus');audio.setMuted(false);
  }finally{
    Object.assign(audio,{ctx:old.ctx,master:old.master,sfxGain:old.sfxGain,musicGain:old.musicGain,ambienceGain:old.ambienceGain,
      enabled:old.enabled,started:old.started,muted:old.muted,ambienceMuted:old.ambienceMuted,_ambienceVolume:old.ambienceVolume,
      _ambienceProfile:old.profile,_ambienceKey:old.profileKey,_ambienceSynth:old.synth});windowShim.AudioContext=old.AudioContext;
  }
});
test('Generated terrain art carries matching physical collision and projectile cover',()=>{
  const W=K.World,map=W.generate({seed:872,regionId:'tartarus'}),solidFeatures=map.terrainFeatures.filter(feature=>feature.blocksMovement),terrainBlockers=map.blockers.filter(blocker=>blocker.terrain);
  assert.ok(solidFeatures.length>0,'regional landforms were only decorative');
  for(const feature of map.terrainFeatures)assert.ok(W.cellAt(map,feature.x,feature.y),feature.id+' is floating outside the generated floor');
  for(const feature of solidFeatures)assert.ok(terrainBlockers.some(blocker=>blocker.id.startsWith(feature.id+':terrain-')),feature.id+' is missing its collision footprint');
  for(const blocker of terrainBlockers){const x=blocker.x+blocker.w/2,y=blocker.y+blocker.h/2;assert.strictEqual(W.isWalkable(map,x,y,8),false,blocker.id+' did not block actor movement');assert.strictEqual(W.lineOfSight(map,{x:x-40,y},{x:x+40,y},8),false,blocker.id+' did not occlude a low projectile');}
});
test('Main encounter clearings receive dense near-field floor inlays around a clear combat center',()=>{
  const map=K.World.generate({seed:971,regionId:'tartarus'}),node=map.nodes.find(item=>item.main&&item.idx===0);
  assert.ok(node,'opening encounter node is missing');
  const near=map.terrainOverlays.filter(item=>item.kind==='ground-surface'&&Math.hypot(item.x-node.x,item.y-node.y)<1000);
  assert.ok(near.length>=12,'opening encounter has too little near-field terrain art: '+near.length);
  assert.ok(near.every(item=>item.walkable&&!item.solid&&!item.collision),'floor art changed encounter collision');
  assert.ok(map.terrainOverlays.some(item=>item.id===node.id+':arena-inlay'),'encounter center is missing its patterned floor inlay');
});
test('Encounter floor details use compact regional decal atlases over the continuous floor',()=>{
  const map=K.World.generate({seed:872,regionId:'tartarus'}),node=map.nodes.find(item=>item.main&&item.idx===0),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/manifest.json'),'utf8'));
  assert.strictEqual(map.groundAssetId,'regiondetail.ash','floor dressing still resolves to raised island paving');
  assert.strictEqual(manifest[map.groundAssetId].kind,'region-ground-detail','biome ground-detail atlas was not registered');
  const near=map.terrainOverlays.filter(item=>item.kind==='ground-surface'&&Math.hypot(item.x-node.x,item.y-node.y)<1500),center=near.find(item=>item.id===node.id+':arena-inlay');
  assert.ok(center,'encounter center is missing its inlay decal');
  assert.ok(near.every(item=>item.assetId===map.groundAssetId),'near-field detail did not use the selected biome sheet');
  assert.ok(near.filter(item=>item!==center).every(item=>item.w<=680&&item.h<=500),'scattered floor details are oversized');
  assert.ok(center.w<=900&&center.h<=700&&center.alpha<=0.5,'central marking overwhelms the continuous floor');
});
test('Encounter landmarks frame the clearing outside the opening combat space',()=>{
  const map=K.World.generate({seed:872,regionId:'tartarus'}),node=map.nodes.find(item=>item.main&&item.idx===0),landmark=map.props.find(item=>item.id===node.id+':landmark');
  assert.ok(landmark,'opening encounter lost its regional landmark');
  assert.ok(Math.hypot(landmark.x-node.x,landmark.y-node.y)>=1500,'landmark intrudes into the player and enemy combat space');
});
test('Regional landforms enter the playable camera frame around the opening encounter',()=>{
  const map=K.World.generate({seed:872,regionId:'tartarus'}),node=map.nodes.find(item=>item.main&&item.idx===0),forms=map.terrainFeatures.filter(feature=>feature.id.startsWith(node.id+':landform-'));
  assert.ok(forms.length>=3,'opening encounter has no surrounding regional landforms');
  const nearestEdge=Math.min(...forms.map(feature=>Math.max(0,Math.hypot(feature.x-node.x,feature.y-node.y)-Math.hypot(feature.w/2,feature.h/2))));
    assert.ok(nearestEdge<=1400,'regional landforms sit outside the opening reveal and gameplay camera: '+Math.round(nearestEdge));
});
test('Main encounter approaches place visible nonblocking biome rubble around the fight',()=>{
  const map=K.World.generate({seed:971,regionId:'tartarus'}),node=map.nodes.find(item=>item.main&&item.idx===0);
  const debris=map.terrainFeatures.filter(feature=>['rubble','fragments'].includes(feature.kind)&&Math.hypot(feature.x-node.x,feature.y-node.y)<850);
  assert.ok(debris.length>=12,'opening combat view lacks its dense ring of 12 close biome terrain silhouettes: '+debris.length);
  assert.ok(debris.every(feature=>!feature.blocksMovement&&!map.blockers.some(blocker=>blocker.id.startsWith(feature.id+':terrain-'))),'decorative rubble encroached on combat clearance');
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
test('Terrain surfaces stop at ledges and water while ramps and bridges connect elevations',()=>{
  const W=K.World;assert.strictEqual(typeof W.surfaceAt,'function','terrain surface query is missing');
  const cell=(x,height,kind='ground',walkable=true)=>({x,y:0,height,kind,walkable,material:'stone'});
  const map=(cells,terrainFeatures=[])=>({tileSize:100,cells,terrainFeatures,blockers:[],profile:{terrain:{surface:'stone'}}});
  const cliff=map([cell(0,0),cell(100,48)]),walker={x:100,y:0,radius:8,vx:100,vy:0};
  W.resolveMove(cliff,walker,{x:0,y:0});assert.ok(walker.x<60,'unlinked cliff face was traversed');
  const water=map([cell(0,0),cell(100,-12,'water',false),cell(200,0)]),swimmer={x:200,y:0,radius:8,vx:200,vy:0};
  assert.ok(W.isWalkable(water,0,0,8),'fixture start is not walkable: '+JSON.stringify(W.cellAt(water,0,0)));
  W.resolveMove(water,swimmer,{x:0,y:0});assert.ok(swimmer.x<100,'water channel was treated as walkable at '+swimmer.x);
  const ridge=map([cell(0,0),cell(100,0),cell(200,0)],[{id:'ridge',kind:'ridge',x:100,y:0,w:40,h:80,blocksMovement:true,coverHeight:48}]);ridge.blockers.push({id:'ridge:collision',x:80,y:-40,w:40,h:80,height:48});
  assert.strictEqual(W.isWalkable(ridge,100,0,8),false,'solid terrain artwork had no matching collision');
  const ramp=map([cell(0,0),cell(100,24),cell(200,48)], [{id:'ramp',kind:'ramp',x:100,y:0,w:200,h:100,transition:{fromElevation:0,toElevation:48},coverHeight:0}]);
  const climber={x:200,y:0,radius:8,vx:200,vy:0};W.resolveMove(ramp,climber,{x:0,y:0});assert.ok(climber.x>180,'authored ramp did not connect its elevation bands');
  assert.strictEqual(W.surfaceAt(ramp,100,0).elevation,24,'ramp surface did not interpolate its elevation');
  const bridge=map([cell(0,0),cell(100,12,'bridge'),cell(200,12)]),crossing={x:200,y:0,radius:8,vx:200,vy:0};
  W.resolveMove(bridge,crossing,{x:0,y:0});assert.ok(crossing.x>180,'bridge height was not traversable');
});
test('Terrain currents apply the same bounded deterministic force to player and enemy movement',()=>{
  assert.strictEqual(typeof K.World.surfaceAt,'function','terrain surface query is missing');assert.ok(K.WorldRuntime,'World runtime is missing');reset();
  const W=K.World,world=G.world,origin=W.nearestWalkable(world,G.player.x,G.player.y,0),cell=W.cellAt(world,origin.x,origin.y);cell.flowX=120;cell.flowY=-30;
  assert.deepStrictEqual([W.surfaceAt(world,origin.x,origin.y).flowX,W.surfaceAt(world,origin.x,origin.y).flowY],[120,-30]);
  G._terrainDt=0.1;const player={x:origin.x,y:origin.y,radius:8,vx:0,vy:0};G.collideWithWalls(player);
  const enemy={x:origin.x,y:origin.y,radius:8,vx:0,vy:0,ai:'lunge'};G.collideWithWalls(enemy);G._terrainDt=0;
  assert.deepStrictEqual([player.vx,player.vy],[enemy.vx,enemy.vy],'player and enemy received different terrain forces');
  assert.ok(player.vx>0&&player.vy<0,'current did not affect movement');assert.ok(Math.hypot(player.vx,player.vy)<=25,'current acceleration exceeded its frame bound');
});
test('Raised terrain and solid blockers occlude only low projectile paths',()=>{
  const W=K.World;assert.strictEqual(typeof W.lineOfSight,'function','terrain line-of-sight query is missing');
  const cells=[];for(const y of [-100,0,100])for(const x of [0,100,200])cells.push({x,y,height:0,kind:'ground',walkable:true,material:'stone'});
  const world={tileSize:100,cells,terrainFeatures:[{id:'ridge',kind:'ridge',x:80,y:-50,w:40,h:100,elevation:48,coverHeight:42}],blockers:[{id:'pillar',x:180,y:-25,w:24,h:50,height:36}],profile:{terrain:{surface:'stone'}}};
  assert.strictEqual(W.lineOfSight(world,{x:0,y:0},{x:200,y:0},24),false,'raised ridge failed to stop a low shot');
  assert.strictEqual(W.lineOfSight(world,{x:0,y:0},{x:200,y:0},60),true,'raised ridge blocked a shot above its cover');
  world.terrainFeatures=[];assert.strictEqual(W.lineOfSight(world,{x:100,y:0},{x:200,y:0},24),false,'solid pillar failed to stop a low shot');
  assert.strictEqual(W.lineOfSight(world,{x:100,y:0},{x:200,y:0},60),true,'solid pillar blocked a shot above its cover');
  reset();const previousWorld=G.world,previousArena=G.arena;G.world=world;G.arena={x:-500,y:-500,w:1000,h:1000};K.E.enemies.length=0;
  world.terrainFeatures=[{id:'ridge',kind:'ridge',x:80,y:-50,w:40,h:100,elevation:48,coverHeight:42}];
  const low=new K.E.Projectile({x:0,y:0,vx:1000,vy:0,life:1,friendly:true,trail:false});low.update(0.2,G);assert.strictEqual(low.life,0,'projectile runtime passed through raised cover');
  const high=new K.E.Projectile({x:0,y:0,vx:1000,vy:0,life:1,friendly:true,trail:false});high.projectileHeight=60;assert.strictEqual(W.lineOfSight(world,{x:0,y:0},{x:200,y:0},60),true,'test path should clear the cover');high.update(0.2,G);assert.ok(high.life>0,'high projectile was stopped by lower cover: '+JSON.stringify({life:high.life,x:high.x,y:high.y,dead:high.dead}));
  G.world=previousWorld;G.arena=previousArena;
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
const filter=process.argv[2],selected=filter?tests.filter(([name])=>name.toLowerCase().includes(filter.toLowerCase())):tests;
if(filter&&!selected.length)throw new Error('No world overhaul test matched '+filter);
let failed=0;
for(const [name,fn] of selected)try{fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}
console.log((selected.length-failed)+'/'+selected.length+' world overhaul tests passed');
if(failed)process.exitCode=1;
