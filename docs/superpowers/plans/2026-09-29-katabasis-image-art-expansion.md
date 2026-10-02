# Katabasis Image Art and Animation Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace visible geometric artwork with a coherent image-only art system and expand the perceived variety of Katabasis assets and animation while preserving gameplay rules.

**Architecture:** Generate transparent sprite sheets and image packs with the built-in ImageGen workflow. Add an ES5 image manifest and preloader, animate frames through the current Canvas compositor, and extend `tools/bundle.js` to inline source images so `katabasis.html` remains offline and self-contained.

**Tech Stack:** Plain ES5-flavoured JavaScript, HTML/CSS layout, Canvas `drawImage`, generated PNG/WebP image assets, Node.js bundle script. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-29-katabasis-image-art-expansion-design.md`

## Global Constraints

- Every visible piece of artwork is loaded from a raster image asset.
- CSS and Canvas may place, scale, crop, rotate, fade, or animate images; they do not draw visible art with geometric primitives, gradients, or emoji glyphs.
- Text and layout remain live HTML/CSS; invisible collision and hitbox geometry remains in game code.
- Gameplay rules, collision geometry, encounter order, and damage timing remain unchanged.
- The standalone `katabasis.html` edition remains self-contained and offline-capable.
- Use ImageGen to create the image assets; preserve the established black-figure Greek / Underworld art direction.
- Do not add or run automated tests unless the user asks for testing; use the asset workflow and normal bundle build only.

## Review Focus

1. Missing or corrupt image files must prevent the run from starting and show a readable load error; inspect the loading/error path in source mode.
2. Relative paths in `index.html` and inlined data URLs in `katabasis.html` must resolve to the same manifest entries; build the bundle and inspect both asset URL forms.
3. Sprite pivots and frame bounds must keep feet, aim, shadows, health bars, and hitboxes visually aligned; review actor sheets at actual game scale.
4. Wind-up, attack, hit, and defeat frame selection must follow existing AI/player state fields without changing attack timings; inspect representative player, enemy, and boss state transitions.
5. Large image atlases must be loaded once and reused; inspect duplicate network/image loads and the resulting bundle size during manual review.

---

### Task 1: Generate and refine the visual pilot set

**Files:**
- Create: `assets/actors/player/player.png`
- Create: `assets/actors/enemies/shade.png`
- Create: `assets/actors/bosses/lion.png`
- Create: `assets/regions/tartarus/props.png`
- Create: `assets/effects/dash.png`

**Interfaces:**
- Consumes: `tools/shot-abilities.png` and the approved art direction in the spec as ImageGen references.
- Produces: transparent sprite sheets with fixed cell layouts, consistent pivots, and generated frames for supported animation states.

- [ ] **Step 1: Create the pilot asset directories** under `assets/actors`, `assets/regions`, and `assets/effects`.
- [ ] **Step 2: Generate the five pilot sheets** with separate built-in ImageGen calls; request transparent backgrounds for actors, props, and effects, and an opaque regional floor/backdrop only when appropriate.
- [ ] **Step 3: Inspect each output at gameplay size** for silhouette clarity, frame spacing, transparency, palette match, and consistency across motion frames; regenerate any sheet whose cells or pose progression are unclear.

**Deliverable check:** The five pilot images read as one coherent set and can be cropped into frames using a fixed manifest layout.

### Task 2: Generate the complete actor image set

**Files:**
- Create: `assets/actors/player/` image sheets
- Create: `assets/actors/enemies/` image sheets for the 24 existing enemy types and their appearance variants
- Create: `assets/actors/allies/` image sheets for the two summonable allies
- Create: `assets/actors/bosses/` image sheets for the four existing bosses and their phase looks

**Interfaces:**
- Consumes: the approved visual pilot set from Task 1.
- Produces: actor image sheets with `idle`, `move`, `windup`, `attack`, `hit`, and `death` states where supported by the current actor; bosses also have phase-specific looks and signature action frames.

- [ ] **Step 1: Generate the refreshed player, all enemy, ally, and boss sheets** with ImageGen, using the pilot sheets as style references and preserving each mythological silhouette.
- [ ] **Step 2: Generate at least one alternate appearance image for each common enemy family** and readable elite distinctions as image variants.
- [ ] **Step 3: Inspect every actor sheet** for state order, fixed frame dimensions, matching pivots, distinct silhouettes, and readability at the game's rendered size.

**Deliverable check:** Every current player/enemy/ally/boss visual maps to an image sheet; supported animation states have generated frames, with no geometric substitute.

### Task 3: Generate region, prop, effects, and interface image packs

**Files:**
- Create: `assets/regions/{tartarus,asphodel,forge,olympus}/`
- Create: `assets/props/`
- Create: `assets/effects/`
- Create: `assets/ui/`

**Interfaces:**
- Consumes: the approved visual pilot set from Task 1.
- Produces: image-based arena backdrops, regional prop art, ability/call/effect sequences, and interface icon/panel artwork.

- [ ] **Step 1: Generate one scenery and prop pack per region**, including image assets for the current decoration families and enough variants to make repeated chambers visually distinct.
- [ ] **Step 2: Generate image sequences for all eight core abilities, twelve god calls, enemy projectiles, telegraphs, and existing status/hit/defeat effects.**
- [ ] **Step 3: Generate image assets for the twelve gods, ability icons, and current boon, relic, and Mirror artwork; reuse a family image only where it remains semantically clear.**
- [ ] **Step 4: Generate image-based title/menu/HUD decorative panels and frames**, keeping all labels and descriptions as live text.
- [ ] **Step 5: Inspect every pack** for transparency where needed, regional palette, contrast over the arena, semantic icon mapping, and legibility at actual UI scale.

**Deliverable check:** Every visible arena, prop, effect, icon, and decorative panel has a raster image source; no emoji or geometric art is retained as a visible asset.

### Task 4: Add the image manifest, preloader, and frame player

**Files:**
- Create: `js/asset-manifest.js`
- Create: `js/assets.js`
- Modify: `index.html`

**Interfaces:**
- `window.K.ASSET_MANIFEST`: stable asset id to `{src, frameWidth, frameHeight, pivotX, pivotY, states}` metadata; each state is `{firstFrame, frameCount, fps, loop}`.
- `window.K.Assets.load(onReady)`: loads each manifest image once, then calls `onReady(error)` after required assets settle; `error` is `null` on success or a list of `{id, src}` failures.
- `window.K.Assets.draw(ctx, id, state, elapsed, x, y, options)`: selects a bounded frame from `state` and `elapsed` (unknown state falls back to `idle`), then draws it with `options = {scale, rotation, alpha, flipX}` and the manifest pivot.

- [ ] **Step 1: Define manifest entries** for each generated sheet, including file path, frame bounds, pivots, frame duration, loop/one-shot behavior, and state frame ranges.
- [ ] **Step 2: Implement `K.Assets.load(onReady)`** with single-load caching, pre-run blocking, and readable error reporting for missing required images.
- [ ] **Step 3: Implement `K.Assets.draw(...)`** with bounded frame indices, pivot-aware placement, and image-only rendering.
- [ ] **Step 4: Add the new scripts in `index.html`** before `js/render.js` and verify source-mode image paths are relative to the project root.

**Deliverable check:** A representative pilot actor sheet loads once and plays each manifest state at its configured frame rate.

### Task 5: Convert gameplay rendering to image-only assets

**Files:**
- Modify: `js/render.js`
- Modify: `js/data.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `K.Assets.load`, `K.Assets.draw`, and the generated manifest from Task 4.
- Produces: image-based rendering for actors, bosses, allies, regions, props, projectiles, hazards, telegraphs, pickups, and status/effect art.

