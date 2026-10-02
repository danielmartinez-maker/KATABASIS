'use strict';
// Same-map A/B: static terrain buffer vs dynamic fallback terrain.
// Fixed seed => identical map for both paths.
// Run: node tools/renderer-ab.js [practice|campaign]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('C:/Users/dmcfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
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
  const mode = process.argv[2] === 'campaign' ? 'campaign' : 'practice';
  const result = await page.evaluate((runMode) => {
    const G = window.K.G, R = window.K.WorldRenderer;
    if (runMode === 'campaign') G.startRun(4242);
    else G.startPractice({ seed: 4242 });
    for (let i = 0; i < 30; i++) G.update(1 / 60);
    window.K.World.reveal(G.world, G.player.x, G.player.y, 1400);
    const ctx = G.ctx;
    function bench(frames) {
      for (let i = 0; i < 10; i++) R.draw(ctx, G);
      const ts = [];
      for (let i = 0; i < frames; i++) {
        const t = performance.now();
        R.draw(ctx, G);
        ts.push(performance.now() - t);
      }
      ts.sort((a, b) => a - b);
      const stats = { drawCalls: ctx.stats.drawCalls, quads: ctx.stats.quads };
      return { median: ts[(frames / 2) | 0], mean: ts.reduce((a, b) => a + b, 0) / frames, stats };
    }
    const parked = { x: G.cam.x, y: G.cam.y };
    const statik = bench(120);
    const staticCalls = statik.stats.drawCalls, staticQuads = statik.stats.quads;
    ctx._wprogFailed = true; ctx._wprog = null; ctx._terrainStatic = null;
    G.cam.x = parked.x; G.cam.y = parked.y;
    const dynam = bench(120);
    return {
      mode: runMode,
      cells: G.world.cells.length,
      static: { median: +statik.median.toFixed(3), mean: +statik.mean.toFixed(3), drawCalls: staticCalls, quads: staticQuads },
      dynamic: { median: +dynam.median.toFixed(3), mean: +dynam.mean.toFixed(3), drawCalls: dynam.stats.drawCalls, quads: dynam.stats.quads }
    };
  }, mode);
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
