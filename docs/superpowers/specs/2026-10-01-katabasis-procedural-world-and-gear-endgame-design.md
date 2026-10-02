# Katabasis — World, Mythology, Deity Art, and Endgame Overhaul

**Status:** Proposed for user review

**Date:** 2026-10-01

## Goal

Replace Katabasis’s fixed arena presentation with large, continuously explorable regional maps generated from one shared procedural foundation. Give those worlds physical presence through a 2.5D WebGL renderer, expand the Greek campaign with Atlantis and an Ancient Greece surface region, deepen mythological character interactions, create a 53-portrait animated deity art library for boon and Codex presentation, make Obol drops auto-collect, build Charon’s Shop as a safe explorable environment, and establish the data foundations for later Egyptian, Roman, and Norse mythology arcs. Connect run customization, Mirror progression, and midgame-to-endgame gear growth to the new world loop.

The campaign keeps its Greek underworld identity and Hades-like run rhythm: readable combat, meaningful choices, divine build directions, and lasting progression. The world itself becomes larger and explorable instead of presenting a region image behind a small static arena.

## Approved direction

- Every region uses the same procedural generation rules, with a run-specific layout and region-specific terrain, landmarks, hazards, and encounters.
- Preserve and fully expand the existing River Styx, Elysium, and Olympus region identities; add Atlantis and a playable Ancient Greece surface region, bringing the initial Greek target to 26 playable region IDs.
- Greek myth remains the active campaign. The content model must be ready for distinct Egyptian, Roman, and Norse mythologies to arrive as later story and region expansions.
- Mythological figures recur across regions and runs, remember major story choices, and interact with each other through authored, context-aware scenes.
- Create exactly 53 distinct deity cover portraits with approved still frames and subtle animated loops; reuse one portrait across all boon cards belonging to that deity.
- Freeze and approve a roster of 53 stable deity IDs before image generation. The portrait target does not imply that all 53 entries have boon mechanics or are playable gods.
- A region is one connected, multi-screen map. It contains a guaranteed main route, optional branches, encounter areas, exploration rewards, and a capstone.
- Run modifiers are selected for free before a run. Their tradeoff is difficulty against reward; no currency is consumed.
- Obols dropped during a run are credited automatically, with clear visual and HUD feedback and no pickup action.
- Charon’s Shop is a safe, explorable environment generated from the shared world foundation rather than a purchase popup over an arena.
- Gear has a predictable midgame Reinforcement path and a bounded endgame Masterworking path, both respecting the level-30 effective stat cap.
- The world uses a 2.5D WebGL renderer. The game simulation, controls, 2D character art, and HTML menus remain in place.
- The Mirror gains finite, build-focused progression. Gear provides an ongoing endgame build chase without uncapped stat growth.
- Every currently playable god must support at least two distinct, viable build archetypes.
- The complete Greek target covers all 24 current regions plus Ancient Greece and Atlantis. The first implementation milestone proves the new world loop in one region before expanding it across all 26.

## Current project baseline

Katabasis is an offline browser and desktop game built from JavaScript, Canvas, and HTML. The source tree produces a self-contained offline katabasis.html edition.

The current world canvas obtains a 2D context in js/main.js. js/render.js paints a region backdrop across the screen, draws a single floor image sized to the arena, places decorative props along the arena’s edges, and renders actors and effects over that floor. The game arena is initialized at 1200 by 800 world units. A camera already follows the player, but its bounds are the arena. The result is image-rich but spatially shallow: the backdrop does not extend the playable geography, and the player cannot explore a large region.

The campaign currently has 24 sequential region IDs with eight chamber positions per region. River Styx, Elysium, and Olympus already exist in that list, alongside Greek surface locales such as Delphi, Arcadia, Thebes, Marathon, and Mycenae; their present region definitions do not make them large, continuously explorable maps. Atlantis and an Ancient Greece surface region are new destinations, so the expanded initial Greek target is 26 region IDs, without duplicating those existing identities. The game already has a deterministic run seed, route choices, enemies, rewards, bosses, an image asset manifest, a save system, six gear slots, five gear rarities, and Fated Trial Pacts. The Fated Trial setup currently appears after a campaign victory. The existing Mirror has 16 upgrade categories with 52 total ranks. Existing campaign and story data already feature recurring figures and chapter scenes; the overhaul must build on that content rather than replace it.

The current source defines 12 god IDs, while existing text refers to an “Olympian Thirteen”; neither establishes an approved 53-name roster. The asset router already resolves deity art through god IDs and boon cards request their deity portrait, which provides the integration point. The art library must first reconcile the roster, preserve existing IDs, identify which entries already have boon content, and keep art-only entries distinct from gameplay god additions.

The current Armory already upgrades an item by spending Obols and one Salvage Shard toward the effective level-30 cap. In-run shops are currently world interactables that open purchase choices; they do not form a distinct navigable market space. Obol drops are represented by world pickup entities. This spec formalizes midgame reinforcement and adds a separate endgame masterwork layer, makes those drops auto-credit the run wallet, and turns Charon’s shop visit into a generated safe environment.

Two earlier gear decisions conflict: the Armory design allowed item levels and stat scaling to grow indefinitely, while the later progression design capped effective item level at 30. This spec resolves that conflict by retaining the level-30 effective stat cap and making continued gear progression horizontal: new item rolls, rarities, traits, and build combinations continue to matter without raising the stat ceiling.

## Design goals

