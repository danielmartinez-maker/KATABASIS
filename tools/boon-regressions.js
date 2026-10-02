'use strict';
const assert = require('assert');
const {K,G,documentShim,windowShim,storage,releaseAll} = require('./debug-harness');
const D = K.DATA;
const tests = [];
const test = (name, fn) => tests.push({name, fn});

function reset(seed) {
  storage.clear(); K.Save.clear(); K.Save.load(); releaseAll();
  G.startRun(seed || 73101, {});
  G.pendingReward = null;
  const choices = documentShim.getElementById('reward-choices');
  choices.children.length = 0;
}
function renderOffer(id, rarity, current) {
  reset(73102);
  if (current) { G.run.addBoon(id, current); G.recalcStats(); }
  const wrap = documentShim.getElementById('reward-choices');
  wrap.children.length = 0;
  const reward = {kind:'boon', choices:[{id, rarity}], rerolls:0, skipBonus:30};
  G.pendingReward = reward;
  G.onTransition('reward', reward);
  assert.strictEqual(wrap.children.length, 1, 'offer UI did not render exactly one boon card');
  return wrap.children[0].innerHTML;
}
function renderCodexBoon(id) {
  reset(73103);
  K.Save.data.seenBoons[id] = true;
  const body = documentShim.getElementById('codex-body');
  body.children.length = 0;
  documentShim.getElementById('btn-boons').click();
  const search = documentShim.getElementById('codex-search');
  search.value = D.boonById[id].name;
  body.children.length = 0;
  search.dispatch('input', {target:search});
  assert.strictEqual(body.children.length, 1, 'Codex did not render one boon-result grid');
  const card = body.children[0].children.find(item => item.innerHTML.includes('<h4>' + D.boonById[id].name + '</h4>'));
  assert.ok(card, 'Codex search did not render the exact source boon');
  return card.innerHTML;
}

test('startRun accepts the no-options call used by the title and retry buttons', () => {
  reset(73104);
  G.startRun(73105);
  assert.ok(G.run && G.player && G.phase !== 'idle', 'startRun did not enter an active run');
});

test('Heroic Lightning Strike description binds to attack damage and includes its percent unit', () => {
  const html = renderOffer('z_strike', 'heroic');
  assert.match(html, /\+73\.5% attack damage/);
  assert.match(html, /Attack damage bonus<\/span><strong>\+73\.5%/);
});

test('Heroic Doom description binds to detonation damage, not the Doom flag', () => {
  const html = renderOffer('r_special', 'heroic');
  assert.match(html, /detonates for 126 damage/);
  assert.match(html, /Doom detonation damage<\/span><strong>\+126 points/);
});

test('binary boon mechanics stay binary when rarity changes', () => {
  const doom = D.boonById.r_special;
  assert.strictEqual(K.resolveBoonFx(doom, 'heroic').doomOnHit, 1);
  const html = renderOffer('r_special', 'heroic');
  assert.match(html, /Apply DOOM<\/span><strong>Granted/);
  for (const id of ['z_dash','p_special','e_strike','d_high','h_special']) {
    const def = D.boonById[id];
    const flag = Object.keys(def.fx).find(key => typeof def.fx[key] === 'number' && def.fx[key] === 1 &&
      ['dashTrail','waveOnHit','waveOnDash','winterOnHit','immuneSlow','hammerTime'].includes(key));
    if (flag) assert.strictEqual(K.resolveBoonFx(def, 'heroic')[flag], 1, id + ' scaled binary ' + flag);
  }
});

test('marked-target damage is described as a damage bonus, not a proc chance', () => {
  const hero = renderOffer('t_mark', 'heroic');
  assert.match(hero, /marked enemies take \+52\.5% damage/);
  assert.match(hero, /Marked-target damage bonus<\/span><strong>\+52\.5%/);
});

test('melee applies the marked-target damage bonus exactly once', () => {
  reset(73110);
  G.run.addBoon('t_mark','common'); G.recalcStats();
  const player=G.player, foe=G.addEnemy('shade',40,0);
  player.x=0; player.y=0; player.aim=0; player.comboStep=0;
  foe.x=40; foe.y=0; foe.hp=foe.maxHp=10000;
  G.applyStatus(foe,'mark',{amount:player.stats.critMark,dur:5});
  const base=player.attackDamage(), oldRandom=Math.random;
  try { Math.random=()=>0.99; player.doAttack(G); } finally { Math.random=oldRandom; }
  const actual=10000-foe.hp, expected=base*(1+player.stats.critMark);
  assert.ok(Math.abs(actual-expected)<0.001,'expected one mark multiplier ('+expected+'), got '+actual);
});

