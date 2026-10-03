/* World simulation adapter. Existing combat and reward mechanics remain the source of truth. */
(function () {
  'use strict';
  const K=window.K,D=K.DATA,E=K.E,W=K.World,P=K.Game.prototype;
  if(K.WorldRuntime)return;
  const storyGatedDestinations={atlantis:{from:'aegean',storyGate:'sea-of-names'},ancient_greece:{from:'gigantomachy',storyGate:'wine-and-foam'}};
  const base={};
  for(const name of ['startRun','enterChamber','enterPractice','exitPractice','checkRoomClear','openExitGate','useExitGate','advance','chooseEvent','chooseStory','onBossDeath','doInteract','dropObol','collectPickup','damagePlayer','addHazard','addEnemy','spawnBoss','clampToArena','collideWithWalls','update','offerBoons'])base[name]=P[name];
  const positions=new WeakMap();
  function shift(o,x,y){if(!o)return;for(const field of ['x','homeX','x1','x2'])if(Number.isFinite(o[field]))o[field]+=x;for(const field of ['y','homeY','y1','y2'])if(Number.isFinite(o[field]))o[field]+=y;positions.delete(o);}
  function nodeFor(game,id){return game.world&&game.world.nodes.find(node=>node.id===id);}
  function storyGateOpen(game,id){
    if(!id)return true;
    const chapterIndex=D.CAMPAIGN_STORY.findIndex(chapter=>chapter.id===id);
    if(chapterIndex<0)return false;
    const state=K.Save&&K.Save.data&&K.Save.data.storyState;
    return !!(state&&state.campaignSeen&&state.campaignSeen[id]===true || game.run&&Array.isArray(game.run.storyChapters)&&game.run.storyChapters.includes(chapterIndex));
  }
  function ready(game,node){
    if(!node||node.status!=='pending')return false;
    if(!node.requires)return true;
    const prior=nodeFor(game,node.requires);
    if(prior&&prior.status==='skipped'&&prior.skippedBy){const selected=nodeFor(game,prior.skippedBy);return !!(selected&&selected.rewardClaimed);}
    return !!(prior&&prior.rewardClaimed);
  }
  function setExploration(game){
    game.activeEncounter=null;game.arena=game.world.bounds;game.cam.bounds=game.world.bounds;
    game.roomDef=Object.assign({},game.roomDef,{type:'exploration',cleared:true,isBoss:false});
    game.phase='playing';game.nearInteract=null;game.pendingSpawns=[];
    positions.delete(game.player);
  }
  function makeWorldInteractables(game){
    const list=[];
    for(const node of game.world.nodes){
      if(node.type==='shop')list.push({kind:'marketEntrance',nodeId:node.id,x:node.x,y:node.y,radius:36,used:false,label:'CHARON’S MARKET'});
      else if(node.type==='npc')list.push({kind:'worldNpc',nodeId:node.id,x:node.x,y:node.y,radius:32,used:false,characterIds:node.characterIds,context:'world',label:'SPEAK · '+node.characterIds.join(' / ').toUpperCase()});
      else if(node.type==='cache')list.push({kind:'worldCache',nodeId:node.id,x:node.x,y:node.y,radius:25,used:false,label:'EXPLORE OFFERING'});
    }
    return list;
  }
  P.startRun=function(seed,options){
    this.world=null;this.activeEncounter=null;this.marketReturn=null;this.marketVisits=Object.create(null);this.worldInteractables=[];this._worldRewardNode=null;this._worldTransitioning=false;this._worldRevealT=0;this._worldHazardTick=Object.create(null);this._worldVisits=[];
    return base.startRun.call(this,seed,options);
  };
  P.enterRegion=function(regionId){
    const regionIndex=D.REGIONS.findIndex(r=>r.id===regionId);
    if(regionIndex<0||!this.run)return false;
    const gate=storyGatedDestinations[regionId];
    if(gate&&(!this.world||!this.region()||this.region().id!==gate.from||!this.world.chapterResolved||!this.world.capstone.rewardClaimed||!storyGateOpen(this,gate.storyGate)))return false;
    this.regionIndex=regionIndex;this.run.regionIndex=regionIndex;this.chamberIndex=0;this.world=null;
    this.enterChamber(0);return this.world;
  };
  P.enterChamber=function(idx,routeNode){
    if(this.practiceMode)return base.enterChamber.call(this,idx,routeNode);
    const region=this.region();
    if(!this.world||this.world.regionId!==region.id){
      const mirror=K.Endgame&&K.Endgame.options?K.Endgame.options(K.Save.data):{};
      this.world=W.generate({seed:this.run.seed,regionId:region.id,modifiers:this.run.modifiers||this.run.mapModifiers||this.run.modifierRanks||{},mirrorOptions:mirror});
      this.world.runOrdinal=this.run.ordinal;this.world.mirrorOptions=mirror;this.worldInteractables=makeWorldInteractables(this);this.interactables=[];
      this._worldVisits.push(region.id);this.run.worldGeneratorVersion=W.VERSION;this.run.worldVisits=this._worldVisits.slice();
      if(K.WorldRenderer&&K.WorldRenderer.prewarmWorld)K.WorldRenderer.prewarmWorld(this.ctx,this.world);
    }
    const node=this.world.nodes.find(n=>n.main&&n.idx===idx);
    if(!node)return false;
    if(routeNode){node.type=routeNode.type;node.routeNode=routeNode;node.eventId=routeNode.eventId;}
    return this.activateWorldNode(node.id,{force:true});
  };
  P.activateWorldNode=function(id,options){
    const node=nodeFor(this,id);options=options||{};
    if(!node||node.status==='cleared'||node.status==='skipped'||this.marketReturn||(!options.force&&(!ready(this,node)||this.activeEncounter)))return false;
    if(['shop','npc','cache'].includes(node.type))return false;
    const preserved=(this.interactables||[]).filter(it=>it.worldPermanent||it.nodeId&&it.kind==='gate');
    const position={x:this.player.x,y:this.player.y};
    this.activeEncounter=node;node.status='active';
    const route=Object.assign({type:node.type,eventId:node.eventId},node.routeNode||{});
    // Legacy chamber setup mutates its rectangle in place; never let it mutate map or node bounds.
    this.arena={x:-600,y:-440,w:1200,h:880};this._worldActivating=true;
    try{base.enterChamber.call(this,Math.max(0,node.idx),route);}finally{this._worldActivating=false;}
    // Old spawn helpers intentionally run in their original coordinate frame, then relocate as a unit.
    shift(this.player,node.x,node.y);
    for(const objects of [E.enemies,E.projectiles,E.pickups,E.effects,this.hazards,this.pendingSpawns,this.interactables,this.particles.list])for(const object of objects||[])shift(object,node.x,node.y);
    for(const bolt of this.pendingBolts||[]){shift(bolt,node.x,node.y);bolt.fire=()=>this.strikeLightning(bolt.x,bolt.y,bolt.dmg,bolt.radius,0);}
    this.arena=node.bounds;this.cam.bounds=this.world.bounds;
    this.roomDef.worldNodeId=node.id;this.roomDef.isFinalCapstone=!!(node.main&&node.idx===7&&this.region().campaignFinal);
    if(!options.force&&W.isWalkable(this.world,position.x,position.y,this.player.radius)){
      const q=W.nearestWalkable(this.world,position.x,position.y,this.player.radius,node.bounds);this.player.x=q.x;this.player.y=q.y;
    }
    this.interactables=this.interactables.concat(preserved.filter(it=>!this.interactables.includes(it)),this.worldInteractables.filter(it=>!this.interactables.includes(it)));
    for(const it of this.interactables)if(!it.nodeId){it.nodeId=node.id;it.worldPermanent=true;}
    if(node.alternativeFor){const other=nodeFor(this,node.alternativeFor);if(other&&other.status==='pending'){other.status='skipped';other.skippedBy=node.id;other.rewardClaimed=false;}}
    else if(node.main)for(const alternative of this.world.nodes.filter(n=>n.alternativeFor===node.id)){alternative.status='skipped';alternative.skippedBy=node.id;alternative.rewardClaimed=false;}
    this.cam.follow(this.player.x,this.player.y,1,true);W.reveal(this.world,this.player.x,this.player.y);positions.set(this.player,{x:this.player.x,y:this.player.y});
    if(node.type==='recovery'){this.player.heal(28+Math.min(60,this.regionIndex*4),this);this.toast('THE WAYSIDE SPRING — recover before the next encounter','#7ad86a',true);this.checkRoomClear();}
    if(this.onTransition)this.onTransition('worldEncounter',node);
    return true;
  };
  P.enterPractice=function(options){
    base.enterPractice.call(this,options);this.world=W.generate({seed:this.run.seed,regionId:'practice'});this.arena=this.world.bounds;this.cam.bounds=this.world.bounds;this.activeEncounter=null;W.reveal(this.world,this.player.x,this.player.y);positions.delete(this.player);
    if(K.WorldRenderer&&K.WorldRenderer.prewarmWorld)K.WorldRenderer.prewarmWorld(this.ctx,this.world);
  };
  P.exitPractice=function(){const result=base.exitPractice.call(this);if(result){this.world=null;this.activeEncounter=null;}return result;};
  P.clampToArena=function(x,y,pad){
    if(!this.world||this._worldActivating)return base.clampToArena.call(this,x,y,pad);
    const b=this.activeEncounter?this.activeEncounter.bounds:this.world.bounds,r=Math.max(0,pad||0);
    return W.nearestWalkable(this.world,Math.max(b.x+r,Math.min(x,b.x+b.w-r)),Math.max(b.y+r,Math.min(y,b.y+b.h-r)),r,b);
  };
  P.collideWithWalls=function(entity){
    if(!this.world)return base.collideWithWalls.call(this,entity);
    const b=this.activeEncounter?this.activeEncounter.bounds:null;
    const previous=positions.get(entity);const result=W.resolveMove(this.world,entity,previous,b);
    positions.set(entity,result);
  };
  P.openExitGate=function(){
    if(!this.world||this.practiceMode)return base.openExitGate.call(this);
    const node=this.activeEncounter||nodeFor(this,this.roomDef&&this.roomDef.worldNodeId);
    if(!node||node.rewardClaimed)return false;
    const existing=this.interactables.find(it=>it.kind==='gate'&&it.nodeId===node.id&&!it.used);
    if(existing){this.exitGate=existing;return existing;}
    const q=W.nearestWalkable(this.world,node.x,node.y-220,34,node.bounds);
    const gate={kind:'gate',x:q.x,y:q.y,radius:34,used:false,cleared:true,nodeId:node.id,worldPermanent:true,label:node.type==='recovery'?'CONTINUE EXPLORING':'CLAIM REWARD'};
    node.rewardKind=this.pendingChamberReward||null;this.exitGate=gate;this.interactables.push(gate);
    E.effects.push({kind:'summonRing',x:q.x,y:q.y,r:60,life:1.2,max:1.2,color:'#e0b355'});K.Audio.sfx('gate');return gate;
  };
  P.checkRoomClear=function(){
    if(!this.world||this.practiceMode)return base.checkRoomClear.call(this);
    const node=this.activeEncounter;if(!node)return false;
    base.checkRoomClear.call(this);
    if(this.roomDef.cleared){node.status='cleared';node.rewardKind=this.pendingChamberReward||null;node.clearCount=(node.clearCount||0)+1;setExploration(this);return true;}
    return false;
  };
  P.useExitGate=function(){
    if(!this.world||this.practiceMode)return base.useExitGate.call(this);
    const gate=this.exitGate,node=gate&&nodeFor(this,gate.nodeId);
    if(!node||gate.used||node.rewardClaimed||node.status!=='cleared'||this.phase!=='playing')return false;
    this._worldRewardNode=node;node.rewardClaimed=true;
    this.chamberIndex=node.idx;this.run.chamberIndex=node.idx;
    this.roomDef={type:node.type,idx:node.idx,region:this.region(),isBoss:node.type==='boss'||node.type==='optionalboss',cleared:true,condition:node.routeNode&&node.routeNode.conditionData,worldNodeId:node.id,isFinalCapstone:!!(node.main&&node.idx===7&&this.region().campaignFinal)};
    this.pendingChamberReward=node.rewardKind;
    const result=base.useExitGate.call(this);
    if(this.phase==='playing'&&this._worldRewardNode===node)this.advance();
    return result;
  };
  P.offerBoons=function(options){
    return base.offerBoons.call(this,options);
  };
  P.advance=function(){
    if(!this.world||this.practiceMode)return base.advance.call(this);
    const node=this._worldRewardNode;this._worldRewardNode=null;
    if(node&&node.main&&node.idx===7){this.world.chapterResolved=true;this.refreshWorldExits();}
    setExploration(this);if(this.onTransition)this.onTransition('worldExplore',this.world);return true;
  };
  P.chooseEvent=function(id){
    const node=this.activeEncounter,result=base.chooseEvent.call(this,id);
    if(result&&node&&this.world){node.status='cleared';node.rewardKind=null;setExploration(this);}return result;
  };
  P.chooseStory=function(id){
    const result=base.chooseStory.call(this,id);
    if(result&&this.world&&this.world.capstone.rewardClaimed){this.world.chapterResolved=true;if(this.phase!=='victory')this.refreshWorldExits();}return result;
  };
  P.onBossDeath=function(boss){
    const result=base.onBossDeath.call(this,boss);
    if(this.world&&this.activeEncounter&&this.activeEncounter.main&&this.activeEncounter.idx===7){const region=this.region();const milestone=region.id==='tartarus'?'firstCapstone':region.actMilestone;if(milestone)K.RunSystems.recordCampaignMilestone(K.Save.data,this.run,milestone);}
    return result;
  };
  P.availableRegionExits=function(){
    if(!this.world||this.marketReturn||!this.world.chapterResolved||!this.world.capstone.rewardClaimed)return[];
    const region=this.region(),out=[];
    if(region.nextRegionId)out.push({regionId:region.nextRegionId,label:'CONTINUE · '+D.REGIONS.find(r=>r.id===region.nextRegionId).name,required:true});
    if(region.id==='aegean')out.push({regionId:'atlantis',label:'SEA GATE · ATLANTIS',optional:true,storyGate:storyGatedDestinations.atlantis.storyGate});
    if(region.id==='gigantomachy')out.push({regionId:'ancient_greece',label:'LIVING ROAD · ANCIENT GREECE',optional:true,storyGate:storyGatedDestinations.ancient_greece.storyGate});
    if(region.id==='atlantis')out.push({regionId:'aeaea',label:'RETURN TO THE AEGEAN ROAD',required:true});
    if(region.id==='ancient_greece')for(const id of ['delphi','arcadia','thebes','marathon','mycenae'])out.push({regionId:id,label:'ROAD TO '+D.REGIONS.find(r=>r.id===id).name,required:id==='delphi'});
    return out.filter(exit=>storyGateOpen(this,exit.storyGate));
  };
  P.refreshWorldExits=function(){
    this.interactables=this.interactables.filter(it=>it.kind!=='regionExit');
    const exits=this.availableRegionExits(),n=this.world.capstone;
    exits.forEach((exit,i)=>{const q=W.nearestWalkable(this.world,n.x+(i-(exits.length-1)/2)*160,n.y-260,30,n.bounds);this.interactables.push(Object.assign({kind:'regionExit',x:q.x,y:q.y,radius:34,used:false,worldPermanent:true},exit));});
  };
  P.useRegionExit=function(id){
    const exit=this.availableRegionExits().find(candidate=>candidate.regionId===id);
    if(this.phase!=='playing'||this.activeEncounter||!exit||!storyGateOpen(this,exit.storyGate))return false;
    this._worldTransitioning=true;const destination=this.enterRegion(id);this._worldTransitioning=false;
    if(!destination)return false;
    if(this.onTransition)this.onTransition('worldRegion',this.world);return true;
  };
  P.enterMarket=function(id){
    const node=nodeFor(this,id);if(!this.world||this.marketReturn||this.activeEncounter||this.phase!=='playing'||!node||node.type!=='shop')return false;
    if(!ready(this,node)&&node.status!=='visited')return false;
    const originalWorld=this.world;
    this.marketReturn={world:originalWorld,arena:this.arena,roomDef:this.roomDef,interactables:this.interactables,worldInteractables:this.worldInteractables,exitGate:this.exitGate,pendingChamberReward:this.pendingChamberReward,shopStock:this.shopStock,position:{x:this.player.x,y:this.player.y},freeBuy:this.run._freeBuy,enemies:E.enemies.slice(),projectiles:E.projectiles.slice(),pickups:E.pickups.slice(),effects:E.effects.slice(),hazards:this.hazards.slice(),particles:this.particles.list.slice(),chamberIndex:this.chamberIndex,nodeId:id};
    const visitKey=originalWorld.regionId+':'+id;let visit=this.marketVisits[visitKey];
    E.enemies.length=0;E.projectiles.length=0;E.pickups.length=0;E.effects.length=0;this.hazards=[];this.particles.clear();this.pendingSpawns=[];this.interactables=[];this.exitGate=null;this.pendingChamberReward=null;
    this.world=W.generate({seed:this.run.seed,regionId:'charon_market',shopNodeId:visitKey,modifiers:{}});this.world.originRegionId=originalWorld.regionId;this.world.shopNodeId=id;
    this.arena=this.world.bounds;this.cam.bounds=this.world.bounds;this.roomDef={type:'market',idx:node.idx,region:this.region(),cleared:true,isBoss:false};
    this.chamberIndex=node.idx;
    if(!visit){
      base.spawnShop?base.spawnShop.call(this,this.region()):this.spawnShop(this.region());
      const vendor=this.world.nodes.find(n=>n.type==='vendor'),wares=this.interactables.filter(it=>it.kind==='shop');
      wares.forEach((it,i)=>{const side=i%2?-1:1,rank=Math.floor(i/2);const q=W.nearestWalkable(this.world,vendor.x+side*(340+rank*300),vendor.y-80,25);it.x=q.x;it.y=q.y;});
      this.interactables.filter(it=>it.kind!=='shop').forEach((it,i)=>{const q=W.nearestWalkable(this.world,-260+i*260,-480,32);it.x=q.x;it.y=q.y;});
      this.interactables.push({kind:'worldNpc',x:vendor.x,y:vendor.y+200,radius:34,used:false,characterIds:['charon'],context:'market',label:'SPEAK TO CHARON',nodeId:id});
      this.interactables.push({kind:'marketReturn',x:this.world.entry.x,y:this.world.entry.y,radius:38,used:false,label:'RETURN TO THE REGION'});
      visit={map:this.world,interactables:this.interactables,shopStock:this.shopStock,freeBuy:this.run._freeBuy};this.marketVisits[visitKey]=visit;
    }else{this.world=visit.map;this.arena=this.world.bounds;this.cam.bounds=this.world.bounds;this.interactables=visit.interactables;this.shopStock=visit.shopStock;this.run._freeBuy=visit.freeBuy;}
    node.status='visited';node.discovered=true;this.player.x=this.world.entry.x;this.player.y=this.world.entry.y;this.player.vx=0;this.player.vy=0;positions.delete(this.player);W.reveal(this.world,this.player.x,this.player.y);this.cam.follow(this.player.x,this.player.y,1,true);K.Audio.playRegion(this.region(),'calm');
    if(K.WorldRenderer&&K.WorldRenderer.prewarmWorld)K.WorldRenderer.prewarmWorld(this.ctx,this.world);
    if(this.onTransition)this.onTransition('worldMarket',visit);return true;
  };
  P.returnFromMarket=function(){
    const restore=this.marketReturn;if(!restore)return false;
    const visit=this.marketVisits[restore.world.regionId+':'+restore.nodeId];visit.freeBuy=this.run._freeBuy;
    for(const [array,key] of [[E.enemies,'enemies'],[E.projectiles,'projectiles'],[E.pickups,'pickups'],[E.effects,'effects']]){array.length=0;array.push(...restore[key]);}
    Object.assign(this,{world:restore.world,arena:restore.arena,roomDef:restore.roomDef,interactables:restore.interactables,worldInteractables:restore.worldInteractables,exitGate:restore.exitGate,pendingChamberReward:restore.pendingChamberReward,shopStock:restore.shopStock,hazards:restore.hazards,chamberIndex:restore.chamberIndex});
    this.run.chamberIndex=this.chamberIndex;this.run._freeBuy=restore.freeBuy;this.particles.list.length=0;this.particles.list.push(...restore.particles);
    this.player.x=restore.position.x;this.player.y=restore.position.y;this.player.vx=0;this.player.vy=0;this.cam.bounds=this.world.bounds;positions.delete(this.player);this.cam.follow(this.player.x,this.player.y,1,true);this.marketReturn=null;this.nearInteract=null;
    if(this.onTransition)this.onTransition('worldMarketReturn',this.world);return true;
  };
  P.purchaseMarketItem=function(offer){
    if(!this.marketReturn||!this.world||!this.world.safe||this.phase!=='playing')return false;
    const wares=this.interactables.filter(it=>it.kind==='shop');
    const it=Number.isInteger(offer)?wares[offer]:wares.find(ware=>ware===offer);
    if(!it||it.used)return false;const before=it.used;base.doInteract.call(this,it);return !before&&it.used===true;
  };
  P.damageWorldProp=function(id,damage){
    const prop=this.world&&this.world.props.find(p=>p.id===id);
    if(!prop||!prop.destructible||prop.broken||!Number.isFinite(damage)||damage<=0)return false;
    prop.hp=Math.max(0,prop.hp-damage);prop.impactT=0.22;
    if(prop.hp===0){prop.broken=true;prop.solid=false;prop.collision=null;prop.visualState='broken';this.world.blockers=this.world.blockers.filter(blocker=>blocker.id!==id);E.effects.push({kind:'urnBreak',x:prop.x,y:prop.y,r:50,life:0.4,max:0.4});K.Audio.sfx('stone');}
    return true;
  };
  const playerAttack=E.Player.prototype.doAttack;
  E.Player.prototype.doAttack=function(game){
    const result=playerAttack.call(this,game);
    if(game.world&&!game.marketReturn){const weapon=D.WEAPONS[game.run.weapon]||D.WEAPONS.xiphos,reach=(weapon.reach||75)*(this.stats.reachMul||1);for(const prop of game.world.props){const angle=Math.atan2(prop.y-this.y,prop.x-this.x)-(this.aim||0),difference=Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));if(!prop.broken&&Math.hypot(prop.x-this.x,prop.y-this.y)<reach+28&&difference<(weapon.arc||1.5)/2)game.damageWorldProp(prop.id,Math.max(1,this.attackDamage()/25));}}
    return result;
  };
  P.doInteract=function(it){
    if(!it||it.used)return false;
    if(it.kind==='gate'&&this.world){if(!this.interactables.includes(it))return false;this.exitGate=it;return this.useExitGate();}
    if(it.kind==='marketEntrance')return this.enterMarket(it.nodeId);
    if(it.kind==='marketReturn')return this.returnFromMarket();
    if(it.kind==='regionExit')return this.useRegionExit(it.regionId);
    if(it.kind==='worldCache'){
      const node=nodeFor(this,it.nodeId);if(!ready(this,node)||this.activeEncounter)return false;
      node.status='cleared';node.rewardClaimed=true;it.used=true;this.dropObol(it.x,it.y,node.rewardAmount||80);this.toast('EXPLORATION OFFERING · '+(node.rewardAmount||80)+' OBOLS','#e0b355');return true;
    }
    if(it.kind==='worldNpc'){
      const context={context:it.context||'world',regionId:this.marketReturn?this.marketReturn.world.regionId:this.world.regionId,chapter:this.regionIndex,characterIds:it.characterIds,nodeId:it.nodeId};
      const scene=K.Mythology&&K.Mythology.sceneFor(context);
      if(scene&&this.beginMythScene)return this.beginMythScene(scene.id,context);
      this.toast((it.characterIds||['charon']).join(' and ')+' watch the road with you.','#d7c78d');return true;
    }
    return base.doInteract.call(this,it);
  };
  P.dropObol=function(x,y,amount){
    if(!this.run||this.practiceMode)return 0;
    const pickup=new E.Pickup({x,y,kind:'obol',value:Math.max(1,Math.round(Number(amount)||0)),radius:9});
    const before=this.run.obols;base.collectPickup.call(this,pickup);
    const collected=this.run.obols-before;this.floatText(x,y-16,'+'+collected,'#e0b355');return collected;
  };
  P.collectPickup=function(pickup){return base.collectPickup.call(this,pickup);};
  P.damagePlayer=function(){if(this.marketReturn)return false;return base.damagePlayer.apply(this,arguments);};
  P.addHazard=function(){if(this.marketReturn)return false;return base.addHazard.apply(this,arguments);};
  P.addEnemy=function(){if(this.marketReturn)return null;return base.addEnemy.apply(this,arguments);};
  P.spawnBoss=function(){if(this.marketReturn)return false;return base.spawnBoss.apply(this,arguments);};
  const projectileUpdate=E.Projectile&&E.Projectile.prototype.update;
  if(projectileUpdate)E.Projectile.prototype.update=function(dt,game){
    const before={x:this.x,y:this.y};projectileUpdate.call(this,dt,game);
    if(game.world&&this.life>0&&this.hitWall){const length=Math.hypot(this.x-before.x,this.y-before.y),steps=Math.max(1,Math.ceil(length/(game.world.tileSize*0.4)));for(let i=1;i<=steps;i++){const t=i/steps;if(!W.isWalkable(game.world,before.x+(this.x-before.x)*t,before.y+(this.y-before.y)*t,Math.min(12,this.radius||2))){this.life=0;if(this.aoe>0)this.explode(game);this.die(game);break;}}}
  };
  P.update=function(dt){
    if(!this.world)return base.update.call(this,dt);
    // Also absorb legacy/direct Obol pickup producers immediately, before movement can collect them.
    for(const pickup of E.pickups.slice())if(pickup.kind==='obol'&&!pickup.dead)base.collectPickup.call(this,pickup);
    const result=base.update.call(this,dt);
    if(!this.run||!this.player)return result;
    for(const prop of this.world.props)if(prop.impactT>0)prop.impactT=Math.max(0,prop.impactT-dt);
    this._worldRevealT=(this._worldRevealT||0)+dt;
    if(this._worldRevealT>=0.15){this._worldRevealT=0;const extra=this.world.mirrorOptions&&this.world.mirrorOptions.revealRadius||0;W.reveal(this.world,this.player.x,this.player.y,720+extra);}
    if(this.phase==='playing'&&!this.marketReturn){
      let nearestGate=null,nearestD2=Infinity;
      for(let i=0;i<this.interactables.length;i++){const it=this.interactables[i];if(it.kind!=='gate'||it.used)continue;const dx=it.x-this.player.x,dy=it.y-this.player.y,d2=dx*dx+dy*dy;if(d2<nearestD2){nearestD2=d2;nearestGate=it;}}
      if(nearestGate)this.exitGate=nearestGate;
      if(!this.activeEncounter){
        const nodes=this.world.nodes;
        for(let i=0;i<nodes.length;i++){const n=nodes[i];if(n.type==='shop'||n.type==='npc'||n.type==='cache')continue;if(!ready(this,n))continue;const dx=this.player.x-n.x,dy=this.player.y-n.y;if(dx*dx+dy*dy<211600){this.activateWorldNode(n.id);break;}}
      }
      for(const hazard of this.world.hazards){
        const stage=(this.time%hazard.period);hazard.telegraphActive=stage<hazard.telegraph;hazard.active=stage>=hazard.telegraph&&stage<hazard.telegraph+0.8;
        if(hazard.active){const dx=this.player.x-hazard.x,dy=this.player.y-hazard.y,rr=hazard.radius+this.player.radius;if(dx*dx+dy*dy<rr*rr){const previous=this._worldHazardTick[hazard.id]||-100;if(this.time-previous>0.65){this._worldHazardTick[hazard.id]=this.time;this.damagePlayer(hazard.dmg*(1+Math.min(3,this.regionIndex*0.1)),hazard,'hazard');}}}
      }
    }
    return result;
  };
  K.WorldRuntime={VERSION:1,ready,base};
})();
