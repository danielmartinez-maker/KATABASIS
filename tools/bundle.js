/* ============================================================
   KATABASIS — single-file bundler.
   Inlines css/style.css, all js modules and generated images into one
   self-contained .html that runs from anywhere, offline, with
   no siblings and no server.

   Order matters: this list must match index.html.
   Run:  node tools/bundle.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { once } = require('events');

const ROOT = path.resolve(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'katabasis.html');

const STYLES = ['css/style.css'];
const SCRIPTS = ['js/core.js', 'js/persistence.js', 'js/data.js', 'js/content-expansion.js', 'js/gear.js', 'js/paragon.js', 'js/run-systems.js', 'js/boon-expansion.js', 'js/asset-manifest.js', 'js/assets.js', 'js/entities.js', 'js/game.js', 'js/build-powers.js', 'js/render.js', 'js/main.js'];

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) throw new Error('missing: ' + rel);
  return fs.readFileSync(p, 'utf8');
}
function listAudioFiles() {
  const dir = path.join(ROOT, 'assets', 'audio');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => path.extname(name).toLowerCase() === '.mp3')
    .sort()
    .map(name => path.join('assets', 'audio', name));
}

function imageMime(rel) {
  const ext = path.extname(rel).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  throw new Error('unsupported image type: ' + rel);
}

/* Escape a closing tag so inlined code can never break out of its <script>. */
function safeScript(src) {
  return src.replace(/<\/script/gi, '<\\/script');
}
function safeStyle(src) {
  return src.replace(/<\/style/gi, '<\\/style');
}

/* Strip only whole-line comments and trailing whitespace. Deliberately
   conservative: no parsing, no renaming, nothing that could alter behaviour. */