- Make every region feel like a place with walkable ground, distance, depth, and landmarks.
- Generate different connected layouts from the same rules on each run.
- Preserve campaign and combat pacing while replacing isolated chamber screens with encounters embedded in a larger world.
- Let players configure risk and rewards on every run without spending a resource to do so.
- Make the renderer show physical grounding through lighting, depth, occlusion, impact response, and material animation.
- Give Charon’s market its own safe, physically grounded space that uses the same procedural map rules as campaign regions.
- Remove manual friction from Obol drops while preserving visible reward feedback and existing gain multipliers.
- Grow long-term build choice through the Mirror and endgame gear rather than endless flat-stat accumulation.
- Support multiple viable builds for every currently playable god, with no single god or highest-rarity item required for endgame viability.
- Preserve existing saves and the offline standalone game.
- Add a Greek surface and sea expansion while keeping the current region identities and story continuity intact.
- Make narrative interactions persistent and contextual: figures should respond to the player, the region, prior encounters, and each other.
- Put Egyptian, Roman, and Norse traditions behind a modular mythology boundary so future expansions can add distinct worlds and casts without rewriting the Greek campaign or generator.
- Make deity identity immediately legible on boon cards and Codex pages, with accessible static presentation when motion is disabled or unavailable.

## Non-goals

- A fully simulated 3D physics world, first-person camera, or new control scheme.
- A single continuous world connecting all 26 Greek regions. Each region is a connected map, with authored transitions to the next campaign destination at its capstone; Ancient Greece may route to its named surface locales through explicit exits.
- Replacing the existing gods, campaign, story, combat abilities, or six gear slots.
- New run-modifier currency, consumable map items, or a resource charge to start a modified run.
- Online accounts, network services, leaderboards, seasonal resets, or multiplayer.
- Unlimited increases to permanent or gear-derived combat stats.
- New boon mechanics, god balance changes, or playable-god additions solely to fill the 53-portrait art roster.
- Uncapped gear levels, unlimited Masterwork ranks, or a new currency for gear progression.

## Player flow

### Configure a descent

Before starting any ordinary run, the player may select no modifiers or combine any unlocked run modifiers. Selecting, removing, or changing modifiers has no Obol, shard, or consumable cost. Each modifier displays its effect on world generation, encounters, hazards, difficulty, and rewards before the player commits. A zero-modifier configuration remains available.

Modifiers that increase difficulty can improve eligible reward odds. Modifiers that make a run easier trade away some of that bonus reward potential. This opportunity cost is shown before starting; no resource is charged. Once the run starts, its seed and selected modifiers remain fixed.

### Explore a region

Entering a region generates one connected, multi-screen environment. The player follows a readable route toward the capstone while exploring loops and side paths for rewards, events, shops, secrets, and optional fights. The route can be revisited after an encounter. An encounter may temporarily close its local exits; clearing it restores passage and exposes its reward.

The map overlay records visited terrain and discovered paths. Unexplored areas remain hidden. Important known destinations such as the capstone, a discovered shop, or an active objective receive clear markers. The player never needs a separate route card between every combat beat; meaningful route choices appear at physical forks in the world.

### Continue the campaign

Keep all 24 existing region IDs, capstones, campaign events, and broad three-act arc. Add Atlantis and the Ancient Greece surface region as two new destinations; place them through explicit story-map gates and region exits so the current route remains understandable and saved campaign progress remains valid. The existing eight chamber positions in each region become a pacing and content budget placed along the main route and optional branches. They no longer imply eight isolated fixed-screen maps. The main route must always provide the required encounter, recovery, reward, and boss beats needed to continue the campaign.

## Greek region expansion and mythology framework

### Expand the existing Greek map, then add new destinations

The 24 region IDs already in the game remain the foundation of the Greek campaign. The River Styx, Elysium, and Olympus are not duplicate additions: they are existing identities that must become full, explorable, procedurally generated spaces under this spec. Preserve their story and boss links while expanding their spatial scale and regional mechanics.

Add two region IDs to the Greek campaign:

- **Ancient Greece:** A playable surface-region hub of roads, countryside, shrines, groves, settlements, and ruins. It supplies physical routes and story entrances to existing Greek locations such as Delphi, Arcadia, Thebes, Marathon, and Mycenae. It does not replace or merge those individual regions.
- **Atlantis:** A submerged, architecturally distinct region reached through a story-gated sea route from the Aegean. Generate terraces, canals, flooded avenues, sealed plazas, and collapsed structures as real traversable terrain. Use water currents, visibility, and pressure hazards as readable gameplay; do not require a breathing-meter simulation.

The resulting Greek target has 26 playable region IDs: all current 24, plus Ancient Greece and Atlantis. Every destination uses the same topology, terrain, content, and validation pipeline, with its own region data. Existing region names and campaign records migrate in place; no current region is renamed to make room for these additions.

Regional expression should make the requested destinations immediately recognizable through playable geometry, not a backdrop swap:

- **River Styx:** Multiple generated banks and channels, ferries or bridges, drowned landmarks, and currents that shape route choice. Keep a safe, readable route to the capstone in every layout.
- **Elysium:** Open heroic fields broken up by groves, colonnades, arenas, and memorial structures. The geometry supports both long sightlines and deliberate encounter pockets.
- **Olympus:** A rising sequence of terraces, cloud bridges, divine halls, and storm-exposed platforms. Height is communicated through the 2.5D presentation and route geometry while combat and collision remain on the established 2D world plane.
- **Ancient Greece:** Overland paths and inhabited or abandoned sites give the player a navigable surface context for the existing mythic locations.
- **Atlantis:** Water channels and monumental structures change traversal and sightlines without obscuring hazards, telegraphs, or the route forward.

### Recurring story and character interactions

