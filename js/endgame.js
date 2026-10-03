/* Finite Mirror options, free run configuration, and ordinary deity build guides.
   Load after game.js and build-powers.js, before main.js creates the Game. */
(function () {
  'use strict';
  const K=window.K,D=K.DATA;
  if(K.Endgame)return;
  const BRANCHES={
    wayfinding:{id:'wayfinding',name:'Wayfinding',desc:'Information and optional route influence.',nodes:['wf_survey','wf_landmarks','wf_forks']},
    artifice:{id:'artifice',name:'Artifice',desc:'Collection choices and bounded item refinement.',nodes:['art_salvage','art_target','art_refinement']},
    divine_accord:{id:'divine_accord',name:'Divine Accord',desc:'Boon choice agency for every eligible god.',nodes:['accord_reroll','accord_patron','accord_draft']}
  };
  const NODES={
    wf_survey:{id:'wf_survey',branch:'wayfinding',name:'Surveyor’s Memory',cost:200,requires:[],desc:'Reveal terrain 96 units farther from your position.'},
    wf_landmarks:{id:'wf_landmarks',branch:'wayfinding',name:'Known Landmarks',cost:450,requires:['wf_survey'],desc:'Show service and capstone markers before their surrounding terrain is explored.'},
    wf_forks:{id:'wf_forks',branch:'wayfinding',name:'Chosen Forks',cost:900,requires:['wf_landmarks'],desc:'Choose a treasure, market, or event bias for optional branches; main-route beats remain guaranteed.'},
    art_salvage:{id:'art_salvage',branch:'artifice',name:'Careful Recovery',cost:300,requires:[],desc:'Gain one extra Salvage Shard from duplicates and dismantled items.'},
    art_target:{id:'art_target',branch:'artifice',name:'Named Provenance',cost:700,requires:['art_salvage'],desc:'Favor one set family and one Mythic trait family in eligible gear rolls; no perfect item is guaranteed.'},
    art_refinement:{id:'art_refinement',branch:'artifice',name:'Measured Refinement',cost:1200,requires:['art_target'],desc:'Permit two additional ordinary-affix refinements per item, for a lifetime maximum of five.'},
    accord_reroll:{id:'accord_reroll',branch:'divine_accord',name:'A Second Hearing',cost:250,requires:[],desc:'Begin each descent with one extra boon reroll.'},
    accord_patron:{id:'accord_patron',branch:'divine_accord',name:'Chosen Patron',cost:600,requires:['accord_reroll'],desc:'Choose any eligible god to favor in ordinary boon offers; this never blocks another god.'},
    accord_draft:{id:'accord_draft',branch:'divine_accord',name:'Wider Counsel',cost:1000,requires:['accord_patron'],desc:'Begin each descent with one additional level-up boon reroll.'}
  };
  Object.setPrototypeOf(BRANCHES,null);Object.setPrototypeOf(NODES,null);
  const current=save=>save || K.Save.data;
  const whole=value=>Number.isSafeInteger(value) && value>=0 ? value : 0;
  const owns=(save,id)=>(save.mirrorBranches || []).some(entry=>entry.id===id);
  const workbench=()=>!K.G || !K.G.run || ['idle','dead','gameover','victory'].includes(K.G.phase);
  function normalizeSave(save) {
    if(!save || typeof save!=='object')return save;
    const input=Array.isArray(save.mirrorBranches)?save.mirrorBranches:[],accepted=[];
    Object.keys(NODES).forEach(id=>{
      const node=NODES[id],entry=input.find(item=>item && item.id===id && Number.isSafeInteger(item.paid) && item.paid>=0);
      if(entry && node.requires.every(req=>accepted.some(item=>item.id===req)))accepted.push({id,paid:Math.min(node.cost,entry.paid)});
    });
    save.mirrorBranches=accepted;save.mirrorBranchVersion=1;
    const raw=save.endgamePreferences && typeof save.endgamePreferences==='object'?save.endgamePreferences:{};
    const families=Array.from(new Set(Object.values(K.Gear.TRAITS).map(t=>t.family)));
    save.endgamePreferences={
      routeBias:['treasure','shop','event'].includes(raw.routeBias)?raw.routeBias:null,
      setId:typeof raw.setId==='string' && K.Gear.SETS[raw.setId]?raw.setId:null,
      traitFamily:families.includes(raw.traitFamily)?raw.traitFamily:null,
      favoredGod:typeof raw.favoredGod==='string' && D.GODS[raw.favoredGod]?raw.favoredGod:null
    };
    return save;
  }
  function branchPreview(id,saveArg) {
    const save=current(saveArg),node=NODES[id],owned=!!node && owns(save,id);
    const reason=!node?'Unknown Mirror node.':!workbench()?'Return to the House between descents.':owned?'This finite node is already purchased.':!node.requires.every(req=>owns(save,req))?'Purchase the preceding node first.':whole(save.obols)<node.cost?'Not enough Obols.':'';
    return {ok:!reason,reason,node:node || null,cost:node?node.cost:0,owned};
  }
  function buyBranch(id) {
    const save=K.Save.data,preview=branchPreview(id,save);if(!preview.ok)return false;
    if(!Array.isArray(save.mirrorBranches))save.mirrorBranches=[];
    save.obols-=preview.cost;save.mirrorBranches.push({id,paid:preview.cost});K.Save.write();return {id,cost:preview.cost};
  }
  function refundPreview(branchId,saveArg) {
    const save=current(saveArg),valid=branchId==='all' || !!BRANCHES[branchId];
    const seen=new Set(),entries=(save.mirrorBranches || []).filter(entry=>{
      if(!entry || !NODES[entry.id] || seen.has(entry.id) || !(branchId==='all' || NODES[entry.id].branch===branchId))return false;
      seen.add(entry.id);return true;
    });
    const obols=entries.reduce((sum,entry)=>Math.min(Number.MAX_SAFE_INTEGER,sum+Math.min(NODES[entry.id].cost,whole(entry.paid))),0);
    const reason=!valid?'Unknown Mirror branch.':!workbench()?'Return to the House between descents.':!entries.length?'This branch has no purchased nodes.':'';
    return {ok:!reason,reason,obols,nodes:entries.map(entry=>entry.id),branchId};
  }
  function refundBranches(branchId) {
    const save=K.Save.data,preview=refundPreview(branchId,save);if(!preview.ok)return false;
    save.obols=Math.min(Number.MAX_SAFE_INTEGER,whole(save.obols)+preview.obols);
    save.mirrorBranches=(save.mirrorBranches || []).filter(entry=>!preview.nodes.includes(entry.id));K.Save.write();return {obols:preview.obols,nodes:preview.nodes};
  }
  function options(saveArg) {
    const save=current(saveArg),prefs=save.endgamePreferences || {};
    return {revealRadius:owns(save,'wf_survey')?96:0,mapLandmarks:owns(save,'wf_landmarks'),routeBias:owns(save,'wf_forks')?prefs.routeBias || null:null,
      salvageBonus:owns(save,'art_salvage')?1:0,gearTarget:owns(save,'art_target')?{setId:prefs.setId || null,traitFamily:prefs.traitFamily || null}:null,
      refinementCharges:owns(save,'art_refinement')?2:0,rerolls:(owns(save,'accord_reroll')?1:0)+(owns(save,'accord_draft')?1:0),
      favoredGod:owns(save,'accord_patron')?prefs.favoredGod || null:null};
  }
  function setPreferences(input) {
    const save=K.Save.data;if(!workbench() || !input || typeof input!=='object')return false;
    save.endgamePreferences=Object.assign({},save.endgamePreferences || {},input);normalizeSave(save);K.Save.write();return options(save);
  }
  function modifierPreview(selection) {
    const normalized=K.RunSystems.validateModifierSelection(selection),modifiers=K.RunSystems.modifierEffects(normalized.ranks);
    const effects=K.RunSystems.MODIFIERS.filter(def=>normalized.ranks[def.id]).map(def=>({id:def.id,name:def.name,rank:normalized.ranks[def.id],description:def.ranks[normalized.ranks[def.id]-1],counterplay:def.counterplay || 'Adapt your build, route and timing to the displayed rule.'}));
    const difficulty=K.RunSystems.MODIFIERS.reduce((sum,def)=>sum+(normalized.ranks[def.id] || 0)*(def.rewardStep<0?-1:1),0);
    const target=options().gearTarget;
    return Object.assign(normalized,{ok:normalized.valid,reason:normalized.errors.join(' '),modifiers,difficulty,rewardBonus:modifiers.rewardBonus,effects,target,
      summary:'Free configuration · '+effects.length+' active rules · '+(modifiers.rewardBonus>=0?'+':'')+Math.round(modifiers.rewardBonus*100)+'% bonus reward potential. Trial score '+normalized.score+'/24 applies only to a completed Fated Trial.'});
  }
  function configureRun(run,runOptions,saveArg) {
    const save=current(saveArg),input=runOptions || {},trialInput=input.trialPacts;
    const selection=run.practice?{}:(input.modifiers || trialInput || {}),validated=K.RunSystems.validateModifierSelection(selection);
    if(!validated.valid)return false;
    run.modifierRanks=Object.freeze(Object.assign({},validated.ranks));run.mapModifiers=run.modifierRanks;
    run.modifiers=Object.freeze(K.RunSystems.modifierEffects(run.modifierRanks));run.trialModifiers=run.modifiers;
    const trial=K.RunSystems.normalizePactSelection(trialInput);
    run.isFatedTrial=!run.practice && !input.modifiers && !!save.fatedTrialsUnlocked && trial.score>0;
    run.trialPacts=run.isFatedTrial?Object.freeze(Object.assign({},trial.ranks)):Object.freeze({});run.trialScore=run.isFatedTrial?trial.score:0;
    run.modifierVersion=K.RunSystems.MODIFIER_VERSION;run.endgameOptions=Object.freeze(options(save));
    return true;
  }

  // Deliberate choices, independent of rarity and portraits. Every named
  // foundation is an ordinary boon without prerequisite or Mirror ownership.
  const routePairs=[
    ['zeus','critBurst','castFork'],['poseidon','dashNova','castNova'],['athena','parryNova','shieldDamage'],['ares','statusDetonate','closeDamage'],
    ['aphrodite','closeDamage','parryHeal'],['artemis','critBurst','distanceDamage'],['dionysus','statusSpread','statusDetonate'],['hephaestus','parryNova','castNova'],
    ['hermes','dashStrike','killHaste'],['demeter','statusDetonate','castNova'],['hades','killNova','shieldDamage'],['chaos','castFork','statusDetonate'],
    ['hera','shieldDamage','parryNova'],['apollo','distanceDamage','critBurst'],['hestia','shieldDamage','statusSpread'],['persephone','statusSpread','killNova'],
    ['hecate','castFork','guardCast'],['nyx','critBurst','dashStrike'],['thanatos','killNova','bossHunter'],['hypnos','castNova','parryHeal'],
    ['charon','shieldDamage','killNova'],['nemesis','parryNova','bossHunter'],['nike','killHaste','killNova'],['iris','castFork','distanceDamage'],
    ['hebe','parryHeal','killHaste'],['asclepius','parryHeal','statusSpread'],['pan','dashNova','killHaste'],['eros','critBurst','distanceDamage'],
    ['eris','statusDetonate','killHaste'],['gaia','closeDamage','shieldDamage'],['kronos','guardCast','castNova'],['rhea','parryHeal','shieldDamage'],
    ['themis','guardCast','parryNova'],['tyche','critBurst','castFork'],['morpheus','castNova','castFork'],['moirai','bossHunter','critBurst'],
    ['amphitrite','castNova','dashNova'],['triton','castFork','castNova'],['boreas','dashNova','distanceDamage'],['aeolus','distanceDamage','dashStrike'],
    ['selene','critBurst','dashStrike'],['helios','castNova','critBurst'],['eos','ascendNova','rushNova'],['harmonia','guardCast','parryHeal'],
    ['prometheus','statusSpread','statusDetonate'],['atlas','shieldDamage','closeDamage'],['styx','shieldDamage','guardCast'],['phobos','killHaste','dashNova']
  ];
  const BUILD_COVERAGE=routePairs.map(([godId,...mechanics])=>({godId,name:D.GODS[godId].name,routes:mechanics.map(mechanic=>{
    const archetype=K.BoonExpansion.archetypeById[mechanic];
    return {id:godId+'-'+mechanic,name:archetype.name,mechanic,boonId:'x3_'+godId+'_'+mechanic,description:archetype.desc,counterplay:archetype.tip,
      ordinarySupport:'The ordinary foundation includes its required critical chance, shield, or status enablers. Generic gear and run rerolls are optional support.',
      endgameSupport:'Use repeated ordinary/rare boon offers, one complementary ability route, and level-30 generic gear. Mythic or Godforged is optional; all riders retain shared caps.'};
  })}));
  const API={BRANCHES,NODES,BUILD_COVERAGE,normalizeSave,branchPreview,buyBranch,refundPreview,refundBranches,options,setPreferences,modifierPreview,configureRun,atWorkbench:workbench};
  K.Endgame=API;

  // The patron branch changes which gods appear without changing the fixed three-card draft.
  const originalDraft=K.Game.prototype.generateBoonChoices;
  K.Game.prototype.generateBoonChoices=function(count,opts){
    const choices=originalDraft.call(this,count,opts),patron=this.run && this.run.endgameOptions && this.run.endgameOptions.favoredGod;
    if(!patron || choices.some(choice=>D.boonById[choice.id] && D.boonById[choice.id].god===patron))return choices;
    const pool=D.BOONS.filter(boon=>boon.god===patron && boon.slot==='passive' && !boon.req && !this.run.hasBoon(boon.id) && !choices.some(choice=>choice.id===boon.id));
    if(pool.length && choices.length){const pick=this.run.rng.pick(pool),rarity=opts && opts.rarityFloor || this.rollRarity();choices[choices.length-1]={id:pick.id,rarity,kind:'boon'};}
    return choices;
  };
})();
