# The Armory and Paragon Board

**Status:** Approved for implementation.
**Date:** 2026-09-30

## Goal

Add a persistent, loot-driven equipment collection and a permanent Greek-myth progression board to Katabasis. The equipment progression has no level ceiling, and both systems persist across deaths and browser reloads.

## Context

Katabasis is an offline single-file Canvas roguelite. The current build has one Xiphos weapon, run-scoped boons/relics/shop upgrades, persistent Obols and Mirror of Nyx upgrades, and version-1 localStorage saves. `Game.compileStats` combines the permanent meta upgrades with current-run effects. Title and pause menus are DOM screens over the Canvas game.

The user selected a persistent gear collection with no power cap and high meta progression, approved the six-slot Armory direction, and added a Paragon board. Existing game art constraints still apply: new illustrated asset art must be generated as raster images; no geometric artwork may stand in for assets.

## Design

### Six-slot Greek Armory

The Armory has one equipped item in each slot:

1. Weapon
2. Helm
3. Cuirass
4. Bracers
5. Waist
6. Greaves

Items are individual records with a stable instance id, template id, slot, name, rarity, level, optional set id, base effects, random affixes, and upgrade count. The opening Xiphos is migrated into the Weapon slot for existing and new saves. Weapon variants use the existing attack input and image animation system; this feature does not add a bow or extra simultaneous weapon slots. Gear bonuses scale linearly with item level and rarity; gear levels have no ceiling. An equipped item cannot be sold or salvaged.

Gear has Common, Rare, Epic, Heroic, and Legendary rarities. Higher rarity adds more affixes and enables stronger named/set effects. Region-tier drops receive a level appropriate to the region; the player may keep upgrading any item indefinitely using persistent Obols and salvage materials. Upgrading from level `L` costs `ceil(100 * (L + 1)^1.35 * rarityFactor)` Obols and one salvage shard, where rarityFactor is 1.0/1.15/1.35/1.6/2.0 from Common to Legendary. Costs use overflow-safe arithmetic; there is no maximum item level. Salvaging returns 1/2/3/4/5 shards from Common to Legendary; selling returns `max(1, floor(10 * level * rarityFactor))` persistent Obols. Duplicate detection compares template, slot, level, rarity, set, and rolled affixes; an exact duplicate converts to the salvage return for its rarity instead of growing the save indefinitely.

Every regional or optional boss grants one gear item. Elites have a 25% gear-drop chance. A treasure reward presents one generated gear item alongside its existing reward choices, and each Charon visit includes one gear offer purchased with run Obols. Loot is immediately retained in the persistent collection, including if the current run later ends in death. Item generation is deterministic from the active run RNG so the same seed and reward sequence can be reproduced in tests.

Six curated Greek sets each provide pieces for all six slots and bonuses at two, four, and six equipped pieces. Affixes and set effects compile through the existing stat compiler and use existing player/combat APIs. Gear can be compared to the currently equipped item and equipped, sold, salvaged, or upgraded from the Armory. Gear is accessible at the title screen and from pause; equipping during a run recalculates player stats immediately. The character continues to use the current image-based player animation sheet; this scope does not layer armor sprites onto the character.

### Paragon board

Add a permanent, connected constellation board called **The Loom of the Fates**. It unlocks after the first regional capstone. Its six branches represent Ares (offense), Athena (defense), Artemis (precision), Hermes (movement), Demeter (survival), and Hades (Obols/Underworld power). Each branch has four sequential stat nodes and a final fork with two mutually exclusive keystones; this creates 36 branch nodes plus a free central Wayfarer node. Effects use existing stat compiler keys.

The board has ordinary stat nodes and branch keystones. Nodes can only be purchased when connected to the unlocked path, which makes route choice meaningful. Ordinary nodes cost one point; keystones cost three points and only one keystone may be selected per branch. Paragon points and purchased-node ids persist through death and reload. A normal kill grants 1 Paragon XP, an elite grants 5, and a boss grants 20; each 100 XP grants one Paragon point, with any remainder carried forward. Earned XP is banked immediately, so every descent contributes even when the run ends early. The board has no seasonal reset.

