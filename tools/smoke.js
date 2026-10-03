/* ============================================================
   KATABASIS — headless smoke test.
   Loads the real game modules against a minimal DOM/canvas shim
   and drives the actual game loop: combat, dashes, wraths, calls,
   shops, gates, bosses, boons, relics, death, victory.
   Run:  node tools/smoke.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const noop = () => {};

/* ---------------- 2D context shim ---------------- */
function makeGradient() {
  return { addColorStop: noop };
}
function makeCtx2D() {
  const c = {
    canvas: { width: 1280, height: 800 },
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt',
    lineJoin: 'miter', font: '10px serif', textAlign: 'left', textBaseline: 'alphabetic',
    shadowColor: '#000', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    miterLimit: 10, lineDashOffset: 0,
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop, transform: noop,
    setTransform: noop, resetTransform: noop, clearRect: noop, fillRect: noop, strokeRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop, arcTo: noop,
    ellipse: noop, rect: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fill: noop, stroke: noop, clip: noop, drawImage: noop,
    fillText: noop, strokeText: noop, measureText: () => ({ width: 10 }),
    setLineDash: noop, getLineDash: () => [],
    createLinearGradient: makeGradient, createRadialGradient: makeGradient,
    createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, createImageData: () => ({ data: new Uint8ClampedArray(4) })
  };
  return c;
}

/* ---------------- DOM shim ---------------- */
const IDS = [
  'game', 'hud', 'hud-top', 'vitals', 'hp-bar', 'hp-ghost', 'hp-text', 'shield-row',
  'region-plaque', 'region-name', 'room-track', 'right-stack', 'obol-count', 'obol-num',
  'dash-pips', 'boss-bar-wrap', 'boss-name', 'boss-bar', 'boss-sub', 'boss-stage-name', 'boss-stage-pips', 'boon-tray', 'relic-tray',
  'ability-bar', 'ab-attack', 'ab-dash', 'ab-special', 'ab-call', 'toasts', 'interact-hint',
  'veil', 'screen-title', 'screen-room', 'screen-reward', 'screen-gameover', 'screen-victory',
  'screen-codex', 'screen-meta', 'screen-help', 'screen-pause',
  'btn-begin', 'btn-boons', 'btn-meta', 'btn-help', 'meta-preview',
  'room-kicker', 'room-title', 'room-desc', 'story-voices', 'room-choices',
  'reward-kicker', 'reward-title', 'reward-choices', 'btn-reroll', 'reroll-count',
  'btn-skip-boon', 'skip-bonus', 'go-title', 'go-desc', 'go-stats', 'go-unlocks',
  'btn-again', 'btn-meta2', 'btn-title', 'btn-go-chronicle', 'vic-title', 'vic-desc', 'vic-stats', 'btn-vic-chronicle',
  'btn-again2', 'btn-title2', 'codex-tabs', 'codex-body', 'btn-codex-back',
  'meta-obols', 'meta-list', 'btn-reset-meta', 'btn-meta-back', 'btn-help-back',
  'pause-run-info', 'btn-resume', 'btn-abandon'
];

function makeEl(id, tag) {
  const el = {
    id, tagName: (tag || 'div').toUpperCase(),
    style: { setProperty: noop, removeProperty: noop },
    children: [], childNodes: [], parentNode: null,
    innerHTML: '', textContent: '', value: '',
    _classes: new Set(),
    _listeners: {},
    _attrs: {},
    width: 1280, height: 800,
    classList: {
      add(...c) { c.forEach(x => el._classes.add(x)); },
      remove(...c) { c.forEach(x => el._classes.delete(x)); },
      toggle(c, on) { if (on === undefined) { el._classes.has(c) ? el._classes.delete(c) : el._classes.add(c); } else if (on) el._classes.add(c); else el._classes.delete(c); },
      contains(c) { return el._classes.has(c); }
    },
    appendChild(child) {
      if (child && child._isFragment) {
        child.children.forEach(k => el.appendChild(k));
        child.children.length = 0;
        return child;
      }
      el.children.push(child);
      if (child) child.parentNode = el;
      return child;
    },
    append(...children) { children.forEach(child => el.appendChild(child)); },
    insertBefore(child, reference) {
      if(reference===null||reference===undefined) return el.appendChild(child);
      const index=el.children.indexOf(reference);
      if(index<0) throw new Error('insertBefore reference is not a child');
      if(child.parentNode) child.parentNode.removeChild(child);
      el.children.splice(el.children.indexOf(reference),0,child);child.parentNode=el;return child;
    },
    removeChild(child) {
      const i = el.children.indexOf(child);
      if (i >= 0) el.children.splice(i, 1);
      if (child) child.parentNode = null;
      return child;
    },
    remove() { if (el.parentNode) el.parentNode.removeChild(el); },
    querySelector(sel) {
      const cls = sel.replace('.', '');
      const walk = (n) => {
        for (const c of n.children) {
          if (c._classes && c._classes.has(cls)) return c;
          const r = walk(c);
          if (r) return r;
        }
        return null;
      };
      return walk(el);
    },
    querySelectorAll(sel) {
      const cls = sel.replace('.', '');
      const out = [];
      const walk = (n) => { for (const c of n.children) { if (c._classes && c._classes.has(cls)) out.push(c); walk(c); } };
      walk(el);
      return out;
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 800, right: 1280, bottom: 800 }; },
    getContext() { return el._ctx || (el._ctx = makeCtx2D()); },
    setAttribute(k, v) { el._attrs[k] = v; },
    getAttribute(k) { return el._attrs[k]; },
    removeAttribute(k) { delete el._attrs[k]; },
    addEventListener(type, fn) { (el._listeners[type] = el._listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      const l = el._listeners[type];
      if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
    },
    dispatch(type, ev) { (el._listeners[type] || []).slice().forEach(fn => fn(ev || { preventDefault: noop, stopPropagation: noop })); },
    focus: noop, blur: noop, click() { el.dispatch('click', { preventDefault: noop }); },
    get firstChild() { return el.children[0] || null; },
    get lastChild() { return el.children[el.children.length - 1] || null; }
  };
  if (id === 'game') el._ctx = makeCtx2D();
  if (id === 'ab-attack' || id === 'ab-dash' || id === 'ab-special' || id === 'ab-call') {
    const cd = makeEl(id + '-cd');
    cd._classes.add('ab-cd');
    el.appendChild(cd);
  }
  return el;
}

const registry = new Map();
IDS.forEach(id => registry.set(id, makeEl(id, id === 'game' ? 'canvas' : 'div')));

const documentShim = {
  readyState: 'complete',
  documentElement: makeEl('html'),
  body: makeEl('body'),
  _listeners: {},
  getElementById(id) {
    if (!registry.has(id)) registry.set(id, makeEl(id));
    return registry.get(id);
  },
  createElement(tag) { return makeEl('_' + tag, tag); },
  createDocumentFragment() { const f = makeEl('_frag'); f._isFragment = true; return f; },
  querySelector(sel) { return documentShim.getElementById(sel.replace('#', '')); },
  querySelectorAll() { return []; },
  addEventListener(type, fn) { (documentShim._listeners[type] = documentShim._listeners[type] || []).push(fn); },
  removeEventListener: noop,
  dispatch(type, ev) { (documentShim._listeners[type] || []).forEach(fn => fn(ev)); }
};

const storage = new Map();
const windowShim = {
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  _listeners: {},
  addEventListener(type, fn) { (windowShim._listeners[type] = windowShim._listeners[type] || []).push(fn); },
  removeEventListener(type, fn) {
    const l = windowShim._listeners[type];
    if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  },
  dispatch(type, ev) { (windowShim._listeners[type] || []).slice().forEach(fn => fn(ev || { preventDefault: noop })); },
  document: documentShim,
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear()
  },
  confirm: () => false,
  alert: noop,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: noop,
  performance: { now: () => Date.now() },
  setTimeout: (fn, t) => setTimeout(fn, t),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: () => 0,        // no music in the harness
  clearInterval: noop,
  AudioContext: undefined,     // audio disables itself
  webkitAudioContext: undefined,
  btoa: value => Buffer.from(String(value), 'binary').toString('base64'),
  Image: function ImageShim() { this.width = 1; this.height = 1; },
  Math, JSON, Date, console, Object, Array, String, Number, Boolean, Error, RegExp,
  isNaN, isFinite, parseInt, parseFloat, Uint8ClampedArray, Float32Array, Map, Set, WeakMap, Symbol, Promise
};
Object.defineProperty(windowShim.Image.prototype, 'src', {
  set(value) { this._src = value; if (this.onload) this.onload(); },
  get() { return this._src || ''; }
});
windowShim.window = windowShim;

const sandbox = vm.createContext(windowShim);
/* expose globals the modules expect to find on `window` */
sandbox.globalThis = windowShim;
sandbox.self = windowShim;

const FILES = ['js/core.js', 'js/persistence.js', 'js/data.js', 'js/content-expansion.js', 'js/world.js', 'js/gear.js', 'js/paragon.js', 'js/run-systems.js', 'js/boon-expansion.js', 'js/asset-manifest.js', 'js/assets.js', 'js/entities.js', 'js/game.js', 'js/build-powers.js', 'js/endgame.js', 'js/mythology.js', 'js/portraits.js', 'js/world-runtime.js', 'js/world-ambience.js', 'js/render.js', 'js/world-renderer.js', 'js/overhaul-ui.js', 'js/main.js'];

const errors = [];
const logs = [];
function log(...a) { logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x).slice(0, 200) : String(x)).join(' ')); }

/* ---------------- load ---------------- */
for (const f of FILES) {
  if (f === 'js/main.js') {
    /* Use real manifest/draw APIs but finish asset loading synchronously in this headless runner. */
    windowShim.K.Assets.load = () => ({ then(fn) { fn(); return { catch() { return this; } }; } });
  }
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: f });
  } catch (e) {
    errors.push('LOAD ' + f + ': ' + e.stack);
  }
}

console.log('--- KATABASIS headless smoke test ---');
if (errors.length) {
  console.log('LOAD ERRORS:');
  errors.forEach(e => console.log(e));
  process.exit(1);
}

const K = windowShim.K;
if (!K || !K.G) { console.log('FAIL: game did not boot'); process.exit(1); }
const G = K.G;
log('booted. phase=' + G.phase + ' region=' + (G.region ? G.region().name : 'none'));

const assetManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
const gearAtlas = assetManifest['ui.gear-paragon'];
const gearAtlasPath = gearAtlas && path.join(ROOT, gearAtlas.src);
const gearAtlasBytes = gearAtlasPath && fs.existsSync(gearAtlasPath) ? fs.readFileSync(gearAtlasPath) : null;
let gearAtlasImage = null;
if (gearAtlasBytes && gearAtlasBytes.toString('ascii', 12, 16) === 'VP8L' && gearAtlasBytes[20] === 0x2f) {
  const header = gearAtlasBytes.readUInt32LE(21);
  gearAtlasImage = { width:(header & 0x3fff) + 1, height:((header >>> 14) & 0x3fff) + 1, alpha:(header >>> 28) & 1 };
}
if (!gearAtlas || gearAtlas.cols !== 4 || gearAtlas.rows !== 4 || !/\.webp$/i.test(gearAtlas.src) ||
    !gearAtlasBytes || gearAtlasBytes.toString('ascii', 0, 4) !== 'RIFF' || gearAtlasBytes.toString('ascii', 8, 12) !== 'WEBP' ||
    !gearAtlasImage || gearAtlasImage.width < 4 || gearAtlasImage.height < 4 || !gearAtlasImage.alpha || !K.Assets.entry('ui.gear-paragon')) {
  errors.push('transparent 4x4 Armory and Paragon image atlas is missing from the asset manifest');
}

/* Armory/Paragon regression checks: save migration. */
const sixGearSlots = ['weapon','helm','cuirass','bracers','waist','greaves'];
if (!Array.isArray(K.Save.data.gearInventory) || !K.Save.data.equippedGear ||
    sixGearSlots.some(slot => !Object.prototype.hasOwnProperty.call(K.Save.data.equippedGear, slot))) {
  errors.push('fresh save did not create a six-slot gear collection');
} else {
  const starter = K.Save.data.gearInventory.find(item => item && item.id === K.Save.data.equippedGear.weapon);
  if (!starter || starter.templateId !== 'xiphos') errors.push('fresh save did not equip the starter Xiphos');
}
const legacySave = {
  obols: 456, weapon: 'xiphos', muted: true, meta: { m_hp: 3 },
  campaignArchive: [{ id: 'legacy-chapter' }],
  nemeses: [{ id: 'legacy-nemesis' }], killChronicle: [{ id: 'legacy-kill' }],
  seenGods: { hades: 1 }
};
windowShim.localStorage.setItem('katabasis.save.v1', JSON.stringify(legacySave));
K.Save.load();
if (K.Save.data.obols !== 456 || !K.Save.data.muted || K.Save.data.meta.m_hp !== 3 ||
    K.Save.data.campaignArchive[0].id !== 'legacy-chapter' || K.Save.data.nemeses[0].id !== 'legacy-nemesis' ||
    K.Save.data.killChronicle[0].id !== 'legacy-kill' || !K.Save.data.seenGods.hades) {
  errors.push('v1 save migration lost campaign, nemesis, Chronicle, Mirror, settings, or Obols data');
}
if (!Array.isArray(K.Save.data.gearInventory) || !K.Save.data.equippedGear ||
    sixGearSlots.some(slot => !Object.prototype.hasOwnProperty.call(K.Save.data.equippedGear, slot))) {
  errors.push('v1 save migration did not add all Armory and Paragon defaults');
}
K.Save.clear();

/* Gear generation, inventory transactions, and capped upgrade arithmetic. */
if (!K.Gear) errors.push('persistent Greek Armory module is not loaded');
else {
  const gear = K.Gear;
  const rollA = gear.generate('weapon', 27, new K.RNG(91827), 'legendary');
  const rollB = gear.generate('weapon', 27, new K.RNG(91827), 'legendary');
  const rollSignature = x => JSON.stringify({templateId:x.templateId, name:x.name, rarity:x.rarity, level:x.level, setId:x.setId, affixes:x.affixes, baseEffects:x.baseEffects});
  if (!rollA || rollSignature(rollA) !== rollSignature(rollB)) errors.push('seeded gear generation is not reproducible');
  const slots = ['weapon','helm','cuirass','bracers','waist','greaves'];
  slots.forEach((slot, i) => {
    const item = gear.generate(slot, 1 + i, new K.RNG(91830 + i), 'rare');
    if (!item || item.slot !== slot || !item.templateId || !item.id || !Array.isArray(item.affixes) || !item.baseEffects) errors.push('generated item schema is incomplete for ' + slot);
  });
  const setPieceCount = Object.keys(gear.SETS || {}).reduce((sum, id) => sum + Object.keys(gear.SETS[id].pieces || {}).length, 0);
  if (Object.keys(gear.SETS || {}).length !== 6 || setPieceCount !== 36) errors.push('Greek Armory must define six complete six-slot gear sets');
  K.Save.clear();
  const item = gear.generate('weapon', 10000, new K.RNG(5512), 'legendary');
  const inserted = gear.add(item);
  const beforeDuplicateShards = K.Save.data.salvageShards;
  const duplicate = JSON.parse(JSON.stringify(item)); duplicate.id = 'duplicate-test-instance';
  const duplicateResult = gear.add(duplicate);
  if (!inserted || !inserted.added || !duplicateResult || !duplicateResult.duplicate ||
      K.Save.data.salvageShards !== beforeDuplicateShards + 5 || K.Save.data.gearInventory.filter(x => x.templateId === item.templateId && x.level === item.level && x.rarity === item.rarity).length !== 1) {
    errors.push('exact gear duplicates did not convert into salvage shards');
  }
  const starterId = K.Save.data.equippedGear.weapon;
  const starter = K.Save.data.gearInventory.find(x => x.id === starterId);
  const shardsBefore = K.Save.data.salvageShards;
  if (gear.sell(starterId) !== false || gear.salvage(starterId) !== false || K.Save.data.salvageShards !== shardsBefore) errors.push('equipped gear could be sold or salvaged');
  const upgradeCost = gear.upgradeCost(item), lowCost = gear.upgradeCost(Object.assign({}, item, {level:1}));
  const penultimateCost = gear.upgradeCost(Object.assign({}, item, {level:29}));
  const cappedObols=K.Save.data.obols, cappedShards=K.Save.data.salvageShards;
  if (item.level !== 30 || upgradeCost !== Infinity || !Number.isFinite(penultimateCost) || penultimateCost <= lowCost ||
      gear.upgrade(item.id) !== false || K.Save.data.obols !== cappedObols || K.Save.data.salvageShards !== cappedShards) errors.push('gear level-30 cap or increasing pre-cap upgrade cost failed');
  const helm = gear.generate('helm', 2, new K.RNG(5513), 'common');
  const helmAdd = gear.add(helm);
  K.Save.data.obols = 0; K.Save.data.salvageShards = 0;
  const oldLevel = helm.level, oldObols = K.Save.data.obols, oldShards = K.Save.data.salvageShards;
  if (!helmAdd || !helmAdd.added || gear.upgrade(helm.id) !== false || helm.level !== oldLevel || K.Save.data.obols !== oldObols || K.Save.data.salvageShards !== oldShards) errors.push('insufficient upgrade resources were not atomic');
  const sale = gear.generate('bracers', 4, new K.RNG(5514), 'rare');
  gear.add(sale);
  const sellValue = gear.sell(sale.id);
  if (sellValue !== Math.max(1, Math.floor(10 * sale.level * 1.15)) || K.Save.data.obols !== sellValue) errors.push('gear sale did not return persistent rarity-scaled Obols');
  const salvage = gear.generate('greaves', 5, new K.RNG(5515), 'epic');
  gear.add(salvage);
  const salvageResult = gear.salvage(salvage.id);
  if (!salvageResult || salvageResult.shards !== 3 || K.Save.data.salvageShards !== 3) errors.push('gear salvage did not return the rarity-scaled shard amount');
}
K.Save.clear();

/* Paragon XP carry, connected-node purchasing, keystones, and Mirror respec. */
if (!K.Paragon) errors.push('Loom of the Fates progression module is not loaded');
else {
  const paragon = K.Paragon;
  K.Save.clear();
  const save = K.Save.data;
  save.paragonUnlocked = true; save.paragonXp = 0; save.paragonPoints = 0; save.paragonNodes = ['wayfarer'];
  paragon.normalizeSave(save);
  paragon.awardXp(99);
  if (save.paragonXp !== 99 || save.paragonPoints !== 0) errors.push('Paragon XP awarded a point before reaching 100');
  paragon.awardXp(1);
  if (save.paragonXp !== 0 || save.paragonPoints !== 1) errors.push('Paragon 99+1 XP did not roll over into a point');
  paragon.awardXp(201);
  if (save.paragonXp !== 1 || save.paragonPoints !== 3) errors.push('Paragon XP remainder did not carry across multiple points');
  const reload = JSON.parse(JSON.stringify(save)); paragon.normalizeSave(reload);
  if (reload.paragonXp !== 1 || reload.paragonPoints !== 3 || !reload.paragonNodes.includes('wayfarer')) errors.push('Paragon progress did not survive reload-shaped save data');
  save.paragonPoints = 50; save.paragonNodes = ['wayfarer']; save.obols = 10000;
  if (paragon.canBuy('ares_2', save) || !paragon.canBuy('ares_1', save)) errors.push('Paragon allowed a disconnected node or rejected a branch entrance');
  ['ares_1','ares_2','ares_3','ares_4'].forEach(id => { if (!paragon.buy(id)) errors.push('Paragon could not buy connected node ' + id); });
  if (paragon.canBuy('ares_keystone_blood', save) !== true || !paragon.buy('ares_keystone_blood')) errors.push('connected Ares keystone could not be purchased for its three-point cost');
  if (paragon.canBuy('ares_keystone_warpath', save) || paragon.buy('ares_keystone_warpath')) errors.push('Paragon allowed both mutually exclusive Ares keystones');
  if (paragon.canBuy('unknown_node', save) || paragon.buy('unknown_node')) errors.push('Paragon accepted an invalid node id');
  const beforeRespecPoints = save.paragonPoints, beforeRespecXp = save.paragonXp, beforeRespecObols = save.obols;
  const respec = paragon.respec();
  if (!respec || respec.cost !== 350 || respec.refunded !== 7 || save.obols !== beforeRespecObols - 350 ||
      save.paragonPoints !== beforeRespecPoints + 7 || save.paragonXp !== beforeRespecXp || save.paragonNodes.length !== 1 || save.paragonNodes[0] !== 'wayfarer') {
    errors.push('Mirror respec did not refund exact spent points, preserve XP, and charge the displayed cost');
  }
  if (!paragon.normalizeSave({ paragonUnlocked:true, paragonXp:-1, paragonPoints:'bad', paragonNodes:['wayfarer','not-real','ares_3'] }).paragonNodes.includes('wayfarer')) errors.push('Paragon rejected or failed to normalize valid root progress');
}
K.Save.clear();

