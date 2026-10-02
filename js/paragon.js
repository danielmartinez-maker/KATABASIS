/* ============================================================
   KATABASIS — The Loom of the Fates, permanent Paragon graph.
   ============================================================ */
(function () {
  'use strict';
  const K = window.K;
  const ROOT_ID = 'wayfarer';
  const MAX_SPENDABLE_POINTS = 42;
  const BRANCH_DEFS = [
    { id:'ares', name:'Ares', theme:'War', nodes:[
      ['edge','Sharpened Edge','dmgMul',0.025],['blood','Red Harvest','killHeal',0.8],['onslaught','Relentless Onslaught','attSpd',0.025],['warcry','War-Cry','dmgMul',0.055]
    ], keystones:[['blood','Blood Price',{dmgMul:0.22, armor:-0.2}],['warpath','Unbroken Advance',{dmgMul:0.12, moveMul:0.04}]] },
    { id:'athena', name:'Athena', theme:'Wisdom', nodes:[
      ['bronze','Bronze Resolve','armor',0.2],['aegis','Aegis Memory','dmgReduce',0.012],['discipline','Disciplined Guard','maxHp',8],['phalanx','Unyielding Phalanx','armor',0.42]
    ], keystones:[['citadel','Living Citadel',{armor:1.1,dmgReduce:0.045}],['riposte','Perfect Riposte',{crit:0.04,armor:0.4}]] },
    { id:'artemis', name:'Artemis', theme:'Hunt', nodes:[
      ['eye','Hunter’s Eye','crit',0.012],['mark','Marked Quarry','critMark',0.04],['fletch','Sure Flight','reachMul',0.03],['ambush','Patient Ambush','critMul',0.12]
    ], keystones:[['moon','Moon’s Verdict',{crit:0.12,critMul:0.28}],['pursuit','Endless Pursuit',{reachMul:0.16,attSpd:0.05}]] },
    { id:'hermes', name:'Hermes', theme:'Journey', nodes:[
      ['stride','Fleet Stride','moveMul',0.035],['dash','Farther Dash','dashDist',0.05],['tempo','Quickened Tempo','attSpd',0.022],['wind','Wind at Your Back','moveMul',0.065]
    ], keystones:[['gale','Gale Runner',{moveMul:0.14,dodge:0.06}],['echo','Echoing Step',{dashCharge:1,dashDmg:7}]] },
    { id:'demeter', name:'Demeter', theme:'Harvest', nodes:[
      ['roots','Deep Roots','maxHp',10],['winter','Winter’s Patience','dmgReduce',0.012],['fruit','Ambrosial Fruit','harvestOnKill',0.025],['bounty','Abundant Harvest','maxHp',18]
    ], keystones:[['evergreen','Evergreen Heart',{maxHp:90,killHeal:1.2}],['blight','Killer Frost',{winterOnHit:1,dmgMul:0.08}]] },
    { id:'hades', name:'Hades', theme:'Underworld', nodes:[
      ['coin','Obol’s Due','obolMul',0.06],['dark','Dark Tribute','darkBonus',0.08],['grasp','Stygian Grasp','maxShield',18],['crown','King Beneath','dmgMul',0.05]
    ], keystones:[['wealth','Plutus’s Covenant',{obolMul:0.32,freeShop:0.05}],['shade','Crown of Shades',{darkBonus:0.4,deathDefy:1}]] }
  ];
  const NODES = Object.assign(Object.create(null),{ [ROOT_ID]:{ id:ROOT_ID, name:'Wayfarer', branch:'root', cost:0, requires:[], fx:{} } });
  const BRANCHES = {};
  BRANCH_DEFS.forEach(def => {
    const branch = { id:def.id, name:def.name, theme:def.theme, nodes:[], keystones:[] };
    let prev = ROOT_ID;
    def.nodes.forEach((n, i) => {
      const id = def.id + '_' + (i + 1);
      const node = { id, name:n[1], branch:def.id, tier:i + 1, cost:1, requires:[prev], fx:{ [n[2]]:n[3] }, keystone:false };
      NODES[id] = node; branch.nodes.push(node); prev = id;
    });
    def.keystones.forEach(k => {
      const id = def.id + '_keystone_' + k[0];
      const node = { id, name:k[1], branch:def.id, tier:5, cost:3, requires:[prev], fx:k[2], keystone:true };
      NODES[id] = node; branch.keystones.push(node);
    });
    BRANCHES[def.id] = branch;
  });
  const API = {};

  function current(save) { return save || K.Save.data; }
  function owns(save, id) { return (save.paragonNodes || []).indexOf(id) >= 0; }
  function safeInt(value) { return Number.isSafeInteger(value) && value >= 0 ? value : 0; }
  function safeAdd(a, b) { return Math.min(Number.MAX_SAFE_INTEGER, safeInt(a) + safeInt(b)); }
  function writeAndRecalc() {
    K.Save.write();
    if (K.G && K.G.run && K.G.recalcStats) K.G.recalcStats();
  }

  API.normalizeSave = function (save) {
    if (!save || typeof save !== 'object') return save;
    save.paragonUnlocked = !!save.paragonUnlocked;
    const rawXp = safeInt(save.paragonXp), earned = Math.floor(rawXp / 100);
    save.paragonXp = rawXp % 100;
    save.paragonPoints = safeInt(save.paragonPoints);
    const input = Array.isArray(save.paragonNodes) ? save.paragonNodes : [];
    const accepted = save.paragonUnlocked ? [ROOT_ID] : [];
    input.forEach(id => {
      if (typeof id !== 'string') return;
      const node = NODES[id];
      if (!node || id === ROOT_ID || !save.paragonUnlocked || accepted.indexOf(id) >= 0) return;
      if (!node.requires.every(req => accepted.includes(req))) return;
      if (node.keystone && accepted.some(otherId => NODES[otherId] && NODES[otherId].branch === node.branch && NODES[otherId].keystone)) return;
      accepted.push(id);
    });
    save.paragonNodes = accepted;
    const spent = accepted.reduce((sum, id) => {
      const node = NODES[id]; return node && id !== ROOT_ID ? safeAdd(sum, node.cost) : sum;
    }, 0);
    const available = Math.max(0, MAX_SPENDABLE_POINTS - Math.min(MAX_SPENDABLE_POINTS, spent + save.paragonPoints));
    save.paragonPoints = safeAdd(save.paragonPoints, Math.min(earned, available));
    return save;
  };

  API.unlock = function () {
    const save = K.Save.data;
    if (save.paragonUnlocked) return false;
    save.paragonUnlocked = true;
    API.normalizeSave(save);
    K.Save.write();
    return true;
  };

  API.awardXp = function (amount) {
    const save = K.Save.data;
    const xp = Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
    if (!xp) return { gained:0, points:0, xp:safeInt(save.paragonXp) };
    const whole = Math.floor(xp / 100), remainder = xp % 100;
    const combined = safeInt(save.paragonXp) + remainder;
    const earned = whole + Math.floor(combined / 100);
    const spent = (save.paragonNodes || []).reduce((sum, id) => {
      const node = NODES[id]; return node && id !== ROOT_ID ? safeAdd(sum, node.cost) : sum;
    }, 0);
    const current = safeInt(save.paragonPoints);
    const available = Math.max(0, MAX_SPENDABLE_POINTS - Math.min(MAX_SPENDABLE_POINTS, spent + current));
    const gained = Math.min(earned, available);
    save.paragonXp = combined % 100;
    save.paragonPoints = safeAdd(save.paragonPoints, gained);
    K.Save.write();
    return { gained:xp, points:gained, xp:save.paragonXp };
  };

  API.canBuy = function (nodeId, saveArg) {
    const save = current(saveArg), node = NODES[nodeId];
    if (!node || node.id === ROOT_ID || !save.paragonUnlocked || owns(save, nodeId)) return false;
    if (!node.requires.every(req => owns(save, req))) return false;
    if (save.paragonPoints < node.cost) return false;
    if (node.keystone && (save.paragonNodes || []).some(id => NODES[id] && NODES[id].branch === node.branch && NODES[id].keystone)) return false;
    return true;
  };

  API.buy = function (nodeId) {
    const save = K.Save.data, node = NODES[nodeId];
    if (!API.canBuy(nodeId, save) || !node) return false;
    save.paragonPoints -= node.cost;
    save.paragonNodes.push(nodeId);
    writeAndRecalc();
    return true;
  };

  API.respecCost = function (saveArg) {
    const save = current(saveArg), count = (save.paragonNodes || []).filter(id => id !== ROOT_ID && NODES[id]).length;
    return Math.min(Number.MAX_SAFE_INTEGER, 100 + 50 * count);
  };
  API.respec = function () {
    const save = K.Save.data;
    if (!save.paragonUnlocked) return false;
    const bought = (save.paragonNodes || []).map(id => NODES[id]).filter(n => n && n.id !== ROOT_ID);
    if (!bought.length) return false;
    const cost = API.respecCost(save), refunded = bought.reduce((sum, n) => safeAdd(sum, n.cost), 0);
    if (!Number.isSafeInteger(save.obols) || save.obols < cost) return false;
    save.obols -= cost;
    save.paragonPoints = Math.min(MAX_SPENDABLE_POINTS, safeAdd(save.paragonPoints, refunded));
    save.paragonNodes = [ROOT_ID];
    writeAndRecalc();
    return { cost, refunded };
  };

  API.effects = function (saveArg) {
    const save = current(saveArg), total = {};
    (save.paragonNodes || []).forEach(id => {
      const node = NODES[id];
      if (!node || id === ROOT_ID) return;
      Object.keys(node.fx).forEach(key => { total[key] = (total[key] || 0) + node.fx[key]; });
    });
    return total;
  };
  API.ROOT_ID = ROOT_ID;
  API.NODES = NODES;
  API.BRANCHES = BRANCHES;
  API.MAX_SPENDABLE_POINTS = MAX_SPENDABLE_POINTS;
  K.Paragon = API;
})();
