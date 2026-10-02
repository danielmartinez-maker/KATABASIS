'use strict';
const fs=require('fs'),path=require('path'),Module=require('module');
const filename=path.join(__dirname,'bundle-check.js');
let source=fs.readFileSync(filename,'utf8');
const start=source.indexOf('  /* no external requests'),end=source.indexOf('  try { ws.close(); }');
if(start<0||end<start)throw Error('Browser harness markers changed');
source=source.slice(0,start)+`
  const results=[];
  await send('Page.enable');
  async function check(name,expression){const result=await ev(expression);results.push({name,result});console.log(name+': '+JSON.stringify(result));if(!result||result.__err||result.ok!==true)problems.push(name+' failed: '+JSON.stringify(result));return result;}
  const backend=await check('durable save backend','({ok:!!(K.Persistence&&K.Persistence.ready),status:K.Persistence&&K.Persistence.status})');
  if(backend.ok){
    await check('legacy save migration setup','(async function(){await K.Save.flush();var r=indexedDB.open(K.Persistence.databaseName);await new Promise(function(resolve,reject){r.onsuccess=function(){var db=r.result,t=db.transaction("progress","readwrite");t.objectStore("progress").delete("save");t.oncomplete=function(){db.close();resolve();};t.onerror=reject;};r.onerror=reject;});var s=K.Save.defaults();s.obols=321;s.runs=7;s.killChronicle=[{id:"legacy-kill",name:"Kallias",backstory:"A ferryman remembered his daughter.",enemy:"Shade"}];s.campaignArchive=[{title:"Legacy pact",voices:[]}];localStorage.setItem("katabasis.save.v1",JSON.stringify(s));return {ok:true};})()');
    await send('Page.reload',{ignoreCache:true});await sleep(1800);
    await check('legacy currency and stories survive migration','({ok:K.Save.data.obols===321&&K.Save.data.runs===7&&K.Save.data.killChronicle[0].id==="legacy-kill"&&K.Save.data.campaignArchive.length===1&&K.Save.data.gearInventory.length>0,obols:K.Save.data.obols})');
    await check('Chronicle larger than localStorage persists','(async function(){var g=K.G;g.startRun(777);var e=g.addEnemy("shade",0,0,{}),sample=g.createKillChronicleEntry(e);K.Save.data.killChronicle=Array.from({length:12000},function(_,i){return Object.assign({},sample,{id:"quality-"+i,sequence:i});});K.Save.data.obols=543210;K.Save.write();var limited=false;try{localStorage.setItem("quality-quota-probe",JSON.stringify(K.Save.data));localStorage.removeItem("quality-quota-probe");}catch(e){limited=true;}var flushed=await K.Save.flush();return {ok:limited&&flushed,localStorageRejected:limited,records:K.Save.data.killChronicle.length,status:K.Persistence.status};})()');
    await send('Page.reload',{ignoreCache:true});await sleep(1800);
    await check('large Chronicle and currency reload intact','({ok:K.Save.data.killChronicle.length===12000&&K.Save.data.obols===543210,records:K.Save.data.killChronicle.length,obols:K.Save.data.obols})');
    await check('rapid updates commit their latest state','(async function(){for(var i=0;i<150;i++)K.Save.addObols(1);var ok=await K.Save.flush();return {ok:ok&&K.Save.data.obols===543360,status:K.Persistence.status};})()');
    await send('Page.reload',{ignoreCache:true});await sleep(1600);
    await check('latest batch survives reload','({ok:K.Save.data.obols===543360,obols:K.Save.data.obols})');
    const blockedScript=await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__qualityStorageBlocked=true; indexedDB.open=function(){throw Error("storage blocked for QA");};'});
    await send('Page.reload',{ignoreCache:true});await sleep(1500);
    await check('blocked migrated storage cannot silently overwrite its legacy backup','({ok:!!window.__qualityStorageBlocked&&!!K.Persistence.status.error&&!document.getElementById("save-notice").classList.contains("hidden")&&JSON.parse(localStorage.getItem("katabasis.save.v1")).obols===321,injection:!!window.__qualityStorageBlocked,backend:K.Persistence.status.backend,error:K.Persistence.status.error})');
    await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:blockedScript.identifier});
    await send('Page.reload',{ignoreCache:true});await sleep(1700);
    await check('reopening durable storage recovers the newer full save','({ok:K.Save.data.obols===543360&&K.Save.data.killChronicle.length===12000,obols:K.Save.data.obols})');
    await check('gear comparison avoids copying a large Chronicle','(function(){var item=K.Gear.generate("weapon",20,new K.RNG(882),"legendary");K.Gear.add(item);var old=JSON.stringify;JSON.stringify=function(value){if(value&&value.killChronicle)throw Error("full save copied for comparison");return old.apply(JSON,arguments);};var started=performance.now();try{document.getElementById("btn-armory").click();}finally{JSON.stringify=old;}return {ok:!document.getElementById("screen-armory").classList.contains("hidden"),ms:performance.now()-started};})()');
    await check('full reset clears indexed progress','(async function(){K.Save.clear();return {ok:await K.Save.flush()};})()');
    await send('Page.reload',{ignoreCache:true});await sleep(1500);
    await check('reset cannot resurrect old progress','({ok:K.Save.data.obols===0&&K.Save.data.killChronicle.length===0&&K.Save.data.campaignArchive.length===0&&K.Save.data.gearInventory.length===1,obols:K.Save.data.obols})');
    await check('concurrent flush waits for updates made during an earlier write','(async function(){K.Save.addObols(1);var first=K.Save.flush();K.Save.addObols(2);var second=K.Save.flush();await second;var waiting=K.Persistence.status.pending;await first;return {ok:!waiting,pendingAfterSecondFlush:waiting};})()');
    await check('failed database writes display a persistent recovery message','(async function(){await K.Save.flush();var original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(){throw Error("simulated disk failure");};try{K.Save.addObols(5);var flushed=await K.Save.flush();return {ok:!flushed&&!!K.Persistence.status.error&&!document.getElementById("save-notice").classList.contains("hidden"),error:K.Persistence.status.error};}finally{IDBDatabase.prototype.transaction=original;}})()');
    await check('retry commits progress and clears the recovery message','(async function(){var ok=await K.Save.flush();return {ok:ok&&document.getElementById("save-notice").classList.contains("hidden"),obols:K.Save.data.obols};})()');
    await check('Chronicle return setup','(function(){document.getElementById("btn-begin").click();K.G.player.hp=0;K.G.die();document.getElementById("btn-go-chronicle").click();return {ok:!document.getElementById("screen-codex").classList.contains("hidden")};})()');
    await ev('window.dispatchEvent(new KeyboardEvent("keydown",{code:"Escape",bubbles:true}))');await sleep(100);
    await ev('window.dispatchEvent(new KeyboardEvent("keyup",{code:"Escape",bubbles:true}))');
    await check('Escape returns Chronicle to the originating result screen','({ok:!document.getElementById("screen-gameover").classList.contains("hidden"),titleVisible:!document.getElementById("screen-title").classList.contains("hidden")})');
  }
  fs.writeFileSync(path.join(ROOT,'tools','quality-browser-results.json'),JSON.stringify(results,null,2));
`+source.slice(end);
source=source.replace('pending.set(i, { resolve: res });','const timer=setTimeout(()=>{pending.delete(i);res({exceptionDetails:{text:"CDP timeout: "+method}});},25000); pending.set(i, { resolve:result=>{clearTimeout(timer);res(result);} });');
source=source.replace("if (m.method === 'Runtime.exceptionThrown') {", "if (m.method === 'Page.javascriptDialogOpening') { send('Page.handleJavaScriptDialog',{accept:true}); return; }\n    if (m.method === 'Runtime.exceptionThrown') {");
source=source.replace('BUNDLE CHECK PASSED — the single file runs alone, offline, with no siblings.','QUALITY BROWSER CHECKS PASSED — migration, large saves, reload, batching, reset and comparison.');
const harness=new Module(filename,module);harness.filename=filename;harness.paths=Module._nodeModulePaths(__dirname);harness._compile(source,filename);