The campaign should make its mythological figures feel like people with ongoing concerns, relationships, and memories. Existing Greek figures, including Charon, Achilles, Orpheus, Circe, and the Olympian gods, can return in regional scenes, the House, optional encounters, and post-run conversations. Add figures when they serve a specific regional or character arc rather than as isolated lore entries.

Build interactions from compact authored scene data keyed by character, mythology, chapter, region, and campaign flags. Track a bounded set of durable facts: major choices, promises, resolved or unresolved personal quests, alliances, rivalries, and important boss outcomes. Use those facts to vary later dialogue, unlock optional scenes or routes, change who assists or appears in an encounter, and shape nonessential reward opportunities. Core campaign completion, basic god access, and required progression cannot depend on an obscure dialogue choice.

Required interaction patterns:

- Figures can appear in more than one context and acknowledge earlier meetings or outcomes.
- Scenes can include direct exchanges between mythological figures, not only isolated speeches to the player.
- Major characters have a visible through-line across multiple chapters, with optional personal quests and callbacks.
- Player choices express a stance or relationship and produce later acknowledgement or a bounded consequence; they do not create a combinatorial branch for every line.
- Regional interactions respond to the space: an event at a river crossing, in Atlantis, or on Olympus should use that place's stakes and history.
- Repeat runs may surface alternate context, but completed story facts remain consistent and the campaign does not replay every scene as if no progress occurred.

Keep story state separate from run randomness. A region's generated geometry and encounter layout may vary by seed, while its authored story beats, prerequisites, and consequences remain reproducible and save-compatible.

### Future mythology introductions

Greek mythology is the only active pantheon for this campaign expansion. Establish a data boundary now so later Egyptian, Roman, and Norse arcs can add content without treating their traditions as cosmetic reskins of Greek gods.

Every mythology content pack should declare its own tradition ID, figures, regional families, creatures, relic provenance, dialogue/scenes, and optional mechanical vocabulary. Greek, Egyptian, Roman, and Norse identities remain distinct. Cross-tradition relationships or equivalents are authored explicitly when story calls for them; the system must not automatically equate figures because they share a domain or later historical interpretation.

The current work may foreshadow future traditions through a few Greek-story mysteries, artifacts, travelers, or unexplained signals. It does not add playable Egyptian, Roman, or Norse regions, gods, or full quest arcs. Those require their own content specifications and balance review. The framework must allow them to add new procedurally generated regional profiles, stories, and figures while reusing the shared world and save systems.

## Animated deity portraits and boon-card art

### Roster and scope

Create exactly 53 distinct deity cover portraits for the approved initial art roster. Before generating assets, approve each entry's display name, stable ID, mythology/tradition, epithet, domain, signature symbols, palette accent, and whether the deity currently has boon content. Preserve existing god IDs. The roster resolves the current 12-ID and “Olympian Thirteen” inconsistency; do not invent names or infer an approved 53-entry list from scattered source text.

The art library and the playable-god roster are separate. Every boon card uses its granting deity's portrait, and all boons from the same deity reuse the same art. An approved portrait without current boon content can appear in the Codex and other deity-information surfaces; it does not require new boons or playable-god status. Any expansion of gameplay god entries requires its own boon, balance, story, and build-coverage work. The existing endgame requirement of two viable builds applies to every run-eligible god, not automatically to every portrait in the 53-entry roster.

The 53 initial portraits follow Katabasis's Greek-Underworld identity: mythic silhouettes, dark stone, terracotta, cream, and restrained gold. Future mythology packs retain the quality bar but provide their own authored palette and visual reference; their portraits are additional pack content and are not counted in the 53 unless a roster revision is separately reviewed.

### Art direction and asset record

Each cover has one divine figure as its focal point, a distinct silhouette, face, attribute, and symbolic motif, and a restrained palette accent inside Katabasis's dark-stone, terracotta, cream, and restrained-gold visual language. Keep the face and defining motif inside the central crop-safe area for compact cards. Do not bake in names, labels, UI frames, or text. Keep composition and lighting consistent across the full set while varying posture, materials, symbols, and secondary motion enough to make each figure recognizable rather than recolored.

Hades is a pacing and presentation reference only. All deity concepts and art must be original to Katabasis.

Create one generation record per approved roster entry. It stores the stable ID, display name and epithet, tradition, domain, signature symbols, palette accent, silhouette/pose, crop-safe notes, approved still reference, and one or two animation cues. Use it as the source of truth for prompt revisions and asset naming.

Use this prompt structure for each approved roster member:

> Create an original Katabasis deity cover portrait of **[name and epithet]**, from the **[tradition]** tradition and associated with **[domain]**. Show **[pose and silhouette]** with **[signature symbols]**. Use **[palette accent]** within a dark-stone, terracotta, cream, and restrained-gold visual language. Keep the face and signature symbol in the central crop-safe area. Compose this as the still keyframe for a subtle idle loop; later frames will change only **[one or two cues]**. Keep the silhouette readable at small card size, and the artwork free of text, logos, and interface frames. The design must be original to Katabasis.

Generate and approve a still keyframe first. Use it as the reference for subsequent loop frames, changing only the named motion cues while preserving face, pose, palette, lighting, and crop. Inspect the assembled loop before approving a deity's final asset.

### Animation and display behavior

Each deity receives one seamless idle loop, targeting 4–8 frames over roughly 1.5–2.5 seconds. Keep the figure stable and recognizable while one or two identity-specific details move, such as flame, water, cloth, hair, eye-glint, or metal shimmer. Avoid scene cuts, abrupt camera movement, rapid flashing, and high-frequency motion. Start and end on visually compatible frames. Every loop includes a clean poster frame.

