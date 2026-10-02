# Katabasis World, Mythology, Deity Art, and Endgame Implementation Plan

> **For agentic workers:** Use the executing-plans and dispatching-parallel-agents workflows. The user explicitly requested implementation of the entire written overhaul; proceed through the authorized engineering work. Preserve the spec's concrete roster and art pilot review gates.

**Goal:** Deliver every acceptance criterion of the world, mythology, deity art, and endgame overhaul.

**Architecture:** Keep the existing combat simulation, durable storage, campaign IDs, and HTML menus. Add a deterministic world generator and runtime adapter, a batched WebGL renderer using the existing raster library, versioned mythology/story and portrait registries, and capped gear/Mirror progression. Independent content and progression work runs alongside world implementation with explicit file ownership.

**Tech Stack:** Offline JavaScript, HTML/CSS, WebGL, raster assets, Node headless regression harness, Chromium browser checks.

**Spec:** `docs/superpowers/specs/2026-10-01-katabasis-procedural-world-and-gear-endgame-design.md`

## Global Constraints

- Preserve all 24 regional IDs and add `ancient_greece` and `atlantis`; market is a service space.
- Preserve every existing eligible god (live source has 48), boon, save, Pact ID, Trial record, gear instance, and legacy Mirror rank.
- A generated region is connected and requires camera travel in both axes; map RNG never consumes combat RNG.
- WebGL failure blocks run entry with a readable compatibility message.
- Modifiers cost no currency; ordinary modified runs cannot claim Trial rewards.
- Effective item level stays at 30; Masterwork ranks stay at three; finite Mirror branches use existing resources.
- Exactly 53 stable portrait IDs; five additions are portrait-only. Roster and two-deity pilot must be reviewed before full asset production.
- No external runtime requests; generated standalone edition includes every required asset and shader.

## Review Focus

- Old campaign numeric indices remain valid after adding destinations; story and first-act milestones use stable region identity.
- Backtracking/re-entry must not duplicate rewards, enemies, stock, or Obol credits.
- Every movement ability and enemy spawn obeys terrain and active local encounter boundaries.
- Invalid saved progression and transaction arguments cannot destroy items or spend resources partially.
- WebGL context loss, hidden/reduced-motion portraits, and standalone file protocol remain usable and deterministic.

## Task 1: Shared world and region runtime

**Files:** Create `js/world.js`, `js/world-runtime.js`, `tools/world-overhaul.test.js`.
**Interfaces:** `K.World.generate({seed,regionId,modifiers,version,shopNodeId})`, `K.World.isWalkable(map,x,y,radius)`, `K.World.validate(map)`, `K.World.reveal(map,x,y)`; `Game.world` is plain serializable world state; runtime owns simulation/collision/encounter/market transitions.

- [x] Write and run failing deterministic, navigation, collision, regional count, encounter/backtracking, market, and Obol tests.
- [x] Generate topology, terrain, main-route beat nodes, loops, optional reward branches, themed landmarks, hazards, and validation/repair from an isolated seeded stream.
- [x] Integrate physical encounters, rewards, camera bounds, visited terrain, stable region exits, safe market stock return, auto-credit Obols, and practice world.
- [x] Run targeted tests and existing game regression suites; record results.

## Task 2: WebGL world presentation

**Files:** Create `js/world-renderer.js`, `tools/world-renderer.test.js`; modify `js/render.js`, `js/main.js`, `index.html`, `css/style.css`, module lists in tools.
**Interfaces:** `K.WorldRenderer.create(canvas)` returns a rendering context compatible with existing sprite draw helpers; `K.WorldRenderer.draw(context,game)` reads the generated world without mutating gameplay.

- [x] Write capability, projection, culling, draw-state and terrain/actor tests; observe missing implementation failure.
- [x] Render raster terrain, raised geometry, contact shadows, animated materials, sorted sprites, telegraphs, particles, and distant silhouettes with batched GPU draws and resource cleanup/context recovery.
- [x] Add explored map overlay, world objective/service prompts, modifier pre-run setup, accessible market browsing, and progression controls.
- [x] Verify real browser screenshots at desktop and smaller viewport; measure ordinary-encounter frame time.

## Task 3: Mythology and recurring story

**Files:** Create `js/mythology.js`, `js/portraits.js`, `tools/mythology-overhaul.test.js`, portrait roster/generation records and review pages.
**Interfaces:** `K.Mythology.registerPack(pack)`, `normalizeSave(save)`, `scenesFor(context)`, `resolveScene(save,id,choice)`; `K.Portraits` exposes stable deity/boon mappings and static/animated presentation.

