/* Seeded topology, tiled terrain and simulation geometry. No renderer objects or combat RNG. */
(function () {
  'use strict';
  const K=window.K,D=K.DATA,W={VERSION:3,TILE_SIZE:80};
  if(K.World)return;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const aliases={acheron:'styx',lethe_garden:'mourning',knossos:'labyrinth',aeaea:'aegean',colchis:'aegean',typhon_core:'gigantomachy',delphi:'olympus_approach',pelion:'elysium',arcadia:'asphodel',thebes:'labyrinth',marathon:'gigantomachy',mycenae:'forge'};
  const families={tartarus:'ash',styx:'river',acheron:'river',asphodel:'grove',punishment:'lava',lethe_garden:'grove',elysium:'fields',mourning:'fields',forge:'lava',labyrinth:'ruins',knossos:'ruins',aegean:'river',aeaea:'grove',colchis:'river',gigantomachy:'storm',delphi:'terraces',pelion:'grove',arcadia:'grove',thebes:'ruins',marathon:'fields',mycenae:'ruins',olympus_approach:'terraces',olympus:'terraces',typhon_core:'lava',ancient_greece:'fields',atlantis:'river'};
  const regionalLandmarks={
    tartarus:['Chained Gate','Ash Watchtower','Buried Tribunal'],styx:['Ferry Crossing','Drowned Colonnade','Black-Reed Causeway'],acheron:['Sorrow Beacon','Silted Ferry','Deadwater Steps'],
    asphodel:['Cinder Orchard','Rooted Shrine','Ember-Bloom Glade'],punishment:['Molten Writ','Chain Winch','Furnace Rift'],lethe_garden:['Memory Orchard','Veiled Spring','Forgetful Arbors'],
    elysium:['Heroic Memorial','Laurel Arena','Broken Colonnade'],mourning:['Weeping Laurel','Phantom Procession','Mourner’s Gate'],forge:['Bronze Foundry','Hammer Hall','Molten Fault'],
    labyrinth:['Turning Hall','Pillar Court','Royal Gate'],knossos:['Bull Gate','Daidalos Workshop','Painted Bull Fresco'],aegean:['Tidal Shrine','Whale-Bone Pier','Ferry Crossing'],
    aeaea:['Circe’s Loom','Enchanted Menhir','Moonlit Cypress'],colchis:['Golden Fleece Mooring','Dragon-Tooth Grove','Sun-Skein Loom'],gigantomachy:['Titan Rampart','Storm Beacon','War Memorial'],
    olympus_approach:['Cloud Bridge','Divine Hall','Ascending Terrace'],olympus:['High Cloud Court','Storm Throne','Sunward Pillar'],typhon_core:['Typhon’s Forge','Cyclopean Chain','Magma Heart'],
    delphi:['Pythian Well','Omphalos Steps','Tripod Sanctuary'],pelion:['Centaur Grove','Ash-Mounted Spring','Old Wine Press'],arcadia:['Moonlit Dolmen','Pan’s Fen','Horned-Stag Shrine'],
    thebes:['Sphinx Gate','Seven-Gate Causeway','Cadmean Well'],marathon:['Runner’s Cairn','Laurel Field','Poppy Banner'],mycenae:['Lion Gate','Tholos Treasury','Bronze King’s Hall'],
    ancient_greece:['Olive Way','Roadside Shrine','Living Village'],atlantis:['Sunken Forum','Coral Crown','Poseidon’s Gate']
  };
  const signatureArt={
    tartarus:['regionlandmark.01',0],styx:['regionlandmark.01',1],acheron:['regionlandmark.01',2],asphodel:['regionlandmark.01',3],
    punishment:['regionlandmark.01',4],lethe_garden:['regionlandmark.01',5],elysium:['regionlandmark.01',6],mourning:['regionlandmark.01',7],
    forge:['regionlandmark.01',8],labyrinth:['regionlandmark.01',9],knossos:['regionlandmark.01',10],aegean:['regionlandmark.01',11],
    aeaea:['regionlandmark.01',12],colchis:['regionlandmark.01',13],gigantomachy:['regionlandmark.01',14],olympus_approach:['regionlandmark.01',15],
    olympus:['regionlandmark.02',0],typhon_core:['regionlandmark.02',1],delphi:['regionlandmark.02',2],pelion:['regionlandmark.02',3],
    arcadia:['regionlandmark.02',4],thebes:['regionlandmark.02',5],marathon:['regionlandmark.02',6],mycenae:['regionlandmark.02',7],
    ancient_greece:['regionlandmark.02',8],atlantis:['regionlandmark.02',9]
  };
  const familySubzones={
    ash:[['cinder','ash_cinder'],['iron','ash_iron'],['basalt','ash_basalt']],river:[['shallows','river_shallows'],['silt','river_silt'],['saltstone','river_saltstone']],
    grove:[['roots','grove_roots'],['blossom','grove_blossom'],['moss','grove_moss']],fields:[['laurel','fields_laurel'],['marble','fields_marble'],['poppy','fields_poppy']],
    lava:[['slag','lava_slag'],['bronze','lava_bronze'],['obsidian','lava_obsidian']],ruins:[['marble','ruins_marble'],['mosaic','ruins_mosaic'],['fallen','ruins_fallen']],
    storm:[['cloudstone','storm_cloudstone'],['lightning','storm_lightning'],['titanstone','storm_titanstone']],terraces:[['cloud','terraces_cloud'],['sunstone','terraces_sunstone'],['windcut','terraces_windcut']]
  };
  const terrainProgramData={
    tartarus:['cinder-rift-crown',['basin','ridge','ravine'],'ramp','scoria','cavern','embers','chain-resonance',82,'ash'],
    styx:['blackwater-ferry-delta',['channel','island','bank'],'bridge','silt','river','mist','ferry-bell',96,'mist'],
    acheron:['silted-crossing-braids',['basin','channel','shelf'],'stair','silt','river','fog','oar-creak',108,'mist'],
    asphodel:['ember-orchard-bowls',['basin','rootbank','ridge'],'ramp','cinder','grove','embers','seed-pods',122,'embers'],
    punishment:['slagfall-switchbacks',['ravine','ridge','basin'],'stair','slag','lava','heat','chain-hammer',136,'sparks'],
    lethe_garden:['forgetting-spring-groves',['basin','channel','rootbank'],'bridge','moss','grove','pollen','memory-bells',150,'spores'],
    elysium:['laurel-bowl-circuits',['terrace','ridge','basin'],'stair','laurel','fields','petals','distant-crowd',164,'petals'],
    mourning:['weeping-laurel-fens',['basin','channel','rootbank'],'bridge','moss','fields','pollen','lyre-echo',178,'petals'],
    forge:['bronze-flume-foundry',['channel','terrace','ravine'],'stair','bronze','lava','sparks','anvil-ring',192,'sparks'],
    labyrinth:['knotted-corridor-courts',['ruins','ridge','basin'],'stair','mosaic','ruins','dust','turning-stone',206,'dust'],
    knossos:['bull-gate-ringways',['terrace','ruins','channel'],'ramp','mosaic','ruins','dust','bronze-horn',220,'dust'],
    aegean:['tidal-archipelago-shelves',['channel','island','bank'],'bridge','saltstone','river','spray','surf-and-rope',234,'spray'],
    aeaea:['moonlit-cypress-hollows',['basin','rootbank','island'],'ramp','moss','grove','fireflies','cicada-choir',248,'spores'],
    colchis:['fleece-coast-ravines',['channel','ravine','island'],'bridge','saltstone','river','spray','golden-fleece-hum',262,'spray'],
    gigantomachy:['titan-rampart-escarpments',['ridge','ravine','terrace'],'stair','titanstone','storm','storm','war-drum-thunder',276,'rain'],
    delphi:['omphalos-terrace-fans',['terrace','basin','ridge'],'stair','sunstone','terraces','cloud-shadow','tripod-chimes',290,'clouds'],
    pelion:['centaur-spring-switchbacks',['ridge','rootbank','channel'],'ramp','roots','grove','leaves','spring-and-hooves',304,'leaves'],
    arcadia:['pan-fen-island-rings',['basin','island','rootbank'],'bridge','moss','grove','fireflies','reed-pipes',318,'spores'],
    thebes:['seven-gate-causeway-grid',['ruins','terrace','basin'],'causeway','fallen','ruins','dust','sphinx-stone',332,'dust'],
    marathon:['laurel-runner-terraces',['terrace','bank','ridge'],'ramp','laurel','fields','wind','banner-flutter',346,'petals'],
    mycenae:['lion-gate-tholos-rings',['ruins','ridge','ravine'],'stair','fallen','ruins','wind','bronze-gate-groan',360,'dust'],
    olympus_approach:['cloud-bridge-ascent',['terrace','ridge','ravine'],'bridge','cloudstone','terraces','cloud-shadow','high-wind-harp',374,'clouds'],
    olympus:['sunward-aerie-terraces',['terrace','basin','island'],'stair','sunstone','terraces','light-shafts','divine-bells',388,'clouds'],
    typhon_core:['magma-heart-caldera',['basin','ravine','ridge'],'ramp','obsidian','lava','embers','deep-earth-pulse',402,'embers'],
    ancient_greece:['olive-road-river-meanders',['channel','terrace','rootbank'],'bridge','marble','fields','leaves','village-bells',416,'leaves'],
    atlantis:['sunken-forum-tidal-levels',['channel','island','terrace'],'causeway','saltstone','river','spray','submerged-stone-song',430,'spray'],
    charon_market:['ferry-market-quays',['channel','bank','terrace'],'bridge','silt','river','mist','coin-and-oar',444,'mist'],
    practice:['training-court-galleries',['terrace','ruins','bank'],'stair','marble','silent','still','quiet-stone',458,'motes']
  };
  const terrainProgram=(id,accent)=>{const row=terrainProgramData[id];return{terrain:{programId:id,shape:row[0],landforms:row[1].slice(),traversal:row[2],surface:row[3],accent:accent||'#b8a366'},ambience:{bed:row[4],weather:row[5],motif:row[6],palette:accent||'#b8a366',accentHz:row[7],particleKind:row[8]}};};
  function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function canonical(value){if(!value||typeof value!=='object')return JSON.stringify(value===undefined?null:value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';}
  function addDestination(id,name,baseId,bossBase,bossId,title,desc){
    if(D.REGIONS.some(r=>r.id===id))return;
    const base=D.REGIONS.find(r=>r.id===baseId);
    const region=clone(base);
    // Inherit the base region's art family so floor/props/backdrop resolve.
    // The destination id is kept for routing; artFamily stays paintable.
    Object.assign(region,{id,name,sub:title,desc,boss:bossId,chamberCount:8,optionalDestination:true,artFamily:base.artFamily||baseId});
    const boss=clone(D.BOSSES[bossBase]);Object.assign(boss,{id:bossId,name:id==='atlantis'?'THE ABYSSAL CUSTODIAN':'TALOS, THE ROADWARDEN',title,familyId:boss.familyId||boss.ai||bossBase,sourceId:boss.sourceId||bossBase});D.BOSSES[bossId]=boss;
    D.REGIONS.push(region);
    const previous=D.TIER_SCALE[D.TIER_SCALE.length-1];D.TIER_SCALE.push({hp:previous.hp+0.4,dmg:previous.dmg+0.15,spd:previous.spd+0.01,obols:previous.obols+0.32});
    D.CAMPAIGN_STORY.push({id:id==='atlantis'?'atlantis-tide-oath':'roads-of-the-living',title:id==='atlantis'?'THE CITY BENEATH THE OATH':'THE ROADS STILL REMEMBER',intro:desc,
      voices:[{name:id==='atlantis'?'Poseidon':'Hermes',title:id==='atlantis'?'Lord of the Sea':'Guardian of Roads',godId:id==='atlantis'?'poseidon':'hermes',icon:'god:'+(id==='atlantis'?'poseidon':'hermes'),text:id==='atlantis'?'The city survives beneath the sea. Its promise must survive above it.':'Every road has a keeper. Walk as a guest, and the living will remember.'}],
      choices:[{id:id+'_mercy',title:'Preserve the old promise',desc:'Restore 40 life before returning.',reply:'Let this place endure.',affinity:id==='atlantis'?'poseidon':'hermes',side:'concord',heal:40},{id:id+'_witness',title:'Carry its truth onward',desc:'Receive 220 Obols for the journey.',reply:'The living will hear what happened here.',affinity:'hades',side:'defiance',obols:220}]});
  }
  addDestination('ancient_greece','ANCIENT GREECE','elysium','hecatoncheir','greece_talos','Keeper of the Living Roads','Roads, olive groves, shrines and ruined settlements connect the places remembered by the living.');
  addDestination('atlantis','ATLANTIS','aegean','scylla','atlantis_custodian','The Sealed City Under the Sea','Flooded avenues and marble terraces hold the city’s forgotten oath beneath the Aegean.');
  const profiles={};
  D.REGIONS.forEach((region,index)=>{
    region.mythology='greek';region.worldProfile=region.id;region.act=index<8?1:index<16?2:3;
    region.actMilestone=region.id==='mourning'?'actI':region.id==='delphi'?'actII':null;region.campaignFinal=region.id==='typhon_core';
    region.nextRegionId=index<23?D.REGIONS[index+1].id:null;
    const family=families[region.id]||'ruins',materials=familySubzones[family],signature=signatureArt[region.id]||['regionlandmark.02',15];
    profiles[region.id]={id:region.id,name:region.name,regionArtId:region.id,assetKit:family,signatureAssetId:signature[0],signatureCell:signature[1],signatureNodeId:'main-7',family,artFamily:region.artFamily||aliases[region.id]||region.id,worldScale:5,accent:region.accent,ground:region.floor,wall:region.wall,...terrainProgram(region.id,region.accent),
      boundary:family==='river'?'water':family==='lava'?'lava':family==='terraces'?'cliff':'wall',hazard:family==='river'?'current':family==='lava'?'heat':family==='storm'||family==='terraces'?'storm':'thorns',
      landmarks:regionalLandmarks[region.id],signatureLandmark:regionalLandmarks[region.id][0],subzones:materials.map((item,i)=>({id:item[0],material:item[1],landmark:regionalLandmarks[region.id][i],landmarkCell:12+i%4}))};
  });
  profiles.charon_market={id:'charon_market',name:'CHARON’S MARKET',regionArtId:'charon_market',assetKit:'river',signatureAssetId:'regionlandmark.02',signatureCell:10,signatureNodeId:'vendor',family:'river',artFamily:'styx',worldScale:1,accent:'#b8a366',ground:'#172728',wall:'#344644',boundary:'water',hazard:null,...terrainProgram('charon_market','#b8a366'),landmarks:['Ferry Landing','Charon’s Stall','Lamp Dock'],signatureLandmark:'Charon’s Stall',subzones:[{id:'landing',material:'river_shallows',landmark:'Ferry Landing',landmarkCell:12},{id:'stall',material:'river_silt',landmark:'Charon’s Stall',landmarkCell:15},{id:'lamps',material:'river_saltstone',landmark:'Lamp Dock',landmarkCell:14}]};
  profiles.practice={id:'practice',name:'THE TRAINING GROUNDS',regionArtId:'practice',assetKit:'ruins',signatureAssetId:'regionlandmark.02',signatureCell:11,signatureNodeId:'training',family:'ruins',artFamily:'tartarus',worldScale:1,accent:'#b8ad90',ground:'#28231b',wall:'#4a4032',boundary:'wall',hazard:null,...terrainProgram('practice','#b8ad90'),landmarks:['Training Court'],signatureLandmark:'Training Court',subzones:[{id:'court',material:'ruins_marble',landmark:'Training Court',landmarkCell:13},{id:'gallery',material:'ruins_mosaic',landmark:'Training Court',landmarkCell:14},{id:'yard',material:'ruins_fallen',landmark:'Training Court',landmarkCell:15}]};
  D.WORLD_PROFILES=profiles;W.PROFILES=profiles;
  if(D.CONTENT_COUNTS){D.CONTENT_COUNTS.regions=D.REGIONS.length;D.CONTENT_COUNTS.bosses=Object.keys(D.BOSSES).length;D.CONTENT_COUNTS.campaignStoryChapters=D.CAMPAIGN_STORY.length;D.CONTENT_COUNTS.campaignChambers=D.REGIONS.length*8;}
  const coord=(value,size)=>Math.round(value/size);
  const key=(x,y)=>x+','+y;
  W.cellKey=(x,y,size)=>key(coord(x,size||W.TILE_SIZE),coord(y,size||W.TILE_SIZE));
  const indexes=new WeakMap(),blockerIndexes=new WeakMap();
  function index(map){let cells=indexes.get(map);if(!cells){cells=Object.create(null);for(const cell of map.cells)cells[W.cellKey(cell.x,cell.y,map.tileSize)]=cell;indexes.set(map,cells);}return cells;}
  W.cellAt=(map,x,y)=>index(map)[W.cellKey(x,y,map.tileSize)]||null;
  function blockerIndex(map){
    let state=blockerIndexes.get(map);if(state&&state.source===map.blockers)return state.bins;
    const span=(map.tileSize||W.TILE_SIZE)*8,bins=Object.create(null);
    for(const b of map.blockers||[]){for(let cx=Math.floor(b.x/span);cx<=Math.floor((b.x+b.w)/span);cx++)for(let cy=Math.floor(b.y/span);cy<=Math.floor((b.y+b.h)/span);cy++){const id=cx+','+cy;(bins[id]||(bins[id]=[])).push(b);}}
    state={source:map.blockers,bins,span};blockerIndexes.set(map,state);return bins;
  }
  W.isWalkable=function(map,x,y,radius){
    if(!map||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const r=Math.max(0,Number(radius)||0),s=map.tileSize,half=s/2;
    const xmin=Math.floor((x-r+half)/s),xmax=Math.floor((x+r+half-0.001)/s),ymin=Math.floor((y-r+half)/s),ymax=Math.floor((y+r+half-0.001)/s),cells=index(map);
    for(let cx=xmin;cx<=xmax;cx++)for(let cy=ymin;cy<=ymax;cy++){const cell=cells[key(cx,cy)];if(!cell||!cell.walkable)return false;}
    const bins=blockerIndex(map),span=(map.tileSize||W.TILE_SIZE)*8,cx0=Math.floor((x-r)/span),cx1=Math.floor((x+r)/span),cy0=Math.floor((y-r)/span),cy1=Math.floor((y+r)/span);
    for(let cx=cx0;cx<=cx1;cx++)for(let cy=cy0;cy<=cy1;cy++)for(const b of bins[cx+','+cy]||[]){const nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h));if((x-nx)**2+(y-ny)**2<r*r || (r===0&&x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h))return false;}
    return true;
  };
  W.nearestWalkable=function(map,x,y,radius,bounds){
    if(W.isWalkable(map,x,y,radius)&&(!bounds||inside(bounds,x,y,radius)))return{x,y};
    let nearest=null,best=Infinity;
    for(const cell of map.cells){if(!cell.walkable||bounds&&!inside(bounds,cell.x,cell.y,radius))continue;const d=(cell.x-x)**2+(cell.y-y)**2;if(d>=best||!W.isWalkable(map,cell.x,cell.y,radius))continue;nearest={x:cell.x,y:cell.y};best=d;}
    return nearest||{x:map.entry.x,y:map.entry.y};
  };
  function inside(b,x,y,r){return x>=b.x+r&&y>=b.y+r&&x<=b.x+b.w-r&&y<=b.y+b.h-r;}
  W.resolveMove=function(map,entity,previous,bounds){
    const r=Math.max(1,entity.radius||12),goal={x:entity.x,y:entity.y};
    let from=previous&&W.isWalkable(map,previous.x,previous.y,r)?previous:W.nearestWalkable(map,goal.x,goal.y,r,bounds);
    const distance=Math.hypot(goal.x-from.x,goal.y-from.y),steps=Math.min(320,Math.max(1,Math.ceil(distance/(map.tileSize*0.3))));
    let x=from.x,y=from.y;
    for(let i=1;i<=steps;i++){
      const tx=from.x+(goal.x-from.x)*i/steps,ty=from.y+(goal.y-from.y)*i/steps;
      if(W.isWalkable(map,tx,ty,r)&&(!bounds||inside(bounds,tx,ty,r))){x=tx;y=ty;}
      else if(W.isWalkable(map,tx,y,r)&&(!bounds||inside(bounds,tx,y,r))){x=tx;entity.vy=0;}
      else if(W.isWalkable(map,x,ty,r)&&(!bounds||inside(bounds,x,ty,r))){y=ty;entity.vx=0;}
      else{entity.vx=0;entity.vy=0;break;}
    }
    entity.x=x;entity.y=y;return{x,y};
  };
  W.reveal=function(map,x,y,radius){
    const r=radius||720,r2=r*r;let changed=false;
    const s=map.tileSize||W.TILE_SIZE,cells=index(map);
    const cx0=Math.floor((x-r)/s),cx1=Math.floor((x+r)/s),cy0=Math.floor((y-r)/s),cy1=Math.floor((y+r)/s);
    for(let cx=cx0;cx<=cx1;cx++)for(let cy=cy0;cy<=cy1;cy++){
      const id=cx+','+cy,cell=cells[id];if(!cell)continue;
      if((cell.x-x)**2+(cell.y-y)**2>r2)continue;
      if(!map.revealed[id]){map.revealed[id]=true;changed=true;}
    }
    for(const node of map.nodes)if((node.x-x)**2+(node.y-y)**2<=r2)node.discovered=true;
    if(changed)map.revealRevision++;return changed;
  };
  W.indexPlacedArt=function(map){
    const size=map.artChunkSize||1024,bins=Object.create(null);
    function add(item,kind){const x=Math.floor(item.x/size),y=Math.floor(item.y/size),id=x+','+y;let chunk=bins[id];if(!chunk)chunk=bins[id]={id,x,y,props:[],terrain:[]};chunk[kind].push(item);}
    for(const prop of map.props||[])add(prop,'props');
    for(const overlay of map.terrainOverlays||[])add(overlay,'terrain');
    map.artChunkSize=size;map.artChunkIndex=bins;map.artChunkCount=Object.keys(bins).length;return map.artChunkCount;
  };
  W.validate=function(map){
    const errors=[],cells=index(map),visited=new Set(),queue=[W.cellKey(map.entry.x,map.entry.y,map.tileSize)],start=cells[queue[0]];
    if(!start||!start.walkable)errors.push('Entry is blocked');
    if(start&&start.walkable)visited.add(queue[0]);
    for(let cursor=0;cursor<queue.length;cursor++){const parts=queue[cursor].split(',').map(Number);for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const id=key(parts[0]+d[0],parts[1]+d[1]);if(!visited.has(id)&&cells[id]&&cells[id].walkable){visited.add(id);queue.push(id);}}}
    for(const node of map.nodes){if(!visited.has(W.cellKey(node.x,node.y,map.tileSize)))errors.push('Unreachable '+node.id);if(!W.isWalkable(map,node.x,node.y,32))errors.push('No clearance '+node.id);if(node.main&&['combat','boss','elite','challenge','risk','treasure'].includes(node.type)){const b=node.bounds;for(const dx of [-400,0,400])for(const dy of [-260,0,260])if(!W.isWalkable(map,node.x+dx,node.y+dy,32))errors.push('Encounter space '+node.id);if(!b||b.w<1100||b.h<800)errors.push('Small encounter '+node.id);}}
    for(const feature of map.terrainFeatures||[]){if(!feature.id||!Number.isFinite(feature.x)||!Number.isFinite(feature.y)||!(feature.w>0)||!(feature.h>0))errors.push('Invalid terrain feature '+(feature.id||'unknown'));if(feature.transition){if(!Number.isFinite(feature.transition.fromElevation)||!Number.isFinite(feature.transition.toElevation))errors.push('Invalid terrain transition '+feature.id);if(!W.isWalkable(map,feature.x,feature.y,8))errors.push('Unreachable terrain transition '+feature.id);}}
    if(D.REGIONS.some(region=>region.id===map.regionId)&&!(map.terrainFeatures||[]).some(feature=>feature.transition))errors.push('Missing regional traversal terrain');
    for(const hazard of map.hazards)if(map.nodes.some(n=>Math.hypot(n.x-hazard.x,n.y-hazard.y)<100)||(Math.hypot(map.entry.x-hazard.x,map.entry.y-hazard.y)<200))errors.push('Unsafe hazard placement');
    return{valid:errors.length===0,errors,reachableCells:visited.size};
  };
  W.generate=function(options){
    options=options||{};const version=options.version===undefined?W.VERSION:options.version;
    if(version!==W.VERSION)throw new Error('Unsupported world generator version '+version);
    const profile=profiles[options.regionId];if(!profile)throw new Error('Unknown world region '+options.regionId);
    const seed=Number(options.seed)>>>0,modifiers=options.modifiers||{},mirror=options.mirrorOptions||{},rng=new K.RNG(hash(seed+':'+profile.id+':'+version+':'+(options.shopNodeId||'')+':'+canonical(modifiers)+':'+canonical(mirror))),artRng=new K.RNG(hash(seed+':'+profile.id+':'+version+':world-art'));const terrainRng=new K.RNG(hash(seed+':'+profile.id+':'+version+':terrain-art'));
    const scale=profile.worldScale||1,map={version,seed,regionId:profile.id,regionArtId:profile.regionArtId||profile.id,profile:clone(profile),worldScale:scale,groundAssetId:'regionground.'+profile.assetKit,tileSize:W.TILE_SIZE,modifierSignature:canonical(modifiers),nodes:[],edges:[],cells:[],props:[],terrainOverlays:[],terrainFeatures:[],subzones:[],blockers:[],hazards:[],revealed:{},revealRevision:0,chapterResolved:false};
    const carved=Object.create(null),s=map.tileSize;
    function materialAt(){return profile.subzones[0].material;}
    function tile(cx,cy,kind,height,material){const id=key(cx,cy),m=material||materialAt(cx*s,cy*s);carved[id]={x:cx*s,y:cy*s,kind:kind||'ground',height:height||0,walkable:true,material:m,artKey:profile.regionArtId+'.terrain.'+m};}
    function rectangle(x,y,w,h,height,material){for(let cx=Math.ceil((x-w/2)/s);cx<=Math.floor((x+w/2)/s);cx++)for(let cy=Math.ceil((y-h/2)/s);cy<=Math.floor((y+h/2)/s);cy++)tile(cx,cy,'ground',height,material);}
    function corridor(points,width,material){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/(s*0.6)));for(let n=0;n<=steps;n++){const t=n/steps;rectangle(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,width,width,0,material);}}}
    function obstacle(id,x,y,zone,kind,cell,size,solid,assetId){const artCell=cell===undefined?artRng.int(8,11):cell,artKey=kind==='landmark'?profile.regionArtId+'.landmark.'+String(zone.landmark).toLowerCase().replace(/[^a-z0-9]+/g,'-'):profile.regionArtId+'.obstacles.'+(kind||'scenery'),item={id,x,y,cell:artCell,brokenCell:artCell,assetId:assetId||'regionkit.'+profile.assetKit,kind:kind||'scenery',size:size||artRng.int(110,190),height:40,scale:1,depthY:y,solid:!!solid,destructible:!!solid,hp:solid?2:0,interactive:false,interaction:null,landmark:zone.landmark,material:zone.material,artKey,visualState:solid?'intact':'decorative'};map.props.push(item);if(solid){item.collision={x:x-26,y:y-26,w:52,h:52};map.blockers.push({id,x:x-26,y:y-26,w:52,h:52});}else item.collision=null;return item;}
    function groundPatch(id,x,y,zone,cell,w,h,alpha,rot){map.terrainOverlays.push({id,kind:'ground-surface',assetId:map.groundAssetId,artKey:profile.regionArtId+'.ground.'+zone.material,cell,material:zone.material,x,y,w,h,depthY:y,alpha:alpha===undefined?0.94:alpha,rot:rot||0,solid:false,collision:null,walkable:true,interactive:false,regionArtId:profile.regionArtId});}
    const terrainArtCell={basin:0,ridge:1,ravine:2,channel:3,island:4,terrace:5,rootbank:6,ruins:7,shelf:8,bank:9,ramp:10,stair:11,bridge:12,causeway:13};
    function addTerrainFeature(id,kind,x,y,w,h,zone,elevation,transition){const feature={id,kind,shape:profile.terrain.shape,x,y,w,h,elevation,material:zone.material,surface:profile.terrain.surface,walkable:!!transition,cell:terrainArtCell[kind]===undefined?14:terrainArtCell[kind],assetId:'regionterrain.'+profile.assetKit,depthY:y+h*0.5,transition:transition?{kind:transition,fromElevation:0,toElevation:Math.max(16,elevation||24)}:null};map.terrainFeatures.push(feature);return feature;}
    function composeTerrain(n,zone){
      const forms=profile.terrain.landforms||['ridge','basin','ruins'],ring=scale>1?1180*scale:420,baseAngle=terrainRng.range(0,Math.PI*2);
      for(let i=0;i<forms.length;i++){
        const angle=baseAngle+i*Math.PI*2/forms.length,radius=ring+terrainRng.int(-2,2)*80*scale,x=n.x+Math.cos(angle)*radius,y=n.y+Math.sin(angle)*radius,w=(terrainRng.int(250,420))*scale,h=(terrainRng.int(180,320))*scale,material=profile.subzones[(n.idx+i)%profile.subzones.length];
        addTerrainFeature(n.id+':landform-'+i,forms[i],Math.round(x/s)*s,Math.round(y/s)*s,w,h,material,terrainRng.int(1,3)*16,null);
      }
      const side=n.idx%2?-1:1,transitionKind=profile.terrain.traversal,x=n.x+side*520*scale,y=n.y+240*scale;
      addTerrainFeature(n.id+':traversal',transitionKind,Math.round(x/s)*s,Math.round(y/s)*s,360*scale,200*scale,zone,24,transitionKind);
    }
    function scatterGround(n,zone){
      const sites=[];
      if(scale>1){
        for(const dy of [-1500,-500,500,1500])for(const dx of [-2100,-700,700,2100])if(!(Math.abs(dx)<1000&&Math.abs(dy)<900))sites.push([dx,dy]);
      }else if(profile.id==='practice'){
        for(const dy of [-500,0,500])for(const dx of [-650,0,650])if(dx||dy)sites.push([dx,dy]);
      }else{
        for(const dy of [-230,230])for(const dx of [-350,350])sites.push([dx,dy]);
      }
      for(let i=0;i<sites.length;i++){
        const [dx,dy]=sites[i],large=scale>1,w=large?terrainRng.int(980,1160):terrainRng.int(450,520),h=large?terrainRng.int(760,920):terrainRng.int(340,420);
        groundPatch(n.id+':ground-'+i,n.x+dx,n.y+dy,zone,terrainRng.int(0,15),w,h,large?0.97:0.92,terrainRng.int(0,3)*Math.PI/2);
      }
      if(scale>1&&['boss','elite','challenge'].includes(n.type))groundPatch(n.id+':arena-inlay',n.x,n.y,zone,terrainRng.pick([2,6,10,14]),1000,760,0.9,0);
    }
    function dressPath(from,to,points){
      if(scale<=1)return;
      let placed=0;
      for(let seg=1;seg<points.length;seg++){
        const a=points[seg-1],b=points[seg],length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.floor(length/2600);
        for(let j=0;j<count;j++){
          const t=(j+1)/(count+1),px=a.x+(b.x-a.x)*t,py=a.y+(b.y-a.y)*t;
          if(map.nodes.some(n=>n.main&&Math.hypot(n.x-px,n.y-py)<1400))continue;
          const horizontal=Math.abs(b.x-a.x)>Math.abs(b.y-a.y),side=placed++%2?1:-1,lateral=side*280,zone=profile.subzones[to.idx%profile.subzones.length];
          groundPatch(from.id+':path-ground-'+to.idx+'-'+placed,px+(horizontal?0:lateral),py+(horizontal?lateral:0),zone,terrainRng.int(0,15),640,500,0.9,terrainRng.int(0,3)*Math.PI/2);
        }
      }
    }
    function node(id,type,x,y,idx,main){x=coord(x,s)*s;y=coord(y,s)*s;const zone=profile.subzones[Math.abs(idx)%profile.subzones.length],isSignature=id===profile.signatureNodeId,landmark=isSignature?profile.signatureLandmark:zone.landmark,cell=isSignature?profile.signatureCell:zone.landmarkCell||12+idx%4,landmarkAssetId=isSignature?profile.signatureAssetId:'regionkit.'+profile.assetKit,seed=hash(profile.id),rotation=((seed>>>((idx%4)*3))&3)*Math.PI/2,n={id:profile.id+':'+id,type,x,y,idx,main:!!main,status:'pending',rewardClaimed:false,discovered:false,landmark:isSignature?profile.signatureLandmark:rng.pick(profile.landmarks),signatureLandmark:landmark,signature:isSignature,signatureCell:cell,subzoneId:zone.id,material:zone.material,artKey:profile.regionArtId+'.landmark.'+String(landmark).toLowerCase().replace(/[^a-z0-9]+/g,'-'),landmarkAssetId,bounds:{x:x-600,y:y-440,w:1200,h:880},terrainBounds:{x:x-600*scale,y:y-440*scale,w:1200*scale,h:880*scale}};map.nodes.push(n);map.subzones.push({id:n.id,subzoneId:zone.id,material:zone.material,artKey:profile.regionArtId+'.terrain.'+zone.material,assetId:'regionkit.'+profile.assetKit,bounds:n.terrainBounds,landmark});rectangle(x,y,1200*scale,880*scale,profile.family==='terraces'?(main?idx%4:1)*16:0,zone.material);scatterGround(n,zone);composeTerrain(n,zone);map.terrainOverlays.push({id:n.id+':transition',kind:'terrain-transition',assetId:'regionkit.'+profile.assetKit,artKey:profile.regionArtId+'.terrain.'+zone.material,cell:Math.abs(hash(profile.id+n.id))%8,material:zone.material,x:n.x,y:n.y-scale*420,w:380,h:300,depthY:n.y-scale*420+150,alpha:0.9,regionArtId:profile.regionArtId});if(idx===0||isSignature||!main){const item=obstacle(n.id+':landmark',x+520,y+300,{id:zone.id,material:zone.material,landmark},'landmark',cell,isSignature?340:250,false,isSignature?profile.signatureAssetId:null);item.rot=rotation;item.scale=isSignature?1.18:1;}return n;}
    function edge(from,to,optional){let points=[{x:from.x,y:from.y}];const horizontal=rng.chance(0.5);points.push(horizontal?{x:to.x,y:from.y}:{x:from.x,y:to.y});points.push({x:to.x,y:to.y});const width=(optional&&modifiers.flooding?240:320)*scale;corridor(points,width,to.material);dressPath(from,to,points);map.edges.push({from:from.id,to:to.id,optional:!!optional,path:points});if(scale>1){let placed=0;for(let seg=1;seg<points.length;seg++){const a=points[seg-1],b=points[seg],length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(0,Math.floor(length/420)-4);for(let j=0;j<count;j++){const t=(j+2)/(count+3),px=a.x+(b.x-a.x)*t,py=a.y+(b.y-a.y)*t;if(map.nodes.some(n=>n.main&&Math.hypot(n.x-px,n.y-py)<1050))continue;const horizontalSegment=Math.abs(b.x-a.x)>Math.abs(b.y-a.y),side=(placed++%2?1:-1),lateral=side*(340+artRng.int(0,3)*50);obstacle(from.id+':edge-'+to.idx+'-'+placed,px+(horizontalSegment?0:lateral),py+(horizontalSegment?lateral:0),profile.subzones[to.idx%profile.subzones.length],artRng.chance(0.55)?'solid':'debris',undefined,artRng.int(90,180),artRng.chance(0.66));}}}}
    if(profile.id==='practice'){
      const n=node('training','practice',0,0,0,true);rectangle(0,0,2000,1600,0);map.entry={x:0,y:240};map.capstone=n;
    }else if(profile.id==='charon_market'){
      const landing=node('landing','marketReturn',0,320,0,true),vendor=node('vendor','vendor',0,-1040,1,true),left=node('stores','wares',-1120,-1040,2,false),right=node('ferry','wares',1120,-1040,3,false);
      edge(landing,vendor,false);edge(vendor,left,true);edge(vendor,right,true);edge(left,landing,true);edge(right,landing,true);map.entry={x:0,y:320};map.capstone=landing;map.safe=true;
    }else{
      const beats=['combat','elite','treasure','recovery','event','challenge','combat','boss'],main=[];let x=0,y=0;
      for(let i=0;i<8;i++){
        if(i){if(i%2===1)y-=(1440+rng.int(0,3)*80)*scale;else x+=(1520+rng.int(0,3)*80)*scale;}
        const n=node('main-'+i,beats[i],x,y,i,true);n.requires=i?main[i-1].id:null;
        if(i===4){n.eventId=rng.pick(D.ROOM_EVENTS).id;n.routeNode={type:'event',eventId:n.eventId};}
        main.push(n);if(i)edge(main[i-1],n,false);
      }
      map.entry={x:main[0].x,y:main[0].y+240*scale};map.capstone=main[7];
      const choice=node('fork-risk','risk',main[2].x-1840*scale,main[2].y-160*scale,2,false);choice.requires=main[1].id;choice.alternativeFor=main[2].id;choice.landmark='Blood-Tithe Altar';edge(main[1],choice,true);edge(choice,main[3],true);
      const shop=node('shop','shop',main[3].x-1520*scale,main[3].y+160*scale,3,false);shop.requires=main[2].id;edge(main[3],shop,true);edge(shop,main[4],true);
      const count=Math.max(0,Math.min(5,2+(Number(modifiers.sidePaths)||0)));
      for(let i=0;i<count;i++){const anchor=main[Math.min(6,i+2)],side=node('secret-'+i,i>=2?'miniboss':i%2?'miniboss':'cache',anchor.x+1680*scale,anchor.y+640*scale,anchor.idx,false);side.requires=anchor.id;side.rewardAmount=70+anchor.idx*12;edge(anchor,side,true);}
      if(mirror.routeBias==='shop'||mirror.routeBias==='treasure'){const anchor=main[5],favored=node('wayfinder-'+mirror.routeBias,mirror.routeBias,anchor.x-1760*scale,anchor.y-160*scale,5,false);favored.requires=anchor.id;favored.landmark='Wayfinder’s Chosen Road';edge(anchor,favored,true);}
      for(let i=0;i<Math.max(0,Math.min(2,Number(modifiers.recoveryNodes)||0));i++){const anchor=main[i+3],spring=node('spring-'+i,'recovery',anchor.x-1280*scale,anchor.y+640*scale,anchor.idx,false);spring.requires=anchor.id;edge(anchor,spring,true);}
      const npcs={styx:['charon'],acheron:['charon'],elysium:['achilles'],olympus:['achilles','zeus'],mourning:['orpheus'],lethe_garden:['orpheus'],aeaea:['circe'],atlantis:['circe','poseidon'],forge:['hephaestus'],delphi:['apollo'],ancient_greece:['hermes','athena']};
      if(npcs[profile.id]){const anchor=main[3],npc=node('story','npc',anchor.x+1440*scale,anchor.y+160*scale,3,false);npc.characterIds=npcs[profile.id];npc.requires=main[2].id;edge(anchor,npc,true);}
      for(const n of main.filter(n=>n.idx>0&&n.idx<7)){
        const corners=[[-480,-320],[480,-320]];for(const [dx,dy] of corners)obstacle(n.id+':prop-'+dx,n.x+dx,n.y+dy,{id:n.subzoneId,material:n.material,landmark:n.landmark},'solid',undefined,rng.int(90,150),true);
        if(profile.hazard&&n.idx!==3)map.hazards.push({id:n.id+':hazard-0',nodeId:n.id,x:n.x+420,y:n.y-280,radius:45,kind:profile.hazard,dmg:6,period:3.8,telegraph:1.2});
      }
      const optional=map.nodes.filter(n=>!n.main&&!['npc','shop'].includes(n.type)),extraHazards=Math.max(0,Math.ceil(6*((Number(modifiers.hazardDensity)||1)-1)));
      for(let i=0;i<extraHazards&&optional.length;i++){const n=optional[i%optional.length];map.hazards.push({id:n.id+':altar-'+i,nodeId:n.id,x:n.x+(i%2?-360:360),y:n.y-280,radius:48,kind:profile.hazard,dmg:7,period:3.8,telegraph:1.2});}
      if(modifiers.flooding)for(const n of optional)map.hazards.push({id:n.id+':flood',nodeId:n.id,x:n.x+320,y:n.y+260,radius:55,kind:'current',dmg:4+Math.min(3,Number(modifiers.flooding))*2,period:4.2,telegraph:1.4});
      // River channels cut through the terrain; narrow bridges retain the protected route.
      if(profile.family==='river')for(const n of main.filter(n=>n.idx%2===1))for(let dx=-560*scale;dx<=560*scale;dx+=80*scale)for(const dy of [520,600,680].map(v=>v*scale)){const cx=coord(n.x+dx,s),cy=coord(n.y+dy,s);if(Math.abs(dx)<=160*scale)tile(cx,cy,'bridge',12,n.material);else carved[key(cx,cy)]={x:cx*s,y:cy*s,kind:'water',height:-12,walkable:false,material:'river_shallows',artKey:profile.regionArtId+'.terrain.river_shallows'};}
    }
    // Encounter pockets stay open even when a river crosses the approach. Bridge banks are peripheral.
    for(const n of map.nodes.filter(n=>n.main))for(const dx of [-400,0,400])for(const dy of [-260,0,260])rectangle(n.x+dx,n.y+dy,160,160,profile.family==='terraces'?n.idx%4*16:0,n.material);
    const walkable=Object.values(carved).filter(c=>c.walkable);
    for(const c of walkable){const cx=coord(c.x,s),cy=coord(c.y,s);for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const id=key(cx+d[0],cy+d[1]);if(!carved[id])carved[id]={x:(cx+d[0])*s,y:(cy+d[1])*s,kind:profile.boundary,height:profile.boundary==='water'||profile.boundary==='lava'?-20:64,walkable:false,material:c.material,artKey:profile.regionArtId+'.boundary.'+profile.boundary};}}
    map.cells=Object.values(carved).sort((a,b)=>a.y-b.y||a.x-b.x);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const cell of map.cells){if(cell.x<minX)minX=cell.x;if(cell.y<minY)minY=cell.y;if(cell.x>maxX)maxX=cell.x;if(cell.y>maxY)maxY=cell.y;}minX-=s/2;minY-=s/2;maxX+=s/2;maxY+=s/2;
    map.bounds={x:minX,y:minY,w:maxX-minX,h:maxY-minY};map.cols=Math.ceil(map.bounds.w/s);map.rows=Math.ceil(map.bounds.h/s);
    const result=W.validate(map);
    // Repair guarantees when regional material passes touch encounter approaches.
    if(!result.valid){for(const n of map.nodes)rectangle(n.x,n.y,1200,880,0);for(const e of map.edges)corridor(e.path,320);map.cells=Object.values(carved).sort((a,b)=>a.y-b.y||a.x-b.x);indexes.delete(map);const repaired=W.validate(map);if(!repaired.valid)throw new Error('World validation failed: '+repaired.errors.join('; '));map.repaired=true;}
    W.indexPlacedArt(map);
    return map;
  };
  K.World=W;
})();
