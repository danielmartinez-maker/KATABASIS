/* ============================================================
   KATABASIS — real-browser check.
   Serves the folder, drives the actual page in headless Chromium
   over the DevTools protocol, plays the game for real (movement,
   attacks, dashes, wraths, calls, menus) and reports any console
   error, uncaught exception, or failed request.
   Run:  node tools/browser-check.js
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8731;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function findBrowser() {
  for (const b of BROWSERS) if (fs.existsSync(b)) return b;
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + PORT + '/index.html';
  const exe = findBrowser();
  if (!exe) {
    console.log('No Chromium browser found — skipping the browser check.');
    server.close();
    process.exit(0);
  }

  const profile = path.join(require('os').tmpdir(), 'katabasis-check-' + Date.now());
  const child = spawn(exe, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--mute-audio',
    '--remote-debugging-port=9333',
    '--user-data-dir=' + profile,
    '--window-size=1280,800',
    url
  ], { stdio: 'ignore' });

  /* wait for the devtools endpoint */
  let targets = null;
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    try {
      const r = await fetch('http://127.0.0.1:9333/json/list');
      const j = await r.json();
      const page = j.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) { targets = page; break; }
    } catch (e) { /* not up yet */ }
  }
  if (!targets) {
    console.log('FAIL: could not attach to the browser.');
    try { child.kill(); } catch (e) {}
    server.close();
    process.exit(1);
  }

  const ws = new WebSocket(targets.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const problems = [];
  const logs = [];

  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });

  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
      return;
    }
    const m = msg.method;
    if (m === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      problems.push('EXCEPTION: ' + (d.exception && d.exception.description ? d.exception.description.split('\n')[0] : d.text) +
        ' @' + (d.url || '') + ':' + (d.lineNumber + 1));
    } else if (m === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      if (msg.params.type === 'error') problems.push('CONSOLE ERROR: ' + text);
      else logs.push(msg.params.type + ': ' + text);
    } else if (m === 'Log.entryAdded') {
      const e = msg.params.entry;
      if (e.level === 'error') problems.push('LOG ERROR: ' + e.text + ' ' + (e.url || ''));
      else logs.push(e.level + ': ' + e.text);
    } else if (m === 'Network.loadingFailed') {
      problems.push('LOAD FAILED: ' + msg.params.errorText + ' (' + msg.params.type + ')');
    }
  });

  function send(method, params) {
    return new Promise((resolve) => {
      const myId = ++id;
      pending.set(myId, { resolve });
      ws.send(JSON.stringify({ id: myId, method, params: params || {} }));
    });
  }

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');
  await sleep(1200);   // let the page boot

  async function evalJS(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      problems.push('EVAL: ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description.split('\n')[0] : r.exceptionDetails.text));
      return null;
    }
    return r.result ? r.result.value : null;
  }

  /* ---- is the game alive? ---- */
  const boot = await evalJS('(function(){ return { k: !!window.K, g: !!(window.K && window.K.G), save: !!(window.K && window.K.Save && window.K.Save.data), start: typeof (window.K && window.K.G && window.K.G.startRun) }; })()');
  const title = await evalJS('document.querySelector(".game-title").textContent.trim()');
  console.log('page title glyphs:', title);
  console.log('boot state:', JSON.stringify(boot));
  if (!boot || !boot.k || !boot.g || boot.start !== 'function') problems.push('game did not boot in the browser');

  /* ---- start a run through the real UI ---- */
  await evalJS('document.getElementById("btn-begin").click()');
  await sleep(700);
  const started = await evalJS('(function(){var G=window.K.G;return {phase:G.phase, region:G.region().name, type:G.roomDef.type, enemies:window.K.E.enemies.length, hp:Math.round(G.player.hp), maxHp:G.player.stats.maxHp};})()');
  console.log('run started:', JSON.stringify(started));
  if (!started || started.phase !== 'playing') problems.push('clicking BEGIN did not start a run');

  /* ---- drive real input through the canvas for a while ---- */
  const playScript = `
    (function(){
      var G = window.K.G, K = window.K, In = K.Input;
      if (window.__driving) return 'already driving';
      window.__driving = true;
      var canvas = document.getElementById('game');
      function key(code, down){
        var ev = new KeyboardEvent(down ? 'keydown' : 'keyup', {code: code, bubbles:true, cancelable:true});
        window.dispatchEvent(ev);
      }
      function mouse(type, x, y, button){
        var r = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent(type, {clientX: r.left + x, clientY: r.top + y, button: button||0, bubbles:true, cancelable:true}));
      }
      var t = 0;
      function step(){
        t++;
        var p = G.player;
        // aim at the nearest enemy, else sweep around
        var best=null, bd=1e9;
        for (var i=0;i<K.E.enemies.length;i++){ var e=K.E.enemies[i]; if (e.dead||e.ally) continue; var d=K.U.dist2(p.x,p.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
        var aimA = best ? Math.atan2(best.y-p.y, best.x-p.x) : t*0.06;
        var tx = p.x + Math.cos(aimA)*160, ty = p.y + Math.sin(aimA)*160;
        var sx = (tx - G.cam.x)*G.cam.zoom + K.W/2;
        var sy = (ty - G.cam.y)*G.cam.zoom + K.H/2;
        mouse('mousemove', sx, sy);
        if (best && bd < 300*300) mouse('mousedown', sx, sy, 0);
        else window.dispatchEvent(new MouseEvent('mouseup', {button:0, bubbles:true}));
        // movement: strafe around
        key('KeyW', Math.sin(t*0.07) > 0);
        key('KeyS', Math.sin(t*0.07) <= 0);
        key('KeyA', Math.cos(t*0.05) > 0);
        key('KeyD', Math.cos(t*0.05) <= 0);
        if (t % 40 === 0) { key('Space', true); setTimeout(function(){key('Space', false);}, 16); }   // dash
        if (t % 70 === 0) { key('KeyF', true); setTimeout(function(){key('KeyF', false);}, 16); }      // cast
        if (t % 260 === 0) { key('KeyR', true); setTimeout(function(){key('KeyR', false);}, 16); }     // rush
        if (t % 900 === 0) { key('KeyT', true); setTimeout(function(){key('KeyT', false);}, 16); }     // ascend
        if (t % 300 === 0) { key('KeyK', true); setTimeout(function(){key('KeyK', false);}, 16); }     // wrath
        if (t % 520 === 0) { key('KeyQ', true); setTimeout(function(){key('KeyQ', false);}, 16); }     // call
        // guard is a HOLD: raise it in bursts so blocks and parries both happen
        var guarding = (t % 150) < 45;
        if (guarding) mouse('mousedown', sx, sy, 2);
        else window.dispatchEvent(new MouseEvent('mouseup', {button:2, bubbles:true}));
        if (t % 30 === 0) { key('KeyE', true); setTimeout(function(){key('KeyE', false);}, 16); }
        // take any boon offer that appears
        var cards = document.querySelectorAll('#reward-choices .card');
        if (cards.length) cards[Math.floor(Math.random()*cards.length)].click();
        if (window.__stopDriver) { window.__driving = false; return; }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      return 'driving';
    })()
  `;
  const driveR = await evalJS(playScript);
  console.log('input driver:', driveR);

  /* let it play */
  for (let i = 0; i < 6; i++) {
    await sleep(2500);
    const s = await evalJS('(function(){var G=window.K.G,p=G.player;return {phase:G.phase, region:G.region().name, chamber:(G.chamberIndex+1), kills:G.run.stats.kills, boons:G.run.boons.length, obols:G.run.obols, bosses:G.run.stats.bosses, enemies:window.K.E.enemies.length, parts:G.particles.list.length, parries:p.parryCount, casts:Math.round(p.castCd*100)/100, ascends:Math.round(p.ascendCd)};})()');
    console.log('  t+' + ((i + 1) * 2.5).toFixed(1) + 's:', JSON.stringify(s));
  }

  /* ---- the ability sheet must be wired to the HUD and respond to input ---- */
  const abilityProbe = await evalJS(`JSON.stringify((function(){
    var G = window.K.G, p = G.player, out = {};
    /* every ability slot exists in the HUD */
    out.slots = ['ab-attack','ab-guard','ab-cast','ab-dash','ab-rush','ab-special','ab-call','ab-ascend']
      .filter(function(id){ return !document.getElementById(id); });
    /* the player actually used abilities during the driven play */
    out.parries = p.parryCount;
    out.guardCdNow = +p.guardCd.toFixed(2);
    /* force each ability and confirm state changes */
    p.guardRecover = 0; p.guardCd = 0; p.guardT = 0;
    p.startGuard(G); out.guardFired = p.guardT > 0;
    p.castCd = 0; var before = window.K.E.projectiles.length;
    p.doCast(G); out.castFired = window.K.E.projectiles.length > before;
    p.rushCd = 0; p.doRush(G); out.rushFired = p.rushT > 0;
    p.ascendCd = 0; p.doAscend(G); out.ascendFired = p.ascendT > 0;
    /* the full Guard contract: block, parry, and directionality */
    p.ascendT = 0; G.recalcStats();
    var hpFull = p.stats.maxHp;
    function raise(){ p.aim=0; p.guardDir=0; p.guardRecover=0; p.guardCd=0; p.guardT=0; p.invuln=0; p.shield=0; p.startGuard(G); }
    p.hp = hpFull; raise(); p.guardT = p.guardWindow - 0.30; p.invuln = 0;
    G.damagePlayer(100, {x:p.x+200, y:p.y}, 'contact');
    out.blockLoss = +(hpFull - p.hp).toFixed(1);
    p.hp = hpFull; raise(); p.invuln = 0;
    var pc = p.parryCount;
    G.damagePlayer(100, {x:p.x+200, y:p.y}, 'contact');
    out.parryLoss = +(hpFull - p.hp).toFixed(1);
    out.parryRegistered = p.parryCount > pc;
    p.hp = hpFull; raise(); p.guardT = p.guardWindow - 0.30; p.invuln = 0;
    G.damagePlayer(50, {x:p.x-200, y:p.y}, 'contact');
    out.behindLoss = +(hpFull - p.hp).toFixed(1);
    p.hp = hpFull;
    return out;
  })())`);

  console.log('ability probe:', abilityProbe);
  try {
    const ap = JSON.parse(abilityProbe);
    if (ap.slots.length) problems.push('missing HUD ability slots: ' + ap.slots.join(', '));
    if (!ap.guardFired) problems.push('Guard did not fire');
    if (!ap.castFired) problems.push('Cast did not fire');
    if (!ap.rushFired) problems.push('Rush did not fire');
    if (!ap.ascendFired) problems.push('Ascend did not fire');
    if (!(ap.blockLoss > 0 && ap.blockLoss <= 30)) problems.push('Guard block absorbed the wrong amount (' + ap.blockLoss + ')');
    if (ap.parryLoss > 0.01) problems.push('Parry still took damage (' + ap.parryLoss + ')');
    if (!ap.parryRegistered) problems.push('Parry did not register in the browser');
    if (ap.behindLoss < 40) problems.push('Guard blocked a hit from behind (' + ap.behindLoss + ')');
  } catch (e) { problems.push('ability probe failed'); }

  /* ---- exercise the menus (driver stopped first so it cannot fight the UI) ---- */
  await evalJS('window.__stopDriver = true');
  await sleep(600);
  const menuChecks = [
    ['btn-boons', 'screen-codex', 'Codex'],
    ['btn-codex-back', 'screen-title', 'Codex back'],
    ['btn-meta', 'screen-meta', 'Mirror of Nyx'],
    ['btn-meta-back', 'screen-title', 'Mirror back'],
    ['btn-help', 'screen-help', 'How to play'],
    ['btn-help-back', 'screen-title', 'Help back']
  ];
  for (const [btn, screenId, label] of menuChecks) {
    await evalJS('document.getElementById("' + btn + '").click()');
    await sleep(450);
    const visible = await evalJS('!document.getElementById("' + screenId + '").classList.contains("hidden")');
    console.log('  ' + label + ' -> ' + (visible ? 'OK' : 'NOT SHOWN'));
    if (!visible) {
      const dbg = await evalJS('(function(){var e=document.getElementById("' + screenId + '"); return e ? e.className : "missing";})()');
      problems.push(label + ' screen did not open (class="' + dbg + '")');
    }
  }
  /* codex tabs */
  await evalJS('document.getElementById("btn-boons").click()');
  await sleep(300);
  const tabs = await evalJS('document.querySelectorAll("#codex-tabs .tab").length');
  if (tabs) {
    let anyEmpty = false;
    for (let i = 0; i < tabs; i++) {
      await evalJS('document.querySelectorAll("#codex-tabs .tab")[' + i + '].click()');
      await sleep(180);
      const n = await evalJS('document.getElementById("codex-body").children.length');
      if (!n) anyEmpty = true;
    }
    console.log('  codex tabs exercised:', tabs, anyEmpty ? '(one tab rendered nothing)' : '(all rendered content)');
    if (anyEmpty) problems.push('a codex tab rendered no content');
  }
  await evalJS('document.getElementById("btn-codex-back").click()');
  await sleep(300);

  /* ---- capture gameplay screenshots in each region ---- */
  for (const region of [0, 1, 2, 3]) {
    await evalJS('(function(){var G=window.K.G; G.startRun(' + (900 + region) + '); G.regionIndex=' + region + '; G.enterChamber(0); ' +
      'document.getElementById("hud").classList.remove("hidden"); ' +
      'document.getElementById("veil").classList.remove("on"); ' +
      'window.__cap = 1;})()');
    /* let the driver place the hero and some enemies on screen */
    await evalJS('window.__stopDriver = false');
    await evalJS(playScript);
    await sleep(2200);
    const shotN = await send('Page.captureScreenshot', { format: 'png' });
    if (shotN && shotN.data) {
      const nm = ['tartarus', 'asphodel', 'forge', 'olympus'][region];
      const buf = Buffer.from(shotN.data, 'base64');
      fs.writeFileSync(path.join(ROOT, 'tools', 'shot-' + nm + '.png'), buf);
      console.log('  captured ' + nm + ' screenshot (' + Math.round(buf.length / 1024) + ' KB)');
    }
  }

  /* ---- a shot with the Guard raised and Ascend burning, to check the VFX ---- */
  await evalJS('window.__stopDriver = true');
  await sleep(400);
  /* The loop's `screen` variable is module-private, so drive it through the UI:
     BEGIN calls showScreen(null) and starts a fresh run on the canvas. */
  await evalJS('document.getElementById("btn-begin").click()');
  await sleep(600);
  await evalJS(`(function(){
    /* NOTE: everything local is scoped inside this IIFE on purpose — a bare
       \`var G = window.K.G\` would leak into the page's global scope and
       shadow the real \`G\`, which silently breaks the renderer. */
    var game = window.K.G, p = game.player;
    window.K.E.enemies.length = 0;
    game.regionIndex = 0;
    game.roomDef.cleared = true;
    game.exitGate = null; game.pendingChamberReward = null; game.pendingReward = null;
    game.phase = 'playing';
    p.x = 0; p.y = 40; p.vx = 0; p.vy = 0;
    p.hp = p.stats.maxHp * 0.72; p.shield = 24;
    p.aim = -0.5; p.guardDir = -0.5; p.guardT = 0.5; p.guardWindow = 0.55;
    p.ascendT = 8; p.ascendFlash = 1; p.ascendCd = 30; p.invuln = 8;
    p.perfect = 0.5; p.parryCount = 3; p.attackAnim = 1;
    var ids = ['hoplite','harpy','gorgon','shade'];
    for (var i=0;i<ids.length;i++){
      var a = -1.3 + i*0.85;
      game.addEnemy(ids[i], Math.cos(a)*250, Math.sin(a)*180 + 60, { tier: 1 });
    }
    game.cam.x = 0; game.cam.y = 0; game.cam.zoom = game.cam.tzoom;
    game.banner = null;
    game.toasts.length = 0;
    return { region: game.region().name, phase: game.phase, enemies: window.K.E.enemies.length };
  })()`);
  await sleep(1600);
  const shotState = await evalJS('(function(){var g=window.K.G;return {hasRun:!!(g&&g.run), phase:g&&g.phase, region:(g&&g.region)?(g.region()||{}).name:"no-fn", enemies:window.K.E.enemies.length, hp:g&&g.player?Math.round(g.player.hp):null, titleHidden:document.getElementById("screen-title").classList.contains("hidden"), hudHidden:document.getElementById("hud").classList.contains("hidden")};})()');
  console.log('  capture state:', JSON.stringify(shotState));
  const shotG = await send('Page.captureScreenshot', { format: 'png' });
  if (shotG && shotG.data) {
    fs.writeFileSync(path.join(ROOT, 'tools', 'shot-abilities.png'), Buffer.from(shotG.data, 'base64'));
    console.log('  captured abilities screenshot');
  }
  await evalJS('(function(){var g=window.K.G,p=g.player; p.ascendT=0; p.guardT=0; p.perfect=0; g.recalcStats();})()');

  /* ---- the title screen ---- */
  await evalJS('window.__stopDriver = true');
  await sleep(700);
  await evalJS('document.getElementById("btn-title").click()');
  await sleep(1100);
  const onTitle = await evalJS('!document.getElementById("screen-title").classList.contains("hidden")');
  const hudHidden = await evalJS('document.getElementById("hud").classList.contains("hidden")');
  console.log('  title screen shown:', onTitle, '| HUD hidden:', hudHidden);
  if (!onTitle) problems.push('the title screen did not open');
  if (!hudHidden) problems.push('the HUD stayed visible over the title screen');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    const buf = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(ROOT, 'tools', 'screenshot-title.png'), buf);
    console.log('  captured title screenshot (' + Math.round(buf.length / 1024) + ' KB)');
  }
  /* the obol counter must never print NaN */
  const hudText = await evalJS('document.getElementById("hud").textContent + "|" + document.getElementById("screen-title").textContent');
  if (/NaN|undefined/.test(hudText)) {
    problems.push('HUD/title text contains NaN or undefined: ' + hudText.replace(/\s+/g, ' ').slice(0, 160));
  }
  console.log('  no NaN/undefined in UI text:', !/NaN|undefined/.test(hudText));

  /* canvas pixel sanity: is anything actually drawn? */
  const px = await evalJS(`(function(){
    var c = document.getElementById('game');
    var g = c.getContext('2d');
    var d = g.getImageData(0,0,c.width,c.height).data;
    var seen = {}, n = 0;
    for (var i=0;i<d.length;i+=4*997){
      var k = (d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4);
      if (!seen[k]) { seen[k]=1; n++; }
    }
    return n;
  })()`);
  console.log('  distinct sampled canvas colours:', px);
  if (px === null || px < 4) problems.push('canvas looks blank (only ' + px + ' distinct sampled colours)');

  try { ws.close(); } catch (e) {}
  try { child.kill(); } catch (e) {}
  server.close();

  console.log('');
  if (problems.length) {
    console.log('BROWSER PROBLEMS (' + problems.length + '):');
    problems.slice(0, 30).forEach(p => console.log('  ✗ ' + p));
    process.exit(1);
  } else {
    console.log('BROWSER CHECK PASSED — no console errors, no exceptions, canvas rendering.');
    process.exit(0);
  }
}

main().catch(e => { console.log('harness error:', e.message); try { server.close(); } catch (x) {} process.exit(1); });
