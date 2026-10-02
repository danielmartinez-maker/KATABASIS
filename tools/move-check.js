/* Precise, isolated verification of the movement fix and the four abilities. */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const EXE = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(b => fs.existsSync(b));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
  const child = spawn(EXE, ['--headless=new', '--disable-gpu', '--mute-audio', '--no-first-run',
    '--remote-debugging-port=9411', '--user-data-dir=' + path.join(os.tmpdir(), 'kb5-' + Date.now()),
    '--window-size=1280,800', url], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60; i++) { await sleep(300); try { const j = await (await fetch('http://127.0.0.1:9411/json/list')).json(); target = j.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (target) break; } catch (e) {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let id = 0; const problems = [];
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      problems.push('EXCEPTION: ' + (d.exception && d.exception.description ? d.exception.description.split('\n')[0] : d.text));
    }
  });
  const send = (method, params) => new Promise(res => { const i = ++id; pending.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '') }; return r.result ? r.result.value : null; };
  await send('Runtime.enable');
  await sleep(1500);
  await ev('document.getElementById("btn-begin").click()');
  await sleep(600);

  const out = await ev(`JSON.stringify((function(){
    var K = window.K, U = K.U, G = K.G, p = G.player;
    var res = {};
    function clear(){ ['KeyW','KeyA','KeyS','KeyD'].forEach(function(k){ K.Input.keys[k]=false; }); }
    function drive(frames){ for (var i=0;i<frames;i++) G.update(1/60); }
    function reset(){ K.E.enemies.length=0; p.x=0;p.y=0;p.vx=0;p.vy=0;p.knockVX=0;p.knockVY=0; clear(); }

    /* --- 1. moveVec is always a unit vector --- */
    reset(); K.Input.keys['KeyD']=true;
    var a=K.Input.moveVec(); res.moveVecCard=+Math.hypot(a.x,a.y).toFixed(6);
    clear(); K.Input.keys['KeyD']=true; K.Input.keys['KeyS']=true;
    var b=K.Input.moveVec(); res.moveVecDiag=+Math.hypot(b.x,b.y).toFixed(6);
    clear();

    /* --- 2. top speed reached fast and identical in all 8 directions --- */
    var dirs={right:['KeyD'],down:['KeyS'],left:['KeyA'],up:['KeyW'],
              dr:['KeyD','KeyS'],dl:['KeyA','KeyS'],ur:['KeyD','KeyW'],ul:['KeyA','KeyW']};
    res.rampFrames={}; res.topSpeed={};
    Object.keys(dirs).forEach(function(nm){
      reset();
      var keys=dirs[nm], f=0, maxStat=p.stats.moveSpeed;
      keys.forEach(function(k){ K.Input.keys[k]=true; });
      while (f<240){ G.update(1/60); f++; if (Math.hypot(p.vx,p.vy) >= maxStat-0.5) break; }
      res.rampFrames[nm]=f;
      res.topSpeed[nm]=+Math.hypot(p.vx,p.vy).toFixed(2);
      clear();
    });

    /* --- 3. braking: frames and distance to a full stop --- */
    reset(); K.Input.keys['KeyD']=true; drive(40);
    var vTop=+Math.hypot(p.vx,p.vy).toFixed(1);
    clear();
    var bx=p.x, bf=0;
    while (Math.hypot(p.vx,p.vy)>0.5 && bf<240){ G.update(1/60); bf++; }
    res.brakeFromTop={ speed:vTop, frames:bf, px:+(p.x-bx).toFixed(1) };

    /* --- 4. knockback carries you, then releases control back --- */
    reset(); p.knockVX=260; p.knockVY=0;
    drive(40);
    res.knockCarryPx=+p.x.toFixed(1);
    res.knockLeftAfter40f=+Math.hypot(p.knockVX,p.knockVY).toFixed(1);

    /* --- 5. abilities exist, fire, and go on cooldown --- */
    reset(); p.hp = p.stats.maxHp;
    res.abilities={};
    /* Guard */
    p.guardCd=0; p.guardT=0; p.guardRecover=0;
    p.startGuard(G);
    res.abilities.guard={ active:p.guardT>0, cd:+p.guardCd.toFixed(2) };
    /* Cast spawns a projectile with an onDeath rift */
    reset(); p.castCd=0;
    var projBefore=K.E.projectiles.length;
    p.doCast(G);
    res.abilities.cast={ newProjectiles:K.E.projectiles.length-projBefore, cd:+p.castCd.toFixed(2) };
    /* Rush */
    reset(); p.rushCd=0;
    p.doRush(G);
    res.abilities.rush={ active:p.rushT>0, cd:+p.rushCd.toFixed(2), dir:+p.rushDir.toFixed(2) };
    var rx0=p.x; drive(30);
    res.abilities.rush.distance=+Math.hypot(p.x-rx0,p.y).toFixed(1);
    /* Ascend */
    reset(); p.ascendCd=0; p.ascendT=0;
    var dmgBefore=p.stats.damage;
    p.doAscend(G);
    res.abilities.ascend={ active:p.ascendT>0, cd:+p.ascendCd.toFixed(2),
      dmgBefore:+dmgBefore.toFixed(1), dmgDuring:+p.stats.damage.toFixed(1),
      invuln:+p.invuln.toFixed(2) };
    /* let it expire and confirm the boost is removed */
    drive(6*60);
    res.abilities.ascend.expired = p.ascendT===0;
    res.abilities.ascend.dmgAfter = +p.stats.damage.toFixed(1);

    /* --- 6. Guard blocks frontally, parries when fresh, and is directional --- */
    reset(); p.hp=p.stats.maxHp;
    var hpFull=p.stats.maxHp;
    function raiseGuard(){
      p.aim=0; p.guardDir=0; p.invuln=0; p.shield=0; p.perfect=0;
      p.guardRecover=0; p.guardCd=0; p.guardT=0;
      p.startGuard(G);
    }
    /* BLOCK: guard has been up past the parry window */
    raiseGuard();
    p.guardT = p.guardWindow - 0.30;
    var pc0=p.parryCount;
    G.damagePlayer(100, { x: 200, y: 0 }, 'contact');
    res.guardBlocked = { hpLost:+(hpFull-p.hp).toFixed(1), fresh:p.guardIsFresh(),
      window:p.guardWindow, parries:p.parryCount-pc0 };
    /* PARRY: guard raised this very instant */
    reset(); p.hp=hpFull;
    raiseGuard();
    var pc1=p.parryCount;
    G.damagePlayer(100, { x: 200, y: 0 }, 'contact');
    res.guardParried = { hpLost:+(hpFull-p.hp).toFixed(1), fresh:p.guardIsFresh(),
      perfectWindow:+p.perfect.toFixed(2), parries:p.parryCount-pc1 };
    /* BEHIND: the guard faces the other way */
    reset(); p.hp=hpFull;
    raiseGuard();
    p.guardT = p.guardWindow - 0.30;
    G.damagePlayer(50, { x: -200, y: 0 }, 'contact');
    res.guardFromBehind = { hpLost:+(hpFull-p.hp).toFixed(1) };

    return res;
  })(), null, 1)`);

  console.log('--- MOVEMENT (after fix) ---');
  if (out && out.__err) { console.log('ERR', out.__err); }
  else if (!out) { console.log('no result'); }
  else {
    const r = JSON.parse(out);
    console.log('moveVec length      cardinal=' + r.moveVecCard + '  diagonal=' + r.moveVecDiag + (r.moveVecCard === 1 && r.moveVecDiag === 1 ? '   [unit vectors OK]' : '   [!]'));
    const dirs = Object.keys(r.rampFrames);
    const worst = Math.max.apply(null, dirs.map(d => r.rampFrames[d]));
    const speeds = dirs.map(d => r.topSpeed[d]);
    console.log('ramp to top speed   ' + JSON.stringify(r.rampFrames));
    console.log('  worst case        ' + worst + ' frames (' + (worst / 60 * 1000).toFixed(0) + 'ms)');
    console.log('top speed per dir   ' + JSON.stringify(r.topSpeed));
    console.log('  spread            ' + (Math.max.apply(null, speeds) - Math.min.apply(null, speeds)).toFixed(3) + ' px/s  ' +
      (Math.max.apply(null, speeds) - Math.min.apply(null, speeds) < 0.01 ? '[identical in all 8 directions]' : '[!]'));
    console.log('brake from top      ' + r.brakeFromTop.frames + ' frames, ' + r.brakeFromTop.px + 'px  (from ' + r.brakeFromTop.speed + ' px/s)');
    console.log('knockback carry     ' + r.knockCarryPx + 'px over 40 frames, residual ' + r.knockLeftAfter40f);
    console.log('');
    console.log('--- ABILITIES ---');
    console.log('Guard    active=' + r.abilities.guard.active + '  cd=' + r.abilities.guard.cd + 's');
    console.log('Cast     spawned ' + r.abilities.cast.newProjectiles + ' projectile, cd=' + r.abilities.cast.cd + 's');
    console.log('Rush     active=' + r.abilities.rush.active + ' cd=' + r.abilities.rush.cd + 's  travelled ' + r.abilities.rush.distance + 'px');
    const a = r.abilities.ascend;
    console.log('Ascend   active=' + a.active + ' cd=' + a.cd + 's  dmg ' + a.dmgBefore + ' -> ' + a.dmgDuring +
      '  invuln=' + a.invuln + 's  expired=' + a.expired + '  dmgAfter=' + a.dmgAfter);
    console.log('');
    console.log('--- GUARD BEHAVIOUR ---');
    console.log('frontal hit, BLOCK   hp lost ' + r.guardBlocked.hpLost + ' of 100   (fresh=' + r.guardBlocked.fresh + ', parries=' + r.guardBlocked.parries + ')');
    console.log('frontal hit, PARRY   hp lost ' + r.guardParried.hpLost + ' of 100   (fresh=' + r.guardParried.fresh + ', parries=' + r.guardParried.parries + ')');
    console.log('hit from BEHIND      hp lost ' + r.guardFromBehind.hpLost + ' of 50    (guard is directional)');

    /* assertions */
    const fails = [];
    if (r.moveVecCard !== 1 || r.moveVecDiag !== 1) fails.push('moveVec is not a unit vector (diagonal would be faster)');
    if (worst > 8) fails.push('ramp to top speed takes ' + worst + ' frames');
    if (Math.max.apply(null, speeds) - Math.min.apply(null, speeds) > 0.01) fails.push('top speed differs by direction');
    if (r.brakeFromTop.frames > 8) fails.push('braking takes ' + r.brakeFromTop.frames + ' frames');
    if (r.knockCarryPx < 30) fails.push('knockback barely moves the player (' + r.knockCarryPx + 'px)');
    if (!r.abilities.guard.active) fails.push('Guard does not activate');
    if (r.abilities.cast.newProjectiles < 1) fails.push('Cast spawns no projectile');
    if (!r.abilities.rush.active || r.abilities.rush.distance < 100) fails.push('Rush does not move the player');
    if (!a.active) fails.push('Ascend does not activate');
    if (!(a.dmgDuring > a.dmgBefore)) fails.push('Ascend does not raise damage');
    if (!a.expired) fails.push('Ascend never expires');
    if (Math.abs(a.dmgAfter - a.dmgBefore) > 0.01) fails.push('Ascend boost is not removed on expiry (' + a.dmgBefore + ' -> ' + a.dmgAfter + ')');
    if (r.guardBlocked.hpLost > 30) fails.push('Guard blocks too little (' + r.guardBlocked.hpLost + ')');
    if (r.guardParried.hpLost > 0.01) fails.push('Parry still takes damage (' + r.guardParried.hpLost + ')');
    if (r.guardFromBehind.hpLost < 40) fails.push('Guard blocks from behind — it should be directional');
    problems.forEach(p => fails.push(p));
    console.log('');
    if (fails.length) { console.log('FAILURES:'); fails.forEach(f => console.log('  ✗ ' + f)); }
    else console.log('ALL MOVEMENT + ABILITY CHECKS PASSED');
  }

  try { ws.close(); } catch (e) {}
  try { child.kill(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.log('err', e.message); process.exit(1); });
