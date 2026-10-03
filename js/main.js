/* ============================================================
   KATABASIS — main.js
   Boot, resize, the fixed-step loop, and every menu screen.
   ============================================================ */
(function () {
  'use strict';
  const K = window.K;
  const U = K.U;
  const D = K.DATA;
  const E = K.E;
  const A = K.Assets;

  const canvas = document.getElementById('game');
  const ctx = K.WorldRenderer ? K.WorldRenderer.create(canvas) : null;
  let G = null;
  /* 'play' means no menu is covering the canvas. */
  let screen = 'play';
  let last = 0, acc = 0;
  const STEP = 1 / 60;
  let mx = 0, my = 0, mdown = false;
  let armoryReturnScreen = 'screen-title', armorySlot = 'weapon', armorySelectedId = null;
  let armoryFilter = 'all', armorySort = 'level', armoryMessage = '';
  let paragonReturnScreen = 'screen-title', paragonSelectedNode = K.Paragon.ROOT_ID, paragonMessage = '';
  let trialRanks = {};
  let atlasReturnScreen = 'screen-title', helpReturnScreen = 'screen-title', mirrorReturnScreen = 'screen-title';
  const ATLAS_PAGES = {'screen-title':'descent','screen-heroes':'descent','screen-armory':'armory','screen-paragon':'loom','screen-codex':'codex','screen-meta':'mirror','screen-trials':'trials','screen-help':'help'};
  function rememberAtlasOrigin(origin) { atlasReturnScreen = origin || 'screen-title'; }
  function syncAtlasFrame(id) {
    const nav = document.getElementById('atlas-nav'), status = document.getElementById('atlas-status');
    if (!nav) return;
    const visible = !!ATLAS_PAGES[id], active = ATLAS_PAGES[id];
    nav.classList.toggle('hidden', !visible); status.classList.toggle('hidden', !visible);
    document.getElementById('stage').classList.toggle('atlas-open', visible);
    nav.querySelectorAll('[data-atlas-route]').forEach(button => {
      const route = button.getAttribute('data-atlas-route');
      if (route === active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      if (route === 'trials') {
        button.disabled = !K.Save.data.fatedTrialsUnlocked || atlasReturnScreen !== 'screen-title';
        button.querySelector('.atlas-lock').textContent = !K.Save.data.fatedTrialsUnlocked ? 'LOCKED' : atlasReturnScreen !== 'screen-title' ? 'AFTER RUN' : '';
      }
      if (route === 'descent') button.querySelector('.atlas-label').textContent = atlasReturnScreen === 'screen-pause' ? 'Return to Run' : 'Descent';
    });
    document.getElementById('atlas-resources').textContent = U.comma(K.Save.data.obols || 0) + ' OBOLS · ' + (K.Save.data.runs || 0) + ' DESCENTS · ' + (K.Save.data.wins || 0) + ' ESCAPES';
  }
  function openCodex(tab, origin) {
    codexReturnScreen = origin || 'screen-title'; rememberAtlasOrigin(codexReturnScreen);
    buildCodex(tab || 'boons'); showScreen('screen-codex', codexReturnScreen !== 'screen-title');
  }
  function openHelp(origin) { helpReturnScreen = origin || 'screen-title'; rememberAtlasOrigin(helpReturnScreen); showScreen('screen-help', helpReturnScreen === 'screen-pause'); }
  function openMirror(origin) { mirrorReturnScreen = origin || 'screen-title'; rememberAtlasOrigin(mirrorReturnScreen); buildMeta(); showScreen('screen-meta', mirrorReturnScreen === 'screen-pause'); }
  function backToAtlasOrigin(origin) { showScreen(origin, origin !== 'screen-title'); buildMetaPreview(); }
  function routeAtlas(route) {
    const origin = atlasReturnScreen;
    if (route === 'descent') { backToAtlasOrigin(origin); return; }
    if (route === 'armory') openArmory(origin);
    else if (route === 'loom') openParagon(origin);
    else if (route === 'codex') openCodex('boons', origin);
    else if (route === 'mirror') openMirror(origin);
    else if (route === 'help') openHelp(origin);
    else if (route === 'trials' && origin === 'screen-title') openTrials();
  }

  /* ---------------- resize ---------------- */
  let resizeT = null;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    K.dpr = dpr;
    const vw = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    K.W = Math.floor(vw);
    K.H = Math.floor(vh);
    canvas.width = Math.floor(K.W * dpr);
    canvas.height = Math.floor(K.H * dpr);
    canvas.style.width = K.W + 'px';
    canvas.style.height = K.H + 'px';
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (G && G.cam) {
      G.cam.tzoom = U.clamp(Math.min(K.W / 1180, K.H / 830), 0.68, 1.35);
      if (G.cam.zoom === 1) G.cam.zoom = G.cam.tzoom;
    }
  }
  function scheduleResize() { if (resizeT) return; resizeT = setTimeout(() => { resizeT = null; resize(); }, 80); }
  window.addEventListener('resize', scheduleResize);
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', scheduleResize); }
  window.addEventListener('orientationchange', scheduleResize);

  /* ---------------- screen management ---------------- */
  const SCREENS = ['screen-title', 'screen-room', 'screen-cutscene', 'screen-reward', 'screen-gameover',
    'screen-victory', 'screen-codex', 'screen-meta', 'screen-help', 'screen-pause', 'screen-armory', 'screen-paragon','screen-heroes','screen-practice','screen-trials',
    'screen-world-map','screen-modifiers','screen-market','screen-house'];

  /* keepHud: menus that should stay legible over the world (death, victory)
     leave the HUD in place; the title screen hides it. */
  let lastFocused = null;
  function showScreen(id, keepHud) {
    if (id && (!lastFocused || !document.getElementById(id) || !document.getElementById(id).contains(lastFocused))) {
      const active = document.activeElement;
      if (active && active !== document.body) { try { lastFocused = active; } catch (e) { lastFocused = null; } }
    }
    K.Input.playing = !id;
    K.Input.reset();
    SCREENS.forEach(s => { const el = document.getElementById(s); if (el) el.classList.add('hidden'); });
    if (id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    }
    const veil = document.getElementById('veil');
    const showVeil = !!id && id !== 'screen-pause';
    if (veil) {
      veil.classList.toggle('on', showVeil);
      veil.classList.toggle('title', id === 'screen-title');
    }
    const hideHud = !!id && id !== 'screen-pause' && !keepHud;
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.classList.toggle('hidden', hideHud || !G || G.phase === 'idle');
    screen = id || 'play';
    if (id === 'screen-title') atlasReturnScreen = 'screen-title';
    syncAtlasFrame(id);
    syncTouchControls();
    if (id && document.getElementById(id)) {
      const el = document.getElementById(id);
      const target = el.querySelector('button:not([disabled]), input, select') || el.querySelector('[role="button"][tabindex="0"]') || el.querySelector('h2, h3');
      const restore = lastFocused && el.contains(lastFocused) ? lastFocused : null;
      const focusTarget = restore || target;
      if (focusTarget) {
        if (restore || focusTarget.tagName === 'H2' || focusTarget.tagName === 'H3') { if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1'); }
        try { focusTarget.focus({preventScroll:true}); } catch (e) { /* focus is best-effort */ }
      }
      if (restore) lastFocused = null;
    }
  }
  /* Hysteresis avoids the interact hint flickering while strafing at the radius edge. */
  let nearInteractSticky = null;
  function currentInteract() {
    if (G && G.nearInteract) { nearInteractSticky = G.nearInteract; return G.nearInteract; }
    if (!G || !nearInteractSticky || nearInteractSticky.used) { nearInteractSticky = null; return null; }
    if (!G.player) { nearInteractSticky = null; return null; }
    const d = U.dist(G.player.x, G.player.y, nearInteractSticky.x, nearInteractSticky.y);
    if (d > 96) { nearInteractSticky = null; return null; }
    return nearInteractSticky;
  }
  /* The label element is always present after boot; keep an explicit guard for safety. */
  (function ensureInteractLabel() {
    if (document.getElementById('interact-label')) return;
    const hint = document.getElementById('interact-hint');
    if (!hint) return;
    hint.innerHTML = '<span class="hint-key" aria-hidden="true">E</span> <span id="interact-label"></span>';
  })();
  function syncTouchControls() {
    const bar = document.getElementById('touch-controls');
    if (!bar) return;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const live = coarse && (!screen || screen === 'play') && !!G && !!G.player && !G.player.dead;
    bar.classList.toggle('hidden', !live);
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Tab' || !screen || screen === 'play') return;
    const host = document.getElementById(screen);
    if (!host || host.classList.contains('hidden')) return;
    const items = Array.from(host.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'))
      .filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
  /* Arrow-key roving across choice cards: →/↓ next, ←/↑ previous. */
  document.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if (!t || !t.classList || !t.classList.contains('card')) return;
    if (['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].indexOf(ev.key) < 0) return;
    const wrap = t.parentElement;
    if (!wrap) return;
    const cards = Array.from(wrap.querySelectorAll('.card[tabindex="0"]'));
    const i = cards.indexOf(t);
    if (i < 0) return;
    ev.preventDefault();
    const next = (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? cards[(i + 1) % cards.length] : cards[(i - 1 + cards.length) % cards.length];
    if (next) next.focus();
  });

  /* ---------------- HUD ---------------- */
  const hud = {
    hpBar: document.getElementById('hp-bar'),
    hpGhost: document.getElementById('hp-ghost'),
    hpText: document.getElementById('hp-text'),
    shieldRow: document.getElementById('shield-row'),
    regionName: document.getElementById('region-name'),
    actStatus: document.getElementById('act-status'),
    roomTrack: document.getElementById('room-track'),
    obolNum: document.getElementById('obol-num'),
    levelStatus: document.getElementById('run-level-status'),
    dashPips: document.getElementById('dash-pips'),
    boonTray: document.getElementById('boon-tray'),
    relicTray: document.getElementById('relic-tray'),
    bossWrap: document.getElementById('boss-bar-wrap'),
    bossName: document.getElementById('boss-name'),
    bossBar: document.getElementById('boss-bar'),
    bossSub: document.getElementById('boss-sub'),
    bossStageName: document.getElementById('boss-stage-name'),
    bossStagePips: document.getElementById('boss-stage-pips'),
    toasts: document.getElementById('toasts'), runStatus:document.getElementById('run-status'), trialStatus:document.getElementById('trial-hud-status')
  };
  const cache = { hp: -1, shield: -1, obols: -1, region: '', room: '', boss: -1, bossStage: '', boons: 0, relics: 0, dash: [] };
  let seenToasts = {};
  let hudFrameCount = 0;
  const HUD_UPDATE_INTERVAL = 2; // Update HUD every 2 frames to reduce DOM overhead
  const powerStatusEl = document.getElementById('power-status');
  const hintEl = document.getElementById('interact-hint');
  let slowTextT = 1;

  function updateHUD(dt) {
    if (!G || !G.player) return;
    const p = G.player, st = p.stats;
    slowTextT = dt === undefined ? 1 : slowTextT + dt;
    const slowDue = slowTextT >= 0.25;
    if (slowDue) slowTextT = 0;
    if (slowDue && powerStatusEl) {
      const active=K.BuildPowers && K.BuildPowers.activeEffects && K.BuildPowers.activeEffects(p);
      const powerLines=[];if(active && active.dashStrike)powerLines.push('Next Strike +' + Math.round(active.dashStrike.bonus*100) + '% · ' + active.dashStrike.remaining.toFixed(1) + ' s');
      if(active && active.killHaste)powerLines.push('Attack speed +' + Math.round(active.killHaste.bonus*100) + '% · ' + active.killHaste.remaining.toFixed(1) + ' s');
      powerStatusEl.classList.toggle('hidden',!powerLines.length);const text=powerLines.join(' | ');if(powerStatusEl.textContent!==text)powerStatusEl.textContent=text;
    }
    const frac = U.clamp(p.hp / st.maxHp, 0, 1);
    if (Math.abs(frac - cache.hp) > 0.001) {
      cache.hp = frac;
      hud.hpBar.style.transform = 'scaleX(' + frac + ')';
      hud.hpText.textContent = Math.max(0, Math.ceil(p.hp)) + ' / ' + st.maxHp;
    }
    if (hud.hpGhost) {
      /* the pale bar chases the red one downward, so damage reads as a bill */
      if (cache.hpGhost === undefined) cache.hpGhost = frac;
      if (cache.hpGhost > frac) {
        cache.hpGhost = Math.max(frac, cache.hpGhost - Math.max(0.012, (cache.hpGhost - frac) * 0.10));
      } else {
        cache.hpGhost = frac;
      }
      if (Math.abs(cache.hpGhostShown - cache.hpGhost) > 0.0015) {
        cache.hpGhostShown = cache.hpGhost;
        hud.hpGhost.style.transform = 'scaleX(' + cache.hpGhost + ')';
      }
    }
    const statusKey = (p.shield | 0) + '|' + (p.statuses.petrified ? 'P' : '') + (p.statuses.poison ? 'O' : '') + (p.statuses.burn ? 'B' : '') + (p.statuses.chill ? 'C' : '') + (p.statuses.weaken ? 'W' : '');
    if (statusKey !== cache.shield) {
      cache.shield = statusKey;
      hud.shieldRow.innerHTML = '';
      const pip = (txt, cls) => {
        const d = document.createElement('div');
        d.className = 'shield-pip' + (cls ? ' ' + cls : '');
        d.innerHTML = txt;
        hud.shieldRow.appendChild(d);
      };
      if (p.shield > 0) pip(A.iconHtml('shield', 'pip-art') + ' ' + Math.round(p.shield));
      if (p.statuses.petrified) pip(A.iconHtml('🪨', 'pip-art') + ' PETRIFIED — [SPACE] to shatter', 'petrify');
      if (p.statuses.poison) pip(A.iconHtml('💀', 'pip-art') + ' POISONED', 'petrify');
      if (p.statuses.burn) pip(A.iconHtml('🔥', 'pip-art') + ' BURNING', 'petrify');
      if (p.statuses.weaken) pip(A.iconHtml('🌀', 'pip-art') + ' WEAKENED', 'petrify');
    }
    const reg = G.region ? G.region() : D.REGIONS[0];
    if (hud.actStatus && slowDue) {
      const act = G.regionIndex < 8 ? 'I' : G.regionIndex < 16 ? 'II' : 'III';
      const inAct = (G.regionIndex % 8) + 1;
      const milestone = G.regionIndex < 8 ? 'Thread at region 8' : G.regionIndex < 16 ? 'Thread at region 16' : 'Final capstone';
      const actText = reg.optionalDestination ? 'GREEK EXPEDITION · ENCOUNTER ' + (G.chamberIndex + 1) + '/8' : 'ACT ' + act + ' · REGION ' + inAct + '/8 · ENCOUNTER ' + (G.chamberIndex + 1) + '/8 · ' + milestone;
      if (hud.actStatus.textContent !== actText) hud.actStatus.textContent = actText;
    }
    if (cache.region !== reg.id) {
      cache.region = reg.id;
      hud.regionName.textContent = reg.name;
      buildRoomTrack();
    }
    const rk = G.regionIndex + ':' + G.chamberIndex + ':' + (G.roomDef ? G.roomDef.cleared : 0);
    if (cache.room !== rk) { cache.room = rk; buildRoomTrack(); }

    if(hud.levelStatus&&slowDue){
      const run=G.run,threshold=100+20*Math.max(0,(run.level||1)-1);
      const text=G.practiceMode?'PRACTICE · RUN XP OFF':'LV '+run.level+' · '+run.xp+'/'+threshold+' XP';
      if(hud.levelStatus.textContent!==text)hud.levelStatus.textContent=text;
    }

    const ob = G.run.obols;
    if (ob !== cache.obols) { cache.obols = ob; hud.obolNum.textContent = U.comma(ob); }
    if(hud.runStatus && slowDue){
      const q=G.run.quest,sy=G.run.activeSynergies||[];
      const favorIds=Object.keys(G.run.godFavor||{}).sort((a,b)=>(G.run.godFavor[b]||0)-(G.run.godFavor[a]||0));
      const favorId=favorIds.length?favorIds[0]:null, favorText=favorId?' · Favor: '+D.GODS[favorId].name+' '+(G.run.godFavor[favorId]>0?'+':'')+G.run.godFavor[favorId]:'';
      const threads=(G.run.fatedThreadIds||[]).map(id=>K.RunSystems.FATED_THREADS.find(x=>x.id===id)).filter(Boolean).map(x=>x.name);
      const hero=K.RunSystems.HEROES[G.run.heroId]||K.RunSystems.HEROES.perseus,weapon=(D.WEAPONS[G.run.weapon]||{}).name||G.run.weapon;
      const threshold=100+20*Math.max(0,(G.run.level||1)-1);
      const status=G.practiceMode?'PRACTICE YARD · run XP disabled':('Level '+G.run.level+' · '+G.run.xp+'/'+threshold+' XP · '+hero.name+' · '+weapon+' · Threads: '+(threads.join(', ')||'none')+'  ·  '+
        (q?(q.name+' '+q.progress+'/'+q.goal+(q.complete?' · COMPLETE':'')+'  ·  '):'')+
        (sy.length?'Synergy: '+sy.map(x=>x.name).join(', ')+'  ·  ':'')+'Second wind '+G.run.deathDefy+'/'+G.run.deathDefyMax+favorText);
      if(hud.runStatus.textContent!==status)hud.runStatus.textContent=status;
    }
    if (hud.trialStatus && slowDue) {
      const active = G.run.isFatedTrial ? Object.keys(G.run.trialPacts).map(id => { const pact=K.RunSystems.PACTS.find(x=>x.id===id); return pact ? pact.name+' '+G.run.trialPacts[id] : ''; }).filter(Boolean).join(' · ') : '';
      const text = G.run.isFatedTrial ? 'FATED TRIAL · SCORE '+G.run.trialScore+'<br>'+active : '';
      if (hud.trialStatus.innerHTML !== text) hud.trialStatus.innerHTML = text;
    }

    const dc = p.dashCharges;
    if (cache.dash.length !== st.dashMax || cache.dash[0] !== dc) {
      cache.dash = [dc, st.dashMax];
      hud.dashPips.innerHTML = '';
      for (let i = 0; i < st.dashMax; i++) {
        const d = document.createElement('i');
        if (i < dc) d.className = 'on';
        d.setAttribute('aria-hidden', 'true');
        hud.dashPips.appendChild(d);
      }
      hud.dashPips.setAttribute('aria-label', 'Dash charges ' + dc + ' of ' + st.dashMax);
    }

    /* boss bar */
    if (G.boss && !G.boss.dead) {
      hud.bossWrap.classList.remove('hidden');
      const bf = U.clamp(G.boss.hp / G.boss.maxHp, 0, 1);
      const enraged = G.boss.phase >= 2;
      if (Math.abs(bf - cache.boss) > 0.002 || cache.bossRage !== enraged) {
        cache.boss = bf;
        cache.bossRage = enraged;
        hud.bossBar.style.transform = 'scaleX(' + bf + ')';
        hud.bossBar.classList.toggle('rage', enraged);
        hud.bossBar.setAttribute('aria-valuenow', String(Math.round(bf * 100)));
        hud.bossBar.setAttribute('aria-valuetext', G.boss.def.name + ' ' + Math.round(bf * 100) + ' percent' + (enraged ? ', enraged' : ''));
        const badge = document.getElementById('boss-rage-badge');
        if (badge) badge.hidden = !enraged;
      }
      if (cache.bossName !== G.boss.def.name) {
        cache.bossName = G.boss.def.name;
        hud.bossName.textContent = G.boss.def.name;
        hud.bossSub.textContent = G.boss.def.title;
      }
      const stages = G.boss.def.phases || [];
      const stageIndex = U.clamp(G.boss.phase || 0, 0, Math.max(0, stages.length - 1));
      const stage = stages[stageIndex];
      const stageKey = stageIndex + ':' + stages.length + ':' + (stage && stage.name || '');
      if (cache.bossStage !== stageKey) {
        cache.bossStage = stageKey;
        hud.bossStageName.textContent = 'STAGE ' + (stageIndex + 1) + ' / ' + stages.length + (stage ? '  ·  ' + stage.name : '');
        hud.bossStagePips.innerHTML = stages.map((_, i) => '<i class="' + (i === stageIndex ? 'on' : '') + '"></i>').join('');
      }
    } else if (cache.boss !== -2) {
      cache.boss = -2;
      cache.bossStage = '';
      hud.bossWrap.classList.add('hidden');
    }

    /* trays */
    const bt = G.run.boons.map(b => b.id + ':' + b.rarity).join('|');
    if (bt !== cache.boons) {
      cache.boons = bt;
      hud.boonTray.innerHTML = '';
      G.run.boons.forEach(b => {
        const def = D.boonById[b.id];
        const g = D.GODS[def.god];
        const chip = document.createElement('div');
        chip.className = 'boon-chip';
        chip.style.setProperty('--accent', g.color);
        chip.tabIndex = 0;
        chip.setAttribute('role','img');
        chip.title = def.name + ' · ' + D.RARITY[b.rarity].name + '\n' + fmtBoon(def,b.rarity) + '\n' + boonEffectAtoms(resolvedBoonFx(def,b.rarity)).map(atom => atom.label + ': ' + formatBoonEffectValue(atom)).join('\n');
        chip.setAttribute('aria-label',chip.title);
        chip.innerHTML = A.iconHtml('god:' + def.god, 'tray-art') + '<span class="nm">' + def.name +
          '</span><span class="lv">' + D.RARITY[b.rarity].name.charAt(0) + '</span>';
        hud.boonTray.appendChild(chip);
      });
    }
    const rt = G.run.relics.length;
    if (rt !== cache.relics) {
      cache.relics = rt;
      hud.relicTray.innerHTML = '';
      G.run.relics.forEach(id => {
        const r = D.relicById[id];
        const chip = document.createElement('div');
        chip.className = 'relic-chip';
        chip.style.setProperty('--accent', r.color);
        chip.title = r.name + ' — ' + r.desc;
        chip.tabIndex = 0;
        chip.setAttribute('role','img');
        chip.setAttribute('aria-label',chip.title);
        chip.innerHTML = A.iconHtml('relic:' + id, 'tray-art') + '<span class="nm">' + r.name + '</span>';
        hud.relicTray.appendChild(chip);
      });
    }

    /* ability cooldowns, plus a highlight while an ability is active */
    setCd('ab-attack', 0, false);
    setCd('ab-dash', p.dashCharges > 0 ? 0 : 1 - (p.dashRegenT / st.dashRegen), p.dashing > 0);
    setCd('ab-guard', p.guardCd / Math.max(0.01, 1.5 * (st.guardCdMul || 1)), p.guardT > 0);
    setCd('ab-cast', p.castCd / Math.max(0.01, 1.9 * (st.castCdMul || 1)), false);
    setCd('ab-rush', p.rushCd / Math.max(0.01, 6.5 * (st.rushCdMul || 1)), p.rushT > 0);
    setCd('ab-special', p.specialCd / Math.max(0.01, 3.4 * st.specialCdMul), false);
    setCd('ab-call', p.callCd / 22, p.callActive > 0);
    setCd('ab-ascend', p.ascendCd / Math.max(0.01, 30 * (st.ascendCdMul || 1)), p.ascendT > 0);
    /* a connected parry flashes the Guard slot */
    if (p.guardFlash > 0.5) {
      if (!cache.parryFlashed) {
        cache.parryFlashed = true;
        const g = document.getElementById('ab-guard');
        if (g) { g.classList.add('fired'); setTimeout(() => g.classList.remove('fired'), 260); }
      }
    } else if (p.guardFlash <= 0.5) cache.parryFlashed = false;

    /* toasts */
    syncToasts();
  }

  const cdEls = {};
  function setCd(id, frac, active) {
    let e = cdEls[id];
    if (!e) {
      const el = document.getElementById(id);
      if (!el) return;
      e = cdEls[id] = { el, cd: el.querySelector('.ab-cd'), busy: null, ready: null, active: null };
    }
    frac = U.clamp(frac, 0, 1);
    const busy = frac > 0.01;
    if (e.busy !== busy) {
      e.busy = busy;
      e.el.classList.toggle('busy', busy);
      e.el.classList.toggle('ready', !busy);
    }
    const on = !!active;
    if (e.active !== on) { e.active = on; e.el.classList.toggle('active', on); }
    if (e.cd) e.cd.style.transform = 'scaleY(' + frac + ')';
  }

  /* Toasts are keyed so expired ones are removed by identity, not by guesswork. */
  const dismissedToasts = {};
  function syncToasts() {
    if (!G) return;
    const live = Object.create(null);
    G.toasts.forEach(t => {
      live[t.id] = 1;
      if (!seenToasts[t.id] && !dismissedToasts[t.id]) {
        const d = document.createElement('div');
        d.className = 'toast' + (t.big ? ' big' : '');
        d.style.setProperty('--accent', t.color);
        d.textContent = t.text;
        d.title = t.text + ' — click to dismiss';
        d.addEventListener('click', () => {
          dismissedToasts[t.id] = 1;
          delete seenToasts[t.id];
          if (d.parentNode) {
            d.classList.add('fade');
            setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 450);
          }
        });
        hud.toasts.appendChild(d);
        seenToasts[t.id] = d;
        /* cap the visible stack: oldest fades first, newest stays readable */
        while (hud.toasts.children.length > 4) {
          const oldest = hud.toasts.firstElementChild;
          if (oldest) oldest.remove();
        }
      }
    });
    Object.keys(seenToasts).forEach(id => {
      if (!live[id]) {
        const el = seenToasts[id];
        if (el && el.parentNode) { el.classList.add('fade'); setTimeout(((node) => () => { if (node.parentNode) node.parentNode.removeChild(node); })(el), 450); }
        delete seenToasts[id];
      }
    });
    Object.keys(dismissedToasts).forEach(id => { if (!live[id]) delete dismissedToasts[id]; });
  }

  function buildRoomTrack() {
    if (!G || !G.run) return;
    hud.roomTrack.innerHTML = '';
    const types = G.roomTrack();
    types.forEach((t, i) => {
      const d = document.createElement('i');
      if (t === 'boss' || t === 'optionalboss') d.classList.add('boss');
      if (i < G.chamberIndex || (i === G.chamberIndex && G.roomDef && G.roomDef.cleared)) d.classList.add('done');
      else if (i === G.chamberIndex) d.classList.add('now');
      hud.roomTrack.appendChild(d);
    });
  }

  /* ---------------- room / reward cards ---------------- */
  function showRouteScreen(choices) {
    document.getElementById('story-voices').classList.add('hidden');
    const region = G.region();
    document.getElementById('room-kicker').textContent = region.name + ' · CHAMBER ' + (G.chamberIndex + 2) + ' OF 8';
    document.getElementById('room-title').textContent = 'CHOOSE YOUR WAY FORWARD';
    document.getElementById('room-desc').textContent = 'Each path previews its danger, condition, enemy family, and reward.';
    const wrap = document.getElementById('room-choices'); wrap.innerHTML = '';
    choices.forEach(node => {
      const condition = node.condition || {};
      const families = node.familyNames || (node.families || []).map(id => D.ENEMIES[id] && D.ENEMIES[id].name).filter(Boolean).slice(0, 2).join(' and ');
      const meta = '<div class="route-meta"><span><strong>DANGER</strong> ' + escapeHtml(node.danger || 'Steady') + '</span>' +
        '<span><strong>REWARD</strong> ' + escapeHtml(node.reward || 'Run XP from defeated foes') + '</span>' +
        '<span><strong>COST</strong> ' + escapeHtml(node.cost || 'None') + '</span>' +
        '<span><strong>CONDITION</strong> ' + escapeHtml(condition.name || node.title) + (condition.desc ? ' · ' + escapeHtml(condition.desc) : '') + '</span>' +
        (families ? '<span><strong>THREATS</strong> ' + escapeHtml(families) + '</span>' : '') +
        (node.synergyTag ? '<span><strong>BUILD SYNERGY</strong> ' + escapeHtml(node.synergyTag) + '</span>' : '') + '</div>';
      const summary = node.desc ? '<p>' + escapeHtml(node.desc) + '</p>' : '';
      wrap.appendChild(cardEl({ title:escapeHtml(node.title), icon:'region:' + node.regionId + ':' + node.type, descHtml:summary + meta, rarity:node.danger === 'Severe' ? 'epic' : 'common', extra:' room route-card', onClick:() => G.selectRoute(node.id) }));
    });
    showScreen('screen-room');
  }

  function showEventScreen(event) {
    document.getElementById('story-voices').classList.add('hidden');
    const region = G.region();
    const patron = event.godId && D.GODS[event.godId];
    document.getElementById('room-kicker').textContent = patron ? 'DIVINE AUDIENCE · ' + (patron.group || 'IMMORTALS').toUpperCase() + ' · ' + patron.domain : region.name + ' · A FATEFUL EVENT';
    document.getElementById('room-title').textContent = event.name;
    document.getElementById('room-desc').textContent = event.desc;
    const wrap = document.getElementById('room-choices'); wrap.innerHTML = '';
    event.choices.forEach((choice, i) => wrap.appendChild(cardEl({ title:choice.title, icon:patron ? 'god:' + patron.id : 'region:' + region.id + ':event', god:patron ? patron.name + ' · Favor ' + (choice.favorDelta > 0 ? '+' : '') + (choice.favorDelta || 0) : '', accent:patron && patron.color, cost:choice.costObols, disabled:!!choice.costObols && G.run.obols < choice.costObols, desc:choice.desc, rarity:i ? 'rare' : 'common', extra:' room divine-choice', onClick:() => G.chooseEvent(choice.id) })));
    showScreen('screen-room');
  }

  let activeCampaignStory = null;
  let campaignVoiceIndex = 0;
  let campaignScenePhase = 'lines';

  function campaignActorAsset(voice) {
    const icon = String(voice.icon || '');
    let kind = '', raw = '';
    if (icon.indexOf('enemy:') === 0) { kind = 'enemy'; raw = icon.slice(6); }
    else if (icon.indexOf('boss:') === 0) { kind = 'boss'; raw = icon.slice(5); }
    if (!kind) return null;
    const source = kind === 'boss' ? D.BOSSES[raw] : D.ENEMIES[raw];
    const family = source && (source.visualKey || source.sourceId) || raw;
    const assetId = 'actor.' + kind + '.' + family;
    const entry = A.entry(assetId);
    return entry ? { id:assetId, entry } : null;
  }

  function setCampaignFigure(voice) {
    const stage = document.getElementById('cutscene-figure-stage');
    const speakerArt = document.getElementById('cutscene-speaker-art');
    const asset = campaignActorAsset(voice);
    stage.innerHTML = '';
    speakerArt.innerHTML = '';
    const icon = voice.icon || 'god:hades';
    if (asset) {
      const image = document.createElement('span');
      image.className = 'cutscene-portrait-sprite';
      image.setAttribute('role', 'img');
      image.setAttribute('aria-label', voice.name);
      image.style.backgroundImage = 'url("' + A.url(asset.id).replace(/"/g, '%22') + '")';
      image.style.backgroundSize = (asset.entry.cols * 100) + '% ' + (asset.entry.rows * 100) + '%';
      image.style.backgroundPosition = '0% 0%';
      const height = Math.min(470, Math.max(245, window.innerHeight * 0.48));
      const width = Math.min(height * A.cellAspect(asset.id), window.innerWidth * 0.76);
      image.style.width = width + 'px';
      image.style.height = height + 'px';
      stage.appendChild(image);
      speakerArt.innerHTML = A.iconHtml(icon, 'cutscene-speaker-icon', voice.name);
    } else {
      const medallion = document.createElement('span');
      medallion.className = 'cutscene-portrait-medallion';
      medallion.innerHTML = A.iconHtml(icon, 'cutscene-god-image', voice.name);
      stage.appendChild(medallion);
      speakerArt.innerHTML = A.iconHtml(icon, 'cutscene-speaker-icon', voice.name);
    }
    stage.classList.remove('arrive');
    void stage.offsetWidth;
    stage.classList.add('arrive');
  }

  function renderCampaignVoice() {
    if (!activeCampaignStory) return;
    const chapter = activeCampaignStory.chapter;
    const voice = chapter.voices[campaignVoiceIndex];
    if (!voice) { showCampaignChoices(); return; }
    document.getElementById('cutscene-dialogue').classList.remove('hidden');
    document.getElementById('cutscene-choices').classList.add('hidden');
    document.getElementById('cutscene-speaker-name').textContent = voice.name;
    document.getElementById('cutscene-speaker-title').textContent = voice.title || '';
    document.getElementById('cutscene-progress').textContent = (campaignVoiceIndex + 1) + ' / ' + chapter.voices.length;
    document.getElementById('cutscene-line').textContent = '“' + voice.text + '”';
    const dialogue = document.getElementById('cutscene-dialogue');
    dialogue.classList.remove('arrive');
    void dialogue.offsetWidth;
    dialogue.classList.add('arrive');
    setCampaignFigure(voice);
    document.getElementById('cutscene-skip').classList.remove('hidden');
    document.getElementById('cutscene-review').classList.add('hidden');
    document.getElementById('cutscene-next').innerHTML = campaignVoiceIndex + 1 === chapter.voices.length ? 'CHOOSE YOUR FATE <span aria-hidden="true">›</span>' : 'CONTINUE <span aria-hidden="true">›</span>';
    campaignScenePhase = 'lines';
  }

  function showCampaignChoices() {
    if (!activeCampaignStory) return;
    campaignScenePhase = 'choices';
    document.getElementById('cutscene-dialogue').classList.add('hidden');
    const wrap = document.getElementById('cutscene-choices');
    wrap.innerHTML = '';
    wrap.classList.remove('hidden');
    activeCampaignStory.chapter.choices.forEach((choice, i) => {
      const affinity = choice.affinity && D.GODS[choice.affinity] ? choice.affinity : null;
      const choiceCard = cardEl({
        title:choice.title,
        icon:affinity ? 'god:' + affinity : 'region:' + G.region().id + ':event',
        desc:choice.desc + (choice.reply ? '<br/><em>' + choice.reply + '</em>' : ''),
        accent:affinity ? D.GODS[affinity].color : '#f0cf5e',
        rarity:i ? 'rare' : 'epic', extra:' room campaign-choice cutscene-choice',
        onClick:() => activeCampaignStory.optional ? G.chooseMythScene(choice.id) : G.chooseStory(choice.id)
      });
      choiceCard.tabIndex = 0;
      choiceCard.setAttribute('role', 'button');
      wrap.appendChild(choiceCard);
    });
    document.getElementById('cutscene-skip').classList.add('hidden');
    document.getElementById('cutscene-review').classList.remove('hidden');
    document.getElementById('cutscene-next').classList.add('hidden');
    wrap.classList.remove('arrive');
    void wrap.offsetWidth;
    wrap.classList.add('arrive');
    if (wrap.firstElementChild) wrap.firstElementChild.focus();
  }

  function advanceCampaignCutscene() {
    if (!activeCampaignStory || campaignScenePhase !== 'lines') return;
    if (campaignVoiceIndex + 1 < activeCampaignStory.chapter.voices.length) {
      campaignVoiceIndex++;
      renderCampaignVoice();
    } else showCampaignChoices();
  }

  function showCampaignStory(pending) {
    activeCampaignStory = pending;
    campaignVoiceIndex = 0;
    campaignScenePhase = 'lines';
    const chapter = pending.chapter, region = G.region();
    document.getElementById('cutscene-kicker').textContent = pending.optional ? 'DIVINE ENCOUNTER · ' + region.name : 'CAMPAIGN · CHAPTER ' + (pending.chapterIndex + 1) + ' OF ' + D.CAMPAIGN_STORY.length + ' · ' + region.name;
    document.getElementById('cutscene-title').textContent = chapter.title;
    document.getElementById('cutscene-intro').textContent = chapter.intro;
    const backdrop = document.getElementById('cutscene-backdrop');
    const backdropKey = 'region.' + region.id + '.backdrop';
    const fallbackBackdrop = 'region.' + ({ancient_greece:'elysium',atlantis:'aegean'}[region.id] || region.artFamily || 'tartarus') + '.backdrop';
    backdrop.src = A.url(A.entry(backdropKey) ? backdropKey : fallbackBackdrop);
    backdrop.alt = region.name + ' — campaign scene';
    document.getElementById('cutscene-choices').innerHTML = '';
    document.getElementById('cutscene-next').classList.remove('hidden');
    renderCampaignVoice();
    showScreen('screen-cutscene');
    document.getElementById('cutscene-next').focus();
  }


  function cardEl(opts) {
    const c = document.createElement('div');
    c.className = 'card rarity-' + (opts.rarity || 'common') + (opts.extra || '') + (opts.disabled ? ' disabled' : '');
    if (opts.accent) c.style.setProperty('--accent', opts.accent);
    let html = '';
    if (opts.portraitMarkup) html += '<div class="card-icon divine-cover">' + opts.portraitMarkup + '</div>';
    else if (opts.icon) html += '<div class="card-icon">' + (K.Portraits && opts.icon.startsWith('god:') ? K.Portraits.html(opts.icon.slice(4),{surface:'reward',className:'card-icon-art'}) : A.iconHtml(opts.icon, 'card-icon-art')) + '</div>';
    if (opts.god) html += '<div class="god">' + opts.god + '</div>';
    html += '<h4>' + opts.title + '</h4>';
    if (opts.descHtml) html += '<div class="card-desc">' + opts.descHtml + '</div>';
    else if (opts.desc) html += '<p>' + opts.desc + '</p>';
    if (opts.effectMarkup) html += '<div class="boon-effects">' + opts.effectMarkup + '</div>';
    if (opts.rarityLabel) html += '<span class="rarity">' + opts.rarityLabel + '</span>';
    if (opts.owned) html += '<div class="owned">' + opts.owned + '</div>';
    if (opts.cost !== undefined) html += '<div class="cost">' + A.iconHtml('coin', 'currency-icon') + ' ' + opts.cost + '</div>';
    if (opts.locked) html += '<div class="requirement">' + opts.locked + '</div>';
    c.innerHTML = html;
    if (opts.onClick) {
      c.setAttribute('role','button');
      c.setAttribute('aria-disabled',String(!!opts.disabled));
      /* Disabled cards stay focusable so keyboard and screen readers can review the reason. */
      c.tabIndex = 0;
      if (opts.disabled && (opts.locked || opts.cost !== undefined)) c.title = String(opts.locked || ('Requires ' + opts.cost + ' obols')).replace(/<[^>]*>/g, '');
      c.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar' || ev.code === 'Space') { ev.preventDefault(); if (!opts.disabled) c.click(); } });
    }
    if (!opts.disabled && opts.onClick) c.addEventListener('click', () => { K.Audio.sfx('ui'); opts.onClick(); });
    else if (opts.disabled && opts.onClick) c.addEventListener('click', () => { K.Audio.sfx('ui2'); });
    return c;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  }
  const STAT_NAMES = { dmgMul:'Damage', armor:'Flat damage reduction', maxHp:'Maximum health', dmgReduce:'Damage reduction', attSpd:'Attack speed',
    moveMul:'Move speed', crit:'Critical chance', critMul:'Critical damage', reachMul:'Strike reach', obolMul:'Obol gain',
    darkBonus:'Healing on Wrath', killHeal:'Health on kill', maxShield:'Maximum shield', dashCharge:'Dash charges', dashDist:'Dash distance',
    dashDmg:'Dash damage', deathDefy:'Death defiance', harvestOnKill:'Harvest chance', winterOnHit:'Winter mark', dodge:'Dodge chance',
    freeShop:'Shop discount', critMark:'Marked-target damage bonus' };
  const PERCENT_STATS = new Set(['dmgMul','dmgReduce','attSpd','moveMul','crit','critMul','reachMul','obolMul','darkBonus','harvestOnKill','dodge','freeShop','critMark']);
  function formatStat(key, value, signed) {
    const name = STAT_NAMES[key] || key.replace(/([A-Z])/g, ' $1').replace(/Mul$/, '');
    let amount = value;
    if (PERCENT_STATS.has(key)) amount = (value * 100).toFixed(Math.abs(value * 100) < 10 ? 1 : 0) + '%';
    else amount = (Math.abs(value) < 10 && value % 1 ? value.toFixed(1) : Math.round(value)).toString();
    if (signed && !PERCENT_STATS.has(key)) amount = (value > 0 ? '+' : '') + amount;
    else if (signed && PERCENT_STATS.has(key) && value > 0) amount = '+' + amount;
    return name + ' ' + amount;
  }
  function fxMarkup(fx) {
    const entries = Object.keys(fx || {}).filter(k => typeof fx[k] === 'number' && fx[k] !== 0);
    return entries.length ? entries.map(k => '<p>' + escapeHtml(formatStat(k, fx[k], true)) + '</p>').join('') : '<p>No direct stat effects.</p>';
  }
  function previewGearEffects(item) {
    const save = K.Save.data;
    const before = K.Gear.effects(save), preview = Object.assign({},save,{equippedGear:Object.assign({},save.equippedGear)});
    preview.equippedGear[item.slot] = item.id;
    const after = K.Gear.effects(preview), keys = Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).sort();
    const changes = keys.map(k => [k, (after[k] || 0) - (before[k] || 0)]).filter(pair => Math.abs(pair[1]) > 0.000001);
    if (!changes.length) return '<p class="armory-empty">No stat change from the current loadout.</p>';
    return changes.map(([key, value]) => '<div class="comparison-line"><span>' + escapeHtml(STAT_NAMES[key] || key) + '</span><strong class="' + (value > 0 ? 'comparison-up' : 'comparison-down') + '">' + escapeHtml(formatStat(key, value, true).replace((STAT_NAMES[key] || key) + ' ', '')) + '</strong></div>').join('');
  }

  function renderArmory() {
    const save = K.Save.data, gear = K.Gear;
    const slotWrap = document.getElementById('armory-slot-list');
    slotWrap.innerHTML = gear.SLOTS.map(slot => '<button type="button" class="armory-slot" data-slot="' + slot + '" aria-pressed="' + (armorySlot === slot) + '">' + A.iconHtml('gear:' + slot) + '<span>' + escapeHtml(gear.SLOT_NAMES[slot]) + '</span></button>').join('');
    slotWrap.querySelectorAll('.armory-slot').forEach(button => button.addEventListener('click', () => {
      armorySlot = button.getAttribute('data-slot'); armorySelectedId = null; armoryMessage = ''; renderArmory();
      const selected = document.querySelector('#armory-collection .armory-item'); if (selected) selected.focus();
    }));
    document.getElementById('armory-filter').value = armoryFilter;
    document.getElementById('armory-sort').value = armorySort;
    document.getElementById('armory-resources').innerHTML = '<strong>' + U.comma(save.obols || 0) + '</strong> Obols &nbsp;·&nbsp; <strong>' + U.comma(save.salvageShards || 0) + '</strong> Salvage shards';
    let items = save.gearInventory.filter(item => item.slot === armorySlot);
    if (armoryFilter === 'equipped') items = items.filter(item => save.equippedGear[armorySlot] === item.id);
    else if (armoryFilter === 'unequipped') items = items.filter(item => save.equippedGear[armorySlot] !== item.id);
    else if (K.Gear.RARITIES[armoryFilter]) items = items.filter(item => item.rarity === armoryFilter);
    const rarityOrder = Object.keys(gear.RARITIES);
    items.sort((a,b) => armorySort === 'name' ? a.name.localeCompare(b.name) : armorySort === 'rarity' ? rarityOrder.indexOf(b.rarity)-rarityOrder.indexOf(a.rarity) || b.level-a.level : b.level-a.level || rarityOrder.indexOf(b.rarity)-rarityOrder.indexOf(a.rarity));
    if (!items.some(item => item.id === armorySelectedId)) armorySelectedId = items.length ? items[0].id : null;
    document.getElementById('armory-count').textContent = items.length + ' shown · ' + save.gearInventory.filter(item => item.slot === armorySlot).length + ' in slot';
    const list = document.getElementById('armory-collection'); list.innerHTML = '';
    if (!items.length) list.innerHTML = '<p class="armory-empty">No pieces match this filter.</p>';
    items.forEach(item => {
      const equipped = save.equippedGear[item.slot] === item.id;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'armory-item rarity-' + item.rarity; btn.setAttribute('aria-pressed', item.id === armorySelectedId ? 'true' : 'false');
      const mastered = item.level > gear.MAX_POWER_LEVEL;
      btn.setAttribute('aria-label', item.name + ', ' + item.rarity + ', level ' + item.level + (mastered ? ', legacy mastered, effective level ' + gear.MAX_POWER_LEVEL : '') + (equipped ? ', equipped' : ''));
      btn.innerHTML = A.iconHtml('gear:' + item.slot) + '<span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.rarity.toUpperCase()) + ' · Lv ' + item.level + (mastered ? ' · LEGACY / MASTERED' : '') + (equipped ? ' · EQUIPPED' : '') + '</small></span>';
      btn.style.setProperty('--accent', ({common:'#b6a68a',rare:'#6fb2e8',epic:'#c58ce8',heroic:'#e8a24a',legendary:'#f0cf5e'})[item.rarity] || '#b6a68a');
      btn.addEventListener('click', () => { armorySelectedId = item.id; armoryMessage = ''; renderArmory(); const active = document.querySelector('#armory-collection .armory-item[aria-pressed="true"]'); if (active) active.focus(); });
      list.appendChild(btn);
    });
    const item = save.gearInventory.find(x => x.id === armorySelectedId) || null;
    const selectedArt = document.getElementById('armory-selected-art');
    const rarity = document.getElementById('armory-selected-rarity');
    const title = document.getElementById('armory-selected-title');
    const details = document.getElementById('armory-details');
    const comparison = document.getElementById('armory-comparison');
    const status = document.getElementById('armory-status');
    const equip = document.getElementById('armory-equip'), upgrade = document.getElementById('armory-upgrade');
    const sell = document.getElementById('armory-sell'), salvage = document.getElementById('armory-salvage');
    const actions = [['armory-equip','equip'],['armory-upgrade','upgrade'],['armory-sell','sell'],['armory-salvage','salvage']];
    actions.forEach(([id, name]) => { const icon = document.querySelector('#' + id + ' .action-icon'); if (icon) icon.style.cssText = A.iconStyle('gear-action:' + name); });
    if (!item) {
      selectedArt.innerHTML = A.iconHtml('gear:' + armorySlot); rarity.textContent = ''; title.textContent = 'No piece selected';
      details.innerHTML = '<p>Choose another slot or change the filter.</p>'; comparison.innerHTML = '<p class="armory-empty">Equip a piece to preview its loadout.</p>';
      [equip,upgrade,sell,salvage].forEach(b => { b.disabled = true; }); status.textContent = armoryMessage; return;
    }
    const equipped = save.equippedGear[item.slot] === item.id;
    selectedArt.innerHTML = A.iconHtml('gear:' + item.slot);
    rarity.textContent = item.rarity; rarity.className = 'rarity rarity-' + item.rarity;
    title.textContent = item.name;
    const set = item.setId && gear.SETS[item.setId];
    const setCount = set ? save.gearInventory.filter(x => x.setId === set.id && save.equippedGear[x.slot] === x.id).length : 0;
    const effectiveLevel = gear.effectiveLevel(item), mastered = item.level > gear.MAX_POWER_LEVEL;
    details.innerHTML = '<p><strong>' + escapeHtml(gear.SLOT_NAMES[item.slot]) + '</strong> · Level ' + item.level + ' · Effective power ' + effectiveLevel + '/' + gear.MAX_POWER_LEVEL + (mastered ? ' · <strong>LEGACY / MASTERED</strong>' : '') + (equipped ? ' · <strong>EQUIPPED</strong>' : '') + '</p>' +
      (set ? '<p><strong>' + escapeHtml(set.name) + '</strong> · ' + setCount + '/6 equipped</p>' : '') +
      '<p>' + escapeHtml((item.affixes || []).map(a => a.name).join(' · ') || 'No secondary affixes') + '</p>' +
      '<div class="gear-stat-list">' + fxMarkup(item.baseEffects) + (item.affixes || []).map(a => fxMarkup(a.fx)).join('') + '</div>';
    comparison.innerHTML = equipped ? '<p class="armory-empty">This piece is already equipped.</p>' : previewGearEffects(item);
    const reinforcePreview = gear.reinforcementPreview && gear.reinforcementPreview(item.id);
    const cost = gear.upgradeCost(item), canUpgrade = reinforcePreview ? reinforcePreview.ok : Number.isFinite(cost) && save.obols >= cost && save.salvageShards >= 1;
    equip.disabled = equipped; upgrade.disabled = !canUpgrade; sell.disabled = equipped; salvage.disabled = equipped;
    upgrade.title = effectiveLevel >= gear.MAX_POWER_LEVEL ? 'This item has reached its level 30 power cap.' : 'Upgrade costs ' + U.comma(cost) + ' Obols and 1 salvage shard.';
    sell.title = equipped ? 'Unequip this piece before selling it.' : 'Sell for ' + U.comma(gear.sellValue(item)) + ' Obols.';
    salvage.title = equipped ? 'Unequip this piece before salvaging it.' : 'Salvage for ' + gear.RARITIES[item.rarity].salvage + ' shard(s).';
    status.textContent = armoryMessage || (mastered ? 'Legacy item retained. Combat effects, upgrade cost, and sale value use the level 30 cap.' : effectiveLevel >= gear.MAX_POWER_LEVEL ? 'Mastered · level 30 is the final effective power level.' : (equipped ? 'Equipped · selling and salvage locked.' : (!canUpgrade ? 'Upgrade needs ' + U.comma(cost) + ' Obols and 1 salvage shard.' : '')));
    upgrade.innerHTML = 'UPGRADE';
    if (reinforcePreview && !reinforcePreview.ok && !armoryMessage) status.textContent = reinforcePreview.reason;
    if (K.OverhaulUI) K.OverhaulUI.workbench(item);
  }

  function openArmory(returnScreen) {
    armoryReturnScreen = returnScreen; rememberAtlasOrigin(returnScreen);
    renderArmory(); showScreen('screen-armory');
    const first = document.querySelector('#armory-slot-list .armory-slot'); if (first) first.focus();
  }
  function closeArmory() {
    showScreen(armoryReturnScreen, armoryReturnScreen !== 'screen-title');
    const target = document.getElementById(armoryReturnScreen === 'screen-pause' ? 'btn-resume' : 'btn-armory');
    if (target) target.focus();
  }

  function paragonReason(node, save) {
    if (!save.paragonUnlocked) return 'Complete your first regional capstone to unlock the Loom.';
    if (node.id === K.Paragon.ROOT_ID) return 'The center of the board. Every branch begins here.';
    if (save.paragonNodes.includes(node.id)) return 'Woven permanently into your fate.';
    if (node.keystone && save.paragonNodes.some(id => K.Paragon.NODES[id] && K.Paragon.NODES[id].branch === node.branch && K.Paragon.NODES[id].keystone)) return 'The other keystone in this branch is already woven.';
    const missing = node.requires.find(id => !save.paragonNodes.includes(id));
    if (missing) return 'Weave ' + K.Paragon.NODES[missing].name + ' first.';
    if (save.paragonPoints < node.cost) return 'Need ' + (node.cost - save.paragonPoints) + ' more Paragon point' + (node.cost - save.paragonPoints === 1 ? '' : 's') + '.';
    return 'Connected and affordable.';
  }
  function renderParagon() {
    const save = K.Save.data, api = K.Paragon;
    const spentPoints = (save.paragonNodes || []).reduce((sum,id) => { const node=api.NODES[id]; return node && id!==api.ROOT_ID ? sum+node.cost : sum; },0);
    const heldPoints = save.paragonPoints || 0;
    document.getElementById('paragon-progress').innerHTML = '<strong>' + U.comma(heldPoints) + '</strong> points held &nbsp;·&nbsp; <strong>' + (save.paragonXp || 0) + '/100</strong> XP &nbsp;·&nbsp; ' + spentPoints + '/' + api.MAX_SPENDABLE_POINTS + ' woven';
    document.getElementById('paragon-lock-message').textContent = save.paragonUnlocked ? (spentPoints + heldPoints >= api.MAX_SPENDABLE_POINTS ? 'The Loom has a 42-point capacity. New XP no longer adds points at capacity; any legacy excess points remain available.' : 'Every hundred kill-XP grants a point until the 42-point capacity is spent or banked. Points persist across descents.') : 'Locked — defeat a regional capstone to begin weaving your fate.';
    const tree = document.getElementById('paragon-tree');
    let html = '<button type="button" class="paragon-node paragon-root ' + (paragonSelectedNode === api.ROOT_ID ? 'selected' : '') + ' owned" data-node="' + api.ROOT_ID + '" aria-pressed="' + (paragonSelectedNode === api.ROOT_ID) + '" style="grid-column:1/-1">' + A.iconHtml('branch:ares') + ' WAYFARER · FREE ROOT</button>';
    Object.keys(api.BRANCHES).forEach(id => {
      const branch = api.BRANCHES[id];
      html += '<section class="paragon-branch" aria-label="' + escapeHtml(branch.name) + ' branch"><h3 class="paragon-branch-heading">' + A.iconHtml('branch:' + id) + '<span>' + escapeHtml(branch.name) + '</span></h3><div class="paragon-branch-nodes">';
      branch.nodes.forEach(node => {
        const owned = save.paragonNodes.includes(node.id), available = api.canBuy(node.id, save), selected = paragonSelectedNode === node.id;
        html += '<button type="button" class="paragon-node ' + (owned?'owned ':'') + (available?'available ':'') + (selected?'selected':'') + '" data-node="' + node.id + '" aria-pressed="' + selected + '" aria-label="' + escapeHtml(node.name + (owned ? ', owned' : available ? ', available' : ', ' + paragonReason(node, save))) + '">' + escapeHtml(node.name) + '<br>' + (owned?'WOVEN':node.cost + ' POINT') + '</button>';
      });
      html += '</div><div class="paragon-keystones"><div class="paragon-keystone-label">CHOOSE ONE · 3 POINTS</div>';
      branch.keystones.forEach(node => {
        const owned = save.paragonNodes.includes(node.id), available = api.canBuy(node.id, save), selected = paragonSelectedNode === node.id;
        html += '<button type="button" class="paragon-node keystone ' + (owned?'owned ':'') + (available?'available ':'') + (selected?'selected':'') + '" data-node="' + node.id + '" aria-pressed="' + selected + '" aria-label="' + escapeHtml(node.name + (owned ? ', owned' : available ? ', available' : ', ' + paragonReason(node, save))) + '">' + escapeHtml(node.name) + '<br>' + (owned?'WOVEN':'3 POINTS') + '</button>';
      });
      html += '</div></section>';
    });
    tree.innerHTML = html;
    tree.querySelectorAll('.paragon-node').forEach(button => button.addEventListener('click', () => { paragonSelectedNode = button.getAttribute('data-node'); paragonMessage = ''; renderParagon(); const active = Array.from(document.querySelectorAll('#paragon-tree .paragon-node')).find(b => b.getAttribute('data-node') === paragonSelectedNode); if(active) active.focus(); }));
    const node = api.NODES[paragonSelectedNode] || api.NODES[api.ROOT_ID];
    const branch = api.BRANCHES[node.branch];
    const owned = save.paragonNodes.includes(node.id), available = api.canBuy(node.id, save);
    document.getElementById('paragon-selected-art').innerHTML = A.iconHtml(node.branch === 'root' ? 'branch:ares' : 'branch:' + node.branch);
    document.getElementById('paragon-node-state').textContent = owned ? 'WOVEN' : (available ? 'READY TO WEAVE' : 'FATE SEALED — SEE REQUIREMENT BELOW');
    document.getElementById('paragon-selected-title').textContent = node.name;
    document.getElementById('paragon-node-description').textContent = node.id === api.ROOT_ID ? 'The first thread, freely granted. Choose a path through the six Olympian domains.' : branch.name + ' · ' + branch.theme + (node.keystone ? ' · Keystone' : ' · Tier ' + node.tier);
    document.getElementById('paragon-node-effects').innerHTML = fxMarkup(node.fx);
    document.getElementById('paragon-node-requirement').textContent = paragonMessage || paragonReason(node, save);
    const buy = document.getElementById('paragon-buy'); buy.disabled = !available; buy.textContent = node.id === api.ROOT_ID ? 'ROOT NODE' : (owned ? 'ALREADY WOVEN' : 'WEAVE NODE · ' + node.cost + ' POINT' + (node.cost === 1 ? '' : 'S'));
    const bought = save.paragonNodes.filter(id => id !== api.ROOT_ID).length, respecCost = api.respecCost(save);
    const respec = document.getElementById('paragon-respec'); respec.disabled = !save.paragonUnlocked || bought === 0 || save.obols < respecCost;
    respec.textContent = bought ? 'MIRROR RESPEC · ' + U.comma(respecCost) + ' OBOLS' : 'MIRROR RESPEC · NO NODES WOVEN';
    document.getElementById('paragon-respec-info').textContent = bought ? 'Refund ' + bought + ' nodes for ' + U.comma(respecCost) + ' Obols. Current balance: ' + U.comma(save.obols) + '.' : 'No purchased nodes to refund.';
  }
  function openParagon(returnScreen) {
    paragonReturnScreen = returnScreen; rememberAtlasOrigin(returnScreen); renderParagon(); showScreen('screen-paragon');
    const firstNode = document.getElementById('paragon-tree').querySelector('.paragon-node');
    if (firstNode) firstNode.focus();
  }
  function closeParagon() {
    showScreen(paragonReturnScreen, paragonReturnScreen !== 'screen-title');
    const target = document.getElementById(paragonReturnScreen === 'screen-pause' ? 'btn-resume' : 'btn-paragon');
    if (target) target.focus();
  }

  function showRewardScreen(reward) {
    const wrap = document.getElementById('reward-choices');
    wrap.innerHTML = '';
    const kick = document.getElementById('reward-kicker');
    const title = document.getElementById('reward-title');
    const rr = document.getElementById('reroll-count');
    const btnRr = document.getElementById('btn-reroll');
    const btnSkip = document.getElementById('btn-skip-boon');
    btnSkip.innerHTML = 'REFUSE THE GODS <span id="skip-bonus"></span>';

    if (reward.kind === 'fatedThread') {
      kick.textContent = 'A THREAD FROM THE FATES';
      title.textContent = 'CHOOSE A RUN TRANSFORMATION';
      btnRr.classList.add('hidden'); btnSkip.classList.remove('hidden');
      btnSkip.innerHTML = 'SKIP THREAD <span id="skip-bonus">(+30 obols, +8 max life, restore 20)</span>';
      reward.choices.forEach(ch => {
        const thread = K.RunSystems.FATED_THREADS.find(item => item.id === ch.id);
        if (!thread) return;
        wrap.appendChild(cardEl({ title:thread.name, icon:'region:' + G.region().id + ':event', god:thread.category + ' · Fated Thread', accent:'#e8d9ad',
          desc:thread.desc, rarity:'epic', rarityLabel:'Run transformation',
          effectMarkup:boonCardEffectMarkup({id:'thread:'+thread.id,fx:thread.fx,rarity:'legendary'}, 'legendary', null, false),
          onClick:() => { if (G.takeFatedThread(thread.id)) closeToPlay(); }
        }));
      });
    } else if (reward.kind === 'relic') {
      kick.textContent = 'A RELIC OF THE OLD WORLD';
      title.textContent = 'TAKE ONE';
      btnRr.classList.add('hidden');
      btnSkip.classList.add('hidden');
      reward.choices.forEach(ch => {
        if (ch.kind === 'gear') {
          const item = ch.item;
          wrap.appendChild(cardEl({
            title: item.name, icon: 'gear:' + item.slot, accent: ({common:'#b6a68a',rare:'#6fb2e8',epic:'#c58ce8',heroic:'#e8a24a',legendary:'#f0cf5e'})[item.rarity],
            desc: item.rarity.toUpperCase() + ' ' + K.Gear.SLOT_NAMES[item.slot] + ' · Level ' + item.level + '<br/>' + (item.affixes || []).map(a => a.name).join(' · '),
            rarity: item.rarity, rarityLabel: item.rarity + ' gear',
            onClick: () => { if (G.takeGear(item)) closeToPlay(); }
          }));
          return;
        }
        const r = D.relicById[ch.id];
        wrap.appendChild(cardEl({
          title: r.name, icon: 'relic:' + ch.id, desc: r.desc, accent: r.color,
          rarity: 'rare', rarityLabel: 'Relic',
          onClick: () => { if (G.takeRelic(ch.id)) closeToPlay(); }
        }));
      });
    } else if(reward.kind==='augment') {
      kick.textContent='A MYTHIC FOE’S REMNANT';title.textContent='CHOOSE A RUN AUGMENT';
      btnRr.classList.add('hidden');btnSkip.classList.add('hidden');
      reward.choices.forEach(ch=>{const a=K.RunSystems.AUGMENTS.find(x=>x.id===ch.id);if(!a)return;
        wrap.appendChild(cardEl({title:a.name,icon:'relic:r_hammer',accent:a.color,desc:a.desc + '<div class="boon-effects">' + boonCardEffectMarkup({fx:a.fx},'common',null,false).replace('Common effects','Augment effects') + '</div>',rarity:'epic',rarityLabel:'Run augment',
          onClick:()=>{if(G.takeAugment(ch.id))closeToPlay();}}));
      });
    } else {
      kick.textContent = 'RUN LEVEL '+reward.level+' · DIVINE DRAFT';
      title.textContent = 'CHOOSE ONE BOON';
      btnRr.classList.remove('hidden');
      btnSkip.classList.add('hidden');
      btnRr.disabled = reward.rerolls <= 0;
      rr.textContent = '(' + reward.rerolls + ')';
      btnRr.setAttribute('aria-label', reward.rerolls > 0 ? 'Reroll level-up boon choices, ' + reward.rerolls + ' left' : 'No rerolls left');
      reward.choices.forEach(ch => {
        const b = D.boonById[ch.id];
        const g = D.GODS[b.god];
        const cur = G.run.boonRarity(ch.id);
        const isOwned = G.run.hasBoon(ch.id);
        const rar = D.RARITY[ch.rarity];
        const scale = (b.rarity === 'duo' || b.rarity === 'legendary') ? '' : ' <span style="color:#9a8a72">×' + rar.scale.toFixed(2) + '</span>';
        wrap.appendChild(cardEl({
          title: b.name, god: g.name + ' · ' + g.domain + ' · ' + b.slot.toUpperCase(),
          icon: 'god:' + b.god, accent: g.color, rarity: ch.rarity,
          portraitMarkup: K.Portraits ? K.Portraits.boonHtml(b,{surface:'reward',className:'card-cover-art'}) : '',
          desc: fmtBoon(b, ch.rarity),
          rarityLabel: rar.name,
          owned: isOwned ? 'Upgrade ' + D.RARITY[cur].name + ' → ' + D.RARITY[boonResultRarity(b, cur, ch.rarity)].name : '',
          effectMarkup: boonCardEffectMarkup(b, ch.rarity, isOwned ? cur : null, true),
          onClick: () => { if (G.takeBoon(ch.id, ch.rarity) && !G.pendingReward) closeToPlay(); }
        }));
      });
    }
    showScreen('screen-reward');
  }

  /* Resolve description tokens from explicit effect paths. A token never
     depends on object key order, and its unit is part of the data binding. */
  function fmtBoon(b, rarity) {
    const fx = resolvedBoonFx(b, rarity);
    const number = value => String(Number.isInteger(value) ? value : Math.round(value * 10) / 10);
    const ordinal = value => {
      const n = Math.round(value), lastTwo = n % 100;
      return n + (lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th'));
    };
    return String(b.desc || '').replace(/%([A-Z])%/g, (token, name) => {
      const binding = b.descFx && b.descFx[name];
      if (!binding) return '?';
      const path = typeof binding === 'string' ? binding : binding.path;
      const unit = typeof binding === 'string' ? 'number' : binding.unit;
      let value = path.split('.').reduce((object, part) => object && object[part], fx);
      if (typeof value !== 'number' || !Number.isFinite(value)) return '?';
      if (unit === 'absolutePercent') value = Math.abs(value);
      if (unit === 'percent' || unit === 'absolutePercent') return number(value * 100) + '%';
      if (unit === 'seconds') return number(value) + ' s';
      if (unit === 'damage') return number(value) + ' damage';
      if (unit === 'dps') return number(value) + ' damage/s';
      if (unit === 'health') return number(value) + ' health';
      if (unit === 'shield') return number(value) + ' shield';
      if (unit === 'armor') return number(value) + ' armor';
      if (unit === 'ordinal') return ordinal(value);
      if (unit === 'dashCharges') { const n = Math.round(value); return n + ' extra dash charge' + (n === 1 ? '' : 's'); }
      if (unit === 'count') return number(value);
      return number(value);
    });
  }

  const BOON_EFFECT_LABELS = {
    dmgMul:'Attack damage bonus', damage:'Base attack damage', attSpd:'Attack speed bonus', attackSpeed:'Attack cadence', moveMul:'Movement speed bonus', moveSpeed:'Movement speed', specialMul:'Wrath damage bonus', specialDamage:'Base Wrath damage', specialCd:'Wrath cooldown', specialCdMul:'Wrath cooldown multiplier',
    castMul:'Cast damage', castCdMul:'Cast cooldown', rushMul:'Rush damage', rushCdMul:'Rush cooldown', guardMul:'Guard strength',
    guardCdMul:'Guard cooldown', ascendMul:'Ascend power', ascendCdMul:'Ascend cooldown', projDmg:'Projectile damage',
    rangeMul:'Attack range', reachMul:'Strike reach', obolMul:'Obol gain', dashDist:'Dash distance', maxHp:'Maximum health',
    maxHpMul:'Maximum health', maxShield:'Maximum shield', armor:'Flat damage reduction', dmgReduce:'Damage reduction', crit:'Critical chance',
    critMul:'Critical damage', dodge:'Dodge chance', lifesteal:'Life steal', lowHpDmg:'Low-health damage', furyAtLowHp:'Low-health fury', reflect:'Reflected damage',
    killHeal:'Health per kill', killShield:'Shield per kill', killStack:'Damage per kill stack', reflect:'Reflect chance', deflectProj:'Projectile deflect',
    thorns:'Thorn damage', dashInvuln:'Dash invulnerability', dashDmg:'Dash damage', dashShield:'Dash shield', dashCharge:'Dash charges',
    knock:'Knockback force bonus', waveDmg:'Wave damage', waveOnHit:'Wave on hit', waveOnDash:'Wave on dash', shieldOnRoom:'Room-start shield',
    shieldStart:'Starting shield', healRoom:'Room healing', lifeOnEnter:'Health on entry', magnet:'Pickup radius', multishot:'Extra shots',
    castEcho:'Cast echo projectiles', chargedCombo:'Final combo hit bonus',
    homing:'Projectile homing strength', pierce:'Extra projectile targets', powerShot:'Power shot interval', stagger:'Stagger chance', rootOnHit:'Root chance',
    slowOnHit:'Slow strength', bleedAmp:'Damage vs bleeding targets', weakMul:'Weakening strength', weaken:'Weakening strength', charm:'Charm chance', critMark:'Marked-target damage bonus',
    poisonTick:'Poison damage bonus', extraReward:'Level-up rerolls', rerollPlus:'Level-up rerolls', freeShop:'Shop discount', deathDefy:'Death defiance',
    aegisOnBoss:'Boss aegis', revenge:'Revenge damage', rareChance:'Rare boon chance', immuneSlow:'Slow immunity', ambush:'Ambush damage',
    coinOnHit:'Obols on hit', darkBonus:'Darkness healing', doubleAttack:'Double attack chance', boltOnHit:'Lightning chance on hit',
    boltOnKill:'Lightning chance on kill', stormOnRoom:'Storms per room', raiseOnKill:'Raise on kill', harvestOnKill:'Harvest chance',
    flowersOnKill:'Flowers on kill', oldGrudge:'Old grudge', magmaOnKill:'Magma on kill', fogOnKill:'Fog on kill', forgeOnHit:'Forge on hit',
    atkProjectile:'Attack projectile', hammerTime:'Wrath shockwave', invulnMelee:'Melee invulnerability', swarm:'Swarm strength',
    tyrantOnFight:'Tyrant per fight', winterOnHit:'Winter mark', callBoost:'Call cooldown reduction', healRoom:'Health restored per room', coinOnHit:'Obol drop chance', zap:'Lightning strike', chain:'Chain lightning',
    bleed:'Bleed', poison:'Poison', burnOnHit:'Burn on hit', drownDot:'Drowning damage over time',
    dashTrail:'Dash trail', doomOnHit:'Apply DOOM', doomDmg:'Doom detonation damage', riposte:'Parry counter damage'
  };
  const BOON_PERCENT_KEYS = new Set([
    'dmgMul','attSpd','moveMul','specialMul','specialCd','castMul','castCdMul','rushMul','rushCdMul','guardMul','guardCdMul',
    'ascendMul','ascendCdMul','projDmg','rangeMul','reachMul','obolMul','dashDist','maxHpMul','crit','critMul','dodge','lifesteal',
    'lowHpDmg','furyAtLowHp','killStack','dmgReduce','reflect','deflectProj','bleedAmp','weakMul','weaken','slowOnHit','darkBonus','rareChance','critMark',
    'harvestOnKill','callBoost','freeShop','healRoom','poisonTick','knock','riposte'
  ]);
  const BOON_CHANCE_KEYS = new Set(['crit','dodge','deflectProj','rareChance','harvestOnKill','boltOnHit','boltOnKill','doubleAttack','coinOnHit','stagger','rootOnHit','charm']);
  const BOON_BOOLEAN_KEYS = new Set(['dashTrail','doomOnHit','waveOnHit','waveOnDash','winterOnHit','immuneSlow','hammerTime']);
  const BOON_COUNT_KEYS = new Set(['multishot','dashCharge','rerollPlus','extraReward','deathDefy','pierce']);
  const BOON_SCALE_NESTED = { zap:['dmg'], chain:['dmg'], bleed:['dmg'], poison:['dps'], burnOnHit:['dps'], drownDot:['dps'] };
  const BOON_NESTED_LABELS = {
    'zap.cd':'Strike interval', 'zap.dmg':'Strike damage', 'chain.n':'Targets chained', 'chain.mul':'Chain damage multiplier',
    'chain.dmg':'Chain damage', 'bleed.dmg':'Bleed damage per second', 'bleed.dur':'Bleed duration',
    'poison.dps':'Poison damage per second', 'poison.dur':'Poison duration',
    'burnOnHit.dps':'Burn damage per second', 'burnOnHit.dur':'Burn duration',
    'drownDot.dps':'Drowning damage per second', 'drownDot.dur':'Drowning duration'
  };

  function powerRule(key) { return K.BuildPowers && K.BuildPowers.rules && K.BuildPowers.rules[key]; }
  function formatPowerValue(rule, value) {
    const amount = Math.round(value * 100) / 100;
    if (rule.unit === 'percent') return (Math.round(value * 1000) / 10) + '%';
    if (rule.unit === 'seconds') return amount + ' s';
    if (rule.unit === 'count') return Math.round(value) + ' projectile(s)';
    if (rule.unit === 'health') return amount + ' health';
    return amount + ' damage';
  }
  function readableEffectLabel(key) {
    return (powerRule(key) && powerRule(key).label) || BOON_EFFECT_LABELS[key] || String(key).replace(/([A-Z])/g, ' $1').replace(/Mul$/, ' multiplier').replace(/^./, c => c.toUpperCase());
  }
  function boonResultRarity(b, current, offered) {
    let target = D.RARITY[offered] ? offered : (b.rarity || 'common');
    if (b.rarity === 'duo' || b.rarity === 'legendary') target = b.rarity;
    if (!current) return target;
    if (b.rarity === 'duo' || b.rarity === 'legendary' || current === 'duo' || current === 'legendary') return current;
    const ranks = ['common','rare','epic','heroic'];
    const now = Math.max(0, ranks.indexOf(current)), want = Math.max(0, ranks.indexOf(target));
    return ranks[Math.min(ranks.length - 1, Math.max(now + 1, want))];
  }
  function resolvedBoonFx(b, rarity) {
    if (K.resolveBoonFx) return K.resolveBoonFx(b, rarity);
    const fixed = b.rarity === 'duo' || b.rarity === 'legendary';
    const scale = fixed ? 1 : ((D.RARITY[rarity] && D.RARITY[rarity].scale) || 1);
    const out = {};
    Object.keys(b.fx || {}).forEach(key => {
      const value = b.fx[key];
      if (typeof value === 'number') {
        if (BOON_BOOLEAN_KEYS.has(key)) out[key] = value ? 1 : 0;
        else if (key === 'powerShot') out[key] = value > 0 ? Math.max(1, Math.ceil(value / scale)) : value;
        else if (BOON_COUNT_KEYS.has(key)) out[key] = Math.round(value * scale);
        else if (key === 'callBoost') out[key] = Math.min(0.4, value * scale);
        else out[key] = value * scale;
      }
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        out[key] = {};
        Object.keys(value).forEach(subKey => {
          const subValue = value[subKey], scaled = (BOON_SCALE_NESTED[key] || []).indexOf(subKey) >= 0;
          out[key][subKey] = typeof subValue === 'number' && scaled ? subValue * scale : subValue;
        });
      } else if (value !== undefined && value !== null) out[key] = value;
    });
    return out;
  }
  function boonEffectAtoms(fx) {
    const atoms = [];
    Object.keys(fx || {}).forEach(key => {
      const value = fx[key];
      if (typeof value === 'number') atoms.push({ path:key, label:readableEffectLabel(key), value, key });
      else if (value && typeof value === 'object') Object.keys(value).forEach(subKey => {
        if (typeof value[subKey] !== 'number') return;
        const path = key + '.' + subKey;
        atoms.push({ path, label:BOON_NESTED_LABELS[path] || readableEffectLabel(key) + ' · ' + readableEffectLabel(subKey), value:value[subKey], key:subKey, parent:key });
      });
    });
    return atoms;
  }
  function formatBoonEffectValue(atom) {
    const value = atom.value;
    if (powerRule(atom.key)) return (value > 0 ? '+' : '') + formatPowerValue(powerRule(atom.key),value);
    const abs = Math.abs(value), amount = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
    const signed = value > 0 ? '+' : '';
    if (atom.key === 'freeShop') return String(Math.round(Math.min(.8,Math.max(0,value))*100)) + '% off (minimum 10 Obols)';
    if (atom.key === 'chargedCombo') return value ? '+75% melee / +56.52% ranged' : 'Not granted';
    if (atom.key === 'castEcho') return signed + Math.round(value) + ' seeking projectile(s), 50% Cast damage each';
    if (BOON_BOOLEAN_KEYS.has(atom.key)) return value ? 'Granted' : 'Not granted';
    if (atom.key === 'powerShot') {
      const n = Math.round(value), lastTwo = n % 100;
      const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th');
      return 'Every ' + n + suffix + ' attack';
    }
    if (BOON_COUNT_KEYS.has(atom.key)) {
      if (atom.key === 'dashCharge') return signed + amount + ' extra dash charge' + (abs === 1 ? '' : 's');
      if (atom.key === 'extraReward' || atom.key === 'rerollPlus') return signed + amount + ' level-up reroll' + (abs === 1 ? '' : 's');
      if (atom.key === 'deathDefy') return signed + amount + ' resurrection' + (abs === 1 ? '' : 's');
      if (atom.key === 'multishot') return signed + amount + ' projectile' + (abs === 1 ? '' : 's');
      if (atom.key === 'pierce') return signed + amount + ' extra target' + (abs === 1 ? '' : 's');
    }
    if (BOON_PERCENT_KEYS.has(atom.key) || (atom.key === 'mul' && atom.parent === 'chain')) {
      return signed + String(Math.round(value * 1000) / 10) + '%';
    }
    if (BOON_CHANCE_KEYS.has(atom.key) || /Chance$/.test(atom.key)) {
      return signed + String(Math.round(value * 1000) / 10) + '%';
    }
    if (atom.key === 'dur' || atom.key === 'cd' || atom.key === 'dashInvuln') return signed + amount + ' s';
    if (atom.key === 'dps' || (atom.parent === 'bleed' && atom.key === 'dmg')) return signed + amount + ' damage/s';
    if (atom.key === 'n') return signed + amount + ' target' + (abs === 1 ? '' : 's');
    return signed + amount + ((/dmg|damage|heal|health|shield|armor/i.test(atom.path)) ? ' points' : '');
  }
  function cloneRunForEffectPreview(run) {
    const copy = Object.assign(Object.create(Object.getPrototypeOf(run)), run);
    ['boons','relics','heroUpgrades','augmentIds','weaponUpgrades','shopStats','routePath'].forEach(key => {
      if (Array.isArray(run[key])) copy[key] = run[key].map(value => value && typeof value === 'object' ? Object.assign({}, value) : value);
    });
    copy.gods = Object.assign({}, run.gods || {});
    copy.boonLevels = Object.assign({}, run.boonLevels || {});
    copy.activeSynergies = [];
    return copy;
  }
  function actualBoonStatChanges(b, offered, current) {
    if (!K.compileStats || !K.Run) return [];
    const sourceRun = G && G.run ? G.run : new K.Run(1);
    const beforeRun = cloneRunForEffectPreview(sourceRun), afterRun = cloneRunForEffectPreview(sourceRun);
    const resultRarity = boonResultRarity(b, current, offered);
    const beforeStats = K.compileStats(beforeRun, null);
    const existing = afterRun.boons.find(entry => entry.id === b.id);
    if (existing) existing.rarity = resultRarity;
    else {
      afterRun.boons.push({ id:b.id, rarity:resultRarity, god:b.god, slot:b.slot });
      afterRun.gods[b.god] = (afterRun.gods[b.god] || 0) + 1;
    }
    afterRun.boonLevels[b.id] = resultRarity;
    const afterStats = K.compileStats(afterRun, null);
    const flatten = (object, prefix, out) => Object.keys(object || {}).forEach(key => {
      if (key === 'gods') return;
      const value = object[key], path = prefix ? prefix + '.' + key : key;
      if (typeof value === 'number' && Number.isFinite(value)) out[path] = value;
      else if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out);
    });
    const before = Object.create(null), after = Object.create(null);
    flatten(beforeStats, '', before); flatten(afterStats, '', after);
    const keys = Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).sort();
    return keys.filter(path => path !== 'attackSpeed').map(path => ({ path, before:before[path] || 0, after:after[path] || 0 })).filter(item => Math.abs(item.after - item.before) > 0.000001);
  }
  const BOON_BUILD_LABELS = {
    damage:'Attack damage per hit', dmgMul:'Total attack damage multiplier', attSpd:'Attack speed multiplier',
    moveSpeed:'Movement speed', moveMul:'Movement speed multiplier', specialDamage:'Wrath damage per hit',
    knock:'Knockback force multiplier',
    specialMul:'Wrath damage multiplier', specialCdMul:'Wrath cooldown multiplier', castDamage:'Cast damage per hit',
    castMul:'Cast damage multiplier', dashMax:'Dash charges', dashRegen:'Dash recharge interval', maxHp:'Maximum health'
  };
  function formatBoonSnapshot(path, value) {
    if (powerRule(path)) return formatPowerValue(powerRule(path),value);
    const key = path.split('.').pop(), amount = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
    if (['dmgMul','attSpd','moveMul','specialMul','specialCdMul','castMul','castCdMul','rushMul','rushCdMul','guardMul','guardCdMul','ascendMul','ascendCdMul','knock'].includes(key)) return '×' + amount;
    if (path === 'bleed.dmg') return amount + ' damage/s';
    if (key === 'freeShop') return Math.round(Math.min(.8,Math.max(0,value))*100) + '% off';
    if (BOON_BOOLEAN_KEYS.has(key)) return value ? 'On' : 'Off';
    if (key === 'powerShot') return formatBoonEffectValue({key,value});
    if (BOON_COUNT_KEYS.has(key)) return formatBoonEffectValue({key,value});
    if (BOON_PERCENT_KEYS.has(key) || BOON_CHANCE_KEYS.has(key) || key === 'mul' && path.indexOf('chain.') === 0) return String(Math.round(value * 1000) / 10) + '%';
    if (key === 'dur' || key === 'cd' || key === 'dashInvuln') return amount + ' s';
    if (key === 'dps') return amount + ' damage/s';
    if (/damage|^dmg$|^maxHp$|^maxShield$|^armor$|^killHeal$|^killShield$|^dashDmg$|^dashShield$|^waveDmg$/.test(key)) return amount + ' points';
    if (key === 'moveSpeed') return amount + ' units/s';
    return amount;
  }
  function boonCardEffectMarkup(b, offered, current, includeBuildPreview) {
    const resultRarity = boonResultRarity(b, current, offered);
    const before = current ? boonEffectAtoms(resolvedBoonFx(b, current)) : [];
    const after = boonEffectAtoms(resolvedBoonFx(b, resultRarity));
    const oldByPath = Object.create(null); before.forEach(atom => { oldByPath[atom.path] = atom; });
    const heading = current ? '<div class="boon-effect-heading">' + escapeHtml(D.RARITY[current].name + ' → ' + D.RARITY[resultRarity].name) + '</div>' : '<div class="boon-effect-heading">' + escapeHtml(D.RARITY[resultRarity].name + ' effects') + '</div>';
    const rows = after.map(atom => {
      const old = oldByPath[atom.path];
      const delta = old ? formatBoonEffectValue(Object.assign({}, atom, { value:atom.value - old.value })) : '';
      const value = BOON_BOOLEAN_KEYS.has(atom.key) ? formatBoonEffectValue(atom) : (old ? formatBoonEffectValue(old) + ' → ' + formatBoonEffectValue(atom) + ' (' + delta + ')' : formatBoonEffectValue(atom));
      return '<div class="boon-effect-row"><span>' + escapeHtml(atom.label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
    }).join('');
    let markup = heading + (rows || '<div class="boon-effect-row"><span>Effect</span><strong>No numeric effect</strong></div>');
    const offeredFx = resolvedBoonFx(b,resultRarity);
    Object.keys(offeredFx).forEach(key => { const rule=powerRule(key); if(rule) markup += '<p class="power-rule">' + escapeHtml(rule.trigger) + ' Build cap: ' + escapeHtml(formatPowerValue(rule,rule.cap)) + '.</p>'; });
    if (offeredFx.freeShop >= 1) markup += '<div class="boon-effect-row"><span>First purchase at each shop</span><strong>Free</strong></div>';
    if (includeBuildPreview) {
      const changes = actualBoonStatChanges(b, offered, current);
      markup += '<div class="boon-effect-heading boon-build-heading">Your build after choosing</div>';
      markup += '<p class="boon-preview-note">Includes current gear, stacking and caps. Damage is before conditional combat effects.</p>';
      markup += changes.length ? changes.map(item => {
        const label = BOON_BUILD_LABELS[item.path] || BOON_NESTED_LABELS[item.path] || readableEffectLabel(item.path);
        return '<div class="boon-effect-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(formatBoonSnapshot(item.path, item.before) + ' → ' + formatBoonSnapshot(item.path, item.after)) + '</strong></div>';
      }).join('') : '<div class="boon-effect-row"><span>Resolved result</span><strong>No additional stat change</strong></div>';
    }
    return markup;
  }

  function closeToPlay() {
    if (G && ['story','route','event','victory','dead'].indexOf(G.phase) >= 0) return;
    if (G && G.phase === 'reward' && G.pendingReward) return;
    showScreen(null);
    if (G.phase === 'reward') G.phase = 'playing';
    updateHUD();
    const canvas = document.getElementById('game');
    if (canvas && typeof canvas.focus === 'function' && !document.activeElement?.closest?.('button,input,select')) { try { canvas.focus({preventScroll:true}); } catch (e) {} }
  }

  /* ---------------- room choice (after a cleared chamber) ---------------- */
  /* Not a separate screen in normal flow — the exit gate advances directly. */

  /* ---------------- game over / victory ---------------- */
  function showGameOver(run) {
    document.getElementById('go-title').textContent = 'YOU ARE DEAD';
    const nemesisBorn = (K.Save.data.nemeses || []).find(n => n.lastKilledRun === run.ordinal);
    const baseDesc = nemesisBorn ? nemesisBorn.name + ', ' + nemesisBorn.epithet + ' remembers the ' + (nemesisBorn.lastKillingBlow || 'final blow') + '. They will return as the ' + (LORE_ADAPTATION_NAME[nemesisBorn.adaptation] || 'Changed Shade') + '.' : run.rng.pick([
      'The Styx carries you back to the House. Charon does not look up.',
      'Your shade joins the queue at the ferry. It is a very long queue.',
      'The Fates cut the thread. They had measured it already.',
      'Death is not the end here. That is rather the problem.'
    ]);
    document.getElementById('go-desc').textContent = baseDesc + (run.isFatedTrial ? ' This Trial ended before the summit; no score or threshold reward was recorded.' : '');
    document.getElementById('go-stats').innerHTML = statTable(run);
    renderRunRecap('go-recap',run);
    const earn = Math.round(run.obolsEarned * 0.1);
    if (earn > 0) K.Save.addObols(earn);
    document.getElementById('go-unlocks').innerHTML =
      '<p>+ ' + U.comma(earn) + ' obols carried back to the Mirror of Nyx. ' +
      'You have ' + A.iconHtml('coin', 'currency-icon') + ' ' + U.comma(K.Save.data.obols) + '.</p>';
    showScreen('screen-gameover', true);
  }

  function statTable(run) {
    const s = run.stats;
    const rows = [
      ['Chambers Cleared', s.chambers],
      ['Enemies Slain', s.kills],
      ['Run Level / XP', run.practice ? 'Disabled in Practice' : run.level+' · '+run.xp+' / '+(100+20*Math.max(0,(run.level||1)-1))],
      ['Champions Felled', s.elites],
      ['Bosses Defeated', s.bosses],
      ['Damage Dealt', U.comma(s.dmgDealt)],
      ['Damage Taken', U.comma(s.dmgTaken)],
      ['Obols Earned', U.comma(run.obolsEarned)],
      ['Boons Taken', run.boons.length],
      ['Divine Calls', s.calls],
      ['Time', U.time(s.time)]
    ];
    return rows.map(r => '<div class="stat"><div class="k">' + r[0] + '</div><div class="v">' + r[1] + '</div></div>').join('');
  }

  function renderRunRecap(id,run){
    const root=document.getElementById(id);if(!root)return;root.innerHTML='';
    const heading=document.createElement('h3');heading.textContent='DESCENT RECAP · BUILD SHARE';root.appendChild(heading);
    const hero=K.RunSystems.HEROES[run.heroId]||K.RunSystems.HEROES.perseus;
    const weapon=(D.WEAPONS[run.weapon]||{}).name||run.weapon;
    const route=(run.routePath||[]).map((rooms,ri)=>rooms&&rooms.map((room,ci)=>room?D.REGIONS[ri].name+' '+(ci+1)+': '+room.type:null).filter(Boolean).join(' → ')).filter(Boolean).join(' / ');
    const damage=Object.keys(run.stats.damageBySource||{}).map(k=>[k,run.stats.damageBySource[k]]).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const act=run.regionIndex<8?'Act I':run.regionIndex<16?'Act II':'Act III';
    const threadNames=(run.fatedThreadIds||[]).map(id=>K.RunSystems.FATED_THREADS.find(x=>x.id===id)).filter(Boolean).map(x=>x.name);
    const lines=[hero.name+' · '+weapon,
      act+' · Region '+(run.regionIndex+1)+' / '+D.REGIONS.length+' · Chamber '+(run.chamberIndex+1)+' / 8',
      'Build: '+run.boons.length+' boons · '+run.relics.length+' relics · '+(run.augmentIds||[]).length+' augments · '+(run.weaponUpgrades||[]).length+' weapon tempers',
      'Fated Threads: '+(threadNames.join(' · ')||'none'),
      run.isFatedTrial?'Fated Trial · Pact score '+run.trialScore+' · best clear '+(K.Save.data.fatedTrialBestScore||0):'',
      'Synergies: '+((run.activeSynergies||[]).map(x=>x.name).join(', ')||'none'),
      run.practice?'Practice session · no run XP':'Run progression: level '+run.level+' · '+run.xp+'/'+(100+20*Math.max(0,(run.level||1)-1))+' XP · '+(run.totalRunXp||0)+' earned',
      run.quest?'Quest: '+run.quest.name+' — '+(run.quest.complete?'complete':run.quest.progress+'/'+run.quest.goal):'Practice session',
      'Second winds: '+run.deathDefySpent+'/'+run.deathDefyMax,
      'Divine favor: '+(Object.keys(run.godFavor||{}).sort((a,b)=>Math.abs(run.godFavor[b]||0)-Math.abs(run.godFavor[a]||0)).slice(0,3).map(id=>D.GODS[id].name+' '+((run.godFavor[id]||0)>0?'+':'')+(run.godFavor[id]||0)).join(' · ')||'no god has taken a side'),
      'Top damage: '+(damage.map(x=>x[0]+' '+U.comma(Math.round(x[1]))).join(' · ')||'no recorded damage'),
      'Route: '+(route||'first chamber'),
      'Story: '+((run.storyChoices||[]).length)+' decisions · ending '+(run.campaignEnding||'not reached')];
    lines.forEach(t=>{const p=document.createElement('p');p.textContent=t;root.appendChild(p);});
    if (run.isFatedTrial && run.trialResult && run.trialResult.newlyClaimed.length) {
      const p=document.createElement('p');p.textContent='New Trial rewards: '+run.trialResult.newlyClaimed.map(x=>x.name).join(' · ');root.appendChild(p);
    }
    const latest=(run.killChronicle||[]).slice(-2);
    latest.forEach(entry=>{const p=document.createElement('p');p.textContent='Remembered: '+entry.backstory;root.appendChild(p);});
    const code=K.RunSystems.buildCode(run),input=document.createElement('input');input.type='text';input.readOnly=true;input.value=code;input.setAttribute('aria-label','Run build share code');
    const copy=document.createElement('button');copy.type='button';copy.textContent='COPY BUILD CODE';copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(code);status.textContent='Build code copied.';}
      catch(_){input.focus();input.select();status.textContent='Code selected. Press Ctrl+C to copy.';}
    });
    const status=document.createElement('p');status.className='recap-status';status.setAttribute('aria-live','polite');
    const inspectInput=document.createElement('input');inspectInput.type='text';inspectInput.placeholder='Paste a KAT1 build code';inspectInput.setAttribute('aria-label','Build code to inspect');
    const inspect=document.createElement('button');inspect.type='button';inspect.textContent='INSPECT';
    inspect.addEventListener('click',()=>{const result=K.RunSystems.parseBuildCode(inspectInput.value);status.textContent=result.ok?result.hero+' / '+result.weapon+' · '+result.boons.length+' boons · '+result.relics.length+' relics · '+result.augments.length+' augments':result.error;});
    const share=document.createElement('div');share.className='recap-controls';share.append(input,copy);root.appendChild(share);
    const inspectBox=document.createElement('div');inspectBox.className='recap-controls';inspectBox.append(inspectInput,inspect);root.appendChild(inspectBox);root.appendChild(status);
  }

  function showVictory(run) {
    const texts = [
      'Typhon falls. The summit is silent for the first time in an age.',
      'You climbed out of the Underworld and stood where the gods keep watch. No mortal has done this.',
      'Somewhere below, the House of Hades notices that one of its own has escaped. It is not pleased.'
    ];
    const endings = {
      open_gate:'The gate is left open by covenant. Persephone may cross, Charon may ferry without a toll of grief, and the House keeps its doors without owning its guests. The gods sign the promise beside you.',
      free_thread:'The Moirai’s thread is cut. No throne decides who may cross between the living and the dead. The world wakes without a prophecy to excuse its choices.'
    };
    document.getElementById('vic-title').textContent = run.campaignEnding === 'open_gate' ? 'THE HOUSE OPENS ITS DOORS' : (run.campaignEnding === 'free_thread' ? 'THE THREAD IS CUT' : 'THE SUMMIT BREAKS');
    document.getElementById('vic-desc').textContent = endings[run.campaignEnding] || run.rng.pick(texts);
    document.getElementById('vic-stats').innerHTML = statTable(run);
    renderRunRecap('vic-recap',run);
    showScreen('screen-victory', true);
  }

  /* ---------------- Codex ---------------- */
  let codexSelectedKey = null;
  let codexTab = 'boons', codexQuery = '', codexBuildFilter = 'all', codexPage = 0, codexReturnScreen = 'screen-title';
  const LORE_ADAPTATION_TITLE = { veil_hunter:'They learned to hunt your ranged attacks.', oathbreaker:'They hardened themselves against the blows that felled them.', grave_ward:'They learned to endure lingering curses and ground magic.' };
  const LORE_ADAPTATION_NAME = { veil_hunter:'Veil Hunter', oathbreaker:'Oathbreaker', grave_ward:'Grave-Ward' };
  function openChronicle(returnScreen) {
    openCodex('chronicle', returnScreen);
  }
  function buildCodex(tab) {
    if (tab && tab !== codexTab) codexPage = 0;
    codexTab = tab || 'boons';
    const filter=document.getElementById('codex-build-filter');
    if (!filter.getAttribute('data-ready')) { filter.innerHTML='<option value="all">All build powers</option>'; Object.keys(K.BuildPowers && K.BuildPowers.rules || {}).forEach(key=>{const option=document.createElement('option');option.value=key;option.textContent=readableEffectLabel(key);filter.appendChild(option);});filter.setAttribute('data-ready','1'); }
    filter.value=codexBuildFilter;filter.disabled=!['boons','duos'].includes(codexTab);filter.classList.toggle('hidden',filter.disabled);
    const tabs = document.getElementById('codex-tabs'); tabs.innerHTML = '';
    [['boons','BOONS'],['duos','DUOS & LEGENDARIES'],['builds','BUILDS'],['relics','RELICS'],['bestiary','BESTIARY'],['gods','THE GODS'],['saga','THE SAGA'],['chronicle','CHRONICLE']].forEach(([id,label]) => {
      const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-pressed',codexTab === id ? 'true' : 'false'); d.className = 'tab' + (codexTab === id ? ' on' : ''); d.textContent = label;
      d.addEventListener('click', () => { K.Audio.sfx('ui'); buildCodex(id); }); tabs.appendChild(d);
    });
    const body = document.getElementById('codex-body'); body.innerHTML = '';
    const inspector = document.getElementById('codex-inspector');
    if (inspector) { inspector.innerHTML = ''; inspector.classList.toggle('hidden', codexTab === 'chronicle' || codexTab === 'saga'); }
    const counter = document.getElementById('codex-count');
    const prev = document.getElementById('codex-prev'), next = document.getElementById('codex-next');
    if (codexTab === 'builds') {
      const recipes=K.RunSystems.SYNERGIES.filter(item=>!codexQuery.trim()||(item.name+' '+item.desc+' '+item.requires).toLowerCase().includes(codexQuery.trim().toLowerCase()));
      const grid=document.createElement('div');grid.className='codex-grid';
      const note=document.createElement('p');note.className='codex-note';note.textContent='Combine the listed gods, hero, or weapon to activate these powers automatically. Direct attacks and ability impacts can trigger hit effects. Echoes, forks and novas cannot retrigger them.';body.appendChild(note);
      recipes.forEach(item=>{
        const el=document.createElement('button');el.type='button';el.className='codex-entry build-recipe';
        const active=!!(G && G.run && item.test(G.run));
        const portraits=(item.gods&&item.gods.length?item.gods:['athena']).map(god=>A.iconHtml('god:'+god,'recipe-art')).join('');
        el.innerHTML='<div class="recipe-portraits">'+portraits+'</div><h4>'+escapeHtml(item.name)+'</h4><div class="src">'+(active?'ACTIVE IN THIS BUILD':'BUILD RECIPE')+'</div><p>'+escapeHtml(item.desc)+'</p><p class="recipe-requires"><strong>Requires</strong> '+escapeHtml(item.requires||'See the named gods and equipment above.')+'</p><div class="boon-effects">'+boonCardEffectMarkup({fx:item.fx},'common',null,false).replace('Common effects','Synergy effects')+'</div>';
        el.setAttribute('data-codex-key','build:'+item.id);el.addEventListener('click',()=>{codexSelectedKey='build:'+item.id;selectCodexEntry(el,{type:'build',item,key:item.id},true);});grid.appendChild(el);
        if(grid.children.length===1){codexSelectedKey='build:'+item.id;selectCodexEntry(el,{type:'build',item,key:item.id},true);}
      });
      body.appendChild(grid);if(!recipes.length&&inspector)inspector.innerHTML='<h3>No builds found</h3><p>Try a god, hero, or weapon name.</p>';
      counter.textContent=recipes.length+' synergy recipes · '+Object.keys(K.BuildPowers && K.BuildPowers.rules || {}).length+' new build powers';prev.disabled=true;next.disabled=true;return;
    }
    if (codexTab === 'saga') {
      const header = document.createElement('div'); header.className = 'chronicle-ledger-head';
      const title = document.createElement('h3'); title.textContent = 'THE STOLEN THREAD';
      const summary = document.createElement('p'); summary.textContent = 'Twenty-four regions, the whole Olympian family, and one mortal choice at the end of fate. Your conversations and replies are kept here across descents.';
      header.appendChild(title); header.appendChild(summary); body.appendChild(header);
      const q = codexQuery.trim().toLowerCase();
      let records = (K.Save.data.campaignArchive || []).slice().reverse();
      if (q) records = records.filter(r => [r.title,r.region,r.intro,r.choice,r.reply].concat((r.voices || []).map(v => v.name + ' ' + v.text)).join(' ').toLowerCase().indexOf(q) >= 0);
      const pageSize = 12, pages = Math.max(1, Math.ceil(records.length / pageSize));
      codexPage = Math.max(0, Math.min(pages - 1, codexPage));
      const start = codexPage * pageSize, shown = records.slice(start, start + pageSize);
      const grid = document.createElement('div'); grid.className = 'codex-grid chronicle-grid';
      shown.forEach(record => {
        const card = document.createElement('article'); card.className = 'codex-entry saga-entry';
        const heading = document.createElement('h4'); heading.textContent = record.title;
        const source = document.createElement('div'); source.className = 'src'; source.textContent = 'RUN ' + record.run + ' · CHAPTER ' + record.chapter + ' · ' + record.region;
        const intro = document.createElement('p'); intro.textContent = record.intro;
        card.appendChild(heading); card.appendChild(source); card.appendChild(intro);
        (record.voices || []).forEach(voice => {
          const line = document.createElement('p'); line.className = 'saga-voice-line';
          line.textContent = voice.name + ': “' + voice.text + '”'; card.appendChild(line);
        });
        const reply = document.createElement('p'); reply.className = 'saga-reply'; reply.textContent = 'You chose: ' + record.choice + ' — “' + record.reply + '”'; card.appendChild(reply);
        grid.appendChild(card);
      });
      body.appendChild(grid);
      counter.textContent = records.length ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, records.length) + ' of ' + records.length + ' chapters' : 'The first conversation awaits beyond Tartarus.';
      prev.disabled = codexPage <= 0; next.disabled = codexPage >= pages - 1; return;
    }
    if (codexTab === 'chronicle') {
      const nemeses = K.Save.data.nemeses || [];
      const header = document.createElement('div'); header.className = 'chronicle-ledger-head';
      const active = nemeses.filter(n => !n.defeated);
      const headTitle = document.createElement('h3'); headTitle.textContent = 'THE NEMESES THAT REMEMBER YOU'; header.appendChild(headTitle);
      const nemesisGrid = document.createElement('div'); nemesisGrid.className = 'nemesis-codex-grid';
      nemeses.slice().reverse().forEach(n => {
        const card = document.createElement('article'); card.className = 'nemesis-codex-entry' + (n.defeated ? ' defeated' : '');
        const portrait = document.createElement('div'); portrait.className = 'nemesis-codex-portrait'; portrait.innerHTML = A.iconHtml('enemy:' + n.sourceId, 'nemesis-codex-art');
        const body = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = n.name + ', ' + n.epithet + (n.defeated ? ' · DEFEATED' : ' · RANK ' + (n.rank || 1));
        const adaptation = document.createElement('span'); adaptation.className = 'src'; adaptation.textContent = LORE_ADAPTATION_TITLE[n.adaptation] || 'A shade with a grudge.';
        const story = document.createElement('p'); story.textContent = n.backstory || (n.identity && n.identity.backstory) || 'The shade remembers the blow that ended the descent.';
        body.appendChild(name); body.appendChild(adaptation); body.appendChild(story);
        card.appendChild(portrait); card.appendChild(body); nemesisGrid.appendChild(card);
      });
      if (!nemeses.length) { const empty = document.createElement('p'); empty.textContent = 'No shade has claimed a lasting grudge yet. A foe that ends a descent may remember you and return.'; nemesisGrid.appendChild(empty); }
      header.appendChild(nemesisGrid);
      body.appendChild(header);
      const q = codexQuery.trim().toLowerCase();
      let records = (K.Save.data.killChronicle || []).slice().reverse();
      if (q) records = records.filter(r => [r.name,r.enemy,r.region,r.backstory,r.motive].join(' ').toLowerCase().indexOf(q) >= 0);
      const pageSize = 36, pages = Math.max(1, Math.ceil(records.length / pageSize));
      codexPage = Math.max(0, Math.min(pages - 1, codexPage));
      const start = codexPage * pageSize, shown = records.slice(start, start + pageSize);
      const grid = document.createElement('div'); grid.className = 'codex-grid chronicle-grid';
      shown.forEach(record => {
        const card = document.createElement('article'); card.className = 'codex-entry chronicle-entry' + (record.nemesis ? ' nemesis-entry' : '');
        const title = document.createElement('h4'); title.textContent = record.name || 'Unknown shade';
        const source = document.createElement('div'); source.className = 'src';
        source.textContent = 'RUN ' + record.run + ' · ' + record.region + ' · CHAMBER ' + record.chamber + ' · ' + (record.boss ? 'CAPSTONE' : (record.elite ? 'CHAMPION' : record.enemy));
        const story = document.createElement('p'); story.textContent = record.backstory || 'No memory survived the crossing.';
        card.appendChild(title); card.appendChild(source); card.appendChild(story); grid.appendChild(card);
      });
      body.appendChild(grid);
      counter.textContent = records.length ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, records.length) + ' of ' + records.length + ' memories' : 'No fallen shades yet';
      prev.disabled = codexPage <= 0; next.disabled = codexPage >= pages - 1; return;
    }
    if (codexTab === 'gods') {
      const grid = document.createElement('div'); grid.className = 'codex-grid';
      const runFavor = G && G.run ? (G.run.godFavor || {}) : {};
      const deityIds = K.Portraits ? K.Portraits.roster.map(r=>r.id) : Object.keys(D.GODS);
      const deityInfo = gid => D.GODS[gid] || (K.Portraits && K.Portraits.byId[gid] ? {id:gid,name:K.Portraits.byId[gid].displayName,domain:K.Portraits.byId[gid].domain,title:K.Portraits.byId[gid].epithet,color:K.Portraits.byId[gid].paletteAccent,group:'Greek · Portrait archive',blurb:'A figure of the Greek tradition. This archive entry does not grant boons.'} : null);
      const orderedGods = (D.OLYMPIANS || []).concat(deityIds.filter(gid => !(D.OLYMPIANS || []).includes(gid)));
      orderedGods.filter(gid => !codexQuery.trim() || (deityInfo(gid).name + ' ' + deityInfo(gid).domain + ' ' + deityInfo(gid).title).toLowerCase().includes(codexQuery.trim().toLowerCase())).forEach(gid => {
        const g = deityInfo(gid), met = !!K.Save.data.seenGods[gid], el = document.createElement('button'); el.type = 'button';
        const favor = runFavor[gid] || 0;
        const relation = favor >= 7 ? 'Favored' : favor > 0 ? 'Welcomed' : favor <= -7 ? 'Opposed' : favor < 0 ? 'Wary' : 'Unproven';
        el.className = 'codex-entry'; el.style.setProperty('--accent', g.color);
        el.innerHTML = (K.Portraits ? K.Portraits.html(gid,{surface:'codex',className:'codex-art'}) : A.iconHtml('god:' + gid, 'codex-art')) + '<h4>' + g.name + '</h4><div class="src">' + (g.group || 'Immortals') + ' · ' + g.title + ' · ' + g.domain + '</div><p>' + g.blurb + '</p><div class="note">' + (!D.GODS[gid] ? 'Portrait archive · No boon mechanics' : (met ? 'Known to you' : 'Not yet encountered') + ' · Current run: ' + relation + ' (' + (favor > 0 ? '+' : '') + favor + ' favor)') + '</div>';
        el.addEventListener('click', () => { codexSelectedKey = 'god:' + gid; selectCodexEntry(el, {type:'god',item:g,key:gid}, true); });
        el.setAttribute('data-codex-key','god:' + gid); grid.appendChild(el);
        if (grid.children.length === 1) { codexSelectedKey = 'god:' + gid; selectCodexEntry(el, {type:'god',item:g,key:gid}, true); }
      });
      if (!grid.children.length && inspector) inspector.innerHTML = '<h3>No entries found</h3><p>Try another name or category.</p>';
      const note = document.createElement('p'); note.className = 'codex-note'; note.textContent = 'Olympian Thirteen: this court includes both Hestia and Dionysus. Ancient lists vary; favor changes through choices, offerings, trials, and boons.';
      body.appendChild(note); body.appendChild(grid); counter.textContent = deityIds.length + ' portraits · ' + Object.keys(D.GODS).length + ' boon-granting deities · ' + D.OLYMPIANS.length + ' Olympians'; prev.disabled = true; next.disabled = true; return;
    }
    let records = [];
    if (codexTab === 'boons') records = D.BOONS.map(b => ({ type:'boon', item:b, key:b.id, text:b.name + ' ' + b.desc }));
    else if (codexTab === 'duos') records = D.SPECIAL_BOONS.map(b => ({ type:'boon', item:b, key:b.id, text:b.name + ' ' + b.desc }));
    else if (codexTab === 'relics') records = D.RELICS.map(r => ({ type:'relic', item:r, key:r.id, text:r.name + ' ' + r.desc }));
    else {
      records = Object.keys(D.ENEMIES).filter(id => !D.ENEMIES[id].summon).map(id => ({ type:'enemy', item:D.ENEMIES[id], key:id, text:D.ENEMIES[id].name + ' ' + D.ENEMIES[id].desc }));
      records = records.concat(Object.keys(D.BOSSES).map(id => ({ type:'boss', item:D.BOSSES[id], key:id, text:D.BOSSES[id].name + ' ' + D.BOSSES[id].title + ' ' + D.BOSSES[id].desc })));
    }
    if (codexBuildFilter !== 'all' && ['boons','duos'].includes(codexTab)) records=records.filter(record=>Number(record.item.fx && record.item.fx[codexBuildFilter])>0);
    const q = codexQuery.trim().toLowerCase();
    if (q) records = records.filter(r => r.text.toLowerCase().indexOf(q) >= 0);
    const pageSize = 48, pages = Math.max(1, Math.ceil(records.length / pageSize));
    codexPage = Math.max(0, Math.min(pages - 1, codexPage));
    const start = codexPage * pageSize, shown = records.slice(start, start + pageSize);
    const grid = document.createElement('div'); grid.className = 'codex-grid';
    shown.forEach(rec => {
      const item = rec.item, el = document.createElement('button'); el.type = 'button';
      const known = rec.type === 'boon' ? !!K.Save.data.seenBoons[rec.key] : rec.type === 'relic' ? !!K.Save.data.seenRelics[rec.key] : !!K.Save.data.seenEnemies[rec.key];
      el.className = 'codex-entry' + (known ? '' : ' locked');
      let icon = 'god:hades', src = '', desc = item.desc || '', boonNumbers = '';
      if (rec.type === 'boon') { icon = 'god:' + item.god; const god = D.GODS[item.god]; el.style.setProperty('--accent', god ? god.color : '#f0cf5e'); src = item.slot + (item.rarity && item.rarity !== 'common' ? ' · ' + item.rarity : '') + (item.generatedVariant ? ' · ' + item.variantId : ''); desc = known ? fmtBoon(item, 'rare') : 'Not yet offered to you.'; boonNumbers = known ? '<div class="boon-effects codex-boon-effects">' + boonCardEffectMarkup(item, item.rarity === 'duo' || item.rarity === 'legendary' ? item.rarity : 'rare', null) + '</div>' : ''; }
      else if (rec.type === 'relic') { icon = 'relic:' + item.id; el.style.setProperty('--accent', item.color || '#e0b355'); src = 'Relic' + (item.generatedVariant ? ' · ' + item.variantId : ''); desc = known ? item.desc : 'You have not found this.'; }
      else if (rec.type === 'enemy') { icon = 'enemy:' + item.id; el.style.setProperty('--accent', item.color || '#b6a68a'); src = 'Threat ' + item.score + ' / 5 · ' + item.hp + ' HP' + (item.generatedVariant ? ' · ' + item.variantId : ''); desc = known ? item.desc : 'You have not met this thing.'; }
      else { icon = 'boss:' + item.id; el.style.setProperty('--accent', '#f0cf5e'); src = item.title + ' · ' + item.hp + ' HP' + (item.generatedVariant ? ' · ' + item.variantId : ''); desc = item.desc; }
      el.innerHTML = (rec.type==='boon'&&K.Portraits ? K.Portraits.boonHtml(item,{surface:'codex',className:'codex-art'}) : A.iconHtml(icon, 'codex-art')) + '<h4>' + item.name + '</h4><div class="src">' + src + '</div><p>' + desc + '</p>' + boonNumbers;
      el.setAttribute('data-codex-key',rec.type + ':' + rec.key);
      el.addEventListener('click', () => { codexSelectedKey = rec.type + ':' + rec.key; selectCodexEntry(el, rec, known); });
      grid.appendChild(el);
      if (shown.length && (codexSelectedKey === rec.type + ':' + rec.key || (!shown.some(r => r.type + ':' + r.key === codexSelectedKey) && rec === shown[0]))) { codexSelectedKey = rec.type + ':' + rec.key; selectCodexEntry(el, rec, known); }
    });
    body.appendChild(grid);
    if (!shown.length && inspector) inspector.innerHTML = '<h3>No entries found</h3><p>Try another name or category.</p>';
    const filterWord = (codexBuildFilter && codexBuildFilter !== 'all') ? ', filtered by ' + codexBuildFilter : '';
    counter.textContent = records.length ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, records.length) + ' of ' + records.length + filterWord : 'No entries found' + (filterWord ? ' for this filter' : '');
    prev.disabled = codexPage <= 0; next.disabled = codexPage >= pages - 1;
  }

  function selectCodexEntry(el, rec, known) {
    const inspector = document.getElementById('codex-inspector'); if (!inspector) return;
    document.querySelectorAll('[data-codex-key]').forEach(button => { const selected = button.getAttribute('data-codex-key') === codexSelectedKey; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected)); });
    inspector.innerHTML = el.innerHTML;
    inspector.style.setProperty('--accent', rec.type === 'boon' ? D.GODS[rec.item.god].color : rec.item.color || '#e0b355');
    if (rec.type === 'boon' && known && rec.item.rarity !== 'duo' && rec.item.rarity !== 'legendary') {
      const label = document.createElement('label'); label.className = 'codex-rarity-label'; label.textContent = 'REFERENCE RARITY ';
      const select = document.createElement('select'); select.setAttribute('aria-label','Boon reference rarity');
      ['common','rare','epic','heroic'].forEach(rarity => { const option = document.createElement('option'); option.value = rarity; option.textContent = D.RARITY[rarity].name; option.selected = rarity === 'rare'; select.appendChild(option); });
      label.appendChild(select); inspector.insertBefore(label, inspector.firstChild);
      select.addEventListener('change', () => { const effects = inspector.querySelector('.boon-effects'), prose = inspector.querySelector('p'); if (effects) effects.innerHTML = boonCardEffectMarkup(rec.item,select.value,null,false); if (prose) prose.innerHTML = fmtBoon(rec.item,select.value); });
    }
  }

  /* ---------------- Mirror of Nyx ---------------- */
  function buildMeta() {
    const list = document.getElementById('meta-list');
    document.getElementById('meta-obols').innerHTML = A.iconHtml('coin', 'currency-icon') + ' ' + U.comma(K.Save.data.obols) + ' obols';
    list.innerHTML = '';
    D.META.forEach(m => {
      const lv = K.Save.metaLevel(m.id);
      const maxed = lv >= m.max;
      const cost = m.cost + m.step * lv;
      const afford = K.Save.data.obols >= cost;
      const d = document.createElement('div');
      d.className = 'meta-item' + (maxed ? ' maxed' : (afford ? '' : ' cant'));
      d.setAttribute('role', 'button');
      d.tabIndex = maxed ? -1 : 0;
      const reason = maxed ? 'Maximum rank' : afford ? U.comma(cost) + ' obols' : 'Needs ' + U.comma(cost) + ' obols';
      d.setAttribute('aria-label', m.name + ', rank ' + lv + ' of ' + m.max + ', ' + reason + '. ' + m.desc);
      d.setAttribute('aria-disabled', String(maxed || !afford));
      let pips = '<div class="pips" aria-hidden="true">';
      for (let i = 0; i < m.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      pips += '</div>';
      d.innerHTML = '<div class="meta-icon">' + A.iconHtml(m.icon, 'meta-icon-art') + '</div><div class="meta-body"><h4>' + m.name + '</h4>' +
        '<p>' + m.desc + '</p>' + pips + '</div>' +
        '<div class="meta-cost">' + (maxed ? 'MAX' : A.iconHtml('coin', 'currency-icon') + ' ' + U.comma(cost)) + '</div>';
      if (!maxed) {
        const buy = () => {
          if (K.Save.spend(cost)) {
            K.Save.data.meta[m.id] = lv + 1;
            K.Save.write();
            K.Audio.sfx('levelup');
            buildMeta();
            buildMetaPreview();
          } else { K.Audio.sfx('ui2'); }
        };
        d.addEventListener('click', buy);
        d.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); buy(); } });
      }
      list.appendChild(d);
    });
    if (K.OverhaulUI) K.OverhaulUI.mirror(list, () => { buildMeta(); buildMetaPreview(); });
  }

  function buildMetaPreview() {
    const total = D.META.reduce((a, m) => a + K.Save.metaLevel(m.id), 0);
    const milestoneFlags = K.Save.data.campaignMilestones || {};
    const milestones = Object.keys(milestoneFlags).filter(id => milestoneFlags[id] === true).length;
    const el = document.getElementById('meta-preview');
    if (!el) return;
    el.innerHTML = A.iconHtml('coin', 'currency-icon') + ' ' + U.comma(K.Save.data.obols) + ' obols &nbsp;·&nbsp; ' +
      total + ' reflections &nbsp;·&nbsp; ' + K.Save.data.runs + ' descents &nbsp;·&nbsp; ' +
      K.Save.data.wins + ' escapes &nbsp;·&nbsp; ' + milestones + '/4 campaign milestones';
    const trialButton = document.getElementById('btn-trials');
    if (trialButton) {
      const unlocked = !!K.Save.data.fatedTrialsUnlocked;
      trialButton.disabled = !unlocked;
      trialButton.textContent = unlocked ? 'FATED TRIALS · BEST ' + (K.Save.data.fatedTrialBestScore || 0) : 'FATED TRIALS · LOCKED';
    }
  }

  function renderTrialSetup() {
    const save = K.Save.data, root = document.getElementById('trial-pacts');
    const normalized = K.RunSystems.normalizePactSelection(trialRanks);
    trialRanks = normalized.ranks;
    root.innerHTML = '';
    K.RunSystems.PACTS.forEach(pact => {
      const row = document.createElement('label'); row.className = 'trial-pact';
      const copy = document.createElement('span');
      copy.innerHTML = '<strong>' + escapeHtml(pact.name) + '</strong><small>' + escapeHtml(pact.desc) + '<br>' + (pact.ranks || []).map((text, index) => 'R' + (index + 1) + ': ' + escapeHtml(text)).join(' · ') + '</small>';
      const select = document.createElement('select'); select.setAttribute('aria-label', pact.name + ' severity');
      [0,1,2,3].forEach(rank => { const option = document.createElement('option'); option.value = String(rank); option.textContent = rank === 0 ? 'Off' : 'Rank ' + rank; select.appendChild(option); });
      select.value = String(trialRanks[pact.id] || 0);
      select.addEventListener('change', () => { trialRanks[pact.id] = Number(select.value); updateTrialSummary(); });
      row.append(copy, select); root.appendChild(row);
    });
    const rewards = document.getElementById('trial-rewards'); rewards.innerHTML = '';
    K.RunSystems.FATED_TRIAL_REWARDS.forEach(reward => {
      const unlocked = (save.fatedTrialRewards || []).includes(reward.score);
      const item = document.createElement('div'); item.className = 'trial-reward' + (unlocked ? ' unlocked' : '');
      item.innerHTML = '<strong>' + reward.score + ' PACTS · ' + (unlocked ? 'CLAIMED' : 'LOCKED') + '</strong>' + escapeHtml(reward.name) + '<small>' + escapeHtml(reward.desc) + '</small>';
      rewards.appendChild(item);
    });
    updateTrialSummary();
  }

  function updateTrialSummary() {
    const normalized = K.RunSystems.normalizePactSelection(trialRanks);
    trialRanks = normalized.ranks;
    document.getElementById('trial-summary').textContent = 'PACT SCORE ' + normalized.score + ' / 24 · BEST CLEAR ' + (K.Save.data.fatedTrialBestScore || 0);
    document.getElementById('trial-begin').disabled = normalized.score < 1 || !K.Save.data.fatedTrialsUnlocked;
  }

  function openTrials() {
    if (!K.Save.data.fatedTrialsUnlocked) return;
    renderTrialSetup(); showScreen('screen-trials'); document.getElementById('trial-begin').focus();
  }

  let heroChoice='perseus';
  function showHeroSelect(){
    const save=K.Save.data;K.RunSystems.normalizeSave(save);heroChoice=save.selectedHero||'perseus';
    const roster=document.getElementById('hero-roster');roster.innerHTML='';
    Object.keys(K.RunSystems.HEROES).forEach(id=>{
      const h=K.RunSystems.HEROES[id],unlocked=save.unlockedHeroes.indexOf(id)>=0,card=document.createElement('button');
      card.type='button';card.className='hero-card'+(heroChoice===id?' selected':'')+(!unlocked?' locked':'');card.disabled=!unlocked;card.setAttribute('aria-pressed',String(heroChoice===id));
      const art=document.createElement('span');art.className='hero-art';art.style.backgroundImage='url("'+A.url('actor.player.'+id).replace(/"/g,'%22')+'")';
      const name=document.createElement('strong');name.textContent=h.name+' · '+h.epithet;
      const desc=document.createElement('small');desc.textContent=unlocked?h.desc:'Unlock after '+h.unlockAt+' boss '+(h.unlockAt===1?'kill':'kills')+'.';
      card.append(art,name,desc);card.addEventListener('click',()=>{heroChoice=id;save.selectedHero=id;save.selectedHeroUpgrade='';K.Save.write();showHeroSelect();});roster.appendChild(card);
    });
    const weapons=document.getElementById('hero-weapon');weapons.innerHTML='';
    K.RunSystems.STARTERS.forEach(w=>{const o=document.createElement('option');o.value=w.id;o.textContent=w.name+' — '+w.desc;o.disabled=save.unlockedStarters.indexOf(w.id)<0;weapons.appendChild(o);});
    weapons.value=save.weapon||'xiphos';
    const upgrades=document.getElementById('hero-upgrade');upgrades.innerHTML='';
    const none=document.createElement('option');none.value='';none.textContent='No memento';upgrades.appendChild(none);
    const hero=K.RunSystems.HEROES[heroChoice];hero.upgrades.forEach(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=u.name+' — '+u.desc;o.disabled=(save.bossKills||0)<2;upgrades.appendChild(o);});
    upgrades.value=save.selectedHeroUpgrade||'';
    document.getElementById('hero-unlock-note').textContent=(save.bossKills||0)<2?'Hero mementos unlock after two boss victories. Starter weapons and heroes unlock through boss kills.':'Choose a hero, a persistent starter weapon, and an optional hero memento.';
    showScreen('screen-heroes');
  }
  function beginHeroRun(){
    const save=K.Save.data;save.selectedHero=heroChoice;
    const ws=document.getElementById('hero-weapon'),us=document.getElementById('hero-upgrade');
    save.weapon=ws.value;save.selectedHeroUpgrade=us.value||'';K.RunSystems.normalizeSave(save);K.Save.write();startRun();
  }
  function beginPractice(){K.Audio.boot();K.Audio.resume();G.startPractice({});resetRunGameUI();}
  function resetRunGameUI(){
    cache.hp=-1;cache.shield='';cache.obols=-1;cache.region='';cache.room='';cache.boss=-1;cache.bossStage='';cache.boons=-1;cache.relics=-1;cache.dash=[];
    cache.hpGhost=1;cache.hpGhostShown=-1;cache.bossRage=null;hud.toasts.innerHTML='';seenToasts={};for(const k in dismissedToasts)delete dismissedToasts[k];resetGameOverFlags();
  }

  /* ---------------- pause ---------------- */
  function showPause() {
    if (!G || G.phase === 'idle') return;
    const info = document.getElementById('pause-run-info');
    const r = G.run;
    info.innerHTML = '<p style="color:#b6a68a;font-size:13px;line-height:1.7">' +
      (G.region() ? G.region().name : '') + ' — Chamber ' + (G.chamberIndex + 1) + '/' + ((G.region() && G.region().chamberCount) || 8) + '<br/>' +
      'Level ' + r.level + ' · ' + r.xp + '/' + (100+20*Math.max(0,(r.level||1)-1)) + ' XP · Boons: ' + r.boons.length + ' · Relics: ' + r.relics.length + ' · Obols: ' + A.iconHtml('coin', 'currency-icon') + ' ' + r.obols + '<br/>' +
      (G.boss ? 'Boss: ' + G.boss.def.name + ' (' + Math.ceil(G.boss.hp) + ' HP)' : 'No boss present') +
      '</p>';
    document.getElementById('btn-practice-menu').classList.toggle('hidden',!G.practiceMode);
    showScreen('screen-pause');
  }

  /* ---------------- start / restart ---------------- */
  let startingRun = false;
  function startRun(options) {
    if (startingRun) return;
    if (!ctx || ctx.lost) { if (K.OverhaulUI) K.OverhaulUI.compatibility(ctx && ctx.lost); return; }
    if (!options && K.OverhaulUI) { K.OverhaulUI.configure(selection => startRun({modifiers:selection})); return; }
    startingRun = true;
    const beginButtons = ['hero-start','trial-begin','btn-again','btn-again2'].map(id => document.getElementById(id)).filter(Boolean);
    beginButtons.forEach(b => { b.disabled = true; });
    try {
      K.Audio.boot(); K.Audio.resume();
      showScreen(null);
      document.getElementById('hud').classList.remove('hidden');
      resetRunGameUI();
      G.startRun(undefined, options || {});
    } finally {
      startingRun = false;
      beginButtons.forEach(b => { if (b.id === 'trial-begin') return; b.disabled = false; });
      if (typeof updateTrialSummary === 'function') { try { updateTrialSummary(); } catch (e) {} }
    }
  }

  let gameOverShown = false;
  function resetGameOverFlags() { gameOverShown = false; }

  /* ---------------- game hooks ---------------- */
  function hookGame() {
    G.onTransition = function (kind, data) {
      if (kind === 'route') { showRouteScreen(data);
      } else if (['worldEncounter','worldExplore','worldMarket','worldMarketReturn','worldRegion'].includes(kind)) { showScreen(null); updateHUD();
      } else if (kind === 'event') { showEventScreen(data);
      } else if (kind === 'story') { showCampaignStory(data);
      } else if (kind === 'mythStory') { showCampaignStory(data);
      } else if (kind === 'mythStoryDone' || kind === 'storyDone' || kind === 'eventDone' || kind === 'routeSelected') { if (kind === 'storyDone' || kind === 'mythStoryDone') activeCampaignStory = null; showScreen(null); updateHUD();
      } else if (kind === 'reward') {
        G.phase = 'reward';
        showRewardScreen(data);
      } else if (kind === 'gameover') {
        if (!gameOverShown) { gameOverShown = true; setTimeout(() => showGameOver(data), 900); }
      } else if (kind === 'victory') {
        setTimeout(() => showVictory(data), 1400);
      } else if(kind==='practice') { showScreen('screen-practice',true);
      } else if(kind==='practiceExit') { showScreen('screen-title');K.Audio.playTrack(0);buildMetaPreview(); }
      }
    };
    /* reward buttons */
    document.getElementById('btn-reroll').addEventListener('click', () => {
      const pr = G.pendingReward;
      if (!pr || pr.rerolls <= 0 || pr.kind !== 'runLevelUp') return;
      pr.rerolls--;
      G.run.rerolls = pr.rerolls;
      const count = pr.choiceCount || 3;
      pr.choices = G.generateBoonChoices(count, { rarityFloor: pr.rarityFloor });
      K.Audio.sfx('ui');
      showRewardScreen(pr);
    });
    document.getElementById('btn-skip-boon').addEventListener('click', () => {
      const pr = G.pendingReward;
      if (!pr) return;
      if (pr.kind === 'fatedThread') { G.skipFatedThreads(); closeToPlay(); return; }
      if (pr.kind === 'runLevelUp') return;
      const offeredGods = Array.from(new Set((pr.choices || []).map(ch => D.boonById[ch.id] && D.boonById[ch.id].god).filter(Boolean)));
      if (offeredGods.length) G.changeGodFavor(G.run.rng.pick(offeredGods), -1, 'refused a boon');
      const bonus = pr.skipBonus || 30;
      const gained = G.run.addObols(bonus);
      K.Save.data.obols += gained;
      K.Save.write();
      /* refusing the gods strengthens the body instead */
      G.run.shopStats.push({ maxHp: 8 });
      G.recalcStats();
      G.player.heal(20, G);
      K.Audio.sfx('coin');
      G.toast('You refuse them. +' + gained + ' obols, +8 maximum life, heal 20.', '#b6a68a');
      G.closeOffer();
      closeToPlay();
    });

  /* ---------------- loop ---------------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.1) dt = 0.1;

    /* global keys */
    handleGlobalKeys();

    const paused = (screen === 'screen-pause' || screen === 'screen-armory' || screen === 'screen-paragon' || screen === 'screen-codex' || screen === 'screen-meta' ||
      screen === 'screen-help' || screen === 'screen-title' || screen === 'screen-heroes' || screen === 'screen-reward' ||
      screen === 'screen-gameover' || screen === 'screen-victory' || screen === 'screen-room' || screen === 'screen-cutscene' || screen === 'screen-trials' || screen === 'screen-practice' ||
      screen === 'screen-world-map' || screen === 'screen-modifiers' || screen === 'screen-market' || screen === 'screen-house');

    if (G && G.player && !paused) {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        G.update(STEP);
        acc -= STEP; steps++;
        K.Input.endFrame();
      }
      if (steps === 0) { /* keep input edges from piling up */ }
    } else {
      acc = 0;
      /* still tick the camera/particles gently behind menus so it looks alive */
      if (G && G.player && screen === 'screen-reward') {
        G.particles.update(dt);
      }
      K.Input.endFrame();
    }

    /* render */
    if (G) {
      if (screen === 'screen-title' || !G.region || G.phase === 'idle') {
        /* the title screen gets the House of Hades, not a frozen arena */
        drawTitleBackdrop(ts);
      } else {
        K.R.draw(ctx, G, dt);
      }
      hudFrameCount++;
      if (hudFrameCount >= HUD_UPDATE_INTERVAL) {
        updateHUD(dt);
        hudFrameCount = 0;
      }
      if (K.OverhaulUI) K.OverhaulUI.tick(G, screen, dt);
    } else {
      drawTitleBackdrop(ts);
    }
  }

  function handleGlobalKeys() {
    const In = K.Input;
    if (K.OverhaulUI && K.OverhaulUI.handleKeys(In, screen)) return;
    if (In.hit('KeyM')) {
      const m = K.Audio.toggleMute();
      K.Save.data.muted = m; K.Save.write();
      if (G) G.toast(m ? 'Sound muted' : 'Sound on', '#b6a68a');
    }
    if (screen === 'screen-cutscene') {
      if (In.hit('Escape')) { showCampaignChoices(); return; }
      const advanceKey = In.hitAny(['Enter', 'Space']);
      const rightKey = In.hit('ArrowRight');
      const active = document.activeElement;
      const focusedAction = active && (active.tagName === 'BUTTON' ||
        (active.classList && active.classList.contains('cutscene-choice')));
      if (rightKey || (advanceKey && !focusedAction)) advanceCampaignCutscene();
      return;
    }
    if (In.hit('Escape')) {
      if (screen === 'screen-pause') { closeToPlay(); }
      else if(screen==='screen-practice'&&G&&G.practiceMode){showScreen(null);}
      else if(screen==='screen-heroes'){showScreen('screen-title');}
      else if (screen === 'screen-codex') { showScreen(codexReturnScreen,codexReturnScreen === 'screen-gameover' || codexReturnScreen === 'screen-victory'); }
      else if (screen === 'screen-meta') { backToAtlasOrigin(mirrorReturnScreen); }
      else if (screen === 'screen-help') { backToAtlasOrigin(helpReturnScreen); }
      else if (screen === 'screen-trials') { backToAtlasOrigin('screen-title'); }
      else if (screen === 'screen-armory') { closeArmory(); }
      else if (screen === 'screen-paragon') { closeParagon(); }
      else if (screen === 'screen-room' || screen === 'screen-reward') {
        /* These menus require a choice; announce the requirement instead of silently ignoring Escape. */
        const announce = document.getElementById(screen === 'screen-room' ? 'room-title' : 'reward-title');
        if (announce) {
          if (!announce.hasAttribute('tabindex')) announce.setAttribute('tabindex', '-1');
          announce.focus({ preventScroll: true });
        }
      }
      else if (screen === 'play' && G && G.phase !== 'idle' && G.phase !== 'dead' && G.phase !== 'victory') showPause();
    }
    /* exit gate / advance */
    if (screen === 'play' && G && G.player && !G.player.dead) {
      const hint=hintEl,gate=G.exitGate;
      const labelEl = document.getElementById('interact-label');
      const gateNear=gate&&U.dist(G.player.x,G.player.y,gate.x,gate.y)<gate.radius+40;
      const setHint = (label) => {
        hint.classList.remove('hidden');
        if (labelEl) labelEl.textContent = label;
        else hint.textContent = '[E] ' + label;
      };
      if(gateNear){setHint('ONWARD');if(In.hit('KeyE'))useGate();}
      else {
        const it=currentInteract();
        if(it){
          const label=it.kind==='shop'?(it.item.name || 'WARES'):(it.kind==='arena'?(['OBOL OFFERING','RESTORATION','WARD','WAR STANDARD'][it.propCell] || 'OFFERING'):(it.kind==='haggle'?'HAGGLE':(it.kind==='healthTrade'?'BLOOD TITHE · TRADE LIFE FOR COIN':String(it.kind || 'INTERACT').toUpperCase())));
          setHint(String(label).toUpperCase().slice(0, 60));
        } else hint.classList.add('hidden');
      }
      syncTouchControls();
    } else {
      if (hintEl) hintEl.classList.add('hidden');
    }
  }

  function useGate() {
    if (!G) return false;
    return G.useExitGate();
  }
  /* The House of Hades: a colonnade, a brazier glow, and the Styx below. */
  function drawTitleBackdrop(ts) {
    if (!ctx || ctx.lost) return;
    ctx.beginFrame(ts / 1000, '#120f12');
    A.drawCover(ctx, 'ui.title', 0, 0, K.W, K.H);
    const t = ts / 1000;
    for (let i = 0; i < 54; i++) {
      const seed = i * 97.13;
      const x = ((seed * 7.3 + t * (12 + (i % 5) * 6)) % (K.W + 80)) - 40;
      const y = K.H - ((seed * 3.1 + t * (26 + (i % 7) * 8)) % (K.H + 140));
      const frame = (i * 5 + Math.floor(t * 7)) % 16;
      A.drawFrame(ctx, 'effects.particles', frame, x, y, 9 + (i % 3) * 4, 12 + (i % 4) * 4,
        { alpha: 0.22 + 0.4 * Math.abs(Math.sin(t * 1.3 + i)), rot: t * 0.25 + i });
    }
    ctx.flush();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    if (!K.Save.data) K.Save.load();
    K.Audio.setMuted(!!K.Save.data.muted);
    K.Audio.setAmbienceVolume(K.Save.data.ambienceVolume);
    K.Audio.setAmbienceMuted(!!K.Save.data.ambienceMuted);
    if(K.WorldAmbience)K.WorldAmbience.setReducedMotion(!!K.Save.data.reducedMotion);
    K.Input.init(canvas);
    G = new K.Game(canvas, ctx);
    G.region = function () { return D.REGIONS[Math.min(D.REGIONS.length - 1, this.regionIndex || 0)]; };
    window.K.G = G;
    if (ctx) {
      ctx.onLost = () => { showPause(); if (K.OverhaulUI) K.OverhaulUI.compatibility(true); };
      ctx.onRestored = () => { if (K.OverhaulUI) K.OverhaulUI.clearCompatibility(); };
    }
    hookGame();
    resize();
    if (K.OverhaulUI) K.OverhaulUI.bind(G,{showScreen,updateHUD,buildMetaPreview,renderArmory,showCampaignStory});

    /* buttons */
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => { K.Audio.boot(); K.Audio.resume(); K.Audio.sfx('ui'); fn(); }); };
    const ambienceSlider=document.getElementById('ambience-volume'),ambienceValue=document.getElementById('ambience-volume-value'),ambienceMute=document.getElementById('ambience-muted'),reducedMotion=document.getElementById('reduced-motion');
    if(ambienceSlider){ambienceSlider.value=String(K.Save.data.ambienceVolume);if(ambienceValue)ambienceValue.value=Math.round(K.Save.data.ambienceVolume*100)+'%';
      ambienceSlider.addEventListener('input',()=>{const value=K.Audio.setAmbienceVolume(ambienceSlider.value);if(ambienceValue)ambienceValue.value=Math.round(value*100)+'%';});
      ambienceSlider.addEventListener('change',()=>{K.Save.data.ambienceVolume=Number(ambienceSlider.value);K.Save.write();});}
    if(ambienceMute){ambienceMute.checked=!!K.Save.data.ambienceMuted;ambienceMute.addEventListener('change',()=>{K.Audio.setAmbienceMuted(ambienceMute.checked);K.Save.data.ambienceMuted=ambienceMute.checked;K.Save.write();});}
    if(reducedMotion){reducedMotion.checked=!!K.Save.data.reducedMotion;reducedMotion.addEventListener('change',()=>{K.Save.data.reducedMotion=reducedMotion.checked;if(K.WorldAmbience)K.WorldAmbience.setReducedMotion(reducedMotion.checked);K.Save.write();});}
    // Native button Space/Enter activation is sufficient; no manual keydown->click
    // forwarding (it double-advances dialogue where keydown preventDefault does
    // not cancel the keyup click).
    on('cutscene-next', () => advanceCampaignCutscene());
    on('cutscene-skip', () => showCampaignChoices());
    on('cutscene-review', () => { campaignVoiceIndex = Math.max(0, activeCampaignStory.chapter.voices.length - 1); renderCampaignVoice(); document.getElementById('cutscene-next').focus(); });
    on('btn-begin', () => showHeroSelect());
    on('btn-trials', () => openTrials());
    on('trial-back', () => { showScreen('screen-title'); buildMetaPreview(); document.getElementById('btn-trials').focus(); });
    on('trial-begin', () => {
      const selection = K.RunSystems.normalizePactSelection(trialRanks);
      if (selection.score < 1 || !K.Save.data.fatedTrialsUnlocked) return;
      trialRanks = selection.ranks;
      startRun({ trialPacts:selection.ranks });
    });
    on('hero-start',()=>beginHeroRun());
    on('hero-back',()=>showScreen('screen-title'));
    on('btn-practice',()=>beginPractice());
    on('practice-resume',()=>{showScreen(null);updateHUD();});
    on('practice-exit',()=>{if(G&&G.practiceMode)G.exitPractice();});
    on('btn-practice-menu',()=>showScreen('screen-practice',true));
    document.querySelectorAll('[data-practice-target]').forEach(button=>button.addEventListener('click',()=>{
      if(G&&G.practiceMode){G.practiceSpawn(button.dataset.practiceTarget);showScreen(null);updateHUD();}
    }));
    on('btn-armory', () => openArmory('screen-title'));
    on('btn-armory-pause', () => openArmory('screen-pause'));
    on('btn-armory-back', () => closeArmory());
    on('btn-paragon', () => openParagon('screen-title'));
    on('btn-paragon-pause', () => openParagon('screen-pause'));
    on('btn-paragon-back', () => closeParagon());
    document.getElementById('armory-filter').addEventListener('change', ev => { armoryFilter = ev.target.value; armorySelectedId = null; renderArmory(); });
    document.getElementById('armory-sort').addEventListener('change', ev => { armorySort = ev.target.value; renderArmory(); });
    on('armory-equip', () => {
      const item = K.Save.data.gearInventory.find(x => x.id === armorySelectedId);
      if (item && K.Gear.equip(item.id, item.slot)) armoryMessage = item.name + ' equipped.';
      renderArmory(); updateHUD();
    });
    on('armory-upgrade', () => {
      const result = K.Gear.upgrade(armorySelectedId);
      armoryMessage = result ? 'Upgraded to level ' + result.level + '.' : 'You need more Obols and one salvage shard.';
      renderArmory(); updateHUD();
    });
    on('armory-sell', () => {
      const value = K.Gear.sell(armorySelectedId);
      armoryMessage = value ? 'Sold for ' + U.comma(value) + ' Obols.' : 'Equipped gear cannot be sold.';
      renderArmory(); updateHUD();
    });
    on('armory-salvage', () => {
      const result = K.Gear.salvage(armorySelectedId);
      armoryMessage = result ? 'Salvaged for ' + result.shards + ' shard(s).' : 'Equipped gear cannot be salvaged.';
      renderArmory(); updateHUD();
    });
    on('paragon-buy', () => {
      const node = K.Paragon.NODES[paragonSelectedNode];
      if (node && K.Paragon.buy(node.id)) paragonMessage = node.name + ' woven into your fate.';
      else paragonMessage = paragonReason(node || K.Paragon.NODES[K.Paragon.ROOT_ID], K.Save.data);
      renderParagon();
    });
    on('paragon-respec', () => {
      const result = K.Paragon.respec();
      paragonMessage = result ? result.refunded + ' point(s) refunded for ' + U.comma(result.cost) + ' Obols.' : 'Not enough Obols to respec.';
      renderParagon();
    });
    on('btn-again', () => startRun());
    on('btn-again2', () => startRun());
    on('btn-title', () => { showScreen('screen-title'); K.Audio.playTrack(0); buildMetaPreview(); });
    on('btn-title2', () => { showScreen('screen-title'); K.Audio.playTrack(0); buildMetaPreview(); });
    on('btn-meta', () => openMirror('screen-title'));
    on('btn-meta2', () => openMirror('screen-gameover'));
    on('btn-meta-back', () => backToAtlasOrigin(mirrorReturnScreen));
    on('btn-boons', () => openCodex('boons','screen-title'));
    on('btn-go-chronicle', () => openChronicle('screen-gameover'));
    on('btn-vic-chronicle', () => openChronicle('screen-victory'));
    document.getElementById('codex-build-filter').addEventListener('change', ev => { codexBuildFilter=ev.target.value || 'all';codexPage=0;buildCodex(codexTab); });
    let codexSearchT = null;
    const codexSearch = document.getElementById('codex-search');
    codexSearch.addEventListener('input', ev => { codexQuery = ev.target.value || ''; codexPage = 0; if (codexSearchT) clearTimeout(codexSearchT); codexSearchT = setTimeout(() => { codexSearchT = null; buildCodex(codexTab); }, 150); });
    codexSearch.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); codexSearch.value = ''; codexQuery = ''; codexPage = 0; buildCodex(codexTab); } });
    document.getElementById('codex-prev').addEventListener('click', () => { codexPage = Math.max(0, codexPage - 1); buildCodex(codexTab); });
    document.getElementById('codex-next').addEventListener('click', () => { codexPage++; buildCodex(codexTab); });
    on('btn-codex-back', () => showScreen(codexReturnScreen, codexReturnScreen === 'screen-gameover' || codexReturnScreen === 'screen-victory'));
    on('btn-help', () => openHelp('screen-title'));
    on('btn-pause-help', () => openHelp('screen-pause'));
    on('btn-help-back', () => backToAtlasOrigin(helpReturnScreen));
    document.querySelectorAll('[data-atlas-route]').forEach(button => button.addEventListener('click', () => { if (!button.disabled) routeAtlas(button.getAttribute('data-atlas-route')); }));
    on('btn-resume', () => closeToPlay());
    on('btn-abandon', () => {
      if (!G || !G.run) return;
      if (!confirm('Abandon this descent? The run ends here; persistent Armory, Mirror and Loom progress is kept.')) return;
      G.abandon();
    });
    on('btn-reset-meta', () => {
      if (!confirm('Reset all progress? This erases Obols, Mirror upgrades, equipment, Paragon progress, the Saga, the Chronicle and Nemeses.')) return;
      K.Save.clear();
      buildMeta();
      buildMetaPreview();
    });

    /* click anywhere on the canvas starts audio */
    canvas.addEventListener('mousedown', () => { K.Audio.boot(); K.Audio.resume(); });

    /* touch action buttons: dispatch the same inputs keyboard users get */
    const pressKey = (code, down) => {
      try {
        const ev = new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true });
        window.dispatchEvent(ev);
        if (down && K.Input && !K.Input.keys[code]) { K.Input.keys[code] = true; K.Input.pressed[code] = true; K.Input.anyKeyEdge = true; }
        if (!down && K.Input) K.Input.keys[code] = false;
      } catch (e) { /* touch is best-effort */ }
    };
    const bindHold = (id, code, altMouse) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => { e.preventDefault(); K.Audio.boot(); K.Audio.resume(); if (altMouse === 'r' && K.Input) { K.Input.mouse.rdown = true; K.Input.mouse.rdownEdge = true; } else pressKey(code, true); };
      const up = (e) => { if (e) e.preventDefault(); if (altMouse === 'r' && K.Input) K.Input.mouse.rdown = false; else pressKey(code, false); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    bindHold('touch-dash', 'Space');
    bindHold('touch-guard', null, 'r');
    bindHold('touch-cast', 'KeyF');
    const touchInteract = document.getElementById('touch-interact');
    if (touchInteract) touchInteract.addEventListener('click', () => { K.Audio.boot(); K.Audio.resume(); pressKey('KeyE', true); setTimeout(() => pressKey('KeyE', false), 50); });
    const touchPause = document.getElementById('touch-pause');
    if (touchPause) touchPause.addEventListener('click', () => { K.Audio.boot(); K.Audio.resume(); if (screen === 'play') showPause(); else if (screen === 'screen-pause') closeToPlay(); });

    if (K.Persistence) {
      const showSaveStatus = state => {
        document.getElementById('save-notice').classList.toggle('hidden',!state.error);
        const backend = (K.Persistence.status && K.Persistence.status.backend) || (K.Persistence.backend) || 'browser storage';
        document.getElementById('save-notice-text').textContent = state.error ? (state.error + ' (' + backend + '). Keep this page open; Retry Save, or Download Backup.') : '';
      };
      K.Persistence.onStatus = showSaveStatus; showSaveStatus(K.Persistence.status);
      on('save-retry', () => { K.Save.write(); K.Save.flush(); });
      on('save-backup', () => {
        const blob = new Blob([JSON.stringify(K.Save.data)],{type:'application/json'});
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'katabasis-progress-' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
      });
      window.addEventListener('beforeunload', event => {
        if (K.Persistence.status.pending || K.Persistence.status.error) {
          K.Save.flush();
          const activation=window.navigator && window.navigator.userActivation;
          if (activation && !activation.hasBeenActive) return;
          event.preventDefault(); event.returnValue = '';
        }
      });
    }
    const pauseOnFocusLoss = () => { if(screen === 'play' && G && G.phase === 'playing') showPause(); };
    window.addEventListener('blur',pauseOnFocusLoss);
    document.addEventListener('visibilitychange',() => { if(document.hidden) pauseOnFocusLoss(); });
    buildMetaPreview();
    showScreen('screen-title');
    K.Audio.playTrack(0);
    requestAnimationFrame(frame);
  }

  function loadArtAndBoot() {
    const loading = document.getElementById('asset-loading');
    if (loading) loading.textContent = 'Preparing the image art…';
    A.load((done, total) => {
      if (loading) {
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        loading.textContent = 'Preparing image art ' + done + ' / ' + total + ' (' + pct + '%)';
      }
    }).then(() => {
      const finish = () => {
      if (loading) loading.classList.add('hidden');
      const obol = document.querySelector('.obol-glyph');
      if (obol) obol.outerHTML = A.iconHtml('coin', 'obol-glyph');
      try {
        if (K.WorldRenderer && K.WorldRenderer.prewarmIds && ctx && ctx._webgl) {
          const manifest = window.KATABASIS_ASSET_MANIFEST || {};
          const portraits = Object.keys(manifest).filter(id => id.indexOf('portrait.') === 0);
          K.WorldRenderer.prewarmIds(ctx, [
            'actor.player', 'actor.player.perseus', 'actor.player.atalanta', 'actor.player.orpheus',
            'effects.actions', 'effects.divine', 'effects.particles', 'effects.projectiles',
            'effects.status', 'effects.dash', 'effects.calls.1', 'effects.calls.2', 'effects.calls.3',
            'ui.icons', 'ui.deities', 'ui.relics', 'ui.gear-paragon', 'ui.meander', 'ui.panel',
            'ui.title', 'ui.healthbar', 'region.tartarus.floor', 'region.tartarus.props', 'region.tartarus.backdrop'
          ].concat(portraits));
        }
      } catch (prewarmError) { if (window.console && console.error) console.error(prewarmError); }
      boot();
      };
      if (K.Persistence && window.location) {
        if (loading) loading.textContent = 'Restoring your progress…';
        K.Persistence.init().then(finish, (err) => { if (window.console && console.error) console.error(err); finish(); });
      } else finish();
    }).catch(err => {
      if (window.console && console.error) console.error(err);
      if (loading) { loading.classList.add('asset-error'); loading.textContent = 'The image art could not be prepared. Check your connection and reload the page — your saved progress is untouched.'; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadArtAndBoot);
  else loadArtAndBoot();

  /* expose for debugging in the console */
  window.KATABASIS = {
    get game() { return G; },
    start: () => startRun(),
    save: K.Save,
    giveObols: (n) => { K.Save.addObols(n); buildMetaPreview(); },
    god: (id) => G && G.run && G.run.addBoon(id, 'heroic'),
    win: () => { if (G) G.victory(); }
  };
})();