test('Heroic intervals and counts resolve to useful whole values without slowing power shots', () => {
  const resolve = (id, rarity) => K.resolveBoonFx(D.boonById[id], rarity);
  assert.strictEqual(resolve('t_pierce','common').powerShot, 4);
  assert.ok(Number.isInteger(resolve('t_pierce','heroic').powerShot));
  assert.ok(resolve('t_pierce','heroic').powerShot <= resolve('t_pierce','common').powerShot,
    'higher rarity made the power shot less frequent');
  assert.ok(Number.isInteger(resolve('m_dash','heroic').dashCharge), 'rarity produced a fractional dash charge');
  const generatedPierce = D.BOONS.find(b => b.generatedVariant && b.fx.pierce);
  assert.ok(generatedPierce);
  assert.ok(Number.isInteger(resolve(generatedPierce.id,'heroic').pierce), 'rarity produced fractional extra targets');
});

test('Heroic Call boon text reports the actual capped cooldown reduction', () => {
  reset(73112);
  const fx=K.resolveBoonFx(D.boonById.z_call,'heroic');
  G.run.addBoon('z_call','heroic'); G.recalcStats();
  G.startCall(G.player);
  const actualCooldown=G.player.callCd;
  const html=renderOffer('z_call','heroic');
  assert.ok(fx.callBoost<=0.4,'resolved Call reduction exceeds the 40% combat cap: '+fx.callBoost);
  assert.ok(Math.abs(actualCooldown-(22*(1-fx.callBoost)))<0.001,'Call cooldown disagrees with displayed reduction');
  assert.match(html,/Reduce Call cooldown by 40%/);
});

test('bleed damage uses the boon’s stated damage-per-second value', () => {
  reset(73106);
  const foe = K.E.createEnemy ? K.E.createEnemy('shade', 0, 0) : G.addEnemy('shade', 0, 0);
  foe.spawnT = 0; foe.vx = 0; foe.vy = 0;
  const hp = foe.hp;
  G.applyStatus(foe, 'bleed', K.resolveBoonFx(D.boonById.r_strike, 'common').bleed);
  for (let i=0;i<8;i++) foe.update(0.05, G);
  assert.ok(Math.abs((hp - foe.hp) - 6.4) < 0.001, '16 bleed damage/s should deal 6.4 damage after 0.4 s of frames; got ' + (hp - foe.hp));
});

test('bleed-amplifier damage applies to player hits against bleeding targets', () => {
  reset(73107);
  G.run.addBoon('duo_fastkill', 'duo'); G.recalcStats();
  const clean = G.addEnemy('shade', 0, 0), bleeding = G.addEnemy('shade', 100, 0);
  clean.hp = clean.maxHp = bleeding.hp = bleeding.maxHp = 10000;
  G.applyStatus(bleeding, 'bleed', {dmg:1,dur:4});
  const normal = G.damageEnemy(clean, 100, {source:'melee',player:G.player});
  const amplified = G.damageEnemy(bleeding, 100, {source:'melee',player:G.player});
  assert.ok(Math.abs(normal - 100) < 0.001);
  assert.ok(Math.abs(amplified - 135) < 0.001, '35% bonus should turn 100 into 135, got ' + amplified);
});

test('bleed-amplifier damage applies to player-owned projectile hits', () => {
  reset(73109);
  G.run.addBoon('duo_fastkill', 'duo'); G.recalcStats();
  const foe = G.addEnemy('shade', 0, 0);
  foe.hp = foe.maxHp = 10000;
  G.applyStatus(foe, 'bleed', {dmg:1,dur:4});
  const projectile = new K.E.Projectile({x:0,y:0,dmg:100,friendly:true,owner:G.player,persp:'spear',life:2,trail:false,hitWall:false});
  projectile.update(0.01, G);
  assert.ok(Math.abs((10000 - foe.hp) - 135) < 0.001,
    'player-owned projectile should apply the 35% bleed bonus; damage=' + (10000 - foe.hp));
});

test('projectile damage boon increases the actual piercing power-shot hit', () => {
  reset(73108);
  G.run.addBoon('t_pierce', 'common'); G.recalcStats();
  assert.ok(G.player.stats.projDmg >= 0.2, '20% boon was missing from the resolved projectile damage bonus');
  G.player.attackCount = 3;
  const before = K.E.projectiles.length;
  G.player.doAttack(G);
  const shot = K.E.projectiles.slice(before).find(projectile => projectile.persp === 'spear');
  assert.ok(shot, 'fourth attack did not emit the described power shot');
  const expected = G.player.attackDamage() * 1.5 * 2.2 * (1 + G.player.stats.projDmg);
  assert.ok(Math.abs(shot.dmg - expected) < 0.001, 'power-shot damage did not apply its full projectile damage bonus: expected ' + expected + ', got ' + shot.dmg);
});

