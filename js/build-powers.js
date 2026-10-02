/* ============================================================
   KATABASIS — build powers
   Bounded combat riders shared by boons, augments and hero builds.
   Load after game.js, before the first Game instance is created.
   ============================================================ */
(function () {
  'use strict';
  const K=window.K, E=K.E, U=K.U;
  const rules={
    critBurst:{label:'Critical burst damage',unit:'damage',cap:200,trigger:'Direct critical hits release a burst within 150 pixels of the target; shared 1 second cooldown.'},
    castFork:{label:'Extra Cast spears',unit:'count',cap:4,trigger:'Cast launches extra spread spears for 65% of its original spear impact damage; forks create no rifts.'},
    castNova:{label:'Cast landing nova damage',unit:'damage',cap:200,trigger:'Each original Cast spear releases a nova within 120 pixels when it lands.'},
    dashNova:{label:'Dash nova damage',unit:'damage',cap:200,trigger:'An accepted Dash releases a nova within 120 pixels at activation.'},
    dashStrike:{label:'Next Strike after Dash bonus',unit:'percent',cap:0.75,trigger:'Dash empowers the next Strike within 3 seconds; the actual Strike consumes the bonus.'},
    parryNova:{label:'Parry nova damage',unit:'damage',cap:200,trigger:'A successful fresh parry releases a nova within 150 pixels.'},
    parryHeal:{label:'Parry healing',unit:'health',cap:25,trigger:'A successful fresh parry heals health; shared 1 second cooldown.'},
    statusDetonate:{label:'Status detonation damage',unit:'damage',cap:200,trigger:'Direct hits detonate targets with at least 2 active damaging statuses (bleed, poison, burn); 1 second cooldown per target.'},
    statusSpread:{label:'Status spread chance',unit:'percent',cap:1,trigger:'On a kill, spread remaining bleed, poison and burn to at most 2 nearby hostiles within 220 pixels, preserving damage and remaining duration.'},
    bossHunter:{label:'Boss and miniboss damage bonus',unit:'percent',cap:0.75,trigger:'Deal extra direct damage to bosses and minibosses.'},
    distanceDamage:{label:'Distant-target damage bonus',unit:'percent',cap:0.75,trigger:'Deal extra direct damage beyond 180 pixels from the player.'},
    closeDamage:{label:'Close-target damage bonus',unit:'percent',cap:0.75,trigger:'Deal extra direct damage within 100 pixels of the player.'},
    killNova:{label:'Kill nova damage',unit:'damage',cap:200,trigger:'A kill releases a nova within 150 pixels; kills caused by a proc cannot trigger another nova.'},
    killHaste:{label:'Attack speed after kill',unit:'percent',cap:0.6,trigger:'A kill increases Attack speed for 4 seconds; further kills refresh the duration without stacking.'},
    shieldDamage:{label:'Damage bonus while shielded',unit:'percent',cap:0.75,trigger:'Deal extra direct damage while shield is above zero.'},
    guardCast:{label:'Cast cooldown recovered on parry',unit:'seconds',cap:1.9,trigger:'A successful fresh parry reduces the current Cast cooldown; cooldown cannot fall below zero.'},
    rushNova:{label:'Rush nova damage',unit:'damage',cap:200,trigger:'Rush releases a nova within 140 pixels at activation.'},
    ascendNova:{label:'Ascend nova damage',unit:'damage',cap:200,trigger:'Ascend releases a nova within 180 pixels at activation.'}
  };
  const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:0;
  // One ceiling contract for the actual compiled character. Ordinary and
  // endgame gear share these limits; new rarity tiers cannot expand them.
  const STAT_CAPS=Object.freeze({
    maxHp:3000,maxShield:1500,armor:80,damage:1200,castDamage:2400,specialDamage:1800,
    dmgMul:8,castMul:5,specialMul:8,moveMul:2.5,moveSpeed:700,attSpd:4,attackSpeed:4,
    reachMul:2.5,dashDist:2.5,dashMax:6,crit:0.85,critMul:3,dmgReduce:0.75,dodge:0.6,deflectProj:0.6,darkBonus:0.5,
    lifesteal:0.15,killHeal:20,killShield:60,healRoom:0.25,shieldOnRoom:250,dashShield:80,
    deathDefy:6,multishot:6,pierce:8,homing:1,callBoost:0.4,guardMul:3,rushMul:3,ascendMul:3
  });
  function capCompiledStats(stats) {
    if(!stats || typeof stats!=='object')return stats;
    Object.keys(STAT_CAPS).forEach(key=>{
      if(typeof stats[key]==='number')stats[key]=Math.min(STAT_CAPS[key],Math.max(0,finite(stats[key])));
    });
    ['guardCdMul','castCdMul','rushCdMul','ascendCdMul','specialCdMul'].forEach(key=>{if(typeof stats[key]==='number')stats[key]=Math.max(0.25,Math.min(3,finite(stats[key])));});
    return capStats(stats);
  }
  function capStats(stats) {
    if (!stats || typeof stats!=='object') return stats;
    Object.keys(rules).forEach(key=>{
      if (!Object.prototype.hasOwnProperty.call(stats,key)) return;
      let value=Math.max(0,Math.min(rules[key].cap,finite(stats[key])));
      if (rules[key].unit==='count') value=Math.floor(value);
      stats[key]=value;
    });
    return stats;
  }
  K.BuildPowers={rules,capStats,STAT_CAPS,capCompiledStats};
  const value=(p,key)=>Math.max(0,Math.min(rules[key].cap,finite(p&&p.stats&&p.stats[key])));
  const playerStates=new WeakMap(),hitContexts=new WeakMap(),statusOrigins=new WeakMap(),onHitContexts=new WeakMap();
  function state(p) {
    let s=playerStates.get(p);
    if (!s) {
      s={clock:0,critReady:0,healReady:0,strikeUntil:0,strikeBonus:0,hasteUntil:0,targetReady:new WeakMap()};
      playerStates.set(p,s);
    }
    return s;
  }
  K.BuildPowers.activeEffects=function(p) {
    const s=p&&playerStates.get(p);
    if (!s) return null;
    const effects={};
    for (const [key,until,duration] of [['dashStrike',s.strikeUntil,3],['killHaste',s.hasteUntil,4]]) {
      const bonus=value(p,key),remaining=Math.max(0,Math.min(duration,finite(until-s.clock)));
      if (bonus>0 && remaining>0) effects[key]={bonus,remaining};
    }
    return Object.keys(effects).length?effects:null;
  };
  const hostile=e=>e&&!e.dead&&!e.ally&&!e.removeMe&&e.hp>0;
  const directSources=new Set(['melee','strike','cast','dash','rush','parry','wrath','ascend']);
  const procSources=new Set(['ally','charm','wave','lightning','chain','explosion','hazard','doom','thorns','reflect','retort','wrath-echo']);
  const dotSources=new Set(['bleed','poison','burn']);
  function isDirect(G,opts) {
    const p=G.player;
    if (!p || opts.buildProc || (opts.proj&&opts.proj.buildProc)) return false;
    if (opts.source==='projectile') return !!(opts.proj&&opts.proj.owner===p&&opts.proj.friendly&&!opts.proj.fromEnemy);
    return opts.player===p&&directSources.has(opts.source);
  }
  function nova(G,p,key,x,y,radius,damage) {
    if (!(damage>0) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    E.effects.push({kind:'nova',x,y,r:radius,life:0.34,max:0.34,color:key==='parryNova'?'#8fb8ff':'#bfe8ff'});
    if (E.cam) E.cam.addShake(3);
    for (const e of E.enemies.slice()) {
      if (!hostile(e) || U.dist2(x,y,e.x,e.y)>=radius*radius) continue;
      G.damageEnemy(e,damage,{source:'power:'+key,buildProc:true,x:e.x,y:e.y,noStatus:true});
    }
  }
  function damagingStatuses(e) {
    const result=[];
    for (const key of ['bleed','poison','burn']) {
      const s=e.statuses&&e.statuses[key];
      if (!s) continue;
      const remaining=finite(s.t===undefined?s.dur:s.t), dps=finite(s.dps), dmg=finite(s.dmg);
      if (remaining>0 && (dps>0 || dmg>0)) result.push({key,data:{dps:Math.max(0,dps),dmg:Math.max(0,dmg),dur:remaining}});
    }
    return result;
  }

  // Delayed damage keeps the origin of the strongest active status. A direct
  // reapplication of equal strength can qualify; a weaker refresh cannot take
  // ownership of stronger proc damage. Status objects expire with their owner.
  const statusRate=s=>s?Math.max(0,finite(s.dps)||finite(s.dmg)):0;
  const originalStatus=K.Game.prototype.applyStatus;
  K.Game.prototype.applyStatus=function(e,key,data) {
    const before=e&&e.statuses&&e.statuses[key],previousRate=statusRate(before);
    const context=hitContexts.get(this),proc=!!(context&&context.buildProc);
    const result=originalStatus.call(this,e,key,data);
    if (!e || e.dead || !dotSources.has(key) || (e.statusImmune&&e.statusImmune[key])) return result;
    const current=e.statuses&&e.statuses[key];
    if (!current) return result;
    const incomingRate=statusRate(data),origin=statusOrigins.get(current);
    if (current!==before || incomingRate>previousRate) statusOrigins.set(current,{buildProc:proc});
    else if (incomingRate===previousRate) statusOrigins.set(current,{buildProc:!!(origin&&origin.buildProc)&&proc});
    return result;
  };

  const originalDamage=K.Game.prototype.damageEnemy;
  K.Game.prototype.damageEnemy=function(e,amount,opts) {
    opts=opts||{};
    if (!hostile(e)) {
      // Preserve the existing allied damage path, but never grant powers from it.
      if (!e || e.dead || e.hp<=0) return 0;
      const previous=hitContexts.get(this);
      hitContexts.set(this,{direct:false,buildProc:true});
      try { return originalDamage.call(this,e,amount,opts); }
      finally { if(previous)hitContexts.set(this,previous);else hitContexts.delete(this); }
    }
    const previous=hitContexts.get(this),p=this.player;
    const origin=dotSources.has(opts.source)&&statusOrigins.get(e.statuses&&e.statuses[opts.source]);
    const inheritedProc=!!((previous&&previous.buildProc)||(origin&&origin.buildProc));
    const direct=!inheritedProc&&isDirect(this,opts),s=p?state(p):null;
    let burst=0,detonate=0;
    if (direct) {
      if (e.isBoss || e.isMiniBoss || e.miniBoss || e.miniboss) amount*=1+value(p,'bossHunter');
      const distance=U.dist2(p.x,p.y,e.x,e.y);
      if (distance>180*180) amount*=1+value(p,'distanceDamage');
      if (distance<100*100) amount*=1+value(p,'closeDamage');
      if (p.shield>0) amount*=1+value(p,'shieldDamage');
      if (opts.source==='melee' && s.strikeBonus>0) amount*=1+s.strikeBonus;
      if (opts.crit && value(p,'critBurst')>0 && s.clock>=s.critReady) {
        burst=value(p,'critBurst');s.critReady=s.clock+1;
      }
      if (value(p,'statusDetonate')>0 && damagingStatuses(e).length>=2 && s.clock>=(s.targetReady.get(e)||0)) {
        detonate=value(p,'statusDetonate');s.targetReady.set(e,s.clock+1);
      }
    }
    const buildProc=!!(inheritedProc||opts.buildProc||(opts.proj&&opts.proj.buildProc)||procSources.has(opts.source)||
      (typeof opts.source==='string'&&opts.source.indexOf('power:')===0)||(opts.proj&&opts.proj.owner!==p));
    hitContexts.set(this,{direct,buildProc});
    let dealt;
    try { dealt=originalDamage.call(this,e,amount,opts); }
    finally { if(previous)hitContexts.set(this,previous);else hitContexts.delete(this); }
    if (dealt>0) {
      if (burst) nova(this,p,'critBurst',e.x,e.y,150,burst);
      if (detonate && hostile(e)) this.damageEnemy(e,detonate,{source:'power:statusDetonate',buildProc:true,x:e.x,y:e.y,noStatus:true});
      onHitContexts.set(e,{direct,buildProc});
    }
    return dealt;
  };

  // Legacy Wrath echoes apply their riders after damageEnemy has returned.
  // Carry that hit's context across the immediately following rider call.
  const originalOnHit=E.Player.prototype.applyOnHit;
  E.Player.prototype.applyOnHit=function(e,G,crit) {
    const previous=hitContexts.get(G),rider=onHitContexts.get(e);
    onHitContexts.delete(e);
    if (!(previous&&previous.buildProc) && !(rider&&rider.buildProc)) return originalOnHit.call(this,e,G,crit);
    hitContexts.set(G,{direct:false,buildProc:true});
    try { return originalOnHit.call(this,e,G,crit); }
    finally { if(previous)hitContexts.set(G,previous);else hitContexts.delete(G); }
  };
  const originalWave=K.Game.prototype.playerWave;
  K.Game.prototype.playerWave=function() {
    const previous=hitContexts.get(this);
    hitContexts.set(this,{direct:false,buildProc:true});
    try { return originalWave.apply(this,arguments); }
    finally { if(previous)hitContexts.set(this,previous);else hitContexts.delete(this); }
  };

  const originalKill=K.Game.prototype.killEnemy;
  K.Game.prototype.killEnemy=function(e,silent) {
    if (!e || e.dead) return originalKill.call(this,e,silent);
    const p=this.player, context=hitContexts.get(this);
    // A hostile self-destruction or cleanup has no player damage context.
    // Normal DoT hits carry a non-proc context and still receive kill powers.
    const eligible=p&&!e.ally&&context&&!context.buildProc;
    const spread=eligible&&value(p,'statusSpread')>0?damagingStatuses(e):[];
    const spreadChance=eligible?value(p,'statusSpread'):0;
    const killDamage=eligible?value(p,'killNova'):0;
    const haste=eligible?value(p,'killHaste'):0;
    const result=originalKill.call(this,e,silent);
    if (!eligible || !e.dead) return result;
    if (haste>0) state(p).hasteUntil=state(p).clock+4;
    if (spread.length && Math.random()<spreadChance) {
      const targets=E.enemies.filter(other=>hostile(other)&&U.dist2(e.x,e.y,other.x,other.y)<220*220)
        .sort((a,b)=>U.dist2(e.x,e.y,a.x,a.y)-U.dist2(e.x,e.y,b.x,b.y)).slice(0,2);
      for (const target of targets) for (const rider of spread) this.applyStatus(target,rider.key,rider.data);
    }
    if (killDamage) nova(this,p,'killNova',e.x,e.y,150,killDamage);
    return result;
  };

  const originalUpdate=E.Player.prototype.update;
  E.Player.prototype.update=function(dt,G) {
    const s=state(this),elapsed=Math.max(0,finite(dt));
    s.clock=Math.min(Number.MAX_SAFE_INTEGER-8,s.clock+elapsed);
    const oldDash=finite(this.dashing),oldCooldown=finite(this.dashCd);
    const knocked=Math.abs(this.knockVX)>2||Math.abs(this.knockVY)>2;
    const x=this.x+(knocked?finite(this.knockVX)*elapsed:0),y=this.y+(knocked?finite(this.knockVY)*elapsed:0);
    const result=originalUpdate.call(this,dt,G);
    // A new active Dash and cooldown identify acceptance, including recharge on this frame.
    if (this.dashing>Math.max(0,oldDash-elapsed) && this.dashCd>Math.max(0,oldCooldown-elapsed)) {
      if (value(this,'dashStrike')>0) s.strikeUntil=s.clock+3;
      nova(G,this,'dashNova',x,y,120,value(this,'dashNova'));
    }
    return result;
  };

  const originalAttack=E.Player.prototype.doAttack;
  E.Player.prototype.doAttack=function(G) {
    const s=state(this),stats=this.stats,oldSpeed=stats.attackSpeed,oldCount=this.attackCount;
    const bonus=s.clock<s.strikeUntil?value(this,'dashStrike'):0;
    const haste=s.clock<s.hasteUntil?value(this,'killHaste'):0;
    const before=bonus?new Set(E.projectiles):null;
    s.strikeBonus=bonus;
    if (haste>0) stats.attackSpeed=Math.min(STAT_CAPS.attackSpeed,Math.max(0.25,finite(oldSpeed)*(1+haste)));
    let result;
    try { result=originalAttack.call(this,G); }
    finally { stats.attackSpeed=oldSpeed;s.strikeBonus=0; }
    if (this.attackCount!==oldCount && bonus>0) {
      s.strikeUntil=0;
      for (const projectile of E.projectiles) {
        if (!before.has(projectile) && projectile.owner===this && !projectile.buildProc) projectile.dmg*=1+bonus;
      }
    }
    return result;
  };

  const originalCast=E.Player.prototype.doCast;
  E.Player.prototype.doCast=function(G) {
    const before=new Set(E.projectiles),novaDamage=value(this,'castNova'),forkCount=Math.floor(value(this,'castFork'));
    const result=originalCast.call(this,G);
    const created=E.projectiles.filter(projectile=>!before.has(projectile)&&projectile.owner===this);
    const originals=created.filter(projectile=>projectile.persp==='spear'&&typeof projectile.onDeath==='function');
    for (const projectile of created) if (!originals.includes(projectile)) projectile.buildProc=true;
    for (const projectile of originals) {
      if (!novaDamage) continue;
      const oldDeath=projectile.onDeath,player=this;
      projectile.onDeath=function(proj,world) {
        oldDeath.call(this,proj,world);
        nova(world||G,player,'castNova',proj.x,proj.y,120,novaDamage);
      };
    }
    const spear=originals.find(projectile=>Math.abs(U.angDiff(Math.atan2(projectile.vy,projectile.vx),this.aim))<0.01)||originals[0];
    if (spear) for (let i=0;i<forkCount;i++) {
      const offset=(i%2===0?1:-1)*Math.ceil((i+1)/2)*0.22,angle=this.aim+offset,speed=Math.hypot(spear.vx,spear.vy);
      const fork=new E.Projectile({x:spear.x,y:spear.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        dmg:spear.dmg*0.65,friendly:true,owner:this,persp:'spear',life:spear.maxLife,radius:8,
        crit:spear.crit,knock:spear.knock,effects:spear.effects,hitWall:spear.hitWall});
      fork.buildProc=true;E.projectiles.push(fork);
    }
    return result;
  };

  const originalAbsorb=E.Player.prototype.absorb;
  E.Player.prototype.absorb=function(amount,source,kind,G) {
    const previous=this.parryCount,result=originalAbsorb.call(this,amount,source,kind,G);
    if (this.parryCount>previous) {
      const s=state(this),heal=value(this,'parryHeal');
      nova(G,this,'parryNova',this.x,this.y,150,value(this,'parryNova'));
      if (heal>0 && s.clock>=s.healReady) { s.healReady=s.clock+1;this.heal(heal,G); }
      this.castCd=Math.max(0,finite(this.castCd)-value(this,'guardCast'));
    }
    return result;
  };
  for (const [method,key,radius] of [['doRush','rushNova',140],['doAscend','ascendNova',180]]) {
    const original=E.Player.prototype[method];
    E.Player.prototype[method]=function(G) {
      const damage=value(this,key),x=this.x,y=this.y,result=original.call(this,G);
      nova(G,this,key,x,y,radius,damage);return result;
    };
  }
  const originalProjectileUpdate=E.Projectile.prototype.update;
  E.Projectile.prototype.update=function(dt,G) {
    const wasFriendly=this.friendly,previous=hitContexts.get(G);
    const proc=!!(this.buildProc||!wasFriendly||this.owner!==G.player);
    if(proc)hitContexts.set(G,{direct:false,buildProc:true});
    let result;
    try { result=originalProjectileUpdate.call(this,dt,G); }
    finally { if(proc){if(previous)hitContexts.set(G,previous);else hitContexts.delete(G);} }
    if (!wasFriendly && this.friendly) this.buildProc=true;
    return result;
  };
  // Automatic Call volleys belong to the Call, rather than a direct Strike or Cast.
  for (const method of ['startCall','callTick']) {
    const original=K.Game.prototype[method];
    K.Game.prototype[method]=function() {
      const before=new Map(E.projectiles.map(projectile=>[projectile,projectile.friendly]));
      const previous=hitContexts.get(this);
      hitContexts.set(this,{direct:false,buildProc:true});
      let result;
      try { result=original.apply(this,arguments); }
      finally { if(previous)hitContexts.set(this,previous);else hitContexts.delete(this); }
      for (const projectile of E.projectiles) if (!before.has(projectile)||(!before.get(projectile)&&projectile.friendly)) projectile.buildProc=true;
      return result;
    };
  }
})();
