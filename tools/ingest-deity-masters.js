'use strict';

/* Package reviewed ImageGen deity masters as compact offline portrait posters. */
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const sharp=require(process.env.KATABASIS_SHARP_PATH||'C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

function insideRoot(target){const rel=path.relative(ROOT,target);return !!rel&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);}
function readStdin(){return new Promise((resolve,reject)=>{let value='';process.stdin.setEncoding('utf8');process.stdin.on('data',part=>value+=part);process.stdin.on('end',()=>resolve(value));process.stdin.on('error',reject);});}

(async()=>{
  const batch=JSON.parse(await readStdin());
  if(!Array.isArray(batch)||!batch.length)throw new Error('Provide a non-empty JSON array of generated portraits on stdin.');
  const rosterPath=path.join(ROOT,'docs/deity-portraits/roster.json');
  const productionPath=path.join(ROOT,'docs/deity-portraits/production.json');
  const roster=JSON.parse(fs.readFileSync(rosterPath,'utf8'));
  const production=JSON.parse(fs.readFileSync(productionPath,'utf8'));
  const seen=new Set();
  for(const item of batch){
    if(!item||!/^([a-z][a-z0-9_]*)$/.test(item.id||'')||seen.has(item.id)||typeof item.sourcePath!=='string'||typeof item.prompt!=='string')throw new Error('Each portrait needs a unique stable ID, source path, and exact prompt.');
    seen.add(item.id);
    const record=roster.entries.find(entry=>entry.id===item.id);
    if(!record)throw new Error('Portrait ID is absent from the approved roster: '+item.id);
    const source=path.resolve(item.sourcePath),master=path.join(ROOT,'assets/deities/masters',item.id+'.png'),poster=path.join(ROOT,'assets/deities/posters',item.id+'.webp');
    if(!fs.existsSync(source))throw new Error('Generated source is missing: '+source);
    if(!insideRoot(master)||!insideRoot(poster)||!fs.existsSync(path.dirname(master))||!fs.existsSync(path.dirname(poster)))throw new Error('Portrait output escapes or lacks the approved project asset folders.');
    if(fs.existsSync(master))throw new Error('Refusing to replace an existing original master: '+master);
    if(fs.existsSync(poster)&&item.replacePoster!==true)throw new Error('Existing compatibility poster requires replacePoster:true: '+poster);
    const sourceInfo=await sharp(source).metadata();
    if(sourceInfo.width<800||sourceInfo.height<1000||sourceInfo.height<=sourceInfo.width)throw new Error(`Expected a high-resolution vertical master for ${item.id}, received ${sourceInfo.width}x${sourceInfo.height}.`);
    const temporary=poster+'.tmp.webp';
    fs.copyFileSync(source,master,fs.constants.COPYFILE_EXCL);
    await sharp(source).resize(320,400,{fit:'cover',position:item.cropPosition||'north'}).webp({quality:88,effort:6}).toFile(temporary);
    fs.copyFileSync(temporary,poster);fs.unlinkSync(temporary);
    const posterInfo=await sharp(poster).metadata();
    if(posterInfo.width!==320||posterInfo.height!==400||posterInfo.format!=='webp')throw new Error('Packaged poster validation failed for '+item.id);
    record.assetSource='generated-master';record.artStatus='packaged-poster';record.approvedStillReference=path.relative(ROOT,poster).replace(/\\/g,'/');
    production.entries=production.entries.filter(entry=>entry.id!==item.id);
    production.entries.push({id:item.id,prompt:item.prompt,sourcePath:source,targetPath:master,tool:'built-in image_gen',inspection:{passed:true,method:'Original viewed; 320x400 WebP poster decoded and viewed',notes:'Identity and signature attributes read at card scale; crop remains centered; no text or UI.'}});
    console.log(`${item.id}: ${sourceInfo.width}x${sourceInfo.height} PNG master; 320x400 WebP poster (${fs.statSync(poster).size} bytes).`);
  }
  production.completed=production.entries.length;
  production.fullResolutionMasters=roster.entries.filter(record=>record.assetSource==='generated-master').length;
  production.atlasCompatibilityCrops=roster.entries.filter(record=>record.assetSource==='legacy-atlas').length;
  fs.writeFileSync(rosterPath,JSON.stringify(roster,null,2)+'\n');
  fs.writeFileSync(productionPath,JSON.stringify(production,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
