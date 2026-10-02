(function () {
  'use strict';
  const K = window.K;
  const A = {};
  const cache = Object.create(null);
  const pending = Object.create(null);
  const failed = Object.create(null);
  const urls = Object.create(null);
  let loaded = false;
  let loadPromise = null;
  function cssAssetClass(id) { return 'art-' + String(id).replace(/[^a-zA-Z0-9_-]/g, '-'); }
  /* Some engines leave decode() pending forever for detached images. The bitmap is
     already in memory once onload fires, so fall through after a grace period
     instead of freezing the loading screen. */
  const DECODE_GRACE_MS = 2500;
  function decodeImage(img) {
    return Promise.resolve().then(() => {
      if (typeof img.decode !== 'function') return undefined;
      /* Test harnesses and paranoia: without timers, trust decode() as before. */
      if (typeof setTimeout !== 'function' || typeof clearTimeout !== 'function') return img.decode();
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => { if (!settled) { settled = true; resolve(); } }, DECODE_GRACE_MS);
        img.decode().then(
          () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } },
          (error) => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } }
        );
      });
    });
  }

  function manifest() { return window.KATABASIS_ASSET_MANIFEST || {}; }
  function getImage(id) {
    if (cache[id]) return cache[id];
    const entry = manifest()[id];
    if (!entry || !entry.lazy || pending[id] || failed[id]) return null;
    const img = new Image();
    const src = sourceFor(id);
    pending[id] = img;
    img.onload = function () {
      decodeImage(img).then(() => { cache[id] = img; urls[id] = src; delete pending[id]; }, () => { failed[id] = true; delete pending[id]; });
    };
    img.onerror = function () { failed[id] = true; delete pending[id]; };
    img.src = src;
    return null;
  }
  function sourceFor(id) {
    const entry = manifest()[id];
    if (!entry) throw new Error('Unknown Katabasis image asset: ' + id);
    const bundled = window.KATABASIS_ASSET_DATA && window.KATABASIS_ASSET_DATA[id];
    return bundled || entry.src;
  }

  A.load = function (onProgress) {
    if (loaded) return Promise.resolve(A);
    if (loadPromise) return loadPromise;
    const all = Object.keys(manifest()).filter(id => !manifest()[id].lazy);
    let done = 0;
    loadPromise = Promise.all(all.map(id => new Promise((resolve, reject) => {
      const img = new Image();
      const src = sourceFor(id);
      img.onload = function () {
        decodeImage(img).then(() => {
          cache[id] = img;
          urls[id] = src;
          done++;
          if (onProgress) onProgress(done, all.length, id);
          resolve();
        }, reject);
      };
      img.onerror = function () { reject(new Error('Could not load generated image: ' + id + ' (' + src + ')')); };
      img.src = src;
    }))).then(() => {
      loaded = true;
      A.setCssArt();
      return A;
    }).catch(err => {
      loadPromise = null;
      const box = document.getElementById('asset-loading');
      if (box) {
        box.classList.add('asset-error');
        box.textContent = 'Katabasis could not load its image art. ' + err.message;
      }
      throw err;
    });
    return loadPromise;
  };

  A.ready = function () { return loaded; };
  A.url = function (id) {
    const src = urls[id] || sourceFor(id);
    if (/^(?:data:|blob:|https?:)/i.test(src) || typeof URL !== 'function' || !document.baseURI) return src;
    return new URL(src, document.baseURI).href;
  };
  A.entry = function (id) { return manifest()[id] || null; };
  A.image = function (id) { return getImage(id); };
  A.enemyAnimationKey = function (sourceId, sourceCell, clipId) {
    const visualId = String(sourceId).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
    const cellSuffix = sourceCell === null || sourceCell === undefined ? '' : '-cell-' + String(Math.max(0, Math.floor(sourceCell))).padStart(3, '0');
    return 'actor.animation.' + visualId + cellSuffix + '.' + clipId;
  };
  A.drawEnemyClip = function (ctx, sourceId, sourceCell, clipId, elapsed, loop, x, y, w, h, opt) {
    const id = A.enemyAnimationKey(sourceId, sourceCell, clipId);
    const entry = manifest()[id];
    if (!entry) return false;
    const cols = entry.cols || 1, rows = entry.rows || 1;
    const frames = entry.frames || cols * rows, fps = entry.fps || 12;
    if (frames < 1 || frames > cols * rows) return false;
    const t = Math.max(0, Number(elapsed) || 0);
    const frame = loop ? Math.floor(t * fps) % frames : Math.min(frames - 1, Math.floor(t * fps));
    return A.drawFrame(ctx, id, frame, x, y, w, h, opt);
  };
  A.cellAspect = function (id) {
    const im = getImage(id), e = manifest()[id];
    if (!e) return 1;
    if (!im || !im.naturalHeight) return e.aspect || 1;
    return (im.naturalWidth / (e.cols || 1)) / (im.naturalHeight / (e.rows || 1));
  };

  A.drawFrame = function (ctx, id, frame, x, y, w, h, opt) {
    const im = getImage(id), e = manifest()[id];
    if (!im || !e) return false;
    const cols = e.cols || 1, rows = e.rows || 1;
    const total = cols * rows;
    const n = ((Math.floor(frame || 0) % total) + total) % total;
    const rect = e.frameRects && e.frameRects[n];
    if (rect && rect.w > 0 && rect.h > 0) {
      const o = opt || {};
      if(!o.rot && !o.flipX){
        const prev=ctx.globalAlpha;ctx.globalAlpha*=o.alpha === undefined ? 1 : o.alpha;
        ctx.drawImage(im, rect.x, rect.y, rect.w, rect.h, x-w / 2, y-h / 2, w, h);
        ctx.globalAlpha=prev;return true;
      }
      ctx.save();
      ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
      ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      if (o.flipX) ctx.scale(-1, 1);
      ctx.drawImage(im, rect.x, rect.y, rect.w, rect.h, -w / 2, -h / 2, w, h);
      ctx.restore();
      return true;
    }
    return A.drawCell(ctx, id, n % cols, Math.floor(n / cols), x, y, w, h, opt);
  };

  A.drawCell = function (ctx, id, col, row, x, y, w, h, opt) {
    const im = getImage(id), e = manifest()[id];
    if (!im || !e) return false;
    const cols = e.cols || 1, rows = e.rows || 1;
    const sw = im.naturalWidth / cols, sh = im.naturalHeight / rows;
    const cx = Math.max(0, Math.min(cols - 1, col || 0));
    const cy = Math.max(0, Math.min(rows - 1, row || 0));
    const o = opt || {};
    if(!o.rot && !o.flipX){
      const prev=ctx.globalAlpha;ctx.globalAlpha*=o.alpha === undefined ? 1 : o.alpha;
      ctx.drawImage(im, cx * sw, cy * sh, sw, sh, x-w / 2, y-h / 2, w, h);
      ctx.globalAlpha=prev;return true;
    }
    ctx.save();
    ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flipX) ctx.scale(-1, 1);
    ctx.drawImage(im, cx * sw, cy * sh, sw, sh, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  };

  A.drawRow = function (ctx, id, row, elapsed, fps, x, y, w, h, opt) {
    const e = manifest()[id];
    if (!e) return false;
    const cols = e.cols || 1;
    const frame = Math.floor(Math.max(0, elapsed || 0) * (fps || 8)) % cols;
    return A.drawCell(ctx, id, frame, Math.max(0, Math.min((e.rows || 1) - 1, row || 0)), x, y, w, h, opt);
  };

  A.drawCover = function (ctx, id, x, y, w, h, opt) {
    const im = getImage(id);
    if (!im) return false;
    const ratio = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const sw = w / ratio, sh = h / ratio;
    const sx = (im.naturalWidth - sw) / 2, sy = (im.naturalHeight - sh) / 2;
    const alpha=opt && opt.alpha !== undefined ? opt.alpha : 1;
    if(alpha===1){ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);return true;}
    const prev=ctx.globalAlpha;ctx.globalAlpha*=alpha;
    ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
    ctx.globalAlpha=prev;
    return true;
  };

  A.drawImage = function (ctx, id, x, y, w, h, opt) {
    const im = getImage(id);
    if (!im) return false;
    const alpha=opt && opt.alpha !== undefined ? opt.alpha : 1;
    if(alpha===1){ctx.drawImage(im, x, y, w, h);return true;}
    const prev=ctx.globalAlpha;ctx.globalAlpha*=alpha;
    ctx.drawImage(im, x, y, w, h);
    ctx.globalAlpha=prev;
    return true;
  };

  const gods = ['zeus','poseidon','athena','ares','aphrodite','artemis','dionysus','hephaestus','hermes','demeter','hades','chaos'];
  const relics = ['r_lyre','r_fleece','r_sandal','r_apple','r_aegis','r_pom','r_key','r_hammer','r_fang','r_mirror','r_torch','r_dice','r_wreath','r_anvil','r_ambrosia','r_thread','r_hydra_heart','r_sunwheel','r_icarian_spurs','r_orpheus_lyre','r_aegis_memory','r_atlas_anvil'];
  const specialRelics = {
    r_owl: { id: 'ui.gods', cell: 2 },
    r_coin: { id: 'ui.icons', cell: 0 },
    r_pelt: { id: 'actor.boss.lion', cell: 0 }
  };
  const glyphCell = {
    '⚡':12,'🔱':5,'🦉':6,'🗡':4,'❤':1,'🏹':7,'🍇':8,'🔨':9,'🪽':10,'🌾':11,'💀':3,'🌀':15,
    '☁':12,'🛉':2,'🎯':7,'🐍':13,'🩸':3,'🪶':10,'🐕':3,'💠':15,'💧':13,'🐐':10,'🐂':4,
    '👁':6,'⚙':9,'🔧':9,'🦇':3,'✋':2,'🪨':9,'⚔':4,'🎵':8,'🐏':10,'🍎':1,'🛡':2,'🗝':12,
    '🔥':14,'🎲':0,'🌿':11,'⚒':9,'🏺':13,'✨':14,'◉':0,'💨':10,'⚱':13,'🌊':13,'🧵':15,
    '👻':3,'🦴':3,'⚠':15,'★':12
  };

  function godAsset(id) {
    const D = K.DATA || {}, g = D.GODS && D.GODS[id];
    if (g && manifest()['ui.deities']) return { id:'ui.deities', cell:g.portraitCell || 0 };
    return { id:'ui.gods', cell:g ? (g.portraitCell || 0) : Math.max(0, gods.indexOf(id)) };
  }

  function iconAsset(key) {
    const s = String(key || 'coin');
    if (s.indexOf('gear:') === 0) {
      const slot = ['weapon','helm','cuirass','bracers','waist','greaves'].indexOf(s.slice(5));
      if (slot >= 0) return { id:'ui.gear-paragon', cell:slot };
    }
    if (s.indexOf('branch:') === 0) {
      const branch = ['ares','athena','artemis','hermes','demeter','hades'].indexOf(s.slice(7));
      if (branch >= 0) return { id:'ui.gear-paragon', cell:6 + branch };
    }
    if (s.indexOf('gear-action:') === 0) {
      const action = ['equip','upgrade','sell','salvage'].indexOf(s.slice(12));
      if (action >= 0) return { id:'ui.gear-paragon', cell:12 + action };
    }
    if (s.indexOf('god:') === 0) return godAsset(s.slice(4));
    if (s.indexOf('enemy:') === 0) { const raw = s.slice(6), D = K.DATA || {}, def = D.ENEMIES && D.ENEMIES[raw]; return { id: 'actor.enemy.' + (def && (def.visualKey || def.sourceId) || raw), cell: def && def.visualCell || 0 }; }
    if (s.indexOf('ally:') === 0) return { id: 'actor.ally.' + s.slice(5), cell: 0 };
    if (s.indexOf('boss:') === 0) { const raw = s.slice(5), D = K.DATA || {}, def = D.BOSSES && D.BOSSES[raw]; return { id: 'actor.boss.' + (def && (def.visualKey || def.sourceId) || raw), cell: 0 }; }
    if (s.indexOf('region:') === 0) { const parts = s.slice(7).split(':'), aliases = { acheron:'styx', lethe_garden:'mourning', knossos:'labyrinth', aeaea:'aegean', colchis:'aegean', typhon_core:'gigantomachy', delphi:'olympus_approach', pelion:'elysium', arcadia:'asphodel', thebes:'labyrinth', marathon:'gigantomachy', mycenae:'forge', ancient_greece:'elysium', atlantis:'aegean' }, id = 'region.' + (aliases[parts[0]] || parts[0]) + '.props'; if (manifest()[id]) { const cells = { combat:0, elite:5, treasure:9, shop:14, event:3, challenge:11, optionalboss:2, boss:6 }; return { id, cell: cells[parts[1]] === undefined ? 0 : cells[parts[1]] }; } }
    if (s.indexOf('relic:') === 0) {
      const relicId = s.slice(6);
      const D = K.DATA || {}, def = D.relicById && D.relicById[relicId];
      const familyId = def && def.sourceId || relicId;
      const special = specialRelics[familyId];
      if (special) return special;
      const i = relics.indexOf(familyId);
      return { id: 'ui.relics', cell: i < 0 ? 0 : i };
    }
    if (s === 'coin' || s === 'obol') return { id: 'ui.icons', cell: 0 };
    if (s === 'life' || s === 'heart') return { id: 'ui.icons', cell: 1 };
    if (s === 'shield') return { id: 'ui.icons', cell: 2 };
    if (s === 'skull') return { id: 'ui.icons', cell: 3 };
    if (manifest()['actor.enemy.' + s]) return { id: 'actor.enemy.' + s, cell: 0 };
    if (manifest()['actor.boss.' + s]) return { id: 'actor.boss.' + s, cell: 0 };
    if (manifest()['ui.icons']) {
      const D = K.DATA || {};
      const godIds = Object.keys(D.GODS || {});
      const godId = godIds.find(id => D.GODS[id].icon === s);
      if (godId) return godAsset(godId);
      const firstSymbol = function (value) {
        if (!value) return '';
        const first = value.charCodeAt(0);
        return value.slice(0, first >= 0xd800 && first <= 0xdbff ? 2 : 1);
      };
      let combinedGod = null;
      if (s.indexOf('🌟') === 0) {
        const legendarySymbol = firstSymbol(s.slice('🌟'.length));
        combinedGod = godIds.find(id => D.GODS[id].icon === legendarySymbol);
      } else {
        const primarySymbol = firstSymbol(s);
        combinedGod = godIds.find(id => D.GODS[id].icon === primarySymbol);
      }
      if (combinedGod) return godAsset(combinedGod);
      const cell = glyphCell[firstSymbol(s)] === undefined ? 15 : glyphCell[firstSymbol(s)];
      return { id: 'ui.icons', cell };
    }
    return { id: 'ui.relics', cell: 0 };
  }

  A.drawIcon = function (ctx, key, x, y, size, opt) {
    const ref = iconAsset(key);
    const e = manifest()[ref.id];
    if (!e) return false;
    const cols = e.cols || 1, cell = ref.cell || 0;
    return A.drawCell(ctx, ref.id, cell % cols, Math.floor(cell / cols), x, y, size, size, opt);
  };

  A.iconHtml = function (key, cls, label) {
    if (K.Portraits && String(key).startsWith('god:')) return K.Portraits.html(String(key).slice(4),{surface:/tray|chip|pip/.test(cls||'')?'hud':'codex',className:cls||''});
    const ref = iconAsset(key);
    const e = manifest()[ref.id] || manifest()['ui.relics'];
    const id = manifest()[ref.id] ? ref.id : 'ui.relics';
    const cols = e.cols || 1, rows = e.rows || 1;
    const cell = Math.max(0, ref.cell || 0);
    const col = cell % cols, row = Math.floor(cell / cols);
    const bx = cols <= 1 ? 0 : col / (cols - 1) * 100;
    const by = rows <= 1 ? 0 : row / (rows - 1) * 100;
    const safeLabel = String(label || '').replace(/[&<>"']/g, '');
    return '<span class="art-icon ' + cssAssetClass(id) + ' ' + (cls || '') + '" role="img"' + (safeLabel ? ' aria-label="' + safeLabel + '"' : ' aria-hidden="true"') +
      ' style="background-size:' + (cols * 100) + '% ' + (rows * 100) + '%;background-position:' + bx + '% ' + by + '%"></span>';
  };

  A.iconStyle = function (key) {
    const ref = iconAsset(key), e = manifest()[ref.id] || manifest()['ui.icons'];
    const id = manifest()[ref.id] ? ref.id : 'ui.icons';
    const cols = e.cols || 1, rows = e.rows || 1, cell = ref.cell || 0;
    return 'background-image:url(\'' + A.url(id).replace(/'/g, '%27') + '\');background-size:' + (cols * 100) + '% ' + (rows * 100) + '%;background-position:' +
      (cols <= 1 ? 0 : cell % cols / (cols - 1) * 100) + '% ' + (rows <= 1 ? 0 : Math.floor(cell / cols) / (rows - 1) * 100) + '%';
  };

  A.setCssArt = function () {
    const root = document.documentElement;
    root.style.setProperty('--art-meander', 'url("' + A.url('ui.meander') + '")');
    root.style.setProperty('--art-rune', 'url("' + A.url('ui.icons') + '")');
    root.style.setProperty('--art-panel', 'url("' + A.url('ui.panel') + '")');
    let style = document.getElementById('katabasis-image-styles');
    if (!style) { style = document.createElement('style'); style.id = 'katabasis-image-styles'; document.head.appendChild(style); }
    style.textContent = Object.keys(manifest()).filter(id => !manifest()[id].lazy).map(id => '.' + cssAssetClass(id) + '{background-image:url("' + A.url(id) + '")}').join('\n');
  };

  K.Assets = A;
})();

