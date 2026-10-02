'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'../js/assets.js'),'utf8');
function fixture(mode='held') {
 const waiting=[],progress=[],images=[],K={},styles={};
 class Image {
  constructor(){this.naturalWidth=1200;this.naturalHeight=960;images.push(this);}
  set src(value){this._src=value;queueMicrotask(()=>this.onload());}
  decode(){if(mode==='failure')return Promise.reject(Error('decode failed'));if(mode==='held')return new Promise((resolve,reject)=>waiting.push({resolve,reject}));return Promise.resolve();}
 }
 if(mode==='unsupported')Image.prototype.decode=undefined;
 const manifest=Object.fromEntries(['ui.meander','ui.icons','ui.panel','actor.enemy.shade'].map(id=>[id,{src:id+'.webp',cols:4,rows:4}]));
 manifest['actor.animation.shade.idle']={src:'lazy.webp',cols:4,rows:4,lazy:true};
 const context={window:{K,KATABASIS_ASSET_MANIFEST:manifest},URL,Image,Promise,Number,Math,Object,String,Array,document:{baseURI:'https://katabasis.test/subdir/index.html',documentElement:{style:{setProperty(){}}},head:{appendChild(el){styles[el.id]=el;}},getElementById(id){return styles[id]||null;},createElement(){return {};}}};
 vm.runInNewContext(source,context,{filename:'js/assets.js'});
 return{K,waiting,progress,images,load:()=>K.Assets.load((...args)=>progress.push(args)),setMode(value){mode=value;}};
}
(async()=>{
 const held=fixture(),loading=held.load();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(held.waiting.length,4,'assets did not request asynchronous decoding');
 assert.equal(held.K.Assets.ready(),false,'loading ended before sprites were decoded');
 assert.equal(held.progress.length,0,'progress counted an undecoded sprite');
 held.waiting.forEach(entry=>entry.resolve());await loading;
 assert.equal(held.K.Assets.ready(),true);assert.equal(held.progress.length,4);
 console.log('PASS sprite loading waits for asynchronous decoding');
 const failed=fixture('failure');await assert.rejects(failed.load(),/decode failed/);assert.equal(failed.K.Assets.ready(),false);
 failed.setMode('success');await failed.load();assert.equal(failed.K.Assets.ready(),true);
 console.log('PASS failed decoding permits an actual load retry');
 const oldBrowser=fixture('unsupported');await oldBrowser.load();assert.equal(oldBrowser.K.Assets.ready(),true);
 console.log('PASS image loading supports browsers without decode');
 assert.equal(oldBrowser.K.Assets.url('ui.panel'),'https://katabasis.test/subdir/ui.panel.webp');
 console.log('PASS CSS asset URLs resolve against the game document');
 const lazy=fixture('success');await lazy.load();lazy.setMode('held');let draws=0;
 const ctx={globalAlpha:1,save(){},restore(){},translate(){},drawImage(){draws++;}};
 const draw=target=>target.K.Assets.drawCell(ctx,'actor.animation.shade.idle',0,0,0,0,16,16);
 assert.equal(draw(lazy),false);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(lazy.K.Assets.ready(),true,'lazy decoding blocked game readiness');
 assert.equal(lazy.waiting.length,1);assert.equal(draws,0,'undecoded lazy art was painted');
 lazy.waiting[0].resolve();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(draw(lazy),true);assert.equal(draws,1);
 console.log('PASS lazy art becomes drawable after decode without blocking boot');
 const lazyFailure=fixture('success');await lazyFailure.load();lazyFailure.setMode('failure');
 assert.equal(draw(lazyFailure),false);await new Promise(resolve=>setImmediate(resolve));
 for(let frame=0;frame<20;frame++)assert.equal(draw(lazyFailure),false);
 assert.equal(lazyFailure.images.length,5,'failed lazy art was repeatedly requested');
 assert.equal(lazyFailure.K.Assets.ready(),true);
 console.log('PASS failed lazy decoding keeps fallback rendering and avoids retry storms');
 console.log('6/6 asset load checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
