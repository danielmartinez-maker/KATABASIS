'use strict';
// Splits frame cost: G.update vs R.draw vs HUD/tick on a busy encounter.
// Run: node tools/sim-profile.js
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
  const result = await page.evaluate(() => {
    const G = window.K.G, K = window.K, R = window.K.WorldRenderer;
    G.startRun(4242);
    for (let i = 0; i < 30; i++) G.update(1 / 60);
    K.World.reveal(G.world, G.player.x, G.player.y, 1400);
    const ctx = G.ctx;
    function q(fn, frames) {
      for (let i = 0; i < 10; i++) fn();
      const ts = [];
      for (let i = 0; i < frames; i++) { const t = performance.now(); fn(); ts.push(performance.now() - t); }
      ts.sort((a, b) => a - b);
      return { median: +ts[(frames / 2) | 0].toFixed(3), mean: +(ts.reduce((a, b) => a + b, 0) / frames).toFixed(3) };
    }
    const STEP = 1 / 60;
    const update = q(() => G.update(STEP), 120);
    for (let i = 0; i < 24; i++) G.floatText(G.player.x + (i % 6) * 24 - 60, G.player.y - 24 - Math.floor(i / 6) * 20, String(24 + i % 7), i % 5 === 0 ? '#ffd24a' : '#f0e6c8', i % 5 === 0);
    const outlinedText = ctx.outlinedText;
    ctx.outlinedText = null;
    const legacyDraw = q(() => R.draw(ctx, G), 120);
    const legacyStats = { drawCalls: ctx.stats.drawCalls, quads: ctx.stats.quads, effects: K.E.effects.length };
    const legacyFrame = ctx.canvas.toDataURL('image/png');
    ctx.outlinedText = outlinedText;
    const draw = q(() => R.draw(ctx, G), 120);
    const drawStats = { drawCalls: ctx.stats.drawCalls, quads: ctx.stats.quads, effects: K.E.effects.length };
    const outlinedFrame = ctx.canvas.toDataURL('image/png');
    return new Promise((resolve) => {
      let n = 0;
      const t0 = performance.now();
      function tick() { if (++n >= 240) resolve({ update, draw, raf: +((performance.now() - t0) / n).toFixed(3) }); else requestAnimationFrame(tick); }
      requestAnimationFrame(tick);
    }).then((r) => ({
      enemies: K.E.enemies.length, projectiles: K.E.projectiles.length,
      particles: G.particles.list.length, effects: drawStats.effects,
      update, legacyDraw, legacyDrawCallsPerFrame: legacyStats.drawCalls, legacyQuadsPerFrame: legacyStats.quads,
      draw, outlinedDrawCallsPerFrame: drawStats.drawCalls, outlinedQuadsPerFrame: drawStats.quads,
      frames: { legacy: legacyFrame, outlined: outlinedFrame }, rafMsPerFrame: r.raf
    }));
  });
  if (process.argv[2] && result.frames) {
    const outputDir = path.resolve(process.argv[2]);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'legacy-text.png'), Buffer.from(result.frames.legacy.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(outputDir, 'outlined-text.png'), Buffer.from(result.frames.outlined.split(',')[1], 'base64'));
    delete result.frames;
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
