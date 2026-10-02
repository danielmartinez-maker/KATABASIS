'use strict';
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,'../../outputs');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:60000});
await page.waitForFunction(()=>window.K&&K.G&&K.Persistence.ready&&document.getElementById('asset-loading').classList.contains('hidden'),null,{timeout:60000});
const out={};
out.portraits=await page.evaluate(()=>({roster:K.Portraits.roster.length, hasBoon:K.Portraits.roster.filter(r=>r.hasBoonContent).length, noBoon:K.Portraits.roster.filter(r=>!r.hasBoonContent).length, gods:Object.keys(K.DATA.GODS).length, olympians:(K.DATA.OLYMPIANS||[]).length}));
out.synergies=await page.evaluate(()=>K.RunSystems.SYNERGIES.length);
out.buildRules=await page.evaluate(()=>Object.keys(K.BuildPowers.rules));
// filter bug: count records matching fx[castFork] vs effect==castFork
out.filterProbe=await page.evaluate(()=>{const D=K.DATA;const byFx=D.BOONS.filter(b=>Number(b.fx&&b.fx.castFork)>0).length+D.SPECIAL_BOONS.filter(b=>Number(b.fx&&b.fx.castFork)>0).length;const byEffect=D.BOONS.filter(b=>b.effect==='castFork').length+D.SPECIAL_BOONS.filter(b=>b.effect==='castFork').length;return{byFx,byEffect,boons:D.BOONS.length,special:D.SPECIAL_BOONS.length};});
// Codex unmet-marking: check locked class behavior for unseen
out.codexLock=await page.evaluate(()=>{document.querySelector('[data-atlas-route="codex"]').click();return document.querySelectorAll('#codex-body .codex-entry.locked').length;});
// Tab navigation / focus trap: open pause via practice, tab through
await page.evaluate(()=>{document.querySelector('[data-atlas-route="descent"]').click();});
await page.locator('#btn-practice').click();
await page.locator('#practice-resume').click();
await page.keyboard.down('Escape');await page.locator('#screen-pause').waitFor({state:'visible'});await page.keyboard.up('Escape');
out.pauseVisible=await page.locator('#screen-pause').isVisible();
out.focusablesInPause=await page.evaluate(()=>Array.from(document.querySelector('#screen-pause').querySelectorAll('button:not([disabled])')).map(b=>b.id));
// Tab wrap test: focus last, press Tab, check wraps to first
out.tabWrap=await page.evaluate(()=>{const host=document.getElementById('screen-pause');const items=Array.from(host.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')).filter(el=>el.offsetParent!==null);const last=items[items.length-1];last.focus();return{count:items.length,lastId:last.id,firstId:items[0].id};});
await page.keyboard.press('Tab');
out.afterTab=await page.evaluate(()=>document.activeElement.id||document.activeElement.tagName);
// Mute M
out.mutedBefore=await page.evaluate(()=>K.Audio.muted);
await page.keyboard.press('m');
await page.waitForTimeout(300);
out.mutedAfter=await page.evaluate(()=>K.Audio.muted);
await page.keyboard.press('m');
await page.waitForTimeout(200);
// search typing not triggering combat shortcuts: focus search, type WASD/space
await page.locator('#btn-resume').click();
await page.evaluate(()=>{if(K.G&&K.G.practiceMode)K.G.exitPractice();});
await page.locator('[data-atlas-route="codex"]').click();
await page.locator('#codex-search').click();
await page.keyboard.type('wasd f');
await page.waitForTimeout(500);
out.searchValue=await page.locator('#codex-search').inputValue();
out.combatLeak=await page.evaluate(()=>({spacePressed:!!K.Input.pressed.Space, keys:Object.keys(K.Input.keys)}));
out.codexCountAfterSearch=await page.locator('#codex-count').innerText();
out.inspectorAfterSearch=await page.locator('#codex-inspector').innerText().then(t=>t.slice(0,120));
// ESC from codex returns to origin?
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
out.afterEscCodex=await page.evaluate(()=>({titleHidden:document.getElementById('screen-title').classList.contains('hidden'),codexHidden:document.getElementById('screen-codex').classList.contains('hidden')}));
// HUD after gate: start run, use gate, check act/region/encounter/milestone text
await page.evaluate(()=>{KATABASIS.start();});
await page.waitForTimeout(800);
out.hud=await page.evaluate(()=>({act:document.getElementById('act-status').textContent,region:document.getElementById('region-name').textContent,run:document.getElementById('run-status').textContent.slice(0,120),hudHidden:document.getElementById('hud').classList.contains('hidden'),phase:K.G.phase,regionIndex:K.G.regionIndex,chamber:K.G.chamberIndex}));
await page.screenshot({path:path.join(OUT,'probe-hud.png')});
// overlapping dialogs: count visible screens
out.visibleScreens=await page.evaluate(()=>Array.from(document.querySelectorAll('.screen')).filter(s=>!s.classList.contains('hidden')).map(s=>s.id));
// narrow: 390px buttons clickable?
await page.evaluate(()=>{K.G.abandon&&K.G.abandon();});
await page.waitForTimeout(400);
await page.setViewportSize({width:390,height:844});
await page.waitForTimeout(400);
await page.evaluate(()=>{document.querySelector('[data-atlas-route="descent"]').click();});
await page.waitForTimeout(300);
out.narrow=await page.evaluate(()=>{const btn=document.getElementById('btn-begin');const r=btn.getBoundingClientRect();return{visible:!!(r.width&&r.height),rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},inViewport:r.bottom<=window.innerHeight+2&&r.top>=-2};});
out.narrowClick=await page.locator('#btn-begin').isVisible().then(async v=>{try{await page.locator('#btn-begin').click({timeout:3000});return 'clicked:'+v;}catch(e){return 'FAIL:'+e.message.slice(0,150);}});
await page.screenshot({path:path.join(OUT,'probe-narrow.png')});
out.errors=errs;
console.log(JSON.stringify(out,null,2));
await browser.close();server.close();
})().catch(e=>{console.error('PROBE FAIL',e);process.exit(1);});
