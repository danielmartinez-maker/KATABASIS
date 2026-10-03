/* ============================================================
   KATABASIS — entities.js
   Player, enemies, bosses, projectiles, effects.
   Behaviour is data-driven: each bestiary entry names an `ai`
   archetype that describes its tell, its danger and its openings.
   ============================================================ */
(function () {
  'use strict';
  const K = window.K;
  const U = K.U;
  const TAU = U.TAU;
  const D = K.DATA;

  /* Shared world state so entities can query each other. */
  const E = {
    G: null,              // Game instance
    enemies: [],
    projectiles: [],
    effects: [],
    pickups: [],
    telegraphs: [],
    particles: null,
    cam: null
  };
  K.E = E;

  /* Frame-rate independent random event: returns true with probability 1-exp(-rate*dt).
     For small rate*dt, approximates rate*dt. Uses Poisson process semantics. */
  function chancePerSecond(rate, dt) { return Math.random() < 1 - Math.exp(-rate * dt); }

  /* ============================================================
     Small helpers
     ============================================================ */
  function spawnProjectile(o) { E.projectiles.push(new Projectile(o)); }

  function hitFx(g, x, y, color, n, pow) {
    const P = E.particles;
    P.burst(x, y, n || 6, () => {
      const a = Math.random() * TAU, s = (pow || 90) * (0.35 + Math.random());
      return {
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.24 + Math.random() * 0.3, max: 0.54,
        size: 1.6 + Math.random() * 2.6, color, glow: true, add: true, shape: 'spark',
        rot: a, vrot: (Math.random() - 0.5) * 14, drag: 0.9
      };
    });
  }
  E.hitFx = hitFx;

  function ringFx(g, x, y, r, color, n) {
    const P = E.particles;
    for (let i = 0; i < (n || 14); i++) {
      const a = i / (n || 14) * TAU;
      P.spawn({
        x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3,
        vx: Math.cos(a) * r * 2.4, vy: Math.sin(a) * r * 2.4,
        life: 0.3, max: 0.3, size: 2.6, color, glow: true, add: true, drag: 0.86
      });
    }
  }
  E.ringFx = ringFx;

  /* ============================================================
     PROJECTILE
     ============================================================ */
  const PROJ_DEF = {
    bolt:      { color: '#f5e07a', glow: '#fff3b0', size: 7,  shape: 'bolt' },
    spear:     { color: '#e8dcc0', glow: '#fff8e0', size: 6,  shape: 'spear' },
    water:     { color: '#5fd0d8', glow: '#bff4f8', size: 8,  shape: 'orb' },
    wail:      { color: '#7fd8d0', glow: '#d0fff8', size: 7,  shape: 'orb' },
    boulder:   { color: '#a89078', glow: '#d8c0a0', size: 14, shape: 'rock' },
    rock:      { color: '#8a8a9a', glow: '#c0c0d0', size: 11, shape: 'rock' },
    spark:     { color: '#ffd27a', glow: '#fff0c0', size: 6,  shape: 'spark' },
    fireball:  { color: '#ff8a3c', glow: '#ffd0a0', size: 10, shape: 'fire' },
    curse:     { color: '#b06ad8', glow: '#e0b0ff', size: 8,  shape: 'skull' },
    hex:       { color: '#9a5ac0', glow: '#d0a0ff', size: 9,  shape: 'skull' },
    magma:     { color: '#ff6a2c', glow: '#ffc08a', size: 9,  shape: 'fire' },
    arrow:     { color: '#9be07a', glow: '#e0ffc0', size: 7,  shape: 'spear' },
    blade:     { color: '#e2564a', glow: '#ffb0a0', size: 9,  shape: 'blade' },
    dark:      { color: '#9a7ad8', glow: '#d8c0ff', size: 9,  shape: 'orb' },
    frost:     { color: '#bfe8ff', glow: '#ffffff', size: 7,  shape: 'spark' },
    poison:    { color: '#7ad86a', glow: '#c0ffb0', size: 8,  shape: 'orb' },
    skyfire:   { color: '#fff0a0', glow: '#ffffff', size: 11, shape: 'bolt' }
  };

  function Projectile(o) {
    const def = PROJ_DEF[o.persp] || PROJ_DEF.orb || { color: '#fff', glow: '#fff', size: 7, shape: 'orb' };
    this.x = o.x || 0; this.y = o.y || 0;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.dmg = o.dmg === undefined ? 8 : o.dmg;
    this.radius = o.radius || def.size * 0.7;
    this.life = o.life === undefined ? 2.6 : o.life;
    this.maxLife = this.life;
    this.delay = Math.max(0, o.delay || 0);
    this.persp = o.persp || 'orb';
    this.color = o.color || def.color;
    this.glow = o.glow || def.glow;
    this.shape = o.shape || def.shape;
    this.size = o.size || def.size;
    this.friendly = !!o.friendly;
    this.crit = !!o.crit;
    this.owner = o.owner || null;
    this.pierce = o.pierce || 0;
    this.homing = o.homing || 0;
    this.homingTarget = null;
    this.aoe = o.aoe || 0;
    this.aoeDmg = o.aoeDmg || 0;
    this.knock = o.knock || 1;
    this.spin = o.spin || 0;
    this.rot = Math.atan2(this.vy, this.vx);
    this.vrot = o.vrot || 0;
    this.drag = o.drag || 0;
    this.grav = o.grav || 0;
    this.hitSet = null;
    this.trail = o.trail !== false;
    this.zig = o.zig || 0;
    this.zigPhase = Math.random() * TAU;
    this.effects = o.effects || null;   // status rider {bleed, poison, ...}
    this.dead = false;
    this.hitWall = o.hitWall !== false;
    this.onDeath = o.onDeath || null;
    this.fromEnemy = !o.friendly;
  }

  Projectile.prototype.update = function (dt, G) {
    const worldFrom = { x: this.x, y: this.y };
    this.life -= dt;
    if (this.life <= 0) { this.die(G); return; }

    if (this.homing > 0) {
      let best = null, bd = 1e9;
      const pool = this.friendly ? E.enemies : [G.player];
      for (const t of pool) {
        if (!t || t.dead || t.hp <= 0 || t.removeMe || (this.friendly && t.ally)) continue;
        const d = U.dist2(this.x, this.y, t.x, t.y);
        if (d < bd) { bd = d; best = t; }
      }
      if (best) {
        const want = Math.atan2(best.y - this.y, best.x - this.x);
        const cur = Math.atan2(this.vy, this.vx);
        const na = cur + U.clamp(U.angDiff(cur, want), -this.homing * dt, this.homing * dt);
        const sp = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
      }
    }
    if (this.zig) {
      this.zigPhase += dt * 12;
      const a = Math.atan2(this.vy, this.vx) + Math.PI / 2;
      const off = Math.sin(this.zigPhase) * this.zig;
      this.x += Math.cos(a) * off * dt; this.y += Math.sin(a) * off * dt;
    }

    this.vy += this.grav * dt;
    if (this.drag) { const d = Math.pow(this.drag, dt * 60); this.vx *= d; this.vy *= d; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.vrot * dt;
    if (this.shape === 'spear' || this.shape === 'blade' || this.shape === 'bolt') this.rot = Math.atan2(this.vy, this.vx);

    if (this.trail && chancePerSecond(42, dt)) {
      E.particles.spawn({
        x: this.x, y: this.y, vx: -this.vx * 0.06, vy: -this.vy * 0.06,
        life: 0.22, max: 0.22, size: this.size * 0.38, color: this.glow,
        glow: true, add: true, drag: 0.85
      });
    }

    // world bounds
    const b = G.arena;
    if (this.hitWall && (this.x < b.x || this.x > b.x + b.w || this.y < b.y || this.y > b.y + b.h)) {
      if (this.shape === 'rock' || this.aoe > 0) { this.explode(G); }
      this.life = 0; this.die(G); return;
    }
    if (this.x < b.x - 200 || this.x > b.x + b.w + 200 || this.y < b.y - 200 || this.y > b.y + b.h + 200) {
      this.life = 0; this.die(G); return;
    }

    // Resolve raised terrain and blockers before an actor can be hit behind them.
    if (this.hitWall && G.world && K.World && typeof K.World.lineOfSight === 'function') {
      const height = Number.isFinite(this.projectileHeight) ? this.projectileHeight : 24;
      if (!K.World.lineOfSight(G.world, worldFrom, { x: this.x, y: this.y }, height)) {
        if (this.shape === 'rock' || this.aoe > 0) this.explode(G);
        this.life = 0; this.die(G); return;
      }
    }

    // collisions
    if (this.friendly) {
      for (const e of E.enemies) {
        if (e.dead || e.hp <= 0 || e.ally) continue;
        if (this.hitSet && this.hitSet.has(e)) continue;
        if (U.dist2(this.x, this.y, e.x, e.y) < (this.radius + e.radius) * (this.radius + e.radius)) {
          if (e.blocksFrom && e.blocksFrom(this, G)) {
            this.life = 0; hitFx(G, this.x, this.y, '#cfd6e2', 6, 120); this.die(G); return;
          }
          const stats = (this.owner && this.owner.stats) || (G.player && G.player.stats) || {};
          const damage = this.dmg * (this.crit ? 1.9 + (stats.critMul || 0) : 1);
          G.damageEnemy(e, damage, { source: 'projectile', proj: this, crit: this.crit, knock: this.knock, dir: Math.atan2(this.vy, this.vx), x: this.x, y: this.y });
          applyRiders(this, e, G);
          if (this.aoe > 0) { this.explode(G); }
          if (this.pierce > 0) {
            this.pierce--;
            if (!this.hitSet) this.hitSet = new Set();
            this.hitSet.add(e);
          } else { this.life = 0; this.die(G); return; }
        }
      }
    } else {
      const p = G.player;
      if (p && !p.dead && U.dist2(this.x, this.y, p.x, p.y) < (this.radius + p.radius) * (this.radius + p.radius)) {
        if (p.stats.deflectProj && Math.random() < p.stats.deflectProj) {
          // send it back
          const a = Math.atan2(this.vy, this.vx) + Math.PI;
          const sp = Math.hypot(this.vx, this.vy) * 1.35;
          this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
          this.friendly = true; this.fromEnemy = false; this.dmg *= 2.2; this.hitSet = null;
          this.owner = p;
          G.toast('Deflected!', this.color);
          K.Audio.sfx('shield');
          return;
        }
        if (G.damagePlayer(this.dmg, this, 'projectile')) {
          applyRiders(this, p, G);
          if (this.aoe > 0) this.explode(G);
          this.life = 0; this.die(G);
          return;
        }
      }
    }
  };

  Projectile.prototype.explode = function (G) {
    const r = this.aoe || 46, dmg = this.aoeDmg || this.dmg * 0.6;
    ringFx(G, this.x, this.y, r, this.glow, 18);
    hitFx(G, this.x, this.y, this.color, 14, 180);
    E.cam.addShake(4);
    K.Audio.sfx('explode');
    if (this.friendly) {
      for (const e of E.enemies) {
        if (e.dead || e.hp <= 0 || e.ally) continue;
        const d = U.dist(this.x, this.y, e.x, e.y);
        if (d < r + e.radius) {
          G.damageEnemy(e, dmg, { source: 'explosion', x: this.x, y: this.y, dir: U.ang(this.x, this.y, e.x, e.y), knock: 1.6, player: this.owner });
        }
      }
    } else if (G.player && U.dist(this.x, this.y, G.player.x, G.player.y) < r + G.player.radius) {
      G.damagePlayer(dmg, this, 'explosion');
    }
    E.particles.spawn({ x: this.x, y: this.y, life: 0.4, max: 0.4, size: r * 0.5, color: this.glow, glow: true, add: true, drag: 1 });
  };

  Projectile.prototype.die = function (G) {
    if (this.dead) return;
    this.dead = true;
    if (this.onDeath) this.onDeath(this, G);
    const i = E.projectiles.indexOf(this);
    if (i >= 0) E.projectiles.splice(i, 1);
  };

  function applyRiders(proj, target, G) {
    const r = proj.effects;
    if (!r) return;
    const apply = (key, data) => target.isPlayer ? G.applyPlayerStatus(key, data) : G.applyStatus(target, key, data);
    if (r.poison) apply('poison', r.poison);
    if (r.bleed) apply('bleed', r.bleed);
    if (r.burn) apply('burn', r.burn);
    if (r.slow) apply('slow', { amount: r.slow, dur: 1.6 });
    if (r.weaken) apply('weaken', { amount: r.weaken, dur: 4 });
  }
  E.spawnProjectile = spawnProjectile;
  E.Projectile = Projectile;

  /* ============================================================
     PLAYER
     ============================================================ */
  function Player(G, stats) {
    this.isPlayer = true;
    this.heroId = G && G.run && G.run.heroId || 'perseus';
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.radius = 15;
    this.aim = 0;
    this.facing = 1;
    this.dead = false;
    this.stats = stats || { maxHp: 100, damage: 15, moveSpeed: 268, attackSpeed: 1, specialCdMul: 1, specialDamage: 25, dashMax: 2, dashRegen: 1.4, dashDist: 1, crit: 0.05, critMul: 0, maxShield: 320, reachMul: 1, gods: {} };
    this.hp = this.stats.maxHp;
    this.shield = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.dashCd = 0;
    this.dashCharges = stats.dashMax;
    this.dashRegenT = 0;
    this.dashing = 0;
    this.dashDirX = 0; this.dashDirY = 0;
    this.attackCd = 0;
    this.attackAnim = 0;
    this.attackDir = 0;
    this.comboStep = 0;
    this.comboT = 0;
    this.attackCount = 0;
    this.specialCd = 0;
    this.callCd = 0;
    this.callActive = 0;
    this.callTick = 0;
    this.callGod = null;
    this.roomStartShieldPending = 0;
    this.statuses = {};
    this.killStacks = 0;
    this.magnet = 150;
    this.stepT = 0;
    this.bobT = 0;
    this.auraTick = 0;
    this.hitStop = 0;
    this.attacking = 0;
    /* knockback is integrated separately from input velocity */
    this.knockVX = 0; this.knockVY = 0;
    this.knocked = false;
    /* new abilities */
    this.guardCd = 0;
    this.guardT = 0;          // remaining active window
    this.guardDir = 0;
    this.guardRecover = 0;    // forced recovery after a parry
    this.perfect = 0;         // set for one frame when a parry connects
    this.guardFlash = 0;
    this.castCd = 0;
    this.rushCd = 0;
    this.rushT = 0;
    this.ascendCd = 0;
    this.ascendT = 0;
    this.parryCount = 0;
    this.ascendFlash = 0;
  }

  Player.prototype.speed = function () { return this.stats.moveSpeed * (this.stats.immuneSlow ? 1 : (this.statuses.slow ? 1 - this.statuses.slow.amount : 1)); };
  Player.prototype.attackDamage = function () {
    let d = this.stats.damage;
    if (this.stats.lowHpDmg) d *= 1 + this.stats.lowHpDmg * (1 - this.hp / this.stats.maxHp);
    if (this.stats.furyAtLowHp && this.hp / this.stats.maxHp < 0.35) d *= 1 + this.stats.furyAtLowHp;
    d *= 1 + this.killStacks * (this.stats.killStack || 0);
    if (this.perfect > 0) d *= 1 + (this.stats.riposte || 1.5);   // parry counter
    return d;
  };

  Player.prototype.update = function (dt, G) {
    const st = this.stats;
    const In = K.Input;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3);
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt * 3.4);
    this.specialCd = Math.max(0, this.specialCd - dt);
    this.callCd = Math.max(0, this.callCd - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    if (this.comboT <= 0) this.comboStep = 0;
    this.bobT += dt * (4 + Math.hypot(this.vx, this.vy) * 0.05);

    /* ---- ability timers ---- */
    this.guardCd = Math.max(0, this.guardCd - dt);
    this.guardRecover = Math.max(0, this.guardRecover - dt);
    this.guardFlash = Math.max(0, this.guardFlash - dt * 4);
    this.castCd = Math.max(0, this.castCd - dt);
    this.rushCd = Math.max(0, this.rushCd - dt);
    this.ascendCd = Math.max(0, this.ascendCd - dt);
    if (this.perfect > 0) this.perfect -= dt;
    if (this.guardT > 0) {
      this.guardT -= dt;
      if (this.guardT <= 0) { this.guardT = 0; this.guardRecover = 0.18; }
    }
    if (this.rushT > 0) {
      this.rushT -= dt;
      const rsp = 900 * (st.rushMul || 1);
      this.vx = Math.cos(this.rushDir) * rsp;
      this.vy = Math.sin(this.rushDir) * rsp;
      this.invuln = Math.max(this.invuln, dt + 0.02);
      G.playerDashDamage(this, (this.stats.damage || 15) * 1.1 * (st.rushMul || 1));
      if (chancePerSecond(70, dt)) {
        E.particles.spawn({
          x: this.x, y: this.y, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50,
          life: 0.34, max: 0.34, size: 6, color: '#8fe3c8', glow: true, add: true, drag: 0.86
        });
      }
    }
    if (this.ascendT > 0) {
      this.ascendT -= dt;
      this.invuln = Math.max(this.invuln, dt + 0.02);
      this.ascendFlash = Math.min(1, this.ascendFlash + dt * 4);
      if (chancePerSecond(30, dt)) {
        E.particles.spawn({
          x: this.x + (Math.random() - 0.5) * 40, y: this.y + (Math.random() - 0.5) * 40,
          vx: 0, vy: -40, life: 0.7, max: 0.7, size: 3.4, color: '#ffe9a0', glow: true, add: true, drag: 0.94
        });
      }
      if (this.ascendT <= 0) { this.ascendT = 0; G.recalcStats(); }   // drop the boost
    } else if (this.ascendFlash > 0) {
      this.ascendFlash = Math.max(0, this.ascendFlash - dt * 2);
    }

    // dash recharge
    if (this.dashCharges < st.dashMax) {
      this.dashRegenT += dt;
      if (this.dashRegenT >= st.dashRegen) {
        this.dashRegenT = 0; this.dashCharges++;
        if (this.dashCharges === st.dashMax) K.Audio.sfx('ui');
      }
    }
    this.dashCd = Math.max(0, this.dashCd - dt);

    // statuses
    let spd = 1;
    for (const k in this.statuses) {
      const s = this.statuses[k];
      if (s.t === undefined) s.t = s.dur || 1;
      const active = Math.max(0, Math.min(dt, s.t));
      s.t -= dt;
      if (k === 'slow' && !st.immuneSlow) spd *= 1 - s.amount;
      if (k === 'burn' || k === 'poison' || k === 'bleed') {
        s.tick = (s.tick || 0) + active;
        while (s.tick >= 0.5 - 1e-9) { s.tick = Math.max(0, s.tick - 0.5); G.damagePlayer((s.dps || s.dmg || 0) * 0.5, null, 'dot', true); }
        if (s.t <= 1e-9 && s.tick > 1e-9) G.damagePlayer((s.dps || s.dmg || 0) * s.tick, null, 'dot', true);
      }
      if (s.t <= 1e-9) delete this.statuses[k];
    }
    if (this.statuses.petrified) {
      // petrified: cannot act at all — but a dash charge shatters the stone
      this.vx = 0; this.vy = 0;
      const canBreak = this.dashCharges > 0 && (K.Input.hit('Space') || K.Input.hit('ShiftLeft') || K.Input.hit('ShiftRight'));
      if (canBreak) {
        delete this.statuses.petrified;
        this.dashCharges--;
        this.invuln = Math.max(this.invuln, 0.5);
        E.cam.addShake(5);
        K.Audio.sfx('stone');
        ringFx(G, this.x, this.y, 30, '#ded8c8', 14);
      } else {
        if (chancePerSecond(6, dt)) E.particles.spawn({ x: this.x + (Math.random() - 0.5) * 20, y: this.y + (Math.random() - 0.5) * 20, vx: 0, vy: -20, life: 0.5, max: 0.5, size: 2, color: '#b0b0b8', drag: 0.9 });
        return;
      }
    }

    // aim
    const m = K.Input.mouse;
    this.aim = Math.atan2(m.wy - this.y, m.wx - this.x);
    if (Math.abs(Math.cos(this.aim)) > 0.15) this.facing = Math.cos(this.aim) > 0 ? 1 : -1;

    // ---- dash ----
    if (this.dashing > 0) {
      this.dashing -= dt;
      const ds = 640 * st.dashDist;
      this.vx = this.dashDirX * ds;
      this.vy = this.dashDirY * ds;
      if (st.dashTrail && chancePerSecond(60, dt)) {
        E.particles.spawn({
          x: this.x, y: this.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
          life: 0.32, max: 0.32, size: 7, color: st.dashTrailColor || '#f5e07a', glow: true, add: true, drag: 0.88
        });
      }
      this.spawnDashTrail(dt, G);
    } else {
      /* ---- movement ----
         U.approach(cur, tgt, rate, dt) already multiplies by dt internally, so
         `rate` must be a plain acceleration. The target is built as a vector
         and clamped to maxV, which keeps diagonals exactly as fast as
         cardinals without any separate normalisation. Braking is faster than
         accelerating so stopping feels crisp, and knockback is integrated
         separately and decays, so a big hit carries you rather than sticking. */
      const mv = In.moveVec();
      const maxV = this.speed() * spd;
      const ACCEL = 5200, BRAKE = 7200;
      let tx = mv.x * maxV, ty = mv.y * maxV;
      const tl = Math.hypot(tx, ty);
      if (tl > maxV) { tx = tx / tl * maxV; ty = ty / tl * maxV; }
      const rate = (Math.abs(tx) > 0.01 || Math.abs(ty) > 0.01) ? ACCEL : BRAKE;
      this.vx = U.approach(this.vx, tx, rate, dt);
      this.vy = U.approach(this.vy, ty, rate, dt);

      if ((mv.x || mv.y) && !this.knocked && this.guardT <= 0) {
        this.stepT += dt;
        if (this.stepT > 0.26) {
          this.stepT = 0;
          E.particles.spawn({ x: this.x + (Math.random() - 0.5) * 12, y: this.y + 10, vx: 0, vy: -12, life: 0.35, max: 0.35, size: 3, color: 'rgba(180,170,150,0.5)', drag: 0.92 });
        }
      }
    }

    /* ---- knockback: its own decaying impulse, so it never fights input ---- */
    if (Math.abs(this.knockVX) > 2 || Math.abs(this.knockVY) > 2) {
      this.x += this.knockVX * dt;
      this.y += this.knockVY * dt;
      const kd = Math.pow(0.0015, dt);      // ~150ms of carry
      this.knockVX *= kd; this.knockVY *= kd;
      this.knocked = true;
    } else {
      this.knockVX = 0; this.knockVY = 0;
      this.knocked = false;
    }

    // dash trigger
    if ((In.hit('Space') || In.hit('ShiftLeft') || In.hit('ShiftRight')) && this.dashCd <= 0 && this.dashCharges > 0 && this.dashing <= 0) {
      const mv = In.moveVec();
      let dx = mv.x, dy = mv.y;
      if (!dx && !dy) { dx = Math.cos(this.aim); dy = Math.sin(this.aim); }
      const l = Math.hypot(dx, dy) || 1;
      this.dashDirX = dx / l; this.dashDirY = dy / l;
      this.dashing = 0.16;
      this.dashCharges--;
      this.dashCd = 0.12;
      this.invuln = Math.max(this.invuln, 0.20 + (st.dashInvuln || 0));
      /* a dash cancels any knockback still carrying you */
      this.knockVX = 0; this.knockVY = 0;
      K.Audio.sfx('dash');
      if (st.dashShield) { this.addShield(st.dashShield, G); }
      if (st.waveOnDash) {
        G.playerWave(this.x, this.y, 90, st.waveDmg || 20, Math.atan2(this.dashDirY, this.dashDirX));
        K.Audio.sfx('whoosh');
      }
      if (st.dashDmg) G.playerDashDamage(this, st.dashDmg);
      E.particles.burst(this.x, this.y, 14, () => {
        const a = Math.atan2(-this.dashDirY, -this.dashDirX) + (Math.random() - 0.5) * 1.1;
        return { x: this.x, y: this.y, vx: Math.cos(a) * 160 * Math.random(), vy: Math.sin(a) * 160 * Math.random(), life: 0.34, max: 0.34, size: 3.4, color: '#dfe8ff', glow: true, add: true, drag: 0.88 };
      });
    }

    // ---- attack ----
    const wantAttack = In.mouse.down || In.held('KeyJ');
    if (wantAttack && this.attackCd <= 0 && this.dashing <= 0) this.doAttack(G);

    // ---- Guard (parry) ----
    if (this.guardCd <= 0 && (In.mouse.rdown || In.held('KeyI'))) this.startGuard(G);

    // ---- Cast ----
    if (In.hit('KeyF') && this.castCd <= 0) this.doCast(G);

    // ---- Rush (mobility burst) ----
    if (In.hit('KeyR') && this.rushCd <= 0) this.doRush(G);

    // ---- Ascend (temporary godhood) ----
    if (In.hit('KeyT') && this.ascendCd <= 0) this.doAscend(G);

    // ---- Wrath ----
    if (In.hit('KeyK') && this.specialCd <= 0) this.doWrath(G);

    // ---- call ----
    if (In.hit('KeyQ') && this.callCd <= 0) G.startCall(this);

    // ---- call channel ----
    if (this.callActive > 0) {
      this.callActive -= dt;
      G.callTick(this, dt);
    }

    // ---- passive: static field ----
    if (st.zap) {
      this.auraTick += dt;
      if (this.auraTick >= st.zap.cd) {
        this.auraTick = 0;
        const t = G.nearestEnemy(this.x, this.y, 460);
        if (t) {
          G.strikeLightning(t.x, t.y, st.zap.dmg, 6);
        }
      }
    }
    // ---- passive: lyre aura ----
    if (st.aura === 'slow') {
      for (const e of E.enemies) {
        if (e.dead || e.ally) continue;
        if (U.dist2(this.x, this.y, e.x, e.y) < 190 * 190) G.applyStatus(e, 'slow', { amount: 0.25, dur: 0.3 });
      }
      if (chancePerSecond(3, dt)) {
        E.particles.spawn({ x: this.x + (Math.random() - 0.5) * 120, y: this.y + (Math.random() - 0.5) * 120, vx: 0, vy: -22, life: 1, max: 1, size: 2.6, color: '#c07ad8', glow: true, add: true, drag: 0.96 });
      }
    }

    // ---- movement integrate ----
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    G.collideWithWalls(this);

    // ---- pickups ----
    for (let i = E.pickups.length - 1; i >= 0; i--) {
      const p = E.pickups[i];
      const d = U.dist(this.x, this.y, p.x, p.y);
      if (d < this.magnet && p.kind !== 'shop') {
        const a = U.ang(p.x, p.y, this.x, this.y);
        const pull = 260 * (1 - d / this.magnet) + 70;
        p.x += Math.cos(a) * pull * dt;
        p.y += Math.sin(a) * pull * dt;
      }
      if (d < this.radius + p.radius + 4) G.collectPickup(p);
    }
  };

  Player.prototype.spawnDashTrail = function (dt, G) {
    if (!this.stats.dashTrail) return;
    this.dashTrailT = (this.dashTrailT || 0) + dt;
    if (this.dashTrailT > 0.045) {
      this.dashTrailT = 0;
      G.addHazard({
        x: this.x, y: this.y, radius: 20, life: 0.7, maxLife: 0.7,
        dmg: (this.stats.dashDmg || 12) * 0.5, tick: 0.28, friendly: true,
        color: this.stats.dashTrailColor || (this.stats.gods && this.stats.gods.ares ? '#e2564a' : '#f5e07a')
      });
    }
  };

  Player.prototype.doAttack = function (G) {
    const st = this.stats;
    const w = D.WEAPONS[G.run.weapon] || D.WEAPONS.xiphos;
    const cd = w.atkCd / st.attackSpeed;
    this.attackCd = cd;
    this.attackAnim = 1;
    this.attackDir = this.aim;
    this.comboStep = (this.comboStep % w.combo) + 1;
    this.comboT = 0.6;
    this.attackCount++;

    const isPower = st.powerShot && (this.attackCount % st.powerShot === 0);
    const reach = w.reach * this.stats.reachMul;
    const arc = w.arc;
    const dmgMul = this.comboStep === w.combo ? 1.45 : (1 + (this.comboStep - 1) * 0.12);
    const doubleStrike = !!st.doubleAttack && Math.random() < st.doubleAttack;
    const hero=K.RunSystems&&K.RunSystems.HEROES[G.run.heroId];

    if(hero&&hero.style==='ranged'){
      const n=1+(st.multishot||0),charged=(this.comboStep===w.combo&&(st.chargedCombo||K.RunSystems.hasTransform(G.run,'charged_combo')));
      for(let i=0;i<n*(doubleStrike?2:1);i++){const off=((i%n)-(n-1)/2)*0.12;E.spawnProjectile({x:this.x+Math.cos(this.aim)*20,y:this.y+Math.sin(this.aim)*20,
        vx:Math.cos(this.aim+off)*780,vy:Math.sin(this.aim+off)*780,dmg:this.attackDamage()*dmgMul*(charged?1.8:1.15)*(1+(st.projDmg||0)),friendly:true,owner:this,persp:'arrow',
        pierce:st.pierce||0,life:1.45,radius:7,crit:Math.random()<st.crit,homing:st.homing?2:0,effects:this.projectileRiders()});}
      E.effects.push({kind:'shoot',x:this.x,y:this.y,dir:this.aim,life:0.18,max:0.18,frame:Math.floor(G.realTime*12)%4});
      if(st.waveOnHit)G.playerWave(this.x,this.y,Math.max(130,reach),st.waveDmg||10,this.aim);
      return 0;
    }

    const chargedLast=this.comboStep===w.combo&&(st.chargedCombo||K.RunSystems&&K.RunSystems.hasTransform(G.run,'charged_combo'));
    const finalDamageMul=chargedLast?dmgMul*1.75:dmgMul;

    K.Audio.sfx('swing');

    /* melee arc */
    let hits = 0;
    const targets = E.enemies;
    for (const e of targets) {
      if (e.dead || e.ally || e.hp <= 0) continue;
      const d = U.dist(this.x, this.y, e.x, e.y);
      if (d > reach + e.radius) continue;
      const a = U.ang(this.x, this.y, e.x, e.y);
      if (Math.abs(U.angDiff(this.aim, a)) > arc / 2 + (e.radius / Math.max(30, d)) * 0.5) continue;
      const crit = Math.random() < st.crit;
      let dmg = this.attackDamage() * finalDamageMul * (crit ? (1.9 + st.critMul) : 1);
      if (e.statuses && e.statuses.weaken && st.weakMul) dmg *= 1 + st.weakMul;
      if (e.statuses && (e.statuses.chill || e.statuses.slow) && st.winterOnHit) dmg *= 1.25;
      G.damageEnemy(e, dmg, {
        source: 'melee', crit, x: e.x, y: e.y, dir: a,
        knock: 0.9, player: this
      });
      this.applyOnHit(e, G, crit);
      hits++;
      if (doubleStrike && !e.dead) {
        G.damageEnemy(e, dmg, { source:'melee', crit, x:e.x, y:e.y, dir:a, knock:0.9, player:this });
        this.applyOnHit(e, G, crit); hits++;
      }
    }

    /* power shot: a thrown spear that pierces */
    if (isPower || st.atkProjectile) {
      const n = 1 + (st.multishot || 0);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.16;
        spawnProjectile({
          x: this.x + Math.cos(this.aim) * 20, y: this.y + Math.sin(this.aim) * 20,
          vx: Math.cos(this.aim + off) * 640, vy: Math.sin(this.aim + off) * 640,
          dmg: this.attackDamage() * 1.5 * (isPower ? 2.2 : 1) * (1 + (st.projDmg || 0)), friendly: true, owner: this, persp: 'spear',
          pierce: 999, life: 1.2, radius: 8, crit: Math.random() < st.crit, knock: 1.2,
          effects: this.projectileRiders(),
          homing: st.homing ? 3 : 0
        });
      }
    }

    /* attack riders: waves, bolts, flags */
    if (st.waveOnHit) G.playerWave(this.x, this.y, reach * 0.8, st.waveDmg || 18, this.aim);
    if (st.boltOnHit && Math.random() < st.boltOnHit) {
      const t = G.nearestEnemy(this.x, this.y, 420);
      if (t) G.strikeLightning(t.x, t.y, this.attackDamage() * 0.8, 4);
    }
    if (st.stormOnRoom && Math.random() < 0.10) {
      const t = G.nearestEnemy(this.x, this.y, 400);
      if (t) G.strikeLightning(t.x, t.y, this.attackDamage() * 0.6, 3);
    }
    if(K.RunSystems&&K.RunSystems.hasTransform(G.run,'ricochet_strike')&&this.attackCount%3===0){
      const target=G.nearestEnemy(this.x,this.y,640);if(target)E.spawnProjectile({x:this.x,y:this.y,vx:Math.cos(this.aim)*620,vy:Math.sin(this.aim)*620,dmg:this.attackDamage()*1.35,friendly:true,persp:'skyfire',life:1.2,radius:10,pierce:2,homing:4});
    }

    /* swing visual */
    E.effects.push({
      kind: 'swing', x: this.x, y: this.y, dir: this.aim, reach, arc,
      life: 0.14, max: 0.14, color: st.bladeColor || '#f0e6c8', combo: this.comboStep
    });
    if (doubleStrike) {
      E.effects.push({
        kind: 'swing', x: this.x, y: this.y, dir: this.aim + 0.9, reach: reach * 0.9, arc,
        life: 0.12, max: 0.12, color: '#f0e6c8', combo: this.comboStep
      });
    }
    return hits;
  };

  Player.prototype.projectileRiders = function () {
    const st = this.stats, r = {};
    if (st.poison) r.poison = { dps: st.poison.dps * (1 + (st.poisonTick || 0)), dur: st.poison.dur };
    if (st.bleed) r.bleed = st.bleed;
    if (st.burnOnHit) r.burn = st.burnOnHit;
    if (st.slowOnHit) r.slow = st.slowOnHit;
    if (st.weaken) r.weaken = st.weaken;
    return (r.poison || r.bleed || r.burn || r.slow || r.weaken) ? r : null;
  };

  Player.prototype.applyOnHit = function (e, G, crit) {
    const st = this.stats;
    if (st.bleed) G.applyStatus(e, 'bleed', st.bleed);
    if (st.poison) G.applyStatus(e, 'poison', { dps: st.poison.dps * (1 + (st.poisonTick || 0)), dur: st.poison.dur });
    if (st.burnOnHit) G.applyStatus(e, 'burn', st.burnOnHit);
    if (st.slowOnHit) G.applyStatus(e, 'slow', { amount: st.slowOnHit, dur: 2.0 });
    if (st.winterOnHit) G.applyStatus(e, 'chill', { amount: 0.3, dur: 3.0 });
    if (st.weaken) G.applyStatus(e, 'weaken', { amount: st.weaken, dur: 4 });
    if (st.critMark) G.applyStatus(e, 'mark', { amount: st.critMark, dur: 5 });
    if (st.charm && Math.random() < st.charm) G.charmEnemy(e);
    if (st.stagger && Math.random() < st.stagger) G.applyStatus(e, 'stun', { dur: 0.6 });
    if (st.rootOnHit && Math.random() < st.rootOnHit) G.applyStatus(e, 'root', { dur: 1.2 });
    if (st.doomOnHit) {
      G.applyStatus(e, 'doom', { dur: 1.2, dmg: (st.doomDmg || 50) * (1 + G.run.godCount('ares') * 0.15) });
    }
    if (st.forgeOnHit && Math.random() < st.forgeOnHit) {
      spawnProjectile({
        x: this.x, y: this.y, vx: Math.cos(this.aim) * 380, vy: Math.sin(this.aim) * 380,
        dmg: this.attackDamage() * 0.5, friendly: true, persp: 'magma', aoe: 40, aoeDmg: this.attackDamage() * 0.4, life: 1.0
      });
    }
    if (st.lifesteal) { this.heal(this.attackDamage() * st.lifesteal, G); }
    if (st.coinOnHit && Math.random() < st.coinOnHit) G.dropObol(e.x, e.y, 1);
    if (st.knock && st.knock > 1) {
      const a = U.ang(this.x, this.y, e.x, e.y);
      G.knockback(e, a, 60 * (st.knock - 1));
    }
    if (st.chain) {
      G.chainLightning(e, st.chain.n, st.chain.dmg * (1 + G.run.godCount('zeus') * 0.1), st.chain.mul);
    }
  };

  /* ============================================================
     PLAYER ABILITIES
     Each is a distinct answer to a distinct problem: Guard is
     defence, Cast is reach, Rush is escape, Ascend is the panic
     button. All four are pulled from the gods, so each one also
     scales with the build through compileStats().
     ============================================================ */

  /* --- GUARD: a held shield. Blocks harm from the front arc, reflects
         projectiles, staggers whatever touches it, and parries for a
         damage window if raised at the moment of impact. --- */
  const GUARD_WINDOW = 0.55;    // seconds the guard is held, before boons
  const GUARD_PARRY = 0.14;     // raising it inside this counts as a parry

  /* The one place that decides which points of the arc a guard covers. */
  Player.prototype.guardCovers = function (incidentAngle) {
    return incidentAngle === null || Math.abs(U.angDiff(this.guardDir, incidentAngle)) <= 1.31;
  };

  Player.prototype.startGuard = function (G) {
    const st = this.stats;
    if (this.guardRecover > 0) return;
    this.guardWindow = GUARD_WINDOW * (st.guardMul || 1);
    this.guardT = this.guardWindow;
    this.guardDir = this.aim;
    this.guardCd = 1.5 * (st.guardCdMul || 1);
    this.guarding = true;
    K.Audio.sfx('shield');
    E.effects.push({ kind: 'shieldRing', x: this.x, y: this.y, r: this.radius + 16, life: 0.24, max: 0.24, color: '#8fb8ff' });
  };
  Player.prototype.guardIsFresh = function () {
    return (this.guardWindow || GUARD_WINDOW) - this.guardT < GUARD_PARRY;
  };

  /* Called by the world when something tries to hurt the player.
     Returns the fraction of the hit that gets through. */
  Player.prototype.absorb = function (amount, source, kind, G) {
    if (this.guardT <= 0) return 1;
    let inc = null;
    if (source && source.x !== undefined) inc = U.ang(this.x, this.y, source.x, source.y);
    else if (kind === 'projectile' && source) inc = Math.atan2(source.vy, source.vx) + Math.PI;
    /* only a frontal arc is covered */
    if (!this.guardCovers(inc)) return 1;

    this.guardFlash = 1;
    const back = (inc === null ? this.aim + Math.PI : inc);
    this.knockVX += Math.cos(back) * 90;
    this.knockVY += Math.sin(back) * 90;

    /* a parry: the guard was raised moments before the impact */
    if (this.guardIsFresh()) {
      this.perfect = 0.6;
      this.parryCount++;
      this.invuln = Math.max(this.invuln, 0.3);
      E.cam.addShake(6);
      K.Audio.sfx('crit');
      G.floatText(this.x, this.y - 34, 'PARRY!', '#8fe3c8', true);
      G.flashScreen('rgba(180,220,255,0.22)', 0.3);
      E.effects.push({ kind: 'nova', x: this.x, y: this.y, r: 120, life: 0.34, max: 0.34, color: '#8fb8ff' });
      /* the parry staggers and damages everything in front of you */
      for (const e of E.enemies) {
        if (e.dead || e.ally) continue;
        const d = U.dist(this.x, this.y, e.x, e.y);
        if (d > 150 + e.radius) continue;
        const a = U.ang(this.x, this.y, e.x, e.y);
        if (!this.guardCovers(a)) continue;
        G.damageEnemy(e, this.attackDamage() * 1.6, { source: 'parry', x: e.x, y: e.y, dir: a, knock: 2.4, player: this });
        if (!e.isBoss) G.applyStatus(e, 'stun', { dur: 1.1 });
        if (this.stats.bleed) G.applyStatus(e, 'bleed', this.stats.bleed);
      }
      if(K.RunSystems&&K.RunSystems.hasTransform(G.run,'parry_burst')){
        G.playerWave(this.x,this.y,205,this.attackDamage()*0.72,this.guardDir);
        E.effects.push({kind:'wave',x:this.x,y:this.y,r:205,life:0.42,max:0.42,frame:9});
      }
      return 0;
    }

    /* ordinary block: most of it stopped, a little still gets through */
    const reduced = amount * 0.22;
    G.floatText(this.x, this.y - 30, 'BLOCK', '#8fb8ff');
    K.Audio.sfx('stone');
    E.cam.addShake(3);
    return reduced / Math.max(0.0001, amount);
  };

  /* --- CAST: hurl a spear that bursts into a lingering rift --- */
  Player.prototype.doCast = function (G) {
    const st = this.stats;
    this.castCd = 1.9 * (st.castCdMul || 1);
    this.attackAnim = 0.6;
    const dmg = (st.castDamage || this.attackDamage() * 1.9);
    const speed = 760;
    const ang = this.aim;
    const angles=K.RunSystems&&K.RunSystems.hasTransform(G.run,'split_cast')?[-0.24,0,0.24]:[0];
    angles.forEach((offset)=>E.spawnProjectile({
      x: this.x + Math.cos(ang) * 18, y: this.y + Math.sin(ang) * 18,
      vx: Math.cos(ang+offset) * speed, vy: Math.sin(ang+offset) * speed,
      dmg: dmg * (1 + (st.projDmg || 0)), friendly: true, owner: this, persp: 'spear', life: 1.4, radius: 10,
      crit: Math.random() < st.crit, knock: 1.4,
      effects: this.projectileRiders(),
      onDeath: (proj) => {
        /* the rift: a lingering hazard where the spear lands */
        G.addHazard({
          x: proj.x, y: proj.y, radius: 74, life: 2.6, maxLife: 2.6,
          dmg: dmg * 0.32, tick: 0.3, friendly: true,
          color: st.gods && st.gods.hades ? '#9a7ad8' : '#5fd0d8'
        });
        E.effects.push({ kind: 'nova', x: proj.x, y: proj.y, r: 90, life: 0.4, max: 0.4, color: '#5fd0d8' });
        E.cam.addShake(4);
        K.Audio.sfx('explode');
        if (st.waveOnHit) G.playerWave(proj.x, proj.y, 90, st.waveDmg || 20, undefined);
        if (st.boltOnHit) G.strikeLightning(proj.x, proj.y, dmg * 0.6, 5, 0);
      }
    }));
    const echoCount = typeof st.castEcho === 'number' && Number.isFinite(st.castEcho) ? Math.max(0, Math.min(6, Math.floor(st.castEcho))) : 0;
    for (let i = 0; i < echoCount; i++) {
      const offset = (i - (echoCount - 1) / 2) * 0.22;
      E.spawnProjectile({
        x:this.x - Math.cos(ang) * 8, y:this.y - Math.sin(ang) * 8,
        vx:Math.cos(ang + offset) * speed * 0.85, vy:Math.sin(ang + offset) * speed * 0.85,
        dmg:dmg * (1 + (st.projDmg || 0)) * 0.5, friendly:true, owner:this, persp:'spear',
        life:1.4, radius:6, size:4, homing:3, crit:Math.random() < st.crit, knock:0.7,
        effects:this.projectileRiders()
      });
    }
    K.Audio.sfx('whoosh');
    E.effects.push({ kind: 'swing', x: this.x, y: this.y, dir: ang, reach: 40, arc: 1.0, life: 0.12, max: 0.12, color: '#bfe8ff', combo: 1 });
  };

  /* --- RUSH: a long, invulnerable charge that scatters what it hits --- */
  Player.prototype.doRush = function (G) {
    const st = this.stats;
    this.rushCd = 6.5 * (st.rushCdMul || 1);
    const mv = K.Input.moveVec();
    this.rushDir = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : this.aim;
    this.rushT = 0.34;
    this._dashHit = null;
    this.knockVX = 0; this.knockVY = 0;
    this.invuln = Math.max(this.invuln, 0.42);
    E.cam.addShake(5);
    K.Audio.sfx('dash');
    K.Audio.sfx('whoosh');
    E.effects.push({ kind: 'nova', x: this.x, y: this.y, r: 70, life: 0.3, max: 0.3, color: '#8fe3c8' });
    E.particles.burst(this.x, this.y, 22, () => {
      const a = this.rushDir + Math.PI + (Math.random() - 0.5) * 1.0;
      return { x: this.x, y: this.y, vx: Math.cos(a) * 90 * Math.random(), vy: Math.sin(a) * 90 * Math.random(), life: 0.4, max: 0.4, size: 3.6, color: '#8fe3c8', glow: true, add: true, drag: 0.87 };
    });
  };

  /* --- ASCEND: brief godhood. Untouchable, empowered, fast. --- */
  Player.prototype.doAscend = function (G) {
    const st = this.stats;
    this.ascendCd = 30 * (st.ascendCdMul || 1);
    this.ascendT = 5.5 * (st.ascendMul || 1);
    this.ascendFlash = 0;
    this.invuln = Math.max(this.invuln, this.ascendT);
    G.recalcStats();          // pick up the Ascend empowerment immediately
    K.Audio.sfx('bell');
    K.Audio.sfx('victory');
    E.cam.addShake(12);
    G.flashScreen('rgba(255,235,170,0.45)', 0.55);
    E.effects.push({ kind: 'nova', x: this.x, y: this.y, r: 260, life: 0.7, max: 0.7, color: '#ffe9a0' });
    G.toast('ASCENSION — you are untouchable', '#f0cf5e', true);
    for (const e of E.enemies) {
      if (e.dead || e.ally) continue;
      G.knockback(e, U.ang(this.x, this.y, e.x, e.y), 520);
      G.damageEnemy(e, this.attackDamage() * 0.8, { source: 'ascend', x: e.x, y: e.y, player: this });
    }
    E.particles.burst(this.x, this.y, 46, () => {
      const a = Math.random() * TAU, s = 140 + Math.random() * 380;
      return { x: this.x, y: this.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.0, max: 1.0, size: 4, color: '#ffe9a0', glow: true, add: true, drag: 0.9, shape: 'spark', rot: a, vrot: 9 };
    });
  };

  Player.prototype.doWrath = function (G) {
    const st = this.stats;
    const cd = (G.run.weapon === 'xiphos' ? 3.4 : 3.4) * (st.specialCdMul || 1);
    this.specialCd = cd;
    K.Audio.sfx('explode');
    E.cam.addShake(7);
    const dmg = st.specialDamage * (1 + this.killStacks * (st.killStack || 0));
    const r = 128;
    ringFx(G, this.x, this.y, r, '#f0cf5e', 26);
    E.effects.push({ kind: 'nova', x: this.x, y: this.y, r, life: 0.34, max: 0.34, color: '#f0cf5e' });
    let wrathHits = 0;
    for (const e of E.enemies) {
      if (e.dead || e.ally || e.hp <= 0) continue;
      const d = U.dist(this.x, this.y, e.x, e.y);
      if (d < r + e.radius) {
        const a = U.ang(this.x, this.y, e.x, e.y);
        G.damageEnemy(e, dmg, { source: 'wrath', x: e.x, y: e.y, dir: a, knock: 1.8, player: this });
        this.applyOnHit(e, G, false);
        wrathHits++;
      }
    }
    if(K.RunSystems&&K.RunSystems.hasTransform(G.run,'echo_wrath')){
      E.effects.push({kind:'wave',x:this.x,y:this.y,r:r*1.45,life:0.48,max:0.48,frame:5});
      for(const e of E.enemies)if(!e.dead&&!e.ally&&U.dist(this.x,this.y,e.x,e.y)<r*1.45+e.radius){G.damageEnemy(e,dmg*0.52,{source:'wrath-echo',x:e.x,y:e.y,dir:U.ang(this.x,this.y,e.x,e.y),player:this});this.applyOnHit(e,G,false);}
    }
    if (st.hammerTime) {
      E.effects.push({ kind: 'shockwave', x: this.x, y: this.y, r: r * 1.7, life: 0.45, max: 0.45, color: '#f0a04a' });
      G.addHazard({ x: this.x, y: this.y, radius: r * 1.5, life: 1.2, maxLife: 1.2, dmg: dmg * 0.3, tick: 0.3, friendly: true, color: '#f0a04a' });
    }
    if (st.waveOnHit) G.playerWave(this.x, this.y, r * 1.2, (st.waveDmg || 20) * 1.4, this.aim);
    if (st.dashShield) this.addShield(st.dashShield, G);
    if (st.darkBonus && wrathHits > 0) this.heal(st.maxHp * st.darkBonus, G);
    if (st.doomOnHit) {
      for (const e of E.enemies) {
        if (e.dead || e.ally) continue;
        if (U.dist(this.x, this.y, e.x, e.y) < r * 1.6) {
          G.applyStatus(e, 'doom', { dur: 1.2, dmg: (st.doomDmg || 50) * 0.8 });
        }
      }
    }
    E.particles.burst(this.x, this.y, 22, () => {
      const a = Math.random() * TAU, s = 90 + Math.random() * 260;
      return { x: this.x, y: this.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.42, max: 0.42, size: 3.6, color: '#ffe9a0', glow: true, add: true, shape: 'spark', rot: a, vrot: 9, drag: 0.88 };
    });
  };

  Player.prototype.addShield = function (n, G) {
    this.shield = Math.min(this.stats.maxShield, this.shield + n);
    E.effects.push({ kind: 'shieldRing', x: this.x, y: this.y, r: this.radius + 12, life: 0.3, max: 0.3, color: '#8fb8ff' });
  };
  Player.prototype.heal = function (n, G) {
    if (n <= 0) return;
    if (G && G.run && G.run.trialModifiers) n *= G.run.trialModifiers.healing;
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
    if (this.hp > before && Math.random() < 0.5) K.Audio.sfx('heal');
  };

  E.Player = Player;

  /* ============================================================
     ENEMY
     ============================================================ */
  function Enemy(typeId, x, y, G, mods) {
    mods = mods || {};
    const base = D.ENEMIES[typeId];
    this.type = base;
    this.id = typeId;
    this.familyId = base.familyId || base.sourceId || typeId;
    this.visualKey = base.visualKey || base.sourceId || typeId;
    this.visualCell = base.visualCell || 0;
    this.catalogCreature = !!base.catalogCreature;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.homeX = x; this.homeY = y;
    const tier = mods.tier || 0;
    const ts = D.TIER_SCALE[Math.min(D.TIER_SCALE.length - 1, tier)];
    this.radius = base.radius;
    this.maxHp = Math.round(base.hp * ts.hp * (mods.hpMul || 1));
    this.hp = this.maxHp;
    this.dmg = Math.round(base.dmg * ts.dmg * (mods.dmgMul || 1));
    this.speed = base.spd * ts.spd * (mods.spdMul || 1);
    this.attackTempoMul = Math.max(1, mods.attackTempoMul || 1);
    this.color = base.color;
    this.ai = base.ai;
    this.opts = base.ai_opts || {};
    this.ally = !!mods.ally || !!base.ally;
    this.elite = !!mods.elite;
    this.summoned = !!mods.summoned || !!base.summon;
    this.runXpEligible = mods.runXpEligible === undefined ? (!this.ally && !this.summoned) : (!!mods.runXpEligible && !this.ally);
    this.runXpRank = mods.runXpRank === undefined ? base.runXpRank : mods.runXpRank;
    this.runXpAwarded = false;
    this.isBoss = false;
    this.dead = false;
    this.removeMe = false;
    this.anim = 0;
    this.hurtFlash = 0;
    this.statuses = {};
    this.face = 1;
    this.atkCd = Math.random() * 1.2;
    this.state = 'idle';
    this.stateT = 0;
    this.telegraph = 0;
    this.chargeVX = 0; this.chargeVY = 0;
    this.contactCd = 0;
    this.wanderA = Math.random() * TAU;
    this.wanderT = 0;
    this.breath = Math.random() * TAU;
    this.stunT = 0;
    this.knockVX = 0; this.knockVY = 0;
    this.deathT = 0;
    this.sleeping = false;
    this.spawnT = 0.45;
    this.hpBarT = 0;
    this.charmT = 0;
    this.phase = 0;
    this.tickAcc = 0;
    if (this.elite) {
      this.maxHp = Math.round(this.maxHp * 2.0); this.hp = this.maxHp;
      this.dmg = Math.round(this.dmg * 1.3);
      this.scaleElite = 1.22;
    }
    if (this.ally) { this.hp = this.maxHp; }
  }

  Enemy.prototype.statusSpeed = function () {
    let m = 1;
    if (this.statuses.slow) m *= 1 - this.statuses.slow.amount;
    if (this.statuses.chill) m *= 1 - this.statuses.chill.amount;
    if (this.statuses.root || this.statuses.stun) m = 0;
    return m;
  };
  Enemy.prototype.statusDamage = function () {
    let m = 1;
    if (this.statuses.mark) m *= 1 + (this.statuses.mark.amount || 0.2);
    if (this.statuses.chill) m *= 1.25;
    return m;
  };
  Enemy.prototype.canAct = function () {
    return !this.statuses.stun && !this.statuses.root && this.spawnT <= 0 && !this.dead;
  };

  // Status durations use elapsed game time. Pay any final partial DoT tick at expiry.
  function updateEnemyStatuses(e, dt, G) {
    for (const key in e.statuses) {
      const s = e.statuses[key], active = Math.max(0, Math.min(dt, s.t));
      s.t -= dt;
      const expired = s.t <= 1e-9;
      if (key === 'poison' || key === 'burn' || key === 'bleed') {
        s.tick = (s.tick || 0) + active;
        let damageTime = 0;
        while (s.tick >= 0.4 - 1e-9) { s.tick = Math.max(0, s.tick - 0.4); damageTime += 0.4; }
        if (expired) { damageTime += s.tick; s.tick = 0; }
        if (damageTime > 1e-9) G.damageEnemy(e, (s.dps || s.dmg || 8) * damageTime,
          { source:key, silent:true, noStatus:true, allowFractional:true, x:e.x, y:e.y });
        if (e.dead) return;
      }
      if (expired) { if (key === 'doom') G.detonateDoom(e, s); delete e.statuses[key]; }
    }
  }

  Enemy.prototype.update = function (dt, G) {
    dt = Math.min(0.08, Math.max(0, dt));
    /* aiDt scales with attackTempoMul (from trial modifiers). This means faster enemies
       have proportionally shorter telegraph/state timers. Player abilities use raw dt.
       Design decision: enemy speed increase affects both movement and decision timing. */
    const aiDt = dt * (this.attackTempoMul || 1);
    this.anim += dt;
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3.2);
    this.contactCd = Math.max(0, this.contactCd - dt);
    this.hpBarT = Math.max(0, this.hpBarT - dt);
    if (this.dead) {
      this.deathT += dt;
      this.vx *= 0.9; this.vy *= 0.9;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.deathT > 0.45) this.removeMe = true;
      return;
    }

    if (this.practiceDummy) { this.hp=this.maxHp; this.vx=0; this.vy=0; return; }
    updateEnemyStatuses(this, dt, G);
    if (this.dead) return;

    // charm: fight your kin
    if (this.statuses.charm) {
      this.charmT = this.statuses.charm.t;
      const foe = G.nearestEnemy(this.x, this.y, 300, this);
      if (foe) {
        const a = U.ang(this.x, this.y, foe.x, foe.y);
        this.vx = Math.cos(a) * this.speed * 1.1;
        this.vy = Math.sin(a) * this.speed * 1.1;
        this.x += this.vx * dt; this.y += this.vy * dt;
        G.collideWithWalls(this);
        if (U.dist(this.x, this.y, foe.x, foe.y) < this.radius + foe.radius + 4 && this.contactCd <= 0) {
          this.contactCd = 0.7;
          G.damageEnemy(foe, this.dmg * 1.4, { source: 'charm', x: foe.x, y: foe.y });
          hitFx(G, foe.x, foe.y, '#f08bb4', 8, 120);
        }
        return;
      }
    }
    if (!this.canAct()) {
      // stunned / rooted: still receive knockback
      this.applyKnock(dt, G);
      return;
    }

    this.stateT += aiDt;
    this.breath += dt;
    const p = G.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const distP = Math.hypot(dx, dy) || 1;
    const angP = Math.atan2(dy, dx);
    if (Math.abs(Math.cos(angP)) > 0.2) this.face = Math.cos(angP) > 0 ? 1 : -1;

    const SPEED = this.speed * this.statusSpeed() * (this.statuses.weaken ? (1 - this.statuses.weaken.amount * 0.5) : 1);

    switch (this.ai) {
      case 'lunge':       this.aiLunge(aiDt, G, p, angP, distP, SPEED); break;
      case 'lurcher':     this.aiLurcher(aiDt, G, p, angP, distP, SPEED); break;
      case 'charger':     this.aiCharger(aiDt, G, p, angP, distP, SPEED); break;
      case 'dive':        this.aiDive(aiDt, G, p, angP, distP, SPEED); break;
      case 'shooter':     this.aiShooter(aiDt, G, p, angP, distP, SPEED); break;
      case 'skirmish':    this.aiSkirmish(aiDt, G, p, angP, distP, SPEED); break;
      case 'kiter':       this.aiKiter(aiDt, G, p, angP, distP, SPEED); break;
      case 'petrifier':   this.aiPetrifier(aiDt, G, p, angP, distP, SPEED); break;
      case 'brute':       this.aiBrute(aiDt, G, p, angP, distP, SPEED); break;
      case 'shielder':    this.aiShielder(aiDt, G, p, angP, distP, SPEED); break;
      case 'summoner':    this.aiSummoner(aiDt, G, p, angP, distP, SPEED); break;
      case 'fury':        this.aiFury(aiDt, G, p, angP, distP, SPEED); break;
      case 'exploder':    this.aiExploder(aiDt, G, p, angP, distP, SPEED); break;
      case 'hundred':     this.aiHundred(aiDt, G, p, angP, distP, SPEED); break;
      case 'duelist':     this.aiDuelist(aiDt, G, p, angP, distP, SPEED); break;
      default:            this.aiLunge(aiDt, G, p, angP, distP, SPEED); break;
    }

    if(this.isMiniBoss){
      this.miniBossCd=Math.max(0,(this.miniBossCd===undefined?2.2:this.miniBossCd)-aiDt);
      if(this.miniDashT>0){this.miniDashT=Math.max(0,this.miniDashT-aiDt);this.vx=Math.cos(this.miniBossAim)*520;this.vy=Math.sin(this.miniBossAim)*520;}
      if(this.miniBossWindup>0){
        this.miniBossWindup-=aiDt;this.vx*=0.9;this.vy*=0.9;
        if(this.miniBossWindup<=0){
          if(this.miniBossSignature==='shield_rush'){this.miniBossAim=U.ang(this.x,this.y,p.x,p.y);this.miniDashT=0.38;K.Audio.sfx('whoosh');}
          else if(this.miniBossSignature==='ember_dive'){
            for(let i=-1;i<=1;i++)E.spawnProjectile({owner:this,x:this.x,y:this.y,vx:Math.cos(angP+i*0.26)*440,vy:Math.sin(angP+i*0.26)*440,dmg:this.dmg*0.8,friendly:false,persp:'fireball',life:1.6,radius:13});
          } else G.enemySlam(this,205,this.dmg*1.5);
        }
      }else if(this.miniBossCd<=0){
        this.miniBossWindup=0.78;this.miniBossCd=4.2;this.miniBossAim=angP;
        E.effects.push({kind:'telegraph',x:this.x,y:this.y,r:190,life:0.78,max:0.78,color:this.color,frame:6});
      }
    }

    this.applyKnock(dt, G);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    G.collideWithWalls(this);

    // separation from kin
    G.separate(this, dt);

    // contact damage
    if (!this.ally && this.contactCd <= 0 && U.dist(this.x, this.y, p.x, p.y) < this.radius + p.radius) {
      if (G.damagePlayer(this.dmg * (this.isBoss ? 1.0 : 0.85), this, 'contact')) {
        this.contactCd = 0.55;
        const a = U.ang(this.x, this.y, p.x, p.y);
        G.knockback(p, a, 180);
      }
    }
  };

  Enemy.prototype.applyKnock = function (dt, G) {
    if (Math.abs(this.knockVX) > 1 || Math.abs(this.knockVY) > 1) {
      this.x += this.knockVX * dt; this.y += this.knockVY * dt;
      const d = Math.pow(0.0009, dt);
      this.knockVX *= d; this.knockVY *= d;
    } else { this.knockVX = 0; this.knockVY = 0; }
  };

  Enemy.prototype.moveTo = function (a, spd, dt, weight) {
    const w = weight === undefined ? 1 : weight;
    this.vx = U.lerp(this.vx, Math.cos(a) * spd, 1 - Math.pow(0.0015, dt * w));
    this.vy = U.lerp(this.vy, Math.sin(a) * spd, 1 - Math.pow(0.0015, dt * w));
  };
  Enemy.prototype.strafe = function (a, spd, dt) {
    const t = a + Math.PI / 2;
    this.vx = U.lerp(this.vx, Math.cos(t) * spd, 1 - Math.pow(0.004, dt));
    this.vy = U.lerp(this.vy, Math.sin(t) * spd, 1 - Math.pow(0.004, dt));
  };

  /* ---- AI archetypes ---- */
  Enemy.prototype.aiLunge = function (dt, G, p, a, d, spd) {
    if (this.telegraph > 0) {
      this.telegraph -= dt;
      this.vx *= 0.86; this.vy *= 0.86;
      if (this.telegraph <= 0) {
        const o = this.opts;
        const sp = 380;
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
        this.lungeT = 0.24;
      }
      return;
    }
    if (this.lungeT > 0) { this.lungeT -= dt; this.vx *= 0.93; this.vy *= 0.93; return; }
    if (d < (this.opts.lungeRange || 90) && this.atkCd <= 0) {
      this.atkCd = (this.opts.lungeCd || 1.5);
      this.telegraph = this.opts.telegraph || 0.4;
      return;
    }
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.moveTo(a, spd, dt, 1.1);
  };

  Enemy.prototype.aiLurcher = function (dt, G, p, a, d, spd) {
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.hopT > 0) { this.hopT -= dt; this.vx *= 0.94; this.vy *= 0.94; return; }
    if (this.winding) {
      this.telegraph -= dt;
      this.vx *= 0.8; this.vy *= 0.8;
      if (this.telegraph <= 0) {
        this.winding = false;
        this.vx = Math.cos(this.hopA) * this.hopSpd;
        this.vy = Math.sin(this.hopA) * this.hopSpd;
        this.hopT = 0.28;
        hitFx(G, this.x, this.y, this.color, 4, 80);
      }
      return;
    }
    if (this.atkCd <= 0 && d < 420) {
      this.atkCd = this.opts.hopCd || 0.9;
      this.telegraph = this.opts.telegraph || 0.3;
      this.winding = true;
      this.hopA = a;
      this.hopSpd = (this.opts.hopDist || 120) / 0.28;
      return;
    }
    this.moveTo(a, spd * 0.7, dt, 0.8);
  };

  Enemy.prototype.aiCharger = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.state === 'windup') {
      this.telegraph -= dt;
      this.vx *= 0.8; this.vy *= 0.8;
      if (chancePerSecond(24, dt)) {
        E.particles.spawn({ x: this.x + (Math.random() - 0.5) * 30, y: this.y + (Math.random() - 0.5) * 30, vx: 0, vy: -40, life: 0.3, max: 0.3, size: 2.6, color: '#ff8a6a', glow: true, add: true });
      }
      if (this.telegraph <= 0) {
        this.state = 'charge';
        this.stateT = 0;
        this.chargeVX = Math.cos(this.aimLunge) * o.chargeSpeed;
        this.chargeVY = Math.sin(this.aimLunge) * o.chargeSpeed;
        K.Audio.sfx('whoosh');
      }
      return;
    }
    if (this.state === 'charge') {
      this.vx = this.chargeVX; this.vy = this.chargeVY;
      if (chancePerSecond(40, dt)) {
        E.particles.spawn({ x: this.x, y: this.y + 8, vx: (Math.random() - 0.5) * 60, vy: -20, life: 0.3, max: 0.3, size: 3, color: 'rgba(200,180,150,0.6)', drag: 0.9 });
      }
      if (this.stateT > o.chargeTime) { this.state = 'idle'; this.stateT = 0; this.atkCd = o.chargeCd; this.vx *= 0.3; this.vy *= 0.3; }
      return;
    }
    if (this.atkCd <= 0 && d < o.chargeRange) {
      this.state = 'windup';
      this.aimLunge = a;
      this.telegraph = o.windup || 0.5;
      return;
    }
    // approach, preferring straight lines
    this.moveTo(a, spd, dt, 1.0);
  };

  Enemy.prototype.aiDive = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.state === 'windup') {
      this.telegraph -= dt;
      const orbit = o.orbit || 160;
      const want = a + Math.PI;
      const tx = p.x + Math.cos(want) * orbit, ty = p.y + Math.sin(want) * orbit;
      const ta = U.ang(this.x, this.y, tx, ty);
      this.moveTo(ta, spd * 0.9, dt, 0.7);
      if (this.telegraph <= 0) {
        this.state = 'dive';
        this.stateT = 0;
        this.chargeVX = Math.cos(a) * o.diveSpeed;
        this.chargeVY = Math.sin(a) * o.diveSpeed;
        K.Audio.sfx('whoosh');
      }
      return;
    }
    if (this.state === 'dive') {
      this.vx = U.lerp(this.vx, this.chargeVX, 1 - Math.pow(0.02, dt));
      this.vy = U.lerp(this.vy, this.chargeVY, 1 - Math.pow(0.02, dt));
      if (U.dist(this.x, this.y, p.x, p.y) < this.radius + p.radius + 6 && this.contactCd <= 0) {
        this.contactCd = 0.9;
        G.damagePlayer(this.dmg, this, 'dive');
        G.knockback(p, a, 220);
      }
      if (this.stateT > 0.6) { this.state = 'idle'; this.stateT = 0; this.atkCd = o.diveCd || 2.2; }
      return;
    }
    // circle at range
    const orbit = o.orbit || 160;
    if (d > orbit + 30) this.moveTo(a, spd, dt, 0.9);
    else if (d < orbit - 40) this.moveTo(a + Math.PI, spd * 0.8, dt, 0.9);
    else this.strafe(a, spd * 0.85, dt);
    if (this.atkCd <= 0) { this.state = 'windup'; this.telegraph = o.telegraph || 0.45; }
  };

  Enemy.prototype.aiShooter = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.burstLeft > 0) {
      this.burstT -= dt;
      this.vx *= 0.9; this.vy *= 0.9;
      if (this.burstT <= 0) {
        this.burstLeft--; this.burstT = 0.16;
        this.fireShot(a, o);
      }
      return;
    }
    const keep = o.keepAway || 230;
    if (d < keep - 50) this.moveTo(a + Math.PI, spd * 0.85, dt, 0.9);
    else if (d > keep + 130) this.moveTo(a, spd * 0.75, dt, 0.8);
    else this.strafe(a, spd * 0.6, dt);
    if (this.atkCd <= 0 && d < (o.range || 440)) {
      this.atkCd = o.projCd || 2;
      this.burstLeft = o.burst || 1;
      this.burstT = 0;
    }
  };

  Enemy.prototype.fireShot = function (a, o) {
    const spread = o.spread || 0;
    const off = (Math.random() - 0.5) * spread * 0.4;
    const sp = o.projSpeed || 300;
    spawnProjectile({
      x: this.x + Math.cos(a) * (this.radius + 4), y: this.y + Math.sin(a) * (this.radius + 4),
      vx: Math.cos(a + off) * sp, vy: Math.sin(a + off) * sp,
      dmg: this.dmg * (this.isBoss ? 1 : 0.9), persp: o.proj || 'spark',
      homing: o.homingProj ? o.homingProj * 2.4 : 0, life: 3.0, aoe: o.projAoe || 0, owner:this
    });
    K.Audio.sfx(o.proj === 'boulder' || o.proj === 'rock' ? 'stone' : 'shoot');
  };

  Enemy.prototype.aiSkirmish = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.burstLeft > 0) {
      this.burstT -= dt;
      this.vx *= 0.86; this.vy *= 0.86;
      if (this.burstT <= 0) { this.burstLeft--; this.burstT = 0.14; this.fireShot(a, o); }
      return;
    }
    const orbit = o.orbit || 130;
    if (d > orbit + 40) this.moveTo(a, spd, dt, 1.0);
    else if (d < orbit - 40) this.moveTo(a + Math.PI, spd * 0.8, dt, 0.9);
    else this.strafe(a, spd * 0.9, dt);
    if (this.atkCd <= 0 && d < (o.range || 380)) {
      this.atkCd = o.burstCd || 2;
      this.burstLeft = o.burst || 2;
      this.burstT = 0;
    }
  };

  Enemy.prototype.aiKiter = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.state === 'gallop') {
      this.vx = this.chargeVX; this.vy = this.chargeVY;
      if (this.stateT > 0.45) { this.state = 'idle'; this.stateT = 0; }
      if (this.burstLeft > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) { this.burstLeft--; this.burstT = 0.15; this.fireShot(a, o); }
      }
      return;
    }
    const keep = o.keepAway || 240;
    if (d < keep) {
      this.moveTo(a + Math.PI, spd, dt, 1.4);
    } else if (this.atkCd <= 0 && d < (o.range || 480)) {
      this.atkCd = o.gallopCd || 3;
      this.state = 'gallop'; this.stateT = 0;
      const side = Math.random() < 0.5 ? 1 : -1;
      this.chargeVX = Math.cos(a + Math.PI / 2 * side) * spd * 1.3;
      this.chargeVY = Math.sin(a + Math.PI / 2 * side) * spd * 1.3;
      this.burstLeft = o.burst || 3;
      this.burstT = 0.1;
    } else {
      this.strafe(a, spd * 0.7, dt);
    }
  };

  Enemy.prototype.aiPetrifier = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.state === 'gaze') {
      this.gazeT -= dt;
      this.vx *= 0.9; this.vy *= 0.9;
      this.gazeA = U.turn(this.gazeA === undefined ? a : this.gazeA, a, 1.4, dt);
      // beam visual
      if (chancePerSecond(30, dt)) {
        const gd = 120 + Math.random() * (o.gazeRange || 340);
        E.particles.spawn({
          x: this.x + Math.cos(this.gazeA) * gd, y: this.y + Math.sin(this.gazeA) * gd,
          vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
          life: 0.3, max: 0.3, size: 3.4, color: '#b0d8a0', glow: true, add: true
        });
      }
      // does the beam catch the player?
      const pa = U.ang(this.x, this.y, p.x, p.y);
      const pd = U.dist(this.x, this.y, p.x, p.y);
      if (pd < (o.gazeRange || 340) && Math.abs(U.angDiff(this.gazeA, pa)) < (o.gazeArc || 0.55)) {
        if (G.damagePlayer(this.dmg * 0.5, this, 'gaze')) {
          G.applyPlayerStatus('petrified', { dur: o.petrifyDur || 1.1 });
          G.toast('PETRIFIED — dash to break free', '#b0b0b8');
        }
      }
      if (this.gazeT <= 0) { this.state = 'idle'; this.stateT = 0; this.atkCd = o.gazeCd || 3; }
      return;
    }
    if (this.state === 'wind') {
      this.telegraph -= dt;
      this.gazeA = U.turn(this.gazeA === undefined ? a : this.gazeA, a, 2.2, dt);
      this.vx *= 0.9; this.vy *= 0.9;
      if (this.telegraph <= 0) {
        this.state = 'gaze'; this.gazeT = o.gazeDur || 1.4;
        K.Audio.sfx('stone');
      }
      return;
    }
    if (d < (o.gazeRange || 340) * 0.85 && this.atkCd <= 0) {
      this.state = 'wind'; this.telegraph = o.gazeWind || 1.0;
      this.gazeA = a;
      return;
    }
    if (d > 260) this.moveTo(a, spd, dt, 0.6);
    else this.strafe(a, spd * 0.5, dt);
  };

  Enemy.prototype.aiBrute = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.slamCd = Math.max(0, (this.slamCd || 0) - dt);
    this.throwCd = Math.max(0, (this.throwCd || 0) - dt);
    if (this.state === 'windup') {
      this.telegraph -= dt;
      this.vx *= 0.78; this.vy *= 0.78;
      if (chancePerSecond(30, dt)) {
        E.particles.spawn({ x: this.x + (Math.random() - 0.5) * this.radius * 2, y: this.y + this.radius, vx: 0, vy: -70, life: 0.4, max: 0.4, size: 3, color: '#e2a06a', glow: true, add: true });
      }
      if (this.telegraph <= 0) {
        this.state = 'charge'; this.stateT = 0;
        this.chargeVX = Math.cos(this.aimLunge) * o.chargeSpeed;
        this.chargeVY = Math.sin(this.aimLunge) * o.chargeSpeed;
        E.cam.addShake(4); K.Audio.sfx('roar');
      }
      return;
    }
    if (this.state === 'charge') {
      this.vx = this.chargeVX; this.vy = this.chargeVY;
      if (chancePerSecond(30, dt)) {
        E.particles.spawn({ x: this.x, y: this.y + this.radius * 0.7, vx: (Math.random() - 0.5) * 90, vy: -30, life: 0.4, max: 0.4, size: 5, color: 'rgba(180,150,110,0.55)', drag: 0.9 });
      }
      if (this.stateT > (o.chargeTime || 0.5)) { this.state = 'idle'; this.stateT = 0; this.atkCd = o.chargeCd || 2.4; }
      return;
    }
    if (this.state === 'slam') {
      this.slamT -= dt;
      this.vx *= 0.8; this.vy *= 0.8;
      if (this.slamT <= 0) {
        this.state = 'idle'; this.stateT = 0;
        G.enemySlam(this, o.slamRange || 150, this.dmg * 1.2);
        this.slamCd = o.slamCd || 3.6;
      }
      return;
    }
    // decide
    if (o.slamRange && d < o.slamRange && this.slamCd <= 0) { this.state = 'slam'; this.slamT = 0.55; return; }
    if (o.proj && d > 180 && this.throwCd <= 0) {
      this.throwCd = o.throwCd || 2.4;
      this.fireShot(a, { proj: o.proj, projSpeed: o.projSpeed || 300, spread: 0 });
      return;
    }
    if (this.atkCd <= 0 && d < (o.chargeRange || 300) && d > 90) {
      this.state = 'windup'; this.aimLunge = a; this.telegraph = o.windup || 0.55; return;
    }
    this.moveTo(a, spd, dt, 0.55);
  };

  Enemy.prototype.aiShielder = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.facing = a;
    if (this.state === 'bash') {
      this.stateT += 0;
      this.vx = U.lerp(this.vx, Math.cos(this.aimLunge) * 460, 1 - Math.pow(0.05, dt));
      this.vy = U.lerp(this.vy, Math.sin(this.aimLunge) * 460, 1 - Math.pow(0.05, dt));
      if (this.bashT === undefined) this.bashT = 0.42;
      this.bashT -= dt;
      if (this.bashT <= 0) { this.bashT = undefined; this.state = 'idle'; this.atkCd = o.bashCd || 2.6; }
      return;
    }
    if (d < (o.bashRange || 96) && this.atkCd <= 0) {
      this.state = 'bash'; this.aimLunge = a;
      K.Audio.sfx('whoosh');
      return;
    }
    this.moveTo(a, spd, dt, 0.7);
    this.blockAngle = a;
  };

  Enemy.prototype.aiSummoner = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.summonCd = Math.max(0, (this.summonCd || o.summonCd || 5) - dt);
    if (d < 300) this.moveTo(a + Math.PI, spd, dt, 1.0);
    else if (d > 420) this.moveTo(a, spd * 0.7, dt, 0.8);
    else this.strafe(a, spd * 0.7, dt);
    if (this.atkCd <= 0 && d < 460) { this.atkCd = o.shootCd || 2; this.fireShot(a, o); }
    if (this.summonCd <= 0) {
      this.summonCd = o.summonCd || 5;
      G.summonFor(this, o.summonType, o.summonCount || 1);
      E.effects.push({ kind: 'summonRing', x: this.x, y: this.y, r: 60, life: 0.5, max: 0.5, color: this.color });
    }
  };

  Enemy.prototype.aiFury = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.tpCd = Math.max(0, (this.tpCd || 2) - dt);
    this.diveCd = Math.max(0, (this.diveCd || 1.5) - dt);
    if (this.state === 'lash') {
      this.stateT2 = (this.stateT2 || 0) + dt;
      this.vx *= 0.86; this.vy *= 0.86;
      if (this.stateT2 > 0.22 && !this.lashed) {
        this.lashed = true;
        G.enemyCone(this, a, 1.5, (o.lashRange || 180), this.dmg * 1.1, '#e2564a');
        K.Audio.sfx('swing');
      }
      if (this.stateT2 > 0.5) { this.state = 'idle'; this.stateT2 = 0; this.lashed = false; this.atkCd = o.whipCd || 1.6; }
      return;
    }
    if (this.state === 'wind') {
      this.telegraph -= dt; this.vx *= 0.8; this.vy *= 0.8;
      if (this.telegraph <= 0) {
        this.state = 'dive'; this.stateT = 0;
        this.chargeVX = Math.cos(a) * (o.diveSpeed || 480);
        this.chargeVY = Math.sin(a) * (o.diveSpeed || 480);
        K.Audio.sfx('whoosh');
      }
      return;
    }
    if (this.state === 'dive') {
      this.vx = this.chargeVX; this.vy = this.chargeVY;
      if (this.stateT > 0.32) { this.state = 'idle'; this.stateT = 0; this.diveCd = o.diveCd || 2; }
      return;
    }
    if (this.tpCd <= 0 && d > 220) {
      this.tpCd = o.teleportCd || 3.4;
      E.particles.burst(this.x, this.y, 16, () => ({ x: this.x, y: this.y, vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150, life: 0.4, max: 0.4, size: 3.4, color: '#a8231f', glow: true, add: true, drag: 0.88 }));
      const na = a + Math.PI + (Math.random() - 0.5) * 1.2;
      this.x = p.x + Math.cos(na) * 150;
      this.y = p.y + Math.sin(na) * 150;
      G.collideWithWalls(this);
      E.particles.burst(this.x, this.y, 16, () => ({ x: this.x, y: this.y, vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150, life: 0.4, max: 0.4, size: 3.4, color: '#e2564a', glow: true, add: true, drag: 0.88 }));
      K.Audio.sfx('whoosh');
      return;
    }
    if (this.atkCd <= 0 && d < (o.lashRange || 180)) { this.state = 'lash'; return; }
    if (this.diveCd <= 0 && d > 200 && d < 420) { this.state = 'wind'; this.telegraph = o.telegraph || 0.36; return; }
    this.moveTo(a, spd, dt, 1.3);
  };

  Enemy.prototype.aiExploder = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    if (this.fuseT !== undefined) {
      this.fuseT -= dt;
      this.vx *= 0.86; this.vy *= 0.86;
      this.flash = 1 + Math.sin(this.anim * 40) * 0.5;
      if (chancePerSecond(30, dt)) {
        E.particles.spawn({ x: this.x + (Math.random() - 0.5) * 16, y: this.y + (Math.random() - 0.5) * 16, vx: 0, vy: -30, life: 0.25, max: 0.25, size: 3, color: '#ffd27a', glow: true, add: true });
      }
      if (this.fuseT <= 0) { this.detonate(G); }
      return;
    }
    this.moveTo(a, spd, dt, 1.4);
    if (d < (o.fuseRange || 54)) { this.fuseT = o.fuse || 0.75; K.Audio.sfx('ui2'); }
  };

  Enemy.prototype.detonate = function (G) {
    const r = 92;
    ringFx(G, this.x, this.y, r, '#8fd8e8', 20);
    hitFx(G, this.x, this.y, '#5fd0d8', 20, 240);
    E.cam.addShake(6);
    K.Audio.sfx('explode');
    if (U.dist(this.x, this.y, G.player.x, G.player.y) < r + G.player.radius) {
      G.damagePlayer(this.dmg * 1.7, this, 'explosion');
    }
    for (const e of E.enemies) {
      if (e === this || e.dead || e.ally) continue;
      if (U.dist(this.x, this.y, e.x, e.y) < r) G.damageEnemy(e, this.dmg * 0.8, { source: 'explosion', x: e.x, y: e.y });
    }
    G.addHazard({ x: this.x, y: this.y, radius: r, life: 1.4, maxLife: 1.4, dmg: this.dmg * 0.25, tick: 0.4, friendly: false, owner:this, color: '#5fd0d8' });
    G.killEnemy(this, true);
  };

  Enemy.prototype.aiHundred = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.volleyCd = Math.max(0, (this.volleyCd || 2) - dt);
    if (this.state === 'sweepWind') {
      this.telegraph -= dt; this.vx *= 0.85; this.vy *= 0.85;
      if (this.telegraph <= 0) {
        G.enemyCone(this, a, o.sweepArc || 1.3, o.sweepRange || 150, this.dmg * 1.3, '#d8c9a0');
        E.cam.addShake(4); K.Audio.sfx('swing');
        this.state = 'idle'; this.atkCd = o.sweepCd || 2.4;
      }
      return;
    }
    if (this.volleyCd <= 0 && d < 420) {
      this.volleyCd = o.volleyCd || 2.2;
      const n = o.burst || 4;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * (o.spread || 0.9) / n;
        spawnProjectile({
          x: this.x, y: this.y, vx: Math.cos(a + off) * (o.projSpeed || 300), vy: Math.sin(a + off) * (o.projSpeed || 300),
          dmg: this.dmg * 0.7, persp: 'rock', life: 2.4, radius: 8, owner:this
        });
      }
      K.Audio.sfx('stone');
    }
    if (d < (o.sweepRange || 150) && this.atkCd <= 0) { this.state = 'sweepWind'; this.telegraph = 0.45; return; }
    this.moveTo(a, spd, dt, 0.7);
  };

  Enemy.prototype.aiDuelist = function (dt, G, p, a, d, spd) {
    const o = this.opts;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.parryT = Math.max(0, (this.parryT || 0) - dt);
    if (this.state === 'lunge') {
      this.stateT2 = (this.stateT2 || 0) + dt;
      this.vx = Math.cos(this.aimLunge) * (o.lungeSpeed || 500);
      this.vy = Math.sin(this.aimLunge) * (o.lungeSpeed || 500);
      if (this.stateT2 > 0.22) {
        this.state = 'idle'; this.stateT2 = 0;
        this.parryT = 0.25;
        this.atkCd = o.lungeCd || 1.5;
      }
      return;
    }
    if (this.state === 'wind') {
      this.telegraph -= dt; this.vx *= 0.84; this.vy *= 0.84;
      if (this.telegraph <= 0) { this.state = 'lunge'; this.stateT2 = 0; K.Audio.sfx('swing'); }
      return;
    }
    if (d < (o.comboRange || 100) && this.atkCd <= 0) {
      this.state = 'wind'; this.telegraph = o.telegraph || 0.4; this.aimLunge = a;
      return;
    }
    this.moveTo(a, spd, dt, 1.1);
  };

  /* projectile blocking for shield-bearing foes (summons and bosses have no
     ai_opts, so they simply never block) */
  Enemy.prototype.blocksFrom = function (proj, G) {
    if (!this.opts || !this.opts.block) return false;
    const inc = Math.atan2(proj.y - this.y, proj.x - this.x);
    const fa = this.blockAngle === undefined ? inc : this.blockAngle;
    return Math.abs(U.angDiff(fa, inc)) < (this.opts.shieldArc || 1.5) / 2;
  };

  /* ============================================================
     BOSS  (extends the Enemy shape but with scripted attacks)
     ============================================================ */
  function Boss(id, x, y, G, mods) {
    const b = D.BOSSES[id];
    mods = mods || {};
    this.def = b;
    this.id = id;
    this.familyId = b.familyId || b.sourceId || id;
    this.visualKey = b.visualKey || b.sourceId || id;
    this.isBoss = true;
    this.isPlayer = false;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = b.radius;
    this.maxHp = Math.round(b.hp * (mods.hpMul || 1));
    this.hp = this.maxHp;
    this.dmg = Math.round(D.ENEMIES.hoplite.dmg * 2.2 * (mods.dmgMul || 1));
    this.speed = 118 * (mods.spdMul || 1);
    this.attackTempoMul = Math.max(1, mods.attackTempoMul || 1);
    this.color = b.color;
    this.dead = false;
    this.removeMe = false;
    this.statuses = {};
    this.statusImmune = { stun: 1, root: 1, charm: 1, petrified: 1 };
    this.anim = 0;
    this.hurtFlash = 0;
    this.phase = 0;
    this.state = 'idle';
    this.stateT = 0;
    this.atkCd = 2.0;
    this.telegraph = 0;
    this.face = 1;
    this.spawnT = 1.1;
    this.contactCd = 0;
    this.knockVX = 0; this.knockVY = 0;
    this.breath = 0;
    this.hpBarT = 99;
    this.dialogueT = 0;
    this.parryT = 0;
    this.mem = {};          // per-boss scratch
    this.entered = false;
    this.deathT = 0;
    this.staggerT = 0;
    this.stageQueue = [];
    this.stageReached = 0;
    this.stageTransitionT = 0;
    this.exposedT = 0;
    this.guardAngle = undefined;
  }
  Boss.prototype = Object.create(Enemy.prototype);
  Boss.prototype.constructor = Boss;

  Boss.prototype.canAct = function () { return !this.dead && this.spawnT <= 0 && this.staggerT <= 0 && this.stageTransitionT <= 0; };

  Boss.prototype.update = function (dt, G) {
    dt = Math.min(0.08, Math.max(0, dt));
    /* aiDt scales with attackTempoMul. Boss telegraphs and phase transitions run faster
       when attackTempoMul > 1 (from trial modifiers). Player abilities use raw dt. */
    const aiDt = dt * (this.attackTempoMul || 1);
    this.anim += dt;
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3.2);
    this.contactCd = Math.max(0, this.contactCd - dt);
    this.staggerT = Math.max(0, this.staggerT - dt);
    this.exposedT = Math.max(0, this.exposedT - dt);
    this.breath += dt;
    if (this.dead) {
      this.deathT += dt;
      this.vx *= 0.88; this.vy *= 0.88;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (chancePerSecond(26, dt)) {
        E.particles.spawn({ x: this.x + (Math.random() - 0.5) * this.radius * 2, y: this.y + (Math.random() - 0.5) * this.radius * 2, vx: (Math.random() - 0.5) * 60, vy: -60 * Math.random(), life: 0.7, max: 0.7, size: 4, color: this.color, glow: true, add: true, drag: 0.92 });
      }
      if (this.deathT > 2.0) this.removeMe = true;
      return;
    }
    if (this.practiceDummy) { this.hp=this.maxHp; this.vx=0; this.vy=0; return; }
    updateEnemyStatuses(this, dt, G);
    if (this.dead) return;
    const p = G.player;
    const a = U.ang(this.x, this.y, p.x, p.y);
    const d = U.dist(this.x, this.y, p.x, p.y);
    if (Math.abs(Math.cos(a)) > 0.2) this.face = Math.cos(a) > 0 ? 1 : -1;
    if (!this.entered) { this.entered = true; G.onBossEnter(this); }
    if (this.stageTransitionT > 0) {
      this.stageTransitionT = Math.max(0, this.stageTransitionT - dt);
      if (this.stageTransitionT <= 0 && this.stageQueue.length) G.beginBossStageTransition(this);
      if (this.stageTransitionT > 0) {
        this.vx *= 0.72; this.vy *= 0.72;
        this.x += this.vx * dt; this.y += this.vy * dt;
        G.collideWithWalls(this);
        return;
      }
      this.state = 'idle'; this.stateT = 0; this.atkCd = Math.max(this.atkCd, 0.45);
    } else if (this.stageQueue.length) {
      G.beginBossStageTransition(this);
      this.vx *= 0.72; this.vy *= 0.72;
      this.x += this.vx * dt; this.y += this.vy * dt;
      G.collideWithWalls(this);
      return;
    }
    if (!this.canAct()) { this.vx *= 0.9; this.vy *= 0.9; this.x += this.vx * dt; this.y += this.vy * dt; return; }

    if (this.state === 'idle' || this.guardAngle === undefined) this.guardAngle = a;
    this.stateT += aiDt;
    this.atkCd = Math.max(0, this.atkCd - aiDt);
    const AIs = {
      lion: bossLion, medusa: bossMedusa, hydra: bossHydra, typhon: bossTyphon
    };
    if (!bossSignatureAI(this, aiDt, G, p, a, d)) (AIs[this.def.ai] || bossLion).call(this, aiDt, G, p, a, d);

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    G.collideWithWalls(this);
    if (!E.cam.bounds || true) { /* keep inside arena */ }

    if (this.contactCd <= 0 && d < this.radius + p.radius) {
      if (G.damagePlayer(this.dmg * 0.6, this, 'contact')) {
        this.contactCd = 0.7;
        G.knockback(p, a, 260);
      }
    }
  };

  /* ---------- shared boss utilities ---------- */
  function bossApproach(b, dt, G, a, d, want, spd) {
    const s = (spd || b.speed) * (b.slowAura ? 1 : 1);
    if (d > want + 24) { b.vx = U.lerp(b.vx, Math.cos(a) * s, 1 - Math.pow(0.02, dt)); b.vy = U.lerp(b.vy, Math.sin(a) * s, 1 - Math.pow(0.02, dt)); }
    else if (d < want - 40) { b.vx = U.lerp(b.vx, -Math.cos(a) * s * 0.8, 1 - Math.pow(0.02, dt)); b.vy = U.lerp(b.vy, -Math.sin(a) * s * 0.8, 1 - Math.pow(0.02, dt)); }
    else { const t = a + Math.PI / 2; b.vx = U.lerp(b.vx, Math.cos(t) * s * 0.7, 1 - Math.pow(0.06, dt)); b.vy = U.lerp(b.vy, Math.sin(t) * s * 0.7, 1 - Math.pow(0.06, dt)); }
  }
  function bossTelegraph(b, dt, t) {
    if (chancePerSecond(30, dt)) {
      E.particles.spawn({ x: b.x + (Math.random() - 0.5) * b.radius * 2.4, y: b.y + (Math.random() - 0.5) * b.radius * 2.4, vx: 0, vy: -60, life: 0.34, max: 0.34, size: 3.4, color: '#ffb060', glow: true, add: true });
    }
  }
  E.bossApproach = bossApproach;

  function bossSignatureMark(x, y, radius, life, color, dir, frame) {
    E.effects.push({ kind: 'telegraph', x, y, r: radius, life, max: life, color: color || '#d8c9a4', dir: dir || 0, frame });
  }
  function bossSignatureZone(b, G, x, y, radius, life, damageScale) {
    G.addHazard({ x, y, radius, life, maxLife: life, dmg: b.dmg * damageScale, tick: 0.34, friendly: false, owner:b, color: b.color });
    E.effects.push({ kind: 'summonRing', x, y, r: radius, life: 0.5, max: 0.5, color: b.color });
  }
  function bossSignatureTarget(G, p, lead) {
    return G.clampToArena(p.x + (p.vx || 0) * lead, p.y + (p.vy || 0) * lead, 70);
  }

  /* Named capstones borrow their family AI, but get one image-telegraphed
     pattern in each later stage. Damage uses raster-backed effects only. */
  function bossSignatureAI(b, dt, G, p, a, d) {
    const id = b.def.signature;
    if (!id || b.phase < 1) return false;
    if (b.state.indexOf('sig_') !== 0) {
      if (b.state !== 'idle') return false;
      const first = b.mem.signatureStage !== b.phase;
      const repeat = G.run && G.run.rng ? G.run.rng.chance(0.24) : Math.random() < 0.24;
      if (!first && !repeat) return false;
      b.mem.signatureStage = b.phase;
      b.state = 'sig_' + id; b.stateT = 0;
      const target = bossSignatureTarget(G, p, 0.28);
      const sig = b.mem.sig = { phase: b.phase, angle: a, x: target.x, y: target.y, steps: 0 };
      if (id === 'tantalus') {
        const n = sig.phase >= 2 ? 4 : 3; sig.marks = [];
        for (let i = 0; i < n; i++) {
          const ang = a + (i - (n - 1) / 2) * (TAU / n);
          const q = G.clampToArena(target.x + Math.cos(ang) * 108, target.y + Math.sin(ang) * 108, 80);
          sig.marks.push(q); bossSignatureMark(q.x, q.y, 52, 0.95, b.color, 0, 8);
        }
      } else if (id === 'labyrinth_asterion' || id === 'scylla') {
        const side = { x: -Math.sin(a), y: Math.cos(a) };
        const offsets = id === 'scylla' ? [-1, 0, 1] : [-1, 1];
        sig.marks = offsets.map(sign => G.clampToArena(target.x + side.x * sign * (id === 'scylla' ? 92 : 112), target.y + side.y * sign * (id === 'scylla' ? 92 : 112), 80));
        sig.marks.forEach(q => bossSignatureMark(q.x, q.y, id === 'scylla' ? 54 : 58, 1.0, b.color, 0, id === 'scylla' ? 3 : 14));
      } else if (id === 'achilles' || id === 'hecatoncheir') {
        const reach = id === 'achilles' ? 210 : 260;
        bossSignatureMark(b.x + Math.cos(a) * reach, b.y + Math.sin(a) * reach, id === 'achilles' ? 72 : 130, 0.8, b.color, a, id === 'achilles' ? 10 : 12);
      } else if (id === 'mourning_orpheus') {
        bossSignatureMark(b.x + Math.cos(a) * 150, b.y + Math.sin(a) * 150, 220, 0.8, b.color, a, 4);
      } else if (id === 'porphyrion') {
        bossSignatureMark(target.x, target.y, 92, 0.9, b.color, 0, 2);
      } else if (id === 'styx_warden') {
        bossSignatureMark(target.x, target.y, 86, 0.9, b.color, a, 13);
      }
      if (id === 'delphi_oracle') {
        const side = { x:-Math.sin(a), y:Math.cos(a) };
        sig.marks = [-1,0,1].map(n => G.clampToArena(target.x + side.x * n * 86, target.y + side.y * n * 86, 80));
        sig.marks.forEach(q => bossSignatureMark(q.x, q.y, 54, 0.82, b.color, a, 13));
      } else if (id === 'pelion_ambush') {
        sig.charge = G.clampToArena(target.x + Math.cos(a) * 220, target.y + Math.sin(a) * 220, 80);
        bossSignatureMark(sig.charge.x, sig.charge.y, 96, 0.86, b.color, a, 10);
      } else if (id === 'arcadia_tusks') {
        const side = { x:-Math.sin(a), y:Math.cos(a) };
        sig.marks = [-1,0,1].map(n => G.clampToArena(target.x + side.x * n * 108, target.y + side.y * n * 108, 80));
        sig.marks.forEach(q => bossSignatureMark(q.x, q.y, 62, 0.84, b.color, 0, 3));
      } else if (id === 'thebes_riddle') {
        const side = { x:-Math.sin(a), y:Math.cos(a) };
        sig.marks = [-1,0,1].map(n => G.clampToArena(target.x + side.x * n * 126, target.y + side.y * n * 126, 80));
        sig.marks.forEach((q, i) => bossSignatureMark(q.x, q.y, 58, 0.9, b.color, a, i === 1 ? 4 : 9));
      } else if (id === 'marathon_charge') {
        sig.charge = G.clampToArena(target.x + Math.cos(a) * 190, target.y + Math.sin(a) * 190, 80);
        bossSignatureMark(sig.charge.x, sig.charge.y, 86, 0.82, b.color, a, 12);
      } else if (id === 'mycenae_furies') {
        bossSignatureMark(b.x, b.y, 212, 0.86, b.color, 0, 5);
        bossSignatureMark(target.x, target.y, 58, 0.76, b.color, a, 11);
      }      return true;
    }

    const sig = b.mem.sig || { phase: b.phase, angle: a, x: p.x, y: p.y, steps: 0 };
    const t = b.stateT;
    const done = cooldown => { b.state = 'idle'; b.stateT = 0; b.atkCd = cooldown; b.mem.sig = null; };
    if (id === 'styx_warden') {
      b.vx *= 0.86; b.vy *= 0.86;
      if (!sig.hit && t >= 0.78) {
        sig.hit = true;
        if (U.dist(p.x, p.y, sig.x, sig.y) < 150) G.knockback(p, U.ang(p.x, p.y, b.x, b.y), 210);
        bossSignatureZone(b, G, sig.x, sig.y, 76, 1.4, 0.3);
        if (sig.phase >= 2) {
          const side = { x: -Math.sin(sig.angle), y: Math.cos(sig.angle) };
          sig.follow = G.clampToArena(sig.x + side.x * 150, sig.y + side.y * 150, 70);
          bossSignatureMark(sig.follow.x, sig.follow.y, 65, 0.48, b.color, 0, 13);
        }
      }
      if (sig.follow && !sig.followHit && t >= 1.36) { sig.followHit = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 58, 1.1, 0.24); }
      if (t > (sig.follow ? 1.8 : 1.25)) done(1.6);
      return true;
    }
    if (id === 'tantalus') {
      b.vx *= 0.88; b.vy *= 0.88;
      if (!sig.hit && t >= 0.88) {
        sig.hit = true; sig.marks.forEach((q, i) => bossSignatureZone(b, G, q.x, q.y, i === 0 ? 62 : 54, 2.4, 0.22));
      }
      if (t > 1.25) done(2.1);
      return true;
    }
    if (id === 'achilles') {
      b.vx *= 0.82; b.vy *= 0.82;
      if (!sig.hit && t >= 0.68) { sig.hit = true; G.enemyCone(b, sig.angle, 0.86, 480, b.dmg * 1.35, b.color); }
      if (sig.phase >= 2 && !sig.followHit && t >= 1.1) {
        sig.followHit = true; sig.followAngle = sig.angle + 0.72;
        bossSignatureMark(b.x + Math.cos(sig.followAngle) * 220, b.y + Math.sin(sig.followAngle) * 220, 75, 0.35, b.color, sig.followAngle, 10);
      }
      if (sig.followAngle && !sig.followDone && t >= 1.45) { sig.followDone = true; G.enemyCone(b, sig.followAngle, 0.76, 420, b.dmg * 0.95, b.color); }
      if (t > 1.72) { b.exposedT = 1.05; done(1.45); }
      return true;
    }
    if (id === 'mourning_orpheus') {
      b.vx *= 0.9; b.vy *= 0.9;
      if (!sig.hit && t >= 0.48) {
        sig.hit = true; const n = sig.phase >= 2 ? 9 : 7;
        for (let i = 0; i < n; i++) {
          const ang = sig.angle + (i - (n - 1) / 2) * 0.19;
          spawnProjectile({ owner: b, x: b.x, y: b.y, vx: Math.cos(ang) * 310, vy: Math.sin(ang) * 310, dmg: b.dmg * 0.34, persp: 'wail', life: 2.1, radius: 9 });
        }
      }
      if (sig.phase >= 2 && !sig.followHit && t >= 0.98) { sig.followHit = true; bossSignatureMark(b.x, b.y, 260, 0.45, b.color, 0, 4); }
      if (sig.followHit && !sig.followDone && t >= 1.38) {
        sig.followDone = true;
        for (let i = 0; i < 7; i++) {
          const ang = sig.angle + Math.PI + (i - 3) * 0.2;
          spawnProjectile({ owner: b, x: b.x, y: b.y, vx: Math.cos(ang) * 290, vy: Math.sin(ang) * 290, dmg: b.dmg * 0.3, persp: 'wail', life: 1.9, radius: 8 });
        }
      }
      if (t > 1.75) done(1.55);
      return true;
    }
    if (id === 'labyrinth_asterion') {
      b.vx *= 0.9; b.vy *= 0.9;
      if (!sig.hit && t >= 0.84) { sig.hit = true; sig.marks.forEach(q => bossSignatureZone(b, G, q.x, q.y, 66, 2.0, 0.2)); }
      if (sig.phase >= 2 && !sig.followHit && t >= 1.28) {
        sig.followHit = true; sig.follow = G.clampToArena(sig.x, sig.y - 170, 80);
        bossSignatureMark(sig.follow.x, sig.follow.y, 58, 0.5, b.color, 0, 14);
      }
      if (sig.follow && !sig.followDone && t >= 1.8) { sig.followDone = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 54, 1.3, 0.18); }
      if (t > 2.05) done(1.8);
      return true;
    }
    if (id === 'scylla') {
      b.vx *= 0.9; b.vy *= 0.9;
      const times = [0.55, 0.86, 1.17];
      while (sig.steps < times.length && t >= times[sig.steps]) {
        const q = sig.marks[sig.steps++]; bossSignatureZone(b, G, q.x, q.y, 58, 1.25, 0.24);
      }
      if (sig.phase >= 2 && !sig.followHit && t >= 1.45) {
        sig.followHit = true; sig.follow = G.clampToArena(sig.x + Math.cos(sig.angle) * 130, sig.y + Math.sin(sig.angle) * 130, 80);
        bossSignatureMark(sig.follow.x, sig.follow.y, 50, 0.45, b.color, 0, 3);
      }
      if (sig.follow && !sig.followDone && t >= 1.9) { sig.followDone = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 52, 1.1, 0.2); }
      if (t > 2.15) done(1.65);
      return true;
    }
    if (id === 'porphyrion') {
      b.vx *= 0.9; b.vy *= 0.9;
      if (!sig.hit && t >= 0.82) { sig.hit = true; bossSignatureZone(b, G, sig.x, sig.y, 96, 1.0, 0.3); }
      if (sig.phase >= 2 && !sig.followHit && t >= 1.08) {
        sig.followHit = true; sig.follow = G.clampToArena(sig.x + Math.cos(sig.angle + 1) * 170, sig.y + Math.sin(sig.angle + 1) * 170, 80);
        bossSignatureMark(sig.follow.x, sig.follow.y, 76, 0.5, b.color, 0, 2);
      }
      if (sig.follow && !sig.followDone && t >= 1.62) { sig.followDone = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 84, 0.9, 0.27); }
      if (t > 1.9) done(1.5);
      return true;
    }
    if (id === 'hecatoncheir') {
      b.vx *= 0.86; b.vy *= 0.86;
      if (!sig.hit && t >= 0.62) { sig.hit = true; G.enemyCone(b, sig.angle, 1.22, 510, b.dmg * 1.18, b.color); }
      if (sig.phase >= 2 && !sig.followHit && t >= 1.05) {
        sig.followHit = true; sig.followAngle = sig.angle + Math.PI * 0.72;
        bossSignatureMark(b.x + Math.cos(sig.followAngle) * 260, b.y + Math.sin(sig.followAngle) * 260, 130, 0.5, b.color, sig.followAngle, 12);
      }
      if (sig.followAngle && !sig.followDone && t >= 1.56) { sig.followDone = true; G.enemyCone(b, sig.followAngle, 1.05, 490, b.dmg * 1.05, b.color); }
      if (t > 1.92) done(1.75);
      return true;
    }
    if (id === 'delphi_oracle') {
      b.vx *= 0.92; b.vy *= 0.92;
      const times = [0.5,0.7,0.9];
      while (sig.steps < times.length && t >= times[sig.steps]) {
        const q = sig.marks[sig.steps++];
        bossSignatureZone(b, G, q.x, q.y, 56, 0.8, 0.2);
      }
      if (sig.phase >= 2 && !sig.followMarked && t >= 0.98) {
        sig.followMarked = true;
        sig.follow = bossSignatureTarget(G, p, 0.08);
        bossSignatureMark(sig.follow.x, sig.follow.y, 50, 0.32, b.color, 0, 13);
      }
      if (sig.followMarked && !sig.followHit && t >= 1.30) { sig.followHit = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 48, 0.65, 0.16); }
      if (t > 1.48) done(1.5);
      return true;
    }
    if (id === 'pelion_ambush') {
      b.vx *= 0.86; b.vy *= 0.86;
      if (!sig.hit && t >= 0.72) {
        sig.hit = true;
        G.enemyCone(b, sig.angle, 0.28, 650, b.dmg * 1.05, b.color);
        if (sig.phase >= 2) {
          sig.follow = G.clampToArena(sig.charge.x - Math.cos(sig.angle) * 190, sig.charge.y - Math.sin(sig.angle) * 190, 80);
          bossSignatureMark(sig.follow.x, sig.follow.y, 66, 0.3, b.color, 0, 11);
        }
      }
      if (sig.follow && !sig.followHit && t >= 0.98) { sig.followHit = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 60, 0.65, 0.18); }
      if (t > 1.12) done(1.6);
      return true;
    }
    if (id === 'arcadia_tusks') {
      b.vx *= 0.9; b.vy *= 0.9;
      const times = [0.48,0.69,0.9];
      while (sig.steps < times.length && t >= times[sig.steps]) {
        const q = sig.marks[sig.steps++];
        bossSignatureZone(b, G, q.x, q.y, 62, 0.75, 0.22);
      }
      if (sig.phase >= 2 && !sig.followMarked && t >= 0.99) {
        sig.followMarked = true;
        sig.follow = G.clampToArena(sig.x - Math.cos(sig.angle) * 130, sig.y - Math.sin(sig.angle) * 130, 80);
        bossSignatureMark(sig.follow.x, sig.follow.y, 58, 0.28, b.color, 0, 3);
      }
      if (sig.followMarked && !sig.followHit && t >= 1.27) { sig.followHit = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 54, 0.62, 0.16); }
      if (t > 1.42) done(1.45);
      return true;
    }
    if (id === 'thebes_riddle') {
      b.vx *= 0.92; b.vy *= 0.92;
      const times = [0.58,0.8,1.0];
      while (sig.steps < times.length && t >= times[sig.steps]) {
        const index = sig.steps++;
        const q = sig.marks[index];
        if (index !== 1) bossSignatureZone(b, G, q.x, q.y, sig.phase >= 2 ? 66 : 58, 0.72, 0.2);
      }
      if (sig.phase >= 2 && !sig.followMarked && t >= 1.02) {
        sig.followMarked = true;
        sig.follow = bossSignatureTarget(G, p, 0.05);
        bossSignatureMark(sig.follow.x, sig.follow.y, 54, 0.24, b.color, 0, 4);
      }
      if (sig.followMarked && !sig.followHit && t >= 1.28) { sig.followHit = true; bossSignatureZone(b, G, sig.follow.x, sig.follow.y, 52, 0.6, 0.15); }
      if (t > 1.45) done(1.55);
      return true;
    }
    if (id === 'marathon_charge') {
      b.vx *= 0.84; b.vy *= 0.84;
      if (!sig.hit && t >= 0.72) {
        sig.hit = true;
        G.enemyCone(b, sig.angle, sig.phase >= 2 ? 0.34 : 0.25, 690, b.dmg * 1.12, b.color);
      }
      if (sig.phase >= 2 && !sig.followHit && t >= 0.96) {
        sig.followHit = true;
        sig.followAngle = sig.angle + Math.PI * 0.64;
        bossSignatureMark(b.x + Math.cos(sig.followAngle) * 220, b.y + Math.sin(sig.followAngle) * 220, 76, 0.25, b.color, sig.followAngle, 12);
      }
      if (sig.followAngle && !sig.followDone && t >= 1.22) {
        sig.followDone = true;
        G.enemyCone(b, sig.followAngle, 0.2, 600, b.dmg * 0.82, b.color);
      }
      if (t > 1.42) done(1.5);
      return true;
    }
    if (id === 'mycenae_furies') {
      b.vx *= 0.9; b.vy *= 0.9;
      if (!sig.hit && t >= 0.56) {
        sig.hit = true;
        const n = sig.phase >= 2 ? 9 : 7;
        for (let i = 0; i < n; i++) {
          const angle = sig.angle + (i - (n - 1) / 2) * 0.22;
          spawnProjectile({ owner: b, x: b.x, y:b.y, vx:Math.cos(angle) * 300, vy:Math.sin(angle) * 300, dmg:b.dmg * 0.32, persp:'wail', life:2, radius:9 });
        }
      }
      if (sig.phase >= 2 && !sig.followHit && t >= 0.96) {
        sig.followHit = true;
        for (let i = -2; i <= 2; i++) {
          const angle = sig.angle + Math.PI + i * 0.24;
          spawnProjectile({ owner: b, x: b.x, y:b.y, vx:Math.cos(angle) * 280, vy:Math.sin(angle) * 280, dmg:b.dmg * 0.24, persp:'curse', life:1.8, radius:8 });
        }
      }
      if (t > 1.18) done(1.55);
      return true;
    }    b.state = 'idle'; b.stateT = 0; return false;
  }
  /* ---------- NEMEAN LION ---------- */
  function bossLion(dt, G, p, a, d) {
    const b = this;
    const rage = b.phase >= 1;
    const finalStage = b.phase >= 2;
    if (b.state === 'idle') {
      bossApproach(b, dt, G, a, d, 96, rage ? 150 : 120);
      if (b.atkCd <= 0) {
        const roll = Math.random();
        if (d < 190) b.state = roll < 0.45 ? 'swipe' : (roll < 0.8 ? 'pounce' : 'roar');
        else if (roll < 0.5) b.state = 'pounce';
        else if (roll < 0.8) b.state = 'charge';
        else b.state = 'roar';
        b.stateT = 0;
        K.Audio.sfx('roar');
      }
      return;
    }
    if (b.state === 'swipe') {
      if (b.stateT < 0.42) { bossTelegraph(b, dt); b.vx *= 0.86; b.vy *= 0.86; }
      else if (b.stateT < 0.5) { G.enemyCone(b, a, 1.7, 120, b.dmg * 1.3, '#e2b06a'); E.cam.addShake(6); K.Audio.sfx('swing'); }
      else if (b.stateT > 0.72) { b.state = 'idle'; b.atkCd = rage ? 0.9 : 1.5; b.exposedT = 0.55; }
      return;
    }
    if (b.state === 'pounce') {
      if (!b.mem.aimed) { b.mem.aimed = true; b.mem.pa = a; }
      if (b.stateT < 0.5) { bossTelegraph(b, dt); b.vx *= 0.82; b.vy *= 0.82; }
      else if (b.stateT < 1.15) {
        const sp = rage ? 900 : 760;
        b.vx = Math.cos(b.mem.pa) * sp; b.vy = Math.sin(b.mem.pa) * sp;
        if (Math.random() < dt * 30) hitFx(G, b.x, b.y, '#d8b06a', 3, 60);
      } else {
        b.mem.aimed = false; b.state = 'idle';
        b.atkCd = rage ? 1.1 : 1.8;
        E.cam.addShake(8);
        G.enemySlam(b, finalStage ? 170 : 130, b.dmg * 1.4);
        b.exposedT = finalStage ? 1.0 : 0.8;
      }
      return;
    }
    if (b.state === 'charge') {
      if (!b.mem.aimed) { b.mem.aimed = true; b.mem.pa = a; }
      if (b.stateT < 0.62) { bossTelegraph(b, dt); b.vx *= 0.8; b.vy *= 0.8; }
      else if (b.stateT < 1.5) {
        b.vx = U.lerp(b.vx, Math.cos(b.mem.pa) * 820, 1 - Math.pow(0.1, dt));
        b.vy = U.lerp(b.vy, Math.sin(b.mem.pa) * 820, 1 - Math.pow(0.1, dt));
        hitFx(G, b.x, b.y, '#c9a24a', 2, 40);
      } else { b.mem.aimed = false; b.state = 'idle'; b.atkCd = 1.5; b.exposedT = 0.7; E.cam.addShake(7); }
      return;
    }
    if (b.state === 'roar') {
      if (b.stateT < 0.7) { bossTelegraph(b, dt); b.vx *= 0.84; b.vy *= 0.84; }
      else if (!b.mem.rang) {
        b.mem.rang = true;
        E.cam.addShake(14);
        K.Audio.sfx('roar');
        ringFx(G, b.x, b.y, 200, '#f0cf5e', 30);
        E.effects.push({ kind: 'nova', x: b.x, y: b.y, r: 230, life: 0.5, max: 0.5, color: '#e2b06a' });
        if (U.dist(b.x, b.y, p.x, p.y) < 230) G.damagePlayer(b.dmg * 0.8, b, 'roar');
        // shockwave ring of debris
        for (let i = 0; i < (rage ? 14 : 9); i++) {
          const ang = i / (rage ? 14 : 9) * TAU + Math.random() * 0.2;
          spawnProjectile({ owner: b, x: b.x, y: b.y, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, dmg: b.dmg * 0.55, persp: 'rock', life: 1.5, radius: 9 });
        }
      } else if (b.stateT > 1.3) { b.mem.rang = false; b.state = 'idle'; b.atkCd = rage ? 1.2 : 2.0; b.exposedT = 0.6; }
      return;
    }
  }

  /* ---------- MEDUSA ---------- */
  function bossMedusa(dt, G, p, a, d) {
    const b = this;
    const rage = b.phase >= 1;
    const finalStage = b.phase >= 2;
    if (b.state === 'idle') {
      bossApproach(b, dt, G, a, d, 240, rage ? 120 : 92);
      if (b.atkCd <= 0) {
        const roll = Math.random();
        if (roll < 0.34) b.state = 'gaze';
        else if (roll < 0.62) b.state = 'snakes';
        else if (roll < 0.85) b.state = 'petrifyShot';
        else b.state = 'summon';
        b.stateT = 0;
        b.mem.aimed = false;
      }
      return;
    }
    if (b.state === 'gaze') {
      if (!b.mem.ga) b.mem.ga = a;
      if (b.stateT < 1.0) {
        b.mem.ga = U.turn(b.mem.ga, a, 1.9, dt);
        bossTelegraph(b, dt);
        b.vx *= 0.88; b.vy *= 0.88;
      } else if (b.stateT < 2.4) {
        b.mem.ga = U.turn(b.mem.ga, a, 1.3, dt);
        b.mem.gazing = true;
        for (let i = 0; i < 3; i++) {
          const gd = 60 + Math.random() * 420;
          E.particles.spawn({ x: b.x + Math.cos(b.mem.ga) * gd, y: b.y + Math.sin(b.mem.ga) * gd, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, life: 0.34, max: 0.34, size: 3.6, color: '#a8e090', glow: true, add: true });
        }
        const pa = U.ang(b.x, b.y, p.x, p.y);
        const pd = U.dist(b.x, b.y, p.x, p.y);
        if (pd < 460 && Math.abs(U.angDiff(b.mem.ga, pa)) < 0.34) {
          if (G.damagePlayer(b.dmg * 0.42, b, 'gaze', true)) {
            G.applyPlayerStatus('petrified', { dur: rage ? 1.3 : 0.95 });
            G.toast('PETRIFIED — break free with a dash!', '#b0b0b8');
          }
        }
      } else {
        b.mem.gazing = false;
        if (finalStage) for (let i = -2; i <= 2; i++) {
          const ang = b.mem.ga + i * 0.28;
          spawnProjectile({ owner: b, x: b.x, y: b.y, vx: Math.cos(ang) * 285, vy: Math.sin(ang) * 285, dmg: b.dmg * 0.34, persp: 'hex', life: 1.8, radius: 8 });
        }
        b.state = 'idle'; b.atkCd = rage ? 1.8 : 2.8;
      }
      return;
    }
    if (b.state === 'snakes') {
      if (b.stateT < 0.55) { bossTelegraph(b, dt); b.vx *= 0.86; b.vy *= 0.86; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        const n = rage ? 16 : 10;
        for (let i = 0; i < n; i++) {
          const ang = a + (i - (n - 1) / 2) * (rage ? 0.24 : 0.3);
          spawnProjectile({
            owner: b, x: b.x + Math.cos(ang) * b.radius, y: b.y + Math.sin(ang) * b.radius,
            vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300,
            dmg: b.dmg * 0.5, persp: 'hex', life: 2.4, homing: 1.4, radius: 8
          });
        }
        K.Audio.sfx('shoot');
      } else if (b.stateT > 1.1) { b.mem.fired = false; b.state = 'idle'; b.atkCd = rage ? 1.6 : 2.6; }
      return;
    }
    if (b.state === 'petrifyShot') {
      if (b.stateT < 0.5) { bossTelegraph(b, dt); b.vx *= 0.86; b.vy *= 0.86; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        for (let i = 0; i < (rage ? 5 : 3); i++) {
          const ang = a + (Math.random() - 0.5) * 0.5;
          spawnProjectile({
            owner: b, x: b.x, y: b.y, vx: Math.cos(ang) * 340, vy: Math.sin(ang) * 340,
            dmg: b.dmg * 0.6, persp: 'curse', life: 2.2, aoe: 54, aoeDmg: b.dmg * 0.4, radius: 10
          });
        }
        K.Audio.sfx('stone');
      } else if (b.stateT > 1.0) { b.mem.fired = false; b.state = 'idle'; b.atkCd = rage ? 1.5 : 2.4; }
      return;
    }
    if (b.state === 'summon') {
      if (b.stateT < 0.5) { bossTelegraph(b, dt); b.vx *= 0.8; b.vy *= 0.8; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        G.summonAt(b.x, b.y, 'empusa', rage ? 4 : 2, 140);
        G.summonAt(b.x, b.y, 'erinyes_maiden', rage ? 2 : 1, 170);
        E.cam.addShake(6);
      } else if (b.stateT > 1.2) { b.mem.fired = false; b.state = 'idle'; b.atkCd = rage ? 2.4 : 3.6; }
      return;
    }
  }

  /* ---------- HYDRA ---------- */
  function bossHydra(dt, G, p, a, d) {
    const b = this;
    const rage = b.phase >= 1;
    const finalStage = b.phase >= 2;
    if (b.state === 'idle') {
      bossApproach(b, dt, G, a, d, 150, rage ? 96 : 74);
      if (b.atkCd <= 0) {
        const roll = Math.random();
        if (roll < 0.3) b.state = 'spit';
        else if (roll < 0.55) b.state = 'heads';
        else if (roll < 0.78) b.state = 'venomPool';
        else b.state = 'bite';
        b.stateT = 0; b.mem.fired = false;
      }
      return;
    }
    if (b.state === 'spit') {
      if (b.stateT < 0.5) { bossTelegraph(b, dt); b.vx *= 0.88; b.vy *= 0.88; }
      else if (b.stateT < 1.5) {
        b.mem.spitT = (b.mem.spitT || 0) + dt;
        if (b.mem.spitT > (rage ? 0.12 : 0.2)) {
          b.mem.spitT = 0;
          const ang = a + (Math.random() - 0.5) * 0.34;
          spawnProjectile({
            owner: b, x: b.x + Math.cos(ang) * b.radius, y: b.y + Math.sin(ang) * b.radius,
            vx: Math.cos(ang) * 380, vy: Math.sin(ang) * 380,
            dmg: b.dmg * 0.4, persp: 'poison', life: 2.0, aoe: 40, aoeDmg: b.dmg * 0.3, radius: 9,
            effects: { poison: { dps: 7, dur: 4 } }
          });
          K.Audio.sfx('shoot');
        }
      } else { b.state = 'idle'; b.atkCd = rage ? 1.3 : 2.1; }
      return;
    }
    if (b.state === 'heads') {
      if (b.stateT < 0.75) { bossTelegraph(b, dt); b.vx *= 0.86; b.vy *= 0.86; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        const n = finalStage ? 15 : (rage ? 11 : 7);
        for (let i = 0; i < n; i++) {
          const ang = a + (i - (n - 1) / 2) * 0.22;
          spawnProjectile({
            owner: b, x: b.x + Math.cos(ang) * b.radius, y: b.y + Math.sin(ang) * b.radius,
            vx: Math.cos(ang) * 420, vy: Math.sin(ang) * 420,
            dmg: b.dmg * 0.45, persp: 'poison', life: 1.6, radius: 8,
            effects: { poison: { dps: 6, dur: 3 } }
          });
        }
        K.Audio.sfx('roar');
      } else if (b.stateT > 1.4) { b.state = 'idle'; b.atkCd = rage ? 1.5 : 2.4; }
      return;
    }
    if (b.state === 'venomPool') {
      if (b.stateT < 0.6) { bossTelegraph(b, dt); b.vx *= 0.86; b.vy *= 0.86; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        const n = finalStage ? 9 : (rage ? 7 : 4);
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * TAU, rad = 80 + Math.random() * 300;
          const hx = U.clamp(p.x + Math.cos(ang) * rad, G.arena.x + 30, G.arena.x + G.arena.w - 30);
          const hy = U.clamp(p.y + Math.sin(ang) * rad, G.arena.y + 30, G.arena.y + G.arena.h - 30);
          G.addHazard({ x: hx, y: hy, radius: 52, life: 5, maxLife: 5, dmg: b.dmg * 0.28, tick: 0.45, friendly: false, owner:b, color: '#5aa860' });
          E.effects.push({ kind: 'summonRing', x: hx, y: hy, r: 52, life: 0.5, max: 0.5, color: '#7ad86a' });
        }
        K.Audio.sfx('stone');
      } else if (b.stateT > 1.3) { b.state = 'idle'; b.atkCd = rage ? 2.0 : 3.0; }
      return;
    }
    if (b.state === 'bite') {
      if (b.stateT < 0.6) { b.mem.ba = b.mem.ba === undefined ? a : b.mem.ba; b.mem.ba = U.turn(b.mem.ba, a, 1.4, dt); bossTelegraph(b, dt); b.vx *= 0.84; b.vy *= 0.84; }
      else if (b.stateT < 0.95) {
        b.vx = U.lerp(b.vx, Math.cos(b.mem.ba) * 620, 1 - Math.pow(0.08, dt));
        b.vy = U.lerp(b.vy, Math.sin(b.mem.ba) * 620, 1 - Math.pow(0.08, dt));
      } else if (b.stateT < 1.05) {
        G.enemyCone(b, b.mem.ba, 1.4, 150, b.dmg * 1.5, '#7ad86a');
        K.Audio.sfx('roar'); E.cam.addShake(7);
      } else if (b.stateT > 1.4) { b.state = 'idle'; b.atkCd = rage ? 1.2 : 2.0; delete b.mem.ba; }
      return;
    }
  }

  /* ---------- TYPHON ---------- */
  function bossTyphon(dt, G, p, a, d) {
    const b = this;
    const rage = b.phase >= 1;
    const final = b.phase >= 2;
    const last = b.phase >= 3;
    if (b.state === 'idle') {
      bossApproach(b, dt, G, a, d, 200, final ? 130 : (rage ? 108 : 88));
      if (b.atkCd <= 0) {
        const roll = Math.random();
        if (roll < 0.24) b.state = 'firestorm';
        else if (roll < 0.46) b.state = 'stormbolts';
        else if (roll < 0.64) b.state = 'summon';
        else if (roll < 0.82) b.state = 'lunge';
        else b.state = 'quake';
        b.stateT = 0; b.mem.fired = false;
      }
      return;
    }
    if (b.state === 'firestorm') {
      if (b.stateT < 0.6) { bossTelegraph(b, dt); b.vx *= 0.88; b.vy *= 0.88; }
      else if (b.stateT < 1.9) {
        b.mem.t = (b.mem.t || 0) + dt;
        if (b.mem.t > (final ? 0.09 : 0.15)) {
          b.mem.t = 0;
          const ang = Math.random() * TAU, sp = 180 + Math.random() * 260;
          spawnProjectile({
            owner: b, x: b.x, y: b.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            dmg: b.dmg * 0.4, persp: 'fireball', life: 3.0, radius: 10, aoe: 48, aoeDmg: b.dmg * 0.35
          });
        }
      } else { b.state = 'idle'; b.atkCd = final ? 1.0 : 1.9; }
      return;
    }
    if (b.state === 'stormbolts') {
      if (b.stateT < 0.7) { bossTelegraph(b, dt); b.vx *= 0.86; b.vy *= 0.86; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        const n = last ? 22 : (final ? 16 : (rage ? 11 : 7));
        for (let i = 0; i < n; i++) {
          const ang = a + (i - (n - 1) / 2) * 0.19;
          spawnProjectile({
            owner: b, x: b.x + Math.cos(ang) * b.radius, y: b.y + Math.sin(ang) * b.radius,
            vx: Math.cos(ang) * 360, vy: Math.sin(ang) * 360, dmg: b.dmg * 0.45,
            persp: 'bolt', life: 2.0, radius: 8
          });
        }
        K.Audio.sfx('bolt');
      } else if (b.stateT > 1.4) { b.state = 'idle'; b.atkCd = final ? 1.2 : 2.1; }
      return;
    }
    if (b.state === 'summon') {
      if (b.stateT < 0.6) { bossTelegraph(b, dt); b.vx *= 0.84; b.vy *= 0.84; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        G.summonAt(b.x, b.y, 'typhon_spawn', final ? 5 : (rage ? 4 : 2), 160);
        G.summonAt(b.x, b.y, 'fury', rage ? 2 : 1, 200);
        E.cam.addShake(8);
      } else if (b.stateT > 1.4) { b.state = 'idle'; b.atkCd = final ? 1.8 : 2.8; }
      return;
    }
    if (b.state === 'lunge') {
      if (!b.mem.ga) b.mem.ga = a;
      if (b.stateT < 0.55) { b.mem.ga = U.turn(b.mem.ga, a, 1.6, dt); bossTelegraph(b, dt); b.vx *= 0.84; b.vy *= 0.84; }
      else if (b.stateT < 1.3) {
        b.vx = U.lerp(b.vx, Math.cos(b.mem.ga) * 860, 1 - Math.pow(0.08, dt));
        b.vy = U.lerp(b.vy, Math.sin(b.mem.ga) * 860, 1 - Math.pow(0.08, dt));
      } else if (b.stateT < 1.45) { G.enemyCone(b, b.mem.ga, 1.6, 170, b.dmg * 1.3, '#e2564a'); E.cam.addShake(10); }
      else if (b.stateT > 1.7) { b.state = 'idle'; b.atkCd = final ? 1.0 : 1.8; delete b.mem.ga; }
      return;
    }
    if (b.state === 'quake') {
      if (b.stateT < 0.8) { bossTelegraph(b, dt); b.vx *= 0.84; b.vy *= 0.84; }
      else if (!b.mem.fired) {
        b.mem.fired = true;
        E.cam.addShake(18);
        K.Audio.sfx('roar');
        E.effects.push({ kind: 'shockwave', x: b.x, y: b.y, r: 420, life: 0.7, max: 0.7, color: '#e2564a' });
        if (U.dist(b.x, b.y, p.x, p.y) < 340) G.damagePlayer(b.dmg * 0.7, b, 'quake');
        for (let ring = 0; ring < (last ? 3 : 2); ring++) {
          for (let i = 0; i < 16; i++) {
            const ang = i / 16 * TAU + ring * 0.2;
            spawnProjectile({ owner: b, x: b.x, y: b.y, vx: Math.cos(ang) * (300 + ring * 120), vy: Math.sin(ang) * (300 + ring * 120), dmg: b.dmg * 0.4, persp: 'rock', life: 2.2, radius: 10, delay: ring * 0.25 });
          }
        }
        G.arenaQuake(520, b.dmg * 0.35, b);
      } else if (b.stateT > 1.9) { b.state = 'idle'; b.atkCd = final ? 1.5 : 2.6; }
      return;
    }
  }

  E.Enemy = Enemy;
  E.Boss = Boss;

  /* ============================================================
     Summoned ally
     ============================================================ */
  function Ally(typeId, x, y, G, life) {
    Enemy.call(this, typeId, x, y, G, { tier: G.run.regionIndex, ally: true });
    this.ally = true;
    this.lifeT = life || 12;
    this.dmg = Math.max(8, G.player.stats.damage * 0.5);
  }
  Ally.prototype = Object.create(Enemy.prototype);
  Ally.prototype.constructor = Ally;
  Ally.prototype.update = function (dt, G) {
    this.lifeT -= dt;
    if (this.lifeT <= 0) {
      E.particles.burst(this.x, this.y, 10, () => ({ x: this.x, y: this.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.4, max: 0.4, size: 3, color: this.color, glow: true, add: true, drag: 0.9 }));
      this.removeMe = true; return;
    }
    this.anim += dt;
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3.2);
    for (const k in this.statuses) { const s = this.statuses[k]; s.t -= dt; if (s.t <= 0) delete this.statuses[k]; }
    this.atkCd = Math.max(0, this.atkCd - dt);
    const t = G.nearestEnemy(this.x, this.y, 900, null);
    if (!t) { this.vx *= 0.9; this.vy *= 0.9; this.x += this.vx * dt; this.y += this.vy * dt; return; }
    const a = U.ang(this.x, this.y, t.x, t.y);
    const d = U.dist(this.x, this.y, t.x, t.y);
    if (d > this.radius + t.radius + 4) {
      this.vx = U.lerp(this.vx, Math.cos(a) * this.speed, 1 - Math.pow(0.02, dt));
      this.vy = U.lerp(this.vy, Math.sin(a) * this.speed, 1 - Math.pow(0.02, dt));
    } else if (this.atkCd <= 0) {
      this.atkCd = 0.7;
      G.damageEnemy(t, this.dmg, { source: 'ally', x: t.x, y: t.y, dir: a, knock: 1.2 });
      hitFx(G, t.x, t.y, this.color, 5, 100);
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    G.collideWithWalls(this);
    if (chancePerSecond(10, dt)) {
      E.particles.spawn({ x: this.x + (Math.random() - 0.5) * 14, y: this.y + (Math.random() - 0.5) * 14, vx: 0, vy: -24, life: 0.4, max: 0.4, size: 2.6, color: this.color, glow: true, add: true, drag: 0.94 });
    }
  };
  E.Ally = Ally;

  /* ============================================================
     Pickups
     ============================================================ */
  function Pickup(o) {
    this.x = o.x; this.y = o.y;
    this.kind = o.kind || 'obol';
    this.value = o.value || 1;
    this.radius = o.radius || 10;
    this.color = o.color || '#e0b355';
    this.vy = o.vy === undefined ? -50 : o.vy;
    this.vx = o.vx === undefined ? (Math.random() - 0.5) * 90 : o.vx;
    this.t = 0;
    this.life = o.life || 999;
    this.dead = false;
    this.item = o.item || null;
    this.bob = Math.random() * TAU;
  }
  Pickup.prototype.update = function (dt) {
    this.t += dt;
    this.bob += dt * 3;
    this.vy += 340 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.vy > 0) { this.vx *= Math.pow(0.02, dt); }
    if (this.y > 1e9) this.dead = true;
    if (this.t > this.life) this.dead = true;
  };
  E.Pickup = Pickup;

  /* ============================================================
     Hazards (lingering ground damage) and effects
     ============================================================ */
  E.updateHazards = function (dt, G) {
    for (let i = G.hazards.length - 1; i >= 0; i--) {
      const h = G.hazards[i];
      if (!h || h.life <= 0) { G.hazards.splice(i, 1); continue; }
      h.life -= dt;
      h.tickT = (h.tickT || 0) + dt;
      if (h.tickT >= h.tick) {
        h.tickT = 0;
        if (h.friendly) {
          for (const e of E.enemies) {
            if (e.dead || e.ally) continue;
            if (U.dist2(h.x, h.y, e.x, e.y) < (h.radius + e.radius) * (h.radius + e.radius)) {
              G.damageEnemy(e, h.dmg, { source: 'hazard', silent: true, x: e.x, y: e.y, noStatus: true });
            }
          }
        } else if (U.dist(h.x, h.y, G.player.x, G.player.y) < h.radius + G.player.radius) {
          G.damagePlayer(h.dmg, h, 'hazard');
        }
      }
      if (h.life <= 0) G.hazards.splice(i, 1);
    }
  };

  E.updateEffects = function (dt) {
    for (let i = E.effects.length - 1; i >= 0; i--) {
      const f = E.effects[i];
      f.life -= dt;
      if (f.life <= 0) E.effects.splice(i, 1);
    }
    // projectiles
    for (let i = E.projectiles.length - 1; i >= 0; i--) {
      const p = E.projectiles[i];
      if (!p) { E.projectiles.splice(i, 1); continue; }
      if (p.delay && p.delay > 0) { p.delay -= dt; continue; }
      p.update(dt, E.G);
    }
  };

})();

