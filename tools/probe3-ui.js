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
// ESC keydown plumbing with focus in search
await page.locator('[data-atlas-route="codex"]').click();
await page.locator('#codex-search').click();
await page.evaluate(()=>K.Input.reset());
await page.keyboard.down('Escape');
await page.waitForTimeout(150);
out.escDown=await page.evaluate(()=>({pressedEscape:!!K.Input.pressed.Escape,keyEscape:!!K.Input.keys.Escape,active:document.activeElement&&document.activeElement.id}));
await page.keyboard.up('Escape');
await page.waitForTimeout(400);
out.afterEscHeld=await page.evaluate(()=>({codexHidden:document.getElementById('screen-codex').classList.contains('hidden'),titleHidden:document.getElementById('screen-title').classList.contains('hidden')}));
// does window keydown even fire? instrument
out.nativeDispatch=await page.evaluate(async()=>{let seen=null;const h=e=>{seen={code:e.code,key:e.key,target:e.target.id||e.target.tagName};};window.addEventListener('keydown',h,{once:true});document.getElementById('codex-search').focus();const ev=new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true,cancelable:true});document.getElementById('codex-search').dispatchEvent(ev);await new Promise(r=>setTimeout(r,300));window.removeEventListener('keydown',h);return{seen,codexHidden:document.getElementById('screen-codex').classList.contains('hidden'),titleHidden:document.getElementById('screen-title').classList.contains('hidden')};});
// GATE: proper room clear flow
await page.evaluate(()=>{try{document.getElementById('btn-codex-back').click();}catch(e){}});
await page.waitForTimeout(300);
await page.evaluate(()=>{K.G.startRun(4242,{});});
await page.waitForFunction(()=>K.G.phase==='playing',{timeout:8000});
await page.evaluate(()=>{const g=K.G;const killAll=()=>{if(g.enemies)for(const e of g.enemies){e.dead=true;e.hp=0;} if(g.boss&&!g.boss.dead){g.boss.dead=true;g.boss.hp=0;}};killAll();g._qaKiller=setInterval(killAll,300);});
await page.waitForFunction(()=>!!K.G.exitGate,{timeout:15000}).catch(()=>{});
out.gateSpawn=await page.evaluate(()=>({hasGate:!!K.G.exitGate,phase:K.G.phase,roomDef:K.G.roomDef&&K.G.roomDef.type}));
await page.evaluate(()=>{const g=K.G;clearInterval(g._qaKiller);if(g.exitGate&&g.player){g.player.x=g.exitGate.x;g.player.y=g.exitGate.y;g.player.hp=g.player.stats.maxHp;}});
await page.waitForTimeout(400);
const before=await page.evaluate(()=>({ri:K.G.regionIndex,ch:K.G.chamberIndex,act:document.getElementById('act-status').textContent,region:document.getElementById('region-name').textContent}));
await page.keyboard.down('e');await page.waitForTimeout(120);await page.keyboard.up('e');
await page.waitForTimeout(1500);
out.gateWalk={before,after:await page.evaluate(()=>({ri:K.G.regionIndex,ch:K.G.chamberIndex,phase:K.G.phase,act:document.getElementById('act-status').textContent,region:document.getElementById('region-name').textContent,visible:Array.from(document.querySelectorAll('.screen')).filter(s=>!s.classList.contains('hidden')).map(s=>s.id)}))};
await page.screenshot({path:path.join(OUT,'probe3-gate.png')});
// HELP visibility from clean title
await page.evaluate(()=>{try{K.G.abandon();}catch(e){}});
await page.waitForTimeout(1600);
await page.evaluate(()=>{['btn-title','btn-title2'].forEach(id=>{const b=document.getElementById(id);if(b&&!b.closest('.hidden'))b.click();});});
await page.waitForTimeout(400);
await page.locator('[data-atlas-route="help"]').click({timeout:5000});
await page.waitForTimeout(300);
out.help=await page.evaluate(()=>({visible:!document.getElementById('screen-help').classList.contains('hidden'),visibleScreens:Array.from(document.querySelectorAll('.screen')).filter(s=>!s.classList.contains('hidden')).map(s=>s.id)}));
await page.keyboard.press('Escape');await page.waitForTimeout(400);
out.helpEsc=await page.evaluate(()=>({helpHidden:document.getElementById('screen-help').classList.contains('hidden'),titleHidden:document.getElementById('screen-title').classList.contains('hidden')}));
out.errors=errs;
console.log(JSON.stringify(out,null,2));
await browser.close();server.close();
})().catch(e=>{console.error('PROBE FAIL',e.message);process.exit(1);});
