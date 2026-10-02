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
    legendary:{ factor:2, affixes:4, salvage:5 }
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
      weaponId:'xiphos', baseEffects:{ dmgMul:0.012 }, affixes:[], upgrades:0 };
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
    return { id:raw.id, templateId:t.id, slot:t.slot, name:typeof raw.name === 'string' ? raw.name : t.name,
      rarity, level, setId:typeof raw.setId === 'string' && Object.prototype.hasOwnProperty.call(SETS, raw.setId) ? raw.setId : (t.setId || null), weaponId:t.weaponId || (typeof raw.weaponId === 'string' ? raw.weaponId : null),
      baseEffects:Object.keys(cleanFx(raw.baseEffects)).length ? cleanFx(raw.baseEffects) : cleanFx(t.baseEffects),
      affixes, upgrades:Number.isSafeInteger(raw.upgrades) && raw.upgrades >= 0 ? raw.upgrades : 0 };
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
      item.affixes.map(a => [a.id, Object.keys(a.fx || {}).sort().map(k => [k, a.fx[k]])])]);
  }
  function uniqueId(candidate, inventory, rng) {
    let id = candidate, suffix = 0;
    while (inventory.some(x => x.id === id)) { suffix++; id = candidate + '-' + (rng ? Math.floor(rng.next() * 0xffffff).toString(36) : suffix.toString(36)); }
    return id;
  }
  function safeAdd(a, b) { return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(a || 0) + Math.floor(b || 0))); }

  GEAR.normalizeSave = function (save) {
    if (!save || typeof save !== 'object') return save;
    save.gearInventory = (Array.isArray(save.gearInventory) ? save.gearInventory : []).map(normalizeItem).filter(Boolean);
    if (!save.gearInventory.length) save.gearInventory.push(freshStarter());
    const used = new Set();
    save.gearInventory.forEach(item => { if (used.has(item.id)) item.id = uniqueId(item.id, save.gearInventory.filter(x => x !== item)); used.add(item.id); });
    if (!save.equippedGear || typeof save.equippedGear !== 'object' || Array.isArray(save.equippedGear)) save.equippedGear = {};
    SLOTS.forEach(slot => {
      const id = save.equippedGear[slot];
      const item = id && itemById(save, id);
      save.equippedGear[slot] = item && item.slot === slot ? item.id : null;
    });
    if (!save.equippedGear.weapon) {
      const starter = itemById(save, 'starter-xiphos') || save.gearInventory.find(x => x.slot === 'weapon');
      if (starter) save.equippedGear.weapon = starter.id;
    }
    const weapon = itemById(save, save.equippedGear.weapon);
    if (weapon) {
      const weaponId = weapon.weaponId || weapon.templateId;
      if (WEAPONS[weaponId]) {
        save.weapon = weaponId;
        if (!Array.isArray(save.unlockedWeapons)) save.unlockedWeapons = ['xiphos'];
        if (!save.unlockedWeapons.includes(weaponId)) save.unlockedWeapons.push(weaponId);
      } else save.weapon = 'xiphos';
    }
    save.salvageShards = Number.isSafeInteger(save.salvageShards) && save.salvageShards >= 0 ? save.salvageShards : 0;
    return save;
  };

  GEAR.generate = function (slot, level, rng, rarity) {
    if (!SLOTS.includes(slot)) return null;
    rng = rng && typeof rng.next === 'function' ? rng : new K.RNG(Math.floor(Math.random() * 0xffffffff));
    const options = TEMPLATES.filter(t => t.slot === slot);
    const template = options[Math.floor(rng.next() * options.length)];
    const tier = rarityKey(rarity || rng.weighted(['common','rare','epic','heroic','legendary'], [58,24,11,5,2]));
    const tierInfo = RARITIES[tier];
    const picked = rng.shuffle(AFFIXES).slice(0, tierInfo.affixes).map(a => ({ id:a.id, name:a.name, fx:Object.assign({}, a.fx) }));
    const set = template.setId ? SETS[template.setId] : null;
    const prefix = { common:'Worn', rare:'Fine', epic:'Epic', heroic:'Heroic', legendary:'Legendary' }[tier];
    const id = 'gear-' + Math.floor(rng.next() * 0x100000000).toString(36) + '-' + slot;
    return { id, templateId:template.id, slot, name:(tier === 'common' ? '' : prefix + ' ') + template.name,
      rarity:tier, level:Math.min(MAX_POWER_LEVEL, Number.isSafeInteger(level) && level > 0 ? level : 1),
      setId:template.setId || null, setName:set ? set.name : null, weaponId:template.weaponId || null,
      baseEffects:Object.assign({}, template.baseEffects), affixes:picked, upgrades:0 };
  };

  GEAR.add = function (raw) {
    const save = K.Save.data, item = normalizeItem(raw);
    if (!item) return false;
    const fp = fingerprint(item), dupe = save.gearInventory.find(x => fingerprint(x) === fp);
    if (dupe) {
      save.salvageShards = safeAdd(save.salvageShards, RARITIES[item.rarity].salvage);
      K.Save.write();
      return { added:false, duplicate:true, shards:RARITIES[item.rarity].salvage };
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
  GEAR.upgrade = function (instanceId) {
    const save = K.Save.data, item = itemById(save, instanceId);
    if (!item || GEAR.effectiveLevel(item) >= MAX_POWER_LEVEL) return false;
    const cost = GEAR.upgradeCost(item);
    if (save.obols < cost || save.salvageShards < 1) return false;
    save.obols -= cost; save.salvageShards -= 1; item.level++; item.upgrades++;
    writeAndRecalc();
    return { cost, level:item.level };
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
    const shards = RARITIES[rarityKey(item.rarity)].salvage;
    save.gearInventory.splice(save.gearInventory.indexOf(item), 1);
    save.salvageShards = safeAdd(save.salvageShards, shards); K.Save.write();
    return { shards };
  };

  GEAR.effects = function (save) {
    save = save || K.Save.data;
    const total = {}, counts = {};
    function add(fx, scale) {
      Object.keys(fx || {}).forEach(k => { if (typeof fx[k] === 'number' && Number.isFinite(fx[k])) total[k] = (total[k] || 0) + fx[k] * scale; });
    }
    SLOTS.forEach(slot => {
      const item = itemById(save, save.equippedGear && save.equippedGear[slot]);
      if (!item) return;
      const scale = GEAR.effectiveLevel(item) * RARITIES[rarityKey(item.rarity)].factor;
      add(item.baseEffects, scale);
      item.affixes.forEach(a => add(a.fx, scale));
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
  K.Gear = GEAR;
})();
