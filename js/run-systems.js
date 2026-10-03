/* ============================================================
   KATABASIS — declarative run systems: heroes, relic transforms,
   synergies, augments, quests, starting unlocks, and build sharing.
   ============================================================ */
(function () {
  'use strict';
  const K = window.K;
  const D = K.DATA;

  const HEROES = {
    perseus: {
      id:'perseus', name:'PERSEUS', epithet:'The Gorgon Slayer', weapon:'xiphos',
      art:'actor.player.perseus', style:'shield', unlockAt:0,
      desc:'A measured duelist. His first parry each chamber sends a mirrored answer back.',
      fx:{ deflectProj:0.16, riposte:0.25 },
      upgrades:[
        {id:'perseus_mirror',name:'Mirror Guard',desc:'Longer Guard and a sharper parry.',fx:{guardMul:0.14,riposte:0.12}},
        {id:'perseus_hunter',name:'Gorgon Hunter',desc:'Marked and slowed foes take stronger strikes.',fx:{crit:0.08,weakMul:0.12}},
        {id:'perseus_aegis',name:'Aegis Memory',desc:'Begin each chamber behind a ward.',fx:{shieldOnRoom:18}}
      ]
    },
    atalanta: {
      id:'atalanta', name:'ATALANTA', epithet:'The Swift Huntress', weapon:'dory',
      art:'actor.player.atalanta', style:'ranged', unlockAt:1,
      desc:'A mobile archer. Her Strike is a fast arrow; movement fuels critical aim.',
      fx:{crit:0.07,dashCharge:1,powerShot:4,projDmg:0.1},
      upgrades:[
        {id:'atalanta_fleet',name:'Fleet of Arcadia',desc:'More dash distance and a hunting mark on every fourth shot.',fx:{dashDist:0.16,critMark:0.08}},
        {id:'atalanta_barbed',name:'Barbed Arrows',desc:'Arrows poison and bleed their target.',fx:{poison:{dps:7,dur:3},bleed:{dmg:10,dur:3}}},
        {id:'atalanta_moon',name:'Moonshot',desc:'Power shots pierce harder and find weak points.',fx:{pierce:2,crit:0.08,critMul:0.22}}
      ]
    },
    orpheus: {
      id:'orpheus', name:'ORPHEUS', epithet:'The Singer Below', weapon:'makhaira',
      art:'actor.player.orpheus', style:'resonant', unlockAt:4,
      desc:'A resonant performer. Strikes carry a short song-wave; Wrath builds faster.',
      fx:{waveOnHit:1,waveDmg:8,specialMul:0.12,charm:0.04},
      upgrades:[
        {id:'orpheus_echo',name:'Echoing Verse',desc:'Cast bursts twice and slows those caught in the refrain.',fx:{castMul:0.18,slowOnHit:0.08}},
        {id:'orpheus_lament',name:'Lament for the Lost',desc:'A kill restores life and feeds the next Wrath.',fx:{killHeal:2,specialMul:0.12}},
        {id:'orpheus_immortal',name:'Unfinished Song',desc:'Gain another Death Defiance.',fx:{deathDefy:1,callBoost:0.1}}
      ]
    }
  };

  const STARTERS = [
    {id:'xiphos',name:'Exile’s Xiphos',desc:'Quick balanced cuts.',unlockAt:0},
    {id:'kopis',name:'Bronze Kopis',desc:'Heavy, broad finishing arc.',unlockAt:1},
    {id:'dory',name:'Ash Dory',desc:'Long reach and a steady rhythm.',unlockAt:2},
    {id:'labrys',name:'Cretan Labrys',desc:'Slow, crushing two-handed blows.',unlockAt:3},
    {id:'makhaira',name:'Makhaira',desc:'Fast paired cuts.',unlockAt:5},
    {id:'styx_edge',name:'Styx Edge',desc:'A balanced blade that bites through armor.',unlockAt:8}
  ];

  const AUGMENTS = [
    {id:'venom_edge',name:'Venom Edge',desc:'Strikes and owned status-bearing projectiles apply Poison for 9 damage per second for 3 seconds.',fx:{poison:{dps:9,dur:3}},color:'#8bc779'},
    {id:'ricochet_cast',name:'Returning Cast',desc:'Each Cast fires 2 smaller seeking projectiles, each at 50% spear impact damage. Cast damage +8%.',fx:{castEcho:2,castMul:0.08},color:'#70cddd'},
    {id:'charged_combo',name:'Charged Third Strike',desc:'Strike damage +5%. The final combo hit gains +75% melee damage or +56.52% arrow damage.',fx:{chargedCombo:1,dmgMul:0.05},color:'#e4ac5b'},
    {id:'barbed_spear',name:'Barbed Spear',desc:'Each melee Strike throws an additional piercing spear. Strikes and owned status-bearing projectiles apply Bleed for 12 damage per second for 3 seconds.',fx:{atkProjectile:4,bleed:{dmg:12,dur:3}},color:'#cf7b63'},
    {id:'storm_string',name:'Storm String',desc:'Each melee Strike gains a 12% chance to call lightning. Critical chance +4%.',fx:{boltOnHit:0.12,crit:0.04},color:'#d8d781'},
    {id:'iron_rhythm',name:'Iron Rhythm',desc:'Attack speed +10%. Strike reach -4%.',fx:{attSpd:0.1,reachMul:-0.04},color:'#c3b18c'},
    {id:'guardian_oath',name:'Guardian Oath',desc:'Dash and Wrath grant 4 shield. Riposte gains 16 percentage points of Strike damage during the 0.6-second parry window.',fx:{dashShield:4,riposte:0.16},color:'#a9bce4'},
    {id:'ash_bloom',name:'Ash Bloom',desc:'Each kill leaves an ash ring within 48px for 3 seconds. It deals 14 damage every 0.4 seconds in Tartarus, gaining 7 damage per region descended.',fx:{magmaOnKill:1},color:'#ed8852'},
    {id:'forked_spear',name:'Forked Spear',desc:'Each Cast fires 1 extra impact spear at 65% Cast impact damage. Extra spears create no rifts.',fx:{castFork:1},color:'#70cddd'},
    {id:'impact_lens',name:'Impact Lens',desc:'The original Cast spear bursts for 16 damage within 120px when it lands.',fx:{castNova:16},color:'#86c8ef'},
    {id:'scorching_spurs',name:'Scorching Spurs',desc:'Each Dash releases a 10-damage nova within 120px.',fx:{dashNova:10},color:'#ed8852'},
    {id:'coiled_spring',name:'Coiled Spring',desc:'Your next Strike within 3 seconds after a Dash deals +18% damage.',fx:{dashStrike:0.18},color:'#8fe3c8'},
    {id:'bronze_counter',name:'Bronze Counter',desc:'Each fresh parry releases a 14-damage nova within 150px.',fx:{parryNova:14},color:'#a9bce4'},
    {id:'menders_guard',name:'Mender’s Guard',desc:'A fresh parry restores 4 HP, at most once per second.',fx:{parryHeal:4},color:'#d8cf7a'},
    {id:'crossed_curses',name:'Crossed Curses',desc:'A direct hit on a foe with at least 2 active Bleed, Poison or Burn effects deals 12 extra damage, once per second per foe.',fx:{statusDetonate:12},color:'#cf7b63'},
    {id:'plague_runner',name:'Plague Runner',desc:'Kills have a 30% chance to copy the victim’s remaining Bleed, Poison and Burn to 2 foes within 220px.',fx:{statusSpread:0.3},color:'#8bc779'},
    {id:'titan_point',name:'Titan Point',desc:'Direct hits against bosses deal +15% damage.',fx:{bossHunter:0.15},color:'#e4ac5b'},
    {id:'longshot_lens',name:'Longshot Lens',desc:'Direct hits beyond 180px deal +14% damage. Critical hits release an 8-damage nova within 150px, once per second.',fx:{distanceDamage:0.14,critBurst:8},color:'#9be07a'},
    {id:'brawlers_grip',name:'Brawler’s Grip',desc:'Direct hits within 100px deal +14% damage.',fx:{closeDamage:0.14},color:'#e2564a'},
    {id:'funeral_bell',name:'Funeral Bell',desc:'Kills release a 10-damage nova within 150px. Its kills cannot trigger another kill nova.',fx:{killNova:10},color:'#9a7ad8'},
    {id:'reapers_metronome',name:'Reaper’s Metronome',desc:'A kill grants +12% attack speed for 4 seconds; further kills refresh the duration.',fx:{killHaste:0.12},color:'#8fe3c8'},
    {id:'warded_edge',name:'Warded Edge',desc:'Begin each chamber with 8 shield. While shield remains above 0, direct hits deal +15% damage.',fx:{shieldOnRoom:8,shieldDamage:0.15},color:'#a9bce4'},
    {id:'patient_focus',name:'Patient Focus',desc:'Each fresh parry removes 0.4 seconds from the remaining Cast cooldown.',fx:{guardCast:0.4},color:'#70cddd'},
    {id:'victory_fanfare',name:'Victory Fanfare',desc:'Rush releases a 14-damage nova within 140px. Activating Ascend releases a 20-damage nova within 180px.',fx:{rushNova:14,ascendNova:20},color:'#e8bd61'}
  ];

  const RELIC_TRANSFORMS = [
    {id:'r_hydra_heart',name:'Heart of the Hydra',color:'#75d5c5',rarity:'legendary',transform:'split_cast',
      desc:'Your Cast splits into three serpentine spears.',fx:{castMul:0.12}},
    {id:'r_sunwheel',name:'Wheel of Helios',color:'#e8bd61',rarity:'legendary',transform:'ricochet_strike',
      desc:'Every third Strike sends a bright ricochet through the crowd.',fx:{crit:0.04}},
    {id:'r_icarian_spurs',name:'Icarian Spurs',color:'#8ed7d2',rarity:'epic',transform:'burning_dash',
      desc:'Dash leaves a damaging trail and restores its charge sooner.',fx:{dashTrail:1,dashDmg:18,dashCharge:1}},
    {id:'r_orpheus_lyre',name:'Orpheus’ Golden Lyre',color:'#d9b6f0',rarity:'legendary',transform:'echo_wrath',
      desc:'Wrath repeats at half strength after a short beat.',fx:{specialMul:0.1}},
    {id:'r_aegis_memory',name:'Aegis of the First Dawn',color:'#aec5ed',rarity:'epic',transform:'parry_burst',
      desc:'A perfect parry releases a second image-backed counterwave.',fx:{guardMul:0.08,riposte:0.15}},
    {id:'r_atlas_anvil',name:'Anvil of Atlas',color:'#e39756',rarity:'legendary',transform:'charged_combo',
      desc:'The last blow of each combo becomes a charged, armor-breaking strike.',fx:{dmgMul:0.08}}
  ];
  D.RELICS = (D.RELICS || []).concat(RELIC_TRANSFORMS.filter(r => !(D.relicById && D.relicById[r.id])));
  D.relicById = Object.create(null);
  D.RELICS.forEach(r => { D.relicById[r.id] = r; });

  const SYNERGIES = [
    {id:'storm-tide',name:'Storm over the Aegean',requires:'At least 1 Zeus boon and 1 Poseidon boon.',gods:['zeus','poseidon'],desc:'Each melee Strike gains a 12% chance to call lightning. Water waves gain 5 damage.',
      test:r=>r.godCount('zeus')>0&&r.godCount('poseidon')>0,fx:{boltOnHit:0.12,waveDmg:5}},
    {id:'mirror-hunt',name:'The Mirror Hunt',requires:'At least 1 Athena boon and 1 Artemis boon.',gods:['athena','artemis'],desc:'Critical chance +8%. Melee Strikes mark targets for 5 seconds, increasing their direct hit damage taken by 12%.',
      test:r=>r.godCount('athena')>0&&r.godCount('artemis')>0,fx:{crit:0.08,critMark:0.12}},
    {id:'war-forge',name:'The Red Forge',requires:'At least 1 Ares boon and 1 Hephaestus boon; wield the Labrys.',gods:['ares','hephaestus'],desc:'Strike damage +14%. Knockback force against non-boss foes +18%.',
      test:r=>r.godCount('ares')>0&&r.godCount('hephaestus')>0&&r.weapon==='labrys',fx:{dmgMul:0.14,knock:0.18}},
    {id:'hunter-venom',name:'Moonlit Venom',requires:'At least 1 Artemis boon and 1 Dionysus boon; wield the Dory or play Atalanta.',gods:['artemis','dionysus'],desc:'Strikes apply Poison for 6 damage per second for 3 seconds. Critical chance +4%.',
      test:r=>r.godCount('artemis')>0&&r.godCount('dionysus')>0&&(r.weapon==='dory'||r.heroId==='atalanta'),fx:{poison:{dps:6,dur:3},crit:0.04}},
    {id:'underworld-song',name:'A Song for the House',requires:'Play Orpheus and take at least 1 Hades boon.',gods:['hades'],desc:'Water waves gain 8 damage. Strikes slow targets by 6% for 2 seconds.',
      test:r=>r.heroId==='orpheus'&&r.godCount('hades')>0,fx:{waveDmg:8,slowOnHit:0.06}},
    {id:'gorgon-oath',name:'Gorgon’s Due',requires:'Play Perseus, take at least 1 Athena boon and own Aegis of the First Dawn.',gods:['athena'],desc:'Riposte gains 22 percentage points of Strike damage. Incoming projectiles gain a 12% automatic deflection chance.',
      test:r=>r.heroId==='perseus'&&r.godCount('athena')>0&&r.relics.indexOf('r_aegis_memory')>=0,fx:{riposte:0.22,deflectProj:0.12}},
    {id:'stormglass-hunt',name:'Stormglass Hunt',requires:'At least 1 Zeus boon and 1 Artemis boon.',gods:['zeus','artemis'],desc:'Critical chance +4%. Critical hits release a 10-damage nova within 150px, once per second.',
      test:r=>r.godCount('zeus')>0&&r.godCount('artemis')>0,fx:{crit:0.04,critBurst:10}},
    {id:'thunder-road',name:'The Thunder Road',requires:'At least 1 Zeus boon and 1 Hermes boon.',gods:['zeus','hermes'],desc:'Dash releases a 10-damage nova within 120px. The next Strike within 3 seconds after Dash deals +10% damage.',
      test:r=>r.godCount('zeus')>0&&r.godCount('hermes')>0,fx:{dashNova:10,dashStrike:0.1}},
    {id:'aegis-forge',name:'Aegis of the Forge',requires:'At least 1 Athena boon and 1 Hephaestus boon.',gods:['athena','hephaestus'],desc:'A fresh parry releases a 12-damage nova within 150px. While shield is above 0, direct hits deal +10% damage.',
      test:r=>r.godCount('athena')>0&&r.godCount('hephaestus')>0,fx:{parryNova:12,shieldDamage:0.1}},
    {id:'reapers-feast',name:'The Reaper’s Feast',requires:'At least 1 Ares boon and 1 Dionysus boon.',gods:['ares','dionysus'],desc:'Direct hits against foes with at least 2 active Bleed, Poison or Burn effects deal 12 extra damage, once per second per foe. Kills have a 25% chance to copy remaining Bleed, Poison and Burn to 2 foes within 220px.',
      test:r=>r.godCount('ares')>0&&r.godCount('dionysus')>0,fx:{statusDetonate:12,statusSpread:0.25}},
    {id:'ashen-vine',name:'The Ashen Vine',requires:'At least 1 Dionysus boon and 1 Hephaestus boon.',gods:['dionysus','hephaestus'],desc:'Hits apply Burn for 2 damage per second for 3 seconds. Direct hits against foes with at least 2 active Bleed, Poison or Burn effects deal 10 extra damage, once per second per foe.',
      test:r=>r.godCount('dionysus')>0&&r.godCount('hephaestus')>0,fx:{burnOnHit:{dps:2,dur:3},statusDetonate:10}},
    {id:'frosted-quiver',name:'The Frosted Quiver',requires:'At least 1 Artemis boon and 1 Demeter boon.',gods:['artemis','demeter'],desc:'Critical chance +3%. Direct hits beyond 180px deal +12% damage.',
      test:r=>r.godCount('artemis')>0&&r.godCount('demeter')>0,fx:{crit:0.03,distanceDamage:0.12}},
    {id:'harvest-song',name:'Harvest Song',requires:'Play Orpheus and take at least 1 Demeter boon.',gods:['demeter'],desc:'Kills restore 2 HP and grant +10% attack speed for 4 seconds; further kills refresh the duration.',
      test:r=>r.heroId==='orpheus'&&r.godCount('demeter')>0,fx:{killHeal:2,killHaste:0.1}},
    {id:'guarded-refrain',name:'The Guarded Refrain',requires:'Play Orpheus and take at least 1 Athena boon.',gods:['athena'],desc:'A fresh parry removes 0.4 seconds from remaining Cast cooldown. The original Cast spear bursts for 10 damage within 120px on landing.',
      test:r=>r.heroId==='orpheus'&&r.godCount('athena')>0,fx:{guardCast:0.4,castNova:10}},
    {id:'sea-sprinter',name:'Sprinter of the Sea',requires:'Play Atalanta and take at least 1 Poseidon boon.',gods:['poseidon'],desc:'Rush releases a 12-damage nova within 140px. Direct hits beyond 180px deal +10% damage.',
      test:r=>r.heroId==='atalanta'&&r.godCount('poseidon')>0,fx:{rushNova:12,distanceDamage:0.1}},
    {id:'gorgons-mercy',name:'The Gorgon’s Mercy',requires:'Play Perseus and take at least 1 Demeter boon.',gods:['demeter'],desc:'A fresh parry releases a 10-damage nova within 150px and restores 4 HP; healing triggers at most once per second.',
      test:r=>r.heroId==='perseus'&&r.godCount('demeter')>0,fx:{parryNova:10,parryHeal:4}},
    {id:'grave-lantern',name:'The Grave Lantern',requires:'At least 1 Hades boon and 1 Hephaestus boon.',gods:['hades','hephaestus'],desc:'Kills release a 12-damage nova within 150px; nova kills cannot trigger another kill nova. While shield is above 0, direct hits deal +10% damage.',
      test:r=>r.godCount('hades')>0&&r.godCount('hephaestus')>0,fx:{killNova:12,shieldDamage:0.1}},
    {id:'titanic-dawn',name:'Dawn against the Titans',requires:'At least 1 Apollo boon and 1 Zeus boon.',gods:['apollo','zeus'],desc:'Direct hits against bosses deal +12% damage. Activating Ascend releases an 18-damage nova within 180px.',
      test:r=>r.godCount('apollo')>0&&r.godCount('zeus')>0,fx:{bossHunter:0.12,ascendNova:18}}
  ];

  const QUESTS = [
    {id:'champion_hunt',name:'The Champion’s Wager',objective:'Defeat champions',event:'elite',goal:2,reward:{obols:140,fx:{crit:0.04}}},
    {id:'old_debts',name:'Charon’s Ledger',objective:'Collect obols',event:'obol',goal:220,reward:{obols:90,fx:{obolMul:0.08}}},
    {id:'trial_taker',name:'A Trial Well Met',objective:'Clear a Trial room',event:'challenge',goal:1,reward:{obols:100,fx:{maxHp:12}}},
    {id:'many_names',name:'Remember the Dead',objective:'Defeat enemies',event:'kill',goal:28,reward:{obols:120,fx:{killHeal:1}}}
  ];

  const MINIBOSSES = [
    {id:'oathbearer',name:'THE ASHEN OATHBEARER',epithet:'Spear of Mycenae',enemy:'hoplite',hpMul:3.2,dmgMul:1.45,scale:1.42,signature:'shield_rush',reward:'augment'},
    {id:'ember_maiden',name:'THE EMBER MAIDEN',epithet:'Ash-wing of Asphodel',enemy:'fury',hpMul:2.7,dmgMul:1.55,scale:1.32,signature:'ember_dive',reward:'augment'},
    {id:'labyrinth_hunter',name:'THE MAZE HUNTER',epithet:'Bull of the Ninth Door',enemy:'minotaur',hpMul:3.5,dmgMul:1.4,scale:1.45,signature:'ground_slam',reward:'relic'}
  ];

  const WEAPON_UPGRADES = [
    {id:'tempered_edge',name:'Tempered Edge',desc:'Strike damage +12%.',fx:{dmgMul:0.12}},
    {id:'long_grip',name:'Long Grip',desc:'Strike reach +14%.',fx:{reachMul:0.14}},
    {id:'swift_form',name:'Swift Form',desc:'Attack speed +10%.',fx:{attSpd:0.1}},
    {id:'laurel_point',name:'Laurel Point',desc:'Critical chance +5%.',fx:{crit:0.05}},
    {id:'chorus_rune',name:'Chorus Rune',desc:'Every strike carries a resonant image-wave.',fx:{waveOnHit:1,waveDmg:8}},
    {id:'godsteel_socket',name:'Godsteel Socket',desc:'Every fourth strike releases an image-backed spear.',fx:{atkProjectile:4,powerShot:4}}
  ];

  const FATED_THREADS = [
    { id:'returning-echo', name:'Returning Echo', category:'Offense', focus:'cast', desc:'Each Cast fires 2 smaller seeking projectiles, each dealing 50% of its spear impact damage.', fx:{ castEcho:2 } },
    { id:'cyclone-step', name:'Cyclone Step', category:'Mobility', focus:'dash', desc:'Dash releases a water wave with 9 damage.', fx:{ waveOnDash:1, waveDmg:9 } },
    { id:'guardian-refrain', name:'Guardian Refrain', category:'Defense', focus:'guard', desc:'Dash and Wrath grant 14 shield. Riposte gains 10 percentage points of Strike damage during the 0.6-second parry window.', fx:{ dashShield:14, riposte:0.1 } },
    { id:'marked-quarry', name:'Marked Quarry', category:'Offense', focus:'strike', desc:'Melee Strikes mark targets for 5 seconds, increasing their direct hit damage taken by 12%.', fx:{ critMark:0.12 } },
    { id:'barbed-verse', name:'Barbed Verse', category:'God & Status', focus:'ares', desc:'Strikes and owned status-bearing projectiles apply Bleed for 9 damage per second for 3 seconds. Player hits against bleeding foes deal +14% damage.', fx:{ bleed:{ dmg:9, dur:3 }, bleedAmp:0.14 } },
    { id:'green-wound', name:'Green Wound', category:'God & Status', focus:'status', desc:'Strikes and owned status-bearing projectiles apply Poison for 6 damage per second for 4 seconds.', fx:{ poison:{ dps:6, dur:4 } } },
    { id:'storm-remnant', name:'Storm Remnant', category:'God & Status', focus:'zeus', desc:'Kills have a 16% chance to release lightning for 30 damage in Tartarus, gaining 12 damage per region descended.', fx:{ boltOnKill:0.16 } },
    { id:'harvest-turn', name:'Harvest Turn', category:'Defense', focus:'demeter', desc:'Kills restore 3 HP; boss kills restore 36 HP.', fx:{ killHeal:3 } },
    { id:'breaker-stride', name:'Breaker Stride', category:'Mobility', focus:'dash', desc:'Dash deals 8 damage to foes it crosses. Your damaging hits gain +35% knockback force against non-boss foes.', fx:{ dashDmg:8, knock:0.35 } },
    { id:'charged-third', name:'Charged Third', category:'Offense', focus:'strike', desc:'The final combo hit gains +75% melee damage or +56.52% arrow damage.', fx:{ chargedCombo:1 } },
    { id:'piercing-line', name:'Piercing Line', category:'Offense', focus:'ranged', desc:'Arrows pierce 2 additional foes.', fx:{ pierce:2 } },
    { id:'winter-answer', name:'Winter Answer', category:'Defense', focus:'athena', desc:'Melee Strikes Chill targets for 3 seconds, slowing movement by 30%. Melee hits against chilled or slowed foes deal +25% damage. Flat damage reduction +0.12.', fx:{ winterOnHit:1, armor:0.12 } },
    { id:'thunder-quarry', name:'Thunder Quarry', category:'Offense', focus:'critical', desc:'Critical chance +4%. Critical hits release a 12-damage nova within 150px, once per second.', fx:{ crit:0.04, critBurst:12 } },
    { id:'split-refrain', name:'Split Refrain', category:'Offense', focus:'cast', desc:'Each Cast fires 1 extra impact spear at 65% Cast impact damage. Extra spears create no rifts.', fx:{ castFork:1 } },
    { id:'landing-star', name:'Landing Star', category:'Offense', focus:'cast', desc:'The original Cast spear releases an 18-damage nova within 120px when it lands.', fx:{ castNova:18 } },
    { id:'ember-step', name:'Ember Step', category:'Mobility', focus:'dash', desc:'Each Dash releases a 12-damage nova within 120px.', fx:{ dashNova:12 } },
    { id:'spring-loaded', name:'Spring-Loaded', category:'Mobility', focus:'dash', desc:'Your next Strike within 3 seconds after a Dash deals +22% damage.', fx:{ dashStrike:0.22 } },
    { id:'mirror-shock', name:'Mirror Shock', category:'Defense', focus:'guard', desc:'Each fresh parry releases a 16-damage nova within 150px.', fx:{ parryNova:16 } },
    { id:'merciful-counter', name:'Merciful Counter', category:'Defense', focus:'guard', desc:'A fresh parry restores 5 HP, at most once per second.', fx:{ parryHeal:5 } },
    { id:'mingled-ruin', name:'Mingled Ruin', category:'God & Status', focus:'status', desc:'Direct hits on a foe with at least 2 active Bleed, Poison or Burn effects deal 14 extra damage, once per second per foe.', fx:{ statusDetonate:14 } },
    { id:'contagious-fate', name:'Contagious Fate', category:'God & Status', focus:'status', desc:'Kills have a 35% chance to copy remaining Bleed, Poison and Burn to 2 foes within 220px.', fx:{ statusSpread:0.35 } },
    { id:'titan-slayer', name:'Titan Slayer', category:'Offense', focus:'boss', desc:'Direct hits against bosses deal +18% damage.', fx:{ bossHunter:0.18 } },
    { id:'distant-vow', name:'Distant Vow', category:'Offense', focus:'ranged', desc:'Direct hits beyond 180px deal +16% damage.', fx:{ distanceDamage:0.16 } },
    { id:'close-quarters', name:'Close Quarters', category:'Offense', focus:'melee', desc:'Direct hits within 100px deal +18% damage.', fx:{ closeDamage:0.18 } },
    { id:'last-ripple', name:'The Last Ripple', category:'Offense', focus:'kills', desc:'Kills release a 12-damage nova within 150px. Its kills cannot trigger another kill nova.', fx:{ killNova:12 } },
    { id:'reaping-tempo', name:'Reaping Tempo', category:'Offense', focus:'kills', desc:'A kill grants +14% attack speed for 4 seconds; further kills refresh the duration.', fx:{ killHaste:0.14 } },
    { id:'aegis-edge', name:'Aegis Edge', category:'Defense', focus:'shield', desc:'While shield remains above 0, direct hits deal +18% damage.', fx:{ shieldDamage:0.18 } },
    { id:'borrowed-instant', name:'Borrowed Instant', category:'Defense', focus:'guardCast', desc:'Each fresh parry removes 0.5 seconds from remaining Cast cooldown.', fx:{ guardCast:0.5 } },
    { id:'thunderous-rush', name:'Thunderous Rush', category:'Mobility', focus:'rush', desc:'Each Rush releases an 18-damage nova within 140px.', fx:{ rushNova:18 } },
    { id:'first-light', name:'First Light', category:'Offense', focus:'ascend', desc:'Activating Ascend releases a 24-damage nova within 180px.', fx:{ ascendNova:24 } },
    { id:'blood-and-ash', name:'Blood and Ash', category:'God & Status', focus:'status', desc:'Hits apply Bleed for 6 damage per second for 3 seconds and Burn for 2 damage per second for 3 seconds.', fx:{ bleed:{dmg:6,dur:3}, burnOnHit:{dps:2,dur:3} } },
    { id:'moonlit-chase', name:'Moonlit Chase', category:'Offense', focus:'critical', desc:'Critical chance +5%. Direct hits beyond 180px deal +10% damage.', fx:{ crit:0.05, distanceDamage:0.1 } },
    { id:'shielded-charge', name:'Shielded Charge', category:'Defense', focus:'dash', desc:'Dash grants 10 shield. Your next Strike within 3 seconds after Dash deals +12% damage.', fx:{ dashShield:10, dashStrike:0.12 } },
    { id:'dusk-harvest', name:'Dusk Harvest', category:'Defense', focus:'kills', desc:'Kills grant 6 shield and +8% attack speed for 4 seconds; further kills refresh the duration.', fx:{ killShield:6, killHaste:0.08 } },
    { id:'resonance-pursuit', name:'Resonance Pursuit', category:'Offense', focus:'cast', desc:'Each Cast fires 1 extra impact spear at 65% impact damage, with no rift. Direct hits beyond 180px deal +8% damage.', fx:{ castFork:1, distanceDamage:0.08 } },
    { id:'furnace-counter', name:'Furnace Counter', category:'God & Status', focus:'guard', desc:'Each fresh parry releases a 10-damage nova within 150px. Hits apply Burn for 3 damage per second for 3 seconds.', fx:{ parryNova:10, burnOnHit:{dps:3,dur:3} } }
  ];

  const PACTS = [
    { id:'iron-sinew', name:'Iron Sinew', desc:'Enemies gain more health.', ranks:['+8% enemy health','+16% enemy health','+24% enemy health'], key:'enemyHealth', step:0.08 },
    { id:'red-hand', name:'Red Hand', desc:'Enemy attacks deal more damage.', ranks:['+7% enemy damage','+14% enemy damage','+21% enemy damage'], key:'enemyDamage', step:0.07 },
    { id:'quickened-doom', name:'Quickened Doom', desc:'Enemies attack more quickly.', ranks:['+6% enemy tempo','+12% enemy tempo','+18% enemy tempo'], key:'enemyTempo', step:0.06 },
    { id:'thin-mercy', name:'Thin Mercy', desc:'Healing restores less life.', ranks:['−12% healing','−24% healing','−36% healing'], key:'healing', step:0.12 },
    { id:'charons-due', name:'Charon’s Due', desc:'Charon’s wares cost more.', ranks:['+15% shop prices','+30% shop prices','+45% shop prices'], key:'shopPrices', step:0.15 },
    { id:'scarce-offers', name:'Scarce Offers', desc:'Level-up drafts have fewer rerolls.', ranks:['−1 reroll','−2 rerolls','−3 rerolls'], key:'rerollPenalty', step:1 },
    { id:'crowded-fate', name:'Crowded Fate', desc:'More enemies enter each wave as elites.', ranks:['+1 elite per wave','+2 elites per wave','+3 elites per wave'], key:'elitePressure', step:1 },
    { id:'mortal-thread', name:'Mortal Thread', desc:'Begin with fewer Death Defiances.', ranks:['−1 Death Defiance','−2 Death Defiances','−3 Death Defiances'], key:'deathDefiance', step:1 }
  ];
  const MODIFIER_VERSION=1;
  const WORLD_MODIFIERS = [
    {id:'braided-roads',name:'Braided Roads',desc:'More optional branches, each with an extra encounter before its reward.',ranks:['+1 optional branch','+2 optional branches','+3 optional branches'],key:'sidePaths',step:1,rewardStep:0.03,counterplay:'Explore a branch only when your build has enough recovery.',incompatible:['sparse-branches']},
    {id:'flooded-paths',name:'Flooded Paths',desc:'Currents and flood hazards shape optional routes; the main route stays clear.',ranks:['Light currents','Strong currents','Severe currents'],key:'flooding',step:1,rewardStep:0.05,counterplay:'Read the current markers and use safe ground between surges.'},
    {id:'unstable-altars',name:'Unstable Altars',desc:'Denser hazard pockets around optional rewards increase valuable gear odds.',ranks:['+20% hazard density','+40% hazard density','+60% hazard density'],key:'hazardDensity',step:0.2,rewardStep:0.05,counterplay:'Clear nearby enemies before entering a marked altar pocket.'},
    {id:'gentle-current',name:'Gentle Current',desc:'Enemy damage is reduced; surrender part of the bonus gear reward potential.',ranks:['−10% enemy damage; −8% bonus rewards','−20% enemy damage; −16% bonus rewards','−30% enemy damage; −24% bonus rewards'],key:'gentleDamage',step:0.1,rewardStep:-0.08,counterplay:'A gentler descent gives fewer opportunities for exceptional rolls.'},
    {id:'sparse-branches',name:'Quiet Roads',desc:'Fewer optional branches, fewer extra fights and lower bonus gear odds. Required route and recovery beats remain.',ranks:['−1 optional branch','−2 optional branches','−3 optional branches'],key:'sidePaths',step:-1,rewardStep:-0.04,counterplay:'Use the guaranteed main route for core build rewards.',incompatible:['braided-roads']}
  ];
  const MODIFIERS=PACTS.concat(WORLD_MODIFIERS);
  function normalizeModifierSelection(selection) {
    const input=selection && typeof selection==='object' && !Array.isArray(selection) ? selection.ranks || selection : {},ranks={};
    MODIFIERS.forEach(def=>{const rank=input[def.id];if(Number.isInteger(rank) && rank>=1 && rank<=3)ranks[def.id]=rank;});
    return {ranks,score:normalizePactSelection(ranks).score,version:MODIFIER_VERSION};
  }
  function validateModifierSelection(selection) {
    const normalized=normalizeModifierSelection(selection),errors=[];
    MODIFIERS.forEach(def=>{if(normalized.ranks[def.id]) (def.incompatible || []).forEach(id=>{if(normalized.ranks[id] && def.id<id)errors.push(def.name+' cannot be combined with '+MODIFIERS.find(x=>x.id===id).name+'.');});});
    return Object.assign(normalized,{valid:!errors.length,errors});
  }
  function modifierEffects(selection) {
    const normalized=normalizeModifierSelection(selection),out=pactModifiers(normalized.ranks);
    Object.assign(out,{sidePaths:0,flooding:0,hazardDensity:1,recoveryNodes:0,rewardBonus:normalized.score*0.02});
    WORLD_MODIFIERS.forEach(def=>{const rank=normalized.ranks[def.id] || 0;if(!rank)return;
      if(def.key==='gentleDamage')out.enemyDamage*=1-def.step*rank;
      else out[def.key]=(out[def.key] || 0)+def.step*rank;
      out.rewardBonus+=def.rewardStep*rank;
    });
    out.enemyDamage=Math.max(0.6,Math.min(2,out.enemyDamage));out.rewardBonus=Math.max(-0.4,Math.min(0.6,out.rewardBonus));
    return out;
  }

  const CAMPAIGN_MILESTONES = ['firstCapstone','actI','actII','campaignVictory'];
  const FATED_TRIAL_REWARDS = [
    { score:5, id:'thread-touched', name:'Thread-Touched', desc:'A title earned by surviving a Fated Trial.' },
    { score:10, id:'the-unbroken', name:'The Unbroken', desc:'A title earned by clearing a Trial at ten Pacts.' },
    { score:15, id:'fates-witness', name:'Witness of Fate', desc:'A title earned by clearing a Trial at fifteen Pacts.' },
    { score:20, id:'oath-unbound', name:'Oath Unbound', desc:'A title earned by clearing a Trial at twenty Pacts.' }
  ];

  function normalizeSave(save) {
    if (!save || typeof save !== 'object') return save;
    const unique = a => Array.from(new Set((Array.isArray(a) ? a : []).filter(x => typeof x === 'string')));
    const starterUnlocks = STARTERS.filter(s => (save.bossKills || 0) >= s.unlockAt).map(s => s.id);
    save.unlockedWeapons = unique((Array.isArray(save.unlockedWeapons) ? save.unlockedWeapons : ['xiphos']).concat(starterUnlocks));
    save.unlockedStarters = unique((Array.isArray(save.unlockedStarters) ? save.unlockedStarters : ['xiphos']).concat(starterUnlocks));
    const heroUnlocks = Object.keys(HEROES).filter(id => (save.bossKills || 0) >= HEROES[id].unlockAt);
    save.unlockedHeroes = unique((Array.isArray(save.unlockedHeroes) ? save.unlockedHeroes : ['perseus']).concat(heroUnlocks))
      .filter(id => Object.prototype.hasOwnProperty.call(HEROES, id));
    if (!save.unlockedHeroes.includes('perseus')) save.unlockedHeroes.unshift('perseus');
    if (!save.unlockedStarters.includes('xiphos')) save.unlockedStarters.unshift('xiphos');
    if (typeof save.selectedHero !== 'string' || !Object.prototype.hasOwnProperty.call(HEROES, save.selectedHero) || !save.unlockedHeroes.includes(save.selectedHero)) save.selectedHero = 'perseus';
    const selected=HEROES[save.selectedHero];
    if (!selected.upgrades.some(u=>u.id===save.selectedHeroUpgrade) || (save.bossKills||0)<2) save.selectedHeroUpgrade='';
    if (!STARTERS.some(s => s.id === save.weapon && save.unlockedStarters.includes(s.id))) save.weapon = 'xiphos';
    if (!save.unlockedStarterPerks || !Array.isArray(save.unlockedStarterPerks)) save.unlockedStarterPerks = ['last_thread'];
    if (!save.unlockedStarterPerks.includes('last_thread')) save.unlockedStarterPerks.push('last_thread');
    save.progressionVersion = 2;
    const milestones = save.campaignMilestones && typeof save.campaignMilestones === 'object' && !Array.isArray(save.campaignMilestones) ? save.campaignMilestones : {};
    save.campaignMilestones = {};
    const hasCampaignWin = Number.isSafeInteger(save.wins) && save.wins > 0;
    CAMPAIGN_MILESTONES.forEach(id => {
      save.campaignMilestones[id] = milestones[id] === true || hasCampaignWin;
    });
    save.fatedTrialsUnlocked = save.fatedTrialsUnlocked === true || (save.wins || 0) > 0;
    save.fatedTrialBestScore = Math.max(0, Math.min(24, typeof save.fatedTrialBestScore === 'number' && Number.isFinite(save.fatedTrialBestScore) ? Math.floor(save.fatedTrialBestScore) : 0));
    const validTrialScores = FATED_TRIAL_REWARDS.map(r => r.score);
    save.fatedTrialRewards = Array.from(new Set((Array.isArray(save.fatedTrialRewards) ? save.fatedTrialRewards : [])
      .map(Number).filter(score => validTrialScores.includes(score) && score <= save.fatedTrialBestScore)));
    return save;
  }

  function recordCampaignMilestone(save, run, event) {
    if (!save || !run || run.practice || CAMPAIGN_MILESTONES.indexOf(event) < 0) return false;
    if (!save.campaignMilestones || typeof save.campaignMilestones !== 'object') save.campaignMilestones = {};
    if (save.campaignMilestones[event]) return false;
    save.campaignMilestones[event] = true;
    return true;
  }

  function recordTrialVictory(save, run) {
    if (!save || !run || run.practice || !run.isFatedTrial || !Number.isInteger(run.trialScore) || run.trialScore < 1) return { bestScore:save && save.fatedTrialBestScore || 0, newlyClaimed:[] };
    normalizeSave(save);
    const oldBest = save.fatedTrialBestScore;
    save.fatedTrialBestScore = Math.max(oldBest, Math.min(24, run.trialScore));
    const newlyClaimed = [];
    FATED_TRIAL_REWARDS.forEach(reward => {
      if (save.fatedTrialBestScore >= reward.score && save.fatedTrialRewards.indexOf(reward.score) < 0) {
        save.fatedTrialRewards.push(reward.score);
        newlyClaimed.push(reward);
      }
    });
    save.fatedTrialRewards.sort((a,b) => a-b);
    save.fatedTrialsUnlocked = true;
    return { bestScore:save.fatedTrialBestScore, newlyClaimed };
  }

  function buildHasFx(run, keys) {
    const hero = HEROES[run.heroId] || HEROES.perseus;
    const sources = [hero.fx];
    (run.boons || []).forEach(boon => {
      const def = D.boonById && D.boonById[boon.id];
      sources.push(def ? def.fx : boon.fx);
    });
    (run.relics || []).forEach(id => sources.push(D.relicById && D.relicById[id] && D.relicById[id].fx));
    (run.augmentIds || []).forEach(id => {
      const augment = AUGMENTS.find(item => item.id === id);
      if (augment) sources.push(augment.fx);
    });
    (run.fatedThreadIds || []).forEach(id => {
      const thread = FATED_THREADS.find(item => item.id === id);
      if (thread) sources.push(thread.fx);
    });
    Object.keys(HEROES).forEach(id => HEROES[id].upgrades.forEach(upgrade => {
      if ((run.heroUpgrades || []).includes(upgrade.id)) sources.push(upgrade.fx);
    }));
    WEAPON_UPGRADES.forEach(upgrade => {
      if ((run.weaponUpgrades || []).includes(upgrade.id)) sources.push(upgrade.fx);
    });
    (run.shopStats || []).forEach(fx => sources.push(fx));
    return sources.some(fx => fx && keys.some(key => {
      const value = fx[key];
      return typeof value === 'number' ? value > 0 : value && typeof value === 'object';
    }));
  }

  function threadFitsBuild(run, thread) {
    if (!run || !thread) return false;
    const focus = thread.focus;
    if (focus === 'any') return true;
    if (focus === 'cast') return (run.boons || []).some(b => b.slot === 'cast') || run.heroId === 'orpheus' || buildHasFx(run, ['castMul','castEcho','castFork','castNova']);
    if (focus === 'strike') return (run.boons || []).some(b => b.slot === 'attack' || b.slot === 'strike') || ['xiphos','kopis','labrys','makhaira'].includes(run.weapon);
    if (focus === 'ranged') return run.heroId === 'atalanta' || ['dory','styx_edge'].includes(run.weapon) || (run.boons || []).some(b => b.slot === 'attack');
    if (focus === 'dash') return (run.boons || []).some(b => b.slot === 'dash') || (run.heroUpgrades || []).some(id => /fleet|moon/i.test(id)) || buildHasFx(run, ['dashCharge','dashDmg','dashShield','dashTrail','dashNova','dashStrike']);
    if (focus === 'guard' || focus === 'guardCast') return (run.boons || []).some(b => b.slot === 'guard') || run.heroId === 'perseus' || buildHasFx(run, ['guardMul','riposte','parryNova','parryHeal','guardCast']);
    if (focus === 'critical') return buildHasFx(run, ['crit','critMul','critMark','critBurst']);
    if (focus === 'melee') return run.heroId !== 'atalanta' && ['xiphos','kopis','labrys','makhaira'].includes(run.weapon);
    if (focus === 'shield') return buildHasFx(run, ['shieldOnRoom','shieldStart','dashShield','killShield']);
    if (focus === 'rush' || focus === 'ascend' || focus === 'boss' || focus === 'kills') return true;
    if (['ares','zeus','demeter','athena'].includes(focus)) return run.godCount(focus) > 0;
    if (focus === 'status') return buildHasFx(run, ['bleed','poison','burnOnHit']) || (run.boons || []).some(b => ['ares','demeter','dionysus'].includes(b.god));
    return false;
  }

  function eligibleFatedThreads(run) {
    const owned = run && Array.isArray(run.fatedThreadIds) ? run.fatedThreadIds : [];
    return FATED_THREADS.filter(thread => !owned.includes(thread.id));
  }

  function fatedThreadEffects(run) {
    const total = {};
    eligibleThreadIds(run).forEach(id => {
      const thread = FATED_THREADS.find(x => x.id === id);
      if (thread) mergeThreadFx(total, thread.fx);
    });
    return total;
  }

  function eligibleThreadIds(run) {
    return run && Array.isArray(run.fatedThreadIds) ? run.fatedThreadIds.filter(id => FATED_THREADS.some(t => t.id === id)) : [];
  }

  function mergeThreadFx(total, fx) {
    Object.keys(fx || {}).forEach(key => {
      const value = fx[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!total[key]) total[key] = {};
        Object.keys(value).forEach(sub => {
          const v = value[sub];
          if (typeof v === 'number') total[key][sub] = sub === 'dur' ? Math.max(total[key][sub] || 0, v) : (total[key][sub] || 0) + v;
        });
      } else if (typeof value === 'number') total[key] = (total[key] || 0) + value;
    });
  }

  function threadRelevance(run, thread) { return threadFitsBuild(run, thread); }

  function normalizePactSelection(selection) {
    const input = selection && typeof selection === 'object' && !Array.isArray(selection) ? (selection.ranks || selection) : {};
    const ranks = {};
    let score = 0;
    PACTS.forEach(pact => {
      const raw = input[pact.id];
      const rank = Number.isInteger(raw) && raw >= 1 && raw <= 3 ? raw : 0;
      if (rank) { ranks[pact.id] = rank; score += rank; }
    });
    return { ranks, score:Math.min(24, score) };
  }

  function pactModifiers(selection) {
    const normalized = normalizePactSelection(selection), out = {
      enemyHealth:1, enemyDamage:1, enemyTempo:1, healing:1, shopPrices:1,
      rerollPenalty:0, elitePressure:0, deathDefiancePenalty:0, score:normalized.score
    };
    PACTS.forEach(pact => {
      const rank = normalized.ranks[pact.id] || 0;
      if (!rank) return;
      if (pact.key === 'enemyHealth' || pact.key === 'enemyDamage' || pact.key === 'enemyTempo' || pact.key === 'shopPrices') out[pact.key] *= 1 + pact.step * rank;
      else if (pact.key === 'healing') out.healing = Math.max(0.4, out.healing - pact.step * rank);
      else if (pact.key === 'rerollPenalty') out.rerollPenalty += rank;
      else if (pact.key === 'elitePressure') out.elitePressure += rank;
      else if (pact.key === 'deathDefiance') out.deathDefiancePenalty += rank;
    });
    out.enemyHealth = Math.max(1, Math.min(2, out.enemyHealth));
    out.enemyDamage = Math.max(1, Math.min(2, out.enemyDamage));
    out.enemyTempo = Math.max(1, Math.min(1.6, out.enemyTempo));
    out.healing = Math.max(0.4, Math.min(1, out.healing));
    out.shopPrices = Math.max(1, Math.min(2.5, out.shopPrices));
    out.rerollPenalty = Math.min(3, out.rerollPenalty);
    out.elitePressure = Math.min(3, out.elitePressure);
    out.deathDefiancePenalty = Math.min(3, out.deathDefiancePenalty);
    return out;
  }

  function updateUnlocks(save) {
    const before = JSON.stringify([save.unlockedHeroes,save.unlockedStarters]);
    normalizeSave(save);
    return before !== JSON.stringify([save.unlockedHeroes,save.unlockedStarters]);
  }

  function createQuest(rng) {
    const def = rng.pick(QUESTS);
    return {id:def.id,name:def.name,objective:def.objective,event:def.event,goal:def.goal,progress:0,
      complete:false,failed:false,reward:JSON.parse(JSON.stringify(def.reward))};
  }

  function progressQuest(run, event, amount) {
    const q = run && run.quest;
    if (!q || q.complete || q.failed || q.event !== event) return false;
    const delta=event==='obol'?Math.max(0,Math.floor(Number(amount)||0)):1;
    q.progress = Math.min(q.goal, (q.progress || 0) + delta);
    if (q.progress >= q.goal) { q.complete=true; return true; }
    return false;
  }

  function activeSynergies(run) {
    if (!run) return [];
    return SYNERGIES.filter(s=>s.test(run)).map(s=>({id:s.id,name:s.name,desc:s.desc,requires:s.requires,gods:s.gods,fx:s.fx}));
  }

  function hasTransform(run, id) {
    if (!run) return false;
    return run.relics.some(relicId => {
      const relic=D.relicById && D.relicById[relicId];
      return relic && relic.transform===id;
    }) || RELIC_TRANSFORMS.some(relic=>relic.transform===id&&run.relics.indexOf(relic.id)>=0);
  }

  function buildCode(run) {
    if (!run) return '';
    // Gear is run-local display only: equipped instance ids are not portable
    // across saves, so build codes carry hero/weapon/boons/relics/augments.
    const payload={v:1,h:run.heroId||'perseus',w:run.weapon||'xiphos',
      b:(run.boons||[]).map(x=>x.id).filter(x=>D.boonById[x]),
      r:(run.relics||[]).filter(x=>D.relicById[x]),
      a:(run.augmentIds||[]).slice(),u:(run.heroUpgrades||[]).slice(),t:eligibleThreadIds(run)};
    const raw=unescape(encodeURIComponent(JSON.stringify(payload)));
    return 'KAT1-' + btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function parseBuildCode(code) {
    try {
      const text=String(code||'').trim();
      if (text.indexOf('KAT1-')!==0) return {ok:false,error:'Unknown build-code version.'};
      let b64=text.slice(5).replace(/-/g,'+').replace(/_/g,'/');
      while (b64.length%4) b64+='=';
      const payload=JSON.parse(decodeURIComponent(escape(atob(b64))));
      if (!payload || payload.v!==1) return {ok:false,error:'Unsupported build-code version.'};
      const hero=typeof payload.h==='string'&&Object.prototype.hasOwnProperty.call(HEROES,payload.h)?HEROES[payload.h]:HEROES.perseus;
      const weapon=STARTERS.some(s=>s.id===payload.w)?payload.w:'xiphos';
      const boons=(Array.isArray(payload.b)?payload.b:[]).filter(id=>D.boonById[id]).slice(0,60);
      const relics=(Array.isArray(payload.r)?payload.r:[]).filter(id=>D.relicById[id]).slice(0,40);
      const augments=(Array.isArray(payload.a)?payload.a:[]).filter(id=>AUGMENTS.some(a=>a.id===id)).slice(0,20);
      const threads=(Array.isArray(payload.t)?payload.t:[]).filter(id=>FATED_THREADS.some(t=>t.id===id)).slice(0,2);
      const upgrades=(Array.isArray(payload.u)?payload.u:[]).filter(id=>Object.keys(HEROES).some(h=>HEROES[h].upgrades.some(u=>u.id===id))).slice(0,12);
      return {ok:true,hero:hero.name,weapon:(D.WEAPONS[weapon]||{}).name||weapon,boons,relics,augments,upgrades,threads};
    } catch (err) { return {ok:false,error:'That build code could not be read.'}; }
  }

  K.RunSystems={
    HEROES, STARTERS, AUGMENTS, QUESTS, MINIBOSSES, WEAPON_UPGRADES, SYNERGIES, RELIC_TRANSFORMS,
    normalizeSave, updateUnlocks, recordCampaignMilestone, recordTrialVictory, FATED_TRIAL_REWARDS, FATED_THREADS, eligibleFatedThreads, fatedThreadEffects, threadRelevance,
    PACTS, MODIFIERS, WORLD_MODIFIERS, MODIFIER_VERSION, normalizeModifierSelection,validateModifierSelection,modifierEffects,
    normalizePactSelection, pactScore:selection => normalizePactSelection(selection).score, pactModifiers, createQuest, progressQuest, activeSynergies,
    hasTransform, buildCode, parseBuildCode
  };
})(); 
