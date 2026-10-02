/* ============================================================
   KATABASIS — game.js
   The run director: regions and chambers, the boon economy,
   the stat compiler, damage resolution, and every god effect.
   ============================================================ */
(function () {
  'use strict';
  const K = window.K;
  const U = K.U;
  const D = K.DATA;
  const E = K.E;
  const TAU = U.TAU;
  const BASE = { hp: 100, dmg: 15, speed: 268, atkCd: 0.34, dashRegen: 1.4 };
  const LORE = {
    names: ['Akteon','Bia','Damon','Eudora','Ianthe','Kallias','Lykon','Melia','Niko','Phaedra','Theron','Xanthe','Zale','Thalia','Kyros','Myrrine','Dione','Orion','Soter','Aella','Kleon','Eris','Myrto','Leandros'],
    roles: ['potter','ferryman','royal courier','midwife','bronze-smith','vine tender','temple singer','shepherd','scribe','shipwright','olive farmer','shield-bearer','physician','weaver','horse trainer','keeper of a roadside shrine'],
    memories: ['a cracked cup saved for a brother who never returned','the smell of rain on the family courtyard','a wedding song that ended before the final verse','a small dog that waited beside the door each dusk','the first laurel wreath ever placed in their hands','a debt of bread owed to a stranger','a blue cloak left on a harbor wall','the name of a child lost to the winter fever','a bronze coin kept for the journey home','a promise made beneath an eclipse','the sound of waves against a familiar pier','a pomegranate seed pressed into a palm'],
    motives: ['a promise the gods left unfinished','the hope of being remembered by the living','a debt owed to the House of Hades','the wish to see one familiar face again','a command carved into an old tomb','the stubborn belief that fate can be argued with','the hunger to guard a home that no longer stands','a bargain whose price was never explained'],
    epithets: ['the Unquiet','Ash-Bound','the Unsworn','of the Last Ferry','the Oath-Keeper','the Unforgotten','the Red Wake','of the Broken Laurel','the Long Pursuit','the Twice-Fallen'],
    fates: ['The Styx keeps the name, even when the shore forgets it.','Their last breath becomes a rumor among the shades.','The old memory returns to them at the very end.','A quiet place opens in the dark, and the shade is gone.','The river takes the armor; the name travels farther.','For one heartbeat, the dead remember being alive.','Their oath loosens, at last, and falls silent.','The ferry carries one less shadow into the night.'],
    adaptations: {
      veil_hunter: { title:'Veil Hunter', desc:'learned to pursue the line of your ranged attacks', hp:1.12, dmg:1.08, spd:1.2 },
      oathbreaker: { title:'Oathbreaker', desc:'hardened against the blows that felled them', hp:1.38, dmg:1.12, spd:1.02 },
      grave_ward: { title:'Grave-Ward', desc:'learned to withstand lingering curses and ground magic', hp:1.25, dmg:1.04, spd:1.08 }
    }
  };

  /* entities.js owns the particle vocabulary; re-export it into this scope */
  const hitFx = (g, x, y, color, n, pow) => E.hitFx(g, x, y, color, n, pow);
  const ringFx = (g, x, y, r, color, n) => E.ringFx(g, x, y, r, color, n);

  /* ============================================================
     RUN — everything that dies with you
     ============================================================ */
  function Run(seed) {
    this.seed = seed >>> 0;
    this.ordinal = (K.Save.data.runs || 0) + 1;
    this.enemySerial = 0;
    this.rng = new K.RNG(this.seed);
    this.regionIndex = 0;
    this.chamberIndex = 0;
    this.heroId = K.Save.data.selectedHero || 'perseus';
    this.weapon = K.Save.data.weapon || 'xiphos';
    this.augmentIds = [];
    this.fatedThreadIds = [];
    this.heroUpgrades = [];
    this.weaponUpgrades = [];
    this.weaponLevel = 0;
    this.quest = null;
    this.activeSynergies = [];
    this.boons = [];            // {id, rarity, level}
    this.routePath = [];
    this.relics = [];           // relic ids
    this.gods = {};             // godId -> count of boons
    this.obols = 0;
    this.obolsEarned = 0;
    this.rerolls = 1;
    this.shopBuys = 0;
    this.deathDefy = 0;
    this.deathDefyMax = 0;
    this.deathDefySpent = 0;
    this.stats = {
      kills: 0, elites: 0, bosses: 0, dmgDealt: 0, dmgTaken: 0,
      time: 0, chambers: 0, deepest: 0, healing: 0, calls: 0, rooms: {}, damageBySource: {}
    };
    this.boonLevels = {};       // id -> level
    this.log = [];
    this.killChronicle = [];
    this.lastDamager = null;
    this.nemesisRecorded = false;
    this.nemesisSpawned = false;
    this.storyFavor = {};
    this.godFavor = {};
    this.godFavorHistory = [];
    this.divineVisits = [];
    this.storyChoices = [];
    this.storyChapters = [];
    this.storyAlignment = { concord:0, defiance:0 };
    this.campaignEnding = null;
    this.hermesBoost = 0;
    this.trialPacts = {};
    this.trialScore = 0;
    this.trialModifiers = null;
    this.isFatedTrial = false;
    this.trialResult = null;
  }
  Run.prototype.godCount = function (g) { return this.gods[g] || 0; };
  Run.prototype.hasBoon = function (id) { return this.boonLevels[id] !== undefined; };
  Run.prototype.addBoon = function (id, rarity) {
    const b = D.boonById[id];
    if (!b) return;
    rarity = D.RARITY[rarity] ? rarity : (b.rarity || 'common');
    if (b.rarity === 'duo' || b.rarity === 'legendary') rarity = b.rarity;
    const cur = this.boonLevels[id];
    if (cur !== undefined) {
      const rk = ['common', 'rare', 'epic', 'heroic'];
      const next = cur === 'duo' || cur === 'legendary' ? cur :
        rk[Math.min(rk.length - 1, Math.max(rk.indexOf(cur) + 1, rk.indexOf(rarity)))];
      this.boonLevels[id] = next;
      const entry = this.boons.find(x => x.id === id);
      if (entry) entry.rarity = next;
    } else {
      this.boonLevels[id] = rarity;
      this.boons.push({ id, rarity, god: b.god, slot: b.slot });
      this.gods[b.god] = (this.gods[b.god] || 0) + 1;
    }
    this.recalc = true;
    K.Save.data.seenBoons[id] = 1;
    if (!K.Save.data.seenGods[b.god]) { K.Save.data.seenGods[b.god] = 1; }
    K.Save.write();
  };
  Run.prototype.boonRarity = function (id) { return this.boonLevels[id] || 'common'; };
  Run.prototype.addRelic = function (id) {
    if (this.relics.indexOf(id) >= 0) return false;
    this.relics.push(id);
    this.recalc = true;
    K.Save.data.seenRelics[id] = 1;
    K.Save.write();
    return true;
  };
  Run.prototype.addObols = function (n) {
    n = Math.round(num(n) * this.stat('obolMul'));
    this.obols += n;
    this.obolsEarned += n;
    return n;
  };
  /* Rough single-stat read, safe before the first full compile. Multiplier
     stats default to 1, everything else to 0, and never to NaN. */
  Run.prototype.stat = function (k) {
    const v = this._statsCache ? this._statsCache[k] : undefined;
    if (typeof v === 'number' && isFinite(v)) return v;
    return (k === 'obolMul' || k === 'moveMul' || k === 'dmgMul') ? 1 : 0;
  };

  /* ============================================================
     Compile every boon + relic into one flat stat block
     ============================================================ */
  const EPS = 1e-9;

  /* every combiner ignores non-numeric input: a stray undefined in a data
     table must never turn a stat into NaN. */
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }
  function mul(s, key, v) { v = num(v); if (!v) return; s[key] = (typeof s[key] === 'number' ? s[key] : 1) * (1 + v); }
  // Projectile consumers add one to this fractional bonus, so retain only the
  // bonus here while multiplying contributions from independent sources.
  function mulBonus(s, key, v) { v = num(v); if (!v) return; const current = num(s[key]); s[key] = current + v + current * v; }
  function pct(s, key, v) { mul(s, key, v); }
  function add(s, key, v) { v = num(v); if (!v) return; s[key] = (typeof s[key] === 'number' ? s[key] : 0) + v; }
  function maxk(s, key, v) { v = num(v); if (!v) return; s[key] = Math.max(typeof s[key] === 'number' ? s[key] : 0, v); }
  function minnz(s, key, v) { v = num(v); if (!v) return; s[key] = Math.min(typeof s[key] === 'number' ? s[key] : v, v); }

  const STACK = {
    dmgMul: mul, moveMul: mul, specialMul: mul,
    attSpd: mul, specialCd: (s, key, v) => mul(s, 'specialCdMul', v), specialCdMul: mul,
    projDmg: mulBonus, rangeMul: mul, reachMul: mul, obolMul: mul, dashDist: mul,
    maxShield: add,
    /* the four core abilities: durations multiply, cooldowns multiply */
    guardMul: mul, castMul: mul, rushMul: mul, ascendMul: mul,
    guardCdMul: mul, castCdMul: mul, rushCdMul: mul, ascendCdMul: mul,
    crit: add, critMul: add, lifesteal: add, lowHpDmg: add, furyAtLowHp: add,
    killHeal: add, killShield: add, killStack: add, armor: add, dodge: add,
    reflect: add, dmgReduce: add, deflectProj: add, thorns: add, dashInvuln: add,
    dashDmg: add, dashShield: add, dashCharge: add, knock: add,
    waveDmg: add, waveOnHit: add, waveOnDash: add, shieldOnRoom: add, shieldStart: add,
    healRoom: add, lifeOnEnter: add, maxHp: add, magnet: add, multishot: add,
    homing: add, pierce: add, powerShot: minnz, stagger: add, rootOnHit: add,
    slowOnHit: add, bleedAmp: add, weakMul: add, charm: add, critMark: add,
    poisonTick: add, extraReward: add, rerollPlus: add, freeShop: add,
    deathDefy: add, aegisOnBoss: add, revenge: add, rareChance: add,
    immuneSlow: add, ambush: add, coinOnHit: add, darkBonus: add,
    doubleAttack: add, boltOnHit: add, boltOnKill: add, stormOnRoom: add,
    raiseOnKill: add, harvestOnKill: add, flowersOnKill: add, oldGrudge: add,
    magmaOnKill: add, fogOnKill: add, forgeOnHit: add, atkProjectile: add,
    hammerTime: add, invulnMelee: add, swarm: add, tyrantOnFight: add,
    winterOnHit: add, maxHpMul: mul, callBoost: add, zap: maxk,
    critBurst:add, castFork:add, castNova:add, dashNova:add, dashStrike:add,
    parryNova:add, parryHeal:add, statusDetonate:add, statusSpread:add,
    bossHunter:add, distanceDamage:add, closeDamage:add, killNova:add,
    killHaste:add, shieldDamage:add, guardCast:add, rushNova:add, ascendNova:add
  };

  function compileStats(run, player) {
    const s = {
      maxHp: BASE.hp, maxHpMul: 1, damage: BASE.dmg, dmgMul: 1,
      moveSpeed: BASE.speed, moveMul: 1, attackSpeed: 1, attSpd: 1,
      specialDamage: BASE.dmg * 1.7, specialMul: 1, specialCdMul: 1,
      dashMax: 2, dashRegen: BASE.dashRegen, dashDist: 1,
      crit: 0.05, critMul: 0, armor: 0, dmgReduce: 0, dodge: 0, maxShield: 320,
      reachMul: 1, knock: 1, gods: {}, killStack: 0
    };

    /* ---- permanent Mirror of Nyx ---- */
    D.META.forEach(m => {
      const lv = K.Save.metaLevel(m.id);
      if (lv > 0) applyFx(s, m.fx, lv, run);
    });

    /* ---- persistent Armory and Loom of the Fates ---- */
    if (K.Gear && K.Gear.effects) applyFx(s, K.Gear.effects(K.Save.data), 1, run);
    if (K.Paragon && K.Paragon.effects) applyFx(s, K.Paragon.effects(K.Save.data), 1, run);

    /* ---- relics ---- */
    run.relics.forEach(id => {
      const r = D.relicById[id];
      if (r) applyFx(s, r.fx, 1, run);
    });

    /* ---- boons (rarity scales the numbers) ---- */
    run.boons.forEach(b => {
      const def = D.boonById[b.id];
      if (!def) return;
      applyFx(s, resolveBoonFx(def, b.rarity), 1, run);
      s.gods[def.god] = (s.gods[def.god] || 0) + 1;
    });

    /* ---- chosen hero, run upgrades and build synergies ---- */
    if (K.RunSystems) {
      const hero=K.RunSystems.HEROES[run.heroId]||K.RunSystems.HEROES.perseus;
      applyFx(s,hero.fx,1,run);
      Object.keys(K.RunSystems.HEROES).map(h=>K.RunSystems.HEROES[h].upgrades).flat().forEach(upgrade=>{
        if((run.heroUpgrades||[]).indexOf(upgrade.id)>=0) applyFx(s,upgrade.fx,1,run);
      });
      (run.augmentIds||[]).forEach(id=>{
        const augment=K.RunSystems.AUGMENTS.find(a=>a.id===id);
        if(augment) applyFx(s,augment.fx,1,run);
      });
      run.activeSynergies=K.RunSystems.activeSynergies(run);
      run.activeSynergies.forEach(synergy=>applyFx(s,synergy.fx,1,run));
      applyFx(s, K.RunSystems.fatedThreadEffects(run), 1, run);
      (run.weaponUpgrades||[]).forEach(id=>{const upgrade=K.RunSystems.WEAPON_UPGRADES.find(x=>x.id===id);if(upgrade)applyFx(s,upgrade.fx,1,run);});
    }
    /* ---- run-long shop stat upgrades ---- */
    (run.shopStats || []).forEach(fx => applyFx(s, fx, 1, run));

    /* ---- resolve ---- */
    /* Ascend empowers everything while it burns (a boon can lengthen it) */
    s.ascendMul = s.ascendMul === undefined ? 1 : s.ascendMul;
    s.ascendCdMul = s.ascendCdMul === undefined ? 1 : s.ascendCdMul;
    const ascending = !!(player && player.ascendT > 0);
    if (ascending) { s.dmgMul *= 1.35; s.moveMul *= 1.2; s.attSpd *= 1.25; }
    if (run.hermesBoost > 0) s.moveMul *= 1.75;

    s.deathDefy = Math.max(1, Math.floor(s.deathDefy || 0));
    s.maxHp = Math.max(15, Math.round((s.maxHp) * s.maxHpMul));
    const weapon = D.WEAPONS[run.weapon] || D.WEAPONS.xiphos;
    s.damage = (weapon.dmg || BASE.dmg) * s.dmgMul * (1+(run.weaponLevel||0)*0.12);
    s.moveSpeed = BASE.speed * s.moveMul;
    s.attackSpeed = Math.max(0.25, s.attSpd);
    s.specialCdMul = Math.max(0.25, s.specialCdMul);
    s.specialDamage = BASE.dmg * 1.7 * s.specialMul;
    /* the four core abilities */
    s.guardMul = s.guardMul === undefined ? 1 : s.guardMul;
    s.guardCdMul = s.guardCdMul === undefined ? 1 : s.guardCdMul;
    s.castMul = s.castMul === undefined ? 1 : s.castMul;
    s.castDamage = BASE.dmg * 1.9 * s.castMul * s.dmgMul;
    s.castCdMul = s.castCdMul === undefined ? 1 : s.castCdMul;
    s.rushMul = s.rushMul === undefined ? 1 : s.rushMul;
    s.rushCdMul = s.rushCdMul === undefined ? 1 : s.rushCdMul;
    if (ascending) player.ascendActive = true;
    s.crit = Math.min(0.85, s.crit);
    s.dmgReduce = Math.min(0.75, s.dmgReduce);
    s.dodge = Math.min(0.6, s.dodge);
    s.dashDist = Math.max(0.5, s.dashDist);
    s.dashMax = Math.min(6, 2 + Math.round(s.dashCharge || 0));
    s.dashRegen = Math.max(0.35, BASE.dashRegen - (s.dashCharge || 0) * 0.1);
    s.reachMul = Math.max(0.6, s.reachMul);
    s.callBoost = Math.min(0.4, s.callBoost || 0);
    if (K.BuildPowers) K.BuildPowers.capStats(s);
    return s;
  }

  /* Apply one fx object with a scale factor. */
  function applyFx(s, fx, scale, run) {
    if (!fx) return;
    const sc = scale === undefined ? 1 : scale;
    for (const k in fx) {
      const v = fx[k];
      if (v === undefined || v === null) continue;
      if (k === 'zap') {
        const cur = s.zap;
        if (!cur || v.dmg * sc > cur.dmg) s.zap = { cd: v.cd, dmg: v.dmg * sc };
        continue;
      }
      if (k === 'chain') {
        const n = Math.round(v.n * (sc > 1.3 ? 1 : 1));
        const addDmg = v.dmg * sc;
        if (!s.chain) s.chain = { n: v.n, mul: v.mul, dmg: addDmg };
        else { s.chain.n = Math.max(s.chain.n, v.n) + 1; s.chain.dmg += addDmg; s.chain.mul = Math.max(s.chain.mul, v.mul); }
        continue;
      }
      if (k === 'bleed') { s.bleed = s.bleed ? { dmg: s.bleed.dmg + v.dmg * sc, dur: Math.max(s.bleed.dur, v.dur) } : { dmg: v.dmg * sc, dur: v.dur }; continue; }
      if (k === 'poison') { s.poison = s.poison ? { dps: s.poison.dps + v.dps * sc, dur: Math.max(s.poison.dur, v.dur) } : { dps: v.dps * sc, dur: v.dur }; continue; }
      if (k === 'burnOnHit') { s.burnOnHit = s.burnOnHit ? { dps: s.burnOnHit.dps + v.dps * sc, dur: Math.max(s.burnOnHit.dur, v.dur) } : { dps: v.dps * sc, dur: v.dur }; continue; }
      if (k === 'drownDot') { s.drownDot = s.drownDot ? { dps: s.drownDot.dps + v.dps * sc, dur: Math.max(s.drownDot.dur, v.dur) } : { dps: v.dps * sc, dur: v.dur }; continue; }
      const fn = STACK[k];
      if (fn) { fn(s, k, typeof v === 'number' ? v * sc : v); continue; }
      /* unknown keys: copy once, scaled if numeric */
      if (s[k] === undefined) s[k] = (typeof v === 'number') ? v * sc : v;
    }
  }

  const BOON_BINARY_FX = new Set(['dashTrail','doomOnHit','waveOnHit','waveOnDash','winterOnHit','immuneSlow','hammerTime']);
  const BOON_INTEGER_FX = new Set(['dashCharge','extraReward','rerollPlus','deathDefy','multishot','pierce','castFork']);
  function resolveBoonFx(def, rarity) {
    const fx = def && def.fx || {};
    const fixed = def && (def.rarity === 'duo' || def.rarity === 'legendary');
    const scale = fixed ? 1 : ((D.RARITY[rarity] && D.RARITY[rarity].scale) || 1);
    const nestedScale = { zap:['dmg'], chain:['dmg'], bleed:['dmg'], poison:['dps'], burnOnHit:['dps'], drownDot:['dps'] };
    const resolved = {};
    Object.keys(fx).forEach(key => {
      const value = fx[key];
      if (typeof value === 'number') {
        if (BOON_BINARY_FX.has(key)) resolved[key] = value ? 1 : 0;
        else if (key === 'powerShot') resolved[key] = value > 0 ? Math.max(1, Math.ceil(value / scale)) : value;
        else if (BOON_INTEGER_FX.has(key)) resolved[key] = Math.round(value * scale);
        else if (key === 'callBoost') resolved[key] = Math.min(0.4, value * scale);
        else resolved[key] = value * scale;
      }
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        resolved[key] = {};
        Object.keys(value).forEach(subKey => {
          const scales = (nestedScale[key] || []).indexOf(subKey) >= 0;
          resolved[key][subKey] = typeof value[subKey] === 'number' && scales ? value[subKey] * scale : value[subKey];
        });
      } else if (value !== undefined && value !== null) resolved[key] = value;
    });
    if (K.BuildPowers) K.BuildPowers.capStats(resolved);
    return resolved;
  }

  const RUN_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  /* ============================================================
     GAME
     ============================================================ */
  function Game(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.cam = new K.Camera();
    this.particles = new K.Particles(2400);
    E.G = this;
    E.particles = this.particles;
    E.cam = this.cam;
    this.hazards = [];
    this.pendingSpawns = [];
    this.pendingRouteChoices = [];
    this.pendingStory = null;
    this.activeEvent = null;
    this.pickups = E.pickups;
    this.arena = { x: 0, y: 0, w: 1200, h: 800 };
    this.walls = [];
    this.roomDef = null;
    this.phase = 'idle';
    this.time = 0;
    this.realTime = 0;
    this.hitStop = 0;
    this.timeScale = 1;
    this.slowMo = 0;
    this.run = null;
    this.player = null;
    this.boss = null;
    this.roomClearT = 0;
    this.banner = null;
    this.pendingReward = null;
    this.pendingFatedThreadContinuation = null;
    this.pendingStory = null;
    this.toasts = [];
    this.ambientT = 0;
    this.shopStock = [];
    this.cinematic = null;
    this.cinematicT = 0;
    this.introT = 0;
    this.deathT = 0;
    this.victoryT = 0;
    this.onTransition = null;   // set by main.js to open reward screens
    this.practiceMode = false;
    this.interactables = [];
    this.nearInteract = null;
    this.statsDirty = true;
    this.flash = 0;
    this.flashColor = '#fff';
    this.tutorialStep = 0;
  }

  /* ---------------- run lifecycle ---------------- */
  Game.prototype.startRun = function (seed, options) {
    options = options || {};
    const requestedPractice = !!options.practice;
    if (this.practiceMode && !requestedPractice) return null;
    this.practiceMode = requestedPractice;
    const save = K.Save.data;
    this.cinematic = null; this.timeScale = 1; this.hitStop = 0; this.slowMo = 0; this.hermesBoost = 0;
    this.run = new Run(seed === undefined ? (Math.random() * 0xffffffff) : seed);
    this.run.practice = this.practiceMode;
    const pactSelection = K.RunSystems.normalizePactSelection(this.practiceMode ? {} : options.trialPacts);
    this.run.isFatedTrial = !this.practiceMode && !!save.fatedTrialsUnlocked && pactSelection.score > 0;
    this.run.trialPacts = this.run.isFatedTrial ? pactSelection.ranks : {};
    this.run.trialScore = this.run.isFatedTrial ? pactSelection.score : 0;
    this.run.trialModifiers = K.RunSystems.pactModifiers(this.run.trialPacts);
    this.run.trialResult = null;
    this.run.heroId = this.practiceMode ? (options.heroId || save.selectedHero || 'perseus') : (save.selectedHero || 'perseus');
    if (options.weapon && D.WEAPONS[options.weapon]) this.run.weapon = options.weapon;
    const chosenHero=K.RunSystems.HEROES[this.run.heroId];
    if(chosenHero&&chosenHero.upgrades.some(u=>u.id===save.selectedHeroUpgrade)&&(save.bossKills||0)>=2)this.run.heroUpgrades.push(save.selectedHeroUpgrade);
    if (!this.practiceMode && K.RunSystems) this.run.quest = K.RunSystems.createQuest(this.run.rng);
    this.run.shopStats = [];
    E.enemies.length = 0;
    E.projectiles.length = 0;
    E.effects.length = 0;
    E.pickups.length = 0;
    this.hazards.length = 0;
    this.particles.clear();
    this.boss = null;
    this.cam.shake = 0;
    this.cam.zoom = 1; this.cam.tzoom = 1;
    /* the player needs stats before it exists, so compile a provisional block */
    this.player = new E.Player(this, compileStats(this.run, null));
    this.run._statsCache = this.player.stats;
    this.recalcStats();
    this.player.hp = this.player.stats.maxHp;
    this.player.dashCharges = this.player.stats.dashMax;
    this.player.shield = 0;
    this.run.deathDefyMax = Math.max(0, Math.round(this.player.stats.deathDefy || 0) - (this.run.isFatedTrial ? this.run.trialModifiers.deathDefiancePenalty : 0));
    this.run.deathDefy = this.run.deathDefyMax;
    this.run.rerolls = 1 + (this.run.rerollBonus || 0);
    this.exitGate = null;
    this.pendingChamberReward = null;
    this.pendingReward = null;
    this.pendingFatedThreadContinuation = null;
    this.pendingStory = null;
    this.pendingRouteChoices = [];
    this.grudge = 0;
    /* Fated: begin with a relic */
    if (K.Save.metaLevel('m_fate') > 0) {
      const pool = D.RELICS.filter(r => this.run.relics.indexOf(r.id) < 0);
      if (pool.length) {
        const r = this.run.rng.pick(pool);
        this.run.addRelic(r.id);
        this.recalcStats();
      }
    }
    if (!this.practiceMode) { save.runs++; K.Save.write(); }
    this.regionIndex = 0;
    this.chamberIndex = 0;
    this.phase = 'playing';
    if (this.practiceMode) this.enterPractice(options); else this.enterChamber(0);
  };

  Game.prototype.startPractice = function (options) {
    options=options||{};
    this.startRun(options.seed,{practice:true,heroId:options.heroId,weapon:options.weapon});
  };

  Game.prototype.enterPractice = function (options) {
    options=options||{};
    this.regionIndex=0; this.chamberIndex=0;
    this.arena={w:1180,h:820,x:-590,y:-410}; this.cam.bounds=this.arena;
    E.enemies.length=0; E.projectiles.length=0; E.effects.length=0; E.pickups.length=0;
    this.hazards.length=0; this.pendingSpawns=[]; this.interactables=[]; this.exitGate=null;
    this.roomDef={type:'practice',region:D.REGIONS[0],idx:0,isBoss:false,condition:null,cleared:false};
    this.player.x=0; this.player.y=210; this.player.vx=0; this.player.vy=0;
    this.player.hp=this.player.stats.maxHp; this.player.shield=0;
    this.cam.follow(this.player.x,this.player.y,1,true);
    this.phase='playing';
    this.practiceSpawn(options.enemy||'dummy');
    K.Audio.playRegion(D.REGIONS[0],'calm');
    this.toast('PRACTICE — no campaign progress or rewards', '#8fe3c8', true);
    if(this.onTransition)this.onTransition('practice');
  };

  Game.prototype.practiceSpawn = function (enemyId) {
    if(!this.practiceMode)return false;
    const allowed=['dummy','shade','hoplite','gorgon','fury','minotaur','harpy'];
    if(allowed.indexOf(enemyId)<0)return false;
    E.enemies.length=0;this.practiceEnemyId=enemyId;
    if(enemyId==='dummy'){
      enemyId='shade';
      const e=this.addEnemy(enemyId,0,-150,{tier:0,hpMul:100,dmgMul:0});
      e.practiceDummy=true; e.name='PRACTICE SHADE'; e.dmg=0;
    } else {
      this.addEnemy(enemyId,0,-170,{tier:0,hpMul:2,dmgMul:0.75});
    }
    return true;
  };

  Game.prototype.exitPractice = function () {
    if(!this.practiceMode)return false;
    this.practiceMode=false; this.phase='idle'; this.run=null; this.player=null;
    E.enemies.length=0; E.projectiles.length=0; E.effects.length=0; E.pickups.length=0;
    this.hazards.length=0; this.interactables=[]; this.exitGate=null; this.roomDef=null;
    K.Audio.playTrack(0);
    if(this.onTransition)this.onTransition('practiceExit');
    return true;
  };
  Game.prototype.recalcStats = function () {
    if (!this.player || !this.run) return;
    const oldMax = this.player.stats ? this.player.stats.maxHp : undefined;
    const s = compileStats(this.run, this.player);
    this.player.stats = s;
    this.run._statsCache = s;
    const defyMax = Math.max(0, Math.round(s.deathDefy || 0));
    this.run.deathDefy = Math.max(0, defyMax - (this.run.deathDefySpent || 0));
    this.run.deathDefyMax = defyMax;
    const rerollBonus = Math.max(0, Math.round(s.rerollPlus || 0));
    this.run.rerolls = Math.max(0, this.run.rerolls + rerollBonus - (this.run.rerollBonus || 0));
    this.run.rerollBonus = rerollBonus;
    this.player.stats.maxHp = s.maxHp;
    if (oldMax !== undefined && s.maxHp > oldMax) this.player.hp += (s.maxHp - oldMax);
    this.player.hp = Math.min(this.player.hp, s.maxHp);
    this.player.dashCharges = Math.min(this.player.dashCharges, s.dashMax);
    this.player.dashTrailColor = (s.gods && s.gods.ares) ? '#e2564a' : (s.gods && s.gods.zeus ? '#f5e07a' : '#dfe8ff');
    this.statsDirty = false;
  };

  Game.prototype.region = function () { return D.REGIONS[this.regionIndex]; };

  Game.prototype.chamberPlan = function () {
    return ['combat','elite','treasure','shop','event','challenge','combat','boss'];
  };

  Game.prototype.enterChamber = function (idx, node) {
    this.chamberIndex = idx;
    if (this.run) { this.run.regionIndex = this.regionIndex; this.run.chamberIndex = idx; }
    const region = this.region();
    node = node || null;
    const type = idx >= 7 ? 'boss' : (node ? node.type : 'combat');
    const isBoss = type === 'boss' || type === 'optionalboss';
    const bossId = idx >= 7 ? region.boss : (node && node.bossId);
    const condition = node && (node.conditionData || D.CHAMBER_CONDITIONS.find(c => c.id === node.conditionId)) || null;

    this.arena.w = isBoss ? 1240 : 1180;
    this.arena.h = isBoss ? 880 : 820;
    this.arena.x = -this.arena.w / 2;
    this.arena.y = -this.arena.h / 2;
    this.cam.bounds = this.arena;
    this.roomDef = { type, region, idx, isBoss, bossId, condition, routeNode: node, cleared: false, isFinalCapstone: idx >= 7 && this.regionIndex === D.REGIONS.length - 1 };
    E.enemies.length = 0; E.projectiles.length = 0; E.effects.length = 0; E.pickups.length = 0;
    this.hazards.length = 0; this.pendingSpawns = []; this.pendingBolts = []; this.interactables = [];
    this.nearInteract = null; this.shopStock = []; this.boss = null;
    this.exitGate = null; this.pendingChamberReward = null; this.pendingReward = null;
    this.roomClearT = 0; this.flash = 0; this.activeEvent = null;

    const p = this.player;
    p.x = 0; p.y = this.arena.h * 0.32; p.vx = 0; p.vy = 0;
    p.dashing = 0; p.killStacks = 0; p.statuses = {};
    this.cam.x = p.x; this.cam.y = p.y; this.cam.follow(p.x, p.y, 1, true);

    const st = p.stats;
    if (st.shieldOnRoom) p.shield = Math.min(st.maxShield, p.shield + st.shieldOnRoom); else p.shield = 0;
    if (st.healRoom) p.heal(st.maxHp * st.healRoom, this);
    if (st.lifeOnEnter) p.heal(st.lifeOnEnter, this);
    if (st.stormOnRoom) this.stormChamber();

    const isShop = type === 'shop';
    if (isShop) { this.roomDef.cleared = true; this.pendingChamberReward = null; if (condition && condition.obols) this.run.addObols(condition.obols); }
    K.Audio.playRegion(region,isShop || type === 'event' ? 'calm' : (isBoss ? 'boss' : (type === 'miniboss' ? 'miniboss' : 'combat')));
    if (type === 'combat') this.spawnWave(region, 1.2);
    else if (type === 'risk') { this.player.hp=Math.max(1,this.player.hp-Math.ceil(this.player.stats.maxHp*0.12)); this.spawnWave(region,1.7); this.toast('BLOOD TITHE — 12% life pledged for a greater boon','#e2564a',true); }
    else if (type === 'challenge') this.spawnWave(region, 1.9);
    else if (type === 'elite') this.spawnElite(region);
    else if (type === 'miniboss') this.spawnMiniBoss(region);
    else if (type === 'treasure') this.spawnTreasure(region);
    else if (type === 'shop') this.spawnShop(region);
    else if (isBoss) this.spawnBoss(region, bossId);
    else if (type === 'event') {
      this.activeEvent = D.ROOM_EVENTS.find(e => e.id === (node && node.eventId)) || D.ROOM_EVENTS[0];
      this.phase = 'event';
      if (this.onTransition) this.onTransition('event', this.activeEvent);
    }
    if (['combat','risk','challenge','elite','miniboss','treasure'].indexOf(type)>=0) this.spawnArenaProps();
    if (isShop) this.openExitGate();

    if (this.regionIndex > 0 && !isBoss && ['combat','risk','challenge','elite','miniboss','treasure'].indexOf(type) >= 0) this.spawnNemesis();

    if (!this.run.routePath[this.regionIndex]) this.run.routePath[this.regionIndex] = [];
    this.run.routePath[this.regionIndex][idx] = { type, conditionId: condition && condition.id, bossId: bossId || null };
    this.run.stats.chambers++;
    this.run.stats.deepest = Math.max(this.run.stats.deepest, this.regionIndex * 8 + idx);
    if (K.Save.data.deepest < this.run.stats.deepest) { K.Save.data.deepest = this.run.stats.deepest; K.Save.write(); }
    if (st.oldGrudge) this.grudge = (this.grudge || 0) + 1;
    this.zoneAnnounce(region, type, idx);
  };

  Game.prototype.zoneAnnounce = function (region, type, idx) {
    const titles = { combat:'CHAMBER ' + RUN_LABELS[idx], risk:'BLOOD TITHE', miniboss:'NEMESIS CHALLENGE', elite:'CHAMPION’S CHAMBER', shop:'CHARON’S SHOPS', treasure:'THE GODS’ OFFERING', challenge:'TRIAL CHAMBER', event:'A MOMENT BETWEEN FATES', optionalboss:'OPTIONAL CHALLENGE', boss:'THE INNER SANCTUM' };
    const isBoss = !!(this.roomDef && this.roomDef.isBoss);
    const bd = isBoss ? D.BOSSES[this.roomDef.bossId || region.boss] : null;
    this.banner = { big:isBoss ? bd.name : region.name, small:isBoss ? bd.title : (titles[type] || titles.combat), sub:isBoss ? 'THE INNER SANCTUM' : (this.roomDef && this.roomDef.condition ? this.roomDef.condition.name + ' · ' + this.roomDef.condition.desc : region.sub), t:isBoss ? 4 : 3.2, max:isBoss ? 4 : 3.2 };
  };

  /* ---------------- spawning ---------------- */
  Game.prototype.assignEnemyIdentity = function (e) {
    if (!e || !this.run) return null;
    if (e.chronicleIdentity) return e.chronicleIdentity;
    const serial = ++this.run.enemySerial;
    const seed = (this.run.seed ^ Math.imul(serial, 0x45d9f3b) ^ Math.imul(this.run.ordinal, 0x27d4eb2d)) >>> 0;
    const rng = new K.RNG(seed);
    const def = e.def || e.type || {};
    const identity = {
      id: this.run.seed.toString(36) + '-' + this.run.ordinal.toString(36) + '-' + serial.toString(36),
      name: rng.pick(LORE.names), epithet: rng.pick(LORE.epithets), role: rng.pick(LORE.roles),
      memory: rng.pick(LORE.memories), motive: rng.pick(LORE.motives),
      origin: (this.region() && this.region().name) || 'the Underworld', fate: rng.pick(LORE.fates),
      enemy: def.name || e.id || 'shade'
    };
    identity.backstory = identity.name + ', ' + identity.epithet + ', was a ' + identity.role + ' from ' + identity.origin +
      '. They kept ' + identity.memory + '. Death remade them as ' + (def.name ? 'a ' + def.name : 'a shade') +
      ' in service to ' + identity.motive + '. ' + identity.fate;
    if (def.bestiaryLore) identity.backstory += ' Bestiary memory: ' + def.bestiaryLore;
    e.chronicleIdentity = identity;
    return identity;
  };

  Game.prototype.createKillChronicleEntry = function (e) {
    const identity = this.assignEnemyIdentity(e);
    const def = e.def || e.type || {};
    const entry = {
      id: identity.id, run: this.run.ordinal, seed: this.run.seed,
      sequence: this.run.killChronicle.length + 1, name: identity.name + ', ' + identity.epithet,
      enemy: def.name || e.id || 'shade', enemyId: e.id, region: (this.region() && this.region().name) || identity.origin,
      chamber: this.chamberIndex + 1, backstory: identity.backstory, role: identity.role,
      memory: identity.memory, motive: identity.motive, fate: identity.fate,
      elite: !!e.elite, boss: !!e.isBoss, nemesis: !!e.isNemesis,
      slainAt: this.run.stats.time
    };
    if (e.isNemesis) entry.backstory += ' After returning from a former defeat, they came back as ' +
      ((LORE.adaptations[e.nemesisAdaptation] || LORE.adaptations.grave_ward).title) +
      ' — ' + (LORE.adaptations[e.nemesisAdaptation] || LORE.adaptations.grave_ward).desc + '.';
    this.run.killChronicle.push(entry);
    K.Save.data.killChronicle.push(entry);
    return entry;
  };

  Game.prototype.spawnNemesis = function () {
    if (!this.run || this.run.nemesisSpawned) return null;
    const candidates = (K.Save.data.nemeses || []).filter(n => !n.defeated && D.ENEMIES[n.sourceId]);
    if (!candidates.length) return null;
    candidates.sort((a, b) => (a.appearances || 0) - (b.appearances || 0) || (b.rank || 1) - (a.rank || 1));
    const nemesis = candidates[0];
    const trait = LORE.adaptations[nemesis.adaptation] || LORE.adaptations.grave_ward;
    const rank = Math.min(8, Math.max(1, nemesis.rank || 1));
    const tier = this.regionIndex;
    const p = this.clampToArena(this.player.x + (this.run.rng.chance(0.5) ? -1 : 1) * 270, this.player.y - 210, 56);
    const e = this.addEnemy(nemesis.sourceId, p.x, p.y, {
      tier, elite:true, hpMul:trait.hp * (1 + (rank - 1) * 0.1),
      dmgMul:trait.dmg * (1 + (rank - 1) * 0.07), spdMul:trait.spd
    });
    e.isNemesis = true;
    e.nemesisId = nemesis.id;
    e.name = nemesis.name;
    e.nemesisEpithet = nemesis.epithet;
    e.nemesisAdaptation = nemesis.adaptation;
    e.chronicleIdentity = Object.assign({}, nemesis.identity || {}, { id:nemesis.id, name:nemesis.name, epithet:nemesis.epithet, enemy:e.type.name });
    if (!e.chronicleIdentity.backstory) e.chronicleIdentity.backstory = nemesis.backstory;
    nemesis.appearances = (nemesis.appearances || 0) + 1;
    nemesis.lastAppearedRun = this.run.ordinal;
    this.run.nemesisSpawned = true;
    K.Save.write();
    this.spawnPuff(e.x, e.y, e.color);
    this.toast('NEMESIS RETURNS — ' + nemesis.name.toUpperCase() + ', ' + trait.title.toUpperCase(), '#efb95e', true);
    return e;
  };

  Game.prototype.recordNemesis = function () {
    if (!this.run || this.run.nemesisRecorded) return null;
    const last = this.run.lastDamager;
    const killer = last && last.enemy;
    if (!killer || killer.ally || !killer.id || (!D.ENEMIES[killer.id] && !D.BOSSES[killer.id])) return null;
    this.run.nemesisRecorded = true;
    const identity = this.assignEnemyIdentity(killer);
    const spawnSourceId = D.ENEMIES[killer.id] ? killer.id :
      (D.ENEMIES[killer.familyId] ? killer.familyId : ((this.region().enemies || []).find(id => D.ENEMIES[id]) || 'shade'));
    const save = K.Save.data;
    if (this.practiceMode) return null;
    let nemesis = killer.nemesisId && save.nemeses.find(n => n.id === killer.nemesisId);
    const kind = last.kind || 'contact';
    const adaptation = kind === 'projectile' || kind === 'dive' ? 'veil_hunter' :
      (kind === 'contact' || kind === 'slam' || kind === 'cone' || kind === 'explosion' ? 'oathbreaker' : 'grave_ward');
    if (!nemesis) {
      nemesis = {
        id:identity.id, name:identity.name, epithet:identity.epithet, sourceId:spawnSourceId, killerId:killer.id,
        rank:1, adaptation, defeats:0, appearances:0, defeated:false,
        identity:Object.assign({}, identity), backstory:identity.backstory,
        createdRegion:this.regionIndex, createdChamber:this.chamberIndex, lastKillingBlow:kind
      };
      save.nemeses.push(nemesis);
    } else {
      nemesis.defeats = (nemesis.defeats || 0) + 1;
      nemesis.rank = Math.min(8, (nemesis.rank || 1) + 1);
      nemesis.adaptation = adaptation;
      nemesis.defeated = false;
      nemesis.lastKillingBlow = kind;
    }
    nemesis.lastKilledRun = this.run.ordinal;
    const trait = LORE.adaptations[nemesis.adaptation];
    const record = {
      id:nemesis.id, name:nemesis.name, epithet:nemesis.epithet, sourceId:nemesis.sourceId, killerId:killer.id,
      adaptation:nemesis.adaptation, rank:nemesis.rank, killer:identity.name, attack:kind,
      region:(this.region() && this.region().name) || 'the Underworld',
      backstory:identity.backstory + ' They struck the final blow with ' + kind + ' and learned from the death, returning as ' + trait.title + '.'
    };
    save.nemesisLog = Array.isArray(save.nemesisLog) ? save.nemesisLog : [];
    save.nemesisLog.push(record);
    K.Save.write();
    return nemesis;
  };

  Game.prototype.spawnWave = function (region, power) {
    const rng = this.run.rng, tier = this.regionIndex;
    const depth = tier * 8 + this.chamberIndex;
    const baseBudget = 8 + depth * 1.35 + (power - 1) * 5;
    const condition = this.roomDef && this.roomDef.condition;
    const budget = baseBudget * 1.7 + (condition && condition.countAdd ? condition.countAdd * 1.6 : 0);
    const node = this.roomDef && this.roomDef.routeNode;
    const pool = (node && node.squad && node.squad.length ? node.squad : region.enemies).filter(id => D.ENEMIES[id]);
    let spent = 0, guard = 0;
    const spawned = [];
    while (spent < budget && guard++ < 180 && spawned.length < 48) {
      const id = rng.pick(pool), def = D.ENEMIES[id];
      const cost = def.score * 1.35;
      if (spent + cost > budget + 1.2 && spawned.length >= 12) break;
      spent += cost; spawned.push(id);
    }
    while (spawned.length < 12) spawned.push(rng.pick(pool));
    if (spawned.length > 12) {
      const target = Math.min(48, Math.ceil(spawned.length / 8) * 8);
      while (spawned.length < target) spawned.push(rng.pick(pool));
    }
    const pactEliteCount = this.run.isFatedTrial ? Math.min(spawned.length, this.run.trialModifiers.elitePressure) : 0;
    const eliteStart = spawned.length - pactEliteCount;
    const ring = [];
    for (let i = 0; i < spawned.length; i++) {
      const a = (i / spawned.length) * TAU + rng.range(-0.2, 0.2);
      const r = rng.range(180, 330);
      ring.push(this.clampToArena(this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, 40));
    }
    this.pendingSpawns = spawned.map((id, i) => ({ id, x:ring[i].x, y:ring[i].y, tier, elite:i >= eliteStart }));
    this.releaseSpawnQueue(true);
    this.run.stats.rooms[this.regionIndex + '-' + this.chamberIndex] = spawned.join(',');
  };

  Game.prototype.releaseSpawnQueue = function (initial) {
    if (!this.pendingSpawns || !this.pendingSpawns.length) return;
    const active = E.enemies.filter(e => e && !e.ally && !e.dead && e.hp > 0).length;
    if (!initial && active > 9) return;
    let slots = Math.min(initial ? 18 : 12, 22 - active);
    while (slots-- > 0 && this.pendingSpawns.length) {
      const p = this.pendingSpawns.shift();
      const e = this.addEnemy(p.id, p.x, p.y, { tier:p.tier, elite:!!p.elite });
      if (e) this.spawnPuff(e.x, e.y, e.color);
    }
  };

  Game.prototype.spawnElite = function (region) {
    const rng = this.run.rng;
    const tier = this.regionIndex;
    const node = this.roomDef && this.roomDef.routeNode;
    const families = node && node.families;
    const familyElites = families ? region.elites.filter(id => families.indexOf(D.ENEMIES[id] && (D.ENEMIES[id].sourceId || id)) >= 0) : region.elites;
    const eliteId = rng.pick(familyElites.length ? familyElites : region.elites);
    const p = this.clampToArena(this.player.x + rng.range(-60, 60), this.player.y - 300, 60);
    const boss = this.addEnemy(eliteId, p.x, p.y, { tier, elite: true });
    this.spawnPuff(boss.x, boss.y, boss.color);
    /* plus a couple of minions */
    const pool = node && node.squad && node.squad.length ? node.squad : region.enemies;
    const n = Math.min(16, 8 + Math.floor(this.regionIndex / 2));
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, TAU), r = rng.range(180, 300);
      const q = this.clampToArena(boss.x + Math.cos(a) * r, boss.y + Math.sin(a) * r, 40);
      const e = this.addEnemy(rng.pick(pool), q.x, q.y, { tier });
      this.spawnPuff(e.x, e.y, e.color);
    }
    this.toast('CHAMPION: ' + D.ENEMIES[eliteId].name.toUpperCase(), '#e2564a', true);
  };

  Game.prototype.spawnMiniBoss = function (region) {
    const defs=K.RunSystems.MINIBOSSES, def=this.run.rng.pick(defs);
    const allEnemies=Object.keys(D.ENEMIES).filter(id=>D.ENEMIES[id]&&!D.ENEMIES[id].summon);
    const source=region.enemies.find(id=>D.ENEMIES[id]&&D.ENEMIES[id].ai===def.signature)||
      (D.ENEMIES[def.enemy]?def.enemy:null)||region.enemies.find(id=>D.ENEMIES[id])||allEnemies[0];
    if(!source)throw new Error('Cannot spawn miniboss '+def.id+': enemy catalog is empty');
    const p=this.clampToArena(this.player.x,this.player.y-280,70);
    const e=this.addEnemy(source,p.x,p.y,{tier:this.regionIndex,elite:true,hpMul:def.hpMul,dmgMul:def.dmgMul,spdMul:1.08});
    e.isMiniBoss=true; e.miniBossId=def.id; e.miniBossName=def.name; e.miniBossSignature=def.signature;
    e.scaleElite=def.scale; e.name=def.name; e.miniReward=def.reward;
    this.spawnPuff(e.x,e.y,e.color);
    const routePool=this.roomDef.routeNode&&Array.isArray(this.roomDef.routeNode.squad)?this.roomDef.routeNode.squad.filter(id=>D.ENEMIES[id]):[];
    const regionPool=region.enemies.filter(id=>D.ENEMIES[id]);
    const pool=routePool.length?routePool:(regionPool.length?regionPool:allEnemies);
    for(let i=0;i<7;i++){const id=this.run.rng.pick(pool),a=i*TAU/7,q=this.clampToArena(e.x+Math.cos(a)*210,e.y+Math.sin(a)*210,36);this.addEnemy(id,q.x,q.y,{tier:this.regionIndex});}
    this.toast(def.name+' — '+def.epithet,'#e2564a',true);
  };

  Game.prototype.spawnArenaProps = function () {
    if(!K.RunSystems||!this.run||this.practiceMode)return;
    const rng=this.run.rng, props=[0,1,2,3];
    rng.shuffle(props).slice(0,3).forEach((cell,i)=>{
      const a=(i/3)*TAU+rng.range(-0.25,0.25),r=rng.range(250,370),p=this.clampToArena(Math.cos(a)*r,Math.sin(a)*r,42);
      this.interactables.push({kind:'arena',x:p.x,y:p.y,radius:27,used:false,propCell:cell,
        reward:cell===0?'obols':(cell===1?'heal':(cell===2?'shield':'fury')),amount:cell===0?55:24});
    });
  };

  Game.prototype.spawnTreasure = function (region) {
    const rng = this.run.rng, tier = this.regionIndex;
    const node = this.roomDef && this.roomDef.routeNode;
    const pool = node && node.squad && node.squad.length ? node.squad : region.enemies;
    const n = Math.min(11, 6 + Math.floor(tier / 2));
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, TAU), r = rng.range(220, 360);
      const q = this.clampToArena(this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, 40);
      const e = this.addEnemy(rng.pick(pool), q.x, q.y, { tier }); this.spawnPuff(e.x, e.y, e.color);
    }
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, TAU), r = rng.range(80, 380);
      const q = this.clampToArena(this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, 40);
      this.urnDais(q.x, q.y);
    }
  };

  Game.prototype.urnDais = function (x, y) {
    this.interactables.push({
      kind: 'urn', x, y, radius: 20, used: false,
      amount: 8 + this.regionIndex * 7 + Math.floor(Math.random() * 8)
    });
  };

  Game.prototype.spawnShop = function (region) {
    const rng = this.run.rng;
    this.run._freeBuy = false;
    const n = 5;
    const discount = 1 - Math.min(0.8, this.player.stats.freeShop || 0);
    const pactPriceMul = this.run.isFatedTrial ? this.run.trialModifiers.shopPrices : 1;
    const stock = rng.shuffle(D.SHOP_ITEMS).slice(0, n - 2);
    stock.push({id:'s_forge_'+this.regionIndex+'_'+this.chamberIndex,name:'Hephaestus’ Temper',icon:'relic:r_hammer',cost:95+this.regionIndex*18,
      desc:'Temper your current weapon with a permanent run upgrade.',kind:'forge'});
    if (K.Gear) {
      const level = K.Gear.itemLevelAtDepth(this.regionIndex, this.chamberIndex);
      const slot = rng.pick(K.Gear.SLOTS);
      const gear = K.Gear.generate(slot, level, rng);
      if (gear) {
        const factor = K.Gear.RARITIES[gear.rarity].factor;
        stock.push({ id:'s_gear_' + gear.id, name:gear.name, icon:'gear:' + slot, cost:Math.max(60, Math.floor((65 + level * 7) * factor)),
          desc:'A persistent ' + gear.rarity + ' ' + K.Gear.SLOT_NAMES[slot].toLowerCase() + ' for your Armory.', kind:'gear', gearItem:gear });
      }
    }
    rng.shuffle(stock);
    stock.forEach((item, i) => {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.42;
      const r = 190;
      this.interactables.push({
        kind: 'shop', x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6 - 30,
        radius: 24, used: false, item,
        cost: Math.max(10, Math.round(item.cost * discount * pactPriceMul))
      });
    });
    this.shopStock = stock;
    this.interactables.push({kind:'haggle',x:-250,y:170,radius:30,used:false});
    this.interactables.push({kind:'healthTrade',x:250,y:170,radius:30,used:false});
    /* a healing fountain */
    this.interactables.push({ kind: 'fountain', x: 0, y: 230, radius: 30, used: false, amount: Math.round(28 + this.regionIndex * 10) });
  };

  Game.prototype.spawnBoss = function (region, bossId) {
    const id = bossId || region.boss, c = this.roomDef && this.roomDef.condition;
    const mods = c ? { hpMul:c.hpMul, dmgMul:c.dmgMul, spdMul:c.spdMul } : {};
    if (this.run.isFatedTrial) {
      mods.hpMul = (mods.hpMul || 1) * this.run.trialModifiers.enemyHealth;
      mods.dmgMul = (mods.dmgMul || 1) * this.run.trialModifiers.enemyDamage;
      mods.attackTempoMul = this.run.trialModifiers.enemyTempo;
    }
    const b = new E.Boss(id, 0, -160, this, mods);
    this.assignEnemyIdentity(b);
    if (this.player.stats.aegisOnBoss) this.player.addShield(this.player.stats.aegisOnBoss, this);
    E.enemies.push(b); this.boss = b; this.bossMaxHp = b.maxHp;
    this.toast(b.def.name, '#e2564a', true); this.pendingBossBanner = b;
  };

  Game.prototype.spawnPuff = function (x, y, color) {
    E.particles.burst(x, y, 12, () => {
      const a = Math.random() * TAU, s = 40 + Math.random() * 90;
      return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, size: 4, color: color || '#c8b898', glow: true, add: true, drag: 0.9 };
    });
    E.effects.push({ kind: 'summonRing', x, y, r: 34, life: 0.45, max: 0.45, color: color || '#c8b898' });
  };

  Game.prototype.addEnemy = function (id, x, y, opts) {
    const mods = Object.assign({ tier:this.regionIndex }, opts || {});
    const c = this.roomDef && this.roomDef.condition;
    if (c && !mods.ally) {
      mods.hpMul = (mods.hpMul || 1) * c.hpMul;
      mods.dmgMul = (mods.dmgMul || 1) * c.dmgMul;
      mods.spdMul = (mods.spdMul || 1) * c.spdMul;
    }
    if (this.run.isFatedTrial && !mods.ally) {
      mods.hpMul = (mods.hpMul || 1) * this.run.trialModifiers.enemyHealth;
      mods.dmgMul = (mods.dmgMul || 1) * this.run.trialModifiers.enemyDamage;
      mods.attackTempoMul = this.run.trialModifiers.enemyTempo;
    }
    const e = new E.Enemy(id, x, y, this, mods);
    this.assignEnemyIdentity(e);
    E.enemies.push(e); K.Save.data.seenEnemies[id] = 1;
    return e;
  };

  Game.prototype.summonFor = function (src, id, count) {
    for (let i = 0; i < count; i++) {
      if (E.enemies.filter(e => e && !e.ally && !e.dead && e.hp > 0).length >= 22) break;
      const a = Math.random() * TAU, r = 60 + Math.random() * 40;
      const q = this.clampToArena(src.x + Math.cos(a) * r, src.y + Math.sin(a) * r, 30);
      const e = this.addEnemy(id, q.x, q.y, { tier: this.regionIndex });
      this.spawnPuff(e.x, e.y, e.color);
    }
    K.Audio.sfx('bell');
  };
  Game.prototype.summonAt = function (x, y, id, count, spread) {
    for (let i = 0; i < count; i++) {
      if (E.enemies.filter(e => e && !e.ally && !e.dead && e.hp > 0).length >= 22) break;
      const a = Math.random() * TAU, r = 60 + Math.random() * (spread || 120);
      const q = this.clampToArena(x + Math.cos(a) * r, y + Math.sin(a) * r, 30);
      const e = this.addEnemy(id, q.x, q.y, { tier: this.regionIndex });
      this.spawnPuff(e.x, e.y, e.color);
    }
    K.Audio.sfx('bell');
  };
  Game.prototype.summonAlly = function (id, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, r = 50 + Math.random() * 60;
      const q = this.clampToArena(this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, 30);
      const ally = new E.Ally(id, q.x, q.y, this, 14);
      E.enemies.push(ally);
      this.spawnPuff(ally.x, ally.y, '#8fb8ff');
    }
  };

  Game.prototype.stormChamber = function () {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = 120 + Math.random() * 380;
      const x = this.player.x + Math.cos(a) * r, y = this.player.y + Math.sin(a) * r;
      const q = this.clampToArena(x, y, 20);
      this.strikeLightning(q.x, q.y, this.player.stats.damage * 1.2, 4, 0.4 + i * 0.18);
    }
  };

  /* ---------------- geometry ---------------- */
  Game.prototype.clampToArena = function (x, y, pad) {
    const b = this.arena;
    return {
      x: U.clamp(x, b.x + pad, b.x + b.w - pad),
      y: U.clamp(y, b.y + pad, b.y + b.h - pad)
    };
  };
  Game.prototype.collideWithWalls = function (e, dt) {
    const b = this.arena, r = e.radius * 0.75;
    if (e.x < b.x + r) { e.x = b.x + r; if (e.vx < 0) e.vx *= -0.25; }
    if (e.x > b.x + b.w - r) { e.x = b.x + b.w - r; if (e.vx > 0) e.vx *= -0.25; }
    if (e.y < b.y + r) { e.y = b.y + r; if (e.vy < 0) e.vy *= -0.25; }
    if (e.y > b.y + b.h - r) { e.y = b.y + b.h - r; if (e.vy > 0) e.vy *= -0.25; }
  };
  Game.prototype.separate = function (e, dt) {
    /* soft body separation */
    for (const o of E.enemies) {
      if (o === e || o.dead || o.ally !== e.ally) continue;
      const dx = o.x - e.x, dy = o.y - e.y;
      const md = e.radius + o.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > EPS && d2 < md * md) {
        const d = Math.sqrt(d2);
        const push = (md - d) / d * 0.5;
        const w = o.isBoss ? 0.1 : 1;
        e.x -= dx * push * w; e.y -= dy * push * w;
        o.x += dx * push * w * 0.6; o.y += dy * push * w * 0.6;
      }
    }
  };

  /* ---------------- combat resolution ---------------- */
  Game.prototype.damageEnemy = function (e, amount, opts) {
    if (!e || e.dead || e.hp <= 0) return 0;
    opts = opts || {};
    const playerProjectile = opts.proj && opts.proj.owner === this.player;
    const playerHit = opts.player === this.player || playerProjectile;
    if (playerHit && e.statuses && e.statuses.bleed && this.player && this.player.stats.bleedAmp) amount *= 1 + this.player.stats.bleedAmp;
    const minimumDamage = opts.allowFractional ? 0 : 1;
    amount = Math.max(minimumDamage, amount * e.statusDamage());
    if (e.isBoss && e.def && e.def.ai === 'lion' && (e.id === 'lion' || e.familyId === 'lion') && e.exposedT <= 0 && e.stageTransitionT <= 0) amount = Math.max(minimumDamage, amount * 0.48);
    if (e.isBoss && e.def && e.def.signature === 'achilles' && e.phase < 2 && e.exposedT <= 0) {
      const incoming = U.ang(e.x, e.y, this.player.x, this.player.y);
      if (Math.abs(U.angDiff(e.guardAngle || 0, incoming)) < 0.88) amount = Math.max(minimumDamage, amount * 0.4);
    }
    e.hp -= amount;
    e.hurtFlash = 1;
    e.hpBarT = 3;
    /* Queue every crossed boss stage, including when one hit skips thresholds. */
    if (e.isBoss && e.hp > 0 && e.def && e.def.phases) {
      const frac = e.hp / e.maxHp;
      let reached = e.stageReached || e.phase || 0;
      for (let i = reached + 1; i < e.def.phases.length; i++) {
        if (frac <= e.def.phases[i].at) { e.stageQueue.push(i); reached = i; }
        else break;
      }
      e.stageReached = reached;
      if (e.stageQueue.length && e.stageTransitionT <= 0) this.beginBossStageTransition(e);
    }
    this.run.stats.dmgDealt += amount;
    const sourceKey=opts.source||'unknown'; this.run.stats.damageBySource[sourceKey]=(this.run.stats.damageBySource[sourceKey]||0)+amount;
    if (!opts.silent) {
      if (opts.crit) { K.Audio.sfx('crit'); E.cam.addShake(3.4); }
      else if (K.Audio.gate('hit', 45)) { K.Audio.sfx('hit'); E.cam.addShake(1.6); }
      const col = opts.crit ? '#fff0a0' : '#ffd8b0';
      hitFx(this, opts.x || e.x, opts.y || e.y, col, opts.crit ? 10 : 5, opts.crit ? 200 : 120);
      this.floatText(opts.x || e.x, (opts.y || e.y) - e.radius, Math.round(amount), opts.crit ? '#ffd24a' : '#f0e6c8', opts.crit);
    }
    if (opts.knock && opts.knock > 0 && !e.isBoss) {
      const a = opts.dir === undefined ? U.ang(this.player.x, this.player.y, e.x, e.y) : opts.dir;
      const kb = Math.max(0, 150 * (opts.knock - 0.4)) * (playerHit ? this.player.stats.knock || 1 : 1);
      e.knockVX += Math.cos(a) * kb;
      e.knockVY += Math.sin(a) * kb;
    } else if (opts.knock && e.isBoss && opts.knock > 1.2) {
      e.knockVX += Math.cos(opts.dir || 0) * 30;
      e.knockVY += Math.sin(opts.dir || 0) * 30;
    }
    if (e.hp <= 0 && !e.practiceDummy) this.killEnemy(e, false);
    else if(e.practiceDummy&&e.hp<=0)e.hp=e.maxHp;
    return amount;
  };

  Game.prototype.knockback = function (e, angle, force) {
    if (!e || e.isBoss) return;
    e.knockVX += Math.cos(angle) * force;
    e.knockVY += Math.sin(angle) * force;
  };

  Game.prototype.killEnemy = function (e, silent) {
    if (e.dead) return;
    e.dead = true;
    e.deathT = 0;
    const st = this.player.stats;
    if (e.ally) {
      this.spawnPuff(e.x, e.y, '#8fb8ff');
      return;
    }
    if (!this.practiceMode) this.createKillChronicleEntry(e);
    if (e.isNemesis) {
      const defeated = (K.Save.data.nemeses || []).find(n => n.id === e.nemesisId);
      if (defeated) { defeated.defeated = true; defeated.defeatedRun = this.run.ordinal; }
    }
    this.run.stats.kills++;
    if (this.practiceMode) { hitFx(this,e.x,e.y,e.color,10,150); return; }
    this.progressQuest('kill');
    K.Save.data.kills++;
    const isBoss = e.isBoss;
    const isElite = e.elite;
    if (K.Paragon) K.Paragon.awardXp(isBoss ? 20 : (isElite ? 5 : 1));
    if (K.Gear && (isBoss || (isElite && this.run.rng.chance(0.25)))) this.awardGearDrop();

    /* visual + sound */
    hitFx(this, e.x, e.y, e.color, isBoss ? 44 : 14, isBoss ? 340 : 170);
    ringFx(this, e.x, e.y, isBoss ? 120 : 26, e.color, isBoss ? 40 : 10);
    this.cam.addShake(isBoss ? 20 : (isElite ? 9 : 3));
    K.Audio.sfx(isBoss ? 'explode' : (isElite ? 'crit' : 'hit'));

    /* drops */
    const obolBase = (isBoss ? 90 : (isElite ? 26 : 4 + Math.round(e.type.score * 1.6))) * (1 + this.regionIndex * 0.35);
    const n = isBoss ? 14 : (isElite ? 5 : 1);
    for (let i = 0; i < n; i++) this.dropObol(e.x, e.y, obolBase / n);

    if (st.killHeal) this.player.heal(st.killHeal * (isBoss ? 12 : 1), this);
    if (st.killShield) this.player.addShield(st.killShield, this);
    if (st.killStack) this.player.killStacks++;
    if (st.boltOnKill && Math.random() < st.boltOnKill) this.strikeLightning(e.x, e.y, 30 + this.regionIndex * 12, 6, 0);
    if (st.fogOnKill) {
      this.addHazard({ x: e.x, y: e.y, radius: 56, life: 4, maxLife: 4, dmg: 10 + this.regionIndex * 6, tick: 0.5, friendly: true, color: '#7ad86a' });
    }
    if (st.magmaOnKill) {
      this.addHazard({ x: e.x, y: e.y, radius: 48, life: 3, maxLife: 3, dmg: 14 + this.regionIndex * 7, tick: 0.4, friendly: true, color: '#ff6a2c' });
    }
    if (st.harvestOnKill && Math.random() < st.harvestOnKill) {
      E.pickups.push(new E.Pickup({ x: e.x, y: e.y, kind: 'life', value: Math.round(this.player.stats.maxHp * 0.07), color: '#7ad86a', radius: 12 }));
    }
    if (st.raiseOnKill && Math.random() < st.raiseOnKill) {
      this.summonAlly('spectral_hound', 1);
    }
    if (isBoss) {
      this.run.stats.bosses++;
      K.Save.data.bossKills++;
      if (K.RunSystems && K.RunSystems.updateUnlocks(K.Save.data)) K.Save.write();
      this.onBossDeath(e);
    }
    if (isElite) { this.run.stats.elites++; K.Save.data.elites++; this.progressQuest('elite'); }
    K.Save.write();
  };

  Game.prototype.dropObol = function (x, y, amount) {
    const v = Math.max(1, Math.round(amount));
    E.pickups.push(new E.Pickup({ x, y, kind: 'obol', value: v, color: '#e0b355', radius: 9 }));
  };

  Game.prototype.progressQuest = function (event) {
    if(this.practiceMode||!this.run||!K.RunSystems||!this.run.quest)return false;
    const quest=this.run.quest;
    const completed=K.RunSystems.progressQuest(this.run,event);
    if(completed){
      if(quest.reward&&quest.reward.obols)this.run.addObols(quest.reward.obols);
      if(quest.reward&&quest.reward.fx){this.run.shopStats.push(quest.reward.fx);this.recalcStats();}
      this.toast('QUEST COMPLETE — '+quest.name,'#f0cf5e',true);
      K.Audio.sfx('levelup');
    }
    if(this.onTransition)this.onTransition('questProgress',quest);
    return completed;
  };
  Game.prototype.awardGearDrop = function () {
    if (!K.Gear || !this.run) return false;
    const level = K.Gear.itemLevelAtDepth(this.regionIndex, this.chamberIndex);
    const item = K.Gear.generate(this.run.rng.pick(K.Gear.SLOTS), level, this.run.rng);
    if (!item) return false;
    const result = K.Gear.add(item);
    this.toast(result && result.duplicate ? 'DUPLICATE RELIC FORGED INTO SALVAGE' : 'ARMORY — ' + item.name, '#e0b355', true);
    return result;
  };

  Game.prototype.floatText = function (x, y, value, color, big) {
    E.effects.push({
      kind: 'float', x: x + (Math.random() - 0.5) * 12, y, text: String(value),
      color: color || '#fff', life: big ? 0.9 : 0.7, max: big ? 0.9 : 0.7,
      vy: -46, size: big ? 20 : 14
    });
  };

  Game.prototype.damagePlayer = function (amount, source, kind, ignoreInvuln) {
    const p = this.player;
    if (!p || p.dead) return false;
    /* i-frames are the single authority on whether a hit lands */
    if (!ignoreInvuln && p.invuln > 0) return false;
    /* a raised Guard can stop the blow, and parries it if fresh */
    if (!ignoreInvuln && p.guardT > 0 && kind !== 'dot') {
      const through = p.absorb(amount, source, kind, this);
      if (through <= 0) return false;
      amount = amount * through;
    }
    const st = p.stats;
    const attacker = source && source.owner ? source.owner : source;
    if (attacker && attacker.statuses && attacker.statuses.weaken) amount *= Math.max(0, 1 - attacker.statuses.weaken.amount);
    if (st.dodge && Math.random() < st.dodge) {
      this.floatText(p.x, p.y - 24, 'DODGE', '#8fe3c8');
      K.Audio.sfx('ui');
      return false;
    }
    let dmg = amount * (1 - st.dmgReduce) - (st.armor || 0);
    dmg = Math.max(kind === 'dot' ? 0 : 1, dmg);

    /* shield first */
    if (p.shield > 0 && kind !== 'dot') {
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed; dmg -= absorbed;
      E.effects.push({ kind: 'shieldRing', x: p.x, y: p.y, r: p.radius + 14, life: 0.26, max: 0.26, color: '#8fb8ff' });
      K.Audio.sfx('shield');
      if (dmg <= 0) return false;
    }
    {
      p.hp = Math.max(0, p.hp - dmg);
      const attacker = source && source.owner && source.owner.hp !== undefined ? source.owner : source;
      if (attacker && attacker.hp !== undefined && !attacker.ally && attacker.id && (D.ENEMIES[attacker.id] || D.BOSSES[attacker.id])) {
        this.run.lastDamager = { enemy:attacker, kind:kind || 'contact', damage:dmg, at:this.run.stats.time };
      }
      this.run.stats.dmgTaken += dmg;
      p.hurtFlash = 1;
      p.invuln = Math.max(p.invuln, 0.55);
      E.cam.addShake(Math.min(14, 3 + dmg * 0.35));
      this.flashScreen('rgba(190,30,20,0.30)', 0.24);
      K.Audio.sfx('hurt');
      this.floatText(p.x, p.y - 30, '-' + Math.round(dmg), '#ff6a5a');
      p.killStacks = 0;
      /* retort effects */
      if (st.thorns && source && !source.isBoss && source.hp !== undefined) {
        this.damageEnemy(source, st.thorns, { source: 'thorns', x: source.x, y: source.y });
      }
      if (st.reflect && source) {
        if (source.hp !== undefined && !source.isBoss) this.damageEnemy(source, dmg * st.reflect, { source: 'reflect', x: source.x, y: source.y });
      }
      if (st.revenge) {
        this.enemySlam(p, 110, dmg * st.revenge * 2, true);
      }
      if (st.invulnMelee && kind === 'contact') {
        for (const e of E.enemies) {
          if (e.dead || e.ally) continue;
          if (U.dist(p.x, p.y, e.x, e.y) < 110) this.knockback(e, U.ang(p.x, p.y, e.x, e.y), 420);
        }
      }
    }
    if (p.hp <= 0) return true;
    return true;
  };

  Game.prototype.applyStatus = function (e, key, data) {
    if (!e || e.dead) return;
    if (e.statusImmune && e.statusImmune[key]) return;
    if (key === 'slow' || key === 'chill' || key === 'weaken') data = Object.assign({}, data,
      { amount:U.clamp(data.amount || 0, 0, key === 'weaken' ? 1 : 0.95) });
    if (e.statuses[key]) {
      const s = e.statuses[key];
      if (data.dur) s.t = Math.max(s.t, data.dur);
      if (data.dps) s.dps = Math.max(s.dps || 0, data.dps);
      if (data.dmg) s.dmg = Math.max(s.dmg || 0, data.dmg);
      if (data.amount) s.amount = Math.max(s.amount || 0, data.amount);
    } else {
      e.statuses[key] = Object.assign({ t: data.dur || 3 }, data);
      e.statuses[key].t = data.dur || 3;
      e.statuses[key].dur = data.dur || 3;
      e.statuses[key].tick = 0;
    }
  };
  Game.prototype.applyPlayerStatus = function (key, data) {
    const p = this.player;
    if (p.statuses[key]) { p.statuses[key].t = Math.max(p.statuses[key].t, data.dur || 1); }
    else p.statuses[key] = Object.assign({ t: data.dur || 1, dur: data.dur || 1 }, data);
  };
  Game.prototype.detonateDoom = function (e, s) {
    if (e.dead) return;
    const dmg = (s.dmg || 50) * (1 + (this.player.stats.doomDmgBonus || 0));
    ringFx(this, e.x, e.y, 46, '#e2564a', 16);
    hitFx(this, e.x, e.y, '#e2564a', 14, 220);
    K.Audio.sfx('explode');
    this.damageEnemy(e, dmg, { source: 'doom', x: e.x, y: e.y });
    for (const o of E.enemies) {
      if (o === e || o.dead || o.ally) continue;
      if (U.dist(e.x, e.y, o.x, o.y) < 90) this.damageEnemy(o, dmg * 0.4, { source: 'doom', x: o.x, y: o.y });
    }
  };
  Game.prototype.charmEnemy = function (e) {
    if (!e || e.dead || e.isBoss) return;
    this.applyStatus(e, 'charm', { dur: 5 });
    this.floatText(e.x, e.y - e.radius - 8, '♥', '#f08bb4');
  };

  /* ---------------- god powers ---------------- */
  Game.prototype.nearestEnemy = function (x, y, maxD, exclude) {
    let best = null, bd = maxD * maxD;
    for (const e of E.enemies) {
      if (e.dead || e.ally || e === exclude || e.hp <= 0) continue;
      const d = U.dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };

  Game.prototype.strikeLightning = function (x, y, dmg, radius, delay) {
    const fire = () => {
      const r = radius || 5;
      E.effects.push({ kind: 'bolt', x, y, life: 0.3, max: 0.3, color: '#fff3b0' });
      E.effects.push({ kind: 'nova', x, y, r: r * 5, life: 0.3, max: 0.3, color: '#f5e07a' });
      hitFx(this, x, y, '#fff3b0', 16, 240);
      K.Audio.sfx('bolt');
      for (const e of E.enemies) {
        if (e.dead || e.ally) continue;
        if (U.dist(x, y, e.x, e.y) < r * 5 + e.radius) {
          this.damageEnemy(e, dmg, { source: 'lightning', x: e.x, y: e.y, knock: 1.3, player:this.player });
        }
      }
      this.cam.addShake(4);
    };
    if (delay && delay > 0) {
      E.effects.push({ kind: 'telegraph', x, y, r: (radius || 5) * 5, life: delay, max: delay, color: '#f5e07a' });
      this.pendingBolts = this.pendingBolts || [];
      this.pendingBolts.push({ x, y, dmg, radius, t: delay, fire });
    } else fire();
  };

  Game.prototype.chainLightning = function (from, jumps, dmg, mul) {
    let src = from, cur = dmg, count = 0;
    const hitList = [from];
    while (count < jumps) {
      let best = null, bd = 260 * 260;
      for (const e of E.enemies) {
        if (e.dead || e.ally || hitList.indexOf(e) >= 0) continue;
        const d = U.dist2(src.x, src.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      E.effects.push({ kind: 'arc', x1: src.x, y1: src.y, x2: best.x, y2: best.y, life: 0.16, max: 0.16, color: '#f5e07a' });
      this.damageEnemy(best, cur * (mul || 0.6), { source: 'chain', x: best.x, y: best.y, player:this.player });
      K.Audio.sfx('bolt');
      hitList.push(best);
      src = best; cur *= 0.82; count++;
    }
  };

  Game.prototype.playerWave = function (x, y, radius, dmg, aim) {
    E.effects.push({ kind: 'wave', x, y, r: radius, life: 0.32, max: 0.32, color: '#5fd0d8', dir: aim === undefined ? -1 : aim });
    K.Audio.sfx('whoosh');
    const st = this.player.stats;
    const range = radius + 40;
    for (const e of E.enemies) {
      if (e.dead || e.ally) continue;
      const d = U.dist(x, y, e.x, e.y);
      if (d < range + e.radius) {
        const a = aim === undefined ? U.ang(x, y, e.x, e.y) : aim;
        this.damageEnemy(e, dmg, { source: 'wave', x: e.x, y: e.y, dir: a, knock: 2.2, player:this.player });
        if (st.drownDot) this.applyStatus(e, 'poison', { dps: st.drownDot.dps, dur: st.drownDot.dur });
        if (st.slowOnHit) this.applyStatus(e, 'slow', { amount: 0.4, dur: 2.2 });
      }
    }
  };

  Game.prototype.playerDashDamage = function (p, dmg) {
    for (const e of E.enemies) {
      if (e.dead || e.ally) continue;
      if (U.dist(p.x, p.y, e.x, e.y) < p.radius + e.radius + 16) {
        if (!p._dashHit) p._dashHit = new Set();
        if (p._dashHit.has(e)) continue;
        p._dashHit.add(e);
        this.damageEnemy(e, dmg, { source: 'dash', x: e.x, y: e.y, dir: U.ang(p.x, p.y, e.x, e.y), knock: 1.5, player:p });
        if (this.player.stats.weaken) this.applyStatus(e, 'weaken', { amount: this.player.stats.weaken, dur: 3 });
      }
    }
    if (p.dashing <= 0) p._dashHit = null;
  };

  Game.prototype.enemySlam = function (src, radius, dmg, friendlyOnly) {
    E.effects.push({ kind: 'shockwave', x: src.x, y: src.y, r: radius, life: 0.4, max: 0.4, color: src.color || '#e2a06a' });
    ringFx(this, src.x, src.y, radius, src.color || '#e2a06a', 20);
    this.cam.addShake(7);
    K.Audio.sfx('stone');
    if (!friendlyOnly) {
      if (U.dist(src.x, src.y, this.player.x, this.player.y) < radius + this.player.radius) {
        this.damagePlayer(dmg, src, 'slam');
        this.knockback(this.player, U.ang(src.x, src.y, this.player.x, this.player.y), 340);
      }
    } else {
      for (const e of E.enemies) {
        if (e.dead || e.ally) continue;
        if (U.dist(src.x, src.y, e.x, e.y) < radius + e.radius) {
          this.damageEnemy(e, dmg, { source: 'retort', x: e.x, y: e.y, knock: 1.6 });
        }
      }
    }
  };

  Game.prototype.enemyCone = function (src, angle, arc, range, dmg, color) {
    E.effects.push({ kind: 'cone', x: src.x, y: src.y, dir: angle, arc, r: range, life: 0.22, max: 0.22, color: color || '#e2564a' });
    const p = this.player;
    const d = U.dist(src.x, src.y, p.x, p.y);
    if (d < range + p.radius) {
      const a = U.ang(src.x, src.y, p.x, p.y);
      if (Math.abs(U.angDiff(angle, a)) < arc / 2) {
        if (this.damagePlayer(dmg, src, 'cone')) {
          this.knockback(p, a, 260);
        }
      }
    }
  };

  Game.prototype.arenaQuake = function (radius, dmg, source) {
    E.cam.addShake(16);
    if (U.dist(0, 0, this.player.x, this.player.y) < radius) {
      this.damagePlayer(dmg, source, 'quake');
    }
  };

  Game.prototype.addHazard = function (h) {
    if (this.hazards.length > 60) this.hazards.shift();
    h.tickT = Math.random() * (h.tick || 0.4);
    this.hazards.push(h);
  };

  Game.prototype.flashScreen = function (color, a) {
    this.flash = Math.max(this.flash, a);
    this.flashColor = color;
  };

  /* ---------------- CALL (god power) ---------------- */
  Game.prototype.startCall = function (p) {
    const gods = Object.keys(p.stats.gods || {});
    let god = null;
    if (gods.length) {
      /* favour the god you are most devoted to */
      let best = null, bc = -1;
      gods.forEach(g => { const c = p.stats.gods[g] + (this.run.godFavor[g] || 0) * 0.08; if (c > bc) { bc = c; best = g; } });
      god = best;
    }
    if (!god) god = this.run.rng.pick(D.OLYMPIANS || ['zeus', 'poseidon', 'athena', 'ares', 'artemis']);
    const gdef = D.GODS[god];
    p.callGod = god;
    p.callActive = 3.0;
    p.callTick = 0;
    p.callCd = 22 * (1 - Math.min(0.4, (p.stats.callBoost || 0)));
    p.invuln = Math.max(p.invuln, 3.0);
    this.run.stats.calls++;
    this.changeGodFavor(god, 1, 'answered divine call', true);
    this.cinematic = { god, t: 3.0 };
    this.timeScale = 0.35;
    this.flashScreen(K.R.rgba(gdef.color, 0.30), 0.25);
    this.cam.tzoom = 1.12;
    K.Audio.sfx('bell');
    this.toast(gdef.name + ' ANSWERS — ' + gdef.domain.toUpperCase(), gdef.color, true);
    E.particles.burst(p.x, p.y, 40, () => {
      const a = Math.random() * TAU, s = 120 + Math.random() * 340;
      return { x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9, max: 0.9, size: 4, color: gdef.color, glow: true, add: true, drag: 0.9, shape: 'spark', rot: a, vrot: 8 };
    });
    /* immediate effects */
    const pc = this.player;
    switch (god) {
      case 'zeus':
        for (const e of E.enemies) {
          if (e.dead || e.ally) continue;
          this.strikeLightning(e.x, e.y, pc.stats.damage * 2.2, 6, Math.random() * 0.4);
        }
        break;
      case 'poseidon':
        this.playerWave(pc.x, pc.y, 640, pc.stats.damage * 2.4, undefined);
        for (const e of E.enemies) if (!e.dead && !e.ally) this.knockback(e, U.ang(pc.x, pc.y, e.x, e.y), 620);
        break;
      case 'athena':
        pc.addShield(80, this);
        this.deflectAllEnemyProjectiles();
        break;
      case 'ares':
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * TAU, r = 40 + Math.random() * 300;
          this.addHazard({ x: U.clamp(pc.x + Math.cos(a) * r, this.arena.x, this.arena.x + this.arena.w), y: U.clamp(pc.y + Math.sin(a) * r, this.arena.y, this.arena.y + this.arena.h), radius: 44, life: 3, maxLife: 3, dmg: pc.stats.damage * 0.5, tick: 0.35, friendly: true, color: '#e2564a' });
        }
        break;
      case 'aphrodite':
        for (const e of E.enemies) if (!e.dead && !e.ally) this.charmEnemy(e);
        break;
      case 'artemis':
        for (const e of E.enemies) {
          if (e.dead || e.ally) continue;
          for (let i = 0; i < 3; i++) {
            E.spawnProjectile({
              x: e.x + (i - 1) * 28, y: Math.max(this.arena.y - 180, e.y - 300), vx: 0, vy: 650, dmg: pc.stats.damage * 0.9, friendly: true, owner:pc,
              persp: 'arrow', life: 2.5, homing: 6, radius: 7, hitWall:false, crit: Math.random() < pc.stats.crit + 0.25
            });
          }
        }
        break;
      case 'dionysus':
        for (const e of E.enemies) if (!e.dead && !e.ally) { this.applyStatus(e, 'stun', { dur: 2.2 }); this.applyStatus(e, 'poison', { dps: pc.stats.damage * 0.35, dur: 6 }); }
        break;
      case 'hephaestus':
        for (const e of E.enemies) if (!e.dead && !e.ally) this.strikeLightning(e.x, e.y, pc.stats.damage * 1.8, 5, 0.2);
        for (let i = 0; i < 6; i++) {
          const e = E.enemies[i % Math.max(1, E.enemies.length)];
          if (e && !e.dead && !e.ally) this.addHazard({ x: e.x, y: e.y, radius: 50, life: 4, maxLife: 4, dmg: pc.stats.damage * 0.4, tick: 0.4, friendly: true, color: '#ff6a2c' });
        }
        break;
      case 'hermes':
        pc.invuln = Math.max(pc.invuln, 5);
        this.run.hermesBoost = 5;
        this.recalcStats();
        break;
      case 'demeter':
        for (const e of E.enemies) if (!e.dead && !e.ally) { this.applyStatus(e, 'root', { dur: 2.6 }); this.applyStatus(e, 'chill', { amount: 0.6, dur: 4 }); }
        break;
      case 'hades':
        this.summonAlly('spectral_soldier', 3);
        this.summonAlly('spectral_hound', 2);
        break;
      case 'chaos':
        for (const e of E.enemies) if (!e.dead && !e.ally) this.damageEnemy(e, pc.stats.damage * 1.6, { source: 'chaos', x: e.x, y: e.y });
        break;
      default: {
        const style = (D.GODS[god] && D.GODS[god].callStyle) || 'starfall';
        const foes = E.enemies.filter(e => e && !e.dead && !e.ally);
        const strikeAll = (mult, status, statusData) => foes.forEach(e => {
          this.damageEnemy(e, pc.stats.damage * mult, { source:god, x:e.x, y:e.y });
          if (status && !e.dead) this.applyStatus(e, status, statusData || { dur:2.2 });
        });
        const volley = (persp, mult, n) => foes.forEach(e => {
          const a = U.ang(pc.x, pc.y, e.x, e.y);
          for (let i = 0; i < (n || 1); i++) E.spawnProjectile({ x:pc.x, y:pc.y, vx:Math.cos(a) * 650, vy:Math.sin(a) * 650,
            dmg:pc.stats.damage * mult, friendly:true, persp, life:1.8, radius:8, homing:persp === 'arrow' ? 2.4 : 0 });
        });
        switch (style) {
          case 'ward': pc.addShield(72,this); this.deflectAllEnemyProjectiles(); break;
          case 'sun': case 'fire': strikeAll(style === 'sun' ? 1.9 : 1.65, 'burn', { dps:pc.stats.damage * 0.28, dur:4 }); break;
          case 'hearth': case 'healing': case 'renewal': pc.heal(34,this); pc.addShield(38,this); break;
          case 'harvest': case 'reaper': case 'retribution': case 'judgment': case 'fate': case 'oath': case 'victory':
            strikeAll(style === 'harvest' ? 1.8 : 1.65, style === 'reaper' ? 'doom' : null, { dur:2.4 });
            if (style === 'harvest' || style === 'reaper') pc.heal(18,this);
            if (style === 'victory') pc.addShield(34,this);
            break;
          case 'dream': case 'time': strikeAll(0.85, 'stun', { dur:2.0 }); foes.forEach(e => !e.dead && this.applyStatus(e,'slow',{ amount:0.55,dur:4 })); break;
          case 'ferry': this.summonAlly('spectral_soldier',2); this.summonAlly('spectral_hound',2); break;
          case 'wild': case 'desire': case 'discord': case 'concord': case 'fear': foes.forEach(e => this.charmEnemy(e)); break;
          case 'fortune': this.run.addObols(90); pc.addShield(24,this); strikeAll(0.8); break;
          case 'prism': case 'moon': volley('arrow',1.05,2); break;
          case 'wave': case 'tide': case 'wind': case 'earth':
            this.playerWave(pc.x,pc.y,520,pc.stats.damage * (style === 'earth' ? 2.1 : 1.65));
            foes.forEach(e => this.knockback(e,U.ang(pc.x,pc.y,e.x,e.y),560)); break;
          case 'frost': case 'night': strikeAll(0.95, 'chill', { amount:0.65,dur:4 }); foes.forEach(e => !e.dead && this.applyStatus(e,'root',{ dur:1.5 })); break;
          case 'endurance': case 'guardian': pc.addShield(90,this); pc.heal(16,this); break;
          case 'crossroads':
            if (this.run.rng.chance(0.34)) { pc.heal(32,this); pc.addShield(30,this); }
            else if (this.run.rng.chance(0.5)) strikeAll(1.8,'weaken',{ amount:0.35,dur:4 });
            else volley('bolt',1.55,2);
            break;
          default: strikeAll(1.45); pc.addShield(24,this); break;
        }
        break;
      }
    }
  };

  Game.prototype.deflectAllEnemyProjectiles = function () {
    for (const pr of E.projectiles) {
      if (pr.friendly) continue;
      const a = Math.atan2(pr.vy, pr.vx) + Math.PI;
      const sp = Math.hypot(pr.vx, pr.vy) * 1.4;
      pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
      pr.friendly = true; pr.fromEnemy = false; pr.dmg *= 2.4; pr.hitSet = null;
    }
  };

  Game.prototype.callTick = function (p, dt) {
    p.callTick += dt;
    const god = p.callGod;
    if (god === 'zeus' && p.callTick > 0.3) {
      p.callTick = 0;
      const t = this.nearestEnemy(p.x, p.y, 700);
      if (t) this.strikeLightning(t.x + (Math.random() - 0.5) * 60, t.y + (Math.random() - 0.5) * 60, p.stats.damage * 1.4, 5, 0);
    } else if (god === 'artemis' && p.callTick > 0.18) {
      p.callTick = 0;
      const t = this.nearestEnemy(p.x, p.y, 900);
      if (t) {
        const a = U.ang(p.x, p.y, t.x, t.y);
        E.spawnProjectile({ x: p.x, y: p.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, dmg: p.stats.damage * 0.7, friendly: true, persp: 'arrow', life: 1.6, homing: 2, radius: 7, crit: Math.random() < p.stats.crit });
      }
    } else if (god === 'ares' && p.callTick > 0.25) {
      p.callTick = 0;
      const t = this.nearestEnemy(p.x, p.y, 500);
      if (t) this.enemySlam({ x: t.x, y: t.y, color: '#e2564a' }, 90, p.stats.damage * 1.1, true);
    } else if (god === 'chaos' && p.callTick > 0.35) {
      p.callTick = 0;
      for (const e of E.enemies) if (!e.dead && !e.ally && Math.random() < 0.6) this.damageEnemy(e, p.stats.damage * 0.5, { source: 'chaos', x: e.x, y: e.y, silent: true });
    } else if (god === 'aphrodite' && p.callTick > 0.5) {
      p.callTick = 0;
      for (const e of E.enemies) if (!e.dead && !e.ally) this.applyStatus(e, 'charm', { dur: 5 });
    } else if (god === 'athena' && p.callTick > 0.4) {
      p.callTick = 0;
      this.deflectAllEnemyProjectiles();
      p.addShield(12, this);
    }
  };

  /* ---------------- pickups & interactables ---------------- */
  Game.prototype.collectPickup = function (p) {
    if (p.dead) return;
    const pl = this.player;
    if (p.kind === 'obol') {
      const got = this.run.addObols(p.value);
      K.Save.data.obols += got;
      K.Save.write();
      this.progressQuest('obol',got);
      K.Audio.sfx('coin');
      if (pl.stats.obolHeal) pl.heal(pl.stats.obolHeal, this);
      E.particles.spawn({ x: p.x, y: p.y, vx: 0, vy: -40, life: 0.3, max: 0.3, size: 4, color: '#f0d070', glow: true, add: true });
    } else if (p.kind === 'life') {
      pl.heal(p.value, this);
      this.floatText(pl.x, pl.y - 34, '+' + Math.round(p.value), '#7ad86a');
      K.Audio.sfx('heal');
    }
    p.dead = true;
    const i = E.pickups.indexOf(p);
    if (i >= 0) E.pickups.splice(i, 1);
  };

  Game.prototype.doInteract = function (it) {
    if (!it || it.used) return;
    if (it.kind === 'urn') {
      it.used = true;
      for (let i = 0; i < 5; i++) this.dropObol(it.x, it.y, it.amount / 5);
      K.Audio.sfx('stone');
      hitFx(this, it.x, it.y, '#c8a878', 16, 200);
      E.effects.push({ kind: 'urnBreak', x: it.x, y: it.y, life: 0.4, max: 0.4 });
    } else if (it.kind === 'arena') {
      it.used=true;
      if(it.reward==='obols'){for(let i=0;i<6;i++)this.dropObol(it.x,it.y,it.amount/6);this.toast('Offering released from the old stone.','#e0b355');}
      else if(it.reward==='heal'){this.player.heal(it.amount,this);this.toast('The shrine restores '+it.amount+' life.','#7ad86a');}
      else if(it.reward==='shield'){this.player.addShield(it.amount,this);this.toast('The guardian statue lends '+it.amount+' shield.','#8fb8ff');}
      else {this.run.shopStats.push({dmgMul:0.12,attSpd:0.05});this.recalcStats();this.toast('War standard raised — stronger strikes for this descent.','#e2564a');}
      E.effects.push({kind:'nova',x:it.x,y:it.y,r:84,life:0.42,max:0.42,color:'#e0b355'});K.Audio.sfx('boon');
    } else if (it.kind === 'haggle') {
      it.used=true;const success=this.run.rng.chance(0.68);
      if(success){this.interactables.filter(x=>x.kind==='shop'&&!x.used).forEach(x=>x.cost=Math.max(8,Math.floor(x.cost*0.65)));this.toast('CHARON ACCEPTS — remaining wares 35% cheaper.','#e0b355',true);}
      else {this.player.hp=Math.max(1,this.player.hp-Math.ceil(this.player.stats.maxHp*0.08));this.toast('THE FERRyman DECLINES — the Styx takes 8% life.','#e2564a',true);}
      K.Audio.sfx(success?'coin':'hurt');
    } else if (it.kind === 'healthTrade') {
      it.used=true;const cost=Math.max(12,Math.ceil(this.player.stats.maxHp*0.18));
      if(this.player.hp<=cost){it.used=false;this.toast('Charon will not take your last breath.','#b6a68a');return;}
      this.player.hp-=cost;const paid=this.run.addObols(135+this.regionIndex*25);this.toast('BLOOD FOR COIN — −'+cost+' life, +'+paid+' obols.','#e0b355',true);K.Audio.sfx('coin');
    } else if (it.kind === 'fountain') {
      it.used = true;
      this.player.heal(it.amount, this);
      this.floatText(this.player.x, this.player.y - 34, '+' + it.amount, '#7ad86a');
      K.Audio.sfx('heal');
      E.particles.burst(it.x, it.y, 26, () => {
        const a = Math.random() * TAU, s = 60 + Math.random() * 140;
        return { x: it.x, y: it.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.8, max: 0.8, size: 3.4, color: '#5fd0d8', glow: true, add: true, drag: 0.9 };
      });
      this.toast('The fountain restores you.', '#5fd0d8');
    } else if (it.kind === 'shop') {
      const item = it.item;
      const free = this.player.stats.freeShop >= 1 && !this.run._freeBuy;
      if (!free && this.run.obols < it.cost) { this.toast('Not enough obols. Charon is patient.', '#e0b355'); K.Audio.sfx('ui2'); return; }
      if (!free) this.run.obols -= it.cost;
      else this.run._freeBuy = true;
      it.used = true;
      K.Audio.sfx('coin');
      this.applyShopItem(item);
      this.floatText(it.x, it.y - 30, free ? 'FREE' : ('-' + it.cost), '#e0b355');
      /* restock */
      setTimeout(() => { it.used = true; }, 0);
    }
  };

  Game.prototype.applyShopItem = function (item) {
    switch (item.kind) {
      case 'heal':
        this.player.heal(item.value, this); K.Audio.sfx('heal'); break;
      case 'maxhp':
        this.run.shopStats.push({ maxHp: item.value }); this.recalcStats(); K.Audio.sfx('levelup'); break;
      case 'stat': {
        this.run.shopStats.push(item.fx);
        this.recalcStats();
        K.Audio.sfx('levelup');
        break;
      }
      case 'forge': {
        const all=K.RunSystems.WEAPON_UPGRADES,owned=this.run.weaponUpgrades;
        const pool=all.filter(x=>owned.indexOf(x.id)<0);
        if(pool.length){const upgrade=this.run.rng.pick(pool);owned.push(upgrade.id);this.recalcStats();this.toast('WEAPON TEMPERED — '+upgrade.name+': '+upgrade.desc,'#e8a24a',true);}
        else {this.run.weaponLevel++;this.run.shopStats.push({dmgMul:0.08});this.recalcStats();this.toast('WEAPON REFORGED — damage +8%','#e8a24a',true);}
        K.Audio.sfx('levelup');break;
      }
      case 'relic': {
        const pool = D.RELICS.filter(r => this.run.relics.indexOf(r.id) < 0);
        if (pool.length) {
          const r = this.run.rng.pick(pool);
          this.run.addRelic(r.id);
          this.recalcStats();
          this.toast('RELIC — ' + r.name + ': ' + r.desc, r.color, true);
          K.Audio.sfx('boon');
        } else { this.player.heal(40, this); }
        break;
      }
      case 'gear': {
        const result = K.Gear && K.Gear.add(item.gearItem);
        if (result && result.duplicate) this.toast('CHARON’S DUPLICATE — ' + result.shards + ' SALVAGE SHARDS', '#c58ce8', true);
        else if (result) this.toast('CHARON’S ARMORY — ' + item.gearItem.name, '#e0b355', true);
        K.Audio.sfx('boon');
        break;
      }
      case 'pom': {
        const pool = this.run.boons.filter(b => ['common','rare','epic'].indexOf(b.rarity) >= 0);
        if (pool.length) {
          const b = this.run.rng.pick(pool);
          const before = b.rarity;
          this.run.addBoon(b.id, b.rarity);
          this.recalcStats();
          const after = this.run.boonRarity(b.id);
          if (after !== before) this.toast('POM OF POWER — ' + D.boonById[b.id].name + ' is now ' + D.RARITY[after].name + '!', '#c58ce8', true);
          else this.toast('POM OF POWER — ' + D.boonById[b.id].name + ' empowered.', '#c58ce8', true);
          K.Audio.sfx('levelup');
        } else this.player.heal(30, this);
        break;
      }
    }
  };

  /* ---------------- boon offering ---------------- */
  Game.prototype.rollRarity = function (opts) {
    const rng = this.run.rng;
    const favor = Object.keys(this.run.godFavor || {}).map(id => this.run.godFavor[id] || 0);
    const divineFavor = favor.length ? Math.max(-0.08, Math.min(0.1, Math.max.apply(null, favor) * 0.008)) : 0;
    const bonus = (this.player.stats.rareChance || 0) + (this.regionIndex * 0.05) + divineFavor;
    const pool = ['common', 'rare', 'epic', 'heroic'];
    const w = [
      Math.max(6, 60 - bonus * 90),
      27 + bonus * 55,
      11 + bonus * 40,
      2 + bonus * 12
    ];
    return rng.weighted(pool, w);
  };

  Game.prototype.generateBoonChoices = function (count, opts) {
    opts = opts || {};
    const floorTier = opts.rarityFloor && D.RARITY[opts.rarityFloor] ? D.RARITY[opts.rarityFloor].tier : 0;
    const enforceFloor = rarity => D.RARITY[rarity] && D.RARITY[rarity].tier < floorTier ? opts.rarityFloor : rarity;
    const run = this.run, rng = run.rng;
    const owned = run.boons.map(b => ({ id: b.id, god: b.god, slot: b.slot, rarity: b.rarity }));
    const ownedIds = {};
    owned.forEach(o => ownedIds[o.id] = o);
    const ownedGods = Object.keys(run.gods);
    const choices = [];
    const usedGods = {};
    const maxSlot = 1;
    const storyFavoredGod = Object.keys(run.storyFavor || {}).concat(Object.keys(run.godFavor || {})).filter((g, i, all) => all.indexOf(g) === i &&
      ((run.storyFavor[g] || 0) > 0 || (run.godFavor[g] || 0) > 0) && D.BOONS.some(b => b.god === g))
      .sort((a, b) => ((run.godFavor[b] || 0) + (run.storyFavor[b] || 0) * 3) - ((run.godFavor[a] || 0) + (run.storyFavor[a] || 0) * 3))[0] || null;

    const slotCount = (god, slot) => owned.filter(o => o.god === god && o.slot === slot).length;

    /* 1. duos / legendaries first */
    const specials = D.SPECIAL_BOONS.filter(b => {
      if (ownedIds[b.id]) return false;
      const req = b.req || {};
      if (req.gods) {
        for (const g in req.gods) if ((run.gods[g] || 0) < req.gods[g]) return false;
      }
      if (req.minBoons && run.boons.length < req.minBoons) return false;
      return true;
    });
    if (specials.length && rng.chance(0.34)) {
      const pick = rng.pick(specials);
      choices.push({ id: pick.id, rarity: enforceFloor(pick.rarity), kind: 'special' });
    }

    /* 2. normal boons */
    let guard = 0;
    while (choices.length < count && guard++ < 220) {
      let god;
      const wantNew = ownedGods.length < 4 && rng.chance(0.35);
      if (wantNew) {
        const fresh = Object.keys(D.GODS).filter(g => !run.gods[g]);
        god = fresh.length ? rng.weighted(fresh, g => Math.max(0.25, 1 + (run.godFavor[g] || 0) * 0.08)) : rng.pick(ownedGods.length ? ownedGods : Object.keys(D.GODS));
      } else {
        god = ownedGods.length ? rng.weighted(ownedGods, g => Math.max(0.25, 1 + (run.gods[g] || 0) * 0.85 + (run.godFavor[g] || 0) * 0.08)) : rng.weighted(Object.keys(D.GODS), g => Math.max(0.25, 1 + (run.godFavor[g] || 0) * 0.08));
      }
      if (usedGods[god] && ownedGods.length < 5) continue;
      const pool = D.BOONS.filter(b => {
        if (b.god !== god) return false;
        if (b.req && b.req.gods) { for (const g in b.req.gods) if ((run.gods[g] || 0) < b.req.gods[g]) return false; }
        const cur = run.boonRarity(b.id);
        if (cur === 'heroic') return false;                 // maxed
        if (b.slot !== 'passive' && slotCount(god, b.slot) >= maxSlot) return false;
        if (choices.some(c => c.id === b.id)) return false;
        return true;
      });
      if (!pool.length) continue;
      /* prefer slots the player has not filled with this god */
      const fresh = pool.filter(b => b.slot !== 'passive' && slotCount(god, b.slot) === 0 && !ownedIds[b.id]);
      const pick = (fresh.length && rng.chance(0.7)) ? rng.pick(fresh) : rng.pick(pool);
      const rarity = ownedIds[pick.id] ? this.upgradeRarity(ownedIds[pick.id].rarity) : this.rollRarity();
      choices.push({ id: pick.id, rarity: enforceFloor(rarity), kind: 'boon' });
      usedGods[god] = 1;
    }

    /* fallback: anything at all */
    guard = 0;
    while (choices.length < count && guard++ < 200) {
      const pool = D.BOONS.filter(b => run.boonRarity(b.id) !== 'heroic' && !choices.some(c => c.id === b.id));
      if (!pool.length) break;
      const pick = rng.pick(pool);
      choices.push({ id: pick.id, rarity: enforceFloor(this.rollRarity()), kind: 'boon' });
    }
    const final = run.rng.shuffle(choices);
    if (storyFavoredGod && !final.some(c => D.boonById[c.id] && D.boonById[c.id].god === storyFavoredGod)) {
      const targetIndex = final.findIndex(c => c.kind === 'boon');
      const excluded = final.filter((c, i) => i !== targetIndex).map(c => c.id);
      const favoredPool = D.BOONS.filter(b => b.god === storyFavoredGod && run.boonRarity(b.id) !== 'heroic' &&
        (b.slot === 'passive' || slotCount(storyFavoredGod, b.slot) < maxSlot) && !excluded.includes(b.id));
      if (favoredPool.length) {
        const pick = rng.pick(favoredPool);
        const tribute = { id:pick.id, rarity:enforceFloor(this.rollRarity()), kind:'boon' };
        if (targetIndex >= 0) final[targetIndex] = tribute;
        else if (final.length < count) final.push(tribute);
        else if (final.length) final[final.length - 1] = tribute;
      }
    }
    return rng.shuffle(final);
  };

  Game.prototype.upgradeRarity = function (r) {
    const order = ['common', 'rare', 'epic', 'heroic'];
    const i = order.indexOf(r);
    return order[Math.min(order.length - 1, i + 1)];
  };

  Game.prototype.offerBoons = function (opts) {
    opts = opts || {};
    if (this.pendingReward) return;             /* one offer at a time */
    const baseCount = opts.count === undefined ? 3 + (this.player.stats.extraReward || 0) : Math.max(1, opts.count | 0);
    const count = Math.max(1, baseCount - (this.run.isFatedTrial ? this.run.trialModifiers.boonOfferPenalty : 0));
    const skipBonus = opts.skipBonus || 30;
    this.pendingReward = {
      kind: opts.kind || 'boon',
      choices: this.generateBoonChoices(count, { rarityFloor: opts.rarityFloor }),
      choiceCount: count,
      rarityFloor: opts.rarityFloor || null,
      victoryAfter: !!opts.victoryAfter,
      rerolls: opts.rerolls === undefined ? this.run.rerolls : opts.rerolls,
      skipBonus: skipBonus,
      advanceAfter: opts.advanceAfter === undefined ? !!this._advanceAfter : !!opts.advanceAfter,
      campaignChapter: opts.campaignChapter === undefined ? null : opts.campaignChapter,
      threadAfter: !!opts.threadAfter
    };
    this._advanceAfter = false;
    this.phase = 'reward';
    if (this.onTransition) this.onTransition('reward', this.pendingReward);
  };

  Game.prototype.takeBoon = function (id, rarity) {
    const reward = this.pendingReward;
    if (!reward || (reward.kind !== 'boon' && reward.kind !== 'boss') || !reward.choices.some(c => c.id === id && c.rarity === rarity)) return false;
    const def = D.boonById[id];
    if (!def) return;
    const isNew = !this.run.hasBoon(id);
    this.run.addBoon(id, rarity);
    this.changeGodFavor(def.god, 1, 'accepted a boon', true);
    this.recalcStats();
    K.Audio.sfx('boon');
    const gdef = D.GODS[def.god];
    this.toast(def.name + ' — ' + D.RARITY[rarity].name + (isNew ? '' : ' (upgraded)') + ' · ' + gdef.name + ' favor +1', gdef.color, true);
    this.flashScreen('rgba(255,240,190,0.18)', 0.3);
    this.closeOffer();
    return true;
  };

  /* Closing an offer either returns to the fight or moves to the next chamber,
     depending on whether the gate is what produced it. */
  Game.prototype.closeOffer = function () {
    const reward = this.pendingReward;
    if (!reward) return false;
    this.pendingReward = null;
    if (reward.kind === 'fatedThread') return this.continueAfterReward(reward.continuation);
    const continuation = { campaignChapter:reward.campaignChapter, advanceAfter:reward.advanceAfter, victoryAfter:reward.victoryAfter };
    if (reward.threadAfter) return this.offerFatedThreads(continuation);
    return this.continueAfterReward(continuation);
  };

  Game.prototype.continueAfterReward = function (continuation) {
    continuation = continuation || {};
    this.pendingFatedThreadContinuation = null;
    if (continuation.campaignChapter !== null && continuation.campaignChapter !== undefined) {
      this.beginCampaignStory(continuation.campaignChapter, !!continuation.advanceAfter, !!continuation.victoryAfter);
      return true;
    }
    if (continuation.victoryAfter) { this.phase = 'playing'; this.victory(); return true; }
    this.phase = 'playing';
    if (continuation.advanceAfter) this.advance();
    return true;
  };

  Game.prototype.offerFatedThreads = function (continuation) {
    const run = this.run;
    if (!run || run.practice || run.fatedThreadIds.length >= 2) return this.continueAfterReward(continuation);
    const eligible = K.RunSystems.eligibleFatedThreads(run);
    if (!eligible.length) return this.continueAfterReward(continuation);
    const relevant = eligible.filter(thread => K.RunSystems.threadRelevance(run, thread));
    const choices = [];
    if (relevant.length) choices.push(run.rng.pick(relevant));
    const remainder = eligible.filter(thread => !choices.some(choice => choice.id === thread.id));
    choices.push.apply(choices, run.rng.shuffle(remainder).slice(0, 3 - choices.length));
    if (choices.length < 3) {
      const fallback = K.RunSystems.FATED_THREADS.filter(thread => !run.fatedThreadIds.includes(thread.id) && !choices.some(choice => choice.id === thread.id));
      choices.push.apply(choices, run.rng.shuffle(fallback).slice(0, 3 - choices.length));
    }
    if (choices.length < 3) return this.continueAfterReward(continuation);
    this.pendingFatedThreadContinuation = continuation || {};
    this.pendingReward = { kind:'fatedThread', choices:choices.map(thread => ({ id:thread.id })), rerolls:0, skipBonus:30, continuation:this.pendingFatedThreadContinuation };
    this.phase = 'reward';
    if (this.onTransition) this.onTransition('reward', this.pendingReward);
    return true;
  };

  Game.prototype.takeFatedThread = function (id) {
    const reward = this.pendingReward, run = this.run;
    if (!reward || reward.kind !== 'fatedThread' || !run || !reward.choices.some(choice => choice.id === id)) return false;
    const thread = K.RunSystems.FATED_THREADS.find(item => item.id === id);
    if (!thread || run.fatedThreadIds.includes(id) || run.fatedThreadIds.length >= 2) return false;
    run.fatedThreadIds.push(id);
    this.recalcStats();
    this.toast('FATED THREAD — ' + thread.name + ': ' + thread.desc, '#e8d9ad', true);
    K.Audio.sfx('boon');
    this.closeOffer();
    return true;
  };

  Game.prototype.skipFatedThreads = function () {
    const reward = this.pendingReward;
    if (!reward || reward.kind !== 'fatedThread' || !this.run) return false;
    const gained = this.run.addObols(reward.skipBonus || 30);
    K.Save.data.obols += gained;
    K.Save.write();
    this.run.shopStats.push({ maxHp:8 });
    this.recalcStats();
    this.player.heal(20, this);
    this.toast('THREAD REFUSED — +' + gained + ' obols, +8 maximum life.', '#b6a68a');
    return this.closeOffer();
  };

  Game.prototype.offerRelic = function (count, includeGear) {
    const run = this.run, rng = run.rng;
    if (this.pendingReward) return;             /* one offer at a time */
    const pool = D.RELICS.filter(r => run.relics.indexOf(r.id) < 0);
    const picks = rng.shuffle(pool).slice(0, count || 3).map(r => ({ id: r.id, kind: 'relic' }));
    if (includeGear && K.Gear) {
      const level = K.Gear.itemLevelAtDepth(this.regionIndex, this.chamberIndex);
      const slot = rng.pick(K.Gear.SLOTS), gear = K.Gear.generate(slot, level, rng);
      if (gear) picks.push({ id:'gear:' + gear.id, kind:'gear', item:gear });
    }
    if (!picks.length) { /* all relics owned — the Fates pay in coin instead */
      const paid = this.run.addObols(120);
      K.Save.data.obols += paid; K.Save.write();
      this.toast('Every relic is already yours. The Fates pay ' + paid + ' obols instead.', '#e0b355', true);
      this.phase = 'playing';
      if (this._advanceAfter) { this._advanceAfter = false; this.advance(); }
      return;
    }
    this.pendingReward = {
      kind: 'relic', choices: picks, rerolls: this.run.rerolls, skipBonus: 25,
      advanceAfter: !!this._advanceAfter
    };
    this._advanceAfter = false;
    this.phase = 'reward';
    if (this.onTransition) this.onTransition('reward', this.pendingReward);
  };

  Game.prototype.takeRelic = function (id) {
    const reward = this.pendingReward;
    if (!reward || reward.kind !== 'relic' || !reward.choices.some(c => c.kind === 'relic' && c.id === id)) return false;
    const r = D.relicById[id];
    if (!r) return;
    this.run.addRelic(id);
    this.recalcStats();
    K.Audio.sfx('boon');
    this.toast('RELIC — ' + r.name + ': ' + r.desc, r.color, true);
    this.closeOffer();
    return true;
  };

  Game.prototype.offerAugments = function (opts) {
    opts=opts||{};if(this.pendingReward)return false;
    const owned=this.run.augmentIds||[],pool=K.RunSystems.AUGMENTS.filter(a=>owned.indexOf(a.id)<0);
    const choices=this.run.rng.shuffle(pool).slice(0,3).map(a=>({id:a.id,kind:'augment'}));
    if(!choices.length){this.run.addObols(90);this.phase='playing';if(opts.advanceAfter)this.advance();return false;}
    this.pendingReward={kind:'augment',choices,rerolls:0,skipBonus:0,advanceAfter:!!opts.advanceAfter};
    this.phase='reward';if(this.onTransition)this.onTransition('reward',this.pendingReward);return true;
  };

  Game.prototype.takeAugment = function (id) {
    const reward=this.pendingReward;
    if(!reward||reward.kind!=='augment'||!reward.choices.some(c=>c.id===id))return false;
    const a=K.RunSystems.AUGMENTS.find(x=>x.id===id);if(!a)return false;
    this.run.augmentIds.push(id);this.recalcStats();this.toast('AUGMENT — '+a.name+': '+a.desc,a.color,true);K.Audio.sfx('boon');this.closeOffer();return true;
  };

  Game.prototype.takeGear = function (item) {
    const reward = this.pendingReward;
    if (!reward || reward.kind !== 'relic' || !reward.choices.some(c => c.kind === 'gear' && c.item === item)) return false;
    if (!K.Gear || !item) return false;
    const result = K.Gear.add(item);
    if (!result) return false;
    this.toast(result.duplicate ? 'DUPLICATE — ' + result.shards + ' SALVAGE SHARDS' : 'ARMORY — ' + item.name, '#e0b355', true);
    K.Audio.sfx('boon');
    this.closeOffer();
    return result;
  };

  /* ---------------- chamber clear / progression ---------------- */
  Game.prototype.checkRoomClear = function () {
    if (this.roomDef.cleared || this.pendingSpawns.length) return;
    const hostile = E.enemies.filter(e => !e.ally && !e.dead && e.hp > 0).length;
    if (hostile > 0) return;
    this.roomDef.cleared = true; this.roomClearT = 0;
    const st = this.player.stats;
    if (st.healRoom) this.player.heal(st.maxHp * st.healRoom, this);
    const condition = this.roomDef.condition;
    if (condition && condition.obols) this.run.addObols(condition.obols);
    if(this.roomDef.type==='challenge')this.progressQuest('challenge');
    if (this.roomDef.type === 'boss' || this.roomDef.type === 'optionalboss') this.pendingChamberReward = 'boss';
    else if (this.roomDef.type === 'miniboss') this.pendingChamberReward = 'augment';
    else if (this.roomDef.type === 'combat' || this.roomDef.type === 'risk' || this.roomDef.type === 'challenge' || this.roomDef.type === 'elite') this.pendingChamberReward = 'boon';
    else if (this.roomDef.type === 'treasure') this.pendingChamberReward = 'relic';
    else this.pendingChamberReward = null;
    this.openExitGate(); K.Audio.sfx('levelup');
    this.toast('CHAMBER CLEARED — the way opens', '#e0b355', true);
  };

  /* The gate is where the chamber lets you leave, and where rewards land. */
  Game.prototype.openExitGate = function () {
    const b = this.arena;
    const gx = 0;
    const gy = b.y + 96;
    this.exitGate = {
      kind: 'gate', x: gx, y: gy, radius: 34,
      used: false, cleared: true
    };
    this.interactables.push(this.exitGate);
    E.effects.push({ kind: 'summonRing', x: gx, y: gy, r: 60, life: 1.2, max: 1.2, color: '#e0b355' });
    E.particles.burst(gx, gy, 26, () => {
      const a = Math.random() * TAU, s = 40 + Math.random() * 120;
      return { x: gx, y: gy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 1.0, max: 1.0, size: 3.6, color: '#f0cf5e', glow: true, add: true, drag: 0.92 };
    });
    K.Audio.sfx('gate');
  };

  Game.prototype.beginBossStageTransition = function (b) {
    if (!b || b.dead || b.stageTransitionT > 0 || !b.stageQueue || !b.stageQueue.length) return false;
    const stage = b.stageQueue.shift();
    b.phase = stage;
    b.stageTransitionT = 1.05;
    b.state = 'transition'; b.stateT = 0; b.atkCd = Math.max(b.atkCd, 0.55);
    b.mem = {};
    if (b.id === 'lion' || b.familyId === 'lion') b.exposedT = Math.max(b.exposedT, 1.05);
    const pd = b.def.phases[stage];
    this.toast(pd.name + (pd.sub ? ' — ' + pd.sub : ''), '#e2564a', true);
    E.cam.addShake(12); K.Audio.sfx('roar');
    this.flashScreen('rgba(200,60,40,0.22)', 0.4);
    const family = { lion:0, medusa:4, hydra:8, typhon:12 }[b.familyId || b.def.ai] || 0;
    /* Neutralize in place: this can run from inside either update loop. */
    for (let i = E.projectiles.length - 1; i >= 0; i--) if (!E.projectiles[i].friendly) E.projectiles[i].life = 0;
    for (let i = this.hazards.length - 1; i >= 0; i--) if (!this.hazards[i].friendly) this.hazards[i].life = 0;
    for (let i = E.effects.length - 1; i >= 0; i--) if (E.effects[i].kind === 'telegraph' || E.effects[i].kind === 'cone') E.effects.splice(i, 1);
    E.effects.push({ kind: 'bossStage', x: b.x, y: b.y - b.radius * 0.5, r: 136, life: 1.05, max: 1.05, frame: (family + stage) % 16, color: b.color });
    for (const o of E.enemies) if (!o.dead && !o.ally && o !== b) this.knockback(o, U.ang(b.x, b.y, o.x, o.y), 260);
    return true;
  };
  Game.prototype.useExitGate = function () {
    const gate = this.exitGate;
    if (!gate || gate.used || this.phase === 'victory') return false;
    gate.used = true;
    const reward = this.pendingChamberReward;
    const index = this.interactables ? this.interactables.indexOf(gate) : -1;
    if (index >= 0) this.interactables.splice(index, 1);
    this.exitGate = null;
    this.pendingChamberReward = null;
    K.Audio.sfx('gate');
    if (reward === 'augment') { this._advanceAfter=true; this.offerAugments({advanceAfter:true}); return true; }
    if (reward === 'relic') {
      this._advanceAfter = true; this.offerRelic(3, this.roomDef && this.roomDef.type === 'treasure'); return true;
    }
    if (reward === 'boss') {
      const final = !!(this.roomDef && this.roomDef.isFinalCapstone);
      const chapter = this.roomDef && this.roomDef.idx >= 7 ? this.regionIndex : null;
      this.run.addObols(100 + this.regionIndex * 40);
      this._advanceAfter = false;
      const threadAfter = !!(this.roomDef && this.roomDef.type === 'boss' && (this.regionIndex === 7 || this.regionIndex === 15));
      this.offerBoons({ kind: 'boss', count: 4, rarityFloor: 'rare', skipBonus: 120, advanceAfter: !final, victoryAfter: final, campaignChapter:chapter, threadAfter });
      return true;
    }
    if (reward) { this._advanceAfter = true; this.offerBoons(this.roomDef&&this.roomDef.type==='risk'?{rarityFloor:'rare'}:{}); return true; }
    this._advanceAfter = false; this.advance(); return true;
  };

  Game.prototype.beginCampaignStory = function (chapterIndex, advanceAfter, victoryAfter) {
    const chapter = D.CAMPAIGN_STORY && D.CAMPAIGN_STORY[chapterIndex];
    if (!chapter) {
      this.phase = 'playing';
      if (victoryAfter) this.victory(); else if (advanceAfter) this.advance();
      return false;
    }
    this.pendingStory = { chapterIndex, chapter, advanceAfter:!!advanceAfter, victoryAfter:!!victoryAfter };
    this.phase = 'story';
    if (this.onTransition) this.onTransition('story', this.pendingStory);
    return true;
  };

  Game.prototype.chooseStory = function (choiceId) {
    const pending = this.pendingStory, chapter = pending && pending.chapter;
    const choice = chapter && chapter.choices.find(c => c.id === choiceId);
    if (!choice) return false;
    const run = this.run, save = K.Save.data;
    if (choice.affinity) { run.storyFavor[choice.affinity] = (run.storyFavor[choice.affinity] || 0) + 1; this.changeGodFavor(choice.affinity, 2, 'campaign choice', true); }
    if (choice.side) run.storyAlignment[choice.side] = (run.storyAlignment[choice.side] || 0) + 1;
    if (choice.heal) this.player.heal(choice.heal, this);
    if (choice.obols) run.addObols(choice.obols);
    chapter.voices.forEach(voice => { if (voice.godId && D.GODS[voice.godId]) save.seenGods[voice.godId] = 1; });
    run.storyChoices.push(choice.id);
    run.storyChapters.push(pending.chapterIndex);
    if (choice.ending) run.campaignEnding = choice.ending;
    const archive = {
      run:run.ordinal, seed:run.seed, chapter:pending.chapterIndex + 1,
      region:(this.region() && this.region().name) || chapter.title,
      title:chapter.title, intro:chapter.intro, voices:chapter.voices,
      choice:choice.title, reply:choice.reply, side:choice.side || null, ending:choice.ending || null
    };
    save.campaignArchive.push(archive);
    K.Save.write();
    this.toast(choice.title + ' — ' + (choice.affinity ? ((D.GODS[choice.affinity] && D.GODS[choice.affinity].name) || choice.affinity.toUpperCase()) : 'your choice') + ' remembers.', '#f0cf5e', true);
    this.pendingStory = null;
    if (pending.victoryAfter) { this.phase = 'playing'; this.victory(); }
    else if (pending.advanceAfter) { this.phase = 'playing'; this.advance(); }
    else this.phase = 'playing';
    if (this.onTransition) this.onTransition('storyDone', choice);
    return true;
  };
  Game.prototype.onBossEnter = function (b) {
    this.toast(b.def.intro, '#f0cf5e', true);
    K.Audio.sfx('roar');
    this.cam.addShake(10);
    this.bossName = b.def.name;
  };
  Game.prototype.onBossDeath = function (b) {
    this.toast(b.def.name + ' FALLS', '#f0cf5e', true);
    E.cam.addShake(24);
    this.slowMo = 1.4;
    K.Audio.sfx('victory');
    this.pendingChamberReward = 'boss';
    if (!this.practiceMode && this.roomDef && this.roomDef.type === 'boss' && this.roomDef.idx >= 7) {
      const milestone = this.regionIndex === 0 ? 'firstCapstone' : this.regionIndex === 7 ? 'actI' : this.regionIndex === 15 ? 'actII' : null;
      if (milestone) K.RunSystems.recordCampaignMilestone(K.Save.data, this.run, milestone);
    }
    this.boss = null;
    if (this.roomDef && this.roomDef.type === 'boss' && this.roomDef.idx >= 7 && K.Paragon) K.Paragon.unlock();
  };

  Game.prototype.buildRouteChoices = function () {
    const region = this.region(), rng = this.run.rng, nextIdx = this.chamberIndex + 1;
      const types = rng.shuffle(['combat','elite','treasure','shop','event','challenge','optionalboss','risk','miniboss']);
    const count = rng.int(2, 3), out = [];
    for (let i = 0; i < count; i++) {
      const type = types[i];
      const safeRoute = type === 'shop' || type === 'event';
      const families = safeRoute ? [] : rng.shuffle(region.enemyFamilies || region.enemies).slice(0, 3);
      const squad = [];
      families.forEach(family => Object.keys(D.ENEMIES).forEach(id => {
        const def = D.ENEMIES[id]; if (!def.summon && (def.sourceId || id) === family) squad.push(id);
      }));
      const rolledCondition = rng.pick(D.CHAMBER_CONDITIONS);
      const condition = safeRoute ? { id:'quiet-tithe', name:'Quiet Tithe', desc:'No enemies or combat modifiers; this room offers ' + rolledCondition.obols + ' obols.', obols:rolledCondition.obols } : rolledCondition;
      let eventId = null, bossId = null;
      if (type === 'event') eventId = rng.pick(D.ROOM_EVENTS).id;
      if (type === 'optionalboss') {
        const aspects = Object.keys(D.BOSSES).filter(id => D.BOSSES[id].generatedVariant && D.BOSSES[id].variantId && D.BOSSES[id].variantId.indexOf('aspect-') === 0);
        bossId = rng.pick(aspects);
      }
      const labels = { combat:'Combat', risk:'Blood-Tithe Room', miniboss:'Mythic Nemesis', elite:'Champion', treasure:'Treasure', shop:'Charon’s Shop', event:'Fateful Event', challenge:'Trial', optionalboss:'Optional Boss' };
      const danger = type === 'shop' || type === 'event' || type === 'treasure' ? 'Measured' : (type === 'optionalboss' || type === 'elite' || type === 'challenge' || type === 'miniboss' || type === 'risk' ? 'Severe' : 'Steady');
      const reward = type === 'shop' ? 'Forge upgrade, haggle, or trade life' : type === 'treasure' ? 'Relic and obols' : type === 'event' ? 'Choose a bargain' : type === 'optionalboss' ? 'Boss boon and bonus obols' : type === 'miniboss' ? 'Choose a run augment' : type === 'risk' ? 'Enhanced boon for 12% life' : type === 'elite' ? 'Boon after an elite champion' : type === 'challenge' ? 'Boon after the Trial chamber' : 'Boon after the fight';
      const event = eventId && D.ROOM_EVENTS.find(e => e.id === eventId);
      const familyNames = type === 'optionalboss' ? (D.BOSSES[bossId] && D.BOSSES[bossId].name) : (type==='miniboss'?'A unique champion with a signature attack':families.map(id => D.ENEMIES[id] && D.ENEMIES[id].name).filter(Boolean).slice(0, 2).join(' and '));
      const cost = type === 'risk' ? '12% maximum health' : type === 'event' ? 'Varies by event choice' : 'None';
      const synergyTag = (this.run.activeSynergies || []).map(s => s.name).slice(0, 2).join(' · ');
      out.push({ id:'route-' + this.regionIndex + '-' + nextIdx + '-' + i, regionId:region.id, type, title:labels[type] + ' · ' + condition.name,
        desc:event ? event.desc : '', danger, reward, cost,
        condition:{ id:condition.id, name:condition.name, desc:condition.desc }, conditionId:condition.id,
        conditionData:safeRoute ? condition : null,
        eventId, bossId, squad, families, familyNames, synergyTag });
    }
    return out;
  };

  Game.prototype.selectRoute = function (choiceId) {
    if (this.phase !== 'route') return false;
    const node = (this.pendingRouteChoices || []).find(choice => choice.id === choiceId);
    if (!node) return false;
    this.pendingRouteChoices = []; this.phase = 'playing';
    this.enterChamber(this.chamberIndex + 1, node);
    if (this.phase === 'playing' && this.onTransition) this.onTransition('routeSelected', node);
    return true;
  };

  Game.prototype.changeGodFavor = function (godId, amount, reason, quiet) {
    const god = D.GODS[godId], run = this.run;
    if (!god || !run || !amount) return run && run.godFavor[godId] || 0;
    run.godFavor = run.godFavor || {};
    const before = run.godFavor[godId] || 0;
    const after = Math.max(-12, Math.min(12, before + Math.round(amount)));
    const delta = after - before;
    if (!delta) return after;
    run.godFavor[godId] = after;
    const entry = { godId, delta, favor:after, reason:reason || 'divine encounter', region:(this.region() && this.region().name) || '', chamber:this.chamberIndex + 1 };
    run.godFavorHistory.push(entry);
    K.Save.data.seenGods[godId] = 1;
    let rivalNotice = '';
    if (delta < 0 && god.rivals && god.rivals.length) {
      const rivalId = god.rivals[(run.godFavorHistory.length - 1) % god.rivals.length], rival = D.GODS[rivalId];
      if (rival) {
        const rivalBefore = run.godFavor[rivalId] || 0, rivalAfter = Math.min(12, rivalBefore + 1);
        run.godFavor[rivalId] = rivalAfter;
        if (rivalAfter !== rivalBefore) run.godFavorHistory.push({ godId:rivalId, delta:1, favor:rivalAfter, reason:'rivalry', region:entry.region, chamber:entry.chamber });
        rivalNotice = ' ' + rival.name + ' gains +1.';
      }
    }
    K.Save.write();
    if (!quiet) this.toast(god.name + ' favor ' + (delta > 0 ? '+' : '') + delta + rivalNotice, god.color, true);
    return after;
  };

  Game.prototype.chooseEvent = function (choiceId) {
    const event = this.activeEvent;
    const choice = event && event.choices.find(c => c.id === choiceId);
    if (!choice || !this.roomDef || this.roomDef.type !== 'event') return false;
    const cost = Math.max(0, Math.round(choice.costObols || 0));
    if (cost > this.run.obols) { this.toast('The offering needs ' + cost + ' obols.', '#e2564a'); return false; }
    if (cost) this.run.obols -= cost;
    if (choice.damage) this.player.hp = Math.max(1, this.player.hp - choice.damage);
    if (choice.heal) this.player.heal(choice.heal, this);
    if (choice.obols) this.run.addObols(choice.obols);
    const condition = this.roomDef.condition;
    if (condition && condition.obols) this.run.addObols(condition.obols);
    if (choice.fx) { this.run.shopStats.push(choice.fx); this.recalcStats(); }
    const godId = event.godId || choice.godId;
    if (godId && choice.favorDelta) this.changeGodFavor(godId, choice.favorDelta, choice.title);
    if (event.godId) { K.Save.data.seenGods[event.godId] = 1; this.run.divineVisits.push(event.godId); }
    this.roomDef.cleared = true; this.pendingChamberReward = null;
    this.activeEvent = null; this.phase = 'playing'; this.openExitGate();
    this.toast(event.name + ' — ' + choice.title, '#d7c78d', true);
    if (this.onTransition) this.onTransition('eventDone', choice);
    return true;
  };

  Game.prototype.advance = function () {
    if (this.chamberIndex >= 7) {
      if (this.regionIndex >= D.REGIONS.length - 1) { this.victory(); return; }
      this.regionIndex++; this.chamberIndex = 0;
      K.Audio.playRegion(D.REGIONS[this.regionIndex], 'calm');
      this.phase = 'playing'; this.enterChamber(0); return;
    }
    if (this.chamberIndex >= 6) {
      this.phase = 'playing'; this.enterChamber(7); return;
    }
    this.pendingRouteChoices = this.buildRouteChoices();
    this.phase = 'route';
    if (this.onTransition) this.onTransition('route', this.pendingRouteChoices);
  };

  Game.prototype.victory = function () {
    if (!this.run || this.run.outcome) return false;
    this.phase = 'victory';
    this.recordWin();
    if (this.onTransition) this.onTransition('victory', this.run);
  };

  Game.prototype.die = function () {
    if (!this.run || this.run.outcome || !this.player) return false;
    const p = this.player;
    if (this.run.deathDefy > 0) {
      this.run.deathDefy--;
      this.run.deathDefySpent = (this.run.deathDefySpent || 0) + 1;
      p.hp = Math.max(1, Math.round(p.stats.maxHp * 0.45));
      p.invuln = 2.6;
      p.shield = Math.max(p.shield, 30);
      this.flashScreen('rgba(255,240,190,0.6)', 0.7);
      E.cam.addShake(20);
      K.Audio.sfx('levelup');
      /* push enemies away */
      for (const e of E.enemies) if (!e.dead && !e.ally) this.knockback(e, U.ang(p.x, p.y, e.x, e.y), 700);
      ringFx(this, p.x, p.y, 260, '#f0cf5e', 40);
      this.toast('DEATH DEFIANCE — you rise again!', '#f0cf5e', true);
      return;
    }
    if (this.practiceMode) { p.hp=Math.max(1,Math.round(p.stats.maxHp*0.7)); p.shield=0; p.invuln=1.2; this.practiceSpawn(this.practiceEnemyId||'dummy'); this.toast('PRACTICE RESET','#8fe3c8'); return; }
    p.dead = true;
    p.hp = 0;
    this.phase = 'dead';
    this.deathT = 0;
    K.Audio.stopMusic();
    K.Audio.sfx('death');
    this.recordNemesis();
    this.recordDeath();
    if (this.onTransition) this.onTransition('gameover', this.run);
  };

  Game.prototype.recordDeath = function () {
    if (!this.run || this.run.outcome) return false;
    this.run.outcome = 'death';
    if (this.run.practice) return true;
    const s = K.Save.data;
    s.deaths++;
    s.totalTime += this.run.stats.time;
    s.obols = s.obols;   // already accumulated
    K.Save.write();
  };
  Game.prototype.recordWin = function () {
    if (!this.run || this.run.outcome) return false;
    this.run.outcome = 'victory';
    if (this.run.practice) return true;
    const s = K.Save.data;
    s.wins++;
    K.RunSystems.recordCampaignMilestone(s, this.run, 'campaignVictory');
    s.fatedTrialsUnlocked = true;
    s.totalTime += this.run.stats.time;
    const t = this.run.stats.time;
    if (s.fastestWin === null || t < s.fastestWin) s.fastestWin = t;
    if (this.run.isFatedTrial && this.run.trialScore >= 1) this.run.trialResult = K.RunSystems.recordTrialVictory(s, this.run);
    K.Save.write();
  };

  /* ---------------- update ---------------- */
  Game.prototype.abandon = function () {
    if (!this.run || this.run.outcome) return false;
    this.player.dead = true; this.player.hp = 0; this.phase = 'dead';
    K.Audio.stopMusic(); this.recordDeath();
    if (this.onTransition) this.onTransition('gameover', this.run);
    return true;
  };

  Game.prototype.update = function (dt) {
    const In = K.Input;
    this.realTime += dt;

    /* hitstop / slow-mo */
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.25; }
    if (this.slowMo > 0) { this.slowMo -= dt; }
    let scale = this.timeScale * (this.slowMo > 0 ? 0.35 : 1);
    if (this.phase === 'dead') scale *= 0.35;
    const sdt = dt * scale;
    this.time += sdt;
    if (this.phase === 'playing' || this.phase === 'dead') this.run && (this.run.stats.time += dt);

    const p = this.player;
    if (!p) return;

    if(this.roomDef&&!this.practiceMode){
      const hostiles=E.enemies.filter(e=>e&&!e.dead&&!e.ally&&e.hp>0);
      const layer=this.roomDef.isBoss?'boss':(hostiles.some(e=>e.isMiniBoss)?'miniboss':(hostiles.length?'combat':'calm'));
      if(layer!==this._audioLayer){K.Audio.setMusicLayer(layer);this._audioLayer=layer;}
    }

    /* mouse world position */
    const m = In.mouse;
    const w = this.cam.toWorld(m.x, m.y);
    m.wx = w.x; m.wy = w.y;

    if (this.phase === 'playing') {
      p.update(sdt, this);
      /* a blow that empties the bar ends the run (or burns a Death Defiance) */
      if (!p.dead && p.hp <= 0) this.die();
    } else if (this.phase === 'dead') {
      /* let physics settle */
      p.vx *= 0.9; p.vy *= 0.9;
      p.x += p.vx * sdt; p.y += p.vy * sdt;
      this.deathT += dt;
    }

    if (this.run.hermesBoost > 0) {
      this.run.hermesBoost = Math.max(0, this.run.hermesBoost - dt);
      if (this.run.hermesBoost === 0) this.recalcStats();
    }

    /* entities */
    for (let i = E.enemies.length - 1; i >= 0; i--) {
      const e = E.enemies[i];
      e.update(sdt, this);
      if (e.removeMe) E.enemies.splice(i, 1);
    }
    this.releaseSpawnQueue();
    E.updateEffects(sdt);
    E.updateHazards(sdt, this);
    this.particles.update(sdt);

    /* pending bolts */
    if (this.pendingBolts) {
      for (let i = this.pendingBolts.length - 1; i >= 0; i--) {
        const b = this.pendingBolts[i];
        b.t -= sdt;
        if (b.t <= 0) { b.fire(); this.pendingBolts.splice(i, 1); }
      }
    }

    /* pickups */
    for (let i = E.pickups.length - 1; i >= 0; i--) {
      const pk = E.pickups[i];
      pk.update(sdt);
      if (pk.dead) E.pickups.splice(i, 1);
    }

    /* interactables proximity */
    this.nearInteract = null;
    let bd = 70 * 70;
    for (const it of this.interactables) {
      if (it.used) continue;
      const d = U.dist2(p.x, p.y, it.x, it.y);
      if (d < bd) { bd = d; this.nearInteract = it; }
    }
    if (this.nearInteract && this.nearInteract.kind !== 'gate' && In.hit('KeyE')) {
      this.doInteract(this.nearInteract);
    }

    /* room clear check */
    if (!this.practiceMode && this.phase === 'playing' && !this.roomDef.cleared) this.checkRoomClear();

    /* ambient particles */
    this.ambientT += dt;
    if (this.ambientT > 0.09) {
      this.ambientT = 0;
      this.spawnAmbient();
    }

    /* banner */
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    /* call cinematic */
    if (this.cinematic) {
      this.cinematic.t -= dt;
      if (this.cinematic.t <= 0) { this.cinematic = null; this.timeScale = 1; this.cam.tzoom = 1; }
    }
    /* camera */
    const lookX = p.x + Math.cos(p.aim) * 34;
    const lookY = p.y + Math.sin(p.aim) * 34;
    this.cam.follow(p.x * 0.65 + lookX * 0.35, p.y * 0.85 + lookY * 0.15, dt);
    if (this.phase === 'dead') this.cam.tzoom = 1.35;
    if (this.cinematic) this.cam.tzoom = 1.14;
    this.flash = Math.max(0, this.flash - dt * 2.4);

    /* toasts decay */
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].t -= dt;
      if (this.toasts[i].t <= 0) this.toasts.splice(i, 1);
    }
    if (this.statsDirty) this.recalcStats();
  };

  Game.prototype.spawnAmbient = function () {
    const b = this.arena, rng = this.region();
    const kind = this.regionIndex;
    if (Math.random() < 0.5) {
      E.particles.spawn({
        x: b.x + Math.random() * b.w, y: b.y + b.h - 6,
        vx: (Math.random() - 0.5) * 18, vy: -14 - Math.random() * 20,
        life: 1.6, max: 1.6, size: 1.6 + Math.random() * 2.4,
        color: kind === 0 ? 'rgba(200,70,40,0.42)' : kind === 1 ? 'rgba(120,220,200,0.36)' : kind === 2 ? 'rgba(255,150,60,0.4)' : 'rgba(200,190,255,0.34)',
        glow: true, add: true, drag: 0.99
      });
    } else {
      E.particles.spawn({
        x: b.x + Math.random() * b.w, y: b.y + Math.random() * b.h,
        vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 8,
        life: 2.4, max: 2.4, size: 1 + Math.random() * 1.6,
        color: kind === 0 ? 'rgba(220,90,50,0.22)' : kind === 1 ? 'rgba(150,240,220,0.2)' : kind === 2 ? 'rgba(255,180,80,0.22)' : 'rgba(230,215,140,0.2)',
        glow: true, add: true, drag: 1
      });
    }
  };

  Game.prototype.toast = function (text, color, big) {
    this.toasts.push({ text, color: color || '#e0b355', big: !!big, t: big ? 3.0 : 2.2, max: big ? 3.0 : 2.2, id: Math.random() });
    if (this.toasts.length > 6) this.toasts.shift();
  };

  Game.prototype.roomTrack = function () {
    const path = this.run && this.run.routePath && this.run.routePath[this.regionIndex] || [];
    const out = [];
    for (let i = 0; i < 8; i++) out.push(path[i] ? path[i].type : (i === 7 ? 'boss' : 'route'));
    return out;
  };

  window.K.Game = Game;
  window.K.compileStats = compileStats;
  window.K.applyFx = applyFx;
  window.K.resolveBoonFx = resolveBoonFx;
  window.K.Run = Run;
})();
