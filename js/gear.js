/* ============================================================
   KATABASIS — persistent Armory, loot templates, and gear math.
   ============================================================ */
(function () {
  'use strict';
  const K = window.K, D = K.DATA;
  const SLOTS = ['weapon', 'helm', 'cuirass', 'bracers', 'waist', 'greaves'];
  const SLOT_NAMES = { weapon:'Weapon', helm:'Helm', cuirass:'Cuirass', bracers:'Bracers', waist:'Waist', greaves:'Greaves' };
  const MAX_POWER_LEVEL = 30;
  const RARITIES = {
    common:{ factor:1, affixes:0, salvage:1 }, rare:{ factor:1.15, affixes:1, salvage:2 },
    epic:{ factor:1.35, affixes:2, salvage:3 }, heroic:{ factor:1.6, affixes:3, salvage:4 },
    legendary:{ factor:2, affixes:4, salvage:5 },
    mythic:{ factor:2, affixes:4, salvage:8 }, godforged:{ factor:2, affixes:4, salvage:12 }
  };
  const WEAPONS = D.WEAPONS;
  Object.assign(WEAPONS, {
    kopis:{ id:'kopis', name:'Kopis', desc:'A forward-curved blade made for a decisive cut.', dmg:15, atkCd:0.39, reach:72, arc:1.02, combo:3 },
    dory:{ id:'dory', name:'Dory', desc:'A long ash spear that controls the space before you.', dmg:13, atkCd:0.43, reach:92, arc:0.82, combo:2 },
    labrys:{ id:'labrys', name:'Labrys', desc:'A heavy double axe with a broad, deliberate arc.', dmg:18, atkCd:0.51, reach:78, arc:1.3, combo:2 },
    makhaira:{ id:'makhaira', name:'Makhaira', desc:'A balanced cavalry sword, quick to turn and return.', dmg:13, atkCd:0.29, reach:63, arc:1.16, combo:4 },
    styx_edge:{ id:'styx_edge', name:'Styx Edge', desc:'A black river-forged blade that carries a long reach.', dmg:16, atkCd:0.37, reach:83, arc:0.96, combo:3 }
  });

  const AFFIXES = [
    { id:'force', name:'of Force', fx:{ dmgMul:0.006 } },
    { id:'vitality', name:'of Vitality', fx:{ maxHp:0.7 } },
    { id:'guard', name:'of the Bulwark', fx:{ armor:0.1 } },
    { id:'swiftness', name:'of Swiftness', fx:{ moveMul:0.004 } },
    { id:'precision', name:'of Precision', fx:{ crit:0.0025 } },
    { id:'fervor', name:'of Fervor', fx:{ attSpd:0.003 } },
    { id:'reach', name:'of the Long Hand', fx:{ reachMul:0.004 } },
    { id:'warding', name:'of Warding', fx:{ dmgReduce:0.0015 } }
  ];
  // These tiers add combat rules rather than increasing the rarity multiplier.
  // Every rider uses the shared, capped BuildPowers combat implementations.
  const TRAITS = {
    branching_rift:{id:'branching_rift',name:'Branching Rift',family:'cast',desc:'Cast fans one extra 65% impact spear; forks create no rift. At most four forks across the build.',fx:{castFork:1}},
    ward_reversal:{id:'ward_reversal',name:'Ward Reversal',family:'guard',desc:'Fresh parries release a 12-damage ring within 150 units. Shielded direct hits gain 8% damage; gain 8 shield on encounter entry.',fx:{parryNova:12,shieldDamage:0.08,shieldOnRoom:8}},
    ember_contagion:{id:'ember_contagion',name:'Ember Contagion',family:'status',desc:'Direct hits apply 4 burn damage per second for 3 seconds. A kill has a 25% chance to pass remaining statuses to at most two targets within 220 units.',fx:{statusSpread:0.25,burnOnHit:{dps:4,dur:3}}},
    blood_convergence:{id:'blood_convergence',name:'Blood Convergence',family:'status',desc:'Hits apply Bleed and Poison at 3 damage per second for 3 seconds. Direct hits on two-status targets detonate for 14 damage, once per target per second.',fx:{statusDetonate:14,bleed:{dmg:3,dur:3},poison:{dps:3,dur:3}}},
    hunters_echo:{id:'hunters_echo',name:'Hunter’s Echo',family:'hunt',desc:'Gain 4% critical chance. Direct critical hits release a 12-damage burst within 150 units, sharing a one-second cooldown.',fx:{critBurst:12,crit:0.04}},
    dusk_harvest:{id:'dusk_harvest',name:'Dusk Harvest',family:'harvest',desc:'Kills grant 4 shield and release a 12-damage ripple within 150 units. Ripple kills cannot create another ripple.',fx:{killNova:12,killShield:4}}
  };
  const IMPRINTS = {
    pursuit:{id:'pursuit',name:'Pursuit',family:'dash',desc:'Dash empowers the next Strike within 3 seconds by 16% and releases a 10-damage burst within 120 units.',fx:{dashStrike:0.16,dashNova:10}},
    reversal:{id:'reversal',name:'Reversal',family:'guard',desc:'Fresh parries recover 0.4 seconds of Cast cooldown and heal 3 life, with a shared one-second healing cooldown.',fx:{guardCast:0.4,parryHeal:3}},
    crossfire:{id:'crossfire',name:'Crossfire',family:'cast',desc:'Cast gains one extra 65% spear without a rift; original spear landings release a 12-damage nova within 120 units.',fx:{castFork:1,castNova:12}},
    reaping:{id:'reaping',name:'Reaping',family:'harvest',desc:'Kills release a 12-damage non-chaining ripple and grant 8% attack speed for 4 seconds. Further kills refresh the duration.',fx:{killNova:12,killHaste:0.08}}
  };
  const MASTERWORK_PROFILES = {
    force:{key:'closeDamage',amount:0.04,desc:'Direct damage within 100 units'},
    vitality:{key:'parryHeal',amount:1,desc:'Life on a fresh parry, shared one-second cooldown'},
    guard:{key:'shieldDamage',amount:0.04,desc:'Direct damage while shielded'},
    swiftness:{key:'dashStrike',amount:0.04,desc:'Next Strike within 3 seconds of Dash'},
    precision:{key:'critBurst',amount:6,desc:'Critical burst within 150 units, shared one-second cooldown'},
    fervor:{key:'killHaste',amount:0.03,desc:'Four seconds of attack speed after a kill, refreshes without stacking'},
    reach:{key:'distanceDamage',amount:0.04,desc:'Direct damage beyond 180 units'},
    warding:{key:'guardCast',amount:0.12,desc:'Cast cooldown recovered on a fresh parry'}
  };
  Object.setPrototypeOf(TRAITS,null);Object.setPrototypeOf(IMPRINTS,null);Object.setPrototypeOf(MASTERWORK_PROFILES,null);
  const GENERIC = [
    { id:'xiphos', name:'Xiphos of the Exile', slot:'weapon', weaponId:'xiphos', baseEffects:{ dmgMul:0.012 } },
    { id:'kopis_plain', name:'Bronze Kopis', slot:'weapon', weaponId:'kopis', baseEffects:{ dmgMul:0.016 } },
    { id:'dory_plain', name:'Ash Dory', slot:'weapon', weaponId:'dory', baseEffects:{ dmgMul:0.01, reachMul:0.006 } },
    { id:'labrys_plain', name:'Cretan Labrys', slot:'weapon', weaponId:'labrys', baseEffects:{ dmgMul:0.022, attSpd:-0.002 } },
    { id:'makhaira_plain', name:'Makhaira of the Road', slot:'weapon', weaponId:'makhaira', baseEffects:{ dmgMul:0.01, attSpd:0.004 } },
    { id:'styx_edge_plain', name:'River-Black Edge', slot:'weapon', weaponId:'styx_edge', baseEffects:{ dmgMul:0.018 } },
    { id:'bronze_helm', name:'Bronze Helm', slot:'helm', baseEffects:{ armor:0.08, maxHp:0.35 } },
    { id:'lion_helm', name:'Lion-Maned Helm', slot:'helm', baseEffects:{ maxHp:0.65 } },
    { id:'owl_helm', name:'Owl-Eyed Helm', slot:'helm', baseEffects:{ crit:0.001 } },
    { id:'bronze_cuirass', name:'Bronze Cuirass', slot:'cuirass', baseEffects:{ armor:0.16, maxHp:0.7 } },
    { id:'linen_cuirass', name:'Layered Linen Cuirass', slot:'cuirass', baseEffects:{ maxHp:1.1 } },
    { id:'scale_cuirass', name:'Scale-Woven Cuirass', slot:'cuirass', baseEffects:{ dmgReduce:0.002 } },
    { id:'bronze_bracers', name:'Bronze Bracers', slot:'bracers', baseEffects:{ armor:0.07, dmgMul:0.004 } },
    { id:'leather_bracers', name:'Boar-Hide Bracers', slot:'bracers', baseEffects:{ moveMul:0.003 } },
    { id:'woven_bracers', name:'Threaded Bracers', slot:'bracers', baseEffects:{ attSpd:0.003 } },
    { id:'bronze_waist', name:'Bronze-Fitted War Belt', slot:'waist', baseEffects:{ maxHp:0.65, armor:0.06 } },
    { id:'leather_waist', name:'Hunter’s Waistguard', slot:'waist', baseEffects:{ moveMul:0.004, maxHp:0.3 } },
    { id:'woven_waist', name:'Woven Battle Sash', slot:'waist', baseEffects:{ crit:0.0015 } },
    { id:'bronze_greaves', name:'Bronze Greaves', slot:'greaves', baseEffects:{ armor:0.1, moveMul:0.002 } },
    { id:'winged_greaves', name:'Road-Worn Greaves', slot:'greaves', baseEffects:{ moveMul:0.006 } },
    { id:'river_greaves', name:'River-Rimmed Greaves', slot:'greaves', baseEffects:{ dmgReduce:0.002 } }
  ];

  const SET_DEFS = [
    { id:'ares_bloodforged', name:'Bloodforged Arsenal', weapon:'kopis', pieceNames:['War-Crest Kopis','War-Crest Helm','War-Crest Cuirass','War-Crest Bracers','War-Crest Girdle','War-Crest Greaves'],
      effects:[{ dmgMul:0.03 },{ armor:0.08 },{ maxHp:0.6 },{ attSpd:0.006 },{ dmgMul:0.025 },{ dmgReduce:0.004 }] },
    { id:'athena_owlguard', name:'Owlguard Panoply', weapon:'xiphos', pieceNames:['Owlguard Xiphos','Owlguard Helm','Owlguard Cuirass','Owlguard Bracers','Owlguard Girdle','Owlguard Greaves'],
      effects:[{ dmgReduce:0.004 },{ armor:0.1 },{ maxHp:0.9 },{ armor:0.08 },{ dmgReduce:0.003 },{ maxHp:0.6 }] },
    { id:'artemis_moonstalker', name:'Moonstalker Raiment', weapon:'dory', pieceNames:['Moonstalker Dory','Moonstalker Hood','Moonstalker Cuirass','Moonstalker Bracers','Moonstalker Girdle','Moonstalker Greaves'],
      effects:[{ crit:0.008 },{ crit:0.004 },{ dmgMul:0.025 },{ crit:0.006 },{ moveMul:0.006 },{ reachMul:0.008 }] },
    { id:'hermes_wayfarer', name:'Wayfarer’s Panoply', weapon:'makhaira', pieceNames:['Wayfarer’s Makhaira','Wayfarer’s Helm','Wayfarer’s Cuirass','Wayfarer’s Bracers','Wayfarer’s Girdle','Wayfarer’s Greaves'],
      effects:[{ attSpd:0.007 },{ moveMul:0.005 },{ maxHp:0.5 },{ moveMul:0.007 },{ crit:0.004 },{ moveMul:0.008 }] },
    { id:'demeter_grainmother', name:'Grainmother’s Raiment', weapon:'labrys', pieceNames:['Grainmother’s Labrys','Grainmother’s Wreath','Grainmother’s Cuirass','Grainmother’s Bracers','Grainmother’s Girdle','Grainmother’s Greaves'],
      effects:[{ dmgMul:0.025 },{ maxHp:0.8 },{ maxHp:1.1 },{ armor:0.06 },{ dmgReduce:0.003 },{ maxHp:0.8 }] },
    { id:'hades_styxbound', name:'Styxbound Regalia', weapon:'styx_edge', pieceNames:['Styxbound Edge','Styxbound Helm','Styxbound Cuirass','Styxbound Bracers','Styxbound Girdle','Styxbound Greaves'],
      effects:[{ dmgMul:0.03 },{ armor:0.07 },{ dmgReduce:0.003 },{ crit:0.004 },{ attSpd:0.005 },{ dmgMul:0.02 }] }
  ];
  const SETS = {};
  const TEMPLATES = GENERIC.slice();
  SET_DEFS.forEach(set => {
    set.pieces = {};
    SLOTS.forEach((slot, i) => {
      const id = set.id + '_' + slot;
      const piece = { id, templateId:id, slot, name:set.pieceNames[i], weaponId:slot === 'weapon' ? set.weapon : null, setId:set.id, baseEffects:set.effects[i] };
      set.pieces[slot] = piece;
      TEMPLATES.push(piece);
    });
    set.bonuses = {
      2: set.id === 'ares_bloodforged' ? { dmgMul:0.06 } : set.id === 'athena_owlguard' ? { armor:0.35 } :
        set.id === 'artemis_moonstalker' ? { crit:0.018 } : set.id === 'hermes_wayfarer' ? { moveMul:0.03 } :
        set.id === 'demeter_grainmother' ? { maxHp:22 } : { dmgMul:0.05, dmgReduce:0.005 },
      4: set.id === 'ares_bloodforged' ? { attSpd:0.035 } : set.id === 'athena_owlguard' ? { dmgReduce:0.04 } :
        set.id === 'artemis_moonstalker' ? { reachMul:0.06, critMul:0.1 } : set.id === 'hermes_wayfarer' ? { dodge:0.035 } :
        set.id === 'demeter_grainmother' ? { killHeal:1.5 } : { deathDefy:1 },
      6: set.id === 'ares_bloodforged' ? { dmgMul:0.2 } : set.id === 'athena_owlguard' ? { armor:1.2, maxHp:45 } :
        set.id === 'artemis_moonstalker' ? { crit:0.06 } : set.id === 'hermes_wayfarer' ? { attSpd:0.12, moveMul:0.07 } :
        set.id === 'demeter_grainmother' ? { maxHp:100, harvestOnKill:0.1 } : { dmgMul:0.16, dmgReduce:0.025 }
    };
    SETS[set.id] = set;
  });
  const TEMPLATE_BY_ID = Object.create(null);
  TEMPLATES.forEach(t => { TEMPLATE_BY_ID[t.id] = t; });
  const GEAR = {};

  GEAR.MAX_POWER_LEVEL = MAX_POWER_LEVEL;
  GEAR.effectiveLevel = function (item) {
    return item && Number.isSafeInteger(item.level) && item.level > 0 ? Math.min(MAX_POWER_LEVEL, item.level) : 1;
  };
  GEAR.itemLevelAtDepth = function (regionIndex, chamberIndex) {
    const region = Number.isFinite(regionIndex) ? Math.max(0, Math.floor(regionIndex)) : 0;
    const chamber = Number.isFinite(chamberIndex) ? Math.max(0, Math.floor(chamberIndex)) : 0;
    return Math.max(1, Math.min(MAX_POWER_LEVEL, 1 + Math.floor((region * 8 + chamber) / 5)));
  };

  function freshStarter() {
    const t = TEMPLATE_BY_ID.xiphos;
    return { id:'starter-xiphos', templateId:t.id, slot:'weapon', name:t.name, rarity:'common', level:1, setId:null,
      weaponId:'xiphos', baseEffects:{ dmgMul:0.012 }, affixes:[], upgrades:0,
      mythicTrait:null,imprintOptions:[],imprint:null,masterworkFocus:null,masterworkRanks:0,refinements:0 };
  }
  function rarityKey(value) { return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RARITIES, value) ? value : 'common'; }
  function cleanFx(fx) {
    const out = {};
    if (!fx || typeof fx !== 'object' || Array.isArray(fx)) return out;
    Object.keys(fx).forEach(k => { if (typeof fx[k] === 'number' && Number.isFinite(fx[k])) out[k] = fx[k]; });
    return out;
  }
  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof raw.id !== 'string' || !raw.id || !SLOTS.includes(raw.slot)) return null;
    const t = typeof raw.templateId === 'string' ? TEMPLATE_BY_ID[raw.templateId] : null;
    if (!t || t.slot !== raw.slot) return null;
    const level = Number.isSafeInteger(raw.level) && raw.level > 0 ? raw.level : 1;
    const rarity = rarityKey(raw.rarity);
    const affixes = Array.isArray(raw.affixes) ? raw.affixes.filter(a => a && AFFIXES.some(x => x.id === a.id)).map(a => {
      const def = AFFIXES.find(x => x.id === a.id);
      return { id:def.id, name:def.name, fx:cleanFx(a.fx && Object.keys(a.fx).length ? a.fx : def.fx) };
    }).slice(0, RARITIES[rarity].affixes) : [];
    const item = { id:raw.id, templateId:t.id, slot:t.slot, name:typeof raw.name === 'string' ? raw.name : t.name,
      rarity, level, setId:typeof raw.setId === 'string' && Object.prototype.hasOwnProperty.call(SETS, raw.setId) ? raw.setId : (t.setId || null), weaponId:t.weaponId || (typeof raw.weaponId === 'string' ? raw.weaponId : null),
      baseEffects:Object.keys(cleanFx(raw.baseEffects)).length ? cleanFx(raw.baseEffects) : cleanFx(t.baseEffects),
      affixes, upgrades:Number.isSafeInteger(raw.upgrades) && raw.upgrades >= 0 ? raw.upgrades : 0,
      mythicTrait:['mythic','godforged'].includes(rarity) && typeof raw.mythicTrait==='string' && TRAITS[raw.mythicTrait] ? raw.mythicTrait : null,
      imprintOptions:rarity==='godforged' && Array.isArray(raw.imprintOptions) ? Array.from(new Set(raw.imprintOptions.filter(id=>typeof id==='string' && IMPRINTS[id]))).slice(0,4) : [],
      imprint:null, masterworkFocus:null,masterworkRanks:0,refinements:Math.max(0,Math.min(5,Number.isSafeInteger(raw.refinements)?raw.refinements:0)) };
    item.imprint=rarity==='godforged' && item.imprintOptions.includes(raw.imprint) ? raw.imprint : null;
    const focus=typeof raw.masterworkFocus==='string' ? raw.masterworkFocus : null;
    if (GEAR.effectiveLevel(item)>=MAX_POWER_LEVEL && focusProfile(item,focus)) {
      item.masterworkFocus=focus;item.masterworkRanks=Math.max(0,Math.min(3,Number.isSafeInteger(raw.masterworkRanks)?raw.masterworkRanks:0));
      if(!item.masterworkRanks)item.masterworkFocus=null;
    }
    return item;
  }
  function itemById(save, id) { return save.gearInventory.find(x => x.id === id) || null; }
  function isEquipped(save, id) { return SLOTS.some(slot => save.equippedGear[slot] === id); }
  function writeAndRecalc(preserveHealth) {
    K.Save.write();
    if (K.G && K.G.run && K.G.recalcStats) {
      const p = K.G.player;
      const fraction = p && p.stats.maxHp > 0 ? p.hp / p.stats.maxHp : 1;
      K.G.recalcStats();
      if (preserveHealth && p) p.hp = Math.max(0, Math.min(p.stats.maxHp, p.stats.maxHp * fraction));
    }
  }
  function fingerprint(item) {
    return JSON.stringify([item.templateId, item.slot, item.level, item.rarity, item.setId || null,
      item.affixes.map(a => [a.id, Object.keys(a.fx || {}).sort().map(k => [k, a.fx[k]])]),
      item.mythicTrait || null,item.imprintOptions || [],item.imprint || null,item.masterworkFocus || null,item.masterworkRanks || 0,item.refinements || 0]);
  }
  function uniqueId(candidate, inventory, rng) {
    let id = candidate, suffix = 0;
    while (inventory.some(x => x.id === id)) { suffix++; id = candidate + '-' + (rng ? Math.floor(rng.next() * 0xffffff).toString(36) : suffix.toString(36)); }
    return id;
  }
  function safeAdd(a, b) { return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(a || 0) + Math.floor(b || 0))); }
  function workbenchOpen() { return !K.G || !K.G.run || ['idle','dead','gameover','victory'].includes(K.G.phase); }
  function campaignUnlocked(save, milestone) { return !!((save.campaignMilestones && save.campaignMilestones[milestone]) || save.wins>0); }
  function afford(save,cost) { return Number.isSafeInteger(save.obols) && save.obols>=cost.obols && Number.isSafeInteger(save.salvageShards) && save.salvageShards>=cost.shards; }
  function spend(save,cost) { save.obols-=cost.obols;save.salvageShards-=cost.shards; }
  function focusProfile(item, focus) {
    if(!item || typeof focus!=='string')return null;
    if(focus==='signature'){
      const keys=Object.keys(item.baseEffects || {}),map={dmgMul:'force',maxHp:'vitality',armor:'guard',moveMul:'swiftness',crit:'precision',attSpd:'fervor',reachMul:'reach',dmgReduce:'warding'};
      return MASTERWORK_PROFILES[map[keys.find(key=>map[key])] || 'force'];
    }
    if(focus.indexOf('affix:')===0){const id=focus.slice(6);return item.affixes.some(a=>a.id===id)?MASTERWORK_PROFILES[id] || null:null;}
    if(focus==='trait:'+item.mythicTrait && TRAITS[item.mythicTrait]){
      const def=TRAITS[item.mythicTrait],key=Object.keys(def.fx).find(k=>['castFork','parryNova','statusSpread','statusDetonate','critBurst','killNova'].includes(k));
      return {key,amount:key==='castFork'?1:key==='statusSpread'?0.08:6,desc:def.desc};
    }
    if(focus==='imprint:'+item.imprint && IMPRINTS[item.imprint]){
      const def=IMPRINTS[item.imprint],key=Object.keys(def.fx)[0];return {key,amount:key==='castFork'?1:key==='guardCast'?0.12:key==='dashStrike'?0.04:6,desc:def.desc};
    }
    return null;
  }
  function mergeEffects(total,fx,scale) {
    Object.keys(fx || {}).forEach(key=>{
      const value=fx[key];
      if(typeof value==='number' && Number.isFinite(value))total[key]=(typeof total[key]==='number'?total[key]:0)+value*scale;
      else if(value && typeof value==='object' && !Array.isArray(value)){
        if(!total[key] || typeof total[key]!=='object')total[key]={};
        Object.keys(value).forEach(sub=>{if(typeof value[sub]==='number' && Number.isFinite(value[sub]))total[key][sub]=['dur','n','mul'].includes(sub)?Math.max(total[key][sub] || 0,value[sub]):(total[key][sub] || 0)+value[sub]*scale;});
      }
    });
  }
  GEAR.focuses = function (item) {
    if(typeof item==='string')item=itemById(K.Save.data,item);
    if(!item)return [];
    const list=[{id:'signature',name:'Signature interaction'}].concat(item.affixes.map(a=>({id:'affix:'+a.id,name:a.name})));
    if(item.mythicTrait && TRAITS[item.mythicTrait])list.push({id:'trait:'+item.mythicTrait,name:TRAITS[item.mythicTrait].name});
    if(item.imprint && IMPRINTS[item.imprint])list.push({id:'imprint:'+item.imprint,name:IMPRINTS[item.imprint].name});
    return list.map(entry=>Object.assign(entry,{profile:focusProfile(item,entry.id)})).filter(entry=>entry.profile);
  };
  GEAR.itemEffects = function (item) {
    const total={};if(!item)return total;
    const scale=GEAR.effectiveLevel(item)*RARITIES[rarityKey(item.rarity)].factor;
    mergeEffects(total,item.baseEffects,scale);item.affixes.forEach(a=>mergeEffects(total,a.fx,scale));
    if(item.mythicTrait && TRAITS[item.mythicTrait])mergeEffects(total,TRAITS[item.mythicTrait].fx,1);
    if(item.imprint && IMPRINTS[item.imprint])mergeEffects(total,IMPRINTS[item.imprint].fx,1);
    const profile=focusProfile(item,item.masterworkFocus),rank=Math.max(0,Math.min(3,item.masterworkRanks || 0));
    if(profile && rank){mergeEffects(total,{[profile.key]:profile.amount*rank},1);if(profile.key==='shieldDamage')mergeEffects(total,{shieldOnRoom:3*rank},1);}
    if(K.BuildPowers)K.BuildPowers.capStats(total);
    return total;
  };
  GEAR.statsPreview = function (item) {
    if(!K.compileStats || !K.G || !K.G.run || !item)return null;
    const previous=K.Save.data,save=Object.assign({},previous,{gearInventory:previous.gearInventory.map(other=>other.id===item.id?item:other),equippedGear:Object.assign({},previous.equippedGear,{[item.slot]:item.id})});
    try{K.Save.data=save;return K.compileStats(K.G.run,null);}finally{K.Save.data=previous;}
  };

  GEAR.normalizeSave = function (save) {
    if (!save || typeof save !== 'object') return save;
    if (!Array.isArray(save.unlockedWeapons)) save.unlockedWeapons = ['xiphos'];
    if (typeof save.weapon !== 'string' || !WEAPONS[save.weapon]) save.weapon = 'xiphos';
    save.gearInventory = (Array.isArray(save.gearInventory) ? save.gearInventory : []).map(normalizeItem).filter(Boolean);
    if (!save.gearInventory.length) save.gearInventory.push(freshStarter());
    const used = new Set();
    save.gearInventory.forEach(item => { if (used.has(item.id)) item.id = uniqueId(item.id, save.gearInventory.filter(x => x !== item)); used.add(item.id); });
    if (!save.equippedGear || typeof save.equippedGear !== 'object' || Array.isArray(save.equippedGear)) save.equippedGear = {};
    const cleanEquipped = {};
    SLOTS.forEach(slot => {
      const id = save.equippedGear[slot];
      const item = id && itemById(save, id);
      cleanEquipped[slot] = item && item.slot === slot ? item.id : null;
    });
    save.equippedGear = cleanEquipped;
    if (!save.equippedGear.weapon) {
      const starter = itemById(save, 'starter-xiphos') || save.gearInventory.find(x => x.slot === 'weapon');
      if (starter) save.equippedGear.weapon = starter.id;
    }
    const weapon = itemById(save, save.equippedGear.weapon);
    if (weapon) {
      const weaponId = weapon.weaponId || weapon.templateId;
      if (WEAPONS[weaponId]) {
        save.weapon = weaponId;
        if (!save.unlockedWeapons.includes(weaponId)) save.unlockedWeapons.push(weaponId);
      } else save.weapon = 'xiphos';
    }
    save.salvageShards = Number.isSafeInteger(save.salvageShards) && save.salvageShards >= 0 ? save.salvageShards : 0;
    return save;
  };

  GEAR.rewardPreview = function (context) {
    context=context && typeof context==='object' ? context : {};
    const endgame=context.endgame===true && !context.practice, boosted=endgame && (context.modified || context.boss);
    const bonus=Math.max(-0.4,Math.min(0.6,Number.isFinite(context.rewardBonus)?context.rewardBonus:0));
    const weights={common:58,rare:24,epic:11,heroic:5,legendary:2};
    if(endgame){weights.common=boosted?32:46;weights.epic+=8*Math.max(0,bonus);weights.legendary+=5*Math.max(0,bonus);weights.mythic=boosted?4+8*Math.max(0,bonus):0.8;weights.godforged=boosted?0.8+2*Math.max(0,bonus):0.12;}
    if(bonus<0){weights.common+=Math.abs(bonus)*30;weights.epic*=1+bonus;weights.heroic*=1+bonus;weights.legendary*=1+bonus;}
    const sum=Object.values(weights).reduce((a,b)=>a+b,0);
    return {rarities:Object.keys(weights),weights,odds:Object.keys(weights).map(id=>({id,chance:weights[id]/sum})),target:context.target || null,
      summary:endgame?(boosted?'Modified maps and capstones favor Mythic and Godforged rolls.':'Rare endgame tiers are possible; modified maps and capstones improve their odds.'):'Common through Legendary; Mythic and Godforged unlock after campaign victory.'};
  };
  GEAR.rewardContext = function (run, regionId, boss) {
    const save=K.Save && K.Save.data || {},modifiers=run && (run.modifiers || run.trialModifiers) || {};
    const options=K.Endgame && K.Endgame.options ? K.Endgame.options(save) : {};
    return {endgame:!!((save.campaignMilestones && save.campaignMilestones.campaignVictory) || save.wins>0),practice:!!(run && run.practice),
      modified:!!(run && Object.keys(run.modifierRanks || run.trialPacts || {}).length),boss:!!boss,regionId,
      rewardBonus:modifiers.rewardBonus || 0,target:options.gearTarget || null};
  };
  GEAR.generate = function (slot, level, rng, rarity, context) {
    if (!SLOTS.includes(slot)) return null;
    rng = rng && typeof rng.next === 'function' ? rng : new K.RNG(Math.floor(Math.random() * 0xffffffff));
    const options = TEMPLATES.filter(t => t.slot === slot);
    const target=context && context.target || {};
    const targeted=target.setId && SETS[target.setId] ? options.filter(t=>t.setId===target.setId) : [];
    const template = targeted.length && rng.chance(0.45) ? rng.pick(targeted) : options[Math.floor(rng.next() * options.length)];
    const reward=GEAR.rewardPreview(context);
    const tier = rarityKey(rarity || rng.weighted(reward.rarities,reward.rarities.map(id=>reward.weights[id])));
    const tierInfo = RARITIES[tier];
    const picked = rng.shuffle(AFFIXES).slice(0, tierInfo.affixes).map(a => ({ id:a.id, name:a.name, fx:Object.assign({}, a.fx) }));
    const set = template.setId ? SETS[template.setId] : null;
    const prefix = { common:'Worn', rare:'Fine', epic:'Epic', heroic:'Heroic', legendary:'Legendary',mythic:'Mythic',godforged:'Godforged' }[tier];
    const id = 'gear-' + Math.floor(rng.next() * 0x100000000).toString(36) + '-' + slot;
    let mythicTrait=null,imprintOptions=[];
    if(['mythic','godforged'].includes(tier)){
      const traits=Object.values(TRAITS),favored=traits.filter(t=>t.family===target.traitFamily);
      mythicTrait=(favored.length && rng.chance(0.65)?rng.pick(favored):rng.pick(traits)).id;
    }
    if(tier==='godforged')imprintOptions=rng.chance(0.5)?['pursuit','reversal']:['crossfire','reaping'];
    return { id, templateId:template.id, slot, name:(tier === 'common' ? '' : prefix + ' ') + template.name,
      rarity:tier, level:Math.min(MAX_POWER_LEVEL, Number.isSafeInteger(level) && level > 0 ? level : 1),
      setId:template.setId || null, setName:set ? set.name : null, weaponId:template.weaponId || null,
      baseEffects:Object.assign({}, template.baseEffects), affixes:picked, upgrades:0,
      mythicTrait,imprintOptions,imprint:null,masterworkFocus:null,masterworkRanks:0,refinements:0 };
  };

  GEAR.add = function (raw) {
    const save = K.Save.data, item = normalizeItem(raw);
    if (!item) return false;
    const fp = fingerprint(item), dupe = save.gearInventory.find(x => fingerprint(x) === fp);
    if (dupe) {
      const shards=GEAR.salvageValue(item,save);
      save.salvageShards = safeAdd(save.salvageShards, shards);
      K.Save.write();
      return { added:false, duplicate:true, shards };
    }
    item.id = uniqueId(item.id, save.gearInventory);
    save.gearInventory.push(item);
    K.Save.write();
    return { added:true, duplicate:false, item };
  };

  GEAR.equip = function (instanceId, slot) {
    const save = K.Save.data, item = itemById(save, instanceId);
    if (!item || !SLOTS.includes(slot) || item.slot !== slot) return false;
    save.equippedGear[slot] = item.id;
    if (slot === 'weapon') {
      save.weapon = item.weaponId || item.templateId;
      if (!Array.isArray(save.unlockedWeapons)) save.unlockedWeapons = ['xiphos'];
      if (!save.unlockedWeapons.includes(save.weapon)) save.unlockedWeapons.push(save.weapon);
      if (K.G && K.G.run) K.G.run.weapon = save.weapon;
    }
    writeAndRecalc(true);
    return true;
  };

  GEAR.upgradeCost = function (item) {
    const level = GEAR.effectiveLevel(item);
    if (!item || level >= MAX_POWER_LEVEL) return Infinity;
    const raw = 100 * Math.pow(level + 1, 1.35) * RARITIES[rarityKey(item.rarity)].factor;
    return Number.isFinite(raw) ? Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(raw)) : Number.MAX_SAFE_INTEGER;
  };
  GEAR.reinforcementPreview = function (instanceId) {
    const save=K.Save.data,item=typeof instanceId==='object'?instanceId:itemById(save,instanceId),cost={obols:GEAR.upgradeCost(item),shards:1};
    let reason=!item?'Select an item.':!workbenchOpen()?'Return to the House workbench between descents.':!campaignUnlocked(save,'actI')?'Complete the Act I capstone to unlock Reinforcement.':GEAR.effectiveLevel(item)>=MAX_POWER_LEVEL?'Effective level 30 is the Reinforcement cap.':!afford(save,cost)?'Not enough Obols or Salvage Shards.':'';
    const next=item?Object.assign({},item,{level:Math.min(MAX_POWER_LEVEL,GEAR.effectiveLevel(item)+1)}):null;
    return {ok:!reason,reason,cost,level:next && next.level,before:GEAR.itemEffects(item),after:GEAR.itemEffects(next),beforeStats:GEAR.statsPreview(item),afterStats:GEAR.statsPreview(next)};
  };
  GEAR.upgrade = function (instanceId) {
    const save = K.Save.data, item = itemById(save, instanceId);
    const preview=GEAR.reinforcementPreview(instanceId);if(!preview.ok)return false;
    const cost = preview.cost.obols;
    spend(save,preview.cost); item.level++; item.upgrades++;
    writeAndRecalc();
    return { cost, level:item.level };
  };
  GEAR.reinforce=GEAR.upgrade;
  GEAR.masterworkPreview = function (instanceId, focus) {
    const save=K.Save.data,item=itemById(save,instanceId),profile=focusProfile(item,focus),rank=item && item.masterworkRanks || 0;
    const cost={obols:[1200,2400,4800][rank] || 0,shards:[3,5,8][rank] || 0};
    const reason=!item?'Select an item.':!workbenchOpen()?'Return to the House workbench between descents.':!campaignUnlocked(save,'campaignVictory')?'Complete the campaign to unlock Masterworking.':GEAR.effectiveLevel(item)<MAX_POWER_LEVEL?'Reinforce this item to effective level 30 first.':!profile?'Choose a compatible existing affix, signature, trait or imprint.':rank>=3?'Three Masterwork ranks is the final rank.':rank>0 && item.masterworkFocus!==focus?'Reset the current Masterwork before changing focus.':!afford(save,cost)?'Not enough Obols or Salvage Shards.':'';
    const next=item?Object.assign({},item,{masterworkFocus:focus,masterworkRanks:Math.min(3,rank+1)}):null;
    const ranks=profile?[1,2,3].map(n=>({rank:n,description:profile.desc,fx:{[profile.key]:profile.amount*n},cost:{obols:[1200,2400,4800][n-1],shards:[3,5,8][n-1]}})):[];
    return {ok:!reason,reason,cost,focus,rank:Math.min(3,rank+1),ranks,before:GEAR.itemEffects(item),after:GEAR.itemEffects(next),beforeStats:GEAR.statsPreview(item),afterStats:GEAR.statsPreview(next)};
  };
  GEAR.masterwork = function (instanceId,focus) {
    const save=K.Save.data,item=itemById(save,instanceId),preview=GEAR.masterworkPreview(instanceId,focus);if(!preview.ok)return false;
    spend(save,preview.cost);item.masterworkFocus=focus;item.masterworkRanks=preview.rank;writeAndRecalc();return {rank:item.masterworkRanks,focus,cost:preview.cost};
  };
  GEAR.resetMasterworkPreview = function (instanceId) {
    const save=K.Save.data,item=itemById(save,instanceId),rank=item && item.masterworkRanks || 0,cost={obols:600+300*rank,shards:rank};
    const reason=!item?'Select an item.':!workbenchOpen()?'Return to the House workbench between descents.':!rank?'This item has no Masterwork to reset.':!afford(save,cost)?'Not enough Obols or Salvage Shards.':'';
    return {ok:!reason,reason,cost,refundedRanks:rank};
  };
  GEAR.resetMasterwork = function (instanceId) {
    const save=K.Save.data,item=itemById(save,instanceId),preview=GEAR.resetMasterworkPreview(instanceId);if(!preview.ok)return false;
    spend(save,preview.cost);item.masterworkFocus=null;item.masterworkRanks=0;writeAndRecalc();return {cost:preview.cost};
  };
  GEAR.refinementPreview = function (instanceId, affixId, replacementId) {
    const save=K.Save.data,item=itemById(save,instanceId),replacement=AFFIXES.find(a=>a.id===replacementId),options=K.Endgame && K.Endgame.options?K.Endgame.options(save):{};
    const limit=3+(options.refinementCharges || 0),used=item && item.refinements || 0,cost={obols:750+used*250,shards:3};
    const reason=!item?'Select an item.':!workbenchOpen()?'Return to the House workbench between descents.':!campaignUnlocked(save,'campaignVictory')?'Complete the campaign to unlock affix refinement.':used>=limit?'This item has used its '+limit+' refinements.':!item.affixes.some(a=>a.id===affixId) || !replacement?'Choose an ordinary affix and a valid replacement.':item.affixes.some(a=>a.id===replacementId)?'The replacement affix is already on this item.':item.masterworkRanks>0 && item.masterworkFocus==='affix:'+affixId?'Reset this affix’s Masterwork before refining it.':!afford(save,cost)?'Not enough Obols or Salvage Shards.':'';
    const next=item?Object.assign({},item,{affixes:item.affixes.map(a=>a.id===affixId && replacement?{id:replacement.id,name:replacement.name,fx:Object.assign({},replacement.fx)}:a)}):null;
    return {ok:!reason,reason,cost,used,limit,before:GEAR.itemEffects(item),after:GEAR.itemEffects(next),beforeStats:GEAR.statsPreview(item),afterStats:GEAR.statsPreview(next)};
  };
  GEAR.refine = function (instanceId,affixId,replacementId) {
    const save=K.Save.data,item=itemById(save,instanceId),preview=GEAR.refinementPreview(instanceId,affixId,replacementId);if(!preview.ok)return false;
    const def=AFFIXES.find(a=>a.id===replacementId),index=item.affixes.findIndex(a=>a.id===affixId);
    spend(save,preview.cost);item.affixes[index]={id:def.id,name:def.name,fx:Object.assign({},def.fx)};item.refinements=(item.refinements || 0)+1;writeAndRecalc();return {cost:preview.cost,refinements:item.refinements};
  };
  GEAR.imprintPreview = function (instanceId, imprintId) {
    const item=itemById(K.Save.data,instanceId),def=IMPRINTS[imprintId];
    const reason=!item?'Select an item.':!workbenchOpen()?'Return to the House workbench between descents.':item.rarity!=='godforged' || !def || !item.imprintOptions.includes(imprintId)?'Choose an imprint offered by this Godforged item.':item.masterworkRanks>0 && item.masterworkFocus==='imprint:'+item.imprint && item.imprint!==imprintId?'Reset the imprint’s Masterwork before changing it.':'';
    const next=item?Object.assign({},item,{imprint:imprintId}):null;
    return {ok:!reason,reason,cost:{obols:0,shards:0},imprint:def || null,before:GEAR.itemEffects(item),after:GEAR.itemEffects(next),beforeStats:GEAR.statsPreview(item),afterStats:GEAR.statsPreview(next)};
  };
  GEAR.selectImprint = function (instanceId,imprintId) {
    const preview=GEAR.imprintPreview(instanceId,imprintId);if(!preview.ok)return false;itemById(K.Save.data,instanceId).imprint=imprintId;writeAndRecalc();return {imprint:imprintId};
  };
  GEAR.sellValue = function (item) { return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(10 * GEAR.effectiveLevel(item) * RARITIES[rarityKey(item.rarity)].factor))); };
  GEAR.sell = function (instanceId) {
    const save = K.Save.data, item = itemById(save, instanceId);
    if (!item || isEquipped(save, instanceId)) return false;
    const value = GEAR.sellValue(item);
    save.gearInventory.splice(save.gearInventory.indexOf(item), 1);
    save.obols = safeAdd(save.obols, value); K.Save.write();
    return value;
  };
  GEAR.salvage = function (instanceId) {
    const save = K.Save.data, item = itemById(save, instanceId);
    if (!item || isEquipped(save, instanceId)) return false;
    const shards = GEAR.salvageValue(item,save);
    save.gearInventory.splice(save.gearInventory.indexOf(item), 1);
    save.salvageShards = safeAdd(save.salvageShards, shards); K.Save.write();
    return { shards };
  };
  GEAR.salvageValue = function (item,save) { const options=K.Endgame && K.Endgame.options?K.Endgame.options(save):{};return RARITIES[rarityKey(item && item.rarity)].salvage+(options.salvageBonus || 0); };

  GEAR.effects = function (save) {
    save = save || K.Save.data;
    const total = {}, counts = {};
    function add(fx, scale) {
      mergeEffects(total,fx,scale);
    }
    SLOTS.forEach(slot => {
      const item = itemById(save, save.equippedGear && save.equippedGear[slot]);
      if (!item) return;
      add(GEAR.itemEffects(item),1);
      if (item.setId && SETS[item.setId]) counts[item.setId] = (counts[item.setId] || 0) + 1;
    });
    Object.keys(counts).forEach(id => {
      const set = SETS[id], count = counts[id];
      [2,4,6].forEach(n => { if (count >= n) add(set.bonuses[n], 1); });
    });
    return total;
  };
  GEAR.SLOTS = SLOTS.slice();
  GEAR.SLOT_NAMES = SLOT_NAMES;
  GEAR.RARITIES = RARITIES;
  GEAR.AFFIXES = AFFIXES;
  GEAR.SETS = SETS;
  GEAR.TEMPLATES = TEMPLATES;
  GEAR.TRAITS=TRAITS;
  GEAR.IMPRINTS=IMPRINTS;
  GEAR.MASTERWORK_PROFILES=MASTERWORK_PROFILES;
  K.Gear = GEAR;
})();
