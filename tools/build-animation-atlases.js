/*
 * Register ImageGen-authored enemy animation sheets without altering pixels.
 * Each sheet's JSON sidecar records its grid, playback rate, and visual review.
 * Run: node tools/build-animation-atlases.js [--pack]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const CLIPS = [
  'idle-breath', 'idle-turn', 'idle-threat', 'patrol', 'stalk', 'walk', 'run', 'strafe', 'retreat',
  'quick-windup', 'quick-strike', 'combo', 'heavy-windup', 'heavy-strike', 'lunge', 'charge', 'leap',
  'land-recover', 'cast-windup', 'cast-release', 'summon', 'guard', 'dodge', 'stagger', 'death'
];
const MIN_FRAME_EDGE = 256;
const EXPECTED_COLS = 5;
const EXPECTED_ROWS = 4;
const SHEET_ROOT = path.join(ROOT, 'assets', 'actors', 'enemy-animation-atlases');

function readJson(file) { return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^\uFEFF/, '')); }
function writeJson(file, data) { fs.writeFileSync(path.join(ROOT, file), JSON.stringify(data, null, 2) + '\n'); }

function loadGameData() {
  const context = { window: { K: {} }, console };
  vm.createContext(context);
  ['js/data.js', 'js/content-expansion.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  });
  return context.window.K.DATA;
}

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}
function resolveAssetKey(visualKey, manifest) {
  const candidates = ['actor.enemy.', 'actor.ally.', 'actor.boss.'].map(prefix => prefix + visualKey);
  return candidates.find(id => manifest[id]) || null;
}

function collectVisuals(data, manifest) {
  const visuals = new Map();
  function add(kind, id, def) {
    const visualKey = def.visualKey || def.sourceId || id;
    const assetKey = resolveAssetKey(visualKey, manifest);
    const sourceCell = def.catalogCreature ? Number(def.visualCell || 0) : null;
    const identity = assetKey + (sourceCell === null ? '' : '#cell-' + sourceCell);
    let visual = visuals.get(identity);
    if (!visual) {
      visual = {
        visualId: safeId(assetKey) + (sourceCell === null ? '' : '-cell-' + String(sourceCell).padStart(3, '0')),
        identity, assetKey, sourceCell, sourceSrc: assetKey ? manifest[assetKey].src : null,
        kinds: [], names: [], memberIds: []
      };
      visuals.set(identity, visual);
    }
    if (!assetKey) visual.unresolvedVisualKey = visualKey;
    if (!visual.kinds.includes(kind)) visual.kinds.push(kind);
    if (def.name && !visual.names.includes(def.name)) visual.names.push(def.name);
    if (!visual.memberIds.includes(id)) visual.memberIds.push(id);
  }
  Object.keys(data.ENEMIES || {}).forEach(id => add(data.ENEMIES[id].ally ? 'ally' : 'enemy', id, data.ENEMIES[id]));
  Object.keys(data.BOSSES || {}).forEach(id => add('boss', id, data.BOSSES[id]));
  return Array.from(visuals.values()).sort((a, b) => a.visualId.localeCompare(b.visualId));
}

function sheetPath(visualId, clipId) { return path.join(SHEET_ROOT, visualId, clipId + '.png'); }
function sheetRelPath(visualId, clipId) {
  return path.join('assets', 'actors', 'enemy-animation-atlases', visualId, clipId + '.png').replace(/\\/g, '/');
}
function sidecarPath(visualId, clipId) { return path.join(SHEET_ROOT, visualId, clipId + '.json'); }
function animationId(visualId, clipId) { return 'actor.animation.' + visualId + '.' + clipId; }
function sameRects(a, b) {
  return Array.isArray(a) && a.length === b.length && a.every((r, i) =>
    r.x === b[i].x && r.y === b[i].y && r.w === b[i].w && r.h === b[i].h);
}
function frameRects(width, height, cols, rows) {
  const rects = [];
  for (let row = 0; row < rows; row++) {
    const y0 = Math.round(row * height / rows), y1 = Math.round((row + 1) * height / rows);
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round(col * width / cols), x1 = Math.round((col + 1) * width / cols);
      rects.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return rects;
}
function rangesOf(values) {
  if (!values.length) return [];
  const ranges = [];
  let start = values[0], end = start;
  for (let i = 1; i < values.length; i++) {
    if (values[i] === end + 1) end = values[i];
    else { ranges.push({ start, end }); start = end = values[i]; }
  }
  ranges.push({ start, end });
  return ranges;
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function decodePng(file) {
  const src = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!src.subarray(0, 8).equals(signature)) throw new Error('not a PNG: ' + file);
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const compressed = [];
  for (let pos = 8; pos + 12 <= src.length;) {
    const size = src.readUInt32BE(pos), type = src.toString('ascii', pos + 4, pos + 8);
    const body = src.subarray(pos + 8, pos + 8 + size);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      bitDepth = body[8]; colorType = body[9]; interlace = body[12];
    } else if (type === 'IDAT') compressed.push(body);
    else if (type === 'IEND') break;
    pos += size + 12;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2) || interlace !== 0) {
    throw new Error('animation sheets must be non-interlaced 8-bit RGB/RGBA PNG: ' + file);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const packed = zlib.inflateSync(Buffer.concat(compressed));
  const stride = width * bpp, decoded = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const inRow = y * (stride + 1), filter = packed[inRow], outRow = y * stride;
    for (let x = 0; x < stride; x++) {
      const raw = packed[inRow + 1 + x], left = x >= bpp ? decoded[outRow + x - bpp] : 0;
      const up = y ? decoded[outRow + x - stride] : 0;
      const upLeft = y && x >= bpp ? decoded[outRow + x - stride - bpp] : 0;
      let value;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paeth(left, up, upLeft);
      else throw new Error('unsupported PNG row filter ' + filter + ': ' + file);
      decoded[outRow + x] = value & 255;
    }
  }
  let hasTransparency = false;
  if (bpp === 4) {
    for (let i = 3; i < decoded.length; i += 4) if (decoded[i] < 255) { hasTransparency = true; break; }
  }
  return { width, height, bitDepth, colorType, interlace, hasTransparency };
}

function readSheet(visualId, clipId) {
  const file = sheetPath(visualId, clipId);
  if (!fs.existsSync(file)) return { exists: false };
  try {
    const png = decodePng(file);
    const metaFile = sidecarPath(visualId, clipId);
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8').replace(/^\uFEFF/, '')) : {};
    const cols = Math.floor(Number(meta.cols) || EXPECTED_COLS), rows = Math.floor(Number(meta.rows) || EXPECTED_ROWS);
    const rects = frameRects(png.width, png.height, cols, rows);
    const minFrameWidth = Math.min(...rects.map(rect => rect.w));
    const minFrameHeight = Math.min(...rects.map(rect => rect.h));
    const frameWidth = png.width / cols, frameHeight = png.height / rows;
    const frameCount = cols * rows, capacity = Math.floor(png.width / MIN_FRAME_EDGE) * Math.floor(png.height / MIN_FRAME_EDGE);
    const errors = [];
    if (cols < 1 || rows < 1 || frameCount < 1) errors.push('invalid grid');
    if (minFrameWidth < MIN_FRAME_EDGE || minFrameHeight < MIN_FRAME_EDGE) errors.push('frame below ' + MIN_FRAME_EDGE + ' px quality floor');
    if (frameCount < capacity) errors.push('grid uses ' + frameCount + ' frames but sheet can hold ' + capacity + ' at the quality floor');
    if (png.colorType !== 6 || !png.hasTransparency) errors.push('PNG does not contain a transparent alpha background');
    if (!meta.reviewed) errors.push('sheet has not been visually reviewed');
    return {
      exists: true, file, src: sheetRelPath(visualId, clipId), meta,
      width: png.width, height: png.height, cols, rows, frameCount, capacity, frameRects: rects,
      minFrameWidth, minFrameHeight, frameWidth, frameHeight, fps: Math.max(1, Number(meta.fps) || 12), hasTransparency: png.hasTransparency,
      errors, valid: errors.length === 0
    };
  } catch (error) {
    return { exists: true, file, errors: [error.message], valid: false, frameCount: 0, capacity: EXPECTED_COLS * EXPECTED_ROWS };
  }
}

function scan(data, manifest) {
  const visuals = collectVisuals(data, manifest), clips = [];
  let requiredFrames = 0, generatedFrames = 0, registeredFrames = 0, completeClips = 0;
  for (const visual of visuals) for (const clipId of CLIPS) {
    const sheet = readSheet(visual.visualId, clipId);
    const required = sheet.exists ? (sheet.capacity || EXPECTED_COLS * EXPECTED_ROWS) : EXPECTED_COLS * EXPECTED_ROWS;
    const generated = sheet.exists && sheet.valid ? sheet.frameCount : 0;
    const entry = manifest[animationId(visual.visualId, clipId)];
    const registered = !!(sheet.valid && entry && entry.src === sheet.src && entry.frames === sheet.frameCount && entry.cols === sheet.cols && entry.rows === sheet.rows && sameRects(entry.frameRects, sheet.frameRects));
    const packed = registered ? sheet.frameCount : 0;
    requiredFrames += required; generatedFrames += generated; registeredFrames += packed;
    if (registered && generated === required) completeClips++;
    const missing = Array.from({ length: Math.max(0, required - generated) }, (_, i) => generated + i);
    clips.push({
      visualId: visual.visualId, visualIdentity: visual.identity, assetKey: visual.assetKey,
      sourceCell: visual.sourceCell, clipId, source: sheet.exists ? sheet.src : null,
      width: sheet.width || null, height: sheet.height || null, cols: sheet.cols || 0, rows: sheet.rows || 0,
      frameWidth: sheet.frameWidth || null, frameHeight: sheet.frameHeight || null,
      minimumFrameWidth: sheet.minFrameWidth || null, minimumFrameHeight: sheet.minFrameHeight || null,
      required, generated, packed, fps: sheet.fps || null, reviewed: !!(sheet.meta && sheet.meta.reviewed),
      errors: sheet.errors || [], missingRanges: rangesOf(missing),
      status: registered && generated === required ? 'complete' : registered ? 'registered-partial' : generated ? 'ready-to-register' : sheet.exists ? 'invalid-sheet' : 'missing'
    });
  }
  const completedClipsByVisual = new Map();
  clips.forEach(clip => {
    if (clip.status === 'complete') completedClipsByVisual.set(clip.visualId, (completedClipsByVisual.get(clip.visualId) || 0) + 1);
  });
  const completeVisuals = visuals.filter(visual => completedClipsByVisual.get(visual.visualId) === CLIPS.length).length;
  return {
    version: 2, generatedAt: new Date().toISOString(), visualCount: visuals.length,
    clipIds: CLIPS, minFrameEdgePx: MIN_FRAME_EDGE, expectedFramesPerMissingSheet: EXPECTED_COLS * EXPECTED_ROWS,
    requiredFrames, generatedFrames, registeredFrames, missingFrames: Math.max(0, requiredFrames - generatedFrames),
    requiredClips: visuals.length * CLIPS.length, completeClips, completeVisuals,
    missingVisuals: visuals.filter(v => !v.assetKey).map(v => ({ visualId: v.visualId, names: v.names, members: v.memberIds, visualKey: v.unresolvedVisualKey })),
    visuals, clips
  };
}

function writeManifest(manifest) {
  writeJson('assets/manifest.json', manifest);
  fs.writeFileSync(path.join(ROOT, 'js', 'asset-manifest.js'), 'window.KATABASIS_ASSET_MANIFEST = ' + JSON.stringify(manifest) + ';\n');
}

function registerSheets(data, manifest) {
  let registered = 0;
  const currentIds = new Set();
  for (const visual of collectVisuals(data, manifest)) for (const clipId of CLIPS) currentIds.add(animationId(visual.visualId, clipId));
  let removed = 0;
  for (const id of Object.keys(manifest)) {
    if (manifest[id] && manifest[id].kind === 'enemy-animation' && !currentIds.has(id)) { delete manifest[id]; removed++; }
  }
  for (const visual of collectVisuals(data, manifest)) for (const clipId of CLIPS) {
    const sheet = readSheet(visual.visualId, clipId);
    const id = animationId(visual.visualId, clipId);
    if (!sheet.valid) { if (manifest[id]) { delete manifest[id]; removed++; } continue; }
    manifest[id] = {
      src: sheet.src, cols: sheet.cols, rows: sheet.rows, frames: sheet.frameCount, fps: sheet.fps,
      kind: 'enemy-animation', lazy: true, visualIdentity: visual.identity, clipId,
      frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight, sourceWidth: sheet.width, sourceHeight: sheet.height,
      frameRects: sheet.frameRects
    };
    registered++;
  }
  return { registered, removed };
}

function main() {
  const data = loadGameData(), manifest = readJson('assets/manifest.json');
  if (process.argv.includes('--pack')) {
    const result = registerSheets(data, manifest);
    if (result.registered || result.removed) writeManifest(manifest);
    console.log('registered original ImageGen sheets without resampling: ' + result.registered + '; removed stale entries: ' + result.removed);
  }
  const visuals = collectVisuals(data, manifest), coverage = scan(data, manifest);
  const worklist = {
    version: 2, clips: CLIPS, minFrameEdgePx: MIN_FRAME_EDGE,
    expectedFramesPerMissingSheet: EXPECTED_COLS * EXPECTED_ROWS,
    frameCountRule: 'maximum regular grid for each source image at measured dimensions, with every integer-pixel frame at least 256x256 source pixels',
    visualIdentityRule: 'resolved asset key plus source cell for catalog atlas cells',
    visuals, sheets: coverage.clips.map(c => ({ visualId: c.visualId, visualIdentity: c.visualIdentity, clipId: c.clipId, src: c.source, cols: c.cols, rows: c.rows, frames: c.generated, status: c.status }))
  };
  writeJson('assets/animation-worklist.json', worklist);
  writeJson('assets/animation-coverage.json', coverage);
  console.log('enemy/boss/ally visual identities: ' + coverage.visualCount);
  console.log('required authored frames: ' + coverage.requiredFrames);
  console.log('generated reviewed frames present: ' + coverage.generatedFrames);
  console.log('registered image frames: ' + coverage.registeredFrames + ' / ' + coverage.requiredFrames);
  console.log('missing frames: ' + coverage.missingFrames);
  console.log('complete clips: ' + coverage.completeClips + ' / ' + coverage.requiredClips);
  console.log('complete visual libraries: ' + coverage.completeVisuals + ' / ' + coverage.visualCount);
  if (coverage.missingVisuals.length) console.log('unresolved source visuals: ' + coverage.missingVisuals.length);
}

try { main(); } catch (err) { console.error('ANIMATION SHEET BUILD FAILED: ' + err.stack); process.exitCode = 1; }