- [ ] **Step 1: Gate title/start flow on `K.Assets.load`** and show a readable loading state/error in live HTML if required assets fail.
- [ ] **Step 2: Replace player, enemy, ally, and boss drawing branches** with manifest lookups and frame selection from existing animation timers and AI states.
- [ ] **Step 3: Replace procedural arena art and prop drawing** with the regional background and prop images, retaining existing deterministic placement and layer ordering.
- [ ] **Step 4: Replace projectile, hazard, telegraph, pickup, status, and ability effect artwork** with image-frame draws that align to the existing game geometry.
- [ ] **Step 5: Remove visible Canvas path/gradient art from the gameplay renderer** while keeping camera transforms, entity sorting, and collision logic unchanged.
- [ ] **Step 6: Manually inspect representative idle/move/attack/wind-up/hit/death and boss-phase transitions** for alignment and unchanged telegraph timing.

**Deliverable check:** Gameplay visuals come from images alone, and image animation follows the existing game state without moving hitboxes or changing timing.

### Task 6: Convert interface artwork and icon references

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/data.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `K.Assets` UI image manifest entries from Task 4.
- Produces: HTML image elements/backgrounds for decorative panels and icons, with live text and layout retained.

- [ ] **Step 1: Add image keys to the god, boon, relic, Mirror, and ability data** and stop rendering their emoji/glyph fields as artwork.
- [ ] **Step 2: Update menu, reward, codex, HUD, and title rendering** to display image assets for icons and decorative art.
- [ ] **Step 3: Remove visible CSS-generated artwork** from UI surfaces and use the generated image panels/frames; retain CSS for layout, typography, and responsive sizing.
- [ ] **Step 4: Manually inspect title, reward, codex, Mirror, HUD, and pause screens** for text contrast and icon-to-label correctness.