Run a two-deity pilot using contrasting designs, such as a storm-focused and a sea-focused figure. Compare a short sprite-sheet loop with a single-cover runtime motion treatment. Review actual boon-card and Codex sizes, loop continuity, crop safety, visual identity, reduced-motion behavior, and measured memory and bundle cost. Select the smallest reliable method that preserves the requested animated impression and quality; apply the approved method consistently to all 53.

- Reward-choice boon cards show the animated portrait for the boon-granting deity.
- Codex deity and boon details may play the loop while visible; pause playback when hidden.
- Persistent HUD boon chips use the static poster frame to preserve readability and limit simultaneous animation.
- Multi-deity boons show only their associated portraits in a compact paired composition, mapped from boon data.
- Reduced-motion settings and unavailable animation show the poster frame without movement.
- Portraits remain decorative. Names, descriptions, effects, rarity, and accessibility labels remain live text.
- If an asset is missing, show a readable loading/error state and use the poster frame when available.

### Asset integration and production sequence

Assign one stable deity ID and one portrait asset entry to each of the 53 roster members. Store each approved master cover, loop frames, and poster frame in the raster asset pipeline. Use the existing manifest and god-ID lookup pattern where possible, extended with mythology/tradition identity if needed to avoid future ID collisions. Reuse the same portrait reference across every boon associated with a deity. Keep animation limited to visible card and detail surfaces. Include all required art in the offline standalone bundle.

Produce the set in reviewable batches:

1. Freeze the 53-entry roster and label entries that already have boon data.
2. Build a style reference from the established Katabasis art and palette.
3. Create and approve two contrasting still portraits at actual boon-card and Codex sizes.
4. Approve the animation treatment using loop continuity, silhouette stability, crop safety, reduced-motion support, and measured resource cost.
5. Generate and review the remaining portraits in small themed batches against the approved reference.
6. Integrate by stable deity ID and verify every boon's lookup, multi-deity mapping, poster fallback, and offline bundle entry.

Portrait art does not change boon calculations, rarity, rewards, combat timing, or save behavior.
Do not generate the full set until the roster and the two-deity style/animation pilot are reviewed.

## Shared procedural world foundation

### One generation grammar, many regional identities

Every region uses the same generation pipeline and navigation guarantees. Region data supplies its palette, ground materials, obstacle families, landmarks, environmental motion, hazard rules, enemy pools, and content weights. The generator does not select a finished region map from a fixed library.

The generated map is built from procedural topology and terrain passes. Reusable textures, prop atlases, shape rules, and landmark constraints are allowed; authored static layouts or hand-placed full maps are not the source of run variation.

### Generation passes

1. **Topology:** Build a connected navigation graph with a start, an always-reachable capstone, a guaranteed main route, and optional loops and branches. Respect the selected modifiers while keeping routes legible.
2. **Terrain:** Convert the topology into walkable ground, raised surfaces, boundaries, chokepoints, and traversable corridors using the region’s procedural shape and material rules.
3. **Landmarks and props:** Place region-specific landmarks, cover, interactables, destructible props, and environmental details without blocking the required route.
4. **Content:** Place encounter pockets, events, reward sites, shops, recovery opportunities, optional bosses, secrets, and the capstone along the generated topology. Preserve campaign pacing and reward guarantees.
5. **Validation:** Check connectivity, clearance, spawn safety, encounter space, reward access, exit access, and modifier compatibility. Repair or regenerate invalid layouts before the player enters.

The world extends beyond one viewport in both directions so the camera must travel to reveal the region. It includes enough room for meaningful exploration and backtracking, rather than scaling the current arena image up without adding geography.

### Seed and repeatability

Map generation uses a dedicated deterministic random stream derived from the run seed, region identity, selected modifier IDs and ranks, and generator version. Map generation must not consume the combat RNG stream. The same seed, modifier configuration, and generator version reproduce the same topology and placements.

The generator records its version so future changes to algorithms do not corrupt campaign saves. A seed may be shown in the run summary for debugging and replay reference; no network service is required.

### Navigation and encounter rules

- The main route is always connected from entry to the capstone.
- Optional branches reconnect or terminate at a deliberate reward or return route; they cannot strand the player.
- Encounter exits close only while that local encounter is active and reopen after victory or an explicit event resolution.
- Boss and optional-boss areas have enough collision-free space for their attacks and player movement.
- Hazards are telegraphed in world space and do not spawn on top of the player or mandatory exits.
- The player can backtrack through explored cleared areas until choosing to cross the region transition.
- Required campaign rewards cannot be hidden behind optional branches or unreachable terrain.

## Environment weight and exploration

“Real” means the world feels spatially grounded and responsive, not photorealistic. Terrain, props, enemies, and the player share a consistent ground plane, occlusion order, and lighting response.

- Walkable terrain is actual generated world geometry with collision boundaries. A screen-sized backdrop cannot stand in for playable ground.
- Walls, pillars, bridges, water, lava, cliffs, and raised structures have readable height, edges, shadows, and collision behavior.
- Props are anchored to the terrain with contact shadows and scale/depth cues. Selected props can break, react to hits, or briefly move when struck; the design does not require general-purpose rigid-body simulation.
- Footfalls, dashes, heavy strikes, landings, and large enemy attacks create restrained ground response through animation, particles, sound, and localized camera impulse.
- Each region has animated environmental elements such as flowing water, moving chains, drifting ash, flames, roots, or weather. Motion supports the biome instead of covering the combat field.
- Environmental hazards have collision and gameplay behavior separate from their visual effects. The renderer never determines hits or movement.
- Foreground elements may briefly occlude an actor when needed, but must not hide enemy telegraphs, the player’s feet, or interactable prompts.

