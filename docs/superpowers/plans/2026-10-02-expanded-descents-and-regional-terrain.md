# Expanded Descents and Regional Terrain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand every playable Greek region into a larger, denser, readable landscape with drawn terrain and obstacles layered over the floor, while keeping the eight major encounter beats and their campaign order.

**Architecture:** Keep `K.World` as the seeded simulation-data owner, `K.WorldRuntime` as the bridge to movement and encounters, and `K.WorldRenderer` as the presentation layer. Add a versioned v2 topology, explicit collision-bearing prop/terrain records, region-keyed art coverage, and spatially culled render batches. Keep region IDs, routing, campaign rewards, and combat RNG stable.

**Tech Stack:** Browser JavaScript IIFEs, existing WebGL world renderer, local raster/WebP art atlases, `assets/manifest.json`, and the existing offline single-file bundler.

**Spec:** [2026-10-02-dense-descents-leveling-and-terrain-art-design.md](../specs/2026-10-02-dense-descents-leveling-and-terrain-art-design.md)

## Global Constraints

- Preserve all 26 stable campaign region IDs, the eight required encounter beats per region, campaign/story links, exits, safe Market, and Training Grounds.
- Generator v2 uses seeded world-only randomness and records its version on both the generated map and current run. It must not consume combat RNG.
- Target aggregate v2 medians of 20–30× v1 walkable area and 4–6× v1 required-route distance for seeds 0–31, without scaling required combat count.
- Keep map geometry, collision, encounter rules, and art selection as separate data. A visible solid object has matching explicit collision; decoration has no hidden collider.
- Keep rendering and all generated assets offline. Reuse family kits where appropriate, with regional details and a signature landmark for every region ID.
- Do not add or run tests under the current session instruction. Keep existing unrelated working-tree changes untouched.

## Review Focus

- **Topology and deterministic input:** generator version, region ID, seed, and modifiers fully determine layout; the v1 generator remains reproducible through its recorded baseline/version path.
- **Connectivity and encounter clearance:** required route, branches, exits, spawns, reward sites, and major telegraphs retain navigable space; obstacles cannot isolate required objectives.
- **Art coverage:** every cell material, obstacle, and interactive prop kind resolves through an explicit manifest entry for each region, including the Market and Training Grounds.
- **Collision alignment:** each blocking footprint fits inside the drawn solid silhouette; nonblocking art has no blocker; bridges, cliffs, water, and lava depict their actual movement rules.
- **Large-map cost:** floor and prop batches are chunked and viewport-culled; region transitions reuse or release local textures.

## File Map

- `js/world.js` owns `W.VERSION`, region profiles, seeded `W.generate(options)`, collision, and map topology.
- `js/world-runtime.js` owns region activation, player movement, encounter bounds, and world transitions.
- `js/world-renderer.js` owns floor/terrain/prop drawing, visibility, chunk batches, depth ordering, and texture prewarming.
- `js/overhaul-ui.js` and `js/main.js` own explored-map presentation and world-facing labels.
- `js/assets.js`, `assets/manifest.json`, `js/asset-manifest.js`, and `assets/regions/` own local art lookup and packaging metadata.
- `tools/bundle.js` embeds the local asset manifest and media into the standalone build; `README.md` describes the expanded regions.

---

## Task 1: Define generator v2 topology and per-region subzones

**Files:** `js/world.js`

- [ ] **Record the v1 baseline and declare generator version 2.** Before changing topology, record v1 walkable-cell counts and shortest walkable entry-to-capstone route distances for seeds 0–31 in every region in a versioned baseline fixture. Keep a v1 code path or fixture so the approved ratios compare against the original generator. New descent runs use v2 and store `worldGeneratorVersion`.
- [ ] **Add profile-authored subzone and material data.** Give each campaign region multiple recognizable subzones, terrain transition kinds, region-local landmarks, traversal rules, and appropriate obstacle pools. Retain biome families for reuse, but ensure aliases remain explicit by stable region ID.
- [ ] **Expand the walkable footprint and route geometry.** Reshape the spaces between the same eight main nodes to target the approved scale; add connected open terrain pockets, optional loops, reconnecting shortcuts, and side points of interest. Keep optional combat optional and preserve campaign/story ordering.
- [ ] **Keep generation deterministic and connected.** Use only the generator's region/seed/version/modifier-keyed RNG. Preserve the existing entry-to-capstone path and backtracking; keep optional branches reconnectable and exits reachable.
- [ ] **Keep combat pockets and hazard rules legible.** Preserve deliberate clearings and spawn/reward/telegraph space. Place hazards and traversal boundaries away from required objective clearances.

## Task 2: Add art-authored terrain and collision-bearing obstacles

**Files:** `js/world.js`, `js/world-runtime.js`

