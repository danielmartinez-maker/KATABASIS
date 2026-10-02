# Katabasis Run-Depth Systems — Implementation Plan

Date: 2026-09-30
Design: \`docs/superpowers/specs/2026-09-30-katabasis-run-systems-design.md\`

## Execution constraints

- Execute natively in the user-approved OneDrive source tree; it is not a Git repository.
- Preserve \`katabasis.save.v1\`, legacy progress and the standalone offline bundle.
- Keep visible game art image-based; do not add geometric Canvas/CSS art.
- No new test files or automated test runs are planned because the user requested implementation, not a test run. Build the requested standalone deliverable and inspect the changed source and bundle directly.
- Make a pre-edit backup before changing game source.

## Work sequence

### Task 1 — Establish reversible source state and additive run/save data

Files: \`js/core.js\`, \`js/game.js\`, \`tools/bundle.js\`, \`index.html\`, manifests, backup ledger.

- Copy the current standalone bundle and all files that will be edited into \`.superpowers/sdd/2026-09-30-run-systems/originals/\`.
- Add the new \`run-systems.js\` module in matching index, bundle and source-loader order.
- Normalize additive durable hero/starter unlock fields without changing existing saves.
- Add run fields for selected hero, weapon augments, active quest, synergy IDs, route/build recap and damage sources.

### Task 2 — Implement relic transformations, synergies, augments and quests

Files: \`js/run-systems.js\`, \`js/game.js\`, \`js/entities.js\`, \`js/main.js\`, \`index.html\`, \`css/style.css\`.

- Add six rare transformative relic definitions and ensure each transformation changes its ability's real combat behavior.
- Add a declarative, deduplicated synergy resolver and a compact HUD/Codex presentation.
- Generate three mid-run weapon augment choices at eligible champion, miniboss and risk-room reward points.
- Offer and track one run quest; award a clear reward and show progress without gating chamber transitions.

### Task 3 — Extend route, enemy and arena variety

Files: \`js/content-expansion.js\`, \`js/data.js\`, \`js/game.js\`, \`js/entities.js\`, \`js/render.js\`, manifests.

- Expand enemy mutation behavior where current profiles only change stats; retain telegraphed, build-agnostic responses.
- Add a small data-driven set of named miniboss encounters with signatures, reward handling and existing hostile-cap rules.
- Ensure route descriptions disclose risk and reward before selection.
- Add image-backed, player-usable explosive, trap and cover/ward interactables; register generated art and animate only via raster frames.
- Reuse existing risk rooms, branching, hazards, and gates.

### Task 4 — Add hero selection and unlock progression

Files: \`js/run-systems.js\`, \`js/game.js\`, \`js/entities.js\`, \`js/render.js\`, \`js/main.js\`, \`index.html\`, \`css/style.css\`, manifests and generated assets.

- Define three heroes with unique passives, starting actions and three distinct run upgrades each.
- Generate and inspect one sprite sheet per hero in the existing 4×6 actor layout; register each as raster art.
- Add a title-screen selection flow with locked/unlocked starter weapons and perks.
- Make one comeback charge innate each descent while preserving all additional Death Defiance sources.

### Task 5 — Deepen Charon and add a progression-free practice area

Files: \`js/game.js\`, \`js/main.js\`, \`index.html\`, \`css/style.css\`.

- Add haggle and health-trade alternatives to varied shop stock, with explicit feedback and atomic costs.
- Add a practice screen/arena with selected weapons and sample enemy patterns.
- Ensure entry and exit do not advance, award, or persist campaign/run progression.

### Task 6 — Expand recap and safe build sharing

Files: \`js/game.js\`, \`js/main.js\`, \`index.html\`, \`css/style.css\`, \`js/run-systems.js\`.

- Record damage by source, route choices, hero, weapon, gear, relics, augments, synergies, quest status, comeback usage and Nemesis activity.
- Add detailed recap sections on death and victory while preserving core summary information.
- Create versioned build serialization/parser; accept known content IDs only and never mutate saves when importing.
- Add copy support with a file-protocol-safe selection fallback.

### Task 7 — Implement region-aware adaptive soundtrack

Files: \`js/core.js\`, \`js/game.js\`.

- Provide deterministic motifs for all 24 regions with unique scale/root/rhythm/timbre profiles.
- Add calm, combat, miniboss and boss intensity layers, using the existing Web Audio engine.
- Transition layers/profile settings without restarting the score for every chamber; retain mute and saved preferences.

### Task 8 — Integrate, rebuild and document

Files: \`README.md\`, \`QUALITY-REPORT.md\`, \`katabasis.html\`, as needed.

- Review every acceptance criterion against its source path.
- Rebuild using \`node tools/bundle.js\`; ensure all generated art is embedded and there are no external references.
- Inspect changed source and the rebuilt distribution for script order, image-only visible art, migration defaults, and coherent UI state handling.
- Update README/help text so the region count, heroes, practice area, quests and new systems are described accurately.
- Record completion and limitations in the SDD progress ledger.

## Completion evidence

- All spec acceptance criteria map to implemented code in the source tree.
- \`katabasis.html\` is regenerated from current source and contains the new code and raster image data.
- Existing saves remain in the same storage key and retain all prior fields.
- The ledger identifies the source backup, implementation files, build result, and any remaining limitation.
