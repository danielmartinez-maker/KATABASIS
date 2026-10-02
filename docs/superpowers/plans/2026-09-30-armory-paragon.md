# Armory and Paragon Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent six-slot Greek gear collection with uncapped upgrades and a connected, permanent Paragon board to Katabasis.

**Architecture:** `js/gear.js` owns gear templates, rolls, save-backed inventory actions, and equipped effects; `js/paragon.js` owns node definitions, XP/point progression, purchases, respec, and node effects. `js/game.js` applies both systems to existing stats and reward sources, while `js/main.js` and `index.html` provide title/pause screens using raster icon atlases.

**Tech Stack:** Existing browser JavaScript, Canvas, HTML/CSS, localStorage, built-in ImageGen, Node smoke/browser checks, and the existing single-file bundler. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-30-armory-paragon-design.md`

## Global Constraints

- Keep the `katabasis.save.v1` key and preserve all existing fields while migrating old saves.
- The six gear slots are Weapon, Helm, Cuirass, Bracers, Waist, and Greaves; gear level has no ceiling.
- Paragon has six branches, four sequential ordinary nodes and two mutually exclusive final keystones per branch, plus the free central node.
- Keep new item and node iconography as raster images; do not draw substitute geometric game art.
- Preserve offline `katabasis.html` with zero external resource requests.
- Retain current combat input, run-scoped boons/relics, Chronicle, Nemesis, campaign, and ending behavior.
- Source is not a Git repository; do not add commit steps.

## Review Focus

1. Existing v1 saves, malformed records, and blocked storage still boot without losing prior fields.
2. Equipping a replacement removes the previous item's effects; set thresholds apply once and only for equipped pieces.
3. Upgrade, sell, salvage, duplicate conversion, and insufficient-resource paths are atomic and overflow-safe.
4. Paragon XP carries remainders; disconnected nodes and second keystones are rejected; refund returns exact points without erasing XP.
5. Boss/elite/treasure/shop rewards persist immediately and use deterministic run RNG; the standalone HTML remains offline.

---

### Task 1: Migrate persistent saves without losing existing progress

**Files:**
- Modify: `js/core.js`
- Modify: `tools/smoke.js`

**Interfaces:**
- Produces save fields `gearInventory`, `equippedGear`, `salvageShards`, `paragonUnlocked`, `paragonXp`, `paragonPoints`, and `paragonNodes`.
- Migrates the existing `weapon` value into a starter gear record and keeps all legacy save fields.

- [ ] Add smoke assertions that a fresh save equips the starter Xiphos with all six slots present and that a v1 save preserves Obols, campaign archive, Nemeses, Chronicle, Mirror levels, and settings while adding defaults.
- [ ] Run `node tools/smoke.js`; expect migration assertions to fail on absent fields and gear migration.
- [ ] Add defensive normalization for absent/wrong-shaped inventory, equipped slots, shard balance, and Paragon data; retain `katabasis.save.v1` and the in-memory storage fallback.
- [ ] Run `node tools/smoke.js`; expect migration assertions and existing save checks to pass.

### Task 2: Add gear content, deterministic generation, and inventory actions

**Files:**
- Create: `js/gear.js`
- Modify: `index.html`
- Modify: `tools/bundle.js`
- Modify: `tools/smoke.js`

**Interfaces:**
- Produces `K.Gear.normalizeSave(save)`, `K.Gear.generate(slot, level, rng, rarity)`, `K.Gear.add(item)`, `K.Gear.equip(instanceId, slot)`, `K.Gear.upgrade(instanceId)`, `K.Gear.sell(instanceId)`, `K.Gear.salvage(instanceId)`, and `K.Gear.effects(save)`.
- Defines six complete 6-piece Greek sets, weapon templates that reuse the current strike input/animation, rarity/affix tables, and duplicate fingerprints.

- [ ] Add smoke assertions for deterministic seeded generation, valid item schema for all slots, exactly 36 set pieces, accurate duplicate conversion, atomic insufficient-resource failures, and successful upgrade/sell/salvage operations.
- [ ] Run `node tools/smoke.js`; expect failures because `K.Gear` is not loaded and has no inventory operations.
- [ ] Implement the data-driven gear module and load it after `js/content-expansion.js` and before `js/game.js` in `index.html`, `tools/bundle.js`, and the smoke harness.
- [ ] Test levels beyond the existing campaign tier range, verify upgrade cost remains finite/increasing, then run `node tools/smoke.js`; expect all gear contract assertions to pass.

### Task 3: Add the connected Loom of the Fates progression board

**Files:**
- Create: `js/paragon.js`
- Modify: `index.html`
- Modify: `tools/bundle.js`
- Modify: `tools/smoke.js`

**Interfaces:**
- Produces `K.Paragon.normalizeSave(save)`, `K.Paragon.awardXp(amount)`, `K.Paragon.canBuy(nodeId, save)`, `K.Paragon.buy(nodeId)`, `K.Paragon.respec()`, and `K.Paragon.effects(save)`.
- Defines the Wayfarer root and six branches (Ares, Athena, Artemis, Hermes, Demeter, Hades), each with four sequential nodes and a two-choice final keystone fork.

- [ ] Add smoke assertions for 99+1 XP rollover, elite/boss XP awards, persistence across reload-shaped save data, adjacency, point costs, per-branch mutually exclusive keystones, invalid node ids, and exact respec/refund accounting.
- [ ] Run `node tools/smoke.js`; expect Paragon API and contract assertions to fail.
- [ ] Implement validated point accounting and the static node graph; unlock after a regional capstone and preserve earned XP when refunding points.
- [ ] Run `node tools/smoke.js`; expect board/progression assertions to pass.

### Task 4: Apply equipped gear, set bonuses, and Paragon effects to combat stats

**Files:**
- Modify: `js/game.js`
- Modify: `js/gear.js`
- Modify: `js/paragon.js`
- Modify: `tools/smoke.js`

**Interfaces:**
- `Game.recalcStats()` consumes `K.Gear.effects(save)` and `K.Paragon.effects(save)` through the existing stat compiler.
- The equipped Weapon slot synchronizes to `Save.data.weapon` for existing run construction.

- [ ] Add smoke checks showing one equipped item changes its target stats, replacing it removes the old effects, 2/4/6 set thresholds count equipped pieces only, and purchased Paragon nodes add their effects exactly once.
- [ ] Run `node tools/smoke.js`; expect the new gear/board stat checks to fail before integration.
- [ ] Integrate persistent effects into `compileStats`, support weapon-template `dmg`/`atkCd`/`reach`/`arc`/`combo` data through the existing attack code, and recalculate immediately after equip or respec.
- [ ] Run `node tools/smoke.js`; expect existing and new stat assertions to pass.

### Task 5: Deliver gear through bosses, elites, treasure, and Charon

**Files:**
- Modify: `js/game.js`
- Modify: `js/data.js`
- Modify: `tools/smoke.js`

**Interfaces:**
- Boss kills award one item; elite rolls use 25%; treasure offers one generated gear option; every Charon visit adds one gear offer bought with run Obols.
- Normal/elite/boss kills award 1/5/20 Paragon XP, banked immediately with 100 XP per point.

- [ ] Add regression assertions for one boss item, deterministic elite chance boundaries, treasure gear choice, Charon stock/purchase, immediate save persistence, duplicate reward conversion, and 1/5/20 Paragon XP.
- [ ] Run `node tools/smoke.js`; expect reward hooks and XP assertions to fail before integration.
- [ ] Add gear reward generation using the active run RNG; persist acquisitions immediately and award/bank Paragon XP in the existing kill path.
- [ ] Run `node tools/smoke.js`; expect reward and XP assertions to pass without changing unrelated reward behavior.

### Task 6: Generate and register raster Armory and Paragon icon art

**Files:**
- Create: `assets/ui/gear-paragon.webp`
- Modify: `assets/manifest.json`
- Modify: `js/asset-manifest.js`
- Modify: `js/assets.js`
- Modify: `tools/smoke.js`

**Interfaces:**
- Produces one transparent 4×4 raster sprite atlas for the six gear slots, six Paragon branches, and four shared gear/keystone actions.
- Adds manifest key `ui.gear-paragon`; art is generated with built-in ImageGen and embedded by the existing bundler.

- [x] Add a smoke assertion for the manifest key, 4×4 grid, file existence, image dimensions, and preserved transparency.
- [x] Run `node tools/smoke.js`; expect the missing art entry/file assertion to fail.
- [x] Generate and inspect the raster atlas with the approved image workflow, save it to `assets/ui/gear-paragon.webp`, register it, and add slot/branch cell aliases.
- [x] Run `node tools/smoke.js`; expect raster/manifest checks to pass.

### Task 7: Build the Armory and Loom screens for title and pause menus

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`
- Modify: `tools/smoke.js`
- Modify: `tools/bundle-check.js`

