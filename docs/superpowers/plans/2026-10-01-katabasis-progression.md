# Katabasis Progression Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Connect stronger run builds, bounded long-term growth, and replayable post-victory challenges across Katabasis’ existing 24-region campaign.

**Architecture:** Keep the current browser JavaScript architecture and content. Add run-only Fated Threads and Fated Trial modifiers through `RunSystems` and the existing `Game` reward lifecycle; cap the effective power of gear and Paragon; persist validated campaign/trial records in the existing save object; expose all new choices through the existing DOM screens and HUD.

**Tech Stack:** ES5-style browser JavaScript IIFEs, Canvas + DOM, IndexedDB/localStorage persistence, CSS, Node bundler.

**Spec:** [2026-10-01-katabasis-progression-design.md](../specs/2026-10-01-katabasis-progression-design.md)

## Global Constraints

- The standard campaign remains **24 regions × 8 chambers = 192 chambers**.
- Keep the game offline and the standalone `katabasis.html` edition self-contained with zero external resource requests.
- Add no runtime dependencies, spendable currencies, or new raster art.
- Preserve existing valid save records and unlocks; clamp effective gear power at level **30** without deleting or rewriting stored item levels.
- Keep Threads and Pact modifiers run-scoped; only successful Trial victories can update the best Pact score or claim Trial rewards.
- The project directory is not a Git repository; omit commit steps.
- Do not add or run tests unless the user explicitly requests testing or verification. This plan uses source review and bundle production steps only.

## Review Focus

- **Legacy save input:** Missing, malformed, or older campaign fields must normalize without losing existing records; Task 1 reviews migration and Task 5 reviews Trial normalization.
- **Over-cap gear:** Items stored above level 30 must remain in the inventory while all combat, upgrade, and sale paths use the effective cap; Task 2 reviews every gear path.
- **Thread draft input:** Ineligible, duplicate, or insufficient Thread options must yield a deterministic valid draft; Tasks 3–4 review eligibility, fallback, and continuation flow.
- **Pact selection input:** Unknown IDs, invalid ranks, score 0, and practice mode must never grant Trial progression; Task 5 reviews normalization and runtime gates.
- **Outcome ordering:** Death, story transition, repeated victory callbacks, and reload must not double-claim Trial rewards or strand the reward flow; Tasks 4 and 6 review outcome ownership.

---

## File map

- `js/core.js` owns default save shape and save loading. It will gain versioned progression fields; its existing calls to subsystem normalizers remain the migration entry point.
- `js/run-systems.js` owns data-driven heroes, augments, quests, unlock normalization, and synergies. It will own Thread/Pact definitions, eligibility, score math, milestone records, and Trial reward claims.
- `js/gear.js` owns item generation, level math, upgrades, sale, and equipped effects. It will expose a single level-30 cap and depth curve.
- `js/paragon.js` owns the finite Loom graph and XP-to-point conversion. It will stop awarding new points once the graph’s 42 spendable points have been earned while preserving old stored values.
- `js/game.js` owns `Run`, `Game.startRun`, reward continuation, region/chamber progression, enemy and shop creation, stat compilation, death, and victory. It will connect run-scoped progression and Pact modifiers to those existing paths.
- `js/entities.js` owns `Player.heal`; it will apply the run’s healing Pact modifier at the shared healing boundary.
- `index.html`, `css/style.css`, and `js/main.js` own title screens, reward rendering, HUD, victory/game-over results, and input wiring. They will present Acts, Threads, and Fated Trials.
- `README.md` documents the revised progression. `tools/bundle.js` remains the existing single-file build entry point; no new script is needed in the HTML load order.

## Task 1: Add progression save fields and normalization

**Files:**
- Modify: `js/core.js`
- Modify: `js/run-systems.js`

**Interfaces:**
- Consumes: Existing `K.Save.defaults()`, `K.Save.load()`, and `K.RunSystems.normalizeSave(save)` call chain.
- Produces: Validated save fields `progressionVersion`, `campaignMilestones`, `fatedTrialsUnlocked`, `fatedTrialBestScore`, and `fatedTrialRewards` for later tasks, plus `recordCampaignMilestone(save, run, event)` for event-driven permanent milestone records.

- [x] **Step 1: Add defaults in `Save.defaults()`**

  Add `progressionVersion: 2`, boolean milestones `{ firstCapstone:false, actI:false, actII:false, campaignVictory:false }`, `fatedTrialsUnlocked:false`, `fatedTrialBestScore:0`, and `fatedTrialRewards:[]`. Leave every existing save field and default untouched.

