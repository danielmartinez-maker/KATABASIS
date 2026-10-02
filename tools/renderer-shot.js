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
  // Tartarus practice ground: tile variation + raised-terrain shading.
  await page.evaluate(() => {
    const G = window.K.G;
    G.startPractice({});
    for (let i = 0; i < 30; i++) G.update(1 / 60);
    window.K.World.reveal(G.world, G.player.x, G.player.y, 1400);
  });
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
  console.log('styx:', JSON.stringify(styx));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outdir, 'shot-world-styx.png') });
  console.log('shots written to ' + outdir);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
