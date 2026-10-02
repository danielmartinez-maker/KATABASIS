/* ============================================================
   KATABASIS — file:// path check.
   The README promises that double-clicking index.html works.
   This opens the game over file:// in real Chromium and plays it,
   which catches anything that quietly depends on http (fetch,
   modules, workers, canvas tainting, storage).
   Run:  node tools/file-check.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');

const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const exe = BROWSERS.find(b => fs.existsSync(b));
  if (!exe) {
    console.log('No Chromium browser found — skipping the file:// check.');
    process.exit(0);
  }
  const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
  console.log('opening:', url);

  const profile = path.join(os.tmpdir(), 'katabasis-file-' + Date.now());
  const child = spawn(exe, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--mute-audio', '--remote-debugging-port=9344',
    '--user-data-dir=' + profile, '--window-size=1280,800', url
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    try {
      const r = await fetch('http://127.0.0.1:9344/json/list');
      const j = await r.json();
      target = j.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) { /* not up yet */ }
  }
  if (!target) {
    console.log('FAIL: could not attach to the browser.');
    try { child.kill(); } catch (e) {}
    process.exit(1);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const problems = [];
  let id = 0;
  const pending = new Map();
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  ws.addEventListener('message', (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      problems.push('EXCEPTION: ' + (d.exception && d.exception.description ? d.exception.description.split('\n')[0] : d.text));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      problems.push('CONSOLE ERROR: ' + (m.params.args || []).map(a => a.value || a.description || a.type).join(' '));
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      problems.push('LOG ERROR: ' + m.params.entry.text);
    } else if (m.method === 'Network.loadingFailed') {
      problems.push('LOAD FAILED: ' + m.params.errorText + ' (' + m.params.type + ')');
    }
  });
  const send = (method, params) => new Promise(resolve => {
    const myId = ++id;
    pending.set(myId, { resolve });
    ws.send(JSON.stringify({ id: myId, method, params: params || {} }));
  });
  const evalJS = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      problems.push('EVAL: ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description.split('\n')[0] : r.exceptionDetails.text));
      return null;
    }
    return r.result ? r.result.value : null;
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await sleep(1500);

  /* every local asset must have loaded */
  const assets = await evalJS(`(function(){
    return {
      scripts: document.querySelectorAll('script[src]').length,
      sheets: document.querySelectorAll('link[rel=stylesheet]').length,
      origin: location.protocol,
      storage: (function(){ try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); return 'ok'; } catch(e) { return 'blocked'; } })()
    };
  })()`);
  console.log('page state:', JSON.stringify(assets));
  if (assets && assets.origin !== 'file:') problems.push('page did not load over file:// (got ' + assets.origin + ')');
  if (assets && assets.storage === 'blocked') problems.push('localStorage is unavailable over file:// — saves would not persist');

  const boot = await evalJS('(function(){ return { k: !!window.K, g: !!(window.K && window.K.G), save: !!(window.K && window.K.Save && window.K.Save.data) }; })()');
  console.log('boot over file://:', JSON.stringify(boot));
  if (!boot || !boot.k || !boot.g) problems.push('game did not boot over file://');

  /* start a run and play it for real over file:// */
  await evalJS('document.getElementById("btn-begin").click()');
  await sleep(900);
  const started = await evalJS('(function(){var G=window.K.G;return {phase:G.phase, region:G.region().name, type:G.roomDef.type, enemies:window.K.E.enemies.length, hp:Math.round(G.player.hp)};})()');
  console.log('run started:', JSON.stringify(started));
  if (!started || started.phase !== 'playing') problems.push('a run would not start over file://');

  /* drive ~12 seconds of real play through the canvas */
  await evalJS(`(function(){
    var G=window.K.G, K=window.K, canvas=document.getElementById('game');
    if (window.__driving) return 'already';
    window.__driving = true;
    function key(c,d){ window.dispatchEvent(new KeyboardEvent(d?'keydown':'keyup',{code:c,bubbles:true,cancelable:true})); }
    function mouse(t,x,y,b){ var r=canvas.getBoundingClientRect(); canvas.dispatchEvent(new MouseEvent(t,{clientX:r.left+x,clientY:r.top+y,button:b||0,bubbles:true,cancelable:true})); }
    var t=0;
    (function step(){
      t++;
      var p=G.player, best=null, bd=1e9;
      for (var i=0;i<K.E.enemies.length;i++){var e=K.E.enemies[i]; if(e.dead||e.ally)continue; var d=K.U.dist2(p.x,p.y,e.x,e.y); if(d<bd){bd=d;best=e;}}
      var a = best ? Math.atan2(best.y-p.y,best.x-p.x) : t*0.06;
      var sx=(p.x+Math.cos(a)*150-G.cam.x)*G.cam.zoom+K.W/2;
      var sy=(p.y+Math.sin(a)*150-G.cam.y)*G.cam.zoom+K.H/2;
      mouse('mousemove',sx,sy);
      if (best && bd<300*300) mouse('mousedown',sx,sy,0); else window.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
      key('KeyW',Math.sin(t*0.07)>0); key('KeyS',Math.sin(t*0.07)<=0);
      key('KeyA',Math.cos(t*0.05)>0); key('KeyD',Math.cos(t*0.05)<=0);
      if(t%40===0){key('Space',true); setTimeout(function(){key('Space',false);},16);}
      if(t%90===0){mouse('mousedown',sx,sy,2); setTimeout(function(){window.dispatchEvent(new MouseEvent('mouseup',{button:2,bubbles:true}));},16);}
      if(t%260===0){key('KeyQ',true); setTimeout(function(){key('KeyQ',false);},16);}
      if(t%30===0){key('KeyE',true); setTimeout(function(){key('KeyE',false);},16);}
      var cards=document.querySelectorAll('#reward-choices .card');
      if(cards.length) cards[0].click();
      requestAnimationFrame(step);
    })();
  })()`);

  await sleep(12000);
  const played = await evalJS('(function(){var G=window.K.G;return {phase:G.phase, region:G.region().name, chamber:(G.chamberIndex+1), kills:G.run.stats.kills, boons:G.run.boons.length, obols:G.run.obols, enemies:window.K.E.enemies.length};})()');
  console.log('after 12s of play:', JSON.stringify(played));
  if (!played || played.kills < 1) problems.push('no enemies were killed over file:// — combat is not working');

  /* the canvas must actually be painting */
  const px = await evalJS(`(function(){
    var c=document.getElementById('game'), g=c.getContext('2d');
    var d=g.getImageData(0,0,c.width,c.height).data, seen={}, n=0;
    for(var i=0;i<d.length;i+=4*997){ var k=(d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4); if(!seen[k]){seen[k]=1;n++;} }
    return n;
  })()`);
  console.log('distinct sampled canvas colours:', px);
  if (px === null || px < 4) problems.push('canvas looks blank over file:// (' + px + ' colours)');

  /* the save must persist across a reload — this is the whole point of file:// */
  await evalJS('window.K.Save.addObols(1234)');
  const before = await evalJS('window.K.Save.data.obols');
  await send('Page.reload', { ignoreCache: true });
  await sleep(2000);
  const after = await evalJS('window.K && window.K.Save ? window.K.Save.data.obols : null');
  console.log('obols before reload:', before, '| after reload:', after);
  if (after !== before) problems.push('save did not survive a reload (' + before + ' -> ' + after + ')');

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    fs.writeFileSync(path.join(ROOT, 'tools', 'shot-file-protocol.png'), Buffer.from(shot.data, 'base64'));
    console.log('captured file:// screenshot');
  }

  try { ws.close(); } catch (e) {}
  try { child.kill(); } catch (e) {}

  console.log('');
  if (problems.length) {
    console.log('FILE:// PROBLEMS (' + problems.length + '):');
    problems.slice(0, 20).forEach(p => console.log('  ✗ ' + p));
    process.exit(1);
  } else {
    console.log('FILE:// CHECK PASSED — the game boots, plays, renders and saves from a plain double-click.');
    process.exit(0);
  }
}

main().catch(e => { console.log('harness error:', e.message); process.exit(1); });
