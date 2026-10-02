# Katabasis Progression Overhaul

**Status:** Approved for implementation
**Date:** 2026-10-01  
**Scope:** Run progression, between-run progression, and post-victory endgame

## Approved brief

The player wants a substantial progression overhaul spanning three connected goals:

1. Make a build develop with clearer choices and milestones during a run.
2. Make deaths and successful runs contribute to meaningful long-term growth.
3. Add replay goals after completing the campaign.

The selected direction is a layered refresh. Preserve the current 24-region campaign and its eight-chamber regional structure. Rework the roles, rewards, and pacing of progression systems around that campaign. This design keeps the existing regions, enemies, bosses, boons, and offline single-file delivery as the content foundation.

## Current project context

Katabasis is a plain JavaScript Canvas game with DOM menus, local IndexedDB/localStorage persistence, and an offline `katabasis.html` bundle. Its current campaign is 24 regions with eight chambers each, for 192 chambers in one complete descent. Each region ends with a boss. Route choices can lead to combat, elite, treasure, shop, event, challenge, optional-boss, risk, and nemesis encounters.

Current progression already spans several systems:

- **Run-local:** god boons, relics, hero upgrades, weapon upgrades, augments, synergies, quests, shop upgrades, and route rewards.
- **Persistent:** Obols and the Mirror of Nyx (16 upgrade categories and 52 total ranks), six-slot gear with item levels that currently have no ceiling, and the Loom of the Fates Paragon graph. The Paragon graph has six branches, four ordinary nodes and a mutually exclusive pair of keystones per branch.
- **Unlocks and records:** hero and starter unlocks, Codex discovery, boss/run statistics, Chronicle entries, Nemeses, and campaign archive.
- **Endgame:** no distinct post-victory challenge ladder exists. Trial rooms and optional bosses are part of the normal campaign.

The progression compiler combines Mirror, gear, Paragon, hero, run upgrades, boons, and relics into one stat block. This makes their roles overlap. In particular, uncapped gear levels can keep increasing combat power after all campaign content has been tuned.

## Design goals

- Give a full descent a readable three-act build arc without removing regions or chambers.
- Make route rewards and risks legible before the player commits.
- Add two memorable, run-only build transformation choices at major campaign milestones.
- Make Mirror, gear, Paragon, and unlocks serve distinct long-term purposes.
- Bound permanent combat-stat growth so optional challenge tiers can remain fair.
- Make a campaign victory open repeatable challenges with non-stat rewards.
- Reuse existing content, UI, save storage, deterministic run RNG, and bundle pipeline.
- Preserve existing saves and unlocked content.

## Non-goals

- Adding regions, bosses, enemies, or a second campaign route.
- Shortening the standard 24-region campaign.
- Adding online accounts, leaderboards, multiplayer, or network dependencies.
- Adding a new spendable progression currency.
- Replacing the boon/relic run-build system or the Greek-myth setting.
- Generating new raster art for this progression pass. Existing images, portraits, icons, text, and CSS can present the new choices.

## Progression model

Each layer has one job and feeds the next:

| Layer | Primary job | Persists after death? | Main rewards |
|---|---|---:|---|
| Descent | Shape the current combat build and route | No | Boons, relics, Fated Threads, run resources |
| Legacy | Offer bounded permanent power and lasting play-style options | Yes | Mirror ranks, gear loadouts, Paragon choices, hero/starter unlocks |
| Fated Trials | Let experienced players set higher stakes and pursue mastery | Best score and claims persist | Pact records and earned titles |

Obols remain the primary permanent spending currency. Salvage shards remain the Armory material. Pact score is only a difficulty record; it cannot be spent. No additional currency is introduced.

## 1. Progression during a run

### Three-act rhythm

Keep all 24 regions in the normal campaign, grouped as:

- **Act I — Establish:** regions 1–8. The starter and early boon choices define a build direction.
- **Act II — Combine:** regions 9–16. Route and reward choices should help the player assemble synergies around that direction.
- **Act III — Commit:** regions 17–24. The player refines the completed build and faces the final capstone.

The run HUD and route map show the current act, region, chamber, and next milestone. Region and chamber counts stay at eight regions per act and eight chambers per region.

### Fated Threads

After defeating the region 8 and region 16 bosses, the player receives a Fated Thread draft. Each draft presents three eligible Thread choices. The player takes one, or skips it for the existing skip reward. A run can hold at most two Threads; they are run-only and disappear at death or victory.

