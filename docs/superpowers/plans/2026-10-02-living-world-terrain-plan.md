# Living-World Terrain Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn all 26 campaign regions and both auxiliary world profiles into recognizable, traversable landscapes whose terrain art, movement rules, cover, and environmental forces share one seeded source.

**Architecture:** Extend the existing seeded `K.World` map rather than replacing it. Add authored region terrain programs and generated landform features, expose surface and occlusion queries to runtime, then render the same features through the existing culled WebGL terrain/prop passes using original family art atlases.

**Tech Stack:** Offline JavaScript, existing `K.World` generator and WebGL renderer, original raster atlases, Node regression harness, existing standalone bundler and Electron portable build.

**Spec:** `docs/superpowers/specs/2026-10-02-living-world-terrain-ambience-design.md`

## Global Constraints

- The presentation remains painterly 2.5D and does not become free-camera 3D or a platformer.
- Region topology, terrain, and decoration use isolated deterministic streams and never consume combat RNG.
- The same terrain data drives walkability, collision, projectile occlusion, cover, hazards, and rendering.
- Required encounter beats and existing campaign routes remain unchanged; terrain must not trap the player.
- All image assets are original, local, and included in the offline `katabasis.html` bundle.
- `index.html` remains the development/test entry; regenerate the production game from source into `katabasis.html`.

## Review Focus

- Seeded topography changes must preserve all required graph routes and entry/encounter clearance — pin in Task 1 generation and connectivity assertions.
- A ledge or liquid edge must not become walkable merely because its art looks traversable — pin in Task 2 movement-rule assertions.
- Long dashes and enemy motion must obey the same transitions as ordinary player motion — pin in Task 2 runtime collision assertions.
- Blockers and elevation must occlude only the relevant projectile path and never hide encounter telegraphs — pin in Task 2 visibility and Task 3 render assertions.
- Dense props and large terrain chunks must remain culled and bounded by the visible region — pin in Task 3 renderer assertions and inspect the two-region visual capture.

---

### Task 1: Region terrain programs and deterministic landforms

**Files:**
- Modify: `js/world.js`
- Modify: `tools/world-overhaul.test.js`

**Interfaces:**
- Consumes: the current `K.World.PROFILES`, `K.RNG`, `W.generate(options)`, and `W.validate(map)` interfaces.
- Produces: each profile has `terrain` metadata (`programId`, `shape`, `surface`, `accent`) and an `ambience` record (`bed`, `weather`, `motif`, `palette`, `accentHz`, `particleKind`); each map has serializable `terrainFeatures`, each with `id`, `kind`, `shape`, `x`, `y`, `w`, `h`, `elevation`, `material`, `surface`, `walkable`, and optional `transition: { kind, fromElevation, toElevation }`. `elevation` is in world units, with a maximum adjacent walkable step of 16; ramps and stairs encode explicit transition cells.

- [ ] Add failing assertions that all 26 campaign profiles plus Market and Practice have terrain/ambience metadata, generated feature layouts differ by region, repeat exactly for the same seed, and leave combat RNG untouched.
- [ ] Run `node tools/world-overhaul.test.js "Every region owns a distinct terrain"`; confirm the new assertion fails because profiles and terrain features are missing.
- [ ] Bump `K.World.VERSION` to `3` for the serializable terrain profile/feature schema.
- [ ] Implement a stable 28-profile catalog and an isolated `terrainRng` composition pass in `js/world.js`; generate substantial shelves, ridges, basins, channels, ruins, banks, and landmark clearings appropriate to each profile's family.
- [ ] Add route-preserving feature placement to `W.validate(map)`: every required node and entry remains connected with encounter clearance, and each campaign region contains at least one real traversal feature.
- [ ] Run `node tools/world-overhaul.test.js "Every region owns a distinct terrain"` and `node tools/world-overhaul.test.js "Market is a safe connected"`; confirm 1/1 passes for each.
- [ ] Commit as `feat: generate regional landform terrain`.

### Task 2: Shared surface, traversal, and combat queries

**Files:**
- Modify: `js/world.js`
- Modify: `js/world-runtime.js`
- Modify: `js/entities.js`
- Modify: `tools/world-overhaul.test.js`

**Interfaces:**
- Consumes: Task 1's `map.terrainFeatures` and terrain metadata.
- Produces: `K.World.surfaceAt(map, x, y) -> { material, surface, elevation, flowX, flowY, coverHeight }`; `K.World.lineOfSight(map, from, to, projectileHeight) -> boolean`; movement and projectiles query those functions and the existing blocker index.

- [x] Add failing tests for a non-traversable cliff/water edge, a traversable ramp/bridge, deterministic current force applied to both player and enemy, and projectile occlusion by raised cover.
- [x] Run `node tools/world-overhaul.test.js`; confirm each case fails on absent surface/visibility behavior.
- [x] Implement bounded transitions in `W.isWalkable`/`W.resolveMove`, surface sampling, cover ray checks, and force application in the existing movement/runtime hooks; reserve a stable main route and keep force magnitudes capped.
- [x] Make enemy and player collision use the same world queries; make projectile path checks sample the same cells and blockers.
- [x] Run the focused movement, projectile, and environment cases from `tools/world-overhaul.test.js`; confirm each named case passes.
- [x] Commit as `feat: make terrain affect traversal and combat`.

### Task 3: Terrain art atlas and painterly map composition

**Files:**
- Create: `assets/regions/generated/living-terrain-<family>.png` for each of the eight terrain families.
- Create: `assets/regions/generated/living-terrain-provenance.md`
- Modify: `js/asset-manifest.js`
- Modify: `js/world.js`
- Modify: `js/world-renderer.js`
- Modify: `tools/world-renderer.test.js`
- Modify: `tools/world-overhaul.test.js`

**Interfaces:**
- Consumes: Task 1's features and Task 2's terrain semantics.
- Produces: `regionterrain.<family>` 4x4 atlas entries and `K.WorldRenderer.terrainDrawList(world, view) -> feature[]`; the renderer draws terrain silhouettes, banks, cliff faces, bridges, stairs, and grounded debris from `map.terrainFeatures`, then sorts raised props/actors by depth and retains existing chunk culling.

- [ ] Add failing renderer assertions that terrain feature kinds resolve to the family atlas, feature elevations project consistently, and offscreen features are omitted.
- [ ] Run `node tools/world-renderer.test.js`; confirm the missing atlas/feature draw assertions fail.
- [ ] Generate eight original 4x4 raster terrain atlases, one per existing family, with consistent hand-painted 2.5D Greek-myth lighting; keep cells isolated for atlas slicing and preserve the final prompts and origin in `assets/regions/generated/living-terrain-provenance.md`.
- [ ] Register atlas metadata and draw collision-aligned features in the ground/edge/depth passes without replacing the existing floor or signature-landmark layers.
- [ ] Run `node tools/world-renderer.test.js` and the focused terrain/feature cases from `tools/world-overhaul.test.js`; confirm atlas mapping, projection/culling, and feature coverage pass.
- [ ] Render and inspect Tartarus and Aegean captures at the gameplay camera scale; correct any terrain art that obscures walkable paths, combat actors, or hazard telegraphs.
- [ ] Commit as `feat: paint regional terrain layers`.

