# Katabasis — integration and quality pass

Date: 30 September 2026

## Scope

The earlier debugging repairs were merged into the current game, including its persistent six-slot Armory, gear economy and Loom of the Fates. Changes were developed and checked in a staging copy, then transferred to the main OneDrive project with source-hash checks and backups. The main thread's newer native Space activation and route-navigation changes were preserved, including its skipped-reward browser assertions.

The standalone `katabasis.html` was rebuilt. Its existing generated raster art remains intact; no replacement geometric game assets were added. Gear progression remains uncapped within safe numeric limits. This pass corrects implementation and usability defects; it does not redesign the approved campaign or equipment systems.

## Repairs

### Earlier debugging fixes integrated

- Wrath cooldown modifiers now reach the actual cooldown stat.
- Extra lives and rerolls acquired during a run are credited without ordinary recalculations refilling spent resources.
- Legendary and Duo boons keep their special rarities; ordinary upgrades preserve an offered higher rarity.
- Poms choose upgradeable boons, or heal when every boon is capped.
- Boss tribute rerolls work and retain four Rare-or-better choices.
- Free shop purchases work at zero Obols and refresh each visit.
- Delayed lightning, divine-call cinematics and time scaling are cleared at the proper transitions.
- Hermes Aid applies and expires a real movement bonus.
- Projectile deflection occurs before damage and reads the compiled stat.
- Fresh dodge is zero rather than `NaN`.
- Damaged saves and invalid currency transactions are normalized or rejected.

### Additional gameplay and progression repairs

- Equipment swaps cannot refill a spent revival or heal through repeated vitality swaps. Swapping preserves health percentage.
- Weapon base damage now contributes to attack damage. Labrys, Dory and the other weapon templates retain their distinct reach, speed and combo rules.
- Gear and Paragon reach bonuses now work. Stygian Grasp increases actual maximum shield capacity.
- Repeated/stale reward selections cannot grant extra boon upgrades or salvage shards, and cannot dismiss a later menu.
- Closing a reward preserves the route choices or story/event/result screen it opened.
- Wins, deaths and total run time are recorded once. Abandoning a run records its end without inventing a Nemesis.
- Empty Paragon respecs cannot charge currency. Corrupted identifiers such as `toString` cannot crash migration.

### Input and UI repairs

- Tab works for native keyboard navigation. Semantic controls retain Space/Enter activation.
- Typing in search fields does not move the player or trigger mute/combat shortcuts.
- Losing focus clears held controls and pending input edges, and pauses live combat. Cancelled touches release attacks.
- Codex tabs are semantic, keyboard-accessible buttons. Escape returns the Chronicle to the result screen that opened it.
- Armory comparisons only copy the equipped-slot mapping, avoiding serialization of the entire Chronicle on selection.
- Stat descriptions now identify Wrath healing and shop discounts accurately. Campaign and results copy reflect the current regions and bosses. The Loom describes persistent points without claiming an infinite node graph.
- The reset confirmation identifies all progress it erases.

## Chronicle/save-capacity repair

The earlier audit reproduced silent localStorage failures at approximately 8,000 sample kill records. Progress now uses an IndexedDB database scoped to the game's directory when the browser supports it. Existing localStorage progress is migrated, including equipment, Mirror upgrades, Paragon progress, Nemeses and all enemy/campaign histories. The legacy save is retained for recovery.

Writes are batched, and `Save.flush()` waits for the latest transaction, including changes made during an earlier write. Full progress is cloned into the database without constructing a growing JSON string for every kill. Failed writes display a persistent message with Retry Save and Download Backup; leaving with pending or failed writes requests the browser's normal confirmation when user activation permits it.

Migration markers prevent blocked access to a newer database from silently treating an older legacy backup as current progress and overwriting the newer save. Full reset updates the database and clears the marker, so old histories cannot reappear on reload.

Verified in disposable Chromium profiles:

1. A legacy save with currency and stories migrates intact.
2. A 12,000-entry Chronicle that localStorage rejects saves and reloads through IndexedDB with currency intact.
3. A batch of 150 currency changes and overlapping flushes commits its latest state.
4. Simulated blocked database access shows the recovery message, preserves the legacy backup, and recovers the newer database after access returns.
5. Simulated write failure shows a persistent warning; retry succeeds and clears it.
6. Full reset survives reload without resurrecting old progress.