- [ ] **Create stable placed-object records.** Extend generated maps with terrain-overlay and prop/landmark records containing stable art key, transform, scale, world-depth anchor, visual state, explicit collision/material data, and interaction data where needed.
- [ ] **Place obstacles by deterministic profile rules.** Populate subzones with walkable transitions, boundary art, solid obstacles, destructible props, and interactive scenery. Ensure the required route, encounter clearings, spawn points, rewards, exits, and telegraphs remain clear.
- [ ] **Apply collider geometry at the simulation boundary.** Feed solid footprints into `W.isWalkable`/`W.resolveMove`; keep decorative records nonblocking. Make bridges and other traversal surfaces agree with cell walkability and boundary rules.
- [ ] **Make exploration and encounter movement share world geometry.** Preserve local encounter bounds while allowing backtracking through explored and cleared terrain; active encounters close only their local pocket.

## Task 3: Establish the art manifest and two contrasting pilot kits

**Files:** `assets/region-art-manifest.json` (new), `assets/manifest.json`, `js/asset-manifest.js`, `assets/regions/`, `js/assets.js`

- [ ] **Define explicit coverage by stable world ID.** Map `tartarus`, `styx`, `acheron`, `asphodel`, `punishment`, `lethe_garden`, `elysium`, `mourning`, `forge`, `labyrinth`, `knossos`, `aegean`, `aeaea`, `colchis`, `gigantomachy`, `olympus_approach`, `olympus`, `typhon_core`, `delphi`, `pelion`, `arcadia`, `thebes`, `marathon`, `mycenae`, `ancient_greece`, `atlantis`, `charon_market`, and `practice` to a family kit plus local variants and a signature landmark.
- [ ] **Author two opposing pilot kits first.** Produce original painterly raster art for Tartarus (ash/stone) and Atlantis (flooded marble/river): floor atlas, terrain transitions/edges, transparent obstacle atlas with contact shadows, and a recognizable landmark composition. Use these pilots to settle tile scale, atlas conventions, collision footprint, and draw order before completing the remaining coverage.
- [ ] **Keep art drawable by the current asset APIs.** Use local atlas metadata supported by `K.Assets`; add explicit asset IDs for materials, transitions, props, obstacle states, and landmarks. No placeholder color or unrelated family asset can silently satisfy a missing required key.
- [ ] **Package generated media locally.** Update canonical asset metadata and the runtime manifest in the repository's existing format; retain offline and standalone resolution.

## Task 4: Complete original art coverage for every region

**Files:** `assets/regions/`, `assets/region-art-manifest.json`, `assets/manifest.json`, `js/asset-manifest.js`

- [ ] **Complete family kits for ash, river, grove, fields, lava, ruins, storm, and terraces.** Each kit includes its floor material, drawn terrain transitions and boundaries, and transparent obstacle/prop set for all kinds the generator can place.
- [ ] **Add local details and a signature landmark for all 26 campaign IDs.** Family sharing is allowed for reusable floor/prop pieces, but every stable region ID receives identifiable local treatment and at least one distinct landmark composition. Ancient Greece and Atlantis get full playable-world coverage.
- [ ] **Add safe-world coverage.** Give Charon's Market and the Training Grounds suitable terrain, obstacles, and landmark assets for their world profiles.
- [ ] **Resolve every generated key explicitly.** Keep generator kinds and region-art-manifest entries in sync; include broken/active/inactive visual states for destructible or interactive objects and matching shadows/depth cues.

## Task 5: Render large worlds in layers and cull by spatial chunk

**Files:** `js/world-renderer.js`, `js/assets.js`, `js/world-runtime.js`

- [ ] **Render the world in the specified order.** Draw floor first, then terrain overlays and boundaries, contact shadows, depth-sorted obstacles/landmarks and actors, foreground/canopy layers, then combat effects. Keep telegraphs readable over scenery.
- [ ] **Chunk terrain and placed art.** Build spatial batches keyed to map chunks and submit only chunks intersecting the camera viewport. Avoid scanning or submitting one unbounded full-world prop draw list per frame.
- [ ] **Keep object culling and fog consistent.** Apply explored visibility and viewport culling to terrain art, props, and landmarks using the same world bounds/reveal rules as geometry.
- [ ] **Load and release active-region art.** Prewarm the current region's floor, overlay, prop, and landmark assets on transition; reuse family textures where possible and release stale resources as appropriate.

## Task 6: Carry world-map presentation and offline delivery through

**Files:** `js/overhaul-ui.js`, `js/main.js`, `README.md`, `tools/bundle.js` only if the existing asset packaging path requires a change; generated `katabasis.html`

- [ ] **Keep the discovered map legible at the new scale.** Adapt map framing/zoom and route/landmark cues to the expanded footprint while preserving fog-of-war and discovered-only destination behavior.
- [ ] **Describe the revised world scale and exploration loop.** Update player-facing documentation for larger landscapes, optional exploration, drawn terrain, and the unchanged major-beat budget.
- [ ] **Regenerate the standalone edition.** Use the existing bundler after the code and local art are complete; all art remains embedded or locally resolvable without network requests.

