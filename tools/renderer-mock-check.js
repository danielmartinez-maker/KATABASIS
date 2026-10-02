'use strict';
const {K,G,releaseAll} = require('./debug-harness');
releaseAll(); K.Save.clear(); G.startRun(713);
const R = K.WorldRenderer;
const world = G.world, cam = G.cam;
let quads = 0, shadows = 0;
function makeCtx(){
  quads = 0; shadows = 0;
  return {
    _webgl:true, lost:false, mode:0, globalAlpha:1, light:0.94,
    stats:{drawCalls:0,quads:0}, _m:[1,0,0,1,0,0],
    beginFrame(){}, flush(){},
    save(){}, restore(){},
    translate(){}, scale(){}, rotate(){}, setTransform(){},
    texture:(img)=>img ? {mock:true} : null,
    quad(){ quads++; },
    drawImage(){ quads++; },
    shadow(){ shadows++; },
    fillRect(){ quads++; },
  };
}
// stub assets to fake images so the terrain path executes fully
const A = K.Assets;
const fakeImg = {naturalWidth:256, naturalHeight:256};
let imageCalls = 0;
const origImage = A.image.bind(A);
A.image = (id)=>{ imageCalls++; if(String(id).startsWith('region.')) return fakeImg; return origImage(id); };
A.entry = ((orig)=> (id)=> orig(id) || (String(id).startsWith('region.') ? {cols:4,rows:4} : null))(A.entry.bind(A));
K.R.worldHelpers = {
  hazard(){}, effect(){}, actor(){ quads++; }, interactable(){ quads++; },
  projectile(){ quads++; }, particles(){}, pickup(){},
  banner(){}, cinematic(){},
};
G.realTime = 1.0;
let ctx = makeCtx();
R.draw(ctx, G);
console.log('draw1 quads:', quads, 'imageCalls:', imageCalls, 'cells:', world.cells.length);
const q1 = quads, ic1 = imageCalls;
// move camera far away -> culling should reduce terrain quads
const sx = cam.x, sy = cam.y;
cam.x += 20000; cam.y += 20000;
ctx = makeCtx(); imageCalls = 0;
R.draw(ctx, G);
console.log('draw-far quads:', quads, 'imageCalls:', imageCalls);
const qFar = quads;
cam.x = sx; cam.y = sy;
// color cache check
const c1 = R.color('#c08040', 0.5), c2 = R.color('#c08040', 0.5);
console.log('color equal values:', JSON.stringify(c1)===JSON.stringify(c2), 'distinct arrays:', c1!==c2);
// viewRect equivalence spot check vs R.visible for a few cells
const view = R.viewRect(cam, 80);
let mism = 0, checked = 0;
for(let i=0;i<world.cells.length;i+=97){
  const c = world.cells[i], b = {x:c.x-40,y:c.y-40,w:80,h:80};
  const a = R.visible(cam,b,80);
  const w = !(b.x+b.w<view.x0||b.y+b.h<view.y0||b.x>view.x1||b.y>view.y1);
  if(a!==w) mism++;
  checked++;
}
console.log('cull equivalence:', checked-checked, 'mismatches:', mism, 'of', checked);
if(q1<=0) throw new Error('no quads drawn');
if(qFar>=q1) throw new Error('far camera did not cull terrain');
if(mism) throw new Error('viewRect disagrees with visible()');
console.log('RENDERER MOCK DRAW: passed');
