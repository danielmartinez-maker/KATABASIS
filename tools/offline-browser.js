'use strict';
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url'),assert=require('assert');
const bundle=path.resolve(process.argv[2]||path.join(__dirname,'..','katabasis.html'));
const reportPath=path.resolve(process.argv[3]||path.join(__dirname,'..','offline-results.json'));
let browser;
(async()=>{
 const errors=[],external=[];
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,timeout:15000,args:['--mute-audio','--disable-extensions']});
 const context=await browser.newContext({offline:true,viewport:{width:1280,height:800}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 const started=Date.now();await page.goto(pathToFileURL(bundle).href,{waitUntil:'load',timeout:90000});
 await page.waitForFunction(()=>window.K&&K.G&&K.Persistence.ready&&document.getElementById('asset-loading').classList.contains('hidden'),null,{timeout:90000});
 const loadMs=Date.now()-started;
 await page.locator('#btn-practice').click();await page.locator('#practice-resume').click();
 const performance=await page.evaluate(()=>{
  const g=K.G,ctx=g.ctx||document.getElementById('game').getContext('2d');
  const powers={critBurst:25,castFork:4,castNova:25,dashNova:25,dashStrike:.3,parryNova:25,parryHeal:3,statusDetonate:25,statusSpread:1,bossHunter:.15,distanceDamage:.15,closeDamage:.15,killNova:25,killHaste:.15,shieldDamage:.15,guardCast:.5,rushNova:25,ascendNova:25};
  g.run.shopStats.push({...powers,crit:.2,bleed:{dmg:6,dur:3},poison:{dps:4,dur:3}});g.recalcStats();
  K.E.enemies.length=0;K.E.projectiles.length=0;
  const ids=['shade','hoplite','soul','satyr','centaur','hecaton'];
  for(let i=0;i<22;i++)g.addEnemy(ids[i%ids.length],(i%6)*85-210,Math.floor(i/6)*80-220,{hpMul:100});
  g.player.hp=1e8;g.player.invuln=100;g.player.shield=20;const ms=[];let peakProjectiles=0;
  const initial=K.E.enemies.map(e=>({e,x:e.x,y:e.y})),beforeTime=g.run.stats.time;
  for(let i=0;i<600;i++){const t=performance.now();if(i%30===0)g.player.doAttack(g);if(i%90===0)g.player.doCast(g);if(i%120===0){g.player.dashCd=0;g.player.dashCharges=2;K.Input.pressed.Space=true;}if(i%180===0)g.player.doRush(g);if(i===0)g.player.doAscend(g);g.update(1/60);K.Input.pressed.Space=false;K.R.draw(ctx,g,1/60);ms.push(performance.now()-t);peakProjectiles=Math.max(peakProjectiles,K.E.projectiles.length);}
  const firstFrameMs=ms[0],maxFrame=ms.indexOf(Math.max(...ms)),steady=ms.slice(60).sort((a,b)=>a-b);
  ms.sort((a,b)=>a-b);return{boonCount:K.DATA.BOONS.length+K.DATA.SPECIAL_BOONS.length,enabledPowers:Object.keys(powers).length,frames:600,startedEnemies:initial.length,peakProjectiles,movedEnemies:initial.filter(({e,x,y})=>Math.hypot(e.x-x,e.y-y)>1).length,simulatedSeconds:g.run.stats.time-beforeTime,firstFrameMs,maxFrame,medianMs:ms[300],p95Ms:ms[570],maxMs:ms[599],steadyMedianMs:steady[270],steadyP95Ms:steady[513],steadyMaxMs:steady[539],liveEnemies:K.E.enemies.length};
 });
 assert.ok(performance.boonCount > 8000 && performance.boonCount < 9000, 'boonCount in range');assert.equal(performance.enabledPowers,18);assert.equal(performance.frames,600);assert.equal(performance.startedEnemies,22);assert.ok(performance.peakProjectiles>0);assert.ok(performance.movedEnemies>0);assert.ok(performance.simulatedSeconds>9.9);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const report={ok:true,bundleBytes:fs.statSync(bundle).size,loadMs,offline:true,externalRequests:external,errors,performance,scope:'One headless Chromium run on this machine; simulation + draw CPU timings are not a universal FPS guarantee.'};
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