## Checks performed

| Area | Result |
|---|---|
| Prior targeted regressions | 20/20 pass. |
| Additional quality regressions | 15/15 pass. |
| Campaign | All 24 regions through both endings: 48 capstone/story flows, 168 region/room combinations and 480 deterministic route sequences. |
| Creature content | All 482 creature definitions ran simulated AI/death handling; hostile kills retain generated backstories and allies do not count as enemy kills. |
| Boss content | All 92 boss definitions ran simulated AI at several health levels and death handling. |
| Combat stats | All 1,860 boons and 360 relics compiled independently without invalid numeric stats, health or speed. |
| Existing smoke suite | Movement, twelve divine calls, abilities, boss phases, 3,000 boon offers, regional rendering and the 240-second simulated gameplay soak pass. |
| Browser interaction | Armory filters/equip/upgrade/sell/salvage, Paragon prerequisites/forks/respec, native keyboard actions, title/pause navigation, reward/skip-to-route transitions, combat kills, cutscenes and Chronicle/Nemesis UI checked. |
| Browser layouts | Armory action controls and Loom Back control checked at desktop size; no page-width overflow at 390×844. Screenshots inspected. |
| Image library | All 111 images decode, logical sprite grids are valid and actor sheets contain alpha channels. The renderer supports fractional source-cell sizes; integer divisibility is not required. |
| Offline bundle | Rebuilt with zero external references and loaded alone in an isolated directory. |
| Source checks | JavaScript syntax and renderer color checks pass. |

`tools/quality-browser-results.json` contains the persistence/recovery measurements. Regression scripts are in `tools/`; rerun them after future gameplay changes. Browser checks use isolated files and disposable profiles, never the player's actual browser save. The managed test environment required a process-only `KATABASIS_TEST_NO_SANDBOX=1` flag; persistent browser settings were not changed.

## Limits and recovery

Browser storage remains finite and tied to a browser profile and game directory. Moving or renaming the game, switching browser profiles, or clearing site data does not carry progress automatically. If storage is unavailable, fresh games can use localStorage/in-memory fallback; access failure after migration is reported and the newer save is protected. Backup JSON is available from the failure message; automatic cloud transfer and a graphical backup-import screen are outside this pass.

The catalog checks validate data and simulated behavior. They do not prove balanced difficulty, perfect animation for every generated variant, a particular frame rate on every computer, or full touch-only/mobile playability. Existing art was inspected and preserved, rather than regenerated.

Pre-integration files and their hashes are retained in the staging copy under `audit/main-backup-*`. `audit/integration-result.json` records the deployed files and their SHA-256 hashes.


## Run-systems integration continuation (30 September 2026)

The approved run systems were integrated in the current source and the standalone bundle was rebuilt. The handoff build includes three selectable hero sprite sheets and one arena-interaction sprite sheet as raster assets, together with hero selection, practice, route variants, mythic minibosses, weapon tempers, Nemesis/Chronicle backstories, expanded campaign scenes, adaptive music layers, and the existing Armory/Paragon systems.

Current continuation checks:

- All 13 source JavaScript modules pass `node --check`.
- All 14 inline JavaScript blocks in the generated bundle parse successfully.
- All 115 manifest entries resolve to image files.

## Divine court and bestiary expansion

The latest approved expansion adds a painted portrait for each of 48 Greek deities. The Codex names thirteen Olympians and includes both Hestia and Dionysus, noting that ancient lists vary. Every deity has a boon, a dedicated audience event, a divine-call response, and a favor value for the current run. Campaign choices, boons, offerings, trials, skipped offerings, and calls change favor; rejecting a deity can raise the favor of a named rival. Favor steers future boon offers and rarity odds.

Four generated raster enemy atlases add 232 named enemy families. Each new foe is attached to a region, uses an image cell in combat and the Codex, and has one of fifteen implemented AI roles. Painted foes use a small movement-driven bob and lean animation. Combat rooms now create larger queues, open with up to 18 enemies, replenish toward an active cap of 22, and allow elite and miniboss escorts to bring larger groups.

