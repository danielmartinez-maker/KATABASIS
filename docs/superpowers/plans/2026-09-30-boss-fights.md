# Katabasis Boss Fight Overhaul — Implementation Plan

Date: 2026-09-30
Design: `docs/superpowers/specs/2026-09-30-boss-fights-design.md`

## Work sequence

1. **Boss stage lifecycle**
   - Extend the boss instance with an ordered phase queue, current transition timer, and reached-stage index.
   - Queue every threshold crossed by a hit, then transition one stage at a time; pause boss action and contact damage during each short transition.
   - Move stage announcement and image-atlas transition feedback to a single stage-entry hook. Make shared AI dispatch respect the transition lock.
   - Keep phase thresholds and stage labels in boss definitions; ensure generated aspects inherit the family stage data without mutating the source boss.

2. **Shared family escalation and named signatures**
   - Increase combat decisions through phase-specific movement and attack patterns in the four existing family AIs.
   - Add data-driven signature identifiers to the eight campaign bosses that currently reuse a base family AI.
   - Implement each signature as explicit telegraph → attack → recovery state, using existing image-backed projectile, telegraph, status, and action atlases. Use existing hazard helpers for temporary damage zones.
   - Add phase summon budgeting that checks the active hostile count before each summon and never exceeds 14.
   - Keep signatures build-agnostic and expose deterministic safe lanes or dodge windows; use the run RNG for attack selection where possible.

3. **Boss-stage HUD**
   - Add a stage label and pips beside the existing boss identity and health bar.
   - Update HUD cache invalidation when stage changes and ensure the layout wraps cleanly on mobile.
   - Keep all boss/effect art sourced from the raster manifest; do not add geometric canvas art.

4. **Champion tribute and final reward sequencing**
   - Add optional minimum-rarity and choice-count settings to boon offer generation while preserving all current callers.
   - Configure boss clears for four choices at Rare-or-better and a stronger region-scaled obol award; preserve existing reroll and skip behavior.
   - Carry a `victoryAfter` flag through the pending reward and close-offer flow. The final boss reward must close to victory, while all other boss rewards close to normal advancement.
   - Keep gate removal and pending reward clearing as the exactly-once guard.

5. **Bundle and source consistency**
   - Review all 12 campaign boss definitions plus generated aspects against the acceptance criteria.
   - Rebuild `katabasis.html` from the edited source using the documented `node tools/bundle.js` command.
   - Run targeted boss regressions before implementation and confirm the expected failures; then run the smoke suite and bundle after implementation. Inspect the final source and bundle for external image dependencies or geometric game-art additions.

## Main files

- `js/entities.js` — boss state machine and four shared family AIs.
- `js/data.js` — original four boss stage definitions.
- `js/content-expansion.js` — eight campaign boss stage/signature definitions and generated aspects.
- `js/game.js` — damage thresholds, phase entry, hostile cap helpers, boon reward generation, gate/final victory flow.
- `index.html`, `js/main.js`, `css/style.css` — boss-stage HUD and reward labels/layout.
- `katabasis.html` — rebuilt single-file distribution.

## Completion evidence

- Source contains stage transitions that queue all crossed thresholds and suspend boss attacks/contact during transition.
- Each named boss has its planned signature with an image-backed tell and stage-specific behavior; family aspects use their shared family stage logic.
- Boss HUD renders the current stage and stage count.
- Boss rewards enforce four Rare-or-better boon choices and region-scaled obols, and the last reward closes into `victory()` once.
- Summon logic respects the 14-hostile cap.
- The distributable bundle is rebuilt from source and embeds its image library.

## Approved scope additions

These requirements were added by the user during implementation and supersede the corresponding exclusions in the initial design spec.

6. **Kill Chronicle and Nemesis system**
   - Assign every hostile spawn a seeded identity built from curated mythic names, former lives, memories, motives, and fates. Append a backstory for each kill to both the current run and persistent save history.
   - Add Chronicle pagination and Nemesis records to the Codex. Preserve the archive across descents and legacy saves.
   - Promote the enemy responsible for a run-ending hit into a persistent Nemesis. Track its rank, previous loss, and last attack; let it return as an enlarged champion in a later region, with an attack-family stat adaptation. A slain Nemesis stays recorded but no longer hunts.

7. **Mythic campaign story**
   - Add one guaranteed interactive scene after each of the 12 capstones, in the boss-tribute close path.
   - Give every existing god a speaking role and include the central Underworld cast and major mythic heroes. Keep speech and choice text in the content tables; render speaker medallions through the existing raster image manifest.
   - Record conversations in the Saga archive. Story choices grant a small run reward, record divine affinity, and the final post-Typhon choice selects the epilogue.
   - Keep optional event rooms and ordinary reward flows unchanged. Use existing character, deity, and location images; do not draw new geometric game-art assets.

8. **Added regression coverage**
   - Extend the smoke harness to verify one Chronicle entry per kill, persistent Nemesis creation and return, every god and named mythic figure in the campaign cast, and the boss-reward → conversation → region/victory sequencing.
   - Extend the offline bundle check to verify 12 story chapters, save migrations, and rendered story, Saga, Chronicle, and Nemesis panels.

