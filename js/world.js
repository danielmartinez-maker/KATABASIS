/* Seeded topology, tiled terrain and simulation geometry. No renderer objects or combat RNG. */
(function () {
  'use strict';
  const K=window.K,D=K.DATA,W={VERSION:1,TILE_SIZE:80};
  if(K.World)return;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const aliases={acheron:'styx',lethe_garden:'mourning',knossos:'labyrinth',aeaea:'aegean',colchis:'aegean',typhon_core:'gigantomachy',delphi:'olympus_approach',pelion:'elysium',arcadia:'asphodel',thebes:'labyrinth',marathon:'gigantomachy',mycenae:'forge'};
  const families={tartarus:'ash',styx:'river',acheron:'river',asphodel:'grove',punishment:'lava',lethe_garden:'grove',elysium:'fields',mourning:'fields',forge:'lava',labyrinth:'ruins',knossos:'ruins',aegean:'river',aeaea:'grove',colchis:'river',gigantomachy:'storm',delphi:'terraces',pelion:'grove',arcadia:'grove',thebes:'ruins',marathon:'fields',mycenae:'ruins',olympus_approach:'terraces',olympus:'terraces',typhon_core:'lava',ancient_greece:'fields',atlantis:'river'};
  const landmarks={ash:['Chained Gate','Ash Watchtower','Buried Tribunal'],river:['Ferry Crossing','Drowned Colonnade','Current Channel'],grove:['Sacred Grove','Rooted Shrine','Memory Orchard'],fields:['Heroic Memorial','Laurel Arena','Broken Colonnade'],lava:['Bronze Foundry','Chain Winch','Molten Fault'],ruins:['Turning Hall','Pillar Court','Royal Gate'],storm:['Titan Rampart','Storm Beacon','War Memorial'],terraces:['Cloud Bridge','Divine Hall','Ascending Terrace']};
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
    const family=families[region.id]||'ruins';
    profiles[region.id]={id:region.id,name:region.name,family,artFamily:region.artFamily||aliases[region.id]||region.id,accent:region.accent,ground:region.floor,wall:region.wall,
      boundary:family==='river'?'water':family==='lava'?'lava':family==='terraces'?'cliff':'wall',hazard:family==='river'?'current':family==='lava'?'heat':family==='storm'||family==='terraces'?'storm':'thorns',landmarks:landmarks[family]};
  });
  profiles.charon_market={id:'charon_market',name:'CHARON’S MARKET',family:'river',artFamily:'styx',accent:'#b8a366',ground:'#172728',wall:'#344644',boundary:'water',hazard:null,landmarks:['Ferry Landing','Charon’s Stall','Lamp Dock']};
  profiles.practice={id:'practice',name:'THE TRAINING GROUNDS',family:'ruins',artFamily:'tartarus',accent:'#b8ad90',ground:'#28231b',wall:'#4a4032',boundary:'wall',hazard:null,landmarks:['Training Court']};
  D.WORLD_PROFILES=profiles;W.PROFILES=profiles;
  if(D.CONTENT_COUNTS){D.CONTENT_COUNTS.regions=D.REGIONS.length;D.CONTENT_COUNTS.bosses=Object.keys(D.BOSSES).length;D.CONTENT_COUNTS.campaignStoryChapters=D.CAMPAIGN_STORY.length;D.CONTENT_COUNTS.campaignChambers=D.REGIONS.length*8;}
  const coord=(value,size)=>Math.round(value/size);
  const key=(x,y)=>x+','+y;
  W.cellKey=(x,y,size)=>key(coord(x,size||W.TILE_SIZE),coord(y,size||W.TILE_SIZE));
  const indexes=new WeakMap();
  function index(map){let cells=indexes.get(map);if(!cells){cells=Object.create(null);for(const cell of map.cells)cells[W.cellKey(cell.x,cell.y,map.tileSize)]=cell;indexes.set(map,cells);}return cells;}
  W.cellAt=(map,x,y)=>index(map)[W.cellKey(x,y,map.tileSize)]||null;
  W.isWalkable=function(map,x,y,radius){
    if(!map||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const r=Math.max(0,Number(radius)||0),s=map.tileSize,half=s/2;
    const xmin=Math.floor((x-r+half)/s),xmax=Math.floor((x+r+half-0.001)/s),ymin=Math.floor((y-r+half)/s),ymax=Math.floor((y+r+half-0.001)/s),cells=index(map);
    for(let cx=xmin;cx<=xmax;cx++)for(let cy=ymin;cy<=ymax;cy++){const cell=cells[key(cx,cy)];if(!cell||!cell.walkable)return false;}
    for(const b of map.blockers||[]){const nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h));if((x-nx)**2+(y-ny)**2<r*r || (r===0&&x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h))return false;}
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
  W.validate=function(map){
    const errors=[],cells=index(map),visited=new Set(),queue=[W.cellKey(map.entry.x,map.entry.y,map.tileSize)],start=cells[queue[0]];
    if(!start||!start.walkable)errors.push('Entry is blocked');
    if(start&&start.walkable)visited.add(queue[0]);
    for(let cursor=0;cursor<queue.length;cursor++){const parts=queue[cursor].split(',').map(Number);for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const id=key(parts[0]+d[0],parts[1]+d[1]);if(!visited.has(id)&&cells[id]&&cells[id].walkable){visited.add(id);queue.push(id);}}}
    for(const node of map.nodes){if(!visited.has(W.cellKey(node.x,node.y,map.tileSize)))errors.push('Unreachable '+node.id);if(!W.isWalkable(map,node.x,node.y,32))errors.push('No clearance '+node.id);if(node.main&&['combat','boss','elite','challenge','risk','treasure'].includes(node.type)){const b=node.bounds;for(const dx of [-400,0,400])for(const dy of [-260,0,260])if(!W.isWalkable(map,node.x+dx,node.y+dy,32))errors.push('Encounter space '+node.id);if(!b||b.w<1100||b.h<800)errors.push('Small encounter '+node.id);}}
    for(const hazard of map.hazards)if(map.nodes.some(n=>Math.hypot(n.x-hazard.x,n.y-hazard.y)<100)||(Math.hypot(map.entry.x-hazard.x,map.entry.y-hazard.y)<200))errors.push('Unsafe hazard placement');
    return{valid:errors.length===0,errors,reachableCells:visited.size};
  };
  W.generate=function(options){
    options=options||{};const version=options.version===undefined?W.VERSION:options.version;
    if(version!==W.VERSION)throw new Error('Unsupported world generator version '+version);
    const profile=profiles[options.regionId];if(!profile)throw new Error('Unknown world region '+options.regionId);
    const seed=Number(options.seed)>>>0,modifiers=options.modifiers||{},mirror=options.mirrorOptions||{},rng=new K.RNG(hash(seed+':'+profile.id+':'+version+':'+(options.shopNodeId||'')+':'+canonical(modifiers)+':'+canonical(mirror)));
    const map={version,seed,regionId:profile.id,profile:clone(profile),tileSize:W.TILE_SIZE,modifierSignature:canonical(modifiers),nodes:[],edges:[],cells:[],props:[],blockers:[],hazards:[],revealed:{},revealRevision:0,chapterResolved:false};
    const carved=Object.create(null),s=map.tileSize;
    function tile(cx,cy,kind,height){const id=key(cx,cy);carved[id]={x:cx*s,y:cy*s,kind:kind||'ground',height:height||0,walkable:true};}
    function rectangle(x,y,w,h,height){for(let cx=Math.ceil((x-w/2)/s);cx<=Math.floor((x+w/2)/s);cx++)for(let cy=Math.ceil((y-h/2)/s);cy<=Math.floor((y+h/2)/s);cy++)tile(cx,cy,'ground',height);}
    function corridor(points,width){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/(s*0.6)));for(let n=0;n<=steps;n++){const t=n/steps;rectangle(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,width,width,0);}}}
    function node(id,type,x,y,idx,main){x=coord(x,s)*s;y=coord(y,s)*s;const n={id:profile.id+':'+id,type,x,y,idx,main:!!main,status:'pending',rewardClaimed:false,discovered:false,landmark:rng.pick(profile.landmarks),bounds:{x:x-600,y:y-440,w:1200,h:880}};map.nodes.push(n);rectangle(x,y,1200,880,profile.family==='terraces'?(main?idx%4:1)*16:0);return n;}
    function edge(from,to,optional){let points=[{x:from.x,y:from.y}];const horizontal=rng.chance(0.5);points.push(horizontal?{x:to.x,y:from.y}:{x:from.x,y:to.y});points.push({x:to.x,y:to.y});corridor(points,optional&&modifiers.flooding?240:320);map.edges.push({from:from.id,to:to.id,optional:!!optional,path:points});}
    if(profile.id==='practice'){
      const n=node('training','practice',0,0,0,true);rectangle(0,0,2000,1600,0);map.entry={x:0,y:240};map.capstone=n;
    }else if(profile.id==='charon_market'){
      const landing=node('landing','marketReturn',0,320,0,true),vendor=node('vendor','vendor',0,-1040,1,true),left=node('stores','wares',-1120,-1040,2,false),right=node('ferry','wares',1120,-1040,3,false);
      edge(landing,vendor,false);edge(vendor,left,true);edge(vendor,right,true);edge(left,landing,true);edge(right,landing,true);map.entry={x:0,y:320};map.capstone=landing;map.safe=true;
    }else{
      const beats=['combat','elite','treasure','recovery','event','challenge','combat','boss'],main=[];let x=0,y=0;
      for(let i=0;i<8;i++){
        if(i){if(i%2===1)y-=1440+rng.int(0,3)*80;else x+=1520+rng.int(0,3)*80;}
        const n=node('main-'+i,beats[i],x,y,i,true);n.requires=i?main[i-1].id:null;
        if(i===4){n.eventId=rng.pick(D.ROOM_EVENTS).id;n.routeNode={type:'event',eventId:n.eventId};}
        main.push(n);if(i)edge(main[i-1],n,false);
      }
      map.entry={x:main[0].x,y:main[0].y+240};map.capstone=main[7];
      const choice=node('fork-risk','risk',main[2].x-1840,main[2].y-160,2,false);choice.requires=main[1].id;choice.alternativeFor=main[2].id;choice.landmark='Blood-Tithe Altar';edge(main[1],choice,true);edge(choice,main[3],true);
      const shop=node('shop','shop',main[3].x-1520,main[3].y+160,3,false);shop.requires=main[2].id;edge(main[3],shop,true);edge(shop,main[4],true);
      const count=Math.max(0,Math.min(5,2+(Number(modifiers.sidePaths)||0)));
      for(let i=0;i<count;i++){const anchor=main[Math.min(6,i+2)],side=node('secret-'+i,i>=2?'miniboss':i%2?'miniboss':'cache',anchor.x+1680,anchor.y+640,anchor.idx,false);side.requires=anchor.id;side.rewardAmount=70+anchor.idx*12;edge(anchor,side,true);}
      if(mirror.routeBias==='shop'||mirror.routeBias==='treasure'){const anchor=main[5],favored=node('wayfinder-'+mirror.routeBias,mirror.routeBias,anchor.x-1760,anchor.y-160,5,false);favored.requires=anchor.id;favored.landmark='Wayfinder’s Chosen Road';edge(anchor,favored,true);}
      for(let i=0;i<Math.max(0,Math.min(2,Number(modifiers.recoveryNodes)||0));i++){const anchor=main[i+3],spring=node('spring-'+i,'recovery',anchor.x-1280,anchor.y+640,anchor.idx,false);spring.requires=anchor.id;edge(anchor,spring,true);}
      const npcs={styx:['charon'],acheron:['charon'],elysium:['achilles'],olympus:['achilles','zeus'],mourning:['orpheus'],lethe_garden:['orpheus'],aeaea:['circe'],atlantis:['circe','poseidon'],forge:['hephaestus'],delphi:['apollo'],ancient_greece:['hermes','athena']};
      if(npcs[profile.id]){const anchor=main[3],npc=node('story','npc',anchor.x+1440,anchor.y+160,3,false);npc.characterIds=npcs[profile.id];npc.requires=main[2].id;edge(anchor,npc,true);}
      for(const n of main.filter(n=>n.idx>0&&n.idx<7)){
        const corners=[[-480,-320],[480,-320]];for(const [dx,dy] of corners){const id=n.id+':prop-'+dx;map.props.push({id,x:n.x+dx,y:n.y+dy,cell:rng.int(0,15),size:rng.int(90,150),height:40,solid:true,destructible:true,hp:2,landmark:n.landmark});map.blockers.push({id,x:n.x+dx-26,y:n.y+dy-26,w:52,h:52});}
        if(profile.hazard&&n.idx!==3)map.hazards.push({id:n.id+':hazard-0',nodeId:n.id,x:n.x+420,y:n.y-280,radius:45,kind:profile.hazard,dmg:6,period:3.8,telegraph:1.2});
      }
      const optional=map.nodes.filter(n=>!n.main&&!['npc','shop'].includes(n.type)),extraHazards=Math.max(0,Math.ceil(6*((Number(modifiers.hazardDensity)||1)-1)));
      for(let i=0;i<extraHazards&&optional.length;i++){const n=optional[i%optional.length];map.hazards.push({id:n.id+':altar-'+i,nodeId:n.id,x:n.x+(i%2?-360:360),y:n.y-280,radius:48,kind:profile.hazard,dmg:7,period:3.8,telegraph:1.2});}
      if(modifiers.flooding)for(const n of optional)map.hazards.push({id:n.id+':flood',nodeId:n.id,x:n.x+320,y:n.y+260,radius:55,kind:'current',dmg:4+Math.min(3,Number(modifiers.flooding))*2,period:4.2,telegraph:1.4});
      // River channels cut through the terrain; narrow bridges retain the protected route.
      if(profile.family==='river')for(const n of main.filter(n=>n.idx%2===1))for(let dx=-560;dx<=560;dx+=80)for(const dy of [520,600,680]){const cx=coord(n.x+dx,s),cy=coord(n.y+dy,s);if(Math.abs(dx)<=160)tile(cx,cy,'bridge',12);else carved[key(cx,cy)]={x:cx*s,y:cy*s,kind:'water',height:-12,walkable:false};}
    }
    // Encounter pockets stay open even when a river crosses the approach. Bridge banks are peripheral.
    for(const n of map.nodes.filter(n=>n.main))for(const dx of [-400,0,400])for(const dy of [-260,0,260])rectangle(n.x+dx,n.y+dy,160,160,profile.family==='terraces'?n.idx%4*16:0);
    const walkable=Object.values(carved).filter(c=>c.walkable);
    for(const c of walkable){const cx=coord(c.x,s),cy=coord(c.y,s);for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const id=key(cx+d[0],cy+d[1]);if(!carved[id])carved[id]={x:(cx+d[0])*s,y:(cy+d[1])*s,kind:profile.boundary,height:profile.boundary==='water'||profile.boundary==='lava'?-20:64,walkable:false};}}
    map.cells=Object.values(carved).sort((a,b)=>a.y-b.y||a.x-b.x);
    const minX=Math.min(...map.cells.map(c=>c.x))-s/2,minY=Math.min(...map.cells.map(c=>c.y))-s/2,maxX=Math.max(...map.cells.map(c=>c.x))+s/2,maxY=Math.max(...map.cells.map(c=>c.y))+s/2;
    map.bounds={x:minX,y:minY,w:maxX-minX,h:maxY-minY};map.cols=Math.ceil(map.bounds.w/s);map.rows=Math.ceil(map.bounds.h/s);
    const result=W.validate(map);
    // Repair guarantees when regional material passes touch encounter approaches.
    if(!result.valid){for(const n of map.nodes)rectangle(n.x,n.y,1200,880,0);for(const e of map.edges)corridor(e.path,320);map.cells=Object.values(carved).sort((a,b)=>a.y-b.y||a.x-b.x);indexes.delete(map);const repaired=W.validate(map);if(!repaired.valid)throw new Error('World validation failed: '+repaired.errors.join('; '));map.repaired=true;}
    return map;
  };
  K.World=W;
})();