Threads change how an ability or boon interaction works, rather than granting an uncapped flat-stat bonus. Start with at least 12 distinct Threads across offense, defense, mobility, and god/status interactions. Do not offer a duplicate Thread in the same run. Draft generation should offer at least one build-relevant option and use deterministic run RNG. If eligibility conditions produce too few offers, fill remaining slots from the general pool.

The Thread draft uses the existing post-boss reward flow and does not replace the boss's normal boon choice. It appears as a separate milestone choice after the standard boss reward, before the existing campaign story transition. The reward screen names the affected ability or interaction and previews the practical effect. Threads must use existing combat hooks where possible; any genuinely new combat behavior must be covered in the implementation plan and acceptance checks.

### Route and reward clarity

Keep the current route types and their risk/reward intent. Every route card must communicate, before selection:

- Encounter type and named condition.
- Danger level.
- Primary reward category and any special cost.
- Relevant run-build interaction when the reward is conditional (for example, a god synergy or eligible Thread).

Avoid generating several cards that resolve to the same reward and danger profile. Maintain meaningful access to combat rewards, recovery/economy choices, and high-risk/high-reward rooms within each region's six route decisions.

### Build information

The run summary and HUD expose the active build identity: hero, starter weapon, current act, Threads, active god synergies, and quest progress. Detailed boon and relic lists remain available through the existing run UI/Codex flow. This is an information hierarchy change; it does not add a separate inventory system.

## 2. Progression between runs

### Mirror of Nyx: bounded foundation

Keep the existing Mirror and purchased ranks. Its job is a finite baseline of survivability, economy, boon choice, and core comfort. The current 16 upgrade categories remain capped at their existing maxima; the overhaul does not add more ranks or let Obols buy endless stat growth. Rebalance only if a Mirror effect directly duplicates a new system effect, and preserve each purchased level during migration.

### Armory: capped power, varied loadouts

Keep the six equipment slots, rarity, affixes, sets, loot sources, salvage, and upgrades. Set a functional combat-power cap of **item level 30**. New drop levels scale with campaign depth using `min(30, 1 + floor(depth / 5))`, where `depth = regionIndex * 8 + chamberIndex`; upgrades can raise an item to level 30. The level cap and curve live in one data constant/function.

All item effects use `effectiveLevel = min(item.level, 30)` and retain the existing rarity multiplier. Gear level 30 is the last level that can be purchased. Beyond that cap, build differences come from the item template, affixes, rarity, and set thresholds rather than more base-effect scaling. Sale value also uses effective level to avoid currency windfalls from legacy over-cap items.

For existing saves, keep every valid item and its stored level. Clamp only the level used for combat calculations, label over-cap items as legacy/mastered in the Armory, and prevent further upgrades. Do not delete items or rewrite their recorded levels.

### Loom of the Fates: finite mastery choices

Keep the existing six-branch graph, node prerequisites, one-keystone-per-branch rule, and respec. Its spendable combat power is finite: four ordinary nodes plus one selected keystone per branch, for a maximum of 42 spent points across the board. Do not add infinite combat nodes. Once the board is complete, additional Paragon XP cannot create new spendable combat points. Existing unspent points and XP are preserved; respec continues to return the points actually spent.

### Lasting unlocks

Keep existing hero/starter unlocks and current boss-kill records. Add explicit, one-time campaign milestones for the first regional capstone, the first Act I clear (region 8 boss), the first Act II clear (region 16 boss), the first full campaign victory, and Fated Trial score thresholds. Boss-kill unlocks continue to provide hero and starter choices; the new run-local Threads provide additional play-style transformations. Trial score thresholds grant named, non-stat titles displayed in the Trial screen and victory recap. They grant no uncapped numerical power.

Award milestone state from recorded run events so it survives death and reload. A failed run can still progress discovery and reach-based milestones. Obols, gear, shards, Mirror ranks, Paragon choices, and existing unlocks retain their current persistence rules.

## 3. Post-victory endgame: Fated Trials

Unlock Fated Trials after a full campaign victory. Keep normal campaign runs available. A Trial is a full 24-region descent with optional Pact modifiers chosen before the run; modifiers remain active for the whole descent and never change mid-run.

Begin with eight data-driven Pacts, each with three severity ranks. A Trial must have a Pact Score of at least 1; score 0 is a normal campaign run. Their modifiers use existing mechanics: examples include stronger/faster enemies, fewer recovery opportunities, increased shop prices, reduced boon offer count, or more elite pressure. The player selects any combination; the **Pact Score** is the sum of selected severity ranks (0–24). The score is shown before starting and in the in-run HUD.

