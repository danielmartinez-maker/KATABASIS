# Run Leveling and Boon Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace boon drafts tied to clearing rooms or bosses with Hades-style run leveling: hostile kills award temporary XP, and each run level-up opens one three-choice boon draft.

**Architecture:** Keep enemy death in `Game.killEnemy()` as the single XP award boundary. Add transient level/XP/queued-draft state to `Run`, preserve persistent Paragon XP at its existing boundary, and use the existing boon generator, compatibility, selection, reroll, reward UI, and continuation flow. Flush queued drafts at a safe simulation boundary before room-clear processing so the same combat/world state resumes afterward.

**Tech Stack:** Existing browser JavaScript IIFEs, `Game`/`Run`, current boon and reward systems, DOM HUD/reward/result screens, and the standalone HTML bundler.

**Spec:** [2026-10-02-dense-descents-leveling-and-terrain-art-design.md](../specs/2026-10-02-dense-descents-leveling-and-terrain-art-design.md)

## Global Constraints

- Start each new descent at level 1 and 0 run XP; next-level cost is `100 + 20 × (current level − 1)`. Preserve overflow and enqueue one draft for each crossed threshold.
- Award each eligible hostile exactly once with highest-rank-first precedence: standard 10, high-threat 20 (`base score >= 4`), elite 50, miniboss 100, region boss 200. Allow explicit capped rank metadata for designed encounter objectives.
- Practice enemies, allies, summons by default, and repeated boss phase visuals grant no run XP. Practice remains a no-XP sandbox.
- Keep run XP and queued drafts transient and separate from persistent Paragon XP, save data, and rewards. Ordinary descents and Fated Trials use the same run XP rules.
- Boon choices come only from run level-ups. Preserve non-boon room, boss, story, risk, shop, relic, gear, healing, and campaign rewards/transitions.
- Do not add or run tests under the current session instruction. Leave unrelated working-tree changes untouched.

## Review Focus

- **Single-award death path:** rank precedence is unambiguous, kill reward state is idempotent, phase transitions do not duplicate boss XP, and Paragon behavior remains as-is.
- **Threshold overflow:** one kill may enqueue multiple levels; XP remainder is retained; queued drafts are not dropped on boss death, room exit, story transition, or region entry.
- **Safe pause and resume:** finish the active death/update operation before opening a draft; selection resumes at the same world position and encounter state; queued drafts display sequentially.
- **Reward-source audit:** no room, risk, boss, story, or other clear path calls the boon draft directly after migration; all existing non-boon rewards and campaign transitions remain available.
- **UI clarity:** HUD shows current level, current XP, and XP needed; run summary includes final level/XP; draft offers exactly three compatible boon choices and one selection.

## File Map

- `js/game.js` owns `Run`, `Game.startRun()`, `killEnemy()`, `update()`, boon generation/selection, room clear, exit-gate rewards, boss clear, and run outcomes.
- `js/data.js` and `js/content-expansion.js` own base enemy score/rank metadata and expanded enemy definitions where explicit rank overrides are needed.
- `js/world-runtime.js` wraps chamber clear, exit-gate, boss-reward, and boon-offer calls for generated worlds; keep its continuation behavior aligned with `Game`.
- `js/main.js`, `index.html`, and `css/style.css` own HUD, reward choice display, victory/death recap, and run-facing labels.
- `README.md` documents the revised boon economy. `tools/bundle.js` produces the offline standalone build.

---

## Task 1: Add transient run XP, level thresholds, and enemy reward ranks

**Files:** `js/game.js`, `js/data.js`, `js/content-expansion.js`