/* Persistent gear and Paragon effects must enter combat stats once and unequip cleanly. */
if (K.Gear && K.Paragon && G.recalcStats) {
  K.Save.clear(); G.startRun(4187);
  const doryTemplate = K.Gear.TEMPLATES.find(t => t.id === 'dory_plain');
  const dory = { id:'stat-dory', templateId:doryTemplate.id, slot:'weapon', name:doryTemplate.name, rarity:'common', level:1, setId:null,
    weaponId:doryTemplate.weaponId, baseEffects:doryTemplate.baseEffects, affixes:[], upgrades:0 };
  K.Gear.add(dory); K.Gear.equip(dory.id, 'weapon');
  if (G.run.weapon !== 'dory' || K.DATA.WEAPONS[G.run.weapon].reach !== 92) errors.push('equipped weapon template did not feed its existing attack pattern');
  const baseDamage = G.player.stats.damage, baseHp = G.player.stats.maxHp;
  const helmA = { id:'stat-helm-a', templateId:'bronze_helm', slot:'helm', name:'Force Helm', rarity:'common', level:10, setId:null,
    baseEffects:{ dmgMul:0.2 }, affixes:[], upgrades:0 };
  const helmB = { id:'stat-helm-b', templateId:'lion_helm', slot:'helm', name:'Vital Helm', rarity:'common', level:10, setId:null,
    baseEffects:{ maxHp:2 }, affixes:[], upgrades:0 };
  K.Gear.add(helmA); K.Gear.add(helmB);
  K.Gear.equip(helmA.id, 'helm');
  if (G.player.stats.damage <= baseDamage) errors.push('equipped gear did not change its target combat stat');
  K.Gear.equip(helmB.id, 'helm');
  if (G.player.stats.damage > baseDamage + 0.001 || G.player.stats.maxHp <= baseHp) errors.push('replacing gear failed to remove the previous item effect');
  const ares = K.Gear.SETS.ares_bloodforged;
  const setItems = K.Gear.SLOTS.map(slot => {
    const p = ares.pieces[slot];
    return { id:'set-test-' + slot, templateId:p.templateId, slot, name:p.name, rarity:'common', level:1, setId:ares.id,
      weaponId:p.weaponId, baseEffects:p.baseEffects, affixes:[], upgrades:0 };
  });
  const setSave = { gearInventory:setItems, equippedGear:{weapon:setItems[0].id,helm:null,cuirass:null,bracers:null,waist:null,greaves:null} };
  const onePieceFx = K.Gear.effects(setSave).dmgMul;
  setSave.equippedGear.helm = setItems[1].id;
  const twoPieceFx = K.Gear.effects(setSave).dmgMul;
  if (Math.abs(onePieceFx - 0.03) > 0.00001 || Math.abs(twoPieceFx - 0.09) > 0.00001) errors.push('2-piece set threshold counted inventory instead of equipped pieces or applied incorrectly');
  setSave.equippedGear.cuirass = setItems[2].id; setSave.equippedGear.bracers = setItems[3].id;
  if (Math.abs(K.Gear.effects(setSave).attSpd - 0.041) > 0.00001) errors.push('4-piece set threshold did not apply its bonus');
  setSave.equippedGear.waist = setItems[4].id; setSave.equippedGear.greaves = setItems[5].id;
  if (Math.abs(K.Gear.effects(setSave).dmgMul - (0.03 + 0.025 + 0.06 + 0.2)) > 0.00001) errors.push('6-piece set threshold did not apply its bonus');
  K.Save.data.paragonUnlocked = true; K.Save.data.paragonPoints = 1; K.Save.data.paragonNodes = ['wayfarer'];
  if (!K.Paragon.buy('ares_1')) errors.push('could not purchase a Paragon damage node after unlock');
  const oneNodeFx = K.Paragon.effects(K.Save.data).dmgMul;
  if (Math.abs(oneNodeFx - 0.025) > 0.00001 || K.Paragon.effects(K.Save.data).dmgMul !== oneNodeFx || G.player.stats.damage <= baseDamage) errors.push('Paragon node effects were not applied exactly once to combat stats');
}
K.Save.clear();

/* Persistent loot, treasure choice, Charon stock, capstone unlock, and Paragon kill XP. */
if (K.Gear && K.Paragon && G.startRun) {
  K.Save.clear(); G.startRun(8921); G.regionIndex = 0;
  const save = K.Save.data, rng = G.run.rng;
  let inventoryCount = save.gearInventory.length;
  const originalChance = rng.chance;
  const normal = G.addEnemy('shade', 20, 20); normal.elite = false;
  G.killEnemy(normal, true);
  if (save.paragonXp !== 1 || save.gearInventory.length !== inventoryCount) errors.push('normal kill did not award exactly 1 Paragon XP without elite loot');
  rng.chance = p => { if (p !== 0.25) errors.push('elite gear chance was not exactly 25%'); return true; };
  const elite = G.addEnemy('shade', 30, 20); elite.elite = true;
  G.killEnemy(elite, true);
  if (save.paragonXp !== 6 || save.gearInventory.length !== inventoryCount + 1) errors.push('successful elite gear roll did not persist one item and award 5 XP');
  inventoryCount = save.gearInventory.length;
  rng.chance = p => { if (p !== 0.25) errors.push('elite gear chance was not exactly 25%'); return false; };
  const missedElite = G.addEnemy('shade', 40, 20); missedElite.elite = true;
  G.killEnemy(missedElite, true);
  if (save.paragonXp !== 11 || save.gearInventory.length !== inventoryCount) errors.push('failed elite gear roll gave loot or missed 5 XP');
  rng.chance = originalChance;
  G.roomDef = { type:'boss', idx:7, isBoss:true, region:G.region() };
  const boss = new K.E.Boss('lion', 50, 20, G, {}); boss.type = { score:20 }; G.boss = boss; K.E.enemies.push(boss);
  G.killEnemy(boss, true);
  if (!save.paragonUnlocked || save.paragonXp !== 31 || save.gearInventory.length !== inventoryCount + 1) errors.push('regional capstone did not unlock Paragon, award 20 XP, and drop one item');
  G.startRun(8922);
  const transitionHandler = G.onTransition; G.onTransition = null;
  G._advanceAfter = false; G.offerRelic(3, true);
  const gearChoice = G.pendingReward && G.pendingReward.choices.filter(c => c.kind === 'gear');
  if (!gearChoice || gearChoice.length !== 1 || G.pendingReward.choices.filter(c => c.kind === 'relic').length > 3) errors.push('treasure reward did not offer exactly one generated gear choice alongside relics');
  else {
    const before = save.gearInventory.length;
    G.takeGear(gearChoice[0].item);
    if (save.gearInventory.length !== before + 1 || G.pendingReward) errors.push('selected treasure gear did not persist or close its reward');
  }
  G.onTransition = transitionHandler;
  G.startRun(8923);
  for (let idx = 0; idx < 3; idx++) {
    if (idx) G.enterChamber(idx);
    K.E.enemies.forEach(e => { e.dead = true; e.hp = 0; });
    G.pendingSpawns = []; G.checkRoomClear();
    if (G.exitGate) G.useExitGate();
    if (G.pendingReward) G.closeOffer();
  }
  const marketNode = G.world.nodes.find(node => node.type === 'shop');
  if (!marketNode || !G.enterMarket(marketNode.id)) errors.push('physical Charon market did not open after its route prerequisite');
  const gearOffer = G.interactables.find(it => it.kind === 'shop' && it.item && it.item.kind === 'gear');
  if (!gearOffer) errors.push('Charon did not stock one guaranteed gear offer');
  else {
    G.run.obols = gearOffer.cost + 10;
    const beforeCoins = G.run.obols, beforeItems = save.gearInventory.length, beforeShards = save.salvageShards;
    G.purchaseMarketItem(gearOffer);
    const written = JSON.parse(storage.get('katabasis.save.v1') || '{}');
    if (!gearOffer.used || G.run.obols !== beforeCoins - gearOffer.cost ||
        (save.gearInventory.length !== beforeItems + 1 && save.salvageShards <= beforeShards) ||
        (!written.gearInventory || written.gearInventory.length !== save.gearInventory.length)) errors.push('Charon gear purchase did not spend run Obols and persist its retained item');
  }
}
K.Save.clear();

/* ============================================================
   Harness controls
   ============================================================ */
const In = K.Input;
function mouse(wx, wy) {
  /* convert world -> screen through the camera so aiming works */
  const sx = (wx - G.cam.x) * G.cam.zoom + K.W / 2;
  const sy = (wy - G.cam.y) * G.cam.zoom + K.H / 2;
  In.mouse.x = sx; In.mouse.y = sy;
}
function press(code) { In.keys[code] = true; In.pressed[code] = true; }
function release(code) { In.keys[code] = false; }
function tap(code) { press(code); In._oneShot = In._oneShot || []; In._oneShot.push(code); }

/* Run one simulated frame of STEP seconds. */
let simTime = 0;
const STEP = 1 / 60;
function tick(n) {
  n = n || 1;
  for (let i = 0; i < n; i++) {
    try {
      G.update(STEP);
    } catch (e) {
      errors.push('UPDATE: ' + e.stack.split('\n').slice(0, 3).join(' | '));
      throw e;
    }
    simTime += STEP;
    /* mimic the real loop: single-shot keys are cleared after the step */
    In.pressed = Object.create(null);
    In.mouse.downEdge = false;
    In.mouse.rdownEdge = false;
  }
}

