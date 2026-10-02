# Katabasis — Dense Descents, Run Leveling, and Regional Terrain Art

**Status:** Approved for implementation by user on 2026-10-02

**Date:** 2026-10-02

## Goal

Make every Greek campaign region a much larger, denser place to explore. Expand each generated map to about 25 times the current walkable area and about five times the main-route distance, while keeping the existing major encounter rhythm instead of multiplying required fights to fill space. Give every region drawn terrain and obstacle art placed over its floor. Replace boon drafts earned from clearing combat rooms with run XP awarded per defeated enemy; each run level-up becomes a three-choice boon draft.

The result should feel like a continuous, traversable mythic landscape with memorable regional silhouettes, tactical routes, and optional exploration. Long-term Paragon/Loom progress remains separate from temporary run levels.

## Approved direction

- **Map scale:** Target about 25× the v1 generator's walkable area and about 5× its main-route travel distance. Keep the existing eight major encounter beats as a pacing budget; use expanded space for explorable subzones, terrain, landmarks, and optional paths rather than 25× mandatory fights.
- **Boon progression:** Award XP per defeated enemy. Each run level-up pauses play and offers three boons; the player selects one. Encounter and region clears never directly offer a boon draft.
- **Terrain art:** Keep the floor as the base. Draw and place terrain overlays, obstacles, and landmarks on top of it. Art and collision must agree.
- **Region coverage:** Complete art coverage for all 26 playable Greek campaign regions. Also cover Charon's safe Market and the Training Grounds where they use the world renderer.
- **Art direction:** Use original painterly raster art consistent with Katabasis's current mythic style. Biome-family assets may be shared when they fit, but each region must have recognizable local details and at least one signature landmark.

## Current baseline

The current generator is version 1 and uses 80-world-unit terrain cells. A region is organized around eight main beat nodes, local encounter pockets, connecting corridors, and optional nodes. The renderer builds the walkable surface from the floor atlas, then draws props and actors. Several regions inherit their art through an `artFamily` alias, so art coverage must be checked by stable region ID as well as by shared art family.

Combat-room and boss-room exit flows currently create boon rewards after a clear. Separately, enemy kills award persistent Paragon XP. The new temporary run-level system must replace the former boon reward path while preserving the latter's persistent purpose and current save data.

## Design principles

- Terrain readability comes from drawn shapes and material transitions, not only colored floor-cell tinting.
- Navigation and collision remain deterministic simulation data; the renderer never decides whether a tile or prop blocks movement.
- Main-route progress stays legible across a large map. Optional exploration offers worthwhile detours without hiding required rewards or trapping the player.
- Enemy count and required combat do not increase simply because the map footprint grows.
- All generated map and asset choices use stable region identities and seeded randomness. Map generation does not consume combat RNG.
- Run levels reset on a new descent. They do not add permanent stats by themselves; the selected boon provides the gameplay effect.
- No new online dependency is introduced. All art remains inside the offline bundle.

## Map scale and density

### Size targets

Before replacing the v1 generator, record its walkable-cell count and shortest walkable entry-to-capstone route for integer seeds 0–31 with standard modifiers in every region. Generator v2 targets, per region, a median walkable area of 20–30× the v1 median (centered on 25×) and a median required route of 4–6× the v1 median (centered on 5×). Keep natural variation between seeds; these are aggregate targets, not identical map dimensions.

The current eight major beats remain the required route's encounter budget. Space between beats becomes traversable terrain divided into recognizable subzones. Add optional loops, shortcuts that reconnect to explored ground, reward sites, and optional combat pockets. Optional activity may add XP and resources, but the required route remains complete without clearing optional encounters.

### Topology and playability

- Keep a connected entry-to-capstone main route for every seed and region.
- Preserve the eight major campaign beats and their current campaign/story ordering.
- Give each region multiple subzones with different terrain silhouettes, ground transitions, and at least one visible landmark per subzone.
- Put encounters in deliberate clearings with enough safe movement space. Decorative density must not cover telegraphs or choke every route.
- Use optional branches for secrets, caches, characters, recovery, and optional fights. Required rewards stay on the main route.
- Allow backtracking through explored and cleared spaces. Close only the local space of an active encounter.
- Preserve fog-of-war/map reveal behavior and existing campaign exits.
- Version the generator when the v1 topology changes; the same seed, region, modifiers, and version must reproduce the same layout.

