# Living-World Ambience Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan after `2026-10-02-living-world-terrain-plan.md`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every campaign region a recognizable visual and audio atmosphere, with spatially anchored weather and independently adjustable ambience.

**Architecture:** Consume the terrain plan's per-profile `ambience` record. A small deterministic ambience controller will schedule capped weather/particle emitters from world position and region seed; `K.Audio` will synthesize a slow family bed plus region accent under a separate gain bus and crossfade it without changing music or combat SFX behavior.

**Tech Stack:** Offline JavaScript, existing `K.Game`, `K.Particles`, Web Audio, existing save normalization, HTML/CSS options controls, Node regression harness, offline standalone bundle.

**Spec:** `docs/superpowers/specs/2026-10-02-living-world-terrain-ambience-design.md`

## Global Constraints

- Ambience reads the exact region/topography profile emitted by the terrain plan; it never rerolls map state or consumes combat RNG.
- Keep ambience under the music bus, start/resume audio only after the current user-gesture unlock, and do not change existing SFX or mute semantics.
- Keep particles/effects bounded by visible area and suppress motion when reduced-motion is enabled.
- All ambience is synthesized locally or bundled; there are no runtime external requests.
- Preserve old saves and the production-entry rule: rebuild and ship `katabasis.html`, with `index.html` as the development/test page.

## Review Focus

- Old saves without the new preferences must receive compatible defaults and retain their existing global mute setting — pin in Task 2 save/audio assertions.
- Fast region transitions must not stack audio nodes or leave a previous region bed playing — pin in Task 2 crossfade lifecycle assertions.
- Hidden tabs, pause states, and reduced-motion settings must not accumulate unbounded emitters — pin in Task 1 update tests.
- Region changes must remain deterministic for a fixed seed and profile even when frame rate varies — pin in Task 1 scheduling assertions.
- Production file protocol must resolve audio with zero network requests — pin in Task 3 bundle audit.

---

### Task 1: Deterministic regional visual atmosphere

**Files:**
- Create: `js/world-ambience.js`
- Modify: `js/game.js`
- Modify: `js/world-renderer.js`
- Modify: `index.html`
- Modify: `tools/world-overhaul.test.js`
- Modify: `tools/world-renderer.test.js`

**Interfaces:**
- Consumes: Terrain plan's `world.profile.ambience`, map seed, player position, and `K.Particles`.
- Produces: `K.WorldAmbience.update(game, dt)` and `K.WorldAmbience.setReducedMotion(enabled)` with seeded regional schedules, bounded local emitters, spatial force/hazard cues; weather draws beneath telegraphs and over terrain without masking actors.

- [x] Add failing assertions for stable ambience profiles across all 28 worlds, same-seed scheduling, visible-area particle caps, and reduced-motion suppression.
- [x] Run `node tools/world-overhaul.test.js` and `node tools/world-renderer.test.js`; confirm the new controller behaviors are absent.
- [x] Implement the controller and call it from the game update/render path; use spatially anchored ash, spray, spores, leaves, rain, embers, cloud shadow, and fog variants based on each profile.
- [x] Keep visual motion bounded, deterministic, and separate from gameplay randomness; preserve hazard telegraphs at the highest visual priority.
- [x] Run the two targeted suites and confirm all ambience/controller assertions pass.
- [x] Commit the coordinated terrain and ambience delivery after the final native build.

### Task 2: Regional ambience audio and accessible controls

**Files:**
- Modify: `js/core.js`
- Modify: `js/main.js`
- Modify: `js/persistence.js` if the preference normalizer lives there.
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `tools/world-overhaul.test.js`

**Interfaces:**
- Consumes: Task 1's current region and the terrain plan's `profile.ambience.bed`/`accentHz` values.
- Produces: `K.Audio.setAmbienceProfile(profile)` and `K.Audio.setAmbienceVolume(value)`; new save fields default to ambience volume `0.45`, ambience mute `false`, and reduced motion `false`; ambience gain is independent of music gain and existing global mute. Reduced motion is controlled through `K.WorldAmbience.setReducedMotion(enabled)` from Task 1.

- [x] Add failing assertions that legacy saves normalize the new fields, ambience volume clamps to `[0,1]`, global mute silences all buses, and an ambience-only mute leaves music/SFX settings intact.
- [x] Add a fake Web Audio context assertion for bounded region crossfades and cleanup when switching profiles rapidly.
- [x] Run `node tools/world-overhaul.test.js`; confirm the preference and ambience APIs are missing.
- [x] Implement family-specific Web Audio beds plus region accent cues using the `bed` and `accentHz` fields on one ambience bus; crossfade profile changes over 0.8 seconds and create/resume nodes only after the existing gesture unlock.
- [x] Add separate ambience volume/mute and reduced-motion controls in the existing settings UI; persist defaults without migrating or resetting old saves.
- [x] Run `node tools/world-overhaul.test.js`; confirm preferences, mute isolation, profile crossfade, and save migration assertions pass.
- [x] Commit the coordinated terrain and ambience delivery after the final native build.

### Task 3: Offline and native integration

**Files:**
- Modify: `tools/bundle.js` only if needed for new source modules or bundled media.
- Generate: `katabasis.html`
- Generate: `dist/KATABASIS-1.0.0-win-x64-portable.exe`

**Interfaces:**
- Consumes: completed atmosphere controller and audio settings.
- Produces: a self-contained production single-file build and native portable package with no remote ambience dependencies.

- [ ] Register the ambience module in `index.html` and bundler order, if not already registered in Task 1.
- [ ] Run the complete `node tools/world-overhaul.test.js` suite. **Not completed:** the full run previously exceeded 700 CPU seconds in its six-seed campaign sweep; the final 28-profile sweep and focused terrain, renderer, ambience, Market, and save/audio cases passed.
- [x] Run `node tools/bundle.js`; inspect the bundle inventory and offline reference audit for all new scripts/assets (299 embedded images, four audio tracks, zero external references).
- [x] Run `pnpm dist:win` to package the native build from the regenerated production file.
- [ ] Acoustically listen to representative Tartarus, Aegean, and grove beds. The production file opened offline and its ambience volume, mute, and reduced-motion controls were exercised successfully; audible listening was not verified.
- [x] Commit build metadata and preserve the generated production file and portable executable in the worktree.

