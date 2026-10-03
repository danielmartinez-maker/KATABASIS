(function () {
  'use strict';
  const K = window.K;
  const D = K.DATA;
  if (D.CONTENT_EXPANDED) return;
  D.CONTENT_EXPANDED = true;
  const copy = value => JSON.parse(JSON.stringify(value));
  D.BASE_CONTENT_COUNTS = D.BASE_CONTENT_COUNTS || {
    fightableEnemyFamilies:Object.keys(D.ENEMIES).filter(id => !D.ENEMIES[id].summon && !D.ENEMIES[id].generatedVariant).length,
    deities:Object.keys(D.GODS).length
  };

  /* The expanded divine court uses one painted portrait per deity. The
     Olympian roster intentionally includes both Hestia and Dionysus. */
  const deityCatalog = [
    ['hera','HERA','Queen of Olympus','👑','#d7a8d6','Marriage & Sovereignty','She remembers every oath made in a household.'],
    ['apollo','APOLLO','Far-Shooter','☀','#f5d56a','Light, Music & Prophecy','He offers a clear answer, then asks what you will do with it.'],
    ['hestia','HESTIA','Keeper of the Hearth','🔥','#e6a56d','Hearth & Home','Her quiet flame protects those who have nowhere left to return.'],
    ['persephone','PERSEPHONE','Queen Below','🌺','#cc8fb9','Spring & the Underworld','She knows that a return is never the same as an escape.'],
    ['hecate','HECATE','Torch-Bearer','🗝','#a88cdf','Crossroads & Witchcraft','At every fork, she shows the cost of each road.'],
    ['nyx','NYX','Night Incarnate','🌙','#756aaf','Night & Primordial Dark','The dark is older than fear and gentler than its children.'],
    ['thanatos','THANATOS','Gentle Death','🪽','#8b9bab','Death & Release','He asks whether the dead you strike are still being held here.'],
    ['hypnos','HYPNOS','Soft-Sleep','💤','#91a7ca','Sleep & Dreams','Rest is a mercy, but a dream can also be a warning.'],
    ['charon','CHARON','The Ferryman','⚱','#827b71','Ferries & Passage','Every crossing costs something; the fare need not be coin.'],
    ['nemesis','NEMESIS','She Who Rebalances','⚖','#c56f62','Retribution & Balance','She tallies what you take as carefully as what you endure.'],
    ['nike','NIKE','Winged Victory','🏆','#e0bb62','Victory & Contest','She rewards a hard-won triumph, never a free one.'],
    ['iris','IRIS','Rainbow Messenger','🌈','#9acbe0','Messages & Rainbows','She carries the words no one else dares to deliver.'],
    ['hebe','HEBE','Cup-Bearer of Youth','🍷','#d5b6dd','Youth & Renewal','She lends another beginning to those who have earned one.'],
    ['asclepius','ASCLEPIUS','Physician of the Gods','🐍','#83b7a1','Medicine & Healing','A wound can teach; it does not have to become a home.'],
    ['pan','PAN','Lord of the Wild','🎶','#99a36f','Wild Places & Panic','He laughs when a neat plan meets the living woods.'],
    ['eros','EROS','The Unavoidable','💘','#df93ac','Desire & Creative Force','Want can make a weapon of the heart or a reason to spare.'],
    ['eris','ERIS','Bringer of Strife','🍎','#d17860','Discord & Rivalry','She scatters a golden choice among people already at odds.'],
    ['gaia','GAIA','Earth Mother','🌿','#91ae78','Earth & Ancestry','The ground remembers every generation that has asked it to bear a war.'],
    ['kronos','KRONOS','The Titan of Time','⌛','#ad805e','Time & the Titans','Time does not forgive; it only gives the living another moment.'],
    ['rhea','RHEA','Mother of the Gods','🦁','#be9b73','Motherhood & Mountains','She hid her children once and will not abandon them now.'],
    ['themis','THEMIS','Voice of Divine Law','⚖','#c9b37a','Law & Right Order','A law without mercy becomes only another chain.'],
    ['tyche','TYCHE','Lady of Fortune','🎲','#dfbf72','Fortune & Chance','Luck smiles on the bold, then asks them to share the winnings.'],
    ['morpheus','MORPHEUS','Shaper of Dreams','🦋','#8aa9bb','Dreams & Visions','A dream is a message, not a command.'],
    ['moirai','THE MOIRAI','The Three Fates','🧵','#c9b7a0','Fate & the Thread','They will not cut a thread merely because it hurts to hold.'],
    ['amphitrite','AMPHITRITE','Queen of the Sea','🐚','#79bdc4','Sea & Tides','The sea keeps the names that the shore refuses.'],
    ['triton','TRITON','Trumpeter of the Deep','🐬','#70b8c9','Sea & Sea-Calls','One note can gather a host or send it scattering.'],
    ['boreas','BOREAS','North Wind','❄','#9bbbd2','Winter & the North Wind','His cold clears a path and leaves no warmth behind.'],
    ['aeolus','AEOLUS','Keeper of the Winds','🌬','#a8c2bb','Winds & Their Vault','He offers a favorable wind only to those who choose a direction.'],
    ['selene','SELENE','Moon in Her Chariot','🌕','#d2c9e9','Moon & Night Journeys','Moonlight reveals the footprints that daylight erases.'],
    ['helios','HELIOS','All-Seeing Sun','🌞','#f0ac53','Sun & Witness','Nothing on the road escapes the sun’s long witness.'],
    ['eos','EOS','Dawn-Bringer','🌅','#e89e8c','Dawn & New Beginnings','A new day is a promise, not an absolution.'],
    ['harmonia','HARMONIA','Peacemaker','🎼','#d8a6a9','Harmony & Concord','She can join opposing voices without making them alike.'],
    ['prometheus','PROMETHEUS','Bearer of Fire','🔥','#df794e','Forethought & Mankind','He favors those who carry a stolen light for someone else.'],
    ['atlas','ATLAS','The Sky-Bearer','🌌','#8293bd','Endurance & the Heavens','He knows the difference between bearing a burden and choosing it.'],
    ['styx','STYX','Oath-River','💧','#6db5bd','Oaths & the Underworld River','An oath sworn in her name binds gods and mortals alike.'],
    ['phobos','PHOBOS','The Shape of Fear','👁','#a66d70','Fear & Rout','Fear may warn you, but it must not choose for you.']
  ];
  const portraitById = { zeus:0, hera:1, poseidon:2, demeter:3, athena:4, apollo:5, artemis:6, ares:7,
    aphrodite:8, hephaestus:9, hermes:10, hestia:11, dionysus:12, hades:13, chaos:14 };
  deityCatalog.forEach((g, i) => {
    const id = g[0];
    D.GODS[id] = { id, name:g[1], title:g[2], icon:g[3], color:g[4], domain:g[5], blurb:g[6], portraitCell:i < 3 ? [1,5,11][i] : 12 + i,
      group: i < 3 ? 'Olympians' : (['persephone','hecate','nyx','thanatos','hypnos','charon','styx'].includes(id) ? 'Underworld & Night' :
        (['amphitrite','triton','boreas','aeolus'].includes(id) ? 'Sea & Winds' : (['gaia','kronos','rhea','atlas','prometheus'].includes(id) ? 'Primordials & Titans' : 'Immortals & Heroes'))) };
  });
  D.OLYMPIANS = ['zeus','hera','poseidon','demeter','athena','apollo','artemis','ares','aphrodite','hephaestus','hermes','hestia','dionysus'];
  D.OLYMPIANS.forEach(id => { if (D.GODS[id]) { D.GODS[id].olympian = true; D.GODS[id].group = 'Olympians'; } });
  const courtCallStyles = {
    hera:'ward', apollo:'sun', hestia:'hearth', persephone:'harvest', hecate:'crossroads', nyx:'night', thanatos:'reaper',
    hypnos:'dream', charon:'ferry', nemesis:'retribution', nike:'victory', iris:'prism', hebe:'renewal', asclepius:'healing',
    pan:'wild', eros:'desire', eris:'discord', gaia:'earth', kronos:'time', rhea:'guardian', themis:'judgment', tyche:'fortune',
    morpheus:'dream', moirai:'fate', amphitrite:'wave', triton:'tide', boreas:'frost', aeolus:'wind', selene:'moon', helios:'sun',
    eos:'renewal', harmonia:'concord', prometheus:'fire', atlas:'endurance', styx:'oath', phobos:'fear'
  };
  Object.keys(courtCallStyles).forEach(id => { if (D.GODS[id]) D.GODS[id].callStyle = courtCallStyles[id]; });
  [['zeus','hera'],['athena','poseidon'],['artemis','aphrodite'],['demeter','hades'],['apollo','dionysus'],
   ['ares','athena'],['hephaestus','aphrodite'],['hermes','charon'],['persephone','thanatos'],['nemesis','tyche'],
   ['gaia','kronos'],['prometheus','zeus'],['boreas','helios'],['themis','eris'],['pan','apollo'],['styx','chaos']]
    .forEach(pair => { if (D.GODS[pair[0]]) (D.GODS[pair[0]].rivals = D.GODS[pair[0]].rivals || []).push(pair[1]); if (D.GODS[pair[1]]) (D.GODS[pair[1]].rivals = D.GODS[pair[1]].rivals || []).push(pair[0]); });
  Object.keys(D.GODS).forEach((id, i) => {
    const g = D.GODS[id];
    if (portraitById[id] !== undefined) g.portraitCell = portraitById[id];
    if (!g.group) g.group = g.olympian ? 'Olympians' : (id === 'chaos' ? 'Primordials' : 'Underworld & Night');
  });
  const courtBoonFx = [
    ['dmgMul',0.045],['maxHp',5],['crit',0.018],['moveMul',0.035],['specialMul',0.05],['armor',1],
    ['dmgReduce',0.018],['shieldOnRoom',4],['killHeal',1.25],['obolMul',0.045],['dashDmg',4],['castMul',0.05],
    ['attSpd',0.035],['rareChance',0.035],['lifesteal',0.008],['dmgMul',0.04],['maxHp',4],['critMul',0.08]
  ];
  Object.keys(D.GODS).forEach((id, i) => {
    const g = D.GODS[id], fx = courtBoonFx[i % courtBoonFx.length];
    const boonId = 'court_' + id;
    D.BOONS.push({ id:boonId, name:g.name.charAt(0) + g.name.slice(1).toLowerCase() + '’s Audience',
      desc:g.blurb + ' The favor answers in this run.', god:id, slot:'passive', rarity:'common', icon:'god:' + id,
      fx:{ [fx[0]]:fx[1] }, familyId:boonId, sourceId:boonId, visualKey:'god:' + id, divineCourt:true });
  });

  /* 232 distinct painted enemy cells. Each entry keeps its own silhouette,
     combat role, lore, and regional home; the atlases are images, never shapes. */
  const enemyArtBatches = [
    { key:'mythic-catalog', names:[
      'Bronze Shield Automaton','Tusked Underworld Boar','Ash-Wing Harpy','Many-Eyed Cyclops Archer','River Kelpie','Bronze Hoplite Shade','Vine-Wrapped Satyr','Serpent-Crowned Gorgon',
      'Three-Mouthed Empusa','Armored Skeleton Captain','Mourning Banshee','Labyrinth Bull Scout','Reef Siren','Molten Forge Imp','Frost Centaur Lancer','Chained Telkhine Sorcerer',
      'Giant Leaping Spider','Bronze Lioness','Skeletal Chariot Driver','Swamp Hydra Hatchling','Blind Cave Oracle','Winged Vulture Demon','Armored Tortoise Warrior','Underworld Hound Alpha',
      'Cinder Ghost','Spear-Bearing Amazon Shade','Black-Water Revenant','Marble Statue Assassin','Two-Headed Wolf','Thorn Dryad','Storm Giantling','Bone-Masked Plague Seer',
      'Bronze Scorpion Automaton','Ash Phoenix Chick','Serpent Priest','Drowned Minotaur','Crystal-Eyed Lamia','War-Drum Cyclops','Underworld Moth Swarm','Broken-Wing Fury'
    ]},
    { key:'mythic-2', names:[
      'Aethon, Vulture of the Crag','Calydonian Boarlet','Crommyonian Sow','Nemean Lion Cub','Hydra Neckling','Ladon Coilguard','Colchian Fire Bull','Hyperborean White Bull',
      'Boreal Harpy Archer','Bronze Spear Revenant','Drowned Wraith Lancer','Bog Hydra Brute','Cave Cyclops Mauler','Many-Necked Marsh Hydra','Stormcrest Harpy','Aegean Sea Serpent',
      'Mourning Empusa','Red-Eyed Lamia','Ashen Drake','Bronze-Claw Scorpion','Bluefang Wolf','Cinder Hound','Golden Phoenix Scion','Serpent-Rooted Oracle',
      'One-Eyed Mireling','Blackwater Eelshade','Lamia Moon-Priestess','Red-Horned Minotaur','Blood-Comb Cockatrice','Gilded Automaton Guard','Grey-Eagle Gryphon','Sun-Talon Roc',
      'Lion of Nemea’s Brood','Fellflame Shade','Serpent-Helm Spearman','Blueclaw Tide-Crab','Swamp Crown Hydra','Veilwing Harpy','Pale Underworld Ghoul','Moonlit Drowned Bride',
      'Owl-Eyed Night Stalker','Siren of the Reeds','Black-Bronze Owlbear','Winged Labyrinth Stalker','Salt-Worn Automaton','Chain-Bound Ferryman Shade','Moon-Hushed Empusa','Glassfin Jelly Wraith',
      'Scorpion-Tailed Lamia','Horned Ash Bull','Pelt of the Deep Boar','Frostmane Lion','Mire-Snake Hydra','Golden Horned Serpent','Ember-Breath Chimera','Snowblind Cyclops',
      'Reef-Caller Siren','Gorgon of the Broken Shore','Alectryon’s Curse','Bronze-Backed Manticore','Coal-Eyed Cerberian','Harbor Minotaur','Hollow-Eyed Centaur','Duskwing Fury'
    ]},
    { key:'mythic-3', names:[
      'Root-Coiled Drakon','Oak-Skinned Dryad','Storm-Handed Giant','Black Shield Warden','Lava-Forged Colossus','Cinderborn Telkhine','Mountain Oread Brute','Thunderhead Titanling',
      'Ashen Eidolon','Gold-Leaf Hoplite','Spear-Crested Centaur','Laurel-Bound Champion Shade','Ivory Oracle','Bronze Labyrinth Guard','Winged Sphinx Cub','Horned Satyr Enforcer',
      'Basalt Minotaur','Red-Eyed Fury','Oathbreaker Shade','Wheel-Rattle Charioteer','Vesper Harpy','Night-Clad Fury','Storm-Bell Cyclops','Cinderback Giant',
      'Golden Gorgon','White Marble Giant','Boulder-Bearer Hecaton','Foam-Born Kelpie','Black-Reed Naiad','Tomb-Bell Revenant','Ash-Horned Brute','Winter-Helmed Champion',
      'Laurel Wraith','Forge-Hearted Automaton','Iron-Scale Hoplite','Blue-Frost Duelist','Sable Bow Shade','Scarlet Spear Shade','Verdant Cloak Hunter','Olive-Wood Huntress Shade',
      'Moon-Iced Oracle','Twin-Eyed Cursecaller','Grave-Mist Ferryman','Ivory Scythe Shade','Midnight Wing Fury','Reed-Whistle Satyr','Crowned Serpent Guard','Ash-Eyed Telkhine',
      'Sea-Bronze Hecaton','White-Stone Cyclops','Underworld Quarry Brute','Acheron Horse Shade','Mourning Bell Keeper','Molten Vein Titanling','Sapphire Storm Warden','Pale Ash Warden',
      'Cypress Cloak Assassin','Ember-Chain Reaver','Salt-Crusted Minotaur','Frost-Gale Centaur','Cobalt Aegis Soldier','Sunken Bronze Shade','Ruin-Caller Oracle','Grave-Lantern Fury'
    ]},
    { key:'mythic-4', names:[
      'Owl-Masked Harpy','Cypress Gorgon','Blackfeather Harpy Captain','Wind-Rider Hippalectryon','Drowned Bronze Hoplite','Styx-Reed Reaper','Moonlit Lamia','Glasswater Naiad',
      'Serpent-Backed Empusa','Labyrinth Bull Guard','Aegean Spear Shade','Thorn-Crowned Dryad','Riverbank Lyre Shade','Blue-String Siren','Gorgon Coilguard','Ash-Hide Hound',
      'Dusk Phoenix','Deepwater Serpent','Twin-Jawed Hound','Wheeled Shade Charioteer','Bronze-Maned Lion','Thistlewing Moth Demon','Underworld Baker Shade','Gold-Aegis Hoplite',
      'Kelpie of the Wild Current','Blackfang Wolf','Ram-Horned Satyr','Bluefire Sea Drake','Ashen Cyclops Slinger','Crag Gryphon','Midnight Sphinx','Drowned Bride of Acheron',
      'Wildwood Lion','Bronze Coil Automaton','Winged Marble Harpy','Cinder Mane Manticore','White-Horned Labyrinth Bull','Thunder-Ice Warg','Ivory Revenant','Mothwing Empusa',
      'Scorpion-Armored Serpent','Aegean Serpent Knight','Greywing Fury','Black Thorn Brute','Bronze Shield Guardian','Red Veil Queen Shade','Frostwing Butterfly Wraith','Chain-Bell Cyclops',
      'Sand-Buried Hydra','Salt-Aegis Champion','Pale Boar Shade','Night Pelt Wolf','White Gale Centaur','Ash-Hoof Phoenix Steed','Grief-Cloaked Reaper','Sickle-Bearer Shade',
      'Thorn-Rooted Dryad','Oracle of the Broken Laurel','Coral-Backed Stone Brute','Winged Bronze Amazon','Scree-Crested Harpy','Abyssal Spineshell','Oath-Bound Spear Shade','Red-Bronze Fury'
    ]}
  ];
  const enemyRoles = ['lunge','lurcher','charger','dive','shooter','skirmish','kiter','petrifier','brute','shielder','summoner','fury','exploder','hundred','duelist'];
  const enemyOptions = {
    lunge:{lungeRange:110,lungeCd:1.35,telegraph:0.34}, lurcher:{hopCd:1.25,hopDist:145,telegraph:0.32},
    charger:{chargeSpeed:400,chargeRange:360,chargeCd:2.8,chargeTime:0.56,windup:0.45},
    dive:{diveSpeed:420,diveCd:2.4,telegraph:0.44,orbit:180},
    shooter:{proj:'spark',projCd:2.25,burst:2,spread:0.35,projSpeed:300,range:450,keepAway:230},
    skirmish:{proj:'arrow',burstCd:2.1,burst:2,spread:0.45,projSpeed:320,range:390,orbit:180},
    kiter:{proj:'arrow',gallopCd:3,burst:2,projSpeed:300,range:470,keepAway:250},
    petrifier:{gazeCd:3.4,gazeRange:330,gazeArc:0.5,gazeDur:1.2,gazeWind:0.85,petrifyDur:0.85},
    brute:{chargeSpeed:350,chargeRange:300,chargeCd:3.1,chargeTime:0.62,slamRange:145,slamCd:3.8},
    shielder:{block:0.24,shieldArc:1.5,bashRange:104,bashCd:2.8},
    summoner:{proj:'curse',summonType:'soul',summonCount:2,summonCd:5.8,shootCd:2.1,projSpeed:260,range:460},
    fury:{teleportCd:4.2,whipCd:1.9,lashRange:185,diveCd:2.4,diveSpeed:440},
    exploder:{fuseRange:62,fuse:0.9}, hundred:{volleyCd:2.6,burst:4,spread:1,projSpeed:285,sweepRange:148,sweepCd:2.6},
    duelist:{comboRange:108,lungeCd:1.65,lungeSpeed:480,telegraph:0.38}
  };
  let catalogIndex = 0;
  enemyArtBatches.forEach(batch => batch.names.forEach((name, cell) => {
    const id = 'catalog_' + String(catalogIndex + 1).padStart(3, '0');
    const ai = enemyRoles[catalogIndex % enemyRoles.length];
    const region = D.REGIONS[Math.floor(catalogIndex * D.REGIONS.length / 232)];
    const statsBand = catalogIndex % 16;
    const color = ['#d09460','#7ab9bd','#be745f','#91a878','#b8a2d2','#ccb96e','#778fb4','#b7b6aa'][Math.floor(catalogIndex / 29) % 8];
    D.ENEMIES[id] = { id, name, desc:name + ' is a ' + ai + ' threat from ' + region.name + '. Its painted bestiary likeness marks its silhouette before its attack begins.',
      hp:Math.round(38 + statsBand * 4.2), dmg:Math.round(8 + statsBand * 0.55), spd:Math.round(106 + (catalogIndex % 9) * 7),
      radius:13 + (catalogIndex % 5) * 1.5, color, ai, ai_opts:copy(enemyOptions[ai]), score:1.05 + (catalogIndex % 8) * 0.24,
      visualKey:batch.key, visualCell:cell, catalogCreature:true, bestiaryLore:'The shades call it ' + name.toLowerCase() + '. In life it was bound to ' + region.name + '; death has kept the shape and sharpened the grievance.',
      regionHome:region.id, sourceId:id, familyId:id };
    catalogIndex++;
  }));
  D.CATALOG_ENEMY_FAMILIES = catalogIndex;

  const boonProfiles = [
    ['keen', 'Keen', '+8% attack damage.', { dmgMul: 0.08 }],
    ['fleet', 'Fleet', '+5% movement speed.', { moveMul: 0.05 }],
    ['precise', 'Sure-Eyed', '+2.5% critical chance.', { crit: 0.025 }],
    ['armored', 'Bronze-Bound', '+1 armor.', { armor: 1 }],
    ['steadfast', 'Steadfast', '+2.5% damage reduction.', { dmgReduce: 0.025 }],
    ['sanguine', 'Sanguine', '+1.2% life steal.', { lifesteal: 0.012 }],
    ['vital', 'Vital', '+5 maximum health.', { maxHp: 5 }],
    ['flourishing', 'Flourishing', '+8% Wrath damage.', { specialMul: 0.08 }],
    ['swift', 'Quick-Handed', '+4.5% attack speed.', { attSpd: 0.045 }],
    ['dashing', 'Wayfaring', '+5 dash damage.', { dashDmg: 5 }],
    ['warded', 'Ward-Kept', '+4 starting shield in each chamber.', { shieldOnRoom: 4 }],
    ['merciful', 'Merciful', '+1.5 health per kill.', { killHeal: 1.5 }],
    ['generous', 'Open-Handed', '+1 level-up reroll.', { rerollPlus: 1 }],
    ['fated', 'Fate-Favored', '+1 reroll.', { rerollPlus: 1 }],
    ['fortunate', 'Fortunate', '100% chance to drop 1 Obol on each hit.', { coinOnHit: 1 }],
    ['piercing', 'Piercing', '+1 extra target pierced by projectiles.', { pierce: 1 }],
    ['seeking', 'Seeking', '+0.1 projectile homing strength.', { homing: 0.1 }],
    ['potent', 'Potent', '+7% Cast damage.', { castMul: 0.07 }],
    ['unyielding', 'Unyielding', '+6% Guard strength.', { guardMul: 0.06 }]
  ];
  const relicProfiles = [
    ['keen', 'Keen', 'Its edge remembers another victory.', { dmgMul: 0.07 }],
    ['fleet', 'Fleet', 'Its blessing quickens your stride.', { moveMul: 0.045 }],
    ['precise', 'Sure-Eyed', 'It draws a cleaner line to the Fates.', { crit: 0.02 }],
    ['armored', 'Bronze-Bound', 'Its aged bronze turns a little harm.', { armor: 1 }],
    ['steadfast', 'Steadfast', 'It helps you endure the next assault.', { dmgReduce: 0.025 }],
    ['sanguine', 'Sanguine', 'It drinks a trace of life from each blow.', { lifesteal: 0.01 }],
    ['vital', 'Vital', 'It adds strength to your mortal frame.', { maxHp: 6 }],
    ['flourishing', 'Flourishing', 'Its favor empowers your special.', { specialMul: 0.07 }],
    ['swift', 'Quick-Handed', 'It lends speed to your weapon.', { attSpd: 0.04 }],
    ['dashing', 'Wayfaring', 'Its wind follows your dash.', { dashDmg: 5 }],
    ['warded', 'Ward-Kept', 'A small ward returns each chamber.', { shieldOnRoom: 5 }],
    ['merciful', 'Merciful', 'It asks the fallen to repay you.', { killHeal: 2 }],
    ['generous', 'Open-Handed', 'It draws more obols from the dead.', { obolMul: 0.06 }],
    ['fated', 'Fate-Favored', 'It grants one more chance to choose.', { rerollPlus: 1 }],
    ['fortunate', 'Fortunate', 'It finds coins in unlikely places.', { coinOnHit: 1 }],
    ['piercing', 'Piercing', 'Its force carries through a target.', { pierce: 0.12 }],
    ['seeking', 'Seeking', 'It guides your projectiles toward their mark.', { homing: 0.1 }],
    ['potent', 'Potent', 'It strengthens your cast.', { castMul: 0.07 }],
    ['unyielding', 'Unyielding', 'It steadies your guard.', { guardMul: 0.06 }]
  ];
  const enemyProfiles = [
    ['ashbound', 'Ashbound', 1.18, 1.08, 0.94, 'Ash has hardened its body.'],
    ['swift', 'Fleet', 0.9, 1.04, 1.2, 'It closes distance before you expect.'],
    ['ironhide', 'Ironhide', 1.38, 0.96, 0.86, 'Its hide turns glancing blows.'],
    ['blooded', 'Blooded', 0.96, 1.22, 1.02, 'It strikes with reckless force.'],
    ['hollow', 'Hollow', 0.82, 0.9, 1.12, 'It is frail, but difficult to catch.'],
    ['heavy', 'Heavy', 1.5, 1.12, 0.78, 'It carries the weight of the Underworld.'],
    ['hungry', 'Hungry', 1.08, 1.14, 1.08, 'The sight of blood makes it faster.'],
    ['ashen', 'Cinder-Crowned', 1.12, 1.16, 0.98, 'Cinders cling to its every strike.'],
    ['tideborn', 'Tide-Born', 1.1, 0.94, 1.1, 'The river lends it restless motion.'],
    ['grave', 'Grave-Kept', 1.28, 1.0, 0.92, 'Its burial armor has not yet failed.'],
    ['storm', 'Storm-Touched', 0.98, 1.12, 1.16, 'A crackle of distant thunder drives it.'],
    ['cunning', 'Cunning', 0.94, 1.08, 1.1, 'It waits for the smallest opening.'],
    ['withered', 'Withered', 0.88, 0.86, 0.9, 'Age has weakened it, but not its malice.'],
    ['veteran', 'Veteran', 1.24, 1.12, 1.04, 'It remembers every battlefield.'],
    ['gilded', 'Gilded', 1.18, 1.04, 0.96, 'Old offerings armor its frame.'],
    ['dire', 'Dire', 1.32, 1.18, 0.9, 'A dire omen follows its arrival.'],
    ['howling', 'Howling', 1.02, 1.14, 1.12, 'Its cry hardens the next attack.'],
    ['relentless', 'Relentless', 1.12, 1.1, 1.08, 'It does not tire or hesitate.'],
    ['fractured', 'Fractured', 0.9, 1.2, 1.02, 'Its broken form lashes out unpredictably.']
  ];

  function mergeFx(original, bonus) {
    const fx = copy(original || {});
    Object.keys(bonus).forEach(key => {
      fx[key] = typeof fx[key] === 'number' ? fx[key] + bonus[key] : bonus[key];
    });
    return fx;
  }
  function addCatalogVariants(baseList, profiles, targetList, kind) {
    const originals = baseList.slice();
    originals.forEach(base => {
      base.familyId = base.familyId || base.id;
      base.sourceId = base.sourceId || base.id;
      base.visualKey = base.visualKey || (kind === 'boon' ? 'god:' + base.god : kind === 'relic' ? 'relic:' + base.id : base.id);
      profiles.forEach((profile, index) => {
        const item = copy(base);
        item.id = base.id + '_v' + String(index + 1).padStart(2, '0');
        item.name = profile[1] + ' ' + base.name;
        item.desc = base.desc + ' ' + profile[2];
        item.fx = mergeFx(base.fx, profile[3]);
        item.familyId = base.familyId;
        item.sourceId = base.id;
        item.variantId = profile[0];
        item.visualKey = base.visualKey;
        item.generatedVariant = true;
        targetList.push(item);
      });
    });
  }

  const baseBoons = D.BOONS.slice();
  const baseSpecial = D.SPECIAL_BOONS.slice();
  const baseRelics = D.RELICS.slice();
  addCatalogVariants(baseBoons, boonProfiles, D.BOONS, 'boon');
  addCatalogVariants(baseSpecial, boonProfiles, D.SPECIAL_BOONS, 'boon');
  addCatalogVariants(baseRelics, relicProfiles, D.RELICS, 'relic');

  const enemyFamilies = Object.create(null);
  const baseEnemyIds = Object.keys(D.ENEMIES).filter(id => !D.ENEMIES[id].summon);
  baseEnemyIds.forEach(id => {
    const base = D.ENEMIES[id];
    base.familyId = base.familyId || id;
    base.sourceId = base.sourceId || id;
    base.visualKey = base.visualKey || id;
    enemyFamilies[id] = [id];
    enemyProfiles.forEach(profile => {
      const variant = copy(base);
      variant.id = id + '_' + profile[0];
      variant.name = profile[1] + ' ' + base.name;
      variant.desc = base.desc + ' ' + profile[5];
      variant.hp = Math.max(1, Math.round(base.hp * profile[2]));
      variant.dmg = Math.max(1, Math.round(base.dmg * profile[3]));
      variant.spd = Math.max(24, Math.round(base.spd * profile[4]));
      variant.familyId = base.familyId;
      variant.sourceId = id;
      variant.variantId = profile[0];
      variant.visualKey = base.visualKey;
      variant.generatedVariant = true;
      variant.ai_opts = copy(base.ai_opts || {});
      if (profile[0] === 'ironhide' || profile[0] === 'grave') {
        variant.ai_opts.block = Math.max(variant.ai_opts.block || 0, 0.2);
        variant.ai_opts.shieldArc = variant.ai_opts.shieldArc || 1.35;
      }
      if (profile[0] === 'storm' || profile[0] === 'howling') {
        ['projSpeed', 'chargeSpeed', 'diveSpeed'].forEach(key => {
          if (typeof variant.ai_opts[key] === 'number') variant.ai_opts[key] = Math.round(variant.ai_opts[key] * 1.12);
        });
      }
      if (profile[0] === 'cunning' || profile[0] === 'relentless') {
        ['projCd', 'gazeCd', 'diveCd', 'chargeCd', 'throwCd', 'summonCd', 'whipCd', 'sweepCd'].forEach(key => {
          if (typeof variant.ai_opts[key] === 'number') variant.ai_opts[key] *= 0.88;
        });
      }
      D.ENEMIES[variant.id] = variant;
      enemyFamilies[id].push(variant.id);
    });
  });

  const baseBosses = Object.keys(D.BOSSES).map(id => copy(D.BOSSES[id]));
  const bossAspectNames = [
    'Ash-Crowned', 'Black-Bronze', 'Chain-Bound', 'Drowned', 'Fate-Woven',
    'Gale-Sworn', 'Grave-Kissed', 'Hell-Forged', 'Ivory', 'Jade-Eyed',
    'Moon-Sealed', 'Nightfall', 'Oracle-Born', 'Pale-Fire', 'Rift-Born',
    'Storm-Tempered', 'World-Eater'
  ];
  baseBosses.forEach(base => {
    base.familyId = base.familyId || base.id;
    base.sourceId = base.sourceId || base.id;
    base.visualKey = base.visualKey || base.id;
    bossAspectNames.forEach((name, i) => {
      const id = base.id + '_aspect_' + String(i + 1).padStart(2, '0');
      const aspect = copy(base);
      aspect.id = id;
      aspect.name = name.toUpperCase() + ' ' + base.name;
      aspect.title = name + ' aspect of ' + base.title;
      aspect.hp = Math.round(base.hp * (1.08 + i * 0.035));
      aspect.intro = name + ' answers the call from the far side of the chamber.';
      aspect.familyId = base.id;
      aspect.sourceId = base.id;
      aspect.variantId = 'aspect-' + String(i + 1).padStart(2, '0');
      aspect.visualKey = base.visualKey;
      aspect.generatedVariant = true;
      D.BOSSES[id] = aspect;
    });
  });

  const newBosses = [
    { id: 'styx_warden', name: 'THE STYX WARDEN', title: 'Keeper of the Black Current', hp: 1180, radius: 44, color: '#548f9c', ai: 'hydra', desc: 'The ferryman’s drowned sentinel drags the river behind its hooked spear.', intro: 'A chain rises from the black water, and something follows it.', music: 2 },
    { id: 'tantalus', name: 'TANTALUS', title: 'The Thirst That Never Ends', hp: 1320, radius: 40, color: '#bd7040', ai: 'lion', desc: 'Food and water retreat from him. His hunger has learned to strike first.', intro: 'The banquet vanishes. Tantalus turns his empty hands toward you.', music: 1 },
    { id: 'achilles', name: 'ACHILLES', title: 'The Unquiet Hero', hp: 1480, radius: 38, color: '#bd8f56', ai: 'lion', desc: 'The best of the Greeks still remembers every opening in a shield wall.', intro: 'A bronze spear rings against a bronze shield. The shade steps forward.', music: 3 },
    { id: 'mourning_orpheus', name: 'THE SHADE OF ORPHEUS', title: 'The Song Turned Backward', hp: 1260, radius: 38, color: '#a495c0', ai: 'medusa', desc: 'His song gathers the dead into a chorus that wants you silent.', intro: 'A lyre sounds from the empty field. The notes have teeth.', music: 2 },
    { id: 'labyrinth_asterion', name: 'ASTERION', title: 'The Labyrinth’s Last Son', hp: 1620, radius: 50, color: '#95663b', ai: 'lion', desc: 'The maze has taught its bull to read your path before you take it.', intro: 'The corridors answer with a hoofbeat from every direction.', music: 3 },
    { id: 'scylla', name: 'SCYLLA', title: 'The Reef That Hungers', hp: 1760, radius: 52, color: '#4a8290', ai: 'hydra', desc: 'Six jaws break the crossing’s surface at once.', intro: 'The tide withdraws, exposing too many teeth.', music: 2 },
    { id: 'porphyrion', name: 'PORPHYRION', title: 'The Storm Giant King', hp: 2160, radius: 56, color: '#796a9a', ai: 'typhon', desc: 'The king of giants has climbed high enough to put a hand around the sky.', intro: 'The mountain cracks. A Titan stands in the lightning.', music: 4 },
    { id: 'hecatoncheir', name: 'THE HUNDRED-HANDED ONE', title: 'The Last Wall of Olympus', hp: 2440, radius: 58, color: '#c7b992', ai: 'typhon', desc: 'A hundred arms close every road to the summit.', intro: 'The marble gate moves. Its hands begin to open.', music: 4 },
    { id: 'delphi_python', name: 'PYTHO, THE ORACLE SERPENT', title: 'The Prophecy Beneath Parnassus', hp: 2600, radius: 48, color: '#b9a35d', ai: 'hydra', signature: 'delphi_oracle', desc: 'Apollo’s ancient guardian still coils beneath the oracle, speaking through the stone.', intro: 'The fissure exhales. A golden eye opens below the temple.', music: 3 },
    { id: 'pelion_nessus', name: 'NESSUS, THE CENTAUR AMBUSHER', title: 'The Poisoned Road of Pelion', hp: 2780, radius: 48, color: '#a96943', ai: 'lion', signature: 'pelion_ambush', desc: 'A centaur’s old grievance has taken root in the healer’s mountain.', intro: 'Hooves strike the trail behind you. The path closes ahead.', music: 3 },
    { id: 'arcadia_boar', name: 'THE ERYMANTHIAN BOAR', title: 'The White Tusk of Arcadia', hp: 2970, radius: 52, color: '#b98a55', ai: 'lion', signature: 'arcadia_tusks', desc: 'The mountain boar breaks the hunt-lines and charges through every grove.', intro: 'The forest falls quiet. Then every tree begins to shake.', music: 2 },
    { id: 'thebes_sphinx', name: 'THE SPHINX OF SEVEN GATES', title: 'Keeper of the Unanswered', hp: 3150, radius: 50, color: '#b48062', ai: 'medusa', signature: 'thebes_riddle', desc: 'Her riddle survives its answer, and the seven gates still bow to her gaze.', intro: 'A wing folds over the gate. “Tell me what walks past death.”', music: 3 },
    { id: 'marathon_bull', name: 'THE BULL OF MARATHON', title: 'The Run That Scattered Armies', hp: 3350, radius: 54, color: '#b9b7a8', ai: 'lion', signature: 'marathon_charge', desc: 'The bull’s ancient fury crosses the plain faster than any army can turn.', intro: 'A bronze bell rings once. The plain answers with hoofbeats.', music: 3 },
    { id: 'mycenae_tisiphone', name: 'TISIPHONE, THE HOUSE’S FURY', title: 'Avenger of the Atreid Blood', hp: 3560, radius: 52, color: '#9f574d', ai: 'medusa', signature: 'mycenae_furies', desc: 'The Erinys keeps every crime of the Atreid house alive in her wings.', intro: 'A red feather settles on the Lion Gate. Then the shadow rises.', music: 4 }
  ];
  const bossStages = {
    styx_warden: [
      { at: 1, name: 'THE DROWNED CHAIN' },
      { at: 0.62, name: 'THE BLACK CURRENT', sub: 'The river pulls in two directions.' },
      { at: 0.28, name: 'NO SHORE', sub: 'The flood leaves only a narrow way through.' }
    ],
    tantalus: [
      { at: 1, name: 'THE EMPTY BANQUET' },
      { at: 0.62, name: 'THE FEAST WITHIN REACH', sub: 'Every promise marks a danger.' },
      { at: 0.28, name: 'HUNGER UNBOUND', sub: 'The vanished feast burns the ground.' }
    ],
    achilles: [
      { at: 1, name: 'THE SPEARPOINT' },
      { at: 0.62, name: 'NO SAFE GUARD', sub: 'His shield turns; his flank opens.' },
      { at: 0.28, name: 'THE HERO’S HEEL', sub: 'One last measured thrust.' }
    ],
    mourning_orpheus: [
      { at: 1, name: 'THE FIRST REFRAIN' },
      { at: 0.62, name: 'THE BACKWARD CHORUS', sub: 'The notes arrive in a changed rhythm.' },
      { at: 0.28, name: 'SILENCE BREAKS', sub: 'A final beat before the storm.' }
    ],
    labyrinth_asterion: [
      { at: 1, name: 'THE CHOSEN PATH' },
      { at: 0.62, name: 'THE MAZE REMEMBERS', sub: 'The old safe route has shifted.' },
      { at: 0.28, name: 'CORNERED BEAST', sub: 'Read the marks. Keep a lane open.' }
    ],
    scylla: [
      { at: 1, name: 'THE REEF SONG' },
      { at: 0.62, name: 'SIX HUNGRY THROATS', sub: 'The jaws strike in a staggered rhythm.' },
      { at: 0.28, name: 'THE UNDERTOW', sub: 'The open lane will not stay open.' }
    ],
    porphyrion: [
      { at: 1, name: 'THE THUNDER KING', sub: 'The first storm mark is yours to evade.' },
      { at: 0.62, name: 'SKYFIRE', sub: 'Two strikes; one safe beat between them.' },
      { at: 0.28, name: 'THE STORM CROWN', sub: 'Move when the clouds choose you.' }
    ],
    hecatoncheir: [
      { at: 1, name: 'THE HUNDRED HANDS' },
      { at: 0.62, name: 'ALTERNATING WALLS', sub: 'The sweeps trade sides.' },
      { at: 0.28, name: 'NO WAY THROUGH', sub: 'Layered blows leave one brief opening.' }
    ],
    delphi_python: [
      { at: 1, name: 'THE UNASKED PROPHECY' },
      { at: 0.62, name: 'THE FISSURE SPEAKS', sub: 'The serpent marks three places in sequence.' },
      { at: 0.28, name: 'THE ORACLE UNBOUND', sub: 'The last answer comes from behind you.' }
    ],
    pelion_nessus: [
      { at: 1, name: 'THE NARROW TRAIL' },
      { at: 0.62, name: 'THE CENTAUR’S FEINT', sub: 'The charge turns after its first pass.' },
      { at: 0.28, name: 'THE POISONED AMBUSH', sub: 'A second trail closes the escape.' }
    ],
    arcadia_boar: [
      { at: 1, name: 'THE HUNT BEGINS' },
      { at: 0.62, name: 'BROKEN HUNT-LINES', sub: 'Tusk strikes trade lanes.' },
      { at: 0.28, name: 'THE WHITE CHARGE', sub: 'The boar doubles back at the last moment.' }
    ],
    thebes_sphinx: [
      { at: 1, name: 'THE FIRST QUESTION' },
      { at: 0.62, name: 'THREE FALSE DOORS', sub: 'Only one marked answer is safe.' },
      { at: 0.28, name: 'THE ANSWER THAT BITES', sub: 'The final riddle turns toward the player.' }
    ],
    marathon_bull: [
      { at: 1, name: 'THE LONG PLAIN' },
      { at: 0.62, name: 'HORN AND DUST', sub: 'The charging lane is followed by a cross-strike.' },
      { at: 0.28, name: 'THE MARATHON RUN', sub: 'The bull reverses its line and charges once more.' }
    ],
    mycenae_tisiphone: [
      { at: 1, name: 'THE HOUSE REMEMBERS' },
      { at: 0.62, name: 'THE FURIES’ CHORUS', sub: 'A second wave follows the first.' },
      { at: 0.28, name: 'NO BLOOD FORGOTTEN', sub: 'The avenger closes every marked lane.' }
    ]
  };
  newBosses.forEach(boss => {
    boss.shape = 'image';
    boss.signature = boss.signature || boss.id;
    boss.phases = bossStages[boss.id];
    boss.familyId = boss.id;
    boss.sourceId = boss.id;
    boss.visualKey = boss.id;
    boss.generatedVariant = false;
    D.BOSSES[boss.id] = boss;
  });


  /* Six later capstones reuse the existing painted boss atlases while giving
     each mythic region its own name, history, phase card, and signature pattern. */
  [
    ['acheron_keeper','THE KEEPER OF ACHERON','Judge of the Unmoored','styx_warden',1420,'#6b9caa','styx_warden','The river judge weighs each name against the life it remembers.'],
    ['lethe_mnemosyne','MNEMOSYNE, MEMORY’S LAST GARDEN','Mother of Memory','mourning_orpheus',1710,'#c1b8d5','mourning_orpheus','The garden’s guardian will not let the dead forget what the river asks them to surrender.'],
    ['knossos_crown','THE CROWNED MINOTAUR','Heir of the Painted Palace','labyrinth_asterion',2180,'#bb6844','labyrinth_asterion','The old labyrinth has followed its last son into the palace above.'],
    ['aeaea_circe','CIRCE OF AEAEA','Mistress of the Far Isle','medusa',2480,'#b97a9b','scylla','The island’s sorceress turns every path into a choice of what you will become.'],
    ['colchis_dragon','THE DRAGON OF COLCHIS','Guardian of the Golden Fleece','hydra',3020,'#588b82','porphyrion','The sleepless dragon coils around the tree and the fleece that drew heroes east.'],
    ['typhon_core','TYPHON’S HEART','The Storm Beneath Olympus','typhon',3640,'#bd5038','porphyrion','The chains break inward. The mountain’s last heartbeat answers with thunder.']
  ].forEach(spec => {
    const base = D.BOSSES[spec[3]];
    const boss = copy(base);
    boss.id = spec[0]; boss.name = spec[1]; boss.title = spec[2];
    boss.hp = spec[4]; boss.color = spec[5]; boss.signature = spec[6]; boss.shape = 'image';
    boss.desc = spec[7];
    boss.intro = boss.desc;
    boss.familyId = spec[0]; boss.sourceId = spec[3]; boss.visualKey = base.visualKey || base.id;
    boss.generatedVariant = false;
    boss.phases = copy(base.phases || []);
    D.BOSSES[boss.id] = boss;
  });

  const originalRegions = Object.create(null);
  D.REGIONS.forEach(region => { originalRegions[region.id] = region; });
  const newRegions = [
    { id: 'styx', name: 'RIVER STYX', sub: 'The Current That Remembers', music: 2, accent: '#5c9a9e', sky: ['#07151a','#102b30'], floor: '#0a191d', floor2: '#12262a', wall: '#263f42', fog: 'rgba(12,42,48,0.28)', desc: 'The river carries every oath and every drowned name toward the far shore.', enemies: ['styxling','soul','naiad','shade'], elites: ['styxling','telkhine','eidolon'], boss: 'styx_warden' },
    { id: 'punishment', name: 'FIELDS OF PUNISHMENT', sub: 'The Sentence Without End', music: 1, accent: '#c65035', sky: ['#1d0908','#34100b'], floor: '#180d0b', floor2: '#24120d', wall: '#49251b', fog: 'rgba(82,20,12,0.3)', desc: 'Old judgments are carved into the stone. The chains still know their names.', enemies: ['erinyes_maiden','hoplite','fury','hound'], elites: ['gorgon','fury','cyclops_elder'], boss: 'tantalus' },
    { id: 'elysium', name: 'ELYSIUM', sub: 'The Fields Beyond the Last Breath', music: 4, accent: '#d5b869', sky: ['#32291d','#76603b'], floor: '#28251c', floor2: '#373126', wall: '#74623d', fog: 'rgba(182,151,80,0.18)', desc: 'Heroes rest beneath the laurel. Few are content to remain at rest.', enemies: ['eidolon','centaur','gorgon','shade'], elites: ['eidolon','minotaur','fury'], boss: 'achilles' },
    { id: 'mourning', name: 'FIELDS OF MOURNING', sub: 'Where the Unremembered Wait', music: 2, accent: '#aaa2bd', sky: ['#11121e','#282a3d'], floor: '#151721', floor2: '#202230', wall: '#39394a', fog: 'rgba(104,104,138,0.24)', desc: 'A moonlit plain of quiet flowers. The dead here still hear the living.', enemies: ['soul','shade','empusa','lamia'], elites: ['lamia','empusa','gorgon'], boss: 'mourning_orpheus' },
    { id: 'labyrinth', name: 'DAEDALUS’ LABYRINTH', sub: 'The Turning Halls Below', music: 3, accent: '#b88245', sky: ['#17100b','#332012'], floor: '#19120d', floor2: '#271b10', wall: '#4a301b', fog: 'rgba(78,48,20,0.24)', desc: 'The maze keeps changing its mind about where the center should be.', enemies: ['minotaur','automaton','cyclops','satyr'], elites: ['minotaur','cyclops_elder','telkhine'], boss: 'labyrinth_asterion' },
    { id: 'aegean', name: 'AEGEAN CROSSING', sub: 'The Sea Between Two Worlds', music: 2, accent: '#67a7b4', sky: ['#0a1922','#193241'], floor: '#101d22', floor2: '#1c2a30', wall: '#2f5058', fog: 'rgba(31,95,112,0.22)', desc: 'Saltwater closes above the old harbor stones. Something follows beneath it.', enemies: ['naiad','harpy','centaur','styxling'], elites: ['naiad','gorgon','hound'], boss: 'scylla' },
    { id: 'gigantomachy', name: 'GIGANTOMACHY FRONT', sub: 'The War at the World’s Edge', music: 4, accent: '#8a7da9', sky: ['#171522','#292943'], floor: '#181820', floor2: '#252431', wall: '#3c3b53', fog: 'rgba(72,68,118,0.24)', desc: 'The old battle is still being fought. The ground has not forgotten the Titans.', enemies: ['gigas','hecaton','typhon_spawn','cyclops_elder'], elites: ['gigas','hecaton','minotaur'], boss: 'porphyrion' },
    { id: 'delphi', name: 'DELPHI, SANCTUARY OF APOLLO', sub: 'The Oracle Beneath Parnassus', music: 3, accent: '#c8ae73', sky: ['#1d1b2a','#56627c'], floor: '#28241c', floor2: '#393126', wall: '#685a43', fog: 'rgba(146,156,190,0.2)', desc: 'The oracle’s smoke rises from a mountain fissure where prophecy and memory have begun to blur.', enemies: ['gorgon','harpy','shade','hoplite'], elites: ['gorgon','eidolon','fury'], boss: 'delphi_python' },
    { id: 'pelion', name: 'MOUNT PELION', sub: 'Chiron’s Forest of Lessons', music: 3, accent: '#82a078', sky: ['#17221b','#3e5642'], floor: '#1b241c', floor2: '#2a3329', wall: '#425040', fog: 'rgba(112,148,116,0.22)', desc: 'The centaurs’ old mountain shelters one last ambush beneath Chiron’s healing cave.', enemies: ['centaur','satyr','hound','harpy'], elites: ['centaur','minotaur','cyclops_elder'], boss: 'pelion_nessus' },
    { id: 'arcadia', name: 'ARCADIA, WILDWOOD OF PAN', sub: 'The Hunt Beneath the Moon', music: 2, accent: '#91a875', sky: ['#101d20','#394d43'], floor: '#18221d', floor2: '#263129', wall: '#43513e', fog: 'rgba(102,143,117,0.22)', desc: 'The highland woods answer the pipes with a silence that only Artemis understands.', enemies: ['satyr','centaur','hound','naiad'], elites: ['centaur','gorgon','minotaur'], boss: 'arcadia_boar' },
    { id: 'thebes', name: 'THEBES, CITY OF SEVEN GATES', sub: 'The Riddle Still Watches', music: 3, accent: '#bd795d', sky: ['#291715','#64372e'], floor: '#231916', floor2: '#34221d', wall: '#5d3b30', fog: 'rgba(156,76,59,0.22)', desc: 'Seven gates open on a city that remembers the answer, but not the price of asking.', enemies: ['hoplite','gorgon','shade','empusa'], elites: ['fury','gorgon','cyclops_elder'], boss: 'thebes_sphinx' },
    { id: 'marathon', name: 'MARATHON, THE LONG PLAIN', sub: 'The Bull Before the City', music: 3, accent: '#9d9c79', sky: ['#19252b','#53636a'], floor: '#22241d', floor2: '#323228', wall: '#555345', fog: 'rgba(144,156,143,0.19)', desc: 'The coast wind carries the old hoofbeats across a plain that once sent a warning to Athens.', enemies: ['hoplite','centaur','hound','gigas'], elites: ['minotaur','centaur','gigas'], boss: 'marathon_bull' },
    { id: 'mycenae', name: 'MYCENAE, LION GATE', sub: 'The House of Atreus', music: 4, accent: '#aa6656', sky: ['#1c1112','#492721'], floor: '#211716', floor2: '#30221d', wall: '#58372e', fog: 'rgba(130,49,43,0.25)', desc: 'Behind the Lion Gate, every generation’s crime waits for the next to name it.', enemies: ['fury','hoplite','shade','gorgon'], elites: ['fury','cyclops_elder','hecaton'], boss: 'mycenae_tisiphone' },
    { id: 'olympus_approach', name: 'OLYMPUS APPROACH', sub: 'The Stairway Above the Clouds', music: 4, accent: '#d1ba73', sky: ['#22283a','#53617a'], floor: '#242631', floor2: '#333746', wall: '#62677a', fog: 'rgba(155,169,195,0.19)', desc: 'The mountain rises into thunder. At its crown, the gods have stopped watching.', enemies: ['fury','empusa','telkhine','gorgon'], elites: ['fury','telkhine','hecaton'], boss: 'hecatoncheir' },
    { id: 'acheron', name: 'ACHERON, RIVER OF GRIEF', sub: 'The Black Water Between Breath and Silence', music: 2, accent: '#7998ad', sky: ['#101c2b','#202f43'], floor: '#111b25', floor2: '#1d2935', wall: '#394958', fog: 'rgba(95,125,150,0.26)', desc: 'A moonlit river gathers the grief of every soul that crossed it unnamed.', enemies: ['soul','shade','styxling','naiad'], elites: ['styxling','eidolon','telkhine'], boss: 'acheron_keeper' },
    { id: 'lethe_garden', name: 'GARDEN OF LETHE', sub: 'The Orchard Where Memory Thins', music: 2, accent: '#c3b17b', sky: ['#222a27','#535039'], floor: '#20241d', floor2: '#303326', wall: '#555641', fog: 'rgba(190,177,121,0.20)', desc: 'White blossoms lean over the water. Every fallen leaf bears a name no one can recall.', enemies: ['shade','soul','empusa','lamia'], elites: ['eidolon','empusa','gorgon'], boss: 'lethe_mnemosyne' },
    { id: 'knossos', name: 'KNOSSOS, PALACE OF THE DOUBLE AXE', sub: 'The Sunlit House Above the Maze', music: 3, accent: '#ca7852', sky: ['#34201a','#81513b'], floor: '#2b1c16', floor2: '#39251b', wall: '#72452f', fog: 'rgba(184,101,62,0.2)', desc: 'Bull frescoes watch from red pillars. The palace remembers the maze beneath it.', enemies: ['minotaur','automaton','hoplite','satyr'], elites: ['minotaur','cyclops_elder','automaton'], boss: 'knossos_crown' },
    { id: 'aeaea', name: 'AEAEA, ISLE OF CIRCE', sub: 'The Far Shore of Enchantment', music: 3, accent: '#d39a70', sky: ['#3e2431','#b86659'], floor: '#352521', floor2: '#493029', wall: '#7c4a3c', fog: 'rgba(215,132,106,0.2)', desc: 'A rose-gold sunset follows you through the cypress groves of the enchantress.', enemies: ['satyr','lamia','harpy','empusa'], elites: ['empusa','fury','gorgon'], boss: 'aeaea_circe' },
    { id: 'colchis', name: 'COLCHIS, THE GOLDEN SHORE', sub: 'Where the Fleece Outshines the Moon', music: 2, accent: '#6da79d', sky: ['#0d1e2b','#1e3942'], floor: '#142228', floor2: '#203137', wall: '#35545a', fog: 'rgba(46,110,119,0.22)', desc: 'At the world’s eastern edge, a dragon guards the prize that brought Jason across the sea.', enemies: ['hound','centaur','cyclops','harpy'], elites: ['centaur','cyclops_elder','telkhine'], boss: 'colchis_dragon' },
    { id: 'typhon_core', name: 'TYPHON’S CORE', sub: 'The Mountain’s Last Heartbeat', music: 4, accent: '#d05c3d', sky: ['#210d0d','#4c1b12'], floor: '#21100e', floor2: '#321611', wall: '#5a2a1b', fog: 'rgba(189,63,34,0.28)', desc: 'Beyond the divine chains, the storm giant’s heart burns beneath the roots of Olympus.', enemies: ['typhon_spawn','hecaton','gigas','telkhine'], elites: ['typhon_spawn','hecaton','gigas'], boss: 'typhon_core' }
  ];
  const order = ['tartarus','styx','acheron','asphodel','punishment','lethe_garden','elysium','mourning','forge','labyrinth','knossos','aegean','aeaea','colchis','gigantomachy','delphi','pelion','arcadia','thebes','marathon','mycenae','olympus_approach','olympus','typhon_core'];
  const additions = Object.create(null);
  newRegions.forEach(region => { additions[region.id] = region; });
  D.REGIONS = order.map(id => { const r = additions[id] || originalRegions[id]; if (!r) throw new Error('Unknown region in campaign order: ' + id); return r; });
  const catalogEnemyIds = Object.keys(D.ENEMIES).filter(id => D.ENEMIES[id].catalogCreature);
  catalogEnemyIds.forEach((id, i) => {
    const region = D.REGIONS[i % D.REGIONS.length];
    const def = D.ENEMIES[id];
    def.regionHome = region.id;
    def.desc = def.name + ' haunts ' + region.name + ', where it once guarded a sacred road. As a ' + def.ai + ' threat, it punishes careless approach and leaves a painted likeness in the bestiary.';
    def.bestiaryLore = 'The shades call it ' + def.name.toLowerCase() + '. In life it was bound to ' + region.name + '; death has kept the shape and sharpened the grievance.';
    region.enemies.push(id);
    if (i % 5 === 0) region.elites.push(id);
  });
  D.REGIONS.forEach(region => {
    region.chamberCount = 8;
    region.enemyFamilies = region.enemies.slice();
    region.eliteFamilies = region.elites.slice();
    region.enemies = region.enemyFamilies.reduce((all, id) => all.concat(enemyFamilies[id] || [id]), []);
    region.elites = region.eliteFamilies.reduce((all, id) => all.concat(enemyFamilies[id] || [id]), []);
    region.enemies = region.enemies.filter(id => D.ENEMIES[id]);
    region.elites = region.elites.filter(id => D.ENEMIES[id]);
  });

  const hpCurve = [1,1.55,2.3,3.2,3.65,4.1,4.65,5.2,5.8,6.4,7.1,8,8.7,9.5,10.3,10.7,11.1,11.5,11.9,12.3,12.7,13.1,13.5,13.9];
  const dmgCurve = [1,1.35,1.75,2.2,2.35,2.55,2.75,2.95,3.2,3.45,3.7,4,4.2,4.4,4.65,4.8,4.95,5.1,5.25,5.4,5.55,5.7,5.85,6];
  const spdCurve = [1,1.04,1.06,1.09,1.1,1.11,1.12,1.13,1.14,1.15,1.16,1.18,1.19,1.20,1.21,1.22,1.23,1.24,1.25,1.26,1.27,1.28,1.29,1.30];
  D.TIER_SCALE = hpCurve.map((hp, i) => ({ hp, dmg: dmgCurve[i], spd: spdCurve[i], obols: 1 + i * 0.32 }));

  const conditionNames = [
    ['ash_wind','Ash Wind','Ash chokes the chamber. Enemies hit harder, and pay more.',1,1.14,0.96,24,0],
    ['thin_air','Thin Air','The altitude makes every foe quick.',0.94,0.98,1.12,12,0],
    ['old_chains','Old Chains','The chained dead are slower, but difficult to break.',1.28,0.92,0.88,20,0],
    ['red_omen','Red Omen','A bad sign drives the host to greater fury.',1.02,1.18,1.02,28,0],
    ['flooded_stone','Flooded Stone','Wet ground carries force through every strike.',1,1.08,1.04,22,0],
    ['pale_moon','Pale Moon','The moonlight makes ambushes hard to read.',1.08,1.04,1.08,24,0],
    ['last_breath','Last Breath','Foes arrive weakened; the room yields little.',0.86,0.92,0.98,6,0],
    ['bronze_heat','Bronze Heat','The heat hardens armor and speeds the desperate.',1.16,1.04,1.08,26,0],
    ['titan_echo','Titan Echo','A distant war cry swells the enemy ranks.',1.02,1.02,1.02,20,6],
    ['offering_scent','Offering Scent','The room is richer, and its guardians are stronger.',1.1,1.08,1,38,0],
    ['narrow_pass','Narrow Passage','Heavy foes slow here; swift foes still hunt.',1.04,1.02,0.94,18,0],
    ['fate_turn','Fate’s Turn','Fate strengthens the host but improves its reward.',1.2,1.12,1,42,0],
    ['cold_ash','Cold Ash','The chill slows movement and steadies enemy aim.',1.04,1.04,0.92,18,0],
    ['black_tide','Black Tide','The river restores its creatures between blows.',1.22,0.98,1.02,28,0],
    ['laurel_fall','Fallen Laurel','A quiet chamber; the remaining foes are champions.',0.96,1.16,0.98,30,0],
    ['shattered_oath','Shattered Oath','Enemies fight harder beneath broken vows.',1.1,1.16,1.04,34,0],
    ['storm_glass','Storm Glass','Lightning quickens attacks and rewards the bold.',1.04,1.12,1.1,32,0],
    ['grave_silence','Grave Silence','The dead move quietly, but arrive in greater number.',0.98,1.04,1.02,22,6],
    ['sunless_hour','Sunless Hour','Darkness strengthens the largest creatures.',1.24,1.1,0.96,24,0],
    ['open_gate','Open Gate','The gate leaks obols and draws a larger guard.',1.06,1.04,1,46,6],
    ['broken_maze','Broken Maze','The maze disorients foes and makes them erratic.',0.92,1.06,1.14,20,0],
    ['white_flame','White Flame','Pale fire makes the whole host more dangerous.',1.08,1.2,1.02,36,0],
    ['deep_water','Deep Water','The crossing slows heavy foes and lifts the reward.',0.98,1.02,0.9,42,0],
    ['fate_debt','Fate’s Debt','A costly omen: the host is tougher, the reward greater.',1.3,1.18,1.02,52,0]
  ].map(c => ({ id:c[0],name:c[1],desc:c[2],hpMul:c[3],dmgMul:c[4],spdMul:c[5],obols:c[6],countAdd:c[7] }));
  D.CHAMBER_CONDITIONS = conditionNames;

  const eventNames = [
    ['charons_toll','Charon’s Toll','A coin turns over on its own. The ferryman waits for your answer.'],
    ['orpheus_bargain','Orpheus’ Bargain','A song slips between two notes and offers a choice.'],
    ['broken_altar','The Broken Altar','A cracked altar still holds one spark of power.'],
    ['fates_loom','The Fates’ Loom','A loose thread curls around your wrist.'],
    ['nights_quiet','Night’s Quiet','The darkness offers shelter, then names its price.'],
    ['hecates_sign','Hecate’s Sign','Three torches burn with different colors.'],
    ['heros_grave','A Hero’s Grave','The name is worn away. The armor is not.'],
    ['forgotten_offering','Forgotten Offering','A bowl remains full after the mourners left.'],
    ['empty_cup','The Empty Cup','Something drinks from the cup before you arrive.'],
    ['fallen_standard','The Fallen Standard','A battlefield banner lies where no army marches.'],
    ['silent_boat','The Silent Boat','A small boat waits without a ferryman.'],
    ['watchers_eye','The Watcher’s Eye','A stone eye opens in a broken wall.'],
    ['ashen_vow','Ashen Vow','The vow is legible only while the ash is warm.'],
    ['last_laurel','The Last Laurel','One green leaf survives the long descent.'],
    ['sleeping_shade','The Sleeping Shade','A shade dreams of a life it cannot remember.'],
    ['bronze_memory','Bronze Memory','The old bronze remembers its first owner.'],
    ['open_tomb','The Open Tomb','The tomb is open, but the occupant is gone.'],
    ['lost_coin','The Lost Coin','A coin rolls uphill toward the river.'],
    ['ariadnes_thread','Ariadne’s Thread','A red thread marks two possible ways forward.'],
    ['tides_gift','The Tide’s Gift','The retreating tide leaves a gift on the stone.'],
    ['elysian_fruit','Elysian Fruit','A golden fruit hangs just beyond reach.'],
    ['unlit_torch','The Unlit Torch','The torch can light the way or summon what waits.'],
    ['broken_lyre','The Broken Lyre','One string still answers the touch.'],
    ['cypress_gate','The Cypress Gate','The gate opens for one promise only.']
  ];
  D.ROOM_EVENTS = eventNames.map((e, i) => {
    const heal = 12 + (i % 4) * 5;
    const obols = 44 + (i % 5) * 12;
    const bonusEffects = [
      { maxHp:4 }, { armor:1 }, { dmgMul:0.05 }, { moveMul:0.04 },
      { crit:0.02 }, { specialMul:0.05 }
    ];
    const bonus = bonusEffects[i % bonusEffects.length];
    return {
      id:e[0],name:e[1],desc:e[2],
      choices:[
        { id:e[0]+'_mend',title:'Take the quiet gift',desc:'Restore '+heal+' life and pass without a price.',heal },
        { id:e[0]+'_pledge',title:'Make the dangerous promise',desc:'Lose '+(10+(i%4)*3)+' life for '+obols+' obols and a lasting run effect.',damage:10+(i%4)*3,obols,fx:bonus }
      ]
    };
  });
  const divineFx = [
    { dmgMul:0.055 }, { maxHp:7 }, { crit:0.025 }, { moveMul:0.045 }, { specialMul:0.06 }, { armor:1 },
    { dmgReduce:0.03 }, { shieldOnRoom:6 }, { killHeal:2 }, { obolMul:0.06 }, { dashDmg:6 }, { castMul:0.065 }
  ];
  D.DIVINE_ENCOUNTERS = Object.keys(D.GODS).map((godId, i) => {
    const god = D.GODS[godId], effect = divineFx[i % divineFx.length], cost = 45 + (i % 5) * 10;
    const scene = {
      id:'divine_' + godId, godId, name:god.name + ' · ' + ['A Mortal Petition','The Measure of an Oath','A Gift With a Price','At the Crossroads'][i % 4],
      desc:god.title + ' appears before you. ' + god.blurb + ' What you choose will change this run’s standing with ' + god.name + '.',
      choices:[
        { id:'divine_' + godId + '_homage', title:'Pay homage', desc:'Spend ' + cost + ' obols; receive a blessing and +3 favor.', costObols:cost, favorDelta:3, heal:12, fx:effect },
        { id:'divine_' + godId + '_trial', title:'Accept the god’s trial', desc:'Endure a light wound to prove your resolve; gain +2 favor and a lasting run effect.', damage:9, favorDelta:2, fx:effect },
        { id:'divine_' + godId + '_refuse', title:'Refuse the claim', desc:'Keep your freedom and take 55 obols; lose 3 favor.', obols:55, favorDelta:-3 }
      ]
    };
    D.ROOM_EVENTS.push(scene);
    return scene;
  });

  /* Guaranteed post-capstone scenes turn the gods and mythic cast into active
     campaign characters. Each scene advances the shared story of the fraying
     seal around Typhon; player choices steer the ending and grant run rewards. */
  D.CAMPAIGN_STORY = [
    {
      id:'sealed-house', title:'THE HOUSE THAT HELD ITS BREATH', intro:'The first seal breaks beneath Tartarus. A black thread runs from the gate to the House of Hades.',
      voices:[
        { name:'Hades', title:'Lord of the Dead', godId:'hades', icon:'god:hades', text:'I barred the ascent because the old prison is failing. Typhon stirs beneath the mountain. If he reaches the sky, every oath between the gods breaks with him.' },
        { name:'Thanatos', title:'Quiet End of Life', icon:'enemy:shade', text:'The shades are being pulled upward. Death is losing its claim on the dead.' }
      ],
      choices:[
        { id:'house_hear', title:'Hear Hades’ whole confession', desc:'Trust the keeper of the seal. Recover 22 life.', reply:'“No more half-truths between us.”', affinity:'hades', side:'concord', heal:22 },
        { id:'house_judge', title:'Make Hades answer for the chain', desc:'Demand a debt of 72 obols.', reply:'“A prison is still a prison, even when it protects the world.”', affinity:'hades', side:'defiance', obols:72 }
      ]
    },
    {
      id:'river-witness', title:'THE FERRYMAN’S TESTIMONY', intro:'On the far bank, the river carries a name upstream: the first mortal who ever escaped a god’s sentence.',
      voices:[
        { name:'Charon', title:'Ferryman of the Styx', icon:'enemy:styxling', text:'I have ferried every oath in this river. One has begun to run backward. It leads to the thing chained before the Titans had names.' },
        { name:'Hermes', title:'Guide of Souls', godId:'hermes', icon:'god:hermes', text:'The current is carrying warnings faster than I can deliver them. Take this speed; the message must reach Olympus.' }
      ],
      choices:[
        { id:'river_coin', title:'Pay the ferryman’s true fare', desc:'Honor the crossing and regain 18 life.', reply:'“A name is worth more than a coin.”', affinity:'hermes', side:'concord', heal:18 },
        { id:'river_run', title:'Race Hermes to the next shore', desc:'Win 84 obols from the messenger’s wager.', reply:'“Keep up, then.”', affinity:'hermes', side:'defiance', obols:84 }
      ]
    },
    {
      id:'winter-seed', title:'THE SEED BENEATH THE ASH', intro:'A green shoot grows through the ash. Its roots reach both the Underworld and the fields above.',
      voices:[
        { name:'Demeter', title:'Bringer of Harvest', godId:'demeter', icon:'god:demeter', text:'My daughter’s pomegranate seed is caught in the broken seal. I would freeze the world before I let it be taken from her again.' },
        { name:'Persephone', title:'Queen Below and Above', icon:'enemy:empusa', text:'Mother, the living need a spring as much as the dead need a door. Let this mortal carry the seed without owning it.' }
      ],
      choices:[
        { id:'seed_share', title:'Promise the seed will return to both worlds', desc:'The queens’ pact mends you for 24 life.', reply:'“No season should belong to only one house.”', affinity:'demeter', side:'concord', heal:24 },
        { id:'seed_guard', title:'Ask Persephone to hide it from every throne', desc:'Take 96 obols for the dangerous secret.', reply:'“A secret can outlive a kingdom.”', affinity:'hades', side:'defiance', obols:96 }
      ]
    },
    {
      id:'red-judgment', title:'THE WAR THAT FEEDS ITSELF', intro:'The chains in the Fields of Punishment ring like weapons. Each cruel sentence makes the distant prisoner stronger.',
      voices:[
        { name:'Ares', title:'Sacker of Cities', godId:'ares', icon:'god:ares', text:'A war with no victor is only a feast for the thing behind the wall. I know what it means to be used as a weapon.' },
        { name:'Megaera', title:'First of the Erinyes', icon:'enemy:fury', text:'The sentence was written before the crime. Break the cycle, or admit you came here to punish.' }
      ],
      choices:[
        { id:'judgment_release', title:'End one sentence without a fight', desc:'Lay down the blade and restore 20 life.', reply:'“Justice that cannot change is only another chain.”', affinity:'ares', side:'concord', heal:20 },
        { id:'judgment_debt', title:'Keep the sentence, change the judge', desc:'Claim 110 obols from the old armory.', reply:'“Then the next blow will be mine to choose.”', affinity:'ares', side:'defiance', obols:110 }
      ]
    },
    {
      id:'laurel-witness', title:'THE LAUREL AND THE ARROW', intro:'A laurel wreath is split down the middle. Two arrows pin opposite halves to the gate.',
      voices:[
        { name:'Artemis', title:'Mistress of the Hunt', godId:'artemis', icon:'god:artemis', text:'My brother’s light is trapped on the other side. I can find the trail, but I will not ask you to follow it blind.' },
        { name:'Apollo', title:'Far-Shooter, Keeper of Song', icon:'enemy:shade', text:'The prophecy was not that the mortal would defeat Typhon. It was that the gods would finally stand in one place long enough to try.' },
        { name:'Achilles', title:'Champion of Elysium', icon:'boss:achilles', text:'A hero is not the one who cannot fall. It is the one who chooses what the fall protects.' }
      ],
      choices:[
        { id:'laurel_shelter', title:'Shield the wounded heroes first', desc:'Artemis guides you back to 26 life.', reply:'“No prophecy is worth a friend abandoned.”', affinity:'artemis', side:'concord', heal:26 },
        { id:'laurel_truth', title:'Ask Apollo to name the cost', desc:'Take 120 obols from the abandoned shrine.', reply:'“Tell me the price before I pay it.”', affinity:'artemis', side:'defiance', obols:120 }
      ]
    },
    {
      id:'backward-song', title:'THE SONG THAT TURNS AROUND', intro:'Orpheus sets down his lyre. Eurydice stands beside him, no longer behind a locked door.',
      voices:[
        { name:'Orpheus', title:'Singer of the House', icon:'boss:mourning_orpheus', text:'I sang to make death listen. I never thought to ask what the dead wanted to say.' },
        { name:'Eurydice', title:'The Voice Beyond the Veil', icon:'enemy:shade', text:'The seal is not a wall. It is a promise everyone stopped remembering. Sing the names of those who made it.' }
      ],
      choices:[
        { id:'song_remember', title:'Sing the names with them', desc:'The duet restores 28 life.', reply:'“Then no one will be left out of the song.”', affinity:'aphrodite', side:'concord', heal:28 },
        { id:'song_break', title:'Break the lyre and keep moving', desc:'Take 132 obols from the quiet audience.', reply:'“Some doors open only when the music ends.”', affinity:'ares', side:'defiance', obols:132 }
      ]
    },
    {
      id:'forge-vow', title:'A PROMETHEAN SPARK', intro:'The forge burns without fuel. A stolen flame beats in time with the heart of the mountain.',
      voices:[
        { name:'Hephaestus', title:'The Smith of Olympus', godId:'hephaestus', icon:'god:hephaestus', text:'I built the first links around Typhon. The gods called them safeguards. Prometheus called them a warning.' },
        { name:'Prometheus', title:'Bearer of the Stolen Fire', icon:'enemy:automaton', text:'A chain can hold a monster. It can also teach the monster exactly where to pull.' }
      ],
      choices:[
        { id:'forge_repair', title:'Reforge the weak link together', desc:'The shared labor restores 30 life.', reply:'“Make it strong enough to open when the danger passes.”', affinity:'hephaestus', side:'concord', heal:30 },
        { id:'forge_key', title:'Keep the fire as a key', desc:'Claim 146 obols from the sealed coffer.', reply:'“No lock should have only one keeper.”', affinity:'hephaestus', side:'defiance', obols:146 }
      ]
    },
    {
      id:'thread-of-ariadne', title:'THE THREAD IS A CHOICE', intro:'Ariadne’s red thread crosses the maze without touching its walls. Daedalus recognizes the pattern as his own handwriting.',
      voices:[
        { name:'Athena', title:'Bright-Eyed Strategist', godId:'athena', icon:'god:athena', text:'A plan that leaves no room for another person is only a prettier trap.' },
        { name:'Ariadne', title:'Keeper of the Returning Thread', icon:'enemy:shade', text:'I gave a hero the way out once. This time I want to choose where the way leads.' },
        { name:'Daedalus', title:'Maker of the Labyrinth', icon:'enemy:automaton', text:'The final corridor was built from the inside. There is a door in the design if someone is willing to name it.' }
      ],
      choices:[
        { id:'maze_open', title:'Let Ariadne redraw the way home', desc:'Ariadne’s route returns 32 life.', reply:'“Show us an exit that does not become another prison.”', affinity:'athena', side:'concord', heal:32 },
        { id:'maze_map', title:'Take Daedalus’ original blueprint', desc:'Sell the false map for 158 obols.', reply:'“I will decide what the map is for.”', affinity:'athena', side:'defiance', obols:158 }
      ]
    },
    {
      id:'sea-of-names', title:'THE SEA RETURNS EVERY NAME', intro:'The tide lays an old bronze trident at your feet. Scylla’s song comes from the landward shore.',
      voices:[
        { name:'Poseidon', title:'Earth-Shaker', godId:'poseidon', icon:'god:poseidon', text:'My storm has been striking the prison from above. I thought force would make it yield. I only taught Typhon the rhythm.' },
        { name:'Scylla', title:'Voice Beneath the Reef', icon:'boss:scylla', text:'The sea remembers every sailor I took. I will not ask forgiveness. I will give you the names, so the living can grieve them.' }
      ],
      choices:[
        { id:'sea_names', title:'Carry the names to the shore', desc:'The tide gives back 34 life.', reply:'“The dead deserve more than to be counted.”', affinity:'poseidon', side:'concord', heal:34 },
        { id:'sea_trident', title:'Take the trident and the storm', desc:'Take 172 obols from the drowned treasury.', reply:'“Let the next wave be one I choose.”', affinity:'poseidon', side:'defiance', obols:172 }
      ]
    },
    {
      id:'wine-and-foam', title:'THE LAST PRIVATE BARGAIN', intro:'Two cups wait at the edge of the war. One holds wine; the other, sea-foam and a name you almost remember.',
      voices:[
        { name:'Dionysus', title:'Twice-Born', godId:'dionysus', icon:'god:dionysus', text:'Everyone wants to win the war. Nobody asks whether they can live with what winning turns them into.' },
        { name:'Aphrodite', title:'Foam-Born', godId:'aphrodite', icon:'god:aphrodite', text:'Love is not the prize after the war. It is the reason you decide what must survive it.' },
        { name:'Hecate', title:'Torch-Bearer at the Crossroads', icon:'enemy:empusa', text:'Chaos can open any road. It cannot choose which one you will be proud to have walked.' }
      ],
      choices:[
        { id:'cup_share', title:'Share the wine and speak plainly', desc:'The company mends 36 life.', reply:'“Tell me what you fear losing.”', affinity:'dionysus', side:'concord', heal:36 },
        { id:'cup_refuse', title:'Refuse every bargain but your own', desc:'Take 188 obols and keep your name.', reply:'“My life is not a coin to be spent by the gods.”', affinity:'chaos', side:'defiance', obols:188 }
      ]
    },
    {
      id:'council-of-olympus', title:'THE COUNCIL THAT NEVER MET', intro:'For the first time since the Titan War, every throne answers the same summons. Their voices arrive through the storm one by one.',
      voices:[
        { name:'Zeus', title:'King of the Olympians', godId:'zeus', icon:'god:zeus', text:'I called the chains a law. I will call them my mistake.' },
        { name:'Hera', title:'Queen of Olympus', icon:'god:athena', text:'A family cannot be kept safe by deciding that its members must never speak.' },
        { name:'Poseidon', title:'Earth-Shaker', godId:'poseidon', icon:'god:poseidon', text:'The sea will hold the eastern flank.' },
        { name:'Demeter', title:'Bringer of Harvest', godId:'demeter', icon:'god:demeter', text:'I will make the ground grow again, whichever side of the gate it falls on.' },
        { name:'Athena', title:'Bright-Eyed Strategist', godId:'athena', icon:'god:athena', text:'I have a plan that requires us to trust one another. I dislike that it is the best plan.' },
        { name:'Ares', title:'Sacker of Cities', godId:'ares', icon:'god:ares', text:'This time I choose what my strength protects.' },
        { name:'Aphrodite', title:'Foam-Born', godId:'aphrodite', icon:'god:aphrodite', text:'Even an enemy can be part of the family story.' },
        { name:'Artemis', title:'Mistress of the Hunt', godId:'artemis', icon:'god:artemis', text:'My arrows will find the openings, not the backs of our own.' },
        { name:'Dionysus', title:'Twice-Born', godId:'dionysus', icon:'god:dionysus', text:'I brought enough wine for after. That is an act of faith.' },
        { name:'Hephaestus', title:'The Smith of Olympus', godId:'hephaestus', icon:'god:hephaestus', text:'I will unmake the lock I forged.' },
        { name:'Hermes', title:'Guide of Souls', godId:'hermes', icon:'god:hermes', text:'Every message is delivered. Nobody gets to claim they never knew.' },
        { name:'Apollo', title:'Far-Shooter, Keeper of Song', icon:'enemy:shade', text:'The prophecy has room for a choice. I made sure of it.' },
        { name:'Hades', title:'The Unseen', godId:'hades', icon:'god:hades', text:'The House will stand open. I will face what comes through it.' },
        { name:'Heracles', title:'The Strongest Mortal', icon:'enemy:hoplite', text:'At last, a labor that asks more than strength.' }
      ],
      choices:[
        { id:'council_together', title:'Bind the gods by a promise they all choose', desc:'Their agreement restores 40 life.', reply:'“Stand with me because you choose to, not because I command it.”', affinity:'zeus', side:'concord', heal:40 },
        { id:'council_witness', title:'Make every throne witness your terms', desc:'Claim 220 obols from the royal treasury.', reply:'“The mortal who pays the price gets a voice.”', affinity:'athena', side:'defiance', obols:220 }
      ]
    },
    {
      id:'thread-unbound', title:'THE THREAD WITHOUT A KEEPER', intro:'Typhon is fallen. The Moirai arrive with the last thread in their hands. Nyx asks whether the world needs another chain.',
      voices:[
        { name:'Clotho', title:'She Who Spins', godId:'chaos', icon:'god:chaos', text:'We spun the thread to keep the prison closed. We did not ask what the living would choose.' },
        { name:'Lachesis', title:'She Who Measures', icon:'god:chaos', text:'The measure is complete. The next length belongs to you.' },
        { name:'Atropos', title:'She Who Cuts', icon:'god:chaos', text:'A thread can end. An oath can change. Those are not the same thing.' },
        { name:'Nyx', title:'Night Before the First Dawn', icon:'god:chaos', text:'There will be no prophecy to hide behind now. Tell us what kind of world should wake.' },
        { name:'Persephone', title:'Queen Below and Above', icon:'enemy:empusa', text:'The door can open both ways. Let the living visit the dead without belonging to them.' },
        { name:'Hades', title:'The Unseen', godId:'hades', icon:'god:hades', text:'I will keep the House. I will not keep you.' }
      ],
      choices:[
        { id:'ending_open', title:'Leave the gate open by mutual oath', desc:'The dead and living may meet without a master.', reply:'The gods and shades make a new covenant; the House remains, but no one is its prisoner.', affinity:'hades', side:'concord', ending:'open_gate' },
        { id:'ending_cut', title:'Cut the thread and let every age choose', desc:'No fate, god, or king will own the road.', reply:'The old order ends. The world must meet its future without a divine lock.', affinity:'chaos', side:'defiance', ending:'free_thread' }
      ]
    }
  ];


  const storyById = Object.create(null);
  D.CAMPAIGN_STORY.forEach(chapter => { storyById[chapter.id] = chapter; });
  const addedStories = {
    acheron: {
      id:'acheron-name', title:'THE RIVER THAT KNOWS YOUR NAME', intro:'A moonlit current runs between the Styx and the deepest silence. Charon has stopped rowing.',
      voices:[
        { name:'Charon', title:'Ferryman of the Dead', icon:'enemy:styxling', text:'This is Acheron. The river does not ask what you did. It asks who will remember you when you are gone.' },
        { name:'Hecate', title:'Keeper of Crossroads', icon:'god:chaos', text:'The current carries one name against its flow. A soul has refused the judgment written for it.' },
        { name:'Minos', title:'Judge of the Dead', icon:'enemy:hoplite', text:'Then hear the testimony before the sentence. I have learned what certainty costs.' }
      ],
      choices:[
        { id:'acheron_witness', title:'Let the soul speak before judgment', desc:'The testimony returns 38 life.', reply:'“A fair hearing is not the same as forgiveness.”', affinity:'athena', side:'concord', heal:38 },
        { id:'acheron_fare', title:'Take Charon’s coin and keep moving', desc:'Gain 240 obols from the river passage.', reply:'“Some crossings are paid for in time.”', affinity:'hermes', side:'defiance', obols:240 }
      ]
    },
    lethe: {
      id:'lethe-memory', title:'THE GARDEN THAT FORGOT SPRING', intro:'The river Lethe has flooded an orchard. A woman waits beside the oldest tree, holding a name she cannot speak.',
      voices:[
        { name:'Mnemosyne', title:'Mother of the Muses', icon:'boss:mourning_orpheus', text:'Memory is not a chain. But without it, the dead cannot choose what they wish to lay down.' },
        { name:'Persephone', title:'Queen Below and Above', icon:'enemy:empusa', text:'My mother taught the seasons to return. Let the river forget the grief, not the promise that spring will come again.' },
        { name:'Demeter', title:'Bringer of Harvest', godId:'demeter', icon:'god:demeter', text:'I can make the garden bloom, but I will not decide which memories its keeper must carry.' }
      ],
      choices:[
        { id:'lethe_keep', title:'Keep one bright memory for each shade', desc:'The orchard’s bloom restores 40 life.', reply:'“Let comfort survive, even when sorrow changes.”', affinity:'demeter', side:'concord', heal:40 },
        { id:'lethe_release', title:'Let each soul choose what to forget', desc:'Take 260 obols from the offering grove.', reply:'“No one else may choose what my past means.”', affinity:'chaos', side:'defiance', obols:260 }
      ]
    },
    knossos: {
      id:'knossos-double-axe', title:'THE PALACE AND THE BULL', intro:'A red column cracks open. Beyond it, Theseus and Ariadne stand before a doorway that was never drawn on Daedalus’ plans.',
      voices:[
        { name:'Ariadne', title:'Keeper of the Returning Thread', icon:'enemy:shade', text:'The maze was built to make every choice feel like a mistake. My thread can lead somewhere the king never intended.' },
        { name:'Daedalus', title:'Maker of the Labyrinth', icon:'enemy:automaton', text:'I made the walls obey Minos. I should have made an exit obey the people trapped inside them.' },
        { name:'Theseus', title:'Hero of Athens', icon:'boss:knossos_crown', text:'I killed the beast once. This time I will ask it what the palace made of it.' }
      ],
      choices:[
        { id:'knossos_thread', title:'Let Ariadne open a road for everyone', desc:'The thread mends 42 life.', reply:'“An exit is only just when it can be shared.”', affinity:'athena', side:'concord', heal:42 },
        { id:'knossos_crown', title:'Take the double axe as your claim', desc:'Claim 280 obols from the royal treasury.', reply:'“A symbol can become a warning in new hands.”', affinity:'ares', side:'defiance', obols:280 }
      ]
    },
    aeaea: {
      id:'aeaea-circe', title:'THE ISLAND THAT CHANGES YOU', intro:'The sea falls silent around Aeaea. A bronze cup rests beside a trail of hoofprints that ends at the surf.',
      voices:[
        { name:'Circe', title:'Sorceress of Aeaea', icon:'boss:aeaea_circe', text:'I changed men who arrived here believing the world owed them a different shape. I was not always right to do so.' },
        { name:'Odysseus', title:'King of Ithaca', icon:'enemy:hoplite', text:'Hermes gave me a way to resist her spell. I still had to decide whether I wanted to use it.' },
        { name:'Hermes', title:'Guide of Souls', godId:'hermes', icon:'god:hermes', text:'A charm can protect you from a choice. It cannot make that choice for you.' }
      ],
      choices:[
        { id:'aeaea_cup', title:'Share the cup and speak without enchantment', desc:'The honest bargain restores 44 life.', reply:'“Let a changed life still belong to the one who lives it.”', affinity:'hermes', side:'concord', heal:44 },
        { id:'aeaea_herb', title:'Take the moly and leave the spell behind', desc:'Gain 300 obols from Circe’s stores.', reply:'“Knowing the danger is its own kind of power.”', affinity:'athena', side:'defiance', obols:300 }
      ]
    },
    colchis: {
      id:'colchis-fleece', title:'THE FLEECE AND THE FLAME', intro:'At Colchis, a dragon coils beneath a golden oak. Medea’s ship waits offshore with every sail tied down.',
      voices:[
        { name:'Medea', title:'Princess of Colchis', icon:'god:aphrodite', text:'They came for the fleece and called the theft a quest. Ask me what the story leaves out before you choose who deserves it.' },
        { name:'Jason', title:'Captain of the Argo', icon:'enemy:hoplite', text:'I wanted the throne my uncle stole. Wanting it did not make every cost righteous.' },
        { name:'Athena', title:'Bright-Eyed Strategist', godId:'athena', icon:'god:athena', text:'A prize can end a war. It can also give the victor a reason to begin another.' }
      ],
      choices:[
        { id:'colchis_return', title:'Return the fleece to the people who guard it', desc:'Medea’s counsel restores 46 life.', reply:'“A hero’s claim is not stronger than a people’s home.”', affinity:'athena', side:'concord', heal:46 },
        { id:'colchis_claim', title:'Take the fleece and accept its burden', desc:'Gain 320 obols from the Argo’s stores.', reply:'“Then the story will remember who paid for it.”', affinity:'ares', side:'defiance', obols:320 }
      ]
    },
    delphi: {
      id:'delphi-python', title:'THE VOICE BENEATH PARNASSUS', intro:'The oracle chamber opens to daylight. Apollo waits beside the Pythia, who has chosen what the prophecy will mean.',
      voices:[
        { name:'Apollo', title:'Far-Shooter, Keeper of Song', icon:'enemy:hoplite', text:'I slew the old serpent and built a sanctuary above its fissure. I called that a beginning. The Pythia has taught me how much was left unsaid.' },
        { name:'Pythia', title:'Voice at the Center of the World', icon:'enemy:empusa', text:'A prophecy is not a command. I can speak in my own name now, and I choose to tell the truth about the chains beneath this mountain.' },
        { name:'Pytho', title:'The Ancient Oracle Serpent', icon:'boss:delphi_python', text:'The earth remembers every voice buried beneath its shrine. Ask the living what they will do with an answer.' }
      ],
      choices:[
        { id:'delphi-listen', title:'Let the Pythia choose what is spoken', desc:'Her clear voice restores 44 life.', reply:'“No god gets to own the future she describes.”', affinity:'athena', side:'concord', heal:44 },
        { id:'delphi-token', title:'Carry one sealed prophecy onward', desc:'Take 300 obols from the sanctuary treasury.', reply:'“An answer has weight. I will decide when to open it.”', affinity:'athena', side:'defiance', obols:300 }
      ]
    },
    pelion: {
      id:'pelion-ambush', title:'THE HEALER’S LAST LESSON', intro:'In Chiron’s cave, a poisoned arrow lies beside a clean bandage. Heracles recognizes the mark cut into its bronze head.',
      voices:[
        { name:'Chiron', title:'Teacher of Heroes', icon:'enemy:centaur', text:'A student may leave the lesson and still carry it. Nessus chose to carry only the wound.' },
        { name:'Heracles', title:'The Strongest Mortal', icon:'enemy:hoplite', text:'I knew his name long before the arrow. I will not mistake strength for an answer this time.' },
        { name:'Nessus', title:'The Centaur Ambusher', icon:'boss:pelion_nessus', text:'The mountain taught you to mend what you could. Ask what should be mended before you reach for the thread.' }
      ],
      choices:[
        { id:'pelion-rest', title:'Rest beside Chiron’s spring', desc:'The healer restores 46 life.', reply:'“A pause can be part of the road.”', affinity:'demeter', side:'concord', heal:46 },
        { id:'pelion-map', title:'Take the centaur’s trail map', desc:'Gain 320 obols from the hidden cache.', reply:'“I will choose which old paths deserve to remain.”', affinity:'hermes', side:'defiance', obols:320 }
      ]
    },
    arcadia: {
      id:'arcadia-hunt', title:'THE HUNT WITHOUT A PRIZE', intro:'At the stream, the boar’s hoofprints turn into a circle. Artemis lowers her bow; Pan stops playing.',
      voices:[
        { name:'Artemis', title:'Mistress of the Hunt', godId:'artemis', icon:'god:artemis', text:'The hunt can keep a wilderness alive, or it can make every living thing a target. We decide which it is.' },
        { name:'Pan', title:'Keeper of Wild Places', icon:'enemy:satyr', text:'The boar ran until the forest could not hear itself. Leave a little quiet for what grows back.' },
        { name:'Atalanta', title:'The Swiftest Hunter', icon:'enemy:hoplite', text:'I ran for my own name, not for a trophy. Let the next runner make a different choice.' }
      ],
      choices:[
        { id:'arcadia-spring', title:'Leave a spring for the next hunt', desc:'The forest restores 48 life.', reply:'“Let the wild keep more than our footprints.”', affinity:'artemis', side:'concord', heal:48 },
        { id:'arcadia-charm', title:'Carry Pan’s bronze reed', desc:'Gain 340 obols from the hunters’ cache.', reply:'“A song can mark a path without owning it.”', affinity:'dionysus', side:'defiance', obols:340 }
      ]
    },
    thebes: {
      id:'thebes-riddle', title:'A CITY AFTER THE ANSWER', intro:'The seven gates open together. Oedipus stands outside them, and Antigone holds the key to the smallest door.',
      voices:[
        { name:'Sphinx', title:'Keeper of the Unanswered', icon:'boss:thebes_sphinx', text:'They solved my riddle and called the silence victory. Tell me what a city owes the one who asks.' },
        { name:'Oedipus', title:'The Answered King', icon:'enemy:hoplite', text:'An answer can reveal the road and still leave you unready to walk it.' },
        { name:'Antigone', title:'Daughter of Thebes', icon:'enemy:shade', text:'The dead deserve burial. The living deserve the truth. Neither duty gives a king the right to silence the other.' }
      ],
      choices:[
        { id:'thebes-witness', title:'Let Antigone speak for the unburied', desc:'Her testimony restores 50 life.', reply:'“A city begins again when it can hear its own grief.”', affinity:'hades', side:'concord', heal:50 },
        { id:'thebes-key', title:'Take the key to the hidden gate', desc:'Gain 360 obols from the royal vault.', reply:'“An answer should open a door, not close a mouth.”', affinity:'athena', side:'defiance', obols:360 }
      ]
    },
    marathon: {
      id:'marathon-return', title:'THE BELL AFTER THE CHARGE', intro:'The dust settles across Marathon. Theseus returns the bull’s bronze bell to Athena, who places it on the ground.',
      voices:[
        { name:'Theseus', title:'Hero of Athens', icon:'enemy:hoplite', text:'I followed the bull until the city was safe. I never asked what had driven it from its home.' },
        { name:'Athena', title:'Bright-Eyed Strategist', godId:'athena', icon:'god:athena', text:'A victory is not wise because it is won. Keep the warning; do not keep the fear.' },
        { name:'Heracles', title:'The Strongest Mortal', icon:'enemy:hoplite', text:'A labor ends when the people are safe. The story afterward is another kind of work.' }
      ],
      choices:[
        { id:'marathon-release', title:'Return the bell to the open plain', desc:'The sea wind restores 52 life.', reply:'“Let the next warning call people home.”', affinity:'poseidon', side:'concord', heal:52 },
        { id:'marathon-bell', title:'Carry the bell as a warning', desc:'Gain 380 obols from the Athenian stores.', reply:'“Memory can protect without becoming a chain.”', affinity:'athena', side:'defiance', obols:380 }
      ]
    },
    mycenae: {
      id:'mycenae-blood-oath', title:'THE HOUSE THAT NAMES ITS DEAD', intro:'Beneath the Lion Gate, Electra and Orestes lay down their weapons. Tisiphone waits among the tombs.',
      voices:[
        { name:'Electra', title:'Daughter of Agamemnon', icon:'enemy:hoplite', text:'I kept my father’s name alive by keeping the wound open. I want to know what remains when I stop.' },
        { name:'Orestes', title:'The Pursued Son', icon:'enemy:shade', text:'I did the deed and carried it. Let the dead hear both parts before the living decide what justice means.' },
        { name:'Tisiphone', title:'Avenger of the Atreid Blood', icon:'boss:mycenae_tisiphone', text:'I was sent to punish. I can also witness. Give this house a truth more useful than another oath of vengeance.' }
      ],
      choices:[
        { id:'mycenae-testimony', title:'Hear the house’s testimony together', desc:'The truth restores 54 life.', reply:'“Justice must remember every voice, not only the last blow.”', affinity:'hades', side:'concord', heal:54 },
        { id:'mycenae-blade', title:'Take the bronze blade from the tomb', desc:'Gain 400 obols from the royal vault.', reply:'“I will carry its history without repeating it.”', affinity:'ares', side:'defiance', obols:400 }
      ]
    },
    olympus: {
      id:'olympus-last-ascent', title:'THE THRONES CHOOSE TO STAND', intro:'The gods descend from their seats. For the first time, Olympus faces the underworld as a family rather than a court.',
      voices:[
        { name:'Zeus', title:'King of the Olympians', godId:'zeus', icon:'god:zeus', text:'No decree can hold the storm below us now. I will stand beside you, not above you.' },
        { name:'Hera', title:'Queen of Olympus', icon:'god:athena', text:'A family begins with the truth it can bear to hear. Let this one face the truth together.' },
        { name:'Heracles', title:'The Strongest Mortal', icon:'enemy:hoplite', text:'I have finished twelve labors. This last one asks every god to do their share.' },
        { name:'Hades', title:'Keeper of the House', godId:'hades', icon:'god:hades', text:'The way to Typhon’s heart is open. We will not send another mortal through it alone.' }
      ],
      choices:[
        { id:'olympus_stand', title:'Ask the gods to fight as equals', desc:'Their shared oath restores 48 life.', reply:'“Stand with me. No throne gets to command the rest.”', affinity:'zeus', side:'concord', heal:48 },
        { id:'olympus_terms', title:'Make Olympus answer to the mortal cost', desc:'Take 340 obols from the cloud treasury.', reply:'“Then remember who walks into the storm.”', affinity:'hades', side:'defiance', obols:340 }
      ]
    }
  };
  D.CAMPAIGN_STORY = [
    storyById['sealed-house'], storyById['river-witness'], addedStories.acheron,
    storyById['winter-seed'], storyById['red-judgment'], addedStories.lethe,
    storyById['laurel-witness'], storyById['backward-song'], storyById['forge-vow'],
    storyById['thread-of-ariadne'], addedStories.knossos, storyById['sea-of-names'],
    addedStories.aeaea, addedStories.colchis, storyById['wine-and-foam'],
    addedStories.delphi, addedStories.pelion, addedStories.arcadia, addedStories.thebes,
    addedStories.marathon, addedStories.mycenae,
        storyById['council-of-olympus'], addedStories.olympus, storyById['thread-unbound']
  ];

  D.boonById = Object.create(null);
  D.BOONS.concat(D.SPECIAL_BOONS).forEach(boon => { D.boonById[boon.id] = boon; });
  D.relicById = Object.create(null);
  D.RELICS.forEach(relic => { D.relicById[relic.id] = relic; });

  const fightable = Object.keys(D.ENEMIES).filter(id => !D.ENEMIES[id].summon).length;
  const fightableFamilies = Object.keys(D.ENEMIES).filter(id => !D.ENEMIES[id].summon && !D.ENEMIES[id].generatedVariant).length;
  D.CONTENT_COUNTS = {
    boons: D.BOONS.length + D.SPECIAL_BOONS.length,
    ordinaryBoons: D.BOONS.length,
    specialBoons: D.SPECIAL_BOONS.length,
    relics: D.RELICS.length,
    fightableEnemies: fightable,
    fightableEnemyFamilies:fightableFamilies,
    enemyVarietyMultiplier:Math.round(fightableFamilies / Math.max(1, D.BASE_CONTENT_COUNTS.fightableEnemyFamilies) * 10) / 10,
    generatedEnemyFamilies:D.CATALOG_ENEMY_FAMILIES,
    deities:Object.keys(D.GODS).length,
    olympianGods:D.OLYMPIANS.length,
    divineEncounters:D.DIVINE_ENCOUNTERS.length,
    summonOnlyAllies: Object.keys(D.ENEMIES).filter(id => D.ENEMIES[id].summon).length,
    bosses: Object.keys(D.BOSSES).length,
    regions: D.REGIONS.length,
    campaignStoryChapters: D.CAMPAIGN_STORY.length,
    campaignStoryVoices: D.CAMPAIGN_STORY.reduce((n, chapter) => n + chapter.voices.length, 0),
    chambersPerRegion: 8,
    campaignChambers: D.REGIONS.length * 8,
    routeDecisionsPerRun: D.REGIONS.length * 6,
    routePathSignatures: Math.pow(2, D.REGIONS.length * 6),
    replayVarietyMultiplier: Math.pow(2, D.REGIONS.length * 6)
  };
})();






