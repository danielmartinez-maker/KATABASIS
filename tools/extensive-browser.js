'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'../../outputs/extensive-browser-results.json'));
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
let browser;const results=[],errors=[],missing=[];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio','--disable-extensions']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push({url:r.url(),status:r.status()});});
 page.setDefaultTimeout(10000);await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>K.G&&K.Persistence.ready&&document.getElementById('asset-loading').classList.contains('hidden'));
 async function check(name,fn){try{const details=await fn();results.push({name,ok:true,details});console.log('PASS '+name+' '+JSON.stringify(details||{}));}catch(e){results.push({name,ok:false,error:e.message});console.error('FAIL '+name+': '+e.message);}}
 await check('All 18 new power offers survive common, rare and heroic acquisition',async()=>{
  await page.evaluate(()=>KATABASIS.start());let offers=0;
  for(const key of await page.evaluate(()=>Object.keys(K.BuildPowers.rules)))for(const rarity of ['common','rare','heroic']){
   const id=await page.evaluate(({key,rarity})=>{const g=K.G,b=K.DATA.BOONS.find(b=>b.expansionId==='divine-builds'&&b.buildArchetype===key&&!b.generatedVariant);const reward={kind:'boon',choices:[{id:b.id,rarity}],rerolls:0,skipBonus:30};g.pendingReward=reward;g.phase='reward';g.onTransition('reward',reward);return b.id;},{key,rarity});
   const text=await page.locator('#reward-choices').innerText();assert.match(text,/Build cap:/);assert.doesNotMatch(text,/NaN|undefined|%[A-Z]%/);
   await page.locator('#reward-choices .card').click();await page.locator('#screen-reward').waitFor({state:'hidden'});
   assert.equal(await page.evaluate(id=>K.G.run.boonLevels[id],id),rarity);offers++;
  }
  return{powers:18,offers,rarities:3};
 });
 await check('18 real start, pause, inspect, resume and abandon cycles clear prior build HUD',async()=>{
  await page.evaluate(async()=>{K.Save.data.bossKills=8;K.RunSystems.normalizeSave(K.Save.data);await K.Save.flush();});
  const heroes=['perseus','atalanta','orpheus'],weapons=['xiphos','kopis','dory','labrys','makhaira','styx_edge'];let cycles=0;
  for(const hero of heroes)for(const weapon of weapons){
   await page.evaluate(({hero,weapon})=>{K.Save.data.selectedHero=hero;K.Save.data.weapon=weapon;KATABASIS.start();K.G.player.hp=K.G.player.stats.maxHp;},{hero,weapon});
   await page.waitForFunction(()=>document.querySelectorAll('#boon-tray .boon-chip').length===0);
   assert.deepEqual(await page.evaluate(()=>({hero:K.G.run.heroId,weapon:K.G.run.weapon})),{hero,weapon});
   await page.keyboard.press('Escape');await page.locator('#screen-pause').waitFor({state:'visible'});
   await page.locator('#btn-armory-pause').click();await page.locator('[data-atlas-route="codex"]').click();await page.getByRole('button',{name:'BUILDS',exact:true}).click();assert.equal(await page.locator('#codex-body [data-codex-key]').count(),18);
   const before=await page.evaluate(()=>K.G.run.stats.time);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.evaluate(()=>K.G.run.stats.time),before);
   await page.locator('[data-atlas-route="descent"]').click();await page.locator('#btn-resume').click();await page.keyboard.press('Escape');await page.locator('#screen-pause').waitFor({state:'visible'});
   await page.locator('#btn-abandon').click();await page.locator('#screen-gameover').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>K.G.run.outcome),'death');await page.locator('#btn-title').click();cycles++;
  }
  return{cycles,heroes:3,weapons:6};
 });
 await check('Expanded discovery and large save survive IDB reload',async()=>{
  await page.evaluate(async()=>{for(const b of K.DATA.BOONS.concat(K.DATA.SPECIAL_BOONS))K.Save.data.seenBoons[b.id]=true;K.Save.data.killChronicle=Array.from({length:10000},(_,i)=>({id:'expanded-debug-'+i,name:'Audit Shade',enemy:'Shade',region:'Tartarus',backstory:'A remembered encounter. '.repeat(12)}));K.Save.write();if(!await K.Save.flush())throw Error('Full catalogue save failed');});
  await page.reload({waitUntil:'load'});await page.waitForFunction(()=>K.Persistence.ready&&K.G&&K.Assets.ready());
  assert.equal(await page.evaluate(()=>Object.keys(K.Save.data.seenBoons).length),8460);assert.equal(await page.evaluate(()=>K.Save.data.killChronicle.length),10000);
  return{seenBoons:8460,chronicleRecords:10000};
 });
 await check('Twelve long browser combat sessions cover heroes, major regions, bosses and all powers',async()=>{
  const encounters=[];
  for(const hero of ['perseus','atalanta','orpheus'])for(const regionId of ['tartarus','forge','aegean','olympus']){
   const details=await page.evaluate(({hero,regionId})=>{
    const g=K.G;if(g.practiceMode)g.exitPractice();g.startPractice({seed:91556,heroId:hero,weapon:hero==='atalanta'?'dory':hero==='orpheus'?'makhaira':'xiphos'});
    g.regionIndex=K.DATA.REGIONS.findIndex(r=>r.id===regionId);g.run.shopStats.push({maxHp:1e6});
    for(const key of Object.keys(K.BuildPowers.rules)){const b=K.DATA.BOONS.find(b=>b.expansionId==='divine-builds'&&b.buildArchetype===key&&!b.generatedVariant);g.run.addBoon(b.id,'heroic');}
    g.run.addRelic('r_hydra_heart');g.run.fatedThreadIds=['returning-echo','blood-and-ash'];g.recalcStats();g.player.hp=g.player.stats.maxHp;g.player.shield=50;
    g.pendingSpawns=[];K.E.enemies.length=K.E.projectiles.length=K.E.effects.length=0;g.hazards=[];
    const ids=Object.keys(K.DATA.ENEMIES).filter(id=>!id.startsWith('spectral_'));
    for(let i=0;i<21;i++){const e=g.addEnemy(ids[(g.regionIndex*31+i*211)%ids.length],Math.cos(i)*230,Math.sin(i)*230,{});e.spawnT=0;e.hp=e.maxHp=50000;}
    const bossId=({tartarus:'lion',forge:'typhon',aegean:'hydra',olympus:'medusa'})[regionId],boss=new K.E.Boss(bossId,0,-200,g,{});boss.entered=true;boss.hp=boss.maxHp=100000;K.E.enemies.push(boss);g.boss=boss;
    const ctx=g.ctx||document.getElementById('game').getContext('2d');let peakProjectiles=0,peakEffects=0,peakHazards=0;
    for(let frame=0;frame<1800;frame++){
     const target=K.E.enemies.find(e=>!e.dead&&!e.ally);if(target){K.Input.mouse.wx=target.x;K.Input.mouse.wy=target.y;}
     K.Input.mouse.down=true;K.Input.keys.KeyI=frame%120<24;
     K.Input.pressed.Space=frame%120===0;K.Input.pressed.KeyF=frame%120===0;K.Input.pressed.KeyR=frame%360===0;K.Input.pressed.KeyT=frame%900===0;K.Input.pressed.KeyK=frame%180===0;K.Input.pressed.KeyQ=frame%900===450;
     if(frame===600)boss.hp=boss.maxHp*.6;if(frame===1200)boss.hp=boss.maxHp*.25;
     g.update(1/60);K.Input.endFrame();if(frame%6===0)K.R.draw(ctx,g,1/60);
     for(const unit of [g.player,...K.E.enemies,...K.E.projectiles])for(const key of ['x','y','hp','dmg','life'])if(unit[key]!==undefined&&!Number.isFinite(unit[key]))throw Error(hero+'/'+regionId+' invalid '+key);
     peakProjectiles=Math.max(peakProjectiles,K.E.projectiles.length);peakEffects=Math.max(peakEffects,K.E.effects.length);peakHazards=Math.max(peakHazards,g.hazards.length);
     if(K.E.projectiles.length>512||K.E.effects.length>2048||g.hazards.length>512)throw Error('Runaway entities in '+hero+'/'+regionId);
    }
    K.Input.mouse.down=false;K.Input.keys.KeyI=false;K.Input.endFrame();g.exitPractice();
    return{hero,regionId,frames:1800,drawnFrames:300,peakProjectiles,peakEffects,peakHazards};
   },{hero,regionId});
   encounters.push(details);console.log('SOAK '+hero+' / '+regionId);
  }
  return{encounters,simulatedFrames:21600,drawnFrames:3600};
 });
 await check('Long-session browser has no uncaught errors or missing assets',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);});
 const report={ok:results.every(r=>r.ok),results,errors,missing};fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
 if(!report.ok)process.exitCode=1;console.log(results.filter(r=>r.ok).length+'/'+results.length+' extensive browser checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