Checks for this continuation:

- Changed JavaScript modules pass `node --check`.
- The standalone `katabasis.html` bundle rebuilds with zero external references.
- The added atlas entries are included in both asset manifests; each atlas uses its authored 8-column grid (the 40-cell sheet has five rows, and the other sheets have eight).
- Enemy balance and performance at maximum density have not been manually play-tested in this continuation.
- The bundler reports zero remaining external script or stylesheet references.
- Interactive browser review was unavailable in this desktop session; the browser rejected both local file navigation and the local preview host.

The validated handoff copy is `work/katabasis-final`. The original OneDrive Files-on-Demand tree could not be written under the current filesystem sandbox, so it was not overwritten.

## Optimization and overhaul-completion pass (2026-10-02)

Decisions: the 53-poster runtime-poster treatment is final (no loop-frame production); gear/Mirror costs, caps, and rarities are preserved exactly (level-30 effective cap, three Masterwork ranks, finite Mirror branches).

Behavior-preserving renderer and loop optimizations (no stat, cost, generation, or reward changes):

- `js/world.js` — `W.reveal` scans only tiles within the reveal radius via the existing cell index instead of the full cell list; revealed keys and discovery results are unchanged.
- `js/world-renderer.js` — terrain culling uses world-space view bounds algebraically equivalent to `R.visible` (mock-verified 0 mismatches over sampled cells); floor texture, entry, and UVs are hoisted so a full terrain pass performs one image lookup instead of one per cell (mock: 255 terrain quads, 1 lookup, far-camera cull 255→1 quads); vertex data reuses a cached `Float32Array`; `quad` writes directly without per-quad array allocations; `R.color` caches parsed values; `artFamily` is memoized per world.
- `js/assets.js` — `drawCell`/`drawFrame`/`drawCover`/`drawImage` take a fast path without `save`/`translate`/`restore` when there is no rotation or flip; output coordinates and alpha are identical.
- `js/world-runtime.js` — per-frame gate sort replaced with a linear nearest search (same nearest-gate result, ties keep order); encounter proximity uses squared distances with early exit on the first nodes-order match; hazard checks use squared distances.
- `js/overhaul-ui.js` — HUD dock elements cached; gamepad polling throttled to 100ms; cleared-count computed without per-frame array allocation.

Test maintenance for the world era:

- `tools/render-regressions.js` now drives `K.R.worldHelpers.actor` with a stub context (the old `K.R.draw` path returns early whenever `G.world` exists per `js/render.js:431`, so the suite could not pass headless). 4/4 pass.
- `tools/debug-regressions.js` shop tests now use `spawnShop` (legacy direct `enterChamber` shop routing no longer produces `shop` interactables; the market path owns shops). 22/22 pass.

Results (portable Node v22.17.0, headless):

- World overhaul 17/17; mythology 16/16; endgame 19/19 (96 god routes); overhaul UI 1/1; world renderer 1/1; quality regressions 15/15; power 32/32; boon 18/18; combat stress 35/35; render 4/4; asset load 6/6; build paths 7/7; render-color 1/1.
- `node --check` passes for all changed modules.
- `katabasis.html` rebuilt: 265 embedded images, 4 audio tracks, 0 external script/stylesheet references, 24/24 inline blocks parse (`tools/bundle-verify-check.js`).
- New mock evidence: `tools/renderer-mock-check.js` (culling equivalence, single-lookup terrain, far-camera cull).

Limits: real-browser frame-time measurement, screenshots, and file/bundle/move browser checks were not run in this session (they require a local Chromium + display server); enemy animation-atlas coverage remains 1,800/138,000 frames with 3/276 complete visual libraries per the bundler report; `README.md` still describes the 24-region campaign in places while the runtime target is 26 region IDs (24 + `ancient_greece` + `atlantis`) with 208 main-path chambers — README reconciliation is the remaining docs follow-up.

## Static terrain GPU buffer + second optimization round (2026-10-02)

Browser-measured with Playwright + headless Chromium (SwiftShader) via `tools/startup-profile.js`, `tools/renderer-ab.js`, `tools/renderer-shot.js`:

