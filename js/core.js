/* ============================================================
   KATABASIS — core.js
   Deterministic RNG, math, input, camera, DOM helpers,
   localStorage save, and a fully procedural Web Audio score.
   ============================================================ */
(function () {
  'use strict';
  window.K = window.K || {};

  /* ---------------- RNG (mulberry32) ---------------- */
  function RNG(seed) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }
  RNG.prototype.next = function () {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  RNG.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  /* weight: array of numbers or fn(item) -> number */
  RNG.prototype.weighted = function (arr, weight) {
    if (!arr.length) return null;
    const w = arr.map((it, i) => {
      const v = typeof weight === 'function' ? weight(it, i) : (weight ? weight[i] : 1);
      return Math.max(0, v || 0);
    });
    let total = w.reduce((a, b) => a + b, 0);
    if (total <= 0) return this.pick(arr);
    let r = this.next() * total;
    for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  };

  /* ---------------- Math / easing ---------------- */
  const TAU = Math.PI * 2;
  const U = {
    TAU,
    clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    inv: (a, b, v) => b === a ? 0 : (v - a) / (b - a),
    smooth: (t) => t * t * (3 - 2 * t),
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    dist2: (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
    ang: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
    angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; },
    approach(cur, tgt, rate, dt) {
      const d = tgt - cur;
      const step = rate * dt;
      return Math.abs(d) <= step ? tgt : cur + Math.sign(d) * step;
    },
    /* rotate angle 'a' toward 'b' at 'rate' rad/s */
    turn(a, b, rate, dt) { return a + U.clamp(U.angDiff(a, b), -rate * dt, rate * dt); },
    roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },
    /* polygon path */
    poly(ctx, x, y, r, sides, rot) {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = rot + i / sides * TAU;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    },
    star(ctx, x, y, rOut, rIn, points, rot) {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const a = rot + i / (points * 2) * TAU;
        const r = i % 2 ? rIn : rOut;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    },
    fmt(n, d) { return (n === undefined || n === null || isNaN(n)) ? '0' : Number(n).toFixed(d === undefined ? 0 : d); },
    comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
    time(sec) {
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    },
    /* random point on a circle */
    onCircle(rng, cx, cy, r) { const a = rng.range(0, TAU); return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a }; }
  };
  K.RNG = RNG;
  K.U = U;

  /* ---------------- DOM helpers ---------------- */
  const D = {
    el: (id) => document.getElementById(id),
    elClass(cls) { const d = document.createElement('div'); d.className = cls; return d; },
    show(id) { const e = typeof id === 'string' ? document.getElementById(id) : id; if (e) e.classList.remove('hidden'); return e; },
    hide(id) { const e = typeof id === 'string' ? document.getElementById(id) : id; if (e) e.classList.add('hidden'); return e; },
    text(id, t) { const e = typeof id === 'string' ? document.getElementById(id) : id; if (e) e.textContent = t; return e; },
    html(id, t) { const e = typeof id === 'string' ? document.getElementById(id) : id; if (e) e.innerHTML = t; return e; },
    clear(e) { e = typeof e === 'string' ? document.getElementById(e) : e; while (e && e.firstChild) e.removeChild(e.firstChild); return e; },
    on(id, ev, fn) { const e = typeof id === 'string' ? document.getElementById(id) : id; if (e) e.addEventListener(ev, fn); return e; },
    frag() { return document.createDocumentFragment(); }
  };
  K.D = D;

  /* ---------------- Input ---------------- */
  const Input = {
    keys: Object.create(null),
    pressed: Object.create(null),      // consumed each frame
    mouse: { x: 0, y: 0, wx: 0, wy: 0, down: false, rdown: false, downEdge: false, rdownEdge: false },
    anyKeyEdge: false,
    _canvas: null,

    init(canvas) {
      this._canvas = canvas;
      const kd = (e) => {
        const c = e.code || e.key;
        const target = e.target;
        const inField = !!(target && (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].indexOf(target.tagName) >= 0));
        // Escape must always reach global handlers (e.g. closing Codex search).
        if (c !== 'Escape' && c !== 'Tab' && inField) return;
        // Tab is reserved for native keyboard navigation and is never a game action.
        if (c === 'Tab') return;
        const semanticAction = target && (target.tagName === 'BUTTON' || (target.closest && target.closest('button, a[href], [role="button"]')));
        if (semanticAction && (c === 'Space' || c === 'Enter')) return;
        if (!this.keys[c]) { this.pressed[c] = true; this.anyKeyEdge = true; }
        this.keys[c] = true;
        // stop page scroll on game keys
        if (this.playing !== false && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].indexOf(c) >= 0) e.preventDefault();
      };
      const ku = (e) => { this.keys[e.code || e.key] = false; };
      window.addEventListener('keydown', kd, { passive: false });
      window.addEventListener('keyup', ku);
      window.addEventListener('blur', () => this.reset());

      const mm = (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width) / (K.dpr || 1);
        this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height) / (K.dpr || 1);
      };
      canvas.addEventListener('mousemove', mm);
      canvas.addEventListener('mousedown', (e) => {
        mm(e);
        if (e.button === 0) { if (!this.mouse.down) this.mouse.downEdge = true; this.mouse.down = true; }
        if (e.button === 2) { if (!this.mouse.rdown) this.mouse.rdownEdge = true; this.mouse.rdown = true; }
        e.preventDefault();
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouse.down = false;
        if (e.button === 2) this.mouse.rdown = false;
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      // touch: treat as move+attack toward finger
      canvas.addEventListener('touchstart', (e) => {
        const t = e.touches[0]; if (!t) return;
        mm(t); this.mouse.down = true; this.mouse.downEdge = true;
        this.touch = { x: t.clientX, y: t.clientY };
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) { mm(t); this.touch = { x: t.clientX, y: t.clientY }; } e.preventDefault(); }, { passive: false });
      canvas.addEventListener('touchend', () => { this.mouse.down = false; this.touch = null; });
      canvas.addEventListener('touchcancel', () => this.reset());
    },

    reset() {
      this.keys = Object.create(null); this.mouse.down = false; this.mouse.rdown = false;
      this.touch = null; this.endFrame();
    },

    held(code) { return !!this.keys[code]; },
    hit(code) { if (this.pressed[code]) { this.pressed[code] = false; return true; } return false; },
    /* any of an array */
    hitAny(codes) { for (const c of codes) if (this.hit(c)) return true; return false; },
    heldAny(codes) { for (const c of codes) if (this.keys[c]) return true; return false; },
    moveVec() {
      let x = 0, y = 0;
      if (this.heldAny(['KeyA', 'ArrowLeft'])) x -= 1;
      if (this.heldAny(['KeyD', 'ArrowRight'])) x += 1;
      if (this.heldAny(['KeyW', 'ArrowUp'])) y -= 1;
      if (this.heldAny(['KeyS', 'ArrowDown'])) y += 1;
      const m = Math.hypot(x, y);
      if (m > 0) { x /= m; y /= m; }
      return { x, y };
    },
    endFrame() {
      this.pressed = Object.create(null);
      this.mouse.downEdge = false;
      this.mouse.rdownEdge = false;
      this.anyKeyEdge = false;
    }
  };
  K.Input = Input;

  /* ---------------- Camera ---------------- */
  K.Camera = function Camera() {
    this.x = 0; this.y = 0; this.zoom = 1; this.tzoom = 1;
    this.shake = 0; this.shakeT = 0; this.ox = 0; this.oy = 0;
    this.bounds = null;
  };
  K.Camera.prototype.follow = function (tx, ty, dt, snap) {
    const k = snap ? 1 : 1 - Math.pow(0.0009, dt);
    this.x = U.lerp(this.x, tx, k);
    this.y = U.lerp(this.y, ty, k);
    this.zoom = U.lerp(this.zoom, this.tzoom, 1 - Math.pow(0.004, dt));
    if (this.bounds) {
      const b = this.bounds;
      const hw = (K.W / 2) / this.zoom, hh = (K.H / 2) / this.zoom;
      if (b.w <= hw * 2) this.x = b.x + b.w / 2; else this.x = U.clamp(this.x, b.x + hw, b.x + b.w - hw);
      if (b.h <= hh * 2) this.y = b.y + b.h / 2; else this.y = U.clamp(this.y, b.y + hh, b.y + b.h - hh);
    }
    // shake decay
    if (this.shake > 0) {
      this.shakeT += dt * 46;
      this.shake = Math.max(0, this.shake - dt * (this.shake * 5 + 8));
      this.ox = Math.sin(this.shakeT) * this.shake;
      this.oy = Math.cos(this.shakeT * 1.37) * this.shake;
    } else { this.ox = 0; this.oy = 0; }
  };
  K.Camera.prototype.addShake = function (amt) { this.shake = Math.min(60, this.shake + amt); };
  K.Camera.prototype.toWorld = function (sx, sy) {
    return { x: (sx - K.W / 2) / this.zoom + this.x, y: (sy - K.H / 2) / this.zoom + this.y };
  };
  K.Camera.prototype.apply = function (ctx) {
    ctx.translate(K.W / 2, K.H / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x + this.ox, -this.y + this.oy);
  };

  /* ---------------- Audio ---------------- */
  const Audio2 = {
    ctx: null, master: null, sfxGain: null, musicGain: null, ambienceGain: null,
    enabled: true, started: false, muted: false, ambienceMuted: false,
    _last: Object.create(null), _musicRegion: null, _currentTrack: null, _musicSource: null, _musicBuffer: null, _layer: 'calm',
    _musicBaseVolume: 0.72, _ambienceVolume: 0.45, _ambienceProfile: null, _ambienceKey: null, _ambienceSynth: null,

    /* The five existing region cue numbers now select the supplied recordings.
       Cues 3 and 4 intentionally share Nike_Kratei; cue 0 is reserved.
       Region `track` in data.js is legacy; only `music` is read. */
    MUSIC_CUE_TRACKS: [0, 1, 2, 3, 3],
    TRACKS: [
      { id: 'Hades_Kalei_Psyche', name: 'Hades Kalei Psyche', src: 'assets/audio/Hades_Kalei_Psyche.mp3' },
      { id: 'Siege_of_the_Iron_Gates', name: 'Siege of the Iron Gates', src: 'assets/audio/Siege_of_the_Iron_Gates.mp3' },
      { id: 'Athanatos_Doxa', name: 'Athanatos Doxa', src: 'assets/audio/Athanatos_Doxa.mp3' },
      { id: 'Nike_Kratei', name: 'Nike Kratei', src: 'assets/audio/Nike_Kratei.mp3' }
    ],

    boot() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this.enabled = false; return; }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.85;
        this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.5;
        this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 1;
        this.musicGain.connect(this.master);
        this.ambienceGain = this.ctx.createGain();
        this.ambienceGain.gain.value = 0;
        this.ambienceGain.connect(this.master);
      } catch (e) { this.enabled = false; }
      if (!this._bootResumeBound) {
        this._bootResumeBound = true;
        const resume = () => { this.resume(); document.removeEventListener('pointerdown', resume); document.removeEventListener('keydown', resume); };
        document.addEventListener('pointerdown', resume, { once: true, passive: true });
        document.addEventListener('keydown', resume, { once: true, passive: true });
      }
    },
    resume() {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended' && this.ctx.resume) { try { this.ctx.resume(); } catch (e) {} }
      this.started = true;
      this._syncAmbienceProfile();
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.85;
      this._applyMusicVolume();
    },
    toggleMute() { this.setMuted(!this.muted); return this.muted; },

    /* throttle identical sounds so swarms don't clip -- allow up to 3 concurrent per name */
    gate(name, ms) {
      const t = performance.now();
      const arr = this._last[name] || [];
      const recent = arr.filter(ts => t - ts < ms);
      if (recent.length >= 3) return false;
      recent.push(t);
      this._last[name] = recent;
      return true;
    },

    _tone(o) {
      if (!this.enabled || !this.ctx || this.muted) return;
      const c = this.ctx, t0 = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator();
      osc.type = o.type || 'sine';
      const dur = o.dur || 0.2;
      osc.frequency.setValueAtTime(o.f0, t0);
      if (o.f1 !== undefined) {
        if (o.exp !== false) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur);
        else osc.frequency.linearRampToValueAtTime(o.f1, t0 + dur);
      }
      const g = c.createGain();
      const vol = (o.vol === undefined ? 0.3 : o.vol);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + (o.atk || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let node = osc;
      if (o.filter) {
        const f = c.createBiquadFilter();
        f.type = o.filter; f.frequency.value = o.fc || 1200; f.Q.value = o.q || 1;
        node.connect(f); node = f;
      }
      node.connect(g);
      g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    },

    _noise(o) {
      if (!this.enabled || !this.ctx || this.muted) return;
      const c = this.ctx, dur = o.dur || 0.2, t0 = c.currentTime + (o.delay || 0);
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = o.filter || 'lowpass'; f.frequency.value = o.fc || 900; f.Q.value = o.q || 0.8;
      if (o.fc1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.fc1), t0 + dur);
      const g = c.createGain();
      const vol = o.vol === undefined ? 0.25 : o.vol;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(this.sfxGain);
      src.start(t0); src.stop(t0 + dur + 0.02);
    },

    /* --- named effects --- */
    sfx(name, opt) {
      if (!this.enabled || this.muted) return;
      const o = opt || {};
      switch (name) {
        case 'swing':
          if (!this.gate('swing', 55)) return;
          this._noise({ dur: 0.13, filter: 'bandpass', fc: 2100, fc1: 700, q: 1.3, vol: 0.14 }); break;
        case 'hit':
          if (!this.gate('hit', 40)) return;
          this._noise({ dur: 0.1, filter: 'lowpass', fc: 1500, fc1: 320, vol: 0.22 });
          this._tone({ type: 'square', f0: 190, f1: 70, dur: 0.09, vol: 0.14 }); break;
        case 'crit':
          this._noise({ dur: 0.16, filter: 'bandpass', fc: 2800, fc1: 500, q: 2, vol: 0.3 });
          this._tone({ type: 'triangle', f0: 620, f1: 200, dur: 0.2, vol: 0.2 }); break;
        case 'hurt':
          this._noise({ dur: 0.22, filter: 'lowpass', fc: 900, fc1: 180, vol: 0.34 });
          this._tone({ type: 'sawtooth', f0: 220, f1: 88, dur: 0.28, vol: 0.22 }); break;
        case 'dash':
          this._noise({ dur: 0.2, filter: 'bandpass', fc: 500, fc1: 2600, q: 2.2, vol: 0.16 }); break;
        case 'shoot':
          if (!this.gate('shoot', 45)) return;
          this._tone({ type: 'triangle', f0: 880, f1: 300, dur: 0.12, vol: 0.14 }); break;
        case 'bolt':
          this._noise({ dur: 0.34, filter: 'highpass', fc: 1200, vol: 0.3 });
          this._tone({ type: 'sawtooth', f0: 1500, f1: 120, dur: 0.3, vol: 0.2 }); break;
        case 'explode':
          this._noise({ dur: 0.5, filter: 'lowpass', fc: 1400, fc1: 90, vol: 0.4 });
          this._tone({ type: 'sine', f0: 130, f1: 42, dur: 0.45, vol: 0.3 }); break;
        case 'levelup':
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            this._tone({ type: 'triangle', f0: f, dur: 0.4, vol: 0.2, delay: i * 0.075, bus: 'sfx' })); break;
        case 'boon':
          [659.25, 987.77, 1318.5].forEach((f, i) =>
            this._tone({ type: 'sine', f0: f, dur: 0.6, vol: 0.19, delay: i * 0.09 })); break;
        case 'coin':
          this._tone({ type: 'triangle', f0: 1760, f1: 2640, dur: 0.12, vol: 0.12 }); break;
        case 'heal':
          [440, 587.33, 880].forEach((f, i) => this._tone({ type: 'sine', f0: f, dur: 0.5, vol: 0.16, delay: i * 0.08 })); break;
        case 'gate':
          this._tone({ type: 'sine', f0: 98, f1: 62, dur: 1.1, vol: 0.3 });
          this._noise({ dur: 1.0, filter: 'lowpass', fc: 420, fc1: 120, vol: 0.22, delay: 0.05 }); break;
        case 'death':
          this._tone({ type: 'sawtooth', f0: 300, f1: 40, dur: 1.6, vol: 0.3 });
          this._noise({ dur: 1.4, filter: 'lowpass', fc: 700, fc1: 60, vol: 0.28 }); break;
        case 'victory':
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
            this._tone({ type: 'triangle', f0: f, dur: 1.2, vol: 0.22, delay: i * 0.16 })); break;
        case 'roar':
          this._tone({ type: 'sawtooth', f0: 150, f1: 60, dur: 1.1, vol: 0.34 });
          this._tone({ type: 'square', f0: 76, f1: 44, dur: 1.3, vol: 0.22 });
          this._noise({ dur: 1.1, filter: 'lowpass', fc: 1100, fc1: 200, vol: 0.3 }); break;
        case 'bell':
          [1318.5, 1760, 2093].forEach((f, i) => this._tone({ type: 'sine', f0: f, dur: 1.6, vol: 0.13, delay: i * 0.02 })); break;
        case 'ui':
          this._tone({ type: 'triangle', f0: 1200, f1: 1500, dur: 0.06, vol: 0.1 }); break;
        case 'ui2':
          this._tone({ type: 'triangle', f0: 700, f1: 420, dur: 0.08, vol: 0.1 }); break;
        case 'shield':
          this._tone({ type: 'sine', f0: 660, f1: 990, dur: 0.28, vol: 0.18 });
          this._noise({ dur: 0.2, filter: 'highpass', fc: 2400, vol: 0.14 }); break;
        case 'stone':
          this._noise({ dur: 0.6, filter: 'lowpass', fc: 800, fc1: 140, vol: 0.3 });
          this._tone({ type: 'square', f0: 240, f1: 90, dur: 0.3, vol: 0.14 }); break;
        case 'whoosh':
          this._noise({ dur: 0.45, filter: 'bandpass', fc: 300, fc1: 1600, q: 1.6, vol: 0.16 }); break;
      }
    },

    /* --- supplied soundtrack --- */
    _layerVolume() {
      return { calm: 0.60, combat: 0.78, miniboss: 0.88, boss: 1.0 }[this._layer] || 0.60;
    },
    _applyMusicVolume() {
      if (this._musicSource && this._musicGain) {
        this._musicGain.gain.value = this.muted ? 0 : this._musicBaseVolume * this._layerVolume();
      }
    },
    _applyAmbienceVolume() {
      if (this.ambienceGain) this.ambienceGain.gain.value = this.muted || this.ambienceMuted ? 0 : this._ambienceVolume * 0.34;
    },
    setAmbienceVolume(value) {
      const n=Number(value);this._ambienceVolume=Number.isFinite(n)?Math.max(0,Math.min(1,n)):0.45;this._applyAmbienceVolume();return this._ambienceVolume;
    },
    setAmbienceMuted(value) { this.ambienceMuted=!!value;this._applyAmbienceVolume();return this.ambienceMuted; },
    setAmbienceProfile(profile) {
      const next=profile&&typeof profile==='object'?{
        bed:String(profile.bed||'cavern'),accentHz:Math.max(32,Math.min(880,Number(profile.accentHz)||82)),
        motif:String(profile.motif||''),weather:String(profile.weather||''),palette:String(profile.palette||'#b6a68a')
      }:null;
      const key=next?[next.bed,next.accentHz,next.motif,next.weather,next.palette].join('|'):'';
      if(key===this._ambienceKey)return;
      this._ambienceProfile=next;this._ambienceKey=key;
      this._syncAmbienceProfile();
    },
    _ensureAmbienceSynth() {
      if(this._ambienceSynth||!this.ctx||!this.ambienceGain||!this.started)return this._ambienceSynth;
      const c=this.ctx,body=c.createOscillator(),overtone=c.createOscillator(),noise=c.createBufferSource(),filter=c.createBiquadFilter();
      const bodyGain=c.createGain(),overtoneGain=c.createGain(),noiseGain=c.createGain();
      body.type='sine';overtone.type='triangle';body.frequency.value=44;overtone.frequency.value=82;
      bodyGain.gain.value=0;overtoneGain.gain.value=0;noiseGain.gain.value=0;filter.type='lowpass';filter.frequency.value=240;filter.Q.value=0.65;
      const rate=c.sampleRate||22050,length=Math.max(2048,Math.floor(rate*2)),buffer=c.createBuffer(1,length,rate),data=buffer.getChannelData(0);let noiseSeed=0x6d2b79f5;
      for(let i=0;i<length;i++){noiseSeed^=noiseSeed<<13;noiseSeed^=noiseSeed>>>17;noiseSeed^=noiseSeed<<5;data[i]=((noiseSeed>>>0)/2147483648)-1;}
      noise.buffer=buffer;noise.loop=true;
      body.connect(bodyGain);bodyGain.connect(this.ambienceGain);overtone.connect(overtoneGain);overtoneGain.connect(this.ambienceGain);
      noise.connect(filter);filter.connect(noiseGain);noiseGain.connect(this.ambienceGain);
      body.start();overtone.start();noise.start();
      this._ambienceSynth={body,overtone,noise,filter,bodyGain,overtoneGain,noiseGain};
      return this._ambienceSynth;
    },
    _rampAmbience(param,value,duration) {
      if(!param)return;const now=this.ctx?this.ctx.currentTime||0:0;
      try{if(param.cancelScheduledValues)param.cancelScheduledValues(now);if(param.setValueAtTime)param.setValueAtTime(Number(param.value)||0,now);if(param.linearRampToValueAtTime)param.linearRampToValueAtTime(value,now+(duration||0.8));else param.value=value;}catch(e){param.value=value;}
    },
    _syncAmbienceProfile() {
      if(!this.started||!this.ctx||!this.ambienceGain)return;
      const synth=this._ambienceProfile?this._ensureAmbienceSynth():this._ambienceSynth;if(!synth)return;
      if(!this._ambienceProfile){this._rampAmbience(synth.bodyGain.gain,0,0.8);this._rampAmbience(synth.overtoneGain.gain,0,0.8);this._rampAmbience(synth.noiseGain.gain,0,0.8);return;}
      const beds={cavern:[42,185,0.022],river:[68,920,0.058],grove:[92,620,0.032],fields:[110,480,0.028],lava:[38,230,0.045],ruins:[52,330,0.024],storm:[74,1450,0.075],terraces:[126,1050,0.04]};
      const cfg=beds[this._ambienceProfile.bed]||beds.cavern;
      this._rampAmbience(synth.body.frequency,cfg[0],0.8);this._rampAmbience(synth.overtone.frequency,this._ambienceProfile.accentHz,0.8);
      this._rampAmbience(synth.filter.frequency,cfg[1],0.8);this._rampAmbience(synth.bodyGain.gain,0.3,0.8);
      this._rampAmbience(synth.overtoneGain.gain,0.075,0.8);this._rampAmbience(synth.noiseGain.gain,cfg[2],0.8);
      this._applyAmbienceVolume();
    },
    _playMusicTrack(tr) {
      if (!tr) return;
      this.boot();
      if (!this.ctx || !this.musicGain) return;
      if (this._currentTrack && this._currentTrack.id === tr.id && this._musicSource) {
        this._applyMusicVolume();
        return;
      }
      this.stopMusic();
      const embedded = window.KATABASIS_AUDIO_DATA && window.KATABASIS_AUDIO_DATA[tr.id];
      const src = embedded || tr.src;
      if (!src) return;
      const loadAndPlay = (arrayBuffer) => {
        if (!this.ctx) return;
        this.ctx.decodeAudioData(arrayBuffer, (buffer) => {
          if (!this.ctx || this._currentTrack?.id !== tr.id) return;
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(this.musicGain);
          this._musicSource = source;
          this._musicBuffer = buffer;
          this._currentTrack = tr;
          this._applyMusicVolume();
          try { source.start(0); } catch (e) { console.warn('[Audio] music start failed:', e.message); }
        }, (e) => { console.warn('[Audio] decode failed:', e.message); });
      };
      if (embedded && embedded instanceof ArrayBuffer) {
        loadAndPlay(embedded);
      } else if (typeof src === 'string' && src.startsWith('data:')) {
        const base64 = src.split(',')[1];
        const binary = atob(base64);
        const len = binary.length;
        const buf = new Uint8Array(len);
        for (let i = 0; i < len; i++) buf[i] = binary.charCodeAt(i);
        loadAndPlay(buf.buffer);
      } else {
        fetch(src, { credentials: 'omit' }).then(r => r.arrayBuffer()).then(loadAndPlay).catch(e => console.warn('[Audio] fetch failed:', e.message));
      }
    },
    playTrack(idx) {
      const trackIndex = ((Math.floor(Number(idx) || 0) % this.TRACKS.length) + this.TRACKS.length) % this.TRACKS.length;
      this._musicRegion = null;
      this._playMusicTrack(this.TRACKS[trackIndex]);
    },
    stopMusic() {
      if (this._musicSource) {
        try { this._musicSource.stop(); } catch (e) {}
        this._musicSource.disconnect();
        this._musicSource = null;
      }
      this._musicBuffer = null;
      this._currentTrack = null;
    },
    playRegion(region, layer) {
      if (!region) return;
      this.setMusicLayer(layer || 'combat');
      this._musicRegion = region.id || null;
      const cue = Number.isFinite(Number(region.music)) ? Math.floor(Number(region.music)) : 0;
      const trackIndex = this.MUSIC_CUE_TRACKS[cue] === undefined ? 0 : this.MUSIC_CUE_TRACKS[cue];
      this._playMusicTrack(this.TRACKS[trackIndex]);
    },
    setMusicLayer(layer) {
      if (['calm','combat','miniboss','boss'].indexOf(layer) >= 0) this._layer = layer;
      this._applyMusicVolume();
    }
  };
  K.Audio = Audio2;

  /* ---------------- Save ---------------- */
  const SAVE_KEY = 'katabasis.save.v1';
  function savedNumber(value, fallback, integer) {
    const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    return Number.isFinite(n) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, integer ? Math.floor(n) : n)) : fallback;
  }
  function savedRecords(value) {
    return Array.isArray(value) ? value.filter(record => record && typeof record === 'object' && !Array.isArray(record)) : [];
  }
  const GEAR_SLOTS = ['weapon', 'helm', 'cuirass', 'bracers', 'waist', 'greaves'];
  function starterXiphos() {
    return { id:'starter-xiphos', templateId:'xiphos', slot:'weapon', name:'Xiphos of the Exile', rarity:'common', level:1,
      setId:null, baseEffects:{ dmgMul:0.02 }, affixes:[], upgrades:0 };
  }
  function newGearSlots() {
    const slots = {};
    GEAR_SLOTS.forEach(slot => { slots[slot] = slot === 'weapon' ? 'starter-xiphos' : null; });
    return slots;
  }
  const Save = {
    data: null,
    defaults() {
      return {
        obols: 0,
        meta: {},                    // id -> level
        runs: 0, wins: 0, deaths: 0,
        progressionVersion: 2,
        campaignMilestones: { firstCapstone:false, actI:false, actII:false, campaignVictory:false },
        fatedTrialsUnlocked: false,
        fatedTrialBestScore: 0,
        fatedTrialRewards: [],
        deepest: 0,                  // deepest room index reached
        bestRegion: 0,
        kills: 0, bossKills: 0, elites: 0,
        fastestWin: null, totalTime: 0,
        seenBoons: {}, seenEnemies: {}, seenRelics: {}, seenGods: {},
        killChronicle: [], nemeses: [], nemesisLog: [], campaignArchive: [],
        unlockedWeapons: ['xiphos'],
        weapon: 'xiphos',
        gearInventory: [starterXiphos()],
        equippedGear: newGearSlots(),
        salvageShards: 0,
        paragonUnlocked: false,
        paragonXp: 0,
        paragonPoints: 0,
        paragonNodes: [],
        muted: false,
        ambienceVolume: 0.45,
        ambienceMuted: false,
        reducedMotion: false,
        tutorialDone: false,
        unlockedHeroes: ['perseus'],
        selectedHero: 'perseus',
        selectedHeroUpgrade: '',
        unlockedStarters: ['xiphos'],
        unlockedStarterPerks: ['last_thread']
      };
    },
    load(source) {
      let d = source === undefined && K.Persistence && K.Persistence.ready ? this.data : source;
      try {
        if (d === undefined) {
          const raw = localStorage.getItem(SAVE_KEY);
          d = raw ? JSON.parse(raw) : null;
        }
      } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
      if (d.__proto__) delete d.__proto__;
      if (d.equippedGear && typeof d.equippedGear === 'object' && d.equippedGear.__proto__) delete d.equippedGear.__proto__;
      this.data = Object.assign(this.defaults(), d || {});
      this.data.ambienceVolume=Math.max(0,Math.min(1,savedNumber(this.data.ambienceVolume,0.45,false)));
      this.data.ambienceMuted=!!this.data.ambienceMuted;
      this.data.reducedMotion=!!this.data.reducedMotion;
      if (!this.data.campaignMilestones || typeof this.data.campaignMilestones !== 'object' || Array.isArray(this.data.campaignMilestones)) this.data.campaignMilestones = { firstCapstone:false, actI:false, actII:false, campaignVictory:false };
      if (!this.data.endgamePreferences || typeof this.data.endgamePreferences !== 'object' || Array.isArray(this.data.endgamePreferences)) this.data.endgamePreferences = {};
      if (!Array.isArray(this.data.unlockedWeapons)) this.data.unlockedWeapons = ['xiphos'];
      if (typeof this.data.weapon !== 'string') this.data.weapon = 'xiphos';
      if (!Array.isArray(this.data.unlockedHeroes)) this.data.unlockedHeroes = ['perseus'];
      if (typeof this.data.selectedHero !== 'string') this.data.selectedHero = 'perseus';
      ['obols','runs','wins','deaths','deepest','bestRegion','kills','bossKills','elites'].forEach(k => { this.data[k] = savedNumber(this.data[k], 0, true); });
      const updatedAt = savedNumber(this.data.storageUpdatedAt, 0, true);
      this.data.storageUpdatedAt = updatedAt < Number.MAX_SAFE_INTEGER ? updatedAt : 0;
      this.data.totalTime = savedNumber(this.data.totalTime, 0, false);
      this.data.fastestWin = this.data.fastestWin === null ? null : savedNumber(this.data.fastestWin, null, false);
      if (!Array.isArray(this.data.gearInventory) || !this.data.gearInventory.length) this.data.gearInventory = [starterXiphos()];
      if (!this.data.equippedGear || typeof this.data.equippedGear !== 'object' || Array.isArray(this.data.equippedGear)) this.data.equippedGear = newGearSlots();
      GEAR_SLOTS.forEach(slot => {
        if (!Object.prototype.hasOwnProperty.call(this.data.equippedGear, slot)) this.data.equippedGear[slot] = slot === 'weapon' ? 'starter-xiphos' : null;
      });
      this.data.salvageShards = Number.isSafeInteger(this.data.salvageShards) && this.data.salvageShards >= 0 ? this.data.salvageShards : 0;
      this.data.paragonUnlocked = !!this.data.paragonUnlocked;
      this.data.paragonXp = Number.isSafeInteger(this.data.paragonXp) && this.data.paragonXp >= 0 ? this.data.paragonXp : 0;
      this.data.paragonPoints = Number.isSafeInteger(this.data.paragonPoints) && this.data.paragonPoints >= 0 ? this.data.paragonPoints : 0;
      if (!Array.isArray(this.data.paragonNodes)) this.data.paragonNodes = [];
      if (K.Gear && K.Gear.normalizeSave) K.Gear.normalizeSave(this.data);
      if (K.Paragon && K.Paragon.normalizeSave) K.Paragon.normalizeSave(this.data);
      if (K.RunSystems && K.RunSystems.normalizeSave) K.RunSystems.normalizeSave(this.data);
      if (K.Endgame && K.Endgame.normalizeSave) K.Endgame.normalizeSave(this.data);
      if (K.Mythology && K.Mythology.normalizeSave) K.Mythology.normalizeSave(this.data);
      if (!this.data.meta || typeof this.data.meta !== 'object' || Array.isArray(this.data.meta)) this.data.meta = {};
      Object.keys(this.data.meta).forEach(id => {
        const definition = K.DATA && K.DATA.metaById[id];
        this.data.meta[id] = Math.min(definition ? definition.max : Number.MAX_SAFE_INTEGER, savedNumber(this.data.meta[id], 0, true));
      });
      ['seenBoons', 'seenEnemies', 'seenRelics', 'seenGods'].forEach(k => {
        if (!this.data[k] || typeof this.data[k] !== 'object' || Array.isArray(this.data[k])) this.data[k] = {};
      });
      ['killChronicle','nemeses','nemesisLog','campaignArchive'].forEach(k => { this.data[k] = savedRecords(this.data[k]).slice(0, k === 'killChronicle' ? 500 : k === 'campaignArchive' ? 100 : 200); });
      if (Array.isArray(this.data.gearInventory) && this.data.gearInventory.length > 500) this.data.gearInventory = this.data.gearInventory.slice(0, 500);
      this.data.campaignArchive.forEach(record => { record.voices = savedRecords(record.voices); });
      this.data.nemeses.forEach(record => {
        if (!K.DATA || typeof record.sourceId !== 'string' || !K.DATA.ENEMIES[record.sourceId]) record.sourceId = 'shade';
        record.rank = Math.max(1, savedNumber(record.rank, 1, true));
        if (typeof record.name !== 'string') record.name = 'Forgotten shade';
        if (typeof record.epithet !== 'string') record.epithet = 'the Unquiet';
      });
      return this.data;
    },
    write() {
      if (K.Persistence && K.Persistence.recoveryBlocked) { K.Persistence.reportLocal(false); return false; }
      const previous = Number.isSafeInteger(this.data.storageUpdatedAt) && this.data.storageUpdatedAt >= 0 ? this.data.storageUpdatedAt : 0;
      this.data.storageUpdatedAt = Math.min(Number.MAX_SAFE_INTEGER, Math.max(Date.now(), previous + 1));
      if (K.Persistence && K.Persistence.ready) return K.Persistence.schedule();
      let ok=true;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { ok=false; }
      if (K.Persistence) K.Persistence.reportLocal(ok);
      return ok;
    },
    flush() { return K.Persistence ? K.Persistence.flush() : Promise.resolve(this.write()); },
    metaLevel(id) { return this.data.meta[id] || 0; },
    addObols(n) {
      if (typeof n !== 'number' || !Number.isFinite(n)) return false;
      this.data.obols = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(this.data.obols + n))); this.write();
      return true;
    },
    spend(n) {
      if (!Number.isSafeInteger(n) || n < 0) return false;
      if (this.data.obols < n) return false;
      this.data.obols -= n; this.write(); return true;
    },
    clear() {
      try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('katabasis.progress.backend.v2'); } catch (e) {}
      if(K.Persistence)K.Persistence.recoveryBlocked=false;
      if(K.Persistence && K.Persistence.clearDatabase) { try { K.Persistence.clearDatabase(); } catch (e) {} }
      this.load(this.defaults()); this.write();
    }
  };
  K.Save = Save;

  /* ---------------- Utility: object pool-lite particles ---------------- */
  K.Particles = function Particles(max) {
    this.max = max || 2200;
    this.list = [];
  };
  // Pre-allocated pool to avoid per-frame object creation
  K.Particles.prototype._pool = [];
  K.Particles.prototype.spawn = function (o) {
    if (this.list.length >= this.max) this.list.shift();
    const p = this._pool.length ? this._pool.pop() : {};
    Object.assign(p, {
      x: 0, y: 0, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 3, color: '#fff',
      drag: 0.92, grav: 0, glow: false, shape: 'circle', rot: 0, vrot: 0, fade: true, add: false, layer: 0
    }, o);
    this.list.push(p);
  };
  K.Particles.prototype.burst = function (x, y, n, fn) {
    for (let i = 0; i < n; i++) this.spawn(fn(i));
  };
  K.Particles.prototype._recycle = function () {
    this._pool = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.life <= 0) {
        this.list.splice(i, 1);
        this._pool.push(p);
      }
    }
    // Keep remaining list entries, clear _pool for next frame
    this._pool.length = 0;
  };
  K.Particles.prototype.update = function (dt) {
    const l = this.list;
    // Recycle dead particles into pool first
    this._recycle();
    // Now update living particles
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.rot += p.vrot * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
    }
  };
  K.Particles.prototype.draw = function (ctx) {
    const A = K.Assets;
    if (!A || !A.ready()) return;
    const l = this.list;
    for (let i = 0; i < l.length; i++) {
      const p = l[i];
      const t = Math.max(0, p.life / p.max);
      const alpha = p.fade ? t : 1;
      if (alpha <= 0.01) continue;
      const cell = (i * 7 + Math.floor((p.rot || 0) * 3)) % 16;
      const size = p.size * (p.shrink === false ? 1 : (0.35 + 0.65 * t));
      A.drawCell(ctx, 'effects.particles', cell % 4, Math.floor(cell / 4), p.x, p.y,
        size * 4, size * 3.4, { alpha, rot: p.rot || 0 });
    }
  };
  K.Particles.prototype.clear = function () {
    this.list.length = 0;
    this._pool.length = 0;
  };

})();
