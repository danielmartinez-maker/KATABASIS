'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,'../../outputs');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
const results=[],errors=[];let browser;
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,timeout:15000,args:['--mute-audio','--disable-extensions']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(7000);
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>window.K&&K.G&&K.Persistence.ready&&document.getElementById('asset-loading').classList.contains('hidden'),null,{timeout:60000});
 fs.mkdirSync(OUT,{recursive:true});
 if(process.argv.includes('--baseline')){await page.screenshot({path:path.join(ROOT,'../before-title.png')});console.log('BASELINE loaded; uncaught errors:',errors);return;}
 async function check(name,fn){try{await fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
 async function pause(){await page.keyboard.down('Escape');await page.locator('#screen-pause').waitFor({state:'visible'});await page.keyboard.up('Escape');}
 async function settle(){await page.evaluate(async()=>{await Promise.all(Array.from(document.querySelectorAll('.screen:not(.hidden),#veil')).flatMap(el=>el.getAnimations()).filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});}
 await check('Atlas navigation exists and marks Descent',async()=>{await page.locator('#atlas-nav').waitFor({state:'visible',timeout:3000});assert.equal(await page.locator('[data-atlas-route="descent"]').getAttribute('aria-current'),'page');});
 if(results[0].ok){
  await check('Locked Trials cannot start a run',async()=>{assert.equal(await page.locator('[data-atlas-route="trials"]').isDisabled(),true);assert.equal(await page.evaluate(()=>K.Save.data.runs),0);});
  await check('Every Atlas page and return survives repeated navigation',async()=>{for(let i=0;i<4;i++)for(const [route,screen] of [['armory','armory'],['loom','paragon'],['codex','codex'],['mirror','meta'],['help','help'],['descent','title']]){await page.locator('[data-atlas-route="'+route+'"]').click();assert.equal(await page.locator('#screen-'+screen).isVisible(),true);assert.equal(await page.locator('[data-atlas-route="'+route+'"]').getAttribute('aria-current'),'page');}});
  await settle();await page.screenshot({path:path.join(OUT,'katabasis-title.png')});
  await check('Codex exposes exact selectable boon values and empty search',async()=>{await page.evaluate(()=>{K.Save.data.seenBoons.z_strike=true;});await page.locator('[data-atlas-route="codex"]').click();await page.locator('#codex-search').fill('Lightning Strike');await page.locator('.codex-entry').first().click();assert.match(await page.locator('#codex-inspector').innerText(),/Attack damage bonus/);await settle();await page.screenshot({path:path.join(OUT,'katabasis-codex.png')});await page.locator('#codex-search').fill('zzzznoresult');assert.match(await page.locator('#codex-inspector').innerText(),/No entries/);await page.locator('#codex-search').fill('');});
  await check('Expanded Codex filters power archetypes and explains synergy recipes',async()=>{
    await page.locator('#codex-build-filter').selectOption('castFork');
    assert.ok(await page.locator('#codex-body [data-codex-key]').count()>0);
    await page.locator('#codex-build-filter').selectOption('all');
    await page.getByRole('button',{name:'BUILDS',exact:true}).click();
    assert.equal(await page.locator('#codex-body [data-codex-key]').count(),18);
    await page.locator('#codex-body [data-codex-key]').first().click();
    assert.match(await page.locator('#codex-inspector').innerText(),/Requires/);
    await page.screenshot({path:path.join(OUT,'katabasis-builds.png')});
    await page.getByRole('button',{name:'BOONS',exact:true}).click();
  });
  await check('Pause-origin Atlas navigation returns to the same run',async()=>{await page.locator('[data-atlas-route="descent"]').click();await page.locator('#btn-practice').click();await page.locator('#practice-resume').click();await pause();await page.locator('#btn-armory-pause').click();const seed=await page.evaluate(()=>K.G.run.seed);for(const route of ['loom','codex','mirror','help','descent'])await page.locator('[data-atlas-route="'+route+'"]').click();assert.equal(await page.locator('#screen-pause').isVisible(),true);assert.equal(await page.evaluate(()=>K.G.run.seed),seed);await page.locator('#btn-resume').click();assert.equal(await page.locator('#atlas-nav').isVisible(),false);await settle();await page.screenshot({path:path.join(OUT,'katabasis-combat.png')});await pause();await page.locator('#btn-practice-menu').click();await page.locator('#practice-exit').click();});
  await check('Boon upgrade cards quantify effects and support keyboard selection',async()=>{
    await page.evaluate(()=>{const g=K.G;g.startRun(9001,{});g.run.addBoon('z_strike','rare');g.recalcStats();const reward={kind:'boon',choices:[{id:'z_strike',rarity:'heroic'},{id:'r_strike',rarity:'rare'},{id:'leg_hades',rarity:'legendary'}],rerolls:0,skipBonus:30};g.pendingReward=reward;g.phase='reward';g.onTransition('reward',reward);});
    assert.match(await page.locator('#reward-choices').innerText(),/73.5%/);assert.match(await page.locator('#reward-choices').innerText(),/damage\/s/);assert.match(await page.locator('#reward-choices').innerText(),/80% off/);assert.match(await page.locator('#reward-choices').innerText(),/First purchase at each shop/);
    await settle();await page.screenshot({path:path.join(OUT,'katabasis-boons.png')});
    const card=page.locator('#reward-choices .card').first();assert.equal(await card.getAttribute('role'),'button');await card.focus();await page.keyboard.press('Enter');await page.locator('#screen-reward').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>K.G.run.boonLevels.z_strike),'heroic');
  });
  await check('HUD upgrades show current rarity and resolved tooltip numbers',async()=>{
    await page.waitForFunction(()=>document.querySelector('#boon-tray .boon-chip')?.title.includes('Heroic'));
    const title=await page.locator('#boon-tray .boon-chip').first().getAttribute('title');assert.match(title,/73.5%/);assert.doesNotMatch(title,/%[A-Z]%/);
    await page.evaluate(()=>{K.G.run.boonLevels.z_strike='common';K.G.run.boons.find(x=>x.id==='z_strike').rarity='common';K.G.recalcStats();});
    await page.waitForFunction(()=>document.querySelector('#boon-tray .boon-chip')?.title.includes('Common'));assert.match(await page.locator('#boon-tray .boon-chip').first().getAttribute('title'),/35%/);
    await settle();await page.screenshot({path:path.join(OUT,'katabasis-combat.png')});await pause();await page.locator('#btn-abandon').click();await page.locator('#btn-title').click();
  });
  await check('New boon powers show units, triggers, caps and live Dash windows',async()=>{
    await page.evaluate(()=>{KATABASIS.start();const g=K.G;g.startRun(70114,{});const keys=['castFork','statusDetonate','critBurst'];const choices=keys.map(key=>({id:K.DATA.BOONS.find(b=>b.expansionId==='divine-builds'&&b.buildArchetype===key&&!b.generatedVariant).id,rarity:'heroic'}));const reward={kind:'boon',choices,rerolls:0,skipBonus:30};g.pendingReward=reward;g.phase='reward';g.onTransition('reward',reward);});
    const text=await page.locator('#reward-choices').innerText();assert.match(text,/65%/);assert.match(text,/Build cap:/);assert.match(text,/damage/);assert.match(text,/1 second cooldown/);assert.doesNotMatch(text,/NaN|undefined|%[A-Z]%/);
    for(const size of [{width:390,height:844},{width:320,height:640}]) {
      await page.setViewportSize(size);
      const bounds=await page.locator('#screen-reward').evaluate(el=>({w:el.clientWidth,sw:el.scrollWidth}));
      assert.ok(bounds.sw<=bounds.w+2,'Expanded rewards overflow at '+size.width);
      const preview=page.locator('#reward-choices .card').first().locator('.boon-build-heading');
      await preview.scrollIntoViewIfNeeded();
      assert.equal(await preview.isVisible(),true);
    }
    await page.setViewportSize({width:390,height:844});await settle();await page.screenshot({path:path.join(OUT,'katabasis-expanded-boons-mobile.png')});
    await page.setViewportSize({width:1440,height:900});
    await page.screenshot({path:path.join(OUT,'katabasis-expanded-boons-details.png')});
    await page.locator('#screen-reward').evaluate(el=>{el.scrollTop=0;el.querySelectorAll('.room-panel,.choices').forEach(child=>{child.scrollTop=0;});});
    await settle();await page.screenshot({path:path.join(OUT,'katabasis-expanded-boons.png')});
    await page.locator('#reward-choices .card').first().click();
    await page.evaluate(()=>{const g=K.G;g.run.shopStats.push({dashStrike:.2});g.recalcStats();g.player.dashCharges=2;g.player.dashCd=0;g.player.knockVX=g.player.knockVY=0;K.Input.pressed.Space=true;g.player.update(1/60,g);K.Input.pressed.Space=false;});
    await page.waitForFunction(()=>document.getElementById('power-status').textContent.includes('Next Strike +20%'));assert.equal(await page.locator('#power-status').isVisible(),true);
    await page.screenshot({path:path.join(OUT,'katabasis-3x-power-hud.png')});
    await pause();await page.locator('#btn-abandon').click();await page.locator('#btn-title').click();
  });
  await check('Practice target menu freezes simulation and does not count a descent',async()=>{
    const runs=await page.evaluate(()=>K.Save.data.runs);await page.locator('#btn-practice').click();const time=await page.evaluate(()=>K.G.run.stats.time);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.evaluate(()=>K.G.run.stats.time),time);assert.equal(await page.evaluate(()=>K.Save.data.runs),runs);await page.locator('#practice-exit').click();
  });
  await check('Hero loadout and Loom inspector render selectable states',async()=>{
    await page.locator('#btn-begin').click();assert.equal(await page.locator('#hero-roster .hero-card.selected').count(),1);await page.locator('#hero-roster .hero-card').evaluateAll(cards=>{for(const card of cards){const box=card.getBoundingClientRect(),name=card.querySelector('strong').getBoundingClientRect(),desc=card.querySelector('small').getBoundingClientRect();if(desc.top<name.bottom-1||desc.bottom>box.bottom+1)throw Error('Hero description overlaps or escapes its card');}});await settle();await page.screenshot({path:path.join(OUT,'katabasis-heroes.png')});await page.locator('#hero-back').click();await page.locator('[data-atlas-route="loom"]').click();await settle();await page.screenshot({path:path.join(OUT,'katabasis-loom.png')});await page.locator('[data-atlas-route="armory"]').click();await settle();await page.screenshot({path:path.join(OUT,'katabasis-armory.png')});await page.locator('[data-atlas-route="descent"]').click();
  });
  await check('Large Chronicle, batched writes and reload preserve latest save',async()=>{
    const state=await page.evaluate(async()=>{const sample={id:'save-check',name:'QA Shade',enemy:'Shade',region:'Tartarus',backstory:'A remembered mortal. '.repeat(48)};K.Save.data.killChronicle=Array.from({length:12000},(_,i)=>({...sample,id:'save-check-'+i}));K.Save.data.obols=700;K.Save.write();for(let i=0;i<150;i++)K.Save.addObols(1);return{ok:await K.Save.flush(),pending:K.Persistence.status.pending};});assert.equal(state.ok,true);assert.equal(state.pending,false);await page.reload({waitUntil:'load'});await page.waitForFunction(()=>K.Persistence.ready);assert.equal(await page.evaluate(()=>K.Save.data.killChronicle.length),12000);assert.equal(await page.evaluate(()=>K.Save.data.obols),850);
  });
  await check('Save failure displays recovery notice and retry clears it',async()=>{
    const state=await page.evaluate(async()=>{await K.Save.flush();const old=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(){throw Error('QA disk failure');};try{K.Save.addObols(5);return{ok:await K.Save.flush(),error:K.Persistence.status.error,visible:!document.getElementById('save-notice').classList.contains('hidden')};}finally{IDBDatabase.prototype.transaction=old;}});assert.equal(state.ok,false);assert.ok(state.error);assert.equal(state.visible,true);assert.equal(await page.evaluate(async()=>await K.Save.flush()),true);assert.equal(await page.locator('#save-notice').isVisible(),false);
  });
  await check('Full reset persists without resurrecting old records',async()=>{await page.evaluate(async()=>{K.Save.clear();await K.Save.flush();});await page.reload({waitUntil:'load'});await page.waitForFunction(()=>K.Persistence.ready);assert.equal(await page.evaluate(()=>K.Save.data.killChronicle.length),0);assert.equal(await page.evaluate(()=>K.Save.data.obols),0);});
  await check('Screens fit desktop, tablet and narrow viewports',async()=>{for(const size of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:640}]){await page.setViewportSize(size);for(const [route,screen] of [['descent','title'],['armory','armory'],['loom','paragon'],['codex','codex'],['mirror','meta'],['help','help']]){await page.locator('[data-atlas-route="'+route+'"]').click();const bounds=await page.locator('#screen-'+screen).evaluate(el=>({w:el.clientWidth,sw:el.scrollWidth}));assert.ok(bounds.sw<=bounds.w+2,route+' overflows at '+size.width+': '+JSON.stringify(bounds));} }await page.locator('[data-atlas-route="descent"]').click();await settle();await page.screenshot({path:path.join(OUT,'katabasis-narrow.png')});});
 }
 await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({results,errors},null,2));
 console.log(results.filter(r=>r.ok).length+'/'+results.length+' browser checks passed');
 if(results.some(r=>!r.ok))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});