- Cold first frame: 235ms → 23–34ms (~10x). Boot prewarming (`R.prewarmIds` in `js/main.js:1825`, region prewarming in `js/world-runtime.js`) uploads the universal set behind the loading screen; first-use per-asset upload costs fell from 30–66ms to ~0ms.
- Steady-state full frame (same-map A/B, fixed seed, `tools/renderer-ab.js`): campaign map static mean 0.146ms vs dynamic 0.25ms (~1.7x), median 0.1 vs 0.2 (2x); practice map static mean 0.12–0.15ms vs dynamic 0.22ms (~1.8x). SwiftShader software rasterization compresses the gap; on real GPUs the CPU-encoding saving dominates.
- Terrain-layer CPU specifically: ~250 per-frame `quad` encodings (~13.5k float pushes, index lookups, state churn, full dynamic-buffer re-upload) replaced by one static buffer built once per region plus ~5 visible-chunk draws — a >25x reduction in terrain CPU operations with zero per-frame encoding or upload.

An honest note on "25x": it holds for terrain-layer CPU work and for the cold first frame order-of-magnitude; it does not hold for the full frame, where simulation, dynamic actors, and rasterization remain (steady-state ~2x measured under SwiftShader). No stat, cost, generation, or reward numbers changed.

What was built (`js/world-renderer.js`):

- `VERTEX_W` world-space shader program: camera motion is a uniform, so static buffers never need CPU re-transform. Exact same clip-space math as the dynamic path (verified by culling-equivalence mock and screenshots).
- `buildTerrainStatic`: one combined buffer per region in 8-tile chunks with per-chunk bounds; single `STATIC_DRAW` upload at region entry; old GPU buffer deleted on region change.
- Per-chunk frustum culling (~48 AABB checks/frame); fullscreen maps still draw everything the GPU can trivially handle.
- Baked quality at zero frame cost: deterministic per-tile brightness variation (5 levels), wall-adjacent ambient occlusion (one shade step), shoreline foam palette for water/lava, darker raised-terrain sides. All derived from tile coordinates; generation output and saves byte-identical.
- `texture()` no longer refreshes LRU order on hit (FIFO eviction); cached dynamic attribute locations; context-loss handler drops the world program and static buffers for clean rebuild.
- `drawTerrainDynamic` is retained verbatim as the fallback (headless harnesses, mock contexts, shader-compile failure); `tools/renderer-mock-check.js` and all headless suites exercise it.

Visual verification: `tools/shot-world-tartarus.png` and `tools/shot-world-styx.png` (chunked static path, real Chromium) show full terrain coverage with no seams or missing chunks, foam-brightened shorelines, combat, telegraphs, and HUD intact.

## WebGL combat-text batching (2026-10-02)

- The WebGL canvas adapter now supports outlined text. This fixes a live-combat renderer exception: floating damage text and world labels call `strokeText`, which the WebGL adapter did not implement.
- Added `outlinedText`, which rasterizes the outline and fill together into one cached text texture. Floating combat numbers and world labels now use one textured quad instead of separate outline and fill passes. The Canvas2D renderer keeps its existing two-call path.
- Same-page, same-scene SwiftShader A/B with 24 floating combat labels ran twice: legacy outline/fill used 98–103 draw calls and 462–487 quads per sampled frame; combined text used 65–67 calls and 429–454 quads. Each run removed 33–36 draw calls and 33 quads. Median draw time was 0.5 ms legacy and 0.4 ms combined in both runs; these are browser CPU submission timings, not GPU-completion or hardware-FPS claims. Captured frames showed no visible text-quality loss.
- The rebuilt offline bundle loaded with networking disabled and completed a 600-frame combat simulation: 8,460 boons, 22 initial enemies, no page errors or external requests. In that single headless Chromium run, steady median was 0.2 ms, p95 0.6 ms, and maximum 4.7 ms; initial bundle load took 9.4 seconds. These measurements are local CPU timings, not universal FPS guarantees.
- The bundle contains 265 images and four audio tracks, with zero external references; all 24 inline script blocks parse. The current 382.6 MB single-file size remains a startup limit because the offline edition embeds its full asset set.