## 2.5D WebGL renderer

### Rendering approach

Replace the current 2D world rendering backend with a 2.5D WebGL world renderer. Keep the game simulation and collisions on the existing 2D world plane. The renderer adds height, layered depth, and lighting without requiring a new 3D combat or physics engine.

The WebGL canvas renders terrain, raised geometry, textured props, shadows, actors, projectiles, hazards, and effects. The HUD, maps, menus, descriptions, and other interface elements remain HTML/CSS. Character sheets remain image-based sprites rendered as camera-facing planes that sit on the ground plane.

The renderer reads world state and does not own gameplay state. Game code continues to decide collision, damage, movement, encounter state, interaction eligibility, and reward outcomes.

### Required scene layers

1. Regional sky and distant silhouettes with restrained parallax.
2. Textured walkable ground and terrain transitions.
3. Raised terrain, walls, bridges, and large world structures.
4. Ground contact shadows and local lighting.
5. Hazards, telegraphs, and low-to-ground effects.
6. Actors, props, and interactables in depth order.
7. Foreground occluders, particles, impact effects, and lighting accents.

The renderer uses authored raster textures and prop art as its visual source. Texture/material data may include normal, roughness, emissive, or height information for lighting and depth. Shaders may change light and material response, but must not replace the art with flat procedural shapes.

### Camera and performance

Use a smooth, orthographic or near-orthographic follow camera that preserves combat readability while showing enough terrain height to establish space. Camera bounds come from the generated region, not a fixed 1200 by 800 arena. Camera look-ahead, easing, and shake are tuned to player motion and impact weight; shake must not interfere with aiming.

Batch repeated terrain and prop draws, cull off-screen objects, and load region assets by need. Target stable 60 FPS at a common desktop viewport for ordinary encounters. If WebGL is unavailable, display a clear compatibility message before run start; never fall back to the static arena/backdrop presentation.

## Charon’s Market and automatic Obol collection

### Charon’s Market environment

Turn the current shop interaction into a distinct, safe, explorable environment called **Charon’s Market**. It is a procedural service space, not a new campaign-region ID, so the 26-region Greek target remains unchanged. Enter it from in-run shop points. It uses the shared topology, terrain, prop, lighting, collision, and camera systems, with a market-specific region profile; it is never a static backdrop or a fixed purchase panel disguised as a map.

Build a compact multi-screen dock or barge market around the Styx: a navigable river landing, Charon’s stall, visible wares, storage and ferry props, lamps and reflections, and enough distance for the player to approach the vendor and inspect the space. Keep it safe: no enemy spawns or damaging hazards while shopping. Charon is physically present and can be spoken to. His lines can respond to the campaign chapter, prior encounters, character-story flags, and whether the player has used his market before.

Every in-run shop point enters this environment with the inventory, prices, discounts, and purchase limits associated with that point. Generate its layout deterministically from the run seed, region ID, shop-node ID, and generator version. Returning to the region restores the exact shop node, run state, and remaining stock; purchases cannot be duplicated by entering and exiting. Keep an accessible inventory list and keyboard/controller navigation alongside the physical stalls so browsing never depends on precise movement.

The shared generator supplies a common market grammar, but each visit can vary its dock route, stall arrangement, props, and river details. Market generation must preserve clear access to Charon, every displayed item, and the return exit. It does not change which offers the shop system rolled. The environment is optional when the campaign route offers no shop point; it does not force a shop into every region.

### Obol drops auto-credit

When a combat or world event awards dropped Obols, credit them automatically to the current run wallet without requiring movement, overlap, or an interaction input. Apply the existing Obol multiplier exactly once and update the HUD and run-earned total immediately. A short coin arc, glow, sound, or grouped reward burst shows what was collected; visual feedback must not delay the credit or create collision clutter. Obols cannot expire, fall out of reach, or be left behind when the player exits a region.

This rule applies to Obols represented as dropped loot. Direct Obol rewards from choices, shops, or settlement continue to use their existing rules and cannot be double-counted as both direct rewards and pickups. Other pickups retain their current collection behavior. Automatic collection removes manual pickup friction; it does not alter shop prices, run modifiers, reward multipliers, or the existing post-run Obol settlement.

## Free run modifiers

### Modifier contract

Run modifiers are data-driven world and challenge rules. They are available in ordinary runs without a resource cost. The player pays only through the chosen challenge and reward tradeoff: harder configurations can increase eligible rewards, while easier configurations give up some of that bonus potential.

Each modifier:

- Has a clear name, description, severity rank where applicable, and preview of the world or combat change.
- States its difficulty change and the reward increase or tradeoff it provides.
- Alters at least one concrete world, encounter, hazard, route, reward, or economy rule; cosmetic-only entries do not count as map modifiers.
- Is compatible with the shared procedural generator and has a defined counterplay.
- Cannot remove the guaranteed main route, required recovery/reward beats, or capstone access.

Modifier families may affect environmental conditions, enemy composition, elite pressure, route density, hazard layout, recovery, shop/economy, or reward rarity. Examples include floodwater that changes which ground routes are usable, sealed side paths guarded by elites, or unstable altars that increase rare rewards while adding hazard waves. Combinations are validated before a run begins.

The setup shows the final combination and its total difficulty/reward preview. There is no currency-based modifier reroll. Players may freely add, change, or remove modifiers before starting. The run’s configuration is locked after start.

### Fated Trials integration

