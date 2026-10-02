# Katabasis Image Art and Animation Expansion

**Status:** Proposed for user review  
**Date:** 2026-09-29

## Goal

Expand the perceived visual variety of Katabasis by roughly 10× across its major asset groups. Refresh current figures and their animation, and add image-based variation to environments, props, effects, and interface artwork while preserving the existing combat and progression rules.

## Approved direction

- Use a hybrid renderer: Canvas remains the image compositor, while every visible illustration is an image asset.
- Keep all collision, attack range, hitbox, and encounter calculations as nonvisual game logic.
- Use ImageGen as the asset-generation workflow.
- Preserve the existing Greek black-figure pottery / Underworld direction: readable mythic silhouettes, dark stone, terracotta, cream, and restrained gold accents.
- Make variety perceptual through distinct silhouettes, variants, animation, regional dressing, and effects rather than a literal 10× count of near-identical stills.
- Preserve the existing offline, single-file `katabasis.html` edition.

## Current project structure

The editable source uses plain JavaScript and Canvas. `js/render.js` draws the player, 24 enemy types, four bosses, arena decoration, projectiles, and effects with Canvas paths. `js/entities.js` already supplies animation timing and states such as movement, attack, wind-up, hurt, and defeat. `tools/bundle.js` currently embeds the CSS and six JavaScript files into `katabasis.html`; there is no image-asset directory or image preloader today.

## Image-only visual rule

Every visible piece of artwork will be loaded from a raster image asset: character art, arena backdrops, floor and prop art, projectiles, hazards and telegraphs, ability and god-call effects, pickups, icons, and decorative interface panels. CSS and Canvas may place, scale, crop, rotate, fade, or animate these images. They will not draw visible art with geometric primitives, gradients, or emoji glyphs. Text and layout remain live HTML/CSS. Invisible collision and hitbox geometry remains in game code.

## Asset scope

### Characters

- Refresh the player, 24 existing enemy types, two summonable allies, and four bosses as image assets.
- Add multiple generated appearance variants to common enemies and clearer image distinctions for elites.
- Give each character a consistent sprite family that fits the current top-down arena scale and facing behavior.
- Use boss-specific image variations for their existing phases and signature attacks.

### Animation

Generate image frames for the states supported by each actor: idle, movement, attack wind-up, attack/action, hit reaction, and defeat. Use a minimum of three frames for simple loops and four or more where the motion needs a readable tell or follow-through. Add phase-specific frames for bosses. Existing timers and AI state changes drive frame selection; animation must not change gameplay timing or hitboxes.

### Regions and props

Create image-based scenery packs for Tartarus, Asphodel, the Bronze Forge, and the Summit. Each pack includes a region background/floor treatment and varied prop images for the existing decoration families (such as columns, urns, bones, rubble, markers, and plants). Keep the current arena geometry and procedural placement so encounters remain functional while image selection increases visual variety.

### Effects and interface artwork

- Create image sequences for the eight core abilities, twelve god calls, enemy projectiles, and existing status / hit / defeat effects.
- Replace visible emoji and glyph artwork in ability, god, boon, relic, and Mirror interfaces with image references. Related entries may share an image when it remains semantically clear.
- Add image-based decorative frames and panels to title/menu/HUD surfaces where artwork is currently produced by CSS.
- Keep labels, descriptions, numbers, and menu layout as live text and layout code.

## Rendering and loading design

1. Add an `assets/` source tree grouped by actors, regions, props, effects, and UI.
2. Add a lightweight ES5-compatible image manifest and preloader, loaded before `js/render.js`.
3. Store generated animation frames as transparent sprite sheets or image atlases with a manifest describing each state's frame rectangle, frame duration, and optional pivot.
4. Replace visual drawing branches in `js/render.js` with image-frame selection and `drawImage` calls. Use existing actor state and timer fields for playback.
5. Keep Canvas ordering, camera transforms, depth sorting, hit testing, and game logic. Canvas rendering becomes image compositing only.
6. Update `tools/bundle.js` to embed the required image data into the single-file edition. The editable `index.html` continues to load local source assets, and the bundled edition remains self-contained and offline.
7. Preload required image assets before starting a run. Surface a readable loading error if a required image is missing; do not draw a geometric fallback.

## Generation workflow

1. Create a compact visual style reference from the existing game screenshot and README direction.
2. Generate a pilot set first: the hero, one common enemy, one boss, one regional prop sheet, and one action effect. Inspect the transparent edges, cell alignment, palette, silhouette readability, and playback at actual in-game size.
3. Refine the style reference and prompts once the pilot art reads clearly at gameplay scale.
4. Generate the remaining approved asset families with ImageGen, one distinct family or variant prompt at a time.
5. Inspect each final image sheet before adding it to the project; keep source assets as images and reference every one from the manifest.
6. Integrate and rebuild the offline bundle after each asset group so bundle behavior remains straightforward to diagnose.

## Quality and acceptance criteria

- All visible illustrations in the game use image assets; no visible Canvas primitive art, geometric fallback sprite, or emoji artwork remains.
- The player, existing enemy types, summons, and bosses have clearer silhouettes and image-based animation states tied to existing game states.
- All four regions have image-based scenery and prop variation consistent with their current palettes and mythology.
- Core abilities, god calls, projectiles, telegraphs, and status effects have image-based visuals that stay readable over the arenas.
- The title/menu/HUD art and game-screen art share one coherent style, with text still rendered as text.
- The source project and standalone bundled game both remain offline-capable, and the bundle embeds all referenced artwork.
- Gameplay rules, collision geometry, encounter order, and damage timing remain unchanged by the art conversion.

## Risks and mitigations

- **Frame inconsistency:** Generate each actor family against a shared style reference and fixed sheet layout; inspect at gameplay size and regenerate weak sheets.
- **Combat readability:** Use high-contrast silhouettes and image-based telegraphs whose rotation/scale match existing hitboxes; keep art from obscuring the player or warning areas.
- **Bundle size and load time:** Pack animation frames into atlases, reuse semantically related icons, preload once, and measure image/bundle size as assets are added.
- **Image loading failures:** Keep the game in a loading/error state until required assets are ready; do not revert to geometric drawing.

## Out of scope

New enemies, new boss mechanics, new weapons, and balance changes are outside this art-focused pass.