/* sim helpers */
function nearest() {
  let best = null, bd = 1e9;
  for (const e of K.E.enemies) {
    if (e.dead || e.ally) continue;
    const d = K.U.dist2(G.player.x, G.player.y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function moveToward(t, dt, stopAt) {
  const p = G.player;
  const d = K.U.dist(p.x, p.y, t.x, t.y);
  const a = K.U.ang(p.x, p.y, t.x, t.y);
  mouse(t.x, t.y);
  const keys = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
  keys.forEach(release);
  const want = stopAt === undefined ? 40 : stopAt;
  if (d > want) {
    const dx = Math.cos(a), dy = Math.sin(a);
    if (dy < -0.35) press('KeyW');
    if (dy > 0.35) press('KeyS');
    if (dx < -0.35) press('KeyA');
    if (dx > 0.35) press('KeyD');
  }
  mouse(t.x, t.y);
  In.mouse.down = d < 420;
}
function releaseAll() {
  ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'KeyE', 'KeyQ', 'KeyF', 'KeyR', 'KeyT', 'KeyK', 'KeyI'].forEach(release);
  In.mouse.down = false;
  In.mouse.rdown = false;
}
/* Fire the whole ability sheet. Used everywhere the harness fights, so every
   ability is exercised in a real combat loop, not just in isolation. */
function useAbilities(f) {
  if (f % 45 === 0) tap('Space');                      // dash
  if (f % 70 === 0) tap('KeyF');                       // cast
  if (f % 260 === 0) tap('KeyR');                      // rush
  if (f % 900 === 0) tap('KeyT');                      // ascend
  if (f % 300 === 0) tap('KeyK');                      // wrath
  if (f % 520 === 0) tap('KeyQ');                      // call
  /* guard is held, so hold it in bursts */
  const guarding = (f % 150) < 40;
  In.mouse.rdown = guarding;
  if (guarding && f % 150 === 0) In.mouse.rdownEdge = true;
}
function U0(n) {
  n = Math.round(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

/* ============================================================
   Test 1: opening a run and clearing chambers
   ============================================================ */
log('startRun...');
try {
  G.startRun(12345);
} catch (e) { errors.push('startRun: ' + e.stack); }
log('run started. region=' + G.region().name + ' type=' + G.roomDef.type + ' enemies=' + K.E.enemies.length);
const chronicleCountBeforeSweep = Array.isArray(K.Save.data.killChronicle) ? K.Save.data.killChronicle.length : 0;

const noInput = () => { releaseAll(); };
let frames = 0;
let chambersCleared = 0;

noInput();
/* --- Test: basic loop stability with no input (player should survive a while) --- */
G.player.stats.maxHp = 100000;   /* godmode for the automated sweep so we can reach every system */
G.player.hp = 100000;
for (let i = 0; i < 240; i++) { noInput(); tick(1); frames++; }
log('idle 4s survived. hp=' + Math.round(G.player.hp) + ' enemies=' + K.E.enemies.length);

/* --- Test: kill everything in the chamber using the real combat systems --- */
let killFrames = 0;
while (K.E.enemies.filter(e => !e.dead && !e.ally).length > 0 && killFrames < 60 * 60) {
  const t = nearest();
  if (!t) break;
  moveToward(t, STEP, 34);
  useAbilities(killFrames);          // every ability, in a live fight
  tick(1);
  killFrames++;
}
log('chamber 1 swept in ' + (killFrames / 60).toFixed(1) + 's. cleared=' + G.roomDef.cleared +
  ' gate=' + !!G.exitGate + ' pending=' + G.pendingChamberReward);
if (!Array.isArray(G.run.killChronicle) || G.run.killChronicle.length !== G.run.stats.kills) errors.push('run kill chronicle does not contain every slain enemy');
if (!Array.isArray(K.Save.data.killChronicle) || K.Save.data.killChronicle.length - chronicleCountBeforeSweep !== G.run.stats.kills) errors.push('persistent kill chronicle did not record each slain enemy');
if (Array.isArray(G.run.killChronicle) && G.run.killChronicle.length && (!G.run.killChronicle[0].name || !G.run.killChronicle[0].backstory || !G.run.killChronicle[0].enemy)) errors.push('kill chronicle entry is missing generated identity or backstory');

/* --- Test: gate -> reward screen --- */
if (G.exitGate) {
  const gate = G.exitGate;
  for (let i = 0; i < 600 && !G.pendingReward; i++) {
    moveToward(gate, STEP, 10);
    if (K.U.dist(G.player.x, G.player.y, gate.x, gate.y) < 60) tap('KeyE');
    tick(1);
  }
  log('gate used. pendingReward=' + (G.pendingReward ? G.pendingReward.kind + ' x' + G.pendingReward.choices.length : 'none') + ' phase=' + G.phase);
  if (G.pendingReward) {
    const c = G.pendingReward.choices[0];
    G.takeBoon(c.id, c.rarity);
    log('took boon ' + c.id + ' (' + c.rarity + '). boons=' + G.run.boons.length + ' gods=' + JSON.stringify(G.run.gods));
  }
}

/* --- Test: advance to the next chamber --- */
G.advance();
log('after advance: region=' + G.region().name + ' chamber=' + G.chamberIndex + ' type=' + G.roomDef.type);

/* ============================================================
   Test 2: grant every boon in the game and fight with them on
   ============================================================ */
log('granting all boons + relics...');
try {
  K.DATA.BOONS.forEach(b => G.run.addBoon(b.id, 'heroic'));
  K.DATA.SPECIAL_BOONS.forEach(b => {
    if (b.req && b.req.gods) { for (const g in b.req.gods) G.run.gods[g] = Math.max(G.run.gods[g] || 0, b.req.gods[g]); }
    G.run.addBoon(b.id, b.rarity);
  });
  K.DATA.RELICS.forEach(r => G.run.addRelic(r.id));
  G.recalcStats();
  const s = G.player.stats;
  log('stats: hp=' + s.maxHp + ' dmg=' + s.damage.toFixed(1) + ' spd=' + s.moveSpeed.toFixed(0) +
    ' crit=' + (s.crit * 100).toFixed(0) + '% dashes=' + s.dashMax + ' chain=' + (s.chain ? s.chain.n : 0) +
    ' DD=' + (s.deathDefy || 0));
  G.player.hp = s.maxHp;
} catch (e) { errors.push('all-boons: ' + e.stack); }

/* fight a full chamber with everything active */
releaseAll();
let frames2 = 0;
while (K.E.enemies.filter(e => !e.dead && !e.ally).length > 0 && frames2 < 60 * 90) {
  const t = nearest();
  if (!t) break;
  moveToward(t, STEP, 30);
  useAbilities(frames2);
  tick(1);
  frames2++;
}
log('all-boons sweep: ' + (frames2 / 60).toFixed(1) + 's, cleared=' + G.roomDef.cleared +
  ', kills=' + G.run.stats.kills + ', dmg dealt=' + Math.round(G.run.stats.dmgDealt));

/* ============================================================
   Test 3: every god's CALL
   ============================================================ */
releaseAll();
try {
  const gods = Object.keys(K.DATA.GODS);
  for (const g of gods) {
    G.player.stats.gods = {}; G.player.stats.gods[g] = 99;
    G.player.callCd = 0;
    G.startCall(G.player);
    for (let i = 0; i < 200; i++) tick(1);
    G.player.callActive = 0; G.cinematic = null; G.timeScale = 1;
    log('call OK: ' + g);
  }
} catch (e) { errors.push('calls: ' + e.stack); }

/* ============================================================
   Test 4: every enemy type spawned, updated, and killed
   ============================================================ */
try {
  K.E.enemies.length = 0;
  G.player.stats.gods = {};
  G.recalcStats();
  G.player.hp = G.player.stats.maxHp;
  const ids = Object.keys(K.DATA.ENEMIES).filter(id => !K.DATA.ENEMIES[id].summon && !K.DATA.ENEMIES[id].generatedVariant);
  for (const id of ids) {
    K.E.enemies.length = 0;
    const e = G.addEnemy(id, G.player.x + 150, G.player.y - 150, { tier: 1 });
    for (let i = 0; i < 180; i++) { mouse(e.x, e.y); tick(1); }
    const acted = e.dead || e.x !== e.playerX;
    G.damageEnemy(e, 999999, { source: 'test' });
    for (let i = 0; i < 40; i++) tick(1);
    if (!e.dead) errors.push('enemy ' + id + ' did not die');
  }
  log('all ' + ids.length + ' enemy types spawned, ran AI, and died');
} catch (e) { errors.push('enemy sweep: ' + e.stack); }

/* ============================================================
   Test 5: all four bosses through phase transitions
   ============================================================ */
try {
  let bossIndex=0;
  for (const id of ['lion','medusa','hydra','typhon']) {
    G.startRun(4300+bossIndex++);
    G.player.stats.gods={};G.recalcStats();
    K.E.enemies.length = 0;
    K.E.projectiles.length = 0;
    G.hazards.length = 0;
    G.regionIndex = Math.min(3, K.DATA.BOSSES[id].music - 1);
    G.arena = { x: -600, y: -440, w: 1200, h: 880 };
    G.cam.bounds = G.arena;
    G.player.x = 0; G.player.y = 200;
    G.player.stats.maxHp = 999999;
    G.player.hp = 999999;
    const b = new K.E.Boss(id, 0, -160, G);
    K.E.enemies.push(b);
    G.boss = b;
    let f = 0;
    let phaseEscalated = 0;
    /* Hold the player's own damage out of it so each boss survives long enough
       to walk through every phase, then let it die on its own terms. */
    const savedDown = G.player.stats.damage;
    G.player.stats.damage = 0;
    const phaseTargets = b.def.phases.map(p => p.at).slice(1);
    let targetIdx = 0;
    while (f < 60 * 220 && !b.dead) {
      /* keep the player alive and moving so boss attacks land on them */
      mouse(b.x, b.y);
      const d = K.U.dist(G.player.x, G.player.y, b.x, b.y);
      releaseAll();
      if (d > 190) press('KeyW');
      else if (d < 130) press('KeyS');
      if (f % 150 === 0) tap('Space');
      tick(1);
      f++;
      /* hold the boss above its next phase line, then step it down and let the
         real damage-enemy path drive the transition */
      if (targetIdx < phaseTargets.length) {
        const floor = b.maxHp * phaseTargets[targetIdx];
        if (b.hp > floor) b.hp = Math.max(floor + 1, b.hp - b.maxHp * 0.0016);
        else targetIdx++;
      }
      if (f % 90 === 0) G.damageEnemy(b, b.maxHp * 0.02, { source: 'test', silent: true });
      if (b.phase > phaseEscalated) {
        phaseEscalated = b.phase;
        log('  ' + id + ' -> phase ' + (b.phase + 1) + ': ' +
          b.def.phases[Math.min(b.def.phases.length - 1, b.phase)].name);
      }
      G.player.hp = G.player.stats.maxHp;
    }
    G.player.stats.damage = savedDown;
    if (!b.dead) errors.push('boss ' + id + ' never died (hp ' + Math.round(b.hp) + '/' + b.maxHp + ')');
    const expectedPhases = b.def.phases.length - 1;
    if (phaseEscalated < expectedPhases) {
      errors.push('boss ' + id + ' reached only phase ' + (phaseEscalated + 1) + ' of ' + b.def.phases.length);
    }
    log('boss ' + id + ': ran ' + (f / 60).toFixed(0) + 's, phases=' + (phaseEscalated + 1) + '/' + b.def.phases.length +
      ', dead=' + b.dead + ', projectiles on field=' + K.E.projectiles.length + ', hazards=' + G.hazards.length);
    for (let i = 0; i < 150; i++) tick(1);
    K.E.projectiles.length = 0;
    G.hazards.length = 0;
  }
} catch (e) { errors.push('bosses: ' + e.stack); }

/* ============================================================
   Test 6: shop, urns, fountain, relics
   ============================================================ */
try {
  K.E.enemies.length = 0;
  G.regionIndex = 0; G.chamberIndex = 2;
  G.player.stats.maxHp = 500; G.player.hp = 200;
  G.run.obols = 5000;
  G.enterChamber(2);   /* plan[2] for region 0 is 'shop' */
  log('chamber type = ' + G.roomDef.type + ' interactables=' + G.interactables.length);
  if (G.roomDef.type === 'shop') {
    for (const it of G.interactables.slice()) {
      if (it.kind === 'shop' || it.kind === 'fountain') {
        G.player.x = it.x; G.player.y = it.y;
        G.doInteract(it);
      }
    }
    log('shopped. obols left=' + G.run.obols + ' hp=' + Math.round(G.player.hp) +
      ' relics=' + G.run.relics.length + ' shopStats=' + G.run.shopStats.length);
  }
  /* treasure chamber: urns + relic offer */
  G.enterChamber(3);
  log('chamber type = ' + G.roomDef.type + ' urns=' + G.interactables.filter(i => i.kind === 'urn').length);
  for (const it of G.interactables) { if (it.kind === 'urn') { G.player.x = it.x; G.player.y = it.y; G.doInteract(it); } }
  for (let i = 0; i < 200; i++) tick(1);
  if (G.exitGate) {
    const gate = G.exitGate;
    G.player.x = gate.x; G.player.y = gate.y;
    K.Input.pressed['KeyE'] = true;
    /* main.js owns the gate key, so call the reward path directly */
    G.offerRelic(3);
    log('relic offer: ' + (G.pendingReward ? G.pendingReward.choices.length + ' options' : 'none'));
    if (G.pendingReward) { G.takeRelic(G.pendingReward.choices[0].id); G.pendingReward = null; G.phase = 'playing'; }
  }
  log('after treasure: relics=' + G.run.relics.length);
} catch (e) { errors.push('shop/treasure: ' + e.stack); }

/* ============================================================
   Test 7: boon generation integrity (1000 rolls)
   ============================================================ */
try {
  G.run.boons.length = 0; G.run.boonLevels = {}; G.run.gods = {};
  let bad = 0, total = 0;
  for (let region = 0; region < 4; region++) {
    G.regionIndex = region;
    for (let i = 0; i < 250; i++) {
      const ch = G.generateBoonChoices(3);
      if (ch.length < 3) bad++;
      ch.forEach(c => {
        total++;
        const def = K.DATA.boonById[c.id];
        if (!def) { errors.push('unknown boon in offer: ' + c.id); bad++; }
        if (!K.DATA.RARITY[c.rarity]) { errors.push('unknown rarity: ' + c.rarity); bad++; }
      });
      /* take one so later rolls see a grown build */
      if (ch[0]) G.run.addBoon(ch[0].id, ch[0].rarity);
    }
    G.run.boons.length = 0; G.run.boonLevels = {}; G.run.gods = {};
  }
  log('boon generation: ' + total + ' offers checked, ' + bad + ' malformed');
  /* every boon text must render without ? placeholders */
  let qmark = 0;
  K.DATA.BOONS.concat(K.DATA.SPECIAL_BOONS).forEach(b => {
    const txt = b.desc;
    const tokens = (txt.match(/%[AB]%/g) || []).length;
    if (tokens) qmark++;
  });
  log('boons with %A%/%B% tokens: ' + qmark);
} catch (e) { errors.push('boongen: ' + e.stack); }

/* ============================================================
   Test 7b: movement contract + the four abilities
   Movement used to be broken by a double-applied dt, which made
   acceleration 1/60th of its intended value, let knockback decay
   away unused, and made diagonals 41% faster than cardinals.
   These assertions exist so it cannot regress silently.
   ============================================================ */
try {
  G.startRun(31337);
  G.enterChamber(0);
  const p = G.player;
  p.stats.maxHp = 100000; p.hp = 100000;

  function clearKeys() { ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach(release); }
  function resetP() {
    K.E.enemies.length = 0;
    p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
    p.knockVX = 0; p.knockVY = 0;
    p.guardT = 0; p.rushT = 0; p.ascendT = 0; p.invuln = 0;
    clearKeys();
  }

  /* moveVec must be a unit vector in every direction */
  resetP(); press('KeyD');
  const mvC = In.moveVec();
  clearKeys(); press('KeyD'); press('KeyS');
  const mvD = In.moveVec();
  clearKeys();
  if (Math.abs(Math.hypot(mvC.x, mvC.y) - 1) > 1e-6) errors.push('moveVec cardinal is not unit length');
  if (Math.abs(Math.hypot(mvD.x, mvD.y) - 1) > 1e-6) errors.push('moveVec diagonal is not unit length');

  /* every direction must reach the same top speed, quickly */
  const dirSets = [['KeyD'], ['KeyS'], ['KeyA'], ['KeyW'], ['KeyD', 'KeyS'], ['KeyA', 'KeyS'], ['KeyD', 'KeyW'], ['KeyA', 'KeyW']];
  let worstRamp = 0;
  const tops = [];
  dirSets.forEach(keys => {
    resetP();
    keys.forEach(k => press(k));
    let f = 0;
    while (f < 240) {
      G.update(STEP); In.endFrame(); f++;
      if (Math.hypot(p.vx, p.vy) >= p.stats.moveSpeed - 0.5) break;
    }
    worstRamp = Math.max(worstRamp, f);
    tops.push(Math.hypot(p.vx, p.vy));
    clearKeys();
  });
  const spread = Math.max.apply(null, tops) - Math.min.apply(null, tops);
  log('movement: ramp ' + worstRamp + ' frames, top speed spread across 8 directions ' + spread.toFixed(4) + ' px/s');
  if (worstRamp > 8) errors.push('movement ramp takes ' + worstRamp + ' frames to reach top speed (should be <= 8)');
  if (spread > 0.01) errors.push('top speed differs between directions by ' + spread.toFixed(3));

  /* braking is crisp */
  resetP(); press('KeyD');
  for (let i = 0; i < 40; i++) { G.update(STEP); In.endFrame(); }
  clearKeys();
  let brake = 0;
  while (Math.hypot(p.vx, p.vy) > 0.5 && brake < 240) { G.update(STEP); In.endFrame(); brake++; }
  log('movement: brakes to a stop in ' + brake + ' frames');
  if (brake > 8) errors.push('braking takes ' + brake + ' frames (should be <= 8)');

  /* knockback actually carries the player */
  resetP();
  p.knockVX = 260; p.knockVY = 0;
  for (let i = 0; i < 40; i++) { G.update(STEP); In.endFrame(); }
  log('movement: knockback carries ' + p.x.toFixed(1) + 'px');
  if (p.x < 30) errors.push('knockback barely moves the player (' + p.x.toFixed(1) + 'px)');

  /* --- the four abilities --- */
  const abilityLog = [];

  /* Guard: blocks frontally, parries when fresh, directional */
  resetP(); p.hp = p.stats.maxHp;
  const hpFull = p.stats.maxHp;
  p.aim = 0; p.guardDir = 0; p.guardRecover = 0; p.guardCd = 0; p.guardT = 0;
  p.startGuard(G);
  if (p.guardT <= 0) errors.push('Guard does not activate');
  p.guardT = p.guardWindow - 0.30;                  // past the parry window
  p.invuln = 0;
  G.damagePlayer(100, { x: 200, y: 0 }, 'contact');
  const blocked = hpFull - p.hp;
  resetP(); p.hp = hpFull;
  p.aim = 0; p.guardDir = 0; p.guardRecover = 0; p.guardCd = 0; p.guardT = 0;
  p.startGuard(G);
  p.invuln = 0;
  const parriesBefore = p.parryCount;
  G.damagePlayer(100, { x: 200, y: 0 }, 'contact');
  const parried = hpFull - p.hp;
  resetP(); p.hp = hpFull;
  p.aim = 0; p.guardDir = 0; p.guardRecover = 0; p.guardCd = 0; p.guardT = 0;
  p.startGuard(G);
  p.guardT = p.guardWindow - 0.30; p.invuln = 0;
  G.damagePlayer(50, { x: -200, y: 0 }, 'contact');   // from behind
  const behind = hpFull - p.hp;
  abilityLog.push('Guard block ' + blocked.toFixed(0) + '% parry ' + parried.toFixed(0) + '% behind ' + behind.toFixed(0) + '%');
  if (blocked <= 0 || blocked > 30) errors.push('Guard block absorbs the wrong amount (' + blocked + ' of 100)');
  if (parried > 0.01) errors.push('Parry still takes damage (' + parried + ')');
  if (p.parryCount <= parriesBefore) errors.push('Parry did not register');
  if (behind < 40) errors.push('Guard blocks from behind — it must be directional');

  /* Cast: spawns a projectile that leaves a rift on landing */
  resetP(); p.castCd = 0;
  const hzBefore = G.hazards.length;
  p.doCast(G);
  if (p.castCd <= 0) errors.push('Cast did not go on cooldown');
  const castProj = K.E.projectiles.filter(pr => pr.friendly && pr.onDeath).length;
  if (!castProj) errors.push('Cast spawned no projectile with a rift');
  /* detonate it by hand and confirm the rift appears */
  K.E.projectiles.filter(pr => pr.friendly && pr.onDeath).forEach(pr => pr.die(G));
  const rifts = G.hazards.length - hzBefore;
  abilityLog.push('Cast rift ' + (rifts > 0 ? 'ok' : 'MISSING'));
  if (rifts < 1) errors.push('Cast left no rift hazard');

  /* Rush: moves the player a long way and grants i-frames */
  resetP(); p.rushCd = 0; p.rushT = 0;
  p.doRush(G);
  if (p.rushT <= 0) errors.push('Rush did not activate');
  if (p.rushCd <= 0) errors.push('Rush did not go on cooldown');
  const rx0 = p.x, ry0 = p.y;
  for (let i = 0; i < 30; i++) { G.update(STEP); In.endFrame(); }
  const rushed = Math.hypot(p.x - rx0, p.y - ry0);
  abilityLog.push('Rush ' + rushed.toFixed(0) + 'px');
  if (rushed < 100) errors.push('Rush barely moved the player (' + rushed.toFixed(0) + 'px)');

  /* Ascend: empower, protect, expire cleanly */
  resetP(); p.ascendCd = 0; p.ascendT = 0;
  const dmgBefore = p.stats.damage;
  p.doAscend(G);
  const dmgDuring = p.stats.damage;
  if (p.ascendT <= 0) errors.push('Ascend did not activate');
  if (p.ascendCd <= 0) errors.push('Ascend did not go on cooldown');
  if (!(dmgDuring > dmgBefore)) errors.push('Ascend did not raise damage (' + dmgBefore + ' -> ' + dmgDuring + ')');
  if (p.invuln < 1) errors.push('Ascend granted no invulnerability');
  for (let i = 0; i < 60 * 8; i++) { G.update(STEP); In.endFrame(); }
  if (p.ascendT !== 0) errors.push('Ascend never expired');
  if (Math.abs(p.stats.damage - dmgBefore) > 0.01) {
    errors.push('Ascend boost was not removed on expiry (' + dmgBefore + ' -> ' + p.stats.damage + ')');
  }
  abilityLog.push('Ascend ' + dmgBefore.toFixed(0) + '->' + dmgDuring.toFixed(0) + ' then back to ' + p.stats.damage.toFixed(0));
  log('abilities: ' + abilityLog.join(' | '));
} catch (e) { errors.push('movement/abilities: ' + e.stack); }

/* ============================================================
   Test 8: player death, death defiance, game over
   ============================================================ */
try {
  K.Save.data.nemeses = [];
  K.Save.data.killChronicle = [];
  G.startRun(4242);
  G.regionIndex = 0; G.chamberIndex = 0;
  G.enterChamber(0);
  /* give the player a known Death Defiance so we can watch it fire */
  G.run.shopStats.push({ deathDefy: 1 });
  G.recalcStats();
  G.run.deathDefy = 1;
  G.player.hp = 5;
  G.player.invuln = 0;
  const nemesisSeed = G.addEnemy(Object.keys(K.DATA.ENEMIES)[0], G.player.x + 100, G.player.y, { tier: 0 });
  G.damagePlayer(9999, nemesisSeed, 'contact');
  if (!G.player.dead) { G.die(); tick(1); }
  log('after lethal hit with a Death Defiance: hp=' + Math.round(G.player.hp) +
    ' dead=' + G.player.dead + ' defiances left=' + G.run.deathDefy);
  if (G.player.dead) errors.push('player died while a Death Defiance charge was available');
  if (G.run.deathDefy !== 0) errors.push('Death Defiance did not consume a charge');
  if (G.player.hp <= 0) errors.push('Death Defiance revived with non-positive life');
  /* now strip the defiances and kill for real. The real loop notices the
     zeroed life on the next step and runs the death sequence. */
  G.run.deathDefy = 0;
  G.player.hp = 1;
  G.player.invuln = 0;
  G.damagePlayer(9999, nemesisSeed, 'projectile');
  let deathFrames = 0;
  while (G.phase !== 'dead' && deathFrames++ < 30) tick(1);
  log('died properly after ' + deathFrames + ' frame(s). phase=' + G.phase + ' hp=' + G.player.hp);
  if (G.phase !== 'dead') errors.push('game did not enter the dead phase after death');
  if (G.player.hp > 0) errors.push('dead player still has positive life');
  if (!Array.isArray(K.Save.data.nemeses) || K.Save.data.nemeses.length !== 1) errors.push('a run-ending enemy did not become a persistent nemesis');
  else if (K.Save.data.nemeses[0].sourceId !== nemesisSeed.id || K.Save.data.nemeses[0].adaptation !== 'veil_hunter') errors.push('nemesis identity or projectile adaptation was not remembered');
  G.startRun(4243);
  G.regionIndex = 1;
  G.enterChamber(0);
  if (!K.E.enemies.some(e => e.isNemesis && e.nemesisId === K.Save.data.nemeses[0].id)) errors.push('persistent nemesis did not return in a later run');
  K.Save.data.nemeses.length = 0;   /* isolate later random-run soak coverage */
  K.Save.data.killChronicle.length = 0;
} catch (e) { errors.push('death: ' + e.stack); }

/* ============================================================
   Test 9: victory path
   ============================================================ */
try {
  G.startRun(999);
  G.regionIndex = 3; G.chamberIndex = 4;
  G.victory();
  log('victory reached. save wins=' + K.Save.data.wins);
} catch (e) { errors.push('victory: ' + e.stack); }

/* ============================================================
   Test 10: rendering pass for every region + all entity types
   ============================================================ */
try {
  for (let r = 0; r < K.DATA.REGIONS.length; r++) {
    G.startRun(1000 + r);
    G.regionIndex = r;
    G.enterChamber(0);
    K.E.enemies.length = 0;
    const ids = Object.keys(K.DATA.ENEMIES).filter(id => !K.DATA.ENEMIES[id].generatedVariant);
    ids.forEach((id, i) => {
      const a = i / ids.length * Math.PI * 2;
      G.addEnemy(id, Math.cos(a) * 300, Math.sin(a) * 300, { tier: r });
    });
    const bn = G.region().boss;
    K.E.enemies.push(new K.E.Boss(bn, 0, -200, G));
    /* fake projectiles of every perspective */
    Object.keys(K.DATA.GODS).forEach((g, i) => {
      K.E.spawnProjectile({ x: i * 40 - 200, y: 100, vx: 10, vy: 10, persp: 'bolt', friendly: true, dmg: 5, life: 9 });
    });
    ['boulder', 'rock', 'fireball', 'curse', 'hex', 'magma', 'arrow', 'blade', 'dark', 'frost', 'poison', 'water', 'wail', 'spark', 'spear'].forEach((pp, i) => {
      K.E.spawnProjectile({ x: i * 40 - 300, y: -100, vx: 10, vy: 10, persp: pp, dmg: 5, life: 9 });
    });
    /* hazards, effects, pickups */
    G.addHazard({ x: 0, y: 0, radius: 50, life: 9, maxLife: 9, dmg: 1, tick: 1, friendly: true, color: '#ff6a2c' });
    G.addHazard({ x: 120, y: 60, radius: 50, life: 9, maxLife: 9, dmg: 1, tick: 1, friendly: false, color: '#5fd0d8' });
    ['swing', 'float', 'shockwave', 'nova', 'wave', 'bolt', 'arc', 'cone', 'shieldRing', 'urnBreak', 'telegraph', 'summonRing'].forEach(k => {
      K.E.effects.push({ kind: k, x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400, r: 60, life: 5, max: 5, color: '#f0cf5e', dir: 0, arc: 1, text: '12', x1: 0, y1: 0, x2: 90, y2: 90 });
    });
    K.E.pickups.push(new K.E.Pickup({ x: 60, y: 60, kind: 'obol', value: 3 }));
    K.E.pickups.push(new K.E.Pickup({ x: -60, y: 60, kind: 'life', value: 5 }));
    G.urnDais(0, 200);
    G.interactables.push({ kind: 'fountain', x: -200, y: 200, radius: 30, used: false, amount: 10 });
    G.interactables.push({ kind: 'shop', x: 200, y: 200, radius: 24, used: false, item: K.DATA.SHOP_ITEMS[0], cost: 45 });
    G.openExitGate();
    G.banner = { big: 'TEST', small: 'SUB', sub: 'SUB2', t: 5, max: 5 };
    G.cinematic = { god: 'zeus', t: 5 };
    G.flash = 0.4; G.flashColor = 'rgba(255,255,255,0.5)';
    G.player.hp = G.player.stats.maxHp * 0.2;   /* exercise low-life vignette */
    G.player.shield = 40;
    G.player.statuses = { poison: { t: 5, dps: 2, tick: 0 }, burn: { t: 5, dps: 2, tick: 0 }, chill: { t: 5, amount: 0.3 }, petrified: { t: 5, dur: 5 }, weaken: { t: 5, amount: 0.3 }, mark: { t: 5 }, doom: { t: 5 }, stun: { t: 5 }, root: { t: 5 } };
    K.E.enemies.forEach(e => { e.statuses = { poison: { t: 5, dps: 2, tick: 0 }, burn: { t: 5, dps: 2, tick: 0 }, chill: { t: 5, amount: 0.3 }, slow: { t: 5, amount: 0.3 }, weaken: { t: 5, amount: 0.3 }, mark: { t: 5 }, doom: { t: 5 }, charm: { t: 5 }, stun: { t: 5 }, root: { t: 5 } }; });
    for (let i = 0; i < 30; i++) K.R.draw(makeCtx2D(), G, STEP);
  }
  log('render pass completed for all ' + K.DATA.REGIONS.length + ' regions and their capstone bosses with every entity type');
} catch (e) { errors.push('render: ' + e.stack); }

/* ============================================================
   Test 11: long soak — a full run of continuous simulated play
   ============================================================ */
try {
  G.startRun(777);
  G.player.stats.maxHp = 4000; G.player.hp = 4000;
  let f = 0, advanced = 0, gatesUsed = 0;
  const maxFrames = 60 * 240;
  while (f < maxFrames && G.phase !== 'victory' && G.phase !== 'dead') {
    if (G.phase === 'event' && G.activeEvent) {
      const choice = G.activeEvent.choices.find(option => !option.costObols || option.costObols <= G.run.obols) || G.activeEvent.choices[0];
      if (choice) G.chooseEvent(choice.id);
    } else if (G.pendingStory) {
      G.chooseStory(G.pendingStory.chapter.choices[0].id);
    } else if (G.pendingReward) {
      const reward=G.pendingReward, choice=reward.kind==='relic'?(reward.choices.find(item=>item.kind==='relic')||reward.choices[0]):reward.choices[0];
      if(reward.kind==='fatedThread') G.takeFatedThread(choice.id);
      else if(reward.kind==='augment') G.takeAugment(choice.id);
      else if(reward.kind==='relic') {
        if(choice.kind==='gear') G.takeGear(choice.item); else G.takeRelic(choice.id);
      } else G.takeBoon(choice.id,choice.rarity);
      releaseAll();
    } else if (G.exitGate) {
      const gate = G.exitGate;
      moveToward(gate, STEP, 8);
      if (K.U.dist(G.player.x, G.player.y, gate.x, gate.y) < 50) {
        if(G.useExitGate()) gatesUsed++;
      }
    } else if (G.world && !G.activeEncounter && G.world.chapterResolved) {
      const exit=G.availableRegionExits().find(option=>option.required)||G.availableRegionExits()[0];
      if(exit&&G.useRegionExit(exit.regionId))advanced++;
    } else if (G.world && !G.activeEncounter && !G.exitGate) {
      const target=G.world.nodes.filter(node=>node.main&&node.status==='pending'&&node.type!=='shop'&&node.type!=='npc').sort((a,b)=>a.idx-b.idx)[0];
      if(target)moveToward(target,STEP,8);else releaseAll();
    } else {
      const t = nearest();
      if (t) {
        moveToward(t, STEP, 30);
        /* moveToward clears the left button, so press it again after positioning */
        In.mouse.down = K.U.dist(G.player.x, G.player.y, t.x, t.y) < 340;
        useAbilities(f);
      } else {
        releaseAll();
      }
    }
    /* keep the test immortal so it can reach Olympus */
    G.player.hp = G.player.stats.maxHp;
    tick(1);
    f++;
  }
  log('soak: ' + (f / 60).toFixed(0) + 's simulated, region=' + G.region().name +
    ', chamber=' + (G.chamberIndex + 1) + ', gates passed=' + gatesUsed + ', regions crossed=' + advanced +
    ', boons=' + G.run.boons.length + ', relics=' + G.run.relics.length +
    ', kills=' + G.run.stats.kills + ', bosses felled=' + G.run.stats.bosses +
    ', dmg dealt=' + U0(G.run.stats.dmgDealt) + ', dmg taken=' + U0(G.run.stats.dmgTaken) +
    ', phase=' + G.phase);
  if (G.run.stats.kills < 20) errors.push('soak killed only ' + G.run.stats.kills + ' enemies — combat is not progressing');
  /* Each region has 7 generated chambers + a boss, so a healthy run
     passes several gates. The harness player is deliberately clumsy, so we
     only require clear forward progress. */
  if (gatesUsed < 3) errors.push('soak passed only ' + gatesUsed + ' gates — the run is not progressing');
  if (G.run.boons.length < 1) errors.push('soak never collected a boon');
  /* entity leak check */
  log('live entities: enemies=' + K.E.enemies.length + ' projectiles=' + K.E.projectiles.length +
    ' effects=' + K.E.effects.length + ' particles=' + G.particles.list.length +
    ' hazards=' + G.hazards.length + ' pickups=' + K.E.pickups.length);
  if (K.E.projectiles.length > 400) errors.push('projectile leak: ' + K.E.projectiles.length + ' alive');
  if (K.E.effects.length > 400) errors.push('effect leak: ' + K.E.effects.length + ' alive');
  if (G.particles.list.length > 2400) errors.push('particle leak: ' + G.particles.list.length + ' alive');
} catch (e) { errors.push('soak: ' + e.stack); }

/* ============================================================
   Test 12: staged bosses, named signature attacks, and champion tribute
   ============================================================ */
try {

  const campaignBossIds = ['lion','medusa','hydra','typhon','styx_warden','tantalus','achilles',
    'mourning_orpheus','labyrinth_asterion','scylla','porphyrion','hecatoncheir',
    'delphi_python','pelion_nessus','arcadia_boar','thebes_sphinx','marathon_bull','mycenae_tisiphone'];
  const namedSignatureIds = campaignBossIds.slice(4);
  for (const id of campaignBossIds) {
    if (!K.DATA.BOSSES[id]) errors.push('missing named boss definition: ' + id);
    else if (id === 'typhon' ? K.DATA.BOSSES[id].phases.length !== 4 : K.DATA.BOSSES[id].phases.length < 3) {
      errors.push('boss ' + id + ' has too few stages');
    }
  }

  /* Audit every regional capstone and every generated family aspect, not only
     the original 12 mechanically distinct campaign bosses. */
  const regionalBossIds = new Set();
  const assetManifest = windowShim.KATABASIS_ASSET_MANIFEST || {};
  const greekRegionContract = [
    ['delphi','delphi-python','delphi_python','delphi_oracle',['Pythia','Apollo']],
    ['pelion','pelion-ambush','pelion_nessus','pelion_ambush',['Chiron','Heracles','Nessus']],
    ['arcadia','arcadia-hunt','arcadia_boar','arcadia_tusks',['Artemis','Pan','Atalanta']],
    ['thebes','thebes-riddle','thebes_sphinx','thebes_riddle',['Sphinx','Oedipus','Antigone']],
    ['marathon','marathon-return','marathon_bull','marathon_charge',['Theseus','Athena','Heracles']],
    ['mycenae','mycenae-blood-oath','mycenae_tisiphone','mycenae_furies',['Electra','Orestes','Tisiphone']]
  ];
  const regionIds = K.DATA.REGIONS.map(r => r.id);
  const insertion = regionIds.slice(regionIds.indexOf('gigantomachy') + 1, regionIds.indexOf('olympus_approach'));
  if (K.DATA.REGIONS.length !== 26 || JSON.stringify(insertion) !== JSON.stringify(greekRegionContract.map(x => x[0]))) {
    errors.push('six Greek regions are not inserted in the approved order before Olympus Approach');
  }
  if (JSON.stringify(regionIds.slice(21,24)) !== JSON.stringify(['olympus_approach','olympus','typhon_core']) || !K.DATA.REGIONS.find(r => r.id === 'typhon_core').campaignFinal) {
    errors.push('the Olympus and Typhon finale is no longer the final three regions');
  }
  if (K.DATA.CAMPAIGN_STORY.length !== 26 || K.DATA.CONTENT_COUNTS.campaignChambers !== 208) {
    errors.push('26-region campaign does not expose 26 chapters and 208 chambers');
  }
  const tierScale = K.DATA.TIER_SCALE || [];
  if (tierScale.length !== 26) errors.push('tier multipliers do not cover all 26 regions');
  for (let i = 1; i < tierScale.length; i++) {
    ['hp','dmg','spd'].forEach(key => {
      if (!(tierScale[i][key] > tierScale[i - 1][key])) errors.push('tier ' + key + ' multiplier is not increasing at region ' + i);
    });
  }
  greekRegionContract.forEach((spec, offset) => {
    const regionIndex = 15 + offset, region = K.DATA.REGIONS[regionIndex];
    const chapter = K.DATA.CAMPAIGN_STORY[regionIndex];
    const boss = K.DATA.BOSSES[spec[2]];
    if (!region || region.id !== spec[0] || region.boss !== spec[2] || region.chamberCount !== 8) errors.push('region contract failed for ' + spec[0]);
    if (!chapter || chapter.id !== spec[1] || !chapter.choices || chapter.choices.length !== 2 || chapter.choices.some(c => !c.heal && !c.obols)) errors.push('mandatory story/reward contract failed for ' + spec[0]);
    if (chapter && spec[4].some(name => !chapter.voices.some(v => v.name === name))) errors.push('mythic cast missing from ' + spec[0] + ' story');
    if (!boss || boss.signature !== spec[3] || !Array.isArray(boss.phases) || boss.phases.length !== 3 || boss.visualKey !== spec[2]) errors.push('unique staged capstone contract failed for ' + spec[0]);
    const backdrop = assetManifest['region.' + spec[0] + '.backdrop'];
    const sprite = assetManifest['actor.boss.' + spec[2]];
    if (!backdrop || !fs.existsSync(path.join(ROOT, backdrop.src))) errors.push('generated region backdrop missing for ' + spec[0]);
    if (!sprite || sprite.cols !== 4 || sprite.rows !== 6 || !fs.existsSync(path.join(ROOT, sprite.src))) errors.push('generated 4x6 boss image sheet missing for ' + spec[2]);
  });
  for (const region of K.DATA.REGIONS) {
    const boss = K.DATA.BOSSES[region.boss];
    if (!boss) { errors.push('region ' + region.id + ' has no capstone boss'); continue; }
    if (regionalBossIds.has(boss.id)) errors.push('region capstone is reused: ' + boss.id);
    regionalBossIds.add(boss.id);
    if (!Array.isArray(boss.phases) || boss.phases.length < 3) errors.push('regional boss ' + boss.id + ' has fewer than three stages');
    else {
      if (boss.phases[0].at !== 1) errors.push('regional boss ' + boss.id + ' does not begin at full health');
      for (let i = 1; i < boss.phases.length; i++) {
        if (!(boss.phases[i].at > 0 && boss.phases[i].at < boss.phases[i - 1].at)) errors.push('regional boss ' + boss.id + ' has invalid stage thresholds');
      }
    }
    if (!boss.signature && !['lion','medusa','hydra','typhon'].includes(boss.ai)) errors.push('regional boss ' + boss.id + ' has neither a signature nor a shared family AI');
    if (!assetManifest['region.' + region.id + '.backdrop']) errors.push('region ' + region.id + ' has no raster campaign backdrop');
    if (!assetManifest['actor.boss.' + (boss.visualKey || boss.id)]) errors.push('regional boss ' + boss.id + ' has no raster sprite atlas');
  }
  if (regionalBossIds.size !== K.DATA.REGIONS.length) errors.push('not every region has its own capstone boss');
  const generatedAspects = Object.values(K.DATA.BOSSES).filter(b => b.generatedVariant);
  if (!generatedAspects.length) errors.push('generated boss aspects are missing');
  generatedAspects.forEach(aspect => {
    const family = K.DATA.BOSSES[aspect.sourceId];
    if (!family || aspect.ai !== family.ai || JSON.stringify(aspect.phases) !== JSON.stringify(family.phases)) {
      errors.push('generated boss aspect ' + aspect.id + ' failed to inherit family AI/stages without drift');
    }
    if (!assetManifest['actor.boss.' + aspect.visualKey]) errors.push('generated boss aspect ' + aspect.id + ' has no raster sprite atlas');
  });

  const signatures = new Set();
  for (let i = 0; i < namedSignatureIds.length; i++) {
    const id = namedSignatureIds[i];
    G.startRun(7200 + i);
    K.E.enemies.length = 0; K.E.effects.length = 0;
    G.regionIndex = Math.min(i, K.DATA.REGIONS.length - 1);
    G.enterChamber(0);
    const b = new K.E.Boss(id, 0, -120, G);
    b.spawnT = 0; b.entered = true; b.phase = 1; b.atkCd = 0; b.state = 'idle'; b.mem = {};
    K.E.enemies.push(b); G.boss = b;
    if (!b.def.signature) errors.push('boss ' + id + ' has no signature mechanic');
    else signatures.add(b.def.signature);
    b.update(STEP, G);
    if (b.state.indexOf('sig_') !== 0) errors.push('boss ' + id + ' did not start its stage signature');
    if (!K.E.effects.some(f => f.kind === 'telegraph')) errors.push('boss ' + id + ' signature lacks an image-backed telegraph');
    for (let frame = 0; frame < 62; frame++) b.update(STEP, G);
    const resolved = G.hazards.length > 0 || K.E.projectiles.length > 0 || K.E.effects.some(f => f.kind === 'cone');
    if (!resolved) errors.push('boss ' + id + ' signature tell did not resolve into its attack');
  }
  // Phase-three follow-ups must leave a visible response window before damage.
  const delayedFollowups = [
    { id: 'delphi_python', markAt: 0.98, damageAt: 1.30, kind: 'hazard' },
    { id: 'arcadia_boar', markAt: 0.99, damageAt: 1.27, kind: 'hazard' },
    { id: 'thebes_sphinx', markAt: 1.02, damageAt: 1.28, kind: 'hazard' },
    { id: 'marathon_bull', markAt: 0.96, damageAt: 1.22, kind: 'cone' }
  ];
  delayedFollowups.forEach((spec, index) => {
    G.startRun(7350 + index); G.enterChamber(0);
    G.hazards.length = 0; K.E.effects.length = 0; K.E.projectiles.length = 0; K.E.enemies.length = 0;
    const boss = new K.E.Boss(spec.id, -120, -120, G);
    boss.spawnT = 0; boss.entered = true; boss.phase = 2; boss.atkCd = 1.5;
    boss.state = 'sig_' + boss.def.signature; boss.stateT = spec.markAt - STEP * 0.5;
    boss.mem = { sig: { phase: 2, angle: 0, x: 280, y: -120, steps: 3, hit: true, marks: [{ x: 240, y: -120 }, { x: 280, y: -120 }, { x: 320, y: -120 }] } };
    G.boss = boss; K.E.enemies.push(boss);
    boss.update(STEP, G);
    const warned = K.E.effects.some(f => f.kind === 'telegraph');
    const immediateDamage = spec.kind === 'hazard' ? G.hazards.length > 0 : K.E.effects.some(f => f.kind === 'cone');
    if (!warned || immediateDamage) errors.push(spec.id + ' follow-up damage did not wait for its image telegraph');
    let resolved = false;
    for (let frame = 0; frame < 35 && !resolved; frame++) {
      boss.update(STEP, G);
      resolved = spec.kind === 'hazard' ? G.hazards.length > 0 : K.E.effects.some(f => f.kind === 'cone');
    }
    if (!resolved) errors.push(spec.id + ' delayed follow-up never resolved');
  });
  // The Sphinx's phase-two center door is explicitly promised as a safe answer.
  G.startRun(7360); G.enterChamber(0);
  G.hazards.length = 0; K.E.effects.length = 0; K.E.projectiles.length = 0; K.E.enemies.length = 0;
  const sphinx = new K.E.Boss('thebes_sphinx', -120, -120, G);
  sphinx.spawnT = 0; sphinx.entered = true; sphinx.phase = 1; sphinx.atkCd = 1.5;
  sphinx.state = 'sig_thebes_riddle'; sphinx.stateT = 0.57;
  sphinx.mem = { sig: { phase: 1, angle: 0, x: 280, y: -120, steps: 0, marks: [{ x: 240, y: -120 }, { x: 280, y: -120 }, { x: 320, y: -120 }] } };
  G.boss = sphinx; K.E.enemies.push(sphinx);
  sphinx.update(STEP, G);
  if (G.hazards.length !== 1 || G.hazards[0].x !== 240) errors.push('Sphinx riddle did not preserve its safe marked answer');
  G.hazards.length = 0;
  sphinx.stateT = 0.80 - STEP * 0.5;
  sphinx.mem.sig.steps = 1;
  sphinx.update(STEP, G);
  if (G.hazards.length !== 0) errors.push('Sphinx safe center answer still creates a damaging zone');
  if (signatures.size !== namedSignatureIds.length) errors.push('named boss signature mechanics are not unique');

  G.startRun(7290); G.enterChamber(0); K.E.enemies.length = 0;
  const achilles = new K.E.Boss('achilles', 0, 0, G);
  achilles.spawnT = 0; achilles.entered = true; achilles.phase = 1; achilles.guardAngle = 0; achilles.exposedT = 0;
  const guardedStart = achilles.hp;
  G.player.x = 100; G.player.y = 0;
  G.damageEnemy(achilles, 100, { source: 'test', silent: true });
  const frontLoss = guardedStart - achilles.hp;
  achilles.hp = guardedStart; G.player.x = -100;
  G.damageEnemy(achilles, 100, { source: 'test', silent: true });
  const flankLoss = guardedStart - achilles.hp;
  if (!(flankLoss > frontLoss * 1.8)) errors.push('Achilles guard did not reward flanking');
  achilles.hp = guardedStart; achilles.exposedT = 1; G.player.x = 100;
  G.damageEnemy(achilles, 100, { source: 'test', silent: true });
  if (guardedStart - achilles.hp < 99) errors.push('Achilles recovery did not open a punish window');

  G.startRun(7300);
  G.enterChamber(0);
  K.E.enemies.length = 0;
  const staged = new K.E.Boss('lion', 0, -120, G);
  staged.spawnT = 0; staged.entered = true; staged.exposedT = 2;
  K.E.enemies.push(staged); G.boss = staged;
  K.E.projectiles.length = 0; G.hazards.length = 0;
  K.E.projectiles.push(new K.E.Projectile({ friendly: false, x: 0, y: 0, life: 5 }), new K.E.Projectile({ friendly: true, x: 0, y: 0, life: 5 }));
  G.hazards.push({ friendly: false, x: G.player.x, y: G.player.y, radius: 200, life: 1, maxLife: 1, dmg: 1000, tick: 0.01, tickT: 0 });
  const transitionHp = G.player.hp;
  G.damageEnemy(staged, staged.maxHp * 0.82, { source: 'test', silent: true });
  if (K.E.projectiles.some(pr => !pr.friendly && pr.life > 0) || G.hazards.some(h => !h.friendly && h.life > 0)) errors.push('boss transition left a hostile projectile or damage zone active');
  K.E.updateHazards(STEP, G);
  K.E.updateEffects(STEP);
  if (G.player.hp !== transitionHp) errors.push('boss transition dealt lingering hazard damage');
  K.E.projectiles.length = 0; G.hazards.length = 0;
  if (staged.phase !== 1 || staged.stageQueue.length !== 1 || staged.stageQueue[0] !== 2 || staged.stageTransitionT <= 0) {
    errors.push('crossed boss stages were not queued as sequential attack-free transitions');
  } else {
    for (let i = 0; i < 145; i++) staged.update(STEP, G);
    if (staged.phase !== 2 || staged.stageQueue.length !== 0 || staged.stageTransitionT > 0) {
      errors.push('queued boss stages did not resolve in order');
    }
  }

  G.startRun(7350); G.enterChamber(0); K.E.enemies.length = 0;
  for (let i = 0; i < 13; i++) G.addEnemy('shade', i * 12, 0);
  G.summonAt(0, 0, 'empusa', 8, 120);
  const activeHostiles = K.E.enemies.filter(e => e && !e.ally && !e.dead && e.hp > 0).length;
  if (activeHostiles !== 21) errors.push('boss-phase summon should preserve 13 hostiles and add 8 (22-hostile cap), got ' + activeHostiles);

  G.startRun(7400);
  const originalRollRarity = G.rollRarity;
  const originalChance = G.run.rng.chance;
  G.rollRarity = () => 'common';
  G.run.rng.chance = () => false;
  const championChoices = G.generateBoonChoices(4, { rarityFloor: 'rare' });
  G.rollRarity = originalRollRarity;
  G.run.rng.chance = originalChance;
  const rarityAtLeastRare = c => K.DATA.RARITY[c.rarity] && K.DATA.RARITY[c.rarity].tier >= K.DATA.RARITY.rare.tier;
  if (championChoices.length !== 4 || championChoices.some(c => !rarityAtLeastRare(c))) {
    errors.push('champion boon choices did not guarantee four Rare-or-better options');
  }

  function prepareWorldCapstone(regionId,seed) {
    G.startRun(seed);
    assertWorld(G.enterRegion(regionId), 'could not enter '+regionId);
    const node=G.world.capstone;
    assertWorld(G.activateWorldNode(node.id,{force:true}), 'could not activate '+regionId+' capstone');
    if(G.boss&&!G.boss.dead)G.killEnemy(G.boss,true);
    G.pendingSpawns=[];G.checkRoomClear();
    assertWorld(G.exitGate, 'capstone clear did not produce its physical reward gate');
    return node;
  }
  function assertWorld(value,message){if(!value)throw new Error(message);}

  prepareWorldCapstone('typhon_core',7500);
  const beforeObols = G.run.obols;
  const beforeWins = K.Save.data.wins;
  if (typeof G.useExitGate !== 'function') errors.push('boss gate reward path is not available to the game controller');
  else {
    if(!G.useExitGate())errors.push('final capstone reward gate could not be claimed');
    const bossReward = G.pendingReward;
    if (G.run.obols <= beforeObols) errors.push('boss gate did not grant its regional obol tribute');
    if (!bossReward || bossReward.choices.length !== 4 || bossReward.choices.some(c => !rarityAtLeastRare(c))) {
      errors.push('final boss did not offer its champion tribute');
    } else {
      if (!bossReward.victoryAfter || bossReward.advanceAfter) errors.push('final boss reward is not sequenced into victory');
      const rerolled = G.generateBoonChoices(bossReward.choiceCount, { rarityFloor: bossReward.rarityFloor });
      if (rerolled.length !== 4 || rerolled.some(c => !rarityAtLeastRare(c))) errors.push('boss reward reroll lost its four-choice Rare+ guarantee');
      if (bossReward.campaignChapter !== K.DATA.REGIONS.findIndex(r=>r.id==='typhon_core')) errors.push('final boss reward did not queue the Typhon campaign chapter');
      const reward = bossReward.choices[0];
      G.takeBoon(reward.id, reward.rarity);
      if (G.phase !== 'story') errors.push('final boss reward skipped the closing campaign encounter');
      if (!G.chooseStory('ending_open')) errors.push('final campaign epilogue choice could not be recorded');
      if (G.phase !== 'victory' || G.run.campaignEnding !== 'open_gate') errors.push('final campaign choice did not resolve into its ending');
      G.closeOffer();
      if (G.phase !== 'victory' || K.Save.data.wins !== beforeWins + 1) errors.push('final reward could replay or leave victory');
      const paid = G.run.obols;
      if (G.useExitGate() !== false || G.run.obols !== paid) errors.push('boss gate tribute could be claimed more than once');
    }
  }
  prepareWorldCapstone('styx',7600);
  const normalObols = G.run.obols;
  if(!G.useExitGate())errors.push('non-final capstone reward gate could not be claimed');
  const normalBossReward = G.pendingReward;
  if (G.run.obols - normalObols !== 140) errors.push('non-final boss obol tribute did not scale with region');
  if (!normalBossReward || normalBossReward.choices.length !== 4 || normalBossReward.choices.some(c => !rarityAtLeastRare(c)) || !normalBossReward.advanceAfter || normalBossReward.victoryAfter) errors.push('non-final boss tribute did not preserve its Rare+ reward and advancement');
  G.closeOffer();
  if (G.phase !== 'story') errors.push('non-final capstone did not pause for its campaign conversation');
  if (!G.chooseStory('river_coin') || G.phase !== 'playing' || !G.world.chapterResolved) errors.push('non-final campaign conversation did not unlock the world exit');
  if (!G.useRegionExit('acheron') || G.regionIndex !== 2 || G.chamberIndex !== 0) errors.push('the physical world exit did not continue into the next region');
  if (G.useExitGate() !== false) errors.push('non-final boss gate could be used twice');

  prepareWorldCapstone('typhon_core',7650);
  if(!G.useExitGate())errors.push('final skip test could not claim the physical champion gate');
  const skipReward = G.pendingReward;
  if (!skipReward || skipReward.kind !== 'boss' || !skipReward.victoryAfter) errors.push('final boss skip test did not begin from the final champion tribute');
  documentShim.getElementById('btn-skip-boon').click();
  if (G.phase !== 'story' || documentShim.getElementById('screen-cutscene').classList.contains('hidden')) errors.push('skipping the final champion tribute did not preserve its campaign cutscene');
  if (!G.chooseStory('ending_cut') || G.phase !== 'victory' || G.run.campaignEnding !== 'free_thread') errors.push('skipped final tribute did not lead to the chosen epilogue and victory');

  const story = K.DATA.CAMPAIGN_STORY || [];
  if (story.length !== K.DATA.REGIONS.length) errors.push('campaign does not provide one mandatory conversation per region capstone');
  story.flatMap(ch => ch.voices).forEach(voice => {
    if (voice.godId && !K.DATA.GODS[voice.godId]) errors.push('campaign voice ' + voice.name + ' references missing god ' + voice.godId);
  });
  const cast = new Set(story.flatMap(ch => ch.voices.map(v => v.name)));
  ['Hades','Charon','Persephone','Orpheus','Eurydice','Ariadne','Daedalus','Scylla','Hera','Apollo','Nyx','Clotho','Atropos','Heracles','Pythia','Chiron','Nessus','Pan','Atalanta','Sphinx','Oedipus','Antigone','Theseus','Electra','Orestes','Tisiphone'].forEach(name => { if (!cast.has(name)) errors.push('campaign cast is missing ' + name); });
  if (!K.Save.data.campaignArchive.some(ch => ch.title === 'THE THREAD WITHOUT A KEEPER' && ch.ending === 'open_gate')) errors.push('chosen campaign ending was not preserved in the saga archive');
  log('boss + saga: 18 signature-capable bosses, ' + regionalBossIds.size + ' regional capstones, ' + signatures.size + ' signatures, generated aspects, Rare+ tribute, and every regional story scene checked');
} catch (e) { errors.push('boss overhaul: ' + e.stack); }
/* ============================================================
   Report
   ============================================================ */
console.log('');
logs.forEach(l => console.log('  ' + l));
console.log('');
if (errors.length) {
  console.log('FAILURES (' + errors.length + '):');
  errors.slice(0, 40).forEach(e => console.log('  ✗ ' + e));
  process.exit(1);
} else {
  console.log('ALL SMOKE TESTS PASSED');
  process.exit(0);
}