Unify the new run modifier definitions with the existing Fated Trial Pact definitions so the game has one modifier engine. Ordinary runs can use the free modifier setup from the start. Fated Trials remain the post-victory challenge and score ladder: their selected ranks contribute to a recorded score and their completion thresholds retain their endgame rewards.

Trial score and one-time Trial rewards are awarded only under the existing Trial completion rules. Ordinary runs do not become Trials merely because they use a difficult modifier. Existing Pact IDs, best scores, and claimed rewards migrate without loss.

## Mirror of Nyx and build growth

### Mirror progression

Preserve all current Mirror upgrades and purchased ranks. Keep permanent stat increases finite and bounded. Expand the Mirror with finite, branch-based unlocks that add options and build interactions rather than an endless line of flat stat ranks.

The new branch themes are:

- **Wayfinding:** Map information and controlled influence over procedural route content, while leaving the core map-generation rules available to every player.
- **Artifice:** Gear collection and endgame item choices, including access to high-rarity gear systems and controlled affix refinement.
- **Divine Accord:** Run setup and boon/build choice options that support every god, without making any god’s basic viability depend on a Mirror unlock.

The new branches use existing Obols and the existing Mirror interface. They introduce no run-entry fee and no new currency. Branch purchases remain finite and visible; they do not raise global stat caps. Add a branch-only respec that refunds the recorded cost of new branch nodes without resetting legacy Mirror ranks, gear, or campaign progress. Keep the existing DISSOLVE THE MIRROR action clearly separate as a full-progress reset.

Core run modifiers and at least two viable build directions per god are available without completing the new Mirror branches. Mirror progression adds agency and optional specialization; it does not gate the requested world overhaul.

### Gear progression: midgame upgrades and endgame build chase

Keep the six equipped slots, item identity, sets, affixes, Armory, and existing Obols and salvage shards. Preserve the effective combat-stat level cap of 30. Gear may continue to drop and be collected in endgame, but gear level, rarity, set bonuses, and affixes cannot push any stat past its defined cap.

#### Midgame Reinforcement

Formalize the existing Armory level-up as the midgame gear-upgrade loop. Unlock it at the first major campaign-act capstone, around the first third of the regional campaign. Reinforcement raises an item's level one step at a time toward effective level 30 using the existing displayed Obol cost and one Salvage Shard per step. The cost and resulting stats are shown before purchase; upgrades are deterministic and never reroll, destroy, or remove the item's rarity, set, affixes, or instance identity.

The existing Armory remains the between-run home for permanent gear changes. Midgame Reinforcement increases an item's effective stats only while below the level-30 cap; it is not a source of permanent character-stat growth beyond existing caps. Campaign reordering to accommodate Ancient Greece or Atlantis must preserve the first-act unlock as a midgame milestone rather than tying it to a brittle numeric region index.

#### Endgame Masterworking

Unlock Masterworking after the main campaign victory, alongside the endgame gear chase. A level-30 item may Masterwork one chosen existing affix or signature effect through at most three ranks. The chosen focus and every rank's effect are previewed before the player commits. Masterwork effects favor build interactions—such as changing a trigger, condition, conversion, or synergy—and any numeric component remains within global stat caps. Mythic traits and Godforged imprints may be valid focuses when the item defines a compatible Masterwork profile.

Masterworking uses only existing Obols and Salvage Shards; it adds no currency. It has no success chance, item destruction, or downgrade. A player can redirect the chosen focus by resetting that item's Masterwork ranks at the workbench for a clearly shown Obol and shard cost. The item can never exceed three Masterwork ranks, and the old legacy-item “mastered” display for stored levels above 30 is not a Masterwork rank; keep the two states separate in item data and UI.

Beyond the stat cap, ongoing gear growth comes from finding different combinations, pursuing set pieces, refining affixes, and unlocking build-defining traits. A bounded Armory refinement action may use existing Obols and salvage shards to alter one ordinary affix at a time. It cannot raise item stats beyond the same caps. Run modification itself never consumes these resources.

Endgame modified maps and bosses become the primary repeatable sources of top-tier gear. Their reward preview communicates which rarity band, set family, or trait pool is favored. The player can target a family of gear without guaranteeing a specific perfect item. Duplicate high-tier items continue to have a useful salvage/refinement outcome.

### Gear rarities

Keep current rarities and introduce two additional endgame rarities:

| Rarity | Role |
|---|---|
| Common | Baseline item with no random affix. |
| Rare | One ordinary affix. |
| Epic | Two ordinary affixes. |
| Heroic | Three ordinary affixes. |
| Legendary | Four ordinary affixes and existing set identity. |
| Mythic | Four ordinary affixes plus one Mythic trait that changes a trigger, interaction, or build rule. |
| Godforged | Four ordinary affixes, one Mythic trait, and one selectable imprint that offers a choice between distinct build transformations. |

Mythic and Godforged do not add a larger rarity multiplier to flat stats. Their value is build expression: a conditional effect, conversion, echo, altered proc, or interaction with a god/status/ability. Their effects obey the same global stat caps and must name their trigger and limits. The new tiers are rare endgame rewards, not a required baseline for viable builds.

### Viable builds for every god

For every god currently eligible to appear in a run, support at least two distinct and endgame-viable archetypes. A build archetype must differ in mechanic or decision pattern, not merely use a different rarity or a small numerical adjustment. Build routes may combine that god’s boons with generic gear affixes, sets, and traits.

Maintain a coverage matrix naming two archetypes for every current god. Each archetype must be reachable through ordinary run choices and should not require one specific Godforged item. High-rarity gear may strengthen or transform a route but cannot be the only way that god becomes useful. No single god is mandatory for clearing the campaign or its modifier-driven endgame.

