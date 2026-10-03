# Katabasis Living-World Terrain and Ambience

**Status:** Approved design; implementation authorized by the user on 2026-10-02.

**Date:** 2026-10-02

## Goal

Evolve the expanded descents from large, dressed arenas into living, traversable mythic landscapes. Terrain must shape routes and combat, while regional weather, light, motion, and sound make every place feel inhabited. Preserve the painterly Greek-myth style, the existing 2.5D camera, offline single-file game, save compatibility, and the established encounter pacing.

## Approved direction

The user selected the simulation-rich approach and asked for greater ambition. This design proposes a shared terrain simulation feeding the renderer, movement/collision, combat visibility, environmental hazards, and ambience. It covers all 26 campaign regions plus the Market and Training Grounds where they use the world renderer.

The presentation remains painterly 2.5D. It does not convert the game to a free-camera 3D renderer or a platformer. Stairs, ramps, bridges, ledges, and drops express height in the existing continuous movement model; terrain rules, rather than new jump controls, determine which transitions are traversable.

## Current foundation

- Procedural campaign maps already use seeded region profiles, expanded walkable space, material zones, obstacle/blocker data, ground overlays, and signature landmarks.
- The world renderer draws an image-backed floor, placed terrain overlays, depth-sorted props and actors, and a parallax backdrop. It already uses visible-region culling and static terrain buffers.
- Twenty-eight world profiles currently share eight broad art families. The eight families have ground and prop kits; region IDs carry signature-landmark coverage.
- Ambient particles are currently sparse generic drift. The Web Audio system has four supplied music tracks and synthesized combat/UI effects, but no separate regional ambience layer.
- The standalone game embeds its raster and audio assets through `tools/bundle.js`; the Windows app launches the generated `katabasis.html`.

## Experience principles

1. **Terrain is gameplay data and art together.** The same authored/generated feature defines its silhouette, height, surface behavior, collision, cover, and traversal connections.
2. **The landscape reads at a glance.** The player can identify walkable ground, drop-offs, water, hazards, cover, routes, and exits under combat effects.
3. **The world has regional identity.** Shared biome foundations are allowed, but each campaign region gets its own landform composition, material accents, landmark, and ambience signature.
4. **Environmental pressure is fair.** Hazards signal their location and timing, affect enemies as well as the player where appropriate, and never sever every route to a required objective.
5. **Generation stays reproducible.** Terrain, ambient schedules, and decorative placement use dedicated seeded streams or stable coordinate hashes; they never consume combat randomness.
6. **All shipped content works offline.** No runtime art generation, remote sound, or network dependency is introduced.

## World layout and traversal

### Height-aware terrain field

Each generated map is built from connected landforms rather than treating every floor cell as the same plane. The terrain model supplies material, elevation band, edge type, cover height, traversal links, environmental force fields, and hazard anchors. It can describe:

- high shelves, stepped terraces, ridges, and plateaus;
- ravines, sinkholes, cavern bowls, and undercut edges;
- river channels, islands, shore shelves, lava cuts, and marsh pockets;
- stairs, ramps, causeways, bridges, and narrow crossings;
- walls, columns, fallen masonry, roots, and other cover or blockers.

The map remains a connected top-down world. A terrain transition explicitly joins adjacent height bands. A cliff edge, deep water, or lava cut blocks movement unless a bridge, ramp, stair, or authored passage connects it. Drops may be one-way only when the generated route graph still preserves required reachability and a readable return route is intentionally not required.

### Navigation and combat interaction

Player movement, enemy traversal, obstacle collision, projectile occlusion, and hazard footprints query the same terrain source. Rendering never decides collision. Terrain behavior is applied consistently to player and enemies, with region-specific resistance only where a combat archetype already supports it.

Height and cover can affect line of sight and projectile paths through a bounded occlusion model. Shallow currents and wind fields apply gradual, directional forces rather than teleporting actors. Slippery, loose, or unstable surfaces may alter traction or movement response. Traversal features can form high and low routes, optional detours, safe firing positions, and shortcuts while keeping the main route legible.

Required encounter beats remain the pacing budget. Larger landscapes add route choice, discoveries, scenic transitions, and tactical space; they do not require proportionally more mandatory fights.

### Environmental hazards

Hazards are region-authored, seeded, and telegraphed. Examples include:

- Styx or Aegean currents strengthening through channels;
- volcanic vents and magma seams pulsing before eruption;
- storm fronts marking a lightning lane before impact;
- wind corridors pushing loose debris or projectiles;
- shifting sand, crumbling ledges, or rising water changing a local route state.

Environmental state changes are bounded and reversible unless a clear one-way transition is authored. They cannot close every route between the entry and a required encounter. Each hazard communicates its footprint and timing in both art and, where useful, a distinct audio cue. Optional hazards can reward skilled detours without blocking campaign progress.

## Visual composition and art

The world renderer gains a deliberate depth stack:

1. parallax sky, horizon, and distant mythic silhouettes;
2. mid-distance cliffs, architecture, vegetation, and landform silhouettes;
3. walkable material fields, banks, paths, and height transitions;
4. collision-aligned obstacles, cover, bridges, and landmarks;
5. depth-sorted actors, projectiles, pickups, and combat effects;
6. restrained foreground framing and weather/atmosphere passes.

