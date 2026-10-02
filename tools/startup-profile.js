'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio','--disable-extensions']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto(process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:'http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:90000});
 await page.waitForFunction(()=>K.G&&K.Persistence.ready&&K.Assets.ready());
 const profile=await page.evaluate(()=>{
  const g=K.G,stats={},samples=[];
  for(const name of ['drawFrame','drawCell','drawCover','drawImage']){const original=K.Assets[name];K.Assets[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const id=name+':'+args[1],s=stats[id]||(stats[id]={calls:0,totalMs:0,maxMs:0});const elapsed=performance.now()-t;s.calls++;s.totalMs+=elapsed;s.maxMs=Math.max(s.maxMs,elapsed);}};}
  g.startPractice({});g.run.shopStats.push({critBurst:25,castFork:4,castNova:25,dashNova:25,dashStrike:.3,parryNova:25,parryHeal:3,statusDetonate:25,statusSpread:1,bossHunter:.15,distanceDamage:.15,closeDamage:.15,killNova:25,killHaste:.15,shieldDamage:.15,guardCast:.5,rushNova:25,ascendNova:25});g.recalcStats();K.E.enemies.length=0;
  const ids=['shade','hoplite','soul','satyr','centaur','hecaton'];for(let i=0;i<22;i++)g.addEnemy(ids[i%ids.length],(i%6)*85-210,Math.floor(i/6)*80-220,{hpMul:100});g.player.hp=1e8;g.player.invuln=100;
  const ctx=g.ctx||document.getElementById('game').getContext('2d');
  for(let i=0;i<6;i++){const t=performance.now();if(i===0){g.player.doAttack(g);g.player.doCast(g);g.player.doRush(g);g.player.doAscend(g);}g.update(1/60);K.R.draw(ctx,g,1/60);samples.push(performance.now()-t);}
  return{samples,assets:Object.entries(stats).map(([id,s])=>({id,...s})).sort((a,b)=>b.totalMs-a.totalMs).slice(0,20)};
 });
 console.log(JSON.stringify(profile,null,2));
 if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(profile,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