The full board can be refunded at the Mirror of Nyx for persistent Obols at a cost of `100 + 50 * purchasedNodeCount`; the refund returns the exact Paragon points spent while keeping earned Paragon XP. Paragon effects compile into the same persistent-stat pass as gear, while node prerequisites and point balances are validated when loading old or malformed saves.

### UI and image art

Add an Armory screen and a Loom board screen, each reachable from the title and pause menus. The Armory presents the current image-based hero sprite with six slots, a filterable/sortable collection, rarity and level, affix/set descriptions, an equipped-vs-selected stat comparison, and contextual Equip, Upgrade, Sell, and Salvage actions. The Loom shows the connected node paths, available points, node costs/effects, and refund cost. Unaffordable, already-owned, and disconnected nodes explain why they cannot be purchased.

New gear and board iconography is generated as transparent raster sprite atlases and registered in the existing asset manifest. UI layout, typography, borders, and state indicators may use the existing HTML/CSS interface; these are interface elements, not substitute game-art assets. Images remain local and are embedded into `katabasis.html`; the game must continue working without network access.

### Save migration and failure behavior

Add version-compatible default fields for the inventory, six equipped slot ids, salvage materials, Paragon experience/points, and purchased node ids. Existing `katabasis.save.v1` records must keep their current campaign archive, Chronicle, Nemeses, Obols, weapon unlocks, Mirror upgrades, and settings. Keep legacy `Save.data.weapon` synchronized with the equipped weapon template so existing run construction continues to work. A missing or invalid gear slot falls back to the migrated Xiphos or remains empty when the item record is invalid; it must never prevent boot. If localStorage is unavailable, the existing in-memory fallback remains in effect.

### Out of scope

- A bow, three-weapon wheel, or new combat ability/input system.
- Procedural hero armor compositing or new player attack animation sheets.
- Network accounts, cloud saves, seasonal resets, or multiplayer.
- Removing the Mirror of Nyx or replacing boons/relics with equipment.
- A maximum item level or a fixed cap on the number of permanent gear upgrades.

## Acceptance criteria

1. A new save starts with an equipped Xiphos and all six slots represented; an existing version-1 save loads without losing any old fields.
2. Gear can be generated, retained, equipped by slot, compared, upgraded without a level ceiling, sold, and salvaged; duplicate conversion and insufficient currency/materials are safe.
3. Boss, elite, treasure, and Charon loot sources obey their promised rates and persist gear immediately.
4. Gear affixes and set thresholds change compiled combat stats; equipping a replacement removes the old slot's effects before applying the new effects.
5. Paragon points persist, connected-node constraints are enforced, purchasing a node changes compiled stats once, and a full respec returns the exact spent points for the displayed price.
6. Old saves, malformed inventory records, and unavailable localStorage do not block startup.
7. The Armory and Loom are usable from title and pause, show accurate currency/cost/stat information, and remain navigable on narrow viewports and by keyboard.
8. New illustrated assets are raster images; the rebuilt `katabasis.html` embeds them and requests zero external resources.
9. Existing combat, campaign, cutscene, Chronicle, Nemesis, and Greek-region smoke/browser checks remain green.

## Verification approach

Use `tools/smoke.js` for pure gear generation, save migration, loot/reward, equip/stat, affix, set-bonus, Paragon adjacency, point economy, and respec regression checks. Use the existing browser checks for the new title/pause screens, item comparison and actions, keyboard/viewport behavior, reload persistence, and offline single-file build. Inspect the generated atlas dimensions and transparency, rebuild with `node tools/bundle.js`, then run `node tools/bundle-check.js` and `node tools/smoke.js`.

## Project constraints

- Source of truth remains the existing OneDrive project and its standalone `katabasis.html` artifact.
- The source directory is not a Git repository; documentation and verification records will be kept in the project without commit steps.
- Keep the feature data-driven, using existing browser JavaScript, Canvas/DOM systems, and no new runtime dependencies.