### Performance and rendering

Use spatially chunked terrain and art batches so off-screen map sections are not submitted for drawing. Keep the existing WebGL world renderer and 2D gameplay plane. Load the active region's required art from the local asset library and release or reuse resources on region transition. The enlarged maps must not require one unbounded draw list containing every region's geometry.

## Run XP and boon-level progression

### XP awards

Each eligible hostile awards run XP exactly once when defeated. Resolve a single reward rank per enemy using highest-rank-first precedence so a boss marked elite does not receive multiple awards:

| Enemy rank | Run XP |
| --- | ---: |
| Standard enemy | 10 |
| High-threat enemy | 20 |
| Elite | 50 |
| Miniboss | 100 |
| Region boss | 200 |

High-threat means an enemy with base `score >= 4` that does not have a higher explicit reward rank. Summons, friendly allies, practice enemies, and repeated phase visuals award no run XP. A summon that is a designed encounter objective may receive an explicit capped reward rank in region data; it cannot create an unlimited XP source. Optional encounters award XP by the same enemy rules.

### Level thresholds

Start every descent at run level 1 with 0 XP. The XP needed for the next level is:

`100 + 20 × (current level − 1)`

Thus level 2 requires 100 XP, level 3 requires 120 XP, level 4 requires 140 XP, and the requirement continues to rise by 20 XP per level. Preserve XP overflow. A kill that crosses more than one threshold queues one level-up draft per threshold; no XP or level-up is lost when the player defeats a boss, completes a region, or enters a story transition.

The initial tuning target is approximately two to three level-ups along a region's required route. Optional fights can provide additional XP. If full-run pacing misses that target materially, tune the XP table or threshold slope without moving boon drafts back to clear rewards.

### Level-up boon draft

Each reached level opens one three-choice boon draft, and the player selects exactly one offered boon. Use the existing boon pool, rarity rules, compatibility checks, and boon application code; this change does not create a new boon catalog or grant an automatic stat bonus for the level itself. Existing reroll effects may reroll the current level-up draft under their normal limits.

When XP is gained during combat, finish the current enemy-death/update operation, pause the simulation at a safe boundary, and show the draft. After selection, return the player to the same world position and encounter state. If multiple levels were gained, present the queued drafts sequentially while preserving the accumulated XP remainder.

### Clear rewards and persistent progression

- Remove boon drafts from ordinary combat, elite, challenge, risk, and boss clears. No other event may directly open a boon draft; all boon choices come from a run level-up.
- Keep non-boon rewards such as Obols, healing, relics, gear, augments, events, story, and campaign progression. Boss XP remains awarded on defeat; boss/capstone completion can still grant its existing non-boon reward and transition.
- Recast any risk node that currently promises a greater boon as a non-boon reward or a fight against stronger foes. Run XP remains awarded for eligible enemy defeats, not for clearing the node itself.
- Keep persistent Paragon/Loom XP separate and preserve its current kill-XP behavior and save fields. Run XP, current level, and queued level-up drafts reset when the descent ends.
- Apply the same run-level rules to ordinary descents and Fated Trials. Trial scoring and claimed rewards remain on their existing track; practice mode remains a no-XP sandbox.
- Show level, current XP, and XP needed for the next level in the in-run HUD; include final run level and XP in the run summary.

## Regional terrain and obstacle art

### Art kit coverage

Create an asset coverage manifest keyed by all 26 stable campaign region IDs: `tartarus`, `styx`, `acheron`, `asphodel`, `punishment`, `lethe_garden`, `elysium`, `mourning`, `forge`, `labyrinth`, `knossos`, `aegean`, `aeaea`, `colchis`, `gigantomachy`, `olympus_approach`, `olympus`, `typhon_core`, `delphi`, `pelion`, `arcadia`, `thebes`, `marathon`, `mycenae`, `ancient_greece`, and `atlantis`. Each region resolves to a biome-family kit plus region-specific detail; aliases must be explicit and visually appropriate. The family kits cover the current ash, river, grove, fields, lava, ruins, storm, and terraces profiles. Ancient Greece and Atlantis receive complete regional coverage rather than only backdrops. Charon's Market and Training Grounds receive art kits for their world profiles as well.

Each kit supplies:

