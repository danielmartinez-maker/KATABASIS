'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const K = {W:1280,H:800,U:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}};
const scope = {window:{K},document:{createElement:()=>({getContext:()=>null})},console};
if (fs.existsSync('js/world-renderer.js')) vm.runInNewContext(fs.readFileSync('js/world-renderer.js','utf8'),scope);
assert.ok(K.WorldRenderer,'Missing WebGL world backend');
const R=K.WorldRenderer, cam={x:100,y:200,zoom:2,ox:3,oy:-4};
assert.deepStrictEqual(JSON.parse(JSON.stringify(R.project(cam,100,200,0))),{x:646,y:392});
assert.deepStrictEqual(JSON.parse(JSON.stringify(R.project(cam,110,220,12))),{x:666,y:408});
assert.equal(R.visible(cam,{x:100,y:200,w:50,h:50}),true);
assert.equal(R.visible(cam,{x:10000,y:20000,w:50,h:50}),false);
assert.equal(R.create({getContext:()=>null}),null,'unsupported device cannot silently use Canvas2D');
assert.equal(R.create({getContext:()=>({drawImage(){}})}),null,'Canvas shim is not WebGL');
const color=R.color('#c08040',0.5);
assert.ok(Math.abs(color[0]-192/255)<1e-6);assert.equal(color[3],0.5);
assert.deepStrictEqual(JSON.parse(JSON.stringify(R.color('rgba(20,40,60,0.25)',0.5))),[20/255,40/255,60/255,0.125]);
assert.strictEqual(typeof R.terrainDrawList,'function','missing culling for collision-aligned terrain art');
assert.strictEqual(typeof R.projectTerrainFeature,'function','missing elevation projection for terrain art');
const terrainWorld={profile:{assetKit:'ash'},terrainFeatures:[
  {id:'near',kind:'ridge',x:100,y:200,w:120,h:80,elevation:32,depthY:240,cell:1,assetId:'regionterrain.ash'},
  {id:'far',kind:'bridge',x:900,y:800,w:160,h:100,elevation:0,depthY:850,cell:12,assetId:'regionterrain.ash'}
]};
const terrainList=R.terrainDrawList(terrainWorld,{x0:0,y0:0,x1:300,y1:300});
assert.deepStrictEqual(Array.from(terrainList,feature=>feature.id),['near'],'terrain draw list did not cull to the view');
assert.strictEqual(R.terrainAssetId(terrainWorld,terrainList[0]),'regionterrain.ash','feature resolved the wrong family atlas');
assert.deepStrictEqual(JSON.parse(JSON.stringify(R.projectTerrainFeature(cam,terrainList[0]))),JSON.parse(JSON.stringify(R.project(cam,100,200,32))));
const assetManifest=JSON.parse(fs.readFileSync('assets/manifest.json','utf8'));
for(const family of ['ash','river','grove','fields','lava','ruins','storm','terraces']){
  const detail=assetManifest['regiondetail.'+family],terrain=assetManifest['regionterrain.'+family];
  assert.ok(detail&&detail.kind==='region-ground-detail'&&detail.cols===4&&detail.rows===4,'missing compact '+family+' floor-detail atlas');
  assert.ok(terrain&&terrain.kind==='region-terrain-art'&&terrain.cols===4&&terrain.rows===4,'missing '+family+' terrain formation atlas');
}
console.log('WORLD RENDERER: projection, culling, material color and capability contract passed');
