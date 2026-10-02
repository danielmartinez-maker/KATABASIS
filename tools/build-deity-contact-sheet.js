'use strict';

/* Build a labelled overview of the exact offline posters shipped by the game. */
const fs=require('fs');
const path=require('path');
const sharp=require(process.env.KATABASIS_SHARP_PATH||'C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..');
const roster=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/deity-portraits/roster.json'),'utf8'));
const production=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/deity-portraits/production.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/manifest.json'),'utf8'));
const columns=9,posterWidth=120,posterHeight=150,labelHeight=24,gap=7,cellWidth=posterWidth+gap,cellHeight=posterHeight+labelHeight;
const rows=Math.ceil(roster.entries.length/columns),width=columns*cellWidth,height=rows*cellHeight;

(async()=>{
  if(roster.entries.length!==53||production.completed!==53||production.entries.length!==53)throw new Error('Portrait roster and production ledger must both cover all 53 identities.');
  if(production.fullResolutionMasters!==53||production.atlasCompatibilityCrops!==0)throw new Error('Portrait production totals do not match the approved final asset set.');
  const layers=[];
  for(let index=0;index<roster.entries.length;index++){
    const record=roster.entries[index],x=(index%columns)*cellWidth+3,y=Math.floor(index/columns)*cellHeight;
    const masterPath=path.join(ROOT,'assets/deities/masters',record.id+'.png');
    const posterPath=path.join(ROOT,'assets/deities/posters',record.id+'.webp');
    if(record.assetSource!=='generated-master'||record.artStatus!=='packaged-poster')throw new Error('Portrait is not backed by a completed original master: '+record.id);
    if(!fs.existsSync(masterPath)||!fs.existsSync(posterPath))throw new Error('Missing master or packaged poster for '+record.id);
    const masterInfo=await sharp(masterPath).metadata(),posterInfo=await sharp(posterPath).metadata();
    const manifestEntry=manifest['portrait.greek.'+record.id+'.poster'];
    if(masterInfo.format!=='png'||masterInfo.width<1000||masterInfo.height<1000||masterInfo.width*masterInfo.height<1500000)throw new Error('Master is not a high-resolution PNG for '+record.id);
    if(posterInfo.format!=='webp'||posterInfo.width!==320||posterInfo.height!==400)throw new Error('Unexpected poster dimensions or format for '+record.id);
    if(!manifestEntry||manifestEntry.src!=='assets/deities/posters/'+record.id+'.webp'||manifestEntry.reviewed!==true)throw new Error('Portrait manifest entry is missing, unreviewed, or misdirected for '+record.id);
    const poster=await sharp(posterPath).resize(posterWidth,posterHeight,{fit:'cover'}).png().toBuffer();
    const label=String(index+1).padStart(2,'0')+' '+record.id;
    const svg=Buffer.from(`<svg width="${posterWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#191613"/><text x="5" y="17" fill="#e4d2b4" font-family="Arial,sans-serif" font-size="12">${label}</text></svg>`);
    layers.push({input:poster,left:x,top:y},{input:svg,left:x,top:y+posterHeight});
  }
  const target=path.join(ROOT,'docs/deity-portraits/contact-sheet.png');
  await sharp({create:{width,height,channels:3,background:'#100f10'}}).composite(layers).png({compressionLevel:9}).toFile(target);
  console.log(`Wrote ${roster.entries.length} posters in a ${columns}-column contact sheet (${width}x${height}).`);
})().catch(error=>{console.error(error);process.exitCode=1;});