- [ ] **Initialize transient run progression.** Extend `Run` with `level: 1`, `xp: 0`, and a pending level-up count/queue. Reset the fields in every new run; do not write them to save data or mutate Paragon fields.
- [ ] **Implement rank resolution once.** Resolve explicit reward rank first, then region boss, miniboss, elite, high-threat base score, and standard enemy. Assign explicit ranks only where enemy metadata needs to override inference; keep rank values capped to the five approved classes.
- [ ] **Award XP at `Game.killEnemy()`.** Guard repeated calls and exclude practice, allies, and non-objective summons. Add run XP separately from the existing `K.Paragon.awardXp()` call so persistent kill progression remains unchanged.
- [ ] **Apply rising thresholds with overflow.** Consume XP against the threshold formula, increment level for each crossed threshold, preserve the remainder, and enqueue one draft per reached level. Use the same behavior for Trial runs.

## Task 2: Open queued boon drafts at a safe update boundary

**Files:** `js/game.js`, `js/world-runtime.js`

- [ ] **Flush only after the current simulation operation finishes.** Add a focused method such as `Game.flushRunLevelUps()` and call it after enemy/effect updates but before room-clear handling. If XP came from a kill during combat, change to reward phase only after the active death/update operation completes.
- [ ] **Use the existing boon choice system.** Offer exactly three choices from the current boon pool with existing rarity, compatibility, and reroll handling. Mark the reward as a run-level-up draft and do not grant a bonus stat merely for gaining a level.
- [ ] **Resume queued drafts in order.** On selecting a boon, remove exactly one queued level, open the next queued draft if present, and only then return to normal simulation. Do not clear enemy, player, encounter, camera, active world node, or exit-gate state when opening a draft.
- [ ] **Preserve boundary continuations.** A queued level-up takes precedence over room-clear/exit/story continuation. Once all queued drafts are selected, re-enter the existing room-clear path so a defeated final enemy still opens its gate and transitions normally.

## Task 3: Remove boon drafts from all clear reward sources

**Files:** `js/game.js`, `js/world-runtime.js`, `js/data.js`, `js/content-expansion.js`, and `js/main.js` only where player-facing copy describes a boon clear reward

- [ ] **Inventory every boon-draft caller and clear reward constructor.** Cover normal combat, elite, challenge, risk, optional/miniboss, boss/capstone, story, and generated-world exit-gate flows. Keep the reward-source audit in one pass so no legacy clear path survives.
- [ ] **Remove direct boon rewards on chamber clear.** Preserve gate interaction and non-boon rewards. Recast a risk reward that promises a better boon as stronger foes or an approved non-boon reward.
- [ ] **Remove the boss boon offer while retaining progression.** Preserve boss XP, existing obol/relic/gear or other non-boon rewards, campaign story, capstone chapter resolution, and victory/advance continuation. A boss kill can still create a level-up draft through its 200 run XP.
- [ ] **Route every boon choice through run level-up.** Ensure clear, event, shop, story, and other systems cannot bypass the queued level-up path. Retain existing boon selection and application APIs for those level-up drafts.

## Task 4: Show run-level progression in HUD and outcomes

**Files:** `index.html`, `js/main.js`, `css/style.css`

- [ ] **Add an in-run level/XP readout.** Show level, current run XP, and XP required for the next level in the HUD. Refresh it when XP/level changes and keep it readable at supported viewport sizes.
- [ ] **Render a level-up reward as a boon draft.** Reuse existing reward cards and controls; label the draft as a level-up, show exactly three boon choices, and route selection/reroll through the current boon logic.
- [ ] **Include the final progression in the run recap.** Show final run level and XP in both victory and death summaries. Practice results must clearly remain outside run XP progression.

## Task 5: Update player-facing rules and package the standalone build

**Files:** `README.md`, generated `katabasis.html`

- [ ] **Document the new reward economy.** Explain per-enemy XP, the threshold formula, sequential three-choice level-up drafts, and the fact that clearing a room/region does not directly grant a boon draft. Distinguish run XP from persistent Paragon XP.
- [ ] **Regenerate the offline build.** Run the existing `node tools/bundle.js` after source/documentation edits so browser and desktop distributions use the same runtime behavior and no network dependency is introduced.

