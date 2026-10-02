/* Deity art registry and decorative presentation. No gameplay roster mutation. */
(function () {
  'use strict';
  const K=window.K, D=K.DATA, byId=Object.create(null), artwork=Object.create(null);
  const concepts=[
    ['zeus','eagle; thunderbolt','Broad aged silhouette, raised bronze thunderbolt','Slow bolt glow; cloak edge drift'],
    ['hera','peacock feather; royal diadem','Upright dark-haired sovereign with feather fan','Peacock eye shimmer; veil edge drift'],
    ['poseidon','trident; sea horse','Salt-bearded figure turning a long trident','Trident water curl; damp hair sway'],
    ['demeter','wheat; sickle','Mature harvest figure cradling a sheaf','Wheat-head sway; faint frost sparkle'],
    ['athena','owl; olive branch','Armored strategist in angular helm with owl','Owl eye glint; olive leaf sway'],
    ['apollo','lyre; laurel','Laurel-crowned musician with a vertical lyre','Gold-string shimmer; laurel leaf sway'],
    ['artemis','bow; crescent','Alert huntress with a crescent bow across her shoulder','Bowstring glint; silver hair edge drift'],
    ['ares','spear; red helm','Heavy warrior silhouette with a diagonal spear','Ember pulse on spear; cloak edge drift'],
    ['aphrodite','shell; rose','Foam-lit figure holding a rose above a shell','Petal drift; shell pearlescent glint'],
    ['hephaestus','hammer; anvil','Soot-marked smith resting a hammer on one shoulder','Forge ember glow; smoke curl'],
    ['hermes','winged sandals; caduceus','Lean traveler with staff and forward-tilted shoulders','Small wing flutter; scarf sway'],
    ['hestia','hearth flame; offering bowl','Quiet seated keeper sheltering a flame in a bowl','Sheltered flame sway; warm cloth glow'],
    ['dionysus','grapes; thyrsus','Relaxed vine-crowned reveler holding a thyrsus','Vine leaf sway; cup reflection glint'],
    ['hades','bident; obsidian crown','Severe king framed by a forked obsidian staff','Gem eye glint; faint underworld mist'],
    ['chaos','dark aperture; star dust','Unfixed primordial face emerging from a dark aperture','Slow aperture flow; isolated star shimmer'],
    ['persephone','pomegranate; narcissus','Queen with a pomegranate cupped near her heart','Petal sway; seed glint'],
    ['hecate','paired torches; key','Three-quarter witch holding paired torches at different heights','Torch flicker; key glint'],
    ['nyx','star veil; black wings','Vast night veil outlining a still celestial face','Slow star-field drift; veil sway'],
    ['thanatos','inverted torch; dark wings','Reserved winged youth with a lowered torch','Feather edge sway; soft torch glow'],
    ['hypnos','poppy; winged temple','Reclining dreamer with poppies and one temple wing','Poppy petal sway; eyelid glint'],
    ['charon','oar; fare coin','Hooded river elder with a long weathered oar','River reflection ripple; lantern sway'],
    ['nemesis','balance; measuring rod','Direct-eyed judge holding a balance at chest height','Balance chain drift; metal glint'],
    ['nike','victory wreath; wings','Forward-reaching winged figure offering a small wreath','Feather sway; wreath shimmer'],
    ['iris','rainbow ribbon; herald staff','Messenger sweeping a curved ribbon beside her face','Restrained ribbon drift; staff glint'],
    ['hebe','cup; ivy','Youthful cup bearer in an open balanced stance','Cup reflection shimmer; ivy sway'],
    ['asclepius','serpent staff; medicine bowl','Bearded healer with one serpent climbing his staff','Serpent head sway; bowl reflection'],
    ['pan','reed pipes; goat horns','Rugged horned wild figure raising reed pipes','Reed tassel sway; leaf movement'],
    ['eros','bow; small wings','Winged archer with a heart-shaped bow curve','Feather edge flutter; arrow glint'],
    ['eris','golden apple; torn veil','Sharp smiling figure extending a single golden apple','Apple gleam; torn veil drift'],
    ['gaia','root crown; earth bowl','Broad earthen mother with root-crowned hair','Root leaf sway; soil ember glint'],
    ['kronos','sickle; weathered stone','Ancient Titan gripping a curved sickle in profile','Sickle patina shimmer; dust drift'],
    ['rhea','lion; mountain diadem','Protective mountain mother with a lion at her shoulder','Lion mane edge sway; diadem glint'],
    ['themis','scales; law tablets','Calm lawgiver with square tablets and level scales','Scale chain drift; tablet edge glint'],
    ['tyche','cornucopia; wheel','Fortune keeper holding a tilted cornucopia beside a wheel','Small coin gleam; robe edge sway'],
    ['morpheus','butterfly; dream veil','Narrow winged dream shaper under a translucent veil','Butterfly wing sway; veil drift'],
    ['moirai','single thread; distaff; shears','One central fate face with three hands holding one thread','Thread tension shimmer; shears glint'],
    ['amphitrite','shell diadem; sea veil','Sea queen with a high shell crown and flowing veil','Sea veil ripple; shell glint'],
    ['triton','conch; coral','Broad sea herald blowing a spiral conch','Water bead movement; conch reflection'],
    ['boreas','winter breath; dark wings','Bearded north wind leaning into a fur mantle','Cold breath drift; mantle sway'],
    ['aeolus','sealed wind jar; knotted rope','Vault keeper holding a sealed jar close to his torso','Rope tassel sway; restrained cloud drift'],
    ['selene','crescent diadem; chariot rein','Silver-haired moon driver holding a curved rein','Moon edge glow; hair sway'],
    ['helios','sun diadem; horse rein','Radiant witness with a narrow sun diadem and taut rein','Restrained sun shimmer; rein tassel drift'],
    ['eos','dawn veil; dew vessel','Dawn figure opening a pale rose veil around her face','Veil edge drift; dew glint'],
    ['harmonia','joined rings; lyre','Centered peacemaker joining two metal rings','Ring contact gleam; lyre-string shimmer'],
    ['prometheus','stolen flame; broken chain','Weathered bearer lifting a small flame past broken chains','Flame flicker; chain glint'],
    ['atlas','star vault; shoulder stone','Bent but resolute bearer lifting a dark celestial vault','Slow star shimmer; suspended dust'],
    ['styx','oath bowl; black river','Veiled oath keeper holding dark water in a stone bowl','Black-water ripple; silver edge glint'],
    ['phobos','fear mask; shield','Armored figure lifting a cracked mask beside one eye','Mask eye glint; smoke edge drift'],
    ['mnemosyne','memory tablets; spring water','Mature witness reading one tablet over a shallow spring','Water reflection ripple; tablet edge gleam'],
    ['leto','palm branch; protective veil','Travel-worn mother sheltering her face beneath a palm','Palm leaf sway; veil edge drift'],
    ['oceanus','river horns; ocean vessel','Horned elder pouring a narrow stream from a stone vessel','Small stream flow; beard edge sway'],
    ['tethys','freshwater vessel; winged brow','River mother with a winged brow and two freshwater vessels','Water surface ripple; brow feather sway'],
    ['ananke','spindle; enclosing coil','Stern necessity figure holding a spindle within one coil','Slow thread glint; coil edge shimmer']
  ];
  const extra={
    mnemosyne:{name:'MNEMOSYNE',title:'Keeper of Memory',domain:'Memory & Remembrance',color:'#9eaeae'},
    leto:{name:'LETO',title:'The Sheltering Mother',domain:'Motherhood & Sanctuary',color:'#baa58b'},
    oceanus:{name:'OCEANUS',title:'The Encircling River',domain:'The Encircling Waters',color:'#6b9eac'},
    tethys:{name:'TETHYS',title:'Mother of the Rivers',domain:'Fresh Waters & Nourishment',color:'#83b6b0'},
    ananke:{name:'ANANKE',title:'The Inescapable',domain:'Necessity & Constraint',color:'#b39d91'}
  };
  const style='Original Katabasis Greek-Underworld art: dark stone, terracotta, cream and restrained gold; one central divine focal figure; no text, logos, labels or UI frame.';
  const roster=concepts.map((concept,index)=>{
    const id=concept[0],g=D.GODS[id] || extra[id];
    const record={id,displayName:g.name,epithet:g.title,tradition:'greek',domain:g.domain,
      symbols:concept[1].split('; '),paletteAccent:g.color,silhouettePose:concept[2],
      cropSafeNotes:'Keep the face, hands and first signature symbol inside the central 65 percent of the cover; inspect a square 72px card crop and a 320px Codex crop.',
      animationCues:concept[3].split('; '),hasBoonContent:!!D.GODS[id],runEligible:!!D.GODS[id],
      portraitAssetId:'portrait.greek.'+id+'.poster',loopAssetId:'portrait.greek.'+id+'.loop',
      approvalStatus:'roster-approved',approvalReference:'User blanket approval in the implementation chat, 2026-10-02',approvedStillReference:null,artStatus:'awaiting-production',
      legacyPoster:D.GODS[id]?{assetId:'ui.deities',cell:g.portraitCell}:null,
      generationBrief:style+' '+g.name+', '+g.title+'. '+concept[2]+'. Signature symbols: '+concept[1]+'. Accent: '+g.color+'.',
      loopTarget:{frames:6,durationSeconds:2,motionTreatment:'pending-pilot-review'},reviewIndex:index+1};
    byId[id]=record;return record;
  });
  function safe(value){return String(value===undefined?'':value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
  function entry(id){return K.Assets && K.Assets.entry ? K.Assets.entry(id) : null;}
  function url(id){return K.Assets && K.Assets.url ? K.Assets.url(id) : '';}
  function forBoon(boon){
    if(typeof boon==='string')boon=D.boonById[boon];
    if(!boon)return [];
    const ids=[boon.god].concat(Object.keys(boon.req && boon.req.gods || {}));
    return Array.from(new Set(ids)).filter(id=>byId[id]).map(id=>byId[id]);
  }
  function shouldAnimate(state){return !!(state && state.visible && !state.reducedMotion && !state.documentHidden && state.surface!=='hud' && state.surface!=='chip' && state.surface!=='story');}
  function assetStatus(id){
    const record=byId[id];let art=artwork[id];
    if(!record)return {state:'unknown',record:null,poster:null,loop:null};
    if(!art && entry(record.portraitAssetId)) {
      const poster=entry(record.portraitAssetId);
      art={poster:record.portraitAssetId,loop:record.loopAssetId,treatment:poster.motionTreatment || 'runtime',approved:poster.reviewed===true};
    }
    if(art && entry(art.poster))return {state:art.approved?'approved':'pilot',record,poster:art.poster,loop:art.loop && entry(art.loop)?art.loop:null,treatment:art.treatment};
    if(record.legacyPoster && entry(record.legacyPoster.assetId))return {state:'interim',record,poster:record.legacyPoster.assetId,cell:record.legacyPoster.cell,loop:null,treatment:'static'};
    return {state:'missing',record,poster:null,loop:null,treatment:'static'};
  }
  function registerAsset(id,asset){
    if(!byId[id])throw new Error('Unknown portrait ID: '+id);
    if(!asset || typeof asset.poster!=='string')throw new Error('Portrait needs a raster poster asset');
    if(asset.treatment && !['static','runtime','sheet'].includes(asset.treatment))throw new Error('Unknown portrait treatment');
    if(asset.approved && !(asset.reviewReference && asset.stillApproved && asset.treatmentApproved))throw new Error('Portrait approval requires explicit still and treatment review records');
    artwork[id]={poster:asset.poster,loop:asset.loop || null,treatment:asset.treatment || 'static',approved:!!asset.approved,reviewReference:asset.reviewReference || null};
    return assetStatus(id);
  }
  function html(id,options){
    const opt=options || {},status=assetStatus(id),record=status.record,surface=opt.surface || 'codex';
    const classes='deity-portrait '+safe(opt.className || '')+(status.state==='missing'||status.state==='unknown'?' portrait-unavailable':'');
    let art='';
    if(status.state==='interim') {
      const atlas=entry(status.poster),cols=atlas.cols || 1,rows=atlas.rows || 1,col=status.cell%cols,row=Math.floor(status.cell/cols);
      art='<span class="portrait-art portrait-atlas" style="background-image:url(&quot;'+safe(url(status.poster))+'&quot;);background-size:'+cols*100+'% '+rows*100+'%;background-position:'+(cols===1?0:col/(cols-1)*100)+'% '+(rows===1?0:row/(rows-1)*100)+'%"></span>';
    } else if(status.poster)art='<img class="portrait-art portrait-poster" src="'+safe(url(status.poster))+'" alt="" loading="lazy" decoding="async" />';
    else art='<span class="portrait-missing-label">'+(record?'Portrait awaiting production':'Portrait unavailable')+'</span>';
    const note=status.state==='interim'?'Existing atlas poster; new cover awaiting review.':status.state==='pilot'?'Art pilot awaiting review.':'';
    return '<span class="'+classes+'" style="--portrait-accent:'+safe(record && record.paletteAccent || '#d2b78f')+'" data-deity-id="'+safe(id)+'" data-portrait-surface="'+safe(surface)+'" data-portrait-status="'+status.state+'" data-portrait-treatment="'+safe(status.treatment || 'static')+'" aria-hidden="true"'+(note?' title="'+safe(note)+'"':'')+'>'+art+'<span class="portrait-loading-label" hidden>Loading portrait</span><span class="portrait-error-label" hidden>Portrait could not load</span></span>';
  }
  function boonHtml(boon,options){const entries=forBoon(boon);return '<span class="deity-portrait-group'+(entries.length>1?' paired':'')+'">'+entries.map(record=>html(record.id,options)).join('')+'</span>';}
  let installed=false,observer=null,motionQuery=null;
  const elements=new Set();
  function updateElement(element){
    const rect=element.getBoundingClientRect?element.getBoundingClientRect():null;
    const visible=element.isConnected!==false && (!element.closest || !element.closest('.hidden,[hidden]')) && (!rect || rect.width>0 && rect.height>0 && rect.bottom>0 && rect.right>0 && rect.top<(window.innerHeight||Infinity) && rect.left<(window.innerWidth||Infinity));
    const animate=shouldAnimate({visible,surface:element.getAttribute('data-portrait-surface'),reducedMotion:!!(motionQuery && motionQuery.matches),documentHidden:!!(window.document && window.document.hidden)});
    const treatment=element.getAttribute('data-portrait-treatment');
    function toggle(name,on){if(element.classList.contains(name)!==on)element.classList.toggle(name,on);}
    toggle('portrait-motion',animate && treatment==='runtime');
    toggle('portrait-visible',visible);
    toggle('portrait-sheet-active',animate && treatment==='sheet');
    element.style.animationPlayState=animate?'running':'paused';
    const sheet=element.querySelector && element.querySelector('.portrait-sheet');
    if(sheet)sheet.style.animationPlayState=animate?'running':'paused';
  }
  function refresh(root){
    if(!window.document)return;
    const scope=root || window.document;
    if(scope.querySelectorAll)scope.querySelectorAll('[data-deity-id]').forEach(element=>{
      if(!elements.has(element)) {
        elements.add(element);if(observer)observer.observe(element);
        const image=element.querySelector('.portrait-poster');
        if(image) {
          const loading=element.querySelector('.portrait-loading-label'),error=element.querySelector('.portrait-error-label');
          if(loading)loading.hidden=!!image.complete;
          image.addEventListener('load',()=>{if(loading)loading.hidden=true;updateElement(element);});
          image.addEventListener('error',()=>{if(loading)loading.hidden=true;if(error)error.hidden=false;element.classList.add('portrait-unavailable');element.setAttribute('data-portrait-status','error');});
          if(image.complete && image.naturalWidth===0) {if(error)error.hidden=false;element.setAttribute('data-portrait-status','error');}
          const status=assetStatus(element.getAttribute('data-deity-id'));
          if(status.loop && status.treatment==='sheet' && (entry(status.loop).rows || 1)===1) {
            const e=entry(status.loop),sheet=window.document.createElement('span');sheet.className='portrait-art portrait-sheet';
            sheet.style.backgroundImage='url("'+url(status.loop).replace(/"/g,'%22')+'")';
            sheet.style.backgroundSize=(e.cols || e.frames || 6)*100+'% 100%';
            sheet.style.setProperty('--portrait-frames',String(e.frames || e.cols || 6));
            sheet.style.setProperty('--portrait-duration',String(e.duration || 2)+'s');
            element.appendChild(sheet);element.setAttribute('data-portrait-treatment','sheet');
          }
        }
      }
      updateElement(element);
    });
    elements.forEach(element=>{if(element.isConnected===false){if(observer)observer.unobserve(element);elements.delete(element);}});
  }
  function install(){
    if(installed || !window.document)return;installed=true;
    motionQuery=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
    if(typeof window.IntersectionObserver==='function')observer=new window.IntersectionObserver(entries=>entries.forEach(item=>updateElement(item.target)));
    if(motionQuery && motionQuery.addEventListener)motionQuery.addEventListener('change',()=>refresh());
    window.document.addEventListener('visibilitychange',()=>refresh());
    window.addEventListener('resize',()=>refresh());
    window.document.addEventListener('scroll',()=>refresh(),true);
    if(typeof window.MutationObserver==='function')new window.MutationObserver(()=>refresh()).observe(window.document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    refresh();
  }
  K.Portraits={roster,byId,style,forBoon,shouldAnimate,assetStatus,registerAsset,html,boonHtml,refresh,install};
})();
