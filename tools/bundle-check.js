/* ============================================================
   KATABASIS — bundle verification.
   Loads katabasis.html over file:// with NO sibling files in
   scope, and confirms it is genuinely self-contained and
   behaves like the source build: boots, plays, renders, saves.
   Run:  node tools/bundle-check.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE = path.join(ROOT, 'katabasis.html');
const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function reserveDebugPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  return port;
}

async function main() {
  if (!fs.existsSync(BUNDLE)) { console.log('katabasis.html not found — run tools/bundle.js first'); process.exit(1); }
  const exe = BROWSERS.find(b => fs.existsSync(b));
  if (!exe) { console.log('No Chromium browser found — skipping.'); process.exit(0); }

  /* Copy the bundle alone into an empty directory. If it secretly depends on
     css/ or js/ siblings, it will fail there and nowhere else. */
  const sandbox = path.join(os.tmpdir(), 'katabasis-bundle-' + Date.now());
  fs.mkdirSync(sandbox, { recursive: true });
  const isolated = path.join(sandbox, 'katabasis.html');
  fs.copyFileSync(BUNDLE, isolated);
  const siblings = fs.readdirSync(sandbox);
  console.log('isolated copy at ' + sandbox);
  console.log('files in that folder: ' + JSON.stringify(siblings) + '  (should be exactly one)');
  if (siblings.length !== 1) { console.log('FAIL: sandbox is not clean'); process.exit(1); }

  const url = 'file:///' + isolated.replace(/\\/g, '/');
  const profile = path.join(os.tmpdir(), 'katabasis-bp-' + Date.now());
  const debugPort = await reserveDebugPort();
  const browserArgs = ['--headless=new', '--enable-gpu', '--use-gl=angle', '--disable-gpu-compositing', '--in-process-gpu',
    '--disable-features=Vulkan,UseSkiaRenderer', '--mute-audio', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=' + debugPort];
  /* Some managed Windows environments block renderer access to files. Keep the
     sandbox default; allow an explicit one-run opt-in for this isolated local test. */
  if (process.env.KATABASIS_TEST_NO_SANDBOX === '1') browserArgs.push('--no-sandbox');
  browserArgs.push('--user-data-dir=' + profile, '--window-size=1280,800', url);
  const child = spawn(exe, browserArgs, { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    try {
      const j = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
      target = j.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) {}
  }
  if (!target) { console.log('FAIL: could not attach'); try { child.kill(); } catch (e) {} process.exit(1); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let id = 0; const problems = [];
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      problems.push('EXCEPTION: ' + (d.exception && d.exception.description ? d.exception.description.split('\n')[0] : d.text));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      problems.push('CONSOLE ERROR: ' + (m.params.args || []).map(a => a.value || a.description || a.type).join(' '));
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      problems.push('LOG ERROR: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    } else if (m.method === 'Network.loadingFailed') {
      problems.push('LOAD FAILED: ' + m.params.errorText + ' (' + m.params.type + ')');
    }
  });
  const send = (method, params) => new Promise(res => { const i = ++id; pending.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __err: r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '') };
    return r.result ? r.result.value : null;
  };

  await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await sleep(1600);

  /* no external requests at all should have been needed */
  const net = await ev('JSON.stringify(performance.getEntriesByType("resource").map(function(r){return r.name;}))');
  let externals = [];
  try { externals = JSON.parse(net).filter(u => !u.startsWith('data:') && !u.endsWith('katabasis.html')); } catch (e) {}
  console.log('external resources requested: ' + externals.length + (externals.length ? ' ' + JSON.stringify(externals.slice(0, 5)) : ''));
  if (externals.length) problems.push('bundle requested external resources: ' + externals.slice(0, 5).join(', '));

  const boot = await ev('JSON.stringify({k:!!window.K, g:!!(window.K&&window.K.G), save:!!(window.K&&window.K.Save&&window.K.Save.data), boons:window.K&&window.K.DATA?(window.K.DATA.BOONS.length+window.K.DATA.SPECIAL_BOONS.length):0, gods:window.K&&window.K.DATA?Object.keys(window.K.DATA.GODS).length:0, monsters:window.K&&window.K.DATA?Object.keys(window.K.DATA.ENEMIES).length:0, bosses:window.K&&window.K.DATA?Object.keys(window.K.DATA.BOSSES).length:0, relics:window.K&&window.K.DATA?window.K.DATA.RELICS.length:0, regions:window.K&&window.K.DATA?window.K.DATA.REGIONS.length:0, chapters:window.K&&window.K.DATA&&window.K.DATA.CAMPAIGN_STORY?window.K.DATA.CAMPAIGN_STORY.length:0, chronicle:window.K&&window.K.Save&&window.K.Save.data?Array.isArray(window.K.Save.data.killChronicle):false, nemeses:window.K&&window.K.Save&&window.K.Save.data?Array.isArray(window.K.Save.data.nemeses):false})');
  console.log('boot:', boot);
  try {
    const b = JSON.parse(boot);
    if (!b.k || !b.g || !b.save) problems.push('bundle did not boot');
    if (b.boons < 90 || b.gods !== 12 || b.monsters < 24 || b.bosses < b.regions || b.relics < 18 || b.regions !== 26 || b.chapters !== 26 || !b.chronicle || !b.nemeses) {
      problems.push('bundle content is incomplete: ' + boot);
    }
  } catch (e) { problems.push('boot probe failed'); }

  /* styles inlined? */
  const styled = await ev('(function(){var s=document.querySelectorAll("style").length; var l=document.querySelectorAll("link[rel=stylesheet]").length; var c=getComputedStyle(document.querySelector(".game-title")).color; return JSON.stringify({inlineStyles:s, externalStylesheets:l, titleColor:c});})()');
  console.log('styles:', styled);
  try {
    const st = JSON.parse(styled);
    if (st.inlineStyles < 1) problems.push('no <style> block found — CSS was not inlined');
    if (st.externalStylesheets > 0) problems.push('bundle still links an external stylesheet');
    if (!/rgb\(224, 179, 85\)/.test(st.titleColor)) problems.push('title styling did not apply (got ' + st.titleColor + ')');
  } catch (e) { problems.push('style probe failed'); }

  const gearUi = await ev('(function(){return JSON.stringify({armoryButton:!!document.getElementById("btn-armory"),loomButton:!!document.getElementById("btn-paragon"),armoryScreen:!!document.getElementById("screen-armory"),loomScreen:!!document.getElementById("screen-paragon"),atlas:!!(window.K&&K.Assets.entry("ui.gear-paragon"))});})()');
  console.log('Armory/Loom entry points:', gearUi);
  try {
    const ui = JSON.parse(gearUi);
    if (!ui.armoryButton || !ui.loomButton || !ui.armoryScreen || !ui.loomScreen || !ui.atlas) problems.push('Armory or Loom screen/entry points/art are missing');
  } catch (e) { problems.push('Armory/Loom UI probe failed'); }
  const atlasPixels=await ev(`(async function(){var im=new Image();im.src=K.Assets.url('ui.gear-paragon');if(im.decode)await im.decode();else await new Promise(function(ok,fail){im.onload=ok;im.onerror=fail;});var c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;var x=c.getContext('2d');x.drawImage(im,0,0);var d=x.getImageData(0,0,c.width,c.height).data,min=255,max=0,visible=0;for(var i=3;i<d.length;i+=4*101){min=Math.min(min,d[i]);max=Math.max(max,d[i]);if(d[i]>0)visible++;}return JSON.stringify({width:im.naturalWidth,height:im.naturalHeight,alphaMin:min,alphaMax:max,visibleSamples:visible});})()`);
  console.log('generated atlas pixels:',atlasPixels);
  try { const a=JSON.parse(atlasPixels);if(a.width<4||a.height<4||a.alphaMin!==0||a.alphaMax!==255||a.visibleSamples===0)problems.push('generated 4x4 atlas did not preserve transparent RGBA pixels: '+atlasPixels); }
  catch(e) { problems.push('generated atlas pixel probe failed: '+atlasPixels); }

  const inventoryUi = await ev(`(function(){
    var K=window.K, s=K.Save.data, api=K.Gear;
    s.obols=50000; s.salvageShards=200; s.paragonUnlocked=false; s.paragonPoints=0; s.paragonXp=0; s.paragonNodes=[];
    [['weapon',4,'rare',2026,'QA Blade'],['weapon',8,'epic',2028,'QA Greatblade'],['helm',3,'common',2030,'QA Helm'],['bracers',5,'epic',2032,'QA Bracers']].forEach(function(p){var i=api.generate(p[0],p[1],new K.RNG(p[3]),p[2]);i.name=p[4];api.add(i);});
    K.Save.write();
    document.getElementById('btn-armory').click();
    var slots=document.querySelectorAll('#armory-slot-list .armory-slot').length;
    var initialCount=document.querySelectorAll('#armory-collection .armory-item').length;
    var focusable=document.activeElement && document.activeElement.classList.contains('armory-slot');
    var filter=document.getElementById('armory-filter'); filter.value='unequipped'; filter.dispatchEvent(new Event('change',{bubbles:true}));
    var unequippedCount=document.querySelectorAll('#armory-collection .armory-item').length;
    filter.value='rare'; filter.dispatchEvent(new Event('change',{bubbles:true}));
    var rareCount=document.querySelectorAll('#armory-collection .armory-item').length;
    filter.value='all'; filter.dispatchEvent(new Event('change',{bubbles:true}));
    var sort=document.getElementById('armory-sort'); sort.value='name'; sort.dispatchEvent(new Event('change',{bubbles:true}));
    var names=Array.from(document.querySelectorAll('#armory-collection .armory-item strong')).map(function(x){return x.textContent;});
    var sorted=names.every(function(n,i){return i===0||names[i-1].localeCompare(n)<=0;});
    var blade=Array.from(document.querySelectorAll('#armory-collection .armory-item')).find(function(b){return b.getAttribute('aria-label').indexOf('QA Blade,')===0;}); if(blade) blade.click();
    var comparison=document.querySelectorAll('#armory-comparison .comparison-line').length;
    var bladeId=s.gearInventory.find(function(i){return i.name==='QA Blade';}).id;
    document.getElementById('armory-equip').click();
    var equipped=s.equippedGear.weapon===bladeId;
    var oldLevel=s.gearInventory.find(function(i){return i.id===bladeId;}).level;
    document.getElementById('armory-upgrade').click();
    var upgraded=s.gearInventory.find(function(i){return i.id===bladeId;}).level===oldLevel+1;
    var obolsBeforeSell=s.obols;
    document.querySelector('#armory-slot-list [data-slot="helm"]').click();
    var helm=Array.from(document.querySelectorAll('#armory-collection .armory-item')).find(function(b){return b.getAttribute('aria-label').indexOf('QA Helm,')===0;}); if(helm) helm.click();
    document.getElementById('armory-sell').click();
    var sold=!s.gearInventory.some(function(i){return i.name==='QA Helm';})&&s.obols>obolsBeforeSell;
    var shardsBefore=s.salvageShards;
    document.querySelector('#armory-slot-list [data-slot="bracers"]').click();
    var bracers=Array.from(document.querySelectorAll('#armory-collection .armory-item')).find(function(b){return b.getAttribute('aria-label').indexOf('QA Bracers,')===0;}); if(bracers) bracers.click();
    document.getElementById('armory-salvage').click();
    var salvaged=!s.gearInventory.some(function(i){return i.name==='QA Bracers';})&&s.salvageShards>shardsBefore;
    document.getElementById('btn-armory-back').click();
    document.getElementById('btn-paragon').click();
    var locked=!document.getElementById('screen-paragon').classList.contains('hidden')&&document.getElementById('paragon-lock-message').textContent.indexOf('Locked')>=0;
    document.getElementById('btn-paragon-back').click();
    s.paragonUnlocked=true; s.paragonNodes=['wayfarer']; s.paragonPoints=10; s.paragonXp=99; K.Save.write();
    document.getElementById('btn-paragon').click();
    var branches=document.querySelectorAll('#paragon-tree .paragon-branch').length;
    var first=document.querySelector('#paragon-tree [data-node="ares_1"]'); if(first) first.click();
    var affordable=!document.getElementById('paragon-buy').disabled;
    ['ares_1','ares_2','ares_3','ares_4'].forEach(function(id){var n=document.querySelector('#paragon-tree [data-node="'+id+'"]');if(n)n.click();document.getElementById('paragon-buy').click();});
    var keyId=K.Paragon.BRANCHES.ares.keystones[0].id, otherId=K.Paragon.BRANCHES.ares.keystones[1].id;
    var key=document.querySelector('#paragon-tree [data-node="'+keyId+'"]');if(key)key.click();document.getElementById('paragon-buy').click();
    var other=document.querySelector('#paragon-tree [data-node="'+otherId+'"]');if(other)other.click();
    var forkBlocked=document.getElementById('paragon-buy').disabled&&document.getElementById('paragon-node-requirement').textContent.indexOf('other keystone')>=0;
    var respecCost=K.Paragon.respecCost(s), respecText=document.getElementById('paragon-respec-info').textContent;
    document.getElementById('paragon-respec').click();
    var respecced=s.paragonNodes.length===1&&s.paragonNodes[0]==='wayfarer'&&s.paragonPoints===10;
    document.getElementById('btn-paragon-back').click();
    return JSON.stringify({slots:slots,initialCount:initialCount,focusable:focusable,unequippedCount:unequippedCount,rareCount:rareCount,sorted:sorted,comparison:comparison,equipped:equipped,upgraded:upgraded,sold:sold,salvaged:salvaged,locked:locked,branches:branches,affordable:affordable,forkBlocked:forkBlocked,respecCost:respecCost,respecText:respecText,respecced:respecced});
  })()`);
  console.log('Armory/Loom interactions:', inventoryUi);
  try {
    const ui=JSON.parse(inventoryUi);
    if(ui.slots!==6||ui.initialCount<3||!ui.focusable||ui.unequippedCount<2||ui.rareCount!==1||!ui.sorted||ui.comparison<1||!ui.equipped||!ui.upgraded||!ui.sold||!ui.salvaged||!ui.locked||ui.branches!==6||!ui.affordable||!ui.forkBlocked||ui.respecCost!==350||ui.respecText.indexOf('350 Obols')<0||!ui.respecced) problems.push('Armory/Loom inventory, actions, graph, or respec interaction failed: '+inventoryUi);
  } catch(e) { problems.push('Armory/Loom interaction probe failed: '+inventoryUi); }

  await ev('document.getElementById("btn-armory").click(); document.querySelector("#armory-slot-list [data-slot=weapon]").click(); document.getElementById("armory-filter").value="all"; document.getElementById("armory-filter").dispatchEvent(new Event("change",{bubbles:true}))');
  await sleep(500);
  const armoryMetrics=await ev('JSON.stringify((function(){var panel=document.querySelector("#screen-armory .armory-panel"),inspect=document.querySelector("#screen-armory .armory-inspect"),scroll=inspect.querySelector(".armory-inspect-scroll"),status=document.getElementById("armory-status"),actions=inspect.querySelector(".armory-actions"),buttons=Array.from(inspect.querySelectorAll(".armory-actions .btn")),sr=scroll.getBoundingClientRect(),tr=status.getBoundingClientRect(),ar=actions.getBoundingClientRect();return {panel:panel.getBoundingClientRect().height,layout:document.querySelector("#screen-armory .armory-layout").getBoundingClientRect().height,inspect:inspect.clientHeight,details:scroll.clientHeight,actionsVisible:buttons.every(function(b){var r=b.getBoundingClientRect(),p=inspect.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;}),noTextOverlap:sr.bottom<=tr.top+1&&tr.bottom<=ar.top+1};})())');
  console.log('Armory panel metrics:',armoryMetrics);
  try { const a=JSON.parse(armoryMetrics);if(!a.actionsVisible||!a.noTextOverlap) problems.push('Armory action controls are clipped or overlap item details: '+armoryMetrics); } catch(e) { problems.push('Armory layout metrics failed'); }
  const armoryShot=await send('Page.captureScreenshot',{format:'png'});
  if(armoryShot&&armoryShot.data) fs.writeFileSync(path.join(ROOT,'tools','shot-armory.png'),Buffer.from(armoryShot.data,'base64'));
  await ev('document.getElementById("btn-armory-back").click(); window.K.Save.data.paragonNodes=["wayfarer","ares_1","ares_2"]; window.K.Save.data.paragonPoints=5; window.K.Save.data.paragonXp=52; window.K.Save.write(); document.getElementById("btn-paragon").click(); document.querySelector("#paragon-tree [data-node=ares_3]").click()');
  await sleep(500);
  const paragonMetrics=await ev('JSON.stringify((function(){var p=document.querySelector("#screen-paragon .paragon-panel"),t=document.getElementById("paragon-tree"),b=document.getElementById("btn-paragon-back"),tr=t.getBoundingClientRect(),br=b.getBoundingClientRect();return {panel:p.getBoundingClientRect().height,layout:document.querySelector("#screen-paragon .paragon-layout").getBoundingClientRect().height,treeClient:t.clientHeight,treeScroll:t.scrollHeight,backOverlapsTree:br.top<tr.bottom};})())');
  console.log('Loom panel metrics:',paragonMetrics);
  try { if(JSON.parse(paragonMetrics).backOverlapsTree) problems.push('Loom Back button overlaps the board viewport'); } catch(e) { problems.push('Loom layout metrics failed'); }
  const paragonShot=await send('Page.captureScreenshot',{format:'png'});
  if(paragonShot&&paragonShot.data) fs.writeFileSync(path.join(ROOT,'tools','shot-paragon.png'),Buffer.from(paragonShot.data,'base64'));
  await ev('document.getElementById("btn-paragon-back").click()');

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await sleep(250);
  const narrowUi=await ev(`(function(){document.getElementById('btn-armory').click();var armoryFits=document.documentElement.scrollWidth<=innerWidth;document.getElementById('btn-armory-back').click();document.getElementById('btn-paragon').click();var paragonFits=document.documentElement.scrollWidth<=innerWidth;return JSON.stringify({width:innerWidth,docWidth:document.documentElement.scrollWidth,armoryFits:armoryFits,paragonFits:paragonFits,columns:getComputedStyle(document.getElementById('paragon-tree')).gridTemplateColumns});})()`);
  console.log('narrow viewport layout:',narrowUi);
  try { const n=JSON.parse(narrowUi); if(n.width!==390||n.docWidth>n.width+2||!n.armoryFits||!n.paragonFits) problems.push('Armory/Loom overflows the narrow viewport: '+narrowUi); }
  catch(e) { problems.push('narrow viewport probe failed: '+narrowUi); }
  await ev('document.getElementById("btn-paragon-back").click()');
  await send('Emulation.clearDeviceMetricsOverride');
  await ev('document.getElementById("btn-paragon").click()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  await sleep(100);
  const keyboardBack=await ev('document.getElementById("screen-paragon").classList.contains("hidden")&&!document.getElementById("screen-title").classList.contains("hidden")');
  if(!keyboardBack) problems.push('Escape did not return from Loom to its prior menu');

  await ev('document.getElementById("btn-armory").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await sleep(100);
  const armorySpace=await ev('!document.getElementById("screen-armory").classList.contains("hidden")');
  if(!armorySpace) problems.push('Space did not activate the focused Armory button');
  await ev('document.getElementById("btn-armory-back").click(); document.getElementById("btn-paragon").click(); document.querySelector("#paragon-tree [data-node=ares_1]").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await sleep(100);
  const paragonSpace=await ev('document.getElementById("paragon-selected-title").textContent===window.K.Paragon.NODES.ares_1.name');
  if(!paragonSpace) problems.push('Space did not activate the focused Paragon node');
  await ev('document.getElementById("btn-paragon-back").click()');

  /* play it */
  await ev('document.getElementById("btn-begin").click()');
  await sleep(400);
  await ev('document.getElementById("hero-start").click()');
  await sleep(400);
  await ev('document.getElementById("modifier-start").click()');
  await sleep(900);
  const started = await ev('JSON.stringify((function(){var G=window.K.G;return {phase:G.phase, region:G.region().name, enemies:window.K.E.enemies.length, hp:Math.round(G.player.hp)};})())');
  console.log('run started:', started);
  try { if (JSON.parse(started).phase !== 'playing') problems.push('a run would not start in the bundle'); }
  catch (e) { problems.push('start probe failed'); }

  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  await sleep(100);
  await ev('document.getElementById("btn-armory-pause").click()');
  const pauseArmory=await ev('JSON.stringify({visible:!document.getElementById("screen-armory").classList.contains("hidden"),hudHidden:document.getElementById("hud").classList.contains("hidden")})');
  await ev('document.getElementById("btn-armory-back").click()');
  const returnedPause=await ev('!document.getElementById("screen-pause").classList.contains("hidden")');
  await ev('document.getElementById("btn-paragon-pause").click()');
  const pauseLoom=await ev('!document.getElementById("screen-paragon").classList.contains("hidden")');
  await ev('document.getElementById("btn-paragon-back").click()');
  await ev('document.getElementById("btn-resume").click()');
  const pauseUi=JSON.parse(pauseArmory);
  console.log('pause menu access:',JSON.stringify({armory:pauseUi.visible,hudHidden:pauseUi.hudHidden,returned:returnedPause,loom:pauseLoom}));
  if(!pauseUi.visible||!pauseUi.hudHidden||!returnedPause||!pauseLoom) problems.push('Armory/Loom pause navigation failed');

  const advancedRewards=await ev(`(function(){var g=window.K.G,K=window.K,s=K.Save.data,before=s.gearInventory.length,shards=s.salvageShards;
    g.phase='playing';g.roomDef.type='treasure';g.pendingChamberReward='relic';g.openExitGate();g.useExitGate();
    var p=g.pendingReward,cards=Array.from(document.querySelectorAll('#reward-choices .card')),ix=p&&p.choices.findIndex(function(c){return c.kind==='gear';});
    if(ix>=0&&cards[ix])cards[ix].click();
    var treasure={choices:p&&p.choices.length,cards:cards.length,gearOption:ix>=0,gearTaken:s.gearInventory.length>before||s.salvageShards>shards,routeVisible:!document.getElementById('screen-room').classList.contains('hidden'),routeChoices:document.querySelectorAll('#room-choices .card').length,phase:g.phase};
    if(g.pendingRouteChoices&&g.pendingRouteChoices.length)g.selectRoute(g.pendingRouteChoices[0].id);
    g.roomDef.type='combat';g.pendingChamberReward='boon';g.openExitGate();g.useExitGate();
    var boonCards=Array.from(document.querySelectorAll('#reward-choices .card'));if(boonCards[0])boonCards[0].click();
    var boon={routeVisible:!document.getElementById('screen-room').classList.contains('hidden'),routeChoices:document.querySelectorAll('#room-choices .card').length,phase:g.phase};
    if(g.pendingRouteChoices&&g.pendingRouteChoices.length)g.selectRoute(g.pendingRouteChoices[0].id);
    g.roomDef.type='combat';g.pendingChamberReward='boon';g.openExitGate();g.useExitGate();document.getElementById('btn-skip-boon').click();
    var skipped={routeVisible:!document.getElementById('screen-room').classList.contains('hidden'),routeChoices:document.querySelectorAll('#room-choices .card').length,phase:g.phase};
    if(g.pendingRouteChoices&&g.pendingRouteChoices.length)g.selectRoute(g.pendingRouteChoices[0].id);
    return JSON.stringify({treasure:treasure,boon:boon,skipped:skipped});})()`);
  console.log('advance-after reward routes:',advancedRewards);
  try { const a=JSON.parse(advancedRewards); if(a.treasure.choices<2||a.treasure.cards!==a.treasure.choices||!a.treasure.gearOption||!a.treasure.gearTaken||!a.treasure.routeVisible||a.treasure.routeChoices<1||a.treasure.phase!=='route'||!a.boon.routeVisible||a.boon.routeChoices<1||a.boon.phase!=='route'||!a.skipped.routeVisible||a.skipped.routeChoices<1||a.skipped.phase!=='route') problems.push('reward selection hid or failed to open the next route choices: '+advancedRewards); }
  catch(e) { problems.push('advance-after reward route probe failed: '+advancedRewards); }
  // Start the combat probe in a fresh combat chamber; route choices can also be shops or story events.
  await ev('window.KATABASIS.start()');

  await ev(`(function(){
    var g = window.K.G, K = window.K, canvas = document.getElementById('game');
    if (window.__d) return 'already';
    window.__d = true;
    function key(c,d){ window.dispatchEvent(new KeyboardEvent(d?'keydown':'keyup',{code:c,bubbles:true,cancelable:true})); }
    function mouse(t,x,y,b){ var r=canvas.getBoundingClientRect(); canvas.dispatchEvent(new MouseEvent(t,{clientX:r.left+x,clientY:r.top+y,button:b||0,bubbles:true,cancelable:true})); }
    var n = 0;
    (function step(){
      n++;
      var p = g.player, best = null, bd = 1e9;
      for (var i=0;i<K.E.enemies.length;i++){ var e=K.E.enemies[i]; if(e.dead||e.ally) continue; var d=K.U.dist2(p.x,p.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
      var a = best ? Math.atan2(best.y-p.y, best.x-p.x) : n*0.06;
      var sx = (p.x+Math.cos(a)*150-g.cam.x)*g.cam.zoom+K.W/2;
      var sy = (p.y+Math.sin(a)*150-g.cam.y)*g.cam.zoom+K.H/2;
      mouse('mousemove', sx, sy);
      if (best && bd < 90000) mouse('mousedown', sx, sy, 0);
      else window.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
      key('KeyW', Math.sin(n*0.07)>0); key('KeyS', Math.sin(n*0.07)<=0);
      key('KeyA', Math.cos(n*0.05)>0); key('KeyD', Math.cos(n*0.05)<=0);
      if (n%45===0){ key('Space',true); setTimeout(function(){key('Space',false);},16); }
      if (n%70===0){ key('KeyF',true); setTimeout(function(){key('KeyF',false);},16); }
      if (n%260===0){ key('KeyR',true); setTimeout(function(){key('KeyR',false);},16); }
      if (n%300===0){ key('KeyK',true); setTimeout(function(){key('KeyK',false);},16); }
      var guarding = (n%150) < 45;
      if (guarding) mouse('mousedown', sx, sy, 2);
      else window.dispatchEvent(new MouseEvent('mouseup',{button:2,bubbles:true}));
      var cards = document.querySelectorAll('#reward-choices .card');
      if (cards.length && !document.getElementById('screen-reward').classList.contains('hidden')) cards[0].click();
      requestAnimationFrame(step);
    })();
  })()`);

  await sleep(11000);
  const played = await ev('JSON.stringify((function(){var G=window.K.G;return {phase:G.phase, region:G.region().name, chamber:G.chamberIndex+1, kills:G.run.stats.kills, boons:G.run.boons.length, enemies:window.K.E.enemies.length};})())');
  console.log('after 11s of play:', played);
  try { if (JSON.parse(played).kills < 1) problems.push('no enemies died in the bundle'); }
  catch (e) { problems.push('play probe failed'); }

  const campaignUi = await ev(`(function(){
    var g=window.K.G, K=window.K;
    g.beginCampaignStory(20,false,false); var chapterId=g.pendingStory&&g.pendingStory.chapter&&g.pendingStory.chapter.id;
    var chapterVisible=!document.getElementById('screen-cutscene').classList.contains('hidden');
    var voices=document.getElementById('cutscene-speaker-name').textContent ? 1 : 0;
    var backdrop=document.getElementById('cutscene-backdrop').src.indexOf('data:image/')===0;
    for(var i=0;i<g.pendingStory.chapter.voices.length;i++) document.getElementById('cutscene-next').click();
    var choices=document.querySelectorAll('#cutscene-choices .campaign-choice').length;
    var choice=document.querySelector('#cutscene-choices .card'); if(choice) choice.click();
    K.Save.data.nemeses=[{id:'browser-nemesis',sourceId:'shade',name:'Kallias',epithet:'the Unquiet',rank:2,adaptation:'veil_hunter',backstory:'A shade remembers the first river crossing.',appearances:1,defeated:false}];
    K.Save.write();
    document.getElementById('btn-boons').click();
    var tabs=Array.from(document.querySelectorAll('#codex-tabs .tab'));
    var saga=tabs.find(function(t){return t.textContent==='THE SAGA';}); if(saga) saga.click();
    var sagaEntries=document.querySelectorAll('#codex-body .saga-entry').length;
    var chronicle=tabs.find(function(t){return t.textContent==='CHRONICLE';}); if(chronicle) chronicle.click();
    var killEntries=document.querySelectorAll('#codex-body .chronicle-entry').length;
    var nemesisEntries=document.querySelectorAll('#codex-body .nemesis-codex-entry').length;
    return JSON.stringify({chapterId:chapterId,chapterVisible:chapterVisible,voices:voices,choices:choices,backdrop:backdrop,sagaEntries:sagaEntries,killEntries:killEntries,nemesisEntries:nemesisEntries});
  })()`);
  console.log('campaign and chronicle UI:', campaignUi);
  try {
    const ui = JSON.parse(campaignUi);
    if (ui.chapterId !== 'mycenae-blood-oath' || !ui.chapterVisible || ui.voices < 1 || ui.choices !== 2 || !ui.backdrop || ui.sagaEntries < 1 || ui.killEntries < 1 || ui.nemesisEntries !== 1) problems.push('campaign, Saga, Chronicle, or Nemesis UI did not render its content: ' + campaignUi);
  } catch (e) { problems.push('campaign/chronicle UI probe failed'); }

  const px = await ev('(function(){var c=document.getElementById("game"),g=c.getContext("webgl2")||c.getContext("webgl");return g?{renderer:g.getParameter(g.RENDERER),version:g.getParameter(g.VERSION),width:c.width,height:c.height}:null;})()');
  console.log('WebGL canvas probe:', JSON.stringify(px));
  if (!px || !px.renderer) problems.push('bundle WebGL canvas is unavailable or blank');

  /* saves persist */
  await ev('window.K.Save.addObols(777)');
  const before = await ev('window.K.Save.data.obols');
  if (!(await ev('window.K.Save.flush()'))) problems.push('save flush failed before reload');
  await send('Page.reload', { ignoreCache: true });
  await sleep(2200);
  const after = await ev('window.K && window.K.Save ? window.K.Save.data.obols : null');
  console.log('obols before reload: ' + before + ' | after: ' + after);
  if (after !== before) problems.push('bundle save did not survive a reload (' + before + ' -> ' + after + ')');

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    fs.writeFileSync(path.join(ROOT, 'tools', 'shot-bundle.png'), Buffer.from(shot.data, 'base64'));
    console.log('captured bundle screenshot');
  }

  try { ws.close(); } catch (e) {}
  try { child.kill(); } catch (e) {}
  try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch (e) {}

  console.log('');
  if (problems.length) {
    console.log('BUNDLE PROBLEMS (' + problems.length + '):');
    problems.slice(0, 20).forEach(p => console.log('  ✗ ' + p));
    process.exit(1);
  }
  console.log('BUNDLE CHECK PASSED — the single file runs alone, offline, with no siblings.');
  process.exit(0);
}

main().catch(e => { console.log('harness error:', e.message); process.exit(1); });