## Save and offline compatibility

- Keep localStorage and IndexedDB behavior and the standalone offline katabasis.html delivery.
- Migrate existing campaign records, Obols, Mirror ranks, gear inventory, equipped items, salvage shards, Trial scores, and claimed rewards without deleting valid progress.
- Preserve shop stock and purchase state when a player leaves and re-enters a generated Charon’s Market during the same run.
- Preserve existing gear instance IDs and item records. Normalize legacy rarities safely; never discard a valid piece because its rarity is below a newly introduced tier.
- Keep the level-30 effective stat cap for older items and new items. If a legacy item records a level above 30, preserve the stored record but clamp only the effective value used by combat.
- Persist Reinforcement level and Masterwork focus/ranks without conflating Masterworking with a legacy level-above-cap marker.
- Version procedural map generation and modifier data. Do not store renderer-specific transient objects in the save.
- Bundle shaders, textures, material data, required maps, and every deity cover, loop, and poster frame into the offline edition. The running game makes no network requests.

## Data and code boundaries

- **World generator:** Seeded topology, terrain placement, POI placement, validation, and generator version.
- **World state and collision:** Walkable areas, blockers, hazards, interactables, encounter bounds, and map reveal state.
- **WebGL renderer:** Scene layers, camera projection, texture/material loading, light/shadow passes, culling, and GPU resource lifetime. It reads world state and cannot apply damage or move entities.
- **Region data:** Shared-generation parameters, regional tiles/materials, landmarks, enemy pools, hazards, and ambient effects.
- **Run modifier catalog:** Modifier definitions, compatibility rules, rank effects, difficulty and reward previews, and Trial scoring adapter.
- **Mirror and gear:** Finite progression nodes, rarity definitions, traits, caps, drops, salvage, refinement, and reward targeting.
- **Gear progression:** Midgame item Reinforcement, endgame Masterwork rank/focus, resource costs, caps, and legacy-item compatibility.
- **Market and Obol economy:** Generated safe-market layout, deterministic shop-node state, Charon interactions, automatic Obol credit, run wallet and settlement.
- **Deity portrait pipeline:** Approved roster, generation records, stills, loop frames, poster frames, asset-manifest entries, and lookup from deity and boon data.
- **Portrait presentation:** Visible-surface animation playback, poster fallback, multi-deity mapping, reduced-motion behavior, accessibility text, and missing-asset state.
- **Game and UI:** Region/shop transitions, pre-run setup, map overlay, encounter flow, Mirror/Armory/market screens, and save migration.
- **Bundle pipeline:** Include the WebGL implementation and all required art/material data in the standalone edition.

The world renderer is a backend boundary, not a rewrite of combat. Existing game objects, hitboxes, and run logic remain the authority for gameplay outcomes.

## Rollout

The complete initial Greek target includes 26 playable region IDs, the expanded story interactions, and all progression systems. Build it in dependency order:

1. **Tartarus proof region:** Replace the fixed arena with a generated, multi-screen map, WebGL terrain, collision, camera bounds, map reveal, and one full encounter-to-capstone flow.
2. **Generator and encounter contract:** Validate deterministic generation, navigation, encounter locks, local returns, and reward placement with representative modifier combinations.
3. **Story, mythology, and deity data contract:** Add versioned, save-compatible story flags and tradition/figure/region/portrait content boundaries. Validate that current campaign events survive migration, freeze the 53-entry portrait roster, and allow future mythology packs to register without enabling their content.
4. **Greek regional and market expansion:** Migrate all 24 current identities to the shared generator, expand the River Styx, Elysium, and Olympus, add Ancient Greece and Atlantis for a total of 26, generate Charon’s Market, and auto-credit dropped Obols.
5. **Character-story expansion:** Add recurring, contextual figure interactions, bounded personal questlines, cross-character scenes, and callbacks across existing regions, Charon’s Market, and the two new Greek destinations.
6. **Midgame and endgame gear progression:** Formalize current level upgrades as midgame Reinforcement and add the three-rank endgame Masterwork track with previews, existing-resource costs, and cap-safe effects.
7. **Deity portrait production and integration:** Approve the still/animation pilot, produce the 53 portraits in reviewed batches, and integrate card, Codex, HUD poster, multi-deity, reduced-motion, and offline-bundle behavior.
8. **Run setup and Fated Trials:** Add the free modifier configurator and unify it with the existing Pact/Trial scoring system.
9. **Mirror and endgame gear chase:** Add the new finite Mirror branches, Mythic and Godforged drops, capped refinement, and modifier-weighted gear rewards.
10. **God build coverage:** Complete and review the two-archetype matrix for every run-eligible god; tune boon and gear interactions against ordinary and endgame modifier configurations.

No phase changes the offline requirement or permits an unreviewed switch to a full 3D game engine.

## Acceptance criteria

