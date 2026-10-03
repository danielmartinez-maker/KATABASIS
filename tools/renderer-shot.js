'use strict';
// Captures world-terrain screenshots for visual review of tile variation,
// shoreline foam, raised-terrain shading, and region prewarming.
// Run: node tools/renderer-shot.js [outdir]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const outdir = path.resolve(process.argv[2] || path.join(__dirname));
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
let browser;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio', '--disable-extensions', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.K && window.K.G && window.K.Persistence.ready && window.K.Assets.ready(), null, { timeout: 120000 });
  const ambienceControls=await page.evaluate(()=>{
    const volume=document.getElementById('ambience-volume'),mute=document.getElementById('ambience-muted'),motion=document.getElementById('reduced-motion');if(!volume||!mute||!motion)return false;
    const original={volume:K.Save.data.ambienceVolume,muted:K.Save.data.ambienceMuted,reduced:K.Save.data.reducedMotion};
    volume.value='0.62';volume.dispatchEvent(new Event('input',{bubbles:true}));volume.dispatchEvent(new Event('change',{bubbles:true}));
    mute.checked=!original.muted;mute.dispatchEvent(new Event('change',{bubbles:true}));
    motion.checked=!original.reduced;motion.dispatchEvent(new Event('change',{bubbles:true}));
    const ok=Math.abs(K.Audio._ambienceVolume-0.62)<1e-9&&K.Save.data.ambienceVolume===0.62&&K.Audio.ambienceMuted===!original.muted&&K.Save.data.ambienceMuted===!original.muted&&K.WorldAmbience.isReducedMotion()===!original.reduced;
    volume.value=String(original.volume);volume.dispatchEvent(new Event('input',{bubbles:true}));volume.dispatchEvent(new Event('change',{bubbles:true}));
    mute.checked=original.muted;mute.dispatchEvent(new Event('change',{bubbles:true}));motion.checked=original.reduced;motion.dispatchEvent(new Event('change',{bubbles:true}));return ok;
  });
  if(!ambienceControls)throw new Error('regional ambience settings did not update and persist all three controls');
  console.log('ambience settings: volume, independent mute, reduced motion passed');
  const waitForWorldArt = () => page.waitForFunction(() => {
    const world=window.K.G.world;if(!world)return false;
    const assetIds=[world.groundAssetId,'regionterrain.'+(world.profile&&world.profile.assetKit||'ruins'),'regionkit.'+(world.profile&&world.profile.assetKit||'ruins')];
    return assetIds.every(id=>{const image=window.K.Assets.image(id);return !!(image&&image.complete&&image.naturalWidth>0);});
  },null,{timeout:60000});
  const logTerrainFrame = label => page.evaluate(label => {
    const G=window.K.G,W=window.K.World,R=window.K.WorldRenderer,view=R.viewRect(G.cam,0),list=R.terrainDrawList(G.world,view),revealed=list.filter(feature=>G.world.revealed[W.cellKey(feature.x,feature.y,G.world.tileSize)]),decals=G.world.terrainOverlays.filter(item=>item.kind==='ground-surface'&&item.x>=view.x0&&item.x<=view.x1&&item.y>=view.y0&&item.y<=view.y1&&G.world.revealed[W.cellKey(item.x,item.y,G.world.tileSize)]);
    return {label,zoom:G.cam.zoom,view:{x0:Math.round(view.x0),y0:Math.round(view.y0),x1:Math.round(view.x1),y1:Math.round(view.y1)},terrainInFrame:list.length,terrainRevealed:revealed.length,decalsInFrame:decals.length,kinds:revealed.reduce((counts,feature)=>(counts[feature.kind]=(counts[feature.kind]||0)+1,counts),{})};
  },label).then(result=>{console.log('terrain frame:',JSON.stringify(result));if(result.terrainRevealed<6||result.decalsInFrame<6)throw new Error(label+' gameplay frame is missing the dense regional terrain layers');return result;});
  // Tartarus campaign ground: biome decals, encounter framing, and raised-terrain shading.
  await page.evaluate(() => {
    const G = window.K.G;
    G.startRun(971);
    G.enterRegion('tartarus');
    for (let i = 0; i < 30; i++) G.update(1 / 60);
    window.K.World.reveal(G.world, G.player.x, G.player.y, 1400);
  });
  await waitForWorldArt();
  await logTerrainFrame('tartarus');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outdir, 'shot-world-tartarus.png') });
  // River Styx: water channels + shoreline foam + current hazards.
  const styx = await page.evaluate(() => {
    const G = window.K.G;
    G.exitPractice();
    G.startRun(713);
    const ok = G.enterRegion('styx');
    for (let i = 0; i < 30; i++) G.update(1 / 60);
    window.K.World.reveal(G.world, G.player.x, G.player.y, 1400);
    return { region: G.region().id, cells: G.world.cells.length, water: G.world.cells.filter(c => c.kind === 'water').length };
  });
  await waitForWorldArt();
  await logTerrainFrame('styx');
  console.log('styx:', JSON.stringify(styx));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outdir, 'shot-world-styx.png') });
  await page.evaluate(() => {
    const G = window.K.G;
    G.startRun(111);
    G.enterRegion('aegean');
    for (let i = 0; i < 30; i++) G.update(1 / 60);
    window.K.World.reveal(G.world, G.player.x, G.player.y, 1400);
  });
  await waitForWorldArt();
  await logTerrainFrame('aegean');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outdir, 'shot-world-aegean.png') });
  console.log('shots written to ' + outdir);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
