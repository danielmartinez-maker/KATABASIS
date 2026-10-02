# Greek Region Expansion Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Extend Katabasis to 24 Greek-myth regions with six image-backed capstones and six campaign scenes before Olympus and Typhon.

**Architecture:** Keep the existing Canvas image compositor, data-driven campaign, region aliases, and boss signature dispatcher. Add raster art to the asset manifest, region/story/boss records to content expansion, six boss-specific signature handlers, and extend tier scaling to all 24 regions.

**Tech Stack:** ES5-compatible JavaScript, Canvas, JSON asset manifest, built-in ImageGen, Node smoke/browser checks, Pillow for image inspection and WebP encoding.

**Spec:** docs/superpowers/specs/2026-09-30-greek-regions-design.md

## Global Constraints

- Every new illustrated asset is a raster image; no new geometric art or geometric fallbacks.
- Preserve an offline single-file build at katabasis.html.
- Preserve eight chambers per region and keep the Olympus Approach, Olympus, and Typhon Core finale in the last three positions.
- Keep existing gameplay timing and collision calculations unchanged except for region tier scaling.
- Give each of the six new bosses its own 4×6 image sprite sheet, three health phases, and named signature.

## Review Focus

1. Region order drifts from story order — smoke asserts all six IDs around Gigantomachy, Olympus Approach, and Typhon Core.
2. New stages lack unique image sprites — smoke checks every new boss signature, phase set, and 4×6 manifest entry.
3. Campaign chapters fail to trigger by index — smoke checks all 24 chapters and region-matched chapter ids.
4. Tier curve ends before Typhon — smoke checks 24 monotonic multipliers and final region scaling.
5. Source art loads but single-file art does not — browser bundle check verifies embedded images and cutscene display.

### Task 1: Lock the six-region contract in smoke tests

**Files:**
- Modify: tools/smoke.js

**Interfaces:**
- Consumes: K.DATA.REGIONS, K.DATA.CAMPAIGN_STORY, K.DATA.BOSSES, KATABASIS_ASSET_MANIFEST, K.DATA.TIER_SCALE.
- Produces: explicit assertions for the six-region order, matching chapters, boss sheets, 24-region scale, and unchanged final arc.

- [x] Add a smoke assertion for the exact insertion order and 24-region/24-chapter/192-chamber totals.
- [x] Add assertions that every new boss has a distinct signature, three phase cards, and a 4×6 raster manifest entry.
- [x] Add assertions that tier HP/damage/speed multipliers cover 24 tiers monotonically.
- [x] Run node tools/smoke.js; expected failure identifies the missing six-region contract.

### Task 2: Generate and register region and boss art

**Files:**
- Create: assets/regions/{delphi,pelion,arcadia,thebes,marathon,mycenae}/backdrop.webp
- Create: assets/actors/bosses/{delphi_python,pelion_nessus,arcadia_boar,thebes_sphinx,marathon_bull,mycenae_tisiphone}.webp
- Modify: assets/manifest.json
- Modify: js/render.js
- Modify: js/assets.js

**Interfaces:**
- Consumes: existing painterly Underworld art direction and the renderer’s region-art aliases.
- Produces: six region.<id>.backdrop images and six actor.boss.<id> images with cols:4, rows:6; matching image aliases for existing floor/props packs.

- [x] Generate and inspect all 12 images; convert to WebP without removing alpha from boss sheets.
- [x] Register the 12 images and add matching region floor/prop/icon aliases.
- [x] Run the smoke test; expected failure remains limited to missing campaign data and tier values.

### Task 3: Add six bosses, regions, scenes, and complete tier progression

**Files:**
- Modify: js/content-expansion.js
- Modify: tools/smoke.js

**Interfaces:**
- Consumes: Task 2 asset IDs and existing D.BOSSES, D.REGIONS, D.CAMPAIGN_STORY, and story choice format.
- Produces: six unique bosses, six eight-chamber regions, six mandatory chapters, and a monotonic 24-entry tier curve.

- [x] Add six boss definitions, three phase cards per boss, and six region records in the specified order.
- [x] Add six scenes using the existing two-choice reward contract; keep Typhon’s final ending chapter last.
- [x] Extend HP, damage, and speed curves through tier index 23.
- [x] Run node tools/smoke.js; expected result: all region, story, boss, and progression assertions pass.

### Task 4: Implement the six named boss signature patterns

**Files:**
- Modify: js/entities.js
- Modify: tools/smoke.js

**Interfaces:**
- Consumes: new signature IDs from Task 3.
- Produces: phase-aware raster-telegraphed attacks for delphi_oracle, pelion_ambush, arcadia_tusks, thebes_riddle, marathon_charge, and mycenae_furies.

- [x] Add each signature’s telegraph setup and attack resolution using existing raster telegraph assets, hazards, and projectile APIs.
- [x] Add contract checks that each signature has a dispatcher branch.
- [x] Run node tools/smoke.js; expected result: all signatures resolve and existing capstone checks remain green.

### Task 5: Build and verify the standalone game

**Files:**
- Modify: katabasis.html

**Interfaces:**
- Consumes: source modules and all manifest images.
- Produces: one offline HTML game with 24 regions and every referenced raster image embedded.

- [x] Run node tools/bundle.js.
- [x] Run node tools/bundle-check.js; verify the new image manifest, 24 regions, 24 story chapters, and cutscene UI.
- [x] Run node tools/smoke.js once more after bundling and record the result.

## Execution Notes

The project source directory is not a Git repository, so this implementation uses the user-authorized OneDrive workspace directly and has no branch or commit steps. Keep progress in .superpowers/sdd/2026-09-30-greek-regions/progress.md.