Art remains original raster illustration. Production uses broad family material atlases plus regional accent sheets, traversal-feature art, and distinct landmarks. Reusable materials may share brushwork and dimensions; region identity must not collapse to picking a different cell from the same generic kit. Water, foliage, fire, cloth, banners, and similar animated elements use authored raster frames or restrained shader motion that preserves the hand-painted look.

Initial art and renderer pilot: **Tartarus** and **Aegean**. Tartarus establishes cavern strata, basalt shelves, deep shadow, and ember/vent behavior. Aegean establishes coast shelves, islands, bridges, currents, spray, and storm behavior. This pilot validates two contrasting terrain grammars; it is not a reduction in coverage. The finished system covers all 26 campaign regions and the two additional world profiles.

## Regional ambience

Each region profile selects a coherent atmosphere package: palette and light range, fog or particulate density, wind field, animated environmental motifs, active hazard schedule, ambient sound profile, and local accent cues. The 26 campaign regions receive distinct combinations; broad biome families can share base recordings or animation atlases.

Visual ambience may include drifting ash, spores, rain, sea spray, leaves, ember fall, distant silhouettes, moving water, heat shimmer, localized fog, and slow light changes. Effects are spatially anchored and seeded, so they respond to the actual region without appearing as a screen-space filter pasted over combat.

Audio adds a separate ambience channel beneath the existing music. Family beds provide authored wind, water, cavern, grove, volcanic, or temple tones; region-specific layers add local details such as chains, distant surf, insects, bells, or stone resonance. Nearby emitters may pan or change filtering, and room-like spaces may add light reverb. Region transitions crossfade beds; combat music remains independently layered. Add a separate ambience volume/mute control and a reduced-motion setting without changing existing save meanings.

All new visual and audio content is local and embedded in `katabasis.html`. Audio begins only after the existing user-gesture unlock; disabling ambience does not disable music or gameplay sound effects.

## Data flow and implementation boundaries

1. Region identity, run seed, modifiers, and a dedicated terrain stream produce a landform graph and terrain field.
2. The graph records connected height bands, surfaces, traversal transitions, blockers, cover, and environmental volumes.
3. Runtime movement, enemy motion, projectile visibility, and hazards query that same data.
4. The renderer draws terrain layers and visible chunks from the graph, then applies bounded environmental animation.
5. The ambience controller reads region identity, player position, and active environmental state to blend local visual emitters and sound beds.

Map layout choices are fixed when a world is generated. Ambient animation may evolve over time but cannot reroll map topology or change combat RNG. Destruction of major terrain, free-form climbing/jumping controls, and a full real-time day/night calendar are outside this scope.

## Performance, readability, and accessibility

- Retain chunk-based culling, static geometry caching, asset prewarming, and lazy loading for distant assets.
- Cap active ambient emitters and particles by visible area; weather and water effects must not allocate unbounded objects per frame.
- Keep actors and combat telegraphs readable above terrain and foreground art. Foreground occluders fade around the player and never hide hazards or required interactions.
- Provide reduced motion and independent ambience volume/mute controls. Keep the existing mute behavior valid for old saves.
- Define device targets and GPU/CPU budgets during implementation planning against the current game on the reference Windows/browser setup; do not trade route readability or cold-start behavior for excess decoration.

## Compatibility and delivery

- Preserve existing controls, boon/run progression, save data, region IDs, encounter pacing, and campaign routes except for explicit new terrain traversal behavior.
- Existing saves load with ambience at the documented default and no forced reset. World-generation versioning keeps old seeded snapshots interpretable if they are persisted.
- `index.html` remains the development/test entry; the production game is regenerated from source with `node tools/bundle.js` and shipped as `katabasis.html`.
- The native desktop wrapper and GitHub Windows workflow continue to launch/package the production single-file game. All new image and audio references resolve offline.

## Acceptance criteria

1. The 26 campaign regions and both auxiliary world profiles have explicit terrain and ambience profiles; every campaign region has recognizable regional art and at least one traversal feature that affects play.
2. Required route nodes remain reachable under generated terrain and every apparent bridge, ramp, ledge, water edge, and blocker obeys its declared movement rule.
3. Currents, wind, surface response, elevation/cover, and scheduled hazards produce intentional, readable traversal or combat consequences; telegraphs precede damaging environmental events.
4. Environmental behavior affects player and enemies consistently, does not consume combat randomness, and does not increase the number of required encounters.
5. Region ambience changes with location, crossfades independently of combat music, and respects independent volume/mute and reduced-motion settings.
6. Raster terrain, landmarks, animated environmental art, and ambience audio are original and included in the offline standalone bundle; there are no runtime external requests.
7. The native Windows package launches the generated `katabasis.html` and retains portable-save behavior.

## Risks and mitigations

- **Terrain can become unreadable during combat.** Keep walkable paths visually continuous, use value contrast for edges, fade foreground objects, and make hazard telegraphs higher priority than atmosphere.
- **Generated topology can trap or disconnect players.** Build route and blocker data from one graph, reserve critical corridors, and validate connectivity before accepting a generated map.
- **Environmental forces can make combat feel random.** Keep force volumes legible and bounded, give them to enemies too, seed their schedules, and avoid changing directions without a visual/audio cue.
- **Unique art for 26 regions can grow without limit.** Reuse technically compatible material families while requiring regional landforms, landmarks, palette, and ambient signatures; establish these rules in the two-region pilot before batch production.
- **The expanded world can add cold-start and frame cost.** Stream and prewarm only nearby content, use static chunks for terrain, and cap active visual/audio emitters.