- [x] **Step 2: Normalize the new fields in `RunSystems.normalizeSave(save)`**

  Normalize milestone flags to booleans; backfill all four milestones for legacy saves with a campaign win. Do not infer a required capstone clear from aggregate boss-kill counts, since optional bosses also increment that record. Clamp the best score to the integer range 0–24; deduplicate rewards and retain only thresholds `[5,10,15,20]`. Set `fatedTrialsUnlocked` when the stored flag is true or `save.wins > 0`, so a legacy win qualifies. Add an idempotent `recordCampaignMilestone(save, run, event)` helper for the first regional capstone, Act I boss, Act II boss, and campaign victory. Persist event records at the boss/victory boundary so they survive death/reload. Existing boss-kill unlocks continue to provide hero/starter choices; store Trial title claims as validated score thresholds `[5,10,15,20]`. Do not reset Obols, gear, Mirror ranks, Paragon state, unlocks, or archive arrays.

- [x] **Step 3: Review the save load path**

  Confirm `Save.load()` still invokes `RunSystems.normalizeSave()` after all scripts are loaded and that repeated normalization is idempotent. Keep malformed or non-object fields from reaching UI renderers.

## Task 2: Bound gear and Paragon power

**Files:**
- Modify: `js/gear.js`
- Modify: `js/game.js`
- Modify: `js/paragon.js`

**Interfaces:**
- Consumes: Existing `GEAR.generate`, `GEAR.effects`, `GEAR.upgradeCost`, `GEAR.upgrade`, `GEAR.sellValue`, `Game` gear-drop call sites, and `Paragon.awardXp`.
- Produces: `K.Gear.MAX_POWER_LEVEL === 30`, `K.Gear.effectiveLevel(item) -> integer`, and `K.Gear.itemLevelAtDepth(regionIndex, chamberIndex) -> integer`.

- [x] **Step 1: Define the central gear level helpers in `js/gear.js`**

  Set `MAX_POWER_LEVEL` to 30. Implement `effectiveLevel(item)` as `min(item.level, 30)` for valid positive levels and `itemLevelAtDepth(regionIndex, chamberIndex)` as `min(30, 1 + floor((regionIndex * 8 + chamberIndex) / 5))`, clamped to at least 1.

- [x] **Step 2: Route all gear calculations through the helpers**

  Clamp generated drop levels to 30. In `GEAR.effects`, multiply base effects and affixes by effective level times the existing rarity factor. Refuse `GEAR.upgrade()` at effective level 30, show max cost/state through the existing Armory API, and calculate `GEAR.sellValue()` from effective level. Preserve `raw.level` when loading legacy gear.

- [x] **Step 3: Replace direct drop-level formulas in `js/game.js`**

  Update every `K.Gear.generate()` call site, including relic/treasure and Charon offers, to use `K.Gear.itemLevelAtDepth(this.regionIndex, this.chamberIndex)`. Search all call sites before finishing; no source may bypass the depth helper.

- [x] **Step 4: Bound new Paragon point awards in `js/paragon.js`**

  Define `MAX_SPENDABLE_POINTS = 42`. Count purchased node costs plus currently banked points before converting XP in `Paragon.awardXp()`. Award only the remaining points up to the cap. Preserve XP remainder, legacy excess banked points, purchased nodes, and current respec semantics; after the finite graph is complete, new XP grants no new spendable points.

## Task 3: Add the Fated Thread catalog and effects

**Files:**
- Modify: `js/run-systems.js`
- Modify: `js/game.js`

**Interfaces:**
- Consumes: Existing `AUGMENTS`, `RELIC_TRANSFORMS`, `activeSynergies(run)`, and `compileStats(run, player)` patterns.
- Produces: `Run.fatedThreadIds: string[]`, `K.RunSystems.FATED_THREADS`, `K.RunSystems.eligibleFatedThreads(run) -> Thread[]`, and `K.RunSystems.fatedThreadEffects(run) -> effect object`.

- [x] **Step 1: Define 12 Thread records in `js/run-systems.js`**

  Add 12 stable-ID definitions across offense, defense, mobility, and god/status interactions. Each record has `id`, `name`, `desc`, `category`, optional eligibility requirements, and either existing `fx` keys or an existing transformation hook. Threads must change a play pattern; they cannot be only flat damage, health, or defense bonuses.

