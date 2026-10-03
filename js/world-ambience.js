/* Deterministic, camera-local weather for generated descent worlds. */
(function () {
  'use strict';
  const K=window.K, A={};K.WorldAmbience=A;
  let reducedMotion=false;
  const WEATHER={
    ash:{interval:0.17,life:3.6,size:[1.3,2.7],velocity:[-6,-9],spread:15,stretch:1.1},
    mist:{interval:0.22,life:4.8,size:[4.2,8.4],velocity:[4,-0.8],spread:4,stretch:1.5},
    embers:{interval:0.15,life:2.5,size:[1.4,2.8],velocity:[-3,-19],spread:20,stretch:1},
    sparks:{interval:0.13,life:2.1,size:[1.2,2.5],velocity:[-8,-22],spread:28,stretch:1},
    spores:{interval:0.2,life:4.1,size:[1.8,3.8],velocity:[2,-2],spread:8,stretch:1.35},
    petals:{interval:0.17,life:3.8,size:[1.8,3.2],velocity:[-9,2],spread:10,stretch:1.2},
    dust:{interval:0.18,life:3.5,size:[1.5,3.4],velocity:[-5,-2],spread:13,stretch:1.3},
    spray:{interval:0.15,life:2.6,size:[1.5,3.3],velocity:[-22,0],spread:16,stretch:1.6},
    rain:{interval:0.1,life:1.6,size:[1.2,2.5],velocity:[18,130],spread:8,stretch:3.2},
    clouds:{interval:0.34,life:6.2,size:[8,15],velocity:[-3,0.6],spread:2,stretch:1.8},
    leaves:{interval:0.16,life:4.5,size:[2.4,4.3],velocity:[-13,4],spread:12,stretch:1.2},
    motes:{interval:0.2,life:3.8,size:[1.5,2.9],velocity:[-3,-4],spread:10,stretch:1}
  };
  const KIND_COLORS={ash:'rgba(171,154,140,0.72)',mist:'rgba(116,190,207,0.28)',embers:'rgba(255,126,55,0.86)',
    sparks:'rgba(255,184,94,0.9)',spores:'rgba(132,206,153,0.76)',petals:'rgba(225,172,184,0.82)',
    dust:'rgba(190,166,131,0.67)',spray:'rgba(131,204,214,0.56)',rain:'rgba(124,179,221,0.78)',
    clouds:'rgba(110,137,165,0.2)',leaves:'rgba(175,194,116,0.78)',motes:'rgba(230,214,167,0.72)'};
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function textHash(value){let h=2166136261;for(let i=0;i<String(value).length;i++)h=Math.imul(h^String(value).charCodeAt(i),16777619);return h>>>0;}
  function sample(seed,step,salt){
    let x=((Number(seed)||0)>>>0)^Math.imul(step+1,0x9e3779b9)^salt;
    x=(x+0x6d2b79f5)|0;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);
    return ((x^(x>>>14))>>>0)/4294967296;
  }
  function view(game){
    const cam=game.cam||{},zoom=Math.max(0.45,Number(cam.zoom)||1),cx=Number(cam.x===undefined?game.player&&game.player.x:cam.x)||0,cy=Number(cam.y===undefined?game.player&&game.player.y:cam.y)||0;
    const w=(K.W||1280)/zoom,h=(K.H||720)/zoom;
    return{x0:cx-w/2,y0:cy-h/2,x1:cx+w/2,y1:cy+h/2,w,h};
  }
  A.visibleParticleCap=function(game){return clamp(Math.floor((K.W||1280)*(K.H||720)/14500),18,64);};
  A.setReducedMotion=function(enabled){reducedMotion=!!enabled;return reducedMotion;};
  A.isReducedMotion=function(){return reducedMotion;};
  A.update=function(game,dt){
    if(!game||!game.world||!game.particles||!game.world.profile||!game.world.profile.ambience)return 0;
    const type=game.world.profile.ambience.particleKind,spec=WEATHER[type]||WEATHER.motes;
    const region=game.world.regionId||game.world.profile.id||'unknown',seed=((Number(game.world.seed)||0)^textHash(region))>>>0;
    const key=region+':'+seed+':'+type;
    let state=game._worldAmbienceState;
    if(!state||state.key!==key){state={key,acc:0,step:0};game._worldAmbienceState=state;}
    const l=game.particles.list,box=view(game),pad=100,active=[];
    for(let i=l.length-1;i>=0;i--){const p=l[i];if(!p||!p.worldAmbience)continue;
      if(p.life<=0||p.ambienceRegion!==region||p.x<box.x0-pad||p.x>box.x1+pad||p.y<box.y0-pad||p.y>box.y1+pad){l.splice(i,1);continue;}
      active.push(p);
    }
    if(reducedMotion||game.phase&&game.phase!=='playing'&&game.phase!=='dead'||typeof document!=='undefined'&&document.hidden){
      if(reducedMotion)for(let i=l.length-1;i>=0;i--)if(l[i]&&l[i].worldAmbience)l.splice(i,1);
      return 0;
    }
    state.acc+=clamp(Number(dt)||0,0,0.1);
    const cap=A.visibleParticleCap(game);let spawned=0;
    while(state.acc>=spec.interval&&spawned<3){
      state.acc-=spec.interval;const index=state.step++,n=index+1;
      if(active.length>=cap)continue;
      const rx=sample(seed,index,0x31415927),ry=sample(seed,index,0x27182818),rv=sample(seed,index,0x7f4a7c15),rsize=sample(seed,index,0x94d049bb),rphase=sample(seed,index,0x369dea0f);
      const life=spec.life*(0.74+rv*0.52),size=spec.size[0]+(spec.size[1]-spec.size[0])*rsize;
      game.particles.spawn({worldAmbience:true,ambienceRegion:region,kind:type,weather:game.world.profile.ambience.weather,
        x:box.x0+rx*box.w,y:box.y0+ry*box.h,vx:spec.velocity[0]+(rv-0.5)*spec.spread,vy:spec.velocity[1]+(rphase-0.5)*spec.spread,
        life,max:life,size,color:KIND_COLORS[type]||KIND_COLORS.motes,glow:type==='embers'||type==='sparks',add:type==='embers'||type==='sparks',
        drag:type==='rain'?1:0.985,rot:rphase*Math.PI*2,vrot:(rv-0.5)*0.8,ambienceStretch:spec.stretch});
      active.push(game.particles.list[game.particles.list.length-1]);spawned++;
    }
    return spawned;
  };
})();