- The existing floor/base material.
- Drawn terrain overlays and transitions, including walkable material changes, banks, cliff faces, raised ground, bridge/deck surfaces, and other profile-specific edges.
- Transparent obstacle and prop sprites for the solid, destructible, and interactive object types the generator can place.
- At least one signature landmark composition per region, with local material/color treatment that distinguishes regions sharing a biome family.
- Matching contact shadows, scale/depth cues, and any visual state needed for broken, active, or inactive objects.

Every generator terrain or obstacle kind must resolve to a drawn asset in the manifest. A missing asset is a content-coverage failure, not permission to show an unrelated placeholder or flat-color obstacle. Reuse modular pieces across a family where appropriate, while retaining enough local variants to avoid making distinct regions look identical.

### Placement and draw order

Render the base floor first, then terrain overlays and boundaries, shadows, solid obstacles/landmarks, actors sorted by world depth, foreground/canopy art, and combat effects. Keep art selection separate from collision: a placed object record includes a stable art key, transform/scale, world-depth anchor, and explicit collider/material/interaction data.

The placement pass must:

- Keep the required route and encounter clearings walkable.
- Avoid overlapping player/enemy spawn points, exits, reward sites, and critical telegraphs.
- Place blocking collision within the visible footprint of a solid object; nonblocking decorative art has no invisible collider.
- Use bridge, cliff, wall, water, lava, and raised-ground art that communicates its actual traversal rule.
- Reveal and cull art with the same world visibility and viewport rules used for map geometry.

### Production sequence

Build the art system and asset manifest, then produce two contrasting pilot kits to validate tile seams, obstacle silhouettes, camera scale, collision alignment, and draw ordering. Continue production across every region ID after the art treatment is established; the pilot is a workflow check and does not reduce the requested all-region scope. Package all art locally for browser, desktop, and standalone builds.

## Compatibility and migration

- Preserve all existing region IDs, campaign links, story milestones, save data, and non-boon rewards.
- Keep the map seed independent from combat RNG and store the generator version on the run.
- Run level, XP, and queued boon drafts are transient run state; do not convert persistent Paragon XP or existing save resources into run XP.
- Preserve offline and desktop packaging. No remote image requests or runtime art generation are permitted.

## Acceptance criteria

1. Every campaign region generates connected, seed-repeatable geometry and a capstone that is reachable through the required route.
2. Across seeds 0–31 per region with standard modifiers, v2 median walkable area is 20–30× and median required route distance is 4–6× the recorded v1 baseline.
3. Required campaign progression retains eight major beats per region; added space does not require 25× the combat count.
4. Optional exploration is traversable and does not hide required rewards or make completion depend on optional fights.
5. Standard, high-threat, elite, miniboss, and boss kills award 10, 20, 50, 100, and 200 run XP respectively, exactly once; summons/allies/practice do not create repeatable XP.
6. Run level thresholds follow `100 + 20 × (level − 1)`, retain overflow, and queue multiple level-up drafts without losing XP.
7. Each run level-up opens a three-choice boon draft, selects one boon, and returns to the same combat/world state. Persistent Paragon XP remains independent.
8. Combat, elite, challenge, risk, and boss clears never directly open a boon draft. Existing non-boon rewards and campaign transitions remain available.
9. All 26 campaign regions, Charon's Market, and Training Grounds map to complete terrain/obstacle art coverage. Every generated solid or interactive terrain kind has a drawn asset and matching collider/interaction data.
10. Terrain and prop layers render over floor art in correct depth order without obscuring combat telegraphs or required navigation.
11. All required art and renderer data work offline in the standalone build; asset coverage does not depend on network access.

## Risks and mitigations

- **Large maps may still feel empty:** fill subzones with placed, region-authored terrain art and landmarks, and use optional points of interest rather than empty scale padding.
- **Longer travel can dilute combat:** preserve major beat count, shorten route confusion with visible landmarks/map discovery, and keep combat focused in clear encounter pockets.
- **Level-ups may interrupt combat unpredictably:** queue drafts after a safe simulation boundary; preserve exact position and pending threshold state.
- **XP may be farmed:** exclude summons/allies/practice and award each enemy once; require explicit capped rewards for any summon that is a designed objective.
- **Art may not match collision:** store collision independently but validate it against each visible asset footprint and ground anchor.
- **Shared family art may blur regional identity:** require region-specific details and a signature landmark for every region ID.
- **Asset volume may strain startup and bundle size:** reuse family kits, cull off-screen art, load local active-region resources, and measure the standalone bundle impact during implementation.