**Deliverable check:** No visible emoji or CSS/Canvas geometric art remains in gameplay or interface artwork.

### Task 7: Embed source images in the offline bundle

**Files:**
- Modify: `tools/bundle.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `K.ASSET_MANIFEST` and the `assets/` tree.
- Produces: `katabasis.html` with every referenced image embedded as a data URL and no external asset requests.

- [ ] **Step 1: Extend the bundler to read the manifest** and inject one inline image-data map before `js/assets.js` executes.
- [ ] **Step 2: Update `K.Assets` URL selection** to prefer embedded data URLs in the standalone edition and relative paths in `index.html` mode.
- [ ] **Step 3: Update `README.md`** with the image asset layout, source-mode launch, and single-file bundling command.
- [ ] **Step 4: Run `node tools/bundle.js`** and inspect the output header and size; the bundler must fail if any manifest image is missing and report if any image URL is not inlined as a data URL.

**Deliverable check:** `katabasis.html` is rebuilt with all game art embedded and remains usable without network access.

### Task 8: Final art integration review

**Files:**
- Review: `assets/`
- Review: `js/assets.js`
- Review: `js/asset-manifest.js`
- Review: `js/render.js`
- Review: `index.html`
- Review: `css/style.css`
- Review: `tools/bundle.js`
- Build: `katabasis.html`

**Interfaces:**
- Consumes: all assets and rendering integration from Tasks 1–7.
- Produces: final source project and a self-contained offline game build.

- [ ] **Step 1: Rebuild the standalone file** with `node tools/bundle.js` after the final asset map is complete.
- [ ] **Step 2: Review the four regional palettes and all entity/effect sheets** against the approved visual style at gameplay size.
- [ ] **Step 3: Inspect representative gameplay and menu screens** for missing images, unreadable sprite frames, visible geometry, and alignment with existing hitboxes.
- [ ] **Step 4: Confirm the source tree references every generated image and the bundled file embeds every referenced image.**

**Deliverable check:** The editable source and standalone game use image-only visible art, retain existing gameplay behavior, and share the approved style.