Record `bestPactScore` only for a completed Trial victory. Preserve normal run rewards and save behavior on death. Claim one-time collection rewards at best-score thresholds **5, 10, 15, and 20**. Each threshold unlocks a named title; show claimed and upcoming titles in the Trial screen and announce newly claimed titles in the victory recap. No threshold grants permanent flat damage, health, or defense.

The Trial screen previews each Pact's three ranks, total score, best clear, and the next unclaimed reward. A player can replay a lower score without losing records or rewards. The feature is offline and has no leaderboard dependency.

## Data and code boundaries

Keep content declarative and compatible with the current stat compiler.

- `js/run-systems.js`: Thread definitions and eligibility, Trial Pact definitions and scoring, and unlock milestone predicates.
- `js/game.js`: Act milestones, Thread draft lifecycle, Pact application, Trial completion, and campaign event recording.
- `js/gear.js`: level-30 effective-power cap and capped generation/upgrade/sale math.
- `js/paragon.js`: finite point awards after board completion while preserving old banked values and respec behavior.
- `js/data.js`: Mirror balance adjustments only if needed to maintain its defined foundation role.
- `js/core.js` / `js/persistence.js`: progression version, validated Trial records, unlock milestones, and old-save migration.
- `index.html`, `css/style.css`, `js/main.js`: act/Thread HUD, reward choices, Trial setup and results, keyboard/focus behavior, and help text.
- `tools/bundle.js` and `README.md`: preserve the standalone offline edition and document the revised progression.

Do not split progression into a new runtime module unless implementation discovery shows the existing load order cannot support these boundaries. No additional runtime dependencies are needed.

## Save compatibility and failure behavior

Use an idempotent progression migration version. Invalid Thread IDs, Pact IDs, scores, unlock flags, or malformed arrays are discarded or clamped without preventing startup. Existing localStorage and IndexedDB saves continue to load. Existing unlocked heroes, weapons, gear, Mirror ranks, Paragon nodes/points, Obols, shards, settings, Codex, Nemeses, kill records, and campaign archive remain intact.

A save with at least one existing campaign win unlocks Fated Trials during migration so veteran players do not need to repeat a campaign clear. New saves unlock it after their first full victory. Trial modifiers are applied from validated IDs and cannot mutate permanent save stats directly.

## Acceptance criteria

1. A standard run still follows all 24 regions and 192 chambers, with three visible eight-region acts.
2. Region 8 and 16 boss rewards each offer a deterministic, valid, build-aware Fated Thread choice; a Thread changes the described behavior and resets when the run ends.
3. Route cards show accurate danger, reward, cost, and relevant condition information before selection.
4. Gear effects stop scaling above level 30; new drop, upgrade, and sale values respect the cap; legacy items remain present and load safely.
5. Mirror purchases remain capped at existing maxima. The Loom cannot award new spendable combat points beyond its finite graph after completion, and respec returns spent points accurately.
6. Existing save data and unlocks survive migration. Malformed progression records cannot block boot.
7. Fated Trials unlock after victory (or from a legacy win), apply the selected Pact ranks for the whole run, record only successful Trial scores, and grant the defined non-stat rewards once.
8. Players can reach the existing title, pause, Codex, Armory, and Paragon screens with keyboard and mouse; new reward screens remain readable and usable on narrow viewports.
9. The source tree and rebuilt standalone bundle continue to run offline with no external requests.
10. Existing combat, campaign, save/reload, and bundle regression checks remain green after implementation.

## Verification plan

During implementation, add focused regression coverage for Thread eligibility/effects/reset, act milestone order, Pact score and completion records, item-level cap and old-save migration, post-board Paragon awards/respec, and reward claiming exactly once. Run the existing smoke, browser, persistence/file, movement, and bundle checks. Inspect a real browser flow through a full campaign milestone and Trial setup, plus the standalone `file://` bundle. This document records the plan only; no code or tests are changed as part of the spec-writing stage.

## Design review notes

The primary balance change is gear's effective-level cap. It deliberately trades infinite vertical gear growth for a finite campaign-scale power budget and endgame rewards based on sidegrades and mastery. The proposed level cap is 30 and must be tuned using the existing combat and campaign regression harnesses during implementation. The 24-region, 192-chamber campaign remains unchanged, so implementation must present Act milestones clearly enough that the long run has visible intermediate goals.