1. No playable region uses a single static backdrop and fixed arena as its world. Every region is a connected, multi-screen, procedurally generated map.
2. All regions use the same generation pipeline, each with region-specific terrain, landmarks, hazards, enemies, and environmental effects.
3. The Greek campaign contains all 24 current region IDs, plus playable Ancient Greece and Atlantis, for 26 total. River Styx, Elysium, and Olympus retain their existing IDs and story links and are not duplicated.
4. The same run seed, region, modifier selection, and generator version reproduce the same map. Map generation does not perturb combat random sequences.
5. The generated main route, capstone, required encounters, and required rewards are reachable. Optional branches cannot softlock or trap the player.
6. The player can traverse and backtrack through cleared spaces; encounter exits close only while the encounter is active.
7. The 2.5D WebGL renderer shows world depth, terrain collision, contact grounding, lighting/material response, actor occlusion, and responsive environmental details while preserving combat readability.
8. Camera bounds follow generated map dimensions. A region requires camera travel beyond the starting screen in both axes.
9. Players can add or remove ordinary run modifiers before a run without paying Obols, shards, or consumables. Every modifier shows its effect and risk/reward change, and valid combinations preserve required content and navigation.
10. Fated Trials reuse the same modifier definitions and retain existing best-score and reward history.
11. The Mirror preserves all existing ranks and adds finite non-stat-focused branches. It does not create an unlimited permanent stat treadmill.
12. Mythic and Godforged gear can drop from endgame activities and add build-defining choices without bypassing the global stat caps. The effective gear stat level remains capped at 30.
13. A coverage matrix provides at least two distinct, viable build archetypes for every run-eligible god. No archetype requires a single highest-rarity item to function.
14. Story scenes can reference persisted chapter, character, region, and consequence flags. Returning figures acknowledge selected prior events, direct figure-to-figure scenes exist, and optional choices do not block required campaign completion.
15. A new mythology content pack can register its own figures, regions, and stories without changing the Greek content schema. Egyptian, Roman, and Norse traditions remain distinct; no playable content for them is required in this Greek expansion.
16. Exactly 53 approved, stable deity IDs map to 53 distinct portraits with approved still frames and looping presentations. Portrait-only entries do not automatically become playable gods or receive boon mechanics.
17. Every boon card resolves the correct granting deity's portrait; one asset is reused across that deity's boons, and multi-deity boons show only their mapped deities.
18. Portraits remain legible at actual boon-card size. Reduced-motion settings and persistent boon-tray chips use static poster frames; hidden surfaces pause animation; all semantic labels remain live text.
19. Charon is present and interactable in a safe, multi-screen Market environment built by the shared generator. Market dialogue can reference story state, stock and purchase state persist on exit/return, and inventory browsing remains keyboard/controller accessible.
20. Every dropped Obol is credited once to the run wallet with its multiplier applied once; no input or collision pickup is required, and visual feedback confirms the amount.
21. Midgame Reinforcement unlocks at the first campaign-act capstone, shows cost and stat preview, spends the displayed Obols and one Salvage Shard per step, and cannot exceed effective level 30.
22. Endgame Masterworking unlocks after campaign victory, allows at most three ranks on one selected focus per item, uses existing Obols and Salvage Shards, and cannot exceed global stat caps or destroy/downgrade an item.
23. Existing saves retain valid progress and the standalone bundle contains every required renderer, environment asset, and portrait frame with zero external network dependency. Missing animation falls back to its poster frame, and portrait presentation never changes combat or reward behavior.

## Risks and mitigations

- **Procedural layouts can feel noisy or unfair.** Generate topology before decoration; validate connectivity, clearances, combat space, and reward access before entering the map.
- **Large maps can dilute combat pacing.** Preserve the existing region beat budget and put optional exploration beside a clear main route. Use encounter pockets to keep combat focused without returning to fixed-screen chambers.
- **WebGL can fail on some devices.** Detect renderer capability at startup and show a clear support message before run start. Never silently substitute a static image arena.
- **The new renderer can obscure combat.** Keep telegraphs high contrast, foreground occlusion temporary, and lighting intensity bounded. Rendered effects never replace hitbox previews.
- **Gear rarities can inflate power.** Keep the level-30 effective stat cap and aggregate stat caps. Distinguish top rarity through interactions and transformations, not larger multipliers.
- **God build parity is broad work.** Track the two-archetype coverage matrix and treat a god as incomplete until both routes have ordinary-source support and an endgame path.
- **The region and mythology expansion can overrun the schedule.** Keep the initial expansion Greek-only, reuse all existing regional identities, add only Atlantis and Ancient Greece to the 24-region catalog, and make other pantheons future content packs.
- **Character-state combinations can become unmanageable.** Store compact, named story facts and use bounded scene variants; do not create a separate full campaign branch for every dialogue response.
- **Mythological traditions can be flattened by a shared content system.** Share technical schemas while keeping each tradition's cast, regional identity, and any cross-tradition equivalence explicitly authored.
- **The 53-deity roster is ambiguous.** Approve exactly 53 stable names and IDs, preserve existing IDs, and label entries with boon content before generating portraits.
- **Large-batch portraits can drift in style or identity.** Approve two contrasting stills and loops first, then compare every themed batch against that reference at card size.
- **Loop frames can destabilize faces or fail at small sizes.** Approve each still before animation, keep motion to one or two cues, and inspect crop and loop continuity at actual boon-card scale.
- **Animated art can burden the UI or offline bundle.** Measure the pilot, pause hidden surfaces, use poster frames in persistent HUD elements, and include all approved art locally.
- **Automatic Obol awards can double-count or obscure reward feedback.** Route each drop through one wallet-credit path, apply its gain multiplier once, update the run-earned total once, and group only the visual effect.
- **Market travel can interrupt a run or duplicate purchases.** Store the shop-node ID, layout seed, stock, price modifiers, and purchased flags; restore the same market state when returning.
- **Gear upgrades can make leveling feel mandatory or inflate power.** Preview deterministic Reinforcement results, cap effective item level at 30, and limit Masterworking to three ranks on one chosen item focus.
- **Offline bundle size can grow.** Share regional materials where appropriate, use atlases and compressed textures, load only the active region during play, and include all data locally.
