/* Authored mythology packs, durable story facts and optional scene adapter. */
(function () {
  'use strict';
  const K=window.K,D=K.DATA;
  const packs=Object.create(null),figures=Object.create(null),regions=Object.create(null),scenes=Object.create(null);
  const facts=new Set(),quests=new Set(),relationships=new Set();
  const plain=value=>value && typeof value==='object' && !Array.isArray(value);
  const copy=value=>JSON.parse(JSON.stringify(value));
  const bounded=(value,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Math.trunc(Number(value)))):0;
  const unique=values=>Array.from(new Set(values));
  function registerPack(input){
    if(!plain(input) || !/^[a-z][a-z0-9_-]*$/.test(input.id || ''))throw new Error('Mythology pack needs a stable ID');
    if(packs[input.id])throw new Error('Duplicate mythology pack: '+input.id);
    if(!['greek','egyptian','roman','norse'].includes(input.tradition))throw new Error('Unknown mythology tradition');
    const pack=copy(input);pack.active=input.active===true;
    pack.figures=Array.isArray(pack.figures)?pack.figures:[];
    pack.regions=Array.isArray(pack.regions)?pack.regions:[];
    pack.scenes=Array.isArray(pack.scenes)?pack.scenes:[];
    pack.creatures=Array.isArray(pack.creatures)?pack.creatures:[];
    pack.relicProvenance=plain(pack.relicProvenance)?pack.relicProvenance:{};
    pack.mechanicalVocabulary=Array.isArray(pack.mechanicalVocabulary)?pack.mechanicalVocabulary:[];
    function validateRecords(records,registered,label){
      const local=new Set();
      records.forEach(record=>{
        if(!plain(record) || typeof record.id!=='string' || !/^[a-z][a-z0-9_:-]*$/.test(record.id))throw new Error('Invalid '+label+' ID');
        if(registered[record.id] || local.has(record.id))throw new Error('Duplicate '+label+' identity: '+record.id);
        if(input.id!=='greek' && !record.id.startsWith(input.id+':'))throw new Error('New pack identities must use their own namespace');
        local.add(record.id);
      });
      return local;
    }
    const newFigures=validateRecords(pack.figures,figures,'figure');
    validateRecords(pack.regions,regions,'region');validateRecords(pack.scenes,scenes,'scene');
    pack.scenes.forEach(scene=>{
      if(!Array.isArray(scene.characters) || !scene.characters.length || !Array.isArray(scene.contexts) || !Array.isArray(scene.voices) || !Array.isArray(scene.choices) || !scene.choices.length)throw new Error('Scene needs characters, contexts, voices and choices');
      scene.characters.forEach(id=>{
        if(!newFigures.has(id) && !figures[id])throw new Error('Unknown scene figure: '+id);
        if(figures[id] && figures[id].tradition!==pack.tradition && !scene.crossTradition)throw new Error('Cross-tradition scenes must be authored explicitly');
      });
      if(new Set(scene.choices.map(choice=>choice.id)).size!==scene.choices.length)throw new Error('Duplicate scene choice');
      scene.choices.forEach(choice=>{if(typeof choice.id!=='string' || !choice.title || !choice.reply)throw new Error('Scene choices need stable IDs and authored replies');});
    });
    packs[pack.id]=pack;
    pack.figures.forEach(figure=>{figure.tradition=pack.tradition;figure.packId=pack.id;figures[figure.id]=figure;relationships.add(figure.id);});
    pack.regions.forEach(region=>{region.tradition=pack.tradition;region.packId=pack.id;regions[region.id]=region;});
    pack.scenes.forEach(scene=>{
      scene.packId=pack.id;scene.tradition=pack.tradition;scene.priority=Number(scene.priority)||0;scenes[scene.id]=scene;
      Object.keys(scene.requires || {}).forEach(id=>facts.add(id));Object.keys(scene.excludes || {}).forEach(id=>facts.add(id));
      scene.choices.forEach(choice=>{Object.keys(choice.facts || {}).forEach(id=>facts.add(id));Object.keys(choice.quests || {}).forEach(id=>quests.add(id));});
    });
    return pack;
  }
  function campaignIndex(){const index=Object.create(null);(D.CAMPAIGN_STORY || []).forEach(chapter=>{index[chapter.id]=chapter;});return index;}
  function normalizeSave(save){
    if(!plain(save))throw new Error('Story normalization requires a save object');
    const old=plain(save.storyState)?save.storyState:{};
    const next={version:1,facts:{},relationships:{},quests:{},completed:{},seen:{},campaignChoices:{},campaignSeen:{},journal:[]};
    facts.forEach(id=>{if(plain(old.facts) && typeof old.facts[id]==='boolean')next.facts[id]=old.facts[id];});
    relationships.forEach(id=>{if(plain(old.relationships) && Object.prototype.hasOwnProperty.call(old.relationships,id))next.relationships[id]=bounded(old.relationships[id],-3,3);});
    quests.forEach(id=>{if(plain(old.quests) && Object.prototype.hasOwnProperty.call(old.quests,id))next.quests[id]=bounded(old.quests[id],0,3);});
    Object.keys(scenes).forEach(id=>{
      if(plain(old.completed) && old.completed[id]===true)next.completed[id]=true;
      if(plain(old.seen) && Object.prototype.hasOwnProperty.call(old.seen,id))next.seen[id]=bounded(old.seen[id],0,3);
    });
    const chapters=campaignIndex();
    Object.keys(chapters).forEach(id=>{
      const choice=plain(old.campaignChoices) && old.campaignChoices[id];
      if(chapters[id].choices.some(candidate=>candidate.id===choice))next.campaignChoices[id]=choice;
      if(plain(old.campaignSeen) && old.campaignSeen[id]===true)next.campaignSeen[id]=true;
    });
    if(Array.isArray(old.journal))next.journal=old.journal.filter(record=>plain(record) && scenes[record.sceneId] && scenes[record.sceneId].choices.some(choice=>choice.id===record.choiceId)).slice(-48).map(record=>({sceneId:record.sceneId,choiceId:record.choiceId,regionId:typeof record.regionId==='string'?record.regionId:'',run:bounded(record.run,0,Number.MAX_SAFE_INTEGER)}));
    /* Legacy archives remain byte-for-byte intact. Recognize only an exact
       authored chapter/choice title when rebuilding durable campaign memory. */
    if(Array.isArray(save.campaignArchive))save.campaignArchive.forEach(record=>{
      if(!plain(record))return;
      const chapter=Object.values(chapters).find(candidate=>candidate.title===record.title);
      const choice=chapter && chapter.choices.find(candidate=>candidate.id===record.choiceId || candidate.title===record.choice);
      if(chapter)next.campaignSeen[chapter.id]=true;
      if(choice && !next.campaignChoices[chapter.id])next.campaignChoices[chapter.id]=choice.id;
    });
    save.storyState=next;
    Object.keys(next.campaignChoices).forEach(id=>rememberCampaignChoice(save,id,next.campaignChoices[id],false));
    return next;
  }
  function available(scene,save,context){
    const pack=packs[scene.packId];if(!pack || !pack.active)return false;
    const state=save && save.storyState || {};
    const ctx=context || {},kind=ctx.context || 'world';
    if(!scene.contexts.includes(kind))return false;
    if(scene.regions && scene.regions.length && kind!=='house' && !scene.regions.includes(ctx.regionId))return false;
    const chapter=Number.isFinite(Number(ctx.chapter))?Number(ctx.chapter):Number(save && save.bestRegion)||0;
    if(scene.minChapter!==undefined && chapter<scene.minChapter)return false;
    if(scene.maxChapter!==undefined && chapter>scene.maxChapter)return false;
    if(ctx.characterIds && ctx.characterIds.length && !ctx.characterIds.some(id=>scene.characters.includes(id)))return false;
    if(!scene.repeat && state.completed && state.completed[scene.id])return false;
    if(scene.requires && !Object.keys(scene.requires).every(id=>(state.facts && state.facts[id])===scene.requires[id]))return false;
    if(scene.excludes && Object.keys(scene.excludes).some(id=>(state.facts && state.facts[id])===scene.excludes[id]))return false;
    if(scene.requiresQuest && !Object.keys(scene.requiresQuest).every(id=>(state.quests && state.quests[id] || 0)>=scene.requiresQuest[id]))return false;
    return true;
  }
  function currentSave(save){return save || K.Save && K.Save.data || null;}
  function scenesFor(context,save){
    save=currentSave(save);if(!save)return [];
    return Object.values(scenes).filter(scene=>available(scene,save,context)).sort((a,b)=>b.priority-a.priority || a.id.localeCompare(b.id));
  }
  function sceneFor(context,save){return scenesFor(context,save)[0] || null;}
  function resolveScene(save,id,choiceId,context){
    const scene=scenes[id],choice=scene && scene.choices.find(candidate=>candidate.id===choiceId);
    if(!save || !scene || !choice || !available(scene,save,context))return {ok:false,reason:'Scene or choice is unavailable'};
    const state=normalizeSave(save),already=!!state.completed[id];
    Object.keys(choice.facts || {}).forEach(flag=>{state.facts[flag]=choice.facts[flag]===true;});
    Object.keys(choice.relationships || {}).forEach(figure=>{if(relationships.has(figure))state.relationships[figure]=bounded((state.relationships[figure]||0)+choice.relationships[figure],-3,3);});
    Object.keys(choice.quests || {}).forEach(quest=>{if(quests.has(quest))state.quests[quest]=bounded(Math.max(state.quests[quest]||0,choice.quests[quest]),0,3);});
    state.completed[id]=true;state.seen[id]=Math.min(3,(state.seen[id]||0)+1);
    if(!already)state.journal.push({sceneId:id,choiceId,regionId:context && context.regionId || '',run:bounded(context && context.run,0,Number.MAX_SAFE_INTEGER)});
    state.journal=state.journal.slice(-48);
    if(plain(save.seenGods))scene.characters.forEach(figure=>{if(D.GODS[figure])save.seenGods[figure]=1;});
    return {ok:true,scene,choice,newlyCompleted:!already,reward:already || context && context.context==='house'?{}:copy(choice.reward || {})};
  }
  const campaignConsequences={
    river_coin:{facts:{charon_met:true},quests:{charon_crossing:1}},
    laurel_shelter:{facts:{achilles_promised:true},quests:{achilles_memory:1}},
    laurel_truth:{facts:{achilles_promised:true},quests:{achilles_memory:1}},
    song_remember:{facts:{orpheus_song_remembered:true},quests:{orpheus_song:1}},
    song_break:{facts:{orpheus_song_released:true},quests:{orpheus_song:1}},
    aeaea_cup:{facts:{circe_promised:true},quests:{circe_return:1}},
    aeaea_herb:{facts:{circe_promised:true},quests:{circe_return:1}},
    forge_repair:{facts:{council_promised:true},quests:{council_concord:1}},
    maze_open:{facts:{council_promised:true},quests:{council_concord:1}}
  };
  function rememberCampaignChoice(save,chapterId,choiceId,normalize){
    const chapter=campaignIndex()[chapterId];if(!chapter || !chapter.choices.some(choice=>choice.id===choiceId))return false;
    if(normalize!==false && !save.storyState)normalizeSave(save);
    const state=save.storyState;state.campaignChoices[chapterId]=choiceId;state.campaignSeen[chapterId]=true;
    const effect=campaignConsequences[choiceId];
    if(effect){Object.keys(effect.facts || {}).forEach(id=>{if(facts.has(id))state.facts[id]=true;});Object.keys(effect.quests || {}).forEach(id=>{if(quests.has(id))state.quests[id]=Math.max(state.quests[id]||0,effect.quests[id]);});}
    return true;
  }
  function contextualChapter(chapter,save){
    const state=save && save.storyState,oldChoice=state && state.campaignChoices[chapter.id];
    if(!oldChoice)return chapter;
    const choice=chapter.choices.find(candidate=>candidate.id===oldChoice);if(!choice)return chapter;
    const result=copy(chapter),speaker=result.voices[0];
    result.intro+=' The previous descent is remembered here.';
    if(speaker)result.voices.unshift(Object.assign({},speaker,{text:'You once chose '+choice.title.toLowerCase()+'. That choice remains part of this place; today you may answer it again.'}));
    return result;
  }
  function voice(id,text,title){const god=D.GODS[id];return {name:god?god.name.charAt(0)+god.name.slice(1).toLowerCase():(figures[id] && figures[id].name || id.charAt(0).toUpperCase()+id.slice(1)),characterId:id,godId:god?id:undefined,title:title || god && god.title || '',icon:god?'god:'+id:(id==='achilles'?'boss:achilles':id==='orpheus'?'boss:mourning_orpheus':'god:hecate'),text};}
  function choice(id,title,reply,effect){return Object.assign({id,title,reply,desc:reply},effect || {});}
  function scene(id,title,intro,characters,contexts,regionIds,lines,choices,options){return Object.assign({id,title,intro,characters,contexts,regions:regionIds,voices:lines.map(line=>voice(line[0],line[1])),choices},options || {});}
  const greekFigures=Object.values(D.GODS).map(god=>({id:god.id,name:god.name,kind:'deity',hasBoonContent:true}));
  const knownNames=new Set(greekFigures.map(figure=>figure.name.toLowerCase()));
  (D.CAMPAIGN_STORY || []).forEach(chapter=>chapter.voices.forEach(line=>{
    const id=line.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    if(!knownNames.has(line.name.toLowerCase())){greekFigures.push({id,name:line.name,kind:'mythological-figure',hasBoonContent:false});knownNames.add(line.name.toLowerCase());}
  }));
  [['mnemosyne','Mnemosyne'],['leto','Leto'],['oceanus','Oceanus'],['tethys','Tethys'],['ananke','Ananke']].forEach(([id,name])=>{
    const existing=greekFigures.find(figure=>figure.id===id);
    if(existing)existing.kind='deity';else greekFigures.push({id,name,kind:'deity',hasBoonContent:false});
  });
  const greekScenes=[
    scene('charon-crossing','A NAME FOR THE CROSSING','At the river landing, a blank fare tablet rests beside Charon’s oar. Hermes waits for the answer.',
      ['charon','hermes'],['world'],['styx','acheron'],[
        ['charon','I can carry a nameless shade, but I cannot promise that anyone will receive them. Will you carry one name beyond this bank?'],
        ['hermes','He means the names the living have stopped saying. A message can cross where a coin cannot.'],
        ['charon','Bring a remembered name to my next landing. I will keep a place aboard.']],[
        choice('charon-promise','Carry a name','I will make room for one more traveler.',{facts:{charon_met:true,charon_promised:true},quests:{charon_crossing:1},relationships:{charon:1,hermes:1}}),
        choice('charon-honest','Offer an honest limit','I can listen now; I will not make a promise I cannot keep.',{facts:{charon_met:true,charon_declined:true},relationships:{charon:1},reward:{heal:8}})],{minChapter:1,priority:20}),
    scene('charon-market-promise','THE RESERVED PLACE','A chalk mark on the ferry rail has survived the journey. Charon recognizes the promise before you speak.',
      ['charon','hermes'],['market'],[],[
        ['charon','I left this space empty. Have you decided whose name deserves it?'],
        ['hermes','The quiet shade at the last crossing asked for no favor, only that someone remember their daughter.'],
        ['charon','Then the fare has already traveled farther than the boat.']],[
        choice('charon-name','Give the remembered name','Remember the shade as a parent, not a debt.',{facts:{charon_name_carried:true},quests:{charon_crossing:2},relationships:{charon:1},reward:{obols:25}}),
        choice('charon-place','Keep the place open','Let the next forgotten traveler choose their own name.',{facts:{charon_name_carried:true},quests:{charon_crossing:2},relationships:{charon:1},reward:{heal:10}})],{requires:{charon_promised:true},priority:30}),
    scene('charon-house','THE OAR AT REST','At the House, the ferryman has set his oar against the wall. For once, there is no passenger waiting.',
      ['charon','hades'],['house'],[],[
        ['hades','Your fare tablet has one less blank line. The House noticed.'],
        ['charon','A promise reached the farther shore. That is the measure I asked for.'],
        ['hades','Then let the name remain in our ledger without another price.']],[
        choice('charon-ledger','Keep the name in the House','A crossing can end without the memory ending.',{facts:{charon_resolved:true},quests:{charon_crossing:3},relationships:{charon:1}}),
        choice('charon-living','Send the name to the living','The ledger should open toward the shore that needs it.',{facts:{charon_resolved:true},quests:{charon_crossing:3},relationships:{hermes:1}})],{requires:{charon_name_carried:true},priority:30}),
    scene('charon-first-market','THE FERRYMAN’S STALL','Lamplight settles on the wares. Charon speaks over the sound of water against the dock.',
      ['charon','hermes'],['market'],[],[
        ['charon','The market is safe. Spend only what you mean to part with; I will not take a story as payment.'],
        ['hermes','He says that because he remembers the travelers who traded away too much.']],[
        choice('charon-greeting','Ask about the crossing','I will remember the way back.',{facts:{charon_market_met:true,charon_met:true},relationships:{charon:1}}),
        choice('charon-business','Ask about the wares','Let the price be clear before the bargain.',{facts:{charon_market_met:true,charon_met:true}})],{excludes:{charon_promised:true},priority:10}),
    scene('charon-known-passage','A FAMILIAR LANDING','Charon looks up from the mooring rope. He recognizes you without consulting the fare tablet.',
      ['charon'],['world','market'],['styx','acheron'],[['charon','A return is another crossing, not the undoing of the first. The names you carried still have their place.']],[
        choice('charon-return','Acknowledge the remembered passage','The promise still stands.'),choice('charon-listen','Listen to the river','Some names travel farther in silence.')],{requires:{charon_met:true},repeat:true,priority:-20}),
    scene('achilles-memory','THE UNNAMED SHIELD','In Elysium, Achilles turns a shield so its worn inscription catches the light. Orpheus waits with his lyre lowered.',
      ['achilles','orpheus'],['world'],['elysium'],[
        ['achilles','They call these fields heroic, yet half the shields remember a king and forget the hands that held them.'],
        ['orpheus','A song can keep a name, but it should not force someone to remain a soldier.'],
        ['achilles','Find one memory that belongs to a person rather than a battle. Bring it to the higher road.']],[
        choice('achilles-remember','Seek the person beneath the armor','I will bring a life, not another victory.',{facts:{achilles_promised:true},quests:{achilles_memory:1},relationships:{achilles:1,orpheus:1}}),
        choice('achilles-witness','Offer your own witness','Tell me what you remember when the battlefield is quiet.',{facts:{achilles_promised:true},quests:{achilles_memory:1},relationships:{achilles:1},reward:{heal:8}})],{minChapter:6,priority:20}),
    scene('achilles-ascent','A SHIELD WITHOUT A WAR','On the road above the mortal cities, Achilles meets Athena without drawing his weapon.',
      ['achilles','athena'],['world'],['ancient_greece','olympus_approach','olympus'],[
        ['achilles','You asked for the person. I remember a friend waiting by a door, and the way a feast sounded before the war.'],
        ['athena','Then your shield may guard a home instead of demanding another battlefield.'],
        ['achilles','Will you leave that purpose with me, or carry it onward yourself?']],[
        choice('achilles-rest','Let the shield guard a home','Keep the memory without owing it another war.',{facts:{achilles_restored:true},quests:{achilles_memory:2},relationships:{achilles:1,athena:1},reward:{heal:12}}),
        choice('achilles-carry','Carry the purpose onward','I will name what each battle is meant to protect.',{facts:{achilles_restored:true},quests:{achilles_memory:2},relationships:{achilles:1},reward:{obols:25}})],{requires:{achilles_promised:true},minChapter:6,priority:30}),
    scene('achilles-house','THE HERO AFTER THE SONG','Achilles stands beside the House training court. Orpheus has left his lyre unstrung for the evening.',
      ['achilles','orpheus'],['house'],[],[
        ['orpheus','The new verse ends before the trumpet calls. Is that ending enough?'],
        ['achilles','It is the first ending that did not ask me to die again. Our visitor made room for it.']],[
        choice('achilles-quiet','Protect the quiet ending','Rest is part of what the shield was for.',{facts:{achilles_resolved:true},quests:{achilles_memory:3},relationships:{achilles:1}}),
        choice('achilles-teach','Ask him to teach the living','Let the lesson travel without the war.',{facts:{achilles_resolved:true},quests:{achilles_memory:3},relationships:{athena:1}})],{requires:{achilles_restored:true},priority:25}),
    scene('orpheus-river-song','THE UNFINISHED REFRAIN','Orpheus sings toward the water. Eurydice answers from the far end of a broken colonnade.',
      ['orpheus','eurydice'],['world'],['mourning','lethe_garden'],[
        ['orpheus','I have sung the journey so often that I fear the song has become another chain.'],
        ['eurydice','Then stop making my answer the price of your next verse. Ask what I wish to remember.'],
        ['orpheus','Will you help me hear the song without deciding its ending for her?']],[
        choice('orpheus-remember','Listen before you remember','A memory belongs to the person who lived it.',{facts:{orpheus_song_remembered:true},quests:{orpheus_song:1},relationships:{orpheus:1,eurydice:1}}),
        choice('orpheus-release','Let the refrain fall silent','You may keep the love without repeating the journey.',{facts:{orpheus_song_released:true,orpheus_song_remembered:true},quests:{orpheus_song:1},relationships:{eurydice:1}})],{minChapter:5,priority:20}),
    scene('orpheus-lethe','THE VERSE THAT SURVIVED','Beside Lethe’s garden wall, a remembered melody reaches Persephone before the water can swallow it.',
      ['orpheus','persephone','eurydice'],['world'],['lethe_garden','atlantis','mourning'],[
        ['persephone','The river may soften grief. It must not decide which promises were worth keeping.'],
        ['eurydice','I remember a room with an open door. Let that be the verse.'],
        ['orpheus','An open door, then. No turning back written into the chorus.']],[
        choice('orpheus-door','Keep the door open','Let the remembered room welcome another beginning.',{facts:{orpheus_song_restored:true},quests:{orpheus_song:2},relationships:{orpheus:1,eurydice:1},reward:{heal:10}}),
        choice('orpheus-new-verse','Give Eurydice the next verse','The song can answer her voice.',{facts:{orpheus_song_restored:true},quests:{orpheus_song:2},relationships:{eurydice:1,persephone:1},reward:{obols:20}})],{requires:{orpheus_song_remembered:true},minChapter:5,priority:30}),
    scene('orpheus-house','A ROOM WITH AN OPEN DOOR','The House keeps a quiet room for the musicians. Two voices try a melody with no command hidden inside it.',
      ['orpheus','eurydice'],['house'],[],[
        ['eurydice','He remembered to leave space this time. Your answer followed us back.'],
        ['orpheus','We have not forgotten the old journey. We have simply stopped asking it to be the only story.']],[
        choice('orpheus-duet','Stay for the duet','Let both voices decide where the song rests.',{facts:{orpheus_resolved:true},quests:{orpheus_song:3},relationships:{orpheus:1,eurydice:1}}),
        choice('orpheus-share','Ask them to share the refrain','Someone at the next crossing may need an open door.',{facts:{orpheus_resolved:true},quests:{orpheus_song:3},relationships:{charon:1}})],{requires:{orpheus_song_restored:true},priority:25}),
    scene('circe-vessel','THE CUP THAT RETURNS','On Aeaea, Circe places a salt-stained cup between herself and Odysseus. No one reaches for it.',
      ['circe','odysseus','hermes'],['world'],['aeaea'],[
        ['circe','They tell the tale as though every change on this island were my command. Some travelers arrive already wishing to become someone else.'],
        ['odysseus','And some leave without asking what they carried away.'],
        ['hermes','There is a broken vessel beneath the sea-road. Bring back its memory, and let the owner choose its form.']],[
        choice('circe-return','Promise to return the vessel','I will restore a choice, not decide it.',{facts:{circe_promised:true},quests:{circe_return:1},relationships:{circe:1,hermes:1}}),
        choice('circe-terms','Ask for clear terms','Let us name the promise before we carry it.',{facts:{circe_promised:true},quests:{circe_return:1},relationships:{circe:1}})],{minChapter:12,priority:20}),
    scene('circe-atlantis','THE VESSEL UNDER THE TIDE','In an Atlantean canal, a sealed niche holds the cup’s matching handle. Amphitrite watches Circe lift it clear.',
      ['circe','amphitrite'],['world'],['atlantis','aeaea'],[
        ['amphitrite','The sea kept it whole enough to be recognized. What should remain broken is a question for its owner.'],
        ['circe','Our traveler promised a choice. I can mend the vessel, or leave its scar visible so no one mistakes repair for forgetting.']],[
        choice('circe-restoration','Mend it with a visible seam','Restoration can remember what it cost.',{facts:{circe_vessel_returned:true},quests:{circe_return:2},relationships:{circe:1,amphitrite:1},reward:{heal:12}}),
        choice('circe-owner','Return the pieces to their owner','Let the hand that lost it choose the final form.',{facts:{circe_vessel_returned:true},quests:{circe_return:2},relationships:{circe:1},reward:{obols:25}})],{requires:{circe_promised:true},minChapter:12,priority:30}),
    scene('circe-house','A BARGAIN WITH AN END','Circe’s returned vessel rests at the House threshold. Hermes reads its visible seam like a route on a map.',
      ['circe','hermes'],['house'],[],[
        ['hermes','No one was transformed without being asked. That detail deserves to travel with the tale.'],
        ['circe','Then carry it. A bargain should be able to end without becoming another debt.']],[
        choice('circe-close','Let the bargain end','The promise was kept. No new price is owed.',{facts:{circe_resolved:true},quests:{circe_return:3},relationships:{circe:1}}),
        choice('circe-account','Tell the whole account','Let the next visitor hear her terms before the rumor.',{facts:{circe_resolved:true},quests:{circe_return:3},relationships:{hermes:1}})],{requires:{circe_vessel_returned:true},priority:25}),
    scene('council-forge','THE SHARED TOOL','Athena and Hephaestus argue beside a cooling forge. Prometheus sets a small flame between them.',
      ['athena','hephaestus','prometheus'],['world'],['forge','delphi'],[
        ['hephaestus','A stronger weapon will not mend a promise the council refuses to name.'],
        ['athena','Then we need a tool that repairs before it conquers. The mortal roads will show us where to begin.'],
        ['prometheus','Carry the question to the surface. A divine answer should survive being heard by the people who bear its cost.']],[
        choice('council-repair','Carry the question of repair','Ask what the road needs before asking who rules it.',{facts:{council_promised:true},quests:{council_concord:1},relationships:{athena:1,hephaestus:1}}),
        choice('council-witness','Carry the witness of the cost','Name the cost in a voice the council cannot ignore.',{facts:{council_promised:true},quests:{council_concord:1},relationships:{prometheus:1}})],{minChapter:8,priority:20}),
    scene('council-surface','THE ROAD BENEATH THE THRONES','At a roadside shrine, Athena hears Demeter and Apollo answer the same mortal petition.',
      ['athena','demeter','apollo'],['world'],['ancient_greece','delphi'],[
        ['demeter','A field cannot grow on a promise alone. Let the answer include the hands that will work it.'],
        ['apollo','And let the song name those hands, rather than only the light that falls on them.'],
        ['athena','We have heard the road. Carry this answer upward: assistance without another claim of ownership.']],[
        choice('council-road','Carry the road’s answer','The work deserves help without being possessed.',{facts:{council_surface_heard:true},quests:{council_concord:2},relationships:{athena:1,demeter:1},reward:{heal:10}}),
        choice('council-names','Carry the workers’ names','Let Olympus hear who will live with its answer.',{facts:{council_surface_heard:true},quests:{council_concord:2},relationships:{apollo:1},reward:{obols:25}})],{requires:{council_promised:true},minChapter:8,priority:30}),
    scene('council-olympus','THE ANSWER CARRIED UPWARD','On Olympus, Hera waits beside Zeus. Athena arrives carrying the petition from the mortal road.',
      ['athena','hera','zeus'],['world'],['olympus_approach','olympus'],[
        ['hera','A shared promise needs a witness when the thrones grow quiet again.'],
        ['zeus','Then let the witness stand outside our family. A mortal brought this answer up the whole road.'],
        ['athena','A bounded promise: one shrine restored, its workers free to choose their own next labor.']],[
        choice('council-bound','Witness the bounded promise','Help them rebuild; leave the road in their hands.',{facts:{council_resolved:true},quests:{council_concord:3},relationships:{athena:1,hera:1},reward:{heal:12}}),
        choice('council-public','Ask the gods to speak it publicly','Let the promise be heard wherever its cost will fall.',{facts:{council_resolved:true},quests:{council_concord:3},relationships:{zeus:1},reward:{obols:30}})],{requires:{council_surface_heard:true},minChapter:21,priority:30}),
    scene('council-house','THE PROMISE AFTER THE COUNCIL','The House receives a simple message from the surface: the shrine has a roof, and the workers have gone home.',
      ['athena','hades','hestia'],['house'],[],[
        ['hestia','That is an ending I understand. A roof, a meal, and no one required to remain a hero.'],
        ['hades','The ledger records the promise as kept. It makes no claim on what comes after.'],
        ['athena','Your witness will be remembered when the next council gathers.']],[
        choice('council-home','Let the workers go home','A promise may be complete without becoming a new debt.',{facts:{council_house_heard:true},relationships:{hestia:1}}),
        choice('council-next','Keep the answer for the next council','Remember the road when the thrones speak again.',{facts:{council_house_heard:true},relationships:{athena:1}})],{requires:{council_resolved:true},priority:25})
  ];
  const regionRecords=unique((D.REGIONS || []).map(region=>region.id).concat(['ancient_greece','atlantis','charons_market'])).map(id=>({id,kind:id==='charons_market'?'service':'campaign',family:'greek'}));
  registerPack({id:'greek',tradition:'greek',active:true,figures:greekFigures,regions:regionRecords,scenes:greekScenes,creatures:Object.keys(D.ENEMIES || {}),relicProvenance:{default:'greek'},mechanicalVocabulary:['boons','oaths','ferries','mirror','fated-threads']});
  ['egyptian','roman','norse'].forEach(id=>registerPack({id,tradition:id,active:false,figures:[],regions:[],scenes:[],creatures:[],relicProvenance:{},mechanicalVocabulary:[],introduction:'Reserved for a separately authored mythology arc; no automatic deity equivalences.'}));
  function install(Game){
    if(!Game || Game.prototype.beginMythScene)return false;
    Game.prototype.beginMythScene=function(id,context){
      if(this.pendingMythStory || !K.Save || !K.Save.data)return false;
      const ctx=Object.assign({context:'world',regionId:this.region && this.region() && this.region().id,chapter:this.regionIndex,run:this.run && this.run.ordinal || 0},context || {});
      const candidate=scenes[id];if(!candidate || !available(candidate,K.Save.data,ctx))return false;
      this.pendingMythStory={sceneId:id,scene:candidate,chapter:candidate,context:ctx,optional:true,returnPhase:this.phase || 'playing'};
      this.phase='mythStory';if(this.onTransition)this.onTransition('mythStory',this.pendingMythStory);return true;
    };
    Game.prototype.chooseMythScene=function(choiceId){
      const pending=this.pendingMythStory;if(!pending)return false;
      const result=resolveScene(K.Save.data,pending.sceneId,choiceId,pending.context);if(!result.ok)return false;
      const choice=result.choice;
      if(pending.context.context!=='house' && this.run && !this.run.outcome) {
        if(result.reward.heal && this.player)this.player.heal(result.reward.heal,this);
        if(result.reward.obols)this.run.addObols(result.reward.obols);
      }
      if(choice.fx && this.run) {
        const s=this.player?.stats; if(s){ Object.keys(choice.fx).forEach(k=>{ if(typeof choice.fx[k]==='number' && isFinite(choice.fx[k])) s[k]=(s[k]||0)+choice.fx[k]; }); this.recalcStats(); }
      }
      if(choice.affinity && this.run){ const gf=this.run.godFavor; gf[choice.affinity]=(gf[choice.affinity]||0)+1; if(this.run.godFavorHistory) this.run.godFavorHistory.push({god:choice.affinity,delta:1,time:this.run.stats.time}); }
      if(choice.side && this.run){ const sa=this.run.storyAlignment; if(sa){ sa[choice.side]=(sa[choice.side]||0)+1; } }
      if(choice.unlock && this.run){ /* unlock handled via campaignMilestones */ }
      K.Save.write();this.pendingMythStory=null;this.phase=pending.returnPhase;
      if(this.onTransition)this.onTransition('mythStoryDone',result);return true;
    };
    Game.prototype.closeMythScene=function(){const pending=this.pendingMythStory;if(!pending)return false;this.pendingMythStory=null;this.phase=pending.returnPhase;if(this.onTransition)this.onTransition('mythStoryDone',{cancelled:true});return true;};
    const begin=Game.prototype.beginCampaignStory,choose=Game.prototype.chooseStory;
    if(begin)Game.prototype.beginCampaignStory=function(){
      const transition=this.onTransition;
      this.onTransition=function(kind,payload){if(kind==='story' && payload && payload.chapter)payload.chapter=contextualChapter(payload.chapter,K.Save.data);if(transition)transition.call(this,kind,payload);};
      try{return begin.apply(this,arguments);}finally{this.onTransition=transition;}
    };
    if(choose)Game.prototype.chooseStory=function(choiceId){
      const chapter=this.pendingStory && this.pendingStory.chapter,ok=choose.call(this,choiceId);
      if(ok && chapter){
        const choice=chapter.choices.find(c=>c.id===choiceId);
        if(choice){
          if(this.run && !this.run.outcome){
            if(choice.reward){
              if(choice.reward.heal && this.player)this.player.heal(choice.reward.heal,this);
              if(choice.reward.obols)this.run.addObols(choice.reward.obols);
            }
            if(choice.fx){const s=this.player?.stats; if(s){Object.keys(choice.fx).forEach(k=>{if(typeof choice.fx[k]==='number' && isFinite(choice.fx[k]))s[k]=(s[k]||0)+choice.fx[k];});this.recalcStats();}}
            if(choice.affinity){const gf=this.run.godFavor;gf[choice.affinity]=(gf[choice.affinity]||0)+1;if(this.run.godFavorHistory)this.run.godFavorHistory.push({god:choice.affinity,delta:1,time:this.run.stats.time});}
            if(choice.side){const sa=this.run.storyAlignment;if(sa)sa[choice.side]=(sa[choice.side]||0)+1;}
          }
        }
        rememberCampaignChoice(K.Save.data,chapter.id,choiceId);K.Save.write();
      }
      return ok;
    };
    return true;
  }
  K.Mythology={version:1,packs,figures,regions,scenes,registerPack,normalizeSave,scenesFor,sceneFor,resolveScene,rememberCampaignChoice,contextualChapter,install};
  if(K.Game)install(K.Game);
})();
