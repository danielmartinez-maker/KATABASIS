(function () {
  'use strict';
  const K = window.K;
  const A = K.Assets;
  const U = K.U;
  const D = K.DATA;
  const E = K.E;
  const R = {};
  K.R = R;
  R.rgba = function (color, alpha) {
    let hex = String(color || '#000000').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map(ch => ch + ch).join('');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return String(color || '#000000');
    const n = parseInt(hex, 16);
    const a = Math.max(0, Math.min(1, Number.isFinite(Number(alpha)) ? Number(alpha) : 1));
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  const bossOrder = ['lion', 'medusa', 'hydra', 'typhon'];
  const enemyOrder = Object.keys(D.ENEMIES || {});

  const projectileCell = {
    fireball: 0, magma: 0, water: 1, wail: 5, bolt: 2, skyfire: 2, spear: 3, blade: 3,
    poison: 4, curse: 5, hex: 14, arrow: 6, boulder: 13, rock: 13, spark: 2,
    dark: 10, frost: 8, coin: 9
  };
  const statusCell = {
    warn: 0, impact: 1, poison: 2, slow: 3, chill: 3, curse: 4, doom: 4, burn: 8,
    fire: 8, shield: 10, heal: 7, bleed: 11, root: 12, stun: 12, wind: 13,
    summon: 14, weaken: 4, mark: 9, petrified: 3
  };
  const relicCells = { r_lyre:0, r_fleece:1, r_sandal:2, r_apple:3, r_aegis:4, r_pom:5,
    r_key:6, r_hammer:7, r_fang:8, r_mirror:9, r_torch:10, r_dice:11, r_wreath:12,
    r_anvil:13, r_ambrosia:14, r_thread:15 };
  const godCells = { zeus:0, poseidon:1, athena:2, ares:3, aphrodite:4, artemis:5,
    dionysus:6, hephaestus:7, hermes:8, demeter:9, hades:10, chaos:11 };
  let decorKey = '';
  let decor = [];

  function regionId(G) {
    const r = G.run && typeof G.region === 'function' ? G.region() : D.REGIONS[0];
    return r && r.id ? r.id : 'tartarus';
  }
  function regionArtId(rid) {
    const aliases = { acheron:'styx', lethe_garden:'mourning', knossos:'labyrinth', aeaea:'aegean',
      colchis:'aegean', typhon_core:'gigantomachy', delphi:'olympus_approach', pelion:'elysium', arcadia:'asphodel', thebes:'labyrinth', marathon:'gigantomachy', mycenae:'forge' };
    return aliases[rid] || rid;
  }
  function dimFor(ent) {
    const family = ent.visualKey || ent.familyId || ent.id;
    const heroId=ent.isPlayer&&(ent.heroId||G.run&&G.run.heroId);
    const heroArt=heroId&&'actor.player.'+heroId;
    const id = ent.isPlayer ? (heroArt&&A.entry(heroArt)?heroArt:'actor.player') : (ent.isBoss ? 'actor.boss.' + family : (ent.ally ? 'actor.ally.' + family : 'actor.enemy.' + family));
    const e = A.entry(id);
    let h = Math.max(38, (ent.radius || 14) * (ent.isBoss ? 5.4 : 4.6));
    h *= ent.isPlayer ? 1.34 : (ent.isBoss || ent.elite ? 1.2 : 1.32);
    if (ent.scaleElite) h *= ent.scaleElite;
    return { id, h, w: h * A.cellAspect(id) };
  }

  function actorRow(ent, sheet) {
    const rows = sheet && sheet.rows || 4;
    if (ent.dead) return rows >= 6 ? 5 : Math.max(0, rows - 1);
    if (ent.hurtFlash > 0.05) return rows >= 6 ? 4 : (rows >= 5 ? 4 : 0);
    if (ent.isPlayer) {
      if (ent.dashing > 0 || ent.rushT > 0) return Math.min(1, rows - 1);
      if (ent.attackAnim > 0) return rows >= 6 ? (ent.attackAnim > 0.55 ? 2 : 3) : 2;
      if (ent.ascendT > 0) return Math.min(rows >= 6 ? 3 : 2, rows - 1);
      if (Math.hypot(ent.vx || 0, ent.vy || 0) > 38) return Math.min(1, rows - 1);
      return 0;
    }
    if (rows >= 6 && ['gaze','cast','summon','windup','telegraph','prepare'].indexOf(ent.state) >= 0) return 2;
    if (rows >= 6 && ['attack','lunge','charge','slam','strike','sweep','burst','swipe','pounce','spit','snakes','petrifyShot','heads','venomPool','bite','firestorm','stormbolts','quake'].indexOf(ent.state) >= 0) return 3;
    if (rows >= 6 && ent.state && ent.state.indexOf('sig_') === 0) return ent.stateT < 0.52 ? 2 : 3;
    if (rows >= 6 && ent.state === 'transition') return 2;
    if (rows >= 5 && (ent.state === 'gaze' || ent.state === 'cast' || ent.state === 'summon')) return Math.min(3, rows - 1);
    if (ent.state && ent.state !== 'idle' && ent.state !== 'move' && ent.state !== 'stagger') return Math.min(2, rows - 1);
    if (Math.hypot(ent.vx || 0, ent.vy || 0) > 32) return Math.min(1, rows - 1);
    return 0;
  }

  function enemyClip(ent, G) {
    const state = String(ent.state || 'idle').toLowerCase();
    if (ent.dead) return { id:'death', time:(ent.deathT || 0) * (ent.isBoss ? 1 : 3.55), loop:false };
    if (ent.hurtFlash > 0.05 || state === 'stagger' || state === 'hurt') return { id:'stagger', time:ent.stateT || 0, loop:false };
    if (ent.guardT > 0 || /^(guard|block|brace)$/.test(state)) return { id:'guard', time:ent.stateT || 0, loop:true };
    if (/dodge|evade|roll/.test(state)) return { id:'dodge', time:ent.stateT || 0, loop:false };
    if (/summon|raise/.test(state)) return { id:'summon', time:ent.stateT || 0, loop:false };
    if (/charge/.test(state)) return { id:ent.stateT < 0.38 ? 'heavy-windup' : 'charge', time:ent.stateT || 0, loop:false };
    if (/leap|pounce/.test(state)) return { id:ent.stateT < 0.3 ? 'lunge' : 'leap', time:ent.stateT || 0, loop:false };
    if (/cast|gaze|spit|petrify|firestorm|stormbolt|venom|snakes/.test(state)) {
      return { id:ent.stateT < 0.36 ? 'cast-windup' : 'cast-release', time:ent.stateT || 0, loop:false };
    }
    if (/telegraph|prepare|windup/.test(state)) {
      return { id:/slam|quake|heavy|sweep|burst|heads/.test(state) ? 'heavy-windup' : 'quick-windup', time:ent.stateT || 0, loop:false };
    }
    if (/slam|quake|heavy|sweep|burst|heads/.test(state)) {
      return { id:ent.stateT < 0.3 ? 'heavy-windup' : 'heavy-strike', time:ent.stateT || 0, loop:false };
    }
    if (/attack|strike|swipe|bite|lunge|sig_/.test(state)) {
      return { id:ent.stateT > 0.5 ? 'combo' : 'quick-strike', time:ent.stateT || 0, loop:false };
    }
    const speed = Math.hypot(ent.vx || 0, ent.vy || 0);
    if (speed > 24) {
      const player = G && G.player;
      if (player && (ent.vx || 0) * (player.x - ent.x) + (ent.vy || 0) * (player.y - ent.y) < -30) return { id:'retreat', time:ent.anim || 0, loop:true };
      if (/range|kite|skirmish/.test(String(ent.ai || ''))) return { id:'strafe', time:ent.anim || 0, loop:true };
      if (/ambush|stalk|assassin/.test(String(ent.ai || ''))) return { id:'stalk', time:ent.anim || 0, loop:true };
      return { id:speed > 135 ? 'run' : 'walk', time:ent.anim || 0, loop:true };
    }
    if (ent.isElite || ent.isNemesis || ent.isBoss) return { id:'idle-threat', time:ent.anim || 0, loop:true };
    return { id:Math.floor((ent.anim || 0) / 4) % 3 === 1 ? 'idle-turn' : 'idle-breath', time:ent.anim || 0, loop:true };
  }

  function drawActor(ctx, G, ent) {
    const m = dimFor(ent), sheet = A.entry(m.id);
    if (!sheet) return;
    const row = actorRow(ent, sheet);
    const frame = Math.floor((ent.anim || G.realTime || 0) * (ent.dead ? 6 : 9)) % (sheet.cols || 4);
    const alpha = ent.dead ? Math.max(0.12, 1 - (ent.deathT || 0) * (ent.isBoss ? 0.35 : 1.25)) : 1;
    const face = ent.face !== undefined ? ent.face : ((ent.vx || 0) < 0 ? -1 : 1);
    const anchorY = ent.isBoss ? 0.82 : 0.84;
    if (ent.spawnT > 0) {
      A.drawCell(ctx, 'effects.divine', 1, Math.floor(G.realTime * 12) % 4, ent.x, ent.y, m.w * 1.3, m.h * 1.05,
        { alpha: Math.min(0.8, ent.spawnT / (ent.isBoss ? 1.1 : 0.45)) });
    }
    if (ent.isBoss && !ent.dead && ent.phase > 0) {
      const bossRow = bossOrder.indexOf(ent.familyId || ent.id);
      if (bossRow >= 0) {
        const phaseCell = bossRow * 4 + Math.min(3, ent.phase);
        A.drawCell(ctx, 'effects.status', phaseCell % 4, Math.floor(phaseCell / 4), ent.x, ent.y - m.h * 0.13,
          m.w * 1.75, m.h * 1.55, { alpha: 0.27, rot: Math.sin(G.realTime * 0.65) * 0.035 });
      }
    }
    const spriteY = ent.y - m.h * (anchorY - 0.5);
    const clip = ent.isPlayer ? null : enemyClip(ent, G);
    const animationCell = ent.catalogCreature ? ent.visualCell : null;
    const drewAuthoredClip = clip && A.drawEnemyClip(ctx, m.id, animationCell, clip.id, clip.time, clip.loop,
      ent.x, spriteY, m.w, m.h, { flipX:face < 0, alpha });
    if (!drewAuthoredClip && ent.catalogCreature) {
      const sheetCols = sheet.cols || 1;
      const bob = Math.sin((ent.anim || 0) * (Math.hypot(ent.vx || 0, ent.vy || 0) > 30 ? 8 : 2.2) + (ent.breath || 0)) * m.h * 0.018;
      const lean = U.clamp((ent.vx || 0) / Math.max(140, ent.speed || 140), -0.8, 0.8) * 0.055;
      A.drawCell(ctx, m.id, ent.visualCell % sheetCols, Math.floor(ent.visualCell / sheetCols),
        ent.x, spriteY + bob, m.w, m.h, { flipX:face < 0, alpha, rot:lean + Math.sin((ent.anim || 0) * 2.1 + (ent.breath || 0)) * 0.014 });
    } else if (!drewAuthoredClip) {
      A.drawCell(ctx, m.id, frame, row, ent.x, spriteY, m.w, m.h, { flipX:face < 0, alpha });
    }
    if (ent.hurtFlash > 0.05 && !ent.dead) {
      A.drawCell(ctx, 'effects.status', 1, 0, ent.x, ent.y - m.h * 0.35, m.w * 1.1, m.h * 0.9,
        { alpha: Math.min(0.8, ent.hurtFlash * 0.72) });
    }
    if (ent.elite && !ent.dead) {
      const markIndex = Math.max(0, enemyOrder.indexOf(ent.id));
      const markAtlas = markIndex < 16 ? 'effects.divine' : 'effects.status';
      const markCell = markIndex < 16 ? markIndex : markIndex - 16;
      A.drawCell(ctx, markAtlas, markCell % 4, Math.floor(markCell / 4), ent.x, ent.y - m.h * 0.64,
        m.h * 0.9, m.h * 0.72, { alpha: 0.56 + Math.sin(G.realTime * 3.5) * 0.09, rot: Math.sin(G.realTime * 1.2) * 0.08 });
    }
    if (ent.statuses) drawStatuses(ctx, G, ent);
    if (ent.isPlayer) drawPlayerEffects(ctx, G, ent, m);
    if (ent.isNemesis && !ent.dead) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.font = '600 11px Cinzel, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f2cb76';
      ctx.shadowColor = '#140b04';
      ctx.shadowBlur = 7;
      ctx.fillText((ent.name || 'Nemesis') + ' · ' + (ent.nemesisEpithet || 'THE RETURNED'), ent.x, ent.y - m.h * 0.7);
      ctx.restore();
    }
    if (ent.isBoss && ent.hp < ent.maxHp * 0.3 && !ent.dead) {
      A.drawCell(ctx, 'effects.status', 11, Math.floor(G.realTime * 7) % 4, ent.x, ent.y - m.h * 0.45,
        m.h * 1.25, m.h * 0.85, { alpha: 0.34 });
    }
    if (!ent.isPlayer && !ent.dead && ent.hpBarT > 0) drawHealthBar(ctx, ent, m.h);
  }
  function drawPlayerEffects(ctx, G, p, m) {
    const aim = p.aim === undefined ? Math.atan2(p.vy || 0, p.vx || 1) : p.aim;
    if (p.dashing > 0) {
      const progress = 1 - p.dashing / 0.16;
      const frame = Math.max(0, Math.min(15, Math.floor(progress * 16)));
      A.drawFrame(ctx, 'effects.dash', frame, p.x - (p.vx || 0) * 0.05, p.y - (p.vy || 0) * 0.05,
        m.h * 2.0, m.h * 1.1, { rot: Math.atan2(p.vy || 0, p.vx || 1), alpha: 0.9 });
    }
    if (p.attackAnim > 0) {
      A.drawCell(ctx, 'effects.actions', Math.floor((1 - p.attackAnim) * 4) % 4, 0,
        p.x + Math.cos(aim) * 46, p.y + Math.sin(aim) * 46, 142, 96,
        { rot: aim, alpha: Math.min(0.95, p.attackAnim) });
    }
    if (p.guardT > 0) {
      A.drawCell(ctx, 'effects.divine', Math.floor(G.realTime * 12) % 4, 0, p.x, p.y, m.h * 2.1, m.h * 1.7,
        { alpha: 0.82 });
    }
    if (p.callActive > 0) {
      const godList = ['zeus','poseidon','athena','ares','aphrodite','artemis','dionysus','hephaestus','hermes','demeter','hades','chaos'];
      const callIndex = Math.max(0, godList.indexOf(p.callGod));
      const atlas = 'effects.calls.' + (Math.floor(callIndex / 4) + 1);
      const row = callIndex % 4;
      A.drawCell(ctx, atlas, Math.floor((3 - p.callActive) * 5) % 4, row, p.x, p.y - 18, m.h * 2.7, m.h * 2.7,
        { alpha: Math.min(0.9, p.callActive / 0.38) });
    }
    if (p.ascendT > 0) {
      A.drawCell(ctx, 'effects.divine', Math.floor(G.realTime * 10) % 4, 3, p.x, p.y - 20, m.h * 2.4, m.h * 2.5,
        { alpha: 0.34 });
    }
  }
  function drawHealthBar(ctx, ent, h) {
    const w = Math.max(44, (ent.radius || 14) * (ent.isBoss ? 3.1 : 2.2));
    const x = ent.x - w / 2, y = ent.y - h * 0.86;
    const barH = Math.max(12, Math.min(ent.isBoss ? 24 : 18, h * 0.2));
    const ratio = Math.max(0, Math.min(1, ent.hp / Math.max(1, ent.maxHp)));
    const cx = x + w / 2, cy = y + barH / 2;
    A.drawCell(ctx, 'ui.healthbar', 0, 0, cx, cy, w, barH);
    if (ratio <= 0) return;
    const insetX = w * 0.145;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + insetX, y + barH * 0.31, (w - insetX * 2) * ratio, barH * 0.38);
    ctx.clip();
    A.drawCell(ctx, 'ui.healthbar', 0, 1, cx, cy, w, barH);
    ctx.restore();
  }
  function drawStatuses(ctx, G, ent) {
    const keys = Object.keys(ent.statuses || {}).filter(k => ent.statuses[k] && ent.statuses[k].t > 0).slice(0, 4);
    const y = ent.y - (ent.radius || 12) * 2.2;
    keys.forEach((key, i) => {
      const cell = ({ poison:2, burn:8, bleed:11, chill:3, slow:3, curse:4, doom:4, mark:9,
        weaken:4, stun:12, root:12, charm:14, petrified:3 })[key] || 15;
      A.drawCell(ctx, 'effects.status', cell % 4, Math.floor(cell / 4), ent.x + (i - (keys.length - 1) / 2) * 16, y, 23, 23,
        { alpha: 0.82, rot: Math.sin(G.realTime * 4 + i) * 0.08 });
    });
  }

  function createDecor(G, rid) {
    const key = rid + ':' + Math.round(G.arena.w) + ':' + Math.round(G.arena.h);
    if (key === decorKey) return decor;
    decorKey = key;
    decor = [];
    const rng = new K.RNG(0x54ab3 + (D.REGIONS.findIndex(r => r.id === rid) + 1) * 12817);
    const n = 18 + Math.max(0, D.REGIONS.findIndex(r => r.id === rid)) * 3;
    for (let i = 0; i < n; i++) {
      const side = i % 4;
      let x, y;
      if (side === 0) { x = G.arena.x + rng.range(70, G.arena.w - 70); y = G.arena.y + rng.range(34, 112); }
      else if (side === 1) { x = G.arena.x + rng.range(70, G.arena.w - 70); y = G.arena.y + G.arena.h - rng.range(34, 112); }
      else if (side === 2) { x = G.arena.x + rng.range(36, 112); y = G.arena.y + rng.range(120, G.arena.h - 120); }
      else { x = G.arena.x + G.arena.w - rng.range(36, 112); y = G.arena.y + rng.range(120, G.arena.h - 120); }
      decor.push({ x, y, cell: rng.int(0, 15), size: rng.range(68, 126), alpha: rng.range(0.5, 0.82) });
    }
    return decor;
  }
  function drawDecor(ctx, G, rid) {
    const id = 'region.' + regionArtId(rid) + '.props';
    for (const d of createDecor(G, rid)) {
      const cell = d.cell;
      A.drawCell(ctx, id, cell % 4, Math.floor(cell / 4), d.x, d.y - d.size * 0.12, d.size * 1.25, d.size, { alpha: d.alpha });
    }
  }

  function drawHazard(ctx, G, h) {
    const life = h.maxLife ? Math.max(0.22, Math.min(0.72, h.life / h.maxLife)) : 0.5;
    const col = h.color === '#7ad86a' || h.color === '#65d86a' ? 2 :
      (h.color === '#5fd0d8' || h.color === '#bfe8ff' ? 3 : (h.color === '#e2564a' || h.color === '#ff6a2c' ? 8 : 0));
    A.drawCell(ctx, 'effects.status', col % 4, Math.floor(col / 4), h.x, h.y,
      Math.max(54, (h.radius || 40) * 3.0), Math.max(54, (h.radius || 40) * 2.1),
      { alpha: life, rot: G.realTime * 0.08 });
  }
  function drawEffect(ctx, G, f) {
    if (f.kind === 'bossStage') {
      const progress=f.max?Math.max(0,Math.min(1,1-f.life/f.max)):0;
      const frame = f.frame || 0, col = (frame % 4 + Math.floor(progress * 12)) % 4, row = Math.floor(frame / 4);
      const pulse = 0.68 + Math.sin(progress * Math.PI) * 0.32;
      const size = (f.r || 150) * (0.8 + progress * 0.55);
      A.drawCell(ctx, 'effects.divine', col, row, f.x, f.y, size * 1.45, size, { alpha: pulse });
      return;
    }
    if(f.kind==='shoot'){
      const progress=f.max?Math.max(0,1-f.life/f.max):0;
      A.drawCell(ctx,'effects.actions',Math.floor(progress*4)%4,2,f.x+Math.cos(f.dir||0)*24,f.y+Math.sin(f.dir||0)*24,68,48,{alpha:0.8,rot:f.dir||0});return;
    }
    if (f.kind === 'float') {
      const t = Math.max(0, f.life / f.max);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillStyle = f.color || '#f0cf5e';
      ctx.shadowColor = '#090707'; ctx.shadowBlur = 8;
      ctx.fillText(f.text, f.x, f.y - (1 - t) * 28);
      ctx.restore();
      return;
    }
    const t = f.max ? Math.max(0, Math.min(1, 1 - f.life / f.max)) : G.realTime;
    if (f.kind === 'swing') {
      const dir = f.dir || 0;
      A.drawCell(ctx, 'effects.actions', Math.floor(t * 4) % 4, 0,
        f.x + Math.cos(dir) * (f.reach || 46) * 0.45, f.y + Math.sin(dir) * (f.reach || 46) * 0.45,
        (f.reach || 46) * 2.2, (f.reach || 46) * 1.5, { rot: dir, alpha: 0.9 });
      return;
    }
    if (f.kind === 'arc' && f.x1 !== undefined) {
      const dx = f.x2 - f.x1, dy = f.y2 - f.y1;
      const len = Math.hypot(dx, dy), steps = Math.max(2, Math.ceil(len / 70));
      for (let i = 0; i < steps; i++) {
        const k = (i + 0.5) / steps;
        A.drawCell(ctx, 'effects.projectiles', 2, 0, f.x1 + dx * k, f.y1 + dy * k, 44, 30,
          { rot: Math.atan2(dy, dx), alpha: 0.75 });
      }
      return;
    }
    const idx = f.frame === undefined ? ({ summonRing:14, nova:1, shieldRing:10, bolt:12, telegraph:0, wave:13,
      shockwave:1, cone:4, urnBreak:14 })[f.kind] || 0 : f.frame;
    const size = Math.max(64, (f.r || f.radius || 52) * (f.kind === 'telegraph' ? 1.8 : 2.15));
    const dir = f.dir === undefined ? 0 : f.dir;
    const atlas = (f.kind === 'bolt' || f.kind === 'cone') ? 'effects.divine' : 'effects.status';
    const row = atlas === 'effects.divine' ? (f.kind === 'bolt' ? 1 : 0) : Math.floor(idx / 4);
    const col = atlas === 'effects.divine' ? Math.floor(t * 4) % 4 : (f.kind === 'telegraph' ? (idx % 4 + Math.floor(t * 8)) % 4 : idx % 4);
    A.drawCell(ctx, atlas, col, row, f.x, f.y, size, size * 0.76, { alpha: Math.max(0.25, 1 - t), rot: dir });
  }

  function drawParticles(ctx, G) {
    const l = G.particles && G.particles.list || [];
    for (let i = 0; i < l.length; i++) {
      const p = l[i], alpha = p.fade ? Math.max(0, p.life / p.max) : 1;
      if (alpha < 0.04) continue;
      let cell = (i * 7 + Math.floor(G.realTime * 8)) % 16;
      if (p.color && (p.color.indexOf('7a') >= 0 || p.color.indexOf('9b') >= 0)) cell = 9 + (cell % 4);
      else if (p.color && (p.color.indexOf('5f') >= 0 || p.color.indexOf('bf') >= 0)) cell = 4 + (cell % 4);
      const t = p.fade === false ? 1 : Math.max(0.36, 0.35 + 0.65 * alpha);
      A.drawCell(ctx, 'effects.particles', cell % 4, Math.floor(cell / 4), p.x, p.y,
        p.size * 4.2 * t, p.size * 3.6 * t, { alpha, rot: p.rot || 0 });
    }
  }
  function drawProjectile(ctx, p) {
    const cell = projectileCell[p.persp] === undefined ? 10 : projectileCell[p.persp];
    const size = Math.max(22, (p.size || 8) * 3.5);
    A.drawCell(ctx, 'effects.projectiles', cell % 4, Math.floor(cell / 4), p.x, p.y, size * 1.3, size, { rot: p.rot || 0, alpha: 0.98 });
    if (p.effects) {
      const status = p.effects.poison ? 2 : (p.effects.burn ? 8 : (p.effects.bleed ? 11 : 4));
      A.drawCell(ctx, 'effects.status', status % 4, Math.floor(status / 4), p.x, p.y, size * 1.6, size * 1.4, { alpha: 0.36, rot: -(p.rot || 0) });
    }
  }
  function drawInteractable(ctx, G, it, rid) {
    const atlas = 'region.' + regionArtId(rid) + '.props';
    const usedAlpha = it.used ? 0.28 : 0.95;
    if (it.kind === 'gate') {
      const frame = Math.floor(G.realTime * 8) % 4;
      A.drawCell(ctx, 'effects.divine', frame, 2, it.x, it.y - 24, 190, 210, { alpha: usedAlpha });
      if (!it.used) textAt(ctx, 'E  DESCEND', it.x, it.y - 132, '#f0cf5e', 13);
      return;
    }
    if(it.kind==='arena'){
      const frame=(Math.floor(G.realTime*5)+it.propCell)%4;
      A.drawCell(ctx,'region.interactive.props',frame,it.propCell,it.x,it.y,106,102,{alpha:usedAlpha,rot:Math.sin(G.realTime*1.6+it.x)*0.025});
      if(!it.used)textAt(ctx,['OFFERING','RESTORATION','WARD','WAR STANDARD'][it.propCell],it.x,it.y-58,'#e4cfaa',9);
      return;
    }
    if(it.kind==='haggle'||it.kind==='healthTrade'){
      const frame=Math.floor(G.realTime*4)%4,row=it.kind==='haggle'?2:3;
      A.drawCell(ctx,'region.interactive.props',frame,row,it.x,it.y,96,100,{alpha:usedAlpha,rot:Math.sin(G.realTime*1.2)*0.03});
      if(!it.used)textAt(ctx,it.kind==='haggle'?'HAGGLE':'BLOOD TITHE',it.x,it.y-56,'#e4cfaa',9);
      return;
    }
    const cell = it.kind === 'fountain' ? 15 : (it.kind === 'shop' ? 4 : (it.kind === 'urn' ? 7 : 11));
    A.drawCell(ctx, atlas, cell % 4, Math.floor(cell / 4), it.x, it.y, it.kind === 'fountain' ? 118 : 84,
      it.kind === 'fountain' ? 112 : 92, { alpha: usedAlpha, rot: it.kind === 'shop' ? Math.sin(G.realTime * 1.4) * 0.05 : 0 });
    if (it.kind === 'shop' && it.item) {
      const itemId = it.item.id && relicCells[it.item.id] !== undefined ? it.item.id : 'r_ambrosia';
      const itemCell = relicCells[itemId] || 0;
      A.drawCell(ctx, 'ui.relics', itemCell % 4, Math.floor(itemCell / 4), it.x, it.y - 10, 40, 40, { alpha: usedAlpha });
    }
    const label = it.kind === 'shop' ? 'CHARON' : (it.kind === 'urn' ? 'OBOLS' : (it.kind === 'fountain' ? 'FOUNTAIN' : ''));
    if (label && !it.used) textAt(ctx, label, it.x, it.y - 58, '#e4cfaa', 10);
  }
  function textAt(ctx, text, x, y, color, size) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold ' + size + 'px Georgia, serif';
    ctx.fillStyle = color; ctx.shadowColor = '#080607'; ctx.shadowBlur = 8; ctx.fillText(text, x, y); ctx.restore();
  }
  function drawPickup(ctx, p, G) {
    const t = G.realTime * 3 + p.x * 0.01;
    const id = p.kind === 'life' ? 'life' : 'coin';
    A.drawIcon(ctx, id, p.x, p.y + Math.sin(t) * 5, 36, { rot: t * 0.18, alpha: 0.97 });
  }

  function drawBanner(ctx, G) {
    if (!G.banner) return;
    const b = G.banner, t = 1 - b.t / b.max;
    const alpha = t < 0.12 ? t / 0.12 : (t > 0.78 ? (1 - t) / 0.22 : 1);
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    A.drawImage(ctx, 'ui.meander', K.W * 0.18, K.H * 0.235, K.W * 0.64, 56, { alpha: 0.75 });
    ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.round(Math.min(46, K.W / 18)) + 'px Georgia, serif';
    ctx.fillStyle = '#f0cf5e'; ctx.shadowColor = '#090707'; ctx.shadowBlur = 16;
    ctx.fillText(b.big, K.W / 2, K.H * 0.26);
    ctx.shadowBlur = 0;
    if (b.small) { ctx.font = Math.round(Math.min(18, K.W / 50)) + 'px Georgia, serif'; ctx.fillStyle = '#c8b898'; ctx.fillText(b.small, K.W / 2, K.H * 0.285); }
    if (b.sub) { ctx.font = 'italic ' + Math.round(Math.min(15, K.W / 60)) + 'px Georgia, serif'; ctx.fillStyle = '#9a8a72'; ctx.fillText(b.sub, K.W / 2, K.H * 0.31); }
    ctx.restore();
  }
  function drawCinematic(ctx, G) {
    if (!G.cinematic) return;
    const god = G.cinematic.god, t = 1 - G.cinematic.t / 3;
    const gd = D.GODS[god];
    const portraitCell = gd && gd.portraitCell !== undefined ? gd.portraitCell : (godCells[god] === undefined ? 0 : godCells[god]);
    const portrait = A.entry('ui.deities') ? 'ui.deities' : 'ui.gods';
    const portraitCols = (A.entry(portrait) || {}).cols || 4;
    A.drawCell(ctx, portrait, portraitCell % portraitCols, Math.floor(portraitCell / portraitCols), K.W / 2, K.H * 0.4, 170, 170,
      { alpha: Math.max(0, 1 - t * 1.4), rot: Math.sin(G.realTime * 1.4) * 0.03 });
    if (!gd) return;
    ctx.save(); ctx.textAlign = 'center'; ctx.globalAlpha = Math.max(0, 1 - t * 1.4);
    ctx.font = 'bold ' + Math.round(Math.min(38, K.W / 22)) + 'px Georgia, serif'; ctx.fillStyle = gd.color;
    ctx.fillText(gd.name, K.W / 2, K.H * 0.52);
    ctx.font = 'italic 15px Georgia, serif'; ctx.fillStyle = '#e8dcc8'; ctx.fillText(gd.domain, K.W / 2, K.H * 0.56);
    ctx.restore();
  }

  R.draw = function (ctx, G) {
    const rid = regionId(G);
    if (!G.arena) G.arena = { x: -590, y: -410, w: 1180, h: 820 };
    ctx.save();
    ctx.clearRect(0, 0, K.W, K.H);
    A.drawCover(ctx, 'region.' + rid + '.backdrop', 0, 0, K.W, K.H);
    ctx.save();
    G.cam.apply(ctx);
    A.drawImage(ctx, 'region.' + regionArtId(rid) + '.floor', G.arena.x, G.arena.y, G.arena.w, G.arena.h);
    drawDecor(ctx, G, rid);
    for (const h of G.hazards || []) drawHazard(ctx, G, h);
    for (const f of E.telegraphs || []) drawEffect(ctx, G, Object.assign({ kind: 'telegraph' }, f));
    for (const f of E.effects || []) drawEffect(ctx, G, f);
    const things = [];
    for (const e of E.enemies || []) if (e && !e.removeMe) things.push({ y: e.y, ent: e });
    if (G.player) things.push({ y: G.player.y, ent: G.player });
    for (const it of G.interactables || []) things.push({ y: it.y, it });
    things.sort((a, b) => a.y - b.y);
    for (const t of things) {
      if (t.ent) drawActor(ctx, G, t.ent);
      else drawInteractable(ctx, G, t.it, rid);
    }
    for (const p of E.projectiles || []) drawProjectile(ctx, p);
    drawParticles(ctx, G);
    for (const p of E.pickups || []) drawPickup(ctx, p, G);
    ctx.restore();
    drawBanner(ctx, G);
    drawCinematic(ctx, G);
    if (G.flash > 0.015) A.drawCover(ctx, 'region.' + rid + '.backdrop', 0, 0, K.W, K.H, { alpha: Math.min(0.2, G.flash * 0.2) });
    ctx.restore();
  };

  R.godColor = function (id) { return (D.GODS[id] || { color: '#e0b355' }).color; };
})();