function compact(src) {
  return src
    .split('\n')
    .map(l => l.replace(/\s+$/, ''))
    .filter(l => {
      const t = l.trim();
      if (t === '') return true;                       // keep blank lines for shape
      if (t.startsWith('//')) return false;            // whole-line JS comment
      if (/^\/\*+$/.test(t) || /^\*+\/?$/.test(t) || /^\*[^/]/.test(t)) return false; // block comment body
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

async function writeText(out, value) {
  if (!value) return;
  if (!out.write(value, 'utf8')) await once(out, 'drain');
}

async function writeBase64File(out, file) {
  let carry = Buffer.alloc(0);
  for await (const chunk of fs.createReadStream(file)) {
    const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    const completeLength = data.length - (data.length % 3);
    if (completeLength) await writeText(out, data.subarray(0, completeLength).toString('base64'));
    carry = Buffer.from(data.subarray(completeLength));
  }
  if (carry.length) await writeText(out, carry.toString('base64'));
}

async function writeDataMap(out, variable, items, prefixFor) {
  await writeText(out, '<script>window.' + variable + '={');
  let first = true;
  for (const item of items) {
    if (!first) await writeText(out, ',');
    first = false;
    const prefix = prefixFor(item);
    await writeText(out, JSON.stringify(item.id) + ':' + JSON.stringify(prefix).slice(0, -1));
    await writeBase64File(out, path.join(ROOT, item.rel));
    await writeText(out, '"');
  }
  await writeText(out, '};</script>');
}

async function writeInlineDocument(html, out, assetManifest, audioFiles) {
  let cursor = 0;
  for (const rel of SCRIPTS) {
    const tag = '<script src="' + rel + '"></script>';
    const index = html.indexOf(tag, cursor);
    if (index < 0) throw new Error('could not find script tag for ' + rel);
    await writeText(out, html.slice(cursor, index));
    if (rel === 'js/core.js') {
      const audioItems = audioFiles.map(file => ({ id:path.basename(file, path.extname(file)), rel:file }));
      await writeDataMap(out, 'KATABASIS_AUDIO_DATA', audioItems, () => 'data:audio/mpeg;base64,');
    }
    if (rel === 'js/assets.js') {
      const imageItems = Object.keys(assetManifest).sort().map(id => ({ id, rel:assetManifest[id].src }));
      await writeDataMap(out, 'KATABASIS_ASSET_DATA', imageItems, item => 'data:' + imageMime(item.rel) + ';base64,');
    }
    const inline = '<script>\n/* ===== ' + rel + ' ===== */\n' + safeScript(compact(read(rel))) + '\n</script>';
    await writeText(out, inline);
    cursor = index + tag.length;
  }
  await writeText(out, html.slice(cursor));
}

function atomicReplace(temp) {
  let backup = null;
  if (fs.existsSync(OUT)) {
    backup = OUT + '.previous-' + process.pid + '-' + Date.now();
    fs.renameSync(OUT, backup);
  }
  try {
    fs.renameSync(temp, OUT);
    if (backup) fs.unlinkSync(backup);
  } catch (error) {
    if (backup && !fs.existsSync(OUT)) fs.renameSync(backup, OUT);
    throw error;
  }
}

async function main() {
  let html = read('index.html');

  const assetManifest = JSON.parse(read('assets/manifest.json'));
  const audioFiles = listAudioFiles();

  /* ---- inline the stylesheet(s) ---- */
  STYLES.forEach(rel => {
    const css = read(rel);
    const tag = '<link rel="stylesheet" href="' + rel + '" />';
    const alt = '<link rel="stylesheet" href="' + rel + '"/>';
    if (html.indexOf(tag) < 0 && html.indexOf(alt) < 0) {
      throw new Error('could not find stylesheet tag for ' + rel);
    }
    html = html.replace(tag, '<style>\n' + safeStyle(css) + '\n</style>')
      .replace(alt, '<style>\n' + safeStyle(css) + '\n</style>');
  });

  /* Validate the template after accounting for every external source tag. */
  let checkHtml = html;
  SCRIPTS.forEach(rel => {
    const tag = '<script src="' + rel + '"></script>';
    if (checkHtml.indexOf(tag) < 0) throw new Error('could not find script tag for ' + rel);
    checkHtml = checkHtml.replace(tag, '<script></script>');
  });
  STYLES.forEach(rel => {
    const tag = '<link rel="stylesheet" href="' + rel + '" />';
    const alt = '<link rel="stylesheet" href="' + rel + '"/>';
    checkHtml = checkHtml.replace(tag, '<style></style>').replace(alt, '<style></style>');
  });

  const favicon = assetManifest['ui.favicon'];
  if (!favicon) throw new Error('missing generated ui.favicon art');
  const faviconFile = path.join(ROOT, favicon.src);
  if (!fs.existsSync(faviconFile)) throw new Error('missing favicon source: ' + favicon.src);
  const faviconData = 'data:' + imageMime(favicon.src) + ';base64,' + fs.readFileSync(faviconFile).toString('base64');
  html = html.replace('<link rel="icon" href="' + favicon.src + '" />', '<link rel="icon" href="' + faviconData + '" />');
  checkHtml = checkHtml.replace('<link rel="icon" href="' + favicon.src + '" />', '<link rel="icon" href="data:checked" />');

  /* ---- verify nothing external is left ---- */
  const leftovers = [];
  const reSrc = /<script[^>]+src=/gi;
  const reLink = /<link[^>]+href="(?!data:)/gi;
  let m;
  while ((m = reSrc.exec(checkHtml))) leftovers.push(m[0]);
  while ((m = reLink.exec(checkHtml))) leftovers.push(m[0]);
  if (leftovers.length) {
    throw new Error('bundled file still references external files:\n  ' + leftovers.join('\n  '));
  }

  /* ---- a banner so the file explains itself ---- */
  const banner =
    '<!--\n' +
    '  KATABASIS (ΚΑΤΑΒΑΣΙΣ) — A roguelite set in Ancient Greece.\n' +
    '\n' +
    '  This is the SINGLE-FILE edition: all styles and scripts are inlined,\n' +
    '  so it runs from anywhere, offline, with no sibling files and no server.\n' +
    '  Just open it in a browser.\n' +
    '\n' +
    '  Built by tools/bundle.js from index.html + css/ + js/.\n' +
    '  Edit the source files, not this one.\n' +
    '  Generated: ' + new Date().toISOString() + '\n' +
    '-->\n';
  html = html.replace(/^<!DOCTYPE html>\s*/i, b => banner + b);

  const temp = OUT + '.tmp-' + process.pid + '-' + Date.now();
  const out = fs.createWriteStream(temp, { flags:'wx' });
  try {
    await writeInlineDocument(html, out, assetManifest, audioFiles);
    out.end();
    await once(out, 'finish');
    atomicReplace(temp);
  } catch (error) {
    out.destroy();
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
    throw error;
  }
  const sourceFiles = STYLES.concat(SCRIPTS).concat(['assets/manifest.json']).concat(audioFiles);
  const src = sourceFiles.reduce((a, r) => a + fs.statSync(path.join(ROOT, r)).size, 0) +
    Object.keys(assetManifest).reduce((a, id) => a + fs.statSync(path.join(ROOT, assetManifest[id].src)).size, 0);
  const outSize = fs.statSync(OUT).size;
  const coverageFile = path.join(ROOT, 'assets', 'animation-coverage.json');
  const coverage = fs.existsSync(coverageFile) ? JSON.parse(fs.readFileSync(coverageFile, 'utf8')) : null;
  console.log('bundled -> ' + path.relative(ROOT, OUT));
  console.log('  source ' + (src / 1024).toFixed(1) + ' KB  ->  single file ' + (outSize / 1024).toFixed(1) + ' KB');
  console.log('  embedded images: ' + Object.keys(assetManifest).length + '  audio tracks: ' + audioFiles.length);
  if (coverage) {
    console.log('  authored animation frames: ' + coverage.registeredFrames + ' / ' + coverage.requiredFrames + ' registered; ' + coverage.missingFrames + ' missing');
    console.log('  complete enemy visual libraries: ' + coverage.completeVisuals + ' / ' + coverage.visualCount);
  }
  console.log('  external references remaining: 0');
}

main().catch(e => { console.error('BUNDLE FAILED: ' + e.message); process.exit(1); });
