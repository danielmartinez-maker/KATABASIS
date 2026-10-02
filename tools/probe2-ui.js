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
// 1. ESC from codex, focus on body
await page.locator('[data-atlas-route="codex"]').click();
await page.evaluate(()=>document.activeElement&&document.activeElement.blur());
await page.keyboard.press('Escape');await page.waitForTimeout(400);
out.escBody=await page.evaluate(()=>({codexHidden:document.getElementById('screen-codex').classList.contains('hidden'),titleHidden:document.getElementById('screen-title').classList.contains('hidden'),focus:document.activeElement.id||document.activeElement.tagName}));
// 2. ESC from codex, focus in search (empty)
await page.locator('[data-atlas-route="codex"]').click();
await page.locator('#codex-search').click();
await page.keyboard.press('Escape');await page.waitForTimeout(400);
out.escSearchEmpty=await page.evaluate(()=>({codexHidden:document.getElementById('screen-codex').classList.contains('hidden'),titleHidden:document.getElementById('screen-title').classList.contains('hidden'),active:document.activeElement.id||document.activeElement.tagName}));
// 2b. ESC from codex, focus in search with text
await page.locator('[data-atlas-route="codex"]').click();
await page.locator('#codex-search').fill('zeus');
await page.waitForTimeout(400);
await page.keyboard.press('Escape');await page.waitForTimeout(400);
out.escSearchText=await page.evaluate(()=>({codexHidden:document.getElementById('screen-codex').classList.contains('hidden'),titleHidden:document.getElementById('screen-title').classList.contains('hidden'),searchVal:document.getElementById('codex-search').value}));
await page.locator('#codex-search').fill('');await page.waitForTimeout(400);
// 3. Input key VALUES while typing in search (not just key names)
await page.locator('#codex-search').click();
await page.evaluate(()=>K.Input.reset());
await page.keyboard.type('w');
await page.waitForTimeout(120);
out.keyLeak=await page.evaluate(()=>({w:!!K.Input.keys.KeyW,pressedW:!!K.Input.pressed.KeyW,active:document.activeElement.id}));
await page.keyboard.press('Escape');await page.waitForTimeout(300);
// 4. Codex filter clean (no query)
await page.locator('[data-atlas-route="codex"]').click();
await page.evaluate(()=>{document.getElementById('codex-search').value='';document.getElementById('codex-search').dispatchEvent(new Event('input',{bubbles:true}));});
await page.waitForTimeout(400);
await page.locator('#codex-build-filter').selectOption('castFork');
await page.waitForTimeout(300);
out.filterClean=await page.evaluate(()=>({count:document.querySelectorAll('#codex-body [data-codex-key]').length,counter:document.getElementById('codex-count').textContent}));
await page.locator('#codex-build-filter').selectOption('all');await page.waitForTimeout(200);
out.buildsTab=await page.evaluate(()=>{document.querySelector('#codex-tabs').textContent;return null;});
await page.getByRole('button',{name:'BUILDS',exact:true}).click();await page.waitForTimeout(200);
out.buildsCount=await page.evaluate(()=>document.querySelectorAll('#codex-body [data-codex-key]').length);
out.buildsInspector=await page.locator('#codex-inspector').innerText().then(t=>t.slice(0,100));
await page.getByRole('button',{name:'BOONS',exact:true}).click();await page.waitForTimeout(200);
// 5. Real run + gate HUD desync
await page.evaluate(()=>{document.querySelector('[data-atlas-route="descent"]').click();K.G.startRun(4242,{});});
await page.waitForTimeout(1000);
out.runHud=await page.evaluate(()=>({phase:K.G.phase,hudHidden:document.getElementById('hud').classList.contains('hidden'),act:document.getElementById('act-status').textContent,region:document.getElementById('region-name').textContent,rooms:document.getElementById('room-track').children.length,kills:K.Save.data.runs}));
// teleport to gate, clear enemies, press E
out.gate=await page.evaluate(()=>{const g=K.G;if(g.enemies)g.enemies.forEach(e=>{e.dead=true;e.hp=0;});if(g.roomDef)g.roomDef.cleared=true;if(g.exitGate&&g.player){g.player.x=g.exitGate.x;g.player.y=g.exitGate.y;}return{hasGate:!!g.exitGate,cleared:g.roomDef&&g.roomDef.cleared};});
await page.waitForTimeout(300);
await page.keyboard.press('e');await page.waitForTimeout(1200);
out.afterGate=await page.evaluate(()=>({phase:K.G.phase,regionIndex:K.G.regionIndex,chamber:K.G.chamberIndex,act:document.getElementById('act-status').textContent,region:document.getElementById('region-name').textContent,visible:Array.from(document.querySelectorAll('.screen')).filter(s=>!s.classList.contains('hidden')).map(s=>s.id)}));
await page.screenshot({path:path.join(OUT,'probe2-after-gate.png')});
// 6. overlapping dialogs sweep: navigate all atlas pages from pause
await page.keyboard.press('Escape');await page.waitForTimeout(400);
out.pauseAfterGate=await page.evaluate(()=>({pauseHidden:document.getElementById('screen-pause').classList.contains('hidden'),visible:Array.from(document.querySelectorAll('.screen')).filter(s=>!s.classList.contains('hidden')).map(s=>s.id)}));
await page.evaluate(()=>{try{K.G.abandon();}catch(e){}});
await page.waitForTimeout(400);
out.abandonState=await page.evaluate(()=>({visible:Array.from(document.querySelectorAll('.screen')).filter(s=>!s.classList.contains('hidden')).map(s=>s.id)}));
console.log('PARTIAL '+JSON.stringify({escBody:out.escBody,escSearchEmpty:out.escSearchEmpty,escSearchText:out.escSearchText,keyLeak:out.keyLeak,filterClean:out.filterClean,buildsCount:out.buildsCount,buildsInspector:out.buildsInspector,runHud:out.runHud,gate:out.gate,afterGate:out.afterGate,pauseAfterGate:out.pauseAfterGate,abandonState:out.abandonState}));
// 7. How to Play content + title buttons
await page.evaluate(()=>{try{document.getElementById('btn-title').click();}catch(e){} try{document.getElementById('btn-title2').click();}catch(e){}});
await page.waitForTimeout(400);
// 7. How to Play content + title buttons
await page.locator('[data-atlas-route="help"]').click();await page.waitForTimeout(200);
out.help=await page.evaluate(()=>({visible:!document.getElementById('screen-help').classList.contains('hidden'),hasMute:document.getElementById('screen-help').textContent.includes('M'),hasTab:document.getElementById('screen-help').textContent.includes('Tab'),hasEsc:document.getElementById('screen-help').textContent.includes('ESC')}));
await page.screenshot({path:path.join(OUT,'probe2-help.png')});
out.errors=errs;
console.log(JSON.stringify(out,null,2));
await browser.close();server.close();
})().catch(e=>{console.error('PROBE FAIL',e);process.exit(1);});
