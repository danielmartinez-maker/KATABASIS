'use strict';
const assert=require('assert');
const {K,G,storage,releaseAll}=require('./debug-harness');
const tests=[];
function check(name,clipAvailable,catalog){
 storage.clear();K.Save.load();releaseAll();G.startRun(71003,{});G.pendingSpawns=[];K.E.enemies.length=0;
 const enemy=G.addEnemy('shade',0,-40,{});enemy.spawnT=0;enemy.catalogCreature=!!catalog;enemy.visualCell=0;
 const originalClip=K.Assets.drawEnemyClip,originalCell=K.Assets.drawCell;let clips=0,fallbacks=0;
 K.Assets.drawEnemyClip=function(){clips++;return clipAvailable;};
 K.Assets.drawCell=function(...args){if(args[1]==='actor.enemy.shade')fallbacks++;return originalCell.apply(this,args);};
 const stub={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){}};
 try{K.R.worldHelpers.actor(stub,G,enemy);assert.equal(clips,1,'enemy animation was not considered');assert.equal(fallbacks,clipAvailable?0:1,'authored and fallback art overlapped');tests.push({name,ok:true});console.log('PASS '+name);}
 catch(error){tests.push({name,ok:false,error:error.message});console.error('FAIL '+name+': '+error.message);}
 finally{K.Assets.drawEnemyClip=originalClip;K.Assets.drawCell=originalCell;}
}
check('authored animation draws without a second legacy sprite',true,false);
check('unavailable animation uses exactly one legacy sprite',false,false);
check('authored catalog animation draws without atlas fallback',true,true);
check('unavailable catalog animation uses exactly one atlas fallback',false,true);
console.log(tests.filter(t=>t.ok).length+'/'+tests.length+' render checks passed');
if(tests.some(t=>!t.ok))process.exitCode=1;
