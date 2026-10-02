# Katabasis Boss Fight Overhaul — Design Spec

Date: 2026-09-30
Project: `C:\Users\dmcfu\OneDrive\Documents\deepseek-harness\default-workspace\katabasis.html`
Status: Design draft for user review

## Goal

Make boss encounters feel like escalating, readable set pieces with distinct stage mechanics and stronger spoils. Keep the existing campaign and its 12 named bosses; apply shared improvements to their generated family aspects as well. Do not add new named bosses in this scope.

## Current behavior

The game has four shared AI families (`lion`, `medusa`, `hydra`, `typhon`), 12 named campaign bosses, and generated aspects based on the four original bosses. Most named bosses expose three health-threshold labels; Typhon has four. Thresholds currently change the phase index and announce a toast, shake, flash, and nova. The AI mostly reacts to later phases by moving and attacking faster or using more projectiles. Boss HUD shows a name, title, and health bar, without an explicit stage display. Boss clears award obols and a boon offer, except the final capstone goes directly to victory and skips that offer.

## Design decisions

### 1. Stage progression and readability

- Give each named boss a three-stage fight; preserve Typhon's four-stage finale. Shared family phase behavior also applies to all generated aspects.
- Treat each stage as a combat chapter with one signature rule change and at least one added or altered attack pattern. Later stages should change positioning or timing choices, not only raise speed and damage.
- On threshold crossing, stop the boss from starting a new attack for about one second, announce the stage name, and display a distinct stage transition. Do not make the transition damage the player.
- Avoid skipped stage announcements if a large hit crosses multiple thresholds. Queue outstanding stage transitions and process them in order while allowing the fight to continue after each short transition.
- All gameplay art and animated cues remain raster image assets. Reuse existing image atlases where they communicate the cue; create new cues as generated image assets when implementation needs visuals. Do not introduce procedural geometric art or Canvas-drawn shapes as new game assets. Existing health-bar/UI structure may remain.
- Add stage name and current-stage pips to the boss HUD. Keep the existing boss name, title, and health bar. The stage readout must remain legible at narrow viewport sizes.

### 2. Encounter mechanics

Use the four shared AI kits for generated aspects, then add named-boss signature patterns through boss data so each campaign fight has an identity:

| Boss | Signature escalation |
|---|---|
| Nemean Lion | Armor and attack openings; later pounce follow-ups and a readable expanding roar pattern. |
| Medusa | Directional gaze with safe movement windows; later snake volleys and carefully capped summons. |
| Lernaean Hydra | More head-led attack lanes and venom zones; later overlapping but avoidable spit patterns. |
| Typhon | Storm-lane pressure and increasingly coordinated final patterns across four stages. |
| Styx Warden | Chain pull/avoid decisions followed by a crossing surge with clear safe lanes. |
| Tantalus | Baiting feast apparitions and delayed attacks that punish greed without hiding their landing areas. |
| Achilles | Frontal guard, marked spear thrusts, and punish windows for flanking or dodging. |
| Shade of Orpheus | Rhythmic waves and short safe beats, with later tempo changes. |
| Asterion | Telegraphs that reshape the safe route through the arena; avoid moving wall geometry. |
| Scylla | Staggered shoreline jaw strikes that leave identifiable lanes open. |
| Porphyrion | Targeted storm strikes with escalating but readable timing. |
| Hecatoncheir | Alternating arm-sweep sequences with increasingly layered safe lanes. |

Telegraphs must precede damaging patterns, remain distinguishable from the arena floor, and leave a viable dodge route. Do not require a particular boon, weapon upgrade, or build to understand or counter a mechanic. Phase summons must respect the current active-hostile cap of 14. Stage mechanics should use deterministic or seeded choices where the encounter currently supports the run RNG; cosmetic variation may remain unseeded.

### 3. Boss rewards and finale flow

- Keep the boss-clear boon reward and add a clear champion's tribute: a four-choice boon offer with a guaranteed Rare-or-better floor, plus a region-scaled obol bonus. Preserve reroll and skip controls.
- Present the same reward after the final capstone. Closing or skipping that final offer should then show victory rather than advancing to another chamber.
- Keep existing boss kill drops and room progression intact apart from the explicit reward improvement. Do not add a second reward modal or persistent save fields in this scope.
- The reward should be granted exactly once even if the exit gate or reward controls receive repeated input.

## Scope and constraints

In scope: boss stage state, per-stage AI/mechanics, stage HUD, stage image cues, reward choice and final-capstone reward sequencing, compatibility with generated aspects and the 14-hostile cap.

Out of scope: new named bosses, campaign route changes, meta-progression/save schema changes, general enemy density rebalancing, redesign of all non-boss rooms, replacing the existing asset pipeline, and unrelated UI redesign.

Art constraint: no new vector or procedural geometric game art. Any newly introduced game-art cue must be an image asset and animated from raster frames when animation is appropriate.

## Acceptance criteria

1. Each of the 12 named bosses has distinct stage progression with a meaningful change to player positioning, timing, or attack response; Typhon retains four stages.
2. The four shared AI-family improvements also apply to generated aspects without requiring duplicated boss code.
3. Stage transitions are visible in the HUD, do not deal damage, do not silently skip queued stages, and provide an attack-free boss interval.
4. Every boss signature pattern has a clear image-based tell and a dodgeable resolution; no new geometry is introduced as art.
5. Summons stay within the 14-hostile limit.
6. Every boss victory, including final capstone, yields the upgraded boon choice and region-scaled obols exactly once; the final offer closes into victory.
7. Existing ordinary room rewards and save format remain compatible.

## Risks to watch during implementation

- Twelve distinct signatures on top of four shared AIs can create overlapping state and stale per-attack memory; centralize stage transition and signature dispatch rather than duplicating the entire AI functions.
- Longer fights can become unfair if later stages stack projectiles or adds. Telegraph time and active-hostile limits must remain explicit.
- Reward quality and obol scaling can inflate campaign power. Use guaranteed rarity with a bounded choice count and verify the final region's bonus against the current economy.
- Inlined and generated aspect definitions share source IDs and visual keys. Keep stage logic data-driven and avoid mutating shared base definitions when constructing variants.

## User-approved implementation addendum

The user later expanded this task to include persistent enemy histories, a Nemesis system, and a campaign story. This addendum supersedes the initial exclusions for save-schema and campaign-story changes above:

- Every hostile kill receives a generated, seeded biography entry and is retained in the run archive and persistent Chronicle.
- An enemy responsible for an actual run-ending hit becomes a named persistent Nemesis. Nemeses remember the attack, adapt, return in a later region as an image-backed champion, and can be permanently defeated.
- Each of the 12 capstones leads to a required dialogue scene. All current pantheon gods speak during the campaign; major Underworld figures and Greek heroes also appear. Player choices are archived and the final choice determines the epilogue.
- Continue using image-manifest character and deity art. Do not add procedural geometric visuals for this scope.
