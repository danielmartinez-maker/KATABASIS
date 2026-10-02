# Katabasis Run-Depth Systems — Design Spec

Date: 2026-09-30
Project: \`C:\Users\dmcfu\OneDrive\Documents\deepseek-harness\default-workspace\katabasis.html\`
Status: Accepted direction; implementation follows the user-approved modular approach and native in-session execution.

## Goal

Complete the requested run-depth package: make builds meaningfully transformative, diversify room and enemy decisions, add playable heroes and practice, strengthen shops and recovery, improve run recaps and sharing, and implement a region-aware soundtrack. Preserve the existing 24-region Greek campaign, Gods and cutscenes, Nemesis and Chronicle, Armory, Paragon, generated raster library, and single-file offline game.

The accepted clarification is 10× perceived variety across major groups, not ten times the raw animation frames. “Soundtrack implementation” is included as an additional requirement. Build-defining relics remain part of the relic scope.

## Existing foundation to retain

- Six route choices per region, risk and event rooms, 24 Greek regions, campaign capstones and cutscenes.
- 19 enemy mutation profiles, champion encounters, optional boss aspects, hazards and interactables.
- Persistent six-slot gear and an uncapped Armory/Paragon progression.
- Death Defiance, boon/relic reward flows, seeded run RNG, save key \`katabasis.save.v1\`.
- Procedural Web Audio, six current music profiles, and the image manifest/bundler.
- The current standalone bundle, which has no external dependencies.

## Design

### 1. Run-defining builds

Add six rare relic transformations that change a named weapon or ability in a visible, mechanically distinct way. Add a declarative synergy resolver for compatible weapon, boon, status, hero and relic combinations. Synergies must be discoverable in the Codex and recap, apply once, and avoid order-dependent stat multiplication.

Offer three mid-run weapon augment choices from champion/miniboss and selected high-risk rewards. Augments are run-scoped and include clear tradeoffs; examples include ricochet, poison, and a charged third strike. They do not alter persistent gear templates.

Offer one concise run quest at descent start. Track a small set of objectives from gameplay events, give a useful reward on completion, and retain status/reward in the run recap. A quest must not block campaign advancement.

### 2. Encounters, routes, and arenas

Keep the existing route-choice flow. Make each card expose danger, expected room reward, condition, and enemy families. Add named miniboss variants with a tell, a signature response window, and a distinct loot table. Keep the encounter cap and route RNG rules already used by the game.

Give the player a few usable arena props: explosive vessel, timed trap, and image-backed cover or ward. Props use existing region atlases where suitable or new generated raster sprites. Their hit areas may be code; their visible art may not be CSS shapes or Canvas geometry.

Enemy variants must add recognizable attack or behavior changes while keeping familiar enemy art identity clear. Risk rooms must state their reward before entry.

### 3. Heroes and starting choices

Add three selectable Greek heroes with distinct starting passives and abilities, plus three hero-specific run upgrades each. Unlock additional starter weapons/perks through campaign achievements and preserve those unlocks in old and new saves. Gear remains persistent and uncapped.

Give each playable hero a matching generated raster sprite sheet, using the established actor-sheet cell layout. Keep character and prop visuals entirely image-based; animate only from image frames. Reuse the existing input vocabulary and avoid requiring a new input device.

Guarantee one comeback charge per descent through the existing Death Defiance path; explicit gear, boon and hero effects may add charges. Display charges and usage in the HUD/recap.

### 4. Shops and practice

Let Charon present a varied stock containing multiple useful and unusual offers. Add at least one haggle choice and one health-for-item trade, each with explicit cost/outcome and atomic payment. Existing shop interaction, obols, and offline operation remain intact.

Add a title-menu practice area with weapon dummies and a controlled sample of enemy attack patterns. It has no campaign progression, loot, stats, or save side effects; leaving returns to the title.

### 5. Recap and build sharing

At death and victory, show route choices, hero, weapon and gear, boons, relic transformations, augments, synergies, quest result, damage by source, comeback use, and Nemesis activity. Keep the short current summary visible, with details collapsible or paged.

Produce a compact, versioned build string that can be copied and parsed. Parsing accepts only known identifiers and is informational; importing a string never grants items or changes a save. Clipboard fallback must work from \`file://\`.

### 6. Soundtrack

Keep procedural Web Audio so the game stays offline and asset-light. Expand from six modal profiles to a deterministic palette across all 24 regions, then layer calm, combat, miniboss and boss intensity using the region's core motif. Add restrained transitions to avoid restarting the loop on every route change. Respect mute, saved audio preference, and browser audio-gesture requirements.

### 7. Architecture and constraints

- Add \`js/run-systems.js\` for declarative run relic transformations, synergies, quests, hero definitions and build-code parsing. Keep ownership of core lifecycle in \`js/game.js\`.
- Extend \`js/entities.js\` and \`js/render.js\` only where gameplay and image-frame animation require it.
- Update \`js/main.js\`, \`index.html\`, and \`css/style.css\` for hero selection, practice, shop decisions, recap and navigation.
- Extend \`js/core.js\` for regional and adaptive procedural music.
- Register generated character/arena art in both manifests; keep \`index.html\` and \`tools/bundle.js\` module order synchronized.
- Keep save key \`katabasis.save.v1\`; all new durable data is additive and normalized, preserving legacy fields.
- Keep the game self-contained and offline. No runtime libraries or external requests.
- Every new visible game-art asset is a generated or existing raster image. Do not add geometric substitutes or new Canvas-drawn artwork.

## Acceptance criteria

1. Relics can change ability behavior; compatible builds activate named, non-stacking synergies; augments are selectable mid-run and remain run-scoped.
2. A run quest can be completed or failed without blocking campaign progress, and recap reports it.
3. Route cards reveal risk/reward; named minibosses and enemy variants introduce distinct, readable behavior; arena props can be used and resolve with image art.
4. Three heroes have distinct mechanics, image-sheet identity and run upgrades; starting options unlock persistently and old saves still load.
5. A one-use comeback is available each descent, and HUD/recap report use.
6. Shop haggle and health trade resolve correctly; practice can be entered/exited without changing save or campaign state.
7. Recaps show route/build/damage sources and safely export/import a versioned informational code.
8. All regions have a distinct reproducible music profile with intensity changes for encounters, while mute and file-offline behavior are preserved.
9. The source rebuilds into a single-file \`katabasis.html\` with all image assets embedded.

## Risks and decisions

- The source is not a Git repository. Create a full pre-edit backup of the bundle and changed source/config files, and keep a progress ledger.
- Additive save migration is mandatory because the existing save key is already in use.
- Do not duplicate feature foundations that already work. Extend them only where this spec names a concrete gap.
- Maintain seeded gameplay decisions; music variation can be deterministic from region identity.
- This implementation is intentionally data-driven so more content does not require branching throughout the combat loop.