**Interfaces:**
- Adds Armory and Loom screens reachable from title and pause, with keyboard navigation and narrow-screen layout.
- Armory actions call `K.Gear` methods; Loom actions call `K.Paragon` methods; both refresh currency, item/node details, and derived stats after changes.

- [x] Add browser assertions for navigation from title and pause, six slots and inventory rendering, sorting/filtering, comparison deltas, equip/upgrade/sell/salvage actions, Loom locked/owned/affordable states, respec display, and keyboard/viewport navigation.
- [x] Run the browser check; confirm the missing screen assertion fails before UI implementation.
- [x] Implement the two screens with generated atlas art, accessible controls, comparison text, upgrade/sale costs, branch paths, disabled-state reasons, and Mirror refund action.
- [x] Run the browser check at desktop and narrow viewport sizes; each UI assertion passes without console errors.
- [x] Post-review browser regressions: native Space activation on Armory and Paragon controls; treasure gear, boon, and skipped-reward advancement preserve visible route choices.

### Task 8: Rebuild and verify the standalone game

**Files:**
- Modify: `katabasis.html`

**Interfaces:**
- Produces a single offline HTML file embedding all new source code and raster atlas data.

- [x] Run `node tools/bundle.js`; `external references remaining: 0`.
- [x] Run `node tools/smoke.js` and `node tools/bundle-check.js`; existing campaign checks plus gear, Paragon, reload persistence, and new UI checks pass with zero external resource requests.
- [x] Inspect the bundled UI screenshots and asset atlas; fix the inspector action layout and Loom/back overlap, then confirm screenshots are clear.
- [x] Resolve final review findings, rebuild the standalone bundle, and rerun smoke plus isolated Chromium checks; confirm offline requests remain at zero.

## Execution Notes

- The user's implementation preference is native execution in this session.
- The source of truth is `C:\Users\dmcfu\OneDrive\Documents\deepseek-harness\default-workspace`; edit source modules and rebuild `katabasis.html`.
- The directory is not a Git repository, so there are no branch or commit steps.
- `tools/bundle-check.js` may require the one-run `KATABASIS_TEST_NO_SANDBOX=1` setting on this managed Windows host; do not persist the setting or change game security behavior for it.
