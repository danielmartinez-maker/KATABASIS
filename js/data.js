/* ============================================================
   KATABASIS — data.js
   The mythology: gods, boons, duos, legendaries, relics,
   the Mirror of Nyx, regions, and the bestiary.
   Boons apply their power through the `fx` symbol table, which
   game.js compiles into the run's stat block.
   ============================================================ */
(function () {
  'use strict';
  const K = window.K;

  /* Effects are declarative. game.js reads these keys. */
  const GODS = {
    zeus: {
      id: 'zeus', name: 'ZEUS', title: 'King of the Olympians', icon: '⚡', color: '#f5e07a',
      domain: 'Sky & Thunder', blurb: 'Lord of the bright bolt. His boons punish crowds and reward aggression.'
    },
    poseidon: {
      id: 'poseidon', name: 'POSEIDON', title: 'Earth-Shaker', icon: '🔱', color: '#5fd0d8',
      domain: 'Sea & Earthquake', blurb: 'The deep answers him. His boons hurl foes and drown the field.'
    },
    athena: {
      id: 'athena', name: 'ATHENA', title: 'Bright-Eyed', icon: '🦉', color: '#cfd6e2',
      domain: 'Wisdom & War', blurb: 'Strategy is armour. Her boons make the mortal untouchable.'
    },
    ares: {
      id: 'ares', name: 'ARES', title: 'Sacker of Cities', icon: '🗡', color: '#e2564a',
      domain: 'Bloodlust & Ruin', blurb: 'He does not grant victory. He grants slaughter.'
    },
    aphrodite: {
      id: 'aphrodite', name: 'APHRODITE', title: 'Foam-Born', icon: '❤', color: '#f08bb4',
      domain: 'Desire & Discord', blurb: 'Love in Greece is a weapon. Weakened foes die easily.'
    },
    artemis: {
      id: 'artemis', name: 'ARTEMIS', title: 'Arrow-Pouring', icon: '🏹', color: '#9be07a',
      domain: 'The Hunt & the Moon', blurb: 'The hunt rewards those who never stop moving.'
    },
    dionysus: {
      id: 'dionysus', name: 'DIONYSUS', title: 'Twice-Born', icon: '🍇', color: '#c07ad8',
      domain: 'Wine & Madness', blurb: 'His gifts linger in the blood and kill slowly.'
    },
    hephaestus: {
      id: 'hephaestus', name: 'HEPHAESTUS', title: 'The Smith', icon: '🔨', color: '#f0a04a',
      domain: 'Forge & Flame', blurb: 'Blunt, hot, and durable. Nothing forged ever truly breaks.'
    },
    hermes: {
      id: 'hermes', name: 'HERMES', title: 'Guide of Souls', icon: '🪽', color: '#8fe3c8',
      domain: 'Speed & Thievery', blurb: 'The fastest thing in the Underworld is a god with somewhere to be.'
    },
    demeter: {
      id: 'demeter', name: 'DEMETER', title: 'Bringer of Harvest', icon: '🌾', color: '#d8cf7a',
      domain: 'Grain & Winter', blurb: 'She decides what grows and what starves.'
    },
    hades: {
      id: 'hades', name: 'HADES', title: 'The Unseen', icon: '💀', color: '#9a7ad8',
      domain: 'The Dead & Riches', blurb: 'The House always collects. Spend your life where it counts.'
    },
    chaos: {
      id: 'chaos', name: 'CHAOS', title: 'The Void Before', icon: '🌀', color: '#d05ad0',
      domain: 'Primordial Nothing', blurb: 'It offers everything. It always takes something first.'
    }
  };

  /* Rarity: how many "levels" of the same boon you may own, and scaling. */
  const RARITY = {
    common:    { id: 'common',    name: 'Common',    tier: 0, scale: 1.00, weight: 60 },
    rare:      { id: 'rare',      name: 'Rare',      tier: 1, scale: 1.30, weight: 27 },
    epic:      { id: 'epic',      name: 'Epic',      tier: 2, scale: 1.65, weight: 11 },
    heroic:    { id: 'heroic',    name: 'Heroic',    tier: 3, scale: 2.10, weight: 2 },
    duo:       { id: 'duo',       name: 'Duo',       tier: 4, scale: 1.00, weight: 0 },
    legendary: { id: 'legendary', name: 'Legendary', tier: 5, scale: 1.00, weight: 0 }
  };

  /* ------------------------------------------------------------------
     fx keys used in boons:
       dmgMul      attack damage multiplier
       attSpd      attack speed multiplier
       moveMul     move speed multiplier
       specialMul  wrath damage multiplier
       specialCd   wrath cooldown multiplier
       dashDmg     damage dealt by dashing (flat)
       dashShield  shield points gained on dash
       crit        +crit chance (0..1)
       critMul     crit damage multiplier bonus
       lifesteal   fraction of damage healed
       lowHpDmg    +damage scaling as hp drops (max multiplier bonus)
       killHeal    hp restored per kill
       killShield  shield per kill
       chain       lightning chains: {n, mul, dmg}
       boltOnHit   chance to drop a bolt on attack
       boltOnKill  chance for kill to erupt in lightning
       zap         passive: strike nearest foe periodically {cd, dmg}
       knock       knockback multiplier
       waveOnHit   attack emits a water wave
       waveOnDash  dash emits a wave
       waveDmg     flat wave damage
       drownDot    damage-over-time applied by waves
       shieldOnRoom start each chamber with N shield
       shieldStart shield gained when entering a chamber
       dmgReduce   flat fraction damage reduction
       reflect     reflect fraction of damage taken
       deflectProj chance to destroy incoming projectiles on hit
       thorns      damage dealt back to melee attackers
       dashInvuln  extra i-frames on dash (seconds)
       dashCharge  extra dash charges
       bleed       attack applies bleed {dmg, dur}
       bleedAmp    damage bonus vs bleeding targets
       doomOnHit   apply DOOM: damage after delay
       doomDmg     doom damage
       raiseOnKill chance for a kill to raise a spectral ally
       furyAtLowHp damage bonus at low hp
       charm       attack applies CHARM: enemy attacks its kin
       weaken      attack applies WEAKEN: deals/moves less
       weakMul     extra damage vs weakened
       rootOnHit   chance to root/freeze on hit
       slowOnHit   slow applied on hit (fraction)
       critMark    attacks mark foes, marked foes take +damage
       multishot   extra projectiles on ranged attacks
       homing      attack projectiles seek
       pierce      attack projectiles pierce N foes
       rangeMul    projectile range multiplier
       powerShot   every Nth attack is a piercing power shot
       projDmg     extra damage for projectile attacks
       poison      attacks apply POISON {dps, dur}
       poisonTick  poison damage bonus
       fogOnKill   kills leave a noxious cloud
       drunk       foes randomly reverse direction
       stagger     chance to stagger (brief stun) on hit
       armor       flat damage reduction per hit
       riposte     chance to counter after taking a hit
       forgeOnHit  chance to launch magma
       magmaOnKill kills leave burning ground
       burnOnHit   apply BURN damage over time
       hammerTime  wrath creates shockwave
       moveSpd     flat move speed add
       dashDist    dash distance multiplier
       dashTrail   dash leaves damaging trail
       doubleAttack chance to strike twice
       atkProjectile every Nth attack fires a piercing spear
       immuneSlow  cannot be slowed
       ambush      bonus damage striking unaware/full-hp foes
       dodge       chance to fully avoid damage
       healRoom    heal this fraction of max hp each chamber
       obolMul     obol gain multiplier
       rareChance  better boon rarity odds
       extraReward extra boon choice
       aegisOnBoss begin boss fights with shield
       deathDefy   extra death defiances
       revenge     on taking damage, explosive retort
       stormOnRoom lightning storms at chamber start
       tyrantOnFight every N kills, a lightning bolt
       winterOnHit attacks chill, chilled foes take more
       harvestOnKill kills drop life-seeds
       flowersOnKill kills bloom, damaging foes nearby
       oldGrudge   damage grows every chamber cleared
       coinOnHit   hits drop obols
       freeShop    shop prices reduced
       rerollPlus  extra rerolls
       darkBonus  wrath heals
       lifeOnEnter heal when entering chamber
       magnet      pickup radius
       swarm        summons spectral allies
       invulnMelee melee attackers are blasted back
  ------------------------------------------------------------------ */

  const BOONS = [
    /* ================= ZEUS ================= */
    { id: 'z_strike', god: 'zeus', slot: 'attack', name: 'Lightning Strike', icon: '⚡',
      desc: 'Your attack smites with the sky. +%A% attack damage.',
      fx: { dmgMul: 0.35, attSpd: 0.10 } },
    { id: 'z_special', god: 'zeus', slot: 'special', name: 'Thunder Flourish', icon: '⚡',
      desc: 'Your Wrath bursts with thunder. +%A% Wrath damage and a wider blast.',
      fx: { specialMul: 0.45, specialCd: -0.12 } },
    { id: 'z_dash', god: 'zeus', slot: 'dash', name: 'Thunder Dash', icon: '⚡',
      desc: 'Dashing leaves crackling sky-fire behind you.',
      fx: { dashTrail: 1, dashDmg: 16 } },
    { id: 'z_call', god: 'zeus', slot: 'call', name: 'Zeus\' Aid', icon: '⚡',
      desc: 'Reduce Call cooldown by %A%. CALL: the King of Gods hurls bolts at every foe upon the field.',
      fx: { callBoost: 0.4 } },
    { id: 'z_bolt', god: 'zeus', slot: 'passive', name: 'Electric Overload', icon: '⚡',
      desc: 'Lightning that strikes a foe leaps to %A% more nearby enemies.',
      fx: { chain: { n: 2, mul: 0.6, dmg: 14 } } },
    { id: 'z_static', god: 'zeus', slot: 'passive', name: 'Static Field', icon: '⚡',
      desc: 'A bolt hits the nearest enemy every %A%, dealing %B%.',
      fx: { zap: { cd: 3.2, dmg: 26 } } },
    { id: 'z_blood', god: 'zeus', slot: 'passive', name: 'Heaven\'s Wrath', icon: '⚡',
      desc: 'Fallen foes have a %A% chance to call down sky-fire.',
      fx: { boltOnKill: 0.35 }, req: { gods: { zeus: 1 } } },
    { id: 'z_ascend', god: 'zeus', slot: 'ascend', name: 'Aegis of the Storm', icon: '☁',
      desc: 'Your Ascension lasts %A% longer and recharges sooner.',
      fx: { ascendMul: 0.5, ascendCdMul: -0.3 } },

    /* ================= POSEIDON ================= */
    { id: 'p_strike', god: 'poseidon', slot: 'attack', name: 'Flood Strike', icon: '🔱',
      desc: 'Your attack throws a wall of brine. +%A% damage, heavy knockback.',
      fx: { dmgMul: 0.22, knock: 2.0, waveOnHit: 1, waveDmg: 20 } },
    { id: 'p_special', god: 'poseidon', slot: 'special', name: 'Tidal Flourish', icon: '🔱',
      desc: 'Your Wrath becomes a crushing wave. +%A% Wrath damage, huge knockback.',
      fx: { specialMul: 0.5, knock: 1.4, waveOnHit: 1, waveDmg: 30 } },
    { id: 'p_dash', god: 'poseidon', slot: 'dash', name: 'Wave Dash', icon: '🔱',
      desc: 'You surf the deep — dashing erupts in a wave that hurls foes away.',
      fx: { waveOnDash: 1, waveDmg: 34, knock: 1.6 } },
    { id: 'p_call', god: 'poseidon', slot: 'call', name: 'Poseidon\'s Aid', icon: '🔱',
      desc: 'Reduce Call cooldown by %A%. CALL: a tidal wall sweeps the chamber, scattering everything it touches.',
      fx: { callBoost: 0.4 } },
    { id: 'p_drown', god: 'poseidon', slot: 'passive', name: 'Drowning Pool', icon: '🔱',
      desc: 'Foes struck by your waves drown, taking %A%.',
      fx: { drownDot: { dps: 12, dur: 4 } } },
    { id: 'p_gift', god: 'poseidon', slot: 'passive', name: 'Ocean\'s Bounty', icon: '🔱',
      desc: 'Chambers yield +%A% Obols; Charon\'s wares cost %B% less.',
      fx: { obolMul: 0.4, freeShop: 0.2 } },

    /* ================= ATHENA ================= */
    { id: 'a_strike', god: 'athena', slot: 'attack', name: 'Divine Strike', icon: '🦉',
      desc: 'Your blows carry the aegis. +%A% attack damage and deflect projectiles.',
      fx: { dmgMul: 0.30, deflectProj: 0.35 } },
    { id: 'a_special', god: 'athena', slot: 'special', name: 'Divine Flourish', icon: '🦉',
      desc: 'Your Wrath raises a bulwark. +%A% Wrath damage and gain %B% when dashing or using Wrath.',
      fx: { specialMul: 0.35, dashShield: 16 } },
    { id: 'a_dash', god: 'athena', slot: 'dash', name: 'Divine Dash', icon: '🦉',
      desc: 'Dash with the aegis: brief invulnerability and %A%.',
      fx: { dashShield: 22, dashInvuln: 0.14 } },
    { id: 'a_call', god: 'athena', slot: 'call', name: 'Athena\'s Aid', icon: '🦉',
      desc: 'Reduce Call cooldown by %A%. CALL: the Bright-Eyed makes you untouchable, and her shield turns harm back.',
      fx: { callBoost: 0.4 } },
    { id: 'a_deflect', god: 'athena', slot: 'passive', name: 'Bronze Skin', icon: '🦉',
      desc: 'Take %A% less damage and reflect %B% of incoming damage.',
      fx: { dmgReduce: 0.15, reflect: 0.25 } },
    { id: 'a_proud', god: 'athena', slot: 'passive', name: 'Proud Bearing', icon: '🦉',
      desc: 'Begin every chamber with %A%.',
      fx: { shieldOnRoom: 28 } },
    { id: 'a_bulwark', god: 'athena', slot: 'guard', name: 'Bulwark of the Aegis', icon: '🛉',
      desc: 'Your Guard lasts %A% longer and recharges %B% faster.',
      fx: { guardMul: 0.6, guardCdMul: -0.3 } },
    { id: 'a_riposte', god: 'athena', slot: 'passive', name: 'Riposte', icon: '🛉',
      desc: 'A parry makes your next blow +%A% stronger.',
      req: { gods: { athena: 1 } },
      fx: { riposte: 1.0, guardCdMul: -0.15 } },

    /* ================= ARES ================= */
    { id: 'r_strike', god: 'ares', slot: 'attack', name: 'Curse of Agony', icon: '🗡',
      desc: 'Your attacks make foes bleed for %A% for 3 s.',
      fx: { bleed: { dmg: 16, dur: 3 }, dmgMul: 0.14 } },
    { id: 'r_special', god: 'ares', slot: 'special', name: 'Curse of Vengeance', icon: '🗡',
      desc: 'Your Wrath brands foes with DOOM. After 1.2 s it detonates for %A%.',
      fx: { doomOnHit: 1, doomDmg: 60, specialMul: 0.25 } },
    { id: 'r_dash', god: 'ares', slot: 'dash', name: 'Blade Dash', icon: '🗡',
      desc: 'Your dash leaves a blade rift that shreds anything crossing it.',
      fx: { dashTrail: 1, dashDmg: 24 } },
    { id: 'r_call', god: 'ares', slot: 'call', name: 'Ares\' Aid', icon: '🗡',
      desc: 'Reduce Call cooldown by %A%. CALL: the Sacker of Cities calls a storm of blades down on the chamber.',
      fx: { callBoost: 0.4 } },
    { id: 'r_blood', god: 'ares', slot: 'passive', name: 'Blood Frenzy', icon: '🗡',
      desc: 'The closer to death you stand, the harder you hit — up to +%A%.',
      fx: { lowHpDmg: 0.55 } },
    { id: 'r_feast', god: 'ares', slot: 'passive', name: 'Feast of Flesh', icon: '🗡',
      desc: 'Heal %A% for every enemy you kill.',
      fx: { killHeal: 2 } },

    /* ================= APHRODITE ================= */
    { id: 'v_strike', god: 'aphrodite', slot: 'attack', name: 'Heartbreak Strike', icon: '❤',
      desc: 'Your attacks are heavy with longing. +%A% damage; struck foes are WEAKENED.',
      fx: { dmgMul: 0.45, weaken: 0.3 } },
    { id: 'v_special', god: 'aphrodite', slot: 'special', name: 'Heartbreak Flourish', icon: '❤',
      desc: 'Your Wrath leaves foes smitten and sluggish. +%A% Wrath damage.',
      fx: { specialMul: 0.55, weaken: 0.32 } },
    { id: 'v_dash', god: 'aphrodite', slot: 'dash', name: 'Passion Dash', icon: '❤',
      desc: 'Beauty trails you: those you dash through are weakened and hurt (%A%).',
      fx: { dashDmg: 20, weaken: 0.3 } },
    { id: 'v_call', god: 'aphrodite', slot: 'call', name: 'Aphrodite\'s Aid', icon: '❤',
      desc: 'Reduce Call cooldown by %A%. CALL: the Foam-Born CHARMS the room — your enemies fight each other.',
      fx: { callBoost: 0.4 } },
    { id: 'v_charm', god: 'aphrodite', slot: 'passive', name: 'Charming Gaze', icon: '❤',
      desc: 'Attacks have a %A% chance to CHARM a foe into striking its own kin.',
      fx: { charm: 0.18 } },
    { id: 'v_life', god: 'aphrodite', slot: 'passive', name: 'Life Affirmation', icon: '❤',
      desc: 'Raise your maximum life by +%A% and gain that much now.',
      fx: { maxHp: 26, healRoom: 0.05 } },

    /* ================= ARTEMIS ================= */
    { id: 't_strike', god: 'artemis', slot: 'attack', name: 'Deadly Strike', icon: '🏹',
      desc: 'The hunt is patient. +%A% critical chance and +%B% critical damage.',
      fx: { crit: 0.16, critMul: 0.4, dmgMul: 0.16 } },
    { id: 't_special', god: 'artemis', slot: 'special', name: 'Deadly Flourish', icon: '🏹',
      desc: 'Your Wrath seeks the mark. +%A% Wrath damage and +%B% critical chance.',
      fx: { specialMul: 0.4, crit: 0.18 } },
    { id: 't_dash', god: 'artemis', slot: 'dash', name: 'Hunter Dash', icon: '🏹',
      desc: 'A hunter\'s retreat: +%A% dash distance; every %B% attack fires a piercing power shot.',
      fx: { dashDist: 0.4, powerShot: 3 } },
    { id: 't_call', god: 'artemis', slot: 'call', name: 'Artemis\' Aid', icon: '🏹',
      desc: 'Reduce Call cooldown by %A%. CALL: a volley of seeking arrows falls on every foe, each able to crit.',
      fx: { callBoost: 0.4 } },
    { id: 't_mark', god: 'artemis', slot: 'passive', name: 'Hunter\'s Mark', icon: '🏹',
      desc: 'Your attacks MARK foes; marked enemies take +%A% damage from every source.',
      fx: { critMark: 0.25 } },
    { id: 't_pierce', god: 'artemis', slot: 'passive', name: 'Clean Kill', icon: '🏹',
      desc: 'Every %A% attack fires a power shot. Projectiles deal +%B% damage.',
      fx: { powerShot: 4, projDmg: 0.2 } },
    { id: 't_cast', god: 'artemis', slot: 'cast', name: 'Hunter\'s Cast', icon: '🎯',
      desc: 'Your Cast deals +%A% damage and leaves a larger rift.',
      fx: { castMul: 0.5, castCdMul: -0.2 } },

    /* ================= DIONYSUS ================= */
    { id: 'd_strike', god: 'dionysus', slot: 'attack', name: 'Drunken Strike', icon: '🍇',
      desc: 'Your attack poisons foes for %A% for 4 s.',
      fx: { poison: { dps: 11, dur: 4 }, dmgMul: 0.12 } },
    { id: 'd_special', god: 'dionysus', slot: 'special', name: 'Drunken Flourish', icon: '🍇',
      desc: 'Your Wrath drenches foes in unmixed wine: poison and stagger.',
      fx: { specialMul: 0.3, poison: { dps: 15, dur: 4 }, stagger: 0.3 } },
    { id: 'd_dash', god: 'dionysus', slot: 'dash', name: 'Nectar Dash', icon: '🍇',
      desc: 'Your dash leaves a reeking fume that poisons all who breathe it.',
      fx: { fogOnKill: 1, dashDmg: 12 } },
    { id: 'd_call', god: 'dionysus', slot: 'call', name: 'Dionysus\' Aid', icon: '🍇',
      desc: 'Reduce Call cooldown by %A%. CALL: the Twice-Born staggers the room with madness and riotous wine.',
      fx: { callBoost: 0.4 } },
    { id: 'd_fog', god: 'dionysus', slot: 'passive', name: 'Numbing Sensation', icon: '🍇',
      desc: 'Slain enemies burst into a noxious cloud that poisons nearby foes.',
      fx: { fogOnKill: 1, poisonTick: 0.5 } },
    { id: 'd_high', god: 'dionysus', slot: 'passive', name: 'High Tolerance', icon: '🍇',
      desc: 'You cannot be slowed. Take %A% less damage while poisoned foes are near.',
      fx: { immuneSlow: 1, dmgReduce: 0.08 } },

    /* ================= HEPHAESTUS ================= */
    { id: 'h_strike', god: 'hephaestus', slot: 'attack', name: 'Volcanic Strike', icon: '🔨',
      desc: 'Your blows deal +%A% attack damage and burn foes for %B% for 3 s.',
      fx: { dmgMul: 0.28, burnOnHit: { dps: 9, dur: 3 } } },
    { id: 'h_special', god: 'hephaestus', slot: 'special', name: 'Volcanic Flourish', icon: '🔨',
      desc: 'Your Wrath slams the earth. +%A% Wrath damage and a shockwave that staggers.',
      fx: { specialMul: 0.45, hammerTime: 1, stagger: 0.4 } },
    { id: 'h_dash', god: 'hephaestus', slot: 'dash', name: 'Smith\'s Dash', icon: '🔨',
      desc: 'You dash through fire: gain %A% armor and %B% shield.',
      fx: { armor: 6, dashShield: 12 } },
    { id: 'h_call', god: 'hephaestus', slot: 'call', name: 'Hephaestus\' Aid', icon: '🔨',
      desc: 'Reduce Call cooldown by %A%. CALL: the Smith\'s anvils fall from heaven, crushing and burning all below.',
      fx: { callBoost: 0.4 } },
    { id: 'h_armor', god: 'hephaestus', slot: 'passive', name: 'Iron Will', icon: '🔨',
      desc: 'Each hit you take is reduced by %A% armor.',
      fx: { armor: 9 } },
    { id: 'h_forge', god: 'hephaestus', slot: 'passive', name: 'Forge\'s Blessing', icon: '🔨',
      desc: 'Kills leave burning magma on the ground.',
      fx: { magmaOnKill: 1, burnOnHit: { dps: 6, dur: 2 } } },

    /* ================= HERMES ================= */
    { id: 'm_strike', god: 'hermes', slot: 'attack', name: 'Swift Strike', icon: '🪽',
      desc: 'Attack speed rises %A%, movement speed rises %B%, and attack damage rises %C%.',
      fx: { attSpd: 0.30, moveMul: 0.06, dmgMul: 0.12 } },
    { id: 'm_special', god: 'hermes', slot: 'special', name: 'Swift Flourish', icon: '🪽',
      desc: 'Your Wrath cooldown is %A% shorter.',
      fx: { specialCd: -0.3, specialMul: 0.2 } },
    { id: 'm_dash', god: 'hermes', slot: 'dash', name: 'Greater Haste', icon: '🪽',
      desc: 'Gain %A%; your dash travels %B% farther.',
      fx: { dashCharge: 1, dashDist: 0.25, moveMul: 0.05 } },
    { id: 'm_call', god: 'hermes', slot: 'call', name: 'Hermes\' Aid', icon: '🪽',
      desc: 'Reduce Call cooldown by %A%. CALL: the Guide of Souls makes you blindingly fast and untouchable.',
      fx: { callBoost: 0.4 } },
    { id: 'm_quick', god: 'hermes', slot: 'passive', name: 'Quick Favor', icon: '🪽',
      desc: 'Move %A% faster and dash %B% farther.',
      fx: { moveMul: 0.16, dashDist: 0.2 } },
    { id: 'm_rich', god: 'hermes', slot: 'passive', name: 'Side Hustle', icon: '🪽',
      desc: 'Each hit has a %A% chance to drop an Obol; gain +%B% Obols.',
      fx: { coinOnHit: 0.14, obolMul: 0.3 } },
    { id: 'm_rush', god: 'hermes', slot: 'rush', name: 'Wing-Footed Charge', icon: '💨',
      desc: 'Your Rush deals +%A% damage and recharges sooner.',
      fx: { rushMul: 0.5, rushCdMul: -0.25 } },
    { id: 'm_afterimage', god: 'hermes', slot: 'passive', name: 'Afterimage', icon: '💨',
      desc: 'Your Rush leaves a burning trail of speed behind it.',
      req: { gods: { hermes: 1 } },
      fx: { rushMul: 0.25, dashDmg: 22 } },

    /* ================= DEMETER ================= */
    { id: 'e_strike', god: 'demeter', slot: 'attack', name: 'Frost Strike', icon: '🌾',
      desc: 'Your attacks CHILL foes and deal +%A% attack damage.',
      fx: { winterOnHit: 1, dmgMul: 0.24, slowOnHit: 0.35 } },
    { id: 'e_special', god: 'demeter', slot: 'special', name: 'Frost Flourish', icon: '🌾',
      desc: 'Your Wrath freezes the ground. +%A% Wrath damage and %B% slow.',
      fx: { specialMul: 0.35, winterOnHit: 1, slowOnHit: 0.4 } },
    { id: 'e_dash', god: 'demeter', slot: 'dash', name: 'Winter\'s Chill', icon: '🌾',
      desc: 'Your dash freezes the air behind you, chilling all it touches.',
      fx: { slowOnHit: 0.4, dashDmg: 14 } },
    { id: 'e_call', god: 'demeter', slot: 'call', name: 'Demeter\'s Aid', icon: '🌾',
      desc: 'Reduce Call cooldown by %A%. CALL: the Harvest-Mother roots the field in ice and shears it down.',
      fx: { callBoost: 0.4 } },
    { id: 'e_nourish', god: 'demeter', slot: 'passive', name: 'Nourished Soul', icon: '🌾',
      desc: 'Restore %A% of maximum life whenever you clear a chamber.',
      fx: { healRoom: 0.14 } },
    { id: 'e_harvest', god: 'demeter', slot: 'passive', name: 'Harvest\'s Boon', icon: '🌾',
      desc: 'Kills have a %A% chance to drop a life-seed. Each seed heals 7% of maximum life.',
      fx: { harvestOnKill: 0.3 } },

    /* ================= HADES ================= */
    { id: 's_strike', god: 'hades', slot: 'attack', name: 'Shadow Strike', icon: '💀',
      desc: 'Darkness clings to your blade. +%A% attack damage; slay a foe to gain a shield.',
      fx: { dmgMul: 0.34, killShield: 6 } },
    { id: 's_special', god: 'hades', slot: 'special', name: 'Shadow Flourish', icon: '💀',
      desc: 'Your Wrath drinks life. +%A% Wrath damage; Wrath now heals you.',
      fx: { specialMul: 0.4, darkBonus: 0.1 } },
    { id: 's_dash', god: 'hades', slot: 'dash', name: 'Soul Dash', icon: '💀',
      desc: 'You slip between worlds: dashing grants %A%.',
      fx: { dashShield: 26, dashInvuln: 0.1 } },
    { id: 's_call', god: 'hades', slot: 'call', name: 'Hades\' Aid', icon: '💀',
      desc: 'Reduce Call cooldown by %A%. CALL: the Unseen sends the dead to fight at your side.',
      fx: { callBoost: 0.4 } },
    { id: 's_wealth', god: 'hades', slot: 'passive', name: 'Wealth of the Dead', icon: '💀',
      desc: 'Enemies yield +%A% Obols.',
      fx: { obolMul: 0.5 } },
    { id: 's_death', god: 'hades', slot: 'passive', name: 'Death Defiance', icon: '💀',
      desc: 'The first time you would die, you instead revive with 40% life.',
      fx: { deathDefy: 1 } },

    /* ================= CHAOS ================= */
    { id: 'c_strike', god: 'chaos', slot: 'attack', name: 'Void Strike', icon: '🌀',
      desc: 'Chaos lends strength at a price: +%A% attack damage, but movement is %B% slower.',
      fx: { dmgMul: 0.6, moveMul: -0.06 } },
    { id: 'c_special', god: 'chaos', slot: 'special', name: 'Void Flourish', icon: '🌀',
      desc: 'Your Wrath warps space. +%A% Wrath damage and knockback.',
      fx: { specialMul: 0.7, knock: 1.2 } },
    { id: 'c_dash', god: 'chaos', slot: 'dash', name: 'Void Dash', icon: '🌀',
      desc: 'Gain %A%; lose %B% maximum life.',
      fx: { dashCharge: 1, maxHpMul: -0.08 } },
    { id: 'c_call', god: 'chaos', slot: 'call', name: 'Chaos\' Aid', icon: '🌀',
      desc: 'Reduce Call cooldown by %A%. CALL: the primordial Nothing gnaws at every foe in the chamber.',
      fx: { callBoost: 0.4 } },
    { id: 'c_favor', god: 'chaos', slot: 'passive', name: 'Favor of Chaos', icon: '🌀',
      desc: 'Gain +%A% critical chance and +%B% movement speed. Chaos asks no price. Yet.',
      fx: { crit: 0.2, moveMul: 0.12, attSpd: 0.1 } },
    { id: 'c_greed', god: 'chaos', slot: 'passive', name: 'Grasp of the Void', icon: '🌀',
      desc: '+%A% Obols and %B% extra reward choices. Everything costs more.',
      fx: { obolMul: 0.8, extraReward: 1, freeShop: -0.15 } }
  ];

  /* ------------- Duo & Legendary boons (require foundations) ------------- */
  const SPECIAL_BOONS = [
    { id: 'duo_seastorm', god: 'zeus', slot: 'passive', rarity: 'duo', name: 'Sea Storm', icon: '🌊⚡',
      desc: 'DUO (Zeus + Poseidon). Your hits chain lightning to nearby foes and gain stronger knockback.',
      req: { gods: { zeus: 1, poseidon: 1 } },
      fx: { chain: { n: 2, mul: 0.8, dmg: 24 }, knock: 1.5 } },
    { id: 'duo_rod', god: 'artemis', slot: 'passive', rarity: 'duo', name: 'Lightning Rod', icon: '🏹⚡',
      desc: 'DUO (Artemis + Zeus). Your attacks can call down lightning, and your projectiles deal bonus damage.',
      req: { gods: { artemis: 1, zeus: 1 } },
      fx: { boltOnHit: 0.5, projDmg: 0.3 } },
    { id: 'duo_curse', god: 'ares', slot: 'passive', rarity: 'duo', name: 'Curse of Longing', icon: '🗡❤',
      desc: 'DUO (Ares + Aphrodite). Your hits apply BLEED and WEAKEN. Player hits deal bonus damage to bleeding foes.',
      req: { gods: { ares: 1, aphrodite: 1 } },
      fx: { bleed: { dmg: 20, dur: 3 }, weaken: 0.3, bleedAmp: 0.3 } },
    { id: 'duo_deadly', god: 'artemis', slot: 'passive', rarity: 'duo', name: 'Deadly Reversal', icon: '🏹🦉',
      desc: 'DUO (Artemis + Athena). Gain +%A% critical chance and +%B% projectile deflection.',
      req: { gods: { artemis: 1, athena: 1 } },
      fx: { crit: 0.3, deflectProj: 0.4 } },
    { id: 'duo_ice', god: 'demeter', slot: 'passive', rarity: 'duo', name: 'Blizzard Shot', icon: '🌾🔱',
      desc: 'DUO (Demeter + Poseidon). Your waves chill foes and deal %A%.',
      req: { gods: { demeter: 1, poseidon: 1 } },
      fx: { waveDmg: 30, slowOnHit: 0.5, waveOnHit: 1, winterOnHit: 1 } },
    { id: 'duo_smoulder', god: 'hephaestus', slot: 'passive', rarity: 'duo', name: 'Smouldering Feast', icon: '🔨🍇',
      desc: 'DUO (Hephaestus + Dionysus). Your hits apply POISON and BURN. Kills leave damaging clouds.',
      req: { gods: { hephaestus: 1, dionysus: 1 } },
      fx: { poison: { dps: 18, dur: 4 }, burnOnHit: { dps: 12, dur: 3 }, fogOnKill: 1 } },
    { id: 'duo_fastkill', god: 'hermes', slot: 'passive', rarity: 'duo', name: 'Rush Delivery', icon: '🪽🗡',
      desc: 'DUO (Hermes + Ares). Bleeding foes take %A% more damage. Heal %B% per kill.',
      req: { gods: { hermes: 1, ares: 1 } },
      fx: { bleed: { dmg: 14, dur: 3 }, bleedAmp: 0.35, killHeal: 3 } },
    { id: 'duo_dark', god: 'hades', slot: 'passive', rarity: 'duo', name: 'Grasping Void', icon: '💀🌀',
      desc: 'DUO (Hades + Chaos). Kills grant shields. Gain +%A% attack damage and increased maximum life.',
      req: { gods: { hades: 1, chaos: 1 } },
      fx: { killShield: 10, dmgMul: 0.3, maxHpMul: 0.06 } },

    { id: 'leg_zeus', god: 'zeus', slot: 'passive', rarity: 'legendary', name: 'Splitting Bolt', icon: '🌟⚡',
      desc: 'LEGENDARY. Your lightning splits again and again, and every bolt hits for far more.',
      req: { gods: { zeus: 3 }, minBoons: 5 },
      fx: { chain: { n: 4, mul: 1.0, dmg: 40 }, dmgMul: 0.25 } },
    { id: 'leg_athena', god: 'athena', slot: 'passive', rarity: 'legendary', name: 'Divine Protection', icon: '🌟🦉',
      desc: 'LEGENDARY. Take %A% less damage and gain 18 shield when you dash or use Wrath.',
      req: { gods: { athena: 3 }, minBoons: 5 },
      fx: { dmgReduce: 0.3, dashShield: 18, armor: 4 } },
    { id: 'leg_ares', god: 'ares', slot: 'passive', rarity: 'legendary', name: 'Vicious Cycle', icon: '🌟🗡',
      desc: 'LEGENDARY. Kill streaks grant stacking damage and restore life. Taking damage or leaving the chamber resets the streak.',
      req: { gods: { ares: 3 }, minBoons: 5 },
      fx: { killStack: 0.04, killHeal: 2 } },
    { id: 'leg_artemis', god: 'artemis', slot: 'passive', rarity: 'legendary', name: 'Fully Loaded', icon: '🌟🏹',
      desc: 'LEGENDARY. Ranged attacks fire extra projectiles. Power shots trigger more often and deal bonus projectile damage.',
      req: { gods: { artemis: 3 }, minBoons: 5 },
      fx: { multishot: 2, powerShot: 2, projDmg: 0.35 } },
    { id: 'leg_hades', god: 'hades', slot: 'passive', rarity: 'legendary', name: 'The Unseen Wealth', icon: '🌟💀',
      desc: 'LEGENDARY. Gain bonus Obols and a discount at Charon\'s shop.',
      req: { gods: { hades: 3 }, minBoons: 5 },
      fx: { obolMul: 1.0, freeShop: 1.0 } },
    { id: 'leg_chaos', god: 'chaos', slot: 'passive', rarity: 'legendary', name: 'Primordial Authority', icon: '🌟🌀',
      desc: 'LEGENDARY. +%A% attack damage, +%B% Wrath damage, and +%C% attack speed.',
      req: { gods: { chaos: 2 }, minBoons: 6 },
      fx: { dmgMul: 0.5, specialMul: 0.5, attSpd: 0.25 } }
  ];

  /* Every variable in boon prose binds to a specific mechanic and unit.
     Generated variants inherit these paths when content-expansion copies data. */
  const BOON_DESCRIPTION_EFFECTS = {
    z_strike:{A:{path:'dmgMul',unit:'percent'}}, z_special:{A:{path:'specialMul',unit:'percent'}}, z_call:{A:{path:'callBoost',unit:'percent'}},
    z_bolt:{A:{path:'chain.n',unit:'count'}}, z_static:{A:{path:'zap.cd',unit:'seconds'},B:{path:'zap.dmg',unit:'damage'}},
    z_blood:{A:{path:'boltOnKill',unit:'percent'}}, z_ascend:{A:{path:'ascendMul',unit:'percent'}},
    p_strike:{A:{path:'dmgMul',unit:'percent'}}, p_special:{A:{path:'specialMul',unit:'percent'}}, p_call:{A:{path:'callBoost',unit:'percent'}},
    p_drown:{A:{path:'drownDot.dps',unit:'dps'}}, p_gift:{A:{path:'obolMul',unit:'percent'},B:{path:'freeShop',unit:'percent'}},
    a_strike:{A:{path:'dmgMul',unit:'percent'}}, a_special:{A:{path:'specialMul',unit:'percent'},B:{path:'dashShield',unit:'shield'}}, a_call:{A:{path:'callBoost',unit:'percent'}},
    a_dash:{A:{path:'dashShield',unit:'shield'}}, a_deflect:{A:{path:'dmgReduce',unit:'percent'},B:{path:'reflect',unit:'percent'}},
    a_proud:{A:{path:'shieldOnRoom',unit:'shield'}}, a_bulwark:{A:{path:'guardMul',unit:'percent'},B:{path:'guardCdMul',unit:'absolutePercent'}},
    a_riposte:{A:{path:'riposte',unit:'percent'}}, r_call:{A:{path:'callBoost',unit:'percent'}}, r_strike:{A:{path:'bleed.dmg',unit:'dps'}},
    r_special:{A:{path:'doomDmg',unit:'damage'}}, r_blood:{A:{path:'lowHpDmg',unit:'percent'}},
    r_feast:{A:{path:'killHeal',unit:'health'}}, v_strike:{A:{path:'dmgMul',unit:'percent'}}, v_call:{A:{path:'callBoost',unit:'percent'}},
    v_special:{A:{path:'specialMul',unit:'percent'}}, v_dash:{A:{path:'dashDmg',unit:'damage'}},
    v_charm:{A:{path:'charm',unit:'percent'}}, v_life:{A:{path:'maxHp',unit:'health'}},
    t_strike:{A:{path:'crit',unit:'percent'},B:{path:'critMul',unit:'percent'}},
    t_special:{A:{path:'specialMul',unit:'percent'},B:{path:'crit',unit:'percent'}}, t_call:{A:{path:'callBoost',unit:'percent'}},
    t_dash:{A:{path:'dashDist',unit:'percent'},B:{path:'powerShot',unit:'ordinal'}},
    t_mark:{A:{path:'critMark',unit:'percent'}}, t_pierce:{A:{path:'powerShot',unit:'ordinal'},B:{path:'projDmg',unit:'percent'}},
    t_cast:{A:{path:'castMul',unit:'percent'}}, d_call:{A:{path:'callBoost',unit:'percent'}}, d_strike:{A:{path:'poison.dps',unit:'dps'}},
    d_high:{A:{path:'dmgReduce',unit:'percent'}}, h_strike:{A:{path:'dmgMul',unit:'percent'},B:{path:'burnOnHit.dps',unit:'dps'}},
    h_special:{A:{path:'specialMul',unit:'percent'}}, h_dash:{A:{path:'armor',unit:'armor'},B:{path:'dashShield',unit:'shield'}},
    h_call:{A:{path:'callBoost',unit:'percent'}}, h_armor:{A:{path:'armor',unit:'armor'}}, m_strike:{A:{path:'attSpd',unit:'percent'},B:{path:'moveMul',unit:'percent'},C:{path:'dmgMul',unit:'percent'}},
    m_special:{A:{path:'specialCd',unit:'absolutePercent'}}, m_dash:{A:{path:'dashCharge',unit:'dashCharges'},B:{path:'dashDist',unit:'percent'}},
    m_quick:{A:{path:'moveMul',unit:'percent'},B:{path:'dashDist',unit:'percent'}},
    m_call:{A:{path:'callBoost',unit:'percent'}}, m_rich:{A:{path:'coinOnHit',unit:'percent'},B:{path:'obolMul',unit:'percent'}},
    m_rush:{A:{path:'rushMul',unit:'percent'}}, e_strike:{A:{path:'dmgMul',unit:'percent'}},
    e_special:{A:{path:'specialMul',unit:'percent'},B:{path:'slowOnHit',unit:'percent'}},
    e_call:{A:{path:'callBoost',unit:'percent'}}, e_nourish:{A:{path:'healRoom',unit:'percent'}}, e_harvest:{A:{path:'harvestOnKill',unit:'percent'}},
    s_strike:{A:{path:'dmgMul',unit:'percent'}}, s_special:{A:{path:'specialMul',unit:'percent'}},
    s_call:{A:{path:'callBoost',unit:'percent'}}, s_dash:{A:{path:'dashShield',unit:'shield'}}, s_wealth:{A:{path:'obolMul',unit:'percent'}},
    c_strike:{A:{path:'dmgMul',unit:'percent'},B:{path:'moveMul',unit:'absolutePercent'}},
    c_call:{A:{path:'callBoost',unit:'percent'}}, c_special:{A:{path:'specialMul',unit:'percent'}}, c_dash:{A:{path:'dashCharge',unit:'dashCharges'},B:{path:'maxHpMul',unit:'absolutePercent'}},
    c_favor:{A:{path:'crit',unit:'percent'},B:{path:'moveMul',unit:'percent'}},
    c_greed:{A:{path:'obolMul',unit:'percent'},B:{path:'extraReward',unit:'count'}},
    duo_ice:{A:{path:'waveDmg',unit:'damage'}},
    duo_fastkill:{A:{path:'bleedAmp',unit:'percent'},B:{path:'killHeal',unit:'health'}},
    duo_dark:{A:{path:'dmgMul',unit:'percent'}}, duo_deadly:{A:{path:'crit',unit:'percent'},B:{path:'deflectProj',unit:'percent'}},
    leg_athena:{A:{path:'dmgReduce',unit:'percent'}},
    leg_chaos:{A:{path:'dmgMul',unit:'percent'},B:{path:'specialMul',unit:'percent'},C:{path:'attSpd',unit:'percent'}}
  };
  BOONS.concat(SPECIAL_BOONS).forEach(boon => {
    if (BOON_DESCRIPTION_EFFECTS[boon.id]) boon.descFx = BOON_DESCRIPTION_EFFECTS[boon.id];
  });

  /* ---------------- Relics (Keepsakes & finds) ---------------- */
  const RELICS = [
    { id: 'r_owl', name: 'Owl of Athena', icon: '🦉', color: '#cfd6e2',
      desc: 'Wisdom settles on you. Take 10% less damage.', fx: { dmgReduce: 0.10 } },
    { id: 'r_coin', name: 'Charon\'s Obol', icon: '◉', color: '#e0b355',
      desc: 'The ferryman\'s own coin. +45% obols from everything.', fx: { obolMul: 0.45 } },
    { id: 'r_pelt', name: 'Nemean Pelt', icon: '🦁', color: '#d8b06a',
      desc: 'Nothing cuts what cannot be cut. +12 armour.', fx: { armor: 12 } },
    { id: 'r_lyre', name: 'Lyre of Orpheus', icon: '🎵', color: '#c07ad8',
      desc: 'The dead pause to listen. Enemies near you are slowed 25%.', fx: { aura: 'slow' } },
    { id: 'r_fleece', name: 'Golden Fleece', icon: '🐏', color: '#f0cf5e',
      desc: 'Riches restore you. Collecting obols heals 1 HP each.', fx: { obolHeal: 1 } },
    { id: 'r_sandal', name: 'Winged Sandal', icon: '🪽', color: '#8fe3c8',
      desc: 'Hermes\' gift. +14% move speed and +1 dash charge.', fx: { moveMul: 0.14, dashCharge: 1 } },
    { id: 'r_apple', name: 'Apple of Discord', icon: '🍎', color: '#f08bb4',
      desc: 'To the fairest. Foes have a 12% chance on hit to be CHARMED.', fx: { charm: 0.12 } },
    { id: 'r_aegis', name: 'Aegis Fragment', icon: '🛡', color: '#8fb8ff',
      desc: 'A shard of the goat-hide shield. Begin each chamber with 30 shield.', fx: { shieldOnRoom: 30 } },
    { id: 'r_pom', name: 'Pomegranate Seed', icon: '🍎', color: '#c0392b',
      desc: 'Six months above, six below. Heal 12% of max life each chamber.', fx: { healRoom: 0.12 } },
    { id: 'r_key', name: 'Key of Hades', icon: '🗝', color: '#9a7ad8',
      desc: 'The House opens. One extra boon choice from every god.', fx: { extraReward: 1 } },
    { id: 'r_hammer', name: 'Cyclops\' Hammer', icon: '🔨', color: '#f0a04a',
      desc: 'Heavy and certain: +28% attack damage, -6% attack speed.', fx: { dmgMul: 0.28, attSpd: -0.06 } },
    { id: 'r_fang', name: 'Fang of Cerberus', icon: '🐕', color: '#8b6f4e',
      desc: 'The hound\'s tooth. 20% chance on kill to raise a spectral hound.', fx: { raiseOnKill: 0.2 } },
    { id: 'r_mirror', name: 'Mirror Shard', icon: '🪞', color: '#63c9b4',
      desc: 'Nyx\'s glass. Reflect 20% of damage taken back at the attacker.', fx: { reflect: 0.2 } },
    { id: 'r_torch', name: 'Torch of Hecate', icon: '🔥', color: '#f0a04a',
      desc: 'Crossroads light. Your attacks BURN (10/s for 3s).', fx: { burnOnHit: { dps: 10, dur: 3 } } },
    { id: 'r_dice', name: 'Loaded Dice', icon: '🎲', color: '#e0b355',
      desc: 'Tyche favours the bold: +30% critical chance.', fx: { crit: 0.30 } },
    { id: 'r_wreath', name: 'Laurel Wreath', icon: '🌿', color: '#9be07a',
      desc: 'Victory suits you. +1 Death Defiance.', fx: { deathDefy: 1 } },
    { id: 'r_anvil', name: 'Anvil of the Smith', icon: '⚒', color: '#e2564a',
      desc: 'Wrath recharges 25% faster and strikes 25% harder.', fx: { specialCd: -0.25, specialMul: 0.25 } },
    { id: 'r_ambrosia', name: 'Ambrosia', icon: '🏺', color: '#f0cf5e',
      desc: 'The food of gods, stolen. +40 maximum life.', fx: { maxHp: 40 } }
  ];

  /* ---------------- The Mirror of Nyx (permanent progression) ---------------- */
  const META = [
    { id: 'm_tough',   name: 'Toughness',      icon: '❤', max: 5, cost: 40,  step: 40,
      desc: '+8 maximum life per rank.', fx: { maxHp: 8 } },
    { id: 'm_power',   name: 'Striking Power', icon: '🗡', max: 5, cost: 45,  step: 45,
      desc: '+4% attack damage per rank.', fx: { dmgMul: 0.04 } },
    { id: 'm_swift',   name: 'Swiftness',      icon: '🪽', max: 3, cost: 55,  step: 55,
      desc: '+3% move speed per rank.', fx: { moveMul: 0.03 } },
    { id: 'm_edge',    name: 'Sharpened Edge', icon: '🏹', max: 4, cost: 60,  step: 60,
      desc: '+2.5% critical chance per rank.', fx: { crit: 0.025 } },
    { id: 'm_thick',   name: 'Thick Skin',     icon: '🛡', max: 3, cost: 70,  step: 70,
      desc: '+2 flat armour per rank.', fx: { armor: 2 } },
    { id: 'm_charm',   name: 'Gods\' Charm',   icon: '✨', max: 4, cost: 75,  step: 75,
      desc: 'Rarer boons are more likely. +6% rarity weight per rank.', fx: { rareChance: 0.06 } },
    { id: 'm_wealth',  name: 'Greed',          icon: '◉', max: 5, cost: 40,  step: 40,
      desc: '+8% obols per rank.', fx: { obolMul: 0.08 } },
    { id: 'm_dash',    name: 'Windfoot',       icon: '💨', max: 2, cost: 130, step: 130,
      desc: '+1 dash charge per rank.', fx: { dashCharge: 1 } },
    { id: 'm_wrath',   name: 'Wrathful',       icon: '🔥', max: 4, cost: 55,  step: 55,
      desc: '+8% Wrath damage per rank.', fx: { specialMul: 0.08 } },
    { id: 'm_mercy',   name: 'Death\'s Mercy', icon: '💀', max: 3, cost: 160, step: 160,
      desc: '+1 Death Defiance per rank.', fx: { deathDefy: 1 } },
    { id: 'm_insight', name: 'Insight',        icon: '👁', max: 2, cost: 120, step: 120,
      desc: '+1 reroll per rank and one more boon choice.', fx: { rerollPlus: 1, extraReward: 1 } },
    { id: 'm_tithe',   name: 'Tithe of the Dead', icon: '⚱', max: 3, cost: 90, step: 90,
      desc: 'Heal 4% of max life when you clear a chamber.', fx: { healRoom: 0.04 } },
    { id: 'm_bargain', name: 'Chthonic Bargain', icon: '🏺', max: 3, cost: 65, step: 65,
      desc: 'Charon\'s prices drop 8% per rank. +3% attack speed.', fx: { freeShop: 0.08, attSpd: 0.03 } },
    { id: 'm_fury',    name: 'Fury',           icon: '⚡', max: 3, cost: 85, step: 85,
      desc: 'Attacks come 6% faster per rank.', fx: { attSpd: 0.06 } },
    { id: 'm_styx',    name: 'Styx-Touched',   icon: '🌊', max: 2, cost: 140, step: 140,
      desc: 'Begin each chamber with 15 shield per rank.', fx: { shieldOnRoom: 15 } },
    { id: 'm_fate',    name: 'Fated',          icon: '🧵', max: 1, cost: 300, step: 300,
      desc: 'The Fates favour you: begin every run with a random Relic.', fx: { startRelic: 1 } }
  ];

  /* ---------------- Regions ---------------- */
  const REGIONS = [
    {
      id: 'tartarus', name: 'TARTARUS', sub: 'The Pit Beneath the Pit',
      track: 0,
      sky: ['#160a0c', '#2a1010'], floor: '#180d0d', floor2: '#1f1010',
      wall: '#3a1a18', accent: '#c8422f', fog: 'rgba(60,10,8,0.36)',
      music: 1,
      desc: 'Chains run down into a dark that has no floor. Something enormous is breathing.',
      enemies: ['shade', 'hoplite', 'harpy', 'bloodling'],
      elites: ['gorgon', 'hound'],
      boss: 'lion'
    },
    {
      id: 'asphodel', name: 'ASPHODEL', sub: 'The Meadows of the Unmourned',
      track: 1,
      sky: ['#08161a', '#0f2a2c'], floor: '#0b1a1c', floor2: '#102325',
      wall: '#1d3b3d', accent: '#63c9b4', fog: 'rgba(20,70,60,0.30)',
      music: 2,
      desc: 'Pale flowers on black water. The dead who were never buried drift here, resentful.',
      enemies: ['naiad', 'satyr', 'harpy', 'soul'],
      elites: ['gorgon', 'centaur', 'hound'],
      boss: 'medusa'
    },
    {
      id: 'forge', name: 'THE BRONZE FORGE', sub: 'Workshop of the Smith',
      track: 2,
      sky: ['#1a0d05', '#33170a'], floor: '#1d1008', floor2: '#251409',
      wall: '#4a2a12', accent: '#f0a04a', fog: 'rgba(120,60,10,0.32)',
      music: 3,
      desc: 'The Cyclopes hammer without rest. The heat here has a taste, and the taste is iron.',
      enemies: ['automaton', 'cyclops', 'hound', 'shade'],
      elites: ['minotaur', 'telkhine', 'cyclops'],
      boss: 'hydra'
    },
    {
      id: 'olympus', name: 'THE SUMMIT', sub: 'Where the Gods Keep Watch',
      track: 3,
      sky: ['#0a0c1e', '#1c1b3a'], floor: '#12142c', floor2: '#191a38',
      wall: '#2e2f5e', accent: '#e0b355', fog: 'rgba(90,80,180,0.28)',
      music: 4,
      desc: 'Marble that has never known weather. Beyond the clouds, the Titans strain at their chains.',
      enemies: ['fury', 'shade', 'soul', 'automaton'],
      elites: ['minotaur', 'gorgon', 'telkhine'],
      boss: 'typhon'
    }
  ];

  /* ---------------- Bestiary ----------------
     tier: base region index (stats scale with depth)
     score: 1 fragile .. 5 miniboss                       */
  const ENEMIES = {
    /* ---- fodder ---- */
    shade: {
      id: 'shade', name: 'Shade', tier: 0, score: 1, icon: '👻',
      hp: 20, spd: 96, dmg: 6, radius: 12, color: '#8fa8c8', shape: 'wisp', ai: 'lunge',
      desc: 'A soul that refused the ferryman. It has forgotten everything but the wish to be alive.',
      ai_opts: { lungeRange: 90, lungeCd: 1.5, telegraph: 0.42 }
    },
    hoplite: {
      id: 'hoplite', name: 'Skeleton Hoplite', tier: 0, score: 2, icon: '🦴',
      hp: 44, spd: 70, dmg: 10, radius: 15, color: '#ddd2b4', shape: 'humanoid', ai: 'charger',
      desc: 'Buried with his shield, so he keeps using it. The spear is bone too.',
      ai_opts: { chargeSpeed: 300, chargeRange: 210, chargeCd: 2.6, telegraph: 0.6, windup: 0.5, chargeTime: 0.32 }
    },
    harpy: {
      id: 'harpy', name: 'Harpy', tier: 0, score: 2, icon: '🪶',
      hp: 30, spd: 128, dmg: 9, radius: 14, color: '#c9a06a', shape: 'harpy', ai: 'dive',
      desc: 'Wind-spirits with a woman\'s face and a vulture\'s patience. They steal food, then eyes.',
      ai_opts: { orbit: 170, diveCd: 2.4, telegraph: 0.45, diveSpeed: 430 }
    },
    bloodling: {
      id: 'bloodling', name: 'Bloodling', tier: 0, score: 1, icon: '🩸',
      hp: 22, spd: 112, dmg: 8, radius: 11, color: '#c0392b', shape: 'blob', ai: 'lurcher',
      desc: 'Born from a drop of ichor that touched the ground. It wants more.',
      ai_opts: { hopCd: 0.85, hopDist: 120, telegraph: 0.3 }
    },
    hound: {
      id: 'hound', name: 'Cerberus Whelp', tier: 0, score: 3, icon: '🐕',
      hp: 78, spd: 148, dmg: 15, radius: 19, color: '#6b4a2a', shape: 'hound', ai: 'charger',
      desc: 'A pup of the gate-hound. Three heads, none of them friendly.',
      ai_opts: { chargeSpeed: 470, chargeRange: 260, chargeCd: 1.9, telegraph: 0.42, windup: 0.34, chargeTime: 0.26 }
    },
    soul: {
      id: 'soul', name: 'Wailing Soul', tier: 1, score: 2, icon: '💠',
      hp: 46, spd: 76, dmg: 11, radius: 15, color: '#7fd8d0', shape: 'wisp', ai: 'shooter',
      desc: 'It cannot stop screaming, and the scream has edges.',
      ai_opts: { proj: 'wail', projCd: 2.1, burst: 3, spread: 0.34, projSpeed: 210, range: 420 }
    },
    naiad: {
      id: 'naiad', name: 'Marsh Naiad', tier: 1, score: 2, icon: '💧',
      hp: 52, spd: 84, dmg: 12, radius: 16, color: '#5fd0d8', shape: 'naiad', ai: 'shooter',
      desc: 'A water-nymph of the black marshes. She has drowned so many she has a technique.',
      ai_opts: { proj: 'water', projCd: 1.8, burst: 2, spread: 0.5, projSpeed: 250, range: 400 }
    },
    satyr: {
      id: 'satyr', name: 'Satyr', tier: 1, score: 2, icon: '🐐',
      hp: 58, spd: 132, dmg: 14, radius: 16, color: '#a8763e', shape: 'satyr', ai: 'skirmish',
      desc: 'Dionysus\' retinue, gone feral. It plays the pipes while it circles you.',
      ai_opts: { orbit: 130, burstCd: 2.0, burst: 2, spread: 0.22, projSpeed: 340, range: 360 }
    },
    centaur: {
      id: 'centaur', name: 'Centaur Raider', tier: 1, score: 3, icon: '🏹',
      hp: 96, spd: 120, dmg: 16, radius: 22, color: '#b8874a', shape: 'centaur', ai: 'kiter',
      desc: 'Horse and rider in one quarrelsome body. He gallops, turns, and shoots behind him.',
      ai_opts: { keepAway: 240, gallopCd: 3.0, burst: 3, spread: 0.16, projSpeed: 400, range: 480 }
    },
    gorgon: {
      id: 'gorgon', name: 'Gorgon', tier: 1, score: 4, icon: '🐍',
      hp: 150, spd: 54, dmg: 18, radius: 21, color: '#6fae72', shape: 'gorgon', ai: 'petrifier',
      desc: 'Snake-haired, and her gaze turns flesh to limestone. Do not meet her eyes. Dash behind her.',
      ai_opts: { gazeCd: 3.0, gazeWind: 1.0, gazeDur: 1.4, gazeArc: 0.55, gazeRange: 360, petrifyDur: 1.1 }
    },
    minotaur: {
      id: 'minotaur', name: 'Minotaur', tier: 2, score: 4, icon: '🐂',
      hp: 210, spd: 88, dmg: 24, radius: 27, color: '#8a5a30', shape: 'minotaur', ai: 'brute',
      desc: 'Asterion, the bull of Minos, lost without his labyrinth. He charges in straight, honest lines.',
      ai_opts: { chargeSpeed: 520, chargeRange: 320, chargeCd: 2.4, telegraph: 0.62, windup: 0.6, chargeTime: 0.62, slamRange: 130, slamCd: 4.2 }
    },
    cyclops: {
      id: 'cyclops', name: 'Cyclops Smith', tier: 2, score: 4, icon: '👁',
      hp: 230, spd: 58, dmg: 26, radius: 30, color: '#c8996a', shape: 'cyclops', ai: 'brute',
      desc: 'One eye, one hammer, no patience. He throws what he is holding, then picks up something else.',
      ai_opts: { throwCd: 2.2, proj: 'boulder', projSpeed: 300, slamRange: 150, slamCd: 3.6, chargeSpeed: 380, chargeRange: 240, telegraph: 0.6, windup: 0.55, chargeTime: 0.4 }
    },
    automaton: {
      id: 'automaton', name: 'Bronze Automaton', tier: 2, score: 3, icon: '⚙',
      hp: 130, spd: 66, dmg: 20, radius: 20, color: '#d08b40', shape: 'automaton', ai: 'shielder',
      desc: 'Talos\' lesser kin, forged by the Smith. Its shield turns arrows; its joints hate stairs.',
      ai_opts: { shieldArc: 1.5, bashCd: 2.6, bashRange: 96, block: 0.62 }
    },
    telkhine: {
      id: 'telkhine', name: 'Telkhine', tier: 2, score: 3, icon: '🔧',
      hp: 120, spd: 108, dmg: 19, radius: 18, color: '#7fd8c0', shape: 'telkhine', ai: 'summoner',
      desc: 'Flipper-handed smiths of Rhodes, who forged Poseidon\'s trident and resent everyone.',
      ai_opts: { summonCd: 4.5, summonType: 'automaton', summonCount: 1, shootCd: 2.0, proj: 'spark', projSpeed: 320 }
    },
    fury: {
      id: 'fury', name: 'Fury', tier: 3, score: 4, icon: '🩸',
      hp: 160, spd: 140, dmg: 22, radius: 19, color: '#a8231f', shape: 'fury', ai: 'fury',
      desc: 'Alecto, Tisiphone, Megaera — whatever name she wears, she has come to collect a debt.',
      ai_opts: { whipCd: 1.5, lashRange: 180, teleportCd: 3.4, rageCd: 6.0, diveCd: 2.0, diveSpeed: 480, telegraph: 0.36 }
    },
    styxling: {
      id: 'styxling', name: 'Styxling', tier: 3, score: 3, icon: '🌊',
      hp: 120, spd: 118, dmg: 20, radius: 16, color: '#4a8fa8', shape: 'blob', ai: 'exploder',
      desc: 'A clot of the death-river given locomotion. It has one ambition.',
      ai_opts: { fuseRange: 54, fuse: 0.75 }
    },
    empusa: {
      id: 'empusa', name: 'Empusa', tier: 3, score: 3, icon: '🦇',
      hp: 105, spd: 138, dmg: 17, radius: 16, color: '#c46a9a', shape: 'empusa', ai: 'dive',
      desc: 'Hecate\'s attendant, one leg bronze and one leg a donkey\'s. She drinks blood through the heel.',
      ai_opts: { orbit: 140, diveCd: 1.9, telegraph: 0.4, diveSpeed: 520 }
    },
    cyclops_elder: {
      id: 'cyclops_elder', name: 'Elder Cyclops', tier: 3, score: 5, icon: '👁',
      hp: 340, spd: 54, dmg: 32, radius: 34, color: '#b07a4a', shape: 'cyclops', ai: 'brute',
      desc: 'One of the three who forged the thunderbolt. He remembers making the thing that will kill you.',
      ai_opts: { throwCd: 1.7, proj: 'boulder', projSpeed: 340, slamRange: 170, slamCd: 3.2, chargeSpeed: 420, chargeRange: 280, telegraph: 0.5, windup: 0.5, chargeTime: 0.4 }
    },
    hecaton: {
      id: 'hecaton', name: 'Hecatoncheir', tier: 3, score: 5, icon: '✋',
      hp: 380, spd: 62, dmg: 30, radius: 32, color: '#d8c9a0', shape: 'hecaton', ai: 'hundred',
      desc: 'One of the Hundred-Handed. Each arm is a separate opinion, and all of them are violent.',
      ai_opts: { sweepCd: 2.4, sweepArc: 1.3, sweepRange: 150, volleyCd: 2.2, burst: 4, spread: 0.9, projSpeed: 300 }
    },
    lamia: {
      id: 'lamia', name: 'Lamia', tier: 3, score: 4, icon: '🐍',
      hp: 150, spd: 96, dmg: 21, radius: 18, color: '#9a5ac0', shape: 'lamia', ai: 'shooter',
      desc: 'A queen who lost her children and now borrows other people\'s. Her eyes never blink.',
      ai_opts: { proj: 'hex', projCd: 1.6, burst: 3, spread: 0.42, projSpeed: 260, range: 430, homingProj: 0.5 }
    },
    gigas: {
      id: 'gigas', name: 'Gigas', tier: 3, score: 5, icon: '🪨',
      hp: 400, spd: 70, dmg: 34, radius: 36, color: '#6a6a86', shape: 'gigas', ai: 'brute',
      desc: 'Born of Gaia\'s blood where the gods beat the Titans. Serpent-legged, and it holds a grudge.',
      ai_opts: { slamRange: 190, slamCd: 2.8, chargeSpeed: 460, chargeRange: 300, telegraph: 0.55, windup: 0.55, chargeTime: 0.5, throwCd: 4.0, proj: 'rock', projSpeed: 280 }
    },
    typhon_spawn: {
      id: 'typhon_spawn', name: 'Typhon-Spawn', tier: 3, score: 4, icon: '🔥',
      hp: 190, spd: 100, dmg: 24, radius: 22, color: '#e2564a', shape: 'spawn', ai: 'shooter',
      desc: 'A scrap of the storm-monster\'s hide, still trying to become the whole thing.',
      ai_opts: { proj: 'fireball', projCd: 1.5, burst: 2, spread: 0.3, projSpeed: 280, range: 460, homingProj: 0.3 }
    },
    eidolon: {
      id: 'eidolon', name: 'Eidolon of a Hero', tier: 2, score: 4, icon: '⚔',
      hp: 175, spd: 116, dmg: 23, radius: 20, color: '#cfd6e2', shape: 'hero', ai: 'duelist',
      desc: 'A hero\'s shade that still remembers its footwork. It parries, ripostes, and bows afterwards.',
      ai_opts: { combo: 3, comboRange: 100, lungeCd: 1.4, lungeSpeed: 500, parry: 0.25, telegraph: 0.4 }
    },
    erinyes_maiden: {
      id: 'erinyes_maiden', name: 'Erinyes Maiden', tier: 3, score: 3, icon: '🐍',
      hp: 110, spd: 120, dmg: 18, radius: 16, color: '#7a3a6a', shape: 'fury', ai: 'shooter',
      desc: 'Young enough to still ask why. Old enough to have already decided.',
      ai_opts: { proj: 'curse', projCd: 1.9, burst: 3, spread: 0.5, projSpeed: 240, range: 400, homingProj: 0.6 }
    },
    /* --- summon-only --- */
    spectral_hound: {
      id: 'spectral_hound', name: 'Spectral Hound', tier: 0, score: 1, icon: '🐕', summon: true,
      hp: 40, spd: 200, dmg: 12, radius: 15, color: '#8fb8ff', shape: 'hound', ai: 'charger', ally: true,
      ai_opts: { chargeSpeed: 520, chargeRange: 300, chargeCd: 1.2, telegraph: 0.2, windup: 0.18, chargeTime: 0.2 }
    },
    spectral_soldier: {
      id: 'spectral_soldier', name: 'Spectral Soldier', tier: 0, score: 1, icon: '⚔', summon: true,
      hp: 50, spd: 130, dmg: 11, radius: 15, color: '#a8d8ff', shape: 'humanoid', ai: 'charger', ally: true,
      ai_opts: { chargeSpeed: 340, chargeRange: 240, chargeCd: 1.5, telegraph: 0.24, windup: 0.24, chargeTime: 0.24 }
    }
  };

  /* region-specific stat scaling: later regions hit harder, but the player
     also gets stronger via boons. applied in game.js */
  const TIER_SCALE = [
    { hp: 1.00, dmg: 1.00, spd: 1.00, obols: 1.00 },
    { hp: 1.55, dmg: 1.35, spd: 1.04, obols: 1.35 },
    { hp: 2.30, dmg: 1.75, spd: 1.06, obols: 1.7 },
    { hp: 3.20, dmg: 2.20, spd: 1.09, obols: 2.1 }
  ];

  /* ---------------- Bosses ---------------- */
  const BOSSES = {
    lion: {
      id: 'lion', name: 'THE NEMEAN LION', title: 'The Hide That No Blade Bites',
      hp: 900, radius: 40, color: '#c9a24a', shape: 'lion', music: 1,
      desc: 'Herakles strangled it. You are not Herakles. Its golden hide turns steel — strike only when it is winded.',
      intro: 'A roar rolls through Tartarus like a rockslide.',
      phases: [
        { at: 1.00, name: 'THE HUNT' },
        { at: 0.55, name: 'THE FURY', sub: 'It is no longer playing.' },
        { at: 0.22, name: 'THE LAST BREATH', sub: 'Wounded things are the most dangerous things.' }
      ],
      ai: 'lion'
    },
    medusa: {
      id: 'medusa', name: 'MEDUSA', title: 'The Gorgon of the Black Marsh',
      hp: 1250, radius: 38, color: '#6fae72', shape: 'gorgon_boss', music: 2,
      desc: 'Do not look at her. Her gaze turns the living into garden statuary — turn your back and run.',
      intro: 'Every snake on her head turns to look at you at once.',
      phases: [
        { at: 1.00, name: 'THE GAZE' },
        { at: 0.60, name: 'THE NEST', sub: 'The snakes are detaching.' },
        { at: 0.25, name: 'STONE AND BLOOD', sub: 'She has stopped being careful.' }
      ],
      ai: 'medusa'
    },
    hydra: {
      id: 'hydra', name: 'THE LERNAEAN HYDRA', title: 'Cut One Head, Two Rise',
      hp: 1650, radius: 46, color: '#5aa860', shape: 'hydra', music: 3,
      desc: 'It has nine heads and no interest in fairness. Fire, not steel, is the answer — but you brought steel.',
      intro: 'Nine throats open in the dark, all of them hissing.',
      phases: [
        { at: 1.00, name: 'NINE HEADS' },
        { at: 0.62, name: 'THE REGROWTH', sub: 'It is getting faster.' },
        { at: 0.28, name: 'THE VENOM HEART', sub: 'The poison in its blood could kill a god.' }
      ],
      ai: 'hydra'
    },
    typhon: {
      id: 'typhon', name: 'TYPHON', title: 'The Last Son of Gaia',
      hp: 2600, radius: 52, color: '#e2564a', shape: 'typhon', music: 4,
      desc: 'A hundred dragon heads, a storm where a body should be. He fought Zeus and very nearly won.',
      intro: 'The summit goes dark. Something the size of a mountain unfolds.',
      phases: [
        { at: 1.00, name: 'THE STORM MADE FLESH' },
        { at: 0.68, name: 'THE HUNDRED HEADS', sub: 'All of them speaking at once.' },
        { at: 0.35, name: 'GAIA\'S LAST CHILD', sub: 'He is no longer holding back.' },
        { at: 0.12, name: 'THE FALLING SKY', sub: 'Everything he has left.' }
      ],
      ai: 'typhon'
    }
  };

  /* ---------------- Weapon (single, upgradeable via boons) ---------------- */
  const WEAPONS = {
    xiphos: {
      id: 'xiphos', name: 'Xiphos of the Exile',
      desc: 'A short bronze leaf-blade, taken from a soldier who no longer needed it.',
      dmg: 14, atkCd: 0.34, reach: 66, arc: 1.15, combo: 3
    }
  };

  /* ---------------- Charon's shop stock ---------------- */
  const SHOP_ITEMS = [
    { id: 's_heal',  name: 'Nectar of the Gods', icon: '🏺', cost: 45, desc: 'Restore 35 life.', kind: 'heal', value: 35 },
    { id: 's_heal2', name: 'Pomegranate',        icon: '🍎', cost: 80, desc: 'Restore 70 life.', kind: 'heal', value: 70 },
    { id: 's_maxhp', name: 'Ambrosia Draught',   icon: '✨', cost: 120, desc: '+25 maximum life.', kind: 'maxhp', value: 25 },
    { id: 's_dmg',   name: 'Whetstone of Ares',  icon: '🗡', cost: 110, desc: '+8% attack damage for the run.', kind: 'stat', fx: { dmgMul: 0.08 } },
    { id: 's_spd',   name: 'Feather of Hermes',  icon: '🪽', cost: 90, desc: '+8% move speed for the run.', kind: 'stat', fx: { moveMul: 0.08 } },
    { id: 's_crit',  name: 'Eyes of the Fates',  icon: '👁', cost: 100, desc: '+6% critical chance for the run.', kind: 'stat', fx: { crit: 0.06 } },
    { id: 's_armor', name: 'Bronze Fitting',     icon: '🛡', cost: 95, desc: '+3 armour for the run.', kind: 'stat', fx: { armor: 3 } },
    { id: 's_dd',    name: 'Blood of the Hydra', icon: '💀', cost: 220, desc: '+1 Death Defiance.', kind: 'stat', fx: { deathDefy: 1 } },
    { id: 's_rarity',name: 'Incense of Apollo',  icon: '🔥', cost: 85, desc: 'Better boon rarities for the rest of the run.', kind: 'stat', fx: { rareChance: 0.12 } },
    { id: 's_obol',  name: 'Purse of Plutus',    icon: '◉', cost: 70, desc: '+25% obols for the rest of the run.', kind: 'stat', fx: { obolMul: 0.25 } },
    { id: 's_relic', name: 'Sealed Amphora',     icon: '🏺', cost: 150, desc: 'A random Relic.', kind: 'relic' },
    { id: 's_pom',   name: 'Pom of Power',       icon: '🍇', cost: 100, desc: 'Upgrade a random boon by one rarity.', kind: 'pom' }
  ];

  K.DATA = {
    GODS, RARITY, BOONS, SPECIAL_BOONS, RELICS, META, REGIONS, ENEMIES, BOSSES,
    TIER_SCALE, WEAPONS, SHOP_ITEMS,
    boonById: {},
    relicById: {},
    metaById: {}
  };
  BOONS.concat(SPECIAL_BOONS).forEach(b => { if (!b.rarity) b.rarity = 'common'; K.DATA.boonById[b.id] = b; });
  RELICS.forEach(r => { K.DATA.relicById[r.id] = r; });
  META.forEach(m => { K.DATA.metaById[m.id] = m; });

})();