- [x] **Step 2: Implement eligibility and effect aggregation**

  `eligibleFatedThreads(run)` returns unowned records whose requirements match the run. `fatedThreadEffects(run)` merges the selected Thread effects using the same declarative semantics as current run augments. Do not make Thread choice mutate save state.

- [x] **Step 3: Add run state and stat application**

  Initialize `this.fatedThreadIds = []` in `Run(seed)`. Apply `K.RunSystems.fatedThreadEffects(run)` from `compileStats()` after hero upgrades and augments. Any Thread using a custom transformation must read its selected ID from the current `Run` and use existing combat/render hooks.

## Task 4: Connect Act milestones, Thread drafts, and route/HUD information

**Files:**
- Modify: `js/game.js`
- Modify: `js/main.js`
- Modify: `index.html`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: Task 3’s Thread API and existing `Game.offerBoons`, `Game.closeOffer`, `Game.beginCampaignStory`, `Game.onTransition`, `showRewardScreen`, and `updateHUD` flows.
- Produces: `Game.offerFatedThreads(continuation)`, `Game.takeFatedThread(id)`, and `Game.skipFatedThreads()`; a reward object with `kind:'fatedThread'`, three valid choices, and a continuation payload.

- [x] **Step 1: Add Act state to the run and HUD**

  Derive Act I from regions 0–7, Act II from 8–15, and Act III from 16–23. Add a DOM HUD readout for act, region, chamber, and the next Thread milestone. Update it from `updateHUD()` without changing the 24-region route.

- [x] **Step 2: Mark boss rewards at regions 8 and 16**

  Record the first regional capstone milestone on the first regional boss victory. When `Game` creates the normal boss boon reward for `regionIndex === 7` or `regionIndex === 15`, record the Act I/II milestone and mark it for a Thread follow-up. Preserve the existing four-boon draft, campaign chapter, `advanceAfter`, and `victoryAfter` values. Record campaign victory from `Game.recordWin()`.

- [x] **Step 3: Implement the Thread reward continuation**

  `offerFatedThreads(continuation)` selects three eligible records using `run.rng`; if fewer than three match, fill from the unowned general pool. If the pool is exhausted, continue the original story/advance/victory flow safely. `takeFatedThread(id)` validates against the pending offer, stores at most two unique IDs on the run, recalculates stats, then continues. `skipFatedThreads()` uses the existing skip reward and the same continuation. Update `Game.closeOffer()` so a milestone boss boon proceeds to Thread draft before the campaign story; a Thread reward then proceeds to that saved continuation exactly once.

- [x] **Step 4: Render Thread choices in the existing reward screen**

  Add a `fatedThread` branch to `showRewardScreen()`, hide reroll for Threads, render name/category/effect preview, and route card selection to `G.takeFatedThread(id)`. Route the skip button to `G.skipFatedThreads()` without changing god favor as though a boon was refused.

- [x] **Step 5: Clarify route cards and the run recap**

  Make `buildRouteChoices()` return explicit `danger`, `reward`, `cost`, `condition`, `families`, and `synergyTag` fields. Use `cost: "12% maximum health"` for Blood-Tithe rooms, `cost: "Varies by event choice"` for Fateful Events, and `cost: "None"` otherwise. Safe shop and event routes must not show fictitious enemy families or combat modifiers; keep their variable obol tithe and state it in the route condition preview. Render those fields in a structured card layout and avoid duplicate reward/danger profiles within one choice set. Add Act and selected Thread names to game-over/victory recaps and keep the layout usable at narrow viewport widths.

## Task 5: Add Fated Trial rules and runtime modifiers

**Files:**
- Modify: `js/run-systems.js`
- Modify: `js/game.js`
- Modify: `js/entities.js`
- Modify: `js/core.js`

**Interfaces:**
- Consumes: Task 1 save fields, current deterministic run RNG, `Game.startRun(seed, options)`, enemy spawn, healing, shop purchase, boon offer, and win/death paths.
- Produces: `K.RunSystems.PACTS`, `normalizePactSelection(selection) -> { ranks, score }`, `pactModifiers(selection) -> modifier object`, and `recordTrialVictory(save, run) -> { bestScore, newlyClaimed }`.

- [x] **Step 1: Define eight three-rank Pact modifiers**

  Add eight data-driven modifiers with ranks 1–3: enemy health, enemy damage, enemy attack tempo, healing received, Charon prices, boon offer count, elite pressure, and starting Death Defiance. Keep their effects independent and expose a maximum score of 24. Pact score 0 is a normal campaign, not a Trial.