test('build preview uses distinct names for base damage, damage bonus, and attack cadence', () => {
  const html = renderOffer('z_strike', 'heroic');
  const occurrences = text => (html.match(new RegExp(text, 'g')) || []).length;
  assert.strictEqual(occurrences('Attack speed bonus'), 1, 'attack speed boon effect is duplicated');
  assert.strictEqual(occurrences('Attack speed multiplier'), 1, 'derived attackSpeed alias is shown twice');
  assert.match(html, /Attack damage per hit/);
  assert.match(html, /Attack damage bonus/);
  assert.doesNotMatch(html, /<span>Attack cadence<\/span>/);
});

test('first Cast bonus previews the real neutral multiplier of one', () => {
  const html=renderOffer('x3_zeus_castFork','heroic');
  assert.match(html,/Cast damage multiplier<\/span><strong>×1 → ×1\.11/);
  assert.doesNotMatch(html,/Cast damage multiplier<\/span><strong>×0 →/);
});

test('boon upgrade and Codex render the same resolved Rare-to-Heroic values', () => {
  const upgrade = renderOffer('z_strike', 'heroic', 'rare');
  assert.match(upgrade, /\+45\.5% → \+73\.5%/);
  const codex = renderCodexBoon('z_strike');
  assert.match(codex, /\+45\.5% attack damage/);
  assert.match(codex, /Attack damage bonus<\/span><strong>\+45\.5%/);
});

test('all 8,460 boon cards render without unresolved or non-numeric text', () => {
  reset(73111);
  const all = D.BOONS.concat(D.SPECIAL_BOONS), wrap = documentShim.getElementById('reward-choices');
  let rendered = 0;
  for (const boon of all) {
    const rarity = boon.rarity === 'duo' || boon.rarity === 'legendary' ? boon.rarity : 'heroic';
    wrap.children.length = 0;
    const reward = {kind:'boon',choices:[{id:boon.id,rarity}],rerolls:0,skipBonus:30};
    G.pendingReward = reward;
    G.onTransition('reward',reward);
    assert.strictEqual(wrap.children.length,1,boon.id+' did not render one card');
    assert.doesNotMatch(wrap.children[0].innerHTML,/%[A-Z]%|\b(?:NaN|undefined)\b/i,boon.id+' rendered an unresolved value');
    rendered++;
  }
  assert.strictEqual(rendered,8460);
});

test('every catalog record has valid named bindings for every description token', () => {
  const all = D.BOONS.concat(D.SPECIAL_BOONS);
  const units = new Set(['percent','absolutePercent','seconds','damage','dps','health','shield','armor','ordinal','dashCharges','count']);
  assert.strictEqual(all.length, 8460, 'catalog count changed without updating this audit');
  let tokenRecords = 0;
  for (const boon of all) {
    const tokens = Array.from(boon.desc.matchAll(/%([A-Z])%/g), match => match[1]);
    if (!tokens.length) continue;
    tokenRecords++;
    assert.ok(boon.descFx && typeof boon.descFx === 'object', boon.id + ' has placeholders without named effect bindings');
    for (const token of tokens) {
      const binding = boon.descFx[token];
      assert.ok(binding, boon.id + ' has no binding for %' + token + '%');
      const path = typeof binding === 'string' ? binding : binding.path;
      assert.ok(typeof path === 'string' && path.length, boon.id + ' binding for %' + token + '% has no effect path');
      if (typeof binding === 'object') assert.ok(units.has(binding.unit), boon.id + ' binding for %' + token + '% has an unknown unit');
      const value = path.split('.').reduce((cursor, part) => cursor && cursor[part], boon.fx);
      assert.strictEqual(typeof value, 'number', boon.id + ' binding ' + path + ' does not resolve to a number');
      for (const rarity of ['common','rare','epic','heroic']) {
        const resolved = K.resolveBoonFx(boon, rarity);
        const scaled = path.split('.').reduce((cursor, part) => cursor && cursor[part], resolved);
        assert.ok(Number.isFinite(scaled), boon.id + ' binding ' + path + ' is not finite at ' + rarity);
      }
    }
  }
  assert.strictEqual(tokenRecords, 7140, 'expected every source boon profile record to retain its tokens');
});

test('boon catalog documentation reports the runtime counts', () => {
  const fs = require('fs'), path = require('path');
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  assert.ok(readme.includes('8,460 boon definitions'), 'README main catalog count is stale');
  assert.match(readme, /7,620 ordinary entries from 381 base\s+boon families/, 'README ordinary boon count is stale');
  assert.ok(readme.includes('840 special entries from 42 families'), 'README special boon count is stale');
});

let failures = 0;
for (const item of tests) {
  try { item.fn(); console.log('PASS ' + item.name); }
  catch (error) { failures++; console.error('FAIL ' + item.name + '\n  ' + error.message); }
}
console.log((tests.length - failures) + '/' + tests.length + ' boon regressions passed');
if (failures) process.exitCode = 1;