- [x] Write migration, distinct-tradition registration, story prerequisite/consequence, repeated-scene, and portrait mapping tests; observe failures.
- [x] Register active Greek and inactive Egyptian/Roman/Norse boundaries; author multi-chapter Charon/Achilles/Orpheus/Circe/Olympian scenes and personal quests with bounded persistent choices.
- [x] Preserve existing authored campaign content; add contextual optional world/market/House scene integration.
- [x] Prepare exactly 53 roster records with all required art metadata and obtain the concrete roster review.

## Task 4: Gear, modifiers, Mirror, and build coverage

**Files:** Modify `js/gear.js`, `js/run-systems.js`, `js/build-powers.js` as needed; create `js/endgame.js`, `tools/endgame-overhaul.test.js`, build coverage matrix.
**Interfaces:** `K.Endgame` finite branch transactions/normalization, modifier preview, capped trait application; gear reinforcement, refinement, Masterwork preview/purchase/reset and imprint APIs.

- [x] Write resource, unlock, cap, corruption/migration, branch refund, Trial isolation, rarity/drop targeting, and all-48-god ordinary-source build tests; observe failures.
- [x] Formalize Reinforcement after first-act capstone; deterministic three-rank Masterwork, reset/refinement, Mythic/Godforged horizontal traits/imprints and salvage.
- [x] Preserve legacy Mirror ranks; implement Wayfinding, Artifice, Divine Accord finite option nodes and exact-cost branch-only refund.
- [x] Unify ordinary free modifier and Trial catalogs, show aggregate risk/reward preview, and connect modifier-weighted repeatable gear drops.
- [x] Publish and verify at least two distinct ordinary-source archetypes for each of the 48 eligible gods.

## Task 5: Reviewed deity asset production

**Files:** `assets/deities/`, `assets/manifest.json`, `js/asset-manifest.js`, portrait production records and review pages.

- [x] After roster review, produce two contrasting original stills and a reviewable motion pilot at real card/Codex sizes.
- [x] Compare shipped poster size and decoded memory with the six-frame sprite-loop footprint; record the runtime-motion decision and limitations.
- [x] Produce the remaining original portraits in themed batches; inspect every still and final poster treatment.
- [x] Integrate 53 portrait/poster mappings, dual-god boon compositions, visible-only animation, reduced-motion/HUD static posters, and explicit missing-art state.
- [x] Validate all real assets and offline entries.

## Task 6: Integration, review, and deliverables

**Files:** `tools/bundle.js`, verification scripts, `README.md`, `QUALITY-REPORT.md`.

- [x] Run relevant headless tests plus source/standalone browser checks and save migration/re-entry scenarios.
- [x] Build `katabasis.html` and verify no runtime network dependencies.
- [x] Request independent whole-change review against the acceptance criteria; fix material findings with regression tests.
- [x] Record completion evidence and actual limitations; mark goal complete only after required engineering and art work is finished.

## Execution Evidence

Baseline before edits: smoke suite passed; quality regressions 15/15; progression stress 15/15 including 65,536 Pact configurations and 192 campaign chambers; expansion catalog passed; build paths 7/7 passed.

Final evidence: world overhaul 17/17; world renderer contract passed; mythology 17/17 including all 53 master/poster pairs; endgame 19/19 including 96 ordinary god routes; build paths 7/7; expansion catalog passed; asset loading 6/6; standalone audit found 0 external references and all 24 inline blocks parsed. The rebuilt 382,573,737-byte `katabasis.html` passed one offline Chromium run with zero requests/errors, 8,460 boons, and 600 simulated/drawn frames. `git diff --check` passed. Three repeated long-running stress reruns were stopped after they remained CPU-bound for more than 13 minutes; their completed passing runs are recorded above and in the earlier execution results. Final art audit confirms 53 high-resolution PNG masters, 53 reviewed 320×400 WebP posters, 53 production records, and zero atlas compatibility crops.

Limitations: poster motion is the selected CSS runtime treatment; no alternate painted sprite-loop frames were authored, and the six-frame comparison records exact decoded-memory footprint rather than hypothetical compressed sprite size. The offline bundle includes the game's other art and is about 365 MiB. The build inventory still reports 3 complete animated libraries out of 276 registered enemy visual libraries; this overhaul does not complete missing enemy animation libraries.