- [x] **Step 2: Normalize selection and aggregate modifiers**

  `normalizePactSelection(selection)` accepts only known Pact IDs and integer ranks 1–3, discards invalid entries, clamps the total, and returns a fresh `{ranks, score}` object. `pactModifiers(selection)` returns normalized scalar adjustments with safe minima: boon offers never fall below one and healing, prices, enemy multipliers, and Death Defiance stay within their supported ranges.

- [x] **Step 3: Carry selected Pacts on a run**

  Extend `Game.startRun(seed, options)` with `options.trialPacts`. Store normalized ranks, `trialScore`, `isFatedTrial`, and nullable `trialResult` on `Run`. Practice runs discard Pact options and cannot record campaign or Trial progression.

- [x] **Step 4: Apply modifiers at shared runtime boundaries**

  Apply enemy health/damage/tempo in `Game.addEnemy()`, elite pressure in `Game.spawnWave()`, healing in `Player.heal(amount, G)`, shop prices at the existing `it.cost` display and purchase boundary, boon offer count in `Game.offerBoons()`, and starting Death Defiance in `Game.startRun()`. Keep each multiplier in the run’s normalized Pact modifier object so UI and combat use the same values.

- [x] **Step 5: Record only successful Trial outcomes**

  In `Game.recordWin()`, call `recordTrialVictory()` only when `run.isFatedTrial` and `run.trialScore >= 1`; store its return object in `run.trialResult` for the victory screen. Update `fatedTrialBestScore` and claim each named, non-stat title at thresholds `[5,10,15,20]` once. Display claimed/upcoming titles in the Trial screen and announce newly claimed titles in the victory recap. Do not update score or claim rewards in `recordDeath()`, `abandon()`, or practice mode.

## Task 6: Add Trial setup, results, and unlock presentation

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: Task 1 save fields and Task 5 APIs `normalizePactSelection`, `PACTS`, and `recordTrialVictory`.
- Produces: Title-screen Trial entry, Trial setup screen, and victory recap showing score/best score/new claims.

- [x] **Step 1: Add the Trial screen structure**

  Add a title button and a `screen-trials` dialog with eight Pact selectors, rank controls 0–3, score total, best score, reward thresholds, and Begin/Back actions. Disable the entry until `fatedTrialsUnlocked` is true.

- [x] **Step 2: Wire accessible selection and start flow**

  Keep selection in local UI state until Begin. Re-normalize it with `RunSystems.normalizePactSelection()` before start; require score ≥1. Update the main `startRun(options)` helper to pass `{trialPacts:ranks}` to `G.startRun()`. Preserve all existing `startRun()` callers and keyboard/focus conventions.

- [x] **Step 3: Show Trial status in HUD and results**

  Display active Pact names/ranks and score during a Trial. Extend `showVictory(run)` and `renderRunRecap()` with Trial score, best score, and newly claimed thresholds. Keep `showGameOver(run)` clear that an incomplete Trial grants no score-threshold rewards while retaining normal run rewards.

- [x] **Step 4: Review responsive and input states**

  Review disabled/unlocked title state, malformed selection fallback, focus order, narrow viewport layout, and return-to-title behavior from victory, death, and Trial setup.

## Task 7: Update player-facing docs and produce the offline bundle

**Files:**
- Modify: `README.md`
- Build output: `katabasis.html` via the existing bundler

**Interfaces:**
- Consumes: Final names and controls from Tasks 3–6.
- Produces: Documentation matching source behavior and a regenerated self-contained bundle.

- [x] **Step 1: Update the progression sections in `README.md`**

  Document the 3×8-region Act rhythm, the region 8/16 Thread choices, item level 30 functional cap, finite Paragon points, Pact score/ranks, Trial unlock, and reward thresholds. Remove stale descriptions that claim gear levels grow without a ceiling.

- [x] **Step 2: Build the single-file edition**

  Run the existing `node tools/bundle.js` command from the project root after all source edits. Confirm the bundler reports the generated `katabasis.html` path and no new external dependency was introduced. Do not run test harnesses unless the user separately requests test/verification work.

## Execution notes

The project has no Git repository, so commits and Git worktrees do not apply. The user approved the proposal; use the native coordinated implementation route because save, run, and reward-flow changes share state. Do not add or run tests; build the standalone edition and review source behavior as allowed by the higher-priority session constraint.
