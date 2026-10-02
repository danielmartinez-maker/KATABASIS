/* KATABASIS — additional divine build routes.
   The original 2,820 offers retain their IDs and definitions. These 282
   new families add 5,640 offers using eighteen implemented combat triggers,
   deity-specific companions, and nineteen secondary playstyle profiles. */
(function () {
  'use strict';
  const K = window.K, D = K.DATA;
  if (K.BoonExpansion) return;
  const copy = value => JSON.parse(JSON.stringify(value));
  const baseline = {boons:D.BOONS.length + D.SPECIAL_BOONS.length, ordinaryBoons:D.BOONS.length, specialBoons:D.SPECIAL_BOONS.length};

  const archetypes = [
    {id:'critBurst', name:'Critical Constellation', slot:'attack', effect:'critBurst', amount:12, desc:'Turn direct critical hits into a nearby burst. Critical chance is included.', fx:{crit:0.08}, tip:'Favor quick direct hits and critical chance; the burst can trigger once per second.'},
    {id:'castFork', name:'Branching Cast', slot:'cast', effect:'castFork', amount:1, desc:'Fan additional Cast projectiles across several targets.', fx:{castMul:0.05}, tip:'Aim the original Cast between enemies. Extra projectiles deal 65% Cast impact and create no rifts.'},
    {id:'castNova', name:'Landing Sigil', slot:'cast', effect:'castNova', amount:14, desc:'The original Cast detonates a close area when it lands.', fx:{castCdMul:-0.04}, tip:'Place original Cast landings inside packs; echoed and forked projectiles do not create this nova.'},
    {id:'dashNova', name:'Burst Step', slot:'dash', effect:'dashNova', amount:10, desc:'Dash releases a nearby burst, favoring deliberate movement through packs.', fx:{dashDist:0.04}, tip:'Dash within 120 units of enemies to land the burst.'},
    {id:'dashStrike', name:'Pursuit Strike', slot:'dash', effect:'dashStrike', amount:0.12, desc:'Dash prepares one stronger Strike for the next three seconds.', fx:{moveMul:0.03}, tip:'Dash toward a target, then Strike before the three-second window closes.'},
    {id:'parryNova', name:'Reversal Ring', slot:'guard', effect:'parryNova', amount:14, desc:'A fresh Guard parry releases damage around you.', fx:{guardMul:0.08}, tip:'Parry the incoming hit while standing close to the pack.'},
    {id:'parryHeal', name:'Restorative Guard', slot:'guard', effect:'parryHeal', amount:3, desc:'A fresh Guard parry restores health, at most once per second.', fx:{guardCdMul:-0.05}, tip:'Time Guard for incoming hits; repeated contact in one second cannot multiply the heal.'},
    {id:'statusDetonate', name:'Affliction Crucible', slot:'attack', effect:'statusDetonate', amount:12, desc:'Direct hits detonate enemies carrying two damaging statuses. Bleed and Poison are included.', fx:{bleed:{dmg:3,dur:3},poison:{dps:3,dur:3}}, tip:'Apply the included Bleed and Poison, then land another direct hit. Each target can detonate once per second.'},
    {id:'statusSpread', name:'Contagion Wake', slot:'passive', effect:'statusSpread', amount:0.2, desc:'A fallen enemy can pass its remaining damage over time to nearby enemies. Poison is included.', fx:{poison:{dps:4,dur:3}}, tip:'Kill an afflicted enemy while its damage over time remains; infection reaches the nearest two hostiles within 220 units.'},
    {id:'bossHunter', name:'Giant Hunter', slot:'passive', effect:'bossHunter', amount:0.12, desc:'Direct hits deal more damage to bosses and minibosses.', fx:{critMul:0.08}, tip:'Reserve this route for the toughest encounters; ordinary enemies receive no hunter bonus.'},
    {id:'distanceDamage', name:'Distant Volley', slot:'attack', effect:'distanceDamage', amount:0.12, desc:'Direct hits gain damage when the target is farther than 180 units away.', fx:{projDmg:0.06}, tip:'Use Cast or ranged Strikes and keep more than 180 units of distance at impact.'},
    {id:'closeDamage', name:'Inside Reach', slot:'attack', effect:'closeDamage', amount:0.12, desc:'Direct hits gain damage against targets within 100 units.', fx:{armor:1}, tip:'Stand within 100 units for direct hits; the added armor helps you stay close.'},
    {id:'killNova', name:'Death Ripple', slot:'passive', effect:'killNova', amount:12, desc:'Kills damage nearby enemies; those ripples cannot trigger more ripples.', fx:{killHeal:1}, tip:'Finish weak enemies beside stronger ones. Ripple kills cannot start an endless chain.'},
    {id:'killHaste', name:'Victory Tempo', slot:'passive', effect:'killHaste', amount:0.09, desc:'A kill grants four seconds of faster attacks, refreshed by another kill.', fx:{attSpd:0.03}, tip:'Maintain a chain of kills; the duration refreshes instead of stacking the haste.'},
    {id:'shieldDamage', name:'Ward Edge', slot:'passive', effect:'shieldDamage', amount:0.12, desc:'Direct hits deal more damage while shield remains. A starting shield is included.', fx:{shieldOnRoom:10}, tip:'Protect your shield and replenish it before attacking; the damage bonus ends when it breaks.'},
    {id:'guardCast', name:'Spell Reversal', slot:'guard', effect:'guardCast', amount:0.3, desc:'A fresh Guard parry refunds part of the current Cast cooldown.', fx:{castMul:0.07}, tip:'Cast first, then parry an incoming attack to make the next Cast available sooner.'},
    {id:'rushNova', name:'Rush Breaker', slot:'rush', effect:'rushNova', amount:16, desc:'Starting Rush releases damage around you.', fx:{rushCdMul:-0.05}, tip:'Start Rush within 140 units of the pack, then use its movement to escape.'},
    {id:'ascendNova', name:'Ascendant Dawn', slot:'ascend', effect:'ascendNova', amount:20, desc:'Starting Ascend releases a large nearby burst.', fx:{ascendCdMul:-0.04}, tip:'Activate Ascend within 180 units of enemies before using its empowering window.'}
  ];
  const archetypeById = Object.create(null);
  archetypes.forEach(item => { archetypeById[item.id] = item; item.gods = []; });

  /* Each deity has its own combat signature and five chosen build routes.
     The first fourteen also have a sixth, totaling 254 ordinary families.
     Existing painted god portraits serve every new offer. */
  const courts = [
    ['zeus','Thunderhead',{boltOnHit:0.12,chain:{n:1,mul:0.4,dmg:8}},'critBurst castFork castNova killNova ascendNova rushNova'],
    ['poseidon','Breaking Tide',{waveOnHit:1,waveDmg:8,knock:0.15},'dashNova castNova rushNova closeDamage shieldDamage killNova'],
    ['athena','Measured Aegis',{dmgReduce:0.04,guardCdMul:-0.045},'parryNova parryHeal guardCast shieldDamage bossHunter closeDamage'],
    ['ares','Blood Oath',{bleed:{dmg:4,dur:3},bleedAmp:0.06},'statusDetonate closeDamage killNova killHaste dashStrike bossHunter'],
    ['aphrodite','Rose Thorn',{weaken:0.14,maxHp:8},'closeDamage parryHeal shieldDamage dashStrike critBurst statusSpread'],
    ['artemis','Moon Hunt',{crit:0.04,projDmg:0.06},'critBurst distanceDamage bossHunter dashStrike castFork killHaste'],
    ['dionysus','Bacchic Vintage',{poison:{dps:4,dur:3},poisonTick:0.06},'statusSpread statusDetonate killNova castNova closeDamage killHaste'],
    ['hephaestus','Bronze Ember',{burnOnHit:{dps:4,dur:3},armor:1},'parryNova shieldDamage castNova closeDamage rushNova statusDetonate'],
    ['hermes','Winged Passage',{moveMul:0.04,attSpd:0.04},'dashStrike killHaste distanceDamage dashNova rushNova guardCast'],
    ['demeter','Winter Harvest',{slowOnHit:0.12,winterOnHit:1},'statusDetonate castNova killNova distanceDamage statusSpread parryHeal'],
    ['hades','Cypress Debt',{killShield:4,obolMul:0.04},'killNova shieldDamage bossHunter statusSpread ascendNova closeDamage'],
    ['chaos','Primordial Fracture',{dmgMul:0.08,maxHpMul:-0.025},'castFork statusDetonate critBurst ascendNova guardCast rushNova'],
    ['hera','Sovereign Vow',{shieldOnRoom:8,weaken:0.1},'shieldDamage parryNova parryHeal guardCast closeDamage ascendNova'],
    ['apollo','Laurel Ray',{critMark:0.08,castMul:0.06},'distanceDamage critBurst castFork castNova bossHunter guardCast'],
    ['hestia','Sheltered Flame',{burnOnHit:{dps:3,dur:4},shieldOnRoom:6},'shieldDamage parryHeal closeDamage statusSpread castNova'],
    ['persephone','Returning Seed',{healRoom:0.035,poison:{dps:3,dur:4}},'statusSpread killNova parryHeal ascendNova statusDetonate'],
    ['hecate','Crossroads Torch',{castMul:0.08,rootOnHit:0.05},'castFork guardCast castNova statusDetonate dashNova'],
    ['nyx','Night Veil',{dodge:0.035,critMul:0.08},'critBurst dashStrike distanceDamage shieldDamage ascendNova'],
    ['thanatos','Quiet Reaping',{lowHpDmg:0.1,killHeal:1},'killNova bossHunter killHaste statusSpread closeDamage'],
    ['hypnos','Drowsing Poppy',{slowOnHit:0.1,stagger:0.05},'castNova parryHeal guardCast statusSpread dashNova'],
    ['charon','Last Fare',{obolMul:0.08,shieldOnRoom:6},'shieldDamage killNova dashStrike guardCast bossHunter'],
    ['nemesis','Balanced Sentence',{reflect:0.08,revenge:0.08},'parryNova bossHunter closeDamage critBurst shieldDamage'],
    ['nike','Victory Laurel',{attSpd:0.045,killHeal:1.25},'killHaste killNova bossHunter rushNova dashStrike'],
    ['iris','Prismatic Dispatch',{castEcho:1,moveMul:0.035},'castFork distanceDamage dashNova rushNova castNova'],
    ['hebe','Renewing Cup',{maxHp:10,healRoom:0.025},'parryHeal killHaste shieldDamage ascendNova dashStrike'],
    ['asclepius','Serpent Remedy',{lifesteal:0.01,lifeOnEnter:3},'parryHeal statusSpread statusDetonate guardCast killNova'],
    ['pan','Wild Reed',{rootOnHit:0.08,moveMul:0.04},'dashNova rushNova killHaste closeDamage statusSpread'],
    ['eros','Piercing Desire',{charm:0.07,critMul:0.08},'critBurst distanceDamage castFork dashStrike parryHeal'],
    ['eris','Discordant Apple',{doubleAttack:0.06,weaken:0.08},'statusDetonate killHaste critBurst killNova closeDamage'],
    ['gaia','Rooted Mountain',{thorns:5,maxHp:8},'closeDamage shieldDamage parryNova rushNova ascendNova'],
    ['kronos','Patient Hourglass',{castCdMul:-0.05,slowOnHit:0.06},'guardCast castNova castFork killHaste bossHunter'],
    ['rhea','Hidden Cradle',{shieldOnRoom:7,lifeOnEnter:2},'parryHeal shieldDamage parryNova ascendNova closeDamage'],
    ['themis','Ordered Judgment',{guardMul:0.07,dmgReduce:0.025},'guardCast parryNova bossHunter shieldDamage parryHeal'],
    ['tyche','Fortunate Throw',{crit:0.035,coinOnHit:0.2},'critBurst castFork killHaste bossHunter distanceDamage'],
    ['morpheus','Dreaming Form',{castEcho:1,slowOnHit:0.08},'castNova castFork guardCast statusSpread distanceDamage'],
    ['moirai','Unbroken Thread',{killShield:3,critMark:0.055},'bossHunter critBurst shieldDamage statusDetonate ascendNova'],
    ['amphitrite','Pearl Current',{waveOnHit:1,waveDmg:6,healRoom:0.02},'castNova dashNova shieldDamage killNova rushNova'],
    ['triton','Conch Summons',{waveOnHit:1,waveDmg:7,castMul:0.04},'castFork castNova rushNova distanceDamage parryNova'],
    ['boreas','Northern Squall',{slowOnHit:0.14,dashDist:0.035},'dashNova distanceDamage rushNova statusSpread castNova'],
    ['aeolus','Released Gale',{moveMul:0.035,projDmg:0.045},'distanceDamage castFork dashStrike rushNova killHaste'],
    ['selene','Silver Chariot',{critMul:0.07,dashInvuln:0.025},'critBurst dashStrike distanceDamage ascendNova dashNova'],
    ['helios','Watching Sun',{burnOnHit:{dps:3,dur:3},critMark:0.045},'castNova critBurst distanceDamage ascendNova statusDetonate'],
    ['eos','Opening Horizon',{healRoom:0.025,moveMul:0.025},'ascendNova rushNova killHaste parryHeal dashNova'],
    ['harmonia','Joining Chord',{dmgReduce:0.025,castMul:0.045},'guardCast parryHeal castFork shieldDamage castNova'],
    ['prometheus','Stolen Spark',{burnOnHit:{dps:3.5,dur:3},castMul:0.045},'statusSpread statusDetonate castNova rushNova ascendNova'],
    ['atlas','Bearing Heaven',{armor:1.25,maxHp:6},'shieldDamage closeDamage parryNova bossHunter ascendNova'],
    ['styx','Binding River',{dashShield:4,weaken:0.08},'shieldDamage guardCast parryNova dashStrike statusDetonate'],
    ['phobos','Rout of Shadows',{stagger:0.055,crit:0.025},'killHaste killNova dashNova rushNova critBurst']
  ];
  const courtByGod = Object.create(null);
  courts.forEach(row => { courtByGod[row[0]] = row; });

  /* These profiles alter a second combat loop, rather than only changing a
     title or rarity. Their contributions appear in the final effect prose. */
  const profiles = [
    {id:'pursuit',name:'Pursuit',fx:{dashStrike:0.06,dmgMul:0.025}},
    {id:'crossfire',name:'Crossfire',fx:{castFork:1,projDmg:0.025}},
    {id:'aftershock',name:'Aftershock',fx:{castNova:5,castCdMul:-0.025}},
    {id:'burststep',name:'Burst Step',fx:{dashNova:5,moveMul:0.025}},
    {id:'reversal',name:'Reversal',fx:{parryNova:5,guardMul:0.04}},
    {id:'restoration',name:'Restoration',fx:{parryHeal:1,guardCdMul:-0.03}},
    {id:'crucible',name:'Crucible',fx:{statusDetonate:5,bleed:{dmg:2,dur:3},poison:{dps:2,dur:3}}},
    {id:'contagion',name:'Contagion',fx:{statusSpread:0.08,poison:{dps:2,dur:3}}},
    {id:'giantbreaker',name:'Giant Breaker',fx:{bossHunter:0.05,critMul:0.05}},
    {id:'outrider',name:'Outrider',fx:{distanceDamage:0.05,castMul:0.04}},
    {id:'closeguard',name:'Close Guard',fx:{closeDamage:0.05,armor:0.6}},
    {id:'reaping',name:'Reaping',fx:{killNova:5,killHeal:0.8}},
    {id:'momentum',name:'Momentum',fx:{killHaste:0.025,attSpd:0.02}},
    {id:'wardedge',name:'Ward Edge',fx:{shieldDamage:0.05,shieldOnRoom:4}},
    {id:'spellguard',name:'Spell Guard',fx:{guardCast:0.1,castMul:0.03}},
    {id:'breakthrough',name:'Breakthrough',fx:{rushNova:5,rushCdMul:-0.025}},
    {id:'apotheosis',name:'Apotheosis',fx:{ascendNova:7,ascendCdMul:-0.025}},
    {id:'criticalecho',name:'Critical Echo',fx:{critBurst:5,crit:0.03}},
    {id:'endurance',name:'Endurance',fx:{lifesteal:0.005,healRoom:0.02}}
  ];
  function mergeFx(first, second) {
    const fx = copy(first || {});
    Object.keys(second || {}).forEach(key => {
      const value = second[key];
      if (value && typeof value === 'object') {
        if (!fx[key]) fx[key] = copy(value);
        else Object.keys(value).forEach(sub => {
          // Duration and target count are ceilings; damage contributions add.
          fx[key][sub] = ['dur','n','mul'].includes(sub) ? Math.max(fx[key][sub] || 0, value[sub]) : (fx[key][sub] || 0) + value[sub];
        });
      } else if (['waveOnHit','winterOnHit','immuneSlow'].includes(key)) fx[key] = Math.max(fx[key] || 0, value);
      else fx[key] = Math.round(((fx[key] || 0) + value) * 10000) / 10000;
    });
    return fx;
  }
  function mechanicFx(id) {
    const archetype = archetypeById[id];
    return mergeFx(archetype.fx, {[archetype.effect]:archetype.amount});
  }
  function enableConditions(fx) {
    if (fx.critBurst && !fx.crit) fx.crit = 0.04;
    if (fx.shieldDamage && !(fx.shieldOnRoom || fx.dashShield || fx.killShield)) fx.shieldOnRoom = 6;
    if (fx.statusDetonate) {
      const dots = ['bleed','poison','burnOnHit'].filter(key => fx[key]);
      if (!dots.length) fx.bleed = {dmg:2,dur:3};
      if (dots.length < 2 && !fx.poison) fx.poison = {dps:2,dur:3};
      else if (dots.length < 2 && !fx.bleed) fx.bleed = {dmg:2,dur:3};
    }
    if (fx.statusSpread && !['bleed','poison','burnOnHit'].some(key => fx[key])) fx.poison = {dps:2,dur:3};
    return fx;
  }

  /* Tokens are built from the final fx, including the variant contributions.
     Fixed trigger windows/radii belong to combat semantics, not rarity. */
  const descriptions = {
    critBurst:['damage','Direct critical hits release {v} within 150 units, at most once per second.'],
    castFork:['count','Original Cast adds {v} spread projectile(s), each dealing 65% Cast impact; extras create no rifts.'],
    castNova:['damage','Original Cast landing deals {v} within 120 units.'],
    dashNova:['damage','Starting a Dash deals {v} within 120 units.'],
    dashStrike:['percent','The next Strike within three seconds after Dash deals +{v}.'],
    parryNova:['damage','A fresh Guard parry deals {v} within 150 units.'],
    parryHeal:['health','A fresh Guard parry restores {v}, at most once per second.'],
    statusDetonate:['damage','Direct hits against a target with at least two damaging statuses detonate for {v}, once per second per target.'],
    statusSpread:['percent','Kills have a {v} chance to copy remaining damage over time to the nearest two hostiles within 220 units.'],
    bossHunter:['percent','Direct hits against bosses and minibosses deal +{v} damage.'],
    distanceDamage:['percent','Direct hits beyond 180 units deal +{v} damage.'],
    closeDamage:['percent','Direct hits within 100 units deal +{v} damage.'],
    killNova:['damage','A kill releases {v} within 150 units; ripple kills cannot trigger another ripple.'],
    killHaste:['percent','Kills grant +{v} attack speed for four seconds; further kills refresh the duration.'],
    shieldDamage:['percent','Direct hits deal +{v} damage while any shield remains.'],
    guardCast:['seconds','A fresh Guard parry refunds {v} of the current Cast cooldown.'],
    rushNova:['damage','Starting Rush deals {v} within 140 units.'],
    ascendNova:['damage','Starting Ascend deals {v} within 180 units.'],
    crit:['percent','Gain +{v} critical chance.'],
    critMul:['percent','Critical hits gain +{v} damage.'],
    dmgMul:['percent','Gain +{v} attack damage.'],
    attSpd:['percent','Gain +{v} attack speed.'],
    moveMul:['percent','Gain +{v} movement speed.'],
    projDmg:['percent','Projectile attacks gain +{v} damage.'],
    castMul:['percent','Cast gains +{v} damage.'],
    castCdMul:['absolutePercent','Cast cooldown is reduced by {v}.'],
    rushCdMul:['absolutePercent','Rush cooldown is reduced by {v}.'],
    ascendCdMul:['absolutePercent','Ascend cooldown is reduced by {v}.'],
    guardCdMul:['absolutePercent','Guard cooldown is reduced by {v}.'],
    guardMul:['percent','Guard timing window gains +{v}.'],
    dashDist:['percent','Dash distance gains +{v}.'],
    dashInvuln:['seconds','Dash gains {v} of invulnerability.'],
    maxHp:['health','Gain {v} maximum life.'],
    maxHpMul:['absolutePercent','Sacrifice {v} maximum life.'],
    armor:['armor','Gain {v} flat damage reduction.'],
    dmgReduce:['percent','Take {v} less damage.'],
    dodge:['percent','Gain a {v} chance to dodge incoming damage.'],
    reflect:['percent','Return {v} of damage taken to non-boss attackers.'],
    revenge:['percent','Taking damage bursts for twice {v} of that damage within 110 units.'],
    thorns:['damage','Melee attackers other than bosses take {v} back.'],
    lifesteal:['percent','Each melee Strike hit heals for {v} of current Strike damage before critical and combo bonuses.'],
    lowHpDmg:['percent','Missing life raises Strike damage, up to +{v}.'],
    killHeal:['health','Kills restore {v}; boss kills restore twelve times as much.'],
    killShield:['shield','Kills grant {v}.'],
    shieldOnRoom:['shield','Begin each chamber with {v}.'],
    dashShield:['shield','Dash and Wrath grant {v}.'],
    lifeOnEnter:['health','Restore {v} on entering a chamber.'],
    healRoom:['percent','Restore {v} of maximum life at chamber entry and clear.'],
    obolMul:['percent','Gain +{v} Obols.'],
    coinOnHit:['percent','Melee Strike hits have a {v} chance to drop one Obol.'],
    critMark:['percent','Melee Strikes mark enemies for five seconds; marked enemies take +{v} direct hit damage.'],
    weaken:['percent','Strikes weaken enemy damage by {v} and movement by half that amount for four seconds.'],
    slowOnHit:['percent','Strikes slow enemy movement by {v} for two seconds.'],
    rootOnHit:['percent','Melee Strike hits have a {v} chance to root for 1.2 seconds.'],
    stagger:['percent','Melee Strike hits have a {v} chance to stun for 0.6 seconds.'],
    charm:['percent','Melee Strike hits have a {v} chance to charm enemies into attacking their kin.'],
    doubleAttack:['percent','Gain a {v} chance for an additional Strike.'],
    poisonTick:['percent','Poison gains +{v} damage.'],
    bleedAmp:['percent','Player hits against bleeding enemies deal +{v} damage.'],
    waveDmg:['damage','Waves deal {v}.'],
    knock:['percent','Strike knockback gains +{v} force.'],
    boltOnHit:['percent','Each melee Strike has a {v} chance to call lightning.'],
    castEcho:['count','Cast adds {v} seeking echo projectile(s), each dealing 50% Cast damage.']
  };
  const flagDescriptions = {
    waveOnHit:'Strikes release a water wave.',
    winterOnHit:'Melee Strikes CHILL; melee hits against chilled or slowed enemies gain 25% damage.'
  };
  function describe(fx, prefix) {
    const descFx = {}, clauses = prefix ? [prefix] : [];
    let tokenIndex = 0;
    function token(path, unit) {
      if (tokenIndex >= 26) throw new Error('Too many effect bindings in boon: ' + prefix);
      const letter = String.fromCharCode(65 + tokenIndex++);
      descFx[letter] = {path,unit};
      return '%' + letter + '%';
    }
    Object.keys(fx).forEach(key => {
      if (flagDescriptions[key]) { clauses.push(flagDescriptions[key]); return; }
      if (['bleed','poison','burnOnHit'].includes(key)) {
        const name = {bleed:'BLEED',poison:'POISON',burnOnHit:'BURN'}[key];
        clauses.push('Strikes apply ' + name + ': ' + token(key + (key === 'bleed' ? '.dmg' : '.dps'),'dps') + ' for ' + token(key + '.dur','seconds') + '.');
      } else if (key === 'chain') {
        clauses.push('Melee Strikes chain to ' + token('chain.n','count') + ' nearby target(s). Chain carries ' + token('chain.dmg','damage') + ', scaled by ' + token('chain.mul','percent') + '; later jumps retain 82% of the previous hit. Chain damage also gains 10% per Zeus boon.');
      } else {
        const descriptor = descriptions[key];
        if (!descriptor) throw new Error('Unimplemented boon description: ' + key);
        clauses.push(descriptor[1].replace('{v}',token(key,descriptor[0])));
      }
    });
    return {desc:clauses.join(' '),descFx};
  }

  D.BOON_DESCRIPTION_BINDINGS = D.BOON_DESCRIPTION_BINDINGS || Object.create(null);
  const addedFamilies = [], addedOrdinary = [], addedSpecial = [];
  function addFamily(definition, target) {
    const prefix = definition.rarity === 'duo' ? 'DUO (' + Object.keys(definition.req.gods).map(id => D.GODS[id].name).join(' + ') + ').' :
      definition.rarity === 'legendary' ? 'LEGENDARY (' + Object.keys(definition.req.gods).map(id => D.GODS[id].name).join(' + ') + ').' : '';
    const source = Object.assign({},definition,{
      familyId:definition.id,sourceId:definition.id,visualKey:'god:' + definition.god,icon:'god:' + definition.god,
      expansionId:'divine-builds',tags:['divine-builds',definition.god,definition.buildArchetype],
      fx:enableConditions(copy(definition.fx))
    });
    addedFamilies.push(source.id);
    [null].concat(profiles).forEach((profile,index) => {
      const boon = copy(source);
      if (profile) {
        boon.id = source.id + '_v' + String(index).padStart(2,'0');
        boon.name = profile.name + ' ' + source.name;
        boon.variantId = profile.id;
        boon.generatedVariant = true;
        boon.tags.push(profile.id);
        boon.fx = enableConditions(mergeFx(source.fx,profile.fx));
      } else boon.variantId = 'foundation';
      boon.mechanicKeys = archetypes.filter(item => boon.fx[item.effect] > 0).map(item => item.effect);
      Object.assign(boon,describe(boon.fx,prefix));
      D.BOON_DESCRIPTION_BINDINGS[boon.id] = boon.descFx;
      target.push(boon);
      (boon.rarity === 'common' ? addedOrdinary : addedSpecial).push(boon.id);
    });
  }
  courts.forEach(row => {
    const [god,title,signature,routes] = row;
    routes.split(' ').forEach(id => {
      const archetype = archetypeById[id];
      if (!archetype) throw new Error('Unknown build route: ' + id);
      if (!archetype.gods.includes(god)) archetype.gods.push(god);
      addFamily({id:'x3_' + god + '_' + id,god,slot:archetype.slot,rarity:'common',
        name:title + ' ' + archetype.name,buildArchetype:id,fx:mergeFx(signature,mechanicFx(id))},D.BOONS);
    });
  });

  /* Duo foundations open a combined loop. Legendary foundations ask for
     three favors from the leading deity plus a second god and six boons. */
  const specials = [
    ['duo','apollo','triton','Conch of the Sun','castFork','castNova'],
    ['duo','athena','hestia','Hearth Reversal','parryHeal','parryNova'],
    ['duo','ares','prometheus','Stolen Bloodfire','statusDetonate','statusSpread'],
    ['duo','artemis','selene','Moonbound Pursuit','dashStrike','distanceDamage'],
    ['duo','hermes','nike','Winged Tempo','killHaste','rushNova'],
    ['duo','hades','persephone','Returning Requiem','killNova','parryHeal'],
    ['duo','hephaestus','atlas','Skyforged Ward','shieldDamage','closeDamage'],
    ['duo','hecate','themis','Law at the Crossroads','guardCast','castFork'],
    ['duo','dionysus','asclepius','Bitter Remedy','statusSpread','parryHeal'],
    ['duo','zeus','helios','Witnessed Thunder','critBurst','ascendNova'],
    ['duo','poseidon','boreas','Northern Undertow','dashNova','castNova'],
    ['duo','nyx','morpheus','Dreaming Night','castFork','distanceDamage'],
    ['duo','nemesis','moirai','Measured Fate','bossHunter','parryNova'],
    ['duo','aphrodite','eros','Unavoidable Heart','critBurst','closeDamage'],
    ['legendary','hera','styx','The Inviolable Oath','shieldDamage','guardCast'],
    ['legendary','apollo','artemis','The Unerring Horizon','distanceDamage','critBurst'],
    ['legendary','hecate','chaos','Three Roads Beyond Nothing','castFork','statusDetonate'],
    ['legendary','thanatos','hades','The Last Collection','killNova','bossHunter'],
    ['legendary','kronos','hermes','The Stolen Second','guardCast','killHaste'],
    ['legendary','gaia','rhea','Mountain That Remembers','closeDamage','parryHeal'],
    ['legendary','hestia','prometheus','Fire Kept for Mortals','statusSpread','ascendNova'],
    ['legendary','demeter','persephone','Winter Opens into Spring','statusDetonate','killNova'],
    ['legendary','selene','eos','Chariot of the Returning Dawn','dashStrike','ascendNova'],
    ['legendary','amphitrite','poseidon','Sovereignty of the Deep','castNova','rushNova'],
    ['legendary','themis','nemesis','The Final Balance','parryNova','bossHunter'],
    ['legendary','tyche','nike','Fortune Crowns the Brave','critBurst','killHaste'],
    ['legendary','pan','phobos','Panic Beneath the Leaves','dashNova','rushNova'],
    ['legendary','harmonia','iris','Every Voice in the Prism','castFork','guardCast']
  ];
  specials.forEach((row,index) => {
    const [rarity,god,partner,name,first,second] = row;
    let fx = mergeFx(mechanicFx(first),mechanicFx(second));
    fx = mergeFx(fx,courtByGod[god][2]);
    fx = mergeFx(fx,courtByGod[partner][2]);
    const req = {gods:{[god]:rarity === 'legendary' ? 3 : 1,[partner]:1}};
    if (rarity === 'legendary') req.minBoons = 6;
    addFamily({id:'x3_' + rarity + '_' + String(index + 1).padStart(2,'0'),god,slot:'passive',rarity,name,req,
      partnerGod:partner,buildArchetype:first,fx},D.SPECIAL_BOONS);
  });

  D.boonById = Object.create(null);
  D.BOONS.concat(D.SPECIAL_BOONS).forEach(boon => { D.boonById[boon.id] = boon; });
  D.CONTENT_COUNTS = Object.assign({},D.CONTENT_COUNTS,{
    boons:D.BOONS.length + D.SPECIAL_BOONS.length,ordinaryBoons:D.BOONS.length,specialBoons:D.SPECIAL_BOONS.length,
    boonBuildArchetypes:archetypes.length,additionalBoonFamilies:addedFamilies.length
  });
  K.BoonExpansion = {
    archetypes,archetypeById,profiles,baseline,
    addedBoons:addedOrdinary.length + addedSpecial.length,addedOrdinaryBoons:addedOrdinary.length,addedSpecialBoons:addedSpecial.length,
    addedOrdinaryFamilies:254,addedSpecialFamilies:28,addedFamilies:addedFamilies.length,
    ordinaryIds:addedOrdinary,specialIds:addedSpecial,familyIds:addedFamilies,
    totals:{boons:D.CONTENT_COUNTS.boons,ordinaryBoons:D.BOONS.length,specialBoons:D.SPECIAL_BOONS.length}
  };
})();
